-- NUCLEAR: Delete everything first
DROP POLICY IF EXISTS financial_categories_admin ON public.financial_categories;
DROP POLICY IF EXISTS financial_clients_admin ON public.financial_clients;
DROP POLICY IF EXISTS financial_prospects_admin ON public.financial_prospects;

DROP TRIGGER IF EXISTS financial_clients_updated_at ON public.financial_clients;
DROP TRIGGER IF EXISTS financial_prospects_updated_at ON public.financial_prospects;

DROP TABLE IF EXISTS public.financial_clients CASCADE;
DROP TABLE IF EXISTS public.financial_prospects CASCADE;
DROP TABLE IF EXISTS public.financial_categories CASCADE;

DROP TYPE IF EXISTS crm_status;
DROP TYPE IF EXISTS prospect_status;

-- NOW CREATE EVERYTHING
CREATE TYPE crm_status AS ENUM ('em-dia', 'pendente', 'atrasado', 'novo', 'cancelado');
CREATE TYPE prospect_status AS ENUM ('contato', 'interesse', 'negociando', 'fechado', 'perdido');

CREATE TABLE public.financial_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_category_per_admin UNIQUE (admin_id, name)
);

CREATE TABLE public.financial_prospects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  canal TEXT NOT NULL,
  status prospect_status NOT NULL DEFAULT 'contato'::prospect_status,
  observacoes TEXT,
  month_index INTEGER NOT NULL CHECK (month_index >= 0 AND month_index <= 11),
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.financial_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  service TEXT NOT NULL,
  value DECIMAL(12, 2) NOT NULL,
  day INTEGER NOT NULL CHECK (day >= 1 AND day <= 31),
  crm crm_status NOT NULL DEFAULT 'novo'::crm_status,
  renew BOOLEAN DEFAULT FALSE,
  link TEXT,
  category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  source_prospect_id UUID REFERENCES public.financial_prospects(id) ON DELETE SET NULL,
  source_channel TEXT,
  month_index INTEGER NOT NULL CHECK (month_index >= 0 AND month_index <= 11),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fin_categories_admin ON public.financial_categories(admin_id);
CREATE INDEX idx_fin_clients_admin_month ON public.financial_clients(admin_id, month_index);
CREATE INDEX idx_fin_clients_category ON public.financial_clients(category_id);
CREATE INDEX idx_fin_prospects_admin_month ON public.financial_prospects(admin_id, month_index);

CREATE TRIGGER financial_clients_updated_at BEFORE UPDATE ON public.financial_clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER financial_prospects_updated_at BEFORE UPDATE ON public.financial_prospects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY financial_categories_admin ON public.financial_categories
  FOR ALL USING (admin_id = auth.uid());

CREATE POLICY financial_clients_admin ON public.financial_clients
  FOR ALL USING (admin_id = auth.uid());

CREATE POLICY financial_prospects_admin ON public.financial_prospects
  FOR ALL USING (admin_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_prospects TO authenticated;

GRANT USAGE ON TYPE crm_status TO authenticated;
GRANT USAGE ON TYPE prospect_status TO authenticated;
