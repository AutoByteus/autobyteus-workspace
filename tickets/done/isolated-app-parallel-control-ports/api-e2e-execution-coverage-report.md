# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/design-spec.md`
- Supplemental Task Artifacts: None
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: Implementation Complete (IR-001, SR-003) from `implementation_engineer`
- Prior Round Reviewed: None
- Latest Authoritative Round: 1

Code under test: superrepo `codex/isolated-app-parallel-control-ports` @ `affe11bdf`; `autobyteus_mcps` `codex/isolated-app-parallel-control-ports` @ `f400434`.

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Coverage investigation artifact: see Meta
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. One control case (CTRL-001) was added to explain the `forced` observation.
- Existing coverage decisions revised during execution: None
- Reroute required before or during execution: `No`

## Test-Case Ledger Reconciliation

- Ledger path: see Meta
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded when needed: `N/A` (the longest case, PRB-001, ran 67 s)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: 6 (DOC-001 Completed)
- Cases still running, interrupted, or not started: None

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| UT-001 | Pass | 1 Completed | console (51/51) | Pass |
| PRB-001 | Pass | 2 Completed | `api-e2e-evidence/prb-001-isolated-app-lifecycle-evidence.json` | Pass |
| LIVE-001 | Pass | 3 Completed | `api-e2e-evidence/live-001.log`, `live-001.sh` | Pass |
| LIVE-002 | Pass | 4 Completed | `api-e2e-evidence/live-002.log`, `live-002.sh` | Pass |
| CTRL-001 | Pass (control) | 5 Completed | `api-e2e-evidence/ctrl-001.log`, `ctrl-001.sh` | Non-blocking observation; out of scope |
| DOC-001 | Pass | 6 Completed | ledger + diffs | Pass |

