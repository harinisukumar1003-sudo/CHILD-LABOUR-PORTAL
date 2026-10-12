import { ArrowLeft, CalendarDays, MapPin, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Badge from '../components/Badge';
import CaseStatusTimeline from '../components/CaseStatusTimeline';
import api from '../services/api';

export default function CitizenReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loadedForId, setLoadedForId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get(`/reports/${encodeURIComponent(id)}`)
      .then(async response => {
        if (!active) return;
        const current = response.data.data;
        setError('');
        setReport(current);
        try {
          const history = await api.get(`/cases/${encodeURIComponent(current.caseNumber)}/timeline`);
          if (active) setTimeline(history.data.data || []);
        } catch (historyError) {
          if (active) setError(historyError.response?.data?.message || 'The report loaded, but its history could not be retrieved.');
        }
      })
      .catch(requestError => {
        if (active) {
          setReport(null);
          setTimeline([]);
          setError(requestError.response?.data?.message || 'This report could not be loaded.');
        }
      })
      .finally(() => { if (active) setLoadedForId(id); });
    return () => { active = false; };
  }, [id]);

  if (loadedForId !== id) return <div className="mx-auto max-w-4xl animate-pulse rounded-2xl bg-white p-8 text-sm text-slate-500" aria-busy="true">Loading report details…</div>;
  if (error && !report) return <section role="alert" className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-white p-7 text-sm text-rose-800">{error}<Link to="/citizen/my-reports" className="mt-4 block font-bold text-teal-800">Return to my reports</Link></section>;
  if (!report) return null;

  return <div className="mx-auto max-w-4xl space-y-5 pb-8">
    <Link to="/citizen/my-reports" className="inline-flex items-center gap-2 text-sm font-bold text-teal-800"><ArrowLeft size={16} />My reports</Link>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Report details</p><h1 className="mt-2 break-all text-2xl font-extrabold tracking-tight text-slate-900">{report.caseNumber}</h1></div><Badge tone="active">{report.status?.replaceAll('_', ' ')}</Badge></div>
      {error && <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
      <div className="mt-7 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2">
        <p className="flex items-start gap-2 text-sm text-slate-600"><MapPin size={17} className="mt-0.5 shrink-0 text-teal-700" /><span>{report.district || report.locationAddress || 'Location details are not available'}</span></p>
        <p className="flex items-start gap-2 text-sm text-slate-600"><CalendarDays size={17} className="mt-0.5 shrink-0 text-teal-700" /><span>Submitted {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'date unavailable'}</span></p>
        <div className="sm:col-span-2"><h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Incident summary</h2><p className="mt-2 text-sm leading-7 text-slate-700">{report.incidentDescription}</p></div>
      </div>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8"><h2 className="flex items-center gap-2 font-bold text-slate-800"><ShieldCheck size={18} className="text-teal-700" />Progress timeline</h2><div className="mt-6"><CaseStatusTimeline entries={timeline} currentStatus={report.status} /></div></section>
  </div>;
}
