#!/usr/bin/env node
/*
  MyPie catalog recipe tool

  Commands:
    npm run recipe:new            import blocks from recipes-import.md
    npm run recipe:import         import blocks from recipes-import.md
    npm run recipe:validate       validate catalogRecipes.js
    node scripts/recipe-new.js --import path/to/file.md
*/

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const readline = require('readline');
const { randomUUID } = require('crypto');

const ROOT = process.cwd();
const CATALOG_CANDIDATES = [
  path.join(ROOT, 'src/data/catalogRecipes.js'),
  path.join(ROOT, 'catalogRecipes.js'),
];
const DEFAULT_IMPORT_FILE = path.join(ROOT, 'recipes-import.md');
const IMPORTED_FILE = path.join(ROOT, 'recipes-imported.md');
const IMAGE_RECIPE_DIR = path.join(ROOT, 'assets/recipes');
const SUPPORTED_IMAGE_EXTENSIONS = ['webp', 'jpg', 'jpeg', 'png'];
const IMPORT_TEMPLATE = `# Paste Import для рецептов MyPie

Вставляй один или несколько рецептов между маркерами.
После успешного импорта обработанные блоки будут перенесены в \`recipes-imported.md\`.

===RECIPE===

Название:

Описание:

Категория:

Вес:

Порций:

КБЖУ на 100 г

ккал

белки

жиры

углеводы

Ингредиенты

Приготовление

===END===
`;
const VALID_CATEGORIES = [
  'Завтрак',
  'Обед',
  'Ужин',
  'Перекус',
  'Десерт',
  'Напиток',
  'Салат',
  'Соус',
  'Основное блюдо',
];
const CATEGORY_TO_MEAL = {
  'Завтрак': 'breakfast',
  'Обед': 'lunch',
  'Ужин': 'dinner',
  'Перекус': 'snack',
  'Десерт': 'snack',
  'Напиток': 'snack',
  'Салат': 'lunch',
  'Соус': 'snack',
  'Основное блюдо': 'lunch',
};

function findCatalogPath() {
  const found = CATALOG_CANDIDATES.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error('Не найден catalogRecipes.js. Ожидал src/data/catalogRecipes.js или catalogRecipes.js в корне.');
  }
  return found;
}

function loadCatalog(filePath = findCatalogPath()) {
  const source = fs.readFileSync(filePath, 'utf8');
  const sandbox = {};
  vm.createContext(sandbox);
  const script = new vm.Script(`${source}\n;({ CATALOG_RECIPES, CATALOG_RECIPE_CATEGORIES: typeof CATALOG_RECIPE_CATEGORIES !== 'undefined' ? CATALOG_RECIPE_CATEGORIES : [] });`);
  const result = script.runInContext(sandbox);
  return {
    source,
    recipes: Array.isArray(result.CATALOG_RECIPES) ? result.CATALOG_RECIPES : [],
    categories: Array.isArray(result.CATALOG_RECIPE_CATEGORIES) && result.CATALOG_RECIPE_CATEGORIES.length
      ? result.CATALOG_RECIPE_CATEGORIES
      : VALID_CATEGORIES,
  };
}

function stripBom(value) {
  return String(value || '').replace(/^\uFEFF/, '');
}

function normalizeText(value) {
  return stripBom(value)
    .replace(/\r/g, '')
    .replace(/[\u00A0\t]+/g, ' ')
    .replace(/[–—]/g, '—')
    .trim();
}

function capitalizeFirst(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

const RU_TO_LAT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  і: 'i', ї: 'yi', є: 'ye', ґ: 'g',
};

