# Code Review Report — update-restart-reliability (autobyteus-339)

All ticket paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/update-restart-reliability/tickets/in-progress/update-restart-reliability/`.

> **Latest round: 3, Implementation Review of IR-002 (CRR-003), `Pass`.** It covers the revised D1 (SR-004, SR-005; ARCH-REV-003 `Pass`). Rounds 1 and 2 are kept below. § Round 3 and the Latest Authoritative Result supersede them.

## Round 3 — Implementation Review of IR-002 (CRR-003)

### Meta and scope

- Trigger: implementation engineer, IR-002 (code `591bf52551`; handoff and evidence `e0dc8fdf76`).
- Basis:
  - requirements SR-004: REQ-001 and DEC-002 revised to a 2 s grace, plus the new AC-008;
  - design SR-004 and SR-005, with AR-003 (last `preClose` hook) and AR-004 applied;
  - ARCH-REV-003 `Pass`.
- Review Scope: **`Full Re-Audit` of D1**. Evidence: D1's mechanism and interface are replaced. `SERVER_CLOSE_OPTIONS` is removed, and `installClientConnectionClose(app, options?)` adds `connection`, `request` and `upgrade` listeners plus a `preClose` hook in all four servers.
- D2 is **carried forward unchanged**: `git diff ddb03d0d0b 591bf52551 -- autobyteus-web/electron` is empty. IMP-02 to IMP-04 still apply.
- Files reviewed:
  - `src/shutdown/client-connection-close.ts` (new);
  - the four server files;
  - the removal of `server-close-options.ts` and its test;
  - `tests/unit/shutdown/client-connection-close.test.ts`, `tests/unit/compositions/studio-preclose-order.test.ts`;
  - `agent_execution.md`, `electron_packaging.md`, `docs/design-cases.md`.
- I reran no checks: IMP-08 to IMP-12 ran on `591bf52551`.

### Behavior and path (BEH-001, revised REQ-001, AC-001, AC-008)

**The hook's sequence** (`client-connection-close.ts`):
1. Connections are tracked on `connection`, removed on `close`, and dropped on `upgrade`.
2. A socket is marked "used" on `request`, and the requests in progress are counted until each `response` `close`.
3. At the hook start, `closing` is set, so new connections are destroyed on arrival.
4. Unused sockets are destroyed.
5. If any requests are in progress, it waits for the count to reach 0 or for `graceMs`.
6. Then `closeAllConnections()`.

**Fastify's order around it:** `closing = true` → `router.closeRoutes()`, so a new request gets 503 → `preClose` hooks in registration order → `server.close()` → `onClose` run cleanup. Because the hook is the last `preClose` hook (studio: after `registerGraphql`; standalone: after its static routes; the local servers: their only hook), `closeAllConnections()` directly precedes `server.close()`. A connection opened during an earlier slow hook is unused at the hook's start, so it is destroyed (AR-003 a).

**Edge cases checked, all correct:**
- A client that disconnects mid-request: `response` `close` fires and the count drops.
- A request on an idle keep-alive during the grace: it gets Fastify's 503, is counted and finishes quickly.
- Upgraded sockets: Node's `closeAllConnections` does not include them, and the WebSocket plugin's `preClose` has already closed its clients.
- No requests in progress: no wait at all.
- Installation always happens before `listen`, so no connection goes untracked.

**Long-lived HTTP streams** (the residual in the comment) were checked in source:
- Agent Tools MCP session streams are closed by `AgentToolsMcpHost.closeInternal` (`streams.closeAll()`) before its local server closes.
- The studio's MCP gateway GET (`mcp-gateway-routes.ts:119-124`, `sendGatewaySseCompatibilityResponse`) sends one comment and ends the response, so it is not long-lived.
- No studio route holds a response open. A busy shutdown therefore does not normally spend the grace.

**F-API-001 is resolved by design.** A `createAgentRun` in progress (54–175 ms) completes within the 2 s grace, with its response. This is the base build's guarantee, now without the stall. Validation re-proves it with AC-002 in API-02's shape. A handler longer than 2 s is cut: that residual is accepted in SR-004 and tracked as FU-004 (non-atomic `createAgentRun`, added by the Solution Designer).

### Candidate gate (round 3)

| Candidate ID | Observation | Disposition | Reason |
| --- | --- | --- | --- |
| CR-C7 | The hook must stay each app's last `preClose`, and nothing enforces that for future servers or hooks | Reject (as a finding) | The studio order is tested (IMP-09; it fails when the hook is installed early). The local servers have only this hook, and the standalone server installs it after its last registration. A general guard, such as an architecture test that every `fastify(` installs it, would be worth adding but is not required by the design. I noted it to the user in round 1, and it is not a finding. |
| CR-C8 | The order test wraps the `fastify` factory's `addHook` and labels hooks from the stack (implementer point) | Reject | It is test-only and keeps each hook's style and arity, which matters because Fastify dispatches callback and async hooks differently. The unbound wrapper keeps encapsulated contexts correct, and the test asserts that there are no child-context `preClose` hooks. The stack labels are coarse but adequate for three known owners. It is proportionate. |
| CR-C9 | A long-lived HTTP stream whose owner does not close it would spend the whole 2 s grace on every shutdown | Reject | No such route exists today (see the streams above). It is documented as an owner rule in the hook's comment and in `agent_execution.md`. |
| CR-C10 | A handler running longer than 2 s is still cut and can leave a prepared-only run | Reject | It is an accepted residual (SR-004 Risks), FU-004 tracks it, and the measured handlers are far shorter. |

### Structural re-audit for D1

- **Ownership:** each server's composition installs one shared owner of the close rule (Principle 13). There is no per-route abort logic.
- **Placement:** `src/shutdown` is correct.
- **Interface:** `installClientConnectionClose(app, { graceMs?, timers? })` has a single subject and injectable timers, and no generic selector.
- **Size:** 75 lines; the server files change by 1 to 3 lines each.
- **Clean-cut removal:** `SERVER_CLOSE_OPTIONS`, its file and its test are removed with no re-export. A search for `SERVER_CLOSE_OPTIONS|server-close-options|forceCloseConnections` across server src, tests, docs and the desktop finds nothing.
- **Tests:** 7 real-socket cases are tied to AC-001 and AC-008. Two mutation checks were run: the hook's body removed (5 fail) and an immediate cut (4 fail). The studio order test fails when the hook is installed early.
- **Docs:** they match the code, including the 503, the cut after the grace, and the stream-owner rule.
- **Scorecard:** round 1's scores stand (9.5 / 10). Category 8, Runtime Correctness, goes back from round 2's 8.8 to 9.3, since F-API-001 is resolved by design pending validation. No category is below 9.2.

### Findings (round 3)

None. F-API-001 (CRR-002) is resolved in the design and code, and AC-002 validates it at runtime.

### Follow-ups

None added. FU-004, added by the Solution Designer in SR-004 (non-atomic `createAgentRun` on any activation failure), and FU-003 stand.

> Round 2 (CRR-002, failure-origin, `Fail` → `Design Impact`) is kept below for history.

## Round 2 — Failure-Origin Review of F-API-001 (CRR-002)

### Meta

- Trigger: API/E2E engineer, API-REV-001 `Fail` (91.4%).
  - Code `ddb03d0d0b`, validated from a clean checkout of `2c3575b0f0`.
  - Reports and evidence `a0d9ca38f2`.
- Coverage investigation / execution report / API/E2E revision record: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` (API-REV-001).
- Project testing guideline: `TESTING.md` (Rule 9). The cause is established below; no conflicts.
- Failing scenario: SCN-002b, a client creates a run while the node stops (for example during an update restart), on top of AC-002's setup.
- Command: `env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" CASE_ID=<id> node evidence/P-001-live-server-probe.mjs held-connection <built autobyteus-server-ts> <out dir>`.
- Failure evidence: `evidence/API-02-result.json`, `evidence/API-02B-result.json`, `evidence/API-02B-server-first.log`, and `evidence/API-03-result.json` for the base contrast.

### Scenario basis

SCN-002b is a `Supported Normal Scenario`. A user (or the phone app, or a peer node through `prepareAgentRun` in `remote-delegation-receiver.ts:98`) creates a run while the node restarts for an update. That restart is unattended under autobyteus-285, so a user can't time around it.

The trigger is independent of the mechanism: `createAgentRun` is the UI's GraphQL mutation (`api/graphql/types/agent-run.ts`). The probe's six staggered requests reproduce that path; they don't establish it.

### Failure path (Read, then Reproduced by API/E2E)

1. `AgentRunService.createAgentRun` (`agent-run-service.ts:241-246`) runs `provisioningService.prepareAgentRun(input)` and then `activate(runId)`.
2. `prepareAgentRun` (`agent-run-provisioning-service.ts:73-114`) persists right away. `historyCatalogService.recordPreparedRun` writes metadata with `preparedAt` and `startedAt: null`, and the run is listed in history.
3. With D1, Fastify destroys the socket after `preClose` (`fastify.js:395-396`) and runs `onClose`, but it does not cancel the handler. The handler continues while the run cleanup closes activation admission.
4. If the cut lands between steps 1 and 2:
   - `activate` throws `AgentCreationError: AgentRun activation admission is closed for process shutdown.` (`cutHandlerLog`, once in API-02 and three times in API-02B);
   - `createAgentRun` has no rollback, so the prepared run stays (`afterRelaunch.onDisk[...].startedAt: null`);
   - after relaunch it is listed as `offline` with an empty summary.
5. If the cut lands after step 2: the run is created and activated, the shutdown then stops it, and the client never gets its run ID. A client retry creates a duplicate.
6. Nothing removes a prepared-only run later. `cleanupStalePreparedRuns` (`agent-run-provisioning-service.ts:128`) is called only from its own unit test, so the 24 h TTL is never enforced.

**Base contrast (API-03, `a977b2c1bc`):** `server.close()` waited, so all three in-flight creates completed with `success: true` and run IDs before `onClose`, and nothing was left over. That shutdown instead stalled to the 10 s bound and exited 1 (the FU-008 cause). So D1 together with DEC-002 makes this consequence reachable at shutdown. It is a regression of preserved behavior. Before, no partial runs were left and every create the server accepted completed.

### Origin

| Part | Origin | Evidence |
| --- | --- | --- |
| Partial runs and lost-response runs appear at shutdown | **This ticket's change** (D1 plus DEC-002): the cut handler now overlaps the cleanup | API-02 and API-02B versus API-03 |
| Why "admission is closed" did not guard it | **Design premise contradicted.** Design § Risks and ARCH-REV-001 P-001 / AR-002 say the run layer's admission closure is the guard, and that a late handler "fails or is cancelled the same way as one admitted during 284's bound window". AR-002 asked AC-002 to show the request "is refused or cancelled cleanly and leaves no partial run". The closure refuses activation, but `prepareAgentRun` has already persisted the run, and nothing rolls it back. | `createAgentRun` code; API-02 and API-02B |
| `createAgentRun` is not atomic on an activation failure | **Existing weakness** in run provisioning, which this ticket did not change. The same leftover follows any activation failure (Read only; non-shutdown failures were not reproduced). | `agent-run-service.ts:241-246` |
| `cleanupStalePreparedRuns` has no production caller | **Existing dead code** in an untouched file → follow-up FU-003 | Code search: the only caller is `tests/unit/agent-execution/agent-run-provisioning-service.test.ts:186` |
| The client never learns the ID of a run that completed | **Inherent to DEC-002's cut.** DEC-002 approved "no response"; it did not decide the side effects of a state-changing request whose response is lost (duplicates on retry). | API-02 (two completed runs) |

- **Not an implementation defect:** the code matches the design exactly (CRR-001).
- **Not a test problem:** the probe reproduces a supported scenario, through real GraphQL.
- **Review gap (mine):** in CRR-001 (CR-C1) I rejected the handler overlap as an accepted residual and relied on the admission premise. I did not trace a representative state-changing handler, such as `createAgentRun`, to see what persists before admission is checked. A source trace would have caught it.

### Classification and routing

- **`Design Impact`**, owned by the Solution Designer. The reviewed design's safety premise for DEC-002 is false. The design needs a mechanism, or an approved acceptance, for state-changing requests that are in flight at shutdown.
- The lost-response part (point 5) also needs a requirements decision: is a completed-but-unacknowledged run, and its duplicate on retry, acceptable under DEC-002? That is a `Requirement Gap` inside the same item, for the Solution Designer to put to the requirements owner or the user.
- **Directions observed (not prescribed; the designer decides):**
  - **a.** Make `createAgentRun` atomic: on a failed activation, `cancelPreparedAgentRun` the run it prepared. That removes the prepared-only leftovers on every path, but not the lost-response runs.
  - **b.** Refuse new state-changing work before the cut, for example by closing run admission in an early `preClose` hook. A handler already past `prepareAgentRun` would still need (a).
  - **c.** Let in-flight requests finish within a short grace and cut only connections that never sent a request. This keeps responses and avoids the lost-response runs, at the cost of tracking connections; it would replace part of D1's blunt cut.
  - **d.** Accept the residual explicitly: prepared-only runs are harmless and restorable, and duplicates come only on retry. That needs an approved DEC-002 extension.
- **Ticket scope:** the regression is this ticket's (it is introduced by D1). How far the fix reaches into `createAgentRun` (other functionality) is part of the design decision. A prerequisite is not needed: (a) is small and inside the run-provisioning owner.

### Follow-ups added

- FU-003: `cleanupStalePreparedRuns` is dead code in production; the prepared-run TTL is never enforced. If the Solution Designer's fix wires it in, FU-003 is absorbed.

## Review Round Meta

- Review Entry Point (round 1): `Implementation Review`
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

**Round 3 (CRR-003), authoritative:**

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (D1: `Full Re-Audit`; D2: carried forward unchanged)
- Supported Product Scenario Gate: `Pass` (SCN-001, SCN-002, SCN-002b, SCN-003)
- Material-Premise Gate: `Pass`. Round 2's contradicted premise P-001 is replaced: the grace keeps the base guarantee for requests in progress.
- Score Summary: 9.5 / 10; every category ≥ 9.2 (category 8 back to 9.3)
- Recommended Recipient: API/E2E engineer
- Notes:
  - Validated code: `591bf52551`.
  - Validation owes AC-002 in API-02's shape with the base contrast. It should show every in-flight `createAgentRun` answered with `success: true` and no prepared-only runs after relaunch, with exit 0 in ≤ 3 s.
  - It also owes AC-003 (≥ 40 busy quits) and AC-007.

**Round 2 (CRR-002), superseded:**

- Review Decision: `Fail` (failure-origin)
- Review Entry Point: `API/E2E Failure-Origin Review`
- Supported Product Scenario Gate: `Pass` (SCN-002b, a supported normal scenario through real GraphQL)
- Material-Premise Gate: `Fail`. The design and architecture-review premise P-001 ("admission closure guards the overlap; no partial run") is reclassified as contradicted.
- Score note: category 8, Runtime Correctness, goes from 9.3 to 8.8, because a preserved behavior regressed (no partial runs at shutdown). The other categories stand.
- Failure Origin: Design Impact (with a Requirement Gap part, DEC-002's side effects). The code matches the design. My round 1 review missed it.
- Recommended Recipient: Solution Designer
- Notes: everything else in API-REV-001 holds. AC-002 as written passed, AC-003 was 42/42 with 0 stalls, and AC-007 passed.

**Round 1 (CRR-001), superseded:**

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5 / 10; every category ≥ 9.2
- Failure Origin: N/A
- Recommended Recipient: API/E2E engineer
- Notes: reviewed code `ddb03d0d0b` on `codex/update-restart-reliability`. The implementer's two points were accepted: CR-C4 (the cast in the test) and CR-C2 (a browser-runtime-only failure with the server gone installs, per REQ-002).
