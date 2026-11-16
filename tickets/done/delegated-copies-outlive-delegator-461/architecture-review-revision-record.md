# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (Large, High) | SR-007, SR-008, SR-009 | N/A | Fail | AR-001 … AR-010 |
| ARCH-REV-002 | Round 2 / new design SR-018 on the 469 base (contract revision 5) | SR-014 … SR-018 | Fail | Fail | Open: AR-004, AR-005, AR-008, AR-011 … AR-015. Resolved: AR-001, AR-002, AR-003, AR-006, AR-007, AR-009, AR-010 |
| ARCH-REV-003 | Round 3 / SR-019 answers ARCH-REV-002 | SR-019 | Fail | Fail | Open: AR-005 (narrowed). Resolved: AR-004, AR-008, AR-011 … AR-015 |
| ARCH-REV-004 | Round 4 / SR-020 answers ARCH-REV-003 (route (a)) | SR-020 | Fail | Fail | Open: AR-005 (narrowed again: prerequisite hold vs v1 `FAILED`) |
| ARCH-REV-005 | Round 5 / SR-021 answers ARCH-REV-004 (no prerequisite hold; four predecessors traced) | SR-021 | Fail | Pass | AR-005 (resolved) |
| ARCH-REV-006 | Round 6 / SR-022, contract revision 6 (TC-10 revised, TC-11) | SR-022 | Pass | Fail | AR-016, AR-017 (new) |
| ARCH-REV-007 | Round 7 / SR-023 answers ARCH-REV-006 | SR-023 | Fail | Pass | AR-016, AR-017 (resolved) |
| ARCH-REV-008 | Round 8 / SR-024, TC-12 (one team file shape) | SR-024 | Pass | Fail | AR-018 (new) |
| ARCH-REV-009 | Round 9 / SR-033 (TC-12 revised, TC-13, peer addresses, §2.4, executable model) | SR-025 … SR-033 | Fail | Fail | AR-018 (resolved technically, pending AR-019); AR-019, AR-020 (new) |
| ARCH-REV-010 | Round 10 / SR-034, SR-035 answer ARCH-REV-009 | SR-034, SR-035 | Fail | Pass | AR-018, AR-019, AR-020 (resolved) |
| ARCH-REV-011 | Round 11 (narrow note) / SR-036: old prefixed addresses corrected at use | SR-036 | Pass | Pass | None (one non-blocking note) |
| ARCH-REV-012 | Round 12 (narrow note) / SR-037: a run never delegates to its own definition | SR-037 | Pass | Pass | None |
| ARCH-REV-013 | Round 13 (narrow note) / SR-038: a peer child row's launches read from the peer | SR-038 | Pass | Pass | None |
| ARCH-REV-014 | Round 14 (narrow note) / SR-039: a child's launch saved by the child's own stopped-run save | SR-039 | Pass | Pass | None (one non-blocking note) |
| ARCH-REV-015 | Round 15 (narrow) / SR-040: the history poll from the view's projection | SR-040 | Pass | Fail | AR-021 (new) |
| ARCH-REV-016 | Round 16 (narrow) / SR-041 answers AR-021 | SR-041 | Fail | Fail | AR-021 (resolved); AR-022 (new) |
| ARCH-REV-017 | Round 17 (narrow) / SR-042 answers AR-022 | SR-042 | Fail | Fail | AR-022 (narrowed to the Team view) |
| ARCH-REV-018 | Round 18 (narrow) / SR-043, the Team view in place | SR-043 | Fail | Fail | AR-022 (narrowed to sequencing and idempotence) |
| ARCH-REV-019 | Round 19 (narrow) / SR-044, unsequenced and idempotent, session-ordered | SR-044 | Fail | Pass | AR-022 (resolved) |
| ARCH-REV-020 | Round 20 (narrow) / SR-045, the stream lives with the open view | SR-045 | Pass | Fail | AR-023 (new) |
| ARCH-REV-021 | Round 21 (narrow) / SR-046, stored and live view sessions | SR-046 | Fail | Pass | AR-023 (resolved) |
| ARCH-REV-022 | Round 22 (narrow) / SR-047, Principle 16 composition root | SR-047 | Pass | Pass | None (two non-blocking notes) |
| ARCH-REV-023 | Round 23 (narrow note) / SR-048, restore → live → post | SR-048 | Pass | Pass | None (one wording note) |
| ARCH-REV-024 | Round 24 (narrow) / SR-049, the tool path orchestrates; roots don't delegate | SR-049 | Pass | Pass | None (two non-blocking notes) |
| ARCH-REV-025 | Round 25 (narrow note) / SR-050, the application host's composition | SR-050 | Pass | Pass | None (one text note) |
| ARCH-REV-026 | Round 26 (narrow note) / SR-051, the application host's refusal text | SR-051 | Pass | Pass | None (note restated) |
| ARCH-REV-027 | Round 27 (narrow note) / SR-052, the application host composes steps 1–8 | SR-052 | Pass | Pass | None (note settled) |
| ARCH-REV-028 | Round 28 (narrow note) / SR-053, narrow `RunTaskRecords` port | SR-053 | Pass | Pass | None |
| ARCH-REV-029 | Round 29 (narrow note) / SR-054, contract follows today's results | SR-054 | Pass | Pass | None |
| ARCH-REV-030 | Round 30 (narrow) / SR-055, one listed-runs poll for every kind | SR-055 | Pass | Pass | None (one cost note) |
| ARCH-REV-031 | Round 31 (narrow note) / SR-056, row projection split by data lifetime | SR-056 | Pass | Pass | None |
| ARCH-REV-032 | Round 32 (narrow) / SR-057, peer children in the listed-runs poll | SR-057 | Pass | Pass | None |
| ARCH-REV-033 | Round 33 (narrow) / SR-058, collaboration context; rows at every depth | SR-058 | Pass | Pass | None (one wording note) |
| ARCH-REV-034 | Round 34 (narrow) / SR-059, in-run set is address reach | SR-059 | Pass | Pass | None (two notes) |
| ARCH-REV-035 | Round 35 / SR-060, delegation forest and each run's collaboration map | SR-060 | Pass | Pass | None (three notes) |
| ARCH-REV-036 | Round 36 / SR-061, the frontend contract in base's shapes | SR-061 | Pass | Fail | AR-024 |
| ARCH-REV-037 | Round 37 / SR-062, one view sequence per run | SR-062 | Fail | Fail | AR-025 (AR-024 resolved in substance) |
| ARCH-REV-038 | Round 38 / SR-063, RunViewStream is base's publisher | SR-063 | Fail | Pass | None (one wording note) |
| ARCH-REV-039 | Round 39 / SR-064, SR-065, rule 2's open parts | SR-065 | Pass | Pass | None (three notes) |
| ARCH-REV-040 | Round 40 / SR-066, peer child reached by its own identity | SR-066 | Pass | Pass | None (two notes) |
| ARCH-REV-041 | Round 41 / SR-067, every spine walked; G-1 … G-3 | SR-067 | Pass | Pass | None (one note) |
| ARCH-REV-042 | Round 42 (narrow) / SR-068, hasCollaboration returns | SR-068 | Pass | Pass | None (one note) |
| ARCH-REV-043 | Round 43 (narrow) / SR-069, a peer row takes no `@` | SR-069 | Pass | Pass | None |
| ARCH-REV-044 | Round 44 (narrow) / SR-070, DS-15, closed-Task input fence | SR-070 | Pass | Pass | None (one note) |
| ARCH-REV-045 | Round 45 (narrow) / SR-071, refusal order R-8 before R-7; R-12 | SR-071 | Pass | Pass | None |
| ARCH-REV-046 | Round 46 / SR-072, Team tab messages; CR-461-055 decisions | SR-072 | Pass | Fail | AR-026 |
| ARCH-REV-047 | Round 47 (narrow) / AR-026 answered, log read after the base | SR-072 | Fail | Pass | None (one note) |
| ARCH-REV-048 | Round 48 (narrow) / SR-074, one in-view rule for read and live | SR-074 | Pass | Pass | None (one note) |
| ARCH-REV-049 | Round 49 (narrow) / SR-078, preserved copy's row; unconvertible root | SR-078 | Pass | Fail | AR-027 |
| ARCH-REV-050 | Round 50 (narrow) / AR-027 answered, follow-up migration | SR-078 | Fail | Pass | None (one note) |
| ARCH-REV-051 | Round 51 (narrow) / CR-461-073, connect answers the admission reason | SR-078 | Pass | Pass | None |
| ARCH-REV-052 | Round 52 / SR-079, every late predecessor classified; follow-ups | SR-079 | Pass | Pass | None (two notes) |
| ARCH-REV-053 | Round 53 (narrow) / SR-081, correction before step 2 | SR-081 | Pass | Pass | None |
| ARCH-REV-054 | Round 54 / SR-082, run-tree view and statuses by run ID | SR-082 | Pass | Fail | AR-028 |
| ARCH-REV-055 | Round 55 (narrow) / AR-028 answered, RUN_TREE_CHANGED for listed runs | SR-082 | Fail | Pass | None (two notes) |
| ARCH-REV-056 | Round 56 (narrow) / SR-083, SR-082 narrowed; rows carry openTarget | SR-083 | Pass | Pass | None (one note) |
| ARCH-REV-057 | Round 57 / SR-084, server-built run tree reinstated | SR-084 | Pass | Pass | None (two notes) |
| ARCH-REV-058 | Round 58 / SR-085, named losses; a run's own stream with a snapshot | SR-085 | Pass | Fail | AR-029 |
| ARCH-REV-059 | Round 59 (narrow) / AR-029 answered, segment offsets | SR-085 | Fail | Pass | None (one note) |
| ARCH-REV-060 | Round 60 / SR-086, view spines walked; ten gaps | SR-086 | Pass | Fail | AR-030 |
| ARCH-REV-061 | Round 61 (narrow) / AR-030 answered, offsets from node B | SR-086 | Fail | Pass | None (one note) |
| ARCH-REV-062 | Round 62 / SR-087, each turn from one source | SR-087 | Pass | Fail | AR-031 |
| ARCH-REV-063 | Round 63 (narrow) / AR-031 answered, stored filter by turn_id | SR-087 | Fail | Pass | None |
| ARCH-REV-064 | Round 64 (narrow) / SR-088, peer agent conversation from node B's agent stream | SR-088 | Pass | Fail | AR-032 |
| ARCH-REV-065 | Round 65 (narrow) / SR-089, every AgentRun gets a stream sequence | SR-089 | Fail | Pass | None (one note) |
| ARCH-REV-066 | Round 66 (narrow) / SR-090, peer Retry over the status connection | SR-090 | Pass | Pass | None (one note) |

