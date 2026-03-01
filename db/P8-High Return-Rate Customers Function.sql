-- FUNCTION 2: High Return Rate Customers
CREATE OR REPLACE FUNCTION get_high_return_customers(p_min_returns INT DEFAULT 3, p_min_percentage NUMERIC DEFAULT 10)
RETURNS TABLE(
    customer_id INT,
    first_name VARCHAR,
    last_name VARCHAR,
    email VARCHAR,
    total_returns BIGINT,
    total_items BIGINT,
    return_percentage NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.customer_id,
        c.first_name,
        c.last_name,
        c.email,
        COUNT(r.return_id) as total_returns,
        COUNT(oi.order_item_id) as total_items,
        ROUND(
            COUNT(r.return_id)::NUMERIC / NULLIF(COUNT(oi.order_item_id), 0) * 100,
            2
        ) as return_percentage
    FROM customers c
    JOIN orders o ON o.customer_id = c.customer_id
    JOIN order_items oi ON oi.order_id = o.order_id
    LEFT JOIN returns r ON r.order_item_id = oi.order_item_id
    GROUP BY c.customer_id, c.first_name, c.last_name, c.email
    HAVING COUNT(r.return_id) >= p_min_returns
        AND (COUNT(r.return_id)::NUMERIC / NULLIF(COUNT(oi.order_item_id), 0) * 100) > p_min_percentage
    ORDER BY return_percentage DESC;
END;
$$;

-- Test
SELECT * FROM get_high_return_customers(3, 10);
