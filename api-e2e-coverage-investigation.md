# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: /Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/requirements.md
- Investigation Notes: /Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/investigation-notes.md
- Design Spec: /Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/design-spec.md
- Supplemental Task Artifacts: /Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/provider-error-and-pricing-contract.md; /Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/tickets/done/application-agent-streaming/application-agent-communication-contract.md
- Solution Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/solution-revision-record.md
- Design Review Report: /Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/design-review-report.md
- Architecture Review Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/architecture-review-revision-record.md
- Implementation Handoff: /Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/implementation-handoff.md
- Implementation Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/implementation-revision-record.md
- Code Review Report: /Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/code-review-report.md
- Code Review Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/code-review-revision-record.md
- Delivery Revision Record: N/A
- API/E2E Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/api-e2e-revision-record.md
- Current API/E2E Revision ID: API-REV-007
- Current Investigation Round: 7
- Trigger: Solution-designer scope decision that LM Studio compaction and broad live-provider capability are non-gating residuals for this ticket-specific validation.
- Prior Investigation Reviewed: Round 4 / API-REV-004, including its execution report and revision record.
- Latest Authoritative Investigation: Round 7, this file.

## Current Requirement And Design Basis

The approved change has three validation spines. DS-001 proves latest-only curated model/catalog and runtime-scoped selection for Grok 4.6, Gemini 3.7 Flash, Kimi K3, GLM 5.3, and MiniMax M3, including explicit rejection of removed AutoByteus identifiers without aliases and preservation of Claude/Codex runtime ownership. DS-002 proves current DeepSeek V4 pricing is selected by UTC time-of-day, never event date, and is recorded in new pricing snapshots while existing snapshots remain immutable. DS-003 proves missing-key mapping, safe original provider-message passthrough, canonical native code plus message, native/team/web transport, and the intentionally message-only application-agent SDK projection.

Critical acceptance criteria are AC-001-AC-018, with direct emphasis on AC-003/004 (pricing schedule/snapshot), AC-008/009 (missing credentials and vault distinction), AC-010-AC-015 (provider error fidelity, canonical transport, team/Docker-equivalent stream, redaction, genuine validation), AC-016/017 (MiniMax), and AC-018 (saved removed-model reselection). The implementation handoff compatibility check is clean: no aliases, historical price table, dual request branch, or version-specific fallback was introduced. Persisted data is Directly Usable - No Migration: old usage snapshots remain readable and immutable; saved removed model identifiers remain stored but are rejected with explicit reselection.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| B-001/B-003/B-004/B-005/B-010 catalog rows and request policies | Changed / Removed | requirements REQ-001/002/005/011/012; DS-001 | Execute catalog, factory, adapter request-capture, metadata, and saved-model validation; provider live acceptance is separate. |
| B-002 DeepSeek V4 pricing | Changed | REQ-003/004; DS-002; pricing supplement | Execute timestamp boundaries, latest-only old dates, invalid times, tier arithmetic, and persisted snapshot/API coverage. |
| B-006 missing API-key and vault mapping | Changed | REQ-006/009; error supplement | Execute resolver and secret-management GraphQL/E2E; run real capability preflight without exposing secrets. |
| B-007/B-009 safe original provider message | Changed | REQ-007/009; DS-003; SR-013 | Execute provider-error fixtures, native WebSocket, frontend handler, team/application projection, and redaction evidence. |
| B-008 canonical native error transport | Changed | REQ-008; DS-003; CRR-002 | Existing focused tests are valid; inspect/update integration fixtures that omit required code before execution. |
| B-009 provider-neutral application ERROR | Shape preserved, message source changed | SR-013, application communication contract, IR-002 | Existing application WebSocket integration lacks terminal ERROR; add direct durable coverage in its existing owner. |
| Runtime-aware saved/direct and team launch validation | Changed | ARCH-REV-003/004; implementation handoff | Execute orchestration unit and runtime E2E matrix; verify external runtime ownership. |
| Native web and web-equivalent renderer | Changed / layout preserved | REQ-009/010; ErrorSegment.vue; implementation handoff | Execute parser/handler/stream tests; decide browser validation after API evidence. |
| Docker build identity/live provider rejection | Unclear residual | MP-005/006; code-review residual risks | Run test-runtime preflight and local built-server checks; do not claim Docker/live success without identified build/capability. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised | Candidate Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Domain/backend logic | Yes | autobyteus-ts catalog, adapters, pricing, error extraction, missing-key error | Focused unit/build evidence and relevant unit inventory | Provider SDK may reject payload; endpoint/pricing fidelity remains unproven | Provider integration/API fixture |
| API/transport/contract | Yes | AgentRun mapper/team adapter/DTO/native WS plus application projector/SDK | Unit projector and in-process integration harnesses | Application WS lacks terminal ERROR; Docker boundary unproven | Durable WS integration; local built server |
| Frontend component/state | Yes | Native error parser/handler and existing ErrorSegment message rendering | Parser/handler and SDK tests | No browser assertion of streamed provider error | Browser or focused runtime check |
| Browser integration/user journey | Yes | WebSocket stream error to conversation error segment | Repository tests only | Routing/config/real socket/DOM across provider failure | Browser if safe deterministic route exists |
| Authentication/session/permissions | Yes | Vault lookup and missing-key boundary | Resolver and secret lifecycle tests | Full provider-backed failure with real vault/provider | Test-runtime API; live preflight |
| Desktop renderer/web-equivalent UI | Yes | Electron shares web stream path; no shell source changed | Web build/focused frontend tests | Packaged renderer/socket runtime | Browser preferred; Electron last resort |
| Desktop shell/Electron-specific | No material shell change | No preload/IPC/window/packaging source changed | Existing package instructions/build | Shell not implicated | Not required unless browser reveals dependency |
| Process/lifecycle | Yes | Agent/team terminal error and app binding termination | Lifecycle/unit/integration coverage | Restart/recovery and Docker identity | Lifecycle/API integration |
| Persisted-data transition | Yes | Additive pricing snapshots; stale saved model rejection | Orchestration and token usage tests | Assembled direct-use proof | Test-owned SQLite E2E |
| Worker/queue/distributed | No material change | No queue implementation changed; team adapter in scope | Team integration harness | Actual Docker node transport | Local built server/Docker only if owned |
| External integration | Yes | Provider endpoint/payload, vault import, GLM/MiniMax deployment evidence | Mocked adapters/catalog metadata | Account/quota/auth/rate limits and endpoint fidelity | Live API when capability is configured |