## Revision Entries

### ARCH-REV-001 — First review of the first step (local delegation through links)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461/tickets/in-progress/delegated-copies-outlive-delegator-461/design-review-report.md`
- Review round and trigger: 1; Solution Designer's Architecture Design Complete, `handoff-architecture-design-complete.md`
- Triggering role, report path, and finding IDs: Solution Designer; N/A
- Relevant solution revision IDs: SR-007 (requirements), SR-009 (design)
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` (`Design Impact`)
- What changed in the review result or what baseline was established: baseline established. The direction (one delegation form, an in-process link channel, renames, one migration) is confirmed sound. Ten findings: AR-001 … AR-005 High (Task membership of an independent run; non-pair message routes; derived consumers of the composed tree; restart resume and `busy-runs.json`; migration E3/E4 sub-cases), AR-006 … AR-008 Medium (listing source vs QR-004; archive/delete of a delegated run; collaboration stream connect starts the host), AR-009 … AR-010 Low (peer-only file placement; stale investigation notes).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 … AR-010
- Material classification changes: none (`Large` / `High` confirmed)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: the design is from reading only; MP-002 (E3 split) is unclear until counted.

### ARCH-REV-002 — New design on the 469 base (SR-018, contract revision 5)

- Canonical design review report: same path as above
- Review round and trigger: 2; Solution Designer's Architecture Design Complete for SR-018 (commit `2458d808ed`, base `827f1e68dc`). A new design that answers AR-001 … AR-010
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-design-complete.md`; AR-001 … AR-010
- Relevant solution revision IDs: SR-014 … SR-018
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Fail` (`Design Impact`)
- What changed in the review result or what baseline was established:
  - Confirmed sound: the Task entry's `delegatedFrom` as the one record; every run its own root for three run kinds; Task-centered messaging (validated on 1,604 messages); DS-11 with history rows; the ordering table.
  - Open from round 1: AR-004 (notice line), AR-005 (removals of files and lists that released migrations still own; guideline checklist), AR-008 (connect still starts the host).
  - New: AR-011 (commands to a local child, notably tool approval), AR-012 (team/org token roll-up), AR-013 (log writer and order across two roots), AR-014 (agents of a stopped delegating team/org run), AR-015 (requirements doc stale).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | DS-1, DS-5, DS-6; the Task entry is the membership | Closure, reopen and status go by the run's own identity. Residual: state the role and owned-sender decision in DS-1 |
| AR-002 | Open (High) | Resolved | Contract §10, DEC-011 (user), validation on 1,604 messages | The one remaining route gap is new: AR-014 |
| AR-003 | Open (High) | Resolved (standalone and location consumers) | Readers table | The team/org roll-up is new: AR-012 |
| AR-004 | Open (High) | Still open, narrowed (Medium) | DS-9; migration step 7 | The record is fixed. The delegator's notice line (`restart-notice.ts:26-27`) is not addressed |
| AR-005 | Open (High) | Still open, narrowed (High) | DS-10 | Nested shapes resolved. Steps 5/6 removals versus 469's kept entries, and the §2 checklist, are open |
| AR-006 | Open (Medium) | Resolved | One source, `openRunsDelegatedFrom` | — |
| AR-007 | Open (Medium) | Resolved | An ordinary run; TC-2 by open Task entries | — |
| AR-008 | Open (Medium) | Still open | DS-8 asserts the outcome only | `agent-collaboration-stream-handler.ts:59-62, 73, 148` at `827f1e68dc` |
| AR-009 | Open (Low) | Resolved | `DelegatedRunStarter`; idle shutdowns renamed | — |
| AR-010 | Open (Low) | Resolved | Notes re-investigation section | The stale requirements doc is new: AR-015 |

- New or remaining finding IDs: AR-004, AR-005, AR-008, AR-011, AR-012, AR-013, AR-014, AR-015
- Material classification changes: none (`Large` / `High`)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: the code is not validated, by the design's own statement. The implementation verifies the readers table file by file.

### ARCH-REV-003 — Answers to round 2 (SR-019)

- Canonical design review report: same path as above
- Review round and trigger: 3; SR-019 (commit `87ea87593d`)
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-design-complete.md`; AR-004, AR-005, AR-008, AR-011 … AR-015
- Relevant solution revision IDs: SR-019
- Prior authoritative decision: `Fail` (ARCH-REV-002)
- Current authoritative decision: `Fail` (`Design Impact`)
- What changed in the review result or what baseline was established:
  - Seven findings are resolved and verified against the code: the runner's prerequisite hold, the peer path's send order, the remote child path, the token enricher, the notice and the connect path.
  - AR-005 remains, narrowed. A preserved run's Task entry stays in the old shape, and the strict per-entry parse then damages its whole Task (`task-execution-resource-schema.ts:19-66`; `task-execution-resource-service.ts:56-63`). That contradicts AC-014.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-004 | Open (Medium) | Resolved | DS-9 notice by `delegatingRun` | `restart-notice.ts:26-27` replaced |
| AR-005 | Open (High) | Still open, narrowed | DS-10: prerequisites, partial states, retry, checklist | Runner `:145-157` confirmed. New narrow gap: Task entries of preserved runs |
| AR-008 | Open (Medium) | Resolved | DS-8, removal plan, step 7 | Connect path named for three stream kinds |
| AR-011 | Open (High) | Resolved | `DelegatedRunCommands` | Covers the commands the remote path lacks |
| AR-012 | Open (Medium) | Resolved | Readers table; REQ-009 | Totals over the Task entries; results unchanged |
| AR-013 | Open (Medium) | Resolved | DS-2 | Same order as `remote-message-send.ts` |
| AR-014 | Open (Medium) | Resolved | Ownership Map, `TaskRunIndex` | Agents of every delegating run mapped |
| AR-015 | Open (Low) | Resolved | Requirements corrected | Checked: supplements, SCN-002, REQ-005, REQ-009 |

- New or remaining finding IDs: AR-005
- Material classification changes: none (`Large` / `High`)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: the read-once index assumes a run's agents are fixed at creation; refresh on a miss if an org's members can change.

### ARCH-REV-004 — DS-10 route (a) and the index residual (SR-020)

