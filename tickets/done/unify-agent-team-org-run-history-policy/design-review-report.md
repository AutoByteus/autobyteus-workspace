# Design Review Report — Unified Team/Org run-history policy

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/requirements-doc.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/design-spec.md`
- Supplemental Task Artifacts Reviewed: None; branch and prior fixture are evidence references, not supplements.
- Relevant Solution Revision IDs: `SR-001`–`SR-005`; approved baseline `SR-002`; triggering correction `SR-005`.
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: `SR-005` revised Architecture Design Complete after API-REV-001/F-001 and CRR-002/CR-001 exposed the current Team imported-Memory read-bound gap.
- Prior Review Round Reviewed: 2 — ARCH-REV-002 Pass on SR-004; prior DR-001 remains resolved.
- Latest Authoritative Round: 3.
- Current-State Evidence Basis: prior direct source review; SR-005 investigation; direct inspection of current `TeamMemoryExplorerService`, member-target builder, both location services, Memory GraphQL resolvers and web Memory store/page; API-REV-001 L-03 measured 12 post-readiness tree reads for 3 admitted roots; CRR-002 failure-origin review. The L-03 probe’s hard-coded byte-identity flag is not credited. Existing IR-001 implementation/focused tests are historical for SR-004, not a pass for SR-005.
- Triggering downstream reports/records reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/code-review-report.md`, `code-review-revision-record.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, `api-e2e-coverage-investigation.md` and `api-e2e-test-case-ledger.md` at the same artifact root; latest CRR-002 and API-REV-001 remain Fail.

## Routing Classification Review

- Task size: `Medium`.
- Architectural risk: `High`.
- Classification rationale reviewed: Existing capability area, cross-family persistence/queue/compensation and explicit repair remain high-risk; SR-005 adds a bounded current Team Memory/location projection correction, not a new subsystem.
- Independent Architecture Review required by the classification: `Yes`.
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` — SR-005 covers the present imported Team Memory request path under unchanged AC-003; SR-004 lifecycle/history basis remains confirmed.
- Approved requirements / intended behavior understood: Index-authoritative admitted rows; read-only catalog queries; lifecycle-maintained rows; imported memory read-only; explicit offline/local repair; missing empty, corrupt error/no overwrite.
- Relevant existing behavior and evidence confirmed: IR-001 implemented the reviewed SR-004 catalog/manager policy. Current Team Memory explorer reads each admitted root tree once, then its per-root member builder invokes an unscoped location lookup that rereads all roots. The Memory UI and GraphQL expose both Team list and run-list requests; API-REV-001 measured 12 reads for 3 roots after readiness, and CRR-002 confirmed the pre-existing N+N² path. The L-03 byte-identity literal is not evidence of no writes.
- Scope guardrail confirmed: UC-001–004 in scope; AC-003’s one-tree-per-admitted-root/per-request and imported read-only requirements apply to the current Team source. The unmerged Org adapter remains conditional. Standalone Agent, execution-tree schema, unrelated UI/API and historical migration redesign are out of scope; review cannot add policy.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes`; none remains. The triggering downstream gap is REQ-005/AC-003, BEH-003.
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | None. |
| BEH-002 | System/user | Pass | Pass | Pass | Confirmed | SR-004 specifies queue → per-root manager lane → inside-lane inactive check → full transaction/compensation. |
| BEH-003 | User/operational | Pass | Pass | Pass | Confirmed | SR-005 makes the present Team explorer’s same-snapshot projection mandatory for both list endpoints; conditional Org source integration remains tied to branch merge. |
| BEH-004 | Operational/contract | Pass | Pass | Pass | Confirmed | Keep explicit repair separate from reads/startup. |

## Supplemental Artifact Coherence Verdict

None. Investigation inventory and core artifacts consistently identify no behavior-defining supplements. The unmerged memory branch and prior fixture are explicitly evidence-only.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present for current posture | Pass | Design has a dedicated refactor assessment. | None. |
| Root cause explicit/evidence-backed | Pass | Divergent initialization/state and Org memory bypass match current code. | None. |
| Refactor decision explicit | Pass | Refactor now; standalone and migration work deferred. | None. |
| Concrete design supports decision | Pass | Narrow core, family adapters, removal, manager-gated Team archive and tests are mapped. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | History listing | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Create/restore/events | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Archive/delete | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Imported Team inspection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Offline repair | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Bounded core queue | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

DS-003 remains confirmed from SR-004/ARCH-REV-002. DS-004 now spans Memory selection → web store → GraphQL/source resolution → current Team explorer → catalog owner and one root-tree read → same-snapshot member projection → cards. It names the present Team path, not only the conditional Org branch.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Family history catalogs / shared core | Pass | Pass | Pass | Pass | Core is internal; consumers use family IDs and catalog queries. |
| Family manager transition gate | Pass | Pass | Pass | Pass | SR-004 generalizes Team’s lane-gated deletion callback to archive/unarchive and retains Org’s gate. |
| Readiness / imported memory | Pass | Pass | Pass | Pass | Current Team uses its catalog owner; SR-005 reuses its one validated tree for member locations. Org owner-query adapter remains conditional. |
| Offline repair | Pass | Pass | Pass | Pass | Separate dry-run-first local command, no runtime caller. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Family adapters → core/stores/managers | Pass | Pass | Pass | Pass | Family transactions remain specialized. |
| Mixed history / memory sources → catalogs | Pass | Pass | Pass | Pass | Current Team continues to use its catalog owner; Org direct-store bypass is removed conditionally. |
| Maintenance → app-data profile/readiness/stores | Pass | Pass | Pass | Pass | No reverse dependency from runtime. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Family `listCatalogRows` / `getCatalogRow` | Pass | Pass | Pass | Low | Pass |
| Core family-keyed row/queue operations | Pass | Pass | Pass | Low | Pass |
| Family archive/delete operation | Pass | Pass | Pass | Low | Pass |
| Offline repair command | Pass | Pass | Pass | Low | Pass |
| Tree-scoped Team member-location projection | Pass | Pass | Pass | Low | Pass |

The Team manager callback remains correct from SR-004. SR-005’s `listAgentsInTree(tree)` / `listTeamMemberLocationsFromTree({teamRunId, tree})` / `buildFromTree(teamRunId, tree)` chain has a required snapshot, exact root check and no ambiguous all-roots selector. The general location API stays available for independent callers.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Catalog state/policy | Pass | Pass | Pass | Pass | Reuses run-history area and current stores. |
| Admission | Pass | Pass | N/A | Pass | Reuses shared readiness owner. |
| Repair | Pass | Pass | Pass | Pass | Existing standalone repair is posture precedent, not reused policy. |
| Team member location from an already-read tree | Pass | Pass | Pass | Pass | Reuses `TeamExecutionIndex`, `listInTree`/`toLocation`, `matchesTeam` and current memory summary builder; no new cache or identity model. |
| Team archive gate | Pass | Pass | N/A | Pass | SR-004 uses the existing Team `withRootTransition` lane through a generalized inactive-history callback. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-history/services` core and adapters | Pass | Pass | Pass | Pass | Narrow shared policy, specialized tree transactions. |
| Family run managers | Pass | Pass | Pass | Pass | Team’s generalized inactive-history callback now owns the per-root transition check and transaction lifetime. |
| `run-history/maintenance` | Pass | Pass | Pass | Pass | Offline boundary. |
| Team Memory explorer/location services | Pass | Pass | Pass | Pass | Explorer owns the one root read; tree-location service owns physical/configured projection; builder owns available-memory card assembly. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Family-keyed row state/init/queue/admission/summary | Pass | Pass | Pass | Pass | No generic tree transaction or union row. |
| Family-specific projector/compensation | Pass | Pass | Pass | Pass | Correctly remains specialized. |
| Team tree-scoped member location | Pass | Pass | Pass | Pass | Uses existing index/location structure rather than a new duplicated member model. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Core `Row` plus `idOf` | Pass | Pass | Pass | Pass | Pass | No second persisted representation. |
| `(resolved memoryDir, family)` state | Pass | Pass | Pass | Pass | Pass | State excludes injected manager/tree dependencies. |
| Team member target record | Pass | Pass | Pass | Pass | Pass | Existing configured placement/path and memory summary shapes remain; only source of location enumeration changes. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New `collaboration-run-history-catalog-core.ts` | Pass | Pass | Pass | Pass | State/queue/index-only read. |
| Team and Org catalog services | Pass | Pass | Pass | Pass | Family tree/transaction work retained; SR-004 specifies the Team gate correction. |
| Repair service and command | Pass | Pass | Pass | Pass | Separate from normal runtime. |
| Org memory source after merge | Pass | Pass | N/A | Pass | Conditional file not present on base. |
| Team explorer, member-target builder and location services | Pass | Pass | Pass | Pass | Current Team `buildGroups` passes its validated tree through required-tree APIs; location owner retains nested physical-path semantics and builder retains card assembly. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `run-history/services` core/adapters | Pass | Pass | Low | Pass | Existing flat capability folder is proportionate. |
| `run-history/maintenance` + script | Pass | Pass | Low | Pass | Command isolated from queries/startup. |
| Existing migration files | Pass | Pass | Low | Pass | Remain migration-owned. |
| `agent-memory/services` + Team tree-location service | Pass | Pass | Low | Pass | Tree-scoped location projection extends its existing owner; no generic helper or history-core pollution. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Org read-time reconciliation, `initialize`, `listRows` | Pass | Pass | Pass | Pass | Callers/tests updated. |
| Org memory direct store read | Pass | Pass | Pass | Pass | Conditional on branch merge. |
| Team diagnostic index service | Pass | Pass | Pass | Pass | Removed in IR-001 after import search. |
| Historical migration writer/reconciler | Pass | N/A | Pass | Pass | Retained for one-time migration only. |
| Team per-root unscoped location lookup in explorer | Pass | Pass | Pass | Pass | Replace this call with same-tree projection in the current branch; retain general lookup for independent callers. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Normal history catalog | No | Pass | Pass | No tree-scan fallback or Org alias. |
| Historical migrations | No | Pass | Pass | Isolated existing migration owners are not runtime compatibility paths. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Current Team/Org index arrays and package trees | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Current strict readers accept existing eight-field shapes; representative isolated 1 Team/4 Org rows; no path/schema change. API-REV-001 L-01 subsequently read copied current arrays unchanged; SR-005 adds no persisted change. |
| Missing-row local repair | Explicit repair, not migration | Pass | Pass | N/A | Pass | Never rewrites valid rows or corruption; reports unrecoverable index-only fields and per-family completion. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Core introduction / family rewiring | Pass | Pass | Pass | Pass |
| Team archive gate and compensation | Pass | Pass | Pass | Pass |
| Offline repair / conditional Org memory source | Pass | Pass | Pass | Pass |
| Current Team Memory same-snapshot correction | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Org create without preinit | Yes | Pass | Pass | Pass | Fresh-process example explains duplicate avoidance. |
| Team archive transition/queue ordering | Yes | Pass | Pass | Pass | SR-004 supplies Restore-first and Archive-first user-path interleavings plus deterministic barriers. |
| Repair loss limits | Yes | Pass | Pass | Pass | Missing versus corrupt and existing-row preservation are clear. |
| Imported Team multi-root read path | Yes | Pass | Pass | Pass | SR-005 gives the N+N² cause, required-tree API chain, and both-endpoint instrumented/hashing test shape. |

