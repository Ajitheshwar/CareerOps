# CareerOps

CareerOps is an AI-powered career operations workspace that connects resume analysis, job discovery, application tracking, tailored application materials, career mentoring, and adaptive interview practice in one application.

The project uses an Angular 18 single-page application, an Express/TypeScript API, MongoDB persistence, and a multi-agent AI workflow powered by Gemini or OpenAI.

## Core workflow

```text
Profile & Resume
    -> Search and collect jobs
    -> Analyze resume-to-job compatibility
    -> Review Target Matches
    -> Open a Job Dashboard
        -> Tailor resume and cover letter
        -> Generate interview preparation
        -> Start adaptive interview rounds
    -> Track applications
    -> Review interview analytics
    -> Ask the Career Mentor for contextual guidance
```

Search, matching, tailoring, and preparation tasks run in the background. The frontend receives live state and agent-log updates through Server-Sent Events.

## Main features

- Resume upload and parsing for PDF, DOC, and DOCX files.
- Live or historical job search with LinkedIn and Naukri result processing.
- AI resume matching with skills, gaps, fit explanations, and match scores.
- Job-specific resume tailoring and cover-letter generation.
- Adaptive interview rounds with AI evaluation and readiness tracking.
- Context-aware career mentor using resume, job, and interview history.
- Application pipeline and completed-interview analytics.

## Page flows

### Profile & Resume - `/profile`

- Enter a target role, location, expected compensation, and resume, or upload a PDF/DOC/DOCX file for text extraction.
- Choose live search or local MongoDB history, then start the search and matching pipeline.
- The profile and resume embedding are saved while real-time search and analysis progress appears in the shared agent console.

### Target Matches - `/matches`

- Review jobs by source, sort them by match score or crawl date, and expand a card to inspect matching skills, gaps, and fit evaluation.
- Add a job manually, re-run analysis, change its pipeline status, open its original posting, or soft-delete it.
- Continue into the Job Dashboard, resume tailoring, or interview preparation. Automated jobs scoring below 60% are removed from active results.

### Job Dashboard - `/jobs/:id`

- Provides a job-specific workspace with Overview, Adjusted Resume, Cover Letter, Interview Coach, and Adaptive Interview Prep tabs.
- Supports job editing, status updates, re-analysis, tailoring, preparation generation, and soft deletion.
- Editing the job clears generated materials and interview readiness data because those results relate to the previous job description.

### Resume Tailor - `/tailor`

- Displays the adjusted resume summary and bullet points alongside the generated cover letter for the selected job.
- Reconstructs a complete resume from the original text and tailored changes.
- Exports the resume as PDF, Word-compatible `.doc`, or a CSV report of the changes.

### Interview Coach - `/coach`

- Initializes a resume-based generic preparation plan and readiness snapshot.
- Offers Resume Defense, Technical, System Design, Behavioral, Hiring Manager, and Full Mock practice modes.
- Lets the user select difficulty and focus topics before creating or continuing an adaptive session.

## Featured: Adaptive Interview Session - `/interview/session/:id`

The Adaptive Interview Session is the main interactive practice environment. It generates questions from the selected round, resume, job context, focus topics, previous responses, and requested difficulty.

### Session flow

1. The page loads the interview session, current progress, focus topics, and generated question history.
2. The user can request a hint, write an answer, select **I Don't Know**, skip the question, or request an easier or harder next question.
3. Before submission, the user rates the question's difficulty, relevance, clarity, and confidence before and after answering.
4. The AI evaluates the response and returns a score, category-level assessment, feedback, expected answer, key concepts, and learning notes.
5. The engine recalculates readiness and generates the next question using the latest performance data.
6. The round finishes when topic coverage, performance, confidence, or the adaptive question limit satisfies its completion criteria.
7. A completed round is converted into an interview analytics record containing its score, feedback, action items, and transcript.

### Key capabilities

- Review any previous question and its evaluation without losing the active question.
- Inspect prior questions from the same practice category.
- Steer the next question's difficulty manually.
- Track round progress and question outcomes from the session sidebar.
- Return to the related Job Dashboard, or to the generic Interview Coach for resume-only sessions.

