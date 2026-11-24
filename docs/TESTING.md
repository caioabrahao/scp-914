# Testing

## Commands

```sh
pnpm test
pnpm build
```

Vitest is configured in [vitest.config.ts](../vitest.config.ts) and isolates server unit
tests from the Cloudflare/Vite application plugins.

## Test areas

- [server/prechecks.test.ts](../server/prechecks.test.ts):
  normalization and invalid-input heuristics;
- [server/policy.test.ts](../server/policy.test.ts):
  standard, organic, D-Class, lab-animal, and denial decisions;
- [server/denials.test.ts](../server/denials.test.ts):
  deterministic denial variants;
- [server/ai.test.ts](../server/ai.test.ts):
  mocked classifier success/failure and generated-body validation.
