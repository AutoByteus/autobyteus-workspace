# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/requirements.md`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `proposal-critical-analysis.md`, `design-self-validation.md`, and `sources/autobyteus-vertical-application-developer-experience-proposal.md` in the same ticket directory
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-006`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-review-report.md`
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-006`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-009` and cumulative `IR-001`–`IR-008`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-015`
- Current Review Round: `15`
- Trigger: API/E2E round 5 failure after reviewed HEAD `077ebfa760ed90a1cbc3e7cd2cd9b5fe96352e51`.
- Prior Review Round Reviewed: `14` / `CRR-014`
- Latest Authoritative Round: `15`
- Coverage Investigation Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: `API-REV-005` (prior `API-REV-004` resolution retained)
- Relevant Delivery Revision IDs: `N/A`
- Failing Scenario IDs: `APIE2E-BRIEF-003`, `APIE2E-F005`, `APIE2E-STANDALONE-MCP-001`
- Exact Failing Commands / Execution Mode: clean standalone `pnpm -C applications/brief-studio dev -- --port 43124 --no-open` with real Codex App Server/Luna and system Chrome; durable reproduction `pnpm -C autobyteus-server-ts exec vitest run tests/integration/application-backend/standalone-application-composition.integration.test.ts`.
- Failure Evidence Paths: `evidence/api-e2e/api-rev-005-brief-standalone-real-team.log`, `api-rev-005-brief-standalone-stall-api.json`, `api-rev-005-brief-standalone-tool-exposure.json`, `api-rev-005-brief-standalone-tool-stall-excerpt.json`, and `api-rev-005-standalone-agent-tools-route-regression.log` under the ticket directory.

## Review Scope

- Changed implementation and behavior reviewed: the supported clean-standalone Brief team/tool path, the session-scoped Agent Tools MCP descriptor and route, both composition roots' route registration, and the reviewed standalone route-boundary design.
- Files / areas reviewed: the three API/E2E canonical artifacts; the exact failing integration scenario and live evidence; `agent-tool-mcp-session-service.ts`, `agent-tools-mcp-routes.ts`, `build-studio-server-composition.ts`, `build-standalone-application-server-composition.ts`; requirements AC-005/006/010 and design DS-002/004/005 plus the exact standalone route inventory and Sequence 4.
- Explicit exclusions: this focused review does not reopen the full CRR-014 scorecard, proportionally review the cumulative durable test package, or attribute the secondary mixed whole-server-suite failures without independent evidence.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. AC-005 and AC-006 require the real package team/provider/artifact journey in both hosts; AC-010 confines standalone to related application runtime ingress rather than permitting unrelated Studio/platform surfaces.
- Design-spec behavior map verified against the implementation: Contradicted. The design requires strict tool readiness and real standalone execution, but its exact standalone route inventory and Sequence 4 list only readiness/bootstrap plus selected-app backend, notification, custom-WebSocket, and direct agent-communication mounts. They omit the session-scoped Agent Tools MCP transport that the normal Codex runtime advertises and requires.
- Design review report and round confirmed: `ARCH-REV-006`, decision `Pass`; its standalone route boundary is incomplete for the now-proven runtime path.
- Behavior-basis status: `Contradicted`.
- Changed or newly discovered behavior, if any: no new business behavior. API-REV-005 exposes a missing transport segment inside already-approved UC-004/UC-009 and AC-005/006.
- Remaining material ambiguity, if any: the target design must state whether the required authenticated Agent Tools MCP endpoint is classified as selected-application agent/run communication under AC-010 and how its session authority is bound to the standalone composition. The requirement to make configured tools work is not ambiguous.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| `BEH-004` | Contradicted at runtime transport | The package baseline reaches one attached binding and one real Luna team run, but the researcher cannot reach its configured application tools, so the effective run configuration does not complete its required workflow. | Real trace: 107 events, 36 `run_bash` calls, and zero `write_file`, `publish_artifacts`, or `send_message_to` calls. |
| `BEH-005` | Contradicted at composition surface | Studio registers `registerAgentToolsMcpRoutes(app)`; standalone registers REST, WebSockets, and static routes only. | `AgentToolMcpSessionService` advertises `/mcp/agent-tools/:sessionId` in both runtime modes, while standalone returns route-not-found `404`. |
| `BEH-006` | Confirmed through the prior failure boundary | Clean standalone package validation/readiness now supplies the package-owned Codex/Luna defaults and starts the real run. | No F004 missing-profile recurrence; F005 occurs later at tool transport. |

## Material Premise Validation

### `MP-CR-013` — a supported clean standalone Brief run requires the advertised Agent Tools MCP transport

- Origin: `New`
- Related approved requirement or established contract: UC-004, UC-009, AC-005, AC-006, and the runtime descriptor contract emitted by `AgentToolMcpSessionService`.
- Relevant behavior ID(s): `BEH-004`, `BEH-005`, `BEH-006`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: a user opens the maintained Brief application through the supported standalone `pnpm dev` product path, creates a Brief, and invokes `Generate draft` in the real browser UI.
- Support evidence: the maintained application exposes that browser action; API-REV-005 executed it against fresh standalone state with the package-owned Codex/Luna defaults and captured the resulting binding, run, provider trace, and business state.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `Brief standalone UI -> selected-app backend command -> application context agent execution -> launch authority -> attached Brief team run -> researcher Codex App Server provisioning -> AgentToolMcpSessionService descriptor -> POST /mcp/agent-tools/:sessionId -> authenticated dispatcher -> configured write/publish/message tools -> writer handoff/artifact projection`.
- Lifecycle preconditions and material consequence at the claimed point: platform and application readiness pass; the binding is `ATTACHED`; the real run and researcher exist. Because the advertised endpoint is not registered, configured tools are unavailable, no valid handoff/artifact occurs, and the Brief remains `not_started` with zero projected artifacts.
- Reachability: `Reachable`.
- Review consequence / proportionate response: the missing transport is material and must be corrected, but its path, classification, composition authority, and public-surface/security boundary must first be added to the reviewed solution rather than inferred as a one-line route registration.

## Findings

### `CR-013` — the reviewed standalone route boundary omits a required internal run transport

- Affected approved behavior: UC-004, UC-009; AC-005, AC-006, and AC-010; `BEH-004`–`BEH-006`.
- Reachability basis: `MP-CR-013`.
- Source evidence: `AgentToolMcpSessionService.buildDescriptor()` always emits `${internalBaseUrl}/mcp/agent-tools/:sessionId`; `buildStudioServerComposition()` registers the matching route; `buildStandaloneApplicationServerComposition()` does not. The exact unauthenticated route probe therefore receives platform `404`, not the route gate's `401 unauthorized`.
- Design evidence: DS-005 requires the tool groups for both hosts, but the exact standalone wrapper/route inventory and Sequence 4 enumerate only `/_autobyteus` readiness/bootstrap/backend/notification/custom-WS/direct-agent mounts. The design separately calls the external MCP gateway Studio-only and never distinguishes that optional gateway from this required internal Agent Tools transport.
- Material consequence: the real standalone researcher receives no configured write, publication, or team-message tools and cannot complete the approved Brief researcher-to-writer/artifact flow.
- Failure origin: inadequate reviewed design plus matching implementation omission. The mechanical source delta may be small, but adding `/mcp/agent-tools/*` outside the reviewed standalone route inventory, with default process-wide registry/dispatcher access, would make a new public-surface and authority decision that the current design does not authorize.
- Earlier review gap: CRR-014 should have traced the real team-run spine through runtime tool delivery and compared every descriptor-advertised callback route with both composition inventories. The implementation matched the incomplete route map, which allowed the omission to survive source review; the prior API/E2E-readiness and runtime-fidelity conclusions are superseded for this path.
- Required design correction:
  1. Extend the standalone real-run spine through session creation, descriptor delivery, authenticated Agent Tools dispatch, configured tool execution, handoff, and artifact projection.
  2. Classify the Agent Tools MCP endpoint explicitly as required internal application-run transport, distinct from the optional external MCP gateway, and reconcile AC-010 plus the exact standalone route inventory/prefix policy.
  3. Specify the authoritative session registry/catalog/dispatcher identity used by both run provisioning and the route, including base-URL derivation, authentication/session scoping, revocation, and shutdown; do not leave a composition-critical default accessor as an implicit decision.
  4. Update the construction sequence, file/change map, negative route-inventory expectations, and both-host validation scenarios before implementation resumes.

The secondary `APIE2E-REPO-005` broad-suite failures remain `Unclear` and do not drive this finding or routing because API-REV-005 did not establish regression attribution. Preserve that evidence for later reconciliation.

## Classification

`Design Impact` — the approved behavior is clear, but the reviewed standalone composition boundary is structurally incomplete. A direct local registration would cross the design's exact route and authority boundaries without an approved target contract.

## Recommended Recipient

`solution_designer`

## Residual Risks

- The revised solution must keep the required internal Agent Tools transport distinct from the Studio-only external MCP gateway and from public app browser bootstrap routes.
- Authority identity matters as much as route presence: the route must dispatch against the same session/tool exposure created for the real application run, with explicit lifecycle/security ownership.
- After solution and architecture approval, implementation must return through full source review; API/E2E must rerun `APIE2E-STANDALONE-MCP-001` and the real standalone Brief flow first, then resume Studio parity, remount, commands, digests, recovery, isolation, and cleanup.
- The secondary whole-server-suite red result remains unattributed and must not be silently converted into product defects or ignored in a final pass.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `API/E2E Failure-Origin Review`
- Material-Premise Gate: `Pass` (`MP-CR-013` is reachable)
- Score Summary: prior CRR-014 `94/100` is historical and not recomputed in this focused review; its API/E2E-readiness and runtime-fidelity conclusions are superseded for the affected path.
- Failure Origin: `Design Impact` — incomplete standalone application-run transport/route boundary, with a corresponding implementation omission.
- Recommended Recipient: `solution_designer`
- Notes: do not route a one-line route registration directly to implementation. Revise the full standalone run spine and composition authority/surface contract, obtain architecture review, then implement, source-review, and rerun API/E2E.
