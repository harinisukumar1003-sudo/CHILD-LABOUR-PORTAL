import { ArrowLeft, CheckCircle2, Eye, EyeOff, LoaderCircle, Mail } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import AuthLayout from '../layouts/AuthLayout';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { dashboardPathForRole } from '../utils/roles';
import api from '../services/api';

const fieldClass = 'mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-teal-100';
function ErrorText({ message }) { return message ? <p className="mt-1 text-xs font-medium text-red-600">{message}</p> : null; }
function PasswordField({ register, error, name = 'password', label = 'Password' }) { const [show, setShow] = useState(false); return <div><label className="text-sm font-medium text-slate-700">{label}<div className="relative"><input type={show ? 'text' : 'password'} className={`${fieldClass} pr-11`} {...register(name)} /><button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)} className="absolute right-3 top-3 text-slate-400">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label><ErrorText message={error?.message} /></div>; }
const loginSchema = z.object({ email: z.string().email('Enter a valid email address'), password: z.string().min(8, 'Password must be at least 8 characters') });
export function Login() {
  const navigate = useNavigate();
  const { dispatch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({ resolver: zodResolver(loginSchema) });
  const demoAccounts = [
    { label: 'Citizen', email: 'demo.citizen@clrms.example' },
    { label: 'Officer', email: 'demo.officer@clrms.example' },
    { label: 'NGO Staff', email: 'demo.ngo@clrms.example' },
    { label: 'Admin', email: 'demo.admin@clrms.example' },
  ];
  const fillDemoCredentials = email => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', 'Demo@12345', { shouldValidate: true });
    setRequestError('');
  };
  const submit = async values => {
    setLoading(true);
    setRequestError('');
    try {
      const response = await api.post('/auth/login', values);
      const session = response.data.data;
      const { token, user } = session;
      const role = user.role;
      localStorage.setItem('clrms_token', token);
      dispatch({
        type: 'LOGIN',
        payload: {
          token,
          role,
          user: {
            ...user,
            role: role.replaceAll('_', ' '),
            initials: user.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase(),
          },
        },
      });
      navigate(dashboardPathForRole(role), { replace: true });
    } catch (error) {
      setRequestError(error.response?.data?.message
        || (!error.response ? "Cannot connect to the CLRMS server. Check that the backend is running and allows this page's origin." : error.message)
        || 'Sign in could not be completed.');
    } finally {
      setLoading(false);
    }
  };
  return <AuthLayout eyebrow="Welcome back" title="Sign in to CLRMS" subtitle="Your work helps children move toward safety and opportunity.">
    <form onSubmit={handleSubmit(submit)} noValidate>
      {requestError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{requestError}</p>}
      <label className="text-sm font-medium text-slate-700">Email address<div className="relative"><Mail className="absolute left-3 top-3 text-slate-400" size={18} /><input type="email" placeholder="you@example.org" className={`${fieldClass} pl-10`} {...register('email')} /></div></label>
      <ErrorText message={errors.email?.message} />
      <div className="mt-5"><PasswordField register={register} error={errors.password} /></div>
      <div className="mt-3 flex justify-end"><Link to="/forgot-password" className="text-sm font-semibold text-primary hover:underline">Forgot password?</Link></div>
      <Button type="submit" disabled={loading} className="mt-7 flex w-full items-center justify-center">{loading ? <><LoaderCircle className="mr-2 animate-spin" size={18} />Signing in...</> : 'Sign in securely'}</Button>
      <p className="mt-6 text-center text-sm text-slate-500">New to CLRMS? <Link to="/register" className="font-semibold text-primary">Create an account</Link></p>
    </form>
    <section className="mt-7 rounded-2xl border border-teal-100 bg-teal-50/70 p-4" aria-labelledby="demo-login-title">
      <h2 id="demo-login-title" className="text-sm font-bold text-teal-950">Local demo accounts</h2>
      <p className="mt-1 text-xs leading-5 text-teal-900">These accounts work only when the backend is explicitly started with its demo profile.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {demoAccounts.map(account => (
          <button
            key={account.email}
            type="button"
            onClick={() => fillDemoCredentials(account.email)}
            className="rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-900 hover:bg-teal-100"
          >
            Use {account.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-teal-900">Demo password: <code className="font-bold">Demo@12345</code></p>
    </section>
  </AuthLayout>;
}
const citizenSchema = z.object({ name: z.string().min(2, 'Please enter your full name'), email: z.string().email('Enter a valid email address'), password: z.string().min(8, 'Password must be at least 8 characters') });
const officerSchema = citizenSchema.extend({ organization: z.string().min(2, 'Organization name is required'), designation: z.string().min(2, 'Designation is required'), jurisdiction: z.string().min(2, 'Jurisdiction is required') });
export function Register() {
  const [type, setType] = useState('citizen');
  const [submitted, setSubmitted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const schema = type === 'citizen' ? citizenSchema : officerSchema;
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
  const submit = async values => {
    setLoading(true);
    setRequestError('');
    try {
      const { jurisdiction, ...accountValues } = values;
      const response = await api.post('/auth/register', {
        ...accountValues,
        role: type.toUpperCase(),
        district: jurisdiction,
      });
      setSubmitted(response.data.data);
    } catch (error) {
      setRequestError(error.response?.data?.message || error.message || 'Registration could not be completed.');
    } finally {
      setLoading(false);
    }
  };
  return <AuthLayout eyebrow="Join the network" title="Create your account" subtitle="Choose the account that best describes how you support children.">
    <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 text-xs font-semibold sm:text-sm">
      {['citizen', 'officer', 'ngo_staff'].map(value => <button key={value} type="button" onClick={() => { setType(value); setSubmitted(null); }} className={`rounded-lg px-2 py-2.5 ${type === value ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}>{value === 'citizen' ? 'Citizen' : value === 'officer' ? 'Officer' : 'NGO Staff'}</button>)}
    </div>
    {submitted ? <div className="mt-8 rounded-2xl bg-amber-50 p-5 text-amber-900">
      <CheckCircle2 className="mb-3 text-amber-600" />
      <h3 className="font-bold">{submitted.role === 'CITIZEN' ? 'Account created' : 'Application received'}</h3>
      <p className="mt-2 text-sm leading-6">{submitted.role === 'CITIZEN' ? 'Your account is ready. Sign in to view and manage your reports.' : 'Your staff account is pending administrator approval. You can sign in after your account is approved.'}</p>
      <Link to="/login" className="mt-4 inline-block text-sm font-bold underline">Continue to sign in</Link>
    </div> : <form onSubmit={handleSubmit(submit)} noValidate className="mt-7 space-y-4">
      {requestError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{requestError}</p>}
      <label className="text-sm font-medium text-slate-700">Full name<input className={fieldClass} {...register('name')} /></label><ErrorText message={errors.name?.message} />
      <label className="text-sm font-medium text-slate-700">Email address<input className={fieldClass} type="email" {...register('email')} /></label><ErrorText message={errors.email?.message} />
      {type !== 'citizen' && <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Organization<input className={fieldClass} {...register('organization')} /></label>
        <label className="text-sm font-medium text-slate-700">Designation<input className={fieldClass} {...register('designation')} /></label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">Jurisdiction<input className={fieldClass} placeholder="District or ward" {...register('jurisdiction')} /></label>
        <ErrorText message={errors.organization?.message || errors.designation?.message || errors.jurisdiction?.message} />
      </div>}
      <PasswordField register={register} error={errors.password} />
      <Button type="submit" disabled={loading} className="mt-3 w-full">{loading ? 'Creating account...' : 'Create account'}</Button>
      <p className="text-center text-sm text-slate-500">Already registered? <Link to="/login" className="font-semibold text-primary">Sign in</Link></p>
    </form>}
  </AuthLayout>;
}
const emailSchema = z.object({ email: z.string().email('Enter a valid email address') });
export function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(emailSchema) });
  const submit = async values => {
    setLoading(true);
    setRequestError('');
    try {
      await api.post('/auth/forgot-password', values);
      setSent(true);
    } catch (error) {
      setRequestError(error.response?.data?.message || error.message || 'Password recovery could not be completed.');
    } finally {
      setLoading(false);
    }
  };
  return <AuthLayout eyebrow="Account recovery" title="Forgot your password?" subtitle="Enter your email and we will send a secure reset link.">
    {sent ? <div className="rounded-2xl bg-teal-50 p-5 text-teal-900"><Mail className="mb-3 text-primary" /><h3 className="font-bold">Check your inbox</h3><p className="mt-2 text-sm leading-6">If an account matches that email, password reset instructions will be sent.</p><Link to="/login" className="mt-4 inline-block text-sm font-bold text-primary underline">Back to sign in</Link></div> : <form onSubmit={handleSubmit(submit)}>
      {requestError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{requestError}</p>}
      <label className="text-sm font-medium text-slate-700">Email address<input className={fieldClass} type="email" {...register('email')} /></label><ErrorText message={errors.email?.message} />
      <Button type="submit" disabled={loading} className="mt-6 w-full">{loading ? 'Sending...' : 'Send reset link'}</Button>
      <Link to="/login" className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-primary"><ArrowLeft size={16} />Back to sign in</Link>
    </form>}
  </AuthLayout>;
}
const resetSchema = z.object({ password: z.string().min(8, 'Password must be at least 8 characters'), confirm: z.string() }).refine((data) => data.password === data.confirm, { path: ['confirm'], message: 'Passwords do not match' });
export function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [requestError, setRequestError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(resetSchema) });
  const submit = async values => {
    setLoading(true);
    setRequestError('');
    try {
      await api.post('/auth/reset-password', { token, password: values.password });
      navigate('/login', { replace: true });
    } catch (error) {
      setRequestError(error.response?.data?.message || error.message || 'Password reset could not be completed.');
    } finally {
      setLoading(false);
    }
  };
  return <AuthLayout eyebrow="New password" title="Set a new password" subtitle="Choose a strong password to secure your CLRMS account.">
    <form onSubmit={handleSubmit(submit)} className="space-y-5">
      {requestError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{requestError}</p>}
      <PasswordField register={register} error={errors.password} />
      <PasswordField register={register} error={errors.confirm} name="confirm" label="Confirm password" />
      <Button type="submit" disabled={loading} className="w-full">{loading ? 'Updating...' : 'Update password'}</Button>
    </form>
  </AuthLayout>;
}
