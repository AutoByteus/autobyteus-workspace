# Design Review Report — package-personal-settings, stage 1 (autobyteus-95)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/package-personal-settings/tickets/in-progress/package-personal-settings/requirements-doc.md` (Approved, SR-006: SR-004 content approved by the user, plus the built-in reset wording)
- Upstream Investigation Notes: `.../investigation-notes.md` (F-01..F-10, AF-01..AF-11)
- Upstream Solution Revision Record: `.../solution-revision-record.md` (SR-001..SR-006)
- Reviewed Design Spec: `.../design-spec.md` (SR-006, Ready, revised), worktree commit `e35899a68c`; round 1 reviewed SR-005 at `bc8ae29406`
- Supplemental Task Artifacts Reviewed: `personal-settings-file-contract.md` (approved Q1–Q5); `evidence/validate-personal-settings-file.mjs` and its logs; `follow-ups.md`
- Relevant Solution Revision IDs: SR-006 (revision for AR-001..AR-005), SR-005 (design), SR-003/SR-004 (requirements)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: re-review request for SR-006 (design spec "Revision SR-006", "Write Forms Per Kind", "Capture Failure Rules"), 2026-11-09
- Prior Review Round Reviewed: round 1 (ARCH-REV-001, Fail, Design Impact; AR-001..AR-005)
- Latest Authoritative Round: 2
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
  - Round 2, the new citations:
    - `file-agent-definition-provider.ts:342-376` (`update`, the Org-owned refusal at `:346`, `serializeAgentMd`, `mergeAgentConfigRecord`);
    - `file-agent-team-definition-provider.ts:89-95` (`content()`);
    - `file-agent-org-definition-provider.ts:57-65` (`files()`);
    - `GLOSSARY.md` and code, searched for other meanings of "base".

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

- Overall Basis Status: `Confirmed`.
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
- Remaining material ambiguity: None. SR-006 changes only the wording of REQ-004's reset label for built-in agents ("Reset to the built-in setting"). The Solution Designer made that wording change within the approved direction and reported it to the user; it changes no behavior.
- Statements about existing code the design relies on, opened at their cited lines:
  - Correct: AF-01, AF-02, AF-04, AF-05, AF-06 (agents), AF-07 (`agent-package-definition-feed-composition.ts:36-39`; `tool-list-updates.ts:27`), AF-09.
  - Round 1 inaccuracies, now corrected in SR-006's Current-State Read: the Org editor's payload (`AgentOrgExperience.vue:470-475, 490-493`), and the Team and Org base reads (`:286`, `:125`).
  - DS-001 still names `store.getEntry`; the services call `store.getDefinition` today. The switch is needed and fine, since `getEntry` (`:159`) gives the `sourceClass`.
  - SR-006's new citations hold: the agent serializers (`file-agent-definition-provider.ts:361-376`), Team `content()` (`:89-95`), Org `files()` (`:57-65`), and the Org-owned agent refusal (`:346`).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-002..004 (reads) | User/System | Pass | Pass | Pass (read boundary confirmed; construction and wiring named) | Confirmed | — |
| BEH-002..004 (saves) | User | Pass | Pass | Pass (every write form starts from the base read; rendered-file comparison) | Confirmed | — |
| BEH-001 (update capture) | System/User | Pass | Pass | Pass (per-step failure rules; order backup → capture → staging) | Confirmed | — |
| BEH-001 texts; editor wording | User | Pass | Pass | Pass (`personalSettingsBase` picks package or built-in wording) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `personal-settings-file-contract.md` | Pass | Pass | Pass | Pass | Pass (approved Q1–Q5) | — |
| `evidence/validate-personal-settings-file.mjs` + logs | Pass | Pass | Pass | Pass | Pass | — |

The investigation notes now have a supplement inventory, and the requirements doc's baseline and Readiness lines are corrected (SR-006). The contract's wording change ("base value") changes no rule; I compared the diff.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature | — |
| Root-cause classification is explicit and evidence-backed | Pass | Single read boundary per kind (AF-02, confirmed) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Shared announce only | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | "Write Forms Per Kind" traces each kind and write form from the base read | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 reads | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 saves | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 update capture | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 announce | Return/Event | Pass | Pass | Pass | Pass | Pass (wiring order: AR-004) | Pass | Pass |
| DS-005 store write | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

