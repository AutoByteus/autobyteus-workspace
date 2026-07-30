# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/requirements.md`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `proposal-critical-analysis.md`, `design-self-validation.md`, and `sources/autobyteus-vertical-application-developer-experience-proposal.md` in the same ticket directory
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-009` and `SR-008`; `SR-007` remains withdrawn
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-review-report.md`
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-006`; `ARCH-REV-007` was withdrawn with no decision
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/implementation-revision-record.md`
- Relevant Implementation Revision IDs: cumulative `IR-001`–`IR-011`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-020`
- Current Review Round: `20`
- Trigger: `api_e2e_engineer` round-7 failure handoff after `IR-011` / `CRR-019`
- Prior Review Round Reviewed: `19` / `CRR-019` (`Pass`, `96/100`)
- Latest Authoritative Round: `20`
- Coverage Investigation Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: `API-REV-007`
- Delivery Revision Record Reviewed: `N/A`
- Relevant Delivery Revision IDs: `N/A`
- Failing Scenario IDs: `APIE2E-STANDALONE-MCP-003`, `APIE2E-F007`
- Exact Failing Commands / Execution Mode: real clean standalone Brief via `pnpm -C applications/brief-studio dev -- --port 43124 --no-open`, installed Chrome, real worker/SQLite, Codex App Server, authenticated Luna, and the actual session-scoped Agent Tools MCP transport
- Failure Evidence Paths: `api-rev-007-actual-tools-dispatch.json`, `api-rev-007-standalone-state-after-failure.log`, `api-rev-007-brief-standalone-final-browser.json`, `api-rev-007-brief-standalone-final.png`, and `api-rev-007-source-correlation.log` under the ticket's `evidence/api-e2e/` directory

## Review Scope

- Changed implementation and behavior reviewed: failure origin after IR-011. Traced the supported standalone Brief action from real package-local member runs through the authenticated Agent Tools session, default `publish_artifacts` adapter provider, publication service, active-run lookup, artifact event/journal relay, and application projection.
- Files / areas reviewed: application run-authority construction, the default MCP adapter-provider/catalog/session/dispatcher/executor chain, Agent Tools route composition, Codex session construction, publication service and fallback context, the runtime graph boundary, DS-014, and API-REV-007 live evidence.
- Explicit exclusions: no proportional review of the cumulative API/E2E test package; no new Claude or native-tool finding; no change request for `/mcp/gateway`; no attribution of independent `APIE2E-REPO-005`.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. AC-005 and AC-006 require the maintained application's configured real team to publish artifacts and project them into application state in both hosts.
- Design-spec behavior map verified against the implementation: contradicted at the publication-authority boundary. BEH-004/DS-014 correctly require real `publish_artifacts` completion, but DS-014 states the existing route/session/catalog/dispatcher/adapters already work unchanged and that only route registration was missing. The supported application graph owns a separate publication service while the unchanged default MCP provider captures the process-global service.
- Design review report and round confirmed: `ARCH-REV-006` remains the last approved decision, but its retained Agent Tools premise is now incomplete for graph-local application runs.
- Behavior-basis status: `Contradicted`
- Changed or newly discovered behavior, if any: none. Publication and projection are already approved behavior; the newly reached evidence exposes an incomplete authority design.
- Remaining material ambiguity, if any: intended behavior is clear. The correct construction owner and cycle-breaking contract for a graph-aware Agent Tools publication authority require solution design and architecture review.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| `BEH-004` | Contradicted at publication execution | Real package-owned researcher and writer sessions authenticate, list eligible server tools, call `publish_artifacts`, and should relay artifacts into the application. | All five real calls reach the adapter but use a publication service whose manager cannot see either graph-local run; no journal or application projection is produced. |
| `BEH-005` | Confirmed | IR-010's standalone route is mounted and the real sessions reach it successfully. | None. |
| `BEH-006` | Contradicted at the business consequence | Clean standalone build/validation, launch, descriptor, tools list, communication, writer creation, and invocation all succeed. | Publication fails before the required artifact projection and the application remains `not_started`. |

## Material Premise Validation

### `MP-CR-015` — a supported standalone application member reaches the default publication adapter while active only in the application graph

- Origin: `New`
- Related approved requirement or established contract: REQ-004, REQ-005, REQ-007; AC-005 and AC-006
- Relevant behavior ID(s): `BEH-004`, `BEH-006`
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: a user opens the maintained Brief standalone application, creates a Brief, and selects `Generate draft`.
- Support evidence: API-REV-007 uses the supported application-folder command and real UI. It creates an attached binding, real package-owned researcher and writer Codex runs, authenticated Agent Tools sessions, and two successful roster handoffs.
- Forward current production caller/event path that exercises the initiating basis and reaches the claimed state: `Brief Generate draft -> selected application backend -> guarded binding/team launch -> graph-local researcher/writer AgentRunManager -> Codex session descriptor -> standalone Agent Tools route -> default catalog/dispatcher/executor -> PublishArtifactsMcpAdapterProvider -> cached default PublishedArtifactPublicationService -> process-global AgentRunManager lookup -> artifact event/journal/application projection`.
- Lifecycle preconditions and material consequence at the claimed point: the exact graph-local member runs and binding are active; descriptors, authentication, tool listing, tool calls, team routing, and writer creation have succeeded. The default publication service checks a different manager, reports the run inactive, and prevents snapshots/events/journal/projection from establishing the approved application result.
- Reachability: `Reachable`
- Review consequence / proportionate response: correct the Agent Tools publication authority design rather than adding another isolated global override or session-specific fallback. The solution must define a coherent composition owner, exact instance flow, construction-cycle break, lifecycle, and validation matrix.

## Findings

### `CR-015` — the application graph's publication authority is disconnected from the Agent Tools execution authority

- Affected approved behavior: REQ-004/REQ-005/REQ-007, AC-005/AC-006, `BEH-004`, and `BEH-006`.
- Reachability basis: `MP-CR-015`.
- Source evidence:
  1. `createApplicationRunAuthorities()` constructs the correct `PublishedArtifactPublicationService` with its exact graph-local `AgentRunManager` and relay service.
  2. `buildDefaultAgentToolMcpAdapterProviders()` separately constructs `PublishArtifactsMcpAdapterProvider()` without a dependency.
  3. That provider captures `getPublishedArtifactPublicationService()`, whose service falls back to process-global `AgentRunManager.getInstance()` and the process-global relay.
  4. Codex session creation, the registered route, dispatcher, executor, and catalog use their cached default authority family. The session carries paths and application execution context but no publication authority or event callback.
  5. The application runtime graph does not expose a coherent Agent Tools runtime authority or route dependencies to either server composition.
- Runtime evidence: both package-owned Codex threads connect to all three MCP servers, list 86 tools, expose `publish_artifacts` and `send_message_to`, and complete two real roster handoffs. Three researcher and two writer publication calls all fail with the exact graph-local member reported inactive; the publication journal and application artifact tables stay empty.
- Authoritative-boundary consequence: the composition creates the correct publication owner but its MCP execution path reaches a separate internal manager through a cached default. A downstream adapter therefore depends on a hidden process owner rather than the application graph authority governing the run.
- Why this is `Design Impact`, not a bounded local fix:
  - DS-014 explicitly treated the existing session/catalog/dispatcher/adapters as already correct and prohibited a publication bridge; API-REV-007 disproves that premise for the required product path.
  - The available constructor seams do not by themselves define one coherent instance flow. Session creation, route registry, catalog, dispatcher, and executor must agree on the same provider authority.
  - Construction is cyclic: the graph-local publication service requires the graph `AgentRunManager`, while the Codex factory/bootstrapper needed to construct that manager creates Agent Tools sessions. Selecting a late-bound port/resolver, a composition-owned Agent Tools authority, or a different event/publication contract changes ownership and lifecycle and must be reviewed rather than improvised.
- Required design outcomes:
  1. Define one explicit composition-owned Agent Tools runtime authority for application sessions, or an equivalently clear run/session-scoped authority contract. Its session creation and route dispatch must resolve the same adapter/provider family.
  2. Bind `publish_artifacts` to the exact application publication authority that owns the active run and relay. Application execution must not fall back to the process-global publication service.
  3. Break the construction cycle with one narrow, named, fail-closed port/factory/resolver and explicit bind/stop semantics; do not use mutable singleton replacement, catalog merging, package-ID branches, or request-time compatibility fallback.
  4. Preserve the established capability token, registry revocation, tool eligibility, one internal route, successful `send_message_to`, native Codex/Claude tools, and the separate Studio external gateway.
  5. Inventory the server-owned adapters actually reachable from the maintained application configurations and verify that any graph-sensitive dependency follows the same authority rule. Do not expand to unsupported runtime/tool scenarios.
  6. Add durable default-provider/application-graph functional coverage and rerun real standalone and Studio publication/projection after source review.

### Review-gap attribution

CRR-019 correctly verified the bounded Codex definition-authority fix and API-REV-007 confirms that exact descriptor/tool-list/handoff path now works. The remaining gap predates IR-011. Earlier DS-014/CRR-016 treated the existing Agent Tools adapter family as a proven reusable subsystem after inspecting registration and tool projection, but did not trace `publish_artifacts` from the default MCP provider through its concrete publication service and active-run owner. Because DS-014 explicitly froze that ownership and rejected a publication bridge, this is an upstream design gap rather than an IR-011 defect.

## Classification

`Design Impact`

## Recommended Recipient

`solution_designer`

## Residual Risks

- Avoid another one-dependency patch that leaves session creation and route execution on different catalogs or registries.
- Do not broaden the finding to Claude, native Codex/Claude tools, generic MCP transport, or `/mcp/gateway`; the confirmed failure is the server-owned publication authority for supported application sessions.
- Preserve the already-passing descriptor, authenticated tool list, `send_message_to`, writer creation, route security, and session cleanup behavior.
- `APIE2E-REPO-005` remains independently `Unclear`.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `API/E2E Failure-Origin Review`
- Material-Premise Gate: `Pass` (`MP-CR-015` is reachable)
- Score Summary: CRR-019's full source score is not recomputed in this focused review; its publication-boundary/API-E2E-readiness conclusion is superseded for the supported application path
- Failure Origin: `Design Impact` — the reviewed design did not connect the graph-local publication owner to the Agent Tools session/route execution authority or define the required cycle-breaking lifecycle
- Recommended Recipient: `solution_designer`
- Notes: `CR-014` and IR-011 remain resolved. API-REV-007 confirms actual Agent Tools exposure and `send_message_to`; only publication/projection is currently blocked.
