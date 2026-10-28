import { useState } from 'react';
import { ArrowRight, ChevronDown, CircleHelp, FileText, HandHeart, LockKeyhole, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';

const faqItems = [
  {
    question: 'What should I include in a report?',
    answer: 'Share what you observed, where and when it happened, and any details that may help the response team assess the situation. Do not put yourself or a child at risk to collect more information.',
  },
  {
    question: 'Can I submit a report anonymously?',
    answer: 'Yes. Choose anonymous reporting on the report form. You can use the case number and tracking code shown after submission to check for updates.',
  },
  {
    question: 'How do I track a report?',
    answer: 'Open Track Case and enter the case number and tracking code provided after you submitted the report.',
  },
  {
    question: 'What happens after I submit a report?',
    answer: 'The response team reviews the information and determines appropriate next steps. If you provided contact details, the team may follow up if more information is needed.',
  },
  {
    question: 'How is sensitive information handled?',
    answer: 'Case information is intended for authorized child-protection work. Read the Privacy Policy for more about access and handling of sensitive data.',
  },
  {
    question: 'How can I volunteer or partner with CLRMS?',
    answer: 'Use the volunteer application or partnership request form to tell us how you would like to contribute. The team will review your submission and contact you.',
  },
];

const resourceItems = [
  {
    title: 'Report a Case',
    text: 'Submit information about a child who may need protection.',
    label: 'Open report form',
    to: '/report-case',
    Icon: FileText,
  },
  {
    title: 'Track a Case',
    text: 'Check the progress of a report using your case number and tracking code.',
    label: 'Track a report',
    to: '/track-case',
    Icon: MapPin,
  },
  {
    title: 'Volunteer',
    text: 'Apply to help with child protection, awareness, counselling, or rehabilitation activities.',
    label: 'Volunteer with us',
    to: '/volunteer',
    Icon: HandHeart,
  },
  {
    title: 'Partnerships',
    text: 'Propose a collaboration with your organization.',
    label: 'Explore partnership',
    to: '/partner-with-us',
    Icon: ArrowRight,
  },
  {
    title: 'Privacy Policy',
    text: 'Learn how CLRMS handles sensitive child and family information.',
    label: 'Read privacy information',
    to: '/privacy-data-handling',
    Icon: LockKeyhole,
  },
];

export default function HelpResources({ type }) {
  const isFaq = type === 'faq';
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <main className="min-h-screen bg-[#fffaf2] text-slate-900">
      <PublicNavbar />
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-teal-900 text-amber-300">
            {isFaq ? <CircleHelp size={24} /> : <FileText size={24} />}
          </span>
          <h1 className="mt-5 text-3xl font-bold text-[#0b4f4b] sm:text-4xl">
            {isFaq ? 'Frequently Asked Questions' : 'Resources'}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            {isFaq
              ? 'Answers to common questions about reporting, case tracking, and getting involved.'
              : 'Useful links for reporting concerns, tracking a case, and learning how to get involved.'}
          </p>
        </div>

        {isFaq ? (
          <section className="mt-10 divide-y divide-slate-200 rounded-2xl border border-teal-100 bg-white px-5 shadow-sm sm:px-8" aria-label="Frequently asked questions">
            {faqItems.map(({ question, answer }, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={question} className="py-1">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left font-semibold text-slate-800 hover:text-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-700"
                  >
                    {question}
                    <ChevronDown size={18} className={`shrink-0 text-teal-700 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && <p className="max-w-3xl pb-5 pr-8 text-sm leading-6 text-slate-600">{answer}</p>}
                </div>
              );
            })}
          </section>
        ) : (
          <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Portal resources">
            {resourceItems.map(({ title, text, label, to, Icon }) => (
              <article key={title} className="flex flex-col rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-teal-900 text-amber-300">
                  <Icon size={21} />
                </span>
                <h2 className="mt-4 font-bold text-[#0b4f4b]">{title}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{text}</p>
                <Link to={to} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-900 hover:text-[#c94b32]">
                  {label} <ArrowRight size={15} />
                </Link>
              </article>
            ))}
          </section>
        )}

        <p className="mt-8 text-center text-sm text-slate-600">
          Still have questions? <Link to="/contact" className="font-semibold text-teal-800 hover:underline">Contact us</Link>.
        </p>
      </div>
    </main>
  );
}
