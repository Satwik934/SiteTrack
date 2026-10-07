# SiteTrack
Construction Project, Cost & Field Operations Platform

## Company and employee management

The authenticated app includes `/company` (read-only company details for all roles) and `/employees` (owner/manager employee administration). Employees can be created, have their names and permitted roles edited, and be deactivated/reactivated with confirmation. Accounts are never permanently deleted here.

| Role | Permissions |
| --- | --- |
| Owner | View own company and directory; create managers/workers; edit names; switch manager/worker roles; activate/deactivate non-owner accounts. |
| Manager | View own company and directory; create workers; edit worker names and active status. Cannot change roles or modify owners/managers. |
| Worker | View own company; no employee administration or directory access. |

Owners' names may be edited by owners, but owner roles and active status are immutable through employee endpoints, including the caller's own account. Although the schema can contain multiple owners, these endpoints cannot create/promote an owner or remove any active owner. This deliberately defers ownership transfer and avoids concurrent requests leaving a company without an active owner.

### API

All endpoints require the existing Bearer authentication middleware. Company identity comes exclusively from the authenticated user; body company IDs and other unapproved mutation fields are rejected.

- `GET /api/company` → `{ company }` (safe name/email/phone/address).
- `GET /api/employees` → `{ employees }`, sorted by first name, last name, then ID.
- `POST /api/employees` → `201 { message, employee }`; accepts exactly firstName, lastName, email, password, role. Only manager/worker roles are valid.
- `PATCH /api/employees/:employeeId` → `{ message, employee }`; accepts firstName, lastName, role, isActive. Managers cannot send role updates.

Employee queries and writes include the authenticated company. Cross-company and missing employees both return 404. Atomic update predicates also include the observed target role, preventing a pending manager edit from modifying a concurrently promoted employee. Concurrent role changes return 409 for refresh/retry. Safe responses omit passwords, hashes, and internal Mongoose fields. Email uniqueness remains global, consistent with login, with generic 409 conflicts that expose no company information.

Initial passwords use the existing bcrypt save hook, minimum 8 characters and maximum 72 UTF-8 bytes. Share them privately with the employee; no invitation email or forced first-login password change is implemented yet. Email edits, password reset/change, company editing, ownership transfer, pagination, deletion, and project worker assignment are deferred.

### Local development

From the repository root, use separate terminals:

```sh
cd server
npm run dev
```

```sh
cd client
npm run dev
```

Open http://localhost:5173/login. The Vite proxy expects the API on localhost:5000. Frontend authentication remains memory-only: refresh requires signing in again. Backend role checks are authoritative even when the frontend's displayed role is stale.

### Verification

```sh
cd server
npm run build
node --test tests/*.test.cjs
```

```sh
cd client
npm run build
npm run lint
npm test
```

Backend tests use mocked persistence/JWT verification, including real bcrypt pre-save hashing for employee creation. Playwright intercepts API calls and starts a local Vite server; stop any existing frontend server on port 5173 before testing. Tests do not load environment files or access Atlas. Chromium must already be installed (`npx playwright install chromium` if needed).

Manual development-database verification remains useful: create manager/worker accounts, sign in as each, check role restrictions and company isolation with separate companies, deactivate a worker and verify login/access denial, then reactivate. Automated coverage does not substitute for a live database integration test.
