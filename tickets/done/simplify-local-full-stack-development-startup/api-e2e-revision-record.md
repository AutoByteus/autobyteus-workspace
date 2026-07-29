# API/E2E Revision Record

The canonical coverage investigation and execution report remain authoritative:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/done/simplify-local-full-stack-development-startup/api-e2e-coverage-investigation.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/done/simplify-local-full-stack-development-startup/api-e2e-execution-coverage-report.md`

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| `API-REV-001` | `code_reviewer`; implementation-source review passed; first API/E2E round | `SR-001`, `IR-001`, `CRR-001` | `N/A` | `Fail / 76%` |
| `API-REV-002` | `code_reviewer`; IR-002 source re-review passed; second API/E2E round | `IR-002`, `CRR-003`, `API-REV-001` | `Fail / 76%` | `Fail / 91%` |
| `API-REV-003` | `code_reviewer`; focused failure-origin review CR-002..CR-005; third API/E2E round | `CRR-004`, `API-REV-002` | `Fail / 91%` | `Pass / 96%` |
| `API-REV-004` | `code_reviewer`; latest-base failure-origin review CR-006; fourth API/E2E round | `CRR-006`, `DR-003`, `API-REV-003` | `Fail / 96%` | `Pass / 96%` |

## Revision Entries

### API-REV-001 — Initial runtime coverage and failure-origin baseline

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/done/simplify-local-full-stack-development-startup/code-review-report.md`; API/E2E execution round 1.
- Triggering finding or scenario IDs: `DEV-001`–`DEV-009`; primary failure `DEV-007` / `REQ-009` / `AC-008`.
- Related solution, implementation, or code-review revision IDs: `SR-001`, `IR-001`, `CRR-001`.
- Why this baseline or coverage/execution revision was recorded: First completed API/E2E validation result. It records both successful lifecycle/path evidence and the executable discovery that root `pnpm test:e2e` invokes Vitest with an extra option separator and runs unit/integration files.
- Coverage decisions or durable test paths changed: No durable API/E2E test changed. Existing four launcher tests remain valid. Temporary real-child lifecycle/path harness used because exact fixed ports were occupied.
- Scenarios added, changed, removed, or rechecked: `DEV-001` exact occupied-port fail-closed; `DEV-002` materialization/persistence basis; `DEV-003` alternate cwd; `DEV-004` hostile env/template/path/symlink; `DEV-005` port/child failure; `DEV-006` signal/repeat-stop/owned cleanup; `DEV-007` root E2E command; `DEV-008` production/test isolation; `DEV-009` credential-free/doc separation.
- Commands, environment, fixture, or broader-validation delta: Focused launcher tests passed 4/4; server build passed; `pnpm dev` and `pnpm --dir <repo> dev` both failed closed with `DEV_PORT_OCCUPIED` because unrelated PIDs 10242/10276 owned 8000/3000; temporary harness passed path/lifecycle scenarios; root `pnpm test:e2e` expanded to `vitest -- --run tests/e2e`, leaked into unit/integration tests, and was stopped with SIGINT after scope failure.

#### Prior Failure Resolution

None. This is the initial API/E2E result; prior result/confidence are `N/A`.

- Canonical artifacts and sections updated: Coverage investigation, execution coverage report, this revision record.
- Prior result and confidence: `N/A`.
- Current result and confidence: `Fail / 76%`.
- New or remaining failure IDs: `DEV-007` root E2E command scope; fixed-port clean start/restart remain blocked setup evidence, not implementation classification.
- Recommended recipient: `code_reviewer` for focused failure-origin review; likely bounded implementation command fix only if reviewer confirms.
- Remaining risks, blocked evidence, or untested scope: exact clean fixed-port startup/readiness, live Nuxt/backend HTTP, development DB/key stop/restart, deterministic E2E-only rerun after command correction, browser/Electron.


