# Using the API from the Noomie app

How the Noomie Expo app talks to this API, and the pattern to follow for new features.
The API itself is described in [the API reference](../api/conventions.md). This page is
about the app's code, which lives in the `Noomie` repository and is owned by the frontend
team; file paths below are relative to that repository.

Checked against the app's code on 2026-10-22. If the app changes, update this page.

## Where things live in the app

| File                                     | What it does                                              |
| ---------------------------------------- | --------------------------------------------------------- |
| `src/api/config.ts`                      | Decides the API base URL                                  |
| `src/api/client.ts`                      | `apiRequest()`: JSON, bearer token, 15-second timeout     |
| `src/api/errors.ts`                      | `ApiError` and `toApiError()`: turns failures into kinds  |
| `src/features/auth/api.ts`               | The auth endpoints, built on `apiRequest()`               |
| `src/features/auth/session-provider.tsx` | `SessionProvider` / `useSession()`: the signed-in session |
| `src/features/auth/types.ts`             | `User`, `AuthResponse` types                              |

## Base URL

- **Development:** nothing to configure. The app calls `/api/v1` on the Expo dev server it
  was loaded from, and the app's `metro.config.js` forwards everything under `/api` to the
  backend at `127.0.0.1:3000`. This works the same over Wi-Fi, `npm run tunnel`, and web.
- **Another backend:** set `EXPO_PUBLIC_API_URL` (including `/api/v1`) in the app's
  `.env.local`.
- **Backend on another port:** start the app with
  `NOOMIE_API_PROXY_TARGET=http://127.0.0.1:<port>`.

## Making requests

Always go through `apiRequest()`; don't call `fetch` directly from screens.

```ts
apiRequest<T>(path: string, options?: {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;          // sent as JSON
  token?: string | null;   // adds Authorization: Bearer <token>
}): Promise<T>
```

It throws an `ApiError` for every failure, including network errors and timeouts.

## Authentication in the app

- `SessionProvider` stores the token and user (SecureStore on phones, `localStorage` on web),
  checks `/auth/me` when the app opens, and signs out on a 401.
- Screens use `useSession()`, which gives `status`, `user`, `signIn`, `signUp`, and `signOut`.
- **The token isn't available to other features yet.** Before building screens that create
  or edit recipes, add a small helper to the auth feature, for example
  `useAuthenticatedRequest()`, that calls `apiRequest()` with the current token and signs out
  on a 401. Other features should use that helper instead of reading storage.
- Web keeps the token in `localStorage` for now; that must move to cookies before a public
  website launches.

## Errors in the app

`toApiError()` maps HTTP status codes to `ApiError.kind`:

| Status | Kind             |
| ------ | ---------------- |
| 400    | `validation`     |
| 401    | `authentication` |
| 409    | `conflict`       |
| 429    | `quota`          |
| other  | `unexpected`     |

Network failures and timeouts become `network`. **403 and 404 currently fall into
`unexpected`.** Add `forbidden` and `not-found` kinds when you build recipe screens, so they
can show "you can't edit this" and "this recipe was deleted" instead of a generic error.

## Adding a feature API module

