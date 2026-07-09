# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation/tickets/in-progress/gpt56-reasoning-level-investigation/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation/tickets/in-progress/gpt56-reasoning-level-investigation/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation/tickets/in-progress/gpt56-reasoning-level-investigation/proposed-design.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation/tickets/in-progress/gpt56-reasoning-level-investigation/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation/tickets/in-progress/gpt56-reasoning-level-investigation/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/gpt56-reasoning-level-investigation/tickets/in-progress/gpt56-reasoning-level-investigation/code-review-report.md`
- Current Investigation Round: `1`
- Trigger: Code-review pass for implementation commit `7bda8b9d6d0611fc4011418b8deed7ea445af423`; API/E2E was asked to disposition the stale fixed-union live test and prove dynamic catalog, GraphQL, runtime-payload, and `ultra` team behavior.
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: `Round 1`

## Current Requirement And Design Basis

The approved behavior makes Codex App Server `model/list` authoritative for each model's reasoning-effort capabilities. AutoByteus must preserve every trimmed non-empty advertised effort in first-seen order, must not invent a value on a model that does not advertise it, and must carry an explicit trimmed non-empty direct configuration value to `turn/start.effort` without applying a product-wide supported-value union. Unset, whitespace-only, and non-string values remain `null`. The separate product policy for `service_tier` remains closed to `fast`. Current local runtime evidence includes models advertising `max` and `ultra`; `ultra` also requires realistic team-runtime validation because the installed Codex protocol associates it with automatic task delegation. Agent, team-global, and member-override UI surfaces continue to consume the same generic model schema.

