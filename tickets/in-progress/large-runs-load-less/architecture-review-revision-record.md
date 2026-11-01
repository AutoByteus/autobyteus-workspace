# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / initial architecture review | SR-001 | N/A | Fail (Design Impact) | AR-001…AR-004 |
| ARCH-REV-002 | Round 2 / re-review of SR-002 | SR-002 | Fail | Pass | AR-001…AR-004 resolved |
| ARCH-REV-003 | Round 3 / targeted re-review of SR-003 (after IR-001) | SR-003 | Pass | Pass | none |
| ARCH-REV-004 | Round 4 / targeted re-review of SR-004 (after CRR-003) | SR-004 | Pass | Fail (Design Impact) | AR-005 new |
| ARCH-REV-005 | Round 5 / targeted re-review of SR-005 | SR-005 | Fail | Pass | AR-005 resolved |

## Revision Entries

### ARCH-REV-001 — Initial review: the core shape is sound; inspections, live rebuilds, recovery hydration, remote rule

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less/tickets/in-progress/large-runs-load-less/design-review-report.md`
- Review round and trigger: round 1, Solution Designer handoff (`solution-handoff.md`), 2026-11-01, base `efd28d5c4a`
- Triggering role, report path, and finding IDs: Solution Designer; N/A
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`, `Design Impact`
- What changed in the review result or what baseline was established:
  - Baseline established. Large / High confirmed. The dropped items (161, 200, 118) are accepted with their evidence.
  - DS-004 (Settings) and DS-006 (feed) pass.
  - AR-001: server inspections still read and validate the log, so a damaged log makes the whole run unopenable (AC-006).
  - AR-002: the merge rule must reload on every context rebuild (gap, checkpoint, reconnect), including in-flight loads, and must use or remove `baseChangeSequence`.
  - AR-003: team stream recovery (`exact`, all members) and org stream hydration are untraced for `MemberLoader`.
  - AR-004: today a remote child's Team tab is empty, so the rule should be no query and empty, with the server rejecting non-participants.

#### Prior Finding Resolution

None

- New or remaining finding IDs: AR-001 (High), AR-002, AR-003 (Medium), AR-004 (Low)
- Material classification changes: none (task_size=Large, architectural_risk=High)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: the QR-004 escalation (DEC-001 b); the measurement load (R-01)

### ARCH-REV-002 — Re-review of SR-002: records owners, rebuild reloads, loader generations, remote rule; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less/tickets/in-progress/large-runs-load-less/design-review-report.md`
- Review round and trigger: round 2, Solution Designer re-review request (SR-002), 2026-11-01
- Triggering role, report path, and finding IDs: Solution Designer, `solution-handoff.md` ("SR-002 Revision"); AR-001…AR-004
- Relevant solution revision IDs: `SR-002`
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result: every finding is resolved in the canonical design. See the report's "Round 2 Scope".

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-002 | Tree-only inspections; `messages` dropped from the view snapshots (`standalone-agent-run-root-manager.ts:282`, `agent-org-run-manager.ts:189-197`, the team snapshot); records owners per root (org `:148` gains validation; hub new; team projection service); reference content (`agent-collaboration-references.ts:17-20`) through them; AC-006 holds |
| AR-002 | Open (Medium) | Resolved | SR-002 | Buffer before the request; ID merge; `baseChangeSequence` removed; `reloadRoot` (generation) at named rebuild call sites; tests for a gap reopen during and after a load |
| AR-003 | Open (Medium) | Resolved | SR-002 | `MemberLoader.beginRoot` generation on every rebuild (open, team recovery, org `source: 'stream'`, gap/checkpoint reopen); focused member only; recovery exact for it between the checkpoints; test |
| AR-004 | Open (Low) | Resolved | SR-002 | No query for a remote participant; server rejects non-participants; the Risk replaced |

- New or remaining finding IDs: none
- Material classification changes: none (task_size=Large, architectural_risk=High)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: QR-004 / DEC-001 (b) escalation; the measurement load (R-01); the Ownership Map wording ("reload on reconnect") lags the narrative