- Canonical design review report: same path as above
- Review round and trigger: 4; SR-020 (commit `4b7b9fbf4e`)
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-design-complete.md`; AR-005 and the index residual
- Relevant solution revision IDs: SR-020
- Prior authoritative decision: `Fail` (ARCH-REV-003)
- Current authoritative decision: `Fail` (`Design Impact`)
- What changed in the review result or what baseline was established:
  - Resolved: the mixed-shape Task file (every entry converted, plus a fixture) and the org re-read residual.
  - AR-005 is narrowed again. v1 records `FAILED` on any per-run failure (`task-agent-own-run-v1-app-data-migration.ts:129-132`), and the runner keeps it pending (`app-data-migration-runner.ts:190`). The prerequisite hold, which round 2 asked for, then keeps this migration from running, and the new runtime reads only old-shape Task files: a node-wide lockout (MP-C).
  - The preserved-partial-state branch covers a state v1 reaches only with `FAILED`, not with a warning success.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-005 | Open (narrow: mixed-shape Task file) | That case is resolved; still open, narrowed to the prerequisite hold | DS-10 step 1, checklist 4 and 9, fixture | v1's status rule `:129-132`; runner `:145-157, 190` |

- New or remaining finding IDs: AR-005
- Material classification changes: none (`Large` / `High`)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: check the other three prerequisites' failure statuses the same way. Round 2 recommended the prerequisite hold without tracing v1's failure status; this round corrects that.

### ARCH-REV-005 — DS-10 without a prerequisite hold (SR-021)

- Canonical design review report: same path as above
- Review round and trigger: 5; SR-021 (commit `8370cb9d3e`)
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-design-complete.md`; AR-005
- Relevant solution revision IDs: SR-021
- Prior authoritative decision: `Fail` (ARCH-REV-004)
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established:
  - No prerequisite hold; the migration is registered after the four predecessors, each traced.
  - Every Task entry is converted in every case, and unfinished predecessor items are preserved per item.
  - Verified: `runPending` continues past failures (`app-data-migration-runner.ts:79-100`), v2's tree reads are limited to team and org trees, and no predecessor holds back a capability.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-005 | Open (High) | Resolved | DS-10 (no `prerequisiteMigrationIds`; per-item preservation; checklist items 2, 4 and 9; tests) | Runner `:79-100, 190`; v2 `…-app-data-migration.ts:111-113, 164-174` |

- New or remaining finding IDs: none
- Material classification changes: none (`Large` / `High`)
- Recommended recipient: Implementation Engineer (primary); Solution Designer (informational)
- Remaining risks or uncertainty: the readers table is verified file by file in implementation; the API/E2E round covers all three root kinds.

### ARCH-REV-006 — Contract revision 6: the run's own `delegatedFrom` and `DelegationTree` (SR-022)

- Canonical design review report: same path as above
- Review round and trigger: 6; SR-022 (commit `6f5e98203a`), after the user stopped implementation and decided TC-10 revised and TC-11
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-design-complete.md`; none
- Relevant solution revision IDs: SR-022
- Prior authoritative decision: `Pass` (ARCH-REV-005)
- Current authoritative decision: `Fail` (`Design Impact`)
- What changed in the review result or what baseline was established:
  - Accepted: the two copies (the user's decision; equal by rule, validated), `DelegationTree` as the one owner of relationships and `canMessage` (validated as a forest and by 230 pairs), `CrossRunMessageDelivery`'s order, and DS-10 step 4.
  - New:
    - AR-016: existing readers treat a run file's `delegatedFrom` as "started by a peer", so a local copy would build a peer delegator endpoint, among other effects.
    - AR-017: the tree's currency at the gate head re-check.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 … AR-015 | Resolved | Resolved | SR-022 keeps their answers (AR-014's index is now `DelegationTree`) | Changed sections read |

- New or remaining finding IDs: AR-016, AR-017
- Material classification changes: none (`Large` / `High`)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: the equality of the two copies relies on "later Tasks only from the assigner"; keep the test.

### ARCH-REV-007 — Answers to round 6 (SR-023)

- Canonical design review report: same path as above
- Review round and trigger: 7; SR-023 (commit `27a6487265`)
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-design-complete.md`; AR-016, AR-017
- Relevant solution revision IDs: SR-023
- Prior authoritative decision: `Fail` (ARCH-REV-006)
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established:
  - `isDelegated` and `isPeerStarted`, with a decision for every listed reader.
  - The tree is updated synchronously inside the Task's ordered change, and the gate-head re-check reads the port's `isOpen`.
  - Contract §13 is consistent with the rules, and the DS-10 `collaborators` detail is correct.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-016 | Open (High) | Resolved | Readers table row; contract §2.4; tests | Each reader at `827f1e68dc` from round 6 has its decision |
| AR-017 | Open (Medium) | Resolved | Ordering section; contract §2.6; interleaving test | Synchronous notice; the re-check reads `isOpen` |

- New or remaining finding IDs: none
- Material classification changes: none (`Large` / `High`)
- Recommended recipient: Implementation Engineer (primary); Solution Designer (informational)
- Remaining risks or uncertainty: the equality test of the two copies; per-file reader decisions in implementation.

### ARCH-REV-008 — TC-12: one team file shape (SR-024)

- Canonical design review report: same path as above
- Review round and trigger: 8; SR-024 (commit `7fa163d94b`), after the Implementation Engineer's Design Impact on the delegated team file
- Triggering role, report path, and finding IDs: Implementation Engineer, through the Solution Designer; `handoff-architecture-design-complete.md`; none
- Relevant solution revision IDs: SR-024
- Prior authoritative decision: `Pass` (ARCH-REV-007)
- Current authoritative decision: `Fail` (`Design Impact`)
- What changed in the review result or what baseline was established:
  - Accepted: TC-12's direction (the root address is the team's own address; no stored address changes) and the migration of the team fields.
  - New, AR-018:
    - Many server and web readers equate the root team or the team-level scope with `/` (for example `team-run-config.ts:192` throws for any other root; the team Settings selection is `/`).
    - Handoffs are compiled against the team's own topology at plan time (`collaboration-handoff-compiler.ts:73`), not resolved later through §10.3, so the 2 `/Teacher` teams would not plan.
    - Only the schema is generalized.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 … AR-017 | Resolved | Resolved | Not affected by TC-12 | — |

- New or remaining finding IDs: AR-018
- Material classification changes: none (`Large` / `High`)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: as round 7.

### ARCH-REV-009 — Round 9: TC-12 revised and the executable model (SR-033)

- Canonical design review report: same path as above
- Review round and trigger: 9; Architecture Design Complete for SR-033 (commit `3605a2ab74`)
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-design-complete.md`; AR-018
- Relevant solution revision IDs: SR-025 … SR-033
- Prior authoritative decision: `Fail` (ARCH-REV-008)
- Current authoritative decision: `Fail` (`Requirement Gap` and `Design Impact`)
- What changed in the review result or what baseline was established:
  - Accepted: TC-12 revised as a structure (every team at `/`; no reader of `/` changes; external handoff targets), TC-13, the peer member addresses, contract §2.4, and the executable model as a reference. Its checks pass when run on the ticket folder.
  - New:
    - AR-019: TC-12 revised and D3 change agent-facing addresses and texts, contrary to the approved non-goal; the user was informed, not asked.
    - AR-020: the model and S19 stop a peer's run on Task closure, while the approved scope and DS-5 keep it fenced (`remote-endpoint.ts:44-46`).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-018 | Open (High) | Resolved technically; stands once AR-019 is decided | TC-12 revised (SR-025); DS-10 step 4; the handoff compiler's external target | No reader of `/` changes; 153 of 153 rebased without a collision |
| AR-001 … AR-017 | Resolved | Resolved | — | — |

- New or remaining finding IDs: AR-019, AR-020
- Material classification changes: none (`Large` / `High`)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: implementation is ahead of the design approval on the branch.

### ARCH-REV-010 — Answers to round 9 (SR-034, SR-035)

- Canonical design review report: same path as above
- Review round and trigger: 10; SR-035 (commit `f86ad20aa4`)
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-design-complete.md` ("Round 10"); AR-019, AR-020, and the round-9 model note
- Relevant solution revision IDs: SR-034, SR-035
- Prior authoritative decision: `Fail` (ARCH-REV-009)
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established:
  - The user decided AR-019 (option 1), and the requirements record the exception.
  - The model and S19 fence a peer's run on closure.
  - Address step 2 applies by the run's entries.
  - The checks pass.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-018 | Resolved technically, pending AR-019 | Resolved | SR-035 | TC-12 revised decided by the user |
| AR-019 | Open (Requirement Gap) | Resolved | SR-035; `requirements-doc.md:76` | The user's words recorded |
| AR-020 | Open (High) | Resolved | SR-034; `model.py`; `stories.py` S19 | Fence matches `remote-endpoint.ts:44-46`; `--check` passes |

