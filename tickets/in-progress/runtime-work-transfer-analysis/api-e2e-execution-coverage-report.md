# API/E2E Execution Coverage Report — Claude Agent SDK compaction detection and raw-trace rotation

## Execution Round Meta

- Requirements Doc: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/requirements-doc.md
- Investigation Notes: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/investigation-notes.md
- Solution Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/solution-revision-record.md
- Design Spec: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/design-spec.md
- Supplemental Task Artifacts: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/probes/
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/implementation-handoff.md
- Implementation Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/implementation-revision-record.md (IR-001, commit 307d0e775)
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- Coverage Investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/api-e2e-coverage-investigation.md
- API/E2E Test-Case Ledger: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/api-e2e-test-case-ledger.md
- API/E2E Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/api-e2e-revision-record.md
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: implementation_engineer "Implementation Complete" (IR-001)
- Prior Round Reviewed: none
- Latest Authoritative Round: 1
- Evidence folder: /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/api-e2e-evidence/

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Coverage investigation artifact: api-e2e-coverage-investigation.md
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. Deviation: added a packaged-desktop journey (UI-01..03) after the post-repository score was 93 %, to close the user-surface gap (the user's original symptom was visual).
- Existing coverage decisions revised during execution: E2E-02/03 history check switched from the bare projection provider to `AgentRunViewProjectionService.getProjectionFromMetadata`. The provider alone returns one row per marker; every production history path (GraphQL run history, team, org, collaboration) applies `dedupeProjectionBundle`. A deterministic probe confirmed: provider 2 rows → service 1 `failed` activity.
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger path: api-e2e-test-case-ledger.md
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running checkpoints: `Yes` (REPO-03, UI build)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: 13
- Cases still running, interrupted, or not started: none

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| REPO-01 | Pass | 1 | console | 14 failures in 4 unrelated files are pre-existing (REPO-03) |
| REPO-02 | Pass | 2 | console | — |
| REPO-03 | Pass | 7 | sweep-head.json, sweep-base.json, rerun-stopped-run-model-config-head.log | 0 new failures |
| REPO-04 | Pass | 4 | console | 24/24, 4/4 |
| E2E-01 | Pass | 13 | live-e2e-run2.log, live-e2e-run3.log | both CLIs |
| E2E-02 | Pass | 13 | live-e2e-run2.log, live-e2e-run3.log | both CLIs |
| E2E-03 | Pass | 13 | live-e2e-run1.log (test defect, fixed), live-e2e-run2.log, live-e2e-run3.log | both CLIs |
| E2E-04 | Pass | 13 | live-e2e-run2.log, live-e2e-run3.log | path CLI; run 3: [failed too_few_groups, compacted 138 622 tok / 13.9 s] |
| E2E-05 | Pass | 13 | live-e2e-run3.log | both CLIs (added after scorecard to close the process-exit gap) |
| TMP-01 | Pass (auto success + auto failure); keepalive Not Tested | 8 | tmp01-long-auto-compaction.json/.log | compaction finished in 10 s; keepalive covered by synthetic tests + CLI source |
| UI-01 | Pass | 10 | ui-01-live-compact-completed.png | — |
| UI-02 | Pass | 11 | ui-02-live-stop-failed.png | — |
| UI-03 | Pass | 12 | ui-03-reopened-history.png, ui-run-memory/raw_traces_manifest.json | — |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce or tolerate backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. `buildClaudeProviderCompactionEvent` and its guessed shapes are removed; no references remain (grep).
- Approved persisted-data transition followed: `Yes` (no migration; additive optional marker fields written only when present)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| REPO-01 | AC-022a/b, AC-023, AC-024, AC-025, SCN-020/021 | tracker, session, converter, recorder | Vitest units (real probe frames) | Durable | Pass | tracker 9, session 47, converter 34, accumulator 23 |
| REPO-03 | REQ-014 / AC-014 | Codex/AutoByteus/native compaction, run-history, memory | 1773-test sweep, HEAD vs base 39f2dd008 | Durable | Pass | identical 66 pre-existing failures; 0 new |
| REPO-04 | BEH-009 web, BEH-011 web | web pairing + hydration (unchanged code) | Nuxt Vitest | Durable | Pass | new Claude started→failed case |
| E2E-01 | AC-022c, AC-023, AC-024 | real AgentRun → Claude SDK/CLI → websocket → recorder → RunMemoryFileStore | live, both CLIs (path 2.1.283, bundled 2.1.280), haiku | Durable/Live | Pass | websocket [compacting, compacted], one provider_event_id, trigger manual; 1 archive segment; markers compacting→compacted with pre/post tokens and duration |
| E2E-02 | BEH-011, CONF-001 | production history service on live memory | live | Durable/Live | Pass | history contains "OK AFTER", not "OK ONE"; 1 completed compaction activity, same providerEventId |
| E2E-03 | REQ-025, SCN-019/020 | websocket INTERRUPT_GENERATION during `/compact` | live, both CLIs | Durable/Live | Pass | [compacting, failed], one id, error_message present, failed before turn settlement, 0 archive, follow-up turn works, history 1 failed activity |
| E2E-04 | SCN-017, SCN-019 (auto), REQ-022–025 | auto compaction (CLAUDE_CODE_AUTO_COMPACT_WINDOW=60000) | live, path CLI | Durable/Live (opt-in) | Pass | each operation = one start + one terminal; archives = completed ops; markers = 2 × ops; auto trigger |
| E2E-05 | REQ-025, SCN-020 (process exit) | SIGKILL of the Claude CLI during `/compact` | live, both CLIs | Durable/Live | Pass | [compacting, failed] one id, error_message "Claude process exited before the compaction completed.", failed before ERROR, 0 archive, run reopens the CLI and the next turn completes with no compaction events |
| TMP-01 | SCN-017/019 auto, AC-023 keepalive | same, opus | temporary probe | Temporary/Live | Pass / keepalive Not Tested | turn 2 auto failed "too_few_groups"; turn 3 auto compacted 170 796→1 196 in 10.3 s; 1 archive; markers compacting,failed,compacting,compacted |
| UI-01 | BEH-009, BEH-008 (product) | packaged desktop app, Event Monitor + Activity panel | isolated instance iso-55016-1001, worktree build, Claude Agent SDK runtime, Haiku 4.5 | Desktop | Pass | one Activity item #d0bee0 COMPACTING → COMPLETED after 12.5 s; one Event Monitor row |
| UI-02 | REQ-025 (product) | Stop generation during `/compact` | same | Desktop | Pass | same item #b9dbde COMPACTING → FAILED "API Error: Request was aborted." within 250 ms; "Compaction canceled."; next turn OK |
| UI-03 | BEH-011, CONF-001 (product) | app restart → reopen run from history (GraphQL) | same | Desktop | Pass | Event Monitor starts at the boundary row; OK ONE/first `/compact` archived; failed op 1 row; Activity 2 items (completed, failed); disk: 1 archive segment (5 records), boundary manual 14 740→1 309 / 12 570 ms, failed marker has error_message |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 6 | `pnpm exec vitest run tests/e2e/run-history/stopped-run-model-config-graphql.e2e.test.ts --no-watch` | autobyteus-server-ts (HEAD) | isolated rerun of 2 sweep-only failures (`TEST_SERVER_BUILD_REQUIRED` during the concurrent run) | Pass 2/2 | api-e2e-evidence/rerun-stopped-run-model-config-head.log |
| 7 | `pnpm exec tsc --noEmit -p tsconfig.json` filtered | autobyteus-server-ts | changed test file types | Pass (only the 852 pre-existing TS6059 rootDir errors) | console |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95 % | 96 % | +1 | every AC proven directly, including live on both CLIs and in the product UI | live keepalive (AC-023 is defined as a replay, which is proven) |
| Changed-boundary execution directness | 95 % | 96 % | +1 | real CLI frames through real session/recorder/history; packaged app | — |
| Cross-boundary integration realism and mock gap | 90 % | 95 % | +5 | packaged app: websocket, GraphQL history, restart; harness gap (no full server boot) closed | — |
| Environment, configuration, identity, and fixture fidelity | 95 % | 95 % | 0 | both CLI executables; pinned SDK 0.3.280; standalone env; haiku and opus | other platforms not run (macOS only) |
| Failure, edge-case, lifecycle, and recovery evidence | 90 % | 95 % | +5 | live Stop (harness, both CLIs, and UI), live process exit (E2E-05, both CLIs), live auto failure (E2E-04, TMP-01); CLI source shows keepalive timer cleared in `finally` before the boundary is applied | live keepalive not reproduced; `turn_ended_before_boundary` has no known live trigger (safety net, fake-SDK proof) |
| User-surface, browser, and desktop-shell confidence | 88 % | 93 % | +5 | live and reopened Activity/Event Monitor in packaged desktop app | OBS-1 (history drops failure reason), OBS-2 (browse-earlier page lists a failed op as 2 event visuals; >100 events only) |
| Durable regression coverage quality and relevance | 95 % | 95 % | 0 | live E2E on all CLIs + Stop + opt-in auto; web started→failed case | live suite gated (cost) |

- Overall post-repository confidence: 92.6 %
- Overall final confidence: **95.0 %** (665/7); lowest category 93 % (user surface).
- Calculation method: simple average of the 7 applicable categories.
- Confidence change produced by broader validation: +2.4 points; closed the integration-realism, process-exit and user-surface gaps.
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes` (95.0 %; no category below 90 %; all critical ACs directly proven)
- Confidence-limiting residual risks: live keepalive not reproduced (OBS-4); OBS-1/OBS-2 (pre-existing reader/browse behavior, outside approved ACs).

## Broader Validation Decision And Execution

- Decision and selected mode: `Required` — Live API (gated Claude E2E, both CLIs) plus Project Desktop Validation (isolated instance of the worktree build).
- Material deviation: desktop validation added after the post-repository score (93 %) to close the user-surface gap.
- Confidence gap actually addressed: real CLI frame flow across 2 CLI versions; real Stop race; reopened history through production service and real UI; rendered activity rows.
- Startup order, commands, readiness: `pnpm --silent isolated-app start --build` → ready (instance iso-55016-1001, control 55016, backend 55017); agent definition created via GraphQL `createAgentDefinition`; UI driven via browser-automation attach-only; `isolated-app restart` for reopen; `isolated-app stop`.
- Environment choices: Claude Agent SDK runtime, Haiku 4.5, temp workspace, operator Claude CLI login via HOME (no AutoByteus user data).
- Seed data: one agent definition "Claude Compaction QA" in the isolated database (removed with the data root).

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Send "Reply with exactly: OK ONE" | reply | "OK ONE" | DOM | Pass |
| Send `/compact` | one activity started → completed | #d0bee0 COMPACTING (0.25 s) → COMPLETED (12.8 s); 1 Activity item, 1 Event Monitor row | DOM samples, ui-01 screenshot | Pass |
| Send "OK AFTER" | normal reply, still one compaction row | as expected | DOM | Pass |
| `/compact`, Stop after 2 s | same activity ends failed with error; run idle | #b9dbde → FAILED "API Error: Request was aborted." within 250 ms; "Compaction canceled." | DOM, ui-02 screenshot | Pass |
| Send "OK FINAL" | run continues | "OK FINAL" | DOM | Pass |
| Restart app, reopen run | latest segment only; 1 row per operation | starts at boundary row; OK ONE archived; Activity: completed + failed | DOM, ui-03 screenshot | Pass |
| Disk | 1 archive segment, markers with metadata | manifest 1 segment (5 records); boundary manual 14 740→1 309, 12 570 ms; failed marker error_message | ui-run-memory/raw_traces_manifest.json, console | Pass |

## Desktop Application Validation

- Approach: isolated desktop instance of this worktree's packaged build (TESTING.md "full real-product journey").
- Web-equivalent behavior: Activity panel, Event Monitor rows, history hydration — exercised in the packaged renderer.
- Shell-specific behavior: none changed; app restart used only as the reopen path.
- Effect on any already-running desktop application: `None` (another worktree's instance iso-52483-84f0 was not touched).
- Not directly proven: Event Monitor "browse earlier" page (needs >100 events); see OBS-2.

## Platform / Runtime Targets

- macOS (Darwin 25.5.0, arm64); Node via pnpm workspace; Electron 42.4.1 packaged build.
- Claude CLI 2.1.283 (PATH) and 2.1.280 (SDK-bundled); @anthropic-ai/claude-agent-sdk 0.3.280; models haiku / Haiku 4.5 / opus.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved decision: no migration; additive optional fields.
- Representative existing data exercised: the run-history replay/projection suites (unchanged reader) pass at HEAD exactly as at base; historical Claude files are not rewritten (no migration code exists).
- Result: new markers are read by the same reader in the live harness and in the packaged app after restart.
- Version-specific runtime branch or compatibility fallback observed: `No`
- Residual: none.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage changed this round: `Yes` (uncommitted in the worktree)

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| autobyteus-server-ts/tests/e2e/runtime/claude-agent-compaction-rotation.e2e.test.ts | Updated | E2E-01 now runs on every CLI candidate and adds a follow-up turn + reopened-history check through `AgentRunViewProjectionService` (BEH-011); new E2E-03 Stop-during-`/compact` (REQ-025); new E2E-05 CLI process exit during `/compact` (SCN-020); new opt-in E2E-04 auto case (`RUN_CLAUDE_AUTO_COMPACTION_E2E=1`) | 7/7 pass (run 3) |
| autobyteus-web/services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts | Updated | new case: Claude started → failed on the same row with the provider error (BEH-009/REQ-025 web) | 24/24 pass |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct route)
- Removed paths: none

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| api-e2e-evidence/live-e2e-run1.log, live-e2e-run2.log, live-e2e-run3.log | live E2E logs | Retained | run 1 shows the history test defect; run 3 final (7/7) |
| api-e2e-evidence/sweep-head.json, sweep-base.json (+ .log) | regression sweep | Retained | |
| api-e2e-evidence/tmp01-long-auto-compaction.json/.log | TMP-01 | Retained | |
| api-e2e-evidence/ui-*.png, ui-run-memory/raw_traces_manifest.json, isolated-*.json, isolated-build.log | desktop journey | Retained | |
| api-e2e-evidence/history-failed-probe.test.ts, claude-long-auto-compaction-probe.test.ts | copies of temporary probes | Retained as evidence | removed from tests/ |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| autobyteus-server-ts/tests/tmp-api-e2e/history-failed-probe.test.ts | deterministic check of provider vs service vs browse page for a failed Claude op | provider 2 rows; service 1 failed; browse 2 visuals | removed; temp dirs deleted |
| autobyteus-server-ts/tests/tmp-api-e2e/claude-long-auto-compaction-probe.test.ts | attempt >30 s compaction (opus) | 10.3 s, no keepalive | removed |
| /tmp/rwta-base base worktree (node_modules symlinked) | regression delta | identical failures | `git worktree remove --force` done |
| CLI binary inspection (2.1.283) | keepalive lifecycle | keepalive armed only while awaiting a pending precomputed compaction; cleared in `finally` before boundary | read-only |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Claude SDK in unit/session tests | fake SDK with verbatim probe frames | determinism | covered live separately |
| Server bootstrap in live harness | Fastify + real websocket handler + real AgentRun (no GraphQL/DB) | harness convention | closed by packaged-app journey |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | REPO-01..04, E2E-01..05, UI-01..03 | all approved behavior proven |
| Not Tested | live keepalive (part of TMP-01) | compaction could not be made to exceed 30 s cheaply; covered by synthetic real-shape replay (AC-023 as written), real-data timing (E55) and CLI source |

## Observations (non-blocking, outside approved acceptance criteria)

- OBS-1: Reopened history shows a failed Claude compaction as "Provider context compaction failed" without the reason. The marker persists `error_message`, and web hydration would display `errorMessage`. But the server replay transform (`raw-trace-to-historical-replay-events.ts` `createCompactionEvent` / `historical-replay-events-to-activities.ts`) does not copy it. Live shows the reason. This is a pre-existing reader limitation (any provider); the reader is "unchanged" by design. Possible follow-up for solution_designer.
- OBS-2: In the Event Monitor "browse earlier" active-trace page (only reachable when a run has >100 events), a failed Claude compaction appears as two event visuals (started, failed) with the same activityId, because that page is event-granular and a failed op does not rotate the started marker away. Recent window, Activity panel and GraphQL history show one item. Not a lingering "compacting" state.
- OBS-3: After rotation, the run's sidebar title/summary derives from the first user message of the active segment ("Reply with exactly: OK AFTER" instead of "…OK ONE"). This is a consequence of CONF-001, consistent with Codex/AutoByteus.
- OBS-4: Live keepalive not reproduced. CLI 2.1.283 source: the 30 s keepalive runs only while a turn waits on a pending precomputed (background) compaction and is cleared in `finally` before the result/boundary is applied. So no keepalive can follow the boundary, and the tracker cannot open a spurious post-boundary operation.

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| isolated instance iso-55016-1001 + data root | mine | `isolated-app stop` | stopped, data root removed, ports released |
| live E2E temp roots | test-owned | afterEach rm | none left |
| probe temp dirs (3 × probe-*) | mine | rm -rf | removed |
| tests/tmp-api-e2e | mine | rm -rf (copies kept in evidence) | removed |
| /tmp/rwta-base worktree | mine | git worktree remove | removed |
| autobyteus-web/electron-dist build output | mine (gitignored build output) | left in place (needed if delivery reuses `--from-worktree`) | not tracked |
| other instance iso-52483-84f0 | not mine | untouched | — |

## Preliminary Classification

N/A — Pass.

## Latest Authoritative Result

- Result: **Pass**
- Final validation confidence: 95.0 % (lowest category 93 %)
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` — executed (Live API on both CLIs + packaged desktop journey)
- Critical acceptance criteria lacking direct proof: none
- Next recipient: per `get_handoff_rules` (direct route → delivery)
- Notes: Durable test changes are uncommitted in the worktree (2 files). Observations OBS-1..4 are reported for the Solution Designer/delivery owner; none blocks the approved scope.
