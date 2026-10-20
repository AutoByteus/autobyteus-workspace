# Design Review Report: remove-skill-improvement (autobyteus-205)

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/remove-skill-improvement/requirements-doc.md` (Approved; SR-002 approval, SR-003 evidence extension within DEC-001)
- Upstream Investigation Notes: `tickets/in-progress/remove-skill-improvement/investigation-notes.md` (F-01..F-11, A-01..A-09)
- Upstream Solution Revision Record: `tickets/in-progress/remove-skill-improvement/solution-revision-record.md` (SR-001..SR-003)
- Reviewed Design Spec: `tickets/in-progress/remove-skill-improvement/design-spec.md` (SR-003, `Ready`)
- Supplemental Task Artifacts Reviewed: `release-notes.md` (SR-003); `follow-ups.md` (FU-001)
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003
- Architecture Review Revision Record: `tickets/in-progress/remove-skill-improvement/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: `Architecture Design Complete` from `/software_engineering_team/solution_designer` (Large / High)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skill-improvement` at `837c2e54b5`. Read:
  - `global-agent-run-message-router.ts:55-140, 244-282` and `direct-agent-run-message-grant-registry.ts:77-103`;
  - grep for `server_helper` / `launchPurpose` outside the feature (`agent-run-metadata-types.ts`, `agent-run-metadata-store.ts:62`, `agent-run-provisioning-service.ts:100`, `standalone-agent-run-eligibility.ts:5`, `agent-run-service.ts:40`);
  - grep for `improverRunId` / `evolverRunId`;
  - `built-in-agent-registry.ts:5-29`; `server-settings-service.ts`; `app-config-setting-policy.ts`; `app-config.ts:552-566` (`discardRetiredSettings`);
  - `agent-run-history-index-store.ts:130`; the precedent migrations (`remove-built-in-project-task-manager`, `remove-work-trace-exports`, `remove-external-messaging-data`).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: a startup migration that deletes data on every install; removal of a public GraphQL API; a change on the shared `send_message_to` path; about 80 files across server, web and docs.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood:
  - remove the feature and everything only it uses (REQ-001, REQ-002) with no shim;
  - delete its data once at first start (REQ-005, DEC-001 C, by the user);
  - keep the Work Journal, the Skill Self-Evolver definition and every preserved boundary (REQ-003);
  - startup is never blocked (REQ-004).
- Relevant existing behavior and evidence confirmed:
  - **Grants never widen delivery (BEH-003).** The router consults the grant registry first. A grant can only reject (`grantDecision.kind === "rejected"`) or be recorded as used; an `allowed` grant bypasses no other check. With no registered grants, `evaluate` returns `not_applicable`. Removing the registry and `recordGrantUsage` therefore changes no result code other than the grant-only rejection codes.
  - **`server_helper`** is written only through `CreateAgentRunInput.launchPurpose`, which only the feature sets. Its readers are the metadata store, provisioning, eligibility and the run service (F-04 confirmed).
  - **Built-in id:** `autobyteus-retrospective-skill-improver`.
  - **Records:** `improverRunId` in the records.
  - **Settings retirement:** `retiredSettingNames` deletes a key from `.env` and `process.env` at initialization and refuses writes to it (A-05 confirmed).
- Scope guardrail confirmed: yes, including out of scope: the Self-Evolver package, FU-001, released migrations, a release.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`:
  - AR-001 → REQ-005, AC-004;
  - AR-002 → AC-001, REQ-001;
  - AR-003 → REQ-006, AC-005, REQ-005.
- Remaining material ambiguity: none in the basis.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | Operational | Pass, except M5 against the declared preserved disposition (AR-001) and the release-notes wording (AR-003) | Pass | Pass | Needs Correction | AR-001, AR-003 |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `release-notes.md` | Pass | Pass | Pass | Fail | Pass | AR-003: the notes say only the improver's runs are deleted and that the Skill Self-Evolver is kept, but REQ-005 also deletes runs that the self-evolution records name as evolver runs (runs of the kept Self-Evolver definition) |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Cleanup (feature removal) | — |
| Root-cause classification is explicit and evidence-backed | Pass | Legacy/compatibility pressure. Two mechanisms only the feature uses were confirmed in code (F-03, F-04) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Removal only; FU-001 deferred | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Removal Plan, D-2/D-3/D-5, Migration Plan | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 `send_message_to` | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 startup | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 migration | Primary (operational) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Router | Pass | Pass | Pass | Pass | Loses a dependency; no new one |
| Migration | Pass | Pass | Pass | Pass | Historical names stay inside it |
| `retiredSettingNames` | Pass | Pass | Pass | Pass | Existing owner |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Migration → runner types, `fs`/`path` only | Pass | Pass | Pass | Pass | Follows the A-06 and A-07 precedents |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| GraphQL skill-improvement API (removed) | Pass | Pass | Pass | Low | Pass |
| Router constructor (loses `grantRegistry`); `CreateAgentRunInput` (loses `launchPurpose`) | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Remove `.env` keys | Pass | Pass | N/A | Pass | `retiredSettingNames` |
| Remove the built-in folder, walk memory | Pass | Pass | N/A | Pass | A-06 and A-07 patterns |

