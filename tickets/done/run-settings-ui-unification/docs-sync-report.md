# Docs Sync Report — run-settings-ui-unification

## Scope

- Ticket: `run-settings-ui-unification` (Large / High, Reviewed route)
- Trigger: code_reviewer delivery handoff after CRR-009 (implementation), API-REV-003 (API/E2E round 3, 95%) and CRR-010 (test-code review, no findings); docs impact flagged `Yes`.
- Bootstrap base reference: `origin/personal@19dee40b3`
- Integrated base reference used for docs sync: `origin/personal@68261f811`, merged into the ticket branch as `68cd341e9` (after delivery checkpoint `636af064d`).
- Post-integration verification reference: `evidence/delivery/web-suite-68cd341e9.log` and `evidence/delivery/guards-68cd341e9.log`. The failing-file set is identical to the validated `a92004c9e` run; the guards exit 0.

## Why Docs Were Updated

- **Summary:** the implementation removed the Agent/Team/Org launch forms, the draft run config editor, the workspace selector, `useRunActions`, the `@` target mode and the old Org run-config store. These are replaced by:
  - New chat as the Agent/Team start surface;
  - the Org launch page;
  - one start intent (`useRunStart`);
  - one launch readiness rule;
  - the Member settings drawer;
  - the redrawn saved-run settings;
  - mention-only `@`;
  - "+" copy semantics;
  - Fast mode (other model settings).

  Seven long-lived web docs still described the removed owners and components, and some described behavior that is now wrong:
  - "+" on an Agent "does not copy the run";
  - a Team copy failure "stays on the source screen";
  - Org approval "defaults unchanged";
  - New chat `@` "picks the launch target".
