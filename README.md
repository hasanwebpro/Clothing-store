# VOGUE — Software Design & Architecture Documentation
### SDA Viva Reference | Full-Stack E-Commerce Platform (Django REST + React)

---

## PROJECT OVERVIEW

**VOGUE** is a full-stack e-commerce clothing store for the Pakistani market.

| Layer | Technology | Role |
|---|---|---|
| Backend | Django 4.2 + Django REST Framework | API server, business logic, database |
| Frontend | React 18 + Vite + TailwindCSS | Single-page application (SPA) |
| Database | MySQL 8 | Relational data storage |
| Auth | JWT (SimpleJWT) + Google OAuth | Stateless authentication |

---

## 1. ARCHITECTURAL PATTERN — MVC

### What is MVC?
MVC (Model-View-Controller) separates an application into three interconnected components so that business logic, data, and presentation are independent of each other.

### Why MVC?
- **Separation of concerns** — changing the database schema does not break the API response shape
- **Testability** — each layer can be tested independently
- **Team scalability** — frontend and backend teams work on independent layers

### How MVC Maps to This Project

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTP REQUEST                             │
│                        ↓                                   │
│  CONTROLLER (views.py) — thin HTTP boundary                │
│  • Validates input via Serializer                          │
│  • Delegates to Repository or Service                      │
│  • Returns HTTP Response                                   │
│                        ↓                                   │
│  MODEL (models.py) — data + business rules                 │
│  • Defines database schema                                 │
│  • Contains computed properties (effective_price)          │
│  • Contains business rules (Coupon.is_valid())             │
│                        ↓                                   │
│  VIEW / SERIALIZER (serializers.py) — data shaping        │
│  • Converts model instances to JSON                        │
│  • Validates incoming data                                 │
│  • Hides internal fields from API consumers               │
└─────────────────────────────────────────────────────────────┘
```

### MVC in Code — Concrete Example (Products)

| MVC Layer | File | Responsibility |
|---|---|---|
| **Model** | `backend/apps/products/models.py` | `Product`, `Category`, `ProductVariant`, `ProductImage` — database schema + `effective_price` property |
| **Controller** | `backend/apps/products/views.py` | `ProductListView`, `ProductCreateView` — parse request, delegate, return response |
| **View/Serializer** | `backend/apps/products/serializers.py` | `ProductListSerializer`, `ProductDetailSerializer` — shape JSON output |

**Key principle in this project:** Every view method does exactly 3 things:
1. Parse and validate input (via serializer)
2. Call a repository or factory
3. Return a serialized Response

If a view does anything else, it violates SRP.

---

## 2. DESIGN PATTERNS — BACKEND

### 2.1 Repository Pattern
**Folder:** `backend/apps/products/repositories.py`

**What:** Encapsulates all database query logic. Views and services never call `Model.objects.xxx()` directly.

**Why:** If a column is renamed or an ORM query is optimised, only the repository changes — not every view that uses it.

**How:**
```python
# ProductRepository centralises all product queries
class ProductRepository:
    def get_all_published(self):       # ProductListView calls this
    def get_by_slug(self, slug):       # ProductDetailView calls this
    def get_featured(self, limit=8):   # ProductFeaturedView calls this
    def soft_delete(self, product_id): # ProductDeleteView calls this
```
**Used in:** `products/views.py`, all views use `product_repo = ProductRepository()` at module level

---

### 2.2 Factory Pattern
**Folder:** `backend/apps/products/factories.py`

**What:** `ProductFactory` is the single creation point for all product types. It decides which builder to use.

**Why:** Creating a `simple` vs `variable` product involves completely different logic. Putting if/else chains in the view violates the Open/Closed Principle. Adding a new product type (e.g. `bundle`) only requires adding a new Builder — zero changes to the factory or views.

**How:**
```python
class ProductFactory:
    BUILDERS = {
        'simple':   SimpleProductBuilder,
        'variable': VariableProductBuilder,
    }
    @classmethod
    def create(cls, product_type, data, seller):
        builder_class = cls.BUILDERS.get(product_type)
        return builder_class(data, seller).build()

