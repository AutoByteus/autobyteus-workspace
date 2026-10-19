# Implementation Revision Record — run-file-change-owner-scoped-reads

The current code and `implementation-handoff.md` remain authoritative. This record indexes the implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 2 (pass) | N/A | `Initial Baseline` | `SR-003`, `ARCH-REV-002` | Implemented; server and web checks pass; ready for code review |

## Revision Entries

### IR-001 — Owner-scoped file-change reads (initial implementation)

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `design-review-report.md`, round 2 (`ARCH-REV-002`, Pass)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implemented on `codex/run-file-change-owner-scoped-reads` — `5d6127cee4` (server), `03f2d4da05` (web); `Medium` / `High` confirmed; routed to code review.
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-002` (AR-001 and AR-002 addressed as designed)
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: first implementation of the reviewed design.
- Approved behavior or requirement IDs affected: BEH-001..BEH-009; REQ-001..REQ-009; AC-001..AC-009, AC-011, AC-012 (AC-010 and AC-013 are validated by API/E2E).
- Implementation delta:
  - Server steps 1–4: `CollaborationMemberNotFoundError`; `locatedExecutionSource` (configured placement, else catalog copy in the located tree, all three families), `locatedLaunchConfiguration` delegates, exported `tagTeamAgentExecution` and tagged team type; the three `childSourceOf` replaced; team `requireLocation` passes `rootTeamRunId`.
  - `RunFileChangeProjectionService`: standalone reads renamed and metadata-first (AR-001); `resolveLocatedCollaborationMemberEntry` added; fallback scan, its locators and `getEntry` removed.
  - Member-view `getFileChanges` / `resolveFileChangeEntry`; GraphQL `getTeamMemberFileChanges`, `getAgentOrgMemberFileChanges`; REST owner routes with one response policy.
  - Web steps 5–6: `AgentRunReadSubject` moved (no alias); `fetchRunFileChanges(subject)` with five callers; `runFileChangeContentPath`; viewer `readSubject` with the mismatch guard; Artifacts tab and mobile; queries and regenerated types.
  - Tests for all of the above. Containment e2e: the copy's `getRunFileChanges` replaced by the hub-scoped read; a team-member context-file read (FU-A surface) kept as the hub-scanning trigger (R-003).
- Changed files or areas: see `implementation-handoff.md` → "Key Files Or Areas".
- Local validation and result: see `implementation-handoff.md` → "Checks Run" (IMP-01..IMP-07); IMP-06a's one failing case is analysed there (not caused by this change; run 2 passes).
- Next recipient or routing: `/software_engineering_team/code_reviewer`
- Remaining limitations or risks: gated server E2E edits not run; no web typecheck available; real-stack browser journey and timing left to API/E2E; follow-ups FU-A (design) and FU-B (unread `LocatedStandaloneRootAgentExecution.launchConfiguration`).
