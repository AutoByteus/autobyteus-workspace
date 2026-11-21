# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/requirements-doc.md` (Approved SR-004)
- Upstream Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/investigation-notes.md` (IF-01..IF-14, AF-01..AF-09)
- Upstream Solution Revision Record: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/solution-revision-record.md` (SR-001..SR-005)
- Reviewed Design Spec: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/design-spec.md` (SR-005, commit `ac6e53d602`)
- Supplemental Task Artifacts Reviewed: `follow-ups.md` (empty); autobyteus-22's archived behavior (named as supplement)
- Relevant Solution Revision IDs: SR-002 (direction), SR-004 (approval), SR-005 (design)
- Architecture Review Revision Record: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: `1`
- Trigger: Architecture Design Complete, SR-005
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: base `9f6add773b`. Opened:
  - `docs/modules/agent_orgs.md` § Addresses And Handoffs and § Exact Context Files And Saved References;
  - `agent-org-execution/domain/agent-org-run-execution-tree.ts`;
  - `services/agent-streaming/org-view-session.ts:1-80`;
  - `agent-collaboration/communication/cross-run-message-delivery.ts:1-60`;
  - `docs/design/data_migration_guideline.md:280-310` (§4 classification);
  - the migrations folder listing;
  - the folder walkers found by grep of `getTeamRootDirPath|getStandaloneRootDirPath|getOrgRootDirPath`: `agent-memory/services/run-folder-discovery.ts:246-310` (used by memory search, the episodic catalog and the memory explorer), `run-history/services/team-run-history-catalog-service.ts:290`, `run-history/services/root-run-package-current-validator.ts:87-111,222`, `memory-sync/source/local-memory-export-scanner.ts:41`;
  - the count of `kind: "agent_org"` / `rootSubjectKind === "agent_org"` sites outside migrations: 28, matching AF-05.
  
  Read-only data:
  - the user's Org run: tree keys; two mounted Teams and no direct agents; 32 log lines, 30 intra-Team and 2 cross-unit, none with `counterpart`; a task-records file;
  - the Org definitions in `autobyteus-agents/agent-orgs/*`: no name collisions today.

## Routing Classification Review

- Task size `Large`; architectural risk `High` (migration of every stored Org run, a collaboration contract change, runtime ownership moves, a peer protocol addition). Independent review required: `Yes`. No correction.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` for the approved requirements, with one `Requirement Gap` (AR-004).
- Approved requirements / intended behavior understood:
  - An Org run becomes a container. Mounted Teams become Team runs and direct agents become agent runs, and every autobyteus-22 behavior applies to Org Teams.
  - The same addresses and the same Org view, rows, history and Memory page as today (REQ-003, REQ-006; preserved: "Addresses, handoff texts, who may message whom").
  - Existing Org runs converted, keeping conversations, messages, memory, Task links and history (DEC-001, REQ-007, AC-006).
  - The Org follows its definition (DEC-002); FU-003 is in scope (DEC-003).
- Existing behavior confirmed:
  - Today an Org Team member reaches its teammates and every other Org unit in one Org address space. It writes `/software_engineering_team/code_reviewer` for a teammate and `/concierge` for an Org agent, and resolution never confuses the two (`agent_orgs.md` § Addresses; "A Team instance is one unit").
  - Messages between runs on one node already have an owner. `CrossRunMessageDelivery` prepares the message on the sender, has the receiver accept it in its gate (restored when stopped, for related runs) and commits the sender's log line. It has a Task-based admission (`related` / `reopened` / `unrelated`) and records `counterpart` (`cross-run-message-delivery.ts:1-60`).
  - The Org view is one `RunViewStream` per Org root, with snapshot bases, live/stored mode switches and a `whileRestoring` rule (`org-view-session.ts`).
  - Org context files are served through Org-owned routes, `/agent-org-runs/:orgRunId/agent-runs/:agentRunId/context-files/:storedFilename`, whose ownership the Org tree proves (`agent_orgs.md` § Exact Context Files).
- Scope guardrail: In-scope UC-001..UC-006; Out of Scope (Org-in-Org, placement copies, application-bound) respected; Preserved Behavior Boundary applied.
- Every prospective blocking finding traceable: `Yes`.
- Statements about existing code the design relies on: checked. AF-01..AF-09 citations hold, and the "28 sites" count is correct. One statement is incomplete: "contained runs are not added to the top-level run indexes" covers indexes, but several readers find runs by walking the `agents/` and `agent_teams/` folders, not by index (AR-006).

| Behavior ID | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- |
| BEH-001 container (REQ-001, REQ-005) | Pass | Pass | Pass (DS-001, DS-003), except the wake rule (AR-004) | Needs Correction | AR-004 |
| BEH-002 Team units follow (REQ-002) | Pass | Pass | Pass (autobyteus-22 unchanged on Team roots; the "Org-mounted fixed" branch removed) | Confirmed | — |
| BEH-003 addresses and both logs (REQ-003) | Pass | Pass | Fail (AR-001, AR-003) | Needs Correction | AR-001, AR-003 |
| BEH-004 Org rules (REQ-004) | Pass | Pass | Pass (DS-006; Org planner filters rules; notices) | Confirmed | — |
| BEH-005 peer members (REQ-008) | Pass | Pass | Pass (DS-007: signed notice + reconcile on contact) | Confirmed | — |
| BEH-006 conversion (REQ-007, AC-006) | Pass | Pass | Fail (AR-005) | Needs Correction | AR-005 |
| Org view, rows, history, Memory page (REQ-006) | Pass | Pass | Fail (AR-002, AR-006) | Needs Correction | AR-002, AR-006 |
| Org follow (REQ-009) | Pass | Pass | Pass (DS-006) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose | Linked | Complete | Consistent | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| autobyteus-22 approved behavior (archived) | Pass | Pass | Pass | Pass | Pass | — |
| `follow-ups.md` | Pass | Pass | Pass (empty) | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | Larger Requirement | — |
| Root cause evidence-backed | Pass | The Org root hosts its units, while CM-3 calls it a container (IF-10); Team logic runs twice | — |
| Refactor decision explicit | Pass | Yes, the whole change | — |
| Reflected in design sections | Fail | Derived consumers deferred to implementation (AR-006); view composition and the address rule left open (AR-001, AR-002) | AR-001, AR-002, AR-006 |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative Clear | Facade Vs Owner | Naming | One Owner Per Node, Call Order | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 start | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 unit → unit | Primary | Pass | Fail | N/A | Pass | Fail. The sender root, the container and the target root all touch the sequence. Who commits the sender's log line is not stated, and it bypasses the existing cross-run owner (AR-003) | Pass | Fail |
| DS-003 Stop/reopen | Primary | Pass | Fail (individually stopped units, AR-004) | N/A | Pass | Pass | Pass | Fail |
| DS-004 Org view | Primary | Pass | Fail | N/A | Pass | Fail (no bounded local spine for composing several streams, AR-002) | Pass | Fail |
| DS-005 conversion | Primary | Pass | Fail (incomplete input map, AR-005) | N/A | Pass | Pass | Pass | Fail |
| DS-006 follow | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 peer members | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentOrgContainer` | Pass | Pass | Pass | Pass | Drives unit lifecycle through the Team and agent run services |
| `OrgContainerPort` | Pass | Fail | Pass | Fail | `deliver(intent)` makes the container a second message-delivery owner (AR-003) |
| Team / agent roots | Pass | Pass | Pass | Pass | Fixed `containedIn`; ask the container only through the port |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Container → Team and agent run services | Pass | Pass | Pass | Pass | — |
| Unit roots → container (port) | Pass | Pass | Pass | Pass | A backward need answered as an upstream-defined query (Principle 9) |
| Message delivery | Pass | Fail | Fail | Fail | Sender → container → target duplicates `CrossRunMessageDelivery` (AR-003) |

Principle 16: `Pass`. The container directory is passed in by the composition root. When a single Team unit is restored by the Team manager, it must receive its port through `containedIn` → container directory; the design states this source.

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `containedIn: { orgRunId, address }` | Pass | Pass | Pass | Low | Pass |
| `OrgContainerPort.placementAt` / `orgRulesFrom` | Pass | Pass | Pass | Low | Pass |
| `OrgContainerPort.deliver(intent)` | Pass | Fail | Pass | Medium | Fail (AR-003) |
| `AgentOrgContainer.follow(view)` | Pass | Pass | Pass | Low | Pass |
| `PeerRunMembersNotice`; `TaskExecutionResourcePort.updatePeerRunMembers` | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `Pass`. `OrgContainerPort` is a real boundary: one port per container, holding the Org rules and placements.

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Team and agent unit runs | Pass | Pass | N/A | Pass | — |
| Messages between unit runs (both logs, wake) | Fail | Fail | Fail | Fail | `CrossRunMessageDelivery` already does this (AR-003) |
| Org view | Pass | Fail | N/A | Fail | Composition is new and undefined (AR-002) |
| Migration machinery | Pass | Pass | N/A | Pass | — |
| Peer channel | Pass | Pass | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear | Decision Sound | Supports Spine | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-org-execution/container/`, `membership/` | Pass | Pass | Pass | Pass | — |
| `agent-collaboration` (addresses, cross-run delivery) | Fail | Fail | Fail | Fail | AR-001, AR-003 |
| `services/agent-streaming` (Org view) | Fail | Fail | Fail | Fail | AR-002 |
| `run-history`, `agent-memory`, `memory-search`, `memory-sync` | Fail | Fail | Fail | Fail | AR-006 |

## Reusable Owned Structures Verdict

| Repeated Structure | Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Org rows and view composed from units | Pass | N/A | Pass | Pass | Derived, not stored twice |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap | Core Vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Container file (`units`, `formerUnits`, Org rules) | Pass | Pass | Pass | N/A | Pass | — |
| Member addresses inside a Team unit | Fail | N/A | Fail | N/A | Fail | One name (`/x`) can mean a teammate and an Org agent (AR-001) |

Derived consumers listed with a decision for each: `Fail`. The 28 `agent_org` sites and the folder walkers are deferred (AR-006).

One vocabulary: `Pass` for container, unit, `containedIn` and former unit. Addresses: `Fail` (AR-001).

## File Responsibility Mapping Verdict

`Fail` in part. The design gives areas and two folders, not a file mapping, for a change of this size. Acceptable once AR-001..AR-006 settle what the files are: the composition owner, the delivery reuse, the reader dispositions and the migration modules.

## Subsystem / Folder / File Placement Verdict

Pass for the folders named (`agent-org-execution/container/`, `membership/`, `app-data-migrations/migrations/agent-org-units-own-runs-v1/`).

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement | Scope | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Member hosting in `AgentOrgRun`, Org communication sidecar, Org as delegating run, `TeamRunMembership` fixed branch, Org task records file | Pass | Pass | Pass | Pass | — |
| Org context-file routes | Fail | Fail | Fail | Fail | Kept or replaced? Not stated (AR-005) |

## Legacy / Backward-Compatibility Verdict

Pass. No dual paths are proposed, and rollback is honestly declared impossible.

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Org tree, member folders, message log, task records, Task entries / `delegatedFrom`, history index | Migration Required (user DEC-001) | Pass | Pass | Fail | Fail | Missing: saved context-file references and routes, `counterpart` and outside-run log lines, the reader-predecessor rule (AR-005) |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Eight slices | Pass | Pass | Pass | Pass, subject to the findings |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Address resolution from a Team unit (teammate vs Org agent, old prefixed form) | Yes | Fail | Fail | Fail | AR-001 |
| Composed Org view across unit restores | Yes | Fail | Fail | Fail | AR-002 |
| Log split per line kind | Yes | Pass in part | N/A | Fail | `counterpart` lines missing (AR-005) |

## Material Premise Validation

### `MP-01` — An Org with a direct agent named like a member of a mounted Team

- Related requirement: REQ-003 ("same addresses as today"); preserved "who may message whom"
- Initiating basis kind: `User`
- Trigger: an Org author defines a direct agent and mounts a Team with a member of the same name, in the Org editor or a package. For example, an Org-level `solution_designer` alongside `software-engineering-team`. Today the two are distinct (`/solution_designer` vs `/software_engineering_team/solution_designer`), and nothing refuses it.
- Forward path: after the change the Team run's members are rebased to `/solution_designer` (design step 2 and the migration plan step 2). A Team member's `send_message_to('/solution_designer')` resolves step 1 (own team) first (`message-recipient-resolution.ts` step 1), so it reaches the teammate, not the Org agent. An Org rule `to: /solution_designer` shown in that member's merged `get_handoff_rules` names an address that step 1 resolves to the wrong agent.
- Consequence: a message or handoff silently goes to a different agent than today.
- Reachability: `Reachable`. No current definition collides (checked), but the product allows it.
- Review consequence: AR-001.

### `MP-02` — A user attaches a file in a conversation with an Org member, then the upgrade converts the Org

- Related requirement: REQ-007, AC-006 (conversations kept)
- Initiating basis kind: `User` + `Operational` (upgrade)
- Trigger: attaching a context file to a message to an Org member is supported. Its owner is `{ orgRunId, agentRunId }`, and it is served by `/agent-org-runs/:orgRunId/agent-runs/:agentRunId/context-files/:storedFilename`, with ownership proved by the Org tree (`agent_orgs.md`).
- Forward path: the migration renames the member folders out of `agent_orgs/<org>/…` and rewrites the container file without members (steps 2, 3 and 6). Nothing in the plan rewrites saved references or keeps the Org route resolving.
- Consequence: attachments in converted Org conversations no longer resolve (the route's ownership proof and the physical folder are both gone).
- Reachability: `Reachable`
- Review consequence: AR-005.

### `MP-03` — The user stops one unit while the Org runs, and another unit messages it

- Related requirement: REQ-006 (a unit row's Stop goes to that unit's own run), REQ-005
- Initiating basis kind: `User`
- Trigger: Stop on a unit row (approved REQ-006), then a handoff from another unit.
- Forward path: DS-002 "restores the target unit root if stopped". Today a message to a stopped run that is not related by a Task is refused, and reactivation of a related run is the assigner's alone (`cross-run-message-delivery.ts` admission; `ASSIGNER_ONLY_REACTIVATION_MESSAGE`).
- Consequence: the user's Stop is undone by any unit. The requirements do not say whether that is wanted.
- Reachability: `Reachable`
- Review consequence: AR-004 (Requirement Gap).

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Wake of a unit the user stopped individually (AR-004) | A new product policy not in the requirements | The user decides | Open |

## Review Decision

`Fail`

## Findings

### AR-001 — Team units' address space collides with Org addresses

- Type: `Design Impact`; severity High
- Protects: REQ-003, AC-003, preserved "Addresses, handoff texts, who may message whom"
- Problem:
  - Rebasing a Team unit's members to `/x` (team space) while Org agents keep `/x` (Org space) gives one address two meanings for a Team member (MP-01). Step 1 (own team) silently wins.
  - Today's Org-space forms that members have in their conversations and rules (`/software_engineering_team/code_reviewer`) are not said to work from inside the Team, and `get_handoff_rules` would mix team-space and Org-space addresses.
- Evidence: `agent_orgs.md` § Addresses ("A Team instance is one unit": Org-prefixed instance addresses); design § Intended Change, migration step 2; resolution order step 1 → step 2.
- Required update: one address rule for contained Team members, with an example. Choose one:
  - Team members keep Org-space addresses (the Team run stores its Org mount, and step 1 resolves within that prefix as today);
  - team space plus an explicit collision rule (e.g. Org definitions refusing a direct-agent name equal to a mounted member's name, which would be a new validation and possibly a Requirement Gap);
  - another rule that keeps today's resolution.
  
  State also how the old prefixed self-team form resolves, and which forms `get_handoff_rules` and the prompt show.
- Proportionate: one rule. It decides REQ-003's core promise.
- Recipient: Solution Designer

### AR-002 — The composed Org view has no defined shape

- Type: `Design Impact`; severity High
- Protects: REQ-006, AC-001, AC-003, REQ-005; preserved "Org view looks and works as today"
- Problem: DS-004 composes several unit `RunViewStream`s into one Org stream "in one order". But the parts that make today's Org view correct are not designed:
  - each unit's snapshot base and how one Org snapshot is made consistent across units;
  - a unit that is dormant, stopped, or restored mid-view (today a mode switch is one in-band snapshot of one root);
  - units joining or leaving (DS-006);
  - the `whileRestoring` rule (a message that restores a unit is posted after the view is live, SR-048);
  - a cross-unit message published by both runs (it is stored in both logs, so it must appear once);
  - commands to a unit that is not restored;
  - reconnect against a sequence the container assigns on receipt.
  
  Without these, the user-visible Org view can lose or duplicate frames.
- Evidence: `org-view-session.ts` (one root's stream, modes, `whileRestoring`); design DS-004 and Risks.
- Required update: a bounded local spine for the composition owner. Cover: per-unit connections and their bases, how the Org base and sequence are formed, which unit events trigger an in-band Org snapshot (unit mode change, join or leave), message de-duplication by message ID, command routing (restore on command or refuse), and reconnect. Add an example sequence: open the Org → message a dormant unit → that unit restores → events.
- Proportionate: the composition is the only new piece standing between the units and the unchanged web contract.
- Recipient: Solution Designer

### AR-003 — A second cross-run delivery path beside `CrossRunMessageDelivery`

- Type: `Design Impact`; severity Medium
- Protects: REQ-003 (both logs, CM-9), AC-003
- Problem: `OrgContainerPort.deliver(intent)` → the target root's new `deliverFromContainedUnit` duplicates the existing owner of messages between runs on one node, which already does prepare on the sender → accept in the receiver's gate (restored when stopped) → commit to the sender's log, with admission, `counterpart` and closed-Task refusals. Two paths for one capability diverge in their gates (Principle 1), and the design does not say who commits the sender's line (Case 1).
- Evidence: `cross-run-message-delivery.ts:1-60`; design DS-002 and the interface table.
- Required update: route unit-to-unit messages through `CrossRunMessageDelivery`. The container port answers only the placement (`placementAt`) and the relation, as a new explicit admission such as "same container", whose wake rule follows AR-004. Remove `deliver` from the port, or state why the existing owner cannot serve.
- Proportionate: reuse instead of a new path.
- Recipient: Solution Designer

### AR-004 — Waking a unit the user stopped (Requirement Gap)

- Type: `Requirement Gap`; severity Medium
- Concerns: REQ-006 (unit Stop), REQ-005 (restore as needed)
- Ambiguity: REQ-005 approves restoring units as needed after the Org is reopened. REQ-006 lets the user stop one unit. The requirements do not say what a message from another unit does to a unit the user stopped (MP-03): wake it (the design's new rule), or refuse it as a stopped run is refused today.
- Required action: the Solution Designer asks the user. The design then separates "not yet restored after reopen" (wake on need, approved) from "stopped by the user" (per the answer). Do not treat the design's wake rule as decided until then.
- Recipient: Solution Designer

### AR-005 — The migration's input map is incomplete

- Type: `Design Impact`; severity High
- Protects: REQ-007, AC-006, DEC-001
- Problem:
  - (a) **Saved context-file references.** Org attachments are owned by `{ orgRunId, agentRunId }` and served by Org routes whose ownership the Org tree proves. The plan moves the member folders and drops members from the container file, but says nothing about the route or the saved references in traces and messages (MP-02). Choose one: the Org routes keep resolving through the container's units to the unit run's folder, or the migration rewrites saved references (with `agent_orgs.md`'s IR049 inventory gate). New Org conversations need the same decision, since the web Org workspace is left alone.
  - (b) **Log lines with an outside party.** Since autobyteus-565, a line whose other party is outside the Org (a run the member delegated to, or a peer) is recorded with a `counterpart`. Step 4 classifies only intra-Team, cross-unit and user lines. Each line kind needs a target, the guideline's whole-input mapping (AF-07, autobyteus-508), plus a fixture. The user's run has none (checked), but the released shape does.
  - (c) **Reader predecessors.** Guideline §4 requires the new migration to leave items a reader predecessor may still select untouched while that reader is not terminal. The plan names writers only ("at least …"). State the rule, and which earlier migrations are readers of Org runs, e.g. `agent-org-history-first-message-summary-v1`, `team-communication-projection-address`, `team-context-file-execution-locators-v1`, `delegated-run-own-attachment-links`. The registry test enforces the full classification.
- Required update: add (a), (b) and (c) to the Migration Plan, each with fixtures.
- Proportionate: an irreversible migration of the user's real data. Each item is a released shape or a stored reference.
- Recipient: Solution Designer

### AR-006 — Derived consumers deferred to implementation, including readers that walk run folders

- Type: `Design Impact`; severity Medium
- Protects: REQ-006 (Memory page and run history as today), the preserved boundary, AC-001
- Problem: moving units into `agents/` and `agent_teams/` changes what every folder walker finds, not only the indexes:
  - `run-folder-discovery.ts:246-310`, used by memory search, the episodic catalog and the memory explorer;
  - `team-run-history-catalog-service.ts:290`;
  - `root-run-package-current-validator.ts:87-111`;
  - `memory-sync/source/local-memory-export-scanner.ts:41`. AF-09 notes Org units become syncable as a side effect but records no decision. Syncing a contained run to another node without its container is a behavior change.
  
  The design gives only a rule for the 28 `agent_org` sites. Contained runs could show as standalone runs in run history, the Memory page or search, and appear on other nodes through sync.
- Required update: an inventory in the design: the 28 sites plus the folder walkers, with a disposition for each (container, unit run, or "skip contained runs"). Include the memory-sync decision. Keeping today's behavior (contained runs not synced, as Org runs today) stays within scope; syncing them would be a Requirement Gap.
- Proportionate: Case 3, a reader of derived data left out. These readers decide what REQ-006 promises stays the same.
- Recipient: Solution Designer

## Classification

`Design Impact` (AR-001, AR-002, AR-003, AR-005, AR-006) and `Requirement Gap` (AR-004).

## Recommended Recipient

Solution Designer.

## Residual Risks

Notes, none blocking:

- DS-006: one member can get Team-rule and Org-rule changes from one event. Use the one `TeamChangeNoticeSource` net-merge, so it receives one notice.
- DS-007: FU-003 adds a peer request type. Under DESIGN.md rule 9, an older peer simply refuses it. State this in the release notes.
- Restore of a single Team unit by the Team manager: the unit gets its `OrgContainerPort` via `containedIn` → container directory. Name where that happens.
- File sizes: `agent-org-execution` is about 3,200 lines; keep the 500-line limit per file (the design says so).

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (MP-01..MP-03 reachable, witnessed forward)
- Notes:
  - The direction is sound and well grounded: the user's container decision, Team units reusing autobyteus-22 unchanged, a sealed migration with renames, and a narrow container port.
  - Before implementation the design needs: one address rule, a defined composed view, reuse of the existing cross-run delivery, a complete migration input map, and dispositions for derived readers. The user also has to decide the wake rule.
  - Classification is Large / High.
