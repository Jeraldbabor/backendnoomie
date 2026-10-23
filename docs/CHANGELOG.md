# API changelog

Newest first. **Breaking** entries say what the app must change.

## 2026-10-23: Photos (not breaking)

- New: `PUT` and `DELETE /api/v1/recipes/:id/photo` (author only), and `PUT` and
  `DELETE /api/v1/profiles/me/photo` (signed in). Uploads are `multipart/form-data` with
  one JPEG, PNG or WebP file in the field `photo`, up to 10 MB. HEIC must be converted to
  JPEG in the app first.
- The server resizes photos, stores them as WebP, and **removes their metadata, including
  location**. Profile photos are cropped square.
- New fields: recipes have `photo`, recipe authors have `author.photo`, and profiles have
  `photo`. Each is `{ small, large, width, height }` or `null`. `small` and `large` are URL
  paths on the API: resolve them against the API URL.
- New: `GET /api/v1/images/:id/:size` serves the files (public, cached forever, not
  rate-limited).
- Photos are deleted when replaced or removed, with their recipe, and with their owner's
  account.

**Setup:** the backend now runs a fourth container, `storage` (image files). Run
`docker compose up -d --build` as usual after pulling; your `.env` needs no changes for
Docker. Backend developers who run `npm run start:dev` need the new `STORAGE_*` lines from
`.env.example` in their `.env`, and `npm run docker:db` now also starts the storage.

**What the app can do:** show recipe and profile photos, and let users add them. Nothing
existing changed. Details: [photos](api/photos.md), and
[photos in the app](app-integration/noomie-app.md#photos-in-the-app).

## 2026-10-23: Discover by ingredients (not breaking)

- New: `GET /api/v1/discover/recipes?ingredients=pasta,tomato,garlic` (anyone; send the
  token for `savedByMe`). Returns recipes that use the user's ingredients, fewest missing
  first, each with `match: { have, needed, missing }`.
- Filters: `cuisine`, `maxMinutes`, and `maxMissing` (`0` = can cook now). Results are one
  ranked page (`limit` up to 50), without `nextCursor`.
- Matching ignores case, accents, punctuation and plural endings. Ingredients without a
  quantity ("salt, to taste") are optional and never count as missing.
- The sample recipes' `white miso` is now `miso` with the note `white`, so it matches. Run
  `docker compose run --rm migrate npx prisma db seed` to refresh them.

**What the app can do:** add a "What can I cook?" screen where users enter what they have.
Nothing existing changed. Details: [discover](api/discover.md).

## 2026-10-23: Complete recipes (breaking for recipe create and edit, and recipe types)

- Recipes have two new fields: `servings` (how many portions) and `steps` (the cooking
  instructions, in order).
- **`ingredients` changed from a list of texts to a list of objects**:
  `{ name, quantity, unit, note }`. `quantity` is a number or `null`, `unit` is one of a
  fixed list of [units](api/recipes.md#units) or `null`, and `note` is text or `null`.
- `POST /api/v1/recipes` now **requires** `servings` (1–100), `steps` (1–50) and the new
  ingredient objects. The old list of texts is rejected with 400. `PATCH` accepts the same
  fields and replaces `ingredients` and `steps` as a whole.
- **Lists no longer include `steps`**: `GET /api/v1/recipes` and the saved list return
  recipes without them, to keep pages small. `GET /api/v1/recipes/:id`, create and edit
  return the full recipe.
- Existing recipes in your local database were converted: each old ingredient text became an
  ingredient name, with 1 serving and no steps. Run
  `docker compose run --rm migrate npx prisma db seed` to refresh the sample recipes with
  full content; it no longer skips when recipes exist, and it never touches users' recipes.

**What the app must change:** use the new `Ingredient`, `RecipeSummary` and `Recipe` types
from [recipes](api/recipes.md#types); send `servings`, `steps` and ingredient objects when
creating recipes; load `GET /api/v1/recipes/:id` for a recipe's steps. The app doesn't call
recipe endpoints yet (its recipes are local previews), so nothing in it breaks today.

## 2026-10-22: Account settings (not breaking)

- New: `POST /api/v1/auth/change-password`. Needs the current password. The device that
  changes it stays signed in; every other device is signed out.
- New: `POST /api/v1/auth/logout-all` signs out every device, including the current one.
- New: `POST /api/v1/auth/delete-account`. Needs the password. Permanently deletes the
  account, its sessions and saved list, and every recipe the user wrote (which also leaves
  other users' saved lists). The email can be registered again.
- A wrong password on these endpoints returns **400**, not 401, so the app doesn't sign the
  user out.
- These endpoints share the auth rate limit: 10 requests per minute.

**What the app can do:** add an account settings screen. After sign out everywhere or
delete account, clear the local session. Nothing existing changed. Details:
[account settings](api/authentication.md#account-settings).

## 2026-10-22: Saved recipes (not breaking; one read-endpoint change to note)

- New: `GET /api/v1/saved-recipes`, `PUT` and `DELETE /api/v1/saved-recipes/:recipeId`
  (signed in). Saving and unsaving are safe to repeat. Saved items reference the live
  original recipe; a recipe deleted by its author disappears from everyone's saved list.
- Recipe responses have a new field: `savedByMe` (`false` without a token).
- `GET /api/v1/recipes` and `GET /api/v1/recipes/:id` now read the token when one is sent.
  An **invalid or expired token on these reads now returns 401**; before, it was ignored.
  Requests without a token are unchanged.

**What the app can do:** send the session token on recipe reads to get `savedByMe`, show a
bookmark button, and add a Saved screen. If the app sends a token on recipe reads, handle
401 there like on any signed-in request. Details: [saved recipes](api/saved-recipes.md).

## 2026-10-22: Profiles (not breaking)

- New: `GET /api/v1/profiles/:userId` (anyone), and `GET` / `PATCH /api/v1/profiles/me`
  (signed in). A profile has `id`, `displayName`, `bio`, `createdAt`, and `recipeCount`,
  and never includes email.
- Users can now change their display name and add a bio (up to 160 characters).
- New filter: `GET /api/v1/recipes?authorId=<userId>` lists one user's recipes.

**What the app can do:** link recipe authors (`author.id`) to their profile, add a Profile
screen, and let users edit their name and bio. Nothing existing changed. Details:
[profiles](api/profiles.md).

## 2026-10-22: Recipe authors (breaking for recipe create, edit and delete)

- `POST /api/v1/recipes` now requires sign-in (401 without a token). The signed-in user
  becomes the recipe's author.
- `PATCH` and `DELETE /api/v1/recipes/:id` are now for the author only. Others get 403,
  and editorial recipes (no author) can't be changed by anyone.
- Recipe responses have a new field: `author: { id, displayName } | null`.
- Sending `authorId` in a request body is rejected with 400.

**What the app must change:** send the session token when creating, editing or deleting
recipes; handle 401 and 403; show the author (or "Noomie" when `author` is `null`).
Reading recipes is unchanged. The app didn't call recipe endpoints yet, so nothing in it
breaks today. Details: [recipes](api/recipes.md).

## 2026-10-21: Accounts and sign-in

- New: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`.
- Session tokens last 30 days and can be revoked by signing out.
- Rate limits: 10 requests per minute for sign-in and registration, 120 for everything else.

Details: [authentication](api/authentication.md).

## 2026-10-21: First version

- `GET /api/health`.
- Recipes: list (search, cuisine filter, cursor paging), get, create, edit, delete. At this
  point anyone could create, edit or delete recipes; that changed on 2026-10-22.
