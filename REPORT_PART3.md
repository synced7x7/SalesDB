# SalesDB — Lab Report
## Part 3: Procedural SQL — Phase 1 through Phase 5

---

## Overview

This section documents all SQL constructs from Phase 1 (Schema) through Phase 5 (Returns & Risk Analysis). Each item includes the object type (VIEW, FUNCTION, TRIGGER, QUERY), a code snippet, and a detailed explanation.

---

## Phase 1 — Schema Creation

### 1.1 Table: `orders`

```sql
CREATE TABLE public.orders (
  order_id   integer NOT NULL,
  order_date timestamp without time zone,
  customer_id integer,
  order_status character varying,
  total_amount numeric,
  CONSTRAINT orders_pkey PRIMARY KEY (order_id),
  CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id)
    REFERENCES public.customers(customer_id)
);
```

**Explanation**: The `orders` table is the central hub of all transaction data. `order_status` tracks lifecycle stages (Pending → Shipped → Completed / Cancelled / Refunded). `total_amount` is denormalized here for fast reads and kept accurate by an AFTER INSERT/UPDATE/DELETE trigger on `order_items`.

---

### 1.2 Table: `inventory`

```sql
CREATE TABLE public.inventory (
  inventory_id  integer NOT NULL,
  product_id    integer,
  warehouse_id  integer,
  stock_remaining integer,
  restock_date  date,
  min_stock_level integer,
  CONSTRAINT inventory_pkey PRIMARY KEY (inventory_id),
  CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES public.products(product_id),
  CONSTRAINT inventory_warehouse_id_fkey FOREIGN KEY (warehouse_id)
    REFERENCES public.warehouses(warehouse_id)
);
```

**Explanation**: `min_stock_level` is the per-row threshold. This enables fine-grained control — a high-demand product in a large warehouse can have a higher minimum than a slow-mover. This design is intentionally exploited by the stock-enforcement trigger.

---

### 1.3 Self-Referencing `categories`

```sql
CREATE TABLE public.categories (
  category_id       integer NOT NULL,
  category_name     character varying,
  parent_category_id integer,
  CONSTRAINT categories_pkey PRIMARY KEY (category_id),
  CONSTRAINT categories_parent_category_id_fkey
    FOREIGN KEY (parent_category_id) REFERENCES public.categories(category_id)
);
```

