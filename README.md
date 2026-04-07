# Embed Success — Sigma Embed Example Site

A production-ready example of embedding [Sigma Computing](https://sigmacomputing.com) analytics into a modern SaaS application. Built with Next.js 14, Tailwind CSS, and JWT-based secure embedding.

**Live site:** https://embedexamplesite.vercel.app

---

## What this is

This site demonstrates how to embed Sigma workbooks inside a custom web application using Sigma's JWT embedding API. It includes:

- A polished dark SaaS landing page
- An authenticated login flow with session management
- A dashboard shell that loads Sigma content inside an iframe
- Server-side JWT generation — the embed URL is signed fresh on every request
- A multi-embed pattern so you can add new Sigma workbooks with minimal code

This is not a template or a starter kit — it's a working demonstration of a real embed architecture.

---

## Architecture

```
Browser
  │
  ├── GET /dashboard
  │     └── Server verifies session cookie → renders DashboardShell
  │
  └── GET /api/sigma/jwt?mode=<mode>
        └── Server verifies session → signs JWT with SIGMA_SECRET
              └── Returns signed embed URL → iframe renders Sigma content
```

**Why server-side JWT signing matters:** The Sigma embed secret never leaves the server. The browser only ever receives a signed, expiring URL — it cannot forge or extend its own access.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + Inter font |
| JWT signing | `jose` (HMAC-SHA256) |
| Session | Encrypted cookie (`jose`, 8hr expiry) |
| Hosting | Vercel (auto-deploys on push to `master`) |

---

## Environment variables

Set these in Vercel (Settings → Environment Variables) or in `.env.local` for local development:

```env
# Sigma embed credentials
# Get these from: Sigma Admin → Developer Access → Embedding
SIGMA_CLIENT_ID=
SIGMA_SECRET=

# Default embed URL — the Sigma workbook/page to embed
# Copy from Sigma: open a workbook → share → get embed URL (without ?:embed=true)
SIGMA_BASE_URL=

# Add one per nav section. Mode name (uppercase) becomes the prefix.
# Example: { label: 'Sales', mode: 'sales' } → SALES_SIGMA_BASE_URL
# SALES_SIGMA_BASE_URL=
# PROFIT_PLANNER_SIGMA_BASE_URL=
# MARKETING_SIGMA_BASE_URL=

# Session signing secret — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
SESSION_SECRET=

# Optional Sigma UI controls
# hide_menu=true
# hide_folder_navigation=true
# disable_mobile_view=true
# responsive_height=true
# theme=
```

---

## Adding a new embedded workbook

1. **Add the env var in Vercel** — e.g. `SALES_SIGMA_BASE_URL=https://app.sigmacomputing.com/your-org/workbook/...`

2. **Add a nav item in `components/DashboardShell.js`:**

```js
const NAV_ITEMS = [
  { label: 'Overview', mode: '', icon: (...) },
  { label: 'Sales',    mode: 'sales', icon: (...) },  // ← add this
];
```

3. **Push to deploy** — Vercel picks up the new env var and nav item automatically.

The `mode` string maps to `{MODE}_SIGMA_BASE_URL` — so `mode: 'sales'` reads `SALES_SIGMA_BASE_URL`. No other code changes needed.

---

## Local development

```bash
# 1. Clone
git clone https://github.com/chewie2000/embed_examplesite.git
cd embed_examplesite

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Fill in your Sigma credentials and workbook URL

# 4. Run dev server
npm run dev
# → http://localhost:3000
```

Demo login credentials are configured via environment variables (`DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD`). In production, replace the demo auth with a real identity provider — see [Authentication options](#authentication-options) below.

---

## Authentication options

The Sigma embedding architecture is auth-agnostic — the JWT route only needs an email to place in the `sub` claim, regardless of how the user authenticated. This makes it straightforward to swap or upgrade the auth layer.

### Option 1 — Clerk (recommended for most cases)

[Clerk](https://clerk.com) is the fastest path to multi-user auth in Next.js. The free tier supports up to 50,000 monthly retained users.

- Pre-built login/signup UI
- Each user's email maps directly to the Sigma `sub` claim
- Custom `sigmaEmail` can be stored in Clerk user metadata for row-level security
- Okta and Entra (Azure AD) SSO available as enterprise connections — no code changes required, configured in the Clerk dashboard

**JWT route change (simplified):**
```js
import { auth, clerkClient } from '@clerk/nextjs/server';

const { userId } = auth();
const user = await clerkClient.users.getUser(userId);
const sigmaEmail = user.publicMetadata.sigmaEmail || user.emailAddresses[0].emailAddress;
```

### Option 2 — NextAuth.js (Okta / Entra directly)

For a standalone clone without Clerk, [NextAuth.js](https://next-auth.js.org) has built-in providers for both:

```js
import OktaProvider from 'next-auth/providers/okta';
import AzureADProvider from 'next-auth/providers/azure-ad';

// In [...nextauth]/route.js:
providers: [
  OktaProvider({ clientId, clientSecret, issuer }),
  AzureADProvider({ clientId, clientSecret, tenantId }),
]
```

The Sigma JWT side of the codebase (`lib/sigma-embed.js`, `/api/sigma/jwt`) requires **no changes** in either case — it simply reads an email from the session.

---

## Deployment

This repo is connected to Vercel. Every push to `master` triggers an automatic production deployment.

To force a manual deploy:
```bash
npx vercel --prod
```

---

## JWT claims reference

The JWT generated by `/api/sigma/jwt` includes these Sigma claims:

| Claim | Value | Notes |
|---|---|---|
| `sub` | User email | Maps to Sigma user identity |
| `iss` | `SIGMA_CLIENT_ID` | Must match your embed client ID |
| `jti` | `crypto.randomUUID()` | Prevents replay attacks |
| `account_type` | Optional | `viewer`, `creator`, `admin` |
| `teams` | Optional array | Must match team names in your Sigma org |
| `user_attributes` | Optional object | Passed through for row-level security |

See [Sigma JWT Claims Reference](https://help.sigmacomputing.com/docs/json-web-token-claims-reference) for full documentation.

---

## File structure

```
embed_examplesite/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.js      # Validates credentials, creates session cookie
│   │   │   └── logout/route.js     # Clears session cookie
│   │   └── sigma/
│   │       └── jwt/route.js        # Verifies session, returns signed Sigma embed URL
│   ├── dashboard/page.js           # Protected dashboard page (server component)
│   ├── login/page.js               # Login form
│   ├── page.js                     # Public landing page
│   ├── layout.js                   # Root layout + Inter font
│   └── globals.css                 # Tailwind base + custom utilities
├── components/
│   ├── DashboardShell.js           # Nav, sidebar, embed container (client component)
│   └── SigmaEmbed.js               # Fetches JWT and renders Sigma iframe
├── lib/
│   ├── session.js                  # Session creation and verification (jose)
│   └── sigma-embed.js              # JWT generation and embed URL construction
├── middleware.js                   # Protects /dashboard — redirects if no session
└── .env.example                    # Environment variable reference
```
