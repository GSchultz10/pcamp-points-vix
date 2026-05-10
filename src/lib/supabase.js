import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Detecta se as credenciais foram realmente configuradas (não são os placeholders)
const isConfigured =
  url &&
  anonKey &&
  !url.includes("SEU-PROJETO") &&
  !anonKey.includes("sua-anon-key");

export const supabase = isConfigured ? createClient(url, anonKey) : null;
export const isSupabaseConfigured = isConfigured;
