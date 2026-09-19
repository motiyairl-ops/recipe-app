// מסך הבית: קטגוריות במקום כל המתכונים בבת אחת.
import { state } from "../state.js";
import { escapeHtml } from "./common.js";

export function renderHome(root, ctx) {
  const totalCount = state.recipes.length;
  const favCount = state.recipes.filter((r) => r.is_favorite).length;

  const counts = new Map();
  for (const c of state.categories) counts.set(c.id, 0);
  for (const r of state.recipes) {
    for (const rc of r.recipe_categories) {
      counts.set(rc.category_id, (counts.get(rc.category_id) || 0) + 1);
    }
  }

  root.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <h1>המתכונים של איילת</h1>
        <div class="actions">
          <button class="icon-btn" id="btn-search" title="חיפוש בכל המתכונים">🔎</button>
          <button class="icon-btn" id="btn-categories" title="ניהול קטגוריות ואחסון">🏷️</button>
          <button class="icon-btn" id="btn-backup" title="גיבוי">💾</button>
          <button class="icon-btn" id="btn-logout" title="התנתקות">⏻</button>
        </div>
      </div>

      <div class="home-grid">
        <button class="home-tile home-tile-accent" data-action="all">
          <span class="home-tile-icon">📖</span>
          <span class="home-tile-name">כל המתכונים</span>
          <span class="home-tile-count">${totalCount}</span>
        </button>
        <button class="home-tile home-tile-accent" data-action="favorites">
          <span class="home-tile-icon">★</span>
          <span class="home-tile-name">מועדפים</span>
          <span class="home-tile-count">${favCount}</span>
        </button>
        ${state.categories
          .map(
            (c) => `
          <button class="home-tile" data-action="category" data-id="${c.id}">
            <span class="home-tile-icon">🏷️</span>
            <span class="home-tile-name">${escapeHtml(c.name)}</span>
            <span class="home-tile-count">${counts.get(c.id) || 0}</span>
          </button>`
          )
          .join("")}
      </div>

      ${
        !state.categories.length
          ? `<div class="empty-state">אין עדיין קטגוריות. אפשר להוסיף דרך כפתור ה-🏷️ למעלה.</div>`
          : ""
      }
    </div>
    <button class="fab" id="fab-add" title="הוספת מתכון">+</button>
  `;

  root.querySelector("#btn-search").addEventListener("click", () => {
    state.ui.showFilters = true;
    ctx.goList();
  });
  root.querySelector("#btn-categories").addEventListener("click", () => ctx.openCategoryModal());
  root.querySelector("#btn-backup").addEventListener("click", () => ctx.runBackup());
  root.querySelector("#btn-logout").addEventListener("click", () => ctx.logout());
  root.querySelector("#fab-add").addEventListener("click", () => ctx.goForm(null));

  root.querySelectorAll(".home-tile").forEach((tile) => {
    tile.addEventListener("click", () => {
      const action = tile.dataset.action;
      state.filters.text = "";
      state.filters.favoritesOnly = false;
      state.filters.madeFilter = "all";
      state.filters.categoryIds = [];

      if (action === "favorites") {
        state.filters.favoritesOnly = true;
        state.ui.showFilters = true;
      } else if (action === "category") {
        state.filters.categoryIds = [tile.dataset.id];
        state.ui.showFilters = true;
      } else {
        state.ui.showFilters = false;
      }
      ctx.goList();
    });
  });
}
