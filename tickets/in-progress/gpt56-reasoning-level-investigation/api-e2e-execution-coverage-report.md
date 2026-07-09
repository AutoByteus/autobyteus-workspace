# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation/tickets/in-progress/gpt56-reasoning-level-investigation/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation/tickets/in-progress/gpt56-reasoning-level-investigation/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation/tickets/in-progress/gpt56-reasoning-level-investigation/proposed-design.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation/tickets/in-progress/gpt56-reasoning-level-investigation/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation/tickets/in-progress/gpt56-reasoning-level-investigation/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation/tickets/in-progress/gpt56-reasoning-level-investigation/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation/tickets/in-progress/gpt56-reasoning-level-investigation/api-e2e-coverage-investigation.md`
- Current Execution Round: `1`
- Trigger: Code-review pass for implementation `7bda8b9d`, followed by the required coverage investigation at `8daae87a`.
- Prior Round Reviewed: `N/A`
- Latest Authoritative Round: `1`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial API/E2E execution after implementation review | N/A | No product or coverage defects. One frontend environment prerequisite was missing initially and was resolved with `nuxi prepare`. | Pass | Yes | Durable coverage commit: `1df583eb6b142ad771f86c77f8aeeb95c07a0efc`. |

## Execution Basis

- Review-passed implementation: `7bda8b9d6d0611fc4011418b8deed7ea445af423`.
- Pre-execution coverage investigation: `8daae87a` and the canonical artifact linked above.
- Durable coverage update: `1df583eb6b142ad771f86c77f8aeeb95c07a0efc`.
- Installed live runtime: `codex-cli 0.144.0`.
- The execution used live Codex App Server processes, in-process AutoByteus GraphQL, real AutoByteus Codex team runtime/websocket/tool routing, deterministic request-boundary tests, and focused generic frontend component tests.

