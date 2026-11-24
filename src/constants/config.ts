export const CONFIG = {
  // Replace these with your real Supabase credentials when ready
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://demo-project.supabase.co',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'demo-anon-key',
  GOOGLE_CLIENT_ID:
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
    '474605465512-oaftqm34emtbop7ttmt8grtarc0ltrla.apps.googleusercontent.com',
  SYNC_API_URL:
    process.env.EXPO_PUBLIC_SYNC_API_URL ||
    'https://taskflow-app-indol-rho.vercel.app/api/sync',
};

