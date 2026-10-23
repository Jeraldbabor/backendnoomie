# Noomie backend

REST API for the Noomie app.

- **NestJS 12** (ESM, TypeScript strict) with a feature-based module layout
- **PostgreSQL 18** in Docker
- **Prisma 7** ORM (`prisma-client` generator + `@prisma/adapter-pg` driver adapter)
- Email + password auth with revocable sessions (scrypt hashes, bearer tokens)
- Validation with `class-validator`, Swagger docs, Helmet, rate limiting, URI versioning
- Vitest unit and e2e tests, oxlint, Prettier

**Frontend developers:** start with the [API guide in `docs/`](docs/README.md). It covers
running the backend with Docker, every endpoint, errors, and how API changes are announced.

**Backend developers:** every API change updates `docs/` in the same change (see
[keeping the docs correct](docs/README.md#keeping-these-docs-correct)). `npm run docs:check`
and the **Docs** GitHub workflow enforce it.

## Project structure

```
backendnoomie/
├── prisma/
│   ├── schema.prisma          # data models
│   ├── migrations/            # versioned SQL migrations (commit these)
│   └── seed.ts                # development seed data
├── prisma7.config.ts          # Prisma CLI config (schema path, migrations, seed, DB URL)
├── src/
│   ├── main.ts                # bootstrap
│   ├── app.module.ts          # root module: config, database, features, global pipe/filter
│   ├── app.setup.ts           # prefix, versioning, CORS, Swagger, Helmet (shared with e2e)
│   ├── config/                # environment validation
│   ├── database/              # PrismaModule (global) + PrismaService
│   ├── common/                # cross-feature building blocks: DTOs, filters, transforms
│   ├── features/              # one folder per business feature
│   │   ├── auth/              # sign-in, sessions, account settings; SessionAuthGuard
│   │   ├── health/
│   │   ├── profiles/          # public profiles; edit your own via /profiles/me
│   │   ├── saved-recipes/     # each user's private bookmarks of recipes
│   │   └── recipes/
│   │       ├── dto/
│   │       ├── recipes.controller.ts
│   │       ├── recipes.service.ts
│   │       ├── recipes.service.spec.ts
│   │       └── recipes.module.ts
│   └── generated/prisma/      # generated Prisma Client (git-ignored)
├── test/                      # e2e tests
├── Dockerfile                 # multi-stage: deps → build → production
└── docker-compose.yml         # postgres + migrate job + api
```

Each feature owns its controller, service, DTOs, and tests. It exposes only what it
lists in its module's `exports`. Features don't reach into each other's internals.
Code shared by several features goes in `common/`.

## Getting started

Prerequisites: Node.js 22.12+, npm, Docker Desktop.

```bash
npm install                 # also generates Prisma Client
cp .env.example .env        # then set POSTGRES_PASSWORD and the matching DATABASE_URL
npm run docker:db           # start PostgreSQL on localhost:5433
npm run db:deploy           # apply migrations
npm run db:seed             # optional sample recipes (safe to re-run; refreshes them)
npm run start:dev           # API with hot reload on http://localhost:3000
```

- API base: `http://localhost:3000/api/v1`
- Health: `http://localhost:3000/api/health`
- Swagger UI: `http://localhost:3000/docs` (not served when `NODE_ENV=production`)

The database container publishes host port **5433**, not 5432, so it doesn't clash with
a PostgreSQL installed directly on Windows. Change `POSTGRES_PORT` and `DATABASE_URL`
together if needed.

## Running everything in Docker

```bash
npm run docker:up           # docker compose up -d --build
npm run docker:down         # stop containers (data is kept in the postgres-data volume)
docker compose down -v      # stop and DELETE the database volume
docker compose logs -f api
```

`docker compose up` starts `postgres`, waits until it is healthy, runs the one-off
`migrate` job (`prisma migrate deploy`), and starts `api` only if migrations succeed.
The API container runs the compiled build as the non-root `node` user, with production
dependencies only.

## Endpoints

| Method | Path                              | Access      | Description                                                  |
| ------ | --------------------------------- | ----------- | ------------------------------------------------------------ |
| GET    | `/api/health`                     | Public      | Liveness and database connectivity                           |
| POST   | `/api/v1/auth/register`           | Public      | Create an account and sign in                                |
| POST   | `/api/v1/auth/login`              | Public      | Sign in with email and password                              |
| GET    | `/api/v1/auth/me`                 | Signed in   | Current user                                                 |
| POST   | `/api/v1/auth/logout`             | Signed in   | Revoke the current session                                   |
| POST   | `/api/v1/auth/logout-all`         | Signed in   | Revoke every session of the user, including this one         |
| POST   | `/api/v1/auth/change-password`    | Signed in   | Change password; signs out the user's other devices          |
| POST   | `/api/v1/auth/delete-account`     | Signed in   | Delete the account and the recipes it wrote (needs password) |
| GET    | `/api/v1/recipes`                 | Public      | List recipes (`?search=&cuisine=&authorId=&limit=&cursor=`)  |
| GET    | `/api/v1/recipes/:id`             | Public      | Get one recipe                                               |
| POST   | `/api/v1/recipes`                 | Signed in   | Create a recipe; you become its author                       |
| PATCH  | `/api/v1/recipes/:id`             | Author only | Update your recipe                                           |
| DELETE | `/api/v1/recipes/:id`             | Author only | Delete your recipe                                           |
| GET    | `/api/v1/profiles/:userId`        | Public      | A user's public profile                                      |
| GET    | `/api/v1/profiles/me`             | Signed in   | Your own profile                                             |
| PATCH  | `/api/v1/profiles/me`             | Signed in   | Edit your display name and bio                               |
| GET    | `/api/v1/saved-recipes`           | Signed in   | Your saved recipes, most recently saved first                |
| PUT    | `/api/v1/saved-recipes/:recipeId` | Signed in   | Save a recipe (safe to repeat)                               |
| DELETE | `/api/v1/saved-recipes/:recipeId` | Signed in   | Unsave a recipe (safe to repeat)                             |

"Signed in" routes need `Authorization: Bearer <token>` and answer **401** without a valid
session. "Author only" routes also answer **403** when the recipe belongs to someone else.

A recipe has `servings`, ordered `steps`, and structured `ingredients`
(`{ name, quantity, unit, note }`, stored one row each in `recipe_ingredients`, units from
`INGREDIENT_UNITS`). Lists return recipes without `steps`; the single-recipe read, create and
update return them. Editing `ingredients` or `steps` replaces the whole list.

Recipes include `author: { id, displayName } | null`. The author is set from the signed-in
user when the recipe is created and never changes; sending `authorId` is rejected (400).
`null` marks a Noomie editorial recipe (the seed data), which nobody can edit through the
API. An author's email never appears in recipe responses. Deleting an account
(`delete-account`) deletes its recipes in the same transaction. The author foreign key stays
`RESTRICT`, so no other code path can delete a user and leave their recipes behind.

Lists use cursor pagination. The response is `{ data, nextCursor }`. Pass `nextCursor`
back as `?cursor=` to get the next page; `null` means the last page. `limit` is 1–50
(default 20).

## Authentication

`register` and `login` return `{ user, token, expiresAt }`. Send the token as
`Authorization: Bearer <token>`. Tokens are random 256-bit values; the database stores
only their SHA-256 hash in `sessions`, so signing out (or deleting the row) revokes a token
immediately. Sessions last `SESSION_TTL_DAYS` (default 30). Passwords are hashed with
scrypt (N=2^15, r=8, p=3) and never returned. Emails are trimmed and lowercased.

Login answers "Incorrect email or password" for both unknown emails and wrong passwords,
and runs a password check either way, so the response doesn't reveal which accounts exist.
Registering an existing email returns 409. Auth routes allow 10 requests per minute per IP
and route; everything else allows 120.

`change-password` and `delete-account` re-check the current password and answer **400** (not 401) when it's wrong, so the app doesn't treat it as an ended session. Changing the password
revokes every other session; `logout-all` revokes all of them, including the caller's.

To protect a route in another feature, import `AuthModule`, add
`@UseGuards(SessionAuthGuard)`, and read the user with `@CurrentAuth()`. For a public route
that personalizes its response (like `savedByMe` on recipe reads), use
`OptionalSessionAuthGuard`: `@CurrentAuth()` is then undefined without a token, and an
invalid token still gets 401.

`features/recipes` is the reference: guard the write routes, pass `auth.user.id` to the
service, and check ownership in the service before changing anything.

> Behind a reverse proxy, enable Express `trust proxy` so rate limits see client IPs.

## Working with the database

```bash
# 1. edit prisma/schema.prisma
npm run db:migrate -- --name add_something   # create + apply a migration, then regenerate the client
npm run db:studio                              # browse data in Prisma Studio
npm run db:reset                               # drop, re-apply all migrations, re-seed (dev only)
```

Import the client and types from `src/generated/prisma/client.js`. Inject `PrismaService`
in any feature. Its module is global, so you don't need to import it.

Known Prisma errors are mapped to HTTP errors by `PrismaExceptionFilter`: unique violation
(P2002) → 409, foreign-key violation (P2003) → 409, record not found (P2025) → 404.
Anything else becomes a generic 500, and the details are only logged.

## Adding a feature

```bash
npx nest g resource features/<name> --no-spec   # or create the folder by hand
```

Then add the models to `schema.prisma`, run a migration, and register the module in
`app.module.ts` if the generator didn't. Follow `features/recipes` as the reference.

## Scripts

| Script               | What it does                                               |
| -------------------- | ---------------------------------------------------------- |
| `npm run start:dev`  | Watch mode                                                 |
| `npm run build`      | Compile to `dist/`                                         |
| `npm run start:prod` | Run the compiled build                                     |
| `npm test`           | Unit tests (`src/**/*.spec.ts`)                            |
| `npm run test:e2e`   | e2e tests against the database in `DATABASE_URL`           |
| `npm run docs:check` | Checks `docs/` covers every route and all links resolve    |
| `npm run lint`       | oxlint (type-aware)                                        |
| `npm run format`     | Prettier                                                   |
| `npm run db:*`       | Prisma generate / migrate / deploy / seed / reset / studio |
| `npm run docker:*`   | `db` (database only), `up`, `down`                         |

## Environment variables

See `.env.example`. The app validates its variables at startup (`src/config/env.validation.ts`)
and refuses to boot if they are invalid.

| Variable           | Used by         | Notes                                         |
| ------------------ | --------------- | --------------------------------------------- |
| `NODE_ENV`         | API             | `development`, `production`, or `test`        |
| `PORT`             | API             | Default `3000`                                |
| `DATABASE_URL`     | API, Prisma CLI | URL-encode special characters in the password |
| `CORS_ORIGINS`     | API             | Comma-separated; empty disables CORS          |
| `SESSION_TTL_DAYS` | API             | Sign-in lifetime in days (default 30)         |
| `POSTGRES_*`       | docker compose  | Credentials, database name, host port         |
| `API_PORT`         | docker compose  | Host port for the API container               |

## Notes

- The `allowScripts` field in `package.json` approves install scripts for npm 11+
  (Prisma's engine download and esbuild). It denies `@scarf/scarf`, a telemetry script.
  After upgrading Prisma, re-approve it with `npx npm@11 install-scripts approve prisma @prisma/engines`.
  npm 10 ignores this field.
- Prisma 7 does not read `.env` by itself. `prisma7.config.ts` loads it through `dotenv`.
- Prisma 7's `migrate dev` no longer regenerates the client; the `postdb:migrate` script does.
