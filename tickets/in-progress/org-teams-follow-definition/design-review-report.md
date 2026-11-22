# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/requirements-doc.md` (Approved SR-007; DEC-006 by the User 2026-11-22)
- Upstream Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/investigation-notes.md` (unchanged)
- Upstream Solution Revision Record: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/solution-revision-record.md` (SR-001..SR-007)
- Reviewed Design Spec: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/design-spec.md` (SR-007, commit `6136f46350`; § SR-006 Revision R-1..R-6)
- Supplemental Task Artifacts Reviewed: `follow-ups.md` (FU-001 memory sync); autobyteus-22 behavior (unchanged)
- Relevant Solution Revision IDs: SR-006, SR-007
- Architecture Review Revision Record: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: SR-006/SR-007 resubmission after ARCH-REV-001 Fail
- Prior Review Round Reviewed: 1 (`ARCH-REV-001`, Fail)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: base `9f6add773b`. Newly opened:
  - `run-history/store/team-run-execution-tree-schema.ts:39-83`: line 47 `rootTeam.address must be '/'`; lines 54-55 refuse a member that "is not a direct Agent child of '/'";
  - `agent-team-execution/services/team-execution-index.ts:133-178`: `teamInstancesOf` excludes the root Team;
  - server Org REST routes (grep `agent-org-runs` under `api/`): `api/rest/context-files.ts:238`, `api/rest/agent-org-references.ts:37` (message references, from the Org communication log), `api/rest/run-file-changes.ts:99` (file-change content);
  - web consumers (grep `agent-org-runs` in `autobyteus-web`): `utils/contextFiles/contextAttachmentModel.ts:12-13` (draft and final Org context-file routes), `services/agentOrgExecution/agentOrgExecutionContext.ts:324` (message references), `services/runFileChanges/runFileChangeContentPath.ts:18` (file-change content).
  
  Round-1 evidence still holds for unaffected checks.

## Routing Classification Review

- Task size `Large`; architectural risk `High`. Independent review required: `Yes`. No correction.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`. AR-004 is answered by the user (DEC-006: a message wakes a unit the user stopped), and REQ-005 is extended.
- Statements about existing code the design relies on: one is false and one is incomplete.
  - **False.** R-1 says "Prefixed member addresses in a Team tree are an existing supported shape (Team copies before autobyteus-461 stored them, IF-06)". The current Team tree schema refuses them (`team-run-execution-tree-schema.ts:54-55`: a member must be a direct child of `/`). autobyteus-461's migration already converted copies to team space; autobyteus-22's N-7 found all 95 stored trees with root-level addresses. IF-06 is stale, as recorded in autobyteus-22's SR-008 note.
  - **Incomplete.** "Web contract unchanged; web Org workspace left alone" is contradicted by R-4 (a) and R-5. They remove the Org context-file routes, the Org communication log and the Org member owner kind. The web calls three Org REST routes: context files (draft and final), message references and file-change content.

| Behavior ID | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- |
| BEH-001 container, DEC-006 wake (REQ-001, REQ-005) | Pass | Pass | Pass (R-2 `same_container` admission restores any not-live unit) | Confirmed | — |
| BEH-002 Team units follow (REQ-002) | Pass | Pass | Fail: contained Team trees in Org space conflict with the Team tree contract that autobyteus-22's planner and every Team reader use (AR-001) | Needs Correction | AR-001 |
| BEH-003 addresses and both logs (REQ-003) | Pass | Pass | Address rule now correct in behavior (R-1); delivery reuses `CrossRunMessageDelivery` (R-2). Realization: AR-001 | Needs Correction | AR-001 |
| BEH-004 Org rules, BEH-005 peer, REQ-009 follow | Pass | Pass | Pass | Confirmed | — |
| BEH-006 conversion (REQ-007, AC-006) | Pass | Pass | Pass for the input map (R-4). Attachments: AR-007 | Needs Correction | AR-007 |
| REQ-006 Org view, rows, history, Memory page | Pass | Pass | Fail: the view's snapshot/relay consistency (AR-002); the Org REST routes the web uses (AR-007) | Needs Correction | AR-002, AR-007 |

