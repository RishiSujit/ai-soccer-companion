import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function getOrCreateSession() {
  try {
    // Check for existing session first
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      return session.user;
    }

    // No session — create anonymous one
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) throw error;

    // Persist user record — silent fail if RLS not yet configured
    try {
      await supabase
        .from('users')
        .upsert(
          {
            id: data.user.id,
            auth_type: data.user.is_anonymous ? 'anonymous' : 'authenticated',
          },
          { onConflict: 'id' }
        );
    } catch {
      // RLS may block this until policies are in place — app continues normally
    }

    return data.user;
  } catch (err) {
    console.error('Auth error:', err);
    // Fallback ID so the app never gets stuck on a white screen
    return { id: 'guest-' + Date.now() };
  }
}

export async function upgradeToEmail(email, password) {
  const { data, error } = await supabase.auth.updateUser({ email, password });
  if (error) throw error;
  return data;
}
