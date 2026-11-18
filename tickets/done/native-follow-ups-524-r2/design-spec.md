# Design Spec — autobyteus-524, round 2: FU-006 and FU-007

## Solution And Approval Basis

- Current solution revision ID: `SR-002` (implementation DI-001: the caller of the shutdown stop moves from the composition closes to the process-shutdown owner; requirements unchanged)
- Approved requirements baseline: `requirements-doc.md` at SR-001 (Solution Designer within the direction; founder informed 2026-11-18)
- Behavior-defining supplements: none
- User approval of the design, when the direction requires it: `Not required`
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/native-follow-ups-524-r2/tickets/in-progress/native-follow-ups-524-r2/investigation-notes.md`
- Authorities read: `references/architecture-design.md`, `references/design-principles.md`, root `DESIGN.md`, `TESTING.md`
- Project design-principle conflicts: none

## Current-State Read

FU-006: the AAR suite sets fake commands for four runtime CLIs (`available-agent-runtimes-graphql.e2e.test.ts:172` and siblings) but not `DEEPSEEK_HARNESS_COMMAND` (`deepseek-harness-identity.ts:17`). FU-007: `closeStudioProcessResources` (`build-studio-server.ts:109-170`) awaits `agentPackageDefinitionFeed.close()` (`:159`) → `AgentPackageFolderWatcher.close()` (`agent-package-folder-watcher.ts:168-174`) → `closeEntry` → chokidar `watcher.close()` and the presence `fs.watch.close()` (`:422-435`), whose synchronous parts block 2–13 s under load (RF-002/RF-003). `platformNotices.close()` → `skillUpdateNotices.close()` → `SkillFolderWatcher.close()` has the same shape. **Corrected in SR-002 (DI-001):** both closes run inside `closeProcessResources` (`build-studio-server.ts:279-299`), which has three callers: the process-shutdown handover close (`:301-303`, registered as the shutdown cleanup before the app exists), Fastify's `onClose` hook (`:447-453`) and the startup-failure path (`:503-505`). In production `app.close()` is called only by the shutdown cleanup (`server-runtime.ts:214`), which then exits (`server-process-shutdown.ts:79`); but 120 test files start in-process studio servers and close them with `fastify.close()` while the test process runs on, and a failed startup can run on in a test process. So the composition closes are **not** process-exit-only: the exit decision belongs to the process-shutdown owner.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale and supporting evidence: one E2E test file; two watcher classes (one shutdown method each), two compositions exposing it, the studio server's one exit operation and the two shutdown cleanups that call it (SR-002); unit tests. Still local to existing owners.
- Architectural risk: `Low`
- Risk rationale and supporting evidence: removes work at process exit only; no contract, persistence or concurrency change; the fix shape measured 10/10 (RF-004).
- Escalation trigger if implementation or validation discovers new impact: a process-shutdown path that closes the studio without passing through one of the two cleanups that call the exit operation (`server-runtime.ts` cleanup, the handover close), or a platform where unreleased watches outlive the process → `Design Impact`. (SR-001's trigger fired as DI-001 and is resolved by SR-002.)

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| RF-002/RF-003 | `evidence/RF-00*.jsonl` | The watcher close blocks 2–13 s | Remove it from shutdown | — |
| RF-004 | probe with temporary edit | 48–166 ms stops | Fix shape | Other platforms (ASM-001) |

## Intended Change

FU-006: hide `dsh` in the AAR suite. FU-007: each in-process watcher gets a shutdown stop that ends event handling (sets closed, clears timers and entries, detaches listeners) and leaves its OS watches to the process exit; after it, `close()` is a no-op. The studio server composition exposes one operation that gives both watchers their shutdown stop (proposal: `stopFileWatchesForProcessExit()`), and **only the process-shutdown cleanups call it**, right before they close: `server-runtime.ts`'s cleanup (`await recorder.record(); studio.stopFileWatchesForProcessExit(); await app.close();`) and the shutdown handover close inside `buildStudioServer` (before `closeProcessResources`). Fastify's `onClose`, the startup-failure path and in-process test servers keep the full close (REQ-003).

## Change Scope (Mandatory)

- In scope: UC-001, UC-002. Files: `tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts`; `src/agent-package-definitions/monitor/agent-package-folder-watcher.ts`; `src/skill-update-notices/monitor/skill-folder-watcher.ts`; the feed composition and skill-update notices (expose their watcher's shutdown stop, `close()` unchanged); `src/compositions/build-studio-server.ts` (the one exit operation; the handover close calls it); `src/server-runtime.ts` (the shutdown cleanup calls it before `app.close()`); unit tests of both watchers and of the exit operation; `docs/design-cases.md` Case 23 (added by the Solution Designer in SR-002).
- Derived consumers: N/A.
- Deliberately left alone: `server-process-shutdown.ts` (bound and sweep), the E2E harness's stop allowance and hook timeouts, the file-explorer watcher (own process), normal-operation closes.
- Follow-ups: none new (the family rows not closed are listed in the investigation notes for the PM).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001, AC-001 | E2E run | dsh leaks into the list | hidden | test setup |
| BEH-002 | System | REQ-002/003, AC-002…004 | SIGTERM / quit | 2–13 s watcher close | shutdown stop, no OS close | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `evidence/built-server-stop-probe.mjs` | Reproduction | AC-002 | Before/after | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Structural triggers that fire: *Several kinds or forms* (a watcher close serves two situations: releasing during operation, and process exit) → the two get distinct operations. Others ruled out.
- Deliberate deviations: none.
- Root cause classification: `Local Implementation Defect` (unnecessary blocking work on the shutdown path).
- Refactor needed now: `No`.
- Evidence: RF-002…RF-004.
- Design response: as Intended Change.
- Refactor rationale: N/A. Intentional deferrals: normal-operation close blocking (not observed as a problem).

## Terminology

"Shutdown stop": ending a watcher for a process exit without closing OS watches.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: none. Compatibility mechanisms kept: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

`Not Affected`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-002 | SIGTERM | exit | `ServerProcessShutdown` → studio cleanup | The slow step lives here |

## Primary Execution Spine(s)

`SIGTERM -> ServerProcessShutdown.request -> cleanup (record -> studio.stopFileWatchesForProcessExit() [both watchers: shutdown stop, no OS close] -> app.close -> onClose -> closeStudioProcessResources -> feed.close / platformNotices.close [watchers already stopped: no-op]) -> ... -> sweep -> exit (OS releases the watches)`. During startup the cleanup is the handover close, which calls the same operation before `closeProcessResources`. An in-process test server: `fastify.close() -> onClose -> ... -> watcher.close()` (OS watches closed, as today).

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Shutdown ends the watchers' work at once; the exit that follows releases their OS watches | watchers | studio cleanup | — |

## Spine Actors / Main-Line Nodes

`ServerProcessShutdown`, `closeStudioProcessResources`, the feed and skill-notice compositions, the two watchers.

## Ownership Map

- Each watcher owns both ways it can end: `close()` (releases OS watches) and a shutdown stop (e.g. `stopForProcessExit()`; exact name the implementer's); after the stop, `close()` is a no-op.
- The feed composition and skill-update notices expose their watcher's shutdown stop; their `close()` is unchanged.
- The studio server composition owns the one exit operation that stops both.
- The process-shutdown owner (`server-runtime.ts` cleanup, and the handover close it registers during startup) owns the decision that the process is exiting and calls the exit operation.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| OS-watch closes on the process-shutdown path | The exit releases them | watcher shutdown stop | Normal-operation closes stay |

## Return Or Event Spine(s) (If Applicable)

N/A.

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

None.

## Ownership Boundaries

The process-shutdown callers decide that the process is exiting; the watchers decide how to end. No caller reaches into a watcher's entries.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Watcher | chokidar and presence watches | feed / notices compositions | Callers closing chokidar themselves | Add to the watcher |

## Dependency Rules

Unchanged. No process-wide binding added.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| Watcher shutdown stop | watcher | end for process exit | — | Idempotent; after it, `close()` is a no-op |
| Watcher `close()` | watcher | end and release OS watches | — | Unchanged |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| shutdown stop | Yes | N/A | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Same Meaning And Name Everywhere It Appears, Per The Glossary? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Shutdown stop | `stopForProcessExit()` (proposal) | Yes | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Watcher lifecycle | the watchers | Extend | Own their ending | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| agent-package-definitions, skill-update-notices | watchers | DS-001 | shutdown | Extend | — |

## Draft File Responsibility Mapping

See final.

## Reusable Owned Structures Check

None (two watchers, same small method; not worth a shared base).

## Shared Structure / Data Model Tightness Check

N/A.

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-package-folder-watcher.ts` | agent-package-definitions | watcher | shutdown stop | — | — |
| `agent-package-definition-feed-composition.ts` | compositions | feed | exposes the watcher's shutdown stop; `close()` unchanged | — | — |
| `skill-folder-watcher.ts` | skill-update-notices | watcher | shutdown stop | — | — |
| `skill-update-notices.ts` (+ `platform-notice-sources.ts` if needed to reach it) | skill-update-notices | notices | exposes the watcher's shutdown stop; `close()` unchanged | — | — |
| `build-studio-server.ts` | compositions | studio server | `stopFileWatchesForProcessExit()` in the returned server; the handover close calls it | — | — |
| `server-runtime.ts` | process | shutdown cleanup | calls it before `app.close()` | — | — |
| `available-agent-runtimes-graphql.e2e.test.ts` | tests | — | hide dsh | — | — |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

