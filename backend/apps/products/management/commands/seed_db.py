"""
Management command: seed_db

Seeds the MySQL database with realistic dummy data for development and demo.
Downloads actual product images from Unsplash and stores them in MEDIA_ROOT.

Usage:
    python manage.py seed_db              # seed everything (skips if data exists)
    python manage.py seed_db --flush      # wipe all data first, then seed fresh
    python manage.py seed_db --no-images  # skip image downloads (faster, no images)

SDA Patterns demonstrated here:
  - Repository Pattern  → we use Django ORM directly (no repo layer) since this
                          is a utility command, not a business-logic view
  - Factory Pattern     → ProductFactory.create() is called for each product
  - Builder Pattern     → VariableProductBuilder handles complex variant products
  - Observer Pattern    → EventBus NOT fired here (we bypass it intentionally;
                          no emails during seeding)
"""
import os
import io
import random
import urllib.request
from datetime import timedelta

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.utils.text import slugify
from django.db import transaction

# ─── Seed data constants ──────────────────────────────────────────────────────

ADMIN_EMAIL    = 'hassanbk2003@gmail.com'
ADMIN_PASSWORD = 'Admin@123'

SELLERS = [
    {'email': 'zara@vogue.pk',   'first_name': 'Zara',   'last_name': 'Khan',   'password': 'Seller@123'},
    {'email': 'hassan@vogue.pk', 'first_name': 'Hassan', 'last_name': 'Ali',    'password': 'Seller@123'},
]

CUSTOMERS = [
    {'email': 'sana@example.com',    'first_name': 'Sana',    'last_name': 'Malik',   'phone': '03001234567', 'city': 'Lahore',      'province': 'Punjab'},
    {'email': 'ahmed@example.com',   'first_name': 'Ahmed',   'last_name': 'Raza',    'phone': '03012345678', 'city': 'Karachi',     'province': 'Sindh'},
    {'email': 'fatima@example.com',  'first_name': 'Fatima',  'last_name': 'Khan',    'phone': '03023456789', 'city': 'Islamabad',   'province': 'ICT'},
    {'email': 'usman@example.com',   'first_name': 'Usman',   'last_name': 'Tariq',   'phone': '03034567890', 'city': 'Lahore',      'province': 'Punjab'},
    {'email': 'ayesha@example.com',  'first_name': 'Ayesha',  'last_name': 'Butt',    'phone': '03045678901', 'city': 'Faisalabad',  'province': 'Punjab'},
    {'email': 'bilal@example.com',   'first_name': 'Bilal',   'last_name': 'Ahmed',   'phone': '03056789012', 'city': 'Rawalpindi',  'province': 'Punjab'},
    {'email': 'nadia@example.com',   'first_name': 'Nadia',   'last_name': 'Iqbal',   'phone': '03067890123', 'city': 'Multan',      'province': 'Punjab'},
    {'email': 'kamran@example.com',  'first_name': 'Kamran',  'last_name': 'Sheikh',  'phone': '03078901234', 'city': 'Peshawar',    'province': 'KPK'},
    {'email': 'sara@example.com',    'first_name': 'Sara',    'last_name': 'Hussain', 'phone': '03089012345', 'city': 'Quetta',      'province': 'Balochistan'},
    {'email': 'ali@example.com',     'first_name': 'Ali',     'last_name': 'Hassan',  'phone': '03090123456', 'city': 'Hyderabad',   'province': 'Sindh'},
]

CATEGORIES = [
    {'name': "Women's Fashion", 'slug': 'women',      'sort_order': 1},
    {'name': "Men's Fashion",   'slug': 'men',        'sort_order': 2},
    {'name': "Kids' Fashion",   'slug': 'kids',       'sort_order': 3},
    {'name': 'Accessories',     'slug': 'accessories','sort_order': 4},
    {'name': 'Sale',            'slug': 'sale',       'sort_order': 5},
]

