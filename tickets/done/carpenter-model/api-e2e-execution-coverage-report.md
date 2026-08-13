# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/design-spec.md`
- Supplemental Task Artifacts: `system-prompt-contract.md`, `agent-identity-prompt-spec.md`, `working-environment-prompt-spec.md`, `bash-operating-practice-prompt-spec.md`, `file-and-directory-practice-prompt-spec.md`, `team-and-runtime-prompt-spec.md`, `prompt-value-binding-spec.md`, `system-skill-decision.md`, and `classroom-simulation-composed-system-prompt.md` in the canonical ticket directory
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/code-review-revision-record.md`
- Delivery Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-001`, `DR-002`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- Current Execution Round: 3
- Trigger: explicit user request to inspect the real result and additionally test Codex with exact model `gpt-5.6-luna`
- Prior Round Reviewed: `API-REV-002` Pass / 98%; `CRR-004` test review Not Applicable; `DR-002` delivery refresh Pass
- Latest Authoritative Round: 3 on reviewed checkpoint `7d7574ae3b300ae21ef337cf9c671916d4b0d9bc`

## Investigation And Execution Basis

- Investigation completed before durable coverage changes or final execution: **Yes**
- Investigation plan followed: **Yes**. Round 3 changed no repository-resident coverage; it reused the repository-owned live Codex catalog and GraphQL/WebSocket E2E paths.
- Existing decisions revised during execution: no. Prior durable dispositions remain authoritative; round 3 added live scenario `API-E2E-011`.
- Reroute required during execution: **No**. Two development-run fixture issues were bounded locally: macOS temp-root canonicalization and a stale test fake's `emitLocalEvent` method, now the current async `publishEvent` interface.

## Compatibility / Legacy Scope Check

- Upstream introduces or tolerates backward compatibility: **No**
- Compatibility-only implementation observed: **No**
- Approved persisted-data transition followed: **Yes — Directly Usable — No Migration**
- Compatibility-only durable coverage added or retained: **No**
- Historical JSON supersets remain readable by normal projection; current writes explicitly omit the retired field. No migration, dual read/write, or version branch was added.

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Criteria | Changed Boundary | Execution Surface / Evidence | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| API-E2E-001 | `AC-005`, `AC-010`; current write omits retired field | GraphQL → file provider | Durable real persistence E2E | Pass | 1 test passed; explicit `not.toHaveProperty` |
| API-E2E-002 | `AC-004`; supported Claude session fixture | Session manager context/exposure | Durable live-gated integration file | Not Tested live | File loaded; 8 external-provider tests explicitly skipped |
| API-E2E-003 | `AC-003`, `AC-004`; effective tools and routes | Runtime exposure → MCP | Durable real loopback MCP integration | Pass | 11 tests passed |
| API-E2E-004 | `AC-004`, `AC-010`, `AC-014`; separate stable system prompt | WebSocket → session → Claude SDK adapter | Durable deterministic E2E | Pass | 4 deterministic tests passed; 1 live subcase skipped |
| API-E2E-005 | `AC-001`, `002`, `007`, `008`, `011`, `012` | GraphQL → active native backend → core tools/filesystem | Durable active-run E2E | Pass | 1 test passed: two reads, relative reference, W/S split, default/nested cwd, inert retired tools |
| API-E2E-006 | `AC-001`, `003`, `004`, `009`, `013`, `014` | Composer, containment, provider/team projection | Durable focused server suites | Pass | 9 files / 84 tests |
| API-E2E-007 | `AC-002`, `008`, `010`, `014` | Native final append/validation/config/public surface | Durable focused core suites and build | Pass | 5 files / 48 tests; build/runtime-deps passed |
| API-E2E-008 | `AC-005`, `AC-010` | Agent Definition UI/store/payload | Durable mounted Nuxt tests | Pass | 5 files / 16 tests |
| API-E2E-009 | Clean current surface and production compilation | Server/core/current repository | Source typecheck, build, search, diff check | Pass | All commands exit 0; retired current-source search empty |
| API-E2E-010 | Real Carpenter prompt and model turn | Built server → AutoByteus backend/runtime → `DeepSeekLLM` → DeepSeek `deepseek-v4-flash` | Live provider E2E using dedicated test vault | Pass | Preflight READY/configured; 2 tests passed; assistant/turn completion and graceful termination observed |
| API-E2E-011 | Real Codex high-authority instructions, configured skill, and two-turn continuity | GraphQL → Codex backend → `codex app-server` → WebSocket/history/projection plus configured-skill materialization | Live Codex E2E with exact `gpt-5.6-luna` | Pass | Exact model preflight; 2 files / 2 selected live tests passed; 19 nonmatching filtered cases skipped |

## Additional Repository Coverage Execution