# In views.py — the view has no idea which builder ran
product = ProductFactory.create(product_type, data, seller)
```
**Used in:** `products/views.py → ProductCreateView`

---

### 2.3 Builder Pattern
**Folder:** `backend/apps/products/builders.py`

**What:** `SimpleProductBuilder` and `VariableProductBuilder` construct complex product objects step by step.

**Why:** Building a variable product involves: creating the product, creating attribute values (Size, Color), creating variants for each combination, creating inventory records. This multi-step construction belongs in a Builder, not a view.

**How:**
```
SimpleProductBuilder.build():
  1. create Product
  2. create one default ProductVariant
  3. create Inventory record

VariableProductBuilder.build():
  1. create Product
  2. for each size × color combination:
     a. get_or_create AttributeValue
     b. create ProductVariant
     c. link via VariantAttributeValue (junction table)
     d. create Inventory record
```
**Used in:** `products/factories.py → ProductFactory.create()`

---

### 2.4 Observer Pattern
**Folder:** `backend/core/events.py`, `backend/apps/inventory/observers.py`, `backend/apps/notifications/observers.py`

**What:** `EventBus` publishes domain events. Multiple observers subscribe and react independently — without the publisher knowing who is listening.

**Why:** When an order is placed, we need to: decrement stock, send notification, update analytics. Putting all this in `PlaceOrderView` couples unrelated systems together. Observer decouples them.

**How:**
```python
# Publisher (OrderService) — knows nothing about stock or notifications
EventBus.publish(Events.ORDER_PLACED, {'order_id': order.id})

# Subscriber 1 — inventory observer
class InventoryObserver:
    def handle(self, payload):
        # decrements stock for each item

# Subscriber 2 — notification observer
class InAppNotificationObserver:
    def handle(self, payload):
        # creates a notification for the customer
```
**Subscribed events:** `order.placed`, `order.status_changed`, `payment.confirmed`

---

### 2.5 Strategy Pattern
**Folder:** `backend/apps/payments/strategies.py`

**What:** `PaymentStrategyFactory` returns the correct payment strategy based on the order's payment method. Each strategy implements the same `process()` interface.

**Why:** COD, Easypaisa, and Card payments work completely differently. Adding JazzCash in the future = add one class + one dict entry. No changes to views.

**How:**
```python
class PaymentStrategyFactory:
    STRATEGIES = {
        'cod':       CODStrategy,
        'easypaisa': EasypaisaAdapterStrategy,
        'card':      CardStrategy,
    }

# In InitiatePaymentView — view doesn't know which gateway ran
strategy = PaymentStrategyFactory.get_strategy(order.payment_method)
result = strategy.process(order, ...)
```

---

### 2.6 Adapter Pattern
**Folder:** `backend/apps/payments/adapters.py`

**What:** `EasypaisaAdapter` wraps Easypaisa's external API and translates its response into our internal dict shape.

**Why:** If Easypaisa changes their API, only the adapter changes. The Strategy and views are unaffected.

**How:**
```
External Easypaisa API response → EasypaisaAdapter.verify_payment() → {'success': True, 'transaction_id': '...'}
```

---

### 2.7 Decorator Pattern
**Folder:** `backend/apps/pricing/decorators.py`

**What:** `CouponDecorator` wraps `CartPriceCalculator` and adds coupon discount logic on top.

**Why:** Cart price calculation and coupon application are separate concerns. The Decorator adds coupon logic without modifying the base calculator — Open/Closed Principle.

**How:**
```
CartPriceCalculator.calculate() → base subtotal
CouponDecorator(calculator).calculate() → subtotal - coupon_discount
```

---

### 2.8 Rich Domain Model
**Folder:** `backend/apps/pricing/models.py`, `backend/apps/products/models.py`

**What:** Business rules live on the model itself, not in a separate service.

**Why:** If `Coupon.is_valid()` were in a service, that service would need to be imported everywhere a coupon is validated. The model carries its own rules wherever it goes.

**Examples:**
```python
# Coupon validates itself
coupon.is_valid(order_total)       # → (True, '') or (False, 'Expired')
coupon.calculate_discount(total)   # → 450.00