## Supplemental Artifact Coherence Verdict

Pass (`follow-ups.md` FU-001 recorded with evidence; autobyteus-22 behavior unchanged).

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present; root cause; refactor decision | Pass | Unchanged | — |
| Reflected in design sections | Fail | R-1's tree shape lacks the Team-side inventory (AR-001); web routes (AR-007) | AR-001, AR-007 |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative Clear | Facade Vs Owner | Naming | One Owner Per Node, Call Order | Off-Spine | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001, DS-003, DS-006, DS-007 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 unit → unit | Primary | Pass | Pass | N/A | Pass | Pass (`CrossRunMessageDelivery` owns prepare → accept → commit; the port answers placement only) | Pass | Pass |
| DS-004 Org view (R-3) | Primary + bounded local | Pass | Fail on one point | N/A | Pass | Pass (`OrgViewComposition` owns relay and snapshot) | Pass | Fail (AR-002, narrowed) |
| DS-005 conversion | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass (the attachment route side is AR-007) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentOrgContainer`, `OrgViewComposition` | Pass | Pass | Pass | Pass | — |
| `OrgContainerPort` (`placementAt`, `sameContainer`, `orgRulesFrom`) | Pass | Pass | Pass | Pass | `deliver` removed. Note: `same_container` admission and `sameContainer` both derive the same fact; keep one (N-2) |
| Team and agent roots | Pass | Pass | Pass | Pass | Port from the container directory on create and restore (named) |

## Dependency Direction / Forbidden Shortcut Verdict

Pass. Delivery now has one owner, the backward need is answered by an upstream query port, and the port is wired from the composition root (Principle 16 Pass).

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `OrgContainerPort.placementAt` / `sameContainer` / `orgRulesFrom` | Pass | Pass | Pass | Low | Pass |
| `CrossRunMessageDelivery` `same_container` admission | Pass | Pass | Pass | Low | Pass |
| `OrgViewComposition`; `org_composition_changed` | Pass | Pass | Pass | Low | Pass |
| Org REST routes (context files, references, file changes) | — | — | — | High | Fail: removed or orphaned while the web calls them (AR-007) |

Empty indirection check: `Pass`.

## Existing Capability / Subsystem Reuse Verdict

Pass. AR-003 is resolved: `CrossRunMessageDelivery` is reused, and the in-band snapshot reuses SR-046.

## Subsystem / Capability-Area Allocation Verdict

| Area | Verdict | Notes |
| --- | --- | --- |
| `agent-org-execution`, `agent-collaboration`, streaming, history, memory, sync, projects, remote | Pass | R-5 inventory with dispositions |
| `agent-team-execution` and the Team tree contract | Fail | Contained Team trees in Org space change the Team tree contract; not inventoried (AR-001) |
| `api/rest` Org routes and the web Org workspace | Fail | AR-007 |

## Reusable Owned Structures Verdict

Pass.

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant | Overlap | Core Vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Team tree `rootTeam.members[].address` | Fail | N/A | Fail | Fail | Fail | Today "a direct child of `/`"; R-1 makes it "a direct child of `/` or of `containedIn.address`", read by every Team reader (AR-001) |
| Container file, `containedIn`, `formerUnits` | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers listed with a decision for each: `Fail`. The Team tree readers (AR-001) and the Org REST routes plus their web callers (AR-007) are missing. The rest of R-5 passes.

One vocabulary: `Pass`.

## File Responsibility Mapping Verdict

Pass for the R-5 inventory and the new owners (`org-view-composition.ts`, `container/`, `membership/`). The gaps are AR-001 and AR-007.

## Subsystem / Folder / File Placement Verdict

Pass.

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement | Scope | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Org hosting, sidecar, Org delegating run, autobyteus-22 fixed branch, task records file | Pass | Pass | Pass | Pass | — |
| Org context-file routes, Org member owner kind | Pass | Fail | Fail | Fail | Their web callers have no replacement (AR-007) |
| Org message-reference route (`agent-org-references.ts:37`), Org file-change route (`run-file-changes.ts:99`) | Fail | Fail | Fail | Fail | Not in R-5; their source (the Org log, Org member ownership) goes away (AR-007) |

## Legacy / Backward-Compatibility Verdict

Pass.

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Org runs (tree, folders, log, records, Task entries, history, saved attachment owners) | Migration Required (DEC-001) | Pass | Pass | Fail on one point | Fail | R-4 (a), (b) and (c) complete the input map and the reader rule. But step 2 writes contained Team trees with Org-prefixed member addresses, which the current Team tree schema refuses (AR-001) |

## Change / Refactor Safety Verdict

Pass, subject to AR-001 (the Team tree contract change has to come in an early slice) and AR-007.

## Example Adequacy Verdict

| Topic | Needed | Present | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Address rule (R-1) | Yes | Pass | Pass | Clear and correct as behavior |
| Org view (R-3) | Yes | Pass | Pass | Example sequence present |
| Migration line kinds (R-4 b) | Yes | Pass | Pass | — |

## Material Premise Validation

- `MP-01` (name collision): resolved by R-1's behavior (Org-space resolution).
- `MP-02` (attachments after conversion): the stored side is resolved by R-4 (a). The route side is carried by AR-007.
- `MP-03` (wake of a user-stopped unit): answered by the user (DEC-006).

### `MP-04` — A user attaches a file, opens a message reference, or views a file change in a running Org after the change

- Related requirement: REQ-006 (Org view works as today), AC-001, AC-003
- Initiating basis kind: `User`
- Trigger: the user does one of three normal Org-view actions: attaches a file to a message to an Org member, opens a message's reference file in the Team tab, or opens a file change.
- Forward path: the web builds Org routes:
  - `contextAttachmentModel.ts:12-13`: `/rest/drafts/agent-org-runs/:orgRunId/agent-runs/:agentRunId/context-files/…` and the final form;
  - `agentOrgExecutionContext.ts:324`: `/agent-org-runs/:orgRunId/communication/messages/:messageId/references/:referenceId/content`;
  - `runFileChangeContentPath.ts:18`: `/agent-org-runs/:orgRunId/agent-runs/:agentRunId/file-change-content`.
  
  R-4 (a) removes the Org context-file routes and owner kind; R-5 removes the Org communication log, the source of the references route. The file-change route resolves its owner through Org membership, which moves to unit runs. The web is "left alone".
- Consequence: attachments, message references and file-change views fail in every Org, new and converted.
- Reachability: `Reachable`
- Review consequence: AR-007.

## Unresolved Approved-Behavior Or Current-State Gaps

None in the requirements.

## Review Decision

`Fail`

## Findings

### AR-001 — R-1's Team tree in Org space contradicts the current Team tree contract

- Type: `Design Impact`; severity High (narrowed: the address behavior is now right)
- Protects: REQ-002 (Org Teams are Team runs in every respect, via autobyteus-22), REQ-003, AC-002, AC-006
- Problem:
  - R-1's behavior is correct: step 1 within the Team's Org prefix, step 2 to the container, so the MP-01 collision is gone. But it is realized by storing contained Team members at Org-prefixed addresses, and the premise that this is "an existing supported shape" is false. The current schema refuses it (`team-run-execution-tree-schema.ts:47,54-55`).
  - Making it valid changes the Team tree contract, and every Team-run reader of member addresses with it. Among those readers:
    - the config built from the tree;
    - `TeamExecutionIndex` (`teamInstancesOf` excludes the root, `:133`);
    - autobyteus-22's planner, which diffs definition addresses (team-local) against stored ones, and its committer and notice texts;
    - the Team view projector and web selectors (e.g. `readsAsDisplayName` by first segment);
    - run-tree member rows;
    - display names.
  - None of these is in R-5, and the migration's step 2 would write trees the current reader refuses.
- Required update: choose and inventory one realization. Either:
  - **(i)** keep contained Team trees in team space (the current contract) and make the Org address space a translation at one boundary of the contained Team root: step 1 matches only the `containedIn.address/` prefix and strips it; any other address goes to step 2; rules, prompts and notices present Org-space forms by adding the prefix. The migration then rebases with the existing rule, and autobyteus-22 is untouched. Or
  - **(ii)** extend the Team tree contract to Org-prefixed members, and list every Team reader with its change: the schema, the index, the planner/compiler/notice texts, the view projector, web selectors, rows and the config builder.
  
  Either way, correct the IF-06 premise.
- Proportionate: one realization choice plus its inventory. (i) is likely smaller because it confines Org space to resolution and presentation.
- Recipient: Solution Designer

### AR-002 — The composed view's snapshot/relay consistency is asserted, not built

- Type: `Design Impact`; severity Medium (narrowed from round 1: the rest of R-3 is resolved)
- Protects: REQ-006, AC-001, AC-003 (no lost or doubled frames)
- Problem: R-3 relays each live unit's events through a continuous subscription and builds the snapshot from each live unit's "current own snapshot" while "the relay is paused". A unit's snapshot read is asynchronous (`openViewSnapshotConnection` reads under the unit's lock), and the unit keeps producing events during the pause. Events buffered during the pause are either relayed (doubling events already in that unit's snapshot, e.g. a streamed text segment shown twice) or dropped (losing events between the read and the resume). "Nothing is lost or doubled" does not follow from the mechanism described.
- Required update: compose from per-unit snapshot connections. Each live unit's `openViewSnapshotConnection` gives that unit's snapshot and its post-base events atomically. The composition relays, for each unit, only events after that unit's base, and re-forms all connections on each in-band trigger. State this in R-3 and add one test: events during a snapshot are neither lost nor doubled.
- Proportionate: uses the existing per-root primitive; a small change to R-3.
- Recipient: Solution Designer

### AR-007 — Org REST routes the web calls are removed or orphaned

- Type: `Design Impact`; severity High
- Protects: REQ-006 (Org view works as today), AC-001, AC-003, REQ-007 (conversations keep their attachments), DEC-004 (Org looks unchanged)
- Problem:
  - R-4 (a) removes the Org context-file routes and the Org member owner kind, and says new Org conversations use unit routes.
  - R-5 removes the Org communication log, the source of `agent-org-references.ts:37`.
  - `run-file-changes.ts:99` resolves Org member ownership, which moves to unit runs. It is not in R-5.
  - The web Org workspace is "left alone", yet it builds all three routes (MP-04).
  
  So attachments, message references and file-change views break in every Org.
- Required update: decide per route, and list the files. Either:
  - **(a)** keep each Org route as a thin edge that resolves `{ orgRunId, agentRunId }` → the owning unit run through the container and serves from there. The web stays unchanged; the references route reads the message from the unit run's log by message ID.
  - **(b)** change the web to the unit routes. That puts named web files in scope, and the Change Scope and DEC-004 wording must say so.
  
  Saved references the migration rewrites (R-4 a) must match the routes the web then builds.
- Proportionate: three routes. Decides whether "web unchanged" holds.
- Recipient: Solution Designer

## Classification

`Design Impact` (AR-001, AR-002, AR-007).

## Recommended Recipient

Solution Designer.

## Residual Risks

Notes, none blocking:

- N-1: R-2's admission ("both runs carry `containedIn` with the same `orgRunId`") and the port's `sameContainer(runA, runB)` derive one fact twice. Keep one (Principle 11).
- N-2: R-3's command rule sends `INTERRUPT_GENERATION` to a not-live unit as `RUN_NOT_ACTIVE` (as today). Good. Keep the Org Stop's fan-out (DS-003) separate from unit interrupts.
- FU-001 (memory sync) is recorded correctly. R-6's notes are fine.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (MP-04 reachable; MP-01..MP-03 resolved or answered)
- Notes: SR-006/SR-007 resolve AR-003, AR-004, AR-005 and AR-006, and most of AR-001 and AR-002. Remaining:
  - realizing the Org-space address rule without silently changing the Team tree contract (or inventorying that change);
  - per-unit snapshot connections in the composition;
  - the three Org REST routes the unchanged web relies on.
  
  Classification is Large / High.
