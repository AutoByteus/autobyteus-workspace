# API/E2E Execution Coverage Report

Ticket `clean-checkout-build-fix` (autobyteus-282). Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/clean-checkout-build-fix`, branch `codex/clean-checkout-build-fix`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; implementation IR-001 (urgent), direct route
- Prior round reviewed: N/A
- Deviations from the investigation's plan: none.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/clean-checkout-build-fix/tickets/in-progress/clean-checkout-build-fix/evidence/` (the handoff gives the commit that holds it)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route` (and no durable test changed in this round)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `828c88b2a2` (code `204025a459`), as a fresh clone `/tmp/ab282e2e/clone` | macOS 26.5.2 | Node v22.23.1, pnpm 10.28.2, Python 3; `pnpm install --frozen-lockfile` in the clone | Clone made with `git clone --no-local --branch codex/clean-checkout-build-fix file://<common git dir>`, so objects went through git's transport and no local files were linked. The clone held 0 untracked or ignored files before install. Tests ran with `env -i PATH HOME=<temp> TMPDIR`. Runs went one at a time under `caffeinate -i`, only when no other heavy run was active. The clone (8.7 GB) was removed afterwards |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | REQ-001, REQ-004 | restore and prune | `Reused` IMP-01 | — | Pass | (IMP-01) | (IMP-01) | Same code commit; tracked frozen files byte-identical to the base |
| API-02 | AC-001 (precondition) | the fresh clone | `git clone --no-local --branch codex/clean-checkout-build-fix file:///…/autobyteus-workspace-superrepo/.git /tmp/ab282e2e/clone`; commit and status checks | ENV-1 | Pass | `API-02-fresh-clone.log` | `clone HEAD:           828c88b2a23d314614006026075c2deb597ef68b` = the branch head; `untracked or ignored files in the clone before install: 0`; `tracked frozen memory files: 19` | 19 = the 15 restored modules plus the 4 `memory/migration` files tracked since 280 |
| API-03 | AC-002 | ignore rule | `git check-ignore -v` in the clone on every tracked frozen memory file, `tests/e2e/memory`, and a created root `memory/agents/x.json` | ENV-1 | Pass | `API-03-ignore-rule.log` | every frozen file `-> not ignored`; `tests/e2e/memory -> not ignored`; `memory/ -> autobyteus-server-ts/.gitignore:44:/memory/` | |
| API-04 | AC-003 (pass side), REQ-003 | hygiene check as the release workflow runs it | in the clone: `python3 scripts/check_repository_artifact_hygiene.py`; `… --only tracked-imports` | ENV-1 | Pass | `API-04-hygiene-check.log` | `Repository artifact hygiene check passed.`, `default exit=0`; `Tracked-import check passed. Tracked files scanned: 77239`, `tracked-imports exit=0` | |
| API-05 | AC-003 (fail side) | the check against the real failure | Temporary probe in the throwaway clone:<br>1. `git rm --cached` the restored modules, keeping them on disk;<br>2. put the old bare `memory` rule back;<br>3. add a tracked file importing a new untracked file;<br>4. run `--only tracked-imports` | ENV-1 | Pass (fails as required) | `API-05-check-negative-probe.log` | `ignored now: autobyteus-server-ts/.gitignore:44:memory …memory-types.ts`; `Tracked code importing files that are not tracked: 23` (the 22 imports IMP-03 found on the base, plus the probe's); `tracked-imports exit=1` | Reproduces 280's exact failure: files present on disk, hidden by the rule. The durable negative case (`tracked-imports.test.ts`) uses a synthetic repository |
| API-06 | AC-001 | build in the clone | `pnpm install --frozen-lockfile && pnpm -C autobyteus-server-ts prebuild && … typecheck && … build && … test:integration:prepare` | ENV-1 | Pass | `API-06-clone-build.log` | `Built-in agents bootstrap smoke check passed.`, `# Exit code: 0` (the chain stops at the first failure, so 0 means `tsc` and every step passed) | |
| API-07 | AC-001, REQ-004 | server unit in the clone, every test run | `pnpm -C autobyteus-server-ts test:unit` | ENV-1 | Pass | `API-07-clone-server-unit.excerpt.txt` | `Test Files  804 passed \| 4 skipped (808)`, `Tests  6657 passed \| 7 skipped (6664)`, `# Exit code: 0` | Runs, not only loads, so files tests read at runtime are proven present too |
| API-08 | AC-001, REQ-004 | server integration in the clone | `pnpm -C autobyteus-server-ts test:integration` | ENV-1 | Pass | `API-08-clone-server-integration.excerpt.txt` | `Tests  421 passed \| 69 skipped (490)`, `# Exit code: 0` | |
| API-09 | AC-001, REQ-003, REQ-004 | architecture tests, migration startup e2e, e2e load, in the clone | `cd autobyteus-server-ts && pnpm exec vitest run tests/architecture tests/e2e/app-data-migrations --no-watch; pnpm exec vitest list tests/e2e` | ENV-1 | Pass for this ticket (one pre-existing failure) | `API-09-clone-architecture-and-e2e.excerpt.txt` | `✓ tests/architecture/app-data-migration-boundaries.test.ts (3 tests)`; `✓ tests/architecture/tracked-imports.test.ts (2 tests)`; all 8 `✓ tests/e2e/app-data-migrations/…`; `vitest list tests/e2e exit=0 entries=838`. The only `×`: `application-framework-boundaries.test.ts` › "guards the exact SR-011 host definition…", whose diff is `+ "autobyteus-server-ts/src/agent-memory/services/agent-memory-explorer-service.ts"` | The failure is autobyteus-280's FU-001 (`tickets/done/seal-migrations-per-folder/follow-ups.md`): a pre-existing assertion about a file this branch does not touch. It also fails on the base (IMP-05). Out of scope |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-02 (clean clone of the exact commit), API-06 (`tsc`, `test:integration:prepare`), API-07/API-08 (unit and integration run in full), API-09 (e2e loads; migration startup e2e and the 280 boundary test pass) | Proven, on the commit through git's transport | None. Delivery confirms after its push that the remote branch holds this commit id (`git ls-remote`), since pushing is delivery's |
| AC-002 | Yes | API-03 | Proven | — |
| AC-003 | Yes | API-04 (passes on the tree), API-05 (fails on the real hidden-file failure), API-09 (`tracked-imports.test.ts` incl. its negative case) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual Uncertainty | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 96% | 96% | API-02..API-09 | — | — |
| Changed-boundary execution directness | 97% | 97% | A clean clone is the exact boundary (what git holds) | — | — |
| Cross-boundary integration realism and mock gap | 95% | 95% | Real install, build and full suites in the clone | The remote itself (delivery confirms the pushed commit id) | — |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | 0 untracked or ignored files before install | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | API-05 reproduces the original failure | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | No rendered or shell change | — | — |
| Durable regression coverage quality and relevance | 95% | 95% | `tracked-imports.test.ts` runs in every server test run; the release hygiene check runs it too | — | — |

- Overall final confidence: 95.5% (simple average of the applicable categories)
- Every critical acceptance criterion directly proven: `Yes`. No final category below `90%`. Target met: `Yes`.

## Broader Validation Decision (Mandatory)

- Decision: `Not Required`.
  - The changed boundary is repository content, and a fresh clone with its full build and server suites exercises that boundary directly (API-02..API-09). Nothing about runtime behavior changed: the restored files are byte-identical tracked copies, and the migrations' suites and startup e2e pass.
  - No browser or desktop surface is involved.

## Persisted-Data Transition Checks

- `Not Affected`. The migration suites and startup e2e pass unchanged in the clone (API-07, API-09).

## Compatibility / Legacy Scope Check

- No compatibility in scope or in the implementation; no compatibility-only coverage.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No` (the implementation's `tracked-imports.test.ts` was validated, not changed).

## Dependencies Mocked Or Emulated

None.

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Fresh clone `/tmp/ab282e2e/clone` (incl. API-05's edits) | Yes | `rm -rf` | Removed |
| Temp HOME for the runs | Yes | removed by the runner | Removed |
| `/tmp/ab282e2e/` (runner, full logs) | Yes | kept as scratch; the excerpts name the full logs | Kept |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: none. Delivery's step after its push: confirm that the remote branch holds this commit id.
- Next recipient: per `get_handoff_rules` (direct route → delivery)
- Notes: autobyteus-280's FU-001 is the only failing test in the clone. It is pre-existing and unrelated.
