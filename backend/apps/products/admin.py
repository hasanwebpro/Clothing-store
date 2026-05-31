from django.contrib import admin
from .models import Category, Product, Attribute, AttributeValue

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'is_active', 'sort_order']
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'base_price', 'is_published', 'created_at']
    prepopulated_fields = {'slug': ('name',)}
    list_filter = ['is_published', 'category', 'product_type']
    search_fields = ['name']

@admin.register(Attribute)
class AttributeAdmin(admin.ModelAdmin):
    pass

@admin.register(AttributeValue)
class AttributeValueAdmin(admin.ModelAdmin):
    list_display = ['attribute', 'value']
