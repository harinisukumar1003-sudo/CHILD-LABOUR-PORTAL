import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FilePlus2,
  FileText,
  HeartHandshake,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sprout,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CaseStatusTimeline from '../components/CaseStatusTimeline';
import Modal from '../components/Modal';
import api from '../services/api';

const investigationStatuses = new Set(['UNDER_REVIEW', 'ASSIGNED', 'INVESTIGATING']);
const statusDetails = {
  REPORTED: { label: 'Received', Icon: FileText, className: 'bg-sky-50 text-sky-700 ring-sky-100' },
  UNDER_REVIEW: { label: 'Under Investigation', Icon: Search, className: 'bg-amber-50 text-amber-800 ring-amber-100' },
  ASSIGNED: { label: 'Under Investigation', Icon: Search, className: 'bg-amber-50 text-amber-800 ring-amber-100' },
  INVESTIGATING: { label: 'Under Investigation', Icon: Search, className: 'bg-amber-50 text-amber-800 ring-amber-100' },
  RESCUED: { label: 'Support in Progress', Icon: HeartHandshake, className: 'bg-teal-50 text-teal-800 ring-teal-100' },
  REHABILITATION: { label: 'Support in Progress', Icon: HeartHandshake, className: 'bg-teal-50 text-teal-800 ring-teal-100' },
  CLOSED: { label: 'Resolved', Icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-800 ring-emerald-100' },
  REJECTED: { label: 'Closed', Icon: ShieldCheck, className: 'bg-slate-100 text-slate-700 ring-slate-200' },
};
const faqs = [
  {
    question: 'What happens after I submit a report?',
    answer: 'Our response team reviews the information and decides what support is needed. If more details would help, the team may follow up using the contact information you provided.',
  },
  {
    question: 'How can I follow my report?',
    answer: 'Your case number appears here after you sign in. Choose “View timeline” on a report to see the latest update and the steps taken so far.',
  },
  {
    question: 'Will my information be shared?',
    answer: 'Your report is handled carefully and shared only with people who need it to help keep the child safe. Please keep your case details private.',
  },
  {
    question: 'How long will it take?',
    answer: 'Every situation is different. The team works as quickly as it can, and your timeline will show when there is a new update.',
  },
];

function reportStatus(status) {
  return statusDetails[status] || {
    label: status?.replaceAll('_', ' ') || 'Update pending',
    Icon: CircleHelp,
    className: 'bg-slate-100 text-slate-700 ring-slate-200',
  };
}

function formattedDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Date unavailable';
}

function requestReports() {
  return api.get('/reports/my-reports').then(response => {
    const data = response.data.data;
    if (!Array.isArray(data)) throw new Error('The reports response was not in the expected format.');
    return data;
  });
}

