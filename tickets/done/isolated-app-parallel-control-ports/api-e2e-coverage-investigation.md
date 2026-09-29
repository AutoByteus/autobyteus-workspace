# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/requirements-doc.md` (Approved, basis SR-002)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/solution-revision-record.md`
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/design-spec.md` (SR-003)
- Supplemental Task Artifacts: None
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: Implementation Complete from `implementation_engineer` (IR-001, SR-003)
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

- REQ-001 / AC-001, AC-002: `start` without `--control-port` picks a free control port. It reports `controlPort`/`controlEndpoint`, succeeds while 9333 is occupied, and three concurrent starts get three distinct ports, each serving only its own window.
- REQ-002 / AC-003: explicit `--control-port` is honored exactly or fails `CONTROL_PORT_IN_USE` with nothing launched. The busy message now suggests omitting `--control-port`.
- REQ-003 / AC-004: `restart` keeps the control port.
- REQ-004 / AC-005: the skill, guide, packaging doc, README and external browser-automation SKILL.md use the reported `controlPort`/`instanceId` and show no hardcoded 9333.
- QR-001: control endpoint loopback-only.
- Design (SR-003): the policy lives in `instanceLifecycle.start` (`resolveControlPort` → `selectAutoControlPort`, ≤10 attempts using `selectListenerPort` + `isPortAvailable`). There is no 9333 fallback, and `launchPorts.mjs` is untouched. Escalation triggers: Electron not binding the chosen port on loopback, a collision seen between concurrent auto-port starts, or a consumer that depends on 9333.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 default control port | Changed | REQ-001, design DS-001 | Unit (scripted picker) + real packaged LC-007 + AC-001 temporary live check |
| BEH-002 explicit port / busy message | Preserved (message changed) | REQ-002 | Unit + real LC-001/LC-002 (explicit ports, new wording) |
| BEH-003 result fields | Preserved | REQ-001 | Unit + LC-001/LC-007 |
| BEH-007 restart keeps port | Preserved | REQ-003 | Unit + real LC-003 |
| BEH-006 docs/skill | Changed | REQ-004 | Doc review + grep |
| `DEFAULT_CONTROL_PORT` export | Removed | Design removal plan | Grep + unit import removed |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | Yes (CLI) | `isolated-app start` JSON result/port policy | Unit tests on `createInstanceLifecycle` / `parseArgs` with fake spawn | Real OS port picking + real Chromium bind on the picked port | CLI against the real packaged app |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | Yes (CDP attach) | Engineer attaches browser-automation on the reported port | None in repository | Whether the reported port serves exactly this instance's window | Live browser-automation `list-tabs` attach-only |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | Yes (indirect) | `--remote-debugging-port=<picked>` passed to Electron | Unit asserts args | Electron binding picked port loopback-only | Real packaged probe (LC-007 lsof) |
| Process / lifecycle | Yes | Concurrent starts, stop by id, restart keeps port | Unit (fake process) | Real process groups and concurrency | Real packaged probe LC-001..LC-007 |
| Persisted-data transition | No (`Not Affected`) | Record schema v1 unchanged | Unit | — | — |
| Worker / queue / distributed coordination | Partially (parallel CLI processes) | Concurrent separate CLI processes picking ports | Unit (sequential scripted) | Real concurrent race | LC-007 (3 concurrent CLI processes) |
| External integration | Yes (doc) | browser-automation SKILL.md line 36 | — | Doc wording | Doc review |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports` (commit `affe11bdf`); external `/Users/normy/autobyteus_org/autobyteus_mcps-isolated-app-parallel-control-ports` (commit `f400434`).
- Project type: Node ESM dev-tooling CLI (`autobyteus-web/scripts/isolated-app`) driving the packaged Electron AutoByteus app; Node built-in test runner.
- Project testing guideline path(s): `No project testing guideline found` (no `TESTING*.md` at the repository root or under `autobyteus-web`).
- Conflicting, missing, or unclear project instructions: none. The probe needs no `node_modules` because it uses only Node built-ins.
- Required environment variables or secrets available: `N/A`

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `package.json` (root) | Script `isolated-app` | `pnpm isolated-app <cmd>` = `node autobyteus-web/scripts/isolated-app/cli.mjs` |
| `autobyteus-web/package.json` | Script `test:e2e:isolated-app` | `node tests/e2e/isolated-app-lifecycle-probe.mjs [--app <path>]` |
| `autobyteus-web/tests/e2e/isolated-app-lifecycle-probe.mjs` header | Probe contract | Uses a probe-owned `TMPDIR` (own registry and roots) under `/tmp/abiso-*`, and asserts that the production listener on 29695 is unchanged. It writes evidence to `test-results/isolated-app-lifecycle/`. |
| `skills/autobyteus-isolated-app/SKILL.md`, `docs/isolated-app-instances.md` | Operator guidance | Attach-only browser-automation via `CHROME_REMOTE_DEBUGGING_PORT=<controlPort> BROWSER_AUTOMATION_ATTACH_ONLY=1` |
| `browser-automation/SKILL.md` (installed launcher `.claude/skills/browser-automation/scripts/browser`) | CDP client | `list-tabs` in attach-only mode never launches Chrome |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Packaged app `/Applications/AutoByteus.app` (1.4.91-beta.6, carries `isolated-launch.json`) | worktree `autobyteus-web` | Launched by the CLI under test (`--app`) | The production copy of the same app is running (pid 38852, :29695) and must not be touched | CLI readiness (window on CDP port) | `isolated-app stop <id>`; the probe's finally block also runs SIGKILL |
| 9333 holder (AC-001) | `/tmp` | Node `net` listener on 127.0.0.1:9333 (temporary) | 9333 was verified free before the run; stale record `iso-9333-b35d` in the shared registry belongs to a dead pid owned by another worktree and is left untouched | `lsof` | kill holder |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Isolated registry and data roots | Probe-owned `TMPDIR=/tmp/abiso-*`; the AC-001 check uses its own `TMPDIR=/tmp/abac1-*` | The shared user registry `$TMPDIR/autobyteus-isolated-app` is not written | Directories removed after the run |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected` (record schema v1 unchanged). No migration or direct-use evidence required beyond the unit tests reading records.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related REQ/AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `instanceLifecycle.node-test.mjs` default start | Auto port integer ≥1024, ≠29695, ≠serverPort, id/endpoint/args use it | REQ-001 | Still Valid (updated by implementation) | Diff | Run |
| `instanceLifecycle.node-test.mjs` busy-candidate / exhaustion / two distinct / server-port exclusion | Auto-pick policy | REQ-001 | Still Valid | Diff | Run |
| `instanceLifecycle.node-test.mjs` explicit 9444 free / busy | Explicit honored; `CONTROL_PORT_IN_USE`, new wording, nothing spawned | REQ-002 / AC-003 | Still Valid | Diff | Run |
| `instanceLifecycle.node-test.mjs` restart keeps ports | Restart | REQ-003 / AC-004 | Still Valid | Unchanged | Run |
| `cli.node-test.mjs` no default / usage | No 9333 in parser/usage | REQ-001, REQ-004 | Still Valid | Diff | Run |
| `electron-launch/__tests__/*` | `launchPorts` semantics | Design (unchanged) | Still Valid | Unchanged | Run (regression) |
| Probe LC-001..LC-006 | Explicit-port lifecycle, conflict (new wording), restart, stop, refusals | REQ-002, REQ-003, QR-001 | Still Valid (LC-002 updated) | Diff | Run real |
| Probe LC-007 | 3 concurrent default starts: distinct ports, one window each, loopback-only held by own group, stop by id | REQ-001 / AC-002, QR-001 | Still Valid (new) | Diff | Run real |

## Stale Or Obsolete Coverage Decisions

None identified beyond the 9333 assertions the implementation already replaced (see implementation handoff).

## Durable Coverage To Add / Update / Remove

- Add: none planned by API/E2E. The implementation already added LC-007 and the unit tests, and they map to AC-001..AC-004.
- Update: none planned. This is revisited if execution evidence shows a gap.
- Remove: none.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `node --test autobyteus-web/scripts/isolated-app/__tests__/*.node-test.mjs autobyteus-web/scripts/electron-launch/__tests__/*.node-test.mjs` | worktree root, Node v22.23.1 | Port policy (mocked process/ports), CLI parser/usage, `launchPorts` regression | Pass (51/51) | console |
| 2 | `pnpm --dir autobyteus-web test:e2e:isolated-app --app /Applications/AutoByteus.app` | worktree; probe-owned TMPDIR | LC-001..LC-007 real packaged | Pass (7/7) | `api-e2e-evidence/prb-001-isolated-app-lifecycle-evidence.json` (moved out of the untracked `autobyteus-web/test-results/`) |

## Test-Case Ledger Plan

- Ledger required: `Yes`. There are several independently meaningful real-process cases, and the long-running packaged-app probe carries interruption risk.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`

| Case ID | Case / Journey | REQ/AC | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Evidence Expected |
| --- | --- | --- | --- | --- | --- | --- |
| UT-001 | Unit suites | AC-001, AC-003, AC-004 | Lifecycle with mocked process/ports | `node --test …` | 1 | 51/51 pass |
| PRB-001 | Real packaged probe LC-001..LC-007 | AC-002, AC-003, AC-004, QR-001 | Real CLI processes + packaged Electron | `pnpm --dir autobyteus-web test:e2e:isolated-app --app /Applications/AutoByteus.app` | 2 | Evidence JSON, all scenarios pass |
| LIVE-001 | AC-001: 9333 held → default start succeeds elsewhere; browser-automation attach-only `list-tabs` on reported port shows only this instance's window; stop by id | AC-001, SCN-001 | Real CLI + packaged app + browser-automation launcher | temporary shell script | 3 | JSON results, list-tabs output, lsof |
| LIVE-002 | SCN-002 mirror: 3 default starts from 3 different worktree cwd shells (same CLI entry), each attached via browser-automation on its own port | AC-002, SCN-002 | Real CLI + browser-automation | temporary shell script | 4 | distinct ports, 1 tab each, distinct tab ids |
| DOC-001 | AC-005 doc review + grep | AC-005 | Docs | read + `grep 9333` | 5 | No hardcoded 9333 as the value to use |

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | Unit tests prove the policy for AC-001 (mock), AC-003 and AC-004 | AC-001 and AC-002 require a real packaged run; AC-005 needs doc review | PRB-001, LIVE-001/002, DOC-001 |
| Changed-boundary execution directness | 75% | `start` logic exercised directly | Real OS picker + Electron bind not exercised | Real probe |
| Cross-boundary integration realism and mock gap | 60% | — | Spawn, ports and readiness are all faked in the unit tests | Real probe + browser-automation attach |
| Environment, configuration, identity, and fixture fidelity | 75% | Node test runner deterministic | Real concurrency not exercised | LC-007 |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | Unit: exhaustion, busy candidate, busy explicit, restart | Real conflict wording and real restart port | LC-002/LC-003 |
| User-surface, browser, and desktop-shell confidence | 50% | — | CDP attach on the reported port is unproven | LIVE-001/002 |
| Durable regression coverage quality and relevance | 90% | Unit tests and LC-007 are requirement-linked | LC-007 not yet executed | PRB-001 |

- Overall post-repository confidence: 72% (simple average)
- Every critical acceptance criterion directly proven: `No` (AC-001, AC-002, AC-005 pending)
- Any applicable category below `90%`: `Yes`. All categories except durable regression coverage.
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: real Chromium bind on the picked port, real concurrent picking, and attach isolation.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `CLI` + `Lifecycle` against the real packaged desktop app (repository probe), plus live browser-automation attach (`Browser`, CDP attach-only).
- Specific confidence gap addressed: the real OS port pick, Electron binding it loopback-only, concurrent starts, and the engineer attach journey on the reported port.
- Why the selected mode can materially improve confidence: it exercises the exact production path with no mocks.
- Expected confidence after the selected validation: ≥95%
- Browser-specific decision and rationale: attach-only `list-tabs` through the real browser-automation launcher is the engineer journey in AC-001/SCN-001. The renderer UI itself did not change, so no UI interaction is needed.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron (packaged `/Applications/AutoByteus.app`, isolated-launch contract marker present).
- Instructions used: `skills/autobyteus-isolated-app/SKILL.md`, `docs/isolated-app-instances.md`, and the probe header.
- Web-equivalent behavior: none changed.
- Shell-specific or lifecycle behavior: the `--remote-debugging-port` bind and process groups, proven by the real probe.
- Chosen validation approach: the repository's packaged-app lifecycle probe plus temporary live attach checks. The CLI is the only changed code, so the installed packaged app (unchanged binary with the marker) is a faithful target, and no worktree build is required.
- Effect on already-running desktop application: `None`. The production app (pid 38852, :29695) is not stopped or reused; the probe asserts that its listener is unchanged, and isolated instances use their own data roots.

## Live Environment And Fixture Plan

- Startup order: probe (self-contained) → LIVE-001 (hold 9333, start, attach, stop) → LIVE-002 (3 cwd shells, start, attach, stop).
- Environment choices: a private `TMPDIR` per run so the shared user registry is not written, and `--app /Applications/AutoByteus.app`.
- Health/readiness: CLI `start` readiness; `/json/list`; the `list-tabs` JSON.
- Seed data: none.
- Evidence: probe evidence JSON; temporary check outputs saved under the ticket folder `api-e2e-evidence/`.
- Owned processes and temporary state to clean up: isolated instances (stop by id), the 9333 holder, and the private TMPDIRs.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| LIVE-001 | Shell script: node holder on 127.0.0.1:9333, `pnpm isolated-app start --app …`, browser-automation `list-tabs` attach-only, `stop <id>` | AC-001, SCN-001 | It depends on the external browser-automation repository/launcher and on holding a specific well-known port; LC-007 already durably covers the port policy |
| LIVE-002 | Shell script: 3 concurrent starts with cwd in 3 different worktrees | AC-002 / SCN-002 exact mirror | It depends on other worktrees existing on this host |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Linux packaged run | macOS host only | Low (same Node/Chromium semantics; the probe supports Linux) | None |

## Ambiguities Or Reroute Triggers

None at investigation time.

## Post-Execution Update

- The broader validation ran as planned (PRB-001, LIVE-001, LIVE-002, CTRL-001, DOC-001): all Pass. Final confidence is 96%; see the execution coverage report.
- No coverage-validity decision changed, and API/E2E made no durable coverage changes. LC-007 plus the unit tests remain the durable regression set.
- Escalation triggers checked: Electron bound every picked port on `127.0.0.1` only; no collision in 3+3 concurrent starts; no 9333 consumer found (both repos and `autobyteus-agents`). None fired.
- Non-blocking observation: `stop` sometimes reports `forced: true` because the packaged app's graceful quit (~9–10 s) is at the 10 s grace boundary. The CTRL-001 control run shows this on the unchanged explicit-port path too, so it is pre-existing and out of scope.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (completed)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Post-repository confidence: 72% → final 96%
- Broader validation decision: `Required` (executed; Pass)
- Reroute Required Before Validation Execution: `No`
