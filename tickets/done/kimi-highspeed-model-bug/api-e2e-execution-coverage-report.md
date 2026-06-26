# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/tickets/done/kimi-highspeed-model-bug/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/tickets/done/kimi-highspeed-model-bug/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/tickets/done/kimi-highspeed-model-bug/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/tickets/done/kimi-highspeed-model-bug/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/tickets/done/kimi-highspeed-model-bug/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/tickets/done/kimi-highspeed-model-bug/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/tickets/done/kimi-highspeed-model-bug/api-e2e-coverage-investigation.md`
- Current Execution Round: 1
- Trigger: Code-review pass for Kimi HighSpeed/global LLM config-composition ticket.
- Prior Round Reviewed: N/A
- Latest Authoritative Round: Round 1

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code-review pass; API/E2E coverage investigation and execution required | N/A | None in final execution set | Pass | Yes | Existing durable coverage passed; temporary backend/factory, request-capture, and live Kimi HighSpeed probes passed; builds and diff hygiene passed. |

## Execution Basis

Execution followed the approved requirement/design basis that factory-created runtime LLM config composition must apply:

`base framework defaults -> model registry defaultConfig -> explicit user/run llmConfig overrides only -> provider/model invariant enforcement -> request builder/provider SDK`.

The concrete failure path was Kimi `/ kimi-k2.7-code-highspeed`, where the provider requires fixed K2.7 Code sampling values. API/E2E proved both deterministic request construction and a live provider acceptance attempt with credentials available in the environment.

## Pre-Execution Coverage Investigation

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/tickets/done/kimi-highspeed-model-bug/api-e2e-coverage-investigation.md`
- Completed before final test execution, durable coverage edits, durable coverage removals, or failure rerouting: `Yes`
- Existing durable coverage inventory reviewed: `Yes`
- Existing tests treated as authority without current-requirement validity review: `No`
- Stale or obsolete coverage found: `No`
- New durable coverage needed: `No`
- Reroute required from investigation: `No`
- Notes: Initial execution planning included a single server-side request-capture probe. A first harness attempt showed that the server-side `openai` mock did not intercept the dependency path and produced a `401 Invalid Authentication` with a test key. That was classified as a temporary probe harness issue, not an implementation/provider defect. The investigation was updated before final execution to split the proof into TEMP-001A backend/factory config capture and TEMP-001B `autobyteus-ts` request capture.

## Existing Durable Coverage Decision Summary

| Path / Scenario | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Action Taken | Evidence |
| --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/llm/utils/llm-config-overrides.test.ts` | Still Valid | Ran final focused durable coverage | Passed, 4 tests, in `pnpm -C autobyteus-ts exec vitest run ...` command. |
| `autobyteus-ts/tests/unit/llm/llm-factory-config-composition.test.ts` | Still Valid | Ran final focused durable coverage | Passed, 3 tests, in `pnpm -C autobyteus-ts exec vitest run ...` command. |
| `autobyteus-ts/tests/unit/llm/api/kimi-llm.test.ts` | Still Valid | Ran final focused durable coverage | Passed, 13 tests, including Kimi HighSpeed fixed request normalization and K2.6 non-regression. |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Still Valid | Ran final focused durable coverage | Passed, 7 tests, including both Kimi K2.7 official rows sharing policy-backed defaults. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts` | Still Valid | Ran final focused durable coverage | Passed, 8 tests, including raw `llmConfig` handoff without `LLMConfig({ extraParams })` wrapping. |
| `autobyteus-ts/tests/integration/llm/api/kimi-llm.test.ts` | Still Valid but not sufficient for HighSpeed-specific proof | Retained; not updated. Used a temporary HighSpeed-specific live probe instead. | Existing file remains useful for K2.6/non-HighSpeed K2.7 provider coverage. |
| Broad server runtime GraphQL E2E suites | Still Valid / Out Of Scope for exact HighSpeed proof | Retained; not selected for final focused run. | These suites do not intentionally select Kimi HighSpeed or capture final request params. |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

Evidence: The old AutoByteus backend `new LLMConfig({ extraParams: llmConfig })` raw-config wrapper is removed. Kimi HighSpeed is preserved as a distinct official provider identifier, not as an alias or fallback. No compatibility wrapper, dual read/write path, schema-upgrade shim, retained legacy branch, or fallback behavior for the old raw-config collision behavior was observed.

## Execution Surfaces / Modes

- Durable unit/request-shape tests in `autobyteus-ts`.
- Durable backend unit tests in `autobyteus-server-ts`.
- Temporary server-side backend/factory config probe for the Daily-Assistant-relevant AutoByteus backend assembly path.
- Temporary `autobyteus-ts` factory -> KimiLLM -> request-builder request-capture probe.
- Temporary live Kimi HighSpeed provider probe using available `KIMI_API_KEY` without printing secrets or response text.
- Build and diff hygiene checks.

## Platform / Runtime Targets

- Host/worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug`
- Branch: `codex/kimi-highspeed-model-bug`
- Node/Vitest via repository `pnpm` workspaces.
- Provider runtime target: Kimi/Moonshot Chat Completions endpoint through `KimiLLM` and OpenAI-compatible request path.

