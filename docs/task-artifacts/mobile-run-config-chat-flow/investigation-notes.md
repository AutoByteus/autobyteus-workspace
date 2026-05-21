# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; design refined after architecture review Round 1
- Investigation Goal: Redesign mobile Start new run so it matches desktop/web configure-then-chat flow, removing redundant Launch Summary and first-message prompt from run configuration without desktop/web regressions.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The change is frontend-mobile focused but crosses setup UI, run creation coordinator, context attachments, team focus timing, and tests.
- Scope Summary: Mobile run configuration becomes create-only; first message moves to Chat; Launch Summary is removed.

## Request Context

The user reviewed the current mobile Start new setup and asked why a Launch Summary exists when the user already selects the same values in the form. The user then clarified that desktop/web works as: configure the run, click Run, the config disappears, then send the first message from Chat. The user also called out that putting `First message` inside configuration is strange because message sending should happen after run creation.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-run-config-chat-flow`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-run-config-chat-flow/docs/task-artifacts/mobile-run-config-chat-flow`
- Current Branch: `codex/mobile-run-config-chat-flow`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-run-config-chat-flow`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-05-21.
- Task Branch: `codex/mobile-run-config-chat-flow`
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Command`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-21 | Command | `git fetch origin --prune && git worktree add -b codex/mobile-run-config-chat-flow ... origin/personal` | Create mandatory dedicated task worktree from latest base | Worktree created from `origin/personal`; branch tracks `origin/personal`. | No |
| 2026-05-21 | Other | User mobile screenshots and clarification in chat | Understand product issue | User sees Launch Summary as redundant and first-message-in-config as inconsistent with desktop/web. | Design change |
| 2026-05-21 | Doc | `tickets/done/mobile-launch-config-member-focus/*` | Review delivered prior task artifacts | Prior task intentionally added runtime/model, focus, summary/readiness, post-pair/focus-memory refinements. New request supersedes the summary and first-message-target parts. | Update design |
| 2026-05-21 | Code | `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | Confirm desktop/web behavior | `handleRun()` calls `teamContextsStore.createRunFromTemplate()` or `contextsStore.createRunFromTemplate()` and clears config. It does not require/send a prompt. | Mobile should align |
| 2026-05-21 | Code | `autobyteus-web/components/mobile/MobileRunSetup.vue` | Inspect current mobile setup | Renders first message textarea, team first-message target, `MobileLaunchSummary`, prompt-based blocking issue, and calls `launchMobileRun({ prompt })`. | Refactor needed |
| 2026-05-21 | Code | `autobyteus-web/components/mobile/MobileLaunchSummary.vue` | Inspect summary card | Repeats target, workspace, runtime/model, first-message target, context count, and blocking issue. | Remove from setup |
| 2026-05-21 | Code | `autobyteus-web/composables/mobile/useMobileRunLaunchCoordinator.ts` | Inspect mobile run creation/send coupling | Creates run then calls `activeContextStore.updateRequirement(...)` and `activeContextStore.send()`. Requires prompt. | Split create from send |
| 2026-05-21 | Code | `autobyteus-web/components/mobile/MobileChat.vue`, `MobileComposerContextTray.vue` | Confirm Chat has normal composer/context surface | Mobile Chat already renders normal agent/team monitor composer and context tray. | First message belongs here |
| 2026-05-21 | Code | `autobyteus-web/composables/mobile/useMobileFileContextCoordinator.ts`, `stores/mobileWorkStore.ts` | Check draft attachment handling | Non-run contexts store attachments in `draftContextAttachments`; active runs show `activeContextStore.currentContextPaths`. Current coordinator consumes draft attachments just before send. | Transfer attachments on create |
| 2026-05-21 | Code | `autobyteus-web/stores/agentContextsStore.ts`, `agentTeamContextsStore.ts` | Verify empty run creation capability | Both stores create selected agent/team contexts from config templates without sending a prompt; team run chooses an initial focused member. | Reuse boundaries |
| 2026-05-21 | Doc | `docs/task-artifacts/mobile-run-config-chat-flow/design-review-report.md` | Consume architecture review Round 1 | Review failed on DRI-001: team draft attachment transfer was not identity-safe after removing setup focus target. | Yes: refine design |
| 2026-05-21 | Code | `autobyteus-web/stores/activeContextStore.ts` | Inspect active context attachment ownership | `activeAgentContext` resolves a team selection to `agentTeamContextsStore.focusedMemberContext`; `currentContextPaths` and `addContextFilePath` are per focused leaf `AgentContext`, not team-run scoped. | Design pending team-run owner |
| 2026-05-21 | Code | `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue`, `AgentUserInputForm.vue`, `AgentEventMonitor.vue`, `AgentTeamEventMonitor.vue` | Inspect first-send hook opportunities | The send button calls `activeContextStore.send()` directly inside shared textarea. A mobile-only before-send hook would need to thread through shared form/monitor components as an optional no-op desktop prop, or an equivalent explicit pre-send bridge. | Specify shared no-op hook if chosen |
| 2026-05-21 | Code | `autobyteus-web/stores/agentTeamRunStore.ts`, `services/runSubmission/localUserSubmission.ts` | Inspect send-time attachment consumption | Team send uses the current focused member route and `contextAttachments`; local submission clears the focused member's `contextFilePaths` after send begins. This supports flushing pending attachments to the selected leaf immediately before send. | Add design details |
| 2026-05-21 | Other | User clarification after observing implementation changed files | Re-check implementation scope boundaries | User is concerned this UI-focused mobile task may be expanding into core/shared files and stores. `mobileWorkStore` is mobile-owned, but shared composer changes must be fallback-only no-op seams if needed at all. | Tighten requirements/design |
| 2026-05-21 | Command | `git diff --name-only`, `git diff --stat`, focused source diffs | Analyze implementation change surface against mobile-shell/no-core principle | Observed mobile-only UI/coordinator/store changes plus one shared composer/monitor optional `beforeSend` seam. No backend/API/runtime/model/core run store source files changed. | Downstream review hot spot |
| 2026-05-21 | Command | `pnpm --dir autobyteus-web test:nuxt run components/agentInput/__tests__/AgentUserInputTextArea.spec.ts components/mobile/__tests__/MobileContextSelectionRegression.spec.ts components/mobile/__tests__/MobileUxRefinement.spec.ts components/mobile/__tests__/MobileRemoteAccessShell.spec.ts` | Validate focused mobile UX and shared seam checks | Passed: 4 files / 43 tests. | Still require downstream desktop/web no-regression review |
| 2026-05-21 | Doc | `docs/task-artifacts/mobile-run-config-chat-flow/mobile-shell-scope-analysis.md` | Record implementation-scope analysis for downstream agents | Analysis concludes implementation is broadly aligned; shared composer/monitor seam is the only caution area and must remain generic optional no-op or be removed. | Send downstream |

## Current Behavior / Current Flow

Current mobile flow:

1. User opens Runs -> Start new.
2. User configures target/workspace/runtime/model.
3. For team, user chooses `First message target` in setup.
4. User types `First message` in setup.
5. Launch Summary repeats setup choices and shows one blocking issue.
6. `useMobileRunLaunchCoordinator` creates a temporary run/team, applies focus/attachments, calls `activeContextStore.send()`, and returns the run context.
7. Setup closes and Chat opens after a message has already been sent.

Desktop/web flow:

1. User configures run in `RunConfigPanel`.
2. User clicks Run.
3. Store creates a selected run/team context from config.
4. Config is cleared/hidden.
5. User sends the first message from Chat.


## Architecture Review Round 1 Finding: DRI-001

The first architecture review approved the core configure-then-chat direction but rejected the draft attachment transition as under-specified for team runs.

Root cause:

- `activeContextStore.activeAgentContext` is not a team-run-level context. For a selected team it resolves to `agentTeamContextsStore.focusedMemberContext`.
- `activeContextStore.currentContextPaths` therefore belongs to the focused leaf agent member.
- If mobile creation consumes draft attachments immediately into that implicit active context, files can attach to the wrong member, disappear when focus changes, or be dropped when the default focused node is a non-leaf subteam and `focusedMemberContext` is null.

Refined design decision:

- Agent run creation remains simple: transfer draft attachments directly into the created agent context.
- Team run creation must move draft attachments into a pending mobile owner keyed by `teamRunId`, not into `activeContextStore`.
- Pending team-run attachments are displayed by the mobile composer context tray regardless of focused member changes before first send.
- On first Chat send, a mobile pre-send bridge flushes pending attachments to the currently focused valid leaf member using explicit `teamRunId + memberRouteKey`, then `activeContextStore.send()` sends normally.
- If the current focus is non-leaf or has no focused member context, send is blocked and pending attachments remain pending.
- Mobile creation should choose a deterministic leaf focus fallback when the store default is non-leaf, so Chat opens with a usable composer when possible.

Scope guardrail after user clarification:

- `mobileWorkStore` is acceptable only as a mobile UI/session owner. It already owns mobile current context and draft attachments; extending it for pending team-run attachments keeps the policy out of core execution stores.
- Core stores must not absorb mobile pending-attachment policy: no change to `activeContextStore.send()` semantics, agent/team run store lifecycle, runtime/model stores, backend/API contracts, or desktop `RunConfigPanel`.
- Shared composer/monitor components should not be changed by default. If the implementation cannot safely intercept mobile first-send preparation from mobile-only code, the only allowed shared touch is an optional no-op callback/slot seam with no mobile imports and no behavior change when absent.

## Design Health Assessment Evidence

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `RunConfigPanel.vue` | Creates run from config without prompt/send. | Desktop/web separates configuration from messaging. | Mobile should reuse this mental model. |
| `MobileRunSetup.vue` | Requires prompt and first-message target, then repeats values in summary. | Mobile mixes config, compose, and review concerns. | Remove prompt/summary; keep config only. |
| `useMobileRunLaunchCoordinator.ts` | Calls `activeContextStore.send()` during creation. | Coordinator owns both creation and first message. | Split to create-only; Chat owns send. |
| `MobileComposerContextTray.vue` | Chat already shows context files for active run. | Draft context can be transferred to Chat after creation. | Transfer attachments on create. |
| `agentTeamContextsStore.createRunFromTemplate()` | Creates team with default focused member. | Setup does not need `First message target`; user can change focus in Chat. | Use Chat focus bar before send. |
| `activeContextStore.currentContextPaths` | For team selection, paths belong to the currently focused leaf `AgentContext`. | Team attachments cannot be transferred through implicit active context at create time. | Add pending team-run attachment owner and explicit flush. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/mobile/MobileRunSetup.vue` | Mobile setup form | Mixed config, first prompt, first-message target, summary. | Must become config-only. |
| `autobyteus-web/components/mobile/MobileLaunchSummary.vue` | Full summary/review card | Repeats form values. | Remove from Start new; delete if unused. |
| `autobyteus-web/components/mobile/MobileTeamLaunchFocusPicker.vue` | First message target setup field | Belongs to message/focus workflow, not config. | Remove from setup; existing focus bar handles Chat focus. |
| `autobyteus-web/composables/mobile/useMobileRunLaunchCoordinator.ts` | Mobile create+send coordinator | Requires prompt and sends immediately. | Redesign as create-only coordinator. |
| `autobyteus-web/components/mobile/MobileChat.vue` | Chat surface | Already hosts normal composer/monitor and context tray. | First prompt belongs here. |
| `autobyteus-web/stores/mobileWorkStore.ts` | Mobile context/draft attachments | Draft attachments exist for non-run contexts. | Attachments must move to active run on create. |
| `autobyteus-web/components/workspace/config/RunConfigPanel.vue` | Desktop config/run action | Creates run without prompt. | Model to match. |

