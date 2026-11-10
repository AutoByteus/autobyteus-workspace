# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-background/tickets/in-progress/run-bash-background/requirements-doc.md` (Approved, SR-005)
- Upstream Investigation Notes: `.../run-bash-background/investigation-notes.md`
- Upstream Solution Revision Record: `.../run-bash-background/solution-revision-record.md` (SR-005 entry)
- Reviewed Design Spec: `.../run-bash-background/design-spec.md` (SR-005, `Ready`)
- Supplemental Task Artifacts Reviewed: `prototype/wrapper-skeleton-probe.sh` + `.log` (12 cases), `prototype/kill-pid-probe.mjs` + log, `prototype/background-completion.prototype.test.ts` + log, `architecture-design-handoff.md` (Round 3 section)
- Relevant Solution Revision IDs: `SR-001` to `SR-005`
- Architecture Review Revision Record: `.../run-bash-background/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: `3`
- Trigger: SR-005 revision for ARCH-REV-002 (AR-003, AR-007, AR-010), from the Solution Designer, 2026-11-10
- Prior Review Round Reviewed: `2` (ARCH-REV-002, Fail)
- Latest Authoritative Round: `3`
- Current-State Evidence Basis: worktree `codex/run-bash-background` @ `374e35a60e` (base `origin/personal`); code citations from round 1 unchanged and valid (terminal command execution, manager, run_bash, agent worker shutdown; server platform notices, preface port, input admission, native backend, background-task contract). Round 3: reran `prototype/wrapper-skeleton-probe.sh` on bash 3.2.57: 12 cases reproduce the log, case 12 included. Reviewer cases on the SR-005 skeleton (scripts in `/tmp/arch-review-338/r2/`, not kept): strict mode `set -euo pipefail; IFS=$'\n\t'` with two jobs reports 3 and 7; `IFS=,` with three jobs reports every job still running at the foreground end (2 and 4; a job already finished before the foreground end is correctly not a task); no wrapper text in the user's stderr.

## Routing Classification Review

- Task size: `Large`; Architectural risk: `High`. Confirmed: two packages; model-facing tool contract change; every `run_bash` call now ends at a wrapper frame; shared backend capability; asynchronous waking delivery; run-end lifecycle change.
- Independent Architecture Review required: `Yes`
- Classification correction required: None

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements understood. User decisions: DEC-001 B (`kill <pid>` through run_bash, four tools retired), DEC-002 (wake idle), DEC-003 (run end stops commands), DEC-004 (448 separate), DEC-005, DEC-006 (both entry forms), DEC-012 (plain `&` job: `kill <pid>` stops that process only). Solution Designer decisions within the direction: DEC-007 to DEC-011, DEC-013 (notice lists tasks still running). REQ-011 states the `sh` fallback limit.
- Relevant existing behavior and evidence: confirmed in round 1 at the cited lines.
- Scope guardrail: confirmed; R-F records the accepted narrowing.
- Every prospective blocking finding traceable: `Yes` (none remain)
- Remaining material ambiguity: None.

| Behavior ID | Kind | Alignment | Trigger / Evidence | Target Path Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-008/009 | Operational/User | Pass | Pass | Pass | Confirmed | — |
| BEH-010 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-011 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-012 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-013 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-014 | System | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose | Linked | Complete | Consistent | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `prototype/wrapper-skeleton-probe.sh` + log | Pass | Pass | Pass | Pass | Pass | — |
| `prototype/kill-pid-probe.mjs` + log | Pass | Pass | Pass | Pass | Pass | — |
| `prototype/background-completion.prototype.test.ts` + log | Pass | Pass | Pass | Pass | Pass | — |
| `agents-package-files-naming-background-tools.txt` | Pass | Pass | Pass | Pass | Pass | — |
| `architecture-design-handoff.md` | Pass | Pass | Pass | Pass | Pass | — (refreshed to SR-005) |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | design-spec Task Design Health Assessment | — |
| Root cause explicit and evidence-backed | Pass | `Boundary Or Ownership Issue`; manager drops exit code, backend reports nothing, P4 | — |
| Refactor decision explicit | Pass | Yes, bounded (manager as per-run owner; output log split) | — |
| Reflected in design sections | Pass | Ownership map, wrapper contract, file mapping, removal plan | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade Vs Owner | Naming | One Owner Per Node | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Return-Event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Bounded Local | Pass | Pass | N/A | Pass | Pass | Pass | Pass (chain, state list and return rules agree) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `BackgroundProcessManager` | Pass | Pass | Pass | Pass | Single owner of task records, ends, reported state and the running set |
| `AgentRun` facade → backend capability | Pass | Pass | Pass | Pass | Service depends on `AgentRun` only |
| `BackgroundProcessCleanupStep` | Pass | Pass | Pass | Pass | Never fails the orchestrator |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| autobyteus-ts terminal ↔ server | Pass | Pass | Pass | Pass | autobyteus-ts never imports server vocabulary |
| Notice service → `AgentRun` | Pass | Pass | Pass | Pass | Never the native backend or the manager |
| Platform stops → scope only | Pass | Pass | Pass | Pass | Agent's `kill` is its own shell action |

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `run_bash` params (`run_in_background`) | Pass | Pass | Pass | Low | Pass |
| `BackgroundTaskStart` (+ `startedAt`) / `backgroundTasksStarted` | Pass | Pass | Pass | Low | Pass |
| `BackgroundTaskEnd` (three outcome variants) / `backgroundTasksEnded` | Pass | Pass | Pass | Low | Pass |
| `manager.run`, `markCallStart`, `takeEndsSince`, `takeUnreported`, `list`, `hasRunning`, `onChange`, `stopAllForRunEnd` | Pass | Pass | Pass | Low | Pass |
| `backgroundTaskNotices` capability (`takeUnreportedEnds`, `listRunning`) | Pass | Pass | Pass | Low | Pass |
| `AgentRun.takeUnreportedBackgroundTaskEnds`, `listRunningBackgroundTasks` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Process groups, verified stop | Pass | Pass | N/A | Pass | scope unchanged |
| Background-task reporting | Pass | Pass | N/A | Pass | `BACKGROUND_TASK_UPDATED`, `hasRunningBackgroundTasks` |
| Notice delivery | Pass | Pass | Pass | Pass | `AgentRunPlatformNotices`, `postUserMessage`, preface metadata; new delivery-policy owner justified |
| Control frames | Pass | Pass | N/A | Pass | `AnchorControlDecoder` extended |
| Run-end cleanup | Pass | Pass | N/A | Pass | shutdown step |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear | Decision Sound | Supports Owners | Verdict |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal` | Pass | Pass | Pass | Pass |
| `autobyteus-ts/src/agent/shutdown-steps` | Pass | Pass | Pass | Pass |
| `autobyteus-server-ts/src/agent-execution` | Pass | Pass | Pass | Pass |
| `autobyteus-server-ts/src/background-task-notices` | Pass | Pass | Pass | Pass |
| `autobyteus-server-ts/src/agent-work-journal` | Pass | Pass | Pass | Pass |