- New or remaining finding IDs: none
- Material classification changes: none (`Large` / `High`)
- Recommended recipient: Implementation Engineer (primary); Solution Designer (informational)
- Remaining risks or uncertainty: reconcile the branch's earlier implementation with contract revision 8.

### ARCH-REV-011 — Narrow note: SR-036

- Canonical design review report: same path as above
- Review round and trigger: 11; SR-036 (commit `218e1d3dde`), the Solution Designer's narrow note answering the Implementation Engineer's Unclear on "told once"
- Prior authoritative decision: `Pass` (ARCH-REV-010)
- Current authoritative decision: `Pass`
- What changed: an old prefixed address is refused with a correction computed from the Task entry; nothing is stored or notified. Within the user's SR-035 decision and less agent-visible than what was approved. Non-blocking note: order the correction after step 2 (or test that `recipientAddress` never equals one of the assigner's standing addresses).

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply to the note)

### ARCH-REV-012 — Narrow note: SR-037

- Canonical design review report: same path as above
- Review round and trigger: 12; SR-037 (commit `0420f7e0f4`), the Solution Designer's narrow note after the Implementation Engineer's Unclear
- Prior authoritative decision: `Pass` (ARCH-REV-011)
- Current authoritative decision: `Pass`
- What changed: SR-025's DL-11 "new copy" is withdrawn; the model refuses a run's own definition, matching `collaborator-candidate-policy.ts:181` and autobyteus-455 AC-006. The user's exception only narrows. `--check` passes.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply to the note)

### ARCH-REV-013 — Narrow note: SR-038

- Canonical design review report: same path as above
- Review round and trigger: 13; SR-038 (commit `6c19bc7e83`), the Solution Designer's narrow note after the Implementation Engineer's Unclear
- Prior authoritative decision: `Pass` (ARCH-REV-012)
- Current authoritative decision: `Pass`
- What changed: a peer child row's launches are read from the peer's read-only summary (`peer-gateway.ts:231-234`), from the run's own file there; nothing is stored on the delegating node. REQ-004 and P4 hold. `--check` passes.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply to the note)

### ARCH-REV-014 — Narrow note: SR-039

- Canonical design review report: same path as above
- Review round and trigger: 14; SR-039 (commit `394bb81719`), the Solution Designer's narrow note after the Implementation Engineer's Unclear
- Prior authoritative decision: `Pass` (ARCH-REV-013)
- Current authoritative decision: `Pass`
- What changed: a stopped child's launch edited in the delegator's Settings goes to the child's own stopped-run save (check first, then apply in order, partial failure reported per run). Ownership is kept; the loss of atomicity is a proportionate trade-off. Non-blocking note: report a partial failure through an existing outcome code, since the web is unchanged.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply to the note)

### ARCH-REV-015 — Narrow: SR-040, the history poll

- Canonical design review report: same path as above
- Review round and trigger: 15; SR-040 (commit `02494288ec`), answering code review CRR-003 CR-461-002
- Prior authoritative decision: `Pass` (ARCH-REV-014)
- Current authoritative decision: `Fail` (`Design Impact`)
- What changed:
  - Accepted: the poll as a second consumer of the view's projection, never restoring; one web rule; the stopped-host branch removed.
  - New, AR-021: the poll keeps a constant `closedTaskExecutionsDigest`, and the web rule compares it, which is a dead branch in files SR-040 touches. FU-008 defers other hosting-only fields this ticket makes dead, although their files are touched (ticket-scope: dead code in touched files is this ticket's).

#### Prior Finding Resolution

None open before this round.

- New or remaining finding IDs: AR-021
- Recommended recipient: Solution Designer

### ARCH-REV-016 — Narrow: SR-041, answer to AR-021

- Canonical design review report: same path as above
- Review round and trigger: 16; SR-041 (commit `9a4f254ac6`)
- Prior authoritative decision: `Fail` (ARCH-REV-015)
- Current authoritative decision: `Fail` (`Design Impact`)
- What changed:
  - AR-021 resolved: no digest; every former FU-008 item removed here with its files; FU-008 withdrawn. The residual on agent addresses in the tree is resolved.
  - New, AR-022: with the hosting lifecycle's started, closed and reopened events removed, no live path updates an **open** view's child rows (the poll covers only runs that are not open).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-021 | Open (Medium) | Resolved | SR-041; DS-8; the removal plan; `follow-ups.md` FU-008 withdrawn | Digest absent from DS-8; each item listed with its files |

- New or remaining finding IDs: AR-022
- Recommended recipient: Solution Designer

### ARCH-REV-017 — Narrow: SR-042, live child rows

- Canonical design review report: same path as above
- Review round and trigger: 17; SR-042 (commit `567416afc0`)
- Prior authoritative decision: `Fail` (ARCH-REV-016)
- Current authoritative decision: `Fail` (`Design Impact`)
- What changed:
  - Accepted: `childRowsChanged` from the tree, the single owner `ChildRowsFeed`, the order, never starting X, and the agent-run and org views re-reading through `checkpoint_required`.
  - AR-022 narrowed: the Team client has no `checkpoint_required`. Today it inserts started records in place, and its only re-read is the manual recovery that drops pending sends, interrupts and approvals (`TeamStreamingService.ts:364-427`). It needs records in the event or a named automatic re-read.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-022 | Open (Medium-High) | Still open, narrowed to the Team view | SR-042; DS-8 | `teamExecutionViewState.ts:385-402`; `TeamStreamingService.ts:364-427` |

- New or remaining finding IDs: AR-022
- Recommended recipient: Solution Designer

### ARCH-REV-018 — Narrow: SR-043, the Team view in place

- Canonical design review report: same path as above
- Review round and trigger: 18; SR-043 (commit `bc83ed7ea4`)
- Prior authoritative decision: `Fail` (ARCH-REV-017)
- Current authoritative decision: `Fail` (`Design Impact`)
- What changed:
  - Accepted: rows carried in the event, the Team view applying them in place without recovery, and the corrected DS-8 sentence.
  - AR-022 narrowed: the Team client requires the exact next `change_sequence` (a gap leads to manual recovery), and an unsequenced event can race the snapshot, where the insert throws on a held run. DS-8 names neither the sequence owner for a stopped team run nor duplicate and missing-row handling.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-022 | Open (Team view) | Still open, narrowed to sequencing and idempotence | SR-043; DS-8 | `teamExecutionViewState.ts:290-291, 370-371` |

- New or remaining finding IDs: AR-022
- Recommended recipient: Solution Designer

### ARCH-REV-019 — Narrow: SR-044

- Canonical design review report: same path as above
- Review round and trigger: 19; SR-044 (commit `93af93a01f`)
- Prior authoritative decision: `Fail` (ARCH-REV-018)
- Current authoritative decision: `Pass`
- What changed: the child-row event is unsequenced and applied by membership (idempotent). The stream session holds events published during a snapshot build and sends them after the snapshot. No dependency on a stopped team's root; no gap or recovery possible.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-022 | Open (sequencing and idempotence) | Resolved | SR-044; DS-8 | Membership apply; session hold; tests for a stopped team, a racing snapshot, duplicates |

- New or remaining finding IDs: none
- Recommended recipient: Implementation Engineer (primary); Solution Designer (informational)
- Remaining risks or uncertainty: FIFO flush of held events (test).

### ARCH-REV-020 — Narrow: SR-045, the view stream for a stopped run

- Canonical design review report: same path as above
- Review round and trigger: 20; SR-045 (commit `e664c088ef`), answering code review CRR-005 CR-461-006
- Prior authoritative decision: `Pass` (ARCH-REV-019)
- Current authoritative decision: `Fail` (`Design Impact`)
- What changed:
  - Accepted: the web's rule (stream with the open view; readiness; child commands to the child's root) and the standalone server, where a loaded root does not make the run active.
  - New, AR-023: the team connect restores a stopped team (`team-run-service.ts:215-219`), which makes it managed and therefore active (Settings `RUN_ACTIVE`, archive "managed"), and the org connect serves only an active run (`agent-org-stream-handler.ts:53`). DS-8's "never starts or restores the run" holds for the standalone stream only.

#### Prior Finding Resolution

None open before this round.

- New or remaining finding IDs: AR-023
- Recommended recipient: Solution Designer

### ARCH-REV-021 — Narrow: SR-046

- Canonical design review report: same path as above
- Review round and trigger: 21; SR-046 (commit `d95ed86fa7`)
- Prior authoritative decision: `Fail` (ARCH-REV-020)
- Current authoritative decision: `Pass`
- What changed: no stream kind restores its run to serve a view. Team and org sessions have a stored mode (from the stored file, through the same projection) and a live mode, switching on the lifecycle with an in-band snapshot (`teamExecutionViewState.ts:330-333`).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-023 | Open (High) | Resolved | SR-046; DS-8 | Stored mode never restores; the in-band snapshot takes a new sequence base |

