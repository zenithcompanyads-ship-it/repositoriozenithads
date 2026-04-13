-- Financial Tables (Simplified)
-- No custom types, just simple tables

CREATE TABLE IF NOT EXISTS public.financial_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financial_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  canal TEXT NOT NULL,
  status TEXT DEFAULT 'contato',
  observacoes TEXT,
  month_index INTEGER DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financial_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  service TEXT NOT NULL,
  value DECIMAL(12, 2) NOT NULL,
  day INTEGER,
  crm TEXT DEFAULT 'novo',
  renew BOOLEAN DEFAULT FALSE,
  link TEXT,
  category_id UUID REFERENCES public.financial_categories(id),
  source_prospect_id UUID REFERENCES public.financial_prospects(id),
  source_channel TEXT,
  month_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fin_categories_admin ON public.financial_categories(admin_id);
CREATE INDEX IF NOT EXISTS idx_fin_clients_admin_month ON public.financial_clients(admin_id, month_index);
CREATE INDEX IF NOT EXISTS idx_fin_clients_category ON public.financial_clients(category_id);
CREATE INDEX IF NOT EXISTS idx_fin_prospects_admin_month ON public.financial_prospects(admin_id, month_index);

-- Enable RLS
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_prospects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY IF NOT EXISTS financial_categories_admin ON public.financial_categories
  FOR ALL USING (admin_id = auth.uid());

CREATE POLICY IF NOT EXISTS financial_clients_admin ON public.financial_clients
  FOR ALL USING (admin_id = auth.uid());

CREATE POLICY IF NOT EXISTS financial_prospects_admin ON public.financial_prospects
  FOR ALL USING (admin_id = auth.uid());

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_prospects TO authenticated;
