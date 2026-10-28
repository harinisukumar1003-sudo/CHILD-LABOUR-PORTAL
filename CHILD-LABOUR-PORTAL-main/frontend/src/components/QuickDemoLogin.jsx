import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, UserCheck, Building2, MapPin, AlertCircle, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { dashboardPathForRole } from '../utils/roles';

const TABS = [
  { id: 'CITIZEN', label: 'Citizen' },
  { id: 'OFFICER', label: 'Officer' },
  { id: 'NGO', label: 'NGO' },
  { id: 'ADMIN', label: 'Admin' },
];

function getInitials(name) {
  if (!name) return 'U';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function QuickDemoLogin() {
  const navigate = useNavigate();
  const { dispatch } = useAuth();

  const [activeTab, setActiveTab] = useState('Citizen');
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loggingInId, setLoggingInId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [panelVisible, setPanelVisible] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.get('/auth/demo-accounts')
      .then(res => {
        if (!mounted) return;
        const list = res.data?.data || [];
        if (!Array.isArray(list) || list.length === 0) {
          setPanelVisible(false);
        } else {
          setAccounts(list);
          setPanelVisible(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setPanelVisible(false);
        }
      })
      .finally(() => {
        if (mounted) setLoadingAccounts(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!panelVisible) return null;

  const handleDemoLogin = async (account) => {
    if (loggingInId) return;
    setLoggingInId(account.id);
    setErrorMessage('');

    try {
      const response = await api.post('/auth/demo-login', { userId: account.id });
      const session = response.data?.data;
      if (!session || !session.token) {
        throw new Error('Invalid session response from server.');
      }

      const { token, user } = session;
      const role = user.role;

      localStorage.setItem('clrms_token', token);
      dispatch({
        type: 'LOGIN',
        payload: {
          token,
          role,
          user: {
            ...user,
            role: role.replaceAll('_', ' '),
            initials: getInitials(user.name),
          },
        },
      });

      const redirectPath = dashboardPathForRole(role);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (!err.response
          ? 'Cannot reach the CLRMS backend server. Please verify the service is running.'
          : 'Demo login is currently unavailable or disabled.');
      setErrorMessage(msg);
      setLoggingInId(null);
    }
  };

  const getFilteredAccounts = (tabLabel) => {
    return accounts.filter(acc => {
      const role = (acc.role || '').toUpperCase();
      if (tabLabel === 'Citizen') return role === 'CITIZEN';
      if (tabLabel === 'Officer') return role === 'OFFICER';
      if (tabLabel === 'NGO') return role === 'NGO_OFFICIAL' || role === 'NGO_STAFF';
      if (tabLabel === 'Admin') return role === 'ADMIN';
      return false;
    });
  };

  const filtered = getFilteredAccounts(activeTab);

  return (
    <section
      aria-label="Quick Demo Login"
      className="mt-6 rounded-2xl border border-teal-900/10 bg-gradient-to-b from-teal-50/90 to-emerald-50/40 p-4 shadow-sm"
    >
      {errorMessage && (
        <div
          role="alert"
          className="mb-3.5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-800"
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Role Tabs */}
      <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-teal-900/5 p-1">
        {TABS.map(tab => {
          const isActive = activeTab === tab.label;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.label);
                setErrorMessage('');
              }}
              className={`rounded-lg py-2 text-xs font-bold transition-all sm:text-sm ${
                isActive
                  ? 'bg-[#0b4f4b] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-white/60 hover:text-teal-950'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Account Cards */}
      <div className="mt-4 space-y-2.5">
        {loadingAccounts ? (
          <div className="flex items-center justify-center py-6 text-xs text-slate-500">
            <Loader2 size={16} className="mr-2 animate-spin text-[#0b4f4b]" />
            Loading demo accounts...
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">
            No demo accounts available under {activeTab}.
          </p>
        ) : (
          filtered.map(acc => {
            const isLoggingIn = loggingInId === acc.id;
            const initials = getInitials(acc.displayName);

            return (
              <button
                key={acc.id}
                type="button"
                disabled={Boolean(loggingInId)}
                onClick={() => handleDemoLogin(acc)}
                className={`group relative flex w-full items-center justify-between rounded-xl border bg-white p-3 text-left transition-all ${
                  isLoggingIn
                    ? 'border-[#0b4f4b] bg-teal-50/60 ring-2 ring-teal-600/20'
                    : 'border-teal-900/10 hover:border-teal-600 hover:bg-teal-50/30 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b4f4b] font-bold text-xs text-white shadow-sm group-hover:scale-105 transition-transform">
                    {isLoggingIn ? (
                      <Loader2 size={16} className="animate-spin text-amber-300" />
                    ) : (
                      initials
                    )}
                  </div>

                  {/* Details */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800 group-hover:text-[#0b4f4b]">
                        {acc.displayName}
                      </span>
                      {activeTab === 'Officer' && (
                        <span className="rounded bg-teal-100/70 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800">
                          Officer
                        </span>
                      )}
                      {activeTab === 'Admin' && (
                        <span className="rounded bg-amber-100/80 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                          Admin
                        </span>
                      )}
                      {activeTab === 'Citizen' && (
                        <span className="rounded bg-emerald-100/80 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900">
                          Citizen
                        </span>
                      )}
                    </div>

                    {/* Metadata line: State or Organization */}
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      {activeTab === 'Officer' && acc.state && (
                        <span className="inline-flex items-center gap-1 font-medium text-teal-800">
                          <MapPin size={12} className="text-teal-600" />
                          {acc.state}
                        </span>
                      )}
                      {activeTab === 'NGO' && acc.organization && (
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-800">
                          <Building2 size={12} className="text-emerald-600" />
                          {acc.organization}
                        </span>
                      )}
                      {activeTab === 'Citizen' && (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                          <UserCheck size={12} className="text-emerald-600" />
                          Citizen Portal Reporter
                        </span>
                      )}
                      {activeTab === 'Admin' && (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                          Full system management & audits
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action button / arrow */}
                <div className="ml-2 flex items-center text-slate-400 group-hover:text-[#0b4f4b]">
                  {isLoggingIn ? (
                    <span className="text-xs font-semibold text-[#0b4f4b]">Signing in...</span>
                  ) : (
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
