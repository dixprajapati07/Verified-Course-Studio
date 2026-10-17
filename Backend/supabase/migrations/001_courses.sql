-- =============================================================================
-- Migration: 001_courses.sql
-- Project:   Verified Course Studio
-- Safe to run multiple times (fully idempotent).
-- =============================================================================
--
-- HOW TO RUN:
--   1. Open your Supabase project → SQL Editor
--   2. Paste this entire file and click "Run"
--   3. You should see "Success" with no errors
--
-- WHY THIS MIGRATION EXISTS:
--   The backend uses the Supabase SERVICE KEY which bypasses Row Level Security.
--   Ownership is enforced at the Express route level (WHERE user_id = req.user.id).
--   We therefore do NOT add a foreign key from user_id → auth.users because:
--     a) The service key can insert any UUID it needs to (e.g. dev/test users)
--     b) A hard FK would break dev-mode where req.user.id is a fixed dev UUID
--   RLS policies are still defined below so that if you ever expose data via the
--   Supabase client-side (anon/publishable key), users can only see their own rows.
-- =============================================================================


-- ── 1. Create the table if it does not exist yet ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.courses (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid,                        -- nullable so existing NULL rows are kept
  title            text        NOT NULL,
  topic            text        NOT NULL DEFAULT '',
  student_level    text,
  duration_minutes integer,
  language         text,
  content          jsonb       NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz          DEFAULT now()
);


-- ── 2. Add any columns that might be missing (idempotent) ─────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'topic'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN topic text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'student_level'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN student_level text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN duration_minutes integer;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'language'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN language text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'content'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN content jsonb NOT NULL DEFAULT '{}';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;


-- ── 3. Drop the FK to auth.users if it exists ─────────────────────────────────
--
-- The constraint "courses_user_id_fkey" was causing:
--   code 23503 — insert violates foreign key constraint
-- because the backend injects a dev UUID that is not present in auth.users.
-- The service key bypasses RLS; ownership is enforced at the application layer.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'courses_user_id_fkey'
      AND table_schema    = 'public'
      AND table_name      = 'courses'
  ) THEN
    ALTER TABLE public.courses DROP CONSTRAINT courses_user_id_fkey;
    RAISE NOTICE 'Dropped constraint courses_user_id_fkey';
  END IF;
END $$;


-- ── 4. Performance index ──────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS courses_user_id_created_at_idx
  ON public.courses (user_id, created_at DESC);


-- ── 5. Row Level Security ─────────────────────────────────────────────────────
--
-- The service/secret key bypasses RLS automatically.
-- These policies protect the table if it is ever accessed via the
-- anon/publishable key (e.g. from the browser directly).

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies idempotently
DROP POLICY IF EXISTS "Users can select their own courses"  ON public.courses;
DROP POLICY IF EXISTS "Users can insert their own courses"  ON public.courses;
DROP POLICY IF EXISTS "Users can update their own courses"  ON public.courses;
DROP POLICY IF EXISTS "Users can delete their own courses"  ON public.courses;

CREATE POLICY "Users can select their own courses"
  ON public.courses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own courses"
  ON public.courses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own courses"
  ON public.courses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own courses"
  ON public.courses FOR DELETE
  USING (auth.uid() = user_id);


-- ── 6. updated_at trigger (optional quality-of-life) ─────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS courses_set_updated_at ON public.courses;
CREATE TRIGGER courses_set_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── Done ──────────────────────────────────────────────────────────────────────
-- After running this, restart the backend. You should see:
--   ✅ Database probe OK — 'courses' table is reachable.
