# Requirements Document — update-restart-reliability (autobyteus-339)

## Document Status
- Status: **Ready for Approval**. REQ-001, REQ-003 and DEC-002 to DEC-004 are within the direction (Solution
  Designer); **REQ-002 depends on DEC-001, which needs the user**.
- Current solution revision ID: `SR-001`.
- Package identifier: `update-restart-reliability`.
- Request / ticket: Task `autobyteus-339`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-31, a
  follow-up to autobyteus-284 (FU-007, FU-008), at the user's word: continue after the shutdown work.
- Requirements owner: Solution Designer. Date: 2026-10-31.
- Approved by and reference: pending (DEC-001).
- Behavior-defining supplements: `fu-007-options.md` (the FU-007 options for DEC-001).
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/update-restart-reliability`, branch
  `codex/update-restart-reliability`, base `origin/personal` @ `a977b2c1bc`, target `personal`.

## Problem And Desired Outcome
- **Problem.**
  - **FU-008.** Sometimes, during a busy desktop quit (2 in 78 measured), the server stops nothing for 10 s.
    autobyteus-284's bound and sweep then force everything to stop, and the server exits 1.
    - **Cause (reproduced):** the server stops its agents only after its HTTP server has closed. The HTTP server
      waits for every client connection. A connection that a client opened but never used (here the app window's
      browser engine) is not closed by the server, so it holds the whole shutdown.
    - It is not the Org stage that FU-008 suspected (investigation notes, FU-008 reproduction).
  - **FU-007.** After such an incomplete shutdown, "Install update and restart" on the desktop stops with an error, and
    the app stays open without its server. On Windows and Linux an install on quit is skipped too. The Docker node's
    in-place update (autobyteus-305) installs anyway in the same case.
- **Affected:** every unattended update restart (the user's decision of 2026-10-30, autobyteus-285); desktop users who
  quit or update with busy agents; any node whose clients (a browser tab, the phone app, a peer node) hold a connection
  when it stops.
- **Desired outcome:**
  - a shutdown never waits on a client's connection, so a busy quit, restart or update stop ends in its normal time,
    with exit 0;
  - an update is not blocked, and the app is never left without its server, after an incomplete shutdown (DEC-001).
- **Success:**
  - repeated busy desktop quits show no stall, and the counts are reported;
  - the deterministic reproduction passes;
  - the update-after-incomplete-shutdown behavior is the one the user chose, implemented and tested.

## Relevant Current And Desired Behavior
| ID | Kind | Scenarios | Current (evidence) | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001, SCN-002 | Server shutdown starts its run cleanup (Fastify `onClose`) only after the HTTP server has closed, and that waits for a client connection that never sent a request. 2 stalls in 78 busy desktop quits, each 10.7 s, exit 1 | No client connection delays the cleanup; a busy shutdown ends in its normal time (0.8–1.7 s measured) with exit 0 | 284's bound and sweep as the net | P-002, P-003 |
| BEH-002 | User | SCN-003 | Desktop "Install update and restart" after an incomplete shutdown shows "Failed to install update and restart"; no install; the app stays open without its server; the next quit is `app.exit(1)` | Per DEC-001 | A clean install unchanged | `fu-007-options.md` |
| BEH-003 | Operational | SCN-004 | The Docker in-place update continues after a forced stop of the old server and notes it | Unchanged | **Preserved** | `update-run.mjs:123-159`; autobyteus-305 DEL-14 |
| BEH-004 | Operational | SCN-001 | autobyteus-284: busy turns interrupted, 10 s bound, sweep, one server after relaunch, shutdown writes no `terminatedAt` | Unchanged | **Preserved** | 284 archive |

## Stakeholders, Actors, And Outcomes
| Actor | Goal | Required outcome | Constraint |
| --- | --- | --- | --- |
| The user | Updates install and busy agents continue, unattended | Shutdown is quick and complete; the update is not blocked | No human step (2026-10-30) |
| Clients of a node (desktop window, browser tab, phone, peer node) | Use the node | Their connections end at shutdown and reconnect after it | A request in flight at shutdown gets no response (DEC-002) |

## Scope Guardrail (Mandatory)
### In-Scope Use Cases
| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | Server shutdown while clients hold connections (desktop quit, Restart server, update install, SIGTERM/Docker stop) | SCN-001, SCN-002 |
| UC-002 | Desktop "Install update and restart" after an incomplete shutdown | SCN-003 |

### Out Of Scope
- The restart-and-resume record and the automatic resume (autobyteus-285 and later).
- The Docker in-place update's own stop and continue rules (BEH-003, preserved).
- Install-on-quit with a downloaded update after an incomplete shutdown (Windows/Linux skip it on a non-zero exit;
  macOS unknown, U-2). It is not the unattended path; it is recorded as a follow-up if DEC-001 = A.
- A bound on Terminate when a runtime accepts an interrupt but never ends its turn (284's N-3; DEC-003).
- Why the browser engine opens an unused connection (U-3).

### Non-Goals
- No new user setting; no new UI beyond what DEC-001 needs.

### Preserved Behavior Boundary
- BEH-003, BEH-004; idle quit speed (≈0.3 s); clean install unchanged; conversations and restore unchanged.

### Prerequisites
None.

### Review Authority
- A blocking finding must cite a REQ, AC or BEH ID here. A new product behavior is a `Requirement Gap` for the user.

## Requirements
| ID | Requirement | BEH | Priority | Rationale | Feasibility evidence | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | **Shutdown never waits on a client connection.** When a server the node runs shuts down, no client connection (unused, idle, or with a request in flight) delays its cleanup. A busy shutdown ends in its normal time and exits 0 whatever connections clients hold. This holds for desktop quit, Restart server, update install and SIGTERM/Docker stop | BEH-001 | Must | The cause of FU-008; it also blocks updates (FU-007) | Reproduced: P-003 shows that closing all connections at close lets cleanup start in 0–1 ms; P-002 ties the stall to such a connection (1/1 stall vs 0/59 clean) | FU-008; DEC-002, DEC-004 |
| REQ-002 | **An update after an incomplete shutdown** behaves as the user decides in DEC-001 (recommended A: install once the server and its tree are confirmed gone; otherwise do not install, restart the server and show the error, so the app is never left without its server) | BEH-002 | Must | Unattended updates (autobyteus-285) | N/A (our own control flow); the Docker path is the live precedent (DEL-14) | FU-007; DEC-001 |
| REQ-003 | **284 preserved.** Bound, sweep, interrupt-first, one server after relaunch, no `terminatedAt` on shutdown, continuity, idle quit speed | BEH-004 | Must | No regression | Proven in 284 | 284 |

## Acceptance Criteria
| ID | REQ | Trigger | Expected | Failure | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | A server with one client connection that never sends a request, and one idle keep-alive connection; close | Cleanup (`onClose`) starts within 1 s; close completes | Close waits (the base build waits ≥ 5 s) | Unit/integration from P-003 (fails on base) |
| AC-002 | REQ-001 | Real server, busy runs (Codex, Claude, Team, Org), a client holding an unused connection and a slow request in flight, SIGTERM | Exit 0 within the normal busy time (≤ 3 s); 0 survivors; the in-flight request is cut | Bound expires; exit 1 | Server-level live probe |
| AC-003 | REQ-001 | Repeat busy desktop quits (P-002), at least 40 valid runs | 0 stalls (every `serverGoneMs` ≤ 5 s, exit 0); counts reported | Any stall | Isolated desktop app, P-002 loop |
| AC-004 | REQ-002 (if A) | "Install update and restart" when the stop was incomplete but the server's exit is confirmed | The install starts (`quitAndInstall`); the incomplete stop is logged | Error, no install | Electron main-process tests |
| AC-005 | REQ-002 (if A) | "Install update and restart" when the server's exit is not confirmed | No install; the server is started again; the existing error is shown; the app works | App left without a server | Electron main-process tests |
| AC-006 | REQ-002 | A clean "Install update and restart" | Unchanged | — | Existing tests |
| AC-007 | REQ-003 | 284's suites and live checks | No regression | — | Unit/integration, the 284 probes |

## Relevant Scenarios And Journeys
| ID | Kind | Actor | Goal | Trigger | Steps | Outcome | Validity | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | App/OS | Stop the node | Desktop quit, Restart server, update install, SIGTERM, `docker stop` | Shutdown → connections closed → runs stopped → exit | Normal time, exit 0 | Supported Normal | P-002 |
| SCN-002 | Operational | A client | Use the node | A browser engine opens a spare connection | A connection open but unused at shutdown | No delay | Supported Normal (browser behavior; seen 2/78) | P-002 d3 iter-16 |
| SCN-003 | User / system | User or the unattended update | Install an update | "Install update and restart" | Stop → (incomplete) → DEC-001 | DEC-001 | Supported Normal | `fu-007-options.md` |
| SCN-004 | Operational | Host operator | Update a Docker node | `autobyteus-docker update` | Old server stopped (forced if needed) → new server | Unchanged | Supported Normal (preserved) | autobyteus-305 |

## UI, Interaction, And Experience Requirements
- Applicable: only if DEC-001 = B or C (a message). With A: no new UI (log only). Product design: `N/A`.

## Data Continuity And Acceptable Loss
- Persisted data affected: `No`.
- Acceptable loss: a client request in flight at shutdown gets no response (DEC-002). With DEC-001 = A, an incomplete
  shutdown before an install is treated like a force-quit; run restore already repairs that (torn memory-log ends;
  SQLite WAL).

## External Contracts And Dependencies
| Contract | Behavior | Evidence | Risk |
| --- | --- | --- | --- |
| Fastify 5.12.7 / Node `http.Server.close()` | `close()` waits for connections that never sent a request; `forceCloseConnections: true` closes them | P-003 (Node 22.23.1, Electron Node 24.19.0) | Version drift |
| electron-updater 6.8.9 | Install on quit is skipped on a non-zero exit (Windows/Linux) | `BaseUpdater.js:69-89` | macOS behavior unknown (U-2) |

## Assumptions
| ID | Assumption | Validation |
| --- | --- | --- |
| ASM-001 | Closing all connections at shutdown removes the stall | AC-001 to AC-003 |

## Decisions
| ID | Question | Why it matters | Options / evidence | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | What does "Install update and restart" do after an incomplete shutdown? | Unattended updates (285) need no human; today the app is left without its server | A install once the server is confirmed gone; B no install, restart the server, show a message; C retry the stop once, then A or B (`fu-007-options.md`) | **A**: one stuck runtime must not block an update when the server's tree is already gone; it matches the Docker update; data risk equals a force-quit, which restore handles; the "exit not confirmed" case falls back to B, so the app is never without its server | User | **Needs user** |
| DEC-002 | At shutdown, cut a client's in-flight request rather than wait for it? | Waiting has no limit per client | Wait (today, unbounded) / cut | **Cut.** The node is stopping, clients reconnect, and 284's bound already cuts long waits after 10 s, so waiting only delays the stop | Solution Designer | Decided |
| DEC-003 | Add a bound for an accepted interrupt whose turn never ends (284's N-3), as FU-008 suggested? | It was a stall candidate | 0 occurrences in ~100 instrumented shutdowns; contained by 284's bound | **Not in this ticket** (DESIGN rule 1: no machinery without a demonstrated need); 284's N-3 stays a residual | Solution Designer | Decided |
| DEC-004 | Which servers does REQ-001 cover? | One rule, or only the one seen | The studio server (seen), the standalone application server (same shape, external clients), the local Agent Tools MCP and credential-proxy servers (clients are our own CLIs) | **All servers the node runs**, as one rule: the cost is one option each, and a later stall from the same cause is avoided | Solution Designer | Decided |

## Traceability
| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002, AC-003 | SCN-001, SCN-002 |
| REQ-002 | UC-002 | BEH-002 | AC-004, AC-005, AC-006 | SCN-003 |
| REQ-003 | UC-001 | BEH-003, BEH-004 | AC-007 | SCN-004 |

## Readiness Check
- Content ready for approval: **Yes**. Remaining blocker: DEC-001 (user).
- Approval recorded: **No** (pending DEC-001).
