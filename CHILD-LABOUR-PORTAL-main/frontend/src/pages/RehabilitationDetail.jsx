import { AlertCircle, CalendarDays, Check, CircleUserRound, FileText, HeartPulse, LockKeyhole, MessageCircle, Plus, ShieldCheck, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import { PhaseStepper } from './RehabilitationManagement';
import { phaseLabels } from '../utils/rehabilitation';

const activityTypes = ['EDUCATION', 'COUNSELLING', 'HEALTHCARE', 'FAMILY_SUPPORT', 'LEGAL_AID', 'VOCATIONAL_TRAINING'];
const activityLabels = { EDUCATION: 'Education', COUNSELLING: 'Counselling', HEALTHCARE: 'Healthcare', FAMILY_SUPPORT: 'Family support', LEGAL_AID: 'Legal aid', VOCATIONAL_TRAINING: 'Vocational training' };
const icons = { EDUCATION: FileText, COUNSELLING: MessageCircle, HEALTHCARE: HeartPulse, FAMILY_SUPPORT: Users, LEGAL_AID: ShieldCheck, VOCATIONAL_TRAINING: CircleUserRound };

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

function ActivityModal({ type, rehabId, onClose, onAdded, onError }) {
  const [form, setForm] = useState({
    activityType: type,
    description: '',
    providerName: '',
    activityDate: new Date().toISOString().slice(0, 10),
    outcomeNotes: '',
    nextFollowUpDate: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = key => event => setForm(current => ({ ...current, [key]: event.target.value }));

  const submit = async event => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const response = await api.post(`/rehabilitation/${rehabId}/activities`, form);
      const saved = response.data?.data;
      if (!saved) throw new Error('The server did not confirm the activity.');
      onAdded(saved);
      onClose();
    } catch (requestError) {
      const message = getErrorMessage(requestError, 'The activity could not be saved.');
      setError(message);
      onError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">New record</p><h2 className="mt-1 text-xl font-bold">Add {activityLabels[type]} activity</h2></div>
          <button type="button" onClick={onClose} aria-label="Close activity form"><X size={20} className="text-slate-400" /></button>
        </div>
        {error && <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700"><AlertCircle size={15} />{error}</p>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Activity type"><select value={form.activityType} onChange={update('activityType')} className="field">{activityTypes.map(item => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Description"><textarea required value={form.description} onChange={update('description')} rows="3" className="field resize-none" placeholder="What support was provided?" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Provider name"><input required value={form.providerName} onChange={update('providerName')} className="field" placeholder="Organisation or person" /></Field>
            <Field label="Activity date"><input required type="date" value={form.activityDate} onChange={update('activityDate')} className="field" /></Field>
          </div>
          <Field label="Outcome notes"><textarea value={form.outcomeNotes} onChange={update('outcomeNotes')} rows="2" className="field resize-none" placeholder="What changed or was agreed?" /></Field>
          <Field label="Next follow-up"><input type="date" value={form.nextFollowUpDate} onChange={update('nextFollowUpDate')} className="field" /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500">Cancel</button>
            <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#0b4f4b] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Check size={16} />{saving ? 'Saving…' : 'Save activity'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block text-sm font-bold text-slate-700">{label}{children}</label>;
}

function ActivityTimeline({ entries }) {
  return <div className="space-y-0">{entries.map((entry, index) => {
    const Icon = icons[entry.activityType] || FileText;
    return (
      <div key={entry.id || `${entry.activityType}-${index}`} className="flex gap-4">
        <div className="flex flex-col items-center"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Icon size={17} /></span>{index < entries.length - 1 && <span className="w-px flex-1 bg-slate-200" />}</div>
        <div className="pb-7">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-slate-800">{entry.providerName}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{activityLabels[entry.activityType] || entry.activityType}</span><span className="text-xs text-slate-400">{entry.activityDate ? new Date(entry.activityDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date unavailable'}</span></div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{entry.description}</p>
          {entry.outcomeNotes && <p className="mt-2 rounded-lg bg-emerald-50/70 p-3 text-xs leading-5 text-emerald-900"><b>Outcome:</b> {entry.outcomeNotes}</p>}
          {entry.nextFollowUpDate && <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-amber-700"><CalendarDays size={13} />Follow-up {new Date(entry.nextFollowUpDate).toLocaleDateString('en-IN')}</p>}
        </div>
      </div>
    );
  })}</div>;
}

export default function RehabilitationDetail() {
  const { id } = useParams();
  const [rehab, setRehab] = useState(null);
  const [activities, setActivities] = useState([]);
  const [tab, setTab] = useState('EDUCATION');
  const [modal, setModal] = useState(false);
  const [loadedId, setLoadedId] = useState(null);
  const [error, setError] = useState('');
  const [activityError, setActivityError] = useState('');
  const loading = loadedId !== id;

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api.get(`/rehabilitation/${id}`),
      api.get(`/rehabilitation/${id}/activities`),
    ]).then(([rehabResult, activityResult]) => {
      if (!active) return;
      setError('');
      setActivityError('');
      if (rehabResult.status === 'fulfilled' && rehabResult.value.data?.data) {
        setRehab(rehabResult.value.data.data);
      } else {
        const requestError = rehabResult.status === 'rejected' ? rehabResult.reason : null;
        setError(getErrorMessage(requestError, 'The rehabilitation plan could not be loaded.'));
      }
      if (activityResult.status === 'fulfilled' && Array.isArray(activityResult.value.data?.data)) {
        setActivities(activityResult.value.data.data);
      } else {
        const requestError = activityResult.status === 'rejected' ? activityResult.reason : null;
        setActivityError(getErrorMessage(requestError, 'The activity history could not be loaded.'));
      }
    }).finally(() => {
      if (active) setLoadedId(id);
    });
    return () => { active = false; };
  }, [id]);

  const visible = useMemo(() => activities.filter(item => item.activityType === tab), [activities, tab]);
  const add = entry => setActivities(current => [...current, entry]);

  if (loading) return <p role="status" className="py-12 text-center text-sm text-slate-500">Loading rehabilitation plan…</p>;
  if (error || !rehab) return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
      <p className="flex items-center gap-2"><AlertCircle size={17} />{error || 'The rehabilitation plan is unavailable.'}</p>
      <Link to="/rehabilitation" className="mt-4 inline-flex font-bold underline">Back to rehabilitation cases</Link>
    </div>
  );

  return (
    <div className="space-y-6 pb-8">
      <Link to="/rehabilitation" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-700">← Back to rehabilitation</Link>
      <header className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 text-teal-700"><CircleUserRound size={32} /></span>
          <div><p className="font-mono text-sm font-bold text-teal-700">{rehab.childAlias}</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Rehabilitation plan</h1><p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><CalendarDays size={15} />Started {rehab.startDate ? new Date(rehab.startDate).toLocaleDateString('en-IN') : 'Date unavailable'} <span className="text-slate-300">·</span> Counsellor assigned</p></div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800"><LockKeyhole size={15} />Privacy-safe view</div>
      </header>
      <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Current pathway</p><p className="mt-1 text-sm font-semibold text-slate-700">{phaseLabels[rehab.currentPhase] || rehab.currentPhase}</p></div><span className="text-xs font-bold text-teal-700">Program #{String(rehab.id).padStart(3, '0')}</span></div>
        <PhaseStepper currentPhase={rehab.currentPhase} />
      </section>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center">
          <div><h2 className="font-bold">Activity log</h2><p className="mt-1 text-sm text-slate-500">Record the support that makes progress possible.</p></div>
          <button type="button" onClick={() => setModal(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b4f4b] px-3.5 py-2.5 text-sm font-bold text-white"><Plus size={16} />Add activity</button>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 pt-2">{activityTypes.map(type => <button key={type} type="button" onClick={() => setTab(type)} className={`whitespace-nowrap rounded-t-lg px-3 py-2 text-xs font-bold ${tab === type ? 'border-b-2 border-teal-600 text-teal-800' : 'text-slate-400'}`}>{activityLabels[type]}</button>)}</div>
        <div className="p-5">
          {activityError && <p role="alert" className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700"><AlertCircle size={15} />{activityError}</p>}
          {visible.length ? <ActivityTimeline entries={visible} /> : !activityError && <p className="py-8 text-center text-sm text-slate-400">No {activityLabels[tab].toLowerCase()} activities recorded.</p>}
        </div>
      </div>
      {modal && <ActivityModal type={tab} rehabId={id} onClose={() => setModal(false)} onAdded={add} onError={setActivityError} />}
    </div>
  );
}
