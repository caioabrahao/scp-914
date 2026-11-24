# Developer reference

This guide explains how to set up, run, modify, test, deploy, and troubleshoot the
SCP-914 application.

## Project summary

The project is a Vue 3 application served by a Cloudflare Worker:

- Vue and Vite provide the browser interface.
- The Cloudflare Vite plugin runs the Worker and SPA integration during development.
- The Worker in `server/index.ts` handles `/api` requests.
- Workers AI generates classifications and addendum entries.
- Cloudflare D1 caches classifications and entries and stores rate-limit state.
- A D1 counter tracks valid classified inputs per canonical name for the archive.

The main browser views are:

- `/` - SCP-914 simulator
- `/addendums` - saved addendum archive

## Prerequisites

Install the following:

- Node.js 22.18 or newer, or Node.js 24.12 or newer
- pnpm
- A Cloudflare account
- Wrangler, available through the project dependencies

The required Node and pnpm versions are declared in `package.json`. The repository
uses pnpm; use pnpm commands rather than npm or yarn so the lockfile stays consistent.

To make Cloudflare API calls:

```sh
pnpm wrangler login
```

Confirm the active account and project context before creating or migrating databases.

## Initial setup

From the repository root:

```sh
pnpm install
pnpm test
pnpm build
pnpm dev
```

`pnpm dev` starts Vite with the Cloudflare integration and serves the application locally.
Open the URL printed by Vite.

Workers AI can access remote Cloudflare resources during local development. AI calls
may incur usage charges even when the local app is running.

## Project structure

```text
src/
  App.vue                 Navigation and router view
  main.ts                 Vue and router entry
  router/index.ts         / and /addendums routes
  views/                  Simulator and archive views
  assets/                 Base and application styles

server/
  index.ts                Worker routing and pipeline orchestration
  ai.ts                   Classification and generation prompts
  policy.ts               Pure policy decisions
  prechecks.ts            Pure input validation
  cache.ts                D1 cache and rate-limit operations
  constants.ts            Approved species and configuration
  denials.ts              Pre-written denial variants
  types.ts                Shared domain and API types
  utils.ts                SHA-256 helper
  *.test.ts               Vitest unit tests

migrations/
  0001_scp914_cache.sql   D1 cache schema

docs/
  Developer and architecture documentation
```

Keep routing in `server/index.ts` thin. Add prompt behavior under `server/ai.ts`,
deterministic policy under `server/policy.ts`, and storage operations under
`server/cache.ts`.

## Cloudflare configuration

Cloudflare settings are in `wrangler.jsonc`.

### Workers AI

```json
"ai": {
  "binding": "AI"
}
```

The binding is exposed as `env.AI` in the Worker. The project calls the model in
`server/ai.ts`:

```text
@cf/google/gemma-4-26b-a4b-it
```

The model should be changed centrally in `server/ai.ts`, not in the frontend.

Workers AI calls are remote even in local development. If they fail:

- confirm Wrangler is logged in;
- confirm the account has Workers AI enabled;
- check account usage and billing status;
- inspect the Worker logs;
- expect `system_fault` instead of a fallback allow decision.

### D1 database

The D1 binding is:

```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "scp914",
    "database_id": "..."
  }
]
```

The binding is exposed to the Worker as `env.DB`.

Create the database only when it does not already exist:

```sh
pnpm wrangler d1 create scp914
```

Put the returned database ID in `wrangler.jsonc` under `d1_databases.database_id`.
Do not create a second database for routine development unless the local and deployed
environment requirements intentionally differ.

Apply migrations locally:

```sh
pnpm wrangler d1 migrations apply scp914
```

Apply migrations to the deployed database:

```sh
pnpm wrangler d1 migrations apply scp914 --remote
```

Local migration state is separate from the remote database. A migration that works
locally must still be applied with `--remote` before deploying.

To inspect local or remote D1 data:

```sh
pnpm wrangler d1 execute scp914 --command "SELECT * FROM entries"
pnpm wrangler d1 execute scp914 --remote --command "SELECT * FROM entries"
```

Use the migration history and D1 APIs for application changes. Avoid editing deployed
schemas manually outside a migration file.

### Worker assets

`wrangler.jsonc` enables single-page-application fallback handling. This allows Vue
routes such as `/addendums` to load through the built SPA rather than returning a
Worker asset 404.

Do not add server routes beneath SPA asset paths unintentionally. API paths start with
`/api`.

## Local development

Start the app:

```sh
pnpm dev
```

Useful development commands:

```sh
pnpm test
pnpm build
pnpm preview
```

`pnpm preview` performs a build and starts the Wrangler preview.

When changing Worker bindings or types:

```sh
pnpm cf-typegen
```

This updates `worker-configuration.d.ts` from `wrangler.jsonc`.

## Request pipeline

A simulator request passes through these layers:

```text
frontend input
  -> Worker HTTP validation
  -> code-only pre-check
  -> normalized-input D1 cache lookup
  -> AI classification and Zod validation
  -> pure deterministic ethics policy
  -> entry D1 cache lookup
  -> tiered AI generation
  -> output validation
  -> D1 entry cache
  -> entry or denial response
  -> Vue rendering
```

The raw input reaches only the classifier prompt inside a tagged, untrusted block.
The canonical English name reaches the generator.

