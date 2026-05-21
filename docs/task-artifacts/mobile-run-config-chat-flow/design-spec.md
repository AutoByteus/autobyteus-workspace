# Design Spec

## Current-State Read

Mobile Start new currently uses a create-and-send flow:

`MobileRuns.vue -> MobileRunSetup.vue -> useMobileRunLaunchCoordinator.launchMobileRun({ ..., prompt }) -> createRunFromTemplate(...) -> activeContextStore.send() -> Chat`

This differs from desktop/web:

`RunConfigPanel.vue -> agent/team config store readiness -> createRunFromTemplate() -> clear config -> selected run/chat -> user sends from composer`

Current mobile issues:

- `MobileRunSetup.vue` mixes run configuration and message composition by rendering a `First message` textarea and requiring a prompt before launch.
- `MobileTeamLaunchFocusPicker.vue` exists as `First message target` only because setup immediately sends the first prompt. Once the message moves to Chat, the existing team focus bar is the correct place to choose the member.
- `MobileLaunchSummary.vue` repeats the target/workspace/runtime/model/first-message target values already visible in form controls. The useful part is a single blocking readiness message.
- `useMobileRunLaunchCoordinator.ts` creates the run and sends immediately, which gives it responsibility for both run creation sequencing and first-message dispatch.
- Draft context attachments are consumed immediately before send. In the new flow agent draft attachments can transfer to the created agent run, but team draft attachments cannot be consumed into `activeContextStore` at creation because `activeContextStore` points at the currently focused leaf member, not at the team run.
- Architecture review Round 1 identified DRI-001: after removing setup's team first-message target, team draft attachments need an explicit pending team-run owner or explicit `teamRunId + memberRouteKey` target. The design now chooses pending team-run ownership until first Chat send.

Constraints:

- Preserve desktop/web run configuration and chat behavior.
- Preserve the prior mobile runtime/model selection work.
- Preserve mobile team focus ability, but move first-message targeting to Chat.
- Preserve draft context attachment behavior across the setup -> Chat transition.
- Treat this as a mobile-shell change, not a core runtime/send refactor. Do not change backend/API contracts, `activeContextStore.send()` semantics, agent/team run store lifecycle semantics, runtime/model store semantics, desktop `RunConfigPanel`, or desktop composer behavior.

## Intended Change

Redesign mobile Start new to match desktop/web:

1. `MobileRunSetup.vue` becomes a configuration-only form.
2. Remove `First message` textarea from setup.
3. Remove team `First message target` from setup.
4. Remove `MobileLaunchSummary` from setup and decommission/delete it if unused.
5. Replace the summary card with a compact readiness/action area near the create button: one blocking reason, optional context attachment count/chips only when draft files exist, and no repeated form rows.
6. Change the mobile coordinator from create-and-send to create-only:
   - validate config-store readiness;
   - create agent/team context from template using existing store boundaries;
   - for team runs, ensure the initial mobile Chat focus is a valid leaf member, falling back deterministically when the store default is non-leaf;
   - transfer agent draft attachments directly to the created agent context;
   - move team draft attachments to a pending team-run attachment owner keyed by `teamRunId`;
   - clear the relevant config store as desktop does;
   - return a `MobileWorkContext` and open Chat.
7. Chat remains the sole owner of the first user prompt via the normal composer and `activeContextStore.send()`.
8. Existing team focus bar remains available on Chat so the user can choose the member before sending the first message. Pending team-run attachments stay visible when focus changes and flush to the selected focused leaf immediately before send.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UX Cleanup.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue and Duplicated Policy/Coordination.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence: Desktop `RunConfigPanel` creates runs without prompts; mobile setup requires prompts and the mobile coordinator sends immediately. The Launch Summary duplicates the same form values. Architecture review DRI-001 adds that team draft attachment transfer must not use implicit active context because it is focused-member scoped.
- Design response: Split mobile run creation from message sending. Keep config in setup; move first prompt to Chat; replace full summary with compact readiness; keep team draft attachments in a pending `teamRunId` owner until the selected focused leaf is known at first Chat send.
- Intentional deferrals and residual risk: Backend persistence of empty runs is not changed here; if empty temporary runs are not listed in history before first message, that can match desktop as long as Chat opens immediately.

