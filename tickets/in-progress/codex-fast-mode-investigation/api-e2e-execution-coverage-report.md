# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/fast-mode-probe-report.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/solution-revision-record.md` (`SR-001`, `SR-002`)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/architecture-review-revision-record.md` (`ARCH-REV-001`)
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/implementation-revision-record.md` (`IR-001`)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/code-review-revision-record.md` (`CRR-001`, `CRR-002`)
- API/E2E Test Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-test-review-report.md` (`Fail`; `TEST-001` Local Fix)
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- Current Execution Round: `3`
- Trigger: explicit user request to start the real backend/frontend, import `/Users/normy/autobyteus_org/autobyteus-agents` through the browser, run Daily Assistant with Codex Fast, and validate the result like a real user using `open_tab`.
- Prior Round Reviewed: Round 2 / `API-REV-002` / `Pass / 96.9%`.
- Latest Authoritative Round: `3`

## Investigation And Execution Basis

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes` — Round 3's temporary real-browser plan was recorded before service startup. The canonical isolated stack, package import, Daily Assistant/Codex Fast journey, runtime-state/log correlation, and owned-resource cleanup were then executed exactly as planned.
- Existing coverage decisions revised during execution, with evidence:
  - `API-CAT-001` remains `Still Valid` after its completed Round 2 update and 1/1 live rerun;
  - the real browser journey remains a `Temporary Executable Probe Only`, now completed `Pass`, because the catalog boundary is already durable and no ticket-specific browser harness is justified;
  - Round 1's other full-suite Codex/repository coverage remains `Unclear / mixed`, and no failing broad scenario is used as proof of this feature.
- Reroute required before or during execution: `No`
- Notes: `TEST-001` remains resolved at commit `06bcb57cf365ebc6ba12aef4ba4472e091fcd066`. Round 3 changed no source or durable test, so no repository suite rerun was required. Its evidence is a real full-stack browser/runtime execution rather than a replacement for durable coverage.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`
- Production and live parity reference audit: no `additionalSpeedTiers` / `additional_speed_tiers` reference remains in production source or the live catalog integration. The focused unit test intentionally retains deprecated-only inputs as negative regression guards.

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| `API-UNIT-001` | `BEH-004`; `REQ-005`–`REQ-006`; `AC-006`–`AC-010` | Raw row normalizer and generic schema composition | Focused server Vitest | Durable | Pass — 10/10 | `api-e2e-evidence/01-normalizer-unit.log` |
| `API-CAT-001` | `BEH-004`; `DS-001`–`DS-002`; `AC-006`, `AC-010`; `CRR-002` / `TEST-001` | Real Codex `model/list` -> independent raw projection -> production catalog -> GraphQL | Live Codex integration, `RUN_CODEX_E2E=1` | Durable + Live | Pass — Round 2 focused target 1/1 under the corrected reasoning-and-Fast scenario name; same assertions passed in prior targeted/full runs | `api-e2e-evidence/16-round2-live-catalog-name-rerun.log`; `05-live-codex-catalog-graphql-positive.log`; `12-full-server-live-codex.log` |
| `API-RUNTIME-001` | Preserved `BEH-001`; `REQ-001`–`REQ-004`; `AC-001`–`AC-005` | Stored product `fast` -> bootstrap/start/resume/turn payload | Three focused server unit files plus upstream direct 0.151/0.152 probes | Durable + Temporary upstream evidence | Pass — 72/72 current unit assertions | `api-e2e-evidence/06-runtime-propagation-unit.log`; `fast-mode-probe-report.md` |
| `API-UI-001` | `UC-001`–`UC-003`; `BEH-005`; `REQ-007`; `AC-011` | Unchanged generic schema-driven form | Vue/Nuxt Vitest DOM/state | Durable | Pass — 29/29 | `api-e2e-evidence/09-generic-config-ui-unit-retry.log` |
| `API-BUILD-001` | `AC-010`–`AC-011`; clean-cut legacy removal | Production compilation/bootstrap and reference boundary | Server production build + static diff/reference audit | Durable executable/static | Pass | `api-e2e-evidence/10-server-production-build.log`; `11-diff-legacy-audit.log` |
| `API-BROWSER-001` | User-requested realistic-system extension; `UC-001`–`UC-003`; preserved `BEH-001`; `BEH-004`–`BEH-005` | Agent-package import -> live catalog Fast control -> frontend/backend/WebSocket -> Codex App Server turn -> persisted run metadata | Canonical `pnpm dev` plus real browser `open_tab` | Temporary Realistic-System | Pass — exact browser response `LIVE_FAST_BROWSER_OK`; status `Idle`; run metadata `service_tier: "fast"` | `api-e2e-evidence/19-round3-full-stack.log`; `20-round3-browser-runtime-audit.log`; browser screenshots |
| `API-REG-001` | Project-required broad Codex-ticket regression gate | Entire server repository, including live Codex suites | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts test -- --run` | Durable + Live | Fail overall — 63 files / 177 tests failed; 593 files / 3,414 tests passed; target catalog file passed | `api-e2e-evidence/12-full-server-live-codex.log`; `13-environment-and-full-suite-summary.log` |

