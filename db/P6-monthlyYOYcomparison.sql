CREATE OR REPLACE FUNCTION get_monthly_yoy_comparison(p_year INT DEFAULT NULL)
RETURNS TABLE(
    month_number INT,
    month_name VARCHAR,
    current_year INT,
    previous_year INT,
    current_year_revenue NUMERIC,
    previous_year_revenue NUMERIC,
    revenue_change NUMERIC,
    change_percentage NUMERIC,
    current_year_orders INT,
    previous_year_orders INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    target_year INT;
BEGIN
    IF p_year IS NULL THEN
        SELECT MAX(EXTRACT(YEAR FROM order_date)::INT) INTO target_year FROM orders;
    ELSE
        target_year := p_year;
    END IF;

    RETURN QUERY
    WITH months AS (
        SELECT generate_series(1, 12) AS month_num
    ),
    current_monthly AS (
        SELECT
            EXTRACT(MONTH FROM o.order_date)::INT AS month_num,
            SUM(o.total_amount)::NUMERIC AS revenue,
            COUNT(DISTINCT o.order_id)::INT AS orders
        FROM orders o
        WHERE EXTRACT(YEAR FROM o.order_date)::INT = target_year
            AND o.order_status NOT IN ('Cancelled', 'Refunded')
        GROUP BY EXTRACT(MONTH FROM o.order_date)
    ),
    previous_monthly AS (
        SELECT
            EXTRACT(MONTH FROM o.order_date)::INT AS month_num,
            SUM(o.total_amount)::NUMERIC AS revenue,
            COUNT(DISTINCT o.order_id)::INT AS orders
        FROM orders o
        WHERE EXTRACT(YEAR FROM o.order_date)::INT = target_year - 1
            AND o.order_status NOT IN ('Cancelled', 'Refunded')
        GROUP BY EXTRACT(MONTH FROM o.order_date)
    )
    SELECT
        m.month_num::INT,
        TO_CHAR(TO_DATE(m.month_num::TEXT, 'MM'), 'Month')::VARCHAR AS month_name,
        target_year AS current_year,
        (target_year - 1) AS previous_year,
        COALESCE(curr.revenue, 0) AS current_year_revenue,
        COALESCE(prev.revenue, 0) AS previous_year_revenue,
        COALESCE(curr.revenue, 0) - COALESCE(prev.revenue, 0) AS revenue_change,
        CASE 
            WHEN COALESCE(prev.revenue, 0) > 0 
            THEN ((COALESCE(curr.revenue, 0) - COALESCE(prev.revenue, 0)) / prev.revenue * 100)::NUMERIC
            ELSE 0
        END AS change_percentage,
        COALESCE(curr.orders, 0) AS current_year_orders,
        COALESCE(prev.orders, 0) AS previous_year_orders
    FROM months m
    LEFT JOIN current_monthly curr ON m.month_num = curr.month_num
    LEFT JOIN previous_monthly prev ON m.month_num = prev.month_num
    ORDER BY m.month_num;
END;
$$;

SELECT * FROM get_monthly_yoy_comparison(2024);