function slugify(input) {
  const translit = String(input || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((ch) => RU_TO_LAT[ch] ?? ch)
    .join('');
  return translit
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function normalizeNumber(value) {
  if (value === undefined || value === null) return 0;
  const match = String(value).replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function round(value, digits = 1) {
  const n = Number(value) || 0;
  return Number(n.toFixed(digits));
}

function getNextSort(recipes) {
  const max = recipes.reduce((acc, item) => Math.max(acc, Number(item.sort) || 0), 0);
  return max + 10;
}

function splitBlocks(text) {
  return normalizeText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function findHeadingIndex(lines, patterns, start = 0) {
  return lines.findIndex((line, index) => index >= start && patterns.some((pattern) => pattern.test(line)));
}

function getStructuredField(text, label) {
  const lines = normalizeText(text).split('\n');
  const labelPattern = new RegExp(`^${label}\\s*:\\s*(.*)$`, 'i');
  const stopPattern = /^(Название|Описание|Категория|Вес|Общий вес|Выход|Порций|Порции|Время|Время приготовления)\s*:|^КБЖУ|^БЖУ|^Пищевая ценность|^Ингредиенты\s*:?$|^Приготовление\s*:?$|^Способ приготовления\s*:?$|^Шаги\s*:?$|^===END===|^END$/i;
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].trim().match(labelPattern);
    if (!match) continue;
    const inline = match[1].trim();
    if (inline) return inline;
    const collected = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const line = lines[j].trim();
      if (!line) continue;
      if (stopPattern.test(line)) break;
      collected.push(line);
    }
    return collected.join('\n').trim();
  }
  return '';
}

function parseNutrition(text) {
  const normalized = normalizeText(text);
  const result = { calories: 0, protein: 0, fat: 0, carbs: 0 };

  const lineRules = [
    ['calories', /(?:калорийн(?:ость)?|ккал|calories|energy)[^\n\d-]*(-?\d+(?:[,.]\d+)?)/i],
    ['protein', /(?:белк(?:и|ов)?|protein|\bб\b)[^\n\d-]*(-?\d+(?:[,.]\d+)?)/i],
    ['fat', /(?:жир(?:ы|ов)?|fat|\bж\b)[^\n\d-]*(-?\d+(?:[,.]\d+)?)/i],
    ['carbs', /(?:углевод(?:ы|ов)?|carbs|carbohydrates|\bу\b)[^\n\d-]*(-?\d+(?:[,.]\d+)?)/i],
  ];

  for (const line of normalized.split('\n')) {
    for (const [key, rule] of lineRules) {
      if (!result[key]) {
        const match = line.match(rule);
        if (match) result[key] = normalizeNumber(match[1]);
      }
    }
  }

  if (result.calories && result.protein && result.fat !== 0 && result.carbs !== 0) return result;

  const kbjuMatch = normalized.match(/(?:кбжу|бжу|пищевая ценность)[^\n:]*:?([\s\S]{0,160})/i);
  if (kbjuMatch) {
    const nums = kbjuMatch[1].match(/\d+(?:[,.]\d+)?/g) || [];
    if (nums.length >= 4) {
      return {
        calories: normalizeNumber(nums[0]),
        protein: normalizeNumber(nums[1]),
        fat: normalizeNumber(nums[2]),
        carbs: normalizeNumber(nums[3]),
      };
    }
  }

  const lines = splitBlocks(normalized);
  const kbjuIndex = findHeadingIndex(lines, [/^кбжу/i, /^бжу/i, /пищевая ценность/i]);
  if (kbjuIndex !== -1) {
    const nums = [];
    for (let i = kbjuIndex + 1; i < lines.length && nums.length < 4; i += 1) {
      if (/^ингредиенты\s*:?$/i.test(lines[i])) break;
      const match = lines[i].match(/\d+(?:[,.]\d+)?/);
      if (match) nums.push(match[0]);
    }
    if (nums.length >= 4) {
      return {
        calories: normalizeNumber(nums[0]),
        protein: normalizeNumber(nums[1]),
        fat: normalizeNumber(nums[2]),
        carbs: normalizeNumber(nums[3]),
      };
    }
  }

  return result;
}

function parseSection(lines, startPatterns, endPatterns) {
  const start = findHeadingIndex(lines, startPatterns);
  if (start === -1) return [];
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (endPatterns.some((pattern) => pattern.test(lines[i]))) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end);
}

