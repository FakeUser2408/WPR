-- ============================================================================
-- WPR Audit Tool - Supabase Database Setup
-- Run this SQL in your Supabase SQL Editor to set up the required tables,
-- storage bucket, and policies.
-- ============================================================================

-- 1. Create wpr_analyses table
CREATE TABLE IF NOT EXISTS public.wpr_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT NOT NULL,
  wpr1_date TEXT NOT NULL,
  wpr2_date TEXT NOT NULL,
  overall_score INTEGER NOT NULL DEFAULT 0,
  overall_status TEXT NOT NULL DEFAULT 'critical',
  summary TEXT,
  analysis_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  week_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS on both tables
ALTER TABLE public.wpr_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for wpr_analyses (open access)
CREATE POLICY "Anyone can view analyses" ON public.wpr_analyses FOR SELECT USING (true);
CREATE POLICY "Anyone can insert analyses" ON public.wpr_analyses FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update analyses" ON public.wpr_analyses FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete analyses" ON public.wpr_analyses FOR DELETE USING (true);

-- 5. RLS Policies for projects (open access)
CREATE POLICY "Anyone can view projects" ON public.projects FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert projects" ON public.projects FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update projects" ON public.projects FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete projects" ON public.projects FOR DELETE TO public USING (true);

-- 6. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_wpr_analyses_updated_at
  BEFORE UPDATE ON public.wpr_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Create storage bucket for WPR uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('wpr-uploads', 'wpr-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Storage policies
CREATE POLICY "Anyone can upload WPR files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'wpr-uploads');

CREATE POLICY "Anyone can view WPR files"
ON storage.objects FOR SELECT
USING (bucket_id = 'wpr-uploads');

CREATE POLICY "Anyone can update WPR files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'wpr-uploads')
WITH CHECK (bucket_id = 'wpr-uploads');

CREATE POLICY "Anyone can delete WPR files"
ON storage.objects FOR DELETE
USING (bucket_id = 'wpr-uploads');
