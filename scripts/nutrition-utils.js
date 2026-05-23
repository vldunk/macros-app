function calculateIngredientNutrition(items) {
            let kcal = 0, protein = 0, fat = 0, carbs = 0;
            let grams = 0;
            (items || []).forEach(i => {
                const product = i.products || i;
                const amount = Math.max(0, Number(i.grams ?? i.weight ?? i.default_grams) || 0);
                const ratio = amount / 100;
                grams += amount;
                kcal += (Number(product.kcal ?? product.kcalPer100 ?? product.kcal_per_100) || 0) * ratio;
                protein += (Number(product.protein ?? product.proteinPer100 ?? product.protein_per_100) || 0) * ratio;
                fat += (Number(product.fat ?? product.fatPer100 ?? product.fat_per_100) || 0) * ratio;
                carbs += (Number(product.carbs ?? product.carbsPer100 ?? product.carbs_per_100) || 0) * ratio;
            });
            return { kcal, protein, fat, carbs, grams };
        }

function recipeHasIngredientNutrition(recipe) {
            return (recipe?.recipe_ingredients || []).some(i => Number(i.products?.kcal) || Number(i.products?.protein) || Number(i.products?.fat) || Number(i.products?.carbs));
        }

function getRecipePortionNutrition(recipe, ingredients) {
            const selected = ingredients || getRecipeWorkingIngredients(recipe);
            if (recipeHasIngredientNutrition({ recipe_ingredients: selected })) return calculateIngredientNutrition(selected);
            const grams = selected.reduce((sum, i) => sum + (Number(i.grams ?? i.weight ?? i.default_grams) || 0), 0);
            const ratio = grams > 0 ? grams / 100 : 1;
            return {
                kcal: (Number(recipe?.calories) || 0) * ratio,
                protein: (Number(recipe?.protein) || 0) * ratio,
                fat: (Number(recipe?.fat) || 0) * ratio,
                carbs: (Number(recipe?.carbs) || 0) * ratio,
                grams
            };
        }

function getRecipeNutrition(recipe) {
            const ingredients = getRecipeWorkingIngredients(recipe);
            if (recipeHasIngredientNutrition({ recipe_ingredients: ingredients })) {
                const total = getRecipePortionNutrition(recipe, ingredients);
                const ratio = total.grams > 0 ? 100 / total.grams : 0;
                return { kcal: total.kcal * ratio, protein: total.protein * ratio, fat: total.fat * ratio, carbs: total.carbs * ratio, grams: 100 };
            }
            if (recipe && recipe.calories !== undefined) {
                return { kcal: Number(recipe.calories) || 0, protein: Number(recipe.protein) || 0, fat: Number(recipe.fat) || 0, carbs: Number(recipe.carbs) || 0, grams: 100 };
            }
            let kcal = 0, protein = 0, fat = 0, carbs = 0;
            ingredients?.forEach(i => {
                const ratio = (Number(i.weight) || 0) / 100;
                kcal += (Number(i.products?.kcal) || 0) * ratio;
                protein += (Number(i.products?.protein) || 0) * ratio;
                fat += (Number(i.products?.fat) || 0) * ratio;
                carbs += (Number(i.products?.carbs) || 0) * ratio;
            });
            return { kcal, protein, fat, carbs, grams: 100 };
        }

function clonePortionIngredient(ing) {
            return {
                ingredient_id: ing.ingredient_id || ing.products?.id || null,
                default_grams: Number(ing.default_grams ?? ing.weight) || 0,
                weight: Number(ing.grams ?? ing.weight ?? ing.default_grams) || 0,
                unit: 'g',
                category: ing.category || ing.products?.category || 'other',
                products: {
                    id: ing.products?.id || ing.ingredient_id || null,
                    name: ing.products?.name || ing.name || 'Продукт',
                    category: ing.products?.category || ing.category || 'other',
                    unit: 'g',
                    kcal: Number(ing.products?.kcal) || 0,
                    protein: Number(ing.products?.protein) || 0,
                    fat: Number(ing.products?.fat) || 0,
                    carbs: Number(ing.products?.carbs) || 0
                }
            };
        }

