CREATE OR REPLACE VIEW daily_sales_view AS
SELECT
    DATE(o.order_date) AS sales_date,
    SUM(oi.line_total) AS total_sales_amount,
    COUNT(DISTINCT o.order_id) AS total_orders,
    SUM(oi.quantity) AS total_quantity_sold
FROM Orders o
JOIN Order_Items oi ON o.order_id = oi.order_id
GROUP BY DATE(o.order_date)
ORDER BY sales_date;

-- List all views in your schema
-- SELECT table_name
-- FROM information_schema.views
-- WHERE table_schema = 'public';

--Query the view
SELECT *
FROM daily_sales_view
ORDER BY sales_date;

CREATE OR REPLACE VIEW daily_sales_years AS
SELECT DISTINCT
  EXTRACT(YEAR FROM order_date)::INT AS year
FROM orders
ORDER BY year DESC;

--SELECT * FROM daily_sales_years;