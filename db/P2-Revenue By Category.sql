-- Function: get_revenue_per_category(p_year INT DEFAULT NULL)
-- Returns revenue per category, optionally filtered by year

CREATE OR REPLACE FUNCTION get_revenue_per_category(p_year INT DEFAULT NULL)
RETURNS TABLE(
    category_name VARCHAR,
    total_revenue NUMERIC,
    total_products_sold INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
    cur CURSOR FOR
        SELECT
            c.category_name,
            SUM(oi.quantity * oi.unit_price)::NUMERIC AS total_revenue,
            SUM(oi.quantity)::INT AS total_products_sold
        FROM categories c
        JOIN products p
            ON c.category_id = p.category_id
        JOIN order_items oi
            ON p.product_id = oi.product_id
        JOIN orders o
            ON o.order_id = oi.order_id
        WHERE (p_year IS NULL OR EXTRACT(YEAR FROM o.order_date)::INT = p_year)
        GROUP BY c.category_id, c.category_name
        ORDER BY total_revenue DESC;
BEGIN
    OPEN cur;

    LOOP
        FETCH cur INTO rec;
        EXIT WHEN NOT FOUND;

        category_name := rec.category_name;
        total_revenue := rec.total_revenue;
        total_products_sold := rec.total_products_sold;
        RETURN NEXT;
    END LOOP;

    CLOSE cur;
END;
$$;

-- Test for all years
SELECT * FROM get_revenue_per_category();

-- Test for a specific year
SELECT * FROM get_revenue_per_category(2024);
