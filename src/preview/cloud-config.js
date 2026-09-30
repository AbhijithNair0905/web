export const cloudUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
export const cloudKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
export const cloudConfigured = Boolean(cloudUrl && cloudKey);
