# Design Review Report — package-personal-settings, stage 1 (autobyteus-95)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/package-personal-settings/tickets/in-progress/package-personal-settings/requirements-doc.md` (Approved, SR-004)
- Upstream Investigation Notes: `.../investigation-notes.md` (F-01..F-10, AF-01..AF-11)
- Upstream Solution Revision Record: `.../solution-revision-record.md` (SR-001..SR-005)
- Reviewed Design Spec: `.../design-spec.md` (SR-005, Ready), worktree commit `bc8ae29406`
- Supplemental Task Artifacts Reviewed: `personal-settings-file-contract.md` (approved Q1–Q5); `evidence/validate-personal-settings-file.mjs` and its logs; `follow-ups.md`
- Relevant Solution Revision IDs: SR-005 (design), SR-003/SR-004 (requirements)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: architecture review request from the Solution Designer, 2026-11-09
- Prior Review Round Reviewed: N/A (first review)
- Latest Authoritative Round: 1
- Current-State Evidence Basis: code at `origin/personal` `a85bf4f38d` in the worktree.
  - Server, the three definition services:
    - `agent-definition-service.ts:156-180, 227-298, 300-366`;
    - `agent-team-definition-service.ts:110-130, 194-200, 281-307`;
    - `agent-org-definition-service.ts:40-55, 123-144`.
  - Server, the store and wiring:
    - `agent-package-definition-store.ts:145-185, 262-272`;
    - `agent-package-definition-types.ts:66-82`;
    - `create-bundle-backed-definition-services.ts`, `host-definition-services.ts`, `build-studio-server.ts:250-262`;
    - `agent-package-definition-feed-composition.ts:22-60`, `tool-list-updates.ts:20-30`.
  - Server, the update pipeline: `github-agent-package-updates.ts:99-175`, `agent-package-service.ts:252, 420`.
  - Server, other readers: `application-standalone-package-validator.ts:60-110`, `start-standalone-application-host.ts:200-215`.
  - Web:
    - `AgentDefinitionForm.vue:455-475`, `AgentEdit.vue:92`, `TeamLocalAgentMemberDetails.vue:107-115`, `AgentTeamEdit.vue:94`;
    - `AgentOrgExperience.vue:466-495`, `agentOrgDefinitionStore.ts:95-120`;
    - grep of every web caller of the three update mutations.
  - The local `autobyteus-agents` checkout, searched for agent configs that list processors (none found).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed:
  - new persisted user data;
  - every definition read (run start, members, delegated copies, running agents' tools) passes a new projection;
  - the GitHub update pipeline gains a download and a write of user data;
  - new GraphQL fields and mutations.
  - Confirmed.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. The design spec does not show the user's approval of the design as `Pending`; the requirements and contract carry the user's approvals.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` for the approved intent. Target paths need correction (rows below).
- Approved requirements / intended behavior understood: Yes.
  - Four personal settings (tools, skills, avatar, runtime/model) are stored per node outside the package files and applied on read, for package definitions and built-in agents.
  - App saves of those settings never write package files.
  - Every GitHub update first captures file edits of the four settings and backs up changed files. It stops only when the installed revision cannot be downloaded.
  - The editor shows marks and offers a reset.
- Relevant existing behavior and evidence confirmed:
  - AF-02: only the three services read `packageDefinitions.store` outside `agent-package-definitions/`. Confirmed by grep: agent `:231, 245, 268, 281, 290, 355`; team `:198, 207, 221-224, 239, 249, 258, 340`; org `:49, 54, 60, 72, 82, 87`.
  - AF-04: the entry location carries `sourceClass` (`agent-package-definition-types.ts:66-82`). The store returns copies (`agent-package-definition-store.ts:150-151, 266`), so applying on read cannot leak into the store.
  - AF-06: agent updates read the package value through `readStoredDefinition` (`agent-definition-service.ts:227-232, 304`).
  - DS-003 runs inside the package's serialize: `agent-package-service.ts:252` → `githubUpdates.updatePackage`. Both the manual Update (GraphQL `agent-packages.ts:245`) and the automatic pass (`update-pass.ts:153`) reach it.
- Scope guardrail confirmed: Yes (UC-001..UC-005 stage 1; Out of Scope; Preserved Behavior Boundary; Review Authority).
- Approved change, preserved behavior and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding traceable to an approved ID: `Yes`.
- Remaining material ambiguity: none in the requirements. AR-001..AR-003 concern the design.
- Statements about existing code the design relies on, opened at their cited lines:
  - Correct: AF-01, AF-02, AF-04, AF-05, AF-06 (agents), AF-07 (`agent-package-definition-feed-composition.ts:36-39`; `tool-list-updates.ts:27`), AF-09.
  - Partly inaccurate:
    - "`AgentOrgExperience.vue:482-492` sends only the avatar". It sends `name`, `description`, `members` and `handoffs` on every save (`:470-475, 490-493`); of the four settings, only the avatar. This matters for AR-002.
    - "Teams and Orgs: the same" for updates (DS-002). Team and Org updates read their base through the public `getDefinitionById` (`agent-team-definition-service.ts:286`, `agent-org-definition-service.ts:125`), which DS-001 makes effective. This is AR-001.
    - DS-001 names `store.getEntry`; the services call `store.getDefinition` today. The change is fine, since `getEntry` (`:159`) gives the `sourceClass`.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-002..004 (reads) | User/System | Pass | Pass | Pass. Read boundary confirmed. Wiring is not named (AR-004). | Confirmed | AR-004 (non-blocking) |
| BEH-002..004 (saves) | User | Pass | Pass | Fail: Team and Org updates would base the file write on the effective definition; the "really changed" rule is undefined | Needs Correction | AR-001, AR-002 |
| BEH-001 (update capture) | System/User | Pass | Pass | Fail: a blanket "anything fails → stop" turns an unreadable local edit into a permanent update failure | Needs Correction | AR-003 |
| BEH-001 texts | User | Pass | Pass | Pass | Confirmed | AR-005 (non-blocking) |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `personal-settings-file-contract.md` | Pass | Pass | Pass | Pass | Pass (approved Q1–Q5) | — |
| `evidence/validate-personal-settings-file.mjs` + logs | Pass | Pass | Pass | Pass | Pass | — |

Note: the investigation notes have no supplement inventory table; the requirements doc lists the contract as its behavior-defining supplement. The requirements doc still names "this document at SR-003" as the exact approved baseline, and its Readiness says "(SR-003)", although the status is SR-004. Correct both with the revision.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature | — |
| Root-cause classification is explicit and evidence-backed | Pass | Single read boundary per kind (AF-02, confirmed) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Shared announce only | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Fail | The "Several kinds and forms" trigger lists write forms but does not trace Team and Org updates, which read their base through the effective read (AR-001) | AR-001 |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 reads | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 saves | Primary | Pass (agents) | Fail | Pass | Pass | Fail: for Teams and Orgs the base read is not drawn, and the comparison rule is not named | Pass | Fail (AR-001, AR-002) |
| DS-003 update capture | Primary | Pass | Pass | Pass | Pass | Fail: the failure handling per step is not drawn | Pass | Fail (AR-003) |
| DS-004 announce | Return/Event | Pass | Pass | Pass | Pass | Pass (wiring order: AR-004) | Pass | Pass |
| DS-005 store write | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

DS-002 for Teams and Orgs, redrawn from today's code with the design's DS-001 change applied:

```text
AgentTeamEdit / AgentOrgExperience Save
  → updateDefinition(id, input)
  → existing = getDefinitionById(id)             ← public read, now EFFECTIVE (personal avatar / runtime applied)  ✗
  → revision check
  → candidate = existing + input (Org: avatarUrl: v.avatarUrl ?? existing.avatarUrl)
  → fileStore.update(candidate)                  ← writes the personal values into team-config.json / org-config.json  ✗
```

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `PersonalSettingsService` | Pass | Pass | Pass | Pass | Only owner of the file |
| Agent definition service | Pass | Pass | Pass | Pass | `readStoredDefinition` (package) vs public read (effective) |
| Team / Org definition services | Fail | Fail | Fail | Fail | No package-value read; the update uses the public, effective read (AR-001) |
| `PackageEditCapture` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Services, `agent-packages` → `personal-settings` | Pass | Pass | Pass | Pass | — |
| `personal-settings` → built-in registry (IDs), definition domain types | Pass | Pass | Pass | Pass | The registry imports nothing (AF-05) |
| Announce function injected | Pass | Pass | Pass | Pass | AR-004 on construction order |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `apply(kind, definition, sourceClass)`, `appliesTo(kind, id, sourceClass)` | Pass | Pass | Pass | Low | Pass |
| `setEdited(kind, id, packageValues, editedValues)` | Pass | Pass | Pass | Low | Pass |
| `reset(kind, id, setting)`, `personalSettingsOf`, `captureFromPackageEdits` | Pass | Pass | Pass | Low | Pass |
| GraphQL `personalSettings`, `usesPersonalSettings`, three reset mutations | Pass | Pass | Pass | Low | Pass |
| `GitHubAgentPackageInstaller.downloadRevision(source, revision, targetDir)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Revision reading | Pass | Pass | N/A | Pass | Folder readers, same ID rules |
| Download by revision | Pass | Pass | N/A | Pass | Installer helpers made public |
| Announce | Pass | Pass | N/A | Pass | One function from the feed composition |
| Atomic JSON write | Pass | Pass | N/A | Pass | `writeAtomicJsonSync` |
| Personal settings owner | Pass | Pass | Pass | Pass | No existing owner (F-08: the earlier launch-preference store was withdrawn) |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/personal-settings` | Pass | Pass | Pass | Pass | — |
| Agent definition | Pass | Pass | Pass | Pass | — |
| Team / Org definition | Fail | Pass | Fail | Fail | AR-001 |
| `src/agent-packages` (capture) | Pass | Pass | Pass | Pass | Failure rules: AR-003 |
| Compositions | Fail | Pass | Pass | Fail | Construction and injection sites not named (AR-004, non-blocking) |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Record type, key, validator | Pass | Pass | Pass | Pass | One domain file |
| Package-value read per kind | Fail | N/A | Fail | Fail | Only the agent service has one (AR-001) |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Personal settings record (contract §3) | Pass | Pass (§3.4) | Pass | N/A | Pass | — |
| GraphQL marks | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass`. Reads, GraphQL types, the unchanged update input, launch defaults, `tool-list-updates`, admission and the 210 texts are listed. AR-001 is a reader of the effective definition that should not be one, and is handled as its own finding.

Each domain word keeps one meaning and each concept one name (Principle 15): `Fail` (non-blocking; AR-005). "Package value" also covers a built-in template. The UI label "Reset to the package's setting" and the note "Package updates keep them" would show on built-in agents, which have no package and are not updated by package updates.

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New `personal-settings/*` files | Pass | Pass | Pass | Pass | — |
| Three service files | Pass | Fail (Team/Org: AR-001) | N/A | Fail | — |
| `package-edit-capture.ts`, `github-agent-package-updates.ts`, installer | Pass | Pass | N/A | Pass | — |
| Compositions | Fail | Pass | N/A | Fail | The mapping names "the server build composition", but the services are built in `create-bundle-backed-definition-services.ts:28-42` and `host-definition-services.ts:46-51` (AR-004) |
| Web files | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/personal-settings/{domain,stores,services}` | Pass | Pass | Low | Pass | — |
| `agent-packages/services/package-edit-capture.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| None claimed | Pass | N/A | Pass | Pass | The update paths still write the four settings for the user's own definitions, so nothing becomes dead |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Personal values also in package files | No (rejected in the log) | Pass | Pass | — |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `personal-settings.json` (new) | New file, tolerant reader | Pass (validation V-A..V-D) | Pass | N/A | Pass | Unreadable file kept and copied before its first rewrite |
| `backups/<install key>/<time>/` (new) | New, latest 5 kept | Pass | Pass | N/A | Pass | — |
| Package files | Not Affected (changed only by the update, after backup) | Pass | Pass | N/A | Pass | AR-001 must hold for this to stay true |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server | Pass | Pass | Pass | Pass (AR-004 wiring) |
| Web | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Personal-only save, built-in scope, same-as-package, capture | Yes | Pass | Pass | Pass | — |
| Team/Org save with a personal avatar and another field changed | Yes | Fail | N/A | Fail | AR-001 |
| Capture with an unreadable definition | Yes | Fail | N/A | Fail | AR-003 |

## Material Premise Validation

### `MP-001` — A package Team or Org with a personal avatar or runtime/model is then edited in another field

- Related approved requirement: REQ-003 ("… never the package files"); BEH-002 (checkouts stay clean); UC-002, UC-003.
- Relevant behavior ID(s): BEH-002..004.
- Initiating basis kind: `User`.
- Independent trigger: the user sets a personal avatar on a package Team (UC-002), then later edits that Team's description, members or handoffs in the Team editor (`AgentTeamEdit.vue:94`). For an Org, the user edits members in `AgentOrgExperience.vue`.
- Forward path:
  1. `updateDefinition` reads `existing = getDefinitionById(id)` (`agent-team-definition-service.ts:286`; `agent-org-definition-service.ts:125`). DS-001 makes that read apply personal settings.
  2. The candidate keeps `existing.avatarUrl` and `existing.defaultLaunchConfig` (`:121-124`; Org `:135-136`).
  3. `fileStore.update(candidate)` writes them.
- Consequence: the user's personal avatar or runtime/model is written into `team-config.json` / `org-config.json`, which shows in a local checkout and is published to everyone who uses the package. This breaks REQ-003.
- Reachability: `Reachable`.
- Review consequence: AR-001.

### `MP-002` — An avatar-only save of a package Org

- Related approved requirement: REQ-003; the agent analogue AC-001 (`git status` clean).
- Relevant behavior ID(s): BEH-003.
- Initiating basis kind: `User`.
- Independent trigger: the user changes only the avatar in the Org editor (UC-002).
- Forward path:
  1. The save always sends `name`, `description`, `members` and `handoffs` (`AgentOrgExperience.vue:470-475, 490-493`), with members converted by `toMutationMembers` (`agentOrgDefinitionStore.ts:107`).
  2. DS-002 writes the files when "another field's normalized value differs", but does not say what is compared or how it is normalized.
  3. If the GraphQL input is compared with the stored definition, member representation differences (`refType`, `refScope`; FT-5/O-2) count as changes.
- Consequence: an avatar-only save rewrites `org-config.json`, the FT-5/O-2 noise included. This breaks REQ-003 and the checkout-clean goal.
- Reachability: `Reachable`. Whether it happens depends on the unspecified comparison.
- Review consequence: AR-002.

### `MP-003` — A hand-edited package config that the readers cannot read, at the next GitHub update

- Related approved requirement: REQ-006 (stop only when the installed revision cannot be downloaded); the Preserved Behavior Boundary (the update pipeline and automatic updates, 209/210); AC-002, AC-003.
- Relevant behavior ID(s): BEH-001.
- Initiating basis kind: `User` + `System`.
- Independent trigger: the user's documented workflow. On his Docker server he enables an MCP server by editing an agent's `agent-config.json` in the GitHub package folder (investigation "Request", 2026-10-24; F-01). An edit with a JSON error, or a value the reader rejects, makes that definition a load issue. The automatic pass (210) or a click then runs an update.
- Forward path:
  1. `updatePackage` calls `PackageEditCapture`, which reads the current install with the folder readers.
  2. That definition yields a load issue, not a definition (`KindDefinitionReadResult`).
  3. The design says "If anything fails, the update stops with nothing changed".
- Consequence: the package can never update again, by click or automatically, until the user finds and fixes the file. Today the update replaces the broken file. Capture has no rule for a definition that cannot be read on either side (installed revision or disk).
- Reachability: `Reachable`.
- Review consequence: AR-003.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Requirements doc names "SR-003" as the exact approved baseline and in Readiness; status is SR-004 | Stale reference | Correct with the revision | Open (non-blocking) |
| Investigation notes lack a supplement inventory table (contract, validation script) | Canonical supplement inventory | Add it | Open (non-blocking) |

## Review Decision

`Fail`. The main choices are sound:
- the read boundary is complete: the three services are the only readers, and their reads return copies;
- the scope rule uses `sourceClass` plus the built-in IDs;
- capture runs inside the package's serialize, before staging, on both the click and automatic paths;
- the contract is validated on real data.

Three gaps in the write and update paths need design text before implementation (AR-001..AR-003).

## Findings

### AR-001 — Team and Org updates would write personal values into package files (Design Impact, Major, blocking)

- Protects: REQ-003, BEH-002 (checkouts clean), UC-002, UC-003.
- Scope status: `Within Approved Scope`. Changes approved behavior: No.
- Evidence:
  - Team `updateDefinition` reads `existing = await this.getDefinitionById(definitionId)` (`agent-team-definition-service.ts:286`) and builds the candidate from it, keeping `avatarUrl` and `defaultLaunchConfig` (`:121-124`). Org does the same (`agent-org-definition-service.ts:125, 135-136`).
  - DS-001 makes `getDefinitionById` apply personal settings for Teams and Orgs ("the same, without the strip step").
  - DS-002 draws the package-value base read only for agents (`readStoredDefinition`, `agent-definition-service.ts:227-232`). "Teams and Orgs: avatar and runtime/model only" does not say which value the update starts from.
- Material premise: MP-001 (Reachable).
- Required update: give the Team and Org services a package-value read, as the agent service has (`readStoredDefinition` → store entry, no apply). Draw DS-002 for Teams and Orgs in call order:
  1. `updateDefinition` reads the package value.
  2. Revision check against the package value (personal settings do not change `revision`).
  3. Split: the avatar and runtime/model from the input go to `PersonalSettingsService.setEdited(kind, id, packageValues, editedValues)`. The other fields are built onto the package value.
  4. `fileStore.update` runs only when one of those other fields changed (AR-002), with the package's avatar and runtime/model.
  5. Return the effective definition.
  - Add a test per kind: a personal avatar exists, a description is changed, and the written file keeps the package's avatar.
- Why proportionate: one private read per service (the agent service already has it) and a drawn sequence.
- Recipient: Solution Designer.

### AR-002 — The split's "really changed" rule is not defined (Design Impact, Moderate, blocking)

- Protects: AC-001, REQ-003 (a personal-only save writes no package file), for agents, Teams and Orgs.
- Scope status: `Within Approved Scope`. Changes approved behavior: No.
- Evidence:
  - The editors send full values in a shape that differs from the stored package value:
    - agents send processor lists already stripped of mandatory processors (`AgentDefinitionForm.vue:456-472`; strip at `agent-definition-service.ts:156-180`), plus `role || undefined` and `category || undefined`;
    - the Org editor always sends `name`, `description`, `members` (through `toMutationMembers`) and `handoffs` (`AgentOrgExperience.vue:470-475, 490-493`);
    - the Team editor sends full update input.
  - The current update normalizes each field on its way in (`agent-definition-service.ts:325-350`; `buildDefinitionUpdateCandidate`, `agent-team-definition-service.ts:110-130`).
  - DS-002 says only "the other fields whose normalized value differs".
- Material premise: MP-002 (Reachable, depending on the unspecified rule). For agents I found no package config that lists processors in the local `autobyteus-agents`, so the agent processor case is not demonstrated on real data; the rule is still needed.
- Required update: state the rule per kind. For example:
  1. Build the update candidate exactly as today: the package value plus the input, through the service's own normalizers.
  2. Compare each non-personal field of the candidate with the package value as the editor received it: the stripped projection for agents; the domain model for Team nodes and Org members, not the GraphQL input.
  3. Write the files only if a field differs.
  - Name the tests: a personal-only save for an agent, a Team and an Org (avatar only), each on a real package fixture, asserting no file write.
- Why proportionate: a stated comparison and three tests; no new mechanism.
- Recipient: Solution Designer.

### AR-003 — Capture's failure rule is a blanket stop (Design Impact, Moderate, blocking)

- Protects: REQ-006 (stop only when the installed revision cannot be downloaded); the Preserved Behavior Boundary (the package update pipeline and automatic updates, 209/210); AC-002, AC-003; "nothing is lost silently".
- Scope status: `Within Approved Scope`. Changes approved behavior: No.
- Evidence: DS-003 and its narrative say "A capture failure → `markUpdateFailed` and throw" and "If anything fails, the update stops with nothing changed". The folder readers return per-definition results that can be load issues (`agent-package-definition-types.ts:60-63`). The design has no rule for a definition that cannot be read in the installed revision or on disk.
- Material premise: MP-003 (Reachable).
- Required update: draw DS-003's failure handling per step, with one explicit result each.
  - The installed revision cannot be downloaded or extracted: the update stops, nothing changes (REQ-006, AC-004).
  - A definition cannot be read on either side: no capture for that definition, a logged warning, and its differing files go to the backup like any other. The update continues and replaces the file, as today.
  - A backup cannot be written: the update stops, so nothing is lost silently.
  - Order the writes so a stop leaves no partial user-data change. For example: back up first, then `captureFromPackageEdits` (one write), then stage.
  - Say what remains when staging or the skill-name check fails after capture (the captured record and the backup). The effective values are unchanged, because the captured edits are still in the files; the next update captures idempotently.
  - Add a test: a malformed `agent-config.json` on disk, update succeeds, file in the backup.
- Why proportionate: rules and an order for steps the design already has.
- Recipient: Solution Designer.

### AR-004 — Construction and announce wiring are not named (Design Impact, Minor, non-blocking alone)

- Protects: REQ-002 (every read applies personal settings), DS-004.
- Evidence:
  - The agent and Team services are constructed in `create-bundle-backed-definition-services.ts:28-42`, and the Org service in `host-definition-services.ts:46-51`. Both the studio server and the standalone application host use them (`build-studio-server.ts:254`; `start-standalone-application-host.ts:212`).
  - `getInstance()` builds a default instance when none is bound (`agent-definition-service.ts:112`, `agent-team-definition-service.ts:138`, `agent-org-definition-service.ts:30`).
  - The announce function exists only once the feed composition runs, after the host services (`build-studio-server.ts:258-262`; publisher at `agent-package-definition-feed-composition.ts:36-39`).
  - The File Mapping names only "the server build composition".
- Required update:
  - Name where `PersonalSettingsService` is constructed and how the three services receive it.
  - Give `PersonalSettingsService` an announce setter, cleared on close, as the reloader's `setPublisher`.
  - State the standalone host's behavior. It reads registered packages through the same factory, has no feed, and has no editor.
- Recipient: Solution Designer.

### AR-005 — "Package" wording on built-in agents (Out-of-Scope Recommendation, non-blocking; Principle 15)

- Concerns: REQ-004 ("Reset to the package's setting"), the UI note "Package updates keep them", DEC-009.
- Evidence:
  - Built-in agents are not from a package. Their files are replaced at every server start (`built-in-agent-bootstrapper.ts:103-108`), not by package updates.
  - The design's Terminology stretches "package value" to "the built-in template".
- Recommendation: give built-in agents accurate wording, for example "Reset to the built-in setting" and "Restarts keep them". Because REQ-004's label text is approved, this is the Solution Designer's call with the user.
- Recipient: Solution Designer.

## Classification

`Design Impact` (AR-001..AR-004); AR-005 is a recommendation.

## Recommended Recipient

Solution Designer (`/software_engineering_team/solution_designer`).

## Residual Risks

- R-1, the Org runtime/model (the Solution Designer's question 4). The design is consistent with the requirements: REQ-003 concerns changes made in the app, and the app has no Org runtime/model editor (confirmed: no web code writes an Org `defaultLaunchConfig`; create sends `null`, `AgentOrgExperience.vue:483`). The effect is worth telling the user plainly:
  - an Org's personal runtime/model can come only from capture of a GitHub package's file edit;
  - for a local package Org it cannot be personal at all: a file edit is the package's value;
  - it shows a "Personal" mark with reset.
  - A UC-003 reading of "choose it in the app" would be new UI for Product.
- R-2: a package installed before revision tracking cannot be captured, so its updates stop (Risks section). Personal settings survive the remedy (remove and re-import), because the IDs come from folder names; say so in the docs.
- R-3: a user who removes a tool a built-in agent needs breaks that agent until Reset (Risks section).

## Latest Authoritative Result

- Review Decision: `Fail` (Design Impact; AR-001..AR-003 blocking; AR-004 non-blocking; AR-005 recommendation)
- Material-Premise Gate: `Pass` (MP-001..MP-003 Reachable; each drives a finding)
- Notes: task_size `Large`, architectural_risk `High` confirmed. On the four points asked:
  - (1) the read boundary is complete;
  - (2) the split is right for agents but needs AR-001 and AR-002;
  - (3) capture runs inside serialize, but needs AR-003's failure rules;
  - (4) the Org runtime/model handling is consistent with the requirements (R-1).