## Material Premise Validation (Only When Needed)

### PM-001 — Team archive can pass a stale active check while the same run is restored

- Related approved requirement or established contract: REQ-002/004; AC-002 concurrent writes, preserved archive/restore outcomes and manager gates.
- Relevant behavior ID(s): BEH-002.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: One user archives an inactive retained Team run from the workspace-history action while another resumes the same retained run by sending a message from its Team context; AC-002 explicitly requires concurrent lifecycle writes to serialize.
- Support evidence: `autobyteus-web/composables/useWorkspaceHistoryMutations.ts:138-145` exposes archive; `autobyteus-web/stores/agentTeamRunStore.ts:246-260` issues `RestoreAgentTeamRun` when submitting to an inactive Team; GraphQL resolvers call the corresponding history/run services.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Workspace history archive → run-history store → `archiveStoredTeamRun` GraphQL → Team history service → catalog `setArchived`; concurrent message submission → Team run store → `restoreAgentTeamRun` GraphQL → Team run service → `AgentTeamRunManager.restoreTeamRun` under `withRootTransition`. Before IR-001, `setArchived` checked `hasManagedTeamRun` before catalog enqueue, then later read/wrote the tree without entering `withRootTransition` (the source basis for ARCH-REV-001). IR-001 implemented the reviewed queue → manager-lane correction and focused integration tests exercised it.
- Lifecycle preconditions and material consequence at the claimed point: A retained inactive Team row/tree is visible for archive and can also be resumed by a user. Before the SR-004/IR-001 correction, archive could return success while the run was active, violating the preserved inactive-only archive boundary. The shared history queue alone serializes catalog writes, not manager restore; the current manager lane addresses this.
- Reachability: `Reachable` under two supported user actions and the approved concurrent-write contract; no hidden-file mutation or test-only trigger is needed.
- Review consequence / proportionate response: SR-004 now requires Team archive/unarchive to use the existing per-run transition lane with queue → lane acquisition, inside-lane inactive recheck, full transaction/compensation and deterministic interleaving tests. The reachable premise is addressed without new product behavior or generalized machinery.