The implementation handoff's Legacy / Compatibility Removal Check is clean, and source inspection agrees: the fixed reasoning set and rejection branch were deleted without a wrapper, fallback, dual path, or retained legacy behavior. The independent code review found no source or architecture defects.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| App Server advertised reasoning values -> AutoByteus model schema | Changed | `REQ-005`, `REQ-007`, `AC-006`, `AC-008`, `AC-009`; design DS-001/DS-003 | Compare raw per-model advertised values with catalog and GraphQL results dynamically; do not use a fixed union or permanent model name. |
| Explicit `llmConfig.reasoning_effort` -> `turn/start.effort` | Changed | `REQ-006`, `AC-007`, design DS-002 | Prove `max`, `ultra`, and an arbitrary trimmed non-empty value reach the request unchanged; prove malformed/unset input becomes `null`. |
| Closed global reasoning allowlist and silent unknown-value rejection | Removed | Design Legacy Removal Policy and Removal Plan | The old live fixed-union assertion is obsolete and must be replaced, not preserved. |
| Model-scoped non-invention | Preserved and strengthened | `REQ-007`, `AC-008` | Assert every GraphQL/model-schema sequence equals that same model's raw sequence rather than a global superset. |
| Generic frontend schema normalization/rendering | Preserved | `REQ-008`, design DS-001/DS-003; frontend source inspection | Retain existing generic component/schema coverage; execute focused frontend tests to confirm arbitrary enums still flow to the selector. |
| `service_tier === "fast"` policy | Preserved | Design constraints/dependency rules | Re-run focused service-tier coverage and ensure reasoning openness does not admit `flex`/`turbo`. |
| Team communication/tool invariants under `ultra` | Changed execution condition | Requirements risk/open question and code-review residual risk | Exercise a real Codex team with a dynamically selected model that advertises `ultra`, explicit `ultra` member config, and existing exact communication/tool-trace invariants. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/services/codex-model-catalog.integration.test.ts` / fixed allowed reasoning values | Live catalog values belong to `none/low/medium/high/xhigh` | `REQ-005`, `REQ-007`, `AC-006`, `AC-008`, `AC-009` | `Needs Update` | The assertion encodes the deleted policy and would reject valid `max`, `ultra`, or future values without detecting omission. | Replace the fixed-union assertion with raw `model/list` -> catalog/GraphQL per-model sequence parity and retain the independent `fast` assertion. |
| Same live catalog file / usable model identifiers | Live transport yields non-empty identifiers | Discovery boundary | `Still Valid` | This remains a useful transport sanity check and does not encode capability policy. | Retain within the updated parity scenario. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-app-server-model-normalizer.test.ts` | Open-string trimming, catalog order/deduplication/default, malformed values, current/future values, and `fast` policy | `REQ-005`-`REQ-007`, `AC-007`-`AC-009` | `Still Valid` | Review-passed coverage is behavior-oriented and contains no production union. | Re-run; rely on it for pure malformed/default/order behavior. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` / reasoning + service-tier config construction | A configured effort and `FAST` become thread config values | `REQ-006`, DS-002 | `Needs Update` | The scenario only uses `high`; it does not prove open current/future values or malformed/unset behavior at the config-construction boundary. | Expand narrowly with table-driven `max`, `ultra`, arbitrary trimmed, malformed, and unset cases while retaining `fast` policy coverage. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` / turn payload | `medium` and `fast` are sent on `turn/start` | `REQ-006`, `AC-007`, DS-002 | `Needs Update` | Transport is covered, but the changed values and open-string semantics are not asserted at the request boundary. | Parameterize the helper and add `max`, `ultra`, arbitrary trimmed output, and `null` payload cases; keep the `fast` check. |
| `autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts` / exact ping-pong tool and trace roundtrip | Real Codex team members communicate through the configured `send_message_to` surface with exact invocation/trace invariants | `ultra` semantic risk, `REQ-008` | `Needs Update` | The realistic scenario is valid, but it currently runs with default reasoning and chooses a preferred model without inspecting its advertised effort schema. | Select a model by advertised `ultra` capability without a fixed model name, set explicit `ultra` for the members, and retain the exact tool/communication assertions. |
| `autobyteus-web/utils/__tests__/llmConfigSchema.spec.ts` and `autobyteus-web/components/workspace/config/__tests__/ModelConfigSection.spec.ts` | Generic backend enum normalization, schema sanitization, and rendering | `REQ-008`, DS-001/DS-003 | `Still Valid` | Source and tests are provider-agnostic; existing tests already render arbitrary values such as `max` and do not filter through a Codex union. | Re-run focused frontend tests; no durable edit planned unless execution reveals a gap. |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` / Codex team-global fixture | Backend-provided Codex schema renders on the team-global path | `REQ-008` | `Still Valid` | The four-value fixture is illustrative, not an asserted global supported set; component behavior renders all provided values. | Re-run focused test; do not turn the fixture into a permanent current-runtime catalog snapshot. |
| Other live Codex thread/client and team lifecycle suites | General live process, turn, approval, restore, and team behaviors | Broader runtime subsystem | `Out Of Scope` | They do not assert the changed reasoning boundary, and broad reruns would add cost without targeted evidence. | Run only targeted scenarios needed for regression confidence. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/services/codex-model-catalog.integration.test.ts` / `every(value => ["none", "low", "medium", "high", "xhigh"].includes(value))` | Every normalized live effort must belong to the old five-value AutoByteus union. | App Server owns per-model supported values and the implementation deliberately deleted the union. The assertion validates the former defect and breaks forward compatibility. | `REQ-005`, `REQ-007`, `AC-006`, `AC-008`, `AC-009`; reviewed design Removal / Decommission Plan; code-review report. | Dynamic per-model equality among raw App Server values, mapped catalog values, and GraphQL `configSchema` values, plus independent `fast` assertions. | N/A; replacement is required. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `CAT-PARITY-001` | Raw non-empty advertised values equal catalog and GraphQL enum values per model, in order, with no invented value. | `REQ-005`, `REQ-007`, `AC-006`, `AC-008`, `AC-009`, DS-001/DS-003 | Update `autobyteus-server-ts/tests/integration/services/codex-model-catalog.integration.test.ts` | This is the regression boundary where the defect escaped and must stay dynamic as catalogs evolve. |
| `TURN-PAYLOAD-001` | `max` and `ultra` propagate to `turn/start.effort`. | `REQ-006`, `AC-007`, DS-002 | Update focused bootstrapper/thread unit coverage | The named values are current required regression cases at the exact request boundary. |
| `TURN-PAYLOAD-002` | Arbitrary trimmed non-empty direct input propagates; malformed/unset input is `null`. | `AC-009`, design open-string runtime contract | Update focused bootstrapper/thread unit coverage | This prevents reintroduction of a disguised allowlist and preserves default behavior. |
| `TEAM-ULTRA-001` | A real team using an advertising model and explicit `ultra` preserves exact `send_message_to`, stream, and tool-trace invariants. | Requirements risk/open question; code-review required scenario | Update `autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts` | `ultra` is a semantic integration mode, not only a label; realistic orchestration behavior needs durable protection. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `CAT-PARITY-001` | `tests/integration/services/codex-model-catalog.integration.test.ts` | Replace fixed union with raw/catalog/GraphQL model-keyed sequence comparison; preserve `fast` checks. | `REQ-005`, `REQ-007`, `AC-006`, `AC-008`, `AC-009` | Model identities come from the live response; no permanent Sol/Luna assumption. |
| `TURN-PAYLOAD-001` / `TURN-PAYLOAD-002` | Bootstrapper and thread focused tests | Cover current open values, future arbitrary values, malformed/unset, and exact outgoing effort field. | `REQ-006`, `AC-007`, `AC-009` | Keep service-tier assertions separate and closed. |
| `TEAM-ULTRA-001` | Codex team exact roundtrip scenario | Discover a model advertising `ultra` via GraphQL schema and run the same exact communication assertions with explicit `ultra`. | Semantic `ultra` risk | A live catalog without any advertising model makes this scenario infeasible for that execution and must be reported, not replaced with a named model. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| Fixed five-value assertion inside `codex-model-catalog.integration.test.ts` | It asserts intentionally removed capability policy. | `REQ-005`, `AC-009`, reviewed removal plan | Replace with `CAT-PARITY-001`; retain the file and live-transport intent. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `LIVE-WIRE-001` | Instrument a real `CodexAppServerClient` request boundary in temporary test scaffolding and exercise live turns for dynamically selected advertising models. | Exact AutoByteus `turn/start` payloads for `max` and `ultra`; App Server acceptance/completion where practical. | Live request capture is execution evidence; durable deterministic payload coverage belongs in the focused thread tests. |
| `LIVE-DIRECT-001` | Send a resolved arbitrary direct effort through the instrumented live request boundary and record App Server acceptance/rejection separately from pass-through. | AutoByteus trims/preserves the value and delegates support authority to App Server. | The upstream outcome for an unadvertised custom string may change and should not be a durable AutoByteus expectation. |
| `UI-SELECTOR-001` | Run focused Nuxt schema/component tests with the updated backend sequence as a temporary fixture if needed. | The generic selector renders every provided value without Codex-specific filtering. | Provider-runtime catalog snapshots do not belong in frontend durable fixtures; generic rendering is already durable. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| A permanently named `gpt-5.6-sol` six-value assertion | Explicitly prohibited by the reviewed coverage guidance because live catalogs change independently. | A snapshot test would become stale and recreate policy drift. | Use dynamic parity; record the observed model/value snapshot only in execution evidence. |
| Browser pixel/layout regression for every agent/team/member surface | No frontend production code changed; all three surfaces share the same generic schema component path. | Low; transport/schema regressions are covered below the visual layer and generic component tests already exercise rendering. | Run focused component tests; escalate only if generic rendering fails. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at investigation time. | N/A | Requirements and reviewed design explicitly decide authority, open-string behavior, malformed behavior, non-invention, `ultra`, and `fast` policy. | N/A |

