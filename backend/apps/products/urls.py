"""
Products URL routes.

URL ORDER MATTERS in Django: more-specific paths must appear BEFORE the
catch-all `<slug:slug>/` pattern, otherwise Django routes things like
`categories/` to the slug pattern. We learned this the hard way:
`/products/categories/` was returning 500 because `categories` was being
parsed as a product slug.
"""
from django.urls import path
from . import views

urlpatterns = [
    # ── Public product endpoints ─────────────────────────────────────────
    path('',                   views.ProductListView.as_view(),         name='product-list'),
    path('featured/',          views.ProductFeaturedView.as_view(),     name='product-featured'),
    path('autocomplete/',      views.ProductAutocompleteView.as_view(), name='product-autocomplete'),
    path('mine/',              views.SellerProductListView.as_view(),   name='seller-products'),

    # ── Categories (must come before the slug catch-all) ─────────────────
    path('categories/',                       views.CategoryListView.as_view(),         name='category-list'),
    path('categories/<slug:slug>/products/',  views.CategoryProductListView.as_view(),  name='category-products'),

    # ── Seller/Admin write endpoints ─────────────────────────────────────
    path('create/',            views.ProductCreateView.as_view(),       name='product-create'),
    path('by-id/<int:pk>/',    views.ProductByIdView.as_view(),         name='product-by-id'),
    path('<int:pk>/update/',   views.ProductUpdateView.as_view(),       name='product-update'),
    path('<int:pk>/delete/',   views.ProductDeleteView.as_view(),       name='product-delete'),
    path('<int:pk>/images/',                     views.ProductImageUploadView.as_view(), name='product-image-upload'),
    path('<int:pk>/images/<int:image_id>/',      views.ProductImageUploadView.as_view(), name='product-image-delete'),

    # ── Slug-based public product detail (catch-all — keep LAST) ─────────
    path('<slug:slug>/',       views.ProductDetailView.as_view(),       name='product-detail'),
]
