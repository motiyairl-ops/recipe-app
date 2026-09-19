// כיווץ תמונות בצד הלקוח לפני העלאה, כדי לחסוך מקום ולהאיץ טעינה.
// הפעולה: טעינת הקובץ לתוך <img>, ציור על canvas בגודל מוקטן, וייצוא כ-JPEG.

const MAX_DIMENSION = 1600; // פיקסלים, לצלע הארוכה
const JPEG_QUALITY = 0.8;

/**
 * מכווץ קובץ תמונה (File) ומחזיר Blob מסוג image/jpeg.
 * אם הכיווץ נכשל מכל סיבה, מחזיר את הקובץ המקורי כפי שהוא.
 */
export async function compressImage(file) {
  try {
    const bitmap = await loadBitmap(file);
    const { width, height } = fitDimensions(bitmap.width, bitmap.height, MAX_DIMENSION);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const drawable = bitmap._img || bitmap;
    ctx.drawImage(drawable, 0, 0, width, height);

    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY);
    });

    if (bitmap.close) bitmap.close();

    if (!blob) return file;
    return blob;
  } catch (err) {
    console.warn("כיווץ תמונה נכשל, משתמש בקובץ המקורי:", err);
    return file;
  }
}

async function loadBitmap(file) {
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(file);
    } catch {
      // ייפול לשיטה הבאה
    }
  }
  // גיבוי דרך אלמנט <img>, לדפדפנים/פורמטים שלא נתמכים ע"י createImageBitmap
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    return { width: img.naturalWidth, height: img.naturalHeight, _img: img };
  } finally {
    // ה-URL משוחרר רק אחרי הציור על ה-canvas, ראה drawImage למטה
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}

function fitDimensions(w, h, max) {
  if (w <= max && h <= max) return { width: w, height: h };
  if (w >= h) {
    return { width: max, height: Math.round((h / w) * max) };
  }
  return { width: Math.round((w / h) * max), height: max };
}

/** מחזיר סיומת קובץ קצרה עבור נתיב האחסון */
export function fileExtensionFor(blob) {
  if (blob.type === "image/png") return "png";
  if (blob.type === "image/webp") return "webp";
  return "jpg";
}
