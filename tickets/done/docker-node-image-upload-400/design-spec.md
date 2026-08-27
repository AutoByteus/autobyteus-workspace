# Design Spec

## Current-State Read

The supported Team message path is coordinated by `autobyteus-web/stores/agentTeamRunStore.ts::sendMessageToFocusedMember`. It reads the focused `AgentRun` and member address from `TeamExecutionViewState`, admits a local user submission, finalizes any staged context files through `contextFileUploadStore`, and then dispatches the message over the root Team WebSocket.

The canonical `TeamRunExecutionTreeDto` already contains the exact containing `team_run_id` for configured Teams, task Teams, and nested task-Team members. `teamExecutionTreeSelectors.ts::collectExecutionAgents` currently projects only `agentRunId`, `address`, and an unused `configured` flag. `TeamExecutionViewState` therefore retains an address map but exposes no singular execution-location query containing both member address and containing TeamRun identity. The send store substitutes `getRootTeamRunId()` when building `team_member_final`, although the server contract interprets `teamRunId` as the exact containing TeamRun ID.

The backend boundary is healthy: `ContextFileOwnerResolver` passes exact containing TeamRun ID plus rooted member address to `TeamRunExecutionTreeLocationService`, which intentionally rejects mismatched compound identities. Existing server integration coverage proves both the nested positive case and root-plus-nested negative case. Docker upload/storage is also healthy; real UI attempts staged three PNGs before finalization failed. See BEH-001 through BEH-004 and `investigation-notes.md` for the complete evidence trail.

Constraints for the target design:

- preserve root TeamRun identity for stream/navigation/dedupe responsibilities;
- use containing TeamRun identity only where the final Team-member context-file contract requires it;
- derive both identities from the current canonical execution view rather than traversing the tree in the send store;
- cover configured, task-Agent, task-Team, and nested task-Team Agent executions;
- keep backend exact matching, storage layout, and persisted state unchanged.

## Intended Change

Strengthen the authoritative Team execution view so it exposes one canonical `AgentRun` execution location containing `agentRunId`, `memberAddress`, and `containingTeamRunId`. Thread containing-Team identity through the existing tree projection for every Agent execution kind, retain it in one location map rather than parallel address/Team maps, and require the send store to obtain this location before finalizing attachments.

