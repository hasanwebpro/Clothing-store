"""
MVC ROLE: MODEL — represents the product catalogue in the database.
DESIGN PATTERNS APPLIED:
  • Active Record (via Django ORM) — models encapsulate both data and
    the business rules that apply to that data (effective_price, discount_percentage)
  • Composite (Category hierarchy) — a Category can have sub-categories via
    self-referencing FK (parent), forming a tree of arbitrary depth

DATABASE NORMALISATION APPLIED:
--------------------------------
  1NF — atomic columns: sizes are stored as separate AttributeValue rows,
        not as a comma-separated "S,M,L,XL" string in one column.

  2NF — variant-specific data (sku, price_override, weight) is in
        ProductVariant, not repeated in Product.

  3NF — category name lives ONLY in Category.name. Product has a FK to
        Category, not a copy of the name. If a category is renamed, all
        products automatically reflect the change.

MODEL RESPONSIBILITIES (Active Record pattern):
  Product.effective_price → encapsulates "use sale_price if present" rule
  Product.discount_percentage → computed from base vs sale price
  ProductVariant.price → delegates to product.effective_price unless overridden
  Category.save() → auto-generates the SEO slug from the name

PRODUCT TYPE DESIGN DECISION:
  'simple'   → one SKU, no size/colour options (e.g. a scarf)
  'variable' → multiple SKUs with attribute combos (e.g. T-shirt in S/M/L + Red/Blue)

  ProductFactory (factories.py) + Builders (builders.py) handle the
  complexity of creating either type — the Model stays clean.

MVC NOTE ON COMPUTED FIELDS:
  effective_price and discount_percentage are Python @properties, not DB columns.
  They cannot be filtered on in QuerySets. Serializers expose them as
  SerializerMethodField so they appear in JSON without a DB hit.
"""
from django.db import models
from django.utils.text import slugify
from django.conf import settings


class Category(models.Model):
    """
    Product categories with self-referencing parent for sub-categories.
    E.g. Clothing → Women → Tops
    """
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True, db_index=True)
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='children'
    )
    image = models.ImageField(upload_to='categories/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.SmallIntegerField(default=0)

    class Meta:
        db_table = 'categories'
        verbose_name_plural = 'categories'
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Attribute(models.Model):
    """Product attribute type — e.g. 'Size', 'Color', 'Material'"""
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'attributes'

    def __str__(self):
        return self.name


class AttributeValue(models.Model):
    """A specific value for an attribute — e.g. Size:'XL', Color:'Red'"""
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE, related_name='values')
    value = models.CharField(max_length=100)

    class Meta:
        db_table = 'attribute_values'
        unique_together = [('attribute', 'value')]

    def __str__(self):
        return f"{self.attribute.name}: {self.value}"


class Product(models.Model):
    """
    Core product entity.

    product_type:
      - 'simple'   → single SKU, no variants (e.g. a scarf)
      - 'variable' → multiple SKUs with size/color options (e.g. a T-shirt)
    """
    PRODUCT_TYPE_CHOICES = [
        ('simple', 'Simple'),
        ('variable', 'Variable'),
    ]

    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='products', limit_choices_to={'role__in': ['seller', 'admin']}
    )
    name = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    description = models.TextField(blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    product_type = models.CharField(max_length=10, choices=PRODUCT_TYPE_CHOICES, default='simple')
    brand = models.CharField(max_length=100, blank=True)
    tags = models.JSONField(default=list, blank=True)
    is_published = models.BooleanField(default=False, db_index=True)
    is_featured = models.BooleanField(default=False)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    review_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['category', 'is_published']),
            models.Index(fields=['is_featured', 'is_published']),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    @property
    def effective_price(self):
        """Return sale price if active, otherwise base price."""
        return self.sale_price if self.sale_price else self.base_price

    @property
    def discount_percentage(self):
        if self.sale_price and self.base_price > 0:
            return round((1 - self.sale_price / self.base_price) * 100)
        return 0


class ProductVariant(models.Model):
    """
    A specific purchasable SKU of a product.
    E.g. T-Shirt / Size:L / Color:Red

    For simple products: one variant is auto-created with no attributes.
    For variable products: one variant per size/color combination.
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    sku = models.CharField(max_length=100, unique=True, db_index=True)
    price_override = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    weight_grams = models.PositiveSmallIntegerField(null=True, blank=True)
    attribute_values = models.ManyToManyField(
        AttributeValue,
        through='VariantAttributeValue',
        related_name='variants',
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'product_variants'

    def __str__(self):
        return f"{self.product.name} — {self.sku}"

    @property
    def price(self):
        return self.price_override if self.price_override else self.product.effective_price


class VariantAttributeValue(models.Model):
    """Junction table: which attribute values belong to a variant."""
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE)
    attribute_value = models.ForeignKey(AttributeValue, on_delete=models.CASCADE)

    class Meta:
        db_table = 'variant_attribute_values'
        unique_together = [('variant', 'attribute_value')]


class ProductImage(models.Model):
    """Product image — can be linked to a specific variant or to the whole product."""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    variant = models.ForeignKey(
        ProductVariant, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='images'
    )
    image = models.ImageField(upload_to='products/')
    alt_text = models.CharField(max_length=255, blank=True)
    sort_order = models.SmallIntegerField(default=0)
    is_primary = models.BooleanField(default=False)

    class Meta:
        db_table = 'product_images'
        ordering = ['sort_order']

    def __str__(self):
        return f"Image for {self.product.name}"
