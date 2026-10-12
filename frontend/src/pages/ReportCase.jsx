import 'leaflet/dist/leaflet.css';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clipboard,
  FileAudio2,
  FileText,
  Mic,
  Square,
  UploadCloud,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import api from '../services/api';
import PublicNavbar from '../components/PublicNavbar';
import {
  districtsByState,
  indianStatesAndTerritories,
  placeExamplesByState,
  sampleLocationPresets,
} from '../data/indiaLocations';

const steps = ['Child details', 'Location', 'Incident', 'Evidence', 'Reporter', 'Review'];
const initial = {
  childName: '',
  approxAge: '',
  gender: '',
  childDescription: '',
  locationAddress: '',
  latitude: '',
  longitude: '',
  district: '',
  state: '',
  incidentDescription: '',
  employerOrLocationDetails: '',
  dateOfIncident: '',
  urgencyLevel: '',
  anonymous: false,
  reporterName: '',
  reporterEmail: '',
  reporterPhone: '',
  files: [],
};
const audioFilePrefix = 'voice-statement-recording.';
const fileExtensions = new Set(['jpg', 'jpeg', 'png', 'mp4', 'pdf', 'webm', 'mp3', 'wav', 'm4a']);

function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const reporterFields = {
  anonymous: z.boolean(),
  reporterName: z.string(),
  reporterEmail: z.string(),
  reporterPhone: z.string(),
};

function validateReporter(values, context) {
  if (values.anonymous) return;

  if (!values.reporterName.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['reporterName'], message: 'Enter your name or choose anonymous reporting.' });
  }
  if (!values.reporterEmail.trim() && !values.reporterPhone.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['reporterPhone'], message: 'Enter a phone number or email address.' });
  }
  if (values.reporterEmail.trim() && !z.string().email().safeParse(values.reporterEmail.trim()).success) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['reporterEmail'], message: 'Enter a valid email address.' });
  }
  if (values.reporterPhone.trim() && !/^[+()\d\s.-]{7,30}$/.test(values.reporterPhone.trim())) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['reporterPhone'], message: 'Enter a valid phone number.' });
  }
}

const childFields = {
  childName: z.string(),
  approxAge: z.preprocess(
    (value) => value === '' || value == null || Number.isNaN(value) ? undefined : Number(value),
    z.number({ required_error: 'Approximate age is required.', invalid_type_error: 'Enter an approximate age.' })
      .int('Age must be a whole number.')
      .min(0, 'Age must be 0 or older.')
      .max(18, 'Age must be 18 or younger.'),
  ),
  gender: z.string().trim().min(1, 'Enter the child’s gender.'),
  childDescription: z.string().trim()
    .min(20, 'Describe the child in at least 20 characters.')
    .max(2000, 'The child description cannot exceed 2,000 characters.'),
};
const locationFields = {
  locationAddress: z.string().trim().min(8, 'Enter the full address or a detailed nearby landmark.'),
  latitude: z.string().min(1, 'Place a pin on the map.'),
  longitude: z.string().min(1, 'Place a pin on the map.'),
  district: z.string().trim().min(1, 'Enter the district.'),
  state: z.string().trim().min(1, 'Enter the state.'),
};
const incidentFields = {
  incidentDescription: z.string().trim()
    .min(30, 'Describe the incident in at least 30 characters.')
    .max(4000, 'The incident description cannot exceed 4,000 characters.'),
  dateOfIncident: z.string()
    .min(1, 'Select the date of the incident.')
    .refine((date) => date < localDateString(), 'The incident date cannot be today or in the future.'),
  urgencyLevel: z.string().min(1, 'Choose an urgency level.'),
};
const evidenceFields = {
  files: z.array(z.custom((file) => typeof File !== 'undefined' && file instanceof File))
    .min(1, 'Attach at least one image, video, document, or audio recording.'),
};
const reporterSchema = z.object(reporterFields).superRefine(validateReporter);
const reportShape = {
  ...childFields,
  ...locationFields,
  ...incidentFields,
  ...evidenceFields,
  ...reporterFields,
  employerOrLocationDetails: z.string(),
};
const reportSchema = z.object(reportShape).superRefine(validateReporter);
const stepSchemas = [
  z.object(childFields),
  z.object(locationFields),
  z.object(incidentFields),
  z.object(evidenceFields),
  reporterSchema,
  reportSchema,
];
const stepFields = [
  ['approxAge', 'gender', 'childDescription'],
  ['locationAddress', 'latitude', 'longitude', 'district', 'state'],
  ['incidentDescription', 'dateOfIncident', 'urgencyLevel'],
  ['files'],
  ['anonymous', 'reporterName', 'reporterEmail', 'reporterPhone'],
  Object.keys(reportShape),
];
const fieldLabels = {
  approxAge: 'Approximate age',
  gender: 'Gender',
  childDescription: 'Child description',
  locationAddress: 'Full address',
  latitude: 'Map pin',
  longitude: 'Map pin',
  district: 'District',
  state: 'State',
  incidentDescription: 'Incident description',
  dateOfIncident: 'Date of incident',
  urgencyLevel: 'Urgency level',
  files: 'Evidence file',
  reporterName: 'Reporter name',
  reporterPhone: 'Contact phone or email',
};

