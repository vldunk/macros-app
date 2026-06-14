        window.addEventListener('error', function(e) {
            console.error('Ошибка:', e.message, e.error || '');
            const loading = document.getElementById('loading-screen');
            if (loading && loading.style.display !== 'none' && !loading.classList.contains('is-hidden')) {
                let initState = null;
                try { initState = appInitState; } catch (_) {}
                const elapsed = initState?.startedAt ? Date.now() - initState.startedAt : 0;
                const loadingTimeout = window.Telegram?.WebApp?.initData ? 22000 : 15000;
                if (initState?.isAppInitializing && elapsed < loadingTimeout) {
                    console.warn('[app init] runtime error during loading; waiting for init timeout before showing loading error');
                    return;
                }
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
        let stats = { kcal: 0, protein: 0, fat: 0, carbs: 0 }, dailyWater = 0, recipesData = [], currentTab = 'Все', currentMealFilter = 'Завтрак', currentDietFilter = 'Все', recipeSearchQuery = '', recipeSortMode = 'recommended', recipeViewMode = 'grid', screenMealFilter = 'Все', screenDietFilter = 'Все', currentDiaryMealType = 'Завтрак', diaryMealSourceTab = 'library', diaryMealActiveTab = 'products', diaryMealActiveFilter = 'Недавние', pendingMeal = null, barcodeProductDraft = null, barcodeCameraStream = null, barcodeScanFrameId = 0, barcodeZxingReader = null, barcodeZxingControls = null, isBarcodeScanning = false, isBarcodeProcessing = false, recipePortionDraft = null, recipeDetailPortionDraft = null, myRecipeReturnToDiaryAfterSave = false, myRecipeCreateStep = 1, myRecipeCookedWeightTouched = false, isAddingMeal = false;
        let weeklyDataMap = {}, weeklyWaterMap = {}, currentDate = new Date(), calendarViewDate = new Date(), activeDaysSet = new Set(), currentGender = localStorage.getItem('user_gender') || 'M';
        const LOADING_MIN_MS = 700;
        const LOADING_SLOW_MS = 7000;
        const LOADING_TIMEOUT_MS = isTelegramMiniApp ? 22000 : 15000;
        const SERVER_REQUEST_TIMEOUT_MS = isTelegramMiniApp ? 18000 : 12000;
        const INIT_REQUIRED_DATA_TIMEOUT_MS = isTelegramMiniApp ? 8000 : 6000;
        const INIT_OPTIONAL_DATA_TIMEOUT_MS = isTelegramMiniApp ? 7000 : 5000;
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
            timeoutId: null,
            slowTimeoutId: null
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

        function manualMealsStorageKey() {
            return 'manual_meals_' + appUserId;
        }

        function loadManualMeals() {
            try { return JSON.parse(localStorage.getItem(manualMealsStorageKey())) || []; } catch (e) { return []; }
        }

        function saveManualMeals(meals) {
            localStorage.setItem(manualMealsStorageKey(), JSON.stringify(Array.isArray(meals) ? meals : []));
        }

        function manualProductsStorageKey() {
            return 'manualProducts_' + appUserId;
        }

        function loadManualProducts() {
            try { return JSON.parse(localStorage.getItem(manualProductsStorageKey())) || []; } catch (e) { return []; }
        }

        function saveManualProducts(products) {
            localStorage.setItem(manualProductsStorageKey(), JSON.stringify(Array.isArray(products) ? products : []));
        }

        function normalizeManualProductName(name) {
            return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
        }

        function normalizeManualProductNumber(value) {
            const number = Number(value);
            return Number.isFinite(number) ? Math.max(0, number) : 0;
        }

        function isValidManualProduct(product) {
            return Boolean(String(product?.name || '').trim()) &&
                ['caloriesPer100','proteinPer100','fatPer100','carbsPer100'].every(key => {
                    const value = Number(product?.[key]);
                    return Number.isFinite(value) && value >= 0;
                });
        }

        function buildManualProductFromMeal(name, totals, options = {}) {
            const product = {
                name: String(name || '').trim(),
                barcode: normalizeBarcode(options.barcode || ''),
                caloriesPer100: normalizeManualProductNumber(totals.kcal100),
                proteinPer100: normalizeManualProductNumber(totals.protein100),
                fatPer100: normalizeManualProductNumber(totals.fat100),
                carbsPer100: normalizeManualProductNumber(totals.carbs100),
                type: 'manual-product'
            };
            return isValidManualProduct(product) ? product : null;
        }

        function sameManualProduct(product, candidate) {
            return normalizeManualProductName(product.name) === normalizeManualProductName(candidate.name) &&
                Number(product.caloriesPer100) === Number(candidate.caloriesPer100) &&
                Number(product.proteinPer100) === Number(candidate.proteinPer100) &&
                Number(product.fatPer100) === Number(candidate.fatPer100) &&
                Number(product.carbsPer100) === Number(candidate.carbsPer100);
        }

        function upsertManualProduct(name, totals, options = {}) {
            const candidate = buildManualProductFromMeal(name, totals, options);
            if (!candidate) return null;
            const now = new Date().toISOString();
            const products = loadManualProducts().filter(isValidManualProduct);
            const existingIndex = candidate.barcode
                ? products.findIndex(product => String(product.barcode || '') === String(candidate.barcode))
                : products.findIndex(product => sameManualProduct(product, candidate));
            if (existingIndex >= 0) {
                products[existingIndex] = { ...products[existingIndex], ...candidate, updatedAt: now };
                saveManualProducts(products);
                return products[existingIndex];
            }
            const product = {
                id: 'manual_product_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                ...candidate,
                createdAt: now,
                updatedAt: now
            };
            products.unshift(product);
            saveManualProducts(products);
            return product;
        }

        function upsertBarcodeManualProduct(product) {
            if (!product?.barcode) return null;
            const now = new Date().toISOString();
            const products = loadManualProducts().filter(isValidManualProduct);
            const existingIndex = products.findIndex(item => String(item.barcode || '') === String(product.barcode));
            const savedProduct = {
                name: product.name,
                brand: product.brand || '',
                barcode: product.barcode,
                caloriesPer100: normalizeManualProductNumber(product.kcal100),
                proteinPer100: normalizeManualProductNumber(product.protein100),
                fatPer100: normalizeManualProductNumber(product.fat100),
                carbsPer100: normalizeManualProductNumber(product.carbs100),
                type: 'manual-product',
                source: 'open-food-facts',
                updatedAt: now
            };
            if (!isValidManualProduct(savedProduct)) return null;
            if (existingIndex >= 0) {
                products[existingIndex] = { ...products[existingIndex], ...savedProduct };
                saveManualProducts(products);
                return products[existingIndex];
            }
            const created = {
                id: 'barcode_product_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                ...savedProduct,
                createdAt: now
            };
            products.unshift(created);
            saveManualProducts(products);
            return created;
        }

        function findManualProductByBarcode(barcode) {
            const normalized = normalizeBarcode(barcode);
            if (!normalized) return null;
            return loadManualProducts()
                .filter(isValidManualProduct)
                .find(product => normalizeBarcode(product.barcode || '') === normalized) || null;
        }

        function mapManualProductToBarcodeProduct(product, barcode) {
            if (!product || !isValidManualProduct(product)) return null;
            return {
                barcode: normalizeBarcode(product.barcode || barcode),
                name: product.name,
                brand: product.brand || '',
                kcal100: Number(product.caloriesPer100) || 0,
                protein100: Number(product.proteinPer100) || 0,
                fat100: Number(product.fatPer100) || 0,
                carbs100: Number(product.carbsPer100) || 0,
                source: 'manual',
                sourceLabel: 'Мой продукт',
                hasKbju: true
            };
        }

        function getSortedManualProducts() {
            return loadManualProducts()
                .filter(isValidManualProduct)
                .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
        }

        function formatManualProductMacros(product) {
            return Math.round(Number(product.caloriesPer100) || 0) + ' ккал / 100 г · Б ' +
                (Number(product.proteinPer100) || 0).toFixed(1) + ' · Ж ' +
                (Number(product.fatPer100) || 0).toFixed(1) + ' · У ' +
                (Number(product.carbsPer100) || 0).toFixed(1);
        }

        function renderManualProductCard(product, options = {}) {
            const productId = escapeAttr(JSON.stringify(String(product.id || '')));
            const removeButton = options.withDelete
                ? '<button class="manual-product-delete" type="button" aria-label="Удалить продукт" onclick="deleteManualProduct(event, ' + productId + ')">×</button>'
                : '';
            return '<div class="manual-product-card' + (options.compact ? ' compact' : '') + '" data-product-id="' + escapeAttr(String(product.id || '')) + '">' +
                '<button class="manual-product-select" type="button" onclick="selectManualProduct(' + productId + ')"><span class="manual-product-copy"><b>' + escapeHTML(product.name) + '</b><span>' + escapeHTML(formatManualProductMacros(product)) + '</span></span></button>' +
                removeButton +
                '</div>';
        }

        function getManualMealsInRange(payload = {}) {
            const start = payload.startDate ? new Date(payload.startDate).getTime() : -Infinity;
            const end = payload.endDate ? new Date(payload.endDate).getTime() : Infinity;
            return loadManualMeals().filter(meal => {
                const time = new Date(meal.created_at).getTime();
                return time >= start && time <= end;
            });
        }

        function addManualLocalMeal(payload = {}) {
            const meal = {
                id: 'manual_' + Date.now(),
                type: payload.type || 'manual',
                recipe_id: null,
                recipeId: payload.recipeId || null,
                name: payload.name || payload.recipe_title || 'Свой продукт',
                grams: Number(payload.grams) || 0,
                inputMode: payload.inputMode || 'per100',
                calories_per_100: Number(payload.calories_per_100) || 0,
                protein_per_100: Number(payload.protein_per_100) || 0,
                fat_per_100: Number(payload.fat_per_100) || 0,
                carbs_per_100: Number(payload.carbs_per_100) || 0,
                recipes: { title: payload.name || payload.recipe_title || 'Свой продукт' },
                mealType: payload.mealType || payload.meal_type || 'Перекус',
                calories: Number(payload.calories ?? payload.kcal) || 0,
                kcal: Number(payload.kcal) || 0,
                protein: Number(payload.protein) || 0,
                fat: Number(payload.fat) || 0,
                carbs: Number(payload.carbs) || 0,
                meal_type: payload.meal_type || 'Перекус',
                createdAt: payload.createdAt || payload.created_at || selectedDateTimeISO(),
                created_at: payload.created_at || selectedDateTimeISO(),
                ingredients: Array.isArray(payload.ingredients) ? payload.ingredients : []
            };
            const meals = loadManualMeals();
            meals.push(meal);
            saveManualMeals(meals);
            return meal;
        }

        function deleteManualLocalMeal(id) {
            const before = loadManualMeals();
            const after = before.filter(meal => String(meal.id) !== String(id));
            saveManualMeals(after);
            return before.length !== after.length;
        }

        function clearManualMeals(payload = {}) {
            const remove = new Set(getManualMealsInRange(payload).map(meal => String(meal.id)));
            saveManualMeals(loadManualMeals().filter(meal => !remove.has(String(meal.id))));
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
            const isQuickEntry = payload.type === 'quick-entry';
            const isManual = isQuickEntry || payload.type === 'manual' || payload.manual === true;
            const meal = {
                id: Date.now(),
                type: isQuickEntry ? 'quick-entry' : isManual ? 'manual' : 'recipe',
                recipe_id: isManual ? null : payload.recipe_id,
                name: isManual ? (payload.name || payload.recipe_title || 'Свой продукт') : '',
                grams: Number(payload.grams) || 0,
                calories_per_100: Number(payload.calories_per_100) || 0,
                protein_per_100: Number(payload.protein_per_100) || 0,
                fat_per_100: Number(payload.fat_per_100) || 0,
                carbs_per_100: Number(payload.carbs_per_100) || 0,
                recipes: { title: isManual ? (payload.name || payload.recipe_title || 'Свой продукт') : (recipe?.title || 'Прием пищи') },
                mealType: payload.mealType || payload.meal_type || 'Перекус',
                calories: Number(payload.calories ?? payload.kcal) || 0,
                kcal: Number(payload.kcal) || 0,
                protein: Number(payload.protein) || 0,
                fat: Number(payload.fat) || 0,
                carbs: Number(payload.carbs) || 0,
                meal_type: payload.meal_type || 'Перекус',
                createdAt: payload.createdAt || payload.created_at || selectedDateTimeISO(),
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

        async function callServer(action, payload = {}, options = {}) {
            if (action === 'deleteMeal' && String(payload.id || '').startsWith('manual_')) return deleteManualLocalMeal(payload.id);
            if (!isTelegramMiniApp) {
                if (action === 'getProfile') return { ...DEMO_PROFILE, ...loadProfileExtras() };
                if (action === 'updateProfile') {
                    saveProfileExtras(payload);
                    return { ...DEMO_PROFILE, ...loadProfileExtras(), ...payload };
                }
                if (action === 'getMeals') return [...getDemoMealsInRange(payload), ...getManualMealsInRange(payload)];
                if (action === 'addMeal') return addDemoMeal(payload);
                if (action === 'clearDay') { clearManualMeals(payload); return clearDemoMeals(payload); }
                if (action === 'deleteMeal') return deleteDemoMeal(payload.id);
                return null;
            }
            if (!tg?.initData) throw new Error('Откройте приложение внутри Telegram, чтобы подтвердить пользователя.');
            const controller = new AbortController();
            const requestTimeoutMs = Number(options.timeoutMs) || SERVER_REQUEST_TIMEOUT_MS;
            const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
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
                if (action === 'getMeals') return [...(Array.isArray(result.data) ? result.data : []), ...getManualMealsInRange(payload)];
                if (action === 'clearDay') clearManualMeals(payload);
                return result.data;
            } catch (e) {
                if (e.name === 'AbortError') throw new Error('Edge Function не отвечает больше ' + Math.round(requestTimeoutMs / 1000) + ' секунд');
                throw e;
            } finally {
                clearTimeout(timeout);
            }
        }
        async function loadProfile() {
            const extras = loadProfileExtras();
            try {
                const p = await callServer('getProfile', {}, { timeoutMs: INIT_REQUIRED_DATA_TIMEOUT_MS });
                if (p) userProfile = { ...userProfile, ...p, ...extras };
                else userProfile = { ...userProfile, ...extras };
                console.log('[app init] profile loaded');
            } catch (error) {
                console.warn('[app init] profile skipped, using defaults/local extras:', error);
                userProfile = { ...userProfile, ...extras };
            }
            currentDietFilter = getDefaultDietFilterForGoal();
            syncRecipeFilterButtons();
        }

        async function saveProfile(updates) {
            setLocalWaterTarget(updates.target_water);
            const data = await callServer('updateProfile', updates);
            return { data, error: null };
        }
        function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

        function withStartupTimeout(promise, ms, label) {
            let timeoutId;
            const timeout = new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error(label + ' timed out after ' + Math.round(ms / 1000) + ' seconds')), ms);
            });
            return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
        }

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
            if (appInitState.slowTimeoutId) clearTimeout(appInitState.slowTimeoutId);
            appInitState.timeoutId = null;
            appInitState.slowTimeoutId = null;
        }

        function setLoadingStep(text, progress) {
            const status = document.getElementById('loading-status');
            const fill = document.getElementById('loading-progress-fill');
            if (status) status.textContent = text;
            if (fill) fill.style.width = Math.max(8, Math.min(progress, 100)) + '%';
        }

        function showLoadingSlow(runId) {
            if (runId !== appInitRunId || !appInitState.isAppInitializing) return;
            const loading = document.getElementById('loading-screen');
            if (loading?.classList.contains('has-error')) return;
            loading?.classList.add('is-slow');
            setLoadingStep('Загружаем данные чуть дольше обычного...', 76);
            console.warn('[app init] slow loading state reached');
        }

        function showLoadingError(message) {
            const loading = document.getElementById('loading-screen');
            const error = document.getElementById('loading-error');
            const status = document.getElementById('loading-status');
            if (appInitState.timeoutId) clearTimeout(appInitState.timeoutId);
            if (appInitState.slowTimeoutId) clearTimeout(appInitState.slowTimeoutId);
            appInitState.timeoutId = null;
            appInitState.slowTimeoutId = null;
            appInitState.isAppInitializing = false;
            console.error('[app init] loading error:', message || 'unknown error');
            if (status) status.textContent = 'Не удалось загрузить данные';
            if (error) error.textContent = message || 'Проверь подключение и попробуй снова.';
            if (loading) {
                loading.classList.remove('is-slow');
                loading.classList.add('has-error');
            }
        }

        async function showMainAppWhenReady(runId) {
            const app = document.getElementById('app-content');
            const loading = document.getElementById('loading-screen');
            const elapsed = Date.now() - appInitState.startedAt;
            if (elapsed < LOADING_MIN_MS) await wait(LOADING_MIN_MS - elapsed);
            if (runId !== appInitRunId) return;
            if (appInitState.timeoutId) clearTimeout(appInitState.timeoutId);
            if (appInitState.slowTimeoutId) clearTimeout(appInitState.slowTimeoutId);
            appInitState.timeoutId = null;
            appInitState.slowTimeoutId = null;
            appInitState.isAppInitializing = false;
            setLoadingStep('Готово', 100);
            if (app) {
                app.style.display = 'block';
                requestAnimationFrame(() => app.classList.add('app-ready'));
            }
            if (loading) {
                loading.classList.remove('is-slow');
                loading.classList.add('is-hidden');
                setTimeout(() => { loading.style.display = 'none'; }, 460);
            }
            console.log('[app init] loading hidden');
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
                loading.classList.remove('is-hidden', 'has-error', 'is-slow');
            }
            setLoadingStep('Повторяем загрузку...', 8);
            console.log('[app init] retry requested');
            init();
        }

        async function init() {
            const runId = ++appInitRunId;
            resetInitState();
            console.log('[app init] start app init', { runId, isTelegramMiniApp, loadingTimeoutMs: LOADING_TIMEOUT_MS, serverTimeoutMs: SERVER_REQUEST_TIMEOUT_MS });
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
                    console.warn('[app init] loading timeout reached', { runId, timeoutMs: LOADING_TIMEOUT_MS });
                    showLoadingError('Не удалось загрузить данные. Проверь подключение и попробуй снова.');
                }
            }, LOADING_TIMEOUT_MS);
            appInitState.slowTimeoutId = setTimeout(() => showLoadingSlow(runId), LOADING_SLOW_MS);

            try {
                setLoadingStep(isTelegramMiniApp ? 'Запускаем Telegram Mini App...' : 'Запускаем Browser / Dev mode...', 10);
                try {
                    tg?.ready?.();
                    tg?.expand?.();
                } catch (e) {
                    console.warn('Telegram WebApp API недоступен:', e);
                }

                setLoadingStep(isTelegramMiniApp ? 'Подключаем базу...' : 'Готовим локальные данные...', 18);
                if (isTelegramMiniApp && typeof window.supabase !== 'undefined') {
                    if (!supabaseClient) {
                        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
                    }
                    console.log('[app init] Supabase client ready');
                } else if (isTelegramMiniApp) {
                    console.warn('[app init] Supabase SDK unavailable, recipes will use local fallback');
                }

                setLoadingStep('Загружаем настройки...', 28);
                currentGender = localStorage.getItem('user_gender') || currentGender || 'M';
                appInitState.isSettingsLoaded = true;
                appInitState.isFavoritesLoaded = true;
                console.log('[app init] localStorage loaded');

                setLoadingStep('Загружаем профиль...', 40);
                await loadProfile();
                appInitState.isProfileLoaded = true;

                setLoadingStep('Подбираем рецепты...', 58);
                try {
                    if (isTelegramMiniApp) {
                        const supabaseRecipes = await withStartupTimeout(loadRecipesFromSupabase(), INIT_OPTIONAL_DATA_TIMEOUT_MS, 'recipes');
                        recipesData = supabaseRecipes.length ? supabaseRecipes : prepareRecipeData(STARTER_RECIPES);
                        if (!supabaseRecipes.length) console.warn('Supabase recipes table is empty. Using local starter recipes.');
                        else console.log('[app init] recipes loaded from Supabase', { count: recipesData.length });
                    } else {
                        recipesData = prepareRecipeData(STARTER_RECIPES);
                        console.log('[app init] recipes loaded from starter data', { count: recipesData.length });
                    }
                } catch (recipesError) {
                    console.warn('Не удалось загрузить рецепты из Supabase, использую локальную стартовую базу:', recipesError);
                    recipesData = prepareRecipeData(STARTER_RECIPES);
                    console.log('[app init] recipes fallback loaded', { count: recipesData.length });
                }
                appInitState.isRecipesLoaded = true;
                renderRecipes();
                updateMealPrepSummary();
                console.log('[app init] recipes rendered');
                console.log('[app init] assets/images skipped for startup; browser onerror fallbacks will handle missing media');

                setLoadingStep('Считаем КБЖУ...', 72);
                loadWaterData();
                updateTopDate();
                console.log('[app init] water/date loaded');
                try {
                    const initDataOptions = { timeoutMs: INIT_OPTIONAL_DATA_TIMEOUT_MS };
                    await Promise.all([fetchWeekActivity(initDataOptions), fetchStatsForDate(initDataOptions)]);
                    appInitState.isStreakLoaded = true;
                    console.log('[app init] daily stats loaded');
                } catch (dataError) {
                    console.warn('Дневные данные загрузятся позже:', dataError);
                    stats = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
                    activeDaysSet.clear();
                }
                refreshUI();
                console.log('[app init] app rendered');

                setLoadingStep('Готовим главный экран...', 90);
                const hList = document.getElementById('history-list');
                if (hList) hList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🍽️</div><div style="font-weight:800;color:var(--text-main);margin-bottom:6px;">Дневник загружается</div><div>Главный экран уже готов, записи появятся чуть позже.</div></div>';
                updateHistoryUI({ timeoutMs: INIT_OPTIONAL_DATA_TIMEOUT_MS })
                    .then(() => {
                        if (runId !== appInitRunId) return;
                        appInitState.isDiaryLoaded = true;
                        console.log('[app init] diary loaded');
                    })
                    .catch(diaryError => {
                        if (runId !== appInitRunId) return;
                        console.warn('Дневник загрузится позже:', diaryError);
                        const list = document.getElementById('history-list');
                        if (list) list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🍽️</div><div style="font-weight:800;color:var(--text-main);margin-bottom:6px;">Дневник загрузится позже</div><div>Проверь подключение или открой приложение внутри Telegram.</div></div>';
                    });

                setLoadingStep('Готовим рекомендации...', 94);
                buildWeeklyChart().catch(chartError => console.warn('График загрузится позже:', chartError));
                console.log('[app init] optional chart queued');

                if (runId !== appInitRunId) return;
                await showMainAppWhenReady(runId);
            } catch (e) {
                if (runId !== appInitRunId) return;
                console.error('[app init] init error:', e);
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

        async function fetchWeekActivity(options = {}) {
            activeDaysSet.clear();
            let startOfWeek = new Date(currentDate); let day = startOfWeek.getDay() || 7;
            startOfWeek.setDate(startOfWeek.getDate() - day + 1); startOfWeek.setHours(0,0,0,0);
            let endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6); endOfWeek.setHours(23,59,59,999);
            const data = await callServer('getMeals', { startDate: startOfWeek.toISOString(), endDate: endOfWeek.toISOString() }, options);
            if (data) data.forEach(m => activeDaysSet.add(toISOLocal(new Date(m.created_at))));
        }

        async function fetchStatsForDate(options = {}) {
            stats = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
            let startOfDay = new Date(currentDate); startOfDay.setHours(0,0,0,0);
            let endOfDay = new Date(currentDate); endOfDay.setHours(23,59,59,999);
            const meals = await callServer('getMeals', { startDate: startOfDay.toISOString(), endDate: endOfDay.toISOString() }, options);
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

        const SMART_TIP_RECOMMENDATIONS = {
            protein: {
                status: 'Главный фокус: добрать белок',
                shortText: 'Главный фокус — белок. Добавь творог, яйца или рыбу.',
                foods: ['куриная грудка', 'рыба', 'творог', 'яйца', 'греческий йогурт', 'протеиновая овсянка'],
                portions: ['куриная грудка — 120–160 г', 'рыба — 120–180 г', 'творог 5% — 150–200 г', 'яйца — 2 шт.', 'греческий йогурт — 180–250 г'],
                action: 'Сделай ближайший прием пищи белковым и не добирай норму сладким перекусом.'
            },
            carbs: {
                status: 'Главный фокус: добрать углеводы',
                shortText: 'Главный фокус — углеводы. Добавь крупу рядом с белком.',
                foods: ['рис', 'гречка', 'булгур', 'овсянка', 'цельнозерновой хлеб', 'банан'],
                portions: ['рис/гречка/булгур в готовом виде — 120–180 г', 'овсянка сухая — 40–60 г', 'цельнозерновой хлеб — 1–2 ломтика', 'банан — 1 шт.'],
                action: 'Добавь спокойный источник углеводов рядом с белком, чтобы энергия держалась ровнее.'
            },
            fat: {
                status: 'Главный фокус: добрать жиры',
                shortText: 'Главный фокус — жиры. Добавь орехи, авокадо или яйца.',
                foods: ['авокадо', 'орехи', 'оливковое масло', 'лосось', 'яйца'],
                portions: ['орехи — 15–25 г', 'авокадо — 50–80 г', 'оливковое масло — 1 ч. л.', 'лосось — 120–180 г', 'яйца — 2 шт.'],
                action: 'Добавь небольшую порцию жиров к обычному блюду, без тяжелого перекуса.'
            },
            water: {
                status: 'Главный фокус: вода',
                shortText: 'Главный фокус — вода. Выпей 250 мл сейчас.',
                foods: ['вода 250–500 мл сейчас'],
                portions: ['вода — 250 мл сейчас'],
                action: 'Добавь 250 мл сейчас. Если через час все еще мало, повтори еще один стакан.'
            },
            calories: {
                status: 'Главный фокус: закрыть калории',
                shortText: 'Главный фокус — калории. Выбери полноценный прием пищи.',
                foods: ['курица с крупой', 'рыба с рисом', 'гречка с яйцами', 'протеиновая овсянка', 'йогурт с бананом'],
                portions: ['куриная грудка — 120–160 г', 'рыба — 120–180 г', 'рис/гречка/булгур в готовом виде — 120–180 г', 'овсянка сухая — 40–60 г'],
                action: 'Лучше выбрать полноценный прием пищи: белок плюс крупа, а не быстрый сладкий перекус.'
            },
            over: {
                status: 'Главный фокус: не превышать норму',
                shortText: 'Главный фокус — без перебора. Вода и легкий следующий прием.',
                foods: ['вода 250–500 мл сейчас', 'овощи без тяжелых соусов', 'легкий белковый прием позже'],
                portions: ['вода — 250 мл сейчас', 'овощи — спокойная порция', 'следующий прием — легче обычного'],
                action: 'Не нужно компенсировать жестко. Пей воду, а следующий прием сделай легче и проще.'
            },
            start: {
                status: 'Главный фокус: начать день',
                shortText: 'Добавь первый приём пищи, и я покажу точный фокус дня.',
                foods: ['куриная грудка', 'рыба', 'творог', 'овсянка', 'гречка', 'вода 250 мл'],
                portions: ['творог 5% — 150–200 г', 'овсянка сухая — 40–60 г', 'яйца — 2 шт.', 'вода — 250 мл сейчас'],
                action: 'Добавь первый прием пищи или стакан воды, и подсказка станет точнее.'
            }
        };

        function buildSmartTipRecommendation() {
            const targetKcal = Number(userProfile.target_kcal) || 0;
            const targetProtein = Number(userProfile.target_protein) || 0;
            const targetFat = Number(userProfile.target_fat) || 0;
            const targetCarbs = Number(userProfile.target_carbs) || 0;
            const targetWater = Number(userProfile.target_water) || 2000;
            const currentKcal = Number(stats.kcal) || 0;
            const currentProtein = Number(stats.protein) || 0;
            const currentFat = Number(stats.fat) || 0;
            const currentCarbs = Number(stats.carbs) || 0;
            const currentWater = Number(dailyWater) || 0;
            const kcalLeft = Math.max(targetKcal - currentKcal, 0);
            const waterLeft = Math.max(targetWater - currentWater, 0);
            const waterPct = targetWater > 0 ? (currentWater / targetWater) * 100 : 0;

            let focus = 'start';
            let copy = 'Добавьте первый прием пищи, и я покажу точный фокус дня.';

            if (targetKcal > 0 && currentKcal > targetKcal) {
                focus = 'over';
                copy = 'Калории уже выше дневной цели. Сейчас лучше вода и более легкий следующий прием.';
            } else if (waterLeft >= 250 && waterPct < 55) {
                focus = 'water';
                copy = 'Воды пока мало. Выпей 250 мл сейчас, чтобы не отставать от дневной нормы.';
            } else if (currentKcal > 0) {
                const gaps = [
                    { key: 'protein', left: Math.max(targetProtein - currentProtein, 0), target: targetProtein },
                    { key: 'carbs', left: Math.max(targetCarbs - currentCarbs, 0), target: targetCarbs },
                    { key: 'fat', left: Math.max(targetFat - currentFat, 0), target: targetFat }
                ].map(item => ({ ...item, ratio: item.target > 0 ? item.left / item.target : 0 }))
                    .sort((a, b) => b.ratio - a.ratio);
                const biggestGap = gaps[0];

                if (biggestGap && biggestGap.ratio >= 0.18) {
                    focus = biggestGap.key;
                    if (focus === 'protein') copy = 'Белок ниже цели. Добери его творогом, яйцами, рыбой или спокойным белковым приемом.';
                    if (focus === 'carbs') copy = 'Углеводы ниже цели. Добери их крупой, овсянкой или фруктом рядом с белком.';
                    if (focus === 'fat') copy = 'Жиры ниже цели. Добавь небольшую порцию орехов, авокадо, яйца или рыбу.';
                } else if (kcalLeft >= 500 || ((userProfile.goal_type === 'bulk' || userProfile.goal_type === 'muscle') && kcalLeft >= 350)) {
                    focus = 'calories';
                    copy = 'Калорий осталось много. Лучше закрыть их полноценным приемом пищи, а не сладким перекусом.';
                } else {
                    focus = 'calories';
                    copy = 'День идет ровно. Закрой остаток спокойным приемом пищи без перегруза.';
                }
            }

            return { focus, copy, ...SMART_TIP_RECOMMENDATIONS[focus] };
        }

        function openSmartTipPopup() {
            const overlay = document.getElementById('smart-tip-overlay');
            if (!overlay) return;
            const data = buildSmartTipRecommendation();
            setText('smart-tip-status', data.status);
            setText('smart-tip-copy', data.copy);
            const foods = document.getElementById('smart-tip-foods');
            if (foods) foods.innerHTML = data.foods.map(item => '<span>' + escapeHTML(item) + '</span>').join('');
            const portions = document.getElementById('smart-tip-portions');
            if (portions) portions.innerHTML = data.portions.map(item => '<div>' + escapeHTML(item) + '</div>').join('');
            setText('smart-tip-action-note', data.action);
            const waterBtn = document.getElementById('smart-tip-water-btn');
            const recipesBtn = document.getElementById('smart-tip-recipes-btn');
            if (waterBtn) waterBtn.hidden = data.focus !== 'water';
            if (recipesBtn) recipesBtn.hidden = false;
            setLockedLayer('smart-tip', overlay, true);
        }

        function closeSmartTipPopup() {
            setLockedLayer('smart-tip', document.getElementById('smart-tip-overlay'), false);
        }

        function addSmartTipWater(event) {
            addWater(250, event);
            openSmartTipPopup();
        }

        function showSmartTipRecipes() {
            closeSmartTipPopup();
            setTimeout(() => document.getElementById('recipe-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
        }

        function getValidMealType(mealType, fallback = 'Завтрак') {
            return ['Завтрак','Обед','Ужин','Перекус'].includes(mealType) ? mealType : fallback;
        }

        function isDiaryMealScreenOpen() {
            const screen = document.getElementById('diary-meal-screen');
            return Boolean(screen && !screen.hasAttribute('hidden'));
        }

        function getCurrentAddMealType() {
            return isDiaryMealScreenOpen()
                ? getValidMealType(currentDiaryMealType, getValidMealType(currentMealFilter, 'Завтрак'))
                : getValidMealType(currentMealFilter, 'Завтрак');
        }

        function openAddMealAction(event) {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            setDisplayedLayer('add-meal-choice', document.getElementById('add-meal-choice-modal'), true);
        }

        function closeAddMealChoice() {
            setDisplayedLayer('add-meal-choice', document.getElementById('add-meal-choice-modal'), false);
        }

        function chooseRecipeAddFlow() {
            closeAddMealChoice();
            document.getElementById('recipe-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function setBarcodeMealError(message = '') {
            const el = document.getElementById('barcode-meal-error');
            if (!el) return;
            el.textContent = message;
            el.classList.toggle('active', Boolean(message));
        }

        function setBarcodeMealLoading(isLoading) {
            const btn = document.getElementById('barcode-meal-find-btn');
            if (!btn) return;
            btn.disabled = Boolean(isLoading);
            btn.textContent = isLoading ? 'Ищу...' : (btn.dataset.mode === 'reset' ? 'Найти другой продукт' : 'Найти продукт');
        }

        function setBarcodeSearchMode(mode = 'search') {
            const btn = document.getElementById('barcode-meal-find-btn');
            const sheet = document.querySelector('.barcode-meal-sheet');
            const isReset = mode === 'reset';
            sheet?.classList.toggle('barcode-has-result', isReset);
            if (!btn) return;
            btn.dataset.mode = isReset ? 'reset' : 'search';
            btn.type = isReset ? 'button' : 'submit';
            btn.textContent = btn.dataset.mode === 'reset' ? 'Найти другой продукт' : 'Найти продукт';
            btn.classList.toggle('is-secondary', btn.dataset.mode === 'reset');
        }

        function resetBarcodeSearchResult(options = {}) {
            barcodeProductDraft = null;
            setBarcodeMealError('');
            setBarcodeSearchMode('search');
            closeBarcodeCameraPlaceholder({ focusInput: false });
            const result = document.getElementById('barcode-meal-result');
            if (result) result.innerHTML = '';
            const input = document.getElementById('barcode-meal-input');
            if (options.clearInput && input) input.value = '';
            setTimeout(() => input?.focus?.(), 60);
        }

        function setBarcodeCameraStatus(message = '') {
            const status = document.getElementById('barcode-camera-status');
            if (status) status.textContent = message;
        }

        function stopBarcodeScanLoop() {
            isBarcodeScanning = false;
            isBarcodeProcessing = false;
            if (barcodeScanFrameId) {
                cancelAnimationFrame(barcodeScanFrameId);
                barcodeScanFrameId = 0;
            }
        }

        function stopBarcodeCamera() {
            stopBarcodeScanLoop();
            if (barcodeZxingControls?.stop) {
                try { barcodeZxingControls.stop(); } catch (error) { console.warn('[barcode camera] ZXing stop failed:', error); }
            }
            barcodeZxingControls = null;
            if (barcodeZxingReader?.reset) {
                try { barcodeZxingReader.reset(); } catch (error) { console.warn('[barcode camera] ZXing reset failed:', error); }
            }
            barcodeZxingReader = null;
            if (barcodeCameraStream) {
                barcodeCameraStream.getTracks().forEach(track => track.stop());
                barcodeCameraStream = null;
            }
            const video = document.getElementById('barcode-camera-video');
            if (video) {
                video.pause?.();
                video.srcObject = null;
            }
        }

        function getZxingBrowser() {
            if (window.ZXingBrowser?.BrowserMultiFormatReader) return window.ZXingBrowser;
            if (window.ZXing?.BrowserMultiFormatReader) return window.ZXing;
            if (window.ZXing?.browser?.BrowserMultiFormatReader) return window.ZXing.browser;
            return null;
        }

        function createBarcodeDetector() {
            if (!('BarcodeDetector' in window)) return null;
            const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];
            try {
                return new BarcodeDetector({ formats });
            } catch (error) {
                console.warn('[barcode camera] BarcodeDetector formats failed, trying default detector:', error);
                try {
                    return new BarcodeDetector();
                } catch (fallbackError) {
                    console.warn('[barcode camera] BarcodeDetector unavailable:', fallbackError);
                    return null;
                }
            }
        }

        async function handleDetectedBarcode(rawValue) {
            const barcode = normalizeBarcode(rawValue);
            if (!barcode || validateBarcodeValue(barcode)) {
                setBarcodeCameraStatus('Не удалось считать штрихкод. Попробуйте ещё раз или введите код вручную.');
                isBarcodeProcessing = false;
                return false;
            }
            isBarcodeProcessing = true;
            setBarcodeCameraStatus('Штрихкод найден');
            const input = document.getElementById('barcode-meal-input');
            if (input) input.value = barcode;
            closeBarcodeCameraPlaceholder({ focusInput: false });
            await findBarcodeProduct();
            return true;
        }

        function startBarcodeScanLoop() {
            if (isBarcodeScanning) return;
            const video = document.getElementById('barcode-camera-video');
            const detector = createBarcodeDetector();
            if (!detector) {
                setBarcodeCameraStatus('Сканирование камерой недоступно на этом устройстве. Введите штрихкод вручную.');
                return;
            }
            isBarcodeScanning = true;
            isBarcodeProcessing = false;
            const scan = async () => {
                if (!isBarcodeScanning || isBarcodeProcessing) return;
                if (!video || video.readyState < 2) {
                    barcodeScanFrameId = requestAnimationFrame(scan);
                    return;
                }
                try {
                    const barcodes = await detector.detect(video);
                    if (!isBarcodeScanning || isBarcodeProcessing) return;
                    const rawValue = barcodes?.[0]?.rawValue;
                    if (rawValue) {
                        const handled = await handleDetectedBarcode(rawValue);
                        if (handled) return;
                    }
                    setBarcodeCameraStatus('Наведите камеру на штрихкод.');
                } catch (error) {
                    console.warn('[barcode camera] Barcode detection failed:', error);
                    setBarcodeCameraStatus('Не удалось считать штрихкод. Попробуйте ещё раз или введите код вручную.');
                }
                if (isBarcodeScanning && !isBarcodeProcessing) barcodeScanFrameId = requestAnimationFrame(scan);
            };
            barcodeScanFrameId = requestAnimationFrame(scan);
        }

        function createZxingReader() {
            const zxing = getZxingBrowser();
            if (!zxing?.BrowserMultiFormatReader) return null;
            try {
                return new zxing.BrowserMultiFormatReader();
            } catch (error) {
                console.warn('[barcode camera] ZXing reader init failed:', error);
                return null;
            }
        }

        async function startZxingScanner(video) {
            const zxing = getZxingBrowser();
            barcodeZxingReader = barcodeZxingReader || createZxingReader();
            if (!zxing || !barcodeZxingReader) {
                setBarcodeCameraStatus('Сканирование недоступно на этом устройстве. Введите штрихкод вручную.');
                console.warn('[barcode camera] ZXing library is not loaded');
                return;
            }
            if (isBarcodeScanning) return;
            isBarcodeScanning = true;
            isBarcodeProcessing = false;
            const constraints = { video: { facingMode: { ideal: 'environment' } }, audio: false };
            try {
                const callback = async (result, error, controls) => {
                    if (controls && !barcodeZxingControls) barcodeZxingControls = controls;
                    if (!isBarcodeScanning || isBarcodeProcessing) return;
                    if (result?.getText) {
                        const handled = await handleDetectedBarcode(result.getText());
                        if (handled) return;
                    }
                    if (error && error.name && error.name !== 'NotFoundException') {
                        console.warn('[barcode camera] ZXing decode failed:', error);
                        setBarcodeCameraStatus('Не удалось считать штрихкод. Попробуйте ещё раз или введите код вручную.');
                    } else {
                        setBarcodeCameraStatus('Наведите камеру на штрихкод.');
                    }
                };
                if (barcodeZxingReader.decodeFromConstraints) {
                    barcodeZxingControls = await barcodeZxingReader.decodeFromConstraints(constraints, video, callback);
                } else {
                    barcodeZxingControls = await barcodeZxingReader.decodeFromVideoDevice(null, video, callback);
                }
                setBarcodeCameraStatus('Наведите камеру на штрихкод.');
            } catch (error) {
                stopBarcodeCamera();
                console.warn('[barcode camera] ZXing start failed:', error);
                if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
                    setBarcodeCameraStatus('Доступ к камере запрещён. Разрешите доступ или введите штрихкод вручную.');
                    return;
                }
                if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError' || error?.name === 'NotReadableError') {
                    setBarcodeCameraStatus('Сканирование недоступно на этом устройстве. Введите штрихкод вручную.');
                    return;
                }
                setBarcodeCameraStatus('Не удалось считать штрихкод. Попробуйте ещё раз или введите код вручную.');
            }
        }

        async function openBarcodeCameraPlaceholder() {
            const panel = document.getElementById('barcode-camera-placeholder');
            panel?.removeAttribute('hidden');
            setBarcodeCameraStatus('Наведите камеру на штрихкод.');
            const video = document.getElementById('barcode-camera-video');
            if (!('BarcodeDetector' in window)) {
                console.warn('[barcode camera] BarcodeDetector is not supported, using ZXing fallback');
                await startZxingScanner(video);
                return;
            }
            if (!navigator.mediaDevices?.getUserMedia) {
                setBarcodeCameraStatus('Камера недоступна на этом устройстве. Введите штрихкод вручную.');
                console.warn('[barcode camera] getUserMedia is not supported');
                return;
            }
            stopBarcodeCamera();
            try {
                let stream;
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
                } catch (environmentError) {
                    console.warn('[barcode camera] Environment camera unavailable, trying any camera:', environmentError);
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                }
                barcodeCameraStream = stream;
                if (video) {
                    video.srcObject = stream;
                    await video.play().catch(error => console.warn('[barcode camera] Video play failed:', error));
                }
                setBarcodeCameraStatus('Наведите камеру на штрихкод.');
                startBarcodeScanLoop();
            } catch (error) {
                stopBarcodeCamera();
                console.warn('[barcode camera] Camera start failed:', error);
                if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
                    setBarcodeCameraStatus('Доступ к камере запрещён. Разрешите доступ или введите штрихкод вручную.');
                    return;
                }
                if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError' || error?.name === 'NotReadableError') {
                    setBarcodeCameraStatus('Камера недоступна на этом устройстве. Введите штрихкод вручную.');
                    return;
                }
                setBarcodeCameraStatus('Не удалось запустить камеру. Попробуйте позже или введите код вручную.');
            }
        }

        function closeBarcodeCameraPlaceholder(options = {}) {
            stopBarcodeCamera();
            const panel = document.getElementById('barcode-camera-placeholder');
            panel?.setAttribute('hidden', '');
            setBarcodeCameraStatus('Наведите камеру на штрихкод.');
            if (options.focusInput !== false) document.getElementById('barcode-meal-input')?.focus?.();
        }

        function normalizeBarcode(value) {
            return String(value || '').trim().replace(/\s+/g, '');
        }

        function validateBarcodeValue(barcode) {
            if (!barcode) return 'Введите штрихкод продукта.';
            if (!/^\d+$/.test(barcode) || barcode.length < 6 || barcode.length > 32) return 'Штрихкод должен содержать только цифры.';
            return '';
        }

        function resetBarcodeMealForm() {
            barcodeProductDraft = null;
            setBarcodeMealError('');
            setBarcodeMealLoading(false);
            setBarcodeSearchMode('search');
            const input = document.getElementById('barcode-meal-input');
            if (input) input.value = '';
            const result = document.getElementById('barcode-meal-result');
            if (result) result.innerHTML = '';
            closeBarcodeCameraPlaceholder({ focusInput: false });
        }

        function openBarcodeMealModal(options = {}) {
            closeAddMealChoice();
            if (options?.mealType) currentDiaryMealType = getValidMealType(options.mealType, currentDiaryMealType);
            resetBarcodeMealForm();
            setLockedLayer('barcode-meal', document.getElementById('barcode-meal-modal'), true);
            setTimeout(() => document.getElementById('barcode-meal-input')?.focus?.(), 120);
        }

        function closeBarcodeMealModal() {
            setLockedLayer('barcode-meal', document.getElementById('barcode-meal-modal'), false);
            barcodeProductDraft = null;
            setBarcodeMealError('');
            setBarcodeMealLoading(false);
            closeBarcodeCameraPlaceholder({ focusInput: false });
        }

        function getOpenFoodFactsNumber(product, key) {
            const nutriments = product?.nutriments || {};
            const value = nutriments[key];
            const number = Number(value);
            return Number.isFinite(number) && number >= 0 ? number : null;
        }

        function getOpenFoodFactsKcal(product) {
            const kcal = getOpenFoodFactsNumber(product, 'energy-kcal_100g');
            if (kcal !== null) return kcal;
            const nutriments = product?.nutriments || {};
            const kj = Number(nutriments.energy_100g);
            return Number.isFinite(kj) && kj >= 0 ? kj / 4.184 : null;
        }

        function normalizeOpenFoodFactsProduct(data, barcode) {
            if (!data || Number(data.status) !== 1 || !data.product) return { error: 'not-found' };
            const product = data.product;
            const name = String(product.product_name || product.product_name_ru || '').trim();
            if (!name) return { error: 'missing-name' };
            const kcal100 = getOpenFoodFactsKcal(product);
            const protein100 = getOpenFoodFactsNumber(product, 'proteins_100g');
            const fat100 = getOpenFoodFactsNumber(product, 'fat_100g');
            const carbs100 = getOpenFoodFactsNumber(product, 'carbohydrates_100g');
            const hasKbju = [kcal100, protein100, fat100, carbs100].every(value => Number.isFinite(Number(value)));
            if (!hasKbju) return { error: 'missing-kbju' };
            return {
                product: {
                    barcode,
                    name,
                    brand: String(product.brands || '').split(',')[0].trim(),
                    kcal100,
                    protein100,
                    fat100,
                    carbs100,
                    source: 'open-food-facts',
                    sourceLabel: 'OFF',
                    hasKbju: true
                }
            };
        }

        function getBarcodeMealNumber(id) {
            const raw = document.getElementById(id)?.value;
            if (raw === '' || raw === null || raw === undefined) return 0;
            return Number(String(raw).replace(',', '.'));
        }

        function calculateBarcodeMealTotals() {
            const product = barcodeProductDraft;
            const grams = getBarcodeMealNumber('barcode-meal-grams');
            const ratio = grams > 0 ? grams / 100 : 0;
            return {
                grams,
                kcal: (Number(product?.kcal100) || 0) * ratio,
                protein: (Number(product?.protein100) || 0) * ratio,
                fat: (Number(product?.fat100) || 0) * ratio,
                carbs: (Number(product?.carbs100) || 0) * ratio
            };
        }

        function updateBarcodeMealTotals() {
            const totals = calculateBarcodeMealTotals();
            setText('barcode-total-kcal', String(Math.round(Math.max(0, totals.kcal || 0))));
            setText('barcode-total-protein', (Math.max(0, totals.protein || 0)).toFixed(1) + ' г');
            setText('barcode-total-fat', (Math.max(0, totals.fat || 0)).toFixed(1) + ' г');
            setText('barcode-total-carbs', (Math.max(0, totals.carbs || 0)).toFixed(1) + ' г');
        }

        function renderBarcodeNotFound(barcode) {
            const result = document.getElementById('barcode-meal-result');
            if (!result) return;
            result.innerHTML = '<div class="barcode-empty-card">' +
                '<div class="barcode-empty-title">Продукт не найден в базе. Добавьте его вручную — в следующий раз приложение найдёт его по этому штрихкоду.</div>' +
                '<button class="barcode-manual-btn" type="button" onclick="openManualMealFromBarcode(' + escapeAttr(JSON.stringify(barcode)) + ')">Добавить вручную</button>' +
                '</div>';
        }

        function renderBarcodeManualFallback(barcode) {
            const result = document.getElementById('barcode-meal-result');
            if (!result) return;
            result.innerHTML = '<div class="barcode-empty-card">' +
                '<button class="barcode-manual-btn" type="button" onclick="openManualMealFromBarcode(' + escapeAttr(JSON.stringify(barcode)) + ')">Добавить вручную</button>' +
                '</div>';
        }

        function renderBarcodeProductCard(product) {
            const result = document.getElementById('barcode-meal-result');
            if (!result) return;
            const mealType = getCurrentAddMealType();
            result.innerHTML = '<section class="barcode-product-card">' +
                '<div class="barcode-product-head"><div><div class="barcode-product-title">' + escapeHTML(product.name) + '</div>' +
                (product.brand ? '<div class="barcode-product-brand">' + escapeHTML(product.brand) + '</div>' : '') +
                '</div><div class="barcode-product-badge">' + escapeHTML(product.sourceLabel || 'OFF') + '</div></div>' +
                '<div class="barcode-macro-line">КБЖУ на 100 г: ' + Math.round(product.kcal100) + ' ккал · Б ' + Number(product.protein100).toFixed(1) + ' г · Ж ' + Number(product.fat100).toFixed(1) + ' г · У ' + Number(product.carbs100).toFixed(1) + ' г</div>' +
                '<div class="barcode-meal-grid">' +
                    '<label class="barcode-meal-field"><span>Вес порции, г</span><input id="barcode-meal-grams" type="number" inputmode="decimal" min="1" step="1" value="100" oninput="updateBarcodeMealTotals()"></label>' +
                    '<label class="barcode-meal-field"><span>Приём пищи</span><select id="barcode-meal-type"><option value="Завтрак">Завтрак</option><option value="Обед">Обед</option><option value="Ужин">Ужин</option><option value="Перекус">Перекус</option></select></label>' +
                '</div>' +
                '<div class="barcode-total-card"><div class="barcode-total-title">Итого за порцию</div><div class="barcode-total-grid">' +
                    '<div><b id="barcode-total-kcal">0</b><span>ккал</span></div>' +
                    '<div><b id="barcode-total-protein">0.0 г</b><span>белки</span></div>' +
                    '<div><b id="barcode-total-fat">0.0 г</b><span>жиры</span></div>' +
                    '<div><b id="barcode-total-carbs">0.0 г</b><span>углеводы</span></div>' +
                '</div></div>' +
                '<div class="barcode-card-actions">' +
                    '<button class="barcode-add-btn" id="barcode-meal-add-btn" type="button" onclick="addBarcodeProductToDiary()">Добавить в дневник</button>' +
                    '<button class="barcode-reset-btn" type="button" onclick="resetBarcodeSearchResult({ clearInput: true })">Найти другой продукт</button>' +
                '</div>' +
                '</section>';
            const select = document.getElementById('barcode-meal-type');
            if (select) select.value = mealType;
            updateBarcodeMealTotals();
        }

        async function findBarcodeProduct(event) {
            event?.preventDefault?.();
            if (document.getElementById('barcode-meal-find-btn')?.dataset.mode === 'reset') {
                resetBarcodeSearchResult({ clearInput: true });
                return;
            }
            closeBarcodeCameraPlaceholder({ focusInput: false });
            const input = document.getElementById('barcode-meal-input');
            const barcode = normalizeBarcode(input?.value || '');
            if (input) input.value = barcode;
            const validationError = validateBarcodeValue(barcode);
            if (validationError) {
                barcodeProductDraft = null;
                const result = document.getElementById('barcode-meal-result');
                if (result) result.innerHTML = '';
                setBarcodeMealError(validationError);
                return;
            }
            const localProduct = mapManualProductToBarcodeProduct(findManualProductByBarcode(barcode), barcode);
            if (localProduct) {
                console.log('[barcode] Found local manual product by barcode:', barcode);
                barcodeProductDraft = localProduct;
                setBarcodeMealError('');
                renderBarcodeProductCard(localProduct);
                setBarcodeSearchMode('reset');
                return;
            }
            barcodeProductDraft = null;
            setBarcodeMealError('');
            setBarcodeMealLoading(true);
            const result = document.getElementById('barcode-meal-result');
            if (result) result.innerHTML = '<div class="barcode-loading-card">Ищу продукт в Open Food Facts...</div>';
            let timeoutId = null;
            try {
                const url = 'https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(barcode) + '.json';
                console.log('[barcode] Open Food Facts request URL:', url);
                const controller = new AbortController();
                timeoutId = setTimeout(() => controller.abort(), 12000);
                const response = await fetch(url, { signal: controller.signal });
                console.log('[barcode] HTTP status:', response.status);
                if (!response.ok) {
                    if (response.status === 404) {
                        console.warn('[barcode] Product not found in Open Food Facts:', { barcode, httpStatus: response.status });
                        setBarcodeMealError('Продукт не найден в базе. Можно добавить его вручную.');
                        renderBarcodeNotFound(barcode);
                        return;
                    }
                    console.warn('[barcode] Open Food Facts HTTP error:', response.status, response.statusText);
                    throw new Error('open-food-facts-http');
                }
                const data = await response.json();
                const sourceProduct = data?.product || null;
                console.log('[barcode] data.status:', data?.status);
                console.log('[barcode] product_name:', sourceProduct?.product_name || sourceProduct?.product_name_ru || '');
                console.log('[barcode] nutriments:', sourceProduct?.nutriments || null);
                const parsed = normalizeOpenFoodFactsProduct(data, barcode);
                if (parsed.error === 'not-found') {
                    console.warn('[barcode] Product not found in Open Food Facts:', { barcode, status: data?.status });
                    setBarcodeMealError('Продукт не найден в базе. Можно добавить его вручную.');
                    renderBarcodeNotFound(barcode);
                    return;
                }
                if (parsed.error === 'missing-name') {
                    console.warn('[barcode] Product found without product_name/product_name_ru:', { barcode, product: sourceProduct });
                    barcodeProductDraft = null;
                    setBarcodeMealError('Продукт найден, но в базе нет названия. Добавьте данные вручную.');
                    renderBarcodeManualFallback(barcode);
                    return;
                }
                if (parsed.error === 'missing-kbju') {
                    console.warn('[barcode] Product found without full per-100g nutrition:', { barcode, nutriments: sourceProduct?.nutriments || null });
                    barcodeProductDraft = null;
                    setBarcodeMealError('Продукт найден, но в базе нет полного КБЖУ. Добавьте данные вручную.');
                    renderBarcodeManualFallback(barcode);
                    return;
                }
                const product = parsed.product;
                barcodeProductDraft = product;
                renderBarcodeProductCard(product);
                setBarcodeSearchMode('reset');
            } catch (error) {
                console.warn('[barcode] Search failed:', error);
                barcodeProductDraft = null;
                if (result) result.innerHTML = '';
                setBarcodeSearchMode('search');
                setBarcodeMealError('Не удалось подключиться к базе продуктов. Проверьте интернет и попробуйте снова.');
            } finally {
                if (timeoutId) clearTimeout(timeoutId);
                setBarcodeMealLoading(false);
            }
        }

        function openManualMealFromBarcode(barcode = '') {
            closeBarcodeMealModal();
            openManualMealModal({ barcode });
        }

        async function addBarcodeProductToDiary() {
            if (isAddingMeal) return;
            const product = barcodeProductDraft;
            if (!product) return setBarcodeMealError('Сначала найдите продукт по штрихкоду.');
            if (!product.hasKbju) return setBarcodeMealError('У продукта нет полного КБЖУ на 100 г.');
            const mealType = document.getElementById('barcode-meal-type')?.value || getCurrentAddMealType() || 'Перекус';
            const totals = calculateBarcodeMealTotals();
            if (!Number.isFinite(totals.grams) || totals.grams <= 0) return setBarcodeMealError('Вес порции должен быть больше 0 г.');
            const btn = document.getElementById('barcode-meal-add-btn');
            isAddingMeal = true;
            if (btn) btn.disabled = true;
            setBarcodeMealError('');
            try {
                const createdAt = selectedDateTimeISO();
                const payload = {
                    type: 'barcode-product-entry',
                    manual: true,
                    name: product.name,
                    recipe_title: product.name,
                    mealType,
                    grams: totals.grams,
                    barcode: product.barcode,
                    brand: product.brand || '',
                    calories_per_100: product.kcal100,
                    protein_per_100: product.protein100,
                    fat_per_100: product.fat100,
                    carbs_per_100: product.carbs100,
                    recipe_id: null,
                    calories: totals.kcal,
                    kcal: totals.kcal,
                    protein: totals.protein,
                    fat: totals.fat,
                    carbs: totals.carbs,
                    meal_type: mealType,
                    createdAt,
                    created_at: createdAt,
                    ingredients: []
                };
                await callServer('addMeal', payload);
                upsertBarcodeManualProduct(product);
                closeBarcodeMealModal();
                await refreshAllData();
                document.getElementById('history-list')?.classList.add('success-flash');
                setTimeout(() => document.getElementById('history-list')?.classList.remove('success-flash'), 700);
                showToast('Добавлено в дневник');
            } catch (error) {
                console.error('Ошибка добавления продукта по штрихкоду:', error);
                if (isTelegramMiniApp) {
                    const fallbackMeal = addManualLocalMeal({
                        type: 'barcode-product-entry',
                        name: product.name,
                        recipe_title: product.name,
                        grams: totals.grams,
                        barcode: product.barcode,
                        brand: product.brand || '',
                        calories_per_100: product.kcal100,
                        protein_per_100: product.protein100,
                        fat_per_100: product.fat100,
                        carbs_per_100: product.carbs100,
                        kcal: totals.kcal,
                        protein: totals.protein,
                        fat: totals.fat,
                        carbs: totals.carbs,
                        meal_type: mealType,
                        created_at: selectedDateTimeISO()
                    });
                    upsertBarcodeManualProduct(product);
                    console.warn('Продукт по штрихкоду сохранён локально:', fallbackMeal);
                    closeBarcodeMealModal();
                    await refreshAllData();
                    showToast('Добавлено локально');
                } else {
                    setBarcodeMealError('Не удалось добавить продукт: ' + error.message);
                }
            } finally {
                isAddingMeal = false;
                if (btn) btn.disabled = false;
            }
        }

        function openMyRecipesModal() {
            closeAddMealChoice();
            showMyRecipesEmptyView();
            setLockedLayer('my-recipes', document.getElementById('my-recipes-modal'), true);
        }

        function closeMyRecipesModal() {
            closeMyRecipeDetailsModal();
            closeMyRecipeProductPicker();
            setLockedLayer('my-recipes', document.getElementById('my-recipes-modal'), false);
            myRecipeReturnToDiaryAfterSave = false;
            showMyRecipesEmptyView();
        }

        function setMyRecipeFormScreen(isActive) {
            document.getElementById('my-recipes-modal')?.classList.toggle('is-recipe-form-screen', Boolean(isActive));
        }

        function manualRecipesStorageKey() {
            return 'manualRecipes_' + appUserId;
        }

        function loadManualRecipes() {
            try { return JSON.parse(localStorage.getItem(manualRecipesStorageKey())) || []; } catch (e) { return []; }
        }

        function saveManualRecipes(recipes) {
            localStorage.setItem(manualRecipesStorageKey(), JSON.stringify(Array.isArray(recipes) ? recipes : []));
        }

        function formatMyRecipeMacroLine(nutrition) {
            const n = nutrition || {};
            return Math.round(Number(n.calories) || 0) + ' ккал · Б ' +
                (Number(n.protein) || 0).toFixed(1) + ' г · Ж ' +
                (Number(n.fat) || 0).toFixed(1) + ' г · У ' +
                (Number(n.carbs) || 0).toFixed(1) + ' г';
        }

        function formatMyRecipePer100Line(recipe) {
            const n = recipe?.per100Nutrition || {};
            return Math.round(Number(n.calories) || 0) + ' ккал · Б ' +
                (Number(n.protein) || 0).toFixed(1) + ' · Ж ' +
                (Number(n.fat) || 0).toFixed(1) + ' · У ' +
                (Number(n.carbs) || 0).toFixed(1);
        }

        function formatMyRecipeDetailNumber(value, digits = 1) {
            const number = Number(value) || 0;
            return digits === 0 ? String(Math.round(number)) : number.toFixed(digits);
        }

        function getMyRecipeNutritionValue(source, key) {
            if (!source) return 0;
            const value = key === 'calories'
                ? (source.calories ?? source.kcal)
                : source[key];
            const number = Number(value);
            return Number.isFinite(number) ? number : 0;
        }

        function buildMyRecipeIngredientTotals(recipe) {
            return (Array.isArray(recipe?.ingredients) ? recipe.ingredients : []).reduce((sum, ingredient) => {
                const grams = Math.max(0, Number(ingredient.grams) || 0);
                const ratio = grams / 100;
                sum.weight += grams;
                sum.calories += Math.max(0, Number(ingredient.caloriesPer100) || 0) * ratio;
                sum.protein += Math.max(0, Number(ingredient.proteinPer100) || 0) * ratio;
                sum.fat += Math.max(0, Number(ingredient.fatPer100) || 0) * ratio;
                sum.carbs += Math.max(0, Number(ingredient.carbsPer100) || 0) * ratio;
                return sum;
            }, { weight: 0, calories: 0, protein: 0, fat: 0, carbs: 0 });
        }

        function resolveMyRecipeDetailsNutrition(recipe) {
            const ingredientTotals = buildMyRecipeIngredientTotals(recipe);
            const total = {
                calories: getMyRecipeNutritionValue(recipe?.totalNutrition, 'calories') || ingredientTotals.calories,
                protein: getMyRecipeNutritionValue(recipe?.totalNutrition, 'protein') || ingredientTotals.protein,
                fat: getMyRecipeNutritionValue(recipe?.totalNutrition, 'fat') || ingredientTotals.fat,
                carbs: getMyRecipeNutritionValue(recipe?.totalNutrition, 'carbs') || ingredientTotals.carbs
            };
            const cookedWeight = Number(recipe?.cookedWeight) > 0 ? Number(recipe.cookedWeight) : ingredientTotals.weight;
            const servings = Number(recipe?.servings) > 0 ? Number(recipe.servings) : 0;
            const portionWeight = Number(recipe?.portionWeight) > 0
                ? Number(recipe.portionWeight)
                : cookedWeight > 0 && servings > 0 ? cookedWeight / servings : 0;
            const per100Ratio = cookedWeight > 0 ? 100 / cookedWeight : 0;
            const servingRatio = servings > 0 ? 1 / servings : 0;
            const per100 = {
                calories: getMyRecipeNutritionValue(recipe?.per100Nutrition, 'calories') || total.calories * per100Ratio,
                protein: getMyRecipeNutritionValue(recipe?.per100Nutrition, 'protein') || total.protein * per100Ratio,
                fat: getMyRecipeNutritionValue(recipe?.per100Nutrition, 'fat') || total.fat * per100Ratio,
                carbs: getMyRecipeNutritionValue(recipe?.per100Nutrition, 'carbs') || total.carbs * per100Ratio
            };
            const serving = {
                calories: getMyRecipeNutritionValue(recipe?.perServingNutrition, 'calories') || total.calories * servingRatio,
                protein: getMyRecipeNutritionValue(recipe?.perServingNutrition, 'protein') || total.protein * servingRatio,
                fat: getMyRecipeNutritionValue(recipe?.perServingNutrition, 'fat') || total.fat * servingRatio,
                carbs: getMyRecipeNutritionValue(recipe?.perServingNutrition, 'carbs') || total.carbs * servingRatio
            };
            return {
                rawWeight: Number(recipe?.rawIngredientsWeight) > 0 ? Number(recipe.rawIngredientsWeight) : ingredientTotals.weight,
                cookedWeight,
                servings,
                portionWeight,
                total,
                per100,
                serving
            };
        }

        function renderMyRecipesList() {
            const emptyView = document.getElementById('my-recipes-empty-view');
            const listView = document.getElementById('my-recipes-list-view');
            const list = document.getElementById('my-recipes-list');
            const recipes = loadManualRecipes()
                .filter(recipe => recipe?.type === 'manual-recipe' && String(recipe.name || '').trim())
                .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
            if (!recipes.length) {
                emptyView?.removeAttribute('hidden');
                listView?.setAttribute('hidden', '');
                if (list) list.innerHTML = '';
                return;
            }
            emptyView?.setAttribute('hidden', '');
            listView?.removeAttribute('hidden');
            if (!list) return;
            list.innerHTML = recipes.map(recipe => {
                const recipeId = escapeAttr(JSON.stringify(String(recipe.id || '')));
                const servings = Number(recipe.servings) > 0 ? ' · ' + (Number(recipe.servings) || 0) + ' порц.' : '';
                const meta = escapeHTML((recipe.category || 'Обед') + ' · ' + Math.round(Number(recipe.cookedWeight) || 0) + ' г' + servings);
                return '<article class="my-recipe-card is-clickable" role="button" tabindex="0" data-my-recipe-id="' + escapeAttr(String(recipe.id || '')) + '">' +
                    '<div class="my-recipe-card-title">' + escapeHTML(recipe.name) + '</div>' +
                    '<div class="my-recipe-card-meta">' + meta + '</div>' +
                    '<div class="my-recipe-card-macros">На 100 г: ' + escapeHTML(formatMyRecipeMacroLine(recipe.per100Nutrition)) + '</div>' +
                    '<div class="my-recipe-card-actions">' +
                        '<button class="my-recipe-card-edit-btn" type="button" data-my-recipe-edit-id="' + escapeAttr(String(recipe.id || '')) + '">Редактировать</button>' +
                        '<button class="my-recipe-card-add-btn" type="button" data-my-recipe-add-id="' + escapeAttr(String(recipe.id || '')) + '">Добавить в дневник</button>' +
                    '</div>' +
                    '</article>';
            }).join('');
        }

        let myRecipeIngredientSeq = 0;
        let myRecipeIngredientIds = [];
        let selectedMyRecipeForDiary = null;
        let selectedMyRecipeDetailsId = null;
        let myRecipeDetailsPortionDraft = null;
        let myRecipeProductPickerIngredientId = null;
        let activeMyRecipeIngredientSuggestId = null;
        let myRecipeIngredientProductSources = new Map();
        let editingMyRecipeId = null;

        function formatMyRecipeDetailMacroLine(nutrition, withGramUnits = false) {
            const unit = withGramUnits ? ' г' : '';
            return Math.round(Number(nutrition?.calories) || Number(nutrition?.kcal) || 0) + ' ккал · Б ' +
                (Number(nutrition?.protein) || 0).toFixed(1) + unit + ' · Ж ' +
                (Number(nutrition?.fat) || 0).toFixed(1) + unit + ' · У ' +
                (Number(nutrition?.carbs) || 0).toFixed(1) + unit;
        }

        function getMyRecipeDetailsInitialGrams(recipe, resolved) {
            if (Number(recipe?.portionWeight) > 0) return Math.round(Number(recipe.portionWeight));
            if (Number(resolved?.portionWeight) > 0) return Math.round(Number(resolved.portionWeight));
            if (Number(recipe?.cookedWeight) > 0 && Number(recipe?.servings) > 0) {
                return Math.round(Number(recipe.cookedWeight) / Number(recipe.servings));
            }
            return 100;
        }

        function getMyRecipePreparationSteps(recipe) {
            const candidates = [recipe?.instructions, recipe?.steps, recipe?.cookingSteps, recipe?.description];
            for (const candidate of candidates) {
                if (Array.isArray(candidate)) {
                    const steps = candidate.map(item => String(item || '').trim()).filter(Boolean);
                    if (steps.length) return steps;
                }
                if (typeof candidate === 'string') {
                    const steps = candidate
                        .split(/\n+|(?:^|\s)(?:\d+[\).\s]+|[-•]\s+)/)
                        .map(item => item.trim())
                        .filter(Boolean);
                    if (steps.length) return steps;
                }
            }
            return [];
        }

        function getMyRecipeTimeLabel(recipe) {
            const minutes = Number(recipe?.time || recipe?.minutes || recipe?.cookingTime || recipe?.cookTime || recipe?.prepTime);
            return Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) + ' мин' : '';
        }

        function renderMyRecipeDetailsIngredients(recipe) {
            const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
            if (!ingredients.length) {
                return '<div class="detail-note">Ингредиенты не добавлены.</div>';
            }
            return ingredients.map(ingredient => {
                const name = String(ingredient.name || '').trim() || 'Ингредиент';
                const grams = Math.max(0, Number(ingredient.grams) || 0);
                return '<div class="ingredient-item"><span>' + escapeHTML(name) + '</span><span>' + escapeHTML(formatMyRecipeDetailNumber(grams, 0)) + ' г</span></div>';
            }).join('');
        }

        function renderMyRecipeDetailsPortion() {
            if (!myRecipeDetailsPortionDraft) return;
            const input = document.getElementById('my-recipe-details-portion-input');
            const total = document.getElementById('my-recipe-details-portion-total');
            const grams = Math.max(1, Number(myRecipeDetailsPortionDraft.grams) || 100);
            const ratio = grams / 100;
            const per100 = myRecipeDetailsPortionDraft.per100 || {};
            const portion = {
                calories: (Number(per100.calories) || 0) * ratio,
                protein: (Number(per100.protein) || 0) * ratio,
                fat: (Number(per100.fat) || 0) * ratio,
                carbs: (Number(per100.carbs) || 0) * ratio
            };
            if (input && document.activeElement !== input) input.value = String(Math.round(grams));
            if (total) total.innerText = 'Итого: ' + formatMyRecipeDetailMacroLine(portion, true);
        }

        function setMyRecipeDetailsPortionGrams(value) {
            if (!myRecipeDetailsPortionDraft) return;
            myRecipeDetailsPortionDraft.grams = Math.max(1, Number(String(value).replace(',', '.')) || 1);
            renderMyRecipeDetailsPortion();
        }

        function stepMyRecipeDetailsPortion(delta) {
            if (!myRecipeDetailsPortionDraft) return;
            const current = Math.max(1, Number(myRecipeDetailsPortionDraft.grams) || 100);
            myRecipeDetailsPortionDraft.grams = Math.max(1, current + Number(delta || 0));
            renderMyRecipeDetailsPortion();
        }

        function getMyRecipeDetailsSelectedGrams() {
            return Math.max(1, Number(myRecipeDetailsPortionDraft?.grams) || 100);
        }

        function openMyRecipeDetailsModal(recipeId) {
            const recipe = loadManualRecipes().find(item => String(item.id) === String(recipeId));
            if (!recipe) return showToast('Рецепт не найден');
            selectedMyRecipeDetailsId = String(recipe.id || '');
            const resolved = resolveMyRecipeDetailsNutrition(recipe);
            setText('my-recipe-details-title', recipe.name || 'Рецепт');
            const badges = document.getElementById('my-recipe-details-badges');
            if (badges) {
                const category = String(recipe.category || '').trim();
                badges.innerHTML = (category ? '<span class="recipe-badge">' + escapeHTML(category) + '</span>' : '') +
                    '<span class="recipe-badge protein">Собственный рецепт</span>';
            }
            myRecipeDetailsPortionDraft = {
                recipeId: String(recipe.id || ''),
                per100: resolved.per100,
                grams: getMyRecipeDetailsInitialGrams(recipe, resolved)
            };
            const macros = document.getElementById('my-recipe-details-macros');
            if (macros) {
                const timeLabel = getMyRecipeTimeLabel(recipe);
                macros.innerHTML =
                    '<div class="detail-macro-summary"><div class="detail-macro-icon" aria-hidden="true"></div><div class="detail-macro-copy"><span>КБЖУ / 100 г</span><b>' +
                    escapeHTML(formatMyRecipeDetailMacroLine(resolved.per100)) +
                    '</b></div><div class="detail-macro-actions"><button class="detail-edit-recipe-btn" type="button" data-my-recipe-details-edit>Изменить рецепт</button>' +
                    (timeLabel ? '<div class="detail-time-pill">' + escapeHTML(timeLabel) + '</div>' : '') +
                    '</div></div>' +
                    '<div class="detail-portion-card" id="my-recipe-details-portion-card"><div class="detail-portion-title">Вес порции</div><div class="detail-portion-control"><button class="detail-portion-step" type="button" aria-label="Уменьшить порцию" onclick="stepMyRecipeDetailsPortion(-10)">−</button><label class="detail-portion-field"><input id="my-recipe-details-portion-input" type="number" inputmode="decimal" min="1" step="1" oninput="setMyRecipeDetailsPortionGrams(this.value)"><span>г</span></label><button class="detail-portion-step detail-portion-plus" type="button" aria-label="Увеличить порцию" onclick="stepMyRecipeDetailsPortion(10)">+</button></div><div class="detail-portion-total" id="my-recipe-details-portion-total"></div></div>';
            }
            const ingredients = document.getElementById('my-recipe-details-ingredients');
            if (ingredients) ingredients.innerHTML = renderMyRecipeDetailsIngredients(recipe);
            const steps = getMyRecipePreparationSteps(recipe);
            const instructionsSection = document.getElementById('my-recipe-details-instructions-section');
            const instructions = document.getElementById('my-recipe-details-instructions');
            instructionsSection?.toggleAttribute('hidden', !steps.length);
            if (instructions && steps.length) {
                instructions.innerHTML = steps.map((step, index) => '<div class="detail-step"><span>' + (index + 1) + '</span><p>' + escapeHTML(step) + '</p></div>').join('');
            } else if (instructions) {
                instructions.innerHTML = '';
            }
            renderMyRecipeDetailsPortion();
            const modal = document.getElementById('my-recipe-details-modal');
            modal?.removeAttribute('hidden');
            modal?.setAttribute('aria-hidden', 'false');
            setLockedLayer('my-recipe-details', modal, true);
        }

        function closeMyRecipeDetailsModal() {
            const modal = document.getElementById('my-recipe-details-modal');
            setLockedLayer('my-recipe-details', modal, false);
            modal?.setAttribute('hidden', '');
            modal?.setAttribute('aria-hidden', 'true');
            selectedMyRecipeDetailsId = null;
            myRecipeDetailsPortionDraft = null;
        }

        function buildMyRecipeDiaryPayload(recipe, grams, mealType) {
            const resolved = resolveMyRecipeDetailsNutrition(recipe);
            const safeGrams = Math.max(1, Number(grams) || 100);
            const ratio = safeGrams / 100;
            const per100 = resolved.per100 || {};
            const createdAt = selectedDateTimeISO();
            return {
                type: 'manual-recipe-entry',
                recipeId: recipe.id,
                name: recipe.name,
                recipe_title: recipe.name,
                grams: safeGrams,
                calories_per_100: Number(per100.calories) || 0,
                protein_per_100: Number(per100.protein) || 0,
                fat_per_100: Number(per100.fat) || 0,
                carbs_per_100: Number(per100.carbs) || 0,
                calories: (Number(per100.calories) || 0) * ratio,
                kcal: (Number(per100.calories) || 0) * ratio,
                protein: (Number(per100.protein) || 0) * ratio,
                fat: (Number(per100.fat) || 0) * ratio,
                carbs: (Number(per100.carbs) || 0) * ratio,
                mealType,
                meal_type: mealType,
                createdAt,
                created_at: createdAt,
                ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : []
            };
        }

        async function addMyRecipeToDiaryWithWeight(recipeId, grams, mealType) {
            const recipe = loadManualRecipes().find(item => String(item.id) === String(recipeId));
            if (!recipe) return showToast('Рецепт не найден');
            const safeMealType = getValidMealType(mealType, recipe.category || 'Обед');
            addManualLocalMeal(buildMyRecipeDiaryPayload(recipe, grams, safeMealType));
            await refreshAllData();
            if (isDiaryMealScreenOpen()) renderDiaryMealContent();
            document.getElementById('history-list')?.classList.add('success-flash');
            setTimeout(() => document.getElementById('history-list')?.classList.remove('success-flash'), 700);
            showToast('Добавлено в ' + safeMealType);
        }

        async function addMyRecipeFromDetails() {
            const recipeId = selectedMyRecipeDetailsId;
            if (!recipeId) return showToast('Выберите рецепт');
            const grams = getMyRecipeDetailsSelectedGrams();
            closeMyRecipeDetailsModal();
            if (isDiaryMealScreenOpen()) {
                await addMyRecipeToDiaryWithWeight(recipeId, grams, getDiaryMealType());
                return;
            }
            openMyRecipeAddModal(recipeId, { grams });
        }

        function editMyRecipeFromDetails() {
            const recipeId = selectedMyRecipeDetailsId;
            if (!recipeId) return showToast('Выберите рецепт');
            closeMyRecipeDetailsModal();
            if (!document.getElementById('my-recipes-modal')?.classList.contains('active')) {
                openMyRecipesModal();
            }
            openMyRecipeEditForm(recipeId);
        }

        async function deleteMyRecipeFromDetails() {
            const recipeId = selectedMyRecipeDetailsId;
            if (!recipeId) return showToast('Выберите рецепт');
            const confirmed = await showConfirm('Рецепт исчезнет из списка, но уже добавленные записи в дневнике останутся.', 'Удалить', 'Удалить рецепт?');
            if (!confirmed) return;
            saveManualRecipes(loadManualRecipes().filter(recipe => String(recipe.id) !== String(recipeId)));
            closeMyRecipeDetailsModal();
            showMyRecipesEmptyView();
            showToast('Рецепт удалён');
        }

        function formatMyRecipeProductPickerMacros(product) {
            return Math.round(Number(product.caloriesPer100) || 0) + ' ккал · Б ' +
                (Number(product.proteinPer100) || 0).toFixed(1) + ' · Ж ' +
                (Number(product.fatPer100) || 0).toFixed(1) + ' · У ' +
                (Number(product.carbsPer100) || 0).toFixed(1);
        }

        function formatMyRecipeProductSuggestMacros(product) {
            return Math.round(Number(product.caloriesPer100) || 0) + ' ккал · Б ' +
                (Number(product.proteinPer100) || 0).toFixed(1) + ' · Ж ' +
                (Number(product.fatPer100) || 0).toFixed(1) + ' · У ' +
                (Number(product.carbsPer100) || 0).toFixed(1);
        }

        function getMyRecipeProductSuggestions(query) {
            const normalized = normalizeManualProductName(query);
            if (normalized.length < 2) return [];
            return getSortedManualProducts()
                .filter(product => normalizeManualProductName(product.name).includes(normalized))
                .slice(0, 5);
        }

        function closeMyRecipeIngredientSuggestions(exceptIngredientId = null) {
            document.querySelectorAll('[data-my-recipe-suggestions-for]').forEach(list => {
                if (exceptIngredientId !== null && String(list.dataset.myRecipeSuggestionsFor) === String(exceptIngredientId)) return;
                list.innerHTML = '';
                list.hidden = true;
            });
            if (exceptIngredientId === null) activeMyRecipeIngredientSuggestId = null;
        }

        function renderMyRecipeIngredientSuggestions(ingredientId) {
            const list = document.getElementById('my-recipe-ingredient-' + ingredientId + '-suggestions');
            const input = document.getElementById('my-recipe-ingredient-' + ingredientId + '-name');
            if (!list || !input) return;
            closeMyRecipeIngredientSuggestions(ingredientId);
            activeMyRecipeIngredientSuggestId = Number(ingredientId);
            const suggestions = getMyRecipeProductSuggestions(input.value);
            if (!suggestions.length) {
                list.innerHTML = '';
                list.hidden = true;
                return;
            }
            list.hidden = false;
            list.innerHTML = suggestions.map(product =>
                '<button class="my-recipe-ingredient-suggestion" type="button" data-my-recipe-suggestion-id="' + escapeAttr(String(product.id || '')) + '" data-my-recipe-suggestion-ingredient="' + escapeAttr(String(ingredientId)) + '">' +
                    '<b>' + escapeHTML(product.name) + '</b>' +
                    '<span>' + escapeHTML(formatMyRecipeProductSuggestMacros(product)) + '</span>' +
                '</button>'
            ).join('');
        }

        function handleMyRecipeIngredientNameInput(ingredientId) {
            const input = document.getElementById('my-recipe-ingredient-' + ingredientId + '-name');
            if (!String(input?.value || '').trim()) {
                myRecipeIngredientProductSources.delete(Number(ingredientId));
                renderMyRecipeIngredientSourceBadge(ingredientId);
            }
            renderMyRecipeIngredientSuggestions(ingredientId);
            updateMyRecipeCalculation();
        }

        function renderMyRecipeProductPicker() {
            const list = document.getElementById('my-recipe-product-picker-list');
            if (!list) return;
            const products = getSortedManualProducts();
            const query = normalizeManualProductName(document.getElementById('my-recipe-product-picker-search')?.value || '');
            const filtered = query ? products.filter(product => normalizeManualProductName(product.name).includes(query)) : products;
            if (!products.length) {
                list.innerHTML = '<div class="my-recipe-product-picker-empty">Пока нет сохранённых продуктов.</div>';
                return;
            }
            if (!filtered.length) {
                list.innerHTML = '<div class="my-recipe-product-picker-empty">Продукты не найдены.</div>';
                return;
            }
            list.innerHTML = filtered.map(product => {
                const productId = escapeAttr(JSON.stringify(String(product.id || '')));
                return '<button class="my-recipe-product-picker-card" type="button" data-product-id="' + escapeAttr(String(product.id || '')) + '">' +
                    '<b>' + escapeHTML(product.name) + '</b>' +
                    '<span>' + escapeHTML(formatMyRecipeProductPickerMacros(product)) + '</span>' +
                    '</button>';
            }).join('');
        }

        function openMyRecipeProductPicker(ingredientId) {
            if (!myRecipeIngredientIds.includes(Number(ingredientId))) return;
            closeMyRecipeIngredientSuggestions();
            myRecipeProductPickerIngredientId = Number(ingredientId);
            const search = document.getElementById('my-recipe-product-picker-search');
            if (search) search.value = '';
            renderMyRecipeProductPicker();
            const modal = document.getElementById('my-recipe-product-picker-modal');
            modal?.removeAttribute('hidden');
            modal?.setAttribute('aria-hidden', 'false');
            setLockedLayer('my-recipe-product-picker', modal, true);
            setTimeout(() => search?.focus?.(), 120);
        }

        function closeMyRecipeProductPicker() {
            const modal = document.getElementById('my-recipe-product-picker-modal');
            setLockedLayer('my-recipe-product-picker', modal, false);
            modal?.setAttribute('hidden', '');
            modal?.setAttribute('aria-hidden', 'true');
            myRecipeProductPickerIngredientId = null;
        }

        function setMyRecipeIngredientInputValue(ingredientId, field, value) {
            const el = document.getElementById('my-recipe-ingredient-' + ingredientId + '-' + field);
            if (el) el.value = value;
        }

        function renderMyRecipeIngredientSourceBadge(ingredientId) {
            const badge = document.getElementById('my-recipe-ingredient-' + ingredientId + '-source');
            if (!badge) return;
            const source = myRecipeIngredientProductSources.get(Number(ingredientId));
            const name = document.getElementById('my-recipe-ingredient-' + ingredientId + '-name')?.value || '';
            const isVisible = source === 'manual-product' && Boolean(String(name).trim());
            badge.hidden = !isVisible;
            badge.textContent = isVisible ? 'Из моих продуктов' : '';
        }

        function applyManualProductToMyRecipeIngredient(ingredientId, product) {
            if (!ingredientId || !product || !isValidManualProduct(product)) return;
            setMyRecipeIngredientInputValue(ingredientId, 'name', product.name);
            setMyRecipeIngredientInputValue(ingredientId, 'kcal100', product.caloriesPer100);
            setMyRecipeIngredientInputValue(ingredientId, 'protein100', product.proteinPer100);
            setMyRecipeIngredientInputValue(ingredientId, 'fat100', product.fatPer100);
            setMyRecipeIngredientInputValue(ingredientId, 'carbs100', product.carbsPer100);
            myRecipeIngredientProductSources.set(Number(ingredientId), 'manual-product');
            renderMyRecipeIngredientSourceBadge(ingredientId);
            updateMyRecipeCalculation();
        }

        function selectMyRecipeIngredientProduct(productId) {
            const ingredientId = myRecipeProductPickerIngredientId;
            const product = loadManualProducts().find(item => String(item.id) === String(productId));
            if (!ingredientId || !product || !isValidManualProduct(product)) return;
            applyManualProductToMyRecipeIngredient(ingredientId, product);
            closeMyRecipeProductPicker();
            document.getElementById('my-recipe-ingredient-' + ingredientId + '-grams')?.focus?.();
        }

        function selectMyRecipeIngredientSuggestion(ingredientId, productId) {
            const product = loadManualProducts().find(item => String(item.id) === String(productId));
            if (!myRecipeIngredientIds.includes(Number(ingredientId)) || !product || !isValidManualProduct(product)) return;
            applyManualProductToMyRecipeIngredient(Number(ingredientId), product);
            closeMyRecipeIngredientSuggestions();
            document.getElementById('my-recipe-ingredient-' + ingredientId + '-grams')?.focus?.();
        }

        function bindMyRecipeModalEvents() {
            const list = document.getElementById('my-recipes-list');
            if (list && !list.dataset.myRecipeEventsBound) {
                list.dataset.myRecipeEventsBound = '1';
                list.addEventListener('click', event => {
                    const addButton = event.target.closest('[data-my-recipe-add-id]');
                    if (addButton) {
                        event.preventDefault();
                        event.stopPropagation();
                        openMyRecipeAddModal(addButton.dataset.myRecipeAddId);
                        return;
                    }
                    const editButton = event.target.closest('[data-my-recipe-edit-id]');
                    if (editButton) {
                        event.preventDefault();
                        event.stopPropagation();
                        openMyRecipeEditForm(editButton.dataset.myRecipeEditId);
                        return;
                    }
                    const card = event.target.closest('[data-my-recipe-id]');
                    if (card) openMyRecipeDetailsModal(card.dataset.myRecipeId);
                });
                list.addEventListener('keydown', event => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    if (event.target.closest('button')) return;
                    const card = event.target.closest('[data-my-recipe-id]');
                    if (!card) return;
                    event.preventDefault();
                    openMyRecipeDetailsModal(card.dataset.myRecipeId);
                });
            }

            const form = document.getElementById('my-recipe-form');
            if (form && !form.dataset.myRecipeProductEventsBound) {
                form.dataset.myRecipeProductEventsBound = '1';
                form.addEventListener('click', event => {
                    const suggestion = event.target.closest('[data-my-recipe-suggestion-id]');
                    if (suggestion) {
                        event.preventDefault();
                        selectMyRecipeIngredientSuggestion(suggestion.dataset.myRecipeSuggestionIngredient, suggestion.dataset.myRecipeSuggestionId);
                        return;
                    }
                    const button = event.target.closest('[data-my-recipe-product-picker-id]');
                    if (!button) return;
                    event.preventDefault();
                    openMyRecipeProductPicker(button.dataset.myRecipeProductPickerId);
                });
                form.addEventListener('focusin', event => {
                    const input = event.target.closest('[data-my-recipe-ingredient-name-id]');
                    if (!input) return;
                    renderMyRecipeIngredientSuggestions(input.dataset.myRecipeIngredientNameId);
                });
            }

            const detailsModal = document.getElementById('my-recipe-details-modal');
            if (detailsModal && !detailsModal.dataset.myRecipeEventsBound) {
                detailsModal.dataset.myRecipeEventsBound = '1';
                detailsModal.addEventListener('click', event => {
                    if (event.target === detailsModal || event.target.closest('[data-my-recipe-details-close]')) {
                        event.preventDefault();
                        closeMyRecipeDetailsModal();
                        return;
                    }
                    if (event.target.closest('[data-my-recipe-details-add]')) {
                        event.preventDefault();
                        addMyRecipeFromDetails();
                        return;
                    }
                    if (event.target.closest('[data-my-recipe-details-edit]')) {
                        event.preventDefault();
                        editMyRecipeFromDetails();
                        return;
                    }
                    if (event.target.closest('[data-my-recipe-details-delete]')) {
                        event.preventDefault();
                        deleteMyRecipeFromDetails();
                    }
                });
            }

            const pickerModal = document.getElementById('my-recipe-product-picker-modal');
            if (pickerModal && !pickerModal.dataset.myRecipeEventsBound) {
                pickerModal.dataset.myRecipeEventsBound = '1';
                pickerModal.addEventListener('click', event => {
                    if (event.target === pickerModal || event.target.closest('[data-my-recipe-product-picker-close]')) {
                        event.preventDefault();
                        closeMyRecipeProductPicker();
                    }
                });
            }

            const pickerSearch = document.getElementById('my-recipe-product-picker-search');
            if (pickerSearch && !pickerSearch.dataset.myRecipeEventsBound) {
                pickerSearch.dataset.myRecipeEventsBound = '1';
                pickerSearch.addEventListener('input', renderMyRecipeProductPicker);
            }

            const pickerList = document.getElementById('my-recipe-product-picker-list');
            if (pickerList && !pickerList.dataset.myRecipeEventsBound) {
                pickerList.dataset.myRecipeEventsBound = '1';
                pickerList.addEventListener('click', event => {
                    const product = event.target.closest('[data-product-id]');
                    if (!product) return;
                    event.preventDefault();
                    selectMyRecipeIngredientProduct(product.dataset.productId);
                });
            }

            document.addEventListener('click', event => {
                if (event.target.closest('.my-recipe-ingredient-name-wrap')) return;
                closeMyRecipeIngredientSuggestions();
            });
        }

        bindMyRecipeModalEvents();

        Object.assign(window, {
            openMyRecipeDetailsModal,
            closeMyRecipeDetailsModal,
            addMyRecipeFromDetails,
            editMyRecipeFromDetails,
            deleteMyRecipeFromDetails,
            setMyRecipeDetailsPortionGrams,
            stepMyRecipeDetailsPortion,
            openMyRecipeEditForm,
            renderMyRecipeProductPicker,
            openMyRecipeProductPicker,
            closeMyRecipeProductPicker,
            selectMyRecipeIngredientProduct,
            handleMyRecipeIngredientNameInput
        });

        function setMyRecipeAddError(message = '') {
            const error = document.getElementById('my-recipe-add-error');
            if (!error) return;
            error.textContent = message;
            error.classList.toggle('active', Boolean(message));
        }

        function getMyRecipeAddNumber(id) {
            const raw = document.getElementById(id)?.value;
            if (raw === '' || raw === null || raw === undefined) return 0;
            return Number(String(raw).replace(',', '.'));
        }

        function hasValidMyRecipePer100(recipe) {
            const n = recipe?.per100Nutrition;
            return Boolean(n) && ['calories','protein','fat','carbs'].every(key => Number.isFinite(Number(n[key])) && Number(n[key]) >= 0);
        }

        function getMyRecipeAddTotals() {
            const recipe = selectedMyRecipeForDiary;
            const grams = getMyRecipeAddNumber('my-recipe-add-grams');
            const ratio = grams > 0 ? grams / 100 : 0;
            const n = recipe?.per100Nutrition || {};
            return {
                grams,
                kcal: (Number(n.calories) || 0) * ratio,
                protein: (Number(n.protein) || 0) * ratio,
                fat: (Number(n.fat) || 0) * ratio,
                carbs: (Number(n.carbs) || 0) * ratio
            };
        }

        function updateMyRecipeAddTotals() {
            const totals = getMyRecipeAddTotals();
            setText('my-recipe-add-total-kcal', String(Math.round(Math.max(0, totals.kcal || 0))));
            setText('my-recipe-add-total-protein', (Math.max(0, totals.protein || 0)).toFixed(1) + ' г');
            setText('my-recipe-add-total-fat', (Math.max(0, totals.fat || 0)).toFixed(1) + ' г');
            setText('my-recipe-add-total-carbs', (Math.max(0, totals.carbs || 0)).toFixed(1) + ' г');
        }

        function openMyRecipeAddModal(recipeId, options = {}) {
            const recipe = loadManualRecipes().find(item => String(item.id) === String(recipeId));
            const resolved = recipe ? resolveMyRecipeDetailsNutrition(recipe) : null;
            selectedMyRecipeForDiary = recipe && resolved ? {
                ...recipe,
                per100Nutrition: {
                    calories: resolved.per100.calories,
                    protein: resolved.per100.protein,
                    fat: resolved.per100.fat,
                    carbs: resolved.per100.carbs
                }
            } : null;
            setMyRecipeAddError('');
            setText('my-recipe-add-name', selectedMyRecipeForDiary?.name || 'Рецепт');
            setText('my-recipe-add-per100', 'На 100 г: ' + formatMyRecipePer100Line(selectedMyRecipeForDiary));
            const mealType = document.getElementById('my-recipe-add-meal-type');
            if (mealType) {
                mealType.value = isDiaryMealScreenOpen() ? getValidMealType(currentDiaryMealType, 'Обед') : getValidMealType(selectedMyRecipeForDiary?.category, 'Обед');
                mealType.disabled = isDiaryMealScreenOpen();
            }
            const grams = document.getElementById('my-recipe-add-grams');
            if (grams) grams.value = Number(options?.grams) > 0 ? String(Math.round(Number(options.grams))) : '';
            updateMyRecipeAddTotals();
            setLockedLayer('my-recipe-add', document.getElementById('my-recipe-add-modal'), true);
            setTimeout(() => grams?.focus?.(), 120);
        }

        function closeMyRecipeAddModal() {
            setLockedLayer('my-recipe-add', document.getElementById('my-recipe-add-modal'), false);
            selectedMyRecipeForDiary = null;
            setMyRecipeAddError('');
        }

        async function submitMyRecipeDiaryAdd(event) {
            event?.preventDefault?.();
            const recipe = selectedMyRecipeForDiary;
            const mealType = document.getElementById('my-recipe-add-meal-type')?.value || '';
            const totals = getMyRecipeAddTotals();
            if (!recipe) return setMyRecipeAddError('Выберите рецепт.');
            if (!mealType) return setMyRecipeAddError('Выберите приём пищи.');
            if (!hasValidMyRecipePer100(recipe)) return setMyRecipeAddError('У рецепта нет данных КБЖУ на 100 г.');
            if (!Number.isFinite(totals.grams) || totals.grams <= 0) return setMyRecipeAddError('Граммы должны быть больше 0.');
            const createdAt = selectedDateTimeISO();
            addManualLocalMeal({
                type: 'manual-recipe-entry',
                recipeId: recipe.id,
                name: recipe.name,
                recipe_title: recipe.name,
                grams: totals.grams,
                calories_per_100: Number(recipe.per100Nutrition.calories) || 0,
                protein_per_100: Number(recipe.per100Nutrition.protein) || 0,
                fat_per_100: Number(recipe.per100Nutrition.fat) || 0,
                carbs_per_100: Number(recipe.per100Nutrition.carbs) || 0,
                calories: totals.kcal,
                kcal: totals.kcal,
                protein: totals.protein,
                fat: totals.fat,
                carbs: totals.carbs,
                mealType,
                meal_type: mealType,
                createdAt,
                created_at: createdAt,
                ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : []
            });
            closeMyRecipeAddModal();
            closeMyRecipesModal();
            await refreshAllData();
            if (isDiaryMealScreenOpen()) renderDiaryMealContent();
            document.getElementById('history-list')?.classList.add('success-flash');
            setTimeout(() => document.getElementById('history-list')?.classList.remove('success-flash'), 700);
            showToast('Добавлено в ' + mealType);
        }

        function setMyRecipeFormError(message = '') {
            const error = document.getElementById('my-recipe-form-error');
            if (!error) return;
            error.textContent = message;
            error.classList.toggle('active', Boolean(message));
        }

        function getMyRecipeIngredientValue(id, field) {
            return document.getElementById('my-recipe-ingredient-' + id + '-' + field)?.value || '';
        }

        function collectMyRecipeIngredientValues() {
            return myRecipeIngredientIds.map(id => ({
                id,
                name: getMyRecipeIngredientValue(id, 'name'),
                grams: getMyRecipeIngredientValue(id, 'grams'),
                kcal100: getMyRecipeIngredientValue(id, 'kcal100'),
                protein100: getMyRecipeIngredientValue(id, 'protein100'),
                fat100: getMyRecipeIngredientValue(id, 'fat100'),
                carbs100: getMyRecipeIngredientValue(id, 'carbs100')
            }));
        }

        function setMyRecipeCalcText(id, value, digits = 1) {
            const el = document.getElementById(id);
            if (!el) return;
            const number = Number(value) || 0;
            el.textContent = digits === 0 ? String(Math.round(number)) : number.toFixed(digits);
        }

        function setMyRecipeCalcOptionalText(id, value, digits = 1) {
            const el = document.getElementById(id);
            if (!el) return;
            const number = Number(value);
            el.textContent = Number.isFinite(number) && number > 0
                ? (digits === 0 ? String(Math.round(number)) : number.toFixed(digits))
                : '—';
        }

        function markMyRecipeCookedWeightEdited() {
            myRecipeCookedWeightTouched = true;
        }

        function getMyRecipeStepMeta(step = myRecipeCreateStep) {
            if (step === 2) return { kicker: 'Шаг 2 из 3', title: 'Рецепт' };
            if (step === 3) return { kicker: 'Шаг 3 из 3', title: 'Итог' };
            return { kicker: 'Шаг 1 из 3', title: 'Ингредиенты' };
        }

        function setMyRecipeCreateStep(step, options = {}) {
            myRecipeCreateStep = Math.min(3, Math.max(1, Number(step) || 1));
            closeMyRecipeIngredientSuggestions();
            const meta = getMyRecipeStepMeta(myRecipeCreateStep);
            setText('my-recipe-step-kicker', meta.kicker);
            setText('my-recipe-step-title', meta.title);
            document.querySelectorAll('[data-my-recipe-step]').forEach(panel => {
                panel.classList.toggle('active', Number(panel.dataset.myRecipeStep) === myRecipeCreateStep);
            });
            document.querySelectorAll('[data-my-recipe-step-pill]').forEach(pill => {
                const isActive = Number(pill.dataset.myRecipeStepPill) === myRecipeCreateStep;
                pill.classList.toggle('active', isActive);
                pill.setAttribute('aria-current', isActive ? 'step' : 'false');
            });
            const primary = document.getElementById('my-recipe-primary-action');
            if (primary) primary.textContent = myRecipeCreateStep === 3 ? (editingMyRecipeId ? 'Сохранить изменения' : 'Сохранить рецепт') : 'Далее';
            const back = document.querySelector('.my-recipe-back-btn');
            if (back) back.textContent = myRecipeCreateStep === 1 ? 'Назад' : 'Назад';
            setMyRecipeFormError('');
            if (myRecipeCreateStep === 2 && !options.keepCookedWeight) syncMyRecipeCookedWeightFromIngredients();
            updateMyRecipeCalculation();
            document.getElementById('my-recipe-form')?.scrollTo?.({ top: 0, behavior: options.instant ? 'auto' : 'smooth' });
        }

        function syncMyRecipeCookedWeightFromIngredients() {
            if (myRecipeCookedWeightTouched) return;
            const weightInput = document.getElementById('my-recipe-weight-input');
            if (!weightInput) return;
            const rawWeight = calculateMyRecipeNutrition().totals.ingredientGrams;
            if (rawWeight > 0) weightInput.value = String(Math.round(rawWeight));
        }

        function calculateMyRecipeNutrition() {
            const ingredients = collectMyRecipeIngredientValues();
            const totals = ingredients.reduce((sum, ingredient) => {
                const grams = Math.max(0, parseMyRecipeNumber(ingredient.grams));
                const ratio = grams / 100;
                sum.ingredientGrams += grams;
                sum.kcal += Math.max(0, parseMyRecipeNumber(ingredient.kcal100)) * ratio;
                sum.protein += Math.max(0, parseMyRecipeNumber(ingredient.protein100)) * ratio;
                sum.fat += Math.max(0, parseMyRecipeNumber(ingredient.fat100)) * ratio;
                sum.carbs += Math.max(0, parseMyRecipeNumber(ingredient.carbs100)) * ratio;
                return sum;
            }, { ingredientGrams: 0, kcal: 0, protein: 0, fat: 0, carbs: 0 });
            const cookedWeightInput = getMyRecipeFormNumber('my-recipe-weight-input');
            const cookedWeight = cookedWeightInput > 0 ? cookedWeightInput : totals.ingredientGrams;
            const servings = getMyRecipeFormNumber('my-recipe-servings-input');
            const per100Ratio = cookedWeight > 0 ? 100 / cookedWeight : 0;
            const servingRatio = servings > 0 ? 1 / servings : 0;
            const portionWeight = cookedWeight > 0 && servings > 0 ? cookedWeight / servings : 0;
            return {
                totals,
                cookedWeightInput,
                cookedWeight,
                usesFallbackWeight: !(cookedWeightInput > 0),
                servings,
                portionWeight,
                per100: {
                    kcal: totals.kcal * per100Ratio,
                    protein: totals.protein * per100Ratio,
                    fat: totals.fat * per100Ratio,
                    carbs: totals.carbs * per100Ratio
                },
                serving: {
                    kcal: totals.kcal * servingRatio,
                    protein: totals.protein * servingRatio,
                    fat: totals.fat * servingRatio,
                    carbs: totals.carbs * servingRatio
                }
            };
        }

        function updateMyRecipeCalculation() {
            const calc = calculateMyRecipeNutrition();
            const active = calc.per100;
            setMyRecipeCalcText('my-recipe-raw-weight', calc.totals.ingredientGrams, 0);
            setMyRecipeCalcText('my-recipe-total-kcal', calc.totals.kcal, 0);
            setMyRecipeCalcText('my-recipe-total-protein', calc.totals.protein);
            setMyRecipeCalcText('my-recipe-total-fat', calc.totals.fat);
            setMyRecipeCalcText('my-recipe-total-carbs', calc.totals.carbs);
            setMyRecipeCalcText('my-recipe-final-total-kcal', calc.totals.kcal, 0);
            setMyRecipeCalcText('my-recipe-final-total-protein', calc.totals.protein);
            setMyRecipeCalcText('my-recipe-final-total-fat', calc.totals.fat);
            setMyRecipeCalcText('my-recipe-final-total-carbs', calc.totals.carbs);
            setMyRecipeCalcText('my-recipe-active-kcal', active.kcal, 0);
            setMyRecipeCalcText('my-recipe-active-protein', active.protein);
            setMyRecipeCalcText('my-recipe-active-fat', active.fat);
            setMyRecipeCalcText('my-recipe-active-carbs', active.carbs);
            setMyRecipeCalcOptionalText('my-recipe-serving-weight', calc.portionWeight, 0);
            setMyRecipeCalcOptionalText('my-recipe-serving-kcal', calc.serving.kcal, 0);
            setMyRecipeCalcOptionalText('my-recipe-serving-protein', calc.serving.protein);
            setMyRecipeCalcOptionalText('my-recipe-serving-fat', calc.serving.fat);
            setMyRecipeCalcOptionalText('my-recipe-serving-carbs', calc.serving.carbs);
            setText('my-recipe-summary-meta', 'Сырой вес ингредиентов: ' + Math.round(calc.totals.ingredientGrams) + ' г · Вес готового блюда: ' + Math.round(calc.cookedWeightInput || calc.cookedWeight || 0) + ' г · Порций: ' + (calc.servings > 0 ? formatMyRecipeDetailNumber(calc.servings, 0) : '—'));
            const portionMessage = calc.cookedWeightInput > 0
                ? (calc.servings > 0 ? 'Вес одной порции: ' + Math.round(calc.portionWeight) + ' г' : 'Укажи количество порций, чтобы рассчитать вес порции.')
                : 'Укажи вес готового блюда для точного расчёта.';
            setText('my-recipe-portion-weight-line', portionMessage);
            setText('my-recipe-serving-hint', calc.cookedWeightInput > 0 && calc.servings > 0 ? 'Вес порции: ' + Math.round(calc.portionWeight) + ' г' : portionMessage);
            const weightHint = document.getElementById('my-recipe-weight-hint');
            if (weightHint) weightHint.hidden = !calc.usesFallbackWeight;
        }

        function renderMyRecipeIngredients(values = null) {
            const list = document.getElementById('my-recipe-ingredients-list');
            if (!list) return;
            closeMyRecipeIngredientSuggestions();
            const ingredientValues = values || myRecipeIngredientIds.map(id => ({ id }));
            const canRemove = ingredientValues.length > 1;
            list.innerHTML = ingredientValues.map((ingredient, index) => {
                const id = ingredient.id;
                const removeButton = canRemove
                    ? '<button class="my-recipe-remove-ingredient-btn" type="button" onclick="removeMyRecipeIngredient(' + id + ')">Удалить</button>'
                    : '';
                const sourceBadge = myRecipeIngredientProductSources.get(Number(id)) === 'manual-product' && String(ingredient.name || '').trim()
                    ? '<span class="my-recipe-ingredient-source" id="my-recipe-ingredient-' + id + '-source">Из моих продуктов</span>'
                    : '<span class="my-recipe-ingredient-source" id="my-recipe-ingredient-' + id + '-source" hidden></span>';
                return '<section class="my-recipe-ingredient-card">' +
                    '<div class="my-recipe-ingredient-card-head"><b>Ингредиент ' + (index + 1) + '</b><div class="my-recipe-ingredient-card-meta">' + sourceBadge + removeButton + '</div></div>' +
                    '<label class="my-recipe-field my-recipe-field-wide my-recipe-ingredient-name-wrap"><span>Название ингредиента</span><input id="my-recipe-ingredient-' + id + '-name" data-my-recipe-ingredient-name-id="' + id + '" type="text" maxlength="80" placeholder="Например, рис" value="' + escapeAttr(ingredient.name || '') + '" oninput="handleMyRecipeIngredientNameInput(' + id + ')"><div class="my-recipe-ingredient-suggestions" id="my-recipe-ingredient-' + id + '-suggestions" data-my-recipe-suggestions-for="' + id + '" hidden></div></label>' +
                    '<div class="my-recipe-grid">' +
                    '<label class="my-recipe-field"><span>Вес, г</span><input id="my-recipe-ingredient-' + id + '-grams" type="number" inputmode="decimal" min="1" step="1" placeholder="100" value="' + escapeAttr(ingredient.grams || '') + '" oninput="updateMyRecipeCalculation()"></label>' +
                    '<label class="my-recipe-field"><span>Ккал / 100 г</span><input id="my-recipe-ingredient-' + id + '-kcal100" type="number" inputmode="decimal" min="0" step="0.1" placeholder="0" value="' + escapeAttr(ingredient.kcal100 || '') + '" oninput="updateMyRecipeCalculation()"></label>' +
                    '<label class="my-recipe-field"><span>Белки / 100 г</span><input id="my-recipe-ingredient-' + id + '-protein100" type="number" inputmode="decimal" min="0" step="0.1" placeholder="0" value="' + escapeAttr(ingredient.protein100 || '') + '" oninput="updateMyRecipeCalculation()"></label>' +
                    '<label class="my-recipe-field"><span>Жиры / 100 г</span><input id="my-recipe-ingredient-' + id + '-fat100" type="number" inputmode="decimal" min="0" step="0.1" placeholder="0" value="' + escapeAttr(ingredient.fat100 || '') + '" oninput="updateMyRecipeCalculation()"></label>' +
                    '<label class="my-recipe-field"><span>Углеводы / 100 г</span><input id="my-recipe-ingredient-' + id + '-carbs100" type="number" inputmode="decimal" min="0" step="0.1" placeholder="0" value="' + escapeAttr(ingredient.carbs100 || '') + '" oninput="updateMyRecipeCalculation()"></label>' +
                    '</div>' +
                    '<button class="my-recipe-products-stub-btn" type="button" data-my-recipe-product-picker-id="' + id + '">Выбрать из моих продуктов</button>' +
                    '</section>';
            }).join('');
            updateMyRecipeCalculation();
        }

        function resetMyRecipeIngredients() {
            myRecipeIngredientSeq += 1;
            myRecipeIngredientIds = [myRecipeIngredientSeq];
            myRecipeIngredientProductSources.clear();
            renderMyRecipeIngredients();
        }

        function addMyRecipeIngredient() {
            const values = collectMyRecipeIngredientValues();
            myRecipeIngredientSeq += 1;
            values.push({ id: myRecipeIngredientSeq });
            myRecipeIngredientIds = values.map(item => item.id);
            renderMyRecipeIngredients(values);
            updateMyRecipeCalculation();
        }

        function removeMyRecipeIngredient(id) {
            if (myRecipeIngredientIds.length <= 1) return;
            const values = collectMyRecipeIngredientValues().filter(item => Number(item.id) !== Number(id));
            myRecipeIngredientProductSources.delete(Number(id));
            myRecipeIngredientIds = values.map(item => item.id);
            renderMyRecipeIngredients(values);
            updateMyRecipeCalculation();
        }

        function resetMyRecipeCreateForm() {
            setMyRecipeFormError('');
            editingMyRecipeId = null;
            myRecipeCookedWeightTouched = false;
            const submit = document.querySelector('.my-recipe-next-btn');
            if (submit) submit.textContent = 'Далее';
            ['my-recipe-title-input','my-recipe-weight-input','my-recipe-servings-input','my-recipe-description-input'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            const category = document.getElementById('my-recipe-category-input');
            if (category) category.value = 'Обед';
            resetMyRecipeIngredients();
            setMyRecipeCreateStep(1, { instant: true, keepCookedWeight: true });
            updateMyRecipeCalculation();
        }

        function setMyRecipeFormInputValue(id, value) {
            const el = document.getElementById(id);
            if (el) el.value = value ?? '';
        }

        function formatMyRecipeEditableNumber(value) {
            const number = Number(value);
            return Number.isFinite(number) ? String(number) : '';
        }

        function populateMyRecipeForm(recipe) {
            setMyRecipeFormError('');
            editingMyRecipeId = String(recipe.id || '');
            myRecipeCookedWeightTouched = true;
            myRecipeIngredientProductSources.clear();
            setMyRecipeFormInputValue('my-recipe-title-input', recipe.name || '');
            const category = document.getElementById('my-recipe-category-input');
            if (category) category.value = ['Завтрак','Обед','Ужин','Перекус'].includes(recipe.category) ? recipe.category : 'Обед';
            setMyRecipeFormInputValue('my-recipe-weight-input', formatMyRecipeEditableNumber(recipe.cookedWeight));
            setMyRecipeFormInputValue('my-recipe-servings-input', Number(recipe.servings) > 0 ? formatMyRecipeEditableNumber(recipe.servings) : '');
            setMyRecipeFormInputValue('my-recipe-description-input', recipe.description || '');
            const ingredients = (Array.isArray(recipe.ingredients) && recipe.ingredients.length ? recipe.ingredients : [{}]).map(ingredient => {
                myRecipeIngredientSeq += 1;
                return {
                    id: myRecipeIngredientSeq,
                    name: ingredient.name || '',
                    grams: formatMyRecipeEditableNumber(ingredient.grams),
                    kcal100: formatMyRecipeEditableNumber(ingredient.caloriesPer100),
                    protein100: formatMyRecipeEditableNumber(ingredient.proteinPer100),
                    fat100: formatMyRecipeEditableNumber(ingredient.fatPer100),
                    carbs100: formatMyRecipeEditableNumber(ingredient.carbsPer100)
                };
            });
            myRecipeIngredientIds = ingredients.map(item => item.id);
            renderMyRecipeIngredients(ingredients);
            const submit = document.querySelector('.my-recipe-next-btn');
            if (submit) submit.textContent = 'Далее';
            setMyRecipeCreateStep(1, { instant: true, keepCookedWeight: true });
            updateMyRecipeCalculation();
        }

        function showMyRecipesEmptyView() {
            editingMyRecipeId = null;
            myRecipeReturnToDiaryAfterSave = false;
            setMyRecipeFormScreen(false);
            setText('my-recipes-title', 'Мои рецепты');
            const submit = document.querySelector('.my-recipe-next-btn');
            if (submit) submit.textContent = 'Сохранить рецепт';
            renderMyRecipesList();
            document.getElementById('my-recipe-form')?.setAttribute('hidden', '');
            setMyRecipeFormError('');
        }

        function handleMyRecipeFormBack() {
            if (myRecipeCreateStep > 1) {
                setMyRecipeCreateStep(myRecipeCreateStep - 1);
                return;
            }
            if (myRecipeReturnToDiaryAfterSave && isDiaryMealScreenOpen()) {
                closeMyRecipesModal();
                return;
            }
            showMyRecipesEmptyView();
        }

        function openMyRecipeCreateForm(options = {}) {
            resetMyRecipeCreateForm();
            myRecipeReturnToDiaryAfterSave = Boolean(options.returnToDiary);
            const category = document.getElementById('my-recipe-category-input');
            if (category && options?.mealType) category.value = getValidMealType(options.mealType, category.value || 'Обед');
            document.getElementById('my-recipes-empty-view')?.setAttribute('hidden', '');
            document.getElementById('my-recipes-list-view')?.setAttribute('hidden', '');
            document.getElementById('my-recipe-form')?.removeAttribute('hidden');
            setMyRecipeFormScreen(true);
            setText('my-recipes-title', 'Создать рецепт');
            setTimeout(() => document.querySelector('[id^="my-recipe-ingredient-"][id$="-name"]')?.focus?.(), 120);
        }

        function openMyRecipeEditForm(recipeId) {
            myRecipeReturnToDiaryAfterSave = false;
            const recipe = loadManualRecipes().find(item => String(item.id) === String(recipeId));
            if (!recipe) return showToast('Рецепт не найден');
            populateMyRecipeForm(recipe);
            document.getElementById('my-recipes-empty-view')?.setAttribute('hidden', '');
            document.getElementById('my-recipes-list-view')?.setAttribute('hidden', '');
            document.getElementById('my-recipe-form')?.removeAttribute('hidden');
            setMyRecipeFormScreen(true);
            setText('my-recipes-title', 'Редактировать рецепт');
            setTimeout(() => document.querySelector('[id^="my-recipe-ingredient-"][id$="-name"]')?.focus?.(), 120);
        }

        function getMyRecipeFormNumber(id) {
            const raw = document.getElementById(id)?.value;
            if (raw === '' || raw === null || raw === undefined) return 0;
            return Number(String(raw).replace(',', '.'));
        }

        function parseMyRecipeNumber(value) {
            if (value === '' || value === null || value === undefined) return 0;
            return Number(String(value).replace(',', '.'));
        }

        function validateMyRecipeIngredientsStep() {
            const ingredients = collectMyRecipeIngredientValues();
            if (!ingredients.length) return 'Добавьте хотя бы один ингредиент.';
            for (let i = 0; i < ingredients.length; i += 1) {
                const ingredient = ingredients[i];
                const label = 'Ингредиент ' + (i + 1);
                const grams = parseMyRecipeNumber(ingredient.grams);
                const macros = [
                    ['Калории', parseMyRecipeNumber(ingredient.kcal100)],
                    ['Белки', parseMyRecipeNumber(ingredient.protein100)],
                    ['Жиры', parseMyRecipeNumber(ingredient.fat100)],
                    ['Углеводы', parseMyRecipeNumber(ingredient.carbs100)]
                ];
                if (!String(ingredient.name || '').trim()) return label + ': введите название.';
                if (!Number.isFinite(grams) || grams <= 0) return label + ': вес должен быть больше 0 г.';
                const invalidMacro = macros.find(([, value]) => !Number.isFinite(value) || value < 0);
                if (invalidMacro) return label + ': ' + invalidMacro[0].toLowerCase() + ' на 100 г не должны быть отрицательными.';
            }
            return '';
        }

        function validateMyRecipeDetailsStep() {
            const title = (document.getElementById('my-recipe-title-input')?.value || '').trim();
            const category = document.getElementById('my-recipe-category-input')?.value || '';
            const weight = getMyRecipeFormNumber('my-recipe-weight-input');
            const servings = getMyRecipeFormNumber('my-recipe-servings-input');
            if (!title) return 'Введите название рецепта.';
            if (!category) return 'Выберите категорию рецепта.';
            if (!Number.isFinite(weight) || weight <= 0) return 'Итоговый вес готового блюда должен быть больше 0 г.';
            if (!Number.isFinite(servings) || servings <= 0) return 'Количество порций должно быть больше 0.';
            return '';
        }

        function hasFiniteMyRecipeNutrition(values) {
            return ['kcal','protein','fat','carbs'].every(key => Number.isFinite(Number(values?.[key])) && Number(values[key]) >= 0);
        }

        function validateMyRecipeFinalCalculation() {
            const calc = calculateMyRecipeNutrition();
            if (!Number.isFinite(calc.totals.ingredientGrams) || calc.totals.ingredientGrams <= 0) return 'Добавьте ингредиенты с весом больше 0 г.';
            if (!Number.isFinite(calc.cookedWeightInput) || calc.cookedWeightInput <= 0) return 'Итоговый вес готового блюда должен быть больше 0 г.';
            if (!Number.isFinite(calc.servings) || calc.servings <= 0) return 'Количество порций должно быть больше 0.';
            if (!Number.isFinite(calc.portionWeight) || calc.portionWeight <= 0) return 'Вес порции не рассчитан. Проверьте вес блюда и количество порций.';
            if (!hasFiniteMyRecipeNutrition(calc.totals)) return 'Суммарное КБЖУ рецепта не рассчитано.';
            if (!hasFiniteMyRecipeNutrition(calc.per100)) return 'КБЖУ на 100 г не рассчитано.';
            if (!hasFiniteMyRecipeNutrition(calc.serving)) return 'КБЖУ на порцию не рассчитано.';
            return '';
        }

        function validateMyRecipeCreateForm() {
            return validateMyRecipeIngredientsStep() || validateMyRecipeDetailsStep() || validateMyRecipeFinalCalculation();
        }

        function handleMyRecipePrimaryAction() {
            if (myRecipeCreateStep === 1) {
                const error = validateMyRecipeIngredientsStep();
                if (error) return setMyRecipeFormError(error);
                setMyRecipeCreateStep(2);
                return;
            }
            if (myRecipeCreateStep === 2) {
                const error = validateMyRecipeDetailsStep();
                if (error) return setMyRecipeFormError(error);
                setMyRecipeCreateStep(3);
                return;
            }
            submitMyRecipeCreateForm();
        }

        function buildManualRecipeFromForm(existingRecipe = null) {
            const now = new Date().toISOString();
            const calc = calculateMyRecipeNutrition();
            const servings = getMyRecipeFormNumber('my-recipe-servings-input');
            const cookedWeight = getMyRecipeFormNumber('my-recipe-weight-input');
            const ingredients = collectMyRecipeIngredientValues().map(ingredient => ({
                name: String(ingredient.name || '').trim(),
                grams: parseMyRecipeNumber(ingredient.grams),
                caloriesPer100: parseMyRecipeNumber(ingredient.kcal100),
                proteinPer100: parseMyRecipeNumber(ingredient.protein100),
                fatPer100: parseMyRecipeNumber(ingredient.fat100),
                carbsPer100: parseMyRecipeNumber(ingredient.carbs100)
            }));
            return {
                id: existingRecipe?.id || 'manual_recipe_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                type: 'manual-recipe',
                name: (document.getElementById('my-recipe-title-input')?.value || '').trim(),
                category: document.getElementById('my-recipe-category-input')?.value || 'Обед',
                description: (document.getElementById('my-recipe-description-input')?.value || '').trim(),
                rawIngredientsWeight: calc.totals.ingredientGrams,
                cookedWeight,
                servings,
                portionWeight: cookedWeight / servings,
                ingredients,
                totalNutrition: {
                    calories: calc.totals.kcal,
                    protein: calc.totals.protein,
                    fat: calc.totals.fat,
                    carbs: calc.totals.carbs
                },
                per100Nutrition: {
                    calories: calc.per100.kcal,
                    protein: calc.per100.protein,
                    fat: calc.per100.fat,
                    carbs: calc.per100.carbs
                },
                perServingNutrition: {
                    calories: calc.serving.kcal,
                    protein: calc.serving.protein,
                    fat: calc.serving.fat,
                    carbs: calc.serving.carbs
                },
                createdAt: existingRecipe?.createdAt || now,
                updatedAt: now
            };
        }

        function submitMyRecipeCreateForm(event) {
            event?.preventDefault?.();
            if (myRecipeCreateStep < 3) {
                handleMyRecipePrimaryAction();
                return;
            }
            const error = validateMyRecipeCreateForm();
            if (error) {
                setMyRecipeFormError(error);
                return;
            }
            setMyRecipeFormError('');
            updateMyRecipeCalculation();
            const recipes = loadManualRecipes();
            if (editingMyRecipeId) {
                const index = recipes.findIndex(recipe => String(recipe.id) === String(editingMyRecipeId));
                if (index < 0) {
                    setMyRecipeFormError('Рецепт не найден. Закрой форму и попробуй снова.');
                    return;
                }
                recipes[index] = buildManualRecipeFromForm(recipes[index]);
                saveManualRecipes(recipes);
                editingMyRecipeId = null;
                showMyRecipesEmptyView();
                showToast('Изменения сохранены');
                return;
            }
            recipes.unshift(buildManualRecipeFromForm());
            saveManualRecipes(recipes);
            if (myRecipeReturnToDiaryAfterSave && isDiaryMealScreenOpen()) {
                myRecipeReturnToDiaryAfterSave = false;
                closeMyRecipesModal();
                renderDiaryMealContent();
                showToast('Рецепт создан');
                return;
            }
            showMyRecipesEmptyView();
            showToast('Рецепт сохранён');
        }

        function getManualMealNumber(id) {
            const raw = document.getElementById(id)?.value;
            if (raw === '' || raw === null || raw === undefined) return 0;
            return Number(String(raw).replace(',', '.'));
        }

        function getManualMealInputMode() {
            return document.getElementById('manual-meal-mode-portion')?.classList.contains('active') ? 'portion' : 'per100';
        }

        function setManualMealInputMode(mode = 'per100') {
            const inputMode = mode === 'portion' ? 'portion' : 'per100';
            document.getElementById('manual-meal-mode-per100')?.classList.toggle('active', inputMode === 'per100');
            document.getElementById('manual-meal-mode-portion')?.classList.toggle('active', inputMode === 'portion');
            document.getElementById('manual-meal-mode-per100')?.setAttribute('aria-pressed', inputMode === 'per100' ? 'true' : 'false');
            document.getElementById('manual-meal-mode-portion')?.setAttribute('aria-pressed', inputMode === 'portion' ? 'true' : 'false');
            setText('manual-meal-kcal-label', inputMode === 'portion' ? 'Ккал за порцию' : 'Ккал / 100 г');
            setText('manual-meal-protein-label', inputMode === 'portion' ? 'Белки за порцию' : 'Белки / 100 г');
            setText('manual-meal-fat-label', inputMode === 'portion' ? 'Жиры за порцию' : 'Жиры / 100 г');
            setText('manual-meal-carbs-label', inputMode === 'portion' ? 'Углеводы за порцию' : 'Углеводы / 100 г');
            updateManualMealTotals();
        }

        function calculateManualMealTotals() {
            const grams = getManualMealNumber('manual-meal-grams');
            const inputMode = getManualMealInputMode();
            const ratio = grams > 0 ? grams / 100 : 0;
            const multiplierTo100 = grams > 0 ? 100 / grams : 0;
            const kcalInput = getManualMealNumber('manual-meal-kcal100');
            const proteinInput = getManualMealNumber('manual-meal-protein100');
            const fatInput = getManualMealNumber('manual-meal-fat100');
            const carbsInput = getManualMealNumber('manual-meal-carbs100');
            const fromPortion = inputMode === 'portion';
            return {
                inputMode,
                grams,
                kcal100: fromPortion ? kcalInput * multiplierTo100 : kcalInput,
                protein100: fromPortion ? proteinInput * multiplierTo100 : proteinInput,
                fat100: fromPortion ? fatInput * multiplierTo100 : fatInput,
                carbs100: fromPortion ? carbsInput * multiplierTo100 : carbsInput,
                kcal: fromPortion ? kcalInput : kcalInput * ratio,
                protein: fromPortion ? proteinInput : proteinInput * ratio,
                fat: fromPortion ? fatInput : fatInput * ratio,
                carbs: fromPortion ? carbsInput : carbsInput * ratio
            };
        }

        function setManualMealError(message = '') {
            const el = document.getElementById('manual-meal-error');
            if (!el) return;
            el.textContent = message;
            el.classList.toggle('active', Boolean(message));
        }

        function updateManualMealTotals() {
            const totals = calculateManualMealTotals();
            setText('manual-total-kcal', String(Math.round(Math.max(0, totals.kcal || 0))));
            setText('manual-total-protein', (Math.max(0, totals.protein || 0)).toFixed(1) + ' г');
            setText('manual-total-fat', (Math.max(0, totals.fat || 0)).toFixed(1) + ' г');
            setText('manual-total-carbs', (Math.max(0, totals.carbs || 0)).toFixed(1) + ' г');
        }

        function renderManualProductsList() {
            const products = getSortedManualProducts();
            const allBtn = document.getElementById('manual-products-all-btn');
            const hint = document.getElementById('manual-products-hint');
            if (allBtn) allBtn.hidden = !products.length;
            if (hint) hint.textContent = products.length
                ? 'Выберите сохранённый продукт — КБЖУ заполнятся автоматически.'
                : 'Добавь продукт вручную — он сохранится для следующего раза.';
        }

        function renderManualProductsLibrary() {
            const list = document.getElementById('manual-products-library-list');
            if (!list) return;
            const query = normalizeManualProductName(document.getElementById('manual-product-search-input')?.value || '');
            const products = getSortedManualProducts();
            const filtered = query ? products.filter(product => normalizeManualProductName(product.name).includes(query)) : products;
            if (!products.length) {
                list.innerHTML = '<div class="manual-products-empty">Пока нет сохранённых продуктов.</div>';
                return;
            }
            if (!filtered.length) {
                list.innerHTML = '<div class="manual-products-empty">Ничего не найдено.</div>';
                return;
            }
            list.innerHTML = filtered.map(product => renderManualProductCard(product, { withDelete: true })).join('');
        }

        function openManualProductsLibrary() {
            const search = document.getElementById('manual-product-search-input');
            if (search) search.value = '';
            renderManualProductsLibrary();
            setLockedLayer('manual-products-library', document.getElementById('manual-products-library-modal'), true);
            setTimeout(() => search?.focus?.(), 120);
        }

        function closeManualProductsLibrary() {
            setLockedLayer('manual-products-library', document.getElementById('manual-products-library-modal'), false);
        }

        async function deleteManualProduct(event, productId) {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            const confirmed = await showConfirm('Удалить продукт из сохранённых?', 'Удалить', 'Мои продукты');
            if (!confirmed) return;
            saveManualProducts(loadManualProducts().filter(product => String(product.id) !== String(productId)));
            renderManualProductsList();
            renderManualProductsLibrary();
        }

        function setManualMealInputValue(id, value) {
            const el = document.getElementById(id);
            if (el) el.value = value;
        }

        function selectManualProduct(productId) {
            const product = loadManualProducts().find(item => String(item.id) === String(productId));
            if (!product || !isValidManualProduct(product)) return;
            closeManualProductsLibrary();
            setManualMealInputMode('per100');
            setManualMealInputValue('manual-meal-name', product.name);
            setManualMealInputValue('manual-meal-kcal100', product.caloriesPer100);
            setManualMealInputValue('manual-meal-protein100', product.proteinPer100);
            setManualMealInputValue('manual-meal-fat100', product.fatPer100);
            setManualMealInputValue('manual-meal-carbs100', product.carbsPer100);
            const nameInput = document.getElementById('manual-meal-name');
            if (nameInput) {
                const barcode = normalizeBarcode(product.barcode || '');
                if (barcode) nameInput.dataset.barcode = barcode;
            }
            document.querySelectorAll('.manual-product-card').forEach(card => {
                card.classList.toggle('active', String(card.dataset.productId) === String(productId));
            });
            updateManualMealTotals();
            document.getElementById('manual-meal-grams')?.focus?.();
        }

        function resetManualMealForm() {
            setManualMealError('');
            ['manual-meal-name','manual-meal-grams','manual-meal-kcal100','manual-meal-protein100','manual-meal-fat100','manual-meal-carbs100'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            const nameInput = document.getElementById('manual-meal-name');
            if (nameInput) {
                nameInput.placeholder = 'Например, творог 5%';
                delete nameInput.dataset.barcode;
            }
            const mealType = document.getElementById('manual-meal-type');
            if (mealType) mealType.value = getCurrentAddMealType();
            setManualMealInputMode('per100');
            renderManualProductsList();
            updateManualMealTotals();
        }

        function openManualMealModal(options = {}) {
            closeAddMealChoice();
            if (options?.mealType) {
                currentDiaryMealType = getValidMealType(options.mealType, currentDiaryMealType);
                currentMealFilter = currentDiaryMealType;
            }
            resetManualMealForm();
            setLockedLayer('manual-meal', document.getElementById('manual-meal-modal'), true);
            const barcode = normalizeBarcode(options?.barcode || '');
            if (barcode) {
                const nameInput = document.getElementById('manual-meal-name');
                if (nameInput) {
                    nameInput.placeholder = 'Штрихкод ' + barcode + ': введите название продукта';
                    nameInput.dataset.barcode = barcode;
                }
                setManualMealError('Штрихкод ' + barcode + ' не найден. Заполните продукт вручную.');
            }
            setTimeout(() => document.getElementById('manual-meal-name')?.focus?.(), 120);
        }

        function closeManualMealModal() {
            setLockedLayer('manual-meal', document.getElementById('manual-meal-modal'), false);
            setManualMealError('');
        }

        function getQuickEntryNumber(id) {
            const raw = document.getElementById(id)?.value;
            if (raw === '' || raw === null || raw === undefined) return 0;
            return Number(String(raw).replace(',', '.'));
        }

        function setQuickEntryError(message = '') {
            const el = document.getElementById('quick-entry-error');
            if (!el) return;
            el.textContent = message;
            el.classList.toggle('active', Boolean(message));
        }

        function resetQuickEntryForm() {
            setQuickEntryError('');
            ['quick-entry-name','quick-entry-grams','quick-entry-kcal','quick-entry-protein','quick-entry-fat','quick-entry-carbs'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
        }

        function openQuickEntryModal(options = {}) {
            if (options?.mealType) {
                currentDiaryMealType = getValidMealType(options.mealType, currentDiaryMealType);
                currentMealFilter = currentDiaryMealType;
            }
            resetQuickEntryForm();
            setLockedLayer('quick-entry', document.getElementById('quick-entry-modal'), true);
            setTimeout(() => document.getElementById('quick-entry-kcal')?.focus?.(), 120);
        }

        function closeQuickEntryModal() {
            setLockedLayer('quick-entry', document.getElementById('quick-entry-modal'), false);
            setQuickEntryError('');
        }

        function validateQuickEntry(totals) {
            const fields = [
                ['Ккал', totals.kcal],
                ['Белки', totals.protein],
                ['Жиры', totals.fat],
                ['Углеводы', totals.carbs]
            ];
            const invalid = fields.find(([, value]) => !Number.isFinite(value) || value < 0);
            if (invalid) return invalid[0] + ' не должны быть отрицательными.';
            if (![totals.kcal, totals.protein, totals.fat, totals.carbs].some(value => value > 0)) return 'Введите хотя бы одно значение КБЖУ больше 0.';
            if (totals.gramsRaw && (!Number.isFinite(totals.grams) || totals.grams <= 0)) return 'Вес должен быть больше 0 г.';
            return '';
        }

        async function submitQuickEntry(event) {
            event?.preventDefault?.();
            if (isAddingMeal) return;
            const name = (document.getElementById('quick-entry-name')?.value || '').trim() || 'Быстрый ввод';
            const gramsRaw = (document.getElementById('quick-entry-grams')?.value || '').trim();
            const totals = {
                gramsRaw,
                grams: gramsRaw ? getQuickEntryNumber('quick-entry-grams') : 0,
                kcal: getQuickEntryNumber('quick-entry-kcal'),
                protein: getQuickEntryNumber('quick-entry-protein'),
                fat: getQuickEntryNumber('quick-entry-fat'),
                carbs: getQuickEntryNumber('quick-entry-carbs')
            };
            const validationError = validateQuickEntry(totals);
            if (validationError) {
                setQuickEntryError(validationError);
                return;
            }
            const mealType = getDiaryMealType();
            const createdAt = selectedDateTimeISO();
            const payload = {
                id: 'manual_quick_' + Date.now(),
                type: 'quick-entry',
                name,
                recipe_title: name,
                mealType,
                meal_type: mealType,
                grams: totals.grams,
                calories: totals.kcal,
                kcal: totals.kcal,
                protein: totals.protein,
                fat: totals.fat,
                carbs: totals.carbs,
                recipe_id: null,
                createdAt,
                created_at: createdAt,
                ingredients: []
            };
            setQuickEntryError('');
            isAddingMeal = true;
            const submitBtn = document.getElementById('quick-entry-submit');
            if (submitBtn) submitBtn.disabled = true;
            try {
                await callServer('addMeal', payload);
                closeQuickEntryModal();
                await refreshAllData();
                renderDiaryMealContent();
                document.getElementById('history-list')?.classList.add('success-flash');
                setTimeout(() => document.getElementById('history-list')?.classList.remove('success-flash'), 700);
                showToast('Добавлено в ' + mealType);
            } catch (error) {
                console.error('Ошибка быстрого ввода:', error);
                if (isTelegramMiniApp) {
                    addManualLocalMeal(payload);
                    closeQuickEntryModal();
                    await refreshAllData();
                    renderDiaryMealContent();
                    showToast('Добавлено в ' + mealType);
                } else {
                    setQuickEntryError('Не удалось добавить запись: ' + error.message);
                }
            } finally {
                isAddingMeal = false;
                if (submitBtn) submitBtn.disabled = false;
            }
        }

        function validateManualMeal(name, totals) {
            if (!name) return 'Введите название продукта или блюда.';
            if (!Number.isFinite(totals.grams) || totals.grams <= 0) return 'Вес порции должен быть больше 0 г.';
            const fields = [
                ['Калории', totals.kcal100],
                ['Белки', totals.protein100],
                ['Жиры', totals.fat100],
                ['Углеводы', totals.carbs100]
            ];
            const invalid = fields.find(([, value]) => !Number.isFinite(value) || value < 0);
            if (invalid) return invalid[0] + ' не должны быть отрицательными.';
            return '';
        }

        async function submitManualMeal(event) {
            event?.preventDefault?.();
            if (isAddingMeal) return;
            const nameInput = document.getElementById('manual-meal-name');
            const name = (nameInput?.value || '').trim();
            const barcode = normalizeBarcode(nameInput?.dataset.barcode || '');
            const mealType = document.getElementById('manual-meal-type')?.value || 'Перекус';
            const totals = calculateManualMealTotals();
            const validationError = validateManualMeal(name, totals);
            if (validationError) {
                setManualMealError(validationError);
                return;
            }
            setManualMealError('');
            isAddingMeal = true;
            const submitBtn = document.getElementById('manual-meal-submit');
            if (submitBtn) submitBtn.disabled = true;
            try {
                const createdAt = selectedDateTimeISO();
                const payload = {
                    type: 'manual',
                    manual: true,
                    name,
                    recipe_title: name,
                    mealType,
                    grams: totals.grams,
                    barcode,
                    inputMode: totals.inputMode,
                    calories_per_100: totals.kcal100,
                    protein_per_100: totals.protein100,
                    fat_per_100: totals.fat100,
                    carbs_per_100: totals.carbs100,
                    recipe_id: null,
                    calories: totals.kcal,
                    kcal: totals.kcal,
                    protein: totals.protein,
                    fat: totals.fat,
                    carbs: totals.carbs,
                    meal_type: mealType,
                    createdAt,
                    created_at: createdAt,
                    ingredients: []
                };
                await callServer('addMeal', payload);
                upsertManualProduct(name, totals, { barcode });
                closeManualMealModal();
                await refreshAllData();
                document.getElementById('history-list')?.classList.add('success-flash');
                setTimeout(() => document.getElementById('history-list')?.classList.remove('success-flash'), 700);
                showToast('Добавлено в дневник');
            } catch (e) {
                console.error('Ошибка ручного добавления:', e);
                if (isTelegramMiniApp) {
                    const fallbackMeal = addManualLocalMeal({
                        name,
                        recipe_title: name,
                        grams: totals.grams,
                        barcode,
                        inputMode: totals.inputMode,
                        calories_per_100: totals.kcal100,
                        protein_per_100: totals.protein100,
                        fat_per_100: totals.fat100,
                        carbs_per_100: totals.carbs100,
                        kcal: totals.kcal,
                        protein: totals.protein,
                        fat: totals.fat,
                        carbs: totals.carbs,
                        meal_type: mealType,
                        created_at: selectedDateTimeISO()
                    });
                    upsertManualProduct(name, totals, { barcode });
                    console.warn('Ручной продукт сохранён локально:', fallbackMeal);
                    closeManualMealModal();
                    await refreshAllData();
                    showToast('Добавлено локально');
                } else {
                    setManualMealError('Не удалось добавить продукт: ' + e.message);
                }
            } finally {
                isAddingMeal = false;
                if (submitBtn) submitBtn.disabled = false;
            }
        }

        function handleSmartTipKey(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openSmartTipPopup();
            }
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
                    title: 'Серия',
                    subtitle: streakData.streak + ' ' + pluralDays(streakData.streak) + ' режима',
                    progress: Math.min(streakData.streak * 10, 100),
                    color: '#d7955b',
                    paragraphs: [
                        'Серия — это количество дней подряд, когда ты ведешь дневник без пропусков.',
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
            if (goalType === 'bulk') return { key: 'mass', icon: '💪', label: 'Набор массы', tone: 'Строим форму' };
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
            const greetingTitle = document.getElementById('coach-greeting-title');
            if (greetingTitle) {
                greetingTitle.innerHTML = '<span class="coach-title-prefix">' + escapeHTML(getDayPart() + ',') + '</span> <span class="coach-title-name">' + escapeHTML(name) + '</span>';
            }
            setText('coach-greeting-subtitle', isToday ? ('Сегодня цель — ' + (targetKcal || 0) + ' ккал. ' + goal.tone + '.') : ('Смотрим день: ' + (document.getElementById('cal-date-label')?.textContent || 'выбранная дата') + '.'));

            const goalBadge = document.getElementById('goal-status-badge');
            if (goalBadge) {
                goalBadge.dataset.goal = goal.key;
                goalBadge.textContent = goal.icon + ' ' + goal.label;
            }

            setText('streak-badge', '🔥 ' + streak + ' ' + pluralDays(streak) + ' режима');
            const kcalFeedback = document.getElementById('coach-kcal-feedback');
            if (kcalFeedback) kcalFeedback.innerHTML = '<span class="kcal-number">' + Math.round(targetKcal || stats.kcal || 0) + '</span><span class="kcal-unit">ккал</span>';
            setText('coach-kcal-note', 'Цель на день');
            const currentKcal = Number(stats.kcal) || 0;
            const kcalStatus = targetKcal > 0 && currentKcal > targetKcal
                ? 'Превышение ' + Math.round(currentKcal - targetKcal) + ' ккал'
                : 'Осталось ' + Math.round(kcalLeft) + ' ккал';
            setText('home-kcal-left', kcalStatus);
            setText('home-kcal-consumed', 'Потреблено ' + Math.round(Number(stats.kcal) || 0) + ' ккал');
            setText('coach-protein-feedback', Math.round(Number(stats.protein) || 0) + ' г');
            setText('coach-protein-note', 'из ' + Math.round(targetProtein || 0) + ' г');
            setText('coach-water-feedback', (Math.round((Number(dailyWater) || 0) / 100) / 10) + ' л');
            setText('coach-water-note', 'из ' + (Math.round((targetWater || 2000) / 100) / 10) + ' л');
            setText('coach-streak-feedback', streak + ' ' + pluralDays(streak) + ' подряд');
            setText('coach-streak-note', best > streak ? ('Лучший — ' + best + ' ' + pluralDays(best)) : 'В режиме');
            setText('daily-goal-caption', goal.label);

            setText('coach-smart-feedback', buildSmartTipRecommendation().shortText);
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
            const consumedCalories = Number(stats.kcal) || 0;
            const caloriesGoal = Number(userProfile.target_kcal) || Number(DEMO_PROFILE.target_kcal) || 0;
            let kcalPct = getPct(consumedCalories, caloriesGoal);
            const intakePct = document.getElementById('intake-pct');
            if (intakePct) intakePct.innerText = Math.round(kcalPct) + '%';
            const profileDisplay = document.getElementById('profile-display');
            profileDisplay?.style.setProperty('--daily-pct', Math.round(kcalPct) + '%');
            profileDisplay?.classList.toggle('is-kcal-over', caloriesGoal > 0 && consumedCalories > caloriesGoal);
            const roundedKcal = Math.round(consumedCalories);
            const roundedGoalKcal = Math.round(caloriesGoal);
            const kcalNormPct = caloriesGoal > 0
                ? Math.round((consumedCalories / caloriesGoal) * 100)
                : 0;
            setText('gauge-cur', kcalNormPct + '%');
            setText('daily-summary-kcal-total', roundedKcal + ' / ' + roundedGoalKcal);
            const gaugePath = document.getElementById('gauge-path');
            if (gaugePath) gaugePath.style.strokeDashoffset = 100 - kcalPct;
            setText('daily-kcal-summary', roundedKcal + ' / ' + roundedGoalKcal);
            setText('daily-protein-summary', Math.round(stats.protein) + ' / ' + (Number(userProfile.target_protein) || 0) + ' г');
            setText('daily-fat-summary', Math.round(stats.fat) + ' / ' + (Number(userProfile.target_fat) || 0) + ' г');
            setText('daily-carbs-summary', Math.round(stats.carbs) + ' / ' + (Number(userProfile.target_carbs) || 0) + ' г');
            setText('daily-water-summary', (Math.round((Number(dailyWater) || 0) / 100) / 10) + ' / ' + (Math.round((Number(userProfile.target_water) || 2000) / 100) / 10) + ' л');
            const dailyKcalPct = getPct(consumedCalories, caloriesGoal);
            const targetProteinNorm = Number(userProfile.target_protein) || Number(DEMO_PROFILE.target_protein) || 0;
            const targetFatNorm = Number(userProfile.target_fat) || Number(DEMO_PROFILE.target_fat) || 0;
            const targetCarbsNorm = Number(userProfile.target_carbs) || Number(DEMO_PROFILE.target_carbs) || 0;
            const dailyProteinPct = getPct(stats.protein, targetProteinNorm);
            const dailyFatPct = getPct(stats.fat, targetFatNorm);
            const dailyCarbsPct = getPct(stats.carbs, targetCarbsNorm);
            const dailyWaterPct = getPct(dailyWater, userProfile.target_water || 2000);
            const dailyKcalBar = document.getElementById('daily-kcal-bar');
            const dailyProteinBar = document.getElementById('daily-protein-bar');
            const dailyFatBar = document.getElementById('daily-fat-bar');
            const dailyCarbsBar = document.getElementById('daily-carbs-bar');
            const dailyWaterBar = document.getElementById('daily-water-bar');
            setText('daily-norm-protein-value', Math.round(stats.protein) + ' / ' + targetProteinNorm + ' г');
            setText('daily-norm-fat-value', Math.round(stats.fat) + ' / ' + targetFatNorm + ' г');
            setText('daily-norm-carbs-value', Math.round(stats.carbs) + ' / ' + targetCarbsNorm + ' г');
            const normProteinBar = document.getElementById('daily-norm-protein-bar');
            const normFatBar = document.getElementById('daily-norm-fat-bar');
            const normCarbsBar = document.getElementById('daily-norm-carbs-bar');
            if (dailyKcalBar) dailyKcalBar.style.width = dailyKcalPct + '%';
            if (dailyProteinBar) dailyProteinBar.style.width = dailyProteinPct + '%';
            if (dailyFatBar) dailyFatBar.style.width = dailyFatPct + '%';
            if (dailyCarbsBar) dailyCarbsBar.style.width = dailyCarbsPct + '%';
            if (dailyWaterBar) dailyWaterBar.style.width = dailyWaterPct + '%';
            if (normProteinBar) normProteinBar.style.width = dailyProteinPct + '%';
            if (normFatBar) normFatBar.style.width = dailyFatPct + '%';
            if (normCarbsBar) normCarbsBar.style.width = dailyCarbsPct + '%';
            setRingProgress('macro-kcal-ring', dailyKcalPct);
            setRingProgress('macro-carbs-ring', dailyCarbsPct);
            setRingProgress('macro-fat-ring', dailyFatPct);
            setRingProgress('macro-protein-ring', dailyProteinPct);
            setText('macro-kcal-pct', Math.round(dailyKcalPct) + '%');
            setText('macro-carbs-pct', Math.round(dailyCarbsPct) + '%');
            setText('macro-fat-pct', Math.round(dailyFatPct) + '%');
            setText('macro-protein-pct', Math.round(dailyProteinPct) + '%');
            setText('macro-water-pct', Math.round(dailyWaterPct) + '%');
            let cPct = getPct(stats.carbs, userProfile.target_carbs); document.getElementById('val-c').innerText = `${Math.round(stats.carbs)} / ${userProfile.target_carbs} г`; document.getElementById('pct-c').innerText = Math.round(cPct) + '%'; setRingProgress('bar-c', cPct);
            let fPct = getPct(stats.fat, userProfile.target_fat); document.getElementById('val-f').innerText = `${Math.round(stats.fat)} / ${userProfile.target_fat} г`; document.getElementById('pct-f').innerText = Math.round(fPct) + '%'; setRingProgress('bar-f', fPct);
            let pPct = getPct(stats.protein, userProfile.target_protein); document.getElementById('val-p').innerText = `${Math.round(stats.protein)} / ${userProfile.target_protein} г`; document.getElementById('pct-p').innerText = Math.round(pPct) + '%'; setRingProgress('bar-p', pPct);
            let wPct = getPct(dailyWater, userProfile.target_water || 2000); document.getElementById('water-current').innerText = dailyWater; document.getElementById('water-target-ui').innerText = userProfile.target_water || 2000; document.getElementById('pct-w').innerText = Math.round(wPct) + '%'; document.getElementById('water-bar').style.width = wPct + '%';
            updatePersonalizedUI();
        }

        function getDefaultDietFilterForGoal() {
            const goal = userProfile.goal_type || 'maintain';
            if (goal === 'cut') return 'Сушка';
            if (goal === 'bulk') return 'Набор массы';
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
            document.querySelectorAll('#meal-tabs button').forEach(el => el.classList.remove('active'));
            if (btn) btn.classList.add('active');
            else setActiveButton('#meal-tabs', currentMealFilter);
            renderRecipes(true, true);
        }

        function setDietFilter(filter, btn) {
            currentDietFilter = filter;
            document.querySelectorAll('#diet-tabs .tab').forEach(el => el.classList.remove('active'));
            if (btn) btn.classList.add('active');
            else setActiveButton('#diet-tabs', currentDietFilter);
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
            const subtitle = document.getElementById('portion-editor-subtitle');
            if (subtitle) subtitle.textContent = recipe.description || 'Настрой рецепт и граммовки ингредиентов.';
            document.getElementById('portion-confirm-btn').textContent = mode === 'plan' ? 'Добавить в меню' : mode === 'plan-edit' ? 'Сохранить рецепт' : mode === 'recipe-edit' ? 'Изменить' : 'Добавить';
            renderRecipePortionEditor();
            setLockedLayer('portion', document.getElementById('recipe-portion-overlay'), true);
        }

        function closeRecipePortionEditor(options = {}) {
            const draft = recipePortionDraft;
            setLockedLayer('portion', document.getElementById('recipe-portion-overlay'), false);
            recipePortionDraft = null;
            if (options.returnToDetails !== false && draft?.context?.returnToDetails) openRecipeDetails(draft.recipeId);
        }

        function renderRecipePortionTotals() {
            if (!recipePortionDraft) return;
            const total = getRecipePortionNutrition(getRecipeById(recipePortionDraft.recipeId), recipePortionDraft.ingredients);
            const per100Ratio = total.grams > 0 ? 100 / total.grams : 0;
            const eatenGrams = Math.max(1, Number(recipePortionDraft.eatenGrams) || Math.round(total.grams) || 100);
            document.getElementById('portion-total').innerHTML =
                '<div class="portion-kbju-card"><div><div class="portion-kbju-title">КБЖУ / 100 г</div>' +
                '<div class="portion-kbju-line">' + Math.round(total.kcal * per100Ratio) + ' ккал · Б ' + (total.protein * per100Ratio).toFixed(1) + ' · Ж ' + (total.fat * per100Ratio).toFixed(1) + ' · У ' + (total.carbs * per100Ratio).toFixed(1) + '</div></div>' +
                '<div class="portion-auto-badge">Обновляется автоматически</div>' +
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
                const swaps = recipePortionDraft.mode !== 'recipe-edit' && category === 'grains' ? getRecipeIngredientCatalog('grains').filter(option => {
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
            if (recipePortionDraft.mode !== 'recipe-edit') saveRecipeIngredientOverride(recipePortionDraft.recipeId, recipePortionDraft.ingredients);
            renderRecipePortionTotals();
        }

        function setPortionIngredientProduct(index, key) {
            if (!recipePortionDraft?.ingredients[index]) return;
            const next = getRecipeIngredientCatalog('grains').find(ing => String(ing.products.id || ing.products.name) === String(key));
            if (!next) return;
            const grams = recipePortionDraft.ingredients[index].weight;
            recipePortionDraft.ingredients[index] = clonePortionIngredient({ ...next, weight: grams });
            if (recipePortionDraft.mode !== 'recipe-edit') saveRecipeIngredientOverride(recipePortionDraft.recipeId, recipePortionDraft.ingredients);
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
            if (recipePortionDraft.mode !== 'recipe-edit') clearRecipeIngredientOverride(recipePortionDraft.recipeId);
            const total = getRecipePortionNutrition(recipe, recipePortionDraft.ingredients);
            recipePortionDraft.eatenGrams = Math.max(1, Math.round(total.grams || 100));
            renderRecipePortionEditor();
            if (recipePortionDraft.mode !== 'recipe-edit') {
                renderRecipes(true);
                renderRecipesScreen();
            }
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
            closeRecipePortionEditor({ returnToDetails: false });
            if (mode === 'recipe-edit') {
                renderRecipes(true);
                renderRecipesScreen();
                openRecipeDetails(recipe.id);
                return;
            }
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
            if (goal === 'bulk') return ['Набор массы', 'Рост мышц'];
            if (goal === 'muscle') return ['Рост мышц', 'Белок+'];
            return ['Поддержание'];
        }

                        function updateRecipeCoachText(visibleCount) {
            const el = document.getElementById('recipe-coach-text');
            if (!el) return;
            const proteinLeft = Math.max((Number(userProfile.target_protein) || 0) - (Number(stats.protein) || 0), 0);
            let text = currentMealFilter + ' под твою цель';
            if (proteinLeft > 35) text += ': белок проседает — показываю high protein варианты.';
            else if (currentDietFilter !== 'Все') text += ': показываю ' + currentDietFilter.toLowerCase() + ' варианты.';
            else text += ': показываю лучшие варианты под профиль.';
            text += ' Найдено: ' + visibleCount + '.';
            el.textContent = text;
            const chips = document.getElementById('recipe-coach-chips');
            if (chips) {
                const base = currentDietFilter === 'Все' ? getUserRecipeFilters().slice(0, 3) : [currentDietFilter, currentMealFilter, 'Белок+'];
                chips.innerHTML = base.slice(0, 3).map(chip => '<span class="recipe-coach-chip">' + escapeHTML(chip) + '</span>').join('');
            }
        }

                                function renderRecipes(animate = false, resetScroll = false) {
            const container = document.getElementById('recipe-list');
            if (!container) return;
            syncRecipeFilterButtons();
            const previousScroll = resetScroll ? 0 : container.scrollLeft;
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
            addRecipeToDiary(addButton.dataset.recipeId);
        });

        function addRecipeToDiary(recipeId, portionGrams = null) {
            const recipe = getRecipeById(recipeId);
            if (!recipe) return showToast('Рецепт не найден');
            const ingredients = getRecipeWorkingIngredients(recipe).filter(ing => Number(ing.weight) > 0);
            const total = getRecipePortionNutrition(recipe, ingredients);
            const grams = Math.max(1, Number(portionGrams) || total.grams || 100);
            const ratio = total.grams > 0 ? grams / total.grams : 1;
            const mealType = currentMealFilter || recipe.category || 'Перекус';
            return openMealModal(recipe.id, total.kcal * ratio, total.protein * ratio, total.fat * ratio, total.carbs * ratio, scalePortionIngredients(ingredients, ratio), mealType);
        }

        function openRecipeEditFromDetails(recipeId) {
            closeRecipeDetails();
            openRecipePortionEditor('recipe-edit', recipeId, { returnToDetails: true });
        }

        function formatMacroLine(nutrition, withGramUnits = false) {
            const unit = withGramUnits ? ' г' : '';
            return Math.round(Number(nutrition?.kcal) || 0) + ' ккал · Б ' + (Number(nutrition?.protein) || 0).toFixed(1) + unit + ' · Ж ' + (Number(nutrition?.fat) || 0).toFixed(1) + unit + ' · У ' + (Number(nutrition?.carbs) || 0).toFixed(1) + unit;
        }

        function getRecipeInstructionSteps(recipe) {
            if (Array.isArray(recipe?.instructions)) return recipe.instructions.filter(Boolean);
            return String(recipe?.instructions || '').split(/\n+/).map(item => item.trim()).filter(Boolean);
        }

        function renderRecipeDetailPortion() {
            if (!recipeDetailPortionDraft) return;
            const card = document.getElementById('detail-portion-card');
            const input = document.getElementById('detail-portion-input');
            if (!card) return;
            const total = recipeDetailPortionDraft.total;
            const grams = Math.max(1, Number(recipeDetailPortionDraft.grams) || total.grams || 100);
            const ratio = total.grams > 0 ? grams / total.grams : 1;
            const portion = {
                kcal: total.kcal * ratio,
                protein: total.protein * ratio,
                fat: total.fat * ratio,
                carbs: total.carbs * ratio
            };
            if (input && document.activeElement !== input) input.value = String(Math.round(grams));
            const totalEl = document.getElementById('detail-portion-total');
            if (totalEl) totalEl.innerText = 'Итого: ' + formatMacroLine(portion, true);
        }

        function setRecipeDetailPortionGrams(value) {
            if (!recipeDetailPortionDraft) return;
            recipeDetailPortionDraft.grams = Math.max(1, Number(String(value).replace(',', '.')) || 1);
            renderRecipeDetailPortion();
        }

        function stepRecipeDetailPortion(delta) {
            if (!recipeDetailPortionDraft) return;
            const current = Math.max(1, Number(recipeDetailPortionDraft.grams) || recipeDetailPortionDraft.total.grams || 100);
            recipeDetailPortionDraft.grams = Math.max(1, current + Number(delta || 0));
            renderRecipeDetailPortion();
        }
        function getDiaryTimelineIcon(type) {
            if (type === 'Завтрак') {
                return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h11v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"></path><path d="M16 10h2.5a2.5 2.5 0 0 1 0 5H16"></path><path d="M7 4v2M11 3v3M15 4v2"></path></svg>';
            }
            if (type === 'Обед') {
                return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14a7 7 0 0 1-14 0Z"></path><path d="M7 17h10"></path><path d="M8 8c2-2 6-2 8 0"></path><path d="M4 10h16"></path></svg>';
            }
            if (type === 'Ужин') {
                return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13c3-4 8-4 14 0"></path><path d="M4 15c4 3 11 3 16 0"></path><path d="M7 17c2 2 8 2 10 0"></path><path d="M8 11c1-2 3-3 5-3"></path></svg>';
            }
            return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 17c4 1 8-3 9-9"></path><path d="M6 15c-1 2 1 4 4 4"></path><path d="M15 6c2 2 3 5 1 8"></path><path d="M6 16c4 1 8-2 10-8"></path></svg>';
        }

        function syncDiaryMealControls() {
            const isLibraryTab = diaryMealSourceTab === 'library';
            document.getElementById('diary-meal-screen')?.classList.toggle('is-create-tab', !isLibraryTab);
            document.querySelectorAll('[data-diary-meal-library-only]').forEach(el => {
                el.hidden = !isLibraryTab;
            });
            document.querySelectorAll('.diary-meal-bottom-tabs button').forEach(btn => {
                const isActive = btn.dataset.diaryMealSource === diaryMealSourceTab;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });
            document.querySelectorAll('.diary-meal-category').forEach(btn => {
                const isActive = btn.dataset.diaryMealTab === diaryMealActiveTab;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });
            document.querySelectorAll('.diary-meal-filter-tabs button').forEach(btn => {
                const isActive = btn.textContent.trim() === diaryMealActiveFilter;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
            const search = document.getElementById('diary-meal-search-input');
            if (search) search.placeholder = diaryMealActiveTab === 'recipes' ? 'Найти рецепт' : 'Найти продукт';
        }

        function openDiaryMealScreen(mealType, event) {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            currentDiaryMealType = getValidMealType(mealType, currentDiaryMealType || 'Завтрак');
            currentMealFilter = currentDiaryMealType;
            diaryMealSourceTab = 'library';
            diaryMealActiveTab = 'products';
            diaryMealActiveFilter = 'Недавние';
            const title = document.getElementById('diary-meal-title');
            if (title) title.textContent = currentDiaryMealType;
            const search = document.getElementById('diary-meal-search-input');
            if (search) search.value = '';
            syncDiaryMealControls();
            renderDiaryMealContent();
            const screen = document.getElementById('diary-meal-screen');
            screen?.removeAttribute('hidden');
            screen?.setAttribute('aria-hidden', 'false');
            setLockedLayer('diary-meal', screen, true);
        }

        function closeDiaryMealScreen() {
            const screen = document.getElementById('diary-meal-screen');
            setLockedLayer('diary-meal', screen, false);
            screen?.setAttribute('hidden', '');
            screen?.setAttribute('aria-hidden', 'true');
        }

        function setDiaryMealTab(tabName) {
            diaryMealActiveTab = ['products','recipes','estimate'].includes(tabName) ? tabName : 'products';
            syncDiaryMealControls();
            renderDiaryMealContent();
        }

        function setDiaryMealSourceTab(tabName) {
            diaryMealSourceTab = tabName === 'create' ? 'create' : 'library';
            currentMealFilter = currentDiaryMealType;
            syncDiaryMealControls();
            renderDiaryMealContent();
        }

        document.addEventListener('click', function(event) {
            const filterButton = event.target.closest('.diary-meal-filter-tabs button');
            if (!filterButton) return;
            diaryMealActiveFilter = filterButton.textContent.trim() || 'Недавние';
            syncDiaryMealControls();
            renderDiaryMealContent();
        });

        function formatDiaryMealProductMacros(product) {
            return Math.round(Number(product.caloriesPer100) || 0) + ' ккал · Б ' +
                (Number(product.proteinPer100) || 0).toFixed(1) + ' · Ж ' +
                (Number(product.fatPer100) || 0).toFixed(1) + ' · У ' +
                (Number(product.carbsPer100) || 0).toFixed(1) + (Number(product.defaultGrams) > 0 ? ' · ' + Math.round(Number(product.defaultGrams)) + ' г' : '');
        }

        function renderDiaryMealProductCard(product) {
            const idArg = escapeAttr(JSON.stringify(String(product.id || '')));
            return '<article class="diary-meal-product-card">' +
                '<button class="diary-meal-product-main" type="button" onclick="openDiaryMealProduct(' + idArg + ')">' +
                    '<b>' + escapeHTML(product.name || 'Продукт') + '</b>' +
                    '<span>' + escapeHTML(formatDiaryMealProductMacros(product)) + '</span>' +
                '</button>' +
                '<button class="diary-meal-product-add" type="button" aria-label="Добавить продукт" onclick="addDiaryMealProduct(event, ' + idArg + ')">+</button>' +
            '</article>';
        }

        function getDiaryMealProductList() {
            const query = normalizeManualProductName(document.getElementById('diary-meal-search-input')?.value || '');
            const products = getSortedManualProducts();
            const filtered = query ? products.filter(product => normalizeManualProductName(product.name).includes(query)) : products;
            if (diaryMealActiveFilter === 'Избранные') return [];
            if (diaryMealActiveFilter === 'Частые') return filtered.slice(0, 8);
            return filtered.slice(0, 12);
        }

        function renderDiaryMealRecipes() {
            const query = normalizeManualProductName(document.getElementById('diary-meal-search-input')?.value || '');
            const allRecipes = loadManualRecipes()
                .filter(recipe => recipe?.type === 'manual-recipe' && String(recipe.name || '').trim())
                .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
            const recipes = query
                ? allRecipes.filter(recipe => normalizeManualProductName(recipe.name || '').includes(query))
                : allRecipes;
            if (!allRecipes.length) {
                return '<div class="diary-meal-empty"><b>Пока нет собственных рецептов.</b><span>Создай рецепт, и он появится здесь.</span><button class="diary-meal-empty-action" type="button" onclick="openDiaryMealCreateRecipe()">Создать рецепт</button></div>';
            }
            if (!recipes.length) {
                return '<div class="diary-meal-empty"><b>Рецепты не найдены.</b><span>Попробуй изменить запрос.</span></div>';
            }
            return '<div class="diary-meal-recipe-list">' + recipes.map(recipe => {
                const idArg = escapeAttr(JSON.stringify(String(recipe.id || '')));
                const servings = Number(recipe.servings) > 0 ? ' · ' + (Number(recipe.servings) || 0) + ' порц.' : '';
                const meta = (recipe.category || 'Обед') + ' · ' + Math.round(Number(recipe.cookedWeight) || 0) + ' г' + servings;
                return '<article class="diary-meal-product-card diary-meal-recipe-card">' +
                    '<button class="diary-meal-product-main" type="button" onclick="openMyRecipeDetailsModal(' + idArg + ')">' +
                        '<b>' + escapeHTML(recipe.name || 'Рецепт') + '</b>' +
                        '<span>' + escapeHTML(meta) + '</span>' +
                        '<small>На 100 г: ' + escapeHTML(formatMyRecipePer100Line(recipe)) + '</small>' +
                    '</button>' +
                    '<button class="diary-meal-product-add" type="button" aria-label="Добавить рецепт" onclick="addDiaryMealRecipe(event, ' + idArg + ')">+</button>' +
                '</article>';
            }).join('') + '</div>';
        }

        function showDiaryMealCreateStub(message) {
            showToast(message);
        }

        function openDiaryMealCreateProduct() {
            openManualMealModal({ mealType: getDiaryMealType() });
        }

        function openDiaryMealQuickEntry() {
            openQuickEntryModal({ mealType: getDiaryMealType() });
        }

        function openDiaryMealCreateRecipe() {
            const mealType = getDiaryMealType();
            currentMealFilter = mealType;
            openMyRecipesModal();
            openMyRecipeCreateForm({ mealType, returnToDiary: true });
        }

        function renderDiaryMealCreateCard({ title, text, icon, message, action }) {
            const onClick = action === 'manualProduct'
                ? 'openDiaryMealCreateProduct()'
                : action === 'quickEntry'
                    ? 'openDiaryMealQuickEntry()'
                    : action === 'manualRecipe'
                        ? 'openDiaryMealCreateRecipe()'
                : 'showDiaryMealCreateStub(' + escapeAttr(JSON.stringify(message)) + ')';
            return '<button class="diary-meal-create-card" type="button" onclick="' + onClick + '">' +
                '<span class="diary-meal-create-icon" aria-hidden="true">' + icon + '</span>' +
                '<span class="diary-meal-create-copy">' +
                    '<b>' + escapeHTML(title) + '</b>' +
                    '<small>' + escapeHTML(text) + '</small>' +
                '</span>' +
                '<span class="diary-meal-create-chevron" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"></path></svg></span>' +
            '</button>';
        }

        function renderDiaryMealCreateOptions() {
            const quickIcon = '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="3"></rect><path d="M9 7h6"></path><path d="M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 15h.01M12 15h.01M15.5 15h.01"></path></svg>';
            const productIcon = '<svg viewBox="0 0 24 24"><path d="M7 16c-2.5-3-1.3-7 2.2-7.8C10 5.5 12.2 4 15 4"></path><path d="M9 8c4.8-.6 8 2.3 8 6.3 0 3.6-2.7 5.7-5.8 5.7C8.2 20 6 18.4 6 16.1"></path><path d="M15 4c1.4 1.1 2.4 2.6 3 4.2"></path><path d="M10 5c.7.6 1.4 1.5 1.8 2.5"></path></svg>';
            const recipeIcon = '<svg viewBox="0 0 24 24"><path d="M7 11.8A4.2 4.2 0 0 1 9.7 4a4.6 4.6 0 0 1 8.7 2.1A3.8 3.8 0 0 1 18 13"></path><path d="M7 13h11l-.8 7H7.8L7 13Z"></path><path d="M9 17h7"></path></svg>';
            const items = [
                {
                    title: 'Быстрый ввод',
                    text: 'Подсчёт КБЖУ без создания нового продукта',
                    icon: quickIcon,
                    action: 'quickEntry',
                    message: 'Быстрый ввод будет добавлен на следующем этапе.'
                },
                {
                    title: 'Новый продукт',
                    text: 'Создание нового продукта с заполнением подробной информации',
                    icon: productIcon,
                    action: 'manualProduct',
                    message: 'Создание продукта будет подключено на следующем этапе.'
                },
                {
                    title: 'Новый рецепт',
                    text: 'Рецепт с возможностью добавить инструкцию приготовления',
                    icon: recipeIcon,
                    action: 'manualRecipe',
                    message: 'Создание рецепта будет подключено на следующем этапе.'
                }
            ];
            return '<div class="diary-meal-create-options">' + items.map(renderDiaryMealCreateCard).join('') + '</div>';
        }

        function renderDiaryMealContent() {
            const content = document.getElementById('diary-meal-content');
            if (!content) return;
            syncDiaryMealControls();
            if (diaryMealSourceTab === 'create') {
                content.innerHTML = renderDiaryMealCreateOptions();
                return;
            }
            if (diaryMealActiveTab === 'recipes') {
                content.innerHTML = renderDiaryMealRecipes();
                return;
            }
            if (diaryMealActiveTab === 'estimate') {
                content.innerHTML = '<div class="diary-meal-empty"><b>Быстрое добавление примерно.</b><span>Эта заготовка будет подключена на следующем этапе.</span></div>';
                return;
            }
            const products = getDiaryMealProductList();
            if (!products.length) {
                const hasQuery = Boolean(normalizeManualProductName(document.getElementById('diary-meal-search-input')?.value || ''));
                const title = hasQuery ? 'Ничего не найдено' : 'Мои продукты';
                const text = hasQuery ? 'Попробуй изменить запрос.' : diaryMealActiveFilter === 'Избранные' ? 'Избранные продукты появятся здесь.' : 'Пока нет сохранённых продуктов. Создай первый продукт вручную.';
                content.innerHTML = '<div class="diary-meal-empty"><b>' + escapeHTML(title) + '</b><span>' + escapeHTML(text) + '</span></div>';
                return;
            }
            content.innerHTML = '<div class="diary-meal-date">' + new Date(currentDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) + '</div>' +
                '<div class="diary-meal-product-list">' + products.map(renderDiaryMealProductCard).join('') + '</div>';
        }

        function getDiaryMealType() {
            return getValidMealType(currentDiaryMealType, getCurrentAddMealType());
        }

        function buildDiaryManualProductPayload(product, mealType) {
            const grams = Math.max(1, Number(product.defaultGrams || product.grams || product.servingGrams) || 100);
            const ratio = grams / 100;
            const kcal = (Number(product.caloriesPer100) || 0) * ratio;
            const protein = (Number(product.proteinPer100) || 0) * ratio;
            const fat = (Number(product.fatPer100) || 0) * ratio;
            const carbs = (Number(product.carbsPer100) || 0) * ratio;
            const createdAt = selectedDateTimeISO();
            return {
                id: 'manual_product_entry_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                type: 'manual-product',
                manual: true,
                productId: product.id || null,
                name: product.name || 'Продукт',
                recipe_title: product.name || 'Продукт',
                mealType,
                meal_type: mealType,
                grams,
                calories_per_100: Number(product.caloriesPer100) || 0,
                protein_per_100: Number(product.proteinPer100) || 0,
                fat_per_100: Number(product.fatPer100) || 0,
                carbs_per_100: Number(product.carbsPer100) || 0,
                calories: kcal,
                kcal,
                protein,
                fat,
                carbs,
                recipe_id: null,
                createdAt,
                created_at: createdAt,
                ingredients: []
            };
        }

        async function addDiaryMealProduct(event, productId) {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            if (isAddingMeal) return;
            const product = loadManualProducts().find(item => String(item.id) === String(productId));
            if (!product || !isValidManualProduct(product)) return showToast('Продукт не найден');
            const mealType = getDiaryMealType();
            const payload = buildDiaryManualProductPayload(product, mealType);
            isAddingMeal = true;
            try {
                await callServer('addMeal', payload);
                await refreshAllData();
                renderDiaryMealContent();
                showToast('Добавлено в ' + mealType);
            } catch (error) {
                console.error('Ошибка добавления продукта из дневника:', error);
                if (isTelegramMiniApp) {
                    addManualLocalMeal(payload);
                    await refreshAllData();
                    renderDiaryMealContent();
                    showToast('Добавлено в ' + mealType);
                } else {
                    showToast('Не удалось добавить продукт');
                }
            } finally {
                isAddingMeal = false;
            }
        }

        async function addDiaryMealRecipe(event, recipeId) {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            currentMealFilter = getDiaryMealType();
            openMyRecipeAddModal(recipeId);
        }

        function openDiaryMealProduct(productId) {
            currentMealFilter = currentDiaryMealType;
            openManualMealModal({ mealType: currentDiaryMealType });
            selectManualProduct(productId);
        }

        function openDiaryMealCreate() {
            setDiaryMealSourceTab('create');
        }

        function openDiaryMealBarcode() {
            currentMealFilter = currentDiaryMealType;
            openBarcodeMealModal({ mealType: currentDiaryMealType });
        }

        function renderDiaryTimeline() {
            const mealTypes = ['Завтрак', 'Обед', 'Ужин', 'Перекус'];
            return '<div class="diary-timeline" aria-label="Таймлайн приемов пищи">' + mealTypes.map(type =>
                '<div class="diary-timeline-row">' +
                    '<div class="diary-timeline-marker">' +
                        '<span class="diary-timeline-icon">' + getDiaryTimelineIcon(type) + '</span>' +
                    '</div>' +
                    '<button class="diary-timeline-card" type="button" onclick="openDiaryMealScreen(' + escapeAttr(JSON.stringify(type)) + ', event)" aria-label="Добавить прием пищи: ' + escapeAttr(type) + '">' +
                        '<span class="diary-timeline-title">' + escapeHTML(type) + '</span>' +
                        '<span class="diary-timeline-add" aria-hidden="true">+</span>' +
                    '</button>' +
                '</div>'
            ).join('') + '</div>';
        }

        async function updateHistoryUI(options = {}) {
            const hList = document.getElementById('history-list');
            let startOfDay = new Date(currentDate); startOfDay.setHours(0,0,0,0); let endOfDay = new Date(currentDate); endOfDay.setHours(23,59,59,999);
            const data = await callServer('getMeals', { startDate: startOfDay.toISOString(), endDate: endOfDay.toISOString() }, options);
            const timelineHtml = renderDiaryTimeline();
            if (!data || data.length === 0) { hList.innerHTML = timelineHtml + '<div class="empty-state diary-empty-state"><div class="empty-state-icon">✓</div><div style="font-weight:800;color:var(--text-main);margin-bottom:6px;">Дневник чист</div><div>Добавьте первый прием пищи из рациона.</div></div>'; return; }
            let html = '';
            ['Завтрак', 'Обед', 'Ужин', 'Перекус'].forEach(type => {
                const typeMeals = data.filter(m => (m.meal_type || 'Перекус') === type); if (typeMeals.length === 0) return;
                const typeKcal = typeMeals.reduce((s, m) => s + (Number(m.kcal) || 0), 0); const typeProtein = typeMeals.reduce((s, m) => s + (Number(m.protein) || 0), 0); const typeFat = typeMeals.reduce((s, m) => s + (Number(m.fat) || 0), 0); const typeCarbs = typeMeals.reduce((s, m) => s + (Number(m.carbs) || 0), 0);
                const mealPct = Math.min(100, Math.round((typeKcal / (Number(userProfile.target_kcal) || 1)) * 100));
                html += `<div class="meal-group"><div class="meal-group-header" onclick="toggleMealGroup(this)"><div class="meal-name">${type} <span class="chevron">▼</span></div><div class="meal-stats"><div class="meal-kcal">${Math.round(typeKcal)} ккал</div><div class="meal-macros">Б: ${Math.round(typeProtein)}г &nbsp; Ж: ${Math.round(typeFat)}г &nbsp; У: ${Math.round(typeCarbs)}г</div></div></div><div class="meal-progress"><div class="meal-progress-fill" style="--meal-pct:${mealPct}%"></div></div><div class="meal-progress-caption">${mealPct}% от дневной цели</div><div class="meal-group-content">` + typeMeals.map(m => {
                    const title = m.recipes?.title || m.name || m.recipe_title || m.title || 'Прием пищи';
                    const isManual = m.type === 'manual' || m.manual === true || (!m.recipe_id && (m.name || m.recipe_title));
                    const isManualRecipe = m.type === 'manual-recipe-entry';
                    const gramsText = isManual && Number(m.grams) > 0 ? ' · ' + Math.round(Number(m.grams)) + ' г' : '';
                    const meta = new Date(m.created_at).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'}) + (isManualRecipe ? ' · мой рецепт' : isManual ? ' · вручную' : '') + gramsText;
                    return `<div class="history-item"><div><div style="font-weight:800; font-size: 15px; color: var(--text-main);">${escapeHTML(title)}</div><div style="font-size:12px; color:var(--text-muted); margin-top: 4px;">${escapeHTML(meta)}</div></div><div style="display:flex; align-items:center"><span style="color:#6f9b86; font-weight:800; font-size: 15px;">+${Math.round(Number(m.kcal) || 0)}</span><button class="del-btn" onclick="deleteOneMeal(${escapeAttr(JSON.stringify(String(m.id)))})">×</button></div></div>`;
                }).join('') + '</div></div>';
            });
            hList.innerHTML = timelineHtml + '<div class="diary-existing-meals">' + html + '</div>';
        }

        function toggleMealGroup(el) { const content = el.parentElement.querySelector('.meal-group-content'), chevron = el.querySelector('.chevron'); if (!content) return; const collapsed = content.classList.toggle('collapsed'); if(chevron) chevron.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)'; }

                                function openRecipeDetails(id) {
            const r = recipesData.find(x => String(x.id) === String(id)); if(!r) return;
            const nutrition = getRecipeNutrition(r);
            const meta = getRecipeDietMeta(r, nutrition);
            const time = getRecipeTime(r);
            const storage = getPrepStorage(r);
            const img = safeImageUrl(r.image_url);
            const detailHero = document.querySelector('.detail-hero');
            const detailImg = document.getElementById('detail-img');
            if (detailHero) detailHero.classList.toggle('detail-hero-empty', !img);
            if (detailImg) {
                detailImg.hidden = !img;
                if (img) detailImg.src = img;
                else detailImg.removeAttribute('src');
            }
            document.getElementById('detail-title').innerText = r.title || '';
            document.getElementById('detail-badges').innerHTML = getRecipeDetailTags({ recipe: r, nutrition, meta, time }).slice(0, 2).map(tag => '<span class="recipe-badge ' + tag.className + '">' + escapeHTML(tag.label) + '</span>').join('');
            let ingHtml = '';
            const workingIngredients = getRecipeWorkingIngredients(r).filter(i => Number(i.weight) > 0);
            const total = getRecipePortionNutrition(r, workingIngredients);
            recipeDetailPortionDraft = {
                recipeId: String(r.id),
                ingredients: workingIngredients.map(clonePortionIngredient),
                total,
                grams: Math.max(1, Math.round(total.grams || 100))
            };
            workingIngredients.forEach(i => {
                if(i.products) {
                    const unitData = normalizeIngredientUnit(Number(i.weight) || 0, i.unit || i.products?.unit || 'g', i.products.name);
                    ingHtml += '<div class="ingredient-item"><span>' + escapeHTML(i.products.name) + '</span><span>' + escapeHTML(formatIngredientAmount(unitData.amount, unitData.unit)) + '</span></div>';
                }
            });
            document.getElementById('detail-macros').innerHTML =
                '<div class="detail-macro-summary"><div class="detail-macro-icon" aria-hidden="true"></div><div class="detail-macro-copy"><span>КБЖУ / 100 г</span><b>' + formatMacroLine(nutrition) + '</b></div><div class="detail-macro-actions"><button class="detail-edit-recipe-btn" type="button" onclick="openRecipeEditFromDetails(' + escapeAttr(JSON.stringify(String(r.id))) + ')">Изменить рецепт</button><div class="detail-time-pill">' + time + ' мин</div></div></div>' +
                '<div class="detail-portion-card" id="detail-portion-card"><div class="detail-portion-title">Вес порции</div><div class="detail-portion-control"><button class="detail-portion-step" type="button" aria-label="Уменьшить порцию" onclick="stepRecipeDetailPortion(-10)">−</button><label class="detail-portion-field"><input id="detail-portion-input" type="number" inputmode="decimal" min="1" step="1" oninput="setRecipeDetailPortionGrams(this.value)"><span>г</span></label><button class="detail-portion-step detail-portion-plus" type="button" aria-label="Увеличить порцию" onclick="stepRecipeDetailPortion(10)">+</button></div><div class="detail-portion-total" id="detail-portion-total"></div></div>';
            const recommended = getRecommendedRecipes({ recipes: [r], userGoal: userProfile.goal_type, mealType: r.mealType, currentMacros: stats })[0];
            document.getElementById('detail-fit-note').innerText = (recommended?.reason || getRecipeFitNote(meta, nutrition)) + ' Хранение: ' + storage.shelfLife + (storage.canFreeze ? '. Можно замораживать.' : '. Лучше хранить охлажденным.');
            document.getElementById('detail-ingredients').innerHTML = ingHtml || '<p style="color:var(--text-muted);font-size:14px;">Ингредиенты не указаны</p>';
            const steps = getRecipeInstructionSteps(r);
            document.getElementById('detail-instructions').innerHTML = steps.length ? steps.map((step, index) => '<div class="detail-step"><span>' + (index + 1) + '</span><p>' + escapeHTML(step) + '</p></div>').join('') : '<div class="detail-note">Инструкция по приготовлению пока не добавлена.</div>';
            const cta = document.querySelector('.detail-sticky-cta');
            if (cta) {
                cta.innerHTML = '<button class="detail-add-btn" id="detail-add-btn" type="button"><span class="detail-add-icon">+</span>Добавить в дневник</button>';
            }
            renderRecipeDetailPortion();
            document.getElementById('detail-add-btn').onclick = () => { const grams = recipeDetailPortionDraft?.recipeId === String(r.id) ? recipeDetailPortionDraft.grams : null; closeRecipeDetails(); addRecipeToDiary(r.id, grams); };
            setDisplayedLayer('recipe-details', document.getElementById('recipe-details-modal'), true);
        }

        function closeRecipeDetails() { setDisplayedLayer('recipe-details', document.getElementById('recipe-details-modal'), false); recipeDetailPortionDraft = null; }
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
                showToast('Добавлено в ' + mealType);
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
            document.querySelectorAll('.coach-hero, .coach-feedback-grid, .home-smart-card, .nutrition-coach-card, .intake-card, .home-primary-cta, .home-bottom-nav, .nutritions-card, .recipes-open-row, .recipe-section-control, #recipe-list, .meal-prep-preview, .history-header, #history-list, .top-nav').forEach(el => { el.style.display = show ? 'none' : ''; });
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