- **Why this should live in long-lived project docs:** these are the canonical frontend ownership and behavior references used for future design and review. Leaving them stale would preserve an obsolete understanding of the start paths and owners.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/agent_orgs.md` | Org run configuration, owners, component list | Updated | Reviewer-flagged |
| `autobyteus-web/docs/agent_execution_architecture.md` | Org store section, workspace selection, existing-run config, form styling, "+" | Updated | Reviewer path `docs/…` is actually `autobyteus-web/docs/…` |
| `autobyteus-web/docs/settings.md` | Workspace selection, existing-run config, form styling, "+" | Updated | Reviewer path `docs/…` is actually `autobyteus-web/docs/…` |
| `autobyteus-web/docs/chat.md` | New chat draft, `@`, launch, run view ⚙/＋, tests | Updated | Not in the reviewer's list; found by the delivery sweep |
| `autobyteus-web/docs/agent_teams.md` | Team launch, Team "+" copy, main files | Updated | Not in the reviewer's list; found by the delivery sweep (it also referenced the removed `RunningAgentsPanel`) |
| `autobyteus-web/docs/agent_management.md` | Agent Run entry, fresh-run approval default | Updated | Not in the reviewer's list; found by the delivery sweep |
| `autobyteus-web/docs/skills.md` | "launch forms" wording | Updated | One phrase |
| `autobyteus-web/docs/projects.md` | Integrated base changed it; checked for overlap | No change | No run-settings content |
| `autobyteus-server-ts/docs/**` | Server contracts | No change | No server change in this ticket; the `prepareAgentRun` hits are a server function |
| Repository root `docs/` | Reviewer-named paths | No change | Those files do not exist at the root; the content lives under `autobyteus-web/docs/` |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `agent_orgs.md` | Section rewrite + owner list | "Run Configuration" is replaced by "Org Launch Page", with: Draft And Launch Owners (`agentOrgLaunchDraftStore` phases/overrides, `agentOrgLaunchService`), REQ-021 initial settings (Auto-approve default), Member Settings (members line, drawer 400–960 px, override fields, Reset), and Readiness (shared rule and its order). The store/component list is updated and the removed form entries are dropped. | Removed owners; new Org start surface on the same route |
| `agent_execution_architecture.md` | Section rewrites | The Org store section is renamed to `agentOrgLaunchDraftStore`. "Editable Run Workspace Selection" is replaced by "Start Surfaces And Run Workspace Choice" (`useRunStart`, `RunWorkspaceChoice`, `runWorkspaceChoice.ts` converters). Existing-run config now uses the container/view split, ⚙ is hidden for `temp-*`, and `discardChanges`/`reloadCanonical`/`useRunStopAction` are covered. The fixed-path paragraph no longer names `FixedWorkspacePath`. The form-styling and "Member overrides (N)" text is replaced by the chat controls, the drawer and other model settings (Fast mode). The `ModelConfigSection` scope is narrowed. "New Run From Existing Run" is rewritten. A pre-existing broken anchor (`settings.md#existing-run-model-configuration`) is fixed. | Removed components; changed "+" behavior |
| `settings.md` | Section rewrites | The workspace selection section is replaced by "Run Workspace Choice On Start Surfaces". Existing Run Configuration now covers the saved-run view: header, badge, stop icon wording, lock icons, locked-runtime model menu, Members, Save bar, state copy. The Team fixed-workspace paragraph is updated. The form-styling and Team Members Override text is replaced. "New Run From Existing Run" is rewritten. | Removed components; saved-run redesign |
| `chat.md` | Section rewrites + new section | Intro: New chat is the Agent/Team start surface. New Chat Draft: a start-intent table and the copy/carry rules. Footer order, the Fast chip and the readiness label are updated, and `@` is mention-only. A new "Start Surfaces" section covers the heading switcher, members line and Show tools. Team launch now applies the overrides, catalogs and mentions. Run view: "+" copies the agent on screen, and ⚙ uses the saved-run view (hidden for `temp-*`). `useComposerMentionMenu` and `ComposerMentionMirror` are documented. The test list gains the new specs and the `run-settings-live` probe. | Behavior and owner changes |
| `agent_teams.md` | Section rewrites | Standalone Team Launch now goes through New chat with the members drawer. The approval-default owner and the Org default are updated. The Team "+" copy now goes through `useRunStart.copyTeamRun` and falls back to defaults on failure; the dead `RunningAgentsPanel` reference is removed. The main files list is updated. | Behavior and owner changes |
| `agent_management.md` | Paragraph updates | The Agent card Run opens New chat. The approval default owner is documented, and Orgs now default to on. Form wording is changed to start surfaces. | Behavior change (REQ-005, REQ-021) |
| `skills.md` | Wording | "launch forms" → "start surfaces" | Removed concept |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Single start intent | Every Run, "+" and heading switch goes through `useRunStart`. The two draft owners never call each other. | design-spec DS-001..005, Ownership Map | `agent_execution_architecture.md`, `chat.md` |
| Org launch ownership | Draft store (phases, stale-key guard) plus a stateless launch service. The view never launches. | design-spec DS-002; AF-004 | `agent_orgs.md` |
| Shared launch readiness | One rule (`resolveScopesReadiness`) and its order across New chat and the Org page, including every member's effective runtime | DI-004 (SR-010); CR-004 | `agent_orgs.md#readiness`, `chat.md`, `agent_teams.md` |
| Workspace representation boundary | `RunWorkspaceChoice` is the only draft shape. Conversions happen only in `runWorkspaceChoice.ts`. | design-spec AR-004 | `agent_execution_architecture.md`, `settings.md` |
| "+" semantics | Agent copies the displayed config (the host or an `@` collaborator). Team uses `loadTeamRunLaunchSeed`. Org uses `sourceOrgRunId`. A failure falls back to defaults. Copied settings are kept, and a model change is the cleanup boundary. | REQ-013; CR-001; CR-004 | `settings.md`, `agent_execution_architecture.md`, `chat.md`, `agent_teams.md` |
| Mention-only `@` and draft candidates | The client mirror of `CollaboratorCandidatePolicy` for New chat. The first send keeps its mentions. | REQ-011/012; AR-001 | `chat.md` |
| Other model settings (Fast mode) | Separate from the thinking keys: independent of Thinking, reset on a model change | REQ-022; AF-012 | `agent_execution_architecture.md`, `chat.md` |
| New browser-local keys | `autobyteus.chat.memberPanelWidth`, `autobyteus.chat.startToolsOpen` | design-spec Persisted Data | `agent_orgs.md`, `chat.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `stores/agentOrgRunConfigStore.ts` | `stores/agentOrgLaunchDraftStore.ts` + `services/agentOrgExecution/agentOrgLaunchService.ts` | `agent_orgs.md`, `agent_execution_architecture.md` |
| `AgentOrgRunConfigPanel.vue`, `AgentOrgRunConfigForm.vue`, `AgentOrgDirectAgentOverrideRow.vue` | `components/run-settings/OrgLaunchPage.vue` + Member settings drawer | `agent_orgs.md` |
| `AgentRunConfigForm.vue`, `TeamRunConfigForm.vue`, `TeamScopeConfigEditor.vue`, `TeamMemberConfigTree.vue`, `MemberOverrideItem.vue`, `MemberOverridesDisclosure.vue` | New chat + `RunMembersLine`/`RunMemberSettingsDrawer`; `ExistingRunSettings` for saved runs | `chat.md`, `agent_teams.md`, `settings.md` |
| `DraftRunConfigEditor.vue` and the `RunConfigPanel` pending/draft branches | No catalog `temp-*` drafts remain. ⚙ is hidden for a failed-first-send `temp-*` context. | `chat.md`, `settings.md`, `agent_execution_architecture.md` |
| `WorkspaceSelector.vue`, `FixedWorkspacePath.vue`, `AutoApproveSwitch.vue`, `WorkspaceSelectorModel.ts` | `ChatWorkspaceMenu` + `RunWorkspaceChoice`, `ChatApprovalToggle`, locked rows | `agent_execution_architecture.md`, `settings.md` |
| Form-model projections (`editable*/existing*FormModel`, `TeamRunFormModel`, `TeamRunFormDisplay`) | `utils/runSettings/runMemberTree.ts` | `agent_execution_architecture.md` |
| `composables/useRunActions.ts` | `composables/runSettings/useRunStart.ts` | `chat.md`, `agent_execution_architecture.md` |
| `RunningAgentsPanel`, `AgentLibraryPanel`, `RunningAgentGroup`, `RunningRunRow` (unmounted) | — (dead code removed) | `agent_teams.md` (stale reference removed) |
| `useRunMentionMenu`, the New chat "Chat with" `@` target mode | `useComposerMentionMenu` + `useMentionCandidates` + `ComposerMentionMirror`; heading switcher for the target | `chat.md` |
| "Member overrides (N)" / "Team Members Override" disclosures | Members line + Member settings drawer | `agent_orgs.md#member-settings` |
| New chat "Files are saved in …" line; "Kept from the saved run" | Removed (the workspace control names the workspace) | `chat.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: write the handoff summary and request user verification.
- Notes:
  - The docs are uncommitted in the worktree until user verification, then committed with the archived ticket.
  - Out-of-scope observation: `utils/projects/linkableWorkspaces.ts` has no production consumer at the bootstrap base or now. It was documented only as a `WorkspaceSelector` `candidateWorkspaceIds` caller, and that paragraph is removed. This is a pre-existing orphan and not a regression from this ticket.
