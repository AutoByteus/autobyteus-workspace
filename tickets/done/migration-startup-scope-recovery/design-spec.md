# Design Spec — DS-001: nonterminal long startup

## Solution And Approval Basis
Package MIGRATION-STARTUP-20260915-001, SR-010. This complete design covers the current timeout-only ticket. M1 labels below are retained spine identifiers, not a remaining multi-milestone ticket. Status **Ready for independent review; not implemented**. Requirements authority is requirements-doc.md SR010: explicit approval after timeout-first proposal, followed by deferral of scanner and local repair to possible later tickets. Neither is in current scope. No Product design requested; reuse current loading surfaces.
Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery, branch codex/migration-startup-scope-recovery. Pinned base origin/requirements/flat-agent-organization-model at3f853c7626851cb5d89178965534401e9e4aa5e4; eventual same unreleased feature branch, never personal. No finalization authorization.
Canonical investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/tickets/in-progress/migration-startup-scope-recovery/investigation-notes.md, INV003/008/009.

## Current-State Read
Electron owns a child backend, polls its health, and exposes its lifecycle through ServerStatusManager → existing server-status IPC → Pinia → loading UI. Backend migrations happen before health readiness. The100s wait currently removes polling/listeners and terminally settles the generation, although it neither kills the child nor stops migration. Logs show backend readiness later. This is an elapsed-time classification bug, not proof of a failed essential backend prerequisite.

## Task Size And Architectural Risk
**M1 task_size: Small; architectural_risk: High.** Four existing production files, colocated/related tests and maintained docs. High because error-versus-pending startup settlement and process-lifecycle ownership change; a small diff must not bypass the configured high-risk review route. Data volume does not drive M1 size. No migration persistence delta in M1. Escalate if implementation requires backend protocol, readiness gate, new process-management subsystem or data changes. Any future scanner ticket needs its own approved requirements/design/classification.

## Architecture Investigation Evidence
INV003/008: actual100s Electron error precedes FAILED8 warning and eventual29695 listener. INV009: health is authoritative; readiness-looking logs are not; renderer already receives status IPC and message field; embedded health polling does not run browser retry-exhaustion policy. Source inventory below is exact. No runtime equivalence/test success inferred from source inspection.

## Intended Change
Change the100s **terminal deadline** into a one-time **informational delayed-start warning**. Keep the same pending start, child, health observations and terminal-failure listeners alive. At eventual matching-child healthy response, publish RUNNING once and clear delayed presentation. Do not add a replacement completion deadline or assert migration progress from elapsed time. The warning100s value is presentation only, not migration policy. No automatic restart, kill, retry or ledger alteration.

## Relevant Behavior And Production-Path Map
|Behavior|Requirement/AC|Supported trigger|Preserved/changed outcome|Path|
|---|---|---|---|---|
|BEH003|REQ003/AC003|Ordinary desktop launch with migration taking longer than100s|Remain pending with diagnostic delay information; later healthy child becomes usable|M1-P/M1-E|
|BEH003|REQ003/AC003|Real platform-fatal record, process error/close before health|Prompt terminal error, once, no later false ready|M1-E/M1-L|
|BEH003|REQ003/AC003|Explicit normal application shutdown during pending startup|Existing shutdown action, observers cleaned; no abandoned start/polling or successor-child mutation|M1-L|
|All|REQ004|Existing test profile/other migrations|No data writes by M1 code; existing backend migration behavior and safety prerequisites unchanged|Preserved boundary|

## Relevant Supplemental Task Artifacts
INV inventory owns private Delivery recovery handoff/log references and prior completed ticket links. Local structural probe is diagnosis, not UI acceptance. No new Product, architecture-review or implementation artifacts exist yet. Independent review **pending**, not N/A. Scanner and local-data repair are deferred outside this ticket, not supplements granting extra implementation scope.

## Task Design Health Assessment
Posture Bug Fix. Issue Yes: elapsed-time policy incorrectly owns terminal lifecycle settlement. Root cause Missing Invariant / Boundary Or Ownership Issue. Bounded refactor now: distinguish delay notification from terminal settlement inside existing process owner. Reuse owner, generation guards, status bridge and renderer. No subsystem rewrite. Out of scope: migration scanner and operational data repair, explicitly deferred to possible later tickets. Residual slow startup is expected until scanner work; M1 makes it observable and recoverable, not faster.

