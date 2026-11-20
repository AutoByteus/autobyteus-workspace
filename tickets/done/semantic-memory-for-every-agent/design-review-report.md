# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/semantic-memory-for-every-agent/tickets/in-progress/semantic-memory-for-every-agent/requirements-doc.md` (SR-008, Approved; the founder approved the UI on 2026-11-20)
- Upstream Investigation Notes: `…/semantic-memory-for-every-agent/investigation-notes.md` (INV-1…INV-12), `global-semantic-memory-investigation.md` (evidence)
- Upstream Solution Revision Record: `…/semantic-memory-for-every-agent/solution-revision-record.md` (SR-001…SR-007)
- Reviewed Design Spec: `…/semantic-memory-for-every-agent/design-spec.md` (SR-009: SR-008 plus the section "Definition Folder Names And Preparation Failures")
- Supplemental Task Artifacts Reviewed:
  - UI/UX spec (Product-owned, normative): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/semantic-memory-view-554/ui-ux-spec.md` (Approved 2026-11-20);
  - `follow-ups.md` (FU-001);
  - `implementation-progress.md`;
  - `handoff-architecture-review.md` (SR-007 section).
- Relevant Solution Revision IDs: SR-003…SR-009
- Architecture Review Revision Record: `…/semantic-memory-for-every-agent/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-005`
- Current Review Round: 5
- Trigger: SR-007 resubmission. It includes the read-only Skills-style view (SR-004), owner navigation (SR-005), the merged global semantic memory (SR-006) and the approved UI (SR-007).
- Prior Review Round Reviewed: 3 (ARCH-REV-003, `Fail`: AR-003…AR-006)
- Round 4 trigger: SR-008 resubmission (consolidated design; AR-003…AR-006 answered)
- Round 4 evidence, in addition:
  - `agent-episodic-catalog/domain/episodic-catalog-models.ts` (`CatalogEntry`: `runId`, `memoryDir`, `root`, `agentName`, `startedAt`, `lastActivityAt`, `taskTitle`, `workspace`, `journal`);
  - `episodic-catalog.ts:50-75`; `build-studio-server.ts:191, 256, 283, 310, 312`;
  - `memory-explorer-schema.ts:5, 90` (`AgentWithMemorySelectorInput`, `UNATTRIBUTED`);
  - `agent-memory-explorer-service.ts:94-136, 224, 249` (the filter matches the run-history row's `summary`, held in memory);
  - `claude-session-manager.ts:156-157` (ACP and Antigravity resolve working directories through `ClaudeWorkspaceResolver`);
  - `agent-run-provisioning-service.ts:251-252` (provisioning works by root path, not workspace id).
- Round 5 trigger: SR-009 after CRR-003 CR-002 (Design Impact from API/E2E RA-04, IC-01, RE-05). Application-bundled team-local ids encode to 439 bytes, so `mkdir` throws `ENAMETOOLONG` (`evidence/API-10d-re05-launch-error.log`).
- Round 5 evidence, read on the branch at `daba240ec1`:
  - `agent-memory/store/agent-memory-layout.ts:35-36, 82, 97` (`definitionFolderName` is the only id-to-folder-name rule; it serves the semantic and episodic folders);
  - `workspaces/semantic-memory-workspace.ts:8, 53` (the workspace id decodes to the id, then `folderOf`);
  - `agent-episodic-catalog/store/episodic-catalog-store.ts:31, 64` (catalog folders are read back by a decode and re-encode round trip; a shortened name fails it and is skipped);
  - a grep for `encodeURIComponent`/`decodeURIComponent` in `src` (no other definition-id path segment).
- Latest Authoritative Round: 5
- Current-State Evidence Basis: base `8430d9ef12`, read through `git show HEAD:` because the worktree holds the paused, uncommitted work. Files read:
  - `workspaces/workspace-manager.ts:34, 95-175, 295-300`; `workspaces/skill-workspace.ts`; `api/graphql/types/workspace.ts:78-88`; web `stores/workspace.ts:377-409`.
  - `api/rest/upload-file.ts:87-120`; `api/rest/workspaces.ts:13-30`; every caller of `getOrCreateWorkspace` and `getWorkspaceById`.
  - `file-explorer/file-explorer.ts:149-151, 181, 210-211, 351, 380`; `file-explorer/watcher/runtime/chokidar-watcher-runtime.ts:36-47`; `search-strategy/ripgrep-search-strategy.ts:85`.
  - `agent-memory/services/memory-explorer-source-service.ts`; `run-history/services/root-run-package-readiness-index.ts:7-75`.
  - 493's measured build time (`tickets/done/per-agent-episodic-catalog/api-e2e-execution-coverage-report.md:41`, `code-review-report.md:75`).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`. The scope now also covers the shared file explorer (a read-only, link-aware option), new owner queries over run discovery, and a node-wide folder every agent writes.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` (SR-008 fixes AC-008, DEC-004/010/011; adds AC-011 and AC-012).
- Approved requirements / intended behavior understood:
  - REQ-001…004 and REQ-009 as in SR-002.
  - REQ-005/007: a read-only Skills-style folder view, enforced by the node; links listed, never entered or opened; never creates the folder.
  - REQ-006: owner navigation (Global · Agents · Agent Teams · Agent Orgs, agent pages with Episodic and Semantic tabs, team and org pages).
  - REQ-010…012: one node-wide `semantic-global/` folder, a prompt section with the DEC-013 text, Claude/Codex access, and a Global tab.
  - The UI/UX spec is normative, including its five engineering points (the spec's Problem And Design Rationale, item 4) and TR-015 ("never listed in Workspaces or a picker").
- Relevant existing behavior and evidence confirmed:
  - **SR-002 parts still standing:** the gate, the field removal, tolerant readers, the internal-agent rule and links not opened. ARCH-REV-002's verdicts on them stand.
  - **Imported sources:** `RunFolderDiscovery` over an imported source's folder is feasible. The readiness index rebuilds lazily for any memory folder (`root-run-package-readiness-index.ts:32-33`), as INV-12 states.
  - **Skill workspaces:** created on demand and kept in `activeWorkspaces` (`workspace-manager.ts:120-127`).
- Statements about existing code the design relies on, checked; two are inaccurate:
  - "never registered in the workspace registry, so it is never listed" (SR-004 §1). `listVisibleWorkspaces()` returns transient active workspaces too (`workspace-manager.ts:167-175`), and the `workspaces` query serves it (`workspace.ts:82`). See AR-004.
  - "`POST /upload-file` … check the workspace" (SR-004 §2). The route takes no workspace id and writes only into media storage (`upload-file.ts:87-120`). See AR-005.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass (DS-001; SR-009: names that fit (DEC-016); per-folder contained preparation (DEC-015), REQ-001 and REQ-010 reworded, AC-013 and AC-014) | Confirmed | — |
| BEH-002, BEH-003 | User / Data | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass (DS-002, DS-003) | Confirmed | — |
| BEH-005 | System / User | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| UI/UX spec (Approved) | Pass | Pass | Pass | Pass (the design states it governs production where the spec's data column names `semanticMemoryFolders`; N-6) | Pass | — |
| `global-semantic-memory-investigation.md` | Pass | Pass | Pass | Pass ("options … nothing decided"; DEC-012…014 decide) | Pass | — |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present | Pass | SR-008 assessment: reuse of the Skills workspace, the explorer and the catalog; several kinds (every workspace-id caller); one Principle 16 trigger recorded with its conditions | — |
| Root cause / refactor decision | Pass | `No Design Issue Found`: each extension lands in its owner (option-driven explorer, `WorkspaceManager` decides runnability) | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | run start → sections and folders (agent and global) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | owner browse: cards, episodes (catalog local / discovery imported), members, folder state | Pass | Pass | Pass (the resolver is thin; `AgentMemoryExplorerService` governs) | Pass | Pass | Pass | Pass |
| DS-003 | read-only workspace: open → tree → file → refusals → leave | Pass | Pass | Pass (`WorkspaceManager` + `SemanticMemoryWorkspace`; the explorer reads properties) | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentSemanticMemory` (agent and global paths) | Pass | Pass | Pass | Pass | — |
| `SemanticMemoryWorkspace` / `WorkspaceManager` | Pass | Pass | Pass | Pass | Excluded from `listVisibleWorkspaces`; `getOrCreateRunWorkspace` refuses read-only workspaces (`WORKSPACE_NOT_RUNNABLE`), and every runtime's resolver uses it (ACP and Antigravity through the Claude resolver, N-10) |
| File explorer, read-only and link-aware option | Pass | Pass | Pass | Pass | Watcher `followSymlinks: false`; `rg --files` default; the fallback honors the option; a per-caller table |
| `AgentMemoryExplorerService` (owner queries) | Pass | Pass | Pass | Pass | — |
| `AgentSemanticMemory.folderState` / `globalFolderState` | Pass | Pass | Pass | Pass | `AgentSemanticMemoryBrowser` is dropped |
| `EpisodicCatalog` read API | Pass | Pass | Pass | Pass | `agentDefinitionIds`, `runsOf`, `whenStartPassDone`: reads of existing entries |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Memory explorer → `RunFolderDiscovery`, definitions, internal-agent rule | Pass | Pass | Pass | Pass | Existing direction |
| `WorkspaceManager` → `AgentSemanticMemory` (root path); `agent-memory` → `agent-episodic-catalog` (read API) | Pass | Pass | Pass | Pass | — |

