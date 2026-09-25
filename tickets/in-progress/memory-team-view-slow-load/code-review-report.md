# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/requirements-doc.md` (SR-002, Approved)
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/investigation-notes.md`
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/solution-revision-record.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/design-spec.md` (SR-003)
- Supplemental Task Artifacts Reviewed As Context: None exist. `handoff-result.md` was read for routing context. Product Design: `N/A — not applicable`.
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/design-review-report.md` (round 2, Pass)
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-team-view-slow-load/tickets/in-progress/memory-team-view-slow-load/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Current Review Round: 4
- Trigger: The user reported, on 2026-09-25, that the separate ticket "Unify Agent Team and Agent Org run-history catalog policy" (CR-003) is finished and on `origin/personal`. The user asked the reviewer to verify it and route the integration. The branch source is still `bd8450984` on base `40b1783f4`.
- Prior Review Round Reviewed: CRR-003 (Reopened — Design Impact; CR-002, CR-003)
- Latest Authoritative Round: 4
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. The diff confirms each point. About 24 changed source files plus tests span server and web. The change adds GraphQL types and renames a shared GraphQL type. Public location-service APIs change: `listTeamMemberLocations` is removed, and `listAgents({rootRunId})`, `listRootRunIds` and `resolveAgentOrgMemberLocation` are added. A shared catalog core now serves two persistence families.

## Review Scope

- Changed implementation and behavior reviewed: `git diff 40b1783f4..bd8450984` (branch `codex/memory-team-view-slow-load`).
  - Backend: catalog core, the two family sources, the two explorer facades, the member targets, the location boundary, the org tree location service, GraphQL schema and resolvers, and domain types.
  - Frontend: route sync (`pages/memory.vue`), both stores, types, queries, the codegen delta, `CollaborationMemoryDetail.vue`, `MemoryHome.vue`, `MemoryInspector.vue` and localization.
  - Tests on both sides.
- Files / areas reviewed:
  - Every changed source file in full.
  - These dependencies:
    - `team-run-execution-tree-location-service.ts`, for `listAgents`, `configuredOnly`, admission and `toLocation`;
    - `agent-org-execution-tree-location-service.ts`, for `lookupRootIds` admission;
    - `agent-org-run-history-index-store.ts`, for `readIndex` and the row normalizer;
    - `agent-org-run-package-catalog.ts` and `root-run-package-readiness-index.ts`, whose constructors I checked for side effects;
    - the callers of `new AgentMemoryLocationService`: application execution scope, the general process supervisor and skill improvement.
- Checks run by the reviewer:
  - Server: `npx vitest run tests/unit/agent-memory tests/unit/agent-org-execution tests/unit/api/graphql/types tests/e2e/memory tests/unit/skill-improvement`. Result: 48 files passed, 1 failed, 1 skipped; 228 tests passed. The single failure is `memory-sync-multiprocess.e2e`, which is pre-existing and listed in the handoff. The cause is a fixture error in `team-run-execution-tree-builder.ts` ("Team V2 cannot contain configured Team '/nested'"), unrelated to this change.
  - Web: `npx vitest run components/memory pages/__tests__/memory.spec.ts tests/stores/memoryExplorerStore.test.ts tests/stores/memoryInspectorStore.test.ts localization/messages/__tests__/zhCnGlossaryConsistency.spec.ts`: 12 files / 46 tests passed.
- Explicit exclusions:
  - I did not rerun codegen. The handoff states that the hand-applied delta matches the codegen output line for line (360/360).
  - Timing on the live directory and the Electron walkthrough belong to API/E2E.
  - I did not re-run the real-data equivalence probe; it was disposable and has been deleted. I relied on the implementer's recorded result.

### Round 2 independent verification delta (CRR-002)

- Confirmed the implementation source remains at `bd8450984`; no implementation-source change exists after CRR-001. The newly untracked GraphQL E2E test is in progress and is **not** part of this source-review result.
- Independently traced SCN-001…006 through the route, Pinia stores, GraphQL resolvers, catalog, family sources, location services, and memory-view reader. Compared the extracted team catalog policy against the pre-change service, including admission, name/created-at precedence, filtering, and sort. Checked the org index's configured-placement selection and own-run-ID projection.
- Rechecked the prior CR-001 against `resetList`, `syncRouteState`, and the detail component: the temporary empty-state gap remains. No new supported-scenario or engineering-contract finding was substantiated. Structural checks, file-size audit, legacy verdict and scorecard below remain applicable to the unchanged source.
- Focused independent commands: server `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-memory/team-memory-explorer-service.test.ts tests/unit/agent-memory/agent-org-memory-explorer-service.test.ts tests/unit/agent-memory/agent-memory-location-service.test.ts tests/unit/api/graphql/types/memory-explorer-types.test.ts tests/unit/api/graphql/types/memory-view-member-resolver.test.ts --no-watch` → 5 files / 26 tests passed; web `pnpm test:nuxt pages/__tests__/memory.spec.ts components/memory/__tests__/CollaborationMemoryDetail.spec.ts components/memory/__tests__/MemoryHome.spec.ts components/memory/__tests__/MemoryInspector.spec.ts tests/stores/memoryExplorerStore.test.ts tests/stores/memoryInspectorStore.test.ts --run` → 6 files / 38 tests passed.
- Full-volume timing and browser-visible loading/request count remain API/E2E validation, not proof supplied by this source review.

### Round 3 delta (CRR-003): user-directed refactor

- The source has not changed. Round 3 promotes two design-principle observations from the review discussion into findings, at the user's direction:
  - CR-002 is a sources-ownership issue in the frontend route sync. It is the root cause of CR-001.
  - CR-003 is org history reads with side effects, and the explorer bypassing the org history owner.
- The caching and scaling observation (RSK-001) stays rejected as a refactor target. Caching is explicitly out of scope in the approved requirements, and current volume meets QR-001. Adding it now would be machinery for an unsupported premise.
- Additional evidence read this round:
  - `team-run-history-catalog-service.ts`: `listCatalogRows` is a pure read of cached, admission-filtered, `compactSummary`-normalized rows.
  - `agent-org-run-history-catalog-service.ts`: `listRows` → `ensureInitialized` rebuilds the rows from every admitted tree and calls `writeIndex`.
  - `agent-org-run-history-summary-writer.ts`: org summaries are already `compactSummary`'d when written.
  - Callers: `collaboration-root-history-service.ts` (`orgs.listRows()`) and `agent-org-run-service.ts` (`history.initialize()`).
- The decision changes from `Pass` to `Reopened — Design Impact`. The source is not defective against the approved requirements; the reopening follows the user's decision to raise the structural bar now.

### Round 4 delta (CRR-004): `origin/personal` verification

I ran `git fetch origin personal`. `origin/personal` is now `41340cf21`, 15 commits ahead of this branch's base `40b1783f4`. Two of those commits overlap this package:

- **`b68847a8c` refactor(run-history): unify Team and Org catalog policy (merged in `ecfc8cc0f`).** Verified:
  - A new `run-history/services/collaboration-run-history-catalog-core.ts` holds index-row state shared per memory directory and family.
  - Both `TeamRunHistoryCatalogService` and `AgentOrgRunHistoryCatalogService` delegate to that core and expose a pure `listCatalogRows()`: admitted rows, `compactSummary`-normalized, no tree reads, no writes.
  - Index repair is now an explicit maintenance step (`collaboration-run-history-index-repair.ts` plus a repair script); it no longer happens on first read.
  - `team-run-history-index-service.ts` was removed.
  - The history-manager hook was renamed from `withUnmanagedHistoryDeletion` to `withInactiveHistoryMutation`, and the team explorer's `STORED_HISTORY_MANAGER` was updated to match.
  - **This resolves the upstream half of CR-003.**
- **`49ce0d173` fix(team-memory): project imported members from read tree snapshot.** Applied to the *old* explorer structure:
  - `TeamMemoryMemberTargetBuilder.buildFromTree` projects members from the tree that was already read, using the new `AgentMemoryLocationService.listTeamMemberLocationsFromTree` and `TeamRunExecutionTreeLocationService.listAgentsInTree`. This also removes the per-root rescan on `origin/personal`.
  - It adds an invariant: skip a root whose tree `rootTeam.teamRunId` does not match the requested run ID ("Execution tree root does not match Team run …").
  - It carries tests in `team-memory-explorer-service.test.ts` and `agent-memory-location-service.test.ts`.

Integration consequences for this branch (conflicts are certain, not speculative):

- The files this branch deleted or rewrote were changed on `origin/personal`: `team-memory-member-target-builder.ts` (deleted here), `team-memory-explorer-service.ts` (rewritten here), and `agent-memory-location-service.ts` (list API removed here). The shared test files conflict too.
- `team-root-memory-source.ts` still uses `withUnmanagedHistoryDeletion` in its stored-only manager. After the merge this no longer matches the renamed `TeamRunHistoryManager` contract, so it must become `withInactiveHistoryMutation`, or use a read-only dependency that needs no manager.
- After the merge, `listTeamMemberLocationsFromTree` (`AgentMemoryLocationService`) and `listAgentsInTree` (`TeamRunExecutionTreeLocationService`) would have no production caller, because their only caller, the builder, is deleted here. They must be removed or deliberately reused, not left dormant.
- The `49ce0d173` root-mismatch invariant and its tests must be preserved in the catalog/source design. `TeamRunExecutionTreeStore.read` validates the payload against the requested root ID (`validateTeamRunExecutionTreePayload(value, rootTeamRunId)`), so `TeamRootMemorySource.readRoot` may already cover it. The design must state this, and the carried-over test must prove it.
- **CR-003 in-package half:** `AgentOrgRootMemorySource` should now read org history through `AgentOrgRunHistoryCatalogService.listCatalogRows()`, not `AgentOrgRunHistoryIndexStore.readIndex()`. This makes it symmetric with the team source, and org rows gain the admission filter. The org service constructor needs an `InactiveHistoryManager`, so a stored-only manager is needed, as on the team side.
- The Solution Designer's uncommitted SR-004 edits are present in the worktree (`requirements-doc.md`, `design-spec.md`, `investigation-notes.md`, `solution-revision-record.md`, `implementation-handoff.md`), along with untracked API/E2E artifacts and `tests/e2e/memory/memory-collaboration-graphql.e2e.test.ts`. The merge must not drop them.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. The package has four parts:
  - a pure performance fix for Agent Teams (REQ-001, REQ-004, REQ-005);
  - navigate first, then exactly one fetch (REQ-002, REQ-003);
  - the new Agent Orgs tab, org detail and org inspector (REQ-006…008);
  - two disclosed corrections (REQ-009, REQ-010).
- Design-spec behavior map verified against the implementation: Yes (table below).
- Design review report and round confirmed: ARCH-REV-002, round 2, Pass. REC-001…004 are normative in SR-003, and I verified each in the code:
  - REC-001: `listTeamRunAgents` gates the root read on `listRootTeamRunIds()`.
  - REC-002: the component contract matches, and the component imports no store.
  - REC-003: the equivalence gate result is recorded.
  - REC-004: the precedence rules are unchanged in the catalog.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: None.
- Remaining material ambiguity, if any: None. The REQ-009 and REQ-010 disclosure status is unchanged from the architecture review.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `MemoryExplorerResolver.listAgentTeamsWithMemory` → `TeamMemoryExplorerService` → `CollaborationRootMemoryCatalog.collectRuns` → `TeamRootMemorySource.readRoot` = one `listAgents({rootTeamRunId, configuredOnly:true})` per root ID from admission-aware `listRootTeamRunIds()`. The N² builder is gone. Test "reads each root tree exactly once per request" spies `TeamRunExecutionTreeStore.read` | — |
| BEH-002 | Confirmed | `selectTeam` / `selectOrg` / `selectAgent` only call `pushMemory`. `watch(route.fullPath)` → `syncRouteState` → a single `fetchTeamRuns` / `fetchOrgRuns` / `fetchAgentRuns`. Page tests assert no fetch on click and exactly one fetch per route | — |
| BEH-003 | Confirmed | `inspectCollaborationMember` / `inspectAgentRun` push only; `syncRouteState` → `inspectorStore.inspect` once. `resolveTeamMemberLocation` → `listTeamRunAgents`: root-first when the ID is in `listRootTeamRunIds()`, otherwise an admission-filtered unscoped match (nested team IDs). Tests: one tree read for a root; a nested ID resolves; a non-admitted root → null | — |
| BEH-004 | Confirmed | `setSelected{Agent,Team,Org}FromRoute` → `resetList` on an identity change (bumps `requestId`, so a late response is dropped). `selectRouteSubject()` runs before `await loadSources()` and again after it. See CR-001 for a transient-state note | — |
| BEH-005 | Confirmed | The catalog policy matches the removed `buildGroups` / `groupMatches` / `runMatches` / `compare*` / `toRunSummary` line by line (compared in the diff), including `??` vs `\|\|` precedence and the group-name upgrade. Team labels remain `getAgentTeamAddressBasename`. The team rows still come from `TeamRunHistoryCatalogService.listCatalogRows` with the same stored-only manager. Implementer's real-data equivalence result: 1 diff (REQ-010) | — |
| BEH-006 | Confirmed | `listAgentOrgsWithMemory` → `AgentOrgMemoryExplorerService` → catalog → `AgentOrgRootMemorySource`. It uses org `listAgents({rootRunId})`, which applies admission through `lookupRootIds(…, false)`, and the read-only `AgentOrgRunHistoryIndexStore.readIndex`. Imported source: `readdir(agent_orgs)` → `[]` → empty page | — |
| BEH-007 | Confirmed | `listAgentOrgRunsWithMemory`. `getAgentOrgMemberRunMemoryView` → `resolveAgentOrgMemberLocation` → `findAgent({rootRunId, agentRunId})`, which checks admission → `readMemberRunMemoryView`. Web: `org-detail` and `org-inspector` routes, the `org_member_run` target, the breadcrumb `Agent Orgs / org / orgRun / member`, and `backFromInspector` → `org-detail` | — |
| BEH-008 | Confirmed | Web type `displayName`; the component renders `member.displayName`; the route `memberName` = `member.displayName`. No `memberName` field or fallback remains on the member summary | — |
| BEH-009 | Confirmed | Both sources map `located.agentRunId` (the execution's own run). `memoryDir` = `getRootedAgentRunDirPath(scope, agentRunId)`, so the badge, the run ID and the inspector read agree. Test AC-011 (`task-writer-run`) | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, 005 | User | Desktop user | See teams with memory | Memory → Agent Teams tab | Normal | DS-001 | Cards within ≤ 2 s, content unchanged | Requirements; curl evidence | Supported Normal Scenario | Use |
| SCN-002 | BEH-002, 004, 005, 008, 009 | User | Desktop user | See a team's runs | Team card click | Normal | DS-004 → DS-001 | Immediate navigation, one fetch, loading, no stale runs | Requirements | Supported Normal Scenario | Use |
| SCN-003 | BEH-003, 009 | User | Desktop user | Inspect member/run memory | Member/run click | Normal | DS-004 → DS-003 | One inspect; the member's own run | Requirements | Supported Normal Scenario | Use |
| SCN-004 | BEH-006 | User | Desktop user | See orgs with memory | Memory → Agent Orgs tab | Normal | DS-002 | Org cards; imported source → empty state | Requirements (user direction) | Supported Normal Scenario | Use |
| SCN-005 | BEH-007, 008, 009 | User | Desktop user | See an org's runs | Org card click | Normal | DS-004 → DS-002 | As SCN-002 for orgs | Requirements | Supported Normal Scenario | Use |
| SCN-006 | BEH-007, 009 | User | Desktop user | Inspect an org member | Org member click | Normal | DS-004 → DS-003 | Inspector, breadcrumb, Back | Requirements | Supported Normal Scenario | Use |
| SCN-R1 | BEH-003; REQ-005 contract | Contract | Existing `resolveTeamMemberLocation` callers (skill improvement, application scope, supervisor) | The existing contract accepts a nested team run ID | Existing callers | Explicit Edge | Unscoped admission-filtered fallback | Nested ID still resolves | Design Interface Mapping; the pre-existing contract | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | After selecting a new team/org/agent, the detail list is reset (`loading=false`, `entries=[]`) before `await loadSources()`. The detail therefore renders the empty state "No runs match this filter." until the one fetch starts and sets `loading=true` | SCN-002, SCN-005; REQ-003 / AC-004 ("loading state shown") | User clicks a team/org card (or deep-links) | `selectRouteSubject()` → `resetList` → render (`rows=[]`, `loading=false`, `error=null`) → `CollaborationMemoryDetail` `v-else-if="rows.length === 0"` → empty message; after the sources round trip (about 10–12 ms locally per the handoff) → `fetchTeamRuns` → "Loading runs…" | Code: `memoryExplorerStore.resetList`, `pages/memory.vue#syncRouteState`, `CollaborationMemoryDetail.vue` state order. The page test "applies the routed team selection before the memory sources load" shows the gap in which no fetch has started | Promote (Low, non-blocking) | Real, but brief, and usually under one frame for a local backend. No stale runs are shown, so REQ-003's core invariant holds. Proportionate response: mark the list as loading when the route sync resets it for a fetch that always follows (for example, `resetList` sets `loading = true`), or treat "selection applied, fetch pending" as loading in the page. Not a blocker; see CR-001 |
| C-02 | `listTeamRunAgents` root-first check calls `listRootTeamRunIds()` (a directory listing) on every resolve | SCN-003; REQ-005 | Member click | One `readdir` plus one tree read, instead of N tree reads | Code | Reject (not a defect) | This is the REC-001 admission gate. Its cost is O(dir entries) with no tree reads, which satisfies REQ-005 |
| C-03 | A team run ID that is both a stored root and a nested team ID in another root | — | None | Hand-crafted IDs only | Run IDs are generated and unique | Reject | Technically Possible but Unsupported/Contrived |
| C-04 | `AgentMemoryLocationService` now constructs an `AgentOrgExecutionTreeLocationService` for every caller, including non-org callers | Engineering contract (no side effects on construction) | Any caller constructing the service | Constructor → `AgentMemoryLayout` + `AgentOrgRunPackageCatalog` → `RootRunPackageReadinessIndex` (`stateFor(memoryDir)` lookup only) | Code read of both constructors | Reject | No I/O or side effects; negligible cost |
| C-05 | `generated/graphql.ts` hand-applied codegen delta | Design risk "Codegen" | — | Type drift risk only; runtime uses the query documents | Handoff: the delta equals the codegen delta (360/360); the base file was already stale | Reject as a finding; residual risk | The base staleness is pre-existing and out of scope. A full regeneration would add about 1,600 unrelated lines |
| C-06 | `pages/memory.vue` delta 304 lines (> 220) | Size guardrail | — | — | 319 effective lines; one route-sync owner | Reject | Coherent single owner; splitting would fragment the route-to-view mapping. It is under the 500-line hard limit |
| C-07 | `syncRouteState` awaits `loadSources()`, a network query, on **every** route change before the view's single data fetch. The sources list is state that lasts as long as the page, but it is handled as per-view state | SCN-001…006; REQ-002 ("navigate immediately") / REQ-003; design-principle contract (ownership, patch-on-patch control) | Every card, run, member, Back or tab click | click → push → `syncRouteState` → `selectRouteSubject` → **await sources round trip** → `selectRouteSubject` again → one fetch. Consequences: an extra serial round trip per view; it causes the CR-001 empty-state gap; it needs the double `selectRouteSubject()` compensation | `pages/memory.vue#syncRouteState` / `syncRouteSource`; `memoryExplorerStore.loadSources` (`network-only`); implementation handoff (the post-fix stale flash was compensated with a pre-load selection) | Promote (Design Impact, user-directed) | Clean design: make source-list loading a concern that lasts as long as the page, separate from the per-route sync. The route sync then selects the source by key from the already-loaded list and runs exactly one fetch. This removes the double selection and CR-001 by construction. It needs a product decision on when the sources list refreshes (new imports currently appear on any navigation), so the Solution Designer owns it |
| C-08 | `AgentOrgRunHistoryCatalogService.listRows()` rebuilds the rows from every admitted tree and **writes** the index on first read. The org memory source therefore bypasses the org history owner and reads `AgentOrgRunHistoryIndexStore` directly. The team source reads through its history owner's pure `listCatalogRows()` | Design-principle contract (Authoritative Boundary; one read query per family; a read must not repair) | Any org history read | Org explorer → store (bypasses the owner). Other org history consumers (`collaboration-root-history-service.ts`) → `listRows()` → repair on first read | Code: `agent-org-run-history-catalog-service.ts#ensureInitialized` (`writeIndex`); `agent-org-run-service.ts` already calls `history.initialize()` explicitly | Promote (Design Impact, outside this package's approved scope) | Clean design: the org history owner exposes a pure `listCatalogRows()` with the team meaning (admitted, normalized, never writes). Repair stays in the explicit `initialize()`. The org memory source calls the owner, not the store. This touches run-history behavior and an untraced caller, so it is recommended as a separate ticket unless the user approves widening this package |
| C-09 | Per-request memory-file stats with no caching (RSK-001) | Requirement: caching is explicitly out of scope; QR-001 | — | 0.69 s today | Requirements "Out Of Scope"; timing | Reject | Adding caching now would be machinery for an unsupported premise. Revisit when volume grows |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | The primary `Boundary Or Ownership Issue` is resolved. The explorer no longer depends on both the tree service and the `AgentMemoryLocationService` wrapper; each facade depends only on the catalog and its source | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None exist; SR-003 normative sections (REC-001…004, Preserved Team Catalog Policy, component contract) are implemented | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001…005 are traceable in the code: resolver → facade → catalog → source → location service; route sync → store → resolver | — |
| Ownership boundary preservation and clarity | Pass | The catalog owns the policy; sources own reading and labels; facades own DTO mapping; `AgentMemoryLocationService` owns inspector location | — |
| Off-spine concern clarity | Pass | `buildCollaborationMemberMemoryTargets` (stats), `memory-explorer-page.ts`, `readMemberRunMemoryView` (resolver-local) each serve one owner | — |
| Existing capability/subsystem reuse check | Pass | Reuses `MemoryRunSummaryBuilder`, `mergeMemoryAvailability`, page utils, team `listAgents({rootTeamRunId, configuredOnly})`, org `lookupRootIds` admission | — |
| Reusable owned structures check | Pass | One catalog for both families; one member-target file; one detail component; one `readMemberRunMemoryView` | — |
| Shared-structure/data-model tightness check | Pass | `CollaborationMemberMemoryLocation` carries one run ID and no tree or placement. `CollaborationRootCatalogEntry` is all history-sourced. The web `CollaborationRunMemoryRow` is minimal | — |
| Repeated coordination ownership check | Pass | Sort, search, paging and name resolution live only in the catalog; `fetchHomeTab` is the single mapping from tab to fetch | — |
| Empty indirection check | Pass | Facades own subject DTO mapping and input validation, the thin-facade role the design approved | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | See the size audit | — |
| Ownership-driven dependency check | Pass | The catalog imports no team or org module. Sources import only their own family's location and history readers; no source imports `AgentMemoryLocationService`. The org source uses the read-only index store, not the reconciling catalog service | — |
| Authoritative Boundary Rule check | Pass | Resolvers use explorer services and `AgentMemoryLocationService` only; none calls `findAgent` or a source directly. The former mixed-level dependency is removed | — |
| File placement check | Pass | Flat `agent-memory/services` follows the existing convention; web files stay in their feature folders | — |
| Flat-vs-over-split layout judgment | Pass | Four new cohesive server files; no artificial subfolders | — |
| Interface/API/query/command/service-method boundary clarity | Pass | Team and org queries are split by subject; the org view uses the compound `(orgRunId, agentRunId)`; `listAgents({rootRunId})` mirrors the team API | — |
| Naming quality and naming-to-responsibility alignment | Pass | `Collaboration*` matches the existing `CollaborationExecutionLocationService`; `familyLabel` is used only in warnings | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Team and org facades are parallel DTO mappers, which is intentional subject mapping. The two resolver bodies share `readMemberRunMemoryView` | — |
| Patch-on-patch complexity control | Pass | The double `selectRouteSubject()` is documented; it is idempotent when the source is unchanged | — |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Removed: the builder, `listTeamMemberLocations`, private team policy, `AgentTeamMemoryDetail.vue` and its spec, `open*Memory`, handler fetches, and the private `listRootIds`. A grep finds no residual references | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | AC-003 (read counts), AC-011, the corrupt-root skip, the non-admitted root, a nested ID, the org resolver, org explorer grouping and labels, page single-fetch, store identity reset and late-response drop, component AC-010 | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Reuses `current-team-run-fixtures` and `current-agent-org-run-fixtures`; the `STORED_ONLY_MANAGER` stub is local and small | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | `listTeamMemberLocations` assertions moved to `listAgents({rootTeamRunId})`; the old detail spec was removed | — |
| API/E2E readiness for the next workflow stage | Pass | GraphQL surface is complete; open items (live timing, Electron walkthrough, org GraphQL e2e) are explicit in the handoff | — |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/memoryExplorerStore.ts` | 366 | Pass | Pass (122) | Pass: one list-state owner | Pass | OK | — |
| `autobyteus-web/pages/memory.vue` | 319 | Pass | Over (304); justified | Pass: single route-sync owner | Pass | OK (C-06) | — |
| `server/.../memory-explorer-schema.ts` | 264 | Pass | Pass (93) | Pass | Pass | OK | — |
| `server/.../collaboration-root-memory-catalog.ts` | 217 | Pass | New file (238 raw lines) | Pass: one policy owner + its interface/types | Pass | OK | — |
| `server/.../memory-view.ts` | 213 | Pass | Pass (87) | Pass | Pass | OK | — |
| `server/.../team-memory-explorer-service.ts` | 60 | Pass | Over (259); mostly removal | Pass | Pass | OK | — |
| All other changed source files | ≤ 202 | Pass | Pass | Pass | Pass | OK | — |

`generated/graphql.ts` is generated and excluded from these thresholds.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No GraphQL alias, `memberName` fallback or retained `open*Memory` |
| No legacy old-behavior retention in changed scope | Pass | The old detail component and builder are removed |
| Dead/obsolete code cleanup completeness in changed scope | Pass | A grep finds no remaining references |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Not Affected`; all new paths are read-only |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | The root-first fallback in `resolveTeamMemberLocation` serves the existing nested-ID contract (SCN-R1). It is not a version fallback |
| Approved transition mechanics match the reviewed design | Pass | N/A: no migration |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes` (small)
- Why: a new user-facing Agent Orgs memory tab, and a renamed GraphQL type (`CollaborationMemberMemoryTargetSummary`).
- Files or areas likely affected: any memory explorer or GraphQL API docs that delivery syncs. None were changed in this diff.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| AR-P-001 | Confirmed | Implemented as REC-001 (`listRootTeamRunIds()` gate) with a non-admitted-root test |

No new or reclassified premises.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.4
- Overall score (`/100`): 94

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | DS-001…005 map one-to-one onto the code; route sync is the sole fetch owner | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | Catalog/source/facade split is clean; mixed-level dependency removed; no resolver bypass | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.5 | Subject-split queries, compound org view identity, mirrored `listAgents({rootRunId})` | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.3 | Files are cohesive and follow the existing flat convention | `pages/memory.vue` carries a large delta; justified as a single owner | — |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.5 | One run ID per member; no tree or placement carried; one shared detail component | — | — |
| `6` | `Naming Quality and Local Readability` | 9.3 | Names follow `Collaboration*` / `AgentOrg*` conventions; comments explain root-first lookup and pre-load selection | Double `selectRouteSubject()` needs its comment to be understood | — |
| `7` | `API/E2E Readiness` | 9.3 | Surface complete; focused suites green; outstanding validation explicit | Org GraphQL e2e, live timing and Electron walkthrough still open (by design) | API/E2E covers these |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.0 | Team policy preserved exactly; REQ-010 identity correct end to end; admission kept on both families; late-response guard | CR-001: brief empty-state render before the loading state on a new selection | Mark the list loading on reset (CR-001) |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | Clean-cut rename and removals; no aliases or fallbacks | — | — |
| `10` | `Cleanup Completeness` | 9.5 | All planned removals done; no residual references | — | — |

## Findings

### CR-001 (Low, non-blocking): transient empty state before the loading state on a new detail selection

- Candidate: C-01 (Promote). Scenario: SCN-002 / SCN-005. Protected basis: REQ-003 / AC-004 ("loading state shown").
- Evidence:
  - `pages/memory.vue#syncRouteState` calls `selectRouteSubject()` → `setSelected*FromRoute` → `resetList` (entries cleared, `loading` left `false`) and then `await syncRouteSource()`.
  - During that sources round trip, `CollaborationMemoryDetail` (and `AgentMemoryDetail` for agents) renders the "No runs match this filter." branch, because `rows.length === 0 && !loading && !error`.
  - "Loading runs…" appears only once `fetch*Runs` sets `loading = true`.
