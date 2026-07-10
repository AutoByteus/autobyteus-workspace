# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models/tickets/in-progress/openai-new-api-models/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models/tickets/in-progress/openai-new-api-models/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models/tickets/in-progress/openai-new-api-models/design-spec.md`
- Supplemental Solution Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models/tickets/in-progress/openai-new-api-models/codex-cache-write-probe.md` (`Complete — factual evidence`).
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models/tickets/in-progress/openai-new-api-models/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models/tickets/in-progress/openai-new-api-models/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models/tickets/in-progress/openai-new-api-models/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models/tickets/in-progress/openai-new-api-models/api-e2e-coverage-investigation.md`
- Current Execution Round: `2`
- Trigger: Revised `REQ-011`, `AC-013`, `AC-014`, `DS-006`, supplemental Codex probe, reconciliation commit `96f73433a5ddc5e05d343b04d3852d1825b90234`, current handoff `df071972`, and source-review round-2 pass.
- Prior Round Reviewed: `1`; all prior results were treated as historical reconciliation evidence and rerun where still material.
- Latest Authoritative Round: `2`.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Original GPT-5.6 catalog/direct-API/accounting scope | N/A | No product/test failure | Historical Pass | No | Reached 96.3%; superseded by the Codex observability requirement expansion. |
| 2 | Codex source-truth/no-fabrication reconciliation | Round-1 entitlement/raw-write residual and current-package repository boundaries rechecked | No product/test/design failure | Pass | Yes | Current protocol still lacks a write field; deterministic and conditional-live criteria pass at 96.6%. |

## Investigation And Execution Basis

- Coverage investigation artifact: canonical path above, updated in place for round 2.
- Investigation completed before durable coverage changes or final execution: `Yes`.
- Investigation plan followed: `Yes`; no material deviation.
- Existing coverage decisions revised during execution: `No`. The two reconciliation suites remained valid after both supported generated protocols showed no cache-write field. No API/E2E-authored durable change was needed.
- Reroute required before or during execution: `No`.
- Notes: Exact generated keys, versions, file counts, and hashes were captured before repository execution. `raw_event_json.autobyteus_cumulative_snapshot_provider_delta_tokens` was treated only as AutoByteus reconciliation metadata, never as an upstream Codex field.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`.
- Compatibility-only or legacy-retention behavior observed in implementation: `No`.
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`.
- Durable coverage added or retained only for compatibility-only behavior: `No`.
- If compatibility-related invalid scope was observed: N/A.
- Upstream recipient notified: N/A.

## Changed Boundary And Evidence Matrix

