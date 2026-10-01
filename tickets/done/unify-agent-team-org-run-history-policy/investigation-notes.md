# Investigation Notes — Unify Agent Team and Agent Org run-history catalog policy

## Investigation meta

- Package identifier: `unify-agent-team-org-run-history-policy`.
- Request: User ticket, 2026-09-24: first check whether reported divergence is true; if so bootstrap a ticket.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy`; Git branch `codex/unify-agent-team-org-history-policy`.
- Base: refreshed `origin/personal`, revision `40b1783f40c072b577ad9d0c5d8fe4f5418c6c38`; finalization target `origin/personal` subject to delivery.
- Bootstrap: isolated worktree and new in-progress ticket package; no source modification.
- Status: original divergence confirmed; requirements approved in the user message of 2026-09-24. SR-005 investigates API-REV-001 F-001 / CRR-002 CR-001 and revises design only; implementation/API-E2E remain failed at this finding until corrected and revalidated.

## Initial request and result

The user supplied the problem statement, constraints, proposed scope and acceptance criteria, and three open behavior decisions. The central divergence is **confirmed on the refreshed integration base**. Source inspection also confirms that the cited memory branch is separate/unmerged at this base. A targeted Vitest command was attempted but could not start because this fresh worktree has no installed `vitest` binary (`ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "vitest" not found`); findings below are code/test-assertion evidence, not a claim of executed test pass.

## Source log and direct evidence

| Source | Observation |
| --- | --- |
| `autobyteus-server-ts/src/run-history/services/team-run-history-catalog-service.ts:26-40,86-93,230-252` | Team state is module-scoped by resolved memory directory. First query awaits readiness, reads index, filters admitted rows, compacts summaries in memory, and does not call a tree read or index write. Writes are queued by `enqueue`. |
| Same file `:96-145,165-268` | Create/restore/summary/termination/archive/delete update the row through semantic lifecycle methods. Delete compensates the index after package deletion failure; archive reads/writes a specific tree. |
| `autobyteus-server-ts/src/run-history/services/agent-org-run-history-catalog-service.ts:24-55,176-220` | Org state and queue are per instance. First `listRows()` invokes `ensureInitialized`, which reads the index, loops over admitted run IDs reading each execution tree, projects rows, and unconditionally writes the full index. Subsequent queries on the same instance use cached rows. |
| Same file `:78-174,225-280` | Org archive/delete use manager-gated queued operations and compensation/readback. Org `recordCreated` rejects an already projected row. |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-run-service.ts:107-116` | Explicit comment and call to `history.initialize()` before `manager.create(tree)` to prevent a first read from projecting the just-created tree and causing `recordCreated` duplicate failure. |
| `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts:43-55` | Team history iterates catalog rows; a tree without a row is not listed. Rows lacking a readable tree also do not render. |
| `autobyteus-server-ts/src/run-history/services/agent-org-run-history-row-projector.ts` and `agent-org-run-history-summary-writer.ts:28-44` | Org tree projection restores only prior summary and termination from the old index row; summary compaction occurs in the summary writer. Team compacts on catalog read and write. |
| `autobyteus-server-ts/src/run-history/store/team-run-history-index-store.ts:138-170,198-214`; `agent-org-run-history-index-store.ts:41-58` | Team non-strict read returns empty on missing or invalid/corrupt index and warns; Org read returns empty on missing but throws on invalid/corrupt. Org initialization writes a rebuilt index after a missing file. |
| `autobyteus-server-ts/src/server-runtime.ts:211`; `standalone-application-host/start-standalone-application-host.ts:166` | Local startup explicitly rebuilds shared package readiness. This is **admission readiness**, not history-row reconciliation. |
| `autobyteus-server-ts/src/run-history/services/root-run-package-readiness-index.ts:55-123` | Shared admission state is keyed by resolved memory directory and supports both families. Its lazy `awaitReady()` may perform a readiness rebuild; that is distinct from history-index writing. |
| `autobyteus-server-ts/tests/unit/run-history/services/agent-org-run-history-catalog-service.test.ts:76-93` | Existing test explicitly expects Org first read to read a tree and write the index once. Team catalog tests assert event updates and compensation. |
| `codex/memory-team-view-slow-load:autobyteus-server-ts/src/agent-memory/services/agent-org-root-memory-source.ts` | Unmerged branch reads Org index store directly to avoid Org catalog side effects; Team root source reads `TeamRunHistoryCatalogService.listCatalogRows()`. |
| `autobyteus-server-ts/src/run-history/services/team-run-history-index-service.ts`; repository `rg` | This is a read-only diagnostic adapter. No production import found; only its own unit test imports it. A historical migration reconciler with a similar name is a separate migration-owned file and must not be confused with it. |
| `tickets/done/org-history-archive-delete-actions/validation/api-e2e/baseline-inventory.json:150,826` | Existing recorded profile has both index arrays with the expected eight-row-field family-specific shapes; representative persisted-data evidence, not a live user-profile mutation or transition test. |

