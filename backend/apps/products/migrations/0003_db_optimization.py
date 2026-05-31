"""
Migration: 0003_db_optimization

Production-readiness pass — adds everything a real e-commerce DB needs:

  1. Missing composite & covering indexes (query performance)
  2. Full-text search index on products(name, description, brand)
  3. UNIQUE DB constraint on orders.order_number
  4. Database triggers:
       - trg_cart_add_reserve    : increment quantity_reserved when cart item added
       - trg_cart_update_reserve : adjust quantity_reserved when cart qty changes
       - trg_cart_delete_release : release quantity_reserved when cart item removed
       - trg_order_cancel_restock: restore quantity_on_hand when order cancelled
       - trg_review_rating_sync  : keep product average_rating/review_count in sync
  5. Database views:
       - v_low_stock             : variants below reorder threshold
       - v_order_summary         : per-order totals with customer info
       - v_product_catalog       : products with primary image + stock roll-up
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0002_initial'),
        ('reviews', '0002_initial'),
    ]

    operations = [

        # ── 1. INDEXES ────────────────────────────────────────────────────────

        migrations.RunSQL(
            sql="ALTER TABLE products ADD INDEX idx_products_sale_price (sale_price);",
            reverse_sql="ALTER TABLE products DROP INDEX idx_products_sale_price;",
        ),
        migrations.RunSQL(
            sql="ALTER TABLE products ADD INDEX idx_products_brand (brand(64));",
            reverse_sql="ALTER TABLE products DROP INDEX idx_products_brand;",
        ),
        migrations.RunSQL(
            sql="ALTER TABLE products ADD INDEX idx_products_rating_published (average_rating DESC, is_published);",
            reverse_sql="ALTER TABLE products DROP INDEX idx_products_rating_published;",
        ),
        migrations.RunSQL(
            sql="ALTER TABLE reviews ADD INDEX idx_reviews_product_approved (product_id, is_approved, created_at DESC);",
            reverse_sql="ALTER TABLE reviews DROP INDEX idx_reviews_product_approved;",
        ),
        migrations.RunSQL(
            sql="ALTER TABLE reviews ADD INDEX idx_reviews_user_product (user_id, product_id);",
            reverse_sql="ALTER TABLE reviews DROP INDEX idx_reviews_user_product;",
        ),
        migrations.RunSQL(
            sql="ALTER TABLE orders ADD INDEX idx_orders_payment_status (payment_status);",
            reverse_sql="ALTER TABLE orders DROP INDEX idx_orders_payment_status;",
        ),
        migrations.RunSQL(
            sql="ALTER TABLE coupons ADD INDEX idx_coupons_active_validity (is_active, valid_from, valid_until);",
            reverse_sql="ALTER TABLE coupons DROP INDEX idx_coupons_active_validity;",
        ),
        migrations.RunSQL(
            sql="ALTER TABLE inventory ADD INDEX idx_inventory_stock (quantity_on_hand, reorder_threshold);",
            reverse_sql="ALTER TABLE inventory DROP INDEX idx_inventory_stock;",
        ),
        migrations.RunSQL(
            sql="ALTER TABLE order_items ADD INDEX idx_order_items_variant_order (variant_id, order_id);",
            reverse_sql="ALTER TABLE order_items DROP INDEX idx_order_items_variant_order;",
        ),
        migrations.RunSQL(
            sql="ALTER TABLE product_variants ADD INDEX idx_variants_product_active (product_id, is_active);",
            reverse_sql="ALTER TABLE product_variants DROP INDEX idx_variants_product_active;",
        ),
        migrations.RunSQL(
            sql="ALTER TABLE addresses ADD INDEX idx_addresses_user_default (user_id, is_default);",
            reverse_sql="ALTER TABLE addresses DROP INDEX idx_addresses_user_default;",
        ),
        migrations.RunSQL(
            sql="ALTER TABLE notifications ADD INDEX idx_notifications_user_created (user_id, created_at DESC);",
            reverse_sql="ALTER TABLE notifications DROP INDEX idx_notifications_user_created;",
        ),

        # ── 2. FULL-TEXT SEARCH ───────────────────────────────────────────────
        migrations.RunSQL(
            sql="ALTER TABLE products ADD FULLTEXT INDEX ft_products_search (name, description, brand);",
            reverse_sql="ALTER TABLE products DROP INDEX ft_products_search;",
        ),

        # ── 3. UNIQUE DB CONSTRAINT on order_number ───────────────────────────
        migrations.RunSQL(
            sql="ALTER TABLE orders ADD UNIQUE INDEX uq_order_number (order_number);",
            reverse_sql="ALTER TABLE orders DROP INDEX uq_order_number;",
        ),

        # ── 4. TRIGGERS ───────────────────────────────────────────────────────

        # Reserve stock when a cart item is created
        migrations.RunSQL(
            sql="""
            CREATE TRIGGER trg_cart_add_reserve
            AFTER INSERT ON cart_items
            FOR EACH ROW
            BEGIN
                UPDATE inventory
                SET quantity_reserved = GREATEST(0, quantity_reserved + NEW.quantity)
                WHERE variant_id = NEW.variant_id;
            END
            """,
            reverse_sql="DROP TRIGGER IF EXISTS trg_cart_add_reserve;",
        ),

        # Adjust reservation when cart quantity changes
        migrations.RunSQL(
            sql="""
            CREATE TRIGGER trg_cart_update_reserve
            AFTER UPDATE ON cart_items
            FOR EACH ROW
            BEGIN
                IF NEW.quantity != OLD.quantity THEN
                    UPDATE inventory
                    SET quantity_reserved = GREATEST(0, quantity_reserved + (NEW.quantity - OLD.quantity))
                    WHERE variant_id = NEW.variant_id;
                END IF;
            END
            """,
            reverse_sql="DROP TRIGGER IF EXISTS trg_cart_update_reserve;",
        ),

        # Release reservation when a cart item is removed
        migrations.RunSQL(
            sql="""
            CREATE TRIGGER trg_cart_delete_release
            AFTER DELETE ON cart_items
            FOR EACH ROW
            BEGIN
                UPDATE inventory
                SET quantity_reserved = GREATEST(0, quantity_reserved - OLD.quantity)
                WHERE variant_id = OLD.variant_id;
            END
            """,
            reverse_sql="DROP TRIGGER IF EXISTS trg_cart_delete_release;",
        ),

        # Restore on_hand when order is cancelled
        migrations.RunSQL(
            sql="""
            CREATE TRIGGER trg_order_cancel_restock
            AFTER UPDATE ON orders
            FOR EACH ROW
            BEGIN
                IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
                    UPDATE inventory i
                    JOIN order_items oi ON oi.variant_id = i.variant_id
                    SET i.quantity_on_hand = i.quantity_on_hand + oi.quantity
                    WHERE oi.order_id = NEW.id;
                END IF;
            END
            """,
            reverse_sql="DROP TRIGGER IF EXISTS trg_order_cancel_restock;",
        ),

        # Keep product rating + review_count in sync at DB level
        # (backup to the Python observer — ensures consistency even if Python fails)
        migrations.RunSQL(
            sql="""
            CREATE TRIGGER trg_review_rating_sync
            AFTER INSERT ON reviews
            FOR EACH ROW
            BEGIN
                IF NEW.is_approved = TRUE THEN
                    UPDATE products
                    SET
                        review_count   = (SELECT COUNT(*) FROM reviews WHERE product_id = NEW.product_id AND is_approved = TRUE),
                        average_rating = (SELECT IFNULL(AVG(rating), 0) FROM reviews WHERE product_id = NEW.product_id AND is_approved = TRUE)
                    WHERE id = NEW.product_id;
                END IF;
            END
            """,
            reverse_sql="DROP TRIGGER IF EXISTS trg_review_rating_sync;",
        ),

        migrations.RunSQL(
            sql="""
            CREATE TRIGGER trg_review_rating_sync_delete
            AFTER DELETE ON reviews
            FOR EACH ROW
            BEGIN
                UPDATE products
                SET
                    review_count   = (SELECT COUNT(*) FROM reviews WHERE product_id = OLD.product_id AND is_approved = TRUE),
                    average_rating = (SELECT IFNULL(AVG(rating), 0) FROM reviews WHERE product_id = OLD.product_id AND is_approved = TRUE)
                WHERE id = OLD.product_id;
            END
            """,
            reverse_sql="DROP TRIGGER IF EXISTS trg_review_rating_sync_delete;",
        ),

        # ── 5. VIEWS ─────────────────────────────────────────────────────────

        # Low-stock dashboard
        migrations.RunSQL(
            sql="""
            CREATE VIEW v_low_stock AS
            SELECT
                pv.id            AS variant_id,
                pv.sku,
                p.id             AS product_id,
                p.name           AS product_name,
                p.brand,
                i.quantity_on_hand,
                i.quantity_reserved,
                (i.quantity_on_hand - i.quantity_reserved) AS available,
                i.reorder_threshold
            FROM inventory i
            JOIN product_variants pv ON pv.id = i.variant_id
            JOIN products p          ON p.id  = pv.product_id
            WHERE (i.quantity_on_hand - i.quantity_reserved) <= i.reorder_threshold
              AND p.is_published = TRUE
              AND pv.is_active   = TRUE
            ORDER BY available ASC;
            """,
            reverse_sql="DROP VIEW IF EXISTS v_low_stock;",
        ),

        # Order summary for admin reporting
        migrations.RunSQL(
            sql="""
            CREATE VIEW v_order_summary AS
            SELECT
                o.id             AS order_id,
                o.order_number,
                o.status,
                o.payment_status,
                o.payment_method,
                o.subtotal,
                o.discount_amount,
                o.shipping_cost,
                o.total_amount,
                o.created_at,
                u.email          AS customer_email,
                CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
                COUNT(oi.id)     AS item_count,
                SUM(oi.quantity) AS total_units
            FROM orders o
            JOIN users u      ON u.id = o.user_id
            JOIN order_items oi ON oi.order_id = o.id
            GROUP BY o.id, o.order_number, o.status, o.payment_status,
                     o.payment_method, o.subtotal, o.discount_amount,
                     o.shipping_cost, o.total_amount, o.created_at,
                     u.email, customer_name;
            """,
            reverse_sql="DROP VIEW IF EXISTS v_order_summary;",
        ),

        # Product catalog with stock roll-up
        migrations.RunSQL(
            sql="""
            CREATE VIEW v_product_catalog AS
            SELECT
                p.id,
                p.name,
                p.slug,
                p.brand,
                p.base_price,
                p.sale_price,
                p.average_rating,
                p.review_count,
                p.is_featured,
                p.is_published,
                c.name           AS category_name,
                c.slug           AS category_slug,
                COUNT(DISTINCT pv.id)                              AS variant_count,
                SUM(GREATEST(0, i.quantity_on_hand - i.quantity_reserved)) AS total_stock,
                (SELECT img.image FROM product_images img
                 WHERE img.product_id = p.id AND img.is_primary = TRUE
                 LIMIT 1)                                          AS primary_image
            FROM products p
            JOIN categories c      ON c.id = p.category_id
            LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active = TRUE
            LEFT JOIN inventory i         ON i.variant_id = pv.id
            WHERE p.is_published = TRUE
            GROUP BY p.id, p.name, p.slug, p.brand, p.base_price, p.sale_price,
                     p.average_rating, p.review_count, p.is_featured, p.is_published,
                     c.name, c.slug;
            """,
            reverse_sql="DROP VIEW IF EXISTS v_product_catalog;",
        ),
    ]
