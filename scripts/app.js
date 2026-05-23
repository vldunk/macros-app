        window.addEventListener('error', function(e) {
            console.error('Ошибка:', e.message, e.error || '');
            const loading = document.getElementById('loading-screen');
            if (loading && loading.style.display !== 'none' && !loading.classList.contains('is-hidden')) {
                showLoadingError('Ошибка загрузки. Проверь подключение и попробуй снова.');
            }
        });

        const tg = window.Telegram?.WebApp || null;
        try {
            tg?.ready?.();
            tg?.expand?.();
        } catch (e) {
            console.warn('Telegram WebApp API недоступен:', e);
        }

        const modalLayerLocks = new Set();
        let lockedBodyScrollY = 0;
        let bodyUnlockFrame = 0;

        function syncAppViewport() {
            const root = document.documentElement;
            const liveHeight = Math.round(Number(tg?.viewportHeight) || window.visualViewport?.height || window.innerHeight || 0);
            const stableHeight = Math.round(Number(tg?.viewportStableHeight) || window.innerHeight || liveHeight || 0);
            if (liveHeight > 0) root.style.setProperty('--app-viewport-height', liveHeight + 'px');
            if (stableHeight > 0) root.style.setProperty('--app-stable-viewport-height', stableHeight + 'px');
        }

        function enableTelegramUXStability() {
            syncAppViewport();
            window.addEventListener('resize', syncAppViewport, { passive: true });
            window.visualViewport?.addEventListener?.('resize', syncAppViewport, { passive: true });
            try {
                tg?.disableVerticalSwipes?.();
                tg?.onEvent?.('viewportChanged', syncAppViewport);
            } catch (e) {
                console.warn('Telegram viewport UX API недоступен:', e);
            }
        }

        function lockAppScroll(layerId) {
            if (!layerId || modalLayerLocks.has(layerId)) return;
            if (bodyUnlockFrame) {
                cancelAnimationFrame(bodyUnlockFrame);
                bodyUnlockFrame = 0;
            }
            if (!modalLayerLocks.size && !document.body.classList.contains('app-scroll-locked')) {
                lockedBodyScrollY = window.scrollY || document.documentElement.scrollTop || 0;
                document.body.style.top = '-' + lockedBodyScrollY + 'px';
                document.body.classList.add('app-scroll-locked');
            }
            modalLayerLocks.add(layerId);
        }

        function unlockAppScroll(layerId) {
            if (!layerId) return;
            modalLayerLocks.delete(layerId);
            if (modalLayerLocks.size) return;
            bodyUnlockFrame = requestAnimationFrame(() => {
                bodyUnlockFrame = 0;
                if (modalLayerLocks.size) return;
                document.body.classList.remove('app-scroll-locked');
                document.body.style.top = '';
                window.scrollTo(0, lockedBodyScrollY);
            });
        }

        function setLockedLayer(layerId, element, open, activeClass = 'active') {
            if (!element) return;
            element.classList.toggle(activeClass, Boolean(open));
            if (open) lockAppScroll(layerId);
            else unlockAppScroll(layerId);
        }

        function setDisplayedLayer(layerId, element, open, display = 'flex') {
            if (!element) return;
            element.style.display = open ? display : 'none';
            if (open) lockAppScroll(layerId);
            else unlockAppScroll(layerId);
        }

        enableTelegramUXStability();

        const telegramUser = tg?.initDataUnsafe?.user || null;
        const isTelegramMiniApp = Boolean(window.Telegram?.WebApp?.initData);
        const appUserId = String(isTelegramMiniApp && telegramUser?.id ? telegramUser.id : getLocalUserId());
        const supabaseUrl = 'https://urdqibwfuieahyvdrhey.supabase.co';
        const serverApiUrl = supabaseUrl + '/functions/v1/telegram-api';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZHFpYndmdWllYWh5dmRyaGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDcyMTEsImV4cCI6MjA5NDUyMzIxMX0.Q4LXjEys7GnszUsFNy8yl__7dszO7AAHkDkpDJty6TA';
        let supabaseClient, chartInstance = null;
        let profileUsesUserId = true, mealsUseUserId = true, profileSupportsTargetWater = true;
        const DEMO_PROFILE = { id: 'demo-user', user_id: appUserId, full_name: 'Demo User', weight: 75, age: 30, height: 180, activity_level: 'moderate', workouts_per_week: 3, goal_type: 'maintain', food_preferences: '', food_exclusions: '', target_kcal: 1800, target_protein: 120, target_fat: 55, target_carbs: 180, target_water: 2000 };
        let userProfile = { id: null, user_id: appUserId, full_name: telegramUser?.first_name || 'Пользователь', weight: 0, age: 30, height: 180, activity_level: 'moderate', workouts_per_week: 3, goal_type: 'maintain', food_preferences: '', food_exclusions: '', target_kcal: 2500, target_protein: 180, target_fat: 80, target_carbs: 250, target_water: 2000 };
        let latestKbjuRecommendation = null;
        let stats = { kcal: 0, protein: 0, fat: 0, carbs: 0 }, dailyWater = 0, recipesData = [], currentTab = 'Все', currentMealFilter = 'Завтрак', currentDietFilter = 'Все', recipeSearchQuery = '', recipeSortMode = 'recommended', recipeViewMode = 'grid', screenMealFilter = 'Все', screenDietFilter = 'Все', pendingMeal = null, recipePortionDraft = null, isAddingMeal = false;
        let weeklyDataMap = {}, weeklyWaterMap = {}, currentDate = new Date(), calendarViewDate = new Date(), activeDaysSet = new Set(), currentGender = localStorage.getItem('user_gender') || 'M';
        const LOADING_MIN_MS = 700;
        const LOADING_TIMEOUT_MS = 22000;
        let appInitRunId = 0;
        const appInitState = {
            isAppInitializing: true,
            isProfileLoaded: false,
            isRecipesLoaded: false,
            isDiaryLoaded: false,
            isSettingsLoaded: false,
            isFavoritesLoaded: false,
            isStreakLoaded: false,
            startedAt: 0,
            timeoutId: null
        };

        function getLocalUserId() {
            const storageKey = 'blueprint_app_user_id';
            let id = localStorage.getItem(storageKey);
            if (!id) {
                id = 'local-' + (window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
                localStorage.setItem(storageKey, id);
            }
            return id;
        }

        function toISOLocal(d) { const offset = d.getTimezoneOffset() * 60000; return new Date(d.getTime() - offset).toISOString().split('T')[0]; }
        function parseLocalDate(dateStr) { const [y, m, d] = dateStr.split('-').map(Number); return new Date(y, m - 1, d); }
        function selectedDateTimeISO() {
            const now = new Date();
            const d = new Date(currentDate);
            d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
            return d.toISOString();
        }                                function findClosest(el, selector) {
            while (el && el !== document) {
                if (el.matches && el.matches(selector)) return el;
                el = el.parentNode;
            }
            return null;
        }
                function isMissingColumnError(error, columnName) {
            if (!error) return false;
            const msg = `${error.code || ''} ${error.message || ''} ${error.details || ''}`.toLowerCase();
            return msg.includes(columnName.toLowerCase()) && (msg.includes('column') || msg.includes('schema cache') || msg.includes('42703') || msg.includes('pgrst204'));
        }
        function isMissingUserIdError(error) { return isMissingColumnError(error, 'user_id'); }
        function isMissingTargetWaterError(error) { return isMissingColumnError(error, 'target_water'); }
        function getLocalWaterTarget() { return parseInt(localStorage.getItem('target_water_' + appUserId)) || 2000; }
        function setLocalWaterTarget(value) { localStorage.setItem('target_water_' + appUserId, String(value || 2000)); }


        function normalizeRecipe(recipe) {
            const mealType = recipe.mealType || RECIPE_MEAL_KEYS[recipe.category] || 'snack';
            const category = RECIPE_MEAL_LABELS[mealType] || recipe.category || 'Перекус';
            const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : (recipe.recipe_ingredients || []).map(item => ({
                name: item.products?.name || item.name || 'Продукт',
                amount: Number(item.weight || item.amount) || 0,
                grams: Number(item.defaultGrams || item.default_grams || item.weight || item.amount) || 0,
                ingredientId: item.ingredientId || item.ingredient_id || item.products?.id || null,
                kcalPer100: Number(item.kcalPer100 ?? item.products?.kcal_per_100 ?? item.products?.kcal) || 0,
                proteinPer100: Number(item.proteinPer100 ?? item.products?.protein_per_100 ?? item.products?.protein) || 0,
                fatPer100: Number(item.fatPer100 ?? item.products?.fat_per_100 ?? item.products?.fat) || 0,
                carbsPer100: Number(item.carbsPer100 ?? item.products?.carbs_per_100 ?? item.products?.carbs) || 0,
                unit: item.unit === 'шт' ? 'pcs' : item.unit === 'мл' ? 'ml' : item.unit || 'g',
                category: item.category || 'other'
            }));
            return {
                ...recipe,
                mealType,
                category,
                image_url: recipe.image_url || recipe.image || '',
                cooking_time: recipe.cookingTime || recipe.cooking_time || recipe.cook_time || 20,
                servings: recipe.servings || 1,
                instructions: Array.isArray(recipe.instructions) ? recipe.instructions.join('\n') : (recipe.instructions || ''),
                ingredients,
                recipe_ingredients: ingredients.map(item => ({
                    ingredient_id: item.ingredientId || null,
                    default_grams: ingredientAmountToGrams(item.name, item.amount, item.unit, item.grams),
                    weight: ingredientAmountToGrams(item.name, item.amount, item.unit, item.grams),
                    display_amount: Number(item.amount) || 0,
                    unit: item.grams ? 'g' : item.unit,
                    category: item.category,
                    products: {
                        id: item.ingredientId || null,
                        name: item.name,
                        unit: item.grams ? 'g' : item.unit,
                        category: item.category,
                        kcal: Number(item.kcalPer100) || 0,
                        protein: Number(item.proteinPer100) || 0,
                        fat: Number(item.fatPer100) || 0,
                        carbs: Number(item.carbsPer100) || 0
                    }
                }))
            };
        }

        function prepareRecipeData(recipes) {
            const normalized = (Array.isArray(recipes) ? recipes : []).map(normalizeRecipe);
            validateRecipes(normalized);
            return normalized;
        }


        function mapSupabaseRecipe(row, ingredients = [], tags = []) {
            const goalTags = tags.filter(tag => tag.tag_type === 'goal').map(tag => tag.tag);
            const nutritionTags = tags.filter(tag => tag.tag_type === 'nutrition').map(tag => tag.tag);
            return {
                id: row.id,
                slug: row.slug,
                title: row.title,
                description: row.description || '',
                mealType: row.meal_type,
                goalTags,
                nutritionTags,
                calories: Number(row.calories) || 0,
                protein: Number(row.protein) || 0,
                fat: Number(row.fat) || 0,
                carbs: Number(row.carbs) || 0,
                cookingTime: Number(row.cooking_time_minutes) || 20,
                servings: Number(row.servings) || 1,
                ingredients: ingredients
                    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))
                    .map(item => ({
                        name: item.ingredients?.name || item.name,
                        amount: Number(item.amount) || 0,
                        grams: Number(item.default_grams || item.weight || item.amount) || 0,
                        ingredientId: item.ingredient_id || item.ingredients?.id || null,
                        kcalPer100: Number(item.ingredients?.kcal_per_100) || 0,
                        proteinPer100: Number(item.ingredients?.protein_per_100) || 0,
                        fatPer100: Number(item.ingredients?.fat_per_100) || 0,
                        carbsPer100: Number(item.ingredients?.carbs_per_100) || 0,
                        unit: item.unit,
                        category: item.ingredients?.category || item.category
                    })),
                instructions: Array.isArray(row.instructions) ? row.instructions : [],
                storage: row.storage || '',
                image: row.image_url || '',
                image_url: row.image_url || '',
                isMealPrep: Boolean(row.is_meal_prep),
                isFreezerFriendly: Boolean(row.is_freezer_friendly),
                searchKeywords: Array.isArray(row.search_keywords) ? row.search_keywords : []
            };
        }

        async function loadRecipesFromSupabase() {
            if (!supabaseClient) throw new Error('Supabase client is not initialized');

            const { data: recipes, error: recipesError } = await supabaseClient
                .from('recipes')
                .select('id, slug, title, description, meal_type, calories, protein, fat, carbs, cooking_time_minutes, servings, instructions, storage, image_url, is_meal_prep, is_freezer_friendly, search_keywords')
                .not('meal_type', 'is', null)
                .not('calories', 'is', null)
                .order('meal_type', { ascending: true })
                .order('title', { ascending: true });
            if (recipesError) throw recipesError;

            const recipeIds = (recipes || []).map(recipe => recipe.id);
            if (!recipeIds.length) return [];

            const [{ data: ingredients, error: ingredientsError }, { data: tags, error: tagsError }] = await Promise.all([
                supabaseClient
                    .from('recipe_ingredients')
                    .select('recipe_id, ingredient_id, default_grams, name, amount, weight, unit, category, sort_order, ingredients ( id, name, category, kcal_per_100, protein_per_100, fat_per_100, carbs_per_100 )')
                    .in('recipe_id', recipeIds)
                    .order('sort_order', { ascending: true }),
                supabaseClient
                    .from('recipe_tags')
                    .select('recipe_id, tag_type, tag')
                    .in('recipe_id', recipeIds)
            ]);
            if (ingredientsError) throw ingredientsError;
            if (tagsError) throw tagsError;

            const ingredientsByRecipe = (ingredients || []).reduce((acc, item) => {
                (acc[item.recipe_id] ||= []).push(item);
                return acc;
            }, {});
            const tagsByRecipe = (tags || []).reduce((acc, item) => {
                (acc[item.recipe_id] ||= []).push(item);
                return acc;
            }, {});

            return prepareRecipeData((recipes || []).map(recipe => mapSupabaseRecipe(
                recipe,
                ingredientsByRecipe[recipe.id] || [],
                tagsByRecipe[recipe.id] || []
            )));
        }

        function validateRecipes(recipes) {
            const issues = [];
            const ids = new Set();
            (Array.isArray(recipes) ? recipes : []).forEach((recipe, index) => {
                const prefix = 'recipe[' + index + ']';
                if (!recipe.id) issues.push(prefix + ': нет id');
                if (recipe.id && ids.has(String(recipe.id))) issues.push(prefix + ': дубликат id ' + recipe.id);
                if (recipe.id) ids.add(String(recipe.id));
                if (!recipe.title) issues.push(prefix + ': нет title');
                if (!recipe.mealType) issues.push(prefix + ': нет mealType');
                if (!Array.isArray(recipe.goalTags) || !recipe.goalTags.length) issues.push(prefix + ': нет goalTags');
                if (!Array.isArray(recipe.nutritionTags) || !recipe.nutritionTags.length) issues.push(prefix + ': нет nutritionTags');
                ['calories','protein','fat','carbs'].forEach(key => {
                    if (recipe[key] === undefined || recipe[key] === null || Number.isNaN(Number(recipe[key]))) issues.push(prefix + ': нет ' + key);
                });
                if (!Array.isArray(recipe.ingredients) || !recipe.ingredients.length) issues.push(prefix + ': нет ingredients');
                (recipe.ingredients || []).forEach((ingredient, ingIndex) => {
                    const ingPrefix = prefix + '.ingredients[' + ingIndex + ']';
                    if (!ingredient.name) issues.push(ingPrefix + ': нет name');
                    if (ingredient.amount === undefined || ingredient.amount === null || Number.isNaN(Number(ingredient.amount))) issues.push(ingPrefix + ': нет amount');
                    if (!VALID_INGREDIENT_UNITS.includes(ingredient.unit)) issues.push(ingPrefix + ': некорректный unit ' + ingredient.unit);
                    if (!VALID_INGREDIENT_CATEGORIES.includes(ingredient.category)) issues.push(ingPrefix + ': некорректная category ' + ingredient.category);
                });
                if (!recipe.instructions || (Array.isArray(recipe.instructions) && !recipe.instructions.length)) issues.push(prefix + ': нет instructions');
                if (!Array.isArray(recipe.searchKeywords) || recipe.searchKeywords.length < 3) issues.push(prefix + ': меньше 3 searchKeywords');
            });
            if (issues.length) console.warn('Blueprint Nutrition recipe validation:', issues);
            return issues;
        }

                        function asArrayFilter(value) {
            if (!value || value === 'Все') return [];
            return Array.isArray(value) ? value : [value];
        }

        function filterRecipes(recipes, filters = {}) {
            const mealTypes = asArrayFilter(filters.mealType).map(v => RECIPE_MEAL_KEYS[v] || v);
            const goalTags = asArrayFilter(filters.goalTags).map(v => Object.keys(RECIPE_GOAL_LABELS).find(key => RECIPE_GOAL_LABELS[key] === v) || v);
            const nutritionTags = asArrayFilter(filters.nutritionTags).map(v => Object.keys(RECIPE_NUTRITION_LABELS).find(key => RECIPE_NUTRITION_LABELS[key] === v) || v);
            return (recipes || []).filter(recipe => {
                if (mealTypes.length && !mealTypes.includes(recipe.mealType)) return false;
                if (goalTags.length && !goalTags.some(tag => (recipe.goalTags || []).includes(tag))) return false;
                if (nutritionTags.length && !nutritionTags.some(tag => (recipe.nutritionTags || []).includes(tag))) return false;
                if (filters.maxCalories && Number(recipe.calories) > Number(filters.maxCalories)) return false;
                if (filters.minProtein && Number(recipe.protein) < Number(filters.minProtein)) return false;
                if (filters.cookingTime && Number(recipe.cookingTime || recipe.cooking_time) > Number(filters.cookingTime)) return false;
                if (filters.isMealPrep !== undefined && Boolean(recipe.isMealPrep) !== Boolean(filters.isMealPrep)) return false;
                return true;
            });
        }

        function buildRecommendationReason(recipe, goal) {
            if (goal === 'cutting' || goal === 'weight_loss') return 'Подходит для сушки/похудения: много белка, умеренная калорийность и минимум лишних жиров.';
            if (goal === 'bulking') return 'Подходит для набора: больше энергии и углеводов, при этом белок остается в рационе.';
            if (goal === 'muscle_gain') return 'Подходит для роста мышц: высокий белок и сбалансированные углеводы для восстановления.';
            return 'Подходит для поддержания: сбалансированное КБЖУ и понятная порция без перекосов.';
        }

        function profileExtrasKey() {
            return 'blueprint_profile_extras_' + appUserId;
        }

        function loadProfileExtras() {
            try {
                const raw = localStorage.getItem(profileExtrasKey());
                return raw ? JSON.parse(raw) : {};
            } catch (e) {
                console.warn('Не удалось прочитать расширенный профиль:', e);
                return {};
            }
        }

        function saveProfileExtras(extras) {
            localStorage.setItem(profileExtrasKey(), JSON.stringify(extras));
        }
        function profilePayload(updates) {
            const { target_water, ...dbUpdates } = updates;
            return profileSupportsTargetWater ? updates : dbUpdates;
        }
        let toastTimer = null;
        function showToast(message) {
            const toast = document.getElementById('app-toast');
            if (!toast) return console.log(message);
            toast.textContent = String(message || '');
            toast.classList.add('show');
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
        }

        let confirmResolver = null;
        function showConfirm(message, confirmText = 'Удалить', title = 'Подтвердить действие') {
            const overlay = document.getElementById('confirm-overlay');
            const titleEl = document.getElementById('confirm-title');
            const textEl = document.getElementById('confirm-text');
            const okBtn = document.getElementById('confirm-ok-btn');
            if (!overlay || !textEl || !okBtn) return Promise.resolve(confirm(message));
            if (titleEl) titleEl.textContent = title;
            textEl.textContent = message;
            okBtn.textContent = confirmText;
            setLockedLayer('confirm', overlay, true);
            return new Promise(resolve => { confirmResolver = resolve; });
        }

        function resolveConfirm(value) {
            setLockedLayer('confirm', document.getElementById('confirm-overlay'), false);
            if (confirmResolver) {
                confirmResolver(Boolean(value));
                confirmResolver = null;
            }
        }

        function demoMealsStorageKey() {
            return 'demo_meals_' + appUserId;
        }

        function loadDemoMeals() {
            try { return JSON.parse(localStorage.getItem(demoMealsStorageKey())) || []; } catch (e) { return []; }
        }

        function saveDemoMeals(meals) {
            localStorage.setItem(demoMealsStorageKey(), JSON.stringify(Array.isArray(meals) ? meals : []));
        }

        function getDemoMealsInRange(payload = {}) {
            const start = payload.startDate ? new Date(payload.startDate).getTime() : -Infinity;
            const end = payload.endDate ? new Date(payload.endDate).getTime() : Infinity;
            return loadDemoMeals().filter(meal => {
                const time = new Date(meal.created_at).getTime();
                return time >= start && time <= end;
            });
        }

        function addDemoMeal(payload = {}) {
            const recipe = getRecipeById(payload.recipe_id);
            const meal = {
                id: Date.now(),
                recipe_id: payload.recipe_id,
                recipes: { title: recipe?.title || 'Прием пищи' },
                kcal: Number(payload.kcal) || 0,
                protein: Number(payload.protein) || 0,
                fat: Number(payload.fat) || 0,
                carbs: Number(payload.carbs) || 0,
                meal_type: payload.meal_type || 'Перекус',
                created_at: payload.created_at || selectedDateTimeISO(),
                ingredients: Array.isArray(payload.ingredients) ? payload.ingredients : []
            };
            const meals = loadDemoMeals();
            meals.push(meal);
            saveDemoMeals(meals);
            return meal;
        }

        function clearDemoMeals(payload = {}) {
            const remove = new Set(getDemoMealsInRange(payload).map(meal => meal.id));
            saveDemoMeals(loadDemoMeals().filter(meal => !remove.has(meal.id)));
            return true;
        }

        function deleteDemoMeal(id) {
            saveDemoMeals(loadDemoMeals().filter(meal => String(meal.id) !== String(id)));
            return true;
        }

        async function callServer(action, payload = {}) {
            if (!isTelegramMiniApp) {
                if (action === 'getProfile') return { ...DEMO_PROFILE, ...loadProfileExtras() };
                if (action === 'updateProfile') {
                    saveProfileExtras(payload);
                    return { ...DEMO_PROFILE, ...loadProfileExtras(), ...payload };
                }
                if (action === 'getMeals') return getDemoMealsInRange(payload);
                if (action === 'addMeal') return addDemoMeal(payload);
                if (action === 'clearDay') return clearDemoMeals(payload);
                if (action === 'deleteMeal') return deleteDemoMeal(payload.id);
                return null;
            }
            if (!tg?.initData) throw new Error('Откройте приложение внутри Telegram, чтобы подтвердить пользователя.');
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);
            try {
                const response = await fetch(serverApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': 'Bearer ' + supabaseKey },
                    body: JSON.stringify({ action, payload, initData: tg.initData }),
                    signal: controller.signal
                });
                const rawText = await response.text();
                let result;
                try { result = rawText ? JSON.parse(rawText) : {}; }
                catch (e) { result = { success: false, error: rawText || 'Сервер вернул некорректный ответ' }; }
                if (!response.ok || !result.success) {
                    console.error('Edge Function error:', { status: response.status, result, rawText });
                    throw new Error(result.error || ('Ошибка Edge Function HTTP ' + response.status));
                }
                return result.data;
            } catch (e) {
                if (e.name === 'AbortError') throw new Error('Edge Function не отвечает больше 6 секунд');
                throw e;
            } finally {
                clearTimeout(timeout);
            }
        }
        async function loadProfile() {
            const p = await callServer('getProfile');
            const extras = loadProfileExtras();
            if (p) userProfile = { ...userProfile, ...p, ...extras };
            else userProfile = { ...userProfile, ...extras };
            currentDietFilter = getDefaultDietFilterForGoal();
            syncRecipeFilterButtons();
        }

        async function saveProfile(updates) {
            setLocalWaterTarget(updates.target_water);
            const data = await callServer('updateProfile', updates);
            return { data, error: null };
        }
        function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

        function resetInitState() {
            appInitState.isAppInitializing = true;
            appInitState.isProfileLoaded = false;
            appInitState.isRecipesLoaded = false;
            appInitState.isDiaryLoaded = false;
            appInitState.isSettingsLoaded = false;
            appInitState.isFavoritesLoaded = false;
            appInitState.isStreakLoaded = false;
            appInitState.startedAt = Date.now();
            if (appInitState.timeoutId) clearTimeout(appInitState.timeoutId);
            appInitState.timeoutId = null;
        }

        function setLoadingStep(text, progress) {
            const status = document.getElementById('loading-status');
            const fill = document.getElementById('loading-progress-fill');
            if (status) status.textContent = text;
            if (fill) fill.style.width = Math.max(8, Math.min(progress, 100)) + '%';
        }

        function showLoadingError(message) {
            const loading = document.getElementById('loading-screen');
            const error = document.getElementById('loading-error');
            const status = document.getElementById('loading-status');
            if (appInitState.timeoutId) clearTimeout(appInitState.timeoutId);
            appInitState.timeoutId = null;
            appInitState.isAppInitializing = false;
            if (status) status.textContent = 'Не удалось загрузить данные';
            if (error) error.textContent = message || 'Проверь подключение и попробуй снова.';
            if (loading) loading.classList.add('has-error');
        }

        async function showMainAppWhenReady(runId) {
            const app = document.getElementById('app-content');
            const loading = document.getElementById('loading-screen');
            const elapsed = Date.now() - appInitState.startedAt;
            if (elapsed < LOADING_MIN_MS) await wait(LOADING_MIN_MS - elapsed);
            if (runId !== appInitRunId) return;
            if (appInitState.timeoutId) clearTimeout(appInitState.timeoutId);
            appInitState.timeoutId = null;
            appInitState.isAppInitializing = false;
            setLoadingStep('Готово', 100);
            if (app) {
                app.style.display = 'block';
                requestAnimationFrame(() => app.classList.add('app-ready'));
            }
            if (loading) {
                loading.classList.add('is-hidden');
                setTimeout(() => { loading.style.display = 'none'; }, 460);
            }
        }

        function retryAppInit() {
            const loading = document.getElementById('loading-screen');
            const app = document.getElementById('app-content');
            if (app) {
                app.classList.remove('app-ready');
                app.style.display = 'none';
            }
            if (loading) {
                loading.style.display = 'flex';
                loading.classList.remove('is-hidden', 'has-error');
            }
            setLoadingStep('Повторяем загрузку...', 8);
            init();
        }

        async function init() {
            const runId = ++appInitRunId;
            resetInitState();
            const app = document.getElementById('app-content');
            const loading = document.getElementById('loading-screen');
            if (app) {
                app.classList.remove('app-ready');
                app.style.display = 'none';
            }
            if (loading) {
                loading.style.display = 'flex';
                loading.classList.remove('is-hidden', 'has-error');
            }

            appInitState.timeoutId = setTimeout(() => {
                if (runId === appInitRunId && appInitState.isAppInitializing) {
                    showLoadingError('Не удалось загрузить данные. Проверь подключение и попробуй снова.');
                }
            }, LOADING_TIMEOUT_MS);

            try {
                setLoadingStep(isTelegramMiniApp ? 'Запускаем Telegram Mini App...' : 'Запускаем Browser / Dev mode...', 10);
                try {
                    tg?.ready?.();
                    tg?.expand?.();
                } catch (e) {
                    console.warn('Telegram WebApp API недоступен:', e);
                }

                setLoadingStep(isTelegramMiniApp ? 'Подключаем базу...' : 'Готовим локальные данные...', 18);
                if (isTelegramMiniApp) {
                    if (typeof window.supabase === 'undefined') throw new Error('Supabase не загружен');
                    if (!supabaseClient) {
                        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
                    }
                }

                setLoadingStep('Загружаем настройки...', 28);
                currentGender = localStorage.getItem('user_gender') || currentGender || 'M';
                appInitState.isSettingsLoaded = true;
                appInitState.isFavoritesLoaded = true;

                setLoadingStep('Загружаем профиль...', 40);
                await loadProfile();
                appInitState.isProfileLoaded = true;

                setLoadingStep('Подбираем рецепты...', 58);
                try {
                    if (isTelegramMiniApp) {
                        const supabaseRecipes = await loadRecipesFromSupabase();
                        recipesData = supabaseRecipes.length ? supabaseRecipes : prepareRecipeData(STARTER_RECIPES);
                        if (!supabaseRecipes.length) console.warn('Supabase recipes table is empty. Using local starter recipes.');
                    } else {
                        recipesData = prepareRecipeData(STARTER_RECIPES);
                    }
                } catch (recipesError) {
                    console.warn('Не удалось загрузить рецепты из Supabase, использую локальную стартовую базу:', recipesError);
                    recipesData = prepareRecipeData(STARTER_RECIPES);
                }
                appInitState.isRecipesLoaded = true;
                renderRecipes();
                updateMealPrepSummary();

                setLoadingStep('Считаем КБЖУ...', 72);
                loadWaterData();
                updateTopDate();
                try {
                    await fetchWeekActivity();
                    appInitState.isStreakLoaded = true;
                    await fetchStatsForDate();
                } catch (dataError) {
                    console.warn('Дневные данные загрузятся позже:', dataError);
                    stats = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
                    activeDaysSet.clear();
                }
                refreshUI();

                setLoadingStep('Загружаем дневник...', 86);
                try {
                    await updateHistoryUI();
                    appInitState.isDiaryLoaded = true;
                } catch (diaryError) {
                    console.warn('Дневник загрузится позже:', diaryError);
                    const hList = document.getElementById('history-list');
                    if (hList) hList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🍽️</div><div style="font-weight:800;color:var(--text-main);margin-bottom:6px;">Дневник загрузится позже</div><div>Проверь подключение или открой приложение внутри Telegram.</div></div>';
                }

                setLoadingStep('Готовим рекомендации...', 94);
                buildWeeklyChart().catch(chartError => console.warn('График загрузится позже:', chartError));

                if (runId !== appInitRunId) return;
                await showMainAppWhenReady(runId);
            } catch (e) {
                if (runId !== appInitRunId) return;
                console.error('Ошибка инициализации:', e);
                if (!isTelegramMiniApp) {
                    recipesData = prepareRecipeData(STARTER_RECIPES);
                    userProfile = { ...DEMO_PROFILE, ...loadProfileExtras() };
                    stats = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
                    activeDaysSet.clear();
                    renderRecipes();
                    loadWaterData();
                    updateTopDate();
                    refreshUI();
                    await updateHistoryUI().catch(error => console.warn('Demo diary fallback failed:', error));
                    await showMainAppWhenReady(runId);
                    showToast('Запущен demo mode');
                    return;
                }
                showLoadingError('Не удалось загрузить данные. Проверь подключение и попробуй снова.');
                showToast('Ошибка запуска: ' + (e.message || 'неизвестная ошибка'));
            }
        }
        async function refreshAllData() {
            loadWaterData();
            updateTopDate();
            renderRecipes();
            try {
                await fetchWeekActivity();
                await fetchStatsForDate();
                refreshUI();
                await updateHistoryUI();
                await buildWeeklyChart();
            } catch (e) {
                console.error('Ошибка обновления данных:', e);
                document.getElementById('history-list').innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px; font-size: 14px;">Откройте приложение в Telegram или проверьте Edge Function</div>';
            }
        }

        async function fetchWeekActivity() {
            activeDaysSet.clear();
            let startOfWeek = new Date(currentDate); let day = startOfWeek.getDay() || 7;
            startOfWeek.setDate(startOfWeek.getDate() - day + 1); startOfWeek.setHours(0,0,0,0);
            let endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6); endOfWeek.setHours(23,59,59,999);
            const data = await callServer('getMeals', { startDate: startOfWeek.toISOString(), endDate: endOfWeek.toISOString() });
            if (data) data.forEach(m => activeDaysSet.add(toISOLocal(new Date(m.created_at))));
        }

        async function fetchStatsForDate() {
            stats = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
            let startOfDay = new Date(currentDate); startOfDay.setHours(0,0,0,0);
            let endOfDay = new Date(currentDate); endOfDay.setHours(23,59,59,999);
            const meals = await callServer('getMeals', { startDate: startOfDay.toISOString(), endDate: endOfDay.toISOString() });
            stats.kcal = meals ? meals.reduce((s, m) => s + (Number(m.kcal) || 0), 0) : 0;
            stats.protein = meals ? meals.reduce((s, m) => s + (Number(m.protein) || 0), 0) : 0;
            stats.fat = meals ? meals.reduce((s, m) => s + (Number(m.fat) || 0), 0) : 0;
            stats.carbs = meals ? meals.reduce((s, m) => s + (Number(m.carbs) || 0), 0) : 0;
        }

        function loadWaterData() { dailyWater = parseInt(localStorage.getItem('water_' + appUserId + '_' + toISOLocal(currentDate))) || 0; }

        function addWater(amount, event) {
            dailyWater = Math.max(0, dailyWater + amount);
            localStorage.setItem('water_' + appUserId + '_' + toISOLocal(currentDate), dailyWater);
            refreshUI(); buildWeeklyChart();
            if(amount > 0 && event) {
                const rect = event.currentTarget.getBoundingClientRect();
                const floatingText = document.createElement('div'); floatingText.className = 'floating-text'; floatingText.innerText = `+${amount}`;
                floatingText.style.left = (rect.left + rect.width / 2 - 20) + 'px'; floatingText.style.top = (rect.top - 10) + 'px';
                document.body.appendChild(floatingText); setTimeout(() => floatingText.remove(), 800);
            }
        }

        function updateTopDate() {
            let realTodayStr = toISOLocal(new Date()); let selectedStr = toISOLocal(currentDate);
            if (selectedStr === realTodayStr) document.getElementById('cal-date-label').innerText = 'Сегодня';
            else if (selectedStr === toISOLocal(new Date(new Date().setDate(new Date().getDate()-1)))) document.getElementById('cal-date-label').innerText = 'Вчера';
            else document.getElementById('cal-date-label').innerText = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' }).format(currentDate);
            document.getElementById('diary-header-text').innerText = 'Дневник: ' + document.getElementById('cal-date-label').innerText;
        }

        async function changeDate(dateStr) { currentDate = parseLocalDate(dateStr); await refreshAllData(); }

        async function openFullCalendar() {
            calendarViewDate = new Date(currentDate); setDisplayedLayer('full-calendar', document.getElementById('full-calendar-modal'), true);
            let startOfMonth = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1); let endOfMonth = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 0, 23, 59, 59);
            const data = await callServer('getMeals', { startDate: startOfMonth.toISOString(), endDate: endOfMonth.toISOString() });
            let monthActiveSet = new Set(); if (data) data.forEach(m => monthActiveSet.add(toISOLocal(new Date(m.created_at))));
            renderMonthCalendar(monthActiveSet);
        }

        function closeFullCalendar() { setDisplayedLayer('full-calendar', document.getElementById('full-calendar-modal'), false); }
        async function navigateMonth(direction) { calendarViewDate.setMonth(calendarViewDate.getMonth() + direction); await openFullCalendar(); }

        function renderMonthCalendar(monthActiveSet) {
            document.getElementById('full-cal-label').innerText = calendarViewDate.toLocaleString('ru', {month:'long', year:'numeric'});
            const grid = document.getElementById('full-cal-grid'); grid.innerHTML = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(w => `<div class="full-cal-weekday">${w}</div>`).join('');
            let firstDay = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1); let startPadding = firstDay.getDay() || 7;
            let totalDays = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 0).getDate();
            for (let i = 1; i < startPadding; i++) grid.innerHTML += '<div class="full-cal-cell empty"></div>';
            let realTodayStr = toISOLocal(new Date()); let selectedStr = toISOLocal(currentDate);
            for (let day = 1; day <= totalDays; day++) {
                let cellStr = toISOLocal(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day));
                let classes = 'full-cal-cell' + (cellStr === realTodayStr ? ' today' : '') + (cellStr === selectedStr ? ' selected' : '') + (monthActiveSet.has(cellStr) && cellStr !== selectedStr ? ' active-data' : '');
                grid.innerHTML += `<div class="${classes}" onclick="selectCalendarDate('${cellStr}')">${day}</div>`;
            }
        }
        async function selectCalendarDate(dateStr) { currentDate = parseLocalDate(dateStr); closeFullCalendar(); await refreshAllData(); }

        function openChartModal() { setLockedLayer('chart', document.getElementById('chart-modal-overlay'), true); buildWeeklyChart(); }
        function closeChartModal() { setLockedLayer('chart', document.getElementById('chart-modal-overlay'), false); }

        async function buildWeeklyChart() {
            const canvas = document.getElementById('blueprintChart');
            if (!canvas || typeof Chart === 'undefined') return;
            let dates = []; weeklyDataMap = {}; weeklyWaterMap = {};
            for(let i=6; i>=0; i--) {
                let d = new Date(); d.setDate(d.getDate() - i); let dStr = toISOLocal(d);
                dates.push(dStr); weeklyDataMap[dStr] = 0; weeklyWaterMap[dStr] = parseInt(localStorage.getItem('water_' + appUserId + '_' + dStr)) || 0;
            }
            let startD = new Date(); startD.setDate(startD.getDate() - 6); startD.setHours(0,0,0,0);
            let endD = new Date(); endD.setHours(23,59,59,999);
            const data = await callServer('getMeals', { startDate: startD.toISOString(), endDate: endD.toISOString() });
            if(data) data.forEach(m => { let ds = toISOLocal(new Date(m.created_at)); if(weeklyDataMap[ds] !== undefined) weeklyDataMap[ds] += Number(m.kcal) || 0; });
            const ctx = canvas.getContext('2d');
            const dayLabels = dates.map(dStr => parseLocalDate(dStr).getDate());
            const kcalValues = dates.map(dStr => weeklyDataMap[dStr]);
            const waterValues = dates.map(dStr => weeklyWaterMap[dStr]);
            const targetValues = Array(7).fill(Number(userProfile.target_kcal) || 0);
            const kcalColors = kcalValues.map(val => {
                let diff = val - (Number(userProfile.target_kcal) || 0);
                if (diff > 150) return '#c96c61';
                if (val >= (Number(userProfile.target_kcal) || 0) - 150 && val <= (Number(userProfile.target_kcal) || 0) + 150) return '#5f8f7a';
                return '#c9a34e';
            });
            if (chartInstance) chartInstance.destroy();
            const kcalGradient = ctx.createLinearGradient(0, 0, 0, 260);
            kcalGradient.addColorStop(0, 'rgba(95,143,122,0.32)');
            kcalGradient.addColorStop(1, 'rgba(95,143,122,0.04)');
            const waterGradient = ctx.createLinearGradient(0, 0, 0, 260);
            waterGradient.addColorStop(0, 'rgba(123,175,194,0.42)');
            waterGradient.addColorStop(1, 'rgba(123,175,194,0.06)');
            chartInstance = new Chart(ctx, {
                data: { labels: dayLabels, datasets: [
                    { type: 'line', label: 'Цель', data: targetValues, borderColor: 'rgba(122,130,124,0.34)', borderWidth: 2, borderDash: [6, 7], pointRadius: 0, tension: 0.45, fill: false, order: 1 },
                    { type: 'line', label: 'Калории', data: kcalValues, borderColor: '#5f8f7a', backgroundColor: kcalGradient, borderWidth: 3, pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: '#fbfaf6', pointBorderColor: '#5f8f7a', pointBorderWidth: 2, tension: 0.42, fill: true, order: 2 },
                    { type: 'bar', label: 'Вода', data: waterValues, backgroundColor: waterGradient, borderRadius: 10, barThickness: 14, yAxisID: 'y-water', order: 3 }
                ]},
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: { duration: 850, easing: 'easeOutQuart' },
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            enabled: true,
                            backgroundColor: 'rgba(255,255,255,0.88)',
                            titleColor: '#18211d',
                            bodyColor: '#4e5b54',
                            borderColor: 'rgba(82,73,58,0.12)',
                            borderWidth: 1,
                            cornerRadius: 16,
                            padding: 10,
                            displayColors: false
                        }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#7a827c', font: { size: 12, weight: '700' } }, border: { display: false } },
                        y: { position: 'left', grid: { color: 'rgba(255,255,255,0.07)', drawTicks: false }, ticks: { color: '#8b928d', font: { size: 10 } }, border: { display: false } },
                        'y-water': { position: 'right', grid: { display: false }, ticks: { color: '#7bafc2', font: { size: 10 } }, border: { display: false } }
                    }
                }
            });
        }





        let infoSheetTouchStartY = null;

        function updateCoachAvatar() {
            const avatar = document.getElementById('coach-avatar');
            if (!avatar) return;
            avatar.innerHTML = getGenderAvatarMarkup(currentGender);
        }

        function getGenderAvatarMarkup(gender) {
            const isFemale = gender === 'F';
            const emoji = isFemale ? '🏋️‍♀️' : '🏋️‍♂️';
            const label = isFemale ? 'Женский wellness avatar' : 'Мужской wellness avatar';
            return '<span class="coach-avatar-emoji" role="img" aria-label="' + label + '">' + emoji + '</span>';
        }

        function getInitials() {
            const name = (userProfile.full_name || telegramUser?.first_name || 'Blueprint').trim();
            const parts = name.split(/\s+/).filter(Boolean);
            const first = parts[0]?.[0] || 'B';
            const second = parts[1]?.[0] || (telegramUser?.last_name?.[0] || 'N');
            return (first + second).toUpperCase();
        }

        function openInfoSheet(topic) {
            const overlay = document.getElementById('info-sheet-overlay');
            const sheet = document.getElementById('info-sheet');
            if (!overlay || !sheet) return;
            const data = buildInfoSheetData(topic);
            sheet.dataset.topic = topic;
            setText('info-sheet-icon', data.icon);
            setText('info-sheet-title', data.title);
            setText('info-sheet-subtitle', data.subtitle);
            const progress = document.getElementById('info-progress-fill');
            if (progress) {
                progress.style.setProperty('--info-pct', data.progress + '%');
                progress.style.setProperty('--info-color', data.color);
            }
            const copy = document.getElementById('info-sheet-copy');
            if (copy) copy.innerHTML = data.paragraphs.map(p => '<p>' + escapeHTML(p) + '</p>').join('');
            const chips = document.getElementById('info-sheet-chips');
            if (chips) chips.innerHTML = data.chips.map(chip => '<span class="info-chip">' + escapeHTML(chip) + '</span>').join('');
            setText('info-sheet-tip', data.tip);
            setLockedLayer('info', overlay, true);
        }

        function closeInfoSheet() {
            setLockedLayer('info', document.getElementById('info-sheet-overlay'), false);
        }

        function handleInfoSheetTouchStart(event) {
            infoSheetTouchStartY = event.changedTouches?.[0]?.clientY ?? null;
        }

        function handleInfoSheetTouchEnd(event) {
            if (infoSheetTouchStartY === null) return;
            const endY = event.changedTouches?.[0]?.clientY ?? infoSheetTouchStartY;
            if (endY - infoSheetTouchStartY > 70) closeInfoSheet();
            infoSheetTouchStartY = null;
        }

        function handleCardKey(event, topic) {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            openInfoSheet(topic);
        }

        function buildInfoSheetData(topic) {
            const goal = getGoalStatus();
            const targetKcal = Number(userProfile.target_kcal) || 0;
            const targetProtein = Number(userProfile.target_protein) || 0;
            const targetFat = Number(userProfile.target_fat) || 0;
            const targetCarbs = Number(userProfile.target_carbs) || 0;
            const targetWater = Number(userProfile.target_water) || 2000;
            const currentProtein = Number(stats.protein) || 0;
            const currentFat = Number(stats.fat) || 0;
            const currentCarbs = Number(stats.carbs) || 0;
            const kcalLeft = Math.max(targetKcal - (Number(stats.kcal) || 0), 0);
            const proteinLeft = Math.max(targetProtein - currentProtein, 0);
            const fatLeft = Math.max(targetFat - currentFat, 0);
            const carbsLeft = Math.max(targetCarbs - currentCarbs, 0);
            const waterLeft = Math.max(targetWater - (Number(dailyWater) || 0), 0);
            const kcalPct = targetKcal > 0 ? Math.min(Math.round(((Number(stats.kcal) || 0) / targetKcal) * 100), 100) : 0;
            const proteinPct = targetProtein > 0 ? Math.min(Math.round((currentProtein / targetProtein) * 100), 100) : 0;
            const fatPct = targetFat > 0 ? Math.min(Math.round((currentFat / targetFat) * 100), 100) : 0;
            const carbsPct = targetCarbs > 0 ? Math.min(Math.round((currentCarbs / targetCarbs) * 100), 100) : 0;
            const waterPct = targetWater > 0 ? Math.min(Math.round(((Number(dailyWater) || 0) / targetWater) * 100), 100) : 0;
            const streakData = calculateStreak();


            if (topic === 'macros') {
                const macroPct = Math.round((proteinPct + carbsPct + fatPct) / 3);
                const proteinState = proteinLeft > 0 ? 'Белок немного проседает: осталось ' + Math.round(proteinLeft) + ' г.' : 'Белок в хорошем диапазоне.';
                const fatState = fatLeft > 0 ? 'Жиры ниже нормы: осталось около ' + Math.round(fatLeft) + ' г.' : 'Жиры выглядят ровно.';
                const carbsState = carbsLeft > 0 ? 'Углеводы пока ниже цели: осталось ' + Math.round(carbsLeft) + ' г.' : 'Углеводы закрыты спокойно.';
                return {
                    icon: 'BJU',
                    title: 'Макронутриенты',
                    subtitle: macroPct + '% среднего прогресса по Б/Ж/У',
                    progress: macroPct,
                    color: '#5f8f7a',
                    paragraphs: [
                        'Макронутриенты — это белки, жиры и углеводы. Вместе они дают энергию, сытость и поддержку восстановления.',
                        'Белок помогает сохранять мышцы, поддерживает восстановление и помогает дольше сохранять сытость.',
                        'Полезные жиры важны для энергии, гормонального баланса и общего самочувствия.',
                        'Углеводы — основной источник энергии для активности и тренировок.'
                    ],
                    chips: [proteinState, fatState, carbsState],
                    tip: 'Смотри не на идеальные цифры, а на баланс дня: если один макрос просел, его можно мягко добрать следующим приемом пищи.'
                };
            }


            if (topic === 'proteinMacro') {
                const over = targetProtein > 0 && currentProtein > targetProtein ? Math.round(currentProtein - targetProtein) : 0;
                return {
                    icon: 'Б',
                    title: 'Белки',
                    subtitle: over > 0 ? 'Выше цели на ' + over + ' г' : (proteinLeft > 0 ? 'Осталось ' + Math.round(proteinLeft) + ' г' : 'Цель закрыта'),
                    progress: proteinPct,
                    color: '#6f9b7a',
                    paragraphs: [
                        'Белки — это строительный материал для мышц, кожи, волос, ферментов и иммунной системы.',
                        'Они особенно важны при тренировках, снижении веса и активном образе жизни: белок помогает сохранять мышцы и дольше чувствовать сытость.',
                        over > 0 ? 'Сильно перебарщивать тоже не нужно: избыток белка часто просто вытесняет овощи, крупы, жиры и делает рацион менее сбалансированным.' : 'Лучше распределять белок по дню, а не пытаться добрать всю норму одним большим приемом пищи.'
                    ],
                    chips: ['курица', 'рыба', 'яйца', 'творог', 'йогурт'],
                    tip: over > 0 ? 'Сегодня белка уже достаточно. Следующий прием можно сделать легче: овощи, крупа, вода.' : 'Если белок проседает, добавь один спокойный белковый продукт к ближайшему приему пищи.'
                };
            }

            if (topic === 'fatMacro') {
                const over = targetFat > 0 && currentFat > targetFat ? Math.round(currentFat - targetFat) : 0;
                return {
                    icon: 'Ж',
                    title: 'Жиры',
                    subtitle: over > 0 ? 'Выше цели на ' + over + ' г' : (fatLeft > 0 ? 'Осталось около ' + Math.round(fatLeft) + ' г' : 'В хорошем диапазоне'),
                    progress: fatPct,
                    color: '#c59a58',
                    paragraphs: [
                        'Жиры помогают усваивать витамины, поддерживают гормональную систему, мозг, кожу и стабильную энергию.',
                        'Хорошие источники — рыба, орехи, авокадо, оливковое масло, яйца. Они делают рацион вкуснее и помогают держать сытость.',
                        over > 0 ? 'С жирами легко перебрать незаметно: масла, соусы, орехи и сыр быстро добавляют калории даже маленькими порциями.' : 'Слишком сильно урезать жиры тоже не стоит: рацион становится менее устойчивым, а сытость может падать.'
                    ],
                    chips: ['рыба', 'орехи', 'авокадо', 'оливковое масло', 'яйца'],
                    tip: over > 0 ? 'Если жиры уже высоко, выбирай дальше более легкие белковые блюда и овощи.' : 'Держи жиры умеренно: немного в каждом приеме пищи обычно работает лучше, чем один очень жирный прием.'
                };
            }

            if (topic === 'carbsMacro') {
                const over = targetCarbs > 0 && currentCarbs > targetCarbs ? Math.round(currentCarbs - targetCarbs) : 0;
                return {
                    icon: 'У',
                    title: 'Углеводы',
                    subtitle: over > 0 ? 'Выше цели на ' + over + ' г' : (carbsLeft > 0 ? 'Осталось ' + Math.round(carbsLeft) + ' г' : 'Цель закрыта'),
                    progress: carbsPct,
                    color: '#c98072',
                    paragraphs: [
                        'Углеводы — главный источник быстрой и удобной энергии для мозга, тренировок, ходьбы и обычной дневной активности.',
                        'Крупы, картофель, фрукты, овощи и цельнозерновой хлеб помогают держать тонус и не срываться на случайные перекусы.',
                        over > 0 ? 'Перебор углеводов чаще всего приходит из сладких напитков, десертов и больших порций гарнира. Это не катастрофа, просто следующий прием можно сделать спокойнее.' : 'Недобор углеводов может ощущаться как усталость, раздражительность и желание срочно съесть что-то сладкое.'
                    ],
                    chips: ['овсянка', 'рис', 'гречка', 'картофель', 'фрукты'],
                    tip: over > 0 ? 'Сегодня углеводов уже достаточно. Добавь белок, овощи и воду, чтобы выровнять день.' : 'Лучший выбор — медленные углеводы рядом с белком: так энергия держится ровнее.'
                };
            }

            if (topic === 'protein') {
                return {
                    icon: 'P',
                    title: 'Белок',
                    subtitle: proteinLeft > 0 ? 'Нужно добрать ' + Math.round(proteinLeft) + ' г' : 'Норма сегодня выглядит хорошо',
                    progress: proteinPct,
                    color: '#6f9b7a',
                    paragraphs: [
                        'Белок помогает сохранять мышцы, поддерживает восстановление и дольше дает ощущение сытости.',
                        proteinLeft > 0 ? 'Сейчас белок немного проседает. Лучше добавить спокойный белковый прием пищи.' : 'Сегодня белок идет уверенно — это хорошая база для восстановления.'
                    ],
                    chips: ['творог', 'курица', 'яйца', 'йогурт', 'тунец'],
                    tip: 'Не обязательно добирать все сразу: один белковый прием пищи часто решает большую часть нормы.'
                };
            }

            if (topic === 'water') {
                return {
                    icon: 'W',
                    title: 'Вода',
                    subtitle: waterPct + '% дневной нормы',
                    progress: waterPct,
                    color: '#7bafc2',
                    paragraphs: [
                        'Вода влияет на энергию, восстановление и общее самочувствие в течение дня.',
                        waterLeft > 0 ? 'Осталось примерно ' + Math.round(waterLeft) + ' мл. Можно добирать маленькими порциями.' : 'Норма воды на сегодня закрыта мягко и без перегруза.'
                    ],
                    chips: ['250 мл сейчас', 'после еды', 'до тренировки'],
                    tip: waterPct >= 75 ? 'Ты уже близко к норме — осталось немного дожать.' : 'Начни с одного стакана: это проще, чем пытаться закрыть норму сразу.'
                };
            }

            if (topic === 'streak') {
                return {
                    icon: 'S',
                    title: 'Streak',
                    subtitle: streakData.streak + ' ' + pluralDays(streakData.streak) + ' режима',
                    progress: Math.min(streakData.streak * 10, 100),
                    color: '#d7955b',
                    paragraphs: [
                        'Streak — это серия дней подряд, когда ты ведешь дневник без пропусков.',
                        'Регулярность важнее идеальности. Даже простой день с одной записью помогает держать привычку.'
                    ],
                    chips: ['ритм', 'привычка', 'последовательность'],
                    tip: 'Лучший streak: ' + streakData.best + ' ' + pluralDays(streakData.best) + '. Спокойно строим систему, а не гоняемся за идеалом.'
                };
            }

            return {
                icon: '↗',
                title: 'Калории',
                subtitle: goal.label + ' · осталось ' + Math.round(kcalLeft) + ' ккал',
                progress: kcalPct,
                color: '#5f8f7a',
                paragraphs: [
                    'Калории — это энергия, которую организм использует в течение дня.',
                    'Сейчас у тебя режим “' + goal.label.toLowerCase() + '”. Это помогает держать питание в понятном коридоре без резких ограничений.',
                    kcalLeft > 0 ? 'До цели осталось ' + Math.round(kcalLeft) + ' ккал. Темп выглядит спокойным.' : 'Цель на сегодня закрыта. Дальше лучше выбирать легкие блюда и воду.'
                ],
                chips: ['энергия', goal.label, kcalPct + '% цели'],
                tip: 'Смотри на тренд, а не на один идеальный день. Ровность обычно работает лучше жестких ограничений.'
            };
        }

        function getFirstName() {
            const raw = (userProfile.full_name || telegramUser?.first_name || 'Пользователь').trim();
            return raw.split(/\s+/)[0] || 'Пользователь';
        }

        function getDayPart() {
            const hour = new Date().getHours();
            if (hour < 5) return 'Доброй ночи';
            if (hour < 12) return 'Доброе утро';
            if (hour < 18) return 'Добрый день';
            return 'Добрый вечер';
        }

        function getGoalStatus() {
            const goalType = userProfile.goal_type || 'maintain';
            if (goalType === 'cut') return { key: 'deficit', icon: '🔥', label: 'Дефицит', tone: 'Сжигаем аккуратно' };
            if (goalType === 'bulk') return { key: 'mass', icon: '💪', label: 'Набор веса', tone: 'Строим форму' };
            if (goalType === 'muscle') return { key: 'muscle', icon: '💪', label: 'Рост мышц', tone: 'Растим мышцы спокойно' };
            const kcal = Number(userProfile.target_kcal) || 0;
            const weight = Number(userProfile.weight) || 0;
            const estimatedMaintain = weight > 0 ? weight * (currentGender === 'F' ? 30 : 33) : 2500;
            if (kcal && kcal < estimatedMaintain - 180) return { key: 'deficit', icon: '🔥', label: 'Дефицит', tone: 'Сжигаем аккуратно' };
            if (kcal && kcal > estimatedMaintain + 220) return { key: 'mass', icon: '💪', label: 'Набор массы', tone: 'Строим форму' };
            return { key: 'maintain', icon: '⚖️', label: 'Поддержание', tone: 'Держим баланс' };
        }

                                        function buildMenuSuggestion(input, rec) {
            const prefs = input.food_preferences ? ' Учитываю предпочтения: ' + input.food_preferences + '.' : '';
            const exclusions = input.food_exclusions ? ' Исключаем: ' + input.food_exclusions + '.' : '';
            const base = rec.goal.label === 'Сушка'
                ? 'Собери день вокруг нежирного белка, крупы умеренной порцией, овощей и 1-2 легких перекусов.'
                : rec.goal.label === 'Поддержание'
                    ? 'Держи ровный день: белок в каждом приеме, сложные углеводы вокруг активности, жиры маленькими порциями.'
                    : 'Добавь плотный завтрак, белок в 3-4 приемах и углеводы рядом с тренировкой, чтобы набор шел спокойнее.';
            return '<b>Меню-ориентир:</b> ' + base + prefs + exclusions + ' Пример: завтрак с белком и крупой, обед с гарниром и овощами, ужин с белком, плюс перекус под остаток КБЖУ.';
        }

        function renderKbjuRecommendation() {
            const rec = calculateKbjuRecommendation();
            latestKbjuRecommendation = rec.ready ? rec : null;
            const set = (id, text) => setText(id, text);
            if (!rec.ready) {
                set('rec-maintenance', '—');
                set('rec-target', '—');
                set('rec-protein', '—');
                set('rec-fat', '—');
                set('rec-carbs', '—');
                set('kbju-goal-pill', 'Расчет');
                set('kbju-recommend-subtitle', 'Заполни возраст, рост и вес — расчет появится автоматически.');
                set('rec-explain', 'AI объяснит расчет простым языком после заполнения параметров. Базовую математику считает приложение.');
                const menu = document.getElementById('rec-menu');
                if (menu) menu.textContent = 'Меню-ориентир появится после расчета.';
                const warning = document.getElementById('rec-warning');
                if (warning) { warning.textContent = rec.warnings?.[0] || ''; warning.classList.toggle('active', Boolean(rec.warnings?.length)); }
                return;
            }
            set('rec-maintenance', rec.tdee + ' ккал');
            set('rec-target', rec.target_kcal + ' ккал');
            set('rec-protein', rec.target_protein + ' г');
            set('rec-fat', rec.target_fat + ' г');
            set('rec-carbs', rec.target_carbs + ' г');
            set('kbju-goal-pill', rec.goal.label);
            set('kbju-recommend-subtitle', 'BMR ' + rec.bmr + ' ккал · активность: ' + rec.activity.label + ' · TDEE ' + rec.tdee + ' ккал');
            set('rec-explain', 'Расчет: Mifflin–St Jeor считает базовый обмен, затем умножаем на активность и тренировки. Под цель “' + rec.goal.label.toLowerCase() + '” калории мягко корректируются, белки и жиры считаются от веса, а углеводы занимают оставшуюся энергию.');
            const menu = document.getElementById('rec-menu');
            if (menu) menu.innerHTML = buildMenuSuggestion(getProfileFormValues(), rec);
            const warning = document.getElementById('rec-warning');
            if (warning) { warning.textContent = rec.warnings.join(' '); warning.classList.toggle('active', rec.warnings.length > 0); }
        }

        function bindKbjuAutoCalculation() {
            ['inp-age','inp-height','inp-weight','inp-activity','inp-workouts','inp-goal','inp-food-preferences','inp-food-exclusions'].forEach(id => {
                const el = document.getElementById(id);
                if (!el || el.dataset.kbjuBound === '1') return;
                el.dataset.kbjuBound = '1';
                el.addEventListener('input', renderKbjuRecommendation);
                el.addEventListener('change', renderKbjuRecommendation);
            });
        }

        function applyRecommendedKbju() {
            const rec = latestKbjuRecommendation || calculateKbjuRecommendation();
            if (!rec.ready) {
                showToast('Заполни возраст, рост и вес для расчета.');
                return;
            }
            document.getElementById('inp-kcal').value = rec.target_kcal;
            document.getElementById('inp-protein').value = rec.target_protein;
            document.getElementById('inp-fat').value = rec.target_fat;
            document.getElementById('inp-carbs').value = rec.target_carbs;
            showToast('Рекомендация КБЖУ применена в профиль.');
        }

        function calculateStreak() {
            const today = new Date();
            let streak = 0;
            for (let i = 0; i < 14; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                const key = toISOLocal(d);
                if (activeDaysSet.has(key)) streak++;
                else if (i === 0 && toISOLocal(currentDate) === key && (Number(stats.kcal) || 0) > 0) streak++;
                else break;
            }
            const bestKey = 'best_streak_' + appUserId;
            const best = Math.max(Number(localStorage.getItem(bestKey)) || 0, streak);
            localStorage.setItem(bestKey, String(best));
            return { streak, best };
        }

        function setText(id, value) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }

        function renderNutritionCoachAdvice() {
            const advice = buildNutritionCoachAdvice();
            setText('nutrition-coach-meta', advice.meta);
            setText('nutrition-coach-tip', advice.tip);
            setText('nutrition-coach-risk', advice.risk);
            setText('nutrition-coach-upgrade', advice.upgrade);
        }

        function updatePersonalizedUI() {
            const name = getFirstName();
            const goal = getGoalStatus();
            const targetKcal = Number(userProfile.target_kcal) || 0;
            const targetProtein = Number(userProfile.target_protein) || 0;
            const targetWater = Number(userProfile.target_water) || 2000;
            const kcalLeft = Math.max(targetKcal - (Number(stats.kcal) || 0), 0);
            const proteinLeft = Math.max(targetProtein - (Number(stats.protein) || 0), 0);
            const waterPct = targetWater > 0 ? Math.min(Math.round((dailyWater / targetWater) * 100), 100) : 0;
            const kcalPct = targetKcal > 0 ? Math.round(((Number(stats.kcal) || 0) / targetKcal) * 100) : 0;
            const proteinPct = targetProtein > 0 ? Math.round(((Number(stats.protein) || 0) / targetProtein) * 100) : 0;
            const { streak, best } = calculateStreak();
            const isToday = toISOLocal(currentDate) === toISOLocal(new Date());

            updateCoachAvatar();
            setText('coach-greeting-title', getDayPart() + ', ' + name);
            setText('coach-greeting-subtitle', isToday ? ('Сегодня цель — ' + (targetKcal || 0) + ' ккал. ' + goal.tone + '.') : ('Смотрим день: ' + (document.getElementById('cal-date-label')?.textContent || 'выбранная дата') + '.'));

            const goalBadge = document.getElementById('goal-status-badge');
            if (goalBadge) {
                goalBadge.dataset.goal = goal.key;
                goalBadge.textContent = goal.icon + ' ' + goal.label;
            }

            setText('streak-badge', '🔥 ' + streak + ' ' + pluralDays(streak) + ' режима');
            setText('coach-kcal-feedback', kcalLeft > 0 ? ('Отличный темп. Осталось ' + Math.round(kcalLeft) + ' ккал') : 'Цель по ккал мягко закрыта');
            setText('coach-kcal-note', kcalPct >= 95 ? 'Очень ровное попадание в план.' : kcalPct >= 65 ? ('Уже ' + kcalPct + '% — день идет спокойно.') : 'Есть запас для комфортного приема пищи.');
            setText('coach-protein-feedback', proteinLeft > 0 ? ('Белок проседает — добрать ' + Math.round(proteinLeft) + ' г') : 'Белок сегодня идет отлично');
            setText('coach-protein-note', proteinPct >= 90 ? 'Хорошая база для восстановления.' : 'Добавь спокойный белковый прием пищи.');
            setText('coach-water-feedback', waterPct >= 75 ? 'Вода почти в норме' : (waterPct + '% воды'));
            setText('coach-water-note', waterPct >= 90 ? 'Гидратация выглядит ровно.' : waterPct >= 55 ? 'Осталось немного дожать.' : 'Мягкий фокус: добавь стакан воды.');
            setText('coach-streak-feedback', streak > 0 ? (streak + ' ' + pluralDays(streak) + ' подряд') : 'Начни streak сегодня');
            setText('coach-streak-note', best > streak ? ('Лучший streak — ' + best + ' ' + pluralDays(best) + '.') : 'Это твой лучший текущий ритм.');

            let smart = 'Добавьте первый прием пищи, и я покажу точный фокус дня.';
            if ((Number(stats.kcal) || 0) > 0) {
                if (waterPct < 55) smart = 'Сегодня главный фокус — вода. Добавь 250 мл сейчас, чтобы не отставать.';
                else if (proteinPct < 55) smart = 'Вечером лучше добрать белок: подойдет курица, творог, яйца или рыба.';
                else if (kcalPct > 105) smart = 'Калории уже выше цели. Дальше лучше выбирать легкие блюда и воду.';
                else if (kcalPct >= 85 && proteinPct >= 80) smart = 'Ты почти идеально держишь план: осталось мягко закрыть день.';
                else smart = goal.label + ': темп нормальный, осталось ' + Math.round(kcalLeft) + ' ккал до цели.';
            }
            setText('coach-smart-feedback', smart);
            renderNutritionCoachAdvice();
        }

        function pluralDays(n) {
            const mod10 = n % 10;
            const mod100 = n % 100;
            if (mod10 === 1 && mod100 !== 11) return 'день';
            if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
            return 'дней';
        }

        function setRingProgress(id, pct) {
            const el = document.getElementById(id);
            if (el) el.style.setProperty('--pct', Math.max(0, Math.min(100, pct)));
        }

        function refreshUI() {
            const getPct = (val, max) => max > 0 ? Math.min((val / max) * 100, 100) : 0;
            let kcalPct = getPct(stats.kcal, userProfile.target_kcal);
            document.getElementById('intake-pct').innerText = Math.round(kcalPct) + '%';
            document.getElementById('gauge-cur').innerText = Math.round(stats.kcal);
            document.getElementById('gauge-max').innerText = userProfile.target_kcal;
            document.getElementById('gauge-path').style.strokeDashoffset = 125.66 - (kcalPct / 100) * 125.66;
            let cPct = getPct(stats.carbs, userProfile.target_carbs); document.getElementById('val-c').innerText = `${Math.round(stats.carbs)} / ${userProfile.target_carbs} г`; document.getElementById('pct-c').innerText = Math.round(cPct) + '%'; setRingProgress('bar-c', cPct);
            let fPct = getPct(stats.fat, userProfile.target_fat); document.getElementById('val-f').innerText = `${Math.round(stats.fat)} / ${userProfile.target_fat} г`; document.getElementById('pct-f').innerText = Math.round(fPct) + '%'; setRingProgress('bar-f', fPct);
            let pPct = getPct(stats.protein, userProfile.target_protein); document.getElementById('val-p').innerText = `${Math.round(stats.protein)} / ${userProfile.target_protein} г`; document.getElementById('pct-p').innerText = Math.round(pPct) + '%'; setRingProgress('bar-p', pPct);
            let wPct = getPct(dailyWater, userProfile.target_water || 2000); document.getElementById('water-current').innerText = dailyWater; document.getElementById('water-target-ui').innerText = userProfile.target_water || 2000; document.getElementById('pct-w').innerText = Math.round(wPct) + '%'; document.getElementById('water-bar').style.width = wPct + '%';
            updatePersonalizedUI();
        }

        function getDefaultDietFilterForGoal() {
            const goal = userProfile.goal_type || 'maintain';
            if (goal === 'cut') return 'Сушка';
            if (goal === 'bulk') return 'Набор';
            if (goal === 'muscle') return 'Рост мышц';
            return 'Поддержание';
        }

        function setActiveButton(groupSelector, value) {
            document.querySelectorAll(groupSelector + ' button').forEach(btn => {
                const raw = btn.getAttribute('onclick') || '';
                btn.classList.toggle('active', raw.includes("'" + value + "'"));
            });
        }

        function syncRecipeFilterButtons() {
            setActiveButton('#meal-tabs', currentMealFilter);
            setActiveButton('#diet-tabs', currentDietFilter);
        }

        function setMealFilter(meal, btn) {
            currentMealFilter = meal;
            document.querySelectorAll('#meal-tabs .meal-segment').forEach(el => el.classList.remove('active'));
            if (btn) btn.classList.add('active');
            renderRecipes(true);
        }

        function setDietFilter(filter, btn) {
            currentDietFilter = filter;
            document.querySelectorAll('#diet-tabs .tab').forEach(el => el.classList.remove('active'));
            if (btn) btn.classList.add('active');
            renderRecipes(true);
        }

        function setTab(tabName, btn) {
            if (['Завтрак','Обед','Ужин','Перекус'].includes(tabName)) return setMealFilter(tabName, btn);
            return setDietFilter(tabName, btn);
        }

        function toggleFavorite(event, recipeId) {
            event.stopPropagation();
            var favs = JSON.parse(localStorage.getItem('fav_recipes_' + appUserId)) || [];
            recipeId = String(recipeId); favs = favs.map(String); if (favs.includes(recipeId)) favs = favs.filter(id => id !== recipeId); else favs.push(recipeId);
            localStorage.setItem('fav_recipes_' + appUserId, JSON.stringify(favs));
            renderRecipes(true);
            renderRecipesScreen();
        }

                                                                        function openRecipePortionEditor(mode, recipeId, context = {}) {
            const recipe = getRecipeById(recipeId);
            if (!recipe) return showToast('Рецепт не найден');
            const hasContextIngredients = Array.isArray(context.ingredients) && context.ingredients.length;
            const ingredients = hasContextIngredients ? hydratePortionIngredients(context.ingredients, recipe) : getRecipeWorkingIngredients(recipe);
            const total = getRecipePortionNutrition(recipe, ingredients);
            recipePortionDraft = {
                mode,
                recipeId: String(recipe.id),
                context,
                ingredients,
                eatenGrams: Math.max(1, Math.round(total.grams || 100)),
                mealType: context.mealType || recipe.category || currentMealFilter || 'Обед'
            };
            document.getElementById('portion-title').textContent = recipe.title;
            document.getElementById('portion-confirm-btn').textContent = mode === 'plan' ? 'Добавить в меню' : mode === 'plan-edit' ? 'Сохранить рецепт' : 'Внести в дневник';
            renderRecipePortionEditor();
            setLockedLayer('portion', document.getElementById('recipe-portion-overlay'), true);
        }

        function closeRecipePortionEditor() {
            setLockedLayer('portion', document.getElementById('recipe-portion-overlay'), false);
            recipePortionDraft = null;
        }

        function renderRecipePortionTotals() {
            if (!recipePortionDraft) return;
            const total = getRecipePortionNutrition(getRecipeById(recipePortionDraft.recipeId), recipePortionDraft.ingredients);
            const per100Ratio = total.grams > 0 ? 100 / total.grams : 0;
            const eatenGrams = Math.max(1, Number(recipePortionDraft.eatenGrams) || Math.round(total.grams) || 100);
            const eatenRatio = total.grams > 0 ? eatenGrams / total.grams : 0;
            const diaryLine = recipePortionDraft.mode === 'diary'
                ? '<div class="portion-kbju-row portion-kbju-row-accent"><span>Съедено</span><b>' + Math.round(eatenGrams) + ' г · ' + Math.round(total.kcal * eatenRatio) + ' ккал · Б ' + (total.protein * eatenRatio).toFixed(1) + ' · Ж ' + (total.fat * eatenRatio).toFixed(1) + ' · У ' + (total.carbs * eatenRatio).toFixed(1) + '</b></div>'
                : '';
            document.getElementById('portion-total').innerHTML =
                '<div class="portion-kbju-card"><div class="portion-kbju-title">Расчёт КБЖУ</div>' +
                '<div class="portion-kbju-row"><span>Рецепт</span><b>' + Math.round(total.grams) + ' г · ' + Math.round(total.kcal) + ' ккал · Б ' + total.protein.toFixed(1) + ' · Ж ' + total.fat.toFixed(1) + ' · У ' + total.carbs.toFixed(1) + '</b></div>' +
                '<div class="portion-kbju-row"><span>На 100 г</span><b>' + Math.round(total.kcal * per100Ratio) + ' ккал · Б ' + (total.protein * per100Ratio).toFixed(1) + ' · Ж ' + (total.fat * per100Ratio).toFixed(1) + ' · У ' + (total.carbs * per100Ratio).toFixed(1) + '</b></div>' +
                diaryLine +
                '</div>';
            const eatenInput = document.getElementById('portion-eaten-grams');
            if (eatenInput && document.activeElement !== eatenInput) eatenInput.value = String(Math.round(eatenGrams));
        }

        function renderRecipePortionEditor() {
            if (!recipePortionDraft) return;
            const list = document.getElementById('portion-ingredients');
            const isDiary = recipePortionDraft.mode === 'diary';
            document.getElementById('portion-eaten-field')?.toggleAttribute('hidden', !isDiary);
            document.getElementById('portion-meal-section')?.toggleAttribute('hidden', !isDiary);
            document.querySelectorAll('.portion-meal-option').forEach(btn => btn.classList.toggle('active', btn.textContent.trim() === recipePortionDraft.mealType));
            renderRecipePortionTotals();
            list.innerHTML = recipePortionDraft.ingredients.map((ing, index) => {
                const category = ing.products?.category || ing.category;
                const swaps = category === 'grains' ? getRecipeIngredientCatalog('grains').filter(option => {
                    const currentIsCookedGrain = /варен/i.test(ing.products?.name || '');
                    return !currentIsCookedGrain || /варен/i.test(option.products?.name || '');
                }) : [];
                const swap = swaps.length > 1 ? '<select aria-label="Заменить ингредиент" onchange="setPortionIngredientProduct(' + index + ', this.value)">' +
                    swaps.map(option => {
                        const key = String(option.products.id || option.products.name);
                        const active = String(option.products.id || option.products.name) === String(ing.products.id || ing.products.name) ? ' selected' : '';
                        return '<option value="' + escapeAttr(key) + '"' + active + '>' + escapeHTML(option.products.name) + '</option>';
                    }).join('') + '</select>' : '';
                return ProductCard(ing, index, swap);
            }).join('');
        }

        function setPortionIngredientGrams(index, value) {
            if (!recipePortionDraft?.ingredients[index]) return;
            recipePortionDraft.ingredients[index].weight = Math.max(0, Number(String(value).replace(',', '.')) || 0);
            saveRecipeIngredientOverride(recipePortionDraft.recipeId, recipePortionDraft.ingredients);
            renderRecipePortionTotals();
        }

        function setPortionIngredientProduct(index, key) {
            if (!recipePortionDraft?.ingredients[index]) return;
            const next = getRecipeIngredientCatalog('grains').find(ing => String(ing.products.id || ing.products.name) === String(key));
            if (!next) return;
            const grams = recipePortionDraft.ingredients[index].weight;
            recipePortionDraft.ingredients[index] = clonePortionIngredient({ ...next, weight: grams });
            saveRecipeIngredientOverride(recipePortionDraft.recipeId, recipePortionDraft.ingredients);
            renderRecipePortionEditor();
        }

        function setPortionEatenGrams(value) {
            if (!recipePortionDraft) return;
            recipePortionDraft.eatenGrams = Math.max(1, Number(String(value).replace(',', '.')) || 1);
            renderRecipePortionTotals();
        }

        function setPortionMealType(mealType) {
            if (!recipePortionDraft) return;
            recipePortionDraft.mealType = mealType || 'Перекус';
            renderRecipePortionEditor();
        }

        function resetRecipePortionDraft() {
            if (!recipePortionDraft) return;
            const recipe = getRecipeById(recipePortionDraft.recipeId);
            recipePortionDraft.ingredients = getRecipeDefaultIngredients(recipe);
            clearRecipeIngredientOverride(recipePortionDraft.recipeId);
            const total = getRecipePortionNutrition(recipe, recipePortionDraft.ingredients);
            recipePortionDraft.eatenGrams = Math.max(1, Math.round(total.grams || 100));
            renderRecipePortionEditor();
            renderRecipes(true);
            renderRecipesScreen();
        }

        function confirmRecipePortion() {
            if (!recipePortionDraft) return;
            const recipe = getRecipeById(recipePortionDraft.recipeId);
            const ingredients = recipePortionDraft.ingredients.map(clonePortionIngredient).filter(ing => Number(ing.weight) > 0);
            if (!ingredients.length) return showToast('Укажите граммы ингредиентов');
            const context = recipePortionDraft.context || {};
            const mode = recipePortionDraft.mode;
            const total = getRecipePortionNutrition(recipe, ingredients);
            const eatenGrams = Math.max(1, Number(recipePortionDraft.eatenGrams) || total.grams || 100);
            const mealType = recipePortionDraft.mealType || recipe.category || 'Перекус';
            const eatenRatio = total.grams > 0 ? eatenGrams / total.grams : 0;
            saveRecipeIngredientOverride(recipe.id, ingredients);
            closeRecipePortionEditor();
            if (mode === 'plan') return addRecipeToMealPlan(context.date || mealPrepState.selectedDate, context.mealType || recipe.category || 'Обед', recipe.id, 1, ingredients);
            if (mode === 'plan-edit') return updateMealPlanItem(context.itemId, ingredients);
            return openMealModal(recipe.id, total.kcal * eatenRatio, total.protein * eatenRatio, total.fat * eatenRatio, total.carbs * eatenRatio, scalePortionIngredients(ingredients, eatenRatio), mealType);
        }

                                                                function getPersonalRecipeLabel(meta) {
            const match = meta.tags.find(tag => getUserRecipeFilters().includes(tag.filter));
            return match ? match.label : '';
        }

        function getGoalBadgePriority() {
            const goal = userProfile.goal_type || 'maintain';
            if (goal === 'cut') return ['Сушка', 'Похудение'];
            if (goal === 'bulk') return ['Набор', 'Рост мышц'];
            if (goal === 'muscle') return ['Рост мышц', 'Высокий белок'];
            return ['Поддержание'];
        }

                        function updateRecipeCoachText(visibleCount) {
            const el = document.getElementById('recipe-coach-text');
            if (!el) return;
            const proteinLeft = Math.max((Number(userProfile.target_protein) || 0) - (Number(stats.protein) || 0), 0);
            let text = currentMealFilter + ' + ' + currentDietFilter.toLowerCase() + ': показываю блюда, которые лучше совпадают с твоей целью.';
            if (currentDietFilter === 'Все') text = currentMealFilter + ': сначала идут блюда, которые лучше подходят под твой профиль.';
            if (proteinLeft > 35) text += ' Сегодня белок проседает — обрати внимание на high protein варианты.';
            text += ' Найдено: ' + visibleCount + '.';
            el.textContent = text;
            const chips = document.getElementById('recipe-coach-chips');
            if (chips) {
                const base = currentDietFilter === 'Все' ? getUserRecipeFilters().slice(0, 3) : [currentDietFilter, currentMealFilter, 'Белок+'];
                chips.innerHTML = base.slice(0, 3).map(chip => '<span class="recipe-coach-chip">' + escapeHTML(chip) + '</span>').join('');
            }
        }

                                function renderRecipes(animate = false) {
            const container = document.getElementById('recipe-list');
            if (!container) return;
            syncRecipeFilterButtons();
            const previousScroll = container.scrollLeft;
            if (animate) container.classList.add('recipe-hidden-transition');
            const favs = JSON.parse(localStorage.getItem('fav_recipes_' + appUserId)) || [];
            const filtered = sortRecipeItems(getEnrichedRecipes()
                .filter(item => recipeMatchesMealFilter(item.recipe, currentMealFilter))
                .filter(item => recipeMatchesDietFilter(item.recipe, item.meta, currentDietFilter, favs)), 'recommended');
            updateRecipeCoachText(filtered.length);
            if (filtered.length === 0) { container.innerHTML = '<div class="empty-state" style="width:100%;"><div class="empty-state-icon">🍽️</div><div style="font-weight:800;color:var(--text-main);margin-bottom:6px;">Подходящих блюд пока нет</div><div>Попробуйте другую цель или откройте все рецепты.</div></div>'; return; }
            container.innerHTML = filtered.slice(0, 12).map(item => renderRecipeCard(item, favs, true)).join('');
            requestAnimationFrame(() => {
                container.scrollLeft = previousScroll;
                container.classList.remove('recipe-hidden-transition');
            });
        }

        function openRecipesScreen() {
            const overlay = document.getElementById('recipes-screen-overlay');
            if (!overlay) return;
            screenMealFilter = currentMealFilter || 'Все';
            screenDietFilter = currentDietFilter || 'Все';
            setActiveButton('#screen-meal-tabs', screenMealFilter);
            setActiveButton('#screen-diet-tabs', screenDietFilter);
            setLockedLayer('recipes', overlay, true);
            renderRecipesScreen();
        }

        function closeRecipesScreen() {
            setLockedLayer('recipes', document.getElementById('recipes-screen-overlay'), false);
        }

        function setScreenMealFilter(filter, btn) {
            screenMealFilter = filter;
            document.querySelectorAll('#screen-meal-tabs .tab').forEach(el => el.classList.remove('active'));
            if (btn) btn.classList.add('active');
            renderRecipesScreen();
        }

        function setScreenDietFilter(filter, btn) {
            screenDietFilter = filter;
            document.querySelectorAll('#screen-diet-tabs .tab').forEach(el => el.classList.remove('active'));
            if (btn) btn.classList.add('active');
            renderRecipesScreen();
        }

        function setRecipeSearch(value) {
            recipeSearchQuery = String(value || '').trim().toLowerCase();
            renderRecipesScreen();
        }

        function setRecipeSort(value) {
            recipeSortMode = value || 'recommended';
            renderRecipesScreen();
        }

        function setRecipeView(view) {
            recipeViewMode = view === 'list' ? 'list' : 'grid';
            document.getElementById('view-grid-btn')?.classList.toggle('active', recipeViewMode === 'grid');
            document.getElementById('view-list-btn')?.classList.toggle('active', recipeViewMode === 'list');
            renderRecipesScreen();
        }

        function renderRecipesScreen() {
            const grid = document.getElementById('recipes-results-grid');
            if (!grid) return;
            const favs = JSON.parse(localStorage.getItem('fav_recipes_' + appUserId)) || [];
            const q = recipeSearchQuery;
            const searchableIds = new Set(searchRecipes(recipesData, q).map(recipe => String(recipe.id)));
            const filtered = sortRecipeItems(getEnrichedRecipes()
                .filter(item => recipeMatchesMealFilter(item.recipe, screenMealFilter))
                .filter(item => recipeMatchesDietFilter(item.recipe, item.meta, screenDietFilter, favs))
                .filter(item => !q || searchableIds.has(String(item.recipe.id))), recipeSortMode);
            grid.classList.toggle('list', recipeViewMode === 'list');
            document.getElementById('recipe-results-meta').textContent = filtered.length + ' ' + (filtered.length === 1 ? 'рецепт' : 'рецептов') + ' · ' + screenMealFilter + ' · ' + screenDietFilter;
            if (!filtered.length) {
                grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⌕</div><div style="font-weight:800;color:var(--text-main);margin-bottom:6px;">Ничего не найдено</div><div>Попробуйте изменить поиск или фильтры.</div></div>';
                return;
            }
            grid.innerHTML = filtered.map(item => renderRecipeCard(item, favs, recipeViewMode === 'list')).join('');
        }


        const MEAL_TYPES = ['Завтрак', 'Обед', 'Ужин', 'Перекус'];
        const mealPrepState = {
            activeTab: 'plan',
            period: 7,
            startDate: toISOLocal(new Date()),
            selectedDate: toISOLocal(new Date()),
            copiedDay: null
        };
        const mealPickerState = { mealType: 'Завтрак', query: '' };

        function mealPlanStorageKey() { return 'meal_plan_' + appUserId; }
        function shoppingStateKey() { return 'shopping_state_' + appUserId; }

        function getDefaultMealPlan() {
            return { period: 7, startDate: toISOLocal(new Date()), items: [], customItems: [] };
        }

        function loadMealPlan() {
            try {
                const raw = localStorage.getItem(mealPlanStorageKey());
                const plan = raw ? JSON.parse(raw) : getDefaultMealPlan();
                return { ...getDefaultMealPlan(), ...plan, items: Array.isArray(plan.items) ? plan.items : [], customItems: Array.isArray(plan.customItems) ? plan.customItems : [] };
            } catch (e) {
                return getDefaultMealPlan();
            }
        }

        function saveMealPlan(plan) {
            localStorage.setItem(mealPlanStorageKey(), JSON.stringify(plan));
            updateMealPrepSummary();
        }

        function loadShoppingState() {
            try { return JSON.parse(localStorage.getItem(shoppingStateKey())) || {}; } catch (e) { return {}; }
        }

        function saveShoppingState(state) {
            localStorage.setItem(shoppingStateKey(), JSON.stringify(state || {}));
        }

        function getMealPlanDates(plan = loadMealPlan()) {
            const start = parseLocalDate(plan.startDate || toISOLocal(new Date()));
            return Array.from({ length: Number(plan.period) || 7 }, (_, index) => {
                const d = new Date(start);
                d.setDate(start.getDate() + index);
                return toISOLocal(d);
            });
        }

        function getRecipeById(id) {
            return recipesData.find(recipe => String(recipe.id) === String(id));
        }

        function getRecipeServings(recipe) {
            return Math.max(1, Number(recipe?.servings || recipe?.portions || recipe?.serving_count) || 1);
        }

                        function openMealPrep() {
            const plan = loadMealPlan();
            mealPrepState.period = Number(plan.period) || 7;
            mealPrepState.startDate = plan.startDate || toISOLocal(new Date());
            const dates = getMealPlanDates(plan);
            if (!dates.includes(mealPrepState.selectedDate)) mealPrepState.selectedDate = dates[0] || mealPrepState.startDate;
            setLockedLayer('meal-prep', document.getElementById('meal-prep-overlay'), true);
            renderMealPrep();
        }

        function closeMealPrep() {
            setLockedLayer('meal-prep', document.getElementById('meal-prep-overlay'), false);
            updateMealPrepSummary();
        }

        function setMealPrepTab(tab, btn) {
            mealPrepState.activeTab = tab;
            document.querySelectorAll('.meal-prep-tab').forEach(el => el.classList.remove('active'));
            if (btn) btn.classList.add('active');
            document.querySelectorAll('.prep-panel').forEach(el => el.classList.remove('active'));
            document.getElementById('prep-panel-' + tab)?.classList.add('active');
            renderMealPrep();
        }

        function setMealPlanPeriod(value) {
            const plan = loadMealPlan();
            plan.period = Number(value) || 7;
            mealPrepState.period = plan.period;
            const dates = getMealPlanDates(plan);
            if (!dates.includes(mealPrepState.selectedDate)) mealPrepState.selectedDate = dates[0];
            saveMealPlan(plan);
            renderMealPrep();
        }

        function setMealPlanStart(value) {
            const plan = loadMealPlan();
            plan.startDate = value || toISOLocal(new Date());
            mealPrepState.startDate = plan.startDate;
            mealPrepState.selectedDate = plan.startDate;
            saveMealPlan(plan);
            renderMealPrep();
        }

        function selectMealPlanDate(dateStr) {
            mealPrepState.selectedDate = dateStr;
            renderMealPrepPlan();
        }

        function getDayPlanItems(dateStr, plan = loadMealPlan()) {
            return plan.items.filter(item => item.date === dateStr);
        }

        function resetShoppingStateForRecipe(recipe) {
            if (!recipe) return;
            const state = loadShoppingState();
            (recipe.recipe_ingredients || []).forEach(ing => {
                const name = ing.products?.name || 'Продукт';
                const unitData = normalizeIngredientUnit(Number(ing.weight) || 0, ing.unit || ing.products?.unit || '', name);
                const key = name.toLowerCase() + '|' + unitData.unit;
                if (state[key]?.deleted) delete state[key];
            });
            saveShoppingState(state);
        }

        function addRecipeToMealPlan(dateStr, mealType, recipeId, servings = 1, selectedIngredients = null) {
            const recipe = getRecipeById(recipeId);
            if (!recipe) return showToast('Выберите рецепт');
            const plan = loadMealPlan();
            plan.items.push({ id: 'mpi-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), recipeId: String(recipeId), date: dateStr, mealType, servings: Math.max(0.25, Number(servings) || 1), ingredients: snapshotPortionIngredients(selectedIngredients) });
            resetShoppingStateForRecipe(recipe);
            saveMealPlan(plan);
            renderMealPrep();
            showToast('Добавлено в меню');
        }

        function updateMealPlanItem(itemId, selectedIngredients) {
            const plan = loadMealPlan();
            const item = plan.items.find(entry => entry.id === itemId);
            if (!item) return showToast('Блюдо в меню не найдено');
            item.ingredients = snapshotPortionIngredients(selectedIngredients);
            saveMealPlan(plan);
            renderMealPrep();
            showToast('Порция обновлена');
        }

        function removeMealPlanItem(itemId) {
            const plan = loadMealPlan();
            plan.items = plan.items.filter(item => item.id !== itemId);
            saveMealPlan(plan);
            renderMealPrep();
        }

        function clearMealPlanDay() {
            const plan = loadMealPlan();
            plan.items = plan.items.filter(item => item.date !== mealPrepState.selectedDate);
            saveMealPlan(plan);
            renderMealPrep();
            showToast('День очищен');
        }

        function copyMealPlanDay() {
            const plan = loadMealPlan();
            const source = getDayPlanItems(mealPrepState.selectedDate, plan);
            if (!source.length) return showToast('В этом дне пока нет блюд');
            mealPrepState.copiedDay = {
                sourceDate: mealPrepState.selectedDate,
                items: source.map(item => ({ recipeId: item.recipeId, mealType: item.mealType, servings: item.servings, ingredients: item.ingredients || [] }))
            };
            renderMealPrepPlan();
            showToast('День скопирован');
        }

        async function pasteMealPlanDay() {
            if (!mealPrepState.copiedDay || mealPrepState.copiedDay.sourceDate === mealPrepState.selectedDate) return;
            const plan = loadMealPlan();
            const existing = getDayPlanItems(mealPrepState.selectedDate, plan);
            if (existing.length) {
                const ok = await showConfirm('Заменить меню этого дня?', 'Заменить', 'Вставить меню');
                if (!ok) return;
            }
            plan.items = plan.items.filter(item => item.date !== mealPrepState.selectedDate);
            mealPrepState.copiedDay.items.forEach(item => {
                const recipe = getRecipeById(item.recipeId);
                if (recipe) resetShoppingStateForRecipe(recipe);
                plan.items.push({ ...item, id: 'mpi-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), date: mealPrepState.selectedDate });
            });
            saveMealPlan(plan);
            renderMealPrep();
            showToast('Меню вставлено');
        }

        function getMealPlanDayNutrition(dateStr, plan = loadMealPlan()) {
            return getDayPlanItems(dateStr, plan).reduce((sum, item) => {
                const recipe = getRecipeById(item.recipeId);
                if (!recipe) return sum;
                const n = getRecipePortionNutrition(recipe, hydratePortionIngredients(item.ingredients, recipe));
                const servings = Number(item.servings) || 1;
                sum.kcal += n.kcal * servings;
                sum.protein += n.protein * servings;
                sum.fat += n.fat * servings;
                sum.carbs += n.carbs * servings;
                return sum;
            }, { kcal: 0, protein: 0, fat: 0, carbs: 0 });
        }

        function mealTypeKey(mealType) {
            const map = { 'Завтрак': 'breakfast', 'Обед': 'lunch', 'Ужин': 'dinner', 'Перекус': 'snack' };
            return map[mealType] || String(mealType || 'meal').replace(/\W+/g, '-');
        }

        function getMealPlanRecipeOptions(mealType) {
            const enriched = sortRecipeItems(getEnrichedRecipes()
                .filter(item => mealType === 'Все' || item.recipe.category === mealType || !item.recipe.category), 'recommended');
            return enriched.slice(0, 120).map(item => '<option value="' + escapeAttr(item.recipe.title) + '" data-id="' + escapeAttr(String(item.recipe.id)) + '">' + Math.round(item.nutrition.kcal) + ' ккал · ' + Math.round(item.nutrition.protein) + ' г белка</option>').join('');
        }

        function resolveMealPlanRecipeId(mealType) {
            const key = mealTypeKey(mealType);
            const input = document.getElementById('add-recipe-search-' + key);
            const value = String(input?.value || '').trim().toLowerCase();
            if (!value) return null;
            const enriched = sortRecipeItems(getEnrichedRecipes()
                .filter(item => mealType === 'Все' || item.recipe.category === mealType || !item.recipe.category), 'recommended');
            const exact = enriched.find(item => String(item.recipe.title || '').trim().toLowerCase() === value);
            const partial = enriched.find(item => getRecipeSearchText(item.recipe).includes(value));
            return (exact || partial)?.recipe?.id || null;
        }

        function renderMealPrep() {
            if (mealPrepState.activeTab === 'plan') renderMealPrepPlan();
            if (mealPrepState.activeTab === 'prep') renderPrepRecipes();
            if (mealPrepState.activeTab === 'shopping') renderShoppingList();
            updateMealPrepSummary();
        }

        function openMealPicker(mealType) {
            mealPickerState.mealType = mealType;
            mealPickerState.query = '';
            const search = document.getElementById('meal-picker-search');
            if (search) search.value = '';
            setLockedLayer('meal-picker', document.getElementById('meal-picker-overlay'), true);
            renderMealPicker();
            setTimeout(() => search?.focus?.(), 120);
        }

        function closeMealPicker() {
            setLockedLayer('meal-picker', document.getElementById('meal-picker-overlay'), false);
        }

        function setMealPickerSearch(value) {
            mealPickerState.query = String(value || '').trim().toLowerCase();
            renderMealPicker();
        }

        function renderMealPicker() {
            const title = document.getElementById('meal-picker-title');
            const subtitle = document.getElementById('meal-picker-subtitle');
            const list = document.getElementById('meal-picker-list');
            if (!list) return;
            if (title) title.textContent = 'Добавить: ' + mealPickerState.mealType;
            if (subtitle) subtitle.textContent = 'Блюда отсортированы под твою цель и выбранный прием пищи.';
            const q = mealPickerState.query;
            const items = getEnrichedRecipes()
                .filter(item => item.recipe.category === mealPickerState.mealType || !item.recipe.category)
                .filter(item => !q || searchRecipes([item.recipe], q).length)
                .map(item => ({ ...item, goalScore: recipeGoalScore(item, mealPickerState.mealType) }))
                .sort((a, b) => b.goalScore - a.goalScore || b.personalScore - a.personalScore)
                .slice(0, 60);
            if (!items.length) {
                list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⌕</div><div style="font-weight:760;color:var(--text-main);margin-bottom:4px;">Ничего не найдено</div><div>Попробуй другой запрос или другой прием пищи.</div></div>';
                return;
            }
            list.innerHTML = items.map(item => {
                const idArg = escapeAttr(JSON.stringify(String(item.recipe.id)));
                return '<div class="meal-picker-item"><button type="button" style="text-align:left;background:none;box-shadow:none;padding:0;" onclick="openRecipeDetails(' + idArg + ')"><div class="meal-picker-item-title">' + escapeHTML(item.recipe.title) + '</div><div class="meal-picker-item-meta">' + Math.round(item.nutrition.kcal) + ' ккал / 100 г · Б ' + Math.round(item.nutrition.protein) + ' · Ж ' + Math.round(item.nutrition.fat) + ' · У ' + Math.round(item.nutrition.carbs) + '</div></button><button class="meal-picker-add" type="button" onclick="closeMealPicker(); openRecipePortionEditor(\'plan\', ' + idArg + ', { date: mealPrepState.selectedDate, mealType: \'' + mealPickerState.mealType + '\' });">+</button></div>';
            }).join('');
        }

        function renderMealPrepPlan() {
            const plan = loadMealPlan();
            const periodInput = document.getElementById('meal-plan-period');
            const startInput = document.getElementById('meal-plan-start');
            if (periodInput) periodInput.value = String(plan.period || 7);
            if (startInput) startInput.value = plan.startDate || toISOLocal(new Date());
            const dates = getMealPlanDates(plan);
            if (!dates.includes(mealPrepState.selectedDate)) mealPrepState.selectedDate = dates[0];
            const daysEl = document.getElementById('planner-days');
            if (daysEl) {
                daysEl.innerHTML = dates.map(dateStr => {
                    const d = parseLocalDate(dateStr);
                    const dayName = d.toLocaleDateString('ru-RU', { weekday: 'short' });
                    return '<button class="planner-day-btn ' + (dateStr === mealPrepState.selectedDate ? 'active' : '') + '" type="button" onclick="selectMealPlanDate(\'' + dateStr + '\')"><div>' + dayName + '</div><div>' + d.getDate() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '</div></button>';
                }).join('');
            }
            const view = document.getElementById('planner-day-view');
            if (!view) return;
            const dayNutrition = getMealPlanDayNutrition(mealPrepState.selectedDate, plan);
            const targetKcal = Number(userProfile.target_kcal) || 1;
            const pct = Math.min(120, Math.round((dayNutrition.kcal / targetKcal) * 100));
            const statusType = dayNutrition.kcal > targetKcal * 1.12 ? 'high' : dayNutrition.kcal < targetKcal * .72 ? 'low' : 'ok';
            const statusLabel = statusType === 'high' ? 'Перебор' : statusType === 'low' ? 'Недобор' : 'Норма';
            const warning = statusType === 'high' ? 'Можно заменить одно блюдо на более легкое.' : statusType === 'low' ? 'Добавьте еще прием пищи или заготовку.' : 'День выглядит близко к цели.';
            const canPaste = mealPrepState.copiedDay && mealPrepState.copiedDay.sourceDate !== mealPrepState.selectedDate;
            view.innerHTML =
                '<div class="planner-card"><div class="planner-card-head"><div><div class="planner-card-title">' + new Date(mealPrepState.selectedDate).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }) + '</div><div class="planner-card-kbju">' + Math.round(dayNutrition.kcal) + ' / ' + Math.round(targetKcal) + ' ккал<br>Б ' + Math.round(dayNutrition.protein) + ' · Ж ' + Math.round(dayNutrition.fat) + ' · У ' + Math.round(dayNutrition.carbs) + '</div><div class="planner-status-pill ' + statusType + '">' + statusLabel + '</div></div><div class="planner-card-actions"><button class="light-action-btn" type="button" onclick="copyMealPlanDay()">Копировать</button>' + (canPaste ? '<button class="light-action-btn paste-day-btn" type="button" onclick="pasteMealPlanDay()">Вставить</button>' : '') + '</div></div><div class="planner-progress"><div class="planner-progress-fill" style="--pct:' + Math.min(pct, 100) + '%"></div></div><div class="meal-prep-note">' + warning + '</div></div>' +
                MEAL_TYPES.map(type => renderMealSlot(type, plan)).join('');
        }

                        function autoBuildMealPlan() {
            const plan = loadMealPlan();
            const dates = getMealPlanDates(plan);
            const all = getEnrichedRecipes();
            const byMeal = {};
            MEAL_TYPES.forEach(type => {
                byMeal[type] = all
                    .filter(item => item.recipe.category === type || !item.recipe.category)
                    .map(item => ({ ...item, goalScore: recipeGoalScore(item, type) }))
                    .filter(item => item.goalScore > -50)
                    .sort((a, b) => b.goalScore - a.goalScore || b.nutrition.protein - a.nutrition.protein);
                if (!byMeal[type].length) byMeal[type] = all.map(item => ({ ...item, goalScore: recipeGoalScore(item, type) })).sort((a, b) => b.goalScore - a.goalScore);
            });
            plan.items = plan.items.filter(item => !dates.includes(item.date));
            dates.forEach((dateStr, dayIndex) => {
                MEAL_TYPES.forEach((type, mealIndex) => {
                    const pool = byMeal[type] || [];
                    const pick = pool[(dayIndex + mealIndex * 2) % Math.max(pool.length, 1)];
                    if (pick) plan.items.push({ id: 'mpi-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), recipeId: String(pick.recipe.id), date: dateStr, mealType: type, servings: 1 });
                });
            });
            saveShoppingState({});
            saveMealPlan(plan);
            renderMealPrep();
            showToast('Меню собрано под твою цель');
        }

                                        function buildShoppingList() {
            const plan = loadMealPlan();
            const state = loadShoppingState();
            const map = new Map();
            plan.items.forEach(item => {
                const recipe = getRecipeById(item.recipeId);
                if (!recipe) return;
                const multiplier = Number(item.servings) || 1;
                hydratePortionIngredients(item.ingredients, recipe).forEach(ing => {
                    const name = ing.products?.name || 'Продукт';
                    const unitData = normalizeIngredientUnit(Number(ing.weight) || 0, ing.unit || ing.products?.unit || '', name);
                    const key = name.toLowerCase() + '|' + unitData.unit;
                    const current = map.get(key) || { id: key, name, amount: 0, unit: unitData.unit, category: getIngredientCategory(name), checked: false };
                    current.amount += unitData.amount * multiplier;
                    map.set(key, current);
                });
            });
            (plan.customItems || []).forEach(item => map.set('custom|' + item.id, item));
            return Array.from(map.values()).map(item => {
                const saved = state[item.id] || {};
                return { ...item, amount: saved.amount ?? item.amount, checked: Boolean(saved.checked), deleted: Boolean(saved.deleted) };
            }).filter(item => !item.deleted && Number(item.amount) > 0)
              .sort((a, b) => a.category.localeCompare(b.category, 'ru') || a.name.localeCompare(b.name, 'ru'));
        }

        function renderShoppingList() {
            const view = document.getElementById('shopping-list-view');
            if (!view) return;
            const items = buildShoppingList();
            if (!items.length) {
                view.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🛒</div><div style="font-weight:800;color:var(--text-main);margin-bottom:6px;">Список пока пуст</div><div>Добавьте блюда в план меню — продукты появятся автоматически.</div></div>';
                return;
            }
            const grouped = items.reduce((acc, item) => {
                (acc[item.category] ||= []).push(item);
                return acc;
            }, {});
            view.innerHTML = Object.keys(grouped).map(category => '<div class="shopping-group"><h4 class="shopping-group-title">' + escapeHTML(category) + '</h4><div class="shopping-card">' + grouped[category].map(item => '<div class="shopping-item ' + (item.checked ? 'checked' : '') + '"><input type="checkbox" ' + (item.checked ? 'checked' : '') + ' onchange="toggleShoppingItem(\'' + escapeAttr(item.id) + '\', this.checked)"><div><div class="shopping-item-name">' + escapeHTML(item.name) + '</div><div class="meal-plan-item-meta">' + escapeHTML(item.category) + '</div></div><input class="shopping-amount-input" value="' + escapeAttr(formatIngredientAmount(item.amount, item.unit)) + '" onchange="editShoppingItemAmount(\'' + escapeAttr(item.id) + '\', this.value)"><button class="mini-icon-btn" type="button" onclick="deleteShoppingItem(\'' + escapeAttr(item.id) + '\')">×</button></div>').join('') + '</div></div>').join('');
        }

                function toggleShoppingItem(id, checked) {
            const state = loadShoppingState();
            state[id] = { ...(state[id] || {}), checked };
            saveShoppingState(state);
            renderShoppingList();
        }

        function editShoppingItemAmount(id, value) {
            const item = buildShoppingList().find(x => x.id === id);
            const parsed = parseAmountInput(value, item?.unit || 'г');
            const state = loadShoppingState();
            state[id] = { ...(state[id] || {}), amount: parsed.amount };
            saveShoppingState(state);
            renderShoppingList();
        }

        function deleteShoppingItem(id) {
            const plan = loadMealPlan();
            if (id.startsWith('custom|')) {
                const customId = id.replace('custom|', '');
                plan.customItems = plan.customItems.filter(item => item.id !== customId && item.id !== id);
                saveMealPlan(plan);
            } else {
                const state = loadShoppingState();
                state[id] = { ...(state[id] || {}), deleted: true };
                saveShoppingState(state);
            }
            renderShoppingList();
        }

        function addCustomShoppingItem() {
            const nameEl = document.getElementById('custom-shopping-name');
            const amountEl = document.getElementById('custom-shopping-amount');
            const unitEl = document.getElementById('custom-shopping-unit');
            const name = nameEl?.value.trim();
            if (!name) return showToast('Введите продукт');
            const unit = unitEl?.value || 'г';
            const amount = parseFloat(String(amountEl?.value || '1').replace(',', '.')) || 1;
            const plan = loadMealPlan();
            plan.customItems.push({ id: 'custom-' + Date.now(), name, amount, unit, category: getIngredientCategory(name), checked: false });
            saveMealPlan(plan);
            if (nameEl) nameEl.value = '';
            if (amountEl) amountEl.value = '';
            if (unitEl) unitEl.value = 'г';
            renderShoppingList();
            updateMealPrepSummary();
            showToast('Продукт добавлен');
        }

        async function clearShoppingList() {
            const items = buildShoppingList();
            if (!items.length) return showToast('Список уже пуст');
            const ok = await showConfirm('Удалить весь список покупок?', 'Удалить', 'Очистить список');
            if (!ok) return;
            const plan = loadMealPlan();
            const state = loadShoppingState();
            items.forEach(item => { state[item.id] = { ...(state[item.id] || {}), deleted: true }; });
            plan.customItems = [];
            saveMealPlan(plan);
            saveShoppingState(state);
            renderShoppingList();
            updateMealPrepSummary();
            showToast('Список очищен');
        }

        function getShoppingListText() {
            const items = buildShoppingList().filter(item => Number(item.amount) > 0);
            const grouped = items.reduce((acc, item) => {
                (acc[item.category] ||= []).push(item);
                return acc;
            }, {});
            return 'Список покупок Blueprint Nutrition\n\n' + Object.keys(grouped).map(category => category.toUpperCase() + '\n' + grouped[category].map(item => '- ' + item.name + ' — ' + formatIngredientAmount(item.amount, item.unit)).join('\n')).join('\n\n');
        }

        async function copyShoppingList() {
            const text = getShoppingListText();
            try {
                if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
                await navigator.clipboard.writeText(text);
                showToast('Список скопирован');
            } catch (e) {
                console.warn('Не удалось скопировать список:', e);
                showToast('Не удалось скопировать список');
            }
        }

        function sendShoppingListToTelegram() {
            copyShoppingList();
            showToast('Список скопирован. Его можно отправить в Telegram.');
        }

                function updateMealPrepSummary() {
            const plan = loadMealPlan();
            const shoppingCount = buildShoppingList().filter(item => Number(item.amount) > 0).length;
            const daysEl = document.getElementById('prep-summary-days');
            const mealsEl = document.getElementById('prep-summary-meals');
            const itemsEl = document.getElementById('prep-summary-items');
            if (daysEl) daysEl.textContent = String(plan.period || 7);
            if (mealsEl) mealsEl.textContent = String((plan.items || []).length);
            if (itemsEl) itemsEl.textContent = String(shoppingCount);
        }


        document.addEventListener('click', function(event) {
            const addButton = event.target.closest('.recipe-add-btn');
            if (!addButton) return;
            event.preventDefault();
            event.stopPropagation();
            openRecipePortionEditor('diary', addButton.dataset.recipeId);
        });
async function updateHistoryUI() {
            const hList = document.getElementById('history-list');
            let startOfDay = new Date(currentDate); startOfDay.setHours(0,0,0,0); let endOfDay = new Date(currentDate); endOfDay.setHours(23,59,59,999);
            const data = await callServer('getMeals', { startDate: startOfDay.toISOString(), endDate: endOfDay.toISOString() });
            if (!data || data.length === 0) { hList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✓</div><div style="font-weight:800;color:var(--text-main);margin-bottom:6px;">Дневник чист</div><div>Добавьте первый прием пищи из рациона.</div></div>'; return; }
            let html = '';
            ['Завтрак', 'Обед', 'Ужин', 'Перекус'].forEach(type => {
                const typeMeals = data.filter(m => (m.meal_type || 'Перекус') === type); if (typeMeals.length === 0) return;
                const typeKcal = typeMeals.reduce((s, m) => s + (Number(m.kcal) || 0), 0); const typeProtein = typeMeals.reduce((s, m) => s + (Number(m.protein) || 0), 0); const typeFat = typeMeals.reduce((s, m) => s + (Number(m.fat) || 0), 0); const typeCarbs = typeMeals.reduce((s, m) => s + (Number(m.carbs) || 0), 0);
                const mealPct = Math.min(100, Math.round((typeKcal / (Number(userProfile.target_kcal) || 1)) * 100)); html += `<div class="meal-group"><div class="meal-group-header" onclick="toggleMealGroup(this)"><div class="meal-name">${type} <span class="chevron">▼</span></div><div class="meal-stats"><div class="meal-kcal">${Math.round(typeKcal)} ккал</div><div class="meal-macros">Б: ${Math.round(typeProtein)}г &nbsp; Ж: ${Math.round(typeFat)}г &nbsp; У: ${Math.round(typeCarbs)}г</div></div></div><div class="meal-progress"><div class="meal-progress-fill" style="--meal-pct:${mealPct}%"></div></div><div class="meal-progress-caption">${mealPct}% от дневной цели</div><div class="meal-group-content">` + typeMeals.map(m => `<div class="history-item"><div><div style="font-weight:800; font-size: 15px; color: var(--text-main);">${escapeHTML(m.recipes?.title || 'Прием пищи')}</div><div style="font-size:12px; color:var(--text-muted); margin-top: 4px;">${new Date(m.created_at).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'})}</div></div><div style="display:flex; align-items:center"><span style="color:#6f9b86; font-weight:800; font-size: 15px;">+${Math.round(Number(m.kcal) || 0)}</span><button class="del-btn" onclick="deleteOneMeal(${Number(m.id)})">×</button></div></div>`).join('') + '</div></div>';
            });
            hList.innerHTML = html;
        }

        function toggleMealGroup(el) { const content = el.parentElement.querySelector('.meal-group-content'), chevron = el.querySelector('.chevron'); if (!content) return; const collapsed = content.classList.toggle('collapsed'); if(chevron) chevron.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)'; }

                                function openRecipeDetails(id) {
            const r = recipesData.find(x => String(x.id) === String(id)); if(!r) return;
            const nutrition = getRecipeNutrition(r);
            const meta = getRecipeDietMeta(r, nutrition);
            const time = getRecipeTime(r);
            const storage = getPrepStorage(r);
            const img = safeImageUrl(r.image_url);
            document.getElementById('detail-img').src = img;
            document.getElementById('detail-title').innerText = r.title || '';
            document.getElementById('detail-badges').innerHTML = getRecipeDetailTags({ recipe: r, nutrition, meta, time }).slice(0, 2).map(tag => '<span class="recipe-badge ' + tag.className + '">' + escapeHTML(tag.label) + '</span>').join('');
            let ingHtml = '';
            getRecipeWorkingIngredients(r).forEach(i => {
                if(i.products) {
                    const unitData = normalizeIngredientUnit(Number(i.weight) || 0, i.unit || i.products?.unit || 'g', i.products.name);
                    ingHtml += '<div class="ingredient-item"><span>' + escapeHTML(i.products.name) + '</span><span style="color:var(--text-muted); font-weight:bold;">' + escapeHTML(formatIngredientAmount(unitData.amount, unitData.unit)) + '</span></div>';
                }
            });
            document.getElementById('detail-macros').innerHTML =
                '<div class="detail-macro-summary"><span>На 100 г:</span> ' + Math.round(nutrition.kcal) + ' ккал · Б ' + Math.round(nutrition.protein) + ' г · Ж ' + Math.round(nutrition.fat) + ' г · У ' + Math.round(nutrition.carbs) + ' г</div>' +
                '<div class="detail-time-pill">' + time + ' мин</div>';
            const recommended = getRecommendedRecipes({ recipes: [r], userGoal: userProfile.goal_type, mealType: r.mealType, currentMacros: stats })[0];
            document.getElementById('detail-fit-note').innerText = (recommended?.reason || getRecipeFitNote(meta, nutrition)) + ' Хранение: ' + storage.shelfLife + (storage.canFreeze ? '. Можно замораживать.' : '. Лучше хранить охлажденным.');
            document.getElementById('detail-ingredients').innerHTML = ingHtml || '<p style="color:var(--text-muted);font-size:14px;">Ингредиенты не указаны</p>';
            document.getElementById('detail-instructions').innerText = r.instructions || 'Инструкция по приготовлению пока не добавлена.';
            document.getElementById('detail-swaps').innerHTML = buildIngredientSwaps(r).map(s => '<div class="detail-swap">' + escapeHTML(s) + '</div>').join('');
            const similar = getSimilarRecipes(r.id, meta);
            document.getElementById('detail-similar').innerHTML = similar.length ? similar.map(item => '<button class="similar-recipe" type="button" onclick="openRecipeDetails(' + escapeAttr(JSON.stringify(String(item.recipe.id))) + ')"><div>' + escapeHTML(item.recipe.title) + '</div><span>' + Math.round(item.nutrition.kcal) + ' ккал</span></button>').join('') : '<div class="detail-note">Похожие рецепты появятся, когда в базе будет больше блюд с похожим КБЖУ.</div>';
            const cta = document.querySelector('.detail-sticky-cta');
            if (cta) {
                cta.innerHTML = '<button class="detail-add-btn" id="detail-add-btn" type="button">Настроить порцию</button>';
            }
            document.getElementById('detail-add-btn').onclick = () => { closeRecipeDetails(); openRecipePortionEditor('diary', r.id); };
            setDisplayedLayer('recipe-details', document.getElementById('recipe-details-modal'), true);
        }

        function closeRecipeDetails() { setDisplayedLayer('recipe-details', document.getElementById('recipe-details-modal'), false); }
        function openMealModal(rid, k, p, f, c, ingredients = [], mealType = null) {
            console.log('openMealModal', { rid, k, p, f, c, mealType });
            pendingMeal = { rid, k, p, f, c, ingredients: snapshotPortionIngredients(ingredients) };
            if (mealType) return confirmMealAdd(mealType);
            setDisplayedLayer('meal', document.getElementById('meal-modal'), true);
        }
        function closeMealModal() { setDisplayedLayer('meal', document.getElementById('meal-modal'), false); pendingMeal = null; }

        async function saveRecipeDiarySnapshot(meal, mealType) {
            if (!supabaseClient || !Array.isArray(meal?.ingredients) || !meal.ingredients.length) return;
            const recipe = getRecipeById(meal.rid);
            const { data: entry, error: entryError } = await supabaseClient
                .from('diary_entries')
                .insert({
                    entry_date: toISOLocal(currentDate),
                    meal_type: RECIPE_MEAL_KEYS[mealType] || 'snack',
                    recipe_id: meal.rid,
                    recipe_title: recipe?.title || '',
                    total_kcal: Number(meal.k) || 0,
                    total_protein: Number(meal.p) || 0,
                    total_fat: Number(meal.f) || 0,
                    total_carbs: Number(meal.c) || 0
                })
                .select('id')
                .single();
            if (entryError) throw entryError;
            const rows = meal.ingredients.map((ing, sortOrder) => {
                const grams = Number(ing.grams) || 0;
                return {
                    diary_entry_id: entry.id,
                    ingredient_id: ing.ingredientId || null,
                    ingredient_name: ing.name || 'Продукт',
                    grams,
                    kcal: (Number(ing.kcalPer100) || 0) * grams / 100,
                    protein: (Number(ing.proteinPer100) || 0) * grams / 100,
                    fat: (Number(ing.fatPer100) || 0) * grams / 100,
                    carbs: (Number(ing.carbsPer100) || 0) * grams / 100,
                    sort_order: sortOrder
                };
            }).filter(row => row.grams > 0);
            const { error: ingredientsError } = await supabaseClient.from('diary_entry_ingredients').insert(rows);
            if (ingredientsError) throw ingredientsError;
        }

        async function confirmMealAdd(mealType) {
            if (isAddingMeal) return;
            if (!pendingMeal) { console.warn('confirmMealAdd без выбранного рецепта'); return; }
            isAddingMeal = true;
            const createdAt = selectedDateTimeISO();
            try {
                console.log('addMeal request', mealType, { ...pendingMeal, createdAt });
                if (window.DEBUG_ADD_MEAL_ALERT) alert('addMeal request: ' + mealType);
                await callServer('addMeal', { recipe_id: pendingMeal.rid, kcal: pendingMeal.k, protein: pendingMeal.p, fat: pendingMeal.f, carbs: pendingMeal.c, meal_type: mealType, created_at: createdAt, ingredients: pendingMeal.ingredients });
                await saveRecipeDiarySnapshot(pendingMeal, mealType).catch(error => console.warn('Не удалось сохранить состав рецепта в diary_entries:', error));
                closeMealModal(); await refreshAllData(); document.getElementById('history-list')?.classList.add('success-flash'); setTimeout(() => document.getElementById('history-list')?.classList.remove('success-flash'), 700);
            } catch (e) {
                console.error('Ошибка добавления приема пищи:', e);
                showToast('Не удалось добавить прием пищи: ' + e.message);
            } finally {
                isAddingMeal = false;
            }
        }
        async function clearSelectedDay() { if (confirm('Очистить дневник за выбранный день?')) { let startOfDay = new Date(currentDate); startOfDay.setHours(0,0,0,0); let endOfDay = new Date(currentDate); endOfDay.setHours(23,59,59,999); await callServer('clearDay', { startDate: startOfDay.toISOString(), endDate: endOfDay.toISOString() }); await refreshAllData(); } }
        async function deleteOneMeal(id) { if (confirm('Удалить этот прием пищи?')) { await callServer('deleteMeal', { id }); await refreshAllData(); } }

        function toggleEdit(show) {
            document.getElementById('edit-form').style.display = show ? 'block' : 'none';
            document.querySelectorAll('.coach-hero, .coach-feedback-grid, .intake-card, .nutritions-card, .recipe-section-control, .recipes-open-row, #recipe-list, .meal-prep-preview, .history-header, #history-list, .top-nav').forEach(el => { el.style.display = show ? 'none' : (el.classList.contains('coach-feedback-grid')) ? 'grid' : (el.id === 'menu-tabs' || el.id === 'recipe-list') ? 'flex' : 'block'; });
            if(!show) document.querySelector('.top-nav').style.display = 'flex';
            if (show) {
                setGender(currentGender);
                document.getElementById('inp-name').value = userProfile.full_name || '';
                document.getElementById('inp-age').value = userProfile.age || 30;
                document.getElementById('inp-height').value = userProfile.height || 180;
                document.getElementById('inp-weight').value = userProfile.weight || 0;
                document.getElementById('inp-activity').value = userProfile.activity_level || 'moderate';
                document.getElementById('inp-workouts').value = userProfile.workouts_per_week ?? 3;
                document.getElementById('inp-goal').value = userProfile.goal_type || 'maintain';
                document.getElementById('inp-food-preferences').value = userProfile.food_preferences || '';
                document.getElementById('inp-food-exclusions').value = userProfile.food_exclusions || '';
                document.getElementById('inp-water').value = userProfile.target_water || 2000;
                document.getElementById('inp-kcal').value = userProfile.target_kcal || 0;
                document.getElementById('inp-protein').value = userProfile.target_protein || 0;
                document.getElementById('inp-fat').value = userProfile.target_fat || 0;
                document.getElementById('inp-carbs').value = userProfile.target_carbs || 0;
                bindKbjuAutoCalculation();
                renderKbjuRecommendation();
            }
        }
        function setGender(g) { currentGender = g; localStorage.setItem('user_gender', g); document.getElementById('gender-m').classList.toggle('active', g === 'M'); document.getElementById('gender-f').classList.toggle('active', g === 'F'); updateCoachAvatar(); if (document.getElementById('edit-form')?.style.display === 'block') renderKbjuRecommendation(); }
        async function updateProfileData() {
            const extras = getProfileFormValues();
            saveProfileExtras(extras);
            const up = { full_name: extras.full_name, weight: extras.weight, target_water: extras.target_water, target_kcal: parseInt(document.getElementById('inp-kcal').value) || 0, target_protein: parseInt(document.getElementById('inp-protein').value) || 0, target_fat: parseInt(document.getElementById('inp-fat').value) || 0, target_carbs: parseInt(document.getElementById('inp-carbs').value) || 0 };
            try {
                setLocalWaterTarget(up.target_water);
                const { data } = await saveProfile(up);
                userProfile = { ...userProfile, ...extras, ...up, ...(data || {}) };
                currentDietFilter = getDefaultDietFilterForGoal();
                refreshUI(); toggleEdit(false); renderRecipes(true); buildWeeklyChart();
            } catch (e) {
                console.error('Ошибка сохранения профиля:', e);
                showToast('Не удалось сохранить профиль: ' + e.message);
            }
        }

        init();
