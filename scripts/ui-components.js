function Button({ className = '', type = 'button', attrs = '', label = '' } = {}) {
            return '<button class="' + escapeAttr(className) + '" type="' + escapeAttr(type) + '"' + (attrs ? ' ' + attrs : '') + '>' + label + '</button>';
        }

        function Card({ className = '', attrs = '', content = '' } = {}) {
            return '<div class="' + escapeAttr(className) + '"' + (attrs ? ' ' + attrs : '') + '>' + content + '</div>';
        }

        function Tag({ className = '', label = '' } = {}) {
            return '<span class="' + escapeAttr(className) + '">' + escapeHTML(label) + '</span>';
        }

        function Modal({ id = '', className = '', content = '' } = {}) {
            return '<div id="' + escapeAttr(id) + '" class="' + escapeAttr(className) + '">' + content + '</div>';
        }

        function BottomSheet({ className = '', content = '' } = {}) {
            return '<div class="' + escapeAttr(className) + '">' + content + '</div>';
        }

        function StickyCTA({ className = 'detail-sticky-cta', content = '' } = {}) {
            return '<div class="' + escapeAttr(className) + '">' + content + '</div>';
        }

        function ProductCard(ing, index, swap) {
            const product = ing.products || {};
            return '<div class="portion-ingredient"><div class="portion-ingredient-main"><b>' + escapeHTML(product.name || 'Продукт') + '</b><div class="portion-product-macros">' + Math.round(Number(product.kcal) || 0) + ' ккал / 100 г · Б ' + (Number(product.protein) || 0).toFixed(1) + ' · Ж ' + (Number(product.fat) || 0).toFixed(1) + ' · У ' + (Number(product.carbs) || 0).toFixed(1) + '</div>' + swap + '</div><label class="portion-grams-field"><span class="portion-subtitle">В рецепте, г</span><input type="number" inputmode="decimal" min="0" step="1" value="' + escapeAttr(String(Math.round(Number(ing.weight) || 0))) + '" oninput="setPortionIngredientGrams(' + index + ', this.value)"></label></div>';
        }

function renderRecipeCard(item, favs, compact = false) {
            const r = item.recipe;
            const nutrition = item.nutrition;
            const meta = item.meta;
            const id = String(r.id);
            const idArg = JSON.stringify(id);
            const img = safeImageUrl(r.image_url);
            const hasStableImage = !!img && !(compact && /source\.unsplash\.com/i.test(img));
            const portionTotal = typeof getRecipeWorkingIngredients === 'function' && typeof getRecipePortionNutrition === 'function'
                ? getRecipePortionNutrition(r, getRecipeWorkingIngredients(r))
                : null;
            const recipeWeight = Math.round(Number(portionTotal?.grams) || Number(nutrition.grams) || (Array.isArray(r.ingredients) ? r.ingredients.reduce((sum, ing) => sum + (Number(ing.weight || ing.default_grams || ing.defaultGrams || ing.grams || ing.amount) || 0), 0) : 0));
            const servings = Number(r.servings) || 1;
            const metaLine = [r.category || 'Рецепт', recipeWeight > 0 ? recipeWeight + ' г' : '', servings > 0 ? servings + ' порц.' : ''].filter(Boolean).join(' · ');
            const cardClass = 'recipe-card' + (compact ? ' recipe-card-compact' : '') + (hasStableImage ? ' recipe-has-image' : ' recipe-no-image') + (item.personalScore > 0 ? ' recipe-personal-match' : '');
            const isFav = favs.map(String).includes(String(r.id));
            const favButton = '<button class="fav-btn" type="button" aria-label="' + (isFav ? 'Убрать из избранного' : 'Добавить в избранное') + '" style="color: ' + (isFav ? '#d85f5a' : '#b79a64') + ';" onclick="toggleFavorite(event, ' + escapeAttr(idArg) + ')">' + (isFav ? '♥' : '♡') + '</button>';
            return '<div class="' + cardClass + '" role="button" tabindex="0" onclick="if(event.target.closest(\'.recipe-add-btn,.fav-btn\')) return; openRecipeDetails(' + escapeAttr(idArg) + ')" onkeydown="if((event.key===\'Enter\'||event.key===\' \')&&!event.target.closest(\'.recipe-add-btn,.fav-btn\')){event.preventDefault();openRecipeDetails(' + escapeAttr(idArg) + ')}">' +
                '<div class="recipe-image" style="' + (hasStableImage ? 'background-image: url(&quot;' + escapeAttr(img) + '&quot;)' : '') + '">' +
                (!hasStableImage ? '<span class="recipe-image-placeholder" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 4v16"></path><path d="M11 4v6a4 4 0 0 1-8 0V4"></path><path d="M17 4v16"></path><path d="M17 4c3 2 4 5 4 8h-4"></path></svg></span>' : '') +
                (compact ? '' : favButton) + '</div>' +
                '<div class="recipe-content"><div class="recipe-title">' + escapeHTML(r.title) + '</div>' +
                '<div class="recipe-meta-line">' + escapeHTML(metaLine) + '</div>' +
                '<div class="recipe-kbju-line">' + Math.round(nutrition.kcal) + ' ккал · Б ' + (Number(nutrition.protein) || 0).toFixed(1) + ' · Ж ' + (Number(nutrition.fat) || 0).toFixed(1) + ' · У ' + (Number(nutrition.carbs) || 0).toFixed(1) + '</div></div>' +
                (compact ? favButton : '') +
                '<button class="recipe-add-btn" type="button" aria-label="Добавить рецепт в дневник" data-recipe-id="' + encodeData(r.id) + '" data-k="' + encodeData(nutrition.kcal) + '" data-p="' + encodeData(nutrition.protein) + '" data-f="' + encodeData(nutrition.fat) + '" data-c="' + encodeData(nutrition.carbs) + '">+</button></div>';
        }

