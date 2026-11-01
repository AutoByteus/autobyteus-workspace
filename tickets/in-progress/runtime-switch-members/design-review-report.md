# Design Review Report — autobyteus-348 (runtime switch for Team members, Org members and delegated copies)

## Review Round Meta

- Upstream Requirements Doc: `requirements-doc.md` (SR-001, `Approved` by the user's request and the Solution Designer within the direction)
- Upstream Investigation Notes: `investigation-notes.md` (F-01…F-09, U-1, U-2)
- Upstream Solution Revision Record: `solution-revision-record.md` (SR-001)
- Reviewed Design Spec: `design-spec.md` (status `Ready`; user design approval `Not required`, not `Pending`)
- Supplemental Task Artifacts Reviewed: `switch-member-record-contract.md`, `follow-ups.md`, `solution-designer-handoff.md`; `task-follow-ups-316.md` (input); autobyteus-316's delivered code on the base (read where cited)
- Relevant Solution Revision IDs: SR-001
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Solution Designer handoff "Architecture Design Complete", `task_size=Large`, `architectural_risk=High`
- Prior Review Round Reviewed: `N/A`
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members`, branch `codex/runtime-switch-members`, base `origin/personal` @ `c952758a81`, documents `d4cf851678`. I re-read the principles file (Principles 1–15, triggers, health assessment) and opened the code behind each claim the design rests on, instead of taking the notes' citations: `agent-collaboration/execution/backends/configured-agent-execution-handle.ts` (whole), `configured-agent-activation-planner.ts` (whole), `root-agent-execution-registry.ts` (whole), `agent-collaboration/execution/domain/collaboration-agent-platform-binding.ts`, `agent-team-execution/local/flat-team-agent-execution-handle.ts` (whole), `flat-team-execution-context.ts`, `team-agent-platform-binding-committer.ts`, `team-run-execution-tree-mutator.ts` (adopt/replace), `agent-org-run.ts:292` and `standalone-agent-run-root.ts:378` (commit seams), `team-run-model-config-mutator.ts` and `agent-org-run-config-mutator.ts` (whole), the copy-record sites (`run-execution-tree-shared-records.ts`, `task-agent-own-records.ts`, `task-agent-own-file-schema.ts`, `delegated-launch-selection.ts`, `collaboration-execution-tree-dto-projection.ts`, `team-execution-view-projector.ts`), the two contracts packages (`autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts`, `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts`), `memory-search/runs/memory-run-discovery.ts`, 316's `runtime-switch-memory-port.ts`, `runtime-switch-recorder.ts`, `runtime-switch.ts`, `runtime-handover-notice-service.ts`, `agent-run-pending-runtime-switch.ts`, the web `ExistingRunSettings.vue`, `stores/existingRunConfigStore.ts`, `runHistoryStore.ts`. No experiment was run; I wrote nothing outside the ticket folder. **Not done:** I did not open every one of the 14 `userLaunchSelection` sites, the Org and Agent-root tree mutators' adopt functions, or the web planner.

## Routing Classification Review

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architectural risk (`Low`/`High`): `High`
- Classification rationale reviewed: persisted records of every Team/Org/copy gain optional fields, three roots' durable commit, a path every member activation takes. Agreed. One correction to the rationale: the change also crosses **two shared wire-contract packages** (`autobyteus-collaboration-stream-contracts`, `autobyteus-team-stream-contracts`), which the design counts as "library: none" and does not list (ARCH-F-001).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: add the two contracts packages to the size rationale after ARCH-F-001.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Contradicted` in part (the shared-activation premise F-02 and the web-projection point F-09 (b))
- Approved requirements / intended behavior understood: the 316 switch for stopped Team members, Org members (direct Agents and Agents of mounted Teams) and delegated copies (Agent copies, members of Team copies); a member without history switches without marker or note; the chat, journal and memory search follow; the Team/Org edit chains are renamed.
- Relevant existing behavior and evidence confirmed: see the table below.
- Scope guardrail confirmed (`In-Scope Use Cases` / `Out of Scope` / `Preserved Behavior Boundary` / `Review Authority`): yes. FU-004, FU-001, FU-005, FU-008, peer-node copies and application-bound roots are out of scope and treated as non-blocking.
- Approved change, preserved behavior, and outside scope understood: yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (ARCH-F-001: REQ-002, REQ-006, AC-004, AC-008; ARCH-F-002: REQ-003, REQ-004, AC-005; ARCH-F-003: REQ-003, AC-005, AC-006; ARCH-F-004: REQ-002, REQ-005, AC-004, AC-007).
- Remaining material ambiguity, if any: the copy pending-switch rule (REQ-002/AC-004 versus DEC-5/M-6; ARCH-F-004). It is technical, not a user decision.
- Statements about existing code the design relies on, opened at their cited lines (an unsourced or false one is a finding; Principle 1):

| Design statement | Opened | Result |
| --- | --- | --- |
| F-02: Team, Org and copy members "all are built by `RootAgentExecutionRegistry.createHandle`" and activate through `initializeReady` | `root-agent-execution-registry.ts` header ("shared by the AgentOrg and Agent roots"), its `createHandle` (`:300-345`); `git grep ConfiguredAgentExecutionFactory`; `flat-team-agent-execution-handle.ts:160` | **False for Teams.** The class `ConfiguredAgentExecutionHandle` is shared, but it has **two construction sites**: the registry (Org root, Agent root, their root-hosted task Agents) and `FlatTeamAgentExecutionHandle.createHandle` (Team members and Team-hosted task agents), which also wraps the commit callback (ARCH-F-002) |
| F-03: the three roots "implement the same seam" | `agent-org-run.ts:292`, `standalone-agent-run-root.ts:378`, `team-agent-platform-binding-committer.ts` | Same interface, **three different implementations** (`commitTreeMutation` for Org and Agent roots, `commitExecutionTreeMutation` with `requiresWrite`/`finalization_indeterminate` for the Team); the Team adapter also dereferences `change.binding`/`change.replacement.binding` |
| D-8: "a commit whose `switchId` does not match changes nothing" (also contract M-2) | `adoptAgentPlatformBindingInTree`, `replaceAgentPlatformBindingWithoutConversationInTree` | The precedent **throws** `TeamAgentPlatformBindingError(...CONFLICT)` on a mismatch or a missing target; a silent no-op would let the handle publish a run whose binding was never stored (ARCH-F-003) |
| D-3: "`effectiveCopyAgentLaunch` … the one rule keeps being the only place" | `git grep` of the three rule names | **Three copies**: server `effectiveCopyAgentLaunch`, `collaborationCopyAgentLaunch` (collaboration contracts) and `teamCopyAgentLaunch` (team contracts), the last two documented as mirrors; the web calls both (`agentSourceSelectors.ts:77,141`, `delegatedLaunchRows.ts:102,114`) |
| F-09 (b) / Change Scope: projections "carry the pending flag; no other reader" | `userLaunchSelectionDtoSchema` (`.strict()`), `delegatedLaunchSelectionsChangedEventDtoSchema`, `taskAgent`/`taskTeamMember`/`taskTeam` DTO schemas (all `.strict()`), the team contract's `UserLaunchSelectionDto`, the web parses (`existingRunConfigResultActions.ts:47`, `teamRunContextHydrationService.ts:268`, `teamExecutionTreeMutations.ts`) | **Wrong.** A copy's runtime in its choice, a member's `pendingRuntimeSwitch` and the live selection event all cross two strict shared schemas (ARCH-F-001) |
| D-9: discovery "calls `openRawTraceRuntimeKind` for Team, Org and task members" | `memory-run-discovery.ts:95-150`, `task-agent-own-records.ts:55-70`, `task-agent-own-file-schema.ts:57` | Discovery has four lists. Team/Org/task-team runtimes come from `located.configuredPlacement.launchConfiguration` and `taskTeams.listTaskTeams()` read models that carry no pending field; for a task **Agent** it reads `taskAgent.runtimeKind`, which is the **started** runtime and never changes (M-3). After a copy's switch commits, the journal target is wrong (ARCH-F-001) |
| F-05: copy facts "compose at load, split at save" | `task-agent-own-records.ts` | Confirmed: the own file's top-level launch is the started launch; the choice is `taskAgent.userLaunchSelection` |
| D-6/D-7: the planner can add a `switch` plan before `assertNoPriorConversationActivity` | `configured-agent-activation-planner.ts:resolvePlan` | Holds; `mode==="fresh"` is the only caller of the assertion and a pending switch never co-occurs with `fresh` (a copy's prepared start has `platformAgentRunId:null`, no pending) |
| Handle port default adds no package edge | `planner` imports `getAgentConversationActivityInspector` from `agent-memory`; `RuntimeSwitchRecorder` is stateless and takes `memoryDir` per call (`runtime-switch-recorder.ts`) | Holds. A default `new RuntimeSwitchRecorder()` in the handle options is sound |
| The hand-over note works for member runs | `runtime-handover-notice-service.ts` reads `run.config.memoryDir`, `run.runtimeKind`; member `memoryDir` set in `buildAgentRunConfig` | Holds |
| The staged `prepareConfiguredActivation` path is not an activation of a switched member | callers at `root-agent-execution-registry.ts:142`, `task-agent-execution-registry.ts:153`, `flat-team-agent-execution-handle.ts:87` | Holds: all are fresh task copies (`platformAgentRunId:null`, mode `fresh`); configured members activate lazily on first input (`prepareConfigured` creates a handle only). The path should still refuse a spec with a pending switch (ARCH-F-003) |
| Requirements BEH-001 cites a "cannot change runtime kind" rule in `team-run-model-config-mutator.ts` | the file | The text is in `docs/modules/agent_team_execution.md:165`; the mutator only spreads the old launch and replaces model and settings. There is no enforcement to remove (ARCH-F-006) |

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass for the server save (mutators read); Fail for the web path | Pass server; Fail web/contracts | Needs Correction | ARCH-F-001 |
| BEH-002 | User | Fail: REQ-002 and DEC-5/M-6 give two rules for who gets a pending switch | Fail (three rule copies, strict wire schema, live event) | Fail | Needs Correction | ARCH-F-001, ARCH-F-004 |
| BEH-003 | System | Pass | Fail: F-02/F-03 as stated are inaccurate | Fail: DS-003 omits the Team wrapper, the commit semantics and the in-memory state | Needs Correction | ARCH-F-002, ARCH-F-003 |
| BEH-004 | User | Pass | Pass for the chat and note (316); Fail for the journal runtime of members | Fail for discovery | Needs Correction | ARCH-F-001 |
| BEH-005 | System | Pass | Pass | Pass for configured members; see ARCH-F-004 for copies | Needs Correction | ARCH-F-004 |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `switch-member-record-contract.md` | Pass | Pass | Fail: records only the server-side records; no wire DTOs; M-2 "changes nothing"; M-6 versus the copy rule | Fail: M-6 and REQ-002/AC-004 conflict | Pass | ARCH-F-001, -003, -004 |
| `follow-ups.md`, `task-follow-ups-316.md` | Pass | Pass | Pass | Pass | Pass | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Section present | None |
| Root-cause classification is explicit and evidence-backed | Pass | `Duplicated Policy Or Coordination` (the rule would repeat in three save paths) is right; add that the **effective-launch rule is already repeated three times** and the commit rule is repeated per tree family (ARCH-F-001, ARCH-F-005) | Update |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | "Yes, bounded" | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Fail | The bounded refactor lists the standalone rule and the selection context but not the contract-package rule copies or the commit rule per family | ARCH-F-001, ARCH-F-005 |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | One Owner Per Node, In Call Order? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 (Team/Org save) | Settings save of a stopped Team/Org | Pass | Pass | Pass | Pass | Pass | Pass | Pass for the server; the web leg needs the contracts (ARCH-F-001) |
| DS-002 (copy save) | Copy choice save | Pass | Fail: the history check at save conflicts with DEC-5 (ARCH-F-004) | Pass | Pass | Fail: two owners decide the same fact (save-time inspector; planner) | Pass | Fail |
| DS-003 (activation) | A message reaches the switched member | Fail: starts at `startForInput` but omits the Team wrapper, its commit adapter and the in-memory copies | Fail | Fail: wrapper (Team) versus registry (Org/Agent) not named | Pass | Fail | Pass | Fail until ARCH-F-002/-003 |
| DS-004 (readers) | Chat, journal, memory search | Pass | Pass | Pass | Pass | Pass | Pass | Pass for chat and note; discovery in ARCH-F-001 |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ConfiguredAgentExecutionHandle` (activation) | Pass | Pass | Pass | Pass | The Team wrapper is an adapter in front of it; its role must be named |
| Root commit seam (`commitAgentPlatformBindingChange`) | Pass | Pass | Pass | Pass in shape; semantics in ARCH-F-003 | |
| Record-level switch commit (clear pending, set binding) | Fail: not owned; D-8 leaves it to three tree-family functions | — | — | Fail | ARCH-F-005 |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Handle → memory port (process default) | Pass | Pass | Pass: `agent-collaboration` → `agent-memory` already exists | Pass | |
| Server ↔ contracts ↔ web | Fail: the contracts packages and their dependents are not named | Fail | Pass | Fail | ARCH-F-001 |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `applyRuntimeSelection(record, selection, switchId)` | Pass | Pass | Pass | Low | Pass |
| `CollaborationAgentPlatformBindingChange {runtime_switch, switchId, binding\|null}` | Pass | Pass | Pass | Low | Pass in shape; every consumer of the union must handle the third kind (the Team adapter dereferences `.binding`; ARCH-F-003) |
| `RetainedAgentExecutionControl.replaceSelection(selection, pending?)` | Pass | Pass | Pass | Low | Two implementations and two callers (ARCH-F-002) |
| Mutation `updateStoppedTeamRunSelections`, Org `selectionPatches`, delegated `selection.runtimeKind` | Pass | Pass | Pass | Low | Pass; wire schemas in ARCH-F-001 |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| 316's sequence, port, recorder, readers, chat reader, hand-over | Pass | Pass: reused unchanged | N/A | Pass | |
| The shared handle | Pass | Pass in principle | N/A | Pass with ARCH-F-002 | |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Allocation table | Fail: omits `autobyteus-collaboration-stream-contracts`, `autobyteus-team-stream-contracts`, `agent-team-execution/local`, the Team task-agent registry, the location read models | — | — | Fail | ARCH-F-001, -002 |

A mechanism that gets a function reaching another collaborator, a compound owner ("A + B"), or a kind or entry form the spine does not trace fails the row (Principles 1, 2, 13). The Team entry form is not traced in DS-003 (ARCH-F-002).

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| The undo/model-only/switch rule | Pass | Pass (`runtime-selection-rule.ts`) | Pass | Pass | |
| The effective-launch rule (3 copies) | Fail: the design believes there is one | — | — | Fail | ARCH-F-001 |
| The record-level commit (3 tree families) | Fail | — | — | Fail | ARCH-F-005 |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `pendingRuntimeSwitch` on three records | Pass | Pass | Pass | N/A | Pass | `from` holds the previous effective binding; for a copy it must be computed with the effective rule |
| `UserLaunchSelection.runtimeKind?` | Pass | Pass | Fail: the wire DTO twin (snake_case in the team contract) and the live event carry the same fact | N/A | Fail | ARCH-F-001 |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Fail` — see ARCH-F-001. The design lists the direct readers and the record schemas, and misses the contract packages, the strict DTO schemas, the mirrored rules, the live selection event, the web selectors/rows, the four discovery lists' read models, and `buildRuntimeSwitch(metadata)` (takes `AgentRunMetadata`, which members do not have).

Each domain word the design uses or introduces keeps one meaning, and each concept one name, across code, data, wire, tools, UI, and docs (Principle 15): `Pass` for the renames; the "member" and "record" words are code-level and acceptable. The `…ModelConfig` renames (D-10) cover 11 server source files, 12 server tests and 9 web files (counted); the list in D-10 is partial but says the implementation lists the rest, which is acceptable if AC-009's source check is the gate.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Mapping rows present | Pass | Pass | N/A | Pass | |
| Files missing | Fail | — | — | Fail | `agent-team-execution/local/flat-team-agent-execution-handle.ts`, `flat-team-execution-context.ts`, `agent-team-execution/local/registries/task-agent-execution-registry.ts` (`replaceModelChoice` caller `:101`), `agent-execution/domain/runtime-switch.ts` (`buildRuntimeSwitch`), the two contracts packages' `src`, tests and `dist`, the web `agentSourceSelectors.ts` and `delegatedLaunchRows.ts`, the team/org/task-team location read models |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| New and renamed paths | Pass | Pass | Low | Pass | `run-history/domain/runtime-selection-rule.ts` is a fitting home for the record-level commit too (ARCH-F-005) |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime locks; model-only names; `replaceModelChoice` | Pass | Pass | Pass | Pass | The "cannot change runtime kind enforcement" has no code to remove (ARCH-F-006) |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Renames; mutation inputs | No | Pass | Pass | Server, contracts and web are built together (DESIGN rule 9) |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Optional fields on three record kinds and the own-file `taskAgent` section | `Directly Usable — No Migration` | Pass: optional fields with truthful absence; read tolerantly, written exactly; the frozen migration shapes in `app-data-migrations/frozen` are not touched (sealed) | Pass | N/A | Pass | The rollback note is accurate: an older build ignores the new fields. A strict reader of an older **web** against a newer server is out of scope (DESIGN rule 9) |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Sequence 1–6 | Fail: the contracts packages are built before the server/web consume them (`dist` is checked in the worktree), and the wire change must land with the server and the web in one cut | Pass | Pass | Fail until ARCH-F-001 adds the step |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Stored before/after of a member commit | Yes | Pass (contract §2) | Pass | Pass | |
| A copy's before/after (choice, pending, effective launch, `from`) and the wire shape | Yes | Fail: only a one-line example | N/A | Fail | Add one before/after for a copy with the effective launch and its DTO |

## Material Premise Validation (Only When Needed)

### `MP-1` — A switched member's handle is activated again in the same root lifetime

- Related approved requirement or established contract: REQ-003, AC-005 (a second message must not switch again); M-2.
- Relevant behavior ID(s): BEH-003.
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: a switched member's run ends and the member receives another input while its root is running: for a task copy the user's Stop of the copy ("the handle stays registered, so the next message restores it", `root-agent-execution-registry.ts` `shutDownTaskForUser` comment, and `discardReleasedTask`); for any member a run that died ("any later re-activation (after the run died) restores", `configured-agent-execution-handle.ts` field comment on `activationMode`).
- Support evidence: the handle's `initializeReady` begins by releasing a prior `agentRun` and re-plans from `this.execution` (frozen at construction and changed only by `replaceModelChoice`, `:217-222`); the Team wrapper keeps its own `config` (`flat-team-agent-execution-handle.ts:38`) and recreates the inner handle from it (`executionSpec()`), and `FlatAgentExecutionContext` holds the session id.
- Forward current or approved target production caller/event path: first input → switch commits (tree record: pending cleared, binding set) → the member's run ends → next input → `ensureReady` → `initializeReady` → `prepareActivation` → `planner.begin(config, this.platformAgentRunId, mode)`. D-7 selects the `switch` plan by the explicit pending field of the **spec**; nothing in the design clears the spec's pending, the handle's `platformAgentRunId`, the Team wrapper's `config` or the Team context after the commit.
- Lifecycle preconditions and material consequence at the claimed point: the second activation plans `switch` again: a **new** provider session instead of restoring the conversation, a `runtime_switch` commit whose stored pending is gone (a conflict error with the precedent, or a silent no-op under D-8's wording), and for a native target the stale external session id stays cached.
- Reachability: `Reachable`
- Review consequence / proportionate response: ARCH-F-003.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Wire contracts, mirrored rules, live event, web selectors | The web would show the wrong runtime for a copy, or fail to parse a tree with a pending member | ARCH-F-001 | Open |
| Team entry form of the shared handle | One of the three kinds the design serves is not traced | ARCH-F-002 | Open |
| Commit mismatch and in-memory state after commit | A second activation would switch again | ARCH-F-003 | Open |
| Who gets a pending switch on a copy | REQ-002/AC-004 versus DEC-5/M-6 | ARCH-F-004 | Open |

## Review Decision

`Fail`

## Findings

All are `Design Impact`, scope `Within Approved Scope`, changes to approved behavior `No` (ARCH-F-004 asks the Solution Designer to make REQ-002 and DEC-5 agree; both are theirs and the choice is technical), recommended recipient Solution Designer. ARCH-F-001…004 are blocking.

### ARCH-F-001 — The change crosses two shared wire-contract packages, a third and fourth copy of the effective-launch rule, a live event and the member read models; none is in the design (answers F-09 (b))

- Severity: High (blocking)
- Approved requirement / acceptance criterion protected: REQ-002, REQ-006, AC-004, AC-008, AC-009; BEH-001, BEH-002, BEH-004; Principle 11 (derived consumers), Principle 13 and 1 ("the one rule", "mirrors").
- Evidence (all opened):
  1. `userLaunchSelectionDtoSchema` is `z.object({llmModelIdentifier, llmConfig, selectedAt}).strict()` in `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts:87`; the team contract has the twin `UserLaunchSelectionDto` in snake_case (`team-execution-view-dtos.ts:84`). The Agent/task DTOs (`taskAgent`, `taskTeamMember`, `taskTeam`) and the live event `delegated_launch_selections_changed` (`selection: userLaunchSelectionDtoSchema`) are `.strict()`. The web parses them (`existingRunConfigResultActions.ts:47`, `teamRunContextHydrationService.ts:268`, `teamExecutionTreeMutations.ts`). Adding `runtimeKind` to a stored choice or `pendingRuntimeSwitch` to a member without changing these schemas either leaves the web unaware (it shows the started runtime with the new model) or, if serialized, fails the parse of the whole tree for any pending member.
  2. The effective-launch rule is repeated: server `effectiveCopyAgentLaunch`, `collaborationCopyAgentLaunch` and `teamCopyAgentLaunch` (contracts, each commented "mirrors the server's"), with web call sites in `agentSourceSelectors.ts:77,141` and `delegatedLaunchRows.ts:102,114`. D-3 and the Ownership Map say the server rule is "the only place". Updating the server rule alone leaves two mirrors and four web sites ignoring the runtime.
  3. Discovery: four lists (`teamMembers`, `orgMembers`, `taskTeamMembers`, `agentRuns`). The first three take the runtime from location read models (`teamLocations.listAgents()`, `orgLocations.listAgents()` → `configuredPlacement.launchConfiguration`; `taskTeams.listTaskTeams()` → member `launchConfiguration`) that carry no pending field; for a task Agent it reads `taskAgent.runtimeKind` (`:148`), the **started** runtime (`task-agent-own-records.ts:58`), which never changes (M-3). After a copy's switch commits, the journal target is the old runtime, so the new era's files are rendered with the wrong rules (AC-008).
  4. `buildRuntimeSwitch(metadata: AgentRunMetadata)` (`runtime-switch.ts:33`) cannot be called by the handle (members have no `AgentRunMetadata`).
- Required update: add to Change Scope, the mapping, the size rationale and the change sequence: (a) both contracts packages (schemas, types, tests, and their built `dist`, which the server and web consume), with a decision for each DTO: `UserLaunchSelectionDto.runtimeKind` (optional), the member and copy DTOs' pending (a flag is enough only if the web never needs `from`; say which), the live selection event; (b) one decision for the rule triplication: either extend each mirror (and say the contracts' tests are the guard) or reduce to one rule the other places call; either way D-3 must state all copies; (c) the web call sites; (d) the location read models and a rule for discovery: the runtime for a task Agent/member is the **effective** runtime (the choice's runtime, else started) and, while pending, `from.runtimeKind`, computed by one function; (e) `buildRuntimeSwitch` over a minimal `{runId, runtimeKind, llmModelIdentifier, pendingRuntimeSwitch}` shape, with the copy's effective launch as `to`; (f) a before/after example for a copy including its wire shape; (g) the sequence: contracts first, then server and web in one cut (DESIGN rule 9).
- Why proportionate: it completes the inventory of a change the design already makes; nothing new is invented.

### ARCH-F-002 — F-02 is inaccurate: Team members are built by a second construction site that wraps the shared handle with its own commit adapter and cached state

- Severity: High (blocking)
- Approved requirement / acceptance criterion protected: REQ-003, REQ-004, AC-005; BEH-003; Principle 1 (several kinds or entry forms), Principle 13.
- Evidence: `RootAgentExecutionRegistry` is "shared by the AgentOrg and Agent roots" (file header) and builds handles at `:300-345`. Team members and Team-hosted task agents are built in `FlatTeamAgentExecutionHandle.createHandle` (`flat-team-agent-execution-handle.ts:160`), which builds its own `execution` spec from its cached `config: TeamRunAgentNode` (`:215-224`), passes its own `commitPlatformBindingChange` adapter (`:175-205`) and holds the session id in `FlatAgentExecutionContext` (`readonly runtimeKind`; `adoptPlatformAgentRunId` throws when a different id is already held). The adapter dereferences `change.binding`/`change.replacement.binding` for the identity check and runs a conflict check against `context.getPlatformAgentRunId()`; a `runtime_switch` change (and its native `binding: null`) breaks both. `replaceModelChoice` has two implementations (handle `:217`, wrapper `:126`) and two callers (`root-agent-execution-registry.ts:249`, `task-agent-execution-registry.ts:101`). Org and Agent roots pass `callbacks.commitPlatformBindingChange` through directly.
- Required update: restate F-02 as "one activation class, two construction sites, two commit paths" and trace DS-003 for both: Team (wrapper → committer → `commitExecutionTreeMutation`) and Org/Agent root (registry → `commitTreeMutation`). Add to the mapping and the decisions: the wrapper's `config`/`executionSpec()` (carry the pending switch), its commit adapter (accept the third kind; identity from `change`, not from `.binding`; conflict rule for the switch), `FlatAgentExecutionContext` (session id; its `readonly runtimeKind` for a running Team with a stopped copy whose runtime changes: name the readers of the member context's runtime or state there are none), both `replaceSelection` implementations and both callers, and the Team committer's third branch (`requiresWrite`, `finalization_indeterminate` apply).
- Why proportionate: it names the real entry forms; the activation class and the 316 sequence stay shared.

### ARCH-F-003 — Commit semantics and the handle's in-memory state after a switch are unspecified, so a second activation switches again

- Severity: High (blocking)
- Approved requirement / acceptance criterion protected: REQ-003, AC-005, AC-006, contract M-2; `MP-1`.
- Evidence: `MP-1`. Also: D-8 and M-2 say a mismatched `switchId` "changes nothing"; the existing mutators throw `TeamAgentPlatformBindingError(...CONFLICT)` on a mismatch or a missing target (`team-run-execution-tree-mutator.ts:75-87,136-141,157-162`). The handle only commits when `binding && prepared.bindingChange` (`configured-agent-execution-handle.ts:368`) and only checks identity through `binding.execution`; a native target has `binding === null`, so with the design's `null` binding the commit would be skipped unless that condition changes. The staged `prepareConfiguredActivation` (`:234`) calls the same `prepareActivation()` and has no switch handling.
- Required update: (1) after a successful `runtime_switch` commit, every in-memory holder drops the pending switch and takes the committed binding: the handle's `execution` and `platformAgentRunId` (set to `null` for a native target so a stale external id is not cached), the Team wrapper's `config` and `FlatAgentExecutionContext`, and for a copy the `replaceSelection` state; add the test "switch, run ends, next input restores (plan `restore_*`, no second marker)". (2) A mismatched or missing target is a thrown conflict error, like the other kinds, so the activation aborts, releases and discards; say so in D-8/M-2. (3) State the handle's commit condition for the switch case independent of `binding` (clear the pending even when there is no provider binding). (4) `prepareConfiguredActivation` refuses a spec with a pending switch (fresh task copies never have one). (5) The order is the handle's: `begin` → prepare → record → commit → publish; discard only after a confirmed release, keyed to this switch (316 ARCH-F-008). Name that the failure branch in `initializeReady` (`:382-407`) is where the discard goes and that `durabilityCommitted` still means "do not mark retry-safe".
- Why proportionate: it states the state transition the new feature adds to the only stateful object on the spine.

### ARCH-F-004 — Two rules for who gets a pending switch on a copy; the history check is done twice

- Severity: Medium (blocking: it defines persisted state)
- Approved requirement / acceptance criterion protected: REQ-002, REQ-005, AC-004, AC-007; BEH-002, BEH-005; Principle 11 (each fact has one owner), Principle 13 (no behavior by absence).
- Evidence: REQ-002 and AC-004 say a pending switch is recorded "on each affected copy member that **has conversation history**", and D-5 checks it at save with the activity inspector. DEC-5 says "the activation decides marker or no marker from the member's conversation history, **not the save**", and M-6 says a member with no history has its pending cleared by its first activation. For configured members (D-4) the pending is recorded unconditionally. So the fact "this member has history" is decided at save for copies and at activation for everything else; the save path must also reach every follower's memory folder, and `indeterminate` at save is unspecified.
- Required update: choose one rule. Smallest: record the pending switch on every affected copy member that was started (as for configured members) and let the planner decide marker or no marker at activation (M-6 already defines the no-history case); drop the inspector from the copy save; change REQ-002/AC-004 to match. If the save-time check is kept, state why it is needed, what `indeterminate` does, and what a copy member without history and with a stale session id does at its first activation (`replace_external_without_conversation` versus the new plan).
- Why proportionate: it removes a second evaluation of the same fact and aligns requirement and decision.

### ARCH-F-005 — The record-level commit rule would be written three times

- Severity: Low (non-blocking)
- Approved requirement protected: REQ-003, REQ-004; Principle 13 ("the same shape in each root"), Principle 11.
- Evidence: D-8 adds `commitRuntimeSwitchInTree` "per tree family" (Team, Org, standalone/coordinating). Each existing family already repeats adopt/replace (`team-run-execution-tree-mutator.ts`, the Org and Agent counterparts).
- Required update: put the record-level transformation (match by switch id, set binding, remove pending; the throw on mismatch) in `run-history/domain/runtime-selection-rule.ts` beside D-1 and let each family only locate the member (members and every `taskExecutions` list).

### ARCH-F-006 — Citation and inventory corrections

- Severity: Low (non-blocking)
- Items: (1) requirements BEH-001 and the removal plan cite a "cannot change runtime kind" rule in `team-run-model-config-mutator.ts`; the text is in `docs/modules/agent_team_execution.md:165` and the mutator only spreads the old launch, so nothing is removed from code; update the docs; (2) F-06's "Token usage … read the effective runtime; no change" has no citation (the usage context uses the run's config, which is the effective one: say so with the file); (3) `team-run-delegated-launch-plan.ts` and `delegated-launch-selection-service.ts` carry the old names too and belong to the rename list; (4) the size rationale says "library: none" and counts three packages: the contracts packages make it more; (5) `FlatTeamAgentExecutionHandle`'s `activationFence` and `isStopped()` logic means `replaceSelection` needs the same "stopped" guard in both classes.

## Classification

`Design Impact`

## Recommended Recipient

`/software_engineering_team/solution_designer`

## Recommendations (non-blocking)

- Keep the process default for the handle's memory port (a stateless `RuntimeSwitchRecorder`), with a test fake option, as designed. Note the asymmetry with 316 (injected, fails closed) in one sentence.
- The marker/hand-over/chat/journal parts of 316 are reused unchanged, as designed; the built-server cases for a Team member and an Org member should be the first tests, since they exercise the two construction sites.
- Add a test list item for the Team root: stop the Team, switch a member, restart the server, send a message to the member (the pending survives a restart and the first activation switches once).

## Residual Risks

- The web planner and the 14 `userLaunchSelection` sites were not fully read; the first failing tests the design names (F-09 (a), (b)) remain the right start once the inventory is corrected.
- A usage limit cannot be produced on demand; real runs stop members by hand, as in 316.
- Many members switching at once each create their own session at their own next input (stated by the design).

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass` (MP-1 is a supported path; the machinery asked for rests on it)
- Notes: The idea is sound and the reuse of 316 is right: one activation class, one pure rule, a commit kind added to an existing seam, optional fields only. What fails is the factual basis of two premises and an incomplete inventory: Team members have their own construction site and commit adapter (F-02), the web projections are a cross-package strict wire contract with a mirrored rule (F-09 b), and the handle's in-memory state after a commit would make a second activation switch again. I expect a Pass after a revision that fixes ARCH-F-001…004 and takes ARCH-F-005/006, with no change of the approach.
