# Architecture Review Revision Record

The latest `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/design-review-report.md` remains authoritative. This record captures only the review baseline and later deltas.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / fresh review after failed-disk recovery | SR-002–SR-007 | N/A | Pass | None |
| ARCH-REV-002 | Round 2 / CRR-010 Design Impact re-review | SR-008 | Pass | Pass | CR-008, CR-009 |
| ARCH-REV-003 | Round 3 / user-approved presentation re-review | SR-009–SR-011 | Pass | Pass | USER-UX-001, USER-UX-002 |
| ARCH-REV-004 | Round 4 / user-approved stored-settings parity re-review | SR-012 | Pass | Pass | USER-UX-003 |
| ARCH-REV-005 | Round 5 / CRR-017 Design Impact re-review | SR-013 | Pass | Pass | CR-011, CR-012; MP-CR-009 |
| ARCH-REV-006 | Round 6 / CRR-021 product-reachability correction | SR-014 | Pass | Fail — Design Impact | AR-001; CR-013 / MP-CR-010 |
| ARCH-REV-007 | Round 7 / AR-001 coherence re-review | SR-015 | Fail — Design Impact | Pass | AR-001 |

## Revision Entries

### ARCH-REV-001 — Establish Fresh Recovered-Solution Review Baseline

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/design-review-report.md`
- Review round and trigger: Round 1; fresh review required because failed-disk recovery could not restore the prior architecture-review artifacts or the original V2 contract blob.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/recovery-audit.md`; `REC-001`
- Relevant solution revision IDs: `SR-002`–`SR-007`, with `SR-007` as the immediate trigger
- Prior authoritative decision: `N/A — prior report unavailable; no result inferred`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: Independently re-established the approved behavior/current-state basis, completed every architecture check, confirmed the reconstructed V2 contract's semantic equivalence, confirmed the migration-only V1 and normal-runtime V2 boundary, and established a new authoritative pass result.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material classification changes: Recovery uncertainty about the reconstructed V2 contract is resolved as semantic equivalence confirmed. Byte identity remains unknowable but is not required for design readiness.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: The recovered implementation is incomplete because four frontend source/test blobs are unavailable; implementation engineering must reconstruct them and validate all recovered code before producing new implementation artifacts.

### ARCH-REV-002 — Approve Unified Workspace Lifecycle And Post-Validation Identity Allocation

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/design-review-report.md`
- Review round and trigger: Round 2; `CRR-010` returned two integrated Design Impact findings after implementation/API-E2E/delivery recovery work, and `SR-008` revised the design.
- Triggering role, report path, and finding IDs: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/code-review-report.md`; `CR-008`, `CR-009`; premises `MP-CR-006`, `MP-CR-007`
- Relevant solution revision IDs: `SR-008`, with `SR-002`–`SR-007` retained as baseline
- Prior authoritative decision: `Pass` at `ARCH-REV-001`; the later implementation gate was `CRR-010` Fail / Design Impact
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: Revalidated the unchanged approved behavior and prior V2/migration result, independently confirmed both triggering production premises, and verified that SR-008 supplies one draft-owned Team workspace lifecycle/DS-008 sequence plus one planner-owned post-validation configured identity phase with clean removal and test plans.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-008 | Open — blocking Design Impact in CRR-010 | Design-resolved; implementation pending | `SR-008`, `ARCH-REV-002`; MP-CR-006 | Revised BEH-004/BEH-009, DS-008, Team workspace lifecycle table, boundary/dependency/interface rules, removal plan, real-Pinia/rendered coverage requirements |
| CR-009 | Open — blocking Design Impact in CRR-010 | Design-resolved; implementation pending | `SR-008`, `ARCH-REV-002`; MP-CR-007 | Revised DS-003/DS-007, planner-owned allocator contract, removed root preallocation/input APIs, returned-root application binding, zero-effect invalid-input test requirements |