## Lifecycle / Upgrade / Restart / Migration Checks

N/A. This ticket does not change installer, updater, restart, migration, recovery, or multi-process lifecycle behavior.

## Coverage Matrix

| Scenario ID | Behavior / Boundary | Evidence Type | Result |
| --- | --- | --- | --- |
| DUR-001 | Raw config override applier preserves absence semantics, first-class standard keys, unknown extras, and standard-key filtering | Durable unit tests | Pass |
| DUR-002 | `LLMFactory` composes model defaults plus raw partial overrides and keeps effective `LLMConfig` callers supported | Durable unit tests | Pass |
| DUR-003 | `KimiLLM` normalizes HighSpeed and non-HighSpeed K2.7 fixed values and preserves K2.6 behavior | Durable mocked request-shape unit tests | Pass |
| DUR-004 | Catalog exposes both Kimi K2.7 official IDs with shared fixed defaults | Durable unit tests | Pass |
| DUR-005 | AutoByteus backend passes raw run `llmConfig` to `LLMFactory` without wrapping as extraParams | Durable server unit tests | Pass |
| TEMP-001A | Daily-Assistant-style backend -> factory config path creates a HighSpeed LLM with raw standard keys first-class and no standard-key extras | Temporary server-side probe | Pass |
| TEMP-001B | Factory-created HighSpeed final request includes fixed K2.7 values and unknown extras without standard-key collision | Temporary request-capture probe | Pass |
| TEMP-002 | Live provider accepts factory-created HighSpeed request after invalid raw fixed values are normalized | Temporary live provider probe | Pass |
| BUILD-001 | `autobyteus-ts` build | Build | Pass |
| BUILD-002 | `autobyteus-server-ts` build | Build | Pass |
| HYGIENE-001 | `git diff --check` | Diff hygiene | Pass |

## Test Scope

Focused on the reviewed change scope:

- Kimi HighSpeed request parameter construction.
- Kimi K2.7 fixed provider invariants.
- Global raw run/default-launch config composition for factory-created LLMs.
- AutoByteus backend raw config handoff.
- Standard-key/extraParams collision prevention.
- Unknown provider-specific key pass-through.
- Kimi K2.6 non-regression.
- Catalog row preservation for both official K2.7 identifiers.

## Execution Setup / Environment

- `KIMI_API_KEY` was present for live provider validation; no key value was printed.
- Temporary probe files were created under `autobyteus-server-ts/tests/` or `autobyteus-ts/tests/`, executed, and removed immediately after execution.
- The server Vitest setup reset its test SQLite database for server-side probe/unit runs.

## Tests Implemented Or Updated

No repository-resident durable tests were added, updated, or removed during API/E2E Round 1.

The following temporary tests/probes were created and removed during execution only:

- `autobyteus-server-ts/tests/tmp-kimi-highspeed-backend-config.probe.test.ts`
- `autobyteus-ts/tests/tmp-kimi-highspeed-request-capture.probe.test.ts`
- `autobyteus-ts/tests/tmp-kimi-highspeed-live.probe.test.ts`

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| N/A | N/A | No stale durable coverage found. | N/A |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`
- Paths added or updated: N/A
- Paths removed: N/A
- If `Yes`, returned through `code_reviewer` before delivery: N/A
- Post-API/E2E coverage code review artifact: N/A

## Other Execution Artifacts

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/tickets/done/kimi-highspeed-model-bug/api-e2e-coverage-investigation.md`
- Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/tickets/done/kimi-highspeed-model-bug/api-e2e-execution-coverage-report.md`

No separate log files were persisted; command outputs were observed in the execution session and summarized here.

## Temporary Execution Methods / Scaffolding

- TEMP-001A: temporary server-side Vitest probe built `AgentConfig` through `AutoByteusAgentRunBackendFactory` using actual `LLMFactory` and inspected the resulting HighSpeed `llmInstance` model/config. Passed and file was removed.
- TEMP-001B: temporary `autobyteus-ts` Vitest probe mocked `openai`, created a factory HighSpeed LLM with invalid raw fixed values plus unknown extras, sent one request, and captured final request params. Passed and file was removed.
- TEMP-002: temporary live Kimi HighSpeed provider probe used available `KIMI_API_KEY`, created a factory HighSpeed LLM with invalid raw fixed values, sent one short request with `max_tokens: 32`, and verified a non-empty `CompleteResponse`. Passed and file was removed. Output only logged `accepted=yes` and response content length.
- Superseded harness attempt: an earlier server-side request-capture probe failed with `401 Invalid Authentication` because its mock did not intercept the package dependency path and the test key reached the real provider. The temporary file was removed. The final plan split backend config capture and package-local request capture to avoid that harness issue.

## Dependencies Mocked Or Emulated

- TEMP-001B mocked the `openai` package to capture request payloads without a provider call.
- Durable `KimiLLM` unit coverage also mocks the OpenAI client.
- TEMP-002 used the live Kimi provider with configured credentials; no provider dependency was mocked.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | First execution round. | N/A |

## Scenarios Checked

- DUR-001 through DUR-005, TEMP-001A, TEMP-001B, TEMP-002, BUILD-001, BUILD-002, HYGIENE-001.

## Passed

- `pnpm -C autobyteus-ts exec vitest run tests/unit/llm/utils/llm-config-overrides.test.ts tests/unit/llm/llm-factory-config-composition.test.ts tests/unit/llm/api/kimi-llm.test.ts tests/unit/llm/supported-model-definitions.test.ts` — Passed (4 files, 27 tests).
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts` — Passed (1 file, 8 tests).
- Temporary server-side backend/factory config probe — Passed (1 file, 1 test); probe removed.
- Temporary `autobyteus-ts` factory request-capture probe — Passed (1 file, 1 test); probe removed.
- Temporary live Kimi HighSpeed provider probe — Passed (1 file, 1 test); provider accepted the request (`accepted=yes`, response length observed, no response text logged); probe removed.
- `pnpm -C autobyteus-ts build` — Passed.
- `pnpm -C autobyteus-server-ts build` — Passed, including shared package builds, Prisma generation, TypeScript build, asset copy, and built-in agents bootstrap smoke check.
- `git diff --check` — Passed.

## Failed

None in the final execution set.

Superseded harness note: the first combined server request-capture probe failed due mock interception/authentication setup and was replaced before final execution. It did not represent a current-behavior failure and did not require reroute.

## Not Tested / Out Of Scope

- Full browser/UI Daily Assistant manual flow was not run. The bug boundary is backend/factory/provider request construction; TEMP-001A, TEMP-001B, TEMP-002, and durable coverage directly prove that scoped path.
- Repository-wide `pnpm -C autobyteus-server-ts typecheck` was not rerun because the implementation handoff records a pre-existing TS6059 rootDir/include mismatch. Server build passed.

## Blocked

None.

## Cleanup Performed

- Removed all temporary probe files:
  - `autobyteus-server-ts/tests/tmp-kimi-highspeed-backend-config.probe.test.ts`
  - `autobyteus-ts/tests/tmp-kimi-highspeed-request-capture.probe.test.ts`
  - `autobyteus-ts/tests/tmp-kimi-highspeed-live.probe.test.ts`
- Verified `git status --short --branch` shows no leftover temporary probe files.

## Classification

- `Local Fix`: N/A
- `Design Impact`: N/A
- `Requirement Gap`: N/A
- `Unclear`: N/A

## Recommended Recipient

`delivery_engineer`

## Evidence / Notes

- No API/E2E-stage repository-resident durable coverage code was added, updated, or removed after code review, so no coverage-code re-review loop is required.
- Docs impact remains `Yes` per code review; delivery should sync docs or record an explicit no-impact decision after integrated-state refresh.
- Live Kimi HighSpeed provider validation passed in this environment. Future failures due credentials, quota, provider availability, or rate limits should be classified separately from request-construction correctness.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: Final API/E2E and executable coverage evidence passed for Kimi HighSpeed/global LLM config composition. Proceed to delivery integrated refresh and docs/finalization.
