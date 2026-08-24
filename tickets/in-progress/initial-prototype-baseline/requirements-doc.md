# Initial Prototype Baseline — Requirements Document

## Document Status

- Status: `Draft`
- Current requirements revision ID: `RER-004`
- Request / ticket: Initial prototype baseline
- Requirements owner: Requirements Engineering
- Date: 2026-08-24
- Approval state and reference: The observable UI/UX baseline remains approved under PPA-001 and the user’s 2026-08-22 **“approved”** message. Terminal package completion from RER-003 is reopened because the user rejected the standalone prototype repository and required ownership by the existing workspace repository. Repository-placement correction is defined in RER-004 and remains pending.

## Problem And Desired Outcome

- Problem: At intake, `autobyteus-web` did not have an accepted, canonical, complete current-state prototype baseline at the latest source revision.
- Affected actors or systems: Product reviewers, requirements engineering, product prototyping, and the selected source frontend application.
- Desired outcome: Establish a reusable, runnable prototype that reproduces the complete observable current UI/UX and client behavior of one explicitly selected frontend revision before any future-state requirement changes are introduced.
- Observable definition of success: Every inventoried route, surface, visible state, client-side interaction, supported journey, role, feature configuration, and validated viewport within the selected application boundary has passing source-versus-prototype evidence and no known observable discrepancy.
- Repository definition of success: The complete approved prototype is tracked as ordinary files at repository-relative path `ui-prototypes/autobyteus-web-prototype` on the existing ticket worktree/branch for `autobyteus-workspace`, with no nested or standalone Git repository and with all canonical absolute references rewritten to the corrected worktree path.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | The repository exposes multiple possible client boundaries. The user selected `autobyteus-web` and required the latest source baseline. | `autobyteus-web` at the latest verified `origin/personal` revision at bootstrap kickoff is pinned as the reproducible parity boundary. | Android, iOS, packaged application authoring surfaces, and later source commits remain unchanged and outside this baseline snapshot unless explicitly refreshed. | `investigation-notes.md` source log entries SRC-001 through SRC-006 |
| BEH-002 | User | Existing discovered prototype directories are feature- or surface-specific; the shallow inventory did not identify a canonical complete current-state runnable baseline for a selected frontend. | A canonical runnable baseline reproduces the selected frontend's complete observable current experience. | Current source appearance, navigation, interactions, visible states, responsive behavior, and accessibility intent are preserved rather than redesigned. | `investigation-notes.md`, SRC-003 and the shared prototype contract |
| BEH-003 | System | The production frontend depends on service, authentication, persistence, and integration boundaries that are not appropriate for an isolated review prototype. | Production boundaries are replaced with explicit deterministic mocks while user-visible interface states and transitions remain real and parity-valid. | The prototype never writes to production services or requires production credentials or data. | Shared prototype contract, sections 5 and 7 |
| BEH-004 | Operational | The finalized prototype currently sits outside the owning repository at `/home/autobyteus/workspace/autobyteus-web-prototype` and contains an unintended standalone `.git` repository on branch `main` at local commit `7ab23b60aa6fd85ff7ce62720a2fbc5ea41e01a6`. | The same approved project is tracked by the existing `autobyteus-workspace` repository at repository-relative path `ui-prototypes/autobyteus-web-prototype`, using ticket branch `codex/initial-prototype-baseline`, with no nested Git metadata or gitlink. | Approved observable UI/UX, evidence files, hashes, PPA-001, source pin, deterministic isolation, and prototype-only scope remain unchanged except for required absolute-path/provenance updates. | `investigation-notes.md`, SRC-011–SRC-012; user placement correction recorded in RER-004 |

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
- UC-006: Rewrite absolute prototype artifact references, rerun validation, and commit the project as ordinary workspace files on the dedicated ticket branch.

### Out Of Scope

