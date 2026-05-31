"""
DESIGN PATTERN: Factory

PROBLEM: Creating a product involves different logic depending on type.
A 'simple' product has one variant. A 'variable' product has many variants
with size/color combinations. Scattering if/else checks in multiple views
is messy and violates the Open/Closed Principle.

SOLUTION: ProductFactory is the single creation point. It reads 'product_type'
and delegates to the correct Builder class.

CLASSES INVOLVED:
  ProductFactory        → decides which builder to use
  SimpleProductBuilder  → creates a product with one default variant
  VariableProductBuilder → creates a product with multiple SKU variants

SCALABILITY: To add a 'BundleProduct' type, create BundleProductBuilder
and register it in BUILDERS — zero changes to existing code.

SDA Note: This is the "Factory Method" pattern from GoF (Gang of Four).
Think of a factory as a "smart constructor" that picks the right recipe.
"""
from .builders import SimpleProductBuilder, VariableProductBuilder


class ProductFactory:
    """
    PATTERN: Factory — central creation point for all product types.
    Keeps the 'how to build' knowledge out of views.
    """

    BUILDERS = {
        'simple': SimpleProductBuilder,
        'variable': VariableProductBuilder,
    }

    @classmethod
    def create(cls, product_type: str, data: dict, seller):
        """
        Create a product of the given type.

        Args:
            product_type: 'simple' or 'variable'
            data: validated request data from the serializer
            seller: the User instance creating this product

        Returns:
            Product instance (already saved to DB)

        Raises:
            ValueError if product_type is not registered
        """
        builder_class = cls.BUILDERS.get(product_type)
        if not builder_class:
            valid_types = ', '.join(cls.BUILDERS.keys())
            raise ValueError(
                f"Unknown product type '{product_type}'. "
                f"Valid types: {valid_types}"
            )
        return builder_class(data, seller).build()
