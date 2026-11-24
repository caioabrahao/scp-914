# SCP-914 simulator architecture

## Overview

This project is a full-stack Cloudflare application:

- Vue 3 renders the browser interface.
- Vite builds the frontend and integrates the Cloudflare Worker.
- A single Cloudflare Worker handles `/api` requests and serves the SPA assets.
- Workers AI performs classification and entry generation.
- Cloudflare D1 stores classifications, generated entries, and a simple IP-based
  uncached-generation rate limit.

The implementation is intentionally deterministic around the AI calls. The code
decides invalid input, living subjects, approved species, harsh-setting restrictions,
twists, preambles, cache keys, and output validation. The model assembles the final
fictional log.

## Runtime layout

```text
src/
  App.vue                 Vue UI, form state, API calls, Markdown rendering
  assets/main.css         Application styling
  assets/base.css         Base theme variables
  main.ts                 Vue application entry

server/
  index.ts                Worker routing and pipeline orchestration
  ai.ts                   Classification, model prompts, tiers, validation
  cache.ts                D1 cache and rate-limit operations
  constants.ts            Prompt version, species, ethics flags, keyword lists
  policy.ts               Pure subject-and-setting policy decisions
  prechecks.ts            Pure local input validation
  denials.ts              Pre-written deterministic denial entries
  types.ts                Shared API and classification types
  utils.ts                SHA-256 helper
  *.test.ts               Vitest unit and mocked-AI tests

migrations/
  0001_scp914_cache.sql   D1 tables

wrangler.jsonc             Worker, AI, assets, and D1 bindings
vite.config.ts             Vue and Cloudflare Vite plugins
vitest.config.ts           Test discovery configuration
```

## Frontend

[src/App.vue](../src/App.vue) owns the interactive state:

- raw input text
- dial setting index
- loading, error, and response state
- canonical name and detail tier
- deterministic preamble
- denial reason

The frontend submits JSON to `POST /api/`:

```json
{
  "input": "a pocket watch",
  "setting": "fine"
}
```

It accepts the structured response union described below. Markdown is converted with
`marked` and sanitized with `DOMPurify` before rendering.

The redaction syntax `⟦text⟧` is replaced by a black visual block with an accessible
`redacted` label. The page does not reveal the underlying text on interaction.

## Worker entrypoint

[server/index.ts](../server/index.ts) is the only HTTP routing entrypoint. It:

1. Accepts only `/api` or `/api/`.
2. Accepts only `POST`.
3. Parses and validates JSON.
4. Runs the local pre-check pipeline.
5. Normalizes and validates the setting.
6. Classifies and caches the normalized input.
7. Applies policy.
8. Checks the entry cache.
9. Generates and validates an entry.
10. Stores only successful entries.

HTTP routing should remain thin. Policy decisions, model prompts, validation, and
cache data construction should live in dedicated server modules.

## Request pipeline

```text
raw input
  -> normalize and pre-check
  -> SHA-256 key for normalized input
  -> classification cache lookup
  -> model classification, retry once if needed
  -> pure policy decision
  -> setting-dependent denial or entry
  -> SHA-256 entry cache lookup
  -> tiered AI generation
  -> living/organic output validation
  -> optional restrained retry
  -> D1 entry cache
  -> structured response
```

### 1. Input pre-checks

[server/prechecks.ts](../server/prechecks.ts) trims text, collapses whitespace,
removes control characters and line breaks, and rejects:

- empty input
- input longer than 100 characters
- fewer than two Unicode letters
- all-digit, symbol, or emoji-only input
- excessively repeated characters
- obvious keyboard-mashing patterns
- conservative no-vowel ASCII strings

Pre-check failures become deterministic `invalid` denial entries. They do not call AI.

### 2. Classification

[server/ai.ts](../server/ai.ts) calls Workers AI once for classification and temperature
`0`. The model returns JSON describing:

