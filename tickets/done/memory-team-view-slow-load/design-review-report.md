# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/requirements-doc.md` (SR-004, Approved by the user's "go" on 2026-09-25)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/design-spec.md` (SR-004, Ready. Its "SR-004 Revision" section is authoritative where it differs from the rest.)
- Supplemental Task Artifacts Reviewed: None are declared. For triggering evidence I read `handoff-result.md` (SR-004 section) and `code-review-report.md` (CRR-003/004: CR-001…004). I did not review the API/E2E reports as design inputs; F-001 and O-001 are covered through the investigation notes.
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003, SR-004
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: 4
- Round 4 trigger: Solution Designer resubmitted SR-004 after ARCH-REV-003 with AR-001, AR-002 and REC-005…007 addressed. I re-verified every cited location in `requirements-doc.md` and `design-spec.md`; see the "ARCH-REV-003 (round 3) findings resolved in SR-004" table in the design.
- Trigger: Solution Designer handoff "Revised Architecture Design Complete" (SR-004). The revision contains:
  - Delta 1: REQ-012, all agent runs shown in their execution structure;
  - Delta 2: CR-002, the store owns the sources list and the home view refreshes it;
  - Delta 3: CR-004, integrate `origin/personal` @ `589005470`.
- Prior Review Round Reviewed: Round 3 (ARCH-REV-003, Fail: AR-001, AR-002)
- Latest Authoritative Round: 4
- Current-State Evidence Basis (round 3):
  - **Branch:** HEAD `bd8450984`, which is the implemented SR-003. I read `collaboration-root-memory-catalog.ts` and confirmed it reads catalog entries before root IDs.
  - **Team execution structure:** `team-execution-index.ts` (`executionKind`, `listContainingTeamAncestorsForAgent`, `visitConfiguredRoot` admits only agent members) and `run-execution-tree-shared-records.ts` (`startedAt` exists on `TaskAgentExecution`/`TaskTeamExecution` but not on `TaskTeamNestedTeamExecution`).
  - **Upstream `589005470`:** the diff from `40b1783f4` in agent-memory and run-history (`listTeamMemberLocationsFromTree`, `listAgentsInTree`, `withInactiveHistoryMutation`, the `safeReadTree` mismatch check), plus `agent-org-run-history-catalog-service.ts`, `collaboration-run-history-catalog-core.ts` and `root-run-package-readiness-index.ts`.
  - **Base comparison:** `40b1783f4`'s team `listCatalogRows` also awaited readiness, but it did not compact summaries.
  - **Real-data scan (read-only) of `~/.autobyteus/server-data/memory`:**
    - team trees: 535, of which 1 has task executions (1 task agent, 0 task teams);
    - org trees: 23, of which 7 have task executions (1 task agent, 15 task teams, 30 task-team members, 0 nested teams).
  - Round-1/2 evidence for unaffected sections still stands.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: this is the cumulative package. SR-004 adds:
  - a merge with conflicts in memory and run-history;
  - additive GraphQL fields (`executionKind`, `groupPath`);
  - public location-API removals (`configuredOnly`, `listAgentsInTree`, `listTeamMemberLocationsFromTree`);
  - a change to frontend source ownership.
  I confirmed each point.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` (round 4). In round 3 it was `Contradicted` by stale text; AR-001 is now resolved.
- Approved requirements / intended behavior understood: Yes.
  - SR-001…003 behavior still applies.
  - REQ-011 (option (a)): the sources list is requested only by a background refresh on the Memory home, or once (awaited) for an unknown imported route key. Detail and inspector navigation never request it.
  - REQ-012 (explicit user direction): every agent run in the execution tree that has memory is shown in its execution structure, with task agents, task teams and nested teams, for both families.
  - DEC-004: memory folders the tree does not reference stay hidden.
  - REQ-008's member-selection sentence is superseded.
- Relevant existing behavior and evidence confirmed:
  - `bd8450984` implements SR-003.
  - Upstream `589005470` carries the unified catalog core (the org and team `listCatalogRows()` are pure reads of cached, admission-filtered, summary-compacted rows) and the one-read team fix, written in the old structure. The helpers that Delta 3 removes exist upstream only.
  - The execution indexes expose everything Delta 1 needs, and team root trees have no configured sub-teams.
  - On real team data Delta 1 changes nothing: the only task execution is a task agent at a configured address, which SR-003 already listed. Org data gains 30 task-team member rows across 15 task teams.
- Scope guardrail confirmed: `Pass` (round 4). Out of Scope now excludes only DEC-004's unreferenced folders, and the Preserved Behavior Boundary names REQ-009, REQ-010 and REQ-012 as the only exceptions. Round-3 status was `Fail`:
  - The `Out of Scope` list still says task-team members are excluded, which contradicts REQ-012.
  - The `Preserved Behavior Boundary` (REQ-004, AC-005) lists only REQ-009/010 as exceptions.
  - See AR-001.
- Approved change, preserved behavior, and outside scope understood: Yes. The stale text is identified in AR-001.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: Yes. AR-002 protects REQ-004/AC-005, REQ-011/AC-012/AC-013 and REQ-012/AC-014.
- Remaining material ambiguity: None about intent. The inconsistency is textual (AR-001, AR-002).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001…004 | User | Pass | Pass | Pass. Delta 2 keeps one fetch per view and removes the awaited sources call from navigation. `resetList` and `fetchList` now run in one synchronous segment, which removes CR-001. | Confirmed | — |
| BEH-005 | System | Pass | Pass | Pass (round 4). REQ-004/AC-005 list the REQ-012 additions and their aggregates. The gate baseline is `589005470`'s team explorer output. | Confirmed | — (AR-001/AR-002 resolved) |
| BEH-006/007 | User | Pass | Pass | Pass. The org source reads through the history owner (`listCatalogRows`), in the same order as the team source. | Confirmed | — |
| BEH-008/009 | User | Pass | Pass | Pass | Confirmed | — |
| REQ-011 | User | Pass | Pass (CR-002 evidence) | Pass (Delta 2 route sync; background home refresh; awaited load only for an unknown imported key) | Confirmed | — (behavior-map row added) |
| BEH-010 / REQ-012 | User | Pass | Pass (index APIs verified; real-data scan) | Pass. Rows are selected by tree membership plus memory; `groupPath` is derived from existing indexes with one tree read; depth-first contiguous order; frontend grouping keyed by `teamRunId`. | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None are declared. The code-review and API/E2E artifacts are downstream evidence, not behavior-defining supplements.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Unchanged base assessment. SR-004 is an explicitly scoped addition (user: "only a scoped refactoring"). | — |
| Root-cause classification is explicit and evidence-backed | Pass | CR-002 is a source-ownership issue in route sync; CR-004 is an integration overlap; REQ-012 is a user-directed feature change | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor now for CR-002. The merge resolves by keeping this branch's structure. | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Delta 2 code shape, Delta 3 resolution table | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001/002 | Team/org list and runs | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Member inspector | Pass | Pass | N/A | Pass | Pass | Pass | Pass (the inspector is unchanged; any tree agent resolves by `agentRunId`) |
| DS-004 | Frontend route sync | Pass | Pass (round 4: the bounded spine loads sources only for an unknown imported key) | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Catalog local spine | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Explorer facades / catalog / sources | Pass | Pass | Pass | Pass | Unchanged |
| Org history (`AgentOrgRunHistoryCatalogService`) | Pass | Pass | Pass | Pass | Delta 3 moves the org source from the index store to the owner. This removes the bypass flagged by CR-003. |
| `AgentMemoryLocationService` | Pass | Pass | Pass | Pass | `listTeamMemberLocationsFromTree` is removed along with its only caller |
| `memoryExplorerStore` (sources list) / `pages/memory.vue` (route → selection → fetch) | Pass | Pass | Pass | Pass | `loadSources` no longer changes the selection |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentOrgRootMemorySource` | Pass | Pass | Pass | Pass | Round 4: the Dependency Rules now require the history owner and forbid a source reading an index store directly. They also forbid history mutation or repair calls, an awaited sources request on detail/inspector navigation, and a store import in the detail component. |
| All others | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `CollaborationMemberMemoryTargetSummary` + `executionKind`, `groupPath`, `startedAt` | Pass | Pass | Pass (group identity is `teamRunId`) | Low | Pass (see REC-005/006 on `startedAt` nullability and grouping key) |
| `LocatedTeamAgentExecution` / `LocatedAgentOrgAgentExecution` + `executionKind`, `groupPath` | Pass | Pass | Pass | Low | Pass |
| `TeamRunExecutionTreeLocationService.listAgents` without `configuredOnly` | Pass | Pass | Pass | Low | Pass |
| `memoryExplorerStore.loadSources` / `hasSource(key)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Execution structure and kinds | Pass | Pass (index APIs) | N/A | Pass | — |
| Org history rows | Pass | Pass (history owner after the upstream purity fix) | N/A | Pass | Mirrors the team source's stored-only manager |
| Tree visual language | Pass | Pass (sidebar styling reused; data rows derived from `groupPath`) | N/A | Pass | The sidebar's row builders work on the run-history DTOs, so they cannot be reused directly on explorer DTOs |

## Subsystem / Capability-Area Allocation Verdict

Pass. Allocation is unchanged from round 1.

## Reusable Owned Structures Verdict

Pass. `CollaborationMemoryGroup` is shared by both families. Repeating the group path on each member is an accepted, justified denormalization: it keeps search, counts and paging unchanged.

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `CollaborationMemoryGroup` | Pass | Pass | Pass | N/A | Pass | `startedAt` must be nullable: `TaskTeamNestedTeamExecution` has none (REC-005) |
| Member target (`executionKind`, `agentDefinitionId` nullable) | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

Pass. The Final File Responsibility Mapping and the Removal / Decommission Plan now include the SR-004 rows (round 4).

## Subsystem / Folder / File Placement Verdict

Pass. Placement is unchanged.

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `configuredOnly`, `listAgentsInTree`, `listTeamMemberLocationsFromTree` + upstream test | Pass (Delta 1/3) | Pass | Pass | Pass | They are listed in the Delta sections only, not in the canonical Removal plan (AR-002) |
| `syncRouteSource`, the pre/post `selectRouteSubject` calls, the `selectedSource` mutation in `loadSources`, the obsolete page test | Pass (Delta 2) | Pass | Pass | Pass | Same |
| Upstream `team-memory-member-target-builder.ts` | Pass | Pass | Pass | Pass | Stays deleted |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Merge resolution | No | Pass | Pass | No upstream helper is kept alongside the branch structure |
| Unreferenced memory folders (DEC-004) | No | Pass | Pass | No special legacy group, no directory scan |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Trees, history indexes, memory files | `Not Affected` | Pass | Pass | N/A | Pass | The org source now uses the pure `listCatalogRows()`; there are no writes. DEC-004 deliberately does no data repair. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Merge first, then Delta 1, Delta 3 org source, Delta 2, then the gate | Pass | Pass | Pass | Pass |
| Re-validation gate | Pass | Pass | Pass | Pass (round 4). The baseline is `589005470`'s team explorer output on a frozen, mtime-preserving data copy. Allowed differences: REQ-009/010 plus the REQ-012 additions and their aggregates. |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Delta 2 route sync | Yes | Pass | Pass | Pass | — |
| Delta 1 rows (AC-014) | Yes | Pass | N/A | Pass | — |
| "One read per root" example | Yes | Pass (round 4: `configuredOnly` removed; `toMember` carries `executionKind`/`groupPath`) | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `AR-P-001`: a non-admitted stored team root ID reaches the root-first `resolveTeamMemberLocation`

This carries over from round 1: `Not Reachable`, and moot since SR-003. Unchanged.

### `AR-P-002`: a first explorer request on a non-initialized memory dir mixes admission states

- Related contract: REQ-004 (local/imported handling); the root-package readiness contract.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger: the user selects an imported source on the Memory home and opens Agent Teams. For imported dirs the readiness index is not initialized at startup.
- Forward path: `listAgentTeamsWithMemory(source=imported)` → catalog → `readCatalogEntries()` → `listCatalogRows()` → `awaitReady()` rebuilds readiness for that dir → then `listRootRunIds()` (admission-filtered).
- Lifecycle preconditions and consequence: the catalog reads entries **before** root IDs (`collaboration-root-memory-catalog.ts:114–116`), the same order as base `buildGroups`. So the first request is already consistent. Imported dirs carry no orgs (sync excludes them).
- Reachability: `Reachable` path with no inconsistent state.
- Review consequence: no finding. Keep the entries-before-roots order (noted in REC-007).

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Requirements text contradicts approved REQ-012 (AR-001) | The scope guardrail is the review authority for code review and API/E2E | Reconcile the text | Resolved (round 4) |

## Review Decision

`Pass` (round 4, ARCH-REV-004). AR-001, AR-002 and REC-005…007 are resolved, and no new findings were raised.

Round 3 decision (kept for history): `Fail`. The approach in all three deltas is sound and needs no redesign. However, the requirements basis is internally contradictory, and the design spec keeps normative statements that contradict its own SR-004 deltas. Both must be reconciled before the package goes to implementation and downstream review.

## Findings

Round 4 status: **AR-001 Resolved; AR-002 Resolved; REC-005, REC-006 and REC-007 Resolved** (all incorporated into SR-004). No open findings. The round-3 text below is kept for traceability.

### AR-001: requirements doc is internally inconsistent with approved REQ-012 (Requirement Gap, blocking; text reconciliation only)

- Type: `Requirement Gap`. Severity: Medium (blocking).
- Protected authority: REQ-012 / AC-014 (user direction, 2026-09-25); REQ-004 / AC-005; REQ-008's performance clause; QR-001/QR-002.
- Scope status: `Within Approved Scope`.
- Changes approved behavior: `No`. This only aligns stale text with what the user approved. The Solution Designer should confirm that the user's "go" covered REQ-012's effect on the preserved-behavior exceptions.
- Evidence (all in `requirements-doc.md`):
  1. **Out of Scope** (line 60) still reads "Showing members of delegated task teams (task-team members). The Agent Teams rule excludes them, and it is kept for orgs." REQ-012 requires the opposite. This is the same statement that grounded F-001.
  2. **REQ-004, AC-005, BEH-005, Preserved Behavior Boundary and Desired outcome** name only REQ-009/010 as exceptions. REQ-012 adds rows, and with them the run and definition aggregates derived from members (badges, `lastUpdatedAt`, sort position, member counts, and newly visible runs whose only memory is in task-team members). On real data this affects only org runs (team data: 0 task teams), but it is still an approved exception and must be listed.
  3. **REQ-008** is marked wholesale "Superseded by REQ-012". Only its member-selection sentence is superseded. Its "linear + QR-001 for orgs" clause is still cited by AC-003, AC-007, QR-001 and QR-002.
  4. **REQ-012 cites BEH-010**, which is not defined in the behavior table.
  5. **Traceability** does not cover REQ-011, REQ-012 or AC-012…014.
  6. **DEC-003's** status column still says "Pending user decision" while its text says Resolved.
- Required update: fix items 1–6 in place. No design change and no new product policy.
- Proportionality: small text edits. The scope guardrail governs code review and API/E2E, and a stale exclusion here already caused one full reversal cycle (F-001).
- Recommended recipient: `/solution_designer`.

### AR-002: design spec keeps normative base-section statements that contradict the SR-004 deltas, and the gate baseline is unstated (Design Impact, blocking; text only)

- Type: `Design Impact`. Severity: Medium (blocking).
- Protected authority: REQ-012/AC-014 (member rule), REQ-011/AC-012/AC-013 (sources ownership), REQ-004/AC-005 (equivalence gate), and CR-003's in-package half (org history owner).
- Scope status: `Within Approved Scope`. Changes approved behavior: `No`.
- Evidence (`design-spec.md`). The precedence clause at line 5 exists, but these statements are still normative and downstream reviewers check against them:
  - **Dependency Rules** (lines 318–319): the Allowed list names `AgentOrgRunHistoryIndexStore`, and the Forbidden list bans "the org explorer using `AgentOrgRunHistoryCatalogService`". Delta 3 requires that service. A compliant implementation would fail a review against this rule.
  - **Ownership Map** (line 255): the sources own "the configured-placement member rule … (history index)". **Terminology** (line 201) defines "Member memory location" as having a configured placement. Delta 1 removes that rule.
  - **Bounded Local Spine DS-004** (line 287): `syncRouteState → loadSources → …` on every sync. Delta 2 removes this.
  - **Off-Spine** (line 297), **Reuse** (lines 364, 366) and the **"One read per root" example** (line 456): these still show the org index store and `configuredOnly: true`.
  - **Behavior map** (lines 50–62) has no rows for REQ-011 or REQ-012. The **escalation trigger** (line 27) allows only REQ-009/010 differences.
  - **Removal / Decommission Plan** (line 267 onward) omits the SR-004 removals, which appear only inside the Delta sections.
  - **Re-validation gate** (line 182): the comparison baseline is not stated. Upstream `589005470`'s unified catalog core compacts team summaries in `listCatalogRows()`, and `40b1783f4` did not. The baseline must be `origin/personal @ 589005470`'s team explorer output (or the merge-base tip actually used). The allowed differences must then be REQ-009/010 plus the REQ-012 additions **and their derived run/definition aggregates**.
- Required update: bring each listed statement in line with SR-004, either in place or by striking it with a pointer to the governing Delta. Add REQ-011/REQ-012 behavior-map rows. Fold the SR-004 removals into the canonical Removal plan. State the gate baseline and the aggregate exceptions.
- Proportionality: these are text edits, and no architecture change is requested. Contradictory normative rules inside the authority document are how F-001 happened. They would also make a correct implementation fail the Dependency Rules at code review.
- Recommended recipient: `/solution_designer`.

### Non-blocking recommendations (Within Approved Scope; no behavior change)

- **REC-005 (Low): state the member order as a precise depth-first rule.**
  - Each group's rows must be contiguous. Within a group: its agents first (by `displayName`, then kind: configured before task, task by `startedAt`), then configured child teams in tree order, then task child teams by `startedAt`. Nested task-team members have no `startedAt`, so they follow tree order.
  - `CollaborationMemoryGroup.startedAt` is nullable.
  - This matches AC-014 (`Teacher` first, then the configured group, then the task group).
- **REC-006 (Low): the frontend tree builder must group by `groupPath[].teamRunId`, not by address.**
  - A task team delegated to a configured team address has the same `address` and `displayName` (`StudentStudyGroup`) as the configured team. AC-014 shows two distinct groups.
  - Build group headers from consecutive `groupPath` prefixes keyed by `teamRunId`.
- **REC-007 (Info): keep the catalog order of catalog entries before root IDs** (`collaboration-root-memory-catalog.ts:114–116`) through the merge. `listCatalogRows()` awaits readiness, so this order keeps admission consistent on the first request for a non-initialized imported dir (AR-P-002).

## Classification

- AR-001: `Requirement Gap` (text reconciliation of an approved basis; no new approval expected).
- AR-002: `Design Impact` (design-document consistency; the architecture itself is unchanged).

## Recommended Recipient

`/solution_designer`.

## Residual Risks

- RSK-001 (accepted): no caching. Delta 1 adds file stats for about 30 org task-team members, which is negligible.
- O-001 (API/E2E): readiness admission counts on the built server (a validation failure on communication messages). Readiness rules are unchanged by this package.
- REQ-012 says "the same structure the run-history sidebar shows". The design keeps alphabetical order within a group (to preserve REQ-004), so sibling order can differ from the sidebar's tree order. This is structure-equivalent, not order-identical.
- Upstream catalog rows are cached per memory dir for the process lifetime. The same was true of base team behavior. Imported sources carry no orgs.
- Codegen: upstream removed the external-messaging schema, so the regenerated `generated/graphql.ts` will shrink beyond this package's additions.

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-004, round 4, SR-004). Round 3 was `Fail`.
- Material-Premise Gate: `Pass` (AR-P-001 `Not Reachable`/moot; AR-P-002 reachable but consistent)
- Notes:
  - Round 4: AR-001, AR-002 and REC-005…007 are resolved and verified in place. SR-004 is the authoritative design for implementation.
  - Round 3: AR-001 and AR-002 were blocking, but they were text reconciliations only. The approach in Delta 1, 2 and 3 passes the structural checks.
  - REC-005…007 are non-blocking.
  - The prior recommendations REC-001…004 stay resolved.
