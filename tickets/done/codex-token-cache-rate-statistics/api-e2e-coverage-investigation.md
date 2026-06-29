# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-token-cache-rate-statistics/tickets/in-progress/codex-token-cache-rate-statistics/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review passed for `codex-token-cache-rate-statistics`; API/E2E coverage investigation and execution requested.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The reviewed package requires forward-correct token accounting for Codex app-server token usage, while preserving valid high prompt-cache rates and keeping frontend accounting presentation-only. The current required behavior is:

- Codex `thread/tokenUsage/updated` payloads with `tokenUsage.total` must be emitted as `usage_scope='cumulative_snapshot'` using cumulative totals as the accounting source after first baseline.
- Codex `tokenUsage.last` must be retained as provider-delta metadata for first-snapshot baseline, validation, and latest prompt/current context metadata.
- Multiple Codex token-usage notifications for one active `turnId` must not overwrite each other; each unique cumulative advancement must be emitted, normalized, and persisted/accounted exactly once.
- Cumulative first snapshots must not charge historical thread totals; later snapshots must use cumulative movement, flag provider-delta mismatches, and include input/cache/output/reasoning deltas in ledger/UI summaries.
- Duplicate/replayed exact cumulative snapshots must not double-count.
- Regressed/malformed/missing cumulative counters must be quality-flagged and must not fabricate cost-affecting fields.
- Claude Agent SDK usage must remain terminal-result `per_turn`; `num_turns > 1` internal SDK tool loops must still produce one app-turn usage event/ledger row, and `usage` vs `modelUsage` divergence must be diagnosable without switching accounting authority.
- Token Meter must render server-accounted run totals, plus latest prompt/current context labels/tooltips, without provider-specific client-side accounting.
- Historical Codex ledger backfill and Claude source-authority changes are explicitly out of scope.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanisms introduced, old Codex turn-id accounting paths removed, and no legacy behavior intentionally retained in changed scope. Source inspection during this investigation found no remaining `pendingTurnTokenUsage`, `readyTurnTokenUsageTurnIds`, `recordTurnTokenUsage`, `getReadyTurnTokenUsages`, or `CodexReadyTurnTokenUsage` in `autobyteus-server-ts/src`.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Codex parser maps `tokenUsage.total` into canonical cumulative snapshot fields | Changed | REQ-003, REQ-005, REQ-007; design `Codex parser output`; implementation handoff `What Changed` | Retain existing parser/unit coverage; execute current parser/queue/backend tests; use executable pipeline probe to confirm normalized deltas and summaries. |
| Codex `tokenUsage.last` is provider-delta metadata and latest prompt source | Changed | REQ-007, REQ-008, REQ-011; design provider-delta metadata | Retain unit coverage and validate first-baseline/latest-prompt behavior via focused tests and temporary pipeline probe. |
| Codex same-turn usage updates no longer wait behind a turn-id overwrite map | Removed/Changed | REQ-005, REQ-006, AC-005; implementation handoff removal check | Retain queue/backend tests; execute deterministic multi-update pipeline probe; attempt live/runtime E2E where practical. |
| Shared cumulative snapshot normalizer first-baselines from provider delta and diffs later snapshots | Added/Changed | REQ-007, REQ-008, AC-004, AC-007, AC-009; design `Snapshot delta normalizer behavior` | Retain normalizer tests; execute tests and a persisted-store pipeline probe. |
| Later cumulative movement larger than provider `last` uses total delta and flags mismatch | Added | AC-004, AC-005; design `Codex later snapshot catch-up` | Retain normalizer mismatch test; execute deterministic probe covering catch-up/mismatch summary math. |
| Duplicate/replayed cumulative snapshots do not double-count | Added/Changed | AC-008; design idempotency notes; code review residual risk | Retain queue idempotency and repository idempotency coverage; execute probe with replay/duplicate snapshot behavior. |
| Regressed/missing cumulative counter safeguards clear cost-affecting fields | Added | AC-009; implementation handoff known risk | Retain normalizer tests and pricing nullability assertion; run focused test suite. |
| Claude terminal-result `per_turn` semantics preserved | Preserved | REQ-013; live Claude experiment summary; design Claude section | Retain Claude unit coverage; run focused test suite; use temporary probe for `num_turns > 1` terminal result if live SDK loop is not rerun. |
| Claude `usage` vs `modelUsage` divergence flag | Added | REQ-014; production sample; implementation handoff | Retain Claude unit coverage; run focused test suite. |
| Token Meter label/copy changed to `Latest prompt` and run-total tooltips | Changed | REQ-011; implementation handoff; code review docs-impact | Retain component/localization tests; run web component test and localization guard. |
| Historical Codex ledger repair/backfill | Preserved out of scope | Requirements Out of Scope; design risks | No coverage required in this stage beyond documenting out-of-scope residual risk. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` / token usage readiness section | Codex thread queues cumulative snapshot usage updates immediately; maps total fields and provider-delta metadata; queues multiple same-turn updates; accepts late updates; flags missing provider delta | REQ-003, REQ-005, REQ-006, REQ-007, REQ-008, AC-004, AC-005, AC-006, AC-007 | Still Valid | Inspected current assertions around `getReadyTokenUsageUpdates`, `usage_scope='cumulative_snapshot'`, `snapshot_series_key`, provider-delta metadata, and multiple same-turn updates | Execute as final focused durable coverage. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts` / token usage dispatch cases | Backend emits normalized `TOKEN_USAGE_UPDATED` events for ready and late Codex usage updates while lifecycle events still dispatch | REQ-005, REQ-006, REQ-015, AC-005, AC-015 | Still Valid | Inspected assertions for `codex_thread_token_usage`, cumulative snapshot payloads, latest prompt, reasoning/cache fields | Execute as final focused durable coverage. |
| `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-snapshot-delta-normalizer.test.ts` | First provider-delta baseline, later cumulative movement/mismatch, restarted previous snapshot lookup, regression clearing, missing series-key clearing | REQ-007, REQ-008, REQ-009, AC-004, AC-007, AC-008, AC-009, AC-010 | Still Valid | Inspected tests for provider-delta baseline, mismatch flag, source-token preservation, regression and pricing nullability | Execute as final focused durable coverage. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-token-usage.test.ts` | Terminal result usage mapping, assistant chunk ignored, thinking detail handling, `usage` vs `modelUsage` mismatch flag, missing-dimension flags | REQ-013, REQ-014, AC-013, AC-014 | Still Valid | Current durable tests protect terminal-result source selection and mismatch flag; live prior probe specifically covered `num_turns=3` | Execute as final focused durable coverage; use temporary executable probe for explicit `num_turns > 1` if live Claude tool-loop is not rerun. |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Token Meter renders `Latest prompt`, run summary metrics, cache/output/thinking/cost details from server summaries | REQ-010, REQ-011, AC-011, AC-015 | Still Valid | Inspected component test includes `Latest prompt`; component code reads summary props and localization only | Execute as final focused durable coverage. |
| `autobyteus-server-ts/tests/unit/agent-execution/events/token-usage-event-enrichment-transformer.test.ts` | Token usage event enrichment converts cumulative snapshots into accounting deltas before pricing | REQ-015, AC-010, AC-015 | Still Valid | Existing test asserts previous-snapshot diff and pricing | Execute if broader unit coverage is needed; temporary pipeline probe will also cover this boundary. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Persisted ledger rows summarize and expose run/team/member token usage through GraphQL, including cache/latest prompt/cost/statistics | REQ-001, REQ-010, REQ-011, AC-001, AC-010, AC-011, AC-015 | Still Valid | E2E uses the real ledger store/schema and validates summary fields downstream of normalized events | Execute as final API/E2E coverage. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` | Provider-specific input/cache semantics and local/unknown rows surface through GraphQL/provider summaries | REQ-001, REQ-002, REQ-004, AC-001, AC-002, AC-010 | Still Valid | E2E validates gross/base cache semantics and cache-rate calculations at API boundary | Execute as final API/E2E coverage. |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Optional real-runtime E2E persists token usage from real Autobyteus/Codex/Claude turns and exposes GraphQL summaries | REQ-003, REQ-005, REQ-013, AC-005, AC-013, AC-015 | Needs Update | After investigation execution began, targeted Claude run failed only because the test expected configured alias `sonnet` as `latestModelIdentifier`; upstream live evidence already says Claude SDK actual model can be `deepseek-v4-flash`, and current behavior should surface the provider/SDK model from the usage payload | Update this durable E2E assertion to compare summaries/statistics to the emitted `TOKEN_USAGE_UPDATED.model_identifier` rather than the launch alias; rerun targeted runtime coverage and route coverage-code change through `code_reviewer`. |
| Ticket scripts under `tickets/in-progress/codex-token-cache-rate-statistics/scripts/*.e2e.test.ts` | Investigation-only live Codex/Claude probes preserved from solution investigation | Investigation evidence, downstream coverage hints | Out Of Scope for durable repo coverage; useful as temporary probe templates | Scripts are not repository-resident durable test suite files and some predate renamed implementation APIs | Do not treat as durable coverage. Add/update only temporary execution scaffolding if needed and record separately. |
| `autobyteus-web/localization/messages/*/shell.ts` plus localization guards | User-facing Token Meter strings are localized and boundary guard passes | REQ-011, AC-011 | Still Valid | Inspected `Latest prompt` and run-total/cache-hit tooltip keys | Execute localization guard. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None found | N/A | Existing relevant durable coverage either targets current behavior or is environment-gated/out of scope rather than stale | Requirements/design preserve direct-delta Claude/native semantics and change only Codex cumulative behavior | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None in round 1 | Existing review-passed implementation already added/updated narrow durable unit/component coverage for changed backend/UI boundaries | Implementation handoff and code review report list and validated those tests | N/A | API/E2E will not add repository-resident durable coverage unless execution exposes a concrete gap. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| DUR-RT-CLAUDE-MODEL-001 | `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Replace the stale summary/statistics model assertion that expects the configured Claude alias with an assertion against the actual `model_identifier` emitted in the `TOKEN_USAGE_UPDATED` payload | REQ-013 and AC-013 require terminal-result/per-turn accounting and persisted ledger summary; upstream investigation notes explicitly observed selected model alias `sonnet` with SDK actual model `deepseek-v4-flash` | Durable coverage update is test-only and required because the environment-gated Claude runtime test otherwise rejects current provider-reported model identity. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-CODEX-PIPELINE-001 | Temporary deterministic TypeScript/Vitest probe under the ticket artifact area that sends Codex-shaped cumulative snapshots through current parser/enrichment/ledger boundaries with a test DB cleanup | First baseline from `last`, later total-delta catch-up/mismatch, duplicate/replay no double count, output/reasoning accumulation, ledger summary totals/cache rate/latest prompt | It is an execution artifact combining existing unit/e2e boundaries for this handoff; durable assertions already live in narrower tests. |
| TEMP-CLAUDE-TERMINAL-001 | Temporary deterministic TypeScript/Vitest probe or focused source-level harness for Claude terminal `result` with `num_turns > 1` and `usage`/`modelUsage` divergence | Claude stays one `per_turn` event and selected usage source remains `usage` while divergence flag is present | Live SDK loops require provider access; durable source test coverage already protects terminal-result and mismatch behavior. |
| TEMP-CODEX-LIVE-OPTIONAL-001 | Updated/adapted ticket live Codex probe if runtime access is available and not overly costly | Real Codex app-server emits `TOKEN_USAGE_UPDATED`/ledger rows for each unique usage update after implementation; no old pending-by-turn overwrite | Live provider behavior is costly/flaky and should remain investigation/execution evidence, not a default durable test. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Historical Codex ledger backfill/repair | Explicitly out of scope in requirements/design | Existing historical rows may remain undercounted | No action for this ticket; document in execution report. |
| Final provider invoice reconciliation | Requirements limited this to Autobyteus accounting of provider/SDK-reported usage | Provider billing could differ from app-server/SDK reports | Follow-up only if product requires invoice reconciliation. |
| Full Token Meter visual/manual browser E2E | UI change is copy/tooltip presentation; component/localization coverage is the durable boundary | Low risk that CSS/browser rendering differs | Component test and localization guard are sufficient unless visual defect appears. |
| All real runtime matrix variants | Environment-gated and not always available locally; task changed Codex/Claude token accounting, not all runtime providers | Lower confidence in unrelated providers | Run targeted runtime E2E if environment supports it; otherwise record skipped environmental scope. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at investigation time | N/A | Upstream requirements/design/code review are consistent; no compatibility-only behavior observed in changed source | N/A |

## Execution Plan

1. Preserve this investigation artifact before final execution or any coverage edits.
2. Run focused durable backend unit coverage for Codex parser/queue/dispatch, snapshot normalizer, and Claude terminal diagnostics.
3. Run focused durable frontend component coverage and localization boundary guard.
4. Run API/E2E ledger GraphQL/provider-semantics coverage for downstream summary/cache/latest-prompt exposure.
5. Run deterministic temporary probes for Codex cumulative-snapshot pipeline/ledger summary and Claude terminal `num_turns > 1` semantics.
6. If the environment is available, run targeted real runtime E2E for Codex and/or Claude token usage; otherwise record it as not tested/environment-gated and rely on deterministic probes plus earlier live evidence.
7. Run source build typecheck and `git diff --check` for execution hygiene.
8. Write one canonical API/E2E execution coverage report with commands, evidence, not-tested areas, and result.
9. If no repository-resident durable coverage was added/updated/removed, hand off to `delivery_engineer`; if durable coverage changes are made, return through `code_reviewer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — update stale environment-gated Claude runtime E2E model-identity assertion discovered during execution
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing narrow unit/component coverage remains current. During optional real-runtime execution, `token-usage-runtime-graphql.e2e.test.ts` exposed a stale Claude model-identity assertion; this investigation is updated before applying the durable coverage correction, and the package must return through `code_reviewer` after execution.
