# Investigation Notes

## Investigation Meta

- Package identifier: `handoff-display-label-only`
- Request / ticket: User request on 2026-09-22 to assess removing the redundant address row from Agent Team and Agent Org handoff endpoints.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/handoff-display-label-only`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/handoff-display-label-only` / `codex/handoff-display-label-only`
- Resolved base remote / branch / revision: `origin/personal` / `personal` / `d883f5620a0abaed147209ad0e42a8960df70e68`
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Isolated worktree created successfully from refreshed `origin/personal`.
- Bootstrap blocker: `N/A`
- Current solution revision ID: `SR-004`
- Investigation status: Requirements approved; architecture investigation complete and design ready.

## Initial Request And Clarifications

- Original request: Improve the Agent Team and Agent Org handoff UI by removing the second, canonical-address row beneath each intuitive From/To display label; user asks for an assessment.
- Clarifications received: The two supplied screenshots identify both affected surfaces and show the perceived redundancy. The user then questioned whether rooted canonical addresses are needed at all in either display or edit pages.
- User-supplied facts and constraints: Reconsider user-facing address visibility consistently across Agent Team and Agent Org display and edit surfaces.
- Initial ambiguity: Whether removing addresses from edit choices would create ambiguous endpoint labels. Investigation found that internal addresses are not user-required, but current referenced-definition labels can collide and therefore need a readable disambiguation rule.

## Product And Domain Understanding

