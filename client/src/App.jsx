import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Spinner } from './components/common';
import { DebugPanel } from './utils/debug';

// Auth Pages
import { LoginPage, SignupPage } from './pages/auth';

// Manager Pages
import {
  ManagerDashboard,
  EmployeesPage,
  ShiftsPage as ManagerShiftsPage,
  BulkShiftsPage,
  PayrollPage as ManagerPayrollPage,
  ProfilePage as ManagerProfilePage,
  AvailabilityPage as ManagerAvailabilityPage,
  AnnouncementsPage,
  ReportsPage,
} from './pages/manager';

// Employee Pages
import {
  EmployeeDashboard,
  EmployeeShiftsPage,
  EmployeePayrollPage,
  EmployeeProfilePage,
  EmployeeAvailabilityPage,
} from './pages/employee';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on role
    if (user?.role === 'manager') {
      return <Navigate to="/manager/dashboard" replace />;
    }
    return <Navigate to="/employee/dashboard" replace />;
  }

  return children;
};

// Guest Route (only accessible when not logged in)
const GuestRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    // Redirect to appropriate dashboard based on role
    if (user?.role === 'manager') {
      return <Navigate to="/manager/dashboard" replace />;
    }
    return <Navigate to="/employee/dashboard" replace />;
  }

  return children;
};

// Home redirect based on role
const HomeRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'manager') {
    return <Navigate to="/manager/dashboard" replace />;
  }

  return <Navigate to="/employee/dashboard" replace />;
};

function App() {
  return (
    <>
      <Routes>
      {/* Home Route */}
      <Route path="/" element={<HomeRedirect />} />

      {/* Auth Routes */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <GuestRoute>
            <SignupPage />
          </GuestRoute>
        }
      />

      {/* Manager Routes */}
      <Route
        path="/manager/dashboard"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/employees"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <EmployeesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/shifts"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerShiftsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/bulk-shifts"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <BulkShiftsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/payroll"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerPayrollPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/profile"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/availability"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerAvailabilityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/announcements"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <AnnouncementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/reports"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      {/* Employee Routes */}
      <Route
        path="/employee/dashboard"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/shifts"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeShiftsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/payroll"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeePayrollPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/profile"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/availability"
        element={
          <ProtectedRoute allowedRoles={['employee']}>
            <EmployeeAvailabilityPage />
          </ProtectedRoute>
        }
      />

      {/* 404 - Catch all */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-gray-300">404</h1>
              <p className="text-xl text-gray-600 mt-4">Page not found</p>
              <a
                href="/"
                className="mt-6 inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Go Home
              </a>
            </div>
          </div>
        }
      />
      </Routes>
      <DebugPanel />
    </>
  );
}

export default App;
