import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { CalendarDays, Check, ChevronDown, Download, Filter, GripVertical, MapPin, MoreHorizontal, Plus, Search, ShieldCheck, SlidersHorizontal, UserRound, Users, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import CaseAssignmentPanel from '../components/CaseAssignmentPanel';

const columns = [
  ['REPORTED', 'Reported', 'border-sky-200 bg-sky-50/60'],
  ['UNDER_REVIEW', 'Under Review', 'border-amber-200 bg-amber-50/60'],
  ['ASSIGNED_TO_OFFICER', 'Assigned to Officer', 'border-violet-200 bg-violet-50/60'],
  ['INVESTIGATING', 'Investigating', 'border-teal-200 bg-teal-50/60'],
  ['INVESTIGATION_COMPLETED', 'Investigation Completed', 'border-indigo-200 bg-indigo-50/60'],
  ['REHABILITATION_REFERRED', 'Rehabilitation Referred', 'border-cyan-200 bg-cyan-50/60'],
  ['REHABILITATION_ACCEPTED', 'Rehabilitation Accepted', 'border-sky-200 bg-sky-50/60'],
  ['ADMITTED_TO_CENTRE', 'Admitted to Centre', 'border-blue-200 bg-blue-50/60'],
  ['IN_REHABILITATION', 'In Rehabilitation', 'border-emerald-200 bg-emerald-50/60'],
  ['REINTEGRATED', 'Reintegrated', 'border-green-200 bg-green-50/60'],
  ['NGO_ASSIGNED', 'NGO Assigned', 'border-blue-200 bg-blue-50/60'],
  ['REHABILITATION_IN_PROGRESS', 'Rehabilitation in Progress', 'border-emerald-200 bg-emerald-50/60'],
  ['REHABILITATION_COMPLETED', 'Rehabilitation Completed', 'border-green-200 bg-green-50/60'],
  ['CLOSED', 'Closed', 'border-slate-200 bg-slate-50/80'],
  ['INVALID_COMPLAINT', 'Invalid Complaint', 'border-orange-200 bg-orange-50/60'],
  ['REJECTED', 'Rejected', 'border-rose-200 bg-rose-50/60'],
];
const urgency = {
  CRITICAL: ['Critical', 'bg-red-50 text-red-700', 'bg-red-500'],
  HIGH: ['High', 'bg-amber-50 text-amber-700', 'bg-amber-500'],
  MEDIUM: ['Medium', 'bg-sky-50 text-sky-700', 'bg-sky-500'],
  LOW: ['Low', 'bg-slate-100 text-slate-600', 'bg-slate-400'],
};
const terminalStatuses = new Set(['CLOSED', 'REJECTED', 'INVALID_COMPLAINT']);
const officerStatusTargets = {
  ASSIGNED_TO_OFFICER: new Set(['INVESTIGATING']),
  INVESTIGATING: new Set(['INVESTIGATION_COMPLETED']),
};

function errorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

function UrgencyBadge({ level }) {
  const [label, color, dot] = urgency[level] || urgency.MEDIUM;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot} ${level === 'CRITICAL' ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  );
}