- Consequence: a flash of a misleading empty message for about one sources round trip (the handoff measured about 10–12 ms locally, often shorter than one frame). The previous selection's runs are never shown, so the core REQ-003 invariant holds.
- Proportionate response: when the route sync resets a list for the fetch that always follows, render the loading state. For example, `resetList` sets `loading = true`, or the page treats a selected-but-not-yet-fetched list as loading. Add the state to the existing "selection before sources" page test. This does not block API/E2E. The implementation engineer can take it in a later cycle, or the API/E2E Electron walkthrough (AC-004) can confirm whether it is visible.

Round 3 status: CR-001 is now subsumed by CR-002. Fixing CR-002 removes it by construction. A local `resetList` loading flag is no longer the preferred fix.

### CR-002 (Design Impact, user-directed): the sources list is re-fetched and awaited on every route change

- Candidate: C-07 (Promote). Scenarios SCN-001…006; REQ-002 / REQ-003; design-principle contract (ownership; patch-on-patch control).
- Evidence:
  - `pages/memory.vue#syncRouteState` runs `selectRouteSubject()`, then `await syncRouteSource()` (`loadSources`, a `network-only` GraphQL query), then `selectRouteSubject()` again, then the one data fetch.
  - The sources list lasts as long as the page, but it is re-fetched as if it were per-view state.