function getRecipeDefaultIngredients(recipe) {
            return (recipe?.recipe_ingredients || []).map(clonePortionIngredient);
        }

function snapshotPortionIngredients(items) {
            return (items || []).map(ing => {
                const row = clonePortionIngredient(ing);
                return {
                    ingredientId: row.products.id,
                    name: row.products.name,
                    category: row.products.category,
                    grams: Number(row.weight) || 0,
                    kcalPer100: Number(row.products.kcal) || 0,
                    proteinPer100: Number(row.products.protein) || 0,
                    fatPer100: Number(row.products.fat) || 0,
                    carbsPer100: Number(row.products.carbs) || 0
                };
            }).filter(ing => ing.grams > 0);
        }

function scalePortionIngredients(items, ratio) {
            const multiplier = Math.max(0, Number(ratio) || 0);
            return (items || []).map(ing => {
                const row = clonePortionIngredient(ing);
                row.weight = (Number(row.weight) || 0) * multiplier;
                return row;
            }).filter(ing => Number(ing.weight) > 0);
        }

function recipeOverridesStorageKey() {
            return 'recipe_ingredient_overrides_' + appUserId;
        }

function loadRecipeIngredientOverrides() {
            try { return JSON.parse(localStorage.getItem(recipeOverridesStorageKey())) || {}; } catch (e) { return {}; }
        }

function getRecipeSavedIngredientSnapshot(recipeId) {
            const overrides = loadRecipeIngredientOverrides();
            return Array.isArray(overrides[String(recipeId)]) ? overrides[String(recipeId)] : null;
        }

function saveRecipeIngredientOverride(recipeId, ingredients) {
            const overrides = loadRecipeIngredientOverrides();
            overrides[String(recipeId)] = snapshotPortionIngredients(ingredients);
            localStorage.setItem(recipeOverridesStorageKey(), JSON.stringify(overrides));
        }

function clearRecipeIngredientOverride(recipeId) {
            const overrides = loadRecipeIngredientOverrides();
            delete overrides[String(recipeId)];
            localStorage.setItem(recipeOverridesStorageKey(), JSON.stringify(overrides));
        }

function getRecipeWorkingIngredients(recipe) {
            const saved = getRecipeSavedIngredientSnapshot(recipe?.id);
            if (Array.isArray(saved) && saved.length) {
                return saved.map(ing => clonePortionIngredient({
                    ingredient_id: ing.ingredientId,
                    weight: ing.grams,
                    category: ing.category,
                    products: {
                        id: ing.ingredientId,
                        name: ing.name,
                        category: ing.category,
                        kcal: ing.kcalPer100,
                        protein: ing.proteinPer100,
                        fat: ing.fatPer100,
                        carbs: ing.carbsPer100
                    }
                }));
            }
            return getRecipeDefaultIngredients(recipe);
        }

function hydratePortionIngredients(snapshot, recipe) {
            if (!Array.isArray(snapshot) || !snapshot.length) return getRecipeWorkingIngredients(recipe);
            return snapshot.map(ing => clonePortionIngredient({
                ingredient_id: ing.ingredientId,
                weight: ing.grams,
                category: ing.category,
                products: {
                    id: ing.ingredientId,
                    name: ing.name,
                    category: ing.category,
                    kcal: ing.kcalPer100,
                    protein: ing.proteinPer100,
                    fat: ing.fatPer100,
                    carbs: ing.carbsPer100
                }
            }));
        }

function getRecipeIngredientCatalog(category) {
            const map = new Map();
            recipesData.forEach(recipe => (recipe.recipe_ingredients || []).forEach(ing => {
                const row = clonePortionIngredient(ing);
                const key = String(row.products.id || row.products.name).toLowerCase();
                if ((!category || row.products.category === category) && !map.has(key)) map.set(key, row);
            }));
            return Array.from(map.values());
        }

