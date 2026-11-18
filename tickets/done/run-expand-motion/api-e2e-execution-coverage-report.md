# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history across rounds.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/run-expand-motion/tickets/in-progress/run-expand-motion/` unless absolute.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md` (round 2 section at the end)
- Revision record and current ID: `api-e2e-revision-record.md` / `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2. The chain:
  - API-REV-001 Fail;
  - CRR-001 CR-001 `Design Impact`;
  - SR-002, narrowed to the Runs view;
  - IR-002 (`3e6b5a3dd4`): `RunListPanel` turns the `tree-row` move off in its scroll container, and `RunListRow` is back to `v-show`.

  Validated on head `3f78b649ef`, plus this round's case edits.
- Prior round reviewed: round 1 (API-REV-001: Fail on API-03, AC-001). Rechecked first: API-03 now passes.
- Deviations from the plan, and why:
  - RXM-003 r3 failed on its own first fold check. It still expected the tree removed from the DOM; the implementer had updated only its second check for `v-show`. I fixed the case and reran all three cases (r4).
  - The implementer edited my case module in `b7fc37aa75`: rows are now counted by layout box, and "removed" became "hidden". I reviewed the edit and kept it.
- Evidence folder: `evidence/api-e2e/`

## Routing Classification

- Task size `Small`; architectural risk `Low`; input route `Direct Low-Risk`; successful-output route `Delivery`; test-code review `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | round 2: `3f78b649ef` (code `3e6b5a3dd4`) plus this round's case edits; round 1: `85bf73750b` | macOS 26.5.2 (Darwin 25.5.0), Node v22.23.1, pnpm 10.28.2 | `delegated-launch-defaults-probe.mjs` stack: headless Chrome 1512×952 → Nuxt dev → `autobyteus-server-ts/dist/app.js` built from this worktree in round 1 (no server or `autobyteus-ts` change since: `git diff --name-only 85bf73750b HEAD -- autobyteus-server-ts autobyteus-ts` is empty), scripted AGY | Clean env; probe-owned data root, HOME, SQLite and ports, removed; load average ~110 |
| ENV-2 | round 2: `3f78b649ef`; round 1: `85bf73750b` | same | Fresh clone (`git clone --no-local`), `pnpm install --frozen-lockfile` alone, `pnpm build:electron:mac -- --arm64` as the release job runs it, then the job's Prisma and terminal-runtime verify steps | `CSC_IDENTITY_AUTO_DISCOVERY=false`, `GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace` (as on the runner); no signing secrets; clone removed |
| ENV-3 | `3f78b649ef` | same | `task-closure-tree-probe.mjs` own stack (Nuxt dev, `dist/app.js`, scripted AGY) | Probe-owned, removed |

## Cases

