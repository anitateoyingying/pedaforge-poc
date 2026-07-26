# PedaForge

The full working application of PedaForge, the AI teaching platform for early childhood education in Singapore.

**Live:** https://anitateoyingying.github.io/pedaforge-poc/

One sign-in, two worlds:

| World | Who it is for | Look and feel |
| --- | --- | --- |
| **Teaching Studio** | Educators, centre leaders, HQ | Indigo sidebar app: plan, capture, coach, manage |
| **PedaForge Home** (`home.html`) | Children aged 2-6 | Painted "kids world": watercolor sky, rolling hills, big tactile controls, confetti |

## Signing in

- **Google sign-in** or an email demo account (login page, "Panel reviewer?" section)
- Demo accounts: `educator.test@pedaforge.demo` / `PfDemo2026!edu` and `director.test@pedaforge.demo` / `PfDemo2026!dir`
- New accounts get a setup wizard: pick a role, create a class, paste a class list
- First visit to the kids world plays a paint-world welcome (replay anytime with `home.html?welcome`)

## Teaching Studio modules

**Today** - a live dashboard: Plan / Set the Room / Capture / Grow journey ribbon, your class as clickable children, a rule-driven "What's Next" feed, and a cross-module activity stream.

**My Classes** - create classes (Singapore preschool centre dropdown covering 6 brands and 91 centres), add children with learning-profile tags, card or table view. Each child links to a profile hub (`child.html`) that aggregates their learning stories, reading progress, benchmarks, word jar, artwork, and work samples.

**Teach**
- *Lesson Planner* - AI drafts a plan differentiated for each child's actual learning profile; save and reuse lessons
- *Portfolios* - capture an observation, let the AI draft a parent-ready learning story, keep a per-child timeline
- *Work Samples* - upload a photo, get AI milestone analysis mapped to frameworks

**Grow**
- *AI Coach* - a real coaching chat in four modes (Reflective, QTT Deep Dive, Socratic, Scenario), grounded in Singapore's QTT; sessions saved and reloadable
- *Observation* - type notes during a lesson, each is AI-tagged to a QTT indicator live, then a strengths / growth / follow-up report is synthesised
- *Learning Needs* - AI proposes three IDP goals with QTT domains and SkillsFuture (SFw for ECCE) references
- *PD Dashboard* - real aggregates across observations, coaching, reading, and layouts

**SproutSpace**
- *Layout Planner* - drag-and-drop classroom design on a to-scale grid with a live safety engine (8 rules: SCDF exit clearance, walkway flood-fill, second egress, ECDA sightline raycasting, age-banded shelf heights, wet/dry separation, socket proximity, floor density), compliance ring, age presets, and submit-for-approval
- *Inventory* - shared resource register with categories, age groups, condition, check in/out with event history, card or table view
- *HQ Control* - network stats plus the layout approval queue (directors approve or request changes)

**PedaForge Home admin** (`kids-admin.html`)
- *Enrolments and Billing* - per-child pipeline: record parent contact, mark invoiced, mark paid or waive, then activate. Only active children can enter the kids world once enrolments are in use; suspend anytime
- *Curriculum* - per class: open or lock each kids module, pick Word Jar words from the standard bank, add custom words with kid-friendly meanings, choose the phonics sounds of the week, write the Reading Time passage, set a theme label
- *Class Templates* - save a class setup as a seasonal template (Term 1-4, Holidays) and apply it to any class in one click; director templates are shared network-wide

## PedaForge Home (kids world)

Five doors, gated by the class curriculum, with a growth garden that visibly grows from real activity and a weekly star counter:

- *Reading Time* - the child reads aloud; real browser speech recognition lights up each word, miscues flagged, WCPM and accuracy recorded (a scripted pretend-read covers browsers without speech support)
- *Sound Studio* - tap phonics sounds, blend letter tiles into words (real text-to-speech)
- *Word Jar* - tap a word to hear it, see a kid-friendly meaning, spell it with tiles; progress persists per child
- *Paint Corner* - draw on canvas, pick a feeling, get a friendly AI reflection; artwork saves to the child's gallery
- *Star Check* - five-strand literacy benchmark recorded with an educator

Voice quality: the app picks the best text-to-speech voice your browser offers (Microsoft Natural voices in Edge sound best, then Google voices in Chrome). Force a voice with `localStorage.setItem('pedaforge:voice', '<name substring>')`.

## Architecture

Static frontend (no build step, classic scripts) + Supabase backend. Hosted on GitHub Pages.

```
Frontend        GitHub Pages (this repo, static HTML/CSS/JS)
Auth            Supabase Auth (Google OAuth + email/password)
Database        Supabase Postgres, ap-southeast-1 (Singapore), row-level security on every table
Storage         Supabase Storage, private "artefacts" bucket (signed URLs)
AI              Supabase Edge Function "ai" (JWT required): Gemini 2.0 Flash primary,
                Mistral small fallback; prompts grounded in NEL, iTeach, EYDF, QTT, SFw
Speech          Web Speech API in the browser (SpeechRecognition + speechSynthesis)
```

### Roles and security

- `educator` (default) - full CRUD on their own classes, children, and records
- `director` - read access network-wide, layout approval rights, enrolment oversight, shared templates
- All data access is enforced server-side by Postgres RLS; the anon key can only do what policies allow for the signed-in user
- AI keys live in edge-function secrets, never in the browser

### Data model (main tables)

`profiles` (role, onboarded), `classes` (+ `curriculum` jsonb), `children` (profile tags), `lessons`, `portfolio_observations`, `work_samples`, `observations`, `coach_sessions`, `layouts` (draft / submitted / approved / changes_requested), `inventory_items` + `inventory_events`, `reading_sessions`, `dictionary_progress`, `benchmarks`, `artworks`, `home_enrolments` (billing + status per child), `curriculum_templates` (seasonal, shareable).

### AI edge function actions

`lesson_plan`, `coach`, `tag_observation`, `observation_report`, `narrative`, `analyze_sample`, `lna`, `reflect`. Source in `supabase/functions/ai/index.ts`.

## Repository layout

```
*.html                     pages (studio pages use the sidebar shell; home*.html are the kids world)
css/style.css              base design system (clay style)
css/app-shell.css          studio sidebar shell + shared form controls
css/kids.css               kids paint-world design system
js/pf-auth.js              Supabase client, auth gate, session
js/pf-api.js               data layer: classes/children CRUD, child picker, AI invoke, storage
js/pf-shell.js             studio sidebar chrome (skips home*.html)
js/pf-kids.js              kids dock, painted scene, child switcher, enrolment gate, curriculum access
js/pf-kids-wizard.js       paint-world welcome wizard
js/pf-kids-home.js         kids hub: doors, garden, streak
js/pf-kids-admin.js        Home Admin: enrolments, curriculum, templates
js/pf-wizard.js            educator onboarding wizard
js/pf-centres.js           Singapore preschool brands and centres
js/pf-classes.js           My Classes page
js/pf-today.js             Today dashboard
js/pf-child.js             child profile hub
js/pf-planner|portfolio|worksample|coach|observation|lna|dash|inventory.js   studio modules
js/home-*.js               kids modules (speech, reading, dictionary, phonics, draw, benchmark)
js/pf-markdown.js          escape-first markdown renderer for AI text
supabase/functions/ai/     AI edge function (managed in Supabase)
```

## Related

The grant-proposal site (four ECDA Innovation Sandbox proposals, password-gated) lives separately at https://github.com/anitateoyingying/pedaforge.