function getActivityMeta(level) {
            const map = {
                sedentary: { label: 'Мало движения', factor: 1.2 },
                light: { label: 'Легкая активность', factor: 1.375 },
                moderate: { label: 'Средняя активность', factor: 1.55 },
                high: { label: 'Высокая активность', factor: 1.725 },
                athlete: { label: 'Очень высокая', factor: 1.9 }
            };
            return map[level] || map.moderate;
        }

function getGoalMeta(goalType) {
            const map = {
                cut: { label: 'Сушка', adjustment: -0.15, protein: 2.0, fat: 0.8 },
                maintain: { label: 'Поддержание', adjustment: 0, protein: 1.6, fat: 0.9 },
                bulk: { label: 'Набор веса', adjustment: 0.12, protein: 1.8, fat: 1.0 },
                muscle: { label: 'Рост мышечной массы', adjustment: 0.08, protein: 2.0, fat: 0.9 }
            };
            return map[goalType] || map.maintain;
        }

function getProfileFormValues() {
            const value = id => document.getElementById(id)?.value || '';
            return {
                full_name: value('inp-name').trim() || 'Пользователь',
                age: parseInt(value('inp-age'), 10) || 0,
                height: parseFloat(value('inp-height')) || 0,
                weight: parseFloat(value('inp-weight')) || 0,
                activity_level: value('inp-activity') || 'moderate',
                workouts_per_week: Math.max(0, Math.min(parseInt(value('inp-workouts'), 10) || 0, 14)),
                goal_type: value('inp-goal') || 'maintain',
                food_preferences: value('inp-food-preferences').trim(),
                food_exclusions: value('inp-food-exclusions').trim(),
                target_water: parseInt(value('inp-water'), 10) || 2000
            };
        }

function calculateKbjuRecommendation(input = getProfileFormValues()) {
            const gender = currentGender === 'F' ? 'F' : 'M';
            const age = Number(input.age) || 0;
            const height = Number(input.height) || 0;
            const weight = Number(input.weight) || 0;
            const activity = getActivityMeta(input.activity_level);
            const goal = getGoalMeta(input.goal_type);
            const warnings = [];
            if (!age || !height || !weight) {
                return { ready: false, warnings: ['Заполни возраст, рост и вес, чтобы расчет стал точным.'] };
            }
            if (age < 16 || age > 75 || height < 130 || height > 220 || weight < 40 || weight > 220) {
                warnings.push('Данные выглядят нестандартно. Расчет можно использовать как ориентир, но лучше не делать резких ограничений.');
            }
            const bmr = Math.round(10 * weight + 6.25 * height - 5 * age + (gender === 'M' ? 5 : -161));
            const trainingBonus = Math.min((Number(input.workouts_per_week) || 0) * 0.015, 0.12);
            const activityFactor = activity.factor + trainingBonus;
            const maintenance = Math.round(bmr * activityFactor);
            const minCalories = gender === 'F' ? 1200 : 1500;
            let target = Math.round(maintenance * (1 + goal.adjustment));
            if (target < minCalories) {
                target = minCalories;
                warnings.push('Калории не опускаю ниже безопасного минимума для базового ориентира. Это не медицинская рекомендация.');
            }
            const protein = Math.round(weight * goal.protein);
            const fat = Math.round(weight * goal.fat);
            const proteinCalories = protein * 4;
            const fatCalories = fat * 9;
            let carbs = Math.round((target - proteinCalories - fatCalories) / 4);
            if (carbs < 80) {
                carbs = 80;
                warnings.push('Углеводы получились низкими, поэтому оставил мягкий минимум для энергии и самочувствия.');
            }
            return {
                ready: true,
                gender,
                age,
                height,
                weight,
                activity,
                goal,
                bmr,
                tdee: maintenance,
                target_kcal: target,
                target_protein: protein,
                target_fat: fat,
                target_carbs: carbs,
                warnings
            };
        }
