import React from "react";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPageView from "./pages/LandingPageView";
import DashboardLayout from "./components/Layout/DashboardLayout";
import OverviewPage from "./pages/OverviewPage";
import DataManagementPage from "./pages/DataManagementPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import InactiveSellersPage from "./pages/InactiveSellersPage";
import AdminPage from "./pages/AdminPage";

//Analytics Page
import CoreTransactionalPage from "./pages/analyticsSubPages/CoreTransactionalPage";
import TimeCustomerPage from "./pages/analyticsSubPages/TimeCustomerPage"
import ProfitFinancialPage from "./pages/analyticsSubPages/ProfitFinancialPage"
import InventoryIntelligencePage from "./pages/analyticsSubPages/InventoryIntelligencePage"
import FraudDetectionPage from "./pages/analyticsSubPages/FraudDetectionPage"
import RevenueDropPage from "./pages/analyticsSubPages/RevenueDropPage"

//Dashboard
import DailySalesDashboard from "./components/DailySalesChart";
import QuantitySoldDashboard from './components/QuantitySoldDashboard';
import RevenuePerProductDashboard from './components/RevenueDashboardPerProduct'
import RevenuePerSellerDashboard from './components/RevenuePerSeller'
import RevenuePerCategoryDashboard from './components/RevenuePerCategory'
import MonthlyRevenuePerYear from './components/Phase3_Dashboard/MonthlyRevenuePerYear'
import MonthlySalesTrend from './components/Phase3_Dashboard/MonthlySalesTrend'
import CLTVDashboard from './components/Phase3_Dashboard/CLTVDashboard'
import MonthlyOrderCount from './components/Phase3_Dashboard/MonthlyOrderCount'
import AOVDashboard from './components/Phase3_Dashboard/AOVDashboard'
import CategoryProfitMarginDashboard from "./components/Phase6_Dashboard/CategoryProfitMarginDashboard"
import ProductProfitMarginDashboard from "./components/Phase6_Dashboard/ProductProfitMarginDashboard"
import RevenueDecreaseRatioDashboard from "./components/Phase6_Dashboard/RevenueDecreaseRatioDashboard"
import YoYRevenueGrowthDashboard from "./components/Phase6_Dashboard/YoYRevenueGrowthDashboard"

import LowStockDashboard from "./components/Phase8_Dashboard/LowStockDashboard";
import FastMovingDashboard from "./components/Phase8_Dashboard/FastMovingProductsDashboard";
import HighReturnsDashboard from "./components/Phase8_Dashboard/HighReturnProductsDashboard";
import WarehouseLoadIntelligenceDashboard from "./components/Phase8_Dashboard/WarehouseLoadDashboard";
import InventoryIntelligenceScoreDashboard from "./components/Phase8_Dashboard/InventoryIntelligenceScoreDashboard";

import FailedPaymentDashboard from "./components/Phase8_Dashboard/FailedPaymentsDashboard";
import HighReturnProductsDashboard from "./components/Phase8_Dashboard/HighReturnProductsDashboard";
import HighReturnRateCustomerDashboard from "./components/Phase8_Dashboard/HighReturnRateCustomersDashboard";
import SellerHighReturnsAllTimeDashboard from "./components/Phase8_Dashboard/SellerHighReturnsAllTimeDashboard";
import SellerHighReturnsRecentDashboard from "./components/Phase8_Dashboard/SellerHighReturnsRecentDashboard";

import WeeklyRevenueDropDashboard from "./components/Phase8_Dashboard/WeeklyRevenueDropDashboard";
import MonthlyRevenueDropDashboard from "./components/Phase8_Dashboard/MonthlyRevenueDropDashboard";
import YearlyRevenueDropDashboard from "./components/Phase8_Dashboard/YearlyRevenueDropDashboard";

import ReturnsPage from "./pages/ReturnsPage";


