function Block({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />;
}

export default function DashboardLoadingSkeleton({ role = 'CITIZEN' }) {
  const title = role === 'ADMIN' ? 'Command centre' : role === 'CITIZEN' ? 'Your reports' : 'Casework overview';
  const subtitle = role === 'ADMIN'
    ? 'Preparing your network overview…'
    : role === 'CITIZEN' ? 'Preparing your case updates…' : 'Preparing your assigned casework…';
  return (
    <main className="-mx-5 -my-5 min-h-[calc(100vh-5rem)] bg-[#f6f8f8] px-5 py-8 sm:-mx-8 sm:-my-8 sm:px-8 sm:py-10" aria-busy="true" aria-label="Loading dashboard">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="w-full max-w-lg"><Block className="h-3 w-32 bg-teal-100" /><h1 className="sr-only">Loading {title}</h1><Block className="mt-4 h-9 w-3/4 bg-teal-100" /><p className="sr-only">{subtitle}</p><Block className="mt-3 h-4 w-full max-w-md" /></div>
          {role === 'CITIZEN' && <Block className="hidden h-11 w-36 bg-amber-100 sm:block" />}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: role === 'CITIZEN' ? 3 : 4 }, (_, index) => <section key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Block className="h-10 w-10 rounded-xl" /><Block className="mt-6 h-3 w-28" /><Block className="mt-3 h-8 w-20 bg-teal-100" /><Block className="mt-3 h-3 w-36" /></section>)}
        </div>
        <div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6"><Block className="h-5 w-44" /><Block className="mt-2 h-3 w-64" /><div className="mt-7 space-y-4">{Array.from({ length: role === 'ADMIN' ? 5 : 4 }, (_, index) => <div key={index} className="flex items-center gap-4 border-b border-slate-100 pb-4"><Block className="h-10 w-10 shrink-0 rounded-full" /><div className="flex-1"><Block className="h-3 w-1/3" /><Block className="mt-2 h-3 w-2/3" /></div><Block className="h-6 w-20" /></div>)}</div></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6"><Block className="h-5 w-36" /><Block className="mt-2 h-3 w-48" /><Block className={`mt-7 w-full rounded-2xl bg-teal-50 ${role === 'ADMIN' ? 'h-64' : 'h-48'}`} /></section>
        </div>
        <div className="mt-5 text-xs font-medium text-slate-400"><span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />{subtitle}</div>
      </div>
    </main>
  );
}