## Project Execution Discovery

- Assigned worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging
- Stack: pnpm TypeScript monorepo; autobyteus-ts provider/runtime; Fastify + GraphQL + WebSocket server; team-stream Zod contracts; Nuxt/Vitest frontend; optional Electron; Prisma SQLite test runtime.
- Instructions: no root AGENTS.md; applicable instructions are autobyteus-server-ts/AGENTS.md, autobyteus-web/AGENTS.md, and root/server/web READMEs. Docker port 8001/build identity is unknown and must not be assumed.
- Required secrets available: unknown until preflight; no secret values will be recorded/displayed.

| Instruction / Configuration Path | Authority / Commands / Constraints |
| --- | --- |
| README.md | pnpm install; pnpm dev owns backend 8000/frontend 3000; pnpm test:e2e uses isolated test runtime; pnpm test:e2e:real:preflight reports capabilities; unavailable capabilities are not pass. |
| autobyteus-server-ts/AGENTS.md | pnpm -C autobyteus-server-ts exec vitest; use vitest run and --no-watch. |
| autobyteus-server-ts/README.md | Tests use .env.test and temporary SQLite under tests/.tmp; real E2E is explicit; importer requires absolute DB URL; never use development DB for tests. |
| autobyteus-web/AGENTS.md and README.md | pnpm test:nuxt path --run; browser probes use Playwright Core and explicit target; packaged Electron is last resort. |
| package manifests/vitest configs | Server has Prisma global setup and fork pool; autobyteus-ts loads tests/setup.ts; package build/test scripts are authoritative. |
| autobyteus-server-ts/docker/README.md | Source helper owns docker/.runtime; public launcher owns ~/.autobyteus/docker-server; do not stop/reuse unknown containers. |

| Component | Setup | Readiness / Cleanup |
| --- | --- | --- |
| Deterministic server tests | pnpm test:e2e or focused Vitest E2E | Test hooks own/remove test DB/runtime; Vitest completion is readiness. |
| Built local server if needed | pnpm -C autobyteus-server-ts build then dist/app.js with owned data-dir/free port | HTTP/GraphQL readiness; kill only owned PID and remove owned data. |
| Browser target if needed | pnpm dev with explicit backend | HTTP readiness; stop only owned processes. |
| Docker if needed | only newly created owned node via documented helper | Verify ports/build; stop/remove only created resources. |
| Live-provider capability | pnpm test:e2e:real:preflight; execute only configured safe capability | No secret values in logs; test runtime cleanup through hooks. |

| Data / Fixture Need | Existing Mechanism | Safety / Cleanup |
| --- | --- | --- |
| Catalog/pricing | Existing deterministic unit/integration fixtures | No external state. |
| Provider errors | provider-error/projector tests; add transport fixtures only for confirmed gap | Synthetic safe messages/status/request IDs; no secrets. |
| Missing key | Secret resolver and owned secret lifecycle test DB | Test hooks remove owned runtime. |
| Saved removed model | Orchestration tests and runtime matrix | Test-owned fixtures/reset. |
| Browser state | Nuxt setup or temporary Playwright profile | Close browser/remove temp profile. |
| Docker identity | New owned node or recorded known build only | Remove only owned resources. |

## Persisted Data Transition Coverage Basis

