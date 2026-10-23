# Implementation Revision Record: seal-migrations-per-folder (autobyteus-280)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer pass, `design-review-report.md` (ARCH-REV-002, then ARCH-REV-003 after DI-001) | N/A | `Initial Baseline` | SR-001, SR-002, SR-003; ARCH-REV-002, ARCH-REV-003 | Implemented; ready for code review |

## Revision Entries

### IR-001 — Sealed migration area, capability readiness, 205 repair

- Triggering role, report path, and round: architecture_reviewer, `tickets/in-progress/seal-migrations-per-folder/design-review-report.md`, ARCH-REV-002 (pass), with DI-001 raised mid-implementation and passed as ARCH-REV-003 (SR-003).
- Triggering finding IDs: N/A (initial baseline). DI-001 (raised by this implementation: definition-name lookup and run-history catalog reset need ports; D-7 simplified; no cross-migration imports), accepted as SR-003.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: see `implementation-handoff.md`.
- Related solution revision IDs: SR-001, SR-002, SR-003.
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001..BEH-005; REQ-001..REQ-011; AC-001..AC-007 (AC-007 is the guideline, written by the Solution Designer in `db787cb6f9`/`da34ab3a7a`).
- Implementation delta (commits on `codex/seal-migrations-per-folder`):
  - `dca8147384` contract: `AppDataCapability`, `holdsBackCapabilities`, `capabilityReadiness()`, `SecretRemovalOwner` port, the boundary test with its starting exception list;
  - `c76fbf90aa` production side: `startup/app-data-capability-readiness.ts`, `TokenUsageCapability` (renamed), the custom-provider gate, both hosts, the generic GraphQL retry, G-1 narrowed, AC-003/AC-004 tests;
  - `d60d4a60e5` migration side: every migration in its folder, the frozen layer, the registry wiring and SR-003 ports, constructor defaults removed, the 205 repair, `memory/migration` moved out of `autobyteus-ts`, tests moved to `tests/app-data-migrations/<name>/`;
  - `8b091176bf` the D-8 bridge removed, the emptied exception list removed, module docs.
- Changed files or areas: `autobyteus-server-ts/src/app-data-migrations/**`, `src/startup/app-data-capability-readiness.ts`, `src/server-runtime.ts`, `src/standalone-application-host/start-standalone-application-host.ts`, `src/api/graphql/types/app-data-migrations.ts`, `src/token-usage/providers/token-usage-capability.ts` and its users, `src/llm-management/llm-providers/stores/custom-llm-provider-{store,availability}.ts`, `autobyteus-ts/src/memory/migration/` (removed), server tests, `TESTING.md` (one line), module docs.
- Local validation and result: see the handoff's Checks Run.
- Next recipient or routing: `/software_engineering_team/code_reviewer` (Large / High).
- Remaining limitations or risks: see the handoff's Known Risks.
