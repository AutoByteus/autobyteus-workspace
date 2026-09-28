# API/E2E Execution Coverage Report — agy-native-image-output-path

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path`

## Execution Round Meta

- Requirements Doc: `…/requirements-doc.md` (Approved SR-003; SR-004 current)
- Investigation Notes: `…/investigation-notes.md`
- Solution Revision Record: `…/solution-revision-record.md`
- Design Spec: `…/design-spec.md`
- Supplemental Task Artifacts: `…/solution-result.md`, `…/probe-evidence/`, `…/implementation-evidence/`. Product/UI supplements: `N/A — not applicable`
- Design Review Report: `…/design-review-report.md`
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Implementation Handoff: `…/implementation-handoff.md`
- Implementation Revision Record: `…/implementation-revision-record.md` (IR-001)
- Code Review Report: `…/code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `…/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Coverage Investigation: `…/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `…/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `…/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: CRR-001 Pass (implementation review) from `/code_reviewer`
- Prior Round Reviewed: None
- Latest Authoritative Round: 1
- Evidence directory: `…/api-e2e-evidence/`

## Routing Classification

- Task size: `Small`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (durable tests added or updated)

## Investigation And Execution Basis

- The investigation was completed before any durable coverage change or execution: Yes.
- The plan was followed, with one material deviation:
  - The interim fallback case first went into `agy-failure-transport.e2e.test.ts` (ledger seq 2).
  - The post-repository gate then showed that AC-003 was not proven at server level.
  - All native-image step-output cases (resolved, missing, outside, symlink) were therefore consolidated into a new deterministic suite. The failure-transport file was restored to HEAD.
- Coverage decisions revised during execution: the fixture case was renamed `image_done_unresolved` → `image_done`, and it gained `AGY_FAKE_CONVERSATION_ID`.
- Reroute required: No.

## Test-Case Ledger Reconciliation

- Ledger path: `…/api-e2e-test-case-ledger.md`
- Initialized before execution: Yes. Every completed case was recorded immediately: Yes. Long-running checkpoints: N/A, since each live case finished in under 30 s.
- Reconciled: Yes. Last event: seq 7. Nothing is running or unstarted.

| Case ID | Final Result | Last Event | Evidence | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| API-E2E-001 | Pass | seq 1 | `api-e2e-evidence/api-e2e-001.log` | — |
| API-E2E-002 | Pass | seq 3 | `api-e2e-002.log`, `real-native-image.json` | — |
| API-E2E-003 | Pass | seq 4 | `api-e2e-003.log`, `app-native-image-chat.json` | — |
| API-E2E-004 | Pass | seq 2 (superseded by seq 7 for the fallback) | `api-e2e-004.log`, `api-e2e-007.log` | Redaction cases pass unchanged at HEAD (seq 7) |
| API-E2E-005 | Pass (no regression) | seq 5 | `api-e2e-005-*.log` | The 10 failures are pre-existing |
| API-E2E-006 | Pass | seq 6 | `browser-*.png`, `dev-stack.log` | — |
| API-E2E-007 | Pass | seq 7 | `api-e2e-007.log` | — |

## Compatibility / Legacy Scope Check

- Requirements or design introduce backward compatibility in scope: No.
- Compatibility-only or legacy-retention behavior in the implementation: No. There are no version branches, and older layouts fall back generically.
- Approved persisted-data transition followed: Yes (`Directly Usable — No Migration`).
- Durable coverage added only for compatibility behavior: No.

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Req / AC | Changed Boundary | Surface | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| API-E2E-001 | REQ-001..005, AC-002/003/005 | Reader, converter, wiring, FCP | Unit tests on a real temp filesystem | Durable | Pass | `api-e2e-001.log` |
| API-E2E-002 | AC-001, AC-005, REQ-002 | Real AGY → production reader | Live CLI capsule | Durable (gated) + Live | Pass | `api-e2e-002.log`, `real-native-image.json` |
| API-E2E-003 | AC-001, AC-004, AC-005, SCN-001 | Full server with real AGY: WS result, FILE_CHANGE, content route, history after terminate | Live API | Durable (gated) + Live | Pass | `api-e2e-003.log`, `app-native-image-chat.json` |
| API-E2E-004 | BEH-002, REQ-005 | Error/denial redaction; denial arguments public | Fake transport + real server | Durable | Pass | `api-e2e-007.log` |
| API-E2E-005 | Regression | Broader unit suites; build typecheck | Unit / tsc | Durable | Pass (10 pre-existing failures) | `api-e2e-005-*.log` |
| API-E2E-006 | AC-001, AC-004, AC-005, SCN-001 (UI) | Rendered Activity card and Artifacts preview, live and reopened | Browser against `pnpm dev` with real agy 1.2.12 | Browser + Live | Pass | `browser-live-*.png`, `browser-reopened-*.png` |
| API-E2E-007 | AC-001..005 wiring, AC-002, AC-003, REQ-002/003, SCN-002 | Production backend wiring and default brain root; containment; fallback | Fake transport + real server + test-owned HOME | Durable | Pass | `api-e2e-007.log` |

## Additional Repository Coverage Execution