(Evidence paths are relative to the ticket folder `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/`.)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. `DEFAULT_CONTROL_PORT` is removed, and there is no 9333 preference or fallback. Every observed auto pick was a non-9333 OS-assigned port.
- Approved persisted-data transition followed: `N/A` (`Not Affected`; record schema v1 unchanged)
- Durable coverage added or retained only for compatibility-only behavior: `No`

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / REQ / AC | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| UT-001 | BEH-001/002/003/007; AC-001 (policy), AC-003, AC-004 | `instanceLifecycle.start` port policy, CLI parser/usage | Node test runner (fake spawn/ports) | Durable | Pass | 51/51 |
| PRB-001 / LC-001 | REQ-002, QR-001 | Explicit port start, loopback-only CDP | Real CLI + packaged app | Durable | Pass | evidence JSON: listener `127.0.0.1:49685` |
| PRB-001 / LC-002 | REQ-002 / AC-003 (owned busy) | Busy message wording | Real CLI | Durable | Pass | `CONTROL_PORT_IN_USE`, exit 3, "…used by isolated instance iso-49685-8547; omit --control-port to use a free port, or pass another port", `details.instanceId` present |
| PRB-001 / LC-003 | REQ-003 / AC-004 | Restart keeps control port | Real CLI + app | Durable | Pass | Same id/ports/root, new tab id |
| PRB-001 / LC-004..LC-006 | Preserved lifecycle | stop/dead stop/refusals | Real CLI + app | Durable | Pass | evidence JSON |
| PRB-001 / LC-007 | REQ-001 / AC-002, QR-001 | 3 concurrent default starts | Real CLI processes + app | Durable | Pass | control 49999/49997/50001; server 50000/49998/50003; one `/renderer/index.html` window each; distinct tab ids; loopback-only held by own group; stop by id |
| LIVE-001 | REQ-001 / AC-001, AC-003 (foreign busy), SCN-001 | Default start with 9333 occupied; engineer attach journey | Real CLI + app + browser-automation attach-only | Live / Temporary | Pass | Explicit 9333 → `CONTROL_PORT_IN_USE` exit 3 ("already in use; omit --control-port…"). Default start → 50346 (`127.0.0.1` only, pid=pgid 88445). `list-tabs` → exactly 1 tab `/renderer/index.html#/agents`. Stop by id clean |
| LIVE-002 | REQ-001 / AC-002, SCN-002 | 3 concurrent default starts from 3 worktree cwds, shared registry | Real CLI + app + browser-automation | Live / Temporary | Pass | control 50496/50497/50498; server 50499/50500/50501; each `list-tabs` = 1 tab, distinct ids; each listener owned by its own leader; 3 stops by id; 0 records left |
| CTRL-001 | (diagnostic) | stop `forced` flag | Real CLI + app | Temporary | Pass | explicit path forced=true (10 s), auto path forced=false (9 s): timing-dependent, pre-existing |
| DOC-001 | REQ-004 / AC-005 | Docs/skills | Doc review + grep | Review | Pass | No 9333 in target docs/scripts; placeholders `<controlPort>`/`<instanceId>`; parallel-use sections |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm --dir autobyteus-web test:e2e:isolated-app --app /Applications/AutoByteus.app` | worktree root; probe TMPDIR `/tmp/abiso-NZ5WDR`; Node v22.23.1 | LC-001..LC-007 | Pass (67.8 s) | `api-e2e-evidence/prb-001-isolated-app-lifecycle-evidence.json` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | 97% | +27 | AC-001 (LIVE-001), AC-002 (LC-007 + LIVE-002), AC-003 (unit + LC-002 owned + LIVE-001 foreign), AC-004 (unit + LC-003), AC-005 (DOC-001) | Each live case ran once |
| Changed-boundary execution directness | 75% | 97% | +22 | The real CLI → real `selectListenerPort`/`isPortAvailable` → the real Electron `--remote-debugging-port` bind | Auto-pick exhaustion is only unit-proven (it is infeasible to exhaust real ports) |
| Cross-boundary integration realism and mock gap | 60% | 95% | +35 | No mocks: real packaged app and real browser-automation launcher attach | The installed 1.4.91-beta.6 app rather than a worktree build; the change is CLI-only and the app binary is unaffected |
| Environment, configuration, identity, and fixture fidelity | 75% | 95% | +20 | Concurrent separate CLI processes from 3 worktree cwds sharing one registry; a real foreign listener on 9333 | A private TMPDIR registry rather than the shared user registry (by design, to avoid touching other engineers' records) |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | +10 | Real owned/foreign busy explicit ports, restart, stop by id, dead stop, refusals | Pick-to-bind race not stress-tested (accepted residual, SR-002) |
| User-surface, browser, and desktop-shell confidence | 50% | 95% | +45 | The engineer journey via browser-automation attach-only `list-tabs` sees only its own window; the CDP listener is loopback-only | Renderer unchanged; no UI interaction needed |
| Durable regression coverage quality and relevance | 90% | 95% | +5 | LC-007 executed and passing; unit tests requirement-linked | — |

- Overall post-repository confidence: 72%
- Overall final confidence: 96% (simple average: 97+97+95+95+95+95+95 = 669 / 7 = 95.6%)
- Calculation method: simple average of the applicable categories
- Confidence change produced by broader validation: +24 points
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: the accepted pick-to-bind window (no collision observed in 6 concurrent real starts); macOS only (Linux not exercised).

## Broader Validation Decision And Execution

- Decision and selected mode: `Required`. CLI/Lifecycle against the real packaged desktop app, plus a live browser-automation attach.
- Material deviation: added CTRL-001 (diagnostic).
- Confidence gap addressed: the real OS pick and Electron bind, concurrency, and the attach-on-reported-port journey.
- Startup order and readiness: probe (self-managed) → LIVE-001 → LIVE-002 → CTRL-001. Readiness came from the CLI `start` (backend health plus main window on the control port) in every case.
- Environment choices: `--app /Applications/AutoByteus.app` (it carries `Contents/Resources/isolated-launch.json`), a private `TMPDIR` for each run, and the installed browser-automation launcher (`.claude/skills/browser-automation/scripts/browser`) in attach-only mode.
- Seed data / identities: none.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Hold 127.0.0.1:9333, `start --control-port 9333` | `CONTROL_PORT_IN_USE`, exit 3, nothing launched | As expected; the new wording | live-001.log | Pass |
| Hold 9333, `start` (no port) | Succeeds on another free port | `iso-50346-bf2c`, controlPort 50346 | live-001.log | Pass |
| `list-tabs` attach-only on 50346 | Only this instance's window | 1 tab, `/renderer/index.html#/agents`, matches `/json/list` | live-001.log | Pass |
| `stop iso-50346-bf2c` | Group gone, ports released, root removed | As expected | live-001.log | Pass |
| 3 concurrent starts from 3 worktree cwds | 3 distinct control ports, one window each | 50496/50497/50498; 1 tab each; distinct tab ids; each listener loopback-only and owned by its own leader | live-002.log | Pass |
| Production app during all runs | Untouched | Listener pid 38852 on :29695 before = after (probe assertion plus manual check) | evidence JSON, final check | Pass |

## Desktop Application Validation

