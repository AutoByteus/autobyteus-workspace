# Implementation Revision Record

The current code (`codex/org-member-switch-performance` @ `88bd41620`) and `implementation-handoff.md` remain authoritative. This record locates and explains each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer / `handoff-result.md` / initial implementation | N/A | `Initial Baseline` | `SR-003`; `ARCH-REV-*` N/A; `CRR-*` N/A; `API-REV-*` N/A; `DR-*` N/A | Implemented; local checks pass; QR-001/002/003 met on the snapshot harness |

## Revision Entries

### IR-001 — On-demand reference IDs, single list computation, bounded reference rows

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/org-member-switch-performance/tickets/in-progress/org-member-switch-performance/handoff-result.md`, initial implementation (direct route).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: Design spec SR-003 implemented in commit `88bd41620`. Member switches 20–67 ms (baseline up to 4,232 ms), ≤ 20 reference rows after a switch (baseline 41,965), Show all 3,136 = 261 ms.
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: Initial implementation handoff baseline.
- Approved behavior or requirement IDs affected: BEH-001, BEH-003, BEH-004, BEH-005, BEH-006 (changed); BEH-002 (preserved). REQ-001–REQ-008.
- Implementation delta:
  1. `projectAgentOrgReference` returns the same frozen record, with `referenceId` as a memoized getter (same `sha256(messageId\0path)` hex).
  2. `CollaborationMessagesSection` computes `rows = listMessages()` once; the header count uses `rows.length`; `rows` is passed to the Panel.
  3. `CollaborationMessagesPanel` has a required `rows` prop and no longer calls `listMessages()`. Each message with references shows a paperclip count (`data-test="team-communication-reference-count"`, localized title and screen-reader label, number formatted with the app locale). Reference rows render only under the selected message: first `REFERENCE_PREVIEW_LIMIT = 20`, then `Show all N files` (`data-test="team-communication-show-all-references"`). `showAllReferences` resets on selected-message, focused-member or root change, not on same-message row updates. `selectedReference` no longer scans references when no reference is selected.
  4. Locale keys `reference_count_label` and `show_all_references` in en and zh-CN.
  5. Specs updated and extended (see handoff).
- Changed files or areas: `autobyteus-web/services/agentOrgExecution/agentOrgReferenceProjection.ts`, `autobyteus-web/components/workspace/collaboration/CollaborationMessagesSection.vue`, `autobyteus-web/components/workspace/collaboration/CollaborationMessagesPanel.vue`, `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts`, and the three spec files.
- Local validation and result: affected vitest suites pass (13 files / 106 tests in collaboration + agentOrgExecution + agentCollaboration); localization audit and boundary guard pass; `tsc` reports no errors in changed TS files; production build plus snapshot harness meets QR-001/002/003; rendered panel inspected (see handoff).
- Next recipient or routing: `/api_e2e_engineer` (Small + Low direct route).
- Remaining limitations or risks: Electron timing not measured (UNK-002); vue-tsc not available, so SFC script blocks are not type-checked; two pre-existing `RightSideTabs.workspaceTarget.spec.ts` failures also fail on base.