## Pre-Execution Coverage Investigation

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation/tickets/in-progress/gpt56-reasoning-level-investigation/api-e2e-coverage-investigation.md`
- Completed before final test execution, durable coverage edits, durable coverage removals, or failure rerouting: `Yes`
- Existing durable coverage inventory reviewed: `Yes`
- Existing tests treated as authority without current-requirement validity review: `No`
- Stale or obsolete coverage found: `Yes`
- New durable coverage needed: `Yes`
- Reroute required from investigation: `No`
- Notes: The fixed five-value live assertion was classified as obsolete before it was replaced. The investigation artifact was committed before test edits.

## Existing Durable Coverage Decision Summary

| Path / Scenario | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Action Taken | Evidence |
| --- | --- | --- | --- |
| `tests/integration/services/codex-model-catalog.integration.test.ts` / fixed reasoning union | `Needs Update`; contained a `Stale / Remove` assertion | Replaced with raw App Server -> catalog -> GraphQL per-model sequence parity and independent raw-`fast` parity. | Live `CAT-PARITY-001` passed. |
| `tests/unit/.../codex-app-server-model-normalizer.test.ts` | `Still Valid` | Retained and re-ran. | 9/9 passed within the 58-test focused server run. |
| `tests/unit/.../codex-thread-bootstrapper.test.ts` | `Needs Update` | Added table-driven current/future open-string and malformed/unset config coverage. | 23/23 passed. |
| `tests/unit/.../codex-thread.test.ts` | `Needs Update` | Added exact `turn/start.effort` assertions for `max`, `ultra`, arbitrary custom, and null. | 26/26 passed. |
| `tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts` / exact roundtrip | `Needs Update` | Model selection now filters the live GraphQL schema by advertised `ultra`; both members use explicit `ultra` while all exact communication/tool-trace assertions remain. | Targeted live team scenario passed twice, including the final 45.4-second run. |
| Generic frontend schema/config tests | `Still Valid` | Retained and re-ran; also used a temporary six-option selector fixture. | 39/39 focused durable tests plus 1/1 temporary six-option selector probe passed. |
| Other broad Codex lifecycle/runtime suites | `Out Of Scope` | Not executed broadly. | Targeted live process, GraphQL, turn, team, and tool boundaries covered the changed scope. |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

The deleted allowlist and rejection branch were not reintroduced in coverage as a wrapper, fallback, or alternate policy. The stale assertion that represented the old policy was replaced rather than retained.

## Execution Surfaces / Modes

- Raw Codex App Server JSON-RPC `model/list` and `turn/start`.
- `CodexModelCatalog` live mapping.
- In-process GraphQL `availableLlmProvidersWithModels(runtimeKind: "codex_app_server")`.
- Deterministic `AgentRunConfig -> CodexThreadBootstrapper -> CodexThreadConfig` validation.
- Deterministic `CodexThread -> client.request("turn/start", ...)` payload validation.
- Real AutoByteus mixed-team runtime with two Codex members, GraphQL setup, websocket control, Agent Tools MCP `send_message_to`, projection, and memory-trace evidence.
- Generic Nuxt/Vue model-config schema, team-global control, and selector rendering.

## Platform / Runtime Targets

- macOS `26.2` build `25C56`.
- Node.js `v22.23.1`.
- pnpm `10.28.2`.
- Codex CLI/App Server `0.144.0`.
- Branch `codex/gpt56-reasoning-level-investigation`.
- Coverage-code state `1df583eb6b142ad771f86c77f8aeeb95c07a0efc` before this report.

## Lifecycle / Upgrade / Restart / Migration Checks

Not applicable to the changed reasoning-effort translation boundary. Each server Vitest invocation reset and migrated the isolated SQLite test database successfully. Live Codex processes, team runs, websocket sessions, agent/team definitions, workspaces, and generated frontend state were torn down after execution.

## Coverage Matrix

| Scenario ID | Boundary / Behavior | Durable / Temporary | Result | Evidence |
| --- | --- | --- | --- | --- |
| `CAT-PARITY-001` | Raw per-model reasoning sequence equals catalog and GraphQL schema sequence; no per-model invention; order retained. | Durable live integration | Pass | 1/1 live integration test passed after final coverage commit. |
| `FAST-POLICY-001` | `service_tier` appears only as `enum_values: ["fast"]` when the same raw row advertises `fast`; otherwise absent. | Durable live integration + unit | Pass | Included in live parity test; normalizer/bootstrapper/thread service-tier checks also passed. |
| `TURN-PAYLOAD-001` | `max` and `ultra` reach exact `turn/start.effort`. | Durable unit + temporary live request capture | Pass | Deterministic payload tests passed; live App Server returned turn IDs for both values. |
| `TURN-PAYLOAD-002` | Arbitrary trimmed non-empty direct input reaches the live request unchanged. | Durable unit + temporary live request capture | Pass | `" Future-Custom "` became `"Future-Custom"`; live App Server accepted it and returned a turn. |
| `TURN-DEFAULT-001` | Whitespace-only, non-string, and unset effort remain `null`; `turn/start` receives null. | Durable unit | Pass | Bootstrapper and thread payload cases passed. |
| `TEAM-ULTRA-001` | Real two-member team using an advertising model and explicit `ultra` preserves exact ping->pong->ping `send_message_to`, projection, stream, and one-call/one-result trace invariants. | Durable live E2E | Pass | 1 targeted test passed; final run completed in 45.4 seconds. |
| `UI-SELECTOR-001` | Generic selector renders the six supplied values in order without a Codex filter. | Existing durable generic coverage + temporary exact fixture | Pass | 39 focused frontend tests passed; temporary selector assertion returned `low, medium, high, xhigh, max, ultra` in order. |

## Test Scope

- Happy path: live dynamic catalog/GraphQL parity, explicit current efforts, real team roundtrip.
- Edge path: arbitrary future effort string, boundary whitespace, case preservation already in retained normalizer coverage, per-model differences, absent `ultra` on a model that does not advertise it.
- Failure/default path: whitespace-only, non-string, and unset values normalize to `null`; no stale fixed-union assertion remains.
- Integration boundaries: raw App Server, catalog, GraphQL, generic frontend selector, bootstrapper, turn payload, live team communication/tool traces.
- Separate policy regression: `fast` remains the sole accepted/visible service-tier value.

## Execution Setup / Environment

- Server tests ran from `autobyteus-server-ts` with the repository Vitest setup and isolated Prisma SQLite database.
- Live scenarios used `RUN_CODEX_E2E=1` and the installed `codex` binary.
- The frontend's first focused invocation could not load `./.nuxt/tsconfig.json`. `pnpm exec nuxi prepare` generated the normal Nuxt metadata, after which all focused frontend tests passed. Generated `.nuxt` state was removed after execution.
- The live team E2E created a temporary application-data directory, Fastify Agent Tools MCP/websocket server, definitions, team run, and workspace; its `afterEach`/`afterAll` teardown completed.

## Tests Implemented Or Updated

- `autobyteus-server-ts/tests/integration/services/codex-model-catalog.integration.test.ts`
  - Collects paginated raw `model/list` rows.
  - Independently trims/deduplicates raw values and accounts for the upstream default.
  - Compares model-keyed sequences with direct catalog and in-process GraphQL output.
  - Derives `fast` visibility from each same raw model row.
- `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts`
  - Covers `max`, `ultra`, `Future-Custom`, whitespace-only, non-string, and unset input.
- `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts`
  - Covers exact outgoing effort for `max`, `ultra`, custom, and null.
- `autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
  - Selects by live advertised `ultra` capability instead of a permanent model name.
  - Runs the existing exact communication/tool invariant scenario with explicit `ultra` on both members.

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/services/codex-model-catalog.integration.test.ts` / fixed-union predicate | Every live normalized effort belongs to `none/low/medium/high/xhigh`. | `REQ-005`, `AC-009`, reviewed Removal / Decommission Plan, coverage investigation decision. | Replaced with `CAT-PARITY-001`, which compares raw/catalog/GraphQL values per model and cannot silently approve dropped future values. |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation/autobyteus-server-ts/tests/integration/services/codex-model-catalog.integration.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation/autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts`
- Paths removed: `None`; the obsolete assertion inside the live catalog file was removed and replaced.
- If `Yes`, returned through `code_reviewer` before delivery: `Pending at report authoring; this report and the cumulative package are being routed to code_reviewer next, and delivery has not been contacted.`
- Post-API/E2E coverage code review artifact: `Pending coverage-code re-review.`

