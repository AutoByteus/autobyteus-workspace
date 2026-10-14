# Solution Handoff — output-tps-precision (SR-006)

- Result: **Architecture Design Complete** (D3.2). It resolves Design Impact CR-F01 from code review CRR-002 (API-L04): a Codex call now ends at `rawResponse/completed`, not at its usage update. Requirements R3 are unchanged in intent; the AC-004/DEC-002 Codex wording is aligned with REQ-003/SCN-002. See `solution-revision-record.md` SR-006. It supersedes the SR-002/D1 and SR-003/D2 handoffs. Both were put on hold before any review result.
- Package: output-tps-precision; current revision SR-006
- task_size: **Large**; architectural_risk: **High**. The metric's authority moves to the runtimes and the run's per-call event, and an optional field is added to two shared stream contracts. About 22 files across four packages. See `design-spec.md` § Task Size And Architectural Risk.
- Route (from `get_handoff_rules`): Large/High → `/software_engineering_team/architecture_reviewer`.
- Approval: requirements **R3** were approved by the **User** in this conversation on 2026-10-14:
  - TPS belongs to the agent run.
  - It is runtime data and is not stored.
  - It is real time, so no reload support.
  - The R1 decisions R3 does not change remain approved by Solution Designer within the direction, user informed.
  - No behavior-defining supplements.

## Original Request (summary)

Project Task `project_task_6e115ebc-5440-40f3-bc93-ac01fbf9cc94` from `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), a follow-up to `token-meter-tps`.

**Problem:**
- Output TPS shows no value for single-call turns.
- On Claude it is a report-interval estimate, not real TPS.

**User direction:**
- TPS as precise as each runtime allows, labelled honestly.
- TPS as an event of the agent run, per model call.
- A simplified card: just "TPS"; no "Selected agent only", timestamp, "Estimated" or "Last reported".
- In conversation: the agent run is the fundamental unit; TPS is runtime data, not stored; TPS is real time, no reload support.

**Constraints:** accounting intact; no extra paid provider calls; reuse exact-run attribution and duplicate handling.

**Done when:**
- Every runtime shows TPS for ordinary generation, including single-call turns, with the most precise method.
- The method is documented in the app and the docs.
- It is verified with real runs where credentials allow (scripted otherwise) plus tests.
- It is released and checked by the user.

## Solution Summary (D3)

- **Per-call measurement and method:** each runtime adapter measures every model call on the server clock, chooses the method under the documented principle and reports `output_throughput { method, output_tokens, duration_ms }`.
- **Acceptance check:** when the run's canonical usage event is created, `acceptModelCallThroughput` (`agent-execution/domain/model-call-throughput.ts`) validates the value and applies the minimum sample, or sets it to null. This happens before, and independent of, accounting, which ignores the field.
- **Delivery:** the existing streams carry the event to the exact run.
- **Display:** the web shows the newest TPS for the selected run, recorded after the seen-key de-duplication. It shows "—" until one arrives, including after a reload.
- **Not added:** server state, persistence or a new API.
- **Methods (DEC-002):**
  - Claude: generation (`message_start` → `message_delta`).
  - Native: generation when reasoning is streamed or absent, otherwise end-to-end.
  - AGY: generation when thinking = 0, otherwise the provider's `duration_seconds`.
  - Codex: end-to-end.
  - Grok/ACP: end-to-end.
- **Minimum sample:** ≥ 20 tokens and ≥ 0.25 s.
- **Card:** "TPS", the value, the model; an "incl. time to first token" note only on end-to-end values; a "How TPS is measured" help.
- **Removed:** the browser pairing estimator.
- **Evidence:** a live Claude single-call probe gave 1,762 tokens / 16.94 s = 104.0 tok/s.

## Artifacts (absolute paths)

- Requirements (R3): `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/investigation-notes.md`
- Design spec (D3): `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/solution-revision-record.md`
- Evidence screenshots: see the requirements doc's Supplemental Artifacts.
- Prior ticket (historical): `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/done/token-meter-tps/`
- Independent review artifacts: N/A — not yet produced (review of D3 is next).
- Product Design artifacts: N/A — not applicable.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision`, branch `codex/output-tps-precision`.
- Base: `origin/personal` @ `1ea74caa2d8e503aa0223c550e22b98f9bb8de08`; finalization target: `origin/personal`.
- The ticket docs are not yet committed.

## Scope

- In: UC-001–004, per the design's Change Scope.
- Out: accounting, persistence, analytics, Settings, TTFT display, history/reload restoration, aggregates, and the unified agent-run data model.

## Follow-ups (recorded; to go to `/project_task_manager` at delivery receipt)

1. A unified, extensible agent-run data model (status, token usage, TPS, future statistics). The user acknowledged it on 2026-10-14.
2. AGY output vs thinking count (RSK-005), if validation shows a gap.
3. Upgrade Codex to generation speed, if validation records an event that marks the start of reasoning (RSK-002).

## Open Risks

- RSK-002 (Codex) and RSK-005 (AGY).
- Grok's first call may include CLI setup time.
- Native providers that hide reasoning without reporting a count would inflate the value.
- The user rejected a live Codex probe during design. Live checks belong to validation, where credentials allow and with the user's consent as applicable.

## Route Record

`get_handoff_rules` (2026-10-14): the Large/High rule matches → `/software_engineering_team/architecture_reviewer`. The earlier SR-002 and SR-003 sends to the same reviewer were put on hold by message, and this package replaces them.

## Next Expected Action

Re-review of D3.2 (the changed Codex section: DS-003 Codex row and Codex pairing rule), then reimplementation of the Codex timing, source review, and an API/E2E rerun of API-L04 (plus the already planned Org desktop selection and DeepSeek native runs).

## SR-006 Delta (for re-review and reimplementation)

- Design Impact CR-F01: the Codex call end is now `rawResponse/completed`. Its `params.usage.outputTokens` is the call's output. The reading is held as pending and attached to the next model-call `thread/tokenUsage/updated` in the same turn, only if `last.outputTokens` matches; otherwise it is null.
- The usage-update arrival time is never a call end.
- Request boundaries add the previous call end, any `item/completed` (any status) and the server's approval replies.
- Evidence: `investigation-notes.md` "SR-006 findings", built from the API/E2E wire logs.
- Code review artifacts: `code-review-report.md`, `code-review-revision-record.md` (CRR-002).
- API/E2E artifacts: `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, `api-e2e-test-case-ledger.md`, `api-e2e-coverage-investigation.md`, `evidence/api-e2e/`.
- Durable test: `autobyteus-server-ts/tests/e2e/runtime/token-meter-tps-live.e2e.test.ts`.
- Prior review: `design-review-report.md` (ARCH-REV-001/002), `architecture-review-revision-record.md`.
- Implementation: `implementation-handoff.md`, `implementation-revision-record.md`.
