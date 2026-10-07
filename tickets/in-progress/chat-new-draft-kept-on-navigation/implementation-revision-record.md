# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer — handoff-architecture-design-complete.md (initial) | N/A | `Initial Baseline` | SR-005; ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Implemented; local checks pass; direct API/E2E route |
| IR-002 | Code Reviewer — code-review-report.md, CRR-001 (failure origin of API-REV-001) | F-001 | `Local Fix` | SR-005; ARCH-REV N/A; CRR-001; API-REV-001; DR N/A | Fixed; local checks pass; back to API/E2E |

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

### IR-002 — A draft being sent keeps its sent text on its row (F-001)

- Triggering role, report path, and round: Code Reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/tickets/in-progress/chat-new-draft-kept-on-navigation/code-review-report.md` (CRR-001). This is the failure-origin review of API/E2E API-REV-001.
- Triggering finding IDs: F-001
- Classification: `Local Fix`
- Prior authoritative result:
  - IR-001. During an agent send, `showSubmittedMessage` clears `context.requirement` while the draft is still open.
  - The row was derived only from `context.requirement`, so it read "Empty draft" until `finishSentDraft`. This was observed in D00, D07 and D09.
  - In D09 the sent row also vanished early once another draft was opened, because `chatDraftHasText` was false.
- Current authoritative result:
  - `ChatDraft.sentText` is set by `markStarting` and reset to `null` by `clearStarting`.
  - The exported `chatDraftText(draft)` (`sentText ?? context.requirement`) is the single text source for `chatDraftHasText` and the row preview, tooltip and aria name.
  - A starting draft keeps its sent text on the row until `finishSentDraft` removes it with the normal 150 ms leave.
  - A failed send (`clearStarting`) returns the row to the typed text; the D06 field preservation is unchanged.
  - The composer-clear behavior in `localUserSubmission` is untouched.
- Related solution revision IDs: SR-005
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this revision is recorded: the implementation-owned Local Fix for F-001.
- Approved behavior or requirement IDs affected: REQ-006 / AC-005 (UI/UX TR-004 / UXJ-003). REQ-008 is unchanged: "Empty draft" now appears only when the user clears the text.
- Implementation delta: as described above. The fix is keyed on `starting`, so it covers both the immediate clear and the clear of a held mention send on acceptance.
- Changed files or areas:
  - `autobyteus-web/stores/chatDraftStore.ts` (`sentText`, `chatDraftText`, `markStarting`/`clearStarting`)
  - `autobyteus-web/composables/chat/useChatDraftRows.ts` (preview from `chatDraftText`)
  - Tests: `stores/__tests__/chatDraftStore.spec.ts` (+1), `components/chat/__tests__/ChatDraftRows.spec.ts` (+2: sent row keeps its text, survives another draft opening, and leaves on finish; a failed send returns to normal), `services/chat/__tests__/chatLaunchService.spec.ts` (fixture field)
- Local validation and result:
  - The focused web suite passes: 26 files, 193 tests.
  - The font-size audit still fails with its pre-existing 14 violations on base `cfeda548b`; none are in changed files.
  - I did not rerun the live probe `test:e2e:chat-draft-rows-live` (owned by API/E2E).
- Next recipient or routing: per `get_handoff_rules` (direct API/E2E). Please re-check D00, D07, D09 and D06.
- Remaining limitations or risks: unchanged from IR-001.
