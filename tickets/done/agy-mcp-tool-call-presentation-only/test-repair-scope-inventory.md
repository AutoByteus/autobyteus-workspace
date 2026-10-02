# Test repair scope inventory — SR-005

Owner: Solution Designer. Evidence/scope supplement, NOT an implementation or API/E2E execution report. This enumerates the historical failure cohort the user asked to finish. Reproduce against integrated HEAD before assigning current status. No expected-value rewrite is authorized merely by a mismatch.

## Constraints and procedure

1. Use source/contract history and realistic public behavior to distinguish stale fixture/API assertions, setup/build contamination, actual production defect and unsupported/obsolete scenario.
2. Update tests only to independently established current contracts. Preserve assertion strength, negative cases and historical source fidelity. Replace obsolete nested-Team scenarios with supported flat-Team/Org assertions; cite removed behavior authority for each deletion.
3. Do not weaken production guards or suppress failures with skip/only, expected-failure markers, relaxed types, generic catch-and-pass, or arbitrary timeouts. Existing capability gates remain explicit, not counted as passes.
4. Full unit+architecture, integration and deterministic E2E must be rerun after repairs; every historical row needs its current result and change/disposition. Added product defects beyond REQ-008/009 return for scoped requirements/design recovery, not silent source expansion.
5. Build the server before built-server suites and pack Brief Studio when its integration files require dist/importable-package. Isolate environment, graph/process lifetime, owned SQLite target and analytics rows. Never clear user data or another test execution's database.
6. Already-fixed file-explorer imports and Team service mock are retained; verify them on integrated code. DR-003's 210+13 pass is focused only, not proof the inventory is green.

## Repair areas and current authorities

| Area | Evidence-backed direction | Boundary |
| --- | --- | --- |
| Agent/Team/Org graph and lifecycle | Explicit managers require complete constructor dependencies and initialize/release lifecycle; providerInputNormalizer is mandatory. Test the current activation candidate API, not removed activatePreparedRun. | src/agent-execution/services/agent-run-manager.ts, agent-run-provisioning-service.ts; test support builders |
| History/admission and memory | Fixtures must be structurally complete, admitted through the current readiness owner and use exact family/run/address identity. Tests writing folders after initialization need explicit fixture admission/refresh. | src/run-history/services/root-run-package-readiness-index.ts and package validators/catalogs |
| Released-data migration | Frozen released fixtures/output remain historical; current runtime projection excludes removed fields. Assert prerequisite ordering by actual registry contracts and real driver values, not guessed failure substrings. | canonical data_migration_guideline.md and migration registry/source decoders |
| Application packages | Pack actual Brief Studio artifact and provide complete graph-local API/catalog services; release owned test processes. | applications/brief-studio/package.json and application-platform/runtime owners |
| Workspace/media | WorkspaceConverter uses workspace.metadata; file-explorer class is WorkspaceFileExplorer; media service returns /rest/files/... relative paths. Verify URL consumer behavior rather than restoring obsolete absolute API output. | src/api/graphql/converters/workspace-converter.ts; src/services/media-storage-service.ts |
| Defaults/dependency/logging/Codex | Reproduce in isolated env; inspect current contract and lockfile before updating expectations. Token decoding and Codex correlation may be genuine defects—do not assume stale tests. | respective production owners and package lockfile |

## Historical per-file cohort

Historical totals: 78 failed unit tests in 29 files (+4 unhandled errors), 49 failed integration tests in 18 files. Four files were repaired afterward; not a fresh status table. Supporting machine-readable data: recovery-evidence/solution-recovery-sr005/historical-failure-inventory.json.

