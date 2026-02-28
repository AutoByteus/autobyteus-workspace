# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning: Cross-layer backend/frontend changes, GraphQL contract changes, team manifest schema evolution, and runtime orchestration boundary additions.
- Workflow Depth:
  - `Medium` -> proposed design doc -> future-state runtime call stack -> future-state runtime call stack review (iterative deep rounds until `Go Confirmed`) -> implementation plan -> implementation progress tracking -> internal code review gate -> aggregated API/E2E validation -> docs sync

## Upstream Artifacts (Required)

- Workflow state controller: `tickets/in-progress/codex-team-member-runtime-communication/workflow-state.md`
- Investigation notes: `tickets/in-progress/codex-team-member-runtime-communication/investigation-notes.md`
- Requirements: `tickets/in-progress/codex-team-member-runtime-communication/requirements.md`
  - Current Status: `Refined`
- Runtime call stacks: `tickets/in-progress/codex-team-member-runtime-communication/future-state-runtime-call-stack.md`
- Runtime review: `tickets/in-progress/codex-team-member-runtime-communication/future-state-runtime-call-stack-review.md`
- Proposed design: `tickets/in-progress/codex-team-member-runtime-communication/proposed-design.md` (`v16`)

## Plan Maturity

- Current Status: `Completed (Round-20 closure cycle)`
- Notes: Stage 4 `Go Confirmed` rerun is reconfirmed through rounds 36/37 on design `v16`, and downstream Stage 5/5.5/6/7 gates were completed with strict live `R-023` sender/recipient parity evidence.

## Preconditions (Must Be True Before Finalizing This Plan)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Runtime review has `Go Confirmed` with two consecutive clean deep-review rounds: `Yes`

## Solution Sketch (Optional For `Medium`)

- Use Cases In Scope: `UC-001` through `UC-012`, `UC-015`, `UC-016`, `UC-017`, `UC-018`, `UC-019`
- Requirement Coverage Guarantee (all requirements mapped to at least one use case): `Confirmed in requirements + call-stack artifacts`
- Design-Risk Use Cases: `UC-013`, `UC-014`
- Target Architecture Shape:
  - `GraphQL resolver -> team-member runtime orchestrator -> runtime ingress/composition + history + binding registry`
  - `Team stream handler -> codex runtime event bridge -> runtime event mapping`
  - `Frontend config/history stores propagate member runtime metadata`
- New Layers/Modules/Boundary Interfaces To Introduce:
  - `team-member-runtime-orchestrator.ts`
  - `team-runtime-binding-registry.ts`
  - `team-codex-runtime-event-bridge.ts`
- Touched Files/Modules: `C-001` through `C-017`, `C-021`, decoupling set `C-022..C-025`, shared-process topology `C-026`, team runtime selector flow `C-027`, workspace-root persistence `C-028`, runtime-event adapter split `C-029`, codex team-manifest injection `C-030`, and Codex sender/recipient stream parity deltas `C-031`/`C-032` (see traceability tables below)
- API/Behavior Delta: member-level `runtimeKind` for team members; deterministic member-session routing/restore; explicit deterministic errors; preserved non-codex flow.
- Key Assumptions:
  - First delivery remains all-members-uniform runtime mode in one team run.
  - Codex runtime supports deterministic session bind by `memberRunId`.
- Known Risks:
  - Runtime-binding propagation drift across create/history/continue.
  - Routing ambiguity if member identity normalization diverges across ingress/stream/history.

## Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Write-Back | Write-Back Completed | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | N/A | Candidate Go | 1 |
| 2 | Pass | No | N/A | Go Confirmed | 2 |
| 3 | Pass | No | N/A | Go Confirmed | 3 |
| 4 | Pass | No | N/A | Go Confirmed | 4 |
| 5 | Pass | No | N/A | Go Confirmed | 5 |
| 6 | Pass | No | Yes (post-write-back verification) | Candidate Go | 6 |
| 7 | Pass | No | N/A | Go Confirmed | 7 |
| 8 | Pass | No | Yes (requirement/design/call-stack write-back for `R-017`) | Candidate Go | 8 |
| 9 | Pass | No | N/A | Go Confirmed | 9 |
| 10 | Pass | No | Yes (finding-1 rollback write-backs for `v6` decoupling model) | Candidate Go | 10 |
| 11 | Pass | No | N/A | Go Confirmed | 11 |
| 12 | Pass | No | Yes (process-topology requirement-gap write-backs for `R-018`) | Candidate Go | 12 |
| 13 | Pass | No | N/A | Go Confirmed | 13 |
| 14 | Pass | No | Yes (round-8 decoupling/process-manager write-backs for `v8`) | Candidate Go | 1 |
| 15 | Pass | No | N/A | Go Confirmed | 2 |
| 16 | Pass | No | N/A | Candidate Go | 1 |
| 17 | Pass | No | N/A | Go Confirmed | 2 |
| 18 | Pass | No | Yes (round-10 requirement-gap write-backs for team runtime selector requirement `R-019`) | Candidate Go | 1 |
| 19 | Pass | No | N/A | Go Confirmed | 2 |
| 20 | Pass | No | Yes (round-11 write-backs for workspace-root persistence requirement `R-020`) | Candidate Go | 1 |
| 21 | Pass | No | N/A | Go Confirmed | 2 |
| 22 | Pass | No | Yes (round-12 write-backs for adapter split + MCP tool-name mapping requirement `R-021`) | Candidate Go | 1 |
| 23 | Pass | No | N/A | Go Confirmed | 2 |
| 24 | Pass | No | Yes (round-13 write-backs for MCP argument projection parity under `R-021`) | Candidate Go | 1 |
| 25 | Pass | No | N/A | Go Confirmed | 2 |
| 26 | Pass | No | Yes (round-14 write-backs for team+capability dynamic tool exposure semantics under `R-017`) | Candidate Go | 1 |
| 27 | Pass | No | N/A | Go Confirmed | 2 |
| 28 | Pass | No | N/A | Candidate Go | 1 |
| 29 | Pass | No | N/A | Go Confirmed | 2 |
| 30 | Pass | No | N/A | Candidate Go | 1 |
| 31 | Pass | No | N/A | Go Confirmed | 2 |
| 32 | Pass | No | Yes (round-17 write-backs for codex team-manifest requirement `R-022`) | Candidate Go | 1 |
| 33 | Pass | No | N/A | Go Confirmed | 2 |
| 36 | Pass | No | Yes (round-18 write-backs for Codex sender/recipient stream parity requirement `R-023`) | Candidate Go | 1 |
| 37 | Pass | No | N/A | Go Confirmed | 2 |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
- Final review round: `33`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

## Principles

- Bottom-up: implement dependencies before dependents.
- Test-driven: add/update unit and integration tests with implementation.
- Mandatory modernization rule: no backward-compatibility shims or legacy branches.
- One file at a time is default; only use limited parallel edits when dependency edges require it.
- Update progress after each meaningful status change.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `src/agent-team-execution/services/team-runtime-binding-registry.ts` (`C-003`) | None | Core in-memory routing primitive used by orchestrator/streaming. |
| 2 | `src/agent-team-execution/services/team-member-runtime-orchestrator.ts` (`C-002`) | `C-003` | Central orchestration boundary required before resolver/continuation/stream handler updates. |
| 3 | `src/runtime-execution/runtime-composition-service.ts`, `runtime-adapter-port.ts`, `adapters/codex-app-server-runtime-adapter.ts` (`C-004`) | `C-002` contract | Enable deterministic member session create/restore APIs consumed by orchestrator. |
| 4 | `src/run-history/domain/team-models.ts`, `store/team-run-manifest-store.ts`, `services/team-run-history-service.ts` (`C-005`) | `C-002`, `C-004` | Persist binding/runtime metadata aligned with orchestration contracts. |
| 5 | `src/api/graphql/types/team-run-history.ts` (`C-011`) | `C-005` | Expose persisted runtime metadata shape to clients. |
| 6 | `src/run-history/services/team-run-continuation-service.ts` (`C-006`) | `C-002`, `C-005`, `C-011` | Continue path must restore sessions from new persisted bindings. |
| 7 | `src/api/graphql/types/agent-team-run.ts` (`C-001`) | `C-002`, `C-005` | Wire create/send entrypoints to orchestrator and new input contract. |
| 8 | `src/services/agent-streaming/team-codex-runtime-event-bridge.ts` (`C-007`) | `C-002`, `C-003` | Add codex-member event fan-in boundary before handler branching. |
| 9 | `src/services/agent-streaming/agent-team-stream-handler.ts` (`C-008`) | `C-007`, `C-003` | Runtime-mode aware websocket command/event handling. |
| 10 | `autobyteus-web/types/agent/TeamRunConfig.ts`, `components/workspace/config/MemberOverrideItem.vue`, `stores/agentTeamRunStore.ts` (`C-009`) | `C-001` GraphQL input contract | UI/store payload propagation for member runtime kind. |
| 11 | `autobyteus-web/stores/runHistoryStore.ts`, `generated/graphql.ts` (`C-010`) | `C-005`, `C-011` | Resume parsing must hydrate member runtime metadata correctly. |
| 12 | Legacy path removals (`C-012`) | `C-001`..`C-011` landed | Remove obsolete routing/default assumptions only after new paths are complete. |

