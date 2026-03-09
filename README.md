# AutoHyre

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

AI-powered recruitment automation. Source, screen, and hire candidates on autopilot.

**Status:** Early development • Not production-ready

---

## What It Does

AutoHyre automates the hiring pipeline from candidate sourcing to offer. It replaces manual recruiting tasks with AI-driven workflows.

- **Automated Sourcing**: Multi-platform candidate discovery (GitHub, job boards, data providers)
- **AI Screening**: Resume parsing and scoring with configurable thresholds
- **Smart Outreach**: Personalized email campaigns with response tracking
- **Visual Workflows**: Drag-and-drop automation builder (Zapier-style)
- **Pipeline Management**: Kanban-style candidate tracking

Built for recruiting teams that hire at scale.

---

## Architecture

```mermaid
graph TB
    subgraph "Frontend"
        WEB[Next.js Dashboard<br/>React Flow Builder]
    end

    subgraph "Backend API"
        API[FastAPI Server<br/>Port 8000]
    end

    subgraph "Automation Engine"
        WORKFLOWS[Workflow Engine<br/>Execution & Scheduling]
        SCRAPERS[Web Scrapers<br/>Playwright Bots]
        AI[AI Screening<br/>OpenAI GPT-4]
        EMAIL[Email Worker<br/>Outreach Campaigns]
    end

    subgraph "Data Storage"
        POSTGRES[(PostgreSQL<br/>Jobs, Candidates, Workflows)]
        REDIS[(Redis<br/>Queue & Cache)]
    end

    subgraph "External APIs"
        LINKEDIN[LinkedIn]
        INDEED[Indeed]
        GITHUB[GitHub API]
        PROXIES[Residential Proxies]
        SMTP[Gmail/SendGrid]
    end

    WEB --> API
    API --> POSTGRES
    API --> REDIS
    API --> WORKFLOWS

    WORKFLOWS --> SCRAPERS
    WORKFLOWS --> AI
    WORKFLOWS --> EMAIL

    SCRAPERS --> PROXIES
    SCRAPERS --> LINKEDIN
    SCRAPERS --> INDEED
    SCRAPERS --> GITHUB
    SCRAPERS --> POSTGRES

    AI --> POSTGRES
    EMAIL --> SMTP
    EMAIL --> POSTGRES
```

See [Architecture Docs](./docs/ARCHITECTURE.md) for detailed diagrams and data flow.

---

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router, Server Components)
- **Language**: TypeScript
- **UI**: Tailwind CSS, Radix UI, shadcn/ui
- **State**: React Query (TanStack Query)
- **Forms**: React Hook Form + Zod
- **Workflow Builder**: React Flow

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15 (via SQLAlchemy)
- **Cache/Queue**: Redis
- **Scraping**: Playwright (async)
- **AI**: OpenAI GPT-4
- **Auth**: JWT tokens
- **Email**: SMTP (configurable provider)

### Infrastructure
- **Deployment**: Docker Compose (development), Kubernetes (production)
- **Proxy**: Residential proxies (Smartproxy/Bright Data)
- **Monitoring**: Sentry (errors), Grafana (metrics)

---

## Project Structure

```
autohyre/
├── frontend/           # Next.js application
│   ├── app/           # App Router pages
│   ├── components/    # React components
│   ├── lib/           # Utilities, API client
│   └── types/         # TypeScript definitions
│
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── api/       # API routes
│   │   ├── core/      # Config, dependencies
│   │   ├── models/    # SQLAlchemy models
│   │   ├── schemas/   # Pydantic schemas
│   │   ├── scrapers/  # Playwright bots
│   │   ├── ai/        # AI screening engine
│   │   └── workflows/ # Automation engine
│   └── tests/         # Pytest suite
│
└── docs/              # Documentation
    ├── FRONTEND.md    # Frontend architecture
    ├── BACKEND.md     # Backend architecture
    └── WORKFLOWS.md   # Workflow system
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker (recommended)

### Development Setup

**1. Clone the repository**
```bash
git clone https://github.com/kisugez/autohire.git
cd autohire
```

**2. Start services with Docker**
```bash
docker-compose up -d postgres redis
```

**3. Backend setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Configure your environment
alembic upgrade head      # Run migrations
uvicorn app.main:app --reload --port 8000
```

**4. Frontend setup**
```bash
cd frontend
npm install
cp .env.example .env.local  # Configure your environment
npm run dev
```

**5. Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Environment Variables

### Backend (.env)
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/autohyre
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
PROXY_URL=http://user:pass@proxy:port  # Optional
SECRET_KEY=your-secret-key
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Documentation

- [Frontend Architecture](./docs/FRONTEND.md) - Next.js app structure, components, state management
- [Backend Architecture](./docs/BACKEND.md) - FastAPI services, database schema, API design
- [Workflow System](./docs/WORKFLOWS.md) - Automation engine, available actions, execution flow
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment, scaling, monitoring

---

## API Examples

### Create a Job
```bash
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior React Developer",
    "description": "Build scalable web applications...",
    "requirements": ["5+ years React", "TypeScript", "Node.js"],
    "location": "Remote"
  }'
```

### Trigger Candidate Search
```bash
curl -X POST http://localhost:8000/api/v1/jobs/123/search \
  -H "Content-Type: application/json" \
  -d '{
    "platforms": ["github", "linkedin"],
    "skills": ["React", "TypeScript"],
    "min_score": 70
  }'
```

---

## Roadmap

- [ ] Job posting and management
- [ ] Candidate database
- [ ] Visual workflow builder
- [ ] AI resume screening
- [ ] Multi-platform scraping (GitHub, LinkedIn, Indeed)
- [ ] Email campaign automation
- [ ] Interview scheduling
- [ ] Analytics dashboard
- [ ] Team collaboration features
- [ ] API webhooks
- [ ] Mobile app

---

Built by developers who got tired of manual recruiting.
