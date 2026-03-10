# API/E2E Testing

## Testing Scope
- Ticket: `electron-agent-prompt-file-resolution`
- Scope classification: `Small`
- Workflow state source: `tickets/in-progress/electron-agent-prompt-file-resolution/workflow-state.md`
- Requirements source: `tickets/in-progress/electron-agent-prompt-file-resolution/requirements.md`
- Call stack source: `tickets/in-progress/electron-agent-prompt-file-resolution/future-state-runtime-call-stack.md`
- Acceptance strategy: `targeted integration coverage` (no new public API or UI flow was introduced by this server-side runtime refactor)

## Acceptance Criteria Coverage Matrix
| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Next single-agent run uses fresh instructions from disk even if the cached definition is stale | AV-001 | Passed | 2026-03-10 |
| AC-002 | REQ-002 | Blank or whitespace instructions fall back to description on the next run | AV-002 | Passed | 2026-03-10 |
| AC-003 | REQ-003 | Team run creation uses fresh team and member definitions for runtime prompts and metadata | AV-003 | Passed | 2026-03-10 |
| AC-004 | REQ-004 | Runtime prompt resolution no longer depends on the deleted runtime `PromptLoader` path and existing manager integrations remain compatible | AV-004 | Passed | 2026-03-10 |

## Scenario Catalog
| Scenario ID | Source Type | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Level | Objective/Risk | Expected Outcome | Command/Harness | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-001 | Requirement | AC-001 | REQ-001 | UC-001 | Integration | Warm the cached definition, edit `agent.md`, then create the next run to prove runtime takes a fresh full definition snapshot | `AgentRunManager` builds `systemPrompt` from updated `definition.instructions`, not the stale cache entry | `vitest run tests/integration/agent-execution/agent-run-prompt-fallback.integration.test.ts` | Passed |
| AV-002 | Requirement | AC-002 | REQ-002 | UC-002 | Integration | Edit `agent.md` to blank instructions after the cache is warm | Runtime falls back to `definition.description` when fresh instructions are blank | `vitest run tests/integration/agent-execution/agent-run-prompt-fallback.integration.test.ts` | Passed |
| AV-003 | Requirement | AC-003 | REQ-003 | UC-003 | Integration | Build a team run where cached team/member definitions are stale but fresh definitions differ | `AgentTeamRunManager` uses fresh team/member definitions when building coordinator/member configs | `vitest run tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts` | Passed |
| AV-004 | Requirement | AC-004 | REQ-004 | UC-001, UC-003 | Integration | Confirm refactored runtime paths still work with existing manager/provider integrations after runtime `PromptLoader` removal | Existing manager integration suites and provider integration suite remain green | `vitest run tests/integration/agent-execution/agent-run-manager.integration.test.ts tests/integration/agent-definition/md-centric-provider.integration.test.ts` | Passed |

## Failure Escalation Log
| Date | Scenario ID | Failure Summary | Investigation Required | Classification | Action Path | `investigation-notes.md` Updated | Requirements Updated | Design Updated | Call Stack Regenerated | Review Re-Entry Round | Resolved |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-03-10 | Compile-Probe-001 | `tsc -p tsconfig.json --noEmit --pretty false` fails with existing `TS6059` `rootDir` / `tests` configuration issues outside the touched runtime files | No | Existing unrelated issue | Non-gating; keep ticket acceptance scoped to targeted runtime integration verification | No | No | No | No | N/A | Yes |
| 2026-03-10 | Compile-Probe-002 | `tsc -p tsconfig.build.json --noEmit --pretty false` fails with existing type errors in `src/external-channel/providers/sql-channel-binding-provider.ts` | No | Existing unrelated issue | Non-gating; record in handoff and continue with scoped verification | No | No | No | No | N/A | Yes |

## Feasibility And Risk Record
- Any infeasible scenarios: `No`
- Environment constraints:
  - Worktree-local verification required temporary dependency symlinks for package-local `node_modules` during test execution.
  - Generic compile probes surface unrelated pre-existing repository issues outside the touched runtime definition path.
- Compensating automated evidence:
  - targeted integration command passed (`4 files`, `23 tests`)
  - single-agent next-run freshness verified
  - blank-instructions fallback verified
  - team fresh-definition usage verified
  - existing manager/provider integration coverage remained green after runtime `PromptLoader` removal
- Residual risk notes:
  - freshness is guaranteed for the next run creation snapshot, not for a run that is already in progress
  - other out-of-scope file-read paths outside runtime bootstrap should still be reviewed separately if similar primary-root assumptions exist elsewhere
- User waiver for infeasible acceptance criteria recorded: `N/A`

## Stage 7 Gate Decision
- Stage 7 complete: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria status = `Passed`: `Yes`
- Critical executable scenarios passed: `Yes`
- Any infeasible acceptance criteria: `No`
- Explicit user waiver recorded for each infeasible acceptance criterion: `N/A`
- Unresolved escalation items: `No`
- Ready to enter Stage 8 code review: `Yes`
- Notes:
  - This ticket does not require browser/UI E2E coverage because the change is a server-side runtime-definition refactor.
  - Stage 7 is closed by targeted integration scenarios that directly exercise the refreshed runtime behavior.
