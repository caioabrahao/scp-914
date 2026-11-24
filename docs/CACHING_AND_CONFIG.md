# Caching and configuration

## D1

The D1 binding is `DB`. Its tables are created by
[migrations/0001_scp914_cache.sql](../migrations/0001_scp914_cache.sql):

- `classifications`
- `entries`
- `rate_limits`

## Classification key

```text
cls:{PROMPT_VERSION}:{sha256(normalizedInput)}
```

It stores the validated classification object.

## Entry key

```text
entry:{PROMPT_VERSION}:{sha256(canonical)}:{setting}
```

It stores the complete entry response. Cache hits set `cached: true`.

## Prompt version

`PROMPT_VERSION` in [server/constants.ts](../server/constants.ts) invalidates old
classification and entry keys by changing the key namespace. Increment it after prompt
or prompt-sensitive policy behavior changes.

## Rate limit

The uncached-generation rate limit is fixed-window and per IP:

- default 10 requests;
- default 60-second window;
- stored in D1;
- classifier or generator uncached work may consume it.

It uses `cf-connecting-ip` and falls back to `x-forwarded-for`.

## Configuration points

Edit these values in [server/constants.ts](../server/constants.ts):

- approved species;
- prompt version;
- human harsh-setting behavior;
- suffering-language keywords.

Edit these values elsewhere:

- D1 binding and database ID: `wrangler.jsonc`;
- model and setting rules: `server/ai.ts`;
- denial variants: `server/denials.ts`;
- policy order: `server/policy.ts`;
- cache reads/writes: `server/cache.ts`.
