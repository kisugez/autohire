# Backend Architecture

FastAPI server with Playwright scrapers, AI screening, and workflow automation engine.

---

## How It Works

The backend orchestrates all automation, data processing, and external integrations.

### Request Lifecycle

**1. API Request Arrives**
```
POST /api/v1/workflows/{id}/execute
  ↓
FastAPI route handler
  ↓
Validate request with Pydantic schema
  ↓
Check JWT authentication
  ↓
Load workflow from PostgreSQL
  ↓
Queue execution task in Redis
  ↓
Return 202 Accepted
```

**2. Background Worker Processes Task**
```
Workflow Engine polls Redis queue
  ↓
Dequeue task
  ↓
Load workflow actions
  ↓
Execute actions sequentially:
  
  For each action:
    - Load action executor
    - Inject dependencies (DB, AI client, proxies)
    - Execute with previous action's output
    - Save result to database
    - Pass data to next action
  
  ↓
Mark workflow execution as complete
  ↓
Send webhook/notification (if configured)
```

**3. Scraper Execution (Example: LinkedIn)**
```
LinkedIn scraper receives job data
  ↓
Launch Playwright browser with:
  - Residential proxy
  - Stealth plugins
  - Random user agent
  ↓
Navigate to linkedin.com/login
  ↓
Fill credentials with human-like typing
  - Random delays between keystrokes
  - Mouse movements
  ↓
Solve CAPTCHA if presented (2Captcha API)
  ↓
Navigate to job posting form
  ↓
Fill fields, upload to our application URL
  ↓
Submit → Get job ID
  ↓
Save to database
  ↓
Close browser, release proxy
```

**4. AI Screening (Example)**
```
Receive candidate profile from previous action
  ↓
Extract resume text (if PDF/DOCX)
  ↓
Build prompt:
  "Job requirements: [list]
   Candidate: [profile data]
   Score 0-100 and explain"
  ↓
Send to OpenAI GPT-4
  ↓
Parse response JSON:
  {score: 85, reasoning: "...", qualified: true}
  ↓
Update candidate in database
  ↓
If score < threshold: auto-reject
  If score >= threshold: continue to next action
```

### Goals

- **High throughput** - Handle 100+ candidates/hour
- **Fault tolerance** - Retry failed scrapers, queue backups
- **Stealth scraping** - Avoid bans with proxies + delays
- **Accurate AI** - Consistent candidate evaluation
- **Cost efficiency** - Optimize API calls, caching

---

## Architecture

```mermaid
graph TB
    subgraph "API Routes"
        JOBS_API[Jobs API]
        CANDIDATES_API[Candidates API]
        WORKFLOWS_API[Workflows API]
        SCRAPE_API[Scrape API]
    end

    subgraph "Services"
        WORKFLOW_ENGINE[Workflow Engine<br/>Execution & Scheduling]
        AI_SERVICE[AI Screening<br/>Resume Analysis]
        EMAIL_SERVICE[Email Service<br/>SMTP]
    end

    subgraph "Scrapers"
        LINKEDIN_SCRAPER[LinkedIn Scraper<br/>Playwright]
        INDEED_SCRAPER[Indeed Scraper<br/>Playwright]
        GITHUB_SCRAPER[GitHub Scraper<br/>REST API]
    end

    subgraph "Database"
        POSTGRES[(PostgreSQL)]
        REDIS[(Redis Queue)]
    end

    subgraph "External"
        PROXIES[Residential Proxies<br/>Smartproxy]
        OPENAI[OpenAI API]
        CAPTCHA[2Captcha]
    end

    JOBS_API --> POSTGRES
    CANDIDATES_API --> POSTGRES
    WORKFLOWS_API --> WORKFLOW_ENGINE
    SCRAPE_API --> LINKEDIN_SCRAPER
    SCRAPE_API --> INDEED_SCRAPER

    WORKFLOW_ENGINE --> LINKEDIN_SCRAPER
    WORKFLOW_ENGINE --> INDEED_SCRAPER
    WORKFLOW_ENGINE --> GITHUB_SCRAPER
    WORKFLOW_ENGINE --> AI_SERVICE
    WORKFLOW_ENGINE --> EMAIL_SERVICE
    WORKFLOW_ENGINE --> REDIS

    LINKEDIN_SCRAPER --> PROXIES
    INDEED_SCRAPER --> PROXIES
    LINKEDIN_SCRAPER --> CAPTCHA
    INDEED_SCRAPER --> CAPTCHA
    LINKEDIN_SCRAPER --> POSTGRES
    INDEED_SCRAPER --> POSTGRES
    GITHUB_SCRAPER --> POSTGRES

    AI_SERVICE --> OPENAI
    AI_SERVICE --> POSTGRES
```

