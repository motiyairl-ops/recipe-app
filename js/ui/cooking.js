import { state, findRecipe } from "../state.js";
import { escapeHtml, showToast } from "./common.js";
import { getSignedUrls } from "../db.js";

let wakeLock = null;

export async function renderCooking(root, ctx) {
  const recipe = findRecipe(ctx.currentId);
  if (!recipe) {
    ctx.goList();
    return;
  }

  const missing = recipe.recipe_images.map((i) => i.storage_path).filter((p) => !state.thumbUrls.has(p));
  if (missing.length) {
    const map = await getSignedUrls(missing);
    for (const [k, v] of map) state.thumbUrls.set(k, v);
  }

  root.innerHTML = `
    <div class="cooking-mode">
      <div class="cooking-top">
        <button class="icon-btn" id="btn-exit">✕ יציאה</button>
        <span>${escapeHtml(recipe.title || "")}</span>
        <span style="width:38px"></span>
      </div>
      <div class="cooking-image-wrap">
        ${recipe.recipe_images
          .map((img) => `<img src="${state.thumbUrls.get(img.storage_path) || ""}" alt="" />`)
          .join("")}
      </div>
      ${recipe.notes ? `<div class="cooking-notes">${escapeHtml(recipe.notes)}</div>` : ""}
    </div>
  `;

  root.querySelector("#btn-exit").addEventListener("click", () => {
    releaseWakeLock();
    ctx.goDetail(recipe.id);
  });

  requestWakeLock();
}

async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
      document.addEventListener("visibilitychange", reacquireOnVisible);
    }
  } catch (err) {
    console.warn("Wake Lock לא זמין:", err);
  }
}

async function reacquireOnVisible() {
  if (wakeLock !== null && document.visibilityState === "visible") {
    try {
      wakeLock = await navigator.wakeLock.request("screen");
    } catch {
      // מתעלמים, לא קריטי
    }
  }
}

export function releaseWakeLock() {
  document.removeEventListener("visibilitychange", reacquireOnVisible);
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}
