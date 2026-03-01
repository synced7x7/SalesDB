# SalesDB — Lab Report
## Part 5: Limitations, Modifications, Individual Contribution & GitHub Link

---

## 1. Frontend Architecture Summary

Before the final sections, here is a consolidated overview of the React frontend architecture for completeness.

### Application Routing Structure (`App.js`)

The application is a **React Single-Page Application (SPA)** using `react-router-dom` v6 with nested routes. All protected pages are wrapped inside a `DashboardLayout` component that provides the persistent sidebar navigation.

| Route Path | Component | Phase |
|---|---|---|
| `/` | `LandingPageView` | — |
| `/dashboard/overview` | `OverviewPage` | Summary KPIs |
| `/dashboard/analytics` | `AnalyticsPage` | Hub page |
| `/dashboard/analytics/core-transactional/daily-sales` | `DailySalesDashboard` | Phase 2 |
| `/dashboard/analytics/core-transactional/quantity-sold` | `QuantitySoldDashboard` | Phase 2 |
| `/dashboard/analytics/core-transactional/revenue-per-product` | `RevenuePerProductDashboard` | Phase 2 |
| `/dashboard/analytics/core-transactional/revenue-per-seller` | `RevenuePerSellerDashboard` | Phase 2 |
| `/dashboard/analytics/core-transactional/revenue-per-category` | `RevenuePerCategoryDashboard` | Phase 2 |
| `/dashboard/analytics/time-customer/monthly-revenue` | `MonthlyRevenuePerYear` | Phase 3 |
| `/dashboard/analytics/time-customer/monthly-order-count` | `MonthlyOrderCount` | Phase 3 |
| `/dashboard/analytics/time-customer/monthly-sales-trend` | `MonthlySalesTrend` | Phase 3 |
| `/dashboard/analytics/time-customer/aov` | `AOVDashboard` | Phase 3 |
| `/dashboard/analytics/time-customer/cltv` | `CLTVDashboard` | Phase 3 |
| `/dashboard/analytics/inactive-sellers-page` | `InactiveSellersPage` | Phase 4 |
| `/dashboard/returns` | `ReturnsPage` | Phase 5 |
| `/dashboard/analytics/profit-financial/product-profit-margin` | `ProductProfitMarginDashboard` | Phase 6 |
| `/dashboard/analytics/profit-financial/category-profit-margin` | `CategoryProfitMarginDashboard` | Phase 6 |
| `/dashboard/analytics/profit-financial/revenue-decrease-ratio` | `RevenueDecreaseRatioDashboard` | Phase 6 |
| `/dashboard/analytics/profit-financial/yoy-revenue-growth` | `YoYRevenueGrowthDashboard` | Phase 6 |
| `/dashboard/analytics/inventory/low-stock` | `LowStockDashboard` | Phase 8 |
| `/dashboard/analytics/inventory/fast-moving` | `FastMovingDashboard` | Phase 8 |
| `/dashboard/analytics/inventory/high-returns` | `HighReturnsDashboard` | Phase 8 |
| `/dashboard/analytics/inventory/warehouse-load` | `WarehouseLoadIntelligenceDashboard` | Phase 8 |
| `/dashboard/analytics/inventory/intelligence-score` | `InventoryIntelligenceScoreDashboard` | Phase 8 |
| `/dashboard/analytics/fraud/failed-payments` | `FailedPaymentDashboard` | Phase 8 |
| `/dashboard/analytics/fraud/high-return-customers` | `HighReturnRateCustomerDashboard` | Phase 8 |
| `/dashboard/analytics/fraud/seller-recent` | `SellerHighReturnsRecentDashboard` | Phase 8 |
| `/dashboard/analytics/fraud/seller-alltime` | `SellerHighReturnsAllTimeDashboard` | Phase 8 |
| `/dashboard/analytics/revenue-drop/monthly` | `MonthlyRevenueDropDashboard` | Phase 8 |
| `/dashboard/analytics/revenue-drop/weekly` | `WeeklyRevenueDropDashboard` | Phase 8 |
| `/dashboard/analytics/revenue-drop/yearly` | `YearlyRevenueDropDashboard` | Phase 8 |

### Backend API Endpoint Summary (`server/src/routes/sales.js`)

The Express server exposes **40+ REST endpoints** under the `/api` prefix:

