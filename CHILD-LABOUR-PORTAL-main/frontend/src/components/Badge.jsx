const colors = { urgent: 'bg-red-50 text-red-700', active: 'bg-teal-50 text-teal-700', pending: 'bg-amber-50 text-amber-700', closed: 'bg-slate-100 text-slate-600' };
export default function Badge({ children, tone = 'active' }) { return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colors[tone]}`}>{children}</span>; }
