# Design Review Report: remove-skill-improvement (autobyteus-205)

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/remove-skill-improvement/requirements-doc.md` (Approved; SR-002 approval, SR-003 evidence extension within DEC-001; SR-004 AC-001 wording)
- Upstream Investigation Notes: `tickets/in-progress/remove-skill-improvement/investigation-notes.md` (F-01..F-11, A-01..A-09)
- Upstream Solution Revision Record: `tickets/in-progress/remove-skill-improvement/solution-revision-record.md` (SR-001..SR-004)
- Reviewed Design Spec: `tickets/in-progress/remove-skill-improvement/design-spec.md` (SR-004, `Ready`, commit `04aac13a77`)
- Supplemental Task Artifacts Reviewed: `release-notes.md` (SR-004); `follow-ups.md` (FU-001)
- Relevant Solution Revision IDs: SR-001..SR-004
- Architecture Review Revision Record: `tickets/in-progress/remove-skill-improvement/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: SR-004 re-review from `/software_engineering_team/solution_designer` (response to ARCH-REV-001 AR-001..AR-003, plus R-1 adopted)
- Prior Review Round Reviewed: 1 (`ARCH-REV-001`, Fail)
- Latest Authoritative Round: 2
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
| BEH-005 | Operational | Pass (AR-001, AR-003 resolved) | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `release-notes.md` | Pass | Pass | Pass | Pass | Pass | AR-003 resolved: the notes now say the runs the old self-evolution feature started with the Self-Evolver are deleted too, while the definition is kept |
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
| Records, sessions, helper runs and history rows, built-in folder | Migration Required (deletion, DEC-001 C) | Pass | Pass | Pass | Pass | M5 now runs only when every source in the root was read and M2/M3 succeeded for every id it named; a root with any unreadable source is kept as `PRESERVED_UNREADABLE`. The Status line and F-8 match (AR-001 resolved). M2 writes the index exactly as `AgentRunHistoryIndexStore.writeIndex` does (R-1 adopted) |
| `.env` keys | Retired through the existing policy | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server → settings → migration → web → docs → sweep | Pass | Pass | Pass (step 6, the Guidance and AC-001 name the same allowed locations; AR-002 resolved) | Pass |

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

`Pass`. AR-001..AR-003 are resolved in the current canonical artifacts (commit `04aac13a77`). The behavior basis is confirmed, and no in-scope machinery depends on an unsupported premise. Ready for implementation.

## Findings

None open. The resolution of the prior findings is recorded in `architecture-review-revision-record.md` (ARCH-REV-002).

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer`

## Residual Risks

- R-1: adopted into M2 (serialize as the index store does); closed.
- R-2: M1 does not read the per-run `improver_session.json`. The records, the definition id and `server_helper` cover the supported shapes; add the sessions as a source only if a fixture shows a session-only helper run.
- R-3: a user-made team definition that includes the improver agent would lose that member when M6 deletes the definition. This matches the A-06 precedent and DEC-001 C; there is no evidence of such a team.
- R-4: generated GraphQL drift in the web and the router change are covered by the design's Risks and Guidance (regenerate and typecheck the web; router result codes unchanged apart from the grant codes).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: `ARCH-REV-002`; SR-001..SR-004. Classification Large / High is preserved. Next: `/software_engineering_team/implementation_engineer`.
