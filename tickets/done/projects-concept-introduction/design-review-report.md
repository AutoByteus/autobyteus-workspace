# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/requirements-doc.md` (`Approved`, `SR-001`, `APPROVAL-PROJ-CONCEPT-20260926-001`)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/design-spec.md` (`SR-003`, status `Ready`)
- Supplemental Task Artifacts Reviewed: None owned by the package. The external `REQ-ATPTN-001` visualizer and the Draft `RER-004` package are non-normative and container-only; they were not opened and are not needed for this review.
- Relevant Solution Revision IDs: `SR-001`, `SR-002`, `SR-003`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction/tickets/in-progress/projects-concept-introduction/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: The revised `Architecture Design Complete` handoff from `/solution_designer` (`handoff-to-architecture-review-sr-003.md`), which resolves `AR-001` and `AR-002` from `ARCH-REV-001`
- Prior Review Round Reviewed: Round 1 (`ARCH-REV-001`, `Fail — Design Impact`)
- Latest Authoritative Round: `2`
- Current-State Evidence Basis: Round 2 re-verified the following against the code:
  - `SearchableSelect.vue` has only a component-level `disabled` prop, not a per-option one.
  - There are 7 non-test `<WorkspaceSelector` callers, and `WorkspaceSelector.spec.ts` exists.
  - The selector's `onMounted` and options watcher both skip auto-select when `autoSelectDefault === false`.
  - `WorkspaceManager.removeRegisteredWorkspace` deletes the matching `activeWorkspaces` entries (L211–218), so no unregistered `agent_ws_` workspace stays visible after removal.

  Round 1 basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-concept-introduction` @ `1676bede9` (clean except the ticket folder). Files read:
  - Server: `server-settings-service.ts`, `skill-improvement-capability-service.ts`, `application-capability-service.ts`, `api/graphql/types/application-capability.ts`, `persistence/file/store-utils.ts`, `remote-access/stores/paired-device-store.ts`, `workspaces/workspace-manager.ts`, `api/graphql/types/workspace.ts`.
  - Web: `applicationsCapabilityStore.ts` (and its diff against `skillImprovementCapabilityStore.ts`), `middleware/feature-flags.global.ts`, `middleware/mobileFeatureGate.global.ts`, `useShellPrimaryNavigation.ts` and its consumers, `utils/mobileFeatureGates.ts`, `ApplicationsFeatureToggleCard.vue`, `SkillImprovementFeatureToggleCard.vue`, `stores/serverSettings.ts`, `tests/stores/serverSettingsStore.test.ts`, `components/workspace/config/WorkspaceSelector.vue`, `stores/workspace.ts`, `components/skills/SkillWorkspaceLoader.vue`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: The change adds a new server subsystem, a new additive GraphQL contract and a new persisted subject. It also refactors shared capability code for two shipped features (Applications, Skill Improvement), across about 40 files. The code confirms this.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. The feature adds node-scoped Projects behind a default-off `ENABLE_PROJECTS` capability that looks and behaves like Applications. Each Project has a unique name, an optional description and described links to registered workspaces. Links survive workspace removal and show as unavailable. Tasks are excluded.
- Relevant existing behavior and evidence confirmed: Yes. `BEH-002`–`BEH-006` match the code:
  - Workspace ids are path-derived; `getRegisteredWorkspaceRootPath` accepts only `agent_ws_` ids.
  - Removal is non-destructive.
  - The two capability stores are identical except for names.
  - The route gate and nav filter are hard-wired to Applications.
  - Mobile gates are prefix-based.
  - Settings persist through `appConfigProvider`.
- Scope guardrail confirmed: Yes. In-scope `UC-001`–`UC-006`; out of scope: Tasks, workspace identity/removal changes, sync and mobile. Preserved behavior: `BEH-002`–`BEH-006`, flag-off invariance, `AC-010`. Review authority is as stated in the requirements. The requirements leave "mirror vs generalise" of the capability code to design, so the bounded refactor is a legitimate design choice.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (see Findings).
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | User/System | Pass | Pass | Pass — `DS-003` (SR-003): the Projects-owned `selectLinkableWorkspaceIds` feeds the opt-in `WorkspaceSelector.candidateWorkspaceIds` prop, with `autoSelectDefault=false`; the server re-validates inside the locked updater | Confirmed | — |
| BEH-003 | User/System | Pass | Pass | Pass — availability is resolved at read time; `workspaces/**` must not import `projects/**` | Confirmed | — |
| BEH-004 | User/Operational | Pass | Pass | Pass — `DS-004` plus `DS-004b` (SR-003): `CAPABILITY_STORE_BY_SETTING_KEY` covers `ENABLE_APPLICATIONS` and `ENABLE_PROJECTS`; SI is excluded on purpose, and a test asserts it | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | Operational | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None. No behavior-defining supplements exist. The external exploratory artifacts are clearly marked non-normative and are linked consistently from the requirements, the investigation notes and the design.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Posture is `Feature`; a design issue was found | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Duplicated Policy Or Coordination`. Verified: `diff` of the two capability stores shows only naming, document and type differences. The two toggle cards duplicate the same switch/status logic. The server has four boolean accessors that are identical apart from the key. | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Bounded refactor now. The per-feature capability services are kept, because their initialisation policies genuinely differ (verified). | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | The Removal Plan, File Mapping, Rejection Log and Sequence steps 1 and 4 reflect it | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative Clear | Facade Vs Governing Owner | Subject Naming | Ownership | Off-Spine Kept Off | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Project CRUD | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Load + read-time availability | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Link (existing / register-then-link) | Pass | Pass | Pass | Pass | Pass (the client candidate policy is owned by `selectLinkableWorkspaceIds`; `ProjectService` stays authoritative) | Pass (the selector stays policy-free) | Pass |
| DS-004 | Capability toggle → nav | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004b | Advanced-table edit → capability refresh | Pass | Pass | N/A | Pass | Pass (`stores/serverSettings.ts` owns the key → store refresh table) | Pass | Pass |
| DS-005 | Route/nav gate (bounded local) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Public Entry Clear | Internals Stay Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `ProjectService` | Pass | Pass | Pass | Pass | Resolver → store bypass is forbidden |
| `WorkspaceManager` (read-only use) | Pass | Pass | Pass | Pass | `getRegisteredWorkspaceRootPath` is public and backed by the in-memory registry map (cheap per link) |
| `ServerSettingsService` generic accessor | Pass | Pass | Pass | Pass | — |
| `projectStore` (web) | Pass | Pass | Pass | Pass | Components may not call Apollo directly |
| `createBoundNodeCapabilityStore` | Pass | Pass | Pass | Pass | Wrappers keep store ids and the public API |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Direction Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server `projects/**` | Pass | Pass | Pass | Pass | `workspaces/**` → `projects/**` is forbidden, which protects `REQ-004` |
| web projects UI | Pass | Pass | Pass | Pass | `stores/workspace.ts` usage is limited to the list and `createWorkspace` |
| capability wrappers → factory | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `projects` / `project(projectId)` | Pass | Pass | Pass | Low | Pass |
| `createProject` / `updateProject` / `deleteProject` | Pass | Pass | Pass | Low | Pass |
| `addProjectWorkspace` / `updateProjectWorkspace` / `removeProjectWorkspace` | Pass | Pass | Pass (`projectId` + `workspaceId`; never a path) | Low | Pass |
| `projectsCapability` / `setProjectsEnabled` | Pass | Pass | N/A | Low | Pass |
| `getBooleanSetting(key)` / `setBooleanSetting(key, enabled)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| JSON persistence | Pass | Pass | N/A | Pass | `updateJsonArrayFile` gives locked read-modify-write; a throwing updater aborts the write (`QR-001`) |
| Workspace registration reuse | Pass | Pass | N/A | Pass | Register-then-link through the existing `createWorkspace` |
| Workspace picker reuse | Pass | Pass | Pass | Pass | Extended with one opt-in prop (default `null`, so the 7 run-config callers and the existing spec are unchanged). The new pure `utils/projects/linkableWorkspaces.ts` owns the Projects rule. Excluding already-linked workspaces instead of disabling them is justified, because `SearchableSelect` has no per-option disabled state (verified). |
| Capability store / card extraction | Pass | Pass | Pass | Pass | — |
| Setting-edit → capability refresh (`stores/serverSettings.ts`) | Pass | Pass | N/A | Pass | Extended into a table; SI excluded on purpose |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem | Allocation Clear | Decision Sound | Supports Spine Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server `src/projects/` | Pass | Pass | Pass | Pass | Mirrors the `skill-improvement/` and `remote-access/` layout |
| server settings | Pass | Pass | Pass | Pass | — |
| web `stores/capabilities/` | Pass | Pass | Pass | Pass | — |
| web `components/projects/`, `pages/projects/` | Pass | Pass | Pass | Pass | — |
| web shell gating | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Bound-node capability store | Pass | Pass | Pass | Pass | Generic over the capability type; Applications' `scope` stays feature-typed |
| Toggle card | Pass | Pass | Pass | Pass | The shared card must accept the per-feature test-id prefix. The existing ids sit on inner elements (`*-feature-status`, `*-feature-toggle`), not only the root. |
| Boolean setting accessor | Pass | Pass | Pass | Pass | Value-compatible with stored `"true"`/`"false"` |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core Vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `Project` (stored) | Pass | Pass | Pass | N/A | Pass | `description` is always a string |
| `ProjectWorkspaceLink` (stored) vs `ProjectWorkspace` (view) | Pass | Pass | Pass | Pass | Pass | Availability and display name are never stored |
| `BoundNodeCapability` generic | Pass | Pass | Pass | Pass | Pass | — |

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/projects/**` (models, errors, settings, store, service, capability service) | Pass | Pass | Pass | Pass | — |
| `api/graphql/types/projects.ts`, `projects-capability.ts` | Pass | Pass | N/A | Pass | — |
| web stores (factory, wrappers, `projectStore`) | Pass | Pass | Pass | Pass | — |
| `components/projects/ProjectWorkspaceLinkDialog.vue` | Pass | Pass | N/A | Pass | Add mode: candidates plus `autoSelectDefault=false`; edit mode: workspace read-only, description editable |
| `utils/projects/linkableWorkspaces.ts` | Pass | Pass | N/A | Pass | A pure, single-rule function with unit tests |
| `components/workspace/config/WorkspaceSelector.vue` | Pass | Pass | N/A | Pass | One opt-in prop; the guidance forbids Projects knowledge in the selector |
| `stores/serverSettings.ts` | Pass | Pass | N/A | Pass | `CAPABILITY_STORE_BY_SETTING_KEY`; tests cover the L387 regression, the Projects refresh and the SI no-refresh case |
| shell gating / settings cards / i18n | Pass | Pass | Pass | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Placement Clear | Folder Matches Boundary | Mixed/Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/projects/{domain,stores,services}` | Pass | Pass | Low | Pass | — |
| `autobyteus-web/stores/capabilities/` | Pass | Pass | Low | Pass | — |
| `autobyteus-web/{components,pages}/projects/` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Duplicated store bodies | Pass | Pass | Pass | Pass | — |
| Duplicated card internals | Pass | Pass | Pass | Pass | — |
| Four server accessors | Pass | Pass | Pass | Pass | Blast radius verified: two services and two test files |
| Applications-only route gate | Pass | Pass | Pass | Pass | — |
| Applications-only `APPLICATIONS_SETTING_KEY` refresh in `stores/serverSettings.ts` | Pass | Pass | Pass | Pass | Replaced by the table (Removal Plan row) |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Retention Exists | Clean-Cut Removal Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Capability refactor | No | Pass | Pass | The Rejection Log explicitly refuses wrappers and dual paths |

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence Sufficient | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ENABLE_APPLICATIONS` / `ENABLE_SKILL_IMPROVEMENT` values | Not Affected | Pass | Pass | N/A | Pass | The generic accessor keeps the same trim/lowercase `"true"` parsing and the same writes |
| `workspaces.json`, run history | Not Affected | Pass | Pass | N/A | Pass | Only read, through `WorkspaceManager` |
| `<appDataDir>/projects/projects.json` | New subject | Pass | Pass | N/A | Pass | A missing file reads as `[]` |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Temporary Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Server settings → projects → GraphQL | Pass | Pass | Pass | Pass |
| Web shared mechanism, then Projects consumers | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape Explained | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Stored record, register-then-link, thin store, unregistered row | Yes | Pass | Pass | Pass | — |
| Link-dialog candidate set; Advanced-table refresh | Yes | Pass | Pass | Pass | New Concrete Example rows, each with its avoided shape |

## Material Premise Validation

The round 1 premises still stand as evidence; their review consequences have now been resolved.

### `P-001` — The reused `WorkspaceSelector` offers and pre-selects the temp workspace, which `addProjectWorkspace` rejects

- Round 1: `Reachable`. The full forward witness (Project detail → Add workspace → selector `onMounted` → temp auto-select → `WORKSPACE_NOT_REGISTERED`) is recorded in `ARCH-REV-001`.
- Round 2: SR-003 removes the consequence:
  - `candidateWorkspaceIds` (non-null) lists only the supplied ids and prepends no temp entry.
  - `maybeAutoSelectDefaultWorkspace` returns `false`, and the dialog passes `autoSelectDefault=false`.
  - The selector's `onMounted` and options watcher already skip auto-select when `autoSelectDefault === false` (verified).
- Review consequence: `AR-001` resolved.

### `P-002` — Transient non-filesystem workspaces (for example `skill_ws_*`) appear as link candidates

- Reachability: `Unclear` (unchanged), and it no longer matters. `selectLinkableWorkspaceIds` keeps only `agent_ws_` ids with `kind === 'filesystem'` and `isTemp !== true`, so these entries are excluded whether or not the server lists them.
- Review consequence: None.

### `P-003` — Editing `ENABLE_PROJECTS` in the Advanced server-settings table does not refresh the Projects capability

- Round 1: `Reachable` (the `ServerSettingsManager` edit path; Applications parity is tested at `tests/stores/serverSettingsStore.test.ts` L387).
- Round 2: SR-003 routes the edit through `CAPABILITY_STORE_BY_SETTING_KEY['ENABLE_PROJECTS']().refresh()` (`DS-004b`), keeping the existing `trim().toUpperCase()` key match.
- Review consequence: `AR-002` resolved.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. The behavior basis is confirmed, both findings are resolved, and no in-scope machinery depends on an unsupported premise. The design is ready for implementation.

## Findings

None open. Resolved in this round, with details in `architecture-review-revision-record.md` › `ARCH-REV-002`:

- `AR-001` (Medium) — link-candidate policy.
- `AR-002` (Low) — Advanced-table capability refresh.

## Classification

N/A (Pass).

## Recommended Recipient

`/implementation_engineer`; `/solution_designer` receives an informational notification.

## Residual Risks

- The three round 1 notes were adopted into the design:
  - validation inside the locked updater;
  - a route-gate table built from `use…Store` functions;
  - a `testIdPrefix` prop that preserves the inner test ids.
- The store and card extraction can still regress Applications and Skill Improvement. Keep their existing specs unchanged except for import mocks.
- The new `WorkspaceSelector` prop must not change behavior when it is `null`. The existing `WorkspaceSelector.spec.ts` and the 7 run-config callers are the regression guard.
- The client candidate list can go stale, for example after a workspace is removed in another window. The server re-validates inside the locked updater and returns `WORKSPACE_NOT_REGISTERED`, and the dialog must show that as an accessible error (`REQ-013`).
- Regenerating `generated/graphql.ts` requires a running backend schema.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (`P-001` and `P-003` are resolved by the design; `P-002` is `Unclear` but covered by the policy and drives nothing)
- Notes: Round 2 was a narrow re-review of `DS-003`, `DS-004`, `DS-004b`, the affected file mapping rows, the Removal Plan, the examples and the Change Sequence. The round 1 Pass verdicts for all other sections remain valid; SR-003 did not touch them.
