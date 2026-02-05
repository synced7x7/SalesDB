import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
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
} from "recharts";
import "../styles/DashboardStyles.css";

export default function HighReturnProductsDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minReturnRate, setMinReturnRate] = useState(0.10);
  const navigate = useNavigate();

  const RISK_COLORS = {
    'Critical': '#ef4444',
    'High': '#f97316',
    'Medium': '#f59e0b',
    'Low': '#6b7280'
  };

  // Fetch high return products
  const fetchHighReturnProducts = async (selectedMinRate) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/inventory/high-returns?min_return_rate=${selectedMinRate}`);
      
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
      console.error("Failed to fetch high return products:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHighReturnProducts(minReturnRate);
  }, [minReturnRate]);

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
            Units Sold: <strong>{parseInt(data.units_sold)?.toLocaleString()}</strong>
          </p>
          <p className="tooltip-item" style={{ color: '#ef4444' }}>
            Units Returned: <strong>{parseInt(data.units_returned)?.toLocaleString()}</strong>
          </p>
          <p className="tooltip-item-green">
            Net Demand: <strong>{parseInt(data.net_demand)?.toLocaleString()}</strong>
          </p>
          <p className="tooltip-item">
            Return Rate: <strong style={{ color: RISK_COLORS[data.quality_risk_level] }}>
              {parseFloat(data.return_rate).toFixed(2)}%
            </strong>
          </p>
          <p className="tooltip-item">
            Risk Level: <strong style={{ color: RISK_COLORS[data.quality_risk_level] }}>
              {data.quality_risk_level}
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
      const percentage = payload[0].percent ? (payload[0].percent * 100).toFixed(2) : 0;
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
    if (data.length === 0) return { 
      totalProducts: 0,
      totalUnitsSold: 0,
      totalReturned: 0,
      avgReturnRate: 0,
      criticalCount: 0,
      netDemandLoss: 0
    };
    
    const totalProducts = data.length;
    const totalUnitsSold = data.reduce((sum, item) => sum + parseInt(item.units_sold || 0), 0);
    const totalReturned = data.reduce((sum, item) => sum + parseInt(item.units_returned || 0), 0);
    const avgReturnRate = totalUnitsSold > 0 ? (totalReturned / totalUnitsSold) * 100 : 0;
    const criticalCount = data.filter(item => item.quality_risk_level === 'Critical').length;
    const netDemandLoss = totalReturned; // Units lost due to returns
    
    return { 
      totalProducts,
      totalUnitsSold,
      totalReturned,
      avgReturnRate,
      criticalCount,
      netDemandLoss
    };
  };

  const stats = calculateStats();

  // Group by risk level
  const getRiskLevelData = () => {
    const risks = {
      'Critical': 0,
      'High': 0,
      'Medium': 0,
      'Low': 0
    };
    data.forEach(product => {
      risks[product.quality_risk_level]++;
    });
    return Object.keys(risks).map(key => ({
      name: key,
      value: risks[key]
    })).filter(item => item.value > 0);
  };

  const riskLevelData = getRiskLevelData();

  // Group by category with "Others" for categories < 2%
  const getCategoryData = () => {
    const categories = {};
    data.forEach(product => {
      const cat = product.category_name;
      if (!categories[cat]) {
        categories[cat] = { name: cat, value: 0 };
      }
      categories[cat].value += 1;
    });
    
    // Calculate total to determine percentages
    const totalProducts = Object.values(categories).reduce((sum, cat) => sum + cat.value, 0);
    
    // Separate categories into main (>= 2%) and others (< 2%)
    const mainCategories = [];
    let othersTotal = 0;
    
    Object.values(categories).forEach(category => {
      const percentage = (category.value / totalProducts) * 100;
      if (percentage >= 2) {
        mainCategories.push(category);
      } else {
        othersTotal += category.value;
      }
    });
    
    // Sort main categories by value
    mainCategories.sort((a, b) => b.value - a.value);
    
    // Add "Others" category if there are any
    if (othersTotal > 0) {
      mainCategories.push({ name: 'Others', value: othersTotal });
    }
    
    return mainCategories;
  };

  const categoryData = getCategoryData();

  // Top 20 products by return rate
  const topReturnProducts = data.slice(0, 100);

  // Prepare data for sold vs returned comparison
  const soldVsReturnedData = topReturnProducts.map(item => ({
    name: item.product_name.length > 20 ? item.product_name.substring(0, 20) + '...' : item.product_name,
    fullName: item.product_name,
    sold: parseInt(item.units_sold),
    returned: parseInt(item.units_returned),
    net_demand: parseInt(item.net_demand),
    return_rate: parseFloat(item.return_rate),
    quality_risk_level: item.quality_risk_level,
    category_name: item.category_name
  }));

  return (
    <div className="dashboard-container">
      
      <h2 className="dashboard-heading">
        High Return Rate Products Dashboard
      </h2>

      <h3 className="performance-heading">
        Products with Return Rate ≥ {(minReturnRate * 100).toFixed(0)}%
      </h3>

      {/* Loading State */}
      {loading ? (
        <div className="loading-state">Loading return analytics...</div>
      ) : data.length === 0 ? (
        <div className="empty-state" style={{ color: '#10b981' }}>
          ✓ No products exceed the {(minReturnRate * 100).toFixed(0)}% return rate threshold
        </div>
      ) : (
        <div>
          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card summary-card-purple">
              <h4 className="card-title">High Return Products</h4>
              <p className="card-value">{stats.totalProducts}</p>
            </div>
            
            <div className="summary-card" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
              <h4 className="card-title">Critical Risk Items</h4>
              <p className="card-value">{stats.criticalCount}</p>
            </div>
            
            <div className="summary-card summary-card-blue">
              <h4 className="card-title">Total Units Returned</h4>
              <p className="card-value">{stats.totalReturned.toLocaleString()}</p>
            </div>

            <div className="summary-card summary-card-orange">
              <h4 className="card-title">Avg Return Rate</h4>
              <p className="card-value">{stats.avgReturnRate.toFixed(1)}%</p>
            </div>
          </div>

          {/* Top Products by Return Rate */}
          <div className="chart-container">
            <h4 className="section-title">All Products by Return Rate</h4>
            <ResponsiveContainer width="100%" height={Math.max(500, topReturnProducts.length * 30)}>
              <BarChart
                layout="vertical"
                data={topReturnProducts}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  label={{ value: 'Return Rate (%)', position: 'insideBottom', offset: -10 }}
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
                <Bar dataKey="return_rate" name="Return Rate %" radius={[0, 6, 6, 0]}>
                  {topReturnProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.quality_risk_level]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Distribution Charts */}
          <div className="chart-list">
            {/* Risk Level Distribution */}
            <div className="chart-card">
              <h4 className="section-title">Products by Quality Risk Level</h4>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={riskLevelData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={true}
                  >
                    {riskLevelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Units Returned Bar Chart */}
          <div className="chart-container">
            <h4 className="section-title">Total Units Returned by Product</h4>
            <ResponsiveContainer width="100%" height={Math.max(400, topReturnProducts.length * 25)}>
              <BarChart
                layout="vertical"
                data={topReturnProducts}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  label={{ value: 'Units Returned', position: 'insideBottom', offset: -10 }}
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
                <Bar dataKey="units_returned" name="Units Returned" fill="#ef4444" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sold vs Returned Comparison */}
          <div className="chart-container">
            <h4 className="section-title">Units Sold vs Units Returned Comparison</h4>
            <ResponsiveContainer width="100%" height={450}>
              <ComposedChart
                data={soldVsReturnedData.slice(0, 15)}
                margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  interval={0}
                  style={{ fontSize: "10px", fill: "#666" }}
                />
                <YAxis 
                  label={{ value: 'Units', angle: -90, position: 'insideLeft' }}
                  style={{ fontSize: "12px", fill: "#666" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="sold" name="Units Sold" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="returned" name="Units Returned" fill="#ef4444" radius={[6, 6, 0, 0]} />
                <Line 
                  type="monotone" 
                  dataKey="return_rate" 
                  name="Return Rate %"
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  yAxisId="right"
                  dot={{ r: 4, fill: "#f59e0b" }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  label={{ value: 'Return Rate %', angle: 90, position: 'insideRight' }}
                  style={{ fontSize: "12px", fill: "#666" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Net Demand Impact */}
          <div className="chart-container">
            <h4 className="section-title">Net Demand After Returns</h4>
            <ResponsiveContainer width="100%" height={Math.max(400, topReturnProducts.length * 25)}>
              <BarChart
                layout="vertical"
                data={topReturnProducts}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  label={{ value: 'Net Demand (Units)', position: 'insideBottom', offset: -10 }}
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
                <Bar dataKey="net_demand" name="Net Demand" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Data Table */}
          <div className="table-container">
            <h4 className="section-title">Complete High Return Products Report</h4>
            <table className="data-table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Rank</th>
                  <th className="table-header-cell">Product Name</th>
                  <th className="table-header-cell">Category</th>
                  <th className="table-header-cell-center">Risk Level</th>
                  <th className="table-header-cell-right">Units Sold</th>
                  <th className="table-header-cell-right">Units Returned</th>
                  <th className="table-header-cell-right">Return Rate</th>
                  <th className="table-header-cell-right">Net Demand</th>
                </tr>
              </thead>
              <tbody>
                {data.map((product, index) => (
                  <tr key={index} className="table-row">
                    <td className="table-cell">{index + 1}</td>
                    <td className="table-cell-bold">{product.product_name}</td>
                    <td className="table-cell">{product.category_name}</td>
                    <td className="table-cell-center">
                      <span style={{
                        padding: "4px 12px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "700",
                        backgroundColor: RISK_COLORS[product.quality_risk_level] + '20',
                        color: RISK_COLORS[product.quality_risk_level],
                        border: `1px solid ${RISK_COLORS[product.quality_risk_level]}`
                      }}>
                        {product.quality_risk_level}
                      </span>
                    </td>
                    <td className="table-cell-blue">
                      {parseInt(product.units_sold).toLocaleString()}
                    </td>
                    <td className="table-cell-right" style={{ color: '#ef4444', fontWeight: '700' }}>
                      {parseInt(product.units_returned).toLocaleString()}
                    </td>
                    <td className="table-cell-right" style={{ 
                      color: RISK_COLORS[product.quality_risk_level],
                      fontWeight: '700',
                      fontSize: '14px'
                    }}>
                      {parseFloat(product.return_rate).toFixed(2)}%
                    </td>
                    <td className="table-cell-green">
                      {parseInt(product.net_demand).toLocaleString()}
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