### API-REV-002 — Command-forwarding resolution and real full-stack validation

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/done/simplify-local-full-stack-development-startup/code-review-report.md`; API/E2E round 2 after IR-002.
- Triggering finding or scenario IDs: Prior `DEV-007` / `REQ-009` / `AC-008` resolved; current failures are `DEV-007` E2E assertion failures across 8 files / 16 tests.
- Related solution, implementation, or code-review revision IDs: `SR-001`, `IR-002`, `CRR-003`, `API-REV-001`.
- Why this revision was recorded: Confirms the root command now forwards `--run tests/e2e` correctly, captures the complete exact root E2E result, and adds direct real full-stack readiness, stop/restart persistence, alternate-cwd, hostile-env, and cleanup evidence.
- Coverage decisions or durable test paths changed: No durable API/E2E test changed. Existing launcher tests and prior lifecycle harness remain valid.
- Scenarios added, changed, removed, or rechecked: Rechecked `DEV-001`–`DEV-009`; `DEV-007` command-scope issue resolved; exact E2E suite now fails in 8 product test files. Real `pnpm dev` and `pnpm --dir <repo> dev` startup/restart scenarios now directly pass.
- Commands, environment, fixture, or broader-validation delta: `pnpm test:e2e` produced `vitest --run tests/e2e`, 61 files (`39 passed`, `8 failed`, `14 skipped`) and 213 tests (`148 passed`, `16 failed`, `49 skipped`), exit 1. Root `pnpm dev` and alternate-cwd `pnpm --dir <repo> dev` both built, reported readiness, served backend/frontend HTTP 200, reused DB/key, and stopped cleanly.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `DEV-007` / `REQ-009` / `AC-008`: extra separator caused `vitest -- --run tests/e2e` and unit/integration leakage | `Local Fix` likely implementation-owned package wiring | Resolved by IR-002; exact rerun logs effective `vitest --run tests/e2e` and only `tests/e2e/**` files | `evidence/06-root-test-e2e-rerun.log`, CRR-003 |

- Canonical artifacts and sections updated: coverage investigation Round 2 update, execution coverage report, this revision record.
- Prior result and confidence: `Fail / 76%`; prior command-scope failure.
- Current result and confidence: `Fail / 91%`; command scope fixed, launcher/full-stack scenarios pass, product E2E suite has 16 failed tests.
- New or remaining failure IDs: 8 failed E2E files: `agent-package-private-skills`, `server-owned-media-tools`, `claude-agent-websocket-interrupt-resume`, `gpt56-token-usage-accounting`, `token-usage-execution-address-backfill`, `token-usage-ledger`, `token-usage-legacy-path-columns-drop-startup`, `token-usage-unit-prices`.
- Recommended recipient: `code_reviewer` for focused failure-origin review. No proportional test-code review applies because no durable test changed.
- Remaining risks, blocked evidence, or untested scope: failure-origin classification for the 16 product E2E failures; no browser/Electron/Windows validation; provider credentials intentionally not configured.


### API-REV-003 — Durable fixture/setup repairs and passing exact root E2E rerun

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/done/simplify-local-full-stack-development-startup/code-review-report.md`; API/E2E execution round 3.
- Triggering finding or scenario IDs: `CR-002` stale model factory option, `CR-003` stale media factory mocks, `CR-004` stale Claude team/interrupt fakes, `CR-005` direct-test AppConfig setup; `DEV-007` exact root E2E rerun.
- Related solution, implementation, or code-review revision IDs: `CRR-004`, `API-REV-002`.
- Why this revision was recorded: The focused failure-origin report assigned all Round 2 failures to API/E2E-owned fixture/setup validity. This revision records the bounded durable repairs, focused proof, exact root command result, and final lifecycle/live evidence state.
- Coverage decisions or durable test paths changed: Updated eight existing E2E files and added `autobyteus-server-ts/tests/setup/initialize-test-app-config.ts`. The changes align test doubles with current production contracts and isolate direct token-usage AppConfig/SQLite setup. No production source or launcher implementation changed.
- Scenarios added, changed, removed, or rechecked: Repaired and rechecked the eight Round 2 failing files; all focused groups pass. Rechecked `DEV-001`–`DEV-009`; exact root E2E now passes while prior occupied-port and lifecycle evidence remains preserved.
- Commands, environment, fixture, or broader-validation delta: Focused runtime group passed `13/13` runnable tests with `1` skip; focused token files passed `11/11`; source-only `tsc -p tsconfig.build.json --noEmit` passed; repository `pnpm typecheck` still emits baseline TS6059 due tests under `rootDir: src`; exact root `pnpm test:e2e` exited `0`, collecting `61` files (`47` passed, `14` skipped) and `213` tests (`164` passed, `49` skipped`).

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `CR-002` / agent private skills model lookup | Stale test fixture | Uses current top-level `createLLM`; focused and root suite pass. | `evidence/10-fixture-runtime-focused.log`, `12-root-test-e2e-fixed-fixtures.log` |
| `CR-003` / server-owned media tools | Stale hoisted media mocks | Mocks current resolver method on image/audio/video factories; focused and root suite pass. | `evidence/10-fixture-runtime-focused.log`, `12-root-test-e2e-fixed-fixtures.log` |
| `CR-004` / Claude team and interrupt harness | Stale fake contract and stale close timing | Adds `postMessageToConversationTarget`; fake observes AbortController and tests abort settlement; focused and root suite pass. Provider-gated live test remains skipped. | `evidence/10-fixture-runtime-focused.log`, `12-root-test-e2e-fixed-fixtures.log` |
| `CR-005` / token-usage AppConfig errors | Direct-test setup defect | Initializes AppConfig with isolated temporary SQLite state, including dynamic provider after module reset; all focused and root tests pass. | `evidence/10-token-*.log`, `12-root-test-e2e-fixed-fixtures.log` |

- Canonical artifacts and sections updated: coverage investigation Round 3, execution coverage report Round 3, this revision record.
- Prior result and confidence: `Fail / 91%`; Round 2 exact root E2E had 8 files / 16 failed tests.
- Current result and confidence: `Pass / 96%`; exact root E2E and required launcher/live validation pass.
- New or remaining failure IDs: none in the changed launcher scope. Provider-gated live Claude tests, browser/Electron shell, and Windows process semantics remain explicitly untested.
- Recommended recipient: `code_reviewer` for separate proportional durable test-code review. No implementation rework is requested.
- Cleanup and integrity: launcher children/listeners stopped; `.autobyteus/development/` removed after evidence capture; unrelated occupied-port processes untouched; `git diff --check` passed.


### API-REV-004 — Latest-base exact root E2E gate recheck

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-local-full-stack-development-startup/tickets/done/simplify-local-full-stack-development-startup/code-review-report.md`; API/E2E execution round 4.
- Triggering finding or scenario IDs: `CR-006` latest-base managed-messaging full-suite-only failure; `DEV-007` / `REQ-009` / `AC-008` exact root E2E gate.
- Related solution, implementation, code-review, or delivery revision IDs: `CRR-006`, `DR-003`, `API-REV-003`.
- Why this revision was recorded: Delivery refreshed the candidate against a newer `origin/personal` base. The exact root gate failed once in the refreshed candidate and the focused rollback scenario passed; this revision records the required fresh exact root rerun, which passed.
- Coverage decisions or durable test paths changed: None. No durable API/E2E test, fixture, helper, or production source changed in this recheck. The prior focused pass and full-suite failure remain historical evidence only.
- Scenarios added, changed, removed, or rechecked: Rechecked `DEV-007` on integrated HEAD `a4040047b44da5e1cf7208251f0ca8efe0fa0dcf`; managed-messaging gateway file and all other collected E2E files passed in the fresh full-suite workers. Prior `DEV-001`–`DEV-006`, `DEV-008`, and `DEV-009` evidence remains valid.
- Commands, environment, fixture, or broader-validation delta: Exact root `pnpm test:e2e` from the worktree root used test-owned SQLite state and exited `0`; effective command was `vitest --run tests/e2e`; `62` files (`48` passed, `14` skipped), `214` tests (`165` passed, `49` skipped). Latest-base build/install and prior post-integration launcher checks passed. Evidence: `delivery-evidence/latest-base-root-test-e2e-rerun-20260729.log`, `delivery-evidence/post-integration-check.log`, and retained `delivery-evidence/latest-base-root-test-e2e.log` / `latest-base-managed-gateway-focused.log`.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `CR-006` / `DEV-007`: managed-messaging rollback expected `0.1.0`, received `0.2.0` only in one full-suite run | Unrelated baseline/flaky full-suite execution issue; delivery-blocking gate | Fresh exact root rerun passes the same managed-messaging file and all collected E2E files; no test/source repair was made. | `delivery-evidence/latest-base-root-test-e2e-rerun-20260729.log`, prior `latest-base-root-test-e2e.log`, prior `latest-base-managed-gateway-focused.log` |

- Canonical artifacts and sections updated: coverage investigation Round 4, execution coverage report Round 4, this revision record.
- Prior result and confidence: `Fail / 96%` for the latest-base gate observation.
- Current result and confidence: `Pass / 96%`; exact root E2E gate is passing on the refreshed candidate.
- New or remaining failure IDs: none current. Provider-gated live Claude tests, browser/Electron shell, and Windows process semantics remain explicitly untested.
- Recommended recipient: `code_reviewer` for package acknowledgement; proportional test-code review is `Not Applicable` because no durable test changed in API-REV-004.
- Cleanup and integrity: test-owned runtime cleanup completed by the repository suite; no launcher listeners or children were present; no implementation or test files were changed; `git diff --check` passed.
