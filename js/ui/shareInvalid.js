// מסך שמוצג לצופה כשקישור השיתוף בוטל (נוצר קישור חדש) או שגוי.

export function renderShareInvalid(root, ctx) {
  root.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <img src="icons/icon-192.png" class="app-icon" alt="" />
        <h1>המתכונים של איילת</h1>
        <p class="share-invalid-text">
          הקישור הזה כבר לא פעיל.<br />
          כדי לצפות במתכונים, בקשו מאיילת לשלוח קישור חדש.
        </p>
        <button class="link-btn" id="btn-owner-login">כניסה עם אימייל וסיסמה</button>
      </div>
    </div>
  `;
  root.querySelector("#btn-owner-login").addEventListener("click", () => ctx.goLogin());
}
