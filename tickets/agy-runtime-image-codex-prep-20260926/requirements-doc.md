# Requirements Document

## Document Status
- Status: Draft — user broadens nonblocking AGY skill-error policy; renewed approval pending
- Current solution revision ID: SR-013
- Package identifier: agy-runtime-image-codex-prep-20260926
- Request / ticket: User request of 2026-09-26, CLI transcript and four attached screenshots
- Requirements owner: Solution Designer
- Date: 2026-09-26
- Approval state and reference: SR-005 native-tool baseline was approved by user on 2026-09-26 in reply to the explicit scope question (“Okay … we shouldn't block their own tools …”). The user's later instruction that a nonexistent skill should warn in the backend rather than block AGY startup prompted SR-009. The user explicitly approved the full revised behavior in reply “yesss” to the question spelling out warn-and-start, omit only genuinely missing skills, keep other skills, preserve unsafe-source/unrelated failures, and still make Codex's workflow skill portable.
- Exact approved requirements baseline: SR-009 content, approved in SR-010 by user's 2026-09-26 “yesss” reply, remains historical authority for all unchanged behavior. The later user instruction that even a present invalid `SKILL.md` should warn and never block otherwise healthy AGY startup materially changes BEH-002/REQ-004/AC-004/QR-001; SR-013 proposal is **not yet approved**.
- Behavior-defining supplements: N/A — no separate product supplement

## Problem And Desired Outcome
The same user's standalone Antigravity CLI can invoke native GenerateImage, but an AutoByteus Software Development Department Solution Designer running through Antigravity CLI denies image capability. A separate AutoByteus Codex agent using that runtime fails during preparation with only a generic error. The user's repeated clarification makes the image target unambiguous: the tool supplied by AGY itself must be usable in AutoByteus-launched AGY runs. AutoByteus's MCP `generate_image` is not a substitute and its availability must not count as meeting native-image acceptance criteria. The desired outcome is native runtime capability parity within an explicitly approved exposure scope, with generated output usable in the app; the standalone Codex agent should start with its intended skill **when available**, but absence of a configured skill must warn in the backend and not block startup. User clarified the desired provider boundary: retain AGY's default native tools, except provider-native subagent and messaging/collaboration tools when AGY supports excluding them, and add agent-configured AutoByteus MCP tools. A local AGY 1.2.11 probe confirms selective native allowlisting is possible; the CLI custom-agent contract currently documents an allowlist rather than a subtractive denylist. A version-verified native list may therefore be required, and automatic inheritance of future CLI tools is not promised without compatibility validation. No implementation has occurred.

**SR-013 proposed change, not yet approved:** The user now says a present but invalid `SKILL.md` should also be a backend warning rather than block startup, and expresses a broad preference that a skill problem not stop an otherwise healthy AGY agent. This supersedes the SR-010 distinction that requires present invalid skill sources to hard-fail. Whether an invalid folder should be copied through to AGY or omitted after a warning remains open; copying could leave AGY itself to reject it, so the safe nonblocking proposal is warn-and-omit the affected skill while retaining other skills. Unrelated failures that prevent the base AGY run/capsule from existing are not a skill warning.

## Relevant Current And Desired Behavior
| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Standalone AGY default agent can use native image generation. AutoByteus-generated custom AGY agent hard-codes eight coding tools, omitting native image generation. | Every AGY-backed AutoByteus agent retains the supported installed CLI's default native non-collaboration capabilities, including image generation, with app-configured MCP tools added separately; AGY-native subagent and messaging tools are excluded across AutoByteus AGY runs. | Run identity and MCP grants remain scoped; app-owned media tool stays distinct. | E-001, E-002, E-003, E-010, E-012 |
| BEH-002 | User | SCN-002, SCN-003 | Standalone Codex agent config references software-engineering-workflow-skill, which is absent from configured discovery roots; AGY capsule rejects unresolved binding; UI shows only generic preparation failure. | **SR-013 proposal:** Codex starts and answers when any one configured skill is missing, invalid, unreadable or otherwise cannot be safely exposed; backend warns and omits only that skill. When the intended skill is valid and available, Codex can use it. | Skipped skills are not falsely reported as loaded; other usable skills remain available; unsafe content is not copied into the capsule; unrelated failure of base AGY startup still fails; no raw private diagnostics in UI. | E-004–E-006, E-022/023, E-028 |
| BEH-003 | System | SCN-001 | Native AGY image output may save under its own brain directory. The AGY converter wraps native tool output; the current file projection expects certain output-path shapes. Exact native event payload remains unverified. | Native generated image result/path is usable from the AutoByteus run without false success or misleading absence. | App-owned media provider behavior remains independent. | E-001, E-007, E-009 |

## Stakeholders, Actors, And Outcomes
| Actor | Goal / Responsibility | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User | Ask Solution Designer for an image and run standalone Codex | Understand capability and get usable output or actionable failure | No need to infer hidden runtime setup |
| Solution Designer agent | Use only configured capabilities truthfully | Invoke image tool when granted; avoid false denial or false claim | Team-scoped tool grants |
| Codex agent | Start with declared workflow skill when present | Proposed: first turn works despite an individual unusable configured skill | Skipped skill is not falsely treated as loaded |
| App operator | Maintain AGY availability and configured skills | Proposed: backend warning identifies affected run, skill and safe reason category | No credential leakage |

## Scope Guardrail
### In-Scope Use Cases
- UC-001: A user uses an AGY-backed AutoByteus agent with the installed CLI's default native tools, including image generation, plus that agent's configured MCP tools.
- UC-002: A user starts the standalone Codex agent with the AGY runtime and gets a first response.
- UC-003: A configured skill is unusable or native AGY image capability is unavailable; proposed skill policy warns and continues without the affected skill, while native image failure remains accurately and safely reported to the user.

### Out Of Scope
- Adding non-default AGY tools, unrelated providers, or unconfigured MCP grants.
- Replacing or modifying AutoByteus's separate app-owned media provider, or assuming CLI credentials apply to it.
- Broad redesign of run creation, team routing, all skill discovery, the media catalog, or historic runs.
- Retrofitting already-created AGY capsules and tool sessions without starting a new run.

### Non-Goals
- A new image-generation UI workflow or Product prototype.
- Changing AGY text model selection or auto-approve semantics.
- Changing output-directory policy or introducing a data migration.

### Preserved Behavior Boundary
Preserve BEH-001 to BEH-003 per-run identity and capsule isolation, app-owned MCP grants, and credential-safe errors. AGY-native subagent and messaging tools are excluded; AutoByteus team communication/delegation continues through configured MCP tools. **SR-013 proposal:** a skill-specific problem is nonblocking but the affected skill must not be exposed or claimed loaded if unsafe/unusable; an unrelated failure of base AGY startup is not converted to a skill warning.

### Review Authority
Blocking design or implementation findings must cite these approved IDs once approved. Proposed new behavior requires renewed user approval.

## Requirements
| ID | Requirement | Related Behaviors | Priority | Rationale / Source |
| --- | --- | --- | --- | --- |
| REQ-001 | AGY-backed AutoByteus agents retain the supported installed CLI's default native non-collaboration capabilities, including native image generation, alongside separately configured MCP tools; an app-owned media grant alone is not native parity. Supported CLI version drift must not silently remove previously supported native capabilities. | BEH-001 | High | User clarification; E-001 to E-003, E-010, E-012/013 |
| REQ-002 | A native GenerateImage invocation must leave the user with an accessible image/result path in the AutoByteus run; native tool failure or unavailability must not be presented as success, and failure reporting must remain credential-safe. | BEH-001, BEH-003 | High | User request and clarification; E-001, E-009 |
| REQ-003 | The standalone Codex agent can start an AGY-backed first turn; its intended workflow skill is present and usable in the normal configured package, without making skill availability a startup prerequisite. | BEH-002 | High | User screenshot; Codex package README E-005; user clarification E-022 |
| REQ-004 | **SR-013 proposal:** A configured skill that is missing, invalid, unreadable, colliding, or cannot be safely materialized must produce a sanitized backend warning identifying run, skill and safe reason category; that skill is omitted from the AGY exposure/snapshot and does not prevent otherwise healthy AGY startup or other usable skills. The agent must not claim the skipped skill loaded. Unrelated base-runtime/capsule failures are not misreported as skill warnings. | BEH-002 | High | User clarification E-028; Codex/Claude comparison E-023 |
| REQ-005 | AutoByteus-configured MCP tools remain additive to native AGY tools and scoped to the agent/run's configured exposure. | BEH-001 | High | User clarification; E-008, E-012 |
| REQ-006 | AGY-native subagent spawning/definition/management and native inter-agent messaging are not exposed to AutoByteus-launched AGY agents; AutoByteus Team/Org collaboration remains through its configured MCP tools. | BEH-001 | High | User clarification; prior AGY design scope; E-013 |

## Acceptance Criteria
| ID | Related Requirements | Related Behavior / Scenario | Trigger | Observable Expected Outcome | Failure / Alternate | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001, SCN-001 | New AGY-backed Solution Designer asks for a dog image with AGY-native generation available | AGY's own native `generate_image` is invoked (verified by provider tool-call provenance, not an AutoByteus MCP call), and the AutoByteus run presents a real image/result path | An AutoByteus MCP-generated image alone does not pass; no false claim when native tool fails | Real AGY-backed app-run check with native tool-call and output evidence |
| AC-002 | REQ-002 | BEH-003, SCN-001 | AGY-native image generation unavailable or fails | User sees an accurate safe failure; no fabricated image or success | Credentials and raw private diagnostics absent | Controlled native-tool failure test |
| AC-003 | REQ-003 | BEH-002, SCN-002 | New standalone Codex run using AGY and normal configured package | Run prepares and answers first prompt with intended workflow skill available | No generic preparation failure | First-turn integration check |
| AC-004 | REQ-004 | BEH-002, SCN-003 | **SR-013 proposal:** configured skill deliberately absent or present but malformed/name-mismatched/unreadable/colliding while base AGY run otherwise works | Backend emits a sanitized per-skill warning; affected skill is not exposed or claimed loaded; AGY prepares and answers first prompt with other usable skills | Do not copy unsafe/unusable content into AGY; unrelated base-runtime/capsule failure still reports failure; no raw stack/secret in user-visible channel | Controlled absent/invalid/collision and mixed-skill first-turn checks |
| AC-005 | REQ-001, REQ-003, REQ-005 | BEH-001, BEH-002 | AGY standalone and Team/Org runs | Supported default non-collaboration native capabilities and separately configured MCP tools coexist; run identity/permissions and Codex startup remain correct | No unconfigured MCP grants | Versioned runtime and regression checks |
| AC-006 | REQ-006 | BEH-001, SCN-004 | New AGY-backed standalone or Team/Org run | Native AGY subagent and messaging calls are unavailable while configured AutoByteus MCP collaboration still works where appropriate | No untracked provider-native collaboration masquerades as AutoByteus Team activity | Selective-tool and Team/Org MCP checks |

## Relevant Scenarios And Journeys
| ID | Kind | Actor / Event | Goal | Supported Trigger | Starting Condition | Product-Level Sequence | Expected Outcome | Alternate / Error | Validity | Evidence | Related IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User asks AGY-backed agent to generate image | Obtain native AGY image in app | AutoByteus AGY standalone/Team/Org chat | New AGY run | User asks; agent uses default native image tool; app presents result/path while configured MCP tools remain available | Image usable and path retrievable | Native failure gives accurate safe error | Supported Normal Scenario; SR-005 approved | User clarifications, CLI transcript, capsule/probe evidence E-001/003/012/014 | REQ-001/002/005; AC-001/002/005 |
| SCN-002 | User | User starts Codex | Get assistant reply | Standalone agent chat | New AGY Codex run | User sends hello; run prepares; assistant responds | First reply | None beyond normal runtime failure | Supported Normal Scenario | Screenshot, metadata, log E-004/005 | REQ-003; AC-003 |
| SCN-003 | System | Configured skill unusable | **SR-013 proposal:** continue with backend warning | Run preparation | One configured skill is absent or present but unusable; base AGY run otherwise healthy | User sends first message; backend warns with run/skill/safe reason, omits affected skill, starts AGY; agent responds with other usable skills | Non-blocking first turn, operator-visible warning, no false skill-loading claim | Repair skill for a later run; unrelated base-runtime failure still fails | Supported Explicit Edge Scenario: user now explicitly requests even invalid skill content not block AGY startup | E-004/006, E-022/023, E-028 | REQ-004; AC-004 |
| SCN-004 | Contract | AutoByteus AGY tool policy | Keep provider collaboration separate from tracked Team/Org work | AGY run activation | Supported CLI and configured agent | Native default non-collaboration tools and selected MCP tools are exposed; native subagent/messaging family is excluded | No provider-native collaboration path in AutoByteus AGY runs | Unsupported CLI tool names fail compatibly rather than silently narrowing grants | Supported Explicit Edge Scenario: user explicitly requests Claude-like exclusion | User clarification E-013; prior AGY approved design | REQ-001/005/006; AC-005/006 |

## UI, Interaction, And Experience Requirements
- Applicable: Yes — existing chat error and generated-file presentation only.
- Linked UI/UX or interaction supplement: N/A — not applicable; no new design requested.
- Prototype-specific fields: N/A — not applicable.
- Required states: native generated image result/path; safe native-tool failure. Missing-skill warning belongs in backend logs, not a blocking chat error.
- Unresolved product decisions: None on intended native-tool policy.

## Quality And Non-Functional Requirements
| ID | Related REQ/AC | Area | Constraint | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-002/004, AC-002/004 | Security | **SR-013 proposal:** No provider credentials, MCP session URL, private stack, raw provider stderr or raw skill-source exception in user-visible failures or backend skill warning; unsafe/unusable skill content is omitted rather than exposed, while unrelated runtime failures remain distinguishable. | Error/warning-path tests |
| QR-002 | REQ-001/003, AC-005 | Compatibility | Existing unaffected agent grants, AGY per-run isolation and historic run state unchanged. | Regression checks |

## Data Continuity And Acceptable Loss
- Persisted or external data affected: Existing agent runs and package config; no user content/schema transition intended.
- Preserve prior conversations/images and other agents' configuration.
- Acceptable loss/reset: New runs may be needed for changed tool grants; no deletion of old runs.
- Unknowns: Native AGY image capability and result payload inside the generated capsule have not been verified with a live app-backed invocation.

## External Contracts And Dependencies
| Dependency | Required Behavior | Evidence | Risk |
| --- | --- | --- | --- |
| AGY CLI native GenerateImage | Must be deliberately preserved for supported AutoByteus AGY runs | User CLI transcript and AGY capsule source | Compatibility and output projection unverified |
| AutoByteus generate_image | Separate app-owned tool; not a replacement for native AGY GenerateImage | Server media service/docs | Its provider/credential state is independent |
| Agent package repository | Codex workflow skill should resolve in normal package configuration, preserving its intended policy, but missing skill must not prevent AGY startup | Codex config and README; user E-022 | Skill currently absent in observed roots |

## Supplemental Artifacts
N/A — no behavior-defining supplement. Four user screenshots and CLI transcript are evidence referenced in investigation-notes.md.

## Assumptions And Open Decisions
| ID | Question / Assumption | Owner | Status |
| --- | --- | --- | --- |
| DEC-001 | Retain AGY defaults but exclude native subagent and messaging/collaboration tools? | User | Approved on 2026-09-26 in response to explicit SR-005 scope question; local AGY 1.2.11 selective allowlist probe supports it. Other native tools such as schedule/ask_question remain part of default policy unless technical validation reveals an incompatibility requiring a new user decision. |
| DEC-002 | Keep a portable Codex workflow skill for normal setup, but warn-and-continue when any configured skill does not exist, instead of a blocking prerequisite? | User | Approved in SR-010 by user's 2026-09-26 “yesss” reply; later user broadens warning policy to invalid skill content, pending SR-013 approval. |
| DEC-003 | For a present invalid/unreadable/colliding configured skill, should AutoByteus warn and omit that skill (recommended to keep AGY startup nonblocking), or copy it through and rely on AGY to reject/ignore it? | User | Open. User explicitly wants nonblocking startup; exact treatment of invalid skill content must be confirmed before affected design proceeds. |
| ASM-001 | CLI custom-agent frontmatter can preserve supported non-collaboration native tools through a validated explicit list; exact supported names and MCP coexistence must be verified per supported version | Architecture investigation | Selective AGY 1.2.11 probe passed; exhaustive set and future drift unverified |

## Traceability
| REQ | Use Cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-005 | SCN-001 |
| REQ-005 | UC-001 | BEH-001 | AC-005 | SCN-001, SCN-004 |
| REQ-006 | UC-001 | BEH-001 | AC-006 | SCN-004 |
| REQ-002 | UC-001, UC-003 | BEH-001, BEH-003 | AC-001, AC-002 | SCN-001 |
| REQ-003 | UC-002 | BEH-002 | AC-003, AC-005 | SCN-002 |
| REQ-004 | UC-003 | BEH-002 | AC-004 | SCN-003 |

## Architecture Phase Input
- Approved scenario IDs: SCN-001 to SCN-004 under SR-009/SR-010 for unchanged behavior; BEH-002/SCN-003/REQ-004/AC-004 skill-failure alternate is under SR-013 revision and not implementation-ready.
- Preserve run-scoped identity/MCP grants, generated AGY capsule, best-effort skill intent, safe diagnostics; evaluate native tool output projection separately from app-owned media.
- After approval, design must verify AGY native tool-list semantics, actual native GenerateImage invocation and output projection, security/team-tool exclusions, non-blocking missing-skill warning with safe provenance separation, and whether package-repository authoring needs a separate isolated worktree.
- No target architecture is approved by this document.

## Readiness Check
- Current behavior evidence-backed: Yes.
- Desired and preserved behavior explicit: Broad nonblocking skill-error intent is clear; copy-through versus warn-and-omit is open.
- Scope/non-goals clear: Yes.
- Requirements/ACs testable and traceable: Yes.
- Scenarios supported/evidence-backed: Yes.
- UI/UX supplement: N/A.
- Material assumptions visible: Yes.
- Content ready for user approval: No — resolve DEC-003 and reconcile BEH-002/REQ-004/AC-004 first.
- User approval received: No for SR-013; SR-009/SR-010 approval remains the prior baseline.
- Approved basis ready for affected design: No; affected skill policy is on hold. Unchanged native-image/tool policy remains approved.
