# Project documentation

This directory describes the current SCP-914 simulator implementation for developers
and AI coding agents.

- [Developer reference](./DEVELOPER_REFERENCE.md) - setup, Cloudflare integrations,
  development commands, deployment, troubleshooting, and extension points.
- [Overview](./OVERVIEW.md) - system purpose and high-level architecture.
- [Request pipeline](./REQUEST_PIPELINE.md) - every layer from user input to addendum.
- [Frontend](./FRONTEND.md) - Vue interface, API calls, Markdown, and redactions.
- [Server](./SERVER.md) - Worker routing and module responsibilities.
- [AI and prompts](./AI_AND_PROMPTS.md) - classifier, generator, tiers, and validation.
- [Policy](./POLICY.md) - pre-checks, ethics decisions, and denial entries.
- [Caching and configuration](./CACHING_AND_CONFIG.md) - D1, keys, rate limits, and bindings.
- [API contract](./API_CONTRACT.md) - request and response types.
- [Testing](./TESTING.md) - unit tests and validation commands.
- [Architecture index](./ARCHITECTURE.md) - compatibility index for older links.
- [Classification specification](../scp-914-classification-layer-spec.md) - original
  feature requirements and behavior contract.

For setup and deployment commands, see the repository [README](../README.md).
