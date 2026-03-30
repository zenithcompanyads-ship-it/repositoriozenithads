-- Tabela de documentos do cliente
CREATE TABLE IF NOT EXISTS public.client_documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  file_url    text NOT NULL,
  file_path   text NOT NULL,
  file_type   text NOT NULL, -- 'application/pdf', 'application/msword', etc.
  file_size   bigint,
  visible_to_client boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_documents_client_id_idx ON public.client_documents(client_id);

-- RLS
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- Admin vê e gerencia tudo
CREATE POLICY "Admin full access to client_documents"
ON public.client_documents
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Cliente vê apenas documentos liberados do próprio cliente
CREATE POLICY "Client reads own visible documents"
ON public.client_documents
FOR SELECT
USING (
  visible_to_client = true
  AND client_id = (
    SELECT client_id FROM public.users WHERE id = auth.uid()
  )
);

-- Storage bucket para documentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT DO NOTHING;

-- Apenas admin pode fazer upload/delete
CREATE POLICY "Admin can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'client-documents');

CREATE POLICY "Admin can update documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'client-documents');

CREATE POLICY "Admin can delete documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'client-documents');

-- Admin e cliente autenticado podem ler (controle de acesso via signed URL)
CREATE POLICY "Authenticated users can read documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-documents' AND auth.role() = 'authenticated');
