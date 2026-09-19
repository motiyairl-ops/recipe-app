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
