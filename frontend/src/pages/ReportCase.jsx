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
import { defaultStatesDistricts, loadIndiaStatesDistricts } from '../utils/indiaLocations';
import { IndiaDistrictSelect, IndiaStateSelect } from '../components/IndiaLocationSelect';

const steps = ['Child details', 'Location', 'Incident', 'Evidence', 'Reporter', 'Review'];
const initial = {
  childName: '',
  approxAge: '',
  gender: '',
  childDescription: '',
  locationAddress: '',
  townOrCity: '',
  latitude: '',
  longitude: '',
  pincode: '',
  landmark: '',
  district: '',
  state: '',
  incidentDescription: '',
  dateOfIncident: '',
  urgencyLevel: '',
  anonymous: false,
  reporterName: '',
  reporterEmail: '',
  reporterPhone: '',
  files: [],
};
const audioFilePrefix = 'voice-statement-recording.';
const fileExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'mp4', 'pdf', 'webm', 'mp3', 'wav', 'm4a', 'ogg']);
const photoMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const evidenceMimeTypes = {
  jpg: new Set(['image/jpeg']),
  jpeg: new Set(['image/jpeg']),
  png: new Set(['image/png']),
  webp: new Set(['image/webp']),
  mp4: new Set(['video/mp4']),
  pdf: new Set(['application/pdf']),
  webm: new Set(['audio/webm']),
  mp3: new Set(['audio/mpeg', 'audio/mp3']),
  wav: new Set(['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave']),
  m4a: new Set(['audio/mp4', 'audio/x-m4a', 'audio/m4a']),
  ogg: new Set(['audio/ogg', 'application/ogg']),
};

function isPhoto(file) {
  return photoMimeTypes.has(file.type.toLowerCase().split(';', 2)[0].trim());
}

function normalizedMimeType(file) {
  return file.type.toLowerCase().split(';', 2)[0].trim();
}

