## Frontend API URL Sanitization

- Base URL is resolved via `getApiBaseUrl()` (`frontend/lib/config.ts`) and stripped of trailing slashes before use.
- Requests should concatenate with paths that start with a single leading `/` (e.g., `/api/auth/me`) to avoid `//`.
- If you see `//api/...` in Network or backend logs, the frontend bundle is stale. Redeploy from the latest `main` and hard-refresh (or use incognito) to load the new bundle.


