# AutoHyre — Backend
> AI-powered recruitment automation platform. Python/FastAPI backend.  
> **This README is the source of truth for Copilot/AI agents building this system.**

---

## What This Backend Does

AutoHyre has two distinct hiring modes that run in parallel:

**Mode A — Inbound (Application Pipeline)**  
Company creates a job → backend generates a unique short link → link posted on LinkedIn/Indeed/anywhere → candidates land on a dynamic application page → form submitted → stored in DB → AI screens and scores → automations fire (emails, stage moves, notifications)

**Mode B — Outbound (Sourcing Pipeline)**  
Company sets sourcing criteria → backend scrapes LinkedIn/GitHub/Indeed with AI-assisted search → candidate profiles collected → AI scores them against the job → above-threshold candidates surfaced → outreach automations triggered

Both modes feed into the same **Hiring Pipeline** — a kanban-style board where recruiters manage candidates through stages.

---

## Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | FastAPI 0.111+ | Async, fast, great DX |
| Language | Python 3.12 | Type hints, async/await |
| ORM | SQLAlchemy 2.0 (async) | Declarative models, migrations |
| DB | PostgreSQL 15 | JSONB for flexible schemas |
| Migrations | Alembic | Version-controlled schema |
| Queue | Redis 7 + Celery 5 | Background tasks, scheduling |
| Scraping | Playwright (async) | Browser automation |
| AI screening | Anthropic Claude API | Resume parsing, scoring, reasoning |
| Email | Resend SDK | Transactional emails from autohyre.com |
| Auth | JWT + bcrypt | Multi-tenant SaaS auth |
| Validation | Pydantic v2 | Request/response schemas |
| Testing | pytest + httpx | Async test client |
| Containerisation | Docker + docker-compose | Dev and production parity |

---

## Architecture — MVC + Service Layer

```
Request → Router → Service → Repository → Database
                ↓
           Background Task (Celery)
                ↓
        AI Engine / Scraper / Email
```

### Layer responsibilities

**Routers** (`app/api/v1/`) — HTTP only. Validate input with Pydantic, call service, return response. No business logic here.

**Services** (`app/services/`) — All business logic. Orchestrate repositories, call AI, fire Celery tasks. One service per domain.

**Repositories** (`app/repositories/`) — All DB queries. SQLAlchemy async sessions. No raw SQL except for complex aggregations.

**Models** (`app/models/`) — SQLAlchemy ORM models. One file per table group.

**Schemas** (`app/schemas/`) — Pydantic request/response models. Separate from ORM models.

**Workers** (`app/workers/`) — Celery tasks. Call services, do not contain logic themselves.

**AI** (`app/ai/`) — Prompt builders, Claude API calls, response parsers.

**Scrapers** (`app/scrapers/`) — Playwright automation per platform.

---

## Project Structure

