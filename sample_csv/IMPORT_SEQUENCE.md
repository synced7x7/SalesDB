# Database Insertion Sequence

To avoid "Foreign Key Constraint" errors (where you try to reference a record that doesn't exist yet), you **must** import your CSV files in this specific order:

## Level 1: Foundation Data (Insert these first)
These tables do not depend on any other tables. You can insert them in any order among themselves, but do them before Level 2.

1. **`sellers.csv`**
2. **`customers.csv`**
3. **`warehouses.csv`**
4. **`categories.csv`**

## Level 2: Product & Order Data (Insert second)
These tables depend on Level 1 data existing effectively.

5. **`products.csv`** 
   - *Requires:* `sellers`, `categories`
6. **`orders.csv`**
   - *Requires:* `customers`

## Level 3: Transaction Details (Insert third)
These tables depend on Products and Orders existing.

7. **`inventory.csv`**
   - *Requires:* `products`, `warehouses`
8. **`order_items.csv`**
   - *Requires:* `orders`, `products`
9. **`payments.csv`**
   - *Requires:* `orders`
10. **`shipping.csv`**
    - *Requires:* `orders`

## Level 4: Post-Transaction (Insert last)
This table depends on individual items in an order existing.

11. **`returns.csv`**
    - *Requires:* `order_items`
