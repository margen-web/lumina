import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://btyfqihnriqlobxcbvno.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0eWZxaWhucmlxbG9ieGNidm5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MjA4MDcsImV4cCI6MjA5NDA5NjgwN30.P5b8vV_roeN0PsCJpGwua8XyPrK2T8DlsKGSvALI_5U";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type PrimarySourceType = 
  | "scientific_paper"
  | "official_data"
  | "public_institution"
  | "major_news_agency"
  | "reputable_media"
  | "NGO_report"
  | "university"
  | "other";

export interface StoryItem {
  id: string;
  edition_date: string;
  edition_position: number;
  status: "draft" | "ready" | "published";
  category: string;
  headline: string;
  what_changed: string;
  why_it_matters: string;
  evidence: string;
  evidence_metric?: string | null;
  evidence_metric_label?: string | null;
  caveat: string;
  primary_source_name: string;
  primary_source_url: string;
  primary_source_type: PrimarySourceType;
  editorial_score?: number;
  flags?: string[];
  created_at?: string;
}
