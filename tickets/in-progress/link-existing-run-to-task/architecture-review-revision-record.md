# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / first review of the adoption design (2026-10-18) | SR-003, SR-004, SR-005 | N/A | Fail | ARCH-F-001, ARCH-F-002 |
| ARCH-REV-002 | Round 2 / re-review of SR-006 (2026-10-18) | SR-006 | Fail | Fail | ARCH-F-001, ARCH-F-002 resolved; ARCH-F-003 new |
| ARCH-REV-003 | Round 3 / re-review of SR-007 (2026-10-18) | SR-007 | Fail | Pass | ARCH-F-003 resolved |
| ARCH-REV-004 | Round 4 / targeted re-review of SR-008 (DI-001) | SR-008 | Pass | Pass | None new (one required implementation addition) |
| ARCH-REV-005 | Round 5 / targeted re-review of SR-009 (CRR-005 F-002) | SR-009 | Pass | Pass | None new |
| ARCH-REV-006 | Round 6 / review of SR-010 full adoption (2026-10-18) | SR-010 | Pass | Fail | ARCH-F-004, ARCH-F-005, ARCH-F-006 (new) |
| ARCH-REV-007 | Round 7 / re-review of SR-011 (2026-10-18) | SR-011 | Fail | Fail | ARCH-F-004..006 resolved; ARCH-F-007 new |
| ARCH-REV-008 | Round 8 / re-review of SR-012 (2026-10-18) | SR-012 | Fail | Pass | ARCH-F-007 resolved |
| ARCH-REV-009 | Round 9 / targeted re-review of SR-013 (DI-002) | SR-013 | Pass | Pass | None new |
| ARCH-REV-010 | Round 10 / targeted re-review of SR-014 (DEC-114) | SR-014 | Pass | Pass | None new |
| ARCH-REV-011 | Round 11 / targeted check of SR-015 (commit point) | SR-015 | Pass | Fail | ARCH-F-008, ARCH-F-009 (new) |
| ARCH-REV-012 | Round 12 / targeted re-review of SR-016 | SR-016 | Fail | Pass | ARCH-F-008, ARCH-F-009 resolved |
| ARCH-REV-013 | Round 13 / targeted review of SR-017 (adoption contract) | SR-017 | Pass | Fail | ARCH-F-010 (new) |

## Revision Entries

