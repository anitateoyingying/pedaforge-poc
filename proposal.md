# PedaForge → Three-Proposal Restructure & ECDA Submission Plan

**Date:** 2026-06-07
**Author:** Anita Teo (Programme Specialist) - prepared with Claude Code
**Context:** The company is splitting the single "PedaForge" concept into **three independently fundable ECDA Early Childhood Innovation Sandbox proposals**. This document is the plan of record for (a) restructuring the existing prototype site to feature all three, and (b) producing the formal ECDA application(s) from `submission/sandboxtemplate.docx`.

Source proposals (in `/home/dmgadmin/sandbox/submission/`):
- `PedaForge_Classroom_Proposal.pdf` - $110,000 SGD
- `PedaForge_Leadership_Proposal.pdf` - $120,000 SGD
- `Project_SproutSpace_Proposal.pdf` - $150,000 SGD (Category A)

---

## 1. The three proposals at a glance

| | **PedaForge Classroom** | **PedaForge Leadership** | **SproutSpace** |
|---|---|---|---|
| **Tagline** | Pedagogy & Differentiated Learning Sandbox | AI Coaching & Curriculum Leadership Sandbox | Intelligent Digital Portal for Classroom Layout & Resource Management |
| **Audience** | Educators (child-facing pedagogy) | Educators + Centre Directors (professional growth) | Infant–K2 teachers, Directors, HQ admins (physical environment & resources) |
| **Budget** | $110,000 | $120,000 | $150,000 (Category A) |
| **Modules** | 1) Profile-Driven Smart Lesson Planning  2) Authentic Portfolio & Dynamic Profiling | 1) QTT-Aligned Coaching Agent  2) Full-Cycle AI Lesson Observation  3) Director's 3-step Curriculum Leadership | 1) Interactive Layout Planner  2) Active Resource Inventory Portal (QR)  3) Leadership & Org Control |
| **Stack** | React + FastAPI + Azure AI Enclave | React + FastAPI + Azure AI Enclave | React + FastAPI + QR + Azure AI Enclave (custom build on shared libraries; AI ~30-40%) |
| **Hardware** | 55 tablets (5 × 11 centres) | 11 high-performance laptops (Directors) | 11 QR scanners, 11 tablets, thermal printers, 20k QR tags |
| **Headline KPIs** | Docs 8h→<3h/wk; 100% lessons differentiated for 2+ profiles; 100% work samples tagged to EYDF/NEL <60s | 85% agree AI-IDP reflects growth vs SFw; 100% do 2+ coaching cycles/wk; 100% gaps→PLC/mentoring | 50% faster layout planning; 75% less inventory search; 35% less duplicate purchasing; 220+ handmade resources; 100% first-time safety approval |

All three share: same Singapore ECE documentation-burden problem, same Busy Bees / 11-pilot-centre operator base, same Azure-SG data-residency + PDPA + RBAC + Zero-Public-AI-Training posture.

---

## 2. Recommended site architecture

**ONE umbrella landing page → THREE self-contained proposal hubs → each hub links to its module demos.**

This is a hybrid (one entry point, three independently submittable hubs). Rejected alternatives: (a) three anchor sections on a single page - cannot cleanly hold three different budgets/timelines/stacks without confusing assessors; (b) three separate sites - would triplicate the shared `css/style.css` + `js/app.js` and the design system.

Reasoning: preserves all existing work (7 pages share one asset layer), tells assessors one coherent organisational story that forks into three named entries, and gives each proposal its own clean, printable/shareable URL mirroring the three source PDFs.

### Page inventory (final state - 15 pages)

**Umbrella**
- `index.html` - **RECONFIGURE** into umbrella: reframed hero ("Three AI Sandboxes, One ECE Mission"), shared problem evidence, 3-proposal selector cards (tagline + budget + headline KPIs + "View Proposal"), "how the three connect" narrative, shared compliance/architecture posture, shared team/operator credibility, 3-column footer.

