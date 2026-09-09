import { Component } from 'react';

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected application error' };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CLRMS render failure:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="grid min-h-screen place-items-center bg-[#fffaf2] px-6 text-slate-900">
        <section className="w-full max-w-xl rounded-3xl border border-amber-200 bg-white p-8 shadow-xl shadow-amber-900/10">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-amber-700">Application error</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#0b4f4b]">CLRMS could not finish loading.</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            The page hit a browser-side error before it could render. Refresh once, then check the browser console if the problem returns.
          </p>
          <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 font-mono text-xs text-slate-500">
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 rounded-xl bg-[#0b4f4b] px-4 py-2.5 text-sm font-bold text-white"
          >
            Reload page
          </button>
        </section>
      </main>
    );
  }
}
