# Investigation Notes

## Investigation Meta

- Package identifier: `chat-new-draft-kept-on-navigation`
- Request / ticket: User request 2026-10-07 — New chat input is lost after navigating away to copy content from another run.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence` / `codex/chat-composer-draft-persistence`
- Resolved base remote / branch / revision: `origin/personal` @ `cfeda548b` (fetched 2026-10-07)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: Success — dedicated worktree created from refreshed `origin/personal`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; file and date): `.claude/skills/solution-designer/references/requirements-engineering.md` (2026-10-07)
- Authorities read (design reading gate, 2026-10-07): `.claude/skills/solution-designer/references/architecture-design.md`, `.claude/skills/solution-designer/design-principles.md`, project `DESIGN.md` (repo root; no closer DESIGN*.md for `autobyteus-web`)
- Investigation status: Requirements and architecture investigation complete (2026-10-07).

## Initial Request And Clarifications

- Original request (paraphrased from user): "I click Chat, type something, attach a file. Then I navigate to an existing agent run to copy some detailed information. When I navigate back, my earlier input is gone. I have to collect everything first and must not navigate away; otherwise I must type everything again."
- Screenshot: New chat surface targeted at **Software Engineering Team**, 1 context file (image) attached, partially typed text, workspace/model/Auto-approve selected; left tree shows running team runs the user would open to copy from.
- Clarifications received: None yet.
- Initial ambiguity: whether the draft must also survive app restart/reload; whether the Chat item should always return to the kept draft.

## Product And Domain Understanding

- Product area: `autobyteus-web` Chat — the New chat surface (`/chat` without `?id=`) and the left-panel Chat primary nav item with its pencil ("New chat") button.
- Affected actor: desktop/web user composing a first message for a new agent or team run.
- Relevant terminology: **New chat draft** — the unsent first message for a new run: text, context files/attachments, `/` skills, `@` mentions, target (agent/team), workspace, runtime/model/model config, Auto-approve, team member overrides.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-07 | Code | `autobyteus-web/stores/chatDraftStore.ts` | Draft owner | The New chat draft lives in the Pinia store `chatDraft` (in-memory `ref<ChatDraft>`); text is `draft.context.requirement`, attachments `draft.context.contextFilePaths`. The store itself survives route changes. `ensureDraft()` reuses an existing draft. | — |
| 2026-10-07 | Code | `autobyteus-web/components/chat/ChatNewSurface.vue:219-221` | Surface mount | On mount calls `chatDraftStore.ensureDraft()` — keeps an existing draft. The surface itself does not discard. | — |
| 2026-10-07 | Code | `autobyteus-web/components/AppLeftPanel.vue:168-191` | Nav behavior | `navigateToPrimary('chat')` → `openNewChat()` → `runStart.newChat()`. Comment: "Chat always opens a fresh New chat." The pencil also calls `openNewChat()`. | Root cause |
| 2026-10-07 | Code | `autobyteus-web/composables/runSettings/useRunStart.ts:122-126` | Start intent | `newChat()` = `chatDraftStore.startNewChat()` (replaces the draft with a fresh Daily Assistant draft) then `router.push('/chat')`. | Root cause |
| 2026-10-07 | Code | `useRunStart.ts:28-31, 37-41, 106-120` | Other entry points | Run on Agent/Team, "+" copy and Org switches call `startForDefinition` (replace draft). The heading switcher between agent/team inside New chat calls `retarget`, which *keeps* typed text and attachments (DEC-006 of an earlier ticket). | Out of scope reference |
| 2026-10-07 | Code | `autobyteus-web/services/chat/chatLaunchService.ts:133-135, 221-222` | After send | After a successful send the draft is replaced with a fresh one (sent content belongs to the run). | Preserved |
| 2026-10-07 | Code | `autobyteus-web/types/agent/AgentContext.ts:12-38`; `components/agentInput/AgentUserInputTextArea.vue:193-229` | Existing-run composer | An existing run's composer text/attachments live on that run's `AgentContext` (`requirement`, `contextFilePaths`) held in `agentContextsStore`; switching runs does not clear them. | Preserved; not runtime-verified here |
| 2026-10-07 | Code | `autobyteus-web/pages/chat.vue:1-31` | Route rendering | `/chat` renders `ChatNewSurface`; `/chat?id=` renders a run. The only product path back to the New chat surface is the Chat nav item or pencil (both discard). | — |
| 2026-10-07 | Command | `grep -rn "localStorage" stores utils/chat` | Persistence | The New chat draft is never persisted; only the last-used model is (`chatLastModelPreference`). A reload/restart loses the draft today. | DEC-002 |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger | Current Product Behavior Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Click the **Chat** nav item while a New chat draft with content exists | Draft replaced by a fresh Daily Assistant draft; `/chat` opens | Typed text, attachments, team target, model/workspace choices lost | `AppLeftPanel.vue:179-183`, `useRunStart.ts:122-126` | High |
| BEH-002 | User | Click the **pencil (New chat)** button | Same as BEH-001 | Fresh draft | `AppLeftPanel.vue:187-191` | High |
| BEH-003 | User | Type in an existing run's composer, switch to another run, come back | Text stays on that run's context | Kept (in memory) | `AgentContext.ts`, `AgentUserInputTextArea.vue` | Medium (code reading) |
| BEH-004 | User | Send the New chat first message | Run starts; New chat draft reset | Fresh draft afterwards | `chatLaunchService.ts:133-135, 221-222` | High |
| BEH-005 | User | Reload/restart the app | All in-memory drafts lost | Lost | No persistence found | High |
| BEH-006 | User | Run / "+" on an Agent or Team definition, or a run's "+" copy | Draft replaced by a fresh draft for that definition | Fresh draft | `useRunStart.ts:28-31` | High |

## Relevant Codebase And Technical Facts

| Path / Component | Current Responsibility | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `stores/chatDraftStore.ts` | Owns the single New chat draft | Draft already survives navigation in memory; nothing new to store for the in-session case | Whether a "has user content" predicate belongs here |
| `composables/runSettings/useRunStart.ts` `newChat()` | Single "new chat" start intent used by both Chat item and pencil | The two triggers need different intents (return vs. start fresh) | Split intent: `openChat` (return) vs `newChat` (fresh) |
| `components/AppLeftPanel.vue` | Chat item + pencil handlers | Chat item must stop discarding | — |

## Structural And Payload Surface Inventory

- Payload surfaces: none persisted (in-session fix). If DEC-002 chooses restart survival, a new local-storage payload would be introduced.
- Structural surfaces: frontend nav intent only; no API, server, schema, security or concurrency change for the in-session option.
- Potential structural impacts: none for recommended scope; DEC-002 option B would add a client persistence surface (attachment references, serialization of model config/overrides).

## Persisted Data And State Facts

- Recommended scope affects no persisted data. Option B of DEC-002 would add local client storage; no server data.

## Product Design Request Context

- Product Design request in the current input: `Present` — user, 2026-10-07: "could you delegate a task to @Product Team to work on the UI first?"
- User's requested outcome: Product Team designs the Draft-rows UI first (before architecture design).
- Requirement / behavior IDs involved: BEH-007, REQ-001..008, SCN-001..004 (SR-002, pending approval).
- Product Design request artifact: `product-design-request.md` (this folder). Delegated via `delegate_task` to `/product_team` at the user's explicit request (no handoff rule covers Product Team). Returned run ID `product_ui_ux_designer_d50f45957e0a45e4b7f23f1ce4e70a55`, task ID `ad_hoc_task_202460a7-c1af-4791-809a-be55a6b5079e`.
- Status: Product result received 2026-10-07 and integrated in SR-003.

## Product Design Findings

- Product Design package path: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/chat-new-draft-kept-on-navigation/` (`ui-ux-spec.md`, `product-ticket.md`, `visual-references/VIS-001..008`)
- UI reference source: `/Users/normy/autobyteus_org/autobyteus-web-design` @ `5e93a70` (design `21643c2`)
- Explicit user confirmation: 2026-10-07 "i am satisfied. i confirm now"
- Journeys validated: UXJ-001..005 (SCN-001..005), desktop 800x738 and narrow 390x844
- Decisions supported: typed text makes a draft; one-line preview rows; open draft row selected instead of Chat; × without confirmation; Empty draft until leaving; multiple drafts; collapsed strip unchanged
- Rejected: two-line rows with marker/target; attachment/skill previews; guide rail; collapsed-strip count; show-more collapsing
- Mocked boundaries: in-memory drafts; locally scripted attachment upload/finalize; failed send not scripted; store shape and route identity not prescribed
- Requirements sections affected: REQ-001..011, AC-001..010, UI section, data continuity

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| User screenshot (conversation attachment) | User | Shows the lost-draft state | BEH-001 | SCN-001 | Evidence | N/A |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | Whether the user also wants the draft to survive app restart | Changes scope substantially | User (DEC-002) | Open |
| R-001 | Risk | Users used to "Chat = always fresh" lose the one-click fresh start | Pencil remains the explicit fresh start | Requirements REQ-003 | Mitigated |

