import { state } from "./state.js";
import { getSession, onAuthStateChange, fetchAllData, getSignedUrls } from "./db.js";
import { renderLogin } from "./ui/login.js";
import { renderHome } from "./ui/home.js";
import { renderList } from "./ui/list.js";
import { renderDetail } from "./ui/detail.js";
import { renderForm } from "./ui/form.js";
import { renderCategoryModal } from "./ui/categories.js";
import { renderBackupModal } from "./ui/backupModal.js";
import { renderCooking, releaseWakeLock } from "./ui/cooking.js";
import { runBackup } from "./backup.js";
import { showSpinner, hideSpinner, showToast } from "./ui/common.js";

const appRoot = document.getElementById("app");
const modalRoot = document.getElementById("modal-root");

state.ui = { screen: "home", currentId: null, showFilters: false, listTitle: "כל המתכונים" };

const ctx = {
  get currentId() {
    return state.ui.currentId;
  },
  goHome,
  goList,
  goDetail,
  goForm,
  goCooking,
  openCategoryModal,
  openBackupModal,
  closeModal,
  refreshData,
  runBackup: handleBackup,
  onLoginSuccess: handleLoginSuccess,
};

function goHome() {
  releaseWakeLock();
  state.ui.screen = "home";
  state.ui.currentId = null;
  render();
}

function goList() {
  releaseWakeLock();
  state.ui.screen = "list";
  state.ui.currentId = null;
  render();
}

function goDetail(id) {
  releaseWakeLock();
  state.ui.screen = "detail";
  state.ui.currentId = id;
  render();
}

function goForm(id) {
  state.ui.screen = "form";
  state.ui.currentId = id;
  render();
}

function goCooking(id) {
  state.ui.screen = "cooking";
  state.ui.currentId = id;
  render();
}

function openCategoryModal() {
  renderCategoryModal(modalRoot, ctx);
}

function openBackupModal() {
  renderBackupModal(modalRoot, ctx);
}

function closeModal() {
  modalRoot.innerHTML = "";
}

async function handleBackup() {
  await runBackup();
}

async function handleLoginSuccess() {
  state.session = await getSession();
  await refreshData();
  goHome();
}

async function refreshData() {
  const { categories, recipes } = await fetchAllData();
  state.categories = categories;
  state.recipes = recipes;

  const firstImagePaths = recipes
    .map((r) => r.recipe_images[0])
    .filter(Boolean)
    .map((img) => img.storage_path);

  if (firstImagePaths.length) {
    try {
      const map = await getSignedUrls(firstImagePaths);
      for (const [k, v] of map) state.thumbUrls.set(k, v);
    } catch (err) {
      console.warn("שגיאה בטעינת תמונות ממוזערות:", err);
    }
  }
}

async function render() {
  if (!state.session) {
    renderLogin(appRoot, ctx);
    return;
  }

  closeModal();

  switch (state.ui.screen) {
    case "detail":
      await renderDetail(appRoot, ctx);
      break;
    case "form":
      await renderForm(appRoot, ctx);
      break;
    case "cooking":
      await renderCooking(appRoot, ctx);
      break;
    case "list":
      renderList(appRoot, ctx);
      break;
    default:
      renderHome(appRoot, ctx);
  }
}

async function boot() {
  showSpinner("טוען...");
  try {
    // בודקים אם כבר יש session שמור (מהתחברות קודמת) לפני שמציגים כל מסך.
    // אם יש - מדלגים לגמרי על מסך ההתחברות ונכנסים ישר לאפליקציה.
    // מסך ההתחברות מוצג רק אם אין session בכלל (getSession() מחזיר null).
    state.session = await getSession();
    if (state.session) {
      await refreshData();
    }
  } catch (err) {
    console.error(err);
    showToast("שגיאה בטעינת הנתונים");
  } finally {
    hideSpinner();
  }
  render();

  // אין כאן שום signOut() אוטומטי - אין כפתור התנתקות ידני במסך הבית
  // (המשתמשת נשארת מחוברת). המאזין הזה רק מגיב אם ה-session עצמו
  // כבר התבטל (למשל refresh token שפג או בוטל בצד השרת).
  onAuthStateChange((session) => {
    if (!session && state.session) {
      state.session = null;
      render();
    }
  });
}

boot();
