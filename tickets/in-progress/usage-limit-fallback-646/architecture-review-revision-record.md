# Architecture Review Revision Record — autobyteus-646

The latest `design-review-report.md` is authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Large, High) | SR-001 … SR-003 | N/A | Fail | AR-001 … AR-005 |

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
