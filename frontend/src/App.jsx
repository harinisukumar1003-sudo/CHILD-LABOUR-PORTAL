import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import PrivateRoute from './routes/PrivateRoute';
import RoleBasedRoute from './routes/RoleBasedRoute';
import { dashboardPathForRole } from './utils/roles';
import { Toaster } from 'react-hot-toast';
import RouteSeo from './components/RouteSeo';
import ErrorBoundary from './components/ErrorBoundary';

const AppShell = lazy(() => import('./layouts/AppShell'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CitizenDashboard = lazy(() => import('./pages/CitizenDashboard'));
const PublicLanding = lazy(() => import('./pages/PublicLanding'));
const About = lazy(() => import('./pages/About'));
const HelpResources = lazy(() => import('./pages/HelpResources'));
const CollaborationFormPage = lazy(() => import('./pages/CollaborationFormPage'));
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
const Forbidden = lazy(() => import('./pages/Forbidden'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminSubmissions = lazy(() => import('./pages/AdminSubmissions'));
const AdminReportsExport = lazy(() => import('./pages/AdminReportsExport'));
const CitizenReportDetail = lazy(() => import('./pages/CitizenReportDetail'));
const AccountProfile = lazy(() => import('./pages/AccountPages').then(module => ({ default: module.AccountProfile })));
const AccountSettings = lazy(() => import('./pages/AccountPages').then(module => ({ default: module.AccountSettings })));
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

function DashboardRedirect() {
  const { role } = useAuth();
  return <Navigate to={dashboardPathForRole(role)} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="bottom-right" toastOptions={{ duration: 3500 }} />
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <RouteSeo />
            <SessionTimeoutModal />
            <Routes>
            <Route path="/" element={<PublicLanding />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<HelpResources type="faq" />} />
            <Route path="/resources" element={<HelpResources type="resources" />} />
            <Route path="/volunteer" element={<CollaborationFormPage type="volunteer" />} />
            <Route path="/partner-with-us" element={<CollaborationFormPage type="partnership" />} />
            <Route path="/contact" element={<About />} />
            <Route path="/report" element={<ReportCase />} />
            <Route path="/report-case" element={<ReportCase />} />
            <Route path="/track-case" element={<TrackCase />} />
            <Route path="/privacy-policy" element={<PrivacyDataHandling />} />
            <Route path="/privacy-data-handling" element={<PrivacyDataHandling />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route element={<PrivateRoute />}>
              <Route element={<AppShell />}>
                <Route path="/403" element={<Forbidden />} />
                <Route path="/profile" element={<AccountProfile />} />
                <Route path="/settings" element={<AccountSettings />} />
                <Route element={<RoleBasedRoute roles={['OFFICER', 'ADMIN']} />}>
                  <Route path="/cases" element={<CaseManagement />} />
                  <Route path="/cases/:id" element={<CaseDetail />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/rehabilitation-centers" element={<RehabilitationCenters />} />
                  <Route element={<RoleBasedRoute roles={['OFFICER', 'ADMIN']} />}>
                    <Route path="/officer/dashboard" element={<Dashboard />} />
                  </Route>
                </Route>
                <Route element={<RoleBasedRoute roles={['NGO_STAFF', 'ADMIN']} />}>
                  <Route path="/rehabilitation" element={<RehabilitationManagement />} />
                  <Route path="/rehabilitation/:id" element={<RehabilitationDetail />} />
                  <Route path="/rehabilitation/follow-ups" element={<RehabilitationFollowUps />} />
                  <Route path="/rehabilitation/centers" element={<RehabilitationCenters />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/ngo/dashboard" element={<Dashboard />} />
                </Route>
                <Route element={<RoleBasedRoute roles={['CITIZEN']} />}>
                  <Route path="/my-reports" element={<MyReports />} />
                  <Route path="/citizen/my-reports" element={<MyReports />} />
                  <Route path="/citizen/reports/:id" element={<CitizenReportDetail />} />
                  <Route path="/citizen/dashboard" element={<CitizenDashboard />} />
                </Route>
                <Route element={<RoleBasedRoute roles={['ADMIN']} />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/submissions" element={<AdminSubmissions />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/audit-log" element={<AdminAuditLog />} />
                  <Route path="/admin/reports-export" element={<AdminReportsExport />} />
                </Route>
              </Route>
            </Route>
            <Route element={<PrivateRoute />}>
              <Route path="/dashboard" element={<DashboardRedirect />} />
            </Route>
            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
export default App;
