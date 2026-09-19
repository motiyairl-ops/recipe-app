// מצב האפליקציה בזיכרון + לוגיקת סינון/חיפוש.

export const state = {
  session: null,
  categories: [], // [{id, name, sort_order}]
  recipes: [], // כולל recipe_categories/recipe_images/recipe_links
  thumbUrls: new Map(), // storage_path -> signed url
  filters: {
    text: "",
    categoryIds: [], // מזהי קטגוריות שנבחרו לסינון
    matchMode: "and", // 'and' | 'or'
    favoritesOnly: false,
    madeFilter: "all", // 'all' | 'made' | 'not-made'
    sortBy: "created-desc", // 'created-desc' | 'last-made-desc' | 'title-asc'
  },
};

export function recipeCategoryIds(recipe) {
  return recipe.recipe_categories.map((rc) => rc.category_id);
}

export function categoryName(categoryId) {
  const c = state.categories.find((c) => c.id === categoryId);
  return c ? c.name : "";
}

export function getFilteredRecipes() {
  const f = state.filters;
  const text = f.text.trim().toLowerCase();

  let list = state.recipes.filter((r) => {
    if (f.favoritesOnly && !r.is_favorite) return false;
    if (f.madeFilter === "made" && !r.made) return false;
    if (f.madeFilter === "not-made" && r.made) return false;

    if (f.categoryIds.length) {
      const recipeCats = recipeCategoryIds(r);
      if (f.matchMode === "and") {
        if (!f.categoryIds.every((id) => recipeCats.includes(id))) return false;
      } else {
        if (!f.categoryIds.some((id) => recipeCats.includes(id))) return false;
      }
    }

    if (text) {
      const inTitle = (r.title || "").toLowerCase().includes(text);
      const inNotes = (r.notes || "").toLowerCase().includes(text);
      const inLinks = r.recipe_links.some((l) => (l.title || "").toLowerCase().includes(text));
      if (!inTitle && !inNotes && !inLinks) return false;
    }

    return true;
  });

  list = list.slice().sort((a, b) => {
    if (f.sortBy === "title-asc") {
      return (a.title || "").localeCompare(b.title || "", "he");
    }
    if (f.sortBy === "last-made-desc") {
      const at = a.last_made_at ? new Date(a.last_made_at).getTime() : 0;
      const bt = b.last_made_at ? new Date(b.last_made_at).getTime() : 0;
      return bt - at;
    }
    // created-desc (ברירת מחדל)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return list;
}

export function findRecipe(id) {
  return state.recipes.find((r) => r.id === id);
}
