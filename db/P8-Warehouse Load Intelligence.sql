

-- FUNCTION 4: Warehouse Load Intelligence
CREATE OR REPLACE FUNCTION get_warehouse_load_intelligence()
RETURNS TABLE(
    warehouse_id INT,
    warehouse_name VARCHAR,
    warehouse_location VARCHAR,
    products_stored BIGINT,
    total_units BIGINT,
    low_stock_count BIGINT,
    avg_stock_per_product NUMERIC,
    utilization_score VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.warehouse_id,
        w.warehouse_name,
        w.location AS warehouse_location,
        COUNT(i.inventory_id) AS products_stored,
        SUM(i.stock_remaining) AS total_units,
        COUNT(CASE WHEN i.stock_remaining <= i.min_stock_level THEN 1 END) AS low_stock_count,
        ROUND(AVG(i.stock_remaining::NUMERIC), 2) AS avg_stock_per_product,
        CASE 
            WHEN SUM(i.stock_remaining) >= 6000 THEN 'High Capacity'::VARCHAR
            WHEN SUM(i.stock_remaining) >= 3000 THEN 'Medium Capacity'::VARCHAR
            WHEN SUM(i.stock_remaining) >= 1000 THEN 'Low Capacity'::VARCHAR
            ELSE 'Very Low'::VARCHAR
        END AS utilization_score
    FROM warehouses w
    JOIN inventory i ON i.warehouse_id = w.warehouse_id
    GROUP BY w.warehouse_id, w.warehouse_name, w.location
    ORDER BY total_units DESC;
END;
$$;

SELECT * FROM get_warehouse_load_intelligence();