# Requirements Document — update-restart-reliability (autobyteus-339)

## Document Status
- Status: **Approved** (SR-002, 2026-10-31; REQ-001 and DEC-002 revised in SR-004 within the direction by the Solution Designer, the user informed).
- Current solution revision ID: `SR-004`.
- Package identifier: `update-restart-reliability`.
- Request / ticket: Task `autobyteus-339`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-31, a
  follow-up to autobyteus-284 (FU-007, FU-008), at the user's word: continue after the shutdown work.
- Requirements owner: Solution Designer. Date: 2026-10-31.
- Approved by and reference: **the user**, 2026-10-31. Shown the cause, the fix (close client connections at
  shutdown), DEC-001's options with recommendation A and the decisions DEC-002 to DEC-004, he answered: "Yeah, if you
  think your solution is reasonable, then let's do it." Recorded as DEC-001 = A, plus approval of REQ-001 to REQ-003.
- Behavior-defining supplements: `fu-007-options.md` (the FU-007 options; option A chosen, its fallback text refined in REQ-002/AC-005: the server cannot be started while its old process is unconfirmed, `baseServerManager.ts:86-87`).
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
| Clients of a node (desktop window, browser tab, phone, peer node) | Use the node | Their connections end at shutdown and reconnect after it | A request in progress finishes within 2 s; only a longer one is cut (DEC-002) |

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
  macOS unknown, U-2). It is not the unattended path; follow-up FU-001.
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
| REQ-001 | **Shutdown never waits on a client beyond a short grace.** When a server the node runs shuts down: a client connection that has not sent a request is closed at once, and an idle connection is closed; a request already in progress may finish within a short grace (2 s, DEC-002), and whatever is still running after that is cut. A busy shutdown therefore ends in its normal time and exits 0 whatever connections clients hold. This holds for desktop quit, Restart server, update install and SIGTERM/Docker stop | BEH-001 | Must | The cause of FU-008; it also blocks updates (FU-007). The grace keeps the guarantee the base build gave a request in progress (it completes with its response), which CRR-002 / F-API-001 showed cutting breaks | Reproduced: P-003 (an unused connection holds the close on the base); P-004 (destroying never-used connections and draining in-progress requests within a grace: close in 281 ms with the in-flight response delivered; a request outlasting a 500 ms grace is cut at 502 ms); P-002 ties the stall to such a connection | FU-008; DEC-002 (revised SR-004), DEC-004 |
| REQ-002 | **An update after an incomplete shutdown still installs when the server is confirmed gone** (DEC-001 = A): when the shutdown before "Install update and restart" is incomplete but the server process is confirmed gone, the update installs and the app restarts; the incomplete shutdown is logged (the existing "Application shutdown incomplete" report). When the server's exit is not confirmed (only possible if the process does not end within 2 s of a SIGKILL of its tree), today's behavior stays: no install, the existing error is shown (DEC-005) | BEH-002 | Must | Unattended updates (autobyteus-285) | N/A (our own control flow); the Docker path is the live precedent (DEL-14) | FU-007; DEC-001 |
| REQ-003 | **284 preserved.** Bound, sweep, interrupt-first, one server after relaunch, no `terminatedAt` on shutdown, continuity, idle quit speed | BEH-004 | Must | No regression | Proven in 284 | 284 |

## Acceptance Criteria
| ID | REQ | Trigger | Expected | Failure | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | A server with one client connection that never sends a request, and one idle keep-alive connection; close | Cleanup (`onClose`) starts within 1 s; close completes | Close waits (the base build waits ≥ 5 s) | Unit/integration from P-003 (fails on base) |
| AC-002 | REQ-001 | Real server, busy runs (Codex, Claude, Team, Org), a client holding an unused connection, an idle keep-alive connection, and `createAgentRun` requests in flight around SIGTERM (as API-02) | Exit 0 within the normal busy time (≤ 3 s); 0 survivors; every in-flight `createAgentRun` that reached the server completes with its response (the client gets the run ID); **no prepared-only run and no run the client was not told about** after relaunch; requests sent after the close began get 503 or a refused connection | Bound expires; exit 1; a prepared-only or unacknowledged run | Server-level live probe (API-02 shape) |
| AC-008 | REQ-001 | Deterministic: a server with a never-used connection, an idle keep-alive connection and a request in progress (300 ms), then close; and a request that outlasts the grace | The first close completes right after the request, which gets its response; the never-used and idle connections are closed; with a request outlasting the grace, close completes at the grace and the request is cut | Close waits for the unused connection, or cuts a request that would finish inside the grace | Unit/integration from P-004 |
| AC-003 | REQ-001 | Repeat busy desktop quits (P-002), at least 40 valid runs | 0 stalls (every `serverGoneMs` ≤ 5 s, exit 0); counts reported | Any stall | Isolated desktop app, P-002 loop |
| AC-004 | REQ-002 | "Install update and restart" when the stop was incomplete but the server's exit is confirmed | The install starts (`quitAndInstall`); the incomplete stop is logged | Error, no install | Electron main-process tests |
| AC-005 | REQ-002 | "Install update and restart" when the server's exit is not confirmed | No install; the existing "Failed to install update and restart" error is shown (today's behavior, DEC-005) | An install over a live old server | Electron main-process tests |
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
- Applicable: `No`. DEC-001 = A adds no UI (log only); the existing error stays for the rare unconfirmed case. Product design: `N/A`.