## Core / Shared Change Budget

This task is intentionally bounded to mobile UI/session behavior.

Allowed:

- Mobile presentation changes in `components/mobile`.
- Mobile creation coordination changes in `composables/mobile`.
- Mobile-only session state in `mobileWorkStore`, limited to draft/pending context attachments and current mobile context metadata.
- Reuse of existing run creation and send boundaries without changing their semantics.

Forbidden:

- Changing `activeContextStore.send()` behavior, parameters, or lifecycle semantics.
- Moving pending mobile team attachment policy into `activeContextStore`, agent/team run stores, runtime/model stores, backend persistence, or API contracts.
- Changing desktop `RunConfigPanel` or desktop/web configure -> run -> chat behavior.
- Adding mobile imports or mobile store dependencies to shared composer/monitor components.

Shared composer/monitor files are fallback-only. If implementation cannot prepare pending team attachments from mobile-only code, the only permitted shared touch is a tiny optional no-op callback/slot seam that is absent on desktop/web and proves identical behavior when absent. Code review must treat shared composer changes as a no-regression hot spot.

## Terminology

- `Run configuration`: target, workspace, runtime/model, and existing config-store readiness.
- `Run creation`: creating/selecting an agent or team run context from the configured template without sending a prompt.
- `First message`: the first user prompt sent from the Chat composer after run creation.
- `Draft context attachments`: files attached while the user is in a non-run context before a run exists.

## Legacy Removal Policy (Mandatory)

- Policy: no backward compatibility for the old mobile prompt-on-launch flow.
- Remove the setup `First message` textarea, `First message target` setup picker, and full `Launch summary` card from the steady-state mobile Start new flow.
- Tests that assert prompt-on-launch behavior must be rewritten to assert create-then-chat behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Mobile user configures an agent run | New agent run opens on Chat with empty composer | `agentRunConfigStore` + mobile creation coordinator | Restores desktop-equivalent configure -> run flow. |
| DS-002 | Primary End-to-End | Mobile user configures a team run | New team run opens on Chat with focus control visible | `teamRunConfigStore` + `agentTeamContextsStore` | Restores desktop-equivalent team configure -> run flow. |
| DS-003 | Primary End-to-End | User sends first message after creation | Message is sent from Chat composer to selected agent/focused member | `activeContextStore.send()` | Keeps message sending owned by Chat, not setup. |
| DS-004 | Return-Event | Draft context files exist before agent run creation | New agent Chat composer shows those files on the active agent context | `mobileWorkStore` + active context store | Preserves agent context attachments without summary. |
| DS-005 | Bounded Local | Setup readiness changes | One compact readiness message/button state updates | `MobileRunSetup.vue` | Replaces redundant summary with actionable validation. |
| DS-006 | Primary End-to-End | Draft context files exist before team run creation and focus changes before first send | Pending team-run attachments stay visible and flush to selected leaf member at first send | `mobileWorkStore` pending team attachments + mobile Chat pre-send bridge | Preserves team attachments with explicit identity after setup focus removal. |

## Primary Execution Spine(s)