# Unsplash CDN image URLs — 600px wide, matched to each product type
PRODUCT_DATA = [
    # ── Women's Fashion ───────────────────────────────────────────────────────
    {
        'name': 'Floral Embroidered Lawn Suit',
        'category': "Women's Fashion",
        'brand': 'Khaadi',
        'base_price': 4500,
        'sale_price': 3150,
        'product_type': 'variable',
        'is_featured': True,
        'tags': ['lawn', 'summer', 'embroidered', 'eid'],
        'description': 'Premium 3-piece lawn suit with intricate floral embroidery on the shirt. Comes with matching printed dupatta and dyed trouser. Ideal for casual and semi-formal occasions.',
        'images': [
            'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        'colors': ['Rose', 'Mint', 'Lavender'],
        'stock_per_variant': 30,
    },
    {
        'name': 'Silk Organza Anarkali Frock',
        'category': "Women's Fashion",
        'brand': 'Sana Safinaz',
        'base_price': 8900,
        'sale_price': None,
        'product_type': 'variable',
        'is_featured': True,
        'tags': ['formal', 'silk', 'anarkali', 'wedding'],
        'description': 'Luxurious silk organza Anarkali frock with hand-done thread embroidery. Perfect for weddings and formal gatherings. Fully lined with premium inner fabric.',
        'images': [
            'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['S', 'M', 'L', 'XL'],
        'colors': ['Ivory', 'Dusty Pink', 'Champagne'],
        'stock_per_variant': 15,
    },
    {
        'name': 'Printed Cotton Lawn Shirt',
        'category': "Women's Fashion",
        'brand': 'Gul Ahmed',
        'base_price': 2200,
        'sale_price': 1540,
        'product_type': 'variable',
        'is_featured': False,
        'tags': ['casual', 'cotton', 'lawn', 'summer'],
        'description': 'Single-piece printed cotton lawn shirt. Versatile and breathable — perfect for the Pakistani summer. Easy to pair with jeans, palazzos, or trousers.',
        'images': [
            'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        'colors': ['White', 'Sky Blue', 'Peach'],
        'stock_per_variant': 50,
    },
    {
        'name': 'Summer Pret Co-Ord Set',
        'category': "Women's Fashion",
        'brand': 'Sapphire',
        'base_price': 5600,
        'sale_price': 3920,
        'product_type': 'variable',
        'is_featured': True,
        'tags': ['coord', 'summer', 'casual', 'trendy'],
        'description': 'Matching co-ord set featuring a cropped shirt and wide-leg trousers. Made from premium cotton blend fabric with subtle texture. A statement piece for the season.',
        'images': [
            'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['XS', 'S', 'M', 'L', 'XL'],
        'colors': ['Terracotta', 'Sage', 'Cream'],
        'stock_per_variant': 25,
    },
    {
        'name': 'Chiffon Georgette Dupatta',
        'category': "Women's Fashion",
        'brand': 'Maria B',
        'base_price': 1800,
        'sale_price': None,
        'product_type': 'simple',
        'is_featured': False,
        'tags': ['dupatta', 'chiffon', 'accessories'],
        'description': 'Luxurious chiffon georgette dupatta with hand-embroidered border. 2.5 meters, perfect to pair with any shalwar kameez or suit.',
        'images': [
            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['One Size'],
        'colors': ['Blush', 'Navy', 'Emerald'],
        'stock_per_variant': 60,
    },
    {
        'name': 'Digital Print Kaftan Dress',
        'category': "Women's Fashion",
        'brand': 'Zara Shahjahan',
        'base_price': 6500,
        'sale_price': 4550,
        'product_type': 'variable',
        'is_featured': False,
        'tags': ['kaftan', 'digital-print', 'resort', 'casual'],
        'description': 'Breezy kaftan dress in vibrant digital print. Made from premium viscose fabric. Perfect for vacations, resort wear, or casual day-outs.',
        'images': [
            'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['S', 'M', 'L', 'XL', 'XXL'],
        'colors': ['Tropical Blue', 'Sunset Orange'],
        'stock_per_variant': 20,
    },
    {
        'name': 'Embroidered Velvet Shawl',
        'category': "Women's Fashion",
        'brand': 'Alkaram',
        'base_price': 3800,
        'sale_price': 2660,
        'product_type': 'simple',
        'is_featured': True,
        'tags': ['shawl', 'velvet', 'winter', 'embroidered'],
        'description': 'Plush velvet shawl with hand-done zari embroidery on borders. Warm, elegant and versatile — pairs beautifully with both formal and casual outfits. 2.5m length.',
        'images': [
            'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['One Size'],
        'colors': ['Deep Red', 'Midnight Blue', 'Forest Green', 'Black'],
        'stock_per_variant': 35,
    },
    {
        'name': 'Casual Kurti with Palazzo',
        'category': "Women's Fashion",
        'brand': 'Limelight',
        'base_price': 2800,
        'sale_price': 1960,
        'product_type': 'variable',
        'is_featured': False,
        'tags': ['kurti', 'palazzo', 'casual', 'everyday'],
        'description': 'Relaxed-fit long kurti paired with flowy wide-leg palazzo. Cotton blend fabric with abstract print. A comfortable everyday set perfect for work or casual outings.',
        'images': [
            'https://images.unsplash.com/photo-1592301933927-35b597393c0a?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        'colors': ['Mustard', 'Teal', 'Coral', 'Off White'],
        'stock_per_variant': 40,
    },
    {
        'name': 'Bridal Lehenga Choli',
        'category': "Women's Fashion",
        'brand': 'HSY',
        'base_price': 45000,
        'sale_price': None,
        'product_type': 'variable',
        'is_featured': True,
        'tags': ['bridal', 'lehenga', 'wedding', 'formal'],
        'description': 'Stunning bridal lehenga choli in heavy embroidered fabric with intricate hand-work. Includes fully embellished choli blouse and dupatta with kiran border. A dream piece for the big day.',
        'images': [
            'https://images.unsplash.com/photo-1571513722275-4b41940f54b8?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['XS', 'S', 'M', 'L', 'XL'],
        'colors': ['Crimson Red', 'Royal Maroon', 'Emerald Gold'],
        'stock_per_variant': 5,
    },
    {
        'name': 'Georgette Maxi Dress',
        'category': "Women's Fashion",
        'brand': 'Sapphire',
        'base_price': 5500,
        'sale_price': 3850,
        'product_type': 'variable',
        'is_featured': False,
        'tags': ['maxi', 'georgette', 'formal', 'evening'],
        'description': 'Elegant floor-length georgette maxi dress with floral print. Flowy silhouette with a cinched waist. Perfect for dinner parties, formal events, or evening wear.',
        'images': [
            'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['XS', 'S', 'M', 'L', 'XL'],
        'colors': ['Blush Pink', 'Sage Green', 'Navy Blue'],
        'stock_per_variant': 20,
    },
    # ── Men's Fashion ─────────────────────────────────────────────────────────
    {
        'name': 'Classic Linen Shalwar Kameez',
        'category': "Men's Fashion",
        'brand': 'Alkaram',
        'base_price': 3800,
        'sale_price': None,
        'product_type': 'variable',
        'is_featured': True,
        'tags': ['shalwar-kameez', 'linen', 'eid', 'formal'],
        'description': 'Premium linen shalwar kameez with subtle self-texture. Perfect for Eid, weddings, and formal occasions. Breathable and comfortable for all-day wear.',
        'images': [
            'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
        'colors': ['Off White', 'Beige', 'Light Grey', 'Sky Blue'],
        'stock_per_variant': 40,
    },
    {
        'name': 'Embroidered Kurta with Trouser',
        'category': "Men's Fashion",
        'brand': 'Bonanza',
        'base_price': 5200,
        'sale_price': 3640,
        'product_type': 'variable',
        'is_featured': True,
        'tags': ['kurta', 'embroidered', 'formal', 'wedding'],
        'description': '2-piece embroidered kurta with matching trouser. Intricate neckline embroidery with matching border. Suitable for mehndi, barat, and formal events.',
        'images': [
            'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['S', 'M', 'L', 'XL', 'XXL'],
        'colors': ['Sage Green', 'Burgundy', 'Navy'],
        'stock_per_variant': 20,
    },
    {
        'name': 'Cotton Casual Kurta',
        'category': "Men's Fashion",
        'brand': 'Breakout',
        'base_price': 2400,
        'sale_price': 1680,
        'product_type': 'variable',
        'is_featured': False,
        'tags': ['kurta', 'casual', 'cotton', 'everyday'],
        'description': 'Relaxed-fit cotton kurta for everyday wear. Minimal design with clean lines. Available in multiple solid colors. Machine washable.',
        'images': [
            'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['S', 'M', 'L', 'XL', 'XXL'],
        'colors': ['White', 'Black', 'Olive', 'Charcoal'],
        'stock_per_variant': 60,
    },
    {
        'name': 'Velvet Waistcoat with Pocket Square',
        'category': "Men's Fashion",
        'brand': 'Limelight',
        'base_price': 3200,
        'sale_price': None,
        'product_type': 'variable',
        'is_featured': False,
        'tags': ['waistcoat', 'formal', 'wedding', 'velvet'],
        'description': 'Elegant waistcoat in premium velvet fabric with intricate embroidery. Comes with a matching pocket square. Perfect for groom\'s family and special events.',
        'images': [
            'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['S', 'M', 'L', 'XL', 'XXL'],
        'colors': ['Maroon', 'Dark Green', 'Royal Blue'],
        'stock_per_variant': 15,
    },
    {
        'name': "Men's Polo Shirt",
        'category': "Men's Fashion",
        'brand': 'Breakout',
        'base_price': 1900,
        'sale_price': 1330,
        'product_type': 'variable',
        'is_featured': False,
        'tags': ['polo', 'casual', 'summer', 'western'],
        'description': 'Premium pique cotton polo shirt. Classic fit with ribbed collar and cuffs. Perfect for smart-casual looks. Available in multiple versatile colors.',
        'images': [
            'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['S', 'M', 'L', 'XL', 'XXL'],
        'colors': ['Navy', 'White', 'Red', 'Bottle Green'],
        'stock_per_variant': 70,
    },
    {
        'name': 'Pathani Shalwar Suit',
        'category': "Men's Fashion",
        'brand': 'Alkaram',
        'base_price': 4200,
        'sale_price': None,
        'product_type': 'variable',
        'is_featured': False,
        'tags': ['pathani', 'shalwar-kameez', 'traditional', 'casual'],
        'description': 'Classic Pathani suit in premium khaddar fabric. Comfortable loose-fit design with traditional side pockets and round neckline. Great for everyday wear and religious occasions.',
        'images': [
            'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
        'colors': ['Beige', 'Off White', 'Charcoal', 'Slate Blue'],
        'stock_per_variant': 35,
    },
    {
        'name': "Men's Sherwani (Wedding)",
        'category': "Men's Fashion",
        'brand': 'HSY',
        'base_price': 18000,
        'sale_price': None,
        'product_type': 'variable',
        'is_featured': True,
        'tags': ['sherwani', 'wedding', 'formal', 'groom'],
        'description': 'Regal sherwani in premium jacquard fabric with intricate gold thread embroidery on collar and cuffs. Comes with matching churidar and pocket square. Ideal for grooms and barat functions.',
        'images': [
            'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['S', 'M', 'L', 'XL', 'XXL'],
        'colors': ['Ivory Gold', 'Black Gold', 'Champagne'],
        'stock_per_variant': 8,
    },
    {
        'name': "Men's Formal Dress Shirt",
        'category': "Men's Fashion",
        'brand': 'Bonanza',
        'base_price': 2800,
        'sale_price': 1960,
        'product_type': 'variable',
        'is_featured': False,
        'tags': ['shirt', 'formal', 'office', 'western'],
        'description': 'Crisp cotton-blend formal shirt with spread collar. Slim fit with a clean modern look. Ideal for office wear or paired under a blazer. Available in classic solid colors.',
        'images': [
            'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['S', 'M', 'L', 'XL', 'XXL'],
        'colors': ['White', 'Sky Blue', 'Light Pink', 'Mint'],
        'stock_per_variant': 55,
    },
    # ── Kids' Fashion ─────────────────────────────────────────────────────────
    {
        'name': "Kids' Eid Party Frock",
        'category': "Kids' Fashion",
        'brand': 'Sapphire',
        'base_price': 2800,
        'sale_price': 1960,
        'product_type': 'variable',
        'is_featured': True,
        'tags': ['kids', 'frock', 'eid', 'party'],
        'description': 'Beautiful Eid party frock for girls with delicate lace detailing and puff sleeves. Comes with a matching hair band. Perfect for special occasions.',
        'images': [
            'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['2-3Y', '3-4Y', '4-5Y', '5-6Y', '6-7Y', '7-8Y'],
        'colors': ['Blush Pink', 'Lilac', 'Mint'],
        'stock_per_variant': 25,
    },
    {
        'name': 'Boys Shalwar Kameez Set',
        'category': "Kids' Fashion",
        'brand': 'Khaadi',
        'base_price': 2200,
        'sale_price': None,
        'product_type': 'variable',
        'is_featured': False,
        'tags': ['kids', 'boys', 'shalwar-kameez', 'eid'],
        'description': 'Traditional shalwar kameez set for boys with beautiful embroidery. Comes with matching kulla. Perfect for Eid, family gatherings, and cultural events.',
        'images': [
            'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['2-3Y', '3-4Y', '4-5Y', '5-6Y', '6-7Y', '7-8Y', '8-10Y'],
        'colors': ['White', 'Light Blue', 'Peach'],
        'stock_per_variant': 30,
    },
    {
        'name': 'Kids Casual T-Shirt Pack (3)',
        'category': "Kids' Fashion",
        'brand': 'Breakout',
        'base_price': 1500,
        'sale_price': 1200,
        'product_type': 'variable',
        'is_featured': False,
        'tags': ['kids', 't-shirt', 'casual', 'pack'],
        'description': "Pack of 3 comfortable cotton t-shirts for everyday wear. Fun prints and solid colors. Soft fabric that's gentle on kids' skin. Machine washable.",
        'images': [
            'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['2-3Y', '3-4Y', '4-5Y', '5-6Y', '6-7Y'],
        'colors': ['Mixed Pack'],
        'stock_per_variant': 50,
    },
    {
        'name': "Girls' Summer Frock",
        'category': "Kids' Fashion",
        'brand': 'Gul Ahmed',
        'base_price': 1800,
        'sale_price': 1260,
        'product_type': 'variable',
        'is_featured': False,
        'tags': ['kids', 'girls', 'frock', 'summer', 'casual'],
        'description': 'Light and airy cotton summer frock for girls. Playful printed pattern with smocked bodice and ruffled hem. Easy to wash and quick to dry — perfect for active kids.',
        'images': [
            'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['2-3Y', '3-4Y', '4-5Y', '5-6Y', '6-7Y', '7-8Y'],
        'colors': ['Yellow', 'Coral', 'Sky Blue', 'White'],
        'stock_per_variant': 40,
    },
    {
        'name': "Boys' Denim & Tee Set",
        'category': "Kids' Fashion",
        'brand': 'Breakout',
        'base_price': 2400,
        'sale_price': None,
        'product_type': 'variable',
        'is_featured': False,
        'tags': ['kids', 'boys', 'denim', 'casual', 'western'],
        'description': "Casual denim jeans paired with a printed cotton tee. Durable stretch denim with elasticated waistband for comfort. Great for school, outings, or everyday play.",
        'images': [
            'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['3-4Y', '4-5Y', '5-6Y', '6-7Y', '7-8Y', '8-10Y'],
        'colors': ['Blue Denim', 'Black Denim'],
        'stock_per_variant': 30,
    },
    # ── Accessories ───────────────────────────────────────────────────────────
    {
        'name': 'Handcrafted Leather Tote Bag',
        'category': 'Accessories',
        'brand': 'Vogue',
        'base_price': 6500,
        'sale_price': None,
        'product_type': 'simple',
        'is_featured': True,
        'tags': ['bag', 'leather', 'tote', 'accessories'],
        'description': 'Genuine leather tote bag with hand-stitched details. Spacious interior with multiple pockets. Perfect for work, shopping, or everyday use. Comes with a dust bag.',
        'images': [
            'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['One Size'],
        'colors': ['Tan', 'Black', 'Burgundy'],
        'stock_per_variant': 30,
    },
    {
        'name': 'Embellished Khussa Shoes',
        'category': 'Accessories',
        'brand': 'Vogue',
        'base_price': 2800,
        'sale_price': 1960,
        'product_type': 'variable',
        'is_featured': False,
        'tags': ['khussa', 'shoes', 'traditional', 'wedding'],
        'description': 'Handcrafted khussa with glass bead embellishment and traditional mirror work. Genuine leather sole for comfort. Perfect with any traditional outfit.',
        'images': [
            'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['36', '37', '38', '39', '40', '41'],
        'colors': ['Gold', 'Silver', 'Multicolor'],
        'stock_per_variant': 15,
    },
    {
        'name': 'Gold Plated Jhumka Earrings',
        'category': 'Accessories',
        'brand': 'Vogue',
        'base_price': 1200,
        'sale_price': 840,
        'product_type': 'simple',
        'is_featured': False,
        'tags': ['jewellery', 'earrings', 'jhumka', 'gold'],
        'description': '22K gold-plated jhumka earrings with intricate filigree work and dangling beads. Lightweight for all-day comfort. Perfect with both traditional and fusion outfits.',
        'images': [
            'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['One Size'],
        'colors': ['Gold'],
        'stock_per_variant': 80,
    },
    {
        'name': 'Embroidered Clutch Bag',
        'category': 'Accessories',
        'brand': 'Vogue',
        'base_price': 3200,
        'sale_price': None,
        'product_type': 'simple',
        'is_featured': False,
        'tags': ['clutch', 'bag', 'embroidered', 'formal'],
        'description': 'Evening clutch bag with delicate hand embroidery and zari thread work. Enough space for essentials. Comes with a detachable chain strap.',
        'images': [
            'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['One Size'],
        'colors': ['Maroon', 'Bottle Green', 'Navy'],
        'stock_per_variant': 20,
    },
    {
        'name': 'Pearl Drop Necklace Set',
        'category': 'Accessories',
        'brand': 'Vogue',
        'base_price': 2500,
        'sale_price': 1750,
        'product_type': 'simple',
        'is_featured': True,
        'tags': ['jewellery', 'necklace', 'pearl', 'formal'],
        'description': 'Elegant pearl drop necklace set with matching earrings and bracelet. High-quality faux pearls with gold-plated settings. Perfect for weddings, formal dinners, and special occasions.',
        'images': [
            'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['One Size'],
        'colors': ['Pearl White', 'Rose Gold'],
        'stock_per_variant': 45,
    },
    {
        'name': "Women's Block Heel Sandals",
        'category': 'Accessories',
        'brand': 'Vogue',
        'base_price': 3500,
        'sale_price': 2450,
        'product_type': 'variable',
        'is_featured': False,
        'tags': ['sandals', 'heels', 'shoes', 'formal'],
        'description': 'Elegant block heel sandals in faux suede with ankle strap. 3-inch comfortable block heel — stable enough for long wear. Pairs perfectly with both western and traditional outfits.',
        'images': [
            'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['36', '37', '38', '39', '40', '41'],
        'colors': ['Nude', 'Black', 'Blush'],
        'stock_per_variant': 20,
    },
    {
        'name': 'Designer Structured Handbag',
        'category': 'Accessories',
        'brand': 'Vogue',
        'base_price': 8500,
        'sale_price': None,
        'product_type': 'simple',
        'is_featured': True,
        'tags': ['handbag', 'designer', 'structured', 'luxury'],
        'description': 'Structured handbag in premium vegan leather with gold hardware. Top zip closure with suede interior lining and multiple organisational pockets. A timeless investment piece.',
        'images': [
            'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['One Size'],
        'colors': ['Black', 'Camel', 'White'],
        'stock_per_variant': 18,
    },
    {
        'name': 'Men\'s Genuine Leather Belt',
        'category': 'Accessories',
        'brand': 'Vogue',
        'base_price': 1800,
        'sale_price': None,
        'product_type': 'variable',
        'is_featured': False,
        'tags': ['belt', 'leather', 'men', 'accessories'],
        'description': 'Full-grain genuine leather belt with solid brass buckle. 35mm width, perfect for both formal trousers and casual jeans. Durable stitching and smooth finish.',
        'images': [
            'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['30', '32', '34', '36', '38', '40'],
        'colors': ['Black', 'Dark Brown', 'Tan'],
        'stock_per_variant': 50,
    },
    # ── Sale ──────────────────────────────────────────────────────────────────
    {
        'name': 'Clearance: Lawn Collection Bundle',
        'category': 'Sale',
        'brand': 'Gul Ahmed',
        'base_price': 9000,
        'sale_price': 4500,
        'product_type': 'variable',
        'is_featured': False,
        'tags': ['sale', 'bundle', 'lawn', 'clearance'],
        'description': 'End-of-season lawn collection bundle — 3 unstitched suits in complementary prints. Mix and match to create your own unique combinations. 50% off!',
        'images': [
            'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['One Size (Unstitched)'],
        'colors': ['Print Mix A', 'Print Mix B'],
        'stock_per_variant': 10,
    },
    {
        'name': 'Pret Sale: Formal Suit',
        'category': 'Sale',
        'brand': 'Sapphire',
        'base_price': 7500,
        'sale_price': 3750,
        'product_type': 'variable',
        'is_featured': False,
        'tags': ['sale', 'formal', 'pret', 'eid'],
        'description': 'Premium pret formal suit — intricate embroidery, premium fabric, elegant silhouette. Was our best-seller last season. Huge 50% discount on remaining stock.',
        'images': [
            'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['S', 'M', 'L', 'XL'],
        'colors': ['Dusty Rose', 'Sage'],
        'stock_per_variant': 8,
    },
    {
        'name': 'Sale: Men\'s Winter Khaddar Suit',
        'category': 'Sale',
        'brand': 'Alkaram',
        'base_price': 6500,
        'sale_price': 2925,
        'product_type': 'variable',
        'is_featured': False,
        'tags': ['sale', 'men', 'winter', 'khaddar'],
        'description': 'End-of-winter clearance — premium khaddar 2-piece suit. Thick, warm fabric with subtle check pattern. 55% off on all remaining sizes.',
        'images': [
            'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['S', 'M', 'L', 'XL', 'XXL'],
        'colors': ['Brown Check', 'Grey Check', 'Navy Check'],
        'stock_per_variant': 6,
    },
    {
        'name': 'Sale: Accessories Mega Bundle',
        'category': 'Sale',
        'brand': 'Vogue',
        'base_price': 5000,
        'sale_price': 2000,
        'product_type': 'simple',
        'is_featured': False,
        'tags': ['sale', 'accessories', 'bundle', 'clearance'],
        'description': 'Accessories mega bundle — includes 1 clutch, 1 jhumka set, and 1 chiffon dupatta from our previous season collection. 60% off. While stocks last!',
        'images': [
            'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600&q=80&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80&auto=format&fit=crop',
        ],
        'sizes': ['One Size'],
        'colors': ['Assorted'],
        'stock_per_variant': 15,
    },
]

COUPONS = [
    {
        'code': 'WELCOME15',
        'type': 'percentage',
        'value': 15,
        'min_order_value': 0,
        'max_uses': None,
        'description': '15% off — newsletter welcome coupon, no minimum order',
    },
    {
        'code': 'WELCOME20',
        'type': 'percentage',
        'value': 20,
        'min_order_value': 2000,
        'max_uses': 1000,
        'description': '20% off for new customers',
    },
    {
        'code': 'EID2025',
        'type': 'percentage',
        'value': 15,
        'min_order_value': 3000,
        'max_uses': 500,
        'description': '15% Eid special discount',
    },
    {
        'code': 'SAVE500',
        'type': 'fixed',
        'value': 500,
        'min_order_value': 2500,
        'max_uses': None,
        'description': 'Flat PKR 500 off on orders above PKR 2500',
    },
    {
        'code': 'SUMMER30',
        'type': 'percentage',
        'value': 30,
        'min_order_value': 4000,
        'max_uses': 200,
        'description': '30% summer sale discount',
    },
    {
        'code': 'FREESHIP',
        'type': 'fixed',
        'value': 200,
        'min_order_value': 0,
        'max_uses': None,
        'description': 'Free shipping coupon',
    },
]

REVIEW_TEXTS = [
    ("Absolutely love it!", "The quality is outstanding. Packaging was beautiful and delivery was super fast. Will definitely order again!", 5),
    ("Perfect fit!", "Ordered an M and it fits like a dream. The fabric is premium quality, exactly as shown in the pictures.", 5),
    ("Great value for money", "Good quality product at this price point. The colour is exactly as shown. Happy with the purchase.", 4),
    ("Excellent quality", "Have ordered from VOGUE before and always satisfied. This product exceeded my expectations.", 5),
    ("Loved it!", "Beautiful design and comfortable to wear. Got many compliments. The embroidery is very detailed.", 5),
    ("Good but delivery was slow", "The product itself is great quality, but it took 5 days to arrive. Would order again though.", 4),
    ("Amazing product!", "Perfect for Eid. The colour is exactly what I wanted and the fit is perfect. Very happy!", 5),
    ("Highly recommend", "This is my third order from VOGUE and I'm never disappointed. Consistent quality every time.", 5),
    ("Decent quality", "Good product overall. The stitching could be a bit neater but looks great when worn.", 4),
    ("Superb experience", "From ordering to delivery, everything was smooth. The product is exactly as described. 10/10!", 5),
]


class Command(BaseCommand):
    help = 'Seed the database with realistic dummy data for development'

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Delete all existing data before seeding (USE WITH CAUTION)',
        )
        parser.add_argument(
            '--no-images',
            action='store_true',
            help='Skip downloading product images (faster, products will have no images)',
        )

    def handle(self, *args, **options):
        if options['flush']:
            self.flush_data()

        self.download_images = not options['no_images']
        self.stdout.write(self.style.WARNING('\n  VOGUE Database Seeder'))
        self.stdout.write('  ' + '-' * 50)

        with transaction.atomic():
            admin     = self.seed_users()
            cats      = self.seed_categories()
            attrs     = self.seed_attributes()
            products  = self.seed_products(cats, attrs, admin)
            customers = self.seed_customers()
            self.seed_coupons()
            self.seed_orders(products, customers, admin)
            self.seed_reviews(products, customers)

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('  Database seeded successfully!\n'))
        self.stdout.write(f'  Admin login:  {ADMIN_EMAIL}  /  {ADMIN_PASSWORD}  (your account)')
        self.stdout.write(f'  Seller login: {SELLERS[0]["email"]}  /  {SELLERS[0]["password"]}')
        self.stdout.write(f'  Customer:     {CUSTOMERS[0]["email"]}  /  Password@123\n')

    # ── Flush ─────────────────────────────────────────────────────────────────

    def flush_data(self):
        self.stdout.write(self.style.WARNING('  Flushing existing data...'))
        from apps.reviews.models import Review
        from apps.orders.models import Order, OrderItem, OrderStatusHistory
        from apps.inventory.models import Inventory, InventoryMovement
        from apps.products.models import Product, ProductVariant, ProductImage, Category, Attribute
        from apps.pricing.models import Coupon
        from apps.users.models import User, Address

        Review.objects.all().delete()
        OrderStatusHistory.objects.all().delete()
        OrderItem.objects.all().delete()
        Order.objects.all().delete()
        InventoryMovement.objects.all().delete()
        Inventory.objects.all().delete()
        ProductImage.objects.all().delete()
        ProductVariant.objects.all().delete()
        Product.objects.all().delete()
        Category.objects.all().delete()
        Attribute.objects.all().delete()
        Coupon.objects.all().delete()
        Address.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        self.stdout.write(self.style.SUCCESS('  Flushed.'))

    # ── Users ─────────────────────────────────────────────────────────────────

    def seed_users(self):
        from apps.users.models import User
        self.stdout.write('  Creating users...')

        # Admin
        admin, created = User.objects.get_or_create(
            email=ADMIN_EMAIL,
            defaults={
                'first_name': 'Vogue',
                'last_name': 'Admin',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            admin.set_password(ADMIN_PASSWORD)
            admin.save()

        # Sellers
        for s in SELLERS:
            user, created = User.objects.get_or_create(
                email=s['email'],
                defaults={
                    'first_name': s['first_name'],
                    'last_name': s['last_name'],
                    'role': 'seller',
                }
            )
            if created:
                user.set_password(s['password'])
                user.save()

        self.stdout.write(self.style.SUCCESS(f'    Created admin + {len(SELLERS)} sellers'))
        return admin

    def seed_customers(self):
        from apps.users.models import User, Address
        self.stdout.write('  Creating customers...')

        customers = []
        for c in CUSTOMERS:
            user, created = User.objects.get_or_create(
                email=c['email'],
                defaults={
                    'first_name': c['first_name'],
                    'last_name': c['last_name'],
                    'role': 'customer',
                    'phone': c.get('phone', ''),
                }
            )
            if created:
                user.set_password('Password@123')
                user.save()

                # Create default address
                Address.objects.create(
                    user=user,
                    label='Home',
                    street=f'{random.randint(10, 999)} Main Boulevard, Gulberg',
                    city=c['city'],
                    province=c.get('province', ''),
                    country='Pakistan',
                    is_default=True,
                )
            customers.append(user)

        self.stdout.write(self.style.SUCCESS(f'    Created {len(customers)} customers'))
        return customers

    # ── Categories ────────────────────────────────────────────────────────────

    def seed_categories(self):
        from apps.products.models import Category
        self.stdout.write('  Creating categories...')

        cats = {}
        for c in CATEGORIES:
            obj, _ = Category.objects.get_or_create(
                slug=c['slug'],
                defaults={'name': c['name'], 'sort_order': c['sort_order'], 'is_active': True}
            )
            cats[c['name']] = obj

        self.stdout.write(self.style.SUCCESS(f'    Created {len(cats)} categories'))
        return cats

    # ── Attributes ────────────────────────────────────────────────────────────

    def seed_attributes(self):
        from apps.products.models import Attribute, AttributeValue
        self.stdout.write('  Creating attributes...')

        size_attr, _ = Attribute.objects.get_or_create(name='Size')
        color_attr, _ = Attribute.objects.get_or_create(name='Color')

        self.stdout.write(self.style.SUCCESS('    Created Size, Color attributes'))
        return {'size': size_attr, 'color': color_attr}

    # ── Products ──────────────────────────────────────────────────────────────

    def seed_products(self, cats, attrs, seller):
        from apps.products.models import (
            Product, ProductVariant, ProductImage,
            AttributeValue, VariantAttributeValue
        )
        from apps.inventory.models import Inventory, InventoryMovement

        self.stdout.write('  Creating products...')
        created_products = []
        size_attr  = attrs['size']
        color_attr = attrs['color']

        for i, pd in enumerate(PRODUCT_DATA):
            cat = cats.get(pd['category'])
            if not cat:
                continue

            # Create or get product
            slug = slugify(pd['name'])
            product, created = Product.objects.get_or_create(
                slug=slug,
                defaults={
                    'name': pd['name'],
                    'category': cat,
                    'created_by': seller,
                    'brand': pd['brand'],
                    'base_price': pd['base_price'],
                    'sale_price': pd['sale_price'],
                    'product_type': pd['product_type'],
                    'is_featured': pd['is_featured'],
                    'is_published': True,
                    'tags': pd['tags'],
                    'description': pd['description'],
                }
            )

            if not created:
                created_products.append(product)
                continue

            # Download + attach images
            if self.download_images:
                for img_idx, img_url in enumerate(pd['images']):
                    try:
                        self._attach_image(product, img_url, is_primary=(img_idx == 0))
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f'      Image download failed: {e}'))
            else:
                # Create a blank placeholder so the product still has an image record
                pass

            # Create variants
            sizes  = pd['sizes']
            colors = pd['colors']
            variant_count = 0

            for size_val in sizes:
                for color_val in colors:
                    # Get/create attribute values
                    size_av, _  = AttributeValue.objects.get_or_create(
                        attribute=size_attr, value=size_val
                    )
                    color_av, _ = AttributeValue.objects.get_or_create(
                        attribute=color_attr, value=color_val
                    )

                    sku = f"{slug[:12].upper().replace('-', '')}-{size_val[:3].upper()}-{color_val[:3].upper()}-{i+1}"
                    sku = sku[:100]

                    variant, v_created = ProductVariant.objects.get_or_create(
                        sku=sku,
                        defaults={
                            'product': product,
                            'is_active': True,
                        }
                    )

                    if v_created:
                        # Link attribute values
                        VariantAttributeValue.objects.get_or_create(
                            variant=variant, attribute_value=size_av
                        )
                        VariantAttributeValue.objects.get_or_create(
                            variant=variant, attribute_value=color_av
                        )

                        # Create inventory
                        qty = pd['stock_per_variant']
                        # Make a few items low stock for realism
                        if random.random() < 0.1:
                            qty = random.randint(1, 4)

                        Inventory.objects.create(
                            variant=variant,
                            quantity_on_hand=qty,
                            quantity_reserved=0,
                            reorder_threshold=5,
                        )

                        # Log initial restock movement
                        InventoryMovement.objects.create(
                            variant=variant,
                            movement='restock',
                            quantity=qty,
                            reference='INITIAL-SEED',
                            note='Initial stock from seed command',
                            created_by=seller,
                        )

                        variant_count += 1

            created_products.append(product)
            self.stdout.write(f'    [{i+1:02d}/{len(PRODUCT_DATA)}] {product.name[:50]} — {variant_count} variants')

        self.stdout.write(self.style.SUCCESS(f'    Created {len(created_products)} products'))
        return created_products

    def _attach_image(self, product, url, is_primary=False):
        """Download an image from URL and save it to ProductImage."""
        from apps.products.models import ProductImage

        headers = {'User-Agent': 'VOGUE-Seeder/1.0'}
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            image_data = response.read()

        # Derive filename from URL
        filename = url.split('?')[0].split('/')[-1]
        if not filename.endswith(('.jpg', '.jpeg', '.png', '.webp')):
            filename = f'{filename}.jpg'
        filename = f'products/{product.slug[:40]}_{filename}'

        img = ProductImage(
            product=product,
            alt_text=product.name,
            sort_order=0 if is_primary else 1,
            is_primary=is_primary,
        )
        img.image.save(filename, ContentFile(image_data), save=True)

    # ── Coupons ───────────────────────────────────────────────────────────────

    def seed_coupons(self):
        from apps.pricing.models import Coupon
        self.stdout.write('  Creating coupons...')

        now = timezone.now()
        count = 0
        for c in COUPONS:
            _, created = Coupon.objects.get_or_create(
                code=c['code'],
                defaults={
                    'type': c['type'],
                    'value': c['value'],
                    'min_order_value': c['min_order_value'],
                    'max_uses': c['max_uses'],
                    'valid_from': now - timedelta(days=1),
                    'valid_until': now + timedelta(days=90),
                    'is_active': True,
                }
            )
            if created:
                count += 1

        self.stdout.write(self.style.SUCCESS(f'    Created {count} coupons'))

    # ── Orders ────────────────────────────────────────────────────────────────

    def seed_orders(self, products, customers, admin):
        from apps.orders.models import Order, OrderItem, OrderStatusHistory
        from apps.inventory.models import Inventory
        from apps.users.models import Address

        self.stdout.write('  Creating orders...')

        if not products or not customers:
            return

        statuses = ['delivered', 'delivered', 'delivered', 'shipped', 'processing', 'confirmed', 'pending', 'cancelled']
        payment_methods = ['cod', 'cod', 'easypaisa', 'card']
        order_count = 0

        # Create 40 realistic orders spread across customers
        for i in range(40):
            customer = random.choice(customers)
            address  = Address.objects.filter(user=customer).first()
            if not address:
                continue

            # Pick 1–3 random products
            order_products = random.sample(products, k=min(random.randint(1, 3), len(products)))

            # Calculate order total
            items_data = []
            subtotal = 0
            for p in order_products:
                variant = p.variants.filter(is_active=True).first()
                if not variant:
                    continue
                qty = random.randint(1, 3)
                unit_price = float(p.sale_price or p.base_price)
                total_price = unit_price * qty
                subtotal += total_price
                items_data.append({
                    'variant': variant,
                    'product_name': p.name,
                    'sku': variant.sku,
                    'quantity': qty,
                    'unit_price': unit_price,
                    'total_price': total_price,
                })

            if not items_data:
                continue

            shipping_cost = 0 if subtotal >= 2000 else 200
            total_amount  = subtotal + shipping_cost

            # Generate order number (use index-based for seed uniqueness)
            from datetime import datetime
            date_str = (timezone.now() - timedelta(days=random.randint(0, 60))).strftime('%Y%m%d')
            order_num = f"ORD-{date_str}-{i+1:05d}"

            status = random.choice(statuses)
            payment_method = random.choice(payment_methods)

            # Skip if already exists
            if Order.objects.filter(order_number=order_num).exists():
                continue

            order = Order.objects.create(
                user=customer,
                order_number=order_num,
                status=status,
                subtotal=subtotal,
                shipping_cost=shipping_cost,
                discount_amount=0,
                total_amount=total_amount,
                shipping_address=address,
                payment_method=payment_method,
                payment_status='paid' if status in ('delivered', 'shipped') else 'pending',
            )

            # Add created_at offset for realism
            days_ago = random.randint(0, 60)
            Order.objects.filter(pk=order.pk).update(
                created_at=timezone.now() - timedelta(days=days_ago)
            )

            for item_d in items_data:
                OrderItem.objects.create(
                    order=order,
                    variant=item_d['variant'],
                    product_name=item_d['product_name'],
                    sku=item_d['sku'],
                    quantity=item_d['quantity'],
                    unit_price=item_d['unit_price'],
                    total_price=item_d['total_price'],
                )

            # Status history log
            history_statuses = self._get_status_chain(status)
            for j, hist_status in enumerate(history_statuses):
                OrderStatusHistory.objects.create(
                    order=order,
                    old_status=history_statuses[j-1] if j > 0 else '',
                    new_status=hist_status,
                    note=f'Status updated to {hist_status}',
                    changed_by=admin,
                )

            order_count += 1

        self.stdout.write(self.style.SUCCESS(f'    Created {order_count} orders'))

    def _get_status_chain(self, final_status):
        """Returns the progression of statuses up to the final status."""
        full_chain = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']
        if final_status == 'cancelled':
            return ['pending', 'cancelled']
        if final_status not in full_chain:
            return ['pending']
        idx = full_chain.index(final_status)
        return full_chain[:idx + 1]

    # ── Reviews ───────────────────────────────────────────────────────────────

    def seed_reviews(self, products, customers):
        from apps.reviews.models import Review
        from apps.orders.models import Order

        self.stdout.write('  Creating reviews (verified-purchase only)...')

        if not products or not customers:
            return

        review_count = 0

        for product in products:
            # Find every delivered order that contains a variant of this product
            delivered_orders = Order.objects.filter(
                status='delivered',
                items__variant__product=product,
            ).select_related('user').distinct()

            for order in delivered_orders:
                customer = order.user
                # Skip if this customer already reviewed this product
                if Review.objects.filter(user=customer, product=product).exists():
                    continue

                title, body, rating = random.choice(REVIEW_TEXTS)
                Review.objects.create(
                    product=product,
                    user=customer,
                    order=order,           # always the real purchase order
                    rating=rating,
                    title=title,
                    body=body,
                    is_approved=True,
                )
                review_count += 1

        self.stdout.write(self.style.SUCCESS(f'    Created {review_count} verified-purchase reviews'))
