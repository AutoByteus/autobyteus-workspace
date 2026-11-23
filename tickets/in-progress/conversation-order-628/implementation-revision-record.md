# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates the implementation baseline.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, design-spec.md (SR-001…SR-006); Architecture Reviewer, design-review-report.md rounds 1–3 | N/A | `Initial Baseline` | SR-001…SR-006, ARCH-REV-001…ARCH-REV-003 | D-1, D-2, D-3 and SR-006 implemented; ready for code review |

## Revision Entries

### IR-001 — The conversation keeps its order; every row time is the node's; a stored message never sorts after its own notice

- Triggering role, report path, and round: Solution Designer, `tickets/in-progress/conversation-order-628/design-spec.md` (D-1, D-2 from SR-001/SR-002; D-3 from SR-004/SR-005; SR-006); Architecture Reviewer, `design-review-report.md` rounds 1–3 (ARCH-REV-001 for D-1/D-2, ARCH-REV-002 for SR-005 with notes N-1 and N-2, ARCH-REV-003 for SR-006 with notes N-4 and N-5).
- Triggering finding IDs: N/A (baseline). Reviewer notes applied: N-1, N-2, N-4, N-5.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: implemented and checked locally; `Large` / `High`, routed to code review.
- Related solution revision IDs: SR-001…SR-006 (SR-003: the Solution Designer's evidence correction after implementation found the read path's time sort).
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002, ARCH-REV-003.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: the first implementation handoff of the ticket. During implementation, two findings went upstream and came back as solution revisions:
  - The read path sorts by time, so D-2's time-only rule misses native runs (SR-002 added the native source-event clause).
  - D-3 made an external notice sort 1 ms before its message after a reopen (SR-006 stores the message at its admission time).
- Approved behavior or requirement IDs affected: BEH-001, BEH-002, BEH-003; REQ-001…REQ-004; AC-001…AC-006.
- Implementation delta (commits on `codex/conversation-order-628`, base `1f761bc8db`):
  - `d67b58c740` D-1: `recentEventMonitorWindow.ts` keeps the conversation's array order and merges compactions by time.
  - `1c6f493625` D-2: the replay builder orders a preface notice after its input; `NATIVE_INPUT_TRACE_SOURCE_EVENT` is exported from autobyteus-ts.
  - `2bb11e0874`: phone probe case MSP-105; MSP-99's restart expectation rewritten (the reminder is the message's preface).
  - `33a75a4ae4` D-3 contracts: `serverTimeSchema`; `occurred_at` on timed messages; `accepted_at` on pending input; `dist/` rebuilt.
  - `18a9eb6f34` D-3 server: AgentRun stamps every delivery once; the three stream boundaries write `occurred_at`; producers outside a run stamp their own time.
  - `87d7321915` D-3 web: rows take the node's time; an own send is `null` until confirmed; `updatedAt` is derived; a timed frame without `occurred_at` is refused.
  - `0b60b9f668` SR-006: the forwarded fact carries `acceptedAt`, and the accumulator stores the user trace at it; `forwardedAt` is removed (N-4); test case N-5 added.
  - The last commit: `stampForDelivery` moved from `agent-run.ts` to `agent-run-event.ts`, keeping `agent-run.ts` under 500 effective lines (it was 500 at base). No behavior change.
- Changed files or areas: see the handoff's Key Files.
- Local validation and result: IMP-01…IMP-15 in the handoff's Checks Run table.
- Next recipient or routing: `/code_reviewer` (Large/High).
- Remaining limitations or risks: see the handoff's Known Risks.