**PedaForge Classroom**  (accent: red - primary brand)
- `classroom.html` - **NEW** hub: problem, 2 modules, React + FastAPI + Azure AI Enclave architecture, 55-tablet hardware, $110k budget table, 12-month timeline, Classroom KPIs, team.
- `planner.html` - **REUSE** (Profile-Driven Smart Lesson Planning demo).
- `portfolio.html` - **REUSE** (Authentic Portfolio & Dynamic Profiling demo).
- `work-sample.html` - **REUSE + formally adopt into nav** (currently orphaned; only linked from portfolio).

**PedaForge Leadership**  (accent: purple/indigo --secondary)
- `leadership.html` - **NEW** hub: problem, 3 modules, React + FastAPI + Azure AI Enclave, 11-laptop hardware, $120k budget, timeline, Leadership KPIs, team.
- `coach.html` - **REUSE** (QTT-Aligned Coaching Agent demo).
- `lna.html` - **REUSE** (Learning Needs Analysis & IDP demo).
- `dashboard.html` - **REUSE** (Leadership Dashboard / Director 3-step demo).
- `observation.html` - **NEW** demo: Full-Cycle AI Lesson Observation - Pre-Observation (surfaces IDP goals, recommends QTT domains), Actual Observation (multimodal capture on HQ device, AI tags evidence to QTT indicators), Post-Observation (AI feedback summary + follow-up plan).

**SproutSpace**  (accent: green/teal - new sub-brand, environment theme)
- `sproutspace.html` - **NEW** hub: problem, 3 modules, React + FastAPI + QR stack (same foundation as the other two; a custom build standing on permissive OSS libraries, with AI ~30-40%), Category A, detailed $150k budget (Software/Eng $108k + Cloud $14.4k + Equipment $15.6k + Training $8k + Evaluation $4k), equipment list, timeline, KPIs, team.
- `sproutspace-layout.html` - **NEW** demo: Interactive Layout Planner (drag-and-drop floor-plan canvas, age-group selector Infant/Toddler/Playgroup/N1/N2/K1/K2, to-scale furniture, safety/visibility-hazard warnings, brand-guideline presets).
- `sproutspace-inventory.html` - **NEW** demo: Active Resource Inventory Portal (categorization matrix by age/usage/learning category, QR check-in/out with condition rating, Handmade Resource Repository).
- `sproutspace-control.html` - **NEW** demo: Leadership & Organization Control (push safety/design standards to all branches, smart procurement dashboards with usage/durability charts).

### Navigation (all pages)
Replace the current 2-dropdown nav with an umbrella nav: **Home** + three proposal dropdowns (each = hub link + its demo links) + **Compliance**. Brand link → `index.html` on every page (fix `index` brand `href="#"`). Each demo's "back"/active-state points to its OWN hub, not the global index. Extend `js/app.js` path-routing so each demo highlights the correct hub group. Each hub also carries a local sub-nav of just its own modules so it reads as a self-contained submission.

### Visual sub-branding
Keep the one shared `css/style.css`. Add three lightweight accent namespaces (e.g. `body.hub-classroom`, `body.hub-leadership`, `body.hub-sproutspace`) that re-map an `--accent-proposal` variable - Classroom = red, Leadership = purple, SproutSpace = green/teal - without touching global tokens. This visually distinguishes the three while preserving one design system.

---

## 3. Critical content corrections (do NOT copy old numbers)

The existing `index.html` carries **stale** figures that must be rewritten per hub, never copied:
- Old budget **$21,000** → replaced by $110k / $120k / $150k per hub.
- Old generic KPIs (60% doc time / 100% differentiated / 85% IDP / 2× coaching) → each hub uses ITS proposal's KPIs (see table §1).
- Old "five integrated modules" framing → split into 2 (Classroom) + 3 (Leadership) + 3 (SproutSpace).
- Architecture: all three are built on React + FastAPI; Classroom/Leadership are AI-token-heavy with the Azure AI Enclave, SproutSpace is the same stack and AI enclave but the broadest custom build (drag-drop canvas, QR, dashboards) standing on permissive OSS libraries, with AI used purposefully (~30-40%) for compliance copilot, vision tagging and procurement forecasting. SproutSpace is NOT a tools-integration project: the $108k software line is engineering, not licensing.
- Budgets must be independently fundable - **no double-counting** shared Azure tenant costs across Classroom and Leadership budgets.