- New or remaining finding IDs: None
- Material classification changes: CR-008 and CR-009 remain valid, reachable Design Impact diagnoses from CRR-010 but are resolved in the canonical design. MP-ARCH-001 records the distinct reachable post-dispatch topology-change timing; it supports token/final reconciliation and does not authorize rollback/delete behavior.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: Existing code has not yet implemented SR-008. A topology change after workspace creation is dispatched may leave an unused workspace, while stale configuration attachment and TeamRun creation must be prevented. API/E2E and delivery remain gated on implementation and complete source review.

### ARCH-REV-003 — Approve Original-Form-Preserving Nested Team Presentation

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/design-review-report.md`
- Review round and trigger: Round 3; the user rejected the DR-003 hierarchy-specific root chrome during hands-on Electron verification, solution design established the actual `origin/personal` visual baseline in SR-010, and the user approved the exact UI/UX contract in SR-011.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/ui-ux-spec.md`; `USER-UX-001`, `USER-UX-002`, `USER-APPROVAL-002`
- Relevant solution revision IDs: `SR-009`–`SR-011`, with `SR-011` current; `SR-008` remains the functional baseline
- Prior authoritative decision: `Pass` at `ARCH-REV-002`; later integrated implementation/source/API-E2E/proportional/delivery gates also passed before the user presentation refinement
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: Revalidated the affected desktop journeys against the approved requirements, original-personal screenshots, rejected DR-003 screenshot, current component source, and the complete UI/UX specification. Confirmed that root and nested wrappers may specialize presentation while reusing the same field/event behavior, with no new state owner, spine, API, persisted-data change, or functional redesign.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| USER-UX-001 | DR-003 root presentation rejected; SR-009 retained a collapsed nested summary | Superseded and design-resolved; implementation pending | `SR-009`, `SR-010`, `SR-011`, `ARCH-REV-003` | Approved root baseline removes wrapper/title/badge/`/`/divider/summary; nested design also removes every effective summary |
| USER-UX-002 | Evidence-based personal comparison and dedicated UI/UX contract required | Resolved; user-approved; implementation pending | `SR-010`, `SR-011`, `ARCH-REV-003` | Live personal root/nested screenshots, rejected-state screenshot, six UI journeys, wireframes, state/accessibility rules, explicit removed-output list, and user approval |
| CR-008, CR-009 | Design-resolved at ARCH-REV-002; implementation pending at that time | Remain resolved in design and current source | `SR-008`, `ARCH-REV-002`, IR-008, CRR-012, API-REV-007, CRR-014 | SR-011 excludes store/resolver/launch/backend/V2/migration/allocation changes and keeps all passed owners/interfaces intact |

- New or remaining finding IDs: None
- Material classification changes: The current delta is `Local Presentation Redundancy` / UI simplification, not a renewed architecture ownership issue. No new material production premise is introduced.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: The DR-003 source still renders the rejected presentation. Implementation must keep the narrow component/localization/test boundary, preserve all scoped/accessibility states, inspect the rendered result, and return through source review. The rebuilt Electron candidate still requires explicit user verification before delivery finalization.

### ARCH-REV-004 — Approve Immutable Stored Truth Through The Shared Team Form

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/design-review-report.md`
- Review round and trigger: Round 4; hands-on review of the rebuilt Electron candidate exposed `USER-UX-003`, solution design reproduced the current stored-card inspector, compared the `origin/personal` selected-TeamRun path, and recorded the user-approved correction in SR-012.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/solution-evidence/stored-team-settings-origin-personal-source-audit-20260825.txt`; `USER-UX-003`
- Relevant solution revision IDs: `SR-012` current; `SR-009`–`SR-011` retained as the editable-presentation baseline; `SR-008` retained as the functional baseline
- Prior authoritative decision: `Pass` at `ARCH-REV-003`; the SR-011 editable delta later passed IR-009, CRR-015, API-REV-008, CRR-016, and DR-004 before the separate stored-settings gap was exposed
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: Added BEH-010/DS-006 review coverage and confirmed that one discriminated shared form can preserve two distinct authorities. Editable mode retains draft intent and commands; stored mode consumes ordered immutable V2-derived topology, complete Team/Agent values, stored workspace facts, and field-availability descriptors with no current-definition, draft, override-reconstruction, or mutation dependency. The three parallel `Stored*` presentation components are explicitly deleted after parity coverage.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| USER-UX-003 | Open user-approved presentation gap; SR-011-only review was held | Design-resolved; implementation pending | `SR-012`, `ARCH-REV-004`; BEH-010, R-042–R-044, AC-035–AC-038 | Origin/personal source/test audit, live current reproduction, shared-form wireframes, DS-006, discriminated adapter/interface rules, exact removal plan, and focused parity/topology/fallback/accessibility tests |
| USER-UX-001, USER-UX-002 | Design-resolved at ARCH-REV-003; implementation pending then | Remain resolved and are implemented in the current editable source | `SR-009`–`SR-011`, `ARCH-REV-003`, IR-009, CRR-015, API-REV-008, CRR-016, DR-004 | SR-012 preserves the approved root/nested presentation and changes only stored-mode composition |
| CR-008, CR-009 | Resolved in design and source | Remain resolved and unaffected | `SR-008`, `ARCH-REV-002`, IR-008, CRR-012, API-REV-007 | SR-012 excludes draft/workspace lifecycle, launch, backend validation/allocation, V2, and migration owners |

