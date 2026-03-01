-- FUNCTION 4: All Time High Return Rate Sellers
CREATE OR REPLACE FUNCTION get_seller_high_returns_alltime(p_min_items INT DEFAULT 10, p_min_return_rate NUMERIC DEFAULT 0.30)
RETURNS TABLE(
    seller_id INT,
    seller_name VARCHAR,
    contact_email VARCHAR,
    items_sold BIGINT,
    returns_count BIGINT,
    return_percentage NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.seller_id,
        s.seller_name,
        s.contact_email,
        COUNT(oi.order_item_id) as items_sold,
        COUNT(r.return_id) as returns_count,
        ROUND(
            COUNT(r.return_id)::NUMERIC / NULLIF(COUNT(oi.order_item_id), 0) * 100,
            2
        ) as return_percentage
    FROM sellers s
    JOIN products p ON p.seller_id = s.seller_id
    JOIN order_items oi ON oi.product_id = p.product_id
    JOIN orders o ON o.order_id = oi.order_id
    LEFT JOIN returns r ON r.order_item_id = oi.order_item_id
    GROUP BY s.seller_id, s.seller_name, s.contact_email
    HAVING COUNT(oi.order_item_id) >= p_min_items
        AND COUNT(r.return_id)::NUMERIC / NULLIF(COUNT(oi.order_item_id), 0) >= p_min_return_rate
    ORDER BY return_percentage DESC;
END;
$$;

-- Test
SELECT * FROM get_seller_high_returns_alltime(10, 0.30);