### Scope Result Arbitration

`API-REG-001` is not a clean repository gate, but it does not invalidate the feature result:

1. The API/E2E repository code delta remains local to the live catalog test: Round 1 added the independent raw projection and positive precondition (`f6c16014f`), and Round 2 changed only its `it(...)` description (`06bcb57cf`). Neither has production or cross-test runtime effect.
2. The reviewed production delta is one model-row predicate; broad failures in application packages, file explorer, external channels, run history, media, and stale runtime test APIs are not causally reachable from it.
3. The exact changed-boundary catalog test passed again in Round 2 (1/1) with the corrected runner name, after passing in isolation twice and inside the Round 1 full run.
4. Critical acceptance criteria all have direct focused/live evidence. Therefore the feature result is `Pass`; the full-suite failures remain explicitly recorded repository health debt, not silently relabeled as passes.

## Additional Repository Coverage Execution

| Round | Scenario | Command / Check | Result | Evidence |
| --- | --- | --- | --- | --- |
| 3 | Stack setup/readiness | Confirm ports/state ownership, then `pnpm dev` | Pass — current stack built; backend/frontend ready at 8000/3000 with isolated development root | `api-e2e-evidence/19-round3-full-stack.log` |
| 3 | `API-BROWSER-001` | Real browser `open_tab`: remove bootstrap registration, import `/Users/normy/autobyteus_org/autobyteus-agents`, choose Daily Assistant -> Codex App Server -> GPT-5.6-Sol -> Fast, send exact-response prompt | Pass — actual browser rendered `LIVE_FAST_BROWSER_OK` and `Idle` | `api-e2e-evidence/20-round3-browser-runtime-audit.log`; screenshots |
| 3 | Runtime correlation | Inspect only isolated owned run metadata, raw trace, and server lifecycle log | Pass — same run records `runtimeKind: codex_app_server`, `llmConfig.service_tier: "fast"`, exact prompt/response, WebSocket attach, and run publication | `api-e2e-evidence/20-round3-browser-runtime-audit.log` |
| 3 | Cleanup | Close tab, interrupt owned launcher, verify ports, remove only paths absent before Round 3 | Pass | `api-e2e-evidence/21-round3-cleanup.log` |
| 2 | Setup | `pnpm -C autobyteus-server-ts prepare:shared` | Pass — exit 0 | `api-e2e-evidence/15-round2-prepare-shared.log` |
| 2 | `API-CAT-001` | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/integration/services/codex-model-catalog.integration.test.ts --no-watch` | Pass — 1 file / 1 test; executed, not skipped; output explicitly names reasoning and Fast capabilities | `api-e2e-evidence/16-round2-live-catalog-name-rerun.log` |
| 2 | Name/diff/legacy audit | `git diff --check`, exact-title grep, one-file diff inspection, deprecated-field grep | Pass — exactly one scenario-name line changed; no deprecated field in live test | `api-e2e-evidence/17-round2-name-diff-audit.log` |
| 2 | Cleanup | Remove exact shared-package generated outputs created by setup | Pass | `api-e2e-evidence/18-round2-cleanup.log` |

No repository suite was rerun in Round 3 because it changed no source, fixture, or durable coverage and instead executed the requested realistic system directly. Round 2's focused rerun and all Round 1 evidence, including the non-clean broad-suite result, remain preserved rather than overwritten.

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 100% | 100% | 0 | Every `AC-001`–`AC-011` behavior is directly covered by current focused/live evidence or approved preserved-behavior probes. | None material |
| Changed-boundary execution directness | 100% | 100% | 0 | Real `model/list`, positive structured `priority`, production catalog, and GraphQL parity. | None material |
| Cross-boundary integration realism and mock gap | 98% | 100% | +2 | Durable real catalog/GraphQL proof plus a real-browser Daily Assistant run traversed Nuxt, backend, WebSocket, persisted run metadata, and actual Codex App Server with no mock response. | None material for the requested path. |
| Environment, configuration, identity, and fixture fidelity | 95% | 98% | +3 | Canonical `pnpm dev`, current worktree build, fixed-port readiness, isolated development storage, real imported package, current CLI identity, and post-run cleanup were directly verified. | Full repository baseline remains non-clean; earlier focused runs required generated prerequisites. |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | 95% | +3 | Prior edge cases plus full-stack start/stop, WebSocket attach/disconnect, response completion, free-port verification, and isolated-state removal. | Broad suite has 177 unrelated/stale failures. |
| User-surface, browser, and desktop-shell confidence | 95% | 100% | +5 | 29 component assertions plus real-browser package import, Daily Assistant discovery, live Fast control, run launch, exact response, and Idle state. No shell-specific behavior changed. | None material for the web-equivalent path; Electron shell is inapplicable. |
| Durable regression coverage quality and relevance | 98% | 98% | 0 | Independent structured-ID projection, positive live precondition, direct catalog + GraphQL, clean legacy audit, and a Round 2 scenario name that truthfully identifies both reasoning and Fast responsibilities. | Proportional test-code re-review pending. |

- Overall post-repository confidence: `96.9%`
- Overall final confidence: `98.7%`
- Calculation method: simple average: `(100 + 100 + 100 + 98 + 95 + 100 + 98) / 7 = 98.7`.
- Confidence change produced by Round 3 broader validation: `+1.8 percentage points`, from `96.9%` to `98.7%`.
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks:
  - the full server suite is not a clean repository regression baseline (63 failed files / 177 failed tests);
  - generic server package typecheck remains unusable because of its pre-existing `rootDir`/test-include mismatch;
  - future provider IDs other than current `priority` intentionally fail closed.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Required by explicit user request / canonical real browser full stack`.
