# Design Spec

## Current-State Read

AutoByteus already routes Claude runtime execution and Claude model discovery through one concrete SDK boundary, `ClaudeSdkClient`, but that boundary does not consistently opt into Claude Code filesystem settings.

Current runtime spine:

`Run launch config -> ClaudeAgentRunBackendFactory -> ClaudeSessionBootstrapper -> ClaudeSession -> ClaudeSdkClient.startQueryTurn -> Agent SDK query -> Claude Code executable -> provider`

Current model discovery spine:

`Frontend model picker -> LLM provider GraphQL query -> ModelCatalogService -> ClaudeModelCatalog -> ClaudeSdkClient.listModels -> Agent SDK initialization/supportedModels -> Claude Code executable -> model list`

The current code passes no `settingSources` for normal turns or model discovery. With `@anthropic-ai/claude-agent-sdk@0.2.71`, omitted `settingSources` means SDK isolation mode: it does not load `~/.claude/settings.json`, project `.claude/settings.json`, or `.claude/settings.local.json`. AutoByteus only passes `settingSources: ["project"]` when project skills are materialized, which also drops user-level gateway configuration.

Live probes proved that adding `settingSources: ["user"]` makes the user's DeepSeek Claude Code config visible to the SDK and allows a `deepseek-v4-flash` turn to succeed.

## Intended Change

Make Claude Agent SDK in AutoByteus automatically inherit Claude Code filesystem settings without adding user-facing settings controls.

Target policy:

- Runtime turns: pass `settingSources: ["user", "project", "local"]` so user-level and project-level Claude Code settings are honored for the run `cwd`.
- Model discovery: pass `settingSources: ["user"]` so global model discovery sees user-level gateway/model configuration. The current catalog has no project/workspace input, so project-scoped model discovery is intentionally out of scope.
- Existing project skills: remove the special replacement branch that uses only `["project"]`; project settings are already included in the runtime policy.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: `ClaudeSdkClient` independently constructs turn and discovery options but omits user settings. Live SDK probes showed `settingSources:["user"]` is sufficient for DeepSeek config to work.
- Design response: Centralize Claude SDK settings-source policy in a small runtime-management resolver and use it from both turn and catalog paths.
- Refactor rationale: A one-line turn-only fix would leave model discovery mismatched and keep project skills replacing user settings with `["project"]`.
- Intentional deferrals and residual risk, if any: No settings UI is added. Project-scoped model discovery is deferred because current model catalog APIs are runtime-scoped, not workspace-scoped.

## Terminology

- `user` settings source: `~/.claude/settings.json` for the AutoByteus server process user.
- `project` settings source: `.claude/settings.json` under the SDK `cwd`.
- `local` settings source: `.claude/settings.local.json` under the SDK `cwd`.
- `runtime settings sources`: settings sources used for actual Claude turns, where a workspace `cwd` is known.
- `catalog settings sources`: settings sources used for global Claude model discovery, where no workspace `cwd` is currently available.

## Design Reading Order

1. Data-flow spine
2. SDK boundary ownership
3. Settings-source resolver responsibilities
4. File mapping and validation

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the implicit SDK isolation default from AutoByteus Claude runtime and remove the project-skill-only `["project"]` source replacement branch.
- Clean-cut target: AutoByteus Claude runtime always passes explicit SDK settings sources.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User sends Claude runtime turn | Claude Code process receives SDK query options with user/project/local settings sources | `ClaudeSdkClient` | Makes runtime honor Claude Code config. |
| DS-002 | Primary End-to-End | Frontend requests Claude model catalog | Model catalog probe receives user settings source | `ClaudeSdkClient` | Makes model picker see user-level gateway models. |
| DS-003 | Bounded Local | Claude project skill materialization | Runtime query keeps project source without dropping user source | `ClaudeSession` + `ClaudeSdkClient` | Preserves configured skills and user gateway config together. |

## Primary Execution Spine(s)

