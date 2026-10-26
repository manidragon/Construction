import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { ProjectDetails } from './pages/ProjectDetails';
import { BOQ } from './pages/BOQ';
import { Tasks } from './pages/Tasks';
import { DailyReports } from './pages/DailyReports';
import { Inventory } from './pages/Inventory';
import { Procurement } from './pages/Procurement';
import { Labour } from './pages/Labour';
import { Expenses } from './pages/Expenses';
import { Billing } from './pages/Billing';
import { Accounts } from './pages/Accounts';
import { Equipment } from './pages/Equipment';
import { Documents } from './pages/Documents';
import { OfficeManagement } from './pages/OfficeManagement';
import { Leads } from './pages/Leads';
import { Quotations } from './pages/Quotations';
import { SuperAdmin } from './pages/SuperAdmin';
import { SuperAdminLogin } from './pages/SuperAdminLogin';
import { SelfServeSignup } from './pages/SelfServeSignup';
import { CompanySettings } from './pages/CompanySettings';
import { ShiftLogger } from './pages/ShiftLogger';
import { RecycleBin } from './pages/RecycleBin';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-300">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide">Loading ApexBuild ERP...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Vendor Platform Admin Route Guard (strictly for software seller)
const VendorAdminRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-300">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide">Validating Vendor Credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/platform-admin/login" replace />;
  }

  return children;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SelfServeSignup />} />

            {/* Authenticated Application Shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="company-settings" element={<CompanySettings />} />
              <Route path="leads" element={<Leads />} />
              <Route path="quotations" element={<Quotations />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:id" element={<ProjectDetails />} />
              <Route path="boq" element={<BOQ />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="dpr" element={<DailyReports />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="procurement" element={<Procurement />} />
              <Route path="labour" element={<Labour />} />
              <Route path="attendance" element={<ShiftLogger />} />
              <Route path="shift-logger" element={<ShiftLogger />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="billing" element={<Billing />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="office" element={<OfficeManagement />} />
              <Route path="equipment" element={<Equipment />} />
              <Route path="documents" element={<Documents />} />
              <Route path="recycle-bin" element={<RecycleBin />} />
            </Route>

            {/* Dedicated SaaS Platform Vendor Portal (Completely separated from Client Construction ERP) */}
            <Route path="/platform-admin/login" element={<SuperAdminLogin />} />
            <Route path="/superadmin/login" element={<SuperAdminLogin />} />
            <Route
              path="/platform-admin"
              element={
                <VendorAdminRoute>
                  <SuperAdmin />
                </VendorAdminRoute>
              }
            />
            <Route
              path="/superadmin"
              element={
                <VendorAdminRoute>
                  <SuperAdmin />
                </VendorAdminRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