## Requirement And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 5 Verification (Unit/Integration) | Stage 6 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-001 | `C-001` | UC-001 | T-001 | Unit + API integration | AV-001 |
| R-002 | AC-002 | `C-005`,`C-006` | UC-001, UC-005 | T-003, T-004 | Unit + integration | AV-002, AV-007 |
| R-003 | AC-003 | `C-002`,`C-004` | UC-001 | T-002 | Unit + integration | AV-003 |
| R-004 | AC-004 | `C-001`,`C-002`,`C-003` | UC-002 | T-001, T-002 | Unit + integration | AV-004 |
| R-005 | AC-005 | `C-002`,`C-008` | UC-003 | T-002, T-006 | Unit + integration | AV-005 |
| R-006 | AC-006 | `C-007`,`C-008` | UC-004 | T-005, T-006 | Unit + integration | AV-006 |
| R-007 | AC-007 | `C-005`,`C-006` | UC-005 | T-003, T-004 | Unit + integration | AV-007 |
| R-008 | AC-008 | `C-001`,`C-008` | UC-006 | T-001, T-006 | Integration + regression suite | AV-008 |
| R-009 | AC-009 | `C-002`,`C-003`,`C-012` | UC-007 | T-002, T-007 | Unit + integration | AV-009 |
| R-010 | AC-010 | `C-012` | UC-001, UC-002, UC-003, UC-005 | T-007 | Unit + static reference scan | AV-010 |
| R-011 | AC-011 | `C-013`,`C-014`,`C-015` | UC-008 | T-010 | Integration + E2E | AV-011 |
| R-012 | AC-012 | `C-003`,`C-015` | UC-008, UC-010 | T-002, T-010 | Unit + integration | AV-012, AV-015 |
| R-013 | AC-013 | `C-013`,`C-014` | UC-009 | T-010 | Integration + E2E | AV-013 |
| R-014 | AC-014 | `C-014`,`C-015` | UC-009 | T-010 | Integration + E2E | AV-014 |
| R-015 | AC-015 | `C-013`,`C-014`,`C-015` | UC-010 | T-010 | Unit + integration | AV-015 |
| R-016 | AC-016 | `C-013`,`C-014`,`C-015` | UC-008, UC-009, UC-010 | T-010 | Integration + E2E | AV-016 |
| R-017 | AC-017 | `C-021` | UC-011 | T-016, T-025 | Unit + E2E | AV-017 |
| R-018 | AC-018 | `C-026` | UC-012 | T-021 | Integration + E2E | AV-018 |
| R-019 | AC-019 | `C-027` | UC-015 | T-022 | Component + E2E | AV-019 |
| R-020 | AC-020 | `C-028` | UC-016 | T-023 | API + E2E | AV-020 |
| R-021 | AC-021 | `C-029` | UC-017 | T-024 | Unit + API/E2E | AV-021 |
| R-022 | AC-022 | `C-030` | UC-018 | T-026 | Unit + API/E2E | AV-022 |
| R-023 | AC-023 | `C-031`,`C-032` | UC-019 | T-027 | Unit + API/E2E | AV-023 |

## Acceptance Criteria To Stage 6 Mapping (Mandatory)

