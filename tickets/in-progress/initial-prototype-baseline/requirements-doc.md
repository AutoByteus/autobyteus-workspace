# Initial Prototype Baseline — Requirements Document

## Document Status

- Status: `Approved`
- Current requirements revision ID: `RER-008`
- Request / ticket: Initial prototype baseline
- Requirements owner: Requirements Engineering
- Date: 2026-08-24
- Approval state and reference: Approved. The observable UI/UX baseline remains approved under PPA-001 and the user’s 2026-08-22 **“approved”** message. The user explicitly approved repository-root placement and direct `personal` commit/push on 2026-08-24. RER-008 verifies the non-observable correction at prototype commit `dabc306abbb5c31b7643038c23996fb6c78898b3`, with local and remote `personal` synchronized, approved hashes preserved, and no renewed UI review required.

## Problem And Desired Outcome

- Problem: At intake, `autobyteus-web` did not have an accepted, canonical, complete current-state prototype baseline at the latest source revision.
- Affected actors or systems: Product reviewers, requirements engineering, product prototyping, and the selected source frontend application.
- Desired outcome: Establish a reusable, runnable prototype that reproduces the complete observable current UI/UX and client behavior of one explicitly selected frontend revision before any future-state requirement changes are introduced.
- Observable definition of success: Every inventoried route, surface, visible state, client-side interaction, supported journey, role, feature configuration, and validated viewport within the selected application boundary has passing source-versus-prototype evidence and no known observable discrepancy.
- Repository definition of success: The complete approved prototype is tracked as ordinary files at repository-relative root path `autobyteus-web-prototype` in `autobyteus-workspace` on branch `personal`, with no nested or standalone Git repository and with all active canonical references rewritten to `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype` before a direct commit and push to `origin/personal`.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | The repository exposes multiple possible client boundaries. The user selected `autobyteus-web` and required the latest source baseline. | `autobyteus-web` at the latest verified `origin/personal` revision at bootstrap kickoff is pinned as the reproducible parity boundary. | Android, iOS, packaged application authoring surfaces, and later source commits remain unchanged and outside this baseline snapshot unless explicitly refreshed. | `investigation-notes.md` source log entries SRC-001 through SRC-006 |
| BEH-002 | User | Existing discovered prototype directories are feature- or surface-specific; the shallow inventory did not identify a canonical complete current-state runnable baseline for a selected frontend. | A canonical runnable baseline reproduces the selected frontend's complete observable current experience. | Current source appearance, navigation, interactions, visible states, responsive behavior, and accessibility intent are preserved rather than redesigned. | `investigation-notes.md`, SRC-003 and the shared prototype contract |
| BEH-003 | System | The production frontend depends on service, authentication, persistence, and integration boundaries that are not appropriate for an isolated review prototype. | Production boundaries are replaced with explicit deterministic mocks while user-visible interface states and transitions remain real and parity-valid. | The prototype never writes to production services or requires production credentials or data. | Shared prototype contract, sections 5 and 7 |
| BEH-004 | Operational | The approved project is ordinary tracked content at repository-root `autobyteus-web-prototype` in `autobyteus-workspace` on synchronized `personal`; `ui-prototypes` retains five unrelated sibling projects. | Keep this complete separate project at repository-root `autobyteus-web-prototype` with no nested Git metadata or gitlink and with direct owning-repository provenance. | Approved observable UI/UX, evidence files and hashes, PPA-001, source pin, deterministic isolation, and the five unrelated `ui-prototypes/*` projects remain unchanged. | `investigation-notes.md`, SRC-016–SRC-017; RER-007 proof and RER-008 verification |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User / product reviewer | Review a concrete current-state baseline | Can run and inspect the selected frontend's complete inventoried experience | Approval applies only to the pinned current-state baseline |
| Product prototyper | Accept and use a trustworthy baseline | Receives complete parity evidence from the bootstrapper | No future-state changes may precede baseline acceptance |
| Prototype bootstrapper | Reproduce and validate current UI/UX | Delivers a runnable baseline and parity report with zero known discrepancies | Must follow the source stack and deterministic mock boundary |
| Any later separately authorized downstream engineering | Use approved experience evidence without mistaking it for target architecture | Can distinguish current-state parity from future-state requirements | No architecture or production engineering is authorized by this ticket |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001: Explicitly select one source frontend application and revision as the baseline boundary.
- UC-002: Inventory and reproduce all supported and discoverable observable client behavior within that boundary.
- UC-003: Run the baseline without production credentials, customer data, or production writes.
- UC-004: Validate every inventory item through controlled source-versus-prototype evidence.
- UC-005: Relocate the complete approved prototype into the existing owning repository without changing approved observable behavior or losing evidence.
- UC-006: Rewrite absolute prototype artifact references, rerun validation, and commit the project as ordinary files through the owning workspace repository.
- UC-007: Move the accepted project from `autobyteus-web-prototype` to repository-root `autobyteus-web-prototype`, validate it, and commit/push directly on `personal` as explicitly authorized.

