# Design Spec: A First Read Can No Longer Hide A Running Agent's File

## Solution And Approval Basis

- **Current solution revision ID:** `SR-002`
- **Approved requirements baseline:** `requirements-doc.md` at SR-001, approved in SR-002 by the Solution Designer within the direction; user informed on 2026-10-19
- **Behavior-defining supplements:** none
- **Design status:** `Ready`
- **Investigation notes:** `/Users/normy/autobyteus_org/autobyteus-worktrees/run-file-change-live-cache-race/tickets/in-progress/run-file-change-live-cache-race/investigation-notes.md`
- **Authorities read:** `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root), `TESTING.md`. All were read in full in this conversation on 2026-10-19 and applied again here. `design-examples.md` was not used.
- **Conflicts or discrepancies:** none

## Current-State Read

`RunFileChangeService` is the one owner of the live file-change projection of attached (running) agent runs.

- **Reads:** `getProjectionForRun` and `getProjectionForCollaborationMember` go through `load`.
- **Writes:** FILE_CHANGE events go through a per-run serialized queue to `handle`. `handle` calls `load`, upserts the entry, sets the cache and writes `file_changes.json`.
- **The defect:** `load` fills the cache after `await readStored()` without checking whether the cache was filled in the meantime. A read that started before the first event can therefore replace the cache that `handle` just updated. The next `handle` then persists that stale projection (investigation notes BEH-001, BEH-002).

## Task Size And Architectural Risk (Mandatory)

- **Task size:** `Small`.
  - One private method in one service, its unit tests, and removing a workaround from one E2E file.
- **Architectural risk:** `Low`.
  - It restores an invariant inside the existing owner.
  - It changes no API, persistence shape, ownership boundary, deployment, or concurrency primitive: no new lock or queue.
  - The ordering semantics are bounded and covered by deterministic tests.
- **Escalation trigger:** another writer of `projections` is found, or the fix needs reads to wait for queued events.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported | Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `run-file-change-service.ts:85-99` | Unconditional fill after `await`; `handle` writes what `load` returns | Conditional fill in `load` | — |
| Probe | `probes/race-disk-probe-run1.txt` | The saved record loses the first file after a second event | REQ-002 covered by the same fix | — |
| Code | `grep projections` | Only `load`, `handle` and `clear` touch the cache | One fix covers every reader | — |
| Code | `owner-scoped-member-file-changes.e2e.test.ts:22-24, 68-74` | A workaround wait exists | Remove it (DEC-003) | — |

## Intended Change

`load` fills the cache only if it is still empty when its stored read returns. Otherwise it returns a copy of what the cache now holds, and the existing detach guard is kept.

## Change Scope (Mandatory)

- **In scope:** UC-001.
  - `RunFileChangeService.load`.
  - Regression unit tests.
  - Removing the stored-record wait from the owner-scoped E2E.
  - Release-note line.
- **Deliberately left alone:**
  - `handle`, `enqueue`, `attachToRun`/`clear`. They are correct once `load` is.
  - Reader APIs and `RunFileChangeProjectionService`.
  - The client store's replace/merge policy.
  - Other caches; none shares the hazard (investigation notes).
- **Follow-ups:** none.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | Requirements / ACs | Trigger | Existing | Change / Preserved | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | REQ-001; AC-001, AC-003 | First read overlapping the first file change | Stale overwrite | Conditional fill | DS-001 |
| BEH-002 | System | REQ-002; AC-002 | The next file change | Persists the stale projection | `handle` gets the current cache, so it persists every entry | DS-002 |
| BEH-003 | User/System | REQ-004; AC-004 | No overlap | Correct | Preserved | DS-001, DS-002 |
| BEH-004 | System | REQ-004; AC-004 | Detach during handling | Not re-cached | Preserved: the guard stays in `load` and `handle` | DS-001, DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related | Relationship | Status |
| --- | --- | --- | --- | --- |
| `probes/race-disk-probe.test.ts.txt` | Reproduce the loss on disk | AC-002 | Shape for the regression test | Evidence |
| Task attachment `API-08…probe.test.ts.txt` | Reproduce the live-list loss | AC-001 | Shape for the regression test | Evidence |

## Task Design Health Assessment (Mandatory)

- **Change posture:** `Bug Fix`
- **Current design issue found:** `Yes` (local)
- **Structural triggers:**
  - None fire.
  - Repeated coordination: ruled out, because only `load` fills the cache.
  - Responsibility overload: ruled out, because the service stays one concern.
  - Ownership: ruled out, because no caller bypasses the service.
- **Root cause classification:** `Missing Invariant`.
  - The invariant is: "while attached, the cache is never replaced by an older stored read."
  - It belongs to `load` and is not enforced there.
- **Refactor needed now:** `No`.
- **Evidence:** investigation notes Source Log and the probes.
- **Design response:** enforce the invariant at the fill point.
- **Refactor rationale:** the owner and boundaries are correct.
- **Deferrals:** R-001 (contrived re-attach timing), accepted.

## Terminology

- **Fill:** the first time `load` puts a run's projection into the cache.

## Legacy Removal Policy (Mandatory)

- **Obsolete paths:** the E2E stored-record wait and its comment, which existed only to dodge this defect.
- **Compatibility mechanisms kept:** `None`.

## Persisted Data / State Transition Decision

- **Stored subject:** `file_changes.json` per agent run. The shape is unchanged.
- **Change:** none to the code model or the serialization. Future writes simply no longer drop entries.
- **Decision:** `Directly Usable — No Migration`.
  - Existing records are read as today.
  - Entries already lost cannot be rebuilt, because their only source, the FILE_CHANGE event, is gone. A repair would have to invent data (DEC-002).

## Data-Flow Spine Inventory

| Spine | Scope | Behaviors | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001, BEH-003, BEH-004 | Owner list/content read (REST/GraphQL → member-view or standalone path) | Projection returned | `RunFileChangeService.load` | The read that can race |
| DS-002 | Primary | BEH-002, BEH-003, BEH-004 | Agent run FILE_CHANGE event | Cache updated, then `file_changes.json` written | `RunFileChangeService.handle` (per-run queue) | The write that persisted the stale state |

## Primary Execution Spine(s)

- **DS-001:** `Artifacts tab → owner query/route → RunFileChangeProjectionService → RunFileChangeService.load → (hit: copy of cache | miss: readStored → fill if still empty, else copy of cache) → projection`
- **DS-002:** `AgentRun FILE_CHANGE → attachToRun listener → enqueue (per run) → handle → load → upsert → cache set → writeProjection`

## Spine Narratives (Mandatory)

| Spine | Narrative | Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | A read finds the cache, or reads the stored record. When its read returns, it fills the cache only if nobody filled it meanwhile; otherwise the newer cache wins | Cache, stored record | `RunFileChangeService` | Projection store |
| DS-002 | Each event loads the current cache (now never stale), adds its entry, updates the cache and persists it | Same | Same | Same |

## Spine Actors / Main-Line Nodes

`RunFileChangeService.load`, `RunFileChangeService.handle`.

## Ownership Map

`RunFileChangeService` owns the cache, its fill rule, the event serialization and the persisted record of attached runs. No facade is involved.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| E2E stored-record wait before the first live read, and its explanatory comment (`owner-scoped-member-file-changes.e2e.test.ts:22-24`, the helper at `68-74` and its call sites) | It only avoided this defect | The fix | In This Change | Remove the helper if nothing else uses it |
| Temporary probe `tests/unit/zz-tmp/race-disk-probe.test.ts` in the worktree | It was investigation only | The regression test | Done (Solution Designer removed it on 2026-10-19) | The copy stays in `probes/` |

## Return Or Event Spine(s) (If Applicable)

DS-002 is the event spine.

## Bounded Local / Internal Spines (If Applicable)

- **Parent:** `RunFileChangeService`.
- **Spine:** `enqueue → previous.then(handle) → queue map cleanup`.
- **Why it matters:** this serializes events per run. It is unchanged; reads stay outside it (QR-001).

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk |
| --- | --- | --- | --- | --- | --- |
| `RunFileChangeProjectionStore` | DS-001, DS-002 | `RunFileChangeService` | Read and write `file_changes.json` | Persistence | Unchanged |

## Ownership Boundaries

Only `RunFileChangeService` touches `projections`.

## Boundary Encapsulation Map

| Boundary | Internal | Callers | Forbidden | Fix If Thin |
| --- | --- | --- | --- | --- |
| `RunFileChangeService` | `projections`, `queues`, store | `RunFileChangeProjectionService`, `AgentRunResourceManager` | Reading `file_changes.json` directly for an attached run | — |

## Dependency Rules

Unchanged.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `getProjectionForRun(run)`, `getProjectionForCollaborationMember({agentRunId, memoryDir, workspaceRootPath})` | Attached or unattached run | Projection | Unchanged | Behavior is fixed; the signature is unchanged |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Risk | Action |
| --- | --- | --- | --- | --- |
| Above | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

No new names.

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Ordering of cache fills and events | `load` fill rule; the per-run queue | Extend `load` only | The smallest change that enforces the invariant |

## Subsystem / Capability-Area Allocation

`autobyteus-server-ts/src/services/run-file-changes`: Extend.

## Draft File Responsibility Mapping

See Final.

## Reusable Owned Structures Check

None.

## Shared Structure / Data Model Tightness Check

N/A (no structure change).

## Final File Responsibility Mapping

| File | Change | Concern |
| --- | --- | --- |
| `autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts` | Modify | `load`: after `readStored`, if the run is no longer attached return the stored projection without caching. If the cache now holds a projection, return a copy of it. Otherwise fill the cache and return a copy |
| `autobyteus-server-ts/tests/unit/services/run-file-changes/run-file-change-service.test.ts` | Modify | Add AC-001 and AC-002 regression tests (real service, gated stored read, as in the probes). Also add a test that a second concurrent first read does not replace a filled cache |
| `autobyteus-server-ts/tests/e2e/projects/owner-scoped-member-file-changes.e2e.test.ts` | Modify | Remove the stored-record wait and its comment (DEC-003) |
| `tickets/in-progress/run-file-change-live-cache-race/release-notes.md` (delivery) | Add | One user-facing line: files written by a running agent no longer go missing from its Artifacts list; files already missing from older runs cannot be restored |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

As in Final File Responsibility Mapping.

## Folder Boundary Check

N/A (no new files in source).

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| `load` fill | `const stored = await this.readStored(ctx); if (!this.attachedRunIds.has(id)) return stored; const current = this.projections.get(id); if (current) return clone(current); this.projections.set(id, stored); return clone(stored);` | `const p = await this.readStored(ctx); if (attached) this.projections.set(id, p); return clone(p);` | A late stored read must not win over a newer cache |
| Read path | Reads never wait for `queues` | `await this.queues.get(id)` before every read | Keeps reads fast (QR-001) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep the E2E wait | Fewer edits | Rejected | Remove it; the fix makes it unnecessary |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Add the regression tests first. They fail on the base (as the probes show).
2. Change `load`. The tests pass, and the existing service tests and the run-file-changes integration tests stay green.
3. Remove the E2E wait. Run the gated E2E at least 10 times in a row (AC-003; command in the test header).
4. The temporary probe is already removed from the source tree; its copy is in `probes/`.

## Key Tradeoffs

- The conditional fill can do two stored reads when a read and an event miss together. This is negligible, and no single-flight machinery is needed.

## Risks

- R-001 (re-attach within one disk read): contrived, accepted.
- R-002: past losses are not recoverable; the release notes say so.

## Guidance For Implementation

- The regression test should gate the first stored read the way the probe does, then assert three things:
  - later live reads contain the first file;
  - after a second event, the saved record and the live list contain both files;
  - after detach, a fresh read lists both.
- Keep the existing detach test green.
