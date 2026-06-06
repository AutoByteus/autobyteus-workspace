# Design Spec

## Current-State Read

`autobyteus-ts` currently builds and publishes an interactive native CLI/TUI surface even though current product/runtime usage is programmatic and server/web-owned:

- `src/index.ts` is the thin public package facade and currently re-exports CLI/TUI code through `./cli/index.js` and `./cli/agent-team/widgets/index.js`.
- `src/cli/agent/**` owns a single-agent readline console loop and stdout renderer around `AgentEventStream`, `Agent.postUserMessage(...)`, and `Agent.postToolExecutionApproval(...)`.
- `src/cli/agent-team/**` owns an Ink/React TUI around `AgentTeamEventStream`, a `TuiStateStore`, and team/agent widgets.
- `tests/unit/cli/**` only tests the unused CLI/TUI renderer/state code.
- 12 example scripts import `runAgentCli` or `runAgentTeamCli`, so examples must be deleted or rewritten when the CLI/TUI implementation is removed.
- `ink`, `react`, and `@types/react` are direct dependencies only because the unused TUI exists. No non-CLI/TUI source imports Ink/React and no TSX/JSX source remains outside `src/cli/**`.
- Active workspace consumers (`autobyteus-server-ts`, `autobyteus-message-gateway`, workspace scripts, and tests) import non-CLI root exports or deep subpaths such as `llm`, `tools`, `external-channel`, `multimedia`, `agent-team/utils`, and `agent/message`. Static scans found no active non-example consumer of `autobyteus-ts/cli/**`, `runAgentCli`, `runAgentTeamCli`, `InteractiveCliDisplay`, or `TuiStateStore`.
- Terminal runtime/tooling code (`src/tools/terminal/**`, `types/node-pty`, optional dependency `node-pty`, `scripts/fix-node-pty-permissions.mjs`) is not the native CLI/TUI surface. It must stay intact.

The current coupling problem is not that core runtime owners depend on the UI. The problem is the public package facade and build/dependency graph still carry an obsolete presentation/control layer. A clean removal can simplify the package without changing agent/team runtime ownership.

## Intended Change

Make `autobyteus-ts` a programmatic runtime/library package with no native CLI/TUI implementation or public CLI/TUI exports:

- Delete the complete `autobyteus-ts/src/cli/**` subtree.
- Delete CLI/TUI-only unit tests under `autobyteus-ts/tests/unit/cli/**`.
- Remove CLI/TUI exports from `autobyteus-ts/src/index.ts`.
- Remove CLI/TUI-dependent examples and update active example documentation so it no longer describes the removed interactive runners.
- Remove direct Ink/React dependencies and JSX compiler configuration that existed solely for the deleted TUI.
- Update active architecture/docs references that advertise the native CLI/TUI surface.
- Preserve all non-CLI runtime exports, deep subpath imports, terminal tools, and terminal runtime dependencies.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / refactor
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: `src/cli/**` is unused by active workspace code, yet root exports, examples, tests, docs, direct dependencies, lockfiles, and JSX config keep it alive. User confirmed the intended cleanup is TUI/CLI removal and explicitly confirmed terminal runtime/tooling code should remain.
- Design response: Perform a clean-cut removal of the obsolete UI surface and its public exports/dependency graph. Preserve programmatic runtime owners and terminal tooling.
- Refactor rationale: Keeping empty stubs, re-export wrappers, or deprecation placeholders would retain the exact public surface and legacy pressure the user wants removed. A removal-first refactor better aligns build/dependency ownership with actual runtime usage.
- Intentional deferrals and residual risk, if any: No replacement interactive runner is designed. External consumers outside this monorepo that import `autobyteus-ts/cli/**` will break intentionally. A future supported interactive surface, if needed, should be separately designed around current server/web/programmatic ownership.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the obsolete `src/cli/**` implementation, public CLI/TUI root exports, tests, examples, docs references, and direct dependencies.
- Treat removal as first-class design work: the implementation must prove no active source/test/example references remain and must not keep compatibility stubs.
- Decision rule: no `autobyteus-ts/src/cli/**` stub, `runAgentCli`/`runAgentTeamCli` placeholder, deprecation wrapper, or export-map alias may remain.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Active workspace consumer import | Programmatic `autobyteus-ts` runtime/API behavior | `autobyteus-ts` package public facade and domain subsystem owners | This is the supported path that must keep working after CLI/TUI removal. |
| DS-002 | Primary End-to-End / Removal | Manual/example caller of `runAgentCli` | Single-agent readline/stdout UI interaction | Obsolete native CLI boundary | This path is the single-agent CLI surface to remove. |
| DS-003 | Primary End-to-End / Removal | Manual/example caller of `runAgentTeamCli` | Ink team TUI interaction | Obsolete native team TUI boundary | This path is the team TUI surface to remove. |
| DS-004 | Primary End-to-End | Package manifest/build config | Built `dist` package plus runtime dependency verification | `autobyteus-ts` package/build configuration | Dependency and JSX cleanup must align with source deletion or build/runtime-dep checks will drift. |
| DS-005 | Primary End-to-End | Terminal tool/runtime consumers | PTY-backed terminal tool behavior | Terminal tools subsystem | This is explicitly out of the removal boundary and must be preserved. |