| Acceptance Criteria ID | Requirement ID | Expected Outcome | Stage 6 Scenario ID(s) | Validation Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | Team member runtime kind accepted/validated deterministically. | AV-001 | API | Planned |
| AC-002 | R-002 | Member runtime metadata persisted in team manifest. | AV-002 | API | Planned |
| AC-003 | R-003 | Codex member sessions created and keyed by `memberRunId`. | AV-003 | API | Planned |
| AC-004 | R-004 | Targeted member message routes to one intended session. | AV-004 | API | Planned |
| AC-005 | R-005 | Tool approval/denial routes to intended member/invocation only. | AV-005 | E2E | Planned |
| AC-006 | R-006 | Team websocket codex events include stable member identity tags. | AV-006 | E2E | Planned |
| AC-007 | R-007 | Continuation restores member sessions before resumed dispatch. | AV-007 | API | Planned |
| AC-008 | R-008 | Non-codex team behaviors remain intact. | AV-008 | API | Planned |
| AC-009 | R-009 | Invalid target/binding/session returns deterministic errors. | AV-009 | API | Planned |
| AC-010 | R-010 | Legacy impacted routing/default paths removed without wrappers. | AV-010 | API | Planned |
| AC-011 | R-011 | Member-to-member semantics preserved for codex-backed teams. | AV-011 | E2E | Planned |
| AC-012 | R-012 | `recipient_name` resolution is deterministic and rejects ambiguous/unknown recipients. | AV-012 | API | Planned |
| AC-013 | R-013 | Inter-agent envelope preserves sender metadata, `message_type`, and `content`. | AV-013 | E2E | Planned |
| AC-014 | R-014 | Recipient runtime normalizes inter-agent envelope through standard reasoning/input pipeline. | AV-014 | E2E | Planned |
| AC-015 | R-015 | Sender receives deterministic tool-visible failures for recipient unavailable/start/session errors. | AV-015 | API | Planned |
| AC-016 | R-016 | Inter-agent tool path remains decoupled from frontend GraphQL user-ingress path. | AV-016 | Integration/E2E | Planned |
| AC-017 | R-017 | `send_message_to` is exposed only for team-bound Codex sessions where the member tool configuration includes `send_message_to`; otherwise it is hidden. | AV-017 | E2E | Planned |
| AC-018 | R-018 | Concurrent codex runs share one app-server process while retaining distinct run/thread identities. | AV-018 | Integration/E2E | Planned |
| AC-019 | R-019 | Team runtime selector drives runtime-scoped model/config options and launch payload uses uniform selected runtime for all members. | AV-019 | E2E | Planned |
| AC-020 | R-020 | Codex team workspace-root persistence remains non-null for workspaceId-based team runs across create/send/terminate/continue flows and history grouping. | AV-020 | API/E2E | Planned |
| AC-021 | R-021 | MCP tool-call events map concrete tool names from supported payload shapes, avoid `MISSING_TOOL_NAME`, and project provided tool-call arguments into activity metadata. | AV-021 | API/E2E | Planned |
| AC-022 | R-022 | Codex team member startup/resume requests include teammate-manifest `developerInstructions` and `send_message_to` recipient hints when capability is enabled. | AV-022 | API/E2E | Planned |
| AC-023 | R-023 | Codex team relay flow emits sender-visible `send_message_to` tool lifecycle and recipient-visible structured `INTER_AGENT_MESSAGE` payload for `From <sender>` UI parity. | AV-023 | API/E2E | Planned |

## Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001 | Modify | T-001 | No | Unit + integration + AV-001/AV-004/AV-008 |
| C-002 | Add | T-002 | No | Unit + integration + AV-003/AV-004/AV-005 |
| C-003 | Add | T-002 | No | Unit + integration + AV-004/AV-009 |
| C-004 | Modify | T-002 | No | Unit + integration + AV-003 |
| C-005 | Modify | T-003 | No | Unit + integration + AV-002/AV-007 |
| C-006 | Modify | T-004 | No | Integration + AV-007 |
| C-007 | Add | T-005 | No | Unit + integration + AV-006/AV-011 |
| C-008 | Modify | T-006 | No | Unit + integration + AV-005/AV-006/AV-008 |
| C-009 | Modify | T-008 | No | Frontend unit/component + AV-001 |
| C-010 | Modify | T-009 | Yes | Frontend store tests + AV-002/AV-007/AV-010 |
| C-011 | Modify | T-003 | No | API integration + AV-002/AV-007 |
| C-012 | Remove | T-007 | Yes | Unit + reference scan + AV-009/AV-010 |
| C-013 | Add | T-010 | No | Integration + AV-011/AV-013/AV-015 |
| C-014 | Modify | T-010 | No | Unit + integration + AV-013/AV-014/AV-016 |
| C-015 | Modify | T-010 | No | Unit + integration + AV-011/AV-012/AV-015/AV-016 |
| C-016 | Add/Modify | T-011 | Yes | GraphQL resolver contract/e2e tests + review SoC audit |
| C-017 | Add/Modify | T-012 | Yes | Frontend run-history store tests + review SoC audit |
| C-021 | Add/Modify | T-016 | Yes | Codex runtime unit + strict live E2E coverage for team-scoped dynamic tool exposure |
| C-022 | Add/Modify | T-017 | Yes | Frontend read-model/action split tests + store/API interaction coverage |
| C-023 | Add/Modify | T-018 | Yes | Panel container/section/component tests + action composable unit coverage |
| C-024 | Add/Modify | T-019 | Yes | Codex runtime session/relay/model unit suites + existing runtime service contract tests |
| C-025 | Add/Modify | T-020 | Yes | Relay wiring lifecycle unit/integration tests + orchestrator construction ownership checks |
| C-026 | Add/Modify | T-021 | Yes | Shared-process manager unit/integration coverage + concurrent run process-count assertion |
| C-027 | Add/Modify | T-022 | Yes | Team runtime selector component/store tests + launch payload runtime-kind assertions |
| C-028 | Modify | T-023 | Yes | Workspace-root persistence unit/API/live E2E lifecycle coverage |
| C-029 | Add/Modify | T-024 | Yes | Runtime-event mapper unit coverage + full backend/frontend regression suites |
| C-030 | Add/Modify | T-026 | Yes | Codex runtime startup payload unit coverage + orchestrator manifest metadata unit coverage + full backend/frontend regression suites |
| C-031 | Add/Modify | T-027 | Yes | Sender-side synthetic `send_message_to` lifecycle event emission unit + strict live E2E parity coverage |
| C-032 | Add/Modify | T-027 | Yes | Recipient-side structured inter-agent event emission/mapping unit + strict live E2E parity coverage |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-DEL-001 | Implicit codex routing via `teamRunId` assumptions | Remove | Delete impacted fallback branch paths; add deterministic error paths; verify no remaining references. | Misrouting risk if any stale branch remains. |
| T-DEL-002 | Frontend reopen hardcoded `DEFAULT_AGENT_RUNTIME_KIND` for team members | Remove | Replace with manifest-derived runtime metadata and drop defaulting logic in reopen flow. | Resume drift risk if parsing is incomplete. |

