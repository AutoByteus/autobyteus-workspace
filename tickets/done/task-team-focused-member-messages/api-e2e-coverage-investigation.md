# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-focused-member-messages/tickets/done/task-team-focused-member-messages/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-focused-member-messages/tickets/done/task-team-focused-member-messages/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-focused-member-messages/tickets/done/task-team-focused-member-messages/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-focused-member-messages/tickets/done/task-team-focused-member-messages/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-focused-member-messages/tickets/done/task-team-focused-member-messages/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-team-focused-member-messages/tickets/done/task-team-focused-member-messages/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review Round 3 pass for `task-team-focused-member-messages`; API/E2E coverage investigation required before final executable validation or coverage edits.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior is a clean-cut address-first Team Communication model. Durable projection files remain at `memory/agent_teams/<rootTeamRunId>/team_communication_messages.json`, but the projection stores `teamRunId` once at the top level and every message stores `senderAddress` and `receiverAddress` as canonical `ConversationTargetAddress` values plus `content`, `messageType`, `createdAt`, and `referenceFiles`. Runtime, GraphQL, WebSocket, and frontend store/panel code must not read or match old flat participant identity fields such as `senderRunId`, `senderMemberRouteKey`, represented-subteam fields, or `taskTeamScope`; old flat files are handled only by the registered app-data migration.

