# Antigravity Runtime Missing — Approved Requirements

## Document Status / Approval
- Package: `antigravity-runtime-missing`; approved baseline **SR-003**, 2026-09-27.
- Owner: Solution Designer. Status: **Approved**.
- Explicit user approval/directive: “completely remove the hard coded versions in the source code. thanks a lot. otherwise, if user upgrade antigravity, our software is not usable anymore for antigrvyity. work on it please”; follow-up: “simpolify the code”. These approve the version-independent correction discussed immediately beforehand, not the earlier version-whitelist or UI-expansion proposals.
- Behavior-defining supplements: none. SR-001/002 proposals are superseded; no approval inferred for them.

## Problem / Desired Outcome / Actors
An AutoByteus user upgrading Antigravity from 1.2.11 to 1.2.12 loses runtime selection because discovery and native-tool policy hard-code 1.2.11. Remove version-based rejection and unnecessary version-specific machinery. A CLI offering the required capabilities and usable model catalog must not be rejected merely for its version. This does not promise compatibility with arbitrary breaking upstream changes.

## Relevant Current, Desired And Preserved Behavior
| ID | Kind / scenarios | Current | Approved desired / preserved |
| --- | --- | --- | --- |
| BEH-001 | User/System, SCN-001 | Exact-version gates reject installed 1.2.12 before discovery/launch. | No hard-coded CLI version admission in discovery, new-run tool configuration or restore; capable installed CLI is selectable/usable regardless of version string. |
| BEH-002 | System, SCN-002 | Missing CLI/features and invalid models produce sanitized errors; unavailable unselected runtime is hidden. | Preserve capability/model failure handling, bounded subprocess I/O and current UI behavior. No new unavailable-runtime UI. |
| BEH-003 | User/System, SCN-003 | Existing tool allowlist, identity/capsule hash, model/agent/workspace/permission/conversation checks govern runs. | Preserve these actual restrictions, all saved history/configuration and non-AGY runtimes. |

## Scope Guardrail
- UC-001: discover/select/start existing standalone/team/org Antigravity runs after CLI upgrades.
- UC-002: restore existing Antigravity runs without version-only rejection.
- In scope: remove all AGY runtime version gates and version-specific production names/plumbing; simplify affected existing code and update tests/docs.
- Out of scope: frontend redesign/visibility changes; adding supported-version lists, ranges or switches; new runtime abstractions/registries; changing permitted tools, permission mode, prompts, MCP exposure, stream semantics or run identity; CLI install/upgrade/downgrade; history migration; unrelated SDK/dependency pins or persisted schema versions.
- Non-goal: unconditional enablement of broken or missing CLIs. Retain actual required-feature/model validation.
- Preserve BEH-002/003. User data loss/reset is not authorized.
- Review authority: blockers must trace to approved BEH/REQ/AC IDs. New functionality, policy or migration obligations require renewed user approval, not unilateral reviewer expansion.

## Requirements
| ID | Requirement | Behavior / source |
| --- | --- | --- |
| REQ-001 | Remove hard-coded AGY CLI version restrictions completely. A version change alone must not disable discovery, new launch or restore. | BEH-001; explicit user directive |
| REQ-002 | Preserve existing required capability/model checks and their sanitized failures; keep selector behavior unchanged. | BEH-002; preserved behavior, scope narrowing |
| REQ-003 | Preserve current native-tool allowlist and all identity/permission/conversation/data invariants, plus other runtimes. | BEH-003; existing supported product contract |
| REQ-004 | Simplify affected code: remove obsolete version-specific profiles, data plumbing and duplicate discovery rather than replacing pins with another version framework. | BEH-001; “simpolify the code” |

## Acceptance Criteria
| ID | REQ / scenario | Observable outcome / verification |
| --- | --- | --- |
| AC-001 | REQ-001/004, SCN-001 | Production AGY paths have no CLI release literal, version allowlist/range, version comparison or version-only rejection. Different/new/malformed version-output strings cannot change otherwise identical capability outcomes. Tests may use arbitrary versions as regression fixtures, never compatibility policy. |
| AC-002 | REQ-001/003, SCN-001/003 | Actual installed 1.2.12 passes discovery and a production-path new-run smoke; current eight-tool declaration and identity/workspace/permission checks remain. Runtime is included by the unchanged frontend once backend reports enabled. Validate backend response and rendered selector when browser access is available. |
| AC-003 | REQ-002/003, SCN-002 | Missing CLI, missing required flags, timeout/excess output, failed or empty model discovery still fail safely with bounded execution and sanitized diagnostic; no version-related misleading diagnostic. |
| AC-004 | REQ-001/003, SCN-003 | Restore retains stored capsule/hash and exact provider conversation binding, with no version gate; existing non-AGY and data invariants unchanged. Unit/integration coverage and focused live restore where available. |
| AC-005 | REQ-004, SCN-001 | No obsolete version-profile DTO/resolver or unused version-return wrapper remains; availability/model/new/restore consumers use existing owners directly. Tests and current runtime documentation match new policy. |

## Supported Scenarios And Journeys
| ID | Kind / actor / goal | Trigger / starting condition / sequence | Expected and alternate outcome | Validity / evidence |
| --- | --- | --- | --- | --- |
| SCN-001 | User; start AGY after upgrade | Working installed CLI; open standalone/team/org configuration, select AGY/model, start task. | Compatible CLI selectable and launchable, no version-only block; genuinely missing features use SCN-002. | Supported Normal Scenario: initial request/screenshot and explicit upgrade directive; existing launch surfaces. |
| SCN-002 | System/User; handle unavailable CLI | Discovery finds missing executable/features, timeout or invalid models. | Existing sanitized unavailable behavior retained, no unconditional enablement. | Supported Explicit Edge Scenario: existing typed discovery failures and prior approved AGY behavior. |
| SCN-003 | User; continue saved run / use other runtimes | Reopen AGY run after upgrade or use existing non-AGY runtime. | Exact stored AGY conversation and run-start identity preserved; non-AGY unchanged. | Supported Normal Scenario: existing restore code and prior AGY supported scenarios. |

## UI / Quality / Data / Contracts
- UI changes: N/A — existing runtime selector receives newly enabled backend row. Product/prototype artifacts N/A, no request.
- Quality: QR-001 maps REQ-002/AC-003, preserve timeout/output bounds and sanitized messages. QR-002 maps REQ-004/AC-005, reduce obsolete machinery without new abstractions.
- Persistence: no schema or user-data changes intended; capsule manifest schema version is not a CLI version and must remain. No history loss/reset or migration authorized.
- External contract: installed CLI required flags, model catalog and stream protocol remain dependencies; future actual protocol incompatibility can still fail normally, but version number cannot be the reason.
- Assumptions: locally installed CLI functionality beyond earlier basic probe is to be exercised by implementation/validation. Current browser control previously failed; report limitations honestly.

## Supplements / Traceability
Canonical factual evidence inventory: `investigation-notes.md`. No normative supplements.
REQ-001 -> UC-001/002, BEH-001, SCN-001/003, AC-001/002/004.
REQ-002 -> UC-001/002, BEH-002, SCN-002, AC-003.
REQ-003 -> UC-001/002, BEH-003, SCN-001/002/003, AC-002/003/004.
REQ-004 -> UC-001/002, BEH-001, SCN-001, AC-001/005.

## Architecture Inputs / Readiness
Map discovery and new/restore paths; remove version coupling at its actual owners; preserve tools and stored capsule semantics. All content readiness checks pass for this narrow approved scope. Approval captured above; ready for design. Earlier visibility proposal withdrawn, no open product decision.
