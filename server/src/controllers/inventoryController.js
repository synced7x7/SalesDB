const supabase = require('../config/supabaseClient');

// Low Stock Products
exports.getLowStockProducts = async (req, res) => {
  try {
    const { data, error } = await supabase
      .rpc('get_low_stock_products');

    if (error) {
      console.error('Error fetching low stock products:', error);
      return res.status(500).json(error);
    }

    res.json(data);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Fast Moving Products
exports.getFastMovingProducts = async (req, res) => {
  try {
    const { days = 7, min_units = 30 } = req.query;

    const { data, error } = await supabase
      .rpc('get_fast_moving_products', {
        p_days: parseInt(days),
        p_min_units: parseInt(min_units)
      });

    if (error) {
      console.error('Error fetching fast moving products:', error);
      return res.status(500).json(error);
    }

    res.json(data);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// High Return Rate Products
exports.getHighReturnProducts = async (req, res) => {
  try {
    const { min_return_rate = 0.30 } = req.query;

    const { data, error } = await supabase
      .rpc('get_high_return_products', {
        p_min_return_rate: parseFloat(min_return_rate)
      });

    if (error) {
      console.error('Error fetching high return products:', error);
      return res.status(500).json(error);
    }

    res.json(data);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Warehouse Load Intelligence
exports.getWarehouseLoadIntelligence = async (req, res) => {
  try {
    const { data, error } = await supabase
      .rpc('get_warehouse_load_intelligence');

    if (error) {
      console.error('Error fetching warehouse load intelligence:', error);
      return res.status(500).json(error);
    }

    res.json(data);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Inventory Intelligence Score
exports.getInventoryIntelligenceScore = async (req, res) => {
  try {
    const { days = 30, high_velocity_threshold = 50 } = req.query;

    const { data, error } = await supabase
      .rpc('get_inventory_intelligence_score', {
        p_days: parseInt(days),
        p_high_velocity_threshold: parseInt(high_velocity_threshold)
      });

    if (error) {
      console.error('Error fetching inventory intelligence score:', error);
      return res.status(500).json(error);
    }

    res.json(data);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};