### Corrections and qualifications to the report

1. The index files are at the **memory root** (`memory/team_run_history_index.json` and `memory/agent_org_run_history_index.json`), not inside `agent_teams/` or `agent_orgs/`. The execution trees are under the family directories.
2. Calling Org `listRows()` on an **already initialized instance** does not reread all trees; the expensive writeful reconciliation happens on each new instance's first initialization. The memory branch creates new source objects per request, which exposes the concern there.
3. Both families already share package admission/readiness policy; it is the **history catalog policy** that diverges. `awaitReady()` can scan packages if no readiness generation exists, but that is not a history query reading every execution tree for row projection on every call.
4. The org row is not wholly derivable from the tree: summary and termination are retained from the index. “Tree source of truth” therefore needs a precise meaning and a loss/retention rule for those fields.
5. `TeamRunHistoryIndexService` is not a current production owner, but it has a dedicated test; removal requires updating/removing that test and checking external imports, not blindly deleting similarly named migration code.

## Supported product/system scenarios and current behavior

| ID | Validity | Trigger / goal | Current outcome |
| --- | --- | --- | --- |
| SCN-001 | Supported Normal Scenario | User opens retained Team/Org history in the workspace. | Mixed history reads both catalogs; Team uses row index then a tree per displayed row; Org first catalog initialization rebuilds index from all admitted Org trees. Archived inactive rows are hidden. |
| SCN-002 | Supported Normal Scenario | User creates, restores, summarizes, terminates, archives or deletes an available run via existing service/API. | Family catalogs persist row changes; archive/delete update package and row with gates/compensation. Org creation preinitializes history as a hidden ordering dependency. Team also supports unarchive; Org has no equivalent public unarchive method in the inspected catalog. |
| SCN-003 | Supported Explicit Edge Scenario | Memory explorer inspects an imported/non-local memory folder. | Existing Team explorer uses read-only catalog query. On the unmerged memory branch, Org source bypasses catalog and reads index directly to avoid a write. Imported-folder read-only constraint is explicit in the ticket. |
| SCN-004 | Supported Explicit Edge Scenario after 2026-09-24 approval | A valid execution tree has no history row, or an index is missing/corrupt. | Team and Org differ as above, but manual corruption or orphan-package simulation alone is not proof of intended user-facing recovery semantics. User approved the index-authoritative, explicit-local-repair, missing-empty/corrupt-error policy on 2026-09-24. |

## Persisted data and structural surface inventory

- Existing persisted data: one per-family index array at memory root plus current execution-tree packages under `agent_teams/<id>` and `agent_orgs/<id>`. Both row shapes contain identity, definition, workspace, summary, creation/archive/termination fields; family-specific names differ. Existing representative arrays are in the recorded isolated API/E2E fixture cited above.
- Current writers: lifecycle catalogs, index stores; historical app-data migration code may reconcile older Team data. Normal query path should not be conflated with migration.
- Current readers: family catalogs, mixed history, Team memory explorer; memory-branch Org source directly reads the store. Standalone Agent history is separate and out of scope.
- Structural change likely: shared policy/state/queue abstraction, both family adapters and consumers, startup/maintenance integration if approved. Exact architecture waits for requirements approval.
- Data to preserve: existing index and tree readability, summaries and termination facts that are not present in Org trees, archive state, admission exclusions, failed-mutation compensation. No acceptable data loss specified.
- Unknown: representative index compatibility under the selected future core, live package volumes, whether a recovery entrypoint is user-supported, and the acceptable behavior for orphan tree/missing/corrupt index.

## Supplemental artifact inventory

None. The unmerged memory branch and prior delivered ticket evidence are external read-only references, not supplements with normative authority.

## Architecture-phase investigation and risks