- Product area: Agent Team and Agent Org definition/detail handoff presentation.
- Affected actors or systems: Users inspecting configured handoff rules.
- Existing user or operational purpose: Communicate who hands work to whom and under what condition.
- Relevant terminology: Display label; canonical AgentTeam address; From endpoint; To endpoint; handoff rule.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-22 | User | `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_4aeae4517a7143308f0c1a79ac3ea040/software_engineering_team_bc51fed012964ba0bcfff2b55c2f03cb/solution_designer_c19f79c911fa40649aee31ffc36386f9/context_files/ctx_9dd6ff35f572__image.png` | Inspect Agent Team handoff display. | Each endpoint shows a bold agent name and the corresponding slash-prefixed address on a second row. | Locate implementation and tests. |
| 2026-09-22 | User | `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_4aeae4517a7143308f0c1a79ac3ea040/software_engineering_team_bc51fed012964ba0bcfff2b55c2f03cb/solution_designer_c19f79c911fa40649aee31ffc36386f9/context_files/ctx_d96241d3fbde__image.png` | Inspect Agent Org handoff display. | Each endpoint shows a human-readable `team / member` label plus an underscore-heavy canonical address on a second row; long labels may truncate. | Check responsive/truncation handling and address utility. |
| 2026-09-22 | Command | `git fetch origin personal --prune`; `git worktree add -b codex/handoff-display-label-only ... origin/personal` | Establish isolated authoring workspace against current integration base. | Worktree created at base `d883f5620a0abaed147209ad0e42a8960df70e68`. | Continue investigation in isolated worktree. |
| 2026-09-22 | Code | `autobyteus-web/components/collaboration/handoffs/HandoffManager.vue` | Find the shared rendering and editing owner. | One local `EndpointIdentity` renders icon/label plus address; it is reused for read-only cards and selected endpoint previews. Select options separately render `label · address`; unavailable endpoints separately render an address-bearing error. | Scope the visual change without weakening authoring/diagnostics. |
| 2026-09-22 | Code | `autobyteus-web/components/agentTeams/AgentTeamDetail.vue`; `AgentTeamDefinitionForm.vue`; `agentOrgs/AgentOrgExperience.vue` | Inventory production callsites. | Exactly four shared callsites cover Team detail, Team edit, Org detail, and Org edit. Team labels are member names; Org nested Agent labels are `Team / Agent`. | Include all resolved endpoint tiles and long-label behavior in the proposed baseline. |
| 2026-09-22 | Code | `autobyteus-web/types/collaboration/handoffs.ts`; `HandoffManager.vue` validation | Verify address/data coupling. | Exact addresses remain the model/persisted values and drive endpoint lookup/validation; removing a rendered paragraph does not imply a data or routing change. | Preserve contracts explicitly in requirements. |
| 2026-09-22 | Test | `autobyteus-web/components/collaboration/handoffs/__tests__/HandoffManager.spec.ts` | Inspect durable coverage. | Existing tests cover reordering, self-delivery, stale endpoints, validation, and localization, but do not assert the resolved identity tile's address/label presentation. | Require focused presentation and non-regression coverage downstream. |
| 2026-09-22 | History | `git blame -L 129,148 -- HandoffManager.vue`; commit `37d05c7f7` | Identify why the second row exists and whether it is incidental. | Address rendering arrived with the flat AgentOrg feature rather than a later isolated UI fix. | Check that feature's approved contract before proposing removal. |
| 2026-09-22 | Contract | `tickets/done/flat-agent-organization-model/requirements-doc.md` (`REQ-020`, `AC-015`) and `agent-org-contract.md` (`ORG-CASE-032`) | Reconcile the request with prior approved behavior. | Prior behavior required canonical endpoint addresses to be readily inspectable alongside readable identity; the new request is therefore an intended-behavior revision, not merely an implementation cleanup. | Obtain explicit approval; supersede only permanent summary visibility. |
| 2026-09-22 | User | Follow-up question: whether users really need to see root-slash canonical addresses on display and edit pages | Re-evaluate the proposed boundary rather than assuming edit requires raw paths. | User questions address visibility across both normal contexts; this materially broadens the proposed behavior change. | Investigate human-readable label uniqueness and refine the baseline. |
| 2026-09-22 | Code / Contract | `AgentOrgExperience.vue:294-348`; `memberRoleLabel.ts`; Team/Org definition member-name validation | Determine whether raw addresses are the only way to distinguish edit choices. | Canonical address is only the internal option value. Configured sibling placement names are case-insensitively unique, but Org edit options currently use referenced Agent/Team definition names, which may collide, and humanizing `_`/`-` can also collapse distinct placement spellings. | Require a readable contextual disambiguation policy instead of exposing full rooted paths. |
| 2026-09-22 | User | Approval message: “cool. approve” | Capture authority for the refined intended behavior. | User explicitly approved `SR-002`: first-row/readable identity is sufficient in display and edit; rooted addresses remain internal. | Begin architecture investigation and design. |
| 2026-09-22 | Architecture code read | `HandoffManager.vue:19-43,91-144,167-178`; `types/collaboration/handoffs.ts:1-36` | Trace the complete presentation-to-draft path after approval. | The shared component already owns option grouping, address lookup, endpoint tiles, stale feedback, and draft validation. `HandoffEndpointOption.address` and `EditableHandoff.fromAddress/toAddress` remain exact internal identities; no parent/store/API change is needed. | Keep the change inside the existing shared presentation boundary. |
| 2026-09-22 | Architecture code read | `AgentOrgExperience.vue:294-371`; Team detail/form endpoint projection | Determine whether parent callsites need target changes. | Parents already supply label, group, kind, address, and optional coordinator. Existing labels should remain the preferred first-row text. Collision disambiguation can be computed from the complete option set inside HandoffManager without changing the shared type or parent projections. | Do not broaden into Team/Org callsite refactoring. |
| 2026-09-22 | Architecture code read | `memberRoleLabel.ts`; `agent-team-address.ts`; Team/Org definition validators | Define a non-rooted collision/stale fallback. | Valid canonical addresses contain path-safe placement segments; sibling placement names are case-insensitively unique. Humanizing segments supplies readable hierarchy, while retaining original segment spelling only for a rare post-humanization collision distinguishes choices without a rooted path. | Add a local deterministic presentation projection; retain address only as its input/key. |
| 2026-09-22 | Architecture code read | `localization/messages/en/handoffs.ts`; `zh-CN/handoffs.ts`; localization boundary scripts | Bound the localization change. | The unavailable message is owned by exactly two locale catalogs and interpolates `address`. Both catalogs must move to a `label` interpolation in the same change. | Modify both catalogs; no new localization subsystem. |
| 2026-09-22 | Architecture test read | `components/collaboration/handoffs/__tests__/HandoffManager.spec.ts`; `AgentOrgDetailRoleLabels.spec.ts`; `tests/e2e/agent-org-role-labels-probe.mjs` | Define implementation and downstream verification boundaries. | The focused component suite already covers view/edit, stale endpoints, exact emitted addresses, validation, order, and localization. Existing role-label coverage establishes configured role naming but not address-free handoff presentation. | Extend HandoffManager tests; preserve role-label suites; rendered browser validation belongs downstream. |
| 2026-09-22 | Command | `rg HandoffEndpointOption`; `rg handoffs.manager.endpoint.unavailable`; locale catalog inventory | Confirm blast radius. | Four production HandoffManager callsites share one component; the unavailable key has one component consumer and two locale definitions. No other runtime consumer depends on its interpolation name. | Classify as Small / Low if implementation remains within this boundary. |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Open Team or Org definition detail with handoffs | Subject detail projects endpoint options -> shared HandoffManager resolves each saved address -> EndpointIdentity renders icon, label, and address -> card renders ordered When conditions | Both subject kinds use the same two-row endpoint identity; stale endpoints use an explicit error instead | Screenshots and four callsites | High |
| BEH-002 | User | Add or edit a Team/Org handoff | Shared HandoffManager presents grouped selector options as `label · address` -> selected address resolves to EndpointIdentity preview -> validation -> emits unchanged canonical values to parent draft | The address is the machine value, but the UI currently exposes it as the disambiguator | HandoffManager source/tests | High |
| BEH-003 | User | View or choose long/duplicate-looking endpoints | Org projection constructs readable labels, but edit labels may use referenced definition names and can collide; EndpointIdentity truncates long labels | Removing paths without improving labels could make choices ambiguous | Screenshot 2, Org option projection, member-name contracts | High |
| BEH-004 | Contract | Definition storage and runtime handoff lookup | Editable handoffs map exact addresses to/from definition records; server/runtime owns routing | Presentation does not own address semantics | Type adapters, validation, prior contract | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/collaboration/handoffs/HandoffManager.vue` | Shared Team/Org, view/edit Handoff rendering, inline endpoint identity component, editing, validation, and reorder controls | One narrow shared change can cover all requested surfaces; do not disturb validation/editing | Decide whether EndpointIdentity stays local and whether a presentation prop is needed. |
| `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` | Supplies Team member labels/addresses in view mode | Team detail must show one-row labels | No subject-specific fork is indicated. |
| `autobyteus-web/components/agentTeams/AgentTeamDefinitionForm.vue` | Supplies Team member labels and internal addresses in edit mode | Select options and selected previews hide the address while retaining it as the option value | Preserve form behavior and emitted values. |
| `autobyteus-web/components/agentOrgs/AgentOrgExperience.vue` | Supplies direct, Team, and nested endpoint labels; authoring currently prefers referenced definition names while detail prefers configured placement names | Long/hierarchical labels need completeness; duplicate referenced names need readable placement disambiguation | Define one consistent human-readable option projection without raw rooted paths. |
| `autobyteus-web/utils/collaboration/memberRoleLabel.ts` | Humanizes `_` and `-` to spaces | Improves readability but can collapse distinct path-safe spellings to the same visible label | Collision handling must use minimal readable placement context or original placement text, not a full address. |
| Team/Org definition member-name validators | Require path-safe, case-insensitively unique sibling placement names | Exact endpoint identity remains internally reliable without being shown | User-facing labels can be derived from unique placements but still need post-format collision detection. |
| `autobyteus-web/types/collaboration/handoffs.ts` | Converts editable exact addresses to definition records | No type/data change is authorized | N/A unless implementation accidentally broadens scope. |
| `.../handoffs/__tests__/HandoffManager.spec.ts` | Covers core shared interactions and stale errors | Add focused identity-row and emitted-address assertions without weakening existing coverage | Rendered browser validation remains appropriate for spacing/truncation. |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: `EditableHandoff`, `DefinitionHandoff`, endpoint option labels/addresses, user-authored When conditions.
- Existing readers, writers, or contracts that consume them: HandoffManager, Team/Org parent forms, definition persistence, runtime handoff contracts.
- Evidence paths: `types/collaboration/handoffs.ts`; Team/Org component callsites.

### Structural Surfaces

- Runtime modules, shared interfaces, routes, APIs, persistence boundaries, security/concurrency controls, deployment configuration, or ownership boundaries: One shared Vue component; no API/persistence/runtime boundary is implicated.
- Existing structural surfaces that can support the approved behavior: Local EndpointIdentity renderer and current mode/scope-neutral callsites.
- Evidence paths: `HandoffManager.vue` and four callsites.

### Potential Structural Impacts To Investigate

- API or external-contract change: Confirmed absent under proposed requirements.
- Persistence schema or invariant change: Confirmed absent.
- Security or privacy boundary change: Confirmed absent.
- Concurrency or lifecycle change: Confirmed absent.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: Confirmed absent; narrow shared presentation delta expected.
- Confirmed absent, present, or unknown: Only presentation/test/doc impacts are expected; exact file plan awaits post-approval architecture investigation.

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- User's requested outcome, in the user's own terms: Improve the UI by removing unnecessary canonical addresses from Agent Team and Agent Org handoff display and edit pages.
- Requirement / behavior IDs involved: `REQ-001`–`REQ-004`; `BEH-001`–`BEH-004`.
- Product decision, uncertainty, or experience to understand or evolve: Use user-facing names and hierarchy rather than rooted machine paths while keeping choices unambiguous.
- Critical journey and states: Reading handoff direction and condition in definition/detail views.
- Known constraints and non-goals: Preserve handoff meaning; no prototype requested.
- Relevant existing-product or frontend context supplied or established: Two current-state screenshots.
- Product Design request artifact / message reference: `N/A`
- Established separate prototype repository/root and ticket reference, when applicable: `N/A`

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_4aeae4517a7143308f0c1a79ac3ea040/software_engineering_team_bc51fed012964ba0bcfff2b55c2f03cb/solution_designer_c19f79c911fa40649aee31ffc36386f9/context_files/ctx_9dd6ff35f572__image.png` | User | Current Agent Team UI evidence | Agent Team handoff endpoints | `REQ-001`, `AC-001` | Evidence | User-supplied current-state evidence; no separate approval needed |
| `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_4aeae4517a7143308f0c1a79ac3ea040/software_engineering_team_bc51fed012964ba0bcfff2b55c2f03cb/solution_designer_c19f79c911fa40649aee31ffc36386f9/context_files/ctx_d96241d3fbde__image.png` | User | Current Agent Org UI evidence | Agent Org handoff endpoints | `REQ-001`, `REQ-002`, `AC-002` | Evidence | User-supplied current-state evidence; no separate approval needed |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Whether canonical addresses are needed for troubleshooting or copying from this read-only surface. | Determines whether removal should be absolute or paired with progressive disclosure. | Resolved by user approval: no normal UI disclosure; technical identity remains internal. | Resolved |
| RSK-001 | Risk | Long Agent Org display labels may already truncate. | Removing the address improves density but must not make endpoint identity ambiguous. | Resolved in design: remove ellipsis in identity tiles, wrap complete labels, and keep complete native option text. | Resolved with downstream visual verification |

