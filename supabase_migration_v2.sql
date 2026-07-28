-- =========================================================================================
-- CHEMQUEST SUPABASE MIGRATION SCRIPT (V2 - UPDATE)
-- =========================================================================================

-- Tambahkan kolom is_active ke cq_students
ALTER TABLE public.cq_students 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Tambahkan kolom class_code ke cq_teachers
ALTER TABLE public.cq_teachers 
ADD COLUMN IF NOT EXISTS class_code TEXT UNIQUE;

-- =========================================================================================
-- SELESAI
-- =========================================================================================