function inferIngredientCategory(name) {
  const n = String(name || '').toLowerCase();
  if (/(куриц|индейк|говядин|мяс|ветчин|фарш)/i.test(n)) return 'meat';
  if (/(рыб|лосос|тунец|кревет)/i.test(n)) return 'fish';
  if (/(творог|йогурт|молок|сыр|кефир|сливк|сметан)/i.test(n)) return 'dairy';
  if (/(яйц)/i.test(n)) return 'eggs';
  if (/(рис|овсян|греч|булгур|мук|лаваш|хлеб|макарон|киноа)/i.test(n)) return 'grains';
  if (/(огур|томат|помид|перец|капуст|морков|овощ|зелень|салат|лук|кабач)/i.test(n)) return 'vegetables';
  if (/(банан|ягод|малина|клубник|яблок|фрукт|груш|апельсин)/i.test(n)) return 'fruits';
  if (/(орех|миндал|фисташ|семен|чиа|кунжут)/i.test(n)) return 'nuts';
  if (/(масл|оливк)/i.test(n)) return 'oils';
  if (/(соль|перец|спец|какао|ванил|корица|разрыхл)/i.test(n)) return 'spices';
  return 'other';
}

function parseIngredientLine(line) {
  let raw = line.replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
  if (!raw || /^[А-ЯA-ZЁ\s-]+:?$/.test(raw) && raw.endsWith(':')) return null;
  raw = raw.replace(/:$/, '').trim();
  const parts = raw.split(/\s+[—-]\s+|\s+-\s+/);
  let name = parts[0]?.trim() || raw;
  let amountText = parts.slice(1).join(' — ').trim();

  if (!amountText) {
    const trailing = raw.match(/^(.+?)\s+(\d+(?:[,.]\d+)?\s*(?:г|гр|g|мл|ml|шт|pcs|ч\.л\.|ст\.л\.).*)$/i);
    if (trailing) {
      name = trailing[1].trim();
      amountText = trailing[2].trim();
    }
  }

  const value = normalizeNumber(amountText);
  let unit = 'g';
  if (/мл|ml/i.test(amountText)) unit = 'ml';
  if (/шт|pcs|egg|яйц/i.test(amountText) && !/(г|гр|g|мл|ml)/i.test(amountText)) unit = 'pcs';
  const grams = /(г|гр|g|мл|ml)/i.test(amountText) ? value : 0;

  return {
    name: name.trim(),
    weight: grams || value || 0,
    amount: value || 0,
    unit,
    displayAmount: amountText || '',
    category: inferIngredientCategory(name),
  };
}

function parseIngredients(lines) {
  return lines
    .map(parseIngredientLine)
    .filter((item) => item && item.name && item.name.length > 1);
}

function parseSteps(lines) {
  return lines
    .map((line) => line.replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim())
    .filter((line) => line && !/^получается/i.test(line));
}

function parseRecipeText(input) {
  const text = normalizeText(input).replace(/\nEND\s*$/i, '').trim();
  const lines = splitBlocks(text);
  if (!lines.length) throw new Error('Пустой текст рецепта.');

  const structuredName = getStructuredField(text, 'Название');
  const name = structuredName || lines[0];

  const ingredientsLines = parseSection(lines, [/^ингредиенты\s*:?$/i], [/^приготовление\s*:?$/i, /^способ приготовления\s*:?$/i, /^шаги\s*:?$/i]);
  const prepLines = parseSection(lines, [/^приготовление\s*:?$/i, /^способ приготовления\s*:?$/i, /^шаги\s*:?$/i], [/^end$/i]);

  const nutritionIndex = findHeadingIndex(lines, [/пищевая ценность/i, /^кбжу/i, /^бжу/i]);
  const ingredientsIndex = findHeadingIndex(lines, [/^ингредиенты\s*:?$/i]);

  let description = getStructuredField(text, 'Описание');
  if (!description) {
    const descStart = 1;
    const descEndCandidates = [nutritionIndex, ingredientsIndex].filter((i) => i > 0);
    const descEnd = descEndCandidates.length ? Math.min(...descEndCandidates) : Math.min(lines.length, 3);
    description = lines.slice(descStart, descEnd).join(' ').trim();
  }

  const categoryText = getStructuredField(text, 'Категория');
  const totalWeightText = getStructuredField(text, 'Вес') || getStructuredField(text, 'Общий вес') || getStructuredField(text, 'Выход');
  const servingsText = getStructuredField(text, 'Порций') || getStructuredField(text, 'Порции');
  const cookingTimeText = getStructuredField(text, 'Время') || getStructuredField(text, 'Время приготовления');

  const nutrition = parseNutrition(text);
  const ingredients = parseIngredients(ingredientsLines);
  const steps = parseSteps(prepLines);

  return {
    name: normalizeTitle(name),
    description,
    category: normalizeCategory(categoryText),
    total_weight: normalizeNumber(totalWeightText) || 100,
    servings: normalizeNumber(servingsText) || 1,
    cookingTime: normalizeNumber(cookingTimeText) || 20,
    nutrition,
    ingredients,
    steps,
  };
}

