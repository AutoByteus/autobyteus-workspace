# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001 (pass), round 1 | SR-003, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: context-file size limits on the built server, the phone bundle and Server Settings

- Triggering role, report path, and round: code reviewer, `code-review-report.md`, round 1 (Implementation Review pass for the Large + High route)
- Triggering finding or case IDs: none (a pass); the open items listed in the implementation handoff under "Not run" and "Downstream Coverage Hints"
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-003; ARCH-REV-002; IR-001; CRR-001 (CR-001 minor, not blocking); no delivery revision
- Why this baseline or coverage/execution revision was recorded: first API/E2E round of the ticket
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/context-files/context-file-size-limits-built-server.e2e.test.ts` (7 default cases, 1 gated), `autobyteus-web/tests/e2e/mobile-context-file-size-cases.mjs` (MSP-53..55, wired into `mobile-shell-probe.mjs`), case CF-014 in `composer-context-file-removal-probe.mjs`; no durable test removed; commit `de0250122`
- Cases added, changed, removed, or rechecked: added API-01..API-09; reused IMP-01..IMP-06, IMP-08 and IMP-10 as API-R01..R08 (their code did not change since they ran); API-06 (a real native turn) not run
- Commands, environment, fixture, or broader-validation delta: rebuilt the server and the phone bundle from the worktree; the machine has no `pnpm` or `corepack` on PATH, so shims in `/tmp` ran the pinned pnpm 10.28.2; no test vault; no Android SDK. Broader validation (browser and live API) ran

#### Prior Failure Resolution

None. (Earlier runs of API-01..API-04 failed on defects in my own case code; each is in `api-e2e-test-progress.md` with its cause and fix. None was a product failure.)

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/API-*`
- Prior result and confidence (`N/A` for `API-REV-001`): N/A
- Current result and confidence: Pass; overall 95% (post-repository 87%)
- New or remaining failure IDs: none. Finding F-001 (non-blocking documentation): `autobyteus-web/docs/settings.md` says the two settings are in the advanced list with the other predefined keys; a setting with no value is not listed, so the owner adds it with the list's new-setting row
- Recommended owner: F-001 to the delivery engineer's documentation sync (or the implementation engineer); CR-001 stays with the implementation engineer
- Remaining risks, blocked evidence, or untested scope: a real Android phone (`File.type`, WebView progress and abort), a silent network loss without a reset, and a real native-runtime turn with a video over 25 MiB (no test vault); the user must check the first and third
