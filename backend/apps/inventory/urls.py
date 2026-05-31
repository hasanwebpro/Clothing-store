from django.urls import path
from . import views

urlpatterns = [
    path('',                 views.InventoryListView.as_view(),              name='inventory-list'),
    path('<int:pk>/',        views.InventoryUpdateView.as_view(),            name='inventory-update'),
    path('movements/',       views.InventoryMovementListCreateView.as_view(), name='inventory-movements'),
]