function ReportCard({ report, index, onViewTimeline }) {
  const { label, Icon, className } = reportStatus(report.status);
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.06, 0.3), duration: 0.35 }}
      className="rounded-2xl border border-teal-900/5 bg-white p-5 shadow-[0_8px_24px_rgba(15,76,71,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,76,71,0.09)] sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Case number</p>
          <h3 className="mt-1 break-all text-lg font-bold tracking-tight text-[#0b4f4b]">{report.caseNumber}</h3>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${className}`}>
          <Icon size={14} aria-hidden="true" />
          {label}
        </span>
      </div>
      <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
        <CalendarDays size={16} className="shrink-0 text-teal-700/70" aria-hidden="true" />
        <span>Submitted {formattedDate(report.createdAt)}</span>
      </div>
      <button
        type="button"
        onClick={() => onViewTimeline(report)}
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-teal-800/15 bg-[#f3f9f6] px-4 py-2.5 text-sm font-semibold text-[#0b4f4b] transition hover:border-teal-800/30 hover:bg-teal-50 focus:outline-none focus:ring-4 focus:ring-teal-100"
      >
        View Timeline <ArrowRight size={16} aria-hidden="true" />
      </button>
    </motion.article>
  );
}

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState('');
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    let active = true;
    requestReports()
      .then(data => { if (active) setReports(data); })
      .catch(error => {
        if (active) setLoadError(error.response?.data?.message || error.message || 'We could not load your reports. Please try again.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const retryReports = () => {
    setLoading(true);
    setLoadError('');
    requestReports()
      .then(setReports)
      .catch(error => setLoadError(error.response?.data?.message || error.message || 'We could not load your reports. Please try again.'))
      .finally(() => setLoading(false));
  };

  const stats = useMemo(() => [
    { label: 'Total Reports', count: reports.length, Icon: FileText, style: 'bg-teal-50 text-teal-800' },
    { label: 'Under Investigation', count: reports.filter(report => investigationStatuses.has(report.status)).length, Icon: Clock3, style: 'bg-amber-50 text-amber-800' },
    { label: 'Resolved', count: reports.filter(report => report.status === 'CLOSED').length, Icon: CheckCircle2, style: 'bg-emerald-50 text-emerald-800' },
  ], [reports]);

  const openTimeline = async report => {
    setSelectedReport(report);
    setTimeline([]);
    setTimelineError('');
    setTimelineLoading(true);
    try {
      const response = await api.get(`/cases/${encodeURIComponent(report.caseNumber)}/timeline`);
      const data = response.data.data;
      if (!Array.isArray(data)) throw new Error('The timeline response was not in the expected format.');
      setTimeline(data);
    } catch (error) {
      setTimelineError(error.response?.data?.message || error.message || 'We could not load this timeline. Please try again.');
    } finally {
      setTimelineLoading(false);
    }
  };

  const displayName = user?.name?.trim() || 'there';

  return (
    <div className="mx-auto max-w-6xl pb-8">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#e8f5ee] via-[#eef8f5] to-[#f7fbf8] px-6 py-8 shadow-[0_14px_40px_rgba(15,76,71,0.06)] sm:px-9 sm:py-10"
      >
        <div className="pointer-events-none absolute -right-10 -top-14 h-56 w-56 rounded-full bg-white/50 blur-2xl" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-teal-800">
              <HeartHandshake size={15} aria-hidden="true" /> Your kindness matters
            </p>
            <h1 className="mt-5 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-[#123f3b] sm:text-4xl">
              Welcome back, {displayName}. Thank you for making a difference.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
              Your reports help connect children with the care and support they deserve.
            </p>
          </div>
          <Link
            to="/report-case"
            className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#0b4f4b] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-teal-950/10 transition hover:-translate-y-0.5 hover:bg-[#083f3c] focus:outline-none focus:ring-4 focus:ring-teal-200"
          >
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/15"><FilePlus2 size={18} /></span>
            Report a New Case
          </Link>
        </div>
      </motion.section>

      <section className="mt-8" aria-label="Your report summary">
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {stats.map(({ label, count, Icon, style }, index) => (
            <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }}>
              <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${style}`}><Icon size={20} aria-hidden="true" /></span>
                <div>
                  <p className="text-2xl font-bold tracking-tight text-slate-800">{count}</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mt-9" aria-labelledby="my-reports-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Your updates</p>
            <h2 id="my-reports-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-800">My Reports</h2>
            <p className="mt-1 text-sm text-slate-500">See where things stand, whenever you need to.</p>
          </div>
          {!loading && !loadError && reports.length > 0 && (
            <Link to="/my-reports" className="text-sm font-semibold text-teal-800 hover:underline">See all reports</Link>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading reports" aria-busy="true">
            {[0, 1, 2].map(item => <div key={item} className="h-44 animate-pulse rounded-2xl bg-white shadow-sm" />)}
          </div>
        ) : loadError ? (
          <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 shrink-0 text-amber-700" size={20} />
              <div className="flex-1">
                <p className="font-semibold">Your reports could not be loaded</p>
                <p className="mt-1 text-sm leading-6">{loadError}</p>
                <button onClick={retryReports} type="button" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-amber-900 underline underline-offset-4">
                  <RefreshCw size={15} /> Try again
                </button>
              </div>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-dashed border-teal-200 bg-white px-6 py-10 text-center sm:py-14">
            <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#edf7f1] text-teal-800">
              <Sprout size={36} strokeWidth={1.6} aria-hidden="true" />
              <span className="absolute -right-1 -top-1 grid h-8 w-8 place-items-center rounded-full bg-amber-100 text-amber-700"><HeartHandshake size={16} /></span>
            </div>
            <h3 className="mt-5 text-xl font-bold text-[#123f3b]">Your first step can make a difference</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              You haven’t submitted a report yet. If you’re concerned about a child, sharing what you know can help them get support.
            </p>
            <Link to="/report-case" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0b4f4b] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#083f3c] focus:outline-none focus:ring-4 focus:ring-teal-100">
              Report your first case <ArrowRight size={16} />
            </Link>
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {reports.map((report, index) => <ReportCard key={report.id || report.caseNumber} report={report} index={index} onViewTimeline={openTimeline} />)}
          </div>
        )}
      </section>

      <section className="mt-9 rounded-2xl border border-teal-900/5 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="faq-title">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-800"><CircleHelp size={20} /></span>
          <div>
            <h2 id="faq-title" className="text-lg font-bold text-slate-800">FAQs / What Happens Next</h2>
            <p className="mt-1 text-sm text-slate-500">A few helpful things to know about the process.</p>
          </div>
        </div>
        <div className="mt-4 divide-y divide-slate-100">
          {faqs.map(({ question, answer }, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={question} className="py-1">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex min-h-12 w-full items-center justify-between gap-4 py-3 text-left text-sm font-semibold text-slate-700 hover:text-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  {question}
                  <ChevronDown size={18} className={`shrink-0 text-teal-700 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden pb-4 pr-8 text-sm leading-6 text-slate-500"
                    >
                      {answer}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-6 flex items-center gap-2 rounded-xl bg-teal-50/70 px-4 py-3 text-xs leading-5 text-teal-900/80">
        <ShieldCheck size={16} className="shrink-0 text-teal-800" />
        Your report details are private. Keep your case number safe.
      </div>

      <Modal open={!!selectedReport} onClose={() => setSelectedReport(null)} title={`Case ${selectedReport?.caseNumber || ''}`}>
        {selectedReport && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current update</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{reportStatus(selectedReport.status).label}</p>
              </div>
              <span className="text-xs text-slate-500">Submitted {formattedDate(selectedReport.createdAt)}</span>
            </div>
            {timelineLoading ? (
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500" aria-live="polite">
                <LoaderCircle size={17} className="animate-spin" /> Loading your timeline…
              </div>
            ) : timelineError ? (
              <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p>{timelineError}</p>
                <button type="button" onClick={() => openTimeline(selectedReport)} className="mt-2 font-bold underline underline-offset-4">Try again</button>
              </div>
            ) : (
              <CaseStatusTimeline entries={timeline} currentStatus={selectedReport.status} />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
