# Chat

Chat is the default entry surface of the web app and the only center view for
standalone agent runs. Teams and Agent Orgs keep their own `/workspace` views.

## Routes

| Route | Surface |
| --- | --- |
| `/` | Redirects to `/chat` ("Opening Chat..."). |
| `/chat` | New chat surface (`ChatNewSurface.vue`). |
| `/chat?id=<runId>` | Chat run view (`ChatRunView.vue`) for a standalone agent run, including an unsent-yet-registered `temp-*` run. |
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
  (`~` is rejected); the folder is loaded at send time.

### Model labels

Chat names models exactly as the launch form does (D-16). `useChatModelCatalog.toChatModelOption` is the only place Chat builds a row's `label`, `secondary` and `recommended`, using `utils/modelSelectionLabel.ts`:

| Runtime | `label` | `secondary` |
| --- | --- | --- |
| Claude Agent SDK | canonical name | display name · description |
| AutoByteus | identifier | description |
| Other runtimes (Codex and the rest) | display name | description |

- **Label source.** The runtime catalog record is preferred. For a persisted run, a model the catalog no longer offers falls back to `existingRunChoiceLabelInput` (shared with the gear editor).
- **Order.** Claude Agent SDK rows are Recommended first (`compareRecommendedFirstBy`).
- **Layout.** The label and the Recommended badge share one line, with `secondary` in gray below. Rows and the footer trigger never wrap; the full text is in `title` / `aria-label`.
- **Search.** One predicate, `matchesModelQuery`, matches the identifier, label, display and canonical names, the secondary text, the provider and the runtime. It serves both the cross-runtime search and a persisted run's fixed list.
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

## Run View

`ChatRunView.vue` renders the run header, the conversation and the chat
composer inside `WorkspaceToolShell` with scope `chat` (right tools collapsed by
default; the visibility preference is separate from `/workspace`).

Model and thinking controls on a run (`chatRunModelControls.ts`) choose the
mode by run id, never by `config.isLocked`:

- `temp-*` id: edits the context config directly; the runtime is selectable.
- permanent id: loads and saves through `existingRunConfigStore`; locked while
  the run is live (Running, Idle, Initializing); when Offline the runtime is
  fixed and only that runtime's models are offered.

## Tests

- `stores/__tests__/chatDraftStore.spec.ts`
- `services/chat/__tests__/chatLaunchService.spec.ts`
- `composables/chat/__tests__/useChatRouteRunSync.spec.ts`
- `components/chat/__tests__/ChatComposer.spec.ts`,
  `chatComposerMenus.spec.ts`, `chatRunModelControls.spec.ts`
- `pages/__tests__/chat.spec.ts`, `pages/__tests__/workspace-chat-redirect.spec.ts`
