# Implementation Handoff — New chat Draft rows under the Chat row

All paths are absolute. The worktree root is `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence` (branch `codex/chat-composer-draft-persistence`, base `origin/personal` @ `cfeda548b`).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: design classified `Medium` / `Low`. The direct implementation route applied; independent architecture review was not selected.
- Requirements doc (Approved, SR-004): `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/tickets/in-progress/chat-new-draft-kept-on-navigation/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/tickets/in-progress/chat-new-draft-kept-on-navigation/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/tickets/in-progress/chat-new-draft-kept-on-navigation/solution-revision-record.md`
- Design spec (Ready, SR-005): `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/tickets/in-progress/chat-new-draft-kept-on-navigation/design-spec.md`
- Supplemental task artifacts:
  - Product UI/UX spec (normative, user-confirmed): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/chat-new-draft-kept-on-navigation/ui-ux-spec.md`
  - Visual references VIS-001..008: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/chat-new-draft-kept-on-navigation/visual-references/`
  - Product design request (history): `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/tickets/in-progress/chat-new-draft-kept-on-navigation/product-design-request.md`
  - Architecture-complete handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/tickets/in-progress/chat-new-draft-kept-on-navigation/handoff-architecture-design-complete.md`
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: `N/A` (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/tickets/in-progress/chat-new-draft-kept-on-navigation/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-005`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

The implementation follows the design spec with no deviations.

- **`chatDraftStore`**
  - The single draft is replaced by `drafts` (start order) plus `openDraftId`. `draft` stays the open-draft getter, so existing consumers are unchanged.
  - `ChatDraft` gains a stable `id` (`chat-draft-<n>`) and a store-owned `listed` flag.
  - A sync watcher sets `listed` at the open draft's first typed text.
  - `install()` first leaves the open draft. It removes that draft only when it is not `starting` and has no text.
  - New actions:
    - `openDraft(id)`;
    - `discardDraft(id)`, which ignores a `starting` draft and opens a fresh New chat when the discarded draft was open;
    - `finishSentDraft(draft)`, which removes the draft and starts a fresh New chat only if the sent draft is still open.
  - Model-choice generations are now per draft (a `Map`), so starting another chat no longer cancels a kept draft's default-model resolution.
  - The exported pure function `chatDraftHasText` counts trimmed text that is not a lone `/\S*` token.
- **`useRunStart.openChatDraft(id)`** calls `openDraft`, then routes to `/chat`. `newChat` is unchanged apart from its doc comment.
- **`useChatDraftRows`** (new) builds the row projection:
  - rows are listed drafts with text, plus the open listed draft while the New chat surface shows it (so it can read "Empty draft"), newest first;
  - each row has `selected`, a one-line preview, a tooltip, an accessible name and a discard label;
  - it also exposes `rowSelected` and `discard`.
- **`ChatDraftRows.vue`** (new) renders the rows per the UI/UX spec:
  - `TransitionGroup` with a 150 ms fade/height motion, turned off under `prefers-reduced-motion`;
  - the × is visible on hover, on focus-within, on the selected row, and always under `hover: none`;
  - `aria-current="page"` on the open row; the list is named "Drafts";
  - focus after discard moves to the next row, else the previous row, else the Chat row.
- **`AppLeftPanel.vue`**
  - The Chat row's buttons are wrapped in a `relative` div so the absolutely positioned pencil and collapse buttons stay on the Chat row.
  - `ChatDraftRows` sits directly under the Chat row.
  - The Chat button gets `data-test="app-left-panel-chat"`.
  - The Chat row and its pencil/collapse tints are active only when `isPrimaryNavActive('chat') && !rowSelected`.
  - A row click calls `beginSelectionIntent()`, then `runStart.openChatDraft(id)`, then `appLayoutStore.closeMobileMenu()`.