- Consequences:
  - an extra serial round trip before every view's data;
  - the CR-001 empty-state gap;
  - the double-selection compensation.
- Target shape:
  - Source-list loading is its own concern that lasts as long as the page.
  - The route sync selects the source by key from the loaded list, applies the routed subject once, and runs exactly one fetch.
  - Remove the second `selectRouteSubject()` and the pre-load workaround.
- Open product decision, owned by the Solution Designer with user approval: when the sources list refreshes. Today a newly imported source appears after any navigation. Candidates are refresh on entering the Memory page or on the home view, plus a refresh when the source selector opens, or an explicit refresh.
- Recommended scope: this package, as a solution revision (SR-004), then implementation, source review and API/E2E again.

### CR-003 (Design Impact; recommended separate ticket): org history reads have side effects, and the explorer bypasses the org history owner

- Candidate: C-08 (Promote). Contract: Authoritative Boundary Rule; one read query per family; a read must not repair.
- Evidence:
  - `AgentOrgRunHistoryCatalogService.listRows()` → `ensureInitialized()` rebuilds the rows from every admitted tree and calls `writeIndex`.
  - `AgentOrgRootMemorySource` must therefore read `AgentOrgRunHistoryIndexStore` directly.
  - The team equivalent, `TeamRunHistoryCatalogService.listCatalogRows()`, is a pure read.
  - `agent-org-run-service.ts` already calls `history.initialize()` explicitly.
