# Design Review Report — `agent-package-auto-refresh`

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/requirements-doc.md` (Approved SR-005; editorial SR-007)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/design-spec.md` (SR-009)
- Supplemental Task Artifacts Reviewed: `probes/apar-cache-probe.test.ts`, `probes/apar-watch-probe.test.ts`, `probes/apar-watch-probe2.test.ts` (evidence only)
- Relevant Solution Revision IDs: SR-005 (approval), SR-006 (design), SR-007 (revision for ARCH-REV-001), SR-008 (CR-004 web surface for nested last-good issues), SR-009 (naming; application-package entries leave the store)
- Triggering downstream evidence: `code-review-report.md` CRR-003, CR-004 (round 3); CRR-006, CR-005…CR-011 (round 4, naming), plus the user's naming direction (DSN-005, confirmed 2026-10-11)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: 4 (delta review of SR-009)
- Trigger: `Revised Architecture Design Complete` (SR-009) from `/software_engineering_team/solution_designer`
- Prior Review Round Reviewed: 3 (ARCH-REV-003, `Pass`, SR-008). Round 2: `Pass`. Round 1: ARCH-REV-001, `Fail — Design Impact`, AR-001…AR-006, resolved in round 2.
- Latest Authoritative Round: 4
- Round-4 evidence (branch HEAD `061ea7ab3`):
  - `design-spec.md` § Naming (SR-009, authoritative) and the Removal Plan rows for SR-009.
  - `application-definition-runtime-readiness.ts:35–38`: `prepare()` only calls the two `refreshCache()`s before its own validation.
  - `application-owned-agent-source.ts`: application-package reads throw `AgentMdParseError` / `ApplicationOwnedAgentConfigParseError` on malformed files.
  - The store readers currently enumerate application-owned list ids (`agent-definition-source-reader.ts:40`, `agent-team-definition-source-reader.ts:95`).
  - Repository grep: the three `refresh*DefinitionCatalog` mutations are used only by in-repo server, web, tests and docs, plus the build output `autobyteus-web/dist-mobile`.
- Round-3 evidence (implementation branch `codex/agent-package-auto-refresh` @ `a28465175`):
  - `autobyteus-web/components/agents/AgentList.vue:170` filters `TEAM_LOCAL` agents from the Agents page (existing behavior).
  - `AgentTeamCard.vue:31` and `AgentOrgCatalogCard.vue:8` pass only the root `catalogIssue`.
  - `DefinitionDiagnosticsNotice.vue` shows unusable entries only.
  - `DefinitionCatalog.listIssueEntries(subject)` walks nested nodes by node subject. Agent-subject diagnostics therefore include unusable team-local and org-owned agents.
  - The team list resolver maps issues by root ID only (`agent-team-definition.ts:297`).
  Unaffected round-2 verdicts carry forward.
