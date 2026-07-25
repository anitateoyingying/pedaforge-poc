# Agape's Sandbox — Four ECDA Innovation Sandbox Proposals

Four AI-enabled proposals from one Singapore early childhood operator (**Busy Bees**, delivering across its pilot-centre network), aligned with ECDA's IDP 2.0 vision for future-ready preschools. This repository is the static proposal site: an umbrella landing page plus one hub page per proposal, each with working interactive demos.

## The Four Proposals

| Proposal | Focus | Budget | Hub page |
|----------|-------|--------|----------|
| **PedaForge Classroom** | Pedagogy & differentiated learning — profile-driven planning and authentic portfolios | S$110,000 | [`classroom.html`](classroom.html) |
| **PedaForge Leadership** | AI coaching & curriculum leadership — QTT-aligned coaching and lesson observation | S$120,000 | [`leadership.html`](leadership.html) |
| **SproutSpace** | Classroom layout design & resource management — safety-checked layouts, QR asset tracking | S$150,000 | [`sproutspace.html`](sproutspace.html) |
| **PedaForge Home** | Home-school literacy bridge — phonics, shared reading, AI reading coach | S$140,000 | [`home.html`](home.html) |

**Total across all four: ~S$520,000.** Each proposal is a self-contained ECDA Early Childhood Innovation Sandbox submission with its own budget, KPIs, and 12-month plan — ECDA can fund any one, any combination, or all four. Detailed problem statements, KPIs, budgets, and timelines live on each hub page (the single source of truth), not in this README.

Start at the umbrella page: [`index.html`](index.html) — deployed as a password-protected GitHub Pages site (see the environment URL on the latest [Deploy workflow run](../../actions)).

## Repository & Deployment

- Static HTML/CSS/JS only — no backend, no build step. All AI interactions are simulated or use in-browser APIs (clearly badged as such).
- Deployed to **GitHub Pages** via `.github/workflows/deploy.yml`: every push to `main` encrypts the HTML pages with **StatiCrypt** (password from the `STATICRYPT_PASSWORD` repo secret) and publishes the site.
- To add a page to the protected site, add it to the StatiCrypt file list in `deploy.yml`.
- `proposal.md` holds working notes and resolved decisions; `slides/` contains a legacy single-proposal deck (see `slides/LEGACY.md`).

Copyright (c) 2026 Anita Teo. All rights reserved.
