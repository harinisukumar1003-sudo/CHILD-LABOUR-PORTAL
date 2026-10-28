import { motion } from 'framer-motion';
import {
  Building2,
  Filter,
  HandHeart,
  LoaderCircle,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

const statusBadgeColors = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  REVIEWED: 'bg-blue-100 text-blue-800 border-blue-200',
  CONTACTED: 'bg-purple-100 text-purple-800 border-purple-200',
  ACCEPTED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  DECLINED: 'bg-rose-100 text-rose-800 border-rose-200',
  RESPONDED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  ARCHIVED: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function AdminSubmissions() {
  const [activeTab, setActiveTab] = useState('volunteers'); // 'volunteers' | 'partnerships' | 'contacts'
  const [volunteers, setVolunteers] = useState([]);
  const [partnerships, setPartnerships] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setLoading(true);
    }
    try {
      const [volRes, partRes, contRes] = await Promise.all([
        api.get('/admin/collaborations/volunteers?size=100').catch(() => ({ data: { data: { content: [] } } })),
        api.get('/admin/collaborations/partnerships?size=100').catch(() => ({ data: { data: { content: [] } } })),
        api.get('/admin/collaborations/contacts').catch(() => ({ data: { data: [] } })),
      ]);

      setVolunteers(volRes.data?.data?.content || []);
      setPartnerships(partRes.data?.data?.content || []);
      setContacts(contRes.data?.data || []);
    } catch (err) {
      toast.error('Failed to load submissions data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateCollaborationStatus = async (id, newStatus) => {
    try {
      await api.put(`/admin/collaborations/${id}/status`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      loadData();
    } catch {
      toast.error('Failed to update submission status.');
    }
  };

  const updateContactStatus = async (id, newStatus) => {
    try {
      await api.put(`/admin/collaborations/contacts/${id}/status?status=${newStatus}`);
      toast.success(`Contact status updated to ${newStatus}`);
      loadData();
    } catch {
      toast.error('Failed to update status.');
    }
  };

  // Filtered lists
  const filteredVolunteers = volunteers.filter(item => {
    const matchesSearch =
      (item.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.location || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredPartnerships = partnerships.filter(item => {
    const matchesSearch =
      (item.organizationName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.contactPerson || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredContacts = contacts.filter(item => {
    const matchesSearch =
      (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.message || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Public Submissions & Inquiries
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review and respond to volunteer applications, NGO partnerships, and public inquiries.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => { setActiveTab('volunteers'); setStatusFilter('ALL'); }}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition cursor-pointer ${
            activeTab === 'volunteers'
              ? 'bg-[#0b4f4b] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <HandHeart size={16} />
          Volunteer Applications
          <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-extrabold ${
            activeTab === 'volunteers' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {volunteers.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('partnerships'); setStatusFilter('ALL'); }}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition cursor-pointer ${
            activeTab === 'partnerships'
              ? 'bg-[#0b4f4b] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 size={16} />
          NGO Partnerships
          <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-extrabold ${
            activeTab === 'partnerships' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {partnerships.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('contacts'); setStatusFilter('ALL'); }}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition cursor-pointer ${
            activeTab === 'contacts'
              ? 'bg-[#0b4f4b] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MessageSquare size={16} />
          Contact Inquiries
          <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-extrabold ${
            activeTab === 'contacts' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {contacts.length}
          </span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[260px] flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, location..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-[#0b4f4b] focus:ring-2 focus:ring-[#0b4f4b]/10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#0b4f4b]"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONTACTED">Contacted</option>
            <option value="ACCEPTED">Accepted / Responded</option>
            <option value="DECLINED">Declined</option>
          </select>
        </div>
      </div>

      {/* Tab 1: Volunteers */}
      {activeTab === 'volunteers' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12 text-slate-400">
              <LoaderCircle size={28} className="animate-spin" />
            </div>
          ) : filteredVolunteers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
              <HandHeart size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No volunteer applications found</p>
              <p className="text-xs text-slate-400 mt-1">Applications submitted on the public website appear here.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredVolunteers.map(item => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{item.fullName}</h3>
                      <p className="text-xs font-semibold text-teal-700 mt-0.5">
                        Area: {item.areaOfInterest?.replaceAll('_', ' ') || 'General Support'}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${statusBadgeColors[item.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <p className="flex items-center gap-1.5">
                      <Mail size={13} className="text-slate-400 shrink-0" />
                      <a href={`mailto:${item.email}`} className="text-teal-700 hover:underline">{item.email}</a>
                    </p>
                    {item.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone size={13} className="text-slate-400 shrink-0" />
                        <span>{item.phone}</span>
                      </p>
                    )}
                    {item.location && (
                      <p className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span>{item.location}</span>
                      </p>
                    )}
                    {item.skills && (
                      <p className="pt-1 text-slate-700">
                        <span className="font-semibold text-slate-500">Skills / Experience:</span> {item.skills}
                      </p>
                    )}
                    {item.message && (
                      <p className="rounded-xl bg-slate-50 p-2.5 text-slate-700 mt-2 italic text-xs leading-relaxed border border-slate-100">
                        "{item.message}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="text-slate-400">
                      {new Date(item.submittedAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {item.status !== 'CONTACTED' && (
                        <button
                          onClick={() => updateCollaborationStatus(item.id, 'CONTACTED')}
                          className="rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 font-semibold text-purple-700 hover:bg-purple-100 transition cursor-pointer"
                        >
                          Contacted
                        </button>
                      )}
                      {item.status !== 'ACCEPTED' && (
                        <button
                          onClick={() => updateCollaborationStatus(item.id, 'ACCEPTED')}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                        >
                          Accept
                        </button>
                      )}
                      {item.status !== 'DECLINED' && (
                        <button
                          onClick={() => updateCollaborationStatus(item.id, 'DECLINED')}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                        >
                          Decline
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Partnerships */}
      {activeTab === 'partnerships' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12 text-slate-400">
              <LoaderCircle size={28} className="animate-spin" />
            </div>
          ) : filteredPartnerships.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
              <Building2 size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No partnership requests found</p>
              <p className="text-xs text-slate-400 mt-1">NGO and institutional collaboration proposals appear here.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredPartnerships.map(item => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{item.organizationName || 'Unnamed Org'}</h3>
                      <p className="text-xs font-semibold text-teal-700 mt-0.5">
                        Type: {item.organizationType?.replaceAll('_', ' ') || 'NGO'} • Contact: {item.contactPerson}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${statusBadgeColors[item.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <p className="flex items-center gap-1.5">
                      <Mail size={13} className="text-slate-400 shrink-0" />
                      <a href={`mailto:${item.email}`} className="text-teal-700 hover:underline">{item.email}</a>
                    </p>
                    {item.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone size={13} className="text-slate-400 shrink-0" />
                        <span>{item.phone}</span>
                      </p>
                    )}
                    {item.location && (
                      <p className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span>{item.location}</span>
                      </p>
                    )}
                    {item.message && (
                      <p className="rounded-xl bg-slate-50 p-2.5 text-slate-700 mt-2 italic text-xs leading-relaxed border border-slate-100">
                        "{item.message}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="text-slate-400">
                      {new Date(item.submittedAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {item.status !== 'CONTACTED' && (
                        <button
                          onClick={() => updateCollaborationStatus(item.id, 'CONTACTED')}
                          className="rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 font-semibold text-purple-700 hover:bg-purple-100 transition cursor-pointer"
                        >
                          Contacted
                        </button>
                      )}
                      {item.status !== 'ACCEPTED' && (
                        <button
                          onClick={() => updateCollaborationStatus(item.id, 'ACCEPTED')}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                        >
                          Accept
                        </button>
                      )}
                      {item.status !== 'DECLINED' && (
                        <button
                          onClick={() => updateCollaborationStatus(item.id, 'DECLINED')}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                        >
                          Decline
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Contacts */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12 text-slate-400">
              <LoaderCircle size={28} className="animate-spin" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
              <MessageSquare size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No contact inquiries found</p>
              <p className="text-xs text-slate-400 mt-1">General inquiries sent from the About page contact form appear here.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredContacts.map(item => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{item.name}</h3>
                      <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <Mail size={12} className="text-slate-400 shrink-0" />
                        <a href={`mailto:${item.email}`} className="text-teal-700 hover:underline">{item.email}</a>
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${statusBadgeColors[item.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 text-slate-800 text-sm leading-relaxed border border-slate-100 font-sans">
                    {item.message}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="text-slate-400">
                      {new Date(item.submittedAt).toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`mailto:${item.email}?subject=CLRMS Support Inquiry Response`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <Mail size={13} /> Reply Email
                      </a>
                      {item.status !== 'RESPONDED' && (
                        <button
                          onClick={() => updateContactStatus(item.id, 'RESPONDED')}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                        >
                          Mark Responded
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
