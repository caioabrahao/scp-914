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
  "cached": false
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
