<!-- NOTE: I couldn't find project files in the current workspace while generating this. This file is a concrete, editable template — please run the repo search and update the "Key files" and "Run / Test" snippets below with exact commands and paths from your project. -->
# Copilot / AI agent instructions for this repository

Keep guidance short, actionable and code-aware. When in doubt, open the files listed under "Key files" and prefer small, verified edits.

## Quick orientation (big picture)
- Primary service: `server/` — an express/Node (or similar) backend providing HTTP APIs for the app. Look for `server/src` or `server/index.js` / `server/index.ts`.
- Data: application uses environment-configured connections (`.env`) — database credentials and API keys are expected there.
- Runtime: often containerized (look for `Dockerfile`/`docker-compose.yml`) or run via `npm`/`pnpm` in `server/`.

If multiple services exist (for example `server/` and `web/`), treat `server/` as the authoritative backend: changes to API surface must preserve backward compatibility unless explicitly migrating.

## Key files and folders to inspect first
- `README.md` — high-level project goals and quick start (if present).
- `server/` — backend sources, typical entry points: `server/src/index.(ts|js)` or `server/index.(ts|js)`.
- `.env` and `.env.example` — environment variables used at runtime (sensitive values are not stored here).
- `package.json` (root and `server/`) — scripts and dependency layout.
- `migrations/` or `prisma/` or `db/` — database schema and migration tooling.
- `tests/` or `server/tests/` — automated tests and expected test commands.

Update these pointers if the project uses a different layout.

## Actionable developer workflows (what AI agents should do)
- Running locally: prefer the project's package scripts. Common example to check and adapt:

  - cd into service: `cd server`
  - install: `npm install` or `pnpm install`
  - dev start: `npm run dev` or `npm run start:dev`

  Replace these with exact commands discovered in `package.json`.

- Tests: run `npm test` in the package where tests live. If tests require DB or external services, prefer running a single unit test first.
- Lint/typecheck: run `npm run lint` / `npm run build` to catch errors before submitting changes.

## Project-specific conventions and patterns
- Environment: configuration is loaded from `.env`. Use `process.env.*` or the project's config loader — do not hardcode secrets.
- Error handling: prefer returning structured JSON errors from API endpoints (HTTP status + {code,message,details}) — follow existing handlers in `server/src/middleware` if present.
- Logging: maintain existing logging format (e.g., `winston`, `pino`, or console) — append context (request id, user id) when available.
- Database: use the repo's existing ORM/DB layer (e.g., `knex`, `prisma`, `typeorm`) — add migrations for schema changes and update seed/migration files.

## Integration points & external dependencies
- Identify external integrations from env vars (e.g., `DATABASE_URL`, `REDIS_URL`, `STRIPE_*`, `S3_*`).
- If adding or changing credentials, update `.env.example` (never commit real secrets).
- For third-party API changes, mirror rate limits and retry patterns used elsewhere in the codebase.

## Typical quick tasks AI agents are asked to do (and how to approach them)
- Small bugfix in an endpoint:
  1. Run the failing test or reproduce locally.
  2. Open the endpoint file (e.g., `server/src/routes/*.ts`), find the handler and follow upstream service calls.
  3. Update implementation + unit tests. Run lint and tests locally.

- Add a new API route:
  - Add route file under `server/src/routes` and a handler under `server/src/controllers` (follow existing structure).
  - Add request validation similar to existing endpoints (look for `validation` or Joi/Zod schemas).
  - Add tests under `server/tests` and, if relevant, an integration test.

## Examples (adapt paths to actual project layout)
- Find the server entry: `server/src/index.ts` — that file wires middleware, routes and DB. Use it to discover global middleware and error handling.
- Config pattern: `.env` -> `server/src/config/index.ts` is typical; follow this pattern for new settings.

## Merge strategy for existing `.github/copilot-instructions.md`
- If an existing file is present, preserve any project-specific examples and replace placeholder sections only if you verify the new content against actual files.

## Assumptions & next steps for a human reviewer
- I couldn't scan repository files from this session — please update the "Key files", run/test commands, and any exact script names (`dev`, `start`, `lint`, `test`) to make these instructions precise.
- After you provide access or confirm the real paths/commands I will update this file to reference exact filenames and a minimal set of runnable commands.

If anything above is unclear or you want me to target specific files (for example, merge an existing `AGENT.md`), tell me which files to read and I will update this doc accordingly.
