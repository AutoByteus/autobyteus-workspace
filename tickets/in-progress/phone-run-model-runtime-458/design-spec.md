# Design Spec — phone-run-model-runtime-458 (autobyteus-458, with the build items of autobyteus-506)

## Solution And Approval Basis

- Current solution revision ID: `SR-003`
- Approved requirements: `requirements-doc.md` SR-003 (the founder, 2026-11-17, through the approved UI/UX specification; DEC-001 and DEC-003 his; DEC-004 the Solution Designer's from the code).
- Behavior-defining supplement: the Product-owned UI/UX specification `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/phone-conversation-readability-506/ui-ux-spec.md` (Approved; VIS-001…VIS-019; `ui-text-inventory.md`); runnable UI reference: `/Users/normy/autobyteus_org/autobyteus-web-design` branch `personal` `fc68a7a4d2` (reference files: `assets/css/phone-conversation.css`, `components/mobile/views/MobileRunSettings.vue`, `components/mobile/runScreen/MobileRunMenu.vue`, `composables/mobile/usePhoneTextSize.ts`, `components/conversation/AIMessage.vue`, `UserMessage.vue`, `components/workspace/agent/AgentConversationFeed.vue`, `EventMonitorBrowseAssistantRow.vue`, `AgentEventMonitor.vue`, `components/agentInput/AgentUserInputTextArea.vue`). The reference is mocked (invented runs, Settings in memory, a scripted refusal); production uses the node's lists and the stopped-run updates the desktop uses.
- User approval of the design: `Not required` (no visible behavior beyond the approved specification).
- Design status: `Ready`
- Authorities read (2026-11-17): `references/architecture-design.md`; `references/design-principles.md` (re-read after the 2026-11-16 update: Principle 11 "one owner for a picture shown in several places", Case 10); `/DESIGN.md` (read in this conversation; rule 11 tests follow the code); `GLOSSARY.md`; `node_access_model.md` (NA-7, §5).
- Conflicts or discrepancies: none.

## Current-State Read

- Phone shell: `MobilePairedShell.vue:34` routes a run's views by `useMobileNavigation().screen` (`'run' | 'artifacts' | 'files' | 'messages' | 'activity' | 'desktop' | 'new'`, `useMobileNavigation.ts:5-8`); the ⋮ menu is `MobileRunMenu.vue` (Artifacts, Files, Activity, Messages, VNC Viewer).
- Phone conversation: the shared `AgentEventMonitor.vue` and its rows (`AIMessage.vue`, `UserMessage.vue`, `EventMonitorBrowseAssistantRow.vue`, `AgentConversationFeed.vue`, `InterAgentMessageSegment`), with phone-only behavior already gated by `isMobileRemoteAccessRuntime()`.
- Desktop run settings: `ExistingRunConfigEditor.vue` on `useExistingRunConfigStore` (`stores/existingRunConfigStore.ts`, 475 lines: `loadAgentCanonical` / `loadTeamCanonical` / `loadAgentOrgCanonical`, `updateAgentModelConfig`, `updateTeamScopeModelConfig`, `updateAgentOrgScopeModelConfig`, `canSave`, `save`) and `useRunStopAction` (`composables/runSettings/useRunStopAction.ts`: agent, team, agent_org subjects).
- New run rows: `components/mobile/newRun/MobileRuntimeModelRows.vue` (111 lines; `runtimeKind`, `llmModelIdentifier`, `llmConfig` with `update:*` events; the model sheet and "Refresh models" from the product's stores).
- The node: only a stopped run's selection changes; a live run (`isActive: true` for any run the manager holds, idle included, `agent-run-status-projection-service.ts:110-119`) is refused `RUN_ACTIVE` (`studio-run-model-config-service.ts:22,104-107`). GraphQL is open to phone keys (`node-route-permissions.ts:49,94`; 441 not built): no server change.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium` (web only, about 20 files: one phone stylesheet and phone-gated markup in the shared conversation rows; Text size composable and menu block; inter-agent phone variant; composer corner; Settings screen, route and menu entry; two phone catalogs; tests and probe cases).
- Architectural risk: `Low`: no server, contract, persistence or security change; Settings reuses the desktop's owners (store, stop action, New run rows); the conversation changes are phone-scoped styles and markup.
- Escalation trigger: any need to change the node or a GraphQL contract; a desktop conversation difference beyond the composer corner.

## Intended Change

Port the approved phone conversation and Settings from the UI reference into the product, on the product's existing owners.

## Change Scope (Mandatory)

- In scope: UC-001…UC-005.
- Derived consumers: `MobileScreen` gains `'settings'` (readers: `MobilePairedShell`, `MobileRunMenu`, navigation back rules, tests); `useExistingRunConfigStore` gains the phone Settings as a second reader (no change to the store's contract); the shared conversation rows gain phone-only markup (`.conv-speaker`, turn grid) hidden on the desktop.
- Deliberately left alone: the node; the desktop conversation layout and the desktop inter-agent arrow; the desktop editor; New run; the file viewer, VNC Viewer, run list; iOS.
- Follow-ups: none found. A note for autobyteus-441 (keep stop and stopped-run updates on the phone's allowed list) goes to the PM with this handoff.

## Behavior And Production-Path Map (Mandatory)

| Requirement | Change | Spine |
| --- | --- | --- |
| REQ-001…003 | Phone conversation styles and phone-only markup | DS-001 |
| REQ-002 | Text size | DS-002 |
| REQ-004 | Composer corner (shared) | — |
| REQ-005…008 | Settings | DS-003, DS-004 |
| REQ-009 | Catalog keys | — |
| REQ-010 | No code (DEC-001) | — |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`.
- Current design issue found: `No`.
- Structural triggers: *Several kinds or forms*: Settings serves an agent run, a Team member and an Org member: the subject comes from the open run's target (agent `runId`, or the member's `scopeAddress` in its Team/Org run), the store's three load/update paths and the stop action's three subjects are used per kind, as the desktop does. *Derived data* (Principle 11, Case 10): the runtime names, model lists and model settings shown in Settings are the New run rows fed by the same stores as the desktop editor; Settings builds no list of its own. *Capability-area reuse*: store, stop action, rows, choice sheets, phone runtime gate. *Behavior by absence*: the stop icon is shown by the explicit rule "the run is live" (`isActive`), not by a refused Save.
- Deliberate deviations: `None`.
- Root cause classification: `No Design Issue Found` (existing owners absorb the feature).
- Refactor needed now: `No`.

## Terminology

- "Settings" (phone): the open run's runtime and model screen; not phone-wide settings (Text size is in the ⋮ menu). "Text size": the phone-wide conversation size. No glossary change.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: on the phone, `InterAgentMessageSegment`'s toggle button and message-type line are not rendered (phone variant); nothing removed on the desktop. Compatibility wrappers: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- `Not Affected` on the node. On the phone: one new `localStorage` key `autobyteus.phone.textSize` (absent = Standard).

## Data-Flow Spines

| Spine | Start | End | Owner |
| --- | --- | --- | --- |
| DS-001 | A run's conversation renders on the phone | The specification's layout | `AgentEventMonitor` with `.phone-conversation` |
| DS-002 | Tap a Text size step | The whole phone conversation at the step's size, kept | `usePhoneTextSize` |
| DS-003 | ⋮ → Settings on a stopped run → change → Save | Saved on the node; back to the conversation | `MobileRunSettings` → `useExistingRunConfigStore` |
| DS-004 | Settings on a live run → stop icon | The run stops; rows open | `MobileRunSettings` → `useRunStopAction` |

- DS-001: `MobilePairedShell → MobileRunScreen → AgentEventMonitor (phone runtime: class phone-conversation, --pc-size from usePhoneTextSize) → rows (AIMessage, UserMessage, EventMonitorBrowseAssistantRow, InterAgentMessageSegment phone variant) → phone-conversation.css`.
- DS-002: `MobileRunMenu Text size step → usePhoneTextSize.set(step) (one phone-wide ref, localStorage) → AgentEventMonitor's --pc-size`.
- DS-003: `MobileRunMenu "Settings" → navigation.openView('settings') → MobileRunSettings(target) → store.load<Kind>Canonical(run) → MobileRuntimeModelRows (runtime, model, config from the canonical selection) → store.update<Kind>ModelConfig(selection or scope patch) → store.canSave → store.save() → success: navigation.back() | refusal: the store's outcome message in the red card`.
- DS-004: `MobileRunSettings: run live (canonical isActive) → stop icon → useRunStopAction(subject: agent | team | agent_org).stop() → onStopped: store reloads the canonical → rows enabled`.

## Ownership Map

- `MobileRunSettings.vue` (new, `components/mobile/views/`): the Settings screen of the open run: resolves the subject from the target (agent run, or the member's scope in its Team or Org run, as `resolveSettingsSubject` does for the desktop), drives the store and the stop action in order, renders the rows, the stop icon, the refusal card and Save. Owns no lists and no model state of its own.
- `useExistingRunConfigStore`: unchanged owner of the canonical selection, the draft, `canSave` and `save` (one owner on desktop and phone).
- `useRunStopAction`: unchanged.
- `usePhoneTextSize.ts` (new, `composables/mobile/`): the phone-wide step, its `localStorage` key, the pixel value.
- `phone-conversation.css` (new, `assets/css/`): the phone conversation rules, all under `.phone-conversation` (desktop never gets the class).
- `MobileRunMenu.vue`: the Settings entry and the Text size block.
- `useMobileNavigation.ts`: `'settings'` screen and view.
- `InterAgentMessageSegment`: the phone variant without the toggle and type line (gated by the phone runtime).
- `AgentUserInputTextArea.vue`: `rounded-b-[11px]` on its root (desktop and phone).
- Catalogs: `localization/messages/en/mobileSettings.ts`, `localization/messages/zh-CN/mobileSettings.ts` (`mobile.settings.*`, the specification's keys).

## Dependency Rules

- Phone views → shared stores, composables and rows; no phone-only data path to the node. Shared conversation components read the phone runtime gate (`isMobileRemoteAccessRuntime()`, as today); they never import phone views.
- Collaborators: components use the existing Pinia stores and composables as the product does (no new process-wide lookup).

## Interfaces

| Interface | Shape |
| --- | --- |
| `useMobileNavigation().openView('settings')` | route `screen=settings` |
| `usePhoneTextSize()` | `{ step: Ref<'small' \| 'standard' \| 'large' \| 'largest'>, px: ComputedRef<number>, set(step) }` |
| `MobileRunSettings` props | `{ target: ActiveAgentWorkspaceTarget }` (the open run, as the other views) |

## Removal / Decommission Plan (Mandatory)

- None.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Show the stop icon only for a working run (the reference's choice) | Rejected: the node refuses any live run (DEC-004) |

## Change Sequence

1. Phone conversation: stylesheet, `.phone-conversation` and `--pc-size` on `AgentEventMonitor`, phone-only speaker line and turn grid in the rows, inter-agent phone variant; composer corner.
2. Text size composable and the menu block.
3. Settings: navigation screen, menu entry, `MobileRunSettings` on the store, rows and stop action; catalogs.
4. Tests: component tests; phone-bundle probe cases (layout measurements at 412 and 360 px, Text size, Settings stopped / refused / live idle / working, Team member); Android emulator journey on an isolated node with scripted runtimes (AC-004, AC-006); desktop unchanged (AC-008).

## Risks

- RSK-001: shared conversation components gain phone-only markup; a missed scope would change the desktop: AC-008 compares the desktop rendering.
- RSK-002: autobyteus-53 (a stopped run whose current model vanished) is not this case; if a probe shows Settings blocked by it, report it as a prerequisite.

## Guidance For Implementation

- Port from the UI reference files named above; the visible values are the specification's (normative), the fixture content is illustrative.
- Start from the founder's case: a stopped Team member on an isolated node with two scripted runtimes; and a live idle agent (the node answers `RUN_ACTIVE` to a Save).
- The node's refusal texts are shown as the node words them (509 decides their translation later).
- Isolated nodes and scripted runtimes only; no real provider quotas; no secrets in logs.
