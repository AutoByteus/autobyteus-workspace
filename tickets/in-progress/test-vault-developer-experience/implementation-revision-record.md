# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / `design-review-report.md` / round 2 (Pass) | N/A (AR-007, AR-008 guidance) | `Initial Baseline` | `SR-008`, `ARCH-REV-002` | Implemented; ready for code review |
| IR-002 | Architecture Reviewer / `design-review-report.md` / round 4 (Pass on the SR-009/SR-010 delta) | N/A (user revision SR-009; AR-013 guidance) | `Requirement Gap` (user-approved revision, designed upstream) | `SR-009`, `SR-010`, `ARCH-REV-004`, `CRR-001`, `API-REV-001` | Implemented; ready for code review |

## Revision Entries

### IR-001 — Test vault selected like a database (initial implementation)

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/test-vault-developer-experience/design-review-report.md`, round 2 (`ARCH-REV-002`, Pass).
- Triggering finding IDs: N/A. Non-blocking guidance applied: AR-007 (server-free policy facade; runtime-touching modules separate and lazily loaded; module-graph check extended to the facade and autobyteus-ts setup). AR-008 is editorial in investigation notes (Solution Designer's artifact; not edited here).
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implementation complete at `855842b8f1` (baseline test fix `6f38cd51e6`; docs `3f01a6013a`, `198c9066dc`), all implementation-scoped checks pass (IMP-01..IMP-13).
- Related solution revision IDs: `SR-008` (on `SR-006`, `SR-007`)
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: first implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001..BEH-009; REQ-001..REQ-016.
- Implementation delta:
  - merged `origin/personal` @ `ad784b0a8f` before coding (`303a04e945`, clean);
  - server source selection, failure rule, read-only store, verify-only bootstrap, location predicates, test-vault commands and CLI, importer decision port, `WritableVaultTarget`, resolver split, dead custom-provider batch code removed;
  - autobyteus-ts default resolver slot and optional resolver parameters; setup, alias, `test` script; 18 live files;
  - `test-support/test-vault/`; server setup capture/strip; 15 live suites + native harness migrated; env helper removed; built-server opt-in; runner vault line; F-08 fix;
  - Electron isolated forwarding; key-saving probe strip;
  - docs and skill.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas (130 files in the feature commit).
- Local validation and result: IMP-01..IMP-13 Pass (see the handoff's Checks Run).
- Next recipient or routing: Code Reviewer (Large/High route, per `get_handoff_rules`).
- Remaining limitations or risks: real-key live runs, the isolated-instance smoke and the full `pnpm test:e2e` run with the selector exported are left to API/E2E (no standing vault; DEC-003); R-B, R-D and the P-002 observation as recorded in the handoff.

### IR-002 — autobyteus-ts owns the vault read side and reads AUTOBYTEUS_TEST_VAULT

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md`, round 4 (`ARCH-REV-004`, Pass) on the user-approved SR-009 revision (relayed by the code reviewer, 2026-10-20), designed at SR-010.
- Triggering finding IDs: N/A (requirement revision). Non-blocking guidance applied: AR-013 (bindings ported exactly; `SECRET_PROVIDER_UNKNOWN` names provider and slot).
- Classification: `Requirement Gap` handled upstream (user-approved revision), implemented here.
- Prior authoritative result: IR-001 at `855842b8f1` (CRR-001 Pass; API-REV-001 Blocked on the live vault, then on hold).
- Current authoritative result: IR-002 at `9498de5f8b` (docs `e40b0fe6ce`, `3c9a4e799a`); IMP-14..IMP-25 pass.
- Related solution revision IDs: `SR-009`, `SR-010`
- Related architecture-review revision IDs: `ARCH-REV-004`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Why this implementation revision is recorded: the user wants autobyteus-ts to need nothing but the variable in any process (scripts included); IR-001 only reached Vitest live runs through a test-setup installer.
- Approved behavior or requirement IDs affected: REQ-005 (c), REQ-014, AC-009, AC-013, AC-018 (new), DEC-013.
- Implementation delta:
  - S9-1: vault format primitives and read side moved to `autobyteus-ts/src/secrets/vault/` (git moves, clean cut); `verifyEstablishedVault`, `readSecretEntry`, `providerSecretId`, `openVerifiedTestVault` added; server catalog built on `providerSecretId`; service/bootstrap/read-only entry rewired; `isRealAppServerDataDir` kept in the server; unused server `secret-management/index.ts` removed.
  - S9-2: `openTestVaultReader`, `TestVaultProviderApiKeyResolver`, environment default, `disableEnvironmentProviderApiKeySource`; `setDefaultProviderApiKeyResolver` removed.
  - S9-3: both startup sites and `initializeLiveServerVault` disable the default; autobyteus-ts setup gates the selector; installer removed; `liveProviderTest` by `kind`/`code`; AC-018 unit + built-server E2E (+ negative control).
  - S9-4: docs (Secret Management, TESTING.md, AGENTS.md, autobyteus-ts key-resolution section); plain-script probe against a synthetic vault.
  - Also: runtime-deps verifier accepts `node:` specifiers; shared `test-support/module-graph/module-graph.ts`.
- Changed files or areas: 65 files in `9498de5f8b`; see the handoff's Key Files (IR-002 line).
- Local validation and result: IMP-14..IMP-25 Pass (server unit 749 files, integration 78, autobyteus-ts default 393, affected E2E 13, AC-018 E2E 3 + control).
- Next recipient or routing: Code Reviewer (Large/High).
- Remaining limitations or risks: real-key live runs and the isolated-instance smoke still need the user's vault (DEC-003); `tsx` not installed (probe ran with `node` on `dist`); the core library's process-global environment default is constrained as recorded under Known Risks.
