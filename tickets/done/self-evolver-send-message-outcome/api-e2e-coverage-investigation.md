# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/self-evolver-send-message-outcome/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/self-evolver-send-message-outcome/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/self-evolver-send-message-outcome/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/self-evolver-send-message-outcome/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/self-evolver-send-message-outcome/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/self-evolver-send-message-outcome/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review Round 2 passed and requested API/E2E coverage investigation/execution for the self-evolver target-facing `skill_update` contract.
- Prior Investigation Reviewed: N/A — first API/E2E coverage investigation for this implementation.
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior is a narrow target-facing contract cleanup for the existing self-evolution direct-message return path. The global `send_message_to(target_agent_run_id=...)` architecture remains unchanged. The self-evolver helper must be granted and instructed to send at most one direct target-run message with exact `message_type: "skill_update"`, only after meaningful durable skill package file changes. The helper content must be target-facing and explain what durable guidance changed, why it matters, and how the target should use or reload the updated guidance, while avoiding raw traces, secrets, private data, one-off paths, and transient task details. `reference_files` must be selected dynamically as absolute paths for changed or directly relevant surviving files inside editable skill roots, including supporting files when relevant; deleted files must be described in content rather than referenced. If no durable skill package file changes were made, the helper must not send a target direct message. The router/grant path must reject wrong targets, stale old message types, outside-root references, duplicate sends, and inactive targets. No new notification service, inactive-run queue, duplicate system notification, automatic runtime reload, or backward-compatible dual old/new message type is in scope.