Follow the auth feature: one `api.ts` per feature, built on `apiRequest()`, with the
feature's types in its own `types.ts` (copy them from the API reference, for example
[recipe types](../api/recipes.md#types)). A sketch for recipes:

```ts
// src/features/recipes/api.ts
import { apiRequest } from '@/api/client';
import type { Recipe, RecipeInput, RecipePage } from '@/features/recipes/types';

const query = (params: Record<string, string | number | undefined>) =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');

export const recipesApi = {
  // Pass the token when signed in, so savedByMe is filled in.
  list: (
    params: {
      search?: string;
      cuisine?: string;
      authorId?: string;
      limit?: number;
      cursor?: string;
    },
    token?: string | null,
  ) => apiRequest<RecipePage>(`/recipes?${query(params)}`, { token }),
  get: (id: string, token?: string | null) =>
    apiRequest<Recipe>(`/recipes/${id}`, { token }),
  create: (input: RecipeInput, token: string) =>
    apiRequest<Recipe>('/recipes', { method: 'POST', body: input, token }),
  update: (id: string, input: Partial<RecipeInput>, token: string) =>
    apiRequest<Recipe>(`/recipes/${id}`, {
      method: 'PATCH',
      body: input,
      token,
    }),
  remove: (id: string, token: string) =>
    apiRequest<void>(`/recipes/${id}`, { method: 'DELETE', token }),
};
```

Screens then call `recipesApi`, and handle loading, empty, error, and success states.

- **List screens get `RecipeSummary` items** (no `steps`). The recipe screen calls
  `recipesApi.get(id)` for the full `Recipe` with its steps.
- **The app's preview recipes** (`src/features/preview/recipes.ts`) still use the old shape,
  with `ingredients` as plain texts. When a screen switches to the API, show
  `ingredient.name` where it showed the text, and build the line from `quantity`, `unit` and
  `note` (for example "200 g spaghetti", "salt, to taste").
- **Editing ingredients or steps** sends the whole list, even when one line changed; see
  [edit a recipe](../api/recipes.md#edit-a-recipe-patch-apiv1recipesid-author-only).

## Profiles in the app

The [profiles API](../api/profiles.md) fits the same pattern, in `src/features/profiles/api.ts`:

```ts
export const profilesApi = {
  get: (userId: string) => apiRequest<Profile>(`/profiles/${userId}`),
  getMine: (token: string) => apiRequest<Profile>('/profiles/me', { token }),
  updateMine: (input: ProfileUpdate, token: string) =>
    apiRequest<Profile>('/profiles/me', {
      method: 'PATCH',
      body: input,
      token,
    }),
};
```

- **A user's recipes:** `recipesApi.list({ authorId: profile.id })`.
- **Recipe author links:** `recipe.author.id` is the profile's `userId`. Editorial recipes
  (`author: null`) have no profile to link to.
- **After editing a profile,** the user stored by `SessionProvider` still has the old
  `displayName` (the account panel shows it). Refresh it with `GET /api/v1/auth/me`, or
  update the stored user from the `PATCH` response. That needs a small addition to the auth
  feature, like the token helper above.

## Saved recipes in the app

The [saved recipes API](../api/saved-recipes.md), in `src/features/saved-recipes/api.ts`:

```ts
export const savedRecipesApi = {
  list: (params: { limit?: number; cursor?: string }, token: string) =>
    apiRequest<SavedRecipePage>(`/saved-recipes?${query(params)}`, { token }),
  save: (recipeId: string, token: string) =>
    apiRequest<void>(`/saved-recipes/${recipeId}`, { method: 'PUT', token }),
  unsave: (recipeId: string, token: string) =>
    apiRequest<void>(`/saved-recipes/${recipeId}`, { method: 'DELETE', token }),
};
```

- **Bookmark buttons:** read `recipe.savedByMe` from recipe responses, which needs the token
  on recipe reads (see `recipesApi` above). Then call `save` or `unsave`. Both are safe
  to repeat, so a double tap or a retry can't break anything.
- **Update the UI right away** and roll back if the request fails; then refresh the Saved
  screen when it opens, so recipes deleted by their authors drop out.
- **A 401 from a recipe read** now means the stored token is no longer valid. Sign out as
  with any other 401.

## Discover in the app

The [Discover API](../api/discover.md), in `src/features/discover/api.ts`:

```ts
export const discoverApi = {
  // Pass the token when signed in, so savedByMe is filled in.
  recipes: (
    params: {
      ingredients: string[];
      cuisine?: string;
      maxMinutes?: number;
      maxMissing?: number;
      limit?: number;
    },
    token?: string | null,
  ) =>
    apiRequest<DiscoverResult>(
      `/discover/recipes?${query({ ...params, ingredients: params.ingredients.join(',') })}`,
      { token },
    ),
};
```

`query()` is the helper from the recipes sketch above; it URL-encodes each value.

- **Collect ingredients as chips** (one per name), and don't send a request until there is
  at least one. A name containing a comma would be split in two, so remove commas from chips.
- **Show `match.missing`** under each result ("Missing: basil"), and a "Ready to cook" badge
  when it's empty. A "Can cook now" filter is `maxMissing: 0`.
- **Results are one page.** There is no `nextCursor`; show the list as it comes.
- **Opening a result** loads the full recipe with `recipesApi.get(id)` for its steps.
- **Avoid a request per keystroke:** search when a chip is added or removed, not while typing.
- `{ data: [] }` is a normal empty state ("No recipes use these yet"), not an error.

## Account settings in the app

The [account settings endpoints](../api/authentication.md#account-settings) belong in the
existing `authApi` in `src/features/auth/api.ts`:

```ts
export const authApi = {
  // ...register, login, me, logout as today
  logoutAll: (token: string) =>
    apiRequest<void>('/auth/logout-all', { method: 'POST', token }),
  changePassword: (
    input: { currentPassword: string; newPassword: string },
    token: string,
  ) =>
    apiRequest<void>('/auth/change-password', {
      method: 'POST',
      body: input,
      token,
    }),
  deleteAccount: (password: string, token: string) =>
    apiRequest<void>('/auth/delete-account', {
      method: 'POST',
      body: { password },
      token,
    }),
};
```

- **A wrong password comes back as 400**, so `toApiError()` gives `validation`, and the
  session isn't touched. Show the message under the password field.
- **After change password,** keep the stored token and user; this device stays signed in.
  Tell the user their other devices were signed out.
- **After sign out everywhere or delete account,** the token is already dead on the server.
  Call `signOut()` from `useSession()`: it clears the local session first, and the
  `/auth/logout` call it makes afterwards gets a 401 that it already ignores.
- **Delete account** needs a confirmation step that says what will be deleted (the account,
  the saved list, and every recipe the user wrote) and asks for the password.
- These screens need the token, like other signed-in features; use the token helper
  described in [authentication in the app](#authentication-in-the-app).