- New or remaining finding IDs: none
- Recommended recipient: Implementation Engineer (primary); Solution Designer (informational)
- Remaining risks or uncertainty: the mode-switch snapshot must keep the restoring member's input state (test).

### ARCH-REV-022 — Narrow: SR-047, Principle 16

- Canonical design review report: same path as above
- Review round and trigger: 22; SR-047 (commit `07e2a5f81a`), applying the updated Core Principle 16
- Prior authoritative decision: `Pass` (ARCH-REV-021)
- Current authoritative decision: `Pass`
- What changed: the seven process bindings and nine absence fallbacks this ticket added are removed. One composition root creates the owners in a written order, a missing owner is a startup error, and tests use constructor fakes. The Principle 16 check line passes. Notes: move `childRowsFeed.follow` to after its creation, with the stream session registry as its own owner; an unset entries listener must fail.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Implementation Engineer (primary); Solution Designer (informational)

### ARCH-REV-023 — Narrow note: SR-048

- Canonical design review report: same path as above
- Review round and trigger: 23; SR-048 (commit `cd1a170883`), after the Implementation Engineer found a send that could hang
- Prior authoritative decision: `Pass` (ARCH-REV-022)
- Current authoritative decision: `Pass`
- What changed: restore, then an in-band live snapshot and subscription, then post. The echo settles the send through the `teamSends` tracker (`teamSendAdmission.ts:60-70`). The round-21 residual is superseded. Wording note: DS-8 line 199 should name the send tracker, not `:335-338`.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply to the note)

### ARCH-REV-024 — Narrow: SR-049

- Canonical design review report: same path as above
- Review round and trigger: 24; SR-049 (commit `ebcb3a0f52`), after the Implementation Engineer found a cycle in SR-047's order
- Prior authoritative decision: `Pass` (ARCH-REV-023)
- Current authoritative decision: `Pass`
- What changed: roots answer only for their own run; `TaskDelegation` and the dispatcher orchestrate (in line with Principle 13); dependencies run one way. Agents reach the tool services through the framework's registry and existing initializers, installed at step 8, so there is no construction cycle. The round-22 notes are applied. Notes: name that tool path in the section; drop the duplicate router bullet.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply)

### ARCH-REV-025 — Narrow note: SR-050

- Canonical design review report: same path as above
- Review round and trigger: 25; SR-050, after the Implementation Engineer found the application host as a second composition root
- Prior authoritative decision: `Pass` (ARCH-REV-024)
- Current authoritative decision: `Pass`
- What changed: the application host composes steps 1–3 and passes explicit null collaborators that keep today's "no delegation" behavior. Application-owned runs can't delegate at base (`collaborator-admission.ts:112`). Note: keep the application-root refusal text ahead of `TASKS_UNAVAILABLE_TEXT`.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply)

### ARCH-REV-026 — Narrow note: SR-051

- Canonical design review report: same path as above
- Review round and trigger: 26; SR-051, correcting ARCH-REV-025's note
- Prior authoritative decision: `Pass` (ARCH-REV-025)
- Current authoritative decision: `Pass`
- What changed:
  - SR-051's evidence (`delegateThrough`) describes branch code. At base the app host binds Task resources, and delegation is refused at placement, not with "Tasks are not available here".
  - My round-25 note's mechanism was imprecise; its aim stands.
  - Restated note: assert the text an application-owned run gets at base, captured by a base-revision test, or record that such agents have no `delegate_task`.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply)

### ARCH-REV-027 — Narrow note: SR-052

- Canonical design review report: same path as above
- Review round and trigger: 27; SR-052, replacing SR-050 and SR-051 after ARCH-REV-026
- Prior authoritative decision: `Pass` (ARCH-REV-026)
- Current authoritative decision: `Pass`
- What changed: the application host composes the same steps 1–8; base's placement refusals hold by construction; the stand-ins are withdrawn; a characterization test at base covers the texts. The round-25 and round-26 note is settled. Non-blocking: missing host pieces are passed as explicit real equivalents.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply)

### ARCH-REV-028 — Narrow note: SR-053

- Canonical design review report: same path as above
- Review round and trigger: 28; SR-053 (commit `3b4599da72`), after the Implementation Engineer found a second composition cycle
- Prior authoritative decision: `Pass` (ARCH-REV-027)
- Current authoritative decision: `Pass`
- What changed: run services take a narrow `RunTaskRecords` port (`isOpen`, `statusChanged`) built from step 1's records and the change marks; `ProjectTaskService` at step 5 takes `TaskRunControl`. The cycle is split by a narrower collaborator (Principle 16); `isOpen` still reads the authority (AR-017).

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply)

### ARCH-REV-029 — Narrow note: SR-054

- Canonical design review report: same path as above
- Review round and trigger: 29; SR-054 (commit `5a84b71feb`), resolving code review CRR-008's Requirement Gaps
- Prior authoritative decision: `Pass` (ARCH-REV-028)
- Current authoritative decision: `Pass`
- What changed: the contract's delivery texts, peer-delegation refusal and refusal shape match today's code (verified `remote-refusal-codes.ts:31, 37`; `send-message-to-dispatcher.ts:101`). The org story uses the real mounted-team copy, and the external handoff target is limited to delegated-team planning. Checks pass.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply)

### ARCH-REV-030 — Narrow: SR-055

- Canonical design review report: same path as above
- Review round and trigger: 30; SR-055 (commit `a8a6495d2c`), answering code review CRR-012 CR-461-021
- Prior authoritative decision: `Pass` (ARCH-REV-029)
- Current authoritative decision: `Pass`
- What changed: one `runCollaborationStatuses(runs: [{kind, runId}])` for every kind, carrying child row records from the view's projection, with nothing restored; the web builds listed, not-open runs' rows from it; the SR-040/041 re-read is withdrawn. Note: build the poll's rows from the tree's per-run data, not from per-tick file reads.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply)

### ARCH-REV-031 — Narrow note: SR-056

- Canonical design review report: same path as above
- Review round and trigger: 31; SR-056, after the Implementation Engineer found a conflict between SR-055 and the ARCH-REV-030 note
- Prior authoritative decision: `Pass` (ARCH-REV-030)
- Current authoritative decision: `Pass`
- What changed: the row identity (fixed for the run's life) is built once from the tree's data and is the poll's `row`; the view adds the launch, read fresh. My ARCH-REV-030 note wrongly assumed the whole row was fixed. Verified: the list's delegated rows show no launch details, so the identity suffices.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply)

### ARCH-REV-032 — Narrow: SR-057

- Canonical design review report: same path as above
- Review round and trigger: 32; SR-057, answering code review CRR-013 CR-461-027
- Prior authoritative decision: `Pass` (ARCH-REV-031)
- Current authoritative decision: `Pass`
- What changed: the poll's answer includes peer children, with their identity from the tree in memory and no statuses or per-poll peer calls. Verified that at base a listed, not-open run's peer rows had no live status either (summaries arrive only through an open stream).

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply)

### ARCH-REV-033 — Narrow: SR-058

- Canonical design review report: same path as above
- Review round and trigger: 33; SR-058 (commit `ae3bdc30ba`), answering code review CRR-016 CR-461-030 and CR-461-033
- Prior authoritative decision: `Pass` (ARCH-REV-032)
- Current authoritative decision: `Pass`
- What changed: `RunCollaborationContext` derives the task-agent role, the organization line and an org copy's handoffs and instruction, with nothing stored and base texts kept. Views, the feed and the poll carry the open subtree through one row builder; the feed reaches ancestors. Wording note: the DS-8 spine still says one hop and own-file identity.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply)

### ARCH-REV-034 — Narrow: SR-059

- Canonical design review report: same path as above
- Review round and trigger: 34; SR-059 (commit `9bec10150c`), the Implementation Engineer's Design Impact on CR-461-032 (CPW-M2, CPW-M5)
- Prior authoritative decision: `Pass` (ARCH-REV-033)
- Current authoritative decision: `Pass`
- What changed: a run's in-run set is its §2.3 reach, computed by `ReachableAgents`. The mention note, `list_available_agents` and `delegate_task` read it, and base's answers are characterized at `827f1e68dc`.
- Notes:
  1. One step-2 enumeration (open Tasks, else all; assigner order; first match) should serve both resolution and `ReachableAgents`, with preference in §2.3's order.
  2. `addressesInUse` should come from the same set, as at base.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply)

