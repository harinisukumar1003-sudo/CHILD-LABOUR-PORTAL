import { Download, FileSpreadsheet, FileText, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import api from '../services/api';

const statuses = ['REPORTED', 'UNDER_REVIEW', 'ASSIGNED', 'INVESTIGATING', 'RESCUED', 'REHABILITATION', 'CLOSED', 'REJECTED'];
const urgencies = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function AdminReportsExport() {
  const [filters, setFilters] = useState({ format: 'csv', status: '', urgency: '', district: '', from: '', to: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const change = event => setFilters(current => ({ ...current, [event.target.name]: event.target.value }));

  const download = async event => {
    event.preventDefault();
    setError('');
    if (filters.from && filters.to && filters.from > filters.to) {
      setError('The start date must be on or before the end date.');
      return;
    }
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
      const response = await api.get('/admin/reports/export', { params, responseType: 'blob' });
      const filename = filters.format === 'pdf' ? 'clrms-case-report.pdf' : 'clrms-case-report.csv';
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'The export could not be created.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-teal-700"><ShieldCheck size={15} />Reporting tools</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Export case reports</h1><p className="mt-2 text-sm leading-6 text-slate-500">Choose a date range and optional filters to prepare an official case report file.</p></header>
      <form onSubmit={download} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft sm:p-8">
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">From date<input type="date" name="from" value={filters.from} onChange={change} className="field" /></label>
          <label className="text-sm font-semibold text-slate-700">To date<input type="date" name="to" value={filters.to} onChange={change} className="field" /></label>
          <label className="text-sm font-semibold text-slate-700">Status<select name="status" value={filters.status} onChange={change} className="field"><option value="">All statuses</option>{statuses.map(status => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-700">Urgency<select name="urgency" value={filters.urgency} onChange={change} className="field"><option value="">All urgency levels</option>{urgencies.map(urgency => <option key={urgency} value={urgency}>{urgency}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">District<input name="district" value={filters.district} onChange={change} placeholder="Any district" className="field" /></label>
        </div>
        <fieldset><legend className="text-sm font-bold text-slate-700">File format</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[['csv', 'CSV spreadsheet', FileSpreadsheet], ['pdf', 'PDF document', FileText]].map(([value, label, Icon]) => <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${filters.format === value ? 'border-teal-600 bg-teal-50/60' : 'border-slate-200'}`}><input type="radio" name="format" value={value} checked={filters.format === value} onChange={change} className="accent-teal-700" /><Icon size={18} className="text-teal-800" /><span className="text-sm font-bold text-slate-700">{label}</span></label>)}
        </div></fieldset>
        <button type="submit" disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0b4f4b] px-5 py-3 text-sm font-bold text-white hover:bg-teal-900 disabled:opacity-60"><Download size={16} />{loading ? 'Preparing export...' : 'Download report'}</button>
      </form>
    </div>
  );
}