The send store will pass `location.containingTeamRunId` and `location.memberAddress` to the existing final-owner builder. It will continue to use `rootTeamRunId` for navigation, run-history, dedupe, and Team WebSocket concerns and `draftOwnerId` for staged-file ownership. A missing canonical location will fail before context-file finalization and before Agent dispatch. No server or Docker branch is added.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-002, REQ-004; AC-002, AC-006 | User sends a supported uploaded context file to a direct-root Team Agent | Direct-root succeeds because root and containing IDs coincide; investigation BEH-001 | Preserve successful finalization and dispatch while obtaining the same ID through the canonical location query | Composer -> Team send -> execution location -> finalization -> Team stream -> Agent; DS-001 |
| BEH-002 | User | REQ-001, REQ-003, REQ-005; AC-001, AC-003, AC-004, AC-005 | User sends text plus a supported uploaded context file to any focused nested Agent | Upload succeeds, root ID is substituted at finalization, server returns HTTP 400; runtime supplement and investigation BEH-002 | Use the target Agent's exact containing TeamRun ID so finalization and normal dispatch complete | Composer -> Team send -> canonical location -> REST finalization -> exact Agent storage -> Team stream dispatch; DS-001, DS-003 |
| BEH-003 | User | REQ-002; AC-002 | User sends text only to a nested Agent | Empty attachment finalization is a no-op and Team stream dispatch succeeds; investigation BEH-003 | Preserve target selection and text dispatch behavior | Composer -> Team send -> canonical location -> empty finalization -> Team stream -> Agent; DS-002 |
| BEH-004 | Contract | REQ-001, REQ-003; AC-003, AC-004, AC-005 | Final Team-member context-file ownership is resolved by exact containing TeamRun plus rooted address | Server exact-match resolver is authoritative and tested; investigation BEH-004 | Make the web caller honor the existing contract; preserve strict rejection and physical-path encapsulation | Execution tree -> view location -> final-owner descriptor -> server resolver -> AgentRun memory; DS-001, DS-003, DS-004 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/docker-node-image-upload-400/docker-node-runtime-evidence.md` | Retain exact Docker-node logs, staged-file evidence, topology comparison, source trace, and focused server test result | REQ-001, REQ-002, REQ-003; AC-001, AC-002, AC-003, AC-004 | Proves the failure boundary and supports the no-server/no-Docker design decision | Complete; approval N/A because evidence-only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`
- Refactor needed now: `Yes`
- Evidence: the authoritative execution tree owns containing-Team relationships, but its frontend view exposes only root ID and a separate member-address query. The send store therefore supplied an identity with the wrong semantic scope. The existing selector also discards containing-Team identity and carries an unused `configured` flag.
- Design response: extend the established Team-execution capability instead of adding send-store traversal or backend fallback. Introduce one tight execution-location structure, project it for every Agent execution, retain it in the view, and consume it at finalization.
- Refactor rationale: correcting only the current argument with ad hoc tree traversal would bypass the authoritative view and duplicate hierarchical identity policy. A single canonical view query fixes the exposed ownership gap proportionately and makes missing identity explicit.
- Intentional deferrals and residual risk: unrelated historical unrooted locator reads remain out of scope. No in-scope behavior depends on them. Broader consolidation of the two similar all/live execution traversals is deferred because it is not required to establish correct location identity; both traversals must reuse the same tight location type and containing-Team rules in this change.

## Terminology

- **Root TeamRun ID**: the top-level Team execution identity used for Team stream, navigation, history, and dedupe scope.
- **Containing TeamRun ID**: the exact Team execution node that directly contains a target Agent execution; this is the `teamRunId` required by a `team_member_final` context-file owner.
- **Agent execution location**: the canonical compound frontend value `{ agentRunId, memberAddress, containingTeamRunId }` projected from the current Team execution tree.
- **Draft owner ID**: the launch-draft or root-run staging scope used before final storage is resolved; it is intentionally not the final containing-Team identity.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Obsolete in-scope behavior: unconditional use of root TeamRun ID as the final context-file owner for every Team Agent.
- Obsolete structure: the address-only view map and the unused `configured` field in the all-Agent projection once the canonical location structure replaces them.
- Required action: remove the root-ID final-owner substitution and do not retain it behind a fallback, topology check, or compatibility branch.
- No server compatibility behavior, dual owner descriptor, or old/new finalization path is permitted.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: staged context files under `<app-data-dir>/draft_context_files/...`; final files under resolved AgentRun `context_files` directories; three failed PNG drafts and many existing final files were observed.
- Relevant code-model, serialization, semantic, or physical-store change: only the transient frontend value supplied as an existing final-owner field changes for nested Agents. No stored model, serialization, schema, or physical layout changes.
- Normal reader/writer behavior and representative evidence: the server resolves the exact logical compound identity and moves/reads files through current services; focused integration tests passed for current nested storage semantics.
- Required semantics and invariants under direct use: exact containing TeamRun plus rooted address resolves one AgentRun; existing root-member locators remain valid because root equals containing TeamRun there.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: existing final files and Team/run state must not be rewritten or deleted; failed drafts remain governed by the existing 24-hour cleanup policy.
- Decision: `Not Affected`
- Decision rationale: no persisted representation changes and no migration benefit exists. A rewrite would add I/O and corruption risk without changing runtime meaning.
- Acceptance criteria or design constraints supported: REQ-004, REQ-006; AC-004, AC-006, AC-007.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002, BEH-004 | User submits text plus uploaded context file to focused Team Agent | Message dispatches to exact AgentRun after file is stored under that AgentRun | `agentTeamRunStore.sendMessageToFocusedMember` governs send sequencing; execution view and backend resolver govern their identity boundaries | Carries the corrected nested attachment behavior through the real browser-to-runtime path |
| DS-002 | Primary End-to-End | BEH-003 | User submits text only to focused nested Agent | Team WebSocket dispatches to exact AgentRun | Team send store | Protects the currently successful text path from attachment-specific change |
| DS-003 | Return-Event | BEH-002, BEH-004 | Location lookup or finalization cannot establish exact ownership | Submission is rejected before Agent dispatch with traceable error state | Team send store and existing local-submission error handling | Preserves fail-closed identity semantics and prevents misrouting |
| DS-004 | Bounded Local | BEH-004 | Execution tree creation/snapshot/task activation changes canonical tree | View holds validated AgentRun execution locations | `TeamExecutionViewState` | Makes hierarchical identity authoritative and current for configured and dynamic task executions |

