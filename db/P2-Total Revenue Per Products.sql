CREATE OR REPLACE FUNCTION get_revenue_per_product()
RETURNS TABLE(
    product_name VARCHAR,
    total_revenue NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
    cur CURSOR FOR
        SELECT
            p.product_name,
            SUM(oi.quantity * oi.unit_price)::NUMERIC AS revenue
        FROM products p
        JOIN order_items oi
            ON p.product_id = oi.product_id
        GROUP BY p.product_id, p.product_name
        ORDER BY revenue DESC;
BEGIN
    -- Open cursor
    OPEN cur;

    LOOP
        FETCH cur INTO rec;
        EXIT WHEN NOT FOUND;

        -- Return each row
        product_name := rec.product_name;
        total_revenue := rec.revenue;
        RETURN NEXT;
    END LOOP;

    CLOSE cur;
END;
$$;

SELECT * FROM get_revenue_per_product();