```
autohyre-backend/
├── app/
│   ├── main.py                     # FastAPI app factory, middleware, routers
│   ├── config.py                   # Settings via pydantic-settings + .env
│   ├── database.py                 # Async SQLAlchemy engine + session factory
│   │
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py             # Register, login, refresh, logout
│   │       ├── organisations.py    # Org CRUD (SaaS tenant management)
│   │       ├── jobs.py             # Create job, generate link, get status
│   │       ├── applications.py     # Public apply endpoint + recruiter views
│   │       ├── candidates.py       # Candidate profiles, sourcing results
│   │       ├── pipeline.py         # Move candidate through stages
│   │       ├── sourcing.py         # Trigger + manage sourcing runs
│   │       ├── automations.py      # CRUD automation rules
│   │       ├── workflows.py        # Workflow execution log
│   │       └── analytics.py        # Hiring funnel metrics
│   │
│   ├── models/
│   │   ├── user.py                 # User, Organisation, Membership
│   │   ├── job.py                  # Job, JobLink
│   │   ├── candidate.py            # Candidate, Application, AIScore
│   │   ├── pipeline.py             # PipelineStage, CandidateStage
│   │   ├── automation.py           # AutomationRule, AutomationLog
│   │   ├── sourcing.py             # SourcingRun, SourcingResult
│   │   └── email.py                # EmailLog
│   │
│   ├── schemas/
│   │   ├── auth.py
│   │   ├── job.py
│   │   ├── application.py
│   │   ├── candidate.py
│   │   ├── pipeline.py
│   │   ├── automation.py
│   │   └── sourcing.py
│   │
│   ├── services/
│   │   ├── auth_service.py         # Register, login, token management
│   │   ├── job_service.py          # Create job, generate short link
│   │   ├── application_service.py  # Receive application, trigger AI screen
│   │   ├── ai_service.py           # Score candidate, parse resume, reason
│   │   ├── pipeline_service.py     # Move stages, enforce rules
│   │   ├── automation_service.py   # Evaluate rules, fire actions
│   │   ├── email_service.py        # Send transactional emails via Resend
│   │   ├── sourcing_service.py     # Orchestrate scraping runs
│   │   └── analytics_service.py    # Compute funnel metrics
│   │
│   ├── repositories/
│   │   ├── user_repo.py
│   │   ├── job_repo.py
│   │   ├── application_repo.py
│   │   ├── candidate_repo.py
│   │   ├── pipeline_repo.py
│   │   ├── automation_repo.py
│   │   └── sourcing_repo.py
│   │
│   ├── ai/
│   │   ├── screener.py             # Score a candidate against a job (0-100)
│   │   ├── parser.py               # Extract structured data from resume text
│   │   ├── recommender.py          # When pipeline is thin, recommend sourcing
│   │   └── prompts.py              # All prompt templates (versioned)
│   │
│   ├── scrapers/
│   │   ├── base.py                 # Base scraper class, proxy + stealth setup
│   │   ├── linkedin.py             # LinkedIn profile + job search scraper
│   │   ├── github.py               # GitHub API + profile scraper
│   │   └── indeed.py               # Indeed candidate scraper
│   │
│   ├── workers/
│   │   ├── celery_app.py           # Celery factory + beat schedule
│   │   ├── screening_tasks.py      # screen_candidate, bulk_screen
│   │   ├── sourcing_tasks.py       # run_sourcing, process_sourced_candidate
│   │   ├── automation_tasks.py     # evaluate_automations, send_email
│   │   └── analytics_tasks.py      # compute_daily_metrics
│   │
│   ├── core/
│   │   ├── security.py             # JWT create/verify, bcrypt hash
│   │   ├── dependencies.py         # FastAPI deps: get_db, get_current_user
│   │   ├── exceptions.py           # Custom HTTP exceptions
│   │   └── middleware.py           # CORS, request ID, tenant context
│   │
│   └── utils/
│       ├── short_link.py           # Generate unique 8-char job slugs
│       ├── pdf_parser.py           # Extract text from resume PDFs
│       └── pagination.py           # Cursor-based pagination helpers
│
├── alembic/
│   ├── env.py
│   └── versions/                   # Migration files
│
├── tests/
│   ├── conftest.py                 # Async test client, test DB setup
│   ├── test_auth.py
│   ├── test_jobs.py
│   ├── test_applications.py
│   ├── test_ai_screening.py
│   ├── test_automations.py
│   └── test_sourcing.py
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile
├── requirements.txt
├── .env.example
└── README.md
```

---

## Database Schema

### Multi-tenancy
Every table that holds company data has an `organisation_id` foreign key. All queries in repositories must filter by the current org from JWT context. This is enforced at the service layer.

### Core tables

