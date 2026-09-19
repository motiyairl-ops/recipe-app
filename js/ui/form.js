import { state, findRecipe } from "../state.js";
import { escapeHtml, showToast, showSpinner, hideSpinner } from "./common.js";
import {
  getSignedUrls,
  createRecipe,
  updateRecipe,
  uploadRecipeImage,
  addRecipeImageRow,
  deleteRecipeImageRow,
  deleteRecipeImages,
  reorderRecipeImages,
  setRecipeCategories,
  setRecipeLinks,
} from "../db.js";

export async function renderForm(root, ctx) {
  const existing = ctx.currentId ? findRecipe(ctx.currentId) : null;
  const isEdit = !!existing;

  // ---------- מצב הטופס (בזיכרון בלבד, עד לשמירה) ----------
  const formState = {
    title: existing?.title || "",
    notes: existing?.notes || "",
    isFavorite: existing?.is_favorite || false,
    selectedCategoryIds: new Set(existing ? existing.recipe_categories.map((rc) => rc.category_id) : []),
    links: existing ? existing.recipe_links.map((l) => ({ title: l.title, url: l.url })) : [],
    // images: {kind:'existing', id, storage_path, previewUrl} | {kind:'new', file, previewUrl}
    images: [],
    removedExisting: [],
  };

  if (existing && existing.recipe_images.length) {
    const missing = existing.recipe_images.map((i) => i.storage_path).filter((p) => !state.thumbUrls.has(p));
    if (missing.length) {
      const map = await getSignedUrls(missing);
      for (const [k, v] of map) state.thumbUrls.set(k, v);
    }
    formState.images = existing.recipe_images.map((i) => ({
      kind: "existing",
      id: i.id,
      storage_path: i.storage_path,
      previewUrl: state.thumbUrls.get(i.storage_path),
    }));
  }

  paint();

  function paint() {
    root.innerHTML = `
      <div class="screen">
        <div class="sub-header">
          <button class="icon-btn" id="btn-cancel">✕</button>
          <div class="title">${isEdit ? "עריכת מתכון" : "מתכון חדש"}</div>
          <span style="width:38px"></span>
        </div>

        <div class="form-screen">
          <div class="field">
            <label for="title-input">כותרת</label>
            <input id="title-input" type="text" value="${escapeHtml(formState.title)}" placeholder="לדוגמה: מרק עוף של סבתא" />
          </div>

          <div class="field">
            <label for="notes-input">המתכון</label>
            <textarea id="notes-input" rows="8" placeholder="אפשר להקליד כאן את כל המתכון - מצרכים, אופן הכנה, הערות וטיפים. לא חובה לצרף תמונה.">${escapeHtml(formState.notes)}</textarea>
          </div>

          <div>
            <div class="section-label">תמונות (לא חובה)</div>
            <div class="image-picker-row">
              <button type="button" class="btn secondary" id="btn-camera">📷 צילום</button>
              <button type="button" class="btn secondary" id="btn-gallery">🖼️ מהגלריה</button>
            </div>
            <input type="file" id="file-camera" accept="image/*" capture="environment" class="hidden" />
            <input type="file" id="file-gallery" accept="image/*" multiple class="hidden" />
            <div class="image-thumbs" id="image-thumbs">${imagesHtml()}</div>
          </div>

          <div>
            <div class="section-label">קטגוריות</div>
            <div class="category-check-list" id="category-list">
              ${state.categories
                .map(
                  (c) =>
                    `<button type="button" class="chip ${formState.selectedCategoryIds.has(c.id) ? "selected" : ""}" data-cat="${c.id}">${escapeHtml(c.name)}</button>`
                )
                .join("")}
            </div>
          </div>

          <div>
            <div class="section-label">קישורים (אינסטגרם וכו')</div>
            <div id="links-list">${linksHtml()}</div>
            <button type="button" class="btn ghost small" id="btn-add-link">+ הוספת קישור</button>
          </div>

          <label class="group">
            <input type="checkbox" id="fav-checkbox" ${formState.isFavorite ? "checked" : ""} />
            סמן כמועדף ★
          </label>

          <div class="form-actions">
            <button type="button" class="btn full" id="btn-save">שמירה</button>
          </div>
        </div>
      </div>
    `;

    wire();
  }

  function imagesHtml() {
    return formState.images
      .map(
        (img, idx) => `
        <div class="image-thumb" data-idx="${idx}">
          <img src="${img.previewUrl}" alt="" />
          <div class="thumb-controls">
            <button type="button" data-action="left" ${idx === 0 ? "disabled" : ""}>➡</button>
            <button type="button" data-action="remove">🗑</button>
            <button type="button" data-action="right" ${idx === formState.images.length - 1 ? "disabled" : ""}>⬅</button>
          </div>
        </div>`
      )
      .join("");
  }

  function linksHtml() {
    return formState.links
      .map(
        (l, idx) => `
        <div class="link-row" data-idx="${idx}">
          <input class="title-input" data-field="title" type="text" placeholder="כותרת" value="${escapeHtml(l.title)}" />
          <input data-field="url" type="url" placeholder="קישור אינסטגרם" value="${escapeHtml(l.url)}" />
          <button type="button" class="btn ghost small" data-action="remove-link">✕</button>
        </div>`
      )
      .join("");
  }

  function wire() {
    root.querySelector("#btn-cancel").addEventListener("click", () => {
      if (isEdit) ctx.goDetail(existing.id);
      else ctx.goList();
    });

    const titleInput = root.querySelector("#title-input");
    titleInput.addEventListener("input", (e) => (formState.title = e.target.value));

    const notesInput = root.querySelector("#notes-input");
    notesInput.addEventListener("input", (e) => (formState.notes = e.target.value));

    root.querySelector("#fav-checkbox").addEventListener("change", (e) => (formState.isFavorite = e.target.checked));

    root.querySelector("#btn-camera").addEventListener("click", () => root.querySelector("#file-camera").click());
    root.querySelector("#btn-gallery").addEventListener("click", () => root.querySelector("#file-gallery").click());

    root.querySelector("#file-camera").addEventListener("change", (e) => handleFiles(e.target.files));
    root.querySelector("#file-gallery").addEventListener("change", (e) => handleFiles(e.target.files));

    root.querySelectorAll("#image-thumbs .image-thumb").forEach((thumbEl) => {
      const idx = Number(thumbEl.dataset.idx);
      thumbEl.querySelectorAll("button[data-action]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const action = btn.dataset.action;
          if (action === "remove") {
            const [removed] = formState.images.splice(idx, 1);
            if (removed.kind === "existing") formState.removedExisting.push(removed);
            else if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
          } else if (action === "left" && idx > 0) {
            swap(idx, idx - 1);
          } else if (action === "right" && idx < formState.images.length - 1) {
            swap(idx, idx + 1);
          }
          paint();
        });
      });
    });

    root.querySelectorAll("#category-list [data-cat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.cat;
        if (formState.selectedCategoryIds.has(id)) formState.selectedCategoryIds.delete(id);
        else formState.selectedCategoryIds.add(id);
        paint();
      });
    });

    root.querySelectorAll("#links-list .link-row").forEach((rowEl) => {
      const idx = Number(rowEl.dataset.idx);
      rowEl.querySelectorAll("input[data-field]").forEach((input) => {
        input.addEventListener("input", (e) => {
          formState.links[idx][e.target.dataset.field] = e.target.value;
        });
      });
      rowEl.querySelector('[data-action="remove-link"]').addEventListener("click", () => {
        formState.links.splice(idx, 1);
        paint();
      });
    });

    root.querySelector("#btn-add-link").addEventListener("click", () => {
      formState.links.push({ title: "", url: "" });
      paint();
      const inputs = root.querySelectorAll("#links-list .link-row");
      const last = inputs[inputs.length - 1];
      if (last) last.querySelector("input[data-field=title]").focus();
    });

    root.querySelector("#btn-save").addEventListener("click", handleSave);
  }

  function swap(i, j) {
    const arr = formState.images;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  function handleFiles(fileList) {
    for (const file of fileList) {
      formState.images.push({ kind: "new", file, previewUrl: URL.createObjectURL(file) });
    }
    paint();
  }

  async function handleSave() {
    const title = formState.title.trim();
    showSpinner("שומר...");
    try {
      let recipeId = isEdit ? existing.id : null;
      if (!recipeId) {
        const created = await createRecipe();
        recipeId = created.id;
      }

      await updateRecipe(recipeId, {
        title,
        notes: formState.notes,
        is_favorite: formState.isFavorite,
      });

      for (const removed of formState.removedExisting) {
        await deleteRecipeImages([removed.storage_path]);
        await deleteRecipeImageRow(removed.id);
      }

      const existingUpdates = [];
      const newUploads = [];
      formState.images.forEach((img, idx) => {
        if (img.kind === "existing") existingUpdates.push({ id: img.id, sort_order: idx });
        else newUploads.push({ file: img.file, sort_order: idx });
      });

      if (existingUpdates.length) {
        await reorderRecipeImages(existingUpdates);
      }
      for (const item of newUploads) {
        const path = await uploadRecipeImage(recipeId, item.file);
        await addRecipeImageRow(recipeId, path, item.sort_order);
      }

      await setRecipeCategories(recipeId, [...formState.selectedCategoryIds]);
      await setRecipeLinks(recipeId, formState.links);

      await ctx.refreshData();
      showToast("המתכון נשמר");
      ctx.goDetail(recipeId);
    } catch (err) {
      console.error(err);
      showToast("שגיאה בשמירה. נסי שוב.");
    } finally {
      hideSpinner();
    }
  }
}
