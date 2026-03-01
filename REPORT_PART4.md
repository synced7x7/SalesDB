# SalesDB — Lab Report
## Part 4: Advanced SQL — Phase 6, 7 & 8

---

## Phase 6 — Profit Loss Analytics

### 6.1 FUNCTION: `get_product_profit_margin` (Cursor-Based)

```sql
CREATE OR REPLACE FUNCTION get_product_profit_margin(p_year INT DEFAULT NULL)
RETURNS TABLE(
    product_id             INT,
    product_name           VARCHAR,
    category_name          VARCHAR,
    total_revenue          NUMERIC,
    total_cost             NUMERIC,
    total_profit           NUMERIC,
    profit_margin_percentage NUMERIC,
    total_units_sold       INT,
    avg_profit_per_unit    NUMERIC,
    avg_selling_price      NUMERIC,
    avg_cost_price         NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
    cur CURSOR FOR
        SELECT
            p.product_id,
            p.product_name,
            c.category_name,
            SUM(oi.quantity * oi.unit_price)::NUMERIC                     AS revenue,
            SUM(oi.quantity * p.cogs)::NUMERIC                            AS cost,
            (SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * p.cogs))::NUMERIC AS profit,
            CASE
                WHEN SUM(oi.quantity * oi.unit_price) > 0
                THEN ((SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * p.cogs))
                      / SUM(oi.quantity * oi.unit_price) * 100)::NUMERIC
                ELSE 0
            END AS profit_margin_pct,
            SUM(oi.quantity)::INT                                         AS units_sold,
            CASE
                WHEN SUM(oi.quantity) > 0
                THEN ((SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * p.cogs))
                      / SUM(oi.quantity))::NUMERIC
                ELSE 0
            END AS avg_profit_unit,
            CASE
                WHEN SUM(oi.quantity) > 0
                THEN (SUM(oi.quantity * oi.unit_price) / SUM(oi.quantity))::NUMERIC
                ELSE 0
            END AS avg_sell_price,
            p.cogs::NUMERIC AS avg_cost
        FROM products p
        JOIN categories c  ON p.category_id = c.category_id
        JOIN order_items oi ON p.product_id = oi.product_id
        JOIN orders o      ON oi.order_id   = o.order_id
        WHERE (p_year IS NULL OR EXTRACT(YEAR FROM o.order_date)::INT = p_year)
        GROUP BY p.product_id, p.product_name, c.category_name, p.cogs
        ORDER BY profit DESC;
BEGIN
    OPEN cur;
    LOOP
        FETCH cur INTO rec;
        EXIT WHEN NOT FOUND;
        product_id               := rec.product_id;
        product_name             := rec.product_name;
        category_name            := rec.category_name;
        total_revenue            := rec.revenue;
        total_cost               := rec.cost;
        total_profit             := rec.profit;
        profit_margin_percentage := rec.profit_margin_pct;
        total_units_sold         := rec.units_sold;
        avg_profit_per_unit      := rec.avg_profit_unit;
        avg_selling_price        := rec.avg_sell_price;
        avg_cost_price           := rec.avg_cost;
        RETURN NEXT;
    END LOOP;
    CLOSE cur;
END;
$$;
```

**Advanced Concepts Used**:
- **Explicit cursor with OPEN/FETCH/CLOSE** — demonstrates PL/pgSQL procedural cursor lifecycle
- **Profit margin formula**: $\text{margin\%} = \frac{\text{revenue} - \text{cost}}{\text{revenue}} \times 100$
- **COGS integration**: `p.cogs` (Cost of Goods Sold) is stored per product; multiplying by quantity gives total cost
- **Guarded division with `CASE WHEN SUM(...) > 0`** — handles products with zero revenue safely

---

### 6.2 FUNCTION: `get_revenue_decrease_ratio` (Year-over-Year)