## Terminology
Delayed = elapsed threshold crossed while still awaiting health, not proof of failure or progress. Terminal startup failure = actual setup/platform/process failure. Ready = same current child/generation passes existing health contract. M1 = retained timeout spine label; former M2 proposal is superseded by SR010 deferral, not a current-ticket milestone.

## Design Reading Order
Evidence → behavior/ownership → lifecycle decisions → exact file responsibilities → validation. File keys resolve to full paths in the source inventory.

## Legacy Removal Policy
Remove the terminal100s timeout branch and misleading maxStartupTime/deadline naming. No compatibility toggle retaining old timeout behavior, dual mode, backend marker or hard-coded migration exception. Existing genuine-error paths remain; they are not legacy compatibility.

## Persisted Data / State Transition Decision
**Not Affected by M1.** No schema, migration ID, package or ledger change. Child startup naturally still runs current backend migrations on launch; this is why validation must use isolated data. No source-to-target conversion or local test-data repair is authorized by M1. Migration plan N/A; this ticket has no persisted-data transition.

## Data-Flow Spine Inventory / Primary Execution Spine
M1-P (primary): user launches desktop → Electron application opens normal-profile shell/starts initialization → ServerStatusManager → BaseServerManager launches one child → existing backend initialization/migration → current-child health → status IPC → loading overlay yields to application.
M1-E (return/event): process owner emits delay, ready or actual error → ServerStatusManager snapshot → existing IPC → Pinia status/message → current loading/monitor UI.
M1-L (bounded local): pending child → health polls plus genuine failure/stop events → exactly one terminal settlement/cleanup, with nonterminal delay notice along the way.

## Spine Narratives / Actors / Ownership Map
ElectronApplication owns shell/bootstrap lifecycle, not migration success. BaseServerManager owns child identity, startup attempt, waiting/cleanup, delayed notification and actual terminal settlement. Backend retains initialization/migration policy. ServerStatusManager owns the authoritative renderer-facing status snapshot; Pinia projects it, not a second readiness decision. UI displays state and existing diagnostics/controls, not another timeout.

## Thin Entry Facades / Public Wrappers
Existing startServer/initializeServer and restart IPC remain boundaries. No new endpoint. Initialization/start calls must not create an additional child while the same owner already has startup pending. Reuse existing initialization guard and coalesce same-owner pending start operations where needed. Do not infer ready from the existence of a process.

## Removal / Decommission Plan
|Remove|Replacement|Scope|
|---|---|---|
|100s timer clearing health polling and rejecting start|One-shot nonterminal delay notification|M1|
|maxStartupTime name describing a deadline|startupWarningAfterMs or equivalently unambiguous informational name|M1|
|Renderer ignoring pending snapshot message|Store/display optional status message separate from error|M1|
|Any test expecting elapsed100s alone to fail startup|Delayed pending → eventual ready regression|M1|
Do not remove port-release, per-request HTTP, shutdown or unrelated caller-wait timeouts. Do not alter backend per-item/fatal policies.

## Return Or Event Spine / Bounded Local Decisions
1. Start creates one attempt and resets prior delay/error presentation. Existing child/generation checks stay authoritative.
2. Start health polling and actual-error listeners as today. One warning timer fires after100000ms while current attempt is still pending. It emits/logs a nonterminal `startup-delayed` event, never error, and does not clear observations, settle the promise, change ready/isRunning or spawn/stop a process.
3. ServerStatusManager keeps current STARTING or RESTARTING and sets message: “Startup is taking longer than usual. Waiting for the backend; see logs for details.” No claim a migration is definitely progressing, no percentage and no countdown. Existing diagnostics link remains available.
4. Current matching child health200 with body status ok settles ready once. Remove warning timer and pending listeners/polling. ServerStatusManager publishes RUNNING without pending message; Pinia clears pending/error presentation.
5. Setup failure, parsed platform-fatal, process error or exit-before-health still rejects once, cleans observations and publishes ERROR with the real reason. A later stale health result cannot revive a terminally failed attempt.
6. Existing stop/quit remains an explicit lifecycle action, not an automatic deadline reaction. Pending wait must settle/dispose on stop even if the existing stop path cleans up without receiving close (e.g. kill throws). Scope listeners and cleanup to captured child/generation; stale shutdown callbacks must not clear a successor child. No new user-facing cancel/recovery flow.
7. Same pending start is coalesced; explicitly ordered stop→start remains restart. Do not create a general command queue or override existing user-directed restart semantics. Clear in-flight ownership only for the attempt that owns it.

