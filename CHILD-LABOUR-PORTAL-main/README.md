# CLRMS workflow implementation

CLRMS remains the existing React/Tailwind and Spring Boot/MySQL application. Schema updates use the configured Hibernate `ddl-auto: update` setting.

## Demo account seeding & Quick Demo Login

- `app.demo-login-enabled`: Controls whether the Quick Demo Login panel on the Login page and its public endpoints (`GET /api/auth/demo-accounts` and `POST /api/auth/demo-login`) are active. Defaults to `false` in base `application.yml`, enabled (`true`) in `application-dev.yml` or via environment variable `APP_DEMO_LOGIN_ENABLED=true`.
  - `GET /api/auth/demo-accounts`: Returns the list of active demo accounts (id, displayName, role, state/organization, email) with no passwords or hashes. Returns 403 when `app.demo-login-enabled=false`.
  - `POST /api/auth/demo-login`: Accepts `{"userId": <id>}` and issues standard JWT session credentials for flagged demo accounts (`is_demo_account = true`). Returns 403 for non-demo users or when disabled. Rate-limited to 20 requests per minute per IP and records an audit log entry with action `DEMO_LOGIN`.
- `app.seed-demo-data`: Demo accounts are inserted only when `app.seed-demo-data=true` and the `users` table is empty. Seeding is disabled by default; explicitly set `app.seed-demo-data=true` (or `SEED_DEMO_DATA=true`) and configure `app.seed-password` before starting the backend. Passwords are stored exclusively as BCrypt hashes, and seeded accounts are marked with `is_demo_account = true`. Real registered users are never flagged as demo accounts.

> **Important Note:** All demo accounts (Admin, Officers, NGO Officials, and Citizen) and organization names listed below are strictly mock sample/demo entities for testing and development purposes. They do not represent real people, official staff members, or verified organizations.

| Role | Demo login |
|---|---|
| ADMIN | `admin@clrms.local` |
| OFFICER (Tamil Nadu) | `arun.kumar@clrms.local` |
| OFFICER (Kerala) | `priya.sharma@clrms.local` |
| OFFICER (Karnataka) | `rahul.verma@clrms.local` |
| OFFICER (Andhra Pradesh) | `ananya.das@clrms.local` |
| OFFICER (Maharashtra) | `amit.patel@clrms.local` |
| NGO_OFFICIAL sample (Uyir Trust) | `meena.lakshmi@clrms.local` |
| NGO_OFFICIAL sample (Child Care Foundation) | `ravi.menon@clrms.local` |
| NGO_OFFICIAL sample (Hope for Children NGO) | `kavitha.reddy@clrms.local` |
| NGO_OFFICIAL sample (Bal Suraksha Foundation) | `sanjay.kumar@clrms.local` |
| NGO_OFFICIAL sample (New Life Rehabilitation Trust) | `divya.nair@clrms.local` |
| CITIZEN | `citizen@clrms.local` |

The current application role name for NGO officials is `NGO_STAFF`.

## Workflow endpoints

- `POST /api/reports` submits a complaint; `GET /api/reports` lists reports for admins and the authenticated officer's assigned reports; `GET /api/reports/{id}` applies role ownership checks.
- `PUT /api/cases/{id}/assign` assigns or reassigns a case to an active officer; the legacy `POST` route remains supported. `PUT /api/cases/{id}/status` validates status transitions; the legacy `POST` route remains supported.
- `GET /api/officers` returns active officer assignment options to administrators. `GET /api/my-cases` and `/api/cases/assigned-to-me` return only the authenticated officer's current assignments. `GET /api/cases/search` and `GET /api/cases/{id}/history` remain role-scoped.
- `POST /api/rehabilitation` is intentionally disabled; new referrals must use the NGO referral workflow below. Existing read/activity/phase endpoints under `/api/rehabilitation/{id}` remain for legacy rehabilitation records.
- `GET /api/admin/dashboard`, `GET /api/officer/dashboard`, and `GET /api/ngo/dashboard` return role-specific summaries. `GET /api/notifications`, `/unread-count`, and existing WebSocket notifications are database-backed.

`case_status_history` records status transitions; `case_assignment_log` records assignment/reassignment officer IDs, actor ID, and timestamp. The existing `notifications` table and WebSocket event pipeline are reused for durable and real-time notifications.