function validateImportBlock(blockText, parsed) {
  const errors = [];
  const lines = splitBlocks(blockText);
  const kbjuIndex = findHeadingIndex(lines, [/^кбжу/i, /^бжу/i, /пищевая ценность/i]);
  let nutritionNumberCount = 0;
  if (kbjuIndex !== -1) {
    for (let i = kbjuIndex + 1; i < lines.length; i += 1) {
      if (/^ингредиенты\s*:?$/i.test(lines[i])) break;
      nutritionNumberCount += (lines[i].match(/\d+(?:[,.]\d+)?/g) || []).length;
    }
  }
  if (!parsed.name) errors.push('Не найдено поле "Название"');
  if (!parsed.description) errors.push('Не найдено поле "Описание"');
  if (!parsed.category) errors.push('Не найдено поле "Категория"');
  if (!getStructuredField(blockText, 'Вес') && !getStructuredField(blockText, 'Общий вес') && !getStructuredField(blockText, 'Выход')) errors.push('Не найдено поле "Вес"');
  if (!getStructuredField(blockText, 'Порций') && !getStructuredField(blockText, 'Порции')) errors.push('Не найдено поле "Порций"');
  if (kbjuIndex === -1 || nutritionNumberCount < 4) errors.push('В блоке КБЖУ должно быть 4 числа: ккал, белки, жиры, углеводы');
  if (!parsed.ingredients.length) errors.push('Не найдены ингредиенты');
  if (!parsed.steps.length) errors.push('Не найдены шаги приготовления');
  return errors;
}

function normalizeTitle(value) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  if (!text) return '';
  if (text === text.toUpperCase()) {
    return text.toLowerCase().replace(/^./, (m) => m.toUpperCase());
  }
  return text;
}

function normalizeCategory(value) {
  if (!value) return '';
  const text = String(value).trim();
  const byNumber = Number(text);
  if (byNumber >= 1 && byNumber <= VALID_CATEGORIES.length) return VALID_CATEGORIES[byNumber - 1];
  const found = VALID_CATEGORIES.find((cat) => cat.toLowerCase() === text.toLowerCase());
  return found || '';
}

function buildRecipe(parsed, existingRecipes, category) {
  const slug = slugify(parsed.name);
  const recipe = {
    id: randomUUID(),
    slug,
    sort: getNextSort(existingRecipes),
    name: parsed.name,
    description: parsed.description || '',
    category,
    mealType: CATEGORY_TO_MEAL[category] || 'snack',
    image_url: `assets/recipes/${slug}.webp`,
    total_weight: parsed.total_weight || 100,
    servings: parsed.servings || 1,
    nutrition: {
      calories: round(parsed.nutrition.calories || 0),
      protein: round(parsed.nutrition.protein || 0),
      fat: round(parsed.nutrition.fat || 0),
      carbs: round(parsed.nutrition.carbs || 0),
    },
    ingredients: parsed.ingredients || [],
    steps: parsed.steps || [],
    cookingTime: parsed.cookingTime || 20,
    storage: '',
    goalTags: ['maintenance'],
    nutritionTags: ['balanced'],
    isMealPrep: false,
    isFreezerFriendly: false,
    searchKeywords: buildSearchKeywords(parsed.name, category, parsed.ingredients),
  };
  return recipe;
}