Resolution update:

- `UNK-001`: Superseded by the user's follow-up. The refined `SR-002` baseline removes rooted addresses from normal display and edit UI and retains them only as internal/technical identity.
- `RSK-001`: Expanded into `REQ-002` / `QR-001`; complete labels must remain obtainable and duplicate-looking choices must receive readable contextual disambiguation.

## Requirement Implications

- The user's broader assessment is supported: a root-slash canonical address is a machine identity. Users inspecting or editing a handoff principally need clear participant roles and hierarchy, not the serialized path.
- A bare deletion remains insufficient because Org authoring can present duplicate referenced definition names and humanization can collapse distinct placement spellings. The correct product response is readable contextual disambiguation, not always-visible technical addresses.
- The refined requirement revision removes canonical paths from normal display and edit UI, while keeping them unchanged as internal values and technical diagnostics.
- This is a presentation-only intended-behavior change; it does not authorize any address, persistence, routing, coordinator, or validation change.

## Notes For Architecture Design

Approved `SCN-001`–`SCN-003` map to one existing shared presentation owner. Target design decisions:

- keep exact addresses in `HandoffEndpointOption`, `EditableHandoff`, validation, emitted drafts, definition conversion, and runtime contracts;
- make HandoffManager project a display label for each option set, using the supplied label normally and appending minimal non-rooted placement context only when labels collide;
- reuse that projected label in select options, selected previews, and read-only cards;
- render the first-row label without ellipsis so its complete text remains available and remove the address paragraph;
- derive stale feedback from a human-readable non-rooted placement label and change both locale catalogs to interpolate `label`;
- extend the focused component suite for absent visible paths, collision disambiguation, readable stale feedback, exact emitted values, long-label wrapping, and localization;
- no parent callsite, shared type, API, persistence, migration, runtime, security, concurrency, deployment, or ownership-boundary change.
