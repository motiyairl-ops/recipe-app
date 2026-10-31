// מודל שיתוף: נוסח הודעה שאפשר לערוך, העתקה ושליחה בוואטסאפ, ויצירת קישור חדש.
import { escapeHtml, showToast, showSpinner, hideSpinner, confirmDialog, askPassword } from "./common.js";
import { getShareSettings, saveShareMessage, resetShareToken } from "../db.js";
import { buildShareLink, buildShareMessage, copyText, LINK_PLACEHOLDER } from "../share.js";
import { EDIT_PASSWORD } from "../config.js";

export async function renderShareModal(root, ctx) {
  let settings;
  showSpinner("טוען...");
  try {
    settings = await getShareSettings();
  } catch (err) {
    console.error(err);
    showToast("שגיאה בטעינת הגדרות השיתוף");
    return;
  } finally {
    hideSpinner();
  }

  let savedMessage = settings.message;
  paint();

  function link() {
    return buildShareLink(settings.token);
  }

  function paint() {
    root.innerHTML = `
      <div class="modal-overlay" id="overlay">
        <div class="modal-sheet">
          <h2>שיתוף המתכונים</h2>
          <p class="share-explain">
            מי שמקבל את הקישור יכול לצפות בכל המתכונים, בלי סיסמה ובלי התחברות.
            אי אפשר דרכו להוסיף, לערוך או למחוק שום דבר.
          </p>

          <div class="field">
            <label for="share-message">ההודעה לשליחה</label>
            <textarea id="share-message" rows="5">${escapeHtml(savedMessage)}</textarea>
            <div class="share-hint">במקום <b>${escapeHtml(LINK_PLACEHOLDER)}</b> ייכנס הקישור. אפשר לשנות את הנוסח, והוא נשמר לפעם הבאה.</div>
          </div>

          <div class="share-link-box" dir="ltr">${escapeHtml(link())}</div>

          <div class="share-actions">
            <button class="btn full" id="btn-copy">📋 העתקת ההודעה</button>
            <button class="btn secondary full" id="btn-whatsapp">שליחה בוואטסאפ</button>
          </div>

          <div class="share-danger">
            <div class="section-label">קישור חדש</div>
            <p>
              הקישור נשאר אותו קישור, ואפשר לשלוח אותו לכמה אנשים שרוצים, מתי שרוצים.
              קישור חדש צריך רק אם הקישור הגיע למישהו שלא רצית.
              <b>יצירת קישור חדש מבטלת את הקישור הנוכחי אצל כל מי שקיבל אותו</b>,
              ואז צריך לשלוח את החדש שוב למי שכן צריך.
            </p>
            <button class="btn danger small" id="btn-reset">יצירת קישור חדש</button>
          </div>

          <div class="form-actions">
            <button class="btn ghost full" id="btn-close">סגירה</button>
          </div>
        </div>
      </div>
    `;
    wire();
  }

  async function persistMessageIfChanged() {
    const current = root.querySelector("#share-message").value;
    if (current === savedMessage) return;
    try {
      await saveShareMessage(current);
      savedMessage = current;
    } catch (err) {
      console.error(err);
      showToast("לא הצלחתי לשמור את הנוסח");
    }
  }

  function finalMessage() {
    return buildShareMessage(root.querySelector("#share-message").value, link());
  }

  function wire() {
    const overlay = root.querySelector("#overlay");
    const close = async () => {
      await persistMessageIfChanged();
      ctx.closeModal();
    };
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    root.querySelector("#btn-close").addEventListener("click", close);
    root.querySelector("#share-message").addEventListener("blur", persistMessageIfChanged);

    root.querySelector("#btn-copy").addEventListener("click", async () => {
      // ההעתקה קודמת לשמירה, כדי שהדפדפן יזהה אותה כחלק מהלחיצה
      const ok = await copyText(finalMessage());
      showToast(ok ? "ההודעה הועתקה. אפשר להדביק בוואטסאפ" : "ההעתקה לא הצליחה");
      persistMessageIfChanged();
    });

    root.querySelector("#btn-whatsapp").addEventListener("click", () => {
      const url = `https://wa.me/?text=${encodeURIComponent(finalMessage())}`;
      window.open(url, "_blank");
      persistMessageIfChanged();
    });

    root.querySelector("#btn-reset").addEventListener("click", async () => {
      if (!(await askPassword(EDIT_PASSWORD, "סיסמה ליצירת קישור חדש"))) return;
      const ok = await confirmDialog(
        "ליצור קישור חדש? הקישור הנוכחי יפסיק לעבוד אצל כל מי שקיבל אותו."
      );
      if (!ok) return;
      await persistMessageIfChanged();
      showSpinner("יוצר קישור חדש...");
      try {
        settings.token = await resetShareToken();
        paint();
        showToast("נוצר קישור חדש. הקישור הקודם כבר לא עובד");
      } catch (err) {
        console.error(err);
        showToast("שגיאה ביצירת קישור חדש");
      } finally {
        hideSpinner();
      }
    });
  }
}
