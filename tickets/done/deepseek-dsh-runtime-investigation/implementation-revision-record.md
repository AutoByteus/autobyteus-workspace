# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 3 (Pass) | N/A | `Initial Baseline` | SR-004, ARCH-REV-003, CRR N/A, API-REV N/A, DR N/A | Implemented; local checks green; live E2E per handoff |
| IR-002 | Code Reviewer, `code-review-report.md`, CRR-001 (Fail) | CR-001 | `Local Fix` | SR-004, ARCH-REV-003, CRR-001, API-REV N/A, DR N/A | Supervisor input moved to its own file; rechecks green |
| IR-003 | Delivery Engineer, `release-deployment-report.md`, DR-001 (DEL-02 failure) | DEL-02 | `Local Fix` | SR-004, ARCH-REV-003, CRR-002, API-REV per the API/E2E record, DR-001 | Architecture test follows the moved type; full unit + typecheck green |

## Revision Entries

### IR-001 — DeepSeek Harness on the shared ACP backend through the credential proxy's provider relay

- Triggering role, report path, and round: Architecture Reviewer (`/software_engineering_team/architecture_reviewer`), `tickets/in-progress/deepseek-dsh-runtime-investigation/design-review-report.md`, round 3, Pass.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation of design spec SR-004, change sequence steps 1–6, at the commits named in `implementation-handoff.md`.
- Related solution revision IDs: SR-004
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: the initial implementation handoff.
- Approved behavior or requirement IDs affected: REQ-001…REQ-015, AC-001…AC-017, QR-001…QR-004.
- Implementation delta: shared ACP launch contract (run/discovery launches, relay id, instructions on every launch), restore by `session/load` or `session/resume`, config-option selection, `AcpSessionEffect` (+ activity) and provider-call effects, one end owner (`AcpSessionLauncher.end`), relay refusal before spawn; Grok migrated with no behavior change. Credential proxy provider relays (`/relay/<relayId>/…`), stream reader, observers, `ProviderRelayAccess`, process relay slot, relay grant on the run pass, `RunPassRevocation` replacing `IntegrationRunAccess.revokeForRun`; compositions wired (studio general process and application scope get the host's access and `runPasses`; standalone host `null`). DeepSeek Harness runtime (home, launch profile, discovery, catalog, availability, Agent Runtimes strategy, session profile, projection, provider-call effects, payloads, Work Journal translation), runtime-kind registration in server, contracts and web; docs and glossary.
- Changed files or areas: see `implementation-handoff.md`, Key Files Or Areas.
- Local validation and result: see `implementation-handoff.md`, Checks Run.
- Next recipient or routing: Code Reviewer (Large / High route).
- Remaining limitations or risks: see `implementation-handoff.md`, Known Risks.

### IR-002 — Supervisor input in its own file (CR-001)

- Triggering role, report path, and round: Code Reviewer (`/software_engineering_team/code_reviewer`), `tickets/in-progress/deepseek-dsh-runtime-investigation/code-review-report.md`, CRR-001.
- Triggering finding IDs: CR-001
- Classification: `Local Fix`
- Prior authoritative result: IR-001 at `9344f4b9b5`; `general-process-run-supervisor.ts` grown from 511 (already over 500 on the base) to 522 non-empty lines.
- Current authoritative result: `cb132711f6`; the supervisor is 446 non-empty lines.
- Related solution revision IDs: SR-004
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: the file-size rule makes growing an over-limit file part of this ticket.
- Approved behavior or requirement IDs affected: none (a move; no behavior change).
- Implementation delta: `GeneralProcessRunSupervisorInput` and `requireGeneralProcessRunSupervisorInput` (with the `providerRelayAccess`/`runPasses` dispositions) moved verbatim to `agent-execution/runtime/general-process-run-supervisor-input.ts` (83 lines) with the type imports only they used; the supervisor imports both. No other file imported the type. The handoff's size note is corrected.
- Changed files or areas: `autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts`, `…/general-process-run-supervisor-input.ts` (new); `implementation-handoff.md`.
- Local validation and result: IMP-09 Pass (supervisor ownership, standalone host lifecycle, tracked imports, run manager integration: 39 tests; typecheck gate PASS; scripted studio E2Es 15 tests).
- Next recipient or routing: Code Reviewer (targeted delta review).
- Remaining limitations or risks: unchanged from IR-001.

### IR-003 — Composition boundary test follows the supervisor input file (DEL-02)

- Triggering role, report path, and round: Delivery Engineer (`/software_engineering_team/delivery_engineer`), `tickets/in-progress/deepseek-dsh-runtime-investigation/release-deployment-report.md`, DR-001, section "The DEL-02 failure"; log `evidence/delivery/DEL-02-server-unit.log`.
- Triggering finding IDs: DEL-02 (`tests/architecture/agent-provider-composition-boundaries.test.ts` › "creates one frozen context path value per host and shares it across both roots", line 700).
- Classification: `Local Fix`
- Prior authoritative result: IR-002 at `fddcff0f13`; the architecture test still looked for `contextFilePathEnvironment: ContextFilePathEnvironment` in `general-process-run-supervisor.ts`, which IR-002 moved to `general-process-run-supervisor-input.ts`. The test failed on the ticket head with and without the base merge.
- Current authoritative result: `ee6739fe7f`; the full unit suite and typecheck gate pass on it.
- Related solution revision IDs: SR-004
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: CRR-001, CRR-002
- Related API/E2E revision IDs: as in the API/E2E revision record (no change to what it validated: test-only fix)
- Related delivery revision IDs: DR-001
- Why this baseline or implementation revision is recorded: a test that reads source text by path broke with IR-002's file move; IR-002's recheck did not include it.
- Approved behavior or requirement IDs affected: none (test-only; no source change).
- Implementation delta: the test reads the field in `general-process-run-supervisor-input.ts`, keeps the no-app-config guard (`AppConfig|appConfigProvider|.getMemoryDir(|.getAppDataDir(|.getBaseUrl(`) on both supervisor files, and checks the supervisor uses `input.contextFilePathEnvironment`. TESTING.md "Rerun by impact" step 3: moving, renaming or splitting a source file marks the `tests/architecture/` tests Rerun (`14fe5959bf`, its own `docs(testing)` commit).
- Changed files or areas: `autobyteus-server-ts/tests/architecture/agent-provider-composition-boundaries.test.ts`, `TESTING.md`, `implementation-handoff.md`.
- Local validation and result: IMP-10 Pass at `ee6739fe7f`: full `test:unit` (932 files passed, 5 skipped) and typecheck gate PASS (baseline unchanged). The other architecture test that names the supervisor (`application-framework-boundaries.test.ts`) is part of that run.
- Next recipient or routing: Delivery Engineer is the next stage; routed per the handoff rules (the package stays Large / High, so source review receives it first).
- Remaining limitations or risks: unchanged from IR-001.
