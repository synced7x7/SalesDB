import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "../styles/DashboardStyles.css";

export default function FastMovingProductsDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);
  const [minUnits, setMinUnits] = useState(10);
  const navigate = useNavigate();

  const VELOCITY_COLORS = {
    'Very High': '#10b981',
    'High': '#3b82f6',
    'Medium': '#f59e0b',
    'Low': '#6b7280'
  };

  // Fetch fast moving products
  const fetchFastMovingProducts = async (selectedDays, selectedMinUnits) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/inventory/fast-moving?days=${selectedDays}&min_units=${selectedMinUnits}`);
      
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
      console.error("Failed to fetch fast moving products:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFastMovingProducts(days, minUnits);
  }, [days, minUnits]);

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
            Units Sold: <strong>{data.units_sold?.toLocaleString()}</strong>
          </p>
          <p className="tooltip-item-green">
            Avg Daily: <strong>{parseFloat(data.avg_daily_sales).toFixed(2)}</strong>
          </p>
          <p className="tooltip-item">
            Velocity: <strong style={{ color: VELOCITY_COLORS[data.velocity_rating] }}>
              {data.velocity_rating}
            </strong>
          </p>
          <p className="tooltip-item">
            Period: <strong>{data.days_analyzed} days</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for category pie chart
  const CategoryTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = payload[0].percent ? (payload[0].percent * 100).toFixed(2) : 0;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-title">{data.name}</p>
          <p className="tooltip-item-blue">
            Units Sold: <strong>{data.value?.toLocaleString()}</strong>
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
      avgDailySales: 0,
      topProduct: "-",
      veryHighCount: 0,
      topCategory: "-"
    };
    
    const totalProducts = data.length;
    const totalUnitsSold = data.reduce((sum, item) => sum + parseInt(item.units_sold || 0), 0);
    const totalAvgDaily = data.reduce((sum, item) => sum + parseFloat(item.avg_daily_sales || 0), 0);
    const avgDailySales = totalProducts > 0 ? totalAvgDaily / totalProducts : 0;
    
    const topProduct = data[0]?.product_name || "-";
    const veryHighCount = data.filter(item => item.velocity_rating === 'Very High').length;
    
    // Find top category
    const categoryCounts = {};
    data.forEach(item => {
      const cat = item.category_name;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + parseInt(item.units_sold);
    });
    const topCategory = Object.keys(categoryCounts).reduce((a, b) => 
      categoryCounts[a] > categoryCounts[b] ? a : b, "-"
    );
    
    return { 
      totalProducts,
      totalUnitsSold,
      avgDailySales,
      topProduct,
      veryHighCount,
      topCategory
    };
  };

  const stats = calculateStats();

  // Group by velocity rating
  const getVelocityData = () => {
    const velocities = {
      'Very High': 0,
      'High': 0,
      'Medium': 0,
      'Low': 0
    };
    data.forEach(product => {
      velocities[product.velocity_rating]++;
    });
    return Object.keys(velocities).map(key => ({
      name: key,
      value: velocities[key]
    })).filter(item => item.value > 0);
  };

  const velocityData = getVelocityData();

  // Group by category with "Others" for categories < 2%
  const getCategoryData = () => {
    const categories = {};
    data.forEach(product => {
      const cat = product.category_name;
      if (!categories[cat]) {
        categories[cat] = { name: cat, value: 0 };
      }
      categories[cat].value += parseInt(product.units_sold);
    });
    
    // Calculate total to determine percentages
    const totalUnits = Object.values(categories).reduce((sum, cat) => sum + cat.value, 0);
    
    // Separate categories into main (>= 2%) and others (< 2%)
    const mainCategories = [];
    let othersTotal = 0;
    
    Object.values(categories).forEach(category => {
      const percentage = (category.value / totalUnits) * 100;
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

  // Top 20 products
  const topProducts = data.slice(0, 20);

  return (
    <div className="dashboard-container">
      
      <h2 className="dashboard-heading">
        <TrendingUp className="inline-icon" style={{ color: '#10b981' }} />
        Fast Moving Products Dashboard
      </h2>

      {/* Filter Controls */}
      <div className="year-selection" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div>
          <label htmlFor="days-select" className="year-label">
            Time Period (Days):
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

        <div>
          <label htmlFor="units-select" className="year-label">
            Minimum Units Sold:
          </label>
          <select
            id="units-select"
            value={minUnits}
            onChange={(e) => setMinUnits(parseInt(e.target.value))}
            className="year-select"
          >
            <option value="10">10+ units</option>
            <option value="20">20+ units</option>
            <option value="30">30+ units</option>
            <option value="50">50+ units</option>
            <option value="100">100+ units</option>
          </select>
        </div>
      </div>

      <h3 className="performance-heading">
        Analysis Period: Last {days} Days (Min {minUnits} units)
      </h3>

      {/* Loading State */}
      {loading ? (
        <div className="loading-state">Loading fast moving products...</div>
      ) : data.length === 0 ? (
        <div className="empty-state">
          No products meet the criteria for the selected period
        </div>
      ) : (
        <div>
          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card summary-card-purple">
              <h4 className="card-title">Fast Moving Products</h4>
              <p className="card-value">{stats.totalProducts}</p>
            </div>
            
            <div className="summary-card summary-card-pink">
              <h4 className="card-title">Total Units Sold</h4>
              <p className="card-value">{stats.totalUnitsSold.toLocaleString()}</p>
            </div>
            
            <div className="summary-card summary-card-blue">
              <h4 className="card-title">Avg Daily Sales</h4>
              <p className="card-value">{stats.avgDailySales.toFixed(1)}</p>
            </div>

            <div className="summary-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
              <h4 className="card-title">Very High Velocity</h4>
              <p className="card-value">{stats.veryHighCount}</p>
            </div>
          </div>

          {/* Top 20 Products Bar Chart */}
          <div className="chart-container">
            <h4 className="section-title">Top Fast Moving Products</h4>
            <ResponsiveContainer width="100%" height={Math.max(500, topProducts.length * 30)}>
              <BarChart
                layout="vertical"
                data={topProducts}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  label={{ value: 'Units Sold', position: 'insideBottom', offset: -10 }}
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
                <Bar dataKey="units_sold" name="Units Sold" radius={[0, 6, 6, 0]}>
                  {topProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={VELOCITY_COLORS[entry.velocity_rating]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Distribution Charts */}
          <div className="chart-list">
            {/* Velocity Rating Distribution */}
            <div className="chart-card">
              <h4 className="section-title">Products by Velocity Rating</h4>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={velocityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={true}
                  >
                    {velocityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={VELOCITY_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category Distribution */}
            <div className="chart-card">
              <h4 className="section-title">Units Sold by Category </h4>
              <ResponsiveContainer width="100%" height={600}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                    labelLine={true}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          entry.name === 'Others' 
                            ? '#9ca3af' 
                            : ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][index % 8]
                        } 
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CategoryTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Average Daily Sales Chart */}
          <div className="chart-container">
            <h4 className="section-title">Average Daily Sales Rate</h4>
            <ResponsiveContainer width="100%" height={Math.max(400, topProducts.length * 25)}>
              <BarChart
                layout="vertical"
                data={topProducts}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  label={{ value: 'Avg Units Per Day', position: 'insideBottom', offset: -10 }}
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
                <Bar dataKey="avg_daily_sales" name="Avg Daily Sales" fill="#06b6d4" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Scatter Plot - Units vs Daily Average */}
          <div className="chart-container">
            <h4 className="section-title">Units Sold vs Daily Sales Rate</h4>
            <ResponsiveContainer width="100%" height={450}>
              <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="units_sold" 
                  name="Units Sold"
                  label={{ value: 'Total Units Sold', position: 'insideBottom', offset: -10 }}
                  style={{ fontSize: "12px", fill: "#666" }}
                />
                <YAxis 
                  type="number" 
                  dataKey="avg_daily_sales" 
                  name="Avg Daily Sales"
                  label={{ value: 'Avg Daily Sales', angle: -90, position: 'insideLeft' }}
                  style={{ fontSize: "12px", fill: "#666" }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <Legend />
                {['Very High', 'High', 'Medium', 'Low'].map(rating => (
                  <Scatter
                    key={rating}
                    name={rating}
                    data={data.filter(item => item.velocity_rating === rating)}
                    fill={VELOCITY_COLORS[rating]}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Data Table */}
          <div className="table-container">
            <h4 className="section-title">Complete Fast Moving Products Report</h4>
            <table className="data-table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Rank</th>
                  <th className="table-header-cell">Product Name</th>
                  <th className="table-header-cell">Category</th>
                  <th className="table-header-cell-center">Velocity</th>
                  <th className="table-header-cell-right">Units Sold</th>
                  <th className="table-header-cell-right">Avg Daily Sales</th>
                  <th className="table-header-cell-right">Days Analyzed</th>
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
                        backgroundColor: VELOCITY_COLORS[product.velocity_rating] + '20',
                        color: VELOCITY_COLORS[product.velocity_rating],
                        border: `1px solid ${VELOCITY_COLORS[product.velocity_rating]}`
                      }}>
                        {product.velocity_rating}
                      </span>
                    </td>
                    <td className="table-cell-blue" style={{ fontWeight: '700' }}>
                      {parseInt(product.units_sold).toLocaleString()}
                    </td>
                    <td className="table-cell-green">
                      {parseFloat(product.avg_daily_sales).toFixed(2)}
                    </td>
                    <td className="table-cell-right">{product.days_analyzed}</td>
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