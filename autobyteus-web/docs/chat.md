# Chat

Chat is the default entry surface of the web app and the only center view for
standalone agent runs. Teams and Agent Orgs keep their own `/workspace` views.

## Routes

| Route | Surface |
| --- | --- |
| `/` | Redirects to `/chat` ("Opening Chat..."). |
| `/chat` | New chat surface (`ChatNewSurface.vue`). |
| `/chat?id=<runId>` | Chat run view: the product workspace frame (`WorkspaceAdaptiveLayout`) with the standalone agent run view (`AgentWorkspaceView`), including an unsent-yet-registered `temp-*` run. |
| `/workspace` | Team and Agent Org runs. A committed standalone-agent selection change redirects to `/chat?id=<runId>`; the redirect never fires on mount or while an Agent Org route is shown. |

`pages/chat.vue` resolves the id: a mounted context is selected and shown; an
unmounted permanent id is opened through `openWorkspaceExecutionLink` (showing
"Opening chat..."); an id that cannot be opened shows the missing-chat state;
an unregistered `temp-*` id returns to `/chat`. Agent execution links
(`buildWorkspaceExecutionRoute`, `resolveSelectionRoute`) build the chat route,
and `/workspace` execution-link queries accept team links only.

## New Chat Draft

`stores/chatDraftStore.ts` owns one New chat draft: an unregistered `temp-*`
`AgentContext` plus the chat-only choices (target, workspace, auto-approve,
`starting`). The draft defaults to the built-in Daily Assistant
(`DEFAULT_CHAT_AGENT_DEFINITION_ID`, seeded by the server with
`skillScope: ALL_INSTALLED`) and picks a model in this order: last-used chat
model (`autobyteus.chat.lastModel`), the Daily Assistant default launch config,
then the first model of the AutoByteus runtime. `startNewChat(preset)` resets
the draft; the left panel pencil, the tree `+` and catalog Run actions use it.