### ARCH-REV-035 — SR-060

- Canonical design review report: same path as above
- Review round and trigger: 35; SR-060 (commit `4e43b030ae`), the user's direction of 2026-11-12
- Prior authoritative decision: `Pass` (ARCH-REV-034)
- Current authoritative decision: `Pass`
- What changed: the `DelegationTree` is now one tree per run the user started, with `byAgentRunId` and `byRunId`. `RunCollaborationMap` (`mapOf(run)`, derived) answers every cross-run question. Five owners fold into it, and the design gives a method-by-method inventory of the base indexes, checked complete against `827f1e68dc`. ARCH-REV-034's notes are resolved by the structure.
- Notes:
  1. Derive a node's `tree` (or recompute it on deletion): a node whose parent is not a node is a top.
  2. One test that a loaded run's map and its root agree on step 1.
  3. Optional: fold a pass-through `CrossRunAddressResolution` into the dispatcher.

#### Prior Finding Resolution

None open. ARCH-REV-034 notes 1 and 2 are resolved by §4's map table.

- New or remaining finding IDs: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer

### ARCH-REV-036 — SR-061

- Canonical design review report: same path as above
- Review round and trigger: 36; SR-061 (commit `0b161817f0`), the user's direction of 2026-11-12
- Prior authoritative decision: `Pass` (ARCH-REV-035)
- Current authoritative decision: `Fail`
- What changed: the frontend contract. Views and lists use base's shapes, built from each run's `CollaborationTree`. A delegated run is reached through its own standard path. The acceptance check is a characterization at base. Every earlier web item is decided, and the names are `DelegationIndex` and `CollaborationTree`. The direction and the item table are sound.
- New finding: **AR-024 (Design Impact).** Base's row events are sequenced, and base's three clients reject unnumbered or gapped frames. SR-061 keeps SR-044's unsequenced delivery without saying how the two fit. The design must decide who numbers the frames, live and stopped, and what the checkpoints answer, or list the client changes. Option (a): the session numbers what it sends. Option (b): unsequenced, with the client changes listed.

#### Prior Finding Resolution

AR-001 … AR-023 are resolved and not reopened.

- New or remaining finding IDs: AR-024
- Recommended recipient: Solution Designer

### ARCH-REV-037 — SR-062

- Canonical design review report: same path as above
- Review round and trigger: 37; SR-062 (commit `1887ba822a`), answering AR-024
- Prior authoritative decision: `Fail` (ARCH-REV-036)
- Current authoritative decision: `Fail`
- What changed: `RunViewStream` numbers every frame of a run's view, per run, outliving the root. The checkpoint answers in its numbers.
- AR-024: resolved in substance. The per-run sequence is right, because the checkpoints bracket a hydration (my per-connection option would not have served them).
- New finding: **AR-025 (Design Impact).** Base's `RootEventPublisher` also owns the snapshot barrier, `liveSequenceId` and `lastMessageChangeSequence`. Events from the tree fall outside any root's gate, so a snapshot must be exact for them, or the clients' idempotence must stay; base's Team client duplicates a started row. State the publisher's move and choose (i), a synchronous read of the base with the tree, or (ii), idempotence kept.

#### Prior Finding Resolution

AR-024 is resolved in substance (see AR-025 for what remains of its delivery). AR-001 … AR-023 are resolved.

- New or remaining finding IDs: AR-025
- Recommended recipient: Solution Designer

### ARCH-REV-038 — SR-063

- Canonical design review report: same path as above
- Review round and trigger: 38; SR-063 (commit `e9b75a20f9`), answering AR-025
- Prior authoritative decision: `Fail` (ARCH-REV-037)
- Current authoritative decision: `Pass`
- What changed: `RunViewStream` is base's `RootEventPublisher` moved out of the root, with `liveSequenceId` (one per instance, lasting as long as the process), `lastMessageChangeSequence` (own messages only) and the snapshot connection. The snapshot connection reads the base, the tree's rows and the statuses in one synchronous step, then captures the run's own parts as base does (checked against base: `root-team-run.ts:401-407`).
- Note: the DS-8 "Switching modes" wording (`:302`, "a new base") contradicts `:229`.

#### Prior Finding Resolution

| Finding | Resolution |
| --- | --- |
| AR-024 | Resolved: one view sequence per run, shared by its stream and its checkpoint (SR-062) |
| AR-025 | Resolved: the publisher moved with all its duties, and the snapshot is exact for outside frames by option (i) (SR-063) |

- New or remaining finding IDs: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer

### ARCH-REV-039 — SR-064 and SR-065

- Canonical design review report: same path as above
- Review round and trigger: 39; SR-064 (`c585770866`) and SR-065 (`ae63786f6a`), the Implementation Engineer's IR-013 and its follow-up
- Prior authoritative decision: `Pass` (ARCH-REV-038)
- Current authoritative decision: `Pass`
- What changed:
  - an agent run's own stream follows its run, whoever restores it;
  - a child's Settings save is composed by the editor from each run's own save;
  - a peer child keeps base's route (`PeerChildStop`);
  - local model options come from each run's own queries;
  - the server compositions are removed.
- Notes:
  1. Name the peer child's `executeRemoteChildCommand` branch as kept.
  2. Line references (`:59`, `onHostReady`).
  3. Pick one binding source.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer

### ARCH-REV-040 — SR-066

- Canonical design review report: same path as above
- Review round and trigger: 40; SR-066 (`716367c9a3`, `40fc728d2d`), the user's direction relayed by this reviewer
- Prior authoritative decision: `Pass` (ARCH-REV-039)
- Current authoritative decision: `Pass`
- What changed: REQ-013 and AC-016 are added. `PeerAgentRun` / `PeerTeamRun` are handles found by `peerRunOf` through the index. Stop is the standard terminate. Commands and the conversation go through the handle. `PeerChildObservation` sits on the view side. The delegator-based user routes are removed.
- Notes:
  1. Share one observation per peer run across the open views.
  2. Use one `PeerRunLink` builder (`peerRunLinksOf`) for the handles and the roots.

#### Prior Finding Resolution

None open. Round 39 note 1 is superseded by SR-066.

- New or remaining finding IDs: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer

### ARCH-REV-041 — SR-067

- Canonical design review report: same path as above
- Review round and trigger: 41; SR-067 (`d3d7929755`), the spine walk the user asked for
- Prior authoritative decision: `Pass` (ARCH-REV-040)
- Current authoritative decision: `Pass`
- What changed: 19 spines were walked, and DS-12, DS-13 and DS-14 were added. The gaps were answered:
  - G-1: the guard asks peer runs;
  - G-2: a deleted run leaves the tree, which the model gains as S26, S27, T-8 and R-11;
  - G-3: the agent stream binds at connect.

  Stale text was corrected.
- Note: the window between file removal and `runDeleted`. Tell the index first, or map a restore of a run with no files to R-11.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer

### ARCH-REV-042 — Narrow: SR-068

- Canonical design review report: same path as above
- Review round and trigger: 42; SR-068 (`bed9dcc7ac`), the engineer's codegen check
- Prior authoritative decision: `Pass` (ARCH-REV-041)
- Current authoritative decision: `Pass`
- What changed: `hasCollaboration` returns on the agent run history item, from the stored row (base web `AgentRunTaskRows.vue:62`, `useMobileRunTree.ts:61`). The rest of the codegen list is confirmed.
- Note: rule 2's web change should name the file-change and trace panels: by the child's own run ID, or by its own team's member queries. The branch web's two standalone member queries go.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply)

### ARCH-REV-043 — Narrow: SR-069

- Canonical design review report: same path as above
- Review round and trigger: 43; SR-069 (`972ba9fef4`), CRR-017 CR-461-035
- Prior authoritative decision: `Pass` (ARCH-REV-042)
- Current authoritative decision: `Pass`
- What changed: a peer run takes no `@`, as at base (web `useComposerTarget.ts:68-69`; server `root-team-run.ts:292-298`). The branch's explicit refusal stays as a guard, with a characterization test.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply)

### ARCH-REV-044 — Narrow: SR-070

- Canonical design review report: same path as above
- Review round and trigger: 44; SR-070 (`2211bec711`), DS-15 and G-4
- Prior authoritative decision: `Pass` (ARCH-REV-043)
- Current authoritative decision: `Pass`
- What changed: the run's own root refuses input when the run has Task entries and none is open, with base's text (base `standalone-agent-run-root.ts:240-243`). A run no Task names is not fenced, and R-6 reopens first.
- Note: a refused input must not restore or register the root. Otherwise the list and the view show a moment of activity, and streams bind.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply)

