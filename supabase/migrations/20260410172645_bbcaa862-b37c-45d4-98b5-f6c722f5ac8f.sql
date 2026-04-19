-- Allow anyone to delete analyses
CREATE POLICY "Anyone can delete analyses"
ON public.wpr_analyses
FOR DELETE
USING (true);

-- Allow anyone to update analyses
CREATE POLICY "Anyone can update analyses"
ON public.wpr_analyses
FOR UPDATE
USING (true)
WITH CHECK (true);