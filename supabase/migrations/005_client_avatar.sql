ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS avatar_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('client-avatars', 'client-avatars', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Public client avatars read"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-avatars');

CREATE POLICY "Admin can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'client-avatars');

CREATE POLICY "Admin can update avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'client-avatars');

CREATE POLICY "Admin can delete avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'client-avatars');