- DS-001: `MobileRuns Start new -> MobileRunSetup agent config -> agentRunConfigStore readiness -> createMobileRunFromConfig -> agentContextsStore.createRunFromTemplate({ selectionMode: 'mobile' }) -> transfer draft attachments -> MobileWorkContext(agent-run) -> Chat`
- DS-002: `MobileRuns Start new -> MobileRunSetup team config -> teamRunConfigStore.launchReadiness -> createMobileRunFromConfig -> agentTeamContextsStore.createRunFromTemplate({ selectionMode: 'mobile' }) -> valid leaf initial focus resolution -> move draft attachments to pendingTeamRunAttachments[teamRunId] -> MobileWorkContext(team-run) -> Chat`
- DS-003: `Chat composer -> activeContextStore.updateRequirement/user input -> activeContextStore.send() -> agent/team send path`
- DS-004: `Files/draft attach -> mobileWorkStore.draftContextAttachments -> agent run creation -> active agent context.contextFilePaths -> MobileComposerContextTray`
- DS-005: `Setup selections/config stores -> blockingIssue computed -> compact readiness text + disabled create button`
- DS-006: `Files/draft attach -> mobileWorkStore.draftContextAttachments -> team run creation -> mobileWorkStore.pendingTeamRunAttachments[teamRunId] -> MobileComposerContextTray shows pending -> focus changes keep pending -> mobile pre-send bridge flushes to focused leaf context -> activeContextStore.send()`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Agent setup validates target/workspace/model. Create action creates/selects the agent run without sending. Chat opens ready for the first message. | Setup, agent config store, creation coordinator, agent context, Chat | `agentRunConfigStore` for config; coordinator for creation sequencing | Workspace picker, runtime/model card, draft attachments |
| DS-002 | Team setup validates target/workspace/team runtime readiness. Create action creates/selects the team run without sending. Chat opens with current/default focus; user can change focus before sending. | Setup, team config store, team context store, focus bar, Chat | `teamRunConfigStore` and `agentTeamContextsStore` | Runtime catalog sync, focus memory/default, draft attachments |
| DS-003 | The first prompt is typed and sent only from Chat, using the same composer/send path as existing runs. | Chat composer, active context, agent/team send path | `activeContextStore` | Team focused member state, context attachments |
| DS-004 | Files attached before an agent run exists are carried into the newly created active agent context and visible in the composer tray. | Draft attachments, active agent context paths, composer tray | `mobileWorkStore` and active context store | Attachment dedupe/removal |
| DS-005 | Setup displays a single actionable missing-choice message instead of a full repeated summary. | Setup form, readiness message, create button | `MobileRunSetup.vue` | Error display, button label |
| DS-006 | Files attached before a team run exists become pending team-run attachments. They are not bound to an initial member. Focus changes leave them visible, and the first Chat send flushes them to the selected focused leaf member. | Pending team attachments, focus bar, pre-send bridge, focused leaf context, send | `mobileWorkStore` pending team attachment owner + mobile Chat bridge | Leaf validation, non-leaf focus fallback, dedupe |

## Spine Actors / Main-Line Nodes

- `MobileRunSetup.vue`: configuration-only form and compact readiness owner.
- `agentRunConfigStore`: authoritative agent config/readiness owner.
- `teamRunConfigStore`: authoritative team config/readiness owner.
- `RuntimeModelConfigFields` via `MobileLaunchRuntimeModelCard`: runtime/model field semantics.
- `useMobileRunLaunchCoordinator.ts` or renamed `useMobileRunCreationCoordinator.ts`: mobile run creation sequencing owner.
- `agentContextsStore` / `agentTeamContextsStore`: run/team context creation owners.
- `mobileWorkStore`: mobile current context, draft attachments, and pending team-run attachments owner.
- `MobileChat.vue` / normal composer: first-message owner and mobile pending-team-attachment pre-send bridge host.
- `activeContextStore`: actual send boundary.

## Ownership Map