### Out Of Scope

- Android, iOS, and application-package authoring surfaces as independent client baselines. Embedded application surfaces that are observable through supported `autobyteus-web` configurations remain part of the web inventory.
- New or redesigned future-state behavior.
- Production implementation, architecture, deployment, or migration.
- Any downstream software-engineering or architecture-design ticket; this request is fulfilled by an accepted product prototype baseline.
- Proof that mocked integrations are production-ready.
- Silent reconciliation to a source revision newer than the approved baseline revision.
- Creating another repository, branch, submodule, or gitlink for the prototype outside the existing `autobyteus-workspace` repository.
- Changing the approved UI/UX during repository-placement correction.
- Deleting, relocating, or modifying the five unrelated projects that remain under `ui-prototypes/`; removing that shared directory is not part of this correction.

### Non-Goals

- Reproducing production internals, component structure, or code volume.
- Using screenshots or click hotspots as substitutes for runnable interface structure.
- Improving existing source behavior as part of parity bootstrap.

### Preserved Behavior Boundary

- Preserve the observable outcomes in BEH-002 and the production-isolation invariant in BEH-003.
- Baseline creation must not modify the selected production frontend or any unselected client application.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. Requirements Engineering must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The selected application shall be `autobyteus-web`. At bootstrap kickoff, the prototype team shall fetch the default remote branch `origin/personal`, record its then-latest exact commit, and pin that commit as the reproducible baseline snapshot together with source/run paths and supported roles/configurations. | BEH-001 | Blocking | “Latest” must be verified at kickoff and converted into an exact source snapshot so parity evidence remains reproducible. | User decision recorded in RER-002; shared prototype contract §§2, 4, 7 |
| REQ-002 | The baseline shall inventory and reproduce 100% of supported and discoverable routes, meaningful surfaces, visible states, client-side interactions, user journeys, roles, feature configurations, and validated viewports within the selected boundary. | BEH-002 | Critical | An initial existing-frontend bootstrap is a complete current-state baseline, not a focused mockup. | Shared prototype contract §§4, 6 |
| REQ-003 | The baseline shall use the selected frontend's framework, language, package manager, build tooling, routing approach, and relevant design-system conventions unless a deliberate, evidence-backed deviation is recorded. | BEH-002 | High | Technology parity keeps the baseline maintainable and representative. | Shared prototype contract §3 |
| REQ-004 | Service, persistence, authentication, and external-integration boundaries shall be explicit, deterministic mocks using synthetic fixtures; all inventoried user-visible states, transitions, validation, feedback, and recovery behavior shall remain runnable. | BEH-003 | Critical | The baseline must be safe and repeatable without reducing observable parity. | Shared prototype contract §5 |
| REQ-005 | Completion shall require controlled source-versus-prototype evidence for every inventory item and zero known UI/UX, client-behavior, visible-state, or journey discrepancy. | BEH-002 | Critical | Unsubstantiated or discrepant items block a trustworthy baseline. | Shared prototype contract §6 |
| REQ-006 | The baseline shall live in a stable, isolated prototype workspace, record its source revision and run command, and shall not write to production services or depend on production credentials or production/customer data. | BEH-003 | Critical | The review instrument must be durable and safe. | Shared prototype contract §§5, 7 |
| REQ-007 | Requirements-driven future-state changes shall not be added until the product prototyper accepts the completed current-state parity baseline. | BEH-002 | Blocking | This preserves a trustworthy point of comparison. | Shared prototype contract §§2, 4, 8 |
| REQ-008 | The canonical tracked prototype location shall be repository-root path `autobyteus-web-prototype` in the existing `autobyteus-workspace` repository, with active absolute root `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype`. The correction shall be performed directly on `personal`, then committed and pushed to `origin/personal`, without creating a new ticket, branch, repository, submodule, or gitlink. | BEH-004 | Blocking | The user explicitly classifies the baseline as a separate project and authorized direct correction on `personal`. | User decision; RER-007; SRC-016 |
| REQ-009 | The move shall preserve every tracked prototype file, approved evidence file/hash, source pin, PPA-001, explicit approval reference, and observable behavior; rewrite active path/provenance references to the repository-root destination; rerun repository-placement, final-package, boundary, build, and browser-reference validations applicable to the move; commit only the move and required reference updates; and push only after confirming `personal` is current with `origin/personal`. The five unrelated projects remaining under `ui-prototypes/` shall not be removed or modified. | BEH-004 | Critical | A simple directory move must not invalidate the accepted review instrument or destructively expand scope. | User decision; RER-007; existing parity/placement evidence |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | `autobyteus-web` bootstrap begins | The team fetches `origin/personal`, records the newest commit then available, and records `autobyteus-web` source/run paths, roles, configurations, and canonical prototype root. The current handoff-time verification is commit `8ef282ba77705180d985e7000d801f0e0068cdc1`. | A moving branch name without an exact pinned commit, or use of a stale known commit without a kickoff fetch, fails acceptance. | Inspect fetch evidence, commit, packet, and paths. |
| AC-002 | REQ-002 | Source application inventory is complete | Every inventory row covers a route/surface/state/interaction/journey/role/configuration/viewport and maps to runnable source and prototype evidence. | Any missing or unsubstantiated row blocks completed status. | Audit inventory-to-evidence traceability. |
| AC-003 | REQ-003 | Prototype dependencies and scripts are available | Recorded technology matches the selected source stack, or each deviation has an explicit rationale and parity evidence. | An undocumented stack substitution fails acceptance. | Compare manifests, tooling, routes, and conventions. |
| AC-004 | REQ-004, REQ-006 | Prototype is run in its documented review configuration | A reviewer can exercise real client states and transitions against deterministic synthetic mocks without production credentials, writes, or personal/customer data. | Any production dependency, nondeterministic boundary, or screenshot/hotspot substitute blocks acceptance. | Repeat clean runs and inspect adapter/fixture boundaries. |
| AC-005 | REQ-002, REQ-005 | Source and prototype are run under controlled role/configuration/viewport conditions | Appearance and client behavior match for every inventory item, including hierarchy, content, navigation, responsive behavior, focus, keyboard behavior, feedback, motion, and accessibility intent. | Any known perceived or behavioral discrepancy blocks completion. | Review automated/manual comparison report and linked evidence. |
| AC-006 | REQ-005, REQ-007 | Bootstrapper reports completion | Product prototyper can inspect the runnable baseline and parity package and explicitly accept or return a precise parity gap. | Future-state work remains blocked until acceptance. | Record the prototyper acceptance or gap reference. |
| AC-007 | REQ-008 | Relocation begins from a clean, current `personal` checkout | `git -C /home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype rev-parse --show-toplevel` resolves to `/home/autobyteus/workspace/autobyteus-workspace`, the owning branch is `personal`, and the destination is ordinary tracked content with no nested `.git`, submodule, or gitlink. | A standalone top level, new branch/repository, nested Git metadata, submodule, or gitlink fails acceptance. | Inspect owning Git top level, branch, index mode, remote synchronization, and worktree status. |
| AC-008 | REQ-009 | Files have been moved and references rewritten | The repository-root destination contains the complete approved project; the prior nested project path no longer exists; no active canonical package file references the prior nested or task-worktree root; source pin, PPA-001, approval reference, final screenshot files/hashes, and approved observable behavior remain intact; the five other `ui-prototypes/*` projects are unchanged. | Missing evidence, changed approved hashes without an approved reason, stale active roots, unrelated prototype deletion/modification, or observable UI change fails acceptance. | Compare tracked inventories and hashes; search active artifacts for stale roots; inspect unrelated paths; rerun controlled validation. |
| AC-009 | REQ-008, REQ-009 | Correction validation passes | One direct `personal` commit records the move and required active-reference updates; applicable placement and final-package checks, production build, and browser-reference verification pass from the repository-root project; the commit is pushed and local `personal` equals `origin/personal` with a clean status. | Uncommitted/unpushed relocation, remote divergence, failed validation, or unrelated file changes fails completion. | Inspect commit diff, local/remote commit identities, clean status, validation logs, and corrected runbook. |