### PM-002 — Imported Team inspection rereads all roots during per-root member lookup

- Related approved requirement or established contract: BEH-003, REQ-005 and AC-003’s at-most-one execution-tree read per admitted root per request, excluding explicit readiness validation; imported source remains read-only.
- Relevant behavior ID(s): BEH-003.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: User selects an imported source in the Memory page and opens Agent Teams or a Team’s run list.
- Support evidence: `autobyteus-web/pages/memory.vue` and `stores/memoryExplorerStore.ts` expose both actions; `src/api/graphql/types/memory-explorer.ts` resolves the selected root and constructs `TeamMemoryExplorerService` for both queries.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Memory page/store → `listAgentTeamsWithMemory` or `listAgentTeamRunsWithMemory` GraphQL → source resolution → fresh Team explorer → `buildGroups()` → one `readTree(root)` → per-root `TeamMemoryMemberTargetBuilder.build(root)` → `AgentMemoryLocationService.listTeamMemberLocations` → unscoped `TeamRunExecutionTreeLocationService.listAgents()` → all stored root-tree reads. API-REV-001 L-03 measured 12 reads for 3 admitted roots after readiness. SR-005 replaces only this per-root unscoped step with projection from the already-read validated tree.
- Lifecycle preconditions and material consequence at the claimed point: The imported folder contains multiple admitted Team roots; each request independently constructs the explorer and traverses them. The current N+N² reads violate AC-003’s ≤N bound and scale poorly. The L-03 hard-coded byte-identity flag does **not** establish read-only proof; actual before/after hashes are required downstream.
- Reachability: `Reachable` through the exposed Memory UI and normal GraphQL production path; the probe measures an established path rather than creating its initiating state.
- Review consequence / proportionate response: SR-005’s required-tree projection in the existing location owner removes the extra tree I/O without new persisted state, broader lookup-policy changes or changed member/card behavior. Validate both request surfaces and actual imported-file hashes after implementation.

