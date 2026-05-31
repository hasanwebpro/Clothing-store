from django.urls import path
from . import views

urlpatterns = [
    path('',                    views.CartView.as_view(),         name='cart'),
    path('add/',                views.AddToCartView.as_view(),    name='cart-add'),
    path('items/<int:item_id>/', views.CartItemView.as_view(),   name='cart-item'),
    path('coupon/apply/',        views.ApplyCouponView.as_view(), name='cart-coupon-apply'),
    path('coupon/',              views.RemoveCouponView.as_view(), name='cart-coupon-remove'),
]
