# Requirements — Remove External Messaging From The Platform

## Document Status

- Status: `Ready for Approval`
- Current solution revision ID: `SR-004`
- Package identifier: `external-messaging-agent-participant-redesign`
- Request / ticket: User request 2026-09-24. After the SR-003 analysis, the user confirmed the model ("exactly") and directed: "we should not have any code in the platform about external channel, because those external channels belong to their own project and MCP etc."
- Requirements owner: Solution Designer
- Date: 2026-09-24
- Approval state and reference: `Pending`. "Exactly" confirms the direction, but the SR-004 scope and DEC-108 to DEC-110 still need explicit approval.
- Exact approved requirements baseline / solution revision: `N/A`
- Behavior-defining supplements: `product-model-analysis.md` (SR-004 revision), approval pending with this document
- ID note: SR-001/SR-002 IDs are retired (see `history/sr-002-*`). SR-003 IDs keep their meaning where listed below. SR-003 IDs moved to the separate messaging project are listed under **Retired / Moved IDs**.

## Problem And Desired Outcome

- Problem: The platform (server, web, shared library, release pipeline) contains a complete external-messaging subsystem. It binds a chat to an agent/team, starts runs from chat messages, and auto-posts run output back. The managed gateway runtime is downloaded, installed, and supervised by the server. This design is wrong (bot ≠ agent). It is off by default, and it couples platform code to specific messaging providers.
- Desired outcome: The AutoByteus platform contains **no external-channel / messaging-gateway code**. Messaging platforms (Discord, Telegram, …) become separate projects, for example MCP servers plus skills. Users add them through the existing generic **MCP Servers** and **Skills** features and assign them to agents like any other tools. The platform needs no provider-specific knowledge.
- Observable definition of success: after this change, the platform builds and ships without the gateway. Settings has no Messaging section. No server endpoint accepts chat messages or starts runs from them. No release publishes gateway artifacts. Existing MCP server and skill support is unchanged, so a separately built messaging MCP server can be added like any other MCP server.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-101 | User/Operational | SCN-111 | Settings → Messaging: managed gateway lifecycle, provider config, Channel Binding, and Verify steps. | Settings has no Messaging section and no messaging setup of any kind. | Other Settings sections, including MCP Servers | `pages/settings.vue`, `components/settings/messaging/*`, `MessagingSetupManager.vue` |
| BEH-102 | System | SCN-112 | Signed REST channel ingress creates/restores the bound run and posts the chat message as user input. | No such endpoint or code path exists. The platform receives no external chat traffic. | Normal agent/team launch is the only way runs start | `api/rest/channel-ingress*.ts`, `external-channel/*` |
| BEH-103 | System | SCN-112 | Bound-run output is auto-published to the chat through the gateway callback outbox. | No such path exists. The platform sends nothing to messaging platforms. | — | `external-channel/runtime/*output*`, `gateway-callback-*` |
| BEH-106 | Operational | SCN-113 | Legacy data on disk: `external-channel/*.json` (bindings, receipts, outbox), `extensions/messaging-gateway/` (installed runtimes, `config/provider-config.json` with bot tokens, `gateway.env`, state), `download/messaging-gateway/`, `logs/messaging-gateway/`. Orphan DB tables `channel_message_receipts` and `channel_delivery_events` exist in databases but not in the Prisma schema. | Handled according to DEC-110. | All non-messaging app data | Investigation notes; the local machine has 1 Telegram→team binding, 25 installed gateway versions (5.9 GB), and a 1.0 GB download cache |
| BEH-107 | Operational | SCN-114 | Desktop, Android, and Docker all-in-one release/build steps version, build, and publish the gateway runtime. `release-messaging-gateway.yml` exists. The pnpm workspace includes the gateway package. | No build, release, or packaging step references the gateway. | All other release artifacts | `.github/workflows/*`, `scripts/desktop-release.sh`, `scripts/android-bootstrap-termux.sh`, `docker/*`, `pnpm-workspace.yaml` |
| BEH-108 | Contract | SCN-115 | Generic MCP server configuration (stdio/HTTP, env, token) and tool assignment work; skills are assignable. | Unchanged. This is how messaging integrations are added in future. | Fully preserved | `tools_and_mcp.md`, `skills.md` |
| BEH-109 | User | SCN-116 | Runs previously started by a channel binding appear in run history. | They remain viewable, with the external message shown as an ordinary user message. | Run history | Run history has no dependency on `externalSource` (grep) |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| AutoByteus user | Use messaging as agent tools in future | Add a messaging MCP server + skill through generic features | No platform messaging UI |
| Existing messaging user (incl. the owner's own Telegram→team binding) | Upgrade safely | The old binding stops, knowingly. Nothing is left running. Leftover data handled per DEC-110. | The feature is already off by default |
| Maintainer | Smaller platform with a clean boundary | No provider-specific code, builds, or docs in the platform | Historical Prisma migrations stay (applied history) |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-107` (expanded) Remove every external-channel/messaging component from the platform: server, web, `autobyteus-ts`, the gateway package, the release/CI/Docker/workspace config, and product docs.
- `UC-109` Handle legacy on-disk and database data as decided in DEC-110.
- `UC-110` Keep generic MCP server and skill support working unchanged.
- `UC-111` Keep historical runs viewable.

### Out Of Scope

- Building Discord/Telegram (or any) messaging MCP servers or skills. That is a separate project and ticket (DEC-108).
- Any platform feature that wakes agents on incoming messages.
- Deleting or rewriting historical ticket records under `tickets/done/`.
- Deleting already-published gateway GitHub releases.
- Changing generic MCP/skill features.

### Non-Goals

- A compatibility mode, feature flag, or hidden fallback for the old messaging flow.

### Preserved Behavior Boundary

- BEH-108 (generic MCP/skills), BEH-109 (run history), all non-messaging Settings, and all non-gateway release artifacts.
- Historical Prisma migration files are retained as applied-migration history. They are not considered messaging "code".

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- Adjacent concerns may be recorded as non-blocking risks or separate-ticket candidates.
- Downstream comments do not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related BEH | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-101 | (SR-004 revision) The platform contains no external-channel or messaging-gateway product code. This covers the server `external-channel` and `managed-capabilities/messaging-gateway` modules, the channel GraphQL/REST APIs and route policy entries, the external-user-message streaming types (server and web), the `autobyteus-ts` `external-channel` contracts, export, and agent-input external-source metadata, the web Settings → Messaging UI with its stores, composables, types, utils, localization, and prototypes, the `autobyteus-message-gateway` package, and messaging product docs. Tests for removed code are removed. | BEH-101–103 | Must | The user's boundary: messaging belongs to its own projects | User 2026-09-24 |
| REQ-102 | No platform code path lets an incoming chat message create, restore, start, or post input to an agent/team run. After REQ-101, the platform has no chat ingress at all. | BEH-102 | Must | Invariant | SR-003, user |
| REQ-103 | No platform code path sends agent/team output to a messaging platform. | BEH-103 | Must | Invariant | SR-003, user |
| REQ-114 | (SR-004 revision) On upgrade, legacy messaging data is handled per DEC-110. Legacy data never causes any runtime behavior. | BEH-106 | Must | Clean cut | DEC-110 |
| REQ-116 | Generic MCP server configuration, tool discovery/assignment across runtimes, and skill assignment remain unchanged. | BEH-108 | Must | Future messaging integrations use them | User |
| REQ-117 | Desktop, Android, Docker, and CI builds and releases no longer version, build, verify, package, or publish the gateway. `release-messaging-gateway.yml` is removed. Previously published releases are untouched. | BEH-107 | Must | No platform coupling | Release evidence |
| REQ-118 | Settings navigation has no Messaging entry. An old deep link to the Messaging section lands on a valid Settings section instead of an error. | BEH-101 | Should | Clean UX after removal | — |
| REQ-119 | Historical runs, including those started by bindings, remain listable and viewable. Their external messages show as ordinary user messages. | BEH-109 | Must | Preserve history | Run-history evidence |
| REQ-120 | After removal, all packages typecheck/build and their test suites pass. A search of platform source, config, and docs for messaging identifiers (`external-channel`, `externalChannel`, `ChannelBinding`, `channel-ingress`, `messaging-gateway`, `message-gateway`, `ExternalMessageEnvelope`, `EXTERNAL_USER_MESSAGE`, `externalSource`) finds nothing, except historical ticket records, historical Prisma migrations, and any DEC-110 cleanup migration. | — | Must | Proves the clean cut | — |

### Retired / Moved IDs (SR-003 → separate messaging project)

`REQ-104`–`REQ-113` and `REQ-115`, `AC-101` and `AC-105`–`AC-113` and `AC-115`, `SCN-101`–`SCN-107` and `SCN-109`–`SCN-110`, `UC-101`–`UC-106` and `UC-108`, `QR-101`–`QR-103`, `DEC-101`–`DEC-107`, and `ASM-101`–`ASM-102` described a first-party integration inside the platform. They are retired from this package. Their content (send/list/read tools, Telegram receiver and 24-hour limit, Discord Message Content intent, token custody, usage skill, retention) is carried forward as input for the separate messaging MCP project (see `product-model-analysis.md`).

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Trigger | Observable Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-102 | REQ-101, REQ-102, REQ-103 | BEH-102, BEH-103, SCN-112 | Inspect the server API surface | No channel-ingress/delivery REST routes and no external-channel or managed-messaging GraphQL types/fields. POSTs to the old ingress paths return 404. | — | API test |
| AC-103 | REQ-102 | SCN-112 | A node that has legacy `bindings.json` starts | Zero runs created/restored/messaged. No gateway process started. | — | Startup test |
| AC-114 | REQ-114 | BEH-106, SCN-113 | Upgrade a node that has legacy data | Result matches DEC-110. The server starts normally. | Cleanup failure is logged and does not block startup | Upgrade test |
| AC-116 | REQ-101, REQ-118 | BEH-101, SCN-111 | Open Settings | No Messaging entry or section. The old Messaging deep link lands on a valid section. | — | Browser test |
| AC-117 | REQ-117 | BEH-107, SCN-114 | Inspect workflows/scripts/Docker/workspace | No gateway references. Desktop/Android/Docker builds succeed without the gateway. | — | CI dry run / build |
| AC-118 | REQ-116 | BEH-108, SCN-115 | Add a stdio MCP server with an env token, discover tools, and assign them to an agent | Works exactly as before on the native, Codex, and Claude runtimes. | — | Existing MCP tests + manual check |
| AC-119 | REQ-119 | BEH-109, SCN-116 | Open a historical run that a binding started | The run opens. Messages show as ordinary user/assistant messages. | — | Run-history test with fixture |
| AC-120 | REQ-120 | — | Full build + tests + identifier search | All pass. The search is clean apart from the allowed exceptions. | — | CI + scripted grep |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal / Event | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-111 | User | User | Browse Settings | Open Settings | New version | Open Settings / old Messaging link | No messaging UI. Valid section shown. | — | Supported Normal | Settings code | REQ-101, 118; AC-116 |
| SCN-112 | System | External caller / legacy gateway | Chat traffic reaches the platform | HTTP POST to old ingress path, or startup with legacy bindings | Upgraded node | — | Rejected (404). No run effect. No gateway started. | — | Supported Explicit Edge (upgrade) | Ingress code | REQ-102, 103; AC-102, 103 |
| SCN-113 | Operational | Operator | Upgrade with legacy data | App update | Legacy files/tables present | Start server | Per DEC-110 | Cleanup error logged, startup continues | Supported Normal | Local data evidence | REQ-114; AC-114 |
| SCN-114 | Operational | Maintainer | Release | Release workflow | New version | Build/release | No gateway artifacts. Builds succeed. | — | Supported Normal | Workflow evidence | REQ-117; AC-117 |
| SCN-115 | User | User | Add a messaging MCP in future | Settings → MCP Servers | MCP server available | Add → discover → assign | Works like any MCP | — | Supported Normal | MCP docs | REQ-116; AC-118 |
| SCN-116 | User | User | Review an old run | Run history | Run created by a binding | Open run | Viewable | — | Supported Normal | Run-history evidence | REQ-119; AC-119 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (removal of Settings → Messaging only). AC-116.
- Prototype/UI-spec fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-104 | REQ-114 | Security/Privacy | If DEC-110 (a) is chosen, no messaging bot token remains on disk in platform-owned folders after upgrade | Upgrade test |
| QR-105 | REQ-114 | Operability | Upgrade cleanup never blocks server startup | Fault-injection test |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes`
- Must be preserved: all non-messaging app data and run history (REQ-119).
- Acceptable loss: all messaging data, including bindings, receipts, outbox, gateway runtimes/config/tokens/state/logs/download cache, and the orphan channel tables. Bot tokens can be re-created in BotFather or the Discord portal. The owner's single Telegram→`classroomsimulation` team binding (May 2026) stops working. The gateway is already disabled.
- Constraints: roughly 7 GB of gateway runtimes and downloads exist on this machine. Tokens are stored in plaintext config.
- Required outcome: see DEC-110.

## External Contracts And Dependencies

| Contract / Dependency | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Prisma migration history | Applied migrations must stay in the repo. Dropping orphan tables needs a new migration. | `prisma/migrations/*channel*` | None if kept |
| Published gateway releases | Older desktop builds may still download older gateway versions from existing releases | Release manifest | Leave published releases |

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `product-model-analysis.md` | Model, rationale, removal inventory, input for the separate messaging project | All | SR-004 proposal | Pending with this doc |
| `history/sr-002-*.md`, `history/sr-003-*.md` | Archived unapproved rounds | Retired IDs | Historical | N/A |

## Assumptions

| ID | Assumption | Validation | Status |
| --- | --- | --- | --- |
| ASM-103 | Losing messaging entirely until a separate MCP project exists is acceptable. The feature is off by default and has one personal binding. | User confirmation | Open |

## Open Decisions And Questions

| ID | Question | Options | Owner | Recommendation |
| --- | --- | --- | --- | --- |
| DEC-108 | Does this ticket also build the replacement Discord/Telegram MCP + skill? | (a) No, platform removal only. The MCP project gets its own ticket and repo. (b) Both in one ticket. | User | **(a)** |
| DEC-109 | (SR-008) What happens to the `autobyteus-message-gateway/` folder in the workspace repo? It is **not** currently a separate project: it was flattened into the workspace repo on 2026-02-26 (`b1c89884e`), and all later development happened there. The GitHub repo `AutoByteus/autobyteus-message-gateway` stopped in Feb 2026. The folder depends on `autobyteus-ts/external-channel` (28 files). The user wants no gateway code changes now. | (a) Move it back unchanged: copy the current folder with its git history to the separate GitHub repo (as a branch, no code edits; making it build standalone is part of the future MCP work), then remove it from the workspace repo. (b) Remove it from the workspace repo only and record the last commit containing it; the separate repo stays at Feb 2026 until the MCP work starts. (c) Keep the folder and keep `autobyteus-ts/external-channel` so it still builds (an exception to REQ-101/REQ-120). | User | **(a)**: makes the gateway truly separate, as the user expects, with no code changes |
| DEC-110 | Leftover local data on upgrade | (a) A one-time cleanup deletes the platform-owned messaging folders (`external-channel/`, `extensions/messaging-gateway/`, `download/messaging-gateway/`, `logs/messaging-gateway/`) and drops the two orphan tables. (b) Leave everything and list the paths in release notes. | User | **(a)**: frees about 7 GB here and removes plaintext bot tokens |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-101 | UC-107 | BEH-101–103 | AC-102, AC-116, AC-120 | SCN-111, SCN-112 |
| REQ-102 | UC-107 | BEH-102 | AC-102, AC-103 | SCN-112 |
| REQ-103 | UC-107 | BEH-103 | AC-102 | SCN-112 |
| REQ-114 | UC-109 | BEH-106 | AC-114 | SCN-113 |
| REQ-116 | UC-110 | BEH-108 | AC-118 | SCN-115 |
| REQ-117 | UC-107 | BEH-107 | AC-117 | SCN-114 |
| REQ-118 | UC-107 | BEH-101 | AC-116 | SCN-111 |
| REQ-119 | UC-111 | BEH-109 | AC-119 | SCN-116 |
| REQ-120 | UC-107 | — | AC-120 | — |

## Architecture Phase Input

- Map SCN-111 to SCN-116.
- Constraints: clean cut with no flags or fallbacks; keep historical Prisma migrations; cleanup (if chosen) must not block startup and must not back up about 7 GB of runtimes through the app-data-migration backup mechanism.
- Design decides: the exact deletion inventory and ordering across packages; how `AgentInputUserMessage` loses external-source metadata without breaking history; the Settings deep-link fallback; the cleanup mechanism (app-data migration + Prisma migration); handling of the in-progress messaging tickets (`messaging-agent-team-support`, `messaging-gateway-desktop-distribution`, `telegram-managed-flow-hardening`); and the remote-access route policy entries.
- Verify: server composition wiring (`build-studio-server.ts`, `server-runtime.ts` `restoreIfEnabled`); web streaming handler registration; the `autobyteus-ts` public export removal and its downstream consumers; and Docker all-in-one start scripts.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: user answers to DEC-108 to DEC-110

### Approved Basis Ready For Design

- User approval received: `No`
- Exact requirements and supplement approval basis recorded: `No`
- Approved requirements package ready for architecture design: `No`
- Remaining blocker: explicit approval
