import { AlertCircle, Building2, Edit3, LoaderCircle, MapPin, Phone, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const emptyCenter = {
  name: '',
  address: '',
  contactPerson: '',
  contactPhone: '',
  capacity: '',
  servicesOffered: '',
};

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

function CenterModal({ center, onClose, onSave, saving }) {
  const [form, setForm] = useState(center || emptyCenter);
  const update = key => event => setForm(current => ({ ...current, [key]: event.target.value }));
  const submit = event => {
    event.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Directory management</p>
            <h2 className="mt-1 text-xl font-bold">{center ? 'Edit centre' : 'Add centre'}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close centre form"><X size={20} className="text-slate-400" /></button>
        </div>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <Input label="Centre name" value={form.name} onChange={update('name')} required />
          <Input label="Address" value={form.address} onChange={update('address')} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Contact person" value={form.contactPerson} onChange={update('contactPerson')} required />
            <Input label="Contact phone" value={form.contactPhone} onChange={update('contactPhone')} required />
          </div>
          <Input label="Capacity" type="number" min="0" value={form.capacity} onChange={update('capacity')} required />
          <Input label="Services offered" value={form.servicesOffered} onChange={update('servicesOffered')} placeholder="Education, Counselling, Healthcare" required />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500">Cancel</button>
            <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#0b4f4b] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {saving && <LoaderCircle size={15} className="animate-spin" />}Save centre
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({ label, type = 'text', ...props }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <input type={type} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-50" {...props} />
    </label>
  );
}

export default function RehabilitationCenters() {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';
  const [centers, setCenters] = useState([]);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const requestCenters = useCallback(async () => {
    const response = await api.get('/rehabilitation/centers');
    if (!Array.isArray(response.data?.data)) throw new Error('The server returned an invalid centre list.');
    return response.data.data;
  }, []);

  const loadCenters = useCallback(async () => {
    setLoading(true);
    try {
      setCenters(await requestCenters());
      setError('');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Rehabilitation centres could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [requestCenters]);

  useEffect(() => {
    let active = true;
    requestCenters()
      .then(data => {
        if (active) {
          setCenters(data);
          setError('');
        }
      })
      .catch(requestError => {
        if (active) setError(getErrorMessage(requestError, 'Rehabilitation centres could not be loaded.'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [requestCenters]);

  const visible = useMemo(() => centers.filter(center =>
    `${center.name || ''} ${center.address || ''} ${center.servicesOffered || ''}`.toLowerCase().includes(query.toLowerCase()),
  ), [centers, query]);

  const save = async center => {
    if (!isAdmin || saving) return;
    const editing = Boolean(center.id);
    setSaving(true);
    setError('');
    try {
      const response = await api({
        method: editing ? 'put' : 'post',
        url: editing ? `/rehabilitation/centers/${center.id}` : '/rehabilitation/centers',
        data: { ...center, capacity: Number(center.capacity) },
      });
      const saved = response.data?.data;
      if (!saved) throw new Error('The server did not confirm the centre update.');
      setCenters(current => editing
        ? current.map(item => item.id === saved.id ? saved : item)
        : [...current, saved]);
      setModal(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'The centre could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async id => {
    if (!isAdmin) return;
    setError('');
    try {
      await api.delete(`/rehabilitation/centers/${id}`);
      setCenters(current => current.filter(center => center.id !== id));
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'The centre could not be deleted.'));
    }
  };

  return (
    <div className="space-y-7 pb-8">
      <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-teal-700"><Building2 size={15} />Care network</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Rehabilitation centres</h1>
          <p className="mt-2 text-sm text-slate-500">Trusted places for care, learning, recovery, and a next chapter.</p>
        </div>
        {isAdmin && <button type="button" onClick={() => setModal({})} className="inline-flex items-center gap-2 rounded-xl bg-[#0b4f4b] px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />Add centre</button>}
      </header>

      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <span className="flex items-center gap-2"><AlertCircle size={17} />{error}</span>
        <button type="button" onClick={loadCenters} className="font-bold underline">Retry</button>
      </div>}

      <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <Search size={18} className="absolute left-6 top-5 text-slate-400" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search centres, services, or area..." className="w-full rounded-xl bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-teal-100" />
      </div>

      {loading ? <p role="status" className="py-10 text-center text-sm text-slate-500">Loading rehabilitation centres…</p>
        : <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {visible.map(center => <CenterCard key={center.id} center={center} isAdmin={isAdmin} onEdit={() => setModal(center)} onDelete={() => remove(center.id)} />)}
        </div>}
      {!loading && !error && !visible.length && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No centres match your search.</p>}
      {modal && isAdmin && <CenterModal center={modal.id ? modal : null} onClose={() => !saving && setModal(null)} onSave={save} saving={saving} />}
    </div>
  );
}

function CenterCard({ center, isAdmin, onEdit, onDelete }) {
  const services = (center.servicesOffered || '').split(',').map(item => item.trim()).filter(Boolean);

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><Building2 size={21} /></span>
        {isAdmin && <div className="flex gap-1">
          <button type="button" onClick={onEdit} aria-label={`Edit ${center.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-teal-700"><Edit3 size={15} /></button>
          <button type="button" onClick={onDelete} aria-label={`Delete ${center.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
        </div>}
      </div>
      <h2 className="mt-5 text-base font-bold text-slate-800">{center.name}</h2>
      <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-slate-500"><MapPin size={14} className="mt-0.5 shrink-0" />{center.address}</p>
      <div className="mt-5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-bold text-slate-600"><Users size={14} />Capacity</span>
        <span className="font-bold text-teal-700">{center.capacity ?? 'Not recorded'} places</span>
      </div>
      <div className="mt-5 flex flex-wrap gap-1.5">{services.map(service => <span key={service} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">{service}</span>)}</div>
      <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <p className="font-bold text-slate-700">{center.contactPerson}</p>
        <p className="mt-1 flex items-center gap-1.5"><Phone size={13} />{center.contactPhone}</p>
      </div>
    </article>
  );
}
