# Recipes

Anyone can read recipes. Signed-in users can create recipes, and only a recipe's **author**
can edit or delete it. Signed-in users can also [save recipes](saved-recipes.md).

How to call these from the Noomie app: [app integration](../app-integration/noomie-app.md#adding-a-feature-api-module).

## Endpoints

| Method | Path                  | Who         | Success |
| ------ | --------------------- | ----------- | ------- |
| GET    | `/api/v1/recipes`     | Anyone      | 200     |
| GET    | `/api/v1/recipes/:id` | Anyone      | 200     |
| POST   | `/api/v1/recipes`     | Signed in   | 201     |
| PATCH  | `/api/v1/recipes/:id` | Author only | 200     |
| DELETE | `/api/v1/recipes/:id` | Author only | 204     |

The recipe's photo is uploaded and removed with `PUT` and `DELETE /api/v1/recipes/:id/photo`
(author only); see [photos](photos.md#upload-a-photo).

The two read endpoints work without a token. **Send the token when the user is signed in**:
then `savedByMe` is filled in for them. A token that is sent but invalid or expired gets
**401** `Sign in to continue` (it isn't silently ignored), so treat it like any other 401.

## The recipe object

`GET /api/v1/recipes/:id`, create, and edit return the full recipe:

```json
{
  "id": "01a166a9-eb95-75bf-b0a5-eae644b98f4f",
  "title": "Garlic butter noodles",
  "description": "Quick weeknight noodles.",
  "cuisine": "Italian-inspired",
  "minutes": 15,
  "servings": 2,
  "ingredients": [
    { "name": "spaghetti", "quantity": 200, "unit": "g", "note": null },
    { "name": "butter", "quantity": 2, "unit": "tbsp", "note": null },
    {
      "name": "garlic",
      "quantity": 3,
      "unit": "clove",
      "note": "finely chopped"
    },
    { "name": "eggs", "quantity": 2, "unit": null, "note": null },
    { "name": "salt", "quantity": null, "unit": null, "note": "to taste" }
  ],
  "photo": null,
  "createdAt": "2026-10-23T02:49:34.357Z",
  "updatedAt": "2026-10-23T02:49:34.357Z",
  "author": {
    "id": "01a166a9-eaf9-7108-b8ce-1359df2f21c9",
    "displayName": "Ada",
    "photo": null
  },
  "steps": [
    "Cook the spaghetti in salted water until just tender.",
    "Melt the butter and cook the garlic gently for 1 minute.",
    "Toss the noodles in the garlic butter and season with salt."
  ],
  "savedByMe": false
}
```

- **`servings`** is how many portions the ingredient quantities make.
- **`ingredients`** are in the order the author listed them. Each one has:
  - `name`: what it is, like `spaghetti`.
  - `quantity`: a number (`200`, `1.5`, `0.25`), or `null` for things like "salt to taste".
  - `unit`: one of the [units](#units), or `null`. A quantity without a unit is a count:
    `{ "name": "eggs", "quantity": 2, "unit": null }` means 2 eggs.
  - `note`: extra text like `finely chopped` or `to taste`, or `null`.
- **`steps`** are the cooking instructions in order, one text per step. Number them in the
  app; the texts don't include numbers.
- **`photo`** is the recipe's [photo](photos.md#the-photo-object) (`small` and `large`
  URLs, with its size), or `null` when it has none. **`author.photo`** is the author's
  profile photo, or `null`.
- **`author: null`** means a Noomie editorial recipe (the sample recipes). Show it as
  "Noomie" or similar. Nobody can edit or delete it through the API.
- The author only includes public fields. Emails are never included.
- To decide whether to show edit/delete buttons, compare `recipe.author?.id` with the
  signed-in user's `id`. That only decides what to show; the server checks every request.
- **`savedByMe`** is `true` when the signed-in user has [saved](saved-recipes.md) this recipe.
  It's always `false` without a token. It never reveals who else saved a recipe.

### In lists, recipes have no `steps`

Lists (`GET /api/v1/recipes` and the [saved list](saved-recipes.md)) return every field
above **except `steps`**, to keep pages small. Load the full recipe with
`GET /api/v1/recipes/:id` when the user opens it.

### Units

`g`, `kg`, `ml`, `l`, `tsp`, `tbsp`, `cup`, `oz`, `lb`, `pinch`, `clove`, `slice`, `can`,
`bunch`, `handful`

Units are short codes; the app decides how to show them ("2 tbsp", "3 cloves"). More units
may be added later without notice, so show an unknown unit as it is instead of failing.
Renaming or removing one would be a breaking change.

## List recipes: `GET /api/v1/recipes`

| Query      | Meaning                                                           |
| ---------- | ----------------------------------------------------------------- |
| `search`   | Words in the title or description (not case-sensitive), max 100   |
| `cuisine`  | Exact cuisine name, like `Mediterranean` (case-sensitive), max 60 |
| `authorId` | Only recipes by this user (for a [profile](profiles.md) page)     |
| `limit`    | Page size 1–50 (default 20)                                       |
| `cursor`   | `nextCursor` from the previous page                               |

Returns `{ data, nextCursor }`, newest first, with recipes [without `steps`](#in-lists-recipes-have-no-steps).
See [paging](conventions.md#lists-and-paging). An `authorId` that isn't a UUID returns
**400** `authorId must be a UUID`.

## Get one recipe: `GET /api/v1/recipes/:id`

Returns the full recipe, with `steps`.

- **404** `Recipe <id> not found` if it doesn't exist or was deleted.
- **400** `Validation failed (uuid is expected)` if the ID isn't a valid UUID (for example a
  broken deep link).

## Create a recipe: `POST /api/v1/recipes` (signed in)

```json
{
  "title": "Garlic butter noodles",
  "description": "Quick weeknight noodles.",
  "cuisine": "Italian-inspired",
  "minutes": 15,
  "servings": 2,
  "ingredients": [
    { "name": "spaghetti", "quantity": 200, "unit": "g" },
    { "name": "butter", "quantity": 2, "unit": "tbsp" },
    {
      "name": "garlic",
      "quantity": 3,
      "unit": "clove",
      "note": "finely chopped"
    },
    { "name": "eggs", "quantity": 2 },
    { "name": "salt", "note": "to taste" }
  ],
  "steps": [
    "Cook the spaghetti in salted water until just tender.",
    "Melt the butter and cook the garlic gently for 1 minute.",
    "Toss the noodles in the garlic butter and season with salt."
  ]
}
```

| Field         | Rule                                                               |
| ------------- | ------------------------------------------------------------------ |
| `title`       | Required, up to 120 characters                                     |
| `description` | Optional, up to 2,000 characters                                   |
| `cuisine`     | Required, up to 60 characters                                      |
| `minutes`     | Whole number, 1–1440                                               |
| `servings`    | Whole number, 1–100                                                |
| `ingredients` | List of 1–100 ingredients (rules below), kept in the order sent    |
| `steps`       | List of 1–50 non-empty texts, each up to 1,000 characters, trimmed |

Each ingredient:

| Field      | Rule                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------- |
| `name`     | Required, up to 100 characters, trimmed                                                  |
| `quantity` | Optional. A number above 0, up to 100,000, with at most 3 decimals. Required with `unit` |
| `unit`     | Optional. One of the [units](#units)                                                     |
| `note`     | Optional, up to 100 characters, trimmed. An empty note is saved as `null`                |

**Keep `name` to the ingredient itself** (`tomatoes`, not `ripe chopped tomatoes`) and put
the rest in `note` (`ripe, chopped`). [Discover](discover.md#how-matching-works) matches
users' ingredients against `name`, so extra words stop a recipe from being found.

Leave optional fields out or send `null`; both mean "none". Ingredients can't have other
fields.

Returns **201** with the full new recipe. The signed-in user becomes the author
automatically. **Don't send `authorId`**: it's rejected with 400
(`property authorId should not exist`).

## Edit a recipe: `PATCH /api/v1/recipes/:id` (author only)

Send only the fields you change, with the same rules as create:

```json
{ "minutes": 20 }
```

**`ingredients` and `steps` are replaced as a whole.** To change one ingredient, send the
complete new list. Fields you don't send stay as they are.

Returns **200** with the full updated recipe. The author can't be changed.

## Delete a recipe: `DELETE /api/v1/recipes/:id` (author only)

Returns **204** with no body. Afterwards the recipe returns 404.

## Errors for create, edit and delete

| Status | When                                          | Message                                |
| ------ | --------------------------------------------- | -------------------------------------- |
| 401    | Not signed in, or the session ended           | `Sign in to continue`                  |
| 403    | Someone else's recipe, or an editorial recipe | `Only the recipe author can change it` |
| 404    | The recipe doesn't exist                      | `Recipe <id> not found`                |
| 400    | Invalid fields or a malformed ID              | List of field messages                 |

Recipe field messages are meant for developers, not users: check the form in the app before
sending. Problems inside an ingredient name its position in the list, counting from 0:

```json
{
  "message": [
    "servings must not be less than 1",
    "ingredients.0.quantity is required when unit is set",
    "ingredients.1.quantity must be a number above 0 and up to 100000, with at most 3 decimals",
    "ingredients.2.unit must be one of the following values: g, kg, ml, l, tsp, tbsp, cup, oz, lb, pinch, clove, slice, can, bunch, handful",
    "ingredients.3.name should not be empty",
    "steps must contain at least 1 elements"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

Sending ingredients in the old format (a list of texts, like `["water"]`) returns 400
`ingredients.each value in nested property ingredients must be either object or array`.

## Types

```ts
type IngredientUnit =
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'tsp'
  | 'tbsp'
  | 'cup'
  | 'oz'
  | 'lb'
  | 'pinch'
  | 'clove'
  | 'slice'
  | 'can'
  | 'bunch'
  | 'handful';

type Ingredient = {
  name: string;
  quantity: number | null;
  unit: IngredientUnit | (string & {}) | null; // unknown future units stay strings
  note: string | null;
};

/** See photos.md. */
type Photo = { small: string; large: string; width: number; height: number };

/** A recipe in a list (recipe list, saved list). */
type RecipeSummary = {
  id: string;
  title: string;
  description: string | null;
  cuisine: string;
  minutes: number;
  servings: number;
  ingredients: Ingredient[];
  photo: Photo | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; displayName: string; photo: Photo | null } | null;
  savedByMe: boolean;
};

/** One recipe: get, create, edit. */
type Recipe = RecipeSummary & { steps: string[] };

type RecipePage = { data: RecipeSummary[]; nextCursor: string | null };

type IngredientInput = {
  name: string;
  quantity?: number | null;
  unit?: IngredientUnit | null;
  note?: string | null;
};
type RecipeInput = {
  title: string;
  description?: string;
  cuisine: string;
  minutes: number;
  servings: number;
  ingredients: IngredientInput[];
  steps: string[];
};
```
