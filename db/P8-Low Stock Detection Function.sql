-- FUNCTION 1: Low Stock Detection
CREATE OR REPLACE FUNCTION get_low_stock_products()
RETURNS TABLE(
    product_id INT,
    product_name VARCHAR,
    warehouse_name VARCHAR,
    warehouse_id INT,
    stock_remaining INT,
    min_stock_level INT,
    stock_deficit INT,
    deficit_percentage NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.product_id,
        p.product_name,
        w.warehouse_name,
        w.warehouse_id,
        i.stock_remaining,
        i.min_stock_level,
        (i.min_stock_level - i.stock_remaining)::INT AS stock_deficit,
        ROUND(
            ((i.min_stock_level - i.stock_remaining)::NUMERIC / NULLIF(i.min_stock_level, 0) * 100),
            2
        ) AS deficit_percentage
    FROM inventory i
    JOIN products p ON p.product_id = i.product_id
    JOIN warehouses w ON w.warehouse_id = i.warehouse_id
    WHERE i.stock_remaining <= i.min_stock_level
    ORDER BY deficit_percentage DESC, stock_deficit DESC;
END;
$$;

-- Test
SELECT * FROM get_low_stock_products();