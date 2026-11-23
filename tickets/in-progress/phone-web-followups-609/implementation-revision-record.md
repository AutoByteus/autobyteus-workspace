# Implementation Revision Record

The current code and `implementation-handoff.md` are the authority. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md` ARCH-REV-002 Pass (SR-002); Solution Designer's SR-003 (DEC-009, FU-004) during the round | N/A | `Initial Baseline` | SR-001, SR-002, SR-003; ARCH-REV-001, ARCH-REV-002; CRR N/A; API-REV N/A; DR N/A | D-A…D-J, MSP-99, MSP-100 implemented and validated; to Code Review (Large / High) |
| IR-002 | Architecture Reviewer, ARCH-REV-003 Pass (SR-004 D-D2, after CRR-002 / API-REV-001 F-1); Solution Designer's SR-005 (N-3, N-4) during the round | API-REV-001 F-1; ARCH-REV-003 N-3, N-4 | `Design Revision` | SR-004, SR-005; ARCH-REV-003; CRR-002; API-REV-001 | D-D2 (one interruption rule; conversation `toolStatus`; `inferToolStatus` removed) and the unused Codex view provider removed; to Code Review (targeted) |

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

### IR-002 — a stopped call read back from the node; the unused Codex view provider removed

- Triggering role, report path, and round: Architecture Reviewer, ARCH-REV-003 Pass on SR-004 (D-D2), after Code Reviewer CRR-002 (failure origin of API-REV-001 F-1: Design Impact). During the round, the Solution Designer's SR-005 (ARCH-REV-003 N-3: Codex covered, add a Codex case; N-4: remove the Codex view provider and what only it reached).
- Triggering finding IDs: API-REV-001 F-1; ARCH-REV-003 N-3, N-4.
- Classification: `Design Revision`.
- Prior authoritative result: IR-001 (`c9d184ce80`): live "Stopped", read back "Failed".
- Current authoritative result: `70f3d8d410` (D-D2), `e78a539dfe` (SR-005), pushed; see `implementation-handoff.md`, IR-002.
- Related solution revision IDs: SR-004, SR-005.
- Related architecture-review, code-review, API/E2E and delivery revision IDs: ARCH-REV-003; CRR-002; API-REV-001; delivery N/A.
- Why this round is recorded: the read-back half of AC-D failed in API/E2E; the design added D-D2.
- Approved behavior or requirement IDs affected: REQ-D / AC-D (read back, every runtime).
- Implementation delta:
  - `agent-memory/domain/tool-result-interruption.ts` (rule and text); the replay's `createToolEvent`, the journal's `interruptedFromError` and the sequencer read it.
  - Conversation tool entries carry `toolStatus`; web hydration shows it; `inferToolStatus` removed; the status guard in `utils/toolInvocationStatus.ts`.
  - SR-005: the Codex run view provider, the Codex thread history reader and normalizer, their tests, the e2e reader mock, and the baseline entry removed.
- Changed files or areas: see `implementation-handoff.md`, Key Files Or Areas (IR-002).
- Local validation and result: IMP-11 (reproduced, then fixed), IMP-12, IMP-13 (MSP-102 Pass), IMP-14 (searches), IMP-15, IMP-16.
- Next recipient or routing: Code Reviewer (targeted source review of the replay and the shared rule, CRR-002), then API/E2E.
- Remaining limitations or risks: no recorded Codex fixture with a command interrupted mid-run (the Codex case uses built notifications in the recorded shape); docs that name the removed files are left for documentation sync; the red "Error" section on a stopped call's phone detail (observation).