```sql
-- SaaS tenants
organisations (id, name, slug, plan, created_at)
users (id, email, password_hash, name, role, org_id, created_at)

-- Jobs and their apply links
jobs (
  id UUID PK,
  org_id UUID FK,
  title VARCHAR,
  description TEXT,
  requirements JSONB,          -- ["React", "3+ years", "TypeScript"]
  location VARCHAR,
  remote BOOLEAN,
  status VARCHAR,              -- draft | active | closed
  min_ai_score INTEGER,        -- threshold: below this = reserve, not reject
  pipeline_stages JSONB,       -- ["Applied", "Screening", "Interview", "Offer"]
  created_at, updated_at
)

job_links (
  id UUID PK,
  job_id UUID FK,
  slug VARCHAR(8) UNIQUE,      -- e.g. "ax7k9m2p" → autohyre.com/apply/ax7k9m2p
  source VARCHAR,              -- linkedin | indeed | direct | custom
  label VARCHAR,               -- recruiter-friendly label "LinkedIn Jan 2025"
  active BOOLEAN,
  click_count INTEGER,
  created_at
)

-- Candidates (unified for both inbound + sourced)
candidates (
  id UUID PK,
  org_id UUID FK,
  email VARCHAR,
  name VARCHAR,
  phone VARCHAR,
  linkedin_url VARCHAR,
  github_url VARCHAR,
  resume_url TEXT,
  resume_text TEXT,            -- extracted plain text for AI
  source VARCHAR,              -- applied | sourced_linkedin | sourced_github
  raw_profile JSONB,           -- original scraped data
  created_at
)

-- Applications (inbound via apply link)
applications (
  id UUID PK,
  job_id UUID FK,
  candidate_id UUID FK,
  job_link_id UUID FK,         -- which link they came from
  form_data JSONB,             -- all dynamic form fields
  ai_score INTEGER,            -- 0-100
  ai_reasoning TEXT,
  ai_label VARCHAR,            -- strong_fit | good_fit | reserve | screened_out
  status VARCHAR,              -- pending_ai | ai_complete | in_pipeline | reserve | rejected
  current_stage VARCHAR,
  created_at
)

-- Pipeline (stage movement log)
pipeline_events (
  id UUID PK,
  application_id UUID FK,
  from_stage VARCHAR,
  to_stage VARCHAR,
  moved_by UUID FK,            -- user or NULL (automated)
  note TEXT,
  created_at
)

-- Sourcing
sourcing_runs (
  id UUID PK,
  job_id UUID FK,
  org_id UUID FK,
  platforms JSONB,             -- ["linkedin", "github"]
  criteria JSONB,              -- search terms, skills, location
  status VARCHAR,              -- queued | running | complete | failed
  candidates_found INTEGER,
  candidates_scored INTEGER,
  created_at, completed_at
)

sourcing_results (
  id UUID PK,
  run_id UUID FK,
  candidate_id UUID FK,
  job_id UUID FK,
  ai_score INTEGER,
  ai_reasoning TEXT,
  outreach_status VARCHAR,     -- pending | sent | replied | not_sent
  created_at
)

-- Automations
automation_rules (
  id UUID PK,
  org_id UUID FK,
  job_id UUID FK nullable,     -- NULL = applies to all jobs in org
  name VARCHAR,
  trigger VARCHAR,             -- application_received | score_computed | stage_changed | daily_digest
  conditions JSONB,            -- [{"field": "ai_score", "op": "gte", "value": 80}]
  action VARCHAR,              -- send_email | move_stage | notify_slack | webhook
  action_config JSONB,         -- {template: "received", to: "candidate"} or {to: "recruiter"}
  active BOOLEAN,
  created_at
)

automation_logs (
  id UUID PK,
  rule_id UUID FK,
  application_id UUID FK,
  triggered_at TIMESTAMP,
  success BOOLEAN,
  error TEXT
)

-- Email
email_logs (
  id UUID PK,
  org_id UUID FK,
  to_email VARCHAR,
  template VARCHAR,
  subject VARCHAR,
  status VARCHAR,              -- sent | failed | bounced
  resend_id VARCHAR,
  created_at
)
```

---

## Key Flows

### Flow 1 — Inbound Application

