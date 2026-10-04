# API/E2E Execution Coverage Report — AGY compaction detection and raw-trace rotation

## Execution Round Meta

- Requirements Doc: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/requirements-doc.md
- Investigation Notes: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/investigation-notes.md
- Solution Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/solution-revision-record.md
- Design Spec: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/design-spec.md
- Supplemental Task Artifacts: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/probes/
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/implementation-handoff.md
- Implementation Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/implementation-revision-record.md (IR-001, commit f615e5d06)
- Code Review Report / Revision Record: `N/A — not applicable` (direct route)
- Coverage Investigation: api-e2e-coverage-investigation.md; Ledger: api-e2e-test-case-ledger.md; Revision Record: api-e2e-revision-record.md (same folder)
- Evidence folder: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/api-e2e-evidence/
- Current API/E2E Revision ID: `API-REV-001`; Current Execution Round: 1; Trigger: implementation_engineer "Implementation Complete" (IR-001)

## Routing Classification

- Task size `Medium`; architectural risk `Low`; input route `Direct Low-Risk`; output route `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Investigation written before durable coverage changes: `Yes`. Plan followed: `Yes`.
- Revisions during execution: E2E-L2 run 2 failed on a test defect: "OK DUMP1" matched "OK DUMP10" as a substring. The assertion was fixed to a word boundary and rerun (run 3 passed). Not a product defect.
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger initialized before execution; every case recorded; reconciled: `Yes`. Last event: 12. No unstarted or interrupted cases.

| Case ID | Final Result | Evidence |
| --- | --- | --- |
| REPO-01 | Pass | console (352 passed / 5 skipped) |
| REPO-02 | Pass | console |
| E2E-S1 | Pass | scripted-agy-e2e.log |
| E2E-G1 | Pass (+ mutation check fails as expected) | scripted-agy-e2e.log |
| REPO-03 | Pass | scripted-agy-e2e.log (8 files, 45 passed / 1 pre-existing skip) |
| REPO-04 | Pass | sweep-head.json, sweep-base.json, rerun-stopped-run-model-config-head.log |
| WEB-1 | Pass | console (29/29) |
| E2E-L1 | Pass | live-agy-run1.log |
| E2E-L2 | Pass (run 3; run 2 test defect) | live-agy-run2-two-checkpoints.log, live-agy-run3-two-checkpoints.log |
| UI-1 | Pass | ui-01-agy-live-compaction.png, ui-02-agy-reopened-restored.png, ui-run-memory/raw_traces_manifest.json |

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`. The version gate is the approved DEC-A04, not a compatibility shim.
- Legacy retention: `No`. Persisted-data decision followed (no migration; old AGY traces untouched): `Yes`.
- Durable coverage for compatibility-only behavior: `No`.

## Changed Boundary And Evidence Matrix

