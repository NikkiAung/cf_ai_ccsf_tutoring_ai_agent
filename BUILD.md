# AI-Powered CCSF Tutor Squad Scheduler — Cursor System Instructions

You (Cursor) are helping build a fully automated scheduling system for the CCSF CS Tutor Squad using:
- OpenAI API (LLM)
- Cloudflare Workers (backend API)
- Cloudflare Workflows (or Durable Objects) for orchestration
- Cloudflare Realtime or Pages for UI chat
- Cloudflare D1 (PostgreSQL-lite) for storing tutors, bios, availability
- Apify / Puppeteer (later) to automate Calendly booking (https://crawlee.dev/)

The application allows students to:
1. Describe what they need help with (e.g., "Python", "Java", "discrete math").
2. Choose preferred dates/times.
3. Chat with an AI agent that selects the correct tutor.
4. AI automatically books a session through Calendly. (https://calendly.com/cs-tutor-squad/30min/2025-11-15T09:00:00-08:00?back=1&month=2025-11&date=2025-11-15)

Your job inside Cursor:
- Scaffold backend routes (Workers)
- Connect Cloudflare D1 DB
- Build endpoints for: GET /tutors, GET /schedule, POST /match-tutor, POST /book
- Build frontend tutoring schedule web page (app/schedule/page.tsx) Get data here (/Users/aungnandaoo/Desktop/ccsf_tutoring_ai_agent/BUILD.md)
- Integrate OpenAI API for LLM reasoning
- Implement conversational UI
- Use embeddings or keyword matching for expertise search
- Write SQL migrations + seed data for tutors + availability
- Return clean JSON responses for schedules
- Make code modular, type-safe, production-ready

## Technical Requirements

### Languages
- TypeScript
- SQL migrations for D1

### Backend (Cloudflare Workers)
- `/api/tutors` → list tutors with bios + skills
- `/api/tutors/:id` → individual tutor
- `/api/availability` → full schedule with tutors
- `/api/match` → AI chooses tutor based on skills, time, availability
- `/api/book` → AI prepares information for Calendly automation

### Database (D1)
Tables required:
- `tutors`
- `availability`
- `skills` (optional)
- `tutor_skills` (optional if skills as CSV)

### AI Matching Logic
Given:
- student’s desired skill(s)
- day/time preference

The LLM should:
- Query DB for matching tutors
- Return ranked list
- Select top tutor to schedule

### Frontend
- Build `/schedule` page showing tutor cards
- Build chat interface for the scheduling assistant

Tutor card fields:
- Name
- Pronouns
- Bio
- Skills (chips)
- Availability (group by day)
- Mode: online / on-campus

### Memory
Use:
- Durable Objects OR
- Cloudflare KV

To store:
- Student’s in-progress booking session
- Chat state

### Later Expansion (Not now, but plan ahead)
- Apify automation script for Calendly (https://crawlee.dev/)
- Real-time availability updating

## Coding Principles:
- Never hardcode availability; always query DB.
- All constants go in `/config`.
- Use prepared statements for SQL.
- Use TypeScript types for all API responses.
- The code must deploy cleanly with `npx wrangler dev`.