```sql
CREATE OR REPLACE FUNCTION get_revenue_decrease_ratio()
RETURNS TABLE(
    current_year          INT,
    previous_year         INT,
    current_year_revenue  NUMERIC,
    previous_year_revenue NUMERIC,
    revenue_change        NUMERIC,
    change_percentage     NUMERIC,
    change_type           TEXT,
    current_year_orders   INT,
    previous_year_orders  INT,
    order_change          INT,
    order_change_percentage NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH yearly_stats AS (
        SELECT
            EXTRACT(YEAR FROM o.order_date)::INT AS year,
            SUM(o.total_amount)::NUMERIC         AS total_revenue,
            COUNT(DISTINCT o.order_id)::INT       AS total_orders
        FROM orders o
        WHERE o.order_status NOT IN ('Cancelled', 'Refunded')
        GROUP BY EXTRACT(YEAR FROM o.order_date)
    ),
    year_comparison AS (
        SELECT
            curr.year                            AS curr_year,
            prev.year                            AS prev_year,
            curr.total_revenue                   AS curr_revenue,
            prev.total_revenue                   AS prev_revenue,
            (curr.total_revenue - prev.total_revenue)::NUMERIC AS rev_change,
            CASE
                WHEN prev.total_revenue > 0
                THEN ((curr.total_revenue - prev.total_revenue)
                      / prev.total_revenue * 100)::NUMERIC
                ELSE 0
            END AS change_pct,
            CASE
                WHEN curr.total_revenue > prev.total_revenue THEN 'Increase'
                WHEN curr.total_revenue < prev.total_revenue THEN 'Decrease'
                ELSE 'No Change'
            END AS chg_type,
            curr.total_orders                    AS curr_orders,
            prev.total_orders                    AS prev_orders,
            (curr.total_orders - prev.total_orders)::INT AS ord_change,
            CASE
                WHEN prev.total_orders > 0
                THEN ((curr.total_orders - prev.total_orders)::NUMERIC
                      / prev.total_orders * 100)::NUMERIC
                ELSE 0
            END AS ord_change_pct
        FROM yearly_stats curr
        LEFT JOIN yearly_stats prev ON prev.year = curr.year - 1
        WHERE prev.year IS NOT NULL
    )
    SELECT curr_year, prev_year, curr_revenue, prev_revenue,
           rev_change, change_pct, chg_type, curr_orders,
           prev_orders, ord_change, ord_change_pct
    FROM year_comparison
    ORDER BY curr_year DESC;
END;
$$;
```

**Advanced Concepts Used**:
- **Self-join on CTE** (`LEFT JOIN yearly_stats prev ON prev.year = curr.year - 1`) — compares each year to the immediately preceding year without a subquery per row
- **`WHERE prev.year IS NOT NULL`** — filters out the earliest year that has no prior comparison year
- **Dual CTE chaining** (`yearly_stats` → `year_comparison`) — first aggregates, then computes deltas in a clean two-step pipeline

---

### 6.3 FUNCTION: `get_yoy_revenue_growth` (Rich Multi-Metric)

```sql
-- Key excerpt: multiple CTEs + top growth/decline category detection
WITH current_year_data AS (
    SELECT SUM(o.total_amount)::NUMERIC AS revenue, ...
    FROM orders o WHERE EXTRACT(YEAR FROM o.order_date)::INT = target_year
    AND o.order_status NOT IN ('Cancelled', 'Refunded')
),
previous_year_data AS (
    SELECT SUM(o.total_amount)::NUMERIC AS revenue, ...
    FROM orders o WHERE EXTRACT(YEAR FROM o.order_date)::INT = target_year - 1
    AND o.order_status NOT IN ('Cancelled', 'Refunded')
),
category_growth AS (
    SELECT c.category_name,
        ((curr_rev - prev_rev) / NULLIF(prev_rev, 0) * 100) AS growth_pct
    FROM ...
    ORDER BY growth_pct DESC
)
SELECT ...,
    (SELECT category_name FROM category_growth ORDER BY growth_pct DESC LIMIT 1) AS top_growth_category,
    (SELECT category_name FROM category_growth ORDER BY growth_pct ASC  LIMIT 1) AS top_decline_category
FROM ... ;
```

