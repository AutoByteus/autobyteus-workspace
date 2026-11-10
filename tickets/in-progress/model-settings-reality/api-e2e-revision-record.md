# API/E2E Revision Record

The latest [coverage investigation](api-e2e-coverage-investigation.md) and [execution coverage report](api-e2e-execution-coverage-report.md) remain authoritative. This record holds the baseline and the coverage/execution delta of each round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer, `code-review-report.md`, implementation review round 2 (CRR-002 Pass), API/E2E round 1 | SR-003, ARCH-REV-002, IR-002, CRR-001 (Fail, fixed), CRR-002 (Pass) | N/A | `Fail` / 88% |
| API-REV-002 | code_reviewer, `code-review-report.md`, source review of the SR-004 delta (CRR-004 Pass; CR-004 resolved), API/E2E round 2 | SR-004, ARCH-REV-003, IR-003, CRR-003 (Fail, failure origin of API-14), CRR-004 (Pass) | `Fail` / 88% (API-REV-001) | `Pass` / 95% |

## Revision Entries

### API-REV-001 — Baseline: provider-visible behavior proven live; saved-run (locked) model menu loses its options when the runtime list cannot be read

- Triggering role, report path, and round: code reviewer, [code-review-report.md](code-review-report.md), round 2; API/E2E round 1
- Triggering finding or case IDs: none (first round); the handoff's five coverage items
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-003; ARCH-REV-002; IR-001/IR-002; CRR-001, CRR-002; delivery N/A
- Why this baseline or coverage/execution revision was recorded: first validation of the ticket's Large / High change after the implementation review passed
- Coverage decisions or durable test paths changed:
  - Added: `autobyteus-server-ts/tests/e2e/runtime/claude-agent-effort-only-live.e2e.test.ts` (gated live, both real CLIs, process-boundary assertions).
  - Updated: `stopped-run-model-config-graphql.e2e.test.ts` (MSR-001, MSR-002), `delegated-copy-model-change.e2e.test.ts` (DCM-010), `tests/fixtures/agent-runtimes-fake-cli.mjs` (`claude-models`), `autobyteus-web/tests/e2e/chat-composer-polish-probe.mjs` (T01–T03, T06, T07 retargeted; T08, T09 added), `autobyteus-claude-5-5-live.e2e.test.ts` (stale header).
  - Baseline fixes of rotted e2e suites (credential-less loopback `fetch` → 401; socket file in a data-file scan): `available-agent-runtimes-graphql`, `agent-runtimes-graphql`, `agent-runtimes-e2e-harness`, `autobyteus-anthropic-stored-config-resume`, `...-edit-launch`, `native-runtime-live-harness`.
  - Removed: none. Removed assertions: the composer probe's "an SDK model has a thinking switch; a fresh draft records Off", obsolete under REQ-003/REQ-005, replaced by T01/T08/T09.
- Cases added, changed, removed, or rechecked: API-01..API-17 as in the report; `Reused`: API-01, API-02, API-04, API-16; run: API-03, 03b, 05, 06, 07, 08a–d, 09, 10, 11, 12, 13, 14, 17; `Not Tested`: API-15
- Commands, environment, fixture, or broader-validation delta: server and autobyteus-ts `dist` rebuilt at `817bd9950`; real-stack journeys on Chromium + Nuxt dev + `dist/app.js` with two real Claude CLIs (SDK-bundled 2.1.280 and system 2.1.322), a symlink swap, and a failing-CLI script; test vault for the Anthropic key; no isolated Electron instance (container uid 0, no display tools)

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (created), execution coverage report (created), test progress log (created), this record (created), `follow-ups.md` (FU-008), `evidence/` (`API-03` … `API-14` files and folders)
- Prior result and confidence: N/A
- Current result and confidence: `Fail`, final confidence 88% (post-repository 82%)
- New or remaining failure IDs: **API-14** (REQ-010, REQ-011, QR-001; AC-010 alternate outcome) — with the CLI failing, the Team-level (runtime-locked) model menu empties its options, shows no error or Retry, and flags the saved model "No longer offered"
- Recommended owner: implementation_engineer (`Local Fix`, web), after failure-origin review
- Remaining risks, blocked evidence, or untested scope: phone bundle (API-15) not run; isolated Electron instance not run (container constraint); a local-model (Ollama/custom endpoint) refresh not run realistically; delegated copy only at the server (DCM-010); no message after the A→B→A return and no restart between save and message

### API-REV-002 — Rerun after the SR-004 delta: saved-run options state a failed model-list read; API-14 resolved

