import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Download,
  FileBarChart2,
  FileText,
  Landmark,
  Moon,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const statusColors = {
  REPORTED: '#38bdf8',
  UNDER_REVIEW: '#f59e0b',
  ASSIGNED: '#8b5cf6',
  INVESTIGATING: '#0f766e',
  RESCUED: '#f43f5e',
  REHABILITATION: '#10b981',
  CLOSED: '#64748b',
  REJECTED: '#dc2626',
};
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
const chartTooltipStyle = {
  borderRadius: 14,
  border: '1px solid #dbe7e4',
  boxShadow: '0 12px 36px rgba(15, 40, 38, .14)',
  fontSize: 12,
};

function toLabel(value) {
  return statusLabels[value] || value?.replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase()) || 'Update';
}

function monthLabel(value) {
  if (!value) return '';
  const date = new Date(`${value}-01T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

function getErrorMessage(error) {
  return error.response?.data?.message || error.message || 'The request could not be completed.';
}

function CountUp({ value, suffix = '', decimals = 0, loading }) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 85, damping: 18, mass: 0.8 });
  const display = useTransform(spring, current => `${current.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`);

  useEffect(() => {
    if (!loading) motionValue.set(Number(value) || 0);
  }, [loading, motionValue, value]);

  return loading ? <span>—</span> : <motion.span>{display}</motion.span>;
}

function KpiCard({ icon: Icon, title, value, suffix, decimals = 0, trend, color, index, loading, trendIsPoints = false, positiveIsGood = true }) {
  const change = Number(trend) || 0;
  const up = change >= 0;
  const favorable = change === 0 || (up === positiveIsGood);
  const trendLabel = trendIsPoints
    ? `${Math.abs(change).toFixed(1)} pp`
    : `${Math.abs(change).toFixed(1)}%`;
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.42 }}
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_34px_rgba(20,45,43,0.07)] sm:p-6"
    >
      <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-teal-50/70 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <span className={`grid h-11 w-11 place-items-center rounded-xl ${color}`}><Icon size={20} strokeWidth={1.8} /></span>
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${loading ? 'text-slate-400' : favorable ? 'text-emerald-700' : 'text-rose-700'}`}>
          {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {loading ? '—' : trendLabel}
        </span>
      </div>
      <p className="relative mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{title}</p>
      <p className="relative mt-1 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-[2.1rem]">
        <CountUp value={value} suffix={suffix} decimals={decimals} loading={loading} />
      </p>
      <p className="relative mt-2 text-[11px] font-medium text-slate-400">vs last month</p>
    </motion.article>
  );
}

function ChartCard({ eyebrow, title, subtitle, children, className = '', index = 0 }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.42 }}
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_34px_rgba(20,45,43,0.06)] sm:p-6 ${className}`}
    >
      <header className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-teal-700">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-800">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </header>
      {children}
    </motion.section>
  );
}

function TrendChart({ points, loading, darkMode }) {
  const data = points || [];
  const tickColor = darkMode ? '#9cbab5' : '#94a3b8';
  return (
    <ChartCard eyebrow="Network performance" title="Case trends" subtitle="Reports received and cases resolved over the last 12 months." className="w-full" index={4}>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-semibold text-slate-500" aria-label="Chart legend">
        <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-teal-700" />Cases reported</span>
        <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Cases resolved</span>
      </div>
      <div className="h-[300px] w-full sm:h-[340px]" aria-label="Area chart of reports and resolutions by month">
        {loading ? <ChartSkeleton /> : data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 14, right: 10, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="reportedAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f766e" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#0f766e" stopOpacity={0.015} />
                </linearGradient>
                <linearGradient id="resolvedAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 6" stroke={darkMode ? '#294541' : '#e8efed'} />
              <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} dy={8} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                labelFormatter={value => monthLabel(value)}
                formatter={(value, name) => [value, name === 'totalCases' ? 'Cases reported' : 'Cases resolved']}
              />
              <Area type="monotone" dataKey="totalCases" name="Cases reported" stroke="#0f766e" strokeWidth={3} fill="url(#reportedAreaGradient)" activeDot={{ r: 5, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="resolvedCases" name="Cases resolved" stroke="#10b981" strokeWidth={2.5} fill="url(#resolvedAreaGradient)" activeDot={{ r: 4, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <ChartEmpty message="Case trend data is not available yet." />}
      </div>
    </ChartCard>
  );
}

function StatusDonut({ points, loading, darkMode }) {
  const data = useMemo(() => (points || []).map(item => ({ ...item, name: toLabel(item.key) })).filter(item => item.count > 0), [points]);
  const total = data.reduce((sum, item) => sum + item.count, 0);
  return (
    <ChartCard eyebrow="Portfolio mix" title="Cases by status" subtitle="How all reported cases are progressing." index={5}>
      {loading ? <ChartSkeleton /> : data.length ? (
        <>
          <div className="relative mx-auto h-[220px] max-w-[300px]" aria-label="Donut chart of cases by status">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="count" nameKey="name" innerRadius={65} outerRadius={91} paddingAngle={3} stroke="none">
                  {data.map(item => <Cell key={item.key} fill={statusColors[item.key] || '#94a3b8'} />)}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value, name) => [`${value} cases`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className={`pointer-events-none absolute inset-0 grid place-content-center text-center ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
              <span className="text-3xl font-extrabold">{total.toLocaleString('en-IN')}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Total cases</span>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-slate-100 pt-4">
            {data.map(item => (
              <div key={item.key} className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: statusColors[item.key] || '#94a3b8' }} />
                <span className="truncate text-[11px] text-slate-500">{item.name}</span>
                <span className="ml-auto text-[11px] font-bold text-slate-700">{item.count}</span>
              </div>
            ))}
          </div>
        </>
      ) : loading ? null : <ChartEmpty message="Status data is not available yet." />}
    </ChartCard>
  );
}

