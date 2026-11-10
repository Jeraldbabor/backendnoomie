# Recipe nutrition

What's in a recipe: calories, protein, fat, saturated fat, carbs, fiber, sugars and sodium,
**estimated from its ingredients** with USDA data, plus % Daily Value and short facts such
as "High in protein". Use it to answer "what's in this dish, and what's good about it?" on a
recipe screen, or right after a [food scan](scan.md) finds the recipe.

Anyone can read it, like the recipe itself. Nothing is stored: it's worked out from the
recipe's current ingredients on every request, so edits show at once.

How to show it in the app: [app integration](../app-integration/noomie-app.md#nutrition-in-the-app).

## Endpoints

| Method | Path                            | Who    | Success |
| ------ | ------------------------------- | ------ | ------- |
| GET    | `/api/v1/recipes/:id/nutrition` | Anyone | 200     |

## Get a recipe's nutrition: `GET /api/v1/recipes/:id/nutrition`

No body or query parameters. Signing in changes nothing. Returns **200**:

```json
{
  "recipeId": "01a1c337-6d5e-771b-9d3c-d61f986c045f",
  "servings": 4,
  "perServing": {
    "energyKcal": 655,
    "proteinG": 44.3,
    "fatG": 48.6,
    "saturatedFatG": 12.4,
    "carbsG": 7.5,
    "fiberG": 0.5,
    "sugarsG": 3.5,
    "sodiumMg": 1965
  },
  "total": {
    "energyKcal": 2619,
    "proteinG": 177.1,
    "fatG": 194.2,
    "saturatedFatG": 49.6,
    "carbsG": 30.1,
    "fiberG": 2.1,
    "sugarsG": 14.1,
    "sodiumMg": 7859
  },
  "percentDailyValue": {
    "proteinG": 89,
    "fatG": 62,
    "saturatedFatG": 62,
    "carbsG": 3,
    "fiberG": 2,
    "sodiumMg": 85
  },
  "incompleteNutrients": [],
  "highlights": [
    {
      "nutrient": "proteinG",
      "level": "high",
      "percentDailyValue": 89,
      "label": "High in protein"
    },
    {
      "nutrient": "fatG",
      "level": "high",
      "percentDailyValue": 62,
      "label": "High in fat"
    },
    {
      "nutrient": "saturatedFatG",
      "level": "high",
      "percentDailyValue": 62,
      "label": "High in saturated fat"
    },
    {
      "nutrient": "sodiumMg",
      "level": "high",
      "percentDailyValue": 85,
      "label": "High in sodium"
    }
  ],
  "coverage": {
    "counted": 8,
    "total": 9,
    "complete": false
  },
  "ingredients": [
    {
      "name": "chicken thighs",
      "quantity": 1,
      "unit": "kg",
      "food": {
        "fdcId": 172385,
        "description": "Chicken, broilers or fryers, thigh, meat and skin, raw"
      },
      "grams": 1000,
      "counted": true,
      "reason": null
    },
    {
      "name": "soy sauce",
      "quantity": 0.5,
      "unit": "cup",
      "food": {
        "fdcId": 174277,
        "description": "Soy sauce made from soy and wheat (shoyu)"
      },
      "grams": 128,
      "counted": true,
      "reason": null
    },
    {
      "name": "garlic",
      "quantity": 6,
      "unit": "clove",
      "food": {
        "fdcId": 169230,
        "description": "Garlic, raw"
      },
      "grams": 18,
      "counted": true,
      "reason": null
    },
    {
      "name": "bay leaves",
      "quantity": 3,
      "unit": null,
      "food": {
        "fdcId": 170917,
        "description": "Spices, bay leaf"
      },
      "grams": null,
      "counted": false,
      "reason": "unknown_unit"
    }
  ],
  "source": {
    "name": "USDA FoodData Central, SR Legacy (2018)",
    "url": "https://fdc.nal.usda.gov"
  }
}
```

That's a chicken adobo for 4. Its `ingredients` list is shortened here: it has 9 lines,
and 8 were counted. 3 bay leaves have no USDA weight per leaf, so they show as
`unknown_unit`.

- **`perServing`** is `total` divided by the recipe's `servings`. Energy is in kcal and
  sodium in mg, both whole numbers; the rest are grams with one decimal.
- **`percentDailyValue`** is per serving, in whole percent of the
  [FDA Daily Values](https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels)
  for adults: protein 50 g, fat 78 g, saturated fat 20 g, carbs 275 g, fiber 28 g, sodium
  2,300 mg. Sugars have none (FDA only sets one for _added_ sugars, which a recipe can't
  tell apart from the sugar in fruit or milk).
- **`highlights`** follow FDA's rule of thumb for % Daily Value per serving: **20% or more is
  high, 5% or less is low**, and 10–19% of protein or fiber is a **good source**. Each has a
  ready-to-show `label`:

  | Nutrient      | Labels it can get                               |
  | ------------- | ----------------------------------------------- |
  | Protein       | `High in protein`, `Good source of protein`     |
  | Fiber         | `High in fiber`, `Good source of fiber`         |
  | Fat           | `High in fat`, `Low in fat`                     |
  | Saturated fat | `High in saturated fat`, `Low in saturated fat` |
  | Sodium        | `High in sodium`, `Low in sodium`               |

  "Low" only appears when **every** ingredient was counted, since an uncounted one could add
  more. "High" and "good source" stay true either way.

- **`coverage`** says how many ingredients are in the totals. When `complete` is `false`,
  the real values are higher than shown: say so ("Based on 6 of 9 ingredients").
- **`ingredients`** is the recipe's list, in order, each with the USDA `food` it was
  counted as and its weight in `grams`. Show it so users can see the estimate's working.
  `food` is `null` when no food matched. `fdcId` is USDA's id: the food's page is
  `https://fdc.nal.usda.gov/food-details/<fdcId>/nutrients`.
- **`reason`** is `null` for a counted ingredient, and otherwise:

  | `reason`       | Means                                                      | Example                          |
  | -------------- | ---------------------------------------------------------- | -------------------------------- |
  | `no_amount`    | The ingredient has no quantity                             | salt "to taste"                  |
  | `unknown_food` | The name isn't one of the foods nutrition knows            | calamansi                        |
  | `unknown_unit` | The food is known, but not a weight for that unit or count | 3 bay leaves, a handful of basil |

- **`incompleteNutrients`** lists nutrients USDA has no value for in at least one counted
  food, such as `sugarsG` for kangkong. Those totals are a little low; show them as "at
  least".
- **`source`**: show "Source: USDA FoodData Central" near the numbers.

## How the estimate works

- **Amounts are as bought, before cooking.** `200 g rice` is raw rice; cooked rice weighs
  about 3 times as much for the same food, so use the name "cooked rice" for that. Meat is
  raw meat: weights that include bones count a little high. What cooking removes (fat
  poured off, oil left in the pan) isn't subtracted.
- **Units.** `g`, `kg`, `oz` and `lb` are exact. `ml`, `l`, `tsp`, `tbsp`, `cup` and
  `pinch` (1/16 tsp) use the food's own USDA weight per cup or spoon, so 1 cup of flour is
  125 g and 1 cup of sugar 200 g. Counts (`2` eggs) and `clove`, `slice`, `can` and `bunch`
  use USDA portion sizes: 1 large egg is 50 g, a garlic clove 3 g, a drained can of
  chickpeas 253 g. A count of garlic means cloves. `handful` never has a weight. When USDA's
  size isn't what a Filipino kitchen means (a US eggplant weighs 3 times a talong), the count
  isn't used and the ingredient shows as `unknown_unit`; use grams.
- **Names** match with the rules [Discover](discover.md) uses (case, accents, punctuation
  and plural endings don't matter), in English and Filipino: `bawang`, `toyo`, `patis`,
  `suka`, `kangkong`, `malunggay`, `sitaw`, `kalabasa`, `gata`. Describing words are fine:
  "2 large red onions, finely chopped" is onions. A word that makes it a different food
  isn't: "coconut flour", "dried mango", "cooked chicken" and "chili leaves" show as
  `unknown_food` rather than being counted as flour, mango, chicken or chilies.
- **Foods.** About 190 common ingredients, each checked by hand against USDA FoodData
  Central SR Legacy (public domain). USDA has no data for some local ingredients, such as
  calamansi and bagoong; ask the backend team to add any that are missing.
- **Facts, not advice.** The highlights describe the numbers. Don't turn them into health
  claims ("good for your heart"), and remember they're estimates.

## Errors

| Status | When                     | Message                                |
| ------ | ------------------------ | -------------------------------------- |
| 400    | `:id` isn't a valid UUID | `Validation failed (uuid is expected)` |
| 404    | No recipe has that id    | `Recipe <id> not found`                |

## Types

```ts
type Nutrients = {
  energyKcal: number;
  proteinG: number;
  fatG: number;
  saturatedFatG: number;
  carbsG: number;
  fiberG: number;
  sugarsG: number;
  sodiumMg: number;
};

type RecipeNutrition = {
  recipeId: string;
  servings: number;
  perServing: Nutrients;
  total: Nutrients;
  percentDailyValue: {
    proteinG: number;
    fatG: number;
    saturatedFatG: number;
    carbsG: number;
    fiberG: number;
    sodiumMg: number;
  };
  incompleteNutrients: (keyof Nutrients)[];
  highlights: {
    nutrient: keyof Nutrients;
    level: 'high' | 'good_source' | 'low';
    percentDailyValue: number;
    label: string;
  }[];
  coverage: { counted: number; total: number; complete: boolean };
  ingredients: {
    name: string;
    quantity: number | null;
    unit: string | null;
    food: { fdcId: number; description: string } | null;
    grams: number | null;
    counted: boolean;
    reason: 'no_amount' | 'unknown_food' | 'unknown_unit' | null;
  }[];
  source: { name: string; url: string };
};
```

## Checked on real recipes

Five Filipino recipes typed the way a user would, and the three seed recipes, through the
running API on 2026-11-10. **54 of 64 ingredients were counted.** The rest were salt to
taste, counts and bunches of leafy or local vegetables (use grams for those), and foods
USDA has no data for.

| Recipe (servings)                 | Counted  | kcal / serving | Protein g | Sodium mg | Not counted                                                     |
| --------------------------------- | -------- | -------------- | --------- | --------- | --------------------------------------------------------------- |
| Chicken adobo (4)                 | 8 of 9   | 655            | 44.3      | 1965      | bay leaves (count)                                              |
| Sinigang na baboy (6)             | 7 of 11  | 498            | 27.5      | 635       | talong and siling haba (counts), kangkong (bunch), sinigang mix |
| Leche flan (8)                    | 5 of 5   | 384            | 10.3      | 121       | none                                                            |
| Ginisang monggo (4)               | 9 of 9   | 500            | 18.8      | 396       | none                                                            |
| Pancit canton (5)                 | 12 of 13 | 396            | 31.7      | 1196      | calamansi                                                       |
| Slow Sunday tomato pasta (seed)   | 4 of 6   | 499            | 14.9      | 16        | basil (handful), salt (to taste)                                |
| Miso mushroom rice (seed)         | 5 of 5   | 465            | 12.4      | 376       | none                                                            |
| Lemon & herb chickpea bowl (seed) | 4 of 6   | 428            | 15.4      | 496       | parsley (bunch), salt (to taste)                                |

Each counted line was checked against its USDA food and portion by hand. The sinigang
counts high: its 1 kg of pork ribs includes the bones.
