import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { PageLoading } from './components/ui.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './components/AppLayout.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Farm = lazy(() => import('./pages/Farm.jsx'));
const Marketplace = lazy(() => import('./pages/Marketplace.jsx'));
const Orders = lazy(() => import('./pages/Orders.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const Assistant = lazy(() => import('./pages/Assistant.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/profile" element={<Profile />} />
                <Route element={<ProtectedRoute roles={['farmer']} />}>
                  <Route path="/farm" element={<Farm />} />
                </Route>
                <Route element={<ProtectedRoute roles={['farmer', 'admin']} />}>
                  <Route path="/reports" element={<Reports />} />
                </Route>
                <Route element={<ProtectedRoute roles={['farmer', 'buyer']} />}>
                  <Route path="/assistant" element={<Assistant />} />
                </Route>
                <Route element={<ProtectedRoute roles={['admin']} />}>
                  <Route path="/admin" element={<Admin />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