- Approved decision: Directly Usable - No Migration.
- References: design-spec DS-001/DS-002 and implementation-handoff Persisted Data Transition Check.
- Representative behavior: existing pricing snapshots are readable/unchanged; saved removed AutoByteus IDs remain stored but fail with CURRENT_MODEL_SELECTION_REQUIRED before persistence/readiness/run side effects.
- Planned evidence: pricing policy/token-usage E2E for schedule fields; orchestration/runtime tests for stale saved models and runtime ownership; source check for no alias/migration branch.
- Migration-specific scenarios: N/A.
- Upstream ambiguity/reroute: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Intent | Related Scope | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts | Current target rows, removed IDs, schedule, unpriced GLM, exact guard | AC-001-004, AC-016-018; DS-001/002 | Still Valid | Focused code-review tests passed; assertions match current contract. | Execute. |
| autobyteus-ts/tests/unit/llm/api/{grok,glm,kimi,deepseek}-llm.test.ts and request payload tests | Current provider request shape/thinking/reasoning policies | AC-002, AC-005-007 | Still Valid | Current IDs/fields are asserted. | Execute. |
| autobyteus-ts/tests/unit/llm/errors/provider-error.test.ts and agent/events/notifiers.test.ts | Safe provider evidence, redaction, missing-key category, canonical code/message/classification | AC-008-012; DS-003 | Still Valid | Direct deterministic tests. | Execute. |
| autobyteus-ts/tests/unit/agent/streaming/events/stream-event-payloads.test.ts | Error event requires non-empty code/message | AC-013/015 | Still Valid | Current assertions enforce code. | Execute. |
| autobyteus-server-ts/tests/unit/token-usage/pricing/token-price-config-provider.test.ts | DeepSeek peak/off-peak, old dates/latest-only, invalid time | AC-003/004 | Still Valid | Existing assertions include schedule ID/period. | Execute. |
| autobyteus-server-ts/tests/unit/secret-management/secret-management-provider-api-key-resolver.test.ts | Missing/blank mapping and non-missing vault preservation | AC-008/009 | Still Valid | Exact category and error preservation asserted. | Execute. |
| autobyteus-server-ts/tests/unit/application-orchestration/application-execution-resource-configuration-service.test.ts and application-run-binding-launch-service.test.ts | Saved stale model, per-member validation, external runtime ownership/no side effects | AC-002/018; DS-001 | Still Valid | Current tests directly encode owner boundary. | Execute. |
| autobyteus-server-ts/tests/unit/application-agent-streaming/application-agent-stream-event-projector.test.ts | Agent/team terminal errors preserve safe message and exclude native evidence/raw data | AC-014/015; DS-003; CRR-002 | Still Valid | 16 focused tests passed in CRR-002. | Execute. |
| autobyteus-server-ts/tests/unit/application-agent-streaming/application-agent-runtime-source.test.ts | Team producer attribution and selected-member filtering | AC-014/015; DS-003 adjacent | Needs Update | Execution found the fixture still emits retired raw TeamRunEvent fields and omits the current sequenced root-event envelope; it fails before exercising current attribution. | Update to current binding and sequenced event shapes. |
| autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts | Native standalone WS lifecycle and terminal error status | AC-013/014; DS-003 | Needs Update | Synthetic errors omit required code and do not assert serialized error payload. | Add canonical code/evidence and wire assertions. |
| autobyteus-server-ts/tests/integration/agent-team-execution/team-agent-segment-admission.integration.test.ts | AgentRun -> Team adapter/wire/application projection for segment lifecycle | AC-013/014; DS-003 | Needs Update | No ERROR case at this cross-boundary owner. | Add terminal error case with canonical code/message and application narrowing. |
| autobyteus-server-ts/tests/integration/application-backend/application-agent-communication-ws.integration.test.ts | Real application SDK + WebSocket connect/input/text/turn routing | AC-014/015; DS-003 | Needs Update | No terminal ERROR over real application WebSocket. | Add agent/team terminal error wire assertions. |
| autobyteus-server-ts/tests/integration/agent/agent-websocket.integration.test.ts | Standalone command lifecycle/ACK protocol | AC-013/015 adjacent | Still Valid | ACK errors are separate and remain valid. | Execute; no change. |
| autobyteus-server-ts/tests/e2e/llm-management and token-usage relevant GraphQL suites | Catalog metadata, pricing/unit/snapshot API and persistence | AC-001-004, AC-016/017 | Needs Update | Execution found the Gemini metadata E2E still selects retired `gemini-3-flash-preview`, while the approved catalog now exposes `gemini-3.7-flash`; it fails before intended metadata assertions. | Update the synthetic response and selectors to the approved current Gemini row, then rerun. |
| autobyteus-server-ts/tests/e2e/secret-management relevant suites | Vault lifecycle, no value readback, value-free catalogs | AC-008/009/015 | Still Valid | Existing E2E setup is isolated and credential-free. | Execute. |
| autobyteus-server-ts/tests/e2e/runtime relevant matrix | Runtime ownership and saved/direct/team validation | AC-002/018; DS-001 | Still Valid | Existing matrix is the approved ownership boundary. | Execute; report external-runtime skips. |
| autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities and root preflight | External capability reporting | AC-005/007/010-012/017 | Still Valid | Project explicitly reports unavailable capabilities. | Run preflight; execute only safe configured capabilities. |
| autobyteus-web protocol/handler/stream tests and application SDK tests | Native error parsing/metadata and message-only application contract | AC-011/014/015 | Still Valid | Existing source/tests align with DS-003 and IR-002. | Execute; no browser-specific edit unless needed. |
| autobyteus-team-stream-contracts build/tests | Team DTO contract and strict required fields | AC-013-015 | Still Valid | DTO requires canonical code/message; integration gap is separate. | Execute. |

## Stale Or Obsolete Coverage Decisions

No relevant test asserts an approved-obsolete behavior and no test is slated for removal. Execution found two incomplete/stale fixtures: agent-status-websocket terminal errors omit required code, and the runtime-source unit still emits retired raw TeamRunEvent/task-agent fields instead of the current sequenced root-event envelope. They will be updated to current valid evidence. Team/application integration owners lack a terminal ERROR scenario and will be expanded, not removed. This is coverage repair, not compatibility retention.

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement |
| --- | --- | --- | --- |
| agent-status-websocket.integration.test.ts terminal fixture | Missing code in synthetic native error | REQ-008/DS-003/CRR-002 make native code required | Same scenario with canonical code/evidence and serialized assertions |
| Other paths | None | Requirements/design/current tests coherent | None |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Evidence | Planned Path | Why Needed |
| --- | --- | --- | --- | --- |
| API-ERR-001 | Standalone native WS terminal provider error retains code/message/evidence and no raw leakage | AC-013-015; DS-003 | agent-status-websocket.integration.test.ts | Existing lifecycle test does not prove valid wire payload. |
| API-ERR-002 | Native Team adapter/wire accepts provider error while application narrows to message-only | AC-014/015; DS-003/SR-013 | team-agent-segment-admission.integration.test.ts | Directly covers Docker/team admission boundary. |
| API-ERR-003 | Real application communication WS sends agent/team terminal ERROR as {type:ERROR,message} with no native metadata | AC-014/015; app contract | application-agent-communication-ws.integration.test.ts | Existing app WS test covers only text/turn events. |
| API-ERR-004 | Native web handler retains supplied message/safe evidence | AC-011/014/015; DS-003 | agentStatusHandler.spec.ts only if existing assertions insufficient | Direct user-surface deterministic proof; browser decision remains separate. |
| API-ERR-005 | Runtime source consumes the current sequenced Team publisher envelope and filters selected members | AC-014/015 adjacent; current TeamRun publisher contract | application-agent-runtime-source.test.ts | Existing unit fixture is stale and failed during execution; updating it prevents a false green/false red boundary. |
| API-ERR-006 | GraphQL metadata provenance remains exercised for the approved Gemini catalog identifier | AC-001/002; DS-001 | model-metadata-provenance-graphql.e2e.test.ts | Existing E2E selectors target a retired Gemini identifier and fail before provenance assertions. |

## Durable Coverage To Update

| Scenario ID | Existing Path | Required Update |
| --- | --- | --- |
| API-ERR-001 | agent-status-websocket.integration.test.ts | Add code/provider evidence and serialized error assertions. |
| API-ERR-002 | team-agent-segment-admission.integration.test.ts | Add AgentRun ERROR -> Team adapter -> wire -> application projection. |
| API-ERR-003 | application-agent-communication-ws.integration.test.ts | Add real agent/team WebSocket terminal ERROR assertions. |
| API-ERR-005 | application-agent-runtime-source.test.ts | Replace retired raw TeamRunEvent/task-agent fixture with current sequenced root-event and producer shapes. |
| API-ERR-006 | model-metadata-provenance-graphql.e2e.test.ts | Replace retired `gemini-3-flash-preview` fixture/selectors with `gemini-3.7-flash`. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan

1. Update the three planned durable integration owners above after this investigation is written; if execution exposes a stale current-contract fixture, update that owner and record the new scenario before proceeding. No production source change is planned.
2. Execute updated focused native/team/application integration tests first, then autobyteus-ts provider/catalog units, server pricing/orchestration/secret/projector units, team contracts, frontend parser/handler/application SDK contracts.
3. Execute selected server GraphQL/runtime/token/secret E2E suites with test-owned SQLite, followed by pnpm test:e2e:real:preflight. Run real-provider capabilities only if preflight reports safe configured capability.
4. Run autobyteus-ts, team contracts, server, and web builds and git diff --check.
5. Decide browser validation after API/WS evidence. Do not run Electron desktop unless shell-specific behavior becomes material; no shell source changed.
6. If durable coverage changes pass, route the complete package and coverage/execution reports through code_reviewer for proportional coverage-code re-review before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: Yes
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: No new durable coverage change in Round 3; the seven previously reviewed paths remain unchanged and no paths were removed.
- Post-repository confidence: 87% remains the authoritative overall confidence after Round 3; compaction-window evidence improved diagnosis but did not close the live completion gap. See the execution report for the scorecard.
- Broader validation decision: Blocked / Fail for remaining live-provider/Docker evidence after safe setup, real local compaction execution, focused harness repairs, and a bounded local-model hang.
- Planned broader modes: API/WS integration, live API preflight and, if feasible after deterministic API evidence, browser; no desktop shell execution planned. API/WS, preflight, builds, and GraphQL E2E ran; browser was not run; live provider execution did not complete.
- Reroute Required Before Validation Execution: No. Reroute required after Round 3: Yes, to `/code_reviewer` for the complete failure package and disposition of the remaining test-support/capability-execution block.
- Notes: Focused unit tests plus real in-process native/team/application WebSockets and test-owned GraphQL E2E passed. The final preflight passed 18 value-safe checks and LM Studio was reachable, but API-REAL-001 did not produce final live evidence; critical external provider-account, Docker identity, and browser DOM evidence remains unproven; no Pass is claimed.

## Execution Outcome Update (API-REV-001)

- Repository evidence: 3 focused native/team/application integration files passed with 19 tests; the repaired runtime-source unit passed 2 tests; the repaired Gemini metadata E2E passed 4 tests; selected GraphQL E2E passed 18 tests with 28 runtime cases explicitly skipped; web/SDK/team contracts and builds passed.
- Live capability evidence: `pnpm test:e2e:real:preflight` passed 18 value-safe tests and reported missing external keys plus local LM Studio readiness. `pnpm test:e2e:real` was started using the documented built-server runner but did not produce a final result after about three minutes and was interrupted. No secrets were recorded.
- Browser evidence: not run; web handler/projector, frontend SDK, real SDK WebSocket integration, and Nuxt build passed.
- Durable validity changes discovered during execution: API-ERR-005 updated `application-agent-runtime-source.test.ts`; API-ERR-006 updated `model-metadata-provenance-graphql.e2e.test.ts`. Both changes were recorded before editing and passed on rerun.
- Final result: Fail for completion gate / external evidence incomplete; final confidence 88%; critical AC-005/007/010–012/017 provider-account and Docker-specific AC-014 evidence remains unproven.

## Round 2 Rerun Plan — CRR-003 / CRR-004 Recovery

- Trigger: Solution-designer scope decision that LM Studio compaction and broad live-provider capability are non-gating residuals for this ticket-specific validation.
- Prior unresolved scenario to recheck first: `API-REAL-001`, reusing the existing configured capability `lmstudio.qwen36.compaction-agent-flow`; no new provider credential or secret value will be requested, printed, or persisted.
- Investigation before rerun: inspect the scenario selector, LM Studio local model inventory/readiness, live runner timeout behavior, and evidence scanner; distinguish runner/bootstrap blockage from provider response or source behavior.
- Selected execution: first run the documented live runner with only `--scenarios=lmstudio.qwen36.compaction-agent-flow`, bounded by an operator-controlled timeout, capturing only value-safe scenario status and final evidence. If the compaction journey remains impractically slow, use the same configured local capability only through a smaller supported scenario or focused local capability probe if one exists; do not edit source or durable coverage merely to mask a timeout.
- Scope boundary: no durable coverage changes are planned in this rerun because CRR-004 found the five updated paths coherent and focused execution passed. Browser `API-BROWSER-001` remains a separate not-tested journey unless the live capability recovery exposes a deterministic browser target that can materially improve evidence without introducing unrelated changes.
- Success criterion: obtain a final, scanner-clean result for the selected safe local capability, or document the exact reproducible runner/capability blocker with its bounded command, output, cleanup, and owner classification. Update this investigation before the final execution report and revision record.

## Round 2 Focused Probe Finding Before Durable Harness Repair

- The bounded LM Studio rerun was reproducible twice, including once from a clean owned persistent live-E2E runtime. Preflight remained `READY`, the real local model emitted tool and compaction lifecycle events, and the run completed its agent turns; the failure was deterministic at the live evidence-inspection step, not a provider timeout or missing capability.
- `API-REAL-001` failed with `LIVE_E2E_CANONICAL_COMPACTOR_DESCENDANT_RUN_DETECTED`. A temporary value-safe topology probe showed one accepted compactor run, but `inspection` was false and the run was classified as a descendant. Direct inspection of the owned runtime artifact showed the compactor task was valid and scanner-safe.
- Root cause: repository live-E2E harness `inspectCanonicalCompactorTask` calls `FileMemoryStore.listRawTraceCorpusOrdered()`, while the current durable store API exposes `listTurnRawTraceCorpusOrdered()`. The resulting `TypeError` is swallowed by the harness inspection catch and is misreported as a topology/descendant failure.
- Classification: **API/E2E-owned Local Fix — stale test-support API call**, not an implementation or provider failure. The fix is limited to `test-support/live-e2e/live-e2e-harness.ts`, replacing the stale method call with the current store API; no product source or requirement behavior changes are planned.
- Rerun gate: apply only this narrow durable harness repair, remove the temporary topology probe, run the focused harness unit suite and the same selected LM Studio scenario, then record the final result. No secrets or provider payloads will be captured.

