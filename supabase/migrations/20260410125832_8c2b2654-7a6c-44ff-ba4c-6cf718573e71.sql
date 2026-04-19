
CREATE TABLE public.wpr_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT NOT NULL,
  wpr1_date TEXT NOT NULL,
  wpr2_date TEXT NOT NULL,
  overall_score INTEGER NOT NULL DEFAULT 0,
  overall_status TEXT NOT NULL DEFAULT 'critical',
  summary TEXT,
  analysis_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wpr_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view analyses" ON public.wpr_analyses FOR SELECT USING (true);
CREATE POLICY "Anyone can insert analyses" ON public.wpr_analyses FOR INSERT WITH CHECK (true);

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