---

## 4. ECDA submission (docx) plan

**Template:** `submission/sandboxtemplate.docx` - a single ECDA application form with 7 sections and ~19 free-text fields (mostly capped at **2,000 characters** each) plus a budget table. Tooling: `python-docx` (confirmed installed; no pandoc/libreoffice).

**Approach:** Because each proposal is a **separate ECDA submission**, produce **three filled application forms** - `submission/PedaForge_Classroom_Application.docx`, `..._Leadership_Application.docx`, `Project_SproutSpace_Application.docx` - each generated by cloning the template and writing answers into the answer boxes under each Heading-2 field (preserving the template's styling/structure).

**Fields to fill per form** (Section 2–6): Project Title; Executive Summary; Project Start Date; Main Contact Person/Email; Problem Statement; Background & Context; Relevance to Future-Ready Preschools; Current Attempts; Solution Overview; Innovation Elements; Technology & Tools; Proposed Vendor; Project Phases; Pilot/Trial Plans; Feasibility; Scalability; Expected Outcomes; KPIs; Capability Building; Details Budget (itemised, 2dp); Cost Justification; Supporting Documents. Section 1 (Company Profile, ACRA-extracted) and Section 7 (Declarations) left as-is.

**Writing rules** (from ECDA research):
- Each ~2,000-char field = a tight ~300-word elevator pitch; front-load the thesis; assessors skim.
- One job per field - no repetition across fields.
- Quantify everything with baseline → target; name the data source for each KPI (observation rubrics, time diaries, QR logs, pre/post surveys).
- Thread national frameworks by name: **EYDF** (0–3), **NEL/iTeach** (4–6), **QTT** (quality teaching 2–6, developmental not assessment), **SFw for ECCE / WSQ** (capability building).
- Mirror IDP 2.0 vocabulary: "future-ready preschools", "scalable innovation", "prototype/pilot", "Key Person", "Enabling Environment", "Unique Child".
- Budget reconciles to each proposal's cap; itemise; tie each line to an activity + outcome.

---

## 5. ECDA evaluation criteria the content must satisfy

(Inferred from existing ECDA Innovation/Practitioner-Inquiry rubrics + IDP 2.0 intent - validate against the official H2-2026 call.)
1. Problem significance & sector relevance (evidence-backed; aligned to frameworks).
2. Innovativeness / novelty (why off-the-shelf is insufficient → "Current Attempts").
3. Feasibility & soundness (realistic phases, credible vendor, risk awareness, fits Jan-2027 start + 12-mo report).
4. Scalability & sector-wide impact (replicable beyond the pilot operator).
5. Outcomes & measurability (SMART KPIs with baselines, targets, data plan).
6. Capability building & sustainability (mapped to SFw/WSQ; gains outlast funding).
7. Value for money (reasonable, itemised, justified budget).
8. Proposal quality & coherence (ECDA selects "based on quality of the application").

---

## 6. Execution phases

- **Phase A - Plan (this document).**
- **Phase B - Shared scaffolding:** add the three accent namespaces + any new shared CSS (layout-canvas, inventory-table, QR card, observation-stepper) to `css/style.css`; extend `js/app.js` path-routing & nav active-state.
- **Phase C - Umbrella + hubs:** reconfigure `index.html`; build `classroom.html`, `leadership.html`, `sproutspace.html`. Update nav + footer across ALL existing pages.
- **Phase D - New demos:** build `observation.html`, `sproutspace-layout.html`, `sproutspace-inventory.html`, `sproutspace-control.html` in the shared design system.
- **Phase E - Submission docs:** generate the three filled `.docx` applications from the template; QA character counts (<2,000/field) and budget arithmetic.
- **Phase F - Deploy:** add the 8 new pages to the StatiCrypt encryption list in `.github/workflows/deploy.yml`; commit & push; verify GitHub Pages build.

Each new page is built to match the existing clay-neumorphic design system (Outfit/Playfair fonts; red/purple/yellow Busy Bees palette; `feature-card`, `tag`, `alert-item`, `budget-table`, `dash-panel`, `page-header` components).

---

## 7. Risks & mitigations

- **Stale-number bleed** - rewrite each hub's KPIs/budget/timeline from its source PDF; never copy old index figures. (See §3.)
- **Brand confusion** - SproutSpace shares the operator but not the "PedaForge" name or stack or funding category; the umbrella must state the three are complementary-but-separately-funded, so assessors don't read $150k as overlapping the others.
- **Independent fundability** - ECDA may fund some hubs, not others; each hub stands alone (own problem/budget/KPIs, no hard cross-dependency, no double-counted Azure cost).
- **Effort asymmetry** - SproutSpace is fully net-new (1 hub + 3 interactive demos incl. drag-drop canvas + QR sim + dashboards); heavier than reused PedaForge demos.
- **Shared-asset coupling** - one CSS/JS now serves 15 pages across 3 sub-brands; use accent namespacing and careful path-routing to avoid cross-hub regressions.
- **Mobile nav depth** - three hub-dropdowns need a tested responsive/accordion pattern.
- **Live-vs-PDF consistency** - keep each hub page as the single source of truth so it matches any printed submission.

---

## 8. Decisions for Anita (resolved)

1. **Docx output:** three separate filled application forms (one per proposal). RESOLVED - three forms generated.
2. **Project Start Date:** **01 Jan 2027** (commence by Jan 2027; final report 12 months after). RESOLVED.
3. **Main Contact Person / Email:** Anita Teo / **[EMAIL TBC — Anita Teo]**. RESOLVED (email is a confirmed placeholder).
4. **Operator / pilot-centre naming:** **Busy Bees** + **11 pilot centres**, as in the source PDFs. RESOLVED.

---

## 9. SproutSpace: build vs integrate (resolved 2026-06-07)

**Decision:** SproutSpace is a **custom build** on the shared React + FastAPI + Azure stack, **not** a tools-integration project. It stands on permissive open-source *libraries* (canvas/scene-graph for the layout planner, a public-domain visibility-polygon algorithm for line-of-sight checks, a charting library for dashboards, QR scan + label generation) for the commodity surfaces, and spends the salaried engineering months on the bespoke IP: the ECDA per-child-area/ratio + SCDF two-exit safety-rule engine, the ECE taxonomy, the Handmade Resource Repository, and the HQ standards-push + approval workflow. AI is **purposeful (~30-40%)**, not "light."

**Why** (build-vs-integrate research, all 3 modules came back "build", high confidence):
- No open-source app covers a *majority* of any module's value with a usable licence and matching stack. Mature OSS was evaluated and rejected as the base: inventory (Snipe-IT, Shelf.nu, InvenTree) is built for IT assets, has no ECE/ECDA/SCDF logic, and the closest fit (Shelf.nu) is AGPL + cloud-coupled; BI tools (Metabase, Superset) cover only the ~40% read-only charts of the leadership module and add a second runtime + auth bridge; the furniture-rich layout planners are GPL/Java or the wrong framework.
- The **$108k software line** (2 devs x 9 months + designer) is an **engineering** line, not a licensing line - there is nothing to license. Budget unchanged; only the narrative was corrected to match it.
- This is also a stronger grant story under ECDA's *novelty* and *value-for-money* criteria: "we spent the grant building Singapore-regulation-aware safety IP" beats "we wired three off-the-shelf tools together."

**Still open (for Anita / CEO - not blocking, but sharpen the proposal):**
1. **Scale beyond pilot?** Will SproutSpace scale past the 11 centres / be productised? That is the main condition that could re-open integrating a mature inventory engine for Module 2. A fixed 12-month internal pilot favours the custom build as written.
2. **Safety-rule source & sign-off.** Where exactly are the ECDA per-child-area/ratio and SCDF two-exit/walkway rules sourced, and who signs off the encoded thresholds are correct? This is the load-bearing IP and the main liability - author from official source documents, keep the Centre Director human-in-the-loop, and treat AI/automated checks as advisory and auditable, never legally authoritative.
3. **AI inference budget.** Confirm the ~30-40% AI uplift is covered by the existing Azure OpenAI enclave with no incremental token line, or whether the S$14.4k cloud line needs a small AI-inference allocation.

---

## 10. PedaForge Home - the fourth proposal (added 2026-06-07)

**PedaForge Home: The Home-School Literacy Bridge.** Budget **S$140,000**, 12 months, accent teal **#0E8FA8**. The FAMILY proposal - serves the home-school literacy bridge (Classroom serves the child, Leadership the educator, SproutSpace the environment, Home the family).

**Problem:** young children's English-language standards and love of reading hinge on the home, yet families and centres work in isolation with no shared reading benchmark. SG evidence: the home literacy environment (shared-reading frequency + child reading interest) is the strongest predictor of early word-reading (Sun & Ng ~1,440-child study; validated 4-factor SG HLE model). Compounds at K2->P1 (English becomes medium of instruction).

**5 modules** (each with a demo page): 1) Phonics Studio & Decodable Reader Library (`home-phonics-studio.html`); 2) Termly Benchmarking & Home-School Reading Bridge - formative, score-free (`home-benchmark.html`); 3) Automated AI Reading Coach & Self-Tracking - Azure AI Speech, advisory + teacher-confirmed, child self-monitoring (`home-reading-coach.html`); 4) Draw, Write & Reflect SEL writing portal (`home-draw-reflect.html`); 5) Talking Dictionary & Word Recognition - Azure Neural TTS (`home-dictionary.html`). Hub: `home.html`.