function DistrictBars({ points, loading, darkMode }) {
  const data = useMemo(() => [...(points || [])].sort((left, right) => right.count - left.count).slice(0, 8), [points]);
  const tickColor = darkMode ? '#9cbab5' : '#64748b';
  return (
    <ChartCard eyebrow="Regional coverage" title="Cases by district" subtitle="Districts ranked by total reported cases." index={6}>
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold text-slate-500" aria-label="Chart legend">
        <span className="h-2.5 w-2.5 rounded-sm bg-teal-700" />Total cases
      </div>
      <div className="h-[320px] w-full" aria-label="Horizontal bar chart of cases by district">
        {loading ? <ChartSkeleton /> : data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 2, right: 14, left: 2, bottom: 2 }} barCategoryGap={9}>
              <defs>
                <linearGradient id="districtBarGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0f766e" />
                  <stop offset="100%" stopColor="#2dd4bf" />
                </linearGradient>
              </defs>
              <CartesianGrid horizontal={false} strokeDasharray="3 6" stroke={darkMode ? '#294541' : '#e8efed'} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="key" width={112} tick={{ fontSize: 10, fill: tickColor }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={value => [`${value} cases`, 'Reported']} />
              <Bar dataKey="count" name="Reported cases" fill="url(#districtBarGradient)" radius={[0, 7, 7, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        ) : <ChartEmpty message="District data is not available yet." />}
      </div>
    </ChartCard>
  );
}

function ChartSkeleton() {
  return <div className="h-full w-full animate-pulse rounded-xl bg-slate-50" />;
}

function ChartEmpty({ message }) {
  return <div className="grid h-full min-h-44 place-items-center rounded-xl bg-slate-50 px-4 text-center text-xs text-slate-500">{message}</div>;
}