## Execution Plan

1. Commit this investigation artifact before changing durable coverage.
2. Update the live catalog test to collect raw paginated `model/list` rows and compare each model's trimmed non-empty advertised sequence with mapped catalog and in-process GraphQL `configSchema` sequences. Preserve the separate one-value `fast` service-tier policy assertion.
3. Expand focused bootstrapper/thread coverage for `max`, `ultra`, arbitrary trimmed non-empty input, malformed/unset input, exact `turn/start.effort`, and unchanged `fast` behavior.
4. Update the existing exact Codex team roundtrip scenario to select a live model by advertised `ultra` capability and run with explicit `ultra`, retaining exact communication/tool-trace invariants.
5. Run focused deterministic server and frontend suites, source-only TypeScript, and diff hygiene.
6. Run `RUN_CODEX_E2E=1` live catalog/GraphQL parity and the targeted `ultra` team scenario against installed Codex CLI/App Server. Use temporary instrumented probes for real `max`/`ultra`/custom request evidence when the durable live scenarios do not expose raw request payloads.
7. Remove temporary scaffolding, update one canonical execution coverage report, commit durable coverage/artifacts, and return the cumulative package to `code_reviewer` because repository-resident coverage will change.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: The stale fixed-union assertion is conclusively obsolete and has an approved dynamic replacement. No requirement/design ambiguity or compatibility-retention issue blocks coverage work.
