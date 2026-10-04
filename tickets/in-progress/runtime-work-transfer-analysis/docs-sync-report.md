# Docs Sync Report

## Scope

- Ticket: runtime-work-transfer-analysis — fix Claude Agent SDK compaction detection and raw-trace rotation.
- Trigger: API-REV-001 Pass (final confidence 95.0%) on implementation IR-001 / solution SR-013.
- Classification: task_size `Medium`, architectural_risk `Low` (carried unchanged). Direct low-risk route. Architecture review, source code review and test-code review: `N/A — not applicable`.
- Bootstrap base reference: origin/personal @ 39f2dd008c3e4d90d85312f046df13a58172c236.
- Integrated base reference used for docs sync: origin/personal @ 278fc7ee8eccf3fdcbdbbe9696f8689e8b1c89c0, merged into the ticket branch as b6c9fafdf074a1b969d87adda7322e24ee693165.
- Post-integration verification reference: release-deployment-report.md, section "Initial Delivery Integration Refresh". 113/113 server unit tests, server src typecheck, and 24/24 web spec all pass.

## Why Docs Were Updated

- Summary: `agent_memory.md` described Claude compaction with two one-line bullets based on the old stateless model ("`status: compacting` → provenance; `compact_boundary` → marker"). That model is gone. The bullets now describe what the code does: frames are recognized from their real SDK shape, a per-session operation tracker handles them, keepalive frames are suppressed, every event in one operation shares an operation id, a failed or abandoned compaction is closed as `failed` with no rotation and before the turn settles, the boundary key comes from the boundary frame uuid, and the optional marker fields are recorded. `TESTING.md` gained the new cost-gated Claude compaction live suite and its two gates.
- Why this should live in long-lived project docs: the operation semantics, the guarantee that failure never rotates, and the ordering before turn settlement are durable contracts for the memory recorder and the live UI. The live suite is the re-verification tool after any Claude CLI or SDK bump.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| autobyteus-server-ts/docs/modules/agent_memory.md | Owns the "Provider Compaction Boundaries" contract, including the Claude bullets | Updated | The Claude bullets were stale |
| TESTING.md | Index of live, gated E2E suites | Updated | Added a Claude compaction live E2E row |
| autobyteus-server-ts/docs/modules/run_history.md | Archive/rotation boundaries; reopened-history reader | No change | The generic text "Codex and Claude provider-boundary handling may rotate…" is now true in practice; the reader did not change (CONF-001) |
| autobyteus-server-ts/docs/modules/codex_integration.md | Codex compaction normalization | No change | Codex paths were untouched (REQ-014) |
| autobyteus-server-ts/docs/modules/agent_execution.md | Claude session lifecycle, interrupt and terminate | No change | Turn settlement contract unchanged; compaction close is internal to that settlement |
| autobyteus-web/docs/agent_execution_architecture.md | `COMPACTION_STATUS` handler, compaction Activity | No change | The phase contract already includes `failed`; no frontend source change; provider boundary identity is described generically |
| autobyteus-web/docs/memory.md | Raw Traces tab, segment files | No change | Segment behavior is generic and still accurate |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| autobyteus-server-ts/docs/modules/agent_memory.md | Contract correction | Replaced the 2 Claude bullets with 4 covering the tracker or operation model, the boundary marker and its metadata, the failed or abandoned close (reasons, ordering, no rotation), and shared `provider_event_id` plus the optional fields | The doc described heuristics that were removed |
| TESTING.md | New durable suite entry | Claude compaction live E2E command, `RUN_CLAUDE_E2E=1` and `RUN_CLAUDE_AUTO_COMPACTION_E2E=1` gates, CLI coverage | Makes the new durable live suite discoverable |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Claude compaction operation | Real frame shapes; one operation; keepalives suppressed; shared operation id | design-spec.md, investigation-notes.md E53–E70, implementation-handoff.md | agent_memory.md |
| Failure semantics | `compact_result: failed` or a turn settling with the operation open → `failed`, emitted before turn settlement, never rotates | requirements-doc.md REQ-025, api-e2e-execution-coverage-report.md | agent_memory.md |
| Marker metadata | trigger, pre/post tokens, duration_ms, error_message; recorded only when present; Codex markers byte-identical | implementation-handoff.md | agent_memory.md |
| Live re-verification | Gated suite across PATH and bundled CLIs | api-e2e-execution-coverage-report.md | TESTING.md |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `buildClaudeProviderCompactionEvent` (stateless guess at the frame shape, uuid-per-status identity) | `ClaudeCompactionOperationTracker` (per-session operation state machine) | agent_memory.md "Provider Compaction Boundaries" |
| Converter-private `buildClaudeCompactionBoundaryPayload` | `events/claude-compaction-status-payload.ts` | agent_memory.md (behavior); source |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: hand off for explicit user verification. Archiving, the final commit, push, merge and cleanup all wait for that verification.
- Notes: non-blocking validation observations OBS-1..OBS-4 are outside the approved ACs. They are recorded in handoff-summary.md as possible follow-ups and are not documented as product behavior changes.