| Scenario ID | Requirement / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| `OFFICIAL-001` | `REQ-001`-`006`; `AC-001`, `004`-`006` | Current model/pricing/cache contract and composed rates | Official OpenAI developer pages | Live | Pass | `evidence/official-openai-gpt56-contract-round2-2026-07-10.md` |
| `CODEX-PROTO-001` | `REQ-011`; `AC-013`, `014`; `DS-006` | Current supported Codex app-server token protocol | PATH and Codex.app `generate-ts` | Temporary | Pass | Exact five-field breakdown, `total`/`last` envelope, zero write-key matches, identical hashes: `evidence/codex-generated-protocol-round2-2026-07-10.md` |
| `CODEX-001` | `REQ-011`; `AC-013`, `014`; `DS-006` | Codex source truth -> resolver/backend enrichment | Focused server Vitest | Durable | Pass | 2 files, 31 tests; `evidence/round2-codex-no-fabrication-focused.log` |
| `CODEX-UI-001` | `REQ-011`; `AC-014` | Null source write despite trusted write price -> no write cost -> generic null/zero frontend state has no write row | Backend plus rendered Nuxt component | Durable | Pass | Backend assertion in `CODEX-001`; zero/absent row assertion in `UI-002` |
| `LIVE-001` | `AC-001`; `REQ-008` | Credential validity/model listing | Authenticated `GET /v1/models` | Live | Pass | HTTP 200; filtered GPT-5.6 list empty in `evidence/live-openai-gpt56-round2-2026-07-10.json` |
| `LIVE-002` | `REQ-007`, `008`; `AC-010` | Exact canonical Responses requests | Authenticated `POST /v1/responses` for all three exact IDs | Live | Pass | Conditional `AC-010` branch: three exact HTTP 404 `model_not_found` limited-preview errors retained; successful execution is not claimed |
| `LIVE-003` | `REQ-006`; `AC-008`, `010` | Real raw cache-write/read usage | Conditional repeated-prefix Responses probe | Live | Not Tested | Correctly skipped because no minimal GPT-5.6 request succeeded; no raw payload fabricated |
| `LIB-001` | `REQ-001`-`009`; `AC-002`-`009` | Catalog, metadata, factory, request, direct-API normalizer | Focused `autobyteus-ts` Vitest | Durable | Pass | 5 files, 36 tests; `evidence/round2-autobyteus-ts-gpt56-focused.log` |
| `APIE2E-001` | `REQ-004`, `005`, `010`; `AC-006`, `011` | Real catalog -> server basis/delta/cost -> `TOKEN_USAGE_UPDATED` message -> ledger -> GraphQL | Server E2E with Prisma/GraphQL | Durable | Pass | Standard and `>272K` cases, exact four components/no double count, 2 tests; `evidence/round2-server-gpt56-accounting-e2e.log` |
| `APIE2E-002` | `REQ-010`; `AC-011` | Live snake-case payload -> Pinia summary -> equivalent hydrated summary | Nuxt store test | Durable | Pass | Generic write tokens, unit price, write/input/total cost converge; `evidence/round2-web-token-usage-focused.log` |
| `UI-001` | `REQ-010`; `AC-012` | Positive write-only Token Meter state | Nuxt rendered component | Durable | Pass | Tokens, server price, cost, accessible toggle, and accepted empty neighboring `Cache hits` row pass |
| `UI-002` | `REQ-010`, `011`; `AC-012`, `014` | Zero/absent write state and mixed/missing price state | Nuxt rendered component | Durable | Pass | Null/zero write produces no write row; mixed state remains non-numeric |
| `REG-001` | `AC-009`, `013`, `014` | Broader server token-usage and Codex owners | Server unit/integration/E2E directories plus focused Codex files | Durable | Pass | 17 files, 84 tests; `evidence/round2-server-affected-suite.log` |
| `REG-002` | `AC-009`, `012`, `014` | Broader frontend token-usage owners | Six Nuxt test files | Durable | Pass | 6 files, 27 tests; `evidence/round2-web-token-usage-affected-suite.log` |
| `BUILD-001` | `AC-009`, `014` | Library/server/web packaging | Three production builds | Durable | Pass | Three round-2 build logs under `evidence/` |

## Additional Repository Coverage Execution