## Primary Execution Spine(s)

- `DS-001`: `Agent composer -> agentTeamRunStore send coordinator -> TeamExecutionViewState execution-location query -> contextFileUploadStore -> REST context-file finalization -> ContextFileOwnerResolver / tree location service -> AgentRun context-file storage -> root Team WebSocket -> exact AgentRun`
- `DS-002`: `Agent composer -> agentTeamRunStore send coordinator -> TeamExecutionViewState execution-location query -> empty finalization no-op -> root Team WebSocket -> exact AgentRun`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The selected AgentRun is resolved once to a canonical execution location. Draft ownership remains staging-scoped, while final ownership uses the location's containing TeamRun and rooted address. The existing server resolves physical storage, then the store sends the finalized locators over the root Team stream. | Focused Agent execution, context-file owner, finalized attachment, Team message | Team send store for sequencing; execution view for frontend identity; server resolver for physical location | local optimistic submission, attachment planning, run-history refresh |
| DS-002 | The same target identity validation occurs, but no uploaded draft needs a move; the current no-op finalization and Team stream dispatch remain intact. | Focused Agent execution, Team message | Team send store | dedupe and local submission state |
| DS-003 | Missing view identity throws before finalization. Existing HTTP finalization errors remain caught by send coordination, mark the local submission failed when already admitted, and prevent WebSocket dispatch. | Send attempt/error state | Team send store | UI error rendering and cleanup |
| DS-004 | Tree selectors thread the currently enclosing TeamRun ID through configured and task traversal, producing one location per AgentRun. The view validates stable placement and updates its canonical location map when snapshots or task events change the tree. | Execution tree, Agent execution location | Team execution view | reactive context association and focus repair |

## Spine Actors / Main-Line Nodes

1. Agent composer initiates a send with the focused member's text and attachments.
2. `agentTeamRunStore` owns send/restore/launch/finalize/dispatch sequencing.
3. `TeamExecutionViewState` owns canonical `AgentRun` placement identity.
4. `contextFileUploadStore` owns staged-to-final attachment finalization requests.
5. Backend `ContextFileOwnerResolver` and `TeamRunExecutionTreeLocationService` own logical-to-physical exact resolution.
6. Team streaming service dispatches to the exact `AgentRun` under the root Team stream.

## Ownership Map

| Main-Line Node | Owned State / Lifecycle / Invariant |
| --- | --- |
| Agent composer | User-edited text and currently staged attachment selection |
| Team send store | Launch/restore readiness, target capture, local admission, attachment finalization ordering, dedupe, and WebSocket dispatch |
| Team execution view | Current canonical execution tree, focus, Agent contexts, and exact AgentRun-to-containing-Team/member placement |
| Context-file upload store | Draft attachment finalization transport and returned locators |
| Server owner resolver/location service | Exact compound-identity validation and physical AgentRun memory resolution |
| Team streaming service | Root-stream connection and exact AgentRun command transport |

