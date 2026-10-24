# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `solution-designer-handoff.md`, initial | N/A | `Initial Baseline` | SR-001 | Implemented; web unit checks and boundary guard pass; ready for direct API/E2E |

## Revision Entries

### IR-001: Settings delegated rows use the root's naming rule

- Triggering role, report path, and round: Solution Designer, `solution-designer-handoff.md`, initial
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implementation at `5af1a03e11`; IMP-00…IMP-04 as in the handoff
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: initial implementation handoff
- Approved behavior or requirement IDs affected: BEH-001, BEH-002, BEH-003; REQ-001…004; AC-001…004 (AC-005 to API/E2E)
- Implementation delta: `teamMemberName` extracted and used by nav rows, contexts and Settings Team rows. Org/Agent rows use `memberDisplayName`. `nameAt` and the duplicated inline rules are removed. Docs "Keys and names" updated; DCR-001 header comment corrected; row-name unit cases added.
- Changed files or areas: `teamExecutionTreeSelectors.ts`, `teamExecutionContextFactory.ts`, `delegatedLaunchRows.ts`, `delegatedLaunchRows.spec.ts`, `docs/settings.md`, `tests/e2e/delegated-copy-own-file-cases.mjs`
- Local validation and result: see the handoff's Checks Run
- Next recipient or routing: per `get_handoff_rules` (direct API/E2E for Small + Low)
- Remaining limitations or risks: no rendered look by implementation (AC-005 to API/E2E); spaced names give two-letter row initials
