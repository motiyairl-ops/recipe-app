// מודל גיבוי ואחסון: מוצג נפח האחסון בשימוש, הסבר קצר על הצורך בגיבוי,
// וכפתור לייצוא גיבוי (ZIP).
import { state } from "../state.js";
import { escapeHtml } from "./common.js";
import { getStorageUsage } from "../db.js";

const FREE_TIER_STORAGE_MB = 1024; // מכסת האחסון בשכבה החינמית של Supabase (1GB)

export function renderBackupModal(root, ctx) {
  const storageState = { loading: true, text: "בודק נפח אחסון..." };
  loadStorageInfo();
  paint();

  async function loadStorageInfo() {
    const recipeIds = state.recipes.filter((r) => r.recipe_images.length).map((r) => r.id);
    try {
      const { totalBytes, fileCount } = await getStorageUsage(recipeIds);
      const usedMb = totalBytes / (1024 * 1024);
      const pct = Math.min(100, (usedMb / FREE_TIER_STORAGE_MB) * 100);
      const mbLabel = usedMb < 0.1 && fileCount ? "<0.1" : usedMb.toFixed(1);
      storageState.loading = false;
      storageState.text = `נפח תמונות בשימוש: ${mbLabel}MB מתוך ${FREE_TIER_STORAGE_MB}MB (1GB) - כ-${pct.toFixed(
        1
      )}% · ${fileCount} תמונות`;
    } catch {
      storageState.loading = false;
      storageState.text = "לא הצלחתי לבדוק כרגע את נפח האחסון.";
    }
    const el = root.querySelector("#storage-info");
    if (el) el.textContent = storageState.text;
  }

  function paint() {
    root.innerHTML = `
      <div class="modal-overlay" id="overlay">
        <div class="modal-sheet">
          <h2>גיבוי ואחסון</h2>
          <div class="storage-info" id="storage-info">${escapeHtml(storageState.text)}</div>
          <p class="backup-explain">
            כל המתכונים שמורים באופן שוטף בענן, כך שאין צורך בגיבוי כדי שהאפליקציה תעבוד.
            הגיבוי הוא עותק נוסף ליתר ביטחון בלבד - הוא מגן על המתכונים והתמונות במקרה נדיר
            של מחיקה בטעות, תקלה או בעיה בחשבון הענן. אפשר לשמור אותו מדי פעם (למשל לגוגל דרייב),
            אבל זה לגמרי לא הכרחי לשימוש השוטף באפליקציה.
          </p>
          <div class="form-actions">
            <button class="btn full" id="btn-do-backup">📦 ייצוא גיבוי (ZIP)</button>
            <button class="btn ghost full" id="btn-close">סגירה</button>
          </div>
        </div>
      </div>
    `;
    wire();
  }

  function wire() {
    const overlay = root.querySelector("#overlay");
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) ctx.closeModal();
    });
    root.querySelector("#btn-close").addEventListener("click", () => ctx.closeModal());
    root.querySelector("#btn-do-backup").addEventListener("click", () => ctx.runBackup());
  }
}