| Case ID | Criteria | Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-003, AC-004 (suites) | web | Reused: IMP-06 (specs red on base and SR-001), IMP-07 (web suite), IMP-11 (typecheck, guards) | — | Pass | `evidence/implementation/IMP-06-specs-red.log`, `IMP-07-web-suite.log`, `IMP-11-web-typecheck-guards.log` | (implementation rows) | All ran on `3e6b5a3dd4`; only ticket documents after it |
| API-02 | AC-001, AC-005 (incl. late Task lines), AC-006 (the move kept outside the Runs view); regression checks on base and SR-001 | browser, product `RunListPanel` on a fixture page | Reused: IMP-08, IMP-09, IMP-10 | — | Pass | `evidence/implementation/IMP-08-probe-sr002.log`, `IMP-09-probe-base.log`, `IMP-10-probe-sr001.log` | IMP-08 REM-01…08 `Pass` (REM-07: `transition: none` inside the Runs view, `transform 0.2s ease-out` outside it); IMP-09 and IMP-10 fail as intended | The live app cannot hold a Task answer back on demand, so late Task lines are proven here |
| API-03 | AC-001, AC-002, AC-005 (Team expand) | live browser | `pnpm -C autobyteus-web test:e2e:run-expand-motion-live --output-dir <fresh>` (RXM-001) | ENV-1 | Pass (round 2 r3 and r4; round 1 Fail) | `evidence/api-e2e/API-RXM-r4/delegated-launch-defaults-evidence.json` (`cases.RXM-001`), `API-RXM-r4/RXM-001-*.png` | `collapse.perFrame` empty and `treeShown: false`. `expand.perFrame`: 4 frames × 4 rows, tops `503, 551, 599, 647` equal to `before`, `transform: none`, `taskLine: true`. `teamExpandRows` `[6,6,6,6]`, `teamOffending` `[]` | Round 1's failure (rows mounted one line tall, then slid 18–54 px) is gone |
| API-04 | AC-003, AC-005 (the DONE row fades; the row below glides by layout) | live browser | RXM-002 | ENV-1 | Pass (both rounds) | `API-RXM-r4/…evidence.json` (`cases.RXM-002`), `RXM-002-after-done.png` | `fadeOpacities` 1 → 0.865 → … → 0, `leaveMs` 216; `movedByTransform` 0; `nextRowTops` 551 → 545 → … → 505 (13 positions) | |
| API-05 | AC-003, R-01 (stored rows; selection) | live browser | RXM-003 | ENV-1 | Pass (round 2 r4; round 1 r2) | `API-RXM-r4/…evidence.json` (`cases.RXM-003`), `RXM-003-*.png`; r3 failure: `API-RXM-r3/` | `rowsAfterUnfold` = `storedRows`; reads 1 → 1; `selectedRow` set; `foldKeptAcrossSwitch: false` (OBS-1) | |
| API-06 | AC-004; fresh-start (`autobyteus-web/package.json` changed) | release build | `evidence/api-e2e/API-06-fresh-start-r3.sh`, then the verify steps | ENV-2 | Pass (round 2 r3 at `3f78b649ef`; round 1 r2 at `85bf73750b`) | `API-06-fresh-start-r3.log`, `API-06-fresh-build-r3.full.log.gz`, `fresh-verify-r3.log`; round 1: `API-06-fresh-start-r1.log`, `-r2.log`, `API-06-fresh-verify.log` | `build exit=0`; `test-file errors: 99 in 43 files (baseline 99 in 43 files)`, `[typecheck] PASS`; dmg and zip; `prisma-verify=ok`, `ok: node-pty spawn probe`, `exit=0` | Rerun because `package.json` (a build input) changed after round 1's run. Signing and notarization: Not Tested (runner secrets) |
| API-07 | AC-006 (Workspaces keeps its motion; its probes pass unchanged) | live browser, Workspaces tree | `node autobyteus-web/tests/e2e/task-closure-tree-probe.mjs --output-dir <fresh>` | ENV-3 | Pass | `API-07-task-closure-tree/evidence.json`, `run.log` | BR-001…BR-016 `Pass`; cleanup `dataRootRemoved: true` | File unchanged from the base |

### Prior Failure Resolution

- API-03 (round 1, AC-001): after expand, live rows mounted one line tall, then their late Task line made the move transition slide them 18–54 px. Resolved by IR-002:
  - folded rows stay mounted (`v-show`), so they keep their Task answers and show complete;
  - the Runs view has no move transition, so a late line or a Team expand moves rows at once.

  Proven live by RXM-001 (round 2) and on the fixture by IMP-08, which also fails on SR-001's code (IMP-10).

### Observations

