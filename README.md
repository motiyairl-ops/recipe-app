# המתכונים של איילת — הוראות פריסה

אפליקציית PWA לריכוז מתכונים, מחוברת ל-Supabase שכבר הוגדר (טבלאות, RLS, דלי אחסון).

## שלב 1: העלאה ל-GitHub

1. ב-GitHub, יוצרים ריפו חדש **פרטי** (Private), למשל בשם `recipe-app`.
2. מעלים אליו את כל התוכן של התיקייה הזו (כולל הקבצים המוסתרים `.github` ו-`.nojekyll`).
   - הכי קל: גוררים את כל הקבצים לממשק "Add file > Upload files" באתר GitHub.
   - או, אם נוח לך עם הטרמינל:
     ```bash
     cd recipe-app
     git init
     git add -A
     git commit -m "גרסה ראשונה"
     git branch -M main
     git remote add origin https://github.com/<שם-המשתמש>/recipe-app.git
     git push -u origin main
     ```

## שלב 2: הפעלת GitHub Pages

1. בריפו, נכנסים ל-**Settings > Pages**.
2. תחת **Source**, בוחרים **Deploy from a branch**.
3. Branch: `main`, תיקייה: `/ (root)`. שומרים.
4. אחרי דקה-שתיים, הכתובת של האפליקציה תופיע למעלה (בדרך כלל
   `https://<שם-המשתמש>.github.io/recipe-app/`).

> **הערה:** גם אם הריפו פרטי, GitHub Pages דורש בדרך כלל תוכנית בתשלום כדי
> להנגיש אתר מריפו פרטי. אם זו מגבלה, הכי פשוט להפוך את הריפו לציבורי —
> זה בטוח, כי אין בקוד שום סוד: מפתח ה-anon שבקובץ `js/config.js` הוא
> מפתח ציבורי מיועד לכך, וכל ההגנה על הנתונים היא בהרשאות (RLS) בצד השרת.

## שלב 3: הוספת ה-secrets לפעימת החיים

כדי שהקובץ `.github/workflows/keepalive.yml` יעבוד:

1. **Settings > Secrets and variables > Actions > New repository secret**.
2. מוסיפים שני secrets:
   - `SUPABASE_URL` — לדוגמה `https://odjcuvahailaaialkihw.supabase.co`
   - `SUPABASE_ANON_KEY` — מפתח ה-anon/publishable (אותו אחד שכבר בקובץ `js/config.js`)
3. אפשר לבדוק שזה עובד: **Actions > Supabase Keep-Alive > Run workflow** (הפעלה ידנית).

**חשוב לדעת:** GitHub מכבה workflows מתוזמנים אוטומטית בריפו שאין בו שום
פעילות (commit) במשך כ-60 יום. כדי שזה לא יקרה בשקט, מומלץ להיכנס
מדי פעם ללשונית Actions ולוודא שהריצות האחרונות הצליחו. אם תרצה הגנה
נוספת, אפשר להוסיף גם שירות חיצוני חינמי כמו cron-job.org שיפנה ישירות
לכתובת ה-API של Supabase כגיבוי.

## שלב 4: התקנה על האייפון

1. פותחים את כתובת האפליקציה ב-Safari באייפון.
2. מתחברים עם המייל והסיסמה שנוצרו ב-Supabase.
3. לוחצים על כפתור השיתוף (הריבוע עם החץ למעלה) ואז **"הוסף למסך הבית"**.
4. מעכשיו האפליקציה תיפתח כמו אפליקציה רגילה, בלי סרגלי הכתובת של ספארי.

## מבנה הפרויקט

```
index.html              מעטפת ה-HTML הראשית
manifest.json           הגדרות ה-PWA (שם, אייקון, צבעים)
sw.js                   Service Worker לטעינה מהירה של מעטפת האפליקציה
css/style.css           כל העיצוב, RTL מלא
js/config.js            כתובת ומפתח Supabase
js/supabaseClient.js     יצירת הלקוח מול Supabase
js/db.js                כל הקריאות למסד הנתונים ולאחסון
js/state.js             מצב האפליקציה + לוגיקת סינון/חיפוש
js/imageUtils.js        כיווץ תמונות לפני העלאה
js/backup.js            ייצוא גיבוי (ZIP) ושיתוף
js/app.js               הרכבת המסכים וניהול הניווט
js/ui/*.js              מסכי הממשק (התחברות, רשימה, פרטי מתכון, טופס, קטגוריות, מצב בישול)
icons/                  אייקוני PWA
.github/workflows/      פעימת החיים המתוזמנת
```

## עדכון האפליקציה בעתיד

כל שינוי עתידי בקוד (למשל תכונה חדשה) מועלה שוב לאותו ריפו ב-GitHub
(commit + push, או העלאת הקבצים המעודכנים דרך הממשק). GitHub Pages
יתעדכן אוטומטית תוך דקה-שתיים.

## גיבוי

כפתור ה-💾 במסך הראשי מייצא קובץ ZIP עם כל המתכונים והתמונות (ובתוכו
`data.json` עם כל הנתונים), ופותח את תפריט השיתוף של האייפון כדי לשמור
אותו לדרייב או לכל מקום אחר.