- whether the input is meaningful and testable
- canonical English name
- subject type
- approved or other species
- whether a living individual is specifically identifiable
- entertainment interest tier

The Zod `ClassificationSchema` validates the model response. Literal `<input>` tags
are stripped and the safe input is placed only between `<input>` delimiters in the
classification prompt.

Classification is retried once on invalid JSON or schema failure. If both attempts
fail, the Worker returns a `system_fault` denial and does not call the generator.

Classification calls are cached by normalized raw input and `PROMPT_VERSION`.

### 3. Policy

[server/policy.ts](../server/policy.ts) is pure code. It has no model calls and must
remain deterministic.

The decision order is:

1. invalid classification
2. named or personally connected living human or animal
3. animal species approval
4. animal harsh-setting approval
5. anonymous human as Class-D
6. organic remains
7. standard object

The approved lab-animal species are defined in [server/constants.ts](../server/constants.ts).
`BLOCK_HUMANS_ON_HARSH` currently defaults to `false`.

Policy is evaluated on every request. It must not be baked into the classification
cache because animal denials depend on the selected setting.

### 4. Denials

[server/denials.ts](../server/denials.ts) contains pre-written denial variants for:

- `invalid`
- `not_test_subject`
- `species_not_approved`
- `setting_not_approved_for_animals`
- `system_fault`

Variants are chosen deterministically from a hash of reason and input. Denial text
is therefore stable for repeated requests and never generated by AI.

### 5. Generation

The generator in [server/ai.ts](../server/ai.ts) receives the canonical English name,
not the raw input. It combines:

- setting rules
- a deterministic twist
- detail tier
- prompt rule block
- Class-D or lab-animal preamble data
- restrained regeneration instruction when required

The detail tier is based on model-classified `interest`:

| Tier | Resulting block | Target |
|---|---|---|
| 1 | Input, Processing, Result, Note | 70-110 words |
| 2 | Tier 1 plus Observations | 130-180 words |
| 3 | Tier 2 plus additional observations, Follow-up testing, Addendum | 250-350 words |

Tier-1 results are deterministically bumped to tier 2 for approximately 20% of
canonical items.

Class-D and lab-animal subjects use a cut-away prompt that avoids suffering, pain,
fear, awareness, and transformation detail. D-Class IDs and lab-animal preamble
variants are deterministic.

### 6. Output validation

Before storing living-subject or organic results, [server/ai.ts](../server/ai.ts)
checks:

- approximate tier word count
- prohibited suffering language
- balanced `⟦...⟧` markers
- no more than three redaction markers

A failed result is regenerated once with a restraint instruction. A second failure
returns `system_fault` and is not cached.

Standard object entries currently do not receive the living/organic validation rules.

## Caching

D1 is bound as `DB`. The migration is
[migrations/0001_scp914_cache.sql](../migrations/0001_scp914_cache.sql).

### Classification cache

```text
cls:{PROMPT_VERSION}:{sha256(normalizedRawInput)}
```

It stores the validated `Classification` object. Invalid classifier results can be
stored as policy-denial classifications, but `system_fault` is never stored.

### Entry cache

```text
entry:{PROMPT_VERSION}:{sha256(canonical)}:{settingKey}
```

It stores the complete structured entry with `cached: false`. Cache hits copy the
entry and change `cached` to `true`.

Failures and validation failures are never written to the entry cache.

### Cache invalidation

Increment `PROMPT_VERSION` in [server/constants.ts](../server/constants.ts) whenever
prompt behavior changes and cache-backed generations should be invalidated.

This is a manual versioning mechanism rather than automatic cache migration.

### Rate limiting

[server/cache.ts](../server/cache.ts) provides a simple D1 per-IP fixed-window limit
for uncached generation attempts. The default is 10 requests per 60 seconds.

It relies on `cf-connecting-ip`, with `x-forwarded-for` used as a fallback. Unknown
addresses share a fallback key.