- Target shape:
  - The org history owner exposes a pure `listCatalogRows()`: admitted, normalized rows, never written.
  - Repair happens only in the explicit `initialize()`.
  - `AgentOrgRootMemorySource` depends on the owner, not the store.
  - Check `collaboration-root-history-service.ts`, which calls `listRows()`, for reliance on the repair-on-first-read behavior.
- User-visible impact today: none. Org summaries are already `compactSummary`'d when written.
- Recommended scope: a separate run-history ticket. It changes org history behavior outside this package's approved scope ("Changes to other pages" and persisted-data paths are out of scope). Fold it into this package only if the user explicitly approves widening the scope.
- **Round 4 status: the upstream half is resolved on `origin/personal`** (`b68847a8c`, a pure `listCatalogRows()` for both families; repair is explicit). The remaining in-package half:
  - switch `AgentOrgRootMemorySource` to `AgentOrgRunHistoryCatalogService.listCatalogRows()`;
  - drop the direct `AgentOrgRunHistoryIndexStore` dependency.
  - This is folded into CR-004.

### CR-004 (Design Impact — integration): the branch is stale against `origin/personal` and overlaps two landed changes

- Evidence: see "Round 4 delta (CRR-004)". Commits `b68847a8c` (unified history catalog) and `49ce0d173` (team-memory snapshot projection) change files this branch deleted or rewrote.
- Why it goes to design rather than a mechanical merge:
  - `origin/personal` fixed the per-root rescan in the *old* structure (builder + `listTeamMemberLocationsFromTree` + `listAgentsInTree`). This branch replaces that structure. The design must decide which pieces are removed and which invariant (root-ID mismatch skip) carries into `TeamRootMemorySource` and the catalog.
  - The history dependency of both memory sources changes: the team manager hook was renamed, and the org source should move to the history owner's `listCatalogRows()`.
  - SR-004 (CR-002) is in progress in the same files (`pages/memory.vue`, stores), so one revised design should cover the merge and the refactor together.