## Unresolved Approved-Behavior Or Current-State Gaps

None. DR-001 remains resolved. API-REV-001/F-001 and CRR-002/CR-001 identify a real downstream failure in the current Team path; SR-005’s design correction resolves the design-route gap, while implementation and executable revalidation remain outstanding.

## Review Decision

`Pass` — SR-005 correctly makes the current Team same-snapshot location path mandatory under unchanged AC-003, with clear ownership and verification intent. This is a design pass only; API-REV-001 and CRR-002 remain Fail until downstream correction and revalidation.

## Findings

None. DR-001 remains resolved in ARCH-REV-002; the triggering CR-001/F-001 design-route gap is addressed in SR-005 and recorded in ARCH-REV-003.

## Classification

N/A — no open finding.

## Recommended Recipient

`/implementation_engineer` under the primary pass rule; `/solution_designer` receives the required informational pass notification after primary handoff succeeds.

## Residual Risks

- Earlier IR-001 and focused tests passed SR-004, but current API-REV-001 and CRR-002 remain Fail. SR-005 Team Memory correction has not been implemented or revalidated; require a new implementation, source review and API/E2E round.
- The unmerged memory branch needs owner-query integration when it lands; the review does not claim its tests ran.
- Explicit repair cannot reconstruct absent index-only summary/termination; the design reports this and requires acknowledgement rather than pretending lossless recovery.

## Latest Authoritative Result

- Review Decision: `Pass`.
- Material-Premise Gate: `Pass` — PM-001 remains resolved; PM-002 has an independent Memory UI trigger and measured production-path consequence. No unsupported machinery was accepted.
- Notes: ARCH-REV-003 passes SR-005’s current Team Memory design correction. The prior history-core/manager, direct-use transition and offline repair assessments remain sound. This review does not supersede the downstream Fail results or claim corrected code/tests pass.