| Endpoint | Controller | Purpose |
|---|---|---|
| `GET /api/daily-sales` | Inline Supabase | Daily sales view with year filter |
| `GET /api/quantity-sold` | `salesController` | Quantity sold by type/year |
| `GET /api/revenue-per-product` | `revenueDashboardController` | Product revenue |
| `GET /api/revenue-per-seller` | `revenueDashboardController` | Seller revenue |
| `GET /api/revenue-per-category` | `revenueDashboardController` | Category revenue |
| `GET /api/monthly-revenue` | `revenueDashboardController` | Monthly revenue RPC |
| `GET /api/monthly-order-count` | `revenueDashboardController` | Monthly orders RPC |
| `GET /api/average-order-value` | `aovController` | AOV RPC |
| `GET /api/customer-lifetime-value` | `cltvController` | CLTV RPC |
| `GET /api/analytics/inactive-sellers` | `analyticsController` | Inactive sellers RPC |
| `GET /api/analytics/returns` | `analyticsController` | Returns view + JS aggregation |
| `GET /api/profit-margin/product` | `profitMarginController` | Product profit RPC |
| `GET /api/profit-margin/category` | `profitMarginController` | Category profit RPC |
| `GET /api/yoy/revenue-decrease-ratio` | `yoyRevenueController` | YoY ratio RPC |
| `GET /api/yoy/revenue-growth` | `yoyRevenueController` | YoY growth RPC |
| `GET /api/fraud/failed-payments` | `fraudRiskController` | Failed payments RPC |
| `GET /api/fraud/high-return-customers` | `fraudRiskController` | Return fraud RPC |
| `GET /api/revenue-drop/monthly` | `revenueDropAnalysisController` | Monthly drop RPC |
| `GET /api/inventory/low-stock` | `inventoryController` | Low stock RPC |
| `GET /api/inventory/intelligence-score` | `inventoryController` | Intelligence score RPC |

---

## 2. Limitations of the Project

### 2.1 Hardcoded Reference Date
All Phase 8 SQL functions use a hardcoded reference date (`DATE '2025-12-31'`) as the "today" for time-window calculations (e.g., "last 30 days"). In a production system, this would be `CURRENT_DATE`, but was fixed due to the static nature of the sample dataset which ends at 2025-12-31.

### 2.2 No Authentication Layer
The application has no user authentication or authorization. All API endpoints are publicly accessible. There is no role-based access control (RBAC) to differentiate between admin and read-only users. This was a deliberate simplification for academic scope.

### 2.3 Client-Side Aggregation for Returns
The `product_returns_analytics` view stores per-product-per-month data. Aggregations for "all-time" and "per-year" views are performed in JavaScript (`analyticsController.js`) rather than in the database. This is less efficient than SQL-level aggregation for large datasets but was necessary to support three time-dimension views from a single view without three separate database functions.

### 2.4 No Real-Time Updates
The dashboards perform data fetches on component mount (`useEffect`) but do not implement WebSocket connections or polling for real-time data updates. A live e-commerce system would require real-time or near-real-time dashboard refresh.

### 2.5 Limited Error Boundaries in Frontend
Frontend error handling is minimal — most components display a loading spinner or a blank state on API failure. Production-grade applications would require comprehensive error boundary components and user-facing error messages.

### 2.6 No Pagination on Large Result Sets
Several dashboards (e.g., Revenue Per Product, CLTV) load full result sets without server-side pagination. For datasets with thousands of products or customers, this would cause performance degradation.

### 2.7 Synthetic Data Limitations
All data was generated programmatically using the `Data Generation Function.sql` script. The fraud patterns and return rates are artificially seeded (`Fraud Pattern Data Generation.sql`) and do not reflect real-world distribution. Statistical analysis on this data should not be extrapolated to real business conclusions.

### 2.8 Phase 7 Stored Procedures (Create/Update/Process) — Not Frontend-Exposed
Phase 7 defined several stored procedures (Create Order, Add Order Items, Update Inventory, Process Return, Mark Order Shipped, etc.). While the trigger components (auto-update, stock enforcement) are fully implemented, the procedural CRUD operations are database-side only and not fully wired to the Data Management frontend page.

### 2.9 Single Inventory Record Per Product
The inventory model allows multiple rows per product (one per warehouse). However, the `fn_enforce_stock_limit_on_sale` trigger uses `WHERE product_id = NEW.product_id` without a warehouse qualifier — it deducts stock from the first matching inventory record. This simplification may cause incorrect deductions in a multi-warehouse scenario.