**Build:** same React + FastAPI + PostgreSQL + Azure OpenAI (SG, PDPA, RBAC, Zero Public AI Training) stack. BUY undifferentiated infra (Azure AI Speech pronunciation assessment, Azure Neural TTS, a licensed decodable/levelled reader subscription, an OSS canvas lib); BUILD the proprietary pedagogy (phonics scope-and-sequence, bespoke decodables = the fundable IP, the termly benchmark model, SEL reflection model, kid-dictionary state machine, consent/PDPA). AI value highest in M3/M5 (~50%+).

**Budget (S$140,000):** Software & Engineering S$92,000; Reader/Content Subscription Licensing S$16,000; Cloud + AI & Speech Inference S$15,000; Family Devices & Pilot Equipment S$8,000; Training & Change Management (staff + families) S$5,000; Project Evaluation & Review S$4,000. (Note: reader-subscription licensing + speech inference are real cost lines unique to this proposal.)

**Headline KPIs:** weekly shared-reading families ~25% -> 70%; 75% of children advance >=1 reading-benchmark band across two terms; love-of-reading disposition +0.6 (5-pt pictorial survey), 80%+ at "enjoy". All formative - NOT high-stakes testing of young children.

**Aligns:** NEL 2022 Language & Literacy (3 Cs) + iTeach; SEL; complements NLB programmes (Early READ, kidsREAD@Home, Let's Read, Read@School); staff capability via SFw for ECCE / WSQ; EYDF for youngest readers.

**Differentiation:** unlike child-facing apps (Reading Eggs, Epic, Khan Academy Kids, NLB Let's Read), PedaForge Home is the home-SCHOOL bridge - one shared parent+teacher termly evidence picture, operator-owned phonics IP + bespoke decodables, child self-monitoring for 5-6yos, SEL-integrated writing, and locally teacher-confirmed AI reading coaching.

**Open questions (for Anita - not blocking):** (1) which decodable/levelled reader corpus to license + per-seat price; how many bespoke decodables the literacy lead can author/vet in 12 months. (2) Azure Speech fit for 5-6yo Singapore-accented voices - collect an early teacher-scored calibration set; en-US vs en-GB/en-AU. (3) does Busy Bees have an in-house reading benchmark, or co-design one mapped to NEL Language & Literacy. (4) PDPA/parental consent for children's voice clips, drawings, reflections at home; device-pool eligibility. (5) verify the ~25% shared-reading and ~30% engagement baselines against actual home-reading-return data. (6) no verified SG screen-time statistic - frame the portal as a purposeful nightly routine, do not assert a figure.

Research saved at `submission/pedaforge_home_research.json`. ECDA form: `submission/PedaForge_Home_Application.docx`.
