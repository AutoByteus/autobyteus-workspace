# Design Spec — Group-header "Archive all"

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved requirements baseline: `requirements-doc.md` at SR-003 = SR-002 baseline ("approve", 2026-10-08) + section "SR-003 Approved Delta" (all-or-nothing when any run is running; QR-003 clean messages; user: "exactly. but keep the messages ui clean thanks", 2026-10-08). Governing IDs: REQ-001..REQ-007 (REQ-004/005/007 revised), AC-001..AC-010 (AC-005/008 revised, AC-010 new), DEC-001..DEC-005 (DEC-003 revised), QR-001..QR-003.
- Behavior-defining supplements: None.
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/tickets/in-progress/workspace-history-group-archive/investigation-notes.md`
- Authorities read (2026-10-08): `references/architecture-design.md`, `design-principles.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-history-group-archive/DESIGN.md`, `TESTING.md`, `autobyteus-web/AGENTS.md`, `autobyteus-server-ts/AGENTS.md`. No closer `DESIGN*.md` under `autobyteus-web` or `autobyteus-server-ts`. `design-examples.md` not used.
- Project design-principle conflicts / discrepancies: None.

## Current-State Read

- Sidebar (`WorkspaceHistoryWorkspaceSection.vue`, `WorkspaceAgentOrgHistoryCollection.vue`) renders three group-header kinds inside a workspace section. Headers only expand/collapse (agent header also has `+`).
- Per-run archive UI policy lives in `composables/useWorkspaceHistoryMutations.ts` (pending maps, toasts, org route cleanup); it calls `runHistoryStore.archiveRun / archiveTeamRun / archiveAgentOrgRun`. Each store action = one GraphQL mutation + local cleanup (`runHistoryMutationActions.ts`) + `refreshTreeQuietly()` (full workspace + org history refetch) + `refreshRunNavigationTopology`.
- Server: `AgentRunHistoryService.listRunHistory(limitPerAgent=6)` caps standalone groups at the 6 newest unarchived runs per (canonical workspace root, agentDefinitionId). Team and org listings are uncapped; the client has every team/org run of a group (BEH-003, investigation notes Source Log).
- Per-run archive on the server refuses active runs and keeps data (`setArchiveState`, `setArchived`, `archiveStored`).
- Consequence: the web client already knows every team/org run of a group, but not every standalone run of an agent group. Calling the per-run store actions N times would also trigger N full history refetches (DESIGN.md rule 3).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: ~10 files across web (2 components, section contracts, 1 new composable, tree panel wiring, store + mutation actions, GraphQL doc, 2 locale files) and server (service method + GraphQL resolver/result type), plus tests. All within existing run-history ownership.
- Architectural risk: `Low`
- Risk rationale: one additive GraphQL mutation that composes the existing per-run archive (same guards, same `archivedAt` field). No persistence schema change, no migration, no new runtime owner, no concurrency model change (the catalog queue already serializes each archive). Team/org reuse existing mutations unchanged.
- Escalation trigger: if implementation finds the client agent-group `workspaceRootPath` cannot be matched to server catalog rows by `canonicalizeWorkspaceRootPath`, or that per-run index flushes make groups of realistic size noticeably slow, return `Design Impact`.

## Architecture Investigation Evidence

| Source | Exact Path | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts:61–110` | Groups rows by `canonicalizeWorkspaceRootPath(row.workspaceRootPath)` + `agentDefinitionId`; caps at 6 | Server-owned agent group archive using the same grouping key | None |
| Code | `.../agent-run-history-catalog-service.ts:292,374–405` | `archiveRun` → liveness check → queued row update + flush | Reuse per run; pre-check `isActive` for the all-or-nothing block | One index flush per run (acceptable, see Risks) |
| Code | `.../workspace-run-history-service.ts` `groupTeamRunsByDefinition`; `autobyteus-web/utils/runTreeProjection.ts:366–415` | Team groups and org groups are fully delivered; org grouping is a client projection (`historyRoot`, `orgDefinitionId`) | Team/org group archive iterates the group's listed runs on the client (no server re-derivation of client grouping) | None |
| Code | `autobyteus-web/stores/runHistoryMutationActions.ts`, `runHistoryStore.ts:388–422` | Per-run store actions each refresh the full tree | Split "archive + local cleanup" from "refresh" so a group refreshes once | None |
| Code | `autobyteus-web/stores/runHistoryLoadActions.ts:94+` | `fetchRunHistoryTree` refreshes workspace and org branches together | One `refreshTreeQuietly()` per group covers all kinds | None |
| Code | `WorkspaceAgentRunsTreePanel.vue:89–118, 236–275` | Panel owns `ConfirmationModal`s and wires mutation composables | Add a third modal bound to the new group-archive composable | None |

