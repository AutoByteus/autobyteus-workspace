# Architecture Review Revision Record — autobyteus-646

The latest `design-review-report.md` is authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Large, High) | SR-001 … SR-003 | N/A | Fail | AR-001 … AR-005 |
| ARCH-REV-002 | Round 2 / SR-004 (fixes for ARCH-REV-001) | SR-004 | Fail | Pass | AR-001 … AR-005 resolved |
| ARCH-REV-003 | Round 3 / re-review at the 9-point bar (user's direction) | SR-004 | Pass | Fail | AR-006 … AR-009 new |
| ARCH-REV-004 | Round 4 / SR-009 (fixes for ARCH-REV-003) | SR-009 | Fail | Fail | AR-006 … AR-009 resolved; AR-010, AR-011 new |

## Revision Entries

### ARCH-REV-001 — Initial review: live switch unspecified, history scope, once per failure

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/usage-limit-fallback-646/tickets/in-progress/usage-limit-fallback-646/design-review-report.md`
- Review round and trigger: round 1; Solution Designer handoff 2026-11-27, commit `214300a403` (base `bc4351cad7`).
- Triggering role, report path, and finding IDs: Solution Designer; N/A.
- Relevant solution revision IDs: SR-001 … SR-003.
- Prior authoritative decision: N/A.
- Current authoritative decision: `Fail`.
- What baseline was established:
  - The data contract passes, except that C-1 lacks a once-per-failure rule.
  - Existing primitives were confirmed: the lifecycle observer for runs; synchronous run listeners; the standalone quiet stop and pending-switch activation; the member handle's unused `releaseRuntime*`/`replaceSelection`; the current CM-12 order.
  - Codex emits up to three terminal `ERROR`s per failed turn.
  - Five findings were opened.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-001 (Design Impact, High): no sequence or persistence owner for switching a live run or member;
  - AR-002 (Design Impact / Requirement Gap, Medium): the history layer's scope against the preserved CM-12 order;
  - AR-003 (Design Impact, Medium): publish once and switch once per failure;
  - AR-004 (Design Impact, Low): DS-001 attach point, run detached;
  - AR-005 (Requirement Gap, Low): AC-003 wording; the design's basis line.
- Material classification changes: None (`Large`/`High`).
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: the router template is pending the founder; the exhaustion view's rebuild window against weekly limits; limits reads after unrelated errors; router queue bursts.

### ARCH-REV-002 — SR-004: live switch per root kind, delegation order, once per failure; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/usage-limit-fallback-646/tickets/in-progress/usage-limit-fallback-646/design-review-report.md` (§ Round 2 Delta Review)
- Review round and trigger: round 2. SR-004 at `b40ee8d202` (Solution Designer's message, 2026-11-27).
- Triggering role, report path, and finding IDs: Solution Designer; design-spec § SR-004 Revisions; AR-001 … AR-005.
- Relevant solution revision IDs: SR-004.
- Prior authoritative decision: `Fail` (ARCH-REV-001).
- Current authoritative decision: `Pass`.
- What changed in the review result:
  - I verified R-1's premises at base. An Org container claims no unit agent (`live-agent-org-container.ts:131-132`), so two root kinds suffice.
  - A member's quiescent termination does not fence its handle (`configured-agent-execution-handle.ts:478`), so `replaceSelection` and the reactivation with the pending switch work.
  - The Team tree mutation follows the existing committer pattern.
  - R-2 through R-6 answer the findings and residuals.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-004 R-1 | Sequence, gates, primitives and persistence owner per root kind; restart and failure outcomes; premises checked at base |
| AR-002 | Open (Medium) | Resolved | SR-004 R-2 | CM-12 order preserved; history only after an exhaustion skip |
| AR-003 | Open (Medium) | Resolved | SR-004 R-3 | Once per `(agentRunId, turn_id)`; one switch in flight per run |
| AR-004 | Open (Low) | Resolved | SR-004 R-4 | `runPublished` source in the platform-notices fan-out; detached work; collaboration-root runs only |
| AR-005 | Open (Low) | Resolved | SR-004 | AC-003 and the basis line corrected |

- New or remaining finding IDs: None.
- Material classification changes: None (`Large`/`High`).
- Recommended recipient: implementation engineer (primary); Solution Designer (informational).
- Remaining risks or uncertainty: the router template waits on the founder (R-6); not-quiet retries; a stop between steps 2 and 4; non-Codex recognition; router queue bursts.

### ARCH-REV-003 — Re-review at the 9-point bar: the switch, one fact per owner, log retention

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/usage-limit-fallback-646/tickets/in-progress/usage-limit-fallback-646/design-review-report.md` (§ Round 3 Re-Review)
- Review round and trigger: round 3. The user asked for an honest score and set the bar for architecture at 9/10; SR-004 at `b40ee8d202`, unchanged since round 2.
- Triggering role, report path, and finding IDs: the user (in this reviewer's conversation); N/A.
- Relevant solution revision IDs: SR-004.
- Prior authoritative decision: `Pass` (ARCH-REV-002).
- Current authoritative decision: `Fail`.
- What changed in the review result:
  - The Pass is withdrawn at the raised bar, with evidence (rulings hold unless evidence shows a problem).
  - AR-006 is a defect found today at base: the person's Save refuses peer-started runs (`standalone-stopped-run-selection-updater.ts:130-137`), carries person-facing texts, and the root doesn't follow without `AgentRunService` (`agent-run-service.ts:377-385`).
  - AR-007…AR-009 are quality gaps, named as such.
  - Score: 7.5 now; 9 with the four resolved.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 … AR-005 | Resolved | Resolved (unchanged) | SR-004 | AR-006 concerns R-1's choice of building blocks, not the sequence AR-001 asked for |

- New or remaining finding IDs:
  - AR-006 (Design Impact + Requirement Gap, High): the automatic switch reuses the person's Save;
  - AR-007 (Design Impact, Low): the in-flight state is held twice;
  - AR-008 (Design Impact, Medium): usage-limit classification in two owners;
  - AR-009 (Design Impact + product window, Low): log retention.
- Material classification changes: None (`Large`/`High`).
- Recommended recipient: Solution Designer; the implementation engineer is told to hold the affected parts.
- Remaining risks or uncertainty: the two switch structures (Agent vs Team) stay; non-Codex inference stays within each runtime; the router template waits for the founder.

### ARCH-REV-004 — SR-009: own switch operation, state guard, per-runtime classification, retention; two gaps left

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/usage-limit-fallback-646/tickets/in-progress/usage-limit-fallback-646/design-review-report.md` (§ Round 4 Review)
- Review round and trigger: round 4. SR-009 at `67b5c2f429` (Solution Designer's message, 2026-11-27).
- Triggering role, report path, and finding IDs: Solution Designer; design-spec § SR-009 Revisions (R-11 … R-14); AR-006 … AR-009.
- Relevant solution revision IDs: SR-005 … SR-009. SR-005 … SR-008 are implementation questions answered within REQ-005/006 (the notice rendering, the `agent_history` origin, the continue notice); they were checked and found to have no architectural effect.
- Prior authoritative decision: `Fail` (ARCH-REV-003).
- Current authoritative decision: `Fail`, score about 8.5.
- What changed in the review result:
  - AR-006 … AR-009 are resolved. The peer-started premise is checked against CM-10 and the 461 AR-016 record.
  - Two new narrow gaps: the root follow placed in the lifecycle service reverses the composition's dependency (AR-010), and the event contract for a classification found by a later limits read is unspecified (AR-011).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-006 | Open (High) | Resolved | SR-009 R-11 | Own operation per root on commit primitives; own checks and texts; peer-started runs per CM-10, with a two-server E2E |
| AR-007 | Open (Low) | Resolved | SR-009 R-12 | Guard from the run's current launch and pending switch; no map |
| AR-008 | Open (Medium) | Resolved (Codex); see AR-011 | SR-009 R-13 | Backends classify; the detector is runtime-agnostic; scope and reset from the availability service |
| AR-009 | Open (Low) | Resolved | SR-009 R-14 | `SealedJsonlLog.removeSealedOlderThan`; 31 d / 90 d; routing log left to the founder |

- New or remaining finding IDs: AR-010 (Design Impact, Low): the root follow should be done by the driving root, not the lifecycle service; AR-011 (Design Impact, Medium): how a later-read classification reaches the event.
- Material classification changes: None (`Large`/`High`).
- Recommended recipient: Solution Designer. The implementation engineer may proceed except on the root-follow placement and the read-based classification.
- Remaining risks or uncertainty: DEC-008 pending the founder; routing log retention (follow-up); the peer-started E2E; the router template.
