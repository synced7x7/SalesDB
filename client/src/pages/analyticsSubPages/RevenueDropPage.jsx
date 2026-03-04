import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar,
  CalendarDays,
  CalendarRange
} from 'lucide-react';
import '../../components/styles/AnalyticsPages.css';

export default function RevenueDropPage() {
  const navigate = useNavigate();

  const dashboards = [
    {
      icon: Calendar,
      title: 'Weekly Revenue Drop Analysis',
      description: 'Monitor week-over-week revenue declines and short-term trends',
      features: [
        'Week-over-week comparison',
        'Drop percentage tracking',
        'Drop Severity Distribution',
        'Weekly Order Volume Analysis'
      ],
      color: '#f97316',
      path: '/dashboard/analytics/revenue-drop/weekly'
    },
    {
      icon: CalendarDays,
      title: 'Monthly Revenue Drop Analysis',
      description: 'Track month-over-month revenue changes and seasonal patterns',
      features: [
        'Monthly Change Percentage Trend',
        'Current vs Previous Month Revenue',
        'Drop Severity Distribution',
        'Monthly Order Volume'
      ],
      color: '#ea580c',
      path: '/dashboard/analytics/revenue-drop/monthly'
    },
    {
      icon: CalendarRange,
      title: 'Year-over-Year Revenue Drop Analysis',
      description: 'Comprehensive annual revenue decline and growth analysis',
      features: [
        'YoY revenue comparison',
        'Annual growth/decline rates',
        'YoY Change Percentage',
        'Severity Distribution'
      ],
      color: '#dc2626',
      path: '/dashboard/analytics/revenue-drop/yearly'
    },
  ];

  return (
    <div className="analytics-home-container">

      {/* Header */}
      <div className="analytics-header">
        <div>
          <h1 className="analytics-main-title">Revenue Drop Analysis</h1>
          <p className="analytics-subtitle">Track and analyze revenue decline patterns across time periods</p>
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