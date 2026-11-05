# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history across rounds.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-tree-vs-chooser/tickets/in-progress/workspace-tree-vs-chooser/` unless absolute.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- Revision record and current ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, after CRR-002 Pass (C-05 held for this stage's read budget)
- Prior round reviewed: none
- Deviations from the plan, and why:
  - API-07 (`projects-left-navigation-probe.mjs`) needed a probe change: PLN-08 still expected a Project with no run to be listed, which REQ-009 removes. Its second form (the Project listed live once a run is started by another client) showed OBS-1. PLN-08 now shows the view again to see it (r3 Pass).
  - Added API-10. `task-closure-tree-probe.mjs` and `team-status-live-probe.mjs` wait for two folder rows (Temp and the workspace), and Temp is listed only while it has a run. The fix was found by reading the code and verified with full runs: they now wait for their own folder.
  - API-08: three fixture probes failed for causes outside this ticket (Rule 9 baseline fixes, own commit `25769bc969`).
  - API-09 (real AGY probe) was not run; see Not Tested.
- Evidence folder: `evidence/api-e2e/`

## Routing Classification

- Task size `Large`; architectural risk `High`; input route `Reviewed` (ARCH-REV-004, CRR-002); successful-output route `Code Review` (test-code review); test-code review `Required — Large/High`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | code `a5fc23849e` / `0d3c31c4ae` / `71ce23ced8` (head `c764619bd2`, documents only after it), with this round's probe changes (`450fe43929`, `25769bc969`) | macOS (Darwin 25.5.0), 10 CPUs, Node v22.23.1 | `autobyteus-server-ts/dist/app.js` rebuilt from this worktree for the round (`/tmp/wtvc-385/server-build-current.log`, exit 0) | Clean env (`env -i PATH HOME USER TMPDIR LANG`); probe-owned data roots, HOMEs, SQLite and ports, removed after each run |
| ENV-2 | base `3ef5e33eec` (`origin/personal`, the branch's base) | same | a temporary detached worktree `wtvc-385-base`, `pnpm install --frozen-lockfile`, server prebuild and build (exit 0); removed after the run | Same seed copy as ENV-1 |
| ENV-3 | as ENV-1 | same | Browser stacks: headless Chrome → Nuxt dev → ENV-1 `dist/app.js`, scripted AGY (`agy-failure-cli.mjs`), no inference, no credentials. WVC-004 adds a phone context paired through Phone Access, routed to the probe backend | Machine load average 65–96 from other work (a VM at ~115 % CPU); timings recorded with the load |

## Cases

| Case ID | Criteria | Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-007 (suites) | server, web | Reused: IMP-01, IMP-02, IMP-03 at `0d3c31c4ae`; IMP-09, IMP-10 at `71ce23ced8` | — | Pass | `evidence/implementation/IMP-01-server-unit.log`, `IMP-02…`, `IMP-03…`, `IMP-09-web-suite.log`, `IMP-10-web-typecheck-guards.log` | (implementation rows) | `git diff --name-only 71ce23ced8 HEAD` outside `tickets/`: empty; server: no change after `0d3c31c4ae`. Merge and clean clone are delivery's |
| API-02 | Design Risks (250 ms budget), C-05; DS-002, DS-005; REQ-008 | server GraphQL over HTTP | `node autobyteus-web/tests/e2e/run-history-read-budget-probe.mjs --seed-to <dir>`; then `--from-seed <dir> --stack-root <base worktree> --label base --output-dir …/API-RB-base`; then `--from-seed <dir> --label current --compare-with …/API-RB-base/evidence.json --output-dir …/API-RB-current` | ENV-1, ENV-2 | Pass | `evidence/api-e2e/API-RB-seed.manifest.json`, `API-RB-seed-evidence.json`, `API-RB-base/evidence.json`, `API-RB-base.log`, `API-RB-current/evidence.json`, `API-RB-current.log` | Seed `{"agentRuns":40,"teamRuns":200,"orgRuns":10,"teamMembers":5,"perAgent":{"main":20,"side":12,"third":8}}`. Current: window `null` poll p50 143.1 / p95 151.2 / max 160.1 ms; window 6 p50 140.9 / p95 148.9 ms. Base window 6 p50 50.7 / p95 57.6 ms. RB-C1…C4, RB-B1…B3 `Pass` | 40 samples per window, the two queries in parallel as the app sends them; ~0.89 MB per poll. No `RUN_LAST_ACTIVITY` warning in the backend log |
| API-03 | AC-012, VIS-017, DEC-010, REQ-009 | browser | `pnpm -C autobyteus-web test:e2e:workspace-views-chooser --output-dir <fresh>` (WVC-001) | ENV-3 | Pass | `evidence/api-e2e/API-WVC-r1/delegated-launch-defaults-evidence.json` (`cases.WVC-001`), `WVC-001-*.png` | `rootsWithDraft` without the lifecycle folder; listed after the send; `rootsAfter` without it and with the Team-only and Org-only folders; `chooserAfter` includes it | Draft held across one 5 s poll before sending |
| API-04 | AC-002, AC-005, CR-001; REQ-002, REQ-004 | browser | WVC-002 | ENV-3 | Pass | `API-WVC-r1/…evidence.json` (`cases.WVC-002`), `WVC-002-removed-chip-temp.png`, `WVC-002-runs-view-keeps-runs.png`, `WVC-002-remove-refused.png` | `chipAfter` "Temp…"; `rootsAfterPoll` without the removed folder; its Agent, Team and Org runs in the Runs view and the history; `keep.txt` kept; refusal toast and the busy folder still registered and listed | The removed folder had a stopped Agent, Team and Org run (SCN-D2) |
| API-05 | AC-009, AC-011, REQ-008; DS-002, DS-007 | browser | WVC-003 | ENV-3 | Pass (r2; r1 Fail in the case code) | `API-WVC-r2/…evidence.json` (`cases.WVC-003`), `WVC-003-*.png`; r1: `API-WVC-r1/WVC-003-failure.png` | `readsToWorkspaces` `[6,6]`; back to Runs `null`; `olderBefore` = `olderAfter` = listed − 5; `missingAfterRoundTrip` `[]`; `titleAfterReload` "Runs"; refusal "Stop running runs first." with nothing archived; then 5 runs left, the newest 5 | r1: the case expected exactly 6 tree rows; the tree also showed the running run, which the app holds live once the Runs view's read found it (any run with a live context shows in the tree). Case corrected; not a product defect |
| API-06 | DS-002, design Risks (phone and desktop) | browser + phone | WVC-004 | ENV-3 | Pass (r2; r1 Fail in the case code) | `API-WVC-r2/…evidence.json` (`cases.WVC-004`), `WVC-004-phone-choose-work.png` | `desktopReads` `[null]`, `phoneReads` `[5]`, `desktopReadsAfterPhone` `[null]` | r1 counted the page's first read (stored view Workspaces, 6) before the switch to Runs |
| API-07 | AC-009, AC-012, AC-014 (Projects view); 347/353 preserved | browser | `pnpm -C autobyteus-web test:e2e:projects-left-navigation --output-dir <fresh>` | ENV-3 | Pass (r3; r1, r2 Fail on PLN-08) | `API-PLN-r3/evidence.json`, `API-PLN-r3/run.log`, `API-PLN-r3/PLN-*.png`; r1, r2: `API-PLN-r1/`, `API-PLN-r2/` | PLN-01…PLN-10 `Pass`; PLN-08 `lateProjectUnlistedWithoutRun: true`, `liveInSamePage: true`, `lateProjectListed: true` | r1: PLN-08 expected a run-less Project listed (stale against REQ-009). r2: OBS-1 |
| API-08 | Preserved: the trees' rows (fixture pages changed by this ticket) | browser, fixture pages | `node autobyteus-web/tests/e2e/<name>-probe.mjs --output-dir <fresh>` for agent-org-task-team-disclosure, background-agent-renderer-contention, standalone-agent-error-stop, task-agent-sibling-sidebar, team-activity-presentation | ENV-3 (no backend) | Pass (r2; r1: 2 Pass, 3 Fail for baseline causes) | `API-FIX-r2/*-evidence.json` (the three fixed), `API-FIX-r1/*` (all five, r1) | each `"result"` passed; r1 `failures[0].message` for the three | Baseline fixes in `25769bc969`; see Baseline Fixes |
| API-10 | Preserved: the trees' rows under REQ-009 (Temp listed only with a run) | browser | `node autobyteus-web/tests/e2e/task-closure-tree-probe.mjs --output-dir <fresh>`; `team-status-live-probe.mjs` likewise | ENV-3 | Pass | `API-TREE/task-closure-tree-evidence.json` (BR-001…BR-016), `API-TREE/team-status-live-evidence.json` (TS-001…TS-007), logs | 16/16 and 7/7 `Pass`; cleanup `dataRootRemoved: true` | Their wait for two folder rows now waits for their own folder |
| API-09 | — | browser, real AGY | `agy-process-restart-focus-continuation-probe.mjs` | — | Not Tested | — | — | See Not Tested |

### Baseline Fixes (Rule 9; commit `25769bc969`)

| Test | Cause | Fix |
| --- | --- | --- |
| `agent-org-task-team-disclosure-probe.mjs` | The fixture's Team copies had no `source`. Since `7d689455ad`, `agentOrgHistoryRows.coordinatorFor` reads a copy's coordinator there, so the page crashed ("Cannot read properties of undefined (reading 'coordinatorAddress')"). It also did not answer `/ws/update-notifications` | Fixture records each copy's source; the probe answers the feed |
| `background-agent-renderer-contention-probe.mjs` | `/ws/update-notifications` (opened app-wide since autobyteus-210) refused: console errors | Answered by the probe, as `task-agent-sibling-sidebar-probe.mjs` already does |
| `standalone-agent-error-stop-probe.mjs` | Its API server has neither `/ws/agent-package-definitions` nor `/ws/update-notifications` (404) | Both answered by the probe |

### Observations

- **OBS-1 (FU-004).** The Projects view re-reads a Project on `connected`, on a Project change, after this window's own run actions, and when the view is shown (autobyteus-353 REQ-003, unchanged here). With REQ-009, if another client (another window, the phone, the API) starts a Project's first run, an open Projects view does not list that Project until one of those happens. Seen in PLN-08 r2: not listed within 60 s. Showing the view again lists it (PLN-08 r3). Before this ticket the Project was listed and only its new run's row waited. A run started from this window lists its Project at once (PLN-02, WVC-001). Recorded as FU-004 (new behavior; not required by AC-012, which covers the window that sends the message).
- **The read cost.** The poll read with `lastActivityAt` takes ~141–143 ms on the shaped set, against ~51 ms on the base. That is +90 ms (p50) and +91 ms (p95), within both budgets. The cost is about the same in every view: the Workspaces view's capped read also computes `lastActivityAt` for every Team and Org root, which dominate this set. So the extra ~90 ms recurs on every 5 s poll whenever the run section is mounted, not only in the Runs view. The design accepted this ("though with `lastActivityAt` for the runs they read"). The measurements were taken at a load average of ~70 on 10 CPUs, so the absolute numbers are pessimistic. The user's current data is far smaller (E-022: 56 listed runs).
- **The tree beside the window.** After the Runs view's read finds a running run beyond the newest 6, the Workspaces tree shows it next to the newest 6, because the app holds it live (WVC-003). A running run stays visible; this matches how the tree shows any run with a live context.
- **The read on every view change.** It shows as `readsToWorkspaces` `[6,6]`: the view change's read and a poll. This is C-04 (accepted).

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result |
| --- | --- | --- | --- |
| AC-002 | Yes | API-04 (each run kind; chip → Temp; files and history kept), API-01, IMP-20 (VIS-007…009) | Proven |
| AC-005 | Yes | API-04 (refusal toast, registry unchanged, still listed) | Proven |
| AC-007 | Yes | API-01 (suites); merge to `personal` and clean clone are delivery's | Suites proven |
| AC-009 | Yes | API-05 (menu round trip, reload keeps Runs), API-07 (PLN-01 remembered on reload, PLN-10 keyboard, narrow, zh-CN), IMP-20 (VIS-011, VIS-013) | Proven |
| AC-010 | Yes | IMP-20 (VIS-001: no remove button), API-01 (specs) | Proven (reused) |
| AC-011 | Yes | API-05 (Show older counts every run; nothing missing after the round trip), API-02 (the read's content), IMP-20 (VIS-003) | Proven |
| AC-012 | Yes | API-03 (draft not listed; first send lists it; archive unlists it; Team-only and Org-only folders listed; chooser keeps it), API-07 (PLN-01, PLN-02, PLN-08: Projects) | Proven (OBS-1 for runs started by another client) |
| AC-013 | Yes | IMP-20 (VIS-001), API-01 | Proven (reused) |
| AC-014 | Yes | API-07 (PLN-01 "No Project has a run yet"), IMP-20 (VIS-014…016) | Proven |
| Design Risks: 250 ms budget | Yes | API-02 | Within budget |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 80% | 95% | API-01…API-07 | AC-010, AC-013 rest on specs and IMP-20 (static UI) | — |
| Changed-boundary directness | 75% | 95% | Real GraphQL over HTTP on a 250-run data root, base comparison; real browser, server, polls, the phone page | — | — |
| Integration realism and mock gap | 70% | 90% | Scripted runtime over real tools and streams; data created only through public APIs | No provider model (not needed); OBS-1 found only through another client | — |
| Environment and fixture fidelity | 80% | 90% | Fresh builds of this worktree and of the base; probe-owned stacks | Timings under load ~70 | A quiet machine for the absolute numbers |
| Failure, edge-case, lifecycle | 70% | 95% | Remove refused while running; archive-older refused then done; draft never sent; window shrink; restart (PLN-08) | — | — |
| User surface | 75% | 90% | Desktop views, chooser, phone; Projects; zh-CN and narrow (PLN-10) | Electron shell not run (no shell change) | — |
| Durable coverage | 75% | 95% | Budget probe, WVC-001…004, PLN-08 and two tree probes updated, three baseline fixes | API-09 not run | — |

- Overall post-repository: 75%; overall final: 93%; simple average
- Every critical AC directly proven: `Yes`
- Any final category below `90%`: `No`
- 95% target met: `No` (93%). The gaps: timings were taken under load; OBS-1 (FU-004); the real-AGY probe was not run; AC-010 and AC-013 rest on reused evidence. Closing them needs a quiet machine and real AGY inference, or new behavior (FU-004)
- Residual risks: OBS-1; the poll's ~90 ms extra server time in every view; API-09 not run

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed. Mode: `Browser` plus server GraphQL over HTTP on a shaped data root. Web specs mock the reads, so the read cost, the window on the wire, the shrink across real polls, and Remove against the real guard all needed the stack. The stack also found OBS-1 and the probe drift.

## Persisted-Data Transition Checks

- `Not Affected`. Nothing new is stored. The read is derived from existing memory files. The base build read the seed that this build created (and the reverse) without errors.

## Compatibility / Legacy Scope Check

- Upstream, implementation and coverage: `No` compatibility scope. `limitPerAgent` keeps its default of 6 (RB-C2 uses the explicit 6; the base build answers the same query).

## Durable Coverage Changed In The Codebase

| Path | Change | Cases |
| --- | --- | --- |
| `autobyteus-web/tests/e2e/run-history-read-budget-probe.mjs` | Added; script `test:e2e:run-history-read-budget` | API-02 |
| `autobyteus-web/tests/e2e/workspace-views-chooser-cases.mjs` | Added (WVC-001…004); registered opt-in in `delegated-launch-defaults-probe.mjs`; script `test:e2e:workspace-views-chooser` | API-03…API-06 |
| `autobyteus-web/tests/e2e/projects-left-navigation-probe.mjs` | PLN-08 follows REQ-009 and the Projects refresh rule | API-07 |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs`, `team-status-live-probe.mjs` | Wait for their own folder row | API-10 |
| `agent-org-task-team-disclosure-probe.mjs` (+ fixture page), `background-agent-renderer-contention-probe.mjs`, `standalone-agent-error-stop-probe.mjs` | Baseline fixes (`25769bc969`) | API-08 |

Commits: `25769bc969` (baseline fixes), `450fe43929` (this ticket's coverage).

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Model providers | scripted AGY CLI | No provider proof needed: views, reads and removal do not depend on the model | — |
| A phone on the network | Phone Access pairing with a private-network URL routed by Playwright to the probe backend | The phone page reads through its own catalog | Network emulation only, as in LRL-004 |
| App-wide change feeds in fixture probes | Playwright WebSocket routes | Fixture pages have no backend | — |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Base worktree `wtvc-385-base` (detached at `3ef5e33eec`) | Yes | `git worktree remove --force`, `git worktree prune` | Done |
| Seed `/tmp/wtvc-385/seed` (40/200/10 runs) | Yes | removed after the measurements | Done |
| Probe stacks, data roots, HOMEs, Nuxt, Chrome | Yes | removed by each probe (cleanup receipts in their evidence) | Done; no probe process left |
| Raw outputs in `/tmp/wtvc-385/` | Yes | kept for this round; the ticket keeps copies | — |

## Not Tested / Residual

| Behavior | Reason | Risk |
| --- | --- | --- |
| `agy-process-restart-focus-continuation-probe.mjs` (API-09) | It needs real AGY inference with the host login and the real `HOME` (TESTING.md known gap), which adds conversations to the user's `agy` history. The ticket changed only how it finds the folder row, which is listed by its Team and Org runs, the case WVC-001 proves | Low |
| Other probes that click a folder row (`project-manager-ux`, `composer-context-file-removal`, `owner-scoped-file-reads`, `delegated-team-default-collapse`, `delegated-copies-large-hub`) | Read, not run: each clicks the `workspace` folder after creating runs there, so REQ-009 keeps it listed | Low |
| Electron shell | No shell change; browser layer only | Low |

## Preliminary Classification (On `Fail`)

N/A: this round passes.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: none. AC-007's merge and clean clone belong to delivery.
- Test-code review: `Required — Large/High`
- Next recipient: `/software_engineering_team/code_reviewer`
- Notes: OBS-1 (FU-004), FU-005 (a note for FU-001: probes use `createAgentRun`); read budget within limits with +~90 ms per poll in every view.
