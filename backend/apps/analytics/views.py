"""
Analytics views — dashboard data for Admin and Seller panels.

MVC Role: CONTROLLER — aggregates data and shapes it for the React dashboards.

SDA NOTE: We split into TWO controllers (Admin vs Seller) because the
queries, permissions, and shapes differ. Mixing them in one view leads to
nested if/else chains and violates Single Responsibility.

CONTRACT — Admin dashboard JSON shape:
{
  total_revenue, revenue_growth, total_orders, orders_growth,
  pending_orders, total_users, new_users_today,
  total_products, published_products,
  recent_orders: [...], order_by_status: {pending: N, ...},
  top_products: [{id, name, total_sold}, ...]
}

CONTRACT — Seller dashboard JSON shape:
{
  total_products, published_products, total_sales, low_stock_count,
  recent_orders: [...], low_stock_items: [{...}], top_products: [...]
}
"""
from collections import OrderedDict
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import Sum, Count, F, Q
from django.utils import timezone

from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdmin, IsSeller
from apps.orders.models import Order, OrderItem
from apps.products.models import Product, ProductVariant
from apps.inventory.models import Inventory

User = get_user_model()

# Status set we consider "active business" for revenue/orders aggregation
ACTIVE_ORDER_STATUSES = ('confirmed', 'processing', 'shipped', 'delivered')


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC STOREFRONT STATS  (no auth required, cached for 10 min)
# ─────────────────────────────────────────────────────────────────────────────

class StoreStatsView(APIView):
    """
    GET /api/v1/analytics/store-stats/  [Public]

    Returns live counts for the homepage stats section:
      - happy_customers  : distinct users who have placed at least one order
      - brands           : distinct brand names across published products
      - total_skus       : active product variants (SKUs) across all published products
      - delivery_rate    : percentage of closed orders that were delivered (not cancelled)

    Cached for 10 minutes so every page load doesn't hammer the DB.
    """
    permission_classes = [AllowAny]
    CACHE_KEY = 'store_stats'
    CACHE_TTL = 600  # 10 minutes

    def get(self, request):
        cached = cache.get(self.CACHE_KEY)
        if cached:
            return Response(cached)

        # Happy customers — unique users with at least one order
        happy_customers = (
            Order.objects.exclude(status='cancelled')
            .values('user').distinct().count()
        )

        # Distinct brands on published products
        brands = (
            Product.objects.filter(is_published=True)
            .exclude(brand='')
            .values('brand').distinct().count()
        )

        # Total active SKUs across published products
        total_skus = (
            ProductVariant.objects.filter(
                is_active=True,
                product__is_published=True,
            ).count()
        )

        # Delivery success rate: delivered / (delivered + cancelled) × 100
        delivered = Order.objects.filter(status='delivered').count()
        cancelled = Order.objects.filter(status='cancelled').count()
        closed = delivered + cancelled
        delivery_rate = round((delivered / closed * 100), 1) if closed > 0 else 100.0

        data = {
            'happy_customers': happy_customers,
            'brands':          brands,
            'total_skus':      total_skus,
            'delivery_rate':   delivery_rate,
        }
        cache.set(self.CACHE_KEY, data, self.CACHE_TTL)
        return Response(data)


def _safe_growth_pct(current, previous) -> int:
    """Calculate growth percentage; returns 0 when previous is zero/None."""
    if not previous:
        return 0
    try:
        return round((float(current or 0) - float(previous)) / float(previous) * 100)
    except Exception:
        return 0


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