```
1. POST /api/v1/jobs           → create job, returns job_id
2. POST /api/v1/jobs/{id}/links → generate short slug, specify source (linkedin|indeed|direct)
   → returns { url: "https://autohyre.com/apply/ax7k9m2p", slug: "ax7k9m2p" }

3. Candidate visits /apply/ax7k9m2p  (served by Next.js frontend)
   → GET /api/v1/applications/form/{slug}  → returns job title, fields config, company branding

4. Candidate submits form
   → POST /api/v1/applications/submit/{slug}
   → Saves candidate + application to DB
   → Increments job_links.click_count
   → Returns 201 { message: "Application received" }
   → Fires Celery task: screen_candidate.delay(application_id)

5. screen_candidate worker:
   → Parse resume PDF if uploaded (pdf_parser.py)
   → Build prompt with job requirements + candidate data
   → Call Claude API → get score (0-100), reasoning, label
   → Save ai_score, ai_reasoning, ai_label to application
   → If score >= job.min_ai_score → status = "in_pipeline", stage = first stage
   → If score < job.min_ai_score → status = "reserve"  (NOT deleted, kept for recommendation)
   → Fire Celery task: evaluate_automations.delay(application_id, trigger="score_computed")

6. evaluate_automations worker:
   → Load all active rules for this job + org
   → For each rule where trigger matches and conditions pass → fire action
   → Actions: send_email (Resend), move_stage, webhook
   → Log each execution to automation_logs

7. GET /api/v1/jobs/{id}/applications → recruiter sees pipeline with scores
```

### Flow 2 — Outbound Sourcing

```
1. POST /api/v1/sourcing        → create sourcing run with criteria
   → { job_id, platforms: ["linkedin","github"], skills: ["React"], location: "Doha" }

2. Fires Celery task: run_sourcing.delay(run_id)

3. run_sourcing worker:
   → For each platform: launch scraper with proxy
   → LinkedIn: search people by skills + location → collect profiles
   → GitHub: search users by language + location → collect profiles
   → Upsert into candidates table (dedup by email/linkedin_url)
   → For each candidate: fire score_sourced_candidate.delay(candidate_id, job_id)

4. score_sourced_candidate worker:
   → Build prompt: job requirements vs scraped profile
   → Call Claude → score + reasoning
   → Save to sourcing_results
   → If score >= threshold → status = surfaced (recruiter sees them)
   → If score < threshold → stored but hidden unless recruiter digs

5. GET /api/v1/sourcing/{run_id}/results → returns scored candidates sorted by score
```

### Flow 3 — Automation Rules

```
Triggers:
  application_received    → fires immediately when application saved
  score_computed          → fires after AI screening completes
  stage_changed           → fires when candidate moved in pipeline
  daily_digest            → fires on Celery Beat schedule (9am org timezone)

Conditions (evaluated client-side logic on server):
  ai_score >= 80
  ai_score < job.min_ai_score
  current_stage == "Interview"
  source == "linkedin"

Actions:
  send_email → to candidate (received, rejected, shortlisted, interview_invite)
               to recruiter (new_high_score, daily_summary)
  move_stage → auto-advance candidate to next stage
  webhook    → POST to recruiter's Slack / Zapier / custom URL

Email templates (Resend):
  application_received    → "We got your application for {job_title}"
  application_rejected    → "Thank you for applying to {job_title}..."
  shortlisted             → "You've been shortlisted for {job_title}"
  interview_invite        → "We'd like to interview you for {job_title}"
  daily_digest            → "{n} new applications, {m} high scores today"
```

### Flow 4 — Reserve + Recommendations

```
When pipeline has < 5 candidates in Screening stage:
  → ai_service.recommend_from_reserve(job_id) is called
  → Fetches top reserve candidates (below threshold but closest to it)
  → Returns them with note: "Pipeline running low — consider these near-miss candidates"
  → Recruiter can manually promote them into the pipeline

Reserve candidates are NEVER deleted.
They remain queryable at GET /api/v1/jobs/{id}/applications?status=reserve
```

---

## AI Screening — Prompt Architecture

### Scoring prompt (screener.py)
```python
SCREENING_SYSTEM = """
You are an expert technical recruiter AI for AutoHyre.
Your job is to evaluate a candidate's suitability for a specific role.
You must return ONLY valid JSON — no prose, no markdown.
"""

SCREENING_USER = """
Job: {job_title}
Requirements: {requirements_list}
Location requirement: {location}

Candidate:
Name: {name}
Resume: {resume_text}
LinkedIn summary: {linkedin_summary}
GitHub: {github_profile}

Evaluate this candidate and return:
{{
  "score": <integer 0-100>,
  "label": <"strong_fit" | "good_fit" | "reserve" | "screened_out">,
  "reasoning": "<2-3 sentences explaining the score>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "gaps": ["<gap 1>", "<gap 2>"],
  "qualified": <true if score >= 60>
}}

Scoring guide:
80-100 = strong match, meets almost all requirements
60-79  = good match, meets core requirements with some gaps
40-59  = partial match, worth keeping as reserve
0-39   = does not meet minimum requirements
"""
```

