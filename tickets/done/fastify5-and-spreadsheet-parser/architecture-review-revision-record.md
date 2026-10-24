# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Solution Designer `Architecture Design Complete` (2026-10-24) | SR-002, SR-003 | N/A | Fail | AR-001, AR-002 |
| ARCH-REV-002 | Round 2 / SR-004 revision, a narrow re-review of DS-006 (2026-10-24) | SR-004 | Fail | Pass | AR-001, AR-002 (resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review of SR-003: server and gateway sound; viewer hyperlink outcome undecided

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/fastify5-and-spreadsheet-parser/tickets/in-progress/fastify5-and-spreadsheet-parser/design-review-report.md`
- Review round and trigger: Round 1; `handoff-sr-003.md` from the Solution Designer
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-sr-003.md`; N/A
- Relevant solution revision IDs: SR-002 (approved basis), SR-003 (design)
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` (`Requirement Gap`, plus a minor `Design Impact`)
- What changed in the review result or what baseline was established: baseline established. The Medium/High classification is confirmed. BEH-001..BEH-006 and DS-001..DS-005 are confirmed against code: studio plugin order, MCP gate-before-cors ordering, the separate agent-tools instance, GraphiQL/mercurius defaults, the absence of a mobile catch-all, logger options, the gateway Dockerfile and compose context. BEH-007 needs correction for hyperlink cells (MP-001) and the CSV-by-URL spec case.

#### Prior Finding Resolution

None

- New or remaining finding IDs: AR-001 (Requirement Gap, Medium, blocking), AR-002 (Design Impact, Low)
- Material classification changes: none
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: RSK-001..RSK-003; gateway README L290-291 `pnpm approve-builds` note; root lockfile diff size

### ARCH-REV-002 — Re-review of SR-004: hyperlink decision and CSV-by-URL case resolve round 1

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/fastify5-and-spreadsheet-parser/tickets/in-progress/fastify5-and-spreadsheet-parser/design-review-report.md`
- Review round and trigger: Round 2; `handoff-sr-004.md` from the Solution Designer, a narrow re-review of DS-006
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-sr-004.md`; AR-001, AR-002
- Relevant solution revision IDs: SR-004
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result: BEH-007 is now Confirmed, and DS-006 traces both entry forms. DS-001..DS-005 are unchanged since SR-003 and keep their round-1 verdicts. I verified the SR-004 citations: `workspace-shell-window.ts` L52-58 blocks navigation and `window.open`, and the Tailwind config has no preflight override.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Requirement Gap, blocking) | Resolved | SR-004; DEC-008; FU-005 | Requirements doc: BEH-007, REQ-010, REQ-011, AC-013 and DEC-008 are aligned; the delta was approved by the Solution Designer within the direction, with the user informed. Design spec: allowlist plus `ALLOW_DATA_ATTR: false`, the viewer example, `https:`/`javascript:` spec cases, the docs line. SD-09 shows `<td>text</td>` for both versions and for xlsx and biff8 |
| AR-002 | Open (Design Impact, Low) | Resolved | SR-004 | The design spec's spec case list includes CSV via URL (`type: 'array'`); the DS-006 spine names both entry forms |

- New or remaining finding IDs: none
- Material classification changes: none (Medium / High)
- Recommended recipient: Implementation Engineer; informational pass to the Solution Designer
- Remaining risks or uncertainty: RSK-001..RSK-003; root lockfile diff size; `probes/excel-viewer-trial.diff` predates `ALLOW_DATA_ATTR: false`
