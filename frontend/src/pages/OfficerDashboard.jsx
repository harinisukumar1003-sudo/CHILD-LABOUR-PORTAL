import { motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  HeartHandshake,
  ListChecks,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const statusLabels = {
  REPORTED: 'Reported',
  UNDER_REVIEW: 'Under investigation',
  ASSIGNED: 'Assigned',
  INVESTIGATING: 'Investigating',
  RESCUED: 'Rescued',
  REHABILITATION: 'Rehabilitation',
  CLOSED: 'Closed',
  REJECTED: 'Rejected',
};
const statusStyles = {
  REPORTED: 'bg-sky-50 text-sky-700 ring-sky-100',
  UNDER_REVIEW: 'bg-amber-50 text-amber-800 ring-amber-100',
  ASSIGNED: 'bg-violet-50 text-violet-700 ring-violet-100',
  INVESTIGATING: 'bg-teal-50 text-teal-800 ring-teal-100',
  RESCUED: 'bg-rose-50 text-rose-700 ring-rose-100',
  REHABILITATION: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
  CLOSED: 'bg-slate-100 text-slate-600 ring-slate-200',
  REJECTED: 'bg-red-50 text-red-700 ring-red-100',
};
const statusChartColors = {
  REPORTED: '#38bdf8',
  UNDER_REVIEW: '#f59e0b',
  ASSIGNED: '#8b5cf6',
  INVESTIGATING: '#0f766e',
  RESCUED: '#f43f5e',
  REHABILITATION: '#10b981',
  CLOSED: '#64748b',
  REJECTED: '#dc2626',
};
const urgencyStyles = {
  CRITICAL: 'bg-red-50 text-red-700',
  HIGH: 'bg-amber-50 text-amber-800',
  MEDIUM: 'bg-sky-50 text-sky-700',
  LOW: 'bg-slate-100 text-slate-600',
};
const transitions = {
  REPORTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['ASSIGNED', 'REJECTED'],
  ASSIGNED: ['INVESTIGATING'],
  INVESTIGATING: ['RESCUED', 'REJECTED'],
  RESCUED: ['REHABILITATION'],
  REHABILITATION: ['CLOSED'],
};

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-IN', options) : 'Date unavailable';
}

function formatDateTime(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'Time unavailable';
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusStyles[status] || statusStyles.REPORTED}`}>
      {statusLabels[status] || status?.replaceAll('_', ' ') || 'Unknown'}
    </span>
  );
}

function UrgencyBadge({ level }) {
  const isCritical = level === 'CRITICAL';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${urgencyStyles[level] || urgencyStyles.MEDIUM}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isCritical ? 'animate-pulse bg-red-600' : 'bg-current'}`} />
      {level || 'MEDIUM'}
    </span>
  );
}