class DashboardView(APIView):
    """GET /api/v1/analytics/dashboard/  [Admin only]"""
    permission_classes = [IsAdmin]

    def get(self, request):
        from apps.reviews.models import Review
        from apps.inventory.models import Inventory
        from django.db.models import FloatField
        from django.db.models.functions import TruncDate

        today = timezone.now().date()
        this_month_start = today - timedelta(days=30)
        last_month_start = today - timedelta(days=60)

        # ── Orders ────────────────────────────────────────────────────────
        active_orders = Order.objects.filter(status__in=ACTIVE_ORDER_STATUSES)
        totals = active_orders.aggregate(
            total_revenue=Sum('total_amount'),
            total_orders=Count('id'),
        )
        this_month = active_orders.filter(created_at__date__gte=this_month_start).aggregate(
            revenue=Sum('total_amount'), orders=Count('id'),
        )
        last_month = active_orders.filter(
            created_at__date__gte=last_month_start,
            created_at__date__lt=this_month_start,
        ).aggregate(revenue=Sum('total_amount'), orders=Count('id'))

        pending_orders = Order.objects.filter(status='pending').count()
        cancelled_orders = Order.objects.filter(status='cancelled').count()
        total_all = Order.objects.count()
        cancel_rate = round(cancelled_orders / total_all * 100, 1) if total_all else 0

        total_rev = float(totals['total_revenue'] or 0)
        total_ord = totals['total_orders'] or 0
        avg_order_value = round(total_rev / total_ord, 2) if total_ord else 0

        # ── Users ─────────────────────────────────────────────────────────
        users_qs = User.objects.filter(is_active=True)
        total_users = users_qs.count()
        new_users_today = users_qs.filter(date_joined__date=today).count()
        new_users_this_month = users_qs.filter(date_joined__date__gte=this_month_start).count()
        new_users_last_month = users_qs.filter(
            date_joined__date__gte=last_month_start,
            date_joined__date__lt=this_month_start,
        ).count()

        # ── Products ──────────────────────────────────────────────────────
        total_products = Product.objects.count()
        published_products = Product.objects.filter(is_published=True).count()

        # ── Recent orders ─────────────────────────────────────────────────
        recent = Order.objects.select_related('user').order_by('-created_at')[:8]
        recent_orders = [{
            'id': o.id,
            'order_number': o.order_number,
            'customer_name': o.user.get_full_name() if o.user else 'Guest',
            'status': o.status,
            'total_amount': float(o.total_amount),
            'payment_method': o.payment_method,
            'created_at': o.created_at.isoformat(),
        } for o in recent]

        # ── Order status breakdown ────────────────────────────────────────
        status_qs = Order.objects.values('status').annotate(count=Count('id'))
        order_by_status = OrderedDict()
        for st in ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']:
            order_by_status[st] = 0
        for row in status_qs:
            order_by_status[row['status']] = row['count']

        # ── Top products ──────────────────────────────────────────────────
        top = (
            OrderItem.objects.filter(order__status__in=ACTIVE_ORDER_STATUSES)
            .values(product_id=F('variant__product_id'), name=F('product_name'))
            .annotate(total_sold=Sum('quantity'), revenue=Sum('total_price'))
            .order_by('-total_sold')[:8]
        )
        top_products = [{
            'id': r['product_id'],
            'name': r['name'],
            'total_sold': r['total_sold'] or 0,
            'revenue': float(r['revenue'] or 0),
        } for r in top]

        # ── Revenue by payment method ─────────────────────────────────────
        pay_qs = (
            active_orders
            .values('payment_method')
            .annotate(revenue=Sum('total_amount'), orders=Count('id'))
            .order_by('-revenue')
        )
        PAYMENT_LABELS = {'cod': 'Cash on Delivery', 'easypaisa': 'Easypaisa', 'card': 'Credit / Debit Card'}
        revenue_by_payment = [{
            'method': PAYMENT_LABELS.get(r['payment_method'], r['payment_method']),
            'revenue': float(r['revenue'] or 0),
            'orders': r['orders'],
        } for r in pay_qs]

        # ── Category sales breakdown ──────────────────────────────────────
        cat_qs = (
            OrderItem.objects.filter(order__status__in=ACTIVE_ORDER_STATUSES)
            .values(category=F('variant__product__category__name'))
            .annotate(revenue=Sum('total_price'), orders=Count('order_id', distinct=True))
            .order_by('-revenue')[:6]
        )
        category_sales = [{
            'name': r['category'] or 'Uncategorised',
            'revenue': float(r['revenue'] or 0),
            'orders': r['orders'],
        } for r in cat_qs]

        # ── Daily revenue — last 30 days ──────────────────────────────────
        daily_qs = (
            active_orders
            .filter(created_at__date__gte=this_month_start)
            .annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(revenue=Sum('total_amount'), orders=Count('id'))
            .order_by('day')
        )
        daily_revenue = [{
            'day': str(r['day']),
            'revenue': float(r['revenue'] or 0),
            'orders': r['orders'],
        } for r in daily_qs]

        # ── Low stock items ───────────────────────────────────────────────
        low_stock_qs = (
            Inventory.objects
            .select_related('variant__product')
            .filter(
                variant__is_active=True,
                variant__product__is_published=True,
                quantity_on_hand__lte=F('reorder_threshold') + F('quantity_reserved'),
            )
            .order_by('quantity_on_hand')[:8]
        )
        low_stock_items = [{
            'id': inv.id,
            'product_name': inv.variant.product.name,
            'sku': inv.variant.sku,
            'quantity_on_hand': inv.quantity_on_hand,
            'reorder_threshold': inv.reorder_threshold,
        } for inv in low_stock_qs]
        low_stock_count = low_stock_qs.count()

        # ── Recent reviews ────────────────────────────────────────────────
        reviews_qs = (
            Review.objects
            .select_related('user', 'product')
            .filter(is_approved=True)
            .order_by('-created_at')[:6]
        )
        recent_reviews = [{
            'id': r.id,
            'customer': r.user.get_full_name(),
            'product_name': r.product.name,
            'rating': r.rating,
            'title': r.title,
            'body': r.body[:120],
            'created_at': r.created_at.isoformat(),
        } for r in reviews_qs]

        avg_rating = round(
            sum(r['rating'] for r in recent_reviews) / len(recent_reviews), 1
        ) if recent_reviews else 0

        return Response({
            # KPIs
            'total_revenue': total_rev,
            'revenue_growth': _safe_growth_pct(this_month['revenue'], last_month['revenue']),
            'total_orders': total_ord,
            'orders_growth': _safe_growth_pct(this_month['orders'], last_month['orders']),
            'avg_order_value': avg_order_value,
            'pending_orders': pending_orders,
            'cancel_rate': cancel_rate,
            'total_users': total_users,
            'new_users_today': new_users_today,
            'users_growth': _safe_growth_pct(new_users_this_month, new_users_last_month),
            'total_products': total_products,
            'published_products': published_products,
            'low_stock_count': low_stock_count,
            'avg_rating': avg_rating,
            # Charts / tables
            'daily_revenue': daily_revenue,
            'order_by_status': order_by_status,
            'revenue_by_payment': revenue_by_payment,
            'category_sales': category_sales,
            'top_products': top_products,
            'low_stock_items': low_stock_items,
            'recent_orders': recent_orders,
            'recent_reviews': recent_reviews,
        })


