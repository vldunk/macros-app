(function () {
    const sortOptions = [
        ['popular', 'По популярности'],
        ['calories', 'По калориям'],
        ['protein', 'По белку'],
        ['title', 'По названию']
    ];

    const categoryOptions = [
        ['all', 'Все'],
        ['breakfast', 'Завтрак'],
        ['lunch', 'Обед'],
        ['dinner', 'Ужин'],
        ['snack', 'Перекус'],
        ['dessert', 'Десерт'],
        ['salad', 'Салат'],
        ['main', 'Основное блюдо'],
        ['drink', 'Напиток'],
        ['sauce', 'Соус']
    ];

    const stateV2 = {
        sort: 'popular',
        category: 'all',
        lastState: null,
        detailId: null,
        originalOpenRecipeDetails: null,
        openRecipeDetailsWrapped: false
    };

    function html(value) {
        if (typeof escapeHTML === 'function') return escapeHTML(value);
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    function attr(value) {
        if (typeof escapeAttr === 'function') return escapeAttr(value);
        return html(value);
    }

    function data(value) {
        if (typeof encodeData === 'function') return encodeData(value);
        return attr(value);
    }

    function getImage(recipe = {}) {
        const raw = String(recipe.image_url || recipe.image || '').trim();
        return typeof safeImageUrl === 'function' ? safeImageUrl(raw) : raw;
    }

    function macroLine(nutrition = {}) {
        return Math.round(Number(nutrition.kcal) || 0) + ' ккал • Б ' +
            Math.round(Number(nutrition.protein) || 0) + ' • Ж ' +
            Math.round(Number(nutrition.fat) || 0) + ' • У ' +
            Math.round(Number(nutrition.carbs) || 0);
    }

    function normalize(value) {
        return String(value || '').toLowerCase();
    }

    function recipeText(recipe = {}) {
        return normalize([
            recipe.title,
            recipe.name,
            recipe.category,
            recipe.meal,
            recipe.type,
            ...(Array.isArray(recipe.tags) ? recipe.tags : []),
            ...(Array.isArray(recipe.categories) ? recipe.categories : [])
        ].filter(Boolean).join(' '));
    }

    function recipeMatchesCategory(item, category) {
        if (category === 'all') return true;
        const recipe = item?.recipe || {};
        const text = recipeText(recipe);
        const categoryMap = {
            breakfast: ['завтрак', 'breakfast'],
            lunch: ['обед', 'lunch'],
            dinner: ['ужин', 'dinner'],
            snack: ['перекус', 'snack'],
            dessert: ['десерт', 'dessert'],
            salad: ['салат', 'salad'],
            drink: ['напит', 'смузи', 'чай', 'кофе', 'drink'],
            sauce: ['соус', 'sauce']
        };
        if (category === 'main') {
            return !['десерт', 'напит', 'смузи', 'соус'].some(token => text.includes(token));
        }
        return (categoryMap[category] || []).some(token => text.includes(token));
    }

    function sortItems(items) {
        return [...(items || [])].sort((a, b) => {
            const na = a?.nutrition || {};
            const nb = b?.nutrition || {};
            if (stateV2.sort === 'calories') return (Number(nb.kcal) || 0) - (Number(na.kcal) || 0);
            if (stateV2.sort === 'protein') return (Number(nb.protein) || 0) - (Number(na.protein) || 0);
            if (stateV2.sort === 'title') return String(a?.recipe?.title || '').localeCompare(String(b?.recipe?.title || ''), 'ru');
            return (Number(b?.personalScore) || 0) - (Number(a?.personalScore) || 0);
        });
    }

    function getVisibleItems(items) {
        return sortItems((items || []).filter(item => recipeMatchesCategory(item, stateV2.category)));
    }

    function getAllStateItems(state = stateV2.lastState || {}) {
        return [
            ...(state.items || []),
            ...(state.favoriteItems || [])
        ];
    }

    function getItemById(id, state = stateV2.lastState || {}) {
        return getAllStateItems(state).find(item => String(item?.recipe?.id) === String(id));
    }

    function getIngredientName(ingredient = {}) {
        return ingredient.products?.name || ingredient.product?.name || ingredient.name || ingredient.title || 'Ингредиент';
    }

    function getIngredientAmount(ingredient = {}) {
        const grams = Number(ingredient.weight || ingredient.default_grams || ingredient.defaultGrams || ingredient.grams || ingredient.amount) || 0;
        if (grams > 0) return Math.round(grams) + ' г';
        return String(ingredient.unit || ingredient.measure || '').trim();
    }

    function getRecipeIngredients(recipe = {}) {
        const source = recipe.ingredients || recipe.recipe_ingredients || [];
        return Array.isArray(source)
            ? source.filter(ingredient => getIngredientName(ingredient) && getIngredientAmount(ingredient))
            : [];
    }

    function getRecipeServingRows(recipe = {}) {
        const source = recipe.serving || recipe.forServing || recipe.garnish || recipe.toppings || [];
        return Array.isArray(source)
            ? source.filter(ingredient => getIngredientName(ingredient) && getIngredientAmount(ingredient))
            : [];
    }

    function renderRows(rows = [], emptyText = 'Не указано') {
        if (!rows.length) return '<div class="pm-ingredient-row"><span class="pm-ingredient-name">' + html(emptyText) + '</span><span class="pm-ingredient-amount"></span></div>';
        return rows.map(ingredient => '<div class="pm-ingredient-row"><span class="pm-ingredient-name">' + html(getIngredientName(ingredient)) + '</span><span class="pm-ingredient-amount">' + html(getIngredientAmount(ingredient)) + '</span></div>').join('');
    }

    function RecipesV2Search(state = {}) {
        return '<label class="pm-search" aria-label="Найти рецепт">' +
            '<input id="recipes-v2-search-input" class="pm-search-input" type="search" value="' + attr(state.search || '') + '" placeholder="Найти рецепт" oninput="setRecipeSearch(this.value)">' +
        '</label>';
    }

    function renderSortMenu() {
        return '<div class="pm-sort-menu" data-sort-menu hidden role="dialog" aria-modal="true" aria-label="Сортировка рецептов">' +
            '<div class="pm-sort-panel"><div class="pm-sheet-group"><h2 class="pm-sheet-title">Сортировать</h2><div class="pm-sheet-options">' +
                sortOptions.map(([id, label]) => '<button class="pm-sort-option ' + (stateV2.sort === id ? 'is-active' : '') + '" type="button" data-sort-value="' + attr(id) + '" role="option" aria-selected="' + (stateV2.sort === id ? 'true' : 'false') + '">' + html(label) + '</button>').join('') +
            '</div></div><button class="pm-sheet-cancel" type="button" data-sheet-cancel>Отменить</button></div>' +
        '</div>';
    }

    function renderFilterSheet() {
        return '<div class="pm-filter-sheet" data-filter-sheet hidden role="dialog" aria-modal="true" aria-label="Фильтры рецептов">' +
            '<div class="pm-filter-panel"><div class="pm-sheet-group"><h2 class="pm-filter-title">Фильтры</h2><div class="pm-filter-options" data-filter-options>' +
                categoryOptions.map(([id, label]) => '<button class="pm-filter-option ' + (stateV2.category === id ? 'is-active' : '') + '" type="button" data-category-value="' + attr(id) + '">' + html(label) + '</button>').join('') +
            '</div></div><button class="pm-sheet-cancel" type="button" data-sheet-cancel>Отменить</button></div>' +
        '</div>';
    }

    function RecipesV2Controls() {
        const label = sortOptions.find(([id]) => id === stateV2.sort)?.[1] || 'По популярности';
        return '<div class="pm-catalog-controls" data-catalog-controls' + (stateV2.detailId ? ' hidden' : '') + '>' +
            '<button class="pm-control-button" type="button" data-sort-trigger aria-haspopup="dialog" aria-expanded="false"><span data-sort-label>' + html(label) + '</span></button>' +
            '<button class="pm-control-button" type="button" data-filter-trigger aria-haspopup="dialog"><span>Фильтры</span></button>' +
        '</div>';
    }

    function cardBadge(item) {
        const recipe = item?.recipe || {};
        const nutrition = item?.nutrition || {};
        if (Number(nutrition.protein) >= 18) return 'Много белка';
        return recipe.category || 'Рецепт';
    }

    function RecipesV2Card(item, favs = []) {
        const recipe = item?.recipe || {};
        const nutrition = item?.nutrition || {};
        const id = String(recipe.id || '');
        const idArg = JSON.stringify(id);
        const image = getImage(recipe);
        const isFav = favs.map(String).includes(id);
        const imageHtml = image
            ? '<img src="' + attr(image) + '" alt="" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false">' +
              '<div class="pm-image-placeholder" hidden aria-hidden="true"></div>'
            : '<div class="pm-image-placeholder" aria-hidden="true"></div>';

        return '<article class="pm-card" role="button" tabindex="0" data-open="' + data(id) + '" aria-label="Открыть ' + attr(recipe.title || 'Рецепт') + '" onclick="event.stopPropagation(); openRecipeDetails(' + attr(idArg) + ')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();openRecipeDetails(' + attr(idArg) + ')}">' +
            '<div class="pm-image-wrap">' +
                imageHtml +
                '<button class="pm-heart ' + (isFav ? 'is-active' : '') + '" type="button" aria-label="В избранное" aria-pressed="' + (isFav ? 'true' : 'false') + '" data-heart="' + data(id) + '" onclick="event.stopPropagation(); toggleFavorite(event, ' + attr(idArg) + ')">♥</button>' +
                '<div class="pm-badges"><span class="pm-badge">' + html(cardBadge(item)) + '</span></div>' +
            '</div>' +
            '<div class="pm-info"><h2 class="pm-product-title">' + html(recipe.title || 'Рецепт') + '</h2><div class="pm-meta">' + html(macroLine(nutrition)) + '</div></div>' +
            '<div class="pm-action"><button class="pm-add" type="button" data-add="' + data(id) + '" onclick="event.stopPropagation(); quickAddRecipeToDiary(' + attr(idArg) + ', event)">Добавить</button></div>' +
        '</article>';
    }

    function RecipesV2Catalog(state = {}) {
        if (stateV2.detailId) return '<section class="pm-list" data-list aria-label="Список рецептов"></section>';
        const sourceItems = state.activeTab === 'favorites' ? state.favoriteItems : state.items;
        const items = getVisibleItems(sourceItems);
        const emptyTitle = state.activeTab === 'favorites' ? 'В избранном пока пусто' : 'Рецепты не найдены';
        const emptyText = state.activeTab === 'favorites' ? 'Открой рецепт и добавь его в избранное.' : 'Попробуй изменить поиск, фильтр или сортировку.';
        return items.length
            ? '<section class="pm-list is-visible" data-list aria-label="Список рецептов">' + items.map(item => RecipesV2Card(item, state.favs || [])).join('') + '</section>'
            : '<div class="recipes-v2-empty"><b>' + html(emptyTitle) + '</b><span>' + html(emptyText) + '</span></div>';
    }

    function RecipesV2Detail(state = {}) {
        const item = stateV2.detailId ? getItemById(stateV2.detailId, state) : null;
        if (!item) return '<section class="pm-detail" data-detail aria-label="Детальная страница рецепта"></section>';

        const recipe = item.recipe || {};
        const nutrition = item.nutrition || {};
        const id = String(recipe.id || '');
        const idArg = JSON.stringify(id);
        const image = getImage(recipe);
        const imageHtml = image
            ? '<img src="' + attr(image) + '" alt="" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false">' +
              '<div class="pm-image-placeholder" hidden aria-hidden="true"></div>'
            : '<div class="pm-image-placeholder" aria-hidden="true"></div>';
        const isFav = (state.favs || []).map(String).includes(id);
        const ingredients = getRecipeIngredients(recipe);
        const serving = getRecipeServingRows(recipe);
        const descriptionHtml = recipe.description ? '<p class="pm-detail-text">' + html(recipe.description) + '</p>' : '';

        return '<section class="pm-detail is-visible" data-detail aria-label="Детальная страница рецепта">' +
            '<div class="pm-detail-hero">' +
                imageHtml +
                '<button class="pm-heart ' + (isFav ? 'is-active' : '') + '" type="button" aria-label="В избранное" aria-pressed="' + (isFav ? 'true' : 'false') + '" data-heart="' + data(id) + '" onclick="event.stopPropagation(); toggleFavorite(event, ' + attr(idArg) + ')">♥</button>' +
            '</div>' +
            '<div class="pm-detail-body">' +
                '<h2 class="pm-detail-name">' + html(recipe.title || recipe.name || 'Рецепт') + '</h2>' +
                descriptionHtml +
                '<section class="pm-section pm-detail-nutrition-section" aria-label="Пищевая ценность на 100 г">' +
                    '<h3 class="pm-section-title">Пищевая ценность на 100 г</h3>' +
                    '<div class="pm-nutrition">' +
                        '<div class="pm-nutrition-item"><span class="pm-nutrition-value">' + Math.round(Number(nutrition.kcal) || 0) + '</span><span class="pm-nutrition-label">Калории</span></div>' +
                        '<div class="pm-nutrition-item"><span class="pm-nutrition-value">' + Math.round(Number(nutrition.protein) || 0) + '</span><span class="pm-nutrition-label">Белки</span></div>' +
                        '<div class="pm-nutrition-item"><span class="pm-nutrition-value">' + Math.round(Number(nutrition.fat) || 0) + '</span><span class="pm-nutrition-label">Жиры</span></div>' +
                        '<div class="pm-nutrition-item"><span class="pm-nutrition-value">' + Math.round(Number(nutrition.carbs) || 0) + '</span><span class="pm-nutrition-label">Углеводы</span></div>' +
                    '</div>' +
                '</section>' +
                '<section class="pm-section" aria-label="Ингредиенты">' +
                    '<div class="pm-section-header"><h3 class="pm-section-title">Ингредиенты</h3></div>' +
                    '<div class="pm-ingredient-list">' + renderRows(ingredients, 'Ингредиенты не указаны') + '</div>' +
                '</section>' +
                '<section class="pm-section" aria-label="Для подачи">' +
                    '<h3 class="pm-section-title">Для подачи:</h3>' +
                    '<div class="pm-ingredient-list">' + renderRows(serving, 'Не указано') + '</div>' +
                '</section>' +
                '<button class="pm-step-button" type="button">Смотреть рецепт</button>' +
                '<div class="pm-detail-action"><button class="pm-add" type="button" data-add="' + data(id) + '" onclick="event.stopPropagation(); quickAddRecipeToDiary(' + attr(idArg) + ', event)">Добавить</button></div>' +
            '</div>' +
        '</section>';
    }

    function RecipesV2Create() {
        if (typeof openMyRecipesModal === 'function') openMyRecipesModal();
        if (typeof openMyRecipeCreateForm === 'function') openMyRecipeCreateForm();
    }

    function RecipesV2GoHome() {
        stateV2.detailId = null;
        if (typeof closeRecipesScreen === 'function') closeRecipesScreen();
    }

    function RecipesV2GoProfile() {
        stateV2.detailId = null;
        if (typeof closeRecipesScreen === 'function') closeRecipesScreen();
        if (typeof toggleEdit === 'function') window.setTimeout(() => toggleEdit(true), 0);
    }

    function RecipesV2BottomBar(state = {}) {
        const active = state.activeTab === 'favorites' ? 'favorites' : 'recipes';
        return '<nav class="recipes-v2-bottom-bar" aria-label="Основная навигация">' +
            '<button type="button" onclick="RecipesV2.goHome()"><span aria-hidden="true">⌂</span><b>Главная</b></button>' +
            '<button class="' + (active === 'recipes' ? 'active' : '') + '" type="button" onclick="setRecipesV2Tab(\'catalog\')"><span aria-hidden="true">▦</span><b>Рецепты</b></button>' +
            '<button class="recipes-v2-bottom-add" type="button" aria-label="Создать рецепт" onclick="RecipesV2Create()">+</button>' +
            '<button class="' + (active === 'favorites' ? 'active' : '') + '" type="button" onclick="setRecipesV2Tab(\'favorites\')"><span aria-hidden="true">♡</span><b>Избранное</b></button>' +
            '<button type="button" onclick="RecipesV2.goProfile()"><span aria-hidden="true">◌</span><b>Профиль</b></button>' +
        '</nav>';
    }

    function closeSheets() {
        const root = document.getElementById('recipes-v2-root');
        root?.querySelector('[data-sort-menu]')?.setAttribute('hidden', '');
        root?.querySelector('[data-filter-sheet]')?.setAttribute('hidden', '');
        root?.querySelector('[data-sort-trigger]')?.setAttribute('aria-expanded', 'false');
    }

    function rerender() {
        if (stateV2.lastState) render(stateV2.lastState);
    }

    function showList() {
        stateV2.detailId = null;
        rerender();
    }

    function showDetail(id) {
        if (!getItemById(id)) return false;
        stateV2.detailId = String(id);
        closeSheets();
        rerender();
        return true;
    }

    function handleBack(event) {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        if (stateV2.detailId) {
            showList();
            return;
        }
        if (typeof closeRecipesScreen === 'function') closeRecipesScreen();
    }

    function installOpenRecipeDetailsBridge() {
        if (stateV2.openRecipeDetailsWrapped || typeof window.openRecipeDetails !== 'function') return;
        stateV2.originalOpenRecipeDetails = window.openRecipeDetails;
        window.openRecipeDetails = function recipesV2OpenRecipeDetailsBridge(id) {
            const root = document.getElementById('recipes-v2-root');
            const isV2Visible = root && !root.hidden;
            if (isV2Visible && showDetail(id)) return;
            return stateV2.originalOpenRecipeDetails.apply(this, arguments);
        };
        stateV2.openRecipeDetailsWrapped = true;
    }

    function handleClick(event) {
        const root = document.getElementById('recipes-v2-root');
        if (!root || !root.contains(event.target)) return;

        const sortTrigger = event.target.closest('[data-sort-trigger]');
        if (sortTrigger) {
            const sortMenu = root.querySelector('[data-sort-menu]');
            const filterSheet = root.querySelector('[data-filter-sheet]');
            if (!sortMenu) return;
            sortMenu.hidden = !sortMenu.hidden;
            if (filterSheet) filterSheet.hidden = true;
            sortTrigger.setAttribute('aria-expanded', String(!sortMenu.hidden));
            return;
        }

        const filterTrigger = event.target.closest('[data-filter-trigger]');
        if (filterTrigger) {
            const sortMenu = root.querySelector('[data-sort-menu]');
            const sortTriggerEl = root.querySelector('[data-sort-trigger]');
            const filterSheet = root.querySelector('[data-filter-sheet]');
            if (filterSheet) filterSheet.hidden = false;
            if (sortMenu) sortMenu.hidden = true;
            sortTriggerEl?.setAttribute('aria-expanded', 'false');
            return;
        }

        if (event.target === root.querySelector('[data-filter-sheet]') || event.target === root.querySelector('[data-sort-menu]')) {
            closeSheets();
            return;
        }

        if (event.target.closest('[data-sheet-cancel]')) {
            closeSheets();
            return;
        }

        const sortOption = event.target.closest('[data-sort-value]');
        if (sortOption) {
            stateV2.sort = sortOption.dataset.sortValue || 'popular';
            closeSheets();
            rerender();
            return;
        }

        const categoryOption = event.target.closest('[data-category-value]');
        if (categoryOption) {
            stateV2.category = categoryOption.dataset.categoryValue || 'all';
            closeSheets();
            rerender();
            return;
        }

    }

    function render(state = {}) {
        const root = document.getElementById('recipes-v2-root');
        if (!root) return;
        installOpenRecipeDetailsBridge();
        stateV2.lastState = { ...state };
        root.innerHTML = '<main class="pm-shell recipes-v2-shell" aria-label="Каталог рецептов">' +
            '<header class="pm-topbar recipes-v2-header">' +
                '<button class="pm-icon-button recipes-v2-back" type="button" aria-label="Назад" data-back onclick="RecipesV2.handleBack(event)"></button>' +
                RecipesV2Search(state) +
                '<button class="pm-favorites-button" type="button" aria-label="Избранное" onclick="setRecipesV2Tab(\'favorites\')">' +
                    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>' +
                '</button>' +
            '</header>' +
            '<div class="recipes-v2-scroll">' +
                RecipesV2Controls(state) +
                RecipesV2Catalog(state) +
                RecipesV2Detail(state) +
            '</div>' +
            renderSortMenu() +
            renderFilterSheet() +
            RecipesV2BottomBar(state) +
        '</main>';
    }

    document.addEventListener('click', handleClick);

    window.RecipesV2 = {
        render,
        handleBack,
        showList,
        showDetail,
        goHome: RecipesV2GoHome,
        goProfile: RecipesV2GoProfile,
        RecipesV2Catalog,
        RecipesV2Card,
        RecipesV2Detail,
        RecipesV2Create,
        RecipesV2Search,
        RecipesV2BottomBar
    };
    window.RecipesV2Create = RecipesV2Create;
})();
