# Verified Course Studio

**Verified Course Studio** generates comprehensive course curricula and slides for technical trainers while providing **cryptographic-grade guarantees** that every single code snippet and exercise actually compiles and runs cleanly on a pinned Java version (**Java 21**).

---

## Architecture & Verification Pipeline

```
Trainer Request ("Java Collections, Beginner, 60m")
                 │
                 ▼
     AI Curriculum & Code Generator
                 │
                 ▼
       Java 21 Process Runner (javac --release 21)
           ┌─────┴─────┐
       Success       Failure
          │             │
          ▼             ▼
      Pass Output   Feedback Loop into Generator
          │         (up to VERIFY_MAX_ATTEMPTS retries)
          │             │
          └─────┬───────┘
                ▼
       Real Execution Report
 (stdout, exit codes, commands, badges)
```

1. **No Fake Badges**: Badges such as "8/8 Verified" are computed dynamically from actual `javac` and `java` execution results.
2. **Java 21 Pinning**: Code compilation uses `javac --release 21` to enforce Java 21 bytecode semantics, standard library methods, and syntax.
3. **Automated Error Repair**: When candidate code fails compilation or encounters runtime errors, the exact compiler diagnostics (`stderr`) are fed back into the generator with up to 3 retry attempts.
4. **Deterministic Exercise Verification**: Reference solutions are proven to pass all test cases while naive/buggy solutions are proven to be caught by the test suite.

---

## Environment Variables (`Backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key for dynamic generation | Optional (defaults to high-performance local curriculum engine if unset) |
| `GEMINI_MODEL` | Gemini model identifier | `gemini-2.5-flash` |
| `VERIFY_MODE` | Execution mode (`local` or `docker`) | `local` |
| `VERIFY_DOCKER_IMAGE` | Docker image tag for containerized execution | `openjdk:21-slim` |
| `VERIFY_MAX_ATTEMPTS` | Maximum compiler-retry repair attempts | `3` |
| `PORT` | Backend HTTP port | `5000` |
| `SUPABASE_URL` | Supabase Cloud project URL | Optional (falls back to local JSON store in `./data/courses.json`) |
| `SUPABASE_SECRET_KEY` | Supabase service role secret | Optional |

---

## Running the Verification Test Suite

Acceptance Test 1 verifies:
1. Valid Java compiles, runs, and outputs expected stdout with exit code 0.
2. Broken syntax returns compilation failures and compiler diagnostics without uncaught exceptions.
3. Infinite loops time out cleanly at or below 10 seconds.
4. Exercise verification proves reference solutions pass and naive solutions fail.

```bash
cd Backend
npm run test:verifier
```

---

## Local Setup

### Prerequisites

| Tool | Version | Verify |
|------|---------|--------|
| Node.js | ≥ 20 | `node -v` |
| npm | ≥ 10 | `npm -v` |
| JDK 21 | 21.x | `java -version && javac -version` |

If `javac -version` fails, [download JDK 21](https://adoptium.net/) and ensure `JAVA_HOME/bin` is on your `PATH`.

---

### 1 — Install dependencies

```bash
# Backend (separate terminal)
cd Backend && npm install

# Frontend (separate terminal)
cd Frontend && npm install
```

---

### 2 — Configure environment variables

**Backend**

```bash
cp Backend/.env.example Backend/.env
```

Open `Backend/.env` and fill in the required keys:

```
GEMINI_API_KEY=<your Gemini API key>
SUPABASE_URL=<your Supabase project URL>
SUPABASE_PUBLISHABLE_KEY=<your Supabase anon key>
SUPABASE_SECRET_KEY=<your Supabase service-role key>
```

All other defaults (`PORT=5000`, `VERIFY_MODE=local`, `CORS_ORIGINS=…`) work out of the box.

**Frontend** *(optional — only needed if backend runs on a non-default port)*

```bash
cp Frontend/.env.example Frontend/.env
# VITE_API_URL=http://localhost:5000  ← change if needed
```

---

### 3 — Start the servers

```bash
# Terminal 1 — Backend
cd Backend && npm run dev
# ✅ Backend running at http://localhost:5000

# Terminal 2 — Frontend
cd Frontend && npm run dev
# ➜ Local: http://localhost:5173/
```

---

### 4 — Run the verifier test suite

```bash
cd Backend && npm run test:verifier
```

---

## CORS and port conflicts

The backend allows these origins by default (set in `CORS_ORIGINS`):

```
http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174
```

If Vite falls back to **5174** (because 5173 is busy) the backend already covers it. For a completely different origin, add it to `Backend/.env`:

```
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://my-host:3000
```

---

## Finding and freeing a busy port (Windows)

```powershell
# 1 — who is using port 5000?
netstat -ano | findstr :5000

# 2 — identify the process (replace 12345 with PID from step 1)
tasklist /FI "PID eq 12345"

# 3 — kill it
taskkill /PID 12345 /F
```

---

## Common errors

| Error message | Fix |
|---------------|-----|
| `'nodemon' is not recognized` | Run `npm install` inside `Backend/` |
| `Port 5000 is already in use` | Free the port (see above) or set `PORT=5001` in `Backend/.env` |
| `Cannot reach the backend at http://localhost:5000` | Start backend first; check `CORS_ORIGINS` if on a different port |
| `Missing required environment variables: GEMINI_API_KEY …` | Copy `.env.example` → `.env` and fill in the keys |
| `javac: command not found` | Install JDK 21 and add it to PATH |
| `error: release version 21 not supported` | Your `javac` is older than 21 — install JDK 21 |