Every draft model set records an explicit `llmConfig` (`explicitChatModelConfig`):
the model schema's non-thinking defaults through
`applyModelConfigSchemaDefaults` (`utils/llmConfigSchema.ts`, the same function
the launch form's `ModelConfigSection` uses), plus the default thinking state
from `getDefaultThinkingConfig` (`utils/llmThinkingConfigAdapter.ts`) unless
the preset already carries thinking keys. A model with a schema is never
recorded as `{}` or `null`, so the live ⚙ shows the values the run started
with; a model without a schema keeps `null`. The team quick path copies the
same value to its root config.

The composer (`ChatComposer.vue`) works on a `ComposerTarget`
(`composables/agentInput/useComposerTarget.ts`). The New chat target has
`access: 'draft'` and dispatches send to the agent or team launch path; a run
target has `access: 'live'`. Footer order is: approval toggle, workspace menu,
then model/thinking controls, mic and the primary send/stop action last.

- `/` opens the skill menu. For an `ALL_INSTALLED` agent it lists enabled
  installed skills; otherwise the agent's configured `skillNames`. Chosen
  skills become removable chips on `AgentContext.requestedSkillNames` and are
  prefixed to the message by `utils/skills/skillRequestInstruction.ts`; sent
  user messages parse that prefix back into chips.
- `@` opens the target menu: shared agents (except Daily Assistant) and shared
  teams.
- The workspace menu accepts an existing workspace or an absolute folder path
  (`~` is rejected); the folder is loaded at send time. Its search box (the
  model-menu search styling, placeholder "Search workspaces") is always shown and
  focused on open, and sits outside the listbox. `filterWorkspaceOptions`
  (`chatComposerMenus.ts`) filters the temp workspace and user workspaces by
  case-insensitive name or path. No match shows an empty state, while "Open
  another folder…" stays available. ArrowDown moves from the search box into the
  results, ArrowUp moves back, Enter picks the highlighted or first match (never
  during IME composition), and Escape closes without changing the selection. The
  query resets each time the menu opens.

### Thinking menu

`ChatThinkingControl.vue` renders the menu model built by `buildChatThinkingMenu`
(`components/chat/chatThinkingMenu.ts`). The rule that some settings only apply
while thinking is on is owned by `utils/llmThinkingConfigAdapter.ts`:
`hasThinkingSwitch`, `getThinkingDependentParamKeys`, `applyThinkingParamChoice`
(menu choices) and `applyThinkingDependentEdit` (form edits).

- **Schema with an on/off switch** (Claude `thinking_enabled`, DeepSeek-style
  `thinking_type`): one "Thinking" list. It is `Off` followed by each effort
  level (for example Off · Low · Medium · High · Xhigh · Max), or `Off · On` when
  there is no effort list. Exactly one row is checked, and it matches what will
  be sent. Picking a level turns thinking on at that level in one action.
  Re-picking the stored level while Off also turns thinking on. Other dependent
  settings (budget, display) appear below a divider, and changing one also turns
  thinking on.
- **Trigger.** It reads "Off" when thinking is off, the active level when the
  model has an effort setting, and "On" otherwise. The bulb is muted when off.
- **Other schemas** (for example Codex `reasoning_effort` with no switch) keep
  the per-parameter menu, and a pick changes only that parameter.

### New chat placement

`ChatNewSurface.vue` keeps the heading, composer and workspace hint line
flex-centred in a column with `pt-[14vh] pb-10` padding (previously
`pt-10 pb-[6vh]`). The larger top padding moves the group down by 10vh − 40px
(about 56px in a 952px-tall window), which leaves room above the composer for
its menus.

### New chat menu placement

On windows 640px wide or more, the New chat `@`, `/`, Workspace, Model and
Thinking menus always open upward and never flip down. Each menu passes
`{ placement: 'above' }` to `useAnchoredPopover`
(`composables/popover/useAnchoredPopover.ts`).

- **Position.** `@` and `/` sit 6px above the composer card and may cover the
  heading and subtitle. Workspace, Model and Thinking sit above their trigger.
  No menu covers the workspace hint line under the composer.
- **Height.** Max height = min(preferred height, space above the menu's
  containing block − 6px gap − 16px margin), measured when the menu opens.
  Preferred heights: `@`/`/` 300px, Workspace 420px, Model 360px, Thinking
  240px. There is no minimum height. The containing block is the popover root
  when it is positioned, otherwise its offset parent (the composer card for `@`
  and `/`).
- **Scrolling.** The menu's list scrolls while header, search and footer rows
  stay visible. The Model menu's runtime-row list has no scroll region, because
  the menu root must not clip the side flyout; in a window shorter than about
  330px those rows can exceed the height limit.
- **Model runtime flyout.** It is bottom-aligned with its runtime row and grows
  upward. Its list is limited to 320px or the space above that row, whichever is
  smaller.
- **Narrow windows.** Below 640px all five menus stay a bottom sheet.
- **Default policy.** Without the option the composable uses `auto`: below when
  the preferred height fits, otherwise the side with more room, with a 220px
  floor. The running-conversation `/` skill menu (`useSkillTagMenu.ts`) uses
  `auto`.

### Model labels

Chat names models exactly as the launch form does (D-16). `useChatModelCatalog.toChatModelOption` is the only place Chat builds a row's `label`, `secondary` and `recommended`, using `utils/modelSelectionLabel.ts`:

| Runtime | `label` | `secondary` |
| --- | --- | --- |
| Claude Agent SDK | canonical name | display name · description |
| AutoByteus | identifier | description |
| Other runtimes (Codex and the rest) | display name | description |

- **Label source.** The runtime catalog record; a model without one is labeled by its identifier. (The run settings editor labels existing-run choices with the shared `existingRunChoiceLabelInput`.)
- **Order.** Claude Agent SDK rows are Recommended first (`compareRecommendedFirstBy`).
- **Layout.** The label and the Recommended badge share one line, with `secondary` in gray below. Rows and the footer trigger never wrap; the full text is in `title` / `aria-label`.
- **Search.** One predicate, `matchesModelQuery`, matches the identifier, label, display and canonical names, the secondary text, the provider and the runtime, across the enabled runtimes.
- **Selection.** The stored selection is always `llmModelIdentifier`.

## Launch

`services/chat/chatLaunchService.ts` owns launch.

Agent launch order: mark the draft `starting` → resolve the workspace →
`agentContextsStore.registerDraftRun(context)` (registers and selects without
shell navigation) → await send → route to `/chat?id=<selected id>` → reset the
draft. A successful first send promotes the temp id, so the route carries the
permanent id and the model is remembered as last-used. A failed first send
lands on `/chat?id=<temp>` with the message and error kept. A workspace failure
before registration leaves the New chat untouched.

Team quick path: a root-only team config (the draft's runtime, model, thinking
config, auto-approve and workspace applied to every member), focus on the
coordinator, `sendMessageToFocusedMember` with the chat draft as the explicit
attachment owner, then `/workspace`. The team runtime model catalog is primed
before launch. On failure the orphan team draft and selection are removed and
the New chat stays intact.

`composables/chat/useChatRouteRunSync.ts` (used by `pages/chat.vue`) replaces
`/chat?id=temp-*` with the permanent id whenever the displayed context is
promoted, on every send path.

## Run View (D-17)

After the first message a chat is a normal agent run. `/chat?id` renders the
product workspace frame, `WorkspaceAdaptiveLayout` in `WorkspaceToolShell`, the
same as the Team and Org views: a full-height right tabs column, the resize
handle, the strip and the drawer, and a 57px header line. The center pane is
`AgentWorkspaceView` → `AgentWorkspaceSurface`.

- **Header.** Avatar, the run title (the run summary: the first message, else
  the history summary, truncated to 42 characters via `useStandaloneRunTitle`),
  `AgentStatusDisplay`, ⚙ and ＋.
  - ＋ calls `chatDraftStore.startNewChat({ agentDefinitionId, workspaceRootPath })`
    and routes to `/chat`.
- **Box.** The product `AgentUserInputForm`, with mic and send/stop inside the
  textarea. `AgentWorkspaceView` passes a `skillTagging` capability
  (`composables/agentInput/useSkillTagMenu.ts`): `/` opens `ChatSkillMenu`, and
  a chip row (`SkillTagChips`) edits `requestedSkillNames`. Team and Org boxes
  receive no capability and are unchanged.
- **⚙ run settings** (`RunConfigPanel`).
  - A permanent id uses `ExistingRunConfigEditor`: runtime and workspace are
    fixed; model and thinking are locked while the run is live and editable
    when it is Offline; Save applies at the next resume.
  - A `temp-*` draft (a catalog "Run agent" draft, or a New chat whose first
    send failed) uses `DraftRunConfigEditor`. It edits `context.config`
    directly (runtime, model, thinking, Auto approve tools), shows the workspace
    fixed, and makes no server call; the next send uses the edited config.
- **Right panel.** `useRightPanel` keeps one visibility preference, open by
  default and shared with the Team and Org views. The contextual default tab
  is owned by `useRightSideTabs`: Activity for a standalone run, Team members
  for a collaboration scope. It is applied only when the scope differs from the
  last one it was applied for, and a strip click opens exactly the clicked tab.

The New chat footer (model, thinking, workspace, approval) exists only before
the first message (`chatDraftModelControls.ts`).

## `@` In A Live Run (Collaborators)

In every sendable live-run composer (standalone Agent run, Team member, Org
member, and any task child), `@` at a word start opens the run variant of
`ChatTargetMenu` above the box ("Bring into this run"). New chat `@` still picks
the launch target and is unchanged.

- **Options** come only from the server: `collaboratorMentionCandidates`
  (`services/collaborators/collaboratorCandidatesService.ts`), refreshed each
  time the menu opens and invalidated when a collaborator is added. Shared
  Agents (no Daily Assistant or built-ins), then shared Agent Teams, minus what
  is already in the run; Agent Orgs are never offered. The footer names the
  focused agent, which receives the message.
- **Scope.** `useComposerTarget` sets `mentionScope` from the active target
  (`composables/agentInput/runMentionScope.ts`); launch drafts and read-only
  views have none and show no menu.
- **Choosing** (`useRunMentionMenu`) writes `@Name ` into the text and records
  the mention in `AgentContext.requestedMentions`. `MentionChipRow` shows a chip
  while `@Name` is in the text; removing a chip keeps the words (`@Name` →
  `Name`). ↑/↓, Enter/Tab and Escape work as in New chat; Enter with no match is
  swallowed. The textarea exposes combobox semantics while a menu is open.
- **Sending.** The Agent, Team, Org and Agent-collaboration stores send
  `mentions` (`{kind, definition_id}[]`) with SEND_MESSAGE. The server adds the
  collaborator on send and appends a `[Mentioned collaborators]` note to the
  stored message; `UserMessage` strips it and shows each `@Name` as an inline
  chip, and run summaries drop it (`utils/collaborators/collaboratorMentionText.ts`).
  **Only a send with mentions is held** (AR-007,
  `services/runSubmission/localUserSubmission.ts`): the composer keeps the draft
  and no local message is shown until the root accepts the send
  (`acceptLocalSubmission`; the standalone store waits for the SEND_MESSAGE ack,
  `AgentStreamingService.sendMessageAwaitingAdmission`). A Team send settles on
  its identity (`agent_run_id`, `message_id`, `dedupe_key`), never on content
  (CR-003). Sends without mentions keep their immediate local echo.
- **Failure notice.** A send rejected with `COLLABORATOR_ADD_FAILED` (every
  transport maps it to `CollaboratorAddRejection`,
  `services/collaborators/collaboratorAddFailures.ts`) posts nothing: the draft
  and its chips stay, and `CollaboratorAddFailureNotice` (above the box) shows
  "Couldn't add <name> to this run" with the reason from
  `AgentContext.collaboratorAddFailure`. It can be dismissed and is replaced by
  the next send. Success has no notice; the tree shows the result.
- **Collaborator rows.** Each collaborator is one hosted instance, shown with
  the product's task rows from the run's `collaborators` (Offline until its first
  message), before any extra copies: Team runs
  (`teamExecutionTreeSelectors.withCollaboratorExecutions`), Org runs and
  standalone runs (`collaboratorExecutionNodes`). A collaborator Team opens once
  when it appears (F-02). `collaborator_added` adds the contexts in place, so the
  pending send that added it keeps its acknowledgement.
- **Names (F-03).** Rows, the Team/Org tab and "From <Sender>:" use one formatter,
  `utils/collaboration/memberDisplayName.ts` (`product prototyper`, and
  `Product Prototyper` in sentences).
- **Agent-to-agent messages (RD-004).** A `send_message_to` delivery shows its
  sender with `InterAgentMessageSegment` ("From <Sender>:") inside the receiving
  agent's message block, live (`memberInputMessageHandler` for
  `inter_agent_delivery`) and after reopen (`inter_agent_message` replay items).
  Older stored deliveries without a recorded sender stay user-style. Known
  limit: the Event Monitor's "earlier events" page (active-trace paging) still
  shows deliveries user-style.