function buildSearchKeywords(name, category, ingredients) {
  const words = new Set();
  words.add(String(category || '').toLowerCase());
  String(name || '')
    .toLowerCase()
    .split(/[^а-яёa-z0-9]+/i)
    .filter((word) => word.length >= 3)
    .forEach((word) => words.add(word));
  (ingredients || []).slice(0, 6).forEach((item) => {
    String(item.name || '')
      .toLowerCase()
      .split(/[^а-яёa-z0-9]+/i)
      .filter((word) => word.length >= 3)
      .forEach((word) => words.add(word));
  });
  return Array.from(words).filter(Boolean).slice(0, 12);
}

function validateRecipe(recipe, recipes) {
  const errors = [];
  if (!recipe.name) errors.push('нет name');
  if (!recipe.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(recipe.id)) errors.push('id не UUID');
  if (!recipe.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(recipe.slug)) errors.push('invalid slug: ' + recipe.slug);
  if (!Number.isFinite(Number(recipe.sort)) || Number(recipe.sort) <= 0) errors.push('sort должен быть положительным числом');
  if (!VALID_CATEGORIES.includes(recipe.category)) errors.push('некорректная category: ' + recipe.category);
  if (!recipe.nutrition || !recipe.nutrition.calories || !recipe.nutrition.protein && recipe.nutrition.protein !== 0 || !recipe.nutrition.fat && recipe.nutrition.fat !== 0 || !recipe.nutrition.carbs && recipe.nutrition.carbs !== 0) errors.push('неполные nutrition');
  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) errors.push('нет ingredients');
  if (!Array.isArray(recipe.steps) || recipe.steps.length === 0) errors.push('нет steps');
  if (!recipe.image_url) errors.push('нет image_url');
  const imageExtPattern = SUPPORTED_IMAGE_EXTENSIONS.join('|');
  const imagePattern = recipe.slug ? new RegExp(`^assets/recipes/${recipe.slug}\\.(${imageExtPattern})$`, 'i') : null;
  if (recipe.slug && !imagePattern.test(recipe.image_url || '')) errors.push('некорректный image_url');

  if (recipes) {
    const sameSlug = recipes.filter((r) => r.slug === recipe.slug);
    const sameId = recipes.filter((r) => r.id === recipe.id);
    if (sameSlug.length > 1) errors.push('дубликат slug: ' + recipe.slug);
    if (sameId.length > 1) errors.push('дубликат id: ' + recipe.id);
  }

  return errors;
}

function validateCatalog() {
  const { recipes } = loadCatalog();
  const errors = [];
  const slugMap = new Map();
  const idMap = new Map();
  const sortMap = new Map();

  recipes.forEach((recipe, index) => {
    const localErrors = validateRecipe(recipe);
    if (recipe.slug) slugMap.set(recipe.slug, (slugMap.get(recipe.slug) || 0) + 1);
    if (recipe.id) idMap.set(recipe.id, (idMap.get(recipe.id) || 0) + 1);
    if (recipe.sort !== undefined && recipe.sort !== null) sortMap.set(Number(recipe.sort), (sortMap.get(Number(recipe.sort)) || 0) + 1);
    localErrors.forEach((err) => errors.push(`#${index + 1} ${recipe.name || recipe.slug || 'Без названия'}: ${err}`));
  });

  for (const [slug, count] of slugMap.entries()) {
    if (count > 1) errors.push(`Дубликат slug: ${slug}`);
  }
  for (const [id, count] of idMap.entries()) {
    if (count > 1) errors.push(`Дубликат id: ${id}`);
  }
  for (const [sort, count] of sortMap.entries()) {
    if (count > 1) errors.push(`Дубликат sort: ${sort}`);
  }

  if (errors.length) {
    console.error('Найдены ошибки каталога:\n');
    errors.forEach((err) => console.error('— ' + err));
    process.exitCode = 1;
    return;
  }
  console.log(`Каталог в порядке. Рецептов: ${recipes.length}.`);
}

