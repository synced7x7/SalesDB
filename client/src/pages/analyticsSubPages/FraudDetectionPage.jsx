import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  UserX,
  ShieldAlert,
  TrendingDown,
  Clock,
  Box
} from 'lucide-react';
import '../../components/styles/AnalyticsPages.css';

export default function FraudDetectionPage() {
  const navigate = useNavigate();

  const dashboards = [
    {
      icon: CreditCard,
      title: 'Multiple Failed Payment Detection',
      description: 'Identify suspicious payment failure patterns and potential fraud',
      features: [
        'Failed payment frequency',
        'Customer risk scoring',
        'Fraud probability indicators',
        'Detailed breakdown of failures'
      ],
      color: '#dc2626',
      path: '/dashboard/analytics/fraud-detection/failed-payments'
    },
    {
      icon: UserX,
      title: 'High Return Rate Customers',
      description: 'Monitor customers with abnormally high return behavior',
      features: [
        'Return frequency analysis',
        'Return vs Total Items',
        'High Return Rate Alert List'
      ],
      color: '#f97316',
      path: '/dashboard/analytics/fraud-detection/high-return-customers'
    },
    {
      icon: Box,
      title: 'High Return Rate Products',
      description: 'Track sellers with elevated product return rates',
      features: [
        'All Products by Return Rate',
        'Product quality indicators',
        'Units Sold vs Units Returned Comparison',
        'Net Demand After Returns'
      ],
      color: '#ea580c',
      path: '/dashboard/analytics/fraud-detection/high-return-products'
    },
    {
      icon: Clock, 
      title: 'Recent High Return Sellers',
      description: 'Identify sellers with recent spikes in return activity',
      features: [
        'Last 7/15/30/60/90 day returns',
        'Top Return Rate % by Seller',
        'Items Sold vs Returns',
        'Return Rate Trend'
      ],
      color: '#f59e0b',
      path: '/dashboard/analytics/fraud-detection/recent-return-sellers'
    },
    {
      icon: TrendingDown,
      title: 'All Time High Return Sellers',
      description: 'Historical view of sellers with persistent return issues',
      features: [
        'Lifetime return metrics',
        'Risk Level Distribution',
        'Seller ranking by returns',
        'Risk classification'
      ],
      color: '#991b1b',
      path: '/dashboard/analytics/fraud-detection/all-time-return-sellers'
    },
  ];

  return (
    <div className="analytics-home-container">

      {/* Header */}
      <div className="analytics-header">
        <div>
          <h1 className="analytics-main-title">Fraud Pattern Detection</h1>
          <p className="analytics-subtitle">Anomaly detection, suspicious activity monitoring and risk scoring</p>
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
                          <path d="M13.3334 4L6.00002 11.3333L2.66669 8" stroke={dashboard.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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