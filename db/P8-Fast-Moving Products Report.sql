-- FUNCTION 2: Fast Moving Products
CREATE OR REPLACE FUNCTION get_fast_moving_products(p_days INT DEFAULT 7, p_min_units INT DEFAULT 30)
RETURNS TABLE(
    product_id INT,
    product_name VARCHAR,
    category_name VARCHAR,
    units_sold BIGINT,
    days_analyzed INT,
    avg_daily_sales NUMERIC,
    velocity_rating VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.product_id,
        p.product_name,
        c.category_name,
        SUM(oi.quantity) AS units_sold,
        p_days AS days_analyzed,
        ROUND(SUM(oi.quantity)::NUMERIC / p_days, 2) AS avg_daily_sales,
        CASE 
            WHEN SUM(oi.quantity) >= p_min_units * 3 THEN 'Very High'::VARCHAR
            WHEN SUM(oi.quantity) >= p_min_units * 2 THEN 'High'::VARCHAR
            WHEN SUM(oi.quantity) >= p_min_units THEN 'Medium'::VARCHAR
            ELSE 'Low'::VARCHAR
        END AS velocity_rating
    FROM order_items oi
    JOIN products p ON p.product_id = oi.product_id
    JOIN categories c ON c.category_id = p.category_id
    JOIN orders o ON o.order_id = oi.order_id
    WHERE o.order_date >= DATE '2025-12-31' - (p_days || ' days')::INTERVAL
        AND o.order_status NOT IN ('Cancelled', 'Refunded')
    GROUP BY p.product_id, p.product_name, c.category_name
    HAVING SUM(oi.quantity) >= p_min_units
    ORDER BY units_sold DESC;
END;
$$;

-- Test
SELECT * FROM get_fast_moving_products(7, 30);
-- SELECT * FROM get_fast_moving_products(30, 50); -- Last 30 days, min 50 units