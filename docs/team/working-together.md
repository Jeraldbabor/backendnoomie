# Working together: frontend and backend

## Who owns what

| Repository      | Owned by      | Contains                                                |
| --------------- | ------------- | ------------------------------------------------------- |
| `Noomie`        | Frontend team | Expo app: screens, navigation, API client, app docs     |
| `backendnoomie` | Backend team  | API, database schema and migrations, Docker, these docs |

Each team changes only its own repository. If the app needs something from the API, ask the
backend team (below) instead of changing backend code, database rows, or Docker files.

## Asking for a new endpoint or field

Open a GitHub issue in `backendnoomie` and include:

1. **The screen or user story.** For example: "Profile screen shows the user's recipes."
2. **The data you need.** Field names, types, and which can be empty.
3. **Who can do it.** Anyone, signed-in users, or only the owner.
4. **Lists.** Expected size, sorting, filters, and whether you need paging.
5. **An example response**, if you already have one in mind.

We agree on the request and response shape first, written into these docs. Then both teams
can work at the same time: you build against the agreed types (with mock data if needed),
and the backend builds the endpoint.

## How the API changes

- **Non-breaking changes ship anytime:** new endpoints, new optional request fields, new
  response fields. Your code should ignore response fields it doesn't know.
- **Breaking changes are announced first** in the [changelog](../CHANGELOG.md), with what the app
  must change: removing or renaming fields, changing types, new required fields, or stricter
  access rules. We agree on timing before merging.
- Large breaking changes get a new version path (`/api/v2`) next to `/api/v1` for a while,
  so the app can move over.
- Every change to an endpoint updates these docs in the same pull request.

After `git pull` in `backendnoomie`, check the [changelog](../CHANGELOG.md) and run
`docker compose up -d --build`.

## Reporting a backend bug

Include:

- Method and path, for example `PATCH /api/v1/recipes/<id>`.
- The request body. **Remove passwords and tokens.**
- The status code and response body you got, and what you expected.
- The time it happened, and the API logs from around then:

  ```bash
  docker compose logs --since 10m api
  ```

A 500 error is always a backend bug. Please report it.

## Do and don't

- **Do** decide behavior from the status code, not from the message text.
- **Do** send only documented fields; extra fields return 400.
- **Do** treat 401 as "signed out" everywhere.
- **Don't** hide or disable buttons as the only protection; the server checks every request.
- **Don't** put tokens or passwords in logs, URLs, analytics, or bug reports.
- **Don't** edit database rows by hand to test app behavior; use the API.