**Advanced Concepts Used**:
- **Scalar subqueries in SELECT** to pick the single top-growth and top-decline category
- **`NULLIF(prev_rev, 0)`** division guard
- **Multi-CTE pipeline** with 4+ CTEs for clean staged computation
- Returns: YoY % change, order count comparison, customer count, AOV growth, top/decline category

---

### 6.4 FUNCTION: `get_monthly_revenue_drop_analysis`

**Key concept excerpt**:

```sql
CREATE OR REPLACE FUNCTION get_monthly_revenue_drop_analysis(
    p_threshold_percent NUMERIC DEFAULT 20
)
RETURNS TABLE( ... recommendations TEXT )
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
    reference_date DATE := '2025-12-31'::DATE;
BEGIN
    FOR rec IN
        WITH month_series AS (
            SELECT generate_series(
                min_date + INTERVAL '1 month',
                LEAST(max_date, DATE_TRUNC('month', reference_date)),
                INTERVAL '1 month'
            )::DATE AS month_start
        ), ...
    LOOP
        -- Classify severity: 'Severe Drop', 'Moderate Drop', 'Slight Drop', 'Growth'
        -- Identify worst-performing category and seller for that month
        -- Generate text recommendation
        RETURN NEXT;
    END LOOP;
END;
$$;
```

**Advanced Concepts Used**:
- **`generate_series`** for gap-free month iteration
- **`FOR rec IN`** loop — implicit cursor over a complex multi-CTE query
- **`LEAST(max_date, reference_date)`** — caps analysis to the reference date, preventing future-month comparisons
- **`recommendations TEXT`** output — generates human-readable advice (e.g., "Investigate decline in Electronics category")
- **Severity classification** using configurable `p_threshold_percent`

---

## Phase 7 — Triggers & Database Automation

### 7.1 TRIGGER: Auto-Update Order Total Amount

```sql
-- Step 1: Trigger Function
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders
    SET total_amount = (
        SELECT COALESCE(SUM(line_total), 0)
        FROM order_items
        WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    )
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Attach Trigger
CREATE TRIGGER trigger_update_order_total
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_order_total();
```

**Explanation**:
- Fires **AFTER** any DML on `order_items`
- `COALESCE(NEW.order_id, OLD.order_id)` — handles all three operations: INSERT (NEW exists), DELETE (OLD exists), UPDATE (NEW exists)
- Recalculates `orders.total_amount` as the fresh sum of all current `line_total` values for that order
- Ensures `total_amount` is always accurate without requiring application-layer calculation

---

### 7.2 TRIGGER: Enforce Stock Limit on Sale

```sql
CREATE OR REPLACE FUNCTION fn_enforce_stock_limit_on_sale()
RETURNS TRIGGER AS $$
DECLARE
    current_stock INT;
BEGIN
    SELECT stock_remaining INTO current_stock
    FROM inventory
    WHERE product_id = NEW.product_id;

    IF current_stock IS NULL OR current_stock < NEW.quantity THEN
        RAISE EXCEPTION
            'Inventory Error: Insufficient stock for Product ID %. Available: %, Requested: %',
            NEW.product_id, COALESCE(current_stock, 0), NEW.quantity;
    END IF;

    UPDATE inventory
    SET stock_remaining = stock_remaining - NEW.quantity
    WHERE product_id = NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_enforce_stock_limit_on_sale
BEFORE INSERT ON order_items
FOR EACH ROW
EXECUTE FUNCTION fn_enforce_stock_limit_on_sale();
```

**Explanation**:
- Fires **BEFORE INSERT** on `order_items` — the insertion is blocked before it commits if stock is insufficient
- **`RAISE EXCEPTION`** returns a descriptive error message to the calling application, including the product ID, available stock, and requested quantity
- **Automatic stock deduction**: On valid insert, `stock_remaining` is reduced by the ordered quantity — no application code needed
- This is both a **validation trigger** (prevent bad data) and an **automation trigger** (maintain inventory)