## Step-By-Step Plan

1. T-001: Update GraphQL team resolver contracts/validation (`C-001`) and add resolver tests.
2. T-002: Implement runtime orchestration + binding registry + runtime composition updates (`C-002`,`C-003`,`C-004`) with unit/integration coverage.
3. T-003: Implement team manifest/runtime metadata persistence and history exposure (`C-005`,`C-011`) with store/history tests.
4. T-004: Update continuation restore flow through orchestrator (`C-006`) and add continuation tests.
5. T-005: Add codex team event bridge (`C-007`) and tests for identity-tagged rebroadcast.
6. T-006: Update team stream handler runtime-mode branching (`C-008`) and approval-routing tests.
7. T-007: Remove impacted legacy routing/default assumptions (`C-012`) and verify no compatibility wrappers remain.
8. T-008: Update frontend member runtime selection/config payload flow (`C-009`) and component/store tests.
9. T-009: Update frontend run-history reopen parsing/codegen surfaces (`C-010`) and store tests.
10. T-010: Implement inter-agent relay path (`C-013`,`C-014`,`C-015`) and add deterministic sender/recipient semantics tests.
11. T-011: Refactor resolver mutation internals into dedicated backend service boundary (`C-016`) and rerun backend contract/integration suites.
12. T-012: Refactor run-history store helper boundaries (`C-017`) and rerun frontend run-history/store/component suites.
13. T-013: Run Stage 5 unit/integration verification command set and record results in progress tracker.
14. T-014: Run Stage 5.5 internal code review gate and record pass/fail with any re-entry declaration.
15. T-015: Run Stage 6 aggregated API/E2E scenarios (`AV-001`..`AV-018`), then Stage 7 docs sync.
16. T-016: Refactor Codex runtime hotspot by extracting inter-agent dynamic-tool helpers (`C-021`) and rerun strict live codex roundtrip validation for `AV-017`.
17. T-017: Split run-history store into read-model/action boundaries (`C-022`) and update frontend store tests.
18. T-018: Decompose history panel container into sections/composables (`C-023`) and update component tests.
19. T-019: Split codex runtime service internals into session/relay/model modules (`C-024`) while preserving adapter contract.
20. T-020: Move relay handler ownership into explicit wiring lifecycle and remove constructor side-effect registration (`C-025`).
21. T-021: Implement shared Codex app-server process manager and refactor session/history-reader paths to reuse shared process transport (`C-026`).
22. T-022: Add team runtime selector + runtime-scoped model/config loading in team config flow and enforce uniform runtime-kind payload emission for team members (`C-027`).
23. T-023: Harden codex workspace-root persistence for workspaceId-only team runs and extend strict live lifecycle coverage (`C-028`).
24. T-024: Split codex runtime event adapter into helper modules and fix MCP tool-name mapping plus tool-call argument projection (`metadata.arguments`) for supported payload shapes (`C-029`).
25. T-025: Enforce team+capability gate for Codex dynamic `send_message_to` exposure (member `toolNames` includes `send_message_to`), propagate capability metadata into runtime session startup, and add runtime unauthorized-relay guard with targeted tests.
26. T-026: Inject per-member teammate manifest context into Codex `developerInstructions` at `thread/start` + `thread/resume`, propagate recipient hints into dynamic `send_message_to`, and persist orchestrator-provided `teamMemberManifest` metadata for create/restore flows (`C-030`).
27. T-027: Emit sender-side synthetic `send_message_to` tool lifecycle and recipient-side structured `inter_agent_message` events in Codex runtime + adapter/frontend mapping path, and close strict parity validation for `AC-023` (`C-031`,`C-032`).

