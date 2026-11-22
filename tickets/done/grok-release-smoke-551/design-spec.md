# Design Spec

## Solution And Approval Basis

- Package: `grok-release-smoke-551` (Project Task `autobyteus-551`)
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-release-smoke-551`, `codex/grok-release-smoke-551`; base `origin/personal` @ `df00f97aaa`; finalization target `origin/personal`
- Approved requirements: `requirements-doc.md` SR-001, approved by the user 2026-11-22 (DEC-003 → (a))
- Solution revision: `SR-002` (design)
- Authorities read: skill `references/architecture-design.md`, `references/design-principles.md`; project `DESIGN.md` (repository root). No closer `DESIGN*.md` applies. No conflict found.
- Design approval by the user: not required by the direction.

## Current-State Read

Grok Build runs over ACP. Three owners matter:

- `AcpClientConnection` (`src/runtime-management/acp/acp-client-connection.ts`) owns one agent process's protocol stream: its requests with their time-outs (`INITIALIZE_TIMEOUT_MS` 30 s at `:28`, reused for extension requests, `set_config_option`, `session/list`, `session/close`) and the inbound stage that routes notifications to sessions by `sessionId`. Notifications without a `sessionId` are dropped (`:256-260`).
- `acp-discovery-handshake.ts` owns short-lived agent processes for catalog reads, each bounded by `DISCOVERY_TIMEOUT_MS` 15 s (`:8`), cut to a step deadline when given. `runAcpDiscoveryHandshake` returns `initialize`'s answer and stops the process (`:70-74`); its one caller is Grok (`grok-build-capability.ts:115`).
- The Grok capability (`src/runtime-management/grok/grok-build-capability.ts`) probes `grok --version` and `grok agent --help` (3 s each, `:11`), then normalizes `initialize._meta.modelState` through `normalizeGrokBuildModels` (`grok-build-launch-profile.ts:52`). `grokBuildLaunchProfile` builds run and discovery processes with the same environment: the server's plus `GROK_BUILD_DISABLED_TOOL_ENV` (`grok-build-launch-profile.ts:83-101`).

Behavior today: Grok's start-up beyond 15 s / 30 s fails discovery or run start; on the first Grok start after ≥ 6 h idle, discovery reports Grok's built-in list; Grok runs never load the workspace's `.grok/skills` at session start (investigation notes, Modes 1–3 and the design-phase section).

## Task Size And Architectural Risk (Mandatory)

- `task_size`: `Medium` — five source files in two existing subsystems (shared ACP runtime management, Grok runtime management), their unit tests, one module doc; no new owner, no persistence, no API.
- `architectural_risk`: `High`
  - Security: Grok runs now trust the run workspace, which also loads that workspace's Grok hooks, MCP/LSP servers, project instructions and permission rules, and the user's own Grok and Claude hooks (P17). User-approved (DEC-003), but a security-boundary change.
  - Shared contract: the shared ACP connection gains a connection-wide notification listener and a new start-up bound that also applies to the DeepSeek harness.
- Escalation trigger: a change to how other runtimes trust folders, or any write to the user's Grok settings, would be out of scope (Requirement Gap).

## Architecture Investigation Evidence

See `investigation-notes.md` (§ Evidence and § Architecture Investigation) and `evidence/SD-probes-2026-11-22.md` (P1–P17). The key rows:

| Source / Probe | Observation | Design Decision Supported |
| --- | --- | --- |
| P3, beta.3/4 timings | Grok start-up up to 34.6 s under load, inside Grok | 90 s start-up bounds (DEC-001) |
| P15 | built-in list only while Grok's sign-in token is expired; real list announced right after the fetch, which starts before Grok answers `initialize` | Discovery waits briefly for the announcement |
| P16 | announcement = `_x.ai/models/update`, connection-wide, same shape as `modelState`, ~0.2 s after `initialize` | One normalizer; a connection-wide listener; 3 s wait |
| P9, P12, P17 | `GROK_FOLDER_TRUST=0` per process loads project skills, persists nothing; documented by Grok | Trust in run launches only |
| `acp-layer-neutrality.test.ts` | shared ACP layer may not name Grok / `_x.ai` | Method name and wait come from the Grok side |

## Intended Change

1. **Start-up bounds (REQ-001, DEC-001).** The connection's `initialize` waits up to 90 s; the short discovery process is bounded at 90 s; Grok's CLI probes at 10 s each.
2. **Discovery reads Grok's announced catalog (REQ-002, DEC-002).** The discovery handshake keeps Grok running for up to 3 s after `initialize` until Grok sends `_x.ai/models/update`, and the Grok capability uses that list when it comes; otherwise the `initialize` list.
3. **Workspace trust for Grok runs (REQ-003, DEC-003).** Grok run processes get `GROK_FOLDER_TRUST=0`; discovery processes do not.

## Change Scope (Mandatory)

- Modified:
  - `autobyteus-server-ts/src/runtime-management/acp/acp-client-connection.ts` — start-up bound; request bound renamed; connection-wide notification listener.
  - `autobyteus-server-ts/src/runtime-management/acp/acp-discovery-handshake.ts` — 90 s bound; handshake waits for a follow-up notification; bound end passed to `use`.
  - `autobyteus-server-ts/src/runtime-management/grok/grok-build-capability.ts` — probe bound 10 s; discovery passes the models-update method and wait; uses the announced list.
  - `autobyteus-server-ts/src/runtime-management/grok/grok-build-launch-profile.ts` — `normalizeGrokBuildModels` takes a model-state record; run launches add the trust variable.
  - Unit tests: `tests/unit/runtime-management/acp/acp-client-connection.test.ts`, `tests/unit/runtime-management/grok/grok-build-capability.test.ts`, `tests/unit/runtime-management/grok/grok-build-launch-profile.test.ts`, plus fake-ACP fixtures under `tests/fixtures` as needed (the `acp-fake-agent-harness.ts` fixture mechanism).
  - Doc: `autobyteus-server-ts/docs/modules/grok_build_runtime.md` (discovery paragraph `:62-69`, process environment `:91-97`).
- Left alone deliberately: the 8 s step deadline (`read-deadline.ts:9`) of G-5 and the runtimes report; `SESSION_OPEN_TIMEOUT_MS`; the workspace skill materializer; `release_smoke.py` and the live suite (563 FU-1 stays with `autobyteus-567`); DeepSeek's session-options discovery logic (it only inherits the shared bounds); other runtimes' trust.
- Follow-ups found during design: FU-001, FU-002 (`follow-ups.md`).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Target Production Path | Lifecycle Boundary | Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001; AC-001 | catalog read without a step deadline (model picker, run validation, catalog snapshots) | `ModelCatalogService` → `GrokBuildModelCatalog` → `discoverGrokBuildModels` (probes 10 s) → `runAcpDiscoveryHandshake` (short process 90 s) → `AcpClientConnection.initialize` (90 s) | one short process per read | DS-001 |
| BEH-002 | System | REQ-001; AC-002 | run create / restore / team member activation | `AcpSessionLauncher.open` → `AcpClientConnection.initialize` (90 s) → session open (120 s, unchanged) | run process lifetime | DS-002 |
| BEH-003 | User/System | REQ-002; AC-003, AC-004 | same as BEH-001 | DS-001, plus the follow-up wait inside the short process; capability picks announced list | short process | DS-001, DS-003 |
| BEH-004 | User/System | REQ-003; AC-005 | run launch | `AcpSessionLauncher.open` → `grokBuildLaunchProfile.runLaunch` (env + `GROK_FOLDER_TRUST=0`) → Grok loads `<workspace>/.grok/skills` at `session/new` | run process lifetime | DS-002 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/SD-probes-2026-11-22.md` + probe scripts | probe record P1–P17 | all | evidence for the design decisions | Final |