Entry forms traced: foreground bash (wrapped), background form on bash and `sh`, `sh` foreground (unwrapped, stated in REQ-011), WSL (same scripts; implementation tests).

## Reusable Owned Structures Verdict

| Structure | Evaluated | Shared File Sound | Ownership Clear | Verdict |
| --- | --- | --- | --- | --- |
| `BackgroundTaskStart`, `BackgroundTaskEnd` in `terminal/types.ts` | Pass | Pass | Pass | Pass |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field | Redundant Removed | Overlap Controlled | Core Vs Variant | Verdict |
| --- | --- | --- | --- | --- | --- |
| `BackgroundTaskEnd.outcome` | Pass | Pass | Pass | Pass | Pass |
| `outputFile` / `lastLines` (one log per call) | Pass | Pass | Pass | N/A | Pass |
| `BackgroundTaskStart` | Pass | Pass | Pass | N/A | Pass |

Derived consumers listed with a decision for each: `Pass`. One vocabulary (background task covers both forms, excludes detached processes; background process stays the native layer word): `Pass`.

## File Responsibility Mapping Verdict

`Pass` for every row of the design's Final File Responsibility Mapping (wrapper, protocol/launcher, executor, manager, output log, types, run_bash, cleanup step, backend contract and all backends, AgentRun, native reporter, notice subsystem, senders, compositions, journal translation, template, docs).

## Subsystem / Folder / File Placement Verdict

`Pass` (`background-task-notices/` mirrors `tool-list-updates/`; terminal files in their existing layout).

## Removal / Decommission Completeness Verdict

`Pass`: four tool files and registration; `BackgroundProcessInfo`, `BackgroundProcessOutput`; dead manager methods (callers are the removed tools; `stopAll` has none); `backgroundProcesses`, `adoptObservedProcesses`, survivor listing; tests and template names. `OutputBuffer` left to implementation to remove if unused (must be recorded).

## Legacy / Backward-Compatibility Verdict

`Pass`: no aliases, no dual paths; journal converters for retired names are live code for historical journals (REQ-012).

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict |
| --- | --- | --- | --- | --- | --- |
| `toolNames` in definitions | Directly Usable — No Migration | Pass | Pass | N/A | Pass |
| Journals/traces naming retired tools | Directly Usable | Pass | Pass | N/A | Pass |
| Output files | Temporary runtime state | Pass | Pass | N/A | Pass |

## Change / Refactor Safety Verdict

`Pass`: wrapper and frames first with the R-0 regression list (now including strict mode), then types, log, manager, run_bash, cleanup; then server capability, notices, journal, docs; live E2E last.

## Example Adequacy Verdict

`Pass`: wrapper skeletons for both forms, start result, kill-in-place result, notice with shared-file note and still-running line, ownership shape.

## Material Premise Validation

MP-001 to MP-009 (rounds 1-2) are all addressed by the current design or by the user-approved narrowing (MP-002). MP-008 (pid reuse) stays a residual (R-1, ended record replaced). No new premise in round 3.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None. All of AR-001 to AR-008 and AR-010 are resolved (see the revision record's ARCH-REV-003 table).

## Classification

N/A (Pass).

## Recommended Recipient

Implementation engineer.

## Residual Risks

For implementation and validation to keep in view (all recorded in the design's Risks):

- R-0: every call goes through the wrapper. Turn the 12 probe cases and the R-0 list into tests through `run_bash` and the real launcher, on Linux bash and WSL as well as macOS bash 3.2.
- R-6: fds 62/63 are inherited by processes the command starts; check that the WSL bridge exits normally when such a process outlives the call.
- R-7: a job killed by the user's own EXIT trap shows as started and ended in that call's result (accepted).
- R-B: a killed command's end may still arrive after the kill's call returns (WSL always; host beyond the 300 ms settle) → one short notice (accepted).
- R-C, R-D, R-E, R-F, R-1, R-2, R-4, R-5: accepted as stated in the design.
- ASM-002 (models read output with `tail` as readily as with a tool) is validated only in live E2E.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: SR-005 answers the last three items, and the probe evidence reproduces here. The package is ready for implementation as Large / High.