function formatRecipeGridMacroValue(value) {
            return Math.round(Number(value) || 0);
        }

const RECIPE_GRID_FALLBACK_IMAGE = 'images/recipe-placeholder.svg';

function renderRecipeGridCard({
            id,
            title,
            image,
            tag = 'Много белка',
            kcal,
            protein,
            fat,
            carbs,
            isFavorite = false,
            onClick = 'openRecipeDetails',
            onToggleFavorite = 'toggleFavorite'
        } = {}) {
            const recipeId = String(id || '');
            const idArg = JSON.stringify(recipeId);
            const safeImg = safeImageUrl(String(image || '').trim());
            const favoriteClass = isFavorite ? ' is-favorite' : '';
            const favoriteLabel = isFavorite ? 'Убрать из избранного' : 'Добавить в избранное';
            const macroLine = 'КБЖУ ' +
                formatRecipeGridMacroValue(kcal) + '/' +
                formatRecipeGridMacroValue(protein) + '/' +
                formatRecipeGridMacroValue(fat) + '/' +
                formatRecipeGridMacroValue(carbs);
            const imageSrc = safeImg || RECIPE_GRID_FALLBACK_IMAGE;
            const imageClass = 'recipe-grid-card-img' + (safeImg ? '' : ' is-placeholder');
            const fallbackSrc = escapeAttr(RECIPE_GRID_FALLBACK_IMAGE);
            const imageHtml = '<img class="' + imageClass + '" src="' + escapeAttr(imageSrc) + '" alt="' + escapeAttr(safeImg ? (title || 'Рецепт') : '') + '" loading="lazy" onerror="this.onerror=null;this.classList.add(\'is-placeholder\');this.src=\'' + fallbackSrc + '\'">';
            return '<article class="recipe-grid-card" role="button" tabindex="0" onclick="' + onClick + '(' + escapeAttr(idArg) + ')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();' + onClick + '(' + escapeAttr(idArg) + ')}">' +
                '<div class="recipe-grid-card-media">' +
                    imageHtml +
                    '<button class="recipe-grid-favorite' + favoriteClass + '" type="button" aria-label="' + favoriteLabel + '" aria-pressed="' + (isFavorite ? 'true' : 'false') + '" onclick="event.stopPropagation();' + onToggleFavorite + '(event, ' + escapeAttr(idArg) + ')">' +
                        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.4-9.2-9.2C1.6 7.8 3.5 5 6.7 5c1.9 0 3.3 1 4.1 2.2C11.6 6 13 5 14.9 5c3.2 0 5.1 2.8 3.9 6.3C17.5 16.1 12 20.5 12 20.5Z"></path></svg>' +
                    '</button>' +
                    (tag ? '<span class="recipe-grid-badge">' + escapeHTML(tag) + '</span>' : '') +
                '</div>' +
                '<div class="recipe-grid-card-body">' +
                    '<div class="recipe-grid-card-title">' + escapeHTML(title || 'Рецепт') + '</div>' +
                    '<div class="recipe-grid-kbju">' + escapeHTML(macroLine) + '</div>' +
                '</div>' +
            '</article>';
        }

function getRecipeGridCardTag(item) {
            const recipe = item?.recipe || {};
            const nutrition = item?.nutrition || {};
            const tags = recipe.nutritionTags || [];
            return tags.includes('high_protein') || Number(nutrition.protein) >= 18 ? 'Много белка' : '';
        }

function renderRecipeGrid(items = [], favs = [], options = {}) {
            const favoriteIds = new Set((favs || []).map(String));
            const onClick = options.onClick || 'openRecipeDetails';
            const onToggleFavorite = options.onToggleFavorite || 'toggleFavorite';
            return (items || []).map(item => {
                const recipe = item.recipe || {};
                const nutrition = item.nutrition || {};
                return renderRecipeGridCard({
                    id: String(recipe.id || ''),
                    title: recipe.title || 'Рецепт',
                    image: recipe.image_url || recipe.image || '',
                    tag: getRecipeGridCardTag(item),
                    kcal: nutrition.kcal,
                    protein: nutrition.protein,
                    fat: nutrition.fat,
                    carbs: nutrition.carbs,
                    isFavorite: favoriteIds.has(String(recipe.id || '')),
                    onClick,
                    onToggleFavorite
                });
            }).join('');
        }

