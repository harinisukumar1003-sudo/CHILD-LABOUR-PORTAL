import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import { dashboardPathForRole } from '../utils/roles';

const links = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Track Case', to: '/track-case' },
];

export default function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { token, role, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-amber-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-8" aria-label="Public navigation">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Logo size="md" showText className="shrink-0" />
        <div className="hidden items-center gap-5 text-sm font-semibold md:flex">
          {links.map(link => <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => `transition ${isActive ? 'text-teal-800' : 'text-slate-600 hover:text-teal-800'}`}>{link.label}</NavLink>)}
          <Link to="/report" className="rounded-xl bg-[#c94b32] px-4 py-2.5 text-white shadow-sm transition hover:bg-[#a83d2a]">Report a Case</Link>
          {token ? (
            <>
              <Link to={dashboardPathForRole(role)} onClick={() => setMenuOpen(false)} className="text-slate-600 hover:text-teal-800">Dashboard</Link>
              <button type="button" onClick={signOut} className="text-slate-600 hover:text-teal-800">Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-slate-600 hover:text-teal-800">Login</Link>
              <Link to="/register" className="rounded-xl border border-teal-800 px-3.5 py-2 text-teal-800 transition hover:bg-teal-50">Register</Link>
            </>
          )}
        </div>
        <button type="button" aria-expanded={menuOpen} aria-controls="public-mobile-menu" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} onClick={() => setMenuOpen(open => !open)} className="grid h-10 w-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {menuOpen && <div id="public-mobile-menu" className="mx-auto grid max-w-7xl gap-1 border-t border-slate-100 pb-2 pt-3 md:hidden">
        {links.map(link => <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{link.label}</Link>)}
        <Link to="/report" onClick={() => setMenuOpen(false)} className="mt-1 rounded-xl bg-[#c94b32] px-3 py-3 text-center text-sm font-bold text-white">Report a Case</Link>
        {token ? <><Link to={dashboardPathForRole(role)} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700">Dashboard</Link><button type="button" onClick={signOut} className="rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700">Log out</button></> : <div className="grid grid-cols-2 gap-2 pt-1"><Link to="/login" onClick={() => setMenuOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-center text-sm font-semibold text-slate-700">Login</Link><Link to="/register" onClick={() => setMenuOpen(false)} className="rounded-lg bg-teal-800 px-3 py-2.5 text-center text-sm font-semibold text-white">Register</Link></div>}
      </div>}
    </nav>
  );
}
