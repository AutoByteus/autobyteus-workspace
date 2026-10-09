# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input/tickets/in-progress/agy-image-context-input/requirements-doc.md` (SR-004, Approved)
- Investigation Notes: `.../investigation-notes.md`
- Solution Revision Record: `.../solution-revision-record.md` (SR-001..SR-004)
- Design Spec: `.../design-spec.md` (SR-004 Revision)
- Supplemental Task Artifacts: `probe-evidence/`, `solution-handoff.md`, `implementation-evidence/` (incl. `ir-002-rendered/`)
- Design Review Report: `.../design-review-report.md` (ARCH-REV-001; findings moot under SR-004)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Implementation Handoff: `.../implementation-handoff.md` (IR-002)
- Implementation Revision Record: `.../implementation-revision-record.md` (IR-001, IR-002)
- Code Review Report: `.../code-review-report.md` (CRR-001, failure-origin round)
- Code Review Revision Record: `.../code-review-revision-record.md`
- Coverage Investigation: `api-e2e-coverage-investigation.md` (Round 2 Update)
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: 2
- Trigger: implementation IR-002 (commit `e259a0203`) for SR-004 / DEC-006
- Prior Round Reviewed: Round 1 (API-REV-001, Fail on E2E-CF-002)
- Latest Authoritative Round: 2

## Routing Classification

- Task size: `Small`; Architectural risk: `Low`; Input route: `Direct Low-Risk`; Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Investigation updated before durable changes and execution: `Yes`
- Plan followed: `Yes`. Deviation: the requested desktop screenshots were not written to disk by the browser tool. The DOM-state readings, which are the primary evidence, are transcribed in `api-e2e-evidence/desktop/desktop-journey-dom-states.json`.
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger updated during round 2 with each case result: `Yes`. Nothing was interrupted, and no cases are left unstarted.

## Compatibility / Legacy Scope Check

- Compatibility or legacy retention: `No`. IR-002 removes the `attachmentsAreSendable` option and the `contextFilePaths` field cleanly, with no fallback.
- Persisted data: `Not Affected` (the projection check in E2E-CF-001 still passes)
- Durable coverage for compatibility-only behavior: `No`

## Changed Boundary And Evidence Matrix

| Requirement / AC | Evidence | Directness | Result |
| --- | --- | --- | --- |
| REQ-001/003, AC-001/005 | E2E-CF-001/005 (exact stdin text with stored absolute paths, string-only message); DJ-001/002 (real desktop, AGY `view_file` on pasted images) | Direct | Pass |
| REQ-002, AC-002 | E2E-CF-001 (.txt/.pdf), E2E-CF-005 (.txt); LIVE-CF-003 (round 1) | Direct | Pass |
| REQ-004, AC-003 (SR-004) | Web specs (`agentPrimaryAction`, `ChatComposer`, `AgentUserInputTextArea`). Rendered DJ-001 (Chat: file only → Send disabled and Enter creates no run; text + file → enabled, sends). Rendered DJ-002 (run view: file only → Send disabled and Enter sends nothing; text + file → enabled, sends). Server rule unchanged and still enforced: E2E-CF-002. | Direct | Pass |
| REQ-005, AC-004 | E2E-CF-003; data URL is unit-only (contrived) | Direct for the supported part | Pass |
| REQ-006, AC-007 | CTX-E2E-003 delegation E2E; E2E-CF-004 | Direct | Pass |
| REQ-006, AC-008 | Server unit/integration suites; the UI shows only typed text plus Context files (DJ-001/002); projection check (E2E-CF-001) | Direct | Pass |
| AC-006 | LIVE-CF-001..003 (round 1, real agy via the real server; server unchanged since); DJ-001/002 (round 2, real desktop app + real agy, standalone) | Direct | Pass |

## Additional Repository Coverage Execution (round 2)

