from django.db import migrations


def add_indexes(apps, schema_editor):
    """Add indexes safely — skips any that already exist."""
    statements = [
        "ALTER TABLE products ADD INDEX idx_products_sale_price (sale_price);",
        "ALTER TABLE products ADD INDEX idx_products_brand (brand(64));",
        "ALTER TABLE products ADD INDEX idx_products_rating_published (average_rating DESC, is_published);",
        "ALTER TABLE reviews ADD INDEX idx_reviews_product_approved (product_id, is_approved, created_at DESC);",
        "ALTER TABLE reviews ADD INDEX idx_reviews_user_product (user_id, product_id);",
        "ALTER TABLE orders ADD INDEX idx_orders_payment_status (payment_status);",
        "ALTER TABLE coupons ADD INDEX idx_coupons_active_validity (is_active, valid_from, valid_until);",
        "ALTER TABLE inventory ADD INDEX idx_inventory_stock (quantity_on_hand, reorder_threshold);",
        "ALTER TABLE order_items ADD INDEX idx_order_items_variant_order (variant_id, order_id);",
        "ALTER TABLE product_variants ADD INDEX idx_variants_product_active (product_id, is_active);",
        "ALTER TABLE addresses ADD INDEX idx_addresses_user_default (user_id, is_default);",
        "ALTER TABLE notifications ADD INDEX idx_notifications_user_created (user_id, created_at DESC);",
        "ALTER TABLE products ADD FULLTEXT INDEX ft_products_search (name, description, brand);",
        "ALTER TABLE orders ADD UNIQUE INDEX uq_order_number (order_number);",
    ]
    for sql in statements:
        try:
            schema_editor.execute(sql)
        except Exception:
            pass  # Index already exists — safe to skip