- Material deviation from the planned mode or rationale: none. The clean dev bootstrap already registered the requested template package, so the browser first removed it and observed success, then imported it again to genuinely exercise the requested import UI.
- Confidence gap or residual risk actually addressed: connected the previously separate live catalog, schema-driven form, frontend, backend, WebSocket, persisted configuration, and actual Codex runtime evidence in one user journey.
- Direct evidence from broader validation: browser response exactly `LIVE_FAST_BROWSER_OK`; browser status `Idle`; backend run id `daily_assistant_02fb5512fa2f4bf1bbecd2f7898d8516`; runtime metadata `runtimeKind: codex_app_server`, model `gpt-5.6-sol`, `llmConfig.service_tier: "fast"`; matching raw prompt/assistant traces and server WebSocket/publication lifecycle.
- If `Blocked`: `N/A`
- Startup order, commands, and readiness results: confirm ports 3000/8000 and `.autobyteus/development` absent -> `pnpm dev` -> `DEV_SERVER_READY` / `DEV_WEB_READY` -> `open_tab` -> browser journey -> state/log audit -> close tab -> stop launcher -> cleanup verification.
- Environment choices that materially affected the run: existing current Codex identity, real package source at `/Users/normy/autobyteus_org/autobyteus-agents`, isolated worktree development DB/workspace/run history, no production or unrelated user data.
- Seed data, fixtures, identities, authentication, permissions, or session state: only the browser-imported package registration and one minimal Daily Assistant prompt; no secret was read and the external package was not edited.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Raw current catalog precondition | At least one well-formed structured `priority` row exists | Explicit precondition passed | `05-live-codex-catalog-graphql-positive.log` | Pass |
| Direct catalog mapping | Raw structured capability and reasoning sequence match mapped schema | All live rows matched | Same log | Pass |
| GraphQL publication | GraphQL snapshot preserves the same schema parity | All live rows matched | Same log | Pass |
| Generic form | Fast renders/emits `fast`; Default omits; stale unsupported Fast is sanitized | 29 focused assertions passed | `09-generic-config-ui-unit-retry.log` | Pass |
| Browser package import | Target local package imports through Settings and Daily Assistant is discoverable | Browser observed remove/import success; exact row showed Local Path, Shared Agents 8, Team-local Agents 54, Teams 15 | `20-round3-browser-runtime-audit.log`; `/Users/normy/.autobyteus/browser-artifacts/758f2e-1788317331771.png` | Pass |
| Browser Fast configuration | Live Codex model exposes Fast and the run is configured with product value `fast` | Browser selected GPT-5.6-Sol and Fast; persisted metadata records `service_tier: "fast"` | `20-round3-browser-runtime-audit.log` | Pass |
| Live Daily Assistant turn | Real browser launch traverses backend/WebSocket/Codex and renders requested response | Exact prompt produced exact assistant response `LIVE_FAST_BROWSER_OK`; run became `Idle`; matching raw trace/server lifecycle | `19-round3-full-stack.log`; `20-round3-browser-runtime-audit.log`; `/Users/normy/.autobyteus/browser-artifacts/758f2e-1788317606633.png` | Pass |
| Round 3 lifecycle cleanup | No owned browser, listener, isolated state, or generated output remains | Tab closed; WebSocket disconnected; ports 3000/8000 free; all four owned paths removed | `21-round3-cleanup.log` | Pass |
| Broad server repository | Project full live-enabled suite is clean | 593 files passed, 63 failed, 17 skipped; target file passed | `12-full-server-live-codex.log` | Fail — unrelated repository debt |