`TeamExecutionViewState` is the authoritative public frontend boundary for execution identity, not a thin wrapper. `agentTeamRunStore` must not depend on its internal tree selector directly.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A. The changed execution-view interface is an authoritative state/query owner, and the final-owner builder is a typed value constructor rather than a governing facade.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `buildTeamMemberFinalContextFileOwner(rootTeamRunId, memberAddress)` call shape in Team send | Root identity is semantically wrong for nested Agents | `location.containingTeamRunId` plus `location.memberAddress` from `TeamExecutionViewState` | In This Change | No root fallback retained |
| Address-only internal association map in execution view | It cannot represent the established compound placement invariant and would duplicate a new Team ID map | One map of `TeamAgentExecutionLocation` keyed by AgentRun ID | In This Change | Existing `getMemberAddress` becomes a projection from this map for unchanged callers |
| Unused `configured` boolean in execution-Agent projection | No current consumer uses it; it is unrelated to location identity | Tight `TeamAgentExecutionLocation` structure | In This Change | Do not preserve as an optional compatibility field |
| Backend root-ID fallback or basename guessing | Not present and prohibited | Existing strict resolver remains | In This Change | Explicitly ensure none is added |

## Return Or Event Spine(s) (If Applicable)

`DS-003`: `Execution-location lookup/finalization -> thrown error -> existing send catch -> fail admitted local submission when applicable -> no Team WebSocket dispatch -> observable error state`.

A missing location is detected before local admission and finalization, so it propagates as a traceable client error. A server finalization failure after admission continues through existing local-submission failure behavior. The design does not invent a second error channel.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `TeamExecutionViewState`
- `DS-004`: `Initial tree / accepted snapshot / accepted task event -> collect canonical Agent execution locations -> validate unique AgentRun and stable placement -> associate any new Agent contexts -> commit current tree and locations -> repair focus`
- Importance: a dynamic task Agent can become focusable after initial hydration. Its containing-Team identity must be projected by the same owner before any later image-bearing send.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Context attachment planning | DS-001, DS-002 | Team send store | Divide retained message attachments from executable image/file inputs | Existing attachment semantics | Mixing identity selection into planning would blur ownership |
| Local optimistic submission | DS-001, DS-002, DS-003 | Team send store | Reflect pending user message and failure state | Existing UI feedback | Must not become identity authority |
| Run-history activity refresh | DS-001, DS-002 | Team send store | Mark root Team active and refresh tree | Existing navigation/history behavior | Must continue to use root TeamRun, not containing TeamRun |
| Typed final-owner builder | DS-001 | Context-file client utility | Normalize and construct current REST descriptor | Prevent malformed empty identity strings | Must not traverse Team trees or guess scope |
| Physical path mapping | DS-001 | Backend location service | Resolve logical identity to memory directory | Encapsulates filesystem layout | Frontend path construction would break boundary |

## Ownership Boundaries