The confirmed root cause is divergent initialization authority: Team initializes from index while Org initializes from trees and writes index. Org's constructor-scoped cache makes the side effect recur with a new service instance. A shared row-state/queue owner may unify the policy, but must not accidentally share injected test dependencies across instances or cross memory directories. Local startup already performs readiness admission; a second all-tree history reconciliation could revive the documented Org startup-latency problem. An index-authoritative proposal avoids that cost, but intentionally ends Org automatic missing-row self-healing unless an explicit recovery step is approved. Design decisions require the architecture spec; approved intended behavior is recorded in requirements SR-002.

## Approval evidence (2026-09-24)

The user first asked whether this was worth refactoring. Solution Designer recommended index-authoritative listings, lifecycle updates, read-only queries, explicit local-only repair, and no routine startup reconciliation, referencing the earlier approval-ready package that also specified missing-empty and corrupt-error/no-overwrite. The user replied: “cool. if it makes the code base cleaner. lets go. i approve”. This approves the presented policy/DEC-001–003, not a particular implementation or review bypass. No Product Design approval is needed.

## Architecture investigation findings (after SR-002 approval)

| Exact source / probe | Verified technical fact | Design consequence |
| --- | --- | --- |
| `agent-org-run-manager.ts:93-113,356-385`; `agent-team-run-manager.ts:123-160` | Both managers persist the package and call family `packageCatalog.admit` before their service calls history `recordCreated`. | Index-only history initialization after manager create is safe: the new package cannot create a duplicate row through initialization, because no tree scan occurs. Creation can remove Org's preinitialize step without a replacement ordering call. |
| `team-run-history-catalog-service.ts:189-203` versus `agent-org-run-history-catalog-service.ts:78-120` | Team archive writes the tree then index but has no compensation if index write fails; Org archive compensates tree/index and checks readback. | Approved failed-archive restore guarantee requires strengthening Team archive transaction, not merely preserving its current implementation. |
| `team-run-history-catalog-service.ts:165-186`, Org catalog `:123-174` | Both delete paths first remove index row then package; Team restores/verifies index+tree if package removal throws; Org adds more readback and indeterminate-outcome checks. | Shared queue/state policy must not flatten away family-specific manager gates or stronger Org compensation. |
| `team-run-history-index-store.ts:143-171`; Org index store `:45-53` | Team already has a strict read that returns `[]` only on ENOENT and throws on invalid data; Org `readIndex` has the same missing-versus-corrupt outcome. | Catalog initialization can use strict Team read without a new parser/version branch; existing file shapes stay usable. The old Team non-strict diagnostic read may remain at store level if needed outside catalog. |
| `app-data-migrations/migrations/team-run-history-index-v2-migration.ts:469-470` | Historical migration writes Team index then calls `resetTeamRunHistoryCatalogState`. | Preserve this export as a thin reset of the new Team-family shared state, or update the migration's import; do not delete migration behavior. |
| `app-data-migrations/migrations/agent-org-history-first-message-summary-v1/...ts:15,72,81-110` | Historical startup-only migration imports `AgentOrgRunHistorySummaryWriter` and explicitly projects org rows. | Removing runtime use of this writer does **not** make the file unused. Keep it migration-owned until a separate migration cleanup; routine catalog reads must not invoke it. One-time pending migration is not routine history reconciliation. |
| `autobyteus-server-ts/scripts/migrate-agent-run-history-index-v2.mjs` and `scripts/run-history-index-migration.md` | A dry-run-default explicit standalone-history repair script exists as an operational precedent. | A collaboration-family repair command can use the same explicit maintenance posture instead of a startup/list side effect or public memory-source method. |
| `autobyteus-server-ts/src/config/app-config-provider.ts:14-39`; `app-config.ts:60-120` | An app-data profile determines the configured local memory root. | A repair command can select an owned app-data profile and derive its memory root, rather than accept an arbitrary imported memory-folder path for writes. |
| `git show codex/memory-team-view-slow-load:.../collaboration-root-memory-catalog.ts` | Memory catalog calls `readCatalogEntries()` once, then reads one root tree per root; errors in reading catalog entries are logged and treated as absent metadata. | Once the memory branch merges, swap Org source's direct store access for `listCatalogRows()`. Do not add a tree-projection catalog query or disturb its one-tree-per-root traversal. |
| Python read-only probe of `tickets/done/org-history-archive-delete-actions/validation/api-e2e/baseline-inventory.json` | Representative isolated profile: Team index 1 row and Org index 4 rows; both are eight-key arrays, Team has one termination fact, Org three. Paths and row values were not altered. | Existing current-shape arrays are eligible for direct use. Verify with actual stores in executable validation; no schema transformation is justified. |

