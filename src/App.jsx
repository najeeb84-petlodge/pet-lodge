import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import Login           from './pages/auth/Login'
import Signup          from './pages/auth/Signup'
import AuthCallback    from './pages/auth/AuthCallback'
import Unauthorized    from './pages/auth/Unauthorized'
import AdminDashboard  from './pages/admin/AdminDashboard'
import CustomerDashboard from './pages/customer/CustomerDashboard'
import MyPets          from './pages/customer/MyPets'
import MyBookings      from './pages/customer/MyBookings'
import BookingWizard   from './pages/BookingWizard'
import { WizardProvider } from './contexts/WizardContext'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login"         element={<Login />} />
          <Route path="/signup"        element={<Signup />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/unauthorized"  element={<Unauthorized />} />

          <Route path="/admin/dashboard" element={
            <ProtectedRoute requireStaff>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Legacy redirect */}
          <Route path="/customer/dashboard" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={
            <ProtectedRoute><CustomerDashboard /></ProtectedRoute>
          } />
          <Route path="/my-pets" element={
            <ProtectedRoute><MyPets /></ProtectedRoute>
          } />
          <Route path="/my-bookings" element={
            <ProtectedRoute><MyBookings /></ProtectedRoute>
          } />
          <Route path="/booking" element={
            <ProtectedRoute allowGuest>
              <WizardProvider><BookingWizard /></WizardProvider>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