Principle 16: `Pass — deviation recorded, reason holds`. `getProcessEpisodicCatalog()` follows the composition root's `setProcess…` pattern; it is set beside the catalog's creation (`build-studio-server.ts:256`) before GraphQL serves; a missing binding throws `EPISODIC_CATALOG_NOT_COMPOSED`; no cycle. The standalone host sets it the same way.

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `listAgentEpisodes(selector: AgentWithMemorySelectorInput!, source, search, page, pageSize)` | Pass | Pass | Pass (the existing selector: `DEFINITION` + id, or `UNATTRIBUTED`, `memory-explorer-schema.ts:5, 90`) | Low | Pass |
| `listMemoryGroupMembers(source, kind: TEAM\|ORG, definitionId)` | Pass | Pass | Pass (explicit kind) | Low | Pass |
| `agentSemanticMemoryFolder(agentDefinitionId)`, `globalSemanticMemoryFolder` | Pass | Pass | Pass | Low | Pass |
| `SemanticMemoryWorkspace` ids `semantic_ws_<encoded id>`, `semantic_global_ws` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Folder view | Pass (Skills page) | Pass (the founder's choice, DEC-010) | Pass | Pass with AR-004/005 | — |
| One agent's runs from every place | Pass | Pass (catalog for local, no walk per request; one discovery per request for imported, measured by AC-012 with an escalation over 3 s) | Pass | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `workspaces/`, `file-explorer/` (shared) | Pass | Pass | Pass | Pass with AR-004/005 | — |
| `agent-memory` (explorer, semantic), `agent-episodic-catalog` (read API) | Pass | Pass | Pass | Pass | — |
| web `components/memory`, `fileExplorer` read-only mode | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Read-only and link options on the workspace | Pass | Pass | Pass | Pass | Defaults keep today's behavior |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TreeNode.isSymbolicLink: boolean` (default `false`) | Pass | Pass | Pass | N/A | Pass | — |
| `AgentEpisode`, `MemoryGroupMember` | Pass | Pass | Pass | N/A | Pass | `place` null for the agent's own standalone run; `memberCount` only for `TEAM` |
| GraphQL workspace `kind` + `"semantic_memory"` | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers of a changed structure (Principle 11): `Pass` (the `WorkspaceKind` consumers in the DS-003 table; `TreeNode` defaults; `listAgentRunsWithMemory`'s callers).

One vocabulary (Principle 15): `Pass` (glossary entries for the agent's and the global semantic memory).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Final File Responsibility Mapping (SR-008) | Pass | Pass | N/A | Pass | Matches the spines and the spec's component table |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `workspaces/semantic-memory-workspace.ts` | Pass | Pass | Low | Pass | Beside `skill-workspace.ts` |
| Web memory components | Pass | Pass | Low | Pass | Per the spec's component table |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SR-002 field removal | Pass | Pass | Pass | Pass | — |
| `AgentSemanticMemoryBrowser`, `semanticMemoryFolders`, `semanticMemoryFiles`, `MemoryHome.vue` card grids, `AgentMemoryDetail.vue` | Pass | Pass | Pass | Pass | — |
| `listAgentRunsWithMemory` | Pass | Pass (`listAgentEpisodes`) | Pass | Pass | Callers: the web store and the doc |
| `wip-uncommitted.patch` parts superseded | Pass | Pass | Pass | Pass | Change Sequence step 1 |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| GraphQL removals (fields, enum, the queries replaced in SR-007) | No | Pass | Pass | Rule 9 |
| File explorer default behavior | No (the option defaults to today's behavior) | Pass | Pass | — |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `agent-config.json`, `personal-settings.json` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | ARCH-REV-002 stands |
| `semantic/`, `semantic-global/` | Not Affected (created when missing at run start) | Pass | Pass | N/A | Pass | — |
| Workspace registry | Not Affected | Pass | Pass | N/A | Pass | Never registered, never listed |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Change sequence (SR-008: 7 steps) | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Memory page | Yes | Pass (the UI spec and VIS-001…019) | Pass | Pass | — |
| Server contract | Yes | Pass (`listAgentEpisodes`, folder state, `folderChildren` with a link, `writeFileContent` → `WORKSPACE_READ_ONLY`) | N/A | Pass | — |

## Material Premise Validation

### MP-003 — An opened semantic workspace appears in the Workspaces list and pickers

- Related contract: the UI/UX spec (normative): the five engineering points ("it is never listed as a workspace") and TR-015 ("never listed in Workspaces or a picker"); REQ-005, REQ-007.
- Initiating basis kind: `User`. The owner opens an agent's Semantic tab or the Global tab (TR-003), and the web asks the node through the file explorer.
- Forward path:
  1. `getOrCreateWorkspace("semantic_ws_<id>")` creates the workspace beside the `skill_ws_` branch and keeps it in `activeWorkspaces` (`workspace-manager.ts:120-127` pattern);
  2. the `workspaces` query (`workspace.ts:79-83`) returns `listVisibleWorkspaces()`, which includes every unregistered active workspace (`workspace-manager.ts:167-175`);
  3. web unregistration (`stores/workspace.ts:405-411` pattern) removes only the web's copy, and nothing releases the server's.
- Reachability: `Reachable`. Consequence: AR-004, resolved in SR-008 (excluded from listing; `getOrCreateRunWorkspace`).

### MP-004 — A linked folder's content enters the tree through the live watcher

- Related requirement: REQ-007, AC-006 ("a linked folder is not entered").
- Initiating basis kind: `System`, while the view is open. MP-001 of ARCH-REV-001 established that agents create links in their folders.
- Forward path:
  1. the open explorer starts its watcher (`file-explorer.ts:380`);
  2. `chokidar.watch(root, {…})` sets no `followSymlinks` option, so chokidar's default follows links (`chokidar-watcher-runtime.ts:40-47`);
  3. a change inside the link's target emits an event under `<root>/<link>/…`, which the explorer stream turns into tree nodes.
- Reachability: `Reachable` when an agent works in the linked target while the view is open. Consequence: AR-005, resolved in SR-008 (watcher `followSymlinks: false`; AC-011).

### MP-005 — The Agents cards and an agent's Episodic tab run a whole-node discovery for each request

- Related: REQ-006; DESIGN.md rule 3 ("Justify critical-path dependencies and global work").
- Initiating basis kind: `User`, opening Memory (it opens on Agents), an agent page, or changing the episodic filter or page.
- Forward path: `listAgentsWithMemory` and `listAgentEpisodes` are built from `RunFolderDiscovery` (SR-007 table), whose `findRuns()` walks the three families and reads every team and org tree and every agent run's metadata.
- Evidence of scale: about 4,000 run folders on the founder's node. 493's full build over them (discovery plus manifests plus headers plus titles) measured 3.4–12.5 s (`per-agent-episodic-catalog` API-02, CF-15). Discovery's share is unmeasured.
- Reachability: `Reachable`. Consequence: AR-006, resolved in SR-008: local from the catalog's entries; imported, one discovery per request, measured (AC-012).

### MP-006 — An episodic catalog folder with a shortened name keeps stale entries (the design's accepted edge)

- Related: 493's REQ-010 (agents whose runs are all gone get "0 runs"); DEC-016.
- Initiating basis: a supported delete through the app is live. `runDeleted` drops the root's entries from the in-memory map, which keeps the definition, and rewrites the catalog to "0 runs". The stale case needs a bundled agent's run folders to disappear while the node is stopped, so that the next start's discovery names no such definition and the round-trip listing skips the shortened folder (`episodic-catalog-store.ts:31`).
- Reachability: `Not Reachable` through a supported action (removing run folders by hand is outside scope, Principle 6). Consequence: the recorded acceptance holds; no finding.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| AC-008, DEC-004, DEC-010, DEC-011 | Were stale | Fixed in SR-008 | Resolved |

## Review Decision

`Pass`. The behavior basis is confirmed, and the consolidated design is ready for implementation.

## Findings

None open. AR-003…AR-006 are resolved (ARCH-REV-004). SR-009 (CRR-003 CR-002) raises no new finding.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/implementation_engineer`); informational notice to the Solution Designer.

## Residual Risks

- **N-5.** The global folder is written by every agent concurrently, with no coordination. This is accepted (DEC-014: "just like other semantic memory"); agents' tools write whole files.
- **N-6.** The UI/UX spec's data column names `semanticMemoryFolders` with `exists`. Once AR-003 lands, the design is the production authority; the spec need not change.
- **N-7.** The readiness index for an imported source is built once per process (`root-run-package-readiness-index.ts:32-33`), so a newly imported team run may not show until restart. This is existing behavior, shared by today's team explorer, and outside this ticket.
- **N-8 (round 4).** The episode filter matches the run-history row's `summary` text, which is in memory (`agent-memory-explorer-service.ts:224, 249`), plus the Task title and run id. The memory-availability build (`MemoryRunSummaryBuilder`) is per page only. The narrative's "summaries come only for the page" means the latter.
- **N-9 (round 4). Local Agents cards during the catalog's start pass.** Await `whenStartPassDone()` as the episodes do (the spec's loading state), so the cards' "latest change" is never partial after a restart.
- **N-10 (round 4). Every runtime's working directory.** ACP (Grok, DeepSeek) and Antigravity resolve it through `resolveWorkingDirectory`, which `ClaudeSessionManager` implements with `ClaudeWorkspaceResolver` (`claude-session-manager.ts:156-157`). Confirm the dependency each runtime factory receives, and cover every runtime in AC-011's run refusal.
- **N-11 (round 4).** Run provisioning works by root path (`agent-run-provisioning-service.ts:251-252`). A user who picks a semantic folder's path as a run's workspace gets an ordinary filesystem workspace there, by explicit choice. That is outside the view's read-only rule (REQ-007), and needs no change.
- **N-12 (round 5). `#` in shortened folder names is a URL fragment character.** Every place that puts a folder path or a path inside it into a URL must encode it, as it already must for `%`. Places include the node-file loader's `?path=`, the workspace content route and links rendered from paths. AC-013's API/E2E should open a file inside a shortened folder through the Semantic tab, not only check that the folder is found.
- **N-13 (round 5).** The "never cut inside a `%XX`" rule is what keeps `decodeURIComponent` at `episodic-catalog-store.ts:64` from throwing on a shortened name. Pin it with a unit case whose 120-byte cut falls on each position of a `%XX`.
- **N-14 (round 5).** The nullable `{ agentFolder, globalFolder }` has one meaning ("could not be prepared, logged"), per DEC-015. It is not a switch: no caller may treat null as "this agent has no semantic memory".

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-005, SR-009)
- Material-Premise Gate: `Pass` (MP-006 Not Reachable; the recorded edge needs no machinery)
- Notes: DEC-016 gives one length-safe name rule with a single owner, shared by the semantic folder, the catalog folder and the workspace lookup. Ids that fit keep their names, so no migration is needed. DEC-015 contains preparation failures per folder, as the reworded REQ-001 and REQ-010 approve. The rest of ARCH-REV-004 stands.
