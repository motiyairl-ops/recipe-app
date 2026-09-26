// פונקציות עזר משותפות לממשק.

export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function el(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

let toastTimer = null;
export function showToast(message) {
  clearTimeout(toastTimer);
  let toastEl = document.getElementById("toast");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "toast";
    toastEl.className = "toast";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.remove("hidden");
  toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 2600);
}

export function showSpinner(message = "טוען...") {
  hideSpinner();
  const div = document.createElement("div");
  div.id = "spinner-overlay";
  div.className = "spinner-overlay";
  div.textContent = message;
  document.body.appendChild(div);
}

export function hideSpinner() {
  const div = document.getElementById("spinner-overlay");
  if (div) div.remove();
}

export function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleDateString("he-IL", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export async function confirmDialog(message) {
  return window.confirm(message);
}

// חלון בקשת סיסמה לפני עריכה/מחיקה (מניעת טעויות בלבד, לא אבטחה).
// מחזיר true אם הוזנה הסיסמה הנכונה, false אם בוטל.
export function askPassword(expected, title = "נדרשת סיסמה") {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "pw-overlay";
    overlay.innerHTML = `
      <form class="pw-box" autocomplete="off">
        <h2>${escapeHtml(title)}</h2>
        <input type="password" inputmode="numeric" class="pw-input" placeholder="סיסמה" autocomplete="off" />
        <div class="pw-error hidden">סיסמה שגויה</div>
        <div class="pw-actions">
          <button type="submit" class="btn">אישור</button>
          <button type="button" class="btn ghost" data-cancel>ביטול</button>
        </div>
      </form>
    `;
    document.body.appendChild(overlay);

    const form = overlay.querySelector("form");
    const input = overlay.querySelector(".pw-input");
    const err = overlay.querySelector(".pw-error");
    setTimeout(() => input.focus(), 50);

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (input.value.trim() === expected) {
        close(true);
      } else {
        err.classList.remove("hidden");
        input.value = "";
        input.focus();
      }
    });
    overlay.querySelector("[data-cancel]").addEventListener("click", () => close(false));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(false);
    });
  });
}
