// ייצוא גיבוי: קובץ ZIP עם JSON של כל המתכונים + כל התמונות, לשיתוף/שמירה לדרייב.
import { state } from "./state.js";
import { getSignedUrls } from "./db.js";
import { showToast, showSpinner, hideSpinner } from "./ui/common.js";

export async function runBackup() {
  showSpinner("מכין גיבוי...");
  try {
    const { default: JSZip } = await import("https://esm.sh/jszip@3.10.1");
    const zip = new JSZip();

    const allPaths = [];
    for (const r of state.recipes) {
      for (const img of r.recipe_images) allPaths.push(img.storage_path);
    }

    let urlMap = new Map();
    if (allPaths.length) {
      urlMap = await getSignedUrls(allPaths);
    }

    const imagesFolder = zip.folder("images");
    let done = 0;
    for (const path of allPaths) {
      const url = urlMap.get(path);
      if (!url) continue;
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        imagesFolder.file(path, blob);
      } catch (err) {
        console.warn("נכשל בהורדת תמונה לגיבוי:", path, err);
      }
      done++;
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      categories: state.categories.map((c) => ({ id: c.id, name: c.name, sort_order: c.sort_order })),
      recipes: state.recipes.map((r) => ({
        id: r.id,
        title: r.title,
        notes: r.notes,
        is_favorite: r.is_favorite,
        rating: r.rating,
        made: r.made,
        last_made_at: r.last_made_at,
        created_at: r.created_at,
        category_ids: r.recipe_categories.map((rc) => rc.category_id),
        images: r.recipe_images.map((i) => ({ storage_path: i.storage_path, sort_order: i.sort_order })),
        links: r.recipe_links.map((l) => ({ url: l.url, title: l.title })),
      })),
    };

    zip.file("data.json", JSON.stringify(exportData, null, 2));

    const blob = await zip.generateAsync({ type: "blob" });
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `מתכונים-גיבוי-${dateStr}.zip`;
    const file = new File([blob], filename, { type: "application/zip" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "גיבוי מתכונים" });
      showToast("הגיבוי נוצר בהצלחה");
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      showToast("קובץ הגיבוי הורד");
    }
  } catch (err) {
    if (err && err.name === "AbortError") {
      // המשתמשת ביטלה את השיתוף - לא שגיאה אמיתית
    } else {
      console.error(err);
      showToast("שגיאה ביצירת הגיבוי");
    }
  } finally {
    hideSpinner();
  }
}