- DS-001: `Run Config -> Claude Session -> Claude SDK Client -> Settings Source Resolver -> Agent SDK query -> Claude Code -> Provider`
- DS-002: `Model Picker -> Claude Model Catalog -> Claude SDK Client -> Settings Source Resolver -> Agent SDK initialization -> Supported Models`
- DS-003: `Materialized Claude Skills -> Claude Session allowed Skill tool -> Claude SDK Client runtime sources -> Project settings loaded by Claude Code`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A Claude run starts with a workspace-resolved `cwd`. `ClaudeSession` builds prompt/tools and calls `ClaudeSdkClient`. The SDK client resolves runtime settings sources as `user,project,local` and passes them to Agent SDK query. Claude Code loads global and project config files if present. | Run config, Claude session, SDK client, resolver, Agent SDK query | `ClaudeSdkClient` | Auth env, executable path, tools/MCP options |
| DS-002 | The model picker asks for Claude models through the existing model catalog service. The catalog delegates to `ClaudeSdkClient`, which initializes SDK with `user` settings so global gateway configuration affects available models. | Model picker, catalog, SDK client, resolver, supported models | `ClaudeSdkClient` | Model descriptor normalization |
| DS-003 | Existing configured-skill materialization still creates workspace `.claude/skills` and enables the Skill tool. The runtime source policy includes `project`, so Claude Code can load the project `.claude` directory without replacing user settings. | Skills, Claude session, SDK client | `ClaudeSession` for skill need, `ClaudeSdkClient` for SDK options | Skill materializer and allowed-tools list |

## Spine Actors / Main-Line Nodes

- `ClaudeSessionBootstrapper`
- `ClaudeSession`
- `ClaudeSdkClient`
- New settings-source resolver
- `ClaudeModelCatalog`
- Claude Agent SDK `query()`

## Ownership Map

- `ClaudeSessionBootstrapper`: owns workspace/model/session config bootstrap.
- `ClaudeSession`: owns per-turn prompt, allowed tools, MCP servers, and whether configured project skills exist.
- `ClaudeSdkClient`: owns all Agent SDK invocation options and must be the only boundary that passes `settingSources`.
- New resolver: owns exact source arrays for runtime and catalog contexts.
- `ClaudeModelCatalog`: thin catalog facade; must not own SDK settings policy.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ClaudeModelCatalog.listModels()` | `ClaudeSdkClient` | Runtime-specific model catalog integration | Settings-source policy |
| `ClaudeSession.sendTurn()` | `ClaudeSession` + `ClaudeSdkClient` | Runtime turn entrypoint | Filesystem settings parsing |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Inline `settingSources: ["project"]` only when `enableProjectSkillSettings` is true | It drops user settings and treats project skills as the only reason to load Claude settings | Runtime settings-source resolver returning `["user", "project", "local"]` | In This Change | `enableProjectSkillSettings` may remain for allowed Skill tool decisions, but not for source replacement. |
| Omitted `settingSources` in model discovery | It makes catalog ignore user gateway settings | Catalog settings-source resolver returning `["user"]` | In This Change | Project-scoped catalog is deferred. |
| Proposed Server Settings selector/card | User rejected extra complexity | No UI change | In This Change | Docs can mention automatic behavior if needed. |

## Return Or Event Spine(s) (If Applicable)

- DS-002 return: `Agent SDK supportedModels -> normalizeModelDescriptors -> ClaudeModelCatalog -> LLM Provider GraphQL -> frontend grouped model options`.

## Bounded Local / Internal Spines (If Applicable)

- DS-003 bounded local flow: `configured skills materialized -> allowedTools adds Skill -> query uses runtime settings sources -> Claude Code project settings/skills available`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Auth spawn environment | DS-001, DS-002 | `ClaudeSdkClient` | Preserve current CLI/API-key auth mode behavior | Avoids changing auth semantics | Session bootstrap would mix auth with run context |
| Executable path | DS-001, DS-002 | `ClaudeSdkClient` | Preserve current system `claude` discovery/env override behavior | Avoids bundled/system mismatch | Catalog and turns could use different binaries |
| Source arrays | DS-001, DS-002, DS-003 | New resolver | Return context-appropriate SDK `settingSources` | Keeps policy consistent | Scattered hardcoded arrays cause drift |
| Secret safety | DS-001, DS-002 | Logging/tests | Do not print env token values | Config includes tokens | Runtime logs could leak credentials |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| SDK settings-source policy | `runtime-management/claude/client` | Extend | Already owns SDK client, auth env, executable path, model discovery | N/A |
| UI controls | `components/settings` | Do not change | User prefers no settings-page control | N/A |
| Durable server setting | `ServerSettingsService` | Do not change | No setting needed for normal behavior | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Claude runtime-management client | SDK source arrays and invocation options | DS-001, DS-002, DS-003 | `ClaudeSdkClient` | Extend | Add small resolver. |
| Claude agent-execution backend | Skill/project need signal and turn construction | DS-001, DS-003 | `ClaudeSession` | Reuse | Do not parse sources here. |
| LLM model catalog | Runtime model listing facade | DS-002 | `ClaudeModelCatalog` | Reuse | Delegate policy to SDK client. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `claude-sdk-setting-sources.ts` | Claude runtime-management client | Source resolver | Export runtime/catalog source arrays and optional advanced disable parsing if kept | One cohesive SDK source policy | N/A |
| `claude-sdk-client.ts` | Claude runtime-management client | SDK boundary | Use resolver for turn and catalog options | Existing invocation boundary | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Runtime/catalog source arrays | `claude-sdk-setting-sources.ts` | Claude runtime-management client | Both turn and catalog need source policy | Yes | Yes | Generic settings framework |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ClaudeSdkSettingSource` | Yes | Yes | Low | Use literal SDK vocabulary: `user`, `project`, `local`. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-setting-sources.ts` | Claude runtime-management client | Settings-source resolver | Return runtime sources `["user","project","local"]`, catalog sources `["user"]`, and optional advanced disable behavior | One concern: SDK filesystem settings source policy | N/A |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | Claude runtime-management client | SDK invocation boundary | Pass resolved sources to Agent SDK query for turns and model discovery | Existing SDK owner | Yes |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-setting-sources.test.ts` | Server tests | Resolver coverage | Verify runtime/catalog defaults and optional advanced disable behavior | Focused unit test | Yes |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | Server tests | SDK options coverage | Assert normal turns and discovery pass expected sources; project skills preserve user/project/local | Existing test location | Yes |
| `autobyteus-server-ts/docker/README.md` | Docs | Runtime docs | Mention automatic Claude Code settings inheritance and Docker `/root/.claude/settings.json` path if docs are updated in scope | Existing Claude Code auth section | N/A |

