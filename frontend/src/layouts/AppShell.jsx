import {
  BadgeCheck,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileBarChart2,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import NotificationBell from '../components/NotificationBell';
import OnboardingTour from '../components/OnboardingTour';
import PrivacyBanner from '../components/PrivacyBanner';
import { dashboardPathForRole } from '../utils/roles';

const menu = [
  { label: 'Overview', icon: LayoutDashboard, roles: ['CITIZEN', 'OFFICER', 'NGO_STAFF', 'ADMIN'], destination: 'dashboard' },
  { label: 'My reports', icon: FileText, to: '/citizen/my-reports', roles: ['CITIZEN'] },
  { label: 'Case reports', icon: FileText, to: '/cases', roles: ['OFFICER', 'ADMIN'], tour: 'case-navigation' },
  { label: 'My rehabilitation cases', icon: HeartHandshake, to: '/rehabilitation', roles: ['NGO_STAFF', 'ADMIN'] },
  { label: 'Rehabilitation centres', icon: BriefcaseBusiness, to: '/rehabilitation-centers', roles: ['OFFICER', 'NGO_STAFF', 'ADMIN'] },
  { label: 'Notifications', icon: BadgeCheck, to: '/notifications', roles: ['OFFICER', 'NGO_STAFF', 'ADMIN'] },
  { label: 'User accounts', icon: Users, to: '/admin/users', roles: ['ADMIN'] },
  { label: 'Inquiries & Volunteers', icon: HeartHandshake, to: '/admin/submissions', roles: ['ADMIN'] },
  { label: 'Pending approvals', icon: BadgeCheck, to: '/admin/dashboard#pending-approvals', roles: ['ADMIN'] },
  { label: 'Audit log', icon: ClipboardList, to: '/admin/audit-log', roles: ['ADMIN'] },
  { label: 'Export reports', icon: FileBarChart2, to: '/admin/reports-export', roles: ['ADMIN'] },
];

function routeFor(item, role) {
  if (item.destination === 'dashboard') return dashboardPathForRole(role);
  return item.to;
}

export default function AppShell() {
  const [open, setOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { user, role, darkMode, pendingApprovals, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const adminDark = role === 'ADMIN' && darkMode;
  const visibleMenu = menu.filter(item => item.roles.includes(role));

  useEffect(() => {
    if (!location.hash) return;
    document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash, location.pathname]);

  const submitSearch = event => {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    navigate(`/cases?keyword=${encodeURIComponent(query)}`);
    setSearch('');
    setProfileOpen(false);
    setOpen(false);
  };

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={`min-h-screen text-neutral-900 transition-colors ${adminDark ? 'admin-dark bg-[#081f1e] text-slate-100' : 'bg-[#f6f8f8]'}`}>
      <aside className={`fixed inset-y-0 left-0 z-30 flex ${sidebarCollapsed ? 'w-20 px-4' : 'w-64 px-5'} flex-col py-6 text-white shadow-xl transition-all lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'} ${adminDark ? 'bg-[#061a19]' : 'bg-[#0b4f4b]'}`}>
        <div className={`flex ${sidebarCollapsed ? 'flex-col' : 'items-center justify-between'} gap-2`}>
          <Logo size="md" showText={!sidebarCollapsed} className="min-w-0 [&_strong]:text-white [&_small]:text-teal-200" />
          <button type="button" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-pressed={sidebarCollapsed} onClick={() => setSidebarCollapsed(collapsed => !collapsed)} className="hidden h-8 w-8 shrink-0 place-items-center rounded-lg text-teal-100 hover:bg-white/10 lg:grid">
            {sidebarCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
        </div>
        {!sidebarCollapsed && <p className="mt-10 px-3 text-[10px] font-bold uppercase tracking-[.17em] text-teal-200">Workspace</p>}
        <nav className={`${sidebarCollapsed ? 'mt-8' : 'mt-3'} flex-1 space-y-1 overflow-y-auto`} aria-label="Workspace navigation">
          {visibleMenu.map(({ label, icon: Icon, to, destination, tour }) => {
            const target = routeFor({ to, destination }, role);
            const active = label === 'Pending approvals'
              ? location.pathname === '/admin/dashboard' && location.hash === '#pending-approvals'
              : destination
                ? location.pathname === target
                : location.pathname === to || (to !== '/admin/dashboard#pending-approvals' && location.pathname.startsWith(`${to}/`));
            return (
              <NavLink key={label} to={target} data-tour={tour} aria-label={sidebarCollapsed ? label : undefined} title={sidebarCollapsed ? label : undefined} onClick={() => { setOpen(false); setProfileOpen(false); }} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${sidebarCollapsed ? 'justify-center px-0' : ''} ${active ? 'bg-white/15 font-semibold text-white' : 'text-teal-100 hover:bg-white/10'}`}>
                <Icon size={18} />
                {!sidebarCollapsed && <span className="flex-1">{label}</span>}
                {!sidebarCollapsed && label === 'Pending approvals' && pendingApprovals > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-300 px-1.5 text-[10px] font-extrabold text-teal-950">{pendingApprovals}</span>}
              </NavLink>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-white/15 pt-4">
          <Link to="/settings" aria-label={sidebarCollapsed ? 'Settings' : undefined} title={sidebarCollapsed ? 'Settings' : undefined} onClick={() => { setOpen(false); setProfileOpen(false); }} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-teal-100 hover:bg-white/10 ${sidebarCollapsed ? 'justify-center px-0' : ''}`}><Settings size={18} />{!sidebarCollapsed && 'Settings'}</Link>
          {!sidebarCollapsed && <p className="px-3 pt-2 text-xs leading-5 text-teal-200">A safer tomorrow starts with noticing today.</p>}
        </div>
      </aside>

      {open && <button type="button" aria-label="Close navigation menu" onClick={() => setOpen(false)} className="fixed inset-0 z-20 bg-slate-950/40 lg:hidden" />}

      <div className={`min-h-screen ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <header className={`sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b px-4 sm:px-6 ${adminDark ? 'border-[#2a514d] bg-[#102b2a]' : 'border-slate-100 bg-white/95 backdrop-blur'}`}>
          <button aria-label={open ? 'Close sidebar' : 'Open sidebar'} aria-expanded={open} onClick={() => setOpen(!open)} className={`rounded-lg p-2 transition lg:hidden ${adminDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <form onSubmit={submitSearch} role="search" className="relative hidden w-full max-w-md sm:block">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input value={search} onChange={event => setSearch(event.target.value)} aria-label="Search case reports" placeholder="Search case reports..." className={`w-full rounded-xl border py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 ${adminDark ? 'border-[#2a514d] bg-[#0d2423] text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-700'}`} />
          </form>
          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            <NotificationBell />
            <div className={`relative border-l pl-3 sm:pl-4 ${adminDark ? 'border-[#2a514d]' : 'border-slate-200'}`}>
              <button type="button" aria-expanded={profileOpen} aria-haspopup="menu" onClick={() => setProfileOpen(value => !value)} className="flex items-center gap-2 rounded-xl p-1.5 text-left hover:bg-slate-50">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-100 text-sm font-bold text-primary">{user?.initials || 'U'}</span>
                <span className="hidden max-w-36 sm:block"><span className={`block truncate text-sm font-semibold ${adminDark ? 'text-slate-100' : 'text-slate-800'}`}>{user?.name || 'CLRMS User'}</span><span className="block truncate text-[11px] text-slate-500">{role?.replaceAll('_', ' ')}</span></span>
                <ChevronDown size={15} className="text-slate-400" />
              </button>
              {profileOpen && <div role="menu" className="absolute right-0 top-12 z-40 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 text-sm shadow-xl">
                <Link role="menuitem" to="/profile" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2.5 font-semibold text-slate-700 hover:bg-slate-50">Profile</Link>
                <Link role="menuitem" to="/settings" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2.5 font-semibold text-slate-700 hover:bg-slate-50">Settings</Link>
                <button role="menuitem" type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left font-semibold text-rose-700 hover:bg-rose-50"><LogOut size={15} />Log out</button>
              </div>}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
          {['OFFICER', 'NGO_STAFF', 'ADMIN'].includes(role) && <PrivacyBanner />}
          <div data-tour="dashboard-overview"><Outlet /></div>
        </main>
        <footer className={`flex flex-wrap items-center justify-between gap-4 px-5 py-5 text-xs sm:px-8 ${adminDark ? 'text-slate-400' : 'text-slate-400'}`}>
          <Logo size="md" showText />
          <span><Link to="/privacy-policy" className="hover:text-teal-700">Privacy & data handling</Link><span className="mx-2">·</span>Protecting childhood, strengthening communities</span>
        </footer>
      </div>
      <OnboardingTour key={location.pathname} role={role} pathname={location.pathname} />
    </div>
  );
}