function KpiCard({ title, value, detail, Icon, alert = false, alertTone = 'amber', index }) {
  const highlighted = alert && value > 0;
  const alertStyles = alertTone === 'red'
    ? { card: 'border-red-200 bg-gradient-to-br from-red-50 to-white', icon: 'bg-red-100 text-red-800', badge: 'bg-red-100 text-red-800', value: 'text-red-900' }
    : { card: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white', icon: 'bg-amber-100 text-amber-800', badge: 'bg-amber-100 text-amber-800', value: 'text-amber-900' };
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className={`rounded-2xl border p-5 shadow-sm ${highlighted ? alertStyles.card : 'border-slate-200 bg-white'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${highlighted ? alertStyles.icon : 'bg-teal-50 text-teal-800'}`}>
          <Icon size={19} />
        </span>
        {highlighted && <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${alertStyles.badge}`}>Needs attention</span>}
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{title}</p>
      <p className={`mt-1 text-3xl font-bold tracking-tight ${highlighted ? alertStyles.value : 'text-slate-900'}`}>{value}</p>
      <p className="mt-1.5 text-xs text-slate-500">{detail}</p>
    </motion.article>
  );
}

function DistributionPanel({ counts }) {
  const chartData = Object.entries(counts || {})
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ status, name: statusLabels[status] || status, value: count }));
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Your workload</p>
        <h2 className="mt-1 text-lg font-bold text-slate-800">Case distribution</h2>
        <p className="mt-1 text-xs text-slate-500">A personal view of your assigned cases by status.</p>
      </header>
      {chartData.length ? (
        <div className="grid items-center gap-4 sm:grid-cols-[minmax(150px,190px)_1fr]">
          <div className="relative mx-auto h-44 w-full max-w-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={57} outerRadius={78} paddingAngle={3} stroke="none">
                  {chartData.map(item => <Cell key={item.status} fill={statusChartColors[item.status] || '#94a3b8'} />)}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
              <span className="text-2xl font-bold text-slate-800">{total}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">assigned</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-3">
            {chartData.map(item => (
              <div key={item.status} className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: statusChartColors[item.status] || '#94a3b8' }} />
                <span className="truncate text-xs text-slate-500">{item.name}</span>
                <span className="ml-auto text-xs font-bold text-slate-700">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid min-h-44 place-items-center rounded-xl bg-slate-50 text-center">
          <div><Activity size={25} className="mx-auto text-slate-300" /><p className="mt-2 text-sm font-medium text-slate-500">No case distribution yet</p></div>
        </div>
      )}
    </section>
  );
}

function PanelHeader({ eyebrow, title, subtitle, action }) {
  return (
    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-bold text-slate-800">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export default function OfficerDashboard() {
  const { role, user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [sort, setSort] = useState({ key: 'createdAt', direction: 'desc' });
  const [completedFollowUps, setCompletedFollowUps] = useState([]);
  const [activeCase, setActiveCase] = useState(null);
  const [nextStatus, setNextStatus] = useState('');
  const [remarks, setRemarks] = useState('');
  const [statusError, setStatusError] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/dashboard/summary')
      .then(response => {
        if (active) setSummary(response.data.data);
      })
      .catch(requestError => {
        if (active) setError(getErrorMessage(requestError, 'The dashboard summary could not be loaded.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const reloadSummary = async () => {
    setRefreshing(true);
    setError('');
    try {
      const response = await api.get('/dashboard/summary');
      setSummary(response.data.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'The dashboard summary could not be refreshed.'));
    } finally {
      setRefreshing(false);
    }
  };

  const assignedCases = useMemo(() => {
    const items = [...(summary?.assignedCases || [])];
    return items.sort((left, right) => {
      let comparison;
      if (sort.key === 'createdAt') comparison = new Date(left.createdAt) - new Date(right.createdAt);
      else if (sort.key === 'urgencyLevel') {
        const rank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        comparison = (rank[left.urgencyLevel] || 0) - (rank[right.urgencyLevel] || 0);
      } else comparison = String(left[sort.key] || '').localeCompare(String(right[sort.key] || ''));
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [summary, sort]);

  const upcomingFollowUps = summary?.upcomingFollowUps || [];
  const recentActivity = summary?.recentActivity || [];
  const roleLabel = role === 'NGO_STAFF' ? 'NGO case operations' : 'Officer command center';
  const greeting = user?.name ? `Good to see you, ${user.name.split(' ')[0]}` : 'Your case operations';
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const changeSort = key => {
    setSort(current => current.key === key
      ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: key === 'createdAt' ? 'desc' : 'asc' });
  };

  const openStatusUpdate = caseItem => {
    setActiveCase(caseItem);
    setNextStatus(transitions[caseItem.status]?.[0] || '');
    setRemarks('');
    setStatusError('');
  };

  const submitStatusUpdate = async event => {
    event.preventDefault();
    if (!remarks.trim()) {
      setStatusError('Add a short case note to record this status update.');
      return;
    }
    setSavingStatus(true);
    setStatusError('');
    try {
      await api.post(`/cases/${activeCase.id}/status`, { status: nextStatus, remarks: remarks.trim() });
      setActiveCase(null);
      setNotice(`${activeCase.caseNumber} was updated to ${statusLabels[nextStatus] || nextStatus}.`);
      await reloadSummary();
      window.setTimeout(() => setNotice(''), 4500);
    } catch (requestError) {
      setStatusError(getErrorMessage(requestError, 'The case status could not be updated.'));
    } finally {
      setSavingStatus(false);
    }
  };

  const toggleFollowUp = id => {
    setCompletedFollowUps(current => current.includes(id)
      ? current.filter(item => item !== id)
      : [...current, id]);
  };

  const kpis = [
    { title: 'Assigned Cases', value: summary?.assignedCasesCount ?? 0, detail: 'Cases in your active queue', Icon: FileText },
    { title: 'Pending Investigations', value: summary?.pendingInvestigations ?? 0, detail: 'Awaiting investigation progress', Icon: Clock3 },
    { title: 'Critical / Urgent Cases', value: summary?.criticalCasesCount ?? 0, detail: 'Open critical cases needing attention', Icon: ShieldAlert, alert: true, alertTone: 'red' },
    { title: 'Follow-ups Due Today', value: summary?.followUpsDueToday ?? 0, detail: 'Scheduled for today', Icon: CalendarClock, alert: true },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-8">
      <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700">
            <ShieldCheck size={15} /> {roleLabel}
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-[2rem]">{greeting}</h1>
          <p className="mt-1.5 text-sm text-slate-500">A clear view of your cases, next steps, and today’s follow-ups.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs font-medium text-slate-400 sm:inline">{todayLabel}</span>
          <button
            type="button"
            onClick={reloadSummary}
            disabled={refreshing}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-teal-300 hover:text-teal-800 disabled:opacity-60"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </motion.header>

      {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><CheckCircle2 size={17} />{notice}</div>}
      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle size={18} /><span className="flex-1">{error}</span>
          <button type="button" onClick={reloadSummary} className="font-bold underline underline-offset-4">Retry</button>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Case operations key performance indicators">
        {kpis.map((kpi, index) => <KpiCard key={kpi.title} {...kpi} index={index} value={loading ? '—' : kpi.value} />)}
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_370px]">
        <main className="min-w-0 space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
              <PanelHeader
                eyebrow="Action queue"
                title="My Case Queue"
                subtitle="Assigned cases, ordered by the field that matters to you."
                action={<span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800">{assignedCases.length} cases</span>}
              />
            </div>
            {loading ? (
              <div className="space-y-3 p-5" aria-busy="true" aria-label="Loading assigned cases">
                {[0, 1, 2].map(item => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}
              </div>
            ) : assignedCases.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left">
                  <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5"><SortButton label="Case" column="caseNumber" sort={sort} onClick={changeSort} /></th>
                      <th className="px-4 py-3.5"><SortButton label="Status" column="status" sort={sort} onClick={changeSort} /></th>
                      <th className="px-4 py-3.5"><SortButton label="Urgency" column="urgencyLevel" sort={sort} onClick={changeSort} /></th>
                      <th className="px-4 py-3.5">District</th>
                      <th className="px-4 py-3.5"><SortButton label="Reported" column="createdAt" sort={sort} onClick={changeSort} /></th>
                      <th className="px-5 py-3.5 text-right">Quick actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignedCases.map(caseItem => (
                      <tr key={caseItem.id} className="transition hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <Link to={`/cases/${caseItem.id}`} className="font-mono text-xs font-bold text-teal-800 hover:underline">{caseItem.caseNumber}</Link>
                        </td>
                        <td className="px-4 py-4"><StatusBadge status={caseItem.status} /></td>
                        <td className="px-4 py-4"><UrgencyBadge level={caseItem.urgencyLevel} /></td>
                        <td className="max-w-36 truncate px-4 py-4 text-xs text-slate-500" title={caseItem.district || ''}>{caseItem.district || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{formatDate(caseItem.createdAt)}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={!transitions[caseItem.status]?.length}
                              onClick={() => openStatusUpdate(caseItem)}
                              className="rounded-lg bg-teal-800 px-2.5 py-2 text-[11px] font-bold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                            >
                              Update Status
                            </button>
                            <Link to={`/cases/${caseItem.id}`} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-bold text-slate-600 transition hover:border-teal-300 hover:text-teal-800">
                              View Details
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-700"><ListChecks size={23} /></div>
                <h3 className="mt-3 font-bold text-slate-800">Your queue is clear</h3>
                <p className="mt-1 text-sm text-slate-500">Assigned cases will appear here when they’re ready for your attention.</p>
                <Link to="/cases" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-teal-800 hover:underline">Open case management <ArrowRight size={15} /></Link>
              </div>
            )}
          </section>

          <DistributionPanel counts={summary?.casesByStatus} />

          <section className="rounded-2xl bg-gradient-to-r from-[#0b4f4b] to-[#146b62] p-5 text-white shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-amber-200"><HeartHandshake size={20} /></span>
              <div>
                <h2 className="font-bold">Keep the work moving</h2>
                <p className="mt-1 max-w-xl text-xs leading-5 text-teal-100">Jump straight to your case board or rehabilitation plans to take the next step.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 sm:mt-0 sm:shrink-0">
              <Link to="/cases" className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-xs font-bold text-teal-900 transition hover:bg-teal-50">Case Management <ArrowRight size={14} /></Link>
              <Link to="/rehabilitation" className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-white/20">Rehabilitation <ArrowRight size={14} /></Link>
            </div>
          </section>
        </main>

        <aside className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <PanelHeader eyebrow="Live feed" title="Recent Activity" subtitle="The latest 10 updates across your cases." />
            {loading ? (
              <div className="space-y-4" aria-busy="true" aria-label="Loading recent activity">
                {[0, 1, 2].map(item => <div key={item} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}
              </div>
            ) : recentActivity.length ? (
              <div className="relative space-y-0">
                <span className="absolute bottom-4 left-[11px] top-3 w-px bg-slate-100" />
                {recentActivity.slice(0, 10).map((activity, index) => (
                  <article key={`${activity.caseNumber}-${activity.createdAt}-${index}`} className="relative flex gap-3 py-3 first:pt-1 last:pb-1">
                    <span className="z-10 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-teal-100 bg-white text-teal-700">
                      {activity.status === 'CLOSED' ? <CheckCircle2 size={13} /> : <Activity size={13} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <Link to="/cases" className="font-mono text-[10px] font-bold text-teal-800 hover:underline">{activity.caseNumber}</Link>
                        <time className="text-[10px] text-slate-400">{formatDateTime(activity.createdAt)}</time>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-700">{statusLabels[activity.status] || activity.status?.replaceAll('_', ' ')}</p>
                      {activity.remarks && <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{activity.remarks}</p>}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 px-4 py-8 text-center">
                <Activity size={22} className="mx-auto text-slate-300" />
                <p className="mt-2 text-xs text-slate-500">Case updates will appear here.</p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <PanelHeader
              eyebrow="Rehabilitation"
              title="Follow-ups Due"
              subtitle="Scheduled check-ins for cases in your care."
              action={<Link to="/rehabilitation/follow-ups" aria-label="Open follow-ups" className="rounded-lg p-1.5 text-slate-400 hover:bg-teal-50 hover:text-teal-800"><ChevronRight size={18} /></Link>}
            />
            {!loading && (
              <div className="mb-4 flex items-center justify-between rounded-xl bg-amber-50 px-3.5 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-900"><CalendarClock size={15} />Due today</div>
                <span className="text-lg font-bold text-amber-900">{summary?.followUpsDueToday ?? 0}</span>
              </div>
            )}
            {loading ? (
              <div className="space-y-3" aria-busy="true" aria-label="Loading follow-ups">
                {[0, 1].map(item => <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}
              </div>
            ) : upcomingFollowUps.length ? (
              <div className="space-y-2.5">
                {upcomingFollowUps.slice(0, 5).map((item, index) => {
                  const id = item.id ?? `${item.caseNumber}-${item.followUpDate}-${index}`;
                  const checked = completedFollowUps.includes(id);
                  const isToday = item.followUpDate === new Date().toISOString().slice(0, 10);
                  return (
                    <article key={id} className={`flex items-start gap-3 rounded-xl border p-3 transition ${checked ? 'border-emerald-200 bg-emerald-50/60' : isToday ? 'border-amber-200 bg-amber-50/40' : 'border-slate-100 bg-slate-50/60'}`}>
                      <button
                        type="button"
                        onClick={() => toggleFollowUp(id)}
                        aria-label={`${checked ? 'Uncheck' : 'Check off'} follow-up for ${item.caseNumber}`}
                        aria-pressed={checked}
                        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${checked ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent hover:border-teal-600'}`}
                      >
                        <Check size={13} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link to="/rehabilitation" className="font-mono text-[10px] font-bold text-teal-800 hover:underline">{item.caseNumber}</Link>
                          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${isToday ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>{isToday ? 'Today' : formatDate(item.followUpDate, { day: 'numeric', month: 'short' })}</span>
                        </div>
                        <p className={`mt-1.5 line-clamp-2 text-xs font-semibold ${checked ? 'text-slate-500 line-through' : 'text-slate-700'}`}>{item.description || (item.activityType ? item.activityType.replaceAll('_', ' ').toLowerCase() : 'Scheduled check-in')}</p>
                        {item.providerName && <p className="mt-1 truncate text-[10px] text-slate-400">{item.providerName}</p>}
                      </div>
                      {item.rehabilitationCaseId && (
                        <Link to={`/rehabilitation/${item.rehabilitationCaseId}`} aria-label={`Open rehabilitation plan for ${item.caseNumber}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-teal-800">
                          <ArrowRight size={14} />
                        </Link>
                      )}
                    </article>
                  );
                })}
                <Link to="/rehabilitation/follow-ups" className="inline-flex items-center gap-1 pt-1 text-xs font-bold text-teal-800 hover:underline">View follow-up schedule <ArrowRight size={13} /></Link>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 px-4 py-7 text-center">
                <Stethoscope size={22} className="mx-auto text-slate-300" />
                <p className="mt-2 text-xs text-slate-500">No upcoming follow-ups on your cases.</p>
              </div>
            )}
          </section>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-800"><ShieldCheck size={17} /></span>
              <div><p className="text-xs font-bold text-slate-700">Private workspace</p><p className="mt-0.5 text-[10px] leading-4 text-slate-400">Case details are visible only to authorized staff.</p></div>
            </div>
          </div>
        </aside>
      </div>

      <Modal open={!!activeCase} onClose={() => !savingStatus && setActiveCase(null)} title="Update case status">
        {activeCase && (
          <form onSubmit={submitStatusUpdate} className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="font-mono text-xs font-bold text-teal-800">{activeCase.caseNumber}</p>
              <p className="mt-1 text-xs text-slate-500">Current status: {statusLabels[activeCase.status] || activeCase.status}</p>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              New status
              <select value={nextStatus} onChange={event => setNextStatus(event.target.value)} required className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-50">
                {(transitions[activeCase.status] || []).map(status => <option key={status} value={status}>{statusLabels[status] || status}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Case note
              <textarea value={remarks} onChange={event => setRemarks(event.target.value)} rows={3} required placeholder="Briefly record what changed and any important next step…" className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-50" />
            </label>
            {statusError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{statusError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" disabled={savingStatus} onClick={() => setActiveCase(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={savingStatus || !nextStatus} className="inline-flex items-center gap-2 rounded-xl bg-[#0b4f4b] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#083f3c] disabled:opacity-60">
                {savingStatus && <LoaderCircle size={16} className="animate-spin" />} Save update
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function SortButton({ label, column, sort, onClick }) {
  const active = sort.key === column;
  const Icon = active ? sort.direction === 'asc' ? ArrowUp : ArrowDown : null;
  return (
    <button type="button" onClick={() => onClick(column)} className="inline-flex items-center gap-1.5 text-inherit transition hover:text-teal-800">
      {label}{Icon && <Icon size={12} />}
    </button>
  );
}
