export type Role = 'admin' | 'client';

export type ReportType = 'weekly' | 'biweekly' | 'monthly' | 'csv_analysis';

export type AlertStatus = 'active' | 'resolved';

export interface ClientPermissions {
  weekly_report: boolean;
  biweekly_report: boolean;
  monthly_report: boolean;
  campaigns: boolean;
  monthly_plan: boolean;
}

export const DEFAULT_PERMISSIONS: ClientPermissions = {
  weekly_report: true,
  biweekly_report: true,
  monthly_report: true,
  campaigns: true,
  monthly_plan: true,
};

export interface User {
  id: string;
  email: string;
  role: Role;
  client_id: string | null;
  full_name: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  segment: string | null;
  meta_ad_account_id: string | null;
  meta_access_token: string | null;
  active: boolean;
  color: string;
  initials: string | null;
  since_date: string | null;
  monthly_budget: number;
  permissions: ClientPermissions;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Metric {
  id: string;
  client_id: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  reach: number;
  conversions: number;
  created_at: string;
}

export interface Campaign {
  id: string;
  client_id: string;
  meta_campaign_id: string | null;
  name: string;
  objective: string | null;
  status: string;
  budget: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  spend: number;
  updated_at: string;
  created_at: string;
  client?: Client;
}

export interface Report {
  id: string;
  client_id: string;
  type: ReportType;
  period_start: string;
  period_end: string;
  content_json: Record<string, unknown>;
  claude_analysis: string | null;
  admin_edited_analysis: string | null;
  visible_to_client: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface Goal {
  id: string;
  client_id: string;
  metric: string;
  target_value: number;
  period: 'daily' | 'weekly' | 'monthly';
  created_at: string;
  updated_at: string;
}

export interface MonthlyPlan {
  id: string;
  client_id: string;
  month: string;
  content: string | null;
  visible_to_client: boolean;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  client_id: string;
  metric: string;
  threshold: number | null;
  current_value: number | null;
  message: string | null;
  resolved: boolean;
  triggered_at: string;
  resolved_at: string | null;
  client?: Client;
}

export interface DashboardStats {
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  active_clients: number;
  active_alerts: number;
}

export interface ClientWithStats extends Client {
  total_spend?: number;
  total_impressions?: number;
  avg_ctr?: number;
  avg_roas?: number;
  active_alerts_count?: number;
  budget_used_percent?: number;
}

export interface MetaInsight {
  date_start: string;
  date_stop: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
  cpm: string;
  reach: string;
  actions?: Array<{ action_type: string; value: string }>;
}
