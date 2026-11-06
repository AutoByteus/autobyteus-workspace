# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history across rounds.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/run-expand-motion/tickets/in-progress/run-expand-motion/` unless absolute.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- Revision record and current ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, IR-001 (direct route)
- Prior round reviewed: none
- Deviations from the plan, and why:
  - API-05 (RXM-003) first asserted that a fold survives a view switch. The fold state lives in the Runs view's own `useRunListDisclosure` instance, so it resets when the view is shown again. That behavior is unchanged by this ticket, so the case now records it instead of asserting it (OBS-1).
  - API-06 r1 stopped at packaging because the updater repository was unset. The runner sets `GITHUB_REPOSITORY`, while a local clone's origin is a path. r2 used a fresh re-clone with that variable set.
- Evidence folder: `evidence/api-e2e/`

## Routing Classification

- Task size `Small`; architectural risk `Low`; input route `Direct Low-Risk`; successful-output route `Delivery` (not reached: this round fails); test-code review `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | `85bf73750b` (code `c5cc87d89d`, `7cc31409af`) with this round's case module | macOS 26.5.2 (Darwin 25.5.0), Node v22.23.1, pnpm 10.28.2 | `delegated-launch-defaults-probe.mjs` stack: headless Chrome 1512×952 → Nuxt dev → `autobyteus-server-ts/dist/app.js` rebuilt from this worktree (exit 0), scripted AGY | Clean env; probe-owned data root, HOME, SQLite and ports, removed (cleanup receipt in the evidence); load average ~110 |
| ENV-2 | `85bf73750b` | same | Fresh clone (`git clone --no-local`), `pnpm install --frozen-lockfile` alone, `pnpm build:electron:mac -- --arm64` as the release job runs it, without the signing secrets | `CSC_IDENTITY_AUTO_DISCOVERY=false` (never the user's keychain), `GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace` as on the runner; clone removed afterwards |

## Cases

| Case ID | Criteria | Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-003, AC-004 (suites) | web | Reused: IMP-01 (spec red/green), IMP-02 (web suite), IMP-05 (typecheck, guards) | — | Pass | `evidence/implementation/IMP-01-row-spec-red-green.log`, `IMP-02-web-suite.log`, `IMP-05-web-typecheck-guards.log` | (implementation rows) | `git diff --name-only 7cc31409af 85bf73750b`: ticket documents only |
| API-02 | AC-001, AC-002 (the regression check fails on the base) | browser, fixture page | Reused: IMP-03, IMP-04 | — | Pass | `evidence/implementation/IMP-03-probe-fix.log`, `IMP-04-probe-base.log` | IMP-03 `REM-03 Pass`; IMP-04 `firstOffending[0]` at `top: 0` | The fixture answers `taskWorkerTasks` with `[]`, so its rows have no Task line. That is why it does not show the failure in API-03 |
| API-03 | AC-001, AC-002 | live browser | `pnpm -C autobyteus-web test:e2e:run-expand-motion-live --output-dir <fresh>` (RXM-001) | ENV-1 | **Fail** (r1, r2) | `evidence/api-e2e/API-RXM-r2/delegated-launch-defaults-evidence.json` (`cases.RXM-001`), `API-RXM-r2/RXM-001-expanded.png`, `RXM-001-collapsed.png`, `RXM-001-failure.png`; r1 the same in `API-RXM-r1/` | Collapse: Pass (tree absent from frame 0). Expand: frame 0 tops `533, 563, 593` (30 px apart, one line each) against final `551, 599, 647` (48 px apart, two lines); frame 1 transforms `matrix(1, 0, 0, 1, 0, -18)`, `-36`, `-54` | Expected: every row at its final place with `transform: none` from the first frame (AC-001). Observed: rows 2–4 slide down 18–54 px over the 200 ms move transition |
| API-04 | AC-003 (DONE-row leave while expanded) | live browser | RXM-002 | ENV-1 | Pass | `API-RXM-r2/…evidence.json` (`cases.RXM-002`), `RXM-002-after-done.png` | `fadeOpacities` 1 → 0.866 → … → 0; `leaveMs` 217; 3 rows left at `transform: none` | |
| API-05 | AC-003, R-01 (stored rows; selection) | live browser | RXM-003 | ENV-1 | Pass (r2; r1 Fail in the case's own assertion) | `API-RXM-r2/…evidence.json` (`cases.RXM-003`), `RXM-003-*.png` | `rowsAfterUnfold` equal to `storedRows`; `readsBeforeUnfold` 1 = `readsAfterUnfold` 1; `selectedRow` set; `foldKeptAcrossSwitch: false` (OBS-1) | R-01's escalation trigger did not fire |
| API-06 | AC-004 (build); fresh-start rule (`autobyteus-web/package.json` and a spec read by the build's typecheck) | release build | `evidence/api-e2e/API-06-fresh-start.sh` (fresh clone; `pnpm install --frozen-lockfile`; `cd autobyteus-web && … pnpm build:electron:mac -- --arm64`); then the job's "Verify bundled Prisma ARM64 engine target" and "Verify packaged terminal runtime ARM64" steps | ENV-2 | Pass (r2; r1 stopped by the unset updater repository, an environment difference) | `API-06-fresh-start-r2.log`, `API-06-fresh-build-r2.full.log.gz`, `API-06-fresh-verify.log`, `API-06-electron-dist-listing.txt`; r1: `API-06-fresh-start-r1.log`, `API-06-fresh-build-r1-excerpt.log` | `build exit=0`; `[typecheck] production errors: 0; test-file errors: 99 in 43 files (baseline 99 in 43 files)`, `[typecheck] PASS`; dmg and zip listed; `ok: node-pty spawn probe`, `exit=0` | Signing, notarization and the signing-policy check: Not Tested (the runner's secrets). Other platforms: Not Tested |

### Observations

- **OBS-1 (not this ticket).** The Runs view's fold resets when the view is shown again: `foldedRuns` lives in each `useRunListDisclosure` instance (385). This ticket does not change it, and AC-003 asks for it to stay as it is.
- **OBS-2 (likely shared, not verified).** The Workspaces tree mounts the same `AgentRunTaskRows`, under folder and agent-group rows that mount their children only while expanded. Its rows would also lose their Task answers when collapsed and regain them after expand. API-03's effect may therefore also exist there. I did not run this.

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result |
| --- | --- | --- | --- |
| AC-001 | Yes | API-02 (fixture: Pass, base fails), API-03 (live: Fail) | **Not Proven**. With a real run, whose delegated rows carry a Task line, the rows move after expand |
| AC-002 | Yes | API-02, API-03 (collapse part) | Proven |
| AC-003 | Yes | API-04, API-05, API-01 | Proven |
| AC-004 | Yes | API-01, API-06 (fresh-start build); finalization is delivery's | Proven up to finalization |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 80% | 50% | AC-002…AC-004 proven | AC-001 fails live | Fix, then rerun API-03 |
| Changed-boundary directness | 80% | 95% | Live rows of a real run, frame by frame | — | — |
| Integration realism and mock gap | 70% | 95% | Real Task data showed what the fixture's empty answer hid | — | — |
| Environment and fixture fidelity | 85% | 95% | Fresh-start release build; probe-owned stack | Signing not run | — |
| Failure, edge-case, lifecycle | 75% | 90% | DONE leave, stop, reopen, view switch | — | — |
| User surface | 75% | 90% | Runs view in Chrome | Electron shell not run (same renderer) | — |
| Durable coverage | 85% | 95% | RXM-001…003 added; it catches the failure | — | — |

- Overall post-repository: 79%; overall final: 87%; simple average
- Every critical AC directly proven: `No` (AC-001)
- Any final category below `90%`: `Yes` (requirement proof, 50%)
- 95% target met: `No`

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed. Mode: `Browser` on a live stack. The fixture page left the delegated rows' Task data empty, so only a real run could show how the rows behave once they carry a Task line.

## Persisted-Data Transition Checks

- `Not Affected`.

## Compatibility / Legacy Scope Check

- `No` compatibility scope.

## Durable Coverage Changed In The Codebase

| Path | Change | Cases |
| --- | --- | --- |
| `autobyteus-web/tests/e2e/run-expand-motion-live-cases.mjs` | Added (RXM-001…003) | API-03…API-05 |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Registration (opt-in for `RXM-`) | API-03…API-05 |
| `autobyteus-web/package.json` | Script `test:e2e:run-expand-motion-live` | API-03…API-05 |
| `TESTING.md` | New "Fresh-start build" section: build-input paths from the release workflow, the command, and the runner-only steps; the Environments bullet points to it (own `docs(testing)` commit) | API-06 |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Model provider | scripted AGY (`CALL_TOOL:` makes the agent call the real `delegate_task` / `update_task`) | No provider proof needed | — |
| Release runner | local fresh clone with the job's commands | The skill's fresh-start proof | No signing secrets; macOS ARM64 only |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Probe stacks | Yes | removed by the probe | Done |
| Fresh clone `/tmp/rxm-390/clean-clone` (incl. the unsigned dmg) | Yes | removed | Done |

## Preliminary Classification (On `Fail`)

- Failing case: API-03 (RXM-001), AC-001 / REQ-001.
- Command: `pnpm -C autobyteus-web test:e2e:run-expand-motion-live --output-dir <fresh dir>` from the worktree, after `pnpm -C autobyteus-server-ts build`.
- Expected: after expand, every delegated row is at its final position with `transform: none` from the first frame.
- Observed: the rows mount one line tall, at 30 px spacing. Their Task line arrives within the next frames, the rows grow to 48 px, and the row group's `tree-row-move` transition slides rows 2–4 down by 18, 36 and 54 px over 200 ms.
- Cause found:
  1. With `v-if`, collapse unmounts `AgentRunTaskRows`.
  2. Its `useTaskWorkerTasks` scope is disposed and releases the rows' workers.
  3. `taskWorkerTaskStore`'s release calls `forgetAnswer` for each worker no one else retains (`stores/taskWorkerTaskStore.ts`, release).
  4. On expand, `taskOf` returns `undefined`, so the rows render without the Task line. The store reads again, and when the answers apply, the rows grow and the TransitionGroup moves them.

  The `v-show` base kept the rows mounted, and with them the answers. This change introduced the effect.
- Preliminary classification: `Local Fix` (implementation). For example, keep the Task-worker interest of an Agent run's delegated rows while the run row exists, folded or not, so the rows mount with their Task line. If the chosen fix moves Task-summary ownership out of `AgentRunTaskRows`, against the design's "Ownership And Dependencies: Unchanged", it is a `Design Impact` for the Solution Designer. The failure-origin review decides.
- Recommended owner: code reviewer (failure-origin review).

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven, or parts only the user can check: AC-001 (Not Proven: fails live). Nothing only the user can check.
- Test-code review: `Not Required — direct low-risk route`
- Next recipient: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes: OBS-1, OBS-2. The fresh-start build passes. TESTING.md gained the Fresh-start build section; delivery's docs sync should check it.
