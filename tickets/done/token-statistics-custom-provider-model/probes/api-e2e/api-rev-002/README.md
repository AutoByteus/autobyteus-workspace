# API/E2E API-REV-002 evidence

This directory retains reviewable evidence from API/E2E revision `API-REV-002`.

- `live-graphql-before-provider-delete.json`: live GraphQL response after isolated production startup, including Migration A/B status and provider-aware Model/Task labels.
- `live-graphql-after-provider-delete.json`: the same live query after deleting the configured custom-provider file; the persisted `alibaba_cloud` label remains stable.
- `persisted-rows-before-provider-delete.json`: direct Prisma read proving Migration A normalized `model_value`, Migration B persisted `provider_name`, and Codex remained nullable; accounting values are unchanged.
- `provider-fixture.json`: secret-free custom-provider metadata used to recover `alibaba_cloud`.
- `browser-result.json`: semantic Chrome assertions and the four live backend GraphQL HTTP responses observed by the Nuxt Settings route.
- `token-usage-task.png`: rendered Task grouping.
- `token-usage-model.png`: rendered Model grouping and chart.

The probe used an isolated temporary SQLite/data root, loopback backend port `38301`, and Nuxt port `38302`. The backend, frontend, browser, temporary scripts, provider file, and data root were stopped or removed after capture. External provider calls and Electron packaging were not exercised.