### ARCH-REV-001 — Initial baseline: resumption from step 1; REQ-004 wording

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/design-review-report.md`
- Review round and trigger: round 1; SR-004 handoff from `/software_engineering_team/solution_designer`, reviewed on the SR-005 basis (list tool withdrawn). The SR-002 link-only package was paused before any result; no review artifact was written for it.
- Triggering role, report path, and finding IDs: Solution Designer; N/A; N/A.
- Relevant solution revision IDs: `SR-003`, `SR-004`, `SR-005`
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established:
  - Confirmed: the adoption branch, eligibility, no file moves, step order (link before resources), reuse of delivery, history row removal, G1/G2 hiding, host-root-scoped fencing, Large / High.
  - Found: resumption doesn't cover a stop after steps 1–2 (retry refused); REQ-004 conflicts with removal of the empty collaboration package.

#### Prior Finding Resolution

None

- New or remaining finding IDs: ARCH-F-001 (Design Impact, Medium), ARCH-F-002 (Requirement Gap, Low)
- Material classification changes: None (Large / High confirmed).
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: application-bound run eligibility; team admission `exclude` on adoption; adopted team runs leave the Memory page Teams list (as all hub task teams); stale list-tool example.

### ARCH-REV-002 — SR-006 re-review: both findings resolved; step 3's write shape raises ARCH-F-003

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/design-review-report.md`
- Review round and trigger: round 2; SR-006 from `/software_engineering_team/solution_designer`.
- Triggering role, report path, and finding IDs: Solution Designer; `design-review-report.md` (ARCH-REV-001); ARCH-F-001, ARCH-F-002.
- Relevant solution revision IDs: `SR-006`
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Fail`
- What changed in the review result:
  - The two findings are verified resolved, and the residuals are taken.
  - The new SR-006 close-path reversal (stop inside step 3, then Task close) was checked against the merged 8641c0ac writers. For team runs, step 3 writes the task-agent projection without `teamDefinitionName`, which the team-run reader requires, so the reversal cannot restore a team run (ARCH-F-003).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-001 | Open (Design Impact, Medium) | Resolved | SR-006; design Persisted Data "Adoption in progress", bounded spine; tests after steps 1–4 | An open `assigned` entry by this delegator with hostRoot = its root, for a run not in its tree, is recognized first, before the "belongs to no Task" and `assertCopyAssignable` refusals. The retry continues at the first missing step. The entry stays `starting` through steps 2–4, and only a delivery failure marks it `failed`. |
| ARCH-F-002 | Open (Requirement Gap, Low) | Resolved | SR-006; Persisted Data | The collaboration package is kept; REQ-004 is unchanged; harmlessness is argued (G1, readiness D-6, an empty tree in scans). |

- New or remaining finding IDs: ARCH-F-003 (Design Impact, Medium).
- Material classification changes: None (Large / High).
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: later ordinary saves normalize an adopted team's tree to the task-agent shape (definition-derived fields; to be recorded).

### ARCH-REV-003 — SR-007 re-review: additive step 3 resolves ARCH-F-003; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/design-review-report.md`
- Review round and trigger: round 3; SR-007 from `/software_engineering_team/solution_designer`.
- Triggering role, report path, and finding IDs: Solution Designer; `design-review-report.md` (ARCH-REV-002); ARCH-F-003.
- Relevant solution revision IDs: `SR-007`
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Pass`
- What changed in the review result: ARCH-F-003 verified resolved in the design and against the merged split-write comparison (`task-execution-tree-split.ts:211-237`).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-003 | Open (Design Impact, Medium) | Resolved | SR-007; design Persisted Data "Step 3 is strictly additive"; Review Response | `TaskAgentOwnFiles.addTaskAgentSection` adds only the `taskAgent` key to the raw file (atomic). The record is read back through the task-agent reader, so `writeTeamIfChanged` / `writeAgentIfChanged` (compare with the projected file on disk) skip the own-file write and only the link is written. The reversal removes the key → prior content parsed-equal, valid for the team-run and standalone readers. Test: team run stopped inside step 3, then Task closed → listed and openable, parsed-identical tree. Later normalization recorded. |
| ARCH-F-001, ARCH-F-002 | Resolved (ARCH-REV-002) | Resolved | — | unchanged |

- New or remaining finding IDs: None.
- Material classification changes: None (Large / High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`; informational pass to `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty: link-time equality including team handoffs (implementation note); R-1 accepted.

### ARCH-REV-004 — SR-008 targeted re-review (DI-001): reversible address rebase; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/design-review-report.md`
- Review round and trigger: round 4; SR-008 from `/software_engineering_team/solution_designer` after the implementer's DI-001 (`implementation-design-impact.md`).
- Relevant solution revision IDs: `SR-008`
- Prior authoritative decision: `Pass`
- Current authoritative decision: `Pass`
- What changed in the review result:
  - DI-001 is verified: team address frames differ, `/` for a hand-started team versus the catalog address for a task agent team and the delegator's tree.
  - The SR-008 resolution is accepted: an exactly reversible prefix rebase keeping every other fact; read-back so only the link is written; `startedAt` equality; catalog address with refusal when the definition is unlisted; archived runs refused; `revertUnfinished` owned and serialized on the delegator root's queue; R-3 accepted.
  - ARCH-F-003's basis is revised; its intent (step 3 exactly reversible, nothing lost) holds.
  - Required implementation addition: the Project delete path also calls `revertUnfinished`, since Project delete bypasses `ProjectTaskService`'s Task delete.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-003 | Resolved (ARCH-REV-003) | Resolved (basis revised by SR-008) | SR-008; design Persisted Data "Step 3 keeps every fact and is exactly reversible" | `adoptOwnFile` / `restoreHandStartedFile` on raw JSON. For a team: the `taskAgent` key plus a `/` → `A` prefix rebase of root, members, coordinator and handoffs, with an exact inverse (flat teams). Messages are keyed by run ids (`collaboration-communication-message-schema.ts:43`). Round-trip and revert tests are listed. |
| ARCH-F-001, ARCH-F-002 | Resolved | Resolved | — | unchanged |

