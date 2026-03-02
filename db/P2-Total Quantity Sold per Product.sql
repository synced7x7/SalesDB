CREATE OR REPLACE VIEW total_quantity_sold_per_product AS
SELECT
    p.product_id,
    p.product_name,
    SUM(oi.quantity)::INT AS total_quantity_sold
FROM products p
JOIN order_items oi
    ON p.product_id = oi.product_id
GROUP BY
    p.product_id,
    p.product_name
ORDER BY
    total_quantity_sold DESC;

Select * from total_quantity_sold_per_product;
