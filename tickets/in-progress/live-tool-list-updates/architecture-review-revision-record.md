# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / initial architecture review | SR-001 | N/A | Fail (Design Impact) | AR-001…AR-007 |
| ARCH-REV-002 | Round 2 / re-review of SR-002 | SR-002 | Fail | Fail (Design Impact) | AR-001 (open, narrowed to Grok); AR-002…AR-007 resolved |
| ARCH-REV-003 | Round 3 / re-review of SR-003 | SR-003 | Fail | Fail (Design Impact) | AR-001 resolved; AR-008 new |
| ARCH-REV-004 | Round 4 / re-review of SR-004 | SR-004 | Fail | Pass | AR-008 resolved |

## Revision Entries

### ARCH-REV-001 — Initial review: core shape sound; reopen, input forms, zero-session runs, notice composition, seen record

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates/tickets/in-progress/live-tool-list-updates/design-review-report.md`
- Review round and trigger: round 1, Solution Designer handoff (`solution-handoff.md`), 2026-10-29, base `9f7c9c10a6`
- Triggering role, report path, and finding IDs: Solution Designer; N/A
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`, `Design Impact`
- What changed in the review result or what baseline was established:
  - Baseline established. Behavior basis confirmed. Large / High confirmed.
  - The transport change, removal enforcement and the run operation pass.
  - Blocking: AR-001 (the reopen conflicts with session activation), AR-002 (reopen and notice on `start_turn` only), AR-003 (runs without a session), AR-004 (single preface/observer slot), AR-005 (seen record across restore).
  - Low: AR-006 (team-local definition signal), AR-007 (dead Codex dynamic-tool path).

#### Prior Finding Resolution

None

- New or remaining finding IDs: AR-001 (High), AR-002…AR-005 (Medium), AR-006, AR-007 (Low)
- Material classification changes: none (task_size=Large, architectural_risk=High)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: U-01 / ASM-001 (accepted); AGY without the header against the product endpoint; R-01

### ARCH-REV-002 — Re-review of SR-002: AR-002…AR-007 resolved; the Grok reopen order is unmeasured

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates/tickets/in-progress/live-tool-list-updates/design-review-report.md`
- Review round and trigger: round 2, Solution Designer re-review request (SR-002), 2026-10-29
- Triggering role, report path, and finding IDs: Solution Designer, `solution-handoff.md` ("SR-002 Revision"); AR-001…AR-007
- Relevant solution revision IDs: `SR-002`
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Fail`, `Design Impact`
- What changed in the review result:
  - The SR-002 requirement additions (DEC-006, DEC-007, AC-007, UC-003) are accepted as within the direction.
  - DS-001…DS-006 pass, except Grok in DS-004.
  - Persisted data passes: a new per-run record, Directly Usable — No Migration.
  - MP-004 was added. The design's Grok reopen overlaps two processes, while E-14 measured end-then-load only.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Open, narrowed (Medium): the Codex part is resolved; the Grok order remains | SR-002; E-13, E-14 | Codex: no re-activation (`describeForRun`); `thread/unsubscribe` + `thread/resume` on the same client, measured (E-13); a thread with no history gets `thread/start`. Grok: steps 3, 4, 6 overlap the old and new process; the probe ends first (`drive-grok-reopen.mjs:37`) |
