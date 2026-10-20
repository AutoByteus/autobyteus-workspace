# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-004` (REQ-012 / AC-011 / DEC-010 added by the user's decision of 2026-10-19 in SR-003; AC-007 made explicit for team copies in SR-004)
- Package identifier: `delegated-copy-restore-from-own-file`
- Request / ticket: Project Task `autobyteus-197`: "Delegated copies restore from their own run file; remove `taskAgent.origin` (data-model cleanup)"
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's direction of 2026-10-19
- Requirements owner: Solution Designer
- Date: 2026-10-19
- Approved by and reference: `User`; reference: the user, 2026-10-19 conversation: "Yeah, exactly. Basically, we want to keep the code and the data clean now … if it cannot be converted, leave it there. That's fine. Let it fail. But the application starts normally" (answer to the approval question for DEC-001 and DEC-002)
- Exact approved requirements baseline / solution revision: SR-001 (this document as of 2026-10-19, including DEC-006 as revised by the user)
- Behavior-defining supplements and their approved versions: none

## Problem And Desired Outcome

- **Problem:** A delegated copy has its own `run_metadata.json` (agent) or own team tree (team), but a copy started from a **configured place** (a team member or org agent slot of the coordinating run; `taskAgent.origin: "configured_place"`) does not restore from it. Its definition and launch settings are read from the slot at every restore and in every view, so later edits to the slot change copies that already ran. This is legacy from before copies had their own files (delegated-copy-own-run-memory, U-4). It leaves two ways to load a copy and a field whose name misleads.
- **Affected actors or systems:** the user, who restores, wakes, views and edits stopped runs; the server's restore, hosting and view paths in Team and Org roots; the app's run views and Settings.
- **Desired outcome:** every delegated copy, agent or team, restores from its own file, like any run. `taskAgent.origin`, the two-way merge on load and every fallback that makes a copy follow the slot are gone. Existing copies are converted once, so they restore exactly as before the upgrade.
- **Observable definition of success:** after the upgrade, every existing copy opens and restores with the same settings as before. Editing a member's settings in a stopped run no longer changes copies already started from it. A new delegation to that member starts from the edited settings. No `origin` remains in code.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | A catalog copy restores from its own file | Unchanged | All of it | investigation BEH-001 |
| BEH-002 | System | SCN-001 | A configured-place copy (agent or team) restores with the slot's **current** definition and launch | Restores from its own file | Identity, memory, link, delegator, Settings edit | BEH-002 |
| BEH-003 | User | SCN-003 | Editing a configured member's settings in a stopped run changes copies already started from it | Changes only the slot and copies started afterwards | The slot edit itself; new copies start from the slot | BEH-003 |
| BEH-004 | User | SCN-004 | The app (server views and frontend) shows a configured-place copy with the slot's current settings, including the slot's runtime session id in the run view | Shows the settings the copy runs with | Display names of copies and configured members | BEH-004, BEH-008 |
| BEH-005 | User | SCN-002 | A new copy of a configured place starts from the slot's current settings; its record has no `source`; its own file has `origin: configured_place` | Starts from the slot's current settings and records them completely in its own file | The settings it starts with | BEH-005 |
| BEH-006 | User | SCN-001, SCN-004 | A copy's Settings model edit is recorded beside its started launch | Unchanged | All of it | BEH-006 |
| BEH-007 | User | SCN-001 | A team-level model selection on a configured-place team copy reaches the members whose launch equals the team's (configured rule) | The same members keep following the team | The follower set of every existing team copy | BEH-007 |
| BEH-008 | Operational | SCN-005 | Own files carry `taskAgent.origin`; 4 agent copies have all launch fields `null`; 2 team copies' own trees hold team facts but are ignored on restore | One data migration cleans every own file: the 6 files gain what they need to restore on their own, taken from their slot as it is at upgrade, and `origin` is removed from every own file (110 locally). Afterwards `origin` is neither written nor read | Every other fact of the 104 already-complete files is unchanged | Data rows in investigation notes |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User | Reopen, restore and edit his runs; trust that history reproduces what ran | Copies restore and show what they ran with; his data keeps working after the upgrade | Real data changed only with his approval and after a backup |
| Server restore/hosting | Rebuild a copy's runtime | One source of truth per copy: its own file | No fallback to the coordinating run's slot |
| App views | Show a copy's settings and name | Settings shown = settings used; names unchanged | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Restore or wake a delegated copy (agent or team) in a Team or Org run | SCN-001 |
| UC-002 | Delegate to a configured place | SCN-002 |
| UC-003 | Edit a configured member's settings in a stopped run | SCN-003 |
| UC-004 | View a copy's settings in the app (run view, Settings delegated rows, Team and Org contexts) | SCN-004 |
| UC-005 | Upgrade with existing configured-place copies | SCN-005 |