## Subsystem / Capability-Area Allocation Verdict

`Pass`. Removals follow the existing layout; the one addition is the migration in `app-data-migrations/migrations/`.

## Reusable Owned Structures Verdict

N/A: no new shared structure.

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentRunMetadata` without `launchPurpose` | Pass | Pass | Pass | N/A | Pass | The tolerant reader ignores old values; the migration deletes the runs that carry them |

## File Responsibility Mapping Verdict

`Pass`. One new migration file plus its registration, the settings policy, and the Removal Plan rows.

## Subsystem / Folder / File Placement Verdict

`Pass`.

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Feature folder, GraphQL types, built-in template and registry entry, smoke-script asserts | Pass | N/A | Pass | Pass | — |
| Grants (registry, domain, router branch, `recordGrantUsage`) | Pass | N/A | Pass | Pass | Confirmed dead once the feature is gone |
| `launchPurpose` / `AgentRunLaunchPurpose`, including the eligibility check and the stale comment | Pass | N/A | Pass | Pass | — |
| Settings predefinitions and the re-export | Pass | Pass | Pass | Pass | Replaced by `retiredSettingNames` |
| Web, docs, tests | Pass | N/A | Pass | Pass | Regenerate `generated/graphql.ts` |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| GraphQL, grants, `launchPurpose`, settings | No | Pass | Pass | The retired-settings list is an existing policy, not a shim |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Records, sessions, helper runs and history rows, built-in folder | Migration Required (deletion, DEC-001 C) | Pass | Pass | Fail | Fail | Collection before deletion, history row with the folder, the walk excluding `imports/`, M5 ordering, never blocking startup and the shape-to-fixture map are all sound. But M5 as written deletes a root records folder whose `index.json` or records were unreadable, contradicting the declared `PRESERVED_UNREADABLE` disposition and F-8 (AR-001) |
| `.env` keys | Retired through the existing policy | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server → settings → migration → web → docs → sweep | Pass | Pass | Fail (the sweep's exception list does not match AC-001: AR-002) | Fail |

## Example Adequacy Verdict

`Pass`: router, settings and helper-run examples are given, with the shapes to avoid.

## Material Premise Validation

### `MP-001` — A self-evolution record names an evolver run, a run of the kept Skill Self-Evolver definition

- Related requirement: REQ-005 ("runs the records name as improver or evolver runs"); REQ-006
- Relevant behavior ID(s): BEH-005
- Initiating basis kind: `System` (the released self-evolution feature recorded `evolverRunId` for runs it launched)
- Trigger: earlier builds of the same feature, under its name "self evolution", recorded runs under `memory/self_evolution/evolution_runs/*` with `evolverRunId` (A-01, A-03).
- Forward path: first start → M1 collects `evolverRunId` → M2 and M3 delete that run's history row and folder.
- Consequence: on an install whose evolver runs still exist, runs of the kept Self-Evolver definition are deleted. That matches REQ-005, but the release notes say only the improver's runs are deleted.
- Reachability: `Reachable` on installs that used the old feature. There are 0 on the user's machine (A-03: folders absent).
- Review consequence: AR-003 (wording only).

## Unresolved Approved-Behavior Or Current-State Gaps

None beyond the findings.

## Review Decision

`Fail`. Three small consistency findings in text and test plan. The structure is sound and no rework of the approach is needed.

## Findings

### AR-001 — M5 must keep a root records folder whose records could not be read

- Type: Design Impact
- Severity: Low (blocking; the design contradicts itself)
- Protected: REQ-005, AC-004 (exactly the feature data, and every helper run with its history entry, removed); data guideline §6 dispositions
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence:
  - M1: "Unreadable JSON → that source is skipped and reported (`PRESERVED_UNREADABLE`)".
  - Status: "`SUCCEEDED_WITH_WARNINGS` (an unreadable source was left in place)".
  - F-8: "Unreadable `index.json` … untouched, byte-identical".
  - But M5 removes `memory/skill_improvement/` and `memory/self_evolution/` whenever they hold `index.json` or `*_runs/`, and its guard checks only M2 and M3 for the **collected** ids. With an unreadable index, its improver ids are never collected and M5 still deletes it. A helper run named only by that record (an improver configured through `AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID` to another definition, launched before `launchPurpose` existed) is then orphaned permanently.
- Required update: add to the M5 guard that a root folder with any unreadable source (its `index.json` or a record file) is kept and reported as `PRESERVED_UNREADABLE`, so that M1 is not deprived of ids later. Make the M5 row, the Status line and F-8 say the same thing.
- Why proportionate: one guard condition, already covered by F-8. No new mechanism.
- Recommended recipient: `/software_engineering_team/solution_designer`

### AR-002 — The AC-001 grep exceptions do not match the names the design deliberately keeps

- Type: Design Impact
- Severity: Low (blocking; verification would fail or be weakened ad hoc)
- Protected: AC-001, REQ-001
- Scope status: Within Approved Scope
- Changes approved behavior: No. This is wording only; the requirement wording belongs to the Solution Designer.
- Evidence:
  - AC-001 excepts only "released migrations and `tickets/`".
  - The design keeps feature names in two places of current code:
    - the **new**, not yet released migration (frozen names, Migration Plan);
    - `app-config-setting-policy.ts` `retiredSettingNames`, which gains `ENABLE_SKILL_IMPROVEMENT`, `AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID` and `ENABLE_SELF_EVOLUTION` (D-5).
  - Sequence step 6 excepts only "migrations' frozen names", and "Ownership Boundaries" names both. A grep for `ENABLE_SELF_EVOLUTION` (step 6) therefore hits the policy file.
- Required update: name the exact allowed locations (the new migration file and the `retiredSettingNames` entries) in sequence step 6 and the Guidance, and align AC-001's wording with them.
- Why proportionate: two sentences. It keeps AC-001 an honest check.
- Recommended recipient: `/software_engineering_team/solution_designer`

### AR-003 — The release notes understate what REQ-005 deletes

- Type: Design Impact (supplement consistency)
- Severity: Low (blocking for AC-005)
- Protected: REQ-006, AC-005, REQ-005
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence: MP-001. REQ-005 deletes "runs the records name as improver or evolver runs". The release notes list "the built-in Retrospective Skill Improver agent and all of its runs" and say that "the Skill Self-Evolver agent, if you have it, is kept". On an install with recorded evolver runs, runs of the Self-Evolver would also disappear from history.
- Required update: add to "What the first start deletes" that runs the old self-evolution records name are deleted too (the agent definition itself is kept). Alternatively, if that deletion is not intended, narrow REQ-005; that would be a requirement change for the user.
- Why proportionate: one clause in user-facing text that asks users to back up first.
- Recommended recipient: `/software_engineering_team/solution_designer`

## Classification

`Design Impact` (AR-001, AR-002, AR-003).

## Recommended Recipient

`/software_engineering_team/solution_designer`

## Residual Risks

- R-1: M2 rewrites `run_history_index.json`. "Unrelated history entries byte-identical" (AC-004) should be read as entry-level equality. Write with the same serialization the index store uses, so an unchanged row keeps its bytes, and test it in F-8.
- R-2: M1 does not read the per-run `improver_session.json` (which also names `improverRunId`). The records, the definition id and `server_helper` cover the supported shapes, so this is acceptable. Add the sessions as a source only if a fixture shows a session-only helper run.
- R-3: a user-made team definition that includes the improver agent would lose that member when M6 deletes the definition. This matches the A-06 precedent and DEC-001 C; no evidence of such a team exists. Delivery can mention it in the backup note if desired.
- R-4: generated GraphQL drift in the web and the router change are covered by the design's Risks and Guidance.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (MP-001 is reachable and drives wording only)
- Notes: `ARCH-REV-001`; SR-001..SR-003. Large / High confirmed. A re-review can be limited to the M5 row, Status line and F-8, sequence step 6, Guidance, AC-001, and the release notes.