### Resume parser prompt (parser.py)
```python
# Extracts structured data from raw resume text
# Returns: { name, email, phone, skills[], experience[], education[], years_total }
```

---

## Authentication — Multi-tenant SaaS

```
POST /api/v1/auth/register     → create org + admin user
POST /api/v1/auth/login        → returns { access_token, refresh_token }
POST /api/v1/auth/refresh      → rotate access token
POST /api/v1/auth/logout       → blacklist refresh token in Redis
POST /api/v1/auth/invite       → invite team member to org
GET  /api/v1/auth/me           → current user + org context

JWT payload:
{
  "sub": "user_id",
  "org_id": "org_id",
  "role": "admin | recruiter | viewer",
  "exp": 1234567890
}

Role permissions:
  admin     → full access including billing, org settings, user management
  recruiter → create jobs, manage pipeline, set automations
  viewer    → read-only access to pipeline and analytics
```

---

## Short Link Generation

```python
# utils/short_link.py
# Generates 8-character URL-safe slugs
# Checks DB for collision, regenerates if taken
# Example: "ax7k9m2p" → autohyre.com/apply/ax7k9m2p

# Each job can have multiple links (one per source)
# LinkedIn link, Indeed link, company careers page link — all separate
# Recruiter sees which source brought the most applicants in analytics
```

---

## Celery Tasks and Schedule

```python
# workers/celery_app.py

# On-demand tasks (fired by API):
screen_candidate(application_id)           # runs within seconds of application
evaluate_automations(application_id, trigger)
run_sourcing(sourcing_run_id)
score_sourced_candidate(candidate_id, job_id)
send_transactional_email(email_log_id)

# Scheduled tasks (Celery Beat):
compute_daily_metrics()                    # 8:00 AM UTC daily
send_daily_digests()                       # 9:00 AM per org timezone
cleanup_old_sourcing_data()                # Sundays 2:00 AM
```

---

## API Endpoints Summary

```
AUTH
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me

JOBS
GET    /api/v1/jobs                         # list org's jobs
POST   /api/v1/jobs                         # create job
GET    /api/v1/jobs/{id}                    # job detail
PATCH  /api/v1/jobs/{id}                    # update job
DELETE /api/v1/jobs/{id}                    # soft delete
POST   /api/v1/jobs/{id}/links              # generate apply link for source
GET    /api/v1/jobs/{id}/links              # list all links + click counts
GET    /api/v1/jobs/{id}/stats              # applicant counts per stage, score distribution

APPLICATIONS (public — no auth)
GET    /api/v1/applications/form/{slug}     # get job info + form config for apply page
POST   /api/v1/applications/submit/{slug}   # submit application

APPLICATIONS (private — recruiter)
GET    /api/v1/jobs/{id}/applications       # list applications with filters + pagination
GET    /api/v1/applications/{id}            # full application detail + AI score
GET    /api/v1/jobs/{id}/applications?status=reserve  # view reserve pool
POST   /api/v1/applications/{id}/promote    # move reserve → pipeline manually

PIPELINE
POST   /api/v1/pipeline/move               # move candidate to next/any stage
GET    /api/v1/pipeline/{job_id}           # kanban data: stages + candidate counts

SOURCING
POST   /api/v1/sourcing                    # start sourcing run
GET    /api/v1/sourcing                    # list sourcing runs
GET    /api/v1/sourcing/{id}               # run status + progress
GET    /api/v1/sourcing/{id}/results       # scored candidates from this run

AUTOMATIONS
GET    /api/v1/automations                 # list org's rules
POST   /api/v1/automations                 # create rule
PATCH  /api/v1/automations/{id}            # update rule
DELETE /api/v1/automations/{id}
GET    /api/v1/automations/{id}/logs       # execution history

ANALYTICS
GET    /api/v1/analytics/funnel            # stage conversion rates
GET    /api/v1/analytics/sources           # applications per link source
GET    /api/v1/analytics/timeline          # applications over time
```

