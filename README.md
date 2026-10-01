# Embed Success — Sigma Embed Example Site

A demonstration of embedding [Sigma Computing](https://sigmacomputing.com) analytics securely into a host application.

**Live site:** https://embedexamplesite.vercel.app

---

## What this shows

Modern products increasingly need to show live analytics inside their own interface, rather than sending users to a separate BI tool. This site is a working demonstration of what that can look like — a logged-in user sees analytics that are scoped to *them*, generated on demand, without ever seeing "Sigma" as a separate product.

It walks through several concepts, each as its own example:

- **Authenticated embedding** — analytics tied to a real, logged-in user's own identity, not a shared or anonymous view
- **Secured, filtered views** — the same content narrowed per user, without duplicating it
- **Dynamic content discovery** — a user can browse exactly the content they're entitled to see, discovered at the moment they look rather than hardcoded into the application
- **Team- and business-unit-scoped access** — the same embedded experience showing different content depending on which team or business unit a user belongs to
- **On-demand content creation** — new analytical content created in the moment, for a specific user, and shown immediately
- **Public, no-login embedding** — a secure embed that doesn't require visitors to sign in at all

---

## Dynamic team resolution via identity (Sub-Address Swapping)

One example goes a step further on the team-scoping concept above, and is worth calling out on its own.

Most embedding patterns need either an in-app "switch team" control, or a separate persistent account per team or tenant — both add real operational overhead as the number of teams grows. This example demonstrates a third option: team context follows **which login** the user is actually using, the same way a customer's own identity provider might issue one address per business unit (a pattern many SSO setups already support natively).

The approach: the embedded session asserts only *who* the person is — nothing about which team they belong to is passed through at all. The underlying analytics platform already knows that identity's real, persistent team membership, and resolves access from that on its own. The practical effect is that provisioning a new team's access becomes an identity question, not an application code change — if an identity provider can mint a new address for a new business unit, that unit's access follows automatically, with no new "which team" logic to build or maintain.

---

## Learn more

For the full technical breakdown — architecture, environment setup, API specifics, and implementation detail — see [`README.detailed.md`](./README.detailed.md).
