# IR-005 Current Source Inventory

Cumulative dirty files (excluding ticket): 281; source/template 134; test/fixture 81. Other 66 (including preserved tracked SDK dist outputs, documentation and build script). Counts are not readiness.

Local IR-005 delta: 8 existing repository paths modified (4 initially dirty +4 previously clean tracked paths), 4 new repository paths. Initial dirty manifest269/273 unchanged; no missing files. Newly dirty tracked paths are not new files. No missing input paths. See JSON manifests for exact fingerprints and changed files.

## Source size guard

Effective = nonempty lines excluding comment-only lines; raw nonempty also reported. No source above500 effective lines. Local new mapper is bounded and no local source delta exceeds220 lines. Larger cumulative deltas remain subject to independent reviewer.

| Effective | Raw nonempty | Source path |
| --- | --- | --- |
| 489 | 499 | `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` |
| 485 | 485 | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` |
| 463 | 484 | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` |
| 457 | 480 | `autobyteus-server-ts/src/agent-run-collaboration/domain/agent-run-collaboration-root.ts` |
| 453 | 462 | `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-manager.ts` |
| 450 | 457 | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` |
| 445 | 464 | `autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run.ts` |
| 436 | 451 | `autobyteus-server-ts/src/agent-team-execution/domain/root-team-run.ts` |
| 429 | 430 | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` |
| 426 | 448 | `autobyteus-server-ts/src/run-history/store/run-execution-tree-shared-record-schemas.ts` |
| 423 | 433 | `autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts` |
| 409 | 412 | `autobyteus-server-ts/src/agent-execution/services/standalone-agent-run-lifecycle-service.ts` |
| 390 | 393 | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` |
| 357 | 359 | `autobyteus-server-ts/src/agent-org-execution/services/agent-org-task-execution-adapter.ts` |
| 355 | 376 | `autobyteus-server-ts/src/agent-team-execution/services/team-execution-index.ts` |
| 355 | 358 | `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client.ts` |
| 341 | 347 | `autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-task-execution-adapter.ts` |
| 322 | 324 | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` |
| 312 | 328 | `autobyteus-server-ts/src/agent-execution/backends/shared/workspace-skill-materializer.ts` |
| 308 | 326 | `autobyteus-server-ts/src/agent-org-execution/services/agent-org-execution-index.ts` |
| 300 | 302 | `autobyteus-server-ts/src/agent-team-execution/task-delegation/team-task-execution-adapter.ts` |
| 288 | 288 | `autobyteus-server-ts/src/agent-execution/runtime/agent-run-activation-registry.ts` |
| 279 | 297 | `autobyteus-server-ts/src/agent-collaboration/execution/backends/root-agent-execution-registry.ts` |
| 278 | 293 | `autobyteus-server-ts/src/agent-collaboration/execution/backends/root-team-execution-directory.ts` |
| 269 | 271 | `autobyteus-server-ts/src/projects/services/project-task-service.ts` |
| 263 | 279 | `autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-execution-index.ts` |
| 246 | 246 | `autobyteus-server-ts/src/application-platform/launch-configuration/application-provider-credential-readiness-adapter.ts` |
| 236 | 255 | `autobyteus-server-ts/src/agent-team-execution/local/registries/task-agent-execution-registry.ts` |
| 236 | 237 | `autobyteus-server-ts/src/persistence/file/store-utils.ts` |
| 234 | 256 | `autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts` |
| 233 | 233 | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` |
| 228 | 228 | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` |
| 227 | 227 | `autobyteus-server-ts/src/agent-tools/mcp/scoped-agent-tool-mcp-session-authority.ts` |
| 217 | 225 | `autobyteus-server-ts/src/agent-execution/backends/acp/backend/acp-agent-run-backend-factory.ts` |
| 213 | 223 | `autobyteus-server-ts/src/agent-org-execution/services/agent-org-execution-scope-builder.ts` |
| 213 | 214 | `autobyteus-ts/src/agent/factory/agent-factory.ts` |
| 210 | 210 | `autobyteus-server-ts/src/agent-execution/providers/agent-provider-factory-builder.ts` |
| 187 | 188 | `autobyteus-server-ts/src/agent-team-execution/local/flat-team-agent-execution-handle.ts` |
| 185 | 189 | `autobyteus-server-ts/src/agent-team-execution/local/registries/task-team-execution-registry.ts` |
| 179 | 187 | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-process-owner.ts` |
| 177 | 181 | `autobyteus-server-ts/src/projects/context/project-task-context-store.ts` |
| 173 | 173 | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.ts` |
| 169 | 170 | `autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-activation-planner.ts` |
| 168 | 179 | `autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-root-builder.ts` |
| 164 | 168 | `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-factory.ts` |
| 142 | 144 | `autobyteus-server-ts/src/agent-execution/backends/antigravity/backend/agy-agent-run-backend.ts` |
| 138 | 144 | `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-process.ts` |
| 131 | 140 | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-streaming-session.ts` |
| 131 | 133 | `autobyteus-server-ts/src/agent-team-execution/services/team-root-materializer.ts` |
| 128 | 152 | `autobyteus-server-ts/src/run-history/domain/run-execution-tree-shared-records.ts` |
| 124 | 124 | `autobyteus-server-ts/src/agent-execution/services/agent-run-resource-manager.ts` |
| 122 | 122 | `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` |
| 118 | 118 | `autobyteus-server-ts/src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` |
| 117 | 119 | `autobyteus-server-ts/src/agent-execution/backends/antigravity/backend/agy-agent-run-backend-factory.ts` |
| 114 | 115 | `autobyteus-server-ts/src/agent-execution/services/agent-run-activation-operation.ts` |
| 112 | 116 | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-process.ts` |
| 110 | 110 | `autobyteus-server-ts/src/agent-execution/backends/codex/history/codex-thread-history-reader.ts` |
| 107 | 115 | `autobyteus-server-ts/src/agent-execution/backends/acp/backend/acp-agent-run-backend.ts` |
| 106 | 108 | `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.ts` |
| 102 | 111 | `autobyteus-server-ts/src/agent-team-execution/services/team-run-message-delivery.ts` |
| 101 | 102 | `autobyteus-server-ts/src/services/team-communication/team-communication-adapter.ts` |
| 99 | 99 | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-input-submission.ts` |
| 98 | 100 | `autobyteus-server-ts/src/services/agent-streaming/collaboration-execution-tree-dto-projection.ts` |
| 97 | 99 | `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-session-opening.ts` |
| 95 | 124 | `autobyteus-server-ts/src/agent-collaboration/collaborators/message-recipient-resolution.ts` |
| 95 | 96 | `autobyteus-server-ts/src/agent-team-execution/services/team-run-resolver.ts` |
| 93 | 96 | `autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-execution-adapter.ts` |
| 93 | 95 | `autobyteus-server-ts/src/projects/stores/project-state-schema.ts` |
| 93 | 95 | `autobyteus-server-ts/src/agent-collaboration/execution/services/active-collaboration-root-directory.ts` |
| 91 | 93 | `autobyteus-server-ts/src/agent-team-execution/services/team-flat-execution-callbacks.ts` |
| 91 | 91 | `autobyteus-server-ts/src/services/agent-streaming/agent-org-execution-view-projector.ts` |
| 86 | 89 | `autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-lifetime-scope.ts` |
| 83 | 90 | `autobyteus-server-ts/src/projects/domain/models.ts` |
| 83 | 87 | `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` |
| 80 | 81 | `autobyteus-server-ts/src/agent-collaboration/execution/communication/root-communication-engine.ts` |
| 79 | 80 | `autobyteus-server-ts/src/services/agent-streaming/agent-collaboration-view-projector.ts` |
| 78 | 78 | `autobyteus-server-ts/src/agent-team-execution/local/task-team-execution-factory.ts` |
| 76 | 77 | `autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-communication-adapter.ts` |
| 75 | 76 | `autobyteus-server-ts/src/agent-org-execution/services/agent-org-communication-adapter.ts` |
| 71 | 79 | `autobyteus-server-ts/src/runtime-management/acp/acp-agent-process.ts` |
| 69 | 70 | `autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-dispatch.ts` |
| 67 | 73 | `autobyteus-server-ts/src/agent-team-execution/local/registries/collaborator-team-execution-registry.ts` |
| 64 | 67 | `autobyteus-server-ts/src/agent-team-execution/domain/prepared-task-execution.ts` |
| 63 | 76 | `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-background-process-groups.ts` |
| 63 | 63 | `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-session-state.ts` |
| 61 | 63 | `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-manifest.ts` |
| 60 | 64 | `autobyteus-server-ts/src/agent-execution/services/agent-run-activation-candidate.ts` |
| 59 | 73 | `autobyteus-server-ts/src/agent-org-execution/services/agent-org-recipient-resolver.ts` |
| 58 | 59 | `autobyteus-server-ts/src/agent-execution/backends/agent-run-backend-preparation.ts` |
| 58 | 58 | `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend-factory.ts` |
| 57 | 57 | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.ts` |
| 56 | 67 | `autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-recipient-resolver.ts` |
| 54 | 55 | `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-contract.ts` |
| 54 | 55 | `autobyteus-server-ts/src/agent-execution/services/managed-agent-run-termination.ts` |
| 53 | 55 | `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-tree-projection.ts` |
| 53 | 54 | `autobyteus-server-ts/src/agent-collaboration/execution/backends/frozen-root-termination-scope.ts` |
| 51 | 51 | `autobyteus-server-ts/src/llm-management/services/codex-model-catalog.ts` |
| 50 | 54 | `autobyteus-server-ts/src/projects/stores/project-metadata-schema.ts` |
| 50 | 51 | `autobyteus-server-ts/src/agent-team-execution/task-delegation/team-task-execution-service.ts` |
| 50 | 50 | `autobyteus-server-ts/src/agent-team-execution/local/flat-team-run-backend.ts` |
| 48 | 48 | `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts` |
| 47 | 50 | `autobyteus-server-ts/src/agent-collaboration/execution/task/task-delegation-command.ts` |
| 47 | 49 | `autobyteus-server-ts/src/projects/stores/project-store.ts` |
| 47 | 48 | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-release-scope.ts` |
| 47 | 47 | `autobyteus-server-ts/src/projects/domain/project-task-execution-state.ts` |
| 43 | 44 | `autobyteus-server-ts/src/projects/runtime/project-task-runtime-release.ts` |
| 43 | 43 | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts` |
| 41 | 42 | `autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend.ts` |
| 38 | 39 | `autobyteus-server-ts/src/agent-collaboration/execution/communication/root-communication-adapter.ts` |
| 38 | 38 | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-cleanup.ts` |
| 37 | 38 | `autobyteus-server-ts/src/agent-team-execution/task-delegation/team-task-execution-service-contract.ts` |
| 36 | 37 | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-cleanup.ts` |
| 35 | 36 | `autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run-options.ts` |
| 35 | 36 | `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-input.ts` |
| 34 | 34 | `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-lifetime.ts` |
| 31 | 35 | `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` |
| 30 | 31 | `autobyteus-server-ts/src/agent-collaboration/collaborators/task-scoped-message-recipient.ts` |
| 30 | 30 | `autobyteus-server-ts/src/projects/domain/project-errors.ts` |
| 28 | 28 | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts` |
| 26 | 27 | `autobyteus-server-ts/src/agent-collaboration/execution/task/task-lifetime-operation-gate.ts` |
| 25 | 26 | `autobyteus-server-ts/src/agent-team-execution/local/prepare-flat-team-configured-activation.ts` |
| 23 | 25 | `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-callbacks.ts` |
| 23 | 23 | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-state-input.ts` |
| 16 | 18 | `autobyteus-server-ts/src/agent-team-execution/domain/task-team-execution.ts` |
| 15 | 17 | `autobyteus-server-ts/src/agent-team-execution/domain/task-agent-execution.ts` |
| 14 | 15 | `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-manager-options.ts` |
| 13 | 14 | `autobyteus-server-ts/src/agent-team-execution/local/owned-flat-team-runtime-release.ts` |
| 13 | 14 | `autobyteus-server-ts/src/agent-execution/input/agent-run-execution-admission-fence.ts` |
| 13 | 13 | `autobyteus-server-ts/src/projects/domain/project-task-execution.ts` |
| 12 | 12 | `autobyteus-server-ts/src/built-in-agents/templates/project-task-manager/agent-config.json` |
| 11 | 11 | `autobyteus-server-ts/src/built-in-agents/templates/project-task-manager/agent.md` |
| 10 | 11 | `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-seed-admission.ts` |
| 9 | 10 | `autobyteus-server-ts/src/agent-execution/backends/agent-run-backend-factory.ts` |
| 7 | 8 | `autobyteus-server-ts/src/agent-execution/backends/provider-preparation-guard.ts` |

## Local paths

- `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-contract.ts`
- `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-manifest.ts`
- `autobyteus-server-ts/src/built-in-agents/templates/project-task-manager/agent.md`
- `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-collaboration-view-projector.ts`
- `autobyteus-server-ts/src/services/agent-streaming/agent-org-execution-view-projector.ts`
- `autobyteus-server-ts/src/services/agent-streaming/collaboration-execution-tree-dto-projection.ts`
- `autobyteus-server-ts/tests/fixtures/collaboration-public-projection-fixtures.ts`
- `autobyteus-server-ts/tests/unit/agent-tools/project-tasks/project-task-business-results.test.ts`
- `autobyteus-server-ts/tests/unit/agent-tools/project-tasks/project-task-tools.test.ts`
- `autobyteus-server-ts/tests/unit/services/agent-streaming/collaboration-public-tree-projection.test.ts`
- `autobyteus-server-ts/tests/unit/services/agent-streaming/team-execution-view-projector.test.ts`
