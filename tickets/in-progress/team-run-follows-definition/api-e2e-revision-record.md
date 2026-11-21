# API/E2E Revision Record

The latest coverage investigation (`api-e2e-coverage-investigation.md`) and execution coverage report (`api-e2e-execution-coverage-report.md`) remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, round 1 (CRR-001 pass) | SR-008, ARCH-REV-002, IR-001, CRR-001 | N/A | Fail / 88% |

## Revision Entries

### API-REV-001 — Baseline: real-boundary validation; two failures (run-ID refusal, leaving member not shown in the app)

- Triggering role, report path, and round: code reviewer, `code-review-report.md`, CRR-001
- Triggering finding or case IDs: N/A (baseline)
- Related revision IDs: SR-008, ARCH-REV-002, IR-001, CRR-001
- Why recorded: first API/E2E validation.
- Coverage decisions or durable test paths changed (commit `443f1c2c0f`):
  - added `autobyteus-server-ts/tests/e2e/agent-team-runs/team-run-follows-definition.e2e.test.ts` (TF-01..TF-10);
  - added `autobyteus-server-ts/tests/e2e/runtime/team-run-follows-definition-live.e2e.test.ts` (TFL-01, TFL-02);
  - added RC-51 to `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`;
  - a ticket-owned rendered probe at `probes/team-follows-ui-probe.mjs` (TFU-01..TFU-03).
- Cases added, changed, removed, or rechecked: as above; IMP-02..IMP-05, IMP-08, IMP-09 reused; three existing E2E suites rerun (API-REG); typecheck (API-TC); fresh-start build (API-FS).
- Commands, environment, fixture, or broader-validation delta: built server per suite (restart real); data root outside `/tmp` for Codex; the test vault's Anthropic key for native AutoByteus; Nuxt dev + Chromium for the rendered probe; two-node suite for the peer copy.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation, execution report (all), progress log
- Prior result and confidence: N/A
- Current result and confidence: Fail, 88%
- New or remaining failure IDs:
  - F-1: TF-02/TF-03, a run-ID message to a removed member gets `TARGET_AGENT_RUN_NOT_ACTIVE` / `COLLABORATION_ROOT_NOT_ACTIVE` instead of the former-member refusal. Local Fix.
  - F-2: TFU-03, the app shows no leaving member: `TeamMembersPanel.vue`, which has the tag, is not mounted. Design Impact.
- Recommended owner: code reviewer (failure-origin review), then the implementation engineer (F-1) and the Solution Designer (F-2)
- Remaining risks, blocked evidence, or untested scope: configured-placement copies and application-bound runs not run end to end (unit-covered); observations O-1..O-5; the release job's signing-record unit tests refuse to run as root (27 node tests, environment); macOS/x64 release jobs need the runner.
- Follow-ups added: FU-004 (urgent): the Linux arm64 AppImage runtime needs the unversioned `libz.so` (outside this ticket).