---

## 3. Modifications Made Throughout the Semester

The following changes were made relative to the initially proposed project scope:

| Area | Initial Proposal | Final Implementation | Reason for Change |
|---|---|---|---|
| **Database Platform** | Local PostgreSQL | Supabase (hosted PostgreSQL) | Simplified deployment and built-in REST API via PostgREST |
| **Frontend Framework** | Plain HTML/CSS dashboard | React SPA with component-based architecture | Better state management and reusability for multi-dashboard application |
| **Charting Library** | Chart.js | Recharts | Better React integration and built-in responsive container support |
| **Phase 7 Scope** | Full CRUD procedures + frontend forms | Triggers implemented; CRUD procedures in DB only | Time constraints in later phases; shifted priority to Phase 8 analytics |
| **Phase 8 Addition** | Not in original proposal | Full Phase 8 added (Fraud, Revenue Drop, Inventory Intelligence) | Expanded scope after foundational phases were completed ahead of schedule |
| **Data Scope** | 2023–2024 | 2016–2025 (10 years) | More data enables meaningful YoY and trend analytics |
| **Returns Dashboard** | Basic return count per product | Full 3-view system (All-time / Per Year / Per Month) with revenue loss | Discovered richer analysis possible with the view-based approach |
| **CLTV Segmentation** | Simple total spend ranking | 4-tier segmentation (VIP / High / Medium / Low Value) with frequency score | Added business value through customer behavioral classification |
| **Inactive Sellers** | Simple list query | Full function returning JSON with trend chart data + inactive seller profiles | Discovered `generate_series` enables month-by-month trend with zero-fill |

---

## 4. Individual Contribution

> **Note**: Fill in team member names and contributions as appropriate for your group. Sample format provided below.

| Member | Contributions |
|---|---|
| **[Member 1 Name]** | Phase 1 Schema Design · Phase 2 SQL Views · Phase 2 Frontend Dashboards (Daily Sales, Quantity Sold) · Data Generation Scripts |
| **[Member 2 Name]** | Phase 3 SQL Functions (AOV, CLTV, Monthly Revenue) · Phase 3 React Dashboards · Phase 4 Inactive Sellers Detection |
| **[Member 3 Name]** | Phase 5 Returns Analytics · Phase 6 Profit Margin Functions · Phase 6 YoY Revenue Functions · Phase 6 Frontend Dashboards |
| **[Member 4 Name]** | Phase 7 Triggers · Phase 8 Fraud Detection Functions · Phase 8 Inventory Intelligence · Phase 8 Frontend Dashboards |
| **All Members** | Database design review · API integration · Frontend routing · Report preparation |

---

## 5. GitHub Repository Link

> **Replace the placeholder below with your actual GitHub repository URL.**

**Repository**: [https://github.com/[your-username]/SalesDB](https://github.com/[your-username]/SalesDB)

The repository contains:
- `db/` — All SQL scripts (schema, views, functions, triggers, data generation)
- `server/` — Node.js/Express REST API source
- `client/` — React frontend source
- `sample_csv/` — Sample data CSV files for initial population
- `README.md` — Setup and run instructions

---

## 6. How to Run the Project

### Prerequisites
- Node.js v18+
- A Supabase project with the schema and SQL functions deployed
- Environment variables configured

### Backend
```bash
cd server
npm install
# Create .env with: SUPABASE_URL=... and SUPABASE_ANON_KEY=...
npm run dev
# Server starts on http://localhost:5001
```

### Frontend
```bash
cd client
npm install
npm start
# App starts on http://localhost:3000
```

### Database Setup Order
1. Run `db/DatabaseSchema.sql` — create all tables
2. Import CSVs from `sample_csv/` in the `IMPORT_SEQUENCE.md` order
3. Run Phase 2 VIEW scripts (`P2-*.sql`)
4. Run Phase 3–8 FUNCTION scripts in order
5. Run TRIGGER scripts (`Auto_update_Order_Total_Amount_Trigger.sql`, `Enforce_Stock_Limit_On_Year_Trigger.sql`)
6. Run fraud data generation: `db/Fraud Pattern Data Generation.sql`

---

*End of Report — Merge REPORT_PART1.md through REPORT_PART5.md into REPORT_FINAL.md*