- Validation approach executed: the repository packaged-app lifecycle probe and temporary live attach checks, as planned.
- Web-equivalent behavior: none changed.
- Shell-specific or lifecycle behavior and evidence: Electron binds `--remote-debugging-port=<picked>` on `127.0.0.1` only (lsof, 10 instances total), one process group per instance, stop by id.
- Effect on the already-running desktop application: `None`
- Behavior not directly proven: Linux; see Not Tested.

## Platform / Runtime Targets

- OS: macOS (Darwin 25.5.0), arm64
- Runtime: Node v22.23.1; pnpm (nvm node v22.21.1 bin); packaged AutoByteus 1.4.91-beta.6 (Electron)
- Browser engine: the Electron-embedded Chromium over CDP; browser-automation launcher from the `autobyteus_mcps` main checkout (code unchanged by this ticket)

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Restart keeps the control port: LC-003 Pass
- Version-specific runtime branch or compatibility fallback observed: `No`

## Tests Implemented Or Updated

None by API/E2E. The implementation's durable changes, which were executed here: `autobyteus-web/scripts/isolated-app/__tests__/instanceLifecycle.node-test.mjs`, `autobyteus-web/scripts/isolated-app/__tests__/cli.node-test.mjs`, `autobyteus-web/tests/e2e/isolated-app-lifecycle-probe.mjs` (LC-007 added; LC-002 updated). All pass.

## Tests Removed As Stale Or Obsolete

None by API/E2E.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round by API/E2E: `No`
- Paths added or updated: None
- Paths removed: None
- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route; no API/E2E test changes)

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/prb-001-isolated-app-lifecycle-evidence.json` | Probe evidence | Retained (ticket folder) | Moved from untracked `autobyteus-web/test-results/`, which was then removed |
| `api-e2e-evidence/live-001.{sh,log}`, `live-002.{sh,log}`, `ctrl-001.{sh,log}` | Temporary check scripts and output | Retained as evidence | Scripts are not durable tests |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `/tmp/abe2e/*.sh` (copied into `api-e2e-evidence/`) | AC-001 with 9333 held and a browser-automation attach; SCN-002 across worktree cwds; forced-stop control | Pass | `/tmp/abac*` private TMPDIRs removed; the originals in `/tmp/abe2e` are harmless scratch |
| Node `net` listener on 127.0.0.1:9333 | Occupy 9333 for AC-001 | Held during LIVE-001 | Killed; 9333 free afterwards |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| "Another program on 9333" | Node TCP listener | A real other-engineer instance was not running (the stale record `iso-9333-b35d` belongs to dead pid 16505) | None material. The busy check is port-level. |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | UT-001, PRB-001 (LC-001..LC-007), LIVE-001, LIVE-002, CTRL-001, DOC-001 | All ACs directly proven; no escalation trigger fired |
| Not Tested | Linux packaged run | macOS host only; low risk |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| 13 isolated instances (probe 7 starts, LIVE-001 1, LIVE-002 3, CTRL-001 2) | Created by this run | `stop <id>` (the probe's finally block also covers leftovers) | No `--autobyteus-isolated-instance` process remains |
| `/tmp/abiso-*`, `/tmp/abac1-*`, `/tmp/abac2-*`, `/tmp/abac3-*` | Created by this run | `rm -rf` | Gone |
| 9333 holder | Created by this run | kill | 9333 free |
| `autobyteus-web/test-results/` | Created by the probe run | Evidence moved to the ticket folder; directory removed | Worktree has no untracked output besides the ticket artifacts |
| Shared user registry `$TMPDIR/autobyteus-isolated-app` (stale `iso-9333-b35d` from another worktree) | Not owned | Untouched | Unchanged |
| Production AutoByteus (pid 38852) | User's | Untouched | Listener unchanged |

## Preliminary Classification

N/A — Pass.

## Recommended Recipient

`/delivery_engineer` (direct low-risk route; confirmed via `get_handoff_rules`).

## Evidence / Notes

- Non-blocking observation (pre-existing, out of scope): `stop` can report `forced: true` because the packaged app's graceful quit (~9–10 s) is at the 10 s `gracefulTimeoutMs` boundary. CTRL-001 shows this on the unchanged explicit-port path, while an auto-port stop in the same session was not forced. It does not affect port release or cleanup. A possible follow-up is to tune the grace timeout; that is outside this ticket.
- macOS ephemeral assignment is sequential (e.g. 50496/50497/50498), which gives concurrent pickers adjacent but distinct ports. This is consistent with the implementation's observation and ASM-003.
- Both repositories must be finalized together (superrepo → `origin/personal`, `autobyteus_mcps` → `origin/main`).

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 96%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required`, executed, Pass
- Critical acceptance criteria lacking direct proof: None
- Next recipient from `get_handoff_rules`: `/delivery_engineer`