### ARCH-REV-003 — Targeted re-review of SR-003: DS-007 long-run shaping class; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less/tickets/in-progress/large-runs-load-less/design-review-report.md`
- Review round and trigger: round 3 (targeted), Solution Designer re-review request (SR-003), after the implementation engineer's IR-001 Design Impact (QR-004 missed after DEC-001 a), 2026-11-01
- Triggering role, report path, and finding IDs: Solution Designer, `solution-handoff.md` ("SR-003 Revision"); IR-001; `evidence/M-163-layout-experiments.json`, `M-163-css-variants.txt`
- Relevant solution revision IDs: `SR-003`
- Prior authoritative decision: `Pass` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - DS-007 and DEC-004 are accepted. The measured cause is text shaping with kerning and ligatures: 86 s → 48–87 ms.
  - There is one linear helper and one shared class at four renderers, including the two measured block kinds (user blocks about 43.9 s, markdown about 42.7 s).
  - The display is unchanged for practical purposes, and no user question is needed.

#### Prior Finding Resolution

None (no open findings; AR-001…AR-004 stay resolved)

- New or remaining finding IDs: none
- Material classification changes: none (task_size=Large, architectural_risk=High)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty:
  - the QR-004 escalation if still missed;
  - unmeasured long tokens in tool and reasoning renderers (recommendation only);
  - whole-block typography change (negligible).

### ARCH-REV-004 — Targeted re-review of SR-004: the sequence-guarded reload needs a reset per live sequence

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less/tickets/in-progress/large-runs-load-less/design-review-report.md`
- Review round and trigger: round 4 (targeted), Solution Designer re-review request (SR-004), after code review CRR-003 / CR-002 (from API-08), 2026-11-01; code at `776d6b7d86`
- Triggering role, report path, and finding IDs: Solution Designer, `solution-handoff.md` ("SR-004 Revision"); `code-review-report.md` CR-002; `evidence/api-e2e/API-08-hub-participant-reloads.log`
- Relevant solution revision IDs: `SR-004`
- Prior authoritative decision: `Pass` (ARCH-REV-003)
- Current authoritative decision: `Fail`, `Design Impact`
- What changed in the review result:
  - Option (b) is accepted. C advances only contiguously: the gap check precedes `checkpoint_required` (`agentRunCollaborationContext.ts:133-137`).
  - New AR-005: live sequences restart at 0 for each `RootEventPublisher` (`root-event-publisher.ts:23`). C has no reset, so after a stop and resume, or a server restart, B ≤ stale C keeps lists that miss new messages.

#### Prior Finding Resolution

None (AR-001…AR-004 stay resolved)

- New or remaining finding IDs: AR-005 (Medium)
- Material classification changes: none (task_size=Large, architectural_risk=High)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: as in ARCH-REV-003

### ARCH-REV-005 — Targeted re-review of SR-005: the live-sequence identity; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less/tickets/in-progress/large-runs-load-less/design-review-report.md`
- Review round and trigger: round 5 (targeted), Solution Designer re-review request (SR-005), 2026-11-01
- Triggering role, report path, and finding IDs: Solution Designer, `solution-handoff.md` ("SR-005 Revision"); AR-005
- Relevant solution revision IDs: `SR-005`
- Prior authoritative decision: `Fail` (ARCH-REV-004)
- Current authoritative decision: `Pass`
- What changed in the review result: `liveSequenceId` per `RootEventPublisher` instance, carried as `live_sequence_id` in active views and snapshots (`null` when stored). The reload guard is keyed by it. All three root kinds are covered: the Team's publisher is an alias of `RootEventPublisher`.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-005 | Open (Medium) | Resolved | SR-005 | `standalone-root-builder.ts:132`; `agent-org-execution-scope-builder.ts:56`; `team-run-event-publisher.ts:1-6` (alias); `agent-team-stream-handler.ts:137-142`; tests for stop → resume and a new publisher |

- New or remaining finding IDs: none
- Material classification changes: none (task_size=Large, architectural_risk=High)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: as in ARCH-REV-003
