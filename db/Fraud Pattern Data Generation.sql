-- Function 1: Generate Failed Payment Patterns
CREATE OR REPLACE FUNCTION generate_failed_payments(num_fraudulent_customers INT DEFAULT 10)
RETURNS void AS $$
DECLARE
    v_customer_id INT;
    v_order_id INT;
    v_payment_id INT;
    v_order_item_id INT;
    v_product_id INT;
    v_unit_price DECIMAL(10,2);
    v_total_amount DECIMAL(10,2);
    v_failed_attempts INT;
    i INT;
    j INT;
BEGIN
    SELECT COALESCE(MAX(order_id), 0) INTO v_order_id FROM Orders;
    SELECT COALESCE(MAX(payment_id), 0) INTO v_payment_id FROM Payments;
    SELECT COALESCE(MAX(order_item_id), 0) INTO v_order_item_id FROM Order_Items;
    
    -- Create fraudulent customers with multiple failed payments
    FOR i IN 1..num_fraudulent_customers LOOP
        v_customer_id := floor(random() * 50 + 1)::INT;
        v_failed_attempts := floor(random() * 8 + 3)::INT; -- 3-10 failed attempts
        
        FOR j IN 1..v_failed_attempts LOOP
            v_order_id := v_order_id + 1;
            v_payment_id := v_payment_id + 1;
            v_order_item_id := v_order_item_id + 1;
            
            -- Random product and price
            v_product_id := floor(random() * 50 + 1)::INT;
            SELECT price INTO v_unit_price FROM Products WHERE product_id = v_product_id;
            v_total_amount := v_unit_price * floor(random() * 3 + 1)::INT;
            
            -- Create order in last 7 days
            INSERT INTO Orders (order_id, order_date, customer_id, order_status, total_amount)
            VALUES (
                v_order_id,
                TIMESTAMP '2025-12-31' - (floor(random() * 900)::INT || ' days')::INTERVAL - (floor(random() * 86400)::INT || ' seconds')::INTERVAL,
                v_customer_id,
                'Cancelled',
                v_total_amount
            );
            
            -- Create order item
            INSERT INTO Order_Items (order_item_id, order_id, product_id, quantity, unit_price, line_total)
            VALUES (v_order_item_id, v_order_id, v_product_id, 1, v_unit_price, v_total_amount);
            
            -- Create FAILED payment
            INSERT INTO Payments (payment_id, order_id, payment_date, payment_method, payment_status, amount)
            VALUES (
                v_payment_id,
                v_order_id,
                (SELECT order_date FROM Orders WHERE order_id = v_order_id) + INTERVAL '5 minutes',
                CASE floor(random() * 3)::INT
                    WHEN 0 THEN 'Credit Card'
                    WHEN 1 THEN 'bKash'
                    ELSE 'Nagad'
                END,
                'FAILED',
                v_total_amount
            );
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Generated % fraudulent customers with failed payments', num_fraudulent_customers;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Generate High Return Rate Customers
CREATE OR REPLACE FUNCTION generate_high_return_customers(num_customers INT DEFAULT 15)
RETURNS void AS $$
DECLARE
    v_customer_id INT;
    v_order_id INT;
    v_order_item_id INT;
    v_return_id INT;
    v_payment_id INT;
    v_shipping_id INT;
    v_product_id INT;
    v_unit_price DECIMAL(10,2);
    v_total_amount DECIMAL(10,2);
    v_num_orders INT;
    v_return_rate FLOAT;
    v_return_reasons TEXT[] := ARRAY[
        'Product damaged during shipping',
        'Wrong product delivered',
        'Product not as described',
        'Quality issues',
        'Defective product',
        'Changed mind'
    ];
    i INT;
    j INT;