- Android, iOS, and application-package authoring surfaces as independent client baselines. Embedded application surfaces that are observable through supported `autobyteus-web` configurations remain part of the web inventory.
- New or redesigned future-state behavior.
- Production implementation, architecture, deployment, or migration.
- Any downstream software-engineering or architecture-design ticket; this request is fulfilled by an accepted product prototype baseline.
- Proof that mocked integrations are production-ready.
- Silent reconciliation to a source revision newer than the approved baseline revision.
- Creating another repository, branch, submodule, or gitlink for the prototype outside the existing `autobyteus-workspace` repository.
- Changing the approved UI/UX during repository-placement correction.

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
| REQ-008 | The canonical tracked prototype location shall be repository-relative path `ui-prototypes/autobyteus-web-prototype` in the existing `autobyteus-workspace` repository. For this package, correction shall occur at absolute path `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype` on existing branch `codex/initial-prototype-baseline`; the current shared `personal` checkout shall not be modified directly. | BEH-004 | Blocking | The user explicitly rejected an unrelated standalone prototype repository and required existing-workspace ownership while task isolation remains mandatory. | User correction; RER-004; repository/worktree evidence SRC-011–SRC-012 |
| REQ-009 | Before the corrected prototype is staged, the unintended standalone `.git` metadata shall be removed from the relocated copy so the destination is ordinary tracked content, not a nested repository, submodule, or gitlink. All prototype files and approved evidence shall be preserved; absolute references shall use the corrected destination; final-package and observable parity validations shall be rerun; and the result shall be committed through the owning repository on `codex/initial-prototype-baseline`. | BEH-004 | Critical | Repository provenance must be corrected without weakening or silently changing the approved prototype baseline. | User correction; RER-004 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | `autobyteus-web` bootstrap begins | The team fetches `origin/personal`, records the newest commit then available, and records `autobyteus-web` source/run paths, roles, configurations, and canonical prototype root. The current handoff-time verification is commit `8ef282ba77705180d985e7000d801f0e0068cdc1`. | A moving branch name without an exact pinned commit, or use of a stale known commit without a kickoff fetch, fails acceptance. | Inspect fetch evidence, commit, packet, and paths. |
| AC-002 | REQ-002 | Source application inventory is complete | Every inventory row covers a route/surface/state/interaction/journey/role/configuration/viewport and maps to runnable source and prototype evidence. | Any missing or unsubstantiated row blocks completed status. | Audit inventory-to-evidence traceability. |
| AC-003 | REQ-003 | Prototype dependencies and scripts are available | Recorded technology matches the selected source stack, or each deviation has an explicit rationale and parity evidence. | An undocumented stack substitution fails acceptance. | Compare manifests, tooling, routes, and conventions. |
| AC-004 | REQ-004, REQ-006 | Prototype is run in its documented review configuration | A reviewer can exercise real client states and transitions against deterministic synthetic mocks without production credentials, writes, or personal/customer data. | Any production dependency, nondeterministic boundary, or screenshot/hotspot substitute blocks acceptance. | Repeat clean runs and inspect adapter/fixture boundaries. |
| AC-005 | REQ-002, REQ-005 | Source and prototype are run under controlled role/configuration/viewport conditions | Appearance and client behavior match for every inventory item, including hierarchy, content, navigation, responsive behavior, focus, keyboard behavior, feedback, motion, and accessibility intent. | Any known perceived or behavioral discrepancy blocks completion. | Review automated/manual comparison report and linked evidence. |
| AC-006 | REQ-005, REQ-007 | Bootstrapper reports completion | Product prototyper can inspect the runnable baseline and parity package and explicitly accept or return a precise parity gap. | Future-state work remains blocked until acceptance. | Record the prototyper acceptance or gap reference. |
| AC-007 | REQ-008 | Relocation begins | `git -C /home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype rev-parse --show-toplevel` resolves to `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline`, and the owning branch is `codex/initial-prototype-baseline`. | A standalone top level, nested repository, submodule, gitlink, or direct commit to shared branch `personal` fails acceptance. | Inspect owning Git top level, branch, index mode, and worktree status. |
| AC-008 | REQ-009 | Files have been relocated and references rewritten | The corrected destination contains the complete approved project and no `.git` entry; no canonical package file references `/home/autobyteus/workspace/autobyteus-web-prototype` as its active root; source pin, PPA-001, approval reference, final screenshot files/hashes, and approved observable behavior remain intact. | Missing evidence, changed visual hashes without an approved reason, stale active absolute paths, or observable UI change fails acceptance. | Compare file/evidence inventory and hashes; search active artifacts for stale root; rerun controlled validation. |
| AC-009 | REQ-008, REQ-009 | Correction validation passes | The owning workspace branch contains one new commit tracking the prototype and updated requirements artifacts; prototype validation and final-package consistency pass from the corrected path; the original external prototype root and its standalone `.git` are no longer treated as canonical. | Uncommitted relocation, failed validation, or reliance on standalone commit `7ab23b60...` fails completion. | Inspect owning commit, clean status, validation logs, and corrected runbook. |