- The composer owns selection state but does not resolve execution topology.
- The Team send store owns orchestration and asks the execution view for one target location. It must not inspect `getExecutionTree()` to derive containing identity.
- The execution view owns the canonical tree and all AgentRun placement projection. Tree selectors are its internal mechanism and may also support hydration/test fixtures, but callers needing current execution identity use the view query.
- The context-file upload store accepts already-resolved logical owners; it does not decide root versus containing scope.
- The server remains the only owner of physical storage location and exact active/stored-tree validation.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TeamExecutionViewState` | Current tree, location map, selector traversal, snapshot/task-event placement updates | `agentTeamRunStore` and other runtime callers needing current Agent identity | Send store traverses `getExecutionTree()` or pairs root ID with separate address | Add/maintain singular `getAgentExecutionLocation(agentRunId)` query |
| `contextFileUploadStore.finalizeDraftAttachments` | REST finalization and locator return | Team send store | Direct REST call or filesystem path construction in send store | Strengthen upload-store API only if transport ownership changes; not needed here |
| Backend context-file owner resolver | Exact tree lookup and physical memory path | REST finalization/read services | Frontend-supplied physical path or server fallback guessing | Keep current exact logical contract |

## Dependency Rules

Allowed:

- `agentTeamRunStore` -> `TeamExecutionViewState.getAgentExecutionLocation`.
- `agentTeamRunStore` -> existing draft/final owner builders and upload store.
- `TeamExecutionViewState` -> execution-tree selector projection and shared execution-location type.
- server finalization -> current owner resolver -> current tree location service.

Forbidden:

- `agentTeamRunStore` -> selector internals or custom recursive traversal.
- final context-file owner -> root TeamRun unless the returned canonical location says the Agent is root-contained.
- parallel address and containing-Team maps that can drift.
- backend root fallback, basename matching, cross-Team search, or client physical paths.
- using containing TeamRun ID for root Team WebSocket, navigation, dedupe, or run-history operations.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `TeamExecutionViewState.getAgentExecutionLocation(agentRunId)` | One Agent execution placement in current Team tree | Return exact immutable location or `null` | Input: nonblank AgentRun ID; output: `{ agentRunId, memberAddress, containingTeamRunId }` | Singular source for final-owner identity |
| `collectAgentExecutionLocations(tree)` | All Agent placements represented in one execution tree | Traverse all configured/task shapes with exact enclosing TeamRun | Canonical V2 tree -> immutable locations | Clean-cut replacement for `collectExecutionAgents`; remove unused `configured` |
| `collectLiveAgentExecutionLocations(tree)` | Live Agent placements | Same identity projection while excluding settled task executions | Canonical V2 tree -> immutable live locations | Used for snapshot status validation |
| `buildTeamMemberFinalContextFileOwner(containingTeamRunId, memberAddress)` | Logical final Team-member owner descriptor | Normalize explicit compound identity | Containing TeamRun ID + canonical rooted address | Descriptor wire field remains `teamRunId`; parameter semantics become explicit |
| `finalizeDraftAttachments({ draftOwner, finalOwner, attachments })` | Attachment lifecycle transition | Finalize staged files under exact logical owner | Existing draft and final descriptor unions | No API shape change |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `getAgentExecutionLocation` | Yes | Yes | Low | Return the full immutable compound placement or `null` |
| Agent-location collectors | Yes | Yes | Low | Thread enclosing TeamRun through every recursion branch |
| Final-owner builder | Yes | Yes after parameter rename | Low | Keep wire shape; rename local parameter to containing semantics |
| `finalizeDraftAttachments` | Yes | Yes via descriptor union | Low | No change |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Canonical Agent placement | `TeamAgentExecutionLocation` | Yes | Low | Use `memberAddress` and `containingTeamRunId`, not generic `address`/`teamRunId` fields |
| View query | `getAgentExecutionLocation` | Yes | Low | Avoid vague `getTeamRunId` method |
| Final builder argument | `containingTeamRunId` | Yes | Low | Preserve server wire key only at descriptor boundary |
| Root stream identity | `rootTeamRunId` | Yes | Low | Do not reuse for final storage owner |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| AgentRun hierarchical identity | `services/teamExecution` | Extend | It already owns the canonical tree and view | N/A |
| Attachment finalization | context-file upload store and owner utilities | Reuse | Transport and descriptor contract are already correct | N/A |
| Physical storage resolution | server context-file/run-history services | Reuse | Exact resolver is correct and tested | N/A |
| Error presentation | existing local-submission/UI error path | Reuse | Current behavior already surfaces finalization errors | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Web Team execution | Canonical Agent placement projection and query | DS-001, DS-002, DS-004 | Team execution view | Extend | No new subsystem |
| Web Team run store | Send orchestration and use of exact final identity | DS-001, DS-002, DS-003 | Team send coordinator | Reuse/modify | Root identity remains for stream concerns |
| Web context files | Owner construction and finalization transport | DS-001 | Upload store | Reuse; local parameter clarification only | Wire contract unchanged |
| Server context files/run history | Exact logical-to-physical resolution | DS-001, DS-003 | Backend resolver | Reuse unchanged | Tests remain authoritative |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `services/teamExecution/teamExecutionViewModels.ts` | Web Team execution | Shared Team execution models | Define tight immutable Agent execution location | Existing home for view-owned models | Defines shared structure |
| `services/teamExecution/teamExecutionTreeSelectors.ts` | Web Team execution | Tree projection mechanism | Project exact containing-Team identity for all/live Agent executions | Existing selector owner | Uses location model |
| `services/teamExecution/teamExecutionViewState.ts` | Web Team execution | Authoritative view | Retain and expose canonical locations and validate placement changes | Existing state/query owner | Uses location model |
| `stores/agentTeamRunStore.ts` | Web Team run | Send coordinator | Consume canonical location for final owner | Existing orchestration owner | Uses view result |
| `utils/contextFiles/contextFileOwner.ts` | Web context files | Owner value constructor | Clarify builder input semantic name | Existing descriptor owner | Existing descriptor union |
| Existing colocated specs | Web tests | Relevant owners | Prove configured/task location mapping and nested attachment final owner | Matches repository testing pattern | Test fixtures reuse canonical models |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| AgentRun + address + containing TeamRun placement used by selector and view | `teamExecutionViewModels.ts::TeamAgentExecutionLocation` | Web Team execution | It is one coherent canonical identity shared across projection/state/query | Yes — remove unused `configured` | Yes — replace address-only plus potential parallel Team map | A generic bag containing root, task, storage, or UI fields |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TeamAgentExecutionLocation` | Yes | Yes | Low | Keep exactly `agentRunId`, `memberAddress`, and `containingTeamRunId`; freeze returned values |
| Existing `FinalContextFileOwnerDescriptor.team_member_final` | Yes at wire boundary | Yes | Low | Do not add a second containing-team field; use explicit builder parameter naming |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/teamExecution/teamExecutionViewModels.ts` | Web Team execution | Shared view models | Own `TeamAgentExecutionLocation` | Coherent with other Team view contracts | Defines it |
| `autobyteus-web/services/teamExecution/teamExecutionTreeSelectors.ts` | Web Team execution | Internal projection | Clean-cut all/live location collectors with correct enclosing TeamRun traversal | Selector file already owns tree projections | Yes |
| `autobyteus-web/services/teamExecution/teamExecutionViewState.ts` | Web Team execution | Authoritative state/query owner | One location map, canonical placement validation, `getAgentExecutionLocation`, compatibility-neutral `getMemberAddress` projection | Placement belongs beside tree/context lifecycle | Yes |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Web Team run | Send coordinator | Resolve one location and pass containing identity to finalization | Existing send lifecycle remains cohesive | Consumes it |
| `autobyteus-web/utils/contextFiles/contextFileOwner.ts` | Web context files | Value constructor | Rename builder parameter to `containingTeamRunId`; retain wire descriptor | Explicit semantic boundary | Existing union |
| `autobyteus-web/services/teamExecution/__tests__/teamExecutionViewState.spec.ts` | Web Team execution | View-state coverage | Assert root/nested configured and dynamic task containing-Team identities, plus missing lookup | Closest behavioral owner | Yes |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` | Web Team run | Send orchestration coverage | Assert nested uploaded attachment final owner uses `build-run` and exact rooted address; assert no dispatch when location missing if feasible through supported fixture | Direct regression boundary | Yes |

