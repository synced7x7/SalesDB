const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SP_URL, process.env.SP_KEY);

async function testAllTriggers() {
  console.log('🧪 Testing Database Triggers: Financial Calc & Inventory Control\n');

  try {
    // --- SETUP: Create a Dummy Product ---
    // We need a known starting stock to test the inventory trigger accurately.
    const testProductId = 8888;
    const initialStock = 100;
    
    // Cleanup first just in case
    await supabase.from('inventory').delete().eq('product_id', testProductId);
    await supabase.from('products').delete().eq('product_id', testProductId);

    // Create Product
    const { error: prodError } = await supabase.from('products').insert({
        product_id: testProductId,
        product_name: 'Trigger Test Widget',
        price: 100,
        cogs: 50,
        category_id: 1, // Assumes category 1 exists
        seller_id: 1    // Assumes seller 1 exists
    });
    if (prodError) throw new Error(`Setup failed (Product): ${prodError.message}`);

    // Create Inventory
    const { error: invError } = await supabase.from('inventory').insert({
        inventory_id: 8888,
        product_id: testProductId,
        warehouse_id: 1, // Assumes warehouse 1 exists
        stock_remaining: initialStock,
        min_stock_level: 10
    });
    if (invError) throw new Error(`Setup failed (Inventory): ${invError.message}`);
    
    console.log(`✅ SETUP: Created Test Product (Stock: ${initialStock})`);


    // --- TEST 1: Financial Calculation ---
    // 1. Create a Test Order (Total = 0 initially)
    const testOrderId = 99999;
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({ 
        order_id: testOrderId,
        customer_id: 1, 
        order_status: 'Processing',
        total_amount: 0, 
        order_date: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);
    console.log(`✅ Step 1: Created Test Order ID ${order.order_id} (Initial Total: ${order.total_amount})`);

    // 2. Add an Item (Qty: 2, Price: 100, Total: 200)
    // This should trigger BOTH:
    // a) Order Total update (0 -> 200)
    // b) Inventory Deduction (100 -> 98)
    const quantitySold = 2;
    const { error: itemError } = await supabase
      .from('order_items')
      .insert({
        order_item_id: 9999901,
        order_id: order.order_id,
        product_id: testProductId,
        quantity: quantitySold,
        unit_price: 100,
        line_total: 200
      });

    if (itemError) throw new Error(`Failed to add item: ${itemError.message}`);
    console.log(`✅ Step 2: Added Order Item (Qty: ${quantitySold}, Total: 200)`);


    // --- VERIFY 1: Financial Trigger ---
    const { data: updatedOrder } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('order_id', order.order_id)
      .single();

    if (updatedOrder.total_amount === 200) {
      console.log(`✅ PASS: Financial Trigger works (Order Total updated to ${updatedOrder.total_amount})`);
    } else {
      console.log(`❌ FAIL: Financial Trigger failed (Order Total is ${updatedOrder.total_amount})`);
    }

    // --- VERIFY 2: Inventory Trigger (Deduction) ---
    const { data: updatedInv } = await supabase
      .from('inventory')
      .select('stock_remaining')
      .eq('product_id', testProductId)
      .single();

    const expectedStock = initialStock - quantitySold; // 100 - 2 = 98
    
    if (updatedInv.stock_remaining === expectedStock) {
      console.log(`✅ PASS: Inventory Trigger works (Stock decreased to ${updatedInv.stock_remaining})`);
    } else {
      console.log(`❌ FAIL: Inventory Trigger failed (Stock is ${updatedInv.stock_remaining}, expected ${expectedStock})`);
    }


    // --- TEST 2: Inventory Trigger (Insufficient Stock Prevention) ---
    console.log('\n🧪 Testing Insufficient Stock Error...');
    
    const hugeQuantity = 1000;
    const { error: failError } = await supabase
      .from('order_items')
      .insert({
        order_item_id: 9999902,
        order_id: order.order_id,
        product_id: testProductId,
        quantity: hugeQuantity, // This is > 98, should fail
        unit_price: 100,
        line_total: 100000
      });

    if (failError && failError.message.includes('Insufficient stock')) {
       console.log(`✅ PASS: Inventory Trigger correctly blocked sale (Error: ${failError.message})`);
    } else if (failError) {
       console.log(`⚠️  PASS(ish): Operation failed, but different message: ${failError.message}`);
    } else {
       console.log(`❌ FAIL: Inventory Trigger allowed selling ${hugeQuantity} items when only ${updatedInv.stock_remaining} left!`);
    }

    // --- CLEANUP ---
    await supabase.from('order_items').delete().eq('order_id', order.order_id);
    await supabase.from('orders').delete().eq('order_id', order.order_id);
    await supabase.from('inventory').delete().eq('product_id', testProductId);
    await supabase.from('products').delete().eq('product_id', testProductId);
    console.log('\n🧹 Cleanup: Removed test data');

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    if (err.message.includes('duplicate key')) {
        console.log('   (Suggestion: Run cleanup manually or change test ID)');
    }
  }
}

testAllTriggers();
