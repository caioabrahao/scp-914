# SCP-914 system overview

SCP-914 is a full-stack Cloudflare application that turns a short item description and
dial setting into a deterministic, fictional SCP-style test log.

## Main components

- **Vue frontend:** collects input and a dial setting, calls the API, and renders
  Markdown, preambles, redactions, and denial forms.
- **Cloudflare Worker:** validates HTTP requests and coordinates the processing pipeline.
- **Workers AI:** first classifies the input, then generates a structured addendum.
- **Cloudflare D1:** caches classifications and entries and provides a basic IP-based
  uncached-generation limit.
- **Vue archive view:** browses saved D1 entries and renders selected addendums.

## High-level flow

```text
User input
  -> frontend request
  -> code-only pre-check
  -> AI classification
  -> deterministic ethics policy
  -> entry cache lookup
  -> tiered AI generation
  -> output validation
  -> D1 cache
  -> rendered addendum or denial
```

The model does not make ethics decisions. Pure code decides validity, subject type,
species approval, settings approval, and whether named living subjects are allowed.
The model assembles text from canonical inputs and code-selected prompt blocks.

See [REQUEST_PIPELINE.md](./REQUEST_PIPELINE.md) for the complete layer-by-layer flow.