| Order | Command | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run <5 updated paths> --no-watch` | API-E2E-001–005 | Pass: 17 passed, 9 gated skips | `api-e2e-execution.log` |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run <9 focused paths> --no-watch` | API-E2E-006 | Pass: 84/84 | Same log |
| 3 | `pnpm -C autobyteus-ts exec vitest run <5 focused paths> --no-watch` | API-E2E-007 | Pass: 48/48 | Same log |
| 4 | `pnpm -C autobyteus-web test:nuxt <5 focused paths> --run` | API-E2E-008 | Pass: 16/16 | Same log |
| 5 | Server source-only `tsc`; core `build`; retired-source search; `git diff --check` | API-E2E-009 | Pass | Same log |
| 6 | `pnpm test:e2e:real:preflight -- --scenarios=deepseek.agent-flow` | API-E2E-010 credential/readiness baseline | Pass: READY, required secret initially missing | `api-e2e-live-execution.log` |
| 7 | Value-safe `pnpm secrets:import` into the dedicated test database/vault | API-E2E-010 real credential resolution | Pass: 9 configured, including DeepSeek; no values logged | Same log (sanitized summary) |
| 8 | `pnpm test:e2e:real -- --scenarios=deepseek.agent-flow` | API-E2E-010 real built-server/product-runtime/model lifecycle | Pass: 1 file / 2 tests, including real agent-flow | Same log |
| 9 | Built `CodexModelCatalog` live exact-ID probe | API-E2E-011 model availability/config | Pass: `gpt-5.6-luna` available with current schema | `api-e2e-codex-live-execution.log` |
| 10 | `RUN_CODEX_E2E=1 CODEX_HISTORY_TITLE_E2E_MODEL=gpt-5.6-luna CODEX_E2E_TOOL_MODEL=gpt-5.6-luna pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-single-agent-history-title.e2e.test.ts --no-watch` | API-E2E-011 real two-turn Codex/GraphQL/WebSocket/history lifecycle | Pass: 1 file / 1 test | Same log |
| 11 | `RUN_CODEX_E2E=1 CODEX_E2E_TOOL_MODEL=gpt-5.6-luna pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts --no-watch -t "applies configured runtime skills"` | API-E2E-011 real Codex configured-skill materialization and linked-guidance compliance | Pass: 1 selected test; 19 nonmatching cases skipped by filter | Same log |

Authoritative deterministic total: **23 files and 165 tests passed**. One all-live Claude file (8 tests) and one live WebSocket subcase skipped under explicit external-provider gates and are not counted as passes.

## Validation Confidence Scorecard

| Category | Round-2 Final | Round-3 Final | Change | New Codex Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 99% | 99% | 0 | Real Codex completed two exact-token turns and obeyed a materialized configured skill | Live Claude remains gated; deterministic mapping passes |
| Changed-boundary execution directness | 100% | 100% | 0 | Full GraphQL/backend/app-server/WebSocket/projection path | None material |
| Cross-boundary realism and mock gap | 99% | 100% | +1 | Real DeepSeek and real Codex transports both pass | No real Claude turn |
| Environment/configuration/identity/fixture fidelity | 99% | 99% | 0 | Exact live catalog ID, authenticated Codex CLI, isolated workspace/data | macOS arm64 only |
| Failure/edge/lifecycle/recovery evidence | 98% | 99% | +1 | Real two-turn continuity, stable history title, projection, teardown | Provider failure/retry not induced |
| User-surface/browser/desktop confidence | 95% | 95% | 0 | No browser boundary changed | No pixel-level browser/desktop run |
| Durable regression quality/relevance | 97% | 97% | 0 | No round-3 test edits; prior coverage remains reviewed | Live scenario is environment-gated |

- Overall prior confidence: **98%**
- Overall final confidence: **98%** (simple average `98.43%`, rounded)
- Confidence change: rounded overall unchanged; cross-boundary realism and lifecycle categories improved
- Every critical acceptance criterion directly proven: **Yes**
- Any applicable category below 90%: **No**
- Default 95% target met: **Yes**

## Broader Validation Decision And Execution

- Decision: **Required by explicit user request and Completed**
- Round 2: real built native AutoByteus runtime with DeepSeek `deepseek-v4-flash` passed.
- Round 3: real Codex App Server with exact `gpt-5.6-luna` passed.
- Codex model preflight: built production `CodexModelCatalog` queried live `model/list` and found the exact ID with current reasoning and fast-tier schema.
- Codex execution: GraphQL created the agent/run/workspace; `codex_app_server` started through the normal backend; two user messages each received the exact requested unique response token; active history retained the initial title; projection retained both messages. A second live scenario materialized a configured skill and linked guidance and received its unique required response token. Socket/session/definition/workspace cleanup passed.
- Test result: 2 files / 2 selected live tests passed; the filtered configured-skill file reported 19 nonmatching cases skipped. Codex CLI `0.147.0`.
- Initial execution-method deviation: `pnpm exec tsx` was unavailable. The exact-model probe was immediately rerun successfully against already-built production JS modules. No source/test change was made and the failure was not a product failure.
- Credential safety: local Codex authentication was used; no token or credential values were logged.
- Browser/desktop remains unnecessary because no browser-specific behavior changed.

