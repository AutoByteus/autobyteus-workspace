# Design Review Report — run-settings-ui-unification

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification/tickets/in-progress/run-settings-ui-unification/requirements-doc.md` (Approved, SR-006, unchanged)
- Upstream Investigation Notes: `…/investigation-notes.md` (SF-001..010, AF-001..020)
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001..SR-010)
- Reviewed Design Spec: `…/design-spec.md` (Ready, revised in SR-010; §"SR-010 Addendum" is authoritative where it refines earlier sections)
- Supplemental Task Artifacts Reviewed: Product `ui-ux-spec.md` (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/run-settings-ui-unification/ui-ux-spec.md`, `origin/personal@6718986`); `product-design-request{,-r2,-r3}.md`; `evidence/user-screenshots/*`; `architecture-handoff.md` (including the "Re-review (SR-008)" section)
- Relevant Solution Revision IDs: SR-006 (requirements), SR-007 (design), SR-008, SR-009 and SR-010 (design revisions)
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: 4
- Trigger: `Architecture Design Complete (revised)`, SR-010, from `/software_engineering_team/solution_designer`. It records decisions on Code Review CRR-004 DI-001..DI-006, raised at the user's direction.
- Prior Review Round Reviewed: 3 (ARCH-REV-003, Pass, SR-009/CR-001). Earlier: ARCH-REV-001 Fail (AR-001..004), ARCH-REV-002 Pass.
- Latest Authoritative Round: 4
- Current-State Evidence Basis: the round 1 code reads remain valid, since the worktree is unchanged at `19dee40b3`. Round 2 re-verified:
  - `built-in-agent-registry.ts:5-7,25-35` (three built-in ids);
  - `agentDefinitionStore.sharedAgentDefinitions` (ownership-scope filter);
  - `agentTeamDefinitionStore` `nodes`/`ref`;
  - `AgentWorkspaceView.vue:9,79` (ungated ⚙);
  - `WorkspaceAgentRunsTreePanel.vue:313-316` (tree "+");
  - the SR-008 design sections against `collaborator-candidate-policy.ts`.

- Round 3 evidence (worktree at `396591a37`):
  - Base `AgentWorkspaceView.startNewChatForRun` (`git show origin/personal:…/AgentWorkspaceView.vue`) used `target.context.config`, the agent on screen.
  - `agentRunCollaborationStore.childTargetFor` keeps child contexts outside `agentContextsStore`.
  - `agentRunCollaborationChildContextFactory.createChildContext`: a child config carries `agentDefinitionId`, runtime, model, `llmConfig`, `autoExecuteTools` and workspace metadata from the child's `launchConfiguration`.
  - The current `useRunStart.copyAgentRun` looks up only `agentContextsStore`, which confirms CR-001.
  - `agentOrgLaunchDraftStore` no longer imports `chatDraftStore` (CR-002).
- Round 3 delta reviewed:
  - SR-009 design §Interface Boundary Mapping: `copyAgentFromConfig(config: AgentRunConfig)` replaces `copyAgentRun(runId)`.
  - DS-003.
  - §Workspace Representation Conversion Boundaries (Agent copy row).
  - §Guidance: the copy subject, plus the CR-002/CR-003 resolution notes and the new test.

- Round 4 evidence (worktree head `c37b81de5`):
  - `AppLeftPanel.vue:166-178`: the Chat nav and pencil call `useChatDraftStore().startNewChat()` and then push the route, which confirms the DI-001 gap.
  - `RemoteAgentCard.vue` has no template usage: no `<RemoteAgentCard>`, `<remote-agent-card>` or `AgentsRemoteAgentCard`; it appears only in the Nuxt auto-import registry.
  - `useRunStart.ts:128` exports no `newChat` yet.
  - AF-019/AF-020 evidence exists under `evidence/api-e2e/cross-scope-mentions-N/` (N02/N03 screenshots, logs, evidence JSON) and `web-suite.log`.
  - There is a precedent for a web spec reading server source (`services/runHydration/__tests__/acceptedInputIdentity.spec.ts`), so the DI-002 contract pin fits the repository practice.

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
| `useRunStart.run*` / `copyAgentFromConfig(config: AgentRunConfig)` / `copyTeamRun` / `copyOrgRun` / `switchTarget({kind,id})` / `newChatInWorkspace({agentDefinitionId, workspaceRootPath})` | Pass | Pass | Pass. The Agent copy takes the displayed config snapshot, because the agent on screen may live in either `agentContextsStore` or `agentRunCollaborationStore`. A run-id lookup would have to guess which store. | Low | Pass |
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

