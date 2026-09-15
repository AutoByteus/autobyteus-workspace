# Requirements — Tolerant flat Team package reading

## Document Status / Approval
- Package: TEAM-PACKAGE-READ-20260915-001. Owner: Solution Designer. Date: 2026-09-15.
- Status: **Approved**, current baseline **SR-006**: SR-004 reading requirements plus the explicitly requested removal below. Current technical realization is DS-REV-002 / SR-007; prior DS-001/SR-005 is superseded.
- Explicit user direction: “please make that in the requirement as well. defaultLaunchConfig should be optional, just like how origin/personal branch implemented.”
- Scope correction: “in the requirement we don't do convert ... it's not the scope.” The prior draft's REQ-004 / AC-004a–b / SCN-004 / BEH-004 are **withdrawn**, not acceptance obligations. Historical SR-003 remains as history of the corrected overbroad draft, not authority.
- Approval: following the narrowed scope confirmation, user said “I think the scope is small. Now I will prove you can continue the tickets. Let's work on these tickets.” Recorded verbatim; in context this explicitly authorizes continuing the agreed ticket, not conversion, review bypass, or finalization. No prior-ticket approval reused.
- SR-006 explicit user direction: “this migration logic should be removed” because the feature is not released and “that agent package should be modified by the maintainer themselves.” This authorizes removal of automatic Team/Org definition conversion/authoring migration introduced by this feature, not removal of execution-history migration or reversal of already-converted user files.
- Continued approval: user distinguished software-owned execution history from separately maintained definition projects, confirmed removing that migration logic, then said “Now let's work on the sticky now.” This reaffirms SR-006 scope; no new conversion or finalization authority.
- No behavior-defining supplements or Product prototype. package-inventory.json is factual evidence only.

## Problem And Desired Outcome
Existing flat Team package files are rejected for unused extra fields (notably member refType) and omitted defaultLaunchConfig. Read required information, validate its meaning, and make valid flat Teams usable without editing the source package. Nested-Team definitions remain invalid as flat Teams. Package registration and individual definition availability are distinct.

## Relevant Current And Desired Behavior
| ID | Kind / Scenario | Current evidence | Desired change | Preserved outcome |
| --- | --- | --- | --- | --- |
| BEH-001 | User / SCN-001 | Exact input-key checks reject otherwise meaningful supersets, INV-001 | Ignore unused metadata, consume supported fields | Required values, coordinator, scoped Agent targets and handoffs validate |
| BEH-002 | Contract / SCN-002 | Missing defaultLaunchConfig rejected; personal reader accepts absence, INV-005 | Missing/null both mean no defaults | Valid supplied defaults and execution-time requirements remain |
| BEH-003 | User / SCN-003 | Agent-only resolution/admission excludes unresolved references, INV-003/006 | Preserve exclusion independently of input-key tolerance | No nested execution, partial Team, generated Org or sibling suppression |

| BEH-005 | Operational / SCN-005 | Registered startup migrations rewrite authored definitions, INV-009/010 | Remove automatic feature definition conversion/cleanup | Execution-history migration remains software-owned and intact |

## Stakeholders, Actors, And Outcomes
Package authors/users want existing valid flat Teams available through ordinary import/reload/select workflows; they must not rewrite files just for extra metadata or absent defaults. Runtime owners continue to receive valid flat Team definitions, not raw package metadata.

