# Design Spec — New chat Draft rows under the Chat row

## Solution And Approval Basis

- Current solution revision ID: `SR-005`
- Approved requirements baseline: `requirements-doc.md` SR-003 content + DEC-002 = A, approved 2026-10-07 (user: "no do not survide. no need"; recorded SR-004)
- Behavior-defining supplements: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/chat-new-draft-kept-on-navigation/ui-ux-spec.md` + `visual-references/VIS-001..008`, design revision `21643c2` (ticket closed `5e93a70`), user-confirmed 2026-10-07 ("i am satisfied. i confirm now")
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/tickets/in-progress/chat-new-draft-kept-on-navigation/investigation-notes.md` (Architecture Investigation Findings AF-001..AF-012)
- Authorities read (2026-10-07): `references/architecture-design.md`, `design-principles.md`, project `DESIGN.md` (repo root; no closer `DESIGN*.md` under `autobyteus-web`). `design-examples.md`: not used.
- Project design-principle conflicts or discrepancies: None.
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence`, branch `codex/chat-composer-draft-persistence`, base `origin/personal` @ `cfeda548b`, finalization target `origin/personal`.

## Current-State Read

- `chatDraftStore` (`autobyteus-web/stores/chatDraftStore.ts`) owns exactly one New chat draft (`ref<ChatDraft | null>`). Every start (`startNewChat`, `startForDefinition`) goes through the private `install()`, which **replaces** that draft. `retarget` (heading switcher) mutates the draft in place and keeps text (AF-001).
- `useRunStart.newChat()` is called by both the Chat row and the pencil (`AppLeftPanel.vue`), so returning to Chat always discards the draft. This is the root cause of the user's problem (AF-007).
- `chatLaunchService` calls `startNewChat()` after a successful agent or team launch. Team failures and agent pre-registration failures throw and keep the draft. An agent first-send failure after registration is shown inside the registered temp run, which the launch then navigates to (AF-003, AF-004).
- The agent context's `state.runId` changes on promotion, so it cannot be a draft's identity (AF-005).
- The Chat row's active state is purely route-based (`/chat`) (AF-007). The narrow drawer closes only on route change (AF-008).
- Nothing about drafts is persisted (BEH-005).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale:
  - Changes ~7 production files plus 2 localization catalogs, all inside `autobyteus-web`'s existing chat/left-panel ownership.
  - Modified: `chatDraftStore.ts`, `useRunStart.ts`, `chatLaunchService.ts`, `ChatNewSurface.vue`, `AppLeftPanel.vue`, `shell.ts` (en/zh-CN).
  - Added: `composables/chat/useChatDraftRows.ts`, `components/chat/ChatDraftRows.vue`.
  - Plus focused tests.
- Architectural risk: `Low`
- Risk rationale:
  - The behavior is frontend session state only. It adds no API, GraphQL/WebSocket contract, persistence, migration, security, deployment or server change.
  - The store stays the single owner and keeps its public `draft` getter, so existing consumers are unchanged.
  - Concurrency is limited to the existing in-flight `starting` flag and the existing async model-resolution guard, which becomes per draft.
- Escalation trigger: return a Design Impact if implementation finds any of the following:
  - drafts need persistence;
  - a consumer outside AF-002 depends on single-draft replacement;
  - keeping an attachment-bearing draft requires server-side attachment changes;
  - the agent launch hand-off cannot follow the REQ-006 mapping below.

## Architecture Investigation Evidence

| Source | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | AF-001 `stores/chatDraftStore.ts` | Single draft; one `install()` creation point | Collection + open id inside the same store; leave-rule in `install()` | — |
| Code | AF-003/004 `services/chat/chatLaunchService.ts`, `stores/agentRunStore.ts` | Launch success resets the draft; failures differ by hand-off point | `finishSentDraft(draft)` at both success sites; REQ-006 mapping | — |
| Code | AF-005 `promoteTemporaryId` | `runId` changes on send | Stable `ChatDraft.id` | — |
| Code | AF-007/008 `AppLeftPanel.vue`, `layouts/default.vue` | Route-only Chat active state; drawer closes on route change | Shared rows composable gives the Chat row its "draft selected" signal; explicit drawer close on row open | — |
| Code | AF-009 `ChatMessageInput.vue`, `skillTagMenu.ts` | `/query` sits in the text while typing | `chatDraftHasText` excludes a lone `/\S*` token | — |
| Product reference | AF-011 design repo `eb60aba..21643c2` | Working reference shape | Reused behavior; tightened ownership (see Concrete Examples) | — |

## Intended Change

- Keep every New chat with typed text as a Draft in `chatDraftStore`, which tracks one open draft.
- Every start (Chat, pencil, Run, "+", workspace-tree "+") opens a fresh draft. The previously open draft is dropped only if it has no text.
- A one-line row per listed draft is rendered directly under the Chat row. Clicking a row reopens that draft on `/chat`, and × discards it.
- A successful send removes the sent draft.
- No route, API or persistence changes.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior / Evidence | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001/002 | User | REQ-004, AC-003 | Chat row / pencil | Replaces the draft (AF-001, AF-007) | Blank New chat; the earlier draft is kept if it has text | DS-002 |
| BEH-006 | User | REQ-005, AC-004 | Run / "+" / tree "+" | `startForDefinition`/`startNewChat` replace (AF-001) | Fresh draft; earlier draft with text kept | DS-002 |
| BEH-007 | User | REQ-001..003, REQ-007..010, AC-001/002/006..009 | Typing; row click; row × | None | Rows appear at first text; reopen intact; discard; Empty draft | DS-001, DS-003, DS-004 |
| BEH-004 | User | REQ-006, AC-005 | Send | `startNewChat()` after success (AF-003/004) | Sent draft removed; fresh New chat only if the sent draft is still open; failure keeps the draft | DS-005 |
| BEH-005 | User | REQ-011, AC-010 | Reload | In-memory only | Unchanged; nothing persisted | — |
| BEH-003 | User | Preserved | Run composer | Per-run context text | Unchanged | — |

**REQ-006 "failed send" mapping (design interpretation, preserving today's launch behavior):**
- **The launch throws and the user stays on New chat.** This covers any team-launch failure and an agent failure before the run is registered. The draft and its row are kept unchanged.
- **The agent run was registered, but its first send fails inside that run.** Today `sendUserInputAndSubscribe` shows the error in the registered temp run, and the launch navigates there (AF-003). The message content now belongs to that run, so the draft is finished like a sent one: its row goes, and nothing written is lost.
- The visible failure presentation stays exactly as today, matching UI/UX spec TR-005 ("Today's failure presentation").

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/chat-new-draft-kept-on-navigation/ui-ux-spec.md` + `visual-references/` | Normative UI/UX | REQ-001..010 | Visual, state, a11y, motion and responsive details are implemented exactly as specified there; this design does not restate them | Approved (Product-owned, user-confirmed) |
| Design repo reference files (`components/chat/ChatDraftRows.vue`, `stores/chatDraftStore.ts`, `components/AppLeftPanel.vue`, `services/chat/chatLaunchService.ts` @ `21643c2`) | UI reference implementation | — | Behavioral reference; not prescriptive. Production tightening is listed in Concrete Examples | Reference only |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (feature on an existing owner)
- Current design issue found: `No`
- Structural triggers considered:
  - **Repeated coordination: not fired.** All starts already funnel through `install()`.
  - **Authoritative boundary: not fired**, as long as rows use store actions rather than mutating `drafts` directly (rule below).
  - **Responsibility overload: watched.** `chatDraftStore.ts` (~400 lines) gains only collection lifecycle (open, leave, discard, finish). Row presentation (previews, names, selection) goes to a new composable instead of the store.
  - **Shared-structure tightness.** `ChatDraft` gains two meaningful fields (`id`, `listed`). Ordering uses array order, not a timestamp.