- `Pass` (ARCH-REV-004). The SR-010 decisions are sound and proportionate, traceable to approved requirements, and consistent with the existing ownership model. No in-scope machinery depends on an unsupported premise.

## Round 4 Assessment (SR-010 / CRR-004 DI-001..DI-006)

| Item | SR-010 Decision | Review Verdict | Basis |
| --- | --- | --- | --- |
| DI-001 rendered-surface audit | Adopt; new `useRunStart.newChat()` for the AppLeftPanel Chat nav and pencil | Pass | The audit starts from rendered controls and closes the last start-intent bypass, which the boundary rule forbids. It keeps the plain New chat order (REQ-021 "Plain New chat … unchanged"). The ⚙/"+" copy subjects per surface match base behavior and SR-009. The `RemoteAgentCard` exclusion is verified as unrendered; FU-004 is non-blocking. |
| DI-002 client mirror of `@` eligibility | Defer the server query (FU-001); adopt live N03 regression + unit contract pin | Pass | A server query would be a server API change, which the requirements put out of scope (ASM-001) and which needs user approval, so deferral is correct. The two checks give proportionate drift detection for the mirror accepted in ARCH-REV-002. |
| DI-003 first-message mention admission | Resolved: server unit 43/43, live N02/N03 pass | Pass | The AF-009 risk is retired by real evidence. The fallback is correctly classed as a Requirement Gap (it would change REQ-012) with no code built now. The trigger is not reachable today. |
| DI-004 one readiness rule | Adopt `utils/runSettings/launchReadiness.ts` over the `runMemberTree` effective scopes, for both surfaces | Pass | It removes duplicated readiness policy between `chatLaunchService` and `agentOrgLaunchDraftStore`. It uses the existing AC-002 copy and ordering, and the Org topology-blocked reason maps to the UIS-004 unavailable state. Per-member runtime blocking applies AC-002 to member overrides that REQ-009 introduces in chat. It catches a failure before launch without new copy or policy, consistent with the preserved "Launch validation" boundary. |
| DI-005 validation slices S1–S6 | Adopt | Pass | Each slice maps to ACs with the required evidence. AC-012/AC-015 run with every slice. |
| DI-006 (a) `ChatModelMenu` two modes | Accept | Pass | One owner with a shared search/list/keyboard path, under 500 lines. A split would duplicate code or add a base for one variant. |
| DI-006 (b) start orders → `startModelDefaults` | Adopt | Pass | This realizes the design's original allocation. The store keeps staleness and generation only. |
| DI-006 (c) `AgentOrgExperience.vue` size | Defer (FU-002) | Pass | Pre-existing (base 497 lines); this change adds one line. |
| DI-006 (d) Team draft message carrier | Accept (FU-003) | Pass | Pre-existing and tested. Replacing it reaches composer and upload ownership beyond scope. |
| DI-006 (e) `chatModelOptions` → `utils/runSettings/modelOptions.ts` | Adopt | Pass | It fixes the dependency direction: utils no longer import components. |

## Findings

None open.
- AR-001..AR-004 are resolved (ARCH-REV-002).
- CR-001 design coverage was verified in ARCH-REV-003.
- DI-001..DI-006 are verified here.

## Classification

N/A (Pass).

## Recommended Recipient

- `/software_engineering_team/implementation_engineer` applies the SR-010 deltas:
  - `newChat()`;
  - `launchReadiness`;
  - the two module moves;
  - the contract pin.
- Then a targeted code review, and API/E2E resumes on the new head.
- `/software_engineering_team/solution_designer` receives an informational notice.

## Residual Risks

- The web client mirror of server `@` eligibility remains until FU-001. Drift is detected by the N03 live regression and the built-in id contract pin.
- Readiness rule consolidation (DI-004) moves Team-chat and Org readiness onto one rule. The S1/S2 slices must show that the AC-002 copy and order are unchanged, and that the topology-blocked case shows the unavailable state.
- Named follow-ups FU-001..FU-004 are outside this ticket.
- The web suite has 11 baseline failing files (AF-020). New failures must be attributed per slice.
- The mobile specs (AC-015) and the localization audit run with every slice.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`.
  - P-001 is resolved and is now also live-proven (N03).
  - P-002 is Not Reachable.
  - P-003 is resolved.
  - The DI-003 fallback trigger is Not Reachable today, so no machinery is built.
- Notes: ARCH-REV-004. Implementation applies the SR-010 deltas, then targeted code review, then API/E2E on the new head.
