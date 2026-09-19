import { state, getFilteredRecipes, categoryName } from "../state.js";
import { escapeHtml, starsHtml } from "./common.js";

export function renderList(root, ctx) {
  const f = state.filters;

  root.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <h1>המתכונים של איילת</h1>
        <div class="actions">
          <button class="icon-btn" id="btn-search" title="חיפוש">🔎</button>
          <button class="icon-btn" id="btn-categories" title="קטגוריות">🏷️</button>
          <button class="icon-btn" id="btn-backup" title="גיבוי">💾</button>
          <button class="icon-btn" id="btn-logout" title="התנתקות">⏻</button>
        </div>
      </div>

      <div class="filter-panel ${state.ui?.showFilters ? "" : "hidden"}" id="filter-panel">
        <div class="search-row">
          <input type="search" id="search-input" placeholder="חיפוש בכותרת, בהערות או בקישורים..." value="${escapeHtml(f.text)}" />
        </div>

        <div class="chip-row" id="category-chips">
          ${state.categories
            .map(
              (c) => `<button class="chip ${f.categoryIds.includes(c.id) ? "selected" : ""}" data-cat="${c.id}">${escapeHtml(c.name)}</button>`
            )
            .join("")}
        </div>

        <div class="filter-row">
          <div class="group">
            <span>התאמה:</span>
            <div class="switch-inline">
              <button data-mode="and" class="${f.matchMode === "and" ? "active" : ""}">וגם</button>
              <button data-mode="or" class="${f.matchMode === "or" ? "active" : ""}">או</button>
            </div>
          </div>
          <label class="group">
            <input type="checkbox" id="fav-only" ${f.favoritesOnly ? "checked" : ""} />
            מועדפים בלבד
          </label>
        </div>

        <div class="filter-row" style="margin-top:10px">
          <div class="group">
            <span>הכנה:</span>
            <select id="made-filter">
              <option value="all" ${f.madeFilter === "all" ? "selected" : ""}>הכל</option>
              <option value="made" ${f.madeFilter === "made" ? "selected" : ""}>הוכן</option>
              <option value="not-made" ${f.madeFilter === "not-made" ? "selected" : ""}>לא הוכן</option>
            </select>
          </div>
          <div class="group">
            <span>מיון:</span>
            <select id="sort-by">
              <option value="created-desc" ${f.sortBy === "created-desc" ? "selected" : ""}>נוסף לאחרונה</option>
              <option value="last-made-desc" ${f.sortBy === "last-made-desc" ? "selected" : ""}>הוכן לאחרונה</option>
              <option value="title-asc" ${f.sortBy === "title-asc" ? "selected" : ""}>לפי א-ב</option>
            </select>
          </div>
        </div>
      </div>

      <div id="recipe-list"></div>
    </div>
    <button class="fab" id="fab-add" title="הוספת מתכון">+</button>
  `;

  renderGrid();

  root.querySelector("#btn-search").addEventListener("click", () => {
    state.ui = state.ui || {};
    state.ui.showFilters = !state.ui.showFilters;
    renderList(root, ctx);
  });

  root.querySelector("#btn-categories").addEventListener("click", () => ctx.openCategoryModal());
  root.querySelector("#btn-backup").addEventListener("click", () => ctx.runBackup());
  root.querySelector("#btn-logout").addEventListener("click", () => ctx.logout());
  root.querySelector("#fab-add").addEventListener("click", () => ctx.goForm(null));

  const panel = root.querySelector("#filter-panel");
  if (panel) {
    panel.querySelector("#search-input").addEventListener("input", (e) => {
      f.text = e.target.value;
      renderGrid();
    });

    panel.querySelectorAll("[data-cat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.cat;
        const idx = f.categoryIds.indexOf(id);
        if (idx === -1) f.categoryIds.push(id);
        else f.categoryIds.splice(idx, 1);
        renderList(root, ctx);
      });
    });

    panel.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        f.matchMode = btn.dataset.mode;
        renderList(root, ctx);
      });
    });

    panel.querySelector("#fav-only").addEventListener("change", (e) => {
      f.favoritesOnly = e.target.checked;
      renderGrid();
    });

    panel.querySelector("#made-filter").addEventListener("change", (e) => {
      f.madeFilter = e.target.value;
      renderGrid();
    });

    panel.querySelector("#sort-by").addEventListener("change", (e) => {
      f.sortBy = e.target.value;
      renderGrid();
    });
  }

  function renderGrid() {
    const listEl = root.querySelector("#recipe-list");
    const items = getFilteredRecipes();

    if (!state.recipes.length) {
      listEl.innerHTML = `<div class="empty-state">עדיין אין מתכונים.<br>לוחצים על + כדי להוסיף את הראשון 🍲</div>`;
      return;
    }
    if (!items.length) {
      listEl.innerHTML = `<div class="empty-state">לא נמצאו מתכונים מתאימים לסינון.</div>`;
      return;
    }

    listEl.innerHTML = `<div class="recipe-grid">${items.map(cardHtml).join("")}</div>`;

    listEl.querySelectorAll(".recipe-card").forEach((card) => {
      card.addEventListener("click", () => ctx.goDetail(card.dataset.id));
    });
  }

  function cardHtml(r) {
    const firstImage = r.recipe_images[0];
    const thumbUrl = firstImage ? state.thumbUrls.get(firstImage.storage_path) : null;
    const cats = r.recipe_categories.map((rc) => categoryName(rc.category_id)).filter(Boolean).join(" · ");

    return `
      <button class="recipe-card" data-id="${r.id}">
        <div class="thumb">
          ${thumbUrl ? `<img src="${thumbUrl}" alt="" loading="lazy" />` : `<span class="placeholder">🍽️</span>`}
          ${r.is_favorite ? `<span class="fav-badge">★</span>` : ""}
        </div>
        <div class="info">
          <div class="title">${escapeHtml(r.title || "(ללא כותרת)")}</div>
          ${cats ? `<div class="cats">${escapeHtml(cats)}</div>` : ""}
          ${r.rating ? `<div class="stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>` : ""}
        </div>
      </button>
    `;
  }
}
