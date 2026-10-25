import { HeartHandshake } from 'lucide-react';
import { motion } from 'framer-motion';
import PublicNavbar from '../components/PublicNavbar';

export default function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNavbar />
      <main className="min-h-[calc(100vh-4rem)] lg:grid lg:grid-cols-[minmax(360px,.9fr)_1.1fr]">
        <section className="relative hidden overflow-hidden bg-[#0b4f4b] px-10 py-6 text-white lg:flex lg:flex-col lg:justify-start xl:px-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(245,158,11,.22),transparent_32%),linear-gradient(145deg,#0b4f4b,#073b43)]" />
          <div className="relative mt-8 max-w-md">
            <div className="mb-7 grid h-16 w-16 place-items-center rounded-2xl border border-white/20 bg-white/10 text-accent"><HeartHandshake size={32} /></div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[.18em] text-amber-300">A community of care</p>
            <h1 className="text-5xl font-bold leading-[1.08] tracking-tight">Every child deserves a safe childhood.</h1>
            <p className="mt-6 max-w-sm text-base leading-7 text-teal-100">Together, we notice, respond, and help children return to learning, family, and hope.</p>
          </div>
          <p className="relative mt-auto pt-8 text-xs text-teal-200">Confidential by design · Built for people who care</p>
        </section>
        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }} className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-soft sm:p-10">
            <p className="text-sm font-semibold text-primary">{eyebrow}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
