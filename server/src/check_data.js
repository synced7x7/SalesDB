const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const fs = require('fs');

const supabase = createClient(process.env.SP_URL, process.env.SP_KEY);

async function checkExistingData() {
  const tables = ['categories', 'sellers', 'warehouses', 'customers', 'products', 
                  'orders', 'order_items', 'inventory', 'payments', 'shipping', 'returns'];
  
  console.log('📊 Checking existing data in all tables...\n');
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(3);
      
      if (error) {
        console.log(`❌ ${table}: Error - ${error.message}`);
      } else {
        console.log(`✅ ${table}: ${count} rows`);
        if (data && data.length > 0) {
          console.log(`   Sample columns: ${Object.keys(data[0]).join(', ')}`);
          console.log(`   Sample row:`, data[0]);
        }
        console.log('');
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}\n`);
    }
  }
}

checkExistingData();
