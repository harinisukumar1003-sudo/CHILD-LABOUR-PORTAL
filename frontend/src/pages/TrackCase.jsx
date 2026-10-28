import { Search, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import CaseStatusTimeline from '../components/CaseStatusTimeline';
import PublicNavbar from '../components/PublicNavbar';

export default function TrackCase() {
  const [searchParams] = useSearchParams();
  const qCaseNumber = searchParams.get('caseNumber') || '';
  const qTrackingCode = searchParams.get('trackingCode') || '';

  const [values, setValues] = useState({ caseNumber: qCaseNumber, trackingCode: qTrackingCode });
  const [report, setReport] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = key => event => setValues({ ...values, [key]: event.target.value });

  const fetchTrack = useCallback(async (caseNum, trackCode) => {
    if (!caseNum || !trackCode) return;
    setError('');
    setReport(null);
    setTimeline([]);
    setLoading(true);
    try {
      const response = await api.get(`/reports/${encodeURIComponent(caseNum.trim())}/track`, {
        params: { trackingCode: trackCode.trim() },
      });
      setReport(response.data.data);
      const history = await api.get(`/cases/${encodeURIComponent(caseNum.trim())}/timeline`);
      setTimeline(history.data.data || []);
    } catch {
      setError('We could not find that report. Please check both details and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const submit = async event => {
    if (event) event.preventDefault();
    fetchTrack(values.caseNumber, values.trackingCode);
  };

  useEffect(() => {
    if (qCaseNumber && qTrackingCode) {
      fetchTrack(qCaseNumber, qTrackingCode);
    }
  }, [qCaseNumber, qTrackingCode, fetchTrack]);

  return (
    <main className="min-h-screen bg-[#fffaf2] px-5 pb-10 sm:px-8">
      <PublicNavbar />
      <div className="mx-auto max-w-3xl pt-10">
        <div className="rounded-3xl bg-white p-7 shadow-xl shadow-amber-900/10 sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-[#0b4f4b]">
            <Search size={23} />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-[#0b4f4b]">Track a case</h1>
          <p className="mt-2 leading-7 text-slate-600">
            Enter the case number and tracking code you received after submitting your report.
          </p>
          <form onSubmit={submit} className="mt-7 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-700">
              Case number
              <input
                required
                value={values.caseNumber}
                onChange={update('caseNumber')}
                placeholder="CLR-2026-000123"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-600"
              />
            </label>
            <label className="text-sm font-bold text-slate-700">
              Tracking code
              <input
                required
                value={values.trackingCode}
                onChange={update('trackingCode')}
                placeholder="Your private tracking code"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-600"
              />
            </label>
            {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
            <button
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b4f4b] px-5 py-3.5 font-bold text-white transition hover:bg-[#093e3b] disabled:opacity-60 sm:col-span-2 cursor-pointer"
            >
              {loading ? 'Checking status…' : <>Check status <Search size={17} /></>}
            </button>
          </form>
          {report && (
            <div className="mt-10 border-t border-slate-100 pt-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Current status</p>
                  <h2 className="mt-1 text-2xl font-bold text-[#0b4f4b]">{report.status.replaceAll('_', ' ')}</h2>
                </div>
                <ShieldCheck className="text-emerald-600" size={28} />
              </div>
              <dl className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Case number</dt>
                  <dd className="mt-1 break-all font-mono text-sm font-bold text-slate-800">{report.caseNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">District</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">{report.district || 'Not specified'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Urgency</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {report.urgencyLevel?.replaceAll('_', ' ') || 'Not specified'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Reported</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
              <div className="mt-10">
                <CaseStatusTimeline entries={timeline} currentStatus={report.status} />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}