## Stage 5 Re-Entry Notes (Round 17)

1. Round-17 re-entry executed `C-030` to close `R-022/AC-022`: orchestrator now emits teammate manifest metadata and codex runtime injects deterministic teammate context via `developerInstructions`.
2. Task inventory is extended to `T-026`; previous tasks (`T-001..T-025`) remain complete.
3. Stage 5 gate execution for round 17 is satisfied by targeted backend unit suites plus full backend/frontend validation reruns.

## Stage 5 Re-Entry Notes (Round 18)

1. Round-18 re-entry executed `C-031`/`C-032` to close `R-023/AC-023`: sender now surfaces `send_message_to` tool-call lifecycle and recipient now emits structured `INTER_AGENT_MESSAGE` payload for `From <sender>` parity.
2. Task inventory is extended to `T-027`; previous tasks (`T-001..T-026`) remain complete.
3. Stage 5 gate execution for round 18 is satisfied by strict live Codex team roundtrip E2E plus targeted backend/frontend parser/mapper suites.

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts` | Accepts member `runtimeKind`, delegates create/send to orchestrator path. | Resolver validation/error-path tests updated. | GraphQL contract/e2e create/send tests pass. | Covers R-001, R-004, R-008. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts` | Deterministic create/restore/send/approve behaviors implemented. | New orchestrator unit tests pass. | Team routing/approval integration tests pass. | Core orchestration boundary. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-runtime-binding-registry.ts` | Deterministic member binding lookup and team mode tracking implemented. | Registry unit tests pass. | Used by orchestrator + streaming integration tests. | Covers R-004/R-009. |
| `autobyteus-server-ts/src/run-history/store/team-run-manifest-store.ts` | Runtime metadata persisted and validated in member bindings. | Store/domain unit tests pass. | Continue/history e2e tests pass. | Covers R-002/R-007. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Runtime-mode branch handling for tool approval/events implemented. | Stream handler unit tests pass. | Team websocket integration tests pass. | Covers R-005/R-006/R-008. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Member runtime kind included in create payload path. | Store spec passes. | GraphQL contract scenario passes in Stage 6. | Covers R-001. |
| `autobyteus-web/stores/runHistoryStore.ts` | Team reopen parses runtime metadata without hardcoded defaults. | Store spec passes. | Resume API scenario passes in Stage 6. | Covers R-002/R-007/R-010. |
| `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts` + `codex-app-server-runtime-service.ts` + `codex-thread-history-reader.ts` | Shared-process manager owns codex app-server lifecycle; sessions/history-reader reuse shared transport with no per-run/per-read subprocess spawn. | Process-manager and runtime session unit tests pass. | Concurrent-run integration/E2E process-count assertion passes with distinct thread identities. | Covers R-018. |
| `autobyteus-server-ts/src/services/agent-streaming/codex-runtime-event-adapter.ts` + helper modules (`codex-runtime-event-segment-helper.ts`, `codex-runtime-event-tool-helper.ts`, `codex-runtime-event-debug.ts`) | Adapter remains orchestration shell while helper modules own segment parsing, tool-name extraction, tool-call argument projection, and debug metadata boundaries. | Runtime event mapper unit tests pass for `toolName`, `tool_name`, `tool`, and `tool.name` payload forms plus `payload.arguments`/`payload.item.arguments` projection. | Full backend/frontend suite reruns confirm no tool activity regression. | Covers R-021. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts` + `runtime-execution/codex-app-server/{codex-app-server-runtime-service.ts,codex-send-message-tooling.ts}` | Team create/restore emits `teamMemberManifest` metadata, and codex thread start/resume injects teammate-aware developer instructions + recipient hints without changing non-team flows. | Orchestrator/runtime-service/send-message-tooling unit suites pass for metadata parsing, developer-instruction rendering, and dynamic-tool recipient enum projection. | Full backend/frontend suites pass with strict live codex transport enabled. | Covers R-022. |

## Internal Code Review Gate Plan (Stage 5.5)

- Gate artifact path: `tickets/in-progress/codex-team-member-runtime-communication/internal-code-review.md`
- Source-file scope only (exclude tests): changed backend/frontend source modules for `C-001`..`C-017` and `C-021`.
- `>300` line changed source files SoC assessment approach: line-count audit + explicit boundary split check per changed source file.
- `>500 effective lines` changed source file policy and expected action: default `Design Impact` unless explicit exception rationale is recorded.
- Allowed exceptions and required rationale style: only with concrete split infeasibility + risk containment + follow-up split task.

