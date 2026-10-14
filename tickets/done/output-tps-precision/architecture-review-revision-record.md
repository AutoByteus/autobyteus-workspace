# Architecture Review Revision Record — output-tps-precision

The latest `design-review-report.md` is authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / SR-004 (D3) handoff | SR-004 (SR-002, SR-003 superseded before review) | N/A | Pass | None |
| ARCH-REV-002 | Round 2 / SR-005 (D3.1) design-only refinement | SR-005 | Pass (D3, not handed off) | Pass | None (IC-1 implementation constraint) |
| ARCH-REV-003 | Round 3 / SR-006 (D3.2) Codex call-end fix for CR-F01 | SR-006 | Pass (D3.1) | Pass | None blocking (IC-2 binding implementation constraint) |

## Revision Entries

### ARCH-REV-001 — Initial baseline: D3 real-time per-call TPS passes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/design-review-report.md`
- Review round and trigger: Round 1. The Solution Designer's SR-004 handoff (D3, Large / High).
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`; `solution-handoff.md`; no findings.
- Relevant solution revision IDs: SR-004. SR-002/D1 and SR-003/D2 were sent and then put on hold by the Solution Designer before any result. No review result exists for them.
- Prior authoritative decision: N/A
- Current authoritative decision: Pass
- What baseline was established: The behavior basis is confirmed against R3. DS-002 was traced end-to-end in code (single builder call site, field spreads through enrichment/fold/failure paths, per-run ordered dispatch, strict DTO projectors). Per-runtime signals were verified for native, Claude, Codex, AGY and ACP. Persisted data is Not Affected. Material premises: P-001 is a real Codex compaction trigger that yields no reading; P-002 and P-003 are not reachable. There are three non-blocking recommendations (R-1 rule input shape, R-2 e2e probe update, R-3 Codex test frames).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material classification changes: None (Large / High confirmed)
- Recommended recipient: `/software_engineering_team/implementation_engineer`; informational notice to `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: RSK-002, RSK-005, AGY delta cadence, Grok first-call setup, native hidden reasoning without a count

### ARCH-REV-002 — D3.1: adapters choose the method; central acceptance check passes

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/design-review-report.md`
- Review round and trigger: Round 2. The Solution Designer sent SR-005 (D3.1) after the ARCH-REV-001 result was recorded and before its handoff was sent. The D3 pass was therefore never forwarded.
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`; `solution-handoff.md` (SR-005); no findings.
- Relevant solution revision IDs: SR-005
- Prior authoritative decision: Pass (ARCH-REV-001, D3)
- Current authoritative decision: Pass (D3.1)
- What changed in the review result: Re-reviewed DS-003, DS-004, ownership, dependency, interface and file-mapping sections against R3. Per-adapter method choice is accepted as runtime-owned (DEC-002 is per runtime; each runtime has at most two candidate methods). The central check covers shape and minimum sample only. Round-1 recommendation R-1 (the rule needs the model-call flag) is resolved by DS-004 step 1. New: IC-1 (AGY `duration_seconds × 1000` is fractional, but the check requires integer ms, so the adapter must round) and R-4 (pin the native threshold copy with a server test). R-2 and R-3 carry over. P-001 to P-003 still apply unchanged.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| R-1 (recommendation) | Open, non-blocking | Resolved | SR-005 | `design-spec.md` DS-004 step 1: "Return null when the event is not a model call or no value was reported"; Ownership Map: builder sets null for non-model-call events |
| R-2 (recommendation) | Open, non-blocking | Open, non-blocking | — | Probe/fixture still not in the file mapping |
| R-3 (recommendation) | Open, non-blocking | Open, non-blocking | — | Test-content guidance |

- New or remaining finding IDs: None blocking. IC-1 (binding implementation constraint); R-2, R-3, R-4 (recommendations).
- Material classification changes: None (Large / High)
- Recommended recipient: `/software_engineering_team/implementation_engineer`; informational notice to `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: RSK-002, RSK-005, AGY delta cadence, Grok first-call setup, native hidden reasoning without a count

### ARCH-REV-003 — D3.2: Codex call ends at `rawResponse/completed`; C-001 retired

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/design-review-report.md` (see "Round 3 Summary")
- Review round and trigger: Round 3. SR-006 (D3.2) from the Solution Designer, resolving Design Impact CR-F01 (code review CRR-002, API/E2E API-REV-001 / API-L04).
- Triggering role, report path, and finding IDs: `/software_engineering_team/code_reviewer`, `code-review-report.md`, CR-F01 (via `/software_engineering_team/solution_designer`)
- Relevant solution revision IDs: SR-006
- Prior authoritative decision: Pass (ARCH-REV-002, D3.1)
- Current authoritative decision: Pass (D3.2)
- What changed in the review result:
  - Independently re-parsed both live Codex wire logs and confirmed: one `rawResponse/completed` per model call, its `usage.outputTokens` equals `last.outputTokens`, and a tool-ending call's usage arrives after the tool. Traced the D3.2 rule to 59.5 and 72.7 tok/s on sample 1.
  - Accepted the AC-004/DEC-002 wording alignment as a no-intent change.
  - Added P-004 (compaction between calls: reachable, no wrong reading).
  - Added binding constraint IC-2: the implemented C-001 refinement (freeze on any non-input `item/started`, tools included) must be retired, because under D3.2 it would freeze the next call's boundary before the tool and reintroduce tool time (traced: 31 tok/s instead of 72.7).
  - Review-gap note: ARCH-REV-002 held the Codex call-end premise as RSK-002 residual. It was not establishable from source or fixtures and was caught by live validation as intended.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-F01 (downstream Design Impact) | Open | Resolved in design | SR-006 | DS-003 Codex row and Codex pairing rule; my wire re-parse in the report's Round 3 basis |
| IC-1 | Binding (round 2) | Still applies | — | AGY integer ms; outside the SR-006 change |
| R-2, R-3, R-4 | Open, non-blocking | Open, non-blocking (R-3 extended by IC-2 replay) | — | Implementation status not re-verified this round |

- New or remaining finding IDs: None blocking. IC-2 (binding), R-5 (optional design-record restatement).
- Material classification changes: None (Large / High)
- Recommended recipient: `/software_engineering_team/implementation_engineer` (reimplement the Codex timing), then source review and the API/E2E rerun of API-L04 per the code reviewer's route; informational notice to `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: RSK-002 generation upgrade still not evidenced; approval-wait ordering not sampled live (the boundary rule covers it); Grok first-call setup; native hidden reasoning without a count