## Round 2 Harness-Unit Finding Before Scenario Fixture Repair

- The focused durable harness check after the method repair found 18/19 tests passed; the remaining assertion was `gemini.vertex-express.llm: expected [] to have a length of 1` in `tests/unit/secret-management/live-e2e-harness.test.ts`.
- Validity decision: this is another stale live-E2E fixture, not an implementation failure. The scenario catalog still used removed `gemini-3-flash-preview`, while the approved current model definition is `gemini-3.7-flash` (the same current identifier already repaired in the metadata GraphQL E2E). The scenario's provider/mode contract remains unchanged.
- Planned narrow durable repair: update the Vertex Express and AI Studio LLM live scenario model fixtures to `gemini-3.7-flash`, rerun the harness unit, then rerun the same `API-REAL-001` LM Studio scenario. No provider key or secret value is involved.

## Round 2 Live-Scenario Finding Before Compaction Fixture Adjustment

- After the stale harness API call and stale Gemini fixture were repaired, the selected LM Studio run reached real tool execution, completed one compaction, passed the budget/topology/source-tail checks, and failed only with `LIVE_E2E_CANONICAL_COMPACTOR_LEAF_EVIDENCE_MISSING`.
- Safe inspection of the owned compactor artifact identified the missing boolean: `shieldOmissionPressureVerified` was false because the first compaction was triggered after the large Group-A read plus the Unicode-boundary read; the compactor's target-history tail contained Group A but not the Unicode fixture, even though the fixture itself was read and preserved by the parent agent. No provider error, unsafe output, or production exception was observed.
- Classification: **API/E2E-owned Local Fix — live fixture timing/order**, not a product-source defect. The local scenario's Group-A synthetic corpus is large enough to cross the 5% threshold before the Unicode-boundary evidence becomes part of the compacted target history. Narrowly reduce only the local Group-A record count so the first compaction occurs on the following turn, after the Unicode fixture and Group-A evidence are both in target history; retain the same requirement-linked assertions and scanner safeguards. This does not alter production behavior or external provider coverage.
- Rerun gate: update the test-support fixture, rerun the 19-test harness unit suite, then rerun the same selected LM Studio scenario from a clean owned runtime. If it passes, record the live result and route all durable test-support changes through `/code_reviewer` for proportional review.

## Round 2 Compaction-Selection Finding Before Scenario Reshape

- The reduced local Group-A corpus changed the live budget evidence as intended (`promptTokens` stayed below the 13,043 threshold through the first three observations and crossed it at 13,333), but the compactor still selected only the Group-A history unit. The Unicode-boundary read remained in a retained recent unit, so `shieldOmissionPressureVerified` was still false.
- Classification remains **API/E2E-owned Local Fix — live fixture selection**, not a provider or product-source failure. The parent flow separately proved the Unicode file was read exactly once and remained immutable; the missing evidence is only that this fixture was included in the compactor's selected history.
- Planned narrow repair: place the Group-A and Unicode-boundary `read_file` calls in one initial agent turn, keep Group-B in the next turn, and retain the same three-read/one-write lifecycle. This makes the selected historical unit contain both the operational evidence and the Unicode shield source without weakening the provider-safe or redaction assertions. Update expected turn counts only; no production behavior changes.

## Round 2 Final Live Probe Outcome Before Report Update

- The combined-turn scenario reshape was not viable as an executable recovery: the local LM Studio model accepted the two tool calls and persisted their results, but the managed live scenario produced no next turn/final result for over ten minutes while the LM Studio worker remained active. The run was interrupted with Ctrl-C; the owned runner/server processes were gone afterward and no secrets were emitted.
- This is classified as **API/E2E-owned Local Fix / capability-execution block**, not a product-source failure. The prior separate-turn run did complete real tool calls and compaction but exposed the scenario's missing leaf evidence; the combined-turn workaround introduced a worse model-execution hang and is not retained.
- Final durable-state decision for this round: retain only the stale live-harness API repair (`listTurnRawTraceCorpusOrdered`) and the current Gemini scenario identifiers (`gemini-3.7-flash`); revert the unproven local corpus-size and combined-turn timing experiments. Preserve the exact attempted commands and outcomes in the execution report, and route the unresolved `API-REAL-001` result to `/code_reviewer` for focused failure-origin review.

## Execution Outcome Update (API-REV-002)

- Prior failure rechecked first: `API-REAL-001` was rerun only as `lmstudio.qwen36.compaction-agent-flow` after inspecting the local LM Studio endpoints and runner. The endpoint was reachable and exposed the configured model; no response body or secret value was retained.
- Durable repairs made after investigation: `test-support/live-e2e/live-e2e-harness.ts` now calls the current `listTurnRawTraceCorpusOrdered()` store API; `test-support/live-e2e/live-e2e-scenarios.mjs` now uses `gemini-3.7-flash` for both current Gemini LLM scenario fixtures. The 19-test harness suite passed after repair.
- Live execution: separate-turn selected runs reached real LM Studio tool calls and compaction lifecycle but failed the scenario's `LIVE_E2E_CANONICAL_COMPACTOR_LEAF_EVIDENCE_MISSING` assertion. A bounded combined-turn probe was attempted to make the Unicode source part of the selected history; it produced no next turn/final result for over ten minutes and was interrupted. The experiment was reverted, leaving only the two narrow durable repairs above.
- Final deterministic execution: focused harness suite passed 19/19; final value-safe preflight passed 18/18; `git diff --check` passed. Prior Round 1 repository coverage remains passing as recorded.
- Browser `API-BROWSER-001`: Not Tested. Electron shell execution remains out of scope because no shell-specific source changed.
- Result: **Fail for completion gate / API-REAL-001 unresolved**, with preliminary classification **API/E2E-owned Local Fix — test-support/capability execution block**. Final confidence: **87%**. Route to `/code_reviewer` for focused failure-origin and proportional review of all changed durable test/test-support paths.

