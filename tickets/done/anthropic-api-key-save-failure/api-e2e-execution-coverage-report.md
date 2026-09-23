# API/E2E Execution Coverage Report — Anthropic credential save

## Execution round and route
- Round: 1, `API-REV-001`; result: **Pass**; final confidence: **95.0%**.
- Trigger: implementation IR-001 at commit `bb4f0fc4e` on `requirements/anthropic-api-key-save-failure`.
- Assigned worktree: `/home/autobyteus/workspace/.codex/worktrees/anthropic-api-key-save-failure`.
- Upstream canonical package (same ticket directory): `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md` SR-004, `design-spec.md`, `handoff-result.md`, `implementation-handoff.md`, `implementation-revision-record.md` IR-001. Diagnostic supplement: `evidence/ui-probe-summary.json` and before/after PNGs. Behavior-defining Product supplement, independent architecture review and source review: **N/A — not applicable**.
- Coverage artifacts: `api-e2e-coverage-investigation.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md` (same ticket directory). Investigation preceded durable edits and execution. No prior API/E2E result existed; prior result/confidence N/A.
- Routing classification preserved: `task_size=Small`, `architectural_risk=Low`, Direct Low-Risk input, successful output Delivery. Proportional test-code review: **Not Required — direct low-risk route**.

## Investigation and compatibility basis
- Approved REQ-001–004/AC-001–004 require truthful immediate success and configured state, genuine rejection feedback, value-free/write-only credential handling, refresh persistence, repeated save and unrelated-row preservation.
- Actual changed production surface is Pinia credential-list ownership/update; GraphQL, resolver, vault, persisted representation, UI markup and desktop shell are unchanged.
- No compatibility-only wrapper, legacy alias path or dual list publication was observed. Approved persisted-data decision **Not Affected** was followed; no migration or version-specific fallback. The unchanged normal reader observed the newly saved synthetic status after refresh. No live Anthropic credential was read or overwritten.
- Existing focused store/component regressions remained valid; no stale tests removed. Execution followed the investigation plan. The only material plan refinement was registering the new browser probe as a named package command and rerunning it from a clean generated-contract state.

## Ledger reconciliation and changed-boundary evidence
| Case | AC / boundary | Final result | Primary evidence |
| --- | --- | --- | --- |
| API-CASE-001 | AC-001/004; frozen Apollo read, shared Qwen/Gemini/custom callers, rejection/component | Pass | `evidence/api-e2e/focused-vitest.log` — 4 files, 35/35 tests |
| API-CASE-002 | AC-002/003/004; isolated real GraphQL/vault save, repeat, refresh, unrelated OpenAI row | Pass | `evidence/api-e2e/browser-recheck/result.json`, before/after PNGs, backend/frontend logs |
| API-CASE-003 | AC-001; browser GraphQL rejection | Pass | Same result JSON — failure alert, retained input/Not Configured, backend unchanged |
| API-CASE-004 | Guards/build/process and fixture cleanup | Pass | `evidence/api-e2e/repository-checks.log`, server-build logs, result JSON cleanup |
- Ledger initialized before execution; all completed cases and long-running build checkpoint were recorded. Last event is the self-contained API-CASE-002/003 recheck, Pass. No running, blocked or unstarted cases. Ledger reconciled here.

## Repository and broader execution
| Order | Exact command / mode | Result | Evidence / note |
| --- | --- | --- | --- |
| 1 | From `autobyteus-web`: `pnpm test:nuxt tests/stores/llmProviderConfigStore.test.ts components/settings/providerApiKey/__tests__/providerSettingsApolloContract.spec.ts components/settings/providerApiKey/__tests__/useProviderApiKeySectionRuntime.spec.ts components/settings/__tests__/ProviderAPIKeyManager.spec.ts --run` | Pass | 4 files, 35 tests; existing non-failing Apollo/Vue fixture warnings in `focused-vitest.log`. |
| 2 | From worktree root: `pnpm -C autobyteus-server-ts build` | Pass | Builds shared contracts, Prisma client, server; sanitized bootstrap smoke passed; `server-build.log`. |
| 3 | From `autobyteus-web`: `node tests/e2e/provider-api-key-save-probe.mjs --output-dir=<ticket>/evidence/api-e2e/browser` | Pass | First isolated live run; `browser/result.json`. |
| 4 | From worktree root: `pnpm -C autobyteus-web guard:web-boundary && pnpm -C autobyteus-web guard:localization-boundary && pnpm -C autobyteus-web build && git diff --check` | Pass | Both guards, client/SSR/prerender build, diff check; `repository-checks.log`. |
| 5 | From `autobyteus-web`: `pnpm test:e2e:provider-api-key-save --output-dir=<ticket>/evidence/api-e2e/browser-recheck` | Pass | Named durable command independently rebuilt server and repeated all browser/API checks after generated-contract cleanup; latest `browser-recheck/result.json`. |
| 6 | `node --check autobyteus-web/tests/e2e/provider-api-key-save-probe.mjs` | Pass | Script syntax. |
- Standalone `tsc --noEmit -p tsconfig.json` was not rerun; IR-001 reports 913 broad existing errors. This is not claimed green. Relevant Nuxt production build and focused runtime tests passed.

