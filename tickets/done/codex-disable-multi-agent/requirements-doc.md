# Requirements Document

## Document Status
- Package: `codex-disable-multi-agent-20261006`; current revision: `SR-004`.
- Status: **Approved** — narrow implementation follow-up to completed diagnostic SR-003.
- Owner: Solution Designer; date: 2026-10-06.
- Approval reference **SD-AP-001**: user, immediately after the three completed real Codex tool-inventory results and effective startup command, “Perfect. Since you found the correct arguments then, work on the tickets now. Let's go.” This explicitly authorizes applying the discovered control to AutoByteus, not unrelated upgrades or feature work.
- Exact approved baseline: SR-004 / REQ-006–009 / AC-006–009 below. These implement the existing native-tool suppression intent (historical completed ticket REQ-014/AC-017) without changing intended collaboration behavior.
- Behavior-defining supplements: None. Probe evidence is factual, not normative. No UI/Product design requested.
- Previous diagnostic REQ-001–005 / AC-001–005 remain historical in `solution-history/sr-003-diagnostic/requirements-doc.md`; cumulative evidence/SR-001–003 preserved.

## Problem And Desired Outcome
AutoByteus's current launch flags are accepted by Codex but still expose native collaboration tools. Those compete with AutoByteus's `send_message_to` / `delegate_task`, and a prior real Task worker failed to send its report to the Manager. The user approves implementing the newly verified control so AutoByteus-launched Codex does not expose Codex's own collaboration tools, while AutoByteus collaboration and the user's standalone Codex settings remain intact.

## Relevant Current And Desired Behavior
| Behavior | Kind | Scenarios | Current | Desired | Preserved |
| --- | --- | --- | --- | --- | --- |
| BEH-002 | System/Operational | SCN-002/003 | Existing launch policy appends only feature-disable flags; actual 0.160.1/GPT-6.1-Sol still reports six native tools | AutoByteus-created Codex app-server contexts have no native collaboration tool declarations or native multi-agent role prompt | Existing run identity, workspace-scoped reuse, create/resume protocol, model configuration and provider authentication behavior |
| BEH-003 | Preserved Contract | SCN-002/003 | User's Codex configuration/auth and externally supplied AutoByteus MCP collaboration are separate from native collaboration | No change to those authorities/surfaces | No personal config writes, no stripping MCP servers/tools, no disabling AutoByteus get_handoff_rules/send_message_to/delegate_task, no changes to other runtimes |
| BEH-001 | Historical Diagnostic | SCN-001 | Nine request captures and three actual-model answers established the effective control | Preserve provenance as implementation input | Do not mislabel baseline evidence as proof of changed source |

## Scope Guardrail
### In-Scope Use Cases
- UC-003 / SCN-002: fresh AutoByteus Codex Agent, Team/Org member or Task copy acquires an app-server; ordinary restore acquires a newly launched app-server. Correct native collaboration suppression at that shared launch boundary.
- UC-004 / SCN-003: operator/custom deployment selects app-server command/base arguments through the existing environment overrides. AutoByteus policy still takes precedence.
- UC-002 retained for verification of this fix, not new production behavior.
### Out Of Scope
User config/auth modification, provider/account isolation, generic per-thread arbitrary config management, UI changes, Codex upgrade/min-version enforcement, all-model/all-historical-version guarantees, process-manager refactors, forcibly restarting already-running user processes, disabling external MCP collaboration, other runtimes, unrelated completed-ticket edits, GitHub issue closure or automatic release/deployment.
### Non-Goals
No new prompt-only workaround, model-catalog rewriting, tool interception, runtime feature toggle or compatibility fallback framework. Current evidence proves 0.160.1 with GPT-6.1-Sol; 0.160.0 additionally has controlled-request evidence, not universal older-version certification.
### Preserved Boundary
BEH-003 / REQ-008 / AC-008. Saved conversations, IDs and application data must remain unchanged. New policy applies when the ordinary lifecycle launches a new app-server; no forced retrofit of existing native process sessions.
### Review Authority
Blocking design/implementation corrections must trace to approved REQ/AC/preserved behavior. New isolation, version-support or operational guarantees require separate user approval, not reviewer invention.

