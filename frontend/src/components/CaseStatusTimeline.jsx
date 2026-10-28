import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, FileText, HandHeart, Search, ShieldCheck, X } from 'lucide-react';
import { useMemo, useState } from 'react';

const stages = [
  { key: 'REPORTED', label: 'Reported', Icon: FileText, statuses: ['REPORTED'] },
  { key: 'UNDER_REVIEW', label: 'Under Investigation', Icon: Search, statuses: ['UNDER_REVIEW', 'ASSIGNED', 'INVESTIGATING'] },
  { key: 'RESCUED', label: 'Rescued', Icon: ShieldCheck, statuses: ['RESCUED'] },
  { key: 'REHABILITATION', label: 'Rehabilitation', Icon: HandHeart, statuses: ['REHABILITATION'] },
  { key: 'CLOSED', label: 'Closed', Icon: CheckCircle2, statuses: ['CLOSED'] },
];

function stageFor(entry) {
  return stages.find(stage => stage.statuses.some(status => entry.stage === status || entry.newStatus === status || entry.stage?.startsWith(`${status}_`)))?.key;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Awaiting update';
}

export default function CaseStatusTimeline({ entries = [], currentStatus, staffView = false, className = '' }) {
  const normalized = useMemo(() => entries.map((entry, index) => ({ ...entry, id: entry.id || `${entry.stage}-${index}`, stageKey: stageFor(entry) })).filter(entry => entry.stageKey), [entries]);
  const currentKey = useMemo(() => {
    const explicit = normalized.find(entry => entry.isCurrent)?.stageKey;
    if (explicit) return explicit;
    return stageFor({ stage: currentStatus }) || normalized.at(-1)?.stageKey || 'REPORTED';
  }, [currentStatus, normalized]);

  const currentIndex = stages.findIndex(stage => stage.key === currentKey);
  const [expanded, setExpanded] = useState(null);
  const expandedKey = expanded !== null ? expanded : currentKey;
  const entriesFor = stage => (stage ? normalized.filter(entry => entry.stageKey === stage.key) : []);

  const activeStage = stages.find(s => s.key === expandedKey);
  const activeStageIndex = stages.findIndex(s => s.key === expandedKey);

  return (
    <div className={`w-full ${className}`} aria-label="Case status timeline">
      {/* Stepper track */}
      <div className="relative flex items-start justify-between">
        {stages.map((stage, index) => {
          const active = index === currentIndex;
          const complete = index < currentIndex;
          const isSelected = expandedKey === stage.key;

          return (
            <div key={stage.key} className="relative flex-1 min-w-0">
              {/* Connecting line to next stage */}
              {index < stages.length - 1 && (
                <div
                  className="absolute top-5 left-1/2 w-full h-0.5 -translate-y-1/2 z-0"
                  aria-hidden="true"
                >
                  <div
                    className={`h-full w-full transition-colors duration-300 ${
                      index < currentIndex ? 'bg-teal-700' : 'bg-slate-200'
                    }`}
                  />
                </div>
              )}

              {/* Stage Button: Icon Circle + Text Label */}
              <button
                type="button"
                onClick={() => setExpanded(expanded === stage.key ? '' : stage.key)}
                aria-expanded={isSelected}
                className="group relative z-10 flex w-full flex-col items-center text-center cursor-pointer focus:outline-none"
              >
                <motion.span
                  layout
                  className={`grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-full border-2 transition-all duration-200 ${
                    active
                      ? 'border-amber-400 bg-amber-50 text-amber-700 shadow-[0_0_0_5px_rgba(245,158,11,.18)] ring-2 ring-amber-300/40'
                      : complete
                      ? 'border-teal-700 bg-teal-700 text-white'
                      : 'border-slate-200 bg-white text-slate-400 group-hover:border-slate-300 group-hover:text-slate-600'
                  } ${active ? 'animate-pulse' : ''}`}
                >
                  <stage.Icon size={18} />
                  <span className="sr-only">{stage.label}</span>
                </motion.span>

                {/* Stage Label: properly wrapped, tight leading, never overflowing */}
                <span
                  className={`mt-2 block w-full px-0.5 sm:px-1 text-center text-[11px] sm:text-xs font-bold leading-tight break-words transition-colors ${
                    active
                      ? 'text-amber-800'
                      : complete
                      ? 'text-teal-800'
                      : 'text-slate-500 group-hover:text-slate-700'
                  }`}
                >
                  {stage.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Expanded Stage Details Panel below the stepper */}
      <AnimatePresence mode="wait">
        {expandedKey && activeStage && (
          <motion.div
            key={activeStage.key}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 text-xs shadow-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <activeStage.Icon
                  size={15}
                  className={activeStageIndex <= currentIndex ? 'text-teal-700' : 'text-slate-400'}
                />
                <span className="font-bold text-slate-800 text-xs sm:text-sm">
                  {activeStage.label}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    activeStageIndex === currentIndex
                      ? 'bg-amber-100 text-amber-800'
                      : activeStageIndex < currentIndex
                      ? 'bg-teal-100 text-teal-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {activeStageIndex === currentIndex
                    ? 'Current Status'
                    : activeStageIndex < currentIndex
                    ? 'Completed'
                    : 'Upcoming'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setExpanded('')}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
                aria-label="Close stage details"
              >
                <X size={14} />
              </button>
            </div>

            {entriesFor(activeStage).length ? (
              <div className="space-y-2">
                {entriesFor(activeStage).map(entry => (
                  <div key={entry.id} className="text-slate-600">
                    <p className="font-semibold text-slate-700">
                      {formatDate(entry.timestamp || entry.createdAt)}
                    </p>
                    {entry.remarks && (
                      <p className="mt-0.5 leading-relaxed text-slate-600">{entry.remarks}</p>
                    )}
                    {staffView && (
                      <p className="mt-0.5 font-medium text-teal-700">
                        {entry.actor || (entry.updatedByUserId ? `User #${entry.updatedByUserId}` : 'Response team')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic">This stage is still ahead.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}