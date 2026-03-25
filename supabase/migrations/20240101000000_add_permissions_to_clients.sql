-- Add permissions column to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS permissions jsonb
  DEFAULT '{"weekly_report":true,"biweekly_report":true,"monthly_report":true,"campaigns":true,"monthly_plan":true}'::jsonb;
