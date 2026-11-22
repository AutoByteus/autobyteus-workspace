# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, ARCH-REV-002 (Pass) | N/A | `Initial Baseline` | SR-002, ARCH-REV-002 | Implemented; checks IMP-01…IMP-09 pass; to code review |

## Revision Entries

### IR-001 — Lost runtime session renewal, standalone and members

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/stale-runtime-session-recovery/design-review-report.md`, ARCH-REV-002 (Pass)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implemented as design-spec.md SR-002's Change/Refactor Sequence, steps 1–7; Large / High confirmed.
- Related solution revision IDs: SR-002 (with DEC-006 for N-1)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: the initial implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001…BEH-007; REQ-001…REQ-007; AC-001…AC-006 (AC-007 is API/E2E's).
- Implementation delta:
  - typed error `SavedRuntimeSessionMissingError`; `buildSessionRenewal` and `RuntimeSwitch.cause`;
  - recognition in the Codex, Antigravity, ACP (Grok, DeepSeek) and Claude backends; Claude `verifyResumable` at restore;
  - standalone renewal in `restoreStarted` via `activateInFreshSession`; `RUNTIME_SESSION_LOST` log;
  - AR-002 removal of the staged member activation; `beginSessionRenewal`, `configured-agent-session-renewal.ts`, `replace_lost_session` with the renamed shared compare-and-set, in all five consumers;
  - application-scope lifecycle gets the switch port (N-4, see the handoff's deviations);
  - N-1 probe (PRB-009): Grok matcher kept;
  - glossary and module docs.
- Changed files or areas: see the handoff's Key Files Or Areas; commits `67eb9a07fd`…`2acd842c95` on `0da6bfbfc1`.
- Local validation and result: IMP-01…IMP-09 Pass. Negative controls first found two untested pieces (the Claude factory's check, the confirmed release before a renewal); tests were added in `0681fcd3af`, and all 16 controls now fail as expected (IMP-03).
- Next recipient or routing: Code Reviewer (Large/High).
- Remaining limitations or risks: no Claude built-server E2E (a scripted Claude harness would be new); recognized texts are version-specific (RSK-001); Claude restores open their process at activation (RSK-003).