DS-002 and DS-003 redrawn in call order from the SR-006 text:

```text
Save (agent / Team / Org editor)
  → service.update(id, input)
  → base = readStoredDefinition / readBaseDefinition (store entry, no apply)
  → [Team, Org] revision check against base
  → appliesTo(kind, id, sourceClass)? no → today's update, stop
  → candidate = base + input via today's normalizers, personal fields kept at base
  → fileStore.rendersDifferently(base [agents: stripped], candidate)?
       yes → validate → fileStore.update(candidate) → reload owning folder
  → PersonalSettingsService.setEdited(kind, id, baseValues, editedValues) → write + announce if changed
  → return the effective definition (public read)

updatePackage (inside serialize)
  → head read → newer?
  → PackageEditCapture: downloadRevision(installed) [fail → stop]
      → read both trees (an unreadable definition → warn, no capture)
      → list differing files → back up, keep 5 [fail → stop, partial backup removed]
      → captureFromPackageEdits (one write, one announce) [fail → stop]
      → remove the temporary download [fail → log]
  → stagePackageReplacement → skill-name check → commit   (unchanged)
```

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `PersonalSettingsService` | Pass | Pass | Pass | Pass | Only owner of the file |
| Agent definition service | Pass | Pass | Pass | Pass | `readStoredDefinition` (package) vs public read (effective) |
| Team / Org definition services | Pass | Pass | Pass | Pass | Private `readBaseDefinition` feeds every write form |
| `PackageEditCapture` | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Services, `agent-packages` → `personal-settings` | Pass | Pass | Pass | Pass | — |
| `personal-settings` → built-in registry (IDs), definition domain types | Pass | Pass | Pass | Pass | The registry imports nothing (AF-05) |
| Announce function injected | Pass | Pass | Pass | Pass | `PersonalSettingsService.setPublisher`, set and cleared by the feed composition |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `apply(kind, definition, sourceClass)`, `appliesTo(kind, id, sourceClass)` | Pass | Pass | Pass | Low | Pass |
| `setEdited(kind, id, packageValues, editedValues)` | Pass | Pass | Pass | Low | Pass |
| `reset(kind, id, setting)`, `personalSettingsOf`, `captureFromPackageEdits` | Pass | Pass | Pass | Low | Pass |
| GraphQL `personalSettings`, `personalSettingsBase` (`PACKAGE` / `BUILT_IN` / null), three reset mutations | Pass | Pass | Pass | Low | Pass |
| `FileXDefinitionProvider.rendersDifferently(a, b)` | Pass | Pass | Pass | Low | Pass |
| `PersonalSettingsService.setPublisher(fn \| null)` | Pass | Pass | N/A | Low | Pass |
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
| Team / Org definition | Pass | Pass | Pass | Pass | — |
| `src/agent-packages` (capture) | Pass | Pass | Pass | Pass | "Capture Failure Rules" |
| Compositions and factories | Pass | Pass | Pass | Pass | `create-bundle-backed-definition-services.ts`, `host-definition-services.ts`, feed composition |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Record type, key, validator | Pass | Pass | Pass | Pass | One domain file |
| Base-value read per kind | Pass | N/A | Pass | Pass | Agent `readStoredDefinition`; Team and Org `readBaseDefinition` |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Personal settings record (contract §3) | Pass | Pass (§3.4) | Pass | N/A | Pass | — |
| GraphQL marks | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass`. Reads, GraphQL types (now `personalSettingsBase`), the unchanged update input, launch defaults, `tool-list-updates`, admission and the 210 texts are listed. No write form reads the effective definition any more.

Each domain word keeps one meaning and each concept one name (Principle 15): `Pass`.
- "Base value" replaces "package value" in the design and the contract, and the UI names the base by its source (package or built-in).
- "Base" has other uses: `GLOSSARY.md` "base image" (Docker) and the collaboration code's `launchBase`. These are different compound terms, so there is no clash in meaning. Still, add "base value" to `GLOSSARY.md` next to "personal setting" (R-4).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New `personal-settings/*` files | Pass | Pass | Pass | Pass | — |
| Three service files | Pass | Pass | N/A | Pass | — |
| Three file-store providers (`rendersDifferently`) | Pass | Pass | N/A | Pass | Uses the serializers `update` writes with |
| `package-edit-capture.ts`, `github-agent-package-updates.ts`, installer | Pass | Pass | N/A | Pass | — |
| Factories and compositions | Pass | Pass | N/A | Pass | Named in the File Mapping (AR-004 resolved) |
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
| Package files | Not Affected (changed only by the update, after backup) | Pass | Pass | N/A | Pass | Holds: no write form starts from the effective definition |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server | Pass | Pass | Pass | Pass |
| Web | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Personal-only save, built-in scope, same-as-package, capture | Yes | Pass | Pass | Pass | — |
| Team/Org save with a personal avatar and another field changed | Yes | Pass | Pass | Pass | SR-006 example |
| Org avatar-only save; capture with a broken file | Yes | Pass | Pass | Pass | SR-006 examples; staging-failure worked example |

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
- Review consequence: AR-001. Resolved in SR-006: every write form starts from the base read, and the candidate keeps the base values of the personal fields.

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
- Review consequence: AR-002. Resolved in SR-006: `rendersDifferently` compares the files the store would write, so representation differences in the input disappear. There is a personal-only-save test per kind, and the Org one uses the real editor payload.

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
- Review consequence: AR-003. Resolved in SR-006: an unreadable definition is not captured, its files are backed up, and the update continues. Only a failed download, backup write or personal settings write stops the update.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Requirements baseline references; supplement inventory | Round 1 housekeeping | Corrected in SR-006 | Resolved |

## Review Decision

`Pass`. The behavior basis is confirmed. AR-001..AR-005 and the round 1 housekeeping are resolved in the SR-006 design spec, requirements doc, contract and investigation notes, and the newly cited code checks out. Every structural verdict passes, and no in-scope machinery depends on an unsupported premise.

## Findings

None open. See the prior-finding table in `architecture-review-revision-record.md`, ARCH-REV-002.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation engineer (`/software_engineering_team/implementation_engineer`), per the pass rule.

## Residual Risks

- R-1, the Org runtime/model: recorded under the design's Risks and reported to the user with SR-006. The app has no editor for it, so a personal value comes only from capture of a GitHub package's file edit. For an Org in a local package it cannot be personal.
- R-2: a package installed before revision tracking cannot be captured, so its updates stop. Personal settings survive the remedy (remove and re-import); the docs say so.
- R-3: a user who removes a tool a built-in agent needs breaks that agent until Reset.
- R-4 (implementation note): add "base value" to `GLOSSARY.md` together with "personal setting" (Principle 15: a word the design introduces goes into the project glossary).
- R-5 (implementation note): `readBaseDefinition` for Teams must keep today's application-owned branch (`parseCanonicalApplicationOwnedTeamId` → `fileStore.getById`, `agent-team-definition-service.ts:194-199`). Such definitions are out of scope and update exactly as today.
- R-6 (implementation note): `createBundleBackedDefinitionServices` is also called by the standalone package validator (`application-standalone-package-validator.ts:78`) with a read-only definition config. The `PersonalSettingsService` built there finds no file and is never written. That is harmless; keep it read-only (no publisher, no process binding).
- R-7 (behavior to keep visible): a personal-only save of an Org-owned agent now succeeds, where every save of it was refused before (`file-agent-definition-provider.ts:346`). Saves that change other fields are still refused. This is intended (UC-001 includes Org members) and recorded in the design's notes.

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-002, SR-006)
- Material-Premise Gate: `Pass` (MP-001..MP-003 Reachable; the SR-006 design addresses each)
- Notes: task_size `Large`, architectural_risk `High` confirmed. Next: implementation.
