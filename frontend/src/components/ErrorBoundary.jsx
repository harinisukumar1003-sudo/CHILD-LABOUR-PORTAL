import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('CLRMS encountered a rendering error.', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main role="alert" className="grid min-h-screen place-items-center bg-[#fffaf2] px-5 py-12 text-slate-900">
          <section className="w-full max-w-lg rounded-3xl border border-amber-100 bg-white p-8 text-center shadow-soft sm:p-12">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-amber-700">Something went wrong</p>
            <h1 className="mt-3 text-2xl font-extrabold text-[#0b4f4b]">CLRMS could not load this page.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">The issue has been recorded. Reload the page to try again.</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-7 rounded-xl bg-[#0b4f4b] px-5 py-3 text-sm font-bold text-white hover:bg-teal-800">Reload page</button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
