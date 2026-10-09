# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative. This record holds the initial baseline and each later review delta.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / `Architecture Design Complete` (Medium, High risk) | SR-001, SR-002, SR-003 | N/A | Fail | ARCH-001, ARCH-002, ARCH-003, ARCH-004 |
| ARCH-REV-002 | Round 2 / re-review after SR-004 | SR-004 | Fail | Pass | ARCH-001, ARCH-002, ARCH-003 resolved; ARCH-004 partly resolved (non-blocking) |
| ARCH-REV-003 | Round 3 / SR-005 provider-boundary refactor (Large, High) | SR-005 | Pass | Pass | ARCH-004 resolved; ARCH-005 new (Low, non-blocking) |

## Revision Entries

### ARCH-REV-001 — Initial review: caching design sound; retained-thinking boundaries and REQ-003 alignment need rework

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/design-review-report.md`
- Review round and trigger: Round 1; `Architecture Design Complete` handoff from `/software_engineering_team/solution_designer` (`solution-handoff.md`, 2026-10-09).
- Triggering role, report path, and finding IDs: Solution Designer; `solution-handoff.md`; N/A (initial review).
- Relevant solution revision IDs: SR-001, SR-002, SR-003
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` (`Design Impact`)
- What changed in the review result or what baseline was established: established the baseline.
  - Confirmed: caching markers and ownership (`promptCacheScope` → `AnthropicLLM`), one-shot exclusion, late-note in-place rendering, 1h TTL, pricing fix, SDK upgrade sequence, and removal of the per-turn steady-state strip.
  - Found reachable, product-supported events where retained thinking becomes a persistent 400 on enforced accounts:
    - Settings media default-model change;
    - Tools UI schema reload;
    - restore after an agent-definition tool edit.
  - Found a requirements/design contradiction on text-only replies.
  - Found an inaccurate snapshot-transition premise.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - ARCH-001 (High, blocking);
  - ARCH-002 (Medium-High, blocking; may resolve through a requirement revision with renewed user approval);
  - ARCH-003 (Medium, blocking);
  - ARCH-004 (Low, non-blocking).
- Material classification changes: N/A (baseline). Material premises recorded:
  - P-001, P-002, P-003a, P-003b(i): `Reachable`;
  - P-003b(ii): `Unclear`;
  - P-004: `Unclear`, residual only.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - binding equivalence of a system string versus a `TextBlockParam[]` (probe needed);
  - image bytes re-read on every render (P-004);
  - Claude Agent SDK peer resolution after the SDK upgrade.

### ARCH-REV-002 — Re-review after SR-004: prefix-binding guard accepted; design passes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/design-review-report.md`
- Review round and trigger: Round 2; re-review request from `/software_engineering_team/solution_designer` (`solution-handoff.md`, SR-004).
- Triggering role, report path, and finding IDs: Solution Designer; `solution-revision-record.md` § SR-004; ARCH-001..004.
- Relevant solution revision IDs: SR-004
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result: the design replaces the unconditional per-turn reset with an event-driven guard, `MemoryManager.bindRetainedReasoningToRequestPrefix(digest)`.
  - The digest covers the leading system run and the tool schemas being sent; the assembler computes it.
  - Placement: after compaction, before the recovery checkpoint; the strip is persisted first.
  - The guard strips once, only on a digest change or on the first request since creation or restore.
  - Requirements were revised to S4 (REQ-003, AC-004, BEH-005) and extended with REQ-012, AC-013 and SCN-005/006. They are approved by explicit user delegation.
  - The new live probe confirms string vs block-array `system` equivalence (P1), the 400 on a tool change (P2) and that a one-time strip is accepted (P3).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-001 | Open (High, blocking) | Resolved | SR-004; REQ-012, AC-013, SCN-005/006 | design-spec Intended Change 2, DS-003, Ownership Map, Interface table, Examples, guard tests (1)–(5), live AC-013 checks; probes P2/P3; `llm-phase.ts` builds `toolSchemas` before `prepareRequest` and sends the same array |
| ARCH-002 | Open (Medium-High, blocking) | Resolved | SR-004; REQ-003, BEH-005, AC-004 rewritten | Requirements now match the S4 design; S4 is in both supplement inventories; approval reference recorded |
| ARCH-003 | Open (Medium, blocking) | Resolved | SR-004 | Persisted-data section restated (snapshots hold latest-cycle thinking; first resume is a restore → one-time strip); P1 resolves P-003b(ii); resume test fixture specified |
| ARCH-004 | Open (Low, non-blocking) | Partly resolved (non-blocking) | SR-004 | Architecture Phase Input and some investigation text are fixed. Still stale: `design-spec.md:61`, `investigation-notes.md:77` and `:257`, `requirements-doc.md:69`, and the SR-004 "Needs explicit user approval" bullet |

- New or remaining finding IDs: ARCH-004 (Low, non-blocking). New premise P-005 (strip in the middle of a tool round): reachable trigger, unclear consequence, no regression versus today. Non-blocking; to be exercised in AC-013(a) live validation.
- Material classification changes: ARCH-002, previously classed as Design Impact, was resolved upstream as a requirement revision with approval.
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary pass); `/software_engineering_team/solution_designer` (informational).
- Remaining risks or uncertainty:
  - P-005 (strip in the middle of a tool round);
  - P-004 (image bytes);
  - one avoidable rewrite per restore within 1h;
  - Claude Agent SDK peer resolution.

### ARCH-REV-003 — SR-005 provider-boundary refactor reviewed; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/design-review-report.md`
- Review round and trigger: Round 3. The Solution Designer requested a review of SR-005 (user-approved refactor folded in; task_size now Large).
- Triggering role, report path, and finding IDs: Solution Designer; `solution-revision-record.md` § SR-005; no prior open blocking findings.
- Relevant solution revision IDs: SR-005
- Prior authoritative decision: `Pass` (ARCH-REV-002, SR-004)
- Current authoritative decision: `Pass`
- What changed in the review result: reviewed the new structure:
  - `llm/provider-native/` (opaque turn, policy interface, static registry, neutral operations);
  - the Anthropic turn model and policy moved to `llm/api/`;
  - memory, compaction and binding switched to the neutral operations;
  - `renderedPayload`, the agent pre-render and the `_renderer` bypass removed;
  - `prepareRequest` returns `tools`.
  
  Verified against the code: there is a single native-turn producer, the `renderedPayload` chain has no production consumer, the leading-run helpers are semantically identical, recovery is equivalent after removing the pre-render, and the persisted key and value are unchanged. SR-004 behavior is unchanged.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-004 | Partly resolved (non-blocking) | Resolved | SR-005 (factual corrections) | The stale text is gone or corrected in design-spec, investigation-notes, requirements-doc:70 and the SR-004 approval bullet |

- New or remaining finding IDs: ARCH-005 (Low, non-blocking). The signature-change caller inventory misses server tests (`compaction-provider-requests.test.ts:37`) and `test-support/live-e2e/live-e2e-harness.ts` (`LLMExtension` subclass). Test fakes that override `send/streamMessages` with the old shape should also be searched for.
- Material classification changes: none.
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary pass); `/software_engineering_team/solution_designer` (informational).
- Remaining risks or uncertainty:
  - R-1: possible registry ↔ policy import cycle;
  - P-005;
  - P-004;
  - restore rewrite cost;
  - refactor parity.