import Tester from "./pages/Tester"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPageView />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="data-management" element={<DataManagementPage />} />
         
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="analytics/core-transactional" element={<CoreTransactionalPage />} />
          <Route path="analytics/time-customer" element={<TimeCustomerPage />} />
          
          {/* Phase 2 */}
          <Route path="analytics/core-transactional/daily-sales-chart" element={<DailySalesDashboard />} />
          <Route path="analytics/core-transactional/quantity-sold-dashboard" element={<QuantitySoldDashboard />} />
          <Route path="analytics/core-transactional/revenue-per-product-dashboard" element={<RevenuePerProductDashboard />} />
          <Route path="analytics/core-transactional/revenue-per-seller-dashboard" element={<RevenuePerSellerDashboard />} />
          <Route path="analytics/core-transactional/revenue-per-category-dashboard" element={<RevenuePerCategoryDashboard />} />

          {/* Phase 3 */}
          <Route path="analytics/core-transactional/monthly-revenue-per-year" element={<MonthlyRevenuePerYear />} />
          <Route path="analytics/core-transactional/monthly-sales-trend" element={<MonthlySalesTrend />} />
          <Route path="analytics/core-transactional/monthly-order-count" element={<MonthlyOrderCount />} />
          <Route path="analytics/core-transactional/cltv-dashboard" element={<CLTVDashboard />} />
          <Route path="analytics/core-transactional/aov-dashboard" element={<AOVDashboard />} />

          {/* Phase 4 */}
          <Route path="analytics/inactive-sellers-page" element={<InactiveSellersPage />} />

          {/* Phase 5 */}
          <Route path="analytics/return" element={<ReturnsPage />} />

          {/* Phase 6  */}
          <Route path="analytics/profit-financial" element={<ProfitFinancialPage />} />

          <Route path="analytics/profit-financial/category-profit-margin" element={<CategoryProfitMarginDashboard />} />
          <Route path="analytics/profit-financial/product-profit-margin" element={<ProductProfitMarginDashboard />} />
          <Route path="analytics/profit-financial/revenue-decrease-ratio" element={<RevenueDecreaseRatioDashboard />} />
          <Route path="analytics/profit-financial/yoy-revenue-growth" element={<YoYRevenueGrowthDashboard />} />

          {/* Phase 8 */}
          <Route path="analytics/inventory" element={<InventoryIntelligencePage />} />
          <Route path="analytics/fraud-detection" element={<FraudDetectionPage />} />
          <Route path="analytics/revenue-drop" element={<RevenueDropPage />} />

            {/*  -- Inventory Intelligence Sub-Dashboards */}
            <Route path="analytics/inventory/low-stock" element={<LowStockDashboard />} />
            <Route path="analytics/inventory/fast-moving" element={<FastMovingDashboard />} />
            <Route path="analytics/inventory/high-returns" element={<HighReturnsDashboard />} />
            <Route path="analytics/inventory/warehouse-load-intelligence" element={<WarehouseLoadIntelligenceDashboard />} />
            <Route path="analytics/inventory/inventory-intelligence-score" element={<InventoryIntelligenceScoreDashboard />} />

            {/* Fraud Detection Dashboard */} 
            <Route path="analytics/fraud-detection/failed-payments" element={<FailedPaymentDashboard />} />
            <Route path="analytics/fraud-detection/high-return-products" element={<HighReturnProductsDashboard />} />
            <Route path="analytics/fraud-detection/high-return-customers" element={<HighReturnRateCustomerDashboard />} />
            <Route path="analytics/fraud-detection/all-time-return-sellers" element={<SellerHighReturnsAllTimeDashboard />} />
            <Route path="analytics/fraud-detection/recent-return-sellers" element={<SellerHighReturnsRecentDashboard />} />

           {/*  Revenue Drop Analysis Dashboards */}
            <Route path="analytics/revenue-drop/weekly" element={<WeeklyRevenueDropDashboard />} />
            <Route path="analytics/revenue-drop/monthly" element={<MonthlyRevenueDropDashboard />} />
            <Route path="analytics/revenue-drop/yearly" element={<YearlyRevenueDropDashboard />} />

          <Route path="inactive-sellers" element={<InactiveSellersPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="tester" element={<Tester />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