function Field({
  id,
  label,
  optional = false,
  error,
  register,
  type = 'text',
  placeholder,
  min,
  max,
  rows,
  options,
  listId,
  onChange,
}) {
  const registration = register(
    id,
    id === 'approxAge' ? { setValueAs: (value) => value === '' ? undefined : Number(value) } : undefined,
  );
  const commonProps = {
    id,
    ...registration,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${id}-error` : undefined,
    placeholder,
    list: listId,
    min,
    max,
    className: `mt-2 w-full rounded-xl border ${error ? 'border-red-400' : 'border-slate-200'} bg-white px-3.5 py-3 font-normal outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-50`,
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
        {label}
        {optional
          ? <span className="font-normal text-slate-500"> (optional)</span>
          : <span className="text-[#c94b32]"> *</span>}
        {options
          ? (
            <select
              {...commonProps}
              onChange={(event) => {
                registration.onChange(event);
                onChange?.(event);
              }}
            >
              <option value="">Choose {label.toLowerCase()}</option>
              {options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          )
          : rows
          ? <textarea {...commonProps} rows={rows} />
          : <input {...commonProps} type={type} />}
      </label>
      {error && <p id={`${id}-error`} className="mt-1 text-xs font-medium text-red-600" role="alert">{error}</p>}
    </div>
  );
}

function Section({ title, note, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-bold text-[#0b4f4b]">{title}</h2>
      {note && <p className="mt-1 text-sm text-slate-500">{note}</p>}
      <div className="mt-6 grid gap-5">{children}</div>
    </section>
  );
}

function MapPicker({ position, setPosition }) {
  useMapEvents({
    click(event) {
      setPosition([event.latlng.lat, event.latlng.lng]);
    },
  });
  return position
    ? <CircleMarker center={position} radius={10} pathOptions={{ color: '#c94b32', fillColor: '#f4a261', fillOpacity: 0.9 }} />
    : null;
}

function AudioRecorder({ onAttach, onRemove, attached, registerAudioInput }) {
  const [recording, setRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState('');
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioUrl = useMemo(() => recordedAudio ? URL.createObjectURL(recordedAudio) : '', [recordedAudio]);

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    setMessage('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMessage('Microphone access is needed to record a voice statement — you can still upload an audio file instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      onRemove();
      const preferredMimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferredMimeType ? { mimeType: preferredMimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      setRecordedAudio(null);
      setElapsed(0);
      recorder.addEventListener('dataavailable', (event) => {
        if (!event.data.size) return;
        chunksRef.current.push(event.data);
        const totalSize = chunksRef.current.reduce((total, chunk) => total + chunk.size, 0);
        if (totalSize > 5 * 1024 * 1024 && recorder.state === 'recording') {
          setMessage('This recording reached the 5MB audio limit.');
          if (timerRef.current) window.clearInterval(timerRef.current);
          timerRef.current = null;
          recorder.stop();
          setRecording(false);
        }
      });
      recorder.addEventListener('stop', () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const audio = new Blob(chunksRef.current, { type: mimeType });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (!audio.size) {
          setMessage('No audio was recorded. Please try again or upload an audio file.');
        } else if (audio.size > 5 * 1024 * 1024) {
          setMessage('This recording exceeds the 5MB audio limit. Try a shorter statement or upload a smaller audio file.');
        } else {
          setRecordedAudio(audio);
        }
      });
      recorder.start();
      setRecording(true);
      timerRef.current = window.setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setMessage('Microphone access is needed to record a voice statement — you can still upload an audio file instead');
    }
  }, [onRemove]);

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setRecording(false);
  };

  const removeRecording = () => {
    setRecordedAudio(null);
    setElapsed(0);
    setMessage('');
    onRemove();
  };

  const attachRecording = () => {
    if (!recordedAudio) return;
    const mimeType = recordedAudio.type || 'audio/webm';
    const extension = mimeType.startsWith('audio/mp4') ? 'm4a' : 'webm';
    const file = new File([recordedAudio], `voice-statement-recording.${extension}`, { type: mimeType });
    onAttach(file);
  };

  return (
    <section className="rounded-2xl border border-teal-100 bg-teal-50/50 p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#0b4f4b] shadow-sm"><Mic size={19} /></span>
        <div>
          <h3 className="font-bold text-[#0b4f4b]">Record Voice Statement</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">This recording will only be accessible to authorized officers investigating this case.</p>
        </div>
      </div>
      {recording ? (
        <div className="mt-5">
          <div className="flex items-center gap-3 text-sm font-semibold text-red-700">
            <span className="h-3 w-3 animate-pulse rounded-full bg-red-600" aria-hidden="true" />
            Recording · {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
          </div>
          <div className="mt-3 flex h-10 items-center justify-center gap-1" role="img" aria-label="Audio recording in progress">
            {[3, 6, 4, 8, 5, 3, 7, 4, 6, 3, 8, 5, 4, 7, 3].map((height, index) => (
              <span key={index} className="w-1 rounded-full bg-teal-600 animate-pulse" style={{ height: `${height * 4}px`, animationDelay: `${index * 70}ms` }} />
            ))}
          </div>
          <button type="button" onClick={stopRecording} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">
            <Square size={15} fill="currentColor" /> Stop recording
          </button>
        </div>
      ) : recordedAudio ? (
        <div className="mt-5">
          <p className="text-sm font-semibold text-slate-700">Listen to your recording before attaching it</p>
          <audio className="mt-3 w-full" controls src={audioUrl}>Audio playback is not supported by this browser.</audio>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={attachRecording} className="rounded-xl bg-[#0b4f4b] px-4 py-2 text-sm font-bold text-white">
              {attached ? 'Attach recording again' : 'Attach recording as evidence'}
            </button>
            <button type="button" onClick={startRecording} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Record again</button>
            <button type="button" onClick={removeRecording} className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              <X size={15} /> Delete
            </button>
          </div>
          {attached && <p className="mt-2 text-sm font-medium text-emerald-700">Recording is attached to the report.</p>}
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={startRecording} className="inline-flex items-center gap-2 rounded-xl bg-[#0b4f4b] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#083e3b]">
            <Mic size={17} /> Start recording
          </button>
          <label className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Upload Audio File
            <input {...registerAudioInput} type="file" accept=".webm,.mp3,.wav,.m4a,audio/webm,audio/mpeg,audio/wav,audio/mp4" className="sr-only" />
          </label>
        </div>
      )}
      {message && <p className="mt-3 text-sm font-medium text-red-700" role="alert">{message}</p>}
    </section>
  );
}

function UploadAudioAfterSubmission({ report }) {
  const [audioFile, setAudioFile] = useState(null);
  const [audioMessage, setAudioMessage] = useState('');
  const uploadAudio = async () => {
    if (!audioFile) return;
    setAudioMessage('');
    try {
      const data = new FormData();
      data.append('file', audioFile);
      const tracking = report.trackingCode ? `?trackingCode=${encodeURIComponent(report.trackingCode)}` : '';
      await api.post(`/reports/${report.id}/evidence/audio${tracking}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAudioMessage('Audio evidence uploaded.');
      setAudioFile(null);
    } catch (requestError) {
      setAudioMessage(requestError.response?.data?.message || 'The audio recording could not be uploaded.');
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 p-5 text-left">
      <h2 className="font-bold text-[#0b4f4b]">Add an audio statement later</h2>
      <p className="mt-1 text-sm text-slate-600">You may add a child or witness statement as supplementary evidence. Audio only, up to 5MB.</p>
      <input
        type="file"
        accept=".webm,.mp3,.wav,.m4a,audio/webm,audio/mpeg,audio/wav,audio/mp4"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected && selected.size > 5 * 1024 * 1024) {
            setAudioFile(null);
            setAudioMessage('Audio evidence must be at most 5MB.');
          } else {
            setAudioFile(selected || null);
            setAudioMessage('');
          }
        }}
        className="mt-3 block w-full text-sm"
      />
      {audioMessage && <p className="mt-2 text-sm text-slate-600" role="status">{audioMessage}</p>}
      <button type="button" disabled={!audioFile} onClick={uploadAudio} className="mt-3 rounded-xl bg-[#0b4f4b] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Upload audio</button>
    </section>
  );
}