- **`ChatNewSurface.vue`**: `ChatComposer` is keyed by `draft.id`.
- **`chatLaunchService`**: both post-success `startNewChat()` calls are replaced by `finishSentDraft(draft)`. Failure paths are unchanged (they throw and keep the draft).
- **Localization** (en / zh-CN): `shell.components.AppLeftPanel.drafts`, `.draft`, `.discard_draft`, `.draft_empty`.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: design-spec.md, "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - 7 production files plus 2 catalogs, all in `autobyteus-web`, inside the existing chat and left-panel owners.
  - No API, persistence, security, deployment or server change.
  - The store keeps its `draft` getter, so the consumers in AF-002 are unchanged.
  - None of the design's escalation triggers fired.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes`. Checked:
  - the boundary rule (only store actions mutate drafts);
  - no component-ref coupling;
  - removal of the single-draft ref and the global generation counter;
  - file sizes;
  - the starting-draft guards in the leave and discard rules;
  - focus fallback scoping (queried inside the Chat item, not `document`).
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001/002 (REQ-004) | Chat and pencil open a blank New chat; earlier drafts with text are kept | `AppLeftPanel` → `useRunStart.newChat` → `chatDraftStore.startNewChat` → `install` → `leaveOpenDraft` | Implemented; store + panel tests |
| BEH-006 (REQ-005) | Run / "+" / tree "+" start fresh; earlier drafts with text are kept | `useRunStart` (`openChat`, `newChatInWorkspace`) → `startForDefinition` / `startNewChat` → `install` | Implemented; store test |
| BEH-007 (REQ-001/002) | A row appears at the first typed text, newest first, one line | `chatDraftStore` listed watcher + `chatDraftHasText`; `useChatDraftRows.rows`; `ChatDraftRows.vue` | Implemented; store + rows tests |
| BEH-007 (REQ-003) | A row reopens the draft intact; the row is selected and the Chat row is not | `ChatDraftRows` `open` → `AppLeftPanel.openChatDraft` → `useRunStart.openChatDraft` → `chatDraftStore.openDraft` → `/chat`; `ChatNewSurface` composer keyed by `draft.id`; Chat-row state uses `rowSelected` | Implemented; store (all fields) + panel tests. Not rendered in a browser (see Frontend check) |
| BEH-007 (REQ-007) | × discards without confirmation; discarding the open draft shows a blank New chat; focus moves | `ChatDraftRows.discardRow` → `useChatDraftRows.discard` → `chatDraftStore.discardDraft` | Implemented; store + rows tests (focus next/prev/Chat) |
| BEH-007 (REQ-008) | A cleared open draft reads "Empty draft" until it is left, then is dropped | `listed` stays true; rows filter shows the open listed draft only on the New chat surface; `leaveOpenDraft` drops it at the next start/open | Implemented; store + rows tests |
| BEH-007 (REQ-009/010) | Many drafts; section scrolls; visuals/a11y/motion per spec | Rows sit inside the existing scrolling, resizable primary section; spec classes and aria in `ChatDraftRows.vue` | Code-level only; visuals not rendered |
| BEH-004 (REQ-006) | Successful send removes that draft; failure keeps it; agent post-registration send failure finishes the draft (design interpretation) | `chatLaunchService` → `finishSentDraft(draft)` after navigation at both success sites | Implemented; launch + store tests |
| BEH-005 (REQ-011) | Session only; nothing persisted | Pinia state only; no storage writes added | Store test (localStorage empty; a fresh pinia has no drafts) |
| BEH-003 | Run composer text kept per run (preserved) | Untouched | Unchanged |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-web/stores/chatDraftStore.ts` (446 effective lines)
- `autobyteus-web/composables/runSettings/useRunStart.ts`
- `autobyteus-web/composables/chat/useChatDraftRows.ts` (new)
- `autobyteus-web/components/chat/ChatDraftRows.vue` (new)
- `autobyteus-web/components/AppLeftPanel.vue`
- `autobyteus-web/components/chat/ChatNewSurface.vue`
- `autobyteus-web/services/chat/chatLaunchService.ts`
- `autobyteus-web/localization/messages/{en,zh-CN}/shell.ts`
- Tests:
  - `stores/__tests__/chatDraftStore.spec.ts` (+9)
  - `services/chat/__tests__/chatLaunchService.spec.ts` (updated)
  - `composables/runSettings/__tests__/useRunStart.spec.ts` (+1)
  - `components/chat/__tests__/ChatDraftRows.spec.ts` (new, 6)
  - `components/__tests__/AppLeftPanel_v2.spec.ts` (+3)

## Important Assumptions

- **Row font size.** The row font is `text-[0.8125rem]` (13px at the 16px root), not `text-[13px]`. The repo's `tests/integration/app-font-size-fixed-px-audit.integration.test.ts` forbids fixed-px text in `components/chat`, and `0.8125rem` is the established equivalent there (38 existing uses). The rendered size is the spec's 13px.
- **× visibility on keyboard focus.** The × shows on `group-focus-within` (row or × focused) as well as on the ×'s own focus. This implements the spec's "on keyboard focus".
- **Spacing between rows.** Row gaps use `mt-px first:mt-0.5` on the items instead of `mt-0.5 space-y-px` on a conditionally rendered list. The list stays mounted so the first row's 150 ms enter animation plays. Visually it is the same 2px below Chat and 1px between rows. An empty list is `aria-hidden`.
- **Tooltip and accessible name without a target name.** If the target name cannot be resolved (for example, a team definition not loaded), both omit the "— ‹target›" part instead of showing a dangling dash.

## Known Risks

- The UI was not rendered in a browser in this round (per the user's instruction, below). Visual fidelity to VIS-001..008, the motion, the drawer behaviour, and composer remount focus relative to focus-after-discard are therefore covered only at code level.
- **Hidden starting draft.** An attachment-only draft (no text) whose send is in flight, which the user leaves and whose launch then fails, stays in the store as a hidden, unlisted draft. The design's leave rule keeps `starting` drafts and this is a contrived path, so no extra machinery was added.
- **Attachment uploads.** Server-side attachment uploads of dropped or discarded drafts are not deleted. This is the same as today and out of scope (design AF-010).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence: all starts already funnel through `install()`; the collection lifecycle fitted inside the existing owner.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Obsolete code removed: `Yes`. The single `draft` ref, the global `modelChoiceGeneration`, and the post-launch `startNewChat()` calls are removed.
- Shared structures remain tight: `Yes`. `ChatDraft` gained only `id` and `listed`; order comes from the array, with no timestamp.
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source files stayed within the size guardrails: `Yes`. `chatDraftStore.ts` has 446 effective non-empty lines. Its change delta is about 123 lines, and every other source delta is under 160 lines; the `AppLeftPanel` delta is mostly re-indentation.
- Notes: the Product reference's component-local `wasListed` set and `defineExpose` function ref were not adopted, per the design.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: design-spec.md, "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes`. No storage writes were added.
- Direct-use evidence or discard/rebuild result: N/A
- Migration implementation: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- Ran `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-web exec nuxt prepare` in the worktree.
- `pnpm dev` was started briefly for a browser check and stopped at the user's request before it was ready. All its processes are stopped, and ports 3000/8000 are free. The build output and dev state it created (`autobyteus-application-*-sdk*/dist`, `.autobyteus/`) were removed.