## API contract

Successful entry:

```json
{
  "kind": "entry",
  "canonical": "pocket watch",
  "setting": "fine",
  "tier": 2,
  "preamble": "optional text",
  "body": "Markdown test-log entry",
  "cached": false
}
```

Denial:

```json
{
  "kind": "denial",
  "reason": "species_not_approved",
  "text": "Pre-written denial entry"
}
```

`DenialReason` values are:

- `invalid`
- `not_test_subject`
- `species_not_approved`
- `setting_not_approved_for_animals`
- `system_fault`

The API also preserves an older display fallback: the frontend accepts `body` and
legacy `response`, while entry/denial consumers should use `kind`.

## Bindings and configuration

[wrangler.jsonc](../wrangler.jsonc) declares:

- `AI`: Workers AI binding
- `DB`: D1 database binding
- the application asset serving configuration

The current D1 database name is `scp914`. Keep database credentials and IDs out of
source-specific secrets where Wrangler supports it. The real database ID is currently
configuration in `wrangler.jsonc`.

Workers AI remote access is used even during local development, and related usage
may incur charges.

## Security model

- Raw input is never included in the generator prompt.
- Raw input is included only inside a tagged, untrusted block in the classifier prompt.
- Literal `<input>` and `</input>` tags are stripped before classification.
- The canonical name is the only input text passed to generation.
- Policy decisions are never delegated to the model.
- Markdown is sanitized in the frontend.
- Redactions are generated by the frontend from markers and reveal no hidden text.
- System-fault classification failures fail closed.
- Cache entries and denials must not be able to weaken policy rules.

Do not add logging of raw user input or other identifying input data beyond existing
operational needs.

## Testing

The test suite uses Vitest:

```sh
pnpm test
```

Test files:

- `server/prechecks.test.ts`
- `server/policy.test.ts`
- `server/denials.test.ts`
- `server/ai.test.ts`

Tests cover normalization, keyboard-mash rejection, policy branches, denial
determinism, mocked classification success/failure, and body validation.

Vitest is isolated with [vitest.config.ts](../vitest.config.ts) so Cloudflare Vite
plugins are not needed for unit tests.

## Editing guide

| Change | File |
|---|---|
| Prompt/cache behavior version | `server/constants.ts` |
| Approved species | `server/constants.ts` |
| Human harsh-setting behavior | `server/constants.ts` |
| Suffering words | `server/constants.ts` |
| Canonical policy order | `server/policy.ts` |
| Input heuristics | `server/prechecks.ts` |
| Denial variants | `server/denials.ts` |
| Classifier/generator prompts | `server/ai.ts` |
| Detail-tier ranges | `server/ai.ts` |
| Preambles and ID format | `server/ai.ts` |
| D1 operations | `server/cache.ts` |
| API pipeline | `server/index.ts` |
| Entry UI and redactions | `src/App.vue` |

When changing AI-visible prompt behavior or output shape, update:

1. relevant prompt/constants
2. Zod output validation
3. cache `PROMPT_VERSION`
4. unit tests
5. frontend rendering if the response shape changed

## Build and deployment

```sh
pnpm install
pnpm test
pnpm build
pnpm dev
```

Apply D1 migrations:

```sh
# local development
pnpm wrangler d1 migrations apply scp914

# deployed database
pnpm wrangler d1 migrations apply scp914 --remote
```

Deploy:

```sh
pnpm run deploy
```

## Current known limitations

- The optional second-AI output review check is not implemented.
- Rate limiting is fixed-window and IP-based, not account or device based.
- D1 cache JSON is parsed without schema validation on cache reads. A stale or
  corrupted value could affect runtime behavior.
- Classification availability depends on Workers AI and can return `system_fault`.
- The application has mock/unit coverage, but no browser E2E suite.
- The current pre-check heuristics are intentionally conservative and can be tuned
  independently from policy.
