# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative. This record holds the initial baseline and each later review delta.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / `Architecture Design Complete` (Large, High) | SR-001, SR-002, SR-003 | N/A | Fail | ARCH-001, ARCH-002, ARCH-003 |
| ARCH-REV-002 | Round 2 / re-review after SR-004 | SR-004 | Fail | Pass | ARCH-001, ARCH-002, ARCH-003 resolved |
| ARCH-REV-003 | Round 3 / SR-007 after CRR-003 / API-REV-001 | SR-005, SR-006, SR-007 | Pass | Pass | ARCH-004 new (Low, non-blocking) |
| ARCH-REV-004 | Round 4 / SR-008 after CRR-005 / API-REV-002 | SR-008 | Pass | Fail | ARCH-004 resolved; ARCH-005, ARCH-006 new |
| ARCH-REV-005 | Round 5 / re-review after SR-009 | SR-009 | Fail | Pass | ARCH-005, ARCH-006 resolved |
| ARCH-REV-006 | Round 6 / SR-010 after CRR-006 CR-004 | SR-010 | Pass | Pass | None (no open findings) |
| ARCH-REV-007 | Round 7 / SR-011 after CRR-008 / API-REV-003 | SR-011 | Pass | Pass | ARCH-007 new (Low, non-blocking) |
| ARCH-REV-008 | Round 8 / SR-012 after CRR-010 / API-REV-004 | SR-012 | Pass | Pass | None new; ARCH-007 still open (non-blocking) |

## Revision Entries

### ARCH-REV-001 — Initial review: port architecture sound; compaction conversation identity, requirements consistency and attempt semantics need rework

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-review-report.md`
- Review round and trigger: Round 1; `Architecture Design Complete` from `/software_engineering_team/solution_designer` (`solution-handoff.md`, 2026-10-09).
- Triggering role, report path, and finding IDs: Solution Designer; `solution-handoff.md`; N/A (initial review).
- Relevant solution revision IDs: SR-001, SR-002, SR-003
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: established the baseline.
  - Confirmed:
    - core-owned `CompactionSummarizer` behind an agent-implemented `ConversationSummaryPort`;
    - the guard before and after compaction (preserved-thinking safe);
    - per-attempt compaction metering;
    - end-to-end setting removal with an inert leftover key;
    - ASM-001 (agent LLM idle at both sites);
    - no compaction callers outside `LlmPhase` and the assembler.
  - Found:
    - an undefined provider conversation identity and lifecycle for compaction requests (the AutoByteus RPA session would be corrupted; remote sessions leak);
    - the requirements doc contradicting REQ-005;
    - the attempt budget silently changed by dropping `single_attempt`.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: ARCH-001 (High, blocking), ARCH-002 (Medium, blocking; editorial Requirement Gap), ARCH-003 (Low-Medium, blocking).
- Material classification changes: N/A (baseline). Premises: P-001 `Reachable`, P-002 `Reachable`.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - non-Anthropic instruction following;
  - large-context budget (include the output reservation);
  - server projection of the new ingestion kind;
  - overlap growth.

### ARCH-REV-002 — Re-review after SR-004: compaction conversation isolation, requirements alignment and single-attempt semantics resolved; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-review-report.md`
- Review round and trigger: Round 2; re-review request from `/software_engineering_team/solution_designer` (SR-004).
- Triggering role, report path, and finding IDs: Solution Designer; `solution-revision-record.md` § SR-004; ARCH-001..003.
- Relevant solution revision IDs: SR-004
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - Compaction-scoped conversation ids per attempt, plus a new provider-neutral `BaseLLM.releaseConversation` (default no-op; `AutobyteusLLM` override). AC-009 added.
  - Requirements aligned with REQ-005.
  - `retryMode: 'single_attempt'` on both port requests; the attempt budget is stated in REQ-004.
  - The budget check includes the output reservation.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-001 | Open (High, blocking) | Resolved | SR-004; BEH-001 preserved column; AC-009 | design-spec Intended Change 5, the port and `releaseConversation` interface rows, examples, the AC-009 tests; `AutobyteusClient.cleanup(id)` exists; `logicalConversationId` is filtered for API providers |
| ARCH-002 | Open (Medium, blocking) | Resolved | SR-004 | BEH-002, UC-001, REQ-001, AC-001 and SCN-002 corrected; REQ-004 trace fixed; investigation-notes header SR-004. Only DEC-001's historical option text remains (non-governing) |
| ARCH-003 | Open (Low-Medium, blocking) | Resolved | SR-004; REQ-004 | Intended Change 6, examples, port tests |

- New or remaining finding IDs: none.
- Implementation note N-1 (non-blocking): run the release in a `finally` with its own bounded controller, not the possibly aborted operation signal, and test the abort case.
- Material classification changes: none.
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary pass); `/software_engineering_team/solution_designer` (informational).
- Remaining risks or uncertainty:
  - non-Anthropic instruction following;
  - server projection of the new ingestion kind;
  - summary/tail overlap;
  - no cache benefit on AutoByteus RPA (accepted).

