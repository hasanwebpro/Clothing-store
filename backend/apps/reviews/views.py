"""
MVC ROLE: CONTROLLER — HTTP boundary for product reviews.
DESIGN PATTERNS APPLIED:
  • RBAC                — listing reviews is public; posting requires auth;
                          approving and deleting require IsAdmin
  • Rich Domain Model   — all review validation (delivered order check,
                          duplicate prevention) lives in ReviewSerializer,
                          not here in the controller
  • Template Method     — get_permissions() dynamically returns the right
                          permission set based on the HTTP method

TRUST ENFORCEMENT LOCATION:
  The rule "you can only review products you have actually received" is
  validated in ReviewSerializer.validate() (serializers.py), not here.
  The controller just calls serializer.is_valid() — if the rule fails,
  a 400 is returned automatically. This keeps the controller thin and
  the business rule in the serializer layer where it travels with the data.

APPROVAL WORKFLOW:
  All new reviews start with is_approved=False.
  ReviewApproveView (Admin only) sets is_approved=True and returns the
  full serialized review so the admin UI can update its list in-place.
  ReviewDeleteView (Admin only) uses DRF's built-in DestroyAPIView —
  no custom method needed because destroy() handles 204 No Content automatically.

WHY APPROVE RATHER THAN AUTO-PUBLISH?
  Auto-publishing reviews invites spam and fake reviews. Manual approval
  lets the business moderate content before it's visible to shoppers.
  The is_approved flag is the gate — only approved reviews appear on
  the product page (get_queryset filters is_approved=True for public reads).
"""
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from core.permissions import IsAdmin
from .models import Review
from .serializers import ReviewSerializer, HomepageReviewSerializer


class HomepageReviewsView(generics.ListAPIView):
    """GET /api/v1/reviews/homepage/ — top approved reviews for the homepage testimonials."""
    serializer_class = HomepageReviewSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return (
            Review.objects
            .filter(is_approved=True, rating__gte=4)
            .select_related('user', 'product')
            .prefetch_related('user__addresses')
            .order_by('-rating', '-created_at')[:12]
        )


class ProductReviewListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/reviews/products/{product_id}/"""
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return Review.objects.filter(
            product_id=self.kwargs['product_id'], is_approved=True
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['product_id'] = self.kwargs['product_id']
        return ctx


class ReviewApproveView(generics.UpdateAPIView):
    """PATCH /api/v1/reviews/{id}/approve/ [Admin]"""
    permission_classes = [IsAdmin]
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer

    def patch(self, request, pk):
        try:
            review = Review.objects.get(pk=pk)
        except Review.DoesNotExist:
            return Response({'message': 'Review not found.'}, status=status.HTTP_404_NOT_FOUND)
        review.is_approved = True
        review.save(update_fields=['is_approved'])
        return Response(ReviewSerializer(review, context={'request': request}).data)


class ReviewDeleteView(generics.DestroyAPIView):
    """DELETE /api/v1/reviews/{id}/ [Admin]"""
    permission_classes = [IsAdmin]
    queryset = Review.objects.all()
