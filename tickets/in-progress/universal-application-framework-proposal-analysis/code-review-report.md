# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/requirements.md`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `application-framework-architecture-simplification.md`, `latest-base-integration-design-analysis.md`, and the retained proposal/validation/hardening artifacts
- Relevant Solution Revision IDs: `SR-018`; retained `SR-016`, `SR-013`
- Relevant Architecture Review Revision IDs: `ARCH-REV-016`; retained `ARCH-REV-014`, `ARCH-REV-011`
- Relevant Implementation Revision IDs: `IR-022`; retained `IR-017`–`IR-021`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-040`
- Current Review Round: `40`
- Trigger: `API-REV-014` failure after `CRR-039` Pass on reviewed HEAD `7e8e43340b5d83547e74395c9c03ba28ee8248a2`
- Prior Review Round Reviewed: `CRR-039` — complete implementation-source `Pass / 97`
- Latest Authoritative Round: `CRR-040`
- Coverage Investigation Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: `API-REV-014`; retained `API-REV-013`
- Relevant Delivery Revision IDs: `DR-009`
- Failing Scenario IDs: `APIE2E-STUDIO-RESTART-014`, `APIE2E-F009`; affected `AC-025`
- Exact Failing Execution Mode: isolated Studio backend and Nuxt frontend; real Brief `dev:studio`; installed Chrome; real package-owned Codex/Luna team; successful publication/handoff/projection/remount; graceful backend stop; same-data backend restart; enter application and `POST .../backend/ensure-ready`
- Failure Evidence Paths:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-014-studio-restart-ensure-ready-failure.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-014-studio-restart-source-correlation.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-014-studio-backend-isolated.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/api-rev-014-studio-restart.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/code-review/crr-040-failure-origin-focused.log`

## Review Scope

- Changed implementation and behavior reviewed: only the failed current-base same-data application-worker startup/reconciliation path and its interaction with durable published-artifact projection and contained live application delivery.
- Files / areas reviewed:
  - `applications/brief-studio/backend-src/index.ts`
  - `applications/brief-studio/backend-src/services/brief-artifact-reconciliation-service.ts`
  - `applications/brief-studio/backend-src/services/brief-artifact-paths.ts`
  - `autobyteus-server-ts/src/services/published-artifacts/published-artifact-publication-service.ts`
  - `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts`
  - `autobyteus-server-ts/src/agent-execution/events/dispatch-processed-agent-run-events.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/shared/runtime-event-dispatch.ts`
  - `autobyteus-server-ts/src/application-orchestration/services/application-published-artifact-relay-service.ts`
  - `autobyteus-server-ts/src/application-engine/services/application-engine-launcher.ts`
  - relevant Brief integration and publication unit coverage
- Explicit exclusions: no proportional review decision is made for the API/E2E-owned `team-lifecycle-websocket.integration.test.ts` delta during this failed execution round. That durable delta remains pending a later successful API/E2E rerun and proportional test-code review. Unaffected CRR-039 structural conclusions are not reopened.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. `AC-025` explicitly requires real Studio publication/handoff/projection plus restart/recovery on v1.4.50. `AC-022` explicitly preserves durable publication before the logged/contained active-listener delivery policy.
- Design-spec behavior map verified against the implementation: The intended behavior is confirmed, but the current implementation contradicts it when an application-ineligible artifact remains in a valid member's durable published-artifact projection.
- Design review report and round confirmed: `ARCH-REV-016` Pass for `SR-018`.
- Behavior-basis status: `Contradicted`
- Changed or newly discovered behavior: None. The failure is a concrete violation of already approved `BEH-012`/`AC-025`, not a new requirement.
- Remaining material ambiguity: None material to ownership or routing. Brief already rejects unsupported producer/path combinations without app projection, while same-data restart must remain usable.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| `BEH-012` | Contradicted | Real Studio Brief -> researcher publishes supported research and later publishes the writer-only `final-brief.md` -> server durably retains both researcher summaries -> live app delivery rejects the second path under its contained failure policy -> graceful same-data restart -> `ensure-ready` -> worker `onStart` -> catch-up enumerates every researcher summary -> path resolver throws -> launcher returns 500. | `API-REV-014` reproduces this exact ordinary product/operational path and preserves the durable projection, live warning, and repeated restart 500. |
| `BEH-004` / `BEH-005` | Contradicted only at recovery continuation | Publication, named handoff, valid writer projection, remount, and graceful stop all succeed; restart cannot restore a usable worker because catch-up treats an already rejected app-ineligible publication as fatal. | The completed Brief is correct before restart, but the same stored platform history prevents recovery. |

## Failure-Origin Analysis

### Confirmed production trace

1. The maintained Studio Brief exposes the generic server-owned `publish_artifacts` tool to the package researcher; the real Codex/Luna researcher is a supported application member and produced the recorded artifact.
2. `PublishedArtifactPublicationService.publishForRun()` snapshots and writes the member projection before `run.publishEvent(...)`, as AC-025 requires.
3. Active-run event listeners are isolated. `ApplicationPublishedArtifactRelayService.attachToRun()` starts relay asynchronously and logs a rejected application delivery instead of rolling back the platform artifact. The live log records the researcher/final-path rejection.
4. Brief's live application handler correctly leaves its app projection unchanged: research belongs to researcher and final belongs to writer.
5. On the supported same-data restart, `ApplicationEngineLauncher.ensureReady()` loads the Brief worker. `backend-src/index.ts` invokes `reconcilePublishedArtifacts()` during `onStart`.
6. Catch-up calls `context.publishedArtifacts.list(runId)` for every binding member and sends every summary to `projectArtifactRevision()` without first distinguishing app-eligible from already rejected app-ineligible history.
7. `resolveBriefArtifactPathRule("researcher", ".../final-brief.md")` throws. The startup exception reaches the launcher failure path, detaches/stops the worker, and every `ensure-ready` returns 500.

