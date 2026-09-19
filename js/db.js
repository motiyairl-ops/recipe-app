// שכבת הגישה לנתונים: כל הקריאות ל-Supabase (מסד נתונים ואחסון) עוברות כאן.
import { supabase } from "./supabaseClient.js";
import { IMAGES_BUCKET, SIGNED_URL_TTL } from "./config.js";
import { compressImage, fileExtensionFor } from "./imageUtils.js";

// ---------- אימות ----------

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return data.subscription;
}

// ---------- שליפת כל הנתונים ----------

export async function fetchAllData() {
  const [{ data: categories, error: catErr }, { data: recipes, error: recErr }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order", { ascending: true }),
    supabase
      .from("recipes")
      .select(
        `*,
        recipe_categories ( category_id ),
        recipe_images ( id, storage_path, sort_order ),
        recipe_links ( id, url, title )`
      )
      .order("created_at", { ascending: false }),
  ]);
  if (catErr) throw catErr;
  if (recErr) throw recErr;

  // מיון תת-הרשימות לפי sort_order
  for (const r of recipes) {
    r.recipe_images.sort((a, b) => a.sort_order - b.sort_order);
  }

  return { categories, recipes };
}

// ---------- קטגוריות ----------

export async function addCategory(name) {
  const { data: existing } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = existing && existing.length ? existing[0].sort_order + 1 : 1;
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: name.trim(), sort_order: nextOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function renameCategory(id, name) {
  const { error } = await supabase.from("categories").update({ name: name.trim() }).eq("id", id);
  if (error) throw error;
}

export async function deleteCategory(id) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

export async function countRecipesInCategory(recipes, categoryId) {
  return recipes.filter((r) => r.recipe_categories.some((rc) => rc.category_id === categoryId)).length;
}

// ---------- תמונות ----------

/**
 * מעריך את נפח האחסון (בבייטים) של תמונות המתכונים בדלי ה-Storage.
 * עובר תיקייה-תיקייה (לפי מזהה מתכון) כי ה-API של Storage לא תומך
 * ברשימה רקורסיבית של כל הדלי בבת אחת.
 */
export async function getStorageUsage(recipeIds) {
  let totalBytes = 0;
  let fileCount = 0;
  for (const recipeId of recipeIds) {
    const { data, error } = await supabase.storage.from(IMAGES_BUCKET).list(recipeId, { limit: 1000 });
    if (error || !data) continue;
    for (const item of data) {
      const size = item?.metadata?.size;
      if (typeof size === "number") {
        totalBytes += size;
        fileCount++;
      }
    }
  }
  return { totalBytes, fileCount };
}

/** מחזיר Map של storage_path -> קישור חתום, לרשימת נתיבים */
export async function getSignedUrls(paths) {
  const map = new Map();
  if (!paths.length) return map;
  const { data, error } = await supabase.storage.from(IMAGES_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
  if (error) throw error;
  for (const item of data) {
    if (item.signedUrl) map.set(item.path, item.signedUrl);
  }
  return map;
}

/** מעלה קובץ תמונה (לאחר כיווץ) ומחזיר את נתיב האחסון */
export async function uploadRecipeImage(recipeId, file) {
  const compressed = await compressImage(file);
  const ext = fileExtensionFor(compressed);
  const path = `${recipeId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(IMAGES_BUCKET).upload(path, compressed, {
    contentType: compressed.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function deleteRecipeImages(paths) {
  if (!paths.length) return;
  const { error } = await supabase.storage.from(IMAGES_BUCKET).remove(paths);
  if (error) throw error;
}

// ---------- מתכונים ----------

export async function createRecipe() {
  const { data, error } = await supabase.from("recipes").insert({}).select().single();
  if (error) throw error;
  return data;
}

export async function updateRecipe(id, fields) {
  const { error } = await supabase.from("recipes").update(fields).eq("id", id);
  if (error) throw error;
}

export async function deleteRecipe(id, imagePaths) {
  // מוחקים קודם את קבצי האחסון, ואז את שורת המתכון (מחיקת שרשור תדאג לשאר הטבלאות)
  if (imagePaths && imagePaths.length) {
    await deleteRecipeImages(imagePaths);
  }
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) throw error;
}

export async function setRecipeCategories(recipeId, categoryIds) {
  const { error: delErr } = await supabase.from("recipe_categories").delete().eq("recipe_id", recipeId);
  if (delErr) throw delErr;
  if (categoryIds.length) {
    const rows = categoryIds.map((category_id) => ({ recipe_id: recipeId, category_id }));
    const { error: insErr } = await supabase.from("recipe_categories").insert(rows);
    if (insErr) throw insErr;
  }
}

export async function setRecipeLinks(recipeId, links) {
  const { error: delErr } = await supabase.from("recipe_links").delete().eq("recipe_id", recipeId);
  if (delErr) throw delErr;
  const clean = links.filter((l) => l.url && l.url.trim());
  if (clean.length) {
    const rows = clean.map((l) => ({ recipe_id: recipeId, url: l.url.trim(), title: (l.title || "").trim() }));
    const { error: insErr } = await supabase.from("recipe_links").insert(rows);
    if (insErr) throw insErr;
  }
}

export async function addRecipeImageRow(recipeId, storagePath, sortOrder) {
  const { data, error } = await supabase
    .from("recipe_images")
    .insert({ recipe_id: recipeId, storage_path: storagePath, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRecipeImageRow(imageId) {
  const { error } = await supabase.from("recipe_images").delete().eq("id", imageId);
  if (error) throw error;
}

export async function reorderRecipeImages(images) {
  // images: [{id, sort_order}]
  for (const img of images) {
    const { error } = await supabase.from("recipe_images").update({ sort_order: img.sort_order }).eq("id", img.id);
    if (error) throw error;
  }
}

export async function toggleFavorite(recipeId, value) {
  await updateRecipe(recipeId, { is_favorite: value });
}

export async function setRating(recipeId, rating) {
  await updateRecipe(recipeId, { rating });
}

export async function markMade(recipeId, madeDate) {
  await updateRecipe(recipeId, { made: true, last_made_at: madeDate });
}

export async function unmarkMade(recipeId) {
  await updateRecipe(recipeId, { made: false });
}
