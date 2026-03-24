ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS permissions jsonb
DEFAULT '{"weekly_report":true,"biweekly_report":true,"monthly_report":true,"campaigns":true,"monthly_plan":true}'::jsonb;

-- Backfill existing clients
UPDATE public.clients
SET permissions = '{"weekly_report":true,"biweekly_report":true,"monthly_report":true,"campaigns":true,"monthly_plan":true}'::jsonb
WHERE permissions IS NULL;