## Real system journey and fixture fidelity
- Runtime: Linux arm64, Node v22.23.2, Nuxt 3.21.1/Vue 3.5.28, headless `/usr/bin/chromium`, 1440×900, English, UTC.
- Each browser run generated a fresh private temp data root and SQLite database, migrated it with the project's Prisma deploy command, started worktree-built server on an ephemeral loopback port with `DATABASE_URL=file:<temp-db>` and separate sibling vault key, then started worktree Nuxt with `BACKEND_NODE_BASE_URL` pointing only to that backend. Readiness used `/rest/health` and Settings HTTP. No external Anthropic call or real account was needed.
- Before: direct status read and browser badge reported Anthropic false/Not Configured; OpenAI false. The first browser command received an injected GraphQL error response only for `SaveProviderApiKey`; browser displayed the failure alert, kept its input and Not Configured, and direct backend status remained false. This simulates a genuine rejected mutation at the transport boundary; it does **not** claim an operational vault failure was produced.
- After removing interception: first and repeated synthetic Anthropic saves went to the **real isolated backend**, each returned HTTP 200 with `apiKeyConfigured=true`, and immediately produced the Configured badge, success notification, empty input and no false failure. Normal direct status read and browser refresh remained configured. OpenAI stayed false. Read and save responses had no credential value field; no post-success read-only mutation console error occurred. Diagnostic screenshots were inspected visually and match the existing UI language.
- Browser mode proves the web-equivalent renderer, client/GraphQL/vault path and refresh. Electron IPC/preload/window/packaging behavior was unchanged and not executed; actual desktop launch would not materially improve this local frontend-state confidence.

## Confidence scorecard
| Category | Post-repository | Final | Final basis / residual uncertainty |
| --- | ---: | ---: | --- |
| Requirement and AC proof | 75% | 95% | AC-001–004 shown by real success/refresh, value-free response and rejection branch; user's actual key intentionally untested. |
| Changed-boundary execution directness | 90% | 100% | Frozen-array store regression plus actual browser save through the changed store path, twice. |
| Cross-boundary realism and mock gap | 75% | 95% | Real Nuxt proxy, GraphQL resolver, encrypted vault and normal status read; negative rejection is injected. |
| Environment/configuration/identity/fixture fidelity | 75% | 95% | Fresh isolated SQLite/root key and worktree-built backend/frontend with normal dev proxy; no user production data. |
| Failure/edge/lifecycle/recovery evidence | 90% | 90% | Rejection, repeat save and refresh exercised; real operational vault failure not induced. |
| User surface/browser/desktop-shell | 75% | 95% | Semantic DOM assertions and inspected screenshots; shell is out of changed scope. |
| Durable regression coverage quality/relevance | 90% | 95% | Store shared-caller regression and self-contained named browser E2E command; no stale coverage. |
- Calculation: simple average of seven applicable categories; post-repository 81.4% (570/7), final **95.0%** (665/7). Minimum final category 90%. Every critical AC directly proven at the relevant boundary. Default clean-confidence target met; no material broader-validation risk remains.
- Broader validation decision was **Required**; browser + live isolated API selected to close the original mocked/real-backend gap. It succeeded. No blocked dependency.

## Durable coverage and other artifacts
- Updated durable test: `/home/autobyteus/workspace/.codex/worktrees/anthropic-api-key-save-failure/autobyteus-web/tests/stores/llmProviderConfigStore.test.ts` — Qwen/Gemini/custom shared-caller results after read-only initial credential load.
- Added durable browser test: `/home/autobyteus/workspace/.codex/worktrees/anthropic-api-key-save-failure/autobyteus-web/tests/e2e/provider-api-key-save-probe.mjs` — isolated API/browser journey and cleanup.
- Updated test entrypoint: `/home/autobyteus/workspace/.codex/worktrees/anthropic-api-key-save-failure/autobyteus-web/package.json` — `test:e2e:provider-api-key-save`.
- Removed tests: None. Temporary executable scaffolding: None beyond the durable probe's owned runtime. Only the rejection response is emulated; real successful saves and reads use the actual isolated backend/vault.
- Evidence retained: `evidence/api-e2e/focused-vitest.log`, `server-build.log`, `repository-checks.log`, `browser/` and `browser-recheck/` result JSON, logs and screenshots. The latest self-contained recheck is authoritative; the first run corroborates it.

## Cleanup and residual risk
- The probe terminated only its owned frontend/backend children, closed its Chromium context and removed its temp SQLite DB/root key/data root in both runs; result JSON records cleanup. No user process/port/profile or live credential was touched. Generated untracked SDK/server `dist` directories from our worktree build were removed afterward. Evidence remains in the ticket.
- Bounded residual: a synthetic GraphQL rejection, not a true vault outage, proves the existing UI failure branch. The live user's key identity/validity and Electron shell were intentionally out of scope. Standalone broad typecheck remains an upstream pre-existing non-green gate; no changed-line diagnostic was reported by implementation.
- Preliminary failure classification: N/A; no failure. Recommended recipient: exact `get_handoff_rules` Pass recipient for direct Small/Low package (expected Delivery).

## Latest authoritative result
**Pass — 95.0% confidence; broader validation Required and completed.** No applicable category below 90%; AC-001–004 proven; proportional test-code review **Not Required — direct low-risk route**. Route the complete cumulative package to Delivery using the exact handoff-rule recipient.
