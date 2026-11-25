# Implementation Revision Record

The current code and `implementation-handoff.md` are the authority. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-implementation-001.md`, SR-002 (direct route) | N/A | `Initial Baseline` | SR-001, SR-002; ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Section removed from every runtime's prompt at `92d9b01ef3`; unit, typechecks, prompt E2E and the live Claude check pass → API/E2E |

## Revision Entries

### IR-001 — Remove the "Long-Running Commands" section from every runtime's system prompt

- Triggering role, report path, and round: Solution Designer, `tickets/in-progress/remove-long-running-prompt-649/handoff-implementation-001.md`, implementation round 1.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: commit `92d9b01ef3` plus the documents commit; `implementation-handoff.md`.
- Related solution revision IDs: `SR-001`, `SR-002`. Architecture-review, code-review, API/E2E and delivery: `N/A`.
- Why this baseline is recorded: the initial implementation of the design.
- Approved behavior or requirement IDs affected: REQ-001, REQ-002 (BEH-001); AC-001, AC-002, AC-003.
- Implementation delta:
  - `long-running-command-sections.ts` deleted.
  - The composer returns to its pre-483 shape: no `longRunningCommandSection` input or native append.
  - Five backends and the ACP profile stop carrying the section.
  - Tests are rewritten to the pre-483 endings plus absence checks; the snapshot is updated.
  - `prompt_engineering.md` and `agent_execution.md` (one sentence and link, beyond the design's list) are updated.
- Changed files or areas: 8 source files (one deleted), 2 docs, 18 test files and the snapshot. See the handoff.
- Local validation and result:
  - IMP-01: units 2334 pass.
  - IMP-02: both typechecks PASS.
  - IMP-03: prompt E2E 4 + 24 pass.
  - IMP-04: live Claude prompt has no section and ends with Global Semantic Memory.
- Next recipient or routing: `get_handoff_rules` → `/api_e2e_engineer` (Small/Low).
- Remaining limitations or risks: none. AC-003's grep leaves only the absence assertions AC-001 requires (handoff note).
