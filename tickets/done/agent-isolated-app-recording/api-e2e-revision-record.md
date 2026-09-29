# API/E2E Revision Record — agent-isolated-app-recording

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` are authoritative. This record keeps concise round history.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` / `code-review-report.md` CRR-001 Pass / API/E2E round 1 | SR-009..SR-012; ARCH-REV-005; IR-001, IR-002; CRR-001 | N/A | Pass / 94.9% |

## Revision Entries

### API-REV-001 — Initial baseline: macOS end-to-end validation of isolated instances, helper and recording

- Triggering role, report path, and round: `code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording/code-review-report.md`, CRR-001 round 1 (Pass)
- Triggering finding or scenario IDs: reviewer open executable items 1–10; design escalation triggers (a)–(f); MP-003; QR-001/002/003/006
- Related revision IDs: SR-009..SR-012, ARCH-REV-003..005, IR-001, IR-002, CRR-001
- Why this baseline was recorded: first completed API/E2E result for the package
- Coverage decisions or durable test paths changed:
  - Updated `autobyteus-web/tests/e2e/electron-launch-profile-probe.mjs`. Stale assertions that encoded the superseded "full caller env reaches the e2e server" contract (earlier ticket's AC-014) and the "no updater IPC in e2e" contract now assert the isolated-baseline allowlist and the `disabled` updater. Production-like sentinels and `ELECTRON_RUN_AS_NODE` were added to the controlled caller.
  - Added `autobyteus-web/tests/e2e/isolated-app-lifecycle-probe.mjs` (+ `test:e2e:isolated-app` script).
  - Added 2 real-process MCP tests in mcps `browser-automation/tests/integration/test_mcp_transports_real.py`.
- Scenarios added, changed, removed, or rechecked: R-01..R-07, L-01..L-18 (all new)
- Commands, environment, fixture, or broader-validation delta: baseline — packaged worktree build, unscrubbed agent shell with production variables, real key source via the unchanged importer (isolated DB only), real Chrome, MCP stdio, fresh AutoByteus agent run with Anthropic model

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (all), `api-e2e-execution-coverage-report.md` (all), `api-e2e-test-case-ledger.md` (27 events), evidence under `api-e2e-evidence/`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 94.9% (no category below 90%; every critical AC directly proven; 95% target missed by 0.1 point because the remaining gaps are user-waived or outside approved scope)
- New or remaining failure IDs: none. Non-blocking observations OBS-1 (backend `*` binding, pre-existing) and OBS-2 (pnpm-script variables in the launch env break nvm PATH inside lifecycle-started instances)
- Recommended recipient: `/code_reviewer` (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope: Linux (user validates after delivery); minimized-window recording (waived); durable probes are opt-in; OBS-2 decision