## Scope Guardrail
### In Scope
UC-001: read/import/reload valid flat Team definitions despite unused extra fields (REQ-001).
UC-002: omit Team default launch settings (REQ-002).
UC-003: load a mixed package while excluding invalid nested parents independently (REQ-003).
UC-005: start the application without the AgentOrg feature automatically converting or rewriting authored Team/Org definitions (REQ-005).
### Out Of Scope / Non-Goals
No Team-to-Org conversion, conversion tool, conversion acceptance journey, new Org definitions or Org import feature. No nested Team support, partial flattening, namespace collision policy, automatic package rewrite, new migration, global JSON/protocol tolerance, runtime lifecycle/approval/status work, external autobyteus-agents edits, release/deployment. No new optionality for unrelated consumed fields; no wholesale adoption of personal's malformed-value coercion. Existing runtime/history migration and ordinary explicit definition-edit/write behavior remain unchanged. Removing the AgentOrg feature's automatic definition conversion/authoring migration is now explicitly in scope under REQ-005; implementing conversion is still out of scope.
### Preserved Boundary
BEH-001–003, AC-001b/002b/002c/003a–b. Internal flat Team model remains free of refType. Scoped Agent lookup is authoritative: an ignored discriminator does not retain its old semantic authority. Actual supplied nested references have no matching Agent in the required scope. Existing identity, ownership/write protection, revisions and launch validation remain.
### Review Authority
Blocking technical findings must cite this approved REQ/AC/preserved boundary. New product policy, migration or conversion obligations are Requirement Gaps requiring user approval; adjacent recommendations are not automatic scope. Only Solution Designer may revise authority with renewed approval when intended behavior changes.

## Requirements
- **REQ-001:** Read otherwise valid flat Team packages despite unused extra input fields. Extract supported meaning without carrying unused fields into the canonical model. Keep all required-value, scope, coordinator, duplicate-name, reference and handoff validation.
- **REQ-002:** defaultLaunchConfig is optional. Missing and null both mean no package defaults; valid supplied settings retain meaning. Supplied malformed consumed values must still fail, not silently become null. Reading/reloading must not rewrite the package merely to add null or strip extras. Execution still needs its applicable settings.
- **REQ-003:** Supplied unsupported nested parents stay unavailable and absent from the normal selectable Team catalog; launch must not bypass admission. No partial loading of just their direct Agents. Valid sibling definitions remain independently usable.

- **REQ-005:** Remove automatic definition conversion and authoring-shape rewrite logic introduced by the AgentOrg feature, including server-owned definition files. Package maintainers own any required definition conversion. Normal loading validates availability without converting, relocating or deleting those authored files. Preserve execution-tree/history/task/communication migration separately; no rollback/reversal/reset of existing data or general migration-framework removal.

## Acceptance Criteria
| ID | REQ / BEH / SCN | Trigger | Expected outcome / failure control | Verification intent |
| --- | --- | --- | --- | --- |
| AC-001a | 001 / 001 / 001 | Import/reload otherwise valid flat Team with refType:'agent' | Team appears in normal available catalog and can be selected | Real package/catalog path, with launch readiness checks |
| AC-001b | 001 / 001 / 001 | Read same Team with unused metadata | Same canonical meaning; extra metadata absent from internal model; missing/invalid consumed fields still rejected | Codec + provider/admission positive/negative coverage |
| AC-002a | 002 / 002 / 002 | Read otherwise identical omitted/null defaultLaunchConfig variants | Both admissible, both no package defaults | Reader/provider and catalog checks |
| AC-002b | 002 / 002 / 002 | Read valid supplied defaults; attempt invalid values or incomplete launch settings | Preserve valid defaults; do not bypass applicable value/launch checks | Focused positive/negative validation |
| AC-002c | 002 / 002 / 002 | Import/read/reload external files | Source bytes unchanged; no null-field rewrite prerequisite | Before/after hashes |
| AC-003a | 003 / 003 / 003 | Import supplied Northstar and department parents | Unavailable, omitted from selectable Teams and nonlaunchable; no partial Team | Real Agent-reference admission and catalog/launch guard |
| AC-003b | 003 / 003 / 003 | Same package contains valid flat siblings | Otherwise valid siblings remain available; invalid parents not deleted/converted | Mixed package integration + normal frontend catalog |

