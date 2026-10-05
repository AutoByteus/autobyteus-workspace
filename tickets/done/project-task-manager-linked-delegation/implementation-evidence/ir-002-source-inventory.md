# IR-002 partial implementation inventory

Uncommitted and incomplete; not a reviewed/validated delivery. Nonempty physical lines include comments. Effective source lines exclude standalone block/line comments; this lightweight count is a size-pressure check, not a TS parser. Generated dist and ticket artifacts excluded.

Tracked changed files: 98. Source files (tracked changes + untracked additions): 119. Changed/new test files: 3.

## Tracked delta

```text
 .../collaborators/message-recipient-resolution.ts  |  33 ++-
 .../agent-team-collaboration-llm-contract.ts       |  15 +-
 .../configured-agent-activation-planner.ts         |  51 ++--
 .../backends/configured-agent-execution-handle.ts  | 100 +++++--
 .../backends/root-agent-execution-registry.ts      |  67 +++--
 .../backends/root-team-execution-directory.ts      |  63 +++--
 .../communication/root-communication-adapter.ts    |   1 +
 .../communication/root-communication-engine.ts     |  10 +-
 .../active-collaboration-root-directory.ts         |   3 +
 .../execution/task/root-task-execution-adapter.ts  | 105 +++++---
 .../task/root-task-execution-lifecycle.ts          | 118 ++++++---
 .../execution/task/task-delegation-command.ts      |  20 +-
 .../execution/task/task-execution-input.ts         |   2 +-
 .../task/task-execution-tree-projection.ts         |   5 +
 .../acp/backend/acp-agent-run-backend-factory.ts   |  74 ++++--
 .../backends/acp/backend/acp-agent-run-backend.ts  |   9 +-
 .../backends/agent-run-backend-factory.ts          |  10 +-
 .../backend/agy-agent-run-backend-factory.ts       |  32 ++-
 .../antigravity/backend/agy-agent-run-backend.ts   |   5 +-
 .../stream/agy-background-process-groups.ts        |  14 +-
 .../antigravity/stream/agy-stream-process.ts       |  50 +++-
 .../autobyteus-agent-run-backend-factory.ts        |  50 +++-
 .../backend/claude-agent-run-backend-factory.ts    |  88 +++----
 .../claude/backend/claude-session-bootstrapper.ts  |  16 +-
 .../claude/session/claude-session-manager.ts       |  39 ++-
 .../claude/session/claude-session-process.ts       |  18 +-
 .../backends/claude/session/claude-session.ts      |  15 +-
 .../backend/codex-agent-run-backend-factory.ts     |  80 +++---
 .../codex/backend/codex-agent-run-backend.ts       |   4 +-
 .../codex/backend/codex-thread-bootstrapper.ts     |  27 +-
 .../backends/codex/backend/codex-thread-cleanup.ts |  16 +-
 .../codex/history/codex-thread-history-reader.ts   |   5 +-
 .../backends/codex/thread/codex-thread-manager.ts  | 160 +++++------
 .../shared/workspace-skill-materializer.ts         |  77 ++++--
 .../src/agent-execution/domain/agent-run.ts        |  21 +-
 .../runtime/agent-run-activation-registry.ts       |  26 +-
 .../services/agent-run-activation-candidate.ts     |   8 +-
 .../agent-execution/services/agent-run-manager.ts  | 291 ++++-----------------
 .../services/agent-run-resource-manager.ts         |  53 ++--
 .../services/managed-agent-run-termination.ts      |   2 +-
 .../standalone-agent-run-lifecycle-service.ts      |  10 +-
 .../agent-org-execution/domain/agent-org-run.ts    |  53 ++--
 .../services/agent-org-communication-adapter.ts    |   4 +
 .../services/agent-org-execution-index.ts          |  18 ++
 .../services/agent-org-execution-scope-builder.ts  |   5 +
 .../services/agent-org-recipient-resolver.ts       |   2 +
 .../services/agent-org-task-execution-adapter.ts   | 151 +++++++----
 .../domain/agent-run-collaboration-root.ts         |  31 ++-
 ...gent-run-collaboration-communication-adapter.ts |   4 +
 .../agent-run-collaboration-execution-index.ts     |  18 ++
 .../agent-run-collaboration-recipient-resolver.ts  |   2 +
 .../agent-run-collaboration-root-builder.ts        |   5 +
 ...ent-run-collaboration-task-execution-adapter.ts | 142 +++++++---
 .../backends/team-run-backend.ts                   |  10 +-
 .../domain/prepared-task-execution.ts              |  51 +++-
 .../agent-team-execution/domain/root-team-run.ts   |  23 +-
 .../domain/task-agent-execution.ts                 |   2 +-
 .../domain/task-team-execution.ts                  |   2 +-
 .../src/agent-team-execution/domain/team-run.ts    |   8 +-
 .../local/flat-team-agent-execution-handle.ts      |  19 +-
 .../local/flat-team-execution-callbacks.ts         |   1 +
 .../local/flat-team-execution-factory.ts           |  90 +++++--
 .../local/flat-team-execution-manager.ts           | 115 ++++----
 .../local/flat-team-run-backend.ts                 |   8 +-
 .../collaborator-team-execution-registry.ts        |   7 +-
 .../registries/task-agent-execution-registry.ts    |  64 +++--
 .../registries/task-team-execution-registry.ts     |  85 +++---
 .../local/task-team-execution-factory.ts           |  39 +--
 .../services/team-execution-index.ts               |  18 ++
 .../services/team-flat-execution-callbacks.ts      |   2 +
 .../services/team-root-materializer.ts             |   9 +-
 .../services/team-run-message-delivery.ts          |   9 +-
 .../task-delegation/team-task-execution-adapter.ts | 150 +++++++----
 .../team-task-execution-service-contract.ts        |   2 +
 .../task-delegation/team-task-execution-service.ts |  16 +-
 .../project-tasks/project-task-tool-contract.ts    |   4 +-
 .../project-tasks/project-task-tool-manifest.ts    |   2 +-
 .../task-delegation-tool-input-parsers.ts          |   6 +-
 .../task-delegation-tool-parameter-schemas.ts      |   4 +-
 .../app-data-migration-registry.ts                 |   2 +
 ...cation-provider-credential-readiness-adapter.ts |   8 +-
 .../src/built-in-agents/built-in-agent-registry.ts |   2 +
 .../llm-management/services/codex-model-catalog.ts |   5 +-
 .../src/persistence/file/store-utils.ts            |   2 +
 autobyteus-server-ts/src/projects/domain/models.ts |   2 +
 .../src/projects/domain/project-errors.ts          |   8 +-
 .../src/projects/services/project-task-service.ts  | 124 ++++++++-
 .../src/projects/stores/project-store.ts           | 132 ++--------
 .../domain/run-execution-tree-shared-records.ts    |   3 +
 .../run-execution-tree-shared-record-schemas.ts    |   3 +
 .../runtime-management/acp/acp-agent-process.ts    |  25 +-
 .../claude/client/claude-sdk-streaming-session.ts  |   6 +-
 .../client/codex-app-server-client-manager.ts      | 233 ++++++-----------
 .../codex/client/codex-app-server-client.ts        |  39 ++-
 .../team-communication-adapter.ts                  |   4 +
 .../root-task-execution-lifecycle.test.ts          |  31 ++-
 .../unit/projects/project-task-service.test.ts     |   3 +-
 autobyteus-ts/src/agent/factory/agent-factory.ts   |   6 +-
 98 files changed, 2166 insertions(+), 1446 deletions(-)
```

