import { signIn } from "../db.js";
import { showToast } from "./common.js";

export function renderLogin(root, ctx) {
  root.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <img src="icons/icon-192.png" class="app-icon" alt="" />
        <h1>המתכונים של איילת</h1>
        <form id="login-form">
          <div class="field">
            <label for="email">אימייל</label>
            <input id="email" type="email" autocomplete="username" required />
          </div>
          <div class="field">
            <label for="password">סיסמה</label>
            <input id="password" type="password" autocomplete="current-password" required />
          </div>
          <button type="submit" class="btn full">התחברות</button>
          <div id="login-error" class="error-msg hidden"></div>
        </form>
      </div>
    </div>
  `;

  const form = root.querySelector("#login-form");
  const errorBox = root.querySelector("#login-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.classList.add("hidden");
    const email = form.querySelector("#email").value.trim();
    const password = form.querySelector("#password").value;
    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "מתחבר...";
    try {
      await signIn(email, password);
      await ctx.onLoginSuccess();
    } catch (err) {
      errorBox.textContent = "התחברות נכשלה. בדקי את האימייל והסיסמה ונסי שוב.";
      errorBox.classList.remove("hidden");
      showToast("שגיאה בהתחברות");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "התחברות";
    }
  });
}
