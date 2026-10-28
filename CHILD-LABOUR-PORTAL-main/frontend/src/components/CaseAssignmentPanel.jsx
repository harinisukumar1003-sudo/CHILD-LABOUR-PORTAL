import { AlertCircle, ArrowRight, Check, Clock3, LoaderCircle, MapPin, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../services/api';

const statusLabels = {
  REPORTED: 'Reported',
  UNDER_REVIEW: 'Under Review',
  ASSIGNED_TO_OFFICER: 'Assigned to Officer',
  INVESTIGATING: 'Investigating',
  INVESTIGATION_COMPLETED: 'Investigation Completed',
  REHABILITATION_REFERRED: 'Rehabilitation Referred',
  REHABILITATION_ACCEPTED: 'Rehabilitation Accepted',
  ADMITTED_TO_CENTRE: 'Admitted to Centre',
  IN_REHABILITATION: 'In Rehabilitation',
  REINTEGRATED: 'Reintegrated',
  NGO_ASSIGNED: 'NGO Assigned',
  REHABILITATION_IN_PROGRESS: 'Rehabilitation in Progress',
  REHABILITATION_COMPLETED: 'Rehabilitation Completed',
  CLOSED: 'Closed',
  INVALID_COMPLAINT: 'Invalid Complaint',
  REJECTED: 'Rejected',
};
const verificationItems = [
  ['identityDetailsVerified', 'Child identity and details verified'],
  ['locationVerified', 'Location / address verified'],
  ['reporterContacted', 'Reporter or guardian contacted'],
  ['caseDetailsMatch', 'Case details match the report'],
];
const nextOfficerStatus = {
  ASSIGNED_TO_OFFICER: 'INVESTIGATING',
};

function messageFrom(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

export default function CaseAssignmentPanel({
  caseItem, canAssign, isOfficer, user, onAssign, onClose, onOpenFullCase,
  onAdvanceStatus, onVerificationUpdated, onOpenInvestigation, onRefer, onMoveToUnderReview,
}) {
  const [officers, setOfficers] = useState([]);
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [loadingOfficers, setLoadingOfficers] = useState(canAssign);
  const [submitting, setSubmitting] = useState(false);
  const [movingToReview, setMovingToReview] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [manualVerification, setManualVerification] = useState(null);
  const [checklist, setChecklist] = useState(Object.fromEntries(verificationItems.map(([key]) => [key, false])));
  const [verificationNotes, setVerificationNotes] = useState('');
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [detailsError, setDetailsError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [savingVerification, setSavingVerification] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [resettingVerification, setResettingVerification] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [workflowError, setWorkflowError] = useState('');
  const [referralOpen, setReferralOpen] = useState(false);
  const [referralOptions, setReferralOptions] = useState([]);
  const [selectedNgoId, setSelectedNgoId] = useState('');
  const [referralNote, setReferralNote] = useState('');
  const [loadingReferralOptions, setLoadingReferralOptions] = useState(false);
  const [savingReferral, setSavingReferral] = useState(false);
  const [referralError, setReferralError] = useState('');

  useEffect(() => {
    if (!canAssign) return undefined;
    let active = true;
    api.get('/officers', { params: { caseId: caseItem.id } })
      .then(response => {
        const data = response.data?.data;
        if (!Array.isArray(data)) throw new Error('The server returned an invalid officer list.');
        if (active) {
          setOfficers(data);
          setSelectedOfficer(caseItem.assignedOfficerId ? String(caseItem.assignedOfficerId) : '');
        }
      })
      .catch(loadError => {
        if (active) setError(messageFrom(loadError, 'Could not load active officers.'));
      })
      .finally(() => {
        if (active) setLoadingOfficers(false);
      });
    return () => { active = false; };
  }, [canAssign, caseItem.id, caseItem.assignedOfficerId]);

  useEffect(() => {
    let active = true;
    setLoadingDetails(true);
    setDetailsError('');
    setHistoryError('');
    Promise.allSettled([
      api.get(`/cases/${caseItem.id}/manual-verification`),
      api.get(`/cases/${caseItem.id}/status-history`),
    ]).then(([verificationResult, historyResult]) => {
      if (!active) return;
      if (verificationResult.status === 'fulfilled') {
        const details = verificationResult.value.data?.data;
        setManualVerification(details);
        setChecklist(Object.fromEntries(verificationItems.map(([key]) => [key, details?.checklist?.[key] === true])));
        setVerificationNotes(details?.notes || '');
      } else {
        setDetailsError(messageFrom(verificationResult.reason, 'Manual Verification details could not be loaded.'));
      }
      if (historyResult.status === 'fulfilled') {
        const entries = historyResult.value.data?.data;
        if (Array.isArray(entries)) setHistory(entries);
        else setHistoryError('The server returned an invalid status history.');
      } else {
        setHistoryError(messageFrom(historyResult.reason, 'Case status history could not be loaded.'));
      }
      setLoadingDetails(false);
    });
    return () => { active = false; };
  }, [caseItem.id]);

  useEffect(() => {
    if ((!isOfficer && !canAssign) || caseItem.status !== 'INVESTIGATION_COMPLETED') return undefined;
    let active = true;
    setLoadingReferralOptions(true);
    api.get('/ngo/referral-options')
      .then(response => {
        const data = response.data?.data;
        if (!Array.isArray(data)) throw new Error('The server returned an invalid referral destination list.');
        if (active) setReferralOptions(data);
      })
      .catch(loadError => { if (active) setReferralError(messageFrom(loadError, 'Could not load active rehabilitation destinations.')); })
      .finally(() => { if (active) setLoadingReferralOptions(false); });
    return () => { active = false; };
  }, [canAssign, caseItem.status, isOfficer]);

  const currentOfficer = officers.find(officer => String(officer.id) === String(caseItem.assignedOfficerId));
  const selected = officers.find(officer => String(officer.id) === selectedOfficer);
  const selectedNgo = referralOptions.find(ngo => String(ngo.id) === selectedNgoId);
  const alreadyAssigned = Boolean(caseItem.assignedOfficerId);
  const assignmentAllowed = ['UNDER_REVIEW', 'ASSIGNED_TO_OFFICER'].includes(caseItem.status);
  const checklistComplete = verificationItems.every(([key]) => checklist[key] === true);
  const isVerified = Boolean(manualVerification?.manualVerificationDone || caseItem.manualVerificationDone);

  const submitAssignment = async () => {
    if (!selected || !assignmentAllowed || submitting || String(selected.id) === String(caseItem.assignedOfficerId || '')) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await onAssign(selected);
      setSuccess(`${selected.name} is now assigned to this case.`);
    } catch (assignmentError) {
      setError(messageFrom(assignmentError, 'The assignment could not be saved. The case was restored.'));
    } finally {
      setSubmitting(false);
    }
  };

  const moveToUnderReview = async () => {
    if (movingToReview) return;
    setMovingToReview(true);
    setError('');
    try {
      await onMoveToUnderReview();
    } catch (reviewError) {
      setError(messageFrom(reviewError, 'The case could not be moved to Under Review.'));
    } finally {
      setMovingToReview(false);
    }
  };

  const submitManualVerification = async () => {
    if (!checklistComplete || !verificationNotes.trim() || savingVerification) return;
    const previous = manualVerification;
    const optimistic = {
      manualVerificationDone: true,
      verifiedBy: user?.id,
      verifiedByName: user?.name,
      verifiedAt: new Date().toISOString(),
      checklist,
      notes: verificationNotes.trim(),
    };
    setManualVerification(optimistic);
    setSavingVerification(true);
    setDetailsError('');
    setSuccess('');
    onVerificationUpdated?.(caseItem.id, optimistic);
    try {
      const response = await api.put(`/cases/${caseItem.id}/manual-verification`, {
        checklist,
        notes: verificationNotes.trim(),
      });
      const saved = response.data?.data;
      setManualVerification(saved);
      setSuccess('Manual Verification has been recorded.');
      try {
        const historyResponse = await api.get(`/cases/${caseItem.id}/status-history`);
        setHistory(Array.isArray(historyResponse.data?.data) ? historyResponse.data.data : []);
      } catch (historyLoadError) {
        setHistoryError(messageFrom(historyLoadError, 'Verification was saved, but status history could not be refreshed.'));
      }
    } catch (verificationError) {
      setManualVerification(previous);
      onVerificationUpdated?.(caseItem.id, previous || { manualVerificationDone: false });
      setDetailsError(messageFrom(verificationError, 'Manual Verification could not be saved.'));
    } finally {
      setSavingVerification(false);
    }
  };

  const resetManualVerification = async () => {
    if (!resetReason.trim() || resettingVerification) return;
    const previous = manualVerification;
    setManualVerification({ ...manualVerification, manualVerificationDone: false });
    onVerificationUpdated?.(caseItem.id, { manualVerificationDone: false });
    setResettingVerification(true);
    setDetailsError('');
    try {
      const response = await api.delete(`/cases/${caseItem.id}/manual-verification`, { data: { reason: resetReason.trim() } });
      setManualVerification(response.data?.data);
      setChecklist(Object.fromEntries(verificationItems.map(([key]) => [key, false])));
      setVerificationNotes('');
      setResetReason('');
      setSuccess('Manual Verification was reset.');
      try {
        const historyResponse = await api.get(`/cases/${caseItem.id}/status-history`);
        setHistory(Array.isArray(historyResponse.data?.data) ? historyResponse.data.data : []);
      } catch (historyLoadError) {
        setHistoryError(messageFrom(historyLoadError, 'Verification was reset, but status history could not be refreshed.'));
      }
    } catch (resetError) {
      setManualVerification(previous);
      onVerificationUpdated?.(caseItem.id, previous || { manualVerificationDone: false });
      setDetailsError(messageFrom(resetError, 'Manual Verification could not be reset.'));
    } finally {
      setResettingVerification(false);
    }
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus || !statusRemarks.trim() || savingStatus) return;
    setSavingStatus(true);
    setWorkflowError('');
    try {
      await onAdvanceStatus(caseItem, pendingStatus, statusRemarks.trim());
      setSuccess(`${statusLabels[pendingStatus]} saved.`);
      setPendingStatus('');
      setStatusRemarks('');
      try {
        const historyResponse = await api.get(`/cases/${caseItem.id}/status-history`);
        setHistory(Array.isArray(historyResponse.data?.data) ? historyResponse.data.data : []);
      } catch (historyLoadError) {
        setHistoryError(messageFrom(historyLoadError, 'Status was saved, but history could not be refreshed.'));
      }
    } catch (statusError) {
      setWorkflowError(messageFrom(statusError, 'The status could not be updated.'));
    } finally {
      setSavingStatus(false);
    }
  };

  const submitReferral = async () => {
    if (!selectedNgo || Number(selectedNgo.availableBeds) <= 0 || !referralNote.trim() || savingReferral) return;
    setSavingReferral(true);
    setReferralError('');
    try {
      await onRefer(caseItem, selectedNgo, referralNote.trim());
      setSuccess(`Referred to ${selectedNgo.name}.`);
      setReferralOpen(false);
      setReferralNote('');
    } catch (requestError) {
      setReferralError(messageFrom(requestError, 'The rehabilitation referral could not be saved.'));
    } finally {
      setSavingReferral(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-assignment-title"
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Case details</p>
            <h2 id="case-assignment-title" className="mt-1 font-mono text-lg font-bold text-slate-900">{caseItem.caseNumber}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close case details" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 space-y-6 p-6">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-900">{statusLabels[caseItem.status] || caseItem.status}</span>
              <span className="text-xs font-semibold text-slate-500">{caseItem.urgencyLevel?.replaceAll('_', ' ') || 'Urgency not set'}</span>
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">{caseItem.childName || 'Child details protected'}</h3>
            <p className="mt-2 flex items-start gap-2 text-sm text-slate-600"><MapPin size={16} className="mt-0.5 shrink-0" />{[caseItem.district, caseItem.state, caseItem.locationAddress].filter(Boolean).join(', ') || 'Location not provided'}</p>
            {caseItem.approxAge != null && <p className="mt-3 text-sm text-slate-600">Approximate age: {caseItem.approxAge}</p>}
            <div className="mt-4 border-t border-slate-200 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Incident description</h4>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{caseItem.incidentDescription || 'No description available.'}</p>
            </div>
            {isVerified && <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <ShieldCheck size={14} />Verified by {manualVerification?.verifiedByName || caseItem.manualVerifiedByName || 'officer'}
              {manualVerification?.verifiedAt || caseItem.manualVerifiedAt
                ? ` on ${new Date(manualVerification?.verifiedAt || caseItem.manualVerifiedAt).toLocaleDateString('en-IN')}`
                : ''}
            </p>}
          </section>

          {isOfficer && caseItem.assignedOfficerId && (
            <section aria-labelledby="manual-verification-heading" className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-800"><ShieldCheck size={18} /></span>
                <div>
                  <h3 id="manual-verification-heading" className="text-sm font-bold text-slate-900">Manual Verification</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Confirm these details before starting the investigation.</p>
                </div>
              </div>
              {loadingDetails ? <p role="status" className="mt-4 text-sm text-slate-500">Loading verification details…</p>
                : isVerified ? (
                  <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                    <p className="font-bold">Manual Verification complete</p>
                    <p className="mt-1 text-xs">Verified by {manualVerification?.verifiedByName || 'officer'} on {manualVerification?.verifiedAt ? new Date(manualVerification.verifiedAt).toLocaleString('en-IN') : 'date unavailable'}.</p>
                    {manualVerification?.notes && <p className="mt-3 whitespace-pre-wrap border-t border-emerald-100 pt-3 text-xs leading-5">{manualVerification.notes}</p>}
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {verificationItems.map(([key, label]) => (
                      <label key={key} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <input type="checkbox" checked={checklist[key]} onChange={event => setChecklist(current => ({ ...current, [key]: event.target.checked }))} className="mt-0.5 h-4 w-4 accent-teal-700" />
                        {label}
                      </label>
                    ))}
                    <label className="block text-xs font-bold text-slate-700">Verification notes <span className="text-red-600">*</span>
                      <textarea value={verificationNotes} onChange={event => setVerificationNotes(event.target.value)} rows={4} maxLength={4000} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-teal-600" placeholder="Record how you verified these details." />
                    </label>
                    <button type="button" onClick={submitManualVerification} disabled={!checklistComplete || !verificationNotes.trim() || savingVerification || caseItem.status !== 'ASSIGNED_TO_OFFICER'} className="inline-flex items-center gap-2 rounded-xl bg-[#0b4f4b] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
                      {savingVerification && <LoaderCircle size={16} className="animate-spin" />}Mark Manual Verification Done
                    </button>
                    {caseItem.status !== 'ASSIGNED_TO_OFFICER' && <p className="text-xs text-slate-500">Manual Verification must be completed before the investigation starts.</p>}
                  </div>
                )}
              {canAssign && isVerified && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <label className="block text-xs font-bold text-slate-700">Admin reset reason
                    <textarea value={resetReason} onChange={event => setResetReason(event.target.value)} rows={2} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 p-2.5 text-sm font-normal" placeholder="Required to reset verification." />
                  </label>
                  <button type="button" onClick={resetManualVerification} disabled={!resetReason.trim() || resettingVerification} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-40">
                    {resettingVerification && <LoaderCircle size={14} className="animate-spin" />}<RotateCcw size={14} />Reset verification
                  </button>
                </div>
              )}
              </section>
          )}

          {((isOfficer && caseItem.assignedOfficerId)
            || (canAssign && caseItem.status === 'INVESTIGATION_COMPLETED')) && (
            <section className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4">
              <h3 className="text-sm font-bold text-slate-900">Next step</h3>
              {caseItem.status === 'ASSIGNED_TO_OFFICER' && !isVerified
                ? <p className="mt-2 text-xs leading-5 text-slate-600">Complete Manual Verification above to unlock the investigation.</p>
                : caseItem.status === 'INVESTIGATING'
                  ? <button type="button" onClick={() => onOpenInvestigation(caseItem.id)} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#0b4f4b] px-4 py-2.5 text-sm font-bold text-white">Mark Investigation Completed <ArrowRight size={16} /></button>
                  : caseItem.status === 'INVESTIGATION_COMPLETED'
                    ? <button type="button" onClick={() => { setReferralOpen(true); setReferralError(''); }} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#0b4f4b] px-4 py-2.5 text-sm font-bold text-white">Refer to Rehabilitation <ArrowRight size={16} /></button>
                  : nextOfficerStatus[caseItem.status] && isVerified && (
                    pendingStatus ? (
                      <div className="mt-3 space-y-3">
                        <label className="block text-xs font-bold text-slate-700">Case note <span className="text-red-600">*</span>
                          <textarea value={statusRemarks} onChange={event => setStatusRemarks(event.target.value)} rows={3} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal" />
                        </label>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setPendingStatus('')} disabled={savingStatus} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Cancel</button>
                          <button type="button" onClick={confirmStatusChange} disabled={!statusRemarks.trim() || savingStatus} className="inline-flex items-center gap-2 rounded-lg bg-[#0b4f4b] px-3 py-2 text-xs font-bold text-white disabled:opacity-40">
                            {savingStatus && <LoaderCircle size={14} className="animate-spin" />}Confirm {statusLabels[pendingStatus]}
                          </button>
                        </div>
                      </div>
                    ) : <button type="button" onClick={() => { setPendingStatus(nextOfficerStatus[caseItem.status]); setWorkflowError(''); }} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#0b4f4b] px-4 py-2.5 text-sm font-bold text-white">
                      Start Investigation<ArrowRight size={16} />
                    </button>
                  )}
              {workflowError && <p role="alert" className="mt-3 flex items-start gap-2 text-xs text-red-700"><AlertCircle size={15} className="mt-0.5 shrink-0" />{workflowError}</p>}
            </section>
          )}

          <section aria-labelledby="case-timeline-heading" className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2"><Clock3 size={17} className="text-teal-800" /><h3 id="case-timeline-heading" className="text-sm font-bold text-slate-900">Status history</h3></div>
            {historyError && <p role="alert" className="mt-3 text-xs text-red-700">{historyError}</p>}
            {history.length ? <ol className="mt-4 space-y-4">
              {history.map(entry => <li key={entry.id} className="relative border-l border-slate-200 pl-4">
                <span className="absolute -left-1 top-1 h-2 w-2 rounded-full bg-teal-700" />
                <p className="text-xs font-bold text-slate-800">{statusLabels[entry.newStatus] || entry.newStatus?.replaceAll('_', ' ')}</p>
                <p className="mt-1 text-[11px] text-slate-500">{entry.actorName || entry.actorRole || 'System'} · {entry.createdAt ? new Date(entry.createdAt).toLocaleString('en-IN') : 'Time unavailable'}</p>
                {entry.details && <p className="mt-1 text-xs leading-5 text-slate-600">{entry.details}</p>}
                {entry.progressNote && <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{entry.progressNote}</p>}
              </li>)}
            </ol> : !historyError && !loadingDetails && <p className="mt-3 text-xs text-slate-500">No status history is available.</p>}
          </section>

          <section aria-labelledby="assign-officer-heading">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="assign-officer-heading" className="text-sm font-bold text-slate-900">Assign Officer</h3>
                {currentOfficer ? (
                  <p className="mt-1 text-xs text-slate-500">Currently assigned to <span className="font-bold text-slate-700">{currentOfficer.name}</span></p>
                ) : alreadyAssigned ? (
                  <p className="mt-1 text-xs text-slate-500">Currently assigned to <span className="font-bold text-slate-700">{caseItem.assignedOfficerName || `Officer #${caseItem.assignedOfficerId}`}</span></p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">This case has not been assigned yet.</p>
                )}
              </div>
              {alreadyAssigned && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">Reassignment available</span>}
            </div>

            {canAssign ? (
              loadingOfficers ? (
                <p className="mt-4 flex items-center gap-2 text-sm text-slate-500" role="status"><LoaderCircle size={16} className="animate-spin" />Loading active officers…</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {!assignmentAllowed && caseItem.status === 'REPORTED' && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs leading-5 text-amber-900">Move this report to Under Review before assigning an officer.</p>
                      <button type="button" onClick={moveToUnderReview} disabled={movingToReview} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#0b4f4b] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                        {movingToReview && <LoaderCircle size={14} className="animate-spin" />}Move to Under Review<ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                  {!assignmentAllowed && caseItem.status !== 'REPORTED' && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Officer assignment is available only in the Under Review stage.</p>}
                  {officers.map(officer => (
                    <label key={officer.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${selectedOfficer === String(officer.id) ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-teal-300'}`}>
                      <input
                        type="radio"
                        name="assignedOfficer"
                        value={officer.id}
                        checked={selectedOfficer === String(officer.id)}
                        onChange={() => { setSelectedOfficer(String(officer.id)); setError(''); setSuccess(''); }}
                        className="h-4 w-4 accent-teal-700"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-800">{officer.name}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{officer.district || officer.state || 'District not listed'}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-bold text-slate-700">{officer.activeCaseCount ?? 0}</span>
                        <span className="block text-[10px] text-slate-500">open cases</span>
                      </span>
                    </label>
                  ))}
                  {!officers.length && <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No active officers are available for assignment.</p>}
                </div>
              )
            ) : (
              <p className="mt-3 text-sm text-slate-600">{currentOfficer?.name || caseItem.assignedOfficerName || 'No officer assigned'}</p>
            )}
          </section>

          {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</p>}
          {detailsError && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={17} className="mt-0.5 shrink-0" />{detailsError}</p>}
          {success && <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><Check size={17} className="mt-0.5 shrink-0" />{success}</p>}
        </div>

        <footer className="sticky bottom-0 flex flex-wrap justify-between gap-2 border-t border-slate-100 bg-white p-5">
          <button type="button" onClick={() => onOpenFullCase(caseItem.id)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Open full case</button>
          {canAssign && (
            <button
              type="button"
              onClick={submitAssignment}
              disabled={!selected || !assignmentAllowed || loadingOfficers || submitting || String(selected?.id) === String(caseItem.assignedOfficerId || '')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0b4f4b] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting && <LoaderCircle size={16} className="animate-spin" />}
              {alreadyAssigned ? 'Reassign' : 'Assign'}
            </button>
          )}
        </footer>
      </aside>
      {referralOpen && <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/60 p-4">
        <section role="dialog" aria-modal="true" aria-labelledby="referral-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">Rehabilitation referral</p><h2 id="referral-title" className="mt-1 text-xl font-bold text-slate-900">Choose an active NGO</h2></div>
            <button type="button" onClick={() => setReferralOpen(false)} aria-label="Close referral dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button>
          </div>
          {loadingReferralOptions ? <p role="status" className="mt-5 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle size={16} className="animate-spin" />Loading active NGOs…</p>
            : <div className="mt-5 space-y-2">
              {referralOptions.map(ngo => {
                const hasBeds = Number(ngo.availableBeds) > 0;
                return <label key={ngo.id} className={`flex items-center gap-3 rounded-xl border p-3 ${hasBeds ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${selectedNgoId === String(ngo.id) ? 'border-teal-500 bg-teal-50' : 'border-slate-200'}`}>
                  <input type="radio" name="referralNgo" disabled={!hasBeds} checked={selectedNgoId === String(ngo.id)} onChange={() => setSelectedNgoId(String(ngo.id))} className="h-4 w-4 accent-teal-700" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-800">{ngo.name}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{ngo.district || 'District not listed'}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-slate-600">
                    <span className="block font-bold">{ngo.availableBeds} available / {ngo.capacity} beds</span>
                    <span className="block text-[10px] text-slate-500">capacity</span>
                  </span>
                </label>;
              })}
              {!referralOptions.length && !referralError && <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No active NGOs are configured.</p>}
            </div>}
          <label className="mt-5 block text-sm font-bold text-slate-700">Referral note <span className="text-red-600">*</span>
            <textarea value={referralNote} onChange={event => setReferralNote(event.target.value)} rows={4} maxLength={4000} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-teal-600" placeholder="Add the referral context needed by the rehabilitation team." />
          </label>
          {referralError && <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700"><AlertCircle size={15} className="mt-0.5 shrink-0" />{referralError}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setReferralOpen(false)} disabled={savingReferral} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button>
            <button type="button" onClick={submitReferral} disabled={!selectedNgo || Number(selectedNgo.availableBeds) <= 0 || !referralNote.trim() || loadingReferralOptions || savingReferral} className="inline-flex items-center gap-2 rounded-xl bg-[#0b4f4b] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">
              {savingReferral && <LoaderCircle size={16} className="animate-spin" />}Refer case
            </button>
          </div>
        </section>
      </div>}
    </div>
  );
}