| Case ID | Requirement / AC | Boundary | Mode | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| REPO-01 | AC-A01a, AC-A02, AC-A04, AC-A05 | converter (real 1.2.16 frames), payload, version gate, factory wiring, recorder dedupe | unit | Durable | Pass | 2 markers / 2 segments from the recorded two-compaction stream; gate on/off; duplicates; non-DONE |
| E2E-S1 | AC-A01b, AC-A02, BEH-A4 | fake CLI → real server → websocket/memory/GraphQL | scripted | Durable | Pass | 1 COMPACTION_STATUS (checkpoint:4, duration_ms 7293), 1 segment, history at boundary |
| E2E-G1 | AC-A04, SCN-A4 | fake CLI reporting 1.2.15 streams the same checkpoint | scripted (new) | Durable | Pass | 0 COMPACTION_STATUS, 0 markers, 0 segments, both replies in traces and history; mutation to 1.2.16 makes it fail |
| REPO-03 | REQ-A05 | existing AGY flows with the shared fixture | scripted | Durable | Pass | 45 passed |
| REPO-04 | REQ-A05 (Claude/Codex/memory/history) | 1883-test sweep vs base 517409d40 | regression | Durable | Pass | same 66 pre-existing failures; 0 new |
| WEB-1 | BEH-A2 | web projection of AGY single-phase payload | Nuxt Vitest (new case) | Durable | Pass | each checkpoint → its own completed row (activity id per provider_event_id) |
| E2E-L1 | AC-A01c, AC-A02, BEH-A4, RU-2 | real agy 1.2.16 → real server | live | Durable/Live | Pass | checkpoint step 9 on turn 5 (6.5 s); 1 segment; GraphQL history 1 completed row, no dump 1; terminate + restore + "OK RESTORED": no new compaction/segment |
| E2E-L2 | SCN-A2 | same, `AGY_COMPACTION_E2E_CHECKPOINTS=2` | live | Durable/Live | Pass | checkpoints 9 (7.4 s) and 20 (6.4 s); 2 segments; history shows only the latest; restore OK |
| UI-1 | BEH-A1, BEH-A2, BEH-A4, RU-2, RU-3 | packaged desktop app (isolated iso-55988-b4c4, worktree build), Antigravity CLI runtime, Gemini 3.8 Flash (Low) | Desktop | Desktop | Pass | 5 dumps via composer; on turn 5 one COMPLETED row appeared (6.5 s) in Event Monitor and Activity (boundary agy:…:checkpoint:9, source antigravity.checkpoint); after app restart, reopen starts at the row (OK DUMP5, OK AFTER; dumps 1–4 archived); sending "OK RESTORED" restores AGY and continues with no new row; disk: 1 segment (9 records), active marker compacted duration_ms 6187 |

## Validation Confidence Scorecard

| Category | Post-Repository | Final | Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90 % | 95 % | every AC proven directly (unit replay, scripted, live ×2, gate off end to end) | BEH-A2 "with duration" is in event and marker but not displayed (OBS-1) |
| Changed-boundary execution directness | 92 % | 96 % | real agy stream through the real server and the packaged app | — |
| Cross-boundary integration realism and mock gap | 90 % | 95 % | packaged app, GraphQL history, app restart, AGY restore | — |
| Environment, configuration, identity, and fixture fidelity | 90 % | 95 % | real agy 1.2.16; older version only via fake (no older binary exists, DEC-A04/U04) | real older-binary `--version` format (fake assumes "agy version 1.2.11"; parser takes the first x.y.z) |
| Failure, edge-case, lifecycle, and recovery evidence | 90 % | 95 % | live restore (harness and app), gate off, duplicate and non-DONE units, second compaction live | AGY compaction failure not observable (out of scope; safe) |
| User-surface, browser, and desktop-shell confidence | 85 % | 94 % | live and reopened rows in the packaged app | duration not shown (OBS-1) |
| Durable regression coverage quality and relevance | 95 % | 95 % | new gate-off E2E, extended live E2E, web case | live suites opt-in (quota) |

- Overall post-repository confidence: 90.3 %; overall final confidence: **95.0 %** (665/7); lowest category 94 %.
- Every critical AC directly proven: `Yes`. Any category below 90 %: `No`. 95 % target met: `Yes`.

## Broader Validation Decision And Execution

- Decision: `Required` — Live API (real agy through the real server) plus Project Desktop Validation (isolated instance of the worktree build).
- Setup:
  - The app was started with `pnpm --silent isolated-app start --build`.
  - The agent definition was created through GraphQL `createAgentDefinition`.
  - The UI was driven through browser-automation (attach-only). Data dumps were set into the composer textarea and sent with the Send button, as if pasted.
  - Restart used `isolated-app restart`; the instance was stopped and its data root removed afterwards.
- The real AGY CLI uses the operator's AGY login and quota and writes its own conversation data under ~/.gemini (as in the investigation probes). No AutoByteus user data was used. Another worktree's running instance was not touched.

## Platform / Runtime Targets

macOS (arm64); agy 1.2.16; gemini-3.8-flash-low; Electron 42.4.1 packaged build.

## Lifecycle / Restart / Persisted-Data Checks