## Off-Spine Concerns Around The Spine
|Concern|Owner served|Boundary|
|---|---|---|
|Health HTTP adapter|BaseServerManager|Existing health shape/current generation; request timeout remains2s|
|Fatal-line parser/log forwarder|BaseServerManager|Existing structured fatal authority; ordinary log strings never determine ready/progress|
|Snapshot/IPC transport|ServerStatusManager|Reuse message field/channel; no parallel migration transport|
|Log location/details UI|Renderer|Read-only diagnostics, no automatic data recovery|

## Ownership Boundaries / Boundary Encapsulation Map
|Boundary|Encapsulates|Callers|Forbidden bypass|
|---|---|---|---|
|BaseServerManager|child, pending attempt, health/termination listeners|ServerStatusManager|Renderer starts children or interprets stdout|
|ServerStatusManager|UI status snapshot|Electron IPC|Renderer invents RUNNING from elapsed time|
|Backend initialization|migration result and essential gates|Child lifecycle|Electron treats aggregate FAILED as universal fatal or bypasses safety|

## Dependency Rules
Existing direction remains renderer → IPC → status bridge → process owner; events return through snapshot. Process owner does not read migration tables/history. M1 must not import migration code, hard-code a migration ID, read provider state or add an HTTP-before-migration endpoint.

## Interface Boundary Mapping / Check
startServer():Promise<void> singular current startup lifecycle, same pending attempt coalesced; no ambiguous root identity. Internal startup-delayed event singular notification, emitted only by matching pending process owner. ServerStatusSnapshot.message existing optional presentation, status remains authority; no enum change. All identity shapes explicit (child+generation at process boundary); no execution/run selectors involved.

## Main Domain Subject Naming Check
Keep BaseServerManager/ServerStatusManager/serverStore; concrete established owners. Use informational warning/delay naming instead of migrationTimeout, since this timer never owned migration execution. No generic migration manager, recovery orchestrator or progress registry.

## Existing Capability Reuse / Subsystem Allocation
Extend existing Electron server lifecycle and renderer server-status capability. Reuse structured fatal parser, output buffering, current health contract and IPC. No backend capability or new shared package required. File-local event/message shape is adequate; do not extract a new shared model for a single internal signal. Existing snapshot is the single cross-boundary representation.

## Draft File Responsibility Mapping
Process delay versus terminal settlement → base. Snapshot delay projection → status. Non-error message retention/clearing → store. Pending/restarting message presentation → loading. These four concrete concerns fit existing files; no new production file is needed.

## Reusable Owned Structures / Data Model Tightness
Reuse existing ServerStatusSnapshot.message; retain an internal store statusMessage distinct from errorMessage so a delay cannot accidentally enable error/reset UI. One owner per lifecycle; no duplicate migration-active boolean or elapsed pseudo-status. If typed event payload is useful keep it local to Electron server capability; no redundant protocol model.

## Final File Responsibility Mapping / Target Folder Mapping
|File key|Action/responsibility|Must not contain|
|---|---|---|
|base|Change timer to notice; pending-start/cleanup safety; retain real failures|Migration logic, ledger access, stdout-readiness guessing|
|status|Observe notice and republish same pending status+message; clear on terminal/new start|Independent timer or readiness test|
|store|Retain pending message; clear on ready/error/new attempt; connectionMessage supports pending/restarting|Browser retry policy changes or fabricated progress|
|loading|Render pending message for initial/restart paths; reuse details/log controls|New recovery buttons or fake progress bar|
|monitor|Verify existing connectionMessage reuse; edit only if necessary for restarting consistency|Another lifecycle owner|
|contract/bootstrap/fatal/backend|Read-only expected; regression preservation|Unrequested protocol/backend changes|
|base_test/status_test and renderer tests|Durable acceptance coverage listed below|Helper-only green tests presented as real desktop acceptance|
Folder boundary: existing electron/server is process/control; stores and components remain renderer projection. No moves or new subsystem folders.

## Applied Patterns / Derived Layering
Existing event-driven lifecycle with current-child guards. A delayed notification is an observation, not a terminal state. Thin existing IPC projection; no new pattern/framework.

