# Implementation Revision Record — draft-run-id-validation

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer / `design-review-report.md` / round 2 (Pass) | N/A (non-blocking `%2E` note applied) | `Initial Baseline` | SR-003, ARCH-REV-002 | Implemented; ready for code review |

## Revision Entries

### IR-001 — One owner-ID rule, filename allowlist, descriptor-family containment error, agent-final 400 mapping

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `tickets/in-progress/draft-run-id-validation/design-review-report.md`, round 2 (Pass, ARCH-REV-002).
- Triggering finding IDs: N/A. The non-blocking note to exercise the dot-only rule with `%2E` against an existing owner folder is applied.
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: D1–D5 and the removals are implemented. One additional in-owner resolver fix keeps REQ-004 true for final locators (see handoff "Deviation"). One separate baseline test fix is included as its own commit.
- Related solution revision IDs: SR-003
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Related code-review, API/E2E and delivery revision IDs: N/A
- Why this baseline is recorded: first implementation handoff for SR-003.
- Approved behavior or requirement IDs affected: REQ-001..009, AC-001..009, BEH-001..008, QR-001.
- Implementation delta:
  - **Codec** (`context-file-owner-types.ts`):
    - `safeIdentity` now applies to `draftRunId`, `teamDraftId` and `agent_final.runId`.
    - `filename()` uses the `[A-Za-z0-9._-]+` allowlist, rejects dot-only names and any `..` substring, and does no trimming.
    - `assertExactFields` makes `agent_draft` and `team_member_draft` exact. It is also reused by the existing Org, collaboration and Team-final exact checks, with identical messages.
    - New `ContextFilePathContainmentError extends ContextFileDescriptorError`.
    - Removed `required()`, `getStoredFilenameFromLocator` and `getDisplayNameFromStoredFilename`.
  - **Layout:** `resolveSafeChildPath` throws `ContextFilePathContainmentError`.
  - **REST:** the agent-final route maps `ContextFileDescriptorError` to 400 with `detail`.
  - **Resolver:** final-owner parsing moved inside the existing catch, through the codec, for all four final kinds.
  - **Tests and docs:** tests, the probe and TESTING.md as mapped.
- Changed files or areas: see the handoff "Key Files Or Areas".
- Local validation and result: see the handoff "Local Implementation Checks Run".
- Next recipient or routing: per `get_handoff_rules` (High risk → code review).
- Remaining limitations or risks: see the handoff "Known Risks".
