# API changelog

Newest first. **Breaking** entries say what the app must change.

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