- Triggering role, report path, and round: code reviewer, [code-review-report.md](code-review-report.md), round 4 (CRR-004 Pass); API/E2E round 2
- Triggering finding or case IDs: API-14 (round 1 `Fail`; CR-004 in CRR-003); the reviewer's rerun focus: API-14 on the real stack incl. the first open with the CLI already failing, API-11/API-12 regression, API-15 (phone bundle), the stopped-run GraphQL e2e that implementation edited but did not run, and the unit reproduction now durable
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-004; ARCH-REV-003; IR-003; CRR-003, CRR-004; delivery N/A
- Why this baseline or coverage/execution revision was recorded: rerun of the failing case and rerun-by-impact of everything the delta exercises (`git diff --name-only 817bd9950 dfa0faa76`: server `run-model-selection-service.ts`, `domain/run-model-selection.ts`, `api/graphql/types/run-model-config.ts`; web options clients/stores/query/types and `generated/graphql.ts`; docs)
- Coverage decisions or durable test paths changed:
  - Added: `autobyteus-web/tests/e2e/model-list-journeys-probe.mjs` (the durable form of round 1's ticket-owned probe; `--cli scripted` default, `--cli real`; cases API-11, API-12 incl. a backend restart before the return message, API-14, API-14b, API-19); MSP-32 in `autobyteus-web/tests/e2e/mobile-shell-probe.mjs`; MSR-003 in `stopped-run-model-config-graphql.e2e.test.ts`.
  - Removed: the ticket-owned `probes/real-stack/model-list-journeys-probe.mjs` (replaced by the durable probe above). Round 1's `probes/locked-menu-failed-refresh.repro.spec.ts` stays as the record of the reproduction; its cases are durable store specs (IMP-08).
  - Unchanged and still valid from round 1: `claude-agent-effort-only-live.e2e.test.ts`, MSR-001/MSR-002, DCM-010, the composer probe's T02/T04/T06–T09, the live Claude 5.5 suite.
- Cases added, changed, removed, or rechecked: rerun: API-03 (full server unit), API-03b, API-05, API-07 (+MSR-003), API-08 (T01, T03), API-11, API-12, API-14, API-17; new: API-14b, API-15, API-18, API-19; reused: API-04 (IMP-08), API-16; still valid: API-01, API-02, API-06, API-09, API-10 live part, API-13
- Commands, environment, fixture, or broader-validation delta: server and autobyteus-ts `dist` rebuilt at `dfa0faa76`; real-stack journeys in both CLI modes (scripted `claude`; real 2.1.280 → 2.1.322 → failing); production phone bundle built (`build:mobile-web`, 42 s); a fresh shallow clone of `be161036e` with `pnpm install --frozen-lockfile` and the web build chain (API-18) because `autobyteus-web/generated/graphql.ts` is a build input; mutation check of MSR-003 (server answers an unreadable list as readable)

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-14 (REQ-010, REQ-011, QR-001; AC-010 alternate outcome, saved-run locked menu emptied with no error/Retry and the saved model shown "No longer offered") | `Local Fix` (API/E2E preliminary) → CRR-003: `Design Impact`, CR-004 → SR-004 | resolved: with the CLI failing, Refresh models keeps the 4 options and shows "Couldn’t refresh models" with Retry; the card keeps the saved model without "No longer offered"; the first open with a failing CLI shows the error with Retry and keeps the model editable; recovery works | API-14, API-14b (real and scripted), MSR-003 (server contract), implementation's store cases (IMP-08, red on the pre-change stores) |

- Canonical artifacts and sections updated: coverage investigation (round 2 plan, planned cases, durable coverage, not tested), execution coverage report (rewritten as the round-2 result), test progress log (rows added), this record, `follow-ups.md` (FU-009), `evidence/` (`API-03-r2-*`, `API-05-r2-*`, `API-07-r2-*`, `API-08e-*`, `API-11-12-14-r2-real-stack/`, `API-15-phone-bundle/`, `API-18-*`, `API-03b-r2-*`)
- Prior result and confidence: `Fail`, 88% (post-repository 82%)
- Current result and confidence: `Pass`, final 95% (post-repository 87%)
- New or remaining failure IDs: none
- Recommended owner: code_reviewer (test-code review of the changed durable tests), then delivery
- Remaining risks, blocked evidence, or untested scope: user-only: the isolated Electron instance (embedded-server environment); not run: the delegated copy's locked menu in the UI (server and store covered), live acceptance of projected requests by non-Anthropic providers (no vault keys), the macOS packaging/signing steps of the release job (runner); known non-change failures: web `projectRunsStore.spec` (FU-005), server uid-0 chmod tests (8 tests in 3 files), pairing-auth teardown race (FU-008, did not recur), the mobile probe's FU-003 health-check line when a real node listens on port 8000 (FU-009)
