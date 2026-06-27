# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-review-tool-result-shape/tickets/done/delegate-review-tool-result-shape/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-review-tool-result-shape/tickets/done/delegate-review-tool-result-shape/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-review-tool-result-shape/tickets/done/delegate-review-tool-result-shape/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-review-tool-result-shape/tickets/done/delegate-review-tool-result-shape/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-review-tool-result-shape/tickets/done/delegate-review-tool-result-shape/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-review-tool-result-shape/tickets/done/delegate-review-tool-result-shape/code-review-report.md`
- Current Investigation Round: 2, superseding the earlier task-delegation-specific API/E2E investigation.
- Trigger: Code-review pass for the Round-3 general, source-gated MCP effective-result projector.
- Prior Investigation Reviewed: Yes. The prior API/E2E investigation/report in this canonical path covered the now-superseded task-delegation-specific implementation and is no longer authoritative.
- Latest Authoritative Investigation: Round 2, this file.

## Current Requirement And Design Basis

The reviewed implementation is no longer a task-delegation-only normalizer. The current approved behavior is a general, source-gated MCP effective-result projection boundary for app-facing Codex and Claude lifecycle events. Source-confirmed MCP tool-result envelopes must be projected into useful effective results before Activity/run-history/memory consumers see them, while MCP JSON-RPC/provider protocol envelopes remain unchanged at protocol boundaries.

The projector may only be invoked with explicit MCP source evidence. Exact envelope-shaped values from non-MCP/native/source-unknown lanes must remain unchanged. For source-confirmed MCP envelopes the result contract is deterministic: prefer non-null `structuredContent`; parse single JSON text blocks; return single plain text as text; join multi-text with `\n\n`; represent mixed/rich blocks as sanitized `{ items: [...] }`; return `null` for empty content; omit top-level MCP wrapper fields in successful `payload.result`; and turn `isError: true` into failed lifecycle events with `error` and no successful `result`.

