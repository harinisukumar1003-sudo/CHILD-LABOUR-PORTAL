import { ArrowLeft, Home, SearchX } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import Logo from '../components/Logo';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#fffaf2]">
      <PublicNavbar />
      <main className="grid min-h-[70vh] place-items-center px-5 py-12">
        <section className="w-full max-w-xl rounded-3xl border border-amber-100 bg-white p-8 text-center shadow-soft sm:p-12">
          <Logo size="lg" className="mx-auto" />
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-700"><SearchX size={27} /></span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-amber-700">404 · Page not found</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0b4f4b]">This page isn’t here.</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">The link may be out of date, or the address may have been entered incorrectly.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700"><ArrowLeft size={16} />Go back</button>
            <Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-[#0b4f4b] px-4 py-3 text-sm font-bold text-white"><Home size={16} />Return home</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