- Required outcome:
  1. Merge the latest `origin/personal`.
  2. Resolve conflicts toward this branch's catalog/source structure.
  3. Remove the now-unused `listTeamMemberLocationsFromTree` and `listAgentsInTree` (or justify a caller).
  4. Keep the root-mismatch invariant, with its test.
  5. Update `TeamRootMemorySource`'s stored-only manager to the renamed contract.
  6. Point `AgentOrgRootMemorySource` at `AgentOrgRunHistoryCatalogService.listCatalogRows()`.
  7. Re-run the real-data equivalence gate: team output must match `origin/personal` apart from REQ-009/010.
  8. Regenerate the codegen delta against the merged schema if the schema moved.

## Classification

- `Design Impact` for CR-002 and CR-003. The reviewed design is sound; the user chose to raise the structural bar now.
- CR-002 also carries a small `Requirement Gap`: the timing of sources-list refresh is new intended behavior and needs user approval.

## Recommended Recipient

`/solution_designer` (Design Impact / Requirement Gap rule, per `get_handoff_rules`).

Workflow notes for the Solution Designer:
- API/E2E is currently validating `bd8450984` and should be told that the package is reopened.
- After SR-004, the flow is implementation → source review → API/E2E again.

## Residual Risks

- CR-001 (Low): the transient empty state, to be observed in the Electron walkthrough.
- Codegen: `generated/graphql.ts` was already stale on the base. Only this change's delta was applied, which the implementer verified as 360/360 against codegen. A future full regeneration will produce a large unrelated diff.
- Localization: `memory.generated.ts` has no generator in the repo; the keys were hand-edited in both locales. The glossary and literal audits pass.
- AC-001/002/007 timing on the live, full memory directory is still unverified on the built backend. The snapshot and seeded measurements are well under 2 s.
- RSK-001 (accepted): there is no caching, so every request stats every member's memory files.
- REQ-009/010 rest on disclosed corrections; a user objection is a `Requirement Gap` for the Solution Designer.

## Latest Authoritative Result

- Review Decision: `Reopened — Design Impact` (CRR-004: CR-002 refactor plus CR-004 integration with `origin/personal`; CR-003 upstream resolved)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (AR-P-001 confirmed; no new premises)
- Score Summary: 9.4/10 at unchanged source. CR-002 and CR-003 are user-directed structural improvements, not defects against the approved requirements.
- Failure Origin: N/A
- Recommended Recipient: `/solution_designer`
- Notes:
  - CR-004: merge the latest `origin/personal` (`41340cf21`) and integrate `b68847a8c` and `49ce0d173` into this branch's structure. Do this in the same revision as SR-004.
  - CR-002: in this package, as SR-004. It subsumes CR-001 and needs a user decision on when the sources list refreshes.
  - CR-003: resolved upstream on `origin/personal`. The in-package half (org source → `listCatalogRows()`) is folded into CR-004.
  - RSK-001 (caching): intentionally not refactored.
  - API/E2E validation of `bd8450984` is superseded once SR-004 is approved.
