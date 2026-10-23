# API conventions

Rules that apply to every endpoint. Feature pages ([authentication](authentication.md),
[recipes](recipes.md)) only describe what's specific to them.

## Base URL and versions

- Feature endpoints live under **`/api/v1`**, for example `/api/v1/recipes`.
- Locally the API runs at `http://localhost:3000`.

## Health check

`GET /api/health` needs no sign-in and has no version. It returns **200**
`{ "status": "ok", "database": "up" }` when the API and its database work, and **503** when
the database is unreachable. It isn't rate-limited.

## Requests

- Send and receive **JSON**. Set `Content-Type: application/json` when there is a body.
  Photo uploads are the exception: they send `multipart/form-data` (see [photos](photos.md)).
- Signed-in requests send `Authorization: Bearer <token>`. See [authentication](authentication.md).
  Some public endpoints (recipe reads, Discover) also accept a token to personalize the response; if
  you send one there, it must be valid, or you get 401.
- **Only send the fields an endpoint documents.** Unknown fields are rejected with 400
  (`property X should not exist`). This is on purpose: for example, nobody can set a
  recipe's author by sending `authorId`.
- Names, titles, descriptions, cuisines, search text, recipe steps, and ingredient names and
  notes are trimmed by the server. Emails are trimmed and lowercased. Passwords are kept
  exactly as sent.

## Responses

- IDs are UUID strings (version 7, so newer items have larger IDs). Treat them as opaque.
- Dates are ISO 8601 strings in UTC, like `"2026-10-22T05:27:27.790Z"`.
- Optional values come back as `null`, not missing (for example `description: null`).
- A successful delete or logout returns **204** with no body.
- New response fields can be added at any time; ignore the ones you don't use. Removing or
  renaming a field is a breaking change, announced in the [changelog](../CHANGELOG.md) first.

## Errors

Every error has the same shape:

```json
{
  "message": "Only the recipe author can change it",
  "error": "Forbidden",
  "statusCode": 403
}
```

For validation errors (400), `message` is a **list** of all problems:

```json
{
  "message": [
    "Enter a valid email address",
    "Password must be at least 8 characters",
    "Enter your name"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

Decide what to do from the **status code**, not the message text. Show `message` to users
only where a feature page says it's user-friendly (validation, login, duplicate email).

| Status | Meaning                                                                | What the app should do                                                                           |
| ------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 400    | Invalid input, malformed ID, or a wrong password on an account setting | Show the field messages; fix the request                                                         |
| 401    | Not signed in, or the session ended                                    | Clear the stored session and go to sign-in                                                       |
| 403    | Signed in, but not allowed                                             | Explain the user can't do this; don't retry                                                      |
| 404    | Doesn't exist (or was deleted)                                         | Show a "not found" state                                                                         |
| 409    | Conflict, like an email already used                                   | Show the message                                                                                 |
| 429    | Too many requests                                                      | Ask the user to wait a minute; don't auto-retry                                                  |
| 500    | Server problem                                                         | Generic "something went wrong"; [report it](../team/working-together.md#reporting-a-backend-bug) |

## Lists and paging

List endpoints use **cursor paging**:

```json
{ "data": [], "nextCursor": "01a16214-1d2e-75fd-bb37-dee6d1888e4f" }
```

- Ask for a page size with `?limit=` (1–50, default 20).
- For the next page, send `?cursor=<nextCursor>` with the same filters.
- `nextCursor: null` means there are no more pages.
- Items are newest first. New items added while scrolling don't cause duplicates.

[Discover](discover.md) is the exception: its results are ranked by how well they match, so
it returns one page of the best matches (`{ data }`, no `nextCursor`).

## Rate limits

- Sign-in and registration: **10 requests per minute** per device (IP) and endpoint.
- Photo uploads: **20 per minute**. Image files (`/api/v1/images/...`) aren't limited.
- Everything else: **120 requests per minute**.
- Over the limit you get **429**. Don't retry in a loop; wait and let the user try again.

## Not available yet

Password reset (forgot password), email verification, and changing email. To request one, see
[working together](../team/working-together.md#asking-for-a-new-endpoint-or-field).
