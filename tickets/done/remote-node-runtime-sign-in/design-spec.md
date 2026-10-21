# Design Spec — remote-node-runtime-sign-in

## Solution And Approval Basis

- Current solution revision ID: SR-002
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the Task's direction (user informed), 2026-10-21
- Behavior-defining supplements: none
- Design status: Ready
- Canonical investigation-notes path: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/remote-node-runtime-sign-in/tickets/in-progress/remote-node-runtime-sign-in/investigation-notes.md`
- Authorities read (2026-10-21): `references/architecture-design.md`, `references/design-principles.md`, repository `DESIGN.md` (rules 1, 5, 9 apply; no persisted data). `design-examples.md` not needed.
- Project design-principle conflicts or discrepancies: none.

## Current-State Read

- Server (E-04, A-01): `AgentRuntimeStatusService` (`autobyteus-server-ts/src/runtime-management/agent-runtimes/`) is the module's only public boundary. `startSignIn` / `cancelSignIn` run the strategy's `signInArgv` as a `RuntimeProcessOperation` with the server's environment, on whatever node the server runs. Nothing restricts it to the own node. On a Docker node the environment carries `BROWSER` → VNC Chromium (E-05). A real probe proved the vendor pages open there (E-08).
- Web (E-03): `AgentRuntimesManager.vue` derives `isOwnNode` from `windowNodeContextStore.isEmbeddedWindow` and passes it to `AgentRuntimeRow.vue`. One boolean gates four things: the Sign in button, Update, the command-line hint and the sign-in outcome line. The root cause of the reported problem is this gate. It treats "can sign in here" and "can update here" as the same fact.
- Missing fact: the client cannot tell a node that has a desktop browser from one that has none. On a node without one, the vendor login waits until the time-out (E-09).

## Task Size And Architectural Risk (Mandatory)

- Task size: Medium
- Size rationale: two subsystems (server Agent Runtimes module + GraphQL resolver; web Agent Runtimes settings view, composable, query, localization), about 10 source files plus tests and two docs. All of it sits inside the existing owners. No new module, process or route.
- Architectural risk: Low
- Risk rationale: one additive, read-only GraphQL field owned by the existing `AgentRuntimeStatusService`. It is computed from the process environment once, starts no work and does not change the mutations. No persistence, no concurrency change (one operation per runtime stays), no deployment change (the Docker image already has the browser bridge). Security exposure is unchanged: the mutations were already callable by every client the node accepts (E-11). Own-node behavior is untouched (DEC-003).
- Escalation trigger: if implementation finds that a server-side refusal or a change to the mutations, the Docker image or the remote-access policy is needed, or that completing sign-in in the node's browser fails for a real account (R-01), return a Design Impact to the Solution Designer.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Probe | `evidence/SD-probe-remote-signin.sh`, `evidence/SD-03-probe-run.log` | Server-started Codex and Grok logins open in the Docker node's Chromium | No server or image change needed for the flow | Real-account completion (R-01) |
| Command | E-09 | Without `DISPLAY`/`BROWSER` both logins only wait | The node must report whether it can open a browser | — |
| Code read | E-03, A-02, A-04 | One `isOwnNode` gate; no node-level field in `agentRuntimes` | Split the gate; add one node field | — |
| Code read | E-05, E-06 | Docker image sets `BROWSER` and `DISPLAY=:99` | The rule "BROWSER, DISPLAY or WAYLAND_DISPLAY set (Linux)" reports yes for Docker nodes | — |

## Intended Change

The node's server reports whether its runtimes' logins can open a browser on its own desktop. The Agent Runtimes page then offers Sign in on a remote node whose server says yes, with remote wording. Update stays own-node only.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002, UC-003. Server: one node fact in the Agent Runtimes module and the resolver. Web: the Agent Runtimes query, composable, manager, row, presentation helper, en/zh-CN catalogs. Docs: web `docs/settings.md` §Agent Runtimes, server `docs/modules/agent_runtimes.md`. Tests: server unit tests, web unit tests, the settings browser probe.
- Deliberately left alone: the sign-in/cancel/update mutations and `AgentRuntimeStatusService` operation logic (they already work on any node); the vendor strategies; the Docker image, compose and browser bridge; the remote-access policy; the VNC Viewer and Terminal; Update gating; the chat's error rendering (FU-001); the application launch-readiness adapter.
- Follow-ups: FU-001 (chat shows Codex auth failure as generic reconnect errors), FU-002 (sign-in for remote nodes without a desktop).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Trigger | Existing Behavior / Evidence | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-002; AC-001, AC-002, AC-009 | Sign in on a remote row | Hidden (E-03) | Offered when the node can open a browser; same operation | DS-001, DS-002 |
| BEH-002 | User | REQ-003, REQ-005; AC-003 | Opening the page on a remote node | Status-only note | Note by node fact; no Update | DS-002 |
| BEH-003 | User | REQ-004; AC-004 | Same | No hint | Hint "…on that node." on desktop nodes | DS-002 |
| BEH-004 | System | REQ-002; AC-005 | Node without a desktop | Status only | Unchanged | DS-002 |
| BEH-005 | User | REQ-006; AC-006 | Own node | Shipped | Unchanged | DS-002 (own branch) |
| BEH-006 | System | AC-007 | Codex agent after sign-in | 401 retries (E-07) | Works after sign-in | Outside the change (vendor credentials) |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `evidence/SD-probe-remote-signin.sh` | Real Docker-node reproduction | AC-001, AC-002 | Proves the unchanged server path; API/E2E reuses it against a branch-built image | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: Feature (behavior change of an approved page)
- Current design issue found: Yes, small
- Structural triggers: *Ambiguous boundary* (a boolean standing for two different facts) fires in the web row's `isOwnNode` prop, which gates both "can update here" (own node only) and "can sign in here" (needs a browser on the node). Evidence: E-03. Others ruled out: no repeated coordination (one composable); no responsibility overload (row 200 lines, manager 141); no shared-folder or persistence trigger; no legacy pressure. Capability-area reuse applies to the new fact: the Agent Runtimes module already owns sign-in.
- Root cause classification: Boundary Or Ownership Issue (local): one flag carries two facts, and the fact the sign-in needs is not owned by anyone.
- Refactor needed now: Yes, local. Replace the boolean prop with an explicit node-access value. Give the "can open a browser" fact to the server's Agent Runtimes module.
- Evidence: E-03, E-09, A-02, A-04.
- Design response: `AgentRuntimeNodeAccess` (`'own' | 'remoteDesktop' | 'remoteStatusOnly'`) is derived once in the manager. The row asks the presentation helpers `canUpdateHere(access)` and `canSignInHere(access)`. The server exposes `agentRuntimeSignInBrowserAvailable`.
- Refactor rationale: adding a second boolean beside `isOwnNode` would leave the two facts tangled across the template's `v-if`s.
- Intentional deferrals and residual risk: none.

## Terminology

- *Node access*: what this window may do with the bound node's runtimes. `own`: the desktop's own node. `remoteDesktop`: a remote node whose server can open a browser on its own desktop. `remoteStatusOnly`: a remote node that cannot.
- *Sign-in browser available*: the node's server can open a browser on the node's own desktop.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: the `isOwnNode` prop of `AgentRuntimeRow.vue` and the D-3 comment in `AgentRuntimesManager.vue` are replaced by node access.
- Compatibility wrappers, dual paths, or legacy fallbacks kept: None. Per DESIGN.md rule 9, the web reads the new field unconditionally; an older node is not supported.

## Persisted Data / State Transition Decision

- Decision: Not Affected. AutoByteus stores nothing new. Vendor credentials are written by the vendor CLIs in the node's home, as on the own node today.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-006 | User presses Sign in in a remote-node window | Row shows Signed in | `AgentRuntimeStatusService` (operation), `useAgentRuntimes` (page state) | The Task's goal; unchanged path now reachable remotely |
| DS-002 | Primary End-to-End | BEH-001…BEH-005 | Page opens / polls | Row controls and copy per node access | `AgentRuntimesManager` (node access) | Decides what the page offers |
| DS-003 | Bounded Local | BEH-001 | Server start | Fact available to every read | `AgentRuntimeStatusService` | One environment read, no work on polls |

## Primary Execution Spine(s)

- DS-001: `Agent Runtimes page (remote window) -> startAgentRuntimeSignIn (node GraphQL) -> AgentRuntimeStatusService.startSignIn -> vendor login process -> node desktop browser (VNC) -> vendor callback on node loopback -> status service re-reads account -> agentRuntimes poll -> row Signed in`
- DS-002: `Agent Runtimes page opens -> useAgentRuntimes reads agentRuntimes + agentRuntimeSignInBrowserAvailable from the bound node -> AgentRuntimesManager derives node access (own window? + node fact) -> AgentRuntimeRow shows Sign in / hint / Update / note by node access`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Same operation as on the own node. The node runs the vendor's login with its own environment; on a Docker node that environment opens the page in the VNC Chromium. The user finishes there; the vendor CLI exits; the service reads the account again and ends the operation. The page's existing polling shows it. | page, node API, status service, vendor process, node browser | `AgentRuntimeStatusService` | none new |
| DS-002 | The composable reads the node's rows and its one node fact in the same query. The manager combines it with "is this the own window" into node access. Rows render from node access only. | composable, manager, row | `AgentRuntimesManager` | localized copy |
| DS-003 | The composition (or the service default) computes the fact from the process platform and environment once; the resolver returns it. | composition, service | `AgentRuntimeStatusService` | `sign-in-browser-availability.ts` rule |

## Spine Actors / Main-Line Nodes

- Web: `useAgentRuntimes` (data), `AgentRuntimesManager.vue` (node access), `AgentRuntimeRow.vue` (rendering).
- Server: `AgentRuntimesResolver` (thin GraphQL facade), `AgentRuntimeStatusService` (owner of rows, operations and now the node fact).

## Ownership Map

- `AgentRuntimeStatusService`: owns the rows, operations and the node's "sign-in browser available" fact (`signInBrowserAvailable()`), given at construction.
- `isSignInBrowserAvailable(platform, env)` (new pure rule): owns *how* the fact is decided.
- `AgentRuntimesResolver`: thin facade; maps to GraphQL; owns nothing.
- `useAgentRuntimes`: owns the page's read state, now including `signInBrowserAvailable`.
- `AgentRuntimesManager.vue`: owns node access (combines own-window fact and node fact).
- `agentRuntimesPresentation.ts`: owns the per-row rules (`offersSignIn`, `offersUpdate`), now also `canUpdateHere(access)`, `canSignInHere(access)`.
- `AgentRuntimeRow.vue`: renders by node access; owns no policy.

## Thin Entry Facades / Public Wrappers

| Facade | Governing Owner | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentRuntimesResolver.agentRuntimeSignInBrowserAvailable` | `AgentRuntimeStatusService` | GraphQL boundary | Environment reading or platform rules |

