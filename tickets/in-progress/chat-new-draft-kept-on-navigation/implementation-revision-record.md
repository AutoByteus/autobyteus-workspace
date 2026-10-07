# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer — handoff-architecture-design-complete.md (initial) | N/A | `Initial Baseline` | SR-005; ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Implemented; local checks pass; direct API/E2E route |

## Revision Entries

### IR-001 — Draft collection, Draft rows under Chat, sent-draft finish

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/tickets/in-progress/chat-new-draft-kept-on-navigation/handoff-architecture-design-complete.md`, initial round
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete per design-spec SR-005. Local implementation checks pass. Rendered browser check deferred to API/E2E at the user's direction.
- Related solution revision IDs: SR-005
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001/002/004/005/006/007; REQ-001..011; AC-001..010 (code level)
- Implementation delta:
  - `chatDraftStore` now holds `drafts` + `openDraftId`. `ChatDraft` gains `id` and `listed`. Added the `chatDraftHasText` predicate, the leave rule in `install()`, `openDraft`, `discardDraft`, `finishSentDraft`, and per-draft model-choice generations.
  - Added `useRunStart.openChatDraft`.
  - New `useChatDraftRows` composable and `ChatDraftRows.vue`.
  - `AppLeftPanel` renders the rows under Chat, computes the Chat-row active state from `rowSelected`, and closes the drawer when a row opens.
  - `ChatNewSurface` keys the composer by `draft.id`.
  - `chatLaunchService` calls `finishSentDraft` after a successful launch.
  - Added 4 en/zh-CN shell keys.
- Changed files or areas (all under `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/autobyteus-web/`): `stores/chatDraftStore.ts`, `composables/runSettings/useRunStart.ts`, `composables/chat/useChatDraftRows.ts` (new), `components/chat/ChatDraftRows.vue` (new), `components/AppLeftPanel.vue`, `components/chat/ChatNewSurface.vue`, `services/chat/chatLaunchService.ts`, `localization/messages/{en,zh-CN}/shell.ts`, and the related `__tests__`.
- Local validation and result:
  - Focused web tests pass.
  - The full web suite fails in the same 16 files / 35 tests as base `cfeda548b`; nothing new.
  - `tsc` shows no errors in the changed `.ts` files.
- Next recipient or routing: per `get_handoff_rules` (direct API/E2E for Medium/Low).
- Remaining limitations or risks: no rendered-browser verification (see handoff "Frontend Rendered-Result Check"); a hidden starting attachment-only draft after a failed launch; server-side draft uploads are not deleted (unchanged).