- New or remaining finding IDs: None.
- Material classification changes: None (Large / High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`; informational pass to `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty: Project-delete revert caller (required addition); R-3 accepted; link-time equality incl. handoffs (implementation note).

### ARCH-REV-005 — SR-009 targeted re-review (CRR-005 F-002): renderer rule for the sidebar after adoption; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/design-review-report.md`
- Review round and trigger: round 5; SR-009 from `/software_engineering_team/solution_designer` after the code reviewer's failure-origin review CRR-005 (API/E2E F-002, Design Impact).
- Relevant solution revision IDs: `SR-009`
- Prior authoritative decision: `Pass`
- Current authoritative decision: `Pass`
- What changed in the review result:
  - The F-002 cause is verified in the renderer code. Open contexts become local rows, and there is no server history push.
  - The renderer-only rule is accepted: rule 1 on `task_execution_started` by run id; rule 2 drops history-origin local rows absent from a later read.
  - Side note: rule 2 also removes an open, inactive team run that the user archives (team archive keeps the local context), which is consistent with archive; to be confirmed by the implementer.
  - **Factual correction (implementer IR-004, commit `fbc0f805bf`, verified):** the side note's premise was wrong. Team archive already removes the local context (`archiveTeamRunRecord` → `cleanupStoredTeamRunLocalState` → `removeTeamContext`, `runHistoryMutationActions.ts:84-110, 236-241`), so rule 2 changes nothing for archived runs. Accepted refinement: rule 2 respects the agent history's `limitPerAgent` window. The decision (`Pass`) is unchanged.

#### Prior Finding Resolution

None open (ARCH-F-001..ARCH-F-003 remain resolved).

- New or remaining finding IDs: None.
- Material classification changes: None (Large / High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`; informational pass to `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty: Project-delete revert caller (round 4 requirement) still applies. The archived-team side note was withdrawn after IR-004.

### ARCH-REV-006 — SR-010 full adoption of the chain: Project-Task chain runs, chain step (2) order, AC-008 definition

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task-full-adoption/tickets/in-progress/link-existing-run-to-task/design-review-report.md`
- Review round and trigger: round 6; SR-010 from `/software_engineering_team/solution_designer` after AC-007 on the user's install. New worktree `link-existing-run-to-task-full-adoption`, base `7e215cdf49`.
- Relevant solution revision IDs: `SR-010`
- Prior authoritative decision: `Pass`
- Current authoritative decision: `Fail`
- What changed in the review result: the full-adoption design was checked against the merged code and read-only user data.
  - The target state, CM-7 chain location, eligibility and step placement are sound.
  - Found: chain runs tracked by Project Tasks (DEC-110 would cancel board Tasks; `project_task_manager_a5f6…` has 2 open); chain step (2) partial states and the release set; AC-008's equality wording.

#### Prior Finding Resolution

None open before this round (ARCH-F-001..ARCH-F-003 remain resolved).

- New or remaining finding IDs: ARCH-F-004 (Requirement Gap, High), ARCH-F-005 (Design Impact, Medium), ARCH-F-006 (Requirement Gap, Low)
- Material classification changes: None (Large / High).
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: stale handoff header; round-4 Project-delete revert requirement still applies.

### ARCH-REV-007 — SR-011 re-review: round-6 findings resolved; unowned chain runs unclassified (ARCH-F-007)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task-full-adoption/tickets/in-progress/link-existing-run-to-task/design-review-report.md`
- Review round and trigger: round 7; SR-011 from `/software_engineering_team/solution_designer`.
- Triggering role, report path, and finding IDs: Solution Designer; `design-review-report.md` (ARCH-REV-006); ARCH-F-004..ARCH-F-006.
- Relevant solution revision IDs: `SR-011`
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Fail`
- What changed in the review result: the three findings are verified resolved. The loader rule for two open entries is confirmed non-fatal (`deriveCurrent`). New: chain runs that belong to no Task are not classified; there are 11 such links in user data (converted collaborators).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-004 | Open (Requirement Gap, High) | Resolved | SR-011; REQ-008, AC-009, DEC-112 (the user) | Any chain with a board-Task entry, open or closed, is refused, naming the keys; nothing is written; eligibility updated |
| ARCH-F-005 | Open (Design Impact, Medium) | Resolved | SR-011; design §Full Adoption Of The Chain | Classification once from the pre-adoption temp-Task status; `delegated` appended before the old entry closes (window resolved by `deriveCurrent`, `task-execution-resource-service.ts:336-345`, later `linkedAt` wins); temp Task cancelled only after all its runs moved (empty release set); intermediate states stated exactly; the close-revert returns X caught between (1) and (3) to T; sub-step tests |
| ARCH-F-006 | Open (Requirement Gap, Low) | Resolved | SR-011; DEC-111 (the user); AC-008 reworded | Behavior-driving state equal (links, coordinators, hosts, current entries); history kept true and listed |

- New or remaining finding IDs: ARCH-F-007 (Design Impact, Medium).
- Material classification changes: None (Large / High).
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty: name the dedicated append operation (existing guards refuse); the requirements doc status line says SR-010; the round-4 Project-delete revert requirement still applies.

### ARCH-REV-008 — SR-012 re-review: unowned chain runs classified; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task-full-adoption/tickets/in-progress/link-existing-run-to-task/design-review-report.md`
- Review round and trigger: round 8; SR-012 from `/software_engineering_team/solution_designer`.
- Triggering role, report path, and finding IDs: Solution Designer; `design-review-report.md` (ARCH-REV-007); ARCH-F-007.
- Relevant solution revision IDs: `SR-012`
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Pass`
- What changed in the review result: ARCH-F-007 is verified resolved, and the dedicated Task-side operations are named (`appendAdoptedSubWork`, `closeAdoptedPriorEntry`, `rehostEntries`, adoption owner only). The requirements status line is updated.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-007 | Open (Design Impact, Medium) | Resolved | SR-012; DEC-113; design §Full Adoption Of The Chain | Class *unowned* (no Task entry anywhere): an open `delegated` entry in the adopted Task (host = the delegator), nothing closed. Retry: an open `delegated` entry in the adopted Task by the delegator means the Task-side step is done for any class; for *ongoing*, an open prior entry still present means only the close is left. Fixture plus natural-chain comparison. |
| ARCH-F-001..ARCH-F-006 | Resolved | Resolved | — | unchanged |

- New or remaining finding IDs: None.
- Material classification changes: None (Large / High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`; informational pass to `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty: `rehostEntries` idempotence; Project-delete revert caller (round 4).

### ARCH-REV-009 — SR-013 targeted re-review (DI-002): file-appended chain links, full revert, no temp-Task note; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task-full-adoption/tickets/in-progress/link-existing-run-to-task/design-review-report.md`
- Review round and trigger: round 9; SR-013 from `/software_engineering_team/solution_designer` after the implementer's DI-002 (`implementation-design-impact.md` §DI-002).
- Relevant solution revision IDs: `SR-013`
- Prior authoritative decision: `Pass`
- Current authoritative decision: `Pass`
- What changed in the review result:
  - DI-002's three points are verified in code (`standalone-root-tree-schema.ts:24-27`, `task-execution-tree-split.ts:137-155`, `ad-hoc-task.ts`), and the SR-013 resolutions are accepted.
  - File-appended chain links survive saves (`task-execution-tree-split.ts:186-205`) and are activated after T's link.
  - The revert returns every chain run to T and reverses the re-host for finished runs.
  - The temp Task is cancelled without a note.
  - Residual recorded: a returned ongoing or unowned run stays a closed-Task copy for messaging after the Task close (interruption plus close before retry only).

#### Prior Finding Resolution

None open (ARCH-F-001..ARCH-F-007 remain resolved).

- New or remaining finding IDs: None.
- Material classification changes: None (Large / High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`; informational pass to `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty: revert order for team T (restore T's file before re-adding links); `rehostEntries` idempotence; Project-delete revert caller (round 4).

### ARCH-REV-010 — SR-014 targeted re-review (DEC-114): board-Task chain runs handed to the delegator; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task-full-adoption/tickets/in-progress/link-existing-run-to-task/design-review-report.md`
- Review round and trigger: round 10; SR-014 from `/software_engineering_team/solution_designer` (the user's DEC-114 replaces DEC-112's refusal).
- Relevant solution revision IDs: `SR-014`
- Prior authoritative decision: `Pass`
- Current authoritative decision: `Pass`
- What changed in the review result:
  - The board class is verified against the Task rules (`assignedBy` for reopen and follow-up, `hostRoot` for stop and fence, the message-scope cut). It equals a natural direct delegation, so DEC-111 holds.
  - This supersedes ARCH-F-004's resolution path (a refusal) with the user's handover rule; the finding stays resolved.
  - Recorded: the closed current entry's `assignedBy` is rewritten (intended).
  - Clarification received during the round (design bullet updated in place): only a run whose current entry is `assigned` gets `reassignToDelegator` and the delegator as delegator in its own file and link; `delegated` sub-work of a board Task keeps its own delegator and is only re-hosted. This is consistent with the verified natural chain.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-004 | Resolved (refusal, SR-011) | Resolved (by handover, SR-014 / DEC-114) | REQ-008, AC-009, DEC-114 (the user) | Board Tasks are no longer cancelled or refused; the board run becomes the delegator's own assignment on its board Task |
| ARCH-F-001..ARCH-F-003, ARCH-F-005..ARCH-F-007 | Resolved | Resolved | — | unchanged |

- New or remaining finding IDs: None.
- Material classification changes: None (Large / High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`; informational pass to `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty: document the `assignedBy` rewrite on a closed current entry; earlier notes (revert order, `rehostEntries` idempotence, Project-delete revert caller).

### ARCH-REV-011 — SR-015 targeted check: commit-point placement accepted; completion after the commit point and revert text

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task-full-adoption/tickets/in-progress/link-existing-run-to-task/design-review-report.md`
- Review round and trigger: round 11; SR-015 from `/software_engineering_team/solution_designer` (the implementer's proposal, built in parallel).
- Relevant solution revision IDs: `SR-015`
- Prior authoritative decision: `Pass`
- Current authoritative decision: `Fail`
- What changed in the review result:
  - The placement is accepted: only reversible tree / own-file steps before T's link, every Task-side write after it, and the ARCH-REV-009 residual gone.
  - New: after the commit point, completion relies only on a `delegate_task` retry, which a closed or deleted Task refuses. The forward steps then never run, and the board worker is left unmanageable (ARCH-F-008).
  - The revert bullet still describes Task-side reversal (ARCH-F-009).

#### Prior Finding Resolution

None open before this round (ARCH-F-001..ARCH-F-007 remain resolved).

- New or remaining finding IDs: ARCH-F-008 (Design Impact, Medium), ARCH-F-009 (Design Impact, Low)
- Material classification changes: None (Large / High).
- Recommended recipient: `/software_engineering_team/solution_designer` (the implementer, building in parallel, should be told)
- Remaining risks or uncertainty: earlier notes still apply (Project-delete caller, `rehostEntries` idempotence, docs line for the `assignedBy` rewrite).

### ARCH-REV-012 — SR-016 targeted re-review: completion of a committed adoption; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task-full-adoption/tickets/in-progress/link-existing-run-to-task/design-review-report.md`
- Review round and trigger: round 12; SR-016 from `/software_engineering_team/solution_designer`.
- Triggering role, report path, and finding IDs: Solution Designer; `design-review-report.md` (ARCH-REV-011); ARCH-F-008, ARCH-F-009.
- Relevant solution revision IDs: `SR-016`
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Pass`
- What changed in the review result: both findings are verified resolved in the design.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-008 | Open (Design Impact, Medium) | Resolved | SR-016; design "Completion of a committed adoption"; tests (a)–(e) | After T's link the adoption is always finished, never reverted. `completeCommitted(delegatorRoot)` is idempotent and recognized from the files ("committed but pending"). It is called by the retry, on root load or activation (before serving the tree), and from DONE / CANCELLED, Task delete and Project delete before they act (on the root's queue when active, otherwise directly, with the activation at the next load). |
| ARCH-F-009 | Open (Design Impact, Low) | Resolved | SR-016; design "Revert of an unfinished adoption" | The revert applies only before the commit point and has no Task-side reversal: own file, link back, link out (T's file restored first), then T's own revert. |
| ARCH-F-001..ARCH-F-007 | Resolved | Resolved | — | unchanged |

- New or remaining finding IDs: None.
- Material classification changes: None (Large / High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`; informational pass to `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty: a cheap load-time check (H2); a test for the close-versus-load overlap; earlier notes (`rehostEntries` idempotence, docs line for the `assignedBy` rewrite).

### ARCH-REV-013 — SR-017 adoption contract: V-2..V-5 accepted; history actions during an in-progress adoption (ARCH-F-010)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task-full-adoption/tickets/in-progress/link-existing-run-to-task/design-review-report.md`
- Review round and trigger: round 13; SR-017 (`adoption-contract.md`, design-spec "Adoption Contract (SR-017)") from `/software_engineering_team/solution_designer`; the implementer resumes in parallel.
- Relevant solution revision IDs: `SR-017`
- Prior authoritative decision: `Pass`
- Current authoritative decision: `Fail`
- What changed in the review result:
  - The contract (cases, refusals R1–R12, order and recovery, validation V-1..V-18) and the additions V-2 (hub log merge), V-4 (own-entry classification) and V-5 (resume on D's load) are accepted. V-3 is accepted as far as it goes.
  - New: history delete or archive of T, and delete of D, remain possible while an adoption is in progress, leaving runs hidden or T blocked (ARCH-F-010).
  - Noted: the contract is still a draft for the user's read.

#### Prior Finding Resolution

None open before this round (ARCH-F-001..ARCH-F-009 remain resolved).

- New or remaining finding IDs: ARCH-F-010 (Design Impact, Medium)
- Material classification changes: None (Large / High).
- Recommended recipient: `/software_engineering_team/solution_designer` (tell the implementer)
- Remaining risks or uncertainty: user approval of the contract; earlier notes (cheap load-time check, close/load overlap test, `rehostEntries` idempotence, docs line for the `assignedBy` rewrite).

### Note — Package withdrawn after ARCH-REV-013 (2026-10-18)

The user withdrew the adoption feature entirely: the SR-017 revision is cancelled and the merged first version is to be reverted (Solution Designer message). No further review result is due; ARCH-F-010 is closed without resolution as moot. No new review round was recorded.
