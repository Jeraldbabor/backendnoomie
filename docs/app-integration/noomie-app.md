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
  list: (params: {
    search?: string;
    cuisine?: string;
    authorId?: string;
    limit?: number;
    cursor?: string;
  }) => apiRequest<RecipePage>(`/recipes?${query(params)}`),
  get: (id: string) => apiRequest<Recipe>(`/recipes/${id}`),
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
