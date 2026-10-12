# CLRMS frontend

React 18 single-page application using Vite, React Router 6, Tailwind CSS, React Hook Form, Zod, Recharts, and Framer Motion.

## Run locally

```powershell
cd frontend
npm install
$env:VITE_API_URL = "http://localhost:8080/api"
npm run dev
```

Build and lint with `npm run build` and `npm run lint`.

## Main routes

- Public: `/`, `/about`, `/contact`, `/report`, `/track-case`, `/privacy-policy`, `/login`, `/register`, `/forgot-password`, `/reset-password/:token`
- Citizen: `/citizen/dashboard`, `/citizen/my-reports`, `/citizen/reports/:id`
- Officer/NGO: `/officer/dashboard`, `/ngo/dashboard`, `/cases`, `/cases/:id`, `/rehabilitation`, `/rehabilitation/:id`, `/rehabilitation-centers`, `/notifications`
- Admin: `/admin/dashboard`, `/admin/users`, `/admin/audit-log`, `/admin/reports-export`

Legacy public URLs `/report-case` and `/privacy-data-handling`, and `/my-reports`, remain aliases for existing links.

## Backend authentication configuration

The backend uses stateless bearer JWTs. Set `JWT_SECRET` to at least 32 random bytes before starting the backend; there is deliberately no built-in signing-key fallback. Password recovery sends a one-time, 30-minute link using the configured SMTP service.

Configure `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SMTP_AUTH`, `MAIL_SMTP_STARTTLS`, and `MAIL_FROM` for the deployment. Local defaults target `localhost:1025`; run an SMTP sink there to test password recovery. Set `FRONTEND_URL` to the public frontend origin so reset links resolve correctly.

Citizen accounts are activated at registration. Officer and NGO Staff registrations remain pending until an administrator approves them. Administrator accounts must be provisioned by an authorized operator; public registration cannot assign the administrator role.

### Optional local demo accounts

For local demonstrations only, start the backend with the `demo` Spring profile. This profile uses a temporary in-memory H2 database and creates active Citizen, Officer, NGO Staff, and Admin accounts; it is not enabled by default and must never be enabled in a production deployment. Demo users and data are reset when the backend restarts.

```powershell
cd backend
$bytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$env:JWT_SECRET = [Convert]::ToBase64String($bytes)
$rng.Dispose()
mvn spring-boot:run "-Dspring-boot.run.profiles=demo"
```

The login page's local demo buttons fill these credentials:

| Role | Email |
| --- | --- |
| Citizen | `demo.citizen@clrms.example` |
| Officer | `demo.officer@clrms.example` |
| NGO Staff | `demo.ngo@clrms.example` |
| Admin | `demo.admin@clrms.example` |

The shared local demo password is `Demo@12345`. Override it with the `DEMO_PASSWORD` environment variable before starting the backend. Seeded accounts are only created when their email does not already exist.