function findArrayCloseIndex(source) {
  const start = source.indexOf('const CATALOG_RECIPES');
  if (start === -1) throw new Error('Не найден const CATALOG_RECIPES.');
  const bracketStart = source.indexOf('[', start);
  if (bracketStart === -1) throw new Error('Не найден массив CATALOG_RECIPES.');

  let depth = 0;
  let quote = null;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = bracketStart; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '/' && next === '/') {
      inLineComment = true;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '[') depth += 1;
    if (ch === ']') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new Error('Не удалось найти конец массива CATALOG_RECIPES.');
}

function formatRecipeObject(recipe) {
  return JSON.stringify(recipe, null, 4).replace(/^/gm, '    ');
}

function insertRecipe(recipe) {
  const filePath = findCatalogPath();
  const source = fs.readFileSync(filePath, 'utf8');
  const closeIndex = findArrayCloseIndex(source);
  const before = source.slice(0, closeIndex).replace(/\s*$/, '');
  const after = source.slice(closeIndex);
  const needsComma = !before.endsWith('[');
  const recipeText = `${needsComma ? ',' : ''}\n${formatRecipeObject(recipe)}\n`;
  fs.writeFileSync(filePath, before + recipeText + after, 'utf8');
}

function printPreview(recipe) {
  console.log('\nПредпросмотр рецепта:\n');
  console.log(`Название: ${recipe.name}`);
  console.log(`Категория: ${recipe.category}`);
  console.log(`Slug: ${recipe.slug}`);
  console.log(`Sort: ${recipe.sort}`);
  console.log(`Вес: ${recipe.total_weight} г`);
  console.log(`Порций: ${recipe.servings}`);
  console.log(`КБЖУ: ${recipe.nutrition.calories} ккал · Б ${recipe.nutrition.protein} · Ж ${recipe.nutrition.fat} · У ${recipe.nutrition.carbs}`);
  console.log(`Ингредиенты: ${recipe.ingredients.length}`);
  recipe.ingredients.slice(0, 10).forEach((item) => console.log(`  — ${item.name}${item.displayAmount ? ' — ' + item.displayAmount : ''}`));
  if (recipe.ingredients.length > 10) console.log(`  ... ещё ${recipe.ingredients.length - 10}`);
  console.log(`Шаги: ${recipe.steps.length}`);
  recipe.steps.slice(0, 5).forEach((step, index) => console.log(`  ${index + 1}. ${step}`));
  if (recipe.steps.length > 5) console.log(`  ... ещё ${recipe.steps.length - 5}`);
  console.log(`photo: ${recipe.image_url}`);
}

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));
}

async function askCategory(rl, parsedCategory = '') {
  if (parsedCategory && VALID_CATEGORIES.includes(parsedCategory)) {
    const answer = await ask(rl, `Категория: ${parsedCategory}. Оставить? (Enter = да, или введите новую): `);
    if (!answer) return parsedCategory;
    return normalizeCategory(answer) || await askCategory(rl, '');
  }
  console.log('\nВыберите категорию:');
  VALID_CATEGORIES.forEach((cat, index) => console.log(`${index + 1}. ${cat}`));
  while (true) {
    const answer = await ask(rl, 'Категория номером или текстом: ');
    const category = normalizeCategory(answer);
    if (category) return category;
    console.log('Некорректная категория. Выберите номер от 1 до 9 или текст из списка.');
  }
}

async function askNumberWithDefault(rl, label, currentValue) {
  const answer = await ask(rl, `${label} (${currentValue || 0}, Enter = оставить): `);
  if (!answer) return currentValue;
  const value = normalizeNumber(answer);
  return value || currentValue;
}

async function readPastedRecipe(rl) {
  console.log('Вставьте полный текст рецепта. Когда закончите, введите строку END и нажмите Enter.\n');
  const lines = [];
  while (true) {
    const line = await ask(rl, '');
    if (/^END$/i.test(line.trim())) break;
    lines.push(line);
  }
  return lines.join('\n');
}

