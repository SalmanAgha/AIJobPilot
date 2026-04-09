# 🚀 Career-Ops → SaaS Product Plan
> Written: 2026-04-08 | Status: ACTIVE ROADMAP

---

## 📌 Product Summary

**What it is**: An AI-powered job search command center that evaluates job offers,
generates ATS-optimized CVs, scans company portals, and tracks applications — all
personalized to the user's CV and career goals.

**Why it's sellable**: Companies use AI to filter candidates. This gives candidates
AI to filter companies. The core engine already does what $50+/month SaaS tools
charge for. The only missing piece is the cloud wrapper around it.

**Target customer**: Tech/AI job seekers who are serious about their search —
developers, product managers, ML engineers — who already pay for ChatGPT or Notion
and are spending 10+ hours/week manually tracking applications.

**Price**: $0 Free → $9/mo Pro → $29/mo Career Accelerator

---

## 🗂️ What We Have Today (Inventory)

### Backend Engine (Tool1 / career-ops)
- ✅ 14 AI skill modes: evaluate, pdf, scan, batch, interview-prep, negotiation, apply, deep, contacto, tracker, pipeline, project, training
- ✅ ATS PDF Generator (Playwright + HTML template, Space Grotesk/DM Sans fonts)
- ✅ Portal Scanner: 45+ companies pre-configured (OpenAI, Anthropic, ElevenLabs, n8n, Retool…)
- ✅ Batch processing: parallel `claude -p` workers evaluate 10+ jobs simultaneously
- ✅ Dedup + merge + normalize scripts for data integrity
- ✅ Express backend bridge (server.mjs, port 5000) exposing applications + reports as JSON
- ✅ Go TUI Dashboard with 6 filter tabs and inline status changes

### Frontend (Tool1/frontend — React + Vite)
- ✅ Kanban board (Applied / Evaluated / Pending) wired to local Express API
- ✅ Dark-mode glassmorphism design system (CSS tokens)
- ✅ Report modal (renders raw markdown from server)
- ✅ Stats row (total evaluations, score, next step)

### What's Missing (The SaaS Gap)
- ❌ User accounts (auth)
- ❌ Billing / subscription gating
- ❌ Cloud database (everything is local markdown files)
- ❌ Hosted AI evaluation (requires Claude Code CLI locally)
- ❌ Multi-user support
- ❌ Onboarding flow (currently needs GitHub clone + YAML edit)
- ❌ Email notifications
- ❌ Landing/marketing page

---

## 💰 Subscription Model

### Tier 0 — Free
**Goal**: Hook users, grow email list, build trust

| Feature                      | Limit       |
|------------------------------|-------------|
| Job URL evaluations          | 3 / month   |
| ATS PDF generation           | 1 / month   |
| Dashboard (Kanban view)      | ✅ Full      |
| Portal scan                  | ❌ Locked   |
| Batch processing             | ❌ Locked   |
| Interview prep               | ❌ Locked   |
| Email job digest             | ❌ Locked   |

---

### Tier 1 — Job Seeker Pro @ $9/month
**Goal**: Main revenue driver — casual to serious job seekers

| Feature                      | Limit        |
|------------------------------|--------------|
| Job URL evaluations          | 30 / month   |
| ATS PDF generation           | 10 / month   |
| Portal auto-scan             | 5 companies  |
| Full Kanban dashboard        | ✅           |
| AI Interview prep per role   | ✅           |
| Salary negotiation scripts   | ✅           |
| Email: weekly job digest     | ✅           |
| Report history (30 days)     | ✅           |

---

### Tier 2 — Career Accelerator @ $29/month
**Goal**: Power users, active job changers, bootcamp grads

| Feature                         | Limit       |
|---------------------------------|-------------|
| Everything in Pro               | ✅          |
| Job URL evaluations             | Unlimited   |
| ATS PDF generation              | Unlimited   |
| All 45+ portal scans            | ✅          |
| Batch evaluate (10+ at once)    | ✅          |
| LinkedIn outreach drafts        | ✅          |
| Deep company research mode      | ✅          |
| STAR story bank (accumulated)   | ✅          |
| Zapier / Notion webhook export  | ✅          |
| Priority AI processing          | ✅          |
| Report history (unlimited)      | ✅          |

---

## 🛠️ Build Roadmap

### PHASE 1 — Foundation (Weeks 1–2)
**Goal**: Enable the first paying user

#### 1.1 Auth (Week 1, ~3 days)
- Tech: **Clerk.dev** (fastest React integration, free up to 10k MAU)
- Add `<ClerkProvider>` to frontend, `<SignIn>` / `<SignUp>` pages
- Protect all routes behind `<SignedIn>`
- Store `userId` with every DB record
- Deliverable: Users can create accounts and log in