### ARCH-REV-003 — SR-007 reviewed (Gemini system-prompt source, nine-heading contract, cost correction); Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-review-report.md`
- Review round and trigger: Round 3. The Solution Designer requested a review of SR-007 after CRR-003 (failure-origin review of API-REV-001); implementation is paused at `8d0a98eb5`.
- Triggering role, report path, and finding IDs: Solution Designer; `solution-revision-record.md` § SR-007; CRR-003 F-1, F-2, OBS-1, CR-002 (`code-review-report.md` § Round 3); `ac003-summary-quality-report.md`.
- Relevant solution revision IDs: SR-005, SR-006, SR-007
- Prior authoritative decision: `Pass` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - Reviewed REQ-008 / Intended Change 9 (Gemini `systemInstruction` from the leading SYSTEM messages).
  - Reviewed REQ-003 / Intended Change 8 (one nine-heading contract, verbatim normative texts from the approved supplement).
  - Reviewed AC-003/AC-010, the cost correction and OBS-1.
  - Verified that normal Gemini requests keep the same text (the bootstrap prompt equals the leading SYSTEM message).
  - Verified that the adapter inventory holds, including Grok.
  - Verified that stored six-heading summaries are never re-parsed, so the format change needs no transition.

#### Prior Finding Resolution

None open. ARCH-001..003 were resolved in ARCH-REV-002 and remain resolved; SR-007 does not touch them.

- New or remaining finding IDs: ARCH-004 (Low, non-blocking, editorial):
  - stale Out Of Scope bullet and BEH-001 preserved wording on the summary format;
  - REQ-003's "draft v4";
  - "whole conversation / first user message" needs to be scoped to the cached path;
  - the persisted-data section should state why the format change needs no transition.
- Material classification changes: none.
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary pass); `/software_engineering_team/solution_designer` (informational).
- Remaining risks or uncertainty:
  - OBS-1 (accepted);
  - cost parity varies by history (accepted);
  - Gemini late notes (pre-existing);
  - N-1 still applies.

### ARCH-REV-004 — SR-008 reviewed: per-model mode sound; output-limit floor blocks local models; normative instruction version inconsistent; Fail

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-review-report.md`
- Review round and trigger: Round 4. The Solution Designer requested a review of SR-008 after CRR-005 (failure-origin review of API-REV-002); implementation is paused at `1153984ee`.
- Triggering role, report path, and finding IDs: Solution Designer; `solution-revision-record.md` § SR-008; CRR-005 F-3, F-4, F-5 (`code-review-report.md` § Round 5).
- Relevant solution revision IDs: SR-008
- Prior authoritative decision: `Pass` (ARCH-REV-003)
- Current authoritative decision: `Fail`
- What changed in the review result:
  - Accepted:
    - per-model `compactionSummaryMode` (catalog-owned, default `transcript`, port `usesCachedSummary()`, no provider names in memory or agent);
    - `LLMInvocationOptions.maxOutputTokens` through the shared `resolveMaxOutputTokens(options)`;
    - `max_tokens` changes neither the cached prefix nor the thinking config.
  - Found:
    - The floor formula sends and reserves 16,384 tokens for models without known output metadata (Ollama, LM Studio), which can make compaction impossible (P-003, Reachable).
    - `agentLimit` is undefined (P-004, Unclear).
    - The normative cached-instruction version conflicts across the supplement, the requirements and the design.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-004 | Open (Low, non-blocking) | Resolved | SR-008 | Out Of Scope now names the approved format change; REQ-003 scopes "whole conversation" to the cached summary; design § Persisted Data states why stored summaries need no transition. The version label is superseded by ARCH-006 |

- New or remaining finding IDs: ARCH-005 (High, blocking, Design Impact), ARCH-006 (Medium, blocking, editorial Requirement Gap).
- Material classification changes: none. Premises: P-003 `Reachable`, P-004 `Unclear`.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - the DeepSeek catalog value depends on the rerun;
  - N-1 still applies;
  - the follow-up Task covers per-model strategies.

### ARCH-REV-005 — Re-review after SR-009: precise output-limit rule and single normative v5; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-review-report.md`
- Review round and trigger: Round 5; re-review request from `/software_engineering_team/solution_designer` (SR-009). Implementation is paused at `1153984ee`.
- Triggering role, report path, and finding IDs: Solution Designer; `solution-revision-record.md` § SR-009; ARCH-005, ARCH-006.
- Relevant solution revision IDs: SR-009
- Prior authoritative decision: `Fail` (ARCH-REV-004)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - REQ-009 / Intended Change 11 is now a precise rule owned by `LlmPhaseSummaryPort`. R is the resolved agent limit. When R is null or ≥ 16,384 there is no override. Otherwise L = max(R, min(16,384, model max, ⌊context ÷ 4⌋)), and the reservation equals L only when overriding.
  - Eight worked examples are required as unit cases by AC-011.
  - v5 is the single normative instruction in the supplement header, REQ-003, Document Status and the design.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-005 | Open (High, blocking) | Resolved | SR-009; REQ-009; AC-011; design Intended Change 11 | Ollama rows: no limit → unchanged; 1,024 at 8k → 2,048; at 32k → 8,192. Opus 1,024 → 16,384; Opus with no limit → none. Budget-thinking rows valid. `agentLimit` is defined as the resolved R |