- New or remaining finding IDs: None
- Material classification changes: The new gap is resolved as `Duplicated Presentation / Boundary Misread`, requiring a focused frontend refactor rather than a data-model collapse or functional redesign. No new persisted-data transition or unsupported production premise is introduced.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: Current source still renders the rejected `Stored*` inspector. Implementation must preserve stored sibling order from V2-derived topology, pass exact Agent values directly, render catalog/workspace misses truthfully in-field, expose no stored commands, delete the parallel components/labels/tests after parity coverage, and return through complete source review. Browser/system validation and explicit hands-on user verification remain required before delivery finalization.

### ARCH-REV-005 — Approve Distinct Form Capabilities And Exact Historical Residuals

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/design-review-report.md`
- Review round and trigger: Round 5; `CRR-017` returned two blocking Design Impact findings after IR-010 implemented the SR-012 shared-form presentation, and SR-013 revised the subject-capability and historical-representability boundaries.
- Triggering role, report path, and finding IDs: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/code-review-report.md`; `CR-011`, `CR-012`; premise `MP-CR-009`
- Relevant solution revision IDs: `SR-013` current; `SR-012` retained as the user-approved stored-settings behavior/appearance basis; `SR-011` retained as the editable-presentation basis; `SR-008` retained as the functional baseline
- Prior authoritative decision: `Pass` at `ARCH-REV-004`; the later implementation source gate was `CRR-017` Fail / Design Impact
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: Confirmed that SR-013 replaces the authoring-shaped common Team/Agent form model with neutral display vocabulary plus parallel real editable/stored capabilities, keeps discrimination through recursive renderers, and adds one pure per-key/value historical representability projector. The projector preserves every explicit stored value exactly through partial or whole current-schema drift while retaining the approved shared form and unchanged immutable V2 authority.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-011 | Open — blocking Design Impact in CRR-017 | Design-resolved; implementation correction pending | `SR-013`, `ARCH-REV-005`; R-043, AC-037 | Neutral `TeamRunFormModel`, parallel editable/stored Team and Agent capability families, stored-projector forbidden dependencies, removal of fabricated selection/override/idle state, recursive subject narrowing, static checks, and direct tests are explicit in the design |
| CR-012 | Open — blocking Design Impact in CRR-017 | Design-resolved; implementation correction pending | `SR-013`, `ARCH-REV-005`; R-044, AC-036, AC-038; MP-CR-009 | Pure `projectHistoricalModelConfigFields` algorithm classifies each explicit key/value, forbids editable Default normalization, emits one exact residual row for stale/removed values, defines stable order and no duplication, and requires root/nested-Team/Agent coverage for partial and whole-schema drift |
| USER-UX-003 | Design-resolved at ARCH-REV-004; partially implemented in IR-010, then blocked by CRR-017 | Remains design-resolved; implementation correction pending | `SR-012`, `SR-013`, `ARCH-REV-004`, `ARCH-REV-005` | SR-013 preserves one shared form/tree/control appearance, immutable stored topology/order, disabled controls, operable disclosures, no Run/Reset, and deletion of all three `Stored*` presentation components while correcting exact-history semantics |
| USER-UX-001, USER-UX-002; CR-008, CR-009 | Resolved in earlier design/source rounds | Remain resolved and unaffected | `SR-008`, `SR-011`, `ARCH-REV-002`, `ARCH-REV-003` | SR-013 explicitly excludes editable appearance, draft/workspace lifecycle, launch, validation/allocation, backend, V2 persistence, migration, and auxiliary surfaces |

