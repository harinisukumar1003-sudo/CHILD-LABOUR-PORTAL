# CLRMS workflow implementation

CLRMS remains the existing React/Tailwind and Spring Boot/MySQL application. Schema updates use the configured Hibernate `ddl-auto: update` setting.

## Demo account seeding

Demo accounts are inserted only when `app.seed-demo-data=true` and the `users` table is empty. Set `app.seed-demo-data=true` (or env var `SEED_DEMO_DATA=true`) and `app.seed-password` (default `Demo@12345`) before starting the backend. Passwords are stored exclusively as BCrypt hashes.

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
- `POST /api/cases/{id}/assign` assigns or reassigns a case to an active officer. `POST /api/cases/{id}/status` validates the status transition and accepts visit details for `INVESTIGATION_COMPLETED`.
- `GET /api/cases/search`, `GET /api/cases/assigned-to-me`, and `GET /api/cases/{id}/history` return role-scoped case data.
- `POST /api/rehabilitation` creates an admin-reviewed rehabilitation referral for a selected NGO official. `GET /api/rehabilitation` returns the admin list or the signed-in NGO official's cases. Activity and phase endpoints are under `/api/rehabilitation/{id}`.
- `GET /api/admin/dashboard`, `GET /api/officer/dashboard`, and `GET /api/ngo/dashboard` return role-specific summaries. `GET /api/notifications`, `/unread-count`, and existing WebSocket notifications are database-backed.

`case_status_history` records each report, assignment/reassignment, status update, visit verification, referral, completion, and closure with actor, role, old/new status, details, and timestamp. `case_investigation_logs` keeps the user-facing timeline and stores the structured visit checklist. `audit_logs` now records the actor role as well as the existing audit fields. Existing `notifications`, `case_assignments`, `rehabilitation_cases`, and `rehabilitation_activities` tables are reused.

## Manual workflow check

Use the seeded password for all demo accounts. Start the backend and frontend yourself after setting database and seed configuration.

1. As the **DEMO CITIZEN**, submit a report with a required photo, state/district, town/city, and six-digit pincode. Confirm it is stored and an Admin notification appears.
2. As **DEMO ADMIN**, open Case Reports, move the report to `UNDER_REVIEW`, assign an active officer, and confirm the assignment notification and case history. Reassign it to a second officer before investigation starts.
3. As the new assigned **DEMO OFFICER**, confirm the case appears in My Cases. Record an in-person visit with all six checklist answers, visit date, outcome, observations, result, action, follow-up, photo URL, and the exact declaration `I personally visited`. Move it through `INVESTIGATING` to `INVESTIGATION_COMPLETED`, then recommend `REHABILITATION_REFERRED`.
4. As **DEMO ADMIN**, assign an NGO official to the referral. Confirm the case moves to `NGO_ASSIGNED` and the selected official receives a notification.
5. As the assigned **DEMO NGO_OFFICIAL**, acknowledge by recording an activity, enter follow-ups and notes, and set the phase to `COMPLETED` to submit the completion report. Confirm the Admin receives progress and completion notifications.
6. As **DEMO ADMIN**, review and set `CLOSED`. Confirm the case history has a closure time and the assigned Officer and NGO receive notifications.
7. Negative checks: with a different Officer token, `GET /api/reports/{id}` and `GET /api/cases/{id}/history` for the first Officer's case must return **403**. With a different NGO token, `GET /api/rehabilitation/{id}` for the first NGO's case must return **403**. Attempt an invalid status jump (such as `REPORTED` to `CLOSED`) and confirm **400**.

The portal records user-submitted visit information; it does not automatically verify a complaint or claim that a child was rescued.
