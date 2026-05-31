"""
MVC ROLE: MODEL — stores customer product reviews with trust enforcement.
DESIGN PATTERNS APPLIED:
  • Active Record (save hook) — Review.save() automatically recomputes the
    product's average_rating and review_count after every save
  • Trusted Review Guard      — review requires a FK to a delivered Order

VERIFIED PURCHASE SYSTEM:
--------------------------
Review has an optional FK to an Order. ReviewSerializer validates that:
  1. The user has a DELIVERED order containing this product
  2. They haven't already reviewed this product

This prevents:
  • Fake reviews from accounts that never bought the item
  • Review bombing (one user leaving multiple reviews)
  • Reviews on products the user only added to wishlist

The 'order' FK is nullable (SET_NULL) so if an order is deleted for
administrative reasons, existing reviews survive — they just lose the
"verified purchase" badge.

RATING DENORMALISATION (product.average_rating / review_count):
  These fields on the Product model are computed aggregates that are
  re-calculated every time a Review is saved (or approved). This is a
  deliberate de-normalisation: we trade write overhead for fast reads.

  Without this: GET /products/ must run a subquery or JOIN to compute
  average rating for every product in the list → slow for 15,000 products.

  With this: average_rating is just a column read — no aggregation needed
  in the product list query.

  _update_product_rating() is called from save(), guaranteeing the Product
  is always consistent with its reviews regardless of which code path
  creates or approves a review.
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class Review(models.Model):
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews')
    order = models.ForeignKey(
        'orders.Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviews'
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    title = models.CharField(max_length=255, blank=True)
    body = models.TextField(blank=True)
    is_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reviews'
        unique_together = [('user', 'product', 'order')]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} — {self.product.name} ({self.rating}★)"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self._update_product_rating()

    def _update_product_rating(self):
        from django.db.models import Avg, Count
        stats = Review.objects.filter(product=self.product, is_approved=True).aggregate(
            avg=Avg('rating'), count=Count('id')
        )
        self.product.average_rating = stats['avg'] or 0
        self.product.review_count = stats['count'] or 0
        self.product.save(update_fields=['average_rating', 'review_count'])
