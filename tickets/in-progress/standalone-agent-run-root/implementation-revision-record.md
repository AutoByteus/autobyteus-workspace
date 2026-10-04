# Implementation Revision Record — standalone-agent-run-root

The current code and `implementation-handoff.md` are authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `/architecture_reviewer`, `design-review-report.md`, ARCH-REV-003 (round 3, Pass) | N/A | `Initial Baseline` | SR-005 (requirements SR-002); ARCH-REV-003; CRR N/A; API-REV N/A; DR N/A | Implementation complete for REQ-001–REQ-010; ready for code review |

## Revision Entries

### IR-001 — Complete implementation of SR-005 on base `b37d7a934`

- Triggering role, report path, and round: `/architecture_reviewer`,
  `tickets/in-progress/standalone-agent-run-root/design-review-report.md`, ARCH-REV-003 (delta review of the SR-005 base refresh, Pass).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A. No implementation handoff existed. The branch held the in-progress checkpoint `9c3080a20` (E-21).
- Current authoritative result: all REQ-001–REQ-010 implemented; branch head `bccb1c095` (plus this ticket-artifact commit).
- Related solution revision IDs: SR-005 (design), SR-002 (requirements).
- Related architecture-review revision IDs: ARCH-REV-003 (and ARCH-REV-002 for the SR-004 substance).
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: the first implementation handoff. It covers the checkpoint work (E-21 "present") and the remaining E-21 work completed in this round.
- Approved behavior or requirement IDs affected: REQ-001–REQ-010, BEH-001–BEH-010, AC-001–AC-010.
- Implementation delta:
  - Checkpoint `9c3080a20` (before the rebase, carried by SR-005):
    - REQ-001: module move to `src/standalone-agent-run-root/`; root, host handle, manager; ports; binding removed.
    - REQ-002: `TeamRootCollaboratorAgentRegistry`.
    - REQ-003: Org delivery extraction.
    - REQ-004: self-target rejection.
    - REQ-009 (original scope): catalog injection and the model-save fixture.
  - This round, commit `bccb1c095`:
    - REQ-009 / D-R3: two guard inventory edits.
    - REQ-003: size target. Child-command routing moved into the standalone and Org delivery owners; stopped-run model-settings save extracted to `standalone-stopped-run-model-config-updater.ts`.
    - REQ-005: header in three builders, web parser, frozen migration header.
    - REQ-006: summary service, store, repository, GraphQL query and web Token Meter.
    - REQ-007: active-trace page inter-agent visual, server and web.
    - REQ-008: host label.
    - Docs.
    - One test-wiring fix: `agent-run-prompt-fallback.integration.test.ts` now gets the roots fixture.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result:
  - Server typecheck clean (TS6059 noise excepted); web `tsc` error set identical to base.
  - Full server and web suites compared with clean `b37d7a934` by test name and message:
    - server: 0 new, 0 changed; 38 fixed;
    - web: 0 new; 3 apparent message differences resolved as base flakiness.
  - Live checks on the dev stack with General Agent (Claude SDK and Codex).
- Next recipient or routing: `get_handoff_rules` (Large/High → code review).
- Remaining limitations or risks: see `implementation-handoff.md` § Known Risks.