---

## Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | FastAPI | Async API framework |
| **Language** | Python 3.11+ | Backend logic |
| **Database** | PostgreSQL 15 | Primary data store |
| **ORM** | SQLAlchemy | Database models |
| **Cache** | Redis 7 | Queue & caching |
| **Scraping** | Playwright | Browser automation |
| **AI** | OpenAI GPT-4 | Resume screening |
| **Auth** | JWT | Authentication |
| **Validation** | Pydantic | Schema validation |
| **Migrations** | Alembic | Database migrations |

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                # FastAPI app entry
│   ├── api/
│   │   └── v1/
│   │       ├── jobs.py        # Job endpoints
│   │       ├── candidates.py  # Candidate endpoints
│   │       ├── workflows.py   # Workflow endpoints
│   │       └── scrape.py      # Scraping triggers
│   ├── core/
│   │   ├── config.py          # Settings
│   │   ├── database.py        # DB connection
│   │   └── security.py        # Auth logic
│   ├── models/
│   │   ├── job.py             # Job model
│   │   ├── candidate.py       # Candidate model
│   │   └── workflow.py        # Workflow model
│   ├── schemas/
│   │   ├── job.py             # Job Pydantic schemas
│   │   ├── candidate.py       # Candidate schemas
│   │   └── workflow.py        # Workflow schemas
│   ├── scrapers/
│   │   ├── base.py            # Base scraper class
│   │   ├── linkedin.py        # LinkedIn automation
│   │   ├── indeed.py          # Indeed automation
│   │   └── github.py          # GitHub API client
│   ├── ai/
│   │   ├── screening.py       # Resume AI scoring
│   │   └── prompts.py         # AI prompts
│   ├── workflows/
│   │   ├── engine.py          # Execution engine
│   │   ├── actions.py         # Available actions
│   │   └── scheduler.py       # Cron scheduling
│   └── services/
│       ├── email.py           # Email sending
│       └── storage.py         # File uploads
├── tests/
│   ├── test_scrapers.py
│   ├── test_workflows.py
│   └── test_ai.py
├── alembic/                   # Database migrations
├── requirements.txt
└── .env.example
```

---

## Key Features

### 1. Web Scraping (Risky Method)
- **Playwright** automation for LinkedIn/Indeed
- **Residential proxies** to avoid IP bans
- **2Captcha** integration for solving CAPTCHAs
- **Stealth mode** with puppeteer-extra patterns
- **Random delays** to mimic human behavior

### 2. AI Candidate Screening
- **Resume parsing** from PDF/DOCX
- **GPT-4 scoring** based on job requirements
- **Auto-rejection** of candidates below threshold
- **Reasoning generation** for hiring decisions

### 3. Workflow Engine
- **Visual workflow execution** from React Flow
- **Action library** (search, email, score, etc.)
- **Trigger system** (manual, scheduled, webhook)
- **Variable interpolation** between steps

### 4. Email Automation
- **Gmail OAuth** for personal sending
- **SendGrid/SMTP** for bulk campaigns
- **Template system** with personalization
- **Response tracking**

---

## Requirements

### System Requirements
- **Python** 3.11+ (3.12 recommended)
- **PostgreSQL** 15+ 
- **Redis** 7+
- **Memory** 2GB minimum (4GB recommended)
- **Storage** 5GB minimum for dependencies + browsers

### Required External Services
- **Residential Proxies** - Smartproxy ($75/month) or Bright Data ($500/month)
  - Needed for LinkedIn/Indeed scraping
  - Must support HTTP/HTTPS with authentication
- **OpenAI API** - GPT-4 access
  - $5 free credit for new accounts
  - ~$0.02 per candidate screened
  - Rate limit: 10,000 tokens/minute (free tier)
- **Email Provider** - Gmail or SendGrid
  - Gmail: 100 emails/day free (OAuth required)
  - SendGrid: 100 emails/day free tier

### Optional Services
- **2Captcha** - For solving CAPTCHAs ($3 per 1000)
- **Apollo.io** - Legal LinkedIn data alternative ($49/month)
- **Supabase** - Managed PostgreSQL ($25/month)

### Development Tools
- **Playwright browsers** - Auto-installed via CLI
- **Alembic** - Database migrations
- **pytest** - Testing framework

---

## Setup

### 1. Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Install Playwright Browsers

```bash
playwright install chromium
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/autohyre
REDIS_URL=redis://localhost:6379/0

