--Low stock detection
SELECT
    i.product_id,
    p.product_name,
    w.warehouse_name,
    i.stock_remaining,
    i.min_stock_level
FROM inventory i
JOIN products p ON p.product_id = i.product_id
JOIN warehouses w ON w.warehouse_id = i.warehouse_id
WHERE i.stock_remaining <= i.min_stock_level;

--fast moving products
SELECT
    p.product_id,
    p.product_name,
    SUM(oi.quantity) AS units_sold
FROM order_items oi
JOIN products p ON p.product_id = oi.product_id
JOIN orders o ON o.order_id = oi.order_id
WHERE o.order_date >= DATE '2025-12-31' - INTERVAL '7 days' 
GROUP BY p.product_id, p.product_name
HAVING SUM(oi.quantity) > 30    
ORDER BY units_sold DESC;

--Return-Adjusted Demand
SELECT
    p.product_id,
    p.product_name,
    SUM(oi.quantity) AS sold,
    COUNT(r.return_id) AS returned
FROM products p
JOIN order_items oi ON oi.product_id = p.product_id
JOIN orders o ON o.order_id = oi.order_id
LEFT JOIN returns r ON r.order_item_id = oi.order_item_id
GROUP BY p.product_id, p.product_name
HAVING COUNT(r.return_id)::NUMERIC / NULLIF(SUM(oi.quantity),0) > 0.30;

--warehouse load intelligence
SELECT
    w.warehouse_name,
    COUNT(i.inventory_id) AS products_stored,
    SUM(i.stock_remaining) AS total_units
FROM warehouses w
JOIN inventory i ON i.warehouse_id = w.warehouse_id
GROUP BY w.warehouse_name;

--inventory intelligence score
SELECT
    p.product_id,
    p.product_name,
    i.stock_remaining,
    COALESCE(sales.units_sold,0) AS last_30d_sales,
    CASE
        WHEN i.stock_remaining <= i.min_stock_level THEN 'HIGH'
        WHEN COALESCE(sales.units_sold,0) > 50 THEN 'MEDIUM'
        ELSE 'LOW'
    END AS inventory_risk
FROM inventory i
JOIN products p ON p.product_id = i.product_id
LEFT JOIN (
    SELECT
        oi.product_id,
        SUM(oi.quantity) AS units_sold
    FROM order_items oi
    JOIN orders o ON o.order_id = oi.order_id
    WHERE o.order_date >= DATE '2025-12-31' - INTERVAL '30 days'
    GROUP BY oi.product_id
) sales ON sales.product_id = p.product_id;



