| File | Current Line Count | Adds/Expands Functionality (`Yes`/`No`) | SoC Risk (`Low`/`Medium`/`High`) | Required Action (`Keep`/`Split`/`Move`/`Refactor`) | Expected Review Classification if not addressed |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/api/graphql/types/agent-team-run.ts` | TBD at Stage 5.5 | Yes | Medium | Keep/Refactor | Design Impact |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | TBD at Stage 5.5 | Yes | Medium | Keep/Refactor | Design Impact |
| `autobyteus-web/stores/runHistoryStore.ts` | TBD at Stage 5.5 | Yes | Medium | Keep/Refactor | Design Impact |
| `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | TBD at Stage 5.5 | Yes | High | Split | Design Impact |
| `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts` | TBD at Stage 5.5 | Yes | High | Refactor (remove constructor-side runtime mutation) | Design Impact |
| `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts` | TBD at Stage 5.5 | Yes | High | Split/Move | Design Impact |

## Test Strategy

- Unit tests:
  - `pnpm -C autobyteus-server-ts test -- tests/unit/runtime-execution/runtime-command-ingress-service.test.ts`
  - `pnpm -C autobyteus-server-ts test -- tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts`
  - `pnpm -C autobyteus-web test:nuxt -- stores/__tests__/agentTeamRunStore.spec.ts stores/__tests__/runHistoryStore.spec.ts`
  - `pnpm -C autobyteus-web test:nuxt -- components/workspace/config/__tests__/MemberOverrideItem.spec.ts`
- Integration tests:
  - `pnpm -C autobyteus-server-ts test -- tests/integration/agent/agent-team-websocket.integration.test.ts`
  - `pnpm -C autobyteus-server-ts test -- tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts`
  - `pnpm -C autobyteus-server-ts test -- tests/e2e/agent-team-execution/send-message-to-team-graphql-contract.e2e.test.ts tests/e2e/run-history/team-run-history-graphql.e2e.test.ts`
- Stage 5 boundary: file/module/service-level verification only (unit + integration).
- Stage 5.5 handoff notes for internal code review:
  - predicted design-impact hotspots: resolver/orchestrator/stream-handler boundary seams.
  - files likely to exceed size/SoC thresholds: `agent-team-run.ts`, `agent-team-stream-handler.ts`, `runHistoryStore.ts`.
- Stage 6 handoff notes for aggregated validation:
- expected acceptance criteria count: `22`
  - critical flows to validate (API/E2E): create, targeted send, approval routing, websocket identity, continuation restore, non-codex regression, deterministic routing errors, inter-agent relay semantics, workspace-root persistence parity, and MCP tool-name mapping correctness.
- expected scenario count: `22`
  - known environment constraints: codex runtime event scenarios require runtime service availability and websocket harness.

## Aggregated API/E2E Validation Scenario Catalog (Stage 6 Input)

