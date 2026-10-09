# Chat

Chat is the default entry surface of the web app and the only center view for
standalone agent runs. New chat is also the only start surface for Agents and
Agent Teams: every Agent/Team **Run** and **+** opens it. Team and Agent Org runs
keep their own `/workspace` views; Agent Orgs start on the Org launch page (see
[Agent Orgs](./agent_orgs.md#org-launch-page)) and are never a chat target.

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
an unregistered `temp-*` id returns to `/chat`. An archived, inactive run is not
re-opened: the open coordinator raises `ArchivedAgentRunOpenError` and Chat goes
to the `/workspace` empty view. When the displayed stored run is archived or
deleted while it is open, Chat also leaves to the `/workspace` empty view and
selects no other run (see "Workspace History Archive And Delete Actions" in
`agent_execution_architecture.md`). Agent execution links
(`buildWorkspaceExecutionRoute`, `resolveSelectionRoute`) build the chat route,
and `/workspace` execution-link queries accept team links only.

## New Chat Draft

`stores/chatDraftStore.ts` owns the New chat drafts (`drafts`, in start order)
and the one open draft (`openDraftId`; `draft` is the open one). Each `ChatDraft`
has a stable `id` (`chat-draft-<n>`, never the context run id, which changes on
promotion), `listed`, an unregistered `temp-*` `AgentContext` (text, files,
skills, mentions, runtime, model, model config) plus the chat-only choices: the
target (an agent or a team; never an Org), a `RunWorkspaceChoice`, auto-approve,
a Team's member overrides (`teamAgentOverrides`, by member address), `starting`
and `sentText`. Drafts are session-only Pinia state; nothing is persisted, so a
reload starts with none. The store never sends or routes: `chatLaunchService`
launches and `composables/runSettings/useRunStart.ts` routes. Every start intent
goes through `useRunStart`, and every start opens a fresh draft (see
[Draft rows](#draft-rows) for what happens to the one being left):

| Intent | `useRunStart` | Draft action | Initial settings |
| --- | --- | --- | --- |
| Chat nav, left-panel pencil | `newChat` | `startNewChat()` | Daily Assistant; last chat model (`autobyteus.chat.lastModel`) → Daily Assistant default launch config → the AutoByteus runtime's first model |
| Workspace tree `+` | `newChatInWorkspace` | `startNewChat({ agentDefinitionId, workspaceRootPath })` | as above, in that workspace |
| Agent / Team **Run** (list, detail) | `runAgent`, `runTeam` | `startForDefinition(target)` | the definition's default launch config → last chat model → default runtime's first model; temp workspace; Auto-approve |
| **+** on an Agent run view | `copyAgentFromConfig(config)` | `startForDefinition(target, { copied })` | the displayed agent's workspace, runtime, model, model config and approval |
| **+** on a Team run | `copyTeamRun` | `startForDefinition(target, { copied })` | the run's root settings and member overrides; team defaults if the run cannot be read |
| Heading switcher | `switchTarget` | `retarget(target)` (or a new draft from the Org page) | workspace, approval and model config carried; member overrides reset |
| Draft row | `openChatDraft(id)` | `openDraft(id)` | the kept draft exactly as it was left |

Copied and carried settings stay as they are; their runtimes' availability and
catalogs load before Send is offered. The Agent **+** copies the agent on screen:
the view passes its displayed `AgentRunConfig`, so the run's own agent and an
`@` collaborator child copy alike, with no lookup by run id.

### Draft rows

A New chat becomes a Draft once it has typed text. `chatDraftHasText` is the one
rule: the trimmed text of `chatDraftText(draft)` (`sentText ?? context.requirement`)
is non-empty and is not a lone `/command` still being typed. Attachments, skills,
mentions, target and settings alone do not make a Draft. The store sets
`listed` at the first text.

- **Leaving.** Every start and `openDraft` first leaves the open draft. A
  draft with text stays kept; one without text is removed unless it is
  `starting`. There is no single-draft mode.
- **Rows.** `components/chat/ChatDraftRows.vue` renders one row per kept draft
  directly under the Chat row in `AppLeftPanel.vue`, newest first, as a list
  named "Drafts". `composables/chat/useChatDraftRows.ts` owns the projection
  (read-only over the store): which drafts are rows, preview (text with
  whitespace collapsed, one line, truncated), tooltip (text and target name),
  accessible name ("Draft: text — target"), `selected` and `rowSelected`.
- **Selection.** On the New chat surface (`/chat` without `id`) the open draft's
  row is selected (`aria-current="page"`), and the Chat row is then not active.
  While it is shown, a listed draft whose text was cleared stays a row that reads
  "Empty draft"; it is dropped once left. Off the New chat surface, rows without
  text are hidden.
- **Open.** Clicking a row calls `useRunStart().openChatDraft(id)` (`openDraft`,
  then `/chat`) and closes the narrow left drawer. `ChatNewSurface` keys the
  composer by `draft.id`, so the draft's text, attachments, skills and mentions
  come back as they were.
- **Discard.** The row's × (`discardDraft`) removes the draft without
  confirmation. A draft being sent is never discarded. If it was the open
  draft, a plain fresh New chat opens. Focus moves to the next row, else the
  previous row, else the Chat row. × shows on hover, focus and the selected row,
  and always on touch (`hover: none`).
- **Motion.** Rows fade and change height over 150 ms (`TransitionGroup`), with
  no motion under `prefers-reduced-motion`.
- **Strings** are `shell.components.AppLeftPanel.drafts` / `draft` /
  `discard_draft` / `draft_empty` (en, zh-CN).

Dropped or discarded drafts leave their server-side draft attachment uploads
in place, as replacing the draft did before.

The displayed name does not change the default definition ID
`autobyteus-daily-assistant`. New Chat uses the current Daily Assistant definition
and prompt after server startup; existing conversation history is not migrated,
reset or relabeled. Previously captured names may still show the earlier
label General Agent.
Daily Assistant can discover accessible specialists when appropriate and use its
own available skills or direct tools; it is not required to delegate every request.

Every draft model set records an explicit `llmConfig` (`explicitChatModelConfig`):
the model schema's non-thinking defaults through
`applyModelConfigSchemaDefaults` (`utils/llmConfigSchema.ts`, the same function
`ModelConfigSection` uses), plus the default thinking state
from `getDefaultThinkingConfig` (`utils/llmThinkingConfigAdapter.ts`) unless
the preset already carries thinking keys. A model with a schema is never
recorded as `{}` or `null`, so the live ⚙ shows the values the run started
with; a model without a schema keeps `null`. A Team launch copies the same value
to its root config. Changing the model resets thinking and the other model
settings; changing either of those keeps the other.

The composer (`ChatComposer.vue`) works on a `ComposerTarget`
(`composables/agentInput/useComposerTarget.ts`). The New chat target has
`access: 'draft'` and dispatches send to the agent or team launch path; a run
target has `access: 'live'`. Footer order is: workspace menu, approval toggle,
then model menu, Thinking, one chip per other model setting (for example
"⚡ Fast" for Codex `service_tier`, icon-only below `sm`), mic and the primary
send/stop action last. Only the model name truncates; the other controls keep
their size. Send is disabled with the shared launch readiness reason as its
label (see [Agent Orgs](./agent_orgs.md#readiness)): the target is gone, a
scope's runtime is unavailable, or a scope has no model ("Choose a model to
start."). For a Team every member's effective settings are checked too.
Send and Enter also need something to send: typed text or a skill tag.
Context files alone never enable Send; they go with a message. The one rule
is `hasSendableDraft` (`services/runSubmission/agentPrimaryAction.ts`), used
by this composer, the New chat surface, the run-view composer
(`AgentUserInputTextArea.vue`) and `activeContextStore`. It matches the
server, which rejects run input with empty text.

- `/` opens the skill menu. For an `ALL_INSTALLED` agent it lists enabled
  installed skills; otherwise the agent's configured `skillNames`. Chosen
  skills become removable chips on `AgentContext.requestedSkillNames` and are
  prefixed to the message by `utils/skills/skillRequestInstruction.ts`; sent
  user messages parse that prefix back into chips.
- `@` is mention-only, as in a live run (below): it inserts a collaborator
  mention ("Delegate to an agent or team") and never changes the target.
  Candidates come from `utils/collaborators/draftMentionEligibility.ts`, which
  mirrors the server's `CollaboratorCandidatePolicy` for the would-be run:
  shared, non-built-in Agents, then shared Agent Teams, never Orgs, minus only the
  target's own definition (a Team target's shared members are offered). After
  "@", the hint reads "to delegate to an agent or team." The first message keeps
  its mentions.
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

## Start Surfaces

New chat and the Org launch page share one vocabulary
(`components/run-settings/*`, built on the chat controls):

- **Heading switcher** (`RunTargetSwitcher`). The heading is the target name
  (avatar only when the definition has one). Clicking it opens one "what to run"
  menu: search "Search agents, teams and orgs", sections Agents (Daily Assistant
  first), Agent teams and Agent orgs, with the current target checked. An Agent or
  Team retargets New chat; an Org opens the Org launch page. Workspace, approval
  and model config carry across; member overrides reset; typed text is kept only
  between Agent and Team. The switcher is disabled while a run is starting.
- **Members line and Member settings drawer** for a Team (and an Org). See
  [Agent Orgs](./agent_orgs.md#member-settings). A Team member can override model
  + runtime, thinking, other model settings and tool approval, but not the
  workspace.
- **Show tools.** One small icon in the top-right corner opens the right tools
  (Files, Terminal, …), docked when there is room, otherwise as the drawer. They
  are closed by default; the choice is remembered in
  `autobyteus.chat.startToolsOpen` (`useStartSurfaceTools`), holds across
  switches, and a run started from the page keeps the panel open. Files and
  Terminal use the workspace chosen on the page. No icon strip is shown on start
  surfaces (`WorkspaceToolShell start-surface`).

There is no "Files are saved in …" line; the workspace control names the
workspace (path on hover). While starting, the line under the composer reads
"Starting {name} on {runtime}…".

### New chat placement

`ChatNewSurface.vue` keeps the heading, composer and the line under it
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
  No menu covers the line under the composer.
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

Chat names models the same way on every surface that uses the chat model menu (D-16). `useChatModelCatalog.toChatModelOption` is the only place Chat builds a row's `label`, `secondary` and `recommended`, using `utils/modelSelectionLabel.ts`:

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
shell navigation) → await send → route to `/chat?id=<selected id>` →
`finishSentDraft(draft)`. A successful first send promotes the temp id, so the
route carries the permanent id and the model is remembered as last-used. A
failed first send lands on `/chat?id=<temp>` with the message and error kept;
the message now belongs to that run, so the draft is finished as if sent. A
workspace failure before registration leaves the New chat and its row
untouched.

`finishSentDraft` removes the sent draft and its row. It opens a plain fresh
New chat only if that draft is still the open one; a draft the user opened
during the send stays open. While a draft is `starting`, `sentText` holds the
text being sent (the agent send clears the composer first), so its row keeps
that text until the draft is finished. A launch failure that keeps the draft
(`clearStarting`) clears `sentText`, and the draft returns to its typed text.

Team launch (`launchTeamChat`): a team config with the draft's runtime, model,
model config, auto-approve and workspace for every member, plus each customized
member's own settings (`buildChatTeamLaunchConfig(definition, root,
teamAgentOverrides)`). The model catalog of every effective runtime is loaded
before the Team launch draft is created in `teamRunConfigStore`, focused on the
coordinator. The first message goes to the coordinator through
`sendMessageToFocusedMember`, with its `@` mentions and the chat draft as the
explicit attachment owner, then the app routes to `/workspace` and finishes
the sent draft. On failure the orphan team draft and selection are removed and
the New chat and its row stay intact.

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
  - ＋ calls `useRunStart().copyAgentFromConfig(displayed config)`: New chat
    for the agent on screen (the run's own agent or an `@` collaborator child),
    prefilled with its workspace (temp when it has none), runtime, model, model
    config and approval.
- **Box.** The product `AgentUserInputForm`, with mic and send/stop inside the
  textarea. `AgentWorkspaceView` passes a `skillTagging` capability
  (`composables/agentInput/useSkillTagMenu.ts`): `/` opens `ChatSkillMenu`, and
  a chip row (`SkillTagChips`) edits `requestedSkillNames`. Team and Org boxes
  receive no capability and are unchanged.
- **⚙ run settings** (`RunConfigPanel` → `ExistingRunConfigEditor` →
  `ExistingRunSettings`): runtime, workspace and approval are fixed; model,
  thinking and other model settings are locked while the run is live and
  editable when it is Offline; Save applies at the next resume. See
  [Settings](./settings.md#existing-run-configuration).
  - A `temp-*` context (a New chat whose first send failed) has no saved
    settings: ⚙ is hidden. It keeps its error and the composer retry.
- **Right panel.** `useRightPanel` keeps one visibility preference, open by
  default and shared with the Team and Org views. The contextual default tab
  is owned by `useRightSideTabs`: Activity for a standalone run, Team members
  for a collaboration scope. It is applied only when the scope differs from the
  last one it was applied for, and a strip click opens exactly the clicked tab.

The New chat footer (model, thinking, workspace, approval) exists only before
the first message (`chatDraftModelControls.ts`).

## `@` In A Live Run (Delegation)

In every sendable live-run composer (standalone Agent run, Team member, Org
member, and any task child), `@` at a word start opens the run variant of
`ChatTargetMenu` above the box ("Delegate to an agent or team"; zh-CN
"委派给智能体或团队"). New chat `@` works the
same way, with draft candidates (see New Chat Draft); there is no "Chat with"
target mode.

- **Options** come only from the server: `collaboratorMentionCandidates`
  (`services/collaborators/collaboratorCandidatesService.ts`), refreshed each
  time the menu opens and invalidated when a collaborator is added. Shared
  Agents (no Daily Assistant or built-ins), then shared Agent Teams, including
  ones already in the run (configured members, collaborators); only the run's own
  definition is left out, and Agent Orgs are never offered. In a standalone Agent
  run the options depend on the focused agent. The host's composer never offers
  the host. A task child's composer (a member of a delegated Team or Agent copy)
  offers the host, the run's own agent, plus the host's own options. Candidates
  are cached per focused agent, and adding a collaborator clears every key of
  that root. The footer reads
  "{agent} gets your message and delegates the work", naming the focused agent.
  For a mention already in the run, the note marks it "already in this run" and
  tells the agent it can message that instance with `send_message_to` or delegate
  a separate copy. A mention of the host from a child is marked "the run's own
  agent", and the note tells the child to use `send_message_to` with the host's
  address (no `delegate_task` alternative). The message reaches the existing host
  run.
- **Scope.** `useComposerTarget` sets `mentionScope` from the active target
  (`composables/agentInput/runMentionScope.ts`); launch drafts and read-only
  views have none and show no menu. Agent-root scopes carry `focusedAgentRunId`:
  the host's `runId`, or the task child target's `agentRunId`.
- **Discovery.** A mention-capable empty run editor uses the native placeholder
  "Ask anything · @ for an agent or team" (zh-CN: "随便问 · @ 选择智能体或团队")
  inside the message box below Context Files. It disappears when typing and is
  never draft content. It takes priority over custom/skill run placeholders;
  without mention capability the existing placeholder chain stays unchanged.
  Removing the slash cue does not remove actual `/` skills or skill chips.
- **Choosing** (`useComposerMentionMenu`, shared by New chat and run
  composers; the caller supplies candidates through `useMentionCandidates`) writes `@Name ` into the text and records
  the chosen kind/definition id/name in `AgentContext.requestedMentions`, with
  the caret after the trailing space. There is one quiet highlighted inline
  `@Name`, no separate top mention row or remove button. ↑/↓, Enter/Tab and
  Escape work as in New chat; Enter with no match is swallowed. The textarea
  exposes combobox semantics while a menu is open.
- **Native editing.** Deleting `@` leaves plain `Name` and deactivates the
  mention; deleting the whole token removes the name; editing its name
  deactivates it. Undo/restoring the exact previously chosen token reactivates
  that selected definition. Arbitrary typed names do not create selected
  identities. `mentionsPresentInText` filters active identities for both
  highlighting and send; native edits do not prune retained choices or erase
  unrelated text/attachments.
- **Renderer ownership.** `ComposerMentionMirror.vue`, used by both
  `AgentUserInputTextArea.vue` and New chat's `ChatMessageInput.vue`, is a
  decorative, `aria-hidden`, noninteractive background mirror using `splitMentionText` and
  escaped Vue interpolation. The native textarea remains the only editor and
  accessibility surface, retaining caret, selection, paste, IME and undo.
  Shared typography/padding plus client dimensions (excluding scrollbars),
  scroll offsets and a scoped `ResizeObserver` keep wrapped highlights aligned;
  observer/window listeners clean up on unmount. Context changes derive the
  decoration from that context's own draft and choices. Forced colors uses a
  system-color outline with transparent decorative glyphs over readable native
  text. The former `MentionChipRow` and chip-only removal helpers are deleted;
  no rich-text model, persisted spans or migration replaces them.
- **Sending.** The Agent, Team, Org and Agent-collaboration stores send
  `mentions` (`{kind, definition_id}[]`) with SEND_MESSAGE. The server adds
  **nothing** to the run on send: it resolves each mention's address and appends
  a `[Mentioned collaborators]` note to the stored message that tells the
  focused agent to `delegate_task` to that address. When the agent delegates, a
  delegated (task) row appears; it disappears once the agent marks that
  delegation's Task DONE (or CANCELLED) with `create_or_update_task` (for example when the user
  asks it to), live and after reopen. It returns (live, via
  `task_executions_reopened`) when the agent sets that Task back to TODO or
  IN_PROGRESS and then messages the copy's run ID, which reactivates it. Notes saved by earlier releases still
  parse; `UserMessage` strips it and shows each `@Name` as an inline
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
  text, selected definitions and attachments stay, and
  `CollaboratorAddFailureNotice` (above the box) shows
  "Couldn't mention <name>" with the reason from
  `AgentContext.collaboratorAddFailure`. It can be dismissed and is replaced by
  the next send. Success has no notice. The notice now only appears for a
  definition that is not eligible in the run; whether the agent can run it is
  checked when it delegates, and the agent gets the reason.
- **Collaborator rows.** Collaborators now come only from an agent's first
  `send_message_to` to a catalog address, and from stored runs that earlier
  releases filled on `@`. Each collaborator is one hosted instance, shown with
  the product's task rows from the run's `collaborators` (Offline until its first
  message), before any extra copies: Team runs
  (`teamExecutionTreeSelectors.withCollaboratorExecutions`), Org runs and
  standalone runs (`collaboratorExecutionNodes`). A collaborator Team opens once
  when it appears (F-02). `collaborator_added` adds the contexts in place.
- **Collaborator Artifacts.**
  - When a standalone run's collaborators are hydrated, after a reload or on a
    historical run, each collaborator's recorded Agent Artifacts
    (`getRunFileChanges(collaboratorRunId)`) are fetched with its projection.
  - They are committed with its Activity when the collaboration context is
    published. This goes through
    `services/agentCollaboration/agentRunCollaborationHydration.ts` (`commit`)
    and the shared `services/runHydration/memberRunStateHydration.ts`.
  - Newer live `FILE_CHANGE` rows are kept.
  - An artifact fetch failure fails the collaboration hydration, as a
    projection failure does.
- **Agent-initiated collaborators and catalog copies.** An agent can bring a listed
  catalog Agent or Team in with its first `send_message_to`, or start catalog copies
  with `delegate_task` (server: `list_available_agents`, see the server
  `agent_communication.md`). These look the same as collaborators of stored runs:
  - collaborator rows arrive through the same `collaborator_added`;
  - catalog copies are ordinary task rows whose task DTO carries `source`, read by
    `services/collaborators/agentSourceSelectors.ts`;
  - messages show as Team/Org tab rows and "From <Sender>:".
- **Names (F-03).** Rows, the Team/Org tab and "From <Sender>:" use one formatter,
  `utils/collaboration/memberDisplayName.ts` (`product prototyper`, and
  `Product Prototyper` in sentences). In a standalone run's Team tab the run's own
  agent reads in the title-case form (`Research Assistant`, as in "From Research
  Assistant:", VIS-013); collaborators keep the row form.
- **Agent-to-agent messages (RD-004).** A `send_message_to` delivery shows its
  sender with `InterAgentMessageSegment` ("From <Sender>:") inside the receiving
  agent's message block, live (`memberInputMessageHandler` for
  `inter_agent_delivery`), after reopen (`inter_agent_message` replay items) and
  on the Event Monitor's "earlier events" page (`EventMonitorInterAgentVisual`,
  rendered by `eventMonitorActiveTraceBrowsePresentation.ts` and
  `EventMonitorBrowseAssistantRow`). Older stored deliveries without a recorded
  sender stay user-style. `utils/collaboration/interAgentDelivery.ts` parses the
  delivery header with or without its `sender address` part, so stored history
  keeps rendering.
- **Standalone runs** gain children: rows under the run row
  (`AgentRunTaskRows`), a child's own conversation (titled by its name, with the
  ⚙ and ＋ header controls and the mention-aware input described above), the run row
  returning to the run's own agent, and a "Team" tab once the run has
  children. `stores/agentRunCollaborationStore.ts`
  reads a stopped run's stored view with `agentRunCollaboration` (never restoring
  it) and attaches `/ws/agent-collaboration/:runId` only while the host runs or
  when the user sends to a child.

## Tests

- `stores/__tests__/chatDraftStore.spec.ts`
- `services/chat/__tests__/chatLaunchService.spec.ts`
- `composables/runSettings/__tests__/useRunStart.spec.ts`, `useRunStopAction.spec.ts`;
  `utils/runSettings/__tests__/launchReadiness.spec.ts`, `modelOptions.spec.ts`,
  `runMemberTree.spec.ts`, `startModelDefaults.spec.ts`;
  `components/run-settings/__tests__/OrgLaunchPage.spec.ts`, `RunMembersLine.spec.ts`
- Browser probe: `pnpm test:e2e:run-settings-live`
  (`tests/e2e/run-settings-live-probe.mjs`): Agent/Team/Org Run and **+**,
  member overrides, Fast mode, first-send `@`, saved-run stop/Cancel/Save with
  server readback, start-surface tools and control geometry. It runs in an owned
  temp data root and needs Chrome, logged-in `claude` and `codex` CLIs and a
  prior `pnpm -C autobyteus-server-ts build`.
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
- `components/workspace/config/__tests__/RunConfigPanel.spec.ts`,
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
- Browser probe: `pnpm test:e2e:composer-mention-discoverability`
  (`tests/e2e/composer-mention-discoverability-probe.mjs`): native selection,
  editing/undo/paste, keyboard menus, completed upload-client retention,
  rejection/acceptance, context switching, wrapping/scroll/resize, English/zh-CN
  and forced colors. It needs installed dependencies, Nuxt preparation, built
  workspace contract outputs and Chrome/Chromium. It starts owned Nuxt/HTTP
  fixtures on free ports and removes its temporary page/closes its processes.
  Candidate/upload endpoints and the owning run-store transport outcome are
  doubles; production editor, upload client and local submission are real.
  This is renderer evidence, not live-provider/full-desktop or real OS IME proof.
