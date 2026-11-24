# Server architecture

[server/index.ts](../server/index.ts) is the Worker entrypoint. It should remain a thin
HTTP orchestrator.

## Module boundaries

| Module | Responsibility |
|---|---|
| `index.ts` | routing, JSON parsing, pipeline order, HTTP responses |
| `prechecks.ts` | deterministic input normalization and rejection |
| `ai.ts` | classifier schema, AI calls, prompts, tiers, output validation |
| `policy.ts` | pure ethics and subject policy |
| `denials.ts` | deterministic pre-written denial entries |
| `cache.ts` | D1 reads/writes and IP rate limit |
| `constants.ts` | prompt version, species, config flags, prohibited words |
| `types.ts` | classifications, policies, denial reasons, API types |
| `utils.ts` | SHA-256 hashing |

Keeping these boundaries prevents HTTP concerns, model prompts, policy, and storage
details from being mixed into one large handler.

## Worker bindings

[wrangler.jsonc](../wrangler.jsonc) declares:

- `AI` for Workers AI;
- `DB` for Cloudflare D1;
- asset serving for the Vue SPA.

## Error behavior

The Worker fails closed for classifier and generation system faults. It returns a
pre-written `system_fault` denial rather than allowing the request based on missing AI
results.

Generator failures and output-validation failures are not cached.
