import { useState } from 'react';
import { ArrowLeft, CheckCircle2, LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import api from '../services/api';

const interests = [
  ['CHILD_PROTECTION', 'Child protection'],
  ['AWARENESS_CAMPAIGNS', 'Awareness campaigns'],
  ['COUNSELLING', 'Counselling'],
  ['REHABILITATION', 'Rehabilitation activities'],
  ['FIELD_SUPPORT', 'Field support'],
  ['FUNDRAISING_AND_ADMIN', 'Fundraising or administration'],
];

const organizationTypes = [
  ['NGO', 'NGO'],
  ['GOVERNMENT_AGENCY', 'Government Agency'],
  ['CHARITY', 'Charity'],
  ['BUSINESS', 'Business'],
  ['OTHER', 'Other'],
];

const definitions = {
  volunteer: {
    title: 'Become a Volunteer',
    intro: 'Support child protection through awareness campaigns, counselling, field outreach, and rehabilitation activities. Share your interests and experience; our team will review your application and contact you.',
    endpoint: '/public/volunteer-applications',
    button: 'Submit Application',
    success: 'Your volunteer application has been received. Our team will review it and contact you using the details provided.',
    fields: [
      { name: 'fullName', label: 'Full Name', required: true, maxLength: 120 },
      { name: 'email', label: 'Email Address', type: 'email', required: true, maxLength: 254 },
      { name: 'phone', label: 'Phone Number', type: 'tel', required: true, maxLength: 30, pattern: '[+()0-9 .-]{7,30}' },
      { name: 'location', label: 'Location', required: true, maxLength: 180 },
      { name: 'areaOfInterest', label: 'Area of Interest', type: 'select', required: true, options: interests },
      { name: 'skills', label: 'Skills or Experience (optional)', type: 'textarea', maxLength: 3000 },
      { name: 'message', label: 'Message (optional)', type: 'textarea', maxLength: 3000 },
    ],
  },
  partnership: {
    title: 'Become Our Partner',
    intro: 'NGOs, government agencies, charities, and businesses can collaborate with us on child protection, awareness, and rehabilitation. Tell us about your organization and how you would like to work together.',
    endpoint: '/public/partnership-requests',
    button: 'Submit Partnership Request',
    success: 'Your partnership request has been received. Our team will review your proposal and contact you using the details provided.',
    fields: [
      { name: 'organizationName', label: 'Organization Name', required: true, maxLength: 180 },
      { name: 'organizationType', label: 'Organization Type', type: 'select', required: true, options: organizationTypes },
      { name: 'contactPerson', label: 'Contact Person', required: true, maxLength: 120 },
      { name: 'email', label: 'Email Address', type: 'email', required: true, maxLength: 254 },
      { name: 'phone', label: 'Phone Number', type: 'tel', required: true, maxLength: 30, pattern: '[+()0-9 .-]{7,30}' },
      { name: 'location', label: 'Location', required: true, maxLength: 180 },
      { name: 'message', label: 'Partnership Proposal or Message', type: 'textarea', required: true, minLength: 10, maxLength: 4000 },
    ],
  },
};

function FormField({ field, value, error, onChange }) {
  const controlClass = `mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100 ${
    error ? 'border-rose-400' : 'border-slate-200'
  }`;
  const commonProps = {
    id: field.name,
    name: field.name,
    value,
    onChange,
    required: field.required,
    maxLength: field.maxLength,
    minLength: field.minLength,
    pattern: field.pattern,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${field.name}-error` : undefined,
    className: controlClass,
  };

  return (
    <div>
      <label htmlFor={field.name} className="block text-sm font-semibold text-[#0b4f4b]">{field.label}</label>
      {field.type === 'textarea' ? (
        <textarea {...commonProps} rows={4} />
      ) : field.type === 'select' ? (
        <select {...commonProps}>
          <option value="">Select an option</option>
          {field.options.map(([optionValue, optionLabel]) => (
            <option key={optionValue} value={optionValue}>{optionLabel}</option>
          ))}
        </select>
      ) : (
        <input {...commonProps} type={field.type || 'text'} autoComplete={field.name === 'fullName' || field.name === 'contactPerson' ? 'name' : field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : undefined} />
      )}
      {error && <p id={`${field.name}-error`} className="mt-1 text-xs font-medium text-rose-700">{error}</p>}
    </div>
  );
}

export default function CollaborationFormPage({ type }) {
  const config = definitions[type];
  const [formData, setFormData] = useState(() => Object.fromEntries(config.fields.map(field => [field.name, ''])));
  const [fieldErrors, setFieldErrors] = useState({});
  const [requestError, setRequestError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = event => {
    const { name, value } = event.target;
    setFormData(previous => ({ ...previous, [name]: value }));
    setFieldErrors(previous => {
      if (!previous[name]) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
    setRequestError('');
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (loading || submitted) return;
    setLoading(true);
    setRequestError('');
    setFieldErrors({});

    try {
      const response = await api.post(config.endpoint, formData);
      if (response.status !== 201 || response.data?.success !== true || !response.data?.data?.id) {
        throw new Error('The server did not confirm that your submission was saved. Please try again.');
      }
      setSubmitted(true);
    } catch (error) {
      const responseData = error.response?.data;
      if (responseData?.fieldErrors && typeof responseData.fieldErrors === 'object') {
        setFieldErrors(Object.fromEntries(
          Object.entries(responseData.fieldErrors).map(([field, message]) => [field, String(message)]),
        ));
      }
      setRequestError(responseData?.message || error.message || 'We could not submit your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffaf2] text-slate-900">
      <PublicNavbar />
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <Link to="/about" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-800 hover:text-[#c94b32]">
          <ArrowLeft size={16} /> Back to About
        </Link>
        <section className="mt-6 rounded-3xl border border-teal-100 bg-white p-6 shadow-soft sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[.16em] text-teal-700">Get Involved</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0b4f4b] sm:text-4xl">{config.title}</h1>
          <p className="mt-4 leading-7 text-slate-600">{config.intro}</p>

          {submitted ? (
            <div role="status" className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
              <CheckCircle2 size={24} className="mb-3 text-emerald-700" />
              <h2 className="font-bold">Submission confirmed</h2>
              <p className="mt-2 text-sm leading-6">{config.success}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {requestError && (
                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{requestError}</p>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                {config.fields.map(field => (
                  <div key={field.name} className={field.type === 'textarea' || field.name === 'message' ? 'sm:col-span-2' : ''}>
                    <FormField field={field} value={formData[field.name]} error={fieldErrors[field.name]} onChange={handleChange} />
                  </div>
                ))}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#c94b32] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#a83d2a] disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading && <LoaderCircle size={18} className="animate-spin" />}
                {loading ? 'Submitting...' : config.button}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