Agent roots have no configured places; their copies are catalog copies and only the removal of `origin` touches them.

### Out Of Scope

- Cross-node delegation (autobyteus-191) and remote runs.
- How catalog copies start or restore (unchanged). Only the recorded member shape of team copies changes (REQ-012, DEC-010).
- Configured members' own restore, and how a slot is edited.
- The message-log format and other own-file fields (`launchSource`, `userLaunchSelection`, `delegatorAgentRunId`).
- The obsolete `skillAccessMode` key inside slots' launch objects (not copied into own files; not cleaned here).

### Non-Goals

- Making a copy follow its slot by choice (no "follow slot" option).

### Preserved Behavior Boundary

BEH-001, BEH-006 entirely; for BEH-002/BEH-007: identity, memory folder, link, delegator, Settings edit, launch provenance, team-member follower set and the settings each existing copy restores with at upgrade (REQ-006, REQ-007; AC-005..AC-008). Display names (BEH-004 preserved column; AC-004).

### Prerequisites

None. The released migration `task-agent-own-run-v1` imports the writers this ticket changes. Repointing it to frozen copies (Data Migration Guideline §4) is part of this ticket, not other functionality.

| Prerequisite ID | Finding And Evidence | Blocks | Sent To / Task Key | Status |
| --- | --- | --- | --- | --- |
| — | None | — | — | — |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Every delegated copy, agent or team, in Team, Org and Agent roots, restores its definition, runtime, model, model settings, workspace and auto-approve from its own file (plus its own Settings edit), never from a configured place of the coordinating run | BEH-001, BEH-002 | Must | Pure data model; one source of truth | Task Target; user quote |
| REQ-002 | A new copy of a configured place starts from the place's settings at that moment and records them completely in its own file. Agent copy: definition and the full started launch. Team copy: team definition, coordinator, members' definitions and launches, team default launch, the handoff rules its members have (including rules to the coordinating run), and which members follow the team | BEH-005 | Must | Makes REQ-001 hold for new copies | Task Target |
| REQ-003 | Editing a configured place's settings in a stopped run changes only that place and copies started after the edit; copies already started keep their own settings | BEH-003 | Must | Consequence of REQ-001 | **DEC-001 (Needs user)** |
| REQ-004 | Wherever the app shows a copy's settings (run view and its runtime session id, Settings delegated rows, Team and Org contexts), it shows the settings the copy runs with: its own file plus its Settings edit. Display names of copies and configured members stay as today | BEH-004 | Must | Shown = used | DEC-004 |
| REQ-005 | `taskAgent.origin` is no longer written or read, and the data migration removes it from every existing own file, so no data or code carries it. The two-way merge on load and every restore or view fallback that resolves a copy through the configured place at its address are removed from server and app | BEH-008, BEH-002, BEH-004 | Must | Task Target; no dead code | DEC-006 |
| REQ-006 | One-time conversion at upgrade: each existing configured-place copy whose own file cannot restore on its own gets the missing facts from its configured place as it is at upgrade. It then restores and shows exactly the settings it had before the upgrade | BEH-008 | Must | No visible change at upgrade | **DEC-002 (Needs user)**, DEC-007 |
| REQ-007 | Preserved through the change and the conversion, per copy: identity, memory folder and contents, link, delegator, Settings edit, recorded launch provenance, and the set of team members that follow a team-level model selection | BEH-006, BEH-007 | Must | Data continuity | DEC-008 |
| REQ-008 | A copy whose configured place no longer exists at upgrade is left unchanged on disk and reported. It is not loaded, because it cannot restore today either. App start and new work never depend on it | BEH-008 | Should | Data Migration Guideline §1, §6 | DEC-005 |
| REQ-009 | The migration is idempotent: a second start changes nothing; a file already in the current shape (complete, no `origin`) is not rewritten | BEH-008 | Must | Guideline §7 | — |
| REQ-010 | Tests prove the conversion on small synthesized fixtures with the released shapes found in the user's data (agent `catalog`, agent `configured_place` with null launch, team `catalog`, team `configured_place`, with and without delegator / Settings edit, and a missing place). No migration, startup or conversion runs on real user data or a copy of it | BEH-008 | Must | TESTING.md; guideline §9 | DEC-009 |
| DEC-010 | How does a team-copy member record whether it follows a team-level model selection? (ARCH-REV-001 AR-001) | A configured member can have its own auto-approve with the team's model (`memberOverrides.ts:45-66`). "No own launch = follows" would drop it from the follower set | (A) every member records its complete launch plus an explicit follow flag, for all team copies; (B) keep presence-based recording and accept the narrowing | The user, 2026-10-19: "every agent run has their own configuration … complete one. Then when you're restoring, you don't have to borrow from the team … It will stay clean." Chosen: **A**. | User | Decided |
| REQ-011 | The user's real data is converted only by the released app, after his backup. He then checks his copies in the app | BEH-008 | Must | Task; hard to undo | **DEC-002 (Needs user)** |
| REQ-012 | Every member of a team copy (catalog or configured place) records its own complete launch settings and whether it follows a team-level model selection. Restore reads each member's own settings, never the team's. Existing team copies keep exactly the members' current settings and follower set | BEH-007 | Must | One explicit fact per member instead of two inferred rules | **DEC-010 (User)** |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-002 / SCN-001 | Stopped Team (and Org) run with an agent copy and a team copy of configured members | Restoring each copy uses the settings in its own file (proved by giving the slot different settings than the own file) | — | Server integration, Team and Org |
| AC-002 | REQ-002 | BEH-005 / SCN-002 | Delegate to a configured agent member and to a configured team member | Each copy starts with the slot's current settings; its own file holds the full definition/launch facts and no `origin` | — | Integration: written key set |
| AC-003 | REQ-003 | BEH-003 / SCN-003 | Copy started from member M; the user edits M's model in the stopped run | Restoring the copy uses its started settings; a new delegation to M uses the edited model | — | Integration |
| AC-004 | REQ-004 | BEH-004 / SCN-004 | Copy whose own settings differ from its slot's | Run view (incl. runtime session id), Settings delegated rows, and Team / Org contexts show the copy's own settings (with its Settings edit); names of the copy and the configured member are unchanged | — | Server view tests; web unit tests; one real-app check |
| AC-005 | REQ-006, REQ-007 | BEH-008 / SCN-005 | Fixture: agent copy, `configured_place`, null launch, slot present (also: its definition no longer in the catalog) | After startup, its own file holds the slot's definition and launch (exactly the values restore used before) and no `origin`. Identity, delegator, Settings edit and memory are unchanged | — | Migration test + restore after migration |
| AC-006 | REQ-006, REQ-007 | BEH-007, BEH-008 / SCN-005 | Fixture: team copy, `configured_place`, slot present (members equal to and different from the team default) | After startup it restores with the slot's settings as before. The same members follow a team-level model selection. Every handoff rule its members have today (inside the team and to the coordinating run) is unchanged | — | Migration test + restore |
| AC-007 | REQ-008 | SCN-005 | Fixture: configured-place agent copy and configured-place team copy whose slot is gone | Each file unchanged; reported in the migration log; neither copy is loaded (the current store reports it unavailable); app starts and new work runs | — | Migration + startup test |
| AC-008 | REQ-009, REQ-005 | SCN-005 | Fixture: `catalog` agent and team copies with `origin`; then a second startup | After the first start their own files have no `origin` and every other fact is unchanged; a second start writes nothing | — | Migration test |
| AC-009 | REQ-005 | — | Code | No `origin` / `TaskAgentOrigin` / "absent source means configured placement" branch for copies remains in current server or web code. The released migration still produces its released output (frozen copies) | — | Grep + released-migration tests |
| AC-010 | REQ-010, REQ-011 | — | Delivery | Tests use synthesized fixtures only. The user confirms his backup, upgrades, and checks his copies (incl. the 4 + 2 converted) in the app | — | Delivery verification record |
| AC-011 | REQ-012, REQ-007 | BEH-007 / SCN-001, SCN-002, SCN-005 | (a) a new copy of a configured team whose member has its own auto-approve but the team's model; (b) a catalog team copy; (c) migrated team copies | Each member's own file entry holds its complete launch and `followsTeam`. (a) that member follows a team-level model selection, as today; (b) members on their own agent default do not follow, the others do; (c) restore uses each member's settings and the follower set is unchanged | — | Integration + migration tests |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Goal Or Event | Trigger / Entry | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User/System | User | Continue work with a delegated copy | Reopen a stopped run; send to a copy; wake by run id | Copy exists with own file | Load run → compose copies → restore copy | Copy runs with its own settings | Own file unreadable → copy reported, not loaded (existing L5) | Supported Normal Scenario | delegated-copy-own-run-memory S7 | REQ-001, REQ-007 / AC-001, AC-006 |
| SCN-002 | User | Coordinating agent / user | Delegate to a configured member | `delegate_task` to a member address | Run has the configured member | Activate copy from the slot | Copy starts with the slot's settings; recorded in its own file | — | Supported Normal Scenario | adapter activation path | REQ-002 / AC-002 |
| SCN-003 | User | User | Change a member's model for future work | Run settings of a stopped Team/Org run | Copies already started from the member | Edit slot → restore old copy → delegate again | Old copy unchanged; new copy uses the edit | — | Supported Normal Scenario | BEH-003 | REQ-003 / AC-003 |
| SCN-004 | User | User | See what a copy runs with | Open run view / Settings | Copy with Settings differing from slot | Open views | Copy's own settings shown; names unchanged | — | Supported Normal Scenario | BEH-004 | REQ-004 / AC-004 |
| SCN-005 | Operational | App startup | Upgrade | First start of the new build | Existing configured-place copies (4 + 2 locally) | Migration converts; app loads | Copies restore as before | Slot gone → preserved, reported, not loaded | Supported Normal Scenario | Data scan | REQ-006, 008, 009 / AC-005..AC-008 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (no new UI; existing views show different values for configured-place copies, covered by REQ-004)
- Product design fields: `N/A — not applicable`

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-008 / AC-007 | Reliability | No startup or new-work dependency on converting any copy | All installs | Startup test |
| QR-002 | REQ-009 / AC-008 | Performance | The migration reads only own files of copies (and, for the configured-place ones, their coordinating trees), and writes each own file at most once | All installs | Migration test counts |
| QR-003 | REQ-010 | Compliance | No migration or startup on real user data or a copy in tests | Tests | Review |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes`: own files of delegated copies.
- Must be preserved: REQ-007, plus the settings each copy restores with at upgrade.
- Acceptable loss: the `origin` value (no remaining meaning); a copy's link to later slot edits (DEC-001).
- Constraints: backup before the user upgrades (REQ-011).
- Unknowns for architecture: exact mapping of the team-member follower set; handoffs used today by a configured-place team copy versus its own tree.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Data Migration Guideline | tolerant read; exact write; registered migration only for the required facts; frozen copies for released migrations; synthesized fixtures | `autobyteus-server-ts/docs/design/data_migration_guideline.md` | — |
| `autobyteus-team-stream-contracts` | Task DTO `source` may become present for every copy | `team-execution-view-dtos.ts` | Contract `dist/` rebuild (TESTING.md) |

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `.../ctx_a1fa3e5a4578__follow-up-delegated-copy-restore-from-own-file.md` | Originating evidence note | all | Input | N/A — input |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The user's slots are not edited between this approval and his upgrade in a way he wants to keep away from existing copies | REQ-006 takes values at upgrade | The conversion takes the slot as it is at upgrade, which is what restore uses until then. Nothing to validate | Accepted |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Accept the behavior change: editing a configured member's settings in a stopped run no longer changes copies already started from it (new copies still start from the edited settings)? | Visible product behavior; reverses U-4's "not a snapshot" | (a) accept; (b) keep following the slot (keeps `origin` and the merge; contradicts the user's "pure data model") | A run's history should reproduce what ran. Catalog copies and every standalone run already work this way. A stopped copy can still be changed through its own Settings edit. Following the slot was only kept to avoid a behavior change in the earlier ticket. **Recommend (a).** Approved by the user (2026-10-19). | User | Decided |
| DEC-002 | Approve the one data migration of your real data at upgrade: it removes `origin` from all 110 own files and completes 6 of them (4 agent copies: `article_reviewer`, `investigator`, `vp_sales`, `prototype_bootstrapper`; 2 `StudentStudyGroup` team copies in the classroom test orgs). They take their slot's settings as they are at upgrade, which is exactly what they restore with today. You back up first and check the copies in the app afterwards | Changes real data; hard to undo | Read-only scan: all 6 slots exist; values equal today's restore values | Without it the 4 agent copies cannot restore (they have no launch recorded). The values are the ones they use now, so nothing visible changes at upgrade. **Recommend approving**, with backup and app check as in REQ-011. Approved by the user (2026-10-19), with his rule: what cannot be converted stays as it is and the app starts normally (REQ-008, QR-001). | User | Decided |
| DEC-003 | Include team copies (2 `configured_place` team copies locally)? | The Task names agent copies; team copies carry the same field and merge | Code: `taskAgentTeamOwnTree`, `composeTaskTeamRecord` | "Every delegated copy" and "remove `origin`" cannot hold otherwise. Include. | Solution Designer | Decided |
| DEC-004 | What does the app show for a configured-place copy? | Today server views and frontend show the slot | Investigation BEH-004 | Restoring from its own file while showing the slot would show settings the copy does not use. Show the copy's own settings; keep names as today. Also fixes the run view showing the slot's runtime session id for such a copy. | Solution Designer | Decided |
| DEC-005 | A copy whose slot is gone at upgrade | Cannot be filled | 0 locally; today it fails at restore | Leave it unchanged, report it, and don't load it. Guessing values is not allowed (guideline §2). | Solution Designer | Decided |
| DEC-006 | Rewrite all own files to drop `origin`? | Purity versus touching 104 files | Guideline §3 would allow leaving it as an ignored field; the user, 2026-10-19: "we should keep the data clean now and the code clean … if there are any historic data which was not correct, then create one data migration to migrate those" | The user's direction: one data migration removes `origin` from every own file and completes the 6 incomplete ones. Afterwards no data carries it, and the reader needs no tolerance for it. | User (2026-10-19 conversation) | Decided |
| DEC-007 | Fill values from the slot at upgrade or from the copy's own earlier values? | Team copies have own trees from 2026-10-17 | Today restore uses the slot's current values | Use the slot at upgrade, so each copy keeps exactly what it restores with today. Locally both sources are equal anyway. | Solution Designer | Decided |
| DEC-008 | Which members of a team copy follow a team-level model selection after the change? | BEH-007 | configured rule versus recorded rule | Preserve the set each copy has today. The architecture chooses the representation. | Solution Designer | Decided |
| DEC-009 | The Task says "tested on a copy of realistic data"; TESTING.md forbids a migration on real data or a copy of it | Policy conflict | TESTING.md:170-177; guideline §9 | Use small synthesized fixtures with the exact released shapes found read-only in the user's data. The user's real data is converted only by the released app after his backup. | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-002 | AC-001 | SCN-001 | investigation |
| REQ-002 | UC-002 | BEH-005 | AC-002 | SCN-002 | investigation |
| REQ-003 | UC-003 | BEH-003 | AC-003 | SCN-003 | DEC-001 |
| REQ-004 | UC-004 | BEH-004 | AC-004 | SCN-004 | DEC-004 |
| REQ-005 | UC-001, UC-004 | BEH-008 | AC-008, AC-009 | SCN-001, SCN-005 | DEC-006 |
| REQ-006 | UC-005 | BEH-008 | AC-005, AC-006 | SCN-005 | DEC-002, DEC-007 |
| REQ-007 | UC-001, UC-005 | BEH-006, BEH-007 | AC-005, AC-006 | SCN-001, SCN-005 | DEC-008 |
| REQ-008 | UC-005 | BEH-008 | AC-007 | SCN-005 | DEC-005 |
| REQ-009 | UC-005 | BEH-008 | AC-008 | SCN-005 | — |
| REQ-010 | UC-005 | BEH-008 | AC-010 | SCN-005 | DEC-009 |
| REQ-011 | UC-005 | BEH-008 | AC-010 | SCN-005 | DEC-002 |
| REQ-012 | UC-001, UC-002, UC-005 | BEH-007 | AC-011 | SCN-001, SCN-002, SCN-005 | DEC-010 |

## Architecture Phase Input

- Scenario paths to map: SCN-001..SCN-005.
- Constraints: REQ-007 preserved facts; guideline §1–§9; TESTING.md contract `dist/` rule.
- Deferred to architecture: whether `source` becomes required on in-memory copy records; how activation records a configured place's snapshot; the follower-set representation; the conversion's registration, ordering after `task-agent-own-run-v1`, and its dispositions; repointing the released migration; the inventory of every "configured first" site (server and web) and its removal.
- Facts to verify: handoffs a configured-place team copy uses today; the contract DTO change; slot launch objects with the obsolete `skillAccessMode` key parse cleanly into own files.
- Known risks: RSK-001 (a missed fallback site).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