The implementation handoff's `Legacy / Compatibility Removal Check` was read and is clean: no backward-compatibility mechanisms were introduced, old raw-envelope success result behavior is not retained for source-confirmed MCP lanes, the superseded task-delegation-specific source/test files were removed, and changed source files remain below guardrails. Code review round 2 confirmed this and superseded the earlier task-specific review.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| General source-gated MCP effective-result projector under `agent-tools/mcp` | Added | Requirements REQ-001..REQ-008; design source eligibility/projection contract; implementation handoff "What Changed" | Must validate projector rules directly and through Codex/Claude lifecycle conversion. |
| Codex terminal MCP result projection source eligibility | Changed | Design Codex eligibility rules; implementation added `codex-mcp-tool-result-projection.ts` and `codex-terminal-tool-execution-event.ts` | Must verify MCP item-family/wire-name results project while non-MCP dynamic results stay raw. |
| Claude completed-command MCP result projection source eligibility | Changed | Design Claude eligibility rules; implementation handoff | Must verify raw MCP wire names/explicit markers project while non-MCP envelope-shaped results stay raw. |
| `isError: true` source-confirmed MCP result handling | Changed | Requirements REQ-007/REQ-008; design error contract | Must verify failed lifecycle events have `error` and no successful `result`, and memory/run-history record failure rather than success result. |
| Raw top-level MCP wrapper fields as normal successful Activity `result` | Removed for source-confirmed MCP lanes | Legacy removal policy; code review legacy verdict | Must assert successful projected results do not expose `content`, `structuredContent`, `_meta`, or `isError`. |
| Exact envelope-shaped non-MCP/native/source-unknown results | Preserved | REQ-002/AC-007; design source-gating contract | Must verify no false-positive projection. |
| Browser/media display behavior after generic projection | Preserved | REQ-009; implementation applies existing browser/media normalizers after projection | Existing and targeted tests/probes must cover browser/media envelope results. |
| MCP JSON-RPC/provider protocol envelopes | Preserved | Out-of-scope/constraints; implementation did not change MCP result mapper | No test should expect protocol route to drop `content`; route/gateway coverage remains valid but not source-changed. |
| Tracked docs edits from previous task-specific delivery pass | Stale for delivery, not implementation behavior | Code review docs-impact verdict | API/E2E should not edit docs; delivery must reconcile against general projector behavior. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/mcp-effective-tool-result-projector.test.ts` | Directly verifies general MCP wire-name/source helpers; malformed envelope unmatched; structuredContent precedence; single JSON/plain text; multi-text join; rich content sanitization; empty content; deterministic `isError` error extraction. | REQ-003..REQ-008; AC-002..AC-006, AC-008; design DS-003 | Still Valid | Source inspection confirms this is the owning MCP projector seam for the superseding implementation. | Retain and run in final targeted regression. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` general MCP additions | Verifies Codex source-confirmed task-delegation and generic MCP JSON/text/structured/multi/rich/error projection, plus non-MCP exact-envelope no-op. | REQ-001, REQ-002, REQ-006, REQ-007; AC-001..AC-008 | Still Valid | Test invokes real `CodexThreadEventConverter` and covers app lifecycle event shapes. | Retain and run in final targeted regression. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/events/codex-thread-event-converter.test.ts` existing browser/Agent Tools MCP scenarios | Verifies browser output normalization, Agent Tools canonical names, failure events, and redaction behavior around the same terminal converter. | REQ-009 and source-eligibility preservation | Still Valid | Existing scenarios guard browser/media-adjacent and Agent Tools behavior after Codex helper extraction. | Retain and run in targeted suite. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts` general MCP additions | Verifies Claude task-delegation and generic MCP JSON/text/structured/multi/rich/error projection, plus non-MCP exact-envelope no-op. | REQ-001, REQ-002, REQ-007; AC-007..AC-009 | Still Valid | Test invokes real `ClaudeSessionEventConverter` completed-command boundary. | Retain and run in final targeted regression. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts` browser/media scenarios | Verifies existing browser and media results remain canonical after generic projection. | REQ-009 | Still Valid | Same suite contains browser content-block/content-envelope and media envelope coverage. | Retain and run in targeted suite. |
| `autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` | GraphQL `getRunProjection` exposes persisted tool results to conversation/activity surfaces. | Activity/run-history/memory surface validation after lifecycle projection | Still Valid | This test is not MCP-specific but proves API projection surfaces use recorded lifecycle result values. | Run as API/E2E projection evidence. |
| `autobyteus-server-ts/tests/integration/run-history/codex-mcp-tool-args-projection.integration.test.ts` | Runtime memory accumulator persists tool call/result traces and projects them to conversation/activity surfaces. | Memory/run-history evidence for lifecycle result propagation | Still Valid | It validates lower-level memory/projection behavior used by temporary probes. | Run as executable evidence. |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Live mixed-runtime delegate/submit/review lifecycle through WebSocket/GraphQL. | Original task-delegation flow context | Still Valid for live lifecycle, not sufficient for general projector contract | Gated by live Codex/runtime/model environment and does not cover all generic projection shapes. | Do not edit or require for final evidence; use deterministic surface probes instead. |
| `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | MCP route/protocol envelopes preserve `content`/`structuredContent`/`isError` behavior. | Protocol-boundary preservation | Still Valid | Implementation intentionally does not change the MCP protocol result mapper. | Not required in final targeted execution unless protocol regression is suspected. |
| Previous `api-e2e-coverage-investigation.md` / `api-e2e-execution-coverage-report.md` | Earlier task-specific API/E2E decision/evidence. | Superseded by current requirements/design/code review | Replace | Current code review states old task-specific artifacts may remain and must not be relied on. | Overwrite canonical artifacts with this superseding round. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Previous API/E2E artifacts at `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` | Task-delegation-specific projector was final behavior. | Round-3 implementation supersedes task-specific approach with a general MCP projector. | Code review round 2 and implementation handoff. | This fresh investigation and execution report. | N/A |
| Repository source/test files for task-delegation-only normalizer | N/A in current tree | These files are already absent/removed by implementation. | Implementation handoff and code review dead-code check. | General MCP projector/source/converter tests. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | The reviewed implementation already added durable coverage at the owning projector and Codex/Claude converter seams before code review. No new repository-resident durable coverage is planned in this API/E2E round. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | No durable coverage update planned. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-SURFACE-001 | Temporary Vitest probe under `autobyteus-server-ts/tests/.tmp/` composing Codex/Claude converters, `AgentRunEventMessageMapper`, `RuntimeMemoryEventAccumulator`, raw-trace replay, and run-history projection. | Activity-stream payloads, memory traces, and run-history activities carry effective MCP results and failures rather than raw envelopes. | It composes already-covered seams for task evidence; retaining it would duplicate durable converter/projector/projection tests. |
| TEMP-GENERAL-001 | Same probe with source-confirmed JSON, plain text, structuredContent, multi-text, rich/mixed, empty content, and `isError: true` examples. | Generic deterministic projection rules hold across app-facing surfaces, not just unit return values. | Durable projector/converter tests already cover each rule; temporary probe provides end-to-end executable evidence without broad durable test bloat. |
| TEMP-TASK-001 | Same probe with `delegate_task`, `submit_task_result`, and `review_task_result` source-confirmed MCP envelopes. | Original task-delegation Activity result problem is fixed by the general projector. | Durable converter tests cover delegate/review; temporary probe can include all three task tools for evidence without adding permanent test file. |
| TEMP-NOFP-001 | Same probe with exact envelope-shaped non-MCP/native/source-unknown results. | Source gating prevents false-positive projection. | Durable converter tests already cover no-op; temporary probe confirms Activity/memory surfaces preserve raw domain values. |
| TEMP-BROWSER-MEDIA-001 | Same probe or targeted converter checks for browser/media envelopes. | Existing browser/media display remains valid after generic projection. | Existing durable tests cover this; temporary probe is execution evidence only. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full live Codex and Claude model-driven sessions for every projection variant | Requires live provider/runtime/model setup and controlled tool outputs for many envelope variants. The changed behavior is deterministic provider-event projection. | Medium residual provider-shape risk if providers introduce unrepresented MCP source markers. | No reroute; recorded residual. Add live provider certification later if product requires it. |
| Final visual rendering for rich/multimodal `{ items: [...] }` | Explicitly deferred by design; current requirement is deterministic app-facing result shape, not rich UI rendering. | Low for backend projection; UI may improve later. | Future UI requirement if needed. |
| Docs reconciliation | Delivery-owned; current docs edits are known stale/superseded. | Docs could be wrong if not reconciled. | Delivery engineer must update/no-impact docs assessment after API/E2E. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No API/E2E-blocking ambiguity or invalid compatibility behavior identified during investigation. | N/A |

## Execution Plan

1. Run the reviewed targeted durable regression suite for the MCP projector plus Codex/Claude converter tests.
2. Run run-history/memory projection tests that prove lifecycle tool results reach API/activity projection surfaces.
3. Create and run a temporary Vitest probe under `autobyteus-server-ts/tests/.tmp/` that composes converter output through streaming message mapping, runtime memory, raw-trace replay, and run-history activity projection for generic MCP result shapes, task-delegation tools, no-false-positive non-MCP values, browser/media preservation, and `isError` failure behavior.
4. Remove the temporary probe file afterward and verify cleanup.
5. Run source build/type evidence with Prisma generation and `tsconfig.build.json`, plus `git diff --check`. Treat full `pnpm run typecheck` as already blocked by the captured existing TS6059 configuration log unless a new reason emerges.
6. Write the superseding execution coverage report to the canonical task artifact path.
7. If no repository-resident durable coverage was added/updated/removed in this API/E2E round, hand off to `delivery_engineer`; otherwise return through `code_reviewer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: The fresh superseding investigation replaces the earlier task-specific API/E2E artifact. Existing durable coverage is valid for the reviewed general projector; temporary executable probes will provide broader surface evidence without adding repository-resident coverage after code review.