## Desktop Application Validation

- Validation approach executed and any deviation from the investigation: real browser validation of the full web-equivalent path plus focused components; no deviation from the Round 3 plan.
- Browser-tested web-equivalent behavior and evidence: package import, Daily Assistant discovery, Codex runtime/model/Fast selection, run launch, WebSocket-backed response rendering, and Idle completion passed; see `19-round3-full-stack.log`, `20-round3-browser-runtime-audit.log`, and screenshots.
- Shell-specific or lifecycle behavior and evidence: no shell boundary changed.
- Effect on any already-running desktop application: None.
- Behavior not directly proven and confidence consequence: Electron packaging/window/IPC behavior was not executed and is inapplicable; no confidence deduction is assigned to an unchanged shell-only boundary.

## Platform / Runtime Targets

- Operating system / platform: macOS 26.5.2, Darwin 25.5.0, arm64
- Runtime and relevant framework versions: Node 22.23.1; pnpm 10.28.2; server Vitest 4.0.18; frontend Vitest 3.2.4; `codex-cli 0.152.0`
- Browser / engine and version: AutoByteus managed real browser session via `open_tab`; exact engine/version was not exposed by the tool; repository component tests used the Vitest DOM environment.
- Device, viewport, locale, timezone, or accessibility settings: browser viewport `450x738`; execution date/timezone `2026-09-02`, Europe/Berlin; no accessibility-specific audit was required.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data exercised: `llmConfig.service_tier: "fast"` in normalization/bootstrap/runtime fixtures and in the newly persisted metadata of the real browser-started Daily Assistant run.
- Direct-use, discard/rebuild, or migration result and evidence: Pass — product value remains `fast`; 82 focused backend assertions passed and Round 3 run metadata records the same value flowing into a live `codex_app_server` run; no persistence reader/writer changed.
- Migration completion/recovery evidence: `N/A`
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material; provider catalog rows are ephemeral.

## Tests Implemented Or Updated

