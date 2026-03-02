-- FUNCTION 3: Return-Adjusted Demand (High Return Rate Products)
CREATE OR REPLACE FUNCTION get_high_return_products(p_min_return_rate NUMERIC DEFAULT 0.30)
RETURNS TABLE(
    product_id INT,
    product_name VARCHAR,
    category_name VARCHAR,
    units_sold BIGINT,
    units_returned BIGINT,
    return_rate NUMERIC,
    net_demand BIGINT,
    quality_risk_level VARCHAR
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
        COUNT(r.return_id) AS units_returned,
        ROUND(
            COUNT(r.return_id)::NUMERIC / NULLIF(SUM(oi.quantity), 0) * 100,
            2
        ) AS return_rate,
        (SUM(oi.quantity) - COUNT(r.return_id))::BIGINT AS net_demand,
        CASE 
            WHEN COUNT(r.return_id)::NUMERIC / NULLIF(SUM(oi.quantity), 0) >= 0.50 THEN 'Critical'::VARCHAR
            WHEN COUNT(r.return_id)::NUMERIC / NULLIF(SUM(oi.quantity), 0) >= 0.40 THEN 'High'::VARCHAR
            WHEN COUNT(r.return_id)::NUMERIC / NULLIF(SUM(oi.quantity), 0) >= 0.30 THEN 'Medium'::VARCHAR
            ELSE 'Low'::VARCHAR
        END AS quality_risk_level
    FROM products p
    JOIN categories c ON c.category_id = p.category_id
    JOIN order_items oi ON oi.product_id = p.product_id
    JOIN orders o ON o.order_id = oi.order_id
    LEFT JOIN returns r ON r.order_item_id = oi.order_item_id
    WHERE o.order_status NOT IN ('Cancelled', 'Refunded')
    GROUP BY p.product_id, p.product_name, c.category_name
    HAVING COUNT(r.return_id)::NUMERIC / NULLIF(SUM(oi.quantity), 0) > p_min_return_rate
    ORDER BY return_rate DESC;
END;
$$;

SELECT * FROM get_high_return_products(0.10);