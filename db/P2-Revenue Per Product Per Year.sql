CREATE OR REPLACE FUNCTION get_revenue_per_product_by_year(p_year INT DEFAULT NULL)
RETURNS TABLE(
    sales_year INT,
    product_name VARCHAR,
    total_revenue NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
    cur CURSOR FOR
        SELECT
            EXTRACT(YEAR FROM o.order_date)::INT AS sales_year,
            p.product_name,
            SUM(oi.quantity * oi.unit_price)::NUMERIC AS revenue
        FROM products p
        JOIN order_items oi ON p.product_id = oi.product_id
        JOIN orders o ON oi.order_id = o.order_id
        GROUP BY sales_year, p.product_id, p.product_name
        ORDER BY sales_year DESC, revenue DESC;
BEGIN
    OPEN cur;

    LOOP
        FETCH cur INTO rec;
        EXIT WHEN NOT FOUND;

        IF p_year IS NULL OR rec.sales_year = p_year THEN
            sales_year := rec.sales_year;
            product_name := rec.product_name;
            total_revenue := rec.revenue;
            RETURN NEXT;
        END IF;
    END LOOP;

    CLOSE cur;
END;
$$;


--DROP function if exists get_revenue_per_product;
