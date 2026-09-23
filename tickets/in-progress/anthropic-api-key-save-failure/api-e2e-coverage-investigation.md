# API/E2E Coverage Investigation — Anthropic credential save

## Investigation Meta
- Round: 1, initial; trigger: IR-001 implementation complete at bb4f0fc4e.
- Authoritative upstream: `requirements-doc.md` (approved REQ-001–004/AC-001–004), `investigation-notes.md`, `solution-revision-record.md` SR-004, `design-spec.md`, `handoff-result.md`, `implementation-handoff.md`, `implementation-revision-record.md` IR-001; diagnostic `evidence/ui-probe-summary.json` and before/after screenshots. All relative paths here are in this ticket directory.
- Independent architecture/source review and behavior-defining Product supplement: N/A — not applicable, direct Small/Low route.
- Canonical ledger: `api-e2e-test-case-ledger.md`; report and API revision record to follow execution.

## Classification and basis
- Task size Small; architectural risk Low; input Direct Low-Risk; successful output Delivery; proportional test-code review `Not Required — direct low-risk route`.
- Changed production boundary: Nuxt/Pinia credential-status array ingress and immutable replacement upsert. Browser-rendered Settings journey and Apollo/backend response boundary are materially affected. Backend, GraphQL schema/resolver, vault, auth, Electron shell, worker/distributed paths and persisted format are unchanged. Static model catalog is preserved and independent.
- AC-001/003 require genuine success through browser plus genuine rejection feedback. AC-002 requires value-free status and isolated synthetic credential. AC-004 requires initial load, repeat save, refresh, unrelated provider rows and shared callers. The original isolated real-backend browser reproduction proved HTTP 200/configured=true followed by a read-only client error and false toast; implementation's mocked browser check does not close the real-backend gap.
- Legacy removal: implementation removes direct Apollo array alias and in-place index/push/sort; no compatibility wrapper seen. Persisted data transition `Not Affected`; unchanged vault and normal reader should show synthetic configured state after refresh, with no migration. Never mutate the live credential.

## Project execution discovery
| Path | Authority / finding |
| --- | --- |
| `autobyteus-web/AGENTS.md`, `autobyteus-server-ts/AGENTS.md` | Run Nuxt Vitest with `--run`, server Vitest with `run --no-watch`; stage files individually. |
| `autobyteus-web/README.md`, `package.json`, existing `tests/e2e/token-statistics-ui-probe.mjs` | Nuxt dev `pnpm dev --host 127.0.0.1 --port ...`, proxy via `BACKEND_NODE_BASE_URL`; playwright-core Chromium; repo uses standalone durable E2E probes and isolated service launches. |
| `autobyteus-server-ts/README.md`, `docs/modules/secret_management.md` | Build/server `dist/app.js --data-dir ...`; SQLite `DATABASE_URL`, `AUTOBYTEUS_SERVER_HOST`; sibling vault root key. Migrate new DB with Prisma deploy. Status is value-free. |
| `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts`, provider API-key component specs, `autobyteus-web/tests/e2e/` | Existing focused durable coverage and E2E placement. |
- Setup: isolated mkdtemp data root and DB, dynamically allocated loopback ports, owned backend and frontend child processes, English Chromium. Never use existing port 8000, production DB, user browser profile, or real Anthropic key. Synthetic key only. Remove owned DB/root key/processes after evidence capture. No external Anthropic request or identity required.
- Browser proves web-equivalent renderer path; no changed IPC/preload/window/packaging shell behavior, so actual Electron execution is unwarranted.

## Existing durable coverage inventory and validity
| Path / scenario | Decision | Evidence and action |
| --- | --- | --- |
| `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts` frozen read/repeated Anthropic save, rejection | Still Valid | Correct approved state update and AC-001/004 at store boundary; execute. Extend for shared Qwen/Gemini/custom caller paths if current assertions are absent. |
| `autobyteus-web/components/settings/providerApiKey/__tests__/providerSettingsApolloContract.spec.ts` rendered component over frozen query, failure then success | Still Valid | Covers rendered semantics with mocked GraphQL, not vault; execute. |
| `autobyteus-web/components/settings/providerApiKey/__tests__/useProviderApiKeySectionRuntime.spec.ts` failure feedback | Still Valid | Valid AC-001 negative path; execute. |
| Existing `autobyteus-web/tests/e2e/*` unrelated probes | Out Of Scope | No credential save probe; use same standalone pattern for durable browser case or a focused executable harness. |
- Stale/removal decisions: none. No existing assertion conflicts with approved behavior.

## Coverage actions and execution plan
- Add durable coverage for shared upsert via Qwen, Gemini and custom-provider mutation result shapes in `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts`, if feasible without large fixture setup. This directly guards all common callers after a read-only initial load.
- Add a focused durable browser probe under `autobyteus-web/tests/e2e/provider-api-key-save-probe.mjs` with isolated server/browser lifecycle if feasible; otherwise record an explicit temporary-probe rationale and retain unit regressions. No browser probe should read or log synthetic key values.
- Execute narrow focused Vitest (four relevant files), then relevant build/guards if not already covered by implementation; independently verify real API before/after and browser state including repeated save, refresh, unrelated provider status and injected genuine rejection. Logs/screenshots/summary in ticket `evidence/api-e2e/`.

