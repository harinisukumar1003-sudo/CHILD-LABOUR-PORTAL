import { LogOut, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardPathForRole } from '../utils/roles';

export function AccountProfile() {
  const { user, role } = useAuth();
  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-9">
      <div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-teal-800"><UserRound size={25} /></span><div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Account profile</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">{user?.name || 'CLRMS User'}</h1></div></div>
      <dl className="mt-8 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2">
        <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Email</dt><dd className="mt-1 break-all text-sm font-semibold text-slate-700">{user?.email || 'Not available'}</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Account role</dt><dd className="mt-1 text-sm font-semibold text-slate-700">{role?.replaceAll('_', ' ') || 'Not available'}</dd></div>
        <div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">District</dt><dd className="mt-1 text-sm font-semibold text-slate-700">{user?.district || 'Not specified'}</dd></div>
      </dl>
      <p className="mt-7 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">For security, CLRMS profile identity is managed by your account administrator. Contact your administrator if your name, email, or role needs to be changed.</p>
    </section>
  );
}

export function AccountSettings() {
  const { role, darkMode, toggleDarkMode, logout } = useAuth();
  const navigate = useNavigate();
  const signOut = () => { logout(); navigate('/login', { replace: true }); };
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700"><ShieldCheck size={15} />Preferences</p><h1 className="mt-2 text-3xl font-extrabold text-slate-900">Settings</h1><p className="mt-2 text-sm text-slate-500">Manage display preferences and your session.</p></header>
      {role === 'ADMIN' && <section className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><h2 className="font-bold text-slate-800">Dashboard appearance</h2><p className="mt-1 text-sm text-slate-500">Use a darker, low-glare color scheme on the admin workspace.</p></div><button type="button" onClick={toggleDarkMode} aria-pressed={darkMode} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">{darkMode ? <Sun size={15} /> : <Moon size={15} />}{darkMode ? 'Light mode' : 'Dark mode'}</button></section>}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><h2 className="font-bold text-slate-800">Security & privacy</h2><p className="mt-1 text-sm text-slate-500">Review how CLRMS protects sensitive case information.</p></div><Link to="/privacy-policy" className="text-sm font-bold text-teal-800 hover:underline">Privacy policy</Link></section>
      <button type="button" onClick={signOut} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-50"><LogOut size={16} />Sign out</button>
      <Link to={dashboardPathForRole(role)} className="ml-3 text-sm font-semibold text-slate-500 hover:text-teal-800">Return to dashboard</Link>
    </div>
  );
}
