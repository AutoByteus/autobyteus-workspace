# API/E2E Testing

Use this document for Stage 7 API/E2E test implementation and execution.
Do not use this file for unit/integration tracking; that belongs in `implementation-progress.md`.
Stage 7 starts after Stage 6 implementation (source + unit/integration) is complete.

## Testing Scope

- Ticket: `messaging-runtime-visibility`
- Scope classification: `Small`
- Workflow state source: `tickets/in-progress/messaging-runtime-visibility/workflow-state.md`
- Requirements source: `tickets/in-progress/messaging-runtime-visibility/requirements.md`
- Call stack source: `tickets/in-progress/messaging-runtime-visibility/future-state-runtime-call-stack.md`
- Design source (`Medium/Large`): `N/A`

## Coverage Rules

- Every critical requirement must map to at least one scenario.
- Every in-scope acceptance criterion (`AC-*`) must map to at least one executable scenario.
- Every in-scope use case must map to at least one scenario, or explicitly `N/A` with rationale.
- `Design-Risk` scenarios must include explicit technical objective/risk and expected outcome.
- Use stable scenario IDs with `AV-` prefix.
- Manual testing is not part of the default workflow.
- Stage 7 cannot close while any acceptance criterion is `Unmapped`, `Not Run`, `Failed`, or `Blocked` unless explicitly marked `Waived` by user decision for infeasible cases.
- During Stage 7 execution, `workflow-state.md` should show `Current Stage = 7` and `Code Edit Permission = Unlocked`.
- Stage 7 includes test-file/harness implementation and test execution.

## Acceptance Criteria Coverage Matrix (Mandatory)

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | Messaging runtime support remains runtime-generic and documented for `codex_app_server` and `claude_agent_sdk` | AV-001 | Passed | 2026-03-09 |
| AC-002 | R-002 | Messaging-created runs persist manifest and run-history rows | AV-001 | Passed | 2026-03-09 |
| AC-003 | R-003 | Persisted manifest carries runtime fields needed for reopen | AV-001 | Passed | 2026-03-09 |
| AC-004 | R-004 | Workspace history refreshes automatically while mounted | AV-002 | Passed | 2026-03-09 |
| AC-005 | R-002 / R-004 | Focused automated coverage exists for persistence path and background history discovery | AV-001, AV-002 | Passed | 2026-03-09 |
| AC-006 | R-006 | Open frontend run appends accepted external user turns without reopen | AV-003, AV-004 | Passed | 2026-03-09 |
| AC-007 | R-007 | Focused automated coverage exists for backend live publish and frontend live user-turn handling | AV-003, AV-004 | Passed | 2026-03-09 |
| AC-008 | R-009 | After app/server restart, a healthy preferred-port runtime is recognized instead of remaining blocked | AV-006 | Passed | 2026-03-09 |
| AC-009 | R-010 | Disable/update/restart can stop and restart an adopted reachable runtime cleanly | AV-006 | Passed | 2026-03-09 |
| AC-010 | R-011 | Managed gateway card exposes actionable recovery detail for blocked lifecycle states | AV-007 | Passed | 2026-03-09 |
| AC-011 | R-012 / R-013 | Binding setup surfaces stale selection failure and offers manual recovery path | AV-007 | Passed | 2026-03-09 |
| AC-012 | R-009 / R-011 / R-012 | Focused automated coverage exists for managed-gateway recovery UX and binding fallback UX | AV-006, AV-007 | Passed | 2026-03-09 |
| AC-013 | R-014 | `codex_app_server` and `claude_agent_sdk` messaging turns still bind `turnId` and route assistant replies back to the provider | AV-004 | Passed | 2026-03-09 |
| AC-014 | R-015 | Focused automated coverage exists for runtime-generic external turn binding and outbound callback publishing | AV-004 | Passed | 2026-03-09 |

## Scenario Catalog

