# scp-914

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
pnpm install
```

### Compile and Hot-Reload for Development

```sh
pnpm dev
```

### Type-Check, Compile and Minify for Production

```sh
pnpm build
```

## SCP-914 classification pipeline

The Worker first performs code-only input pre-checks, then caches and validates an AI
classification, applies deterministic ethics policy, and caches the final structured
entry in Cloudflare D1. Prompt and cache invalidation is controlled by
`PROMPT_VERSION` in `server/constants.ts`.

- Edit approved species in `server/constants.ts`.
- Edit ethics denial variants in `server/denials.ts`.
- Edit detail-tier and living-subject prompt blocks in `server/ai.ts`.
- Set `BLOCK_HUMANS_ON_HARSH` in `server/constants.ts`; it defaults to `false`.
- D1 binding: `DB`; database schema migration:
  `pnpm wrangler d1 migrations apply scp914 --remote`

## Project documentation

Detailed architecture and maintenance guidance is available in
[docs/README.md](docs/README.md). Start with the
[architecture overview](docs/OVERVIEW.md) and
[request pipeline](docs/REQUEST_PIPELINE.md).
For setup and Cloudflare development instructions, use the
[developer reference](docs/DEVELOPER_REFERENCE.md).