## Platform / Runtime Targets

- Platform: macOS Darwin 25.5.0, arm64
- Node: `v22.23.1`
- pnpm: `10.28.2`
- Test runners observed: server/core Vitest `4.0.18`; web Vitest `3.2.4`
- Live Codex runtime: `codex-cli 0.147.0`; exact model `gpt-5.6-luna`
- Browser/desktop engine: N/A; mounted Nuxt test environment used

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Decision: **Directly Usable — No Migration**
- Representative data: real current GraphQL-created definition/config plus generic historical-superset projection behavior covered upstream
- Result: current writer omits `systemPromptProcessorNames`; runtime public/source surfaces have no retired processor pipeline
- Migration/compatibility branch: **None observed**
- Residual risk: historical prompts/sessions intentionally remain historical by contract

## Tests Implemented Or Updated

| Path | Change | Boundary | Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-definitions/json-file-persistence-contract.e2e.test.ts` | Updated | Current writer negative retired-field contract | Pass |
| `autobyteus-server-ts/tests/integration/agent-execution/claude-session-manager.integration.test.ts` | Updated | Current runtime exposure/context fixture | Gated: loads, 8 live tests skipped |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Updated | Current runtime exposure and current event publisher fixture | Pass: 11 |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts` | Updated | Carpenter system prompt across create/resume; raw user prompts | Pass: 4 deterministic; 1 live skip |
| `autobyteus-server-ts/tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts` | Updated | Active native prompt/skill/workspace/shell/freshness lifecycle | Pass: 1 |

## Tests Removed As Stale Or Obsolete

None. The stale fixtures had valid scenario intent and were updated in place.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage changed in round 3: **No**
- Added: 0
- Updated: 0 (the five round-1 paths remain unchanged and passed `CRR-003`; round 2 was `CRR-004` Not Applicable)
- Removed: 0
- Proportional test-code review: **Not Applicable for round 2**

## Other Execution Artifacts

| Artifact | Purpose | Retained |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-execution.log` | Full authoritative commands, environment, output, exit codes | Yes |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-coverage-investigation.md` | Pre-edit dispositions and final decisions | Yes |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-live-execution.log` | Value-safe live preflight/import summary and full real-provider execution evidence | Yes |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/carpenter-model/api-e2e-codex-live-execution.log` | Live exact-model catalog probe and full real Codex two-turn E2E evidence | Yes |

## Temporary Execution Methods / Scaffolding

No repository-resident temporary scaffolding. `/tmp/run-carpenter-final-validation.sh` and a transient web output file were local command helpers only and are outside the repository.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Claude response stream | Existing deterministic SDK adapter in WebSocket E2E | Proves exact request/session/lifecycle without credentials or stochastic output | Does not prove model prose compliance |
| Native LLM response | Existing deterministic LLM in active-run E2E | Exercises actual backend/core/tool lifecycle deterministically | Does not call a remote model |
| Browser | Mounted Nuxt/Vue environment | Affected UI change is control/payload deletion | No pixel-level shell evidence |

## Result Summary

| Result | Scenario IDs | Summary |
| --- | --- | --- |
| Pass | API-E2E-001, 003–011 | All deterministic boundaries plus requested real DeepSeek and Codex runtime turns pass |
| Not Tested | API-E2E-002 live cases; live subcase of 004 | Explicit external-provider gates; corrected files load and deterministic peer boundaries pass |
| Fail/Blocked | None | No unresolved validation failure |

## Cleanup Performed

All test-owned servers, MCP clients, sockets, provider sessions, registries, temp app data, workspaces, skills, and files used by the selected suites completed their normal teardown. No existing desktop app was touched.

## Preliminary Classification

**Pass.** The two development fixture corrections were API/E2E-owned local fixes and passed after correction. No implementation, design, or requirement failure was found.

## Recommended Recipient

`code_reviewer` to record round-3 proportional test review as Not Applicable (no durable coverage changed) and route the updated cumulative evidence back to delivery.

## Evidence / Notes

- Full server and Nuxt typechecks were not claimed; their documented pre-existing blockers remain. Server source-only TypeScript, core production build/runtime dependency verification, and all selected executable suites passed.
- `AC-006` documentation sync was completed in `DR-001`; rounds 2 and 3 did not alter documentation.

## Latest Authoritative Result

- Result: **Pass**
- Final validation confidence: **98%**
- 95% target met: **Yes**
- Any applicable category below 90%: **No**
- Broader validation decision: **Completed by explicit user request**
- Live evidence: real native AutoByteus/DeepSeek turn plus real Codex App Server/`gpt-5.6-luna` two-turn and configured-skill lifecycles passed
- Critical executable acceptance criteria lacking direct proof: **None**
- Durable coverage changed in round 3: **No**
- Required next recipient: **`code_reviewer` for Not Applicable test-code review routing**