# API Keys
OPENAI_API_KEY=sk-...
CAPTCHA_API_KEY=...  # 2Captcha key

# Proxies
PROXY_URL=http://username:password@proxy-server:port
PROXY_ENABLED=true

# LinkedIn Credentials (for scraping)
LINKEDIN_EMAIL=your@email.com
LINKEDIN_PASSWORD=your-password

# Indeed Credentials
INDEED_EMAIL=your@email.com
INDEED_PASSWORD=your-password

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your-app-password

# Security
SECRET_KEY=generate-random-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 4. Run Database Migrations

```bash
alembic upgrade head
```

### 5. Start Server

```bash
uvicorn app.main:app --reload --port 8000
```

---

## API Documentation

FastAPI auto-generates docs:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## Database Schema

### Jobs Table
```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requirements JSONB,
    location VARCHAR(255),
    status VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Candidates Table
```sql
CREATE TABLE candidates (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    resume_url TEXT,
    linkedin_url TEXT,
    github_url TEXT,
    ai_score INTEGER,
    ai_reasoning TEXT,
    stage VARCHAR(50),
    job_id UUID REFERENCES jobs(id),
    created_at TIMESTAMP
);
```

### Workflows Table
```sql
CREATE TABLE workflows (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(50),
    actions JSONB,
    active BOOLEAN DEFAULT true,
    user_id UUID,
    created_at TIMESTAMP
);
```

---

## Scraper Usage

### LinkedIn Job Posting
```python
from app.scrapers.linkedin import LinkedInScraper

scraper = LinkedInScraper(
    email="your@email.com",
    password="password",
    proxy_url="http://proxy:port"
)

await scraper.post_job(
    title="Senior React Developer",
    description="...",
    location="Remote",
    application_url="https://autohyre.com/jobs/123/apply"
)
```

### Indeed Scraping
```python
from app.scrapers.indeed import IndeedScraper

scraper = IndeedScraper(proxy_url="http://proxy:port")
candidates = await scraper.scrape_applicants(job_id="123")
```

---

## AI Screening

```python
from app.ai.screening import AIScreener

screener = AIScreener(openai_api_key="sk-...")

result = await screener.score_candidate(
    resume_text="...",
    job_requirements=["React", "TypeScript", "5+ years"]
)

# result = {
#     "score": 85,
#     "reasoning": "Strong React background...",
#     "qualified": True
# }
```

---

## Workflow Execution

```python
from app.workflows.engine import WorkflowEngine

engine = WorkflowEngine()

workflow = {
    "trigger": "job_posted",
    "actions": [
        {"type": "search_github", "config": {"skills": ["React"]}},
        {"type": "ai_screen", "config": {"min_score": 70}},
        {"type": "send_email", "config": {"template": "outreach"}}
    ]
}

await engine.execute(workflow, {"job_id": "123"})
```

---

## Testing

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_scrapers.py

# Run with coverage
pytest --cov=app tests/
```

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup with Docker, proxies, and monitoring.

---

## Security Notes

- ⚠️ **Web scraping is against LinkedIn/Indeed ToS**
- ⚠️ **Use residential proxies to reduce ban risk**
- ⚠️ **Rotate accounts if primary gets banned**
- ⚠️ **Never hardcode credentials** - use .env
- ⚠️ **Rate limit scraping** - don't hammer servers
- ⚠️ **Use at your own risk** - legal liability is yours