The coverage investigation contains the authoritative command matrix. No repository command was added after its final post-repository scoring. The following diagnostic was also executed and is not a package failure:

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm --dir autobyteus-server-ts typecheck` | worktree; repository `tsconfig.json` | Recheck the recorded repository-wide typecheck limitation for any task-specific diagnostic | Baseline limitation confirmed: exit 2, 519 `TS6059` diagnostics only, caused by `rootDir: src` with `include: [src, tests]`; production `build:full` passes | `evidence/round2-autobyteus-server-ts-typecheck.log` |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | ---: | ---: | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 96% | 97% | +1 | Official contract/rates and exact conditional entitlement outcome were freshly rechecked; current generated protocol closes `AC-013` | Successful entitled direct calls unavailable |
| Changed-boundary execution directness | 98% | 98% | 0 | Direct current-protocol, resolver/backend, catalog/server/ledger/GraphQL/store/component execution | Provider success/raw usage unavailable |
| Cross-boundary integration realism and mock gap | 96% | 96% | 0 | Real SQLite/GraphQL and Nuxt execution plus direct external endpoint and installed-protocol checks | No successful provider/Codex write payload |
| Environment, configuration, identity, and fixture fidelity | 93% | 95% | +2 | Actual configured credential, two installed Codex binaries, project-migrated SQLite, and production builds were used | Credential lacks GPT-5.6 rollout entitlement |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | 96% | 0 | Both tiers, no-double-count, null/no-inference/no-write-cost, nested zero, absent/mixed UI, persistence, and cleanup pass | No provider-side successful cache write/read lifecycle |
| User-surface, browser, and desktop-shell confidence | 96% | 96% | 0 | Required rendered DOM/accessibility states pass; web production build passes; no renderer/shell production change | No manual browser pixel check, judged immaterial |
| Durable regression coverage quality and relevance | 98% | 98% | 0 | Requirement-linked composed/server/store/Codex suites plus broader affected suites pass | Live rollout/protocol snapshots cannot be durable CI coverage |

- Overall post-repository confidence: `96.1%`.
- Overall final confidence: `96.6%`.
- Calculation method: simple mean of seven applicable categories, rounded to one decimal (`676 / 7 = 96.57%`).
- Confidence change produced by broader validation: `+0.5 percentage points`.
- Every critical acceptance criterion directly proven: `Yes`, including the approved conditional unentitled branch of `AC-010` and the no-field/no-fabrication branch of `REQ-011`/`AC-013`/`AC-014`.
- Any final applicable category below `90%`: `No`.
- Default final confidence target of `95%` met: `Yes`.
- Confidence-limiting residual risks: successful GPT-5.6 direct calls/raw `cache_write_tokens` remain entitlement-limited; current Codex upstream protocol still cannot expose internal cache-write counts; repository-wide server `typecheck` remains baseline-limited by TS6059 while production `build:full` passes.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Required` — official-contract verification, generated Codex protocol, and authenticated live OpenAI API.
- Material deviation from the planned mode or rationale: None. Conditional cache probing stopped exactly as planned after all three minimal calls were rejected for entitlement.
- Confidence gap or residual risk actually addressed: official rates/rules did not drift; both installed supported Codex protocols still lack any cache-write field; the configured API key is valid but the current organization has no GPT-5.6 list visibility or invocation entitlement.
- Browser validation: `Not Required`. No frontend production path changed; the relevant Nuxt rendered DOM/accessibility states, generic null/no-row state, live/hydrated store convergence, and production web build all passed. A manual browser run would not execute a different changed owner.
- Startup order, commands, and readiness results: rechecked official pages; generated TypeScript from PATH and Codex.app binaries into isolated temp trees; copied the main-repository `autobyteus-ts/.env.test` with mode `0600`; authenticated model list returned HTTP 200; sent three minimal `store=false`, 16-output-token Responses requests; removed the environment copy and generated trees.
- Environment choices: Sol used `reasoning.effort=max`; Terra and Luna used `none`; no API key or response output text was retained.
- Seed data/authentication: configured main-repository OpenAI test credential; deterministic repeated-prefix fixture was prepared but not sent because entitlement was absent.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Recheck official Sol/Terra/Luna model pages and guides | Exact three IDs, limits, rates, `>272K` multipliers, 1.25x write rate, Responses support, effort/default rules remain current | Contract and composed rates unchanged | `evidence/official-openai-gpt56-contract-round2-2026-07-10.md` | Pass |
| Generate current PATH Codex protocol | No write field means retain approved null/no-inference behavior; any write field would trigger Design Impact | `codex-cli 0.144.1`, 671 files; five source fields, zero write-key matches | protocol evidence | Pass |
| Generate current Codex.app resource protocol | Same drift gate for the packaged supported binary | `codex-cli 0.144.0-alpha.4`, 671 files; identical relevant hashes and zero write-key matches | protocol evidence | Pass |
| Authenticated OpenAI model list | Valid credential; GPT-5.6 presence depends on entitlement | HTTP 200; no GPT-5.6 IDs | live JSON | Pass |
| Minimal Sol Responses request with `max` | Success if entitled, otherwise exact entitlement evidence | HTTP 404 `model_not_found`; limited preview unavailable on this account; suggests GPT-5.5 | live JSON | Pass under conditional `AC-010`; success unverified |
| Minimal Terra/Luna Responses requests | Same conditional result | Same exact HTTP 404 entitlement result for each exact ID | live JSON | Pass under conditional `AC-010`; success unverified |
| Repeated-prefix cache probe | Run only after a successful minimal call | Not run because none succeeded | live JSON `cacheProbe.attempted=false` | Not Tested |

## Desktop Application Validation

- Validation approach executed: Nuxt store/component tests and Nuxt production build; no Electron launch.
- Browser-tested web-equivalent behavior: Repository-rendered Nuxt DOM coverage, not an external browser process.
- Shell-specific or lifecycle behavior: None changed or applicable.
- Effect on any already-running desktop application: None.
- Behavior not directly proven and confidence consequence: packaged-shell pixel appearance; negligible because renderer and shell production code are unchanged.

