# SalesDB — Lab Report
## Part 1: Problem Statement, Project Overview, Features, and Technologies

---

## 1. Problem Statement

Modern e-commerce and retail businesses generate vast transactional data across sellers, customers, products, warehouses, and payments. Without structured database management and analytical tooling, critical business questions remain unanswered:

- Which products and sellers are driving or hurting revenue?
- Are there inactive sellers or fraudulent customers?
- How is inventory health across warehouses?
- What are the profit margins per product and category?
- Where are revenue drops happening, and why?

This project addresses these challenges by building a **full-stack Sales Database Management System (DBMS)** backed by PostgreSQL (via Supabase), with a React-based dashboard frontend and a Node.js/Express backend API layer.

---

## 2. Scope

The system covers end-to-end database design, data population, analytical query engineering, and interactive dashboard delivery for a simulated e-commerce business. Specifically:

- **Data Modeling**: 11 core relational tables covering the full order lifecycle
- **Data Population**: Synthetic CSV data spanning multiple years (2016–2025), including fraud-pattern datasets
- **Analytical Coverage**: 8 development phases from basic aggregations to deep predictive intelligence
- **API Layer**: RESTful Express.js API serving 40+ endpoints
- **Frontend**: React-based multi-page dashboard application with 25+ interactive chart components
- **Database Automation**: Triggers for inventory management, order automation, and fraud detection

---

## 3. Project Overview

**Project Name**: SalesDB — E-Commerce Sales Analytics Platform  
**Stack**: PostgreSQL (Supabase) · Node.js · Express.js · React.js · Recharts

The system is structured as a **monorepo** with three top-level directories:

| Directory | Purpose |
|---|---|
| `db/` | All SQL scripts: schema, views, functions, triggers, data generation |
| `server/` | Node.js/Express REST API with Supabase client integration |
| `client/` | React SPA with dashboards for each analytics phase |

The application is accessed through a **Landing Page** that navigates to specialized dashboard pages:

- **Overview Page** — high-level KPI summary
- **Analytics Page** — multi-phase analytics dashboards
- **Data Management Page** — insert/update/delete operations
- **Inactive Sellers Page** — Phase 4 seller segmentation
- **Returns Page** — Phase 5 returns risk analysis
- **Integrity Page** — data integrity and fraud pattern dashboards

---

## 4. List of Features

### Phase 1 — Schema & Foundation
| Feature | Description |
|---|---|
| Relational Schema | 11 normalized tables: sellers, customers, warehouses, categories, products, orders, order_items, payments, shipping, returns, inventory |
| Foreign Key Constraints | Enforced referential integrity across all relationships |
| Self-Referencing Category | `parent_category_id` enables hierarchical category tree |

---

### Phase 2 — Core Transactional Dashboards

| Feature | Description |
|---|---|
| **Daily Sales Dashboard** | Tracks daily sales amount, total orders, and items sold with year filtering. Uses line charts with gradient fills and a detailed data table with AOV. |
| **Quantity Sold Dashboard** | Multi-view dashboard (Per Product, Per Year, Per Category, Per Category & Year) with tab navigation. Uses bar charts and pie charts. |
| **Revenue Per Product Dashboard** | Horizontal bar chart ranking products by revenue with year filtering and revenue share percentage. |
| **Revenue Per Seller Dashboard** | Ranks sellers by revenue and products sold using dual horizontal bar charts. |
| **Revenue Per Category Dashboard** | Dual pie charts and dual horizontal bar charts showing revenue and quantity distribution across categories. |

---

### Phase 3 — Time-Based & Customer Metrics

| Feature | Description |
|---|---|
| **Monthly Revenue Per Year** | Grouped monthly revenue trend across all years on a single chart |
| **Monthly Order Count** | Order volume per month with all-years and per-year toggle |
| **Monthly Sales Trend** | Unified monthly sales trend combining revenue and order count |
| **Average Order Value (AOV)** | Monthly AOV with min, max, and median order values per month |
| **Customer Lifetime Value (CLTV)** | Customer segmentation (VIP, High Value, Medium Value, Low Value) based on total spend, order frequency, and lifetime days |