### Additional transition and concurrency notes

- State ownership should be keyed by `(resolved memoryDir, family)`, not just memoryDir, so the two indexes never share a row map. Shared state must include the init promise and mutation queue. A standalone service remains out of scope.
- The core must not hold an instance-specific manager, tree store or package remover in module state. Family adapters retain those dependencies and execute under a shared family queue. Tests with injected stores sharing a memory directory must reset state or use distinct fixture directories.
- A catalog read after cached initialization must not write or read trees. Admission filtering should be checked at query time as well as initialization so a later readiness exclusion cannot expose a stale cached row.
- The normal Org history writer should no longer use its summary writer directly; otherwise it bypasses a new shared queue/row-state owner. The historical migration still uses that writer separately.
- The approved explicit repair may reconstruct tree-derived fields for missing rows, but summary and termination were index-only. A repair of a wholly missing index must report that limitation and cannot claim full lossless recovery; a corrupt index must not be overwritten. The safe entrypoint is an offline/local maintenance command, never an imported memory source or routine startup hook.

## Architecture review recovery evidence — ARCH-REV-001 / DR-001 (2026-09-24)

The independent reviewer reported `Fail — Design Impact`, not a requirement change. Read-only reviewer artifacts: `design-review-report.md` and `architecture-review-revision-record.md` at this ticket root. The supported concurrent premise PM-001 is workspace Team archive versus message-triggered Team restore. Direct reinspection confirms the finding:

| Exact source | Observation | Design implication |
| --- | --- | --- |
| `run-history/services/team-run-history-catalog-service.ts:188-203` | `setArchived` calls `hasManagedTeamRun` **before** `enqueueValue`; inside the queue it reads/writes tree and index with no manager transition callback. | The activity check can become stale before archive/unarchive mutates tree/index. The earlier design claim that Team archive already had a gate was incorrect. |
| Same catalog `:154-186` | Team delete acquires the catalog queue first and calls `manager.withUnmanagedHistoryDeletion` inside it. | Generalize that existing manager-gated transition for both delete and archive/unarchive, keeping queue → per-root lane order. |
| `agent-team-run-manager.ts:123-180,223-233,454-465` | Create and restore run under the per-root `withRootTransition` lane. The deletion callback also uses the lane and checks `hasManagedTeamRun` inside it. | A generalized `withInactiveHistoryMutation` can put Team archive/unarchive's inactive check and full tree/index transaction in the same lane as restore. |
| `agent-org-run-history-catalog-service.ts:78-174`; `agent-org-run-manager.ts:158-168` | Org archive/delete already acquire catalog queue then per-root `withInactiveHistoryMutation`. | Use the same queue → manager-lane ordering for both families; do not invert locks. |
| `team-run-service.ts:145-192` and `agent-org-run-service.ts:112-166` | Service create/restore awaits manager operation before calling history recordCreated/Restored. | Create/restore release their per-root manager lane before requesting the history queue, preventing gate → queue hold-and-wait inversion with archive/delete. |
| `autobyteus-web/composables/useWorkspaceHistoryMutations.ts:138-145`; `autobyteus-web/stores/agentTeamRunStore.ts:246-260` | Archive and message-triggered restore are independent supported user actions for a retained Team. | A deterministic integration interleaving test is warranted under approved REQ-002/004 and AC-002, not a synthetic-only requirement. |
| `tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts:373-401` | Existing deletion/restore lane test holds a barrier and proves restore waits. | Reuse this focused test pattern for Team archive/unarchive versus restore, without inventing a new lock framework. |

**Recovery classification:** `Design Impact` within approved BEH-002/REQ-002/004/AC-002. No new product behavior or renewed user approval is needed. Exact revised technical contract belongs in `design-spec.md` SR-004; the reviewer report remains independently owned and is not edited here.

### User path clarification following feedback

The user emphasized that design should follow a real user scenario. The DR-001 revision is anchored in the supported workspace Archive action and stopped-Team message submission/Restore action, with exact frontend → GraphQL → service → manager/catalog paths in `design-spec.md`. The concurrency interleaving is not an invented low-level test premise; the lock design exists to keep the user-visible inactive-only Archive outcome truthful. This clarification does not change SR-002 approved behavior.

