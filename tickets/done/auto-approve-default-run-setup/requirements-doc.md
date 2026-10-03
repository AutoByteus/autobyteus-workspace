# Requirements — Auto-approval true for fresh Agent/Team launches

## Document Status
- Package: auto-approve-default-run-setup
- Date: 2026-10-03
- Owner: Solution Designer
- Status: Approved (narrowed defaults-only scope)
- Current solution revision: SR-002
- Approval: Explicit user confirmation in the follow-up dated 2026-10-03: “let's first fix this small thing. Let's make it auto-approved true first” and “the other one ... We'll do it in the next ticket”; launch UI must show approval true. Reference: USER-APPROVAL-001, current conversation follow-up after SR-001 proposal.
- Additional approval clarification: USER-APPROVAL-002 (2026-10-03 current conversation): user confirms this is frontend-only, open fresh launch UI with true, no backend change; reinforces USER-APPROVAL-001 defaults-only scope and deferral of redesign.
- Exact approved baseline: SR-002, REQ-001..004 / AC-001..004 and preserved behavior. Supplements: none behavior-defining; screenshot diagnostic only.

## Problem And Desired Outcome
Long unattended runs should not stall simply because users forgot to turn on auto approval. Fresh Agent/Team launch UI must show auto approval on and launch with true unless the user turns it off where allowed. The broader form redesign is explicitly deferred to a separate future ticket, not part of this package.

## Relevant Current And Desired Behavior
| ID | Kind | Scenarios | Current | Proposed desired | Preserved | Evidence |
|---|---|---|---|---|---|---|
| BEH-001 | User | SCN-001 | Fresh standalone Agent templates start approval false except runtime-enforced cases. | Start true. | User can turn off where runtime supports it; definition model/runtime defaults remain. | Investigation E-002/E-004 |
| BEH-002 | User | SCN-002 | Fresh Team root templates start approval false except runtime-enforced cases; overrides inherit unless set. | Start true at root; members inherit. | Explicit per-member overrides and runtime policies. | E-002/E-003 |
| BEH-003 | User | SCN-003 | New Chat Agent/Team drafts already start true. | Keep true. | Workspace/model/target selection and first-send behavior. | E-005 |
| BEH-004 | User/System | SCN-004 | Existing-run seeds preserve saved approval; runtime policy can force true. | No retroactive approval change. | Existing configs, clone-from-existing values, explicit false, locked-runtime policy. | E-003/E-004 |

## Stakeholders
User launching long-running Agents/Teams: fewer avoidable interruptions and less intimidating setup. Engineers: implement only the approved behavior; retain runtime semantics.

## Scope Guardrail
### In-scope use cases
- UC-001: Fresh Agent launch (SCN-001).
- UC-002: Fresh Team launch, including inherited member approval (SCN-002).
- UC-003: Keep Chat launch defaults consistent (SCN-003).
- UC-004: Preserve existing and deliberately selected settings (SCN-004).
### Out of scope
Backend source/schema/default/enforcement changes; Agent/Team form redesign (former BEH-005/REQ-005/AC-005/SCN-005/UC-005 deferred by user); Product design/prototyping; Agent Org default changes; external SDK/direct API caller policy; changing runtime approval capabilities; removing approval controls; resetting saved runs; release/deployment; removing advanced/member controls.
### Non-goals
Promise that every eight-hour run will finish without interruptions from unrelated errors, quotas, authentication, or runtime behavior.
### Preserved boundary
BEH-003/004 and existing launch validation remain unchanged. Auto approval means runtime-supported tool/access/permission requests may proceed without manual confirmation; it does not grant new tool capabilities.
### Review authority
Blocking corrections must trace to approved REQ/AC/BEH IDs. New product/security policy, compatibility promises or migration obligations require renewed approval; adjacent proposals are non-authoritative.

## Requirements
| ID | Requirement | Behavior | Priority | Source |
|---|---|---|---|---|
| REQ-001 | Fresh Agent launch defaults auto approval to true without a user toggle, including after application restart. | BEH-001 | Must | USER-APPROVAL-001 |
| REQ-002 | Fresh Team root launch defaults to true; members without approval overrides inherit true. | BEH-002 | Must | USER-APPROVAL-001 |
| REQ-003 | Keep an explicit opt-out available where runtime permits; retain selected false across ordinary model/workspace edits and runtime changes where policy permits false. | BEH-001/002/004 | Must | SR-001 preservation confirmed by USER-APPROVAL-001 |
| REQ-004 | Do not rewrite saved run approval values or existing-run-derived launch seeds; retain Chat true defaults and current runtime-enforced policy. | BEH-003/004 | Must | SR-001 preservation confirmed by USER-APPROVAL-001 |