# Product computes its own effective price
product.effective_price            # → sale_price if active, else base_price
product.discount_percentage        # → 30 (computed from base vs sale)
```

---

### 2.9 Snapshot / Memento Pattern
**Folder:** `backend/apps/orders/models.py → OrderItem`

**What:** `OrderItem` stores `product_name` and `sku` as VARCHAR columns — a snapshot of the data at purchase time.

**Why:** If a seller renames "Premium Lawn Suit" to "Classic Suit" 6 months later, the customer's old invoice must still show "Premium Lawn Suit". Without snapshotting, order history rewrites itself when products change.

---

### 2.10 Audit Log Pattern
**Folder:** `backend/apps/orders/models.py → OrderStatusHistory`, `backend/apps/inventory/models.py → InventoryMovement`

**What:** Every status transition and stock change is recorded as an immutable row — never updated, only inserted.

**Why:** Answers the questions: "Who changed order status and when?" and "Why does stock show 12 units but shelf has 10?" — the movement log shows every discrepancy.

---

### 2.11 Service Layer
**Folder:** `backend/apps/orders/services.py`, `backend/apps/cart/services.py`

**What:** `OrderService` and `CartService` contain all business logic for complex multi-step operations.

**Why:** `PlaceOrderView` would be 200 lines if it contained: stock validation, coupon application, order number generation, cart clearing, and event publishing. The service layer keeps views thin and logic reusable.

**OrderService.place_order() steps:**
1. Validate cart is not empty
2. Check stock for every cart item
3. Deduct coupon if applied
4. Generate unique order number
5. Create Order + OrderItems (snapshots)
6. Decrement inventory
7. Clear the cart
8. Publish `Events.ORDER_PLACED`

---

### 2.12 Two-Speed Serialization
**Folder:** `backend/apps/orders/serializers.py`, `backend/apps/products/serializers.py`

**What:** Two serializers for the same model — compact list serializer and full detail serializer.

**Why:** Fetching full nested data (items, status history, shipping address) for 50 orders in a list would cause N+1 queries and return megabytes of JSON nobody needs in a list view.

| Serializer | Used by | Returns |
|---|---|---|
| `OrderListSerializer` | `GET /orders/` | id, number, status, total, item_count |
| `OrderSerializer` | `GET /orders/{number}/` | everything + nested items + status history + address |
| `ProductListSerializer` | `GET /products/` | compact card data |
| `ProductDetailSerializer` | `GET /products/{slug}/` | full data + variants + images |

---

### 2.13 RBAC (Role-Based Access Control)
**Folder:** `backend/core/permissions.py`

**What:** Three roles — `admin`, `seller`, `customer`. Permissions are assigned to roles, not individual users.

**Why:** Django's built-in permission system requires assigning permissions per user. For a three-role platform, a single `role` field is simpler and more maintainable.

```python
class IsAdmin(BasePermission):    # only admin
class IsSeller(BasePermission):   # seller OR admin
class IsOwnerOrAdmin:             # object-level: your own data or admin
class IsSellerOwnerOrAdmin:       # your own products or admin
```

---

### 2.14 Front Controller Pattern
**Folder:** `backend/config/urls.py`

**What:** Single entry point that dispatches every HTTP request to the correct sub-router.

**Why:** One place to see every API endpoint. One place to add global rate-limiting or middleware. URL changes affect only this file and the relevant app's urls.py.

---

### 2.15 Composite Pattern (Category Tree)
**Folder:** `backend/apps/products/models.py → Category`

**What:** `Category` has a self-referencing FK (`parent`) forming a tree of arbitrary depth.

**Example:**
```
Clothing (root)
  └── Women's Fashion
        └── Formal Wear
              └── Bridal
