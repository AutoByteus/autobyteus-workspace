# Delivery Latest-Base Conflict Report

## Status

`Blocked — Design Impact in the Agent Tools MCP session ownership boundary.`

- Ticket: `application-owned-mcp-capability`
- Delivery revision: `DR-004`
- Date: `2026-08-28`
- Ticket checkpoint: `aaf7e076ed66c5daaf142f896230ad63085330c7`
- Previous integrated base: `origin/personal` `bf396dd5ed541cf6ef2179b305132b079aadd7ab`
- Latest tracked base: `origin/personal` `ebef77eb32bbeaefd4fccdb6998240264c82a3c1`
- Latest-base commits: `7f6d2d4cb`, `754a945a4`, merge `2afd4bfc6`, release bump `ebef77eb3`
- Attempted integration: `git merge --no-ff origin/personal`
- Result: `Conflict; merge aborted after evidence capture`
- Electron build: `Not run` because no valid latest-base integrated source state exists.

## Candidate Protection

Before integration, all reviewed source, durable coverage, evidence, synchronized docs, and DR-003 handoff artifacts were committed locally as:

`aaf7e076ed66c5daaf142f896230ad63085330c7 chore(delivery): checkpoint verified application-owned MCP handoff`

Reproducible untracked `.autobyteus/` and package `dist/` outputs were deliberately excluded. The failed merge was aborted, returning the branch to that checkpoint.

## Why This Is Not A Mechanical Documentation Conflict

The new base finalized `agent-tools-mcp-session-resume`, which changes the same runtime ownership seam used by this ticket:

- random bearer-backed Agent Tools MCP sessions become deterministic tokenless run-session identities;
- one process-owned dedicated loopback listener replaces the Studio/standalone main-listener callback route;
- Codex and Claude activate/deactivate a shared run-session contract and rematerialize current sender/owner/tool/route/execution context on restore;
- exact-run termination and resource release now own session deactivation.

The application-owned capability currently extends the prior session model with frozen application/binding/producer route identity, declaration fingerprints, an application execution capability in the session, provider-factory injection, application execution-scope kernel wiring, and application-specific route/result behavior. The two changes therefore overlap in active security, identity, lifecycle, provider, and restoration owners. Selecting one side of the conflicts without revising the design could silently drop application tool authorization or regress the new stop/restore contract.

## Unmerged Paths

1. `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`
2. `autobyteus-server-ts/docs/modules/application_backend_api_gateway.md`
3. `autobyteus-server-ts/docs/modules/application_engine.md`
4. `autobyteus-server-ts/docs/modules/application_orchestration.md`
5. `autobyteus-server-ts/docs/modules/application_sessions.md`
6. `autobyteus-server-ts/src/agent-execution/providers/agent-provider-factory-builder.ts`
7. `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts`
8. `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts`
9. `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-host.ts`
10. `autobyteus-server-ts/src/application-platform/execution/application-execution-scope-kernel-builder.ts`
11. `autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts`
12. `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tools-mcp-host.test.ts`

## Required Upstream Resolution

The renewed design must decide and document:

1. how application-owned route identity and capability are activated in the new run-derived tokenless session;
2. how current application/binding/producer authorization is rematerialized across supported stop/restore without persisting live context;
3. how application call admission/drain, package re-entry, exact-run deactivation, and process listener shutdown compose;
4. which owner supplies application capabilities to provider factories and the application execution-scope kernel;
5. how route precedence and declaration fingerprints remain current under the new session activation model;
6. which durable provider/session/application tests replace or update the conflicted expectations; and
7. how the long-lived docs describe the combined endpoint, security, and lifecycle model.

After that solution update, the normal architecture, implementation, code-review, API/E2E, proportional durable-test review, and delivery cycle must repeat. Because the target-base change is material, prior user acknowledgement of DR-003 cannot authorize finalization of the eventual merged behavior; renewed verification will be required.

## Build Disposition

The requested Electron build was intentionally not run against the pre-integration checkpoint. A successful build of stale source would not demonstrate that this ticket is based on latest `origin/personal`. Run the repository-documented Electron build only after the combined design is implemented, reviewed, integrated without conflict, and at least one relevant executable path passes.

## Relevant Artifacts

- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/requirements.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-spec.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/implementation-handoff.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/code-review-report.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-coverage-investigation.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-execution-coverage-report.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-test-review-report.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/delivery-revision-record.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/delivery-integration-evidence.log`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/handoff-summary.md`
- `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/release-deployment-report.md`

The new base ticket is present at commit `ebef77eb32bbeaefd4fccdb6998240264c82a3c1`
under `tickets/done/agent-tools-mcp-session-resume/`; it is intentionally not
materialized into this worktree after the conflicting merge was aborted.