| Order | Command | Result | Evidence |
| --- | --- | --- | --- |
| 1 | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-context-files-transport.e2e.test.ts --no-watch` | 4/4 passed | `api-e2e-evidence/e2e-cf-transport.log` |
| 2 | same gate: `tests/e2e/projects/project-task-context-files-delegation.e2e.test.ts tests/e2e/runtime/agy-interrupt-resend-transport.e2e.test.ts tests/e2e/runtime/agy-native-tool-arguments-transport.e2e.test.ts tests/e2e/runtime/agy-failure-transport.e2e.test.ts` | 4 files; 32 passed, 1 skipped | `api-e2e-evidence/e2e-agy-regression.log` |
| 3 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution tests/unit/agent-team-execution tests/integration/api/rest/context-files.integration.test.ts tests/integration/agent-memory/user-attachment-history.integration.test.ts --no-watch` | 162 files; 1535 passed | `api-e2e-evidence/unit-integration.log` |
| 4 | `pnpm -C autobyteus-web exec nuxt prepare && pnpm -C autobyteus-web test:nuxt --run` | 588 files; 3998 passed, 3 skipped | `api-e2e-evidence/web-unit.log` |
| 5 | Round 1 (still valid, server unchanged): `RUN_AGY_CONTEXT_FILES_E2E=1 … agy-context-files-live.e2e.test.ts` | 3/3 passed | `api-e2e-evidence/live-cf.log`, `live/*.json` |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-repository | Final | Support / Remaining uncertainty |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 95% | All active ACs are proven directly. The rendered check closed the run-view composer gap. Team and org composers were already text-required and are covered by code and specs, not rendered. |
| Changed-boundary execution directness | 90% | 95% | The frontend rule ran in the real desktop build, and the server path ran through the real WS and REST. |
| Cross-boundary integration realism and mock gap | 90% | 95% | Real desktop renderer → server → real agy → `view_file` → reply. |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | Isolated instance from the worktree build (currency verified), real AGY login, test-owned data. |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | Whitespace and attach-only rejection (E2E-CF-002), Enter with file only (rendered), remote URL, pasted path, follow-up message. Data URL is unit-only (contrived). |
| User-surface, browser, and desktop-shell confidence | 85% | 95% | Chat and run-view composers rendered in the desktop app with DOM assertions. Screenshots were not retained. Team and org composers were not rendered. |
| Durable regression coverage quality and relevance | 95% | 95% | Gated fake-CLI and live E2Es, fixture route guard, web specs. |

- Overall post-repository confidence: 91%; overall final confidence: 95% (simple average of 7 categories)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below 90%: `No`
- Default 95% target met: `Yes`
- Residual risks: data-URL images are proven at unit level only (contrived); Claude-in-AGY models were not exercised; team and org composers were not rendered (their text-required path is unchanged); the requirement's explicit user verification in the user's own desktop app is still pending (delivery).

## Broader Validation Decision And Execution

- Decision: `Required`, executed as `Project Desktop Validation`.
- Startup: `pnpm --silent isolated-app start --from-worktree` → instance `iso-57725-bf13`, ready (backend `/rest/health`, main window). AGY availability: `runtimeAvailability(antigravity_cli) = enabled`.
- Setup data: none was needed. The built-in Daily Assistant was used (the user's scenario), with model Gemini 3.8 Flash (Low) on Antigravity CLI selected in the composer. An extra agent definition, "AGY Image Checker", was created through GraphQL but not used; it was removed with the data root.
- DJ-001 (Chat new surface):
  - A red PNG pasted onto the composer gave `Context Files (1)` with Send disabled. Enter did nothing: the route stayed `#/chat` and no run was created.
  - Typing "her" enabled Send. Sending started run `daily_assistant_61490d…`.
  - The agent ran `view_file` and replied "The attached image is a solid red square…".
- DJ-002 (standalone run-view composer, same run):
  - A blue PNG pasted with no text gave Send disabled, and Enter sent nothing.
  - "What colour is this one?" enabled Send. Sending led to `view_file` and the reply "This one is blue (a solid medium/royal blue)."
- The user message shows only the typed text plus Context files.
- Effect on other running apps: none. Another engineer's instance (`iso-63369-6c20`) was left untouched.

## Platform / Runtime Targets

- macOS (Darwin 25.5.0), Electron worktree build 1.4.99-beta.5 (mac-arm64), agy 1.3.1, Gemini 3.8 Flash (Low).

## Durable Coverage Changed In The Codebase

- Added (round 1): `autobyteus-server-ts/tests/e2e/runtime/agy-context-files-transport.e2e.test.ts`, `autobyteus-server-ts/tests/e2e/runtime/agy-context-files-live.e2e.test.ts`
- Updated (round 1): `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`, `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts`, `TESTING.md`
- Updated (round 2): E2E-CF-002 in `agy-context-files-transport.e2e.test.ts` now asserts the preserved server rule. The obsolete assertion (attach-only delivery) was removed per DEC-006.
- Removed files: None. All of these are uncommitted in the worktree.

## Dependencies Mocked Or Emulated

- AGY CLI in the fake-CLI E2E only. Nothing is mocked in the live E2E or the desktop journeys.

## Result Summary

- Round 2: all cases pass, including E2E-CF-002 (revised), DJ-001 and DJ-002.
- Round-1 failure E2E-CF-002 is resolved by SR-004 / IR-002. Attach-only is no longer offered by the composers, and the server rule is verified as preserved.

## Cleanup Performed

- `isolated-app stop iso-57725-bf13`: wasRunning true, not forced, data root removed, both ports released.
- E2E suites removed their temp data. AGY conversations remain in the user's AGY account history, as with any live AGY run.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default 95% target met: `Yes`; categories below 90%: none
- Broader validation decision: `Required`, executed (desktop app + real AGY)
- Critical acceptance criteria lacking direct proof: None
- Test-review decision: `Not Required — direct low-risk route`
- Next recipient: per `get_handoff_rules` (direct pass → delivery)