# ─────────────────────────────────────────────────────────────────────────────
# SELLER DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

class SellerDashboardView(APIView):
    """GET /api/v1/analytics/seller-dashboard/  [Seller/Admin]

    Returns ONLY data scoped to this seller's products.
    Admins see all data (because admins act as "super-sellers" here).
    """
    permission_classes = [IsSeller]

    def get(self, request):
        is_admin = request.user.role == 'admin'

        # Products owned by this seller (admins see everything)
        product_qs = Product.objects.all()
        if not is_admin:
            product_qs = product_qs.filter(created_by=request.user)

        total_products = product_qs.count()
        published_products = product_qs.filter(is_published=True).count()

        # Sales total — sum of order items whose variant.product is owned by us
        items_qs = OrderItem.objects.filter(
            order__status__in=ACTIVE_ORDER_STATUSES,
            variant__product__in=product_qs,
        )
        total_sales = items_qs.aggregate(s=Sum('total_price'))['s'] or 0

        # Low stock — variants with available stock <= reorder threshold
        low_stock_qs = (
            Inventory.objects
            .select_related('variant__product')
            .filter(variant__product__in=product_qs)
            .filter(quantity_on_hand__lte=F('reorder_threshold') + F('quantity_reserved'))
            .order_by('quantity_on_hand')
        )
        low_stock_count = low_stock_qs.count()
        low_stock_items = [{
            'id': inv.id,
            'product_name': inv.variant.product.name,
            'sku': inv.variant.sku,
            'quantity_on_hand': inv.quantity_on_hand,
        } for inv in low_stock_qs[:5]]

        # Recent orders for this seller's products
        order_ids = items_qs.values_list('order_id', flat=True).distinct()[:10]
        recent = (
            Order.objects.filter(id__in=list(order_ids))
            .select_related('user')
            .order_by('-created_at')[:5]
        )
        recent_orders = [{
            'id': o.id,
            'order_number': o.order_number,
            'customer_name': o.user.get_full_name() if o.user else 'Guest',
            'status': o.status,
            'total_amount': float(o.total_amount),
            'created_at': o.created_at.isoformat(),
        } for o in recent]

        # Top products for this seller
        top = (
            items_qs.values(product_id=F('variant__product_id'), name=F('product_name'))
            .annotate(total_sold=Sum('quantity'))
            .order_by('-total_sold')[:5]
        )
        top_products = [{
            'id': r['product_id'],
            'name': r['name'],
            'total_sold': r['total_sold'] or 0,
        } for r in top]

        return Response({
            'total_products': total_products,
            'published_products': published_products,
            'total_sales': float(total_sales),
            'low_stock_count': low_stock_count,
            'low_stock_items': low_stock_items,
            'recent_orders': recent_orders,
            'top_products': top_products,
        })


