# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/retired-memory-items-and-stale-built-ins/tickets/in-progress/retired-memory-items-and-stale-built-ins/requirements-doc.md` (SR-002, Approved by the user)
- Upstream Investigation Notes: `…/retired-memory-items-and-stale-built-ins/investigation-notes.md`
- Upstream Solution Revision Record: `…/retired-memory-items-and-stale-built-ins/solution-revision-record.md`
- Reviewed Design Spec: `…/retired-memory-items-and-stale-built-ins/design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts Reviewed: `handoff-architecture-review.md`
- Relevant Solution Revision IDs: SR-002, SR-003
- Architecture Review Revision Record: `…/retired-memory-items-and-stale-built-ins/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: SR-003, a design-only revision resolving AR-001 (and N-2, R-1)
- Prior Review Round Reviewed: 1 (ARCH-REV-001, `Fail`)
- Latest Authoritative Round: 2
- Round 2 evidence:
  - `run-memory-file-store.ts:124-186` (`add`, `appendRawTrace` → `add([item])`, `readMemoryDicts`, `listTurnRawTracesOrdered`, `listRawTraceDicts`, `recordSystemInstructionSupply` using `listRawTraceDicts`/`getRawTracesPath`);
  - `external-runtime-memory-writer.ts:30-32` (the server calls `store.appendRawTrace`);
  - `file-store.ts:11` (the only `MemoryStore` subclass);
  - every test, test-support or harness file naming `MemoryType`, `MemoryItem` or `list(` (13 files, all in the plan, together with `working-context-snapshot-bootstrapper.test.ts` and `run-memory-file-store-damaged-end.test.ts:136`, the only `readMemoryDicts` test caller).
- Current-State Evidence Basis: worktree `codex/retired-memory-items-and-stale-built-ins` at `2e9ac1e65b`.
  - Part 1: a workspace grep for every retired name (frozen code, `node_modules`, `dist` and `tickets` excluded), plus `autobyteus-ts/src/memory/{models/memory-types.ts, models/raw-trace-item.ts, store/base-store.ts, store/file-store.ts, store/run-memory-file-store.ts:80-130,164-186, memory-manager.ts}` and `autobyteus-ts/package.json` exports.
  - The v5 migration's imports (lines 8-35).
  - Part 2: the 20261006 migration (whole file), `app-data-migration-registry.ts`, `app-data-migration-runner.ts:63-90,180-193`, `server-runtime.ts:170-198`, `agent-definition/services/internal-agent-visibility.ts`, `agent-definition/providers/agent-definition-config.ts:21-72`.
  - Every test or script that names the retired agent ids.
  - Read-only checks on the founder's node: both retired `agent-config.json` files; a grep of `server-data` outside `memory/` and `logs/`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: the change deletes within one library subsystem and adds one pattern migration, so `Medium` is right. Risk is `High` because a startup migration deletes data on every user's machine and public `autobyteus-ts` exports are removed.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood:
  - Clean cut of the retired episodic/semantic item model from live code.
  - Remove `agents/autobyteus-skill-evolver` and `agents/autobyteus-memory-compactor` at startup on every machine.
  - Keep the 12 old item files and the 104 compactor runs.
  - Nothing visible changes for runs.
- Relevant existing behavior and evidence confirmed:
  - **No live importer of the retired names outside `autobyteus-ts/src/memory` and its tests.** The grep finds them only in the files INV-1 lists. The v5 migration imports `EPISODIC_/SEMANTIC_MEMORY_FILE_NAME` from its frozen copy (`migrate-native-working-context-snapshots-v5-migration.ts:10-14`).
  - **The server's deep imports of `autobyteus-ts/memory/store/*`** use `RunMemoryFileStore` and the raw-trace names only.
  - **Startup migrations run before the agent catalog is built** (`server-runtime.ts:173` before `buildStudioServer`, `:198`).
  - **A failed required startup migration only logs and retries at the next start** (`server-runtime.ts:175-181`; `RESTART_TO_RETRY`, `app-data-migration-runner.ts:190-192`). It holds back a capability only when the migration declares `holdsBackCapabilities` (`:75`), and the design declares none.
