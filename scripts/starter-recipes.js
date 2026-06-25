const RECIPE_MEAL_LABELS = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' };
const RECIPE_MEAL_KEYS = {
    'Завтрак': 'breakfast',
    'Обед': 'lunch',
    'Ужин': 'dinner',
    'Перекус': 'snack',
    'Десерт': 'snack',
    'Напиток': 'snack',
    'Салат': 'lunch',
    'Соус': 'snack',
    'Основное': 'lunch',
    'Основное блюдо': 'lunch'
};
const RECIPE_GOAL_LABELS = { cutting: 'Сушка', weight_loss: 'Похудение', maintenance: 'Поддержание', bulking: 'Набор', muscle_gain: 'Рост мышц' };
const RECIPE_NUTRITION_LABELS = { high_protein: 'Высокий белок', low_calorie: 'Низкокалорийное', low_carb: 'Low carb', low_fat: 'Мало жиров', balanced: 'Баланс', quick: 'Быстро', meal_prep: 'Заготовка' };
const VALID_INGREDIENT_UNITS = ['g', 'ml', 'pcs'];
const VALID_INGREDIENT_CATEGORIES = ['meat', 'fish', 'dairy', 'eggs', 'grains', 'vegetables', 'fruits', 'nuts', 'oils', 'spices', 'other'];

function ingredientAmountToGrams(name, amount, unit, explicitGrams) {
    if (Number(explicitGrams) > 0) return Number(explicitGrams);
    const value = Number(amount) || 0;
    const key = String(unit || 'g').toLowerCase();
    if (key === 'ml') return value;
    if (key !== 'pcs') return value;
    return /(яйц|egg)/i.test(String(name || '')) ? value * 55 : value;
}

function catalogIngredientToStarter(ingredient) {
    const weight = Number(ingredient.weight ?? ingredient.grams ?? ingredient.amount) || 0;
    const unit = ingredient.unit || 'g';
    return {
        name: ingredient.name || 'Ингредиент',
        amount: Number(ingredient.amount ?? weight) || 0,
        grams: weight,
        unit,
        category: ingredient.category || 'other',
        ingredientId: ingredient.ingredientId || ingredient.ingredient_id || null,
        kcalPer100: Number(ingredient.kcalPer100 ?? ingredient.kcal_per_100) || 0,
        proteinPer100: Number(ingredient.proteinPer100 ?? ingredient.protein_per_100) || 0,
        fatPer100: Number(ingredient.fatPer100 ?? ingredient.fat_per_100) || 0,
        carbsPer100: Number(ingredient.carbsPer100 ?? ingredient.carbs_per_100) || 0
    };
}

function catalogRecipeToStarter(recipe) {
    const slug = recipe.slug || recipe.id;
    const mealType = recipe.mealType || RECIPE_MEAL_KEYS[recipe.category] || 'snack';
    const nutrition = recipe.nutrition || {};
    const imageUrl = recipe.image_url || (slug ? 'assets/recipes/' + slug + '.webp' : '');
    return {
        id: recipe.legacyId || recipe.id || slug,
        slug,
        sort: Number(recipe.sort) || 0,
        title: recipe.title || recipe.name || 'Рецепт',
        description: recipe.description || '',
        mealType,
        category: RECIPE_MEAL_LABELS[mealType] || recipe.category || 'Рецепт',
        goalTags: recipe.goalTags || [],
        nutritionTags: recipe.nutritionTags || [],
        calories: Number(recipe.calories ?? nutrition.calories) || 0,
        protein: Number(recipe.protein ?? nutrition.protein) || 0,
        fat: Number(recipe.fat ?? nutrition.fat) || 0,
        carbs: Number(recipe.carbs ?? nutrition.carbs) || 0,
        cookingTime: Number(recipe.cookingTime || recipe.cooking_time || recipe.time_minutes) || 20,
        servings: Number(recipe.servings) || 1,
        ingredients: (recipe.ingredients || []).map(catalogIngredientToStarter),
        instructions: recipe.steps || recipe.instructions || [],
        storage: recipe.storage || '',
        image: imageUrl,
        image_url: imageUrl,
        isMealPrep: Boolean(recipe.isMealPrep),
        isFreezerFriendly: Boolean(recipe.isFreezerFriendly),
        searchKeywords: recipe.searchKeywords || []
    };
}

const STARTER_RECIPES = (Array.isArray(CATALOG_RECIPES) ? CATALOG_RECIPES : []).map(catalogRecipeToStarter);
