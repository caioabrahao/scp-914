# API contract

## Request

`POST /api/` accepts:

```json
{
  "input": "a pocket watch",
  "setting": "fine"
}
```

Settings accepted by the API are normalized to:

- Rough
- Coarse
- 1:1
- Fine
- Very Fine

## Entry response

```json
{
  "kind": "entry",
  "canonical": "pocket watch",
  "setting": "fine",
  "tier": 2,
  "preamble": "optional preamble",
  "body": "Markdown addendum",
  "cached": false,
  "firstExperimentedAt": 1700000000000,
  "documentNumber": 42
}
```

`cached` is `false` for newly generated entries and `true` for entry-cache hits.

## Denial response

```json
{
  "kind": "denial",
  "reason": "species_not_approved",
  "text": "Pre-written denial entry"
}
```

Possible reasons:

- `invalid`
- `not_test_subject`
- `species_not_approved`
- `setting_not_approved_for_animals`
- `system_fault`

## Archive list

`GET /api/addendums` accepts optional `limit` and `offset` query parameters.
It returns entry summaries from D1:

```json
{
  "items": [
    {
      "id": "entry:...",
      "canonical": "pocket watch",
      "setting": "fine",
      "tier": 2,
      "preamble": "optional preamble",
      "cachedAt": 1700000000000,
      "firstExperimentedAt": 1699000000000,
      "documentNumber": 42,
      "inputCount": 3
    }
  ]
}
```

Only entries with `kind: "entry"` are included.

## Archive detail

`GET /api/addendums/:cacheKey` returns a full saved entry response. Callers must
URL-encode the D1 entry cache key. Missing or invalid entry keys return HTTP 404.
