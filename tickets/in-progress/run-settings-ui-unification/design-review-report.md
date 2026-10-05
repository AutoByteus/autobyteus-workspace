# Design Review Report — run-settings-ui-unification

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification/tickets/in-progress/run-settings-ui-unification/requirements-doc.md` (Approved, SR-006, unchanged)
- Upstream Investigation Notes: `…/investigation-notes.md` (SF-001..010, AF-001..016)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001..SR-008)
- Reviewed Design Spec: `…/design-spec.md` (Ready, revised in SR-008)
- Supplemental Task Artifacts Reviewed: Product `ui-ux-spec.md` (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/run-settings-ui-unification/ui-ux-spec.md`, `origin/personal@6718986`); `product-design-request{,-r2,-r3}.md`; `evidence/user-screenshots/*`; `architecture-handoff.md` (including the "Re-review (SR-008)" section)
- Relevant Solution Revision IDs: SR-006 (requirements), SR-007 (design), SR-008 (design revision)
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: `Architecture Design Complete (revised)` from `/software_engineering_team/solution_designer` after ARCH-REV-001 (Fail)
- Prior Review Round Reviewed: 1 (ARCH-REV-001, Fail: AR-001..AR-004)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: the round 1 code reads remain valid, since the worktree is unchanged at `19dee40b3`. Round 2 re-verified:
  - `built-in-agent-registry.ts:5-7,25-35` (three built-in ids);
  - `agentDefinitionStore.sharedAgentDefinitions` (ownership-scope filter);
  - `agentTeamDefinitionStore` `nodes`/`ref`;
  - `AgentWorkspaceView.vue:9,79` (ungated ⚙);
  - `WorkspaceAgentRunsTreePanel.vue:313-316` (tree "+");
  - the SR-008 design sections against `collaborator-candidate-policy.ts`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: about 30 changed and about 20 removed production files. Every Run/"+" entry point and route is rewired. Org launch orchestration moves out of a view. Team overrides move into the chat draft. The first-message mention path changes.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none. The evidence matches the code: AF-001/002/004/005 are confirmed, and the consumer grep agrees with the Removal Plan.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`. Round 2 confirms DS-006 and the entry-point inventory are now coherent.
- Approved requirements / intended behavior understood: Yes.
  - Agents and Teams start only from New chat, with the first message.
  - Orgs start only from the Org launch page, with no recipient.
  - Member overrides are compact and drawer-based.
  - `@` is mention-only and lists Agents and Teams only.
  - Saved runs are redrawn in the same vocabulary.
  - REQ-022 adds other model settings.
  - The old forms are removed (REQ-018).
- Relevant existing behavior and evidence confirmed: Yes. AF-001..AF-016 match the code. AF-013 (server eligibility), AF-014 (built-in ids), AF-015 (tree "+") and AF-016 (ungated ⚙) were re-verified.
- Scope guardrail confirmed: Yes.
  - In scope: UC-001..006.
  - Out of scope: mobile, Applications, definition preferences, and server semantics.
  - Preserved boundary: launch validation, the AGY lock, saved-run editability, and `RuntimeModelConfigFields` consumers.
  - Review authority: the standard rules.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: N/A. No open findings remain; AR-001 traced to REQ-012, AC-007, AC-004 and BEH-006.
- Remaining material ambiguity: none at the requirements level.

| Behavior ID | Kind | Design Alignment | Trigger / Current-State Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass (AF-001) | Pass (DS-001) | Confirmed | — |
| BEH-002 | User | Pass | Pass (AF-005; `buildChatTeamLaunchConfig` is root-only; `createDraft(config)` accepts overrides) | Pass (DS-001, DS-008) | Confirmed | — |
| BEH-003 | User | Pass | Pass (AF-004; `agentOrgRunConfigStore`, `AgentOrgRunConfigPanel`) | Pass (DS-002) | Confirmed | — |
| BEH-004 | User | Pass | Pass (AF-007/008; cached lifecycle only applies locks, so a reload after stop is justified) | Pass (DS-004) | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | User | Pass | Pass (AF-009, AF-013) | Pass: `draftMentionEligibility` mirrors `CollaboratorCandidatePolicy` (AR-001 resolved) | Confirmed | — |
| BEH-007 | User | Pass | Pass (AF-002, AF-015) | Pass (DS-003; tree "+" → `useRunStart.newChatInWorkspace`) | Confirmed | — |
| BEH-008 | User | Pass | Pass | Pass (Removal Plan) | Confirmed | — |
| BEH-009 | User | Pass | Pass (AF-012) | Pass (`chatModelOptions` separate from the thinking adapter) | Confirmed | — |
| REQ-019 | User | Pass | Pass | Pass (DS-005) | Confirmed | — |
| REQ-020 | User | Pass | Pass | Pass (DS-007) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Clear | Linked To Core Artifacts | Internally Complete | Consistent With Core Artifacts | Status / Approval Clear | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Product `ui-ux-spec.md` + VIS-001..042 (`6718986`) | Pass | Pass | Pass | Pass. The UIS-001 tree "+" is now inventoried. | Pass (user-confirmed SR-001/003/005) | — |
| `product-design-request{,-r2,-r3}.md` | Pass | Pass | Pass | Pass | Pass (history, not behavior-defining) | — |
| `evidence/user-screenshots/*` | Pass | Pass | Pass | Pass | Pass (evidence only) | — |

The investigation notes' supplement inventory is now consistent (R-2 resolved).

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | `Larger Requirement`; design issue found | — |
| Root-cause classification is explicit and evidence-backed | Pass | Duplicated policy (two control families, five approval variants). Boundary issue (Org orchestration in a view, AF-004, confirmed: about 360 script lines). | — |
| Refactor decision is explicit | Pass | Refactor needed now | — |
| Refactor decision is reflected in the concrete design | Pass | `useRunStart`, two draft owners, `agentOrgLaunchService`, `runMemberTree`, Removal Plan | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade vs Owner | Naming | Ownership | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Agent/Team start | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Org start | Pass | Pass | Pass (`pages/workspace.vue` branch is a thin facade) | Pass | Pass | Pass | Pass |
| DS-003 | "+" copy | Pass | Pass | Pass | Pass | Pass | Pass | Pass (tree "+" via `newChatInWorkspace`) |
| DS-004 | Saved-run edit/stop | Pass | Pass | Pass (container/view) | Pass | Pass | Pass | Pass |
| DS-005 | Switcher carry | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | `@` mentions | Pass | Pass (one eligibility rule plus an example) | N/A | Pass | Pass | Pass | Pass |
| DS-007 | Start-surface tools | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-008 | Member drawer | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear | Internals Stay Internal | Bypass Risk Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `useRunStart` | Pass | Pass | Pass | Pass | The tree panel now calls `newChatInWorkspace` (AR-002 resolved). |
| `agentOrgLaunchDraftStore.launch` → `agentOrgLaunchService` | Pass | Pass | Pass | Pass | — |
| `chatLaunchService.launch*Chat` | Pass | Pass | Pass | Pass | — |
| `existingRunConfigStore` | Pass | Pass | Pass | Pass | — |
| `useComposerMentionMenu` + `useMentionCandidates` | Pass | Pass | Pass | Pass | The New chat candidates come from the pure rule `utils/collaborators/draftMentionEligibility.ts`. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Direction Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| run-settings views | Pass | Pass | Pass | Pass | — |
| draft stores | Pass | Pass (no chat↔Org store coupling; Org store → `runWorkspaceChoice`, not `chatLaunchService`) | Pass | Pass | — |
| launch services → run stores | Pass | Pass | Pass | Pass | — |
| mobile / Applications | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `useRunStart.run*` / `copy*Run` / `switchTarget({kind,id})` / `newChatInWorkspace({agentDefinitionId, workspaceRootPath})` | Pass | Pass | Pass | Low | Pass |
| `chatDraftStore.startForDefinition` / `setTeamMemberOverride` | Pass | Pass | Pass | Low | Pass |
| `agentOrgLaunchDraftStore.start` / setters / `readiness` / `launch` | Pass | Pass | Pass | Medium, mitigated by separate team and agent setters | Pass |
| `agentOrgLaunchService.launch(snapshot)` | Pass | Pass | Pass | Low | Pass |
| `existingRunConfigStore.discardChanges` / `reloadCanonical` | Pass | Pass | Pass | Low | Pass (R-1 adopted: reuses the canonical loaders) |
| `buildRunMemberTree.forTeam` / `forOrg` / `forSavedRun` | Pass | Pass | Pass | Low | Pass |
| `useMentionCandidates` / `draftMentionCandidates(target, catalogs)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Chat draft and launch | Pass | Pass | N/A | Pass | — |
| Org draft / launch side effects | Pass | Pass | Pass (moved out of the view, not new behavior) | Pass | — |
| Saved-run editing | Pass | Pass | N/A | Pass | — |
| Inheritance helpers | Pass | Pass | N/A | Pass | — |
| Mention candidates | Pass | Pass | Pass (a pure mirror of the server policy; the built-in ids are in one constant pointing to the server registry) | Pass | The server remains the authority at admission. |
| Stop / seeds / tools | Pass | Pass | Pass | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem | Allocation Clear | Decision Sound | Serves Right Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `components/run-settings/` | Pass | Pass | Pass | Pass | — |
| `composables/runSettings/` | Pass | Pass | Pass | Pass | — |
| `utils/runSettings/`, `types/runSettings/` | Pass | Pass | Pass | Pass | — |
| `services/agentOrgExecution/`, `services/workspace/` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure | Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RunWorkspaceChoice` + `runWorkspaceChoice` | Pass | Pass | Pass | Pass | The conversions are named (AR-004 resolved). |
| Override types (`AgentConfigOverride`, `TeamScopeConfigOverride`) | Pass | Pass | Pass | Pass | — |
| `runMemberTree` | Pass | Pass | Pass | Pass | — |
| `startModelDefaults`, `chatModelOptions` | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RunWorkspaceChoice` vs `WorkspaceSelectionState` / `TeamWorkspaceSelection` | Pass | Pass | Pass | N/A | Pass | §Workspace Representation Conversion Boundaries names each converter in `runWorkspaceChoice.ts` and its only callers. Views and `runMemberTree` never import the older shapes. |
| `ChatDraft.teamAgentOverrides` | Pass | Pass | Pass | N/A | Pass | — |
| `OrgLaunchDraft` | Pass | Pass | Pass | N/A | Pass | — |
| `RunMemberNode` | Pass | Pass | Pass | Pass (`forSavedRun` variant) | Pass | — |

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New and changed files in the Final File Responsibility Mapping | Pass | Pass | N/A | Pass | — |
| Entry-point callers list | Pass | Pass | N/A | Pass | Includes `WorkspaceAgentRunsTreePanel.vue`. |
| `RunConfigPanel.vue` (reduced) / `AgentWorkspaceView` header | Pass | Pass | N/A | Pass | ⚙ is hidden for `temp-*` (`isTemporaryRunId`), with a test. |

## Subsystem / Folder / File Placement Verdict

| Path | Placement Clear | Folder Matches Boundary | Mixed / Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `components/run-settings/` | Pass | Pass | Low | Pass | — |
| `composables/runSettings/` | Pass | Pass | Low | Pass | — |
| `utils/runSettings/`, `types/runSettings/` | Pass | Pass | Low | Pass | — |
| `components/chat/chatModelOptions.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Old forms and sub-forms | Pass | Pass | Pass | Pass | The grep confirms there are no out-of-scope consumers. Applications only match by substring (`ApplicationTeamMemberOverrideItem`), consistent with AF-011. |
| Form-model projections and types | Pass | Pass | Pass | Pass | — |
| `useRunActions`, dead panels, layout branches | Pass | Pass | Pass | Pass | — |
| `DraftRunConfigEditor` + `RunConfigPanel` draft/pending branches | Pass | Pass | Pass | Pass | AR-003 resolved |
| `@` target mode and copy keys | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Legacy Retention Exists | Clean-Cut Removal Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Launch forms / `useRunActions` / `@` target mode | No | Pass | Pass | Rejection log present |
| `WorkspaceSelectionState` in the Org draft | No | Pass | Pass | — |

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence Sufficient | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Server run configs | Not Affected | Pass | Pass | N/A | Pass | `service_tier` is already a valid `llmConfig` key. |
| New `localStorage` keys (`memberPanelWidth`, `startToolsOpen`) | Not Affected (tolerant reads, disposable) | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Temporary Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| 10-step sequence (foundations → mentions → chat → views → Org → tools → entries → saved runs → copy → tests) | Pass | Pass (none left) | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape Explained | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Start intent, Org launch, Team overrides, stop refresh, Fast mode | Yes | Pass | Pass | Pass | — |
| New chat `@` candidates for a Team target | Yes | Pass | Pass (orphaned-run risk explained) | Pass | Covers the flat and nested team example. |

## Material Premise Validation

### P-001 — A Team New chat `@` mention of a definition already placed in the team is rejected after the Team run is launched

- Related approved requirement or established contract: REQ-011 and REQ-012; AC-004 and AC-007; preserved BEH-006 (running-chat `@` offers "minus what is already in the run", `docs/chat.md` §`@` In A Live Run).
- Relevant behavior ID(s): BEH-006, BEH-002.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger: a user opens New chat for a shared Team whose members include a shared Agent or a nested shared Team. Teams may contain "Team-local and shared Agents" (`docs/agent_teams.md:272`; `TeamMemberRefScope = "shared" | …`, `agent-team-definition.ts:8`). The user types `@` in the approved composer (REQ-011) and chooses that member from the menu.
- Support evidence: the exposed surface is the New chat composer `@` menu. The design's candidate rule is "shared agents (excluding Daily Assistant) + shared teams, minus the current target" (design §Guidance, DS-006), so the member is offered. The supported user action is choose, then Send.
- Forward approved target path:
  1. `chatLaunchService.launchTeamChat` → `teamRunConfigStore.createDraft` → `agentTeamRunStore.sendMessageToFocusedMember({mentions})`.
  2. `launchDraft` creates the Team run.
  3. The send carries the mentions → server `RootTeamRun.admitCollaboratorMentions` → `CollaboratorAdmission.ensure` → `CollaboratorCandidatePolicy.requireAdmissible`.
  4. That policy throws `alreadyInRun` for any definition in `inRunDefinitionIds`. That set holds the root's own definition plus every configured placement (`collaborator-candidate-policy.ts`).
  5. Admission is all or nothing: nothing is posted.
- Lifecycle preconditions and material consequence:
  - The Team run already exists, but its first message is not recorded.
  - Today's `launchTeamChat` catch branch assumes that "the launch failed before any message was recorded". It removes the launch draft, clears the selection and keeps the user on New chat.
  - The launched run is left orphaned, without its message, and a retry launches a second Team run. This violates REQ-012 (the first message keeps its mentions and is delivered) and AC-004 (a failed launch keeps the draft without side effects).
- Reachability: `Reachable`.
- Review consequence / proportionate response: AR-001. Resolved in SR-008 by aligning eligibility, which removes the premise from the normal flow.

### P-002 — A first-send admission rejection for reasons other than "already in this run" (runnability or invalid definition)

- Related approved requirement or established contract: REQ-012.
- Relevant behavior ID(s): BEH-006.
- Initiating basis kind: `System`.
- Independent product-supported initiating trigger: none found in the normal flow. A collaborator placement is validated with the root launch configuration (`collaborator-entry-builder.ts:74,96` clones `rootLaunchConfiguration`). That configuration was accepted for the launch moments earlier, so a runnability failure needs catalog or infrastructure change in between. `COLLABORATOR_MENTION_INVALID` needs the definition to be deleted between menu and send.
- Support evidence: no supported user or system event produces either state on the first send in the normal flow.
- Forward path: N/A.
- Lifecycle preconditions and material consequence: N/A.
- Reachability: `Not Reachable` in the normal flow (treated as infrastructure or contrived timing).
- Review consequence: no new first-send rejection-recovery machinery is required. This is recorded as a residual risk only.

### P-003 — An Agent first send that fails before promotion lands on the `temp-*` context, whose ⚙ opened `DraftRunConfigEditor`

- Related approved requirement or established contract: REQ-018 (editor removal); preserved BEH-001 launch path; existing `launchAgentChat` contract ("a first send that failed before promotion lands on the still-registered `temp-*` context, where its error is shown").
- Relevant behavior ID(s): BEH-001.
- Initiating basis kind: `System`.
- Independent product-supported initiating trigger: the server's `PrepareAgentRun` returns `success: false` or errors, for example on server-side launch validation. This is the supported validation path; see `agentRunStore.ts` `prepareAgentRun` result handling.
- Support evidence: the existing code documents and handles this state.
- Forward path: `ChatNewSurface` Send → `launchAgentChat` → `registerDraftRun(context)` → `sendUserInputAndSubscribe` fails before `promoteTemporaryId` → navigate to the `temp-*` id → the run view shows the error, and ⚙ opens `RunConfigPanel`.
- Lifecycle preconditions and material consequence: after the design removes `DraftRunConfigEditor` and the draft branch, ⚙ on this context has no defined content. The design leaves the choice to implementation (§Risks).
- Reachability: `Reachable`.
- Review consequence: AR-003 (Low). Resolved in SR-008: ⚙ is hidden for `temp-*`.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Investigation notes' supplement inventory | Cross-artifact consistency | Refreshed in SR-008 | Resolved |

## Review Decision

- `Pass`. The behavior basis is confirmed and every round 1 finding is resolved in the canonical design spec. No in-scope machinery depends on an unsupported premise. The design is ready for implementation.

## Findings

None open. The resolution of AR-001..AR-004 is recorded in `architecture-review-revision-record.md` (ARCH-REV-002):

- **AR-001 (resolved).** §Guidance and §Off-Spine Concerns define `draftMentionEligibility`, which mirrors `CollaboratorCandidatePolicy`:
  - eligibility: shared, non-built-in agents and shared teams;
  - exclusion: the target plus its recursive tree placements;
  - the built-in ids match `built-in-agent-registry.ts:5-7`.
  The spec adds an example, unit tests and an API/E2E case, and records P-002 as Not Reachable, so no machinery is added.
- **AR-002 (resolved).** `useRunStart.newChatInWorkspace` keeps today's `startNewChat(preset)` settings rule. The tree panel is listed as its caller.
- **AR-003 (resolved).** ⚙ is hidden for `temp-*` in the `AgentWorkspaceView` header. The error notice and composer retry are kept, with a test.
- **AR-004 (resolved).** §Workspace Representation Conversion Boundaries names the converters and their only callers.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer`. `/software_engineering_team/solution_designer` receives an informational notice.

## Residual Risks

- AF-009: first-message mention admission is proven by code reading only. The API/E2E proof stays mandatory, including the new Team case. A server rejection triggers the escalation (Design Impact).
- The frontend built-in id constant mirrors the server registry by hand. A new server built-in would cause a rejected first-send mention until the constant is updated. The cost is low and visible in tests and review; keep the comment pointing to the server registry.
- First-send rejection for non-eligibility reasons (P-002, Not Reachable in the normal flow) is not handled specially.
- Org readiness relies on server validation instead of per-scope schema gating. Failures surface as "Couldn't start this Agent Org. Try again."
- The test and localization blast radius is large. The mobile specs (AC-015) and the localization audit must stay green.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. P-001 (Reachable) is resolved by the eligibility alignment. P-002 is Not Reachable, so no machinery is required. P-003 (Reachable) is resolved by hiding ⚙.
- Notes: ARCH-REV-002. Proceed to implementation with the cumulative package.