BEGIN
    SELECT COALESCE(MAX(order_id), 0) INTO v_order_id FROM Orders;
    SELECT COALESCE(MAX(order_item_id), 0) INTO v_order_item_id FROM Order_Items;
    SELECT COALESCE(MAX(return_id), 0) INTO v_return_id FROM Returns;
    SELECT COALESCE(MAX(payment_id), 0) INTO v_payment_id FROM Payments;
    SELECT COALESCE(MAX(shipping_id), 0) INTO v_shipping_id FROM Shipping;
    
    FOR i IN 1..num_customers LOOP
        v_customer_id := floor(random() * 50 + 1)::INT;
        v_num_orders := floor(random() * 15 + 10)::INT; -- 10-25 orders
        v_return_rate := 0.5 + random() * 0.4; -- 50-90% return rate
        
        FOR j IN 1..v_num_orders LOOP
            v_order_id := v_order_id + 1;
            v_order_item_id := v_order_item_id + 1;
            v_payment_id := v_payment_id + 1;
            v_shipping_id := v_shipping_id + 1;
            
            v_product_id := floor(random() * 50 + 1)::INT;
            SELECT price INTO v_unit_price FROM Products WHERE product_id = v_product_id;
            v_total_amount := v_unit_price;
            
            -- Create order
            INSERT INTO Orders (order_id, order_date, customer_id, order_status, total_amount)
            VALUES (
                v_order_id,
                TIMESTAMP '2025-12-31' - (floor(random() * 900)::INT || ' days')::INTERVAL,
                v_customer_id,
                'Delivered',
                v_total_amount
            );
            
            -- Create order item
            INSERT INTO Order_Items (order_item_id, order_id, product_id, quantity, unit_price, line_total)
            VALUES (v_order_item_id, v_order_id, v_product_id, 1, v_unit_price, v_total_amount);
            
            -- Create payment
            INSERT INTO Payments (payment_id, order_id, payment_date, payment_method, payment_status, amount)
            VALUES (
                v_payment_id,
                v_order_id,
                (SELECT order_date FROM Orders WHERE order_id = v_order_id) + INTERVAL '5 minutes',
                'bKash',
                'Completed',
                v_total_amount
            );
            
            -- Create shipping
            INSERT INTO Shipping (shipping_id, order_id, shipping_date, estimated_delivery, actual_delivery, delivery_status, tracking_number)
            VALUES (
                v_shipping_id,
                v_order_id,
                (SELECT order_date::DATE FROM Orders WHERE order_id = v_order_id) + 1,
                (SELECT order_date::DATE FROM Orders WHERE order_id = v_order_id) + 6,
                (SELECT order_date::DATE FROM Orders WHERE order_id = v_order_id) + 5,
                'Delivered',
                'TRK' || LPAD(v_shipping_id::TEXT, 6, '0')
            );
            
            -- Create return based on return rate
            IF random() < v_return_rate THEN
                v_return_id := v_return_id + 1;
                INSERT INTO Returns (return_id, order_item_id, return_reason, return_status, return_date, refund_amount, refund_method)
                VALUES (
                    v_return_id,
                    v_order_item_id,
                    v_return_reasons[floor(random() * array_length(v_return_reasons, 1) + 1)::INT],
                    'Approved',
                    (SELECT order_date::DATE FROM Orders WHERE order_id = v_order_id) + floor(random() * 10 + 3)::INT,
                    v_total_amount,
                    'bKash'
                );
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Generated % high-return customers', num_customers;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Generate Fraudulent Sellers with High Return Rates
CREATE OR REPLACE FUNCTION generate_fraudulent_sellers(num_sellers INT DEFAULT 5)
RETURNS void AS $$
DECLARE
    v_seller_id INT;
    v_order_id INT;
    v_order_item_id INT;
    v_return_id INT;
    v_payment_id INT;
    v_shipping_id INT;
    v_customer_id INT;
    v_product_id INT;
    v_unit_price DECIMAL(10,2);
    v_total_amount DECIMAL(10,2);
    v_num_sales INT;
    v_return_rate FLOAT;
    v_return_reasons TEXT[] := ARRAY[
        'Product damaged during shipping',
        'Wrong product delivered',
        'Product not as described',
        'Quality issues',
        'Defective product'
    ];
    i INT;
    j INT;
