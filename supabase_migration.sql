-- =========================================================================================
-- CHEMQUEST SUPABASE MIGRATION SCRIPT (V2 - WITH AUTH & OPEN RLS PROTOTYPE)
-- =========================================================================================

-- 1. Buat Tabel analytics_events
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    session_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    episode_id INTEGER,
    question_id TEXT,
    difficulty_level TEXT,
    is_correct BOOLEAN,
    confidence_level TEXT,
    response_time_ms INTEGER,
    hints_used INTEGER,
    selected_option TEXT,
    misconception_tag TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Buat Tabel mastery_logs
CREATE TABLE IF NOT EXISTS public.mastery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    concept TEXT NOT NULL,
    old_score NUMERIC NOT NULL,
    new_score NUMERIC NOT NULL,
    delta NUMERIC NOT NULL,
    factors_json JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Buat Tabel cq_students (Untuk Sistem Password Game ChemQuest)
CREATE TABLE IF NOT EXISTS public.cq_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nis TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    class_code TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Buat Tabel cq_teachers (Untuk Login Guru ChemQuest)
CREATE TABLE IF NOT EXISTS public.cq_teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    class_code TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Masukkan 1 akun guru default untuk testing
INSERT INTO public.cq_teachers (username, password) 
VALUES ('admin_guru', 'guru123') 
ON CONFLICT (username) DO NOTHING;

-- 5. Aktifkan Row Level Security (RLS)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cq_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cq_teachers ENABLE ROW LEVEL SECURITY;

-- 6. Buat Kebijakan RLS (Policies) - VERSI PROTOTYPE (MEMBUKA AKSES ANON)
-- PERINGATAN: Kebijakan ini mengizinkan Anon Key (klien) untuk membaca & menulis data.
-- Ini dikhususkan agar pembuatan prototype berjalan lancar tanpa Supabase Auth JWT.

-- Analytics & Mastery
CREATE POLICY "Allow all operations for analytics_events" ON public.analytics_events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for mastery_logs" ON public.mastery_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Students & Teachers
CREATE POLICY "Allow all operations for cq_students" ON public.cq_students FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow read for cq_teachers" ON public.cq_teachers FOR SELECT TO anon, authenticated USING (true);

-- 7. Buat Index
CREATE INDEX IF NOT EXISTS idx_analytics_student ON public.analytics_events (student_id);
CREATE INDEX IF NOT EXISTS idx_analytics_episode ON public.analytics_events (episode_id);
CREATE INDEX IF NOT EXISTS idx_analytics_misconception ON public.analytics_events (misconception_tag) WHERE misconception_tag IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mastery_student ON public.mastery_logs (student_id);

-- =========================================================================================
-- SELESAI. Script telah dieksekusi.
-- =========================================================================================
