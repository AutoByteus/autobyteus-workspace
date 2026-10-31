# Code Review Report — update-restart-reliability (autobyteus-339)

All ticket paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/update-restart-reliability/tickets/in-progress/update-restart-reliability/`.

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-002: REQ-001 to REQ-003, DEC-001 = A, DEC-002 to DEC-005)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (FU-008 reproduction; P-001 to P-003)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001 to SR-003)
- Design Spec Reviewed As Context: `design-spec.md` (SR-003; the user's approval of the design: Obtained)
- Supplemental Task Artifacts Reviewed As Context: `fu-007-options.md` (option A, behavior-defining); `follow-ups.md` (FU-001, FU-002); `evidence/P-003-fastify-silent-connection-close.*`
- Relevant Solution Revision IDs: SR-002 (approval), SR-003 (design)
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-001 `Pass`; AR-001, AR-002 non-blocking). It is untracked in the worktree and owned by the architecture reviewer.
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (untracked, same owner)
- Relevant Architecture Review Revision IDs: ARCH-REV-001
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Trigger: implementation engineer, IR-001 (code `ddb03d0d0b`; handoff and evidence `22bf2338a9`, `0a8888fcb2`)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence: Confirmed.
  - The code delta is small: about 30 production lines across two packages, inside existing owners.
  - The risk is `High` because the connection semantics at shutdown change for every client of every node: an in-flight request is cut (DEC-002).
  - The update install now goes ahead after an incomplete stop, which changes deployment and lifecycle behavior.

## Review Scope

- Changed implementation and behavior reviewed:
  - D1: `SERVER_CLOSE_OPTIONS` and its spread into the four Fastify constructions.
  - D2: `BaseServerManager.isServerProcessGone()`, `ApplicationShutdown.acceptIncompleteStopForInstall()` with its `failed` flag, `ElectronApplication.prepareForInstall()` and its two `AppUpdater` wirings.
  - The tests and the two doc sections.
- Files / areas reviewed: `git diff origin/personal...ddb03d0d0b` (source, tests, docs).
- Context read, unchanged:
  - Fastify 5.12.7 `fastify.js:385-430`, the close order: `closing = true`, then `closeRoutes`, then `preClose` hooks, then `closeAllConnections()`, then `server.close()` in the same tick, then `onClose`;
  - `ApplicationShutdown.quit`; `stopManagedBackend` / `stopServer` `finally`;
  - the design review's P-001 and P-002.
- Explicit exclusions:
  - AC-002 and AC-003 (live server and ≥ 40 desktop busy quits), which belong to API/E2E;
  - I reran no checks: IMP-01 to IMP-07 ran on `ddb03d0d0b`, and nothing they exercise has changed since.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes.
- Design-spec behavior map verified against the implementation: Yes (DS-001, DS-002).
- Design review report and round confirmed: ARCH-REV-001, `Pass`.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `ServerProcessShutdown.request` → `app.close()` → Fastify's internal close hook. It runs the `preClose` hooks (native drain, WebSocket close), then, because `forceCloseConnections === true` and Node has `closeAllConnections`, calls `server.closeAllConnections()` and then `server.close()` synchronously, then the `onClose` run cleanup. No accepted connection survives into `server.close()`, and no new connection can arrive between the two calls. `grep "fastify(" src` finds exactly the four constructions, and each spreads the constant first, with no later key overriding it. | — |
| BEH-002 | Confirmed | `AppUpdater.installUpdateAndRestart` → `prepareForInstall` → `ElectronApplication.prepareForInstall`: `await shutdown.stop()` (memoized). If it rejects, it checks `serverManager.isServerProcessGone()`. If that is false, it rethrows, which keeps today's error and no install (DEC-005). If true, it calls `acceptIncompleteStopForInstall()`, which needs `failed` (set in `stop()`'s catch before the rethrow, so it is already set when the await rejects) and sets `prepared`. `quitAndInstall` follows, and `quit()` returns early on `prepared`, so `will-quit` passes. The report "Application shutdown incomplete" and the logger flush are unchanged. `isServerProcessGone()` reads the fact `stopServer`'s `finally` maintains: `serverProcess` is cleared only when the child has exited, and otherwise `childExited` is checked. | — |
| BEH-003 | Confirmed (preserved) | The Docker starter, `update-run.mjs` and `node-update-routes.ts` are untouched. The update request answers 202 before the starter stops the server, so D1 does not cut it. | — |
| BEH-004 | Confirmed (preserved) | `ServerProcessShutdown`, the bound, the sweep and `stopManagedBackend` are untouched. The normal quit's failure rule (`app.exit(1)`) is untouched, because `acceptIncompleteStopForInstall` is called only from `prepareForInstall`. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, REQ-001, AC-001 to AC-003 | Operational | App/OS | Stop the node | Desktop quit, Restart server, update, SIGTERM, `docker stop` | Normal | DS-001 | Cleanup starts at once; exit 0 | P-002 (2 stalls in 78), P-003 | Supported Normal Scenario | Use |
| SCN-002 | BEH-001 | Operational | A client (browser engine) | A spare connection that is open but unused | Any node server | Normal | Silent connection held at close | No delay | P-002 d3 iter-16 | Supported Normal Scenario | Use |
| SCN-003 | BEH-002, REQ-002, AC-004 to AC-006 | User / System | User or the unattended update | Install an update | "Install update and restart" | Normal (the incomplete stop is a supported edge, 284 N-5) | DS-002 | DEC-001 = A; DEC-005 fallback | `fu-007-options.md`; 284 API-11R1, API-13 | Supported Normal Scenario | Use |
| SCN-004 | BEH-003 | Operational | Host operator | Docker update | `autobyteus-docker update` | Normal (preserved) | Unchanged | Unchanged | autobyteus-305 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CR-C1 | In-flight handlers keep running beside the `onClose` cleanup after their socket is cut | SCN-001; DEC-002; ARCH-REV-001 P-001 / AR-002 | A client request in flight at shutdown | Cut, then `onClose`; the run layer closes admission at its first cleanup step | Design review P-001; Fastify close order | Reject (as a finding) | — | It is an accepted residual (AR-002), documented in `agent_execution.md`, and AC-002 validates it with a state-changing request. No code is needed now. |
| CR-C2 | A stop that failed only in a non-server resource (the browser runtime), or because the 30 s deadline fired after the server had already exited, now installs | REQ-002 (the rule is "server process confirmed gone"); AR-001 | A browser-runtime cleanup failure during an install | The install proceeds and the failure stays logged | `prepareForInstall` code; REQ-002 text; the implementer's note | Reject | — | This matches the approved REQ-002 and DEC-001 = A, which equate it with a force-quit that restore handles. It is not a gap. |
| CR-C3 | The deadline fires while the server is still alive or being force-stopped | REQ-002 / DEC-005 | Slow cleanup at install | `isServerProcessGone()` is false (the child is not exited and `serverProcess` is kept), so it rethrows and today's error stands | `isServerProcessGone`; `stopServer` `finally` | Reject | — | It behaves correctly; nothing installs over a live server. |
| CR-C4 | `ElectronInstallPreparation.spec.ts` reaches the private `shutdown.quit` through a cast (implementer point 1) | Test contract | — | It tests the will-quit decision without starting Electron. The real `ApplicationShutdown` runs, and the `AppUpdater` double captures the real `prepareForInstall` wiring. | Spec file | Reject | — | Proportionate. The quit decision is `ApplicationShutdown.quit` itself, which `ApplicationShutdown.spec.ts` also covers directly. |
| CR-C5 | `server-close-options.test.ts` covers a plain app with the constant and the two local server classes, but not the studio and standalone application constructions individually | Design § Final File Responsibility ("one case per server construction where cheap") | — | The studio and standalone servers have expensive compositions. Their wiring is a one-line spread, verified by the grep, and the standalone integration test (IMP-07) and AC-002/003 exercise them. | Diff, grep, IMP-07 | Reject | — | Matches "where cheap". |
| CR-C6 | The new `newManager()` helper in `ServerForceStopTree.spec.ts` is not used by the first test, which still builds its manager inline | Test hygiene | — | Cosmetic | Diff | Reject | — | Not material; the owner may reuse the helper on a later touch. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | Missing Invariant, with two invariants, each enforced in its owner; no refactor needed, and none done. | None |
| Implementation matches behavior-defining supplemental artifacts | Pass | `fu-007-options.md` option A as refined by REQ-002 and DEC-005 (AR-001 wording). | None |
| Data-flow spine inventory clarity and preservation | Pass | DS-001 and DS-002 match the code, including the ★ points. | None |
| Ownership boundary preservation and clarity | Pass | The close rule is defined once. `BaseServerManager` owns "server gone", `ApplicationShutdown` owns `prepared`, and `ElectronApplication` owns the install sequence. `AppUpdater` does not inspect errors. | None |
| Off-spine concern clarity | Pass | The existing report is reused; there is no new log. | None |
| Existing capability/subsystem reuse | Pass | Fastify `forceCloseConnections`, `childExited` and the `prepareForInstall` hook are reused. | None |
| Reusable owned structures | Pass | One constant in `src/shutdown`, not four inline literals. | None |
| Shared-structure/data-model tightness | Pass | `as const` with a single field. | None |
| Repeated coordination ownership | Pass | The install rule lives in one place. | None |
| Empty indirection | Pass | `prepareForInstall` owns the decision, so it is not a pass-through. | None |
| Separation of concerns / file responsibility | Pass | Each change sits in its owner's file. | None |
| Ownership-driven dependency | Pass | The four servers depend on `shutdown/server-close-options.ts`, which imports nothing. `ElectronApplication` depends on its own composed collaborators. | None |
| Authoritative Boundary Rule | Pass | `prepared` is set only through `acceptIncompleteStopForInstall()`, which is guarded by `failed`. Nothing parses `ShutdownIncompleteError` text, and no callback passes into `ApplicationShutdown`. | None |
| File placement | Pass | `src/shutdown` already owns shutdown concerns. | None |
| Flat-vs-over-split layout | Pass | One new 12-line file. | None |
| Interface/API boundary clarity | Pass | The three new members have single subjects and no parameters, and each throws or returns explicitly. | None |
| Naming quality / one vocabulary | Pass | "Server process confirmed gone" matches the design's Terminology; `acceptIncompleteStopForInstall` says exactly what it does. | None |
| No unjustified duplication | Pass | — | None |
| Patch-on-patch complexity control | Pass | Additive and small. | None |
| Dead code removed in touched files | Pass | Nothing became dead. `ElectronApplication.stop()` stays for `main.ts`. | None |
| Test scenarios and assertions requirement-aligned | Pass | AC-001 uses real sockets, waits until the server has accepted both connections, and asserts that `preClose` still saw the client open. The test fails on Fastify defaults, 3 of 3. AC-004 to AC-006 run the real `ApplicationShutdown`; the accept-before-settle and accept-after-clean-stop cases throw. The real wedged server shows "incomplete" while `isServerProcessGone()` is true. | None |
| Test fixtures/helpers reusable and coherent | Pass | `holdClientConnections`, `timedClose`; CR-C6 is cosmetic. | None |
| No stale or compatibility-only tests | Pass | — | None |
| API/E2E readiness | Pass | The handoff names AC-002 (with AR-002's state-changing request) and AC-003 (≥ 40 desktop quits). | None |

## Source File Size And Structure Audit

| Source File | Before (base) | After | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/shutdown/server-close-options.ts` | new | 2 code lines (12 with comment) | Pass | Pass | Pass | Pass | Pass | None |
| `autobyteus-server-ts/src/compositions/build-studio-server.ts` | 453 | 455 | Pass | Pass | Pass | Pass | Pass | None |
| `autobyteus-server-ts/src/compositions/build-standalone-application-server.ts` | 48 | 50 | Pass | Pass | Pass | Pass | Pass | None |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-local-server.ts` | 111 | 113 | Pass | Pass | Pass | Pass | Pass | None |
| `autobyteus-server-ts/src/credential-proxy/credential-proxy-local-server.ts` | 50 | 51 | Pass | Pass | Pass | Pass | Pass | None |
| `autobyteus-web/electron/application/applicationShutdown.ts` | 29 | 38 | Pass | Pass | Pass | Pass | Pass | None |
| `autobyteus-web/electron/application/electronApplication.ts` | 392 | 403 | Pass | Pass | Pass | Pass | Pass | None |
| `autobyteus-web/electron/server/baseServerManager.ts` | 433 | 437 | Pass | Pass | Pass | Pass | Pass | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No setting to keep waiting for clients (rejected in the design). |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead code removed in the touched files and modules | Pass | — |
| Approved persisted-data transition decision followed | Pass | `Not Affected`. |
| No version-specific dual reads/writes or old-shape fallback | Pass | — |
| Transition mechanics match the design | Pass | N/A. |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done in the change.
- Files:
  - `agent_execution.md`: the close rule, the cut in-flight request and the handler overlap (AR-002);
  - `electron_packaging.md`: the install rule, and that a normal quit after an incomplete stop still ends with `app.exit(1)`.
- Both match the code.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-001 (in-flight request overlaps the cleanup) | Confirmed | — |
| P-002 (a stop that is incomplete through the sweep, with the server exited) | Confirmed | — |

No new premises.

## Review Scorecard (Mandatory)

- Overall score: 9.5 / 10 (simple average; for trend only)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | `Data-Flow Spine Inventory and Clarity` | 9.5 | Both spines are implemented as designed; the Fastify close order is verified in source | — | — |
| 2 | `Ownership Clarity and Boundary Encapsulation` | 9.6 | Each fact has one owner; `prepared` changes only through a guarded transition | — | — |
| 3 | `API / Interface / Query / Command Clarity` | 9.5 | Three tiny, single-subject members, with explicit throws | — | — |
| 4 | `Separation of Concerns and File Placement` | 9.5 | — | — | — |
| 5 | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.5 | One constant instead of four literals | — | — |
| 6 | `Naming Quality and Local Readability` | 9.4 | The names state the condition; the comments cite the cause | — | — |
| 7 | `API/E2E Readiness` | 9.4 | Deterministic AC-001 and AC-004 to AC-006 tests that fail on base | The live AC-002 and AC-003 are pending (validation-owned) | — |
| 8 | `Runtime Correctness And Behavioral Fidelity` | 9.3 | Close order, memoized-stop timing of `failed`, and `serverProcess` maintenance all verified | AR-002's overlap is an accepted residual | Validation: AC-002 with a mutation |
| 9 | `No Backward-Compatibility / No Legacy Retention` | 9.6 | — | — | — |
| 10 | `Cleanup Completeness` | 9.5 | — | CR-C6 is cosmetic | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None.
- A note for the record: autobyteus-284's FU-008 is explained here by a different cause. The cause is the unused client connection holding Fastify's close (Reproduced, P-002 and P-003). My leading candidate in 284's CRR-002/CR-C9, the Org gate draining before the member fence, was wrong. The investigation found the Org stage is not involved.

## Classification

N/A: the review passes.

## Recommended Recipient

- API/E2E engineer (primary pass rule); then an informational notice to the implementation engineer.

## Residual Risks

- These belong to validation:
  - AC-002, with a state-changing in-flight request (AR-002);
  - AC-003, ≥ 40 busy desktop quits, with counts.
- N-1 to N-4 as the handoff lists them, including N-3: it relies on Node's `closeAllConnections`, and IMP-01 guards against Fastify or Node drift.
- FU-001: install-on-quit after an incomplete stop; macOS behavior is U-2.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5 / 10; every category ≥ 9.2
- Failure Origin: N/A
- Recommended Recipient: API/E2E engineer
- Notes: reviewed code `ddb03d0d0b` on `codex/update-restart-reliability`. The implementer's two points were accepted: CR-C4 (the cast in the test) and CR-C2 (a browser-runtime-only failure with the server gone installs, per REQ-002).
