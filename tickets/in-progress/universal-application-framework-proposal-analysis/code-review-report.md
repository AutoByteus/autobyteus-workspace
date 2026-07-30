# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/requirements.md`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `proposal-critical-analysis.md`, `design-self-validation.md`, and `sources/autobyteus-vertical-application-developer-experience-proposal.md` in the same ticket directory
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-006`; an unapproved in-progress SR-007 draft is explicitly not review authority
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-review-report.md`
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-006`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-009` and cumulative `IR-001`–`IR-008`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-016`
- Current Review Round: `16`
- Trigger: user correction of CRR-015/API-REV-005 tool-exposure semantics: Codex and Claude use their native file tools; the server Agent Tools MCP gateway exposes only eligible server-owned adapters and configured MCP-origin tools.
- Prior Review Round Reviewed: `15` / `CRR-015`
- Latest Authoritative Round: `16`
- Coverage Investigation Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: `API-REV-005`
- Relevant Delivery Revision IDs: `N/A`
- Failing Scenario IDs: `APIE2E-BRIEF-003`, `APIE2E-F005`, `APIE2E-STANDALONE-MCP-001`
- Exact Failing Commands / Execution Mode: clean standalone `pnpm -C applications/brief-studio dev -- --port 43124 --no-open` with real Codex App Server/Luna and system Chrome; durable reproduction `pnpm -C autobyteus-server-ts exec vitest run tests/integration/application-backend/standalone-application-composition.integration.test.ts`.
- Failure Evidence Paths: `evidence/api-e2e/api-rev-005-brief-standalone-real-team.log`, `api-rev-005-brief-standalone-stall-api.json`, `api-rev-005-brief-standalone-tool-exposure.json`, and `api-rev-005-standalone-agent-tools-route-regression.log` under the ticket directory.

## Review Scope

- Changed implementation and behavior reviewed: the runtime-specific projection from configured agent `toolNames` into Codex/Claude native tools versus the Agent Tools MCP descriptor, plus the standalone composition's omission of the existing server gateway route.
- Files / areas reviewed at reviewed HEAD `077ebfa760ed90a1cbc3e7cd2cd9b5fe96352e51`: `agent-tool-mcp-catalog.ts`, the default MCP adapter providers, configured MCP source resolver, Codex/Claude MCP materializers, session service/routes, and both composition roots; the Brief researcher/writer configs and API-REV-005 evidence.
- Explicit exclusions: this correction does not approve the uncommitted SR-007/source drafts currently present in the shared worktree, reopen the full CRR-014 scorecard, proportionally review durable tests, or attribute the secondary broad-suite failures.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes, with the user's authoritative clarification. Codex/Claude native tools remain native. The server Agent Tools MCP transport exposes only configured tools that have an eligible server-owned static adapter or a registered MCP-origin source.
- Design-spec behavior map verified against the reviewed implementation: sufficient for bounded correction. The existing Agent Tools MCP subsystem, route, capability token, adapters, and Codex/Claude materializers already own the behavior and work in Studio. Standalone omits only the existing route registration.
- Design review report and round confirmed: `ARCH-REV-006`, decision `Pass`.
- Behavior-basis status: `Confirmed` after correction.
- Changed or newly discovered behavior, if any: none. The prior review and API/E2E report incorrectly treated every configured agent tool name as an expected Agent Tools MCP tool.
- Remaining material ambiguity, if any: none for the bounded fix. The route is required for eligible server-owned tools during a standalone run; it must not add native file tools to the gateway.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Corrected Evidence |
| --- | --- | --- | --- |
| `BEH-004` | Confirmed until the missing standalone route | `toolNames` enter runtime projection; native Codex/Claude capabilities stay native, while eligible server/MCP tools enter the session descriptor. | `write_file` has no default Agent Tools MCP adapter and a non-MCP tool definition is ignored by the configured-MCP resolver. `publish_artifacts` and `send_message_to` have explicit server adapter providers. |
| `BEH-005` | Bounded implementation omission | Studio registers `registerAgentToolsMcpRoutes(app)`; standalone registers REST, WebSockets, and static routes but omits that existing registrar. | Unauthenticated standalone POST returns platform `404`; the existing route would return its established `401` gate. |
| `BEH-006` | Confirmed through launch | Clean standalone package defaults/readiness produce the real Codex/Luna binding and team run. | The runtime used native `run_bash` to create files; failure remained at server-owned publication/handoff availability. |

## Material Premise Validation

### `MP-CR-013` — a supported clean standalone Brief run requires eligible server Agent Tools

- Origin: `Corrected from CRR-015`
- Related approved requirement or established contract: UC-004, UC-009, AC-005, AC-006, and the existing Agent Tools MCP descriptor/route contract.
- Relevant behavior ID(s): `BEH-004`, `BEH-005`, `BEH-006`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: a user opens the maintained Brief standalone application, creates a Brief, and invokes `Generate draft`.
- Support evidence: API-REV-005 reaches a real attached Brief team run under package-owned Codex/Luna defaults.
- Forward production path: `Brief UI -> selected-app backend -> application agent execution -> team run -> Codex native file operation + Agent Tools MCP descriptor for eligible server tools -> /mcp/agent-tools/:sessionId -> publish_artifacts/send_message_to -> writer handoff/artifact projection`.
- Lifecycle preconditions and material consequence: readiness, binding, run creation, and native file creation are reachable. Because standalone does not register the existing Agent Tools MCP route, server-owned publication/handoff tools cannot be called, so the business workflow does not project artifacts or complete.
- Reachability: `Reachable`.
- Review consequence / proportionate response: register the existing route in standalone and validate the correct runtime-specific tool projection. Do not add native `write_file`/`read_file` tools to the gateway or redesign the working gateway subsystem.

## Findings

### `CR-013` — standalone omits the existing Agent Tools MCP route for eligible server tools

- Affected approved behavior: UC-004, UC-009; AC-005 and AC-006; `BEH-004`–`BEH-006`.
- Reachability basis: corrected `MP-CR-013`.
- Source evidence at reviewed HEAD:
  - `buildDefaultAgentToolMcpAdapterProviders()` exposes server-owned adapters including `publish_artifacts` and `send_message_to`; it does not expose file read/write adapters.
  - `ConfiguredMcpAgentToolSourceResolver` forwards only `ToolOrigin.MCP`; ordinary registered native/server tools without an eligible static adapter are not added to the descriptor.
  - Studio registers the existing Agent Tools MCP route; standalone does not.
- Correct failure interpretation: `write_file` is not expected through the gateway for Codex/Claude. Its absence from MCP calls is not a defect. The valid failure is that the missing route prevents eligible server-owned tools such as `publish_artifacts` and `send_message_to` from being available in standalone.
- Failure origin: bounded implementation composition wiring. The route, authorization, session/catalog/dispatcher behavior, runtime materialization, and adapter projection already exist and work in Studio; no new gateway semantics or broad authority refactor is required to establish the missing standalone path.
- Earlier review correction: CRR-015 correctly found the missing route but overstated the expected tool set and escalated a working subsystem into a broad Design Impact. That classification is superseded.
- Required local correction:
  1. Register the existing Agent Tools MCP route in the standalone composition before static fallback, using the same established session authority used by run provisioning.
  2. Preserve the current projection: native Codex/Claude file tools stay native; only configured eligible server adapters and configured MCP-origin tools enter `enabled_tools`.
  3. Add/adjust durable assertions so the Brief researcher descriptor includes `publish_artifacts` and `send_message_to` but does not require gateway `write_file`; verify the route's 401/404 gates and the real native-write -> server-publish/message workflow.
  4. Correct API-REV-005 wording/tests that equate configured agent `toolNames` with gateway-enabled tool names.

The secondary `APIE2E-REPO-005` result remains `Unclear` and unrelated to this classification.

## Classification

`Local Fix` — primary owner `implementation_engineer` for the standalone composition registration. API/E2E owns correction of the over-broad gateway-tool expectation and rerun evidence after source review.

## Recommended Recipient

`implementation_engineer`, after the current solution owner discards or narrows the unapproved SR-007 redesign that was based on the superseded CRR-015 interpretation.

## Residual Risks

- Do not expose native `read_file`/`write_file` through Agent Tools MCP merely because they appear in an agent definition's `toolNames`.
- Preserve the distinction between native runtime tools, server-owned Agent Tools MCP adapters, configured external MCP-origin tools, and the separate generic external MCP gateway.
- After the bounded source fix and source review, API/E2E must inspect the actual descriptor/`tools/list`, not infer it from package `toolNames`, then rerun the real standalone Brief handoff/artifact path.
- The secondary broad-suite failures remain unattributed.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `API/E2E Failure-Origin Review`
- Material-Premise Gate: `Pass` (corrected `MP-CR-013` is reachable)
- Score Summary: prior full score is not recomputed in this focused correction.
- Failure Origin: `Local Fix` — standalone composition omitted the existing server Agent Tools MCP route; the gateway itself and native-tool separation are established behavior.
- Recommended Recipient: `implementation_engineer` via the current solution owner reset/reroute.
- Notes: CRR-015's Design Impact classification and its expectation that `write_file` be gateway-exposed are superseded. Do not continue a broad Agent Tools runtime redesign on that basis.