## Requirement Implications

The draft already exists in memory across navigation; the loss is caused solely by the Chat nav item treating "open Chat" as "start a fresh New chat". The minimal correct behavior change is to make the Chat item return to the kept draft and keep the pencil as the explicit fresh start.

## Architecture Investigation Findings

All paths relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/autobyteus-web` @ `cfeda548b`.

| ID | Source | Observation | Design implication |
| --- | --- | --- | --- |
| AF-001 | `stores/chatDraftStore.ts` | One `ref<ChatDraft \| null>`; all draft creation goes through private `install()` (used by `startNewChat` and `startForDefinition`); `retarget` mutates the same draft in place; `ensureDraft` reuses. Consumers read only the `draft` computed and call setters that act on the open draft. | Collection + open id fits inside the existing owner; `install()` is the single place to apply the "leave the open draft" rule. Existing `draft` getter keeps all current consumers working. |
| AF-002 | `grep useChatDraftStore` (non-test) | Consumers: `useRunStart.ts`, `chatDraftModelControls.ts`, `ChatNewSurface.vue`, `pages/chat.vue`, `chatLaunchService.ts`. | Bounded consumer surface. |
| AF-003 | `services/chat/chatLaunchService.ts:93-135` | Agent launch: pre-registration failures throw and keep the draft (`clearStarting`). After `registerDraftRun`, `sendUserInputAndSubscribe` never rethrows (`stores/agentRunStore.ts` ~L270-290 "We do NOT re-throw"); errors render in the registered temp run; launch then navigates to `/chat?id=<id>` and calls `startNewChat()`. | The agent draft's content is handed to a registered run at registration; "failed send" that keeps the user on New chat = launch throws. |
| AF-004 | `chatLaunchService.ts:145-224` | Team launch: any failure (setup or first send) removes the team launch draft, `clearStarting`, rethrows → stays on New chat with the draft. Success navigates `/workspace` then `startNewChat()`. | Both success sites become "finish the sent draft". |
| AF-005 | `stores/agentRunStore.ts` `promoteTemporaryId` | The context's `state.runId` changes from `temp-*` to the permanent id on agent first send. | A Draft needs its own stable id; `context.state.runId` cannot be the row identity. |
| AF-006 | `composables/chat/chatDraftComposerTarget.ts` | Composer target key = `draft.context.state.runId`; uploads go to `agent_draft(<temp id>)`. | Per-draft target already exists; composer must be keyed per draft so switching drafts remounts it. |
| AF-007 | `components/AppLeftPanel.vue:14-80,168-191`; `composables/useShellPrimaryNavigation.ts:112` | Chat row active = route path `/chat` (any query). Chat click and pencil both call `useRunStart().newChat()`. | Chat row active must additionally be false while a Draft row is selected. |
| AF-008 | `layouts/default.vue:150-155` | Drawer closes on every `route.fullPath` change via `appLayoutStore.closeMobileMenu()`. | Row click while already on `/chat` causes no route change → must close the drawer explicitly. |
| AF-009 | `components/chat/ChatMessageInput.vue:172-186`; `utils/skills/skillTagMenu.ts:28` | The `/query` being typed lives in `context.requirement` while the skill menu is open. | "Has typed text" must exclude a lone `/\S*` token. |
| AF-010 | `stores/contextFileUploadStore.ts:77-95` | Draft attachments are uploaded server-side under the draft owner; today replacing the draft (`startNewChat`) deletes nothing. | Dropping/discarding a draft keeps today's no-deletion behavior (parity; residual, not in scope). |
| AF-011 | Product UI reference `/Users/normy/autobyteus_org/autobyteus-web-design` diff `eb60aba..21643c2` (`stores/chatDraftStore.ts`, `components/chat/ChatDraftRows.vue`, `components/AppLeftPanel.vue`, `services/chat/chatLaunchService.ts`, `components/chat/ChatNewSurface.vue`) | Reference shape: draft list + active id, `chatDraftHasContent` (text, not lone `/cmd`), `openDraft`/`discardDraft`/`finishSentDraft`, rows component with a component-local `wasListed` set and an exposed `selectedRowShown` via function ref. `finishSentDraft` always calls `startNewChat()` even when the user already opened another draft. | Reuse the behavior; tighten: store-owned "listed" fact instead of component-local set; shared rows composable instead of exposed component ref; start fresh after send only if the sent draft is still open. |
| AF-012 | `stores/__tests__/chatDraftStore.spec.ts`, `services/chat/__tests__/chatLaunchService.spec.ts`, `composables/runSettings/__tests__/useRunStart.spec.ts`, `components/__tests__/AppLeftPanel*.spec.ts`, `localization/messages/__tests__/shellCatalog.spec.ts` | Existing tests cover the touched owners. | Update/add tests there. |

## Notes For Architecture Design

Approved scenarios SCN-001..005; see design-spec.md for the target paths.
