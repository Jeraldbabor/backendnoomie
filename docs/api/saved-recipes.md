# Saved recipes

Signed-in users can save (bookmark) recipes and see them in their own saved list. A saved
recipe is a reference to the original, never a copy: it always shows the author's current
version and keeps the author's credit. Nobody can see another user's saved list.

How to call these from the Noomie app: [app integration](../app-integration/noomie-app.md#saved-recipes-in-the-app).

## Endpoints

| Method | Path                              | Who       | Success |
| ------ | --------------------------------- | --------- | ------- |
| GET    | `/api/v1/saved-recipes`           | Signed in | 200     |
| PUT    | `/api/v1/saved-recipes/:recipeId` | Signed in | 204     |
| DELETE | `/api/v1/saved-recipes/:recipeId` | Signed in | 204     |

To show a bookmark icon on any recipe, use its `savedByMe` field instead of loading the saved
list (see [recipes](recipes.md#the-recipe-object)).

## The saved item

```json
{
  "savedAt": "2026-10-22T06:39:52.122Z",
  "recipe": {
    "id": "01a16256-66af-74b2-8439-ee357145228c",
    "title": "Garlic noodles",
    "description": "Quick weeknight noodles.",
    "cuisine": "Italian-inspired",
    "minutes": 15,
    "ingredients": ["noodles", "garlic", "butter"],
    "createdAt": "2026-10-22T06:39:51.983Z",
    "updatedAt": "2026-10-22T06:39:51.983Z",
    "author": {
      "id": "01a16256-634f-748f-8c41-41208260aced",
      "displayName": "Ada"
    },
    "savedByMe": true
  }
}
```

- `savedAt` is when the user saved it.
- `recipe` is the normal [recipe object](recipes.md#the-recipe-object), always with
  `savedByMe: true`. Editorial recipes (`author: null`) can be saved too.

## Your saved list: `GET /api/v1/saved-recipes` (signed in)

Returns **200** with `{ data, nextCursor }`, most recently saved first. Use `?limit=` (1–50,
default 20) and `?cursor=` the same way as other lists; see [paging](conventions.md#lists-and-paging).

```json
{ "data": [{ "savedAt": "…", "recipe": { "id": "…" } }], "nextCursor": null }
```

## Save a recipe: `PUT /api/v1/saved-recipes/:recipeId` (signed in)

No body. Returns **204**. Saving a recipe that's already saved also returns **204** and keeps
the original `savedAt`, so it's safe to call on every bookmark tap.

- **404** `Recipe <id> not found` if the recipe doesn't exist.
- **400** `Validation failed (uuid is expected)` if the ID isn't a valid UUID.

## Unsave a recipe: `DELETE /api/v1/saved-recipes/:recipeId` (signed in)

No body. Returns **204**, also when the recipe wasn't saved, or doesn't exist anymore.

## When a recipe is deleted

If the author deletes a recipe, or [deletes their account](authentication.md#delete-account-post-apiv1authdelete-account-signed-in),
it disappears from everyone's saved list. There is no "deleted recipe" placeholder.

## Errors

| Status | When                                   | Message                                |
| ------ | -------------------------------------- | -------------------------------------- |
| 401    | No valid session                       | `Sign in to continue`                  |
| 404    | Saving a recipe that doesn't exist     | `Recipe <id> not found`                |
| 400    | A malformed recipe ID or paging values | `Validation failed (uuid is expected)` |

## Types

```ts
type SavedRecipe = { savedAt: string; recipe: Recipe }; // Recipe: see recipes.md
type SavedRecipePage = { data: SavedRecipe[]; nextCursor: string | null };
```