export default function ReportCase() {
  const [step, setStep] = useState(0);
  const [sampleNotice, setSampleNotice] = useState('');
  const [locationPreset, setLocationPreset] = useState('');
  const [submitted, setSubmitted] = useState(null);
  const [latestIncidentDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return localDateString(date);
  });
  const [submitError, setSubmitError] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const formElement = useRef(null);
  const resolver = useMemo(() => zodResolver(stepSchemas[step]), [step]);
  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: initial,
    resolver,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });
  const values = useWatch({ control });
  const position = useMemo(
    () => values.latitude && values.longitude ? [Number(values.latitude), Number(values.longitude)] : null,
    [values.latitude, values.longitude],
  );
  const activeStepResult = stepSchemas[step].safeParse(values);
  const activeStepIssues = activeStepResult.success ? {} : activeStepResult.error.issues.reduce((result, issue) => {
    const field = issue.path[0];
    if (field && !result[field]) result[field] = issue.message;
    return result;
  }, {});
  const stepIsValid = activeStepResult.success;
  const fileList = Array.isArray(values.files) ? values.files : [];
  const voiceRecordingAttached = fileList.some((file) => file.name.startsWith(audioFilePrefix));

  const setPosition = ([latitude, longitude]) => {
    setValue('latitude', latitude.toFixed(6), { shouldDirty: true, shouldValidate: true });
    setValue('longitude', longitude.toFixed(6), { shouldDirty: true, shouldValidate: true });
  };

  const fillSampleDetails = () => {
    const sampleDate = new Date();
    sampleDate.setDate(sampleDate.getDate() - 1);
    const sampleValues = {
      childName: '',
      approxAge: 12,
      gender: 'Girl',
      childDescription: 'Fictional sample: school-age child with a blue backpack and a red checked shirt.',
      locationAddress: 'Sample location, Shivajinagar, Pune',
      latitude: '18.530800',
      longitude: '73.847500',
      district: 'Pune',
      state: 'Maharashtra',
      incidentDescription: 'Fictional sample: a child was seen working at a roadside stall during school hours.',
      employerOrLocationDetails: 'Fictional sample details — replace before submitting.',
      dateOfIncident: localDateString(sampleDate),
      urgencyLevel: 'HIGH',
      anonymous: false,
      reporterName: 'Demo Reporter',
      reporterEmail: 'reporter@example.test',
      reporterPhone: '9000000000',
    };
    Object.entries(sampleValues).forEach(([name, value]) => {
      setValue(name, value, { shouldDirty: true, shouldValidate: true });
    });
    setPosition([Number(sampleValues.latitude), Number(sampleValues.longitude)]);
    setLocationPreset(sampleLocationPresets[0].label);
    setStep(0);
    setSampleNotice('Fictional sample details filled in. Review and replace them before submitting; attach real evidence yourself.');
    setSubmitError('');
    setAttemptedSubmit(false);
  };

  const applyLocationPreset = (preset) => {
    setLocationPreset(preset?.label || '');
    if (!preset) return;
    setValue('locationAddress', preset.address, { shouldDirty: true, shouldValidate: true });
    setValue('district', preset.district, { shouldDirty: true, shouldValidate: true });
    setValue('state', preset.state, { shouldDirty: true, shouldValidate: true });
    setPosition([Number(preset.latitude), Number(preset.longitude)]);
  };

  const updateFiles = (newFiles) => {
    setValue('files', newFiles, { shouldDirty: true, shouldValidate: true });
    setSubmitError('');
  };

  const addFiles = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selectedFiles.length) return;
    const invalidFile = selectedFiles.find((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const maxBytes = ['webm', 'mp3', 'wav', 'm4a'].includes(extension) ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
      return !fileExtensions.has(extension) || file.size > maxBytes;
    });
    if (invalidFile) {
      setSubmitError(`"${invalidFile.name}" is not a supported evidence file or exceeds its file size limit.`);
      return;
    }
    if (fileList.length + selectedFiles.length > 5) {
      setSubmitError('Attach no more than five evidence files.');
      return;
    }
    updateFiles([...fileList, ...selectedFiles]);
  };

  const removeFile = (index) => updateFiles(fileList.filter((_, fileIndex) => fileIndex !== index));

  const attachRecording = (file) => {
    updateFiles([...fileList.filter((existing) => !existing.name.startsWith(audioFilePrefix)), file]);
  };

  const removeVoiceRecording = () => {
    updateFiles(fileList.filter((file) => !file.name.startsWith(audioFilePrefix)));
  };

  const continueToNextStep = async () => {
    const isValid = await trigger(stepFields[step]);
    if (isValid && step < steps.length - 1) {
      setStep((current) => current + 1);
      setSubmitError('');
      setAttemptedSubmit(false);
    }
  };

  const submit = async (formValues) => {
    setSubmitError('');
    setAttemptedSubmit(false);
    try {
      const data = new FormData();
      Object.entries(formValues).forEach(([key, value]) => {
        if (key === 'files' || (formValues.anonymous && ['reporterName', 'reporterEmail', 'reporterPhone'].includes(key))) return;
        data.append(key, value);
      });
      formValues.files.forEach((file) => data.append('files', file));
      const response = await api.post('/reports', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSubmitted(response.data.data);
    } catch (requestError) {
      setSubmitError(requestError.response?.data?.message || 'We could not submit the report. Please try again.');
    }
  };

  const submitIncomplete = async () => {
    setAttemptedSubmit(true);
    const isValid = await trigger();
    if (isValid) await handleSubmit(submit)();
    else formElement.current?.querySelector('[aria-invalid="true"]')?.focus();
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    if (step === steps.length - 1) submitIncomplete();
    else continueToNextStep();
  };

  const missingFields = useMemo(() => {
    if (!attemptedSubmit && step !== steps.length - 1) return [];
    const result = reportSchema.safeParse(values);
    if (result.success) return [];
    const fields = new Set(result.error.issues.map((issue) => issue.path[0]).filter(Boolean));
    return [...new Set([...fields].map((field) => fieldLabels[field] || field))];
  }, [attemptedSubmit, values, step]);

  const copy = () => navigator.clipboard?.writeText([submitted.caseNumber, submitted.trackingCode].filter(Boolean).join(' · '));

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#fffaf2] px-5 py-12 sm:px-8">
        <PublicNavbar />
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-7 text-center shadow-xl shadow-amber-900/10 sm:p-12">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={34} /></div>
          <p className="mt-6 text-sm font-bold uppercase tracking-[.16em] text-emerald-700">Report received</p>
          <h1 className="mt-2 text-3xl font-bold text-[#0b4f4b]">Thank you for speaking up.</h1>
          <p className="mt-3 leading-7 text-slate-600">Every report matters. Please save these details so you can follow the progress of your report.</p>
          <div className="mt-8 rounded-2xl bg-[#f1f8f5] p-5 text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Case number</p>
            <p className="mt-1 break-all text-2xl font-bold tracking-wide text-[#0b4f4b]">{submitted.caseNumber}</p>
            {submitted.trackingCode && <>
              <p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">Tracking code</p>
              <p className="mt-1 break-all text-2xl font-bold tracking-wide text-[#0b4f4b]">{submitted.trackingCode}</p>
            </>}
            <button type="button" onClick={copy} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-[#0b4f4b] shadow-sm">
              <Clipboard size={16} /> Copy details
            </button>
          </div>
          <UploadAudioAfterSubmission report={submitted} />
          <Link to="/track-case" className="mt-7 inline-flex font-bold text-[#0b4f4b] underline underline-offset-4">Track your report</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf2] px-4 py-6 sm:px-8 sm:py-10">
      <PublicNavbar />
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 mt-6">
          <p className="text-sm font-bold uppercase tracking-[.16em] text-[#c94b32]">A calm place to begin</p>
          <h1 className="mt-2 text-3xl font-bold text-[#0b4f4b] sm:text-4xl">Report a case</h1>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-slate-600">Thank you for helping protect a child. Share what you know, at your own pace.</p>
            <button type="button" onClick={fillSampleDetails} className="rounded-xl border border-teal-700 px-3 py-2 text-sm font-bold text-teal-800 hover:bg-teal-50">
              Fill sample details
            </button>
          </div>
          {sampleNotice && <p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{sampleNotice}</p>}
        </div>
        <div className="mb-8 grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Report steps">
          {steps.map((label, index) => (
            <button
              key={label}
              type="button"
              aria-current={index === step ? 'step' : undefined}
              onClick={() => index <= step && setStep(index)}
              className={`border-t-4 pt-3 text-left text-xs font-bold sm:text-sm ${index <= step ? 'border-[#c94b32] text-[#0b4f4b]' : 'border-slate-200 text-slate-400'}`}
            >
              <span className="mr-1">{index + 1}.</span>{label}
            </button>
          ))}
        </div>

        <form ref={formElement} noValidate onSubmit={handleFormSubmit}>
          {submitError && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{submitError}</div>}

          {step === 0 && (
            <Section title="Tell us about the child" note="A detailed description helps identify and protect the child.">
              <Field id="childName" label="Child’s real name" optional register={register} error={errors.childName?.message} placeholder="Leave blank if unknown" />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="approxAge" label="Approximate age" type="number" min="0" max="18" register={register} error={activeStepIssues.approxAge || errors.approxAge?.message} placeholder="Age 0–18" />
                <Field
                  id="gender"
                  label="Gender"
                  register={register}
                  error={activeStepIssues.gender || errors.gender?.message}
                  options={['Girl', 'Boy', 'Non-binary', 'Not known']}
                />
              </div>
              <Field id="childDescription" label="Child description" rows="4" register={register} error={activeStepIssues.childDescription || errors.childDescription?.message} placeholder="Describe the child’s appearance, clothing, or other identifying details (at least 20 characters)." />
            </Section>
          )}

          {step === 1 && (
            <Section title="Where did this happen?" note="Enter the address, district, and state, then place a pin on the map.">
              <div>
                <label htmlFor="locationPreset" className="block text-sm font-semibold text-slate-700">
                  Place examples <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <select
                  id="locationPreset"
                  value={locationPreset}
                  onChange={(event) => applyLocationPreset(sampleLocationPresets.find((preset) => preset.label === event.target.value))}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 font-normal outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-50"
                >
                  <option value="">Choose a sample place to fill state, district, address, and map pin</option>
                  {sampleLocationPresets.map((preset) => <option key={preset.label} value={preset.label}>{preset.label}</option>)}
                </select>
                <p className="mt-1 text-xs text-slate-500">These are example locations. You can edit all details or enter another address.</p>
              </div>
              <Field id="locationAddress" label="Full address or detailed landmark" register={register} error={activeStepIssues.locationAddress || errors.locationAddress?.message} placeholder="Street, building, nearby landmark, or neighbourhood" listId="place-options" />
              <div>
                <div className="h-72 overflow-hidden rounded-xl border border-slate-200">
                  <MapContainer center={position || [20.5937, 78.9629]} zoom={position ? 14 : 5} scrollWheelZoom className="h-full w-full">
                    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapPicker position={position} setPosition={setPosition} />
                  </MapContainer>
                </div>
                <p className="mt-2 text-xs text-slate-500"><span className="font-semibold">Map pin <span className="text-[#c94b32]">*</span>:</span> click the map to place it. Coordinates: {position ? `${values.latitude}, ${values.longitude}` : 'not selected yet'}</p>
                {(activeStepIssues.latitude || activeStepIssues.longitude || errors.latitude?.message) && (
                  <p className="mt-1 text-xs font-medium text-red-600" role="alert">{activeStepIssues.latitude || activeStepIssues.longitude || errors.latitude?.message}</p>
                )}
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Field
                    id="district"
                    label="District"
                    register={register}
                    error={activeStepIssues.district || errors.district?.message}
                    placeholder="Choose a suggestion or type the district"
                    listId="district-options"
                  />
                  <datalist id="district-options">
                    {(districtsByState[values.state] || []).map((district) => <option key={district} value={district} />)}
                  </datalist>
                </div>
                <div>
                  <Field
                    id="state"
                    label="State / union territory"
                    register={register}
                    error={activeStepIssues.state || errors.state?.message}
                    options={indianStatesAndTerritories}
                    onChange={() => {
                      setLocationPreset('');
                      setValue('district', '', { shouldDirty: true, shouldValidate: true });
                    }}
                  />
                  <datalist id="place-options">
                    {(placeExamplesByState[values.state] || []).map((place) => <option key={place} value={place} />)}
                  </datalist>
                </div>
              </div>
            </Section>
          )}

          {step === 2 && (
            <Section title="What happened?" note="Tell us what you observed. The date must be before today.">
              <Field id="incidentDescription" label="Incident description" rows="5" register={register} error={activeStepIssues.incidentDescription || errors.incidentDescription?.message} placeholder="Describe what happened, where, and when (at least 30 characters)." />
              <Field id="employerOrLocationDetails" label="Employer or location details" optional register={register} error={errors.employerOrLocationDetails?.message} placeholder="Business name or additional details" />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="dateOfIncident" label="Date of incident" type="date" max={latestIncidentDate} register={register} error={activeStepIssues.dateOfIncident || errors.dateOfIncident?.message} />
                <div>
                  <label htmlFor="urgencyLevel" className="block text-sm font-semibold text-slate-700">
                    Urgency level <span className="text-[#c94b32]"> *</span>
                  </label>
                  <select
                    id="urgencyLevel"
                    {...register('urgencyLevel')}
                    aria-invalid={Boolean(activeStepIssues.urgencyLevel || errors.urgencyLevel)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 outline-none"
                  >
                    <option value="">Select urgency</option>
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                  {(activeStepIssues.urgencyLevel || errors.urgencyLevel?.message) && <p className="mt-1 text-xs font-medium text-red-600" role="alert">{activeStepIssues.urgencyLevel || errors.urgencyLevel?.message}</p>}
                </div>
              </div>
            </Section>
          )}

          {step === 3 && (
            <Section title={<span>Add supporting evidence <span className="text-[#c94b32]">*</span></span>} note="At least one image, video, document, or audio recording is required. Audio must be 5MB or smaller.">
              <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/40 p-6 text-center">
                <UploadCloud className="text-[#0b4f4b]" size={30} />
                <span className="mt-3 font-bold text-[#0b4f4b]">Choose files to upload</span>
                <span className="mt-1 text-xs text-slate-500">JPG, PNG, MP4, PDF (10MB max) · WEBM, MP3, WAV, M4A (5MB max)</span>
                <input type="file" multiple accept=".jpg,.jpeg,.png,.mp4,.pdf,.webm,.mp3,.wav,.m4a,audio/*" onChange={addFiles} className="sr-only" />
              </label>
              <AudioRecorder
                onAttach={attachRecording}
                onRemove={removeVoiceRecording}
                attached={voiceRecordingAttached}
                registerAudioInput={register('audioFallback', { onChange: (event) => {
                  const file = event.target.files?.[0];
                  const extension = file?.name.split('.').pop()?.toLowerCase();
                  if (file && !['webm', 'mp3', 'wav', 'm4a'].includes(extension)) {
                    event.target.value = '';
                    setSubmitError('Choose a WEBM, MP3, WAV, or M4A audio file.');
                    return;
                  }
                  addFiles(event);
                } })}
              />
              {(activeStepIssues.files || errors.files?.message) && (
                <p className="text-sm font-medium text-red-600" role="alert">{activeStepIssues.files || errors.files?.message}</p>
              )}
              <div className="grid gap-3">
                {fileList.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                    {file.type.startsWith('audio/') ? <FileAudio2 size={19} className="text-[#c94b32]" /> : <FileText size={19} className="text-[#c94b32]" />}
                    <p className="min-w-0 flex-1 truncate text-sm font-bold">{file.name}</p>
                    <button type="button" onClick={() => removeFile(index)} aria-label={`Remove ${file.name}`} className="rounded p-1">
                      <X size={17} className="text-slate-400" />
                    </button>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {step === 4 && (
            <Section title="About you" note="Share your name and a way to contact you, or choose to report anonymously.">
              <label className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <span>
                  <span className="block font-bold text-amber-950">Report Anonymously</span>
                  <span className="mt-1 block text-xs text-amber-800">Your name and contact details will not be attached to this report.</span>
                </span>
                <input type="checkbox" {...register('anonymous')} className="h-5 w-5 accent-[#c94b32]" />
              </label>
              {!values.anonymous && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id="reporterName" label="Your name" register={register} error={activeStepIssues.reporterName || errors.reporterName?.message} placeholder="Full name" />
                  <fieldset className="grid gap-5 sm:col-span-2 sm:grid-cols-2">
                    <legend className="mb-1 text-sm font-semibold text-slate-700">Contact phone or email <span className="text-[#c94b32]">*</span></legend>
                    <Field id="reporterEmail" label="Email address" optional type="email" register={register} error={values.reporterEmail.trim() ? activeStepIssues.reporterEmail || errors.reporterEmail?.message : undefined} placeholder="you@example.org" />
                    <Field id="reporterPhone" label="Phone number" optional register={register} error={values.reporterPhone.trim() ? activeStepIssues.reporterPhone || errors.reporterPhone?.message : undefined} placeholder="Your phone number" />
                    {!values.reporterEmail.trim() && !values.reporterPhone.trim() && activeStepIssues.reporterPhone && (
                      <p className="text-xs font-medium text-red-600 sm:col-span-2" role="alert">{activeStepIssues.reporterPhone}</p>
                    )}
                  </fieldset>
                </div>
              )}
            </Section>
          )}

          {step === 5 && (
            <Section title="Review your report" note="Confirm the required details and evidence before submitting.">
              <div className="grid gap-4 text-sm">
                <p><b>Child’s name:</b> {values.childName || 'Not provided (optional)'}</p>
                <p><b>Approximate age and gender:</b> {values.approxAge || 'Not provided'}, {values.gender || 'Not provided'}</p>
                <p><b>Child description:</b> {values.childDescription || 'Not provided'}</p>
                <p><b>Location:</b> {values.locationAddress || 'Not provided'}{values.district && `, ${values.district}`}{values.state && `, ${values.state}`}</p>
                <p><b>Map pin:</b> {position ? `${values.latitude}, ${values.longitude}` : 'Not provided'}</p>
                <p><b>Incident:</b> {values.incidentDescription || 'Not provided'}</p>
                <p><b>Date and urgency:</b> {values.dateOfIncident || 'Not provided'} · {values.urgencyLevel || 'Not provided'}</p>
                <p><b>Evidence:</b> {fileList.length ? fileList.map((file) => file.name).join(', ') : 'None added'}</p>
                <p><b>Reporter:</b> {values.anonymous ? 'Anonymous' : values.reporterName || 'Not provided'}</p>
              </div>
              {(attemptedSubmit || step === steps.length - 1) && missingFields.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
                  <p className="font-bold">Complete these required fields before submitting:</p>
                  <ul className="mt-2 list-inside list-disc">
                    {missingFields.map((field) => <li key={field}>{field}</li>)}
                  </ul>
                </div>
              )}
              {activeStepIssues.files && <p className="text-sm font-medium text-red-600" role="alert">{activeStepIssues.files}</p>}
            </Section>
          )}

          <div className="mt-6 flex justify-between gap-3">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft size={17} /> Back
            </button>
            {step < steps.length - 1 ? (
              <button
                type="button"
                disabled={!stepIsValid}
                onClick={continueToNextStep}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0b4f4b] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next <ArrowRight size={17} />
              </button>
            ) : (
              <button
                type="button"
                disabled={!stepIsValid || isSubmitting}
                onClick={submitIncomplete}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0b4f4b] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Check size={17} /> {isSubmitting ? 'Submitting…' : 'Submit report'}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