## Concrete Examples / Backward-Compatibility Rejection Log
Good: t=100s still STARTING with delay notice; t=135s migration reports individual failures; t=160s healthy current child → RUNNING. Bad: extend fixed deadline to300s, restart automatically, or treat any migration failure as healthy/fatal by hard-coded exception. Reject retaining old timeout behind a feature flag. No new migration/compatibility code; scanner work is deferred to a possible later ticket.

## Change / Refactor Sequence
1. Implement process-owner nonterminal delay and captured-attempt cleanup, with durable lifecycle tests.
2. Wire notice through existing snapshot and store; update loading/restart display and component tests.
3. Run implementation-scoped checks, obtain configured independent review, then API/E2E including actual shell-dependent validation. No Designer source edits.
4. Validate isolated normal-profile window-first startup with >100s delayed backend readiness, then genuine-failure controls. Only after M1 evidence should an explicitly authorized normal-profile user-data launch be considered. Do not reset/replay data to create the delay.
5. Return the timeout-only result through normal review/validation/delivery gates. Do not start another ticket or repair automatically. Current-ticket completion depends on its own gates, not deferred scanner work.

## Validation / Guidance For Implementation
- Durable process test: elapsed100s notice once; start promise pending; zero error/kill/extra launch; health still polled; later healthy same child → ready once.
- Pending duplicate start, start→explicit stop, shutdown with no-close cleanup, retry after actual failure, stale child output/health and replaced-generation callbacks. Fake timers cleaned at test exit; no indefinitely hanging suite.
- Preserve prompt structured fatal split across output chunks, close code0 before health, nonzero exit, spawn/environment errors and ready-looking-log rejection. A fatal followed by healthy response remains failed.
- Bridge/store/component tests: STARTING/RESTARTING notice survives snapshot refresh, no error/reset UI, clears on RUNNING/ERROR/new attempt. Existing browser behavior untouched. Report inherited build failures accurately.
- API/E2E: real isolated child and desktop normal window-first lifecycle, held migration/initialization over100s using controlled validation-only setup, actual visible waiting then usable UI after health. Use fresh disposable data; do not use real user DB or add a production sleep flag. Show child/launch count and timestamps. Browser-only tests cannot prove Electron timer correctness; native shell execution is necessary here. E2E profile that waits before opening its window cannot prove delayed overlay behavior by itself.
- Distinguish actual held startup from a production-scale migration performance test. Do not claim scanner optimization or all histories/provider readiness from this milestone.

## Key Tradeoffs / Risks
No universal startup completion deadline: a truly stuck but living process may remain pending. Delay notice and diagnostics are honest; elapsed time alone cannot prove failure. Actual failures and explicit shutdown stay effective. This is preferable to introducing another guessed deadline. Slow migration I/O remains outside this timeout-only fix. No unsupported live-data repair. Single-flight/observer cleanup is essential because pending lifetime is now unbounded; keep the change within existing owner, not a new scheduler.

## Exact Source Inventory
- **base**: `/Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/autobyteus-web/electron/server/baseServerManager.ts`
- **status**: `/Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/autobyteus-web/electron/server/serverStatusManager.ts`
- **store**: `/Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/autobyteus-web/stores/serverStore.ts`
- **loading**: `/Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/autobyteus-web/components/server/ServerLoading.vue`
- **monitor**: `/Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/autobyteus-web/components/server/ServerMonitor.vue`
- **contract**: `/Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/autobyteus-web/types/serverStatus.ts`
- **bootstrap**: `/Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/autobyteus-web/electron/application/electronApplication.ts`
- **fatal**: `/Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/autobyteus-web/electron/server/embeddedServerPlatformFatal.ts`
- **base_test**: `/Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/autobyteus-web/electron/server/__tests__/BaseServerManager.spec.ts`
- **status_test**: `/Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/autobyteus-web/electron/server/__tests__/ServerStatusManager.spec.ts`
- **backend**: `/Users/normy/autobyteus_org/autobyteus-worktrees/migration-startup-scope-recovery/autobyteus-server-ts/src/server-runtime.ts`

## Remaining Package Work / Route
Timeout-only design complete; implementation/review/API not performed. Migration scanning and local operational repair are excluded, deferred to possible later tickets, and do not block this ticket’s design completeness. Independent review artifacts pending, not N/A. Rule lookup must determine exact route; no hard-coded recipient or native collaboration substitute. Tool unavailability is a transport blocker, not permission to implement in Designer role.