- Current-State Evidence Basis: Round-1 code reads still hold (base `56530dfc6`, no source changes). Additional files read in round 2:
  - `agent-org-definition/services/agent-org-definition-resolver.ts` (owned team refs are resolved through admission's preliminary results);
  - `collaboration-definition-admission/providers/definition-source-registry.ts` (org-owned team enumeration, `implementationPackageRoots` users);
  - `agent-definition/providers/team-local-agent-discovery.ts` (application-owned team sources in the visible list);
  - repository-wide grep for `definitionAdmissionDiagnostics` consumers (only generated web types, its own test and old ticket evidence);
  - admission/org-owned regression tests (`tests/integration/collaboration-definition-admission/org-owned-team-local-agent.test.ts`, `tests/unit/collaboration-definition-admission/org-local-roundtrip.test.ts`).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: Confirmed and unchanged. SR-007 widens the ownership change: admission now enumerates the catalog, and the catalog holds nested units.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. The approval basis is unchanged (SR-005).
- SR-007 requirements edits are editorial and do not change intended behavior:
  - the AC-014 and UI wording now agree with REQ-011;
  - DSN-002 and DSN-003 are recorded as solution details.
  - DSN-003 applies REQ-007 as written.
  - DSN-002 aligns delegation listing with launch's existing duplicate rejection. It falls under REQ-002 ("every reader agrees"), not a new policy.
- SR-009 (DSN-005) changes names and moves application-package agents/teams out of the store. It changes no approved behavior: lists still include application-package entries (read on demand), the Reload buttons still trigger one full reload plus publication (REQ-017), and badges and notices keep their meaning. The user confirmed the name map on 2026-10-11. Application packages stay out of scope; see N-7 for the one preservation condition.
- SR-008 requirements edits do not change intended behavior:
  - **DSN-004** puts a nested definition's error on its owning Team/Org card. Team-local agents have no Agents-page card (existing `AgentList.vue` filter), and org-owned definitions are listed only within their org, so the owning card is the only card on which they appear. This applies REQ-009 ("on the affected card or row") and the approved UI section ("error indicator on the affected agent/team/org card, with the file path and reason"). No new product surface or policy.
  - **FU-001** (collaborator candidates are not filtered by admission availability) is identical at base. It concerns the admission-availability policy, not freshness or agreement with disk (REQ-002). Recording it as an out-of-scope follow-up is correct.
- Relevant existing behavior and evidence confirmed: Yes.
- Scope guardrail confirmed: Yes.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (no blocking findings remain).
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass. Every reader, admission included, uses the catalog (implementation note N-1). | Confirmed | N-1 |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass (dependency-aware expansion) | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass. Definition units cover nested nodes. SR-008 surface trace:<br>- shared agent → Agents card;<br>- team-local agent with last good → owning Team card;<br>- org-owned agent/team or its local agent → owning Org card;<br>- unusable node (first-seen invalid) → list notice of its node subject, through `listIssueEntries` over nested nodes, with file and reason. | Confirmed | N-5 |
| BEH-005 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | User | Pass | Pass | Pass (identity re-arm after the rename swap) | Confirmed | — |
| BEH-007 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | Contract | Pass | Pass | Pass (one diagnostics surface; missing root keeps last good in admission; runtime root transitions) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/apar-cache-probe.test.ts` | Pass | Pass | Pass | Pass | Pass | — |
| `probes/apar-watch-probe*.test.ts` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design § Task Design Health Assessment | — |
| Root-cause classification is explicit and evidence-backed | Pass | Boundary/Ownership plus Missing Invariant. The duplicated inventory and diagnostics are now named. | — |
| Refactor decision is explicit | Pass | `Yes` | — |
| Refactor decision is supported by the concrete design sections | Pass | Catalog as single inventory (units); admission enumerates it; registry narrowed; one diagnostics surface; removals listed | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Monitor + root state machine | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Population / settle / reconcile / expansion | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Agent and team/org read and launch paths | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Full reconcile / registration / initial population | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Publish → web | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Definition services | Pass | Pass | Pass | Pass | Package-root enumeration is forbidden outside the readers |
| `DefinitionAdmissionService` | Pass | Pass | Pass | Pass | Enumerates through services plus the application-owned registry |
| `DefinitionCatalogSync` | Pass | Pass | Pass | Pass | Sole catalog writer |
| `PackageDefinitionMonitor` | Pass | Pass | Pass | Pass | — |
| Hub | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `definition-catalog` subsystem | Pass | Pass | Pass | Pass | Must not import admission, collaboration, run-execution or GraphQL |
| Admission | Pass | Pass | Pass | Pass | `admission → services, registry` |
| Package service | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Service `get…ById` (shared / nested → catalog; application-owned → disk) | Pass | Pass | Pass | Low | Pass |
| `noteUnitChange` / `noteRootChanged` / `settle` / `reloadAll` / `reconcileNow` | Pass | Pass | Pass | Low | Pass |
| `DefinitionAdmissionService.scan` / `requireAvailable` | Pass | Pass | Pass | Low | Pass |
| SR-009 public renames: WS `/ws/agent-package-definitions` + `agent_package_definitions_changed {changedLists}`; GraphQL `loadIssue`/`loadIssues`, `DefinitionLoadIssue(Entry)` (`kind`), `definitionProblems(kind: DefinitionKind!)`, `FOLDER_MISSING`, `DEFINITION_SOURCE_UNAVAILABLE` | Pass | Pass | Pass | Low | Pass. The names state what each thing is; `DefinitionKind` (not `AgentPackageDefinitionKind`) fits because problems also cover application-package teams through admission. |
| GraphQL `reloadAgentPackageDefinitions: Boolean!` (replaces three identical mutations) | Pass | Pass | N/A | Low | Pass. All callers are in-repo, with no aliases. |
| GraphQL `AgentDefinition.catalogIssue` (renamed `loadIssue` in SR-009) | Pass | Pass | Pass | Low | Pass |
| GraphQL `AgentTeamDefinition.catalogIssues` / `AgentOrgDefinition.catalogIssues` (SR-008, replaces the root-only field) | Pass (team/org unit) | Pass (every issue in the unit, root first then path order) | Pass (each entry carries `subject`, `definitionId`, path) | Low | Pass (N-5: sourced per unit through the services) |
| GraphQL `definitionDiagnostics(subject: DefinitionSubject!)` | Pass | Pass | Pass (enum) | Low | Pass |
| GraphQL `AgentPackage.autoRefresh` | Pass | Pass | Pass | Low | Pass |
| WS `/ws/definition-catalog` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| File watching | Pass | Pass | Pass | Pass | — |
| Parsing / codecs / ID helpers / org-owned source index | Pass | Pass | N/A | Pass | — |
| Admission validation | Pass | Pass | N/A | Pass | Enumeration changes; validation is reused unchanged |
| Diagnostics | Pass | Pass | Pass | Pass | One surface replaces the unused query |
| Push transport | Pass | Pass | Pass | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/definition-catalog/` | Pass | Pass | Pass | Pass | — |
| Definition subsystems | Pass | Pass | Pass | Pass | — |
| `collaboration-definition-admission` | Pass | Pass | Pass | Pass | N-1 |
| `agent-packages`, `built-in-agents`, compositions, API | Pass | Pass | Pass | Pass | — |
| Web | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Subject / issue / node and unit outcome types | Pass | Pass | Pass | Pass | — |
| Source enumeration | Pass | Pass | Pass | Pass | Readers are the single enumerator; the registry is limited to application-owned sources |
| Web socket lifecycle | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `DefinitionCatalogIssue` / `DefinitionDiagnostic` | Pass | Pass | Pass | Pass. The issue is the catalog-level core; the diagnostic is the web projection that adds admission codes, `usingLastGood` and `dependencyChain`. | Pass | Old `DefinitionAdmissionDiagnostic` removed |
| `UnitReadOutcome` / `NodeReadOutcome<T>` | Pass | Pass | Pass | Pass | Pass | — |
| `DefinitionUnitIssue` (SR-008) | Pass | Pass | Pass. It is the node identity (`subject`, `definitionId`, `name`) plus the `DefinitionCatalogIssue` fields plus `usingLastGood`. It is distinct from `DefinitionDiagnostic`, which is admission-level, with `dependencyChain` and no name. | Pass. Compose it from `DefinitionCatalogIssue` in one mapper (N-6). | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `definition-catalog/**` | Pass | Pass | Pass | Pass | — |
| `definition-admission-service.ts`, `definition-source-registry.ts` | Pass | Pass | N/A | Pass | N-1 |
| `definition-diagnostics.ts` (replaces `definition-admission.ts`) | Pass | Pass | N/A | Pass | — |
| `built-in-agent-bootstrapper.ts` | Pass | Pass | N/A | Pass | Write → `refreshCache` → resolve → defaults |
| Services / file providers | Pass | Pass | Pass | Pass | N-2, N-3 |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/definition-catalog/{domain,services,providers,monitor,changes}` | Pass | Pass | Low | Pass | — |
| Web `services/nodeChangeFeed`, `services/definitionCatalog` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Cache providers + tests | Pass | Pass | Pass | Pass | — |
| Fresh path + callers | Pass | Pass | Pass | Pass | — |
| Registry shared-root enumeration; dead `implementationPackageRoots` (only tests use it: verified) | Pass | Pass | Pass | Pass | Registry org-owned team enumeration moves to the org reader (N-1) |
| `definitionAdmissionDiagnostics` + type + test | Pass | Pass | Pass | Pass | No live consumer (verified); regenerate web `generated/graphql.ts` |
| SR-009: old names (folder, classes, WS path and frame, GraphQL fields, types, mutations, codes, web files, localization, docs from `061ea7ab3`) | Pass | Pass | Pass | Pass | A clean cut, verified by the spec's repository-wide search list. Build outputs (`resources/server`, `electron-dist`, `dist-mobile`) are regenerated, not edited. |
| SR-009: application-package list entries in the store; readiness `prepare()` reload calls | Pass | Pass (services merge on-demand application-package lists) | Pass | Pass | Readiness keeps its validation; N-7 |
| Nested exact disk reads | Pass | Pass | Pass | Pass | — |
| Package service refresh dependencies; projects socket lifecycle | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Fresh vs cached reads | No | Pass | Pass | — |
| Team/org inventory | No | Pass | Pass | — |
| Diagnostics query | No | Pass | Pass | — |
| Application-owned disk reads | No (distinct out-of-scope source) | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Package files, registry, settings, run history | `Not Affected` | Pass | Pass | N/A | Pass | In-memory only |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–6 | Pass | Pass | Pass | Pass. Step 2 runs the full admission/org regression suite, which guards N-1. |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Team before agents (AR-001) | Yes | Pass | Pass | Pass | — |
| Nested last good (AR-004) | Yes | Pass | Pass | Pass | — |
| Missing root (AR-002/005) | Yes | Pass | Pass | Pass | — |
| GitHub Update swap | Yes | Pass | Pass | Pass | — |
| In-app save, delegation read, half-written create | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

P-001…P-004 from ARCH-REV-001 remain `Reachable`. Their consequences are now handled by the design:

- P-001 → subject expansion;
- P-002 → admission enumerates the catalog;
- P-003 → definition units;
- P-004 → root state machine plus identity re-arm.

P-005 stays rejected (`Technically Possible but Unsupported/Contrived`). The design closes it anyway at no cost by arming the monitor before the first scan.

### `P-006` — An org whose members include org-owned teams goes through admission

- Related contract: preserved team/org admission validation (design escalation trigger; flat-agent-organization-model REQ-027 lineage). REQ-002.
- Relevant behavior ID(s): BEH-001, BEH-005
- Initiating basis kind: `User`. The user or `delegate_task` launches an org, or opens the Orgs page. The user's packages contain org-owned teams under `agent-orgs/*/agent-teams/`.
- Forward path:
  1. `AgentOrgRunService.create` → `admission.requireAvailable("agent_org")` → `scan()`.
  2. `AgentOrgDefinitionResolver` resolves owned team refs via `getTeamById` → admission's `preliminary` map keyed `agent_team:<id>` (`definition-admission-service.ts`; `agent-org-definition-resolver.ts:56`).
  3. Today those org-owned team entries come from `DefinitionSourceRegistry.scan()` → `listAgentOrgOwnedDefinitionSources`, which SR-007 removes from the registry.
- Consequence: If the new admission enumeration lists only shared team units, every org with owned teams becomes unavailable.
- Reachability: `Reachable`. SR-007 implies but does not spell out the enumeration: org units contain org-owned team nodes, and "validation unchanged".
- Review consequence: Mandatory implementation note N-1 (not a design rework). Existing regression tests guard it: `tests/integration/collaboration-definition-admission/org-owned-team-local-agent.test.ts` and `tests/unit/collaboration-definition-admission/org-local-roundtrip.test.ts`.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` (round 4, SR-009 delta). SR-009 is a clean-cut rename that resolves CRR-006 CR-005…CR-011 under user-confirmed names (DSN-005). It also makes one small accuracy change: application-package agents/teams are read on demand instead of held in the store, and the readiness reload is removed. Public contracts change only in name or by consolidation, and every consumer is in-repo. No approved behavior changes, provided N-7 holds. Round 3: `Pass` (SR-008 delta). SR-008 resolves CR-004 within the approved REQ-009 and UI section. Nested last-good issues now have a rendered surface on the owning Team/Org card, through the unit-wide `catalogIssues`. Unusable nested nodes stay visible in the subject notice with file and reason. The contract change is limited to the two Team/Org GraphQL fields and their web consumers, and the verification additions are adequate (source-review surface trace, component, GraphQL and DESK-002 nested plus org-owned re-runs). Round-2 conclusions stand: SR-007 resolves AR-001…AR-006 in the canonical design spec (verification is in the revision record). The catalog is now the single inventory for shared and nested definitions. Admission enumerates it, publication follows list dependencies, one diagnostics surface replaces the unused admission query, and the monitor lifecycle is complete. The design is ready for implementation, subject to the implementation notes below.

## Findings

None blocking.

Implementation notes. Carry these in the handoff; they do not change the design:

- **N-1 (mandatory):** Admission's team enumeration must include the **org-owned team nodes of org units** as `agent_team` admission subjects (with their canonical IDs), together with shared team units and the registry's application-owned sources. This replaces what `listAgentOrgOwnedDefinitionSources` contributed. Org validation resolves owned team refs through those admission results (P-006). Keep the two org-owned regression tests green.
- **N-2:** `getVisibleAgentDefinitions()` must keep listing the team-local agents of **application-owned** teams, read from disk as application-owned. Today these come through `listTeamLocalAgentDefinitions({ applicationOwnedTeamSources })`. The design's "team-local nodes of shared team units" wording must not drop them (preserved out-of-scope behavior).
- **N-3:** In-app writes of nested definitions call `reconcileNow` on their **owning unit**: the team or org ID derived through the existing ID helpers, not the nested ID.
- **N-4:** Readers apply the team/org duplicate rule only after de-duplicating identical resolved paths, as admission's `seenPaths` does today, so one physical folder never reads as duplicated.
- **N-5 (SR-008):** Source `catalogIssues` **per unit** through a team/org service accessor (for example `listUnitIssues()` returning issues grouped by unit ID, with `usingLastGood` and the last-good name). `DefinitionCatalog.listIssueEntries(subject)` groups by **node** subject, so filtering it by `agent_team` / `agent_org` would miss the team-local and org-owned agent nodes, the CR-004 defect again. Resolve once per list query, not once per card. Resolvers must not reach into the catalog directly.
- **N-7 (SR-009, mandatory):** The on-demand application-package list merge in the agent and team services must isolate each definition. If reading one application-package agent or team fails (`AgentMdParseError`, `ApplicationOwnedAgentConfigParseError`, a team codec error), log it and skip that entry; never fail the whole list. Today the store's readers classify those entries one by one. A raw on-demand read would reintroduce the whole-list failure that CR-001 and REQ-003/QR-004 removed, for `list_available_agents`, the `@` menu and the Agents/Teams lists. Add one unit test with a malformed application-package agent beside valid ones.
- **N-6 (SR-008):** Build `DefinitionUnitIssue` from `DefinitionCatalogIssue` in one mapper shared by the team and org converters. This keeps the code and reason fields from drifting from `AgentDefinition.catalogIssue`.

## Classification

N/A (Pass)

## Recommended Recipient

Primary: `/software_engineering_team/implementation_engineer`. Informational: `/software_engineering_team/solution_designer`.

## Residual Risks

- **Linux root-rename event shape.** If chokidar on inotify emits no `unlinkDir` when a root is renamed away, `ROOT_MISSING` appears only at the next full reconcile. Watching still resumes on rename-back, because the watch follows the same inode. Run the AC-012 tests on Linux as well as macOS and record the result.
- **Linux watch count.** About 400–700 is expected; record it (QR-002).
- **DSN-002 visible effect.** `list_available_agents` stops offering a duplicated team that launch already rejects. This is consistent with REQ-002; mention it in the delivery docs.
- **Flush-on-read during long bursts.** It can split one burst into a few publications. AC-006 asserts a bound, not exactly one.
- **U-001.** The restore-after-removal UX is validated under AC-008.
- **FU-001** (out of scope; separate-ticket candidate). `list_available_agents` and `@` offer a team that admission rejects because a member is missing. This is the same at base, and the launch fails with the existing error.
- **SR-009, application packages.** Application-package agents/teams no longer get load issues or live publication. Live publication was only an effect of the readiness reload during this ticket; base had neither, and application packages are out of scope. Their lists are read fresh on demand, and their admission problems remain in `definitionProblems` through the application-owned registry.
- **Superseded reviews.** CRR-001/002's source-review Pass is superseded per CRR-003. The SR-008 implementation returns through source review, which includes the nested-surface trace, and then API/E2E (DESK-002 nested plus org-owned).

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-004, SR-009 delta)
- Material-Premise Gate: `Pass`
- Notes: Implementation must honor N-1 and N-7 (mandatory) and N-2…N-6. N-5 and N-6 apply under the new names (`loadIssues`, `DefinitionLoadIssueEntry`).