### ARCH-REV-045 — Narrow: SR-071

- Canonical design review report: same path as above
- Review round and trigger: 45; SR-071 (`cff8db5358`), CRR-021 CR-461-045 and CR-461-046
- Prior authoritative decision: `Pass` (ARCH-REV-044)
- Current authoritative decision: `Pass`
- What changed: the closed refusal comes before the Task conflict (base `root-task-execution-lifecycle.ts:306-313`). R-12 refuses a team run's ID with its coordinator's (base `global-agent-run-message-router.ts:89-97`). `delegate_task` keeps base's texts. The contract, model and stories are updated.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply)

### ARCH-REV-046 — SR-072

- Canonical design review report: same path as above
- Review round and trigger: 46; SR-072 (`7f3bd40a41`), CRR-024 CR-461-054 and CR-461-055
- Prior authoritative decision: `Pass` (ARCH-REV-045)
- Current authoritative decision: `Fail`
- What changed: the Team tab composes X's and its subtree's logs (base's `composeMessageLogs`), with a node-level `RunMessagesFeed` numbered by each open view. F-23, F-24, F-27, F-30, F-31, F-36 and K-13 are decided. Those decisions and the composition are sound, and F-31 is a behavior change of which the user is informed.
- New finding: **AR-026 (Design Impact).** The logs are read before SR-063's synchronous base, so a message committed in between is lost, or numbered at or below the base. Read the logs after the step, behind the queue, and deduplicate by ID.

#### Prior Finding Resolution

AR-001 … AR-025 are resolved.

- New or remaining finding IDs: AR-026
- Recommended recipient: Solution Designer

### ARCH-REV-047 — Narrow: AR-026 answered

- Canonical design review report: same path as above
- Review round and trigger: 47; commit `fc02c0b46a`, answering AR-026
- Prior authoritative decision: `Fail` (ARCH-REV-046)
- Current authoritative decision: `Pass`
- What changed: the snapshot reads the logs after the synchronous base, behind the queue. The test covers a message committed during the read.
- Note: deliver every queued frame, and let the client deduplicate by message ID (base `collaborationParticipantMessages.ts:44-45, 101`). Dropping a numbered frame would create a sequence gap.

#### Prior Finding Resolution

| Finding | Resolution |
| --- | --- |
| AR-026 | Resolved: the logs are read after the base, behind the queue |

- New or remaining finding IDs: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer

### ARCH-REV-048 — Narrow: SR-074

- Canonical design review report: same path as above
- Review round and trigger: 48; SR-074 (`a683a21b90`), CRR-025 CR-461-056
- Prior authoritative decision: `Pass` (ARCH-REV-047)
- Current authoritative decision: `Pass`
- What changed: the read and the live path use base's `isMessageOfView` over `own(X)` and the open subtree's agents. The read composes the logs of the open subtree. The unreadable-record check runs before the root loads.
- Note: bind the snapshot's log filter to the tree of the synchronous step.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply)

### ARCH-REV-049 — Narrow: SR-078

- Canonical design review report: same path as above
- Review round and trigger: 49; SR-078 (`d4f448b161`), CRR-033 CR-461-068 and CR-461-069
- Prior authoritative decision: `Pass` (ARCH-REV-048)
- Current authoritative decision: `Fail`
- What changed: an unconvertible root answers base's reasons (sound). Before the retry, a preserved copy's save gives base's `INTERNAL_ERROR` (sound). After it, `ensureRunHistoryRow` writes the copy's row at runtime on listed operations.
- New finding: **AR-027 (Design Impact).** A runtime residue repair with an incomplete trigger list, against DS-10's current-only boundary and guideline §7. Use a follow-up migration whose prerequisite is the predecessor instead. The runner's `runPending` reports a prerequisite error and continues, so it waits without blocking. This differs from AR-005's hold, because nothing else depends on it.

#### Prior Finding Resolution

AR-001 … AR-026 are resolved.

- New or remaining finding IDs: AR-027
- Recommended recipient: Solution Designer

### ARCH-REV-050 — Narrow: AR-027 answered

- Canonical design review report: same path as above
- Review round and trigger: 50; commit `6e777ed697`, answering AR-027
- Prior authoritative decision: `Fail` (ARCH-REV-049)
- Current authoritative decision: `Pass`
- What changed: `ensureRunHistoryRow` is withdrawn. `20261114_delegated_runs_preserved_items_v1` waits for its prerequisites without blocking, then applies steps 4, 5b and 8 to preserved items and becomes terminal.
- Note: its prerequisites couple all three predecessors. Split it per predecessor, or accept the coupling with its reason.

#### Prior Finding Resolution

| Finding | Resolution |
| --- | --- |
| AR-027 | Resolved: a follow-up migration instead of a runtime repair |

- New or remaining finding IDs: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer

### ARCH-REV-051 — Narrow: CR-461-073

- Canonical design review report: same path as above
- Review round and trigger: 51; commit `958880cde0`, CRR-034 CR-461-073
- Prior authoritative decision: `Pass` (ARCH-REV-050)
- Current authoritative decision: `Pass`
- What changed: a refused admission is answered on the view connect with the admission's code and text, and then the stream closes. Base's user saw the reason on send through `RestoreAgentTeamRun` (`827f1e68dc` `agentTeamRunStore.ts:306`).

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply)

### ARCH-REV-052 — SR-079

- Canonical design review report: same path as above
- Review round and trigger: 52; SR-079 (`b0e0da52cb`), CRR-036 CR-461-074
- Prior authoritative decision: `Pass` (ARCH-REV-051)
- Current authoritative decision: `Pass`
- What changed: every earlier migration is classified, with one `PreservedItemsFollowUp` per writer and per reader that waits on `FAILED` or `NOT_RUN`. Ours preserves only for readers, and a registry test enforces the classification. I verified the registry order.
- Notes:
  1. Classify the address and path migrations explicitly (`TeamAgentMemoryLayout…`, `TeamContextFileExecutionLocatorsV1…`, `TeamCommunicationProjectionAddress…`), and widen the cited search.
  2. Remove the stale "residue is inert" paragraph.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer

### ARCH-REV-053 — Narrow: SR-081

- Canonical design review report: same path as above
- Review round and trigger: 53; SR-081 (`7163160ece`), CRR-043 CR-461-081 (F-63, live LE-O1)
- Prior authoritative decision: `Pass` (ARCH-REV-052)
- Current authoritative decision: `Pass`
- What changed: the old-name correction runs before address step 2 (team runs only). This reverses ARCH-REV-011's order. A live run showed a copy's `/squad/mate` silently reaching the org's own mate. The ARCH-REV-011 ruling is withdrawn for this case: the only agent the correction can hide is the namesake that the copy's member did not mean, and that agent stays reachable by run ID.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply)

### ARCH-REV-054 — SR-082

- Canonical design review report: same path as above
- Review round and trigger: 54; SR-082 (`0e5fb9bfbf`), the user's decision (REQ-014 / AC-017)
- Prior authoritative decision: `Pass` (ARCH-REV-053)
- Current authoritative decision: `Fail`
- What changed: `RunTreeView` is the one backend builder of run trees. `RunStatusService` with `/ws/run-status` gives statuses by run ID from each run. Clients only display, through `openRunTarget`. The status relay, the four client builders and the list poll are removed. The structure is sound and simpler.
- New finding: **AR-028 (Design Impact).** Removing the poll loses base's live re-read of a listed, not-open run's tree (`agentRunCollaborationStore.ts:208-245`). A tree-change signal is needed.
- Notes: atomic subscribe; subscription-counted lifetime; rule 3's acceptance.

#### Prior Finding Resolution

AR-001 … AR-027 are resolved.

- New or remaining finding IDs: AR-028
- Recommended recipient: Solution Designer

### ARCH-REV-055 — Narrow: AR-028 answered

- Canonical design review report: same path as above
- Review round and trigger: 55; commit `f9b9ef147f`, answering AR-028
- Prior authoritative decision: `Fail` (ARCH-REV-054)
- Current authoritative decision: `Pass`
- What changed: `RUN_TREE_CHANGED { runId }` on `/ws/run-status` from `ChildRowsFeed`; the client re-reads `runTree` for an expanded listed run. Notes applied: exact subscribe, counted lifetime, rule 3's acceptance.
- Notes:
  1. Status wording superseded by SR-082 at `:379`, `:402`, `:416` and `:440`.
  2. Apply only the newest `runTree` answer.

#### Prior Finding Resolution

| Finding | Resolution |
| --- | --- |
| AR-028 | Resolved: a push signal on the status connection replaces base's poll re-read |

