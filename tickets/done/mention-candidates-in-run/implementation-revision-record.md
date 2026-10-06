# Implementation Revision Record — mention-candidates-in-run

The current code and `implementation-handoff.md` are authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | solution_designer, handoff-architecture-design-complete.md (direct route) | N/A | `Initial Baseline` | SR-001; ARCH-REV/CRR/API-REV/DR N/A | Implementation complete; Medium/Low confirmed; routed to direct API/E2E |

## Revision Entries

### IR-001 — `@` offers and addresses agents already in the run

- Triggering role, report path, and round: `/solution_designer`; `tickets/in-progress/mention-candidates-in-run/handoff-architecture-design-complete.md`; initial
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: Implementation of SR-001 is complete. Local checks are green except failures that also occur on the unmodified source.
- Related solution revision IDs: SR-001
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why recorded: the first implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001..006; REQ-001..006; AC-001..008
- Implementation delta:
  - The policy is split into `requireEligible` (`@`) and `requireAdmissible` (bring-in), and `listCandidates` no longer filters in-run definitions.
  - `resolveMentions` sets `inRun`.
  - The note gains the `inRun` field, the `, already in this run` suffix, conditional in-run guidance and a tolerant parser.
  - The web draft mirror excludes only the target's own definition.
  - en/zh-CN copy updated; docs updated.
- Changed files or areas: see implementation-handoff.md § Key Files Or Areas.
- Local validation and result: contracts 12/12; server source typecheck exit 0; focused server and web suites pass; the remaining failures (3 server GraphQL unit files, 1 web composition spec) fail identically on the unmodified source.
- Next recipient or routing: `get_handoff_rules` → `/api_e2e_engineer` (direct route, Medium/Low)
- Remaining limitations or risks: menu copy not rendered here; neutral in-run guidance may lead an agent to message where a copy was wanted (accepted).
