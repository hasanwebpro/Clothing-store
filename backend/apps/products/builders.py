"""
DESIGN PATTERN: Builder

PROBLEM: Creating a variable product requires building several related
objects in the correct order:
  1. Product base record
  2. ProductVariant records (one per size/color combo)
  3. Inventory records (one per variant)
  4. VariantAttributeValue junction records
  5. (Optionally) Attribute + AttributeValue lookup rows

If you do this ad-hoc in a view, missing step 3 means products have no
inventory, causing silent bugs. The Builder enforces the order and
guarantees atomicity through a single DB transaction.

ISSUE FIXED IN THIS REVISION
----------------------------
The seller form sends variants in this shape:
    {sku, price_override, attributes: [{name: 'Size', value: 'M'}, ...], stock}

The original builder only accepted IDs:
    {sku, price_override, attribute_value_ids: [1, 5], stock}

We now accept BOTH shapes. If `attributes` is present we resolve / create
the Attribute and AttributeValue rows on the fly. This means non-technical
sellers don't need to know DB IDs — they just type "Size" / "M".

BENEFITS
--------
• Maintainability  — one builder owns all product-creation rules
• Extensibility   — adding a "BundleProductBuilder" = one new class
• Reliability     — @transaction.atomic guarantees all-or-nothing writes
• Frontend-friendly — accepts the natural payload from the seller form
"""
from django.db import transaction
from .models import (
    Product, ProductVariant, VariantAttributeValue,
    Attribute, AttributeValue,
)
from apps.inventory.models import Inventory


# ─────────────────────────────────────────────────────────────────────────────
# Shared helper — convert frontend `attributes` blob → DB AttributeValue IDs
# ─────────────────────────────────────────────────────────────────────────────
def _resolve_attribute_value_ids(variant_data: dict) -> list[int]:
    """Accept either `attribute_value_ids` (admin-style) or `attributes`
    (seller-form-style) and return concrete AttributeValue IDs, creating
    Attribute / AttributeValue rows on demand."""
    # Path 1: caller already provided the IDs
    if variant_data.get('attribute_value_ids'):
        return list(variant_data['attribute_value_ids'])

    # Path 2: caller provided friendly {name, value} pairs (seller form)
    resolved: list[int] = []
    for attr in variant_data.get('attributes', []) or []:
        name = (attr.get('name') or '').strip()
        value = (attr.get('value') or '').strip()
        if not name or not value:
            continue
        attribute, _ = Attribute.objects.get_or_create(name=name)
        attribute_value, _ = AttributeValue.objects.get_or_create(
            attribute=attribute, value=value,
        )
        resolved.append(attribute_value.id)
    return resolved


# ─────────────────────────────────────────────────────────────────────────────
# Simple product builder
# ─────────────────────────────────────────────────────────────────────────────

class SimpleProductBuilder:
    """
    PATTERN: Builder for Simple products.
    Simple = one price, one SKU, no size/color variants.
    """

    def __init__(self, data: dict, seller):
        self._data = data
        self._seller = seller
        self._product = None
        self._initial_stock = 0
        # The seller form sends `variants: [{sku, stock}]` even for simple
        # products. We pluck the stock out for the auto-generated variant.
        variants = data.get('variants') or []
        if variants:
            self._initial_stock = int(variants[0].get('stock') or 0)

    def _build_product(self):
        base_data = {k: v for k, v in self._data.items()
                     if k not in ('variants', 'images')}
        base_data['product_type'] = 'simple'
        base_data['created_by'] = self._seller
        self._product = Product(**base_data)
        self._product.save()
        return self

    def _build_default_variant(self):
        # Auto-generate a SKU: BRAND-NAME-RANDOM
        brand_prefix = (self._product.brand or 'SKU')[:3].upper()
        sku = f"{brand_prefix}-{self._product.id}"
        variant = ProductVariant.objects.create(
            product=self._product,
            sku=sku,
        )
        Inventory.objects.create(variant=variant, quantity_on_hand=self._initial_stock)
        return self

    @transaction.atomic
    def build(self) -> Product:
        """Build and save the complete product. Atomic — all or nothing."""
        self._build_product()._build_default_variant()
        return self._product


# ─────────────────────────────────────────────────────────────────────────────
# Variable product builder
# ─────────────────────────────────────────────────────────────────────────────

class VariableProductBuilder:
    """
    PATTERN: Builder for Variable products.
    Variable = multiple SKUs with different size/color combinations.

    Accepted variant payload shapes (both work):

      Shape A — admin/API friendly:
        {sku, price_override, attribute_value_ids: [1, 5], stock}

      Shape B — seller-form friendly:
        {sku, price_override, attributes: [{name:'Size', value:'M'}], stock}
    """

    def __init__(self, data: dict, seller):
        self._data = data
        self._seller = seller
        self._product = None
        self._variants_data = data.get('variants', [])

    def _build_product(self):
        base_data = {k: v for k, v in self._data.items()
                     if k not in ('variants', 'images')}
        base_data['product_type'] = 'variable'
        base_data['created_by'] = self._seller
        self._product = Product(**base_data)
        self._product.save()
        return self

    def _build_variants(self):
        for v_data in self._variants_data:
            sku = (v_data.get('sku') or '').strip()
            if not sku:
                # Auto-generate a SKU if seller left it blank
                sku = f"{(self._product.brand or 'SKU')[:3].upper()}-{self._product.id}-{ProductVariant.objects.filter(product=self._product).count() + 1}"
            variant = ProductVariant.objects.create(
                product=self._product,
                sku=sku,
                price_override=v_data.get('price_override'),
                weight_grams=v_data.get('weight_grams'),
            )
            # Resolve attribute values (handles both payload shapes)
            for av_id in _resolve_attribute_value_ids(v_data):
                VariantAttributeValue.objects.get_or_create(
                    variant=variant,
                    attribute_value_id=av_id,
                )
            # Create inventory record with the initial stock from the form
            Inventory.objects.create(
                variant=variant,
                quantity_on_hand=int(v_data.get('stock') or 0),
            )
        return self

    @transaction.atomic
    def build(self) -> Product:
        """Build and save the complete variable product. Atomic — all or nothing."""
        if not self._variants_data:
            raise ValueError("Variable products require at least one variant.")
        self._build_product()._build_variants()
        return self._product
