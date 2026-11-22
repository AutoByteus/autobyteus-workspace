# Implementation Revision Record

The current code and `implementation-handoff.md` are the authority. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md` ARCH-REV-002 Pass (SR-002); Solution Designer's SR-003 (DEC-009, FU-004) during the round | N/A | `Initial Baseline` | SR-001, SR-002, SR-003; ARCH-REV-001, ARCH-REV-002; CRR N/A; API-REV N/A; DR N/A | D-A…D-J, MSP-99, MSP-100 implemented and validated; to Code Review (Large / High) |

## Revision Entries

### IR-001 — the ten follow-ups of 572 and 590, in the design's order

- Triggering role, report path, and round: Architecture Reviewer, ARCH-REV-002 Pass on SR-002 (`design-review-report.md`), "build D-A…D-J in sequence; Rule 12 applies". During the round the Solution Designer answered my REQ-F question with SR-003 (DEC-009: the phone part of MSP-44 is recorded, not asserted; FU-004).
- Triggering finding IDs: N/A. ARCH-REV-002's non-blocking N-2 was left to me: declined, already FU-003 (see the handoff).
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: commits `6ed56306aa`…`ab72e00e7a` on `codex/phone-web-followups-609` (base `f2c0d2a902`), pushed; see `implementation-handoff.md`.
- Related solution revision IDs: SR-001, SR-002, SR-003.
- Related architecture-review, code-review, API/E2E and delivery revision IDs: ARCH-REV-001, ARCH-REV-002; others N/A.
- Why this baseline is recorded: first implementation round.
- Approved behavior or requirement IDs affected: REQ-A, REQ-B1, REQ-B2, REQ-C, REQ-D, REQ-E, REQ-F, REQ-G, REQ-H1, REQ-H2, REQ-I, REQ-J; AC-A…AC-J.
- Implementation delta:
  - B: the stale team-stream `dist/` rebuilt; `pnpm check:contract-dist`; TESTING.md (own `docs(testing):` commit) and RELEASE.md.
  - E: `TOOL_SUMMARY_ARGUMENT_KEYS` in the presentation contracts, read by the web summary and the node's page projection; GraphQL `summaryArgs` becomes JSON; codegen.
  - A: `contextText` removed from the node.
  - D: "Stopped" with a stop icon for an interrupted call on every surface.
  - J: the REST workspace routes restore a registered workspace after a restart.
  - H: run-relative links in a run's conversation open the run's file (desktop and phone). One deviation from the design's text: the folder fallback (handoff, Implementation decisions).
  - I: a stopped run's running tasks end as `run_ended` in the open list; no 2 s re-read for a stopped run. MSP-99.
  - C: the Windows staging folder removed in `finally`; git-ignored.
  - F, G: MSP-44/45/46 and MSP-55 cases; MSP-100 for H.
- Changed files or areas: see `implementation-handoff.md`, Key Files Or Areas.
- Local validation and result: IMP-01…IMP-10. All Pass, except the whole phone probe's MSP-61, which fails on the base for a reason outside this ticket (FU-006).
- Next recipient or routing: Code Reviewer (Large / High).
- Remaining limitations or risks: C's successful Windows run is proven only by the release run's Windows job; no physical phone; FU-003…FU-006.
