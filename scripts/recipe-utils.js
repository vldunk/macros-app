function recipeToSearchHaystack(recipe) {
            return [
                recipe.title,
                recipe.description,
                recipe.mealType,
                recipe.category,
                ...(recipe.goalTags || []),
                ...(recipe.nutritionTags || []),
                ...(recipe.searchKeywords || []),
                ...(recipe.ingredients || []).map(item => item.name)
            ].join(' ').toLowerCase();
        }

function searchRecipes(recipes, query) {
            const q = String(query || '').trim().toLowerCase();
            if (!q) return recipes || [];
            return (recipes || []).filter(recipe => recipeToSearchHaystack(recipe).includes(q));
        }

function getRecipeTime(recipe) {
            return Number(recipe.cooking_time || recipe.cook_time || recipe.time_minutes || recipe.minutes || recipe.prep_time) || 20;
        }

function getRecipeSearchText(recipe) {
            return recipeToSearchHaystack(recipe);
        }

function getRecipeDietMeta(recipe, nutrition) {
            const kcal = Number(nutrition.kcal) || 0;
            const protein = Number(nutrition.protein) || 0;
            const fat = Number(nutrition.fat) || 0;
            const proteinShare = kcal > 0 ? (protein * 4) / kcal : 0;
            const fatShare = kcal > 0 ? (fat * 9) / kcal : 0;
            const tagMap = {
                cutting: { key: 'cut', filter: 'Сушка', label: 'Сушка', className: 'cut' },
                weight_loss: { key: 'loss', filter: 'Похудение', label: 'Дефицит', className: 'loss' },
                maintenance: { key: 'maintain', filter: 'Поддержание', label: 'Поддержание', className: 'maintain' },
                bulking: { key: 'bulk', filter: 'Набор массы', label: 'Набор массы', className: 'bulk' },
                muscle_gain: { key: 'muscle', filter: 'Рост мышц', label: 'Рост мышц', className: 'muscle' },
                high_protein: { key: 'protein', filter: 'Белок+', label: 'Белок+', className: 'protein' }
            };
            const tags = [...(recipe.goalTags || []), ...(recipe.nutritionTags || []).filter(tag => tag === 'high_protein')]
                .map(tag => tagMap[tag])
                .filter(Boolean);
            if (!tags.length) tags.push(tagMap.maintenance);
            const calorieLevel = kcal <= 110 ? 'Легкое' : kcal >= 160 ? 'Плотное' : 'Среднее';
            return { tags, calorieLevel, proteinShare, fatShare };
        }

function getUserRecipeFilters() {
            const goal = userProfile.goal_type || 'maintain';
            if (goal === 'cut') return ['Сушка', 'Похудение', 'Белок+'];
            if (goal === 'bulk') return ['Набор массы', 'Рост мышц', 'Белок+'];
            if (goal === 'muscle') return ['Рост мышц', 'Белок+', 'Поддержание'];
            return ['Поддержание', 'Белок+'];
        }

function recipeMatchesDietFilter(recipe, meta, filter, favs) {
            if (filter === 'Все') return true;
            if (filter === 'Для меня') return meta.tags.some(tag => getUserRecipeFilters().includes(tag.filter));
            if (filter === 'Избранное') return favs.map(String).includes(String(recipe.id));
            return meta.tags.some(tag => tag.filter === filter);
        }

function recipeMatchesMealFilter(recipe, meal) {
            return filterRecipes([recipe], { mealType: meal }).length > 0;
        }

function scoreRecipeForUser(meta, recipe) {
            const filters = getUserRecipeFilters();
            const mealBonus = recipe.category === currentMealFilter ? 4 : 0;
            return meta.tags.reduce((score, tag) => score + (filters.includes(tag.filter) ? 10 : 0), mealBonus);
        }