function RecentActivity({ items, loading, error }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.56, duration: 0.42 }}
      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_34px_rgba(20,45,43,0.06)]"
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-teal-700">Governance</p><h2 className="mt-1 text-lg font-bold text-slate-800">Recent activity</h2><p className="mt-1 text-xs text-slate-500">Latest administrative actions and audit events.</p></div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50 text-teal-800"><Activity size={17} /></span>
      </header>
      {error ? <p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">{error}</p> : loading ? (
        <div className="space-y-3" aria-busy="true">{[0, 1, 2].map(item => <div key={item} className="h-12 animate-pulse rounded-lg bg-slate-50" />)}</div>
      ) : items.length ? (
        <div className="relative">
          <span className="absolute bottom-3 left-[13px] top-3 w-px bg-slate-100" />
          <div className="space-y-1">
            {items.slice(0, 8).map((item, index) => {
              const rejected = item.action?.includes('SUSPEND');
              const Icon = item.action?.includes('APPROVE') ? BadgeCheck : rejected ? ShieldAlert : FileBarChart2;
              return (
                <article key={item.id || `${item.action}-${item.timestamp}-${index}`} className="relative flex gap-3 py-3 first:pt-1 last:pb-1">
                  <span className={`z-10 grid h-[27px] w-[27px] shrink-0 place-items-center rounded-full border bg-white ${rejected ? 'border-amber-100 text-amber-700' : 'border-teal-100 text-teal-700'}`}><Icon size={13} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-5 text-slate-700">{toLabel(item.action)}</p>
                    <p className="truncate text-[10px] text-slate-400">{item.targetEntity}{item.targetId ? ` · #${item.targetId}` : ''}</p>
                    <time className="mt-1 block text-[10px] text-slate-400">{item.timestamp ? new Date(item.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recently'}</time>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : <div className="rounded-xl bg-slate-50 px-3 py-8 text-center text-xs text-slate-500">No recent audit events.</div>}
      <Link to="/admin/audit-log" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-teal-800 hover:underline">Open full audit log <ArrowUpRight size={14} /></Link>
    </motion.section>
  );
}

function PendingApprovals({ items, total, loading, error, onAction, darkMode }) {
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const act = async (user, action) => {
    setBusyId(user.id);
    setActionError('');
    try {
      await onAction(user, action);
    } catch (requestError) {
      setActionError(getErrorMessage(requestError));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <motion.section
      id="pending-approvals"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.64, duration: 0.42 }}
      className={`scroll-mt-6 rounded-2xl border p-5 shadow-[0_12px_34px_rgba(20,45,43,0.06)] ${darkMode ? 'border-[#705a25] bg-[#102b2a]' : 'border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-white to-white'}`}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-amber-800">Access review</p><h2 className="mt-1 text-lg font-bold text-slate-800">Pending approvals</h2><p className="mt-1 text-xs text-slate-500">New Officer and NGO Staff registrations.</p></div>
        <span className="grid h-9 min-w-9 place-items-center rounded-xl bg-amber-100 px-2 text-sm font-extrabold text-amber-900">{total ?? '—'}</span>
      </header>
      {error ? <p role="alert" className="rounded-xl bg-amber-100/70 p-3 text-xs leading-5 text-amber-950">{error}</p> : loading ? (
        <div className="space-y-3" aria-busy="true">{[0, 1].map(item => <div key={item} className="h-16 animate-pulse rounded-xl bg-amber-50" />)}</div>
      ) : items.length ? (
        <div className="space-y-2.5">
          {items.slice(0, 5).map(user => (
            <article key={user.id} className={`rounded-xl border p-3.5 ${darkMode ? 'border-[#594921] bg-[#153330]' : 'border-amber-100 bg-white/80'}`}>
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-800"><Users size={17} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{user.name}</p>
                  <p className="truncate text-[11px] text-slate-500">{user.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${user.role === 'OFFICER' ? 'bg-teal-50 text-teal-800' : 'bg-violet-50 text-violet-800'}`}>{toLabel(user.role)}</span>
                    {user.district && <span className="text-[10px] text-slate-400">{user.district}</span>}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button type="button" disabled={busyId !== null} onClick={() => act(user, 'reject')} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 transition hover:border-rose-200 hover:text-rose-700 disabled:opacity-50"><X size={12} />Reject</button>
                <button type="button" disabled={busyId !== null} onClick={() => act(user, 'approve')} className="inline-flex items-center gap-1 rounded-lg bg-[#0b4f4b] px-2.5 py-1.5 text-[10px] font-bold text-white transition hover:bg-[#083f3c] disabled:opacity-50">{busyId === user.id ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}Approve</button>
              </div>
            </article>
          ))}
          {total > items.length && <p className="pt-1 text-center text-[10px] font-medium text-slate-400">{total - items.length} more awaiting review</p>}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/60 px-4 py-7 text-center">
          <CheckCircle2 size={22} className="mx-auto text-emerald-700" />
          <p className="mt-2 text-xs font-semibold text-emerald-900">You’re all caught up</p>
          <p className="mt-1 text-[10px] text-emerald-800/70">No registrations are waiting for review.</p>
        </div>
      )}
      {actionError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-800">{actionError}</p>}
    </motion.section>
  );
}

function AdminDashboard() {
  const { darkMode, toggleDarkMode, dispatch } = useAuth();
  const [analytics, setAnalytics] = useState({ overview: null, status: null, district: null, trend: null });
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingTotal, setPendingTotal] = useState(null);
  const [auditItems, setAuditItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState({});
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);

  const loadDashboard = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
      setErrors({});
    }
    const requests = await Promise.allSettled([
      api.get('/admin/dashboard/overview'),
      api.get('/admin/dashboard/cases-by-status'),
      api.get('/admin/dashboard/cases-by-district'),
      api.get('/admin/dashboard/cases-trend'),
      api.get('/admin/users', { params: { status: 'PENDING', size: 5 } }),
      api.get('/admin/audit-logs', { params: { size: 8 } }),
    ]);
    const [overview, status, district, trend, users, audit] = requests;
    const nextErrors = {};
    const nextAnalytics = {};
    const valueOrError = (result, key, fallback) => {
      if (result.status === 'fulfilled') return result.value.data.data;
      nextErrors[key] = getErrorMessage(result.reason);
      return fallback;
    };
    nextAnalytics.overview = valueOrError(overview, 'overview', null);
    nextAnalytics.status = valueOrError(status, 'status', []);
    nextAnalytics.district = valueOrError(district, 'district', []);
    nextAnalytics.trend = valueOrError(trend, 'trend', []);
    if (users.status === 'fulfilled') {
      const page = users.value.data.data;
      setPendingUsers(page?.content || []);
      setPendingTotal(page?.totalElements ?? 0);
      dispatch({ type: 'SET_PENDING_APPROVALS', payload: page?.totalElements ?? 0 });
    } else {
      nextErrors.approvals = getErrorMessage(users.reason);
    }
    if (audit.status === 'fulfilled') setAuditItems(audit.value.data.data?.content || []);
    else nextErrors.audit = getErrorMessage(audit.reason);
    setAnalytics(nextAnalytics);
    setErrors(nextErrors);
    setLoading(false);
    setRefreshing(false);
  }, [dispatch]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const approveUser = async (user, action) => {
    const endpoint = action === 'approve' ? 'approve' : 'suspend';
    await api.put(`/admin/users/${user.id}/${endpoint}`);
    setPendingUsers(current => current.filter(item => item.id !== user.id));
    setPendingTotal(current => Math.max(0, (current ?? 0) - 1));
    dispatch({ type: 'SET_PENDING_APPROVALS', payload: Math.max(0, (pendingTotal ?? 0) - 1) });
    try {
      const audit = await api.get('/admin/audit-logs', { params: { size: 8 } });
      setAuditItems(audit.data.data?.content || []);
    } catch (error) {
      setErrors(current => ({ ...current, audit: getErrorMessage(error) }));
    }
  };

  const exportReport = async () => {
    setExporting(true);
    setExportError('');
    try {
      const response = await api.get('/admin/reports/export', { params: { format: 'csv' }, responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'clrms-case-report.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(getErrorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  const overview = analytics.overview;

  return (
    <div className="space-y-6 pb-10">
      <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700"><ShieldCheck size={15} />Stakeholder overview</div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Command centre</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">A live, network-wide view of response, recovery, and the people powering the work.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={toggleDarkMode} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-teal-300 hover:text-teal-800">
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button type="button" onClick={() => loadDashboard(true)} disabled={refreshing} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-teal-300 hover:text-teal-800 disabled:opacity-60">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button type="button" onClick={exportReport} disabled={exporting} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0b4f4b] px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#083f3c] disabled:opacity-60">
            <Download size={15} /> {exporting ? 'Exporting…' : 'Export report'}
          </button>
        </div>
      </motion.header>
      {exportError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-800">{exportError}</p>}
      {errors.overview && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">
          <ShieldAlert size={16} /><span className="flex-1">{errors.overview}</span><button type="button" onClick={() => loadDashboard(true)} className="font-bold underline underline-offset-4">Retry</button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Organization-wide key performance indicators">
        <KpiCard icon={FileText} title="Total cases" value={overview?.totalCases} trend={overview?.totalCasesTrend} loading={loading || !overview} color="bg-teal-50 text-teal-800" index={0} />
        <KpiCard icon={Activity} title="Active cases" value={overview?.activeCases} trend={overview?.activeCasesTrend} loading={loading || !overview} color="bg-amber-50 text-amber-800" index={1} positiveIsGood={false} />
        <KpiCard icon={ShieldAlert} title="Children rescued" value={overview?.childrenRescued} trend={overview?.childrenRescuedTrend} loading={loading || !overview} color="bg-rose-50 text-rose-800" index={2} />
        <KpiCard icon={CheckCircle2} title="Resolution rate" value={overview?.resolutionRate} suffix="%" decimals={1} trend={overview?.resolutionRateTrend} trendIsPoints loading={loading || !overview} color="bg-emerald-50 text-emerald-800" index={3} />
      </section>

      <TrendChart points={analytics.trend} loading={loading && !analytics.trend} darkMode={darkMode} />
      {errors.trend && <p role="alert" className="-mt-3 text-xs text-amber-800">{errors.trend}</p>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_390px]">
        <main className="min-w-0 space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <StatusDonut points={analytics.status} loading={loading && !analytics.status} darkMode={darkMode} />
            <DistrictBars points={analytics.district} loading={loading && !analytics.district} darkMode={darkMode} />
          </div>
          {(errors.status || errors.district) && <p role="alert" className="text-xs text-amber-800">{[errors.status, errors.district].filter(Boolean).join(' ')}</p>}
        </main>
        <aside className="space-y-5">
          <RecentActivity items={auditItems} loading={loading && !auditItems.length} error={errors.audit} />
          <PendingApprovals
            items={pendingUsers}
            total={pendingTotal ?? overview?.pendingAccountApprovals}
            loading={loading && pendingTotal === null}
            error={errors.approvals}
            onAction={approveUser}
            darkMode={darkMode}
          />
        </aside>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-3 text-[11px] leading-5 text-teal-900/80">
        <Landmark size={15} className="shrink-0" />
        Metrics are calculated from CLRMS case and investigation records. Historical comparisons are aligned to the prior month-end.
      </div>
    </div>
  );
}

export default AdminDashboard;
