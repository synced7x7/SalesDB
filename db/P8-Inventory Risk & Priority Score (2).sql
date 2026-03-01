-- FUNCTION 5: Inventory Intelligence Score
CREATE OR REPLACE FUNCTION get_inventory_intelligence_score(p_days INT DEFAULT 30, p_high_velocity_threshold INT DEFAULT 30)
RETURNS TABLE(
    product_id INT,
    product_name VARCHAR,
    category_name VARCHAR,
    stock_remaining INT,
    min_stock_level INT,
    last_30d_sales BIGINT,
    days_of_stock_remaining NUMERIC,
    inventory_risk VARCHAR,
    recommended_action VARCHAR,
    priority_score INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH sales_data AS (
        SELECT
            oi.product_id,
            SUM(oi.quantity) AS units_sold
        FROM order_items oi
        JOIN orders o ON o.order_id = oi.order_id
        WHERE o.order_date >= DATE '2025-12-31' - (p_days || ' days')::INTERVAL
            AND o.order_status NOT IN ('Cancelled', 'Refunded')
        GROUP BY oi.product_id
    )
    SELECT
        p.product_id,
        p.product_name,
        c.category_name,
        i.stock_remaining,
        i.min_stock_level,
        COALESCE(sales.units_sold, 0) AS last_30d_sales,
        CASE 
            WHEN COALESCE(sales.units_sold, 0) > 0 
            THEN ROUND((i.stock_remaining::NUMERIC / (sales.units_sold::NUMERIC / p_days)), 1)
            ELSE 999.9
        END AS days_of_stock_remaining,
        CASE
            WHEN i.stock_remaining <= i.min_stock_level AND COALESCE(sales.units_sold, 0) > p_high_velocity_threshold 
                THEN 'CRITICAL'::VARCHAR
            WHEN i.stock_remaining <= i.min_stock_level 
                THEN 'HIGH'::VARCHAR
            WHEN COALESCE(sales.units_sold, 0) > p_high_velocity_threshold 
                THEN 'MEDIUM'::VARCHAR
            WHEN i.stock_remaining > i.min_stock_level * 3 AND COALESCE(sales.units_sold, 0) < 10
                THEN 'OVERSTOCKED'::VARCHAR
            ELSE 'LOW'::VARCHAR
        END AS inventory_risk,
        CASE
            WHEN i.stock_remaining <= i.min_stock_level AND COALESCE(sales.units_sold, 0) > p_high_velocity_threshold 
                THEN 'URGENT: Restock immediately - high demand product'::VARCHAR
            WHEN i.stock_remaining <= i.min_stock_level 
                THEN 'Restock needed'::VARCHAR
            WHEN COALESCE(sales.units_sold, 0) > p_high_velocity_threshold 
                THEN 'Monitor closely - high velocity'::VARCHAR
            WHEN i.stock_remaining > i.min_stock_level * 3 AND COALESCE(sales.units_sold, 0) < 10
                THEN 'Consider reducing stock - low demand'::VARCHAR
            ELSE 'Normal - continue monitoring'::VARCHAR
        END AS recommended_action,
        CASE
            WHEN i.stock_remaining <= i.min_stock_level AND COALESCE(sales.units_sold, 0) > p_high_velocity_threshold 
                THEN 1
            WHEN i.stock_remaining <= i.min_stock_level 
                THEN 2
            WHEN COALESCE(sales.units_sold, 0) > p_high_velocity_threshold 
                THEN 3
            WHEN i.stock_remaining > i.min_stock_level * 3 AND COALESCE(sales.units_sold, 0) < 10
                THEN 4
            ELSE 5
        END AS priority_score
    FROM inventory i
    JOIN products p ON p.product_id = i.product_id
    JOIN categories c ON c.category_id = p.category_id
    LEFT JOIN sales_data sales ON sales.product_id = p.product_id
    ORDER BY priority_score ASC, last_30d_sales DESC;
END;
$$;

SELECT * FROM get_inventory_intelligence_score(30, 30);