## Requirements
| ID | Requirement | Behavior / Use Case | Rationale |
| --- | --- | --- | --- |
| REQ-006 | Newly AutoByteus-launched Codex app-server contexts suppress native multi-agent/collaboration tools using the verified effective control | BEH-002 / UC-003 | User authorizes fixing the actual tool surface, not just feature-list values |
| REQ-007 | The fixed policy overrides conflicting personal/project config and existing custom launch-argument values without writing those config files; existing JSON-over-string selection and parsing remain unchanged | BEH-002/003 / UC-004 | Preserve prior launch policy's intended authority and customization contract |
| REQ-008 | AutoByteus collaboration MCP exposure, provider/authentication, workspace client leases/reuse, model settings, native non-collaboration tools, other runtimes, stored identity/history and standard create/resume remain unaffected | BEH-003 / UC-003/004 | Small policy correction, not runtime or security-boundary redesign |
| REQ-009 | Maintain executable regression coverage for override ordering/parsing and upstream tool suppression; validate actual native tool absence rather than equating scalar false or successful startup with success | BEH-001/002/003 / UC-002/003/004 | Prior test oracle missed the real failure; user expressly required real tool-inventory experiments |

## Acceptance Criteria
| ID | Requirements / Scenario | Observable outcome | Verification intent |
| --- | --- | --- | --- |
| AC-006 | REQ-006/009 / SCN-002 | Codex actual model-facing tool definitions exclude native collaboration namespace/tools and native multi-agent role prompt; core non-collaboration tools remain available. A completed actual-model inventory answer agrees | Controlled real-binary local-provider request capture through changed production launch composition, with positive unsuppressed control; bounded authenticated tool-inventory smoke from changed-source arguments |
| AC-007 | REQ-007 / SCN-003 | Default, string customization, valid JSON, invalid/non-string JSON fallback and conflicting enabled settings all end with effective disabled policy; chosen base/custom command and unrelated args remain; each returned args array independent | Focused launch-config unit tests and conflicting-config native probe |
| AC-008 | REQ-008 / SCN-002/003 | Personal config/auth unmodified; AutoByteus scoped MCP tools still exposed/callable under existing grants; ordinary create/restore and client cleanup remain correct; no catalog rewrite or identity reset | Relevant existing Codex bootstrap/MCP/client tests and API/E2E-owned isolated real system check; no user running app/data |
| AC-009 | REQ-009 / SCN-002/003 | Durable tests detect restoration of old ineffective policy (or equivalent loss of suppression) rather than merely checking flags. Retained evidence identifies exact source/binary/model, successful/intentional-failure layers and cleanup | Regression assertions, implementation checks and executable-validation report with truthful exclusions |

## Relevant Scenarios And Journeys
- SCN-002 — Supported Normal Scenario: user launches/continues a Codex Agent or an AutoByteus Team/Task coordinator creates a Codex member/copy. Ordinary app-server acquisition → thread start/resume → model turn → appropriate AutoByteus collaboration. Desired: native collaboration absent, AutoByteus collaboration untouched. Independent basis: existing product runtime, completed ticket's approved REQ-014/AC-017 and prior live Task-worker failure. Current source shares the same app-server launch owner.
- SCN-003 — Supported Explicit Edge Scenario: operator customizes documented CODEX_APP_SERVER_COMMAND / ARGS / ARGS_JSON or user configuration attempts to enable native agents. Desired: command/base args selection unchanged, AutoByteus native-disable policy wins. Basis: current public environment contract, existing launch-config tests and historical approved policy, plus verified CLI-over-config precedence.
- SCN-001 retained as historical operational diagnostic scenario. Explicit per-thread agents.enabled=true can re-enable tools in raw Codex; AutoByteus's actual thread config currently contains MCP settings only, so no generic per-thread enforcement framework is authorized.

## UI, Quality, Data And Contracts
- UI/Product Design: N/A — no user-facing UI/visual spec.
- Quality constraint: REQ-009/AC-009 observable native definitions and completed live answers, not prompt compliance alone; test-owned processes/data and exact cleanup under TESTING.md.
- Data continuity: no schema/store rewrite or migration; preserve all configuration/auth/history/IDs. Any discovered persistence effect is an escalation, not permission to reset data.
- External contract: installed Codex official agents.enabled=false setting, verified 0.160.1 actual-model and 0.160.0 controlled-provider traces. Other versions/models remain a stated validation limit; no new version gate approved.
- Supplements: evidence/diagnostic/, evidence/version-01600/ (evidence only); full inventory and approved user wording in investigation-notes.md.
- Open intended-behavior decisions: None for this narrow delta. Technical unknowns (older releases, remaining actual-model families, changed-product routing) belong to validation/risk, not invented scope.

## Traceability And Readiness
REQ-006 → UC-003 / BEH-002 / SCN-002 / AC-006.
REQ-007 → UC-004 / BEH-002/003 / SCN-003 / AC-007.
REQ-008 → UC-003/004 / BEH-003 / SCN-002/003 / AC-008.
REQ-009 → UC-002/003/004 / BEH-001/002/003 / AC-006/009.
Current/desired/preserved behavior explicit; supported scenario basis, evidence, boundaries and measurable ACs complete. User approval SD-AP-001 applies to this corrective behavior. Approved basis ready for proportionate architecture design. No review/release/finalization bypass implied.