### Origin determination

- Origin type: implementation/runtime defect in Brief Studio persisted-artifact reconciliation.
- Exact defect: the live delivery boundary and restart catch-up boundary apply incompatible failure policies to the same durable platform artifact. Live delivery rejects the application-ineligible artifact locally and continues; catch-up replays it as a fatal application-start error.
- Relation to IR-022: the failing reconciliation code predates IR-022, but IR-022 integrates the required v1.4.50 commit-before-awaited-event/contained-listener behavior and AC-025 required complete current-base restart proof. The current source combination is therefore implementation-owned. This is not evidence that the dual-host/application-runtime architecture or Agent Tools route is structurally wrong.
- Review-gap determination: CRR-039 traced durable commit and live delivery but did not continue the post-commit retained-history spine into Brief `onStart` catch-up. Because AC-025 explicitly required same-data recovery and the design explicitly retained contained listener failure, this interaction was reasonably source-review-detectable and CRR-039's readiness conclusion is superseded.
- Excluded causes: not a package mutation, environment/fixture error, MCP availability failure, stale team-lifecycle test, database migration failure, Studio gateway issue, or process-global/application-local authority mismatch.

## Material Premise Validation

### `MP-CR-040-001` — An app-ineligible artifact can be durably retained and later encountered by supported restart catch-up

- Origin: New
- Related approved requirement or established contract: `BEH-004`, `BEH-005`, `BEH-012`; `AC-022`, `AC-025`
- Initiating basis kind: `User` plus `Operational`
- Independent product-supported initiating trigger: a user starts a maintained Brief in Studio using the package-owned researcher/writer team; an operator or development session then gracefully restarts Studio on the same data root and the user enters the application.
- Support evidence: the Studio application surface exposes creation/run/entry, the package gives the researcher the generic server `publish_artifacts` capability, and Studio supports graceful same-data restart. API-REV-014 exercised all of them with a real Codex/Luna run rather than a synthetic direct handler call.
- Forward production path: Studio Brief run -> researcher Agent Tools publication -> platform snapshot/projection commit -> contained live application rejection -> same-data Studio restart -> application entry/ensure-ready -> worker `onStart` -> published-artifact catch-up -> unsupported producer/path rejection -> worker startup failure.
- Lifecycle preconditions and consequence: the application DB has a valid completed researcher/writer projection, while the platform member history also retains one distinct application-ineligible researcher revision. Catch-up's fatal replay makes the otherwise valid completed Brief and worker unavailable after restart.
- Reachability: `Reachable`
- Review consequence / proportionate response: require one bounded correction in Brief reconciliation. Preserve generic server publication history and strict app projection rules, but do not let an artifact that is ineligible for Brief projection poison worker startup. Continue valid catch-up and preserve real storage/revision/correlation failures as failures; do not add a broad catch-all, compatibility path, platform special case, or producer-specific server tool.

## Findings

### `CR-026` — Brief restart catch-up makes a contained app-ineligible publication permanently fatal

- Severity: Critical for `AC-025` delivery; bounded source scope.
- Status: Open.
- Affected behavior: `BEH-004`, `BEH-005`, `BEH-012`; `AC-022`, `AC-025`.
- Evidence: `MP-CR-040-001`; API-REV-014 live evidence; `brief-artifact-reconciliation-service.ts:96-129,157`; `brief-artifact-paths.ts:37-77,122-145`; focused current tests confirm that post-commit event rejection retains the platform projection and Brief rejects unsupported producer/path projection.
- Required correction: make Brief startup catch-up distinguish an artifact that is not eligible for this application's producer/path projection from an actual reconciliation/infrastructure failure. The former must not mutate Brief state or abort worker startup; valid researcher/writer history must still reconcile in order. Unknown binding/correlation, unreadable revision, database, transaction, and notification failures must not be silently swallowed. Preserve live strict projection, generic platform publication history, the commit-before-event contract, and both host behaviors.
- Required proof after correction: exact source review; durable regression with valid research/writer history plus an ineligible retained researcher/final revision; same-data worker restart/ensure-ready and completed Brief usability; full affected API/E2E rerun. Do not restore obsolete seams or make `publish_artifacts` application-specific at the platform boundary.

## Classification

`Fail — Local Fix`

This is a bounded application implementation defect with no missing product decision and no need to revise the approved platform architecture.

## Recommended Recipient

`implementation_engineer`

After the bounded correction, return through implementation-source review and API/E2E. The API/E2E-owned durable WebSocket test update remains preserved and must receive proportional test-code review only after a successful execution round.

## Residual Risks

1. A broad catch around catch-up would hide real corruption/storage/revision failures; the correction must identify only application-ineligible projection input.
2. Filtering platform history globally or changing the generic `publish_artifacts` contract would exceed the failure and incorrectly couple the server tool to Brief-specific paths.
3. The same application package is shared by both hosts; although the failure was observed in Studio, the correction and coverage should be host-neutral at the Brief worker boundary.
4. Historical `APIE2E-REPO-005` remains separate `Unclear` and unrelated.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `API/E2E Failure-Origin Review`
- Material-Premise Gate: `Pass — MP-CR-040-001 Reachable`
- Score Summary: `Not recomputed for focused failure-origin review`; CRR-039's `97/100` source score remains historical but its readiness decision is superseded by `CR-026`.
- Failure Origin: bounded Brief Studio persisted-artifact catch-up defect; not a generic architecture, environment, or test-origin failure
- Recommended Recipient: `implementation_engineer`
- Notes: correct the live-versus-replay failure-policy mismatch, then require source re-review and the failed current-base Studio restart plus retained API/E2E matrix.
