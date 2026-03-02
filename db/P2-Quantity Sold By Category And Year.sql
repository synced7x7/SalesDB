CREATE OR REPLACE VIEW quantity_sold_by_category_year AS
SELECT
    EXTRACT(YEAR FROM o.order_date)::INT AS sales_year,
    c.category_id,
    c.category_name,
    SUM(oi.quantity)::INT AS total_quantity_sold
FROM orders o
JOIN order_items oi
    ON o.order_id = oi.order_id
JOIN products p
    ON oi.product_id = p.product_id
JOIN categories c
    ON p.category_id = c.category_id
GROUP BY
    sales_year,
    c.category_id,
    c.category_name
ORDER BY
    sales_year,
    total_quantity_sold DESC;

Select * from quantity_sold_by_category_year;