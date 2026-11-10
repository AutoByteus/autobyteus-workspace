# API/E2E Revision Record

The latest [coverage investigation](api-e2e-coverage-investigation.md) and [execution coverage report](api-e2e-execution-coverage-report.md) remain authoritative. This record holds the baseline and the coverage/execution delta of each round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer, `code-review-report.md`, implementation review round 2 (CRR-002 Pass), API/E2E round 1 | SR-003, ARCH-REV-002, IR-002, CRR-001 (Fail, fixed), CRR-002 (Pass) | N/A | `Fail` / 88% |

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