## Platform / Runtime Targets

- Operating system / platform: macOS Darwin kernel `25.2.0`, Apple Silicon `arm64`.
- Runtime and relevant framework versions: Node `v22.23.1`; pnpm `10.28.2`; Nuxt `3.21.1`; Vue `3.5.28`; server Vitest `4.0.18`; web Vitest `3.2.4`; Prisma `5.22.0`; PATH Codex `0.144.1`; Codex.app resource `0.144.0-alpha.4`.
- Browser / engine and version: N/A; browser process not selected.
- Device, viewport, locale, timezone, accessibility settings: N/A; accessible disclosure contract asserted in Nuxt test; task timezone Europe/Berlin.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`.
- Representative existing data exercised: current generic cache-write ledger columns and current GraphQL reader accepted both newly priced GPT-5.6 tier cases.
- Direct-use result: Pass; server `TOKEN_USAGE_UPDATED` message values and ledger-backed GraphQL summaries converged without migration. The durable test directly exercises message mapping rather than a network WebSocket transport.
- Migration completion/recovery evidence: N/A.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`.
- Residual untested persisted-data risk: None material.

## Tests Implemented Or Updated

No durable test was authored or edited by API/E2E in round 2. The current round package contains these reconciliation updates from commit `96f73433`, and both passed after the protocol gate:

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` / `CODEX-001` | Updated before API/E2E entry | `REQ-011`; `AC-013`, `014`: upstream `tokenUsage`/`raw_usage_json` vs injected metadata | Pass — part of 31 focused and 84 broader tests | Exact source records contain no write key; injected canonical null is explicitly separate. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts` / `CODEX-001` | Updated before API/E2E entry | `REQ-011`; `AC-014`: no inference/no write cost | Pass — part of 31 focused and 84 broader tests | Input 10/read 4 -> standard 6, cache creation null; trusted 6.25 write price creates null write cost. |

