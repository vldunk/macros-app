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
            return '<div class="portion-ingredient"><div><b>' + escapeHTML(ing.products?.name || 'Продукт') + '</b><div class="portion-product-macros"><span>' + Math.round(Number(ing.products?.kcal) || 0) + ' ккал / 100 г</span><span>' + Math.round(Number(ing.products?.protein) || 0) + ' г белка</span></div>' + swap + '</div><label><span class="portion-subtitle">Граммы</span><input type="number" inputmode="decimal" min="0" step="1" value="' + escapeAttr(String(Math.round(Number(ing.weight) || 0))) + '" oninput="setPortionIngredientGrams(' + index + ', this.value)"></label></div>';
        }

function renderRecipeCard(item, favs, compact = false) {
            const r = item.recipe;
            const nutrition = item.nutrition;
            const meta = item.meta;
            const id = String(r.id);
            const idArg = JSON.stringify(id);
            const img = safeImageUrl(r.image_url);
            const cardClass = item.personalScore > 0 ? 'recipe-card recipe-personal-match' : 'recipe-card';
            return '<div class="' + cardClass + '">' +
                '<div class="recipe-image" style="' + (img ? 'background-image: url(&quot;' + escapeAttr(img) + '&quot;)' : '') + '" onclick="openRecipeDetails(' + escapeAttr(idArg) + ')">' +
                '<div class="fav-btn" style="color: ' + (favs.map(String).includes(String(r.id)) ? '#ff3b30' : '#ffffff') + ';" onclick="toggleFavorite(event, ' + escapeAttr(idArg) + ')">' + (favs.map(String).includes(String(r.id)) ? '❤️' : '🤍') + '</div></div>' +
                '<div class="recipe-content"><div class="recipe-title" onclick="openRecipeDetails(' + escapeAttr(idArg) + ')">' + escapeHTML(r.title) + '</div>' +
                '<div class="recipe-primary-stats"><span class="recipe-primary-stat">' + Math.round(nutrition.kcal) + ' ккал</span><span class="recipe-primary-stat">' + Math.round(nutrition.protein) + ' г белка</span></div>' +
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

