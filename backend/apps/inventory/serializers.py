"""
MVC ROLE: SERIALIZER — shapes inventory data for the seller dashboard table.
DESIGN PATTERN: Read/Write separation + Side-Effect in create()

THREE SERIALIZERS, THREE PURPOSES:
------------------------------------
InventorySerializer (read-only for the list view):
  Flattens the nested variant.sku and variant.product.name into top-level
  fields so the frontend table can display them without traversal.
  available is the @property from the model (on_hand - reserved).

InventoryUpdateSerializer (write-only for PATCH):
  Exposes ONLY quantity_on_hand and reorder_threshold — the two fields
  a seller is allowed to set directly. quantity_reserved is system-managed
  (by DB triggers) and is therefore excluded to prevent tampering.

InventoryMovementSerializer (read + write for movement log):
  create() has a side effect: after recording the movement, it increments
  (or decrements) Inventory.quantity_on_hand by movement.quantity.
  This keeps the movement log and the stock level in sync automatically.

  DESIGN NOTE: putting a side effect in a serializer's create() is
  acceptable when the side effect is tightly scoped (same app, same model
  relationship) and has no external dependencies. For cross-app side effects
  (e.g. sending an email after a restock) use the Observer / EventBus instead.
"""
from rest_framework import serializers
from .models import Inventory, InventoryMovement


class InventorySerializer(serializers.ModelSerializer):
    sku = serializers.CharField(source='variant.sku', read_only=True)
    product_name = serializers.CharField(source='variant.product.name', read_only=True)
    available = serializers.IntegerField(read_only=True)

    class Meta:
        model = Inventory
        fields = ['id', 'sku', 'product_name', 'quantity_on_hand',
                  'quantity_reserved', 'available', 'reorder_threshold', 'updated_at']
        read_only_fields = ['id', 'quantity_reserved', 'updated_at']


class InventoryUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Inventory
        fields = ['quantity_on_hand', 'reorder_threshold']


class InventoryMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryMovement
        fields = ['id', 'variant', 'movement', 'quantity', 'reference', 'note', 'created_at']
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        movement = super().create(validated_data)

        # Update the actual inventory count
        inventory = movement.variant.inventory
        inventory.quantity_on_hand += movement.quantity
        inventory.save()
        return movement