## Task Design Health Assessment (Mandatory)

- Change posture: bug fix (three causes) plus a provider-behavior adaptation.
- Root cause classification:
  - Mode 1: `Local Implementation Defect` — bounds below the provider's measured start-up; one constant also served unrelated requests (`INITIALIZE_TIMEOUT_MS` reused), so splitting it is part of the fix (Principle 15: the name said less than it did).
  - Mode 2: `Missing Invariant` — discovery must report the catalog Grok really offers; the owner (Grok capability) took a provisional answer as final.
  - Mode 3: `Missing Invariant` — the launch profile owns Grok's process environment and did not give Grok what it needs to load the skills AutoByteus links for it.
- Refactor needed now: no. The existing owners absorb each change: the connection owns request bounds and notification routing; the discovery helper owns short processes; the Grok capability owns Grok's catalog meaning; the launch profile owns Grok's process environment.

## Terminology

Project glossary: `GLOSSARY.md`. Words used: "discovery" (catalog read through a short process, as in the code), "start-up" (the agent answering `initialize`), "follow-up notification" (a connection-wide notification an agent sends shortly after `initialize` that replaces part of its answer — local to the shared discovery helper, not a domain word; no glossary entry needed), "workspace trust" (Grok's folder-trust gate; Grok's term). No new domain word.

