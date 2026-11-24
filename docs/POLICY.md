# Pre-checks and ethics policy

## Input pre-checks

[server/prechecks.ts](../server/prechecks.ts) performs code-only validation:

- trim and collapse whitespace;
- remove control characters and line breaks;
- enforce a 100-character maximum;
- require at least two letters;
- reject all-digit, symbol, emoji-only, or excessively repeated input;
- conservatively reject obvious keyboard mashing;
- reject 6+ character ASCII strings with no vowels.

These checks are intentionally not a moderation system. Ambiguous meaningful text is
sent to the classifier.

## Policy decisions

[server/policy.ts](../server/policy.ts) receives a validated classification and setting.
It does not call AI.

The rules are evaluated in this order:

1. invalid classification: `invalid`
2. named or personally connected living human or animal: `not_test_subject`
3. unapproved animal species: `species_not_approved`
4. animal with Rough or Coarse: `setting_not_approved_for_animals`
5. anonymous human: `d_class`
6. organic remains: `organic`
7. object or abstract input: `standard`

`BLOCK_HUMANS_ON_HARSH` is available as a future/configurable block. It currently
defaults to `false`.

Policy is recalculated for every request because the setting may change after
classification.
