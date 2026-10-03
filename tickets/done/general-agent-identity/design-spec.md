# General Agent identity — design spec

## Solution and approval basis
- Package `general-agent-identity`; current solution revision `SR-002`; design status **Ready**.
- Approved requirements: requirements-doc.md, SR-002, user **“coool. lets go approved”** following the complete prompt link.
- Exact approved supplement: general-agent-prompt.md v1, SHA-256 `d410e6f60d923ff66849961fd8b15c461fc6c08d254ef66a7d4a92a8299cbe1a`.
- Canonical investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-agent-identity/tickets/in-progress/general-agent-identity/investigation-notes.md`.
- Internal software workspace only; public package is reference context, not an edit target.

## Current-state read
The server registry identifies the built-in default by `autobyteus-daily-assistant` and template directory `daily-assistant`, with display name Daily Assistant. Bootstrap overwrites platform-owned definition content from that template on every startup and refreshes definition cache. File provider parses authored name/body separately from the stable ID. Default web Chat references that ID and displays definition-derived name. Standalone runtime contexts already provide collaboration; discovery is opt-in from definition tools. Existing prompt/skill owners need no restructuring. See AE-001–008.

## Architecture investigation evidence
| Evidence | Decision |
| --- | --- |
| AE-001–003 | Change shipped content/display name; preserve default identity and paths; existing startup applies updated content. |
| AE-004–007 | Add discovery selection, reuse existing native/MCP and collaboration composition; no adapter/prompt-composer refactor. |
| AE-008, AE-012 | No historical rewriting/migration; snapshots and stored host addresses stay intact. |
| AE-009–011 | Extend focused bootstrap/config/template assertions; align active test fixtures/docs and validate actual default Chat. |

Raw commands/source findings remain in investigation-notes.md. No remaining material architecture uncertainty for this bounded delta; runtime validation is downstream work, not a claimed pass here.

## Intended change
1. Copy the approved supplement **byte-for-byte** to `autobyteus-server-ts/src/built-in-agents/templates/daily-assistant/agent.md`, including name, description, role and complete body.
2. Set the existing registry entry's `displayName` to `General Agent`.
3. Add `list_available_agents` exactly once to existing built-in `agent-config.json.toolNames`. Preserve every other config value and current tool; preserve `skillScope: ALL_INSTALLED`.
4. Align current name assertions/fixtures/comments/documentation within affected behavior. Do not rewrite completed-ticket evidence, user history or public repository.
5. Do not rename the definition ID, template directory, exported constant or frontend default string. They are stable opaque selectors, not alternate legacy execution paths. Display naming does not require identity migration.

## Relevant behavior and production-path map
| Behavior | Approved requirements / ACs | Trigger | Existing evidence | Target path / preserved outcome |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001/004/006, AC-001/004/006 | Startup then user opens New Chat | AE-001–003,007–008 | DS-001 refreshes same built-in ID with exact General Agent template; catalog/default launch name changes; historical records not rewritten. |
| BEH-002 | REQ-002/005, AC-002/005 | Request benefits from specialist | AE-004–007 | DS-002 exposes configured discovery through existing runtime, accesses eligible catalog, returns names/kinds/addresses/descriptions; existing collaboration handles any selected specialist. |
| BEH-003 | REQ-003/004/006, AC-003/004/006 | General Agent handles request directly or discovery has no useful result | AE-002,004,007 | DS-001 and DS-003 carry exact skill/direct-work fallback; existing tools and skill catalog remain authoritative. |

## Relevant supplemental task artifacts
- `/Users/normy/autobyteus_org/autobyteus-worktrees/general-agent-identity/tickets/in-progress/general-agent-identity/general-agent-prompt.md`: approved exact definition/prompt v1; all REQ/ACs; do not paraphrase.
- Product artifacts, independent review artifacts: **N/A — not applicable** for this prompt/config change and completed Small/Low classification.

## Task design health assessment
- Change posture: Behavior Change, bounded name/prompt/config content.
- Current design issue: No. Root cause classification: No Design Issue Found.
- Refactor needed now: **No**.
- Evidence: bootstrap owns platform-owned definition refresh; provider owns parsing; runtime tool exposure owns opt-in discovery; collaboration roots own listing/communication. AE-001–007.
- Response: replace authored content and display name, select existing tool, add focused assertions; preserve dependency direction.
- No structural refactor/deferred design defect. Residual risk is nondeterministic model routing, validated truthfully rather than claimed guaranteed; approved prompt allows judgment.

## Terminology and reading order
General Agent is the displayed identity of the same default built-in definition. Specialist discovery means available agents/teams in the current runtime, not all files in the public package. Read approved prompt, requirements, evidence then this spec. No new architecture vocabulary.

## Legacy removal policy
Replace old **current displayed name and authored self-identification** cleanly. No dual-name selector, aliases, compatibility wrapper or old/new runtime branch. Stable IDs/constants/directories remain single existing selectors; preserving them is not backward-compatibility code.

## Persisted data / state transition decision
- Built-in source: shipped `templates/daily-assistant/{agent.md,agent-config.json}`; installed copy `agents/autobyteus-daily-assistant/`.
- Shape change: None; name/body and one tool-list element only. Registry/reader schema and IDs unchanged.
- Decision: **Discard or Rebuild** for platform-owned definition CONTENT through its already-established startup refresh; **Directly Usable — No Migration** for existing run records, saved references and collaboration addresses.
- AE-001: normal bootstrap copies authoritative files and refreshes cache. AE-002: ordinary provider reads exact current shape independent of display name. AE-003: same default selector. AE-005: stored host addresses reused. AE-008: old name snapshots remain valid strings, new indexing resolves current definition.
- User data preserved, no reset/history rewrite. Existing copy replacement is already governing platform-owned behavior, not newly introduced disposal of user data.
- Approximate volume: two small authored definition files, no history scan; repository inspection suffices because no historical payload format changes.
- Governing policy: canonical data_migration_guideline.md inspected (AE-012). Predecessor source dispositions/migration admission changes N/A: no migration or historical transformation designed.
- Migration plan: **N/A — no migration required**. No journal, startup gate, schema change or parallel path.

## Data-flow spine inventory
| Spine | Scope | Behaviors | Start → end | Governing owner / purpose |
| --- | --- | --- | --- | --- |
| DS-001 | Primary end-to-end | BEH-001/003 | Server startup → built-in bootstrap/template copy → normal provider/catalog → default Chat launch → runtime identity/prompt | Bootstrap owns installed definition refresh; execution owns launch/composition. New name/prompt reaches real default chat. |
| DS-002 | Primary end-to-end | BEH-002 | User specialist-suited request → configured runtime discovery tool → sender collaboration root → eligibility/catalog → returned collaborators → existing communication/specialist | Discovery contract and collaboration root; existing capability, new selection only. |
| DS-003 | Primary end-to-end | BEH-003 | User request → General Agent prompt → existing available-skill catalog / tools → direct work → evidence-grounded answer | Existing runtime skills/tools; prompt guides direct work without new orchestration owner. |

## Primary execution spines and narratives
DS-001 carries the shipped definition through normal startup/provider boundaries into default Chat; composer renders General Agent identity and approved body, with runtime-owned collaboration instructions alongside it. DS-002 routes opt-in discovery through native binding or MCP adapter into the same collaboration root; returned exact addresses can be used through existing collaboration tools. Discovery creates no collaborators on its own. DS-003 uses available skills when relevant and direct reasoning/tools otherwise; limitations are reported rather than invented capabilities. These are existing flows, not new subsystems.

## Spine actors, ownership map and authoritative boundaries
| Owner | Responsibility |
| --- | --- |
| Built-in registry/templates | Single shipped identity, configuration and content authority. |
| BuiltInAgentBootstrapper | Installs/replaces platform-owned content at stable ID, refreshes catalog. |
| AgentDefinitionService/provider | Current definition parsing/cache and public definition lookup. |
| Default Chat/agent execution | Same default selection, lifecycle and provider invocation. |
| Runtime tool exposure + discovery contract/native binding/MCP adapter | Opt-in tool exposure, sender-scoped read-only discovery entrypoint. |
| Collaboration root/candidate policy | Eligible definitions, authoritative addresses and messaging/delegation semantics. |
| Skills/runtime tools | Available workflows/capabilities; no automatic borrowing of specialist skills. |

## Thin entry facades / public wrappers
N/A — no new wrapper. Existing discovery native/MCP adapters are thin transport entries to `listAvailableAgentsFor`; collaboration root retains listing authority.

## Removal / decommission plan
| Remove | Replacement | Scope |
| --- | --- | --- |
| Daily Assistant name/self-introduction in current built-in shipped content and registry display | Exact General Agent supplement and same registry entry | In this change |
| Old default display-name assertions/current representative fixtures/comments/docs | General Agent expectations/prose | In this change, preserving IDs and historical evidence |
No file decommission or runtime branch removal is necessary; no branch is being introduced.

## Return/event and bounded local spines
Discovery result returns through existing adapter/tool to the agent; specialist outcomes use existing collaboration contracts. No changes to event handling, worker loops or callback ownership. Bounded local spines N/A — none altered by this content/config delta.

## Off-spine concerns and dependency rules
- Template asset copying serves bootstrap; existing build script unchanged.
- Registry/cache/catalog serves definition resolution; no UI bypass into app-data files.
- Runtime-owned skill catalog serves direct execution; no private specialist skill loader added.
- Existing candidate policy serves collaboration root; no public-repository list hard-coded into prompt or runtime.
- Only definition configuration selects discovery; do not make it globally automatic or alter eligibility.
- Use authoritative definition and discovery/collaboration boundaries, never parse catalog/runtime internals in Chat.

## Boundary encapsulation and interface mapping/check
| Boundary | Encapsulated mechanism / accepted identity | Caller / check |
| --- | --- | --- |
| AgentDefinitionService | File provider/template content, stable definition ID | Default Chat/execution; no reader/schema change; singular responsibility. |
| listAvailableAgentsFor | Sender root lister; zero arguments, sender context | Existing native/MCP adapter; returned kind/name/address/description unchanged; no ambiguous selector. |
| Existing collaboration tooling | Root admission/messaging/delegation, exact canonical address/run ID | General Agent uses runtime instructions/tools; no new wrapper or alias. |
Name check: General Agent is clear displayed role; stable definition ID remains unchanged. No identity-shape ambiguity introduced.

## Capability reuse and subsystem allocation
Reuse built-in agents, definition provider, runtime exposure/discovery, collaboration and skill catalog as-is. Extend only payload selection/content and focused tests. No new subsystem/module/helper/type; reusable-owned-structures and shared-data-tightness changes **N/A — no repeated logic or schema change**.

## Draft and final file responsibility mapping / target folder mapping
Draft-to-final assessment requires no extraction: existing files each already own the needed concern. Compact content stays in the existing built-in template directory, not a new module.
| Path | Action | Concrete owner/responsibility / exclusions |
| --- | --- | --- |
| autobyteus-server-ts/src/built-in-agents/templates/daily-assistant/agent.md | Modify | Exact approved supplement copied wholesale; no partial/alternative prompt. |
| autobyteus-server-ts/src/built-in-agents/templates/daily-assistant/agent-config.json | Modify | Existing tools plus list_available_agents once; preserve all other values. |
| autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts | Modify | Only displayName changes for existing entry; ID/constant/template name retained. |
| autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts | Modify | Real template name/description/body/config, startup refresh and same-ID assertions. |
| autobyteus-server-ts/tests/unit/agent-tools/agent-discovery/list-available-agents-tool.test.ts and/or shared/runtime-agent-tool-exposure.test.ts | Modify only as needed | Exercise actual built-in configured tools through existing exposure/binding; contract/eligibility preserved. |
| autobyteus-web/tests/e2e/chat-entry-live-probe.mjs | Modify relevant assertions/labels | New built-in name; discovery selection check can use API config. Existing stale C13 edit-preservation premise must not redefine bootstrap behavior; report limitation or correct only the directly relevant assertion under existing contract. |
| Existing web default Chat unit fixtures/tests under stores, services/chat and components/workspace | Modify focused current identity examples | General Agent label and same default ID; do not rewrite synthetic unrelated-agent names just for exhaustive string removal. |
| Current source comments and docs: server agent_definition/agent_communication/antigravity_cli_runtime; web chat/agent_management | Align names where relevant | Name/concepts/tool availability accurate. Delivery Engineer owns integrated docs sync; no historical ticket edits. |
| Other runtime modules, IDs/default string, historical/user data, public autobyteus-agents | No change | No migration, runtime refactor or cross-repository work. |

## Applied patterns, folder boundary check and derived layering
Reuse existing registry, file provider and tool adapter patterns. Built-in template directory owns payload; runtime modules own execution; test folders own executable assertions. Boundaries clear; no split/mixed-layer risk introduced. Derived layering/new abstractions N/A — current architecture unchanged.

## Concrete shape guidance
Good: same `autobyteus-daily-assistant` ID resolves a definition named General Agent, with unchanged other config and new discovery selection. Avoid: creating another default ID, alias lookup, dual prompts, copying specialist skills or globally auto-enabling discovery.

## Backward-compatibility rejection log
| Candidate | Decision |
| --- | --- |
| Old-name lookup alias / dual old/new definition ID / migration for display rename | Rejected: use the single existing definition with new displayed name and exact prompt. |
| Historical run-name rewriting or host-address rewriting | Rejected: not needed for current identity/default correctness; preserve historical snapshots and stored addresses. |
| Compatibility wrapper around discovery | Rejected: existing zero-argument discovery boundary already serves selected tool. |

## Change/refactor sequence and implementation guidance
1. Read requirements, supplement and evidence; verify approved supplement hash and isolated task branch/base.
2. Apply three production payload/registry edits described above; do NOT independently rewrite prompt or rename stable identifiers.
3. Update focused fixtures/assertions and add checks for exact template, preserved config and opted-in discovery; use current template contents, not merely generic mock content.
4. Run implementation-scoped checks/build per AGENTS.md and TESTING.md. Record exact results; do not claim reasoning/routing determinism from prompt-string assertions.
5. Handoff through applicable rules with implementation artifact. API/E2E Engineer validates runtime/config/default-Chat integration and actual product surface; Delivery Engineer syncs docs, obtains explicit user verification, finalizes and handles applicable cleanup/release gates.
No migration/refactor sequence or temporary seam.

## Verification intent
- Unit: bootstrap fresh/existing test-owned roots yield General Agent, exact full template, preserved ALL_INSTALLED/tools/defaults and list_available_agents; no duplicate ID or data migration.
- Unit/integration: actual builtin config passed through native exposure/binding and existing MCP availability (selection + eligible context), typed discovery result and no-context/empty availability behavior.
- Build: packaged template assets and existing built-in smoke. If helper/environment fails, report accurately.
- Default Chat web unit assertions: unchanged default selection, new current displayed identity.
- API/E2E: real isolated/test-owned server definition payload and a default Chat surface; for full user journey use worktree isolated desktop per TESTING.md, not user's running app. Test capabilities with controlled collaborators; verify exact prompt/config rather than assuming a model must delegate on a particular utterance.
- Existing stale C13 probe can contradict owned bootstrap refresh; do not count a whole probe pass unless prerequisites/assertions are current. API/E2E owns executable coverage and failure classification.

## Key tradeoffs and risks
Stable opaque IDs retained to avoid unnecessary migrations/default breakage, despite old internal slug wording. Approved complete prompt remains source of exact wording, not a new skill/workflow framework. Specialist use is judgment-based; no automatic routing guarantee. Existing historical labels may remain Daily Assistant because history is not rewritten. Scope stays internal; public package may retain old displayed name pending an explicit separate synchronization request.

## Task size and architectural risk (completed design classification)
- `task_size: Small` — three local production edits (one prompt, one config element, one registry display scalar) plus focused tests/docs; no runtime structural code changes. Content/test inventory does not inflate architecture scope.
- `architectural_risk: Low` — existing opt-in discovery and automatic collaboration already own capability; no new API, eligibility, persistence schema/identity, security, concurrency, deployment or ownership boundary. Startup already refreshes same-ID platform content.
- Content surfaces: one complete agent.md, one config tool entry, one display scalar, related labels/assertions/docs.
- Structural surfaces: unchanged bootstrap/provider/runtime exposure/discovery/collaboration/Chat default selection/history formats.
- Escalation trigger: needing ID/history transformation, shared discovery/eligibility/security policy change, missing runtime context requiring structural rewiring, or new routing semantics. Stop and return Design Impact/Requirement Gap instead of silently broadening Low-risk work.
- Independent architecture/code review artifacts: **N/A — not applicable** under direct Small/Low route; implementation self-checks and executable validation still required.
