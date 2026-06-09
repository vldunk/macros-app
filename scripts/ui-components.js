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
            const cardClass = 'recipe-card' + (compact ? ' recipe-card-compact' : '') + (hasStableImage ? ' recipe-has-image' : ' recipe-no-image') + (item.personalScore > 0 ? ' recipe-personal-match' : '');
            return '<div class="' + cardClass + '" role="button" tabindex="0" onclick="if(event.target.closest(\'.recipe-add-btn,.fav-btn\')) return; openRecipeDetails(' + escapeAttr(idArg) + ')" onkeydown="if((event.key===\'Enter\'||event.key===\' \')&&!event.target.closest(\'.recipe-add-btn,.fav-btn\')){event.preventDefault();openRecipeDetails(' + escapeAttr(idArg) + ')}">' +
                '<div class="recipe-image" style="' + (hasStableImage ? 'background-image: url(&quot;' + escapeAttr(img) + '&quot;)' : '') + '">' +
                (!hasStableImage ? '<span class="recipe-image-placeholder" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 4v16"></path><path d="M11 4v6a4 4 0 0 1-8 0V4"></path><path d="M17 4v16"></path><path d="M17 4c3 2 4 5 4 8h-4"></path></svg></span>' : '') +
                '<div class="fav-btn" style="color: ' + (favs.map(String).includes(String(r.id)) ? '#d85f5a' : '#b79a64') + ';" onclick="toggleFavorite(event, ' + escapeAttr(idArg) + ')">' + (favs.map(String).includes(String(r.id)) ? '♥' : '♡') + '</div></div>' +
                '<div class="recipe-content"><div class="recipe-title">' + escapeHTML(r.title) + '</div>' +
                '<div class="recipe-kbju-line">На 100 г: ' + Math.round(nutrition.kcal) + ' ккал · Б ' + Math.round(nutrition.protein) + ' г · Ж ' + Math.round(nutrition.fat) + ' г · У ' + Math.round(nutrition.carbs) + ' г</div>' +
                '<div class="recipe-time-line">' + getRecipeTime(r) + ' мин</div>' +
                '<button class="recipe-add-btn" type="button" data-recipe-id="' + encodeData(r.id) + '" data-k="' + encodeData(nutrition.kcal) + '" data-p="' + encodeData(nutrition.protein) + '" data-f="' + encodeData(nutrition.fat) + '" data-c="' + encodeData(nutrition.carbs) + '">Добавить</button></div></div>';
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