# ─────────────────────────────────────────────────────────────────────────────
# Granular analytics endpoints (kept for backward compatibility + charts)
# ─────────────────────────────────────────────────────────────────────────────

class TopProductsView(APIView):
    """GET /api/v1/analytics/top-products/ [Admin/Seller]"""
    permission_classes = [IsSeller]

    def get(self, request):
        qs = OrderItem.objects.filter(order__status__in=ACTIVE_ORDER_STATUSES)
        if request.user.role == 'seller':
            qs = qs.filter(variant__product__created_by=request.user)

        top = (
            qs.values('product_name', 'variant__product_id')
            .annotate(total_sold=Sum('quantity'), total_revenue=Sum('total_price'))
            .order_by('-total_sold')[:10]
        )
        return Response({'top_products': list(top)})


class RevenueChartView(APIView):
    """GET /api/v1/analytics/revenue/?days=30 [Admin/Seller]"""
    permission_classes = [IsSeller]

    def get(self, request):
        from django.db.models.functions import TruncDate
        try:
            days = max(1, min(int(request.query_params.get('days', 30)), 365))
        except ValueError:
            days = 30
        start = timezone.now().date() - timedelta(days=days)

        qs = Order.objects.filter(
            created_at__date__gte=start,
            status__in=ACTIVE_ORDER_STATUSES,
        )

        daily = (
            qs.annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(revenue=Sum('total_amount'), orders=Count('id'))
            .order_by('day')
        )
        return Response({'daily_revenue': [
            {'day': str(r['day']), 'revenue': float(r['revenue'] or 0), 'orders': r['orders']}
            for r in daily
        ]})


class OrderStatusSummaryView(APIView):
    """GET /api/v1/analytics/order-status/ [Admin]"""
    permission_classes = [IsAdmin]

    def get(self, request):
        summary = (
            Order.objects.values('status')
            .annotate(count=Count('id'))
            .order_by('status')
        )
        return Response({'order_status_summary': list(summary)})
