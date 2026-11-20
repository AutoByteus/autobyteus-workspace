# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-008, Approved; the UI approved by the founder 2026-11-20)
- Investigation Notes Reviewed As Context: `investigation-notes.md`, `global-semantic-memory-investigation.md` (through the design's citations)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001…SR-008)
- Design Spec Reviewed As Context: `design-spec.md` (SR-008, consolidated)
- Supplemental Task Artifacts Reviewed As Context:
  - the Product UI/UX spec (normative; VIS-001…VIS-019), through the handoff's rendered-result check and the components;
  - `follow-ups.md` (FU-001, FU-002).
- Relevant Solution Revision IDs: SR-008
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-004 `Pass`; N-5…N-11)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002 (N-4), ARCH-REV-004
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Trigger: implementation ready for source review (Large / High route)
- Code reviewed:
  - worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/semantic-memory-for-every-agent`, branch `codex/semantic-memory-for-every-agent`, base `8430d9ef12`;
  - code commits `56b02294d0`, `a9ca3c48c6`, `cff2a6596a`; `ecbb4741ca` holds the ticket records and evidence only.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none. The change spans every runtime's prompt and access, a new read-only workspace kind refused on every run path, a shared file-explorer option, a GraphQL clean cut, a process binding, and a rebuilt Memory page: 168 files.

## Review Scope

- Changed implementation and behavior reviewed: the whole source diff `8430d9ef12..cff2a6596a`, with depth by risk.
  - **Server, read in full:**
    - workspaces: `semantic-memory-workspace.ts`, `workspace-access-error.ts`, `workspace-path-utils.ts`, `workspace-manager.ts`, `filesystem-workspace.ts`;
    - file explorer: `file-explorer.ts`, `directory-traversal.ts`, `tree-node.ts`, the watcher runtime and protocol, GraphQL `file-explorer.ts`, REST `workspaces.ts`;
    - semantic memory: `agent-semantic-memory.ts`, the layout, the prompt composer and sections;
    - the five runtime owners and the Claude/Codex resolvers;
    - `episodic-catalog.ts` (read API and binding) and both composition roots;
    - owner queries: `agent-memory-explorer-service.ts`, `agent-episodes.ts`, `team-memory-explorer-service.ts`, `collaboration-root-memory-catalog.ts`, `team-root-memory-source.ts`;
    - GraphQL `memory-explorer.ts` and `semantic-memory-view.ts`.
  - **Web, read where they carry REQ-007 or lifecycle:** `SemanticMemoryFolder.vue`, `stores/workspace.ts` (register/unregister), `AgentMemoryPage.vue`, `MemoryBrowse.vue` (owner switch). Readers of the web store's workspace list: `ChatWorkspaceMenu.vue`, `ApplicationWorkspaceRootSelector.vue`, `runHistoryReadModel.ts`, mobile `useMobileLaunchWorkspaces.ts`.
- Existing code read to judge the change:
  - every caller that resolves a workspace id (repository grep);
  - `agent-run-provisioning-service.ts:225-320` (runs provision by root path; the input `workspaceId` is not used to choose the workspace);
  - `agent-provider-factory-builder.ts:223-240` (ACP Grok and DeepSeek, and Antigravity, get `ClaudeWorkspaceResolver`);
  - `file-explorer-stream-handler.ts` (PING only, no write commands);
  - the search strategies (`rg --files` without follow; the fuzzysort snapshot comes from the explorer's own tree);
  - `skillStore.ts` / `SkillWorkspaceLoader.vue` (the existing transient pattern).
- Explicit exclusions:
  - pixel conformance to VIS-001…019 (the rendered probe and its screenshots are the evidence; API/E2E owns the rendered checks);
  - a line-by-line read of every localization and generated file;
  - recorded checks were not rerun (no code changed after `cff2a6596a`).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: every agent and run kind gets its folder and the global folder with both sections, and Claude and Codex get access. The switch is removed as a clean cut, and stored keys are dropped at the next write. The Memory page is organized by owner. Folders are shown read-only: the node refuses writes, links and runs; the workspace is never listed or offered as a workspace and never creates the folder. Imported sources show a note.
- Design-spec behavior map verified against the implementation: yes, with the exception in CR-001 (the web keeps a folder workspace registered past its view in one supported sequence).
- Design review report and round confirmed: ARCH-REV-004 `Pass`.
  - N-8: the filter matches the in-memory summary, and availability is built per page (`agent-episodes.ts` `pageEpisodes`).
  - N-9: cards await `whenStartPassDone()`.
  - N-10: every runtime resolves through `getOrCreateRunWorkspace`.
  - N-11: confirmed. Provisioning ignores the input `workspaceId`.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none
- Remaining material ambiguity: none

| Behavior | Status | Implementation path and evidence |
| --- | --- | --- |
| BEH-001 / BEH-005 (REQ-001, REQ-010, REQ-011) | Confirmed | `AgentSemanticMemory.prepareForRun(config.agentDefinitionId)` creates both folders. Every runtime passes both paths to the composer. The two sections are added unconditionally, and the DEC-013 text is exact (`carpenter-prompt-sections.ts`). Claude gets `additionalDirectories: [agent, global]`; Codex gets `writableRoots: [agent, global]`. |
| BEH-002 / BEH-003 (REQ-002…004) | Confirmed | The field is removed everywhere; IMP-12's grep shows only the retired-key drop list. `semanticMemoryPath: String!`. |
| BEH-004 server (REQ-005, REQ-007, AC-006, AC-011) | Confirmed | **Opening:** `SemanticMemoryWorkspace.open` uses `lstat`; a root that is missing or is a link is refused, and nothing is created. **Writes:** `resolveWritableWorkspace` → `assertWritable` before any file operation, for all five mutations. **Links:** `refuseLinkOnPath` in `fileContent` and `folderChildren`; the REST content and static routes use `resolveReadablePath`, answering 403 with the code. **Traversal and watcher:** the traversal and folder projection classify by `lstat`, links are leaves, and non-regular entries are skipped (N-4); the watcher uses `followSymlinks: false`, validated in the protocol. **Never listed:** `listVisibleWorkspaces` excludes `semantic_memory`. **Never run:** `getOrCreateRunWorkspace` refuses both before and after creation, on every runtime path and in published artifacts. |
| BEH-004 owners (REQ-006, AC-008, AC-012) | Confirmed | The catalog read API and binding (`EPISODIC_CATALOG_NOT_COMPOSED` when missing). Local cards and episodes come from the catalog after its start pass; an imported source gets one discovery per request; internal agents are hidden. Team and org members come from the definition, else from the newest stored run. Imported team cards at 0 use the unchanged `TeamRootMemorySource` listing, so this change did not cause it (Known Risks; API/E2E compares with base). |
| BEH-004 web lifecycle (REQ-007 "never appears in any workspace list or picker") | **Contradicted in one sequence** | See CR-001 |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario | Related | Kind | Actor | Goal / Event | Entry | Shape | Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-RUN | BEH-001/005 | System | Run start | Every run gets both folders | Any runtime, any run kind | Normal | DS-001 | Sections and access | REQ-001/010/011; IMP-04/06 | Supported Normal Scenario | Use |
| SCN-VIEW | BEH-004 | User | Founder on the Memory page | Read an agent's or the global folder | Agent page → Semantic; Browse → Global | Normal | DS-003 | Read-only tree, preview, links shown but not opened | REQ-005/007/012; IMP-13 | Supported Normal Scenario | Use |
| SCN-LEAVE | BEH-004 | User | Founder on the Memory page | Leave a Semantic tab or Global while its folder is still loading (the "Loading folder…" state the view shows) | Episodic tab, Back, or another page | Normal (leaving a loading view is an ordinary action; the state is designed and visible) | `SemanticMemoryFolder` watcher: register, then `await fetchFolderChildren`; meanwhile the unmount runs `release()` | The registration must not outlive the view (REQ-007) | Code below | Supported Normal Scenario | Use |
| SCN-OWNERS | BEH-004 | User | Founder | Browse by owner, local and imported | Memory → Browse | Normal | DS-002 | Cards, episodes, members | REQ-006; IMP-09, IMP-13 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate | Observation | Scenario / Contract | Evidence | Disposition | Scope | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- |
| CF-01 | `SemanticMemoryFolder.vue`: the watcher registers the workspace, then awaits `fetchFolderChildren`, and sets `workspaceId` only after the await. `release()` (run on unmount and on a re-run of the watcher) unregisters only `workspaceId.value`. If the view unmounts while the first listing is pending, the registration is never released, and the late completion sets `workspaceId` on a dead instance. | SCN-LEAVE; REQ-007 | `SemanticMemoryFolder.vue:69-98`. The leaked entry is `{ kind: 'semantic_memory', isTemp: false, workspaceConfig: { isTransient, readOnly }, name: <agent name> }`. `ChatWorkspaceMenu.vue:265-268` lists every `allWorkspaces` entry that is not temp, so the chat's and Run Settings' workspace menu offers a "workspace" named after the agent until reload, or until that folder is opened and left again. The node still refuses it as a run's workspace, so the harm is the listing, which REQ-007 forbids. | **Promote** | This ticket (new component; REQ-007) | `Local Fix` (implementation): no registration may outlive the folder view. Keep the registered id from the moment of registration so `release()` unregisters it even while pending, and drop a completion that is no longer current (a generation token, or a check that the instance and folder are still the ones that started it). Add a spec: unmount while `fetchFolderChildren` is pending, then assert the workspace is unregistered and the store holds no `semantic_memory` entry. |
| CF-02 | `ChatWorkspaceMenu` (and mobile `useMobileLaunchWorkspaces`) list every non-temp web-store workspace, transient skill workspaces included; `SkillWorkspaceLoader` has the same register-then-await pattern | Existing behavior | `ChatWorkspaceMenu.vue:265` is the same at base `8430d9ef12`; `SkillWorkspaceLoader.vue:35-48`; the run-history sidebar filters to filesystem and temp (`runHistoryReadModel.ts:129-135`) | Promote as **Follow-up** (FU-003) | Follow-up | Pre-existing for skills. With CR-001 fixed, a semantic workspace is registered only while its view is mounted, and the chat menu is never on the same screen (no keep-alive). Filtering pickers to filesystem and temp, as the sidebar does, would harden both. |
| CF-03 | `SemanticMemoryFolder` reused with new props while a fetch is pending could show the previous agent's folder | SCN-VIEW | `AgentMemoryPage` unmounts the folder when the pane leaves Semantic; moving to another agent always passes through its Episodic pane (`selectNode` sets no pane) | Reject (not reachable through the product's navigation) | — | — |
| CF-04 | Run provisioning resolves a `workspaceId` with `getWorkspaceById`, not the run guard | AC-011 | `agent-run-provisioning-service.ts:240-265`: `workspaceRootPath` is required, the workspace is `ensureWorkspaceByRootPath(root)`, and the input `workspaceId` is never used to choose it | Reject (not reachable) | — | Matches N-11 |
| CF-05 | Content route: a check-then-read gap (a link swapped in between `assertNoSymbolicLinkOnPath` and `createReadStream`) | REQ-007 | Needs an agent to replace a regular file with a link inside the window of one request | Reject (artificial timing) | — | — |
| CF-06 | A link created while the view is open arrives as a file row (Known Risks) | REQ-007 | Opening it is refused by the node; nothing outside is read | Reject (no consequence; documented) | — | — |
| CF-07 | Episodic-catalog process binding (`setProcessEpisodicCatalog` / `getProcessEpisodicCatalog`) | Principle 16; design Hidden dependency | Set right after creation, before GraphQL is registered; a missing one throws `EPISODIC_CATALOG_NOT_COMPOSED`; released at close in both roots, guarded to the same instance; no cycle; `stop()` settles `whenStartPassDone` so no reader hangs at close | Reject (`Pass — deviation recorded, reason holds`) | — | The design's three conditions hold |
| CF-08 | `agent-package-folder-watcher` failures in the full unit run | AC-011-like | Different cases fail each run; the file and its import closure are untouched by this change | Reject as this ticket's; same family as FU-003 of autobyteus-493 | — | Rerun on a quiet host (API/E2E) |
| CF-09 | Imported team and org cards measured at 0 | REQ-006 | The listing path for imported sources is unchanged (`TeamRootMemorySource`); the stderr shows older-layout packages not admitted (N-7 territory) | Reject as a finding; residual | — | API/E2E compares with base |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | One gate owner; one workspace manager decides read-only, listing and runnability; the explorer reads workspace properties only | — |
| Matches behavior-defining supplemental artifacts | Pass | Rendered probe 33/33 against the approved reference (IMP-13); the link-row order was fixed (`cff2a6596a`) | — |
| Data-flow spine clarity | Pass | DS-001…DS-003 traceable in code | — |
| Ownership boundary preservation | Pass | Only `AgentSemanticMemory` composes the paths; only `WorkspaceManager` creates workspaces and decides runnability | — |
| Off-spine concern clarity | Pass | `agent-episodes.ts`, `memory-group-members.ts`, `workspace-access-error.ts`: owner-local splits | — |
| Existing capability reuse | Pass | The Skills transient-workspace pattern, the file explorer and its tabs, the catalog, discovery | — |
| Reusable owned structures | Pass | `memory-run-subject.ts` shared by search and episodes | — |
| Shared-structure tightness | Pass | `AgentEpisode`, `MemoryGroupMember` as designed | — |
| Repeated coordination ownership | Pass | — | — |
| Empty indirection check (Core Principle 13) | Pass | No pass-through layer; `resolveWritableWorkspace` and `getOrCreateRunWorkspace` each carry a rule | — |
| Separation of concerns and file responsibility | Pass | — | — |
| Ownership-driven dependency check | Pass | Directions as designed | — |
| Visible dependencies (Core Principle 16) | Pass — deviation recorded, reason holds | CF-07; the new explorer collaborators are constructor defaults | — |
| Authoritative Boundary Rule | Pass | Runtimes resolve through `getOrCreateRunWorkspace`; the resolver never calls discovery directly | — |
| File placement | Pass | — | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface boundary clarity | Pass | Explicit selectors and kinds (`MemoryGroupKind`, attribution selector) | — |
| Naming and one vocabulary (Core Principle 15) | Pass | "Global semantic memory", "episodes", "owner" are in the glossary | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity | Pass | — | — |
| Dead code removed in touched files (Core Principle 7) | Pass | `listAgentRunsWithMemory`, `AgentMemoryDetail.vue`, `AgentSemanticMemoryField.vue`, `unregisterSkillWorkspace` (renamed), the field everywhere | — |
| Test scenarios requirement-aligned | Pass | Per-runtime units (no field, `false`, `true`); every mutation byte-identical; the content route returns 403; a chokidar negative control; the binding; the AC-012 measurement | — |
| Test fixtures and structure | Pass | Unit tests now inject a test-owned `AgentSemanticMemory`; the stray folders were deleted | — |
| No stale or compatibility-only tests | Pass | — | — |
| API/E2E readiness | **Fail** | CR-001 must be fixed first: REQ-007's "never appears in any workspace list or picker" fails after leaving a loading folder view | Local Fix |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` Check | `>220` Delta | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-agent-run-backend-factory.ts` | 496 | 499 | Pass (under; a nearby `throw` compacted) | Pass | — |
| `build-studio-server.ts` | 434 | 439 | Pass | Pass | — |
| `file-explorer.ts` | 403 | 428 | Pass | Pass | — |
| `start-standalone-application-host.ts` | 404 | 410 | Pass | Pass | — |
| `agent-memory-explorer-service.ts` | — | rewritten, under 400 | Pass | Pass (rewrite with owner-local splits) | — |
| web `AgentDefinitionForm.vue` / `FileItem.vue` / `memoryExplorerStore.ts` / `workspace.ts` / `MemoryBrowse.vue` | 495 / 397 / 378 / 438 / 0 | 487 / 427 / 407 / 457 / 186 | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | No deprecated GraphQL field or alias query; an old `view=` address opens Browse |
| No legacy retention | Pass | — |
| Dead code removed | Pass | — |
| Persisted-data decision followed | Pass | `Directly Usable — No Migration`; the key is dropped at the next write; nothing rewritten |
| No version-specific dual reads | Pass | — |
| Transition mechanics | N/A | No migration |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, updated in the change: server module docs, web `memory.md`, `agent_management.md`, `GLOSSARY.md`. The fix for CR-001 needs no doc change.

## Additional Material Premise Validation

None new beyond the gate above. N-5…N-11 are confirmed as recorded.

## Review Scorecard (Mandatory)

- Overall score: `9.3/10` (simple average for trend only)

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Three spines, each traceable | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One owner each for paths, workspaces and runnability | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Explicit selectors, kinds and codes | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | Owner-local splits | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | — | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | — | — | — |
| 7 | API/E2E Readiness | 8.8 | Strong node-side refusals and tests | CR-001: REQ-007's listing rule fails in one supported web sequence, and no spec covers unmount during load | Fix CR-001 with its spec |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.9 | Node enforcement is complete across write, link, run and list | CR-001 (the web lifecycle) | Fix CR-001 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | A clean cut | — | — |
| 10 | Cleanup Completeness | 9.4 | — | — | — |

## Findings

### CR-001 — The folder view's workspace can outlive the view and appear in the workspace menu (REQ-007)

- **Basis:** REQ-007, "The folder view's workspace never appears in any workspace list or picker". Scenario SCN-LEAVE (Supported Normal); candidate CF-01.
- **Evidence:** `autobyteus-web/components/memory/SemanticMemoryFolder.vue`.
  1. The second watcher calls `release()`, then `registerSemanticMemoryWorkspace(...)` (returns `id`), then `await fetchFolderChildren(id, '')`, then `workspaceId.value = id`.
  2. `release()` and `onBeforeUnmount(release)` unregister only `workspaceId.value`, which is still `null` during the await.
  3. So the registration leaks when the view unmounts while the first listing is pending: the user leaves during the visible "Loading folder…" state, by Episodic, Back or another page.
- **Consequence:** the leaked entry (`kind: 'semantic_memory'`, `isTemp: false`, named after the agent) remains in `workspaceStore.workspaces`. `ChatWorkspaceMenu.vue:265-268` lists every non-temp entry, so the chat and Run Settings workspace menu offers it until reload, or until that folder is opened and left again. The node still refuses it as a run's workspace, so nothing is written. The listing is what REQ-007 forbids.
- **Required action (`Local Fix`, implementation):**
  - Make the registration's lifetime the view's: remember the id when it is registered, so `release()` unregisters it while the listing is pending.
  - Ignore a listing that completes after the view or folder has changed (a generation token or equivalent).
  - Add a component spec: unmount during a pending `fetchFolderChildren`, then assert the workspace is unregistered and the store holds no `semantic_memory` entry.
- **Ticket scope:** this ticket. The component is new, and REQ-007 is in scope. The broader exposure of transient skill workspaces in the same menus predates this change and is FU-003.

## Follow-ups

- Follow-ups this review added: FU-003. `ChatWorkspaceMenu` (and the mobile launch picker) list every non-temp web-store workspace, transient ones included; `SkillWorkspaceLoader` has the same register-then-await pattern. Pre-existing for skill workspaces.

## Classification

- `Local Fix`, owned by `implementation_engineer` (CR-001).

## Recommended Recipient

`/implementation_engineer`. After the fix: source review (targeted delta), then API/E2E.

## Residual Risks

- Imported team and org cards measured at 0 on the founder's import, through the unchanged path (older-layout packages not admitted). API/E2E compares with base.
- The live SML-GLOBAL run, `test:integration` and the full E2E suite are still to run; the folder-watcher timing failures need a quieter host.
- Catalog latency after a restart (N-9; the spec's loading state).
- A link created while the view is open shows as a file row until the folder is reloaded, and the node refuses opening it (documented).

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: average 9.3; API/E2E Readiness 8.8 and Runtime Correctness 8.9 (CR-001); every other category ≥ 9.4
- Failure Origin: N/A
- Recommended Recipient: implementation engineer (`Local Fix`)
- Notes:
  - Node-side enforcement (write, link, run, list refusals) is complete and verified on every runtime path.
  - The four points the handoff raised:
    1. Workspace refusals: pass.
    2. The process binding: pass (CF-07).
    3. The watcher flake: not this ticket's.
    4. Imported team cards: not this ticket's; a residual for API/E2E.