For an existing MySQL database, apply these SQL migrations once and in order: V2 assignment tracking, V3 manual verification/status history, then V4 NGO referrals and rehabilitation stages. They preserve existing case and user rows; do not rerun them. Back up the database and inspect the schema first if the fields/tables already exist. V4 copies existing `users.ngo_organization_id` values into the new `users.ngo_id` column and does not drop the old column. Hibernate `ddl-auto: update` can create missing entity fields in a fresh development database, but it does not backfill NGO membership or replace these ordered migrations on an existing database.

From the `backend` folder in PowerShell, apply the migration with:

```powershell
Get-Content -Raw .\src\main\resources\db\migration\V2__case_assignment_tracking.sql |
  mysql.exe -h $env:DB_HOST -u $env:DB_USERNAME -p clrms_db
Get-Content -Raw .\src\main\resources\db\migration\V3__manual_verification_and_status_history.sql |
  mysql.exe -h $env:DB_HOST -u $env:DB_USERNAME -p clrms_db
Get-Content -Raw .\src\main\resources\db\migration\V4__ngo_referral_and_rehabilitation_workflow.sql |
  mysql.exe -h $env:DB_HOST -u $env:DB_USERNAME -p clrms_db
```

MySQL prompts for the database password. Confirm each command succeeds before running the next one.

The `demo` profile seeds its sample NGO organizations with synthetic capacity (5 total beds and 5 available beds) so the sample referral workflow can be exercised. These values are only for synthetic demo records. For real organizations, V4 deliberately sets `capacity` and `available_beds` to zero rather than inventing real bed counts. After confirming the actual counts with each organization, update them using that organization’s real database ID, total capacity, and current available beds, for example:

```sql
UPDATE ngo_organizations
SET capacity = <verified_total_capacity>, available_beds = <verified_available_beds>
WHERE id = <ngo_organization_id>;
```

Replace all three placeholders with verified values. A referral reserves one bed; rejection or case closure releases it. Referral selection shows only active NGOs with available capacity.

The current referral flow is: officer/admin refers an `INVESTIGATION_COMPLETED` case to an active NGO; the NGO accepts or rejects; accepted cases advance one stage at a time through admission, rehabilitation, reintegration, and closure. Rejection returns the case to the officer and records its reason in status history. Use `GET /api/ngo/cases`, `POST /api/ngo/cases/{id}/accept`, `POST /api/ngo/cases/{id}/reject`, `PUT /api/ngo/cases/{id}/stage`, and `GET /api/ngo/cases/{id}/status-history`. NGO case responses intentionally omit reporter and investigation details. The legacy direct `POST /api/rehabilitation` assignment path is disabled so it cannot bypass NGO acceptance.

In the admin case board, open a `REPORTED` card and choose **Move to Under Review**; then choose an active officer and **Assign**. This follows the required `REPORTED -> UNDER_REVIEW -> ASSIGNED_TO_OFFICER` order. Admins can refer a case from the case panel only after it reaches `INVESTIGATION_COMPLETED`. Officers can make the referral after their required verification steps. NGO referrals are unavailable when the selected real NGO has no verified available beds.

## Run locally in VS Code

Open the `CHILD-LABOUR-PORTAL-main` folder. Use PowerShell terminal 1 for the backend and terminal 2 for the frontend. The backend requires JDK 17 and Maven 3.9 or newer. Check `java -version` and `mvn -version`; if Windows selects an older Java, point `JAVA_HOME` at your JDK 17 installation in terminal 1:

```powershell
$env:JAVA_HOME = "C:\path\to\jdk-17"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
java -version
```

If Maven is not installed, download and extract the official Apache Maven 3.9.9 binary distribution into your user tools folder:

```powershell
$version = "3.9.9"
$installRoot = Join-Path $env:USERPROFILE "tools"
New-Item -ItemType Directory -Force $installRoot | Out-Null
$archive = Join-Path $env:TEMP "apache-maven-$version-bin.zip"
curl.exe -L --fail --show-error "https://archive.apache.org/dist/maven/maven-3/$version/binaries/apache-maven-$version-bin.zip" -o $archive
Expand-Archive -Path $archive -DestinationPath $installRoot -Force
$env:MAVEN_HOME = Join-Path $installRoot "apache-maven-$version"
$env:PATH = "$env:MAVEN_HOME\bin;$env:PATH"
mvn -version
```

