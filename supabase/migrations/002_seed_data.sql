-- Sample data for development
-- Run after creating your first admin user via Supabase Auth

-- Update first user to admin (replace with your actual user ID after signup)
-- UPDATE public.users SET role = 'admin' WHERE email = 'admin@yourcompany.com';

-- Sample clients
INSERT INTO public.clients (name, segment, active, color, initials, since_date, monthly_budget) VALUES
  ('Bella Moda', 'Moda & Varejo', true, '#4040E8', 'BM', '2024-01-15', 5000.00),
  ('TechFlow Solutions', 'Tecnologia', true, '#10B981', 'TF', '2024-02-01', 8000.00),
  ('Açaí Express', 'Alimentação', true, '#F59E0B', 'AE', '2024-03-10', 3000.00),
  ('Clínica Saúde+', 'Saúde', false, '#EF4444', 'CS', '2023-11-20', 4500.00)
ON CONFLICT DO NOTHING;
