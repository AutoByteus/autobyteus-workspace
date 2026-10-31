# Docs Sync Report — autobyteus-316 (cross-runtime-resume)

## Scope

- Ticket: `cross-runtime-resume` (Project Task autobyteus-316); `task_size` Large, `architectural_risk` High, reviewed route (architecture review ARCH-REV-001…004, source review CRR-001…003 Pass, API/E2E API-REV-001 Fail then API-REV-002 Pass 94.9%, test-code review CRR-004 Pass)
- Trigger: code reviewer's CRR-004 Pass handoff
- Bootstrap base reference: `origin/personal` @ `9d59ab82ec`; merged earlier at `a8d7c87564` (autobyteus-343)
- Integrated base reference used for docs sync: `origin/personal` @ `a977b2c1bc`
- Post-integration verification reference: `evidence/DEL-01-post-integration-checks.md`

## Why Docs Were Updated

- Summary: a stopped standalone Agent run can now switch agent runtime; the doc set must describe the switch, the renamed GraphQL mutation, the per-file runtime of journals and the chat reader. The implementation updated five docs; delivery verified each against the final code and the merged base.
- Why long-lived: the switch protocol, its failure and restart behavior and its limits are what later work (teams, Model Router) builds on.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `GLOSSARY.md` | new terms (Agent runtime switch, Pending agent runtime switch, Hand-over notice, Switch marker, Previous agent) | No change (updated in the ticket) | terms match the code names `pendingRuntimeSwitch`, `system.runtime_handover`; the hand-over notice names no runtime |
| `autobyteus-server-ts/docs/modules/run_history.md` | owner of the settings mutation and the switch lifecycle | No change (updated in the ticket) | `updateStoppedAgentRunSelection`, `StandaloneStoppedRunSelectionUpdater`, `commitRunRuntimeSwitch`, `activateSwitched`, `RuntimeHandoverNoticeService`, `getChatRawTraceSnapshot` all exist in `src/`; order of `begin`/`record`/`discard` matches R2 RS-05..RS-07 |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | `runtime_switch` segment and marker | No change (updated in the ticket) | one line; consistent with `RuntimeSwitchRecorder` |
| `autobyteus-server-ts/docs/modules/agent_work_journal.md` | per-file runtime in the journal manifest | No change (updated in the ticket); verified after the merge with autobyteus-331/343 | manifest example holds `renderer_revision: 2` (autobyteus-331) and each file's own `runtime_kind` (this ticket); both edits coexist |
| `autobyteus-web/docs/settings.md` | run settings card | No change (updated in the ticket); merged with autobyteus-305's Nodes page text without conflict | |
| `RELEASE.md`, `TESTING.md`, `DESIGN.md` | project rules | No change | none changed by this ticket |

## Docs Updated

By delivery: none (the ticket's five docs stand and match the integrated code). New delivery artifact: `release-notes.md` (user-facing, ready for a later release).

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Switch protocol | save records a pending switch only; the first message archives, writes the marker, starts the new file; failure and restart rules; one `RuntimeSwitchMemory` port | design-spec, `run-runtime-switch-contract.md` | `run_history.md` |
| Hand-over notice | derived from raw traces, survives a restart, names no runtime | design-spec §3.7 | `run_history.md`, `GLOSSARY.md` |
| Per-file journal runtime | each file is read with the translation of the runtime that wrote it | design-spec | `agent_work_journal.md` |
| Chat of a switched run | reads `runtime_switch` segments then the active file; never a compaction segment | design-spec §3.7, I-10 | `run_history.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `updateStoppedAgentRunModelConfig` / `UpdateStoppedAgentRunModelConfig*` | `updateStoppedAgentRunSelection` with a required `runtimeKind` (clean cut; the team family keeps its names) | `run_history.md`; no reference to the old name remains outside tickets |
| Run-level `runtime_kind` of the journal manifest | one `runtime_kind` per file | `agent_work_journal.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: archive the ticket and finalize.
- Notes: FU-009 (misplaced `import {` in `tests/e2e/helpers/claude-live-agent-harness.ts`) is still broken on `origin/personal`; it is the same defect as autobyteus-331's FU-004. FU-010 (new): add RS-07 and RS-08 to the header of `runtime-switch-native-built-server.e2e.test.ts`.
