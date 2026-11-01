# Architecture Review Revision Record — autobyteus-348

The latest `design-review-report.md` remains authoritative. This record holds the baseline and each later review delta.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Solution Designer handoff "Architecture Design Complete" (Large / High) | SR-001 | N/A | Fail | ARCH-F-001, ARCH-F-002, ARCH-F-003, ARCH-F-004 (blocking); ARCH-F-005, ARCH-F-006 (non-blocking) |
| ARCH-REV-002 | Round 2 / revision after ARCH-REV-001 (SR-001 note 1) | SR-001 (note 1) | Fail | Pass | ARCH-F-001…006 resolved; ARCH-F-007…010 new (non-blocking) |

## Revision Entries

### ARCH-REV-001 — Baseline: sound approach, two premises contradicted by the code, inventory incomplete

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members/tickets/in-progress/runtime-switch-members/design-review-report.md`
- Review round and trigger: round 1; Solution Designer handoff (`solution-designer-handoff.md`)
- Triggering role, report path, and finding IDs: Solution Designer (`/software_engineering_team/solution_designer`); handoff above; no prior findings
- Relevant solution revision IDs: SR-001
- Prior authoritative decision: N/A
- Current authoritative decision: Fail (Design Impact)
- What changed in the review result or what baseline was established: baseline. Every claim the design rests on was opened in code. Confirmed: the shared activation class and the planner seam, the three roots' commit seam as an interface, the copy facts' compose-at-load/split-at-save, the stateless recorder and process-default port, the hand-over note working for member runs, discovery as the journal-runtime reader. Contradicted or missing: F-02 (Team members are built by a second construction site, `FlatTeamAgentExecutionHandle`, with its own commit adapter and cached state); F-09 (b) (a copy's runtime and a member's pending switch cross two strict shared wire-contract packages, a live event, a third and fourth copy of the effective-launch rule and the web selectors; discovery reads the started runtime for a task Agent); the commit mismatch rule (existing code throws, the design says "changes nothing"); the handle's stale in-memory spec after a commit (a second activation would switch again); the copy pending rule (REQ-002/AC-004 versus DEC-5/M-6).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: ARCH-F-001 (High), ARCH-F-002 (High), ARCH-F-003 (High), ARCH-F-004 (Medium), ARCH-F-005 (Low), ARCH-F-006 (Low)
- Material classification changes: `task_size=Large`, `architectural_risk=High` confirmed; the size rationale gains the two contracts packages
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: the web planner and the full list of `userLaunchSelection` sites were not read by the reviewer; the Org and Agent-root adopt mutators were read only at their call sites.

### ARCH-REV-002 — Round 2: all round-1 findings resolved; Pass with four non-blocking findings

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members/tickets/in-progress/runtime-switch-members/design-review-report.md`
- Review round and trigger: round 2; Solution Designer revision (`solution-designer-handoff.md` "Round 2", `solution-revision-record.md` SR-001 note 1), documents `36f33e3b4d`
- Triggering role, report path, and finding IDs: Solution Designer; round-1 report; ARCH-F-001…006
- Relevant solution revision IDs: SR-001 (note 1)
- Prior authoritative decision: Fail
- Current authoritative decision: Pass
- What changed in the review result or what baseline was established: each claimed update was checked in the documents and, for new claims, in code (not taken from the revision record). Affected spines redrawn: DS-003 now shows both construction sites, the Team wrapper's adapter and the root commit; DS-002 now has a save that reads no memory; DS-004 gains the contract-fed web path. Classification unchanged.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-001 | Open (High, blocking) | Resolved | D-3, D-9, mapping rows (both contracts packages, projectors, web call sites, location read models), contract §6, FU-001, sequence step 1 | The two stream-contract packages and their strict schemas are in scope; the three mirrors are extended with a parity test (the server depends on both contract packages, so a server test can run it); the live event carries the runtime through `selection`; the pending switch stays off the wire (the web needs only the effective runtime; undo is the server's decision); discovery gets one function over effective launch and pending, including the task Agent's started-runtime case; `buildRuntimeSwitch` generalized |
| ARCH-F-002 | Open (High, blocking) | Resolved | F-02 restated, D-6, D-8, DS-003, mapping row for the Team local runtime | Both construction sites, the wrapper's `config`, context and adapter, and `replaceSelection` in both implementations are named; the Team committer's third branch noted. The call time of `replaceSelection` is mislocated (ARCH-F-009) |
| ARCH-F-003 | Open (High, blocking) | Resolved | contract §2, M-2, M-7, D-6, D-8, test list | A stale `switchId` or missing member throws (consistent with the existing mutators); the change carries the member identity so a native `null` commits; the handle's `binding &&` condition is replaced; every holder refreshes; the staged path refuses a pending spec; the discard sits in the failure branch after a confirmed release, keyed. Two stale lines remain (ARCH-F-008) |
| ARCH-F-004 | Open (Medium, blocking) | Resolved | REQ-002, AC-004, D-5, M-6, DEC-5 | The save no longer reads memory; the planner decides history at activation. "Started" remains undefined (ARCH-F-007) |
| ARCH-F-005 | Open (Low) | Resolved | D-8, Ownership Map | The record-level commit step lives beside the save rule |
| ARCH-F-006 | Open (Low) | Resolved | notes F-14, Removal Plan, D-5 | The documentation-only sentence, token-usage readers and stopped guard are corrected; one old-name file still missing from the mapping (ARCH-F-010) |

- New or remaining finding IDs: ARCH-F-007 (Medium), ARCH-F-008 (Medium), ARCH-F-009 (Low), ARCH-F-010 (Low); all non-blocking; ARCH-F-007 to be settled before step 3
- Material classification changes: none; `task_size=Large`, `architectural_risk=High` confirmed
- Recommended recipient: `/software_engineering_team/implementation_engineer` (primary pass), then `/software_engineering_team/solution_designer` (informational)
- Remaining risks or uncertainty: the web planner and every `userLaunchSelection` site were not read by the reviewer; three launch-rule mirrors remain until FU-001; contracts, server and web must land in one cut.
