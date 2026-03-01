CREATE OR REPLACE FUNCTION get_revenue_decrease_ratio()
RETURNS TABLE(
    current_year INT,
    previous_year INT,
    current_year_revenue NUMERIC,
    previous_year_revenue NUMERIC,
    revenue_change NUMERIC,
    change_percentage NUMERIC,
    change_type TEXT,          
    current_year_orders INT,
    previous_year_orders INT,
    order_change INT,
    order_change_percentage NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH yearly_stats AS (
        SELECT
            EXTRACT(YEAR FROM o.order_date)::INT AS year,
            SUM(o.total_amount)::NUMERIC AS total_revenue,
            COUNT(DISTINCT o.order_id)::INT AS total_orders
        FROM orders o
        WHERE o.order_status NOT IN ('Cancelled', 'Refunded')
        GROUP BY EXTRACT(YEAR FROM o.order_date)
    ),
    year_comparison AS (
        SELECT
            curr.year AS curr_year,
            prev.year AS prev_year,
            curr.total_revenue AS curr_revenue,
            prev.total_revenue AS prev_revenue,
            (curr.total_revenue - prev.total_revenue)::NUMERIC AS rev_change,
            CASE 
                WHEN prev.total_revenue > 0 
                THEN ((curr.total_revenue - prev.total_revenue) / prev.total_revenue * 100)::NUMERIC
                ELSE 0
            END AS change_pct,
            CASE 
                WHEN curr.total_revenue > prev.total_revenue THEN 'Increase'
                WHEN curr.total_revenue < prev.total_revenue THEN 'Decrease'
                ELSE 'No Change'
            END AS chg_type,
            curr.total_orders AS curr_orders,
            prev.total_orders AS prev_orders,
            (curr.total_orders - prev.total_orders)::INT AS ord_change,
            CASE 
                WHEN prev.total_orders > 0 
                THEN ((curr.total_orders - prev.total_orders)::NUMERIC / prev.total_orders * 100)::NUMERIC
                ELSE 0
            END AS ord_change_pct
        FROM yearly_stats curr
        LEFT JOIN yearly_stats prev ON prev.year = curr.year - 1
        WHERE prev.year IS NOT NULL
    )
    SELECT
        curr_year,
        prev_year,
        curr_revenue,
        prev_revenue,
        rev_change,
        change_pct,
        chg_type,
        curr_orders,
        prev_orders,
        ord_change,
        ord_change_pct
    FROM year_comparison
    ORDER BY curr_year DESC;
END;
$$;

select * from get_revenue_decrease_ratio();