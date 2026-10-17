# Verified Course Material Studio

> **"Create Smarter Courses. Verify Every Line of Code."**  
> Sponsored by **TechSummitTrainers**

Verified Course Material Studio is an intelligent educational workspace that generates classroom-ready slides, trainer notes, runnable code examples, tested assignments, quizzes, and cheat sheets — with automated sandbox verification built in.

---

## 🌟 Newly Implemented Features

### Feature 1: Notes Explaining Each Slide (Slide Notes Studio)
- **3-Pane Presentation Workspace**:
  - **Left**: Slide thumbnails with slide numbers, titles, and note status indicators.
  - **Center**: Visual slide preview stage showing titles, bullet points, code snippets, and 16:9 layout.
  - **Right**: Comprehensive speaker notes panel with structured pedagogical fields:
    1. **Slide Summary**: High-level overview.
    2. **Detailed Technical Explanation**: Deep background context for instructors.
    3. **Trainer Speaking Script**: Word-for-word classroom speaking cues.
    4. **Practical Industry Example**: Real-world analogy or production failure scenario.
    5. **Key Terms**: Glossary of technical terms and concise definitions.
    6. **Core Takeaways**: Checklist of student learnings.
    7. **Transition Sentence**: Hook connecting to the next slide.
    8. **Estimated Speaking Time**: Calculated pacing guide (e.g. "3-4 mins").
- **Trainer Note Actions**:
  - `Generate Notes` / `Regenerate` for active slide.
  - `Generate for All Slides`: Batch generation across the entire deck.
  - `Edit` & `Save`: Inline editing with persistence in MongoDB.
  - `Export Notes`: Download complete briefing guide in **PDF** or **DOCX** format.

### Feature 2: Code Examples That Students Can Run (Code Playground)
- **Interactive Code Playground**:
  - **Language Selector**: Python, JavaScript, Java, TypeScript, Go.
  - **Difficulty Levels**: Beginner, Intermediate, Advanced.
  - **Lesson Objective**: Clear learning goal for the lab exercise.
  - **Code Editor**: Syntax-styled editor with line numbers, Copy, Reset, and keyboard navigation.
  - **Actions**:
    - `Run Code`: Executes untrusted code inside an isolated container runner.
    - `Verify Suite`: Runs automated assertions and tests, verifying code correctness.
    - `Fix My Code`: Intelligent error analysis providing syntax and indentation repairs.
    - `Generate Example`: Generates new runnable templates based on topic and difficulty.
- **Output & Diagnostics Console**:
  - **Standard Output (stdout)**: Colored, formatted console logs and execution time in milliseconds.
  - **Compiler Diagnostics & Errors**: Detailed stack traces and error highlights.
  - **Automated Specification Tests**: Input/output assertions with pass/fail badges.
  - **Line-by-Line Pedagogical Explanation**: Detailed walkthrough of each line range.
  - **Verification Shield**: Cryptographic verification badge earned only when all tests pass.

---

## 🏗️ Architecture & Technology Stack