## API/E2E and code-review recovery evidence — API-REV-001 F-001 / CRR-002 CR-001 (2026-09-24)

The latest Code Reviewer result is **Fail — Design Impact**, superseding CRR-001's historical source Pass for routing. `api-e2e-execution-coverage-report.md` reports a supported imported Team Memory inspection with three admitted root packages: 12 post-readiness execution-tree reads, not the AC-003 maximum of three. The recorded `l03-probe.mjs` instruments `TeamRunExecutionTreeStore.prototype.read` only after `RootRunPackageReadinessIndex.rebuild()`, and its assertion `reads <= roots.length` fails in `l03.log`; `l03-diagnostic.log` reports three roots and 12 reads. The probe prints `allFileBytesUnchanged: true` as a literal rather than comparing `before` and `after`, so that output **does not prove byte identity**. Read-only preservation still needs a valid hash comparison in the revalidation. These temporary logs are evidence for the tree-read failure only, not a durable test or a full acceptance pass.

| Exact source / path | Observation | Design implication |
| --- | --- | --- |
| `autobyteus-web/pages/memory.vue:108,122`; `autobyteus-web/stores/memoryExplorerStore.ts:177-194,212`; `autobyteus-web/graphql/queries/memoryExplorerQueries.ts:75-114` | Selecting an imported source and opening Agent Teams or a Team's runs issues `listAgentTeamsWithMemory` or `listAgentTeamRunsWithMemory`. This is a supported user path, not a synthetic tree-reader call. | Both requests must satisfy AC-003 independently; search/page selection does not make extra tree reads acceptable. |
| `autobyteus-server-ts/src/api/graphql/types/memory-explorer.ts:71-92`; `src/agent-memory/services/memory-explorer-source-service.ts:55-85` | Each GraphQL request resolves the selected source to its imported root and constructs a new `TeamMemoryExplorerService`. | A per-request root traversal cannot rely on a prior instance's in-memory tree cache or write to the imported folder. |
| `src/agent-memory/services/team-memory-explorer-service.ts:111-151` | `buildGroups()` obtains catalog rows, enumerates admitted roots and calls `safeReadTree(rootId)` once, then `memberTargetBuilder.build(rootId)` for each tree. | The already-read validated tree should be passed into member-target location derivation rather than discarded and reloaded. Preserve the existing group, run, search, count and memory-availability outcomes. |
| `src/agent-memory/services/team-memory-member-target-builder.ts:18-30`; `src/agent-memory/services/agent-memory-location-service.ts:60-63`; `src/run-history/services/team-run-execution-tree-location-service.ts:81-100,172-202` | Builder calls `listTeamMemberLocations({teamRunId})`; it invokes unscoped `locations.listAgents()`. That enumerates all admitted roots and rereads every stored tree for each root, then filters the requested Team. Existing `listInTree`/`TeamExecutionIndex` already derive correct nested-team physical scope and configured placement from one snapshot. | Do not recreate path/identity logic in the explorer. Expose a pure, already-read-tree location projection and let the Team member-target builder consume it; never invoke the all-root locator from `buildGroups()`. |
| `git show b68847a8c -- .../team-memory-explorer-service.ts` | The implementation commit changed only the stored-history manager stub from the deletion-only name to `withInactiveHistoryMutation` in this source. The all-root member lookup predates it. | This is an approved-AC/design-route gap, not a new shared catalog defect. SR-004's conditional Org memory-source merge cannot defer the current Team source. |
| `tests/unit/agent-memory/team-memory-explorer-service.test.ts:22-99`; `tests/unit/agent-memory/agent-memory-location-service.test.ts:63` | Current tests assert two-root grouping/run/member content, but do not measure tree read count or imported-file byte identity. | Add focused per-request multi-root read-counter and genuine before/after file-hash assertions, preserving nested/member semantics. |

**Recovery classification:** `Design Impact` under the already-approved BEH-003, SCN-003, REQ-005 and AC-003. The approved read bound is unqualified; no renewed approval or narrower criterion is proposed. Revise DS-004 and the current-branch file/test map to deliver the bounded Team path in this package. The Org root-memory source remains conditional because the separate branch is still unmerged; no Org adapter or validation credit is claimed now. Task size/risk remain Medium/High. Independent architecture review must repeat on the revised design before dependent implementation resumes.