- **Standalone runs** gain children: rows under the run row
  (`AgentRunTaskRows`), a child's own conversation (titled by its name, with the
  ⚙ and ＋ header controls and a "Message <name>…" box, F-04), the run row
  returning to the run's own agent, and a "Team" tab once the run has
  children. `stores/agentRunCollaborationStore.ts`
  reads a stopped run's stored view with `agentRunCollaboration` (never restoring
  it) and attaches `/ws/agent-collaboration/:runId` only while the host runs or
  when the user sends to a child.

## Tests

- `stores/__tests__/chatDraftStore.spec.ts`
- `services/chat/__tests__/chatLaunchService.spec.ts`
- `composables/chat/__tests__/useChatRouteRunSync.spec.ts`
- `components/chat/__tests__/ChatComposer.spec.ts`, `chatComposerMenus.spec.ts`
- `components/chat/__tests__/ChatThinkingControl.spec.ts`, `chatThinkingMenu.spec.ts`,
  `ChatWorkspaceMenu.spec.ts`; `utils/__tests__/llmThinkingConfigAdapter.spec.ts`
- Browser probe: `pnpm test:e2e:chat-composer-polish` (`tests/e2e/chat-composer-polish-probe.mjs`)
- `composables/popover/__tests__/useAnchoredPopover.spec.ts`;
  `components/chat/__tests__/ChatMessageInput.spec.ts`, `ChatModelMenu.spec.ts`
