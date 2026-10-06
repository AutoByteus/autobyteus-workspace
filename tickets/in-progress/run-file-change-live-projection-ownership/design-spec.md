# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` SR-001, user approval 2026-10-06 ("since you found the bug, please work on the ticket now. the requirement is clear.")
- Behavior-defining supplements: None
- Design status: `Ready`
- Canonical investigation-notes path: `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership/tickets/in-progress/run-file-change-live-projection-ownership/investigation-notes.md`

## Current-State Read

Base: `origin/personal` @ `5c74fed71` (the affected files are identical to `d9ffaa7cb`, where the defect was reproduced).

- **Write path (healthy):** the process composition root `GeneralProcessRunSupervisor` constructs `new RunFileChangeService({ workspaceManager })` and passes it to `AgentRunResourceManager`, which calls `attachToRun(run)` on activation. `FILE_CHANGE` events → `handle()` → updates that instance's in-memory projection → atomically writes `<memoryDir>/file_changes.json`.
- **Read path (defective):** GraphQL `getRunFileChanges` and REST `/runs/:runId/file-change-content` → module singleton `getRunFileChangeProjectionService()` → for **active** runs it calls `this.changes.getProjectionForRun(...)` / `getProjectionForCollaborationMember(...)`, where `this.changes` is the module singleton `getRunFileChangeService()`. Nothing attaches runs to that singleton. Its `load()` caches the disk snapshot on first read and never refreshes it, so every entry recorded after the first read is invisible to it.
- **Origin:** `8704f2653` (2026-08-26, "close execution family composition") and `ae5a1c7bc` (2026-08-22) replaced the writer default `getRunFileChangeService()` with explicitly constructed instances. The reader was not moved with it.
- **Documented intent:** `docs/features/artifact_file_serving_design.md` and `docs/modules/run_history.md` describe one `RunFileChangeService` that owns the run projection and feeds both list hydration and content serving.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: three production files change within existing ownership (`run-file-change-service.ts`, `general-process-run-supervisor.ts`, `run-file-change-projection-service.ts`), plus unit/integration tests and two docs. No new subsystem, API or persistence change.
- Architectural risk: `High`
- Risk rationale: the fix corrects an **ownership boundary** (which instance is the process authority for live run-file-change state) and changes **cache lifecycle/concurrency semantics** (cache scoped to attached runs). The process getter becomes bind-required, which affects composition/startup ordering for the GraphQL and REST readers. Each change is bounded and follows the existing `bindProcess*` pattern, but these are listed High-risk surfaces.
- Escalation trigger: if implementation finds another reader or writer of live run-file-change state (e.g. application-scope runs reachable through these routes as "active"), or any API/persistence shape change becomes necessary, return a `Design Impact`.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| curl reproduction | investigation-notes Source Log | 200 / 404 / 404 "File change not found" | Defect is in entry lookup (reader state), not files | None |
| Instance inventory grep | investigation-notes Source Log | Writers: supervisor instance, application-scope instance. Singleton: reader-only | Single process owner; delete the orphan singleton | None |
| Git history | `8704f2653`, `ae5a1c7bc` | Writer moved off the singleton; reader did not | Root cause is ownership drift, not a local typo | None |
| Process binding pattern | `src/agent-execution/services/agent-run-service.ts:326-350`; supervisor bind/release | Established pattern | Reuse `bindProcess*/releaseProcess*/get*` | None |
| Docs | `docs/features/artifact_file_serving_design.md` | Single-owner intent | Restore it | None |

## Intended Change

