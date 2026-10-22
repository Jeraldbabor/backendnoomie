# Recipes

Anyone can read recipes. Signed-in users can create recipes, and only a recipe's **author**
can edit or delete it. Signed-in users can also [save recipes](saved-recipes.md).

How to call these from the Noomie app: [app integration](../app-integration/noomie-app.md#adding-a-feature-api-module).

## Endpoints

| Method | Path                  | Who    | Success |
| ------ | --------------------- | ------ | ------- |
| GET    | `/api/v1/recipes`     | Anyone | 200     |
| GET    | `/api/v1/recipes/:id` | Anyone | 200     |

The two read endpoints work without a token. **Send the token when the user is signed in**:
then `savedByMe` is filled in for them. A token that is sent but invalid or expired gets
**401** `Sign in to continue` (it isn't silently ignored), so treat it like any other 401.
| POST | `/api/v1/recipes` | Signed in | 201 |
| PATCH | `/api/v1/recipes/:id` | Author only | 200 |
| DELETE | `/api/v1/recipes/:id` | Author only | 204 |

## The recipe object

```json
{
  "id": "01a16214-1d2e-75fd-bb37-dee6d1888e4f",
  "title": "Garlic noodles",
  "description": "Quick weeknight noodles.",
  "cuisine": "Italian-inspired",
  "minutes": 15,
  "ingredients": ["noodles", "garlic", "butter"],
  "createdAt": "2026-10-22T05:27:27.790Z",
  "updatedAt": "2026-10-22T05:27:27.790Z",
  "author": {
    "id": "01a16214-16ed-71e7-8d20-534458198445",
    "displayName": "Ada"
  },
  "savedByMe": false
}
```

- **`author: null`** means a Noomie editorial recipe (the sample recipes). Show it as
  "Noomie" or similar. Nobody can edit or delete it through the API.
- The author only includes public fields. Emails are never included.
- To decide whether to show edit/delete buttons, compare `recipe.author?.id` with the
  signed-in user's `id`. That only decides what to show; the server checks every request.
- **`savedByMe`** is `true` when the signed-in user has [saved](saved-recipes.md) this recipe.
  It's always `false` without a token. It never reveals who else saved a recipe.

## List recipes: `GET /api/v1/recipes`

| Query      | Meaning                                                           |
| ---------- | ----------------------------------------------------------------- |
| `search`   | Words in the title or description (not case-sensitive), max 100   |
| `cuisine`  | Exact cuisine name, like `Mediterranean` (case-sensitive), max 60 |
| `authorId` | Only recipes by this user (for a [profile](profiles.md) page)     |
| `limit`    | Page size 1–50 (default 20)                                       |
| `cursor`   | `nextCursor` from the previous page                               |

Returns `{ data, nextCursor }`, newest first. See [paging](conventions.md#lists-and-paging).
An `authorId` that isn't a UUID returns **400** `authorId must be a UUID`.

## Get one recipe: `GET /api/v1/recipes/:id`

- **404** `Recipe <id> not found` if it doesn't exist or was deleted.
- **400** `Validation failed (uuid is expected)` if the ID isn't a valid UUID (for example a
  broken deep link).

## Create a recipe: `POST /api/v1/recipes` (signed in)

```json
{
  "title": "Garlic noodles",
  "description": "Quick weeknight noodles.",
  "cuisine": "Italian-inspired",
  "minutes": 15,
  "ingredients": ["noodles", "garlic", "butter"]
}
```

| Field         | Rule                                                     |
| ------------- | -------------------------------------------------------- |
| `title`       | Required, up to 120 characters                           |
| `description` | Optional, up to 2,000 characters                         |
| `cuisine`     | Required, up to 60 characters                            |
| `minutes`     | Whole number, 1–1440                                     |
| `ingredients` | List of 1–100 non-empty texts, each up to 100 characters |

Returns **201** with the new recipe. The signed-in user becomes the author automatically.
**Don't send `authorId`**: it's rejected with 400 (`property authorId should not exist`).

## Edit a recipe: `PATCH /api/v1/recipes/:id` (author only)

Send only the fields you change, with the same rules as create:

```json
{ "minutes": 20 }
```

Returns **200** with the updated recipe. The author can't be changed.

## Delete a recipe: `DELETE /api/v1/recipes/:id` (author only)

Returns **204** with no body. Afterwards the recipe returns 404.

## Errors for create, edit and delete

| Status | When                                          | Message                                |
| ------ | --------------------------------------------- | -------------------------------------- |
| 401    | Not signed in, or the session ended           | `Sign in to continue`                  |
| 403    | Someone else's recipe, or an editorial recipe | `Only the recipe author can change it` |
| 404    | The recipe doesn't exist                      | `Recipe <id> not found`                |
| 400    | Invalid fields or a malformed ID              | List of field messages                 |

## Types

```ts
type Recipe = {
  id: string;
  title: string;
  description: string | null;
  cuisine: string;
  minutes: number;
  ingredients: string[];
  createdAt: string;
  updatedAt: string;
  author: { id: string; displayName: string } | null;
  savedByMe: boolean;
};
type RecipePage = { data: Recipe[]; nextCursor: string | null };
type RecipeInput = {
  title: string;
  description?: string;
  cuisine: string;
  minutes: number;
  ingredients: string[];
};
```