## Data Continuity And Acceptable Loss
- Persisted data affected: `No`.
- Acceptable loss: only a client request still running 2 s after the shutdown began is cut and gets no response (DEC-002, revised SR-004). With DEC-001 = A, an incomplete
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
| DEC-001 | What does "Install update and restart" do after an incomplete shutdown? | Unattended updates (285) need no human; today the app is left without its server | A install once the server is confirmed gone; B no install, restart the server, show a message; C retry the stop once, then A or B (`fu-007-options.md`) | **A**: one stuck runtime must not block an update when the server's tree is already gone; it matches the Docker update; data risk equals a force-quit, which restore handles; the "exit not confirmed" case falls back to B, so the app is never without its server | User | **Decided: A** (the user, 2026-10-31) |
| DEC-005 | In the rare case that the old server's exit cannot be confirmed, should the app restart its server or retry the stop later? | A new server cannot start while the old process is unconfirmed (`baseServerManager.ts:86-87`); a retry would also need the shutdown owner to forget a failed stop after the logger was closed | Keep today's error / add a retry | **Keep today's behavior.** It is only reachable when a process survives SIGKILL for 2 s, and adding a retry path for it would be machinery without a demonstrated need (DESIGN rule 1). This refines option A's fallback wording shown to the user ("restart the server"), which the code does not allow in that state | Solution Designer | Decided |
| DEC-002 | At shutdown, what happens to a client's request that is already in progress? | Cutting it leaves partial or unacknowledged state (CRR-002, F-API-001: prepared-only runs; completed runs whose client never got the ID, so a retry duplicates them, for example a peer node's delegation); waiting without a limit was the base build's flaw only for never-used connections | SR-001: cut at once (applied in IR-001; API-02/02B showed 1 and 3 prepared-only runs). Options from CRR-002: (a) make `createAgentRun` atomic; (b) close run admission before the cut; (c) let in-progress requests finish within a grace and close only never-used and idle connections; (d) accept the loss | **Revised in SR-004: (c), a 2 s grace.** It fixes the stall's real cause (connections that never sent a request) without changing the base build's guarantee for a request in progress, so it covers every state-changing handler, not only `createAgentRun`. The 2 s grace is long against measured handler times (`createAgentRun` 54–175 ms) and short against 284's 10 s bound. (a) is a separate, pre-existing atomicity gap on any activation failure (FU-004); (b) does not fix unacknowledged runs; (d) would accept duplicate work, which the update-and-resume goal rules out | Solution Designer (within the direction; the user informed) | Decided (revised SR-004) |
| DEC-003 | Add a bound for an accepted interrupt whose turn never ends (284's N-3), as FU-008 suggested? | It was a stall candidate | 0 occurrences in ~100 instrumented shutdowns; contained by 284's bound | **Not in this ticket** (DESIGN rule 1: no machinery without a demonstrated need); 284's N-3 stays a residual | Solution Designer | Decided |
| DEC-004 | Which servers does REQ-001 cover? | One rule, or only the one seen | The studio server (seen), the standalone application server (same shape, external clients), the local Agent Tools MCP and credential-proxy servers (clients are our own CLIs) | **All servers the node runs**, as one rule: the cost is one option each, and a later stall from the same cause is avoided | Solution Designer | Decided |

## Traceability
| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002, AC-003, AC-008 | SCN-001, SCN-002 |
| REQ-002 | UC-002 | BEH-002 | AC-004, AC-005, AC-006 | SCN-003 |
| REQ-003 | UC-001 | BEH-003, BEH-004 | AC-007 | SCN-004 |

## Readiness Check
- Content ready for approval: **Yes**.
- Approval recorded: **Yes** (the user, SR-002). Ready for design: **Yes**.