```
Verified-Course-Studio/
├── Backend/                       # Node.js, Express, MongoDB API
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # MongoDB connection with in-memory fallback
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js  # Trainer authentication & ownership checks
│   │   │   └── rateLimiter.js     # Rate-limiting for execution & generation
│   │   ├── models/
│   │   │   ├── Presentation.js    # Course deck model
│   │   │   ├── Slide.js           # Slide content, code snippet & visual diagram
│   │   │   ├── Note.js            # Structured speaker notes model
│   │   │   ├── CodeExample.js     # Runnable code exercise & test assertions
│   │   │   └── ExecutionLog.js    # Sandbox execution history
│   │   ├── routes/
│   │   │   ├── presentationRoutes.js # Notes generation, retrieval, & export
│   │   │   ├── slideRoutes.js     # Slide-specific notes & regeneration
│   │   │   └── codeExampleRoutes.js  # Code generation, isolated run, & verify
│   │   ├── services/
│   │   │   ├── notesService.js    # Pedagogical structured notes generator
│   │   │   ├── exportService.js   # PDFKit & docx document exporters
│   │   │   └── codeExecutionService.js # Isolated container runner & test suite
│   │   ├── seed.js                # Initial Spring Boot REST APIs demo data
│   │   ├── server.js              # Express app bootstrap
│   │   └── __tests__/
│   │       └── api.test.js        # Jest integration test suite (10/10 passing)
│   ├── package.json
│   └── .env.example
│
└── Frontend/                      # React 19 + Vite + Tailwind CSS v4
    ├── src/
    │   ├── components/
    │   │   ├── SlideNotesWorkspace.jsx # 3-pane notes presentation studio
    │   │   ├── CodePlayground.jsx      # Interactive code editor & test runner
    │   │   ├── Navbar.jsx              # Navigation with feature quick-launchers
    │   │   ├── Hero.jsx                # Landing hero with launch triggers
    │   │   ├── ProductPreview.jsx      # High-fidelity dashboard preview
    │   │   └── ... (existing homepage components preserved)
    │   ├── services/
    │   │   └── api.js                  # Frontend API client
    │   ├── App.jsx                     # Top-level workspace controller
    │   └── index.css                   # Tailwind CSS v4 design tokens
    └── package.json
```

---

## 🔒 Security & Code Execution Isolation

1. **Isolated Execution**: Untrusted student code is **never executed directly inside the Express application server process**.
2. **Container Runner**: Uses isolated Linux sandbox execution containers (Wandbox / configured execution service) with:
   - Max execution timeout: `6000ms`.
   - Max source code size: `64KB`.
   - Max output buffer: `64KB` (truncated to prevent denial of service).
   - Strict language allowlist: `python`, `javascript`, `typescript`, `java`, `go`.
3. **Database Resiliency**:
   - If a local or remote `MONGODB_URI` is provided, the backend connects to it.
   - If no MongoDB server is running, the backend automatically initializes an in-memory database (`mongodb-memory-server`) so testing and local development work out of the box with zero external dependencies.

---

## ⚙️ Environment Variables

### Backend (`/Backend/.env`)
| Variable | Description | Default |
|---|---|---|
| `PORT` | API server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `CLIENT_URL` | Frontend origin for CORS | `http://localhost:5173` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/verified_course_studio` |
| `EXECUTION_SERVICE_URL` | Isolated runner endpoint | `https://wandbox.org/api/compile.json` |
| `EXECUTION_TIMEOUT_MS` | Max execution timeout | `6000` |
| `OPENAI_API_KEY` | Optional OpenAI API Key | `(Optional - deterministic engine used if omitted)` |
| `GEMINI_API_KEY` | Optional Gemini API Key | `(Optional)` |
| `JWT_SECRET` | Secret key for auth | `verified_course_studio_dev_secret_key_2026` |

### Frontend (`/Frontend/.env`)
| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000/api` |

---

## 🚀 Local Development Setup

### 1. Start the Backend API
```bash
cd Backend
npm install
npm start
```
*The server will start on `http://localhost:5000` and automatically seed the sample presentation and runnable exercises.*

To run the backend integration test suite:
```bash
npm test
```

### 2. Start the Frontend Application
```bash
cd Frontend
npm install
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 🧪 Integration Test Report

Running `npm test` in `/Backend`:
```
PASS src/__tests__/api.test.js
  Verified Course Studio Backend API Tests
    Health Check
      ✓ GET /api/health returns healthy status
    Feature 1: Presentation & Slide Notes API
      ✓ GET /api/presentations retrieves seeded presentation
      ✓ GET /api/presentations/:id retrieves presentation with slides and notes
      ✓ POST /api/presentations/:id/notes/generate creates or updates notes for all slides
      ✓ PATCH /api/slides/:slideId/notes preserves saved trainer edits
      ✓ GET /api/presentations/:id/notes/export returns PDF stream
      ✓ GET /api/presentations/:id/notes/export returns DOCX stream
    Feature 2: Code Execution & Verification API
      ✓ POST /api/code-examples/run executes real code via isolated runner
      ✓ POST /api/code-examples/run rejects disallowed languages
      ✓ POST /api/code-examples/:id/verify runs tests and verifies passing code

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
```