| AC-005a | 005 / 005 / 005 | Application startup with old authored Team definitions | Feature migration does not rewrite flat configs, generate Org definitions, move definition folders or remove authoring files; invalid nested Teams stay unavailable | Migration registration/callpath coverage and before/after source hashes |
| AC-005b | 005 / 005 / 005 | Supported runtime/history migration with authored definitions left unchanged | Execution/history migration remains functional and separate; no new requirement that authoring conversion run first | Existing runtime migration preservation coverage |

## Relevant Scenarios And Journeys
All four are **Supported Normal Scenarios**, grounded in user's supplied package and explicit requested outcomes (INV-001–006).
- SCN-001 / UC-001: author has an existing flat Team package with extra metadata; user imports/registers or reloads it, opens Team catalog and selects the Team. Valid Teams remain usable; malformed consumed values are not accepted.
- SCN-002 / UC-002: author does not specify default launch settings; user loads/selects the Team and supplies necessary execution settings in ordinary launch flow. Absent and null are equivalent; missing defaults alone are not a catalog failure. Malformed supplied settings remain errors.
- SCN-003 / UC-003: user imports the provided mixed package and inspects available Teams. Flat siblings remain available; Northstar and department nested parents are not available as Teams. Registration need not fail globally and no Org is synthesized.
- SCN-005 / UC-005 / BEH-005 (Operational, Supported Normal Scenario): user starts the unreleased feature build against existing application data; startup may migrate supported execution history, but does not automatically convert or rewrite Team/Org authoring packages. Definition migration exists in current registered startup code (INV-009); removal is explicitly user-requested. Maintainer conversion itself is not a ticket journey.
No actual user's server import captured during investigation; these are approved target journeys, not claims of runtime reproduction.

## UI / Quality / Data Continuity
No new screen, button or visual design. Existing package/catalog/select surfaces supply acceptance. Product UI/UX/prototype fields: N/A — not applicable.
Quality constraints derive only from AC-001b,002c,003b: retain meaningful validation, byte-preserve external input and isolate invalid definitions. No new performance SLO or compatibility matrix.
External JSON is read; source files, ownership, IDs and existing run data must be preserved. No reset/deletion/rebuild or user data loss authorized. No private server-data copying into Git. Representative volume:14 top-level Team configs; no broad-volume guarantee.

## Dependencies, Assumptions And Open Questions
Normal package registration, Team catalog/admission and launch settings remain existing contracts. External package pin and personal reference are recorded in investigation. File existence is not full admission proof: implementation/API must validate actual definitions without weakening unrelated checks to force all inventory entries green. User intent for removing automatic definition migration is explicit. Technical dependency investigation is recorded in INV-010/011; executable preservation evidence remains downstream work, not an inferred data-safety claim from the feature being unreleased. Provider/model-specific runtime prerequisites must be reported rather than invented.

## Supplements And Traceability
- investigation-notes.md: canonical evidence and unknowns, all requirements.
- package-inventory.json: read-only inventory and hashes, REQ-001/003; evidence, no separate approval authority.
REQ-001 → UC/BEH/SCN-001 → AC-001a–b. REQ-002 → UC/BEH/SCN-002 → AC-002a–c. REQ-003 → UC/BEH/SCN-003 → AC-003a–b. REQ-005 → UC/BEH/SCN-005 → AC-005a–b. Withdrawn REQ-004 is not reused.

## Architecture Phase Input / Readiness
Verify all read callers and shared canonical-parser consumers before choosing a bounded correction. Preserve semantic admission, source ownership and execution/history migration. Remove the explicitly rejected feature definition-migration responsibility; reassess the reader design after that removal rather than retaining a boundary merely for deleted consumers. Mechanism delegated to design.
Current behavior, scope, desired/preserved behavior, testable AC/scenarios, data constraints and approval are recorded: Yes. Prototype: N/A. User-directed SR-006 behavior is approved and reaffirmed; revised DS-REV-002 / SR-007 is the design authority. Requirements readiness has no remaining blocker; independent design review is required by the revised classification. No permission to finalize Git or release.
