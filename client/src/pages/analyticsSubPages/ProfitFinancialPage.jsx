import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  TrendingUp, 
  DollarSign, 
  PieChart,
  BarChart2,
  Target
} from 'lucide-react';
import '../../components/styles/AnalyticsPages.css';

export default function ProfitFinancialPage() {
  const navigate = useNavigate();

  const dashboards = [
    {
      icon: PieChart,
      title: 'Category Profit Margin Dashboard',
      description: 'Analyze profitability across product categories',
      features: [
        'Profit margin by category',
        'Revenue vs Cost vs Profit comparison',
        'Category Profit vs Revenue Analysis',
        'Profit Margin and Revenue Trends'
      ],
      color: '#667eea',
      path: '/dashboard/analytics/profit-financial/category-profit-margin'
    },
    {
      icon: BarChart2,
      title: 'Product Profit Margin Dashboard',
      description: 'Deep dive into individual product profitability',
      features: [
        'Top profitable products',
        'Revenue vs Cost vs Profit comparison',
        'Profit vs Revenue analysis',
        'Profit Margin Trends'
      ],
      color: '#10b981',
      path: '/dashboard/analytics/profit-financial/product-profit-margin'
    },
    {
      icon: TrendingUp,
      title: 'Revenue Change Ratio Dashboard',
      description: 'Track and analyze revenue decline patterns',
      features: [
        'Historical Revenue Change Analysis',
        'Growth vs Decline Distribution',
        'Year-by-Year Comparison',
        'Order Volume Change YoY'
      ],
      color: '#ef4444',
      path: '/dashboard/analytics/profit-financial/revenue-decrease-ratio'
    },
    {
      icon: Target,
      title: 'YoY Revenue Growth Dashboard',
      description: 'Year-over-year revenue growth and trends',
      features: [
        'Annual growth rates',
        'Monthly YoY comparison',
        'Growth trends visualization',
        'Performance benchmarks'
      ],
      color: '#8b5cf6',
      path: '/dashboard/analytics/profit-financial/yoy-revenue-growth'
    },
  ];

  return (
    <div className="analytics-home-container">

      {/* Header */}
      <div className="analytics-header">
        <div>
          <h1 className="analytics-main-title">Profit & Financial Intelligence</h1>
          <p className="analytics-subtitle">True business profitability beyond revenue</p>
        </div>
        <div className="category-badge-large badge-active">
          {dashboards.length} Dashboards
        </div>
      </div>

      {/* Dashboards Grid */}
      <div className="dashboards-grid">
        {dashboards.map((dashboard, index) => {
          const Icon = dashboard.icon;
          
          return (
            <div
              key={index}
              className="dashboard-card"
              onClick={() => navigate(dashboard.path)}
            >
              <div className="dashboard-icon-wrapper">
                <div className="dashboard-icon" style={{ backgroundColor: `${dashboard.color}15` }}>
                  <Icon size={32} color={dashboard.color} />
                </div>
              </div>

              <div className="dashboard-content">
                <h3 className="dashboard-title">{dashboard.title}</h3>
                <p className="dashboard-description">{dashboard.description}</p>
                
                <div className="dashboard-features">
                  <h4 className="features-title">Key Features:</h4>
                  <ul className="features-list">
                    {dashboard.features.map((feature, idx) => (
                      <li key={idx}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M13.3334 4L6.00002 11.3333L2.66669 8" stroke={dashboard.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="dashboard-footer">
                <button className="view-dashboard-btn" style={{ color: dashboard.color }}>
                  View Dashboard
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}