- Root cause classification: `No Design Issue Found`. "Chat replaces the draft" was intended behavior until now; the existing owner absorbs the new rule.
- Refactor needed now: `No`
- Evidence: AF-001, AF-002, AF-007.
- Design response: extend `chatDraftStore` from one draft to a collection with one open draft; add a rows composable and component; route launch success through `finishSentDraft`.
- Intentional deferrals and residual risk: dropped or discarded drafts leave server-side draft attachment uploads in place, the same as today's `startNewChat` replacement (AF-010). This is not in scope.

## Terminology

- **Draft**: a `ChatDraft` kept in `chatDraftStore`.
- **Open draft**: the one the New chat surface shows (`openDraftId`).
- **Listed**: a draft that has had typed text and is therefore shown as a row.
- **Has text**: trimmed `context.requirement` is non-empty and is not a lone `/\S*` token.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- The single-draft `ref<ChatDraft | null>` and the replace-on-install behavior are removed outright. There is no "single draft" mode and no flag to switch between behaviors.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. Drafts are session-only Pinia state (REQ-011, DEC-002 A). No localStorage, server or file writes are added. `chatLastModelPreference` is unchanged.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-007 (REQ-001/002) | User types in the New chat composer | Row appears under Chat | `chatDraftStore` (listed fact) | When a draft becomes visible |
| DS-002 | Primary | BEH-001/002/006 (REQ-004/005) | Chat / pencil / Run / "+" | Blank New chat; earlier draft kept | `chatDraftStore.install()` via `useRunStart` | The no-loss rule |
| DS-003 | Primary | BEH-007 (REQ-003) | Row click | `/chat` shows that draft, row selected | `chatDraftStore.openDraft` via `useRunStart.openChatDraft` | Re-entry |
| DS-004 | Primary | BEH-007 (REQ-007) | Row × | Draft removed; blank New chat if it was open | `chatDraftStore.discardDraft` | Discard |
| DS-005 | Return/Event | BEH-004 (REQ-006) | Launch success | Draft removed; fresh New chat if still open | `chatLaunchService` → `chatDraftStore.finishSentDraft` | Send hand-off |
| DS-006 | Bounded local | BEH-007 (REQ-008) | Open draft's text changes | `listed` set at first text; textless open draft dropped when left | `chatDraftStore` | Empty-draft lifecycle |

