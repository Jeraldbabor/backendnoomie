# Discover

"What can I cook with what I have?" The user lists the ingredients they have, and Discover
returns recipes that use them, best matches first, each with the ingredients still missing.
Anyone can use it; signed-in users also get `savedByMe`.

How to call it from the Noomie app: [app integration](../app-integration/noomie-app.md#discover-in-the-app).

## Endpoints

| Method | Path                       | Who    | Success |
| ------ | -------------------------- | ------ | ------- |
| GET    | `/api/v1/discover/recipes` | Anyone | 200     |

Like recipe reads, it works without a token. **Send the token when the user is signed in** to
get `savedByMe`. A token that is sent but invalid or expired gets **401**.

## Find recipes: `GET /api/v1/discover/recipes`

```http
GET /api/v1/discover/recipes?ingredients=pasta,tomato,garlic,olive oil
```

| Query         | Meaning                                                                         |
| ------------- | ------------------------------------------------------------------------------- |
| `ingredients` | Required. What the user has, separated by commas: 1–30 names, each up to 100    |
| `cuisine`     | Exact cuisine name, like `Mediterranean` (case-sensitive), max 60               |
| `maxMinutes`  | Only recipes that take at most this many minutes, 1–1440                        |
| `maxMissing`  | Only recipes missing at most this many ingredients, 0–100. `0` = "can cook now" |
| `limit`       | How many results, 1–50 (default 20)                                             |

Encode the query string as usual (spaces in `olive oil` become `%20` or `+`). Repeating the
parameter (`?ingredients=pasta&ingredients=garlic`) works too. Blank names are ignored.

Returns **200** with the best matches:

```json
{
  "data": [
    {
      "recipe": {
        "id": "01a15c75-d570-7305-8447-4edc4c24ce5a",
        "title": "Slow Sunday tomato pasta",
        "description": "Tomatoes, basil and your favourite pasta. An unhurried idea for a table worth gathering around.",
        "cuisine": "Italian-inspired",
        "minutes": 35,
        "servings": 4,
        "ingredients": [
          { "name": "pasta", "quantity": 400, "unit": "g", "note": null },
          {
            "name": "tomatoes",
            "quantity": 800,
            "unit": "g",
            "note": "ripe, chopped"
          },
          { "name": "olive oil", "quantity": 3, "unit": "tbsp", "note": null },
          {
            "name": "garlic",
            "quantity": 2,
            "unit": "clove",
            "note": "sliced"
          },
          {
            "name": "basil",
            "quantity": 1,
            "unit": "handful",
            "note": "leaves torn"
          },
          { "name": "salt", "quantity": null, "unit": null, "note": "to taste" }
        ],
        "createdAt": "2026-10-21T03:16:28.654Z",
        "updatedAt": "2026-10-23T05:52:21.210Z",
        "author": null,
        "savedByMe": false
      },
      "match": { "have": 4, "needed": 5, "missing": ["basil"] }
    },
    {
      "recipe": { "title": "Lemon & herb chickpea bowl", "…": "…" },
      "match": {
        "have": 1,
        "needed": 5,
        "missing": ["chickpeas", "cucumber", "lemon", "parsley"]
      }
    }
  ]
}
```

- **`recipe`** is a recipe as in other lists: the [recipe object](recipes.md#the-recipe-object)
  [without `steps`](recipes.md#in-lists-recipes-have-no-steps). Load
  `GET /api/v1/recipes/:id` when the user opens it.
- **`match.needed`** counts the recipe's ingredients that have a quantity.
- **`match.have`** counts how many of those the user has.
- **`match.missing`** names the ones they don't have, as the recipe writes them, in recipe
  order. `[]` means the user can cook it now.
- No results is `{ "data": [] }` with **200**, not an error.

There is **no `nextCursor`**: results are ranked, so there is one page of the best
matches. Raise `limit` (up to 50) to show more.

## How matching works

**Order.** Recipes missing the fewest ingredients come first. On a tie, recipes that use more
of the user's ingredients come first, then the newest.

**Only recipes using at least one of the user's ingredients are returned.**

**Optional ingredients.** Ingredients without a quantity (like "salt, to taste") never count
as missing, and don't count in `have` or `needed` either.

**Names.** A name the user enters matches a recipe ingredient when they're the same after
ignoring:

- upper and lower case: `Tomato` matches `tomato`;
- common accents: `jalapeno` matches `jalapeño`;
- punctuation and extra spaces: `olive-oil` matches `olive oil`;
- plural endings: `tomato` matches `tomatoes`, `berry` matches `berries`, `olive` matches
  `olives`.

Everything else must match: `oil` doesn't match `olive oil`, `miso` doesn't match
`white miso`, and irregular plurals (`leaf` and `leaves`) or different names for the same
thing (`scallion` and `spring onion`) don't match. That's why recipe ingredient names should
be the ingredient alone, with details in the note; see [recipes](recipes.md#create-a-recipe-post-apiv1recipes-signed-in).

## Errors

| Status | When                                       | Message                                                      |
| ------ | ------------------------------------------ | ------------------------------------------------------------ |
| 400    | `ingredients` missing or only blanks       | `Enter at least one ingredient`                              |
| 400    | More than 30 ingredients                   | `Enter at most 30 ingredients`                               |
| 400    | A number filter out of range               | For example `maxMinutes must not be less than 1` (in a list) |
| 401    | A token was sent but is invalid or expired | `Sign in to continue`                                        |

The two ingredient messages are user-friendly. As always, `message` is a list for 400s:

```json
{
  "message": ["Enter at least one ingredient"],
  "error": "Bad Request",
  "statusCode": 400
}
```

## Types

```ts
type IngredientMatch = { have: number; needed: number; missing: string[] };
type RecipeMatch = { recipe: RecipeSummary; match: IngredientMatch }; // RecipeSummary: recipes.md
type DiscoverResult = { data: RecipeMatch[] };
type DiscoverQuery = {
  ingredients: string[]; // joined with commas in the URL
  cuisine?: string;
  maxMinutes?: number;
  maxMissing?: number;
  limit?: number;
};
```
