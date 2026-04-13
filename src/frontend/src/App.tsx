import { Routes, Route } from 'react-router';
import PublicLayout from '@/components/layout/PublicLayout';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import StockDetailPage from '@/pages/StockDetailPage';
import SearchResultsPage from '@/pages/SearchResultsPage';
import PredictionsPage from '@/pages/PredictionsPage';
import SettingsPage from '@/pages/SettingsPage';
import AllStocksPage from '@/pages/AllStocksPage';
import NotFoundPage from '@/pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      {/* Public routes — redirect to /dashboard if authenticated */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected routes — redirect to /login if not authenticated */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/stocks" element={<AllStocksPage />} />
          <Route path="/stocks/:ticker" element={<StockDetailPage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/predictions" element={<PredictionsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
