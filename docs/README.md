# Noomie API docs for frontend developers

How to run the Noomie backend and how the Noomie app should use its API. You don't need to
read the backend code. Examples are based on real API responses.

## Find what you need

| I want to…                                         | Read                                                    |
| -------------------------------------------------- | ------------------------------------------------------- |
| Run the backend on my computer for the first time  | [Run the backend](setup/local-backend.md)               |
| Start, stop, update, or fix the local backend      | [Daily use and troubleshooting](setup/daily-use.md)     |
| Understand errors, paging, limits, and field rules | [API conventions](api/conventions.md)                   |
| Sign users up, in, and out                         | [Authentication](api/authentication.md)                 |
| Show, create, edit, or delete recipes              | [Recipes](api/recipes.md)                               |
| Show a user's profile, or let users edit their own | [Profiles](api/profiles.md)                             |
| Call the API from the Noomie app's code            | [Noomie app integration](app-integration/noomie-app.md) |
| Ask for a new endpoint, or report a bug            | [Working together](team/working-together.md)            |
| See what changed in the API                        | [Changelog](CHANGELOG.md)                               |

New to the project? Read them top to bottom once.

## How these docs are organized

```text
docs/
├── README.md                 ← you are here
├── CHANGELOG.md              API changes, newest first; check after every git pull
├── setup/                    running the backend locally
│   ├── local-backend.md
│   └── daily-use.md
├── api/                      the API contract: endpoints, fields, rules, errors
│   ├── conventions.md        rules shared by every endpoint
│   ├── authentication.md
│   ├── recipes.md
│   ├── profiles.md
│   └── _template.md          template for documenting a new feature
├── app-integration/          how the Noomie app's code should call the API
│   └── noomie-app.md
└── team/                     how the frontend and backend teams work together
    └── working-together.md
```

- **`api/`** describes what the API does. It changes only when the API changes, and every
  change is in the changelog.
- **`app-integration/`** describes the app's code (in the `Noomie` repository). It changes
  when the app changes.

## All endpoints

| Method | Path                       | Who         | Reference                                      |
| ------ | -------------------------- | ----------- | ---------------------------------------------- |
| GET    | `/api/health`              | Anyone      | [Conventions](api/conventions.md#health-check) |
| POST   | `/api/v1/auth/register`    | Anyone      | [Authentication](api/authentication.md)        |
| POST   | `/api/v1/auth/login`       | Anyone      | [Authentication](api/authentication.md)        |
| GET    | `/api/v1/auth/me`          | Signed in   | [Authentication](api/authentication.md)        |
| POST   | `/api/v1/auth/logout`      | Signed in   | [Authentication](api/authentication.md)        |
| GET    | `/api/v1/recipes`          | Anyone      | [Recipes](api/recipes.md)                      |
| GET    | `/api/v1/recipes/:id`      | Anyone      | [Recipes](api/recipes.md)                      |
| POST   | `/api/v1/recipes`          | Signed in   | [Recipes](api/recipes.md)                      |
| PATCH  | `/api/v1/recipes/:id`      | Author only | [Recipes](api/recipes.md)                      |
| DELETE | `/api/v1/recipes/:id`      | Author only | [Recipes](api/recipes.md)                      |
| GET    | `/api/v1/profiles/:userId` | Anyone      | [Profiles](api/profiles.md)                    |
| GET    | `/api/v1/profiles/me`      | Signed in   | [Profiles](api/profiles.md)                    |
| PATCH  | `/api/v1/profiles/me`      | Signed in   | [Profiles](api/profiles.md)                    |

Locally the API runs at `http://localhost:3000`.

## Keeping these docs correct

The backend team updates these docs in the same change as the code. Every new or changed
endpoint, field, rule, error, or permission needs:

1. Its page in `api/`. For a new feature, copy [`api/_template.md`](api/_template.md) to
   `api/<feature>.md` and fill it in with real responses.
2. Its row in the endpoint table above.
3. A dated [changelog](CHANGELOG.md) entry, marked **breaking** if the app must change.
4. Updates to [app integration](app-integration/noomie-app.md) or [setup](setup/local-backend.md)
   pages when the app's code or the local setup is affected.

This is checked automatically. `npm run docs:check` fails when a route in the code is missing
from this table or from `api/`, when the docs list a route that no longer exists, or when a
link breaks. On GitHub, the **Docs** workflow runs it on every push and pull request, and also
fails when API code changes without a changelog entry. Internal changes with no API effect
put `[no-docs]` in a commit message. The pull request template has the same checklist.

If something here doesn't match what the API does, that's a bug; report it as described in
[working together](team/working-together.md#reporting-a-backend-bug).