## Removal / Decommission Plan (Mandatory)

| Item To Remove | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `AgentRuntimeRow.vue` prop `isOwnNode` and its `isOwnNode &&` conditions | Carries two facts | prop `nodeAccess` + `canUpdateHere` / `canSignInHere` | — |
| `AgentRuntimesManager.vue` comment "Update and Sign in run only on the desktop's own node; a remote/Docker node window is status only (D-3)." | No longer true | Comment on node access | — |
| Docs sentences "They have no Update, no Sign in and no command-line hint." (web settings.md) and "The web client hides Update and Sign in there; the vendor commands run only on the desktop's own node." (server agent_runtimes.md) | No longer true | New remote paragraph | — |

## Return Or Event Spine(s)

- Existing polling (2 s while running, 10 s idle) carries the end of the operation back to the row. Unchanged.

## Bounded Local / Internal Spines

- DS-003, parent `AgentRuntimeStatusService`: `composition -> isSignInBrowserAvailable(process.platform, process.env) -> service field -> resolver read`. It matters because polls must not do work (QR-002).

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `sign-in-browser-availability.ts` | DS-003 | `AgentRuntimeStatusService` | The platform/environment rule | Testable pure rule | Env reads scattered into the resolver |
| Localization catalogs | DS-002 | Row/manager | Remote copy | Existing pattern | — |