## Round 3 Investigation Plan — CRR-005 / CRR-006 Local Compactor Disposition

- Trigger: Solution-designer scope decision that LM Studio compaction and broad live-provider capability are non-gating residuals for this ticket-specific validation.
- Prior unresolved result to recheck: the selected LM Studio `lmstudio.qwen36.compaction-agent-flow` completed real tool calls and one compaction but failed `LIVE_E2E_CANONICAL_COMPACTOR_LEAF_EVIDENCE_MISSING`; a combined-turn probe then produced no next turn or final result for more than ten minutes and was interrupted.
- Investigation question: determine whether the remaining leaf-evidence failure is caused by a product/source defect, a deterministic compaction-window selection mismatch in the live scenario, or an LM Studio capability/latency limitation. Do not treat a model-dependent absence of selected evidence as a product failure without a bounded probe.
- Planned checks before any durable edit or final rerun:
  1. inspect the canonical compactor task contract, message-window planner, truncation policy, and existing deterministic compaction tests;
  2. verify the configured local model capability and current harness tests without printing secrets or model response bodies;
  3. if a bounded scenario-only probe can move the Unicode-boundary source into the compacted prefix without changing product source, run it with a hard time budget and record expected versus observed evidence;
  4. otherwise explicitly disposition API-REAL-001 as unresolved/blocked rather than claiming a pass.
- Durable-change rule: no durable coverage or product-source change is authorized by this investigation alone. Any scenario/test-support edit requires a new validity decision and proportional code review.
- Truth boundary: a preflight or partial compaction lifecycle cannot be promoted to API-REAL-001 Pass. External-provider behavior, Docker identity, browser DOM, and final local compactor evidence remain unproven unless directly observed in this round.

### Round 3 Temporary Scenario Probe Before Execution

- Probe-only change (backed up for restoration): reduce the local Group A corpus from 170 to 40 records and add a no-tool acknowledgment turn before the final artifact turn. This is intended only to move the compaction trigger past the Unicode-boundary and Group B tool turns; it is not yet accepted as durable coverage.
- Expected evidence gain: the canonical compactor task should contain the Unicode-boundary read source, satisfy the deliberate 2,000-character omission-pressure check, and still complete the exact retained artifact flow.
- Safety constraints: no production source, provider configuration, secret, or external account change; selected local LM Studio scenario only; restore the durable file if the probe does not produce complete truthful evidence.

### Round 3 Temporary Scenario Probe Finding Before Second Probe

- The first scenario-only probe (Group A reduced to 40 records plus a short no-tool acknowledgment) did not reach compaction: safe budget evidence showed prompt tokens below the 13,043-token trigger threshold and no compaction phases. This is an expected probe limitation, not a product pass or failure classification.
- Second bounded probe adjustment: retain the 40-record Group A corpus and add a large inert, non-secret context-pressure marker to the no-tool acknowledgment so the trigger is expected after the Unicode and Group B turns. The marker is probe scaffolding and must be restored/removed after the run.

## Round 3 Evidence And Disposition (API-REV-003)

