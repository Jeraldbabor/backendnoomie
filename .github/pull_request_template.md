## What changed

<!-- What does this change do, and why? -->

## Docs (required for API changes)

The frontend team relies on `docs/`. The steps are in `docs/README.md`, under "Keeping these
docs correct".

- [ ] Updated `docs/api/<feature>.md` (new feature: copied `docs/api/_template.md`), with
      examples from real API responses
- [ ] Updated the endpoint table in `docs/README.md`
- [ ] Added a dated entry to `docs/CHANGELOG.md`, marked **breaking** if the app must change
- [ ] Updated `docs/app-integration/noomie-app.md` if the app's code needs to change
- [ ] Updated `docs/setup/` or `README.md` for setup, scripts, or environment changes
- [ ] Not an API change (internal refactor, tests only): added `[no-docs]` to a commit message

## Checks

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run test:e2e`
- [ ] `npm run docs:check`
