import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Brain, AlertTriangle, TrendingUp, Package } from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "../styles/DashboardStyles.css";

export default function InventoryIntelligenceScoreDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [velocityThreshold, setVelocityThreshold] = useState(30);
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const navigate = useNavigate();

  const RISK_COLORS = {
    'CRITICAL': '#dc2626',
    'HIGH': '#f97316',
    'MEDIUM': '#f59e0b',
    'OVERSTOCKED': '#6b7280',
    'LOW': '#10b981'
  };

  const RISK_ICONS = {
    'CRITICAL': '🚨',
    'HIGH': '⚠️',
    'MEDIUM': '📊',
    'OVERSTOCKED': '📦',
    'LOW': '✅'
  };

  // Fetch inventory intelligence score
  const fetchInventoryIntelligenceScore = async (selectedDays, selectedThreshold) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/inventory/intelligence-score?days=${selectedDays}&high_velocity_threshold=${selectedThreshold}`);
      
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
      } else {
        console.error("Expected array but got:", json);
        setData([]);
      }
    } catch (err) {
      console.error("Failed to fetch inventory intelligence score:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryIntelligenceScore(days, velocityThreshold);
  }, [days, velocityThreshold]);

  // Filter data by selected risk
  const filteredData = selectedRisk === 'ALL' 
    ? data 
    : data.filter(item => item.inventory_risk === selectedRisk);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-title">{data.product_name}</p>
          <p className="tooltip-item-orange">
            Category: <strong>{data.category_name}</strong>
          </p>
          <p className="tooltip-item-blue">
            Stock: <strong>{parseInt(data.stock_remaining)}</strong> / Min: <strong>{parseInt(data.min_stock_level)}</strong>
          </p>
          <p className="tooltip-item-green">
            Last {days}d Sales: <strong>{parseInt(data.last_30d_sales).toLocaleString()}</strong>
          </p>
          <p className="tooltip-item">
            Days of Stock: <strong>{parseFloat(data.days_of_stock_remaining).toFixed(1)} days</strong>
          </p>
          <p className="tooltip-item">
            Risk: <strong style={{ color: RISK_COLORS[data.inventory_risk] }}>
              {data.inventory_risk}
            </strong>
          </p>
          <p className="tooltip-item" style={{ fontSize: '11px', marginTop: '5px' }}>
            {data.recommended_action}
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
            Products: <strong>{data.value}</strong>
          </p>
          <p className="tooltip-item-green">
            Percentage: <strong>{percentage}%</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate summary statistics
  const calculateStats = () => {
    if (filteredData.length === 0) return { 
      totalProducts: 0,
      criticalCount: 0,
      highCount: 0,
      overstockedCount: 0,
      avgDaysOfStock: 0,
      urgentActions: 0
    };
    
    const totalProducts = filteredData.length;
    const criticalCount = filteredData.filter(item => item.inventory_risk === 'CRITICAL').length;
    const highCount = filteredData.filter(item => item.inventory_risk === 'HIGH').length;
    const overstockedCount = filteredData.filter(item => item.inventory_risk === 'OVERSTOCKED').length;
    
    // Calculate average days of stock (exclude 999.9 which means infinite)
    const validStockDays = filteredData
      .map(item => parseFloat(item.days_of_stock_remaining))
      .filter(days => days < 999);
    const avgDaysOfStock = validStockDays.length > 0 
      ? validStockDays.reduce((sum, val) => sum + val, 0) / validStockDays.length 
      : 0;
    
    const urgentActions = filteredData.filter(item => item.priority_score <= 2).length;
    
    return { 
      totalProducts,
      criticalCount,
      highCount,
      overstockedCount,
      avgDaysOfStock,
      urgentActions
    };
  };

  const stats = calculateStats();

  // Group by risk level
  const getRiskData = () => {
    const risks = {
      'CRITICAL': 0,
      'HIGH': 0,
      'MEDIUM': 0,
      'OVERSTOCKED': 0,
      'LOW': 0
    };
    data.forEach(product => {
      risks[product.inventory_risk]++;
    });
    return Object.keys(risks).map(key => ({
      name: key,
      value: risks[key]
    })).filter(item => item.value > 0);
  };

  const riskData = getRiskData();

  // Group by recommended action
  const getActionData = () => {
    const actions = {};
    data.forEach(product => {
      const action = product.recommended_action;
      if (!actions[action]) {
        actions[action] = { name: action, value: 0 };
      }
      actions[action].value++;
    });
    return Object.values(actions).sort((a, b) => b.value - a.value);
  };

  const actionData = getActionData();

  // Top priority products (priority_score 1 and 2)
  const topPriorityProducts = filteredData
    .filter(item => item.priority_score <= 2)
    .slice(0, 20);

  // Products running out of stock soon (< 15 days)
  const runningOutSoon = filteredData
    .filter(item => parseFloat(item.days_of_stock_remaining) < 15 && parseFloat(item.days_of_stock_remaining) > 0)
    .sort((a, b) => parseFloat(a.days_of_stock_remaining) - parseFloat(b.days_of_stock_remaining))
    .slice(0, 15);

  // Prepare scatter plot data (Stock Level vs Sales Velocity)
  const scatterData = filteredData.map(item => ({
    ...item,
    stock_level: parseInt(item.stock_remaining),
    sales_velocity: parseInt(item.last_30d_sales),
    name: item.product_name.length > 20 ? item.product_name.substring(0, 20) + '...' : item.product_name
  }));

  return (
    <div className="dashboard-container">
      
      <h2 className="dashboard-heading">
        <Brain className="inline-icon" style={{ color: '#8b5cf6' }} />
        Inventory Intelligence Score Dashboard
      </h2>

      {/* Filter Controls */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div>
          <label htmlFor="days-select" className="year-label">
            Analysis Period:
          </label>
          <select
            id="days-select"
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="year-select"
          >
            <option value="7">Last 7 Days</option>
            <option value="14">Last 14 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="60">Last 60 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
        </div>
      </div>

      <h3 className="performance-heading">
        Intelligent Inventory Analysis - Last {days} Days
      </h3>

      {/* Loading State */}
      {loading ? (
        <div className="loading-state">Loading inventory intelligence...</div>
      ) : data.length === 0 ? (
        <div className="empty-state">No inventory data available</div>
      ) : (
        <div>
          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card summary-card-purple">
              <h4 className="card-title">Total Products</h4>
              <p className="card-value">{stats.totalProducts}</p>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '5px' }}>
                {selectedRisk !== 'ALL' ? `Filtered: ${selectedRisk}` : 'All inventory items'}
              </p>
            </div>
            
            <div className="summary-card" style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' }}>
              <h4 className="card-title">Critical Risk</h4>
              <p className="card-value">{stats.criticalCount}</p>
              <p style={{ fontSize: '12px', color: '#fef2f2', marginTop: '5px' }}>
                Urgent action required
              </p>
            </div>
            
            <div className="summary-card summary-card-orange">
              <h4 className="card-title">High Risk</h4>
              <p className="card-value">{stats.highCount}</p>
              <p style={{ fontSize: '12px', color: '#fff', marginTop: '5px' }}>
                Needs attention
              </p>
            </div>

            <div className="summary-card summary-card-blue">
              <h4 className="card-title">Avg Days of Stock</h4>
              <p className="card-value">{stats.avgDaysOfStock.toFixed(1)}</p>
              <p style={{ fontSize: '12px', color: '#fff', marginTop: '5px' }}>
                Days until stockout
              </p>
            </div>
          </div>

          {/* Critical Alert Banner */}
          {stats.criticalCount > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              border: '2px solid #dc2626',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '30px',
              display: 'flex',
              alignItems: 'center',
              gap: '15px'
            }}>
              <div style={{ 
                fontSize: '40px',
                color: '#dc2626'
              }}>🚨</div>
              <div>
                <h4 style={{ 
                  margin: 0, 
                  color: '#991b1b',
                  fontSize: '18px',
                  fontWeight: '700'
                }}>Critical Inventory Alert</h4>
                <p style={{ 
                  margin: '5px 0 0 0', 
                  color: '#7f1d1d',
                  fontSize: '14px'
                }}>
                  <strong>{stats.criticalCount}</strong> product(s) require immediate restocking - high demand products with low stock
                </p>
              </div>
            </div>
          )}

          {/* Overstocked Alert Banner */}
          {stats.overstockedCount > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
              border: '2px solid #6b7280',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '30px',
              display: 'flex',
              alignItems: 'center',
              gap: '15px'
            }}>
              <div style={{ 
                fontSize: '40px',
                color: '#6b7280'
              }}>📦</div>
              <div>
                <h4 style={{ 
                  margin: 0, 
                  color: '#374151',
                  fontSize: '18px',
                  fontWeight: '700'
                }}>Overstocked Items Detected</h4>
                <p style={{ 
                  margin: '5px 0 0 0', 
                  color: '#4b5563',
                  fontSize: '14px'
                }}>
                  <strong>{stats.overstockedCount}</strong> product(s) have excess inventory - consider reducing stock levels
                </p>
              </div>
            </div>
          )}

          {/* Top Priority Products */}
          {topPriorityProducts.length > 0 && (
            <div className="chart-container">
              <h4 className="section-title">
                <AlertTriangle className="inline-icon" style={{ color: '#dc2626', marginRight: '10px' }} />
                Top Priority Products (Urgent Action Required)
              </h4>
              <ResponsiveContainer width="100%" height={Math.max(400, topPriorityProducts.length * 35)}>
                <BarChart
                  layout="vertical"
                  data={topPriorityProducts}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    type="number"
                    label={{ value: 'Last ' + days + 'd Sales', position: 'insideBottom', offset: -10 }}
                    style={{ fontSize: "12px", fill: "#666" }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="product_name" 
                    width={200}
                    interval={0}
                    style={{ fontSize: "11px", fill: "#666" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="last_30d_sales" name="Sales Volume" radius={[0, 6, 6, 0]}>
                    {topPriorityProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.inventory_risk]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Risk Distribution and Actions */}
          <div className="chart-list">
            {/* Risk Level Distribution */}
            <div className="chart-card">
              <h4 className="section-title">Products by Risk Level</h4>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={riskData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={true}
                  >
                    {riskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Recommended Actions */}
            <div className="chart-card">
              <h4 className="section-title">Recommended Actions Distribution</h4>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={actionData}
                  margin={{ top: 20, right: 20, left: 20, bottom: 120 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis 
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={140}
                    interval={0}
                    style={{ fontSize: "10px", fill: "#6b7280" }}
                  />
                  <YAxis 
                    label={{ value: 'Product Count', angle: -90, position: 'insideLeft' }}
                    style={{ fontSize: "12px", fill: "#6b7280" }}
                  />
                  <Tooltip />
                  <Bar 
                    dataKey="value" 
                    name="Products"
                    fill="#8b5cf6" 
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Running Out Soon */}
          {runningOutSoon.length > 0 && (
            <div className="chart-container">
              <h4 className="section-title">
                <TrendingUp className="inline-icon" style={{ color: '#f59e0b', marginRight: '10px' }} />
                Products Running Out Soon (&lt; 15 Days of Stock)
              </h4>
              <ResponsiveContainer width="100%" height={Math.max(400, runningOutSoon.length * 30)}>
                <BarChart
                  layout="vertical"
                  data={runningOutSoon}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    type="number"
                    label={{ value: 'Days of Stock Remaining', position: 'insideBottom', offset: -10 }}
                    style={{ fontSize: "12px", fill: "#666" }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="product_name" 
                    width={180}
                    interval={0}
                    style={{ fontSize: "11px", fill: "#666" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="days_of_stock_remaining" name="Days Left" radius={[0, 6, 6, 0]}>
                    {runningOutSoon.map((entry, index) => {
                      const days = parseFloat(entry.days_of_stock_remaining);
                      const color = days < 5 ? '#dc2626' : days < 10 ? '#f97316' : '#f59e0b';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}


          {/* Stock Remaining vs Min Stock Level Comparison */}
          <div className="chart-container">
            <h4 className="section-title">Stock Level Analysis (Top 20 Products by Priority)</h4>
            <ResponsiveContainer width="100%" height={450}>
              <ComposedChart
                data={filteredData.slice(0, 20)}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="product_name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  style={{ fontSize: "10px", fill: "#666" }}
                />
                <YAxis 
                  label={{ value: 'Units', angle: -90, position: 'insideLeft' }}
                  style={{ fontSize: "12px", fill: "#666" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="stock_remaining" 
                  name="Current Stock"
                  fill="#3b82f6" 
                  radius={[6, 6, 0, 0]}
                />
                <Bar 
                  dataKey="min_stock_level" 
                  name="Min Stock Level"
                  fill="#ef4444" 
                  radius={[6, 6, 0, 0]}
                />
                <Line 
                  type="monotone" 
                  dataKey="last_30d_sales" 
                  name={`Last ${days}d Sales`}
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#10b981" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Data Table */}
          <div className="table-container">
            <h4 className="section-title">
              <Package className="inline-icon" style={{ marginRight: '10px' }} />
              Complete Inventory Intelligence Report
            </h4>
            <table className="data-table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Priority</th>
                  <th className="table-header-cell">Product Name</th>
                  <th className="table-header-cell">Category</th>
                  <th className="table-header-cell-center">Risk Level</th>
                  <th className="table-header-cell-right">Stock</th>
                  <th className="table-header-cell-right">Min Level</th>
                  <th className="table-header-cell-right">Last {days}d Sales</th>
                  <th className="table-header-cell-right">Days Left</th>
                  <th className="table-header-cell">Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((product, index) => (
                  <tr key={index} className="table-row">
                    <td className="table-cell-center">
                      <span style={{
                        padding: "6px 10px",
                        borderRadius: "50%",
                        fontSize: "14px",
                        fontWeight: "700",
                        backgroundColor: product.priority_score <= 2 ? '#dc2626' : product.priority_score === 3 ? '#f59e0b' : '#10b981',
                        color: '#fff',
                        display: 'inline-block',
                        minWidth: '30px'
                      }}>
                        {product.priority_score}
                      </span>
                    </td>
                    <td className="table-cell-bold">{product.product_name}</td>
                    <td className="table-cell">{product.category_name}</td>
                    <td className="table-cell-center">
                      <span style={{
                        padding: "4px 12px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "700",
                        backgroundColor: RISK_COLORS[product.inventory_risk] + '20',
                        color: RISK_COLORS[product.inventory_risk],
                        border: `1px solid ${RISK_COLORS[product.inventory_risk]}`
                      }}>
                        {RISK_ICONS[product.inventory_risk]} {product.inventory_risk}
                      </span>
                    </td>
                    <td className="table-cell-blue" style={{ fontWeight: '700' }}>
                      {parseInt(product.stock_remaining).toLocaleString()}
                    </td>
                    <td className="table-cell-right">
                      {parseInt(product.min_stock_level).toLocaleString()}
                    </td>
                    <td className="table-cell-green">
                      {parseInt(product.last_30d_sales).toLocaleString()}
                    </td>
                    <td className="table-cell-right" style={{ 
                      color: parseFloat(product.days_of_stock_remaining) < 10 ? '#dc2626' : 
                             parseFloat(product.days_of_stock_remaining) < 30 ? '#f59e0b' : '#10b981',
                      fontWeight: '700'
                    }}>
                      {parseFloat(product.days_of_stock_remaining) > 900 
                        ? '∞' 
                        : parseFloat(product.days_of_stock_remaining).toFixed(1)}
                    </td>
                    <td className="table-cell" style={{ 
                      fontSize: '12px',
                      maxWidth: '250px'
                    }}>
                      {product.recommended_action}
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