## Primary Execution Spine(s)

- Supported programmatic package spine: `Workspace consumer -> autobyteus-ts package facade/deep subpath -> domain subsystem owner (agent/team/tool/llm/multimedia/external-channel) -> runtime behavior`
- Obsolete single-agent CLI spine to delete: `Example/manual caller -> runAgentCli -> AgentEventStream + InteractiveCliDisplay -> Agent runtime messages/approvals -> stdout/readline UI`
- Obsolete team TUI spine to delete: `Example/manual caller -> runAgentTeamCli -> Ink AgentTeamApp -> AgentTeamEventStream + TuiStateStore -> AgentTeam messages/approvals -> terminal TUI widgets`
- Build/dependency spine: `package.json + tsconfig -> tsc build -> dist imports -> verify-runtime-dependencies -> publishable package contents`
- Preserved terminal tooling spine: `Agent/tool caller -> terminal tool -> session factory/backend -> node-pty or shell process -> tool result`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Active consumers import `autobyteus-ts` root exports or non-CLI deep subpaths; those calls should continue to reach the existing domain owners unchanged. | Consumer, package facade/deep export, domain subsystem, runtime behavior | Package facade plus each domain subsystem owner | Static import checks, build validation |
| DS-002 | A manual caller/example starts a single-agent interactive loop; it observes agent events, renders to stdout, reads user input, and posts messages/approvals. This entire path is obsolete. | Caller, `runAgentCli`, CLI display/input loop, Agent runtime | Obsolete native CLI boundary | CLI display tests, example runners, docs, dependencies |
| DS-003 | A manual caller/example starts an Ink app for team runs; it stores team/agent UI state and renders terminal widgets. This entire path is obsolete. | Caller, `runAgentTeamCli`, Ink app/state store, AgentTeam runtime | Obsolete native team TUI boundary | TUI widget tests, example runners, docs, Ink/React deps |
| DS-004 | The package build compiles source, emits declarations, then verifies all built JS imports have runtime dependencies declared. After CLI/TUI deletion, Ink/React must disappear from built imports and dependency manifests. | Manifest, tsconfig, tsc build, verifier, dist package | Package/build configuration | Lockfile updates, package file contents |
| DS-005 | Terminal tools execute shell/PTY sessions as agent tools. This path is runtime tooling, not the removed native package UI. | Tool caller, terminal tool, session factory/backend, process, tool result | Terminal tools subsystem | `node-pty` optional dependency, postinstall permission repair |

## Spine Actors / Main-Line Nodes

- `Workspace consumer`: active server/gateway/script/test code importing `autobyteus-ts`.
- `Package public facade`: `autobyteus-ts/src/index.ts`, a thin export boundary.
- `Domain subsystem owners`: existing agent, agent-team, tools, LLM, memory, multimedia, external-channel, and utility subsystems.
- `Obsolete native CLI boundary`: `src/cli/agent/**` and `src/cli/index.ts`.
- `Obsolete native team TUI boundary`: `src/cli/agent-team/**`.
- `Package/build configuration`: `package.json`, lockfiles, `tsconfig*.json`, `scripts/verify-runtime-dependencies.mjs`.
- `Terminal tools subsystem`: `src/tools/terminal/**` plus `node-pty` support.