- `MobileRunSetup.vue` owns setup layout, target/workspace/config selection, and compact readiness display. It must not own prompt text.
- `useMobileRunLaunchCoordinator.ts` should be narrowed to creation-only or renamed. It owns creation sequencing, context construction, config clearing, and attachment transfer. It must not call `activeContextStore.send()`.
- `activeContextStore` owns message sending. Setup must not bypass Chat by sending automatically.
- `MobileTeamMemberFocusBar` owns user-facing focused-member changes for opened team runs. Setup must not render a first-message target field.
- `mobileWorkStore` owns draft attachments before creation. After creation, active agent context owns agent attachments, while `mobileWorkStore.pendingTeamRunAttachmentsByTeamRunId` owns team attachments until first Chat send.
- A mobile Chat pre-send bridge owns flushing pending team-run attachments to the explicit selected `teamRunId + memberRouteKey` leaf context immediately before `activeContextStore.send()`. It blocks send and keeps pending attachments if the focus is not a valid leaf.
- `mobileWorkStore` is not a core execution store in this design. Its new responsibility is mobile session/UI state only; it must not own backend persistence, agent/team lifecycle, runtime/model selection, or send semantics.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `createMobileRunFromConfig(...)` / narrowed `launchMobileRun(...)` | Config stores + run context stores | One mobile action from setup to selected run context | Prompt sending or first-message text |
| `activeContextStore.send()` | Agent/team run stores | Normal Chat send facade | Run setup validation or config creation |
| `flushPendingTeamRunAttachmentsBeforeSend(teamRunId)` | `mobileWorkStore` + active/focused leaf context | Apply pending team-run files to selected leaf before first send | Prompt sending, run creation, or core send semantics |
| `MobileTeamMemberFocusBar.vue` | `agentTeamContextsStore` | Choose focused member before sending | Run configuration fields |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `First message` textarea in `MobileRunSetup.vue` | First prompt belongs in Chat | Normal Chat composer | In This Change | Remove prompt from readiness and draft. |
| `MobileTeamLaunchFocusPicker.vue` from setup | First-message target belongs to Chat focus control | `MobileTeamMemberFocusBar.vue` on Chat | In This Change | Component may be deleted if unused. |
| `MobileLaunchSummary.vue` from setup | Repeats visible form choices | Compact readiness/action area | In This Change | Delete if unused. |
| Prompt field in `MobileRunLaunchDraft` | Setup no longer sends prompt | Create-only draft shape | In This Change | Update tests/mocks. |
| `activeContextStore.send()` inside mobile creation coordinator | Creation must not send | Chat composer send path | In This Change | Keep attachment transfer separate from send. |
| Generic `transferDraftAttachmentsToActiveRun()` for teams | Active context is focused-member scoped and unsafe for teams | Agent-specific transfer plus pending team-run attachment owner | In This Change | Team flush uses explicit `teamRunId + memberRouteKey` at send time. |

## Return Or Event Spine(s) (If Applicable)

- Create return: `createRunFromTemplate -> selection store selects temp run -> coordinator builds MobileWorkContext -> MobileRuns closes setup -> MobileRemoteAccessShell/selectContext opens Chat`.
- First message return: `Chat composer send -> stream/backend may promote temporary run id -> existing run promotion handling updates selection/context`.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `MobileRunSetup.vue`
  - Chain: `target/workspace/runtime/model changes -> config store readiness -> blockingIssue -> compact readiness message -> create button disabled/enabled`
  - Why it matters: replaces full summary while keeping actionable validation.
- Parent owner: mobile creation coordinator
  - Chain: `created agent run -> consume draft attachments -> active agent context.contextFilePaths -> Chat composer tray`
  - Why it matters: preserves agent file context without sending a prompt.
- Parent owner: mobile pending team attachment bridge
  - Chain: `created team run -> move draft attachments to pendingTeamRunAttachments[teamRunId] -> Chat tray displays pending -> focus changes leave pending intact -> mobile pre-send bridge validates focused leaf -> copy pending to focused member contextFilePaths -> clear pending -> activeContextStore.send`
  - Why it matters: team attachments are team-run scoped until the selected leaf member is known.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Runtime/model fields | DS-001, DS-002 | Config stores | Edit model/runtime before creation | Required run config | Setup would create hidden defaults again |
