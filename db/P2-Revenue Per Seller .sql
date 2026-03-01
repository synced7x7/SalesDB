-- Function: get_revenue_per_seller(p_year INT DEFAULT NULL)
-- Returns revenue per seller, optionally filtered by year

CREATE OR REPLACE FUNCTION get_revenue_per_seller(p_year INT DEFAULT NULL)
RETURNS TABLE(
    seller_name VARCHAR,
    total_revenue NUMERIC,
    total_products_sold INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
    cur CURSOR FOR
        SELECT
            s.seller_name,
            SUM(oi.quantity * oi.unit_price)::NUMERIC AS total_revenue,
            SUM(oi.quantity)::INT AS total_products_sold
        FROM sellers s
        JOIN products p
            ON s.seller_id = p.seller_id
        JOIN order_items oi
            ON p.product_id = oi.product_id
        JOIN orders o
            ON o.order_id = oi.order_id
        WHERE (p_year IS NULL OR EXTRACT(YEAR FROM o.order_date)::INT = p_year)
        GROUP BY s.seller_id, s.seller_name
        ORDER BY total_revenue DESC;
BEGIN
    OPEN cur;

    LOOP
        FETCH cur INTO rec;
        EXIT WHEN NOT FOUND;

        seller_name := rec.seller_name;
        total_revenue := rec.total_revenue;
        total_products_sold := rec.total_products_sold;
        RETURN NEXT;
    END LOOP;

    CLOSE cur;
END;
$$;

-- Test the function for all years
SELECT * FROM get_revenue_per_seller();

-- -- Test the function for a specific year
-- SELECT * FROM get_revenue_per_seller(2023);