- Scope guardrail confirmed: yes.
- Every prospective blocking `Design Impact` finding is traceable: yes (AR-001 → UC-001, REQ-001's purpose, DEC-001).
- Remaining material ambiguity: none.
- Statements about existing code the design relies on: checked at their cited lines. One is unclear: "keep `readMemoryDicts`/`getFilePath` signatures as far as raw traces need them" (AR-001).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Pass (SR-003 removes the dispatch) | Pass | Pass | Confirmed | — |
| BEH-002 | User | Pass | Pass (INV-4; the internal flag is not involved, MP-001) | Pass | Confirmed | — |
| BEH-003 | System | Pass | Pass | Pass (DS-001) | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass (DS-001) | Confirmed | — |
| BEH-005 | Data | Pass | Pass | Pass (no run folder touched) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present | Pass | design-spec § Task Design Health | — |
| Root cause explicit and evidence-backed | Pass | Legacy or compatibility pressure; INV-1…3, INV-8…11 | — |
| Refactor decision explicit | Pass | Yes (removals) | — |
| Refactor decision reflected in design sections | Pass | SR-003 removal plan rows 177-187; Key Tradeoffs; rejection log line 312 | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | start → migration → folders absent → catalog without them | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

Part 1 is a deletion with no runtime spine. The relevant production path is raw-trace writing: `MemoryManager.store.add([trace]) → FileMemoryStore.add → RunMemoryFileStore.add → getFilePath(item.memoryType)` (`memory-manager.ts:207,281,369,419,443`; `file-store.ts:33`; `run-memory-file-store.ts:124-127`). It is traced under AR-001.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Migration registry → `RemoveRetiredBuiltInAgentsMigration` | Pass | Pass | Pass | Pass | The registry passes the two paths; the migration resolves no path itself |
| `autobyteus-ts` memory store | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New migration | Pass | Pass | Pass | Pass | Framework domain types only, as 20261006 |

Owners receive their collaborators from the composition root, and no lookup hides a missing collaborator (Principle 16): `Pass`. The paths come from the registry.

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `new RemoveRetiredBuiltInAgentsMigration(folders: readonly { itemId; dirPath }[])` | Pass | Pass | Pass | Low | Pass |
| `RunMemoryFileStore.getRawTracesPath()`, private raw-trace read, `add(items: Iterable<RawTraceItem>)`, `appendRawTrace(item)` (SR-003) | Pass | Pass | Pass | Low | Pass |

Empty indirection check (Principle 13) for what the design adds: `N/A`, since the design adds no interface. `MemoryItem` is removed in SR-003.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Remove installed agent folders at startup | Pass | Pass | Pass | Pass | A new migration from the 20261006 pattern; released migrations are not edited |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory` | Pass | Pass | Pass | Pass | — |
| `autobyteus-server-ts/src/app-data-migrations` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Folder-removal helper copied from 20261006 | Pass | N/A | Pass | Pass | Migrations do not share code (repository rule) |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RawTraceItem` (no `MemoryItem`, no `memoryType`) | Pass | Pass | Pass | N/A | Pass | AR-001 resolved; `toDict` unchanged |

Derived consumers listed with a decision for each (Principle 11): `Pass`. Every importer is in INV-1, and no server source imports a removed name.

One vocabulary (Principle 15): `Pass`. The second meaning of "episodic"/"semantic" leaves live code and docs. The `MemoryInspector.spec.ts` word-match change is right.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New migration file and registry line | Pass | Pass | N/A | Pass | — |
| `memory-types.ts` (deleted), `base-store.ts`, `file-store.ts`, `run-memory-file-store.ts`, `raw-trace-item.ts` | Pass | Pass | Pass | Pass | — |
| Test and doc rewrites | Pass | Pass | N/A | Pass | N-2 adopted in Dependency Rules |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `migrations/remove-retired-built-in-agents/` | Pass | Pass | Low | Pass | — |
| `autobyteus-ts/src/memory/retrieval/` removed when empty | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Item models, retrieval, names, exports, `list`, `deserialize`, `memoryTypes` | Pass | Pass | Pass | Pass | — |
| The `memoryType` dispatch (`getFilePath(memoryType)`, `readMemoryDicts(memoryType)`, `add`'s routing, `RawTraceItem.memoryType`, `MemoryType`, `MemoryItem`) | Pass | Pass | Pass | Pass | SR-003; `appendRawTrace` stays (server caller, `external-runtime-memory-writer.ts:32`) |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Retired item reading | No | Pass | Pass | No deprecated re-export (rejection log) |
| Type dispatch for retired types | No (SR-003) | Pass | Pass | — |
| Frozen code, v5, 20261020 | No (untouched by rule) | Pass | Pass | — |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Old `episodic.jsonl`/`semantic.jsonl` | Not Affected (kept, DEC-004) | Pass | Pass | N/A | Pass | — |
| Old compactor runs | Not Affected (kept, DEC-006) | Pass | Pass | N/A | Pass | They stay visible as today (MP-001) |
| `<agentsDir>/autobyteus-skill-evolver`, `autobyteus-memory-compactor` | Migration Required (a removal) | Pass | Pass | Pass | Pass | Isolated owner; registry-passed paths; per-item details; `lstat` then `rm` (a link is removed, never followed); failure is `FAILED` and retried at the next start without blocking startup; idempotent through the ledger and `SKIPPED`; no backup (precedent; delivery gate REQ-007) |
| `RawTraceItem` records | Not Affected | Pass | Pass | N/A | Pass | `toDict` writes no memory-type field, so AR-001's correction is code-only |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–6 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Removal, migration, old files | Yes | Pass | Pass | Pass | — |
| Raw-trace store after the cut | Yes | Pass | Pass (rejection log line 312) | Pass | Surviving methods named in the removal plan |

## Material Premise Validation

### MP-001 — Removing the Memory Compactor definition makes its 104 hidden runs appear

- Related requirement: REQ-002 ("Nothing visible changes"), BEH-002, DEC-006.
- Initiating basis kind: `System`, the migration's normal start.
- Forward path: run history and the Memory page filter runs by `InternalAgentVisibility.hiddenDefinitionIds()`, which is derived from current definitions marked `internal` (`internal-agent-visibility.ts:31-35`). Removing an `internal` definition would make its runs appear.
- Evidence: the founder's `autobyteus-memory-compactor/agent-config.json` has no `internal` field. `internal` is written only for internal agents (`agent-definition-config.ts:71-72`). In the built-in templates' history, only the Model Router ever carried it (`git log -S '"internal"' -- src/built-in-agents` → `930597c730`). So the compactor's runs are already visible, and removal changes nothing.
- Reachability: `Not Reachable`. Consequence: none.

### MP-002 — A user-made team definition lists a retired agent as a member

- Initiating basis kind: `User`. Users build teams from shared agents, so this is possible on other machines. The founder's node has no such reference (grep of `server-data` outside `memory/` and `logs/` finds only old migration backups).
- Consequence: after removal, that team definition no longer admits. Startup logs it and does not block (`build-studio-server.ts` definition admission scan). This follows directly from the user's removal decision and the 20261006 precedent; it is not a design defect.
- Reachability: `Reachable` on other machines, but not a design finding. Recorded as residual risk R-1.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. The behavior basis is confirmed, and the design is ready for implementation.

## Findings

None open. AR-001 is resolved in SR-003 (see the revision record, ARCH-REV-002).

Implementation note: the private raw-trace read must keep `readMemoryDicts`' end repair, marking the path verified (`run-memory-file-store.ts:164-169`), because appends rely on `verifiedEndPaths`.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/implementation_engineer`); informational notice to the Solution Designer.

## Residual Risks

- **R-1 (MP-002).** On machines where a user put a retired agent into a team or org definition, that definition stops admitting after the migration. This is recorded in design-spec Risks. The founder's node has no such definition (the designer's read-only grep), and the user is told.
- **N-1.** The migration's description could name what stays: "Their runs stay." It already does. The founder's backup is a delivery gate (REQ-007).
- **N-2. Retired agent ids in tests outside the design's exception list** (design-spec Dependency Rules). Each one tests something other than the removed folder's presence, so they stay. Add them to the exception list or to AC-001's expected grep output:
  - `tests/unit/application-platform/application-platform-runtime-isolation.test.ts:74` (a legacy settings file proven irrelevant);
  - `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` (stored member ids in an earlier migration's fixtures);
  - `scripts/smoke-built-in-agents-bootstrap.mjs:36,60` and `tests/unit/built-in-agents/built-in-agent-templates.test.ts:7-8` (bootstrapper, unchanged behavior).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 Not Reachable; MP-002 a residual risk, no machinery)
- Notes: SR-003 completes the clean cut. `RawTraceItem` is the one memory item, and the stores read and write raw traces directly. The startup migration is unchanged and ready.
