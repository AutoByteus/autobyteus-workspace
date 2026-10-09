# Implementation Revision Record — gemini-native-cache-hit

The current code and `implementation-handoff.md` are authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-architecture-design-complete.md`, round 1 | N/A | `Initial Baseline` | SR-002; ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Implemented; local checks pass (one unrelated, pre-existing `autobyteus-ts` failure is recorded with its cause) |

## Revision Entries

### IR-001 — AGY usage declared `base_excludes_cache`; Gemini 3.1 Pro official prices

- Triggering role, report path, and round: `solution_designer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-native-cache-hit/tickets/in-progress/gemini-native-cache-hit/handoff-architecture-design-complete.md`, round 1
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete, Small / Low confirmed, direct route
- Related solution revision IDs: SR-002
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation of the approved SR-002 scope
- Approved behavior or requirement IDs affected: BEH-002 (REQ-002, AC-002), BEH-003 (REQ-004, AC-005, AC-006), REQ-005 / AC-007 (fix-forward)
- Implementation delta:
  - `AgyStreamEventConverter` declares `input_token_semantic: "base_excludes_cache"` (it was `"gross_includes_cache"`).
  - The Gemini 3.1 Pro Preview catalog entry now has base 2.0 / 12.0 / cached 0.2. Tier `prompt_le_200k` is 2.0 / 12.0 / 0.2 and tier `prompt_gt_200k` is 4.0 / 18.0 / 0.4.
  - Four focused unit tests were added (converter, two run-fold cases, catalog).
- Changed files or areas:
  - `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts`
  - `autobyteus-ts/src/llm/supported-model-definitions.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts`
  - `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-run-fold.test.ts`
  - `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts`
- Local validation and result: see `implementation-handoff.md` › Local Implementation Checks Run. The new tests fail against the old production values and pass with the fix. Server typecheck passes, and so do the server token-usage and AGY suites and the server unit suite. In `autobyteus-ts` `tests/unit/llm`, one test fails on the unmodified base too; it is unrelated to this change, and its cause is recorded.
- Next recipient or routing: per `get_handoff_rules` (Small/Low, direct route)
- Remaining limitations or risks: the one-time effect on AGY conversations that span the upgrade (see handoff › Known Risks). AC-003 still needs the user's live check.