---

### Phase 4 — Advanced Ranking & Segmentation

| Feature | Description |
|---|---|
| **Inactive Sellers Detection** | Date-range configurable detection of sellers with zero transactions. Returns total sellers, inactive count, inactive ratio, per-month trend, and a full inactive seller list with days since last sale. |

---

### Phase 5 — Returns, Loss & Risk Analysis

| Feature | Description |
|---|---|
| **Most Returned Products** | All-time, per-year, and per-month tabbed views of top returned products |
| **Return Rate per Product** | Percentage-based return rate analysis across time dimensions |
| **Revenue Loss Due to Returns** | Monetary impact of approved returns aggregated by product, year, and month |

---

### Phase 6 — Profit Loss Analytics

| Feature | Description |
|---|---|
| **Product Profit Margin** | Per-product profit margin % using cursor-based PL/pgSQL function with COGS vs. revenue comparison |
| **Category Profit Margin** | Category-level aggregated profit margins |
| **Revenue Decrease Ratio (YoY)** | Year-over-year revenue and order change percentage with increase/decrease classification |
| **Year-over-Year Revenue Growth** | Detailed YoY growth dashboard with monthly comparison breakdowns |

---

### Phase 7 — Triggers & Automation

| Feature | Description |
|---|---|
| **Auto-Update Order Total** | AFTER INSERT/UPDATE/DELETE trigger on `order_items` recalculates `orders.total_amount` automatically |
| **Enforce Stock Limit on Sale** | BEFORE INSERT trigger on `order_items` prevents sale if stock is insufficient and deducts stock on valid sale |

---

### Phase 8 — Advanced Deep Analytics

| Feature | Description |
|---|---|
| **Fraud — Multiple Failed Payments** | Detects customers with 2+ failed payments within a configurable recent window |
| **Fraud — High Return Rate Customers** | Flags customers exceeding minimum return count and return percentage thresholds |
| **Fraud — Seller Return Monitoring** | Identifies sellers with abnormally high return rates in recent periods and all-time |
| **Revenue Drop Analysis** | Monthly, weekly, and yearly revenue drop detection with severity classification and recommendations |
| **Low Stock Detection** | Lists products below `min_stock_level` with deficit quantity and deficit percentage |
| **Fast-Moving Products** | Demand intelligence identifying high-velocity products |
| **Warehouse Load Intelligence** | Per-warehouse capacity score, product count, unit totals, and low-stock count |
| **Inventory Risk & Priority Score** | Multi-factor function scoring each product: CRITICAL / HIGH / MEDIUM / OVERSTOCKED / LOW with recommended actions |

---

## 5. Tools and Technologies Used

### Backend
| Tool | Version | Purpose |
|---|---|---|
| **Node.js** | v18+ | Runtime environment for the API server |
| **Express.js** | v4 | REST API framework |
| **@supabase/supabase-js** | v2 | PostgreSQL client connecting to Supabase cloud |
| **CORS** | — | Cross-origin request handling |
| **dotenv** | — | Environment variable management |

### Frontend
| Tool | Version | Purpose |
|---|---|---|
| **React.js** | v18 | UI component framework |
| **React Router DOM** | v6 | Client-side routing between pages |
| **Recharts** | v2 | All chart visualizations (Line, Bar, Pie, Area) |
| **Axios** | — | HTTP requests from frontend to backend API |
| **CSS Modules / Inline Styles** | — | Component-level styling |

### Database
| Tool | Purpose |
|---|---|
| **PostgreSQL 15** | Core relational database engine |
| **Supabase** | Hosted PostgreSQL platform with REST/RPC API |
| **PL/pgSQL** | Procedural language for functions, cursors, and triggers |
| **SQL Views** | Pre-computed query results for dashboard performance |

### Development Tools
| Tool | Purpose |
|---|---|
| **JetBrains IDE / VS Code** | Code editing and project management |
| **Git / GitHub** | Version control and collaboration |
| **Postman** | API endpoint testing |
| **pgAdmin / Supabase Studio** | Database administration and query testing |

---

*Continue in REPORT_PART2.md → Database Design*