## Primary Execution Spine(s)

- DS-001: `ChatMessageInput (typing) -> open draft context.requirement -> chatDraftStore listed watcher -> useChatDraftRows -> ChatDraftRows (row under Chat)`
- DS-002: `AppLeftPanel Chat/pencil | Agent/Team Run | run "+" -> useRunStart (newChat/startForDefinition...) -> chatDraftStore.install (leave open draft, add + open new) -> router /chat -> ChatNewSurface (blank)`
- DS-003: `ChatDraftRows row click -> AppLeftPanel handler -> useRunStart.openChatDraft(id) -> chatDraftStore.openDraft(id) -> router /chat (+ drawer close) -> ChatNewSurface (composer keyed by draft.id)`
- DS-004: `ChatDraftRows × -> chatDraftStore.discardDraft(id) -> (if open) startNewChat -> rows/selection update; focus moves`
- DS-005: `ChatComposer send -> chatDraftComposerTarget.send -> launchAgentChat/launchTeamChat -> navigate -> chatDraftStore.finishSentDraft(draft)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The composer edits the open draft in place. The store watches the open draft's "has text". On first true it sets `listed = true`, and the rows composable lists it newest first. | composer, store, rows | `chatDraftStore` | `chatDraftHasText` predicate |
| DS-002 | Every start calls `install()`. It first leaves the open draft (removing it only if it is not starting and has no text), then appends the new draft and opens it. Model/target defaults behave as today. | useRunStart, store | `chatDraftStore` | per-draft model-choice generation |
| DS-003 | The row click asks `useRunStart` to open the draft. The store leaves the current open draft (same rule) and opens the requested one. The router goes to `/chat` and the drawer closes. The surface re-keys the composer so the draft's text, attachments, tags and mentions render. | AppLeftPanel, useRunStart, store, ChatNewSurface | `chatDraftStore` | drawer close (`appLayoutStore`) |
| DS-004 | × removes the draft (ignored while that draft is `starting`). If it was the open draft, a plain fresh New chat opens. The component moves keyboard focus to the next row, else the previous row, else the Chat row. | ChatDraftRows, store | `chatDraftStore` | focus management in the component |
| DS-005 | After a successful launch has navigated, the launch service finishes the sent draft. The store removes it and starts a plain New chat only if that draft was still open; a draft the user opened meanwhile stays open. Failures follow the REQ-006 mapping. | launch service, store | `chatLaunchService` (sequencing) / store (state) | — |
| DS-006 | `listed` stays true while the draft is open even if its text is cleared, so the open row reads "Empty draft". When the draft is left (DS-002/003), a textless draft is removed. Off the New chat surface, the rows composable hides a textless open draft. | store, rows composable | `chatDraftStore` | — |

## Spine Actors / Main-Line Nodes

`AppLeftPanel` (entry), `ChatDraftRows` (row UI), `useRunStart` (start/open intents + routing), `chatDraftStore` (draft collection owner), `chatLaunchService` (launch sequencing), `ChatNewSurface` (shows the open draft).

## Ownership Map

- **`chatDraftStore`** (governing owner) owns:
  - the draft collection and its order (array order = start order);
  - `openDraftId`;
  - the leave rule, the `listed` lifecycle, and discard/finish semantics;
  - per-draft model-choice generations;
  - all existing setters, which act on the open draft.
- **`useRunStart`** (thin intent boundary) owns which store action runs and which route opens, for every start and for `openChatDraft`. It owns no draft state.
- **`useChatDraftRows`** owns the row presentation projection:
  - which drafts are rows on the current route, in what order;
  - preview, tooltip and accessible name;
  - which row is selected, and whether a row is selected.
  - It is read-only over the store, apart from forwarding `discard`.
- **`ChatDraftRows.vue`** owns rendering, motion, × visibility and focus-after-discard.
- **`AppLeftPanel.vue`** places the rows, wires opening (`useRunStart` + drawer close) and computes the Chat row's active state.
- **`chatLaunchService`** owns launch sequencing; it calls `finishSentDraft` instead of `startNewChat`.

## Thin Entry Facades / Public Wrappers

| Facade | Governing Owner | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `useRunStart.openChatDraft` | `chatDraftStore` | Keep "which chat draft + which route" in the one intent owner | Draft list mutation beyond `openDraft` |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Scope |
| --- | --- | --- | --- |
| `const draft = ref<ChatDraft \| null>` in `chatDraftStore` | Single-draft model | `drafts` + `openDraftId`, `draft` becomes a computed over them | In this change |
| `chatDraftStore.startNewChat()` calls after launch success (`chatLaunchService.ts` ~L134, ~L222) | Would keep the sent draft and replace whatever is open | `chatDraftStore.finishSentDraft(draft)` | In this change |
| Global `modelChoiceGeneration` counter | Cancels pending default resolution of a draft that is now kept | Per-draft generation map keyed by draft id | In this change |

## Return Or Event Spine(s)

DS-005 (above).

## Bounded Local / Internal Spines

- Parent owner: `chatDraftStore`. Chain: `open draft text changes -> chatDraftHasText -> listed=true (once)`; and `install/openDraft -> leaveOpenDraft -> (not starting && !hasText) ? remove : keep -> openDraftId = null`.
- Why it matters: it defines exactly when rows appear, become "Empty draft", and disappear.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| `chatDraftHasText(draft)` (exported pure function in `chatDraftStore.ts`) | DS-001/002/006 | store, rows composable | One definition of "has text" | Used by the leave rule and the row filter | Duplicated, drifting definitions |
| Target display name for tooltip/aria | DS-001 | rows composable | Team name from `agentTeamDefinitionStore`, agent name from `agentDefinitionStore`, else `context.config.agentDefinitionName` | Accessible name | Store depending on display concerns |
| Drawer close | DS-003 | AppLeftPanel | `appLayoutStore.closeMobileMenu()` after opening | No route change when already on `/chat` (AF-008) | Drawer stays open on narrow screens |

## Ownership Boundaries

- Only `chatDraftStore` actions mutate `drafts`/`openDraftId`/`listed`.
- Components and composables read `drafts`, `openDraftId` and `draft`.
- Routing for chat starts/opens lives in `useRunStart`. The left panel does not call `router.push('/chat')` for drafts itself.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `chatDraftStore` actions | `install`, `leaveOpenDraft`, listed watcher, generation map | `useRunStart`, `chatLaunchService`, `useChatDraftRows`, `ChatNewSurface` | Mutating `drafts` arrays or `listed` from components | Add a store action |
| `useRunStart` | store start/open actions + router | `AppLeftPanel`, definition pages, run views | `AppLeftPanel` calling `chatDraftStore.openDraft` + `router.push` directly | Extend `useRunStart` |

## Dependency Rules

- **Allowed:**
  - `AppLeftPanel` → `useRunStart`, `useChatDraftRows`, `ChatDraftRows`, `appLayoutStore`;
  - `ChatDraftRows` → `useChatDraftRows`;
  - `useChatDraftRows` → `chatDraftStore`, definition stores, `vue-router` route (read);
  - `chatLaunchService` → `chatDraftStore.finishSentDraft`.
- **Forbidden:**
  - `chatDraftStore` → router, route or display stores (other than the existing ones it already uses for definitions/defaults);
  - components writing store state directly;
  - `ChatDraftRows` exposing state through component refs (the Product reference's `selectedRowShown` function ref is replaced by the composable).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `chatDraftStore.drafts` (readonly) | drafts | All kept drafts in start order | — | Open textless draft included until left |
| `chatDraftStore.openDraftId` / `draft` | open draft | Which draft New chat shows | `ChatDraft.id` | `draft` keeps its current meaning for all consumers |
| `chatDraftStore.openDraft(draftId)` | draft | Leave current open draft; open the given one | `ChatDraft.id` | No-op if unknown or already open |
| `chatDraftStore.discardDraft(draftId)` | draft | Remove; if open → `startNewChat()` | `ChatDraft.id` | Ignored while `starting` |
| `chatDraftStore.finishSentDraft(draft)` | draft | Remove the sent draft; if it was open → `startNewChat()` | `ChatDraft` object | Called only by `chatLaunchService` |
| `chatDraftStore.startNewChat` / `startForDefinition` / `ensureDraft` / `retarget` / setters | open draft | Unchanged signatures; `install` now keeps prior drafts with text | — | — |
| `chatDraftHasText(draft)` | draft | Has-text predicate | `ChatDraft` | Exported pure function |
| `useRunStart().openChatDraft(draftId)` | navigation intent | `openDraft` then `router.push('/chat')` | `ChatDraft.id` | — |
| `useChatDraftRows()` | row projection | `rows` (`{ id, preview, selected, tooltip, accessibleName, discardLabel }[]`), `rowSelected: boolean`, `discard(id)` | `ChatDraft.id` | New chat surface = `route.path === '/chat' && !route.query.id` |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Action |
| --- | --- | --- | --- | --- |
| `openDraft` / `discardDraft` | Yes | Yes (`ChatDraft.id`, never the context run id) | Low | — |
| `finishSentDraft(draft)` | Yes | Yes (object) | Low | — |
| `useChatDraftRows` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Draft collection | `drafts`, `openDraftId` | Yes | Low | Do not call it `activeDraftId`/`keptDrafts` alongside; one name each |
| Listed fact | `listed` | Yes | Low | — |
| Rows | `useChatDraftRows`, `ChatDraftRows.vue` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Draft state | `chatDraftStore` | Extend | Existing owner (AF-001) |
| Start/open intent + routing | `useRunStart` | Extend | Single start-intent owner |
| Drawer close | `appLayoutStore.closeMobileMenu` | Reuse | Existing |
| Row UI | — | Create New (`ChatDraftRows.vue`, `useChatDraftRows.ts`) | No existing draft-row UI |
| Localization | `localization/messages/{en,zh-CN}/shell.ts` | Extend | Left-panel strings live there |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `stores/` chat draft | collection lifecycle | DS-001..006 | Extend |
| `composables/runSettings` (start intent) | start/open routing | DS-002/003 | Extend |
| `composables/chat` | row projection | DS-001/003/004 | Create file |
| `components/chat` | row rendering | DS-001/004 | Create file |
| `components/AppLeftPanel.vue` | placement, Chat row state, open wiring | DS-003 | Extend |
| `services/chat` | launch sequencing | DS-005 | Modify |

## Draft File Responsibility Mapping

See Final mapping (no extraction changed the draft).

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Owner | Why Shared | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Has-text rule | `chatDraftHasText` in `stores/chatDraftStore.ts` | `chatDraftStore` | Store leave rule + rows filter | Yes | Yes | A general text utility |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `ChatDraft` + `id: string` (stable, `chat-draft-<n>`), `listed: boolean` | Yes | Yes (no `createdAt`: order = array order) | Low | `id` is never `context.state.runId`, which still holds the temp run id used for uploads and launch |

## Final File Responsibility Mapping

| File | Area | Owner / Boundary | Concrete Concern |
| --- | --- | --- | --- |
| `autobyteus-web/stores/chatDraftStore.ts` (Modify) | chat draft store | `chatDraftStore` | `drafts`/`openDraftId`; `install` leave rule; `openDraft`, `discardDraft`, `finishSentDraft`; listed watcher (`watch` on open draft has-text, `flush: 'sync'`); per-draft generation map (`isCurrent` = draft still in `drafts` and its generation unchanged); export `chatDraftHasText`; `ChatDraft.id`, `ChatDraft.listed` |
| `autobyteus-web/composables/runSettings/useRunStart.ts` (Modify) | start intent | `useRunStart` | Add `openChatDraft(draftId)`; update the `newChat` doc (drafts with text are kept) |
| `autobyteus-web/composables/chat/useChatDraftRows.ts` (Add) | chat UI | row projection | Rows = drafts with `listed && (hasText \|\| (open && onNewChatSurface))`, newest first; `selected = open && onNewChatSurface`; preview = text with whitespace collapsed (empty → "Empty draft" flag); tooltip `text\ntarget`; aria `Draft: text — target`; `rowSelected`; `discard` |
| `autobyteus-web/components/chat/ChatDraftRows.vue` (Add) | chat UI | row rendering | Markup/styles/motion/× visibility per UI/UX spec; focus after discard; emits `open(id)` |
| `autobyteus-web/components/AppLeftPanel.vue` (Modify) | shell | left panel | Render `ChatDraftRows` directly under the Chat row; `data-test="app-left-panel-chat"` on the Chat button; Chat row active = `isPrimaryNavActive('chat') && !rowSelected` (also for pencil/collapse button tints); row open → `beginSelectionIntent()`, `runStart.openChatDraft(id)`, `appLayoutStore.closeMobileMenu()` |
| `autobyteus-web/components/chat/ChatNewSurface.vue` (Modify) | chat UI | New chat surface | `:key="draft.id"` on `ChatComposer` |
| `autobyteus-web/services/chat/chatLaunchService.ts` (Modify) | launch | `chatLaunchService` | Replace both post-success `startNewChat()` calls with `finishSentDraft(draft)`; update doc comments |
| `autobyteus-web/localization/messages/en/shell.ts`, `zh-CN/shell.ts` (Modify) | localization | catalogs | `shell.components.AppLeftPanel.drafts` (Drafts / 草稿), `.draft` (Draft / 草稿), `.discard_draft` (Discard draft / 丢弃草稿), `.draft_empty` (Empty draft / 空草稿) |
| Tests (Modify/Add) | — | — | `stores/__tests__/chatDraftStore.spec.ts`, `services/chat/__tests__/chatLaunchService.spec.ts`, `composables/runSettings/__tests__/useRunStart.spec.ts`, `components/__tests__/AppLeftPanel*.spec.ts`, new `components/chat/__tests__/ChatDraftRows.spec.ts` / `composables/chat/__tests__/useChatDraftRows.spec.ts`, `localization/messages/__tests__/shellCatalog.spec.ts` if it enumerates keys |

## Applied Patterns

None beyond the existing Pinia store + composable pattern.

## Target Subsystem / Folder / File Mapping

As in the Final File Responsibility Mapping; all files sit in existing folders matching their owner.

## Folder Boundary Check

| Folder | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `composables/chat/` | Off-spine projection | Yes | Low | Sits beside `chatDraftComposerTarget.ts`, `useChatComposerOptions.ts` |
| `components/chat/` | UI | Yes | Low | Sits beside the other chat components |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Leave rule | `install()` → `leaveOpenDraft()` → append + open | Each caller (Chat, Run, "+") checking text and deleting drafts | One rule, one owner |
| Empty-draft memory | Store-owned `listed` set at first text | Component-local `wasListed` Set (Product reference) that is lost on remount and duplicated per instance | Correct across drawer/panel remounts |
| Chat row state | `useChatDraftRows().rowSelected` used by `AppLeftPanel` | Function-ref `defineExpose({ selectedRowShown })` read from the child (Product reference) | No component-ref coupling |
| After send | `finishSentDraft(sent)`: remove; `if (openDraftId === sent.id) startNewChat()` | Always `startNewChat()` (Product reference), which would replace a draft the user opened during the send | No surprise switch |
| Draft identity | `id: 'chat-draft-3'`; `context.state.runId: 'temp-chat-…'` → promoted id | Using `context.state.runId` as the row key | `runId` changes on promotion (AF-005) |
| Has text | `"/rev"` → false; `"/review this"` → true; `"  "` → false | Counting attachments or skills | REQ-001 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep a "single draft" mode or setting | Old behavior | Rejected | Collection only |
| Keep `startNewChat()` after launch alongside `finishSentDraft` | Minimal diff | Rejected | `finishSentDraft` only |

## Change / Refactor Sequence

1. `chatDraftStore`: collection, `id`/`listed`, leave rule in `install`, `openDraft`/`discardDraft`/`finishSentDraft`, listed watcher, per-draft generation, `chatDraftHasText`. Update store tests.
2. `chatLaunchService`: `finishSentDraft` at both success sites. Update launch tests: a failure keeps the draft listed; success removes only the sent draft; a draft opened during the send stays open.
3. `useRunStart.openChatDraft`, plus tests.
4. `useChatDraftRows` + `ChatDraftRows.vue` + localization, plus tests.
5. `AppLeftPanel` integration (placement, Chat row state, drawer close) and `ChatNewSurface` composer key, plus panel tests.
6. Browser validation against VIS-001..008 and SCN-001..005 per `TESTING.md`.

## Key Tradeoffs

- **No draft id in the URL.** Drafts are session-only, so a URL id would not survive a reload anyway, and `/chat` keeps one meaning ("the open New chat"). The cost: browser back/forward does not switch drafts. That is irrelevant in the desktop app and not required.
- **A textless open draft stays in the store while the user is elsewhere**, hidden from rows, and is dropped at the next start/open. This keeps the existing collapsed-strip behavior (reopening the current New chat), which the spec keeps out of scope.

## Risks

- **Model-default resolution for kept drafts.** This is mitigated by the per-draft generation (a pending resolution is no longer cancelled by starting another draft).
- **Server-side draft attachment uploads of dropped/discarded drafts are not deleted.** This is today's behavior; there's a residual-storage note but it's out of scope.
- **The REQ-006 agent hand-off interpretation** (see the mapping). It's flagged to the user; the visible behavior equals today's.

## Guidance For Implementation

- Follow the UI/UX spec for every visible detail (row 32px, `pl-9 pr-9`, 13px/20px `gray-700`, selected `bg-gray-100 gray-900`, × rules incl. `@media (hover: none)`, `aria-current="page"`, list name "Drafts", 150 ms fade/height with none under `prefers-reduced-motion`).
- Use `TransitionGroup` for rows; the `motion-reduce` variant or a media query must disable it.
- Keep `retarget` behavior unchanged (same draft, text kept).
- `discardDraft` and the leave rule must ignore a draft whose `starting` is true.
- Validation: unit/component tests for the store, launch, rows and panel. Then do a browser check of SCN-001..005 and VIS-001..008 on the real New chat surface, per `TESTING.md`. Include a real attachment upload and re-entry, and AC-010 (reload → no rows).
