import { state, findRecipe, categoryName } from "../state.js";
import { escapeHtml, formatDate, showToast, showSpinner, hideSpinner, confirmDialog } from "./common.js";
import { getSignedUrls, toggleFavorite, setRating, markMade, unmarkMade, deleteRecipe } from "../db.js";

export async function renderDetail(root, ctx) {
  const recipe = findRecipe(ctx.currentId);
  if (!recipe) {
    ctx.goList();
    return;
  }

  await ensureImageUrls(recipe);

  const cats = recipe.recipe_categories.map((rc) => categoryName(rc.category_id)).filter(Boolean);

  root.innerHTML = `
    <div class="screen">
      <div class="sub-header">
        <button class="icon-btn" id="btn-back">→</button>
        <div class="title">${escapeHtml(recipe.title || "(ללא כותרת)")}</div>
        <button class="icon-btn" id="btn-edit" title="עריכה">✎</button>
      </div>

      <div class="detail-gallery">
        ${
          recipe.recipe_images.length
            ? `<div class="slides">${recipe.recipe_images
                .map((img) => `<img src="${state.thumbUrls.get(img.storage_path) || ""}" alt="" />`)
                .join("")}</div>`
            : `<div class="no-image">🍽️</div>`
        }
      </div>

      <div class="detail-body">
        <div class="detail-title-row">
          <div>
            ${cats.length ? `<div class="cats">${escapeHtml(cats.join(" · "))}</div>` : ""}
          </div>
          <button class="icon-btn" id="btn-fav" title="מועדף">${recipe.is_favorite ? "★" : "☆"}</button>
        </div>

        <div id="rating-holder"></div>

        <div class="made-row">
          <label>
            <input type="checkbox" id="made-checkbox" ${recipe.made ? "checked" : ""} />
            הכנתי את המתכון הזה
          </label>
          ${recipe.last_made_at ? `<span>· לאחרונה ב-${formatDate(recipe.last_made_at)}</span>` : ""}
        </div>

        ${
          recipe.notes
            ? `<div><div class="section-label">הערות</div><div class="notes-box">${escapeHtml(recipe.notes)}</div></div>`
            : ""
        }

        ${
          recipe.recipe_links.length
            ? `<div>
                <div class="section-label">קישורים</div>
                <div class="link-list">
                  ${recipe.recipe_links
                    .map(
                      (l) => `<a class="link-item" href="${escapeHtml(l.url)}" target="_blank" rel="noopener">
                        <span>${escapeHtml(l.title || l.url)}</span>
                        <span class="ig-icon">🔗</span>
                      </a>`
                    )
                    .join("")}
                </div>
              </div>`
            : ""
        }

        <div class="detail-actions">
          ${recipe.recipe_images.length ? `<button class="btn secondary" id="btn-cooking">מצב בישול 👨‍🍳</button>` : ""}
          <button class="btn ghost danger" id="btn-delete">מחיקת מתכון</button>
        </div>
      </div>
    </div>
  `;

  renderStars();

  root.querySelector("#btn-back").addEventListener("click", () => ctx.goList());
  root.querySelector("#btn-edit").addEventListener("click", () => ctx.goForm(recipe.id));

  root.querySelector("#btn-fav").addEventListener("click", async (e) => {
    const newVal = !recipe.is_favorite;
    e.target.textContent = newVal ? "★" : "☆";
    try {
      await toggleFavorite(recipe.id, newVal);
      recipe.is_favorite = newVal;
    } catch {
      showToast("שגיאה בשמירה");
    }
  });

  root.querySelector("#made-checkbox").addEventListener("change", async (e) => {
    try {
      if (e.target.checked) {
        const today = new Date().toISOString();
        await markMade(recipe.id, today);
        recipe.made = true;
        recipe.last_made_at = today;
      } else {
        await unmarkMade(recipe.id);
        recipe.made = false;
      }
      renderDetail(root, ctx);
    } catch {
      showToast("שגיאה בשמירה");
    }
  });

  const cookingBtn = root.querySelector("#btn-cooking");
  if (cookingBtn) cookingBtn.addEventListener("click", () => ctx.goCooking(recipe.id));

  root.querySelector("#btn-delete").addEventListener("click", async () => {
    const ok = await confirmDialog(`למחוק את המתכון "${recipe.title || "ללא כותרת"}"? הפעולה בלתי הפיכה.`);
    if (!ok) return;
    showSpinner("מוחק...");
    try {
      const paths = recipe.recipe_images.map((i) => i.storage_path);
      await deleteRecipe(recipe.id, paths);
      await ctx.refreshData();
      showToast("המתכון נמחק");
      ctx.goList();
    } catch {
      showToast("שגיאה במחיקה");
    } finally {
      hideSpinner();
    }
  });

  function renderStars() {
    const holder = root.querySelector("#rating-holder");
    const r = recipe.rating || 0;
    holder.innerHTML = `<span class="star-rating" id="rating-stars">${[1, 2, 3, 4, 5]
      .map((i) => `<span class="star ${i <= r ? "filled" : ""}" data-star="${i}">★</span>`)
      .join("")}</span>`;
    holder.querySelectorAll("[data-star]").forEach((starEl) => {
      starEl.addEventListener("click", async () => {
        const val = Number(starEl.dataset.star);
        const newRating = recipe.rating === val ? null : val;
        try {
          await setRating(recipe.id, newRating);
          recipe.rating = newRating;
          renderStars();
        } catch {
          showToast("שגיאה בשמירת הדירוג");
        }
      });
    });
  }
}

async function ensureImageUrls(recipe) {
  const missing = recipe.recipe_images.map((i) => i.storage_path).filter((p) => !state.thumbUrls.has(p));
  if (!missing.length) return;
  const map = await getSignedUrls(missing);
  for (const [k, v] of map) state.thumbUrls.set(k, v);
}
