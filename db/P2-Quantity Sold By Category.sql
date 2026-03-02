CREATE OR REPLACE VIEW quantity_sold_by_category AS
SELECT
    c.category_id,
    c.category_name,
    SUM(oi.quantity)::INT AS total_quantity_sold
FROM categories c
JOIN products p
    ON c.category_id = p.category_id
JOIN order_items oi
    ON p.product_id = oi.product_id
GROUP BY
    c.category_id,
    c.category_name
ORDER BY
    total_quantity_sold DESC;

Select * from quantity_sold_by_category;
