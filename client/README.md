# SiteTrack client

React 19 + TypeScript + Vite, with React Router for navigation. No UI framework is required.

## Local development

From the repository root, run the backend in one terminal:

```sh
cd server
npm run dev
```

In another terminal:

```sh
cd client
npm install
npm run dev
```

Open **http://localhost:5173/login**. The backend must be listening on port 5000.
Vite proxies `/api` to `http://localhost:5000`; no client environment file is needed.
Vite environment-file loading is explicitly disabled. Port 5173 is fixed so a busy port produces a clear error rather than silently changing the browser address.

## Authentication

- `/login` submits email and password to `/api/auth/login`.
- `/register` submits companyName, companyEmail, firstName, lastName, email, and password to `/api/auth/register`.
- The service validates the response and retains only the token and explicit safe user fields.
- AuthContext keeps the session in memory, never browser storage. Refreshing or closing the page requires signing in again. Logout clears the session.
- `/dashboard` redirects to login without a session. This is a UI guard; the backend remains authoritative for access to protected data. JWT contents are never decoded for authorization.
- The dashboard contains only account information, the existing API health check, and clearly labeled future-feature placeholders.
- `apiRequest` supports a Bearer token for future protected calls. There are no protected business-data requests in this foundation.

Shared components live in `src/components`, pages in `src/pages`, routing in `src/routing`, session state in `src/auth`, and request logic in `src/services`.

## Verification

```sh
npm run build
npm run lint
npx playwright install chromium
npm test
```

Playwright starts its own local Vite server on port 5173, so stop any frontend development server before running the tests. Tests intercept every API request; they do not use a live backend, Atlas, real credentials, or environment files. Browser installation downloads Chromium once.

Manual checks: register an owner, sign out, sign in, try an incorrect password and duplicate registration, open `/dashboard` while signed out, and check the forms on a narrow screen. A page refresh intentionally clears the current memory-only session.

For future hosting, serve the built `dist` directory with SPA route fallback and route `/api` to the backend; the development proxy is not bundled into the production app.