| Agent draft attachments | DS-004 | Chat composer/send path | Carry files into created agent context | User may attach before agent run exists | Attachments could be lost or summary-dependent |
| Pending team-run attachments | DS-006 | Mobile Chat/send bridge | Keep team draft files visible across focus changes, then flush to selected leaf at send | Team focus is chosen after setup | Attachments could bind to wrong member or vanish |
| Focus selector | DS-002, DS-003 | Team context/chat | Choose focused member before message send | Team messages need target member | Setup would reintroduce first-message target |
| Compact readiness | DS-005 | Setup action | Show why create is disabled | Replaces summary | Repetition/noise returns |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Agent/team run creation | `agentContextsStore.createRunFromTemplate`, `agentTeamContextsStore.createRunFromTemplate` | Reuse | Desktop already uses these boundaries | N/A |
| Runtime/model readiness | `agentRunConfigStore`, `teamRunConfigStore` | Reuse | Existing authoritative config stores | N/A |
| First message sending | Chat composer + `activeContextStore.send()` | Reuse | Existing send boundary | N/A |
| Team member focus | `MobileTeamMemberFocusBar` + `agentTeamContextsStore` | Reuse | Existing opened-run focus owner | N/A |
| Readiness display | `MobileRunSetup.vue` compact area | Create local | Summary is too broad/redundant | Needs setup-specific compact UI |
| Team draft attachment holding | `mobileWorkStore` draft attachment state | Extend | Mobile store already owns draft/non-run attachments and mobile-only state | Active context store is focused-member scoped and unsafe for team-run pending attachments |
| Pre-send pending flush | Mobile Chat/composable first; shared composer seam only if unavoidable | Prefer mobile-only; fallback to optional no-op shared seam | Need to apply pending team attachments at the exact selected member identity before send | Creation time is too early because focus can change; shared code must not own mobile policy |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Mobile work shell | Start new config-only flow and compact readiness | DS-001, DS-002, DS-005 | Mobile presentation | Extend | Remove summary/prompt. |
| Launch configuration | Runtime/model/workspace readiness | DS-001, DS-002 | Config stores | Reuse | No new state shape. |
| Mobile run creation coordination | Create selected run and transfer draft attachments | DS-001, DS-002, DS-004 | Run context stores | Refactor | No send call. |
| Chat/composer | First message, context tray, and mobile pending-team pre-send flush | DS-003, DS-004, DS-006 | Active context store + mobile pending owner | Extend mobile; shared fallback only | Prefer mobile-only interception. If shared hook is necessary, it must default to no-op for desktop and contain no mobile policy. |
| Team focus | Focused member selection | DS-002, DS-003 | Team context store | Reuse | Available in Chat. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/mobile/MobileRunSetup.vue` | Mobile setup | Config-only form | Remove prompt/summary/first-message target, compute compact readiness, call create-only coordinator | Existing affected form | Config stores, runtime card |
| `autobyteus-web/components/mobile/MobileLaunchSummary.vue` | Obsolete mobile summary | N/A | Delete/decommission if unused | Summary is no longer a steady-state owner | N/A |
| `autobyteus-web/components/mobile/MobileTeamLaunchFocusPicker.vue` | Obsolete setup focus picker | N/A | Remove from setup; delete if unused | Chat focus owns message target | N/A |
| `autobyteus-web/composables/mobile/useMobileRunLaunchCoordinator.ts` | Mobile creation | Create-only coordinator | Validate stores, create selected run/team, transfer agent draft attachments, move team draft attachments to pending team-run owner, clear config, return context | Existing coordinator path | Config/run stores, mobile pending attachment store |
| `autobyteus-web/components/mobile/MobileRuns.vue` | Runs/start-new surface | Setup host | Close setup after create and select Chat context | Existing host | MobileRunSetup |
| `autobyteus-web/components/mobile/MobileChat.vue` | Chat surface | First message owner / pre-send bridge host | Normal composer remains where prompt is entered; passes mobile before-send hook for pending team attachments | Existing chat owner | Active context store, pending attachment bridge |
| `autobyteus-web/stores/mobileWorkStore.ts` | Mobile state | Draft/pending attachments/current context | Draft attachments consumed on create; pending team-run attachments keyed by `teamRunId` persist until first send | Existing mobile-only session state owner; not a core execution store | ContextAttachment |
| `autobyteus-web/composables/mobile/useMobileFileContextCoordinator.ts` | Mobile file context | Visible attachment resolver | Show pending team-run attachments for team contexts before first send; route remove/clear/add to pending when pending exists | Existing mobile attachment coordinator | `mobileWorkStore`, active context store |
| `autobyteus-web/composables/mobile/useMobilePendingTeamRunAttachments.ts` | Mobile team attachment bridge | Pre-send flush owner | Validate focused leaf, copy pending attachments to focused member context, clear pending, expose pending visibility helpers | Keeps identity logic out of presentation | `teamRunId + memberRouteKey` |
| `autobyteus-web/components/agentInput/AgentUserInputTextArea.vue` / `AgentUserInputForm.vue` / monitors | Shared composer | Fallback-only optional pre-send seam | Only if mobile-only interception is not feasible: invoke optional no-op callback before `activeContextStore.send()`; desktop passes nothing; no mobile imports | Existing send path | Mobile-specific state or mobile policy |
| `autobyteus-web/components/mobile/__tests__/*` | Validation | Mobile regression tests | Update prompt-on-launch and summary expectations | Existing tests encode old flow | N/A |

## Ownership Boundaries

- Setup can validate config readiness but cannot own prompt text or send messages.
- Creation coordinator can create/select runs but cannot call the message send boundary.
- Chat composer owns first-message text and send timing.
- Team focus belongs to the opened team run surface, not pre-run setup.
- Agent attachment transfer is creation coordination. Team attachment transfer is pending mobile state plus a Chat pre-send flush because the selected focused member can change after creation.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `agentRunConfigStore` | Agent config/readiness | Setup, coordinator | Local setup-only runtime/model state | Bind to store |
| `teamRunConfigStore` | Team config/readiness | Setup, coordinator | Setup-specific readiness copy | Use launchReadiness |
| `agentContextsStore` / `agentTeamContextsStore` | Run context creation | Coordinator, desktop panel | Sending prompt to force run creation | Use createRunFromTemplate |
| `activeContextStore.send()` | Message dispatch | Chat composer | Setup calling send automatically | Move send to Chat |
| `mobileWorkStore` | Mobile draft attachment state and mobile pending team-run attachment state | Files/setup/coordinator/Chat bridge | Summary owning attachment state, activeContextStore owning team-run pending files, or backend/core stores owning mobile pending policy | Store pending team attachments by `teamRunId` as mobile session state only |
| Mobile Chat pre-send bridge | Pending team attachment flush | MobileChat/composer | Creation-time implicit active context transfer for teams | Flush with explicit `teamRunId + focusedMemberRouteKey` immediately before send |

## Desktop/Web Non-Regression Contract

- Do not change desktop `RunConfigPanel` UX or semantics.
- Do not add mobile prompt/summary concepts to desktop.
- Desktop tests for `RunConfigPanel`, `TeamRunConfigForm`, and chat/focus surfaces must continue to pass.

## Dependency Rules

Allowed:

- `MobileRunSetup.vue` may depend on config stores, runtime/model card, target picker, and create-only coordinator.
- The coordinator may depend on config stores, run context stores, selection store, workspace store, mobile store, and active context store for agent context attachment transfer only. For teams it must write pending attachments to mobile store, not active context paths.
- Chat continues to depend on `activeContextStore.send()` via existing composer/monitor components.

Forbidden:

- `MobileRunSetup.vue` must not include prompt text state.
- The mobile creation coordinator must not call `activeContextStore.send()`.
- Setup must not require a first-message target.
- The compact readiness area must not reintroduce a full repeated summary.
- Team run creation must not call `activeContextStore.addContextFilePath` for draft attachments.
- Pending team attachments must not be flushed without a valid focused leaf member route key.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `createMobileRunFromConfig(draft)` or narrowed `launchMobileRun(draft)` | Mobile run creation | Create and select configured run without sending | Agent: `{ kind, agentDefinitionId, workspaceId }`; Team: `{ kind, teamDefinitionId, workspaceId }` plus optional hidden initial focus from current context if needed | No prompt field. |
| `transferDraftAttachmentsToAgentRun(runId)` | Agent attachment transition | Move draft attachments into created active agent context paths | Agent run id | Private inside coordinator or mobile attachment helper. |
| `moveDraftAttachmentsToPendingTeamRun(teamRunId)` | Team pending attachment transition | Move draft attachments into pending mobile team-run owner | Team run id | Does not require member route. |
| `flushPendingTeamRunAttachmentsToFocusedMember(teamRunId, memberRouteKey)` | Team attachment send preparation | Copy pending attachments to selected focused leaf member and clear pending | Explicit team run id + member route key | Called from mobile before-send hook. |
| `activeContextStore.send()` | Message send | Send composer prompt after creation | Current active context and composer input | Not called by setup. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Create-only mobile run method | Yes | Yes | Low | Remove `prompt` from draft. |
| Agent attachment transfer helper | Yes | Yes | Low | Agent run id identity is explicit. |
| Pending team-run attachment move | Yes | Yes | Low | Team run id identity is explicit; no member binding yet. |
| Pending team-run flush | Yes | Yes | Low | Requires explicit `teamRunId + memberRouteKey` and validates leaf context. |
| `activeContextStore.send()` | Yes | Yes | Low | Chat-only use for first prompt. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Mobile create coordinator | `useMobileRunCreationCoordinator` or narrowed `useMobileRunLaunchCoordinator` | Yes if renamed; Medium if not | Medium | Prefer rename or clear method name `createMobileRunFromConfig`. |
| Setup action | `Create run` / `Start run` | Yes | Low | Avoid `Launch run` if it suggests sending prompt. |
| Readiness display | `MobileRunSetupReadiness` inline area or local markup | Yes | Low | Do not call it summary. |
| Pending team attachments | `pendingTeamRunAttachmentsByTeamRunId` | Yes | Low | Name states team-run scope and pending status. |

## Applied Patterns (If Any)

- Coordinator/facade: mobile creation coordinator sequences store validation, run creation, attachment transfer, and context return.
- Presentation wrapper: mobile setup remains a presentation over existing config stores.
- Clean-cut removal: remove prompt-on-launch and summary rather than hiding them behind options.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/mobile/MobileRunSetup.vue` | File | Mobile setup | Config-only run setup and compact readiness | Existing affected component | Prompt textarea, launch summary |
| `autobyteus-web/composables/mobile/useMobileRunLaunchCoordinator.ts` | File | Mobile creation | Create selected run without sending | Existing affected coordinator | Prompt send |
| `autobyteus-web/components/mobile/MobileRuns.vue` | File | Runs tab | Host setup and open returned context | Existing host | Summary logic |
| `autobyteus-web/components/mobile/MobileChat.vue` | File | Chat | First message UX | Existing chat surface | Run config fields |
| `autobyteus-web/stores/mobileWorkStore.ts` | File | Mobile state | Draft attachments and pending team-run attachments source | Existing mobile UI/session owner | Run creation/send logic, backend persistence, core execution policy |
| `autobyteus-web/composables/mobile/useMobilePendingTeamRunAttachments.ts` | File | Mobile attachment bridge | Flush pending team-run attachments to explicit focused leaf before send | Mobile-only identity concern | Prompt sending itself |
| shared composer components | Files | Shared send UI | Fallback-only optional pre-send seam with no-op default | Existing send button owner; touch only if mobile-only interception is not feasible | Mobile store dependency, mobile branching, changed desktop behavior |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Run creation | `Create run -> Chat opens -> user types first message` | `Setup requires prompt -> coordinator sends immediately` | Matches desktop/web and user expectation. |
| Team target | `Create team run -> Chat focus bar shows current member -> user changes focus -> sends` | `Setup asks for First message target` | Keeps focus with opened-run messaging surface. |
| Readiness | One line: `Choose a workspace before creating the run.` | Full card repeating target/workspace/model | Reduces mobile noise. |
| Agent context files | Draft attachments transfer to active agent Chat tray | Context count only in summary | Preserves context while removing summary. |
| Team context files | Draft attachments become pending by `teamRunId`; focus can change; before-send flush uses selected leaf route | Creation coordinator adds files to whatever focused member is active initially | Prevents wrong-member and non-leaf attachment loss. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `First message` optional in setup | Could preserve old mobile path | Rejected | First message is Chat-only. |
| Keep Launch Summary collapsed | Less disruptive than deletion | Rejected for Start new | Compact readiness replaces it. |
| Keep first-message target in setup for teams | Could pre-target first prompt | Rejected | Chat focus bar handles it before send. |
| Coordinator sends empty prompt | Might force backend run persistence | Rejected | Create run only; first send must be user-authored. |
| Transfer team draft attachments to initial focused member at creation | Simpler because current active context APIs already exist | Rejected | Focus can change before first send and default focus can be non-leaf; use pending team-run owner. |

## Derived Layering (If Useful)

- Presentation: `MobileRunSetup`, compact readiness, Chat composer.
- State/readiness: config stores and mobile store.
- Coordination: create-only mobile coordinator.
- Send/runtime: existing active context and agent/team run stores after user sends.

## Migration / Refactor Sequence

1. Update `MobileRunSetup.vue`:
   - remove `prompt` ref, textarea, and prompt validation;
   - remove `MobileTeamLaunchFocusPicker` import/render and selected first-message target state;
   - remove `MobileLaunchSummary` import/render;
   - add compact readiness/action area with one blocking issue and optional draft attachment count/chips;
   - update setup helper copy to describe configuration only;
   - change action label to `Create run` or `Start run`.
2. Update mobile run draft types in `useMobileRunLaunchCoordinator.ts`:
   - remove `prompt` and required `focusedMemberRouteKey` from public setup draft;
   - validate target/workspace/runtime readiness only;
   - create run/team from template;
   - optionally apply current remembered focus if starting from a team context and valid, otherwise use store default;
   - transfer agent draft attachments to active agent context paths;
   - move team draft attachments to pending team-run attachment state;
   - ensure team initial focus is a valid leaf fallback when the default is non-leaf;
   - clear relevant config store;
   - return `MobileWorkContext` with summary such as `New agent run` / `New team run`.
3. Ensure `MobileRuns.vue` closes setup and selects the returned context so `preferredTabForMobileContext` opens Chat.
4. Remove/decommission `MobileLaunchSummary.vue` and `MobileTeamLaunchFocusPicker.vue` if unused.
5. Extend mobile attachment handling:
   - add `pendingTeamRunAttachmentsByTeamRunId` actions to `mobileWorkStore`;
   - update `useMobileFileContextCoordinator` / `MobileComposerContextTray` to show/remove pending team attachments for team-run contexts before first send;
   - add a mobile pre-send bridge that flushes pending team attachments to `teamRunId + focusedMemberRouteKey`;
   - first try to keep send-time interception entirely in mobile code;
   - if shared composer/monitor files must be touched, thread only an optional no-op callback/slot seam with no mobile imports, no store dependency, and no behavior change when absent.
6. Update tests:
   - remove expectations for `mobile-run-prompt`, prompt in launch draft, and `mobile-launch-summary`;
   - add create-only tests proving `activeContextStore.send()` is not called;
   - add Chat transition and draft attachment transfer tests;
   - keep desktop config tests unchanged.
7. Run focused mobile and desktop no-regression suites.

## Key Tradeoffs

- Removing first-message target from setup means users choose team focus in Chat after creation. This is more consistent and still supports the original need to message an individual member.
- Empty run creation may feel like an extra step compared with send-on-launch, but it matches desktop/web and avoids mixing configuration with composition.
- Compact readiness loses the always-visible review list, but the form fields themselves remain visible and are the source of truth.

## Risks

- If temporary empty runs are not persisted to backend history until first send, validation must ensure the opened Chat remains stable and understandable.
- Agent attachment transfer needs careful ordering after run selection; team pending attachment flush needs careful send-time ordering before `activeContextStore.send()`.
- Test fixtures must be updated comprehensively because existing tests assert prompt-on-launch.

## Guidance For Implementation

- Keep the runtime/model implementation intact; remove only redundant summary/message coupling.
- Do not call `activeContextStore.send()` from setup/coordinator.
- Do not require prompt text for create button enablement.
- Use Chat focus bar for team member selection before first send.
- Keep team draft attachments pending by `teamRunId` until the send-time focused leaf is known.
- Validate focused leaf identity before flushing pending team attachments; block send and retain pending attachments if invalid.
- Keep pending attachment state in `mobileWorkStore` only as mobile session/UI state; do not move this policy into core stores or backend contracts.
- Avoid shared composer/monitor changes when possible. If unavoidable, keep them to an optional no-op seam and include explicit desktop/web non-regression tests.
- Prefer deleting unused components over leaving hidden compatibility code.
- Recommended validation:
  - `components/mobile/__tests__/MobileUxRefinement.spec.ts`
  - `components/mobile/__tests__/MobileContextSelectionRegression.spec.ts`
  - `components/mobile/__tests__/MobileRemoteAccessShell.spec.ts`
  - new/updated test: draft team attachments -> create team -> change focus -> first send includes attachments
  - `components/workspace/config/__tests__/RunConfigPanel.spec.ts`
  - `components/workspace/config/__tests__/TeamRunConfigForm.spec.ts`
  - store tests for `agentContextsStore`, `agentTeamContextsStore`, and active context send boundaries as needed.
