# Requirements Document

## Document Status
- Status: Approved — SR-013 Codex-parity AGY skill validation and nonblocking invalid-skill handling
- Current solution revision ID: SR-015
- Package identifier: agy-runtime-image-codex-prep-20260926
- Request / ticket: User request of 2026-09-26, CLI transcript and four attached screenshots
- Requirements owner: Solution Designer
- Date: 2026-09-26
- Approval state and reference: SR-005 native-tool baseline was approved by user on 2026-09-26 in reply to the explicit scope question (“Okay … we shouldn't block their own tools …”). The user's later instruction that a nonexistent skill should warn in the backend rather than block AGY startup prompted SR-009. The user explicitly approved the full revised behavior in reply “yesss” to the question spelling out warn-and-start, omit only genuinely missing skills, keep other skills, preserve unsafe-source/unrelated failures, and still make Codex's workflow skill portable. The user then replied “approve” to the explicit SR-013 question defining Codex-parity validation/warn-and-skip for missing or invalid content and separate safety failures (E-034).
- Exact approved requirements baseline: SR-009 content, approved in SR-010 by user's 2026-09-26 “yesss” reply, remains historical authority for all unchanged behavior. After learning AutoByteus does validate configured `SKILL.md` for Codex App Server, the user directed AGY to follow the same validation approach (E-033). This changes BEH-002/REQ-004/AC-004/QR-001 from SR-012’s fatal invalid-candidate rule; the reconciled SR-013 requirements are **approved** in E-034.
- Behavior-defining supplements: N/A — no separate product supplement

## Problem And Desired Outcome
The same user's standalone Antigravity CLI can invoke native GenerateImage, but an AutoByteus Software Development Department Solution Designer running through Antigravity CLI denies image capability. A separate AutoByteus Codex agent using that runtime fails during preparation with only a generic error. The user's repeated clarification makes the image target unambiguous: the tool supplied by AGY itself must be usable in AutoByteus-launched AGY runs. AutoByteus's MCP `generate_image` is not a substitute and its availability must not count as meeting native-image acceptance criteria. The desired outcome is native runtime capability parity within an explicitly approved exposure scope, with generated output usable in the app; the standalone Codex agent should start with its intended skill **when available**, but absence of a configured skill must warn in the backend and not block startup. User clarified the desired provider boundary: retain AGY's default native tools, except provider-native subagent and messaging/collaboration tools when AGY supports excluding them, and add agent-configured AutoByteus MCP tools. A local AGY 1.2.11 probe confirms selective native allowlisting is possible; the CLI custom-agent contract currently documents an allowlist rather than a subtractive denylist. A version-verified native list may therefore be required, and automatic inheritance of future CLI tools is not promised without compatibility validation. IR-001 implementation work began under the prior SR-012 skill policy; its affected skill path is paused pending revised design and review.

**SR-013 approved change:** The user initially preferred raw copy-through (E-030), then explicitly made the AGY policy conditional on the actual Codex App Server behavior (E-033). Static source shows AutoByteus already parses configured Codex `SKILL.md` metadata and checks declared name before exposing a skill (E-032). The approved AGY rule is therefore the same content judgment: validate the configured skill using shared AutoByteus skill parsing/name rules; if the source is missing or its manifest is malformed, unreadable, or name-mismatched, emit a sanitized backend warning, omit that skill, and continue an otherwise healthy run with other valid skills. Do not copy invalid content through or make malformed content an AGY preparation hard failure. Keep filesystem containment and source/destination collision failures separate from content invalidity; they remain blocking safety failures, as in the approved SR-010 boundary and Codex materializer. If AGY rejects content that passes AutoByteus validation, report provider failure safely rather than promise startup. The existing Codex global-invalid edge may still throw (E-032); that is not a product behavior to deliberately replicate. The user approved this intended rule in E-034. Live symlink updates remain out of scope.

## Relevant Current And Desired Behavior
| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Standalone AGY default agent can use native image generation. AutoByteus-generated custom AGY agent hard-codes eight coding tools, omitting native image generation. | Every AGY-backed AutoByteus agent retains the supported installed CLI's default native non-collaboration capabilities, including image generation, with app-configured MCP tools added separately; AGY-native subagent and messaging tools are excluded across AutoByteus AGY runs. | Run identity and MCP grants remain scoped; app-owned media tool stays distinct. | E-001, E-002, E-003, E-010, E-012 |
| BEH-002 | User | SCN-002, SCN-003 | Standalone Codex agent config references software-engineering-workflow-skill, which is absent from configured discovery roots; AGY capsule rejects unresolved binding; UI shows only generic preparation failure. | **SR-013 approved:** AutoByteus validates configured AGY skills using the same `SKILL.md` metadata/name rules used for Codex. Missing, malformed, unreadable or name-mismatched skill content yields a sanitized backend warning and is omitted, without blocking an otherwise healthy AGY run. | Skipped skills are not falsely reported as loaded; other usable skills remain available; unsafe source paths are not copied; source/destination safety failures and unrelated base-runtime failures remain blocking. | E-004–E-006, E-022/023, E-028–E-033 |
| BEH-003 | System | SCN-001 | Native AGY image output may save under its own brain directory. The AGY converter wraps native tool output; the current file projection expects certain output-path shapes. Exact native event payload remains unverified. | Native generated image result/path is usable from the AutoByteus run without false success or misleading absence. | App-owned media provider behavior remains independent. | E-001, E-007, E-009 |

## Stakeholders, Actors, And Outcomes
| Actor | Goal / Responsibility | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User | Ask Solution Designer for an image and run standalone Codex | Understand capability and get usable output or actionable failure | No need to infer hidden runtime setup |
| Solution Designer agent | Use only configured capabilities truthfully | Invoke image tool when granted; avoid false denial or false claim | Team-scoped tool grants |
| Codex agent | Start with declared workflow skill when present | Proposed: AutoByteus validates configured skill metadata as for Codex and exposes only valid sources | Missing/invalid skill is warned and not falsely treated as loaded |
| App operator | Maintain AGY availability and configured skills | Proposed: backend warning identifies absent/invalid run and skill; unsafe-source and AGY-origin failures remain distinguishable | No credential leakage |

## Scope Guardrail
### In-Scope Use Cases
- UC-001: A user uses an AGY-backed AutoByteus agent with the installed CLI's default native tools, including image generation, plus that agent's configured MCP tools.
- UC-002: A user starts the standalone Codex agent with the AGY runtime and gets a first response.
- UC-003: A configured skill is absent or semantically invalid, a source/destination is unsafe, AGY rejects otherwise validated skill content, or native AGY image capability is unavailable; approved skill policy warns/skips absent/invalid content while safety, provider-origin and native-image failures remain accurately and safely reported.

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
Preserve BEH-001 to BEH-003 per-run identity and capsule isolation, app-owned MCP grants, and credential-safe errors. AGY-native subagent and messaging tools are excluded; AutoByteus team communication/delegation continues through configured MCP tools. **SR-013 approved:** AutoByteus semantically validates configured AGY `SKILL.md` using the same shared metadata/name rules as Codex. Missing, malformed, unreadable or name-mismatched skill content warns/skips without blocking an otherwise healthy run; other valid skills remain. It must not copy an invalid/unsafe path or claim a skipped skill loaded. Unsafe provenance/collision and unrelated base AGY startup failures remain failures, not content warnings. AGY may still reject otherwise validated content, in which case its failure is safely reported.

### Review Authority
Blocking design or implementation findings must cite these approved IDs once approved. SR-013 changed behavior was explicitly approved by the user in E-034; downstream design/review must use this baseline.

## Requirements
| ID | Requirement | Related Behaviors | Priority | Rationale / Source |
| --- | --- | --- | --- | --- |
| REQ-001 | AGY-backed AutoByteus agents retain the supported installed CLI's default native non-collaboration capabilities, including native image generation, alongside separately configured MCP tools; an app-owned media grant alone is not native parity. Supported CLI version drift must not silently remove previously supported native capabilities. | BEH-001 | High | User clarification; E-001 to E-003, E-010, E-012/013 |
| REQ-002 | A native GenerateImage invocation must leave the user with an accessible image/result path in the AutoByteus run; native tool failure or unavailability must not be presented as success, and failure reporting must remain credential-safe. | BEH-001, BEH-003 | High | User request and clarification; E-001, E-009 |
| REQ-003 | The standalone Codex agent can start an AGY-backed first turn; its intended workflow skill is present and usable in the normal configured package, without making skill availability a startup prerequisite. | BEH-002 | High | User screenshot; Codex package README E-005; user clarification E-022 |
| REQ-004 | **SR-013 approved:** AGY configured skills use the same AutoByteus `SKILL.md` metadata/name validation applied for Codex App Server. An absent folder or malformed, unreadable or name-mismatched manifest produces a sanitized backend warning identifying run, skill and safe reason; only that skill is omitted and otherwise healthy AGY startup and other valid skills continue. A valid source is materialized for AGY; no skipped or merely materialized skill is claimed as loaded. Unsafe source provenance, protected destination collisions and unrelated base-runtime/capsule failures remain blocking safety/system failures with safe reporting; AGY-origin rejection of a validated skill remains a possible provider failure. | BEH-002 | High | User E-028/E-033; Codex comparison E-032; prior safety approval E-024 |
| REQ-005 | AutoByteus-configured MCP tools remain additive to native AGY tools and scoped to the agent/run's configured exposure. | BEH-001 | High | User clarification; E-008, E-012 |
| REQ-006 | AGY-native subagent spawning/definition/management and native inter-agent messaging are not exposed to AutoByteus-launched AGY agents; AutoByteus Team/Org collaboration remains through its configured MCP tools. | BEH-001 | High | User clarification; prior AGY design scope; E-013 |

## Acceptance Criteria
| ID | Related Requirements | Related Behavior / Scenario | Trigger | Observable Expected Outcome | Failure / Alternate | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001, SCN-001 | New AGY-backed Solution Designer asks for a dog image with AGY-native generation available | AGY's own native `generate_image` is invoked (verified by provider tool-call provenance, not an AutoByteus MCP call), and the AutoByteus run presents a real image/result path | An AutoByteus MCP-generated image alone does not pass; no false claim when native tool fails | Real AGY-backed app-run check with native tool-call and output evidence |
| AC-002 | REQ-002 | BEH-003, SCN-001 | AGY-native image generation unavailable or fails | User sees an accurate safe failure; no fabricated image or success | Credentials and raw private diagnostics absent | Controlled native-tool failure test |
| AC-003 | REQ-003 | BEH-002, SCN-002 | New standalone Codex run using AGY and normal configured package | Run prepares and answers first prompt with intended workflow skill available | No generic preparation failure | First-turn integration check |
| AC-004 | REQ-004 | BEH-002, SCN-003 | **SR-013 approved:** configured AGY skill absent, malformed/unreadable `SKILL.md`, name-mismatched metadata, valid, or unsafe source/destination | Absent/semantically invalid skill yields sanitized backend warning, no materialized skill, and AGY starts if otherwise healthy; other valid skills remain. A valid configured skill is materialized and available to AGY. | Unsafe provenance/collision remains a safely reported preparation failure; AGY may reject otherwise validated content; no false loaded-skill claim or raw stack/secret | Controlled missing/invalid/valid/safety tests plus first-turn provider check |
| AC-005 | REQ-001, REQ-003, REQ-005 | BEH-001, BEH-002 | AGY standalone and Team/Org runs | Supported default non-collaboration native capabilities and separately configured MCP tools coexist; run identity/permissions and Codex startup remain correct | No unconfigured MCP grants | Versioned runtime and regression checks |
| AC-006 | REQ-006 | BEH-001, SCN-004 | New AGY-backed standalone or Team/Org run | Native AGY subagent and messaging calls are unavailable while configured AutoByteus MCP collaboration still works where appropriate | No untracked provider-native collaboration masquerades as AutoByteus Team activity | Selective-tool and Team/Org MCP checks |

## Relevant Scenarios And Journeys
| ID | Kind | Actor / Event | Goal | Supported Trigger | Starting Condition | Product-Level Sequence | Expected Outcome | Alternate / Error | Validity | Evidence | Related IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User asks AGY-backed agent to generate image | Obtain native AGY image in app | AutoByteus AGY standalone/Team/Org chat | New AGY run | User asks; agent uses default native image tool; app presents result/path while configured MCP tools remain available | Image usable and path retrievable | Native failure gives accurate safe error | Supported Normal Scenario; SR-005 approved | User clarifications, CLI transcript, capsule/probe evidence E-001/003/012/014 | REQ-001/002/005; AC-001/002/005 |
| SCN-002 | User | User starts Codex | Get assistant reply | Standalone agent chat | New AGY Codex run | User sends hello; run prepares; assistant responds | First reply | None beyond normal runtime failure | Supported Normal Scenario | Screenshot, metadata, log E-004/005 | REQ-003; AC-003 |
| SCN-003 | System | Configured skill absent or invalid | **SR-013 approved:** mirror Codex content validation with nonblocking per-skill disposition | Run preparation | One configured skill is absent, has malformed/unreadable/name-mismatched `SKILL.md`, or has an unsafe source/destination; base AGY runtime otherwise healthy | User sends first message; AutoByteus validates metadata/name as for Codex, warns/omits missing or invalid content, materializes valid sources for AGY | Missing/invalid content does not block; valid other skills remain available; agent can respond | Unsafe provenance/collision is a preparation failure; AGY may reject validated content; no false loaded-skill claim | Supported Explicit Edge Scenario: user directs Codex-parity judgment and earlier nonblocking invalid-content outcome | E-004/006, E-022/023, E-028–E-033 | REQ-004; AC-004 |
| SCN-004 | Contract | AutoByteus AGY tool policy | Keep provider collaboration separate from tracked Team/Org work | AGY run activation | Supported CLI and configured agent | Native default non-collaboration tools and selected MCP tools are exposed; native subagent/messaging family is excluded | No provider-native collaboration path in AutoByteus AGY runs | Unsupported CLI tool names fail compatibly rather than silently narrowing grants | Supported Explicit Edge Scenario: user explicitly requests Claude-like exclusion | User clarification E-013; prior AGY approved design | REQ-001/005/006; AC-005/006 |

## UI, Interaction, And Experience Requirements
- Applicable: Yes — existing chat error and generated-file presentation only.
- Linked UI/UX or interaction supplement: N/A — not applicable; no new design requested.
- Prototype-specific fields: N/A — not applicable.
- Required states: native generated image result/path; safe native-tool failure. Missing/invalid-skill warning belongs in backend logs, not a blocking chat error.
- Unresolved product decisions: None on intended native-tool policy.

## Quality And Non-Functional Requirements
| ID | Related REQ/AC | Area | Constraint | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-002/004, AC-002/004 | Security | **SR-013 approved:** No provider credentials, MCP session URL, private stack, raw provider stderr or raw skill-source exception in user-visible failures or backend warnings; source-path containment and safe materialization remain required; AutoByteus uses Codex-parity semantic skill validation, and provider-origin failures remain distinguishable and safely redacted. | Error/warning-path tests |
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
| DEC-002 | Keep a portable Codex workflow skill for normal setup, but warn-and-continue when any configured skill does not exist, instead of a blocking prerequisite? | User | Approved in SR-010 by user's 2026-09-26 “yesss” reply; later user directs Codex-parity validation for AGY, approved as SR-013 in E-034. |
| DEC-003 | Should AGY configured skills use the same AutoByteus `SKILL.md` metadata/name validation as Codex, warning/skipping missing or invalid content instead of copying invalid content through or hard-failing it? | User | E-033 condition applies because E-032 establishes Codex does judge. Full reconciled SR-013 baseline, including safety/provider-failure boundary, approved by user “approve” in E-034. |
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
- Approved scenario IDs: SCN-001 to SCN-004 under SR-009/SR-010 for unchanged behavior; BEH-002/SCN-003/REQ-004/AC-004 skill-failure alternate is approved as SR-013/E-034, with affected design revised in SR-015 and re-review pending.
- Preserve run-scoped identity/MCP grants, generated AGY capsule, best-effort skill intent, safe diagnostics; evaluate native tool output projection separately from app-owned media.
- After approval, design must verify AGY native tool-list semantics, actual native GenerateImage invocation and output projection, security/team-tool exclusions, non-blocking missing/invalid-skill warnings with safe provenance separation, and whether package-repository authoring needs a separate isolated worktree.
- No target architecture is approved by this document.

## Readiness Check
- Current behavior evidence-backed: Yes.
- Desired and preserved behavior explicit: Yes — shared metadata/name validation; warning/omission for absent or semantically invalid skills; blocking safety/unrelated failures; AGY-origin failure remains possible.
- Scope/non-goals clear: Yes.
- Requirements/ACs testable and traceable: Yes.
- Scenarios supported/evidence-backed: Yes.
- UI/UX supplement: N/A.
- Material assumptions visible: Yes.
- Content ready for user approval: Yes — E-033 condition and E-032 evidence settle judgment direction; affected BEH-002/REQ-004/AC-004 were reconciled and approved in E-034.
- User approval received: Yes — user replied “approve” on 2026-09-26 to the explicit SR-013 approval question summarizing validate/warn/skip for missing or invalid content and separate blocking unsafe paths/collisions (E-034).
- Approved basis ready for affected design: Yes; affected skill design was revised in SR-015 and is awaiting independent re-review. Unchanged native-image/tool policy remains approved.
