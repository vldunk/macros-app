# Как добавлять рецепты в каталог MyPie

## Простой процесс

1. Импортируй рецепт:

```bash
npm run recipe:import
```

2. В выводе скрипта посмотри название, slug и точное имя файла фото.
3. Сохрани фото как `{slug}.webp`.
4. Положи фото в одну папку:

```
assets/recipes/
```

5. Проверь приложение.

Пример вывода:

```
Малиновый ПП брауни чизкейк
slug: malinovyi-pp-brauni-chizkeik
photo: assets/recipes/malinovyi-pp-brauni-chizkeik.webp
```

## Правило для фото

Все фото рецептов хранятся в одной папке:

```
assets/recipes/
```

Имя файла всегда равно slug рецепта:

```
{slug}.webp
```

В каталоге рецепта хранится одно поле:

```js
image_url: "assets/recipes/{slug}.webp"
```

Если файла нет, приложение показывает текущий placeholder.

## Где лежит каталог

Все встроенные рецепты приложения находятся в:

```
src/data/catalogRecipes.js
```

Добавлять, удалять и редактировать каталожные рецепты нужно только там.

## Категории

Используй только категории из `CATALOG_RECIPE_CATEGORIES`:

- Завтрак
- Обед
- Ужин
- Перекус
- Десерт
- Напиток
- Салат
- Соус
- Основное блюдо

## Как добавить рецепт вручную

1. Открой `src/data/catalogRecipes.js`.
2. Скопируй шаблон из верхнего комментария файла.
3. Вставь объект в конец массива `CATALOG_RECIPES`.
4. Создай UUID для `id`.
5. Заполни `slug` в kebab-case.
6. Укажи `sort` больше последнего значения.
7. Выбери категорию из `CATALOG_RECIPE_CATEGORIES`.
8. Заполни `nutrition`, `ingredients` и `steps`.
9. Укажи `image_url: "assets/recipes/{slug}.webp"`.
10. Сохрани фото как `{slug}.webp` и положи в `assets/recipes/`.
11. Проверь приложение.

## Как удалить рецепт

Удалить объект рецепта из массива `CATALOG_RECIPES`.

Если фото больше не нужно, удалить файл:

```
assets/recipes/{slug}.webp
```

## Как заменить фото

Замени файл с тем же именем:

```
assets/recipes/{slug}.webp
```

Если меняешь `slug`, поменяй одновременно `slug`, `image_url` и имя файла.

## Проверка

Запусти:

```bash
npm run recipe:validate
```

Команда проверяет обязательные поля, UUID, slug, категории, путь `image_url` и КБЖУ.

## Пример готового рецепта

```js
{
  id: "00000000-0000-4000-8000-000000000000",
  slug: "chicken-rice",
  sort: 310,
  name: "Курица с рисом",
  description: "Высокобелковое блюдо для обеда или ужина.",
  category: "Обед",
  image_url: "assets/recipes/chicken-rice.webp",
  total_weight: 400,
  servings: 1,
  nutrition: {
    calories: 475,
    protein: 42,
    fat: 12,
    carbs: 48
  },
  ingredients: [
    { name: "Куриная грудка", weight: 180, amount: 180, unit: "g", category: "meat" },
    { name: "Рис", weight: 180, amount: 180, unit: "g", category: "grains" },
    { name: "Овощи", weight: 40, amount: 40, unit: "g", category: "vegetables" }
  ],
  steps: [
    "Отварить рис.",
    "Приготовить курицу.",
    "Соединить ингредиенты."
  ],
  cookingTime: 25,
  storage: "Холодильник 2-3 дня.",
  goalTags: ["maintenance"],
  nutritionTags: ["high_protein", "balanced"],
  isMealPrep: true,
  isFreezerFriendly: false,
  searchKeywords: ["курица", "рис", "обед"]
}
```
