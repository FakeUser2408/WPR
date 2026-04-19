
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view projects" ON public.projects FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert projects" ON public.projects FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update projects" ON public.projects FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete projects" ON public.projects FOR DELETE TO public USING (true);

INSERT INTO public.projects (name)
SELECT DISTINCT project_name FROM public.wpr_analyses
ON CONFLICT (name) DO NOTHING;
