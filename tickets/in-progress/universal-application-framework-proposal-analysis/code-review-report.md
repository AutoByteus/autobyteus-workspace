# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/requirements.md`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `proposal-critical-analysis.md`, `design-self-validation.md`, and `sources/autobyteus-vertical-application-developer-experience-proposal.md` in the same ticket directory
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-009`, with `SR-008` as the CR-013 correction basis; `SR-007` remains withdrawn
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-review-report.md`
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-006`; `ARCH-REV-007` was withdrawn with no decision
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-010`, with `IR-001`–`IR-009` retained as implementation history
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-018`
- Current Review Round: `18`
- Trigger: `api_e2e_engineer` round-6 failure handoff after CRR-017/IR-010
- Prior Review Round Reviewed: `17` / `CRR-017` (`Pass`)
- Latest Authoritative Round: `18`
- Coverage Investigation Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: `API-REV-006`
- Delivery Revision Record Reviewed: `N/A`
- Relevant Delivery Revision IDs: `N/A`
- Failing Scenario IDs: `APIE2E-STANDALONE-MCP-002`, `APIE2E-F006`, `APIE2E-CODEX-AUTH-001`
- Exact Failing Commands / Execution Mode:
  - Real product path: `pnpm -C applications/brief-studio dev -- --port 43124 --no-open` with fresh owned data, real worker/SQLite, Codex App Server, authenticated `gpt-5.6-luna`, and system Chrome.
  - Direct regression: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/application-platform/application-run-authorities.test.ts`
- Failure Evidence Paths: `api-rev-006-standalone-actual-run-descriptor-state.json`, `api-rev-006-standalone-actual-tools-and-workaround.json`, `api-rev-006-codex-definition-authority-regression.log`, `api-rev-006-source-correlation.log`, and the real-run logs/trace under `tickets/in-progress/universal-application-framework-proposal-analysis/evidence/api-e2e/`

## Review Scope

- Changed implementation and behavior reviewed: failure-origin only. Confirmed IR-010 route registration, then traced the actual package-local agent-definition authority from `createApplicationRunAuthorities()` through `AgentRunManager`, the Codex backend factory, and `CodexThreadBootstrapper`.
- Files / areas reviewed: `create-application-run-authorities.ts`, `agent-run-manager.ts`, `codex-agent-run-backend-factory.ts`, `codex-thread-bootstrapper.ts`, the updated graph-authority regression, and API-REV-006 live descriptor/tool evidence.
- Explicit exclusions: no proportional review of the cumulative API/E2E test package; no full source scorecard; no Claude source finding or change without an independently established supported Claude scenario; no attribution of `APIE2E-REPO-005`.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. AC-005/AC-006 require the maintained Brief package's real Codex team run to receive eligible `publish_artifacts` and `send_message_to`, hand work to the writer, and produce projected artifacts in both hosts.
- Design-spec behavior map verified against the implementation: contradicted at one implementation connection. The reviewed design explicitly requires definition/runtime foundations to pass their exact graph-local definition services into runtime/run services and prohibits new composition-critical application-graph code from resolving process globals. The current application graph injects that authority into AutoByteus and allocation but omits the Codex factory.
- Design review report and round confirmed: `ARCH-REV-006` remains the valid `Pass` decision. The current evidence does not expose an inadequate design; it exposes incomplete implementation of its exact-authority rule.
- Behavior-basis status: `Contradicted` by current Codex source/runtime wiring
- Changed or newly discovered behavior, if any: none. This is a supported maintained-package path already required by AC-005/AC-006.
- Remaining material ambiguity, if any: none for the Codex failure origin. Claude is not classified in this focused round.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| `BEH-004` | Contradicted at Codex bootstrap authority | A valid package-local researcher reaches the application `AgentRunManager`, which selects its Codex backend factory and bootstrapper before creating the run-scoped Agent Tools descriptor. | The application graph omits `codexBackendFactory`; the manager selects the process-global factory/bootstrapper, whose `AgentDefinitionService.getInstance()` lookup cannot resolve the package-local ID. |
| `BEH-005` | Confirmed | IR-010 correctly mounts the existing standalone Agent Tools route; the focused route selection passes 13/13 and the prior generic/static 404 is gone. | None. The current failure occurs before a non-empty descriptor can use that route. |
| `BEH-006` | Contradicted at the real configured-tool run | Clean standalone builds, validates, creates the Brief, binding, team run, exact package-owned researcher, Codex thread, and run-scoped session. | `codexThreadConfig.appServerConfig` is null; the session has empty configured/enabled tools; no AutoByteus Agent Tools server appears; no eligible dispatch, writer handoff, or projection occurs. |

## Material Premise Validation

### `MP-CR-014` — the maintained standalone Codex run reaches a package-local definition lookup before Agent Tools descriptor creation

