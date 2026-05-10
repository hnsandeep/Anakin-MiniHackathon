export type AlertCard = {
  id: number;
  source_id: number;
  title: string;
  category: string;
  url: string;
  urgency: string;
  ai_summary: string;
  action_items: string[] | null;
  deadline: string | null;
  penalty_note: string | null;
  created_at: string;
  unread?: boolean;
};

export type AlertDetail = AlertCard & {
  old_text: string;
  new_text: string;
  diff_unified: string;
  checklist_state: Record<string, boolean>;
};

export type Source = {
  id: number;
  url: string;
  domain: string;
  category: string;
  frequency_hours: number;
  keywords: string[] | null;
  last_crawled_at: string | null;
  is_active: boolean;
};

export type Profile = {
  user_id: string;
  sectors: string[];
  states: string[];
  company_size: string | null;
};