## Local Implementation Checks Run

- Focused web tests:
  ```
  pnpm -C autobyteus-web test:nuxt stores/__tests__/chatDraftStore.spec.ts services/chat/__tests__ composables/runSettings/__tests__/useRunStart.spec.ts components/__tests__/AppLeftPanel.spec.ts components/__tests__/AppLeftPanel_v2.spec.ts components/chat/__tests__/ChatDraftRows.spec.ts pages/__tests__/chat.spec.ts components/workspace/team/__tests__/TeamCanonicalPlus.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts tests/integration/workspace-history-draft-send.integration.test.ts localization --run
  ```
  All pass.
- Full web suite (`pnpm -C autobyteus-web test:nuxt --run`): 16 failed files / 35 failed tests.
  - The same 16 files fail on the unmodified base `cfeda548b` (rerun with this change stashed): application host/iframe/shell, FileExplorer metadata activation, workspaceSelectionComposition, org-definition-navigation, ToastContainer, MobileUxRefinement, AgentCompactionLiveFlow, teamTaskApprovalHydration, StartupDelayLifecycle, codex-turn-lifecycle, UserMessageStoredUploadNames, applicationAssetUrl, and the font-size audit.
  - The font-size audit had 14 violations before this change and has 14 after the rem fix; none are in this change's files.