- New or remaining finding IDs: None
- Material classification changes: `MP-CR-009` remains `Reachable`, grounded in the supported existing-TeamRun/member Settings action and the explicit R-044/AC-038 historical-schema contract. The proportionate response is display-only exact classification, not migration, compatibility rewriting, or a new product policy.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: Current IR-010 source still contains the CR-011 dependency/sentinels and the CR-012 partial-schema defect. Implementation must keep subject discrimination through root/Team/Agent renderers, avoid optional authoring-shaped common fields, classify actual control losslessness as well as schema validity, preserve deterministic order/no duplication/no mutation, and pass static, focused, type/build, rendered, and complete source-review gates before API/E2E or delivery resumes.

### ARCH-REV-006 — Require One Producer-Bounded Cleanup Contract

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/design-review-report.md`
- Review round and trigger: Round 6; the user reaffirmed the mandatory Product Reachability Rule, `CRR-021` rescinded `CR-013`/`MP-CR-010` and voided CRR-020, API-REV-010 passed real current-user paths, and SR-014 proposed clean removal of the premise-driven IR-012 CR/LF delta.
- Triggering role, report path, and finding IDs: `solution_designer` after user correction; `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/code-review-report.md` (`CRR-021`) and `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-execution-coverage-report.md` (`API-REV-010`); `CR-013` rescinded, `MP-CR-010` Not Reachable, `API-E2E-F-003` Out Of Scope; new architecture finding `AR-001`
- Relevant solution revision IDs: `SR-014` current; `SR-013` retained for the capability/classifier architecture; `SR-012` retained for the shared locked-form behavior
- Prior authoritative decision: `Pass` at `ARCH-REV-005`; later source/API routing introduced and then rescinded a synthetic free-text premise
- Current authoritative decision: `Fail — Design Impact`
- What changed in the review result or what baseline was established: Confirmed that SR-014's intended architecture is correct: retain IR-011's distinct capabilities and product-grounded dynamic stale-enum/removed-field classifier, reject the synthetic prompt/CR premise, and remove IR-012-only code/tests. The design nevertheless remains internally contradictory because its mandatory removal table omits the SR-014 cleanup and its unqualified final hard block still applies exactness to any persisted key/value, including the explicitly excluded synthetic state.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-011 | Design-resolved at ARCH-REV-005; implementation pending then | Remains resolved and is implemented by IR-011 | `SR-013`, `ARCH-REV-005`, IR-011, CRR-018–CRR-021 | Stored/editable Team and Agent capabilities remain distinct; SR-014 changes no capability owner |
| CR-012 / MP-CR-009 | Design-resolved at ARCH-REV-005 | Remains resolved for supported product-originated history; MP-CR-009 is Reachable with concrete emitted fields | `SR-013`, `SR-014`, `ARCH-REV-005`, `ARCH-REV-006` | Production `model/list` emits selectable `reasoning_effort` and optional `service_tier=fast`; user selection, V2 persistence, later catalog refresh, and Settings form a complete path |
| CR-013 / MP-CR-010 | Previously accepted/reopened through CRR-018–CRR-020 | Rescinded; premise `Not Reachable` | CRR-021, API-REV-009 correction, API-REV-010, SR-014 | `ordinary_prompt`/`multiline_prompt`, catalog schema, and CR/LF values were created only through test-owned Pinia mutation and arbitrary GraphQLJSON/V2 injection; no current or released producer is identified |
| API-E2E-F-003 | Previously treated as a blocking current-product failure | Out Of Scope / Non-Blocking | API-REV-010, CRR-021 | Real browser mechanics were observed only after synthetic initiation; real current-user paths pass at 98% |
| AR-001 | N/A | Open — blocking Design Impact | `SR-014`, `ARCH-REV-006`; BEH-010, R-044, AC-038 | Mandatory removal table omits all IR-012 cleanup/fixture-retargeting items, while the final hard block still requires exact treatment for any explicit persisted key/value and conflicts with the producer-bounded contract |

- New or remaining finding IDs: `AR-001`
- Material classification changes: `MP-CR-010` is authoritatively `Not Reachable` and cannot drive product machinery or blocking coverage. `MP-CR-009` remains `Reachable`, now grounded in actual `reasoning_effort`/`service_tier` producer paths rather than invented fixture names. ARCH-REV-005's broad residual wording about actual-control losslessness is superseded by SR-014 for unsupported free-text/CR-LF states; its capability-separation result remains valid.
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: Product intent is not ambiguous. The solution designer should add the four SR-014 removal/retargeting rows and qualify the unbounded hard block, then return for re-review. Current source remains at IR-012; implementation, API/E2E, and delivery must not proceed from this failed architecture result.

### ARCH-REV-007 — Approve Producer-Bounded Clean Removal

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/design-review-report.md`
- Review round and trigger: Round 7; SR-015 corrects the two canonical design contradictions recorded as ARCH-REV-006 / AR-001 without changing requirements, UI/UX, runtime behavior, or premise classifications.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/solution-revision-record.md`; `SR-015`; `AR-001`
- Relevant solution revision IDs: `SR-015` current; `SR-014` producer-bounded cleanup basis; `SR-013` capability/classifier basis; `SR-012` shared locked-form basis
- Prior authoritative decision: `Fail — Design Impact` at `ARCH-REV-006`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: The mandatory Removal / Decommission Plan now contains explicit rows for the CR/LF predicate/branch, multiline-only styling, synthetic ordinary/LF/CR fixtures, and invented retained fixture names. The hard block and relevant dependency/interface/file/sequence/guidance statements now consistently protect only values accepted through a named supported current or released catalog and normal launch path, explicitly exclude arbitrary injection/future fields from blocking acceptance, and keep `projectHistoricalModelConfigFields` generic and provenance-free.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open — blocking Design Impact in ARCH-REV-006 | Resolved | `SR-015`, `ARCH-REV-007`; BEH-010, R-044, AC-038 | Design-spec removal rows 246–249 enumerate all cleanup/retargeting work; boundary/dependency/interface/file guidance consistently uses producer-backed scope; the final hard block expressly excludes arbitrary GraphQLJSON, page-local catalog mutation, and hypothetical future/custom fields; no provenance machinery is introduced |
| CR-011 | Resolved and implemented by IR-011 | Remains resolved and unaffected | `SR-013`, `ARCH-REV-005`, IR-011 | SR-015 changes no editable/stored capability owner |
| CR-012 / MP-CR-009 | Resolved for supported product-originated history | Remains resolved; MP-CR-009 remains Reachable | `SR-013`–`SR-015`, `ARCH-REV-005`–`ARCH-REV-007` | Named `model/list` -> `reasoning_effort` / optional `service_tier=fast` -> user selection -> V2 -> later Settings path is retained in examples, sequence, and tests |
| CR-013 / MP-CR-010; API-E2E-F-003 | Rescinded / Not Reachable / Out Of Scope | Remains rescinded and non-blocking | CRR-021, API-REV-010, `SR-014`, `SR-015` | No free-text producer is identified; design removes the premise-driven IR-012 delta and forbids a synthetic CR rerun |

- New or remaining finding IDs: None
- Material classification changes: None from ARCH-REV-006. MP-CR-009 remains `Reachable`; MP-CR-010 remains `Not Reachable`. SR-015 now ensures those classifications govern every mandatory instruction consistently.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: Current source remains at committed IR-012. Implementation must perform only the enumerated clean removal/fixture retargeting, preserve IR-011's distinct capabilities and generic classifier, run focused/build checks, update implementation artifacts, and return through complete source review. API/E2E and delivery must not be entered directly.
