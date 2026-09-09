import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Heart,
  Users,
  BarChart3,
  FileText,
  TrendingUp,
  Zap,
  Send,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const SectionTitle = ({ title, subtitle }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8 }}
    viewport={{ once: true }}
    className="text-center"
  >
    <h2 className="text-3xl font-bold text-[#0b4f4b] sm:text-4xl">{title}</h2>
    {subtitle && <p className="mx-auto mt-4 max-w-2xl text-slate-600">{subtitle}</p>}
  </motion.div>
);

const StatCard = ({ number, label, source, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.6 }}
    viewport={{ once: true, margin: '-100px' }}
    className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-orange-50 p-6 text-center sm:p-8"
  >
    <p className="text-4xl font-bold text-[#c94b32] sm:text-5xl">{number}</p>
    <p className="mt-2 font-semibold text-[#0b4f4b]">{label}</p>
    {source && <p className="mt-1 text-xs text-slate-500">{source}</p>}
  </motion.div>
);

const CapabilityCard = ({ icon: Icon, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6 }}
    viewport={{ once: true, margin: '-100px' }}
    className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-6 sm:p-8"
  >
    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#0b4f4b] text-amber-300">
      <Icon size={28} />
    </div>
    <h3 className="mt-4 text-xl font-bold text-[#0b4f4b]">{title}</h3>
    <p className="mt-2 text-slate-600">{description}</p>
  </motion.div>
);

