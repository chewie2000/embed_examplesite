# Project Instructions for AI Agents

This file provides instructions and context for AI coding agents working on this project.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->


## Build & Test

```bash
npm run dev        # Dev server → http://localhost:3000
npm run build      # Production build (run before pushing to verify no build errors)
npm run start      # Serve production build locally
```

No test suite — verify changes manually via the dev server. Always run `npm run build` before declaring work done if you touched any component or API route.

---

## Architecture Overview

```
Browser
  │
  ├── GET /dashboard
  │     └── middleware.js verifies session cookie → renders DashboardShell
  │
  └── GET /api/sigma/jwt?mode=<mode>
        └── Verifies session → lib/sigma-embed.js signs JWT with SIGMA_SECRET
              └── Returns signed embed URL → SigmaEmbed renders iframe
```

**Key files:**

| File | Role |
|---|---|
| `middleware.js` | Protects `/dashboard` — redirects unauthenticated users to `/login` |
| `app/api/auth/login/route.js` | Validates credentials, writes encrypted session cookie |
| `app/api/sigma/jwt/route.js` | Verifies session, calls `sigma-embed.js`, returns signed URL |
| `lib/sigma-embed.js` | Builds JWT payload and signs embed URL (HMAC-SHA256 via `jose`) |
| `lib/session.js` | Session creation and verification (encrypted cookie, 8hr expiry) |
| `components/DashboardShell.js` | Nav + sidebar + embed container — **NAV_ITEMS is the multi-embed config** |
| `components/SigmaEmbed.js` | Fetches JWT and renders `<iframe>` |

**Deploy:** Vercel auto-deploys on every push to `master`. Every push is production.

---

## Conventions & Patterns

### Adding a new embedded workbook

This is the most common task. Three steps only:

1. Add env var in Vercel: `SALES_SIGMA_BASE_URL=https://app.sigmacomputing.com/...`
2. Add a nav item in `components/DashboardShell.js`:
   ```js
   { label: 'Sales', mode: 'sales', icon: (...) }
   ```
3. Push — Vercel picks it up automatically.

The `mode` string (lowercase) maps to `{MODE_UPPERCASE}_SIGMA_BASE_URL`. No other code changes needed.

### Environment variables

- `SIGMA_CLIENT_ID` / `SIGMA_SECRET` — from Sigma Admin → Developer Access → Embedding
- `SIGMA_BASE_URL` — default workbook (no mode prefix)
- `SESSION_SECRET` — 32-byte random base64 string
- `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` — demo login credentials
- Per-workbook: `{MODE}_SIGMA_BASE_URL` (e.g. `SALES_SIGMA_BASE_URL`)

In `.env.local` for local dev; in Vercel dashboard for production.

### Auth

Current demo auth is credential-based via env vars. To upgrade:
- **Clerk** (recommended): swap `lib/session.js` usage in the JWT route with `auth()` from `@clerk/nextjs/server` — `lib/sigma-embed.js` is unchanged
- **NextAuth + Okta/Entra**: same principle — only the session-reading code in the JWT route changes

### Session Security

- SIGMA_SECRET never leaves the server — browser only receives a signed, expiring URL
- Production recommendation: move signing to a dedicated app server; only `lib/sigma-embed.js` changes (replace local `jose` signing with a fetch to the signing service)