| Scenario ID | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Validation Level (`API`/`E2E`) | Expected Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| AV-001 | Requirement | AC-001 | R-001 | UC-001 | API | `createAgentTeamRun` accepts valid member runtime kinds and rejects invalid kinds deterministically. |
| AV-002 | Requirement | AC-002 | R-002 | UC-001, UC-005 | API | Team manifest/history payload include member runtime metadata fields with stable shape. |
| AV-003 | Requirement | AC-003 | R-003 | UC-001 | API | Codex member sessions exist and are keyed by `memberRunId` immediately after creation. |
| AV-004 | Requirement | AC-004 | R-004 | UC-002 | API | Targeted send routes to exactly one intended member session. |
| AV-005 | Requirement | AC-005 | R-005 | UC-003 | E2E | Tool approval/denial is applied only to the intended member/invocation. |
| AV-006 | Requirement | AC-006 | R-006 | UC-004 | E2E | Team websocket codex events include stable `agent_name` and `agent_id` member identity tags. |
| AV-007 | Requirement | AC-007 | R-007 | UC-005 | API | Continuation restores member runtime sessions before resumed targeted dispatch. |
| AV-008 | Requirement | AC-008 | R-008 | UC-006 | API | Non-codex create/send/approval/streaming flows remain behaviorally unchanged. |
| AV-009 | Requirement | AC-009 | R-009 | UC-007 | API | Invalid target/binding/session states return deterministic explicit errors. |
| AV-010 | Requirement | AC-010 | R-010 | UC-001, UC-002, UC-003, UC-005 | API | No impacted legacy fallback path remains; routing behavior uses explicit member bindings only. |
| AV-011 | Requirement | AC-011 | R-011 | UC-008 | E2E | Member-to-member orchestration/routing semantics remain coherent under codex member runtime. |
| AV-012 | Requirement | AC-012 | R-012 | UC-008, UC-010 | API | `recipient_name` resolution is deterministic and rejects ambiguous/unknown recipients with explicit tool-visible failures. |
| AV-013 | Requirement | AC-013 | R-013 | UC-009 | E2E | Recipient receives full inter-agent envelope metadata with sender/message-type/content preserved. |
| AV-014 | Requirement | AC-014 | R-014 | UC-009 | E2E | Recipient runtime normalizes envelope into standard reasoning/input pipeline and continues reasoning flow. |
| AV-015 | Requirement | AC-015 | R-015 | UC-010 | API | Sender receives deterministic tool-visible failures for recipient unavailable/start/session errors. |
| AV-016 | Requirement | AC-016 | R-016 | UC-008, UC-009, UC-010 | Integration/E2E | Inter-agent tool routing executes without dependency on frontend GraphQL user-message ingress path. |
| AV-017 | Requirement | AC-017 | R-017 | UC-011 | E2E | Team-bound capability-authorized Codex sessions expose `send_message_to`; standalone sessions and non-authorized members do not. |
| AV-018 | Requirement | AC-018 | R-018 | UC-012 | Integration/E2E | Concurrent codex runs share one app-server process while preserving run/thread identity isolation. |
| AV-019 | Requirement | AC-019 | R-019 | UC-015 | E2E | Team runtime selection switches provider catalogs/schemas and team launch payload emits uniform selected runtime kind across members. |
| AV-020 | Requirement | AC-020 | R-020 | UC-016 | API/E2E | Codex workspace-root persistence remains stable for workspaceId-based team runs and history grouping after create/send/terminate/continue lifecycle. |
| AV-021 | Requirement | AC-021 | R-021 | UC-017 | API/E2E | Codex MCP tool-call events map concrete tool names from supported payload shapes, avoid `MISSING_TOOL_NAME`, and project provided arguments into canonical activity metadata. |
| AV-022 | Requirement | AC-022 | R-022 | UC-018 | API/E2E | Codex team member startup/resume injects teammate-manifest developer instructions (self excluded) and `send_message_to` recipient hints from the same manifest when capability is enabled. |
| AV-023 | Requirement | AC-023 | R-023 | UC-019 | API/E2E | Codex team relay flow surfaces sender-side `send_message_to` tool-call lifecycle and recipient-side structured `INTER_AGENT_MESSAGE` payload parity for `From <sender>` rendering. |

## Aggregated Validation Escalation Policy (Stage 6 Guardrail)

- Classification rules for failing aggregated validation scenarios:
  - choose exactly one classification: `Local Fix`, `Design Impact`, or `Requirement Gap`.
  - run investigation screen first when scope/root cause is unclear or cross-cutting.
  - do not close Stage 6 with any in-scope acceptance criterion at `Unmapped`, `Not Run`, `Failed`, or `Blocked` unless user explicitly marks `Waived`.
  - `Local Fix`: no requirement/design change needed; boundaries remain intact.
  - `Design Impact`: boundary drift/architecture updates required.
  - `Requirement Gap`: missing/ambiguous requirement or newly discovered requirement-level constraint.
- Required action:
  - `Local Fix` -> update artifacts first, implement fix, rerun Stage 5 + Stage 5.5, rerun affected scenarios.
  - `Design Impact` -> mandatory investigation checkpoint, then re-entry `Stage 2 -> Stage 3 -> Stage 4 -> Stage 5 -> Stage 5.5`.
  - `Requirement Gap` -> re-entry `Stage 1 -> Stage 2 -> Stage 3 -> Stage 4 -> Stage 5 -> Stage 5.5`.
  - unclear/cross-cutting root cause -> re-entry `Stage 0 -> Stage 1 -> Stage 2 -> Stage 3 -> Stage 4 -> Stage 5 -> Stage 5.5`.

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| None at plan baseline | N/A | N/A | N/A | N/A | Not Needed | N/A |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| None at plan baseline | N/A | N/A | Track during implementation and update if drift appears. | Pending |

## Stage 5 Re-Entry Notes (Round 18)

1. Added implementation scope for `R-023` stream parity:
   - `C-031`: synthesize sender-side `send_message_to` tool-call events in Codex runtime router path.
   - `C-032`: synthesize recipient-side structured `inter_agent_message` event and adapter mapping to `INTER_AGENT_MESSAGE`.
2. Execution task for this round:
   - `T-027`: implement `C-031` + `C-032`, add/extend unit tests, and rerun strict live Codex team roundtrip E2E with websocket event assertions.
3. Validation mapping extension:
   - `AV-023` closes `AC-023` via strict live Codex team websocket assertions for sender tool-call visibility and recipient inter-agent payload parity.
