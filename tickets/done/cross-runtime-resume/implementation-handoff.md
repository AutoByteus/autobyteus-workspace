# Implementation Handoff — autobyteus-316 (cross-runtime resume, first delivery: one standalone Agent run)

Result: **Implementation Complete (rework, IR-002)**, ready for independent code review. `task_size` = **Large**, `architectural_risk` = **High**, unchanged.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large + High). Round 4 `ARCH-REV-004` is a **Pass** and includes the `switchId` addendum (SR-004 note 16). Primary recipient of that pass: the implementation engineer. Handoff rule for this result: Large/High → `/software_engineering_team/code_reviewer`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume/tickets/in-progress/cross-runtime-resume/requirements-doc.md` (SR-004 Approved; REQ-010 amended, REQ-014 and AC-010 added in round 3; no change in round 4)
- Investigation notes: `.../investigation-notes.md`
- Solution revision record: `.../solution-revision-record.md` (SR-004 notes 1–16)
- Design spec: `.../design-spec.md` (status `Needs Review`; the user's go for the build of 2026-10-31 stands)
- Supplemental task artifacts: `.../run-runtime-switch-contract.md` (data only now: §3.1–3.7, I-1…I-11)
- Design review report: `.../design-review-report.md` (ARCH-REV-004 Pass; Low clarifications ARCH-F-008 applied below)
- Architecture review revision record: `.../architecture-review-revision-record.md`
- Triggering rework reports: `.../api-e2e-execution-coverage-report.md` (API-REV-001: F-1 native candidate record in the previous agent's archive, F-2 reopened chat history), `.../code-review-report.md` (CRR-002: F-1, F-2 Design Impact, F-3 Local Fix), the red test `autobyteus-server-ts/tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts` (RS-01)
- Implementation revision record: `.../implementation-revision-record.md` (IR-001 baseline, IR-002 this round)

## Current Implementation Summary

A stopped standalone Agent run's settings save records a pending agent runtime switch (or the undo, or a model-only edit; one commit path). The first input makes it real in `StandaloneAgentRunLifecycleService.activateSwitched`, now in the order of the round-4 design: `memory.begin` (ticket: the switch and the watermark, the ID of the last record the previous agent wrote; writes nothing) → prepare the new agent runtime's session → validate it → `memory.record(ticket)` (one library call: archive through the watermark as a `runtime_switch` segment, marker first, the candidate's own records after it) → the activation commit that clears the pending field → publish. A failure before `record` succeeded aborts the candidate and, only when its release is confirmed, `memory.discard(ticket)` removes what the candidate wrote after the watermark. The hand-over notice is **derived** from the raw traces (the marker is the active file's first record and no `user` record follows); there is no register call and no second port. The chat of a switched run is read from the `runtime_switch` segments, then the active file. The journal renders each file with its own runtime. `pendingRuntimeSwitch` holds `{ switchId, from }`.

- Implementation cycle: `Rework`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume/tickets/in-progress/cross-runtime-resume/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: SR-004 (notes 14–16)
- Related architecture-review revision IDs: ARCH-REV-003 (Fail, ARCH-F-007), ARCH-REV-004 (Pass, ARCH-F-008 Low clarifications)
- Related code-review revision IDs: CRR-001 (superseded Pass), CRR-002 (failure-origin)
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Triggering finding IDs: CRR-002 F-1, F-2, F-3; ARCH-F-007 (fixed), ARCH-F-008 items 1–3; API-REV-001 F-1, F-2; OBS-1 (= F-3)

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk"; ARCH-REV-004 "Routing Classification Review"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the round touches three packages again (a library method pair and two bounded readers; the server's lifecycle, memory, chat reader, notice service, run-history; tests): an ordered, retry-safe activation sequence with a deleting step on authoritative data, a persisted-field rename, and a changed read path of the chat. No new risk class found; nothing lowered.
- Selected route: `Code Review` (`/software_engineering_team/code_reviewer`)
- Lightweight implementation self-review for the direct route: `Not Applicable` (Large/High)
- New design impact or escalation trigger: `None`. The escalation trigger "a writer holding the active raw-trace file open across the rotation" was looked for again and not found (the library store appends by path; `rotateActiveRawTracesForRuntimeSwitch` replaces the file durably, as the other rotations do).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Save of a stopped standalone run: switch, undo, model-only; pending switch with `switchId`; no current model while a switch is pending (F-3) | `standalone-stopped-run-selection-updater.ts` (generates `switchId` with `randomUUID()`), `stopped-run-selection-context.ts`, `agent-run-runtime-switch-commit.ts`, `agent-run-history-catalog-service.ts`, `agent-run-pending-runtime-switch.ts` | Implemented; an old `requestedAt` section fails its parse and makes that run's file unreadable (the earlier build never shipped) |
| BEH-002 | First input: ticket, candidate, archive step with watermark, commit, publish; a failed attempt leaves nothing; hand-over derived | `standalone-agent-run-lifecycle-service.ts` (`activateSwitched`, `discardFailedSwitchAttempt`), `runtime-switch-memory-port.ts`, `runtime-switch-recorder.ts`, `external-runtime-memory-writer.ts`, library `run-memory-file-store.ts` (`rotateActiveRawTracesForRuntimeSwitch`, `removeActiveRawTracesAfter`, `readLastActiveRawTraceId`, `scanActiveRawTraces`) and `jsonl-log-file.ts` (`scanJsonlRecordsFromStart`, `readLastJsonlRecord`), `runtime-handover-reader.ts`, `runtime-handover-notice-service.ts` | Implemented; RS-01 green |
| BEH-005 | Chat after a reload: the earlier conversation, the markers, the new agent's records | `memory-file-store.ts` (`readChatRawTraces`), `agent-memory-service.ts` (`getChatRawTraceSnapshot`), `local-memory-run-view-projection-provider.ts` (both methods) | Implemented; RS-01 reads `getRunProjection` after the switches |
| BEH-007 | Journal per file runtime | unchanged from IR-001 | Preserved |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Library (`autobyteus-ts/src/memory/store/`): `run-memory-file-store.ts` (499 lines, under the limit, not above it before the change), `jsonl-log-file.ts`. Server (`autobyteus-server-ts/src/`): `agent-execution/domain/{runtime-switch,runtime-switch-memory-port}.ts` (the old `runtime-switch-ports.ts` is deleted), `agent-execution/services/{standalone-agent-run-lifecycle-service,standalone-stopped-run-selection-updater,stopped-run-selection-context}.ts`, `agent-memory/services/{runtime-switch-recorder,runtime-handover-reader,agent-memory-service}.ts`, `agent-memory/store/{external-runtime-memory-writer,memory-file-store}.ts`, `runtime-handover-notices/services/runtime-handover-notice-service.ts`, `run-history/{store,services}/*pending-runtime-switch*`, `*runtime-switch-commit.ts`, `agent-run-history-catalog-service.ts`, `run-history/projection/providers/local-memory-run-view-projection-provider.ts`, `compositions/build-studio-server.ts`. Docs: `docs/modules/run_history.md`. Web: none changed this round.

## Important Assumptions

- A stopped run's raw traces are not written by anything else between `begin` and `discard`/`record` (the run is in its transition lane and has no live session). Not proven for a native writer holding the file open (escalation trigger above); none found.
- Process crashes are not a supported scenario (Principle 6); the library methods still complete an interrupted rewrite on retry (tested).

## Known Risks

- The marker is not shown on reload after a compaction in the new era (contract §3.7, accepted by the design; the user is told at the approval request).
- If the previous era's latest `system_instruction` equals the candidate's, the new era has no instruction record of its own (design: `Unclear`, no consequence for the chat or the journal). Not exercised.
- After a failed archive step whose candidate release is quarantined or pending, nothing is discarded (by design); the records the candidate wrote stay until restart. Tested as "nothing is discarded".
- A hand-over notice is carried twice when a first input was forwarded without a turn id and the process restarted (`recordForwardedUserMessage` writes no `user` record without a turn id). Documented in `run_history.md` (ARCH-F-008 item 3).
- A failed activation followed by an undo after the marker was written leaves a marker for a switch that did not happen (stated by the design).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature`
- Reviewed root-cause classification: `Shared Structure Looseness` (journal granularity, done in IR-001); round 4 adds the sequence correction
- Reviewed refactor decision: `Refactor Needed Now` (done)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the design's file mapping places the pending-hand-over read in `memory-file-store.ts`/`agent-memory-service.ts` (`hasPendingRuntimeHandover(runId)`). Built instead as `agent-memory/services/runtime-handover-reader.ts` (`readPendingRuntimeHandover(memoryDir)`): the notice service addresses a run by its memory folder (`run.config.memoryDir`), not by an ID under one store's base directory, and the reader is a small read-only function over the library store. Same owner (`agent-memory`), same behavior, same bounded read. Please confirm this deviation.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (`runtime-switch-ports.ts`, the `RuntimeHandoverNotices` port and `register`, `getRuntimeSwitchState`, `AgentMemoryService.getActiveRawTraceSnapshot`, the compaction writer's `runtime_switch` union member; `requestedAt` renamed with no alias; the earlier IR-001 removal of `commitRunModelConfig` stands)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (`RuntimeSwitchTicket` is `{ runtimeSwitch, watermarkTraceId }`; `RuntimeSwitch` gains only `markerTraceId`)
- Canonical shared design guidance was reapplied: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes` (lifecycle 467 lines, 426 before; `run-memory-file-store.ts` 499 of 409; `>220` delta: the library store gained 90 lines, split between three cohesive methods)
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: (a) `pendingRuntimeSwitch` `Directly Usable — No Migration`; (b) manifest `runtime_switch` type `Directly Usable — No Migration`; (c) journal manifest `Discard or Rebuild`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence: IMP-06 (store test: a section with the earlier field `requestedAt` is rejected as that run's malformed section, only that run's file is unreadable)
- Deviation from the reviewed transition decision: `None`. `requestedAt` → `switchId` is a clean cut (SR-004 note 16); the earlier build never left isolated test data.

## Environment Or Dependency Notes

`autobyteus-ts` must be rebuilt (`pnpm -C autobyteus-ts build`, run by the server package's `prepare:shared`) before the server sees the new library methods. A clean clone needs `pnpm install --frozen-lockfile` for the whole workspace and `pnpm exec prisma generate --schema ./prisma/schema.prisma` before `pnpm typecheck` (the server's `pretypecheck` does not generate the Prisma client; a missing client shows as `TS7006 … 'transaction' implicitly has an 'any' type`).

## Checks Run

Commit tested for the clean-clone rows: `1bc6f85506` (code; `ce8ca5ba8f` adds evidence only). Evidence files are in `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume/tickets/in-progress/cross-runtime-resume/evidence/implementation/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | clean clone: `pnpm install --frozen-lockfile`; `pnpm exec vitest run tests/unit` in `autobyteus-ts` | 1bc6f85506 | macOS darwin arm64, node 22, pnpm 10.28.2 | the library store: switch rotation, removal after a watermark, bounded reads | REQ-010, AC-009, I-7 | Pass | `IMP-01-clean-clone-autobyteus-ts-unit.txt` | `Test Files  311 passed (311)`, `Tests  2108 passed (2108)` |
| IMP-02 | clean clone: `pnpm exec prisma generate …`; `pnpm typecheck` in `autobyteus-server-ts` | 1bc6f85506 | same | all server sources | all | Pass | `IMP-02-clean-clone-server-typecheck.txt` | `TYPECHECK_EXIT=0` |
| IMP-03 | clean clone: `pnpm test:unit` in `autobyteus-server-ts` | 1bc6f85506 | same | the whole server unit, app-data-migrations, architecture and journal suites | AC-001…AC-010, AC-007 (existing suites) | Pass | `IMP-03-clean-clone-server-unit.txt` | `Test Files  894 passed \| 5 skipped (899)`, `Tests  7617 passed \| 9 skipped (7626)` |
| IMP-04 | worktree: `pnpm build`, then `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs vitest run tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts` | 1bc6f85506 (worktree build) | same, built `dist/app.js`, private HOME and data root, test-owned LM Studio stand-in | whole stack for native → Antigravity → native, settings, host with a copy | REQ-001/002/010/011/013/014, AC-001/002/009/010, I-3/5/7/8 | Pass (the red RS-01 is green) | `IMP-04-built-server-runtime-switch-native.txt` | `✓ … RS-01: native -> Antigravity -> native …`, `Tests  3 passed (3)` |
| IMP-05 | worktree: `env -i HOME USER LOGNAME … RUN_RUNTIME_SWITCH_E2E=1 RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1 ANTIGRAVITY_CLI_COMMAND=… AGY_FAKE_CASE=auto_compaction vitest run tests/e2e/runtime/runtime-switch-live.e2e.test.ts` | 1bc6f85506 (worktree build) | same, real Claude Agent SDK and Codex App Server on an isolated data root, scripted Antigravity CLI | all three activation paths on live backends, the notice, the journals | AC-002, AC-008; I-7 on each pair | Pass | `IMP-05-live-three-runtime-switch.txt`; `evidence/real-run/runtime-switch-live/{summary.json,raw_traces_manifest.json,work_journal/}` | segments `[runtime_switch, claude_agent_sdk, 12]`, `[runtime_switch, codex_app_server, 7]` |
| IMP-06 | `npx vitest run` on the 11 focused files, verbose | 1bc6f85506 | worktree | recorder (begin/record/discard), hand-over reader, failed attempts with real files, lifecycle, updater (F-3), notice service, chat history reload (one and two switches, native → other → native), commit, pending-switch store, root first-message | AC-002, AC-009, AC-010, REQ-014 | Pass | `IMP-06-focused-unit-verbose.txt` | `Test Files  11 passed (11)`, `Tests  105 passed (105)` |

- Confirmed the red test: the RS-01 failure at the earlier commit is API/E2E's recorded evidence (`evidence/api-e2e/API-02-03-04-built-server-switch.log`, `evidence/api-e2e/rs01/…`); I did not reproduce the failure on the old build, only the pass on the new one.
- Not run, and why: web suites (no web file changed in this round; the last web clean-clone result is `evidence/implementation/ir-001/clean-web-full.txt` at `3521ae05f1`); a failed start followed by a retry on a **real** native or Grok backend (ARCH-REV-004 asked for it "if you can produce one"): no way to make a real native or Grok start fail after its instruction is written was found; the same sequence runs with the real recorder and real files in `tests/unit/agent-execution/runtime-switch-failed-attempts.test.ts` (4 cases) instead; codegen of `autobyteus-web/generated/graphql.ts` (unchanged this round, passed to API/E2E by CRR-001).

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: no web file changed in this round.

## Downstream Coverage Hints / Suggested Scenarios

- The stale title of RS-01 (`… the native candidate writes nothing before the marker`) and its header still state the first design's premise; the assertions (segments hold the previous agent's records only) are the ones the new design keeps. Updating the wording is API/E2E's.
- Worth an executable case: a native switch whose first start fails after the instruction was written (a native model that is listed at save time and fails at start), then a retry; and the same on Grok if a backend can be driven.
- Reload after two switches and after a compaction in the new era (the marker is then absent; the previous era stays).
- Restart between the activation and the first input: the notice is still delivered (derived), once.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. The code reviewer's pass is followed by `api_e2e_engineer` (CRR-002 passed API-REV-001's scope back to the implementation; the whole API/E2E scope for 316 re-runs against the new commit).
