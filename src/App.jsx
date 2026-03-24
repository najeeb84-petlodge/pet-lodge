import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

// Auth pages
import Login        from './pages/auth/Login'
import Signup       from './pages/auth/Signup'
import AuthCallback from './pages/auth/AuthCallback'
import Unauthorized from './pages/auth/Unauthorized'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import Bookings       from './pages/admin/Bookings'
import Calendar       from './pages/admin/Calendar'
import Prices         from './pages/admin/Prices'
import Receipts       from './pages/admin/Receipts'
import Payments       from './pages/admin/Payments'
import Users          from './pages/admin/Users'

// Customer pages
import CustomerDashboard from './pages/customer/CustomerDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login"          element={<Login />} />
          <Route path="/signup"         element={<Signup />} />
          <Route path="/auth/callback"  element={<AuthCallback />} />
          <Route path="/unauthorized"   element={<Unauthorized />} />

          {/* Admin / Employee — protected, inside Layout */}
          <Route path="/admin" element={
            <ProtectedRoute requireStaff>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="bookings"  element={<Bookings />} />
            <Route path="calendar"  element={<Calendar />} />
            <Route path="prices"    element={<Prices />} />
            <Route path="receipts"  element={<Receipts />} />
            <Route path="payments"  element={<Payments />} />
            <Route path="users"     element={<Users />} />
          </Route>

          {/* Customer */}
          <Route path="/customer/dashboard" element={
            <ProtectedRoute>
              <CustomerDashboard />
            </ProtectedRoute>
          } />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
