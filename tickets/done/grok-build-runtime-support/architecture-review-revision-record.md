# Architecture Review Revision Record — `grok-build-runtime-support`

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete handoff | SR-005, SR-006, SR-007 | N/A | Fail (Design Impact) | AR-001, AR-002, AR-003, AR-004 |
| ARCH-REV-002 | Round 2 / SR-008 revision after ARCH-REV-001 | SR-008 | Fail (Design Impact) | Pass | AR-001..AR-004 resolved; AR-005 new (Low, non-blocking) |
| ARCH-REV-003 | Round 3 / SR-011 revision after code-review failure-origin CRR-002 | SR-009, SR-010, SR-011 | Pass | Pass | AR-005 resolved; AR-006 new (Low, non-blocking) |

## Revision Entries

### ARCH-REV-001 — Initial review of the ACP layer + Grok profile design

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/design-review-report.md`
- Review round and trigger: Round 1. Solution Designer handoff `handoff-architecture-design-complete.md` (SR-007), 2026-09-26.
- Triggering role, report path, and finding IDs: `/solution_designer`; handoff file above; no prior findings.
- Relevant solution revision IDs: SR-005 (approval), SR-006 (DSH wording), SR-007 (design)
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`, classification `Design Impact`
- Baseline established: behavior basis confirmed for BEH-001..BEH-013, REQ-014 and REQ-018. Structure, ownership, AC-016 layering, provider-id binding (ARC-01 verified in `agent-run-manager.ts`), DS-008 state machine and persisted-data decision pass. Two blocking corrections remain:
  - AR-001: the tool restriction must use Grok's documented env switches (`GROK_WORKFLOWS`, `GROK_ASK_USER_QUESTION`) instead of the unverified `_meta.agentProfile`. The step-5 fallback must not ship `workflow` (child agents) enabled.
  - AR-002: per-turn aggregate usage mis-selects the 200k price tier. Records must correspond to single model requests.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (High, blocking), AR-002 (High, blocking), AR-003 (Low), AR-004 (Low)
- Material premises: P-01 Reachable (`workflow` child agents), P-02 Reachable (aggregate tier crossing), P-03 Not Reachable (MCP ready before `session/new` response), P-04 Not Reachable (idle timer during approval), P-05 Unclear (cancelled-turn usage)
- Material classification changes: N/A
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty:
  - The base is 58 commits behind `origin/personal` (`e06080b00`). I found no design-invalidating change; fast-forward before implementation.
  - P-05 (cancelled-turn usage) is Unclear.
  - `session/load` with a non-empty MCP descriptor is not live-probed.

### ARCH-REV-002 — SR-008 resolutions verified; design passes

- Canonical design review report: same path as above (updated to the round-2 result)
- Review round and trigger: Round 2. Solution Designer handoff (SR-008, "Round 2 (SR-008) Summary" in `handoff-architecture-design-complete.md`), 2026-09-26.
- Triggering role, report path, and finding IDs: `/solution_designer`; handoff above; AR-001..AR-004.
- Relevant solution revision IDs: SR-008
- Prior authoritative decision: `Fail` (Design Impact)
- Current authoritative decision: `Pass`
- What changed: all four findings were verified as resolved in the canonical artifacts (not only in the resolution table). The worktree is at `e06080b00`. P-05 is re-classified as Not Reachable under the per-call design. One editorial item, AR-005, was added.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-008; ARC-24; REQ-016, AC-013, DEC-006 | The Grok launch profile env adds `GROK_SUBAGENTS=0`, `GROK_WORKFLOWS=0` and `GROK_ASK_USER_QUESTION=0` (ownership map; the launch-args example). The `session/new` `_meta` is `rules` and `yoloMode` only, and `agentProfile` is listed as an avoided shape. Step 5 is a confirmation with a stop-and-return failure branch, consistent with escalation (a) and AC-013's alternate outcome. The `ask_user_question` basis is stated: Claude precedent (ticket `claude-ask-user-question-disallow` exists) under the user's standing SR-003 direction, reported to the user. Grok docs confirm the `GROK_WORKFLOWS` switch and the 1800 s wait |
| AR-002 | Open (High) | Resolved | SR-008; ARC-20..ARC-23; REQ-011, AC-009 | One `per_call` record per `response_completed`, with `base_excludes_cache`, key `grok_build:<sessionId>:<turnId>:<ordinal>`, model from the session, suppressed during `opening(load)`, and no turn-level record (DS-002/003/008, off-spine row, `AcpExtEffect` interface, usage example, guidance). Tier selection per record is verified against `token-usage-component-basis.ts` (ARC-21). All `response_completed` frames precede the prompt result in the four recorded turns, so turn-scoped application loses nothing |
| AR-003 | Open (Low) | Resolved | SR-008; DS-004; AC-004 | DS-004 projects `request.toolCall` through the same profile projection using `_meta["x.ai/tool"].name`, never `title`; `projectToolCall` covers permission toolCalls; AC-004 names `run_bash` |
| AR-004 | Open (Low) | Resolved | SR-008 | Capabilities read standard fields and `agentInfo` only; the boundary wording is "agent profiles (launch and session)"; the connection buffers frames for unregistered sessions and flushes them on registration; the DSH prompt-delivery limit is recorded as deferral (0) |

