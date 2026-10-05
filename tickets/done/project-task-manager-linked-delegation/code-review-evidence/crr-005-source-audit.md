# CRR-005 independent cumulative source audit

134 source/templates;81 tests/fixtures excluded from source thresholds. Current281-path implementation manifest agrees with actual bytes. Prior195 reviewer paths:191 unchanged,3 source/template +1 test modified;2 previously clean projectors and1 new mapper now in source scope. Unaffected128 previously reviewed source files reuse still-valid prior evidence after hash verification; all6 affected/currently added source paths and their callers/contracts independently inspected.

All source <=500 effective/raw nonempty; max489effective/499raw. Cumulative >220 signals remain AgentRunManager299 and CodexAppServerClientManager232, unchanged; no new IR-005 >220 local correction. Mapper98effective/100raw. Tests not split/scored by implementation thresholds.

| Source | Effective / raw | Cumulative changed lines | >500 | >220 signal |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-collaboration/collaborators/message-recipient-resolution.ts` | 95 / 124 | 33 | Pass | Below |
| `autobyteus-server-ts/src/agent-collaboration/collaborators/task-scoped-message-recipient.ts` | 30 / 31 | 31 | Pass | Below |
| `autobyteus-server-ts/src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | 118 / 118 | 15 | Pass | Below |
| `autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-activation-planner.ts` | 169 / 170 | 51 | Pass | Below |
| `autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts` | 423 / 433 | 106 | Pass | Below |
| `autobyteus-server-ts/src/agent-collaboration/execution/backends/frozen-root-termination-scope.ts` | 53 / 54 | 4 | Pass | Below |
| `autobyteus-server-ts/src/agent-collaboration/execution/backends/root-agent-execution-registry.ts` | 279 / 297 | 67 | Pass | Below |
| `autobyteus-server-ts/src/agent-collaboration/execution/backends/root-team-execution-directory.ts` | 278 / 293 | 108 | Pass | Below |
| `autobyteus-server-ts/src/agent-collaboration/execution/communication/root-communication-adapter.ts` | 38 / 39 | 1 | Pass | Below |
| `autobyteus-server-ts/src/agent-collaboration/execution/communication/root-communication-engine.ts` | 80 / 81 | 10 | Pass | Below |
| `autobyteus-server-ts/src/agent-collaboration/execution/services/active-collaboration-root-directory.ts` | 93 / 95 | 3 | Pass | Below |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-dispatch.ts` | 69 / 70 | 70 | Pass | Below |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-execution-adapter.ts` | 93 / 96 | 110 | Pass | Below |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | 234 / 256 | 142 | Pass | Below |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-lifetime-scope.ts` | 86 / 89 | 89 | Pass | Below |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-delegation-command.ts` | 47 / 50 | 20 | Pass | Below |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-input.ts` | 35 / 36 | 2 | Pass | Below |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-lifetime.ts` | 34 / 34 | 34 | Pass | Below |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-seed-admission.ts` | 10 / 11 | 11 | Pass | Below |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-tree-projection.ts` | 53 / 55 | 5 | Pass | Below |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-lifetime-operation-gate.ts` | 26 / 27 | 27 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/acp/backend/acp-agent-run-backend-factory.ts` | 217 / 225 | 74 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/acp/backend/acp-agent-run-backend.ts` | 107 / 115 | 9 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/agent-run-backend-factory.ts` | 9 / 10 | 10 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/agent-run-backend-preparation.ts` | 58 / 59 | 59 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/backend/agy-agent-run-backend-factory.ts` | 117 / 119 | 32 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/backend/agy-agent-run-backend.ts` | 142 / 144 | 5 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-background-process-groups.ts` | 63 / 76 | 18 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-process.ts` | 138 / 144 | 65 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | 485 / 485 | 50 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-session-state.ts` | 63 / 63 | 11 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend-factory.ts` | 58 / 58 | 88 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | 122 / 122 | 16 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-cleanup.ts` | 36 / 37 | 27 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.ts` | 173 / 173 | 45 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-process.ts` | 112 / 116 | 174 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-state-input.ts` | 23 / 23 | 4 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | 463 / 484 | 35 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.ts` | 57 / 57 | 80 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` | 228 / 228 | 4 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | 390 / 393 | 27 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-cleanup.ts` | 38 / 38 | 16 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/codex/history/codex-thread-history-reader.ts` | 110 / 110 | 5 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-input-submission.ts` | 99 / 99 | 99 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | 233 / 233 | 160 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-release-scope.ts` | 47 / 48 | 48 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | 429 / 430 | 122 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/provider-preparation-guard.ts` | 7 / 8 | 8 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/backends/shared/workspace-skill-materializer.ts` | 312 / 328 | 77 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | 489 / 499 | 32 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts` | 48 / 48 | 7 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/input/agent-run-execution-admission-fence.ts` | 13 / 14 | 14 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/providers/agent-provider-factory-builder.ts` | 210 / 210 | 6 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/runtime/agent-run-activation-registry.ts` | 288 / 288 | 31 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-activation-candidate.ts` | 60 / 64 | 18 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-activation-operation.ts` | 114 / 115 | 115 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | 322 / 324 | 299 | Pass | Retained review signal |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-resource-manager.ts` | 124 / 124 | 53 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/services/managed-agent-run-termination.ts` | 54 / 55 | 11 | Pass | Below |
| `autobyteus-server-ts/src/agent-execution/services/standalone-agent-run-lifecycle-service.ts` | 409 / 412 | 10 | Pass | Below |
| `autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run-options.ts` | 35 / 36 | 36 | Pass | Below |
| `autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run.ts` | 445 / 464 | 86 | Pass | Below |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-communication-adapter.ts` | 75 / 76 | 4 | Pass | Below |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-execution-index.ts` | 308 / 326 | 18 | Pass | Below |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-execution-scope-builder.ts` | 213 / 223 | 5 | Pass | Below |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-recipient-resolver.ts` | 59 / 73 | 2 | Pass | Below |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-task-execution-adapter.ts` | 357 / 359 | 162 | Pass | Below |
| `autobyteus-server-ts/src/agent-run-collaboration/domain/agent-run-collaboration-root.ts` | 457 / 480 | 59 | Pass | Below |
| `autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-communication-adapter.ts` | 76 / 77 | 4 | Pass | Below |
| `autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-execution-index.ts` | 263 / 279 | 18 | Pass | Below |
| `autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-recipient-resolver.ts` | 56 / 67 | 2 | Pass | Below |
| `autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-root-builder.ts` | 168 / 179 | 5 | Pass | Below |
| `autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-task-execution-adapter.ts` | 341 / 347 | 153 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend.ts` | 41 / 42 | 10 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/domain/prepared-task-execution.ts` | 64 / 67 | 53 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/domain/root-team-run.ts` | 436 / 451 | 52 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/domain/task-agent-execution.ts` | 15 / 17 | 2 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/domain/task-team-execution.ts` | 16 / 18 | 3 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` | 83 / 87 | 55 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/local/flat-team-agent-execution-handle.ts` | 187 / 188 | 19 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-callbacks.ts` | 23 / 25 | 1 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-factory.ts` | 164 / 168 | 97 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-manager-options.ts` | 14 / 15 | 15 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-manager.ts` | 453 / 462 | 171 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/local/flat-team-run-backend.ts` | 50 / 50 | 8 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/local/owned-flat-team-runtime-release.ts` | 13 / 14 | 14 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/local/prepare-flat-team-configured-activation.ts` | 25 / 26 | 26 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/local/registries/collaborator-team-execution-registry.ts` | 67 / 73 | 7 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/local/registries/task-agent-execution-registry.ts` | 236 / 255 | 66 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/local/registries/task-team-execution-registry.ts` | 185 / 189 | 114 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/local/task-team-execution-factory.ts` | 78 / 78 | 56 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/services/team-execution-index.ts` | 355 / 376 | 18 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/services/team-flat-execution-callbacks.ts` | 91 / 93 | 2 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/services/team-root-materializer.ts` | 131 / 133 | 9 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-message-delivery.ts` | 102 / 111 | 9 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-resolver.ts` | 95 / 96 | 12 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/team-task-execution-adapter.ts` | 300 / 302 | 160 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/team-task-execution-service-contract.ts` | 37 / 38 | 2 | Pass | Below |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/team-task-execution-service.ts` | 50 / 51 | 21 | Pass | Below |
| `autobyteus-server-ts/src/agent-tools/mcp/scoped-agent-tool-mcp-session-authority.ts` | 227 / 227 | 6 | Pass | Below |
| `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-contract.ts` | 54 / 55 | 4 | Pass | Below |
| `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-manifest.ts` | 61 / 63 | 60 | Pass | Below |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts` | 28 / 28 | 6 | Pass | Below |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts` | 43 / 43 | 4 | Pass | Below |
| `autobyteus-server-ts/src/application-platform/launch-configuration/application-provider-credential-readiness-adapter.ts` | 246 / 246 | 8 | Pass | Below |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` | 31 / 35 | 2 | Pass | Below |
| `autobyteus-server-ts/src/built-in-agents/templates/project-task-manager/agent-config.json` | 12 / 12 | 12 | Pass | Below |
| `autobyteus-server-ts/src/built-in-agents/templates/project-task-manager/agent.md` | 11 / 11 | 11 | Pass | Below |
| `autobyteus-server-ts/src/llm-management/services/codex-model-catalog.ts` | 51 / 51 | 5 | Pass | Below |
| `autobyteus-server-ts/src/persistence/file/store-utils.ts` | 236 / 237 | 2 | Pass | Below |
| `autobyteus-server-ts/src/projects/context/project-task-context-store.ts` | 177 / 181 | 1 | Pass | Below |
| `autobyteus-server-ts/src/projects/domain/models.ts` | 83 / 90 | 2 | Pass | Below |
| `autobyteus-server-ts/src/projects/domain/project-errors.ts` | 30 / 30 | 8 | Pass | Below |
| `autobyteus-server-ts/src/projects/domain/project-task-execution-state.ts` | 47 / 47 | 47 | Pass | Below |
| `autobyteus-server-ts/src/projects/domain/project-task-execution.ts` | 13 / 13 | 13 | Pass | Below |
| `autobyteus-server-ts/src/projects/runtime/project-task-runtime-release.ts` | 43 / 44 | 44 | Pass | Below |
| `autobyteus-server-ts/src/projects/services/project-task-service.ts` | 269 / 271 | 125 | Pass | Below |
| `autobyteus-server-ts/src/projects/stores/project-metadata-schema.ts` | 50 / 54 | 54 | Pass | Below |
| `autobyteus-server-ts/src/projects/stores/project-state-schema.ts` | 93 / 95 | 95 | Pass | Below |
| `autobyteus-server-ts/src/projects/stores/project-store.ts` | 47 / 49 | 148 | Pass | Below |
| `autobyteus-server-ts/src/run-history/domain/run-execution-tree-shared-records.ts` | 128 / 152 | 3 | Pass | Below |
| `autobyteus-server-ts/src/run-history/store/run-execution-tree-shared-record-schemas.ts` | 426 / 448 | 3 | Pass | Below |
| `autobyteus-server-ts/src/runtime-management/acp/acp-agent-process.ts` | 71 / 79 | 25 | Pass | Below |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | 450 / 457 | 109 | Pass | Below |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-process-owner.ts` | 179 / 187 | 187 | Pass | Below |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-session-opening.ts` | 97 / 99 | 99 | Pass | Below |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-streaming-session.ts` | 131 / 140 | 19 | Pass | Below |
| `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.ts` | 106 / 108 | 232 | Pass | Retained review signal |
| `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client.ts` | 355 / 358 | 61 | Pass | Below |
| `autobyteus-server-ts/src/services/agent-streaming/agent-collaboration-view-projector.ts` | 79 / 80 | 7 | Pass | Below |
| `autobyteus-server-ts/src/services/agent-streaming/agent-org-execution-view-projector.ts` | 91 / 91 | 7 | Pass | Below |
| `autobyteus-server-ts/src/services/agent-streaming/collaboration-execution-tree-dto-projection.ts` | 98 / 100 | 100 | Pass | Below |
| `autobyteus-server-ts/src/services/team-communication/team-communication-adapter.ts` | 101 / 102 | 4 | Pass | Below |
| `autobyteus-ts/src/agent/factory/agent-factory.ts` | 213 / 214 | 11 | Pass | Below |

## Current source ownership verdict

- Task tool contract/manifest: one shared native/MCP business result owner; compact ack vs complete business read/exact assignments; full service/cleanup authority not duplicated.
- Shipped Manager template: approved work-only role, stable seven-tool config, no notification/report/resource-management machinery.
- Agent/Org projectors and narrow mapper: one typed current camel-case wire translation at existing streaming boundary; whole recursive forest/source identities preserved; strict DTO parse after projection; existing GraphQL reuse. Team snake-case path remains its own owner.
- Unchanged Task/runtime/root/provider/persistence scope: prior independently reviewed structural/size reasoning reused only after191/195 fingerprint check, current approval/preservation recheck and targeted prior finding102-test selection. Two large cumulative delta signals remain reasoned existing-owner refactors, not forced extra facades.

No dead/compatibility/source-size item requiring removal. Former full mutation echo and Manager resource instructions replaced, not left as fallback. Full internal diagnostic state is required current authority, not obsolete payload.
