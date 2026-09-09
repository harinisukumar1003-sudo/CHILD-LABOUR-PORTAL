import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './routes/PrivateRoute';
import RoleBasedRoute from './routes/RoleBasedRoute';
import { Toaster } from 'react-hot-toast';

const AppShell = lazy(() => import('./layouts/AppShell'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PublicLanding = lazy(() => import('./pages/PublicLanding'));
const About = lazy(() => import('./pages/About'));
const ReportCase = lazy(() => import('./pages/ReportCase'));
const TrackCase = lazy(() => import('./pages/TrackCase'));
const MyReports = lazy(() => import('./pages/MyReports'));
const CaseManagement = lazy(() => import('./pages/CaseManagement'));
const CaseDetail = lazy(() => import('./pages/CaseDetail'));
const RehabilitationManagement = lazy(() => import('./pages/RehabilitationManagement'));
const RehabilitationDetail = lazy(() => import('./pages/RehabilitationDetail'));
const RehabilitationFollowUps = lazy(() => import('./pages/RehabilitationFollowUps'));
const RehabilitationCenters = lazy(() => import('./pages/RehabilitationCenters'));
const Notifications = lazy(() => import('./pages/Notifications'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminAuditLog = lazy(() => import('./pages/AdminAuditLog'));
const SessionTimeoutModal = lazy(() => import('./components/SessionTimeoutModal'));
const PrivacyDataHandling = lazy(() => import('./pages/PrivacyDataHandling'));
const Login = lazy(() => import('./pages/AuthPages').then(module => ({ default: module.Login })));
const Register = lazy(() => import('./pages/AuthPages').then(module => ({ default: module.Register })));
const ForgotPassword = lazy(() => import('./pages/AuthPages').then(module => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/AuthPages').then(module => ({ default: module.ResetPassword })));

function PageLoader() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fffaf2] px-6 text-slate-900">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-amber-100 border-t-[#0b4f4b]" />
        <p className="mt-4 text-sm font-semibold text-slate-500">Loading CLRMS...</p>
      </div>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="bottom-right" toastOptions={{ duration: 3500 }} />
        <Suspense fallback={<PageLoader />}>
          <SessionTimeoutModal />
          <Routes>
            <Route path="/" element={<PublicLanding />} />
            <Route path="/about" element={<About />} />
            <Route path="/report-case" element={<ReportCase />} />
            <Route path="/track-case" element={<TrackCase />} />
            <Route path="/privacy-data-handling" element={<PrivacyDataHandling />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route element={<PrivateRoute />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route element={<RoleBasedRoute roles={['OFFICER', 'NGO_STAFF', 'ADMIN']} />}>
                  <Route path="/cases" element={<CaseManagement />} />
                  <Route path="/cases/:id" element={<CaseDetail />} />
                </Route>
                <Route element={<RoleBasedRoute roles={['OFFICER', 'NGO_STAFF', 'ADMIN']} />}>
                  <Route path="/notifications" element={<Notifications />} />
                </Route>
                <Route element={<RoleBasedRoute roles={['OFFICER', 'NGO_STAFF', 'ADMIN']} />}>
                  <Route path="/rehabilitation" element={<RehabilitationManagement />} />
                  <Route path="/rehabilitation/:id" element={<RehabilitationDetail />} />
                  <Route path="/rehabilitation/follow-ups" element={<RehabilitationFollowUps />} />
                  <Route path="/rehabilitation/centers" element={<RehabilitationCenters />} />
                </Route>
                <Route element={<RoleBasedRoute roles={['CITIZEN']} />}>
                  <Route path="/my-reports" element={<MyReports />} />
                </Route>
                <Route element={<RoleBasedRoute roles={['CITIZEN']} />}>
                  <Route path="/citizen/dashboard" element={<Dashboard />} />
                </Route>
                <Route element={<RoleBasedRoute roles={['OFFICER', 'NGO_STAFF']} />}>
                  <Route path="/staff/dashboard" element={<Dashboard />} />
                </Route>
                <Route element={<RoleBasedRoute roles={['ADMIN']} />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/audit-log" element={<AdminAuditLog />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
export default App;