- New or remaining finding IDs: AR-005 (Low, non-blocking). Three phrases in `design-spec.md` still say per-turn usage: the BEH-007 map row, the escalation (b) example, and the "usage extraction" terminology.
- Material classification changes: P-05 Unclear → Not Reachable (per-call records capture calls completed before an interrupt; an in-flight aborted call is never reported by Grok, as REQ-011 now states).
- Recommended recipient: `/implementation_engineer` (primary pass handoff); `/solution_designer` (informational).
- Remaining risks or uncertainty:
  - The user's reaction to the `ask_user_question` addition. If they object, it is reopened as a Requirement Gap before implementation.
  - The env-switch effect is confirmed only in step 5.
  - `session/load` with a non-empty MCP descriptor is not live-probed.
  - `_x.ai` extension drift.

### ARCH-REV-003 — SR-011 (CRR-002 follow-up) verified; design still passes

- Canonical design review report: same path (updated to the round-3 result)
- Review round and trigger: Round 3. Solution Designer handoff (SR-011, "Round 3 (SR-011) Summary"), which follows `/code_reviewer` CRR-002 on API/E2E API-REV-001, 2026-09-26.
- Triggering role, report path, and finding IDs: `/solution_designer`; `code-review-report.md` "API/E2E Failure-Origin Review (Round 2, CRR-002)"; CR-002, CR-004, CR-005, CR-006, CR-007.
- Relevant solution revision IDs: SR-009, SR-010, SR-011
- Prior authoritative decision: `Pass` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed:
  - Verified the CR-006 turn-end classification in DS-002 and DS-008 (state-owned, interrupt-first, per-turn user-denial flag, no synthetic prompt; runtime-neutral).
  - Verified the CR-004 factory error conversion (runtime-neutral). Its create path surfaces the provider text at `agent-run-manager.ts:384`; its restore path does not (P-06, AR-006).
  - Verified the CR-002 text sync against the implemented `acp-agent-session-profile.ts` and session states. The turn-terminal ERROR is confirmed as a first-class turn terminal in `agent-run.ts` and `agent-run-error-evidence.ts`.
  - Recorded CR-005 and CR-007 as requirement-authority decisions: the SR-009 user deferral, and the ARC-27 precedent clarification with requirement text unchanged.
  - Verified the AR-005 editorial fix (SR-009).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-005 | Open (Low, editorial) | Resolved | SR-009 | The BEH-007 map row, escalation (b) example and session-profile terminology now describe per-call usage |

- New or remaining finding IDs: AR-006 (Low, non-blocking). DS-001 claims restore shows the provider text. In fact, the shared manager wraps restore failures in the generic `PlatformAgentRunRestoreError` (provider text kept as `cause`), which is existing behavior for all runtimes (REQ-014).
- Material classification changes: P-06 added (Reachable; consequence is text accuracy only).
- Recommended recipient: `/implementation_engineer` (primary pass handoff); `/solution_designer` (informational).
- Remaining risks or uncertainty:
  - STC-002: Grok application launches stay blocked until the user-deferred follow-up ticket.
  - Grok's undocumented auto-allow of some shell commands (ARC-26).
  - CR-006 depends on Grok's `cancelled`-after-reject behavior (ARC-28).
  - The earlier residuals (`ask_user_question` user confirmation, `_x.ai` drift) still apply.
