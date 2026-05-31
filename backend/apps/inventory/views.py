"""
MVC ROLE: CONTROLLER — HTTP boundary for inventory management endpoints.
DESIGN PATTERNS APPLIED:
  • RBAC           — all endpoints gated to [IsSeller] (sellers + admins)
  • Scoped Queryset — sellers see ONLY their own products' inventory;
                      admins see everything. The filtering is applied in
                      get_queryset() to prevent information leakage between sellers.

ROLE-SCOPED ACCESS PATTERN:
----------------------------
get_queryset() applies an ownership filter for sellers:
  if seller: filter(variant__product__created_by=request.user)
  if admin:  no filter

This is a data-ownership security gate at the queryset level. Even if a
seller guesses a competitor's variant PK and calls PATCH /inventory/999/,
get_queryset() will return an empty set for that seller and DRF will
return 404 — the seller cannot see or modify inventory they don't own.

CONTROLLER THINNESS:
  InventoryListView       — declares queryset, serializer, done.
  InventoryUpdateView     — scoped queryset + ModelSerializer handles save.
  InventoryMovementListCreateView — creates movement AND updates Inventory.
    Note: the actual quantity update lives in InventoryMovementSerializer.create()
    (the serializer layer), which is acceptable because it's tightly coupled
    to the movement model and involves no cross-app side effects.
"""
from rest_framework import generics
from core.permissions import IsSeller
from .models import Inventory, InventoryMovement
from .serializers import InventorySerializer, InventoryUpdateSerializer, InventoryMovementSerializer


class InventoryListView(generics.ListAPIView):
    """GET /api/v1/inventory/ [Seller/Admin]"""
    serializer_class = InventorySerializer
    permission_classes = [IsSeller]
    search_fields = ['variant__sku', 'variant__product__name']

    def get_queryset(self):
        qs = Inventory.objects.select_related('variant__product')
        if self.request.user.role == 'seller':
            qs = qs.filter(variant__product__created_by=self.request.user)
        return qs


class InventoryUpdateView(generics.UpdateAPIView):
    """PATCH /api/v1/inventory/{variant_id}/ [Seller/Admin]"""
    serializer_class = InventoryUpdateSerializer
    permission_classes = [IsSeller]

    def get_queryset(self):
        if self.request.user.role == 'seller':
            return Inventory.objects.filter(variant__product__created_by=self.request.user)
        return Inventory.objects.all()


class InventoryMovementListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/inventory/movements/ [Seller/Admin]"""
    serializer_class = InventoryMovementSerializer
    permission_classes = [IsSeller]

    def get_queryset(self):
        qs = InventoryMovement.objects.select_related('variant__product')
        if self.request.user.role == 'seller':
            qs = qs.filter(variant__product__created_by=self.request.user)
        return qs.order_by('-created_at')
