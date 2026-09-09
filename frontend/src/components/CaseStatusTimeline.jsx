import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, FileText, HandHeart, Search, ShieldCheck } from 'lucide-react';
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
  const expandedKey = expanded || currentKey;
  const entriesFor = stage => normalized.filter(entry => entry.stageKey === stage.key);
  return <div className={`w-full ${className}`} aria-label="Case status timeline"><div className="flex flex-col gap-0 md:flex-row md:items-start">{stages.map((stage, index) => { const stageEntries = entriesFor(stage); const active = index === currentIndex; const complete = index < currentIndex; const open = expandedKey === stage.key; return <div key={stage.key} className="flex min-w-0 flex-1 md:flex-col md:items-stretch"><div className="flex md:block"><div className="flex flex-col items-center md:flex-row"><button onClick={() => setExpanded(open ? '' : stage.key)} aria-expanded={open} className="group relative z-10 flex shrink-0 items-center gap-3 text-left md:mx-auto md:block md:text-center"><motion.span layout className={`grid h-11 w-11 place-items-center rounded-full border-2 transition ${active ? 'border-amber-400 bg-amber-50 text-amber-700 shadow-[0_0_0_6px_rgba(245,158,11,.12)]' : complete ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-200 bg-slate-100 text-slate-400'} ${active ? 'animate-pulse' : ''}`}><stage.Icon size={19} /><span className="sr-only">{stage.label}</span></motion.span><span className={`text-sm font-bold md:mt-3 md:block ${active ? 'text-amber-800' : complete ? 'text-teal-800' : 'text-slate-400'}`}>{stage.label}</span></button>{index < stages.length - 1 && <span className={`hidden h-0.5 flex-1 md:block ${index < currentIndex ? 'bg-teal-700' : 'bg-slate-200'}`} />}</div>{index < stages.length - 1 && <span className={`ml-[21px] h-full min-h-[32px] w-0.5 md:hidden ${index < currentIndex ? 'bg-teal-700' : 'bg-slate-200'}`} />}</div><AnimatePresence initial={false}>{open && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden pb-4 pl-14 md:pb-0 md:pl-0 md:pt-5"><div className="rounded-xl border border-slate-100 bg-slate-50 p-3 md:min-h-[86px]">{stageEntries.length ? stageEntries.map(entry => <div key={entry.id} className="text-xs text-slate-500"><p className="font-semibold text-slate-700">{formatDate(entry.timestamp || entry.createdAt)}</p>{staffView && <><p className="mt-1 leading-5 text-slate-600">{entry.remarks || 'Status recorded'}</p><p className="mt-1 font-bold text-teal-700">{entry.actor || (entry.updatedByUserId ? `User #${entry.updatedByUserId}` : 'Response team')}</p></>}</div>) : <p className="text-xs text-slate-400">This stage is still ahead.</p>}</div></motion.div>}</AnimatePresence></div>; })}</div></div>;
}