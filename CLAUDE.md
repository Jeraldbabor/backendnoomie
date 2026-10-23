# backendnoomie

NestJS 12 + Prisma 7 + PostgreSQL API for the Noomie app. Setup, structure, and scripts are in
[README.md](README.md). The frontend team works from the guide in [docs/](docs/README.md).

## Every change ships with its docs (required)

The frontend team builds against `docs/`, not the code. A change is not done until its docs
are updated in the same change. For any new or changed endpoint, field, validation rule,
error, permission, limit, or behavior:

1. Update `docs/api/<feature>.md`. For a new feature, copy `docs/api/_template.md`. Use real
   responses from the running API for examples (create temporary data and delete it after).
2. Update the endpoint table in `docs/README.md`.
3. Add a dated entry at the top of `docs/CHANGELOG.md`. Mark it **breaking** and say what the
   app must change if a field is removed or renamed, a type changes, a field becomes required,
   or access gets stricter.
4. Update `docs/app-integration/noomie-app.md` if the app's code should change.
5. Update `docs/setup/` and `README.md` for changes to setup, scripts, Docker, or env vars.
6. Run `npm run docs:check`. CI runs it with `--since` on every push and pull request.

Changes with no API effect (refactors, tests, tooling) don't need docs; put `[no-docs]` in
the commit message so CI skips the changelog check.

When reporting work as done, list which docs were updated, or say why none were needed.

## Checks before finishing

`npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run test:e2e` (needs the Docker database and storage:
`npm run docker:db`), and `npm run docs:check`. After schema changes, use
`npm run db:migrate -- --name <change>`; it regenerates the Prisma client. The **CI** GitHub
workflow runs the same checks (e2e against the full Docker stack) on every push and pull
request.

## Conventions

- One folder per feature in `src/features/<feature>/`: controller, service, DTOs, tests.
- Identity comes from `@CurrentAuth()` behind `SessionAuthGuard` (or
  `OptionalSessionAuthGuard` for public routes that personalize), never from request bodies.
  Check ownership in the service. Test anonymous, owner, other-user, and forged-field cases.
- Responses use explicit Prisma `select` shapes (see `recipes.types.ts`); never return
  password hashes, token hashes, or other users' emails.