function ensureUnique(recipe, recipes) {
  if (recipes.some((item) => item.slug === recipe.slug)) {
    throw new Error(`Рецепт со slug "${recipe.slug}" уже существует.`);
  }
  if (recipes.some((item) => item.id === recipe.id)) {
    throw new Error(`Рецепт с id "${recipe.id}" уже существует.`);
  }
}

async function createOneInteractive() {
  const catalog = loadCatalog();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const raw = await readPastedRecipe(rl);
    let parsed = parseRecipeText(raw);
    if (!parsed.name) throw new Error('Не удалось определить название рецепта.');

    const category = await askCategory(rl, parsed.category);
    parsed.total_weight = await askNumberWithDefault(rl, 'Общий вес готового блюда, г', parsed.total_weight || 100);
    parsed.servings = await askNumberWithDefault(rl, 'Количество порций', parsed.servings || 1);

    const recipe = buildRecipe(parsed, catalog.recipes, category);
    ensureUnique(recipe, catalog.recipes);

    const validationErrors = validateRecipe(recipe);
    if (validationErrors.length) {
      console.log('\nНужно исправить перед сохранением:');
      validationErrors.forEach((err) => console.log('— ' + err));
      return;
    }

    printPreview(recipe);
    const confirm = await ask(rl, '\nСохранить рецепт? (y/n): ');
    if (!/^y|д/i.test(confirm)) {
      console.log('Сохранение отменено.');
      return;
    }

    insertRecipe(recipe);
    console.log('\nРецепт добавлен в каталог.');
    console.log('Добавьте изображения:');
    console.log(recipe.image_url);
    console.log('\nПроверьте каталог: npm run recipe:validate');
  } finally {
    rl.close();
  }
}

function splitImportBlocks(text) {
  const blocks = [];
  const regex = /===RECIPE===([\s\S]*?)===END===/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const block = match[1].trim();
    if (block) blocks.push({ body: block, raw: match[0].trim() });
  }
  if (!blocks.length && text.trim()) {
    blocks.push({ body: text.trim(), raw: `===RECIPE===\n\n${text.trim()}\n\n===END===` });
  }
  return blocks;
}

function ensureImportFile(filePath = DEFAULT_IMPORT_FILE) {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, IMPORT_TEMPLATE, 'utf8');
}

function ensureImageDirs() {
  fs.mkdirSync(IMAGE_RECIPE_DIR, { recursive: true });
}

function isEmptyTemplateBlock(blockBody) {
  let parsed;
  try {
    parsed = parseRecipeText(blockBody);
  } catch (_) {
    parsed = null;
  }
  const normalized = normalizeText(blockBody);
  const hasRecipeData = [
    getStructuredField(normalized, 'Название'),
    getStructuredField(normalized, 'Описание'),
    getStructuredField(normalized, 'Категория'),
    getStructuredField(normalized, 'Вес'),
    getStructuredField(normalized, 'Порций'),
  ].some(Boolean);
  const hasIngredients = parsed && parsed.ingredients.length > 0;
  const hasSteps = parsed && parsed.steps.length > 0;
  const nutrition = parsed?.nutrition || {};
  const hasNutrition = [nutrition.calories, nutrition.protein, nutrition.fat, nutrition.carbs].some((value) => Number(value) > 0);
  return !hasRecipeData && !hasIngredients && !hasSteps && !hasNutrition;
}

function missingImagesFor(recipe) {
  const files = [];
  const photo = recipe.image_url || (recipe.slug ? `assets/recipes/${recipe.slug}.webp` : '');
  if (photo && !fs.existsSync(path.join(ROOT, photo))) files.push(`${recipe.name}\nslug: ${recipe.slug}\nphoto: ${photo}`);
  return files;
}

function appendImportedBlocks(importedBlocks) {
  if (!importedBlocks.length) return;
  const header = `\n\n## Imported ${new Date().toISOString()}\n\n`;
  fs.appendFileSync(IMPORTED_FILE, header + importedBlocks.join('\n\n') + '\n', 'utf8');
}