1. Make the process's `RunFileChangeService` instance (constructed in `GeneralProcessRunSupervisor`) the bound **process authority** for live run-file-change projections. Readers resolve it through `getRunFileChangeService()`, which now throws when unbound, like `getAgentRunService()`.
2. Add the missing invariant inside `RunFileChangeService`: **in-memory projections exist only for runs attached to this instance.** For any other run, `load()` returns a fresh normalized disk read and caches nothing.
3. `RunFileChangeProjectionService` resolves the process authority **per call** (not captured at construction), so it always reads the live owner's state.
4. Delete the lazily created module singleton.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger | Relevant Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Production Path / Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-004 / AC-001, AC-002, AC-005, AC-006 | Preview artifact of active run | 404 for entries recorded after first read | Content served for every recorded entry; 409/404 semantics kept | DS-002 |
| BEH-002 | User | REQ-002 / AC-003 | List artifacts of active run | Stale list | Live list from process owner | DS-002 |
| BEH-003 | User | REQ-003 / AC-004 | Inactive run | Fresh disk read | Preserved (unchanged branch) | DS-003 |
| BEH-004 | System | REQ-003 | `FILE_CHANGE` event | Owner updates memory + disk | Preserved | DS-001 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue` (primary: two owners of live projection state in one process), plus `Missing Invariant` (a non-owning instance caches state it can never keep current).
- Refactor needed now: `Yes` (bounded)
- Evidence: the instance inventory and git history in the investigation notes. The singleton has no writer, and the reader depends on it.
- Design response: bind one process authority; scope the cache to attached runs; remove the orphan singleton; per-call owner resolution in the reader.
- Refactor rationale: a local patch (e.g. always reading disk in the projection service, or invalidating the singleton's cache) would leave two live owners and a cache that can silently go stale in any future non-owning instance, such as the application-scope instance. Fixing ownership and the invariant removes this whole class of bug.
- Intentional deferrals and residual risk: the frontend's "deleted or moved" message for every 404 is out of scope (RSK-001). The application-scope `RunFileChangeService` stays scope-local by design. Its runs are not "active" to the process reader, and with the new invariant they are read fresh from disk.

## Terminology

- **Process authority:** the single `RunFileChangeService` bound for the general process; it receives `FILE_CHANGE` events for process-managed runs.
- **Attached run:** a run for which `attachToRun(run)` is active on a given instance.

## Design Reading Order

Standard.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove the lazy module singleton `cachedRunFileChangeService ??= new RunFileChangeService()` and the cache-any-run behavior. No fallback to an unbound default.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. `file_changes.json` readers/writers and shape are unchanged; only in-memory caching and instance ownership change.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Return-Event | BEH-004 | `FILE_CHANGE` event | memory projection + `file_changes.json` | process `RunFileChangeService` | Single writer |
| DS-002 | Primary End-to-End | BEH-001, BEH-002 | GraphQL/REST request for active run | entry list / file bytes | `RunFileChangeProjectionService` → process `RunFileChangeService` | Defect path |
| DS-003 | Primary End-to-End | BEH-003 | Request for inactive run | disk projection | `RunFileChangeProjectionService` + `RunFileChangeProjectionStore` | Preserved |

## Primary Execution Spine(s)

- DS-002: `REST/GraphQL → RunFileChangeProjectionService.readProjectionContext → getRunFileChangeService() [process authority] → load(attached ? memory : fresh disk) → entry → file stream`
- DS-001: `AgentRun event → AgentRunResourceManager (attachToRun) → process RunFileChangeService.handle → memory + file_changes.json`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Owner receives each `FILE_CHANGE` for attached runs, updates its live projection and persists it | run projection | process `RunFileChangeService` | path canonicalization, atomic store write |
| DS-002 | Reader locates the run. If active, it asks the process authority, which returns the live projection for attached runs or a fresh disk read otherwise. Then it resolves the entry and streams the file | run projection, entry | `RunFileChangeProjectionService` (read boundary) | location services, MIME |
| DS-003 | Inactive run: fresh disk read, unchanged | run projection | `RunFileChangeProjectionService` | metadata/location services |

## Spine Actors / Main-Line Nodes

`RunFileChangeProjectionService`, `RunFileChangeService` (process authority), `RunFileChangeProjectionStore`, `GeneralProcessRunSupervisor` (composition/binding).

## Ownership Map

- `GeneralProcessRunSupervisor`: constructs the process `RunFileChangeService` once, passes it to `AgentRunResourceManager`, and binds/releases it as the process authority, in the same places it binds/releases the other process services, including the error-rollback path.
- `RunFileChangeService`: owns live projections **only for attached runs**: state, event sequencing (per-run queue) and persistence. Its read API for unattached runs is a stateless fresh read.
- `RunFileChangeProjectionService`: read boundary. Owns run location resolution (active vs inactive, standalone vs collaboration member). Does not own projection state.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `src/api/rest/run-file-changes.ts`, `src/api/graphql/types/run-file-changes.ts` | `RunFileChangeProjectionService` | Transport | Projection state or caches |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| Lazy module singleton in `run-file-change-service.ts` (`cachedRunFileChangeService ??= new RunFileChangeService()`) | Orphaned second owner | `bindProcessRunFileChangeService` / `releaseProcessRunFileChangeService` / `getRunFileChangeService` (throws if unbound) | In This Change | Same file |
| Unconditional caching in `RunFileChangeService.load()` for unattached runs | Root of stale state | Attached-run set; fresh read otherwise | In This Change | — |
| `this.changes` field captured at construction in `RunFileChangeProjectionService` | Would capture an instance before binding / across rebinds | Per-call resolver (`() => getRunFileChangeService()` default; injectable for tests) | In This Change | — |

## Return Or Event Spine(s) (If Applicable)

DS-001 above, unchanged except that the instance is now also the bound read authority.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner `RunFileChangeService`: `attachToRun → attached.add(runId) → events → enqueue → handle → load(cached) → upsert → persist`; `detach → unsubscribe → clear(runId) (delete cache, queue, attached)`. This matters because the cache lifetime must exactly equal the attachment lifetime.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Path canonicalization | DS-001, DS-002 | both | stable identity | existing | none (unchanged) |
| Projection store (disk) | DS-001..003 | both | atomic persist / read | existing | none (unchanged) |
| Process binding | DS-002 | supervisor | authority lookup | composition | readers constructing their own instance (the defect) |

## Ownership Boundaries

The process authority is the only holder of live projection state for process-managed runs. Readers never construct a `RunFileChangeService`. Application execution scopes keep their own scope-local instance for their runs and do not bind it.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `RunFileChangeService` (process authority) | in-memory projections, per-run queues, attached set | `AgentRunResourceManager` (attach), `RunFileChangeProjectionService` (read) | `new RunFileChangeService()` in read code; module-level lazy instance | Add a read method on the service, not a second instance |
| `RunFileChangeProjectionService` | location resolution | REST, GraphQL | Transport calling `RunFileChangeService` or store directly | Extend projection service |

## Dependency Rules

- `run-history` reader → `services/run-file-changes` getter (allowed, as today).
- Only `GeneralProcessRunSupervisor` may bind/release the process authority.
- `application-platform` must not bind the process authority.
- No module may create a default `RunFileChangeService` implicitly.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `bindProcessRunFileChangeService(service)` | process authority | bind once; throws if already bound or falsy | instance | mirrors `bindProcessAgentRunService` |
| `releaseProcessRunFileChangeService(service)` | process authority | release if same instance | instance | — |
| `getRunFileChangeService()` | process authority | return bound instance; throws "not initialized" if unbound | — | name kept; semantics now bind-required |
| `RunFileChangeService.getProjectionForRun(run)` / `getProjectionForCollaborationMember({agentRunId, memoryDir, workspaceRootPath})` | run projection | live projection if attached, else fresh disk read (uncached) | runId | signatures unchanged |
| GraphQL `getRunFileChanges`, REST `/runs/:runId/file-change-content` | — | unchanged | runId, path | unchanged |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| process binding trio | Yes | Yes | Low | — |
| `getProjectionFor*` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| process binding | `bindProcessRunFileChangeService` / `releaseProcessRunFileChangeService` | Yes | Low | Matches repo convention |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Process-scoped service lookup | `bindProcess*` pattern | Reuse | Established, with rollback/close handling | — |
| Cache invalidation | `attachToRun` disposer → `clear()` | Extend | Already the lifecycle hook | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `services/run-file-changes` | live projection, attached-run cache, process binding | DS-001, DS-002 | itself | Extend | — |
| `agent-execution/runtime` | composition + bind/release | DS-002 | supervisor | Extend | — |
| `run-history/services` | read boundary | DS-002, DS-003 | projection service | Extend (per-call resolver) | — |

## Draft File Responsibility Mapping

See final mapping (no extraction needed).

## Reusable Owned Structures Check

None needed. No repeated structures were introduced.

## Shared Structure / Data Model Tightness Check

`RunFileChangeProjection` / `RunFileChangeEntry` unchanged.

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts` | run-file-changes | `RunFileChangeService` | attached-run set; `load()` caches only attached runs, fresh uncached read otherwise; `clear()` also removes the attachment; replace lazy singleton with bind/release/get | Single owner of projection state | Yes (store, normalizer) |
| `autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts` | runtime composition | supervisor | hold the constructed instance; bind after construction; release in the error-rollback path and in `closeInternal()` | Composition root | Yes (pattern) |
| `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts` | run-history | read boundary | replace captured `changes` with a per-call resolver (option `runFileChangeService` keeps test injection; default `getRunFileChangeService()` at call time) | Reader | — |
| `autobyteus-server-ts/tests/unit/services/run-file-changes/run-file-change-service.test.ts` | tests | — | attached vs unattached cache; detach clears; bind/release/get semantics | — | — |
| `autobyteus-server-ts/tests/unit/run-history/services/run-file-change-projection-service.test.ts` | tests | — | regression for AC-001/AC-002/AC-003: read, then new event, then read sees new entry | — | — |
| supervisor ownership test (existing `general-process-run-supervisor-ownership.test.ts` or equivalent) | tests | — | the bound authority is the same instance given to `AgentRunResourceManager`; released on close/rollback | — | — |
| `autobyteus-server-ts/docs/features/artifact_file_serving_design.md`, `autobyteus-server-ts/docs/modules/agent_artifacts.md` | docs | — | state the single process authority and the attached-run cache invariant | — | — |

