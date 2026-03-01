CREATE OR REPLACE FUNCTION get_product_profit_margin(p_year INT DEFAULT NULL)
RETURNS TABLE(
    product_id INT,
    product_name VARCHAR,
    category_name VARCHAR,
    total_revenue NUMERIC,
    total_cost NUMERIC,
    total_profit NUMERIC,
    profit_margin_percentage NUMERIC,
    total_units_sold INT,
    avg_profit_per_unit NUMERIC,
    avg_selling_price NUMERIC,
    avg_cost_price NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
    cur CURSOR FOR
        SELECT
            p.product_id,
            p.product_name,
            c.category_name,
            SUM(oi.quantity * oi.unit_price)::NUMERIC AS revenue,
            SUM(oi.quantity * p.cogs)::NUMERIC AS cost,
            (SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * p.cogs))::NUMERIC AS profit,
            CASE 
                WHEN SUM(oi.quantity * oi.unit_price) > 0 
                THEN ((SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * p.cogs)) / SUM(oi.quantity * oi.unit_price) * 100)::NUMERIC
                ELSE 0
            END AS profit_margin_pct,
            SUM(oi.quantity)::INT AS units_sold,
            CASE 
                WHEN SUM(oi.quantity) > 0 
                THEN ((SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * p.cogs)) / SUM(oi.quantity))::NUMERIC
                ELSE 0
            END AS avg_profit_unit,
            CASE 
                WHEN SUM(oi.quantity) > 0 
                THEN (SUM(oi.quantity * oi.unit_price) / SUM(oi.quantity))::NUMERIC
                ELSE 0
            END AS avg_sell_price,
            p.cogs::NUMERIC AS avg_cost
        FROM products p
        JOIN categories c ON p.category_id = c.category_id
        JOIN order_items oi ON p.product_id = oi.product_id
        JOIN orders o ON oi.order_id = o.order_id
        WHERE (p_year IS NULL OR EXTRACT(YEAR FROM o.order_date)::INT = p_year)
        GROUP BY p.product_id, p.product_name, c.category_name, p.cogs
        ORDER BY profit DESC;
BEGIN
    OPEN cur;

    LOOP
        FETCH cur INTO rec;
        EXIT WHEN NOT FOUND;

        product_id := rec.product_id;
        product_name := rec.product_name;
        category_name := rec.category_name;
        total_revenue := rec.revenue;
        total_cost := rec.cost;
        total_profit := rec.profit;
        profit_margin_percentage := rec.profit_margin_pct;
        total_units_sold := rec.units_sold;
        avg_profit_per_unit := rec.avg_profit_unit;
        avg_selling_price := rec.avg_sell_price;
        avg_cost_price := rec.avg_cost;
        RETURN NEXT;
    END LOOP;

    CLOSE cur;
END;
$$;


SELECT * FROM get_product_profit_margin();
-- SELECT * FROM get_product_profit_margin(2024);