-- Financial Tables - Clean Version
-- This migration creates the financial management tables for Zenith

-- Create ENUM types safely
DO $$ BEGIN
  CREATE TYPE crm_status AS ENUM ('em-dia', 'pendente', 'atrasado', 'novo', 'cancelado');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE prospect_status AS ENUM ('contato', 'interesse', 'negociando', 'fechado', 'perdido');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Financial Categories
CREATE TABLE IF NOT EXISTS public.financial_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_category_per_admin UNIQUE(admin_id, name)
);

-- Financial Prospects
CREATE TABLE IF NOT EXISTS public.financial_prospects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  canal TEXT NOT NULL,
  status prospect_status DEFAULT 'contato'::prospect_status,
  observacoes TEXT,
  month_index INTEGER CHECK (month_index >= 0 AND month_index <= 11),
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial Clients
CREATE TABLE IF NOT EXISTS public.financial_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  service TEXT NOT NULL,
  value DECIMAL(12, 2) NOT NULL,
  day INTEGER CHECK (day >= 1 AND day <= 31),
  crm crm_status DEFAULT 'novo'::crm_status,
  renew BOOLEAN DEFAULT FALSE,
  link TEXT,
  category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  source_prospect_id UUID REFERENCES public.financial_prospects(id) ON DELETE SET NULL,
  source_channel TEXT,
  month_index INTEGER CHECK (month_index >= 0 AND month_index <= 11),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_fin_categories_admin ON public.financial_categories(admin_id);
CREATE INDEX IF NOT EXISTS idx_fin_prospects_admin_month ON public.financial_prospects(admin_id, month_index);
CREATE INDEX IF NOT EXISTS idx_fin_clients_admin_month ON public.financial_clients(admin_id, month_index);
CREATE INDEX IF NOT EXISTS idx_fin_clients_category ON public.financial_clients(category_id);

-- Enable RLS
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS financial_categories_admin ON public.financial_categories;
CREATE POLICY financial_categories_admin ON public.financial_categories
  FOR ALL USING (admin_id = auth.uid());

DROP POLICY IF EXISTS financial_prospects_admin ON public.financial_prospects;
CREATE POLICY financial_prospects_admin ON public.financial_prospects
  FOR ALL USING (admin_id = auth.uid());

DROP POLICY IF EXISTS financial_clients_admin ON public.financial_clients;
CREATE POLICY financial_clients_admin ON public.financial_clients
  FOR ALL USING (admin_id = auth.uid());

-- Grant Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_prospects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_clients TO authenticated;
GRANT USAGE ON TYPE crm_status TO authenticated;
GRANT USAGE ON TYPE prospect_status TO authenticated;