## Ledger plan
| Case ID | Journey / surface | AC |
| --- | --- | --- |
| API-CASE-001 | Repository focused regression and shared-caller checks | AC-001, AC-004 |
| API-CASE-002 | Isolated real backend API/status and browser first/repeated save plus refresh | AC-002, AC-003, AC-004 |
| API-CASE-003 | Browser genuine mutation rejection (intercepted rejection only), retain input/status | AC-001 |
| API-CASE-004 | Broader guards/build and cleanup verification | AC-002, AC-004 |

## Initial decision
- Proceed: Yes. Real-backend browser validation Required, because repository coverage mocks GraphQL/vault and original failure appeared only in realistic cross-boundary execution.
- Post-repository confidence scorecard and final broader decision will be filled after the relevant repository execution; no score is inferred from the implementation's checks alone.

## Repository result and mandatory post-repository confidence gate
- `pnpm test:nuxt tests/stores/llmProviderConfigStore.test.ts components/settings/providerApiKey/__tests__/providerSettingsApolloContract.spec.ts components/settings/providerApiKey/__tests__/useProviderApiKeySectionRuntime.spec.ts components/settings/__tests__/ProviderAPIKeyManager.spec.ts --run` from `autobyteus-web`: **Pass**, 4 files/35 tests; evidence `evidence/api-e2e/focused-vitest.log`. Existing Apollo/Vue fixture warnings are non-failing. New shared-caller Qwen/Gemini/custom test passed. No stale test removed.
| Category | Post-repository score | Basis / remaining gap |
| --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | Mocked AC-001/004 covered; real-backend AC-002/003 and refresh still pending. |
| Changed-boundary execution directness | 90% | Actual changed Pinia store path exercised, including frozen ingress and all callers; browser bundling pending. |
| Cross-boundary integration realism and mock gap | 75% | GraphQL/vault mocked in focused tests. |
| Environment, configuration, identity, fixture fidelity | 75% | Synthetic fixture safe; no independent isolated runtime yet. |
| Failure, edge-case, lifecycle, recovery evidence | 90% | Genuine rejected mutation and repeats covered in unit/component; browser failure/refresh pending. |
| User-surface/browser/desktop-shell confidence | 75% | Mounted component and implementation mock-browser evidence; real web-equivalent browser pending; shell unchanged. |
| Durable regression coverage quality/relevance | 90% | Focused frozen-array and shared-caller tests; durable real-browser probe pending. |
- Overall: **81.4%** (simple average, 570/7). Critical AC-002/003 not directly proven; multiple categories below 90%, so no Pass. Broader validation **Required**: isolated real GraphQL/vault + Chromium journey; should lift cross-boundary and browser scores to at least 95% if successful. Browser mode is relevant to the web-equivalent renderer; Electron shell not changed or required.

## Final investigation update after executable evidence
- Durable coverage **updated**: `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts` now asserts Qwen, Gemini and custom-provider result publication after a read-only initial load, preserving unrelated rows and value-free statuses.
- Durable coverage **added**: `autobyteus-web/tests/e2e/provider-api-key-save-probe.mjs`, registered as `pnpm test:e2e:provider-api-key-save` in `autobyteus-web/package.json`. It builds the worktree server by default, migrates a temporary SQLite DB, runs loopback backend/Nuxt/Chromium, checks genuine rejection feedback via one intercepted GraphQL error, then exercises two real vault saves and refresh, asserts unrelated OpenAI false and value-free response/status, and cleans its processes/temp root. No stale test was removed.
- Broader validation result: **Pass** in both initial manual-worktree-build run and self-contained package-command recheck; latest `evidence/api-e2e/browser-recheck/result.json`. First save and repeat return HTTP 200/configured=true, immediate Configured/success/cleared input, refresh still Configured, no post-success read-only error. Browser screenshots were visually inspected. Genuine rejection retains input/Not Configured and does not write backend status.
- Additional repository checks: worktree server build and sanitized bootstrap smoke passed; both web guards and Nuxt production build passed; `git diff --check` and `node --check` passed. Evidence: `evidence/api-e2e/server-build.log`, `repository-checks.log`, `browser-recheck/server-build.log`. Independent broad `tsc --noEmit` remains non-green per IR-001 (913 pre-existing repository errors); not treated as a passed gate or rerun here.
- Remaining bounded uncertainty: the negative browser case injects an actual GraphQL error response instead of inducing a vault failure; this directly validates the frontend rejection path but not operational backend failure production. Live user key validity and Electron shell are outside approved scope and were intentionally not tested.
- Final confidence recommendation after broader validation: categories 95/100/95/95/90/95/95 = **95.0%** average, minimum 90%; all critical ACs directly proven at the relevant boundary. The 90% failure category reflects simulated server rejection. No material unresolved broader-validation risk for this frontend-only fix.
- Final reroute trigger: None. Proceed to report and direct Delivery handoff after canonical artifacts are persisted.