- Origin: `New`
- Related approved requirement or established contract: REQ-004, REQ-005, REQ-007; AC-005 and AC-006.
- Relevant behavior ID(s): `BEH-004`, `BEH-006`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: a user opens the maintained Brief standalone application, creates a Brief, and chooses `Generate draft`.
- Support evidence: API-REV-006 reaches a fresh real Brief binding, team run, exact package-local researcher run, and authenticated Codex/Luna thread using the supported application UI and application-folder `dev` command.
- Forward production caller/event path: `Brief UI Generate draft -> selected application backend -> guarded Brief team launch -> TeamRunService/MixedTeamManager -> application AgentRunManager -> CodexAgentRunBackendFactory -> CodexThreadBootstrapper -> package-local AgentDefinitionService lookup -> configured-tool exposure -> Agent Tools session descriptor -> standalone route -> server tool dispatch -> writer handoff/artifact projection`.
- Lifecycle preconditions and material consequence: package validation/readiness, binding, team-run allocation, researcher allocation, and Codex thread creation all succeed. The bootstrapper instead resolves the definition from the process-global catalog, receives null, derives an empty tool exposure, and emits no usable descriptor, so publication/handoff and projected artifacts cannot occur.
- Reachability: `Reachable`.
- Review consequence / proportionate response: require the existing application graph construction owner to inject its exact `AgentDefinitionService` into the Codex bootstrapper/factory used by its `AgentRunManager`. No route, session, tool catalog, native runtime tool, external gateway, persistence, or design change is justified.

## Findings

### `CR-014` — application Codex bootstrap escapes the graph-local agent-definition authority

- Affected approved behavior: REQ-004/REQ-005/REQ-007, AC-005/AC-006, `BEH-004` and `BEH-006`.
- Reachability basis: `MP-CR-014`.
- Source evidence:
  1. `createApplicationRunAuthorities()` receives the exact graph-local `AgentDefinitionService`.
  2. It injects that service into `AutoByteusAgentRunBackendFactory` and `AgentRunIdentityAllocator`, but constructs `AgentRunManager` without `codexBackendFactory`.
  3. `AgentRunManager` therefore chooses `getCodexAgentRunBackendFactory()`.
  4. That cached default factory chooses the default cached `CodexThreadBootstrapper`.
  5. The bootstrapper defaults to `AgentDefinitionService.getInstance()` and uses it to resolve instructions, skills, and configured Agent Tools exposure.
- Runtime evidence: the exact package-local definition ID and Codex/Luna run are present, but the bootstrapper lookup returns null; `appServerConfig` is null; the session's configured/enabled tools are empty; `publish_artifacts` and `send_message_to` call counts are zero.
- Durable reproduction: the API/E2E-owned `application-run-authorities.test.ts` identity assertion fails exactly because the Codex bootstrapper owns the global service instead of the supplied graph service. The reviewer independently reproduced this 1/1 failure.
- Bounded required correction:
  1. In `createApplicationRunAuthorities()`, construct/inject a Codex backend factory whose bootstrapper receives the exact input `agentDefinitionService`.
  2. Reuse the existing `CodexAgentRunBackendFactory` and `CodexThreadBootstrapper` dependency seams. Do not add a new factory family, service locator, fallback, catalog merge, or package-ID branch.
  3. Preserve existing general-process defaults, native Codex tools, Agent Tools route/session/catalog/dispatcher/adapters, Studio/external-gateway boundaries, create/restore semantics, and cleanup.
  4. After source re-review, API/E2E updates/runs the direct authority regression, verifies a non-null actual descriptor and authenticated `tools/list`, then reruns the real publication/handoff/writer/projection path.
- Scope guard: this focused evidence establishes the maintained Codex path only. It does not authorize a speculative Claude change.

### Review-gap attribution

This source defect predated IR-010 and was reasonably detectable from the approved exact-authority contract plus the application graph's omitted `codexBackendFactory`. CRR-017 correctly passed the two-line route mount but overstated the unchanged runtime-projection path as confirmed without tracing the package-local definition through the concrete Codex factory/bootstrapper. Its API/E2E-readiness and runtime-fidelity conclusions are superseded for this path. The route-mount conclusion and `CR-013` resolution remain valid.

## Classification

`Local Fix` — implementation-owned. The reviewed design already states the correct boundary and the existing constructors already support explicit dependency injection.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Fix only the confirmed application Codex authority escape. Do not change Claude, native Codex/Claude tools, Agent Tools projection rules, route/auth/session behavior, or `/mcp/gateway` without independent product evidence.
- The model's direct SQLite workaround and resulting semantic `in_review`/artifact rows are invalid proof; API/E2E must require authenticated Agent Tools publication plus real writer handoff and projection.
- API/E2E must rerun the exact failing Codex authority test and live scenario before resuming parity/remount/commands/digests/recovery/cleanup.
- `APIE2E-REPO-005` remains independently `Unclear`.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `API/E2E Failure-Origin Review`
- Material-Premise Gate: `Pass` (`MP-CR-014` is reachable)
- Score Summary: CRR-017's full score is not recomputed in this focused review; its API/E2E-readiness and runtime-fidelity conclusions are superseded for the confirmed Codex path
- Failure Origin: `Local Fix` — application run graph omits explicit Codex factory/bootstrapper construction with the exact graph-local `AgentDefinitionService`
- Recommended Recipient: `implementation_engineer`
- Notes: IR-010 itself is correct and `CR-013` remains resolved. API-REV-006 exposed the next, separate composition-authority omission before descriptor creation.
