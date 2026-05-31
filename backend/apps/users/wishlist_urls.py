from django.urls import path
from .wishlist_views import WishlistView

urlpatterns = [
    path('',                  WishlistView.as_view(), name='wishlist-list'),
    path('<int:product_id>/', WishlistView.as_view(), name='wishlist-remove'),
]