- Type check: `tsc --noEmit -p tsconfig.json` shows no errors in the changed `.ts` files. The only errors on changed paths are the `.vue` module-resolution errors that tsc reports for all SFC imports, including existing files. The repo has no `vue-tsc` script.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces and journeys: left-panel primary nav (Chat row + Draft rows), New chat surface, narrow drawer; SCN-001..005.
- Approved references: the UI/UX spec plus VIS-001..008 (reviewed as images; VIS-002 and VIS-003 were compared against the class choices).
- Design system and adjacent surfaces reviewed:
  - the existing nav row styles in `AppLeftPanel.vue`;
  - the Product reference `ChatDraftRows.vue` @ `21643c2`;
  - Tailwind grey and indigo tokens and heroicons `x-mark`.
- Rendered surface used: **none.** The user decided on 2026-10-07 ("i guess for you just code letests will be enough") that implementation-scoped code tests suffice and that the rendered browser check is left to API/E2E. The `pnpm dev` stack was stopped before it was ready.
- States inspected: component-level DOM only. Covered: row presence and order, selected style and `aria-current`, the Empty draft italic grey, aria names and tooltips, discard focus movement, and the Chat-row active state.
- Visual issues found and corrected: the fixed-px font, caught by the repo audit, was changed to rem.
- Remaining unverified, for API/E2E:
  - pixel fidelity to VIS-001..008 (row 32px, alignment of the text with the "Chat" label, × placement);
  - hover, focus and touch visibility of the ×;
  - the 150 ms enter/leave motion and reduced motion;
  - drawer close on row tap (VIS-008);
  - the collapsed strip unchanged (VIS-007);
  - section scroll and resize with many drafts (VIS-006);
  - caret placement in the composer after re-entry;
  - whether the composer's autofocus after discarding the open draft competes with focus-after-discard.

## Downstream Coverage Hints / Suggested Scenarios

1. **SCN-001 / AC-001/002.** Pick a Team, attach a real image (real upload), and type text. Check that a row appears (selected, Chat row not). Open a team run, click the row, and check the identical heading, image preview, text, workspace, model/config (incl. thinking), Auto-approve and member customizations. Repeat with an Agent target.
2. **AC-001 alternates.** An attachment-only, skill-only or settings-only New chat produces no row. Typing `/rev` with the skill menu open produces no row.
3. **SCN-002 / AC-003/004.** With a draft open, Chat, the pencil, Run (agent and team), run "+" and workspace-tree "+" each give a fresh New chat, and the earlier draft stays listed and re-enterable. A blank New chat is not kept.
4. **SCN-003 / AC-005.**
   - Send from a reopened draft: the run opens and only that row goes.
   - Team launch failure: the user stays on New chat with the draft and its row.
   - Agent first-send failure after registration: the error shows in the temp run, and the row goes (design interpretation).
   - Open another draft while a send is in flight: it stays open after the send finishes.
5. **SCN-004 / AC-006.**
   - × on a non-open row: no dialog; focus goes to the next row, else the previous, else Chat.
   - × on the open row: blank New chat with the Chat row selected.
6. **SCN-005 / AC-007.** Clear all text: the row reads "Empty draft" (italic grey, selected). Leave via Chat or another row: it disappears. Typing again restores the preview.
7. **AC-008 / AC-009.** Seven long drafts: one line each with an ellipsis; the section scrolls and stays resizable. Check reduced motion, keyboard order (Chat → pencil → collapse → row → × → Agents), the narrow drawer (390×844) closing on row tap, and the collapsed strip unchanged.
8. **AC-010.** Reload: no rows, a blank New chat, and no new localStorage keys.
9. **Localization.** Under zh-CN: 草稿 (list), 空草稿, 丢弃草稿.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- All browser and real-stack validation: items 1–9 above, against VIS-001..008. This includes the real attachment upload and finalize on send after re-entry, and real agent and team sends. None of it was executed in implementation.
