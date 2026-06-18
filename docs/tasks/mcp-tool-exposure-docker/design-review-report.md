# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/requirements.md`
- Upstream Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/investigation-notes.md`
- Reviewed Design Spec: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/design-spec.md`
- Current Review Round: 1
- Trigger: Superseding design review request after user clarified remote/Docker browser automation must be MCP-based and remote “Pair local browser” must be removed in this ticket.
- Prior Review Round Reviewed: N/A. No prior canonical review report exists; the earlier design package was superseded before a completed architecture review.
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Upstream artifacts plus direct code inspection of Agent Tools MCP catalog/session/list/call, configured MCP resolver, browser bridge resolver/runtime binding, Electron remote pairing IPC/state/UI, GraphQL remote bridge resolver, generated GraphQL types, localization, docs, and existing tests.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Superseding scope: remove remote pairing and fix route-backed Agent Tools MCP exposure. | N/A | 0 | Pass | Yes | Design is implementation-ready with residual risks noted below. |

## Reviewed Design Spec

Reviewed `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/design-spec.md`. The design is spine-first, evidence-backed, and gives a clean-cut target: preserve host Electron env-injected embedded browser support, remove remote host-browser pairing, and make Agent Tools MCP session exposure source-route-backed so inactive embedded browser names do not suppress configured MCP tools.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design classifies the work as Bug Fix + Behavior Change + Removal/Cleanup. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | It identifies Boundary/Ownership Issue plus Legacy/Compatibility Pressure, citing static-name reservation and the now-obsolete remote pairing path. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor/removal is marked needed now; persisted source-aware tool selection is explicitly deferred. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Route table, env-only browser resolver, remote pairing deletion, generated types/docs/tests cleanup, and migration sequence all support the decision. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | No previous canonical report. | Earlier package was superseded. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Host Electron browser source simplification | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Agent Tools MCP source routing | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Remote pairing removal | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Runtime tool event/result normalization | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP | Pass | Pass | Pass | Pass | Correct owner for descriptor, enabled tools, tools/list, tools/call, and source route policy. |
| Backend browser tools | Pass | Pass | Pass | Pass | Env-only support resolver cleanly removes runtime remote binding. |
| Configured MCP | Pass | Pass | Pass | Pass | BrowserServer MCP stays normal configured-MCP source; no BrowserServer special case. |
| Electron browser runtime | Pass | Pass | Pass | Pass | Keeps local bridge/env injection and removes listener-host/remote descriptor responsibilities. |
| Frontend Nodes settings | Pass | Pass | Pass | Pass | Node CRUD remains; remote pairing controls/state are removed. |
| GraphQL schema/generated types | Pass | Pass | Pass | Pass | Remote bridge resolver/types are removed; generated frontend types must be regenerated/updated. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Tool route ownership | Pass | Pass | Pass | Pass | `agent-tool-mcp-tool-route.ts` is an appropriate small shared model under Agent Tools MCP. |
| Browser support source | Pass | Pass | Pass | Pass | Existing env parser remains; runtime binding structure is removed. |
| Node profile pairing state | Pass | Pass | Pass | Pass | Removing `browserPairing` avoids keeping obsolete compatibility state. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentToolMcpToolRoute` | Pass | Pass | Pass | Pass | Pass | One wire name maps to one source branch; `enabledTools` remains only a projection. |
| `NodeProfile` | Pass | Pass | Pass | N/A | Pass | Removing `browserPairing` eliminates stale state. |
| Browser bridge config | Pass | Pass | Pass | N/A | Pass | Env-only `{ baseUrl, authToken }` is tight. |
| Configured MCP source metadata | Pass | Pass | Pass | N/A | Pass | Resolver owns MCP metadata only; collision policy moves to catalog. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend runtime remote browser binding | Pass | Pass | Pass | Pass | `RuntimeBrowserBridgeRegistrationService`, GraphQL resolver, and registry sync are named. |
| Electron remote browser sharing/pairing | Pass | Pass | Pass | Pass | Pairing controller, IPC handler, settings store, listener-host behavior, auth registry remote token support are in scope. |
| Frontend pairing UI/store/client | Pass | Pass | Pass | Pass | Panel, controls, store, GraphQL client, NodeManager coupling are in scope. |
| Node pairing model/persistence | Pass | Pass | Pass | Pass | Legacy persisted field is dropped/ignored with no behavior retained. |
| Generated GraphQL/localization/docs/tests | Pass | Pass | Pass | Pass | Design calls out generated types, strings, docs, and stale tests. |
| Static-name reservation/static-first dispatch | Pass | Pass | Pass | Pass | Replaced by route-backed exposure/call lookup. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-tool-mcp-tool-route.ts` | Pass | Pass | Pass | Pass | Route model only; must not become a second registry. |
| `agent-tool-mcp-catalog.ts` | Pass | Pass | Pass | Pass | Right place for active provider and collision policy. |
| `configured-mcp-agent-tool-source-resolver.ts` | Pass | Pass | Pass | Pass | Should resolve MCP registry metadata only. |
| `agent-tool-mcp-session*.ts` | Pass | Pass | Pass | Pass | Session storage is the right place to freeze route ownership. |
| `browser-bridge-config-resolver.ts` | Pass | Pass | Pass | Pass | Env-only resolver after deletion. |
| `browser-runtime.ts` / `browser-bridge-server.ts` / auth registry | Pass | Pass | Pass | Pass | Local bridge only; remote sharing responsibilities removed. |
| `NodeManager.vue` | Pass | Pass | Pass | Pass | Node CRUD only after pairing UI/state removal. |
| GraphQL schema/type files | Pass | Pass | N/A | Pass | Delete remote bridge API surface. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent Tools MCP catalog | Pass | Pass | Pass | Pass | Backends/materializers consume descriptors; they must not recompute source policy. |
| Browser support resolver | Pass | Pass | Pass | Pass | Must not depend on runtime remote binding after removal. |
| Configured MCP resolver | Pass | Pass | Pass | Pass | Must not receive static reserved-name policy. |
| Electron preload/main | Pass | Pass | Pass | Pass | Must not expose pairing IPC after cleanup. |
| Frontend Node Manager | Pass | Pass | Pass | Pass | Must not depend on remote browser sharing store/client. |
| GraphQL schema | Pass | Pass | Pass | Pass | Must not expose removed remote bridge mutations/types. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentToolMcpCatalog.resolveConfiguredSessionToolExposure` | Pass | Pass | Pass | Pass | Authoritative exposure/route boundary. |
| `AgentToolMcpCatalog.resolveToolCallAvailability` | Pass | Pass | Pass | Pass | Must read session route ownership before selecting adapter. |
| `BrowserBridgeConfigResolver.resolve` | Pass | Pass | Pass | Pass | Env-only support boundary. |
| `NodeManager.vue` | Pass | Pass | Pass | Pass | Node UI no longer bypasses into browser pairing cleanup. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `BrowserBridgeConfigResolver.resolve(env)` | Pass | Pass | Pass | Low | Pass |
| `resolveConfiguredSessionToolExposure(context)` | Pass | Pass | Pass | Low | Pass |
| `ConfiguredMcpAgentToolSourceResolver.resolve` | Pass | Pass | Pass | Low | Pass |
| Electron preload API | Pass | Pass | Pass | Low | Pass |
| GraphQL schema | Pass | Pass | Pass | Low | Pass |
| Node profile normalization | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp` | Pass | Pass | Low | Pass | Right home for route model/catalog/session changes. |
| `autobyteus-server-ts/src/agent-tools/browser` | Pass | Pass | Low | Pass | After cleanup should contain embedded browser support only. |
| `autobyteus-server-ts/src/api/graphql/types` | Pass | Pass | Low | Pass | Remote bridge resolver removal belongs here/schema import. |
| `autobyteus-web/electron/browser` | Pass | Pass | Medium | Pass | Medium only because broad deletion must leave local bridge code coherent. |
| `autobyteus-web/components/settings` | Pass | Pass | Low | Pass | Remove pairing components; NodeManager remains. |
| `autobyteus-web/types` / `electron` type declarations | Pass | Pass | Low | Pass | Remove descriptor/settings/pairing declarations. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Host Electron embedded browser | Pass | Pass | N/A | Pass | Reuse/simplify existing env injection path. |
| Remote/Docker browser automation | Pass | Pass | N/A | Pass | Reuse configured MCP management/BrowserServer MCP. |
| Runtime source ownership | Pass | Pass | Pass | Pass | Route model is justified because list/call/descriptor must agree. |
| Remote pairing | Pass | Pass | N/A | Pass | Remove rather than extend/hide. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Remote Pair local browser | No target compatibility path | Pass | Pass | UI, IPC, GraphQL, runtime binding, state, docs, tests all removed. |
| BrowserServer MCP name prefix workaround | No | Pass | Pass | Correctly rejected; route policy fixes generic issue. |
| `browserPairing` persisted field | No target behavior | Pass | Pass | Legacy field may be ignored/dropped. |
| Static-name reservation | No | Pass | Pass | Replaced with active route policy. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Backend remote binding removal | Pass | Pass | Pass | Pass |
| Electron remote sharing removal | Pass | Pass | Pass | Pass |
| Frontend Node Manager cleanup | Pass | Pass | Pass | Pass |
| GraphQL generated type refresh | Pass | Pass | Pass | Pass |
| Agent Tools MCP route refactor | Pass | Pass | Pass | Pass |
| Tests/docs updates | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Docker with BrowserServer MCP | Yes | Pass | Pass | Pass | Good and bad route shapes are explicit. |
| Docker without BrowserServer MCP | Yes | Pass | Pass | Pass | Confirms no unavailable embedded tools. |
| Host Electron | Yes | Pass | Pass | Pass | Preserves local desktop embedded support. |
| Removed pairing | Yes | Pass | Pass | Pass | Prevents hidden compatibility API. |
| Protected static tool | Yes | Pass | Pass | Pass | Confirms `send_message_to`-style tools remain protected. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Exact protected-static policy inventory | Implementation must not accidentally let configured MCP override platform/control tools. | Encode policy explicitly in adapter/provider metadata or catalog route policy; at minimum cover `send_message_to` and other non-browser platform/control adapters intended to be protected. | Residual implementation risk, not blocking design. |
| Bare-name selection cannot distinguish future user preference between host embedded browser and same-named MCP when both exist. | Design intentionally defers persisted source-aware selection. | Keep documented deterministic precedence for this ticket; treat source-aware persisted selection as future work if users need it. | Accepted residual risk. |
| Generated type/codegen workflow | Schema deletion must not leave stale frontend types. | Implementation should run/update the repository’s GraphQL generation path or hand-edit generated artifact consistently if that is the repo convention. | Residual implementation risk. |
| BrowserServer MCP result shape/event normalization | Exposing MCP browser tools may surface result-shape differences in UI activity cards. | API/E2E engineer should validate or adjust coverage after implementation. | Residual test/coverage risk. |

## Review Decision

`Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- The removal is broad. Implementation must run repository-wide searches for remote pairing names and update generated GraphQL types, localization, tests, and durable docs.
- The route-backed catalog must encode protected static policy explicitly, not by reintroducing all static names as globally reserved names.
- The current bare-name tool configuration means same-name host embedded browser vs BrowserServer MCP source preference is deterministic runtime policy, not user-selected persisted state; this is accepted by the design as a deferred future feature.
- Host Electron env-injected browser support must remain covered after simplifying Electron browser runtime and auth registry.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Route-backed Agent Tools MCP exposure plus clean-cut remote pairing removal is architecturally sound, boundary-aligned, and actionable in the current codebase.