## Applied Patterns (If Any)

Process-scoped binding (`bindProcess*/releaseProcess*/get*`).

## Target Subsystem / Folder / File Mapping

No new folders or files except tests if needed. Paths as in the final mapping.

## Folder Boundary Check

Unchanged folder structure. Low risk.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Cache rule | `private load(ctx){ if (!this.attached.has(ctx.runId)) return this.readFresh(ctx); …cached path… }` | `const cached = this.projections.get(id) ?? cache(readDisk())` for any id | The bad shape is the current defect |
| Reader owner lookup | `private changes(){ return this.injected ?? getRunFileChangeService(); }` used inside `readProjectionContext` | `this.changes = getRunFileChangeService()` in the constructor of a module-level singleton | Captured instances go stale across bind/release |
| Composition | `const runFileChangeService = new RunFileChangeService({workspaceManager}); … bindProcessRunFileChangeService(runFileChangeService);` | `getRunFileChangeService()` that silently creates a new instance | Silent defaults created the second owner |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep lazy singleton as fallback when unbound | Avoid touching tests/startup | Rejected | Bind-required getter; tests inject or bind explicitly |
| Time-based cache TTL / disk re-read on miss in singleton | Cheaper patch | Rejected | Fix ownership + invariant |

## Derived Layering (If Useful)