#### 1.2 Stripe Billing (Week 1–2, ~2 days)
- Tech: **Stripe Checkout** (hosted payment page, no custom UI needed)
- Create 3 products in Stripe: Free, Pro ($9), Accelerator ($29)
- Add webhook endpoint in `server.mjs`: `POST /api/stripe/webhook`
  - On `checkout.session.completed` → update user plan in DB
- Add "Upgrade" CTA button to frontend sidebar
- Add self-serve billing portal (Stripe's hosted portal)
- Deliverable: Users can upgrade and be billed

#### 1.3 Usage Gating (Week 2, ~1 day)
- Add `usage` table in DB: `{ userId, evaluationsUsed, pdfsUsed, resetDate }`
- Middleware: check usage before every evaluation/PDF call
- Frontend: show usage counter ("4 of 30 evaluations used")
- Show upgrade modal when limit hit
- Deliverable: Free users hit a wall; Pro users don't

---

### PHASE 2 — Cloud Data (Week 2–3)
**Goal**: Decouple from local filesystem, support multiple users

#### 2.1 Database Migration
- Tech: **Supabase** (Postgres + Storage, free tier: 50k rows, 1GB)
- Schema:
  ```sql
  users         (id, email, plan, stripeCustomerId, createdAt)
  applications  (id, userId, company, role, score, status, date, pdfUrl, reportUrl)
  reports       (id, userId, applicationId, content, createdAt)
  usage         (userId, evaluationsUsed, pdfsUsed, resetDate)
  ```
- Migrate `applications.md` parser → Supabase insert on evaluation
- Migrate report `.md` files → Supabase Storage (per user folder)
- Migrate generated PDFs → Supabase Storage or **Cloudflare R2**
- Update `server.mjs` to query Supabase instead of local filesystem

#### 2.2 Multi-tenant API
- Add `userId` filter to all `/api/applications`, `/api/report` calls
- Validate JWT from Clerk on every request (middleware)
- Rate-limit by plan tier

---

### PHASE 3 — Hosted AI Engine (Week 3–4)
**Goal**: Remove dependency on Claude Code CLI — the biggest unlock

#### 3.1 Convert Prompts to API Calls
- The current tool runs as Claude Code slash-commands reading local `.md` files
- Convert `modes/oferta.md`, `modes/pdf.md`, `modes/scan.md` → pure Anthropic SDK calls
- New endpoint: `POST /api/evaluate` → `{ jobUrl, userId }` → calls Anthropic, returns structured JSON
- New endpoint: `POST /api/generate-pdf` → triggers Playwright PDF pipeline, uploads to storage
- User brings their own key OR you absorb cost (see pricing note below)

> **Pricing note**: At $9/mo, absorbing Anthropic costs is risky (evaluation ~= $0.05–0.20 per job with Claude Haiku). With 30 evals/mo limit → max $6 cost per Pro user → margin is thin. Better option for launch: **"Bring Your Own Key" (BYOK)** — user pastes their Anthropic API key in Settings → encrypted → used server-side. Removes your cost risk entirely.

#### 3.2 Settings Page (Frontend)
- Add `/settings` route
- Fields: Anthropic API key (encrypted storage), target roles, target locations, salary range
- Pull from Supabase `user_settings` table (replaces local `config/profile.yml`)
- Deliverable: Onboarding takes 5 minutes, no YAML editing required

---

### PHASE 4 — Retention Features (Week 4–5)
**Goal**: Make users stay and invite friends

#### 4.1 Email Job Digest
- Tech: **Resend.com** (3k emails/day free tier) + **Inngest** or **cron job**
- Nightly job: for every Pro+ user, run portal scan for their target companies
- Filter results by their profile (role types, locations, salary range)
- Send "5 new matched jobs for you this week" email
- This is the retention killer feature — passive value delivered while sleeping

#### 4.2 STAR Story Bank
- Migrate `interview-prep` mode to store extracted STAR stories per user in Supabase
- Deduplicate across evaluations (same story can apply to multiple jobs)
- Frontend: `/stories` page showing accumulated behavioral interview answers
- Export as PDF for interview prep sessions

#### 4.3 LinkedIn Outreach Generator
- Wrap `modes/contacto.md` as a UI: paste LinkedIn profile URL → get personalized outreach message
- Available in Accelerator tier only

---

### PHASE 5 — Launch & Growth (Week 5–6)
**Goal**: Get first 100 paying users

#### 5.1 Landing Page
- Convert the README into a proper sales page
- Headline: "Stop spray-and-pray. Apply smarter."
- Show: how it works (3 steps), features, pricing table, FAQ
- Tech: Simple HTML/CSS page at root, or a separate Vite app
- Deploy to Vercel (free)

#### 5.2 Product Hunt Launch
- Set up PH page with demo GIF (same one from README)
- Launch on a Tuesday/Wednesday (best traffic days)
- 200+ upvotes = front page = ~500-1000 signups in 24 hours
- Have coupon code ready: "PH50" = 50% off first 3 months

#### 5.3 Content / SEO
- Blog posts: "How I evaluated 740 job offers with AI", "ATS resume tips 2026"
- Target keywords: "AI job application tool", "ATS resume optimizer", "job tracker app"
- Post demo videos on LinkedIn and X/Twitter (job search audience is huge)

---

## 🎯 Tech Stack (Final Architecture)

```
┌─────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                        │
│         React + Vite (deployed to Vercel)                │
│    Auth: Clerk.dev | Billing: Stripe Checkout            │
└─────────────────────────────┬───────────────────────────┘
                              │ HTTPS
┌─────────────────────────────▼───────────────────────────┐
│                   BACKEND API (Node.js)                  │
│              server.mjs + Express                        │
│         Deployed on Railway.app (~$5/mo)                 │
│                                                          │
│  Routes:                                                 │
│  POST /api/evaluate      → Anthropic API call            │
│  POST /api/generate-pdf  → Playwright → Storage          │
│  POST /api/scan          → ScraperAPI → filter           │
│  GET  /api/applications  → Supabase query (by userId)    │
│  POST /api/stripe/webhook → update plan in DB            │
└──────┬──────────────────────────┬───────────────────────┘
       │                          │
┌──────▼──────┐          ┌────────▼────────┐
│  Supabase   │          │  Anthropic API   │
│  Postgres   │          │  (user's key or  │
│  + Storage  │          │   pooled keys)   │
│  (free tier)│          └─────────────────┘
└─────────────┘
       +
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Resend.com  │  │ ScraperAPI  │  │ Cloudflare  │
│  (email)    │  │ (scraping)  │  │   R2 (PDF)  │
└─────────────┘  └─────────────┘  └─────────────┘
```

### Monthly Infrastructure Cost
| Service | Cost |
|---------|------|
| Vercel (frontend) | Free |
| Railway.app (backend) | ~$5/mo |
| Supabase (DB + storage) | Free (up to 50k rows) |
| Clerk.dev (auth) | Free (up to 10k MAU) |
| Resend.com (email) | Free (3k/day) |
| ScraperAPI (job scraping) | $29/mo |
| Stripe | 2.9% + $0.30/transaction |
| **TOTAL** | **~$34/mo** |

**Break-even**: 4 Pro subscribers

---

## 📦 Quick Wins — Ship This Week (No Backend Needed)

These are frontend fixes and polish items that make the product feel real:

| Task | File | Time | Why |
|------|------|------|-----|
| Fix hardcoded "Salman Agha" → dynamic from API/settings | `App.jsx` line 68, 78 | 30 min | Every user sees wrong name |
| Fix avg score: compute actual average from all apps | `App.jsx` line 95 | 20 min | Current code uses `[0]` not avg |
| Add "Paste Job URL" input → POST to evaluate endpoint | `App.jsx` | 2 hrs | Core user action |
| Add Settings page with API key field | New file | 1 hr | Unlock BYOK |
| Add Stripe "Upgrade" button in sidebar | `App.jsx` sidebar | 1 hr | Revenue |
| Add 4th Kanban column: "Interviews" | `App.jsx` | 30 min | More realistic pipeline |
| Fix modal: render markdown properly (use react-markdown) | `App.jsx` | 1 hr | Raw markdown is ugly |

---

## 🔑 The One Insight

> The single biggest technical unlock is converting the Claude Code slash-command
> prompts (`modes/*.md`) into server-side Anthropic API calls. Right now the tool
> only works if Claude Code CLI is running on someone's local machine.
> Once those prompts run on your server, any user can open a browser, sign up,
> paste a job URL, and get a full evaluation in 30 seconds — with zero setup.
> **That is the product. That is what people will pay $9/month for.**

---

## 📅 Timeline Summary

| Week | Milestone |
|------|-----------|
| Week 1 | Auth (Clerk) + Stripe billing + upgrade modal |
| Week 2 | Supabase DB + multi-tenant API + usage gating |
| Week 3 | Convert AI modes to API calls + Settings page (BYOK) |
| Week 4 | Email digest + STAR story bank |
| Week 5 | Landing page + Product Hunt prep |
| Week 6 | PH launch + first 100 users |

---

## 💡 Naming Options (Career-Ops is too dev-facing for a SaaS)

| Name | Why |
|------|-----|
| **JobPilot** | Clean, SaaS-y, memorable |
| **ApplyIQ** | Signals intelligence/smart matching |
| **RoleMatch** | Simple, direct, clear |
| **HireReady** | Action-oriented, outcome-focused |
| **OfferOS** | Nods to technical audience, feels premium |

---

*This plan was generated: 2026-04-08*
*Product: Career-Ops (Tool1) + React frontend (Tool1/frontend)*
*Author: Salman Agha*