**Explanation**: The `parent_category_id` references the same `categories` table. This enables a tree structure (e.g., *Clothing → Men's Clothing → Shirts*) without a separate hierarchy table. Products link to leaf or intermediate categories.

---

## Phase 2 — Core Transactional Aggregations

### 2.1 VIEW: `daily_sales_view`

```sql
CREATE OR REPLACE VIEW daily_sales_view AS
SELECT
    DATE(o.order_date)          AS sales_date,
    SUM(oi.line_total)          AS total_sales_amount,
    COUNT(DISTINCT o.order_id)  AS total_orders,
    SUM(oi.quantity)            AS total_quantity_sold
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY DATE(o.order_date)
ORDER BY sales_date;
```

**Explanation**: This view is queried directly by the backend route `/api/daily-sales`. It aggregates all order line totals per calendar date. Using `COUNT(DISTINCT o.order_id)` prevents double-counting orders with multiple items. The view is filtered server-side by year range using Supabase `.gte()` / `.lte()`.

---

### 2.2 VIEW: Daily Sales Year Selector

```sql
CREATE OR REPLACE VIEW daily_sales_years AS
SELECT DISTINCT
    EXTRACT(YEAR FROM order_date)::INT AS year
FROM orders
ORDER BY year DESC;
```

**Explanation**: This auxiliary view feeds the year dropdown in the Daily Sales Dashboard. It dynamically lists all years for which order data exists, ensuring the frontend filter stays in sync with actual data coverage.

---

### 2.3 FUNCTION: `get_revenue_per_seller`

```sql
CREATE OR REPLACE FUNCTION get_revenue_per_seller(p_year INT DEFAULT NULL)
RETURNS TABLE(
    seller_name       VARCHAR,
    total_revenue     NUMERIC,
    total_products_sold INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
    cur CURSOR FOR
        SELECT
            s.seller_name,
            SUM(oi.quantity * oi.unit_price)::NUMERIC AS total_revenue,
            SUM(oi.quantity)::INT AS total_products_sold
        FROM sellers s
        JOIN products p   ON s.seller_id = p.seller_id
        JOIN order_items oi ON p.product_id = oi.product_id
        JOIN orders o     ON o.order_id = oi.order_id
        WHERE (p_year IS NULL OR EXTRACT(YEAR FROM o.order_date)::INT = p_year)
        GROUP BY s.seller_id, s.seller_name
        ORDER BY total_revenue DESC;
BEGIN
    OPEN cur;
    LOOP
        FETCH cur INTO rec;
        EXIT WHEN NOT FOUND;
        seller_name         := rec.seller_name;
        total_revenue       := rec.total_revenue;
        total_products_sold := rec.total_products_sold;
        RETURN NEXT;
    END LOOP;
    CLOSE cur;
END;
$$;
```

**Explanation**: Uses an **explicit cursor** (`CURSOR FOR ... OPEN ... FETCH ... LOOP`) to iterate over seller revenue results. The `p_year` parameter is nullable — when `NULL`, all years are included. This cursor-based approach demonstrates PL/pgSQL procedural iteration rather than a simple `RETURN QUERY`.

---

### 2.4 VIEW: `total_quantity_sold_per_product`

```sql
-- Backing SQL (conceptual - stored as view in Supabase)
SELECT
    p.product_id,
    p.product_name,
    SUM(oi.quantity) AS total_quantity_sold
FROM products p
JOIN order_items oi ON p.product_id = oi.product_id
GROUP BY p.product_id, p.product_name
ORDER BY total_quantity_sold DESC;
```

**Explanation**: Powers the "Per Product" tab in the Quantity Sold Dashboard. Returns the top-performing products by units sold across all time. The view is fetched server-side via Supabase's `.from('total_quantity_sold_per_product').select('*').order(...)`.

---

### 2.5 VIEW: `quantity_sold_by_category`

```sql
-- Backing SQL
SELECT
    c.category_name,
    SUM(oi.quantity) AS total_quantity_sold
FROM categories c
JOIN products p ON c.category_id = p.category_id
JOIN order_items oi ON p.product_id = oi.product_id
GROUP BY c.category_id, c.category_name
ORDER BY total_quantity_sold DESC;
```

**Explanation**: Aggregates sold units by product category. Used in the Pie Chart tab of the Quantity Sold Dashboard and the Revenue Per Category Dashboard.

---

## Phase 3 — Time-Based & Customer-Based Metrics

### 3.1 FUNCTION: `get_monthly_revenue_per_year`

```sql
CREATE OR REPLACE FUNCTION get_monthly_revenue_per_year(p_year INT DEFAULT NULL)
RETURNS TABLE(
    sales_year        INT,
    sales_month       INT,
    month_name        VARCHAR,
    total_revenue     NUMERIC,
    total_orders      INT,
    total_products_sold INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
    cur CURSOR FOR
        SELECT
            EXTRACT(YEAR FROM o.order_date)::INT   AS sales_year,
            EXTRACT(MONTH FROM o.order_date)::INT  AS sales_month,
            TO_CHAR(o.order_date, 'Month')         AS month_name,
            SUM(oi.quantity * oi.unit_price)::NUMERIC AS total_revenue,
            COUNT(DISTINCT o.order_id)::INT        AS total_orders,
            SUM(oi.quantity)::INT                  AS total_products_sold
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        WHERE (p_year IS NULL OR EXTRACT(YEAR FROM o.order_date)::INT = p_year)
        GROUP BY EXTRACT(YEAR FROM o.order_date),
                 EXTRACT(MONTH FROM o.order_date),
                 TO_CHAR(o.order_date, 'Month')
        ORDER BY sales_year DESC, sales_month ASC;
BEGIN
    OPEN cur;
    LOOP
        FETCH cur INTO rec;
        EXIT WHEN NOT FOUND;
        sales_year := rec.sales_year; sales_month := rec.sales_month;
        month_name := rec.month_name; total_revenue := rec.total_revenue;
        total_orders := rec.total_orders; total_products_sold := rec.total_products_sold;
        RETURN NEXT;
    END LOOP;
    CLOSE cur;
END;
$$;
```

**Explanation**: Returns monthly aggregated revenue, order count, and quantity sold. The `p_year` parameter allows filtering to a specific year or returning all years at once. `TO_CHAR(o.order_date, 'Month')` provides the human-readable month label for chart axis display. Uses a cursor for row-by-row procedural return.

---

### 3.2 FUNCTION: `get_average_order_value`

```sql
CREATE OR REPLACE FUNCTION get_average_order_value(p_year INT DEFAULT NULL)
RETURNS TABLE(
    sales_year        INT,
    sales_month       INT,
    month_name        VARCHAR,
    total_revenue     NUMERIC,
    total_orders      INT,
    avg_order_value   NUMERIC,
    min_order_value   NUMERIC,
    max_order_value   NUMERIC,
    median_order_value NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH order_values AS (
        SELECT
            o.order_id,
            EXTRACT(YEAR FROM o.order_date)::INT    AS year_val,
            EXTRACT(MONTH FROM o.order_date)::INT   AS month_val,
            TO_CHAR(o.order_date, 'Month')          AS month_val_name,
            SUM(oi.quantity * oi.unit_price)        AS order_value
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        WHERE (p_year IS NULL OR EXTRACT(YEAR FROM o.order_date)::INT = p_year)
        GROUP BY o.order_id, o.order_date
    )
    SELECT
        year_val::INT,
        month_val::INT,
        month_val_name::VARCHAR,
        SUM(order_value)::NUMERIC,
        COUNT(order_id)::INT,
        AVG(order_value)::NUMERIC,
        MIN(order_value)::NUMERIC,
        MAX(order_value)::NUMERIC,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY order_value)::NUMERIC
    FROM order_values
    GROUP BY year_val, month_val, month_val_name
    ORDER BY year_val ASC, month_val ASC;
END;
$$;
```

**Advanced Concepts Used**:
- **`PERCENTILE_CONT(0.5)`** — ordered-set aggregate function computing the true statistical median of order values
- **CTE (`WITH order_values`)** — first computes per-order totals, then the outer query aggregates by month
- **`RETURN QUERY`** — simpler than explicit cursor when query result is directly returned

---

### 3.3 FUNCTION: `get_customer_lifetime_value`

```sql
CREATE OR REPLACE FUNCTION get_customer_lifetime_value(p_year INT DEFAULT NULL)
RETURNS TABLE(
    customer_id          INT,
    customer_name        VARCHAR,
    first_purchase_date  DATE,
    last_purchase_date   DATE,
    total_orders         INT,
    total_revenue        NUMERIC,
    avg_order_value      NUMERIC,
    customer_lifetime_days INT,
    purchase_frequency   NUMERIC,
    customer_segment     VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH customer_metrics AS (
        SELECT
            c.customer_id,
            CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
            MIN(o.order_date)::DATE AS first_purchase,
            MAX(o.order_date)::DATE AS last_purchase,
            COUNT(DISTINCT o.order_id)::INT AS order_count,
            SUM(oi.quantity * oi.unit_price)::NUMERIC AS revenue,
            AVG(oi.quantity * oi.unit_price)::NUMERIC AS avg_order,
            (MAX(o.order_date)::DATE - MIN(o.order_date)::DATE) AS lifetime_days,
            CASE
                WHEN (MAX(o.order_date)::DATE - MIN(o.order_date)::DATE) > 0
                THEN COUNT(DISTINCT o.order_id)::NUMERIC
                     / (MAX(o.order_date)::DATE - MIN(o.order_date)::DATE)::NUMERIC * 30
                ELSE 0
            END AS frequency
        FROM customers c
        JOIN orders o      ON c.customer_id = o.customer_id
        JOIN order_items oi ON o.order_id = oi.order_id
        WHERE (p_year IS NULL OR EXTRACT(YEAR FROM o.order_date)::INT = p_year)
        GROUP BY c.customer_id, c.first_name, c.last_name
    )
    SELECT
        cm.customer_id::INT,
        cm.customer_name::VARCHAR,
        cm.first_purchase::DATE,
        cm.last_purchase::DATE,
        cm.order_count::INT,
        cm.revenue::NUMERIC,
        cm.avg_order::NUMERIC,
        cm.lifetime_days::INT,
        cm.frequency::NUMERIC,
        CASE
            WHEN cm.revenue >= 6900050 THEN 'VIP'
            WHEN cm.revenue >= 1471000 THEN 'High Value'
            WHEN cm.revenue >= 808000  THEN 'Medium Value'
            ELSE 'Low Value'
        END::VARCHAR AS segment
    FROM customer_metrics cm
    ORDER BY cm.revenue DESC;
END;
$$;
```

**Advanced Concepts Used**:
- **Customer Segmentation via `CASE WHEN`**: Thresholds classify customers into VIP, High Value, Medium Value, Low Value based on cumulative spend
- **Purchase Frequency Formula**: `orders_count / lifetime_days * 30` normalizes to orders-per-month
- **CTE + `RETURN QUERY`**: Two-stage query — first compute per-customer metrics, then segment and sort

---

## Phase 4 — Inactive Sellers Detection

### 4.1 FUNCTION: `get_inactive_sellers_analytics`

```sql
CREATE OR REPLACE FUNCTION get_inactive_sellers_analytics(
    p_start_date DATE,
    p_end_date   DATE
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_result         JSON;
    v_inactive_count INT;
    v_total_sellers  INT;
    v_inactive_ratio NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_total_sellers FROM sellers;

    SELECT COUNT(DISTINCT s.seller_id) INTO v_inactive_count
    FROM sellers s
    WHERE s.seller_id NOT IN (
        SELECT DISTINCT p.seller_id
        FROM products p
        JOIN order_items oi ON p.product_id = oi.product_id
        JOIN orders o       ON oi.order_id  = o.order_id
        WHERE o.order_date::date BETWEEN p_start_date AND p_end_date
    );

    v_inactive_ratio := ROUND(
        (v_inactive_count::NUMERIC / NULLIF(v_total_sellers, 0) * 100), 1
    );

    SELECT json_build_object(
        'summary', json_build_object(
            'inactive_count', v_inactive_count,
            'total_sellers',  v_total_sellers,
            'inactive_ratio', COALESCE(v_inactive_ratio, 0)
        ),
        'trend_data', (
            SELECT json_agg(trend_row ORDER BY month)
            FROM (
                WITH month_series AS (
                    SELECT generate_series(
                        DATE_TRUNC('month', p_start_date::timestamp),
                        DATE_TRUNC('month', p_end_date::timestamp),
                        '1 month'::interval
                    )::DATE AS month
                )
                SELECT
                    TO_CHAR(ms.month, 'YYYY-MM') AS month,
                    ( SELECT COUNT(DISTINCT s.seller_id)
                      FROM sellers s
                      WHERE s.seller_id NOT IN (
                          SELECT DISTINCT p.seller_id
                          FROM products p
                          JOIN order_items oi ON p.product_id = oi.product_id
                          JOIN orders o ON oi.order_id = o.order_id
                          WHERE DATE_TRUNC('month', o.order_date::date::timestamp)
                                = DATE_TRUNC('month', ms.month::timestamp)
                      )
                    ) AS inactive_count
                FROM month_series ms
            ) AS trend_row
        )
        -- ... inactive_sellers list (truncated for report)
    ) INTO v_result;

    RETURN v_result;
END;
$$;
```

**Advanced Concepts Used**:
- **`NOT IN` subquery** for anti-join pattern to find sellers with zero transactions in the date range
- **`generate_series`** to produce a continuous month-by-month sequence even when no data exists for a month (avoids gaps in trend charts)
- **`json_build_object` + `json_agg`** to compose a structured JSON response directly in SQL — the entire analytics payload is returned as a single JSON object
- **`NULLIF`** division guard to prevent division-by-zero in ratio calculation
- **`DATE_TRUNC`** for month-level grouping accuracy

---

## Phase 5 — Returns, Loss & Risk Analysis

### 5.1 VIEW: `product_returns_analytics`

```sql
CREATE OR REPLACE VIEW public.product_returns_analytics AS
SELECT
    p.product_id,
    p.product_name,
    EXTRACT(YEAR  FROM o.order_date) AS sales_year,
    EXTRACT(MONTH FROM o.order_date) AS sales_month,
    COUNT(oi.order_item_id)          AS total_sold,
    COUNT(r.return_id) FILTER (WHERE r.return_status = 'Approved') AS total_returned,
    CASE
        WHEN COUNT(oi.order_item_id) > 0
        THEN (
            COUNT(r.return_id) FILTER (WHERE r.return_status = 'Approved')::float
            / COUNT(oi.order_item_id)::float
        ) * 100
        ELSE 0
    END AS return_rate,
    SUM(CASE WHEN r.return_status = 'Approved'
        THEN (oi.unit_price * oi.quantity) ELSE 0 END) AS revenue_lost
FROM public.products p
JOIN public.order_items oi ON p.product_id = oi.product_id
JOIN public.orders o       ON oi.order_id  = o.order_id
LEFT JOIN public.returns r ON oi.order_item_id = r.order_item_id
GROUP BY p.product_id, p.product_name, sales_year, sales_month;
```

**Advanced Concepts Used**:
- **`COUNT(...) FILTER (WHERE ...)`** — PostgreSQL aggregate filter clause; counts only rows matching the condition (only `'Approved'` returns) without a subquery or CASE inside COUNT
- **`LEFT JOIN` on returns** — preserves all order items even when no return exists, enabling return_rate = 0 for non-returned items
- **Revenue loss calculation** via conditional SUM — computes `unit_price × quantity` only for approved returns

**Backend Aggregation Logic** (in `analyticsController.js`): The view stores per-product-per-month data. The controller applies JavaScript-side grouping to support three views:
- `type=all` → groups all records by `product_id` (all-time rollup)
- `type=year` → filters by `sales_year` or groups across years
- `type=month` → filters by both `sales_year` and `sales_month`

This hybrid SQL+JS approach keeps the view lightweight while supporting flexible time-dimension analysis in one request.

---

*Continue in REPORT_PART4.md → Phase 6–8: Advanced Functions, Triggers & Deep Analytics*
