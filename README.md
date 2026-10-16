# Magnet Stream Project
Paste a magnet → backend submits it to **your own** Seedr-compatible account → finds the video → returns a stream URL → native iOS player. Only use content and accounts you're authorized to use.

## 1. Repository setup (iPhone-friendly)
Create a GitHub repo, upload this project (GitHub web/app, or "Add file → Upload files"). Everything below can be done from github.com in Safari.

## 2. GitHub Secrets (Settings → Secrets and variables → Actions)
| Secret | Used for |
|---|---|
| `API_BASE_URL` | Production backend URL baked into the IPA, e.g. `https://api.example.com` |
| `APP_API_KEY` | Must equal the backend's `API_SECRET` (an app-to-backend key, **not** a provider credential) |

Provider credentials (`PROVIDER_ACCESS_TOKEN`, `PROVIDER_CLIENT_ID/SECRET`) go **only** in your backend host's secret manager.

## 3. Provider configuration
`backend/src/providers/seedr.js` calls Seedr's OAuth resource endpoint with your access token. I could not verify it against live docs: confirm function names (`add_torrent`, `get_folder`, `fetch_file`) and response shapes for your account, and override the URL with `PROVIDER_API_URL` if needed. To add another provider, implement `provider.interface.js` and register it in `providers/index.js`.

## 4. Backend deployment
- **Docker/VPS:** `cp backend/.env.example backend/.env`, fill in, `docker compose up -d`. Put it behind HTTPS (Caddy/nginx/Cloudflare).
- **Render / Railway / Fly.io:** deploy `backend/` using its Dockerfile; add env vars from `.env.example`; mount a persistent volume at `/app/data` (SQLite).
- The queue is an in-process worker backed by SQLite (stuck jobs requeue on restart). Run one instance; for scale-out swap in BullMQ + Redis.

## 5. API
All `/api/*` except health need header `x-api-key: <API_SECRET>`.
- `POST /api/magnet` `{"magnet":"magnet:?xt=urn:btih:..."}` → `202 {job_id, status:"queued"}`
- `GET /api/status/:jobId` → `{status, progress}`; when `ready`: `title`, `file`, `stream{url,type}`, optional `files[]`, `needs_selection`
- `GET /api/health`
Errors: `{"success":false,"error":{"code","message"}}` with codes INVALID_MAGNET, UNAUTHORIZED, RATE_LIMITED, PROVIDER_AUTH_ERROR, PROVIDER_LIMIT, MAGNET_REJECTED, PROCESSING_FAILED, NO_VIDEO_FOUND, STREAM_UNAVAILABLE, TIMEOUT, NETWORK_ERROR, SERVER_ERROR.

## 6. iOS configuration
`ios/Config/Production.xcconfig` / `Development.xcconfig` set `API_BASE_URL` (`https:/$()/host` is how `//` is written in xcconfig). CI overrides it. The Xcode project is generated from `ios/project.yml` by XcodeGen.

## 7. Build the unsigned IPA
GitHub → **Actions → iOS Unsigned IPA → Run workflow** (set configuration/backend_url/version/build) → open the finished run → **Artifacts → MagnetPlayer-unsigned.ipa** (it downloads as a zip containing the .ipa; Files app can unzip).

## 8. Installing
An unsigned IPA must be signed before install, using a method available to you (e.g. a sideloading tool with your own Apple ID, or an Apple Developer account/TestFlight). Free-account signing expires after 7 days.

## 9. Troubleshooting
- **Tests fail on simulator name:** change `iPhone 16` in `ios-unsigned.yml` to one listed on the runner.
- **App says "not authorized":** `APP_API_KEY` ≠ backend `API_SECRET`.
- **Plays nothing / unsupported format:** AVPlayer can't decode MKV/AVI/WebM. Prefer torrents with MP4, or have the provider expose HLS.
- **`better-sqlite3` build error:** use Node 20+ and build tools (the Dockerfile handles this).
- **Series:** the server prepares the first episode's stream; picking other episodes isn't wired to a per-file stream endpoint yet (extend `GET /api/status` or add `/api/stream/:fileId`).

## 10. Security notes
Provider secrets are server-only; the app key is extractable from the IPA, so treat it as low-trust (rate limited, revocable) and add per-user auth for public use. Logs scrub secrets; stream URLs are HTTPS-only; jobs expire after `JOB_TTL_HOURS`.