## Source files

| File | Nonempty | Effective |
| --- | ---: | ---: |
| `autobyteus-server-ts/src/agent-collaboration/collaborators/message-recipient-resolution.ts` | 124 | 95 |
| `autobyteus-server-ts/src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` | 118 | 118 |
| `autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-activation-planner.ts` | 170 | 169 |
| `autobyteus-server-ts/src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts` | 431 | 422 |
| `autobyteus-server-ts/src/agent-collaboration/execution/backends/root-agent-execution-registry.ts` | 297 | 279 |
| `autobyteus-server-ts/src/agent-collaboration/execution/backends/root-team-execution-directory.ts` | 274 | 261 |
| `autobyteus-server-ts/src/agent-collaboration/execution/communication/root-communication-adapter.ts` | 39 | 38 |
| `autobyteus-server-ts/src/agent-collaboration/execution/communication/root-communication-engine.ts` | 81 | 80 |
| `autobyteus-server-ts/src/agent-collaboration/execution/services/active-collaboration-root-directory.ts` | 95 | 93 |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-execution-adapter.ts` | 91 | 89 |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | 237 | 216 |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-delegation-command.ts` | 50 | 47 |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-input.ts` | 36 | 35 |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-tree-projection.ts` | 55 | 53 |
| `autobyteus-server-ts/src/agent-execution/backends/acp/backend/acp-agent-run-backend-factory.ts` | 225 | 217 |
| `autobyteus-server-ts/src/agent-execution/backends/acp/backend/acp-agent-run-backend.ts` | 115 | 107 |
| `autobyteus-server-ts/src/agent-execution/backends/agent-run-backend-factory.ts` | 10 | 9 |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/backend/agy-agent-run-backend-factory.ts` | 119 | 117 |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/backend/agy-agent-run-backend.ts` | 144 | 142 |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-background-process-groups.ts` | 74 | 61 |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-process.ts` | 131 | 125 |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | 485 | 485 |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend-factory.ts` | 58 | 58 |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | 122 | 122 |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.ts` | 173 | 173 |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-process.ts` | 140 | 135 |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | 489 | 468 |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.ts` | 57 | 57 |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` | 228 | 228 |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | 393 | 390 |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-cleanup.ts` | 38 | 38 |
| `autobyteus-server-ts/src/agent-execution/backends/codex/history/codex-thread-history-reader.ts` | 110 | 110 |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | 233 | 233 |
| `autobyteus-server-ts/src/agent-execution/backends/shared/workspace-skill-materializer.ts` | 328 | 312 |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | 505 | 495 |
| `autobyteus-server-ts/src/agent-execution/runtime/agent-run-activation-registry.ts` | 284 | 284 |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-activation-candidate.ts` | 62 | 58 |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | 316 | 315 |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-resource-manager.ts` | 124 | 124 |
| `autobyteus-server-ts/src/agent-execution/services/managed-agent-run-termination.ts` | 54 | 53 |
| `autobyteus-server-ts/src/agent-execution/services/standalone-agent-run-lifecycle-service.ts` | 412 | 409 |
| `autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run.ts` | 484 | 465 |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-communication-adapter.ts` | 76 | 75 |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-execution-index.ts` | 326 | 308 |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-execution-scope-builder.ts` | 223 | 213 |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-recipient-resolver.ts` | 73 | 59 |
| `autobyteus-server-ts/src/agent-org-execution/services/agent-org-task-execution-adapter.ts` | 356 | 354 |
| `autobyteus-server-ts/src/agent-run-collaboration/domain/agent-run-collaboration-root.ts` | 495 | 472 |
| `autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-communication-adapter.ts` | 77 | 76 |
| `autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-execution-index.ts` | 279 | 263 |
| `autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-recipient-resolver.ts` | 67 | 56 |
| `autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-root-builder.ts` | 179 | 168 |
| `autobyteus-server-ts/src/agent-run-collaboration/services/agent-run-collaboration-task-execution-adapter.ts` | 344 | 338 |
| `autobyteus-server-ts/src/agent-team-execution/backends/team-run-backend.ts` | 42 | 41 |
| `autobyteus-server-ts/src/agent-team-execution/domain/prepared-task-execution.ts` | 65 | 62 |
| `autobyteus-server-ts/src/agent-team-execution/domain/root-team-run.ts` | 467 | 452 |
| `autobyteus-server-ts/src/agent-team-execution/domain/task-agent-execution.ts` | 17 | 15 |
| `autobyteus-server-ts/src/agent-team-execution/domain/task-team-execution.ts` | 17 | 15 |
| `autobyteus-server-ts/src/agent-team-execution/domain/team-run.ts` | 48 | 47 |
| `autobyteus-server-ts/src/agent-team-execution/local/flat-team-agent-execution-handle.ts` | 188 | 187 |
| `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-callbacks.ts` | 25 | 23 |
| `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-factory.ts` | 165 | 161 |
| `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-manager.ts` | 501 | 493 |
| `autobyteus-server-ts/src/agent-team-execution/local/flat-team-run-backend.ts` | 50 | 50 |
| `autobyteus-server-ts/src/agent-team-execution/local/registries/collaborator-team-execution-registry.ts` | 73 | 67 |
| `autobyteus-server-ts/src/agent-team-execution/local/registries/task-agent-execution-registry.ts` | 253 | 235 |
| `autobyteus-server-ts/src/agent-team-execution/local/registries/task-team-execution-registry.ts` | 163 | 159 |
| `autobyteus-server-ts/src/agent-team-execution/local/task-team-execution-factory.ts` | 63 | 63 |
| `autobyteus-server-ts/src/agent-team-execution/services/team-execution-index.ts` | 376 | 355 |
| `autobyteus-server-ts/src/agent-team-execution/services/team-flat-execution-callbacks.ts` | 93 | 91 |
| `autobyteus-server-ts/src/agent-team-execution/services/team-root-materializer.ts` | 133 | 131 |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-message-delivery.ts` | 111 | 102 |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/team-task-execution-adapter.ts` | 298 | 296 |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/team-task-execution-service-contract.ts` | 38 | 37 |
| `autobyteus-server-ts/src/agent-team-execution/task-delegation/team-task-execution-service.ts` | 47 | 46 |
| `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-contract.ts` | 55 | 54 |
| `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-manifest.ts` | 27 | 27 |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-input-parsers.ts` | 28 | 28 |
| `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts` | 43 | 43 |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | 124 | 123 |
| `autobyteus-server-ts/src/application-platform/launch-configuration/application-provider-credential-readiness-adapter.ts` | 246 | 246 |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` | 35 | 31 |
| `autobyteus-server-ts/src/llm-management/services/codex-model-catalog.ts` | 51 | 51 |
| `autobyteus-server-ts/src/persistence/file/store-utils.ts` | 237 | 236 |
| `autobyteus-server-ts/src/projects/domain/models.ts` | 90 | 83 |
| `autobyteus-server-ts/src/projects/domain/project-errors.ts` | 30 | 30 |
| `autobyteus-server-ts/src/projects/services/project-task-service.ts` | 270 | 268 |
| `autobyteus-server-ts/src/projects/stores/project-store.ts` | 33 | 32 |
| `autobyteus-server-ts/src/run-history/domain/run-execution-tree-shared-records.ts` | 152 | 128 |
| `autobyteus-server-ts/src/run-history/store/run-execution-tree-shared-record-schemas.ts` | 448 | 426 |
| `autobyteus-server-ts/src/runtime-management/acp/acp-agent-process.ts` | 79 | 71 |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-streaming-session.ts` | 133 | 124 |
| `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.ts` | 108 | 106 |
| `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client.ts` | 342 | 340 |
| `autobyteus-server-ts/src/services/team-communication/team-communication-adapter.ts` | 102 | 101 |
| `autobyteus-ts/src/agent/factory/agent-factory.ts` | 213 | 213 |
| `autobyteus-server-ts/src/agent-collaboration/collaborators/task-scoped-message-recipient.ts` | 31 | 30 |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-dispatch.ts` | 70 | 69 |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/root-task-lifetime-scope.ts` | 82 | 79 |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-lifetime.ts` | 34 | 34 |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-seed-admission.ts` | 11 | 10 |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-lifetime-operation-gate.ts` | 27 | 26 |
| `autobyteus-server-ts/src/agent-execution/backends/agent-run-backend-preparation.ts` | 57 | 56 |
| `autobyteus-server-ts/src/agent-execution/backends/provider-preparation-guard.ts` | 8 | 7 |
| `autobyteus-server-ts/src/agent-execution/input/agent-run-execution-admission-fence.ts` | 14 | 13 |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-activation-operation.ts` | 105 | 104 |
| `autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run-options.ts` | 36 | 35 |
| `autobyteus-server-ts/src/agent-team-execution/local/flat-team-execution-manager-options.ts` | 15 | 14 |
| `autobyteus-server-ts/src/agent-team-execution/local/owned-flat-team-runtime-release.ts` | 14 | 13 |
| `autobyteus-server-ts/src/agent-team-execution/local/prepare-flat-team-configured-activation.ts` | 26 | 25 |
| `autobyteus-server-ts/src/app-data-migrations/migrations/project-task-lifetime-state/project-task-lifetime-state-app-data-migration.ts` | 43 | 43 |
| `autobyteus-server-ts/src/app-data-migrations/migrations/project-task-lifetime-state/released-project-array.ts` | 34 | 33 |
| `autobyteus-server-ts/src/built-in-agents/templates/project-task-manager/agent-config.json` | 12 | 12 |
| `autobyteus-server-ts/src/built-in-agents/templates/project-task-manager/agent.md` | 13 | 13 |
| `autobyteus-server-ts/src/projects/domain/project-task-execution-state.ts` | 47 | 47 |
| `autobyteus-server-ts/src/projects/domain/project-task-execution.ts` | 13 | 13 |
| `autobyteus-server-ts/src/projects/runtime/project-task-runtime-release.ts` | 43 | 42 |
| `autobyteus-server-ts/src/projects/stores/project-metadata-schema.ts` | 54 | 50 |
| `autobyteus-server-ts/src/projects/stores/project-state-schema.ts` | 73 | 73 |

## Changed/new tests

- `autobyteus-server-ts/tests/unit/agent-collaboration/root-task-execution-lifecycle.test.ts`
- `autobyteus-server-ts/tests/unit/projects/project-task-service.test.ts`
- `autobyteus-server-ts/tests/unit/agent-execution/services/agent-run-activation-operation.test.ts`

## Tracked >220 changed-line signal

```text
56	235	autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts
78	155	autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.ts
```