No migration. New markers and archives were read by the unchanged reader in the harness and in the app after restart. Restoring an AGY run after a compaction keeps the archive and the boundary and continues normally. No version-specific runtime branch other than the approved gate.

## Durable Coverage Changed In The Codebase (uncommitted in the worktree)

| Path | Change | Requirement | Result |
| --- | --- | --- | --- |
| autobyteus-server-ts/tests/e2e/runtime/agy-compaction-gate-off-transport.e2e.test.ts | Added | REQ-A04 / AC-A04 end to end (fake CLI 1.2.15) | Pass; sensitive to the gate (mutation fails) |
| autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs | Updated | `AGY_FAKE_VERSION` overrides the reported `--version` | other AGY scripted suites pass |
| autobyteus-server-ts/tests/e2e/runtime/agy-compaction-rotation-live.e2e.test.ts | Updated | GraphQL history check (BEH-A4), terminate + restore + continue (RU-2), uniqueness of boundary keys, optional `AGY_COMPACTION_E2E_CHECKPOINTS=2` (SCN-A2), compaction summary log | Pass (1 and 2 checkpoints) |
| autobyteus-web/services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts | Updated | AGY single-phase completed rows, one per checkpoint (BEH-A2) | Pass |

Removed paths: none.

## Temporary Execution Methods / Scaffolding

| Method | Result | Cleanup |
| --- | --- | --- |
| gate-off mutation copy (version 1.2.16) | failed as expected | deleted |
| base worktree /tmp/agy-base (517409d40, node_modules symlinked) | identical failures | removed |
| UI script api-e2e-evidence/ui-dump-script.js | drove the composer | kept as evidence |

## Dependencies Mocked Or Emulated

AGY CLI emulated by tests/fixtures/agy-failure-cli.mjs in scripted suites (determinism, older version); real agy used in live and desktop cases.

## Observations (non-blocking; outside the approved ACs)

- OBS-1: BEH-A2 says "one completed compaction activity, with duration". The duration is carried in the COMPACTION_STATUS event (`duration_ms`) and persisted in the marker (AC-A02/REQ-A03 met). But the web Activity/Event Monitor row does not display it. The compaction row shows turn, provider, boundary and source; this is the existing web component, and the design made no web change. Suggest solution_designer decide whether a duration display is wanted (small follow-up). The same applies to Claude's `duration_ms`.
- OBS-2 (docs, for delivery's doc sync):
  - antigravity_cli_runtime.md says "Older AGY versions also stream early non-compaction checkpoint steps". A08 shows those steps in transcripts, not proven in the stream, so "may stream" is accurate.
  - TESTING.md AGY rows could name the new gate-off file and `AGY_COMPACTION_E2E_CHECKPOINTS=2`.
- OBS-3: the first broad sweep in a fresh worktree fails 2 `stopped-run-model-config-graphql` tests with `TEST_SERVER_BUILD_REQUIRED`; they pass on rerun. This is pre-existing environment behavior, also seen on the Claude ticket.

## Result Summary

| Result | Case IDs |
| --- | --- |
| Pass | REPO-01..04, E2E-S1, E2E-G1, WEB-1, E2E-L1, E2E-L2, UI-1 |
| Not Tested (not available) | real AGY < 1.2.16 binary; AGY compaction failure (not observable) |

## Cleanup Performed

Isolated instance iso-55988-b4c4 stopped (data root removed, ports released); base worktree removed; temporary scripts removed; test temp dirs removed by the tests. Not mine and untouched: other worktrees' isolated instances. autobyteus-web/electron-dist holds this worktree's packaged build (gitignored output). `nuxt prepare` generated autobyteus-web/.nuxt (gitignored).

## Latest Authoritative Result

- Result: **Pass**
- Final validation confidence: 95.0 % (lowest category 94 %); 95 % target met; no category below 90 %.
- Broader validation: `Required` — executed (live AGY ×3 runs, packaged desktop journey).
- Critical ACs lacking direct proof: none.
- Next recipient: per `get_handoff_rules` (direct route → delivery).
