import { state } from "../state.js";
import { escapeHtml, showToast, showSpinner, hideSpinner, confirmDialog } from "./common.js";
import { addCategory, renameCategory, deleteCategory } from "../db.js";

export function renderCategoryModal(root, ctx) {
  paint();

  function paint() {
    root.innerHTML = `
      <div class="modal-overlay" id="overlay">
        <div class="modal-sheet">
          <h2>ניהול קטגוריות</h2>
          <div id="category-rows">${rowsHtml()}</div>
          <div class="category-manage-row" style="border-bottom:none; margin-top:10px;">
            <input type="text" id="new-cat-input" placeholder="קטגוריה חדשה..." />
            <button class="btn small" id="btn-add-cat">הוספה</button>
          </div>
          <div class="form-actions">
            <button class="btn ghost full" id="btn-close">סגירה</button>
          </div>
        </div>
      </div>
    `;
    wire();
  }

  function rowsHtml() {
    return state.categories
      .map((c) => {
        const count = state.recipes.filter((r) => r.recipe_categories.some((rc) => rc.category_id === c.id)).length;
        return `
        <div class="category-manage-row" data-id="${c.id}">
          <input type="text" value="${escapeHtml(c.name)}" data-role="name" />
          <span class="count">${count} מתכונים</span>
          <button class="btn ghost small" data-action="delete">🗑</button>
        </div>`;
      })
      .join("");
  }

  function wire() {
    const overlay = root.querySelector("#overlay");
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) ctx.closeModal();
    });
    root.querySelector("#btn-close").addEventListener("click", () => ctx.closeModal());

    root.querySelectorAll(".category-manage-row[data-id]").forEach((rowEl) => {
      const id = rowEl.dataset.id;
      const input = rowEl.querySelector('[data-role="name"]');
      input.addEventListener("blur", async () => {
        const newName = input.value.trim();
        const current = state.categories.find((c) => c.id === id);
        if (!newName || newName === current.name) return;
        try {
          await renameCategory(id, newName);
          current.name = newName;
          await ctx.refreshData();
          showToast("הקטגוריה עודכנה");
        } catch {
          showToast("שגיאה בעדכון הקטגוריה");
        }
      });

      rowEl.querySelector('[data-action="delete"]').addEventListener("click", async () => {
        const count = state.recipes.filter((r) => r.recipe_categories.some((rc) => rc.category_id === id)).length;
        const current = state.categories.find((c) => c.id === id);
        const message =
          count > 0
            ? `הקטגוריה "${current.name}" משויכת ל-${count} מתכונים. הם לא יימחקו, אבל השיוך לקטגוריה זו יוסר. למחוק בכל זאת?`
            : `למחוק את הקטגוריה "${current.name}"?`;
        const ok = await confirmDialog(message);
        if (!ok) return;
        showSpinner("מוחק...");
        try {
          await deleteCategory(id);
          await ctx.refreshData();
          showToast("הקטגוריה נמחקה");
          paint();
        } catch {
          showToast("שגיאה במחיקת הקטגוריה");
        } finally {
          hideSpinner();
        }
      });
    });

    root.querySelector("#btn-add-cat").addEventListener("click", async () => {
      const input = root.querySelector("#new-cat-input");
      const name = input.value.trim();
      if (!name) return;
      showSpinner("מוסיף...");
      try {
        await addCategory(name);
        await ctx.refreshData();
        showToast("הקטגוריה נוספה");
        paint();
      } catch {
        showToast("שגיאה בהוספת הקטגוריה");
      } finally {
        hideSpinner();
      }
    });
  }
}