## Acceptance Criteria
| ID | Requirement | Scenario | Trigger | Observable outcome | Alternate | Verification intent |
|---|---|---|---|---|---|---|
| AC-001 | REQ-001 | SCN-001 | Open a fresh Agent launch from supported catalog/library entry points, including a fresh application session. | Auto approval shows true; launching submits effective true. | Runtime availability/model/workspace errors still block as before. | Template/store checks plus executable UI/API launch evidence |
| AC-002 | REQ-002 | SCN-002 | Open and launch a fresh Team without approval overrides. | Root and effective inherited member approval true. | Explicit member false remains effective where permitted. | Root/member resolution and realistic Team launch |
| AC-003 | REQ-003 | SCN-001/002/004 | Turn approval off before launch; edit ordinary settings. | False remains and is sent as false where permitted. | Antigravity retains its current forced-on policy. | Interaction and payload/runtime policy checks |
| AC-004 | REQ-004 | SCN-003/004 | Reopen/resume saved false config or seed from an existing run; start New Chat. | Saved/seeded false is not replaced by the new default; fresh Chat stays true. | Existing runtime exceptions remain unchanged. | Lifecycle checks; no persisted-data reset |

## Relevant Scenarios And Journeys
All below are Supported Normal Scenarios grounded in source-supported product entry points and the user's request, not synthetic direct calls. Desired and preserved behavior approved in SR-002 (USER-APPROVAL-001).
- SCN-001: User chooses Run on an Agent definition/library entry; reviews workspace/runtime/model and approval; launches and sends a task. Goal: start an unattended run. Alternate: opt out, or invalid/unavailable setting blocks launch. UC-001, REQ-001/003, AC-001/003; E-002/E-006.
- SCN-002: User chooses Run on a Team; selects shared settings; optionally adjusts members; starts the Team. Goal: unattended coordinated work. Alternate: member overrides or scoped validation errors. UC-002, REQ-002/003, AC-002/003; E-002/E-003/E-007.
- SCN-003: User opens New Chat, selects Agent/Team target, workspace/model and sends a task. Goal: conversational launch with current defaults. Alternate: switch approval off where supported or unavailable model/runtime blocks send. UC-003, REQ-004, AC-004; E-005.
- SCN-004: User opens existing run settings/resumes, or creates a new editable seed from an existing run. Goal: keep intentional previous configuration, not silently increase trust. Alternate: runtime-specific locks apply as currently defined. UC-004, REQ-003/004, AC-003/004; E-003/E-004.

## UI, Interaction, And Experience
Applicable: Yes, only the existing approval control's default state changes to on. Existing form layout, labels, controls, availability and locked policies are preserved. Product package/runnable prototype/final visual baseline: N/A — redesign deferred by user. No Product handoff. Screenshot is diagnostic only.

## Quality / Constraints
QR-001 (REQ-003/004; AC-003/004): no silent elevation of an explicit saved false. Default true trust implications were presented before USER-APPROVAL-001; current approval is recorded above. No performance target is proposed.

## Data Continuity
Existing run configs, historical snapshots, member overrides and run-derived seeds must retain explicit approval choices. No acceptable loss/reset is proposed. No schema/migration obligation established. Definition defaults currently store model/runtime/model parameters, not approval. Architecture must verify all entry-point consumers after approval.

## External Contracts
GraphQL launch inputs require an explicit approval boolean; no omitted-value API policy change is proposed. Runtime supported approval behavior remains governing authority; Antigravity is currently always true/locked.

## Supplements
User screenshot path is in investigation notes; diagnostic only. Product artifacts N/A. Independent architecture/code reviews N/A — no design or implementation yet.

## Assumptions / Open Decisions
- DEC-001: Defaults/preservation baseline approved by USER-APPROVAL-001.
- DEC-002/003: Product assistance/UI direction deferred to another ticket; not blockers for this task.
- ASM-001: Approved scope is fresh Agent/Team launches, not Agent Orgs or direct API default changes.
- Former BEH-005/REQ-005/AC-005/SCN-005/UC-005 retained in SR-001 history only, not current scope.
- No material open intended-behavior decision. Frontend-only implementation is explicitly required by USER-APPROVAL-002.

## Traceability
REQ-001 → UC-001/BEH-001/SCN-001/AC-001.
REQ-002 → UC-002/BEH-002/SCN-002/AC-002.
REQ-003 → UC-001/002/004, BEH-001/002/004, SCN-001/002/004, AC-003.
REQ-004 → UC-003/004, BEH-003/004, SCN-003/004, AC-004.

## Architecture Input / Readiness
Approved scenarios SCN-001..004 and current production owners are architecture inputs. Verify shared desktop/mobile template consumers, member inheritance and launch serialization. Preserve saved/seeded false, user opt-out, required launch settings and runtime locks. Content ready: Yes; evidence-backed/testable/scenario-linked: Yes; UI/prototype requirement: N/A beyond existing control state. User approval received: Yes, USER-APPROVAL-001. Approved requirements ready for architecture: Yes. No Product/design supplement approval missing.
