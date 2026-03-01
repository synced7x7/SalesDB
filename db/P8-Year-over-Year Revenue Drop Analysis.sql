-- =============================================
-- 2. YEAR-TO-YEAR REVENUE DROP ANALYSIS
-- =============================================
-- Analyzes each year compared to its previous year

CREATE OR REPLACE FUNCTION get_yearly_revenue_drop_analysis(p_threshold_percent NUMERIC DEFAULT 20)
RETURNS TABLE(
    current_year INT,
    previous_year INT,
    current_period_start DATE,
    current_period_end DATE,
    comparison_period_start DATE,
    comparison_period_end DATE,
    current_revenue NUMERIC,
    previous_revenue NUMERIC,
    revenue_change NUMERIC,
    change_percentage NUMERIC,
    drop_severity VARCHAR,
    current_orders INT,
    previous_orders INT,
    current_customers INT,
    previous_customers INT,
    current_avg_order_value NUMERIC,
    previous_avg_order_value NUMERIC,
    affected_category VARCHAR,
    category_drop_percentage NUMERIC,
    affected_seller VARCHAR,
    seller_drop_percentage NUMERIC,
    top_growth_category VARCHAR,
    top_growth_percentage NUMERIC,
    recommendations TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
    reference_date DATE := '2025-12-31'::DATE;
BEGIN
    FOR rec IN
        WITH yearly_data AS (
            SELECT
                EXTRACT(YEAR FROM o.order_date)::INT AS yr,
                SUM(o.total_amount)::NUMERIC AS revenue,
                COUNT(DISTINCT o.order_id)::INT AS orders,
                COUNT(DISTINCT o.customer_id)::INT AS customers,
                CASE 
                    WHEN COUNT(DISTINCT o.order_id) > 0 
                    THEN (SUM(o.total_amount) / COUNT(DISTINCT o.order_id))::NUMERIC
                    ELSE 0
                END AS avg_order_val
            FROM orders o
            WHERE o.order_status NOT IN ('Cancelled', 'Refunded')
                AND o.order_date <= reference_date
            GROUP BY EXTRACT(YEAR FROM o.order_date)
        ),
        year_comparison AS (
            SELECT
                curr.yr AS curr_year,
                prev.yr AS prev_year,
                DATE_TRUNC('year', (curr.yr || '-01-01')::DATE)::DATE AS curr_start,
                (DATE_TRUNC('year', (curr.yr || '-01-01')::DATE) + INTERVAL '1 year' - INTERVAL '1 day')::DATE AS curr_end,
                DATE_TRUNC('year', (prev.yr || '-01-01')::DATE)::DATE AS prev_start,
                (DATE_TRUNC('year', (prev.yr || '-01-01')::DATE) + INTERVAL '1 year' - INTERVAL '1 day')::DATE AS prev_end,
                curr.revenue AS curr_rev,
                prev.revenue AS prev_rev,
                curr.revenue - prev.revenue AS rev_change,
                CASE 
                    WHEN prev.revenue > 0 
                    THEN ((curr.revenue - prev.revenue) / prev.revenue * 100)::NUMERIC
                    ELSE 0
                END AS change_pct,
                curr.orders AS curr_orders,
                prev.orders AS prev_orders,
                curr.customers AS curr_customers,
                prev.customers AS prev_customers,
                curr.avg_order_val AS curr_aov,
                prev.avg_order_val AS prev_aov
            FROM yearly_data curr
            LEFT JOIN yearly_data prev ON prev.yr = curr.yr - 1
            WHERE prev.yr IS NOT NULL
        ),
        category_analysis AS (
            SELECT
                yc.curr_year,
                c.category_name,
                CASE 
                    WHEN SUM(CASE WHEN EXTRACT(YEAR FROM o.order_date) = yc.prev_year THEN oi.line_total END) > 0
                    THEN ((SUM(CASE WHEN EXTRACT(YEAR FROM o.order_date) = yc.curr_year THEN oi.line_total END) - 
                           SUM(CASE WHEN EXTRACT(YEAR FROM o.order_date) = yc.prev_year THEN oi.line_total END)) / 
                          SUM(CASE WHEN EXTRACT(YEAR FROM o.order_date) = yc.prev_year THEN oi.line_total END) * 100)::NUMERIC
                    ELSE 0
                END AS change_pct,
                ROW_NUMBER() OVER (PARTITION BY yc.curr_year ORDER BY 
                    CASE 
                        WHEN SUM(CASE WHEN EXTRACT(YEAR FROM o.order_date) = yc.prev_year THEN oi.line_total END) > 0
                        THEN ((SUM(CASE WHEN EXTRACT(YEAR FROM o.order_date) = yc.curr_year THEN oi.line_total END) - 
                               SUM(CASE WHEN EXTRACT(YEAR FROM o.order_date) = yc.prev_year THEN oi.line_total END)) / 
                              SUM(CASE WHEN EXTRACT(YEAR FROM o.order_date) = yc.prev_year THEN oi.line_total END) * 100)::NUMERIC
                        ELSE 0
                    END ASC
                ) AS rn_drop,
                ROW_NUMBER() OVER (PARTITION BY yc.curr_year ORDER BY 
                    CASE 
                        WHEN SUM(CASE WHEN EXTRACT(YEAR FROM o.order_date) = yc.prev_year THEN oi.line_total END) > 0
                        THEN ((SUM(CASE WHEN EXTRACT(YEAR FROM o.order_date) = yc.curr_year THEN oi.line_total END) - 
                               SUM(CASE WHEN EXTRACT(YEAR FROM o.order_date) = yc.prev_year THEN oi.line_total END)) / 
                              SUM(CASE WHEN EXTRACT(YEAR FROM o.order_date) = yc.prev_year THEN oi.line_total END) * 100)::NUMERIC
                        ELSE 0
                    END DESC
                ) AS rn_growth
            FROM year_comparison yc
            CROSS JOIN categories c
            LEFT JOIN products p ON c.category_id = p.category_id
            LEFT JOIN order_items oi ON p.product_id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.order_id
                AND o.order_status NOT IN ('Cancelled', 'Refunded')
                AND EXTRACT(YEAR FROM o.order_date) IN (yc.curr_year, yc.prev_year)
            GROUP BY yc.curr_year, yc.prev_year, c.category_name
        ),
        seller_analysis AS (
            SELECT
                yc.curr_year,
                s.seller_name,
                CASE 
                    WHEN SUM(CASE WHEN EXTRACT(YEAR FROM o.order_date) = yc.prev_year THEN oi.line_total END) > 0
                    THEN ((SUM(CASE WHEN EXTRACT(YEAR FROM o.order_date) = yc.curr_year THEN oi.line_total END) - 
                           SUM(CASE WHEN EXTRACT(YEAR FROM o.order_date) = yc.prev_year THEN oi.line_total END)) / 
                          SUM(CASE WHEN EXTRACT(YEAR FROM o.order_date) = yc.prev_year THEN oi.line_total END) * 100)::NUMERIC
                    ELSE 0
                END AS change_pct,
                ROW_NUMBER() OVER (PARTITION BY yc.curr_year ORDER BY 
                    CASE 
                        WHEN SUM(CASE WHEN EXTRACT(YEAR FROM o.order_date) = yc.prev_year THEN oi.line_total END) > 0
                        THEN ((SUM(CASE WHEN EXTRACT(YEAR FROM o.order_date) = yc.curr_year THEN oi.line_total END) - 
                               SUM(CASE WHEN EXTRACT(YEAR FROM o.order_date) = yc.prev_year THEN oi.line_total END)) / 
                              SUM(CASE WHEN EXTRACT(YEAR FROM o.order_date) = yc.prev_year THEN oi.line_total END) * 100)::NUMERIC
                        ELSE 0
                    END ASC
                ) AS rn
            FROM year_comparison yc
            CROSS JOIN sellers s
            LEFT JOIN products p ON s.seller_id = p.seller_id
            LEFT JOIN order_items oi ON p.product_id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.order_id
                AND o.order_status NOT IN ('Cancelled', 'Refunded')
                AND EXTRACT(YEAR FROM o.order_date) IN (yc.curr_year, yc.prev_year)
            GROUP BY yc.curr_year, yc.prev_year, s.seller_name
        )
        SELECT
            yc.curr_year,
            yc.prev_year,
            yc.curr_start,
            yc.curr_end,
            yc.prev_start,
            yc.prev_end,
            yc.curr_rev,
            yc.prev_rev,
            yc.rev_change,
            yc.change_pct,
            CASE 
                WHEN yc.prev_rev = 0 THEN 'No Data'::VARCHAR
                WHEN yc.change_pct <= -50 THEN 'Critical'::VARCHAR
                WHEN yc.change_pct <= -p_threshold_percent THEN 'High'::VARCHAR
                WHEN yc.change_pct <= -10 THEN 'Medium'::VARCHAR
                WHEN yc.change_pct < 0 THEN 'Low'::VARCHAR
                ELSE 'No Drop'::VARCHAR
            END AS severity,
            yc.curr_orders,
            yc.prev_orders,
            yc.curr_customers,
            yc.prev_customers,
            yc.curr_aov,
            yc.prev_aov,
            COALESCE(cd.category_name, 'N/A')::VARCHAR AS aff_category,
            COALESCE(cd.change_pct, 0) AS cat_drop,
            COALESCE(sd.seller_name, 'N/A')::VARCHAR AS aff_seller,
            COALESCE(sd.change_pct, 0) AS sell_drop,
            COALESCE(cg.category_name, 'N/A')::VARCHAR AS growth_category,
            COALESCE(cg.change_pct, 0) AS growth_pct,
            CASE 
                WHEN yc.prev_rev = 0 THEN 'Insufficient data for year-over-year analysis'
                WHEN yc.change_pct <= -p_threshold_percent 
                THEN 'Significant annual decline in ' || yc.curr_year::TEXT || '. Strategic review recommended. ' ||
                     'Focus on ' || COALESCE(cd.category_name, 'underperforming categories') || '. ' ||
                     'Consider market expansion and product diversification.'
                WHEN yc.change_pct >= p_threshold_percent
                THEN 'Strong annual growth in ' || yc.curr_year::TEXT || '. Top performer: ' || 
                     COALESCE(cg.category_name, 'multiple categories') || '. Scale successful strategies.'
                ELSE 'Annual performance stable. Monitor quarterly trends for early indicators.'
            END AS recommend
        FROM year_comparison yc
        LEFT JOIN category_analysis cd ON yc.curr_year = cd.curr_year AND cd.rn_drop = 1
        LEFT JOIN category_analysis cg ON yc.curr_year = cg.curr_year AND cg.rn_growth = 1
        LEFT JOIN seller_analysis sd ON yc.curr_year = sd.curr_year AND sd.rn = 1
        ORDER BY yc.curr_year DESC
    LOOP
        current_year := rec.curr_year;
        previous_year := rec.prev_year;
        current_period_start := rec.curr_start;
        current_period_end := rec.curr_end;
        comparison_period_start := rec.prev_start;
        comparison_period_end := rec.prev_end;
        current_revenue := rec.curr_rev;
        previous_revenue := rec.prev_rev;
        revenue_change := rec.rev_change;
        change_percentage := rec.change_pct;
        drop_severity := rec.severity;
        current_orders := rec.curr_orders;
        previous_orders := rec.prev_orders;
        current_customers := rec.curr_customers;
        previous_customers := rec.prev_customers;
        current_avg_order_value := rec.curr_aov;
        previous_avg_order_value := rec.prev_aov;
        affected_category := rec.aff_category;
        category_drop_percentage := rec.cat_drop;
        affected_seller := rec.aff_seller;
        seller_drop_percentage := rec.sell_drop;
        top_growth_category := rec.growth_category;
        top_growth_percentage := rec.growth_pct;
        recommendations := rec.recommend;
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$;

-- Test query
SELECT * FROM get_yearly_revenue_drop_analysis(20);