After the post-repository gate:

| Order | Command | Configuration | Scenario | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 7 | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<wt>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/agy-native-image-step-output.e2e.test.ts tests/e2e/runtime/agy-failure-transport.e2e.test.ts --no-watch` | `autobyteus-server-ts` | API-E2E-007, API-E2E-004 | Pass 6/6 | `api-e2e-007.log` |
| 8 | Same file without the env gate | same | No side effects when skipped | Pass: 4 skipped, no temp dir created | ledger seq 7 |
| 9 | `pnpm exec tsc -p tsconfig.json --noEmit` filtered to the changed test files | same | Test typecheck | No errors in the changed files | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 96% | +6 | AC-001/004/005 shown in the rendered UI, live and reopened. AC-003 and AC-002 go through the real server (API-E2E-007). SCN-001 is proven at API and UI | AC-001's "reply mentions" clause: the assistant reply mentions no path (AGY tells the model not to). AGY's own reported path matches |
| Changed-boundary execution directness | 95% | 96% | +1 | The production default brain root and backend wiring are exercised deterministically | — |
| Cross-boundary integration realism and mock gap | 95% | 95% | 0 | Real agy in 3 journeys; the hostile-path cases use a fake transport, but the real server and reader | The fake transport, by design, for the hostile files |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | 0 | Real agy 1.2.12 and the real brain root in the live and browser runs; isolated dev data | Only agy 1.2.12 was validated (layout drift accepted in SR-002) |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | +5 | Missing, outside and symlink cases through the server, each with one content-free warning; terminate/reopen at API and UI | A throwing resolver is proven by unit test only (no production trigger) |
| User-surface, browser, and desktop-shell confidence | 70% | 96% | +26 | Browser: card SUCCESS, arguments, result `output` and `file_path`; Artifacts shows one entry and the 1024×1024 preview; identical after reopen | Electron shell not exercised; no shell-specific change |
| Durable regression coverage quality and relevance | 90% | 96% | +6 | A new deterministic, CI-runnable suite covers the resolved and hostile paths; the history/reopen assertions are durable | Live detectors are env-gated |

- Overall post-repository confidence: 89.3%
- Overall final confidence: **95.6%** (simple average of 7 categories: 96+96+95+95+95+96+96 = 669/7)
- Confidence change from broader validation: +6.3 points
- Every critical acceptance criterion directly proven: Yes
- Any final category below 90%: No
- 95% target met: Yes
- Confidence-limiting residual risks: undocumented AGY layout drift (accepted, detected by the gated live tests); only agy 1.2.12 was validated.

## Broader Validation Decision And Execution

- Decision: `Required`. Modes: Browser, plus a deterministic server-level fake-transport suite.
- Deviation: the durable suite was added as part of broader validation to close the AC-003 server-level gap.
- Gap addressed: the rendered UI (live and reopened), and hostile-path handling through the production wiring.
- Startup: `pnpm dev` from the worktree root. `DEV_SERVER_READY http://127.0.0.1:8000` and `DEV_WEB_READY http://127.0.0.1:3000` were both observed.
- Environment: data root in the worktree's ignored `.autobyteus/development/server-data`; real agy on PATH; the user's desktop app on port 29695 untouched.
- Seed: agent `agy-image-api-e2e` created via GraphQL. The UI selected Antigravity CLI / Gemini 3.8 Flash (Low) with auto-approve on.

| Journey Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| Send "…golden retriever dog illustration…" | The turn completes with one `generate_image` card | Status went Running → Idle; card `generate_image` SUCCESS; reply rendered | `browser-live-activity-card.png` | Pass |
| Expand card Arguments/Result | `ImageName`/`Prompt`; result with `provider_state`, `output`, absolute `file_path` | `{"ImageName":"golden_retriever","Prompt":…}`; `file_path=/Users/normy/.gemini/antigravity-cli/brain/d52aa893-e5bf-4a96-9b3c-101dfefb6d37/golden_retriever_1790603161894.jpg`; `output` contains "Generated image is saved at <same path>." | DOM text; `file` shows JPEG 1024×1024 on disk | Pass |
| Artifacts tab | One entry that previews | Exactly 1 entry `golden_retriever_1790603161894.jpg` with the full path; `<img>` naturalWidth/Height 1024×1024 | `browser-live-artifacts-preview.png` | Pass |
| `terminateAgentRun`, reload, reopen from workspace history | Same card and Artifacts entry | Offline run shows identical card JSON and the same single entry, previewing 1024×1024; the agy process exited | `browser-reopened-*.png` | Pass |

## Desktop Application Validation

- Approach: browser against the documented web dev path, exercising the Electron renderer's equivalent views.
- Shell-specific behavior: none changed. Effect on the running desktop app: None.
- Not proven: the Electron shell itself. This is immaterial.

## Platform / Runtime Targets

- macOS (Darwin 25.5.0), Node via pnpm workspace, vitest 4.0.18, Nuxt 3.21.1 / Vite 7.3.1, agy 1.2.12.
- The browser is the AutoByteus agent browser tab. Viewport 1218×738 CSS px, English locale.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved decision: `Directly Usable — No Migration`.
- Exercised:
  - New enriched events replay through the unchanged projection readers after terminate (API-E2E-003, API-E2E-006).
  - `output:null` fallback rows replay unchanged (API-E2E-007).