## Ownership Boundaries

- `ClaudeSdkClient` is the authoritative SDK options boundary. Upstream runtime/session code must not hardcode source arrays.
- The resolver owns source policy but does not invoke SDK or read run/session state.
- `ClaudeModelCatalog` remains a thin facade and must not duplicate source policy.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ClaudeSdkClient` | Agent SDK `query()`, env, executable, settings sources | `ClaudeSession`, `ClaudeModelCatalog` | `ClaudeSession` constructing `settingSources` directly | Add a narrow option/feature flag to `startQueryTurn` only if needed |
| `claude-sdk-setting-sources.ts` | Runtime/catalog source arrays | `ClaudeSdkClient` | Turn and discovery code each using hardcoded arrays | Add resolver methods |

## Dependency Rules

Allowed:

- `ClaudeSdkClient -> claude-sdk-setting-sources.ts`
- `ClaudeSdkClient -> claude-sdk-auth-environment.ts`
- `ClaudeSdkClient -> claude-sdk-executable-path.ts`
- `ClaudeSession -> ClaudeSdkClient`
- `ClaudeModelCatalog -> ClaudeSdkClient`

Forbidden:

- `ClaudeSession` importing or constructing SDK `settingSources` arrays.
- `ClaudeModelCatalog` directly passing SDK options.
- Adding a Server Settings card/selector for this behavior.
- Logging raw env or settings-file token values.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `getClaudeRuntimeSettingSources()` | Runtime SDK settings sources | Return SDK-ready runtime source list | none or injected env for tests | Default `["user","project","local"]`. |
| `getClaudeCatalogSettingSources()` | Catalog SDK settings sources | Return SDK-ready catalog source list | none or injected env for tests | Default `["user"]`. |
| `ClaudeSdkClient.startQueryTurn(...)` | Claude runtime turn | Start Agent SDK query with runtime sources | existing options | No raw source argument from session. |
| `ClaudeSdkClient.listModels()` | Claude model discovery | Initialize SDK with catalog sources | none | Same executable/env path. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `getClaudeRuntimeSettingSources` | Yes | Yes | Low | Keep context-specific. |
| `getClaudeCatalogSettingSources` | Yes | Yes | Low | Do not overload with workspace later; add a new project-scoped catalog API if needed. |
| `startQueryTurn` | Yes | Yes | Low | Keep policy internal to SDK client. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| SDK source resolver | `claude-sdk-setting-sources.ts` | Yes | Low | If future launch policy grows beyond sources, introduce `claude-sdk-launch-config.ts` deliberately. |

## Applied Patterns (If Any)

- Small resolver module inside the owning runtime-management subsystem.
- Clean-cut replacement of implicit default behavior with explicit SDK option construction.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-setting-sources.ts` | File | Claude SDK source resolver | Context-specific source arrays and optional advanced-disable parsing | Same folder as SDK client/executable/auth env | UI/server settings code |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | File | Agent SDK boundary | Add `settingSources` to turn and catalog query options | Existing SDK boundary | Hardcoded scattered policy |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-setting-sources.test.ts` | File | Resolver tests | Assert defaults | Focused source-policy test | Live network calls |
| `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` | File | SDK client tests | Assert SDK options include expected sources | Existing mock-query tests | Live network calls |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `runtime-management/claude/client` | Runtime client boundary | Yes | Low | Existing owner for SDK client/auth/executable/model discovery. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Normal runtime | `settingSources: ["user", "project", "local"]` | no `settingSources` | Avoid SDK isolation surprise. |
| Model catalog | `settingSources: ["user"]` | no `settingSources` | Make DeepSeek/Kimi user config visible to model picker. |
| Project skills | runtime source list still includes `user` | `enableProjectSkillSettings ? ["project"] : undefined` | Preserve gateway config and skill config together. |
| UI | No new source picker | User chooses among `user/project/local/none` | Avoid exposing SDK internals as product choices. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Preserve old SDK isolation unless user toggles a setting | Avoids behavior change | Rejected | Automatic Claude Code settings inheritance. |
| Add Server Settings source selector | Transparency/flexibility | Rejected by user/product reasoning | No UI selector; automatic behavior. |
| Keep `["project"]` special case for project skills | Existing implementation | Rejected | Runtime sources always include project/local and user. |

## Derived Layering (If Useful)

- Agent-execution layer: builds run/session/turn intent.
- Runtime-management layer: translates intent into Agent SDK process options.
- Vendor layer: Agent SDK and Claude Code load settings files.

## Migration / Refactor Sequence

1. Add `claude-sdk-setting-sources.ts` with literal source type and two public functions:
   - `getClaudeRuntimeSettingSources()` -> `["user", "project", "local"]`
   - `getClaudeCatalogSettingSources()` -> `["user"]`
   Optional: support advanced env disable in this module only if required.
2. Update `ClaudeSdkClient.buildQueryOptions(...)` to always set `settingSources: getClaudeRuntimeSettingSources()`.
3. Remove the `enableProjectSkillSettings ? { settingSources: ["project"] } : {}` branch. Keep `enableProjectSkillSettings` only if still needed for allowed Skill tool behavior outside SDK source construction.
4. Update `ClaudeSdkClient.tryGetSupportedModelsFromQueryControl(...)` to pass `settingSources: getClaudeCatalogSettingSources()`.
5. Add/adjust unit tests for resolver and SDK option construction.
6. Update docs only if implementation scope includes operator docs; no Server Settings UI work.

## Key Tradeoffs

- Runtime always loading `project/local` best matches Claude Code behavior for project runs, but model discovery stays user-only because current catalog lacks workspace context.
- No UI setting reduces flexibility but matches user intent and avoids confusing SDK internals.
- Advanced isolation is not a normal product path; if needed, keep it as env-only.

## Risks

- Project-specific model aliases may not be selectable in the global model picker until model discovery becomes workspace-scoped.
- Server `HOME` mismatch can still confuse Docker/remote users; docs should clarify active config path.
- Loading `local` may pick up machine-specific project settings. This is consistent with Claude Code parity and the user's stated intent.

## Guidance For Implementation

- Keep the resolver pure and easy to test.
- Do not add frontend settings components for this change.
- Do not log settings file contents or token-like env values.
- Prefer mock-unit tests over live provider tests for CI. Keep the live DeepSeek probe evidence in investigation notes.
