# Implementation Handoff — AGY compaction detection and raw-trace rotation

Ticket root: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis
Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis; branch `codex/agy-compaction-analysis`; base origin/personal @ 517409d40; implementation commit `f615e5d06`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Direct route (Medium / Low). Solution Designer sent "Architecture Design Complete" under the Small/Medium + Low rule → /implementation_engineer.
- Requirements doc: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/requirements-doc.md (Approved 2026-10-04; REQ-A01–A05, DEC-A01–A05)
- Investigation notes: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/investigation-notes.md (A01–A20)
- Solution revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/solution-revision-record.md (SR-002)
- Design spec: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/design-spec.md
- Supplemental task artifacts: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/probes/ ; solution handoff /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/solution-handoff.md
- Design review report: `N/A — not applicable` (direct route)
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: N/A — initial implementation

## Current Implementation Summary

When a backend is created or restored, `AgyAgentRunBackendFactory` reads the CLI version through the new `readAntigravityCliVersion()`. This is a bounded `agy --version`; a successful read is cached per server process, and a failed read is not cached. `isAgyCompactionDetectionSupported` compares the version against `AGY_COMPACTION_DETECTION_MIN_VERSION` = 1.2.16. The result goes to `AgyAgentRunBackend` as `{ compactionDetection }`, which passes it to `AgyStreamEventConverter`. When detection is off, the factory logs one info line naming the version.

With detection on, the converter maps a `step_update` with `step_type:"checkpoint"` and `state:"DONE"` to one `COMPACTION_STATUS` event built by the new `buildAgyCompactionStatusPayload`. The payload follows design "Return Or Event Spine" exactly:
- `kind` provider_compaction_boundary, `runtime_kind` ANTIGRAVITY, `provider` antigravity, `source_surface` antigravity.checkpoint
- `boundary_key` agy:&lt;conversation&gt;:checkpoint:&lt;step&gt;, `provider_session_id` = conversation, `provider_event_id` checkpoint:&lt;step&gt;
- `status` compacted, `trigger` auto, `rotation_eligible` true, `semantic_compaction` false
- `duration_ms` = round(duration_seconds × 1000), or null when there is no duration

Each step index is reported once per converter lifetime (one conversation). The existing recorder, rotation, WebSocket mapping and web projection are reused unchanged. Version admission (`listAntigravityModels`) is unchanged and still never calls `--version`.

