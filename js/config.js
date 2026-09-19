// הגדרות חיבור ל-Supabase.
// המפתח כאן הוא מפתח ה-anon/publishable הציבורי, שנועד לשבת בקוד צד-לקוח.
// האבטחה בפועל נאכפת בהרשאות (RLS) בצד השרת, לא על ידי הסתרת המפתח הזה.
export const SUPABASE_URL = "https://odjcuvahailaaialkihw.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_fdjdsrBBaObTjibO2J086A_Iv3R7Pn1";

// שם דלי האחסון לתמונות המתכונים
export const IMAGES_BUCKET = "recipe-images";

// כמה זמן (בשניות) קישור חתום לתמונה נשאר תקף
export const SIGNED_URL_TTL = 60 * 60 * 6; // 6 שעות
