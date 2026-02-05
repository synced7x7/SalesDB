import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "../styles/DashboardStyles.css";

export default function LowStockDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const SEVERITY_COLORS = {
    'Critical': '#ef4444',      // Red - >75% deficit
    'High': '#f97316',          // Orange - 50-75%
    'Medium': '#f59e0b',        // Yellow - 25-50%
    'Low': '#eab308'            // Light yellow - <25%
  };

  // Fetch low stock data
  const fetchLowStockProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory/low-stock');
      
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
        // Add severity classification
        const enrichedData = json.map(item => ({
          ...item,
          severity: getSeverity(item.deficit_percentage)
        }));
        setData(enrichedData);
      } else {
        console.error("Expected array but got:", json);
        setData([]);
      }
    } catch (err) {
      console.error("Failed to fetch low stock data:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Get severity level based on deficit percentage
  const getSeverity = (deficitPercentage) => {
    const deficit = parseFloat(deficitPercentage);
    if (deficit >= 75) return 'Critical';
    if (deficit >= 50) return 'High';
    if (deficit >= 25) return 'Medium';
    return 'Low';
  };

  useEffect(() => {
    fetchLowStockProducts();
  }, []);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-title">{data.product_name}</p>
          <p className="tooltip-item-orange">
            Warehouse: <strong>{data.warehouse_name}</strong>
          </p>
          <p className="tooltip-item">
            Stock: <strong>{data.stock_remaining}</strong> / Min: <strong>{data.min_stock_level}</strong>
          </p>
          <p className="tooltip-item-blue">
            Deficit: <strong>{data.stock_deficit} units</strong>
          </p>
          <p className="tooltip-item-green">
            Deficit %: <strong>{parseFloat(data.deficit_percentage).toFixed(1)}%</strong>
          </p>
          <p className="tooltip-item">
            Severity: <strong style={{ color: SEVERITY_COLORS[data.severity] }}>
              {data.severity}
            </strong>
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate summary statistics
  const calculateStats = () => {
    if (data.length === 0) return { 
      totalLowStock: 0,
      criticalCount: 0,
      totalDeficit: 0,
      avgDeficitPercent: 0,
      warehousesAffected: 0,
      mostAffectedWarehouse: "-"
    };
    
    const totalLowStock = data.length;
    const criticalCount = data.filter(item => item.severity === 'Critical').length;
    const totalDeficit = data.reduce((sum, item) => sum + parseInt(item.stock_deficit || 0), 0);
    const avgDeficitPercent = data.reduce((sum, item) => sum + parseFloat(item.deficit_percentage || 0), 0) / totalLowStock;
    
    // Count warehouses
    const warehouseSet = new Set(data.map(item => item.warehouse_id));
    const warehousesAffected = warehouseSet.size;
    
    // Find most affected warehouse
    const warehouseCounts = {};
    data.forEach(item => {
      const wh = item.warehouse_name;
      warehouseCounts[wh] = (warehouseCounts[wh] || 0) + 1;
    });
    const mostAffectedWarehouse = Object.keys(warehouseCounts).reduce((a, b) => 
      warehouseCounts[a] > warehouseCounts[b] ? a : b, "-"
    );
    
    return { 
      totalLowStock,
      criticalCount,
      totalDeficit,
      avgDeficitPercent,
      warehousesAffected,
      mostAffectedWarehouse
    };
  };

  const stats = calculateStats();

  // Group by warehouse for pie chart
  const getWarehouseData = () => {
    const warehouses = {};
    data.forEach(product => {
      const wh = product.warehouse_name;
      if (!warehouses[wh]) {
        warehouses[wh] = { name: wh, value: 0 };
      }
      warehouses[wh].value += 1;
    });
    return Object.values(warehouses);
  };

  const warehouseData = getWarehouseData();

  // Group by severity
  const getSeverityData = () => {
    const severities = {
      'Critical': 0,
      'High': 0,
      'Medium': 0,
      'Low': 0
    };
    data.forEach(product => {
      severities[product.severity]++;
    });
    return Object.keys(severities).map(key => ({
      name: key,
      value: severities[key]
    })).filter(item => item.value > 0);
  };

  const severityData = getSeverityData();

  // Top 20 products by deficit percentage
  const topDeficitProducts = data.slice(0, 20);

  return (
    <div className="dashboard-container">
      
      <h2 className="dashboard-heading">
        <AlertTriangle className="inline-icon" style={{ color: '#ef4444' }} />
        Low Stock Products Dashboard
      </h2>

      <h3 className="performance-heading">Current Inventory Status</h3>

      {/* Loading State */}
      {loading ? (
        <div className="loading-state">Loading inventory data...</div>
      ) : data.length === 0 ? (
        <div className="empty-state" style={{ color: '#10b981' }}>
          ✓ All products are adequately stocked!
        </div>
      ) : (
        <div>
          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card summary-card-purple">
              <h4 className="card-title">Low Stock Items</h4>
              <p className="card-value">{stats.totalLowStock}</p>
            </div>
            
            <div className="summary-card" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
              <h4 className="card-title">Critical Items</h4>
              <p className="card-value">{stats.criticalCount}</p>
            </div>
            
            <div className="summary-card summary-card-blue">
              <h4 className="card-title">Total Deficit Units</h4>
              <p className="card-value">{stats.totalDeficit.toLocaleString()}</p>
            </div>

            <div className="summary-card summary-card-orange">
              <h4 className="card-title">Warehouses Affected</h4>
              <p className="card-value">{stats.warehousesAffected}</p>
            </div>
          </div>

          {/* Top 20 Deficit Products Bar Chart */}
          <div className="chart-container">
            <h4 className="section-title">Top Products based on Stock Deficit</h4>
            <ResponsiveContainer width="100%" height={Math.max(500, topDeficitProducts.length * 30)}>
              <BarChart
                layout="vertical"
                data={topDeficitProducts}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  label={{ value: 'Deficit Percentage (%)', position: 'insideBottom', offset: -10 }}
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
                <Bar dataKey="deficit_percentage" name="Deficit %" radius={[0, 6, 6, 0]}>
                  {topDeficitProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Charts - Warehouse and Severity Distribution */}
          <div className="chart-grid">
            {/* By Warehouse */}
            <div className="chart-card">
              <h4 className="section-title">Low Stock Items by Warehouse</h4>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={warehouseData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                    labelLine={true}
                  >
                    {warehouseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* By Severity */}
            <div className="chart-card">
              <h4 className="section-title">Items by Severity Level</h4>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={severityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={true}
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stock Deficit Bar Chart */}
          <div className="chart-container">
            <h4 className="section-title">Stock Deficit (Units Needed)</h4>
            <ResponsiveContainer width="100%" height={Math.max(400, topDeficitProducts.length * 25)}>
              <BarChart
                layout="vertical"
                data={topDeficitProducts}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  label={{ value: 'Units Needed', position: 'insideBottom', offset: -10 }}
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
                <Bar dataKey="stock_deficit" name="Units Needed" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Data Table */}
          <div className="table-container">
            <h4 className="section-title">Complete Low Stock Inventory Report</h4>
            <table className="data-table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Rank</th>
                  <th className="table-header-cell">Product Name</th>
                  <th className="table-header-cell">Warehouse</th>
                  <th className="table-header-cell-center">Severity</th>
                  <th className="table-header-cell-right">Current Stock</th>
                  <th className="table-header-cell-right">Min Level</th>
                  <th className="table-header-cell-right">Deficit (Units)</th>
                  <th className="table-header-cell-right">Deficit (%)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((product, index) => (
                  <tr key={index} className="table-row">
                    <td className="table-cell">{index + 1}</td>
                    <td className="table-cell-bold">{product.product_name}</td>
                    <td className="table-cell">{product.warehouse_name}</td>
                    <td className="table-cell-center">
                      <span style={{
                        padding: "4px 12px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "700",
                        backgroundColor: SEVERITY_COLORS[product.severity] + '20',
                        color: SEVERITY_COLORS[product.severity],
                        border: `1px solid ${SEVERITY_COLORS[product.severity]}`
                      }}>
                        {product.severity}
                      </span>
                    </td>
                    <td className="table-cell-right" style={{ color: '#ef4444', fontWeight: '600' }}>
                      {product.stock_remaining}
                    </td>
                    <td className="table-cell-right">{product.min_stock_level}</td>
                    <td className="table-cell-blue" style={{ fontWeight: '700' }}>
                      {product.stock_deficit}
                    </td>
                    <td className="table-cell-right" style={{ 
                      color: SEVERITY_COLORS[product.severity],
                      fontWeight: '700'
                    }}>
                      {parseFloat(product.deficit_percentage).toFixed(1)}%
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