const TimelineStep = ({ step, title, description, details, delay }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    whileInView={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.6 }}
    viewport={{ once: true, margin: '-100px' }}
    className="relative flex gap-6"
  >
    {/* Timeline connector */}
    <div className="flex flex-col items-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#0b4f4b] bg-white font-bold text-[#0b4f4b]">
        {step}
      </div>
      <div className="mt-3 h-24 w-0.5 bg-gradient-to-b from-[#0b4f4b] to-transparent" />
    </div>

    {/* Content */}
    <div className="pb-6">
      <h3 className="text-xl font-bold text-[#0b4f4b]">{title}</h3>
      <p className="mt-2 text-slate-600">{description}</p>
      <div className="mt-3 space-y-1 text-sm text-slate-500">
        {details.map((detail, idx) => (
          <div key={idx} className="flex gap-2">
            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-emerald-600" />
            <span>{detail}</span>
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);

const PartnerLogo = ({ name, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    whileInView={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.6 }}
    viewport={{ once: true }}
    className="rounded-lg border border-slate-200 bg-white px-6 py-4 text-center font-semibold text-slate-600 shadow-sm"
  >
    {name}
  </motion.div>
);

const TeamCard = ({ name, role, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6 }}
    viewport={{ once: true, margin: '-100px' }}
    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
  >
    <div className="aspect-square bg-gradient-to-br from-[#0b4f4b] to-[#0d6e68]" />
    <div className="p-6">
      <p className="font-bold text-[#0b4f4b]">{name}</p>
      <p className="text-sm text-slate-600">{role}</p>
    </div>
  </motion.div>
);

const InvolvementCard = ({ icon: Icon, title, description, link, cta, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6 }}
    viewport={{ once: true, margin: '-100px' }}
    className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-6 sm:p-8"
  >
    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0b4f4b] text-amber-300">
      <Icon size={24} />
    </div>
    <h3 className="mt-4 text-lg font-bold text-[#0b4f4b]">{title}</h3>
    <p className="mt-2 text-sm text-slate-600">{description}</p>
    <Link
      to={link}
      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0b4f4b] hover:text-[#c94b32]"
    >
      {cta} <ArrowRight size={16} />
    </Link>
  </motion.div>
);

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/public/contact', formData);
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
      toast.success('Message sent! We'll get back to you soon.');
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
      console.error('Contact form error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
      onSubmit={handleSubmit}
      className="mx-auto max-w-2xl space-y-6"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-[#0b4f4b]">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-500 focus:border-[#0b4f4b] focus:outline-none focus:ring-2 focus:ring-[#0b4f4b]/20"
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#0b4f4b]">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-500 focus:border-[#0b4f4b] focus:outline-none focus:ring-2 focus:ring-[#0b4f4b]/20"
            placeholder="your@email.com"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-[#0b4f4b]">Message</label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
          rows="5"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-500 focus:border-[#0b4f4b] focus:outline-none focus:ring-2 focus:ring-[#0b4f4b]/20"
          placeholder="Tell us how you'd like to get involved or your inquiry..."
        />
      </div>
      <button
        type="submit"
        disabled={loading || submitted}
        className="inline-flex items-center gap-2 rounded-xl bg-[#c94b32] px-6 py-3 font-bold text-white transition hover:bg-[#a83d2a] disabled:bg-slate-400"
      >
        {submitted ? (
          <>
            <CheckCircle2 size={20} />
            Message Sent!
          </>
        ) : loading ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Sending...
          </>
        ) : (
          <>
            <Send size={20} />
            Send Message
          </>
        )}
      </button>
    </motion.form>
  );
};

export default function About() {
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
          <Link to="/" className="hidden text-slate-600 hover:text-[#0b4f4b] sm:block">
            Home
          </Link>
          <Link to="/report-case" className="hidden text-slate-600 hover:text-[#0b4f4b] sm:block">
            Report
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-[#c94b32] px-4 py-2.5 text-white shadow-sm transition hover:bg-[#a83d2a]"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative bg-gradient-to-b from-[#0b4f4b] via-[#0d6e68] to-[#0b4f4b] py-16 text-white sm:py-24"
      >
        <div className="absolute inset-0">
          <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-5 text-center sm:px-10">
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-4xl font-bold sm:text-5xl"
          >
            About CLRMS
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mx-auto mt-4 max-w-2xl text-lg text-teal-100"
          >
            Fighting child labour through technology, collaboration, and unwavering commitment to child protection.
          </motion.p>
        </div>
      </motion.section>

      {/* Mission & Vision */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-10">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Mission Text */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-[#0b4f4b]">Our Mission</h2>
                  <p className="mt-4 text-lg leading-8 text-slate-700">
                    To eradicate child labour through rapid response, comprehensive support, and systemic change. We
                    believe technology can bridge the gap between awareness and action, enabling citizens, officers,
                    and organizations to work together seamlessly to protect vulnerable children.
                  </p>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-[#0b4f4b]">Our Vision</h2>
                  <p className="mt-4 text-lg leading-8 text-slate-700">
                    A world where every child is safe, educated, and free to realize their full potential. We envision a
                    platform that transforms child labour rescue from a fragmented, slow process into a coordinated,
                    data-driven movement with measurable impact.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Illustration Placeholder */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-[#0b4f4b] to-[#0d6e68] shadow-2xl shadow-teal-950/20" />
              <div className="absolute inset-0 flex items-center justify-center rounded-3xl">
                <div className="text-center">
                  <Heart size={64} className="mx-auto text-amber-300 opacity-50" />
                  <p className="mt-4 text-white opacity-50">Mission & Vision Illustration</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="border-t border-amber-200 bg-gradient-to-b from-white to-red-50/30 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-10">
          <SectionTitle
            title="The Problem We're Solving"
            subtitle="Child labour remains a global crisis with millions affected. Here's the scale:"
          />

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              number="160M+"
              label="Children in Child Labour"
              source="ILO, 2024"
              delay={0}
            />
            <StatCard
              number="79M"
              label="In Hazardous Work"
              source="UNICEF Global Report"
              delay={0.1}
            />
            <StatCard
              number="43%"
              label="Cases Go Unreported"
              source="World Vision Study"
              delay={0.2}
            />
            <StatCard
              number="7.4%"
              label="Global Response Rate"
              source="International Labour Organization"
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-10">
          <SectionTitle
            title="What We Do"
            subtitle="CLRMS provides an integrated platform to report, track, and support child labour rescue operations."
          />

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <CapabilityCard
              icon={FileText}
              title="Reporting"
              description="Anonymous, secure reporting with no minimum information required. Citizens can submit concerns instantly."
              delay={0}
            />
            <CapabilityCard
              icon={Users}
              title="Case Management"
              description="Unified dashboard for officers to investigate, assign cases, and coordinate rescue operations."
              delay={0.1}
            />
            <CapabilityCard
              icon={Heart}
              title="Rehabilitation"
              description="Track long-term rehabilitation progress with medical, educational, and vocational support phases."
              delay={0.2}
            />
            <CapabilityCard
              icon={BarChart3}
              title="Analytics"
              description="Real-time insights on case trends, geographic hotspots, and rehabilitation outcomes for better planning."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Our Process */}
      <section className="border-t border-amber-200 bg-gradient-to-b from-white via-amber-50/20 to-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-10">
          <SectionTitle
            title="Our Process"
            subtitle="Every report sets a coordinated rescue and rehabilitation journey in motion."
          />

          <div className="mt-12 max-w-3xl space-y-2">
            <TimelineStep
              step="1"
              title="Report"
              description="A concerned citizen, teacher, or community member submits a report through CLRMS."
              details={[
                'Can be submitted anonymously',
                'No full details required—partial information is accepted',
                'Automated initial verification and risk assessment',
                'Case assigned a unique tracking code',
              ]}
              delay={0}
            />
            <TimelineStep
              step="2"
              title="Investigate"
              description="Trained case officers review, verify, and gather additional evidence."
              details={[
                'Multi-layer verification process',
                'Evidence collection and documentation',
                'Coordination with NGO partners for field assessment',
                'Priority assignment based on urgency level',
              ]}
              delay={0.1}
            />
            <TimelineStep
              step="3"
              title="Rescue"
              description="Coordinated intervention to ensure the child's immediate safety and protection."
              details={[
                'Multi-agency coordination (police, NGOs, social services)',
                'Safe extraction and medical assessment',
                'Documentation of incident for legal proceedings',
                'Initial trauma-informed support',
              ]}
              delay={0.2}
            />
            <TimelineStep
              step="4"
              title="Rehabilitate"
              description="Long-term, holistic support to help the child rebuild their life."
              details={[
                'Medical assessment and treatment',
                'Educational reinstatement and catch-up programs',
                'Vocational training and livelihood support',
                'Family reintegration and legal follow-up',
              ]}
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Who We Work With */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-10">
          <SectionTitle
            title="Who We Work With"
            subtitle="CLRMS is built on partnerships with leading organizations committed to child protection."
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {['UNICEF', 'Save the Children', 'ILO', 'World Vision', 'ECPAT', 'ActionAid', 'Plan International', 'Terre des Hommes', 'Childline', 'Local NGOs'].map(
              (partner, index) => (
                <PartnerLogo key={index} name={partner} delay={index * 0.05} />
              )
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            viewport={{ once: true }}
            className="mt-12 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50 p-8 text-center"
          >
            <p className="text-slate-600">
              <strong>Government Cooperation:</strong> We collaborate with national labour departments, social
              protection agencies, and law enforcement to ensure legal compliance and coordinated action.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Team Section */}
      <section className="border-t border-amber-200 bg-gradient-to-b from-white to-[#fffaf2] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-10">
          <SectionTitle
            title="Our Team"
            subtitle="Led by child protection experts, technologists, and dedicated advocates."
          />

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: 'Dr. Priya Sharma', role: 'Executive Director' },
              { name: 'Rajesh Kumar', role: 'Head of Operations' },
              { name: 'Ananya Desai', role: 'Technology Lead' },
              { name: 'Vikram Singh', role: 'Rehabilitation Lead' },
            ].map((member, index) => (
              <TeamCard key={index} name={member.name} role={member.role} delay={index * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* Get Involved */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-10">
          <SectionTitle
            title="Get Involved"
            subtitle="There are many ways to contribute to ending child labour. Choose how you'd like to help."
          />

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <InvolvementCard
              icon={FileText}
              title="Report a Case"
              description="Know of a child in labour? Make an anonymous report through our secure platform."
              link="/report-case"
              cta="Report Now"
              delay={0}
            />
            <InvolvementCard
              icon={Heart}
              title="Volunteer"
              description="Join our field teams, offer counselling, or help with rehabilitation programs."
              link="#contact-form"
              cta="Learn More"
              delay={0.1}
            />
            <InvolvementCard
              icon={Users}
              title="Partner With Us"
              description="NGOs, government agencies, and businesses: let's work together for greater impact."
              link="#contact-form"
              cta="Partner Now"
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section
        id="contact-form"
        className="border-t border-amber-200 bg-gradient-to-b from-white via-emerald-50/20 to-white py-16 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-10">
          <SectionTitle
            title="Get In Touch"
            subtitle="Have questions? Want to partner with us? Reach out today."
          />

          <div className="mt-12 grid gap-12 lg:grid-cols-3">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0b4f4b] text-amber-300">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#0b4f4b]">Address</h4>
                    <p className="text-sm text-slate-600">123 Protection Street, New Delhi, India</p>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0b4f4b] text-amber-300">
                    <Phone size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#0b4f4b]">Phone</h4>
                    <p className="text-sm text-slate-600">+1-800-CLRMS (2576)</p>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0b4f4b] text-amber-300">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#0b4f4b]">Email</h4>
                    <p className="text-sm text-slate-600">help@clrms.gov</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex gap-3">
                  <AlertCircle size={20} className="flex-shrink-0 text-emerald-600" />
                  <div className="text-sm text-emerald-700">
                    <strong>Emergency?</strong> Call our 24/7 helpline at +1-800-CLRMS. All calls are confidential.
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-amber-200 bg-[#0b4f4b] text-teal-100">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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

            <div>
              <h4 className="font-bold text-white">Quick Links</h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link to="/" className="hover:text-amber-300">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/report-case" className="hover:text-amber-300">
                    Report a Case
                  </Link>
                </li>
                <li>
                  <Link to="/track-case" className="hover:text-amber-300">
                    Track Report
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-amber-300">
                    About
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white">Resources</h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link to="/privacy-data-handling" className="hover:text-amber-300">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <a href="#faq" className="hover:text-amber-300">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="#blog" className="hover:text-amber-300">
                    Resources
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white">Emergency</h4>
              <div className="mt-4 rounded-lg bg-white/10 p-4">
                <p className="text-xs uppercase tracking-widest">24/7 Helpline</p>
                <p className="mt-2 text-2xl font-bold text-amber-300">1-800-CLRMS</p>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm">
            <p>&copy; 2026 CLRMS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
