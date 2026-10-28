import { Client } from '@stomp/stompjs';
import { Bell, CalendarClock, CheckCheck, ChevronRight, FilePlus2, RefreshCcw, ShieldCheck, UserCheck } from 'lucide-react';
import SockJS from 'sockjs-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { API_BASE_URL } from '../services/api';
import { notificationColors, notificationLabels, relativeTime } from '../utils/notifications';
import { useAuth } from '../context/AuthContext';

const icons = { NEW_REPORT: FilePlus2, CASE_ASSIGNED: UserCheck, STATUS_CHANGED: RefreshCcw, FOLLOW_UP_DUE: CalendarClock, ACCOUNT_APPROVED: ShieldCheck };

function currentUserId(user) {
  if (user?.id || user?.userId) return user.id || user.userId;
  try {
    const token = localStorage.getItem('clrms_token');
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub;
  } catch {
    return null;
  }
}

function NotificationIcon({ type }) {
  const Icon = icons[type] || Bell;
  return <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${notificationColors[type] || 'bg-slate-100 text-slate-600'}`}><Icon size={17} /></span>;
}

function getErrorMessage(error) {
  return error.response?.data?.message || error.message || 'Notifications could not be loaded.';
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const seenIds = useRef(new Set());
  const staff = ['OFFICER', 'NGO_STAFF', 'NGO_OFFICIAL', 'ADMIN'].includes(role);
  const userId = currentUserId(user);

  const fetchNotifications = useCallback(async () => {
    if (!staff) return;
    const [list, count] = await Promise.all([
      api.get('/notifications', { params: { page: 0, size: 8 } }),
      api.get('/notifications/unread-count'),
    ]);
    return {
      notifications: list.data.data?.content || [],
      unreadCount: count.data.data || 0,
    };
  }, [staff]);

  const applyNotifications = useCallback(({ notifications, unreadCount }) => {
    setItems(notifications);
    setUnread(unreadCount);
    seenIds.current = new Set(notifications.map(item => item.id));
    setErrorMessage('');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      applyNotifications(await fetchNotifications());
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [applyNotifications, fetchNotifications]);

  useEffect(() => {
    if (!staff) return undefined;
    let active = true;
    fetchNotifications()
      .then(data => { if (active) applyNotifications(data); })
      .catch(error => { if (active) setErrorMessage(getErrorMessage(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [staff, fetchNotifications, applyNotifications]);

  useEffect(() => {
    if (!staff || !userId) return undefined;
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL.replace(/\/api$/, '')}/ws`),
      reconnectDelay: 5000,
      onConnect: () => {
        load();
        client.subscribe(`/topic/notifications/${userId}`, frame => {
          try {
            const notification = JSON.parse(frame.body);
            const isNew = !seenIds.current.has(notification.id);
            seenIds.current.add(notification.id);
            setItems(current => [notification, ...current.filter(item => item.id !== notification.id)].slice(0, 8));
            if (isNew && !notification.isRead) setUnread(current => current + 1);
            toast(notification.message || notification.title || 'You have a new notification', { icon: '🔔' });
          } catch {
            setErrorMessage('A real-time notification could not be displayed. Refresh to try again.');
          }
        });
      },
    });
    client.activate();
    return () => { client.deactivate(); };
  }, [staff, userId, load]);

  const markAll = async () => {
    const previousItems = items;
    const previousUnread = unread;
    setItems(current => current.map(item => ({ ...item, isRead: true })));
    setUnread(0);
    try {
      await api.put('/notifications/read-all');
      setErrorMessage('');
    } catch (error) {
      setItems(previousItems);
      setUnread(previousUnread);
      setErrorMessage(getErrorMessage(error));
    }
  };

  const select = async item => {
    if (!item.isRead) {
      setItems(current => current.map(value => value.id === item.id ? { ...value, isRead: true } : value));
      setUnread(current => Math.max(0, current - 1));
      try {
        await api.put(`/notifications/${item.id}/read`);
      } catch (error) {
        setItems(current => current.map(value => value.id === item.id ? { ...value, isRead: false } : value));
        setUnread(current => current + 1);
        setErrorMessage(getErrorMessage(error));
      }
    }
    setOpen(false);
    if (item.relatedCaseId) navigate(role === 'NGO_STAFF' || role === 'NGO_OFFICIAL'
      ? `/rehabilitation?caseId=${encodeURIComponent(item.relatedCaseId)}`
      : `/cases?caseId=${encodeURIComponent(item.relatedCaseId)}`);
    else navigate('/notifications');
  };

  if (!staff) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
      >
        <Bell size={20} />
        {unread > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#c94b32] px-1 text-[10px] font-bold text-white">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && <div className="absolute right-0 top-12 z-40 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
          <div><h2 className="text-sm font-bold text-slate-800">Notifications</h2><p className="mt-0.5 text-[11px] text-slate-400">{unread ? `${unread} unread updates` : 'You are all caught up'}</p></div>
          <button type="button" onClick={markAll} disabled={!unread} className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 disabled:opacity-40"><CheckCheck size={14} />Mark all read</button>
        </div>
        {errorMessage && <div role="alert" className="flex items-start justify-between gap-2 border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700"><span>{errorMessage}</span><button type="button" onClick={load} className="shrink-0 font-bold underline">Retry</button></div>}
        <div className="max-h-[420px] overflow-y-auto">
          {loading && !items.length ? <p role="status" className="px-6 py-10 text-center text-sm text-slate-500">Loading notifications…</p>
            : items.length ? items.map(item => <button key={item.id} type="button" onClick={() => select(item)} className={`flex w-full gap-3 border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 ${!item.isRead ? 'bg-teal-50/30' : ''}`}>
              <NotificationIcon type={item.type} />
              <span className="min-w-0 flex-1">
                <span className={`block text-xs ${item.isRead ? 'font-semibold text-slate-700' : 'font-extrabold text-slate-900'}`}>{item.title || notificationLabels[item.type]}</span>
                <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500">{item.message}</span>
                <span className="mt-1.5 block text-[10px] font-semibold text-slate-400">{relativeTime(item.createdAt)}</span>
              </span>
              <ChevronRight size={16} className="mt-2 shrink-0 text-slate-300" />
            </button>)
              : <div className="px-6 py-12 text-center text-sm text-slate-400">No notifications yet.</div>}
        </div>
        <Link to="/notifications" onClick={() => setOpen(false)} className="flex items-center justify-center gap-1 border-t border-slate-100 px-4 py-3.5 text-xs font-bold text-teal-700 hover:bg-teal-50">View all notifications <ChevronRight size={14} /></Link>
      </div>}
    </div>
  );
}

export { NotificationIcon };
