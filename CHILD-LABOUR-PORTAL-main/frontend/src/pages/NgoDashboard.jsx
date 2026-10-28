import { useEffect, useState } from 'react';
import { CalendarClock, HeartHandshake, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import api from '../services/api';

const stats = [
  ['totalRehabilitationCases', 'My rehabilitation cases'],
  ['newlyReferred', 'New referrals'],
  ['inProgress', 'In progress'],
  ['followUpsPending', 'Follow-ups due'],
  ['completed', 'Completed'],
  ['awaitingAdminReview', 'Awaiting Admin review'],
];

export default function NgoDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.get('/ngo/dashboard').then(response => { if (active) setData(response.data.data); })
      .catch(requestError => { if (active) setError(requestError.response?.data?.message || 'Could not load your rehabilitation dashboard.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <div className="space-y-6">
    <header className="rounded-3xl bg-[#0b4f4b] p-6 text-white sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-200">NGO workspace</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">My rehabilitation cases</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-teal-50">Record support activities, follow-ups, progress notes, and completion reports for referrals assigned to your organization.</p>
      <Link to="/rehabilitation" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#0b4f4b] hover:bg-teal-50"><HeartHandshake size={17} />Open my cases</Link>
    </header>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Rehabilitation statistics">
      {stats.map(([key, label]) => <Card key={key} className="p-5"><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-3 text-3xl font-extrabold text-[#0b4f4b]">{loading ? '…' : data?.[key] ?? 0}</p></Card>)}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Assigned referrals</h2><p className="mt-1 text-sm text-slate-500">Only cases assigned to your organization appear here.</p></div><RefreshCcw size={18} className="text-teal-700" /></div>
      {loading ? <p className="py-10 text-center text-sm text-slate-500">Loading assigned referrals…</p> : data?.cases?.length ? <div className="mt-4 divide-y divide-slate-100">{data.cases.map(item => <Link key={item.id} to={`/rehabilitation/${item.id}`} className="flex flex-wrap items-center justify-between gap-3 py-4 hover:bg-teal-50/50"><span><span className="block font-mono text-sm font-bold text-teal-800">{item.caseNumber || `Case ${item.caseReportId}`}</span><span className="mt-1 block text-xs text-slate-500">{item.phase?.replaceAll('_', ' ')} · Started {item.startDate}</span></span><span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">{item.status?.replaceAll('_', ' ')}</span></Link>)}</div> : <div className="py-12 text-center"><CalendarClock className="mx-auto text-slate-300" size={28} /><p className="mt-3 text-sm font-semibold text-slate-600">No referrals assigned yet</p><p className="mt-1 text-xs text-slate-400">New referrals from the Admin will appear here.</p></div>}
    </section>
  </div>;
}
