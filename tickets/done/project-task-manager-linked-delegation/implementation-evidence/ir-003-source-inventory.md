# IR-003 current source/test inventory

Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation`. Branch: `codex/project-task-manager-linked-delegation`. Base/HEAD: `806907faeb567d2b703e10fe984fcd01be0b41fd`. Uncommitted, no reset or finalization.

156 tracked changed files; 131 changed/new source files (including Manager templates); 61 changed/new tests/fixtures. Generated SDK dist outputs, test databases and ticket artifacts are separate, not implementation source.

Effective nonempty count excludes comment-only/block-comment lines, not executable/string content. Raw nonempty count is also shown. 500-line source guard is satisfied. Added+removed >220 lines is a review/refactor signal, not hidden by net counts.

| Source path | Status | Effective / raw nonempty | + / - tracked |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-collaboration/collaborators/message-recipient-resolution.ts` | Modify | 95 / 124 | 26 / 7 |
| `autobyteus-server-ts/src/agent-collaboration/collaborators/task-scoped-message-recipient.ts` | Add | 30 / 31 | 0 / 0 |
| `autobyteus-server-ts/src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | Modify | 118 / 118 | 12 / 3 |
| `autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-activation-planner.ts` | Modify | 169 / 170 | 25 / 26 |
| `autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts` | Modify | 423 / 433 | 83 / 23 |
| `autobyteus-server-ts/src/agent-collaboration/execution/backends/frozen-root-termination-scope.ts` | Modify | 53 / 54 | 3 / 1 |
| `autobyteus-server-ts/src/agent-collaboration/execution/backends/root-agent-execution-registry.ts` | Modify | 279 / 297 | 52 / 15 |
| `autobyteus-server-ts/src/agent-collaboration/execution/backends/root-team-execution-directory.ts` | Modify | 276 / 291 | 76 / 30 |
| `autobyteus-server-ts/src/agent-collaboration/execution/communication/root-communication-adapter.ts` | Modify | 38 / 39 | 1 / 0 |
| `autobyteus-server-ts/src/agent-collaboration/execution/communication/root-communication-engine.ts` | Modify | 80 / 81 | 9 / 1 |
| `autobyteus-server-ts/src/agent-collaboration/execution/services/active-collaboration-root-directory.ts` | Modify | 93 / 95 | 3 / 0 |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-dispatch.ts` | Add | 69 / 70 | 0 / 0 |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-execution-adapter.ts` | Modify | 93 / 96 | 80 / 30 |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | Modify | 234 / 256 | 103 / 39 |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-lifetime-scope.ts` | Add | 86 / 89 | 0 / 0 |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-delegation-command.ts` | Modify | 47 / 50 | 15 / 5 |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-input.ts` | Modify | 35 / 36 | 1 / 1 |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-lifetime.ts` | Add | 34 / 34 | 0 / 0 |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-seed-admission.ts` | Add | 10 / 11 | 0 / 0 |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-tree-projection.ts` | Modify | 53 / 55 | 5 / 0 |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-lifetime-operation-gate.ts` | Add | 26 / 27 | 0 / 0 |
| `autobyteus-server-ts/src/agent-execution/backends/acp/backend/acp-agent-run-backend-factory.ts` | Modify | 217 / 225 | 55 / 19 |
| `autobyteus-server-ts/src/agent-execution/backends/acp/backend/acp-agent-run-backend.ts` | Modify | 107 / 115 | 2 / 7 |
| `autobyteus-server-ts/src/agent-execution/backends/agent-run-backend-factory.ts` | Modify | 9 / 10 | 7 / 3 |
| `autobyteus-server-ts/src/agent-execution/backends/agent-run-backend-preparation.ts` | Add | 58 / 59 | 0 / 0 |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/backend/agy-agent-run-backend-factory.ts` | Modify | 117 / 119 | 25 / 7 |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/backend/agy-agent-run-backend.ts` | Modify | 142 / 144 | 3 / 2 |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-background-process-groups.ts` | Modify | 63 / 76 | 16 / 2 |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-process.ts` | Modify | 138 / 144 | 50 / 15 |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Modify | 485 / 485 | 46 / 4 |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-session-state.ts` | Modify | 63 / 63 | 9 / 2 |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend-factory.ts` | Modify | 58 / 58 | 39 / 49 |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | Modify | 122 / 122 | 13 / 3 |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-cleanup.ts` | Modify | 36 / 37 | 20 / 7 |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.ts` | Modify | 173 / 173 | 33 / 12 |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-process.ts` | Modify | 112 / 116 | 76 / 98 |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-state-input.ts` | Modify | 23 / 23 | 2 / 2 |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Modify | 463 / 484 | 15 / 20 |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.ts` | Modify | 57 / 57 | 35 / 45 |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` | Modify | 228 / 228 | 2 / 2 |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Modify | 390 / 393 | 17 / 10 |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-cleanup.ts` | Modify | 38 / 38 | 1 / 15 |
| `autobyteus-server-ts/src/agent-execution/backends/codex/history/codex-thread-history-reader.ts` | Modify | 110 / 110 | 3 / 2 |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-input-submission.ts` | Add | 99 / 99 | 0 / 0 |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | Modify | 233 / 233 | 82 / 78 |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-release-scope.ts` | Add | 47 / 48 | 0 / 0 |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread.ts` | Modify | 429 / 430 | 24 / 98 |
| `autobyteus-server-ts/src/agent-execution/backends/provider-preparation-guard.ts` | Add | 7 / 8 | 0 / 0 |
| `autobyteus-server-ts/src/agent-execution/backends/shared/workspace-skill-materializer.ts` | Modify | 312 / 328 | 48 / 29 |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | Modify | 489 / 499 | 22 / 10 |
| `autobyteus-server-ts/src/agent-execution/domain/agent-status-payload.ts` | Modify | 48 / 48 | 7 / 0 |
| `autobyteus-server-ts/src/agent-execution/input/agent-run-execution-admission-fence.ts` | Add | 13 / 14 | 0 / 0 |
| `autobyteus-server-ts/src/agent-execution/providers/agent-provider-factory-builder.ts` | Modify | 210 / 210 | 3 / 3 |
| `autobyteus-server-ts/src/agent-execution/runtime/agent-run-activation-registry.ts` | Modify | 288 / 288 | 27 / 4 |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-activation-candidate.ts` | Modify | 60 / 64 | 8 / 10 |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-activation-operation.ts` | Add | 114 / 115 | 0 / 0 |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Modify | 322 / 324 | 64 / 235 |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-resource-manager.ts` | Modify | 124 / 124 | 25 / 28 |
| `autobyteus-server-ts/src/agent-execution/services/managed-agent-run-termination.ts` | Modify | 54 / 55 | 6 / 5 |
| `autobyteus-server-ts/src/agent-execution/services/standalone-agent-run-lifecycle-service.ts` | Modify | 409 / 412 | 5 / 5 |
| `autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run-options.ts` | Add | 35 / 36 | 0 / 0 |
| `autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run.ts` | Modify | 445 / 464 | 34 / 52 |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-communication-adapter.ts` | Modify | 75 / 76 | 4 / 0 |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-execution-index.ts` | Modify | 308 / 326 | 18 / 0 |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-execution-scope-builder.ts` | Modify | 213 / 223 | 5 / 0 |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-recipient-resolver.ts` | Modify | 59 / 73 | 2 / 0 |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-task-execution-adapter.ts` | Modify | 357 / 359 | 111 / 51 |
| `autobyteus-server-ts/src/agent-run-collaboration/domain/agent-run-collaboration-root.ts` | Modify | 457 / 480 | 32 / 27 |
| `autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-communication-adapter.ts` | Modify | 76 / 77 | 4 / 0 |
| `autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-execution-index.ts` | Modify | 263 / 279 | 18 / 0 |
| `autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-recipient-resolver.ts` | Modify | 56 / 67 | 2 / 0 |
| `autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-root-builder.ts` | Modify | 168 / 179 | 5 / 0 |
| `autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-task-execution-adapter.ts` | Modify | 341 / 347 | 111 / 42 |
| `autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend.ts` | Modify | 41 / 42 | 7 / 3 |
| `autobyteus-server-ts/src/agent-team-execution/domain/prepared-task-execution.ts` | Modify | 64 / 67 | 52 / 1 |
| `autobyteus-server-ts/src/agent-team-execution/domain/root-team-run.ts` | Modify | 436 / 451 | 28 / 24 |
| `autobyteus-server-ts/src/agent-team-execution/domain/task-agent-execution.ts` | Modify | 15 / 17 | 1 / 1 |
| `autobyteus-server-ts/src/agent-team-execution/domain/task-team-execution.ts` | Modify | 16 / 18 | 2 / 1 |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` | Modify | 47 / 48 | 6 / 2 |
| `autobyteus-server-ts/src/agent-team-execution/local/flat-team-agent-execution-handle.ts` | Modify | 187 / 188 | 14 / 5 |
| `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-callbacks.ts` | Modify | 23 / 25 | 1 / 0 |
| `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-factory.ts` | Modify | 164 / 168 | 73 / 24 |
| `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-manager-options.ts` | Add | 14 / 15 | 0 / 0 |
| `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-manager.ts` | Modify | 452 / 460 | 67 / 102 |
| `autobyteus-server-ts/src/agent-team-execution/local/flat-team-run-backend.ts` | Modify | 50 / 50 | 6 / 2 |
| `autobyteus-server-ts/src/agent-team-execution/local/owned-flat-team-runtime-release.ts` | Add | 13 / 14 | 0 / 0 |
| `autobyteus-server-ts/src/agent-team-execution/local/prepare-flat-team-configured-activation.ts` | Add | 25 / 26 | 0 / 0 |
| `autobyteus-server-ts/src/agent-team-execution/local/registries/collaborator-team-execution-registry.ts` | Modify | 67 / 73 | 4 / 3 |
| `autobyteus-server-ts/src/agent-team-execution/local/registries/task-agent-execution-registry.ts` | Modify | 236 / 255 | 46 / 20 |
| `autobyteus-server-ts/src/agent-team-execution/local/registries/task-team-execution-registry.ts` | Modify | 185 / 189 | 80 / 34 |
| `autobyteus-server-ts/src/agent-team-execution/local/task-team-execution-factory.ts` | Modify | 78 / 78 | 29 / 27 |
| `autobyteus-server-ts/src/agent-team-execution/services/team-execution-index.ts` | Modify | 355 / 376 | 18 / 0 |
| `autobyteus-server-ts/src/agent-team-execution/services/team-flat-execution-callbacks.ts` | Modify | 91 / 93 | 2 / 0 |
| `autobyteus-server-ts/src/agent-team-execution/services/team-root-materializer.ts` | Modify | 131 / 133 | 7 / 2 |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-message-delivery.ts` | Modify | 102 / 111 | 4 / 5 |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-resolver.ts` | Modify | 91 / 92 | 6 / 2 |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/team-task-execution-adapter.ts` | Modify | 300 / 302 | 103 / 57 |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/team-task-execution-service-contract.ts` | Modify | 37 / 38 | 2 / 0 |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/team-task-execution-service.ts` | Modify | 50 / 51 | 20 / 1 |
| `autobyteus-server-ts/src/agent-tools/mcp/scoped-agent-tool-mcp-session-authority.ts` | Modify | 227 / 227 | 4 / 2 |
| `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-contract.ts` | Modify | 54 / 55 | 2 / 2 |
| `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-manifest.ts` | Modify | 27 / 27 | 1 / 1 |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts` | Modify | 28 / 28 | 4 / 2 |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts` | Modify | 43 / 43 | 3 / 1 |
| `autobyteus-server-ts/src/application-platform/launch-configuration/application-provider-credential-readiness-adapter.ts` | Modify | 246 / 246 | 4 / 4 |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` | Modify | 31 / 35 | 2 / 0 |
| `autobyteus-server-ts/src/built-in-agents/templates/project-task-manager/agent-config.json` | Add | 12 / 12 | 0 / 0 |
| `autobyteus-server-ts/src/built-in-agents/templates/project-task-manager/agent.md` | Add | 13 / 13 | 0 / 0 |
| `autobyteus-server-ts/src/llm-management/services/codex-model-catalog.ts` | Modify | 51 / 51 | 3 / 2 |
| `autobyteus-server-ts/src/persistence/file/store-utils.ts` | Modify | 236 / 237 | 2 / 0 |
| `autobyteus-server-ts/src/projects/context/project-task-context-store.ts` | Modify | 177 / 181 | 1 / 0 |
| `autobyteus-server-ts/src/projects/domain/models.ts` | Modify | 83 / 90 | 2 / 0 |
| `autobyteus-server-ts/src/projects/domain/project-errors.ts` | Modify | 30 / 30 | 7 / 1 |
| `autobyteus-server-ts/src/projects/domain/project-task-execution-state.ts` | Add | 47 / 47 | 0 / 0 |
| `autobyteus-server-ts/src/projects/domain/project-task-execution.ts` | Add | 13 / 13 | 0 / 0 |
| `autobyteus-server-ts/src/projects/runtime/project-task-runtime-release.ts` | Add | 43 / 44 | 0 / 0 |
| `autobyteus-server-ts/src/projects/services/project-task-service.ts` | Modify | 269 / 271 | 112 / 13 |
| `autobyteus-server-ts/src/projects/stores/project-metadata-schema.ts` | Add | 50 / 54 | 0 / 0 |
| `autobyteus-server-ts/src/projects/stores/project-state-schema.ts` | Add | 93 / 95 | 0 / 0 |
| `autobyteus-server-ts/src/projects/stores/project-store.ts` | Modify | 47 / 49 | 40 / 108 |
| `autobyteus-server-ts/src/run-history/domain/run-execution-tree-shared-records.ts` | Modify | 128 / 152 | 3 / 0 |
| `autobyteus-server-ts/src/run-history/store/run-execution-tree-shared-record-schemas.ts` | Modify | 426 / 448 | 3 / 0 |
| `autobyteus-server-ts/src/runtime-management/acp/acp-agent-process.ts` | Modify | 71 / 79 | 20 / 5 |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Modify | 450 / 457 | 50 / 59 |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-process-owner.ts` | Add | 179 / 187 | 0 / 0 |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-session-opening.ts` | Add | 97 / 99 | 0 / 0 |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-streaming-session.ts` | Modify | 131 / 140 | 11 / 8 |
| `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.ts` | Modify | 106 / 108 | 78 / 154 |
| `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client.ts` | Modify | 355 / 358 | 38 / 23 |
| `autobyteus-server-ts/src/services/team-communication/team-communication-adapter.ts` | Modify | 101 / 102 | 4 / 0 |
| `autobyteus-ts/src/agent/factory/agent-factory.ts` | Modify | 213 / 214 | 8 / 3 |