## Ownership Map

- `src/index.ts` owns only the package root export facade. It must not own UI behavior, compatibility policy, or runtime orchestration.
- Existing domain subsystems own their current runtime behavior and public types. They should not absorb CLI/TUI rendering or input-loop responsibilities during removal.
- The obsolete CLI/TUI boundary currently owns interactive presentation and input control. Target state removes this owner entirely rather than moving it.
- Package/build configuration owns dependency declarations, lockfile consistency, and build verification. It must reflect only remaining built imports.
- Terminal tools subsystem owns command/session execution as tool behavior. It is not a UI facade and remains in place.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `autobyteus-ts/src/index.ts` | Existing domain subsystems | Root import convenience for supported library APIs | CLI/TUI compatibility exports, UI orchestration, terminal process execution |
| Deep package subpath exports via `package.json` wildcard entries | Concrete source/dist files under their subsystem paths | Allow active consumers to import explicit subsystem files | Mapping removed `cli/**` paths to replacement stubs |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/cli/**` | Native CLI/TUI is unused and should no longer be built/exported. | No replacement; supported interaction is programmatic/server/web-owned. | In This Change | Delete full subtree, including barrels/widgets/state/display. |
| `export * from './cli/index.js';` in `src/index.ts` | Would expose removed single-agent/team CLI helpers. | Existing non-CLI root exports. | In This Change | Do not add deprecation export. |
| `export * from './cli/agent-team/widgets/index.js';` in `src/index.ts` | Would expose removed TUI widgets/renderables. | No replacement. | In This Change | Widgets are presentation internals, not a supported runtime API. |
| `autobyteus-ts/tests/unit/cli/**` | Tests only exercise deleted UI code. | Remaining package unit/integration tests. | In This Change | Remove from test tree. |
| 12 CLI/TUI example runner scripts | They import removed helpers and would break example builds. | No replacement in this cleanup. | In This Change | Keep only non-CLI examples/utilities that still compile. |
| Orphaned example helpers/assets used only by deleted examples | They no longer serve an active example path. | Remaining `examples/discover-status-transitions.ts` and its needed helper(s). | In This Change | Delete `examples/shared/example-paths.ts`, `llm-helpers.ts`, prompts/skills directories if orphaned. |
| `ink`, `react`, `@types/react` direct manifest entries | No remaining non-CLI source imports them. | Existing non-UI runtime dependencies. | In This Change | Update root and package-local lockfiles. |
| `jsx: react-jsx` in `autobyteus-ts/tsconfig.json` | Only needed by deleted TSX files. | Plain TypeScript config. | In This Change | Remove if no TSX/JSX files remain. |
| Active docs/readmes advertising native CLI/TUI | They would describe unsupported behavior. | Updated docs describing programmatic/server/web usage. | In This Change | Historical ticket archives may remain as archives. |

## Return Or Event Spine(s) (If Applicable)

Removed CLI/TUI paths currently observe runtime event streams and translate events to terminal UI state. Target state does not introduce a replacement return/event spine. Existing runtime event streams remain owned by their current agent/team streaming subsystems and continue serving active server/web/programmatic consumers.

## Bounded Local / Internal Spines (If Applicable)

- Removed single-agent CLI bounded loop: `readline prompt -> user input -> Agent.postUserMessage/postToolExecutionApproval -> wait for AgentEventStream turn completion -> next prompt`.
- Removed team TUI bounded render loop: `AgentTeamEventStream -> TuiStateStore.processEvent -> dirty flag -> Ink render refresh -> focus/sidebar/status widgets`.
- Preserved terminal tool bounded behavior, if any, stays under `src/tools/terminal/**` and is not modified by this design.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Reference scan | DS-001, DS-002, DS-003 | Package facade/removal owner | Prove no active source/test/example imports remain. | Prevent dangling imports after deletion. | Could accidentally delete shared runtime code or miss broken references. |
| Lockfile update | DS-004 | Package/build configuration | Keep dependency graph consistent after dependency removal. | Avoid stale lockfile entries and install drift. | Build/dependency verification may fail or reviewers may see unrelated churn. |
| Documentation cleanup | DS-002, DS-003 | Repository reader experience | Remove active docs that advertise deleted CLI/TUI usage. | Avoid unsupported instructions. | Users may attempt removed paths. |
| Terminal tooling preservation check | DS-005 | Terminal tools subsystem | Verify `src/tools/terminal/**`, `node-pty`, and postinstall scripts remain. | User explicitly clarified terminal code is unrelated and must stay. | Over-broad deletion could break runtime terminal tools. |
| Downstream import validation | DS-001 | Active workspace consumers | Confirm server/gateway/scripts still import supported non-CLI APIs. | Protect active runtime paths. | A broad root export edit could accidentally remove needed APIs. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Supported agent/team interaction | Programmatic runtime plus server/web surfaces | Reuse | Current active product surfaces already use programmatic/server/web paths; no native CLI replacement is needed. | N/A |
| Terminal command execution | `src/tools/terminal/**` | Reuse/Preserve | Terminal tools are runtime capabilities unrelated to native CLI/TUI. | N/A |
| Build/runtime dependency verification | `scripts/verify-runtime-dependencies.mjs` | Reuse | Existing verifier should prove Ink/React are no longer required by built JS. | N/A |
| Example validation | Existing examples folder | Extend by pruning | Keep only examples that compile without CLI/TUI. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Package Public Surface | Root exports and deep subpath availability | DS-001, DS-002, DS-003 | Package facade | Extend by removal | Remove CLI/TUI exports only. |
| Obsolete Native CLI/TUI | Current interactive terminal UI implementation | DS-002, DS-003 | Obsolete UI boundary | Remove | No replacement owner. |
| Package Build/Dependency Configuration | Dependencies, lockfiles, TS config, runtime-dep verification | DS-004 | Package/build config | Extend by pruning | Remove Ink/React/JSX after source deletion. |
| Examples/Docs | Reader-facing runnable examples and current docs | DS-002, DS-003 | Documentation/examples owner | Extend by pruning/updating | Delete CLI/TUI examples and update docs. |
| Terminal Tools | Terminal tool execution and PTY support | DS-005 | Terminal tools subsystem | Reuse/Preserve | Explicitly not in removal boundary. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/index.ts` | Package Public Surface | Root package facade | Export supported non-CLI public APIs only. | Existing root facade. | Existing exports only. |
| `autobyteus-ts/package.json` | Package Build/Dependency Configuration | Package manifest | Declare runtime/dev/optional dependencies and scripts. | Existing manifest. | N/A |
| `pnpm-lock.yaml` | Package Build/Dependency Configuration | Workspace lockfile | Workspace dependency graph. | Existing workspace lockfile. | N/A |
| `autobyteus-ts/pnpm-lock.yaml` | Package Build/Dependency Configuration | Package-local lockfile | Package-local dependency graph. | Existing local lockfile. | N/A |
| `autobyteus-ts/tsconfig.json` | Package Build/Dependency Configuration | TypeScript config | Shared compiler options for package/tests. | Existing config. | N/A |
| `autobyteus-ts/examples/README.md` | Examples/Docs | Examples reader docs | Describe remaining supported examples only. | Existing examples entry doc. | N/A |
| `autobyteus-ts/docs/nodejs_architecture.md` | Examples/Docs | Architecture docs | Remove/update CLI/TUI architecture section. | Existing architecture doc. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| None introduced | N/A | N/A | This is deletion/pruning, not a new shared abstraction. | N/A | N/A | A compatibility helper layer for removed CLI/TUI APIs |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | Low | No shared structures added. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/index.ts` | Package Public Surface | Root package facade | Export supported non-CLI APIs; omit CLI/TUI exports. | Existing public facade. | Existing subsystem exports. |
| `autobyteus-ts/package.json` | Package Build/Dependency Configuration | Package manifest | Remove `ink`, `react`, `@types/react`; preserve `node-pty` optional dependency and scripts. | Existing manifest. | N/A |
| `pnpm-lock.yaml` | Package Build/Dependency Configuration | Workspace lockfile | Reflect workspace dependency graph after dependency removal. | Existing workspace lockfile. | N/A |
| `autobyteus-ts/pnpm-lock.yaml` | Package Build/Dependency Configuration | Package-local lockfile | Reflect package-local dependency graph after dependency removal. | Existing local lockfile. | N/A |
| `autobyteus-ts/tsconfig.json` | Package Build/Dependency Configuration | TypeScript config | Remove JSX config when no TSX/JSX remains. | Existing shared TS config. | N/A |
| `autobyteus-ts/examples/README.md` | Examples/Docs | Examples documentation | Document remaining non-CLI examples/utilities only. | Existing examples doc. | N/A |
| `autobyteus-ts/docs/nodejs_architecture.md` | Examples/Docs | Architecture documentation | State native CLI/TUI has been removed and point to programmatic/server/web interaction. | Existing architecture doc. | N/A |
| `autobyteus-ts/docs/tool_schema_and_configuration.md` | Examples/Docs | Tool-schema docs | Remove/adjust future CLI-command wording if it describes unsupported native CLI integration. | Existing docs file. | N/A |
| `autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md` | Examples/Docs | Runtime docs | Replace generic `API/UI/CLI` approval wording if it implies native CLI remains. | Existing docs file. | N/A |

## Ownership Boundaries

- Public root import boundary: `src/index.ts` is authoritative for supported root imports. Removing CLI/TUI exports here makes the root API match supported package usage.
- Deep subpath boundary: package wildcard exports expose files that exist under `dist`. Deleted `cli/**` files naturally stop being importable; there must be no replacement file to satisfy removed paths.
- Runtime subsystem boundaries: agent/team/tool/LLM/memory/multimedia/external-channel owners remain unchanged and should not acquire UI responsibilities during this cleanup.
- Terminal tools boundary: terminal execution remains under `src/tools/terminal/**`; no CLI/TUI removal step may reach into this subsystem except reference validation.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/index.ts` | Supported root re-exports | Root import consumers | Re-exporting deleted CLI/TUI stubs from root | Add/adjust true supported runtime exports, not CLI wrappers |
| Domain subsystem deep paths | Concrete subsystem files | Active server/gateway/runtime consumers | Importing removed `autobyteus-ts/cli/**` paths | Use programmatic runtime/server/web path or design a new surface separately |
| `src/tools/terminal/**` | PTY/session factory/backends | Tool/runtime callers | Deleting terminal code as if it were native CLI UI | Keep terminal tools; only remove `src/cli/**` |

## Dependency Rules

Allowed:

- Active consumers may continue importing `autobyteus-ts` root exports and non-CLI deep subpaths.
- Runtime/domain subsystems may continue depending on their existing internal helpers.
- Terminal tools may continue depending on `node-pty` optional runtime support and postinstall repair scripts.

Forbidden:

- No source/test/example import may reference `autobyteus-ts/src/cli/**`, `autobyteus-ts/cli/**`, `runAgentCli`, `runAgentTeamCli`, `InteractiveCliDisplay`, `TuiStateStore`, or TUI widget renderables.
- `src/index.ts` must not re-export removed CLI/TUI APIs.
- `package.json` must not keep direct `ink`, `react`, or `@types/react` entries solely for deleted code.
- Do not add compatibility stubs, alias files, empty barrels, or deprecation wrappers for removed CLI/TUI paths.
- Do not remove terminal runtime/tooling code or `node-pty` under this task.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| Root package import `autobyteus-ts` | Supported package public APIs | Expose non-CLI runtime/library exports | ESM root import | Remove CLI/TUI exports only. |
| Deep non-CLI imports, e.g. `autobyteus-ts/tools/...`, `autobyteus-ts/llm/...` | Concrete subsystem files | Explicit subsystem access for workspace consumers | ESM subpath import | Preserve active deep imports. |
| Removed `autobyteus-ts/cli/**` imports | Obsolete CLI/TUI | None in target state | N/A | Must fail by absence; no replacement. |
| Removed helper APIs `runAgentCli`, `runAgentTeamCli`, `InteractiveCliDisplay`, `TuiStateStore` | Obsolete CLI/TUI | None in target state | N/A | Do not reintroduce. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Root package facade after removal | Yes | Yes | Low | Remove CLI/TUI exports; keep existing non-CLI exports. |
| Deep non-CLI subpath imports | Yes | Yes | Low | Preserve. |
| Removed CLI/TUI APIs | N/A | N/A | Low | Delete instead of wrapping. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Native CLI/TUI | `src/cli`, `runAgentCli`, `runAgentTeamCli`, `TuiStateStore` | Yes historically, obsolete now | High if retained | Remove. |
| Terminal tools | `src/tools/terminal` | Yes | Low | Preserve; do not conflate with native CLI/TUI. |
| Package public facade | `src/index.ts` | Yes | Low | Remove stale exports. |

## Applied Patterns (If Any)

No new runtime pattern is introduced. This design applies a removal/decommission sequence and package public-facade pruning. Existing patterns in runtime/domain subsystems remain unchanged.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/cli/` | Folder | Obsolete native CLI/TUI boundary | Removed | Dedicated obsolete UI subtree. | Any retained stubs or wrappers |
| `autobyteus-ts/tests/unit/cli/` | Folder | Obsolete CLI/TUI tests | Removed | Tests only target deleted UI code. | Tests importing removed modules |
| `autobyteus-ts/src/index.ts` | File | Root package facade | Supported non-CLI exports | Existing public boundary. | CLI/TUI exports |
| `autobyteus-ts/examples/` | Folder | Examples/docs | Remaining non-CLI examples only | Existing examples area. | Interactive runners that import removed CLI/TUI |
| `autobyteus-ts/package.json` | File | Package manifest | Dependencies/scripts/package metadata | Existing manifest. | `ink`, `react`, `@types/react` direct entries for deleted UI |
| `pnpm-lock.yaml` | File | Workspace lockfile | Workspace dependency graph | Existing workspace lock. | Stale direct `autobyteus-ts` `ink` dependency |
| `autobyteus-ts/pnpm-lock.yaml` | File | Package-local lockfile | Package dependency graph | Existing local lock. | Stale direct `ink` dependency |
| `autobyteus-ts/tsconfig.json` | File | TypeScript config | Shared compiler options | Existing config. | JSX config solely for deleted files |
| `autobyteus-ts/src/tools/terminal/` | Folder | Terminal tools subsystem | Preserved terminal tool runtime | Existing runtime tool owner. | CLI/TUI deletion edits |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/cli/` | Removed presentation/control boundary | Yes | Low after deletion | Entire folder is obsolete UI surface. |
| `src/tools/terminal/` | Runtime tool subsystem | Yes | Low | Separate owner; preserve. |
| `examples/` | Documentation/demo assets | Yes after pruning | Medium currently | Delete CLI-dependent examples so remaining folder matches supported examples. |
| `docs/` | Documentation | Mixed justified | Low | Update active docs that advertise removed CLI/TUI. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Root export removal | `src/index.ts` keeps `export * from './agent/runtime/index.js';` and removes `export * from './cli/index.js';` | `export const runAgentCli = () => { throw new Error('removed'); }` | The target is clean removal, not compatibility retention. |
| Terminal boundary preservation | Keep `src/tools/terminal/tools/run-bash.ts` and `node-pty` optional dependency. | Delete `src/tools/terminal/**` because it contains terminal-related code. | User explicitly clarified terminal code is unrelated to TUI/CLI. |
| Example cleanup | Keep `examples/discover-status-transitions.ts` if it still compiles without CLI/TUI. | Keep `examples/run-poem-writer.ts` while replacing `runAgentCli` with a local hidden prompt loop. | This task removes interactive CLI/TUI, not redesigns examples. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Stub `src/cli/index.ts` re-exporting functions that throw | Could make old imports fail at runtime with a message | Rejected | Delete `src/cli/**`; imports fail by absence. |
| Keep `runAgentCli`/`runAgentTeamCli` deprecated root exports | Could soften external breaking change | Rejected | Remove root exports; update docs/examples. |
| Move CLI display helpers to examples | Could preserve manual demos | Rejected | Delete CLI-dependent examples; no replacement in this cleanup. |
| Keep `ink`/`react` in dependencies for external users | Could avoid package install changes | Rejected | Remove direct dependencies once no built imports require them. |
| Export-map alias from `./cli/*` to server/web docs | Could point old users elsewhere | Rejected | No alias; docs may mention native CLI/TUI removed. |

## Derived Layering (If Useful)

Layering is not the main design driver. The useful structural distinction is ownership:

- Package facade/build config: root exports, package manifest, lockfiles, TS config.
- Domain/runtime subsystems: preserved.
- Obsolete presentation/control layer: removed `src/cli/**`.
- Terminal tool runtime: preserved and separate from presentation/control.

## Migration / Refactor Sequence

1. Verify the dedicated worktree is active and current.
2. Remove public CLI/TUI exports from `autobyteus-ts/src/index.ts`.
3. Delete `autobyteus-ts/src/cli/**`.
4. Delete `autobyteus-ts/tests/unit/cli/**`.
5. Delete or prune CLI/TUI-dependent examples:
   - Delete the 7 single-agent interactive runners under `examples/run-*.ts` that import `runAgentCli`.
   - Delete the 5 team interactive runners under `examples/agent-team/manual-notification/*.ts` that import `runAgentTeamCli`.
   - Delete now-orphaned example helper/assets directories if no remaining example imports them.
   - Keep `examples/discover-status-transitions.ts` and `examples/shared/logging.ts` if still used and compiling.
6. Update `autobyteus-ts/examples/README.md` and remove/update `examples/agent-team/README.md` depending on remaining folder contents.
7. Update active docs that describe or advertise native CLI/TUI, especially `autobyteus-ts/docs/nodejs_architecture.md`; adjust generic CLI references in active docs where they imply the removed native surface remains.
8. Remove `ink`, `react`, and `@types/react` from `autobyteus-ts/package.json`.
9. Remove `jsx` from `autobyteus-ts/tsconfig.json` after confirming no TSX/JSX source remains.
10. Regenerate/update both lockfiles with minimal package-manager churn:
    - root workspace `pnpm-lock.yaml`
    - `autobyteus-ts/pnpm-lock.yaml`
11. Run reference scans required by acceptance criteria.
12. Run validation:
    - `pnpm -C autobyteus-ts build`
    - targeted remaining `autobyteus-ts` unit tests chosen after deletion
    - targeted downstream import/type/build checks for active `autobyteus-server-ts`, `autobyteus-message-gateway`, and workspace script imports.
13. Confirm no compatibility stubs or stale direct dependencies remain.

## Key Tradeoffs

- Clean deletion is intentionally breaking for external CLI/TUI consumers, but it directly satisfies the simplification goal and avoids preserving stale public APIs.
- Deleting CLI-dependent examples is simpler and more honest than rewriting them into a hidden new interactive loop. If examples need a new supported interaction path later, that should be designed separately.
- Keeping wildcard subpath exports unchanged avoids broad export-map refactoring outside scope. Deleted `cli/**` paths still disappear because files no longer exist.
- Preserving terminal tools avoids conflating terminal execution capabilities with the obsolete native UI layer.

## Risks

- External consumers may break if they import removed CLI/TUI APIs.
- Lockfile updates may create unrelated churn if package-manager commands are not constrained.
- Removing examples could reduce manual demo coverage; this is acceptable for this cleanup but should be noted in final handoff.
- If validation environment lacks dependencies in the dedicated worktree, implementation/validation may need an install/bootstrap step before builds/tests.

## Guidance For Implementation

- Treat `src/cli/**` as the only source-code deletion boundary for native UI. Do not delete `src/tools/terminal/**` or `node-pty`.
- Prefer direct deletion over empty files or TODO stubs.
- After deletion, use `rg` to find stale symbols/imports before running full builds.
- Keep package root non-CLI exports stable. If a build fails because a root export was accidentally removed, restore the non-CLI export rather than broadening the removal.
- Use lockfile update commands that avoid opportunistic dependency upgrades where possible.
- Record validation evidence showing `pnpm -C autobyteus-ts build` passes and terminal tooling was not removed.