**Acceptance outcome:** AC-001 through AC-009 are met. RER-007 placement validation passes 40/40, final-package validation passes 73/73, 808/808 approved evidence/reference image hashes and 15/15 normative final-reference hashes are preserved, all five unrelated `ui-prototypes/*` Git trees are unchanged, and local `personal` equals `origin/personal` at prototype commit `dabc306abbb5c31b7643038c23996fb6c78898b3` with clean status.

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Starting Condition | Steps Or Event Sequence | Expected Outcome | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Requirements Engineering / prototype team | `autobyteus-web` is selected | Fetch `origin/personal`; pin its newest commit at kickoff; record paths, roles/configurations, and `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype` | Bootstrap scope is current, reproducible, and unambiguous | REQ-001; AC-001 |
| SCN-002 | User | Prototype reviewer | Completed parity inventory and isolated prototype are available | Reviewer starts prototype and exercises inventoried journeys and alternate states | All observable results match the controlled source baseline | REQ-002–REQ-006; AC-002–AC-005 |
| SCN-003 | Operational | Product prototyper | Bootstrapper returns baseline evidence | Prototyper reviews inventory, evidence, run instructions, and known gaps | Prototyper accepts only a complete, discrepancy-free baseline | REQ-005, REQ-007; AC-006 |
| SCN-004 | Operational | Product Prototyper / owning workspace repository | Approved prototype exists at its pre-RER-007 nested path on a clean, current `personal` checkout | Move that directory to repository-root `autobyteus-web-prototype`; rewrite active paths; validate package, parity evidence, build, browser references, and unrelated-directory preservation; commit and push directly on `personal` | The separate prototype project is at repository root with unchanged approved UI/UX and evidence; the five unrelated `ui-prototypes/*` projects remain intact | REQ-008, REQ-009; AC-007–AC-009 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX or interaction supplement: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/ui-ux-spec.md` — approval remains PPA-001.
- Linked runnable prototype and applicable support artifacts: Canonical root `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype`; production-build review URL `http://127.0.0.1:3200`; the runbook uses this root.
- UI/UX user-confirmation reference: User message **“approved”** on 2026-08-22, immediately following the Product Prototyper request to review the complete corrected current-state baseline at the canonical review URL.
- Approved visual-reference baseline: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/final-reference-screenshots/` (`VIS-001`–`VIS-015`, 15/15 clean captures), preserved unchanged by the root move.
- Requirements-defining visual or interaction details: The approved `ui-ux-spec.md`, its final visual references, and all matched inventory rows define the complete observable current-state baseline at source commit `8ef282ba77705180d985e7000d801f0e0068cdc1`.
- Illustrative details left to downstream design and implementation: Synthetic fixture values/content and prototype internals are illustrative or non-authoritative exactly where `ui-ux-spec.md` says so. No downstream design or implementation is authorized by this ticket.
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: `ROUTE-001`–`ROUTE-041`, `CFG-001`–`CFG-011`, `STATE-001`–`STATE-013`, `HOST-001`–`HOST-008`, `WKS-001`–`WKS-021`, `MOB-001`–`MOB-014`, 239 locale/responsive matrix rows, `JRN-001`–`JRN-049`, and `DISC-001`–`DISC-017`, as defined by the approved prototype package.
- Explicitly unresolved product decisions: None.

## Quality And Non-Functional Requirements

| Quality ID | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- |
| QR-001 | Accessibility | Keyboard, focus, semantic, and other accessibility intent observable in the source shall match for every inventoried item. | Selected frontend boundary and validated viewports | Controlled manual/automated parity evidence |
| QR-002 | Reliability | Given the same fixture, role, configuration, and action sequence, the prototype shall produce the same visible result on repeated clean runs. | All mocked journeys and states | Repeat comparison scenarios |
| QR-003 | Security / Privacy | Prototype execution shall require no production credential and access no production or customer data or service. | Build, run, and review flows | Configuration and network-boundary inspection |
| QR-004 | Operability | The canonical prototype shall be ordinary versioned content at the owning repository root and reproducible from `personal` without standalone or nested Git metadata. | RER-007 repository placement correction | Git top-level, index-mode, commit/push, clean-status, path-reference, unrelated-directory preservation, and validation checks |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` for production data; local synthetic prototype state may be reset.
- Data or state that must be preserved: All approved prototype source, fixtures, UI/UX specification, parity/comparison evidence, validation logs, final screenshots, manifests/hashes, PPA-001, approval reference, and runbook content during relocation.
- Loss, reset, rebuild, or regeneration that is acceptable: Transient build output and browser-local synthetic runtime state may be reset/regenerated. No approved artifact or evidence loss is acceptable.
- Retention, privacy, compliance, volume, downtime, or operational constraints: No credentials, personal data, customer data, or production exports.
- Unknowns requiring downstream investigation: None for prototype completion. Production data and integration behavior remain intentionally unproven and out of scope.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Shared Product Prototype Principles | Existing-frontend bootstrap must meet complete observable parity, source technology, deterministic mocks, isolation, and evidence rules. | `/home/autobyteus/workspace/autobyteus-agents/agent-teams/requirements-engineering-team/shared/product-prototype-principles.md` | No unresolved prototype-contract risk. |
| `autobyteus-web` | Its observable current behavior governs baseline parity. | Kickoff-fetched and pinned source commit `8ef282ba77705180d985e7000d801f0e0068cdc1`; accepted inventory and comparison evidence under PPA-001. | Later source revisions require explicit refresh/reconciliation and do not silently amend this baseline. |
| Owning branch | The user explicitly authorized this placement-only correction directly on `personal`; the checkout had to be clean and current with `origin/personal` before the move and push. | Pre-commit local/remote revision was `c5b87df4d6db15969ba70adee9dfd8394b1e7385`; direct push advanced both to prototype commit `dabc306abbb5c31b7643038c23996fb6c78898b3`; final status was clean and 0 ahead/0 behind. | Branch synchronization did not refresh the approved prototype source pin. |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/autobyteus-workspace/tickets/in-progress/initial-prototype-baseline/investigation-notes.md` | Evidence base and decision record | All | Current through RER-008 | Included in approved requirements basis |
| `/home/autobyteus/workspace/autobyteus-workspace/tickets/in-progress/initial-prototype-baseline/requirements-revision-record.md` | Chronological requirements-round index | All | Current through RER-008 | Informational traceability artifact |
| `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/ui-ux-spec.md` | Canonical approved UI/UX supplement and requirements-defining/illustrative boundary | All | Approved / PPA-001 | User-approved |
| `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/final-reference-screenshots/README.md` | Final visual inventory and mapping | REQ-002, REQ-005; AC-002, AC-005 | Final | User-approved baseline references |
| `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/final-reference-screenshots/manifest.json` | Final visual hashes, routes, contexts, and clean-capture results | REQ-002, REQ-005, REQ-006; AC-002, AC-004, AC-005 | Final / 15 of 15 preserved | User-approved baseline evidence |
| `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/product-prototyper-baseline-review.md` | Product Prototyper inspection history, PPA-001, and final decision | REQ-005, REQ-007; AC-005, AC-006 | Final | Approval and acceptance evidence |
| `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/parity-inventory.md` | Complete stable parity inventory and evidence mapping | REQ-002, REQ-005; AC-002, AC-005 | Accepted / no missing or discrepant IDs | Approved baseline evidence |
| `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/prototype-bootstrap-report.md` | Bootstrap scope, source pin, completion evidence, and known source-harness findings | REQ-001–REQ-007 | Complete | Supporting evidence |
| `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/comparison-report.md` | Controlled source-versus-prototype rendered and interaction results | REQ-002, REQ-005; AC-002, AC-005 | Pass | Approved baseline evidence |
| `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/evidence-index.md` | Evidence navigation and artifact roles | REQ-002, REQ-005 | Final | Supporting evidence |
| `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/mock-boundaries.md` | Deterministic mock, network, data, and production-isolation contract | REQ-004, REQ-006; AC-004 | Final / 13 of 13 checks | Approved boundary evidence |
| `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/prototype-runbook.md` | Reproducible install, run, scenario, reset, and validation instructions | REQ-003, REQ-006; AC-003, AC-004 | Final | Operational supplement |
| `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/prototype-scenarios.md` | Deterministic scenario and context catalog | REQ-002, REQ-004; AC-002, AC-004, AC-005 | Final | Approved baseline evidence |
| `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype/repository-placement-correction.md` | Repository relocation, path rewrite, hash preservation, and validation summary | REQ-008, REQ-009; AC-007–AC-009 | Complete | Requirements-correction evidence |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The latest `origin/personal` revision remains the governing source branch at bootstrap kickoff. | A branch authority is needed to interpret “latest.” | Prototype team fetched and pinned `8ef282ba77705180d985e7000d801f0e0068cdc1`. | Validated |
| ASM-002 | The user’s request to base the current project on the latest original branch concerns Git ancestry synchronization; it does not silently replace the explicitly approved prototype source snapshot. | The latest branch now contains observable frontend changes, so treating a rebase as UI parity refresh would invalidate the approved evidence boundary. | Task branch rebased to `3ab4946c...`; ask separately whether a full prototype refresh/reconciliation is desired. | Git sync validated; UI refresh not assumed |
| ASM-003 | Moving the accepted project to repository root is a non-observable placement change; the five unrelated projects under `ui-prototypes/` remain outside scope. | The user asked Requirements Engineering to decide whether to remove the shared directory, but it contains unrelated tracked projects whose deletion is not needed for the requested outcome. | Product Prototyper verifies unchanged Git trees for those five siblings and obtains renewed review only if observable behavior changes. | Active / approved scope decision |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Which source frontend application should the initial prototype baseline reproduce? | It determines the inventory, source technology, roles/configurations, prototype name/root, and parity evidence boundary. | `autobyteus-web`. | User | Decided in RER-002 |
| DEC-002 | Does completion of this prototype-only ticket authorize downstream software architecture or production engineering? | It governs terminal scope and prevents an unnecessary architecture handoff. | No. The accepted prototype baseline fulfills this ticket; production implementation would require a separate user request. | User | Decided in RER-002 |
| DEC-003 | Where and through which Git history shall the prototype be tracked? | The project is a standalone prototype project within the owning monorepo, while `ui-prototypes/` is a shared collection containing unrelated feature prototypes. | Repository-root `autobyteus-web-prototype`, absolute path `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype`, committed and pushed directly on `personal`; retain the five unrelated `ui-prototypes/*` sibling projects and therefore retain the shared directory. | User selected root placement and direct `personal` workflow; Requirements Engineering excluded unrelated deletion | Revised and decided in RER-007 |

## Traceability

| Requirement ID | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- |
| REQ-001 | BEH-001 | AC-001 | SCN-001 | Bootstrap report; source pin in approved UI/UX spec |
| REQ-002 | BEH-002 | AC-002, AC-005 | SCN-002 | Parity inventory; scenario catalog; final references |
| REQ-003 | BEH-002 | AC-003 | SCN-002 | Prototype manifest/runbook; 369/369 retained presentation audit |
| REQ-004 | BEH-003 | AC-004 | SCN-002 | Mock-boundaries record; scenario catalog; 13/13 isolation checks |
| REQ-005 | BEH-002 | AC-002, AC-005, AC-006 | SCN-002, SCN-003 | Comparison report; PPA-001; 73/73 final-package validation |
| REQ-006 | BEH-003 | AC-004 | SCN-002 | Canonical prototype commit; runbook; manifest; mock-boundaries record |
| REQ-007 | BEH-002 | AC-006 | SCN-003 | PPA-001; approved UI/UX spec; explicit user confirmation |
| REQ-008 | BEH-004 | AC-007, AC-009 | SCN-004 | Prototype commit `dabc306ab...`; RER-007 Git ownership/index/remote proof; 40/40 placement validation |
| REQ-009 | BEH-004 | AC-008, AC-009 | SCN-004 | RER-007 proof; zero stale active roots; 808/808 image hashes and 15/15 final references preserved; five unrelated trees unchanged; build/browser/final-package checks pass |

## Downstream Architecture Input

- Product and system constraints architecture must preserve: N/A for this ticket; downstream architecture is out of scope. If production implementation is requested separately, this baseline remains current-state evidence and is not target architecture.
- Decisions intentionally deferred to architecture design: None; architecture design is not requested.
- Technical facts architecture should verify: N/A for this ticket.
- Known feasibility or integration risks: None requiring architecture for this prototype-only ticket. Two unchanged pinned-source unit-harness failures are recorded in the bootstrap report; their observable obligations pass exact browser journeys JRN-047 and JRN-049.

## Readiness Check

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered: `Yes`
- Prototype and supplemental evidence is integrated consistently: `Yes`
- Applicable UI/UX approval and final visual-reference basis are recorded: `Yes`
- Material assumptions and open decisions are visible: `Yes`
- User approval received: `Yes`
- Architecture-ready: `N/A` — this ticket is explicitly prototype-only and authorizes no architecture or production engineering.
- Remaining blocker: None. AC-007 through AC-009 are satisfied by the validated repository-root move and direct push; no observable behavior changed.

## Completion Classification

- Outcome: `Approved Prototype-Only Complete`
- Approved observable baseline: Unchanged under PPA-001 and explicit user approval.
- Terminal deliverable: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype`, tracked as ordinary files on `personal` and pushed to `origin/personal` at prototype commit `dabc306abbb5c31b7643038c23996fb6c78898b3`.
- Repository-root proof: 1,940 tracked project entries; no nested `.git`, submodule, or gitlink; prior nested project path absent; 40/40 placement checks and 73/73 final-package checks pass; local and remote `personal` were clean and equal after push.
- Approved prototype source snapshot: Remains `8ef282ba77705180d985e7000d801f0e0068cdc1`. Refreshing observable parity to a newer source revision is a separate explicit prototype reconciliation, not an effect of Git rebase.
- Architecture handoff applicability: `No`; DEC-002 explicitly excludes architecture and production engineering from this ticket.
