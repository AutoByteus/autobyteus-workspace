# API/E2E live probe evidence

Temporary validation `BROWSER-TOK-001` used the project server CLI and Nuxt development path against an isolated SQLite data root. The probe seeded one AutoByteus custom-provider composite model and one Codex model, then navigated the real `/settings` route with Playwright/Chrome, selected Token Statistics, and switched Task -> Model grouping.

- `live-graphql-response.json`: direct live GraphQL response including raw `llmModel`, provider-aware `modelDisplayName`, task arrays, and startup migration status.
- `browser-result.json`: semantic browser assertions, GraphQL response statuses, grouping state, and visible table text.
- `token-usage-task.png`: rendered Task table screenshot.
- `token-usage-model.png`: rendered Model table and chart screenshot.
- `provider-fixture.json`: isolated custom-provider metadata used by the run; contains no credentials.

The temporary backend data root was `/tmp/token-statistics-custom-provider-browser-pw0Zay`; it was removed after the run. The screenshots, response, and result JSON are retained as reviewable evidence.