def drop_indexes(apps, schema_editor):
    for sql in [
        "ALTER TABLE products DROP INDEX IF EXISTS idx_products_sale_price;",
        "ALTER TABLE products DROP INDEX IF EXISTS idx_products_brand;",
        "ALTER TABLE products DROP INDEX IF EXISTS idx_products_rating_published;",
        "ALTER TABLE reviews DROP INDEX IF EXISTS idx_reviews_product_approved;",
        "ALTER TABLE reviews DROP INDEX IF EXISTS idx_reviews_user_product;",
        "ALTER TABLE orders DROP INDEX IF EXISTS idx_orders_payment_status;",
        "ALTER TABLE coupons DROP INDEX IF EXISTS idx_coupons_active_validity;",
        "ALTER TABLE inventory DROP INDEX IF EXISTS idx_inventory_stock;",
        "ALTER TABLE order_items DROP INDEX IF EXISTS idx_order_items_variant_order;",
        "ALTER TABLE product_variants DROP INDEX IF EXISTS idx_variants_product_active;",
        "ALTER TABLE addresses DROP INDEX IF EXISTS idx_addresses_user_default;",
        "ALTER TABLE notifications DROP INDEX IF EXISTS idx_notifications_user_created;",
        "ALTER TABLE products DROP INDEX IF EXISTS ft_products_search;",
        "ALTER TABLE orders DROP INDEX IF EXISTS uq_order_number;",
    ]:
        try:
            schema_editor.execute(sql)
        except Exception:
            pass


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0002_initial'),
        ('reviews', '0002_initial'),
    ]

    operations = [

        # ── Indexes (safe — skips duplicates) ─────────────────────────────────
        migrations.RunPython(add_indexes, reverse_code=drop_indexes),

        # ── Triggers ──────────────────────────────────────────────────────────
        migrations.RunSQL(
            sql="DROP TRIGGER IF EXISTS trg_cart_add_reserve;",
            reverse_sql="DROP TRIGGER IF EXISTS trg_cart_add_reserve;",
        ),
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
        migrations.RunSQL(
            sql="DROP TRIGGER IF EXISTS trg_cart_update_reserve;",
            reverse_sql="DROP TRIGGER IF EXISTS trg_cart_update_reserve;",
        ),
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
        migrations.RunSQL(
            sql="DROP TRIGGER IF EXISTS trg_cart_delete_release;",
            reverse_sql="DROP TRIGGER IF EXISTS trg_cart_delete_release;",
        ),
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
        migrations.RunSQL(
            sql="DROP TRIGGER IF EXISTS trg_order_cancel_restock;",
            reverse_sql="DROP TRIGGER IF EXISTS trg_order_cancel_restock;",
        ),
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
        migrations.RunSQL(
            sql="DROP TRIGGER IF EXISTS trg_review_rating_sync;",
            reverse_sql="DROP TRIGGER IF EXISTS trg_review_rating_sync;",
        ),
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
            sql="DROP TRIGGER IF EXISTS trg_review_rating_sync_delete;",
            reverse_sql="DROP TRIGGER IF EXISTS trg_review_rating_sync_delete;",
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

        # ── Views ─────────────────────────────────────────────────────────────
        migrations.RunSQL(
            sql="DROP VIEW IF EXISTS v_low_stock;",
            reverse_sql="DROP VIEW IF EXISTS v_low_stock;",
        ),
        migrations.RunSQL(
            sql="""
            CREATE VIEW v_low_stock AS
            SELECT
                pv.id AS variant_id, pv.sku,
                p.id AS product_id, p.name AS product_name, p.brand,
                i.quantity_on_hand, i.quantity_reserved,
                (i.quantity_on_hand - i.quantity_reserved) AS available,
                i.reorder_threshold
            FROM inventory i
            JOIN product_variants pv ON pv.id = i.variant_id
            JOIN products p ON p.id = pv.product_id
            WHERE (i.quantity_on_hand - i.quantity_reserved) <= i.reorder_threshold
              AND p.is_published = TRUE AND pv.is_active = TRUE
            ORDER BY available ASC;
            """,
            reverse_sql="DROP VIEW IF EXISTS v_low_stock;",
        ),
        migrations.RunSQL(
            sql="DROP VIEW IF EXISTS v_order_summary;",
            reverse_sql="DROP VIEW IF EXISTS v_order_summary;",
        ),
        migrations.RunSQL(
            sql="""
            CREATE VIEW v_order_summary AS
            SELECT
                o.id AS order_id, o.order_number, o.status, o.payment_status,
                o.payment_method, o.subtotal, o.discount_amount, o.shipping_cost,
                o.total_amount, o.created_at,
                u.email AS customer_email,
                CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
                COUNT(oi.id) AS item_count,
                SUM(oi.quantity) AS total_units
            FROM orders o
            JOIN users u ON u.id = o.user_id
            JOIN order_items oi ON oi.order_id = o.id
            GROUP BY o.id, o.order_number, o.status, o.payment_status,
                     o.payment_method, o.subtotal, o.discount_amount,
                     o.shipping_cost, o.total_amount, o.created_at,
                     u.email, customer_name;
            """,
            reverse_sql="DROP VIEW IF EXISTS v_order_summary;",
        ),
        migrations.RunSQL(
            sql="DROP VIEW IF EXISTS v_product_catalog;",
            reverse_sql="DROP VIEW IF EXISTS v_product_catalog;",
        ),
        migrations.RunSQL(
            sql="""
            CREATE VIEW v_product_catalog AS
            SELECT
                p.id, p.name, p.slug, p.brand, p.base_price, p.sale_price,
                p.average_rating, p.review_count, p.is_featured, p.is_published,
                c.name AS category_name, c.slug AS category_slug,
                COUNT(DISTINCT pv.id) AS variant_count,
                SUM(GREATEST(0, i.quantity_on_hand - i.quantity_reserved)) AS total_stock,
                (SELECT img.image FROM product_images img
                 WHERE img.product_id = p.id AND img.is_primary = TRUE LIMIT 1) AS primary_image
            FROM products p
            JOIN categories c ON c.id = p.category_id
            LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active = TRUE
            LEFT JOIN inventory i ON i.variant_id = pv.id
            WHERE p.is_published = TRUE
            GROUP BY p.id, p.name, p.slug, p.brand, p.base_price, p.sale_price,
                     p.average_rating, p.review_count, p.is_featured, p.is_published,
                     c.name, c.slug;
            """,
            reverse_sql="DROP VIEW IF EXISTS v_product_catalog;",
        ),
    ]