| Layer | Path | Historical symptom (not current diagnosis) |
| --- | --- | --- |
| Unit/architecture | `autobyteus-server-ts/tests/unit/agent-memory/agent-memory-location-service.test.ts` | AssertionError: expected [] to deeply equal [ { address: '/writer', …(4) }, …(2) ] |
| Unit/architecture | `autobyteus-server-ts/tests/unit/agent-memory/team-memory-explorer-service.test.ts` | AssertionError: expected undefined to deeply equal [ ObjectContaining{…} ] |
| Unit/architecture | `autobyteus-server-ts/tests/unit/agent-execution/agent-run-provisioning-service.test.ts` | TypeError: service.activatePreparedRun is not a function |
| Unit/architecture | `autobyteus-server-ts/tests/unit/agent-packages/package-root-summary.test.ts` | AssertionError: expected { sharedAgentCount: 1, …(3) } to deeply equal { sharedAgentCount: 1, …(2) } |
| Unit/architecture | `autobyteus-server-ts/tests/unit/agent-team-execution/team-run-model-selection-save.test.ts` | AssertionError: expected { success: false, …(6) } to match object { outcome: 'VALIDATION_FAILED', …(1) } |
| Unit/architecture | `autobyteus-server-ts/tests/unit/app-data-migrations/migrate-native-working-context-snapshots-v5-migration.test.ts` | AssertionError: expected [ 11, 12, 14 ] to deeply equal [ 11, 12, 13 ] |
| Unit/architecture | `autobyteus-server-ts/tests/unit/app-data-migrations/raw-trace-active-file-name-migration.test.ts` | AssertionError: expected [ 11, 12, 14 ] to deeply equal [ 11, 12, 13 ] |
| Unit/architecture | `autobyteus-server-ts/tests/unit/app-data-migrations/team-run-execution-tree-v1-app-data-migration.test.ts` | AssertionError: expected 'ROOT_RUN_PACKAGE_CURRENT_VALIDATION_F…' to contain 'schemaVersion' Expected: "schemaVersion" Received: "ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED: rootTeam is missing required field(s): address, defaultLaunchConfiguration." |
| Unit/architecture | `autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-run-records-v1-app-data-migration.test.ts` | AssertionError: expected '\nInvalid `this.transaction.tokenUsag…' to be null |
| Unit/architecture | `autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-run-records-v1-source-token-decoding.test.ts` | AssertionError: expected { status: 'FAILED', …(2) } to match object { status: 'SUCCEEDED', …(2) } |
| Unit/architecture | `autobyteus-server-ts/tests/unit/application-orchestration/application-execution-event-journal-recovery.test.ts` | TypeError: Cannot read properties of undefined (reading 'initializeFromBundleSnapshot') |
| Unit/architecture | `autobyteus-server-ts/tests/unit/application-platform/application-execution-scope-kernel-builder.test.ts` | AssertionError: expected [Function] to throw error including 'K6 Team graph failed' but got 'AgentRunManager requires all executio…' Expected: "K6 Team graph failed" Received: "AgentRunManager requires all execution-family dependencies." |
| Unit/architecture | `autobyteus-server-ts/tests/unit/application-platform/application-execution-scope.test.ts` | Error: AgentRunManager requires all execution-family dependencies. |
| Unit/architecture | `autobyteus-server-ts/tests/unit/application-platform/application-platform-runtime-isolation.test.ts` | Error: AgentRunManager requires all execution-family dependencies. |
| Unit/architecture | `autobyteus-server-ts/tests/unit/config/streaming-content-flush-interval-setting.test.ts` | AssertionError: expected 300 to be 500 // Object.is equality |
| Unit/architecture | `autobyteus-server-ts/tests/unit/file-explorer/file-explorer.test.ts` | TypeError: __vite_ssr_import_4__.FileExplorer is not a constructor |
| Unit/architecture | `autobyteus-server-ts/tests/unit/logging/prisma-query-log-policy.test.ts` | AssertionError: expected '1.0.10' to be '1.0.9' // Object.is equality Expected: "1.0.9" Received: "1.0.10" |
| Unit/architecture | `autobyteus-server-ts/tests/unit/llm-management/gemini-configuration-service.test.ts` | AssertionError: expected { activeMode: 'VERTEX_EXPRESS', …(6) } to deeply equal { activeMode: null, …(6) } |
| Unit/architecture | `autobyteus-server-ts/tests/unit/secret-management/live-e2e-harness.test.ts` | Error: AgentRun provider input normalizer is required. |
| Unit/architecture | `autobyteus-server-ts/tests/unit/services/media-storage-service.test.ts` | AssertionError: expected '/rest/files/images/downloaded.png' to be 'http://unittest.server:8000/rest/file…' // Object.is equality Expected: "http://unittest.server:8000/rest/files/images/downloaded.png" Received: "/rest/files/images/downloaded.png" |
| Unit/architecture | `autobyteus-server-ts/tests/unit/workspaces/workspace-manager-skill-integration.test.ts` | AssertionError: expected "vi.fn()" to be called 1 times, but got 0 times |
| Unit/architecture | `autobyteus-server-ts/tests/unit/workspaces/workspace-manager.test.ts` | Error: The process AgentRunManager is not initialized. |
| Unit/architecture | `autobyteus-server-ts/tests/unit/api/graphql/studio-application-api-services.test.ts` | Error: Complete Studio application API services are required. |
| Unit/architecture | `autobyteus-server-ts/tests/unit/run-history/services/published-artifact-projection-service.test.ts` | Error: The process AgentRunManager is not initialized. |
| Unit/architecture | `autobyteus-server-ts/tests/unit/run-history/services/team-run-history-catalog-service.test.ts` | AssertionError: expected null to match object { summary: 'first', …(1) } |
| Unit/architecture | `autobyteus-server-ts/tests/unit/agent-customization/processors/response-customization/media-url-transformer-processor.test.ts` | AssertionError: expected false to be true // Object.is equality |
| Unit/architecture | `autobyteus-server-ts/tests/unit/api/graphql/converters/workspace-converter.test.ts` | TypeError: Cannot read properties of undefined (reading 'workspaceId') |
| Unit/architecture | `autobyteus-server-ts/tests/unit/api/graphql/types/memory-view-member-resolver.test.ts` | AssertionError: expected null to deeply equal [ ObjectContaining{…} ] |
| Unit/architecture | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-tool-log-correlation.test.ts` | AssertionError: expected { kind: 'rejected', …(2) } to match object { kind: 'publish' } |
| Integration | `autobyteus-server-ts/tests/integration/api/team-communication-api.integration.test.ts` | Error: The process AgentTeamRunManager is not initialized. |
| Integration | `autobyteus-server-ts/tests/integration/agent/agent-websocket.integration.test.ts` | AssertionError: expected { command_type: 'SEND_MESSAGE', …(7) } to match object { command_type: 'SEND_MESSAGE', …(7) } |
| Integration | `autobyteus-server-ts/tests/integration/agent-execution/agent-run-service.integration.test.ts` | Error: Run package 'agent:run-create-autobyteus' is unavailable. |
| Integration | `autobyteus-server-ts/tests/integration/agent-execution/codex-command-failure-transport.integration.test.ts` | Error: Collaboration member execution identity accepts exactly agentRunId, memberAddress, root. |
| Integration | `autobyteus-server-ts/tests/integration/agent-team-execution/team-run-service.integration.test.ts` | TypeError: this.catalog.assertHistoryIndexReadable is not a function |
| Integration | `autobyteus-server-ts/tests/integration/api/run-file-changes-api.integration.test.ts` | AssertionError: expected [] to deeply equal [ ObjectContaining{…} ] |
| Integration | `autobyteus-server-ts/tests/integration/application-backend/brief-package-team-prompt.integration.test.ts` | Error: Standalone package root is not a directory: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation/applications/brief-studio/dist/importable-package |
| Integration | `autobyteus-server-ts/tests/integration/application-backend/brief-studio-agent-tool-mcp.integration.test.ts` | AssertionError: promise rejected "Error: ENOENT: no such file or directory,… { …(4) }" instead of resolving |
| Integration | `autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` | Error: Expected Brief Studio bundle to be discoverable from the importable package root. |
| Integration | `autobyteus-server-ts/tests/integration/application-backend/brief-studio-team-config.integration.test.ts` | Error: ENOENT: no such file or directory, open '/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation/applications/brief-studio/dist/importable-package/applications/brief-studio/agent-teams/brief-studio-team/team-config.json' |
| Integration | `autobyteus-server-ts/tests/integration/application-backend/standalone-application-server.integration.test.ts` | Error: ENOENT: no such file or directory, scandir '/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation/applications/brief-studio/dist/importable-package' |
| Integration | `autobyteus-server-ts/tests/integration/application-backend/standalone-package-portable-defaults.integration.test.ts` | Error: ENOENT: no such file or directory, lstat '/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation/applications/brief-studio/dist/importable-package' |
| Integration | `autobyteus-server-ts/tests/integration/file-explorer/file-explorer.integration.test.ts` | TypeError: __vite_ssr_import_5__.FileExplorer is not a constructor |
| Integration | `autobyteus-server-ts/tests/integration/file-explorer/nested-folder-move-watcher.integration.test.ts` | TypeError: __vite_ssr_import_5__.FileExplorer is not a constructor |
| Integration | `autobyteus-server-ts/tests/integration/run-history/codex-mcp-tool-args-projection.integration.test.ts` | AssertionError: expected [ 'tool_call', 'tool_result' ] to deeply equal [ 'reasoning', 'tool_call', …(1) ] |
| Integration | `autobyteus-server-ts/tests/integration/agent-definition/md-centric-provider.integration.test.ts` | Error: The property "getInstance" is not defined on the function. |
| Integration | `autobyteus-server-ts/tests/integration/services/media-storage-service.integration.test.ts` | AssertionError: expected false to be true // Object.is equality |
| Integration | `autobyteus-server-ts/tests/integration/api/rest/upload-file.integration.test.ts` | TypeError: Invalid URL |


## Previously repaired E2E cohort to retain and rerun

agent-definitions/agent-packages-graphql; agent-definitions/json-file-persistence-contract; agent-team-definitions/agent-team-definitions-graphql; agent-team-runs/team-run-config-graphql (replaces hierarchical-team-run-config-graphql); app-data-migrations/team-run-v1-production-upgrade; file-explorer/workspace-content-rest; memory-sync/memory-sync-multiprocess; run-history/nested-team-history-restart; run-history/recent-run-projection-graphql; run-history/run-projection-toolcalls-graphql; token-usage/token-usage-analytics-graphql; workspaces/workspaces-graphql. Built-server prerequisite also affected stopped-run-model-config-graphql and custom-provider-readable-id-startup-migration on the repair branch. Preserve AGY transport fixture/coverage and opt-in live tests separately.

## Acceptance/reporting boundary

REQ-010/011; AC-012/013/014. Implementation records implementation-scoped checks; API/E2E owns complete execution ledger and final evidence. Report unresolved product defects to Solution Designer with concrete failing scenario and intended-contract question. No discretionary dropping of user-requested repairs to make AGY release sooner.
