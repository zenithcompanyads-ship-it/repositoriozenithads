import { SupabaseClient } from '@supabase/supabase-js';

// Types
export type Client = {
  id: string;
  admin_id: string;
  name: string;
  service: string;
  value: number;
  day: number;
  crm: 'em-dia' | 'pendente' | 'atrasado' | 'novo' | 'cancelado';
  renew: boolean;
  link: string | null;
  category_id: string | null;
  source_prospect_id: string | null;
  source_channel: string | null;
  month_index: number;
  created_at: string;
  updated_at: string;
};

export type Prospect = {
  id: string;
  admin_id: string;
  name: string;
  canal: string;
  status: 'contato' | 'interesse' | 'negociando' | 'fechado' | 'perdido';
  observacoes: string | null;
  month_index: number;
  date: string;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  admin_id: string;
  name: string;
  created_at: string;
};

// ============ CLIENTS ============

export async function getFinancialClients(supabase: SupabaseClient, adminId: string, monthIndex: number): Promise<Client[]> {
  const { data, error } = await supabase.from('financial_clients').select('*').eq('admin_id', adminId).eq('month_index', monthIndex).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addFinancialClient(supabase: SupabaseClient, adminId: string, monthIndex: number, clientData: Omit<Client, 'id' | 'admin_id' | 'month_index' | 'created_at' | 'updated_at'>): Promise<Client> {
  const { data, error } = await supabase.from('financial_clients').insert([{ admin_id: adminId, month_index: monthIndex, ...clientData }]).select().single();
  if (error) throw error;
  return data;
}

export async function updateFinancialClient(supabase: SupabaseClient, adminId: string, monthIndex: number, clientId: string, updates: Partial<Omit<Client, 'id' | 'admin_id' | 'month_index' | 'created_at'>>): Promise<Client> {
  const { data, error } = await supabase.from('financial_clients').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', clientId).eq('admin_id', adminId).eq('month_index', monthIndex).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFinancialClient(supabase: SupabaseClient, adminId: string, monthIndex: number, clientId: string): Promise<void> {
  const { error } = await supabase.from('financial_clients').delete().eq('id', clientId).eq('admin_id', adminId).eq('month_index', monthIndex);
  if (error) throw error;
}

// ============ PROSPECTS ============

export async function getFinancialProspects(supabase: SupabaseClient, adminId: string, monthIndex: number): Promise<Prospect[]> {
  const { data, error } = await supabase.from('financial_prospects').select('*').eq('admin_id', adminId).eq('month_index', monthIndex).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addFinancialProspect(supabase: SupabaseClient, adminId: string, monthIndex: number, prospectData: Omit<Prospect, 'id' | 'admin_id' | 'month_index' | 'created_at' | 'updated_at'>): Promise<Prospect> {
  const { data, error } = await supabase.from('financial_prospects').insert([{ admin_id: adminId, month_index: monthIndex, ...prospectData }]).select().single();
  if (error) throw error;
  return data;
}

export async function updateFinancialProspect(supabase: SupabaseClient, adminId: string, monthIndex: number, prospectId: string, updates: Partial<Omit<Prospect, 'id' | 'admin_id' | 'month_index' | 'created_at'>>): Promise<Prospect> {
  const { data, error } = await supabase.from('financial_prospects').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', prospectId).eq('admin_id', adminId).eq('month_index', monthIndex).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFinancialProspect(supabase: SupabaseClient, adminId: string, monthIndex: number, prospectId: string): Promise<void> {
  const { error } = await supabase.from('financial_prospects').delete().eq('id', prospectId).eq('admin_id', adminId).eq('month_index', monthIndex);
  if (error) throw error;
}

export async function convertProspectToClient(supabase: SupabaseClient, adminId: string, monthIndex: number, prospect: Prospect): Promise<Client> {
  const { data, error } = await supabase.from('financial_clients').insert([{ admin_id: adminId, month_index: monthIndex, name: prospect.name, service: 'Novo Cliente', value: 0, day: new Date().getDate(), crm: 'novo', renew: true, source_prospect_id: prospect.id, source_channel: prospect.canal }]).select().single();
  if (error) throw error;
  return data;
}

// ============ CATEGORIES ============

export async function getFinancialCategories(supabase: SupabaseClient, adminId: string): Promise<Category[]> {
  const { data, error } = await supabase.from('financial_categories').select('*').eq('admin_id', adminId).order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addFinancialCategory(supabase: SupabaseClient, adminId: string, name: string): Promise<Category> {
  const { data, error } = await supabase.from('financial_categories').insert([{ admin_id: adminId, name }]).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFinancialCategory(supabase: SupabaseClient, adminId: string, categoryId: string): Promise<void> {
  const { error } = await supabase.from('financial_categories').delete().eq('id', categoryId).eq('admin_id', adminId);
  if (error) throw error;
}