## Intended Change

Add an "Archive all" icon button to each agent, team and Agent Org group header. On click: if any run of the group is running, show one short message ("Stop running runs first.") and do nothing else. Otherwise open a confirmation; on confirm archive every stored run of that group in that workspace, refresh history once, and show one short summary toast. All-or-nothing (SR-003). Standalone agent groups use a new server mutation that enumerates all stored runs (including those beyond the 6 shown). Team and org groups archive their listed runs with the existing per-run mutations, then refresh once.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-002 (agent) | User | REQ-001..007; AC-001,002,004..008,010; QR-003 | Click Archive all on agent header → confirm | No group action | Blocked with message if any run is running; else all stored runs of (workspace, agent) archived; one toast | DS-001 |
| BEH-002 (team) | User | REQ-001,003..007; AC-001,003..008,010; QR-003 | Same on team header | No group action | Blocked if any run active/not READY; else all listed team runs archived | DS-002 |
| BEH-002 (org) | User | REQ-001,003..007; AC-001,003..008,010; QR-003 | Same on org header | No group action | Blocked if any run active; else all listed org runs archived; route cleared if open org archived | DS-002 |
| BEH-001 | User | AC-009 | Per-run archive/delete | Works | Unchanged (behavior and per-run refresh preserved) | existing |
| BEH-003 | System | REQ-002 | Listing | 6-run cap | Unchanged | — |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `No`
- Structural triggers:
  - Repeated coordination: a client loop over per-run actions would repeat the full refresh N times. Addressed by splitting the per-run store action into "archive + cleanup" and "refresh" (one owner per step) rather than adding a cache.
  - Responsibility overload: `useWorkspaceHistoryMutations.ts` (253 lines) owns per-run terminate/archive/delete + delete confirmation. Adding group confirmation/pending/summary there would mix a second concern → new composable `useWorkspaceHistoryGroupArchive.ts`.
  - Ambiguous boundary: the new server mutation takes an explicit compound identity `(workspaceRootPath, agentDefinitionId)`; no generic "group id".
  - Empty indirection: none added; the server service method owns selection + classification.
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No` (only the small extraction of the per-run store core described below, which is part of the feature).
- Evidence: Current-State Read.
- Design response: extend existing owners (`AgentRunHistoryService`, `runHistoryStore`, sidebar components); one new web composable for the group-archive UI policy.
- Intentional deferrals: per-run index flush during a server group archive (one flush per run) — not batched; revisit only if measured slow.

## Terminology

- *Group*: one header's runs in one workspace — agent group = (workspace root, agentDefinitionId); team group = sidebar display group (`WorkspaceHistoryTeamDefinitionDisplayGroup`); org group = `AgentOrgHistoryDefinitionGroup` in that workspace node.
- *Blocking run*: agent — a stored run that is active (visible: `run.source === 'history' && run.isActive`; hidden: server status projection); team — `isActive || deleteLifecycle !== 'READY'`; org — `isActive`. Drafts / local unsaved runs never block and are never archived.
- *Group is archivable*: it has at least one saved run and no blocking run.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- No legacy path is replaced. The per-run store actions keep their contract; their body is refactored to call the extracted core + refresh (no duplicate implementation remains).

## Persisted Data / State Transition Decision

- Stored subject: standalone run index rows (`archivedAt`), team/org execution trees + index rows (`archivedAt`).
- Change: none to shape; only more rows receive `archivedAt` via existing writers.
- Decision: `Not Affected`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-002 agent | Agent header button | Sidebar refreshed + summary toast | `useWorkspaceHistoryGroupArchive` (UI) / `AgentRunHistoryService` (server) | Must reach runs hidden by the cap |
| DS-002 | Primary End-to-End | BEH-002 team/org | Team or org header button | Sidebar refreshed + summary toast | `useWorkspaceHistoryGroupArchive` / `runHistoryStore` | Client knows all runs; must refresh once |
| DS-003 | Bounded Local | DS-001 | Server group selection | Per-run outcome list | `AgentRunHistoryService.archiveStoredAgentRunGroup` | Blocks on any active run; else archives and reports archived / failed |

## Primary Execution Spine(s)

- DS-001: `Agent group header button → useWorkspaceHistoryGroupArchive (confirm) → runHistoryStore.archiveAgentRunGroup → GraphQL archiveStoredAgentRunGroup → AgentRunHistoryService.archiveStoredAgentRunGroup → AgentRunHistoryCatalogService.archiveRun (per run) → result → store local cleanup per archived run → one refreshTreeQuietly + topology refresh → summary toast`
- DS-002: `Team/org header button → useWorkspaceHistoryGroupArchive (confirm) → runHistoryStore.archiveTeamRuns / archiveAgentOrgRuns(ids) → per id: existing archiveStoredTeamRun / archiveStoredAgentOrgRun mutation + local cleanup → one refreshTreeQuietly + topology refresh → org route cleanup → summary toast`

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Main Nodes | Owner | Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The header asks the composable to archive group (W, A). The composable shows a confirmation. On confirm it marks the group pending and calls the store. Before confirming, the composable checks the visible rows; any running run → "Stop running runs first." and stop. Otherwise confirm, then one mutation; the server lists W/A's unarchived catalog rows; if any is active it archives nothing and returns `activeRunIds`; else it archives them one by one through the existing catalog method and returns `archivedRunIds` / `failedRunIds`. The store cleans local state for archived ids, refreshes once (only if something was archived) and returns the outcome; the composable shows one short toast (blocked message if `activeRunIds` is non-empty). | header, composable, store, resolver, service, catalog | composable (UI policy), service (selection/classification) | localization, toast |
| DS-002 | Same UI flow and pre-check (any blocking run → blocked message, no dialog); the composable passes all of the group's listed run ids. The store archives each id with the existing per-run core (sequentially), refreshes once, returns archived/failed ids. The composable runs org route cleanup for archived org ids and shows one toast. | header, composable, store | composable, store | org route cleanup callback |
| DS-003 | `rows = listCatalogRows()` → filter `!archivedAt && canonical(row.workspaceRootPath) === canonical(input) && row.agentDefinitionId === input` → `activeRunIds = rows where status projection isActive` → if non-empty return `{ archivedRunIds: [], activeRunIds, failedRunIds: [] }` (nothing archived) → else for each `catalogService.archiveRun` → success ? archived : failed (a run that started meanwhile is refused by the catalog guard → failed). | service | service | — |

## Spine Actors / Main-Line Nodes

Group header buttons; `useWorkspaceHistoryGroupArchive`; `runHistoryStore` group actions; GraphQL `archiveStoredAgentRunGroup`; `AgentRunHistoryService.archiveStoredAgentRunGroup`; `AgentRunHistoryCatalogService.archiveRun` (existing).

## Ownership Map

- Header buttons (components): render, visibility (has archivable runs), disabled while pending; emit action with group descriptor. No policy.
- `useWorkspaceHistoryGroupArchive`: confirmation target, pending group keys, kind dispatch, archivable-id selection for team/org, summary toast text, org route cleanup. Owns the group UI policy.
- `runHistoryStore` group actions: GraphQL calls, per-run local cleanup, single refresh + topology refresh. Owns client history state.
- `AgentRunHistoryService.archiveStoredAgentRunGroup`: authoritative selection of a standalone group's stored runs and outcome classification.
- Catalog service: per-run archive invariants (unchanged).

## Thin Entry Facades / Public Wrappers

| Facade | Owner Behind It | Why | Must Not Own |
| --- | --- | --- | --- |
| GraphQL `archiveStoredAgentRunGroup` resolver | `AgentRunHistoryService` | Transport | Selection logic |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| Inline mutation+cleanup+refresh bodies of `archiveTeamRunInHistoryStore`, `archiveAgentOrgRunInHistoryStore` | Group action needs the same mutation+cleanup without refresh | Extracted cores `archiveTeamRunRecord`, `archiveAgentOrgRunRecord` used by both per-run (then refresh) and group actions | In This Change | Per-run behavior unchanged |

## Return Or Event Spine(s)

N/A — request/response only.

## Bounded Local / Internal Spines

DS-003 (above), parent owner `AgentRunHistoryService`. Sequential loop; the catalog queue serializes writes anyway.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization strings | DS-001/002 | composable, headers | Button label, confirm title/message, summary toast | i18n (en, zh-CN) | — |
| Org route cleanup | DS-002 | composable | Leave `/workspace?rootSubjectKind=agent_org&orgRunId=<archived>` | Same as per-run org archive | — |
| `ConfirmationModal` | DS-001/002 | composable | Existing modal component | Reuse | — |

## Ownership Boundaries

Components → composable (via `WorkspaceHistorySectionActions` / `State`) → `runHistoryStore` → GraphQL → service → catalog. The composable never calls GraphQL; components never call the store.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| `runHistoryStore` group actions | Apollo mutations, local cleanup, refresh | `useWorkspaceHistoryGroupArchive` (via panel wiring) | Composable calling Apollo or `runHistoryMutationActions` directly | Add store action |
| `AgentRunHistoryService` | Catalog rows, status projection, catalog archive | GraphQL resolver | Resolver reading catalog | Extend service |

## Dependency Rules

- Allowed: component → section contracts; panel → composable + store; composable → injected params only (store functions, toast, route callback), as `useWorkspaceHistoryMutations` does.
- Forbidden: group archive calling the per-run *store* actions in a loop (would refresh N times); server resolver deriving group membership itself; server re-deriving team/org client grouping.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| GraphQL `archiveStoredAgentRunGroup(workspaceRootPath: String!, agentDefinitionId: String!): ArchiveStoredAgentRunGroupResult` | Standalone runs of one agent in one workspace | Archive all archivable stored runs | `(workspaceRootPath, agentDefinitionId)` | Result: `archivedRunIds: [String!]!`, `activeRunIds: [String!]!` (non-empty ⇒ nothing archived), `failedRunIds: [String!]!` |
| `AgentRunHistoryService.archiveStoredAgentRunGroup(input: { workspaceRootPath; agentDefinitionId })` | same | Select + classify + archive | same | Throws on empty inputs |
| `runHistoryStore.archiveAgentRunGroup(workspaceRootPath, agentDefinitionId): Promise<{ archivedIds; activeIds; failedIds }>` | same | Mutation, cleanup, refresh (only when archivedIds non-empty) | same | Network/GraphQL error → throws; composable reports failure |
| `runHistoryStore.archiveTeamRuns(teamRunIds: string[]): Promise<{ archivedIds; failedIds }>` | Team runs | Archive listed ids, refresh once | team run ids | Sequential |
| `runHistoryStore.archiveAgentOrgRuns(orgRunIds: string[]): Promise<{ archivedIds; failedIds }>` | Org runs | Same | org run ids | Sequential |
| Section actions `onArchiveAgentGroup(workspaceNode, agentNode)`, `onArchiveTeamGroup(workspacePresentationId, group)`, `onArchiveAgentOrgGroup(workspacePresentationId, group)`; state `isGroupArchiving(groupKey)` | Header → composable | — | explicit per kind | Group keys: `agent:<workspaceRootPath>:<agentDefinitionId>`, `team:<workspacePresentationId>:<group.key>`, `agent_org:<workspacePresentationId>:<definitionId>` |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| `archiveStoredAgentRunGroup` | Yes | Yes | Low | — |
| `archiveTeamRuns` / `archiveAgentOrgRuns` | Yes | Yes | Low | Separate per subject |
| Section group actions | Yes | Yes | Low | One per kind |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Server op | `archiveStoredAgentRunGroup` | Yes (matches `archiveStoredRun`) | Low | — |
| Composable | `useWorkspaceHistoryGroupArchive` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Per-run archive invariants | Catalog services + per-run mutations | Reuse | Same guarantees |
| Confirmation | `ConfirmationModal.vue` | Reuse | Existing pattern |
| Toast | `addWorkspaceToast` | Reuse | — |
| Local cleanup | `cleanupStoredRunLocalState`, `cleanupStoredTeamRunLocalState`, `cleanupStoredAgentOrgRunLocalState` | Reuse | Selection/context cleanup identical to per-run |
| Group UI policy | `useWorkspaceHistoryMutations` | Create New (sibling composable) | Separate concern; keeps per-run composable focused |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spines | Decision |
| --- | --- | --- | --- |
| Server `run-history` | Agent group selection/archive | DS-001, DS-003 | Extend |
| Server `api/graphql/types/run-history.ts` | Mutation + result type | DS-001 | Extend |
| Web `stores/` | Group store actions, extracted cores | DS-001, DS-002 | Extend |
| Web `composables/` | Group archive UI policy | DS-001, DS-002 | Create New file |
| Web `components/workspace/history/` | Header buttons, contracts, panel wiring | DS-001, DS-002 | Extend |

## Final File Responsibility Mapping

| File | Change | Concern |
| --- | --- | --- |
| `autobyteus-server-ts/src/run-history/services/agent-run-history-service.ts` | Modify | Add `archiveStoredAgentRunGroup` + `ArchiveStoredAgentRunGroupResult` type |
| `autobyteus-server-ts/src/api/graphql/types/run-history.ts` | Modify | Add `ArchiveStoredAgentRunGroupMutationResult` object type + `archiveStoredAgentRunGroup` mutation (errors propagate as GraphQL errors; input validation errors thrown by service) |
| `autobyteus-web/graphql/mutations/runHistoryMutations.ts` | Modify | `ArchiveStoredAgentRunGroup` document |
| `autobyteus-web/stores/runHistoryTypes.ts` | Modify | Mutation data type |
| `autobyteus-web/stores/runHistoryMutationActions.ts` | Modify | Extract `archiveTeamRunRecord` / `archiveAgentOrgRunRecord` (mutation + cleanup, no refresh); per-run functions = core + refresh; add `archiveAgentRunGroupInHistoryStore`, `archiveTeamRunsInHistoryStore`, `archiveAgentOrgRunsInHistoryStore` (one refresh each) |
| `autobyteus-web/stores/runHistoryStore.ts` | Modify | Actions `archiveAgentRunGroup`, `archiveTeamRuns`, `archiveAgentOrgRuns` + one `refreshRunNavigationTopology('group-archive')` |
| `autobyteus-web/composables/useWorkspaceHistoryGroupArchive.ts` | Add | Pending target, confirm/cancel, pending keys, dispatch, archivable selection for team/org, summary toast, org route cleanup |
| `autobyteus-web/components/workspace/history/workspaceHistorySectionContracts.ts` | Modify | New actions + `isGroupArchiving` state |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Modify | Archive-all button on agent header (before `+`) and team header (right end; header becomes a row with the toggle button + action, like the team run row) |
| `autobyteus-web/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue` | Modify | Archive-all button on org header (right end) |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | Modify | Wire composable, state, actions, third `ConfirmationModal` |
| `autobyteus-web/localization/messages/en/workspace.ts`, `.../zh-CN/workspace.ts` | Modify | Strings |
| Tests (see Guidance) | Add/Modify | — |

## Target Subsystem / Folder / File Mapping

Covered above; no new folders. Composable sits beside `useWorkspaceHistoryMutations.ts`.

## Folder Boundary Check

No new folders; existing placement matches ownership. Risk Low.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Group refresh | `for id of ids: await archiveTeamRunRecord(store,id)` then `await store.refreshTreeQuietly()` once | `for id of ids: await runHistoryStore.archiveTeamRun(id)` | Avoids N full refetches |
| Server selection | Service filters catalog rows by canonical root + agentDefinitionId | Client passes visible run ids for agent groups | Hidden runs beyond cap would be missed (DEC-001) |
| Messages (en, QR-003) | Blocked: "Stop running runs first." Success: "Archived 5 runs." Partial: "Archived 4 runs. 1 failed." | One toast per run; run IDs or server messages in toasts; multi-sentence explanations | REQ-004/005, QR-003 |

Confirmation (en, QR-003): title "Archive all runs?"; body "{name} · {count} runs will be hidden from history." (team/org: count = listed runs; agent: use "{name} — all runs will be hidden from history." since hidden runs are not counted client-side); confirm button "Archive all". zh-CN equivalents equally short.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Plan |
| --- | --- | --- | --- |
| Keep per-run store actions as-is and duplicate their bodies for group use | Avoid touching per-run code | Rejected | Extract cores, reuse |

## Change / Refactor Sequence

1. Server: service method + unit tests; GraphQL mutation + E2E test (seed >6 runs of one agent in one workspace, one active, runs in another workspace untouched).
2. Web store: extract cores; add group actions; store tests (one refresh, cleanup per archived id).
3. Web composable + tests (confirm/cancel, dispatch per kind, archivable selection, summary counts, failure handling, org route cleanup, pending key).
4. Components + contracts + panel wiring + locale strings; component tests (button present per kind, hidden when nothing archivable, disabled while pending, aria-label).
5. Browser/isolated-app verification of the three headers.

## Key Tradeoffs

- Agent groups server-side, team/org groups client-side: chosen because only agent groups are capped; avoids re-deriving client-side org/team grouping (workspace root mapping, `NO_WORKSPACE` root, name fallback) on the server. One UI owner keeps behavior identical across kinds.
- Sequential per-run archive rather than a batched catalog write: reuses all per-run guards; group sizes are tens of runs.

## Risks

- One standalone index flush per archived run (server) — acceptable for tens of runs; measure only if reported slow.
- Merge overlap with `codex/run-continuity-after-agent-definition-rename` in `WorkspaceAgentOrgHistoryCollection.vue` (rows) and possibly `agent-run-history-*` (reconnect rewrites standalone rows). Rebase on whichever lands first.
- A run that starts after the server's active check but before its own archive is refused by the catalog guard and reported as failed (AC-010); acceptable, the message stays short.

## Guidance For Implementation

- Server: compute `activeRunIds` first via `statusProjectionService.getCatalogListStatusProjection(runId).isActive` for all selected rows; if any, archive nothing. Otherwise call `catalogService.archiveRun(runId)` per row; `success === false` → `failedRunIds`. Validate non-empty inputs; canonicalize input root with the same `canonicalizeWorkspaceRootPath` used by `listRunHistory`.
- Button visibility: agent — any `run.source === 'history'`; team/org — any run. Shown even when runs are running (click then shows the blocked message).
- Client pre-check before the dialog uses the Blocking run definition; team/org never call the store when blocked. Agent: if the server returns non-empty `activeRunIds` (hidden running run), show the same blocked message. Drafts/local rows are never touched.
- Messages: per QR-003 / Examples; use `warning` toast for blocked, `success` for full success, `error` when some failed or the call failed ("Archive failed. Try again."). Never surface server `message` strings or IDs in toasts (log them with `console.error`).
- Pending: group key disabled while in progress; per-run archive buttons of that group need not be disabled (per-run guards prevent double work), but must not crash if a run disappears.
- Button style: same classes as row archive buttons (`heroicons:archive-box-20-solid`, amber hover, `md:opacity-0` revealed on header hover/focus-within); add `data-test`: `workspace-agent-group-archive-<agentDefinitionId>`, `workspace-team-group-archive-<group.key>`, `agent-org-group-archive-<definitionId>`; `title`/`aria-label` "Archive all runs".
- Team header today is a single `<button>`; restructure to a `div.group/team-header` containing the existing toggle button and the action button (no nested buttons).
- Tests: server unit (`tests/unit/run-history/services/agent-run-history-service.test.ts`), server E2E (extend `tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts`), web store/composable/component specs under existing `__tests__`; existing per-run archive tests must stay green (AC-009). Final real-product check via an isolated desktop instance (TESTING.md rules 1–2).
