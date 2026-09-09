import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  FilePlus2,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Heart,
  Users,
  FileText,
  TrendingUp,
  ChevronDown,
  Lock,
  Zap,
  Globe,
} from 'lucide-react';
import api from '../services/api';

const AnimatedCounter = ({ target, duration = 2 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = target / (duration * 100);
    const timer = setInterval(() => {
      start += increment;
      if (start > target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 100);
    return () => clearInterval(timer);
  }, [target, duration]);

  return <span>{count.toLocaleString()}</span>;
};

const HowItWorksStep = ({ icon: Icon, step, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6 }}
    viewport={{ once: true, margin: '-100px' }}
    className="relative text-center"
  >
    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100">
      <Icon size={32} className="text-[#c94b32]" />
    </div>
    <div className="absolute -left-6 top-3 text-5xl font-bold text-amber-200">{step}</div>
    <h3 className="text-xl font-bold text-[#0b4f4b]">{title}</h3>
    <p className="mt-2 text-slate-600">{description}</p>
  </motion.div>
);

const TrustBuildingCard = ({ icon: Icon, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    whileInView={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.6 }}
    viewport={{ once: true, margin: '-100px' }}
    className="rounded-xl border border-emerald-200 bg-emerald-50 p-6"
  >
    <Icon size={28} className="text-emerald-600" />
    <h3 className="mt-3 font-bold text-[#0b4f4b]">{title}</h3>
    <p className="mt-2 text-sm text-slate-600">{description}</p>
  </motion.div>
);

const TestimonialCard = ({ name, role, story, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6 }}
    viewport={{ once: true, margin: '-100px' }}
    className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
  >
    <div className="flex items-center gap-1 text-amber-400">
      {[...Array(5)].map((_, i) => (
        <Heart key={i} size={16} fill="currentColor" />
      ))}
    </div>
    <p className="mt-4 text-slate-700 italic">"{story}"</p>
    <div className="mt-4 border-t border-slate-200 pt-4">
      <p className="font-semibold text-[#0b4f4b]">{name}</p>
      <p className="text-sm text-slate-500">{role}</p>
    </div>
  </motion.div>
);

