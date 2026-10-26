# Run the backend on your computer

For frontend developers. You run the backend with Docker, then run the Noomie app as usual.
You don't need to know NestJS or Prisma. For everyday commands and fixes, see
[daily use](daily-use.md).

## What you need

- **Docker Desktop**, running.
- **Git**, and access to the `backendnoomie` repository (ask the backend team if it's private).
- The Noomie app repository next to this one:

```text
noomie-project/
├── Noomie/          ← the Expo app (frontend)
└── backendnoomie/   ← this repository (backend)
```

You don't need Node.js for the backend itself. It's only needed for the optional tools at
the end of this page.

## First-time setup

1. Get the backend. Work from the `develop` branch:

   ```bash
   git clone -b develop https://github.com/Jeraldbabor/backendnoomie.git
   ```

2. Create the local settings file. The defaults work as they are:

   ```bash
   cp .env.example .env
   ```

   On Windows Command Prompt use `copy .env.example .env` instead.

3. Start everything (database, photo storage, migrations, API). The first run takes a few
   minutes:

   ```bash
   docker compose up -d --build
   ```

4. Check that it works. Open http://localhost:3000/api/health in your browser. You should see:

   ```json
   { "status": "ok", "database": "up" }
   ```

5. Optional: load the three sample recipes:

   ```bash
   docker compose run --rm migrate npx prisma db seed
   ```

## Test accounts (optional, local development only)

Create three accounts for sign-in, profiles, saved recipes, and ownership testing:

```bash
docker compose run --rm --build -e NODE_ENV=development migrate npm run db:seed:users
```

Or, when running Node.js on your computer with `.env` configured:

```bash
npm run db:seed:users
```

| Email                 | Display name  |
| --------------------- | ------------- |
| `tester@example.test` | Noomie Tester |
| `alice@example.test`  | Alice Santos  |
| `bob@example.test`    | Bob Reyes     |

**Password for all three: `NoomieTest123!`**. These are public test credentials: never run
this command against a deployed/shared production database. The seeder refuses
`NODE_ENV=production` (and any mode other than `development` or `test`); an unset mode defaults
to development. Check your `DATABASE_URL` before running it.

Each password is independently salted using the same scrypt service as registration.
Re-running adds missing accounts and skips existing emails without changing their passwords,
profiles, sessions, or other data. If you changed a test account's password, use the changed
password; the seeder does not reset it. It creates no recipes or sessions: sign in normally
in the app. `npm run db:seed` still only loads editorial recipes.

Backend contributors: `test/seed-users.e2e-spec.ts` uses fixed emails and is skipped unless
`SEED_USERS_E2E=1`. Enable it only with `DATABASE_URL` pointing to an empty disposable
PostgreSQL instance and `STORAGE_*` pointing to disposable storage. Never enable it against
your everyday database; it deletes the test accounts during cleanup.

## Connect the app

Nothing to configure. Start the app from the `Noomie` folder (`npm start`, or
`npm run tunnel` for a phone that can't reach your computer over Wi-Fi). In development the
app sends API calls to the Expo dev server, which forwards everything under `/api` to the
backend on port 3000. Details: [Noomie app integration](../app-integration/noomie-app.md#base-url).

## Optional tools (need Node.js)

Run `npm install` once in this folder first.

### Browse the database

```bash
npm run db:studio
```

Prisma Studio shows the tables (users, sessions, recipes). Look, but don't edit rows by hand
to test app behavior: the API enforces rules (like recipe authors) that direct edits skip.
Password hashes and session token hashes can't be turned back into passwords or tokens.

### Interactive API docs (Swagger)

The Docker API runs in production mode, so its interactive docs are off. To use them, stop
the Docker API and run the backend in development mode:

```bash
docker compose stop api
npm run start:dev
```

Then open http://localhost:3000/docs. The raw OpenAPI document is at
http://localhost:3000/docs-json. Run `docker compose up -d` again when you're done.
