/*
КАК ДОБАВИТЬ НОВЫЙ РЕЦЕПТ:

Быстрый способ:
1. Запусти `npm run recipe:new`.
2. Ответь на вопросы в терминале.
3. Сохрани фото как {slug}.webp и положи в assets/recipes/.
4. Проверь рецепт в приложении.

Ручной способ:
1. Скопируй шаблон рецепта ниже.
2. Вставь объект в конец массива CATALOG_RECIPES.
3. Придумай slug на латинице в kebab-case.
4. Создай постоянный UUID для id.
5. Укажи следующий sort, обычно +10 от последнего рецепта.
6. Выбери category из CATALOG_RECIPE_CATEGORIES.
7. Заполни nutrition, ingredients и steps.
8. Назови фото точно как slug + .webp.

ШАБЛОН НОВОГО РЕЦЕПТА:

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
*/

const CATALOG_RECIPE_CATEGORIES = [
    "Завтрак",
    "Обед",
    "Ужин",
    "Перекус",
    "Десерт",
    "Напиток",
    "Салат",
    "Соус",
    "Основное блюдо"
];

const CATALOG_RECIPES = [
    {
        "id": "3dcee73c-a65d-43a9-85b5-6288b8039ec9",
        "legacyId": 1,
        "slug": "oatmeal-cottage-cheese-pancake",
        "sort": 10,
        "name": "Овсяноблин с творогом",
        "description": "Сытный белковый завтрак с овсянкой, яйцом и творогом.",
        "category": "Завтрак",
        "mealType": "breakfast",
        "image_url": "assets/recipes/oatmeal-cottage-cheese-pancake.webp",
        "total_weight": 256,
        "servings": 1,
        "nutrition": {
            "calories": 146,
            "protein": 12.7,
            "fat": 5.3,
            "carbs": 12.1
        },
        "ingredients": [
            {
                "name": "овсяные хлопья",
                "weight": 40,
                "amount": 40,
                "unit": "g",
                "category": "grains"
            },
            {
                "name": "яйцо",
                "weight": 55,
                "amount": 1,
                "unit": "pcs",
                "category": "eggs"
            },
            {
                "name": "творог 5%",
                "weight": 120,
                "amount": 120,
                "unit": "g",
                "category": "dairy"
            },
            {
                "name": "молоко 1.5%",
                "weight": 40,
                "amount": 40,
                "unit": "ml",
                "category": "dairy"
            },
            {
                "name": "соль",
                "weight": 1,
                "amount": 1,
                "unit": "g",
                "category": "spices"
            }
        ],
        "steps": [
            "Смешайте овсяные хлопья, яйцо, молоко и соль.",
            "Выпекайте блин на антипригарной сковороде 3-4 минуты с каждой стороны.",
            "Добавьте творог внутрь и сложите пополам."
        ],
        "cookingTime": 15,
        "storage": "Лучше есть сразу; в холодильнике до 24 часов.",
        "goalTags": [
            "weight_loss",
            "maintenance",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "balanced",
            "quick"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "овсяноблин",
            "творог",
            "завтрак",
            "овсянка",
            "белок"
        ]
    },
    {
        "id": "5a750763-faed-487b-a14e-754ff0c4764a",
        "legacyId": 2,
        "slug": "turkey-spinach-omelet",
        "sort": 20,
        "name": "Омлет с индейкой и шпинатом",
        "description": "Легкий омлет с постной индейкой и зеленью.",
        "category": "Завтрак",
        "mealType": "breakfast",
        "image_url": "assets/recipes/turkey-spinach-omelet.webp",
        "total_weight": 273,
        "servings": 1,
        "nutrition": {
            "calories": 136,
            "protein": 15.4,
            "fat": 7.2,
            "carbs": 1.6
        },
        "ingredients": [
            {
                "name": "яйца",
                "weight": 110,
                "amount": 2,
                "unit": "pcs",
                "category": "eggs"
            },
            {
                "name": "филе индейки",
                "weight": 80,
                "amount": 80,
                "unit": "g",
                "category": "meat"
            },
            {
                "name": "шпинат",
                "weight": 50,
                "amount": 50,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "молоко 1.5%",
                "weight": 30,
                "amount": 30,
                "unit": "ml",
                "category": "dairy"
            },
            {
                "name": "оливковое масло",
                "weight": 3,
                "amount": 3,
                "unit": "g",
                "category": "oils"
            }
        ],
        "steps": [
            "Нарежьте индейку и прогрейте на сковороде.",
            "Добавьте шпинат на 1 минуту.",
            "Влейте яйца с молоком и готовьте под крышкой до схватывания."
        ],
        "cookingTime": 12,
        "storage": "Холодильник до 24 часов.",
        "goalTags": [
            "cutting",
            "weight_loss",
            "maintenance",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "low_carb",
            "quick"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "омлет",
            "индейка",
            "шпинат",
            "яйца",
            "low carb"
        ]
    },
    {
        "id": "81751ec3-6f78-40ea-8186-4944068e71a5",
        "legacyId": 3,
        "slug": "protein-syrniki",
        "sort": 30,
        "name": "Белковые сырники без сахара",
        "description": "Творожные сырники с рисовой мукой и без добавленного сахара.",
        "category": "Завтрак",
        "mealType": "breakfast",
        "image_url": "assets/recipes/protein-syrniki.webp",
        "total_weight": 392,
        "servings": 2,
        "nutrition": {
            "calories": 164,
            "protein": 16.4,
            "fat": 5,
            "carbs": 12.4
        },
        "ingredients": [
            {
                "name": "творог 2%",
                "weight": 300,
                "amount": 300,
                "unit": "g",
                "category": "dairy"
            },
            {
                "name": "яйцо",
                "weight": 55,
                "amount": 1,
                "unit": "pcs",
                "category": "eggs"
            },
            {
                "name": "рисовая мука",
                "weight": 35,
                "amount": 35,
                "unit": "g",
                "category": "grains"
            },
            {
                "name": "подсластитель",
                "weight": 1,
                "amount": 1,
                "unit": "g",
                "category": "other"
            },
            {
                "name": "ваниль",
                "weight": 1,
                "amount": 1,
                "unit": "g",
                "category": "spices"
            }
        ],
        "steps": [
            "Смешайте творог, яйцо, муку, подсластитель и ваниль.",
            "Сформируйте сырники влажными руками.",
            "Готовьте на антипригарной сковороде или запеките при 180 градусах 18 минут."
        ],
        "cookingTime": 25,
        "storage": "Холодильник 2-3 дня.",
        "goalTags": [
            "weight_loss",
            "maintenance",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "balanced",
            "meal_prep"
        ],
        "isMealPrep": true,
        "isFreezerFriendly": true,
        "searchKeywords": [
            "сырники",
            "творог",
            "без сахара",
            "meal prep",
            "белковые"
        ]
    },
    {
        "id": "8ca13f9a-e1c6-4106-bd71-bf9214f9b8fe",
        "legacyId": 4,
        "slug": "greek-yogurt-berries",
        "sort": 40,
        "name": "Греческий йогурт с ягодами",
        "description": "Быстрый холодный завтрак или перекус с ягодами и семенами.",
        "category": "Завтрак",
        "mealType": "breakfast",
        "image_url": "assets/recipes/greek-yogurt-berries.webp",
        "total_weight": 293,
        "servings": 1,
        "nutrition": {
            "calories": 94,
            "protein": 8.5,
            "fat": 2.7,
            "carbs": 8.7
        },
        "ingredients": [
            {
                "name": "греческий йогурт 2%",
                "weight": 200,
                "amount": 200,
                "unit": "g",
                "category": "dairy"
            },
            {
                "name": "ягоды",
                "weight": 80,
                "amount": 80,
                "unit": "g",
                "category": "fruits"
            },
            {
                "name": "семена чиа",
                "weight": 8,
                "amount": 8,
                "unit": "g",
                "category": "nuts"
            },
            {
                "name": "мед",
                "weight": 5,
                "amount": 5,
                "unit": "g",
                "category": "other"
            }
        ],
        "steps": [
            "Выложите йогурт в миску.",
            "Добавьте ягоды, чиа и немного меда.",
            "Перемешайте или оставьте слоями."
        ],
        "cookingTime": 5,
        "storage": "Холодильник до 24 часов.",
        "goalTags": [
            "cutting",
            "weight_loss",
            "maintenance"
        ],
        "nutritionTags": [
            "high_protein",
            "low_calorie",
            "quick"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "йогурт",
            "ягоды",
            "быстро",
            "завтрак",
            "низкокалорийно"
        ]
    },
    {
        "id": "ade1efea-abcb-407a-b897-19d722ab72df",
        "legacyId": 5,
        "slug": "protein-oatmeal",
        "sort": 50,
        "name": "Протеиновая овсянка",
        "description": "Овсянка с молоком, бананом и протеином после тренировки.",
        "category": "Завтрак",
        "mealType": "breakfast",
        "image_url": "assets/recipes/protein-oatmeal.webp",
        "total_weight": 331,
        "servings": 1,
        "nutrition": {
            "calories": 139,
            "protein": 10.3,
            "fat": 3.1,
            "carbs": 18.4
        },
        "ingredients": [
            {
                "name": "овсяные хлопья",
                "weight": 55,
                "amount": 55,
                "unit": "g",
                "category": "grains"
            },
            {
                "name": "молоко 1.5%",
                "weight": 180,
                "amount": 180,
                "unit": "ml",
                "category": "dairy"
            },
            {
                "name": "сывороточный протеин",
                "weight": 25,
                "amount": 25,
                "unit": "g",
                "category": "dairy"
            },
            {
                "name": "банан",
                "weight": 70,
                "amount": 70,
                "unit": "g",
                "category": "fruits"
            },
            {
                "name": "корица",
                "weight": 1,
                "amount": 1,
                "unit": "g",
                "category": "spices"
            }
        ],
        "steps": [
            "Сварите овсянку на молоке 5-6 минут.",
            "Снимите с огня и вмешайте протеин.",
            "Добавьте банан и корицу."
        ],
        "cookingTime": 10,
        "storage": "Холодильник до 24 часов, разогревать с небольшим количеством молока.",
        "goalTags": [
            "maintenance",
            "bulking",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "balanced",
            "quick"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "овсянка",
            "протеин",
            "банан",
            "после тренировки",
            "набор"
        ]
    },
    {
        "id": "8a53b612-dd52-494d-92e5-ff16fd9640f4",
        "legacyId": 6,
        "slug": "eggs-avocado-toast",
        "sort": 60,
        "name": "Яйца с авокадо и цельнозерновым тостом",
        "description": "Сбалансированный завтрак с полезными жирами и тостом.",
        "category": "Завтрак",
        "mealType": "breakfast",
        "image_url": "assets/recipes/eggs-avocado-toast.webp",
        "total_weight": 226,
        "servings": 1,
        "nutrition": {
            "calories": 184,
            "protein": 8,
            "fat": 11.5,
            "carbs": 12.8
        },
        "ingredients": [
            {
                "name": "яйца",
                "weight": 110,
                "amount": 2,
                "unit": "pcs",
                "category": "eggs"
            },
            {
                "name": "авокадо",
                "weight": 70,
                "amount": 70,
                "unit": "g",
                "category": "fruits"
            },
            {
                "name": "цельнозерновой хлеб",
                "weight": 40,
                "amount": 40,
                "unit": "g",
                "category": "grains"
            },
            {
                "name": "лимонный сок",
                "weight": 5,
                "amount": 5,
                "unit": "ml",
                "category": "other"
            },
            {
                "name": "соль",
                "weight": 1,
                "amount": 1,
                "unit": "g",
                "category": "spices"
            }
        ],
        "steps": [
            "Отварите или пожарьте яйца без лишнего масла.",
            "Разомните авокадо с лимонным соком и солью.",
            "Подайте с цельнозерновым тостом."
        ],
        "cookingTime": 10,
        "storage": "Лучше есть сразу.",
        "goalTags": [
            "maintenance",
            "bulking",
            "muscle_gain"
        ],
        "nutritionTags": [
            "balanced",
            "quick"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "яйца",
            "авокадо",
            "тост",
            "завтрак",
            "баланс"
        ]
    },
    {
        "id": "b8e9b612-28b7-44ed-8760-81b3cf2d11b0",
        "legacyId": 7,
        "slug": "protein-pancakes",
        "sort": 70,
        "name": "Протеиновые панкейки",
        "description": "Мягкие панкейки из овсянки, банана и протеина.",
        "category": "Завтрак",
        "mealType": "breakfast",
        "image_url": "assets/recipes/protein-pancakes.webp",
        "total_weight": 325,
        "servings": 2,
        "nutrition": {
            "calories": 171,
            "protein": 13,
            "fat": 4.6,
            "carbs": 18.4
        },
        "ingredients": [
            {
                "name": "овсяные хлопья",
                "weight": 60,
                "amount": 60,
                "unit": "g",
                "category": "grains"
            },
            {
                "name": "сывороточный протеин",
                "weight": 30,
                "amount": 30,
                "unit": "g",
                "category": "dairy"
            },
            {
                "name": "банан",
                "weight": 100,
                "amount": 100,
                "unit": "g",
                "category": "fruits"
            },
            {
                "name": "яйцо",
                "weight": 55,
                "amount": 1,
                "unit": "pcs",
                "category": "eggs"
            },
            {
                "name": "молоко 1.5%",
                "weight": 80,
                "amount": 80,
                "unit": "ml",
                "category": "dairy"
            }
        ],
        "steps": [
            "Пробейте ингредиенты блендером.",
            "Выпекайте небольшие панкейки на антипригарной сковороде.",
            "Подавайте с ягодами или йогуртом."
        ],
        "cookingTime": 20,
        "storage": "Холодильник 2 дня, морозилка до 30 дней.",
        "goalTags": [
            "maintenance",
            "bulking",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "balanced",
            "meal_prep"
        ],
        "isMealPrep": true,
        "isFreezerFriendly": true,
        "searchKeywords": [
            "панкейки",
            "протеин",
            "овсянка",
            "завтрак",
            "meal prep"
        ]
    },
    {
        "id": "8043f591-d59f-4e99-8b2f-37bc45a96e06",
        "legacyId": 8,
        "slug": "cottage-cheese-casserole",
        "sort": 80,
        "name": "Творожная запеканка high protein",
        "description": "Запеканка из творога и йогурта для завтраков на несколько дней.",
        "category": "Завтрак",
        "mealType": "breakfast",
        "image_url": "assets/recipes/cottage-cheese-casserole.webp",
        "total_weight": 845,
        "servings": 4,
        "nutrition": {
            "calories": 127,
            "protein": 15.2,
            "fat": 3.8,
            "carbs": 7.5
        },
        "ingredients": [
            {
                "name": "творог 2%",
                "weight": 500,
                "amount": 500,
                "unit": "g",
                "category": "dairy"
            },
            {
                "name": "греческий йогурт 2%",
                "weight": 120,
                "amount": 120,
                "unit": "g",
                "category": "dairy"
            },
            {
                "name": "яйца",
                "weight": 110,
                "amount": 2,
                "unit": "pcs",
                "category": "eggs"
            },
            {
                "name": "манная крупа",
                "weight": 35,
                "amount": 35,
                "unit": "g",
                "category": "grains"
            },
            {
                "name": "ягоды",
                "weight": 80,
                "amount": 80,
                "unit": "g",
                "category": "fruits"
            }
        ],
        "steps": [
            "Смешайте творог, йогурт, яйца и манку.",
            "Добавьте ягоды.",
            "Запекайте 30-35 минут при 180 градусах."
        ],
        "cookingTime": 40,
        "storage": "Холодильник 3 дня, морозилка до 30 дней.",
        "goalTags": [
            "weight_loss",
            "maintenance",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "balanced",
            "meal_prep"
        ],
        "isMealPrep": true,
        "isFreezerFriendly": true,
        "searchKeywords": [
            "запеканка",
            "творог",
            "high protein",
            "завтрак",
            "заготовка"
        ]
    },
    {
        "id": "728ce30f-f163-49c3-8633-5a3d331632b7",
        "legacyId": 9,
        "slug": "chicken-steak-broccoli",
        "sort": 90,
        "name": "Куриный стейк с брокколи",
        "description": "Постное филе с брокколи и легкой заправкой.",
        "category": "Обед",
        "mealType": "lunch",
        "image_url": "assets/recipes/chicken-steak-broccoli.webp",
        "total_weight": 399,
        "servings": 1,
        "nutrition": {
            "calories": 119,
            "protein": 18.7,
            "fat": 3.7,
            "carbs": 3.4
        },
        "ingredients": [
            {
                "name": "куриное филе",
                "weight": 180,
                "amount": 180,
                "unit": "g",
                "category": "meat"
            },
            {
                "name": "брокколи",
                "weight": 200,
                "amount": 200,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "оливковое масло",
                "weight": 7,
                "amount": 7,
                "unit": "g",
                "category": "oils"
            },
            {
                "name": "лимонный сок",
                "weight": 10,
                "amount": 10,
                "unit": "ml",
                "category": "other"
            },
            {
                "name": "паприка",
                "weight": 2,
                "amount": 2,
                "unit": "g",
                "category": "spices"
            }
        ],
        "steps": [
            "Замаринуйте филе с паприкой и лимоном.",
            "Обжарьте или запеките до готовности.",
            "Брокколи приготовьте на пару и добавьте масло."
        ],
        "cookingTime": 25,
        "storage": "Холодильник 3 дня.",
        "goalTags": [
            "cutting",
            "weight_loss",
            "maintenance",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "low_calorie",
            "low_carb",
            "meal_prep"
        ],
        "isMealPrep": true,
        "isFreezerFriendly": true,
        "searchKeywords": [
            "курица",
            "брокколи",
            "обед",
            "сушка",
            "low calorie"
        ]
    },
    {
        "id": "663be7eb-e144-4433-88a6-0209a13df073",
        "legacyId": 10,
        "slug": "buckwheat-chicken",
        "sort": 100,
        "name": "Гречка с куриным филе",
        "description": "Классический сбалансированный обед с крупой и белком.",
        "category": "Обед",
        "mealType": "lunch",
        "image_url": "assets/recipes/buckwheat-chicken.webp",
        "total_weight": 528,
        "servings": 2,
        "nutrition": {
            "calories": 139,
            "protein": 13.8,
            "fat": 3,
            "carbs": 14.8
        },
        "ingredients": [
            {
                "name": "гречка вареная",
                "weight": 200,
                "amount": 200,
                "unit": "g",
                "category": "grains"
            },
            {
                "name": "куриное филе",
                "weight": 220,
                "amount": 220,
                "unit": "g",
                "category": "meat"
            },
            {
                "name": "морковь",
                "weight": 60,
                "amount": 60,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "лук",
                "weight": 40,
                "amount": 40,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "оливковое масло",
                "weight": 8,
                "amount": 8,
                "unit": "g",
                "category": "oils"
            }
        ],
        "steps": [
            "Отварите гречку.",
            "Куриное филе нарежьте и потушите с луком и морковью.",
            "Смешайте с гречкой и прогрейте."
        ],
        "cookingTime": 30,
        "storage": "Холодильник 3 дня, морозилка до 30 дней.",
        "goalTags": [
            "maintenance",
            "bulking",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "balanced",
            "meal_prep"
        ],
        "isMealPrep": true,
        "isFreezerFriendly": true,
        "searchKeywords": [
            "гречка",
            "курица",
            "обед",
            "meal prep",
            "масса"
        ]
    },
    {
        "id": "c6f56c3b-7cd2-4c9d-83ac-b8f25d52682a",
        "legacyId": 11,
        "slug": "turkey-bulgur",
        "sort": 110,
        "name": "Индейка с булгуром",
        "description": "Постная индейка с булгуром и овощами.",
        "category": "Обед",
        "mealType": "lunch",
        "image_url": "assets/recipes/turkey-bulgur.webp",
        "total_weight": 628,
        "servings": 2,
        "nutrition": {
            "calories": 130,
            "protein": 13.2,
            "fat": 2.8,
            "carbs": 14.1
        },
        "ingredients": [
            {
                "name": "филе индейки",
                "weight": 220,
                "amount": 220,
                "unit": "g",
                "category": "meat"
            },
            {
                "name": "булгур вареный",
                "weight": 220,
                "amount": 220,
                "unit": "g",
                "category": "grains"
            },
            {
                "name": "кабачок",
                "weight": 100,
                "amount": 100,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "томат",
                "weight": 80,
                "amount": 80,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "оливковое масло",
                "weight": 8,
                "amount": 8,
                "unit": "g",
                "category": "oils"
            }
        ],
        "steps": [
            "Отварите булгур.",
            "Индейку нарежьте и обжарьте с овощами.",
            "Соедините с булгуром и прогрейте 2 минуты."
        ],
        "cookingTime": 30,
        "storage": "Холодильник 3 дня.",
        "goalTags": [
            "maintenance",
            "bulking",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "balanced",
            "meal_prep"
        ],
        "isMealPrep": true,
        "isFreezerFriendly": true,
        "searchKeywords": [
            "индейка",
            "булгур",
            "обед",
            "белок",
            "заготовка"
        ]
    },
    {
        "id": "fd6b056a-04b6-462f-a943-7ea25f88ec5e",
        "legacyId": 12,
        "slug": "salmon-vegetables",
        "sort": 120,
        "name": "Лосось с овощами",
        "description": "Запеченный лосось с овощным гарниром.",
        "category": "Обед",
        "mealType": "lunch",
        "image_url": "assets/recipes/salmon-vegetables.webp",
        "total_weight": 385,
        "servings": 1,
        "nutrition": {
            "calories": 151,
            "protein": 12.1,
            "fat": 9.2,
            "carbs": 4.3
        },
        "ingredients": [
            {
                "name": "лосось",
                "weight": 160,
                "amount": 160,
                "unit": "g",
                "category": "fish"
            },
            {
                "name": "брокколи",
                "weight": 120,
                "amount": 120,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "болгарский перец",
                "weight": 80,
                "amount": 80,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "оливковое масло",
                "weight": 5,
                "amount": 5,
                "unit": "g",
                "category": "oils"
            },
            {
                "name": "лимон",
                "weight": 20,
                "amount": 20,
                "unit": "g",
                "category": "fruits"
            }
        ],
        "steps": [
            "Выложите лосось и овощи в форму.",
            "Добавьте масло, лимон и специи.",
            "Запекайте 18-20 минут при 190 градусах."
        ],
        "cookingTime": 25,
        "storage": "Холодильник 2 дня.",
        "goalTags": [
            "maintenance",
            "bulking",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "balanced",
            "low_carb"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "лосось",
            "овощи",
            "обед",
            "рыба",
            "омега"
        ]
    },
    {
        "id": "d15c9b98-a181-4873-8148-6897b62a6c8b",
        "legacyId": 13,
        "slug": "tuna-quinoa-bowl",
        "sort": 130,
        "name": "Тунец с киноа",
        "description": "Боул с тунцом, киноа, овощами и йогуртовой заправкой.",
        "category": "Обед",
        "mealType": "lunch",
        "image_url": "assets/recipes/tuna-quinoa-bowl.webp",
        "total_weight": 460,
        "servings": 1,
        "nutrition": {
            "calories": 124,
            "protein": 12.6,
            "fat": 3,
            "carbs": 11.2
        },
        "ingredients": [
            {
                "name": "тунец в собственном соку",
                "weight": 120,
                "amount": 120,
                "unit": "g",
                "category": "fish"
            },
            {
                "name": "киноа вареная",
                "weight": 140,
                "amount": 140,
                "unit": "g",
                "category": "grains"
            },
            {
                "name": "огурец",
                "weight": 80,
                "amount": 80,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "томат",
                "weight": 80,
                "amount": 80,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "греческий йогурт 2%",
                "weight": 40,
                "amount": 40,
                "unit": "g",
                "category": "dairy"
            }
        ],
        "steps": [
            "Смешайте киноа с овощами.",
            "Добавьте тунец.",
            "Заправьте греческим йогуртом со специями."
        ],
        "cookingTime": 15,
        "storage": "Холодильник до 24 часов.",
        "goalTags": [
            "weight_loss",
            "maintenance",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "balanced",
            "quick"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "тунец",
            "киноа",
            "боул",
            "обед",
            "быстро"
        ]
    },
    {
        "id": "9fc72d9e-d711-4e85-980c-dad9fb262303",
        "legacyId": 14,
        "slug": "light-chicken-rice-teriyaki",
        "sort": 140,
        "name": "Рис с курицей терияки light",
        "description": "Облегченная версия риса с курицей и соусом терияки.",
        "category": "Обед",
        "mealType": "lunch",
        "image_url": "assets/recipes/light-chicken-rice-teriyaki.webp",
        "total_weight": 608,
        "servings": 2,
        "nutrition": {
            "calories": 139,
            "protein": 12.9,
            "fat": 2.2,
            "carbs": 16.3
        },
        "ingredients": [
            {
                "name": "куриное филе",
                "weight": 220,
                "amount": 220,
                "unit": "g",
                "category": "meat"
            },
            {
                "name": "рис вареный",
                "weight": 240,
                "amount": 240,
                "unit": "g",
                "category": "grains"
            },
            {
                "name": "соевый соус light",
                "weight": 20,
                "amount": 20,
                "unit": "ml",
                "category": "other"
            },
            {
                "name": "мед",
                "weight": 8,
                "amount": 8,
                "unit": "g",
                "category": "other"
            },
            {
                "name": "стручковая фасоль",
                "weight": 120,
                "amount": 120,
                "unit": "g",
                "category": "vegetables"
            }
        ],
        "steps": [
            "Нарежьте курицу и обжарьте на антипригарной сковороде.",
            "Добавьте соевый соус, мед и фасоль.",
            "Подавайте с рисом."
        ],
        "cookingTime": 25,
        "storage": "Холодильник 3 дня.",
        "goalTags": [
            "maintenance",
            "bulking",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "balanced",
            "meal_prep"
        ],
        "isMealPrep": true,
        "isFreezerFriendly": true,
        "searchKeywords": [
            "рис",
            "курица",
            "терияки",
            "обед",
            "light"
        ]
    },
    {
        "id": "e96a88fb-0f53-4cbe-8a1c-cc2ac3d7607f",
        "legacyId": 15,
        "slug": "shrimp-bowl",
        "sort": 150,
        "name": "Bowl с креветками",
        "description": "Легкий боул с креветками, рисом, овощами и авокадо.",
        "category": "Обед",
        "mealType": "lunch",
        "image_url": "assets/recipes/shrimp-bowl.webp",
        "total_weight": 415,
        "servings": 1,
        "nutrition": {
            "calories": 119,
            "protein": 10.2,
            "fat": 3.8,
            "carbs": 10.5
        },
        "ingredients": [
            {
                "name": "креветки",
                "weight": 150,
                "amount": 150,
                "unit": "g",
                "category": "fish"
            },
            {
                "name": "рис вареный",
                "weight": 120,
                "amount": 120,
                "unit": "g",
                "category": "grains"
            },
            {
                "name": "огурец",
                "weight": 80,
                "amount": 80,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "авокадо",
                "weight": 50,
                "amount": 50,
                "unit": "g",
                "category": "fruits"
            },
            {
                "name": "соевый соус light",
                "weight": 15,
                "amount": 15,
                "unit": "ml",
                "category": "other"
            }
        ],
        "steps": [
            "Креветки быстро обжарьте или отварите.",
            "Соберите рис, овощи и авокадо в миску.",
            "Добавьте креветки и соевый соус."
        ],
        "cookingTime": 20,
        "storage": "Холодильник до 24 часов.",
        "goalTags": [
            "weight_loss",
            "maintenance",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "balanced",
            "quick"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "креветки",
            "bowl",
            "боул",
            "рис",
            "обед"
        ]
    },
    {
        "id": "c15d77bd-3ece-4741-8bfc-803400424032",
        "legacyId": 16,
        "slug": "turkey-meatballs",
        "sort": 160,
        "name": "Фрикадельки из индейки",
        "description": "Запеченные фрикадельки из индейки с томатным соусом.",
        "category": "Обед",
        "mealType": "lunch",
        "image_url": "assets/recipes/turkey-meatballs.webp",
        "total_weight": 740,
        "servings": 3,
        "nutrition": {
            "calories": 128,
            "protein": 16.9,
            "fat": 4.1,
            "carbs": 5.2
        },
        "ingredients": [
            {
                "name": "фарш индейки",
                "weight": 450,
                "amount": 450,
                "unit": "g",
                "category": "meat"
            },
            {
                "name": "яйцо",
                "weight": 55,
                "amount": 1,
                "unit": "pcs",
                "category": "eggs"
            },
            {
                "name": "овсяные хлопья",
                "weight": 30,
                "amount": 30,
                "unit": "g",
                "category": "grains"
            },
            {
                "name": "томатная пассата",
                "weight": 200,
                "amount": 200,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "чеснок",
                "weight": 5,
                "amount": 5,
                "unit": "g",
                "category": "spices"
            }
        ],
        "steps": [
            "Смешайте фарш, яйцо, овсянку и специи.",
            "Сформируйте фрикадельки.",
            "Запекайте с томатной пассатой 25 минут при 190 градусах."
        ],
        "cookingTime": 35,
        "storage": "Холодильник 3 дня, морозилка до 30 дней.",
        "goalTags": [
            "cutting",
            "weight_loss",
            "maintenance",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "low_fat",
            "meal_prep"
        ],
        "isMealPrep": true,
        "isFreezerFriendly": true,
        "searchKeywords": [
            "фрикадельки",
            "индейка",
            "meal prep",
            "обед",
            "фарш"
        ]
    },
    {
        "id": "48a43f78-6af4-4e2b-bde6-065125edf010",
        "legacyId": 17,
        "slug": "tuna-egg-salad",
        "sort": 170,
        "name": "Салат с тунцом и яйцом",
        "description": "Белковый салат без тяжелой заправки.",
        "category": "Ужин",
        "mealType": "dinner",
        "image_url": "assets/recipes/tuna-egg-salad.webp",
        "total_weight": 390,
        "servings": 1,
        "nutrition": {
            "calories": 105,
            "protein": 13.6,
            "fat": 4.5,
            "carbs": 2.2
        },
        "ingredients": [
            {
                "name": "тунец в собственном соку",
                "weight": 120,
                "amount": 120,
                "unit": "g",
                "category": "fish"
            },
            {
                "name": "яйцо",
                "weight": 55,
                "amount": 1,
                "unit": "pcs",
                "category": "eggs"
            },
            {
                "name": "листья салата",
                "weight": 80,
                "amount": 80,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "огурец",
                "weight": 100,
                "amount": 100,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "греческий йогурт 2%",
                "weight": 35,
                "amount": 35,
                "unit": "g",
                "category": "dairy"
            }
        ],
        "steps": [
            "Отварите яйцо.",
            "Смешайте салат, огурец и тунец.",
            "Добавьте яйцо и йогуртовую заправку."
        ],
        "cookingTime": 10,
        "storage": "Холодильник до 24 часов.",
        "goalTags": [
            "cutting",
            "weight_loss",
            "maintenance"
        ],
        "nutritionTags": [
            "high_protein",
            "low_calorie",
            "low_carb",
            "quick"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "салат",
            "тунец",
            "яйцо",
            "ужин",
            "low calorie"
        ]
    },
    {
        "id": "e5ff523f-68b2-44aa-93ac-72bdb664b437",
        "legacyId": 18,
        "slug": "salmon-broccoli",
        "sort": 180,
        "name": "Лосось с брокколи",
        "description": "Насыщающий ужин с рыбой и брокколи.",
        "category": "Ужин",
        "mealType": "dinner",
        "image_url": "assets/recipes/salmon-broccoli.webp",
        "total_weight": 346,
        "servings": 1,
        "nutrition": {
            "calories": 157,
            "protein": 13.4,
            "fat": 9.5,
            "carbs": 3.3
        },
        "ingredients": [
            {
                "name": "лосось",
                "weight": 150,
                "amount": 150,
                "unit": "g",
                "category": "fish"
            },
            {
                "name": "брокколи",
                "weight": 180,
                "amount": 180,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "оливковое масло",
                "weight": 5,
                "amount": 5,
                "unit": "g",
                "category": "oils"
            },
            {
                "name": "лимонный сок",
                "weight": 10,
                "amount": 10,
                "unit": "ml",
                "category": "other"
            },
            {
                "name": "перец",
                "weight": 1,
                "amount": 1,
                "unit": "g",
                "category": "spices"
            }
        ],
        "steps": [
            "Запеките лосось с лимоном и перцем.",
            "Брокколи приготовьте на пару.",
            "Подайте вместе, добавив немного масла."
        ],
        "cookingTime": 22,
        "storage": "Холодильник 2 дня.",
        "goalTags": [
            "maintenance",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "low_carb",
            "balanced"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "лосось",
            "брокколи",
            "ужин",
            "рыба",
            "low carb"
        ]
    },
    {
        "id": "faf3a139-3caf-4a76-8392-edbf4f4d3989",
        "legacyId": 19,
        "slug": "vegetable-omelet",
        "sort": 190,
        "name": "Омлет с овощами",
        "description": "Быстрый легкий ужин из яиц и овощей.",
        "category": "Ужин",
        "mealType": "dinner",
        "image_url": "assets/recipes/vegetable-omelet.webp",
        "total_weight": 330,
        "servings": 1,
        "nutrition": {
            "calories": 93,
            "protein": 7.6,
            "fat": 5.7,
            "carbs": 3
        },
        "ingredients": [
            {
                "name": "яйца",
                "weight": 110,
                "amount": 2,
                "unit": "pcs",
                "category": "eggs"
            },
            {
                "name": "болгарский перец",
                "weight": 70,
                "amount": 70,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "томат",
                "weight": 80,
                "amount": 80,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "шпинат",
                "weight": 40,
                "amount": 40,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "молоко 1.5%",
                "weight": 30,
                "amount": 30,
                "unit": "ml",
                "category": "dairy"
            }
        ],
        "steps": [
            "Нарежьте овощи и прогрейте на сковороде.",
            "Влейте яйца с молоком.",
            "Готовьте под крышкой до готовности."
        ],
        "cookingTime": 12,
        "storage": "Лучше есть сразу, холодильник до 24 часов.",
        "goalTags": [
            "cutting",
            "weight_loss",
            "maintenance"
        ],
        "nutritionTags": [
            "low_calorie",
            "low_carb",
            "quick"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "омлет",
            "овощи",
            "ужин",
            "быстро",
            "низкокалорийно"
        ]
    },
    {
        "id": "731b781a-ecae-40e7-9090-a7e2eb46bbff",
        "legacyId": 20,
        "slug": "turkey-salad",
        "sort": 200,
        "name": "Индейка с салатом",
        "description": "Постная индейка с большим овощным салатом.",
        "category": "Ужин",
        "mealType": "dinner",
        "image_url": "assets/recipes/turkey-salad.webp",
        "total_weight": 455,
        "servings": 1,
        "nutrition": {
            "calories": 103,
            "protein": 15.5,
            "fat": 3,
            "carbs": 3.2
        },
        "ingredients": [
            {
                "name": "филе индейки",
                "weight": 170,
                "amount": 170,
                "unit": "g",
                "category": "meat"
            },
            {
                "name": "листья салата",
                "weight": 80,
                "amount": 80,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "огурец",
                "weight": 100,
                "amount": 100,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "томат",
                "weight": 100,
                "amount": 100,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "оливковое масло",
                "weight": 5,
                "amount": 5,
                "unit": "g",
                "category": "oils"
            }
        ],
        "steps": [
            "Индейку запеките или обжарьте без лишнего масла.",
            "Нарежьте овощи.",
            "Соберите салат и добавьте индейку сверху."
        ],
        "cookingTime": 20,
        "storage": "Индейка хранится 3 дня, салат лучше собирать перед едой.",
        "goalTags": [
            "cutting",
            "weight_loss",
            "maintenance",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "low_calorie",
            "low_carb"
        ],
        "isMealPrep": true,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "индейка",
            "салат",
            "ужин",
            "сушка",
            "белок"
        ]
    },
    {
        "id": "f239a268-ff42-4794-b417-cc1d2ba25d3c",
        "legacyId": 21,
        "slug": "shrimp-vegetables",
        "sort": 210,
        "name": "Креветки с овощами",
        "description": "Быстрый ужин с креветками и овощной смесью.",
        "category": "Ужин",
        "mealType": "dinner",
        "image_url": "assets/recipes/shrimp-vegetables.webp",
        "total_weight": 455,
        "servings": 1,
        "nutrition": {
            "calories": 82,
            "protein": 11.8,
            "fat": 2.2,
            "carbs": 3.8
        },
        "ingredients": [
            {
                "name": "креветки",
                "weight": 170,
                "amount": 170,
                "unit": "g",
                "category": "fish"
            },
            {
                "name": "брокколи",
                "weight": 100,
                "amount": 100,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "кабачок",
                "weight": 100,
                "amount": 100,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "болгарский перец",
                "weight": 80,
                "amount": 80,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "оливковое масло",
                "weight": 5,
                "amount": 5,
                "unit": "g",
                "category": "oils"
            }
        ],
        "steps": [
            "Овощи быстро обжарьте или потушите.",
            "Добавьте креветки на 3-4 минуты.",
            "Приправьте солью, перцем и лимоном."
        ],
        "cookingTime": 15,
        "storage": "Холодильник до 24 часов.",
        "goalTags": [
            "cutting",
            "weight_loss",
            "maintenance"
        ],
        "nutritionTags": [
            "high_protein",
            "low_calorie",
            "low_carb",
            "quick"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "креветки",
            "овощи",
            "ужин",
            "low carb",
            "быстро"
        ]
    },
    {
        "id": "de1dd357-06f4-4b01-a627-d8bb40c314ea",
        "legacyId": 22,
        "slug": "baked-fish-vegetables",
        "sort": 220,
        "name": "Запеченная рыба",
        "description": "Белая рыба с овощами и лимоном.",
        "category": "Ужин",
        "mealType": "dinner",
        "image_url": "assets/recipes/baked-fish-vegetables.webp",
        "total_weight": 576,
        "servings": 2,
        "nutrition": {
            "calories": 86,
            "protein": 13.8,
            "fat": 2.1,
            "carbs": 3.2
        },
        "ingredients": [
            {
                "name": "филе белой рыбы",
                "weight": 300,
                "amount": 300,
                "unit": "g",
                "category": "fish"
            },
            {
                "name": "кабачок",
                "weight": 150,
                "amount": 150,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "томат",
                "weight": 100,
                "amount": 100,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "оливковое масло",
                "weight": 6,
                "amount": 6,
                "unit": "g",
                "category": "oils"
            },
            {
                "name": "лимон",
                "weight": 20,
                "amount": 20,
                "unit": "g",
                "category": "fruits"
            }
        ],
        "steps": [
            "Выложите рыбу и овощи в форму.",
            "Добавьте масло, лимон и специи.",
            "Запекайте 20 минут при 190 градусах."
        ],
        "cookingTime": 25,
        "storage": "Холодильник 2 дня.",
        "goalTags": [
            "cutting",
            "weight_loss",
            "maintenance",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "low_calorie",
            "low_fat",
            "meal_prep"
        ],
        "isMealPrep": true,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "рыба",
            "запеченная",
            "ужин",
            "low fat",
            "сушка"
        ]
    },
    {
        "id": "c6db8833-6662-49bf-aaff-93f18572ad17",
        "legacyId": 23,
        "slug": "protein-chicken-salad",
        "sort": 230,
        "name": "Белковый салат",
        "description": "Салат с курицей, яйцом и йогуртовой заправкой.",
        "category": "Ужин",
        "mealType": "dinner",
        "image_url": "assets/recipes/protein-chicken-salad.webp",
        "total_weight": 365,
        "servings": 1,
        "nutrition": {
            "calories": 112,
            "protein": 14.3,
            "fat": 4.1,
            "carbs": 3.7
        },
        "ingredients": [
            {
                "name": "куриное филе готовое",
                "weight": 120,
                "amount": 120,
                "unit": "g",
                "category": "meat"
            },
            {
                "name": "яйцо",
                "weight": 55,
                "amount": 1,
                "unit": "pcs",
                "category": "eggs"
            },
            {
                "name": "листья салата",
                "weight": 70,
                "amount": 70,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "огурец",
                "weight": 80,
                "amount": 80,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "греческий йогурт 2%",
                "weight": 40,
                "amount": 40,
                "unit": "g",
                "category": "dairy"
            }
        ],
        "steps": [
            "Нарежьте готовую курицу и яйцо.",
            "Смешайте с салатом и огурцом.",
            "Заправьте йогуртом со специями."
        ],
        "cookingTime": 15,
        "storage": "Холодильник до 24 часов.",
        "goalTags": [
            "cutting",
            "weight_loss",
            "maintenance",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "low_calorie",
            "quick"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "белковый салат",
            "курица",
            "яйцо",
            "ужин",
            "high protein"
        ]
    },
    {
        "id": "64247ac4-2868-4189-b91c-653793383926",
        "legacyId": 24,
        "slug": "healthy-chicken-wrap",
        "sort": 240,
        "name": "ПП-шаурма",
        "description": "Домашняя шаурма с курицей, овощами и йогуртовым соусом.",
        "category": "Ужин",
        "mealType": "dinner",
        "image_url": "assets/recipes/healthy-chicken-wrap.webp",
        "total_weight": 370,
        "servings": 1,
        "nutrition": {
            "calories": 146,
            "protein": 12.2,
            "fat": 4.3,
            "carbs": 14.2
        },
        "ingredients": [
            {
                "name": "цельнозерновая тортилья",
                "weight": 60,
                "amount": 60,
                "unit": "g",
                "category": "grains"
            },
            {
                "name": "куриное филе готовое",
                "weight": 120,
                "amount": 120,
                "unit": "g",
                "category": "meat"
            },
            {
                "name": "капуста",
                "weight": 80,
                "amount": 80,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "огурец",
                "weight": 60,
                "amount": 60,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "греческий йогурт 2%",
                "weight": 50,
                "amount": 50,
                "unit": "g",
                "category": "dairy"
            }
        ],
        "steps": [
            "Смешайте йогурт со специями.",
            "Выложите курицу, овощи и соус на тортилью.",
            "Сверните и прогрейте на сухой сковороде."
        ],
        "cookingTime": 20,
        "storage": "Лучше есть сразу; начинку можно хранить 2 дня.",
        "goalTags": [
            "maintenance",
            "bulking",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "balanced",
            "quick"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "пп шаурма",
            "шаурма",
            "тортилья",
            "курица",
            "ужин"
        ]
    },
    {
        "id": "b8e49c5d-dff7-43f9-8434-3e2b3e633b4b",
        "legacyId": 25,
        "slug": "protein-shake-banana",
        "sort": 250,
        "name": "Протеиновый коктейль",
        "description": "Быстрый коктейль на молоке с протеином и бананом.",
        "category": "Перекус",
        "mealType": "snack",
        "image_url": "assets/recipes/protein-shake-banana.webp",
        "total_weight": 390,
        "servings": 1,
        "nutrition": {
            "calories": 93,
            "protein": 9,
            "fat": 1.6,
            "carbs": 10.4
        },
        "ingredients": [
            {
                "name": "молоко 1.5%",
                "weight": 250,
                "amount": 250,
                "unit": "ml",
                "category": "dairy"
            },
            {
                "name": "сывороточный протеин",
                "weight": 30,
                "amount": 30,
                "unit": "g",
                "category": "dairy"
            },
            {
                "name": "банан",
                "weight": 60,
                "amount": 60,
                "unit": "g",
                "category": "fruits"
            },
            {
                "name": "лед",
                "weight": 50,
                "amount": 50,
                "unit": "g",
                "category": "other"
            }
        ],
        "steps": [
            "Сложите ингредиенты в блендер.",
            "Взбейте до однородности.",
            "Выпейте сразу после приготовления."
        ],
        "cookingTime": 3,
        "storage": "Лучше пить сразу.",
        "goalTags": [
            "maintenance",
            "bulking",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "quick"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "протеиновый коктейль",
            "протеин",
            "перекус",
            "банан",
            "shake"
        ]
    },
    {
        "id": "d3533170-6edc-4a18-b106-cf87f6db2429",
        "legacyId": 26,
        "slug": "cottage-cheese-berries",
        "sort": 260,
        "name": "Творог с ягодами",
        "description": "Простой белковый перекус с ягодами.",
        "category": "Перекус",
        "mealType": "snack",
        "image_url": "assets/recipes/cottage-cheese-berries.webp",
        "total_weight": 251,
        "servings": 1,
        "nutrition": {
            "calories": 100,
            "protein": 13.3,
            "fat": 2.6,
            "carbs": 5.8
        },
        "ingredients": [
            {
                "name": "творог 2%",
                "weight": 180,
                "amount": 180,
                "unit": "g",
                "category": "dairy"
            },
            {
                "name": "ягоды",
                "weight": 70,
                "amount": 70,
                "unit": "g",
                "category": "fruits"
            },
            {
                "name": "корица",
                "weight": 1,
                "amount": 1,
                "unit": "g",
                "category": "spices"
            }
        ],
        "steps": [
            "Выложите творог в миску.",
            "Добавьте ягоды и корицу.",
            "Перемешайте по желанию."
        ],
        "cookingTime": 3,
        "storage": "Холодильник до 24 часов.",
        "goalTags": [
            "cutting",
            "weight_loss",
            "maintenance",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "low_calorie",
            "quick"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "творог",
            "ягоды",
            "перекус",
            "белок",
            "быстро"
        ]
    },
    {
        "id": "b553ea37-524d-402f-b4f4-c99f4573f862",
        "legacyId": 27,
        "slug": "protein-pudding-cocoa",
        "sort": 270,
        "name": "Протеиновый пудинг",
        "description": "Густой йогуртовый пудинг с протеином и какао.",
        "category": "Перекус",
        "mealType": "snack",
        "image_url": "assets/recipes/protein-pudding-cocoa.webp",
        "total_weight": 251,
        "servings": 1,
        "nutrition": {
            "calories": 111,
            "protein": 14.4,
            "fat": 2.4,
            "carbs": 7
        },
        "ingredients": [
            {
                "name": "греческий йогурт 2%",
                "weight": 180,
                "amount": 180,
                "unit": "g",
                "category": "dairy"
            },
            {
                "name": "сывороточный протеин",
                "weight": 25,
                "amount": 25,
                "unit": "g",
                "category": "dairy"
            },
            {
                "name": "какао",
                "weight": 6,
                "amount": 6,
                "unit": "g",
                "category": "other"
            },
            {
                "name": "ягоды",
                "weight": 40,
                "amount": 40,
                "unit": "g",
                "category": "fruits"
            }
        ],
        "steps": [
            "Смешайте йогурт, протеин и какао.",
            "Оставьте на 5 минут для густоты.",
            "Добавьте ягоды сверху."
        ],
        "cookingTime": 5,
        "storage": "Холодильник до 24 часов.",
        "goalTags": [
            "weight_loss",
            "maintenance",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "low_calorie",
            "quick"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "пудинг",
            "протеин",
            "какао",
            "перекус",
            "десерт"
        ]
    },
    {
        "id": "5e5c7f08-d8aa-45e2-acdf-2247677bada1",
        "legacyId": 28,
        "slug": "boiled-eggs",
        "sort": 280,
        "name": "Вареные яйца",
        "description": "Минимальный перекус с понятным белком и жирами.",
        "category": "Перекус",
        "mealType": "snack",
        "image_url": "assets/recipes/boiled-eggs.webp",
        "total_weight": 111,
        "servings": 1,
        "nutrition": {
            "calories": 143,
            "protein": 12.6,
            "fat": 9.5,
            "carbs": 0.8
        },
        "ingredients": [
            {
                "name": "яйца",
                "weight": 110,
                "amount": 2,
                "unit": "pcs",
                "category": "eggs"
            },
            {
                "name": "соль",
                "weight": 1,
                "amount": 1,
                "unit": "g",
                "category": "spices"
            }
        ],
        "steps": [
            "Положите яйца в холодную воду.",
            "Варите 8-10 минут после закипания.",
            "Остудите и очистите."
        ],
        "cookingTime": 10,
        "storage": "В скорлупе в холодильнике до 3 дней.",
        "goalTags": [
            "cutting",
            "weight_loss",
            "maintenance",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "low_carb",
            "meal_prep"
        ],
        "isMealPrep": true,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "яйца",
            "вареные яйца",
            "перекус",
            "low carb",
            "meal prep"
        ]
    },
    {
        "id": "ba7e48a7-f9e1-4d5e-91ab-a44db4c5b049",
        "legacyId": 29,
        "slug": "yogurt-cocoa",
        "sort": 290,
        "name": "Йогурт с какао",
        "description": "Легкий шоколадный перекус без сахара.",
        "category": "Перекус",
        "mealType": "snack",
        "image_url": "assets/recipes/yogurt-cocoa.webp",
        "total_weight": 208,
        "servings": 1,
        "nutrition": {
            "calories": 83,
            "protein": 8.1,
            "fat": 2.4,
            "carbs": 6.8
        },
        "ingredients": [
            {
                "name": "греческий йогурт 2%",
                "weight": 200,
                "amount": 200,
                "unit": "g",
                "category": "dairy"
            },
            {
                "name": "какао",
                "weight": 6,
                "amount": 6,
                "unit": "g",
                "category": "other"
            },
            {
                "name": "подсластитель",
                "weight": 1,
                "amount": 1,
                "unit": "g",
                "category": "other"
            },
            {
                "name": "корица",
                "weight": 1,
                "amount": 1,
                "unit": "g",
                "category": "spices"
            }
        ],
        "steps": [
            "Смешайте йогурт с какао и подсластителем.",
            "Добавьте корицу.",
            "Подавайте охлажденным."
        ],
        "cookingTime": 3,
        "storage": "Холодильник до 24 часов.",
        "goalTags": [
            "cutting",
            "weight_loss",
            "maintenance"
        ],
        "nutritionTags": [
            "high_protein",
            "low_calorie",
            "quick"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "йогурт",
            "какао",
            "перекус",
            "шоколадный",
            "низкокалорийно"
        ]
    },
    {
        "id": "c64dc8fc-5990-44ed-a901-adb00eb8b505",
        "legacyId": 30,
        "slug": "edamame-snack",
        "sort": 300,
        "name": "Эдамаме",
        "description": "Растительный белковый перекус с клетчаткой.",
        "category": "Перекус",
        "mealType": "snack",
        "image_url": "assets/recipes/edamame-snack.webp",
        "total_weight": 156,
        "servings": 1,
        "nutrition": {
            "calories": 121,
            "protein": 11.9,
            "fat": 5.2,
            "carbs": 8.9
        },
        "ingredients": [
            {
                "name": "эдамаме",
                "weight": 150,
                "amount": 150,
                "unit": "g",
                "category": "vegetables"
            },
            {
                "name": "соль",
                "weight": 1,
                "amount": 1,
                "unit": "g",
                "category": "spices"
            },
            {
                "name": "лимонный сок",
                "weight": 5,
                "amount": 5,
                "unit": "ml",
                "category": "other"
            }
        ],
        "steps": [
            "Отварите эдамаме 5-6 минут.",
            "Посолите и добавьте лимонный сок.",
            "Подавайте теплым или охлажденным."
        ],
        "cookingTime": 8,
        "storage": "Холодильник 2 дня.",
        "goalTags": [
            "weight_loss",
            "maintenance",
            "muscle_gain"
        ],
        "nutritionTags": [
            "high_protein",
            "balanced",
            "quick"
        ],
        "isMealPrep": true,
        "isFreezerFriendly": true,
        "searchKeywords": [
            "эдамаме",
            "перекус",
            "растительный белок",
            "бобы",
            "meal prep"
        ]
    },
    {
        "id": "078b7cd9-55cd-4091-9f70-0840e3ba0eac",
        "slug": "ovsyanoblin-s-tvorogom",
        "sort": 310,
        "name": "Овсяноблин с творогом",
        "description": "Проверка дубля.",
        "category": "Завтрак",
        "mealType": "breakfast",
        "image_url": "assets/recipes/ovsyanoblin-s-tvorogom.webp",
        "total_weight": 200,
        "servings": 1,
        "nutrition": {
            "calories": 100,
            "protein": 10,
            "fat": 2,
            "carbs": 5
        },
        "ingredients": [
            {
                "name": "Творог",
                "weight": 100,
                "amount": 100,
                "unit": "g",
                "displayAmount": "100 г",
                "category": "dairy"
            }
        ],
        "steps": [
            "Смешать."
        ],
        "cookingTime": 20,
        "storage": "",
        "goalTags": [
            "maintenance"
        ],
        "nutritionTags": [
            "balanced"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "завтрак",
            "овсяноблин",
            "творогом",
            "творог"
        ]
    },
    {
        "id": "3848642a-ab86-44b0-8740-5368f5ff7a28",
        "slug": "kokosovyi-pp-tiramisu",
        "sort": 320,
        "name": "Кокосовый ПП тирамису",
        "description": "Нежный high protein десерт с кремовой текстурой, кокосовыми нотками и вкусом классического тирамису.",
        "category": "Десерт",
        "mealType": "snack",
        "image_url": "assets/recipes/kokosovyi-pp-tiramisu.webp",
        "total_weight": 100,
        "servings": 1,
        "nutrition": {
            "calories": 146,
            "protein": 14,
            "fat": 5,
            "carbs": 8
        },
        "ingredients": [
            {
                "name": "Творожный крем",
                "weight": 0,
                "amount": 0,
                "unit": "g",
                "displayAmount": "",
                "category": "other"
            },
            {
                "name": "Творог мягкий 2%",
                "weight": 250,
                "amount": 250,
                "unit": "g",
                "displayAmount": "250 г",
                "category": "dairy"
            },
            {
                "name": "Греческий йогурт 2%",
                "weight": 120,
                "amount": 120,
                "unit": "g",
                "displayAmount": "120 г",
                "category": "dairy"
            },
            {
                "name": "Протеин ванильный",
                "weight": 30,
                "amount": 30,
                "unit": "g",
                "displayAmount": "30 г",
                "category": "spices"
            },
            {
                "name": "Сахарозаменитель",
                "weight": 0,
                "amount": 0,
                "unit": "g",
                "displayAmount": "по вкусу",
                "category": "other"
            },
            {
                "name": "Ваниль",
                "weight": 0,
                "amount": 0,
                "unit": "g",
                "displayAmount": "по желанию",
                "category": "spices"
            },
            {
                "name": "Основа и слои",
                "weight": 0,
                "amount": 0,
                "unit": "g",
                "displayAmount": "",
                "category": "other"
            },
            {
                "name": "Рисовые хлебцы",
                "weight": 40,
                "amount": 40,
                "unit": "g",
                "displayAmount": "40 г",
                "category": "grains"
            },
            {
                "name": "Кофе эспрессо",
                "weight": 80,
                "amount": 80,
                "unit": "ml",
                "displayAmount": "80 мл",
                "category": "other"
            },
            {
                "name": "Декор",
                "weight": 0,
                "amount": 0,
                "unit": "g",
                "displayAmount": "",
                "category": "other"
            },
            {
                "name": "Какао",
                "weight": 10,
                "amount": 10,
                "unit": "g",
                "displayAmount": "10 г",
                "category": "spices"
            },
            {
                "name": "Кокосовая стружка",
                "weight": 20,
                "amount": 20,
                "unit": "g",
                "displayAmount": "20 г",
                "category": "other"
            }
        ],
        "steps": [
            "Смешать творог, греческий йогурт, протеин, сахарозаменитель и ваниль до кремовой текстуры.",
            "Заварить эспрессо и полностью остудить.",
            "Быстро окунуть рисовые хлебцы в кофе.",
            "Выложить слой хлебцев, затем крем и немного кокосовой стружки.",
            "Повторить слои 2—3 раза.",
            "Сверху посыпать какао и оставшейся кокосовой стружкой.",
            "Убрать в холодильник минимум на 1—2 часа."
        ],
        "cookingTime": 20,
        "storage": "",
        "goalTags": [
            "maintenance"
        ],
        "nutritionTags": [
            "balanced"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "десерт",
            "кокосовый",
            "тирамису",
            "творожный",
            "крем",
            "творог",
            "мягкий",
            "греческий",
            "йогурт",
            "протеин",
            "ванильный",
            "сахарозаменитель"
        ]
    },
    {
        "id": "a5a1c3d1-51d7-47f5-aa83-d6fbd8c4fc1c",
        "slug": "fistashkovyi-pp-chizkeik-v-stakane",
        "sort": 330,
        "name": "Фисташковый ПП чизкейк в стакане",
        "description": "Нежный high protein десерт с кремовой текстурой и насыщенным фисташковым вкусом.",
        "category": "Десерт",
        "mealType": "snack",
        "image_url": "assets/recipes/fistashkovyi-pp-chizkeik-v-stakane.webp",
        "total_weight": 100,
        "servings": 1,
        "nutrition": {
            "calories": 152,
            "protein": 13,
            "fat": 6,
            "carbs": 9
        },
        "ingredients": [
            {
                "name": "Чизкейк-основа",
                "weight": 0,
                "amount": 0,
                "unit": "g",
                "displayAmount": "",
                "category": "other"
            },
            {
                "name": "Творог мягкий 2%",
                "weight": 250,
                "amount": 250,
                "unit": "g",
                "displayAmount": "250 г",
                "category": "dairy"
            },
            {
                "name": "Греческий йогурт 2%",
                "weight": 120,
                "amount": 120,
                "unit": "g",
                "displayAmount": "120 г",
                "category": "dairy"
            },
            {
                "name": "Протеин ванильный",
                "weight": 30,
                "amount": 30,
                "unit": "g",
                "displayAmount": "30 г",
                "category": "spices"
            },
            {
                "name": "Фисташковая паста",
                "weight": 20,
                "amount": 20,
                "unit": "g",
                "displayAmount": "20 г",
                "category": "nuts"
            },
            {
                "name": "Сахарозаменитель",
                "weight": 0,
                "amount": 0,
                "unit": "g",
                "displayAmount": "по вкусу",
                "category": "other"
            },
            {
                "name": "Желатиновая основа",
                "weight": 0,
                "amount": 0,
                "unit": "g",
                "displayAmount": "",
                "category": "other"
            },
            {
                "name": "Желатин",
                "weight": 8,
                "amount": 8,
                "unit": "g",
                "displayAmount": "8 г",
                "category": "other"
            },
            {
                "name": "Вода",
                "weight": 40,
                "amount": 40,
                "unit": "ml",
                "displayAmount": "40 мл",
                "category": "other"
            },
            {
                "name": "Декор",
                "weight": 0,
                "amount": 0,
                "unit": "g",
                "displayAmount": "",
                "category": "other"
            },
            {
                "name": "Фисташки дроблёные",
                "weight": 15,
                "amount": 15,
                "unit": "g",
                "displayAmount": "15 г",
                "category": "nuts"
            },
            {
                "name": "Ягоды",
                "weight": 50,
                "amount": 50,
                "unit": "g",
                "displayAmount": "50 г",
                "category": "fruits"
            }
        ],
        "steps": [
            "Залить желатин водой и оставить набухать на 5 минут.",
            "Смешать творог, греческий йогурт, протеин, фисташковую пасту и сахарозаменитель до кремовой текстуры.",
            "Подогреть желатин до полного растворения и ввести в массу.",
            "Разлить по стаканам или креманкам.",
            "Убрать в холодильник минимум на 2 часа до стабилизации.",
            "Перед подачей украсить ягодами и дроблёными фисташками."
        ],
        "cookingTime": 20,
        "storage": "",
        "goalTags": [
            "maintenance"
        ],
        "nutritionTags": [
            "balanced"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "десерт",
            "фисташковый",
            "чизкейк",
            "стакане",
            "основа",
            "творог",
            "мягкий",
            "греческий",
            "йогурт",
            "протеин",
            "ванильный",
            "фисташковая"
        ]
    },
    {
        "id": "340167e3-fbb2-47d6-a7ba-87cf033a1b6f",
        "slug": "shokoladnyi-pp-fondan-s-zhidkoi-seredinoi",
        "sort": 340,
        "name": "Шоколадный ПП фондан с жидкой серединой",
        "description": "Нежный high protein десерт с насыщенным шоколадным вкусом и тягучей жидкой серединой.",
        "category": "Десерт",
        "mealType": "snack",
        "image_url": "assets/recipes/shokoladnyi-pp-fondan-s-zhidkoi-seredinoi.webp",
        "total_weight": 100,
        "servings": 1,
        "nutrition": {
            "calories": 148,
            "protein": 14,
            "fat": 5,
            "carbs": 10
        },
        "ingredients": [
            {
                "name": "Шоколадная основа",
                "weight": 0,
                "amount": 0,
                "unit": "g",
                "displayAmount": "",
                "category": "other"
            },
            {
                "name": "Банан",
                "weight": 1,
                "amount": 1,
                "unit": "pcs",
                "displayAmount": "1 шт.",
                "category": "fruits"
            },
            {
                "name": "Яйцо",
                "weight": 2,
                "amount": 2,
                "unit": "pcs",
                "displayAmount": "2 шт.",
                "category": "eggs"
            },
            {
                "name": "Протеин шоколадный",
                "weight": 30,
                "amount": 30,
                "unit": "g",
                "displayAmount": "30 г",
                "category": "other"
            },
            {
                "name": "Какао",
                "weight": 20,
                "amount": 20,
                "unit": "g",
                "displayAmount": "20 г",
                "category": "spices"
            },
            {
                "name": "Греческий йогурт",
                "weight": 80,
                "amount": 80,
                "unit": "g",
                "displayAmount": "80 г",
                "category": "dairy"
            },
            {
                "name": "Разрыхлитель",
                "weight": 3,
                "amount": 3,
                "unit": "g",
                "displayAmount": "3 г",
                "category": "spices"
            },
            {
                "name": "Сахарозаменитель",
                "weight": 0,
                "amount": 0,
                "unit": "g",
                "displayAmount": "по вкусу",
                "category": "other"
            },
            {
                "name": "Начинка",
                "weight": 0,
                "amount": 0,
                "unit": "g",
                "displayAmount": "",
                "category": "other"
            },
            {
                "name": "Тёмный шоколад 70%",
                "weight": 20,
                "amount": 20,
                "unit": "g",
                "displayAmount": "20 г",
                "category": "other"
            }
        ],
        "steps": [
            "Пробить банан, яйца, греческий йогурт, протеин и какао блендером до однородной массы.",
            "Добавить разрыхлитель и тщательно перемешать.",
            "Разлить тесто по формочкам, заполняя примерно на 70%.",
            "В центр каждой формы положить кусочек тёмного шоколада.",
            "Выпекать 8—10 минут при 190°C — центр должен остаться слегка жидким.",
            "Дать постоять 2 минуты и подавать горячим.",
            "По желанию добавить ягоды, какао или немного греческого йогурта."
        ],
        "cookingTime": 20,
        "storage": "",
        "goalTags": [
            "maintenance"
        ],
        "nutritionTags": [
            "balanced"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "десерт",
            "шоколадный",
            "фондан",
            "жидкой",
            "серединой",
            "шоколадная",
            "основа",
            "банан",
            "яйцо",
            "протеин",
            "какао",
            "греческий"
        ]
    },
    {
        "id": "ffc3342d-b783-451e-a7be-4019800daafb",
        "slug": "picca-na-tvorozhnom-teste-pp",
        "sort": 350,
        "name": "Пицца на творожном тесте ПП",
        "description": "Белковая low-calorie пицца на основе творога с нежным тестом и классической начинкой.",
        "category": "Основное блюдо",
        "mealType": "lunch",
        "image_url": "assets/recipes/picca-na-tvorozhnom-teste-pp.webp",
        "total_weight": 100,
        "servings": 1,
        "nutrition": {
            "calories": 138,
            "protein": 15,
            "fat": 3,
            "carbs": 14
        },
        "ingredients": [
            {
                "name": "Тесто",
                "weight": 0,
                "amount": 0,
                "unit": "g",
                "displayAmount": "",
                "category": "other"
            },
            {
                "name": "Творог 2%",
                "weight": 300,
                "amount": 300,
                "unit": "g",
                "displayAmount": "300 г",
                "category": "dairy"
            },
            {
                "name": "Яйца",
                "weight": 2,
                "amount": 2,
                "unit": "pcs",
                "displayAmount": "2 шт.",
                "category": "eggs"
            },
            {
                "name": "Вода",
                "weight": 50,
                "amount": 50,
                "unit": "ml",
                "displayAmount": "50 мл",
                "category": "other"
            },
            {
                "name": "Мука рисовая",
                "weight": 100,
                "amount": 100,
                "unit": "g",
                "displayAmount": "100 г",
                "category": "grains"
            },
            {
                "name": "Соль",
                "weight": 0,
                "amount": 0,
                "unit": "g",
                "displayAmount": "по вкусу",
                "category": "spices"
            },
            {
                "name": "Начинка",
                "weight": 0,
                "amount": 0,
                "unit": "g",
                "displayAmount": "",
                "category": "other"
            },
            {
                "name": "Ветчина из курицы/индейки",
                "weight": 100,
                "amount": 100,
                "unit": "g",
                "displayAmount": "100 г",
                "category": "meat"
            },
            {
                "name": "Шампиньоны",
                "weight": 50,
                "amount": 50,
                "unit": "g",
                "displayAmount": "50 г",
                "category": "other"
            },
            {
                "name": "Помидор",
                "weight": 50,
                "amount": 50,
                "unit": "g",
                "displayAmount": "50 г",
                "category": "vegetables"
            },
            {
                "name": "Сыр лёгкий",
                "weight": 50,
                "amount": 50,
                "unit": "g",
                "displayAmount": "50 г",
                "category": "dairy"
            },
            {
                "name": "Кетчуп / томатная паста",
                "weight": 1,
                "amount": 1,
                "unit": "g",
                "displayAmount": "1 ст. л.",
                "category": "vegetables"
            },
            {
                "name": "Майонез лёгкий / греческий йогурт",
                "weight": 1,
                "amount": 1,
                "unit": "g",
                "displayAmount": "1 ст. л.",
                "category": "dairy"
            }
        ],
        "steps": [
            "Смешать все ингредиенты для теста до однородной массы.",
            "Выложить тесто на сковороду и равномерно распределить.",
            "Готовить под крышкой на огне чуть ниже среднего 8—10 минут до золотистой корочки.",
            "Перевернуть основу, накрыть крышкой и готовить ещё 4—5 минут.",
            "В это время подготовить начинку: грибы нарезать и слегка обжарить, мясо и помидоры нарезать, сыр натереть.",
            "Смазать основу кетчунезом или томатной пастой с йогуртом.",
            "Выложить начинку и посыпать сыром.",
            "Накрыть крышкой и готовить до полного расплавления сыра."
        ],
        "cookingTime": 20,
        "storage": "",
        "goalTags": [
            "maintenance"
        ],
        "nutritionTags": [
            "balanced"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "основное блюдо",
            "пицца",
            "творожном",
            "тесте",
            "тесто",
            "творог",
            "яйца",
            "вода",
            "мука",
            "рисовая",
            "соль"
        ]
    },
    {
        "id": "f457b665-1888-49cf-8fcf-2fd7ed0b77c6",
        "slug": "blinnyi-tort-iz-gerkulesa-pp",
        "sort": 360,
        "name": "Блинный торт из геркулеса ПП",
        "description": "Белковый high protein блинный торт с овсяными коржами, йогуртовым кремом и клубникой.",
        "category": "Десерт",
        "mealType": "snack",
        "image_url": "assets/recipes/blinnyi-tort-iz-gerkulesa-pp.webp",
        "total_weight": 100,
        "servings": 1,
        "nutrition": {
            "calories": 97,
            "protein": 8,
            "fat": 3,
            "carbs": 9
        },
        "ingredients": [
            {
                "name": "Коржи",
                "weight": 0,
                "amount": 0,
                "unit": "g",
                "displayAmount": "",
                "category": "other"
            },
            {
                "name": "Геркулес",
                "weight": 80,
                "amount": 80,
                "unit": "g",
                "displayAmount": "80 г",
                "category": "other"
            },
            {
                "name": "Яйцо",
                "weight": 2,
                "amount": 2,
                "unit": "pcs",
                "displayAmount": "2 шт.",
                "category": "eggs"
            },
            {
                "name": "Молоко 1,5%",
                "weight": 250,
                "amount": 250,
                "unit": "ml",
                "displayAmount": "250 мл",
                "category": "dairy"
            },
            {
                "name": "Протеин",
                "weight": 30,
                "amount": 30,
                "unit": "g",
                "displayAmount": "30 г",
                "category": "other"
            },
            {
                "name": "Крем",
                "weight": 0,
                "amount": 0,
                "unit": "g",
                "displayAmount": "",
                "category": "other"
            },
            {
                "name": "Греческий йогурт",
                "weight": 250,
                "amount": 250,
                "unit": "g",
                "displayAmount": "250 г",
                "category": "dairy"
            },
            {
                "name": "Протеин",
                "weight": 0,
                "amount": 0,
                "unit": "g",
                "displayAmount": "(по желанию, для усиления крема)",
                "category": "other"
            },
            {
                "name": "Декор",
                "weight": 0,
                "amount": 0,
                "unit": "g",
                "displayAmount": "",
                "category": "other"
            },
            {
                "name": "Клубника",
                "weight": 200,
                "amount": 200,
                "unit": "g",
                "displayAmount": "200 г",
                "category": "fruits"
            }
        ],
        "steps": [
            "Заколоть геркулес, яйца, молоко и протеин в блендере до однородной массы.",
            "Обжарить смесь на сковороде, формируя тонкие коржи.",
            "Подготовить крем: смешать греческий йогурт с протеином (по желанию).",
            "Прослоить коржи кремом, формируя торт.",
            "Украсить сверху клубникой.",
            "Охладить перед подачей для стабилизации структуры."
        ],
        "cookingTime": 20,
        "storage": "",
        "goalTags": [
            "maintenance"
        ],
        "nutritionTags": [
            "balanced"
        ],
        "isMealPrep": false,
        "isFreezerFriendly": false,
        "searchKeywords": [
            "десерт",
            "блинный",
            "торт",
            "геркулеса",
            "коржи",
            "геркулес",
            "яйцо",
            "молоко",
            "протеин",
            "крем"
        ]
    }
];