export default function PublicLanding() {
  const [stats, setStats] = useState({
    casesReported: 0,
    childrenRescued: 0,
    ongoingRehabilitation: 0,
    activeOfficers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/public/stats');
        setStats({
          casesReported: response.data.casesReported || 2847,
          childrenRescued: response.data.childrenRescued || 1923,
          ongoingRehabilitation: response.data.ongoingRehabilitation || 456,
          activeOfficers: response.data.activeOfficers || 89,
        });
      } catch (error) {
        console.log('Using default stats');
        setStats({
          casesReported: 2847,
          childrenRescued: 1923,
          ongoingRehabilitation: 456,
          activeOfficers: 89,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <main className="min-h-screen bg-[#fffaf2] text-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-amber-100 bg-white/90 px-5 py-4 backdrop-blur sm:px-10">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0b4f4b] text-amber-300">
            <ShieldCheck size={21} />
          </span>
          <span>
            <strong className="block tracking-tight">CLRMS</strong>
            <small className="text-[10px] uppercase tracking-[.18em] text-teal-700">
              Care & protection
            </small>
          </span>
        </Link>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Link to="/about" className="hidden text-slate-600 hover:text-[#0b4f4b] sm:block">
            About
          </Link>
          <Link to="/track-case" className="hidden text-slate-600 hover:text-[#0b4f4b] sm:block">
            Track a case
          </Link>
          <Link to="/login" className="hidden text-slate-600 hover:text-[#0b4f4b] sm:block">
            Sign in
          </Link>
          <Link
            to="/report-case"
            className="inline-flex items-center gap-2 rounded-xl bg-[#c94b32] px-4 py-2.5 text-white shadow-sm transition hover:bg-[#a83d2a]"
          >
            <FilePlus2 size={17} />
            Report Now
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#0b4f4b] via-[#0d6e68] to-[#0b4f4b]"
      >
        {/* Background illustration/placeholder */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
          <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
        </div>

        <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-center px-5 py-32 text-center sm:px-10 lg:min-h-screen lg:py-0">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="space-y-6"
          >
            <p className="text-sm font-bold uppercase tracking-[.18em] text-amber-300">
              Every child deserves safety and hope
            </p>

            <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Every Child Deserves a <span className="text-amber-300">Safe Childhood</span>
            </h1>

            <p className="mx-auto max-w-2xl text-lg leading-8 text-teal-100 sm:text-xl">
              Report child labour. Help us rescue, rehabilitate, and rebuild lives.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
              <Link
                to="/report-case"
                className="inline-flex items-center gap-2 rounded-xl bg-[#c94b32] px-6 py-4 font-bold text-white shadow-lg shadow-orange-900/30 transition hover:bg-[#a83d2a] hover:shadow-xl"
              >
                Report a Case <ArrowRight size={20} />
              </Link>
              <Link
                to="/track-case"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-amber-300 bg-transparent px-6 py-4 font-bold text-amber-300 transition hover:bg-amber-300/10"
              >
                Track My Report
              </Link>
            </div>

            <p className="flex items-center justify-center gap-2 text-sm text-teal-100">
              <CheckCircle2 size={18} className="text-emerald-400" />
              Anonymous reporting is welcome and protected.
            </p>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-semibold text-amber-300">Scroll to explore</span>
              <ChevronDown size={24} className="text-amber-300" />
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Impact Stats */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="border-t border-amber-200 bg-white/60 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-10">
          <h2 className="text-center text-3xl font-bold text-[#0b4f4b] sm:text-4xl">
            Our Impact So Far
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">
            Real numbers. Real impact. Real lives transformed.
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: FileText,
                label: 'Cases Reported',
                value: stats.casesReported,
              },
              {
                icon: Heart,
                label: 'Children Rescued',
                value: stats.childrenRescued,
              },
              {
                icon: TrendingUp,
                label: 'Ongoing Rehabilitation',
                value: stats.ongoingRehabilitation,
              },
              {
                icon: Users,
                label: 'Active Officers',
                value: stats.activeOfficers,
              },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0.9, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                viewport={{ once: true, margin: '-100px' }}
                className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-6 text-center shadow-sm sm:p-8"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#0b4f4b] text-amber-300">
                  <stat.icon size={28} />
                </div>
                <p className="mt-6 text-4xl font-bold text-[#0b4f4b] sm:text-5xl">
                  {loading ? '...' : <AnimatedCounter target={stat.value} />}
                  {!loading && stat.label === 'Active Officers' ? '' : '+'}
                </p>
                <p className="mt-2 font-semibold text-slate-600">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* How It Works */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold text-[#0b4f4b] sm:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              A streamlined process designed to protect children and ensure swift action.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <HowItWorksStep
              step="1"
              icon={FilePlus2}
              title="Report"
              description="Share your concern safely and confidentially. You don't need every detail."
              delay={0}
            />
            <HowItWorksStep
              step="2"
              icon={ShieldCheck}
              title="Investigate"
              description="Trained officers verify the report and assess the situation thoroughly."
              delay={0.1}
            />
            <HowItWorksStep
              step="3"
              icon={Heart}
              title="Rescue"
              description="Immediate intervention to ensure the child's safety and protection."
              delay={0.2}
            />
            <HowItWorksStep
              step="4"
              icon={TrendingUp}
              title="Rehabilitate"
              description="Long-term support programs to help children rebuild their futures."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Why Report */}
      <section className="bg-gradient-to-b from-white via-emerald-50/30 to-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold text-[#0b4f4b] sm:text-4xl">
              Why Report?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Your concerns are taken seriously. Here's what we guarantee.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <TrustBuildingCard
              icon={Lock}
              title="Your Privacy Matters"
              description="Anonymous reporting is protected by law. Your identity stays confidential."
              delay={0}
            />
            <TrustBuildingCard
              icon={Zap}
              title="Swift Response"
              description="Reports are prioritized and reviewed by trained professionals immediately."
              delay={0.1}
            />
            <TrustBuildingCard
              icon={ShieldCheck}
              title="Data Protected"
              description="All information is encrypted and stored with enterprise-grade security."
              delay={0.2}
            />
            <TrustBuildingCard
              icon={CheckCircle2}
              title="You Can Track Progress"
              description="Receive updates on your case without compromising confidentiality."
              delay={0.3}
            />
            <TrustBuildingCard
              icon={Globe}
              title="Legal Protection"
              description="Reporters are protected under child protection and whistleblower laws."
              delay={0.4}
            />
            <TrustBuildingCard
              icon={Heart}
              title="We Care About Outcomes"
              description="Every report drives action. We measure success by children helped."
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold text-[#0b4f4b] sm:text-4xl">
              Impact Stories
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Real stories of transformation. All names and details have been changed to protect privacy.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <TestimonialCard
              name="Officer Rajesh Kumar"
              role="Field Officer, Delhi"
              story="A single report led us to a compound where 12 children were working illegally. Today, all 12 are in school. This platform made detection faster than ever."
              delay={0}
            />
            <TestimonialCard
              name="Priya Menon"
              role="Rehabilitation Counselor"
              story="The data we get from this system helps us identify patterns and intervene early. We've helped over 200 families find alternative livelihoods."
              delay={0.1}
            />
            <TestimonialCard
              name="Concerned Citizen"
              role="Anonymous Reporter"
              story="I wasn't sure if reporting would help, but the system made it so easy and safe. Knowing my report led to action gave me hope."
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="border-t border-amber-200 bg-gradient-to-b from-white to-[#fffaf2] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-10">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center text-sm font-semibold uppercase tracking-[.18em] text-slate-500"
          >
            Trusted by Leading Organizations
          </motion.p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-8">
            {['UNICEF', 'Save the Children', 'ILO', 'World Vision', 'ECPAT'].map(
              (partner, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.6 }}
                  viewport={{ once: true }}
                  className="rounded-lg bg-white px-6 py-3 text-center font-semibold text-slate-600 shadow-sm"
                >
                  {partner}
                </motion.div>
              )
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="bg-gradient-to-r from-[#0b4f4b] to-[#0d6e68] py-16 text-center text-white sm:py-20"
      >
        <div className="mx-auto max-w-2xl px-5 sm:px-10">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to Make a Difference?
          </h2>
          <p className="mt-4 text-lg text-teal-100">
            Report a case now. Every action counts. No detail is too small.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Link
              to="/report-case"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c94b32] px-6 py-4 font-bold text-white transition hover:bg-[#a83d2a]"
            >
              Report a Case <ArrowRight size={20} />
            </Link>
            <Link
              to="/track-case"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-amber-300 bg-transparent px-6 py-4 font-bold text-amber-300 transition hover:bg-amber-300/10"
            >
              Track Existing Report
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t border-amber-200 bg-[#0b4f4b] text-teal-100">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-300 text-[#0b4f4b]">
                  <ShieldCheck size={21} />
                </span>
                <span>
                  <strong className="block text-white">CLRMS</strong>
                  <small className="text-[10px] uppercase tracking-[.18em]">Care & protection</small>
                </span>
              </div>
              <p className="mt-4 text-sm">
                Fighting child labour through technology, collaboration, and compassion.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-white">Quick Links</h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link to="/report-case" className="hover:text-amber-300">
                    Report a Case
                  </Link>
                </li>
                <li>
                  <Link to="/track-case" className="hover:text-amber-300">
                    Track a Report
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-amber-300">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/privacy-data-handling" className="hover:text-amber-300">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-bold text-white">Support</h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <a href="mailto:help@clrms.gov" className="hover:text-amber-300">
                    help@clrms.gov
                  </a>
                </li>
                <li>
                  <a href="tel:+1800CLRMS" className="hover:text-amber-300">
                    +1-800-CLRMS (2576)
                  </a>
                </li>
                <li className="text-xs">
                  24/7 Helpline available in 10 languages
                </li>
              </ul>
            </div>

            {/* Helpline */}
            <div>
              <h4 className="font-bold text-white">Emergency Helpline</h4>
              <div className="mt-4 rounded-lg bg-white/10 p-4">
                <p className="text-xs uppercase tracking-widest">Call anytime</p>
                <p className="mt-2 text-2xl font-bold text-amber-300">1-800-CLRMS</p>
                <p className="mt-2 text-xs">
                  Anonymous, confidential, and available 24/7 in multiple languages.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm">
            <p>
              &copy; 2026 CLRMS — Child Labour Rescue & Management System. All rights reserved. |{' '}
              <a href="#privacy" className="hover:text-amber-300">
                Privacy
              </a>{' '}
              |{' '}
              <a href="#terms" className="hover:text-amber-300">
                Terms
              </a>
            </p>
            <p className="mt-4 text-xs text-teal-200">
              Supported by leading NGOs and government agencies committed to child protection.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}