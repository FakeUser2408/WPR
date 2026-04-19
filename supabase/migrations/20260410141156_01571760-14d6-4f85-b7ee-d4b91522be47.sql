-- Add week_number to wpr_analyses
ALTER TABLE public.wpr_analyses 
ADD COLUMN IF NOT EXISTS week_number integer;

-- Create storage bucket for WPR uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('wpr-uploads', 'wpr-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for wpr-uploads bucket
CREATE POLICY "Anyone can upload WPR files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'wpr-uploads');

CREATE POLICY "Anyone can view WPR files"
ON storage.objects FOR SELECT
USING (bucket_id = 'wpr-uploads');

CREATE POLICY "Anyone can delete WPR files"
ON storage.objects FOR DELETE
USING (bucket_id = 'wpr-uploads');