```

---

## 3. DESIGN PATTERNS — FRONTEND

### 3.1 Adapter Pattern (API Client)
**File:** `frontend/src/api/client.js`

**What:** Single Axios instance that all API calls go through. Handles token injection, 401 silent refresh, and error normalization.

**Why:** If the backend URL or auth mechanism changes, only this file changes — not 40 API call sites.

```javascript
// All API calls in the app go through apiClient
const apiClient = axios.create({ baseURL: VITE_API_URL });
// Interceptors inject JWT token and handle 401 → silent refresh
```

---

### 3.2 Context / Pub-Sub Pattern
**Folder:** `frontend/src/context/`

| File | What it manages |
|---|---|
| `AuthContext.jsx` | Login state, user profile, token management |
| `CartContext.jsx` | Cart items, count, add/remove/update |
| `NotificationContext.jsx` | Unread notification count, polling |

**Why:** Avoids prop-drilling. Any component anywhere in the tree can read cart count or user data without passing props through 5 levels.

---

### 3.3 Custom Hook Pattern
**Folder:** `frontend/src/hooks/`

| Hook | Pattern |
|---|---|
| `useScrollReveal.js` | Encapsulates IntersectionObserver for scroll animations |
| `useDebounce.js` | Wraps setTimeout/clearTimeout for search debouncing |
| `useCart.js` | Thin wrapper over CartContext — components import one hook |
| `useAuth.js` | Thin wrapper over AuthContext |

**Why:** Single Responsibility — scroll animation logic is not mixed into 11 different components. It lives once in `useScrollReveal` and all components reuse it.

---

### 3.4 Lazy Loading / Code Splitting
**File:** `frontend/src/App.jsx`

**What:** All 30+ page components are loaded with `React.lazy()`. They only download when the user visits that route.

**Impact:**
| Before | After |
|---|---|
| 1 chunk: 1,089 KB downloaded on first visit | Initial chunk: 61 KB |
| Recharts (charts library) loaded on homepage | Recharts (411 KB) only loads on admin dashboard |
| FluidCursor blocks render | FluidCursor defers until browser is idle |

---

### 3.5 Component Composition (Layout Pattern)
**Folder:** `frontend/src/components/layout/`

**What:** `PublicLayout`, `AdminLayout`, `SellerLayout`, `AccountLayout` wrap route groups with shared UI (Navbar, Footer, Sidebar).

**Why:** Open/Closed Principle — adding a new public page means adding one `<Route>` inside the existing `<PublicLayout>`. The layout itself never changes.

---

## 4. DATABASE DESIGN DECISIONS

### 4.1 Normalisation
| Form | How Achieved |
|---|---|
| **1NF** | Sizes stored as separate `AttributeValue` rows, not comma-separated strings |
| **2NF** | Variant-specific data (sku, price_override) in `ProductVariant`, not repeated in `Product` |
| **3NF** | Category name lives only in `Category.name`. `Product` has FK — rename propagates automatically |

### 4.2 Stock Reservation System
```
quantity_on_hand  = physical units in warehouse
quantity_reserved = units held by active carts
available         = quantity_on_hand - quantity_reserved
```
**Why:** Without reservation, two customers can both add the last unit to cart. The first to checkout succeeds; the second gets an oversell error. Reservation prevents this race condition.

**Implementation:** MySQL triggers (`trg_cart_add_reserve`, `trg_cart_delete_release`) in migration `0003_db_optimization.py` — atomic at DB level, no race condition possible.

### 4.3 Denormalised Rating Fields
`Product.average_rating` and `Product.review_count` are stored as columns, updated on every `Review.save()`.

**Why:** Without denormalisation, `GET /products/` with 35 products would need a subquery per product to compute the average. With denormalisation: just read the column.

---

## 5. FOLDER STRUCTURE → PATTERN MAP

```
backend/
├── apps/
│   ├── products/
│   │   ├── models.py          → MVC Model, Active Record, Composite (Category tree)
│   │   ├── views.py           → MVC Controller (thin), Repository usage
│   │   ├── serializers.py     → MVC View, Two-speed serialization
│   │   ├── repositories.py    → Repository Pattern
│   │   ├── factories.py       → Factory Pattern
│   │   ├── builders.py        → Builder Pattern
│   │   └── filters.py         → Filter encapsulation
│   │
│   ├── orders/
│   │   ├── models.py          → Snapshot (OrderItem), Audit Log (OrderStatusHistory)
│   │   ├── views.py           → MVC Controller (thin)
│   │   ├── serializers.py     → Two-speed serialization
│   │   └── services.py        → Service Layer (complex business logic)
│   │
│   ├── payments/
│   │   ├── strategies.py      → Strategy Pattern (COD/Easypaisa/Card)
│   │   ├── adapters.py        → Adapter Pattern (gateway translation)
│   │   └── views.py           → MVC Controller
│   │
│   ├── pricing/
│   │   ├── models.py          → Rich Domain Model (Coupon.is_valid())
│   │   └── decorators.py      → Decorator Pattern (coupon wraps calculator)
│   │
│   ├── inventory/
│   │   ├── models.py          → Audit Log (InventoryMovement)
│   │   └── observers.py       → Observer Pattern (stock deduction on order)
│   │
│   ├── notifications/
│   │   └── observers.py       → Observer Pattern (in-app notifications)
│   │
│   ├── cart/
│   │   ├── models.py          → Stock reservation design
│   │   └── services.py        → Service Layer (cart operations)
│   │
│   ├── reviews/
│   │   └── models.py          → Active Record (save() recomputes rating)
│   │
│   └── users/
│       ├── models.py          → Custom User (email login, RBAC role field)
│       ├── services.py        → Service Layer (password reset email)
│       └── wishlist_views.py  → REST resource for wishlist
│
├── core/
│   ├── permissions.py         → RBAC Pattern (IsAdmin, IsSeller, IsOwnerOrAdmin)
│   ├── events.py              → Observer Pattern (EventBus publish/subscribe)
│   ├── exceptions.py          → Custom exceptions (InsufficientStockError)
│   ├── pagination.py          → Shared pagination
│   └── middleware.py          → Request logging middleware
│
└── config/
    ├── urls.py                → Front Controller Pattern
    └── settings/
        ├── base.py            → Shared settings
        ├── development.py     → Dev overrides
        └── production.py      → Production hardening