## Section Fill Order

Followed the principles' Practical Application Guide.

## Legacy Removal Policy (Mandatory)

No compatibility path. `INITIALIZE_TIMEOUT_MS` is renamed, not kept beside the new names. `normalizeGrokBuildModels(initialize)` changes signature; its callers (capability, its test) change with it.

## Persisted Data / State Transition Decision

`Not Affected`. AutoByteus stores nothing new. Grok's own cache and sign-in are refreshed by Grok as a side effect of the discovery process living a few seconds longer (Grok's behavior, not ours).

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001, BEH-003 | catalog read (GraphQL snapshot, run validation, model picker) | offered `ModelInfo[]` | Grok capability (`discoverGrokBuildModels`) | model list users and the smoke see |
| DS-002 | Primary | BEH-002, BEH-004 | run launch | open Grok session in the workspace | `AcpSessionLauncher` | run start under load; skills at session start |
| DS-003 | Bounded local | BEH-003 | short process spawned | handshake result returned, process stopped | `withShortAcpProcess` / `runAcpDiscoveryHandshake` | the wait must stay inside the bound and never turn a good answer into a time-out |

## Primary Execution Spine(s)

- DS-001: `Catalog read (ModelCatalogService) → GrokBuildModelCatalog → discoverGrokBuildModels: CLI probes → runAcpDiscoveryHandshake: spawn, listen, initialize, wait for follow-up → normalizeGrokBuildModels(announced ?? initial) → offered models`
- DS-002: `Run launch → AcpSessionLauncher.open → grokBuildLaunchProfile.runLaunch (env incl. GROK_FOLDER_TRUST=0) → AcpAgentProcess.spawn (cwd = workspace) → AcpClientConnection.initialize (≤ 90 s) → session/new or load/resume → Grok loads workspace skills`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Governing Owner | Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Each catalog read starts Grok briefly, takes its answer, and gives Grok up to 3 s to announce the real list before stopping it | capability, discovery helper, connection, normalizer | Grok capability | step deadline (unchanged) |
| DS-002 | Each run starts its own trusted Grok in the workspace and waits up to 90 s for it to start | launcher, launch profile, connection | `AcpSessionLauncher` | integration variables, relay (unchanged) |
| DS-003 | Listener registered before `initialize`; first matching notification kept; after the answer, return at once if one was seen, else wait until it comes, the window ends, or shortly before the bound ends | listener, initialize, wait | `runAcpDiscoveryHandshake` | none |

## Spine Actors / Main-Line Nodes

Catalog read, Grok capability, discovery helper, ACP connection, Grok process; run launcher, Grok launch profile.

## Ownership Map

- `AcpClientConnection`: request bounds (start-up vs other requests); routing of every inbound notification — session-scoped to sessions, connection-wide to connection listeners.
- `acp-discovery-handshake.ts`: short-process lifetime and bound; the follow-up wait (generic: method name and window come from the caller).
- Grok capability: which Grok method announces the catalog, how long to wait, and that the announced list replaces the initial one.
- Grok launch profile: Grok's process arguments and environment, including workspace trust for runs; the Grok model-state normalizer.

## Thin Entry Facades / Public Wrappers

None added.

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `INITIALIZE_TIMEOUT_MS` name | it bounded five kinds of request; the start-up bound now differs | `AGENT_START_TIMEOUT_MS` (initialize) and `REQUEST_TIMEOUT_MS` (the others) | rename, no alias |
| "Connection-wide extension notifications carry no session and serve no run" drop rule (`acp-client-connection.ts:257-259`) | discovery needs them | connection listeners | runs register none, so runs are unaffected |

No dead code found in the touched files (to be confirmed by implementation with the unused-export check).

## Return Or Event Spine(s)

`Grok → inbound stage (wire order) → deliverNotification → routeExt → no sessionId → connection listeners → handshake keeps the first _x.ai/models/update params`.

## Bounded Local / Internal Spines

DS-003 above. Rules:

