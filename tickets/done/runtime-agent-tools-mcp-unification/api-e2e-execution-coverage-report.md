# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/api-e2e-coverage-investigation.md`
- Current Execution Round: 1
- Trigger: Coverage investigation and execution after code review Round 2 pass.
- Prior Round Reviewed: N/A
- Latest Authoritative Round: Round 1

Round rules:
- Reuse the same scenario IDs across reruns for the same scenarios.
- Create new scenario IDs only for newly discovered coverage.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code review Round 2 pass -> API/E2E coverage investigation/execution | N/A | None unresolved | Pass | Yes | Durable coverage was added/updated, so this must return through code review before delivery. |

## Execution Basis

Executed against worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification` on branch `codex/runtime-agent-tools-mcp-unification`. The coverage basis is the approved requirements, design, implementation handoff, and code-review Round 2 pass. The investigation found no production compatibility fallback, but did find stale durable coverage labels/assertions around Codex dynamic-tool fixtures that needed cleanup before final execution.

## Pre-Execution Coverage Investigation

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/api-e2e-coverage-investigation.md`
- Completed before final test execution, durable coverage edits, durable coverage removals, or failure rerouting: `Yes`
- Existing durable coverage inventory reviewed: `Yes`
- Existing tests treated as authority without current-requirement validity review: `No`
- Stale or obsolete coverage found: `Yes`
- New durable coverage needed: `Yes`
- Reroute required from investigation: `No`
- Notes: Stale coverage was local to tests/labels. No source reroute was required.

## Existing Durable Coverage Decision Summary