Transport → read boundary (run-history) → projection owner (run-file-changes) → store.

## Change / Refactor Sequence

1. `RunFileChangeService`: add the attached set; scope the cache; add fresh-read path; update `clear()`; replace the singleton with bind/release/get.
2. Supervisor: keep the instance in a variable, bind it after construction (with a bound flag for rollback), release it in rollback and `closeInternal()`.
3. Projection service: per-call resolver.
4. Tests: unit (service, projection regression), supervisor ownership; run the existing REST/integration tests (`tests/unit/api/rest/run-file-changes.test.ts`, `tests/integration/api/run-file-changes-api.integration.test.ts`) and adapt any setup that relied on the implicit singleton by binding or injecting explicitly.
5. Docs update.

## Key Tradeoffs

- Bind-required getter vs silent default: chosen for a single owner. The cost is explicit test setup.
- Fresh disk read for unattached active runs: a small I/O cost per request, and correctness is guaranteed. Attached runs (the normal case) are served from memory, including transient streaming `content`.

## Risks

- Startup ordering: any code path calling `getRunFileChangeService()` before the supervisor binds will throw. The only production caller is the request-time reader, which runs after startup. Verify that no module-level call exists.
- Tests relying on the implicit singleton must be updated.

## Guidance For Implementation

- Do not change GraphQL/REST shapes or the 409/404 semantics (REQ-004).
- Regression test must fail on current code: read an active run's projection once, emit a second `FILE_CHANGE` through the attached owner, and read again through `RunFileChangeProjectionService` → the new entry must be present (list and `resolveEntry`).
- Also cover an unattached instance: a read after the disk file changes reflects the change.
- Live check (AC-006): agent generates ≥ 2 images in one turn; every preview loads without restart.
