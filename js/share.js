// עזרים לקישור השיתוף: זיהוי קוד מהכתובת, שמירה במכשיר של הצופה, בניית הקישור וההודעה.

const STORAGE_KEY = "recipe-share-token";
export const LINK_PLACEHOLDER = "{קישור}";

/** קוד השיתוף מהכתובת (?s=...), ואם אין - הקוד שנשמר בביקור קודם במכשיר הזה. */
export function readShareToken() {
  const fromUrl = new URLSearchParams(location.search).get("s");
  if (fromUrl) {
    try {
      localStorage.setItem(STORAGE_KEY, fromUrl);
    } catch {
      // אחסון לא זמין (למשל גלישה פרטית) - ממשיכים עם הקוד מהכתובת
    }
    return fromUrl;
  }
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function forgetShareToken() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // לא קריטי
  }
}

/** כתובת האפליקציה + הקוד, למשל https://.../recipe-app/?s=abc */
export function buildShareLink(token) {
  const base = new URL("./", location.href);
  base.search = "";
  base.hash = "";
  base.searchParams.set("s", token);
  return base.toString();
}

/** ההודעה הסופית לשליחה. אם המקום לקישור נמחק מהנוסח, הקישור מתווסף בסוף. */
export function buildShareMessage(template, link) {
  const text = (template || "").trim();
  if (text.includes(LINK_PLACEHOLDER)) return text.split(LINK_PLACEHOLDER).join(link);
  return text ? `${text}\n${link}` : link;
}

/** העתקה ללוח, עם גיבוי לדפדפנים ישנים. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}