function DraggableCard({ item, selected, assignedOfficerName, isOfficer, onSelect, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(item.id),
    data: { item },
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <article
      ref={setNodeRef}
      style={style}
      onClick={() => onOpen(item)}
      className={`group relative cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md ${isDragging ? 'z-10 opacity-40' : ''}`}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          aria-label={`Select ${item.caseNumber}`}
          checked={selected}
          onClick={event => event.stopPropagation()}
          onChange={() => onSelect(item.id)}
          className="mt-1 h-4 w-4 rounded border-slate-300 accent-teal-700"
        />
        <button
          {...listeners}
          {...attributes}
          type="button"
          aria-label="Drag case"
          onClick={event => event.stopPropagation()}
          className="mt-0.5 cursor-grab text-slate-300 hover:text-slate-500"
        >
          <GripVertical size={16} />
        </button>
        <button type="button" onClick={event => { event.stopPropagation(); onOpen(item); }} className="min-w-0 flex-1 text-left">
          <div className="flex items-start justify-between gap-2">
            <p className="font-mono text-[11px] font-bold text-teal-800">{item.caseNumber}</p>
          </div>
          <h3 className="mt-2 truncate text-sm font-bold text-slate-800">{item.childName || 'Child details protected'}</h3>
          <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
            <MapPin size={12} />{item.district || item.locationAddress || 'Location not listed'}
          </p>
        </button>
        <button
          type="button"
          aria-label={`More options for ${item.caseNumber}`}
          onClick={event => event.stopPropagation()}
          className="rounded-md p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <UrgencyBadge level={item.urgencyLevel} />
        <span className="text-[10px] font-medium text-slate-400">{new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-teal-100 font-bold text-teal-800">
          {assignedOfficerName ? assignedOfficerName.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase() : <UserRound size={12} />}
        </span>
        <span className="truncate">{assignedOfficerName || 'Unassigned'}</span>
      </div>
      {item.manualVerificationDone && <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
        <ShieldCheck size={12} />Verified by {item.manualVerifiedByName || 'officer'}
        {item.manualVerifiedAt ? ` · ${new Date(item.manualVerifiedAt).toLocaleDateString('en-IN')}` : ''}
      </p>}
      {isOfficer && item.status === 'ASSIGNED_TO_OFFICER' && !item.manualVerificationDone && <p className="mt-2 text-[10px] font-semibold text-amber-700">Manual verification required</p>}
    </article>
  );
}

function DropColumn({ column, items, selected, officerNameFor, isOfficer, onSelect, onOpen }) {
  const [status, label, color] = column;
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section ref={setNodeRef} className={`flex min-h-[470px] min-w-[250px] flex-1 flex-col rounded-2xl border p-2.5 ${color} ${isOver ? 'ring-2 ring-teal-400 ring-offset-2' : ''}`}>
      <header className="flex items-center justify-between px-2 pb-3 pt-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-teal-700/60" />
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-700">{label}</h2>
          <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{items.length}</span>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-2.5">
        {items.map(item => (
          <DraggableCard
            key={item.id}
            item={item}
            selected={selected.includes(item.id)}
            assignedOfficerName={officerNameFor(item)}
            isOfficer={isOfficer}
            onSelect={onSelect}
            onOpen={onOpen}
          />
        ))}
        {!items.length && <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-slate-300/70 text-center text-xs text-slate-400"><span>No cases in this stage</span></div>}
      </div>
    </section>
  );
}

export default function CaseManagement() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role, user } = useAuth();
  const isOfficer = role === 'OFFICER';
  const canAssign = role === 'ADMIN';
  const [cases, setCases] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [officersError, setOfficersError] = useState('');
  const urlKeyword = searchParams.get('keyword') || '';
  const [queryState, setQueryState] = useState({ urlKeyword, value: urlKeyword });
  const query = queryState.urlKeyword === urlKeyword ? queryState.value : urlKeyword;
  const setQuery = value => setQueryState({ urlKeyword, value });
  const [filters, setFilters] = useState({ urgency: '', district: '', status: '' });
  const [drag, setDrag] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [notice, setNotice] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [focusedCaseId, setFocusedCaseId] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkOfficer, setBulkOfficer] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const loadCases = useCallback(async () => {
    const response = await api.get(isOfficer ? '/my-cases' : '/cases/search');
    const data = response.data?.data;
    if (!Array.isArray(data)) throw new Error('The backend returned an invalid case list.');
    return data;
  }, [isOfficer]);

  const loadOfficers = useCallback(async () => {
    const response = await api.get('/officers');
    const data = response.data?.data;
    if (!Array.isArray(data)) throw new Error('The backend returned an invalid officer list.');
    return data;
  }, []);

  useEffect(() => {
    let active = true;
    loadCases()
      .then(data => {
        if (active) {
          setCases(data);
          setLoadError('');
        }
      })
      .catch(error => { if (active) setLoadError(errorMessage(error, 'Could not load cases from the backend.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadCases]);

  useEffect(() => {
    if (!canAssign) return undefined;
    let active = true;
    loadOfficers()
      .then(data => {
        if (active) {
          setOfficers(data);
          setOfficersError('');
        }
      })
      .catch(error => { if (active) setOfficersError(errorMessage(error, 'Could not load active officers.')); });
    return () => { active = false; };
  }, [canAssign, loadOfficers]);

  const filtered = useMemo(() => cases.filter(item =>
    (!query || `${item.caseNumber} ${item.childName} ${item.locationAddress} ${item.district}`.toLowerCase().includes(query.toLowerCase()))
    && (!filters.urgency || item.urgencyLevel === filters.urgency)
    && (!filters.district || item.district === filters.district)
    && (!filters.status || item.status === filters.status),
  ), [cases, filters, query]);
  const districts = [...new Set(cases.map(item => item.district).filter(Boolean))];
  const focusedCase = cases.find(item => item.id === focusedCaseId) || null;

  const showNotice = (message, isError = false) => {
    setNotice({ message, isError });
    window.setTimeout(() => setNotice(null), 3500);
  };

  useEffect(() => {
    const requestedCaseId = searchParams.get('caseId');
    if (!requestedCaseId || loading) return;
    const requestedCase = cases.find(item => String(item.id) === requestedCaseId);
    if (requestedCase) setFocusedCaseId(requestedCase.id);
    else showNotice('That case is not available in your assigned case list.', true);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('caseId');
    setSearchParams(nextParams, { replace: true });
  }, [cases, loading, searchParams, setSearchParams]);

  const onDragEnd = ({ active, over }) => {
    setDrag(null);
    const item = active.data.current?.item;
    if (!over || !item || item.status === over.id) return;
    if (isOfficer && !officerStatusTargets[item.status]?.has(over.id)) {
      showNotice('Cases can only move to the next workflow stage. Use the case panel for required steps.', true);
      return;
    }
    if (isOfficer && item.status === 'ASSIGNED_TO_OFFICER' && over.id === 'INVESTIGATING' && !item.manualVerificationDone) {
      showNotice('Complete Manual Verification before starting the investigation.', true);
      return;
    }
    if (over.id === 'ASSIGNED_TO_OFFICER') {
      showNotice('Assign an officer from the case details panel.', true);
      return;
    }
    setDrag({ item, next: over.id });
    setRemarks('');
  };

  const confirmMove = async () => {
    if (!remarks.trim() || !drag?.item || updatingStatus) return;
    const { item, next } = drag;
    const previousStatus = item.status;
    setUpdatingStatus(true);
    setCases(current => current.map(caseItem => caseItem.id === item.id ? { ...caseItem, status: next } : caseItem));
    try {
      await api.put(`/cases/${item.id}/status`, { status: next, remarks });
      showNotice(`${item.caseNumber} moved to ${columns.find(column => column[0] === next)?.[1]}`);
    } catch (error) {
      setCases(current => current.map(caseItem => caseItem.id === item.id ? { ...caseItem, status: previousStatus } : caseItem));
      showNotice(errorMessage(error, 'Could not update the case status. The previous status was restored.'), true);
    } finally {
      setUpdatingStatus(false);
      setDrag(null);
    }
  };

  const assignCase = async (item, officer) => {
    if (!['UNDER_REVIEW', 'ASSIGNED_TO_OFFICER'].includes(item.status)) {
      throw new Error('Move the case to Under Review before assigning an officer.');
    }
    const previousItem = item;
    const previousOfficers = officers;
    const now = new Date().toISOString();
    const nextStatus = item.status === 'UNDER_REVIEW' ? 'ASSIGNED_TO_OFFICER' : item.status;
    const updatedItem = {
      ...item,
      assignedOfficerId: officer.id,
      assignedOfficerName: officer.name,
      assignedAt: now,
      status: nextStatus,
    };
    setCases(current => current.map(caseItem => caseItem.id === item.id ? updatedItem : caseItem));
    setOfficers(current => current.map(value => {
      if (terminalStatuses.has(item.status) || String(item.assignedOfficerId || '') === String(officer.id)) return value;
      if (String(value.id) === String(item.assignedOfficerId || '')) return { ...value, activeCaseCount: Math.max(0, value.activeCaseCount - 1) };
      if (String(value.id) === String(officer.id)) return { ...value, activeCaseCount: value.activeCaseCount + 1 };
      return value;
    }));
    try {
      const response = await api.put(`/cases/${item.id}/assign`, { officerId: officer.id });
      const assignedAt = response.data?.data?.assignedAt || now;
      setCases(current => current.map(caseItem => caseItem.id === item.id ? { ...caseItem, assignedAt } : caseItem));
    } catch (error) {
      setCases(current => current.map(caseItem => caseItem.id === item.id ? previousItem : caseItem));
      setOfficers(previousOfficers);
      throw error;
    }
  };

  const moveToUnderReview = async item => {
    const previousStatus = item.status;
    setCases(current => current.map(caseItem => caseItem.id === item.id
      ? { ...caseItem, status: 'UNDER_REVIEW' }
      : caseItem));
    try {
      await api.put(`/cases/${item.id}/status`, {
        status: 'UNDER_REVIEW',
        remarks: 'Moved to Under Review by an administrator.',
      });
      showNotice(`${item.caseNumber} moved to Under Review.`);
    } catch (error) {
      setCases(current => current.map(caseItem => caseItem.id === item.id
        ? { ...caseItem, status: previousStatus }
        : caseItem));
      showNotice(errorMessage(error, 'Could not move the case to Under Review. The previous status was restored.'), true);
      throw error;
    }
  };

  const toggleSelected = id => setSelected(value => value.includes(id) ? value.filter(item => item !== id) : [...value, id]);

  const exportCases = () => {
    const rows = cases.filter(item => selected.includes(item.id));
    const csv = ['Case,Child,District,Urgency,Status', ...rows.map(item =>
      [item.caseNumber, item.childName, item.district, item.urgencyLevel, item.status].map(value => `"${String(value || '').replaceAll('"', '""')}"`).join(','),
    )].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'clrms-case-export.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const applyBulkAssign = async () => {
    if (!bulkOfficer || bulkSubmitting) return;
    const officer = officers.find(item => String(item.id) === String(bulkOfficer));
    if (!officer) return;
    const caseItems = cases.filter(item => selected.includes(item.id));
    if (caseItems.some(item => !['UNDER_REVIEW', 'ASSIGNED_TO_OFFICER'].includes(item.status))) {
      showNotice('Only cases in Under Review or already assigned can be assigned in bulk.', true);
      return;
    }
    const previousCases = cases;
    const previousOfficers = officers;
    setBulkSubmitting(true);
    setCases(current => current.map(item => selected.includes(item.id) ? {
      ...item,
      assignedOfficerId: officer.id,
      assignedOfficerName: officer.name,
      assignedAt: new Date().toISOString(),
      status: item.status === 'UNDER_REVIEW' ? 'ASSIGNED_TO_OFFICER' : item.status,
    } : item));
    setOfficers(current => current.map(value => {
      const assignedToTarget = caseItems.filter(item => !terminalStatuses.has(item.status)
        && String(item.assignedOfficerId || '') !== String(officer.id));
      const removedFromOfficer = caseItems.filter(item => !terminalStatuses.has(item.status)
        && String(item.assignedOfficerId || '') === String(value.id)
        && String(item.assignedOfficerId || '') !== String(officer.id)).length;
      if (String(value.id) === String(officer.id)) return { ...value, activeCaseCount: value.activeCaseCount + assignedToTarget.length };
      return removedFromOfficer ? { ...value, activeCaseCount: Math.max(0, value.activeCaseCount - removedFromOfficer) } : value;
    }));
    try {
      for (const item of caseItems) await api.put(`/cases/${item.id}/assign`, { officerId: officer.id });
      setSelected([]);
      setBulkOpen(false);
      showNotice(`${caseItems.length} case${caseItems.length === 1 ? '' : 's'} assigned to ${officer.name}.`);
    } catch (error) {
      const [caseResult, officerResult] = await Promise.allSettled([loadCases(), loadOfficers()]);
      setCases(caseResult.status === 'fulfilled' ? caseResult.value : previousCases);
      setOfficers(officerResult.status === 'fulfilled' ? officerResult.value : previousOfficers);
      const refreshFailed = caseResult.status === 'rejected' || officerResult.status === 'rejected';
      showNotice(errorMessage(error, 'Some assignments may have failed.')
        + (refreshFailed ? ' Refresh failed; reload the board to confirm saved changes.' : ' The board was refreshed.'), true);
    } finally {
      setBulkSubmitting(false);
    }
  };

  const officerNameFor = item => item.assignedOfficerName
    || officers.find(officer => String(officer.id) === String(item.assignedOfficerId))?.name
    || (String(item.assignedOfficerId) === String(user?.id) ? user?.name : null);
  const activeCount = filtered.filter(item => !terminalStatuses.has(item.status)).length;
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const thisWeekCount = filtered.filter(item => item.createdAt && new Date(item.createdAt) >= weekStart).length;

  const advanceStatus = async (item, nextStatus, statusRemarks) => {
    if (!officerStatusTargets[item.status]?.has(nextStatus)) {
      throw new Error('Only the next workflow stage is allowed.');
    }
    const previousStatus = item.status;
    setCases(current => current.map(value => value.id === item.id ? { ...value, status: nextStatus } : value));
    try {
      await api.put(`/cases/${item.id}/status`, { status: nextStatus, remarks: statusRemarks });
      showNotice(`${item.caseNumber} moved to ${columns.find(column => column[0] === nextStatus)?.[1]}.`);
    } catch (error) {
      setCases(current => current.map(value => value.id === item.id ? { ...value, status: previousStatus } : value));
      showNotice(errorMessage(error, 'Could not update the case status. The previous status was restored.'), true);
      throw error;
    }
  };

  const referCase = async (item, ngo, note) => {
    const previousItem = item;
    const now = new Date().toISOString();
    setCases(current => current.map(value => value.id === item.id ? {
      ...value,
      status: 'REHABILITATION_REFERRED',
      assignedNgoId: ngo.id,
      assignedNgoName: ngo.name,
      referredAt: now,
      referralNote: note,
    } : value));
    try {
      const response = await api.put(`/cases/${item.id}/refer-rehabilitation`, { ngoId: ngo.id, note });
      const saved = response.data?.data;
      setCases(current => current.map(value => value.id === item.id ? {
        ...value,
        status: saved?.status || 'REHABILITATION_REFERRED',
        assignedNgoId: saved?.ngoId || ngo.id,
        assignedNgoName: saved?.ngoName || ngo.name,
        referredAt: saved?.referredAt || now,
        referralNote: note,
      } : value));
    } catch (error) {
      setCases(current => current.map(value => value.id === item.id ? previousItem : value));
      throw error;
    }
  };

  const updateVerification = (id, verification) => {
    setCases(current => current.map(item => item.id === id ? {
      ...item,
      manualVerificationDone: Boolean(verification?.manualVerificationDone),
      manualVerifiedByName: verification?.verifiedByName || null,
      manualVerifiedAt: verification?.verifiedAt || null,
    } : item));
  };

  return (
    <div className="space-y-6 pb-8">
      {loading && <p className="text-sm text-slate-500" role="status">Loading {isOfficer ? 'your cases' : 'cases'} from the backend…</p>}
      {loadError && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{loadError}</p>}
      {officersError && canAssign && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="alert">{officersError}</p>}

      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-teal-700"><ShieldCheck size={15} />Field operations</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{isOfficer ? 'My Cases' : 'Case management'}</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">{isOfficer ? 'Track and update cases assigned to you.' : 'A clear view of every child who needs your team’s attention.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:border-teal-300"><SlidersHorizontal size={16} />Board view<ChevronDown size={14} /></button>
          {!isOfficer && <button type="button" onClick={() => navigate('/report-case')} className="inline-flex items-center gap-2 rounded-xl bg-[#0b4f4b] px-3.5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#083f3c]"><Plus size={17} />New report</button>}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search case number, child, location..." className="w-full rounded-xl bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none ring-1 ring-transparent focus:ring-teal-200" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={filters.urgency} onChange={event => setFilters({ ...filters, urgency: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none"><option value="">All urgency</option>{Object.keys(urgency).map(level => <option key={level}>{level}</option>)}</select>
          <select value={filters.district} onChange={event => setFilters({ ...filters, district: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none"><option value="">All districts</option>{districts.map(district => <option key={district}>{district}</option>)}</select>
          <select value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none"><option value="">All statuses</option>{columns.map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select>
          <button type="button" className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-xs font-bold text-slate-500 hover:border-teal-400 hover:text-teal-700"><Filter size={14} />More filters</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800">{isOfficer ? 'My active cases' : 'All active cases'} <b className="ml-1">{activeCount}</b></span>
          <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">Needs attention <b className="ml-1">{filtered.filter(item => item.urgencyLevel === 'CRITICAL' && !terminalStatuses.has(item.status)).length}</b></span>
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800"><CalendarDays className="mr-1 inline" size={13} />This week <b className="ml-1">{thisWeekCount}</b></span>
        </div>
        {selected.length > 0 && canAssign && <div className="flex items-center gap-2 rounded-xl bg-[#0b4f4b] px-2 py-1.5 text-white shadow-lg">
          <span className="px-2 text-xs font-bold">{selected.length} selected</span>
          <button type="button" onClick={() => setBulkOpen(true)} className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-bold hover:bg-white/25"><Users size={14} />Assign</button>
          <button type="button" onClick={exportCases} className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-bold hover:bg-white/25"><Download size={14} />Export</button>
          <button type="button" onClick={() => setSelected([])} aria-label="Clear selection" className="p-1 text-teal-200 hover:text-white"><X size={15} /></button>
        </div>}
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => setDrag({ preview: active.data.current?.item })}
        onDragCancel={() => setDrag(null)}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {columns.map(column => (
            <DropColumn
              key={column[0]}
              column={column}
              items={filtered.filter(item => item.status === column[0])}
              selected={selected}
              officerNameFor={officerNameFor}
              isOfficer={isOfficer}
              onSelect={toggleSelected}
              onOpen={item => setFocusedCaseId(item.id)}
            />
          ))}
        </div>
        <DragOverlay>
          {drag?.preview && <div className="w-60 rotate-2 rounded-xl border border-teal-300 bg-white p-4 shadow-2xl"><p className="font-mono text-xs font-bold text-teal-800">{drag.preview.caseNumber}</p><p className="mt-2 text-sm font-bold">{drag.preview.childName || 'Child details protected'}</p><p className="mt-1 text-xs text-slate-500">Moving case…</p></div>}
        </DragOverlay>
      </DndContext>

      {notice && <div role={notice.isError ? 'alert' : 'status'} className={`fixed bottom-6 right-6 z-40 flex max-w-md items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-xl ${notice.isError ? 'bg-rose-700' : 'bg-[#0b4f4b]'}`}><Check size={17} className="shrink-0 text-amber-300" />{notice.message}</div>}
      <ConfirmModal drag={drag?.item ? drag : null} remarks={remarks} setRemarks={setRemarks} submitting={updatingStatus} onClose={() => setDrag(null)} onConfirm={confirmMove} />
      <BulkModal open={bulkOpen} officers={officers} officer={bulkOfficer} setOfficer={setBulkOfficer} submitting={bulkSubmitting} onClose={() => setBulkOpen(false)} onConfirm={applyBulkAssign} />
      {focusedCase && <CaseAssignmentPanel
        key={focusedCase.id}
        caseItem={focusedCase}
        canAssign={canAssign}
        isOfficer={isOfficer}
        user={user}
        onAssign={officer => assignCase(focusedCase, officer)}
        onMoveToUnderReview={() => moveToUnderReview(focusedCase)}
        onClose={() => setFocusedCaseId(null)}
        onOpenFullCase={id => navigate(`/cases/${id}`)}
        onAdvanceStatus={advanceStatus}
        onVerificationUpdated={updateVerification}
        onRefer={referCase}
        onOpenInvestigation={id => {
          setFocusedCaseId(null);
          navigate(`/officer/dashboard?caseId=${id}`);
        }}
      />}
    </div>
  );
}

function ConfirmModal({ drag, remarks, setRemarks, submitting, onClose, onConfirm }) {
  if (!drag) return null;
  const nextLabel = columns.find(column => column[0] === drag.next)?.[1];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div><p className="text-xs font-bold uppercase tracking-widest text-amber-600">Status change</p><h2 className="mt-1 text-xl font-bold text-slate-900">Move this case to {nextLabel}?</h2></div>
          <button type="button" onClick={onClose} aria-label="Close confirmation" className="text-slate-400"><X size={20} /></button>
        </div>
        <div className="mt-5 rounded-xl bg-slate-50 p-3"><p className="font-mono text-xs font-bold text-teal-800">{drag.item.caseNumber}</p><p className="mt-1 text-sm font-bold text-slate-800">{drag.item.childName || 'Child details protected'}</p></div>
        <label className="mt-5 block text-sm font-bold text-slate-700">Reason for this update <span className="text-red-500">*</span><textarea autoFocus value={remarks} onChange={event => setRemarks(event.target.value)} placeholder="Add a brief case note for the team..." rows="4" className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-50" /></label>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50">Cancel</button>
          <button type="button" disabled={!remarks.trim() || submitting} onClick={onConfirm} className="rounded-xl bg-[#0b4f4b] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{submitting ? 'Saving…' : 'Confirm update'}</button>
        </div>
      </div>
    </div>
  );
}

function BulkModal({ open, officers, officer, setOfficer, submitting, onClose, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex justify-between">
          <div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">Bulk action</p><h2 className="mt-1 text-xl font-bold">Assign selected cases</h2></div>
          <button type="button" onClick={onClose} aria-label="Close assignment dialog"><X size={19} className="text-slate-400" /></button>
        </div>
        <label className="mt-6 block text-sm font-bold text-slate-700">Active officer
          <select value={officer} onChange={event => setOfficer(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-teal-500">
            <option value="">Choose an officer</option>
            {officers.map(value => <option key={value.id} value={value.id}>{value.name} · {value.district || value.state || 'District not listed'} · {value.activeCaseCount} open</option>)}
          </select>
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500">Cancel</button>
          <button type="button" disabled={!officer || submitting} onClick={onConfirm} className="rounded-xl bg-[#0b4f4b] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">{submitting ? 'Assigning…' : 'Assign cases'}</button>
        </div>
      </div>
    </div>
  );
}