| Path / Scenario | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Action Taken | Evidence |
| --- | --- | --- | --- |
| `tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts` | Still Valid | Executed | Targeted vitest passed. |
| `tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` | Still Valid | Executed | Targeted vitest passed. |
| `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Needs Update | Added UATM-API-001 route-backed `publish_artifacts` active-run scenario | Focused and final targeted vitest passed; new scenario verifies projection/snapshot/event/no-leak. |
| `tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts` | Needs Update | Updated task delegation expectation to instructions + null `dynamicToolRegistrations` | Focused and final targeted vitest passed. |
| `tests/unit/agent-execution/backends/codex/backend/codex-configured-tool-gating.test.ts` | Needs Update | Replaced migrated dynamic fixture names with custom dynamic names | Focused and final targeted vitest passed. |
| `tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` | Needs Update | Replaced generic dynamic handler fixture names with custom non-migrated names | Focused and final targeted vitest passed. |
| `tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` | Needs Update | Renamed stale Codex browser "dynamic tool path" label to Agent Tools MCP | Live-gated file imported; 12 tests skipped because `RUN_CODEX_E2E` is unset. |
| `tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts` | Needs Update | Renamed ambiguous Claude browser labels to Agent Tools MCP | Live-gated file imported; 8 tests skipped because `RUN_CLAUDE_E2E` is unset. |
| `tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` | Needs Update | Renamed stale negative browser dynamicTools label | Targeted vitest passed. |
| Claude/Codex materializer, event, history, task runtime descriptions, media e2e, browser bridge e2e | Still Valid | Executed targeted/default feasible suites | All targeted/default feasible commands passed. |
| Live all-runtime and live Claude/Codex runtime scenarios | Still Valid but environment-gated | Executed files to confirm skip | 32 tests skipped across 6 live-gated files because gate env vars are unset. |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

Static post-edit scans:

- `git diff --check` — Passed.
- Old migrated server/builder scan over `autobyteus-server-ts/src` and `autobyteus-server-ts/tests` for `autobyteus_browser`, `autobyteus_image_audio`, `autobyteus_team`, `autobyteus_published_artifacts`, and deleted migrated builder names — No matches.
- Stale dynamic-label scan for `dynamic tool path`, `browser MCP path`, `browser dynamic tools`, and `task delegation dynamic tools` — No matches.
- Stale dynamic registration assertion scan — No matches.

## Execution Surfaces / Modes

- Unit coverage: Agent Tools MCP catalog/session/executor; Claude/Codex materializers and gating; Codex event/history no-leak; Codex dynamic generic infrastructure after stale fixture cleanup.
- Integration coverage: Agent Tools MCP HTTP route, including official MCP SDK send-message probe and new route-backed `publish_artifacts` active-run publication scenario; run-history projection.
- E2E/browser/media coverage: deterministic browser bridge GraphQL/service E2E and mocked media API/E2E boundary.
- Live runtime coverage: Claude, Codex, all-runtime matrix, and mixed task delegation files executed in default gate state and skipped by design because live env vars are unset.

## Platform / Runtime Targets

- Platform: macOS / Darwin via local worktree.
- Node/pnpm runtime: repository workspace using existing `pnpm` install.
- Runtime binaries observed during investigation: `codex` present (`codex-cli 0.139.0`); `claude` present (`2.1.175 (Claude Code)`).
- Live gate envs observed: `RUN_LMSTUDIO_E2E`, `RUN_CODEX_E2E`, and `RUN_CLAUDE_E2E` unset.

## Lifecycle / Upgrade / Restart / Migration Checks

No installer/updater/restart/migration lifecycle was in scope. MCP session lifecycle checks covered descriptor creation, auth, expiration/revocation, route access gates, and live-gated runtime session file imports/skips.

## Coverage Matrix

| Scenario ID | Boundary | Durable / Temporary | Result | Evidence |
| --- | --- | --- | --- | --- |
| UATM-API-001 | `publish_artifacts` through Agent Tools MCP route with active run projection/event/no-leak | Durable | Passed | New integration test in `agent-tools-mcp-routes.integration.test.ts`; final targeted vitest passed. |
| UATM-API-002 | Codex team task delegation no dynamic registrations | Durable update | Passed | Updated team bootstrap strategy test; final targeted vitest passed. |
| UATM-API-003 | Generic Codex dynamic gating fixtures not migrated tool names | Durable update | Passed | Updated configured-tool-gating test; final targeted vitest passed. |
| UATM-API-004 | Generic Codex dynamic thread fixtures not migrated tool names | Durable update | Passed | Updated Codex thread test; final targeted vitest passed. |
| UATM-API-005 | Stale labels for live Agent Tools MCP browser and negative dynamicTools cases | Durable update | Passed / live skipped where gated | Labels updated; targeted/unit tests passed; live-gated files skipped as expected. |
| UATM-PROBE-001 | Static no-old-path/no-stale-label scans | Temporary probe | Passed | `rg` scans returned no matches for old migrated server/builder names and stale dynamic labels. |
| UATM-PROBE-002 | Live gate feasibility | Temporary probe | Passed with skips classified | Binaries exist; live env gates unset; gated suites skipped. |
| UATM-PROBE-003 | Build/source typecheck and targeted vitest | Temporary executable evidence | Passed with known typecheck limitation | `tsconfig.build.json` typecheck passed; `pnpm typecheck` still fails with pre-existing TS6059 rootDir/tests issue. |

## Test Scope

Final executed scope focused on changed and directly relevant boundaries: Agent Tools MCP route/catalog/session/executor, Codex/Claude runtime MCP materialization/gating, event/history no-leak, generic dynamic infrastructure cleanup, media local semantics, browser bridge support, and live-gated runtime files.

## Execution Setup / Environment

- Used existing worktree dependencies; no dependency manifests changed.
- Vitest global setup reset the test SQLite database for each command.
- New `publish_artifacts` route scenario used temporary workspace and memory directories under `os.tmpdir()` and removed them in test cleanup.
- Browser bridge E2E used the repository `BrowserBridgeLiveTestServer` helper.
- Media E2E used mocked image/audio factories already present in the test file.

## Tests Implemented Or Updated

- Added active-run route-backed `publish_artifacts` integration coverage in:
  - `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts`
- Updated stale coverage in:
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-configured-tool-gating.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts`
  - `autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts`
  - `autobyteus-server-ts/tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts`

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| None in API/E2E round | N/A | N/A | Stale coverage was updated in place; implementation round had already removed obsolete old-projection source/tests. |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated:
  - `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-configured-tool-gating.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts`
  - `autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts`
  - `autobyteus-server-ts/tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts`
- Paths removed: None in API/E2E round.
- If `Yes`, returned through `code_reviewer` before delivery: `Pending in this handoff; recommended recipient is code_reviewer.`
- Post-API/E2E coverage code review artifact: Pending.

## Other Execution Artifacts

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/api-e2e-coverage-investigation.md`
- This execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification/api-e2e-execution-coverage-report.md`

## Temporary Execution Methods / Scaffolding

No repository-resident temporary scaffolding was added. Temporary test directories were created and cleaned by tests. Temporary command probes were static scans and gated-suite executions.

## Dependencies Mocked Or Emulated

- New `publish_artifacts` route scenario injects a `PublishedArtifactPublicationService` with fake active `AgentRunManager` and fake workspace manager but real projection/snapshot stores.
- Browser bridge E2E uses `BrowserBridgeLiveTestServer`.
- Media E2E uses mocked image/audio client factories.
- Live LLM runtime flows were not forced because gate env vars were unset.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | Initial execution round. |

During Round 1 execution, an interim focused run failed because the new invalid `publish_artifacts` assertion expected the older missing-`artifacts` message while current contract correctly reports disallowed top-level `path`. The assertion was corrected, and the focused command then passed. This was a coverage-code expectation issue, not an implementation defect.

