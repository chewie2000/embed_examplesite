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

Each demo "use case" is a real route under `/dashboard`, not client-state in one component (that was `components/DashboardShell.js`, removed in the 2026-09-21 routing restructure — see `embed_examplesite-0so` epic). A shared layout provides the persistent chrome; pages provide only their content.

```
Browser
  │
  ├── /dashboard/layout.js
  │     └── Clerk auth check → DashboardProvider (lib/dashboard-context.js)
  │           → DashboardChrome (top nav + JWT inspector ONLY — no sidebar)
  │
  ├── GET /dashboard                      → the use-case gallery: cards from lib/use-cases.js
  │
  ├── /dashboard/legacy/layout.js         → adds LegacySidebar (example switcher + Content Browser)
  │     │                                    — that panel belongs to THIS use case, not all routes
  │     ├── GET /dashboard/legacy          → redirects to the first example
  │     ├── GET /dashboard/legacy/[slug]   → LEGACY_EXAMPLES entry (lib/legacy-examples.js) rendered
  │     │                                    via components/LegacyExampleView.js
  │     └── GET /dashboard/legacy/browse/[urlId]
  │                                        → workbook opened from the Content Browser tree;
  │                                          name/bookmark/auto/parent travel as query params so this
  │                                          route is itself bookmarkable/shareable
  │
  └── GET /api/sigma/jwt?mode=<mode>
        └── Verifies session → lib/sigma-embed.js signs JWT with SIGMA_SECRET
              └── Returns signed embed URL → SigmaEmbed renders iframe
```

Each route composes its own body row via `components/UseCaseMain.js` (utility bar + scroll area), so a use case can bring its own sidebar/controls without every other route inheriting them.

Pages register their active embed's JWT and page title with the shared chrome via `useDashboardChrome()` (from `lib/dashboard-context.js`) — the JWT inspector and top-nav breadcrumb live in the layout, not the page, so this is how a page's content reaches them.

**Key files:**

| File | Role |
|---|---|
| `middleware.js` | Protects `/dashboard(.*)` — redirects unauthenticated users to `/sign-in` |
| `app/dashboard/layout.js` | Clerk auth check, wraps every `/dashboard/*` route in `DashboardProvider` + `DashboardChrome` |
| `lib/dashboard-context.js` | Cross-route shared state: JWTs (for the inspector), page title, session-length override, Content Browser refresh signal |
| `components/DashboardChrome.js` | Global chrome only — top nav + JWT inspector mount. No sidebar by design |
| `components/UseCaseMain.js` | Main content column (utility bar + scroll area) each route composes into the body row |
| `lib/use-cases.js` | Cards shown on the `/dashboard` gallery — append here as new demo pages get built |
| `app/dashboard/legacy/layout.js` | Adds `LegacySidebar` to every Legacy Examples route |
| `components/LegacySidebar.js` | Legacy Examples' own left panel — example switcher + Content Browser tree |
| `lib/legacy-examples.js` | Config for the two pre-existing demo pages bundled as "Legacy Examples" |
| `components/LegacyExampleView.js` | Renders one `LEGACY_EXAMPLES` entry via `ConceptDemoPage` + `SigmaEmbed` |
| `app/dashboard/legacy/browse/[urlId]/page.js` | Renders a workbook opened from the Content Browser tree |
| `app/api/sigma/jwt/route.js` | Verifies session, calls `sigma-embed.js`, returns signed URL |
| `lib/sigma-embed.js` | Builds JWT payload and signs embed URL (HMAC-SHA256 via `jose`) |
| `lib/sigma-api.js` | Sigma **REST API** helper — OAuth token exchange + builds the embed user's EMBED-workspace tree (distinct from embed JWT signing) |
| `app/api/sigma/tree/route.js` | Clerk-authed — returns the logged-in embed user's accessible EMBED tree as JSON |
| `components/ContentTree.js` | Renders the read-only folder/workbook tree from `/api/sigma/tree` |
| `components/SigmaEmbed.js` | Fetches JWT and renders `<iframe>` |
| `components/ConceptDemoPage.js` | Shared template (badge, title, description, docs links, content slot) every use-case page renders through |

**Deploy:** Vercel auto-deploys on every push to `master`. Every push is production.

---

## Conventions & Patterns

### Adding a new use-case page

1. Add env var in Vercel: `SALES_SIGMA_BASE_URL=https://app.sigmacomputing.com/...`
2. Create `app/dashboard/<slug>/page.js` — fetch the Clerk user + `generateSigmaEmbedUrl({ mode: 'sales', ... })` server-side, then render a client view through `components/ConceptDemoPage.js` (see `components/LegacyExampleView.js` for the pattern), calling `useDashboardChrome().setJwt(...)`/`setPageTitle(...)` so the JWT inspector and breadcrumb pick it up. Wrap the body in `components/UseCaseMain.js`; if the use case needs its own sidebar or controls, add a `layout.js` beside the page that renders them next to `UseCaseMain` (see `app/dashboard/legacy/layout.js`) rather than adding them to `DashboardChrome`.
3. Add a card for it to `USE_CASES` in `lib/use-cases.js` so it appears on the gallery.
4. Push — Vercel picks it up automatically.

Note: `embed_examplesite-ibp.2` (central registry of demo-page config) will likely collapse steps 2–3 into a single declarative entry once it lands — this manual version is today's pattern, not the intended end state.

### Content Browser (REST API) section

A third kind of nav item (`kind: 'tree'`) renders `ContentTree` instead of an embed. It calls the Sigma **REST API** (not embed JWT signing) to list the `EMBED` workspace folder/workbook structure, filtered to what the logged-in embed user can access via `GET /v2/members/{memberId}/files`.

- REST API auth is a **separate** OAuth token exchange (`POST /v2/auth/token`) — see `lib/sigma-api.js`. Needs `SIGMA_API_BASE_URL` (the region-specific API host) and prefers `SIGMA_API_CLIENT_ID/SECRET`, falling back to the embed `SIGMA_CLIENT_ID/SECRET`.
- The embed user identity is the same `sigmaEmail` used by the JWT route (Clerk `publicMetadata.sigmaEmail`).
- Embed users are provisioned lazily — the tree shows an empty/"not provisioned" state until the user has embedded once **and** has been granted access to content in the `EMBED` workspace.

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