| AR-002 | Open | Resolved | SR-002 | `takePreface(run, { dispatchKind })`; the reopen only inside `start_turn`; appends unchanged; the tool notice for a reopen-waiting run only on `start_turn` (DS-004, DS-005) |
| AR-003 | Open | Resolved | SR-002; E-15 | The always-present session; `not_exposed` and the null branches removed (removal plan); Claude and AGY zero-tool start measured; Claude's later process generations read the current exposure and descriptor; Codex `enabled_tools: []` is checked in step 1 under the escalation trigger |
| AR-004 | Open | Resolved | SR-002; E-16 | `AgentRunPlatformNotices` (tools, then skills); one preface per dispatch (DEC-006); per-source settle; fan-out; both compositions plus the standalone host wired |
| AR-005 | Open | Resolved | SR-002 | `seen_tool_names.json` via `SeenToolNamesStore` (the skill store's rules); write points listed; Directly Usable — No Migration |
| AR-006 | Open (Low) | Resolved | SR-002; E-17 | `AgentDefinitionChangeSignal` with three sources; each tracked run's definition re-read by ID; application packages named in UC-003 |
| AR-007 | Open (Low) | Resolved (follow-up) | FU-002; E-18 | Recorded with evidence; the path spans untouched approval code; the change adds no use of it |

- New or remaining finding IDs: AR-001 (Grok order)
- Material classification changes: none (task_size=Large, architectural_risk=High)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty:
  - Recommendation: recompute `reopenPending` after a reopen rather than clearing it, so a change during the reopen is not lost.
  - Codex `enabled_tools: []`.
  - AGY against the product endpoint.
  - ASM-001.
  - R-01.

### ARCH-REV-003 — Re-review of SR-003: the Grok order is resolved; the reopened process's release owner is missing

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates/tickets/in-progress/live-tool-list-updates/design-review-report.md`
- Review round and trigger: round 3, Solution Designer re-review request (SR-003), 2026-10-29
- Triggering role, report path, and finding IDs: Solution Designer, `solution-handoff.md` ("SR-003 Revision"); AR-001
- Relevant solution revision IDs: `SR-003`
- Prior authoritative decision: `Fail` (ARCH-REV-002)
- Current authoritative decision: `Fail`, `Design Impact`
- What changed in the review result:
  - The Grok sequence now matches E-14.
  - The no-session state is specified for every backend operation.
  - The recommendation was adopted: `reopenPending` is recomputed on success.
  - MP-005 is new. The backend's `cleanup` (the factory's `release`) closes the preparation owner's original handles, so a reopened process is never ended at stop.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open, narrowed to Grok (Medium) | Resolved | SR-003; E-14 | Grok steps 2–4 end the old process (sinks detached first, `cleanup` not called) before the spawn and `session/load`; this matches `drive-grok-reopen.mjs:37`. Steps 6–7 specify the no-session state; the cited lines `acp-agent-run-backend.ts:81-93,124-135` match |

- New or remaining finding IDs: AR-008 (Medium)
- Material classification changes: none (task_size=Large, architectural_risk=High)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: Codex `enabled_tools: []`; AGY against the product endpoint; ASM-001; R-01

### ARCH-REV-004 — Re-review of SR-004: one owner of the Grok process; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates/tickets/in-progress/live-tool-list-updates/design-review-report.md`
- Review round and trigger: round 4, Solution Designer re-review request (SR-004), 2026-10-29
- Triggering role, report path, and finding IDs: Solution Designer, `solution-handoff.md` ("SR-004 Revision"); AR-008
- Relevant solution revision IDs: `SR-004`
- Prior authoritative decision: `Fail` (ARCH-REV-003)
- Current authoritative decision: `Pass`
- What changed in the review result: DS-004 and BEH-001 now pass. The Grok process has one owner, the run's `AcpPreparationOwner`, across creation, restore and reopen.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-008 | Open (Medium) | Resolved | SR-004 | The owner is created per run at `acp-agent-run-backend-factory.ts:79` (type `:239-244`). `AcpSessionLauncher.open({ owner, … })` records each handle as it exists; the backend reads from the owner; reopen steps 2, 4 and 6 clear, fill, or empty it. `releaseResources` (`:84-94`) is null-safe and closes the current handles. Tests are named (step 8). Codex is unaffected (the same `ThreadPreparation` and `CodexThread`, `codex-thread-manager.ts:78-138`) |

- New or remaining finding IDs: none
- Material classification changes: none (task_size=Large, architectural_risk=High)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: Codex `enabled_tools: []`; AGY against the product endpoint; ASM-001 (model use after a Codex reopen, DEC-004); R-01. All are under the design's escalation triggers