---

## Phase 8 — Advanced Deep Analytics

### 8.1 FUNCTION: `get_multiple_failed_payments` (Fraud Detection)

```sql
CREATE OR REPLACE FUNCTION get_multiple_failed_payments(
    p_days        INT DEFAULT 15,
    p_min_attempts INT DEFAULT 2
)
RETURNS TABLE(
    customer_id    INT,
    first_name     VARCHAR,
    last_name      VARCHAR,
    email          VARCHAR,
    failed_attempts BIGINT,
    last_failed_date TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT c.customer_id, c.first_name, c.last_name, c.email,
           COUNT(p.payment_id)    AS failed_attempts,
           MAX(p.payment_date)    AS last_failed_date
    FROM customers c
    JOIN orders o   ON o.customer_id = c.customer_id
    JOIN payments p ON p.order_id    = o.order_id
    WHERE p.payment_status = 'FAILED'
      AND p.payment_date >= DATE '2025-12-31' - (p_days * INTERVAL '1 day')
    GROUP BY c.customer_id, c.first_name, c.last_name, c.email
    HAVING COUNT(p.payment_id) >= p_min_attempts
    ORDER BY failed_attempts DESC;
END;
$$;
```

**Advanced Concepts Used**:
- **Configurable lookback window** (`p_days`) — analysts can adjust the detection period
- **`HAVING` clause** filters for fraud threshold (≥ N failed attempts) after grouping
- **Dynamic interval**: `(p_days * INTERVAL '1 day')` constructs the time window programmatically

---

### 8.2 FUNCTION: `get_high_return_customers` (Fraud Detection)

```sql
CREATE OR REPLACE FUNCTION get_high_return_customers(
    p_min_returns    INT     DEFAULT 3,
    p_min_percentage NUMERIC DEFAULT 10
)
RETURNS TABLE( customer_id INT, ..., return_percentage NUMERIC )
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT c.customer_id, c.first_name, c.last_name, c.email,
           COUNT(r.return_id)            AS total_returns,
           COUNT(oi.order_item_id)       AS total_items,
           ROUND(
               COUNT(r.return_id)::NUMERIC
               / NULLIF(COUNT(oi.order_item_id), 0) * 100, 2
           )                             AS return_percentage
    FROM customers c
    JOIN orders o    ON o.customer_id = c.customer_id
    JOIN order_items oi ON oi.order_id  = o.order_id
    LEFT JOIN returns r ON r.order_item_id = oi.order_item_id
    GROUP BY c.customer_id, c.first_name, c.last_name, c.email
    HAVING COUNT(r.return_id) >= p_min_returns
       AND (COUNT(r.return_id)::NUMERIC
            / NULLIF(COUNT(oi.order_item_id), 0) * 100) > p_min_percentage
    ORDER BY return_percentage DESC;
END;
$$;
```

**Advanced Concepts Used**:
- **Dual `HAVING` condition** — both absolute threshold AND percentage threshold must be met
- **`NULLIF` in `HAVING`** — prevents division-by-zero in the HAVING filter itself
- **`LEFT JOIN returns`** — customers with zero returns are included as 0%, not excluded

---

### 8.3 FUNCTION: `get_low_stock_products`

