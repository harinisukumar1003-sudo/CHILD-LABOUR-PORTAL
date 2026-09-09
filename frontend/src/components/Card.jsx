export default function Card({ children, className = '' }) { return <section className={`rounded-2xl border border-slate-100 bg-white shadow-soft ${className}`}>{children}</section>; }
