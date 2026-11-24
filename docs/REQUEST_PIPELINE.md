# From user input to addendum

This pipeline is orchestrated by [server/index.ts](../server/index.ts). It is designed
so that policy decisions remain deterministic and the raw user text does not reach the
entry generator.

## Pipeline

```text
1. Frontend submit
2. HTTP and setting validation
3. Code-only input pre-check
4. Cached or AI classification
5. Pure policy decision
6. Entry cache lookup
7. Tiered AI generation
8. Code output validation
9. Cache and API return
10. Frontend rendering
```

## 1. Frontend submit

The Vue application sends:

```json
{
  "input": "a pocket watch",
  "setting": "fine"
}
```

to `POST /api/`. The setting is one of Rough, Coarse, 1:1, Fine, or Very Fine.

## 2. HTTP and setting validation

The Worker:

- accepts `/api` or `/api/`;
- rejects non-POST methods;
- parses JSON;
- normalizes setting names case-insensitively;
- rejects malformed or unsupported settings.

## 3. Code-only input pre-check

[POLICY.md](./POLICY.md) describes the exact checks. This layer uses no AI. It:

- trims and collapses whitespace;
- removes control characters and line breaks;
- rejects empty or over-100-character input;
- requires at least two letters;
- rejects emoji-only, digit-only, symbol-only, repeated-character, and obvious
  keyboard-mashing text.

A failure becomes a pre-written `invalid` denial and does not consume a model call.

## 4. Classification

The normalized raw input is hashed with SHA-256. The Worker first checks the
classification cache key:

```text
cls:{PROMPT_VERSION}:{sha256(normalizedInput)}
```

On a miss, the model performs a temperature-0 JSON classification. Zod validates:

- `valid`
- canonical English item name
- subject type
- approved or other species
- whether a living individual is specifically identifiable
- interest from 1 to 3

The literal text `<input>` and `</input>` is stripped before the user value is placed
inside `<input>...</input>` in the classifier prompt.

Invalid classification JSON or schema output is retried once. Two failures produce
`system_fault`; neither the classifier result nor a generated entry is cached.

## 5. Deterministic policy

The policy function runs on every request after classification and before entry lookup.
It checks:

1. `valid`
2. named or personally connected living human or animal
3. animal species approval
4. animal setting approval
5. anonymous human handling
6. organic remains handling
7. standard object handling

Policy denials use pre-written text and return `kind: "denial"`. They do not call the
generator. Setting-dependent animal denials are intentionally not classification-cache
results.

## 6. Entry cache lookup

The entry key is:

```text
entry:{PROMPT_VERSION}:{sha256(canonical)}:{setting}
```

A hit returns the complete entry with `cached: true`. A miss proceeds to generation.
Classification cache and entry cache use separate D1 tables.

## 7. Tiered generation

The generator receives the canonical name, setting, rule block, twist, and detail tier.
It never receives the raw input.

Interest determines the initial tier:

- Tier 1: Input, Processing, Result, Note
- Tier 2: Tier 1 plus Observations
- Tier 3: Tier 2 plus observations, Follow-up testing, and escalating Addendum

Tier-1 items are deterministically bumped to tier 2 for about 20% of requests.

Living-subject and organic prompts use additional restraint rules. Lab-animal and
Class-D entries receive code-generated preambles.

## 8. Output validation

For D-Class, lab-animal, and organic entries, code checks:

- tier-appropriate word count;
- prohibited suffering language;
- balanced redaction markers;
- no more than three redaction markers.

Failure triggers one restrained regeneration. A second failure returns
`system_fault` and writes nothing to the entry cache.

## 9. Cache and response

Successful entries are stored in D1 and returned as:

```json
{
  "kind": "entry",
  "canonical": "pocket watch",
  "setting": "fine",
  "tier": 2,
  "preamble": "optional",
  "body": "Markdown addendum",
  "cached": false
}
```

## 10. Frontend rendering

The frontend sanitizes and parses Markdown. Preambles appear separately above the body.
Living-subject redaction markers become accessible black blocks. Denials use a
monospace official-form layout and a stamped denied label.
