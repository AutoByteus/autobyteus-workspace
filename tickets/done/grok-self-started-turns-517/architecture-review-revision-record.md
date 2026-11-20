# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / `handoff-sr-001.md` (Medium / High) | SR-001 | N/A | Fail | AR-001, AR-002, AR-003, AR-004 |
| ARCH-REV-002 | Round 2 / SR-002 resubmission | SR-001, SR-002 | Fail | Fail | AR-001..AR-004 rechecked; new AR-005, AR-006 |
| ARCH-REV-003 | Round 3 / SR-003 resubmission | SR-001, SR-002, SR-003 | Fail | Pass | AR-002, AR-003, AR-005, AR-006 resolved |
| ARCH-REV-004 | Round 4 / SR-004 (implementation IR-001) | SR-001..SR-004 | Pass | Fail | new AR-007 |
| ARCH-REV-005 | Round 5 / SR-005 resubmission | SR-001..SR-005 | Fail | Pass | AR-007 resolved |

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

### ARCH-REV-004 — Wire-order delivery in the connection: right owner, needs error containment

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-self-started-turns-517/tickets/in-progress/grok-self-started-turns-517/design-review-report.md`
- Review round and trigger: round 4; SR-004 after implementation Design Impact IR-001 (`evidence/IMP-01-sdk-delivery-order.log`)
- Triggering role, report path, and finding IDs: implementation engineer IR-001 via Solution Designer SR-004; no prior open findings
- Relevant solution revision IDs: `SR-001`..`SR-004`
- Prior authoritative decision: `Pass` (ARCH-REV-003, SR-003)
- Current authoritative decision: `Fail`
- What changed: confirmed IR-001's cause in SDK 1.5.0 (`jsonrpc.js:735-790, 826-840`). Intended Change 0 (synchronous inbound stage in `AcpClientConnection`) is the right owner and shape. It does not carry over the SDK's per-notification error containment (`jsonrpc.js:776-789`). The SDK's schema is not exported, so its "today's acceptance" fallback lets malformed updates reach a converter that can throw inside the stream transform and close the connection (MP-004 → AR-007). Also noted: `Client.sessionUpdate` is required, and the `_`-only routing narrows today's `extNotification` scope (harmless; to be stated). Residual: the ordering guarantee holds one way (before a response), which is sufficient.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001..AR-006 | Resolved (ARCH-REV-002/003) | Resolved | SR-004 leaves items 1-7 unchanged | design-spec Intended Change 1-7 unchanged since SR-003 |

- New or remaining finding IDs: AR-007 (Design Impact, Medium, blocking)
- Material classification changes: None (Medium / High; scope now includes the shared ACP connection)
- Recommended recipient: Solution Designer; implementation waits
- Remaining risks or uncertainty: one-directional ordering guarantee (tied to RSK-003), RSK-004, RSK-001, UNK-001.

### ARCH-REV-005 — Inbound stage completed; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-self-started-turns-517/tickets/in-progress/grok-self-started-turns-517/design-review-report.md`
- Review round and trigger: round 5; Solution Designer resubmission after SR-005
- Triggering role, report path, and finding IDs: Solution Designer, `solution-revision-record.md` SR-005, AR-007
- Relevant solution revision IDs: `SR-001`..`SR-005`
- Prior authoritative decision: `Fail` (ARCH-REV-004)
- Current authoritative decision: `Pass`
- What changed: verified that Intended Change 0 now states per-frame containment, minimal validation, the `Client.sessionUpdate`/`extNotification` no-ops and the routing of every non-`session/update` notification, with unit cases in step 0. Checked the SDK's remaining protocol handling: `$/cancel_request` (`jsonrpc.js:851-864`) is not reachable on current evidence (MP-005); passing `$/` notifications to the SDK is recorded as a suggestion.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-007 | Open (Medium) | Resolved | SR-005; design-spec Intended Change 0, Change Sequence step 0 | (a) per-frame try/catch logging `ACP_FRAME_HANDLER_FAILED`, transform never throws; (b) minimal checks (object params, non-empty `sessionId`, `update` with string `sessionUpdate`), `ACP_FRAME_DROPPED`; (c) `Client.sessionUpdate`/`extNotification` commented no-ops; every non-`session/update` notification to `routeExt` with unchanged method; unit cases for throwing handler, malformed update, non-`_` notification |

- New or remaining finding IDs: None
- Material classification changes: None (Medium / High)
- Recommended recipient: Implementation engineer; Solution Designer informational
- Remaining risks or uncertainty: MP-005 suggestion; one-directional ordering (RSK-003); RSK-004; RSK-001; UNK-001.