## Ownership Boundaries

- The web depends only on the GraphQL query; it never guesses node capability from its URL, node type or name.
- The resolver depends only on `AgentRuntimeStatusService`; the service gets the fact from its dependencies (composition), not by reading `process.env` itself, so tests inject it.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanism | Upstream Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| `AgentRuntimeStatusService` | `isSignInBrowserAvailable` rule | resolver | Resolver calling the rule or reading env directly | Add to the service |
| `useAgentRuntimes` | Apollo query | manager | Manager issuing its own query | Extend the composable |

## Dependency Rules

- `api/graphql/types/agent-runtimes.ts` → `AgentRuntimeStatusService` only.
- `compositions/agent-runtime-status-composition.ts` → `sign-in-browser-availability.ts` (computes once) → passes the boolean to the service.
- Web components → presentation helpers and the composable; no component reads `windowNodeContextStore` except the manager (as today).

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| GraphQL `agentRuntimeSignInBrowserAvailable: Boolean!` | The node | Whether the runtimes' own logins can open a browser on this node's desktop | none (the node answering) | Read only; never starts work |
| `AgentRuntimeStatusService.signInBrowserAvailable(): boolean` | The node | Same | none | From dependency `signInBrowserAvailable` (default: the rule on `process`) |
| `isSignInBrowserAvailable(platform: NodeJS.Platform, env: NodeJS.ProcessEnv): boolean` | Rule | `darwin`/`win32` → true; otherwise true iff `BROWSER`, `DISPLAY` or `WAYLAND_DISPLAY` is non-empty | — | Pure |
| `AgentRuntimeRow` prop `nodeAccess: AgentRuntimeNodeAccess` | The window's access to the node | Rendering mode | — | Replaces `isOwnNode` |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `agentRuntimeSignInBrowserAvailable` | Yes | Yes | Low | Node-level field, not repeated on each row (a per-row copy would mix node and runtime subjects) |
| `nodeAccess` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Node fact | `agentRuntimeSignInBrowserAvailable` / `signInBrowserAvailable` | Yes | Low | — |
| Rule | `isSignInBrowserAvailable` in `sign-in-browser-availability.ts` | Yes | Low | — |
| Node access | `AgentRuntimeNodeAccess` `'own' \| 'remoteDesktop' \| 'remoteStatusOnly'` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Remote sign-in operation | `AgentRuntimeStatusService` | Reuse | Works on any node (E-08) |
| Node fact | Agent Runtimes module | Extend | It owns sign-in |
| Opening the browser on Docker | Docker image bridge | Reuse | Already ships |
| Polling and announcements | `useAgentRuntimes` | Extend (one field) | — |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spines | Decision |
| --- | --- | --- | --- |
| Server Agent Runtimes (`src/runtime-management/agent-runtimes/`) | Node fact + rule | DS-001, DS-003 | Extend |
| Server GraphQL (`src/api/graphql/types/agent-runtimes.ts`) | Field | DS-002 | Extend |
| Web Agent Runtimes settings (`components/settings/agent-runtimes/`, `composables/settings/useAgentRuntimes.ts`, `graphql/queries/agentRuntimesQueries.ts`, catalogs) | Node access and copy | DS-002 | Extend |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no extraction changed the draft).

