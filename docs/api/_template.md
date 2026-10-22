# Feature name

<!--
Template for documenting a new feature's endpoints. Copy it to docs/api/<feature>.md,
replace every placeholder, and delete this comment. Then:
  1. add the endpoints to the table in docs/README.md,
  2. add a dated entry to docs/CHANGELOG.md (mark it **breaking** if the app must change),
  3. use real responses from the running API for the examples.
-->

One or two sentences: what this feature is, and who can do what.

## Endpoints

| Method | Path                | Who                             | Success |
| ------ | ------------------- | ------------------------------- | ------- |
| GET    | `/api/v1/<feature>` | Anyone / Signed in / Owner only | 200     |

## The object

```json
{ "id": "…" }
```

- Explain fields that aren't obvious, especially ones that can be `null` and what that means.
- Say which fields are private and never returned.

## Endpoint name: `METHOD /api/v1/<feature>/...`

Request body (or query parameters):

```json
{}
```

| Field   | Rule                      |
| ------- | ------------------------- |
| `field` | Required/optional, limits |

What it returns, and its status code.

## Errors

| Status | When          | Message               |
| ------ | ------------- | --------------------- |
| 401    | Not signed in | `Sign in to continue` |

## Types

```ts
type Thing = { id: string };
```