| Scenario ID | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Level (`API`/`E2E`) | Objective/Risk | Expected Outcome | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-001 | Requirement | AC-001, AC-002, AC-003, AC-005 | R-001, R-002, R-003 | UC-001 | API | Verify runtime-generic messaging launch, manifest bootstrap, and run-history persistence contracts | Backend tests prove runtimeKind flows through launch preset, manifest bootstrap executes, and persisted manifest retains runtime metadata | `./node_modules/.bin/vitest run tests/unit/external-channel/runtime/channel-run-history-bootstrapper.test.ts tests/unit/external-channel/runtime/default-channel-runtime-facade.test.ts tests/unit/external-channel/runtime/channel-binding-runtime-launcher.test.ts` from `autobyteus-server-ts` | Passed |
| AV-002 | Requirement | AC-004, AC-005 | R-004, R-008 | UC-002 | API | Verify mounted history polling discovers background runs without a manual reload path | Frontend history panel spec passes with mounted polling behavior and best-effort refresh semantics | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-runtime-visibility/autobyteus-web test:nuxt --run components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Passed |
| AV-003 | Requirement | AC-006, AC-007 | R-006, R-007, R-008 | UC-003 | API | Verify accepted external user turns fan out over the live run-scoped path and the open frontend conversation appends the user message | Backend live-publish tests and frontend streaming spec both pass for the new external user-message event path | `./node_modules/.bin/vitest run tests/unit/services/agent-streaming/agent-stream-broadcaster.test.ts tests/unit/services/agent-streaming/agent-live-message-publisher.test.ts tests/unit/services/agent-streaming/agent-stream-handler.test.ts tests/integration/agent/agent-websocket.integration.test.ts` from `autobyteus-server-ts`; `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-runtime-visibility/autobyteus-web test:nuxt --run services/agentStreaming/__tests__/AgentStreamingService.spec.ts` | Passed |
| AV-004 | Design-Risk | AC-006, AC-007, AC-013, AC-014 | R-006, R-007, R-008, R-014, R-015 | UC-003 | E2E | Verify that live external user-turn mirroring and provider reply routing both hold when the binding runtime is `codex_app_server` or `claude_agent_sdk` | The external user turn appears in the open frontend chat, a `turnId` is bound for the accepted external runtime turn, and the assistant reply is still delivered back to the messaging provider | `User live verification via messaging app + Electron frontend` | Passed |
| AV-005 | Design-Risk | AC-001, AC-002, AC-005 | R-001, R-002 | UC-001 | E2E | Verify that deleting an existing messaging binding and creating a replacement binding preserves normal binding save behavior and does not leave the managed gateway unable to start | A replacement binding saves successfully and the managed messaging gateway returns to a healthy running state | `User live verification via Electron settings flow` | Passed |
| AV-006 | Design-Risk | AC-008, AC-009, AC-012 | R-009, R-010, R-011 | UC-004 | API | Verify managed-gateway restart recovery: a healthy runtime surviving service reset is adopted/reconciled, and update/disable can stop it cleanly through the admin boundary | Gateway status/update tests pass for the recovery and rollback paths without leaving lifecycle stuck in `BLOCKED`, and the runtime-reliability shutdown boundary works for adopted-runtime stop flows | `./node_modules/.bin/vitest run tests/e2e/messaging/managed-messaging-gateway-graphql.e2e.test.ts tests/e2e/messaging/managed-messaging-gateway-update-graphql.e2e.test.ts` from `autobyteus-server-ts`; `./node_modules/.bin/vitest run tests/integration/http/routes/runtime-reliability-route.integration.test.ts` from `autobyteus-message-gateway` | Passed |
| AV-007 | Requirement | AC-010, AC-011, AC-012 | R-011, R-012, R-013 | UC-005 | API | Verify blocked gateway states and stale peer-selection states are actionable in the UI | Managed gateway card and binding setup specs pass with recovery detail, recovery-oriented primary action, stale-selection error visibility, and manual fallback affordance | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/messaging-runtime-visibility/autobyteus-web test:nuxt --run components/settings/messaging/__tests__/ManagedGatewayRuntimeCard.spec.ts components/settings/messaging/__tests__/ChannelBindingSetupCard.spec.ts` | Passed |

## Failure Escalation Log

| Date | Scenario ID | Failure Summary | Investigation Required (`Yes`/`No`) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Action Path | `investigation-notes.md` Updated | Requirements Updated | Design Updated | Call Stack Regenerated | Review Re-Entry Round | Resolved |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-03-09 | AV-004 | Live provider verification showed that the frontend mirror now works, but the assistant reply stopped routing back to the messaging provider. Investigation isolated a likely exception leak in the new live websocket fan-out path that can abort ingress receipt persistence after runtime acceptance. A bounded local fix is now implemented and backend regression coverage passes; the later live rerun passed. | Yes | Local Fix | `6 -> 7` | Yes | No | No | No | 0 | Yes |
| 2026-03-09 | AV-004 | Deeper packaged-app investigation shows the remaining failure is not the gateway outbox path. `codex_app_server` and `claude_agent_sdk` bypass the in-house processor chain where external receipt turn binding and outbound callback publication currently live, so the accepted external runtime turn never gets a bound `turnId` and later provider reply routing cannot resolve the source route. | Yes | Design Impact | `1 -> 3 -> 4 -> 5 -> 6 -> 7` | Yes | Yes | Yes | Yes | 2 | Yes |
| 2026-03-09 | AV-004 | Fresh packaged-app verification still showed the Codex-bound Telegram reply appearing in Electron while not reaching the bot. The decisive user signal was that `autobyteus` runtime still routes correctly, which narrowed the remaining failure to the runtime-native bridge caching callback configuration too early at server startup. The bridge now resolves callback publishing lazily, focused backend verification passed, and the subsequent live packaged-app rerun succeeded. | Yes | Unclear | `0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7` | Yes | Yes | Yes | Yes | 0 | Yes |
| 2026-03-09 | AV-005 | After deleting an existing messaging binding, a replacement binding could not be saved and the managed messaging gateway began exiting unexpectedly. Root cause is not yet known, so the workflow re-entered investigation before any more code changes. The later live rerun passed after the recovery UX and gateway lifecycle fixes landed. | Yes | Unclear | `0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7` | Yes | No | No | No | 0 | Yes |
| 2026-03-09 | AV-005 | Root cause is now understood. The managed gateway became blocked because lifecycle recovery did not reconcile a reachable runtime after restart-style state loss, and the binding form hid the stale peer-selection error that prevented save from reaching the backend. Scope expands to recovery UX and gateway reconciliation. | Yes | Design Impact | `1 -> 3 -> 4 -> 5 -> 6 -> 7` | Yes | Yes | Yes | Yes | 2 | Yes |

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `No`
- If `Yes`, concrete infeasibility reason per scenario: `N/A`
- Environment constraints (secrets/tokens/access limits/dependencies): `Live packaged-app/provider reruns were required to close AV-004 and AV-005 because those scenarios depend on the user’s real messaging configuration.`
- Compensating automated evidence: `Backend unit tests, existing websocket integration test, and frontend mounted-panel/streaming specs.`
- Residual risk notes: `Focused automated coverage plus user-confirmed live packaged-app verification now cover the previously failing Codex reply-routing and binding-recovery scenarios. Remaining risk is limited to normal future regressions outside this verified configuration.`
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): `No`
- If `Yes`, waiver reference (date/user decision): `N/A`

## Stage 7 Gate Decision

- Stage 7 complete: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria status = `Passed`: `Yes`
- Critical executable scenarios passed: `Yes`
- Any infeasible acceptance criteria: `No`
- Explicit user waiver recorded for each infeasible acceptance criterion (if any): `N/A`
- Unresolved escalation items: `No`
- Ready to enter Stage 8 code review: `Yes`
- Notes: `The user confirmed that the previously failing live packaged-app scenarios now work: Codex runtime replies route back to the provider, and the binding replacement plus gateway recovery flow also behaves correctly.`