- Version-specific branch or compatibility fallback: No.
- Residual risk: none material.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agy-native-image-step-output.e2e.test.ts` | Added (4 cases) | REQ-001..005, AC-001..005 wiring, AC-002, AC-003, SCN-002 | Pass 4/4 | Gated by `RUN_AGY_FAILURE_E2E` + `ANTIGRAVITY_CLI_COMMAND`. When enabled, `vi.hoisted` sets HOME to a temp dir before server modules load, so the default brain root is test-owned. It is removed in `afterAll`. When gated off, nothing happens |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated | Fake transport | Pass | New `image_done` case: ACTIVE with parameters, DONE, SUCCESS result, UUID conversation from `AGY_FAKE_CONVERSATION_ID` or random. Existing cases unchanged |
| `autobyteus-server-ts/tests/e2e/runtime/agy-native-image-app-chat.e2e.test.ts` | Updated | SCN-001, REQ-004 | Pass (live) | `expectReopenedHistory()` runs before and after `terminateAgentRun`. It checks projection conversation/activities, `getRunFileChanges`, and preview bytes |

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Durable coverage changed: Yes. These changes are uncommitted in the worktree for Code Review; the commit is left to the owning flow.
- Added: `autobyteus-server-ts/tests/e2e/runtime/agy-native-image-step-output.e2e.test.ts`.
- Updated: `autobyteus-server-ts/tests/e2e/runtime/agy-native-image-app-chat.e2e.test.ts`, `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`.
- Removed: none.
- Attached for proportional test-code review: Yes.

## Other Execution Artifacts

| Artifact Path | Type | Retained | Notes |
| --- | --- | --- | --- |
| `…/api-e2e-evidence/*.log` | Command output | Retained | Secret scan: no credentials (the only hits are unit-test names) |
| `…/api-e2e-evidence/app-native-image-chat.json`, `real-native-image.json` | Live event evidence | Retained | From this round's live runs |
| `…/api-e2e-evidence/browser-*.png` | Browser screenshots | Retained | Supporting evidence; DOM assertions are primary |

## Temporary Execution Methods / Scaffolding

| Method | Why Needed | Result | Cleanup |
| --- | --- | --- | --- |
| Browser journey on the `pnpm dev` stack | Rendered-UI proof requires real agy and the Nuxt dev stack | Pass | Stack stopped; ports 8000/3000 freed; `.autobyteus/development/` removed; tab closed |
| Base-source recheck of the 4 failing unit files | Confirm the failures are pre-existing | 10 fail with the base source as well | Source restored to HEAD (`git checkout HEAD -- …/antigravity`); status verified |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| AGY CLI in API-E2E-004/007 | `tests/fixtures/agy-failure-cli.mjs` | Deterministic hostile or missing files; CI without agy | The real agy is covered separately by API-E2E-002/003/006 |
| AGY brain root in API-E2E-007 | Temp HOME | Never write into the user's `~/.gemini` | None; the production default-root code path is used |

## Result Summary

| Result | Scenario IDs | Summary |
| --- | --- | --- |
| Pass | API-E2E-001..007 | All ACs are directly proven at API, server and UI level; there are no regressions |

## Cleanup Performed

| Resource | Ownership | Action | Result |
| --- | --- | --- | --- |
| `pnpm dev` launcher and children (pids 19033/19760) | Mine | SIGINT | Stopped; ports 8000/3000 free |
| `.autobyteus/development/` in the worktree | Mine | `rm -rf` | Removed |
| `/tmp/agy-api-e2e` | Mine | Logs copied to evidence, then removed | Removed |
| Temp HOME of the new suite | Mine | `afterAll` | Removed (verified) |
| In-process e2e app-data directories | Mine | Suite `afterAll` | Removed |
| AGY conversations created by the live and browser runs under `~/.gemini/antigravity-cli/brain/` (e.g. `855022f6-…`, `d52aa893-…`) | AGY-owned | Left in place (read-only policy) | Retained |
| Browser tab `afc6d0` | Mine | Closed | Closed |

## Preliminary Classification

None. The result is Pass.

## Recommended Recipient

`/code_reviewer`, for proportional test-code review of the added and updated durable tests.

## Evidence / Notes

- **Pre-existing failures**: the 10 failures in `team-run-history-catalog-service`, `codex-tool-log-correlation`, `agent-run-provisioning-service` and `published-artifact-projection-service` reproduce identically with the three changed source files reverted to `fcd3e83a4`.
- **AC-001 wording**: AGY's tool output says "Do not output the path of this image", so the assistant reply does not repeat it. The result path equals AGY's authoritative reported path.

## Latest Authoritative Result

- Result: **Pass**
- Final validation confidence: 95.6%
- 95% target met: Yes
- Any final category below 90%: No
- Broader validation decision: Required. Executed (Browser + server-level fake-transport suite).
- Critical ACs lacking direct proof: None
- Required next recipient: `/code_reviewer` (proportional test-code review)