- Implementation cycle: `Initial`
- Implementation revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis/tickets/in-progress/agy-compaction-analysis/implementation-revision-record.md
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`
- Related architecture-review / code-review / API-E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - One new source file (payload builder) and 4 edited source files, all in the AGY backend and its capability module. Test, fixture and doc updates as designed.
  - The escalation triggers did not fire. The checkpoint arrives inside the active turn: in the real fixtures, in the scripted E2E and in the live run. The recorder contract is unchanged; it already accepted `duration_ms`.
  - No schema, migration or concurrency change. No change to Claude or Codex code.
- Selected route: `Direct API/E2E` (per get_handoff_rules)
- Lightweight implementation self-review completed: `Yes`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-A1 / REQ-A01 | One archive segment per AGY compaction (≥ 1.2.16) | agy stdout → AgyStreamProcess → parseAgyStreamMessage → `AgyStreamEventConverter.convert` → `checkpoint()` → `buildAgyCompactionStatusPayload` → COMPACTION_STATUS → RuntimeMemoryEventAccumulator → ProviderCompactionBoundaryRecorder → rotateActiveRawTracesBeforeBoundary | Implemented. AC-A01a: replaying the real two-compaction stream gives 2 markers and 2 segments, with 8 assistant replies archived and 3 active. AC-A01b: the scripted fake-CLI E2E gives 1 segment. AC-A01c: the live E2E smoke passed. |
| BEH-A2 / REQ-A02 / REQ-A03 | One completed compaction with duration; no started phase | Same event → agent-run-event-message-mapper → WebSocket COMPACTION_STATUS (status `compacted`) | Implemented. One COMPACTION_STATUS over the WebSocket carrying provider antigravity, provider_event_id `checkpoint:<n>` and duration_ms 7293. It arrives after the turn start and before the reply. |
| BEH-A3 / REQ-A04 | Version < 1.2.16 or unknown: unchanged | `AgyAgentRunBackendFactory.resolveCompactionDetection` → `readAntigravityCliVersion` + `isAgyCompactionDetectionSupported` → `{ compactionDetection }` → converter | Implemented. Unit tests cover 1.2.16, 1.2.17, 1.3.0, 1.10.0, 2.0.0 and "agy version 1.2.16" (on), and 1.2.15, 1.1.99, 0.9.30, "", garbage and null (off). Factory tests cover create and restore with on and off. A missing CLI also returns null. |
| BEH-A4 | Reopened history shows work since the latest compaction | Unchanged reader (active segment only) | Verified in the scripted E2E: the history projection contains the post-compaction reply and not the pre-compaction reply. |
| REQ-A05 | Other steps/runtimes unchanged; duplicates idempotent | Converter `checkpoints` set (not cleared on startTurn); recorder boundary-key dedupe | A duplicate step in a later turn produces one event and one segment. A duplicate payload sent to the accumulator, including from a fresh accumulator on the same memory dir, gives one segment. The existing AGY scripted E2Es pass (43). See checks for the regression sweep. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Source (autobyteus-server-ts/):
- `src/runtime-management/antigravity-cli-capability.ts` — `AGY_COMPACTION_DETECTION_MIN_VERSION`, `isAgyCompactionDetectionSupported`, `readAntigravityCliVersion` (reuses the existing bounded `runCommand`).
- `src/agent-execution/backends/antigravity/backend/agy-agent-run-backend-factory.ts` — `resolveCompactionDetection` in `launch()`, which covers both create and restore; logs when detection is off.
- `src/agent-execution/backends/antigravity/backend/agy-agent-run-backend.ts` — optional `converterOptions` constructor parameter, passed to the converter.
- `src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts` — `AgyStreamEventConverterOptions`, `checkpoint()` branch, `checkpoints` set.
- `src/agent-execution/backends/antigravity/stream/agy-compaction-status-payload.ts` — NEW payload builder.

Tests and fixtures:
- `tests/fixtures/agy-compaction/` — NEW: verbatim AGY 1.2.16 stdout (two-compaction and one-compaction runs) plus a README.
- `tests/unit/agent-execution/backends/antigravity/agy-compaction-checkpoint.test.ts` — NEW, 9 tests. Covers the real-frame replay, the payload, in-turn ordering, memory rotation, gate off, duplicates, non-DONE states and missing duration.
- `tests/unit/runtime-management/antigravity-cli-capability.test.ts` — version gate, caching, unreadable and missing CLI. The fake CLI still rejects `--version` unless the test opts in, so the guard that admission never probes the version still holds.
- `tests/unit/agent-execution/backends/antigravity/agy-agent-run-backend-factory.test.ts` — the capability mock now keeps the real gate (`importOriginal`) and mocks `readAntigravityCliVersion`. New tests check create/restore wiring with detection on and the off-and-logged cases.
- `tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts` — the AGY boundary rotates once; the same boundary again is a no-op.
- `tests/fixtures/agy-failure-cli.mjs` — new `auto_compaction` case. It reports `1.2.16` for `--version` only for this case (other cases keep `agy version 1.2.11`) and streams the checkpoint on turn 2.
- `tests/e2e/runtime/agy-compaction-rotation-transport.e2e.test.ts` — NEW scripted E2E (RUN_AGY_FAILURE_E2E convention).
- `tests/e2e/runtime/agy-compaction-rotation-live.e2e.test.ts` — NEW, opt-in via `RUN_AGY_COMPACTION_E2E=1`.

Docs: `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` (version probe paragraph and a new "Automatic compaction" section), `autobyteus-server-ts/docs/modules/agent_memory.md` (AGY added to the rotation and provider-boundary sections), `TESTING.md` (AGY fake and live rows).

## Important Assumptions

- **Version flag in the backend constructor, not the context.** The design allowed either `agy-agent-run-context.ts` or the backend. I pass the flag as a backend constructor option. `AgyAgentRunContext` is also rebuilt by `agent-run-restore-context-factory` from the persisted conversation id, where a version flag would be meaningless. The flag is a fact about the CLI process, decided per launch.
- **Version parsing.** The version is the first `x.y.z` in the `--version` output. The real CLI prints a bare `1.2.16`; the scripted fixture prints `agy version 1.2.11`.
- **Version cache.** A failed read is not cached, so a transient timeout only disables detection for that one run. This refines the design's "cached per process"; a successful read is cached as designed.

## Known Risks

- AGY's compaction-failure reporting is unknown. A failure gives no DONE checkpoint, so nothing rotates, which is safe.
- Future AGY versions may change the stream shape. The gate is only a minimum version, so newer versions are enabled.
- A CLI update is picked up only after a server restart (cached version).
- `/compact` in AGY is still answered falsely by the model (DEC-A01, out of scope).
- A live E2E run uses AGY quota.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: missing mapping, added at the stream edge; version gate at the existing CLI capability owner.
- Reviewed root-cause classification: missing mapping, not a structural defect.
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the converter receives only a boolean and never calls the CLI. The capability module imports nothing from the backend. AGY transcript files are not read.

### Self-review (direct route)
- The mapping fires only on state `DONE`. ACTIVE, ERROR and PENDING are ignored (tested). Nothing rotates on non-DONE states.
- The payload matches the design's event spine field for field (exact-equality test).
- In both the real fixtures and the scripted E2E, the checkpoint sits after the turn start and before the reply, so the converter's existing turn guard holds.
- Admission behavior is unchanged: the `--version` admission guard test is kept, and an unreadable version never fails a run.
- No Claude or Codex file changed. The memory recorder is unchanged; it already accepts `duration_ms`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. The version gate is the approved DEC-A04, not a compatibility shim.
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code removed: `Yes` (nothing became obsolete)
- Shared structures remain tight: `Yes` (no shared model change)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. Converter 253, factory 116, backend 174, capability 111, payload 26 effective lines. Largest source delta: +35.

## Persisted Data Transition Check

- Approved decision: no migration. New markers use the existing provider_compaction_boundary trace type and manifest; old AGY raw traces are untouched.
- Implementation follows it without migration or version-specific fallback: `Yes`
- Deviation: `None`

## Environment Or Dependency Notes

- In this worktree I ran `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-ts build`, `pnpm -C autobyteus-server-ts prepare:shared` and `prisma generate`. These produce untracked `dist/` folders in two SDK packages, which are not committed.
- Local agy is `1.2.16` at `/Users/normy/.local/bin/agy`.

## Local Implementation Checks Run

- `tsc -p tsconfig.build.json --noEmit` (server src) → pass.
- `agy-compaction-checkpoint.test.ts` 9/9; `antigravity-cli-capability.test.ts` 38/38; `agy-agent-run-backend-factory.test.ts` 20/20; `runtime-memory-event-accumulator.test.ts` 24/24.
- Scripted fake-CLI E2E `agy-compaction-rotation-transport.e2e.test.ts` → 1/1 (WebSocket event, one memory segment, active traces start at the marker, history at the boundary, no compaction on a later turn).
- Existing scripted AGY E2Es (failure, background-task, linked-skills, mcp-tool-call, native-tool-arguments, native-image-step-output) → 43 passed, 1 skipped, with the fixture change.
- Implementation smoke of the opt-in live E2E (`RUN_AGY_COMPACTION_E2E=1`, real agy 1.2.16, gemini-3.8-flash-low) → 1/1 in 28 s. Run once to validate the new test against the real CLI; this is not API/E2E sign-off.
- Regression sweep (unit agent-execution, agent-memory, run-history, runtime-management, services/agent-streaming; integration agent-execution, agent-memory, run-history; agent-work-traces) → 1749 passed, 54 failed in 16 files. The same 16 files fail identically (54 failed / 58 passed) on the base with my tracked changes stashed. These failures are pre-existing and unrelated; none is an AGY, compaction or memory-rotation test.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable. There is no frontend change. The web already projects provider COMPACTION_STATUS generically by provider + provider_event_id, and status `compacted` maps to completed. I did not run a web check in this round.

## Downstream Coverage Hints / Suggested Scenarios

- Run the live E2E independently. Optionally use a longer run that reaches the second checkpoint (around turn 9) to confirm two segments live.
- Restore an AGY run after a compaction (server restart): the next compaction gets a new step index, and a replayed or duplicate step adds no segment.
- Web: in live and reopened history, one completed compaction row with its duration.
- Gate off: run with a CLI reporting an older version (the scripted fixture's other cases report 1.2.11) and confirm no marker.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent execution of the scripted and live E2Es, and pass/fail classification.
- Web activity check for AGY compaction, live and in history.
- Any broader coverage you judge necessary for REQ-A01–A05.
