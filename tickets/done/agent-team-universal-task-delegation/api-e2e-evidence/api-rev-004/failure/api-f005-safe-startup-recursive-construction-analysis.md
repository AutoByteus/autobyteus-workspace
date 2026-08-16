# API-F-005 — Checked-Disposable Built Server Recursively Constructs Agent Runtime Singletons

## Result

- Scenario: `API-UTD-STARTUP-005`
- Governing scope: `R-020`, `R-041`, `AC-049`, and the prerequisite process boundary for every requested real provider/browser/mobile/restore use case.
- Result: **Fail**
- Preliminary classification: **Local Fix — implementation source**, subject to focused `code_reviewer` failure-origin confirmation.
- Design/requirement ambiguity: none identified. The reviewed design requires the current server to complete its migration attempt and listen; it does not require or permit recursive singleton construction.

## Safety And Execution Mode

The failure was reproduced only through the checked API/E2E-owned disposable launcher boundary:

- runtime root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/autobyteus-server-ts/tests/.tmp/api-rev-004-live-20260815-1`
- SQLite target: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-universal-task-delegation/autobyteus-server-ts/db/api-rev-004-live-20260815-1.db`
- requested server port: `60309`
- requested frontend port: `31309`
- child `DATABASE_URL`: absent
- child `DATABASE_URL_TEST`: absent
- materialized `.env`: exact disposable absolute SQLite target
- configuration-only target resolution: exact and did not initialize the database
- operational database target match: false

Twenty-one Prisma migrations and the user-authorized nine-secret import completed against only that disposable database. No secret value was printed or copied into evidence. The operational database and protected ports `60004`/`31004` were not inspected, targeted, stopped, repointed, or mutated.

## Expected

After the current startup migration attempt completes against the disposable database, the production built server starts listening on `127.0.0.1:60309`. That readiness is a prerequisite for package import, real Agent/AgentTeam execution, WebSocket/API correlation, browser/mobile validation, reopen/restore, and the explicit UC/AC matrix.

## Observed

The built process completed Prisma migration discovery, opened only the disposable database, populated Agent definitions, and initialized the AgentTeam definition cache. Before listen, it exited with:

```text
Failed to start server: RangeError: Maximum call stack size exceeded
```

The exact built stack begins:

```text
new AgentToolMcpSessionService
AgentToolMcpSessionService.getInstance
getAgentToolMcpSessionService
new CodexThreadBootstrapper
getCodexThreadBootstrapper
new CodexAgentRunBackendFactory
getCodexAgentRunBackendFactory
new AgentRunManager
AgentRunManager.getInstance
new AgentRunIdentityAllocator
```

No listener was created on `60309`. Consequently no Agent package, Team run, provider row, browser, mobile journey, or restart/restore row could truthfully execute.

## Source Ownership Cycle

The stack and source audit show this eager construction cycle:

1. `AgentToolMcpSessionService.getInstance()` begins constructing the singleton. The static instance is not assigned until the constructor returns.
2. Its constructor requests `AgentToolMcpCatalog`.
3. The catalog builds default MCP adapter providers, including `TaskDelegationToolsMcpAdapterProvider`.
4. That provider requests `TaskDelegationToolService` -> `TaskDelegationToolRunRouter` -> `TeamRunService`.
5. `TeamRunService` constructs `AgentRunIdentityAllocator`.
6. The allocator requests `AgentRunManager.getInstance()`.
7. `AgentRunManager` constructs the Codex backend factory -> `CodexThreadBootstrapper`.
8. `CodexThreadBootstrapper` requests `getAgentToolMcpSessionService()` again.
9. Because the first session-service construction has not returned, the singleton is still null and construction restarts until stack overflow.

This is a production startup composition defect. It is not caused by the disposable database, the user secret file, the Agent package, a browser fixture, a stale test expectation, or an operational-data collision.

## Diagnostic Method And Hygiene

The initial checked launcher reported startup failure without a full stack. A temporary fail-closed diagnostic wrapper reused the checked `materializeTestRuntime` child-environment sanitation and exact-target guard. To expose the swallowed stack, only the built `dist/app.js` catch was temporarily instrumented; the exact backed-up built artifact was restored immediately after the diagnostic. No production TypeScript source was changed, and no compatibility, retry, fallback, or alternate launch path was added.

## Evidence

- `../environment/safe-target-preflight.log`
- `../environment/prisma-migrate-deploy.log`
- `../environment/secret-import-summary.log`
- `../environment/safe-server-diagnostic.log`
- `../environment/safe-server-stack-diagnostic.log`
- `api-f005-source-cycle-audit.log`
- `../cleanup/owned-runtime-cleanup.log`
- `../cleanup/final-cleanup-verification.log`

## Cleanup

The checked cleanup owner removed only the API-REV-004 runtime root, disposable SQLite database, key, WAL, SHM, and journal candidates. Verification confirms those paths and ports `60309`, `31309`, `60004`, and `31004` are absent. Operational database action: **NONE**. Automatic repair or rollback: **NONE**.

## Recommended Correction Boundary

Break the eager construction cycle at an existing composition/ownership boundary so the current singleton graph can initialize without calling back into an incompletely constructed singleton. Do not add a startup retry, compatibility catalog, alternate Team tool owner, fallback serializer/router, or provider-specific bypass. After correction, API/E2E must recheck this scenario first and then run the complete checked-disposable classroom/nested-classroom AutoByteus/Codex/Claude Team and standalone, browser/mobile, reopen/restore, migration/recovery, and UC/AC matrix.