```sql
CREATE OR REPLACE FUNCTION get_low_stock_products()
RETURNS TABLE(
    product_id         INT,
    product_name       VARCHAR,
    warehouse_name     VARCHAR,
    warehouse_id       INT,
    stock_remaining    INT,
    min_stock_level    INT,
    stock_deficit      INT,
    deficit_percentage NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.product_id, p.product_name, w.warehouse_name, w.warehouse_id,
        i.stock_remaining, i.min_stock_level,
        (i.min_stock_level - i.stock_remaining)::INT AS stock_deficit,
        ROUND(
            ((i.min_stock_level - i.stock_remaining)::NUMERIC
             / NULLIF(i.min_stock_level, 0) * 100), 2
        ) AS deficit_percentage
    FROM inventory i
    JOIN products p   ON p.product_id   = i.product_id
    JOIN warehouses w ON w.warehouse_id = i.warehouse_id
    WHERE i.stock_remaining <= i.min_stock_level
    ORDER BY deficit_percentage DESC, stock_deficit DESC;
END;
$$;
```

**Explanation**: The `WHERE i.stock_remaining <= i.min_stock_level` filter uses per-row thresholds stored in `inventory.min_stock_level`. `deficit_percentage` quantifies how far below safe levels the stock has fallen. Results are ordered by severity (highest deficit % first).

---

### 8.4 FUNCTION: `get_fast_moving_products`

```sql
CREATE OR REPLACE FUNCTION get_fast_moving_products(
    p_days     INT DEFAULT 7,
    p_min_units INT DEFAULT 30
)
RETURNS TABLE( ..., avg_daily_sales NUMERIC, velocity_rating VARCHAR )
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT p.product_id, p.product_name, c.category_name,
           SUM(oi.quantity) AS units_sold,
           p_days           AS days_analyzed,
           ROUND(SUM(oi.quantity)::NUMERIC / p_days, 2) AS avg_daily_sales,
           CASE
               WHEN SUM(oi.quantity) >= p_min_units * 3 THEN 'Very High'::VARCHAR
               WHEN SUM(oi.quantity) >= p_min_units * 2 THEN 'High'::VARCHAR
               WHEN SUM(oi.quantity) >= p_min_units     THEN 'Medium'::VARCHAR
               ELSE 'Low'::VARCHAR
           END AS velocity_rating
    FROM order_items oi
    JOIN products p   ON p.product_id   = oi.product_id
    JOIN categories c ON c.category_id  = p.category_id
    JOIN orders o     ON o.order_id     = oi.order_id
    WHERE o.order_date >= DATE '2025-12-31' - (p_days || ' days')::INTERVAL
      AND o.order_status NOT IN ('Cancelled', 'Refunded')
    GROUP BY p.product_id, p.product_name, c.category_name
    HAVING SUM(oi.quantity) >= p_min_units
    ORDER BY units_sold DESC;
END;
$$;
```

**Advanced Concepts Used**:
- **Velocity rating via CASE WHEN multiplier** (`p_min_units * 3`, `* 2`) — scales threshold relative to the configurable parameter
- **Dynamic interval construction**: `(p_days || ' days')::INTERVAL`
- **`HAVING SUM(oi.quantity) >= p_min_units`** — filters below-threshold products after aggregation

---

### 8.5 FUNCTION: `get_inventory_intelligence_score`

```sql
-- Key scoring logic (condensed):
CASE
    WHEN stock_remaining <= min_stock_level AND units_sold > p_high_velocity_threshold
        THEN 'CRITICAL'      -- priority_score = 1
    WHEN stock_remaining <= min_stock_level
        THEN 'HIGH'          -- priority_score = 2
    WHEN units_sold > p_high_velocity_threshold
        THEN 'MEDIUM'        -- priority_score = 3
    WHEN stock_remaining > min_stock_level * 3 AND units_sold < 10
        THEN 'OVERSTOCKED'   -- priority_score = 4
    ELSE 'LOW'               -- priority_score = 5
END AS inventory_risk,

-- Days of stock remaining calculation:
CASE
    WHEN units_sold > 0
    THEN ROUND((stock_remaining::NUMERIC / (units_sold::NUMERIC / p_days)), 1)
    ELSE 999.9
END AS days_of_stock_remaining
```

