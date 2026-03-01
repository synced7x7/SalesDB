CREATE OR REPLACE FUNCTION get_yoy_revenue_growth(p_year INT DEFAULT NULL)
RETURNS TABLE(
    analysis_year INT,
    comparison_year INT,
    current_revenue NUMERIC,
    previous_revenue NUMERIC,
    revenue_growth NUMERIC,
    growth_percentage NUMERIC,
    growth_status VARCHAR,
    current_orders INT,
    previous_orders INT,
    current_customers INT,
    previous_customers INT,
    current_avg_order_value NUMERIC,
    previous_avg_order_value NUMERIC,
    aov_growth_percentage NUMERIC,
    top_growth_category VARCHAR,
    top_growth_category_percentage NUMERIC,
    top_decline_category VARCHAR,
    top_decline_category_percentage NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    target_year INT;
BEGIN
    -- If no year specified, use the latest year
    IF p_year IS NULL THEN
        SELECT MAX(EXTRACT(YEAR FROM order_date)::INT) INTO target_year FROM orders;
    ELSE
        target_year := p_year;
    END IF;

    RETURN QUERY
    WITH current_year_data AS (
        SELECT
            SUM(o.total_amount)::NUMERIC AS revenue,
            COUNT(DISTINCT o.order_id)::INT AS orders,
            COUNT(DISTINCT o.customer_id)::INT AS customers,
            CASE 
                WHEN COUNT(DISTINCT o.order_id) > 0 
                THEN (SUM(o.total_amount) / COUNT(DISTINCT o.order_id))::NUMERIC
                ELSE 0
            END AS avg_order_val
        FROM orders o
        WHERE EXTRACT(YEAR FROM o.order_date)::INT = target_year
            AND o.order_status NOT IN ('Cancelled', 'Refunded')
    ),
    previous_year_data AS (
        SELECT
            SUM(o.total_amount)::NUMERIC AS revenue,
            COUNT(DISTINCT o.order_id)::INT AS orders,
            COUNT(DISTINCT o.customer_id)::INT AS customers,
            CASE 
                WHEN COUNT(DISTINCT o.order_id) > 0 
                THEN (SUM(o.total_amount) / COUNT(DISTINCT o.order_id))::NUMERIC
                ELSE 0
            END AS avg_order_val
        FROM orders o
        WHERE EXTRACT(YEAR FROM o.order_date)::INT = target_year - 1
            AND o.order_status NOT IN ('Cancelled', 'Refunded')
    ),
    category_growth AS (
        SELECT
            c.category_name,
            CASE 
                WHEN prev_rev.revenue > 0 
                THEN ((curr_rev.revenue - prev_rev.revenue) / prev_rev.revenue * 100)::NUMERIC
                ELSE 0
            END AS growth_pct
        FROM categories c
        LEFT JOIN (
            SELECT 
                p.category_id,
                SUM(oi.line_total)::NUMERIC AS revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            JOIN products p ON oi.product_id = p.product_id
            WHERE EXTRACT(YEAR FROM o.order_date)::INT = target_year
                AND o.order_status NOT IN ('Cancelled', 'Refunded')
            GROUP BY p.category_id
        ) curr_rev ON c.category_id = curr_rev.category_id
        LEFT JOIN (
            SELECT 
                p.category_id,
                SUM(oi.line_total)::NUMERIC AS revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            JOIN products p ON oi.product_id = p.product_id
            WHERE EXTRACT(YEAR FROM o.order_date)::INT = target_year - 1
                AND o.order_status NOT IN ('Cancelled', 'Refunded')
            GROUP BY p.category_id
        ) prev_rev ON c.category_id = prev_rev.category_id
        WHERE curr_rev.revenue IS NOT NULL AND prev_rev.revenue IS NOT NULL
    ),
    top_growth AS (
        SELECT category_name, growth_pct
        FROM category_growth
        ORDER BY growth_pct DESC
        LIMIT 1
    ),
    top_decline AS (
        SELECT category_name, growth_pct
        FROM category_growth
        ORDER BY growth_pct ASC
        LIMIT 1
    )
    SELECT
        target_year AS analysis_year,
        (target_year - 1) AS comparison_year,
        COALESCE(curr.revenue, 0) AS current_revenue,
        COALESCE(prev.revenue, 0) AS previous_revenue,
        COALESCE(curr.revenue, 0) - COALESCE(prev.revenue, 0) AS revenue_growth,
        CASE 
            WHEN COALESCE(prev.revenue, 0) > 0 
            THEN ((COALESCE(curr.revenue, 0) - COALESCE(prev.revenue, 0)) / prev.revenue * 100)::NUMERIC
            ELSE 0
        END AS growth_percentage,
        CASE 
            WHEN COALESCE(curr.revenue, 0) > COALESCE(prev.revenue, 0) THEN 'Growth'::VARCHAR
            WHEN COALESCE(curr.revenue, 0) < COALESCE(prev.revenue, 0) THEN 'Decline'::VARCHAR
            ELSE 'Stable'::VARCHAR
        END AS growth_status,
        COALESCE(curr.orders, 0) AS current_orders,
        COALESCE(prev.orders, 0) AS previous_orders,
        COALESCE(curr.customers, 0) AS current_customers,
        COALESCE(prev.customers, 0) AS previous_customers,
        COALESCE(curr.avg_order_val, 0) AS current_avg_order_value,
        COALESCE(prev.avg_order_val, 0) AS previous_avg_order_value,
        CASE 
            WHEN COALESCE(prev.avg_order_val, 0) > 0 
            THEN ((COALESCE(curr.avg_order_val, 0) - COALESCE(prev.avg_order_val, 0)) / prev.avg_order_val * 100)::NUMERIC
            ELSE 0
        END AS aov_growth_percentage,
        COALESCE(tg.category_name, '-')::VARCHAR AS top_growth_category,
        COALESCE(tg.growth_pct, 0) AS top_growth_category_percentage,
        COALESCE(td.category_name, '-')::VARCHAR AS top_decline_category,
        COALESCE(td.growth_pct, 0) AS top_decline_category_percentage
    FROM current_year_data curr
    CROSS JOIN previous_year_data prev
    LEFT JOIN top_growth tg ON true
    LEFT JOIN top_decline td ON true;
END;
$$;

select * from get_yoy_revenue_growth();