---

## Environment Variables

```bash
# .env.example

# App
APP_ENV=development
SECRET_KEY=generate-with-openssl-rand-hex-32
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/autohyre
REDIS_URL=redis://localhost:6379/0

# AI
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
AI_SCORE_RESERVE_THRESHOLD=60   # below this = reserve (kept, not deleted)

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@autohyre.com
EMAIL_REPLY_TO=support@autohyre.com

# Scraping
PROXY_URL=http://username:password@proxy.webshare.io:80
PROXY_ENABLED=true
LINKEDIN_EMAIL=scraper@yourdomain.com
LINKEDIN_PASSWORD=...
CAPTCHA_API_KEY=...   # 2Captcha for LinkedIn

# Short links
SHORT_LINK_BASE_URL=https://autohyre.com/apply
SHORT_LINK_LENGTH=8

# JWT
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# Celery
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2
```

---

## Setup

```bash
# 1. Clone and install
git clone https://github.com/kisugez/autohyre-backend
cd autohyre-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 2. Install Playwright browsers (for scraping)
playwright install chromium

# 3. Configure environment
cp .env.example .env
# Edit .env with your values

# 4. Start services
docker-compose up -d db redis

# 5. Run migrations
alembic upgrade head

# 6. Start API server
uvicorn app.main:app --reload --port 8000

# 7. Start Celery worker (separate terminal)
celery -A app.workers.celery_app worker --loglevel=info

# 8. Start Celery Beat scheduler (separate terminal)
celery -A app.workers.celery_app beat --loglevel=info
```

---

## Docker Compose

```yaml
services:
  api:
    build: .
    ports: ["8000:8000"]
    env_file: .env
    depends_on: [db, redis]
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000

  worker:
    build: .
    env_file: .env
    depends_on: [db, redis]
    command: celery -A app.workers.celery_app worker --loglevel=info --concurrency=4

  beat:
    build: .
    env_file: .env
    depends_on: [db, redis]
    command: celery -A app.workers.celery_app beat --loglevel=info

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: autohyre
      POSTGRES_PASSWORD: autohyre
      POSTGRES_DB: autohyre
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    volumes: [redis_data:/data]

volumes:
  postgres_data:
  redis_data:
```

---

## Testing

```bash
# Run all tests
pytest

# With coverage
pytest --cov=app --cov-report=html

# Specific domain
pytest tests/test_applications.py -v
pytest tests/test_ai_screening.py -v

# Test markers
pytest -m "not scraping"    # skip scraper tests (need proxy)
pytest -m "not slow"        # skip AI tests (cost money)
```

### Test structure
- `conftest.py` creates a test PostgreSQL DB, seeds base org + user, provides async test client
- AI tests mock the Anthropic API — no real API calls in CI
- Scraper tests are marked `@pytest.mark.scraping` and skipped in CI

---

## Copilot Agent Implementation Notes

When implementing this codebase, follow this order:

1. **Start with models + migrations** — get the schema right first
2. **Auth** — register, login, JWT middleware, dependency injection
3. **Jobs + short links** — create job, generate slug, store job_links
4. **Public apply endpoint** — `GET /form/{slug}` and `POST /submit/{slug}` with no auth
5. **AI screening worker** — Celery task that calls Claude, saves score, sets status
6. **Pipeline** — stage management, movement API
7. **Automations** — rule evaluation engine, email sending via Resend
8. **Sourcing** — scrapers + scoring workers (most complex, do last)
9. **Analytics** — aggregation queries, funnel data

**Critical invariants to enforce in code:**
- Candidates below `min_ai_score` are NEVER deleted — they go to `status=reserve`
- All DB queries filter by `org_id` — never return data across tenant boundaries
- Short link slugs are unique — always check before insert
- AI prompts always request JSON — wrap all Claude calls in try/except with retry
- Email sends are async via Celery — never block the request thread for email