- The listener is attached before `initialize` is sent, so an announcement that arrives before the answer (possible under load; the inbound stage delivers notifications before later responses, autobyteus-517) is kept.
- The wait ends at the first matching notification (Grok's announcement always carries the real list, P15), at `withinMs` after the answer, or 250 ms before the short process's bound ends, whichever is first. The wait itself never produces a time-out: when it ends without a notification, the handshake returns the answer with no follow-up.
- A step deadline (8 s callers) cuts the bound as today, so the wait shrinks with it.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Step deadline (`read-deadline.ts`) | DS-001 | catalog callers with a budget | cuts bounds | unchanged | — |
| Listener error containment | return spine | connection | a throwing listener is logged and does not break the stream or other listeners | per-frame containment rule of 517 | stream breaks |

## Ownership Boundaries

The shared ACP layer stays agent-neutral (`acp-layer-neutrality.test.ts`): it never names Grok or `_x.ai`; the Grok capability passes the method.

## Boundary Encapsulation Map

| Boundary | Internal Mechanism | Callers | Forbidden Bypass | Note |
| --- | --- | --- | --- | --- |
| `runAcpDiscoveryHandshake` | `withShortAcpProcess`, connection listener | Grok capability | the capability spawning or listening on a connection itself | |
| `AcpClientConnection` | inbound stage, SDK | launcher, session, discovery helper | reading the SDK stream directly | |

## Dependency Rules

- Grok → shared ACP (unchanged direction). Shared ACP never imports Grok.
- No new process-wide lookup. The connection listener is a notification listener (Principle 16: emitter behaves the same with or without listeners).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `AcpClientConnection.onConnectionNotification(listener: (method: string, params: Record<string, unknown>) => void): () => void` | one connection | deliver notifications that carry no `sessionId`, in wire order | method name | returns unsubscribe, like `onClose` |
| `runAcpDiscoveryHandshake(profile, followUp: { method: string; withinMs: number }, options?: AcpShortProcessOptions): Promise<{ initialize: InitializeResponse; followUp: Record<string, unknown> \| null }>` | one short agent process | the agent's answer plus the first follow-up notification's params | method name | `followUp` required: its one caller always passes it |
| `normalizeGrokBuildModels(modelState: unknown): ModelInfo[]` | Grok model state | normalize `{availableModels}` from `initialize._meta.modelState` or `_x.ai/models/update` params (same shape, P16) | — | replaces the `InitializeResponse` parameter |

## Interface Boundary Check

| Interface | Singular | Identity Explicit | Ambiguous Selector Risk | Correction |
| --- | --- | --- | --- | --- |
| `onConnectionNotification` | Yes | Yes | Low | — |
| `runAcpDiscoveryHandshake` | Yes | Yes | Low | — |
| `normalizeGrokBuildModels` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Same Meaning Everywhere | Note |
| --- | --- | --- | --- | --- |
| start-up bound | `AGENT_START_TIMEOUT_MS` | Yes | Yes | |
| other request bound | `REQUEST_TIMEOUT_MS` | Yes | Yes | |
| models announcement | `GROK_MODELS_UPDATE_METHOD` | Yes | Yes | Grok's own name `_x.ai/models/update` |
| run trust env | `GROK_BUILD_RUN_TRUST_ENV` | Yes | Yes | beside `GROK_BUILD_DISABLED_TOOL_ENV` |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| notification routing | `AcpClientConnection` inbound stage | Extend | it already sees every notification in wire order |
| short process with bound | `withShortAcpProcess` | Extend | pass the bound's end to `use` |
| per-process Grok env | `grokLaunch` | Extend | same place as the disabled-tool switches |
| fake agent for tests | `acp-fake-agent-harness.ts` fixtures | Reuse | scripted handshake already exists |

## Subsystem / Capability-Area Allocation

`runtime-management/acp` (shared ACP), `runtime-management/grok` (Grok). No new area.

## Draft File Responsibility Mapping / Final File Responsibility Mapping

| File | Owner | Concrete Concern |
| --- | --- | --- |
| `acp-client-connection.ts` | `AcpClientConnection` | request bounds; notification routing incl. connection listeners |
| `acp-discovery-handshake.ts` | short-process helpers | 90 s bound; handshake with follow-up wait |
| `grok-build-capability.ts` | Grok capability | probes (10 s); discovery uses the announced list |
| `grok-build-launch-profile.ts` | Grok launch profile | process args/env incl. run trust; model-state normalizer |

## Reusable Owned Structures Check / Shared Structure Tightness

The handshake result `{ initialize, followUp }` has two fields with one meaning each. No shared structure added.

## Applied Patterns

Observer (listener) on the connection, as `onClose`.

## Target Subsystem / Folder / File Mapping, Folder Boundary Check

No new files or folders (fixtures excepted).

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Grok side | `const { initialize, followUp } = await runAcpDiscoveryHandshake(grokBuildLaunchProfile, { method: GROK_MODELS_UPDATE_METHOD, withinMs: GROK_MODELS_UPDATE_WAIT_MS }, { deadline }); models = normalizeGrokBuildModels(followUp ?? modelStateOf(initialize));` | the shared helper checking `method.startsWith("_x.ai")` or normalizing models | neutrality; the capability owns Grok's meaning |
| Wait | end on first notification / window / bound − 250 ms; return the answer | letting the outer bound reject during the wait | a good answer must not become `GROK_MODEL_DISCOVERY_TIMEOUT` |
| Trust | `runLaunch` env `{...process.env, ...GROK_BUILD_DISABLED_TOOL_ENV, ...GROK_BUILD_RUN_TRUST_ENV}`; `discoveryLaunch` without it | `--trust` argument | `--trust` writes `~/.grok/trusted_folders.toml` (P10) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| keep `INITIALIZE_TIMEOUT_MS` as an alias | fewer edits | Rejected | rename at all six uses |
| optional `followUp` parameter | generic helper | Rejected | required; one caller |

## Change / Refactor Sequence

1. Connection: split the bound; add `onConnectionNotification`; route connection-wide notifications to listeners (each listener contained). Tests.
2. Discovery helper: 90 s bound; pass the bound's end to `use`; handshake with follow-up wait. Tests at this level with short windows.
3. Grok: normalizer signature; discovery uses the announcement; probes 10 s; run trust env. Tests (fixtures: built-in then update; update before answer; no update; run vs discovery env).
4. Doc update (`grok_build_runtime.md`).
5. Live checks (Guidance below).

## Key Tradeoffs

- **3 s wait on every Grok discovery when no announcement comes** (normal case: fresh sign-in). Grok gives no signal that no refresh is pending (P7, P14), so a time window is the only way to see the announcement. Cost: a Grok model-list read takes ~0.3 s + 3 s instead of ~0.3 s (QR-001 ≤ 5 s). The window ends early in the case it exists for. Run start pays it too: run model validation reads the catalog uncached (ARCH-REV-001 residual 1), so a Grok run or team launch takes ~3 s longer (one read per runtime and workspace in a team launch, `run-model-selection-service.ts:146-155`). Accepted; a shorter window would miss announcements under load, which is the release-smoke condition.
- **One shared start-up bound** for every ACP agent (Grok, DeepSeek harness): a per-agent bound would add a profile field for no observed need; the only effect on DeepSeek is a later failure for a hung harness.
- **Trust for every run, not only runs with linked skills**: the workspace's own skills (AC-104) need it too, and one rule is clearer.

## Risks

- RSK-001: Grok's announcement later than 3 s under heavy load → one stale list; Grok's token is then refreshed, so the next read is right. Shown by AC-006 if it happens.
- RSK-002: trust loads workspace/user hooks, MCP/LSP servers, instructions and permission rules in Grok runs (user-approved). A hook or `ask` rule could change a run's behavior; documented in the module doc.
- RSK-003: `_x.ai/models/update` and `GROK_FOLDER_TRUST` are Grok's; a Grok update could change them. The unit tests pin our side; the live AC-005/AC-003 checks catch Grok's side at release smoke.

## Guidance For Implementation

- Bounds: test the 90 s start-up with fake timers at the connection (not rejected at 31 s, rejected at 90 s), the other requests' 30 s unchanged. For the discovery bound, a fake-timer or a scripted delayed `initialize`; do not add a production parameter only tests use (DESIGN rule 11).
- Follow-up wait tests at the generic helper with short `withinMs` (it is a real parameter of the helper); one Grok-level fixture test may take the real 3 s.
- Keep the neutrality test green; the shared files must not mention Grok or `_x.ai`.
- Live checks (AUTOBYTEUS_TEST_VAULT per TESTING.md; never read Grok's `auth.json`; keep `rt_*`/token fields out of any copied Grok log line):
  - AC-005: the live AC-104 case ×3 with grok-4.7; `shasum ~/.grok/trusted_folders.toml` before and after.
  - AC-003: a discovery right after build (fresh sign-in) returns `grok-4.7` in ≤ initialize + 3.3 s; the stale case per the requirements (first start after ≥ 6 h idle, from Grok's log).
  - AC-006 belongs to API/E2E and the release smoke: two runs at load ≥ 40, Grok start-up times from Grok's log.
- Doc: discovery paragraph (90 s bound, the 3 s wait for `_x.ai/models/update` and why), environment paragraph (`GROK_FOLDER_TRUST=0` for runs: what it loads, nothing written to the user's Grok settings, discovery processes untrusted).