**Acceptance outcome:** AC-001 through AC-006 remain met for observable UI/UX and isolation. AC-007 through AC-009 are pending repository-placement correction. PPA-001 and the user’s UI approval remain valid because the correction must not change observable behavior.

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Starting Condition | Steps Or Event Sequence | Expected Outcome | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Requirements Engineering / prototype team | `autobyteus-web` is selected | Fetch `origin/personal`; pin its newest commit at kickoff; record paths, roles/configurations, and `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype` | Bootstrap scope is current, reproducible, and unambiguous | REQ-001; AC-001 |
| SCN-002 | User | Prototype reviewer | Completed parity inventory and isolated prototype are available | Reviewer starts prototype and exercises inventoried journeys and alternate states | All observable results match the controlled source baseline | REQ-002–REQ-006; AC-002–AC-005 |
| SCN-003 | Operational | Product prototyper | Bootstrapper returns baseline evidence | Prototyper reviews inventory, evidence, run instructions, and known gaps | Prototyper accepts only a complete, discrepancy-free baseline | REQ-005, REQ-007; AC-006 |
| SCN-004 | Operational | Product Prototyper / owning workspace repository | Approved prototype exists at the rejected external root | Copy/move all project content except standalone Git metadata into the ticket worktree destination; rewrite active absolute paths; validate parity/package integrity; stage as ordinary files; commit on `codex/initial-prototype-baseline` | Approved prototype is canonically tracked by `autobyteus-workspace` with no nested repository and no observable UI/UX change | REQ-008, REQ-009; AC-007–AC-009 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX or interaction supplement: Approved source copy currently at `/home/autobyteus/workspace/autobyteus-web-prototype/ui-ux-spec.md`; corrected canonical path shall be `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/ui-ux-spec.md` after relocation.
- Linked runnable prototype and applicable support artifacts: Current corrective source is `/home/autobyteus/workspace/autobyteus-web-prototype` at rejected standalone commit `7ab23b60aa6fd85ff7ce62720a2fbc5ea41e01a6`. Corrected canonical root shall be `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype`; owning-workspace commit is pending. The reviewed build remains observable at `http://127.0.0.1:3200` until correction restarts it from the new root.
- UI/UX user-confirmation reference: User message **“approved”** on 2026-08-22, immediately following the Product Prototyper request to review the complete corrected current-state baseline at the canonical review URL.
- Approved visual-reference baseline: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/final-reference-screenshots/README.md` and `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/final-reference-screenshots/manifest.json` (`VIS-001`–`VIS-015`, 15/15 clean captures).
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
| QR-004 | Operability | The canonical prototype shall be ordinary versioned content of the existing owning workspace repository and reproducible from its dedicated task branch without standalone or nested Git metadata. | Repository placement correction | Git top-level, index-mode, commit, clean-status, path-reference, and validation checks |

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

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/tickets/in-progress/initial-prototype-baseline/investigation-notes.md` | Evidence base and decision record | All | Current through RER-004 | Included in requirements basis |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/tickets/in-progress/initial-prototype-baseline/requirements-revision-record.md` | Chronological requirements-round index | All | Current through RER-004 | Informational traceability artifact |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/ui-ux-spec.md` | Canonical approved UI/UX supplement and requirements-defining/illustrative boundary | All | Pending relocation/path rewrite | User-approved |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/final-reference-screenshots/README.md` | Final visual inventory and mapping | REQ-002, REQ-005; AC-002, AC-005 | Pending relocation/path rewrite | User-approved baseline references |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/final-reference-screenshots/manifest.json` | Final visual hashes, routes, contexts, and clean-capture results | REQ-002, REQ-005, REQ-006; AC-002, AC-004, AC-005 | Pending relocation/path rewrite | User-approved baseline evidence |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/product-prototyper-baseline-review.md` | Product Prototyper inspection history, PPA-001, and final decision | REQ-005, REQ-007; AC-005, AC-006 | Pending relocation/path rewrite | Approval and acceptance evidence |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/parity-inventory.md` | Complete stable parity inventory and evidence mapping | REQ-002, REQ-005; AC-002, AC-005 | Pending relocation/path rewrite | Approved baseline evidence |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/prototype-bootstrap-report.md` | Bootstrap scope, source pin, completion evidence, and known source-harness findings | REQ-001–REQ-007 | Pending relocation/path rewrite | Supporting evidence |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/comparison-report.md` | Controlled source-versus-prototype rendered and interaction results | REQ-002, REQ-005; AC-002, AC-005 | Pending relocation/path rewrite | Approved baseline evidence |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/evidence-index.md` | Evidence navigation and artifact roles | REQ-002, REQ-005 | Pending relocation/path rewrite | Supporting evidence |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/mock-boundaries.md` | Deterministic mock, network, data, and production-isolation contract | REQ-004, REQ-006; AC-004 | Pending relocation/path rewrite | Approved boundary evidence |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/prototype-runbook.md` | Reproducible install, run, scenario, reset, and validation instructions | REQ-003, REQ-006; AC-003, AC-004 | Pending relocation/path rewrite | Operational supplement |
| `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype/prototype-scenarios.md` | Deterministic scenario and context catalog | REQ-002, REQ-004; AC-002, AC-004, AC-005 | Pending relocation/path rewrite | Approved baseline evidence |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The latest `origin/personal` revision remains the governing source branch at bootstrap kickoff. | A branch authority is needed to interpret “latest.” | Prototype team fetched and pinned `8ef282ba77705180d985e7000d801f0e0068cdc1`. | Validated |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Which source frontend application should the initial prototype baseline reproduce? | It determines the inventory, source technology, roles/configurations, prototype name/root, and parity evidence boundary. | `autobyteus-web`. | User | Decided in RER-002 |
| DEC-002 | Does completion of this prototype-only ticket authorize downstream software architecture or production engineering? | It governs terminal scope and prevents an unnecessary architecture handoff. | No. The accepted prototype baseline fulfills this ticket; production implementation would require a separate user request. | User | Decided in RER-002 |
| DEC-003 | Where and through which Git history shall the prototype be tracked? | The previous external root caused an unintended standalone repository rejected by the user. | Repository-relative `ui-prototypes/autobyteus-web-prototype`, currently at absolute ticket-worktree path `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype`, committed on existing branch `codex/initial-prototype-baseline` in the `autobyteus-workspace` repository. | User set owning repository; Requirements Engineering selected the already-isolated package worktree/branch | Decided in RER-004 |

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
| REQ-008 | BEH-004 | AC-007, AC-009 | SCN-004 | Owning-repository/worktree evidence; corrected Git commit pending |
| REQ-009 | BEH-004 | AC-008, AC-009 | SCN-004 | Current corrective source package; corrected path search and validation pending |

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
- Prototype and supplemental evidence is integrated consistently: `No` — approved evidence is valid, but canonical absolute paths and repository provenance await correction.
- Applicable UI/UX approval and final visual-reference basis are recorded: `Yes`
- Material assumptions and open decisions are visible: `Yes`
- User approval received: `Yes`
- Architecture-ready: `N/A` — this ticket is explicitly prototype-only and authorizes no architecture or production engineering.
- Remaining blocker: AC-007 through AC-009 — relocate without nested Git metadata, rewrite canonical paths, rerun validation, and commit through the owning repository ticket branch.

## Completion Classification

- Outcome: `Prototype Needed — Repository Placement Correction`
- Approved observable baseline: Unchanged under PPA-001 and explicit user approval.
- Corrected terminal deliverable: Pending at `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype` on owning branch `codex/initial-prototype-baseline`; standalone commit `7ab23b60aa6fd85ff7ce62720a2fbc5ea41e01a6` is rejected as canonical history.
- Architecture handoff applicability: `No`; DEC-002 explicitly excludes architecture and production engineering from this ticket.
