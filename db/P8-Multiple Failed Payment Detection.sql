CREATE OR REPLACE FUNCTION get_multiple_failed_payments(
    p_days INT DEFAULT 15,
    p_min_attempts INT DEFAULT 2
)
RETURNS TABLE (
    customer_id INT,
    first_name VARCHAR,
    last_name VARCHAR,
    email VARCHAR,
    failed_attempts BIGINT,
    last_failed_date TIMESTAMP
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
        COUNT(p.payment_id) AS failed_attempts,
        MAX(p.payment_date) AS last_failed_date
    FROM customers c
    JOIN orders o 
        ON o.customer_id = c.customer_id
    JOIN payments p 
        ON p.order_id = o.order_id
    WHERE p.payment_status = 'FAILED'
      AND p.payment_date >= DATE '2025-12-31' - (p_days * INTERVAL '1 day')
    GROUP BY
        c.customer_id,
        c.first_name,
        c.last_name,
        c.email
    HAVING COUNT(p.payment_id) >= p_min_attempts
    ORDER BY failed_attempts DESC;
END;
$$;



-- Test
SELECT * FROM get_multiple_failed_payments();