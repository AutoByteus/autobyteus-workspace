# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Rework investigation/design complete for expanded mobile run setup scope; user approved requirements on 2026-05-24; resubmitting to architecture review
- Investigation Goal: Determine why Android/mobile run setup lacks the web `Auto approve tools` toggle and why workspace selection is narrower than desktop, then define a healthy refactor design for mobile setup parity.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Auto-approve is a local mobile presentation omission, but the workspace selector issue exposes a mobile run setup ownership/refactor problem around workspace selection/loading and context catalog reuse.
- Scope Summary: Refactor mobile new-run setup so auto-approve and workspace selection/loading parity are owned cleanly by mobile launch setup boundaries, without native Android run setup changes.
- Primary Questions To Resolve:
  - Resolved: Android loads the desktop-served `/mobile` Nuxt shell; `MobileRunSetup.vue` owns the shown setup UI.
  - Resolved: Desktop/web `AgentRunConfigForm.vue` and `TeamRunConfigForm.vue` own the existing toggle.
  - Resolved: `autoExecuteTools` carries auto-approval through run config.
  - Resolved: Mobile has the same config field and propagation path but omits the control.
  - Resolved: Mobile setup workspace choices currently derive from `useMobileWorkCatalog.workspaceItems`, which maps `workspaceStore.allWorkspaces` and does not provide desktop-style load-by-path behavior.
  - Resolved: Desktop setup uses `WorkspaceSelector.vue` with existing/new modes and can load a server-side path through `workspaceStore.createWorkspace(...)`.
  - Resolved: The expanded fix should include a mobile launch workspace picker/refactor rather than adding more mixed logic directly to `MobileRunSetup.vue`.

## Request Context

User reports that Android/mobile support exists, but the mobile version appears not to have an auto-approve toggle similar to the web version. Reference image #1 shows mobile `New run` setup with Agent/Team tabs, Agent, Workspace, Runtime, Model, and `Create run`, without `Auto approve tools`. Reference image #2 shows web `Auto approve tools` with a toggle.