- Browser probe: `pnpm test:e2e:chat-composer-menus-open-upward`
  (`tests/e2e/chat-composer-menus-open-upward-probe.mjs`). It needs Chrome, a
  logged-in `claude` CLI and a prior `pnpm -C autobyteus-server-ts build`.
- `composables/chat/__tests__/useChatModelCatalog.spec.ts`
- `components/workspace/agent/__tests__/AgentWorkspaceView.spec.ts`
- `components/agentInput/__tests__/AgentUserInputForm.skillTagging.spec.ts`
- `components/workspace/config/__tests__/RunConfigPanel.spec.ts` (draft branch),
  `ExistingRunConfigEditor.workspace.spec.ts`
- `composables/__tests__/useRightSideTabs.contextualDefault.spec.ts`
- `pages/__tests__/chat.spec.ts`, `pages/__tests__/workspace-chat-redirect.spec.ts`
- `components/agentInput/__tests__/AgentUserInputTextArea.runMentions.spec.ts`,
  `utils/collaborators/__tests__/collaboratorMentionText.spec.ts`,
  `services/collaborators/__tests__/*.spec.ts`,
  `services/agentCollaboration/__tests__/agentRunCollaborationContext.spec.ts`,
  `stores/__tests__/agentRunCollaborationStore.spec.ts`,
  `services/runSubmission/__tests__/localUserSubmission.spec.ts`,
  `components/agentInput/__tests__/CollaboratorAddFailureNotice.spec.ts`,
  `utils/collaboration/__tests__/memberDisplayName.spec.ts`
- Browser probe: `pnpm test:e2e:cross-scope-agent-mentions`
  (`tests/e2e/cross-scope-agent-mentions-live-probe.mjs`): `@` in standalone,
  Team and Org runs, briefing with `send_message_to`, "From <Sender>:" live and
  on replay, the add-failure notice and the Agent-root lifecycle. It runs in an
  owned temp data root on a real runtime. It needs Chrome, a logged-in runtime
  CLI and a prior `pnpm -C autobyteus-server-ts build`; case F01 needs LM Studio.