- **OBS-1 (not this ticket).** The Runs view's fold resets when the view is shown again (`useRunListDisclosure` per instance, from 385). Unchanged; AC-003 keeps it as it is.
- **OBS-2 (withdrawn, round 1).** The user reports that the Workspaces and Projects views are fine.

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result |
| --- | --- | --- | --- |
| AC-001 | Yes | API-03 (live, rows with Task lines, 4 frames), API-02 (IMP-08; fails on base IMP-09 and on SR-001 IMP-10) | Proven |
| AC-002 | Yes | API-03 (hidden from frame 0), API-02 | Proven |
| AC-003 | Yes | API-04, API-05, API-01 | Proven |
| AC-005 | Yes | API-03 (Team expand), API-04 (leave: fade, layout glide, no transform), API-02 (late Task lines) | Proven |
| AC-006 | Yes | API-07 (live Workspaces DONE leave, unchanged probe), API-02 (REM-07: the move kept outside the Runs view), code diff (`treeRowLeave.css`, Workspaces and Projects components unchanged) | Proven |
| AC-004 | Yes | API-01, API-06; finalization is delivery's | Proven up to finalization |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 85% | 95% | Every AC by live and fixture evidence | — | — |
| Changed-boundary directness | 85% | 95% | Frames of a real run's rows; the scoped CSS seen inside and outside the view | — | — |
| Integration realism and mock gap | 80% | 90% | Real delegation, Tasks, DONE, stop and reopen | A late Task line live is shown only on the fixture (it cannot be timed live) | — |
| Environment and fixture fidelity | 90% | 95% | Fresh-start release build at the head; probe-owned stacks | Signing on the runner | — |
| Failure, edge-case, lifecycle | 85% | 95% | DONE leave, stop, reopen, view switch, Team expand | — | — |
| User surface | 80% | 90% | Runs view in Chrome; Workspaces tree live | Electron shell not run (same renderer, no shell change) | — |
| Durable coverage | 90% | 95% | RXM-001…003 extended for SR-002; fixture probe REM-01…08 | — | — |

- Overall post-repository: 85%; overall final: 94%; simple average
- Every critical AC directly proven: `Yes`
- Any final category below `90%`: `No`
- 95% target met: `No` (94%). Two small gaps remain. A late Task line is proven on the product panel with held answers, not timed live. The renderer runs in Chrome, not the Electron shell. Neither changes the result.
- Residual risks: none material

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed. Mode: `Browser` on a live stack. Round 1 showed that only real Task data exposes the motion that matters.

## Persisted-Data Transition Checks

- `Not Affected`.

## Compatibility / Legacy Scope Check

- `No` compatibility scope. IR-002 restores the base's `v-show` and adds one scoped style; nothing remains of SR-001's `v-if` path.

## Durable Coverage Changed In The Codebase

| Path | Change | Cases |
| --- | --- | --- |
| `autobyteus-web/tests/e2e/run-expand-motion-live-cases.mjs` | Added (round 1). Round 2: the implementer's `v-show` edit (`b7fc37aa75`), reviewed; RXM-001 asserts the Task line in every frame and a Team expand with no slide; RXM-002 asserts the layout glide with no transform; RXM-003's first fold check expects hidden | API-03…API-05 |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs`, `autobyteus-web/package.json` | Registration and script `test:e2e:run-expand-motion-live` (round 1) | API-03…API-05 |
| `TESTING.md` | "Fresh-start build" section (round 1, `8602505f4e`) | API-06 |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Model provider | scripted AGY (`CALL_TOOL:` makes the agent call the real `delegate_task` / `update_task`) | No provider proof needed | — |
| Release runner | local fresh clone with the job's commands | Fresh-start proof | No signing secrets; macOS ARM64 only |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Probe stacks | Yes | removed by the probes | Done |
| Fresh clones (rounds 1 and 2, incl. unsigned dmg builds) | Yes | removed | Done |

## Preliminary Classification (On `Fail`)

N/A: this round passes. Round 1's classification is kept in the revision record.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: none. The feel of the motion is the user's to judge on the app, but every criterion is proven.
- Test-code review: `Not Required — direct low-risk route`
- Next recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - OBS-1 (not this ticket).
  - TESTING.md gained the "Fresh-start build" section in this ticket (`8602505f4e`). Delivery's docs sync should check it.
