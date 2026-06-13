from django.urls import path
from . import views

urlpatterns = [
    path('all/',                       views.AdminReviewListView.as_view(),          name='reviews-all'),
    path('homepage/',                  views.HomepageReviewsView.as_view(),          name='reviews-homepage'),
    path('products/<int:product_id>/', views.ProductReviewListCreateView.as_view(), name='product-reviews'),
    path('<int:pk>/approve/',          views.ReviewApproveView.as_view(),            name='review-approve'),
    path('<int:pk>/',                  views.ReviewDeleteView.as_view(),             name='review-delete'),
]