MySQL must be installed and running for persistent data. The backend defaults to `clrms_db` on `localhost:3306` and requires `DB_USERNAME`, `DB_PASSWORD`, and a JWT secret of at least 32 bytes.

For a fresh local MySQL database, check/start the installed MySQL Windows service in an Administrator PowerShell (service names differ by installation):

```powershell
Get-Service *mysql*
Start-Service "<service name returned above>"
```

Then create `clrms_db` using a MySQL administrator account (replace `your_admin_user` with the account you configured):

```powershell
mysql.exe -h localhost -u your_admin_user -p -e "CREATE DATABASE IF NOT EXISTS clrms_db CHARACTER SET utf8mb4;"
```

Use your application's MySQL account and password below; it must have the needed access to `clrms_db`. In terminal 1 run:

```powershell
Set-Location .\backend
$env:DB_HOST = "localhost"
$env:DB_USERNAME = "<your MySQL username>"
$env:DB_PASSWORD = "<your MySQL password>"
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$secretBytes = New-Object byte[] 48
$rng.GetBytes($secretBytes)
$env:JWT_SECRET = [Convert]::ToBase64String($secretBytes)
mvn spring-boot:run
```

Replace the DB placeholders with the credentials for your existing MySQL account. Keep this terminal open; its environment variables apply only to this PowerShell process. For an existing schema, back up and apply V2, V3, and V4 above before starting the backend. Do not apply those one-time migrations to a fresh schema that Hibernate has already created. To seed development demo accounts, set `SEED_DEMO_DATA=true`, `SEED_PASSWORD` to a password you choose, and `APP_DEMO_LOGIN_ENABLED=true` before starting; do not enable demo seeding for production. If port 8080 is already in use, set `$env:SERVER_PORT = "18080"` in terminal 1 and set `$env:VITE_API_BASE_URL = "http://localhost:18080"` in terminal 2 before starting Vite.

In terminal 2:

```powershell
Set-Location .\frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. Vite uses the API at `http://localhost:8080` by default; set `VITE_API_BASE_URL` only when the backend is hosted elsewhere. The H2 `demo` profile is an in-memory development option, not persistent MySQL storage; it requires `SPRING_PROFILES_ACTIVE=demo` and a `JWT_SECRET`, and its data is lost when the process exits.

## Manual workflow check

Use the seeded password for all demo accounts. Start the backend and frontend yourself after setting database and seed configuration.

1. As the **DEMO CITIZEN**, submit a report with a required photo, state/district, town/city, and six-digit pincode. Confirm it is stored and an Admin notification appears.
2. As **DEMO ADMIN**, open Case Reports, move the report to `UNDER_REVIEW`, assign an active officer, and confirm the assignment notification and case history. Reassign it to a second officer before investigation starts.
3. As the new assigned **DEMO OFFICER**, confirm the case appears in My Cases and complete the four-item Manual Verification checklist with notes. Then start the investigation. Record an in-person visit with all six checklist answers, visit date, outcome, observations, result, action, follow-up, photo URL, and the exact declaration `I personally visited`; submit it to complete the investigation.
4. From the completed case panel, refer the case to an active NGO with available beds and enter a referral note. Confirm all active officials in that NGO receive a durable notification and the case history records the referral.
5. As a **DEMO NGO_OFFICIAL** in that organization, confirm the referral appears in My rehabilitation cases and accept it. Advance one stage at a time through admission, rehabilitation, reintegration, and closure; enter a progress note for each stage. Confirm the assigned Officer and Admin receive stage notifications.
6. To check rejection, refer another completed case and reject it with a reason. Confirm it returns to `INVESTIGATION_COMPLETED`, the officer is notified to refer it elsewhere, the rejection reason remains in history, and the reserved bed is released.
7. Negative checks: with a different Officer token, `GET /api/reports/{id}` and `GET /api/cases/{id}/history` for the first Officer's case must return **403**. With a different NGO token, `GET /api/ngo/cases/{id}/status-history` for another NGO's case must return **403**. Attempt to skip an NGO stage or change one using an Officer token and confirm **400** or **403**, respectively.

The portal records user-submitted visit information; it does not automatically verify a complaint or claim that a child was rescued.