Reference files supplied by user:
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_47836b71/solution_designer_31d0dece1fe6b3fb/context_files/ctx_5bb987c363ee__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_47836b71/solution_designer_31d0dece1fe6b3fb/context_files/ctx_5e17193f0fea__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-auto-approve-toggle`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-auto-approve-toggle/tickets/done/mobile-auto-approve-toggle`
- Current Branch: `codex/mobile-auto-approve-toggle`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-auto-approve-toggle`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-05-24.
- Task Branch: `codex/mobile-auto-approve-toggle` tracking `origin/personal`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Work must remain in the dedicated task worktree; do not use the shared `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout for authoritative edits.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-24 | Setup | `pwd && git rev-parse --show-toplevel && git status --short --branch` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Establish initial repository context | Initial checkout is git repo on `personal` tracking `origin/personal`. | No |
| 2026-05-24 | Setup | `git remote -v && git branch -vv && git remote show origin` | Resolve remote/default base branch | `origin` points to AutoByteus workspace; remote HEAD branch is `personal`. | No |
| 2026-05-24 | Setup | `git fetch origin personal` | Refresh tracked remote base before creating task worktree | Fetch succeeded. | No |
| 2026-05-24 | Setup | `git worktree add -b codex/mobile-auto-approve-toggle /Users/normy/autobyteus_org/autobyteus-worktrees/mobile-auto-approve-toggle origin/personal` | Create mandatory dedicated task branch/worktree | Worktree created at `03d7880b`; branch tracks `origin/personal`. | No |
| 2026-05-24 | Other | User reference screenshots | Confirm reported product gap | Mobile setup screenshot lacks `Auto approve tools`; web screenshot contains it. | No |
| 2026-05-24 | Code | `autobyteus-android/README.md` | Determine whether Android owns the missing run setup UI natively | README states Android is a WebView shell for existing `/mobile`; it does not implement agent/team/run/chat behavior natively. | No |
| 2026-05-24 | Code | `autobyteus-web/components/mobile/MobileRunSetup.vue` | Locate mobile new-run setup owner | Renders Agent/Team mode, target picker, workspace picker, runtime/model card, readiness, context attachments, and create button; no `autoExecuteTools` control. | No |
| 2026-05-24 | Code | `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | Compare desktop agent run config behavior | Desktop agent form renders `Auto approve tools` and mutates `props.config.autoExecuteTools`. | No |
| 2026-05-24 | Code | `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | Compare desktop team run config behavior | Desktop team form renders `Auto approve tools` and mutates `props.config.autoExecuteTools`. | No |
| 2026-05-24 | Code | `autobyteus-web/types/agent/AgentRunConfig.ts`, `autobyteus-web/types/agent/TeamRunConfig.ts` | Confirm config field availability | Both config types include `autoExecuteTools`; team member overrides can also carry optional `autoExecuteTools`. | No |
| 2026-05-24 | Code | `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | Confirm launch defaults | `buildAgentRunTemplate` and `buildTeamRunTemplate` both set `autoExecuteTools: false`. | No |
| 2026-05-24 | Code | `autobyteus-web/stores/agentRunConfigStore.ts`, `autobyteus-web/stores/teamRunConfigStore.ts` | Confirm launch buffer ownership | Existing stores own launch config buffers and expose update actions that can assign `autoExecuteTools`. | No |
| 2026-05-24 | Code | `autobyteus-web/composables/mobile/useMobileRunLaunchCoordinator.ts` | Confirm mobile creation path | Mobile creation validates selected config and calls shared context stores to create temporary runs; it does not need a separate mobile draft field. | No |
| 2026-05-24 | Code | `autobyteus-web/stores/agentContextsStore.ts`, `autobyteus-web/stores/agentTeamContextsStore.ts` | Confirm propagation into temporary contexts | Agent and team context creation copy/build configs from existing launch stores; team member configs include effective `autoExecuteTools`. | No |
| 2026-05-24 | Code | `autobyteus-web/stores/agentRunStore.ts`, `autobyteus-web/stores/agentTeamRunStore.ts`, `autobyteus-web/utils/teamRunMemberConfigBuilder.ts` | Confirm backend launch propagation | Agent first-message preparation sends `autoExecuteTools`; team first-message creation sends member configs generated with `autoExecuteTools`. | No |
| 2026-05-24 | Doc | `autobyteus-web/docs/remote_access.md`, `docs/android_mobile_access.md` | Check deployment/freshness constraints for mobile UI changes | Docs state `/mobile` bundle is served by desktop/server and stale `mobile-web/` can make Android show old UI even when APK is current. | No |
| 2026-05-24 | Other | User message: "please fix the mobile problem..." | Confirm approval to proceed beyond analysis | User requested implementation, approving the requirements basis and asking for the fix. | No |
| 2026-05-24 | Other | Architecture review report | Rework failed narrow design | Architecture reviewer failed the narrow design after a scope correction that further refactoring is expected; requested refactor evidence, ownership, removals, and sequence. | Rework design |
| 2026-05-24 | Other | User workspace-selector report | Capture second mobile setup parity gap | User reports mobile new-run setup does not show all desktop-visible workspaces and seems limited to live/active run workspaces. | Rework requirements/design |
| 2026-05-24 | Code | `autobyteus-web/components/mobile/MobileRunSetup.vue` | Locate mobile workspace selector source | `workspaceChoices` is derived from `useMobileWorkCatalog().workspaceItems`; selected workspace id is a local ref synced into agent/team config. | Refactor needed |
| 2026-05-24 | Code | `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts` | Determine mobile workspace catalog semantics | `workspaceItems` maps `workspaceStore.allWorkspaces`; catalog also owns Recent/Agents/Teams/Workspaces for context switcher. | Do not use as launch workspace policy owner |
| 2026-05-24 | Code | `autobyteus-web/stores/workspace.ts` | Determine workspace store fetch/create boundaries | `fetchAllWorkspaces()` calls GraphQL `workspaces`; `createWorkspace({ root_path })` can register/load a workspace and returns a workspace id. | Reuse |
| 2026-05-24 | Code | `autobyteus-server-ts/src/api/graphql/types/workspace.ts`, `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | Understand server workspace list behavior | GraphQL `workspaces` returns active `workspaceManager.getAllWorkspaces()` plus temp creation; workspace manager persists id mappings when creating workspaces but list does not independently enumerate mappings. | Possible backend follow-up if persisted inactive list is required |
| 2026-05-24 | Code | `autobyteus-web/components/workspace/config/WorkspaceSelector.vue`, `RunConfigPanel.vue` | Compare desktop workspace setup parity | Desktop selector has Existing/New modes; non-Electron path still allows manual path load, and `RunConfigPanel` updates agent/team launch config with returned workspace id. | Use as behavior reference |
| 2026-05-24 | Other | User approval message: "then i approve" | Confirm expanded requirements basis | User approved combined scope: mobile available-workspace selection/loading parity plus auto-approve toggle. | Resubmit architecture review |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: User-visible mobile `New run` setup screen.
- Current execution flow: Mobile `/mobile` `Runs` tab opens `MobileRuns.vue` -> `MobileRunSetup.vue`; target/workspace selection syncs the existing `agentRunConfigStore` or `teamRunConfigStore`; `Create run` calls `useMobileRunLaunchCoordinator.createMobileRunFromConfig`; agent/team context stores copy/build configs from those shared launch buffers. First chat send later uses the normal agent/team run stores to prepare backend runs.
- Ownership or boundary observations: `MobileRunSetup.vue` owns presentation and user input for mobile launch setup; launch config stores own configuration state; context stores own temporary run creation; backend launch stores already own GraphQL preparation.
- Current behavior summary: Desktop/web run setup exposes `Auto approve tools`; mobile setup uses the same run config model but only exposes target, workspace, runtime, and model, leaving `autoExecuteTools` at its existing default unless some non-mobile path set it.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature parity + refactor
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect for auto-approve; Boundary Or Ownership Issue + File Placement Or Responsibility Drift for mobile launch workspace/setup refactor
- Refactor posture evidence summary: Refactor is needed now. Directly adding auto-approve plus workspace load/select behavior into `MobileRunSetup.vue` would deepen an already mixed form component. Launch workspace policy also currently borrows `useMobileWorkCatalog`, whose primary owner is context switching/home catalog, not setup-time workspace loading.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshots | Web has `Auto approve tools`, mobile setup does not | Parity gap confirmed by code | No |
| `MobileRunSetup.vue` | No `autoExecuteTools` label, switch, or update handler | Local presentation omission | Add switch bound to active config store |
| Shared config types/stores | Agent/team configs already include `autoExecuteTools` and update actions | Existing boundary can absorb feature | No refactor needed |
| Context/backend launch paths | Agent/team run creation and send paths already consume config values | Backend/schema change not needed for auto-approve | Add propagation tests |
| `MobileRunSetup.vue` workspace derivation | Launch workspace choices come from `useMobileWorkCatalog.workspaceItems` | Boundary/ownership issue for setup-time workspace policy | Extract/reassign launch workspace owner |
| Desktop `WorkspaceSelector.vue` | Desktop can select existing or load a new path | Mobile lacks parity for unlisted workspaces | Add mobile-safe path load |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/mobile/MobileRunSetup.vue` | Mobile new-run setup presentation and user-input orchestration | Missing auto-approval control despite existing active config buffers | Correct target file for UI addition; should not own separate state |
| `autobyteus-web/components/mobile/MobileLaunchRuntimeModelCard.vue` | Compact runtime/model card used by mobile setup | Only owns runtime/model fields | Auto-approval is adjacent launch option; can remain in `MobileRunSetup.vue` unless implementation chooses a small local option section |
| `autobyteus-web/stores/agentRunConfigStore.ts` | Agent launch config buffer | Existing `updateAgentConfig` can assign `autoExecuteTools` | Reuse as authoritative agent config owner |
| `autobyteus-web/stores/teamRunConfigStore.ts` | Team launch config buffer | Existing `updateConfig` can assign `autoExecuteTools` | Reuse as authoritative team config owner |
| `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | Shared launch template defaults | Defaults auto approval to false | Preserve security-sensitive default |
| `autobyteus-web/stores/agentContextsStore.ts` | Agent temporary context creation | Copies selected config into new run | Propagation should work if UI updates launch config |
| `autobyteus-web/stores/agentTeamContextsStore.ts` | Team temporary context creation | Builds member contexts from team config records | Propagation should work if UI updates team config |
| `autobyteus-web/utils/teamRunMemberConfigBuilder.ts` | Effective team member launch record builder | Emits `autoExecuteTools` from member override or global team config | No new team config mapping needed |
| `autobyteus-android/` | Native Android WebView shell, pairing, URL, diagnostics | Does not implement mobile run setup | No native Android source change expected |
| `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts` | Mobile Home/Switch Work catalog: recent, agents, teams, workspaces | Used by setup for workspace choices today, but its natural owner is context switching, not launch workspace loading | Keep for context switcher; stop making it authoritative for launch workspace policy |
| `autobyteus-web/components/workspace/config/WorkspaceSelector.vue` | Desktop run workspace selector with existing/new modes | Provides behavior reference for existing selection and path load | Do not import desktop component into mobile directly; design mobile-safe equivalent |
| `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | Active workspace lifecycle and id mapping | `getAllWorkspaces()` lists active workspace objects; `createWorkspace` persists id mappings | Reuse create path; backend list expansion is a possible follow-up only if needed |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |

## External / Public Source Findings

No external sources consulted.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Pending; may not be needed for design if code path confirms parity gap.
- Required config, feature flags, env vars, or accounts: Pending.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation listed in source log.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- Android native shell delegates run setup to `/mobile`; the missing control lives in web mobile code.
- Desktop forms prove the intended label and existing toggle behavior.
- Existing config and launch propagation are already present; the mobile auto-approve omission is local to mobile setup presentation.
- Mobile workspace selection currently depends on a context catalog and has no path-load parity; this is a broader setup ownership issue.
- Desktop workspace selection has an existing/new mode with manual path load when native folder browsing is unavailable.
- Mobile docs already warn that `/mobile` bundle freshness, not APK freshness alone, determines what Android WebView renders.

## Constraints / Dependencies / Compatibility Facts

- Preserve default `autoExecuteTools: false`.
- Do not add backend schema or runtime behavior changes for auto-approval.
- Do not add native Android run setup code.
- Mobile workspace path entry is a server-side path on the paired node/container, not a phone-local path.
- Prefer existing workspace store boundaries (`fetchAllWorkspaces`, `createWorkspace`) before considering backend changes.
- Any implementation touching `/mobile` needs mobile web bundle freshness validation.

## Open Unknowns / Risks

- Whether backend `workspaces` should enumerate persisted inactive mappings in addition to active workspace objects; current analysis suggests mobile setup can achieve practical parity by adding path-load/select support.
- Whether mobile `Skill Access` parity should be addressed later; current expanded scope covers auto-approve and workspace selection/loading only.
- Whether setup state/config synchronization should be extracted into a composable or only the workspace picker should be extracted; design now recommends extraction where practical to avoid further component bloat.

## Notes For Architect Reviewer

Design recommendation: rework the narrow design into a mobile run setup refactor. Keep `MobileRunSetup.vue` as the shell/orchestrator, add a dedicated mobile launch workspace owner with existing selection plus server-side path load, bind auto-approve through existing config stores, and keep `useMobileWorkCatalog` scoped to context switching/home. Do not create Android-native run setup code. Backend list expansion should remain a follow-up unless implementation proves it is necessary.
