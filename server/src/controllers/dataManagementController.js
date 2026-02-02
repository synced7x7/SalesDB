const supabase = require('../config/supabaseClient');

// Get table schema (columns and their properties)
exports.getTableSchema = async (req, res) => {
  try {
    const { tableName } = req.params;
    
    // Validate table name to prevent SQL injection
    const validTables = ['customers', 'products', 'sellers', 'categories', 'orders', 
                         'order_items', 'inventory', 'payments', 'shipping', 'returns', 'warehouses'];
    
    if (!validTables.includes(tableName)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    // Query information schema to get column details
    const { data, error } = await supabase.rpc('get_table_schema', { 
      p_table_name: tableName 
    });

    if (error) {
      // Fallback: Get a sample row to infer schema
      const { data: sampleData, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (sampleError) throw sampleError;
      
      // Infer schema from sample data
      const schema = sampleData.length > 0 
        ? Object.keys(sampleData[0]).map(key => ({
            column_name: key,
            data_type: typeof sampleData[0][key],
            is_nullable: 'YES'
          }))
        : [];
      
      return res.json({ tableName, columns: schema });
    }

    res.json({ tableName, columns: data });
  } catch (err) {
    console.error('Error fetching table schema:', err);
    res.status(500).json({ error: 'Failed to fetch table schema' });
  }
};

// Insert a single record
exports.insertSingleRecord = async (req, res) => {
  try {
    const { tableName } = req.params;
    const recordData = req.body;

    // Validate table name
    const validTables = ['customers', 'products', 'sellers', 'categories', 'orders', 
                         'order_items', 'inventory', 'payments', 'shipping', 'returns', 'warehouses'];
    
    if (!validTables.includes(tableName)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    // Insert the record
    const { data, error } = await supabase
      .from(tableName)
      .insert(recordData)
      .select();

    if (error) {
      console.error('Insert error:', error);
      return res.status(400).json({ 
        error: 'Failed to insert record', 
        details: error.message 
      });
    }

    res.json({ 
      success: true, 
      message: 'Record inserted successfully',
      data: data[0]
    });
  } catch (err) {
    console.error('Error inserting record:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Bulk insert records
exports.bulkInsertRecords = async (req, res) => {
  try {
    const { tableName } = req.params;
    const { records } = req.body;

    // Validate table name
    const validTables = ['customers', 'products', 'sellers', 'categories', 'orders', 
                         'order_items', 'inventory', 'payments', 'shipping', 'returns', 'warehouses'];
    
    if (!validTables.includes(tableName)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'Records must be a non-empty array' });
    }

    // Limit bulk insert size
    if (records.length > 1000) {
      return res.status(400).json({ 
        error: 'Too many records. Maximum 1000 records per batch.' 
      });
    }

    // Insert all records
    const { data, error } = await supabase
      .from(tableName)
      .insert(records)
      .select();

    if (error) {
      console.error('Bulk insert error:', error);
      return res.status(400).json({ 
        error: 'Failed to insert records', 
        details: error.message 
      });
    }

    res.json({ 
      success: true, 
      message: `Successfully inserted ${data.length} records`,
      insertedCount: data.length,
      data: data
    });
  } catch (err) {
    console.error('Error in bulk insert:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get list of all tables
exports.getTables = async (req, res) => {
  try {
    const tables = [
      { name: 'customers', displayName: 'Customers' },
      { name: 'products', displayName: 'Products' },
      { name: 'sellers', displayName: 'Sellers' },
      { name: 'categories', displayName: 'Categories' },
      { name: 'orders', displayName: 'Orders' },
      { name: 'order_items', displayName: 'Order Items' },
      { name: 'inventory', displayName: 'Inventory' },
      { name: 'payments', displayName: 'Payments' },
      { name: 'shipping', displayName: 'Shipping' },
      { name: 'returns', displayName: 'Returns' },
      { name: 'warehouses', displayName: 'Warehouses' }
    ];

    res.json({ tables });
  } catch (err) {
    console.error('Error fetching tables:', err);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
};