Implementation-handoff legacy/compatibility review was clean: no backward-compatibility mechanisms were introduced, no dual `self_evolution_outcome`/`skill_update` target-facing contract was retained, stale metadata/prompt/grant/docs/tests contract references were removed, and shared structures remain narrow.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Self-evolver target-facing direct message type is `skill_update` | Changed | REQ-001, design DS-002, implementation handoff "What Changed" | Execute existing strategy and router grant tests; rerun stale-string cleanup search. |
| Self-evolver grant allows only one `skill_update` to the original active target run | Changed | REQ-002, AC-003, design direct-message grant rules | Execute strategy grant-registration test and router grant enforcement tests. |
| Helper prompt and built-in helper instruction send only after meaningful durable skill package file changes | Changed | REQ-003/REQ-004, design DS-003, CR-001 resolution | Execute strategy prompt/no-op summary test; static inspect built-in helper template via source search. |
| Dynamic absolute `reference_files` from changed/directly relevant surviving files inside editable roots, including supporting files | Changed | REQ-005, AC-004, design examples, CR-001 resolution | Execute strategy prompt guidance test and router root-enforcement tests; no new durable coverage needed because existing tests cover prompt guidance plus generic root enforcement. |
| Target-facing content includes what changed, why it matters, how to use/reload, and privacy constraints | Changed | REQ-006, CR-001 resolution | Execute strategy prompt guidance test; static source search of template/docs. |
| Existing global exact-run `send_message_to` dispatcher/router and direct runtime event path | Preserved | REQ-007, design reuse decision | Execute router unit tests and existing guarded Codex E2E file in default environment; live Codex E2E opt-in is not required for this prompt/grant cleanup. |
| Duplicate notification/reload architecture not added | Preserved/Removed candidate rejected | Out of scope, design backward-compatibility rejection log, implementation handoff | Execute self-evolution record lifecycle/service tests to verify helper-authored summaries suppress duplicate notification. |
| Old `self_evolution_outcome` target-facing contract and `self_evolution_outcome_message_type` metadata key | Removed | REQ-008, AC-001, legacy policy | Rerun static cleanup search under server/web source/docs/tests. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/self-evolution/single-agent-evolver-strategy.test.ts` | Launches visible helper with auto-executed tools, exact editable roots, `skill_update` grant, target metadata, what/why/use-or-reload guidance, privacy guidance, dynamic absolute `reference_files`, deleted-file exclusion, no-op no-send guidance, and absence of stale old contract. | REQ-001 through REQ-006, AC-002, AC-004, DS-001/DS-003 | Still Valid | Directly asserts the strategy prompt/grant/metadata contract introduced by this ticket. | Execute in final suite. |
| `autobyteus-server-ts/tests/unit/agent-communication/global-agent-run-message-router.test.ts` | Delivers direct exact-run messages without Team Communication projection; enforces self-evolver-style grant target/type/reference/count restrictions; rejects constructed old message type; records inactive target usage. | REQ-002, REQ-007, UC-004, AC-003, DS-002/DS-004 | Still Valid | Covers the unchanged router/grant boundary that must enforce the new self-evolver message contract. | Execute in final suite. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-service.integration.test.ts` | Records self-evolution provenance, skill targets, helper-authored notification summaries, stale target rejection before helper launch, and non-completed helper behavior without metric/notification side effects. | REQ-004, REQ-007, no duplicate notification architecture, DS-001/DS-004 | Still Valid | The sample message text uses generic record-summary wording, not the target-facing message-type contract; record schema/copy is explicitly out of scope. | Execute in final suite. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-record-lifecycle.test.ts` | Uses helper-authored `send_message_to` summary and does not send duplicate generic notification. | REQ-007, out-of-scope duplicate notification rejection | Still Valid | Confirms existing record lifecycle still suppresses fallback notification when the helper summary exists. | Execute in final suite. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-target-notification-service.test.ts` | Covers existing runtime-neutral fallback local notification service for active idle runs without exposing private paths. | Out-of-scope fallback behavior; no new notification path | Still Valid | The fallback service remains out of scope but must not be expanded into a duplicate self-evolver target message path by this change. | Execute as adjacent regression in final suite. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-graphql-resolver.test.ts` | Verifies GraphQL self-evolution API fields, strategy placeholders, and disabled capability gate. | API boundary preserved, REQ-007 | Still Valid | Public API shape is unchanged but must remain intact. | Execute in final suite. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-graphql-converters.test.ts` | Preserves omitted-vs-clear run launch input converter behavior. | Existing self-evolution API boundary | Still Valid | Adjacent API input behavior remains valid and unchanged. | Execute in final suite. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-effective-config-resolver.test.ts` | Resolves standalone/team member self-evolution runtime/model/config precedence. | Existing helper launch configuration | Still Valid | Strategy still uses the resolver before helper launch; no contract drift. | Execute in final suite. |
| `autobyteus-server-ts/tests/self-evolution/manual-trigger-strategy.test.ts` | Creates canonical manual self-evolution requests and keeps future trigger strategies non-executable. | Existing manual trigger boundary | Still Valid | Manual start is still the only executable trigger in scope. | Execute in final suite. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-work-history-projector.test.ts` | Renders anonymized evidence and classifies explicit durable skill update directives. | REQ-003/REQ-006 privacy and durable correction basis | Still Valid | The helper prompt consumes anonymized work history; this coverage remains relevant. | Execute in final suite. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/send-message-to-tool-argument-parser.test.ts` | Validates `send_message_to` selector shape and rejects malformed/non-absolute `reference_files`. | REQ-005, REQ-007, public tool contract | Still Valid | Exact selector and absolute reference-file validation are preconditions for the unchanged route. | Execute in final suite. |
| `autobyteus-server-ts/tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts` | Existing opt-in live Codex E2E proves real standalone Codex sender can call `send_message_to` by exact active run id and receives inactive-target failure after termination. | REQ-007 direct exact-run route | Still Valid, guarded optional execution | The file is skipped unless `RUN_CODEX_E2E=1`; this ticket does not change Codex runtime tool plumbing, so default guarded execution is sufficient evidence alongside deterministic router tests. | Run in default environment and record skipped status. Do not force live LLM opt-in for this narrow prompt/grant cleanup. |
| Server/web docs under `autobyteus-server-ts/docs/modules/*` and `autobyteus-web/docs/*` | Document `skill_update`, durable-change-only sends, dynamic references, and no automatic reload/duplicate notification architecture. | REQ-008, AC-006 | Still Valid (documentation, not executable coverage) | Source review confirms docs were updated; final static search will detect stale exact old contract in source/docs/tests scope. | Rerun static cleanup search. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None found in current relevant durable coverage. | N/A | Existing implementation-owned tests were already updated before code-review Round 2. | Code review Round 2 cleanup search and source inspection. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None. | Existing durable coverage now covers the required self-evolver prompt/grant/router/API boundaries for this small contract cleanup. | Code review Round 2 and inventory above. | N/A | Adding new repository-resident coverage would duplicate existing focused assertions rather than cover a missing boundary. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None. | N/A | N/A | N/A | Existing tests are valid after implementation/code-review updates. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None. | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| APIE2E-001 | Run focused self-evolution tests plus router/parser unit tests with generated Prisma client/shared builds. | Strategy, API boundary, service integration, record lifecycle, grant/router enforcement, and public tool input validation remain executable. | Uses existing durable coverage; no temporary source files needed. |
| APIE2E-002 | Run guarded Codex exact-run direct-routing E2E file in default environment. | Existing live E2E guard remains healthy; if `RUN_CODEX_E2E` is unset the scenario is explicitly skipped. | Existing optional E2E is already durable; forcing live LLM opt-in is not required for this ticket. |
| APIE2E-003 | Rerun static cleanup search for `self_evolution_outcome|self_evolution_outcome_message_type` under server/web source/docs/tests excluding generated folders. | No stale old target-facing direct-message contract remains in production/docs/tests scope. | Static command evidence, not a new durable test. |
| APIE2E-004 | Rerun TypeScript build typecheck and `git diff --check`. | Changed source/tests/docs remain type-safe and whitespace-clean. | Existing project executable checks. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| A real LLM-driven self-evolver modifying an actual skill package and deciding semantically whether to send `skill_update`. | The decision is intentionally prompt-guided and nondeterministic; existing deterministic coverage verifies the exact prompt/grant/router constraints, and live Codex E2E is generic/opt-in. | Low for this contract cleanup; residual risk is already accepted in design/code review. | No escalation. A future product requirement for audited file-change detection or automatic reload would need a new design. |
| Automatic runtime skill reload after target receives `skill_update`. | Explicitly out of scope. | None for this ticket. | No follow-up required unless user requests that larger feature. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None. | N/A | Upstream artifacts and code review Round 2 are aligned; legacy/compatibility check is clean. | N/A |

## Execution Plan

1. Generate/refresh prerequisites needed by the fresh worktree: `pnpm -C autobyteus-server-ts run prepare:shared` and `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` if needed.
2. Execute the current valid focused durable coverage: all `tests/self-evolution/*.test.ts` / `*.integration.test.ts`, `tests/unit/agent-communication/global-agent-run-message-router.test.ts`, and `tests/unit/agent-team-execution/send-message-to-tool-argument-parser.test.ts`.
3. Execute the guarded existing Codex exact-run global-routing E2E file in the default environment and record whether it runs or skips.
4. Run `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`.
5. Run cleanup/static checks: `git diff --check` and `rg -n "self_evolution_outcome|self_evolution_outcome_message_type" autobyteus-server-ts autobyteus-web -g '!node_modules' -g '!dist' -g '!coverage'`, expecting no matches.
6. Write the execution coverage report with pass/fail/skipped evidence and route according to whether repository-resident durable coverage changed.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing durable coverage is valid and sufficient for this narrow contract cleanup. No stale coverage removal or new durable coverage edit is planned. If execution uncovers a coverage validity change, this investigation will be updated before further action.