## Runtime / Probe Findings

No runtime command was needed beyond code inspection for this design turn. The exact implementation will need focused component tests and browser/API validation.

## External / Public Source Findings

No external/public sources consulted; issue is local UX/design alignment in this repository.

## Findings From Code / Docs / Data / Logs

1. Mobile summary was added to make launch choices explicit, but after runtime/model controls became visible it now duplicates the form.
2. The `First message` field turns run creation into message send, unlike desktop/web.
3. The team `First message target` selector is only necessary because setup sends immediately. Once first message moves to Chat, existing team focus controls become the right owner.
4. Draft context attachments still need a transition path so user-selected files are not lost when setup creates a run.
5. Team draft attachments require a different transition than agent attachments: pending by `teamRunId` until a focused leaf member is selected at first send.

## Constraints / Dependencies / Compatibility Facts

- Desktop/web no-regression remains mandatory.
- Mobile runtime/model selection must remain in setup.
- Mobile Chat must remain the only place where a user prompt is sent.
- Mobile team focus must remain available before first send, but in Chat rather than setup.
- Team draft attachments must not be bound to an implicit focused member during creation; attachment send identity must be explicit (`teamRunId + memberRouteKey`) or pending.

## Open Unknowns / Risks

- Empty mobile-created runs may be temporary until first send; validation should compare desktop behavior and ensure the user is not confused.
- If `activeContextStore.currentContextPaths` depends on an active run context immediately after store creation, attachment transfer order must be tested.
- Some existing mobile tests encode prompt-on-launch behavior and will need intentional updates.
- A shared optional before-send hook may be needed in the composer component chain; it must default to no-op for desktop/web to preserve behavior.

## Notes For Architect Reviewer

Review should focus on whether the design cleanly separates mobile run configuration from chat message sending while preserving the previous runtime/model/focus functionality. The key boundary corrections are: mobile run creation uses config stores and run context stores only; Chat composer owns `activeContextStore.send()`; team draft attachments stay pending at `teamRunId` scope until flushed to an explicit focused leaf member at first send.
