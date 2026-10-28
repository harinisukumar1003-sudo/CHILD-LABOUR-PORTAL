import { AlertCircle, ArrowRight, Check, ChevronRight, CircleUserRound, Clock3, HeartHandshake, LoaderCircle, Search, ShieldCheck, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { phaseLabels, phases } from '../utils/rehabilitation';

const stageLabels = {
  REHABILITATION_REFERRED: 'Awaiting NGO decision',
  REHABILITATION_ACCEPTED: 'Rehabilitation accepted',
  ADMITTED_TO_CENTRE: 'Admitted to centre',
  IN_REHABILITATION: 'In rehabilitation',
  REINTEGRATED: 'Reintegrated',
  CLOSED: 'Closed',
};
const nextStages = {
  REHABILITATION_ACCEPTED: ['ADMITTED_TO_CENTRE', 'Record admission'],
  ADMITTED_TO_CENTRE: ['IN_REHABILITATION', 'Start rehabilitation'],
  IN_REHABILITATION: ['REINTEGRATED', 'Record reintegration'],
  REINTEGRATED: ['CLOSED', 'Close case'],
};

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

export function PhaseStepper({ currentPhase, compact = false }) {
  const active = phases.indexOf(currentPhase);
  return (
    <div className={`flex items-start ${compact ? 'gap-1' : 'gap-2'}`}>
      {phases.map((phase, index) => (
        <div key={phase} className="flex min-w-0 flex-1 items-start">
          <div className="flex min-w-0 flex-1 flex-col items-center">
            <span className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold ring-4 ring-white ${index <= active ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white' : 'bg-slate-100 text-slate-400'}`}>
              {index < active ? '✓' : index + 1}
            </span>
            <span className={`mt-2 text-center text-[9px] font-bold leading-3 ${index <= active ? 'text-teal-800' : 'text-slate-400'}`}>{phaseLabels[phase]}</span>
          </div>
          {index < phases.length - 1 && <span className={`mt-3 h-0.5 flex-1 ${index < active ? 'bg-teal-500' : 'bg-slate-200'}`} />}
        </div>
      ))}
    </div>
  );
}

export default function RehabilitationManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cases, setCases] = useState([]);
  const [centers, setCenters] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [stageOpen, setStageOpen] = useState(false);
  const [stageNote, setStageNote] = useState('');
  const [stageFields, setStageFields] = useState({
    centerId: '',
    admissionDate: '',
    educationUpdate: '',
    healthUpdate: '',
    counsellingUpdate: '',
  });

  const loadCases = async () => {
    const response = await api.get('/ngo/cases');
    const data = response.data?.data;
    if (!Array.isArray(data)) throw new Error('The server returned an invalid NGO case list.');
    setCases(data);
    setError('');
    return data;
  };

  const fetchHistory = useCallback(async item => {
    const response = await api.get(`/ngo/cases/${item.id}/status-history`);
    const data = response.data?.data;
    if (!Array.isArray(data)) throw new Error('The server returned an invalid case history.');
    return data;
  }, []);

  const openCase = useCallback(async item => {
    setSelectedCase(item);
    setHistory([]);
    setHistoryError('');
    setLoadingHistory(true);
    try {
      setHistory(await fetchHistory(item));
    } catch (requestError) {
      setHistoryError(getErrorMessage(requestError, 'Rehabilitation history could not be loaded.'));
    } finally {
      setLoadingHistory(false);
    }
  }, [fetchHistory]);

  useEffect(() => {
    let active = true;
    api.get('/ngo/cases')
      .then(response => {
        const data = response.data?.data;
        if (!Array.isArray(data)) throw new Error('The server returned an invalid NGO case list.');
        if (active) {
          setCases(data);
          setError('');
        }
      })
      .catch(requestError => { if (active) setError(getErrorMessage(requestError, 'Rehabilitation cases could not be loaded.')); })
      .finally(() => { if (active) setLoading(false); });
    api.get('/rehabilitation/centers')
      .then(response => {
        const data = response.data?.data;
        if (Array.isArray(data) && active) setCenters(data);
      })
      .catch(() => {
        if (active) setActionError('Rehabilitation centres could not be loaded. You can still update the case without selecting a centre.');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const requestedId = searchParams.get('caseId');
    if (!requestedId || loading) return undefined;
    const requestedCase = cases.find(item => String(item.id) === requestedId);
    const clearCaseQuery = () => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('caseId');
      setSearchParams(nextParams, { replace: true });
    };
    if (requestedCase) {
      fetchHistory(requestedCase)
        .then(data => {
          if (!active) return;
          setSelectedCase(requestedCase);
          setHistory(data);
          setHistoryError('');
          clearCaseQuery();
        })
        .catch(requestError => {
          if (!active) return;
          setSelectedCase(requestedCase);
          setHistory([]);
          setHistoryError(getErrorMessage(requestError, 'Rehabilitation history could not be loaded.'));
          clearCaseQuery();
        });
    } else {
      Promise.resolve().then(() => {
        if (active) {
          setNotice('That case is not available in your NGO workspace.');
          clearCaseQuery();
        }
      });
    }
    return () => { active = false; };
  }, [cases, fetchHistory, loading, searchParams, setSearchParams]);

  const visible = useMemo(() => cases.filter(item =>
    (!query || `${item.caseNumber} ${item.district || ''} ${item.state || ''}`.toLowerCase().includes(query.toLowerCase()))
    && (!statusFilter || item.status === statusFilter),
  ), [cases, query, statusFilter]);

  function applyCaseUpdate(updated) {
    setCases(current => updated.assignedNgoId == null
      ? current.filter(item => item.id !== updated.id)
      : current.map(item => item.id === updated.id ? { ...item, ...updated } : item));
    setSelectedCase(updated.assignedNgoId == null ? null : updated);
  }

  async function decide(action) {
    if (!selectedCase || busy) return;
    if (action === 'reject' && !rejectReason.trim()) return;
    const original = selectedCase;
    const optimistic = action === 'accept'
      ? { ...original, status: 'REHABILITATION_ACCEPTED', acceptedAt: new Date().toISOString() }
      : { ...original, status: 'INVESTIGATION_COMPLETED', assignedNgoId: null };
    setBusy(true);
    setActionError('');
    setNotice('');
    applyCaseUpdate(optimistic);
    try {
      const response = action === 'accept'
        ? await api.post(`/ngo/cases/${original.id}/accept`)
        : await api.post(`/ngo/cases/${original.id}/reject`, { reason: rejectReason.trim() });
      applyCaseUpdate(response.data?.data || optimistic);
      setRejectOpen(false);
      setRejectReason('');
      setNotice(action === 'accept' ? 'Referral accepted.' : 'Referral rejected and returned to the officer.');
      if (action === 'accept') await refreshHistory(original.id);
    } catch (requestError) {
      applyCaseUpdate(original);
      setActionError(getErrorMessage(requestError, 'The referral decision could not be saved.'));
    } finally {
      setBusy(false);
    }
  }

  function openStageForm() {
    if (!selectedCase) return;
    setStageNote('');
    setStageFields({ centerId: '', admissionDate: '', educationUpdate: '', healthUpdate: '', counsellingUpdate: '' });
    setActionError('');
    setStageOpen(true);
  }

  async function submitStage(event) {
    event.preventDefault();
    const stage = nextStages[selectedCase?.status]?.[0];
    if (!selectedCase || !stage || !stageNote.trim() || busy) return;
    const original = selectedCase;
    const optimistic = { ...original, status: stage };
    applyCaseUpdate(optimistic);
    setBusy(true);
    setActionError('');
    try {
      const payload = {
        status: stage,
        progressNote: stageNote.trim(),
        centerId: stageFields.centerId ? Number(stageFields.centerId) : null,
        admissionDate: stageFields.admissionDate || null,
        educationUpdate: stageFields.educationUpdate.trim() || null,
        healthUpdate: stageFields.healthUpdate.trim() || null,
        counsellingUpdate: stageFields.counsellingUpdate.trim() || null,
      };
      const response = await api.put(`/ngo/cases/${original.id}/stage`, payload);
      applyCaseUpdate(response.data?.data || optimistic);
      setStageOpen(false);
      setNotice(`${stageLabels[stage]} saved.`);
      await refreshHistory(original.id);
    } catch (requestError) {
      applyCaseUpdate(original);
      setActionError(getErrorMessage(requestError, 'The rehabilitation stage could not be saved.'));
    } finally {
      setBusy(false);
    }
  }

  async function refreshHistory(caseId) {
    try {
      const response = await api.get(`/ngo/cases/${caseId}/status-history`);
      setHistory(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (requestError) {
      setHistoryError(getErrorMessage(requestError, 'The case was updated, but history could not be refreshed.'));
    }
  }

  const activeCases = cases.filter(item => item.status !== 'CLOSED').length;
  const nextStage = selectedCase && nextStages[selectedCase.status];

  return (
    <div className="space-y-7 pb-8">
      <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-emerald-700"><HeartHandshake size={15} />Pathways to safety</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">My rehabilitation cases</h1>
          <p className="mt-2 text-sm text-slate-500">Review referrals and record each rehabilitation stage for your NGO.</p>
        </div>
        <Link to="/rehabilitation/centers" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800">Rehabilitation centres <ChevronRight size={16} /></Link>
      </header>

      {notice && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check size={17} />{notice}</p>}
      {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span className="flex items-center gap-2"><AlertCircle size={17} />{error}</span><button type="button" onClick={() => { setLoading(true); loadCases().catch(requestError => setError(getErrorMessage(requestError, 'Rehabilitation cases could not be loaded.'))).finally(() => setLoading(false)); }} className="font-bold underline">Retry</button></div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat icon={HeartHandshake} label="Assigned to this NGO" value={cases.length} />
        <Stat icon={Clock3} label="Active rehabilitation cases" value={activeCases} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search case number or district" className="w-full rounded-xl bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-100" />
        </div>
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-600 outline-none">
          <option value="">All statuses</option>
          {Object.entries(stageLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
          <option value="INVESTIGATION_COMPLETED">Returned to officer</option>
        </select>
      </div>

      {loading ? <p role="status" className="py-10 text-center text-sm text-slate-500">Loading your NGO’s rehabilitation cases…</p>
        : visible.length ? <div className="grid gap-4 xl:grid-cols-2">
          {visible.map(item => <button key={item.id} type="button" onClick={() => openCase(item)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CircleUserRound size={23} /></span>
                <div>
                  <p className="font-mono text-xs font-bold text-teal-800">{item.caseNumber}</p>
                  <p className="mt-1 text-xs text-slate-500">{[item.district, item.state].filter(Boolean).join(', ') || 'Location not listed'}</p>
                </div>
              </div>
              <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-800">{stageLabels[item.status] || item.status?.replaceAll('_', ' ')}</span>
            </div>
            {item.referralNote && <p className="mt-4 line-clamp-2 text-xs leading-5 text-slate-600">{item.referralNote}</p>}
            <span className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-bold text-teal-800">
              Open case history <ArrowRight size={15} />
            </span>
          </button>)}
        </div> : !error && <Empty text="No rehabilitation referrals are currently assigned to this NGO." />}

      {selectedCase && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setSelectedCase(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="ngo-case-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-5">
            <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Rehabilitation case</p><h2 id="ngo-case-title" className="mt-1 font-mono text-lg font-bold text-slate-900">{selectedCase.caseNumber}</h2></div>
            <button type="button" aria-label="Close case" onClick={() => !busy && setSelectedCase(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button>
          </header>
          <div className="space-y-5 p-6">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-900">{stageLabels[selectedCase.status] || selectedCase.status?.replaceAll('_', ' ')}</span>
                <span className="text-xs font-semibold text-slate-500">{selectedCase.urgencyLevel || 'Urgency not specified'}</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">{[selectedCase.district, selectedCase.state].filter(Boolean).join(', ') || 'Location not listed'}</p>
              {selectedCase.referralNote && <div className="mt-4 border-t border-slate-200 pt-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Referral note</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selectedCase.referralNote}</p></div>}
            </div>

            {actionError && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={17} className="mt-0.5 shrink-0" />{actionError}</p>}

            {selectedCase.status === 'REHABILITATION_REFERRED' && <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <h3 className="text-sm font-bold text-slate-900">New referral decision</h3>
              {!rejectOpen ? <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => decide('accept')} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy && <LoaderCircle size={15} className="animate-spin" />}Accept</button>
                <button type="button" onClick={() => { setRejectOpen(true); setActionError(''); }} disabled={busy} className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700">Reject</button>
              </div> : <div className="mt-3 space-y-3">
                <label className="block text-xs font-bold text-slate-700">Reason for rejection <span className="text-red-600">*</span>
                  <textarea value={rejectReason} onChange={event => setRejectReason(event.target.value)} rows={3} maxLength={2000} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal" />
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setRejectOpen(false); setRejectReason(''); }} disabled={busy} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Cancel</button>
                  <button type="button" onClick={() => decide('reject')} disabled={!rejectReason.trim() || busy} className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy && <LoaderCircle size={14} className="animate-spin" />}Confirm rejection</button>
                </div>
              </div>}
            </section>}

            {nextStage && <section className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
              <h3 className="text-sm font-bold text-slate-900">Next step</h3>
              {!stageOpen ? <button type="button" onClick={openStageForm} disabled={busy} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#0b4f4b] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{nextStage[1]}<ArrowRight size={15} /></button>
                : <form onSubmit={submitStage} className="mt-3 space-y-3">
                  <label className="block text-xs font-bold text-slate-700">Progress note <span className="text-red-600">*</span>
                    <textarea required value={stageNote} onChange={event => setStageNote(event.target.value)} rows={3} maxLength={4000} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal" />
                  </label>
                  {selectedCase.status === 'REHABILITATION_ACCEPTED' && <>
                    <label className="block text-xs font-bold text-slate-700">Centre (optional)
                      <select value={stageFields.centerId} onChange={event => setStageFields(current => ({ ...current, centerId: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">
                        <option value="">Select a centre</option>{centers.map(center => <option key={center.id} value={center.id}>{center.name}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs font-bold text-slate-700">Admission date (optional)
                      <input type="date" value={stageFields.admissionDate} onChange={event => setStageFields(current => ({ ...current, admissionDate: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal" />
                    </label>
                  </>}
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      ['educationUpdate', 'Education update'],
                      ['healthUpdate', 'Health update'],
                      ['counsellingUpdate', 'Counselling update'],
                    ].map(([key, label]) => <label key={key} className="block text-xs font-bold text-slate-700">{label}
                      <textarea value={stageFields[key]} onChange={event => setStageFields(current => ({ ...current, [key]: event.target.value }))} rows={2} maxLength={2000} className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-normal" />
                    </label>)}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setStageOpen(false)} disabled={busy} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Cancel</button>
                    <button type="submit" disabled={!stageNote.trim() || busy} className="inline-flex items-center gap-2 rounded-lg bg-[#0b4f4b] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy && <LoaderCircle size={14} className="animate-spin" />}Save progress</button>
                  </div>
                </form>}
            </section>}

            <section className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2"><Clock3 size={17} className="text-teal-800" /><h3 className="text-sm font-bold text-slate-900">Rehabilitation timeline</h3></div>
              {loadingHistory ? <p role="status" className="mt-3 text-xs text-slate-500">Loading status history…</p>
                : historyError ? <p role="alert" className="mt-3 text-xs text-red-700">{historyError}</p>
                  : history.length ? <ol className="mt-4 space-y-4">
                    {history.map(entry => <li key={entry.id} className="relative border-l border-slate-200 pl-4">
                      <span className="absolute -left-1 top-1 h-2 w-2 rounded-full bg-teal-700" />
                      <p className="text-xs font-bold text-slate-800">{stageLabels[entry.newStatus] || entry.newStatus?.replaceAll('_', ' ')}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{entry.actorName || entry.actorRole || 'Staff'} · {entry.createdAt ? new Date(entry.createdAt).toLocaleString('en-IN') : 'Time unavailable'}</p>
                      {entry.progressNote && <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{entry.progressNote}</p>}
                      {(entry.admissionDate || entry.centerId) && <p className="mt-1 text-[11px] text-slate-500">{entry.centerId ? `Centre #${entry.centerId}` : ''}{entry.admissionDate ? ` · Admitted ${new Date(entry.admissionDate).toLocaleDateString('en-IN')}` : ''}</p>}
                      {entry.educationUpdate && <p className="mt-1 text-xs text-slate-600"><b>Education:</b> {entry.educationUpdate}</p>}
                      {entry.healthUpdate && <p className="mt-1 text-xs text-slate-600"><b>Health:</b> {entry.healthUpdate}</p>}
                      {entry.counsellingUpdate && <p className="mt-1 text-xs text-slate-600"><b>Counselling:</b> {entry.counsellingUpdate}</p>}
                    </li>)}
                  </ol> : <p className="mt-3 text-xs text-slate-500">No rehabilitation-stage history is available.</p>}
            </section>

            {selectedCase.status === 'CLOSED' && <p className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"><ShieldCheck size={15} />Rehabilitation workflow complete</p>}
          </div>
        </section>
      </div>}

    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={18} /></div><p className="mt-4 text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-800">{value}</p></div>;
}

export function Empty({ text }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">{text}</div>;
}
