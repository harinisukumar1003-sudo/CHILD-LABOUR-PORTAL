# CLRMS frontend

React 18 single-page application using Vite, React Router 6, Tailwind CSS, React Hook Form, Zod, Recharts, and Framer Motion.

## Run locally

Open a terminal at the `CHILD-LABOUR-PORTAL-main` project root. Install JDK 17 or newer, Apache Maven, Node.js 20 or newer, and MySQL 8 or a compatible MySQL server. Start the MySQL service before the backend; the configured account must be able to create/use `clrms_db`, or create that database beforehand.

### Backend

In the first VS Code terminal:

```powershell
cd backend
$env:DB_HOST = "localhost"
$env:DB_USERNAME = "<your MySQL username>"
$env:DB_PASSWORD = "<your MySQL password>"
$bytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$env:JWT_SECRET = [Convert]::ToBase64String($bytes)
$rng.Dispose()
mvn spring-boot:run
```

Set `DB_USERNAME` and `DB_PASSWORD` to credentials that actually exist in your MySQL installation; the application does not provide a database password fallback. The generated `JWT_SECRET` is for this terminal session. Keep it private and use a managed secret for deployments. Demo data seeding is disabled by default. To seed the configured MySQL database, set `$env:SEED_DEMO_DATA = "true"` and `$env:SEED_PASSWORD` to a strong local password before starting the backend. Seed accounts are created only if the `users` table is empty.

For an isolated local demonstration without MySQL, use the existing H2 demo profile instead. It is in-memory and resets on restart:

```powershell
cd backend
$bytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$env:JWT_SECRET = [Convert]::ToBase64String($bytes)
$rng.Dispose()
mvn spring-boot:run "-Dspring-boot.run.profiles=demo"
```

### Frontend

In a second VS Code terminal:

```powershell
cd frontend
npm ci
$env:VITE_API_BASE_URL = "http://localhost:8080/api"
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

The backend uses stateless bearer JWTs. Set `JWT_SECRET` to at least 32 random bytes before starting the backend; there is no built-in signing-key fallback. Password recovery sends a one-time, 30-minute link using the configured SMTP service.

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

The Quick Demo Login panel loads accounts from the backend. The `demo` profile seeds these example accounts:

| Role | Email |
| --- | --- |
| Citizen | `citizen@clrms.local` |
| Officer | `arun.kumar@clrms.local` |
| NGO Staff | `meena.lakshmi@clrms.local` |
| Admin | `admin@clrms.local` |

The local demo password defaults to `Demo@12345`. Override it with the `DEMO_PASSWORD` environment variable before starting the backend. Accounts are created only when the `users` table is empty.

The demo profile also seeds one synthetic anonymous case for the public **Track a case** page. Use:

| Field | Demo value |
| --- | --- |
| Case number | `CLR-2026-000001` |
| Tracking code | `DEMO2026TRACK001` |

This report is only created with the local demo profile and is reset when its in-memory database restarts.