## Applied Patterns (If Any)

- **Authoritative read model/query**: `TeamExecutionViewState` remains the sole current frontend execution-identity boundary.
- **Compound identity value**: `TeamAgentExecutionLocation` prevents root and containing TeamRun meanings from being interchanged.
- **Fail closed**: absence of an exact current location stops finalization and dispatch; no fallback guesses.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/teamExecution/` | Folder | Team execution capability | Canonical tree, projections, view state, and models | Existing coherent capability area | Context-file REST transport |
| `.../teamExecutionViewModels.ts` | File | Shared Team execution models | Tight Agent execution location type | Reused by selector and state | Storage paths or attachment state |
| `.../teamExecutionTreeSelectors.ts` | File | Tree projection mechanism | Thread containing TeamRun through every Agent traversal | Existing selector responsibility | Send/finalization orchestration |
| `.../teamExecutionViewState.ts` | File | Authoritative execution view | Retain/query canonical location | Existing state owner | Direct REST calls or filesystem mapping |
| `autobyteus-web/stores/agentTeamRunStore.ts` | File | Team send coordinator | Use canonical location during existing send sequence | Current orchestration boundary | Tree recursion or backend fallback policy |
| `autobyteus-web/utils/contextFiles/contextFileOwner.ts` | File | Context-file descriptor constructor | Normalize explicit owner values | Current type/value home | Team-tree lookup |

The existing layout remains deliberately compact because this is one boundary correction inside established capability folders. Creating a new identity module/folder would add artificial indirection; the shared value fits the existing view-model owner.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `services/teamExecution` | Main-Line Domain-Control | Yes | Low | Canonical execution identity belongs with tree/view lifecycle |
| `stores` | Main-Line Domain-Control | Yes for existing store | Medium | Keep only sequencing; forbid selector/tree traversal |
| `utils/contextFiles` | Off-Spine Concern | Yes | Low | Typed context-file values/endpoints only |
| Server context-file/run-history folders | Persistence-Provider / boundary resolution | Yes | Low | Unchanged |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Nested configured Agent | `getAgentExecutionLocation('product-agent-run') -> { memberAddress: '/product_team/product_agent', containingTeamRunId: 'product-team-run' }` | Pair `root-department-run` with `/product_team/product_agent` | Shows the exact reproduced mismatch |
| Direct-root Agent | Location returns `containingTeamRunId === rootTeamRunId` naturally | Special `if nested` branch | One topology-independent rule preserves root behavior |
| Task Agent traversal | A task Agent in `parentTeam.task_executions` gets `parentTeam.team_run_id`; a task-Team member gets the task Team's `team_run_id` | Infer containing Team from address segments or task recipient name | IDs, not names/addresses, govern storage identity |
| Boundary use | Send store calls `view.getAgentExecutionLocation(targetAgentRunId)` once | Send store calls `getExecutionTree()` and recursively searches it | Preserves authoritative-boundary encapsulation |
| Missing identity | Throw before finalization and send | Fall back to root ID or basename search | Prevents cross-Team misrouting |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Try containing TeamRun, then root TeamRun | Could appear to preserve direct-root behavior | Rejected | Canonical location yields root naturally for direct members and child ID for nested members |
| Backend accept root plus nested address | Would make current client request succeed | Rejected | Keep exact compound lookup; correct frontend caller |
| Address-basename or global Agent search | Could locate a member without containing ID | Rejected | Require exact AgentRun-derived location from canonical tree |
| Add `containingTeamRunId` beside wire `teamRunId` | Could clarify the descriptor | Rejected | Keep one wire field and clarify builder/call-site semantics; avoid dual representation |
| Preserve `configured` projection flag | Possible internal compatibility concern | Rejected | Remove because repository search found no consumer; canonical location stays tight |

## Derived Layering (If Useful)

`User interaction -> Team send orchestration -> authoritative Team execution identity -> context-file transport -> backend exact resolution/persistence -> Team runtime dispatch`.

This layering is explanatory only. The ownership and interface rules above govern the change.

## Change / Refactor Sequence

1. Add the tight immutable `TeamAgentExecutionLocation` model.
2. Replace the all/live execution-Agent projections with location projections. Thread the enclosing TeamRun ID through root configured Teams, nested configured Teams, direct task Agents, task Teams, nested task-Team members, and their task executions. Remove the unused `configured` field.
3. Refactor `TeamExecutionViewState` from an address-only association to one canonical location map. Validate unique AgentRun IDs and stable full placement during initial creation, snapshots, and task-event mutations. Preserve existing `getMemberAddress` as a projection for unrelated callers, and add `getAgentExecutionLocation`.
4. Add focused view-state tests for direct-root, configured nested, task-Team, nested task Agent, and unknown AgentRun location outcomes.
5. Update `sendMessageToFocusedMember` to require the target execution location before local admission/finalization and build `team_member_final` with `containingTeamRunId` plus `memberAddress`. Keep root identity in navigation, dedupe, history, and Team streaming.
6. Clarify the final-owner builder's local parameter name without changing the descriptor wire field.
7. Extend the Team send store test with a nested hydrated Team and an uploaded attachment; assert draft owner remains staging-scoped, final owner is `{ kind: 'team_member_final', teamRunId: 'build-run', memberAddress: '/BuildSquad/review_lead' }`, and WebSocket target remains the exact AgentRun under root `team-nested-live`.
8. Run focused web tests and static/type/build checks selected by implementation scope. Preserve the passing backend exact-match tests; API/E2E engineering will make the final durable-coverage and live-browser execution decisions after code review.
9. Confirm no root fallback, Docker conditional, server change, schema migration, or obsolete address-only/unused projection remains.

No temporary compatibility seam is needed; each step can keep the branch buildable by changing the shared type, selector, view, and consumers in one implementation round.

## Key Tradeoffs

- A singular location query causes slightly more internal view refactoring than adding a second `getContainingTeamRunId` map, but prevents independently read or drifting halves of one compound identity.
- Renaming the internal collectors and removing an unused flag touches a few hydration/test-fixture callers, but produces a clean, self-descriptive canonical structure and avoids retaining misleading legacy shape.
- The backend could infer or search globally, but that would weaken an already-correct identity invariant and create misrouting risk; fixing the authoritative frontend caller is safer and smaller.
- A new standalone identity service is unnecessary. The current execution view already owns the relevant tree lifecycle, so extending it is the narrowest healthy boundary.

## Risks

- Traversal could assign the parent of a task Team instead of the task Team itself to its Agent members. Mitigation: thread the current enclosing TeamRun explicitly and assert configured/task/nested cases in view-state tests.
- Snapshot/task-event placement updates could leave a stale map if location commit is not atomic with tree/context validation. Mitigation: plan and validate next locations before committing any reactive state, following the existing planned-association pattern.
- An implementer could accidentally replace root IDs used by stream/dedupe/history with containing IDs. Mitigation: change only the final-owner argument and add a store assertion that stream/dedupe/navigation continue to use the root ID.
- Current real UI reproduction already proves the issue, but final browser validation requires the corrected frontend build and environment selection. This is downstream API/E2E scope, not a design uncertainty.

## Guidance For Implementation

- Treat `TeamAgentExecutionLocation` as immutable and normalize/validate nonblank IDs at the view boundary using existing conventions.
- Implement traversal by carrying `containingTeamRunId` as an explicit recursion argument; never derive it from address segments.
- For `task_agent`, use the Team node whose `task_executions` array contains it. For `task_team_agent`, use the task Team's own `team_run_id`. For nested `task_team_member`, recurse using that member Team's own `team_run_id`.
- Ensure duplicate AgentRun detection and full placement stability checks include both `memberAddress` and `containingTeamRunId`.
- Return `null` for an unknown AgentRun. In the send coordinator, throw a clear error naming that AgentRun before calling `finalizeDraftAttachments`.
- Preserve `getMemberAddress` for current unrelated callers by reading the canonical location map; this is not backward-compatibility behavior for the bug, but the same healthy view responsibility exposed to existing consumers.
- Do not change server resolver logic, REST schemas, Docker configuration, context-file layouts, or cleanup TTL.
- Do not create `implementation-handoff.md` during design; it belongs to implementation engineering.
