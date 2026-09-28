# Antigravity Version-Independent Simplification — Design

## Solution And Approval Basis
Package `antigravity-runtime-missing`; current solution revision **SR-003**; design **Ready**. Approved requirements: `requirements-doc.md` SR-003, explicit user commands to completely remove hard-coded versions and simplify code (quoted there). No normative supplements. Canonical evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-runtime-missing/tickets/in-progress/antigravity-runtime-missing/investigation-notes.md`.

## Current-State Read / Architecture Evidence
E-001–005 show installed 1.2.12 rejected by discovery and native profile; frontend hides disabled runtimes. E-009 establishes Codex/Claude availability does not compare CLI versions. Post-approval E-011–013 establishes the version's only production consumer is a redundant native-profile resolver; capsule consumes only eight tool names, not CLI version. Restore already uses model discovery and stored identity/capsule checks. E-014 identifies affected tests/current docs. These facts support a local deletion/simplification, not a new compatibility framework. Current live 1.2.12 initialization works; broader implementation validation is outstanding, not claimed complete.

## Intended Change
Remove CLI version probing/parsing, all exact-version rejection, the version-specific native-tool profile DTO/resolver and unnecessary discovery wrappers. Retain a single bounded capability-and-model discovery path. Capsule generation owns the unchanged static native-tool allowlist. Preserve actual launch/restore invariants and frontend behavior.

## Behavior And Production-Path Map
| Behavior | Approved requirements / AC | Trigger and target outcome | Path |
| --- | --- | --- | --- |
| BEH-001 | REQ-001/004, AC-001/002/005 | User opens configuration/starts AGY after upgrade; no version-only block | DS-001 availability and DS-002 new-run |
| BEH-002 | REQ-002, AC-003 | Discovery encounters absent CLI/features/models; preserve sanitized unavailable behavior | DS-001, DS-004 bounded subprocess |
| BEH-003 | REQ-003, AC-002/004 | Start/restore run; same tools, exact identity/conversation and saved data | DS-002/003; return events unchanged |

## Relevant Supplements
Use the complete inventory in investigation notes: actual installed backend response, CLI version/help/model/changelog, bounded compatibility probe and raw/summary results, frontend startup log and user screenshot. All are factual, no behavior approval. Prior `tickets/done/antigravity-cli-runtime-redesign-20260924/requirements-doc.md` is historical preserved-behavior context, not authority for retaining its now-superseded CLI version gate. No Product artifacts. Independent architecture/code reviews: N/A — not applicable to selected Medium/Low route.

## Task Design Health Assessment
- Posture: bug fix + approved behavior change + simplification.
- Issue: Yes. Root causes: Duplicated Policy Or Coordination and Shared Structure Looseness. Exact-version policy occurs in two discovery routines plus tool resolver; version metadata serves only the obsolete gate.
- Refactor needed now: Yes, small clean-cut removal. Existing ownership boundaries are otherwise sound.
- Response: delete version-only exports/DTO threading, keep capability/model parsing in existing discovery owner and tool declaration in existing capsule owner.
- No deferred refactor necessary for this scope. Remaining provider-upgrade risk is actual capability/protocol breakage, not a reason for a new version system.

## Terminology / Design Reading Order
CLI release version is provider software metadata, not capsule manifest `version: 1` (persisted schema). Follow discovery -> new/restore -> removals and file map -> validation.

## Legacy Removal Policy / Removal Plan
No compatibility wrappers or dual paths for replaced behavior.
| Remove | Replacement / rationale |
| --- | --- |
| CLI `--version` subprocess, semver parsing and exact-version branches | Existing bounded `--help` required-flag check; models discovery |
| `probeAntigravityCli` export (test-only caller) | Exercise real public `listAntigravityModels` and availability paths |
| `discoverAntigravityRuntime` `{version,models}` wrapper | One public `listAntigravityModels()` owns validation and parsing |
| `AgyNativeToolProfile`, `resolveAgyNativeToolProfile`, version-specific names/comments and `nativeToolProfile` parameter | Export constant `AGY_NATIVE_TOOL_NAMES` from existing policy file; capsule imports directly |
| Factory profile import/construction/threading | Factory validates model availability through existing `assertAvailable(config)` in both create/restore |
| Tests expecting version rejection / hard-coded live-test reported version | Version-independent regression tests; report observed runtime version or omit it |
No deletion of historical ticket evidence or unrelated dependency/schema versions.

## Persisted Data / State Transition
**Not Affected**. `agy-run-capsule.ts` writes `{version:1,runId,agentName,workspacePath,agentMarkdownHash,skillAccessMode,skills}` and Markdown with tool names, never CLI-version/profile metadata. Restore reads stored Markdown/hash as-is. Keep exact tool sequence and Markdown formatting to avoid incidental output change; do not regenerate existing capsules. No volume scan, migration, reset or rewrite; no deployment maintenance window. AC-004 protected. Migration plan: N/A.

## Data-Flow Spine Inventory / Primary Spines
| ID / scope | Arrow chain | Owner / purpose |
| --- | --- | --- |
| DS-001 primary + return | User runtime selector -> GraphQL runtime availability -> RuntimeAvailabilityService -> listAntigravityModels -> bounded agy help/models -> availability DTO -> store/options | Availability service translates real discovery; only version-based false rejection removed |
| DS-002 primary | User starts standalone/team/org member -> existing run manager/provider factory -> AgyAgentRunBackendFactory -> model validation + capsule creation -> AgyStreamProcess -> installed CLI -> validated init/backend | Backend factory owns run lifecycle, capsule owns configuration, stream owns subprocess |
| DS-003 primary | User reopens saved run -> restore context/factory -> model validation -> stored capsule restore -> AgyStreamProcess with exact conversation -> validated backend | Existing restore invariants preserved, discovery no longer version-gated |
| DS-004 bounded local | runCommand spawn -> bounded stdout/stderr -> timeout/error/close -> typed result/error | Discovery subprocess owner; unchanged bounds and sanitized errors |

## Spine Narratives / Actors / Ownership Map
DS-001: frontend requests capabilities; backend runs `--help`, rejects missing flags, then `models`, rejecting failure/empty result. Returned enabled row makes the unchanged selector show Antigravity. Capability failure still gives existing disabled row.
DS-002: common AGY backend factory calls its model-availability assertion before preparing identity, skills, MCP and capsule. Capsule uses one fixed product tool allowlist without CLI metadata. Factory starts stream and retains model, agent, cwd and permission checks. Team/org use this same factory, not a parallel version path.
DS-003: restored AGY run checks available model, reads original capsule, validates unchanged hash/workspace/conversation and resumes. No new allowlist applied to stored capsule.
DS-004: preserve bounded asynchronous process completion, nonzero/ENOENT/timeouts and output limits; no blocking new probe or negotiation added.
Main subjects remain runtime availability, AGY backend, run capsule and CLI stream. Existing GraphQL facade only exposes capability DTO; it must not gain CLI policy.

## Return/Event And Bounded Local Spines
Discovery results/errors -> availability/caller; CLI NDJSON -> existing parser/converter/backend events -> normal frontend/history. Event lifecycle unchanged. DS-004 is the only relevant local subprocess spine; no new event loop.

## Off-Spine Concerns
| Concern | Serves | Responsibility / placement |
| --- | --- | --- |
| Native-tool policy constant | capsule creation DS-002 | Exact existing eight allowed names; not a version resolver or dynamically broadened registry |
| Error diagnostic mapping | discovery DS-001/004 | Sanitized existing codes; unsupported message describes missing features, not release version |
| Prompt/skills/MCP materialization | backend/capsule DS-002/003 | Existing identity/configuration responsibilities unchanged |
| Capsule hash and provider identity validation | restore/backend DS-003 | Preserved invariant enforcement; no compatibility fallback |

## Ownership Boundaries / Boundary Encapsulation / Dependency Rules
- Availability and backend factory call public `listAntigravityModels`; neither invokes raw CLI probing or imports internal parsing.
- `listAntigravityModels` owns help + model command sequence; `runCommand` remains private and bounds child I/O.
- Factory owns capsule lifecycle, not individual tool profile selection. `createAgyRunCapsule` internally imports policy constant; upstream callers no longer construct or pass policy DTOs.
- Capsule restore retains its own stored representation; do not bypass it, rewrite it or substitute a new conversation.
- No frontend special-case enablement, no duplicated version checks or version feature registry.

## Interface Boundary Mapping / Check
| Interface | Singular responsibility / identity | Change / ambiguity |
| --- | --- | --- |
| listAntigravityModels(): Promise<{id,name}[]> | installed configured CLI catalog; no run selector | Existing public return unchanged, absorbs discovery; Low ambiguity |
| createAgyRunCapsule(input) | explicit runId, memoryDir, workspace, definition, identity and skills | Remove redundant nativeToolProfile field; internal product policy; Low ambiguity |
| createBackend / restoreBackend | existing config/runId or context | Reuse existing assertAvailable; signatures unchanged |
| runtimeAvailabilities GraphQL | runtimeKind capability | No wire change |

## Naming / Reuse / Subsystem Allocation
All existing owners reused. Runtime management retains discovery and diagnostics; AGY backend retains run orchestration; capsule retains native tool policy/materialization. `AGY_NATIVE_TOOL_NAMES` expresses data, not a version/profile service. No new subsystem, registry, abstraction or folder. Natural names retained; version-labelled names removed.

## Draft To Final File Responsibilities / Reusable Structures / Tightness
Initial alternatives were another version-profile resolver or a generic compatibility table; both rejected. Tightened result: plain readonly tool-name constant, no CLI-version field or profile wrapper, no new shared DTO. Existing `{id,name}` model result remains singular. Use existing structure rather than extract a new module.

## Final File / Folder Mapping And Change Inventory
All paths below under `autobyteus-server-ts/`.
| Action / file | Owner / concrete change |
| --- | --- |
| Modify `src/runtime-management/antigravity-cli-capability.ts` | Remove version commands/regex/gates and test-only probe; put help + model parsing directly into listAntigravityModels; retain command override, limits, errors and required flags. Rewrite unsupported diagnostic to feature-based wording, preserving code. |
| Modify `src/agent-execution/backends/antigravity/capsule/agy-native-tool-policy.ts` | Export readonly eight-name constant, no version metadata or resolver. Keep comment explaining allowlist (not denylist). |
| Modify `src/agent-execution/backends/antigravity/capsule/agy-run-capsule.ts` | Import constant, remove profile type/input and render same tool declaration. Manifest/restore unchanged. |
| Modify `src/agent-execution/backends/antigravity/backend/agy-agent-run-backend-factory.ts` | Use existing assertAvailable for new and restore; remove obsolete discover/profile dependencies and argument. |
| Modify focused tests | Capability, native policy, capsule, configured skill, live production and E2E native-image tests referencing removed symbols/fields. Preserve assertions unrelated to profile plumbing; ensure exact production allowlist assertion. |
| Modify `docs/modules/antigravity_cli_runtime.md` | Remove current version-pinned guidance; explain capability-based behavior and unchanged tools. Delivery owns final doc synchronization. |
No Add/Move source files. No frontend edit. Existing runtime-management/backend/capsule folder depth correctly separates discovery, lifecycle and materialization; over-splitting risk avoided.

## Applied Patterns / Derived Layering
N/A — no new patterns or layers. Existing backend factory/capsule functions and private subprocess utility suffice.

## Concrete Shape Guidance
Good: `await this.assertAvailable(config); ... createAgyRunCapsule({...})` with capsule-owned fixed tools.
Avoid: `supportedVersions.includes(version)`, `version >= minimum`, `resolveProfile(version)` or passing `{cliVersion, tools}` through multiple owners. No CLI `--version` is necessary to determine required help/model support.

## Backward-Compatibility Rejection Log
| Mechanism | Decision / replacement |
| --- | --- |
| Add 1.2.12 to list or accept a semver range | Rejected: repeats user-rejected version coupling; actual required capability checks instead |
| Keep unused resolver accepting ignored version argument | Rejected: obsolete plumbing removed cleanly |
| Rebuild old capsules for new profile | Rejected: no data/schema need, preserve original snapshots |
| Hide actual feature errors by enabling AGY unconditionally | Rejected: preserve existing failure boundaries |

## Change Sequence / Implementation Guidance
1. Keep current branch/task worktree; read AGENTS instructions. Change native policy/capsule signature/factory together and migrate all actual symbol consumers.
2. Collapse discovery to listAntigravityModels with bounded help/models; delete unused probe/discover APIs and version handling. Missing executable remains discoverable through help spawn failure.
3. Update unit test fake modes: timeout/oversize help replaces obsolete version-probe cases; missing flags remains rejected. Ensure `--version` is never requested (fake may throw if it is), and alternate/arbitrary version strings cannot control outcome. Retain model and concurrent-health regressions.
4. Update capsule/skill test setup to no injected profile; assert exact production eight names. Fix live test version reporting and obsolete current docs; do not modify historical completed ticket evidence.
5. Run focused nonwatch suites and server build/type checks. Audit removed symbols/version literals in AGY production sources. Preserve manifest schema number and unrelated dependency versions.
6. Validate installed CLI through changed production discovery and new/restore paths, backend capability API and shared team selector. Prefer isolated test backend/data; do not patch running production resources or restart active user runs. API/E2E owns independent executable validation and browser evidence. A frontend paired with old packaged backend still reproduces failure, not the fix: use a backend built from this branch to verify correction.

## Key Tradeoffs / Risks
No CLI-release gate means future real upstream breaks surface through capability/model/init/protocol errors rather than a preemptive version block. This is explicitly requested, not proof that every future release is compatible. Tool names and protocol checks remain unchanged. `init.tools` broad registry from earlier probe is not proof of effective exposure; preserve exact declared tools, do not invent dynamic tool grants. Current version availability proven only after implementation; no false completion claim. Browser control previously unavailable; report any validation gap. Removing profile test injection requires focused assertion updates, not deleting coverage.

## Task Size And Architectural Risk — Completed Design Classification
- `task_size`: **Medium**. Four existing production files, several directly affected tests and one current doc; bounded local simplification within existing owners.
- `architectural_risk`: **Low**. No new/changed API wire shape, persistence schema, tool grant, authentication boundary, subprocess security, concurrency model, deployment mechanism or ownership boundary. Approved admission semantics change from release number to already-existing capabilities. Existing limits and init/restore validation remain; local 1.2.12 basic real CLI evidence supports feasibility.
- Payload versus structure: evidence volume is irrelevant; actual structural delta is removal of internal unused version wrapper/profile plumbing, not new runtime architecture. Tool declaration payload remains identical.
- Escalation: actual tool exposure must change, persistence/identity needs modification, public consumer of removed APIs is discovered, or runtime protocol changes are required -> stop affected work and return Design Impact/Requirement Gap for reclassification; do not broaden silently.