BEGIN
    SELECT COALESCE(MAX(order_id), 0) INTO v_order_id FROM Orders;
    SELECT COALESCE(MAX(order_item_id), 0) INTO v_order_item_id FROM Order_Items;
    SELECT COALESCE(MAX(return_id), 0) INTO v_return_id FROM Returns;
    SELECT COALESCE(MAX(payment_id), 0) INTO v_payment_id FROM Payments;
    SELECT COALESCE(MAX(shipping_id), 0) INTO v_shipping_id FROM Shipping;
    
    FOR i IN 1..num_sellers LOOP
        -- Pick a random seller
        v_seller_id := floor(random() * 50 + 1)::INT;
        v_num_sales := floor(random() * 100 + 60)::INT; -- 60-160 sales
        v_return_rate := 0.4 + random() * 0.4; -- 40-80% return rate
        
        FOR j IN 1..v_num_sales LOOP
            v_order_id := v_order_id + 1;
            v_order_item_id := v_order_item_id + 1;
            v_payment_id := v_payment_id + 1;
            v_shipping_id := v_shipping_id + 1;
            
            v_customer_id := floor(random() * 50 + 1)::INT;
            
            -- Get a product from this seller
            SELECT product_id, price INTO v_product_id, v_unit_price 
            FROM Products 
            WHERE seller_id = v_seller_id 
            ORDER BY random() 
            LIMIT 1;
            
            v_total_amount := v_unit_price;
            
            -- Create order
            INSERT INTO Orders (order_id, order_date, customer_id, order_status, total_amount)
            VALUES (
                v_order_id,
                TIMESTAMP '2025-12-31' - (floor(random() * 900)::INT || ' days')::INTERVAL,
                v_customer_id,
                'Delivered',
                v_total_amount
            );
            
            -- Create order item
            INSERT INTO Order_Items (order_item_id, order_id, product_id, quantity, unit_price, line_total)
            VALUES (v_order_item_id, v_order_id, v_product_id, 1, v_unit_price, v_total_amount);
            
            -- Create payment
            INSERT INTO Payments (payment_id, order_id, payment_date, payment_method, payment_status, amount)
            VALUES (
                v_payment_id,
                v_order_id,
                (SELECT order_date FROM Orders WHERE order_id = v_order_id) + INTERVAL '5 minutes',
                'bKash',
                'Completed',
                v_total_amount
            );
            
            -- Create shipping
            INSERT INTO Shipping (shipping_id, order_id, shipping_date, estimated_delivery, actual_delivery, delivery_status, tracking_number)
            VALUES (
                v_shipping_id,
                v_order_id,
                (SELECT order_date::DATE FROM Orders WHERE order_id = v_order_id) + 1,
                (SELECT order_date::DATE FROM Orders WHERE order_id = v_order_id) + 6,
                (SELECT order_date::DATE FROM Orders WHERE order_id = v_order_id) + 5,
                'Delivered',
                'TRK' || LPAD(v_shipping_id::TEXT, 6, '0')
            );
            
            -- Create return based on return rate
            IF random() < v_return_rate THEN
                v_return_id := v_return_id + 1;
                INSERT INTO Returns (return_id, order_item_id, return_reason, return_status, return_date, refund_amount, refund_method)
                VALUES (
                    v_return_id,
                    v_order_item_id,
                    v_return_reasons[floor(random() * array_length(v_return_reasons, 1) + 1)::INT],
                    'Approved',
                    (SELECT order_date::DATE FROM Orders WHERE order_id = v_order_id) + floor(random() * 10 + 3)::INT,
                    v_total_amount,
                    'bKash'
                );
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Generated % fraudulent sellers with high return rates', num_sellers;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Generate Recent High-Selling Fraudulent Sellers (Last 7 Days)
CREATE OR REPLACE FUNCTION generate_recent_fraudulent_activity(num_sellers INT DEFAULT 3)
RETURNS void AS $$
DECLARE
    v_seller_id INT;
    v_order_id INT;
    v_order_item_id INT;
    v_return_id INT;
    v_payment_id INT;
    v_shipping_id INT;
    v_customer_id INT;
    v_product_id INT;
    v_unit_price DECIMAL(10,2);
    v_total_amount DECIMAL(10,2);
    v_num_sales INT;
    v_return_rate FLOAT;
    v_return_reasons TEXT[] := ARRAY[
        'Product damaged during shipping',
        'Wrong product delivered',
        'Product not as described',
        'Quality issues',
        'Defective product'
    ];
    i INT;
    j INT;
