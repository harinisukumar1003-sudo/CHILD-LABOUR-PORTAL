# CLRMS Permissions Matrix

| Capability | CITIZEN | OFFICER | NGO_STAFF | ADMIN |
| --- | --- | --- | --- | --- |
| Submit a report | Yes | No | No | No |
| Track a report with case number and tracking code | Yes | Yes | Yes | Yes |
| View own reports | Own only | No | No | No |
| View or update assigned cases | No | Assigned jurisdiction only | Assigned rehabilitation work | All |
| Add investigation or rehabilitation activity | No | Assigned cases | Assigned rehabilitation cases | All |
| View reporter identity | Own record only | Explicitly authorized case access | No by default | Yes |
| Manage users, analytics, audit logs | No | No | No | Yes |

The backend uses `@PreAuthorize` for coarse role checks and service-level ownership checks for case/jurisdiction access. Public tracking returns sanitized timeline data only.