Existing files only.

## Folder Boundary Check

N/A (no new folders).

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Shutdown | `server-runtime` cleanup: `await recorder.record(); studio.stopFileWatchesForProcessExit(); await app.close();` → both watchers closed without `chokidar.close()`; `onClose` → `feed.close()` is then a no-op | Raising the 10 s bound; wiring the stop into `feed.close()` (SR-001), which `onClose` also runs for in-process test servers | The exit decision belongs to the owner that exits |
| In-process test server | `fastify.close()` → `onClose` → `feed.close()` → OS watches closed | Leaving them open in a test process that runs on | REQ-003 |
| Removal while running | `syncPackageFolders` drops a folder → `closeEntry` → OS watch closed | Skipping it there too | Would leak watches while the process lives |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| None | — | N/A | — |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. FU-006 test change; run the AAR suite with `dsh` installed (AC-001) — done (IR-001). 2. Watcher shutdown stops; the studio's exit operation; the two shutdown cleanups call it; unit tests (AC-003): the exit operation stops both watchers without the OS close, `close()` after it is a no-op, and `fastify.close()` without it still closes the OS watches. 3. Build the server; `built-server-stop-probe.mjs <worktree> 10 3000` before/after under load (AC-002). 4. Server unit suite; watcher tests; the built-server E2E files named in 493 FU-005 (AC-004); both typechecks (TESTING.md).

## Key Tradeoffs

The OS releases watches at exit instead of the process doing it first; nothing is flushed by closing a watch, so nothing is lost.

## Risks

ASM-001 (other platforms unmeasured; the change only removes work).

## Guidance For Implementation

- Reproduction to start from: `node tickets/in-progress/native-follow-ups-524-r2/evidence/built-server-stop-probe.mjs <worktree> 10 3000` after the server build: seconds today on a loaded Mac, must be well under 1 s.