function getPrimaryRecipeBadge(item) {
            const meta = item.meta;
            const nutrition = item.nutrition;
            const goalMatch = getGoalBadgePriority()
                .map(filter => meta.tags.find(tag => tag.filter === filter))
                .find(Boolean);
            if (goalMatch) return goalMatch;

            const proteinTag = meta.tags.find(tag => tag.filter === 'Белок+');
            if (proteinTag) return proteinTag;
            if ((Number(nutrition.kcal) || 0) <= 350) return { label: 'Легкое', className: 'light', filter: 'Похудение' };
            if ((Number(item.time) || 0) <= 20) return { label: 'Быстро', className: 'quick', filter: 'Быстро' };
            if ((Number(nutrition.kcal) || 0) >= 600) return { label: 'Сытное', className: 'satiety', filter: 'Набор массы' };
            return meta.tags[0] || { label: 'Баланс', className: 'maintain', filter: 'Поддержание' };
        }

function getRecipeDetailTags(item) {
            const seen = new Set();
            const tags = [getPrimaryRecipeBadge(item), ...item.meta.tags];
            if ((Number(item.time) || 0) <= 20) tags.push({ label: 'Быстро', className: 'quick', filter: 'Быстро' });
            if ((Number(item.nutrition.kcal) || 0) <= 350) tags.push({ label: 'Легкое', className: 'light', filter: 'Похудение' });
            return tags.filter(tag => {
                const key = tag?.label;
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            }).slice(0, 5);
        }

function getEnrichedRecipes() {
            return recipesData.map(recipe => {
                const nutrition = getRecipeNutrition(recipe);
                const meta = getRecipeDietMeta(recipe, nutrition);
                return { recipe, nutrition, meta, time: getRecipeTime(recipe), personalScore: scoreRecipeForUser(meta, recipe) };
            });
        }

function sortRecipeItems(items, sortMode) {
            const copy = [...items];
            if (sortMode === 'kcal-asc') return copy.sort((a, b) => a.nutrition.kcal - b.nutrition.kcal);
            if (sortMode === 'protein-desc') return copy.sort((a, b) => b.nutrition.protein - a.nutrition.protein);
            if (sortMode === 'time-asc') return copy.sort((a, b) => a.time - b.time);
            if (sortMode === 'popular') return copy.sort((a, b) => (b.personalScore - a.personalScore) || (b.nutrition.protein - a.nutrition.protein));
            return copy.sort((a, b) => (b.personalScore - a.personalScore) || (a.nutrition.kcal - b.nutrition.kcal));
        }

function recipeGoalScore(item, mealType) {
            const goal = userProfile.goal_type || 'maintain';
            const n = item.nutrition;
            const tags = item.meta.tags.map(tag => tag.filter);
            let score = item.personalScore || 0;
            if (item.recipe.category === mealType) score += 18;
            if (tags.some(tag => getUserRecipeFilters().includes(tag))) score += 16;
            const searchText = getRecipeSearchText(item.recipe);
            const prefs = String(userProfile.food_preferences || '').toLowerCase().split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
            const exclusions = String(userProfile.food_exclusions || '').toLowerCase().split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
            prefs.forEach(pref => { if (pref && searchText.includes(pref)) score += 4; });
            exclusions.forEach(ex => { if (ex && searchText.includes(ex)) score -= 100; });
            if (goal === 'cut') score += (tags.includes('Сушка') ? 22 : 0) + (tags.includes('Похудение') ? 18 : 0) + (tags.includes('Белок+') ? 16 : 0) - Math.max(0, n.fat - 22) - Math.max(0, n.kcal - 520) / 18;
            else if (goal === 'bulk') score += (tags.includes('Набор массы') ? 24 : 0) + (n.kcal >= 480 ? 12 : 0) + (n.carbs >= 40 ? 8 : 0) + (n.protein >= 24 ? 8 : 0);
            else if (goal === 'muscle') score += (tags.includes('Рост мышц') ? 24 : 0) + (tags.includes('Белок+') ? 18 : 0) + (n.protein >= 30 ? 12 : 0) - Math.max(0, n.fat - 28) / 2;
            else score += (tags.includes('Поддержание') ? 20 : 0) - Math.abs(n.kcal - 450) / 35 + (n.protein >= 18 ? 8 : 0);
            return score;
        }

function isMealPrepRecipe(recipe, nutrition) {
            const time = getRecipeTime(recipe);
            const title = String(recipe?.title || '').toLowerCase();
            if (recipe?.isMealPrep !== undefined) return Boolean(recipe.isMealPrep);
            return time >= 25 || getRecipeServings(recipe) > 1 || ['котлет', 'боул', 'запек', 'сырник', 'куриц', 'грудк', 'круп'].some(word => title.includes(word)) || (nutrition.protein >= 25 && nutrition.kcal >= 300);
        }

function getPrepStorage(recipe) {
            const time = getRecipeTime(recipe);
            const canFreeze = time >= 25 || ['Обед', 'Ужин'].includes(recipe?.category);
            return {
                servings: getRecipeServings(recipe),
                shelfLife: recipe?.storage || (canFreeze ? 'морозилка до 30 дней' : 'холодильник 2-3 дня'),
                method: recipe?.isFreezerFriendly ? 'морозилка' : (recipe?.isMealPrep ? 'холодильник' : (canFreeze ? 'морозилка' : 'холодильник')),
                canFreeze: Boolean(recipe?.isFreezerFriendly ?? canFreeze)
            };
        }

function getRecipeFitNote(meta, nutrition) {
            const match = meta.tags.find(tag => getUserRecipeFilters().includes(tag.filter)) || meta.tags[0];
            if (!match) return 'Блюдо можно вписать в рацион по КБЖУ и размеру порции.';
            if (match.filter === 'Сушка') return 'Блюдо хорошо подходит для сушки: много белка, умеренная калорийность и его легко вписать в дневную норму.';
            if (match.filter === 'Похудение') return 'Хороший вариант для дефицита: блюдо не перегружает калории и помогает держать рацион спокойным.';
            if (match.filter === 'Набор массы') return 'Подходит для набора: достаточно энергии и углеводов, чтобы закрывать дневную норму без хаоса.';
            if (match.filter === 'Рост мышц') return 'Хорошо для роста мышц: есть белок и энергетическая база для восстановления.';
            if (match.filter === 'Белок+') return 'Помогает добрать белок без лишней сложности и хорошо ложится в дневник.';
            return 'Сбалансированное блюдо для поддержания веса и ровного питания.';
        }

function buildIngredientSwaps(recipe) {
            const names = (recipe.recipe_ingredients || []).map(i => (i.products?.name || '').toLowerCase());
            const swaps = [];
            if (names.some(n => n.includes('кур') || n.includes('филе'))) swaps.push('Куриное филе → индейка / тунец');
            if (names.some(n => n.includes('греч') || n.includes('рис'))) swaps.push('Гарнир → рис / гречка / киноа');
            if (names.some(n => n.includes('йогурт') || n.includes('творог'))) swaps.push('Йогурт → творог / греческий йогурт');
            if (names.some(n => n.includes('сыр'))) swaps.push('Сыр → легкий сыр / творожный сыр');
            if (names.some(n => n.includes('масл'))) swaps.push('Масло → меньше масла / йогуртовый соус');
            if (!swaps.length) swaps.push('Источник белка можно заменить на похожий по КБЖУ', 'Гарнир можно менять на крупу или овощи', 'Соус лучше держать легким, чтобы не перегружать калории');
            return swaps.slice(0, 4);
        }

function getSimilarRecipes(currentId, meta) {
            const filters = meta.tags.map(tag => tag.filter);
            return getEnrichedRecipes()
                .filter(item => String(item.recipe.id) !== String(currentId))
                .map(item => ({ ...item, simScore: item.meta.tags.reduce((s, tag) => s + (filters.includes(tag.filter) ? 1 : 0), 0) }))
                .filter(item => item.simScore > 0)
                .sort((a, b) => b.simScore - a.simScore || b.personalScore - a.personalScore)
                .slice(0, 3);
        }