function PhotoPreview({ file, onRemove }) {
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <img src={previewUrl} alt={`Photo evidence: ${file.name}`} className="aspect-video w-full object-cover" />
      <div className="flex items-center gap-2 p-3">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{file.name}</p>
        <button type="button" onClick={onRemove} aria-label={`Remove photo ${file.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700">
          <X size={17} />
        </button>
      </div>
    </div>
  );
}

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
  locationAddress: z.string().trim().min(1, 'Enter the street address or location address.'),
  townOrCity: z.string().trim()
    .min(2, 'Enter the town or city name using at least 2 characters.')
    .max(120, 'The town or city name cannot exceed 120 characters.')
    .regex(/^(?=.*\p{L})[\p{L} .-]+$/u, 'Use letters, spaces, dots, and hyphens only.'),
  latitude: z.string(),
  longitude: z.string(),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Pincode must be 6 digits and cannot start with 0.'),
  landmark: z.string().max(150, 'The landmark cannot exceed 150 characters.'),
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
    .refine((files) => files.some(isPhoto), 'At least one photo is required as evidence'),
};
const reporterSchema = z.object(reporterFields).superRefine(validateReporter);
const reportShape = {
  ...childFields,
  ...locationFields,
  ...incidentFields,
  ...evidenceFields,
  ...reporterFields,
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
  ['locationAddress', 'townOrCity', 'district', 'state', 'pincode', 'landmark'],
  ['incidentDescription', 'dateOfIncident', 'urgencyLevel'],
  ['files'],
  ['anonymous', 'reporterName', 'reporterEmail', 'reporterPhone'],
  Object.keys(reportShape),
];
const fieldLabels = {
  childName: 'Child name',
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
  townOrCity: 'Town or city',
  pincode: 'Pincode',
  landmark: 'Landmark',
  reporterName: 'Reporter name',
  reporterEmail: 'Reporter email',
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
  maxLength,
  inputMode,
  pattern,
  rows,
  options,
  searchable = false,
  disabled = false,
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
    maxLength,
    inputMode,
    pattern,
    disabled,
    className: `mt-2 w-full rounded-xl border ${error ? 'border-red-400' : 'border-slate-200'} bg-white px-3.5 py-3 font-normal outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-50`,
  };
  const handleChange = (event) => {
    registration.onChange(event);
    onChange?.(event);
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
        {label}
        {optional
          ? <span className="font-normal text-slate-500"> (optional)</span>
          : <span className="text-[#c94b32]"> *</span>}
        {searchable
          ? (
            <>
              <input {...commonProps} type="search" onChange={handleChange} />
              <datalist id={listId}>
                {options.map((option) => <option key={option} value={option} />)}
              </datalist>
            </>
          )
          : options
          ? (
            <select
              {...commonProps}
              onChange={handleChange}
            >
              <option value="">Choose {label.toLowerCase()}</option>
              {options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          )
          : rows
          ? <textarea {...commonProps} rows={rows} onChange={handleChange} />
          : <input {...commonProps} type={type} onChange={handleChange} />}
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
          <h3 className="font-bold text-[#0b4f4b]">Voice statement (optional)</h3>
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
            <input {...registerAudioInput} type="file" accept=".webm,.mp3,.wav,.m4a,.ogg,audio/webm,audio/mpeg,audio/wav,audio/mp4,audio/ogg" className="sr-only" />
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
      await api.post(`/reports/${report.id}/evidence/audio${tracking}`, data);
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
        accept=".webm,.mp3,.wav,.m4a,.ogg,audio/webm,audio/mpeg,audio/wav,audio/mp4,audio/ogg"
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
  const [locations, setLocations] = useState(() => defaultStatesDistricts);
  const [submitted, setSubmitted] = useState(null);
  const [latestIncidentDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return localDateString(date);
  });
  const [submitError, setSubmitError] = useState('');
  const [apiFieldErrors, setApiFieldErrors] = useState({});
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
  useEffect(() => {
    let active = true;
    loadIndiaStatesDistricts().then((data) => {
      if (active && data && typeof data === 'object') setLocations(data);
    });
    return () => { active = false; };
  }, []);
  const values = useWatch({ control });
  const stateOptions = useMemo(() => Object.keys(locations).sort((a, b) => a.localeCompare(b)), [locations]);
  const districtOptions = useMemo(() => {
    const list = locations[values.state];
    return Array.isArray(list) ? [...list].sort((a, b) => a.localeCompare(b)) : [];
  }, [locations, values.state]);
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
  if (step === 1 && values.state && !stateOptions.includes(values.state)) {
    activeStepIssues.state = 'Choose a state or union territory from the list.';
  }
  if (step === 1 && values.district && !districtOptions.includes(values.district)) {
    activeStepIssues.district = 'Choose a district in the selected state.';
  }
  const locationSelectionValid = step !== 1 || (
    stateOptions.includes(values.state) && districtOptions.includes(values.district)
  );
  const stepIsValid = activeStepResult.success && locationSelectionValid;
  const fileList = Array.isArray(values.files) ? values.files : [];
  const photoFiles = fileList.filter(isPhoto);
  const extraFiles = fileList.filter((file) => !isPhoto(file));
  const voiceRecordingAttached = fileList.some((file) => file.name.startsWith(audioFilePrefix));

  const setPosition = ([latitude, longitude]) => {
    setValue('latitude', latitude.toFixed(6), { shouldDirty: true, shouldValidate: true });
    setValue('longitude', longitude.toFixed(6), { shouldDirty: true, shouldValidate: true });
    setApiFieldErrors((current) => Object.fromEntries(
      Object.entries(current).filter(([field]) => field !== 'latitude' && field !== 'longitude'),
    ));
    setSubmitError('');
  };

  const updateFiles = (newFiles) => {
    setValue('files', newFiles, { shouldDirty: true, shouldValidate: true });
    setApiFieldErrors((current) => Object.fromEntries(
      Object.entries(current).filter(([field]) => field !== 'files'),
    ));
    setSubmitError('');
  };

  const addFiles = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selectedFiles.length) return;
    const invalidFile = selectedFiles.find((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const maxBytes = ['webm', 'mp3', 'wav', 'm4a', 'ogg'].includes(extension) ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
      return !fileExtensions.has(extension)
        || !evidenceMimeTypes[extension]?.has(normalizedMimeType(file))
        || file.size > maxBytes;
    });
    if (invalidFile) {
      setSubmitError(`"${invalidFile.name}" is not a supported evidence file or exceeds its file size limit.`);
      return;
    }
    updateFiles([...fileList, ...selectedFiles]);
  };

  const addPhotos = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selectedFiles.length) return;
    const invalidPhoto = selectedFiles.find((file) => !isPhoto(file) || file.size > 10 * 1024 * 1024);
    if (invalidPhoto) {
      setSubmitError(`"${invalidPhoto.name}" must be a JPEG, PNG, or WEBP photo no larger than 10MB.`);
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
    if (isValid && (step !== 1 || locationSelectionValid) && step < steps.length - 1) {
      setStep((current) => current + 1);
      setSubmitError('');
      setAttemptedSubmit(false);
    }
  };

  const submit = async (formValues) => {
    setSubmitError('');
    setApiFieldErrors({});
    setAttemptedSubmit(false);
    try {
      const data = new FormData();
      const report = {
        reporterName: formValues.anonymous ? null : formValues.reporterName.trim(),
        reporterEmail: formValues.anonymous ? null : formValues.reporterEmail.trim(),
        reporterPhone: formValues.anonymous ? null : formValues.reporterPhone.trim(),
        childName: formValues.childName.trim() || null,
        approxAge: Number(formValues.approxAge),
        gender: formValues.gender,
        childDescription: formValues.childDescription.trim(),
        locationAddress: formValues.locationAddress.trim(),
        townOrCity: formValues.townOrCity.trim(),
        latitude: formValues.latitude ? Number(formValues.latitude) : null,
        longitude: formValues.longitude ? Number(formValues.longitude) : null,
        pincode: formValues.pincode.trim(),
        landmark: formValues.landmark.trim() || null,
        district: formValues.district.trim(),
        state: formValues.state,
        incidentDescription: formValues.incidentDescription.trim(),
        dateOfIncident: formValues.dateOfIncident,
        anonymous: Boolean(formValues.anonymous),
        urgencyLevel: formValues.urgencyLevel,
      };
      data.append('report', new Blob([JSON.stringify(report)], { type: 'application/json' }));
      formValues.files.forEach((file) => data.append('files', file));
      const response = await api.post('/reports', data);
      setSubmitted(response.data.data);
    } catch (requestError) {
      const responseBody = requestError.response?.data;
      const backendFieldErrors = responseBody?.fieldErrors && typeof responseBody.fieldErrors === 'object'
        ? Object.fromEntries(Object.entries(responseBody.fieldErrors).map(([field, message]) => [field, String(message)]))
        : {};
      setApiFieldErrors(backendFieldErrors);
      setSubmitError(responseBody?.message || requestError.message || 'We could not submit the report. Please try again.');
      const firstInvalidStep = stepFields.findIndex((fields) => fields.some((field) => backendFieldErrors[field]));
      if (firstInvalidStep >= 0) setStep(firstInvalidStep);
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
          <p className="mt-2 text-slate-600">Thank you for helping protect a child. Share what you know, at your own pace.</p>
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

        <form
          ref={formElement}
          noValidate
          onSubmit={handleFormSubmit}
          onChange={(event) => {
            const field = event.target.name;
            if (field && apiFieldErrors[field]) {
              setApiFieldErrors((current) => Object.fromEntries(
                Object.entries(current).filter(([name]) => name !== field),
              ));
              setSubmitError('');
            }
          }}
        >
          {(submitError || Object.keys(apiFieldErrors).length > 0) && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
              {submitError && <p>{submitError}</p>}
              {Object.entries(apiFieldErrors).map(([field, message]) => (
                <p key={field} className="mt-1"><span className="font-semibold">{fieldLabels[field] || field}:</span> {message}</p>
              ))}
            </div>
          )}

          {step === 0 && (
            <Section title="Tell us about the child" note="A detailed description helps identify and protect the child.">
              <Field id="childName" label="Child’s real name" optional register={register} error={apiFieldErrors.childName || errors.childName?.message} placeholder="Leave blank if unknown" />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="approxAge" label="Approximate age" type="number" min="0" max="18" register={register} error={apiFieldErrors.approxAge || activeStepIssues.approxAge || errors.approxAge?.message} placeholder="Age 0–18" />
                <Field
                  id="gender"
                  label="Gender"
                  register={register}
                  error={apiFieldErrors.gender || activeStepIssues.gender || errors.gender?.message}
                  options={['Girl', 'Boy', 'Non-binary', 'Not known']}
                />
              </div>
              <Field id="childDescription" label="Child description" rows="4" register={register} error={apiFieldErrors.childDescription || activeStepIssues.childDescription || errors.childDescription?.message} placeholder="Describe the child’s appearance, clothing, or other identifying details (at least 20 characters)." />
            </Section>
          )}

          {step === 1 && (
            <Section title="Where did this happen?" note="Provide the exact location. A map pin is optional.">
              <IndiaStateSelect
                id="state"
                label="State"
                value={values.state}
                locations={locations}
                error={apiFieldErrors.state || activeStepIssues.state || errors.state?.message}
                onChange={(newState) => {
                  setValue('state', newState, { shouldDirty: true, shouldValidate: true });
                  setValue('district', '', { shouldDirty: true, shouldValidate: true });
                  setApiFieldErrors((current) => Object.fromEntries(
                    Object.entries(current).filter(([field]) => field !== 'state' && field !== 'district'),
                  ));
                  trigger(['state', 'district']);
                }}
              />
              <IndiaDistrictSelect
                id="district"
                label="District"
                value={values.district}
                districts={districtOptions}
                state={values.state}
                disabled={!stateOptions.includes(values.state)}
                error={apiFieldErrors.district || activeStepIssues.district || errors.district?.message}
                onChange={(newDistrict) => {
                  setValue('district', newDistrict, { shouldDirty: true, shouldValidate: true });
                  setApiFieldErrors((current) => Object.fromEntries(
                    Object.entries(current).filter(([field]) => field !== 'district'),
                  ));
                  trigger('district');
                }}
              />
              <input type="hidden" {...register('state')} />
              <input type="hidden" {...register('district')} />
              <Field id="townOrCity" label="Exact town or city name" register={register} error={apiFieldErrors.townOrCity || activeStepIssues.townOrCity || errors.townOrCity?.message} placeholder="Town or city" maxLength={120} />
              <Field id="locationAddress" label="Street address" register={register} error={apiFieldErrors.locationAddress || activeStepIssues.locationAddress || errors.locationAddress?.message} placeholder="Street, building, or specific location" />
              <Field id="landmark" label="Landmark" optional register={register} error={apiFieldErrors.landmark || activeStepIssues.landmark || errors.landmark?.message} placeholder="Nearby landmark (up to 150 characters)" maxLength={150} />
              <Field
                id="pincode"
                label="Pincode"
                type="text"
                register={register}
                error={apiFieldErrors.pincode || activeStepIssues.pincode || errors.pincode?.message}
                placeholder="6-digit pincode"
                maxLength={6}
                inputMode="numeric"
                pattern="[1-9][0-9]{5}"
                onChange={(event) => setValue('pincode', event.target.value.replace(/\D/g, '').slice(0, 6), { shouldDirty: true, shouldValidate: true })}
              />
              <div>
                <div className="h-72 overflow-hidden rounded-xl border border-slate-200">
                  <MapContainer center={position || [20.5937, 78.9629]} zoom={position ? 14 : 5} scrollWheelZoom className="h-full w-full">
                    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapPicker position={position} setPosition={setPosition} />
                  </MapContainer>
                </div>
                <p className="mt-2 text-xs text-slate-500"><span className="font-semibold">Map pin (optional):</span> click the map to add coordinates. {position ? `Coordinates: ${values.latitude}, ${values.longitude}` : 'No pin selected.'}</p>
              </div>
            </Section>
          )}

          {step === 2 && (
            <Section title="What happened?" note="Tell us what you observed. The date must be before today.">
              <Field id="incidentDescription" label="Incident description" rows="5" register={register} error={apiFieldErrors.incidentDescription || activeStepIssues.incidentDescription || errors.incidentDescription?.message} placeholder="Describe what happened, where, and when (at least 30 characters)." />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="dateOfIncident" label="Date of incident" type="date" max={latestIncidentDate} register={register} error={apiFieldErrors.dateOfIncident || activeStepIssues.dateOfIncident || errors.dateOfIncident?.message} />
                <div>
                  <label htmlFor="urgencyLevel" className="block text-sm font-semibold text-slate-700">
                    Urgency level <span className="text-[#c94b32]"> *</span>
                  </label>
                  <select
                    id="urgencyLevel"
                    {...register('urgencyLevel')}
                    aria-invalid={Boolean(apiFieldErrors.urgencyLevel || activeStepIssues.urgencyLevel || errors.urgencyLevel)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 outline-none"
                  >
                    <option value="">Select urgency</option>
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                  {(apiFieldErrors.urgencyLevel || activeStepIssues.urgencyLevel || errors.urgencyLevel?.message) && <p className="mt-1 text-xs font-medium text-red-600" role="alert">{apiFieldErrors.urgencyLevel || activeStepIssues.urgencyLevel || errors.urgencyLevel?.message}</p>}
                </div>
              </div>
            </Section>
          )}

          {step === 3 && (
            <Section title="Photo evidence (required)" note="Attach at least one JPEG, PNG, or WEBP photo. You can select multiple photos; each photo can be up to 10MB.">
              <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/40 p-6 text-center">
                <UploadCloud className="text-[#0b4f4b]" size={30} />
                <span className="mt-3 font-bold text-[#0b4f4b]">Choose photo evidence</span>
                <span className="mt-1 text-xs text-slate-500">JPEG, PNG, or WEBP · up to 10MB each · camera capture supported on mobile</span>
                <input type="file" multiple accept="image/*" capture="environment" onChange={addPhotos} className="sr-only" />
              </label>
              {(apiFieldErrors.files || activeStepIssues.files || errors.files?.message) && (
                <p className="text-sm font-medium text-red-600" role="alert">{apiFieldErrors.files || activeStepIssues.files || errors.files?.message}</p>
              )}
              {photoFiles.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Photo evidence previews">
                  {photoFiles.map((file) => {
                    const fileIndex = fileList.indexOf(file);
                    return <PhotoPreview key={`${file.name}-${fileIndex}`} file={file} onRemove={() => removeFile(fileIndex)} />;
                  })}
                </div>
              )}
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800">Video and documents (optional)</h3>
                <p className="mt-1 text-xs text-slate-500">MP4 video or PDF documents, up to 10MB each.</p>
                <input type="file" multiple accept="video/mp4,application/pdf" onChange={addFiles} className="mt-3 block w-full text-sm" />
              </div>
              <AudioRecorder
                onAttach={attachRecording}
                onRemove={removeVoiceRecording}
                attached={voiceRecordingAttached}
                registerAudioInput={register('audioFallback', { onChange: (event) => {
                  const file = event.target.files?.[0];
                  const extension = file?.name.split('.').pop()?.toLowerCase();
                  if (file && (!['webm', 'mp3', 'wav', 'm4a', 'ogg'].includes(extension)
                    || !evidenceMimeTypes[extension]?.has(normalizedMimeType(file)))) {
                    event.target.value = '';
                    setSubmitError('Choose a supported WEBM, MP3, WAV, M4A, or OGG audio file with a matching audio MIME type.');
                    return;
                  }
                  addFiles(event);
                } })}
              />
              {extraFiles.length > 0 && (
                <div className="grid gap-3" aria-label="Optional supporting evidence">
                  {extraFiles.map((file) => {
                    const index = fileList.indexOf(file);
                    return (
                  <div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                    {file.type.startsWith('audio/') ? <FileAudio2 size={19} className="text-[#c94b32]" /> : <FileText size={19} className="text-[#c94b32]" />}
                    <p className="min-w-0 flex-1 truncate text-sm font-bold">{file.name}</p>
                    <button type="button" onClick={() => removeFile(index)} aria-label={`Remove ${file.name}`} className="rounded p-1">
                      <X size={17} className="text-slate-400" />
                    </button>
                  </div>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-slate-500">{photoFiles.length} photo{photoFiles.length === 1 ? '' : 's'} attached{voiceRecordingAttached ? ' · voice statement attached' : ''}.</p>
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
                  <Field id="reporterName" label="Your name" register={register} error={apiFieldErrors.reporterName || activeStepIssues.reporterName || errors.reporterName?.message} placeholder="Full name" />
                  <fieldset className="grid gap-5 sm:col-span-2 sm:grid-cols-2">
                    <legend className="mb-1 text-sm font-semibold text-slate-700">Contact phone or email <span className="text-[#c94b32]">*</span></legend>
                    <Field id="reporterEmail" label="Email address" optional type="email" register={register} error={apiFieldErrors.reporterEmail || (values.reporterEmail.trim() ? activeStepIssues.reporterEmail || errors.reporterEmail?.message : undefined)} placeholder="you@example.org" />
                    <Field id="reporterPhone" label="Phone number" optional register={register} error={apiFieldErrors.reporterPhone || (values.reporterPhone.trim() ? activeStepIssues.reporterPhone || errors.reporterPhone?.message : undefined)} placeholder="Your phone number" />
                    {!values.reporterEmail.trim() && !values.reporterPhone.trim() && (apiFieldErrors.reporterEmail || apiFieldErrors.reporterPhone || activeStepIssues.reporterPhone) && (
                      <p className="text-xs font-medium text-red-600 sm:col-span-2" role="alert">{apiFieldErrors.reporterEmail || apiFieldErrors.reporterPhone || activeStepIssues.reporterPhone}</p>
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
                <p><b>State:</b> {values.state || 'Not provided'}</p>
                <p><b>District:</b> {values.district || 'Not provided'}</p>
                <p><b>Town / city:</b> {values.townOrCity || 'Not provided'}</p>
                {values.landmark.trim() && <p><b>Landmark:</b> {values.landmark}</p>}
                <p><b>Pincode:</b> {values.pincode || 'Not provided'}</p>
                <p><b>Street address:</b> {values.locationAddress || 'Not provided'}</p>
                <p><b>Map pin:</b> {position ? `${values.latitude}, ${values.longitude}` : 'Not provided'}</p>
                <p><b>Incident:</b> {values.incidentDescription || 'Not provided'}</p>
                <p><b>Date and urgency:</b> {values.dateOfIncident || 'Not provided'} · {values.urgencyLevel || 'Not provided'}</p>
                <p><b>Photo evidence:</b> {photoFiles.length ? photoFiles.map((file) => file.name).join(', ') : 'Required — no photo attached'}</p>
                <p><b>Optional extras:</b> {extraFiles.length ? extraFiles.map((file) => file.name).join(', ') : 'None added'}</p>
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
              {(apiFieldErrors.files || activeStepIssues.files) && <p className="text-sm font-medium text-red-600" role="alert">{apiFieldErrors.files || activeStepIssues.files}</p>}
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
