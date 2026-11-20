# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / `handoff-sr-001.md` (Medium / High) | SR-001 | N/A | Fail | AR-001, AR-002, AR-003, AR-004 |
| ARCH-REV-002 | Round 2 / SR-002 resubmission | SR-001, SR-002 | Fail | Fail | AR-001..AR-004 rechecked; new AR-005, AR-006 |
| ARCH-REV-003 | Round 3 / SR-003 resubmission | SR-001, SR-002, SR-003 | Fail | Pass | AR-002, AR-003, AR-005, AR-006 resolved |

## Revision Entries

### ARCH-REV-001 — Baseline: two-origin turn lifecycle sound; wake during a client turn unresolved

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-self-started-turns-517/tickets/in-progress/grok-self-started-turns-517/design-review-report.md`
- Review round and trigger: round 1; Solution Designer's `Architecture Design Complete` (SR-001)
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-sr-001.md`, N/A
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: baseline. Confirmed the session-owned two-origin lifecycle, end by matching prompt id, cancel/idle/close for both origins, DeepSeek inertness, notice recording, `Not Affected` persisted data. Found the "start only in `ready`" rule undecided for a background command that ends during a client turn (MP-001).

#### Prior Finding Resolution

None

- New or remaining finding IDs: AR-001 (Unclear, High, blocking), AR-002 (Design Impact, Medium), AR-003 (Design Impact, Low), AR-004 (Design Impact, Low)
- Material classification changes: None (Medium / High confirmed)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: dispatch race returning `RUNTIME_COMMAND_FAILED`; unprobed cancel of a self-started prompt; stale tool update order; UNK-001.

### ARCH-REV-002 — Probe 2 resolves AR-001; the new end rule breaks held input at the hand-over

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-self-started-turns-517/tickets/in-progress/grok-self-started-turns-517/design-review-report.md`
- Review round and trigger: round 2; Solution Designer resubmission after SR-002
- Triggering role, report path, and finding IDs: Solution Designer, `solution-revision-record.md` SR-002, AR-001..AR-004
- Relevant solution revision IDs: `SR-001`, `SR-002`
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Fail`
- What changed: probe 2 frames verified independently (209-217, 423-424). MP-001 established. Traced the SR-002 rule against AgentRun's input drain: a held message at a client turn that Grok follows with its own prompt is failed or sent concurrently (MP-002 → AR-005). Corrected my round-1 residual suggestion: AgentRun fails a refused start dispatch; it does not hold it (AR-006).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Unclear, High) | Resolved | SR-002; `evidence/grok-acp-probe2.jsonl` | Frames 169-217: job ending mid-turn is queued as Grok's own prompt after the turn; order 211 → 212 → 215. The rule derived from it raises AR-005 |
| AR-002 | Open (Medium) | Still Open (Low) | SR-002, design-spec Intended Change 1, 3 | Intended Change renamed; Health Assessment (l.65), Primary Spine (l.81), Interface Mapping (l.93), Change Scope, Sequence step 2 still use the old names |
| AR-003 | Open (Low) | Still Open (Low) | SR-002, design-spec Intended Change 1, 4 | Effect carries the notice and sender id; `turn_id` stated; Interface Mapping l.94 still lists the removed optional field |
| AR-004 | Open (Low) | Resolved | SR-002, design-spec Intended Change 3 | One private opening step with the resets; session allocates provider ids; backend comment narrowed |

- New or remaining finding IDs: AR-005 (Design Impact, High, blocking), AR-006 (Design Impact, Low), AR-002 (Low), AR-003 (Low)
- Material classification changes: AR-001 Unclear → resolved; failure now `Design Impact`
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: RSK-001 narrow race (failed input with message) after AR-005's fix; late tool update order; UNK-001.

### ARCH-REV-003 — One-batch hand-over verified; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-self-started-turns-517/tickets/in-progress/grok-self-started-turns-517/design-review-report.md`
- Review round and trigger: round 3; Solution Designer resubmission after SR-003
- Triggering role, report path, and finding IDs: Solution Designer, `solution-revision-record.md` SR-003, AR-002, AR-003, AR-005, AR-006
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Prior authoritative decision: `Fail` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed: verified that AgentRun observes a published batch whole before any input claim (`dispatch-processed-agent-run-events.ts:29-49`, `agent-run.ts:448-455`), so the one-batch hand-over keeps held input waiting; the design spec is consistent in every section; MP-003 (stop in the 211-215 gap) recorded as contrived with an acceptable outcome.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-005 | Open (High) | Resolved | SR-003; design-spec Intended Change 3, DS-002, DS-003, example, AC-006 | Input turn ends on the response; pending provider prompt after the input prompt's `prompt_completed`; one batch [input end, TURN_STARTED(provider), notice], session stays `prompting`; AgentRun batch handling verified |
| AR-006 | Open (Low) | Resolved | SR-003; design-spec item 5; investigation-notes row l.27 | Item 5 dropped; row states AgentRun fails a refused start dispatch and holds by its own lifecycle |
| AR-002 | Open (Low) | Resolved | SR-003; design-spec rewritten | Every section uses `prompt_running`/`prompt_completed`, `provider`, `backends/grok/…`; GLOSSARY.md is Intended Change 6 and in Change Scope |
| AR-003 | Open (Low) | Resolved | SR-003; Interface Boundary Mapping | Optional profile field gone; effect carries `notice: { content, senderId } \| null` |

- New or remaining finding IDs: None
- Material classification changes: None (Medium / High)
- Recommended recipient: Implementation engineer; Solution Designer informational
- Remaining risks or uncertainty: RSK-003 (escalation trigger), RSK-001 (narrow, accepted), requirements-doc revision id not updated for AC-006, UNK-001.
