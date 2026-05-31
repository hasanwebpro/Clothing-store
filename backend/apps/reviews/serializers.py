from rest_framework import serializers
from apps.orders.models import Order, OrderItem
from .models import Review


class HomepageReviewSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the homepage testimonials strip."""
    display_name = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    product_name = serializers.CharField(source='product.name', read_only=True)
    verified_purchase = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ['id', 'display_name', 'city', 'rating', 'title', 'body',
                  'product_name', 'created_at', 'verified_purchase']

    def get_display_name(self, obj):
        first = obj.user.first_name or ''
        last = obj.user.last_name or ''
        # "Sana M." — first name + last initial for privacy
        if last:
            return f"{first} {last[0]}."
        return first

    def get_city(self, obj):
        addr = obj.user.addresses.first()
        return addr.city if addr else ''

    def get_verified_purchase(self, obj):
        return obj.order_id is not None


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    verified_purchase = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ['id', 'user_name', 'rating', 'title', 'body', 'is_approved', 'created_at', 'verified_purchase']
        read_only_fields = ['id', 'user_name', 'is_approved', 'created_at', 'verified_purchase']

    def get_verified_purchase(self, obj):
        return obj.order_id is not None

    def validate(self, attrs):
        user = self.context['request'].user
        product_id = self.context['product_id']

        # Must have a delivered order containing this product
        delivered_order = Order.objects.filter(
            user=user,
            status='delivered',
            items__variant__product_id=product_id,
        ).first()

        if not delivered_order:
            raise serializers.ValidationError(
                'You can only review products from your delivered orders.'
            )

        # Prevent duplicate review for the same user+product combination
        if Review.objects.filter(user=user, product_id=product_id).exists():
            raise serializers.ValidationError(
                'You have already reviewed this product.'
            )

        attrs['_delivered_order'] = delivered_order
        return attrs

    def create(self, validated_data):
        delivered_order = validated_data.pop('_delivered_order')
        validated_data['user'] = self.context['request'].user
        validated_data['product_id'] = self.context['product_id']
        validated_data['order'] = delivered_order
        return super().create(validated_data)
