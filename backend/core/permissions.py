"""
DESIGN PATTERN: Role-Based Access Control (RBAC)
MVC ROLE: Cross-cutting concern — guards every Controller (View) before
          business logic runs.

WHAT IS RBAC?
-------------
RBAC assigns permissions to *roles*, not to individual users. Instead of
asking "can user #42 delete a product?", we ask "is user #42 a seller or
admin?". New employees get the right permissions the moment their role is set.

WHERE IT FITS IN MVC:
---------------------
  HTTP Request → Authentication → Permission Check → View (Controller) → Model
                                         ↑
                          These classes live here

Authentication (JWT) answers: WHO are you?
Permissions answer: are you ALLOWED to do this?

WHY NOT USE DJANGO'S BUILT-IN PERMISSIONS?
------------------------------------------
Django's built-in permission system is table-level (can_add_product,
can_delete_product) and requires individual permission assignment per user.
For a three-role SaaS platform (admin / seller / customer) a single 'role'
field is much simpler to reason about and scales without a permissions DB table.

ROLE HIERARCHY:
  admin    → can do EVERYTHING (superuser for business logic)
  seller   → can manage their OWN products, inventory, see orders
  customer → can shop, order, write reviews on delivered purchases

OBJECT-LEVEL PERMISSIONS:
  IsOwnerOrAdmin      → "is this YOUR order / address / notification?"
  IsSellerOwnerOrAdmin → "is this YOUR product?"
  These run on individual model instances, not on the view as a whole.

BENEFITS OF THIS PATTERN:
  • Centralised — change a role's access in ONE file
  • Composable  — [IsAuthenticated, IsSellerOwnerOrAdmin] stacks cleanly
  • Readable    — permission_classes = [IsAdmin] documents intent at a glance
  • Secure      — admin bypass is explicit, not implicit
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    """Only Admin users can access this resource."""
    message = 'Admin access required.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'admin'
        )


class IsSeller(BasePermission):
    """Sellers AND admins can access this resource."""
    message = 'Seller or Admin access required.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ('seller', 'admin')
        )


class IsCustomer(BasePermission):
    """Only Customer role can access this resource."""
    message = 'Customer access required.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'customer'
        )


class IsOwnerOrAdmin(BasePermission):
    """
    Object-level permission: users can only access their OWN data.
    Admins can access everything.

    The model instance must have a 'user' FK pointing to the user.
    Used for: Orders, Addresses, Cart, Reviews, Notifications.
    """
    message = 'You can only access your own data.'

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        # Support objects with .user or .user_id
        owner = getattr(obj, 'user', None) or getattr(obj, 'user_id', None)
        if owner is None:
            return False
        if hasattr(owner, 'pk'):
            return owner.pk == request.user.pk
        return owner == request.user.pk


class IsSellerOwnerOrAdmin(BasePermission):
    """
    Object-level: sellers can only edit their OWN products.
    Admins can edit everything.

    The model instance must have a 'created_by' FK pointing to the seller.
    """
    message = 'You can only manage your own products.'

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        if request.user.role == 'seller':
            owner = getattr(obj, 'created_by', None) or getattr(obj, 'created_by_id', None)
            if hasattr(owner, 'pk'):
                return owner.pk == request.user.pk
            return owner == request.user.pk
        return False


class ReadOnly(BasePermission):
    """Allow safe HTTP methods (GET, HEAD, OPTIONS) to anyone."""

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS
