
function getNutritionCoachContext(overrides = {}) {
    const profile = { ...userProfile, ...(overrides.profile || {}) };
    const dayStats = { ...stats, ...(overrides.stats || {}) };
    const target = key => Math.max(Number(profile['target_' + key]) || 0, 0);
    const current = key => Math.max(Number(dayStats[key]) || 0, 0);
    const targetKcal = target('kcal');
    const targetProtein = target('protein');
    const targetFat = target('fat');
    const targetCarbs = target('carbs');
    const usedKcal = current('kcal');
    const usedProtein = current('protein');
    const usedFat = current('fat');
    const usedCarbs = current('carbs');
    const ratio = (value, max) => max > 0 ? value / max : 0;
    const hour = Number.isFinite(Number(overrides.hour)) ? Number(overrides.hour) : new Date().getHours();
    return {
        goalType: profile.goal_type || 'maintain',
        workoutsPerWeek: Math.max(Number(profile.workouts_per_week) || 0, 0),
        hour,
        hasDiary: usedKcal > 0 || usedProtein > 0 || usedFat > 0 || usedCarbs > 0,
        targetKcal,
        targetProtein,
        targetFat,
        targetCarbs,
        kcalLeft: Math.max(targetKcal - usedKcal, 0),
        proteinLeft: Math.max(targetProtein - usedProtein, 0),
        fatLeft: Math.max(targetFat - usedFat, 0),
        carbsLeft: Math.max(targetCarbs - usedCarbs, 0),
        kcalPct: ratio(usedKcal, targetKcal),
        proteinPct: ratio(usedProtein, targetProtein),
        fatPct: ratio(usedFat, targetFat),
        carbsPct: ratio(usedCarbs, targetCarbs)
    };
}

function buildNutritionCoachAdvice(overrides = {}) {
    const ctx = getNutritionCoachContext(overrides);
    const evening = ctx.hour >= 17;
    const nearKcalLimit = ctx.kcalPct >= .86 || (ctx.targetKcal > 0 && ctx.kcalLeft <= Math.min(320, ctx.targetKcal * .16));
    const fatHigh = ctx.fatPct >= 1;
    const fatClose = ctx.fatPct >= .82;
    const proteinLow = ctx.targetProtein > 0 && ctx.proteinPct < .72;
    const carbsLow = ctx.targetCarbs > 0 && ctx.carbsPct < .58;
    const hasTrainingRoutine = ctx.workoutsPerWeek > 0;
    const cutGoal = ctx.goalType === 'cut';
    const gainGoal = ctx.goalType === 'bulk' || ctx.goalType === 'muscle';
    let meta = cutGoal ? 'Цель: сушка' : gainGoal ? 'Цель: рост' : 'Цель: баланс';
    let tip = 'Собери следующий прием вокруг белка, овощей и понятной порции углеводов.';
    let risk = 'Следи за темпом КБЖУ: один прием не обязан закрывать весь план.';
    let upgrade = 'В рационе сначала смотри блюда, которые закрывают главный остаток дня.';

    if (!ctx.hasDiary) {
        tip = cutGoal
            ? 'Начни с нежирного белка и спокойной порции гарнира.'
            : 'Добавь первый прием с белком, чтобы рекомендации стали точнее.';
        risk = 'Пока дневник пустой, coach видит только цель и нормы.';
        upgrade = hasTrainingRoutine
            ? 'Если сегодня тренировка, оставь белок и сложные углеводы рядом с ней.'
            : 'Начни с блюда с белком и понятной порцией.';
        meta += ' · старт дня';
        return { meta, tip, risk, upgrade, context: ctx };
    }

    meta += evening ? ' · вечер' : ctx.hour < 12 ? ' · утро' : ' · день';
    if (fatHigh) {
        tip = 'Следующий прием лучше сделать легче: нежирный белок и овощи.';
        risk = 'Жиры уже выше ориентира, соусы, сыр и масла легко добавят лишнее.';
        upgrade = 'В подборке выбирай high protein и low fat варианты.';
    } else if (nearKcalLimit) {
        tip = 'Осталось мало калорий: выбирай легкий белковый вариант.';
        risk = fatClose ? 'Жиры уже близко к лимиту — плотный ужин сузит выбор.' : 'Калорийный перекус может быстро закрыть дневной запас.';
        upgrade = proteinLow ? 'Добирай белок без тяжелых соусов и больших добавок.' : 'Оставь небольшой прием или воду под вечерний ритм.';
    } else if (proteinLow) {
        tip = 'Сегодня стоит добрать белок в следующем приеме пищи.';
        risk = evening ? 'Белок еще проседает, а вечером запас решений уже меньше.' : 'Если белок откладывать, к вечеру его сложнее добрать спокойно.';
        upgrade = fatClose ? 'Ищи нежирный белок: рыба, курица, творог или йогурт.' : 'Выбирай блюда с высоким белком и удобной порцией.';
    } else if (carbsLow && hasTrainingRoutine) {
        tip = 'Если сегодня тренировка, добавь сложные углеводы рядом с белком.';
        risk = 'Углеводы пока низко для активного дня — энергия может просесть.';
        upgrade = 'Подойдет крупа, картофель или овсянка вместе с белковым блюдом.';
    } else if (cutGoal && fatClose) {
        tip = 'На сушке держи следующий прием легким по жирам.';
        risk = 'Жиры близко к лимиту, даже небольшой соус меняет итог дня.';
        upgrade = 'Замени жирный соус на йогуртовый или оставь его отдельно.';
    } else if (gainGoal && carbsLow) {
        tip = 'Для роста добавь спокойные углеводы к белковому приему.';
        risk = 'Без углеводов набрать дневную энергию будет труднее.';
        upgrade = 'Выбирай блюдо с крупой или картофелем и белком.';
    } else {
        tip = 'Темп ровный: держи белок в следующем приеме и не спеши с добавками.';
        risk = fatClose ? 'Жиры уже близко к ориентиру, дальше лучше без тяжелых соусов.' : 'Главный риск сейчас — случайный перекус без учета остатка КБЖУ.';
        upgrade = carbsLow ? 'Добавь умеренную порцию сложных углеводов, если нужен тонус.' : 'Сравни блюда по остатку калорий и белка.';
    }
    return { meta, tip, risk, upgrade, context: ctx };
}

function getRecommendedRecipes({ recipes, userGoal, mealType, currentMacros } = {}) {
    const goalMap = { cut: 'cutting', deficit: 'cutting', weight_loss: 'weight_loss', maintain: 'maintenance', maintenance: 'maintenance', bulk: 'bulking', bulking: 'bulking', muscle: 'muscle_gain', muscle_gain: 'muscle_gain' };
    const normalizedGoal = goalMap[userGoal] || goalMap[userProfile?.goal_type] || 'maintenance';
    const list = filterRecipes(recipes || recipesData, { mealType, goalTags: normalizedGoal });
    const proteinLeft = Math.max((Number(userProfile?.target_protein) || 0) - (Number(currentMacros?.protein ?? stats?.protein) || 0), 0);
    return list.map(recipe => {
        let score = 0;
        const tags = recipe.nutritionTags || [];
        if (normalizedGoal === 'cutting' || normalizedGoal === 'weight_loss') {
            if (tags.includes('high_protein')) score += 3;
            if (tags.includes('low_calorie')) score += 3;
            if (tags.includes('low_fat') || tags.includes('low_carb')) score += 1;
        } else if (normalizedGoal === 'maintenance') {
            if (tags.includes('balanced')) score += 4;
            if (tags.includes('quick')) score += 1;
        } else if (normalizedGoal === 'bulking') {
            score += Number(recipe.calories) >= 130 ? 2 : 0;
            score += Number(recipe.carbs) >= 12 ? 2 : 0;
            if (tags.includes('high_protein')) score += 1;
        } else if (normalizedGoal === 'muscle_gain') {
            if (tags.includes('high_protein')) score += 4;
            if (tags.includes('balanced')) score += 2;
            if (Number(recipe.carbs) >= 8) score += 1;
        }
        if (proteinLeft > 30 && tags.includes('high_protein')) score += 2;
        const reason = buildRecommendationReason(recipe, normalizedGoal);
        return { recipe, reason, score };
    }).sort((a, b) => b.score - a.score || b.recipe.protein - a.recipe.protein);
}