No repository-resident test was added, updated, or removed in Round 3. Historical API/E2E durable coverage remains:

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/autobyteus-server-ts/tests/integration/services/codex-model-catalog.integration.test.ts` / `API-CAT-001` | Updated | `REQ-005`–`REQ-006`; `AC-006`–`AC-010`; real raw -> catalog -> GraphQL; `TEST-001` clarity | Round 2 focused live Pass 1/1; prior targeted/full evidence retained | Commit `f6c16014f`: independent `serviceTiers[].id` normalization and positive current-contract assertion. Commit `06bcb57cf`: scenario now names both advertised reasoning and Fast capabilities. |

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`
- Paths added or updated in Round 3: none
- Paths removed: none
- Added or updated paths attached for proportional test-code review: `N/A for Round 3`; the Round 2 durable test remains in the cumulative package for closure of its already-pending review.
- Diff or repository evidence supplied for removed paths: `N/A`
- Historical coverage commits: Round 1 `f6c16014ff0868606ec8a400b74ea24de90fbe0f`; Round 2 `06bcb57cf365ebc6ba12aef4ba4472e091fcd066`; Round 3 none.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-evidence/01-normalizer-unit.log` | Focused mapping evidence | Retained | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-evidence/02-live-codex-catalog-graphql.log` | Initial live setup failure | Retained | 0 tests; missing shared output |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-evidence/03-prepare-shared.log` | Setup remediation | Retained | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-evidence/04-live-codex-catalog-graphql-retry.log` | Corrected live parity | Retained | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-evidence/05-live-codex-catalog-graphql-positive.log` | Final positive live parity | Retained | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-evidence/06-runtime-propagation-unit.log` | Preserved runtime evidence | Retained | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-evidence/07-generic-config-ui-unit.log` | Initial frontend setup failure | Retained | 0 tests; missing Nuxt metadata |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-evidence/08-nuxt-prepare.log` | Frontend setup remediation | Retained | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-evidence/09-generic-config-ui-unit-retry.log` | Generic form evidence | Retained | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-evidence/10-server-production-build.log` | Build/bootstrap evidence | Retained | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-evidence/11-diff-legacy-audit.log` | Diff/legacy audit | Retained | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-evidence/12-full-server-live-codex.log` | Full live-enabled repository evidence | Retained | Overall Fail; target Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-evidence/13-environment-and-full-suite-summary.log` | Runtime and failure summary | Retained | Non-secret |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-evidence/14-cleanup.log` | Cleanup evidence | Retained | Generated outputs removed |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-evidence/15-round2-prepare-shared.log` | Round 2 setup prerequisite | Retained | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-evidence/16-round2-live-catalog-name-rerun.log` | Round 2 focused live `API-CAT-001` evidence | Retained | Pass — 1/1; corrected runner name visible |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-evidence/17-round2-name-diff-audit.log` | Round 2 one-line name/diff/legacy audit | Retained | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-evidence/18-round2-cleanup.log` | Round 2 cleanup evidence | Retained | Generated shared outputs removed |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-evidence/19-round3-full-stack.log` | Canonical backend/frontend build, readiness, WebSocket/run, and shutdown lifecycle | Retained | Pass; both readiness markers and actual Codex run publication present |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-evidence/20-round3-browser-runtime-audit.log` | Browser journey plus persisted runtime/trace correlation | Retained | Pass; exact response and `service_tier: "fast"` captured |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/api-e2e-evidence/21-round3-cleanup.log` | Tab/service/port/isolated-state cleanup audit | Retained | Pass |
| `/Users/normy/.autobyteus/browser-artifacts/758f2e-1788317331771.png` | Package-import browser screenshot | Retained | Exact imported local-package row |
| `/Users/normy/.autobyteus/browser-artifacts/758f2e-1788317606633.png` | Completed live Daily Assistant browser screenshot | Retained | Exact prompt/response and Idle state |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `pnpm -C autobyteus-server-ts prepare:shared` | Direct Vitest bypasses package pretest | Shared packages built; live target passed | Untracked generated SDK `dist` directories removed |
| `pnpm -C autobyteus-web exec nuxi prepare` | Frontend worktree lacked generated test tsconfig | UI specs passed | Generated `.nuxt` removed |
| `pnpm dev` plus AutoByteus `open_tab` | User explicitly requested a real browser journey through the canonical system | Full-stack `API-BROWSER-001` passed | Tab/services closed; isolated development state and only Round 3-generated outputs removed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Codex app-server for changed boundary | Not mocked; real local CLI | `N/A` | None |
| GraphQL | In-process real schema execution | No network server needed to prove schema mapping | Negligible |
| Generic UI catalog input | Existing in-memory public schema fixture for durable component tests; real live catalog used in Round 3 browser journey | Durable deterministic coverage plus realistic-system proof serve different purposes | No remaining one-process browser gap |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | `API-UNIT-001`, `API-CAT-001`, `API-RUNTIME-001`, `API-UI-001`, `API-BUILD-001`, `API-BROWSER-001` | Every critical approved behavior passed direct focused/live validation; the requested real-browser Daily Assistant/Codex Fast journey also passed. |
| Fail (non-blocking to this feature) | `API-REG-001` | Full server suite has broad unrelated/stale repository failures; target live catalog scenario passed within the same run. |
| Out Of Scope | Electron shell | No shell source or behavior changed; the equivalent real-browser path was executed. |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Codex live clients/processes | Target/full tests | Test `finally` release and manager `afterAll.close()`; processes exited with runners | Pass |
| Test SQLite | Vitest-owned | Used/reset only under `tests/.tmp` | Pass |
| SDK generated `dist` outputs | Created by Round 1 and Round 2 validation setup | Removed exact untracked directories after each round | Pass |
| Frontend `.nuxt` metadata | Created by this validation | Removed exact generated directory | Pass |
| Round 3 browser tab and WebSocket session | Created by `API-BROWSER-001` | Closed tab; backend logged session close/disconnect | Pass |
| Round 3 backend/frontend processes | Owned `pnpm dev` launcher | Interrupted launcher; verified no listeners on 3000/8000 | Pass |
| Round 3 isolated development state and generated outputs | Confirmed absent before startup and created by this round | Removed exact `.autobyteus/development`, two shared SDK `dist`, and `autobyteus-web/.nuxt` paths | Pass |
| External `/Users/normy/autobyteus_org/autobyteus-agents` package | Read-only external source | Not edited or removed | Unchanged |

## Preliminary Classification

- Targeted changed-boundary result: `Pass`.
- `TEST-001`: `Local Fix` owned by API/E2E and resolved at `06bcb57cf`; focused live rerun and name/diff audit passed.
- `API-BROWSER-001`: `Pass`; the real browser journey completed with persisted Fast runtime configuration and exact live Codex response.
- Initial 0-test setup failures: `Local Fix` owned and resolved by API/E2E environment setup.
- Full-suite failures: `Local Fix / existing repository coverage and setup debt outside this ticket`. Evidence includes stale removed test APIs (`submitInput`, `subscribeToEvents`), missing application-package services/artifacts, and unrelated file-explorer/external-channel/run-history/media failures. No failure is causally attributable to `serviceTiers` discovery or the test-local projection edit.
- No `Design Impact`, `Requirement Gap`, or feature implementation failure was found.

## Recommended Recipient

`/code_reviewer`. Round 3 itself changed no durable test, so proportional test-code review for this round is `Not Applicable`; the reviewer should record that disposition while also closing the already-pending Round 2 review of commit `06bcb57cf365ebc6ba12aef4ba4472e091fcd066` before delivery.

## Evidence / Notes

- First live target attempt: environment/setup Fail before collection; resolved with the package's existing shared-build script.
- Final live target: Pass, one executed test, positive structured `priority` row required.
- Round 2 focused live rerun: Pass, one executed test, with output `preserves each live model's advertised reasoning and Fast capabilities through catalog and GraphQL`.
- Round 3 real browser: Pass. The package was imported through Settings, Daily Assistant was launched with Codex App Server / GPT-5.6-Sol / Fast, and the actual response was `LIVE_FAST_BROWSER_OK`.
- Matching backend metadata for run `daily_assistant_02fb5512fa2f4bf1bbecd2f7898d8516` records `llmConfig.service_tier: "fast"`; raw traces and WebSocket lifecycle corroborate the same run.
- Round 3 owned resources were fully cleaned; ports 3000/8000 are free and no isolated development state remains.
- No full-suite rerun was required or performed for the name-only correction; `CRR-002` explicitly allowed focused execution and no new evidence changed that plan.
- Full run target line: `tests/integration/services/codex-model-catalog.integration.test.ts (1 test)` Pass.
- Full run summary: 63 failed files / 593 passed / 17 skipped; 177 failed tests / 3,414 passed / 76 skipped.
- Documentation impact from `CRR-001` remains for delivery: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/autobyteus-server-ts/docs/modules/codex_integration.md` lines 200-202.
- The result is not claiming the full server suite passed; its failures are preserved as evidence and explicitly excluded from feature proof.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: `98.7%`
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required by explicit user request — completed / Pass`
- Critical acceptance criteria lacking direct proof: none
- Required next recipient: `/code_reviewer` for Round 3 `Not Applicable` durable-test disposition and closure of the already-pending Round 2 test review.
- Notes: `TEST-001` is resolved, the corrected durable live test passed 1/1, and the requested actual browser -> backend/WebSocket -> Codex App Server turn passed with persisted `service_tier: "fast"`. Final confidence is `98.7%`. The Round 1 full repository gate remains non-clean for broad unrelated/stale reasons and is recorded without being misrepresented.