- Prior failure rechecked with the unmodified durable scenario using `pnpm test:e2e:real -- --scenarios=lmstudio.qwen36.compaction-agent-flow`. Value-safe preflight passed and LM Studio was `READY`; the run reached one real compaction and failed `LIVE_E2E_CANONICAL_COMPACTOR_LEAF_EVIDENCE_MISSING` after 159.43 seconds.
- New value-safe budget evidence showed prompt tokens `[2561, 15952, 2897, 3879, 4102, 5857, 6056, 6302]`, trigger threshold `13043`, and compaction phases `requested`, `started`, `completed`. The first over-threshold prompt occurred during the large Group-A tool result, before the Unicode-boundary turn; therefore the leaf assertion's missing Unicode source is explained by deterministic compaction-window selection, not by a provider error or application payload defect.
- Temporary scenario-only probe 1 reduced local Group A to 40 records and added a short no-tool turn. Preflight passed, but prompt tokens remained below threshold and phases were empty; the run failed `LIVE_E2E_COMPACTION_LIFECYCLE_NOT_COMPLETED` after 82.62 seconds. This did not prove a pass and the change was restored.
- Temporary scenario-only probe 2 retained the 40-record corpus and added a large inert context-pressure marker to force a later trigger. The local worker produced no final result within the bounded operator window and was interrupted with Ctrl-C. No secret, model response body, or source exception was recorded; owned processes were cleaned up and the probe scaffolding was restored.
- Focused durable validation after restoration: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/secret-management/live-e2e-harness.test.ts --no-watch` passed 19/19; `git diff --check` passed. The final durable diff remains only the previously accepted current-store API and Gemini fixture repairs.
- Disposition: retain `API-REAL-001` as **Fail / blocked completion gate**. The remaining issue is an API/E2E-owned test-support/capability-execution block: the current local scenario triggers compaction before the Unicode evidence is selected, while attempts to move the trigger later either did not compact or exceeded the local model's bounded responsiveness. No additional durable scenario edit is accepted without a deterministic executable result and proportional review.
- No implementation finding is opened. External provider behavior, Docker identity, browser DOM, final local compactor leaf evidence, and live recovery remain unproven. `API-BROWSER-001` remains Not Tested.
- Final confidence remains **87%**; no critical acceptance criterion is promoted from unproven to Pass by this diagnosis.
- Required next recipient: `/code_reviewer` for focused failure-origin review of `API-REAL-001` Round 3 evidence and disposition. No delivery-ready claim is made.

## Round 4 Explicit Final Disposition (API-REV-004)

- Trigger: Solution-designer scope decision that LM Studio compaction and broad live-provider capability are non-gating residuals for this ticket-specific validation.
- New capability decision: no new safe configured provider, external credential set, Docker identity, or deterministic reviewed scenario fixture is available in the current environment. Repeating the same LM Studio run without a changed capability or reviewed scenario would reproduce the already documented timing mismatch or local-model non-completion and would not add truthful evidence.
- Explicit disposition: **API-REAL-001 remains Fail / blocked for the completion gate**. The selected local scenario is not accepted as evidence of the final compactor leaf contract. Preflight and partial compaction remain supporting evidence only and are not promoted to Pass.
- Ownership: **API/E2E-owned Local Fix — test-support/capability-execution disposition block**. The current application/source implementation remains covered by the authoritative CRR-002 source pass; no implementation finding is reopened.
- Required condition to resume: provide a deterministic reviewed live compactor capability—either a safe configured provider/model that completes the later-trigger scenario, or an explicitly reviewed scenario/test-support redesign that produces final scanner-clean leaf evidence without weakening the contract. External provider credentials, Docker identity, browser DOM, and live recovery evidence remain unproven.
- Durable state: no new Round 4 code or coverage change. The seven previously reviewed durable paths and the two accepted test-support repairs remain unchanged; no tests were removed.
- Final confidence: **87%**. The package is not delivery-ready while API-REAL-001 remains unresolved.

## Round 5 Provider-Capability Recovery Plan — API-REV-005

- Trigger: Solution-designer scope decision that LM Studio compaction and broad live-provider capability are non-gating residuals for this ticket-specific validation.
- Target boundary: import only into the assigned worktree's test database `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-catalog-pricing-error-messaging/autobyteus-server-ts/db/test.db`; do not touch the user's production/server-data database and do not print secret values.
- Import evidence: value-safe dry-run reported nine known mapped credentials with `CREATE 9`, `BLOCKED 0`; explicit interactive `IMPORT` confirmation then configured nine vault entries. Only secret IDs and counts were recorded; values were never displayed or persisted in artifacts.
- Planned execution order before any conclusion: run `pnpm test:e2e:real:preflight`; select only `READY` external provider scenarios relevant to the approved catalog/error/pricing scope; execute provider-specific live LLM/agent scenarios through the documented runner; retain LM Studio only as a supplemental fallback, not as direct proof for changed external providers.
- Safety/cleanup: use the worktree-owned test database and the runner's sanitized child environment; do not print provider responses, authorization values, or request payload secrets; preserve the source assignment file unchanged; remove only worktree-owned test runtime artifacts after execution.
- Truth boundary: imported credentials make a capability eligible, not passed. Each provider/model scenario requires a final scanner-clean result; missing, unavailable, timeout, or provider failure remains explicitly classified.

### Round 5 Temporary Scenario Extension Before Additional Provider Runs

- The imported test vault makes OpenAI, DeepSeek, Vertex Express Gemini, Anthropic, AutoByteus, Grok, Kimi, and GLM credentials eligible; no MiniMax credential was present in the value-safe import plan.
- The existing live scenario catalog has no direct Grok/Kimi/GLM LLM scenarios even though those are named catalog targets in this change. A temporary, probe-only extension will add `grok-4.6`, `kimi-k3`, and `glm-5.3` LLM scenarios with their known provider secret IDs, run each through the existing generic live LLM executor, then restore the scenario file. No scenario extension will be retained without a separate durable-coverage decision and review.


## Round 5 Provider-Capability Recovery Outcome (API-REV-005)

- User-authorized credential materialization completed through the documented importer, not ambient environment injection. A value-safe dry run against the worktree test database reported CREATE 9, BLOCKED 0; the confirmed import configured nine mapped vault entries. No secret value, authorization header, provider response body, or raw exception was recorded.
- Final value-safe preflight: pnpm test:e2e:real:preflight passed 18/18. READY capabilities included OpenAI, DeepSeek, Vertex Express Gemini, Anthropic, AutoByteus, and local LM Studio. The final preflight also reported missing Serper and Gemini AI Studio credentials. MiniMax had no imported credential and no direct live scenario was run.
- Existing durable direct-provider run: deepseek.llm, gemini.vertex-express.llm, openai.llm produced Gemini PASS, OpenAI PASS, and DeepSeek FAIL with the value-free wrapper result LIVE_E2E_PROVIDER_OPERATION_FAILED:deepseek.llm.
- Additional direct-provider run used temporary probe-only scenario entries for grok-4.6, kimi-k3, and glm-5.3: grok.llm, kimi.llm, glm.llm produced Grok PASS, GLM PASS, and Kimi FAIL with LIVE_E2E_PROVIDER_OPERATION_FAILED:kimi.llm. The temporary catalog entries were restored.
- Existing durable Anthropic scenario passed its two tests through the reviewed product boundary.
- These direct live results are provider/model evidence, not completion of the whole API-REAL-001 gate. Successful requests prove current endpoint/request reachability for Grok, GLM, Vertex Express Gemini, OpenAI, and Anthropic. They do not prove pricing, provider-error-body fidelity, MiniMax, Gemini AI Studio, Docker identity, browser DOM, or the unresolved LM Studio compactor leaf-evidence journey. DeepSeek and Kimi remain provider-operation failures with intentionally value-free error output.
- Post-run durable checks: the restored live-E2E harness suite passed 19/19 and git diff --check passed. No new repository-resident durable coverage or test-support edit was retained in Round 5, so CRR-006 remains the applicable proportional review.
- Classification: API/E2E-owned Local Fix — external-provider capability/execution block, with the prior local compactor evidence block still unresolved. No provider response, source exception, incorrect product payload, or deterministic application implementation failure was observed; CRR-002 remains authoritative.
- Explicit result: API-REAL-001 remains Fail / blocked for the completion gate. The provider runs materially improve external-boundary evidence but do not justify a Pass while DeepSeek/Kimi operation failures, LM Studio compactor evidence, MiniMax, Docker identity, provider error fidelity, and browser coverage remain unresolved.

## Latest Investigation Decision (API-REV-005)

- Proceeded with user-authorized safe capability recovery: Yes.
- Repository-resident durable coverage retained this round: No new path. Temporary direct-provider scenario additions were restored before final durable validation.
- Current result: Fail / blocked completion gate for API-REAL-001; final confidence is 89%. This is an evidence increase over Round 4, not a Pass.
- Broader validation: provider-boundary requests passed for Grok, GLM, Vertex Express Gemini, OpenAI, and Anthropic; DeepSeek and Kimi failed at the safe provider-operation boundary; LM Studio compactor leaf evidence remains unresolved; MiniMax and Gemini AI Studio were not eligible.
- Reroute required: Yes, to /code_reviewer for failure-origin review of the two live provider-operation failures and the cumulative package. No new durable test-code review is requested beyond CRR-006.
- Delivery status: Blocked. Browser, Docker, live recovery, and complete provider-error fidelity remain unproven.


## Round 6 Scope Disposition And Feature-Specific Pass (API-REV-006)

- Scope authority: solution design confirmed that the LM Studio compaction scenario is not a hard gate for this ticket. LM Studio and compaction are not named requirements or acceptance criteria; the scenario was selected only as the available broad live capability.
- Feature-specific result: **Pass** for the exercised requirements. Deterministic missing-key mapping, original provider-message preservation/redaction, canonical native code/message transport, native/team/application message-only projection, relevant catalog/pricing/runtime/API coverage, and the current provider request coverage passed.
- Provider-message authority: deterministic fixtures are authoritative for AC-010–AC-012; no live account balance or live provider response is required. Docker-equivalent contract tests are authoritative for the code/message repair. The application SDK remains exactly { type: ERROR, message: string }.
- Residual classification retained: DeepSeek/Kimi live operation/body-fidelity failures, unavailable MiniMax/Gemini AI Studio capability, actual Docker build/port-8001 identity, browser DOM validation, LM Studio compactor leaf evidence, and live restart/recovery remain **non-gating API/E2E capability residuals**. No residual is promoted to Pass and none is attributed to product source.
- No new durable coverage or test-support change was made in Round 6. CRR-006 remains the applicable proportional test review, and CRR-009 remains the focused failure-origin review for DeepSeek/Kimi.
- Disposition: ticket-specific API/E2E coverage is Pass; the aggregate broader-live validation remains incomplete but is explicitly non-gating for this ticket. Route the cumulative package to delivery with the residuals visible.

## Latest Investigation Decision (API-REV-006)

- Feature-specific API/E2E validation: **Pass**.
- Aggregate broader live capability result: **Incomplete / non-gating residual**, not a ticket failure.
- Confidence: retain 89% aggregate broader-validation confidence because the residual live capability categories remain unproven; this does not downgrade the feature-specific deterministic/API/transport result.
- Repository-resident durable coverage retained this round: None.
- Delivery handoff: Yes, with explicit residual risks and the cumulative package. No additional live rerun is warranted without a changed reviewed capability or safe evidence method.

## Round 7 LM Studio Test-Support Repair Investigation Plan (API-REV-007)

- Trigger: user requested investigation and possible repair of the non-gating LM Studio test failure if the evidence identifies a test-support/scenario defect.
- Current failure: LIVE_E2E_CANONICAL_COMPACTOR_LEAF_EVIDENCE_MISSING after a real compaction. Safe prior budget evidence showed the first trigger during the large Group-A read, before the Unicode shield turn, so the canonical compactor leaf did not contain the expected shield evidence.
- Investigation hypothesis: the live scenario orders the large Group-A read before the Unicode shield read, while the assertion requires the first selected compactor leaf to contain the Unicode shield evidence. This is a scenario-order/compaction-window coupling, not an application-source failure.
- Planned bounded probe: temporarily reorder only the scenario's read turns so the Unicode shield file is read first, Group A second, and Group B third. Preserve the same three read calls, one final write, exact artifact assertions, scanner safeguards, and compactor contract checks. Do not change production source or weaken the leaf assertion.
- Probe success criterion: LM Studio completes all four turns, one compaction completes, the leaf evidence assertion passes, exact artifact/tool traces remain valid, and final output is scanner-clean. Probe failure criterion: no compaction, no final turn, or any changed contract; restore immediately.
- Durable-change rule: retain the scenario-order change only if the bounded live probe is reproducible and focused harness validation passes. If retained, route the changed test-support path through code_reviewer before delivery; if not, restore the file and preserve the non-gating residual.

### Round 7 Probe Finding: Second Stale Store API Call

- The temporary order-only probe changed the compaction timing as expected: safe budget evidence showed the first trigger after the Unicode-first and Group-A turns, with phases requested/started/completed.
- The leaf-evidence assertion was no longer the first failure. Execution then reached the native trace verification and the safe wrapper returned LIVE_E2E_PROVIDER_OPERATION_FAILED:lmstudio.qwen36.compaction-agent-flow because test-support/live-e2e/live-e2e-harness.ts still called the removed FileMemoryStore method listRawTraceCorpusOrdered(). The current store API is listTurnRawTraceCorpusOrdered().
- This is a bounded, directly observed API/E2E-owned stale test-support call, analogous to the previously repaired inspection call. It is not a provider response, source exception, or product implementation failure.
- Planned durable repair: replace only the remaining stale call with listTurnRawTraceCorpusOrdered(), retain the Unicode-first scenario ordering only if the full live flow then completes and focused harness validation passes. No production source change is planned.

### Round 7 Probe Finding: Order Repair Reaches Quality Validation

- The Unicode-first probe passed the previously failing leaf-evidence gate and, after the stale store API repair, reached the projected-continuation quality gate. Safe probe output showed one compaction, phases requested/started/completed, canonical source-tail/unicode/shield/no-self-compaction evidence true, and exact retained artifact success.
- The probe then failed LIVE_E2E_COMPACTION_PROJECTED_CONTINUATION_QUALITY_INVALID because the local model's compactor summary did not preserve the literal Group-A anchor values after the Unicode-first ordering. This is a quality-preservation failure in the probe arrangement, not a product-source failure; the leaf assertion itself was repaired by ordering.
- Next bounded probe: restore the original semantic order (Group A, Unicode shield, Group B), reduce only the local Group-A fixture to a moderate count expected to delay the first trigger until after the Unicode turn, and retain the stale store API repair. Do not weaken anchor-preservation assertions or alter production code.
