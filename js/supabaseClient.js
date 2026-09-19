import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // הסשן נשמר ב-localStorage של הדפדפן/PWA כדי שהיא לא תצטרך להתחבר
    // מחדש בכל פתיחה, והטוקן מתחדש ברקע לפני שהוא פג.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