> Current implementation note: previous-category history is loaded using the generic job context, including inside job-specific sessions.

## Featured: Career Mentor - `/mentor`

The Career Mentor is a persistent, context-aware AI chat designed to provide guidance based on the user's actual CareerOps workspace rather than an isolated prompt.

### Mentor flow

1. Existing conversation history is loaded from MongoDB.
2. The user sends a custom question or chooses a suggested prompt for skill gaps, project ideas, or cold outreach.
3. A LangGraph workflow retrieves relevant workspace context.
4. The LLM produces a recommendation and the complete conversation is saved back to MongoDB.

### Context available to the mentor

- Stored resume and career profile.
- Active job listings and application statuses.
- Relevant job descriptions and requirements.
- Mock-interview scores, feedback, and action items.
- Previously generated resume and cover-letter artifacts when available.

The mentor can therefore compare skills with tracked roles, suggest practical projects, help address interview weaknesses, and draft application messaging using existing career data.

> Current implementation note: authentication is not yet connected to user accounts, so mentor history uses the shared `default` user ID.

## Featured: Interview Analytics - `/analytics`

Interview Analytics consolidates completed adaptive rounds and legacy mock-interview records into a review dashboard.

### Analytics flow

1. When an adaptive round is completed, its questions and evaluations are compiled into a mock-interview record.
2. The Analytics page loads all saved records and calculates total sessions, average performance, and unique action items.
3. Each session can be expanded to review its AI feedback and interviewer/candidate transcript.

### Information presented

- Total completed interview sessions.
- Average performance score across sessions.
- Deduplicated learning and improvement action items.
- Per-session role, company, score, feedback, and transcript.
- Score classification for quickly identifying strong and weak sessions.

> Current implementation note: action-item checkboxes are visual controls only; their checked state is not persisted.

### Job Tracker - `/tracker`

- Organizes jobs into Scraped, Applied, Interviews, Offers, and Archived columns.
- Updates are made through the status selector and persisted to MongoDB.
- Selecting a card opens the corresponding Job Dashboard; drag-and-drop is not currently implemented.

### Not Found - wildcard route

- Unknown routes display a dedicated 404 page.
- Returning to the workspace redirects through `/` to the Profile & Resume page.

## Shared workspace behavior

All main pages use a shared application layout containing:

- A collapsible sidebar with page navigation and current agent status.
- A floating agent graph for visualizing active workflow stages.
- A command console with live logs, agent filtering, clear, and maximize controls.
- A global client state synchronized with the backend through `/api/state` and `/api/stream`.

Authentication currently uses a placeholder service that marks the user as authenticated by default. There is no login page or multi-user session handling yet.

## AI job-search and matching pipeline

### Live search

```text
Resume and target criteria
    -> AI query generation
    -> Search-provider fallback
    -> LinkedIn and Naukri result parsing
    -> Deduplication
    -> Resume-to-job analysis
    -> Remove automated matches below 60%
    -> Persist and rank results
```

The search-provider chain can use Tavily, SerpApi, and an organic DuckDuckGo fallback. Previously soft-deleted jobs are included as exclusions in later searches.

### Local-history search

Local-history mode searches stored MongoDB job records using flexible role and location matching. Existing match results, tailored materials, and interview-preparation artifacts are restored into the active workspace.

### Manual jobs

Jobs entered from Target Matches are saved and analyzed against the stored profile resume. The automatic below-60% deletion rule is not applied because the user explicitly selected the role.

## Agents

CareerOps uses eleven purpose-built AI agents distributed across three server modules. Each agent is a single-responsibility class that calls the shared `LLMService` (Gemini or OpenAI) and emits structured logs back to the Orchestrator.

### Job search & matching pipeline — `server/src/modules/jobs/agents/`

