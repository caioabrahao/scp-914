# Frontend

## Framework

The frontend is Vue 3 in [src/App.vue](../src/App.vue). Vite builds it, and the
Cloudflare Vite plugin integrates it with the Worker.

The app has no client-side router state for the simulator. The main component owns:

- input text;
- dial index;
- loading and error state;
- canonical entry metadata;
- tier;
- preamble;
- body Markdown;
- denial reason and text.

## User controls

The interface offers:

- a text input;
- a five-position dial for Rough, Coarse, 1:1, Fine, and Very Fine;
- a Run SCP-914 button.

Navigation is provided by a persistent left sidebar. The testing view uses two
columns: controls on the left and the generated document or denial feedback on the
right.

The frontend sends the dial name and input text as JSON to `POST /api/`.

## Views

- `/` renders the SCP-914 simulator.
- `/addendums` renders the addendum archive.

The archive view loads saved entry summaries from `GET /api/addendums`, then loads
the full selected entry through `GET /api/addendums/:cacheKey`.
The archive uses a searchable sidebar for record selection and a reader pane for the
selected document. The API detail tier is internal and is not rendered to users.
Document headings use `Document 914/<number> - Experiment Log`, with the number padded
to at least three digits.

## Markdown rendering

The frontend uses:

- `marked` to convert Markdown to HTML;
- `DOMPurify` to sanitize generated HTML.

Sanitization is required because model-generated text becomes HTML on the client.

## Redactions

The model can mark key nouns with `⟦text⟧`. The frontend replaces the marked phrase
with a same-length black block and sets `role="img"` plus `aria-label="redacted"`.
There is no reveal-on-click behavior.

## Denials

Denial responses are rendered as a separate official-form state:

- monospace text;
- denial reason code;
- stamp-like `DENIED` label;
- pre-written text rather than a model response.