function rewriteImportFile(filePath, failedBlocks) {
  if (!failedBlocks.length) {
    fs.writeFileSync(filePath, IMPORT_TEMPLATE, 'utf8');
    return;
  }
  fs.writeFileSync(filePath, failedBlocks.join('\n\n') + '\n', 'utf8');
}

function importRecipes(filePath) {
  const resolved = path.resolve(ROOT, filePath || DEFAULT_IMPORT_FILE);
  ensureImportFile(resolved);
  ensureImageDirs();
  const text = fs.readFileSync(resolved, 'utf8');
  const blocks = splitImportBlocks(text).filter((block) => !isEmptyTemplateBlock(block.body));
  const catalog = loadCatalog();
  const existing = [...catalog.recipes];
  const created = [];
  const errors = [];
  const importedBlocks = [];
  const failedBlocks = [];
  const missingImages = [];

  blocks.forEach((block, index) => {
    try {
      const parsed = parseRecipeText(block.body);
      const importErrors = validateImportBlock(block.body, parsed);
      if (importErrors.length) throw new Error(importErrors.join('; '));
      const category = parsed.category || 'Перекус';
      if (!VALID_CATEGORIES.includes(category)) throw new Error('Не указана корректная категория. Добавьте строку "Категория: ...".');
      const recipe = buildRecipe(parsed, existing, category);
      ensureUnique(recipe, existing);
      const validationErrors = validateRecipe(recipe);
      if (validationErrors.length) throw new Error(validationErrors.join('; '));
      insertRecipe(recipe);
      existing.push(recipe);
      created.push(recipe);
      importedBlocks.push(block.raw);
      missingImages.push(...missingImagesFor(recipe));
    } catch (error) {
      let title = 'Блок #' + (index + 1);
      try {
        title = parseRecipeText(block.body).name || title;
      } catch (_) {}
      errors.push(`${title}\n${error.message}`);
      failedBlocks.push(block.raw);
    }
  });

  appendImportedBlocks(importedBlocks);
  rewriteImportFile(resolved, failedBlocks);

  console.log(`Импортировано: ${created.length} рецептов`);
  const photoList = created.length ? created : existing;
  console.log('\nФото рецептов:\n');
  photoList.forEach((recipe) => {
    const photo = recipe.image_url || (recipe.slug ? `assets/recipes/${recipe.slug}.webp` : '');
    console.log(recipe.name || recipe.title || 'Рецепт');
    console.log(`slug: ${recipe.slug}`);
    console.log(`photo: ${photo}`);
    console.log('');
  });
  console.log('Куда положить фото: assets/recipes/');
  console.log('\nОшибок:');
  console.log(errors.length);
  if (errors.length) {
    console.error('\nОшибка:');
    errors.forEach((err) => console.error('— ' + err.replace(/\n/g, '\n  ')));
    process.exitCode = 1;
  }
  if (missingImages.length) {
    console.log('\nНе найдено изображение:');
    Array.from(new Set(missingImages)).forEach((item) => console.log('— ' + item));
  }
  if (importedBlocks.length) {
    console.log('\nОбработанные блоки перенесены в recipes-imported.md.');
  } else {
    console.log('\nГотовых блоков для импорта не найдено. Добавьте рецепты в recipes-import.md между ===RECIPE=== и ===END===.');
  }
  if (failedBlocks.length) console.log('Проблемные блоки оставлены в recipes-import.md для исправления.');
}

function printHelp() {
  console.log(`MyPie recipe tool\n\nКоманды:\n  npm run recipe:new              импортировать рецепты из recipes-import.md\n  npm run recipe:import           импортировать рецепты из recipes-import.md\n  npm run recipe:validate         проверить catalogRecipes.js\n  node scripts/recipe-new.js --import path/to/file.md\n`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) return printHelp();
  if (args.includes('--validate')) return validateCatalog();
  const importIndex = args.indexOf('--import');
  if (importIndex !== -1) return importRecipes(args[importIndex + 1] || DEFAULT_IMPORT_FILE);
  return createOneInteractive();
}

main().catch((error) => {
  console.error('\nОшибка:', error.message);
  process.exit(1);
});