For the complete design, see [REQUEST_PIPELINE.md](./REQUEST_PIPELINE.md).

## API development

The simulator endpoint is:

```text
POST /api/
```

Request:

```json
{
  "input": "a pocket watch",
  "setting": "fine"
}
```

Archive endpoints:

```text
GET /api/addendums
GET /api/addendums/:cacheKey
```

The archive detail route accepts a URL-encoded D1 entry cache key.

Keep response shapes aligned with `EntryResponse` in `server/types.ts` and the
Vue response parsing in `src/views/SimulatorView.vue` and
`src/views/AddendumArchiveView.vue`.

See [API_CONTRACT.md](./API_CONTRACT.md) for the complete response shapes.

## Configuration and extension points

### Approved species

Edit `APPROVED_SPECIES` in `server/constants.ts`.

Changing it affects Zod classifier validation and pure policy decisions.

### Prompt version

Edit `PROMPT_VERSION` in `server/constants.ts` when AI prompt behavior changes and old
classification or entry cache records should no longer be reused.

### Human and animal policy

Edit `BLOCK_HUMANS_ON_HARSH` and `HARSH_SETTINGS` in `server/constants.ts` and
`server/policy.ts`.

Policy decisions must remain pure, deterministic, and separate from AI generation.

### Denial variants

Edit `DENIAL_VARIANTS` in `server/denials.ts`.

Denials are selected deterministically by reason and input hash. Do not replace denials
with model-generated text.

### Detail tiers

Edit `TIER_BLOCKS`, setting rules, twist handling, preambles, and cut-away rules in
`server/ai.ts`.

After prompt changes:

1. increase `PROMPT_VERSION`;
2. run unit tests;
3. run a real-model smoke test;
4. verify cache behavior;
5. update docs and frontend response handling if needed.

## Testing

Run all tests:

```sh
pnpm test
```

Test suites are in `server/*.test.ts` and cover:

- input normalization and pre-checks;
- pure policy decisions;
- deterministic denial variants;
- mocked classifier success and failure;
- generated-body validation.

Mocked model tests do not require a live Cloudflare AI binding. Real model behavior
should be tested through `pnpm dev` or a deployed preview because prompt accuracy may
vary across model runs.

## Testing the archive

Generate an entry through `/`, then open `/addendums`.

If the archive is empty:

1. confirm D1 migration was applied;
2. confirm the app is using the expected local or remote database;
3. confirm `/api/` generated a successful entry;
4. confirm the entry was written to the `entries` table;
5. refresh `/addendums`.

For a quick D1 check, the project stores the full entry JSON in the `value` column:

```sh
pnpm wrangler d1 execute scp914 --command "SELECT cache_key, value, cached_at FROM entries ORDER BY cached_at DESC LIMIT 10"
pnpm wrangler d1 execute scp914 --command "SELECT COUNT(*) AS count FROM entries"
```

## Build and deployment

Build and type-check:

```sh
pnpm build
```

Deploy:

```sh
pnpm deploy
```

Before deployment:

1. run tests;
2. apply the remote D1 migration;
3. confirm `wrangler.jsonc` has the intended database ID;
4. confirm Workers AI is available to the account;
5. run a smoke test against a deployed preview or deployment;
6. verify the addendum cache and archive.

## Security and privacy

- Treat all user input as untrusted.
- Strip literal input tags before classifier interpolation.
- Never place raw input in the generator prompt.
- Keep policy decisions in deterministic code.
- Sanitize model Markdown in the frontend.
- Never reveal redacted text in browser markup or logs.
- Fail closed on classifier system faults.
- Do not log raw user input alongside identifying request data.

Markdown is sanitized with `DOMPurify`, and redactions are represented as black
accessible spans with no reveal behavior.

## Troubleshooting

### The AI call fails locally

- Run `pnpm wrangler login`.
- Confirm the Worker has the `AI` binding.
- Check that the model identifier is valid for the account.
- Check Cloudflare AI usage and logs.
- Expect a pre-written `system_fault` denial if classification fails.

### D1 errors occur

- Confirm `DB` is declared in `wrangler.jsonc`.
- Run migrations locally or remotely as appropriate.
- Run `pnpm cf-typegen` after binding changes.
- Verify the database ID and account context.

### `/addendums` shows no records

- Confirm entries exist in D1.
- Confirm a successful entry was generated after the migration.
- Verify local versus remote database context.
- Refresh the archive view.

### The Vue route returns a 404

- Confirm the route is defined in `src/router/index.ts`.
- Confirm `assets.not_found_handling` is configured for SPA fallback.
- Rebuild and redeploy the application.

### A cache is stale

- Increment `PROMPT_VERSION`.
- Optionally inspect or clear the affected D1 records through a migration or
  administrative script.
- Do not alter policy keys as a way to bypass ethics decisions.

## Documentation map

- [Overview](./OVERVIEW.md)
- [Request pipeline](./REQUEST_PIPELINE.md)
- [Frontend](./FRONTEND.md)
- [Server](./SERVER.md)
- [AI and prompts](./AI_AND_PROMPTS.md)
- [Policy](./POLICY.md)
- [Caching and configuration](./CACHING_AND_CONFIG.md)
- [API contract](./API_CONTRACT.md)
- [Testing](./TESTING.md)