## Reusable Owned Structures Check

| Repeated Structure | Shared File | Owner | Why Shared | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| `AgentRuntimeNodeAccess` type and `canUpdateHere` / `canSignInHere` | `agentRuntimesPresentation.ts` | Web Agent Runtimes view | Used by manager and row | Yes | Yes (replaces the boolean) | A general node-capability module |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `AgentRuntimeNodeAccess` | Yes | Yes | Low | Do not keep `isOwnNode` beside it |

## Final File Responsibility Mapping

| File | Owner | Concrete Concern | Change |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/agent-runtimes/sign-in-browser-availability.ts` | Agent Runtimes | The rule (pure) | Add |
| `autobyteus-server-ts/src/runtime-management/agent-runtimes/agent-runtime-status-service.ts` | Agent Runtimes | New dependency `signInBrowserAvailable?: boolean` (default the rule on `process.platform`/`process.env`) and `signInBrowserAvailable()` | Modify (small) |
| `autobyteus-server-ts/src/compositions/agent-runtime-status-composition.ts` | Composition | No change needed when the service default is used; keep as is unless implementation prefers passing it explicitly | Unchanged or Modify |
| `autobyteus-server-ts/src/api/graphql/types/agent-runtimes.ts` | GraphQL | `@Query(() => Boolean) agentRuntimeSignInBrowserAvailable()` | Modify |
| `autobyteus-web/graphql/queries/agentRuntimesQueries.ts` | Web data | Add `agentRuntimeSignInBrowserAvailable` to the same `AgentRuntimes` document | Modify |
| `autobyteus-web/composables/settings/useAgentRuntimes.ts` | Web data | Expose `signInBrowserAvailable` (ref, `false` until read; reset on rebinding) | Modify |
| `autobyteus-web/components/settings/agent-runtimes/agentRuntimesPresentation.ts` | Web view rules | `AgentRuntimeNodeAccess`, `canUpdateHere`, `canSignInHere` | Modify |
| `autobyteus-web/components/settings/agent-runtimes/AgentRuntimesManager.vue` | Web view | Derive `nodeAccess`; note text by access; pass to rows | Modify |
| `autobyteus-web/components/settings/agent-runtimes/AgentRuntimeRow.vue` | Web view | Render by `nodeAccess`: Sign in/hint/outcome when `canSignInHere`; Update and blocked line when `canUpdateHere`; remote copy when not own | Modify |
| `autobyteus-web/localization/messages/{en,zh-CN}/agentRuntimesSettings.ts` | Copy | 3 new keys (below) | Modify |
| `autobyteus-web/types/agentRuntimes.ts` | Web types | Unchanged (node fact is not a row field) | — |
| Docs: `autobyteus-web/docs/settings.md`, `autobyteus-server-ts/docs/modules/agent_runtimes.md` | Docs | Remote sign-in paragraph; GraphQL field | Modify |
| Tests: server `tests/unit/runtime-management/agent-runtimes/` (rule matrix, service default/injected), `tests/unit/api/graphql/agent-runtimes-resolver.test.ts`; web `components/settings/agent-runtimes/__tests__/*`; `tests/e2e/agent-runtimes-settings-probe.mjs` (remote node with and without the fact) | Tests | — | Modify/Add |

New copy (normative English, zh-CN in the catalog style):

| Key | en | zh-CN |
| --- | --- | --- |
| `settings.agentRuntimes.node.remoteDesktopNote` | Sign-in opens the browser on that node; finish it in the VNC Viewer. Update these runtimes on that node's computer. | 登录会在该节点的浏览器中打开，请在 VNC 查看器中完成。请在该节点所在的电脑上更新这些运行时。 |
| `settings.agentRuntimes.signIn.waitingOnNode` | Finish signing in to {{name}} in the browser on that node (VNC Viewer). | 请在该节点的浏览器中完成 {{name}} 的登录（VNC 查看器）。 |
| `settings.agentRuntimes.signIn.hintOnNode` | Sign in from its command line on that node. | 请在该节点的命令行中登录。 |

`settings.agentRuntimes.node.remoteNote` stays for `remoteStatusOnly`.

## Applied Patterns

- None new. The existing strategy pattern of the module is untouched.

## Target Subsystem / Folder / File Mapping

As in Final File Responsibility Mapping. The rule goes beside the other small single-concern files of `agent-runtimes/` (`runtime-version.ts`, `runtime-source-fetch.ts`); no new folder.

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `src/runtime-management/agent-runtimes/` | Main-line domain + small off-spine rules | Yes | Low | Existing flat layout of the module |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Row gating | `v-if="canSignInHere(nodeAccess) && (signingIn \|\| offersSignIn(runtime))"`; `v-else-if="canUpdateHere(nodeAccess) && offersUpdate(runtime)"` | `v-if="isOwnNode \|\| (browserAvailable && !isUpdate)"` spread through the template | One named rule per fact |
| Copy choice | `nodeAccess === 'own' ? t('…signIn.waiting', { name }) : t('…signIn.waitingOnNode', { name })` | Detecting Docker by URL/port/name in the web | The server knows its own desktop |
| Server fact | `new AgentRuntimeStatusService({ …, signInBrowserAvailable: false })` in tests | Tests mutating `process.env` | Deterministic tests |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Web tolerates a node without the new field (treat missing as false) | Older Docker images | Rejected (DESIGN.md rule 9) | Query reads the field; nodes run the same release |
| Keep `isOwnNode` prop beside `nodeAccess` | Smaller diff | Rejected | `nodeAccess` only |

## Derived Layering

N/A — the spine explains it.

## Change / Refactor Sequence

1. Server: add the rule file and its unit tests; add the service dependency/method; add the resolver field and test.
2. Web: query field → composable ref → presentation helpers/type → manager node access and note → row gating and copy → catalogs (en, zh-CN) → unit tests (own, remoteDesktop, remoteStatusOnly).
3. Browser probe: extend the remote-node case to cover both node facts (start the probe's backend with and without a `BROWSER` value, or the probe's existing node-binding approach plus a server env). API/E2E owns the probe design.
4. Docs.
5. Real Docker check: build the server image from the branch (`autobyteus-server-ts/docker/build.sh` / `Dockerfile.monorepo`) and run `evidence/SD-probe-remote-signin.sh <branch image>`. Bind a branch-built web window to it and check AC-001…AC-005 up to the vendor page. Signed-in completion with a real account (AC-001/AC-002 end, AC-007) is checked on the user's running Docker node once it runs a build with this change (delivery decides how: local image build or beta release).

## Key Tradeoffs

- Client-side gate plus a server fact, rather than a server-side refusal: the server keeps accepting sign-in everywhere, as today. A refusal would add a new error path and risk the own node (DEC-003) for no supported scenario.
- The environment rule is a heuristic: a Linux node with `DISPLAY` set but nobody watching still says yes. That is acceptable. The note tells the user where the browser opens, and the time-out ends a sign-in nobody finishes.
- No link from Settings to the VNC Viewer; the copy names the tab. Kept small; can be a later refinement.

## Risks

- R-01: real-account completion in the node's Chromium not yet observed (the probe stops at the vendor page). Mitigation: final verification on the user's node.
- R-02: the user's Docker node must run a server with the new field (DESIGN.md rule 9); until then the branch web shows a load error for that node. Delivery sequences the node update with the verification.
- R-03: a node's Chromium may crash without the shipped security options (E-08 side finding); the shipped compose passes them. Not changed here.

## Guidance For Implementation

- Reproduction to start from: `tickets/in-progress/remote-node-runtime-sign-in/evidence/SD-probe-remote-signin.sh [image]`. It shows the server path already works on the published beta image. The failing part is the web gate: start from a web unit test that binds the window to a remote node with `agentRuntimeSignInBrowserAvailable: true` and expects the Codex Sign in button. It fails on the base and must pass.
- Keep the privacy rule: the remote waiting copy shows no URL or code.
- Keep `signInBrowserAvailable` out of `AgentRuntime` rows and out of `types/agentRuntimes.ts`'s `AgentRuntime` interface.
- Reset `signInBrowserAvailable` with the rows when the window is bound to another node.
