# Design Spec — autobyteus-524, round 1: FU-003 (command start and control limits)

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at SR-001, Solution Designer within the direction (founder's "make the deadline longer"; founder informed 2026-11-17)
- Behavior-defining supplements and their approval references: none
- User approval of the design, when the direction requires it: `Not required` (the Task is dispatched on the founder's word with his direction; it asks for no design approval)
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524/tickets/in-progress/native-follow-ups-524/investigation-notes.md`
- Authorities read (design reading gate; file and date): `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md`, `TESTING.md` (2026-11-17)
- Project design-principle conflicts with the general principles, or discrepancies: none

## Current-State Read

`ShellCommandExecutor.execute` (`shell-command-executor.ts:53`) calls `NativeCommandProcessScope.start` with `Date.now() + Math.min(1500, timeoutMs ?? 1500)`; the scope repeats `1500` as its default (`native-command-process-scope.ts:23`). Inside, `beforeDeadline(handle.ready)`, `observer.establish` (a fresh `ps` read) and `beforeDeadline(handle.started)` share that deadline (`:35-41`). Every `ps` read is additionally cut at `Math.min(500, deadline - now)` (`process-group-observer.ts:40`), as is the WSL kill (`:79`). The other limits are literals spread over the scope (`:48, 55, 81, 92, 116, 134`). A failed start becomes `Command did not start: <message>` (`shell-command-executor.ts:70-73`). Evidence: investigation notes RF-001…RF-006.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale and supporting evidence: three source files in one module (`command-execution/`: the limits' home, the scope, the observer, the executor's call and message), their unit tests; no contract, no API, no persistence.
- Architectural risk: `Low`
- Risk rationale and supporting evidence: values and one message change inside one owner; a broken launch still fails at once (`anchored-command-launcher.ts:86-153`); the measured fix shape passed 520 calls under load (RF-005).
- Escalation trigger if implementation or validation discovers new impact: a test or product path that relies on a start failing within 1.5 s, or a WSL-specific failure, → `Design Impact`.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | as in Current-State Read | Limits are literals in four places; one hidden per-read cap | One named home; no per-read cap | — |
| Probes RF-001…RF-005 | `evidence/` | Fails 100 % on bursts today; 30 s / no cap passes 100 % | Values | WSL unmeasured (ASM-001) |

## Intended Change

Name every time limit of the native command scope in one place, raise the ones that give up too early (start 30 s, observation and retirement 10 s, stop confirmation 30 s), remove the 500 ms cap on single `ps`/WSL runs (a run is bounded by its step's deadline), and say in the failure text how long the start was given.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002. Files: `command-deadline.ts`, `native-command-process-scope.ts`, `process-group-observer.ts`, `shell-command-executor.ts` and their unit tests.
- Derived consumers: N/A (no shared structure changes; `run_bash` and the background-process manager call through the executor unchanged).
- Deliberately left alone: the grace periods (cancel-gate 500 ms, TERM→KILL 500 ms, end-marker 1 s) and the 3 s host-shutdown budget (RF-006); the fresh `ps` per start (sharing reads is a performance change, not needed); PTY/tmux sessions.
- Follow-ups: none new.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, AC-001/002/003 | `run_bash` | 1.5 s handshake | 30 s or the call's timeout | DS-001 |
| BEH-002 | System | REQ-002, AC-004 | any `ps`/WSL run | 500 ms cap | bounded by step deadline | DS-001, DS-002 |
| BEH-003 | System | REQ-003, REQ-005, AC-005 | stop / inspect / retire | 0.5–3 s | 10 s / 30 s, named | DS-002 |
| BEH-004 | Contract | REQ-004, AC-002/003 | failed start | generic text | "did not start within N s" | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `evidence/run-bash-burst-probe.mjs` | Reproduction | AC-001 | Must fail before, pass after | Evidence |
| `evidence/measure-command-start-handshake.mjs` | Timings | REQ-001…003 | Basis of the values | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes` (minor)
- Structural triggers that fire: *Repeated coordination*-adjacent: the start limit is a literal in two files (scope default and executor) and the per-read cap hides a second limit inside every deadline → response: one named home for the limits; the executor imports the start limit. Others ruled out (no new owner, interface or persistence).
- Deliberate deviations from a principle: none.
- Root cause classification: `Local Implementation Defect` (values too short for loaded machines) with a hidden duplicate limit.
- Refactor needed now: `No` (naming the limits in the existing deadline module is part of the fix).
- Evidence: RF-001…RF-006.
- Design response: as Intended Change.
- Refactor rationale: N/A.
- Intentional deferrals and residual risk, if any: WSL not measured (ASM-001).

## Terminology

No new domain words. "Start handshake": launch until START is confirmed.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: the literals `1500`, `500`, `3000` used as deadlines (replaced by the named limits).
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

`Not Affected`: in-memory limits only.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, 002, 004 | `run_bash` | started command or clear failure | `NativeCommandProcessScope.start` | The failing path |
| DS-002 | Bounded Local | BEH-002, 003 | timeout / Stop / completion | confirmed or `unconfirmed` outcome | `NativeCommandProcessScope.stop` / `retireCompleted` | The other limits |

## Primary Execution Spine(s)

- DS-001: `run_bash -> ShellCommandExecutor.execute (start limit = min(COMMAND_START_LIMIT_MS, call timeout)) -> NativeCommandProcessScope.start -> AnchoredCommandLauncher (pid) -> ProcessGroupObserver.establish (ps, bounded by the same deadline) -> START -> output / exit code`; on a miss: `-> scope.stop -> "Command did not start within N s: <reason>"`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The executor gives the start the named start limit, or the call's timeout if shorter; every step and every `ps` run inside it share that one deadline; a miss stops the command and reports how long it was given | start handshake | scope | named limits |
| DS-002 | Stop sends TERM after one observation, waits its grace, KILLs if needed and confirms within the stop limit; retirement confirms a finished group within the observation limit, retried each second as today | stop / retirement | scope | named limits, grace periods |

## Spine Actors / Main-Line Nodes

`ShellCommandExecutor`, `NativeCommandProcessScope`, `AnchoredCommandLauncher`, `ProcessGroupObserver`.

## Ownership Map

- `command-deadline.ts`: owns the deadline helper and the scope's named limits (each with a one-line comment of what it bounds; grace periods and the shutdown budget named too, marked as graces/budget).
- `NativeCommandProcessScope`: uses the named limits as its defaults.
- `ProcessGroupObserver`: bounds each run by the deadline it receives; no cap of its own.
- `ShellCommandExecutor`: applies `min(start limit, call timeout)` and builds the failure text.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| Literal deadlines `1500` (2×), `500` (members, snapshot, retirement, per-read cap, WSL kill cap), `3000` (stop) | Named limits | `command-deadline.ts` constants | Graces and the 3 s shutdown budget become named constants with the same values |

## Return Or Event Spine(s) (If Applicable)

N/A.

## Bounded Local / Internal Spines (If Applicable)

DS-002 above.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Named limits | DS-001, DS-002 | scope, observer, executor | Values and what each bounds | One place to read and tune | Literals drift (the 1500 already appears twice) |

## Ownership Boundaries

The executor depends on the scope and the limits; the scope on the observer, the launcher and the limits; the observer on the limits only through the deadlines it is given (it keeps no own cap).

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `NativeCommandProcessScope` | launcher, observer | executor, background manager | Callers running `ps` themselves | — |

## Dependency Rules

`command-deadline.ts` depends on nothing in the module; everything else may import it. No process-wide binding added.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| Named limits (e.g. `COMMAND_START_LIMIT_MS = 30_000`, `COMMAND_OBSERVATION_LIMIT_MS = 10_000`, `COMMAND_STOP_LIMIT_MS = 30_000`, graces and `COMMAND_SCOPE_SHUTDOWN_BUDGET_MS = 3_000`) | limits | values | — | Exact names are the implementer's within this meaning |
| `start(invocation, deadline = now + start limit)` | start | unchanged signature | — | — |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Named limits | Yes | N/A | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Same Meaning And Name Everywhere It Appears, Per The Glossary? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Start limit | `COMMAND_START_LIMIT_MS` (proposal) | Yes | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Limits' home | `command-deadline.ts` (deadline helper) | Extend | Same concern | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/command-execution/` | all of it | DS-001, DS-002 | scope | Extend | — |

## Draft File Responsibility Mapping

See final mapping.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Start limit used by scope and executor | `command-deadline.ts` | command-execution | One value | Yes | Yes | A config system |

## Shared Structure / Data Model Tightness Check

N/A (constants).

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `command-deadline.ts` | command-execution | limits | `beforeDeadline` + named limits | Deadline concern | — |
| `native-command-process-scope.ts` | command-execution | scope | defaults from named limits | — | limits |
| `process-group-observer.ts` | command-execution | observer | each run bounded by the given deadline; default from the observation limit | — | limits |
| `shell-command-executor.ts` | command-execution | executor | `min(start limit, timeout)`; failure text with N | — | limits |
| Unit tests in `tests/unit/tools/terminal/command-execution/` | — | — | AC-002…AC-005 | — | — |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/command-execution/` | Folder | as today | as above | Existing owner | New owners |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `command-execution/` | Main-Line Domain-Control | Yes | Low | Unchanged layout |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Failure text | `Command did not start within 30 s: Command control deadline exceeded` (a call with `timeout_seconds: 10`: "within 10 s") | `Command did not start: Command control deadline exceeded` | The user and the agent see how long it was given |
| `ps` run | `timeout = deadline - Date.now()` (fail if ≤ 0, as today) | `Math.min(500, deadline - Date.now())` | One limit per step |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Env/config override of the limits | Tuning per machine | Rejected | No measured need; constants |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Named limits in `command-deadline.ts`. 2. Scope and observer defaults; remove the per-run caps. 3. Executor: start limit and failure text. 4. Unit tests AC-002…AC-005; adjust tests that pinned old literals (none found pinning the start limit). 5. Run `evidence/run-bash-burst-probe.mjs` 60 and 200 before/after (AC-001); `pnpm -C autobyteus-ts test` (terminal unit + integration); both typechecks (TESTING.md).

## Key Tradeoffs

A hung handshake is reported after up to 30 s instead of 1.5 s; accepted (rare, and an erroring launch is still immediate). Starts in a burst stay slow (seconds) but succeed; making them cheaper is a separate change.

## Risks

WSL unmeasured (ASM-001); a burst much larger than 200 at higher load could still exceed 30 s (non-goal).

## Guidance For Implementation

- Reproduction to start from: `node tickets/in-progress/native-follow-ups-524/evidence/run-bash-burst-probe.mjs <worktree> 60` after `pnpm -C autobyteus-ts build`: fails today (RF-001), must pass (AC-001). A burst of 60–200 creates contention even on a quiet machine.