| ARCH-006 | Open (Medium, blocking) | Resolved | SR-009; REQ-003; Document Status | Supplement lines 1–9 name exactly two normative blocks (v5 at line 164, v6 at line 87); v4 and the proposal are headed "History"; REQ-003 says "v5, normative; v4 is history" |

- New or remaining finding IDs: none.
- Material classification changes: P-003 handled; P-004 resolved by definition.
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary pass); `/software_engineering_team/solution_designer` (informational).
- Remaining risks or uncertainty:
  - the DeepSeek value depends on the rerun (failure routes back);
  - N-1;
  - the follow-up Task.

### ARCH-REV-006 — SR-010 reviewed: summary output limit fitted to the remaining room; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-review-report.md`
- Review round and trigger: Round 6; SR-010 after CRR-006 CR-004 (code review of IR-004 `13648b147`).
- Triggering role, report path, and finding IDs: Solution Designer; `solution-revision-record.md` § SR-010; CR-004 (`code-review-report.md` § Round 6).
- Relevant solution revision IDs: SR-010
- Prior authoritative decision: `Pass` (ARCH-REV-005)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - Each summary request sends `L_eff = max(R, min(L, context − E − margin))`.
  - Both paths accept inputs with the agent's own input budget; the "reserve L" budget is removed.
  - Verified invariants: input + output ≤ context − margin; never less input or output than today; the cached path keeps cache reuse at the boundary.
  - Every boundary-table row was recomputed and matches.
  - No interface change.

#### Prior Finding Resolution

None open. ARCH-001..006 remain resolved. CR-004 is a code-review finding, resolved by SR-010 at the design level.

- New or remaining finding IDs: none.
- Implementation note N-2: compute E with the same estimator and request contents as the corresponding input-budget check.
- Material classification changes: P-005 (CR-004) `Reachable` and handled.
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary pass); `/software_engineering_team/solution_designer` (informational).
- Remaining risks or uncertainty:
  - API/E2E-owned open items (CR-001/C-020, CR-003, DeepSeek rerun, AC-010, AC-011 live);
  - N-1;
  - the follow-up Task.

### ARCH-REV-007 — SR-011 reviewed: unwrapped summary accepted, cached models final; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-review-report.md`
- Review round and trigger: Round 7; SR-011 after CRR-008 / API-REV-003 (F-6, F-7, F-8; implementation at `97fd9a814`).
- Triggering role, report path, and finding IDs: Solution Designer; `solution-revision-record.md` § SR-011; F-6, F-7, F-8 (`code-review-report.md` § Round 8).
- Relevant solution revision IDs: SR-011
- Prior authoritative decision: `Pass` (ARCH-REV-006)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - Verified that the unwrapped-reply acceptance reuses the unchanged strict validator, that all marker cases behave as today, and that tool-call and incomplete replies are still rejected before parsing.
  - The DeepSeek and Anthropic modes are final and Gemini stays `transcript`; these are user-delegated.
  - No interface, ownership or persistence change.

#### Prior Finding Resolution

None open. ARCH-001..006 remain resolved.

- New or remaining finding IDs: ARCH-007 (Low, non-blocking, editorial): the REQ-002 rationale "never worse" does not reflect the accepted DeepSeek gap-A trade-off.
- Material classification changes: none. Residual N-3 (truncation detection for unwrapped replies on `'unknown'`-status providers) is `Unclear` and non-blocking.
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary pass); `/software_engineering_team/solution_designer` (informational).
- Remaining risks or uncertainty:
  - N-1, N-2, N-3;
  - API/E2E-owned items;
  - the follow-up Task.

### ARCH-REV-008 — SR-012 reviewed: explained empty section accepted; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse/tickets/in-progress/compaction-prompt-cache-reuse/design-review-report.md`
- Review round and trigger: Round 8; SR-012 after CRR-010 / API-REV-004 (F-9; implementation at `090353579`).
- Triggering role, report path, and finding IDs: Solution Designer; `solution-revision-record.md` § SR-012; F-9 (`code-review-report.md`).
- Relevant solution revision IDs: SR-012. SR-013 is a separate proposal pending user approval and was not reviewed.
- Prior authoritative decision: `Pass` (ARCH-REV-007)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - Verified the one-rule delta in `validateCompactionSummaryBody`: first line `/^\(none(\)|[\s–—-])/i` → empty; bullets otherwise; all other checks and the prompts unchanged.
  - Checked the regex boundaries by hand.
  - No interface, ownership or persistence change.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-007 | Open (Low, non-blocking) | Still open (non-blocking) | — | REQ-002 rationale unchanged in SR-012 |

- New or remaining finding IDs: ARCH-007 (non-blocking). Implementation note N-4: boundary tests for the new rule.
- Material classification changes: none.
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary pass); `/software_engineering_team/solution_designer` (informational).
- Remaining risks or uncertainty:
  - N-1 to N-4;
  - SR-013 pending;
  - the load-sensitive server test for delivery.