| Agent | Class | Role |
| --- | --- | --- |
| **Orchestrator** | `AgentOrchestrator` | Top-level coordinator. Owns the global in-memory `AgentState`, drives the search → match → tailor → prep pipeline, and fans out SSE updates to all connected clients. |
| **Query Generator** | `QueryGeneratorAgent` | Translates the user's target role and resume into two or three generic, board-friendly search keywords. Falls back to the raw title if the LLM call fails. |
| **Job Search** | `JobSearchAgent` | Entry point for a single search round. Delegates to `JobSearchOrchestrator`, which tries Tavily → SerpApi → organic DuckDuckGo in sequence, then passes raw HTML to the LinkedIn and Naukri scrapers. |
| **Resume Analyzer** | `ResumeAnalyzerAgent` | Scores a single job against the stored resume. Returns `matchScore`, `fitExplanation`, `matchingSkills`, `skillGaps`, and `experienceRelevance`. Jobs below 61% are dropped by the Orchestrator. |
| **Tailoring** | `TailoringAgent` | Rewrites the resume professional summary and suggests up to three high-impact bullet-point replacements, then writes a custom three-to-four paragraph cover letter for the target role. |

### Interview pipeline — `server/src/modules/interview/agents/`

| Agent | Class | Flow | Role |
| --- | --- | --- | --- |
| **Interview Prep** | `InterviewPrepAgent` | Interview Coach tab | Generates a static prep guide: two technical and one behavioral question with STAR-method answer templates, tips, and general company advice. Avoids duplicating previously generated questions. |
| **Plan Generator** | `PlanGeneratorAgent` | Interview Coach initialisation | Produces a structured readiness plan (topic coverage goals, study areas, and practice schedule) when a session is first created. |
| **Adaptive Question** | `AdaptiveQuestionAgent` | Adaptive Interview Session | Generates the next question by considering the round type, difficulty target, covered and uncovered topics, focus topics, and the full prior-answer history for that session. |
| **Answer Evaluator** | `AnswerEvaluatorAgent` | Adaptive Interview Session | Scores a submitted answer and returns a numeric score, category-level breakdown, written feedback, the expected answer, key concepts, and learning notes. Also handles skipped questions by compiling the model answer without a score. |
| **Readiness Calculator** | `ReadinessCalculatorAgent` | Adaptive Interview Session | Re-derives the candidate's overall interview readiness percentage after every answer, factoring in the job match score, skill gaps, and the running evaluation history for the session. |

### Career Mentor — `server/src/modules/chat/agents/`

| Agent | Class / Workflow | Role |
| --- | --- | --- |
| **Mentor Workflow** | `mentorWorkflow` (LangGraph) | A two-node stateful LangGraph: **`retrieveContext`** fetches the resume, active job listings (Atlas Vector Search with MQL fallback), recent mock-interview scores, and previously generated tailored artifacts; **`generateResponse`** feeds that workspace context plus the full chat history to the LLM and returns a structured career recommendation. |

### Agent flow summary

```text
Live search flow
  Orchestrator
    -> QueryGeneratorAgent         (generate search keywords)
    -> JobSearchAgent              (Tavily / SerpApi / DDG + LinkedIn & Naukri scraping)
    -> JobEnrichmentService        (salary parsing, location & CTC validation)
    -> ResumeAnalyzerAgent × N     (per-job match scoring; <61% dropped)

Tailoring flow
  Orchestrator
    -> TailoringAgent              (tailored summary + bullet changes + cover letter)

Interview Coach flow
  Orchestrator
    -> InterviewPrepAgent          (static prep guide: questions, templates, tips)

Adaptive Interview Session flow
  PlanGeneratorAgent               (initial readiness plan on session creation)
  AdaptiveQuestionAgent            (next question on every round step)
  AnswerEvaluatorAgent             (evaluate or skip each answer)
  ReadinessCalculatorAgent         (updated readiness score after every evaluation)

Career Mentor flow
  mentorWorkflow (LangGraph)
    -> retrieveContext node        (resume + jobs + interview scores + artifacts)
    -> generateResponse node      (mentor reply using workspace context)
```

## Persistence

