import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Warehouse } from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import "../styles/DashboardStyles.css";

export default function WarehouseLoadDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const navigate = useNavigate();

  const UTILIZATION_COLORS = {
    'High Capacity': '#10b981',
    'Medium Capacity': '#3b82f6',
    'Low Capacity': '#f59e0b',
    'Very Low': '#ef4444'
  };

  // Fetch warehouse load intelligence
  const fetchWarehouseLoadIntelligence = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory/warehouse-load');
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const text = await res.text();
      if (!text || text.trim() === '') {
        console.warn("Empty response from server");
        setData([]);
        return;
      }
      
      const json = JSON.parse(text);
      
      if (Array.isArray(json)) {
        setData(json);
        // Set first warehouse as default selection
        if (json.length > 0) {
          setSelectedWarehouse(0);
        }
      } else {
        console.error("Expected array but got:", json);
        setData([]);
      }
    } catch (err) {
      console.error("Failed to fetch warehouse load intelligence:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouseLoadIntelligence();
  }, []);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-title">{data.warehouse_name}</p>
          <p className="tooltip-item-orange">
            Location: <strong>{data.warehouse_location}</strong>
          </p>
          <p className="tooltip-item-blue">
            Total Units: <strong>{parseInt(data.total_units)?.toLocaleString()}</strong>
          </p>
          <p className="tooltip-item-green">
            Products: <strong>{parseInt(data.products_stored)?.toLocaleString()}</strong>
          </p>
          <p className="tooltip-item" style={{ color: '#ef4444' }}>
            Low Stock Items: <strong>{parseInt(data.low_stock_count)?.toLocaleString()}</strong>
          </p>
          <p className="tooltip-item">
            Avg Stock/Product: <strong>{parseFloat(data.avg_stock_per_product).toFixed(2)}</strong>
          </p>
          <p className="tooltip-item">
            Capacity: <strong style={{ color: UTILIZATION_COLORS[data.utilization_score] }}>
              {data.utilization_score}
            </strong>
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for pie charts
  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = payload[0].percent ? (payload[0].percent * 100).toFixed(1) : 0;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-title">{data.name}</p>
          <p className="tooltip-item-blue">
            Warehouses: <strong>{data.value}</strong>
          </p>
          <p className="tooltip-item-green">
            Percentage: <strong>{percentage}%</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom radar tooltip
  const RadarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-title">{payload[0].payload.metric}</p>
          <p className="tooltip-item-blue">
            Score: <strong>{payload[0].value.toFixed(1)}</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate summary statistics
  const calculateStats = () => {
    if (data.length === 0) return { 
      totalWarehouses: 0,
      totalUnitsStored: 0,
      totalProducts: 0,
      totalLowStock: 0,
      avgUtilization: 0,
      highCapacityCount: 0
    };
    
    const totalWarehouses = data.length;
    const totalUnitsStored = data.reduce((sum, item) => sum + parseInt(item.total_units || 0), 0);
    const totalProducts = data.reduce((sum, item) => sum + parseInt(item.products_stored || 0), 0);
    const totalLowStock = data.reduce((sum, item) => sum + parseInt(item.low_stock_count || 0), 0);
    const avgUtilization = totalWarehouses > 0 ? totalUnitsStored / totalWarehouses : 0;
    const highCapacityCount = data.filter(item => item.utilization_score === 'High Capacity').length;
    
    return { 
      totalWarehouses,
      totalUnitsStored,
      totalProducts,
      totalLowStock,
      avgUtilization,
      highCapacityCount
    };
  };

  const stats = calculateStats();

  // Group by utilization score
  const getUtilizationData = () => {
    const scores = {
      'High Capacity': 0,
      'Medium Capacity': 0,
      'Low Capacity': 0,
      'Very Low': 0
    };
    data.forEach(warehouse => {
      scores[warehouse.utilization_score]++;
    });
    return Object.keys(scores).map(key => ({
      name: key,
      value: scores[key]
    })).filter(item => item.value > 0);
  };

  const utilizationData = getUtilizationData();

  // Prepare FIFA-style radar chart data for selected warehouse
  const getWarehouseRadarData = () => {
    if (!data[selectedWarehouse]) return [];
    
    const warehouse = data[selectedWarehouse];
    
    // Normalize values to 0-100 scale for better visualization
    const maxUnits = Math.max(...data.map(w => parseInt(w.total_units)));
    const maxProducts = Math.max(...data.map(w => parseInt(w.products_stored)));
    const maxLowStock = Math.max(...data.map(w => parseInt(w.low_stock_count)));
    const maxAvgStock = Math.max(...data.map(w => parseFloat(w.avg_stock_per_product)));
    
    // Calculate capacity score
    const capacityScore = {
      'High Capacity': 100,
      'Medium Capacity': 75,
      'Low Capacity': 50,
      'Very Low': 25
    }[warehouse.utilization_score] || 50;
    
    // Calculate efficiency (inverse of low stock count - lower is better)
    const efficiencyScore = maxLowStock > 0 
      ? 100 - ((parseInt(warehouse.low_stock_count) / maxLowStock) * 100)
      : 100;
    
    return [
      {
        metric: 'Total Units',
        value: (parseInt(warehouse.total_units) / maxUnits) * 100,
        fullValue: parseInt(warehouse.total_units)
      },
      {
        metric: 'Products Stored',
        value: (parseInt(warehouse.products_stored) / maxProducts) * 100,
        fullValue: parseInt(warehouse.products_stored)
      },
      {
        metric: 'Capacity Level',
        value: capacityScore,
        fullValue: warehouse.utilization_score
      },
      {
        metric: 'Efficiency',
        value: efficiencyScore,
        fullValue: `${efficiencyScore.toFixed(1)}%`
      },
      {
        metric: 'Avg Stock',
        value: (parseFloat(warehouse.avg_stock_per_product) / maxAvgStock) * 100,
        fullValue: parseFloat(warehouse.avg_stock_per_product).toFixed(2)
      },
      {
        metric: 'Stock Health',
        value: parseInt(warehouse.low_stock_count) === 0 ? 100 : Math.max(0, 100 - (parseInt(warehouse.low_stock_count) * 10)),
        fullValue: `${parseInt(warehouse.low_stock_count)} low stock items`
      }
    ];
  };

  const radarData = getWarehouseRadarData();
  const selectedWarehouseData = data[selectedWarehouse];
  const radarColor = selectedWarehouseData ? UTILIZATION_COLORS[selectedWarehouseData.utilization_score] : '#3b82f6';

  // Prepare radar chart data for warehouse comparison
  const getRadarData = () => {
    return data.slice(0, 6).map(warehouse => ({
      warehouse: warehouse.warehouse_name,
      'Total Units': parseInt(warehouse.total_units) / 100, // Scale down for visualization
      'Products': parseInt(warehouse.products_stored),
      'Low Stock': parseInt(warehouse.low_stock_count),
      'Avg Stock': parseFloat(warehouse.avg_stock_per_product)
    }));
  };

  const multiRadarData = getRadarData();

  // Prepare comparison data
  const comparisonData = data.map(warehouse => ({
    name: warehouse.warehouse_name,
    fullName: warehouse.warehouse_name,
    location: warehouse.warehouse_location,
    total_units: parseInt(warehouse.total_units),
    products_stored: parseInt(warehouse.products_stored),
    low_stock_count: parseInt(warehouse.low_stock_count),
    avg_stock_per_product: parseFloat(warehouse.avg_stock_per_product),
    utilization_score: warehouse.utilization_score
  }));

  return (
    <div className="dashboard-container">
      
      <h2 className="dashboard-heading">
        <Warehouse className="inline-icon" style={{ color: '#3b82f6' }} />
        Warehouse Load Intelligence Dashboard
      </h2>

      <h3 className="performance-heading">Current Warehouse Operations Overview</h3>

      {/* Loading State */}
      {loading ? (
        <div className="loading-state">Loading warehouse intelligence...</div>
      ) : data.length === 0 ? (
        <div className="empty-state">No warehouse data available</div>
      ) : (
        <div>
          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card summary-card-purple">
              <h4 className="card-title">Total Warehouses</h4>
              <p className="card-value">{stats.totalWarehouses}</p>
            </div>
            
            <div className="summary-card summary-card-blue">
              <h4 className="card-title">Total Units Stored</h4>
              <p className="card-value">{stats.totalUnitsStored.toLocaleString()}</p>
            </div>
            
            <div className="summary-card summary-card-pink">
              <h4 className="card-title">Total Products</h4>
              <p className="card-value">{stats.totalProducts.toLocaleString()}</p>
            </div>

            <div className="summary-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
              <h4 className="card-title">High Capacity Warehouses</h4>
              <p className="card-value">{stats.highCapacityCount}</p>
            </div>
          </div>

          {/* Alert Card for Low Stock Items */}
          {stats.totalLowStock > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '2px solid #f59e0b',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '30px',
              display: 'flex',
              alignItems: 'center',
              gap: '15px'
            }}>
              <div style={{ 
                fontSize: '40px',
                color: '#f59e0b'
              }}>⚠️</div>
              <div>
                <h4 style={{ 
                  margin: 0, 
                  color: '#92400e',
                  fontSize: '18px',
                  fontWeight: '700'
                }}>Low Stock Alert</h4>
                <p style={{ 
                  margin: '5px 0 0 0', 
                  color: '#78350f',
                  fontSize: '14px'
                }}>
                  <strong>{stats.totalLowStock}</strong> product(s) across all warehouses are at or below minimum stock levels
                </p>
              </div>
            </div>
          )}

          {/* FIFA-Style Warehouse Performance Radar */}
          {data.length > 0 && selectedWarehouseData && (
            <div className="chart-container">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <h4 className="section-title" style={{ margin: 0 }}>
                  Warehouse Performance Metrics - {selectedWarehouseData.warehouse_name}
                </h4>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#666' }}>
                    Select Warehouse:
                  </label>
                  <select
                    value={selectedWarehouse}
                    onChange={(e) => setSelectedWarehouse(parseInt(e.target.value))}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '2px solid #e5e7eb',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    {data.map((warehouse, index) => (
                      <option key={index} value={index}>
                        {warehouse.warehouse_name} - {warehouse.warehouse_location}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Warehouse Info Card */}
              <div style={{
                background: `linear-gradient(135deg, ${radarColor}20 0%, ${radarColor}10 100%)`,
                border: `2px solid ${radarColor}`,
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', marginBottom: '5px' }}>
                    LOCATION
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                    {selectedWarehouseData.warehouse_location}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', marginBottom: '5px' }}>
                    CAPACITY LEVEL
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: radarColor }}>
                    {selectedWarehouseData.utilization_score}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', marginBottom: '5px' }}>
                    TOTAL UNITS
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                    {parseInt(selectedWarehouseData.total_units).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', marginBottom: '5px' }}>
                    PRODUCTS STORED
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                    {parseInt(selectedWarehouseData.products_stored).toLocaleString()}
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={550}>
                <RadarChart data={radarData}>
                  <defs>
                    <linearGradient id={`radarGradient-${selectedWarehouse}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={radarColor} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={radarColor} stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <PolarGrid 
                    stroke="#cbd5e1" 
                    strokeWidth={1.5}
                  />
                  <PolarAngleAxis 
                    dataKey="metric"
                    tick={{ 
                      fill: '#374151', 
                      fontSize: 14,
                      fontWeight: '600'
                    }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]}
                    tick={{ 
                      fill: '#6b7280', 
                      fontSize: 11 
                    }}
                  />
                  <Radar 
                    name={selectedWarehouseData.warehouse_name}
                    dataKey="value" 
                    stroke={radarColor}
                    fill={`url(#radarGradient-${selectedWarehouse})`}
                    fillOpacity={0.7}
                    strokeWidth={3}
                    dot={{ 
                      r: 6, 
                      fill: radarColor,
                      strokeWidth: 2,
                      stroke: '#fff'
                    }}
                    activeDot={{ 
                      r: 8,
                      fill: radarColor,
                      strokeWidth: 3,
                      stroke: '#fff'
                    }}
                  />
                  <Tooltip content={<RadarTooltip />} />
                </RadarChart>
              </ResponsiveContainer>

              {/* Metric Legend */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '15px',
                marginTop: '20px'
              }}>
                {radarData.map((item, index) => (
                  <div 
                    key={index}
                    style={{
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#6b7280',
                      fontWeight: '600',
                      marginBottom: '4px'
                    }}>
                      {item.metric.toUpperCase()}
                    </div>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: '700',
                      color: '#1f2937'
                    }}>
                      Score: {item.value.toFixed(1)}/100
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total Units by Warehouse */}
          <div className="chart-container">
            <h4 className="section-title">Total Units Stored by Warehouse</h4>
            <ResponsiveContainer width="100%" height={Math.max(400, data.length * 60)}>
              <BarChart
                layout="vertical"
                data={comparisonData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  label={{ value: 'Total Units', position: 'insideBottom', offset: -10 }}
                  style={{ fontSize: "12px", fill: "#666" }}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={150}
                  interval={0}
                  style={{ fontSize: "12px", fill: "#666" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total_units" name="Total Units" radius={[0, 6, 6, 0]}>
                  {comparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={UTILIZATION_COLORS[entry.utilization_score]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Utilization and Products Charts */}
          <div className="chart-list">
            {/* Utilization Score Distribution */}
            <div className="chart-card">
              <h4 className="section-title">Warehouses by Capacity Level</h4>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={utilizationData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={true}
                  >
                    {utilizationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={UTILIZATION_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Products Stored */}
            <div className="chart-card">
              <h4 className="section-title">Products Stored by Warehouse</h4>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={comparisonData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis 
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    style={{ fontSize: "11px", fill: "#6b7280" }}
                  />
                  <YAxis 
                    label={{ value: 'Products Count', angle: -90, position: 'insideLeft' }}
                    style={{ fontSize: "12px", fill: "#6b7280" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="products_stored" 
                    name="Products Stored"
                    fill="#8b5cf6" 
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Low Stock Count Chart */}
          <div className="chart-container">
            <h4 className="section-title">Low Stock Items by Warehouse</h4>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={comparisonData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis 
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  style={{ fontSize: "11px", fill: "#6b7280" }}
                />
                <YAxis 
                  label={{ value: 'Low Stock Count', angle: -90, position: 'insideLeft' }}
                  style={{ fontSize: "12px", fill: "#6b7280" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="low_stock_count" 
                  name="Low Stock Items"
                  fill="#ef4444" 
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Composite Comparison Chart */}
          <div className="chart-container">
            <h4 className="section-title">Warehouse Metrics Comparison</h4>
            <ResponsiveContainer width="100%" height={450}>
              <ComposedChart
                data={comparisonData}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  style={{ fontSize: "11px", fill: "#666" }}
                />
                <YAxis 
                  yAxisId="left"
                  label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                  style={{ fontSize: "12px", fill: "#666" }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  label={{ value: 'Avg Stock Per Product', angle: 90, position: 'insideRight' }}
                  style={{ fontSize: "12px", fill: "#666" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  yAxisId="left"
                  dataKey="products_stored" 
                  name="Products Stored"
                  fill="#8b5cf6" 
                  radius={[6, 6, 0, 0]}
                />
                <Bar 
                  yAxisId="left"
                  dataKey="low_stock_count" 
                  name="Low Stock Items"
                  fill="#ef4444" 
                  radius={[6, 6, 0, 0]}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="avg_stock_per_product" 
                  name="Avg Stock/Product"
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#10b981" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Radar Chart for Top 6 Warehouses */}
          {data.length >= 3 && (
            <div className="chart-container">
              <h4 className="section-title">Warehouse Performance Radar (Top 6)</h4>
              <ResponsiveContainer width="100%" height={500}>
                <RadarChart data={multiRadarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis 
                    dataKey="warehouse"
                    style={{ fontSize: "12px", fill: "#666" }}
                  />
                  <PolarRadiusAxis style={{ fontSize: "10px", fill: "#666" }} />
                  <Tooltip />
                  <Legend />
                  <Radar 
                    name="Total Units (÷100)" 
                    dataKey="Total Units" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.3}
                  />
                  <Radar 
                    name="Products" 
                    dataKey="Products" 
                    stroke="#8b5cf6" 
                    fill="#8b5cf6" 
                    fillOpacity={0.3}
                  />
                  <Radar 
                    name="Low Stock" 
                    dataKey="Low Stock" 
                    stroke="#ef4444" 
                    fill="#ef4444" 
                    fillOpacity={0.3}
                  />
                  <Radar 
                    name="Avg Stock" 
                    dataKey="Avg Stock" 
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Data Table */}
          <div className="table-container">
            <h4 className="section-title">Complete Warehouse Intelligence Report</h4>
            <table className="data-table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Rank</th>
                  <th className="table-header-cell">Warehouse Name</th>
                  <th className="table-header-cell">Location</th>
                  <th className="table-header-cell-center">Capacity</th>
                  <th className="table-header-cell-right">Total Units</th>
                  <th className="table-header-cell-right">Products Stored</th>
                  <th className="table-header-cell-right">Low Stock Items</th>
                  <th className="table-header-cell-right">Avg Stock/Product</th>
                </tr>
              </thead>
              <tbody>
                {data.map((warehouse, index) => (
                  <tr 
                    key={index} 
                    className="table-row"
                    style={{ 
                      cursor: 'pointer',
                      backgroundColor: selectedWarehouse === index ? '#f3f4f6' : 'transparent'
                    }}
                    onClick={() => setSelectedWarehouse(index)}
                  >
                    <td className="table-cell">{index + 1}</td>
                    <td className="table-cell-bold">{warehouse.warehouse_name}</td>
                    <td className="table-cell">{warehouse.warehouse_location}</td>
                    <td className="table-cell-center">
                      <span style={{
                        padding: "4px 12px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "700",
                        backgroundColor: UTILIZATION_COLORS[warehouse.utilization_score] + '20',
                        color: UTILIZATION_COLORS[warehouse.utilization_score],
                        border: `1px solid ${UTILIZATION_COLORS[warehouse.utilization_score]}`
                      }}>
                        {warehouse.utilization_score}
                      </span>
                    </td>
                    <td className="table-cell-blue" style={{ fontWeight: '700' }}>
                      {parseInt(warehouse.total_units).toLocaleString()}
                    </td>
                    <td className="table-cell-right">
                      {parseInt(warehouse.products_stored).toLocaleString()}
                    </td>
                    <td className="table-cell-right" style={{ 
                      color: parseInt(warehouse.low_stock_count) > 0 ? '#ef4444' : '#10b981',
                      fontWeight: '700'
                    }}>
                      {parseInt(warehouse.low_stock_count).toLocaleString()}
                    </td>
                    <td className="table-cell-green">
                      {parseFloat(warehouse.avg_stock_per_product).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}