function renderMealSlot(type, plan) {
            const items = getDayPlanItems(mealPrepState.selectedDate, plan).filter(item => item.mealType === type);
            const totals = items.reduce((sum, item) => {
                const recipe = getRecipeById(item.recipeId);
                if (!recipe) return sum;
                const n = getRecipePortionNutrition(recipe, hydratePortionIngredients(item.ingredients, recipe));
                const servings = Number(item.servings) || 1;
                sum.kcal += n.kcal * servings;
                sum.protein += n.protein * servings;
                return sum;
            }, { kcal: 0, protein: 0 });
            const itemHtml = items.length ? items.map(item => {
                const recipe = getRecipeById(item.recipeId);
                if (!recipe) return '';
                const n = getRecipePortionNutrition(recipe, hydratePortionIngredients(item.ingredients, recipe));
                return '<div class="meal-plan-item"><div><div class="meal-plan-item-title">' + escapeHTML(recipe.title) + '</div><div class="meal-plan-item-meta">' + Math.round(n.kcal * item.servings) + ' ккал · ' + item.servings + ' порц.</div></div><button class="mini-icon-btn" type="button" aria-label="Изменить граммы" onclick="openRecipePortionEditor(\'plan-edit\', ' + escapeAttr(JSON.stringify(String(recipe.id))) + ', { itemId: \'' + escapeAttr(item.id) + '\', ingredients: ' + escapeAttr(JSON.stringify(item.ingredients || [])) + ' })">g</button><button class="mini-icon-btn" type="button" aria-label="Открыть рецепт" onclick="openRecipeDetails(' + escapeAttr(JSON.stringify(String(recipe.id))) + ')">i</button><button class="mini-icon-btn" type="button" aria-label="Удалить из меню" onclick="removeMealPlanItem(\'' + escapeAttr(item.id) + '\')">×</button></div>';
            }).join('') : '<div class="empty-state" style="padding:14px 8px;"><div class="empty-state-icon">＋</div><div style="font-weight:760;color:var(--text-main);margin-bottom:4px;">Пока нет блюд</div><div>Нажми плюс, чтобы выбрать блюдо.</div></div>';
            return '<div class="planner-card meal-slot"><div class="meal-slot-top"><div><div class="meal-slot-name">' + type + '</div><div class="meal-slot-status">' + Math.round(totals.kcal) + ' ккал · ' + Math.round(totals.protein) + ' г белка</div></div><button class="meal-slot-add-btn" type="button" aria-label="Добавить блюдо" onclick="openMealPicker(\'' + type + '\')">+</button></div>' + itemHtml + '</div>';
        }

function renderPrepRecipes() {
            const grid = document.getElementById('prep-recipes-grid');
            if (!grid) return;
            const items = sortRecipeItems(getEnrichedRecipes().filter(item => isMealPrepRecipe(item.recipe, item.nutrition)), 'recommended').slice(0, 24);
            if (!items.length) {
                grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🍱</div><div style="font-weight:800;color:var(--text-main);margin-bottom:6px;">Заготовки появятся позже</div><div>Добавьте рецепты с порциями, временем приготовления и ингредиентами.</div></div>';
                return;
            }
            grid.innerHTML = items.map(item => {
                const r = item.recipe;
                const img = safeImageUrl(r.image_url);
                const storage = getPrepStorage(r);
                const portion = getRecipePortionNutrition(r);
                const perServingKcal = Math.round(portion.kcal / storage.servings);
                const perServingProtein = Math.round(portion.protein / storage.servings);
                const idArg = escapeAttr(JSON.stringify(String(r.id)));
                return '<div class="prep-recipe-card" role="button" tabindex="0" onclick="openRecipeDetails(' + idArg + ')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();openRecipeDetails(' + idArg + ')}"><div class="prep-recipe-img" style="' + (img ? 'background-image:url(&quot;' + escapeAttr(img) + '&quot;)' : '') + '"></div><div class="prep-recipe-body"><div class="prep-recipe-title">' + escapeHTML(r.title) + '</div><div class="prep-recipe-primary-stats"><span>' + perServingKcal + ' ккал</span><span>' + perServingProtein + ' г белка</span></div><button class="planner-add-btn" type="button" onclick="event.stopPropagation(); openRecipePortionEditor(\'plan\', ' + idArg + ', { date: mealPrepState.selectedDate, mealType: \'' + (r.category || 'Обед') + '\' })">Добавить в меню</button></div></div>';
            }).join('');
        }
