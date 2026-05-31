from django.urls import path
from . import views

urlpatterns = [
    path('',                            views.OrderListView.as_view(),         name='order-list'),
    path('place/',                      views.PlaceOrderView.as_view(),        name='order-place'),
    path('<str:order_number>/',         views.OrderDetailView.as_view(),       name='order-detail'),
    path('<int:pk>/status/',            views.UpdateOrderStatusView.as_view(), name='order-status'),
    path('<int:pk>/cancel/',            views.CancelOrderView.as_view(),       name='order-cancel'),
]