frontend/
├── src/
│   ├── App.jsx                → Lazy Loading, Code Splitting, Deferred WebGL
│   ├── api/
│   │   └── client.js          → Adapter Pattern (Axios + JWT interceptors)
│   ├── context/               → Context / Pub-Sub Pattern
│   ├── hooks/                 → Custom Hook Pattern (SRP for reusable logic)
│   ├── components/
│   │   ├── layout/            → Composition Pattern (shared layouts)
│   │   ├── effects/           → WebGL effects (FluidCursor)
│   │   └── shaders/           → GLSL shader components (AuroraShader)
│   ├── pages/                 → Route components (lazy-loaded)
│   └── router/                → ProtectedRoute, RoleRoute (RBAC on frontend)
```

---

## 6. KEY DESIGN DECISIONS — VIVA Q&A

**Q: Why use Repository Pattern instead of calling ORM directly in views?**
A: If `base_price` is renamed to `price` in the DB, without Repository we'd fix 40 view files. With Repository we fix one method in `ProductRepository`.

**Q: Why Factory + Builder instead of just one class?**
A: Factory decides *which* builder to use. Builder knows *how* to construct one type. They have separate responsibilities. Adding a `BundleProduct` type = write `BundleProductBuilder`, register in `ProductFactory.BUILDERS` — zero changes elsewhere (Open/Closed Principle).

**Q: Why Observer for order events instead of calling services directly?**
A: If `OrderService.place_order()` directly called `InventoryService` and `NotificationService`, we'd have tight coupling. Adding SMS notifications later would require modifying `OrderService`. With Observer, we add a `SMSObserver` and subscribe it — `OrderService` stays untouched.

**Q: Why JWT instead of sessions?**
A: Sessions require server-side state (Redis/DB lookup on every request). JWT is stateless — the token carries the user ID and role, verified with a secret key. Works naturally for a decoupled React SPA calling a Django REST API.

**Q: Why MVC over a monolith?**
A: MVC enforces that changing how data is stored (Model) doesn't break how it's displayed (Serializer), and changing the UI (React) doesn't require touching business logic (Django). Each layer can be tested, deployed, and scaled independently.

**Q: What is RBAC and where is it implemented?**
A: Role-Based Access Control. `core/permissions.py` defines `IsAdmin`, `IsSeller`, `IsOwnerOrAdmin`. Every view declares `permission_classes = [IsSeller]` etc. Authentication answers "who are you?" — permissions answer "are you allowed to do this?"

**Q: Where is the Decorator Pattern and why not just use a service?**
A: `pricing/decorators.py`. `CartPriceCalculator` computes base price. `CouponDecorator` wraps it and subtracts the coupon. If we add a `LoyaltyDecorator` (points discount), we wrap again — zero changes to existing classes. A service would require modifying existing methods.

**Q: What is the Snapshot Pattern in OrderItem?**
A: `OrderItem.product_name` and `sku` are VARCHAR columns copied at purchase time. If a seller renames a product 3 months later, the customer's invoice still shows the original name. This is the Memento pattern — preserving object state at a specific point in time.

---

*Project: VOGUE E-Commerce | Student: Hassan | Course: Software Design & Architecture*
