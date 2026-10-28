import { Check, RefreshCw, Search, ShieldCheck, UserRound, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

function requestMessage(error) {
  return error.response?.data?.message || error.message || 'The request could not be completed.';
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [busyId, setBusyId] = useState(null);

  const loadUsers = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setError('');
    try {
      const response = await api.get('/admin/users', { params: { page: 0, size: 100 } });
      setUsers(response.data.data?.content || []);
    } catch (requestError) {
      setError(requestMessage(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    api.get('/admin/users', { params: { page: 0, size: 100 } })
      .then(response => { if (active) setUsers(response.data.data?.content || []); })
      .catch(requestError => { if (active) setError(requestMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const updateStatus = async (user, action) => {
    setBusyId(user.id);
    setError('');
    try {
      const response = await api.put(`/admin/users/${user.id}/${action}`);
      setUsers(current => current.map(item => item.id === user.id ? response.data.data : item));
    } catch (requestError) {
      setError(requestMessage(requestError));
    } finally {
      setBusyId(null);
    }
  };

  const visible = useMemo(() => users.filter(user => (
    (filter === 'ALL' || user.status === filter)
    && `${user.name} ${user.email} ${user.role} ${user.district || ''}`.toLowerCase().includes(query.toLowerCase())
  )), [filter, query, users]);

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-teal-700"><ShieldCheck size={15} />Access management</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">User accounts</h1><p className="mt-2 text-sm text-slate-500">Review registrations and manage access to the CLRMS staff workspace.</p></div>
        <button type="button" onClick={() => loadUsers(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />Refresh</button>
      </header>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <div className="relative flex-1"><Search size={17} className="absolute left-3 top-3 text-slate-400" /><input aria-label="Search users" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, email, role, or district" className="w-full rounded-xl bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-teal-100" /></div>
          <select aria-label="Filter users by status" value={filter} onChange={event => setFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"><option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></select>
        </div>
        {loading ? <div className="space-y-3 p-5" aria-busy="true">{[0, 1, 2].map(item => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-50" />)}</div> : visible.length ? (
          <div className="divide-y divide-slate-100">
            {visible.map(user => <article key={user.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:px-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-800"><UserRound size={18} /></span>
              <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-bold text-slate-800">{user.name}</h2><p className="truncate text-xs text-slate-500">{user.email}</p><p className="mt-1 text-[11px] text-slate-400">{user.role?.replaceAll('_', ' ')}{user.district ? ` · ${user.district}` : ''}</p></div>
              <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800' : user.status === 'PENDING' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{user.status}</span>
              {user.role !== 'ADMIN' && <div className="flex gap-2 sm:ml-2">
                {user.status !== 'ACTIVE' && <button type="button" disabled={busyId !== null} onClick={() => updateStatus(user, 'approve')} className="inline-flex items-center gap-1 rounded-lg bg-teal-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Check size={13} />Approve</button>}
                {user.status !== 'SUSPENDED' && <button type="button" disabled={busyId !== null} onClick={() => updateStatus(user, 'suspend')} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-50"><X size={13} />Suspend</button>}
              </div>}
            </article>)}
          </div>
        ) : <p className="p-12 text-center text-sm text-slate-500">No accounts match these filters.</p>}
      </section>
    </div>
  );
}
