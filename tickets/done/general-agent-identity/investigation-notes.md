# General Agent identity — investigation

## Bootstrap
- Package: `general-agent-identity`; current revision: `SR-002`; date: 2026-10-03.
- Git worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/general-agent-identity`.
- Branch: `task/general-agent-identity`.
- Resolved base: `origin/personal`, refreshed with `git fetch origin personal`; revision `806907faeb567d2b703e10fe984fcd01be0b41fd`.
- Finalization target: `origin/personal`; Delivery Engineer owns later user verification, authorized finalization and applicable release/cleanup gates.
- Bootstrap successful. Original shared checkout has unrelated changes and was not used for authoring. No applicable root/ticket AGENTS.md found; public repository AGENTS.md read during earlier read-only investigation.
- Earlier advisory history: `/tmp/autobyteus-naming-analysis/result.md`; canonical relevant evidence and decisions restated here so the package does not depend on temporary files.

## Request and clarifications
User initially discussed renaming Daily Assistant to General Assistant, General Agent or Universal Agent. User clarified no data migration and initially only wanted discussion. User then proposed General Agent identity in name and prompt, specialist discovery via list_available_agents, skills/direct-work fallback; preferred “use” rather than “follow.” SR-001 requested a complete prompt file. User subsequently explicitly approved it and proceeding: “coool. lets go approved.” SR-002 carries the approved internal-agent implementation basis; public repository remains reference-only.

## Sources and findings
| Source | Exact path / command | Finding |
| --- | --- | --- |
| Public repo guidance/catalog | `/Users/normy/autobyteus_org/autobyteus-agents/AGENTS.md`, `README.md`, `agents/*/agent.md` | Read seven standalone definitions and catalog descriptions. Actual specialists include Research Engineer, Resume Designer, Computer Use Operator, Agent Package Creator, Software Tutorial Video Maker and Product Prototyper. README does not exactly enumerate current standalone files; actual definitions govern. No claim of inspecting every bundled skill/team. |
| Public general agent | `/Users/normy/autobyteus_org/autobyteus-agents/agents/daily-assistant/agent.md`, `agent-config.json` | Name/self-introduction say Daily Assistant; description/role say General Agent. Config selects shell-first-operating-practice, broad tools, but not list_available_agents. |
| Built-in general agent | `autobyteus-server-ts/src/built-in-agents/templates/daily-assistant/agent.md`, `agent-config.json` | General-purpose prompt; role General Agent; ALL_INSTALLED skills; broad tools; list_available_agents not selected. Public and built-in definitions differ. |
| Built-in owner | `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` | Definition ID autobyteus-daily-assistant; template daily-assistant; displayName Daily Assistant. Built-ins are platform-owned. |
| Discovery contract | `autobyteus-server-ts/src/agent-tools/agent-discovery/list-available-agents-contract.ts` | Read-only result includes agents AND teams, names, kinds, addresses, descriptions. Does not return skill contents. Requires collaboration context. |
| Tool selection | `autobyteus-server-ts/src/agent-tools/agent-discovery/list-available-agents-tool.ts` | Explicit opt-in selection needed; prompt text alone cannot grant the tool. |
| Eligibility | `autobyteus-server-ts/src/agent-collaboration/collaborators/collaborator-candidate-policy.ts` | Accessible shared catalog excludes built-ins and root definition; application-owned roots have no candidates. Cannot claim all public-package specialists are available. |
| Collaboration guidance | `autobyteus-server-ts/src/agent-run-collaboration/prompt/standalone-collaboration-instruction.ts` | Discovery conditional on tool availability; messaging/delegation semantics supplied by runtime. Proposed prompt need not duplicate those mechanics. |
| Bootstrap | `git status --short --branch`, `git remote -v`, `git symbolic-ref refs/remotes/origin/HEAD`, `git fetch origin personal`, `git worktree add -b task/general-agent-identity ... origin/personal` | Isolated task workspace created successfully from refreshed tracked integration branch. |

## Behavior / scenario basis
- BEH-001 / SCN-001: current general-purpose identity versus requested consistent name; source user discussion and actual definitions.
- BEH-002 / SCN-002: specialist-aware handling is proposed prompt policy, based on user discussion and supported discovery contract, not claimed existing agent behavior.
- BEH-003 / SCN-003: practical direct work preserved; relevant-skill/no-skill paths requested by user.
- No contrived internal manipulation promoted into scope; no runtime probe or user-facing behavior validation performed.

## Surface inventory and risks
- Current payload: agent.md frontmatter/prompt, agent-config.json tools/skill scope, registry name; frontend default references exist.
- Existing structure: runtime already owns discovery/collaboration. No API, schema, migration, security/concurrency structure change is authored here.
- SR-002 scope is the original internal default-agent change plus existing discovery enablement; exact prompt now approved. Public-repository synchronization is not authorized.
- Persisted production data: not touched; migration explicitly excluded by user. Volume/transition analysis N/A for prompt-file authoring.
- Important distinction: collaboration asks the specialist to use its own workflow; direct execution uses skills actually available to General Agent. Discovering an agent does not load its skills automatically.
- Avoid imposing mandatory specialist-first/skill-first behavior not explicitly settled by user. Proposed text gives judgment for substantial work and direct handling of straightforward requests.

## Supplement inventory
| Artifact | Owner | Purpose and scope | IDs | State / approval |
| --- | --- | --- | --- | --- |
| `general-agent-prompt.md` | Solution Designer | Exact complete proposed definition; future engineer must not invent wording | REQ-001–004 / AC-001–004 | v1, Approved by “coool. lets go approved”; hash recorded in requirements |

## Product / architecture
Product Design not requested; all prototype and Product artifacts N/A. SR-001 did not begin design before approval. SR-002 architecture investigation below supports design-spec.md; current routing recorded in solution-handoff.md.


## SR-002 — architecture investigation after explicit approval
Approval: latest user message “coool. lets go approved.” Read all current canonical artifacts and exact prompt, verified hash unchanged and task worktree remains isolated on task/general-agent-identity at recorded base. Read architecture-design.md, design-principles.md and mandatory design template from /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.codex/skills/solution-designer because .codex skill files are untracked/local and absent from the new worktree. Read server/web AGENTS.md and root TESTING.md.

| Evidence ID | Exact source / command | Verified fact / consequence |
| --- | --- | --- |
| AE-001 | src/built-in-agents/built-in-agent-bootstrapper.ts (under autobyteus-server-ts) | Startup copies both template files to agents/<definition.id>/ on EVERY startup, mirrors skills and refreshes definition cache; no seed-only behavior. Existing platform-owned content refresh applies changed name/prompt/config. |
| AE-002 | src/agent-definition/providers/file-agent-definition-provider.ts:123–136; utils/agent-md-parser.ts | Ordinary reader resolves id independently from frontmatter, parses name/description/body and config tools/skill scope. Display name can change without storage/identity change. |
| AE-003 | autobyteus-web/utils/chat/chatDefaults.ts | Default ID is autobyteus-daily-assistant; preserve it, do not create a new default agent or rename persistent references. |
| AE-004 | src/agent-execution/shared/runtime-agent-tool-exposure.ts | list_available_agents selected from definition tools; send_message_to and delegate_task are already automatically exposed for member context. No additional communication tool config needed. |
| AE-005 | src/agent-run-collaboration/services/agent-run-collaboration-host-context-builder.ts | Eligible standalone host context provides active-root lister; persisted host address reused, otherwise current definition name determines new host address. No rewriting stored addresses. |
| AE-006 | src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts:86–94; src/agent-tools/mcp/providers/list-available-agents-mcp-adapter-provider.ts | Existing native binding/MCP adapter require eligible context and selected discovery capability. No runtime implementation change required. |
| AE-007 | src/agent-execution/prompt/carpenter-prompt-composer.ts; carpenter-prompt-sections.ts | Authored definition name/body feed shared prompt identity; existing standalone collaboration instructions appended independently. Exact authored prompt remains canonical without duplicating runtime mechanics. |
| AE-008 | src/run-history/services/agent-run-history-catalog-service.ts:resolveAgentName; store/agent-run-history-index-store.ts | History stores display-name snapshots; new indexing resolves current definition name. Existing snapshots need not be rewritten for identity/default continuity. |
| AE-009 | tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts:303 onward; tests/unit/agent-tools/agent-discovery/list-available-agents-tool.test.ts; tests/unit/agent-execution/shared/runtime-agent-tool-exposure.test.ts | Existing focused coverage for bootstrap refresh and tool selection/binding/MCP. Extend with actual General Agent template assertions. These were inspected, NOT executed by Solution Designer. |
| AE-010 | scripts/smoke-built-in-agents-bootstrap.mjs; scripts/copy-build-assets.mjs; package.json | Server build copies template assets and runs built-in smoke; template directory currently daily-assistant. No packaging change necessary. |
| AE-011 | autobyteus-web tests/components/services/stores and tests/e2e/chat-entry-live-probe.mjs; rg Daily Assistant excluding historical tickets | Current fixtures/assertions/comments still use old displayed name. Align active examples and required assertions; do not rename opaque IDs or historical ticket evidence. C13 live probe description claims edited prompt survives startup, contradicting platform-owned refresh; do not weaken correct bootstrap contract to make stale probe pass. |
| AE-012 | autobyteus-server-ts/docs/design/data_migration_guideline.md sections 1–4; root TESTING.md | Migration not needed: no schema, ID, reference or history transformation; ordinary built-in refresh rebuilds shipped definition. Do not add startup gate, journal, migration or compatibility branches. Validation uses test-owned data/isolated instances, not user's installed app. |

Commands: read sources with cat/sed/rg; git status --short --branch; git rev-parse HEAD; sha256sum general-agent-prompt.md. One initially guessed repositories/file-agent-definition-repository.ts path did not exist; located actual providers/file-agent-definition-provider.ts and read it. No unresolved evidence reliance on nonexistent path. No runtime tests, builds or product probes executed here.

Persisted-state disposition: platform-owned built-in definition content = refreshed/rebuilt from shipped authoritative template at unchanged definition ID; historical run records/addresses/default references = directly usable without modification. No predecessor migration changes or historical-source reclassification necessary, because no migration/transformation is designed.

Architecture conclusion: narrow payload and config/registry-display delta absorbed by existing owners. No new runtime interface, policy owner, persistence format, security boundary, concurrency or deployment mechanism. No refactor needed. Design and actual completed task-size/risk are recorded separately in design-spec.md.