BEGIN
    SELECT COALESCE(MAX(order_id), 0) INTO v_order_id FROM Orders;
    SELECT COALESCE(MAX(order_item_id), 0) INTO v_order_item_id FROM Order_Items;
    SELECT COALESCE(MAX(return_id), 0) INTO v_return_id FROM Returns;
    SELECT COALESCE(MAX(payment_id), 0) INTO v_payment_id FROM Payments;
    SELECT COALESCE(MAX(shipping_id), 0) INTO v_shipping_id FROM Shipping;
    
    FOR i IN 1..num_sellers LOOP
        v_seller_id := floor(random() * 50 + 1)::INT;
        v_num_sales := floor(random() * 30 + 15)::INT; -- 15-45 sales in last 7 days
        v_return_rate := 0.5 + random() * 0.3; -- 50-80% return rate
        
        FOR j IN 1..v_num_sales LOOP
            v_order_id := v_order_id + 1;
            v_order_item_id := v_order_item_id + 1;
            v_payment_id := v_payment_id + 1;
            v_shipping_id := v_shipping_id + 1;
            
            v_customer_id := floor(random() * 50 + 1)::INT;
            
            SELECT product_id, price INTO v_product_id, v_unit_price 
            FROM Products 
            WHERE seller_id = v_seller_id 
            ORDER BY random() 
            LIMIT 1;
            
            v_total_amount := v_unit_price;
            
            -- Create order in LAST 7 DAYS
            INSERT INTO Orders (order_id, order_date, customer_id, order_status, total_amount)
            VALUES (
                v_order_id,
                TIMESTAMP '2025-12-31' - (floor(random() * 7)::INT || ' days')::INTERVAL - (floor(random() * 86400)::INT || ' seconds')::INTERVAL,
                v_customer_id,
                'Delivered',
                v_total_amount
            );
            
            INSERT INTO Order_Items (order_item_id, order_id, product_id, quantity, unit_price, line_total)
            VALUES (v_order_item_id, v_order_id, v_product_id, 1, v_unit_price, v_total_amount);
            
            INSERT INTO Payments (payment_id, order_id, payment_date, payment_method, payment_status, amount)
            VALUES (
                v_payment_id,
                v_order_id,
                (SELECT order_date FROM Orders WHERE order_id = v_order_id) + INTERVAL '5 minutes',
                'bKash',
                'Completed',
                v_total_amount
            );
            
            INSERT INTO Shipping (shipping_id, order_id, shipping_date, estimated_delivery, actual_delivery, delivery_status, tracking_number)
            VALUES (
                v_shipping_id,
                v_order_id,
                (SELECT order_date::DATE FROM Orders WHERE order_id = v_order_id) + 1,
                (SELECT order_date::DATE FROM Orders WHERE order_id = v_order_id) + 6,
                (SELECT order_date::DATE FROM Orders WHERE order_id = v_order_id) + 5,
                'Delivered',
                'TRK' || LPAD(v_shipping_id::TEXT, 6, '0')
            );
            
            IF random() < v_return_rate THEN
                v_return_id := v_return_id + 1;
                INSERT INTO Returns (return_id, order_item_id, return_reason, return_status, return_date, refund_amount, refund_method)
                VALUES (
                    v_return_id,
                    v_order_item_id,
                    v_return_reasons[floor(random() * array_length(v_return_reasons, 1) + 1)::INT],
                    'Approved',
                    (SELECT order_date::DATE FROM Orders WHERE order_id = v_order_id) + floor(random() * 3 + 1)::INT,
                    v_total_amount,
                    'bKash'
                );
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Generated % sellers with recent fraudulent activity (last 7 days)', num_sellers;
END;
$$ LANGUAGE plpgsql;

-- Execute all fraud generation functions
SELECT generate_failed_payments(200);
SELECT generate_high_return_customers(100);
SELECT generate_fraudulent_sellers(20);
SELECT generate_recent_fraudulent_activity(5);


-- Quick verification queries
SELECT 'Failed Payments in Last 7 Days' as check_type, COUNT(*) as count
FROM Payments 
WHERE payment_status = 'FAILED' 
AND payment_date >= DATE '2025-12-31' - INTERVAL '7 days';

SELECT 'High Return Customers (>3 returns)' as check_type, COUNT(*) as count
FROM (
    SELECT c.customer_id, COUNT(r.return_id) as returns
    FROM customers c
    JOIN orders o ON o.customer_id = c.customer_id
    JOIN order_items oi ON oi.order_id = o.order_id
    LEFT JOIN returns r ON r.order_item_id = oi.order_item_id
    GROUP BY c.customer_id
    HAVING COUNT(r.return_id) >= 3
) sub;