## Scenarios Checked

- Agent Tools MCP route initialize/list/call/resources/ping/SSE/auth/protocol gates.
- Official Streamable HTTP MCP SDK client send-message probe.
- New route-backed `publish_artifacts` active-run success and invalid-payload failure behavior.
- Durable projection write, revision snapshot readback, `ARTIFACT_PERSISTED` local event emission, and no descriptor/secret strings in app-facing route results/events/projection.
- Catalog/session availability and descriptor redaction.
- Claude MCP materialization and allowed-tool names for send/browser/media/task/publish.
- Codex MCP thread config and no migrated `dynamicTools` for browser/media/publish.
- Codex team bootstrap task delegation instructions without dynamic registrations.
- Codex event/history canonicalization/no-leak for non-send Agent Tools MCP calls.
- Browser bridge registration/clear and service execution.
- Media local server-owned tool semantics and path normalization.
- Static absence of old migrated server/builder names and stale dynamic labels.

## Passed

Commands passed:

1. `git diff --check`
2. `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
3. Focused changed-coverage vitest command:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts tests/unit/agent-execution/backends/codex/backend/codex-configured-tool-gating.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts`
   - Result after assertion correction: 5 files / 49 tests passed.
4. Final targeted unit/integration command:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts tests/unit/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.test.ts tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts tests/unit/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts tests/unit/agent-execution/backends/codex/backend/codex-configured-tool-gating.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts tests/unit/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.test.ts tests/integration/run-history/codex-mcp-tool-args-projection.integration.test.ts tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts`
   - Result: 17 files / 138 tests passed.
5. Deterministic E2E command:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/media/server-owned-media-tools.e2e.test.ts tests/e2e/runtime/remote-browser-bridge-runtime.e2e.test.ts`
   - Result: 2 files / 5 tests passed.
6. Live-gated runtime command:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts tests/e2e/runtime/all-runtime-send-message-matrix.e2e.test.ts tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`
   - Result: 6 files skipped / 32 tests skipped because live gate env vars are unset.
7. Static scans listed in Compatibility / Legacy Scope Check — Passed.

## Failed

No unresolved failures.

Known non-blocking command result:

- `pnpm -C autobyteus-server-ts typecheck` still fails with pre-existing TS6059 because `tsconfig.json` includes `tests` while `rootDir` is `src`. This matches the code-review residual risk. Source build typecheck with `tsconfig.build.json` passes.

## Not Tested / Out Of Scope

- Exposing every local registry tool through Agent Tools MCP: out of scope.
- AutoByteus native HTTP MCP migration: out of scope; native remains local.
- Tool-management, skills, agent-management, and team-management MCP migration: out of scope.
- Antigravity/other runtime backends: out of scope.

## Blocked

None for default API/E2E sign-off.

Environment-gated residuals:

- Live Claude multi-tool remote MCP allowed-tool behavior: not executed because `RUN_CLAUDE_E2E` is unset, though `claude` binary exists.
- Live Codex app-server non-send Agent Tools MCP payload variants: not executed because `RUN_CODEX_E2E` is unset, though `codex` binary exists.
- Full all-runtime matrix and mixed task delegation: not executed because `RUN_LMSTUDIO_E2E`, `RUN_CODEX_E2E`, and/or `RUN_CLAUDE_E2E` are unset.
- Live media model-provider execution: not executed; deterministic media E2E uses mocks.

## Cleanup Performed

- New route-backed publish test removes temporary workspace and memory directories in `finally` cleanup.
- Browser bridge E2E stopped the live test server and cleared runtime binding through existing test cleanup.
- No temporary scripts or harness files were left in the repository.

## Classification

- `Local Fix`: N/A; no implementation correction required.
- `Design Impact`: N/A.
- `Requirement Gap`: N/A.
- `Unclear`: N/A.

The only changes after code review are durable coverage additions/updates, so the required next workflow step is coverage-code review.

## Recommended Recipient

`code_reviewer`

## Evidence / Notes

- Coverage investigation was written before durable coverage edits and final execution.
- Durable coverage was added/updated after the initial implementation code review, so this package must not go directly to delivery.
- New route-backed publish coverage exercises the MCP HTTP route, adapter, real publication projection/snapshot stores, active-run event emission, semantic error mapping, and no-leak assertions.
- Static scans found no old migrated server/builder names in `src` or `tests` after the coverage updates.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: Default-feasible API/E2E and executable coverage passed. Live Claude/Codex/all-runtime scenarios are explicitly environment-gated and were skipped, not failed. Repository-resident durable coverage changed, so return to `code_reviewer` for coverage-code re-review before delivery.
