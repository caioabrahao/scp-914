# AI, prompts, and generation

## Model

The model is defined by `MODEL` in [server/ai.ts](../server/ai.ts). The current model is
`@cf/google/gemma-4-26b-a4b-it`.

## Classification call

The classifier runs at temperature `0` and requests JSON output. It receives an
untrusted input inside `<input>` delimiters. The response is validated with Zod.

The classifier may retry once. Invalid JSON, schema mismatch, or a missing result after
the retry becomes `system_fault`.

## Generator call

The generator receives:

- the canonical English name;
- normalized setting;
- setting rule;
- deterministic twist;
- interest detail tier;
- rule block for the subject type;
- restrained instruction if a previous output failed validation.

It does not receive the raw user input.

## Setting rules

The setting rules are centralized in `SETTING_RULES`:

- Rough: crude components, messy and violent;
- Coarse: crude alteration, mostly worse;
- 1:1: similar object with subtle difference;
- Fine: improved with an unexpected aspect;
- Very Fine: stranger and better than expected.

## Twists and detail tiers

Twists are selected deterministically using the canonical input and setting hash.
Tier 1, 2, and 3 blocks specify the target structure and word range.

Tier 1 items are bumped to tier 2 approximately 20% of the time using a stable hash.

## Preambles

Lab-animal and Class-D entries receive code-selected preamble variants.

- lab animal: Ethics Committee approval, species, welfare officer;
- Class-D: deterministic 4-digit ID, directive, observer count.

Preambles are stored separately from the model body.

## Living-subject and organic rules

Living-subject prompt blocks require cut-away reporting:

- no experience or suffering detail;
- no pain, fear, awareness, or transformation process;
- aftermath and paperwork only;
- up to three `⟦...⟧` redaction markers;
- dread and understatement instead of gore.

Organic remains may be described plainly but must not imply suffering or awareness.

## Output validation

For sensitive subject rules, the server checks:

- approximate tier word range;
- prohibited suffering language;
- balanced redaction markers;
- maximum three markers.

If validation fails, the entry is regenerated once with stricter restraint. The second
failure produces `system_fault` and no cache write.
