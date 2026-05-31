"""
Analytics URL routes.

SDA Note: We keep the granular endpoints (top-products, revenue, order-status)
even though the dashboard endpoint includes summaries — because charts pages
need streaming/refreshing data with different cache TTLs.
"""
from django.urls import path
from . import views

urlpatterns = [
    # Public storefront stats (homepage)
    path('store-stats/',        views.StoreStatsView.as_view(),         name='analytics-store-stats'),

    # Admin and Seller dashboards (different shapes, different permissions)
    path('dashboard/',          views.DashboardView.as_view(),          name='analytics-dashboard'),
    path('seller-dashboard/',   views.SellerDashboardView.as_view(),    name='analytics-seller-dashboard'),

    # Granular charts / breakdowns
    path('top-products/',       views.TopProductsView.as_view(),        name='analytics-top-products'),
    path('revenue/',            views.RevenueChartView.as_view(),       name='analytics-revenue'),
    path('order-status/',       views.OrderStatusSummaryView.as_view(), name='analytics-order-status'),
]
