import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardPathForRole } from '../utils/roles';

export default function Forbidden() {
  const { role } = useAuth();
  return (
    <main className="grid min-h-[65vh] place-items-center">
      <section className="w-full max-w-xl rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-xl shadow-amber-900/5 sm:p-10">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-700"><ShieldX size={27} /></span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-amber-700">Access restricted · 403</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0b4f4b]">This area isn’t part of your workspace.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">Your {role?.replaceAll('_', ' ').toLowerCase() || 'account'} role does not have access to this page. You can return to your dashboard.</p>
        <Link to={dashboardPathForRole(role)} className="mt-7 inline-flex rounded-xl bg-[#0b4f4b] px-5 py-3 text-sm font-bold text-white hover:bg-teal-800">Go to my dashboard</Link>
      </section>
    </main>
  );
}