Historical round-1 coverage remains valid and was rerun unchanged: `autobyteus-server-ts/tests/e2e/token-usage/gpt56-token-usage-accounting-graphql.e2e.test.ts` and `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts`.

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed in the round-2 current package: `Yes` — two upstream reconciliation test updates; API/E2E itself changed none.
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-new-api-models/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts`
- Paths removed: None.
- Added or updated paths attached for proportional test-code review: `Yes` in the round-2 handoff.
- Diff or repository evidence for removed paths: N/A.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `tickets/in-progress/openai-new-api-models/evidence/codex-generated-protocol-round2-2026-07-10.md` | Current generated-protocol evidence | Retained | Versions, exact types, write-key search, relevant hashes, source-vs-injected conclusion. |
| `tickets/in-progress/openai-new-api-models/evidence/official-openai-gpt56-contract-round2-2026-07-10.md` | Fresh official-contract/rate evidence | Retained | Includes explicit composed-rate arithmetic. |
| `tickets/in-progress/openai-new-api-models/evidence/live-openai-gpt56-round2-2026-07-10.json` | Sanitized live entitlement evidence | Retained | No secret or response output text. |
| `tickets/in-progress/openai-new-api-models/evidence/round2-*.log` | Current command evidence | Retained | Focused/broader tests, builds, and explicit baseline typecheck diagnostic. |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| PATH and Codex.app generated TypeScript trees | Current supported protocol drift gate | Protocol evidence file | Both trees removed; no generated protocol directory remains |
| Inline Node HTTPS probe using `dotenv`/`fetch` | Avoid secret exposure and retain sanitized response fields only | Live JSON | Script not persisted; temporary `.env.test` removed |
| `autobyteus-server-ts/tests/.tmp` SQLite | Project Vitest global setup | All final server suites pass | Directory removed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Successful GPT-5.6 usage payload | Deterministic raw direct-API fixtures in normalizer tests and deterministic generic server payload in E2E | Configured OpenAI organization lacks entitlement | Cannot claim a successful live raw `cache_write_tokens` payload |
| Codex token-usage notification | Exact generated-field-shaped fixtures drive real resolver/backend owners | Generated protocol has no write field and live upstream write count is unobservable | Cannot prove whether Codex internally writes cache; AutoByteus correctly does not fabricate or bill it |
| Other dynamic model providers during composed server E2E | Primed only the real static `gpt-5.6-sol` catalog row | Unrelated discovery is outside the changed boundary and introduces latency/flakiness | None for the reviewed GPT-5.6 catalog/pricing owner |

## Prior Failure Resolution Check

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `LIVE-002`/`LIVE-003`: entitled success/raw write unavailable | Approved conditional external residual, not a failure | Rechecked; unchanged exact account entitlement result | Round-2 live JSON | Remains permitted by `AC-010`; no success is claimed. |
| 1 | Initial generated Prisma client absence | Local environment setup, resolved within round 1 | Did not recur; current focused/broader server tests and `build:full` pass | Round-2 server/build logs | No product issue. |
| 1 -> 2 | Newly formalized Codex write observability concern | Requirement/design reconciliation | Current protocol generated from both supported binaries; no field exists; no design impact | Protocol evidence plus 31/84-test logs | Upstream limitation is preserved explicitly. |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | `OFFICIAL-001`, `CODEX-PROTO-001`, `CODEX-001`, `CODEX-UI-001`, `LIVE-001`, `LIVE-002`, `LIB-001`, `APIE2E-001`, `APIE2E-002`, `UI-001`, `UI-002`, `REG-001`, `REG-002`, `BUILD-001` | All critical deterministic, protocol-gated, and conditional-entitlement criteria pass with 96.6% confidence. |
| Not Tested | `LIVE-003` | Successful raw cache-write capture requires GPT-5.6 account entitlement, which remains unavailable. |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Copied `autobyteus-ts/.env.test` | This validation run | Removed immediately after live probe | Pass |
| Two generated Codex protocol trees | This validation run | Removed after extracting exact evidence | Pass |
| Server test SQLite under `autobyteus-server-ts/tests/.tmp` | This validation run/project test harness | Removed after final suite | Pass |
| UUID GPT-5.6 ledger rows | Durable composed E2E | Test `afterAll` deletes by run ID | Pass |
| Persistent local server/browser/desktop processes | None created | No action | N/A |

## Classification

`Pass`. No local implementation defect, test defect, design impact, requirement gap, or unresolved execution issue remains. External GPT-5.6 entitlement/raw-success and upstream Codex write invisibility are explicitly approved residuals, not fabricated successes or product failures. The repository-wide server `typecheck` limitation is the recorded pre-existing TS6059 configuration baseline; the authoritative production `build:full` passes.

## Recommended Recipient

`code_reviewer` for proportional review of the two round-2 reconciliation test-code paths.

## Evidence / Notes

- Both generated protocols expose only `totalTokens`, `inputTokens`, `cachedInputTokens`, `outputTokens`, and `reasoningOutputTokens`; `ThreadTokenUsage` contains `total`, `last`, and `modelContextWindow`.
- `tokenUsage.total`/`last` and selected `raw_usage_json` are upstream records. `raw_event_json.autobyteus_cumulative_snapshot_provider_delta_tokens` is AutoByteus-injected metadata; its null write entry is not source evidence.
- With no positive source write count, cache creation remains null, no write cost is calculated even when the trusted write price is 6.25, and the generic zero/absent frontend state renders no write row.
- The write-only `Cache hits` neighbor remains an accepted empty row exactly as reviewed; no materially different product expectation emerged.
- No server/frontend production file, alias, entitlement substitution, compatibility wrapper, SDK, provider-specific frontend branch, or browser cost computation was added during API/E2E.

## Latest Authoritative Result

- Result: `Pass`.
- Final validation confidence: `96.6%`.
- Default `95%` confidence target met: `Yes`.
- Any final applicable confidence category below `90%`: `No`.
- Broader validation decision: `Required and completed` for official contract, generated Codex protocol, and authenticated live API; browser `Not Required` after proportional evidence review.
- Critical acceptance criteria lacking direct proof: None under the approved conditional/no-field wording. Entitled live success and actual upstream cache-write counts remain explicitly unverified.
- Required next recipient: `code_reviewer` for proportional test-code review.
- Notes: The two updated Codex durable test paths must accompany the cumulative round-2 artifact package.