**Advanced Concepts Used**:
- **Multi-condition scoring matrix**: Combines low stock AND high velocity for CRITICAL classification
- **Days-of-stock formula**: $\frac{\text{stock\_remaining}}{\text{units\_sold} / \text{days}} = \text{days until stockout}$
- **`999.9` sentinel value**: Represents "infinite" days of stock for zero-velocity products
- **CTE `sales_data`**: First aggregates recent sales, then joins to inventory for the scoring pass

---

### 8.6 FUNCTION: `get_warehouse_load_intelligence`

```sql
SELECT
    w.warehouse_id, w.warehouse_name, w.location,
    COUNT(i.inventory_id)                          AS products_stored,
    SUM(i.stock_remaining)                         AS total_units,
    COUNT(CASE WHEN i.stock_remaining <= i.min_stock_level THEN 1 END) AS low_stock_count,
    ROUND(AVG(i.stock_remaining::NUMERIC), 2)      AS avg_stock_per_product,
    CASE
        WHEN SUM(i.stock_remaining) >= 6000 THEN 'High Capacity'
        WHEN SUM(i.stock_remaining) >= 3000 THEN 'Medium Capacity'
        WHEN SUM(i.stock_remaining) >= 1000 THEN 'Low Capacity'
        ELSE 'Very Low'
    END AS utilization_score
FROM warehouses w
JOIN inventory i ON i.warehouse_id = w.warehouse_id
GROUP BY w.warehouse_id, w.warehouse_name, w.location
ORDER BY total_units DESC;
```

**Advanced Concepts Used**:
- **`COUNT(CASE WHEN ... THEN 1 END)`** — conditional count without a WHERE clause, counting low-stock rows within the same aggregation pass
- **Capacity tier classification** via absolute thresholds on total unit count

---

## Summary Table: SQL Objects by Phase

| Phase | Type | Object Name | Key Concept |
|---|---|---|---|
| 1 | TABLE | `orders`, `inventory`, `categories` | Schema, FK, self-reference |
| 2 | VIEW | `daily_sales_view` | Date aggregation |
| 2 | FUNCTION | `get_revenue_per_seller` | Explicit cursor |
| 2 | VIEW | `quantity_sold_by_*` | Category/product aggregation |
| 3 | FUNCTION | `get_monthly_revenue_per_year` | Cursor, TO_CHAR |
| 3 | FUNCTION | `get_average_order_value` | PERCENTILE_CONT, CTE |
| 3 | FUNCTION | `get_customer_lifetime_value` | Segmentation, CONCAT, CTE |
| 4 | FUNCTION | `get_inactive_sellers_analytics` | generate_series, json_build_object, NOT IN |
| 5 | VIEW | `product_returns_analytics` | COUNT FILTER, LEFT JOIN |
| 6 | FUNCTION | `get_product_profit_margin` | Cursor, COGS math |
| 6 | FUNCTION | `get_revenue_decrease_ratio` | Self-join CTE |
| 6 | FUNCTION | `get_yoy_revenue_growth` | Multi-CTE, scalar subquery |
| 6 | FUNCTION | `get_monthly_revenue_drop_analysis` | generate_series, FOR loop, LEAST |
| 7 | TRIGGER | `trigger_update_order_total` | AFTER INSERT/UPDATE/DELETE |
| 7 | TRIGGER | `trg_inventory_enforce_stock_limit_on_sale` | BEFORE INSERT, RAISE EXCEPTION |
| 8 | FUNCTION | `get_multiple_failed_payments` | HAVING, dynamic interval |
| 8 | FUNCTION | `get_high_return_customers` | Dual HAVING, NULLIF |
| 8 | FUNCTION | `get_low_stock_products` | Per-row threshold comparison |
| 8 | FUNCTION | `get_fast_moving_products` | Velocity rating, HAVING |
| 8 | FUNCTION | `get_inventory_intelligence_score` | Multi-factor scoring, CTE |
| 8 | FUNCTION | `get_warehouse_load_intelligence` | Conditional COUNT |

---

*Continue in REPORT_PART5.md → Limitations, Modifications, Individual Contribution & GitHub Link*
