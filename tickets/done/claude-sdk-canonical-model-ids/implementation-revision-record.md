# Implementation Revision Record — claude-sdk-canonical-model-ids

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | solution_designer / `solution-handoff.md` / initial | N/A | `Initial Baseline` | `SR-003` | Implemented; ready for direct API/E2E validation |

## Revision Entries

### IR-001 — Canonical Claude model IDs in model pickers (initial baseline)

- Triggering role, report path, and round: solution_designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-canonical-model-ids/tickets/in-progress/claude-sdk-canonical-model-ids/solution-handoff.md`, initial
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation committed on `codex/claude-sdk-canonical-model-ids` @ `23e72c3fa`; local checks green except pre-existing/environmental failures listed in the handoff
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation of the approved design
- Approved behavior or requirement IDs affected: BEH-001..003, BEH-005, BEH-006; REQ-001..010
- Implementation delta: Claude `canonical_name` = SDK `resolvedModel` (with a fallback); server-derived `selection_presentation` hint and GraphQL `ModelDetail.selectionPresentation`; a shared web picker builder with alias folding, Claude labels and descriptions, and recommended-first ordering; alias-aware matching, the Recommended badge and no-emit re-select in `SearchableGroupedSelect`; an alias-aware filter in `RuntimeModelConfigFields`; en/zh-CN badge strings; the duplicated inline builders removed
- Changed files or areas: see `implementation-handoff.md` → Key Files Or Areas (28 files in the commit)
- Local validation and result: server build typecheck and build pass; focused server vitest 198/201 (3 pre-existing failures, confirmed on base); web vitest 1514/1514; web guards and localization audit pass; live browser check of the agent run config against `dropdown-preview.md` §2, §3, §4a and search
- Next recipient or routing: `/api_e2e_engineer` (direct route, Medium/Low)
- Remaining limitations or risks: web `vue-tsc` not runnable in this environment; team run config and member override not browser-exercised (component-tested); live Claude integration test not run
