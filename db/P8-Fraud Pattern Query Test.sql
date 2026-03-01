--FRAUD PATTERN 1 — Multiple Failed Payments
select
  c.customer_id,
  c.first_name,
  c.last_name,
  COUNT(p.payment_id) as failed_attempts
from
  customers c
  join orders o on o.customer_id = c.customer_id
  join payments p on p.order_id = o.order_id
where
  p.payment_status = 'FAILED'
  and p.payment_date >= DATE '2025-12-31' - INTERVAL '15 days'
group by
  c.customer_id,
  c.first_name,
  c.last_name
having
  COUNT(p.payment_id) >= 3;

--FRAUD PATTERN 2 — High Return Rate Customers (inline expression in HAVING)
select
  c.customer_id,
  c.first_name,
  c.last_name,
  COUNT(r.return_id) as total_returns,
  COUNT(oi.order_item_id) as total_items,
  ROUND(
    COUNT(r.return_id)::NUMERIC / NULLIF(COUNT(oi.order_item_id), 0) * 100,
    2
  ) as return_percentage
from
  customers c
  join orders o on o.customer_id = c.customer_id
  join order_items oi on oi.order_id = o.order_id
  left join returns r on r.order_item_id = oi.order_item_id
group by
  c.customer_id,
  c.first_name,
  c.last_name
having
  COUNT(r.return_id) >= 3
  AND (COUNT(r.return_id)::NUMERIC / NULLIF(COUNT(oi.order_item_id), 0) * 100) > 10;



--High Selling + High Returns (Short Time Span)
select
  s.seller_id,
  s.seller_name,
  COUNT(oi.order_item_id) as items_sold_last_7_days,
  COUNT(r.return_id) as returns_last_7_days,
  ROUND(
    COUNT(r.return_id)::NUMERIC / NULLIF(COUNT(oi.order_item_id), 0) * 100,
    2
  ) as return_percentage
from
  sellers s
  join products p on p.seller_id = s.seller_id
  join order_items oi on oi.product_id = p.product_id
  join orders o on o.order_id = oi.order_id
  left join returns r on r.order_item_id = oi.order_item_id
where
  o.order_date >= DATE '2025-12-31' - INTERVAL '30 days'
group by
  s.seller_id,
  s.seller_name
having
  COUNT(oi.order_item_id) >= 10
  and COUNT(r.return_id)::NUMERIC / COUNT(oi.order_item_id) >= 0.40;

-- --All time return rate 
-- select
--   s.seller_id,
--   s.seller_name,
--   COUNT(oi.order_item_id) as items_sold_last_7_days,
--   COUNT(r.return_id) as returns_last_7_days,
--   ROUND(
--     COUNT(r.return_id)::NUMERIC / NULLIF(COUNT(oi.order_item_id), 0) * 100,
--     2
--   ) as return_percentage
-- from
--   sellers s
--   join products p on p.seller_id = s.seller_id
--   join order_items oi on oi.product_id = p.product_id
--   join orders o on o.order_id = oi.order_id
--   left join returns r on r.order_item_id = oi.order_item_id
-- where
--   o.order_date >= DATE '2025-12-31' - INTERVAL '9000 days'
-- group by
--   s.seller_id,
--   s.seller_name
-- having
--   COUNT(oi.order_item_id) >= 10
--   and COUNT(r.return_id)::NUMERIC / COUNT(oi.order_item_id) >= 0.30;  


-- --Deviation-Based Fraud
-- with
--   seller_returns as (
--     select
--       s.seller_id,
--       COUNT(oi.order_item_id) as sold,
--       COUNT(r.return_id) as returned,
--       COUNT(r.return_id)::NUMERIC / COUNT(oi.order_item_id) as return_rate
--     from
--       sellers s
--       join products p on p.seller_id = s.seller_id
--       join order_items oi on oi.product_id = p.product_id
--       left join returns r on r.order_item_id = oi.order_item_id
--     group by
--       s.seller_id
--   ),
--   platform_avg as (
--     select
--       AVG(return_rate) as avg_return_rate
--     from
--       seller_returns
--   )
-- select
--   sr.seller_id,
--   sr.return_rate,
--   pa.avg_return_rate
-- from
--   seller_returns sr,
--   platform_avg pa
-- where
--   sr.return_rate >= pa.avg_return_rate * 2;

-- select
--   payment_status,
--   COUNT(*)
-- from
--   payments
-- group by
--   payment_status;