"""
Pattern   : Factory Method  (Creational — GoF)
------------------------------------------------
What it does : ProductFactory is the single creation point for all product types.
               It reads 'product_type' and delegates to the correct Builder —
               SimpleProductBuilder (one default variant) or VariableProductBuilder
               (multiple size/color SKUs).

Why we used it: Product creation logic differs by type. Without Factory, every
               view that creates a product would need its own if/else block to
               handle simple vs variable construction — duplication and a
               violation of Single Responsibility.

Why preferred : Adding a new product type (e.g., 'bundle') = create one new
               Builder class and add one entry to the BUILDERS dict. No existing
               view, builder, or service changes. The Factory is the only
               "smart constructor" in the system — one place, one responsibility.
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