## Other Execution Artifacts

- Canonical coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation/tickets/in-progress/gpt56-reasoning-level-investigation/api-e2e-coverage-investigation.md`
- This canonical execution report: `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation/tickets/in-progress/gpt56-reasoning-level-investigation/api-e2e-execution-coverage-report.md`
- No repository-resident screenshots, logs, or probe files were retained.

## Temporary Execution Methods / Scaffolding

- A temporary Vitest request-recorder subclassed the real `CodexAppServerClient`, selected models from the live catalog, and recorded/forwarded actual `turn/start` calls.
  - `max`: sent on `gpt-5.6-sol`; App Server accepted and returned turn `019f487b-baff-76b2-9fba-6a6236ebe57e`.
  - `ultra`: sent on `gpt-5.6-sol`; App Server accepted and returned turn `019f487b-bb61-7e01-b12e-5faed56a7317`.
  - `" Future-Custom "`: normalized to `"Future-Custom"`, sent unchanged, and accepted by App Server.
- A temporary frontend fixture supplied the observed six-value sequence to `ModelConfigSection` and asserted the rendered `<option>` values exactly.
- Both temporary probes were removed. Generated `.nuxt` metadata and temporary workspaces/application data were removed.

## Dependencies Mocked Or Emulated

- Deterministic bootstrapper and thread payload tests use mocked client/service boundaries to inspect exact configuration and request payloads.
- Live catalog, GraphQL, request-capture, and team scenarios did not mock Codex App Server.
- The live team scenario used the real in-process GraphQL schema, real Fastify websocket/Agent Tools MCP endpoints, and real Codex turns; it did not emulate inter-agent messaging.

## Prior Failure Resolution Check (Mandatory On Round >1)

Not applicable; current execution round is 1.

## Scenarios Checked

Observed live catalog snapshot during the temporary request probe:

| Model observed on 2026-07-09 | Reasoning sequence |
| --- | --- |
| `gpt-5.6-sol` | `low, medium, high, xhigh, max, ultra` |
| `gpt-5.5` | `low, medium, high, xhigh` |
| `gpt-5.6-terra` | `low, medium, high, xhigh, max, ultra` |
| `gpt-5.6-luna` | `low, medium, high, xhigh, max` |
| `gpt-5.4` | `low, medium, high, xhigh` |
| `gpt-5.4-mini` | `low, medium, high, xhigh` |
| `gpt-5.3-codex-spark` | `low, medium, high, xhigh` |

This snapshot is execution evidence only. Durable coverage derives identities and values from live rows and does not encode this table.

## Passed

1. `pnpm exec vitest run tests/unit/agent-execution/backends/codex/codex-app-server-model-normalizer.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts`
   - `3` files, `58/58` tests passed.
2. `RUN_CODEX_E2E=1 pnpm exec vitest run tests/integration/services/codex-model-catalog.integration.test.ts tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts -t "..." --reporter=verbose`
   - `2` files passed; `2/2` selected tests passed and `4` unrelated team scenarios were skipped by the name filter.
3. Final post-amend live catalog run:
   - `1` file, `1/1` live parity test passed.
4. Temporary real-wire probe:
   - `1/1` passed; `max`, `ultra`, and trimmed custom values were captured and accepted by the live App Server request boundary.
5. `pnpm exec vitest run utils/__tests__/llmConfigSchema.spec.ts components/workspace/config/__tests__/ModelConfigSection.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts --reporter=verbose`
   - `3` files, `39/39` tests passed after `nuxi prepare`.
6. Temporary six-option selector probe:
   - `1/1` selected test passed; `18` unrelated tests skipped by the name filter.
7. `pnpm exec tsc -p tsconfig.build.json --noEmit`
   - Passed.
8. `git diff --check`
   - Passed.

## Failed

No valid product, durable-coverage, API, E2E, or temporary-probe scenario failed in the final execution state.

Non-authoritative setup/baseline observations:

- The first frontend test attempt failed before collection because `.nuxt/tsconfig.json` had not been generated. `pnpm exec nuxi prepare` resolved the environment prerequisite, and the same tests then passed 39/39.
- `pnpm exec tsc -p tsconfig.json --noEmit --rootDir .` remains non-green with the repository's pre-existing package/workspace-wide `TS6059`, `TS4111`, and other baseline diagnostics. This is consistent with the implementation handoff's package typecheck warning. The source-only build configuration passes.
- `pnpm exec prettier --check ...` was unavailable because this workspace does not provide a `prettier` command. Repository test transforms, source TypeScript, and `git diff --check` were used instead.

## Not Tested / Out Of Scope

- A full browser/desktop application pixel comparison was not run. The backend-to-GraphQL values were proven dynamically, and the same generic selector path was proven with focused component execution including an exact temporary six-value fixture.
- All unrelated live Codex approval, restore, interruption, history, and nested-team scenarios were not re-run.
- No permanent assertion that a named model must always advertise today's exact sequence was added.

## Blocked

None.

## Cleanup Performed

- Deleted the temporary live wire-probe test file.
- Restored the frontend test after the temporary six-option fixture.
- Removed generated `autobyteus-web/.nuxt` metadata.
- Live team teardown terminated the team run, closed the websocket/session, deleted test definitions, and removed temporary app-data/workspace roots.
- Verified a clean git worktree before authoring this report.

## Classification

`Pass`; no failure classification applies. Repository-resident durable coverage changed, so mandatory coverage-code re-review is the next workflow step.

## Recommended Recipient

`code_reviewer` for the required narrow review of coverage commit `1df583eb6b142ad771f86c77f8aeeb95c07a0efc`, this execution report, and the cumulative artifact package. Do not route to delivery until that review passes.

## Evidence / Notes

- The current live catalog proves per-model differences without a named-model test dependency: one observed model advertised `max` but not `ultra`, while two advertised both.
- Exact raw/catalog/GraphQL equality passed, so the backend and GraphQL did not drop or invent efforts.
- Live `turn/start` request capture proves AutoByteus sent current and future open strings exactly; the separate live team pass proves `ultra` did not break AutoByteus's communication/tool invariants.
- `fast` remained an independently derived single-value policy and did not broaden with reasoning effort.
- Coverage-code review is mandatory because four repository-resident test files changed after the initial source review.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: All required changed-scope deterministic, live catalog/GraphQL, real-wire, frontend-selector, and realistic `ultra` team-runtime scenarios passed. The next recipient is `code_reviewer`, not delivery.