- New or remaining finding IDs: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer

### ARCH-REV-056 — Narrow: SR-083

- Canonical design review report: same path as above
- Review round and trigger: 56; SR-083 (`1911158acf`, `7c1f215eb8`), the user's request to weigh SR-082's benefit
- Prior authoritative decision: `Pass` (ARCH-REV-055)
- Current authoritative decision: `Pass`
- What changed: statuses by run ID stand. `RunTreeView` is withdrawn, and the existing rows gain `openTarget` from one server helper. The client builders only display, and FU-034 returns to a follow-up.
- Note: `follow-ups.md:134` still says FU-034 is not to be sent.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Implementation Engineer (the plan changed); then a notice to the Solution Designer

### ARCH-REV-057 — SR-084

- Canonical design review report: same path as above
- Review round and trigger: 57; SR-084 (`9cf42c1890`), the user's decision of 2026-11-15
- Prior authoritative decision: `Pass` (ARCH-REV-056)
- Current authoritative decision: `Pass`
- What changed: `RunTreeView` and `runTree(run)` are reinstated as passed in ARCH-REV-054/055, with SR-083's `openTargetOf`, `launch` folding `runLaunch`, and Settings targeting a row key. The client builders, the follower path, the phone projection and the Settings assembly are removed.
- Notes:
  1. Define `key` from identities, so it is stable across refreshes.
  2. Mark `follow-ups.md:136` superseded.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer

### ARCH-REV-058 — SR-085

- Canonical design review report: same path as above
- Review round and trigger: 58; SR-085 (`c4f8abe877`), the code reviewer's addendum to SR-084
- Prior authoritative decision: `Pass` (ARCH-REV-057)
- Current authoritative decision: `Fail`
- What changed: item 3 names the frontend's losses (sound). Item 3b gives each agent run's own stream a sequenced snapshot connect, with the projection read behind the queue.
- New finding: **AR-029 (Design Impact).** Agent content frames append (base `segmentHandler.ts:180-205`), so reading the projection behind the queue can duplicate text. Exact at the base, idempotent by offset, or bracket and retry.
- Note: name the numbering owner and its `liveSequenceId`.

#### Prior Finding Resolution

AR-001 … AR-028 are resolved.

- New or remaining finding IDs: AR-029
- Recommended recipient: Solution Designer

### ARCH-REV-059 — Narrow: AR-029 answered

- Canonical design review report: same path as above
- Review round and trigger: 59; commit `03c2d50a67`, answering AR-029
- Prior authoritative decision: `Fail` (ARCH-REV-058)
- Current authoritative decision: `Pass`
- What changed: appending frames carry their segment offset, and the web applies only what lies beyond the current length. A separate `AgentStreamSequence` with its own `liveSequenceId` is added. Verified against base `segmentHandler.ts:317-345` (one raw field per type) and `AgentStreamingService` (no `liveSequenceId`).
- Note: compare in UTF-16 units against the same raw field, which the snapshot carries for open segments.

#### Prior Finding Resolution

| Finding | Resolution |
| --- | --- |
| AR-029 | Resolved: offsets make appending frames idempotent |

- New or remaining finding IDs: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer

### ARCH-REV-060 — SR-086

- Canonical design review report: same path as above
- Review round and trigger: 60; SR-086 (`a95a108253`), the view-spine walk at the user's question
- Prior authoritative decision: `Pass` (ARCH-REV-059)
- Current authoritative decision: `Fail`
- What changed: ten gaps are closed (G-A1 … G-G1). Nine are sound.
- New finding: **AR-030 (Design Impact).** The source of G-D1's offsets on the peer stream: node A cannot compute them, base's `observeRun` frames have none, and REQ-013 keeps the protocol unchanged.
- Note: release an idle `AgentStreamSequence` (optional).

#### Prior Finding Resolution

AR-001 … AR-029 are resolved.

- New or remaining finding IDs: AR-030
- Recommended recipient: Solution Designer

### ARCH-REV-061 — Narrow: AR-030 answered

- Canonical design review report: same path as above
- Review round and trigger: 61; commit `1b814aa084`, answering AR-030
- Prior authoritative decision: `Fail` (ARCH-REV-060)
- Current authoritative decision: `Pass`
- What changed: node B sends offsets as an additive field on observed appending frames, both nodes run one release, and REQ-013 records the field. An idle `AgentStreamSequence` is released.
- Correction: my round-60 concern about older peers is against `DESIGN.md` rule 9 and should not have been raised.
- Note: remove the no-offset fallback that concern caused.

#### Prior Finding Resolution

| Finding | Resolution |
| --- | --- |
| AR-030 | Resolved: offsets come from node B |

- New or remaining finding IDs: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer

### ARCH-REV-062 — SR-087

- Canonical design review report: same path as above
- Review round and trigger: 62; SR-087 (`761da92499`), the Implementation Engineer's IMP-3b
- Prior authoritative decision: `Pass` (ARCH-REV-061)
- Current authoritative decision: `Fail`
- What changed: each turn comes from one source. Confirmed turns come from the stored read, and unconfirmed ones from the buffered frames. Offsets are withdrawn. The peer path uses node B's own snapshot and sequence. The approach is right.
- New finding: **AR-031 (Design Impact).** The stored filter needs a turn key that entries lack, and "filtered to the confirmed set" drops every turn that predates the current sequence (a restored run's history, an interrupted turn, a stopped run). Filter by exclusion with a watermark.

#### Prior Finding Resolution

AR-001 … AR-030 are resolved.

- New or remaining finding IDs: AR-031
- Recommended recipient: Solution Designer

### ARCH-REV-063 — Narrow: AR-031 answered

- Canonical design review report: same path as above
- Review round and trigger: 63; commit `b3b509cc53`, answering AR-031
- Prior authoritative decision: `Fail` (ARCH-REV-062)
- Current authoritative decision: `Pass`
- What changed: the turn key is the raw trace's `turn_id`, with a server-side `turnId` on entries. Entries are excluded with a set of predating turn IDs taken at activation. Turnless entries are kept and matched by `messageId`, which I verified at base. A stopped run is read unfiltered.

#### Prior Finding Resolution

| Finding | Resolution |
| --- | --- |
| AR-031 | Resolved: a turn key plus exclusion with an ID watermark |

- New or remaining finding IDs: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer

### ARCH-REV-064 — Narrow: SR-088

- Canonical design review report: same path as above
- Review round and trigger: 64; SR-088 (`095fa03ca4`), IMP-G-D1
- Prior authoritative decision: `Pass` (ARCH-REV-063)
- Current authoritative decision: `Fail`
- What changed: node B serves `agentStreamSnapshot` and `observeAgentStream` from the agent's `AgentStreamSequence`, and node A relays them in the `/ws/agent` protocol. The agent case is sound.
- New finding: **AR-032 (Design Impact).** Team members have no `AgentStreamSequence` (3b `:303`), so peer team and member rows have no source. Extend the sequence to members, or relay node B's team stream.

#### Prior Finding Resolution

AR-001 … AR-031 are resolved.

- New or remaining finding IDs: AR-032
- Recommended recipient: Solution Designer

### ARCH-REV-065 — Narrow: SR-089

- Canonical design review report: same path as above
- Review round and trigger: 65; SR-089 (`cfd807f127`), answering AR-032
- Prior authoritative decision: `Fail` (ARCH-REV-064)
- Current authoritative decision: `Pass`
- What changed: an `AgentStreamSequence` is attached to every `AgentRun`, so peer team members are served by the same two requests. Verified: the single attach is `AgentRunActivationRegistry.markPrepared` → `AgentRunResourceManager.attach`.
- Note: test that team-member and org-agent runs, lazily started ones included, have a sequence.

#### Prior Finding Resolution

| Finding | Resolution |
| --- | --- |
| AR-032 | Resolved: option (a), a sequence on every `AgentRun` |

- New or remaining finding IDs: none
- Recommended recipient: Implementation Engineer; then a notice to the Solution Designer

### ARCH-REV-066 — Narrow: SR-090

- Canonical design review report: same path as above
- Review round and trigger: 66; SR-090 (`d4bec3a702`), IMP-RETRY
- Prior authoritative decision: `Pass` (ARCH-REV-065)
- Current authoritative decision: `Pass`
- What changed: `RETRY_PEERS` on `/ws/run-status`; `retryPeers` re-tells the state even if unchanged; `REFRESH_REMOTE_TASK_EXECUTIONS` is removed.
- Note: a retry re-opens the ended shared observation; coalesce concurrent retries.

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Recommended recipient: Solution Designer (reply)
