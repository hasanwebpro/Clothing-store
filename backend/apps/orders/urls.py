from django.urls import path
from . import views

urlpatterns = [
    path('',                            views.OrderListView.as_view(),         name='order-list'),
    path('place/',                      views.PlaceOrderView.as_view(),        name='order-place'),

    # ── Returns / refunds / exchanges ──
    # NOTE: 'returns/' is a single path segment and would otherwise be captured
    # by the '<str:order_number>/' route below, so it MUST be declared first.
    path('returns/',                    views.ReturnListCreateView.as_view(),  name='return-list'),
    path('returns/<int:pk>/',           views.ResolveReturnView.as_view(),     name='return-resolve'),
    path('<int:pk>/returns/',           views.ReturnListCreateView.as_view(),  name='return-create'),

    path('<int:pk>/status/',            views.UpdateOrderStatusView.as_view(), name='order-status'),
    path('<int:pk>/cancel/',            views.CancelOrderView.as_view(),       name='order-cancel'),
    path('<str:order_number>/',         views.OrderDetailView.as_view(),       name='order-detail'),
]
