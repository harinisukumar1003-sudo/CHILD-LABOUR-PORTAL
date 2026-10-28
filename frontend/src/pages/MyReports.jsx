import { CalendarDays, ChevronRight, Copy, FileText, MapPin, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import CaseStatusTimeline from '../components/CaseStatusTimeline';

const tone = {
  REPORTED: 'pending',
  UNDER_REVIEW: 'active',
  ASSIGNED: 'active',
  INVESTIGATING: 'active',
  RESCUED: 'active',
  REHABILITATION: 'active',
  CLOSED: 'closed',
  REJECTED: 'urgent',
};

export default function MyReports() {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/my-reports')
      .then(response => setReports(response.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const openReport = report => {
    setSelected(report);
    setTimeline([]);
    api.get(`/cases/${encodeURIComponent(report.caseNumber)}/timeline`)
      .then(response => setTimeline(response.data.data || []))
      .catch(() => {});
  };

  const copyCode = (code, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard?.writeText(code);
    toast.success('Tracking code copied!');
  };

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Your contribution</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">My reports</h1>
          <p className="mt-2 text-slate-500">Thank you for helping make your community safer.</p>
        </div>
      </div>

      {loading ? (
        <p className="mt-10 text-slate-500">Loading your reports...</p>
      ) : !reports.length ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <FileText className="mx-auto text-slate-400" />
          <p className="mt-3 font-bold text-slate-700">No reports yet</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {reports.map(report => (
            <div
              key={report.id}
              onClick={() => openReport(report)}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs transition hover:border-teal-300 hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[#0b4f4b] text-base">{report.caseNumber}</p>
                  <p className="mt-1 text-xs text-slate-500">{report.childName || 'Child details kept private'}</p>
                </div>
                <Badge tone={tone[report.status] || 'active'}>{report.status.replaceAll('_', ' ')}</Badge>
              </div>

              {report.trackingCode && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tracking Code</span>
                    <p className="font-mono text-xs font-bold text-slate-800 select-all">{report.trackingCode}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => copyCode(report.trackingCode, e)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>
              )}

              <div className="mt-5 flex items-center gap-4 text-xs text-slate-500">
                <span>
                  <MapPin className="mr-1 inline" size={14} />
                  {report.district || report.locationAddress}
                </span>
                <span>
                  <CalendarDays className="mr-1 inline" size={14} />
                  {new Date(report.createdAt).toLocaleDateString()}
                </span>
                <ChevronRight className="ml-auto text-slate-400" size={18} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.caseNumber || 'Report details'}>
        {selected && (
          <div className="space-y-5 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">Status</p>
                <div className="mt-1">
                  <Badge tone={tone[selected.status] || 'active'}>{selected.status.replaceAll('_', ' ')}</Badge>
                </div>
              </div>
              <span className="text-xs text-slate-500">Submitted {new Date(selected.createdAt).toLocaleDateString()}</span>
            </div>

            {selected.trackingCode && (
              <div className="flex items-center justify-between rounded-xl border border-teal-800/10 bg-[#f7faf8] px-4 py-2.5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tracking code for public tracker</p>
                  <p className="font-mono text-sm font-bold text-[#0b4f4b] select-all">{selected.trackingCode}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyCode(selected.trackingCode)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <Copy size={13} /> Copy
                  </button>
                  <Link
                    to={`/track-case?caseNumber=${encodeURIComponent(selected.caseNumber)}&trackingCode=${encodeURIComponent(selected.trackingCode)}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-teal-700/20 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-100 transition"
                  >
                    <Search size={13} /> Track
                  </Link>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-bold uppercase text-slate-400">Location</p>
              <p className="mt-1 text-slate-700">{selected.locationAddress}</p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-slate-400">Incident</p>
              <p className="mt-1 leading-6 text-slate-700">{selected.incidentDescription}</p>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <CaseStatusTimeline entries={timeline} currentStatus={selected.status} />
            </div>

            <p className="border-t border-slate-100 pt-4 text-xs text-slate-500">
              Submitted {new Date(selected.createdAt).toLocaleString()}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
