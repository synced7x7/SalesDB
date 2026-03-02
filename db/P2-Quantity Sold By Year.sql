CREATE OR REPLACE VIEW quantity_sold_by_year AS
SELECT
    EXTRACT(YEAR FROM o.order_date)::INT AS sales_year,
    p.product_id,
    p.product_name,
    SUM(oi.quantity)::INT AS total_quantity_sold
FROM orders o
JOIN order_items oi
    ON o.order_id = oi.order_id
JOIN products p
    ON oi.product_id = p.product_id
GROUP BY
    sales_year,
    p.product_id,
    p.product_name
ORDER BY
    sales_year DESC,
    total_quantity_sold DESC;

Select * from quantity_sold_by_year;

CREATE OR REPLACE VIEW quantity_sold_years AS
SELECT DISTINCT EXTRACT(YEAR FROM order_date)::INT AS sales_year
FROM orders
ORDER BY sales_year DESC;

SELECT * from quantity_sold_years;
-- DROP VIEW IF EXISTS  quantity_sold_years;
