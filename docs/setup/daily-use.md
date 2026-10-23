# Daily use and troubleshooting

Run these in the `backendnoomie` folder. First-time setup is in [run the backend](local-backend.md).

## Everyday commands

| What                                    | Command                                               |
| --------------------------------------- | ----------------------------------------------------- |
| Start the backend                       | `docker compose up -d`                                |
| Stop it (your data is kept)             | `docker compose down`                                 |
| Check it's running                      | open http://localhost:3000/api/health                 |
| See the API logs                        | `docker compose logs -f api`                          |
| Load or refresh the sample recipes      | `docker compose run --rm migrate npx prisma db seed`  |
| Wipe your local database and start over | `docker compose down -v`, then `docker compose up -d` |

`docker compose down -v` deletes all accounts, recipes and photos **on your computer only**.

## After pulling backend changes

```bash
git pull
docker compose up -d --build
```

The `--build` flag rebuilds the API with the new code. New database migrations are applied
automatically every time the stack starts. Then read the [changelog](../CHANGELOG.md) for API
changes the app may need to handle; it also says when to refresh the sample recipes.

Loading the sample recipes is safe to repeat: it adds the missing ones and updates existing
ones to the latest content. Recipes created by users are never touched.

## Troubleshooting

- **The app says "Can't reach Noomie right now":** the backend isn't running. Check
  http://localhost:3000/api/health and start it with `docker compose up -d`.
- **`docker compose` fails with "set in .env":** the `.env` file is missing. Run
  `cp .env.example .env`.
- **Port 3000, 5433 or 8333 is already in use:** change `API_PORT`, `POSTGRES_PORT` or
  `STORAGE_PORT` in `.env`.
  If you change `POSTGRES_PORT`, change the port in `DATABASE_URL` too. If you change
  `API_PORT`, start the app with `NOOMIE_API_PROXY_TARGET=http://127.0.0.1:<port>`.
- **The API behaves like an older version after `git pull`:** run
  `docker compose up -d --build` so it's rebuilt with the new code.
- **Still stuck:** collect the details listed in
  [reporting a backend bug](../team/working-together.md#reporting-a-backend-bug) and ask the
  backend team.