MongoDB stores:

- User profile, resume text, file metadata, and resume embedding.
- Job listings and application statuses.
- Job history and resume-match results.
- Tailored resumes and cover letters.
- Standard interview-preparation guides.
- Adaptive interview sessions, questions, evaluations, and readiness snapshots.
- Mentor conversation history.
- Completed mock-interview analytics.

The active orchestrator state is held in server memory. It is reset when the backend process restarts, but persisted MongoDB records remain available.

Uploaded resume files are copied into `workspace/resumes` when the user starts the matching pipeline.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Angular 18, TypeScript, RxJS, standalone components |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB |
| AI orchestration | LangGraph, custom agent services |
| LLM providers | Google Gemini with model fallback, or OpenAI |
| Job discovery | Tavily, SerpApi, DuckDuckGo fallback, LinkedIn/Naukri parsing |
| Live updates | Server-Sent Events |
| Resume parsing | PDF.js and Mammoth |

## Repository structure

```text
CareerOps/
|-- client/
|   `-- src/app/
|       |-- core/                 # State, API services, types, and guards
|       |-- features/             # Route-level feature pages
|       `-- shared/               # Layout and reusable UI components
|-- server/
|   `-- src/
|       |-- modules/
|       |   |-- profile/          # Resume/profile persistence and parsing
|       |   |-- jobs/             # Search, matching, tailoring, and tracking
|       |   |-- chat/             # Mentor workflow and history
|       |   `-- interview/        # Standard and adaptive interview engines
|       `-- shared/               # Database, LLM, middleware, and shared types
|-- workspace/
|   `-- resumes/                  # Persisted uploaded resume files
|-- package.json                  # Monorepo scripts
`-- README.md
```

## Prerequisites

- Node.js 20 or later.
- npm 9 or later.
- A MongoDB deployment.
- At least one configured LLM provider.
- Optional search-provider keys for stronger live job discovery.

## Environment variables

Create `server/.env`:

```env
MONGODB_URI=mongodb+srv://...

# Configure at least one LLM provider.
GEMINI_API_KEY=...
# OPENAI_API_KEY=...

# Optional live-search providers.
TAVILY_API_KEY=...
SERPAPI_API_KEY=...

# Optional; defaults to 5000.
PORT=5000
```

When both LLM keys are provided, the current implementation prefers Gemini. OpenAI is used when Gemini is not configured.

## Installation

From the repository root:

```bash
npm install
```

The root project uses npm workspaces for `client` and `server`, so this installs dependencies for the complete application.

## Running the application

Start both frontend and backend:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev --workspace=server
npm run dev --workspace=client
```

- Frontend: `http://localhost:4200`
- Backend API: `http://localhost:5000/api`

The production server can also serve the compiled Angular application.

## Build

```bash
npm run build
```

This builds the server first and then the Angular client.

## Important API groups

| Area | Example endpoints |
| --- | --- |
| Profile | `GET /api/profile`, `POST /api/upload-resume` |
| Agent state | `GET /api/state`, `GET /api/stream`, `POST /api/reset` |
| Search and matching | `POST /api/search`, `POST /api/jobs/analyze` |
| Jobs | `GET /api/jobs`, `GET/PATCH /api/jobs/:id`, `POST /api/jobs/add-and-analyze` |
| Generated materials | `POST /api/tailor`, `POST /api/prep-interview` |
| Mentor | `GET /api/mentor/history`, `POST /api/mentor/chat` |
| Adaptive interviews | `/api/interview/sessions`, `/api/interview/readiness/:jobId` |
| Analytics records | `GET /api/interviews` |

## Current limitations

- Authentication and multi-user isolation are placeholders.
- API base URLs are currently hard-coded to `http://localhost:5000/api` in frontend services.
- The active multi-agent state is process-local rather than restored automatically at startup.
- Interview analytics action-item completion is not persisted.
- The tracker uses status selectors rather than drag-and-drop.
- Client production builds require access to Google Fonts unless font assets are hosted locally or font inlining is disabled.