## Structural signals

Bounded configuration/input/lifetime/cleanup concerns are split into dedicated files. AgentRun status hint moved to the status subject file; RootTask dispatch/lifetime scope separated; Codex thread input/release separated; Claude physical child/opening are separate concrete owners; Flat Team private preparation and owned release separated. All source files remain <=500 effective nonempty lines.

- `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`: 299 changed lines. Review the replacement of discarded/Promise-only authority and extraction into its owning controls, not a compatibility path.
- `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.ts`: 232 changed lines. Review the replacement of discarded/Promise-only authority and extraction into its owning controls, not a compatibility path.

## Changed/new tests and fixtures

- `autobyteus-server-ts/tests/fixtures/agent-run-preparation-fixtures.ts`
- `autobyteus-server-ts/tests/fixtures/claude-owned-sdk-cli.mjs`
- `autobyteus-server-ts/tests/fixtures/configured-root-first-work-fixture.ts`
- `autobyteus-server-ts/tests/helpers/fake-claude-streaming-sdk.ts`
- `autobyteus-server-ts/tests/unit/agent-collaboration/configured-agent-activation-planner.test.ts`
- `autobyteus-server-ts/tests/unit/agent-collaboration/configured-agent-execution-handle.test.ts`
- `autobyteus-server-ts/tests/unit/agent-collaboration/configured-root-first-work.test.ts`
- `autobyteus-server-ts/tests/unit/agent-collaboration/root-task-execution-lifecycle.test.ts`
- `autobyteus-server-ts/tests/unit/agent-collaboration/task-lifetime-dispatch-races.test.ts`
- `autobyteus-server-ts/tests/unit/agent-collaboration/task-lifetime-tree-scope.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/agent-run-manager.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/agent-run-resource-manager.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/acp/acp-agent-run-backend-factory.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-agent-run-backend-factory.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-background-process-groups.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-mcp-team-live.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-restore-live.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-stream-process.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/backend/claude-session-bootstrapper.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-cleanup.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-manager.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/backends/shared/workspace-skill-materializer.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/root-recovery-command.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/services/agent-run-activation-operation.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/standalone-agent-run-lifecycle-service.test.ts`
- `autobyteus-server-ts/tests/unit/agent-org-execution/agent-org-execution-scope-builder.test.ts`
- `autobyteus-server-ts/tests/unit/agent-org-execution/agent-org-member-scope.test.ts`
- `autobyteus-server-ts/tests/unit/agent-org-execution/agent-org-run-termination.test.ts`
- `autobyteus-server-ts/tests/unit/agent-org-execution/agent-org-status-snapshot-traversal.test.ts`
- `autobyteus-server-ts/tests/unit/agent-org-execution/agent-org-task-publication.test.ts`
- `autobyteus-server-ts/tests/unit/agent-org-execution/helpers/task-publication-handles.ts`
- `autobyteus-server-ts/tests/unit/agent-team-execution/agent-team-collaboration-llm-contract.test.ts`
- `autobyteus-server-ts/tests/unit/agent-team-execution/flat-team-execution-factory.test.ts`
- `autobyteus-server-ts/tests/unit/agent-team-execution/flat-team-execution-manager-routing.test.ts`
- `autobyteus-server-ts/tests/unit/agent-team-execution/inter-agent-message-router-claude-input-admission.test.ts`
- `autobyteus-server-ts/tests/unit/agent-team-execution/task-agent-execution-registry-liveness.test.ts`
- `autobyteus-server-ts/tests/unit/agent-team-execution/task-agent-execution-registry-memory.test.ts`
- `autobyteus-server-ts/tests/unit/agent-team-execution/team-root-agent-initiated-collaborators.test.ts`
- `autobyteus-server-ts/tests/unit/agent-tools/mcp/scoped-agent-tool-mcp-session-authority.test.ts`
- `autobyteus-server-ts/tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts`
- `autobyteus-server-ts/tests/unit/agent-tools/task-delegation/task-delegation-work-source.test.ts`
- `autobyteus-server-ts/tests/unit/application-platform/application-provider-credential-readiness-adapter.test.ts`
- `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts`
- `autobyteus-server-ts/tests/unit/projects/project-service.test.ts`
- `autobyteus-server-ts/tests/unit/projects/project-state-schema.test.ts`
- `autobyteus-server-ts/tests/unit/projects/project-task-lifetime.test.ts`
- `autobyteus-server-ts/tests/unit/projects/project-task-service.test.ts`
- `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts`
- `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-process-owner.test.ts`
- `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-real-child-retry.test.ts`
- `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-session-opening.test.ts`
- `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-streaming-session.test.ts`
- `autobyteus-server-ts/tests/unit/runtime-management/codex/client/codex-app-server-client-manager.test.ts`
- `autobyteus-server-ts/tests/unit/runtime-management/codex/client/codex-app-server-client.test.ts`
- `autobyteus-ts/tests/unit/agent/factory/agent-factory.test.ts`

## Removed unshipped target

This ticket’s untracked `app-data-migrations/migrations/project-task-lifetime-state/{released-project-array.ts,project-task-lifetime-state-app-data-migration.ts}` and converter-specific unit test were removed. Registry and both production startup entry files are byte-identical to HEAD. No released migration/classifier/terminal ledger source/test was edited. SR-011 physical array uses one current decoder/exact serializer; no envelope fallback.

## Supplemental same-base evidence

`ir-003-unchanged-startup-migrations.diff` is empty (git diff exit0). Released migration unit failures in `ir-003-stores-startup-unit.log` were not patched or relabeled an executable baseline pass; prior broad unit audit is historical, not current totals.
