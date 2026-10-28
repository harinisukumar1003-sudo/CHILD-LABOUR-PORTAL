import { ArrowRight, Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const tourSteps = {
  OFFICER: [
    { selector: '[data-tour="dashboard-overview"]', title: 'Your response overview', text: 'Start here to review your caseload, current priorities, and response activity.' },
    { selector: '[data-tour="case-navigation"]', title: 'Open the case workspace', text: 'Review reports, update case progress, and coordinate rehabilitation from the sidebar.' },
  ],
  ADMIN: [
    { selector: '[data-tour="dashboard-overview"]', title: 'Network performance', text: 'Monitor case trends, response outcomes, and district coverage from your command centre.' },
    { selector: '#pending-approvals', title: 'Review new registrations', text: 'Approve or reject pending Officer and NGO accounts here.' },
    { selector: '[data-tour="case-navigation"]', title: 'Coordinate casework', text: 'Open the case workspace and rehabilitation tools to review operational work.' },
  ],
};
const emptySteps = [];

function getSteps(role) {
  return tourSteps[role] || emptySteps;
}

export default function OnboardingTour({ role, pathname }) {
  const location = useLocation();
  const steps = getSteps(role);
  const isDashboard = /\/(?:officer|admin)\/dashboard$/.test(pathname);
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(() => {
    if (!isDashboard || !steps.length) return false;
    try {
      return window.localStorage.getItem(`clrms_tour_seen_${role}`) !== 'true';
    } catch {
      return true;
    }
  });
  const shouldShow = visible && isDashboard;

  useEffect(() => {
    if (!shouldShow) return undefined;
    const target = document.querySelector(steps[stepIndex]?.selector);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target?.classList.add('tour-target-highlight');
    return () => target?.classList.remove('tour-target-highlight');
  }, [location.pathname, stepIndex, steps, shouldShow]);

  const finish = () => {
    try {
      window.localStorage.setItem(`clrms_tour_seen_${role}`, 'true');
    } catch {
      // Keep the tour dismissible when persistent storage is unavailable.
    }
    setVisible(false);
  };

  if (!shouldShow || !steps[stepIndex]) return null;
  const current = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  return (
    <aside aria-label="Dashboard onboarding tour" aria-live="polite" className="fixed bottom-4 right-4 z-50 w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-teal-100 bg-white p-5 shadow-2xl shadow-slate-900/20 sm:bottom-6 sm:right-6">
      <div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-50 text-xs font-extrabold text-teal-800">{stepIndex + 1}</span><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-teal-700">Quick tour · {role === 'ADMIN' ? 'Administrator' : 'Officer'}</p><h2 className="mt-1 text-sm font-extrabold text-slate-900">{current.title}</h2></div><button type="button" onClick={finish} aria-label="Close dashboard tour" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={17} /></button></div>
      <p className="mt-3 text-xs leading-5 text-slate-600">{current.text}</p>
      <div className="mt-4 flex items-center justify-between"><span className="text-[10px] font-semibold text-slate-400">Step {stepIndex + 1} of {steps.length}</span><div className="flex gap-2"><button type="button" onClick={finish} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50">Skip</button><button type="button" onClick={() => isLast ? finish() : setStepIndex(index => index + 1)} className="inline-flex items-center gap-1 rounded-lg bg-[#0b4f4b] px-3 py-2 text-xs font-bold text-white">{isLast ? <><Check size={13} />Done</> : <>Next<ArrowRight size={13} /></>}</button></div></div>
    </aside>
  );
}