The coverage stage must prove or retain coverage for persistent members, static nested members, task agents, task-team roots, task-team children, task-agent-inside-task-team children, concurrent task-team run isolation, live `TEAM_COMMUNICATION_MESSAGE` payloads, post-restart/historical GraphQL hydration, reference-file content routes, and app-data migration success/skip/failure visibility.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Team Communication durable message identity is `senderAddress` / `receiverAddress` | Changed | `REQ-TTFM-001` through `REQ-TTFM-006`, `AC-TTFM-001` through `AC-TTFM-006`; design canonical model | Durable service, GraphQL/API, stream, frontend store, and E2E assertions must use address-first shape. |
| Old flat participant fields are not runtime compatibility inputs | Removed | `REQ-TTFM-002`, `REQ-TTFM-012`, `AC-TTFM-010`; design Legacy Removal Policy; implementation handoff Legacy / Compatibility Removal Check | Existing coverage that seeds or asserts old flat fields in runtime/API/E2E must be updated or replaced; runtime no-fallback must be probed by source scan and API behavior. |
| App-data migration converts old flat files before normal runtime | Added | `REQ-TTFM-011`, `REQ-TTFM-013`, `AC-TTFM-009`, `AC-TTFM-011` | Migration tests remain required; startup-registration/runner behavior must be exercised or retained. |
| Live WebSocket and GraphQL hydration use the same address-first message model | Changed | `REQ-TTFM-004`, `REQ-TTFM-005`, `AC-TTFM-006`; design live/hydration spines | Server stream tests, API integration, frontend stream/store/hydration query tests must align with address-first fields. |
| Reference files remain message-owned and served by team run/message/reference identity | Preserved | `REQ-TTFM-010`, `AC-TTFM-008`; implementation handoff downstream hints | Existing reference route coverage remains valid after updating seed/query message shape. |
| Exact focused-address matching replaces selector/fuzzy matching | Changed | `REQ-TTFM-006`, `REQ-TTFM-007`, `REQ-TTFM-009`; design address key normalization | Frontend store/component tests for exact address equality and concurrent task-team isolation remain required. |
| Static subteam parent-boundary sender addresses are parent-rooted, including static task-agent senders | Changed | Code review findings `CR-TTFM-001` resolved in Round 3 | Existing mixed manager/bridge regression tests remain required and should be rerun. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/services/team-communication/team-communication-service.test.ts` | Persists address-first canonical messages, reference files, task-team child addresses, and parent-rooted projection key | `REQ-TTFM-001`-`006`, `REQ-TTFM-010`, `AC-TTFM-001`-`008` | Still Valid | Inspection shows address-first fixtures and assertions; no old flat participant fields asserted as current behavior. | Retain and rerun. |
| `autobyteus-server-ts/tests/unit/app-data-migrations/team-communication-projection-address-migration.test.ts` | Converts old flat files with backup, skips current files, reports unconvertible files, confirms startup-required registration | `REQ-TTFM-011`-`013`, `AC-TTFM-009`, `AC-TTFM-011` | Still Valid | Old flat fields appear only as migration input; output assertions reject old fields. | Retain and rerun. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-manager.test.ts` | Static parent-boundary, static nested task-agent, task-team scoped sender preservation, root-aware normalization | `REQ-TTFM-003`, `REQ-TTFM-008`, `REQ-TTFM-009`; code-review `CR-TTFM-001` | Still Valid | Code review Round 3 passed this suite; inspected scenarios match current address-first behavior. | Retain and rerun. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-event-bridge.test.ts` | Static child address prefixing, same-name child prefixing, task-team scoped address preservation | `REQ-TTFM-003`, `REQ-TTFM-004`, `REQ-TTFM-008`; code-review `CR-TTFM-002` | Still Valid | Fixtures use `senderAddress` / `receiverAddress`; absence of deleted participant fields asserted. | Retain and rerun. |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts` | Converts canonical communication events to address-first WebSocket payloads | `REQ-TTFM-004`, `AC-TTFM-006` | Still Valid | Address-first payload assertions include no `senderRunId`/`receiverRunId`. | Retain and rerun relevant file. |
| `autobyteus-server-ts/tests/unit/agent-execution/events/team-communication-message-event-processor.test.ts` | Emits normalized message-centric Team Communication events with references and skips incomplete metadata | `REQ-TTFM-003`, `REQ-TTFM-004`, `REQ-TTFM-010` | Still Valid | Listed in implementation checks; inspected test titles cover current event processor boundary. | Retain and rerun. |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts` | Streaming mapper behavior for Team Communication message payloads | `REQ-TTFM-004` | Still Valid | Included in implementation checks and changed in current patch. | Retain and rerun. |
| `autobyteus-server-ts/tests/integration/api/team-communication-api.integration.test.ts` | GraphQL hydration and REST reference-content route | `REQ-TTFM-005`, `REQ-TTFM-010`, `AC-TTFM-006`, `AC-TTFM-008`, no-runtime-fallback policy | Needs Update | Inspection found it seeds an old flat `version: 1` projection and queries/asserts deleted `teamRunId`, `senderRunId`, and `receiverRunId` message fields. That is obsolete outside migration. | Update to seed/query address-first current shape, assert deleted flat fields are absent from GraphQL, preserve reference-content route checks, and add a no-runtime-fallback check for unmigrated old flat files. |
| `autobyteus-server-ts/tests/e2e/helpers/team-communication-message-helpers.ts` | Shared E2E predicate for real runtime `TEAM_COMMUNICATION_MESSAGE` receipt | `REQ-TTFM-004`, real-runtime E2E coverage | Needs Update | Helper still requires `senderRunId`, `receiverRunId`, `senderMemberName`, and `receiverMemberName`, which are removed from current payloads. | Update helper to validate non-empty address-first sender/receiver member segments and content; reject old flat sender/receiver fields. |
| `autobyteus-server-ts/tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts` direct parent-to-subteam communication assertion | Real nested mixed team stream validates static represented child receiver identity | `REQ-TTFM-003`, `REQ-TTFM-004`, `REQ-TTFM-008`, static nested coverage | Needs Update | Direct assertion still checks `senderMemberKind`, `senderMemberRouteKey`, `receiverRepresentedSubTeam`, etc. | Update to assert `senderAddress: member:program_manager`, `receiverAddress: member:BuildSquad/review_lead`, and absence of old flat fields. |
| Other E2E runtime tests using `isE2eTeamCommunicationMessage(...)` | Real runtime send-message roundtrips wait for Team Communication delivery projection | `REQ-TTFM-004`, broad runtime E2E | Needs Update via helper | Call sites remain behaviorally valid, but rely on stale helper. | Helper update repairs shared predicate without editing each call site. Full real-runtime execution is deferred due external runtime/LLM dependencies. |
| `autobyteus-web/stores/__tests__/teamCommunicationStore.spec.ts` | Address equality for persistent/static/task-agent/task-team/nested task-agent/concurrent isolation and live upsert | `REQ-TTFM-006`-`010`, `AC-TTFM-003`-`006`, `AC-TTFM-008` | Still Valid | Inspection shows exact address-first fixtures and negative base-member/concurrent-run assertions. | Retain and rerun. |
| `autobyteus-web/components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts` | Renders address-based perspective rows and reference opening by message/reference id | `REQ-TTFM-006`, `REQ-TTFM-010`, `AC-TTFM-008` | Still Valid | Props use `focusedAddress`; reference rows use message/ref identity. | Retain and rerun. |
| `autobyteus-web/components/workspace/team/__tests__/TeamOverviewPanel.spec.ts` | Team overview derives/passes focused address and message counts | `REQ-TTFM-006`, `REQ-TTFM-007`, `AC-TTFM-003`-`007` | Still Valid | Focused subteam assertion expects `focusedAddress`, not old selector. | Retain and rerun. |
| `autobyteus-web/components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts` | Focus/send workflow remains aligned with canonical conversation target address | `REQ-TTFM-007`, `AC-TTFM-007` | Still Valid | Implementation checks passed; coverage still represents current focused-send address derivation. | Retain and rerun. |
| `autobyteus-web/components/mobile/__tests__/MobileTeamMessages.spec.ts` | Mobile Team Messages renders/reference-opens address-first store rows | `REQ-TTFM-006`, `REQ-TTFM-010`, `AC-TTFM-008` | Still Valid | Uses Team Communication store; no stale flat fields found in relevant grep. | Retain and rerun. |
| `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | Routes live Team Communication payloads into store; send messages serialize canonical target addresses | `REQ-TTFM-004`, `REQ-TTFM-007`, `AC-TTFM-006` | Still Valid | Address-first payload tests exist; implementation handoff reports pass. | Retain and rerun targeted file. |
| `autobyteus-web/graphql/queries/__tests__/runHistoryQueries.spec.ts` | GraphQL query shape regressions | `REQ-TTFM-005`, `AC-TTFM-006` | Needs Update | Query source is updated to request address fields, but the test file does not assert the Team Communication query shape or absence of removed flat fields. | Add narrow assertion for `GetTeamCommunicationMessages` address-first fields and no flat identity fields. |
| Runtime/source old-flat scan across Team Communication service/API/stream/store/panels | Compatibility/legacy guard | `REQ-TTFM-012`, `AC-TTFM-010` | Still Valid as temporary executable probe | Inspection found old flat participant fields only in the stale integration/E2E tests, migration code/tests, and unrelated member-input/global-agent-message contracts. | Run scoped `rg` probe after updates to confirm no runtime Team Communication fallback remains. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/api/team-communication-api.integration.test.ts` existing GraphQL half | Runtime GraphQL accepts old flat projection seed and returns per-message `teamRunId`, `senderRunId`, `receiverRunId` | Old flat runtime read compatibility is explicitly rejected; GraphQL message shape no longer exposes those fields | `REQ-TTFM-001`, `REQ-TTFM-002`, `REQ-TTFM-005`, `REQ-TTFM-012`, `AC-TTFM-001`, `AC-TTFM-002`, `AC-TTFM-006`, `AC-TTFM-010` | Update the same integration test to seed current projection and query `senderAddress`/`receiverAddress`; add direct unmigrated-old-flat no-fallback assertion. | N/A |
| `autobyteus-server-ts/tests/e2e/helpers/team-communication-message-helpers.ts` | E2E `TEAM_COMMUNICATION_MESSAGE` predicate requires flat sender/receiver run ids and display names | Current live payload is address-first and intentionally has no flat sender/receiver identity fields | `REQ-TTFM-004`, `REQ-TTFM-012`, `AC-TTFM-006`, `AC-TTFM-010` | Update helper to address-first sender/receiver address predicate with old-field rejection. | N/A |
| `autobyteus-server-ts/tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts` parent-to-subteam event assertion | Static child receiver asserted through `receiverMemberPath`, `receiverMemberRouteKey`, and `receiverRepresentedSubTeam` | Static nested receiver identity is now one `receiverAddress` member segment, e.g. `BuildSquad/review_lead` | `REQ-TTFM-003`, `REQ-TTFM-004`, `REQ-TTFM-008`, `AC-TTFM-002`, `AC-TTFM-010` | Update assertion to address-first fields and absence of removed flat fields. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `API-TTFM-001` | GraphQL hydration of a current address-first Team Communication projection returns address objects/segments and still allows REST reference content lookup by team/message/reference identity | `REQ-TTFM-005`, `REQ-TTFM-010`, `AC-TTFM-006`, `AC-TTFM-008` | Update `autobyteus-server-ts/tests/integration/api/team-communication-api.integration.test.ts` | Existing integration coverage is the right API boundary but currently asserts obsolete flat fields. |
| `API-TTFM-002` | Runtime GraphQL read does not silently display or convert an unmigrated old flat Team Communication file | `REQ-TTFM-012`, `REQ-TTFM-013`, `AC-TTFM-010`, `AC-TTFM-011` | Add a second scenario in `autobyteus-server-ts/tests/integration/api/team-communication-api.integration.test.ts` | Proves no runtime fallback exists at the API boundary; migration is the only old-shape owner. |
| `API-TTFM-003` | Frontend hydration query requests `senderAddress`/`receiverAddress` segments and not deleted flat fields | `REQ-TTFM-005`, `AC-TTFM-006`, `AC-TTFM-010` | Update `autobyteus-web/graphql/queries/__tests__/runHistoryQueries.spec.ts` | Ensures generated/query shape regressions fail fast in targeted frontend coverage. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `API-TTFM-004` | `autobyteus-server-ts/tests/e2e/helpers/team-communication-message-helpers.ts` | Replace old flat payload predicate with address-first predicate and reject old flat sender/receiver fields | `REQ-TTFM-004`, `REQ-TTFM-012`, `AC-TTFM-006`, `AC-TTFM-010` | Shared update keeps multiple real-runtime E2E tests meaningful without editing every call site. |
| `API-TTFM-005` | `autobyteus-server-ts/tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts` | Replace direct old flat parent-to-subteam assertion with sender/receiver address assertions | `REQ-TTFM-003`, `REQ-TTFM-004`, `REQ-TTFM-008`, `AC-TTFM-010` | Static nested parent-to-child coverage remains important and should not be removed. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No durable coverage will be deleted. | N/A | Stale assertions will be updated/replaced in-place. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `PROBE-TTFM-001` | Scoped `rg` scan for old flat fields in normal Team Communication runtime/API/stream/frontend paths after coverage edits | Confirms no runtime old-flat participant fallback or deleted payload fields remain outside migration/tests/unrelated member-input contracts | Static compatibility guard is evidence for this task; durable no-fallback coverage is added at the API integration boundary. |
| `PROBE-TTFM-002` | Targeted TypeScript compile of the pure E2E helper after update | Confirms helper syntax/type health without running external LLM-dependent E2E suites | Helper has no standalone test; full real-runtime E2E is environment-dependent. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full real-runtime Codex/Claude/AutoByteus E2E team conversations that depend on local/remote LLM runtimes | Existing tests under `autobyteus-server-ts/tests/e2e/runtime/*` are retained/updated where stale, but running them requires external runtime/model availability and long timeouts not established by this task handoff | Some emergent runtime behavior may only appear in full LLM-driven E2E | No reroute; record as not executed. Durable helper/direct E2E assertions are updated so those suites remain valid for environments that can run them. |
| Browser UI end-to-end with a running Nuxt app and live backend | Existing targeted Vue/store/service tests cover the Team Communication UI/store boundary; no Playwright/browser harness for this feature was identified as part of the changed scope | Visual-only regressions beyond component tests remain possible | No reroute; targeted component/store/API/stream coverage is sufficient for this change scope. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | Requirements/design/code review are clear; stale coverage assertions are local coverage updates, not implementation defects. | N/A |

## Execution Plan

1. Update stale durable API/E2E coverage in-place:
   - `autobyteus-server-ts/tests/integration/api/team-communication-api.integration.test.ts`
   - `autobyteus-server-ts/tests/e2e/helpers/team-communication-message-helpers.ts`
   - `autobyteus-server-ts/tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts`
   - `autobyteus-web/graphql/queries/__tests__/runHistoryQueries.spec.ts`
2. Run targeted API/integration/server coverage:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/integration/api/team-communication-api.integration.test.ts`
   - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-team-execution/mixed-team-manager.test.ts tests/unit/agent-team-execution/mixed-team-event-bridge.test.ts tests/unit/app-data-migrations/team-communication-projection-address-migration.test.ts tests/unit/services/team-communication/team-communication-service.test.ts tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts tests/unit/agent-execution/events/team-communication-message-event-processor.test.ts tests/unit/services/agent-streaming/agent-run-event-message-mapper.test.ts tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts`
3. Run targeted frontend Team Communication/hydration-query coverage:
   - `pnpm -C autobyteus-web test:nuxt --run stores/__tests__/teamCommunicationStore.spec.ts components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts components/workspace/team/__tests__/TeamOverviewPanel.spec.ts components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts components/mobile/__tests__/MobileTeamMessages.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts graphql/queries/__tests__/runHistoryQueries.spec.ts`
4. Run executable probes:
   - Scoped `rg` old-flat-field scan in normal Team Communication runtime/API/stream/frontend paths.
   - Targeted `tsc` compile of `autobyteus-server-ts/tests/e2e/helpers/team-communication-message-helpers.ts`.
5. Run `git diff --check` and `pnpm -C autobyteus-server-ts build` as integrated sanity checks.
6. Write the canonical execution coverage report. Because repository-resident durable coverage will be updated after the earlier code review, route the cumulative package back to `code_reviewer` on pass.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing implementation source passed code review. The only issues found in investigation are stale durable API/E2E coverage artifacts that still encode the removed flat Team Communication model. They will be updated before final execution and then returned through `code_reviewer` as required.
