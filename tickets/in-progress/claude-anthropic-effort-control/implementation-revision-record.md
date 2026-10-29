# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates the implementation baseline and its rationale.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, design-spec.md at SR-002 (initial implementation; SR-001 implementation held mid-round for the user's requirement change) | N/A | `Initial Baseline` | SR-001, SR-002; ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Implementation complete; direct API/E2E route |

## Revision Entries

### IR-001 — Claude effort control: one thinking list, no display, owned config keys; gen-4 Claude rows removed

- Triggering role, report path, and round: Solution Designer, `design-spec.md` (SR-002, ticket docs commit `4db2efa01`), initial implementation round.
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A. (Within this round the SR-001 design was implemented first and committed as WIP `781823e77`; the user changed the thinking UX on seeing the rendered menu, it was returned as a Requirement Gap and the Solution Designer issued SR-002. The SR-001 WIP is history only, not a delivered result.)
- Current authoritative result: implementation commit `574aa0bd7`; tests and evidence committed with this record.
- Related solution revision IDs: SR-001 (superseded), SR-002.
- Related architecture-review revision IDs: N/A (direct route).
- Related code-review revision IDs: N/A (direct route).
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation handoff for the package.
- Approved behavior or requirement IDs affected: REQ-001..REQ-011; AC-001..AC-011; BEH-001..BEH-007.
- Implementation delta (against base `9ad7540c2`):
  - Catalog: `reasoning_effort` on all 7 Claude rows (levels low..max; default medium for Opus 5.5 and Haiku 5.5, high otherwise); no `thinking_display` anywhere; switch rows = `thinking_enabled` + `reasoning_effort`; Opus 5.5 and Fable 5.1 = effort only; gen-4 rows and the budget schema removed.
  - Policy: `ANTHROPIC_EFFORT_LEVELS`; `legacy_budget`, its entries and the unknown-model fallback removed (unknown value throws).
  - `AnthropicLLM`: reads only `thinking_enabled` and `reasoning_effort` from the run config (no other config key is sent); `output_config.effort` merged in, not sent while thinking is off; never sends `display`; unknown effort fails locally; budget/temperature-0 branches removed.
  - Web: Claude keys `thinking_enabled` + dependent `reasoning_effort` (existing merged one-list menu); budget and display handling removed, including the now-unused numeric menu parameter.
  - Docs and tests updated; new server-level AC-011 resume test (synthetic by default, live with the test vault).
- Changed files or areas: see `implementation-handoff.md` Key Files.
- Local validation and result: Checks Run IMP-01..IMP-14 in `implementation-handoff.md`; all pass except 3 pre-existing environmental terminal-tool failures (IMP-02) and 1 intermittent unrelated web teardown error (IMP-03).
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer` (task_size Medium, architectural_risk Low).
- Remaining limitations or risks: RISK-1..RISK-4 in `implementation-handoff.md`.
