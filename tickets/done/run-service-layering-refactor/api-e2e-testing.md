# API / E2E Testing

## Status

- Current Status: `Pass`
- Scope: executable validation for the service-boundary refactor in external-channel runtime

## Scenario Coverage

| Scenario ID | Acceptance Criteria | Scenario | Evidence | Result |
| --- | --- | --- | --- | --- |
| `AV-001` | `AC-001`, `AC-002`, `AC-005` | Agent binding launch path resolves/creates via `AgentRunService`, then the facade posts the message and records activity through the service after acceptance; the WebSocket agent send path now follows the same service-owned activity rule | `tests/unit/external-channel/runtime/channel-binding-run-launcher.test.ts`, `tests/unit/external-channel/runtime/channel-agent-run-facade.test.ts`, `tests/unit/agent-execution/agent-run-create-service.test.ts`, `tests/unit/services/agent-streaming/agent-stream-handler.test.ts` | `Pass` |
| `AV-002` | `AC-003`, `AC-005` | Recovery/runtime callers use service-owned resolve helpers instead of manager bypasses | `tests/unit/external-channel/runtime/accepted-receipt-recovery-runtime.test.ts`, `tests/unit/agent-execution/agent-run-restore-service.test.ts` | `Pass` |
| `AV-003` | `AC-004`, `AC-005` | Team binding launch path stays service-owned, and the facade records activity through `TeamRunService` only after accepted post | `tests/unit/external-channel/runtime/channel-binding-run-launcher.test.ts`, `tests/unit/external-channel/runtime/channel-team-run-facade.test.ts`, `tests/unit/agent-team-execution/team-run-service.test.ts` | `Pass` |

## Commands

```bash
pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/run-service-layering-refactor/autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/agent-stream-handler.test.ts tests/unit/agent-execution/agent-run-create-service.test.ts tests/unit/agent-execution/agent-run-restore-service.test.ts tests/unit/agent-team-execution/team-run-service.test.ts tests/unit/external-channel/runtime/channel-binding-run-launcher.test.ts tests/unit/external-channel/runtime/channel-agent-run-facade.test.ts tests/unit/external-channel/runtime/channel-team-run-facade.test.ts tests/unit/external-channel/runtime/accepted-receipt-recovery-runtime.test.ts
```

- Result: `8` files passed, `42` tests passed on `2026-04-01`

```bash
pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/run-service-layering-refactor/autobyteus-server-ts run typecheck
```

- Result: `Blocked by pre-existing package configuration issue`
- Detail: `tsconfig.json` sets `rootDir: "src"` while also including `tests`, producing repo-wide `TS6059` failures unrelated to this refactor
- Baseline check: the same `TS6059` failure reproduces on the original `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts` workspace

## Validation Decision

- Executable validation for the scoped change: `Pass`
- Full-package typecheck gate: `Not usable as a regression signal until the pre-existing tsconfig issue is fixed`
