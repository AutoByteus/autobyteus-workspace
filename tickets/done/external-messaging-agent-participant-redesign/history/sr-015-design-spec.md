# Design Spec — Remove External Messaging From The Main Product

## Solution And Approval Basis

- Current solution revision ID: `SR-015` (design round on the SR-014 approved basis)
- Approved requirements baseline: `requirements.md` SR-013 content, approved by the user on 2026-09-24 ("approve. i think now its complete right?"), recorded as SR-014.
- Behavior-defining supplements: `product-model-analysis.md`, approved with the requirements. Its future-project sections are non-normative for this ticket.
- Design status: `Ready`
- Canonical investigation notes: `investigation-notes.md`. Architecture evidence IDs `AE-01`–`AE-16` are in the "Architecture-Phase Evidence" section.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign`. Branch: `codex/external-messaging-agent-participant-redesign`. Base: `origin/personal` @ `40b1783f4`. Finalization target: `personal`.

## Current-State Read

The main product carries a complete external-messaging subsystem:

- **Server:** `src/external-channel` (bindings, ingress, run launch, output delivery, callback outbox), `src/managed-capabilities/messaging-gateway` (download/install/supervise the gateway process), GraphQL setup resolvers, signed REST ingress, an `EXTERNAL_SIGNATURE` remote-access route class, an internal base URL seeded only for the gateway, and `EXTERNAL_USER_MESSAGE` live-stream events.
- **Shared packages:** `autobyteus-ts/src/external-channel` (message types used by the server and the gateway), `AgentInputUserMessage.getExternalSourceMetadata()`, and an `EXTERNAL_USER_MESSAGE` member in the two stream-contract packages.
- **Web:** Settings → Messaging with its stores, composables, and utils, GraphQL documents, `EXTERNAL_USER_MESSAGE` stream handling, and localization.
- **Release/packaging:** a gateway release workflow triggered on every product tag, gateway steps in the desktop/Android releases and release script, and the gateway in the Docker all-in-one image.
- **Data:** file-backed messaging folders, two orphan DB tables, and two historical app-data migrations that still read messaging files.

The root problem is ownership (see `product-model-analysis.md`). This ticket removes the whole subsystem from the main product. The `autobyteus-message-gateway/` project stays in the repo, left alone apart from absorbing its message types.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: removal across 8 areas: server (about 60 source files + wiring), web (about 60 files + settings page + streaming), `autobyteus-ts`, two contract packages (with tracked `dist/`), the gateway (type move + import rewrites in 44 files), CI/release workflows + release script + Docker all-in-one, one new app-data migration + one Prisma migration, docs, and about 50 test files deleted or edited. Payload (docs, localization keys, generated types) is a minority of the change. The structural surfaces dominate.
- Architectural risk: `High`
- Risk rationale:
  - Public API removal: GraphQL types, REST routes, a remote-access route class.
  - A shared streaming contract change (`EXTERNAL_USER_MESSAGE` removed from two published contract packages consumed by the server and web).
  - A persistence change: permanent deletion of user data plus DB table drops at startup.
  - A deployment/release pipeline change affecting desktop, Android, and Docker.
  - A startup-sequence change: runtimes removed and the internal-URL seeding removed from both the studio server and the standalone application host.
  - A wide blast radius across packages.
- Escalation trigger: any discovery that a non-messaging feature reads the internal base URL env var, `EXTERNAL_SIGNATURE`, `externalSource` metadata, or the removed contract member; any Electron/remote-node packaging step that expects gateway assets; or the cleanup migration needing to touch anything beyond the four listed roots. In any of these cases, stop and return `Design Impact`.

## Architecture Investigation Evidence

| Source | Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| AE-01 | repo-wide grep | Full inventory, including contracts, a script, generated types, historical migrations, and architecture tests | Removal plan below | Tracked historical logs are left as history |
| AE-02 | `server-runtime.ts`, `build-studio-server.ts` | Messaging runtimes start and stop in the studio lifecycle | DS-001 edits | None |
| AE-03 | `config/server-runtime-endpoints.ts` | The internal base URL is messaging-only | Delete it with all seeding | Verify no child-process consumer during implementation (escalation trigger) |
| AE-04 | `schema.ts`, `rest/index.ts` | Resolver and route registration | DS-002 edits | None |
| AE-05 | route policy + models | `EXTERNAL_SIGNATURE` is messaging-only | Remove the class | None |
| AE-06 | streaming code across 3 packages | `EXTERNAL_USER_MESSAGE` exists only for bound runs | DS-004 removal | None |
| AE-07 | `autobyteus-ts` agent message | `externalSource` parser has no other callers | Delete it | None |
| AE-08 | `autobyteus-ts` exports + gateway imports | Types are self-contained | `git mv` into the gateway | None |
| AE-09 | migration runner | Startup, non-blocking, retry on next start | Cleanup migration shape | None |
| AE-10 | two historical migrations | They read messaging files | Remove those branches | None |
| AE-11 | Prisma precedent `remove_channel_bindings_table` | Table drops belong in Prisma migrations | New Prisma migration | None |
| AE-12 | `pages/settings.vue` | Unknown section falls back to the default | No alias needed | None |
| AE-13 | web scripts | Guards and codegen exist | Implementation checks | None |
| AE-14 | CI/Docker files | Gateway steps listed | DS-006 edits | CI dry run is limited to syntax plus the local build |
| AE-15 | server build script | The manifest copy is the only messaging part | Rename the script | None |
| AE-16 | server tests | Dedicated vs. cross-referencing tests | Test plan | None |

## Intended Change

Delete every external-channel/messaging component from the main product. Move the shared message types into the retained gateway project. Add one startup app-data migration that deletes messaging data folders and one Prisma migration that drops the two orphan tables. Remove all gateway release and packaging. Nothing new is added to the product except the two migrations.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Trigger | Existing Behavior | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-101 | User | REQ-101, REQ-118; AC-116 | Open Settings / `?section=messaging` | Messaging section with gateway, provider, binding, and verify steps | No Messaging entry. An old link lands on the default section. | DS-003 |
| BEH-102 | System | REQ-101, REQ-102; AC-102, AC-103 | POST to old ingress path; startup with legacy bindings | Ingress → binding → run launch → user turn | Route does not exist (404 locally; remote requests hit the default protected family). No startup path reads bindings. | DS-001, DS-002 |
| BEH-103 | System | REQ-103; AC-102 | Run output events | Open output link → callback outbox → gateway | No output runtime, callback outbox, or gateway client exists. | DS-001, DS-004 |
| BEH-106 | Operational | REQ-114; AC-114, QR-104, QR-105 | Server startup after upgrade | Messaging folders/tables persist | Folders deleted without backup. Tables dropped. Failure is logged and retried next start. | DS-001, DS-007 |
| BEH-107 | Operational | REQ-117; AC-117 | Release tag / Docker build | Gateway built, versioned, published, and supervised | No gateway steps. Gateway workflow deleted. | DS-006 |
| BEH-108 | Contract | REQ-116; AC-118 | MCP server config / tool + skill assignment | Works | Unchanged (no edits in MCP/skills modules) | N/A (preserved) |
| BEH-109 | User | REQ-119; AC-119 | Open historical run | Run history replays user messages. `externalSource` metadata is unused by projection. | Unchanged. Stored extra metadata is ignored. | DS-005 |
| (gateway) | Operational | REQ-121; AC-121 | Repo state | Gateway imports `autobyteus-ts/external-channel/*` | Types inside the gateway. No `autobyteus-ts` dependency. Not validated. | DS-008 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `product-model-analysis.md` | Model rationale and removal inventory | All | Explains why removal is total and lists the areas | Approved (SR-014) |
| `history/*` | Archived unapproved rounds | Retired IDs | Not used | Historical |

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup` (behavior removal of a whole subsystem)
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`. The transport integration owns agent lifecycle and outbound intent, and provider-specific code is embedded in the product.
- Refactor needed now: `Yes`. The refactor is removal.
- Evidence: `investigation-notes.md` Source Log rows plus AE-01 to AE-16.
- Design response: a clean-cut deletion with no replacement inside the product. The retained gateway becomes self-contained. Data is discarded through explicit migration boundaries.
- Refactor rationale: messaging integrations belong to external projects consumed through generic MCP/skills (approved principle).
- Intentional deferrals and residual risk: the gateway's own `docker/Dockerfile` and `scripts/build-runtime-package.mjs` still reference `autobyteus-ts` and are knowingly stale (user: leave the gateway alone; future refactor). The gateway's tests and build are not validated. Accepted by the user (SR-011).

## Terminology

- **Main product:** every workspace package and repo-level config except `autobyteus-message-gateway/`.
- **Messaging data roots:** `<appData>/external-channel/`, `<appData>/extensions/messaging-gateway/`, `<download>/messaging-gateway/`, `<logs>/messaging-gateway/`. They resolve through `appConfigProvider.config.getAppDataDir()`, `getDownloadDir()`, and `getLogsDir()`.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- No feature flag, stub resolver, placeholder route, deprecated GraphQL field, alias section, or "messaging disabled" notice is kept. Old callers get the framework's normal not-found behavior.

## Persisted Data / State Transition Decision (Mandatory)

**A. Messaging files and gateway installs**

- Stored subject: the four messaging data roots. On the owner's machine these hold 1 binding, receipt/delivery/outbox JSON, 25 gateway versions (5.9 GB), a 1.0 GB download cache, 5.3 MB of logs, and `provider-config.json` + `gateway.env` containing plaintext bot tokens.
- Change: no reader remains after this ticket.
- Readers/writers: only the removed server modules and the two historical migrations (their branches are removed).
- Invariants under direct use: none apply, because the data becomes unused.
- Constraints: large volume, and secrets on disk.
- Decision: `Discard or Rebuild` → **discard** through a one-time startup app-data migration (user decision DEC-110).
- Rationale: the functionality is removed. Deleting frees about 7 GB and removes plaintext tokens. There is no rebuild source and none is needed. No backup is made, because backing up 7 GB of obsolete runtimes has no benefit.
- Supports: REQ-114, AC-114, QR-104, QR-105.

**B. Orphan DB tables `channel_message_receipts` and `channel_delivery_events`**

- Created by Prisma migrations `20260208094000` and `20260331130000`. Absent from `schema.prisma`. No reader.
- Decision: `Discard or Rebuild` → **drop** through a new Prisma migration (AE-11 precedent), so Prisma migration history stays consistent with the database.

**C. Historical run memory containing `metadata.externalSource`**

- Decision: `Directly Usable — No Migration`. Run-history projection never reads `externalSource` (Source Log grep). The normal readers treat metadata as an opaque superset, so the obsolete field is ignored safely. Supports REQ-119 and AC-119.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related BEH | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | 102, 103, 106 | Server process start | Server listening | `server-runtime.ts` startup sequence | Messaging runtimes removed; cleanup runs |
| DS-002 | Primary End-to-End | 102 | HTTP request | Route handler / 404 | Fastify app + remote-access policy | Ingress removed |
| DS-003 | Primary End-to-End | 101 | Open Settings | Section rendered | `pages/settings.vue` | UI removal and fallback |
| DS-004 | Return-Event | 103 | Run/team event | Web conversation projection | Server live publishers → contracts → web projector | `EXTERNAL_USER_MESSAGE` removed |
| DS-005 | Primary End-to-End | 109 | Open historical run | Replay shown | Run-history projection (unchanged) | Preservation check |
| DS-006 | Primary End-to-End | 107 | Release tag / Docker build | Artifacts | GitHub workflows / Dockerfile | Gateway release removal |
| DS-007 | Bounded Local | 106 | Cleanup migration `execute()` | Result record | New cleanup migration | Deletion semantics |
| DS-008 | Bounded Local | (gateway) | Gateway source import | Local type module | Gateway package | Self-contained gateway |

## Primary Execution Spine(s)

- DS-001: `process start → Prisma migrate deploy (drops orphan tables) → secret vault init → AppDataMigrationRunner.runPending() (… existing … → RemoveExternalMessagingDataMigration) → studio runtime start (no channel runtimes) → listen → application recovery`
- DS-002: `HTTP request → remote-access route policy (no EXTERNAL_SIGNATURE) → Fastify router (no channel routes) → 404`
- DS-003: `/settings?section=messaging → normalizeSection() → null → default 'api-keys'`
- DS-006: `tag v* → release-desktop / release-android / release-server-docker (no gateway steps)`. `release-messaging-gateway.yml` no longer exists.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Startup applies the Prisma migration that drops the orphan tables, then runs app-data migrations in registry order. The new cleanup migration is last. It deletes the four roots and never throws past the runner. The studio server then starts without channel runtimes, internal-URL seeding, or gateway restore. Shutdown no longer stops messaging runtimes. | Prisma migrate, migration runner, studio composition | `server-runtime.ts` | Logging of FAILED migration status (existing) |
| DS-002 | With the route, route class, and resolvers gone, any request to old paths is handled by the default policy family and the router's 404. | Route policy, router | Fastify app | None |
| DS-003 | Settings no longer lists Messaging. An unknown `section` query falls back to the default. | `settings.vue` | Page | Localization keys removed |
| DS-004 | Live publishers no longer have an external-user-message method. The contract unions no longer contain the member, and the web projector/adapters/org streaming no longer handle it. | Publishers, contracts, projector | Contract packages | Tracked `dist/` rebuild |
| DS-005 | Historical replay is unchanged. Old `externalSource` metadata is ignored. | Run-history projection | Run history | None |
| DS-006 | Product releases build only product artifacts. Docker all-in-one runs server + web only. | Workflows, Dockerfile, supervisor | CI config | Release script version bump list |
| DS-007 | For each root: lstat. Missing → SKIPPED. Present → `fs.rm(recursive, force)`, which removes a symlink rather than following it → MIGRATED. Error → FAILED item. Overall result: SUCCEEDED when no item failed, otherwise FAILED with an error message. The runner retries on the next start. | Cleanup migration | Migration file | Item details for the migration log |
| DS-008 | Gateway files import `./…/external-channel/*.js` relatively. The package no longer depends on `autobyteus-ts`. | Gateway package | Gateway | Not validated |

## Spine Actors / Main-Line Nodes

`server-runtime.ts`; `compositions/build-studio-server.ts`; `standalone-application-host/start-standalone-application-host.ts`; `AppDataMigrationRegistry` / `AppDataMigrationRunner`; the new `RemoveExternalMessagingDataMigration`; the Prisma migrations folder; `api/graphql/schema.ts`; `api/rest/index.ts`; `api/security/remote-access-route-policy.ts`; the server live publishers; the two contract packages; web `agentStreamMessageProjector` / `teamStreamDtoAdapters` / `agentOrgStreamingService`; `pages/settings.vue`; GitHub workflows; `docker/Dockerfile.allinone`.

## Ownership Map

- `server-runtime.ts` owns the startup/shutdown sequence. It loses the messaging steps.
- `AppDataMigrationRegistry` owns migration order. The cleanup migration is appended last.
- `RemoveExternalMessagingDataMigration` owns deletion of exactly the four roots and nothing else.
- The Prisma migrations folder owns the DB schema history. It gains the table drop.
- The contract packages own the stream message unions, and the server and web follow them.
- `pages/settings.vue` owns the Settings sections.
- The gateway package owns its message types after the move.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A. Nothing new is added besides the two migrations, which are direct owners.

## Removal / Decommission Plan (Mandatory)

All rows are `In This Change`.

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/external-channel/**` | Binding model removed | Nothing | — |
| `autobyteus-server-ts/src/managed-capabilities/**` (only `messaging-gateway`) | Gateway no longer managed | Nothing | Delete the now-empty folder |
| `src/api/graphql/types/external-channel-setup/**`, `types/external-channel-setup.ts`, `types/managed-messaging-gateway.ts` + registrations in `schema.ts` | APIs removed | Nothing | — |
| `src/api/rest/channel-ingress.ts`, `channel-ingress-message-route.ts`, `channel-ingress-route-shared.ts`, `channel-delivery-event-route.ts` + registration in `rest/index.ts` | Ingress removed | Nothing | — |
| `EXTERNAL_SIGNATURE` in `remote-access/domain/models.ts` and `api/security/remote-access-route-policy.ts` (path rule + allow-list) | Only served ingress | Default classification | — |
| `src/config/server-runtime-endpoints.ts` + seeding in `server-runtime.ts` and `start-standalone-application-host.ts` | Messaging-only (AE-03) | Nothing | Update 13 tests |
| Messaging runtime start/stop in `server-runtime.ts` and `build-studio-server.ts`; `restoreIfEnabled` block | Runtimes removed | Nothing | — |
| `src/services/agent-streaming/external-user-message-server-message.ts`; `publishExternalUserMessage` in the agent/team live publishers; `EXTERNAL_USER_MESSAGE` enum member in `models.ts` | Bound-run stream event | Nothing | — |
| `autobyteus-server-ts/scripts/copy-managed-messaging-assets.mjs` | Manifest copy is messaging | `scripts/copy-build-assets.mjs` (templates only) | Update `package.json` `build:full` and `tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` |
| External-channel branches in `custom-provider-readable-id-app-data-migration.ts` (+ `BINDINGS` candidate in `custom-provider-readable-id-json-selector-migrator.ts`) and `remove-global-skill-discovery-mode-migration.ts` | Files deleted by the cleanup | Cleanup migration | Migration IDs unchanged. Update their tests. |
| `autobyteus-ts/src/external-channel/**` | Main product no longer uses it | Gateway `src/external-channel/**` (`git mv`) | Tests move to gateway `tests/unit/external-channel/` |
| `autobyteus-ts/src/index.ts` export line | — | — | — |
| `autobyteus-ts/src/agent/message/external-source-metadata.ts`, `AgentInputUserMessage.getExternalSourceMetadata()`, exports in `agent/message/index.ts` | No callers | Nothing | Update/delete their tests. Check `tests/integration/public-surface/cli-tui-removal.test.ts`. |
| `EXTERNAL_USER_MESSAGE` in `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts` and `autobyteus-team-stream-contracts/src/{team-collaboration-message-dtos,team-stream-server-message}.ts` (+ rebuild tracked `dist/`) | Stream event removed | Nothing | — |
| Web: `components/settings/MessagingSetupManager.vue`, `components/settings/messaging/**`, `composables/useMessaging*.ts`, `composables/messaging-binding-flow/**`, `stores/messaging*.ts`, `stores/gatewayCapabilityStore.ts`, `stores/gatewaySessionSetupStore.ts`, `stores/gatewaySessionSetup/**`, `services/sessionSync/**`, `types/messaging.ts`, `utils/messaging*.ts`, `graphql/{queries,mutations}/{externalChannelSetup,managedMessagingGateway}*.ts`, `ui-prototypes/messaging-setup-assistant/**`, `docs/messaging.md`, and all their tests | Settings → Messaging removed | Nothing | — |
| Web settings entry: `'messaging'` in `SettingsSection`, `validSections`, the nav button, the content line, and the import in `pages/settings.vue` | — | Default section fallback (AE-12) | Update `pages/__tests__/settings.spec.ts` |
| Web streaming: `handlers/externalUserMessageHandler.ts`, `protocol/externalUserMessageTypes.ts`, cases in `agentStreamMessageProjector.ts`, `teamStreamDtoAdapters.ts`, `protocol/{index,messageTypes}.ts`, `handlers/index.ts`; `onAcceptedExternalUserMessage` in `agentOrgStreamingService.ts` and `stores/agentOrgContextsStore.ts` | Event removed | Nothing | `memberInputMessageHandler.spec.ts` must stop importing the handler |
| Web localization: messaging keys in `localization/messages/{en,zh-CN}/settings.ts` and `settings.generated.ts` (including `settings.page.sections.messaging`) | UI removed | Nothing | Run the localization guards |
| Web `generated/graphql.ts` messaging types | Schema removed | Regenerated output | — |
| `.github/workflows/release-messaging-gateway.yml` | User DEC-112 | Nothing | — |
| Gateway steps in `.github/workflows/release-desktop.yml` (≈L90–115 and any upload/manifest steps) and `release-android.yml` (≈L193–220 and related) | No gateway in the product | Nothing | — |
| Gateway parts of `scripts/desktop-release.sh` (version bump, runtime package build, manifest regen, `git add` entries) and the gateway filter in `scripts/android-bootstrap-termux.sh` | — | — | — |
| `docker/allinone-start-gateway.sh`; gateway build/copy/start/env in `docker/Dockerfile.allinone`; `[program:message_gateway]` in `docker/supervisor-allinone.conf`; `GATEWAY_*` env in `docker/compose.personal-test.yml`; gateway text in `docker/README.md` | — | — | — |
| Docs: root `README.md`; server `README.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT_OVERVIEW.md`, `docs/URL_GENERATION_AND_ENV_STRATEGY.md`, `docs/features/remote_access.md`, messaging mentions in `docs/modules/*` and `docs/design/*`; web `README.md`, `docs/settings.md`, `docs/github-actions-tag-build.md`, `docs/agent_execution_architecture.md` | — | — | Only remove or reword messaging content. Generic "inter-agent messaging" text stays. |
| Server tests per AE-16 | — | — | Delete the dedicated ones and edit the cross-referencing ones |

## Return Or Event Spine(s) (If Applicable)

DS-004, above. After the change: `run event → live publisher → contract union (no EXTERNAL_USER_MESSAGE) → web projector`.

## Bounded Local / Internal Spines (If Applicable)

- DS-007 cleanup migration. Parent owner: the app-data migration runner. `execute → for root of 4 → lstat → (missing: SKIPPED | rm: MIGRATED | error: FAILED) → summarize`. It matters because it is the only code that deletes user data. It must touch exactly the four roots and never recurse into `extensions/` siblings (for example, the voice-input extension).
- DS-008 gateway type import. Parent owner: the gateway package.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Migration status logging | DS-001/007 | Runner | Existing warn log on FAILED | Operability (QR-105) | None, because it is already existing behavior |
| Tracked `dist/` of contract packages | DS-004 | Contracts | Rebuild after source edit | The repo tracks `dist/` | Stale `dist/` would re-expose the member |
| GraphQL codegen output | DS-003/004 | Web | Regenerate | Tracked generated file | Stale types |

## Ownership Boundaries

- The Prisma migration folder is the only place that drops tables. The app-data migration does not run DDL.
- The cleanup migration is the only code that deletes messaging data. No startup hook or service does ad-hoc deletion.
- The gateway owns its message types. No main-product package may import `autobyteus-message-gateway`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Upstream Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `AppDataMigrationRunner.runPending()` | Cleanup migration `execute()` | `server-runtime.ts` | Calling the cleanup directly from startup code | N/A |
| Prisma `migrate deploy` | Migration SQL | `startup/migrations.ts` | Raw DDL from TS code | N/A |

## Dependency Rules

- Main-product packages must not import `autobyteus-message-gateway` or any `external-channel` module after the change.
- The gateway must not import `autobyteus-ts` (REQ-121).
- The cleanup migration may depend only on `appConfigProvider`, `node:fs`/`node:path`, and the app-data migration domain types.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `RemoveExternalMessagingDataMigration` (`AppDataMigrationDefinition`) | Messaging data roots | Delete the four roots once | `id = "20260924_remove_external_messaging_data"` | `requiredOnStartup: true`, default `executionPolicy` (`ANYTIME`), no prerequisites |
| Prisma migration `20260924120000_remove_external_channel_tables` | Two orphan tables | Drop the tables | Migration folder name | `DROP TABLE IF EXISTS` for both |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| Cleanup migration | Yes | Yes | Low | — |
| Prisma migration | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Cleanup migration | `RemoveExternalMessagingDataMigration` / `remove-external-messaging-data-migration.ts` | Yes (matches the `remove-*` precedents) | Low | — |
| Build script | `copy-build-assets.mjs` | Yes | Low | — |
| Gateway types folder | `autobyteus-message-gateway/src/external-channel/` | Yes (unchanged name) | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Delete data on upgrade | App-data migrations | Reuse | Startup ordering, records, and retry exist |
| Drop tables | Prisma migrations | Reuse | Precedent AE-11 |
| Settings fallback | `normalizeSection()` | Reuse | Already falls back |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spines | Decision | Notes |
| --- | --- | --- | --- | --- |
| Server app-data migrations | Data cleanup | DS-001, DS-007 | Extend (one migration) | — |
| Server Prisma | Table drop | DS-001 | Extend (one migration) | — |
| Server API/runtime/streaming | Removals | DS-001, DS-002, DS-004 | Remove | — |
| Contracts | Union member removal | DS-004 | Remove | — |
| Web settings/streaming | Removals | DS-003, DS-004 | Remove | — |
| CI/Docker | Removals | DS-006 | Remove | — |
| Gateway | Type ownership | DS-008 | Move-in | Not validated |

## Draft File Responsibility Mapping

| Candidate File | Subsystem | Owner | Concern | Why One File | Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/app-data-migrations/migrations/remove-external-messaging-data-migration.ts` | App-data migrations | Cleanup migration | Delete the four roots | Single bounded concern | Uses migration domain types |
| `autobyteus-server-ts/prisma/migrations/20260924120000_remove_external_channel_tables/migration.sql` | Prisma | Migration | Drop two tables | One migration | — |
| `autobyteus-server-ts/scripts/copy-build-assets.mjs` | Build | Script | Copy built-in agent templates | Renamed remainder | — |

## Reusable Owned Structures Check

N/A. No repeated structure is introduced. The cleanup migration's summary helper follows the local pattern of the `remove-*` migration precedents inside its own file.

## Shared Structure / Data Model Tightness Check

N/A. No shared structure is added. The contract unions shrink by one member.

## Final File Responsibility Mapping

Same as the draft. Additions are limited to the three files above. Everything else is deletion or edit per the Removal Plan.

## Applied Patterns (If Any)

The migration follows the existing app-data "remove-*" migration pattern (for example, `remove-external-runtime-working-context-snapshots-migration.ts`).

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/app-data-migrations/migrations/remove-external-messaging-data-migration.ts` | File | Cleanup migration | Delete the four messaging roots | DDL, backups, deletion outside the four roots |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | File (edit) | Registry | Append `new RemoveExternalMessagingDataMigration()` last | — |
| `autobyteus-server-ts/prisma/migrations/20260924120000_remove_external_channel_tables/migration.sql` | File | Prisma | `DROP TABLE IF EXISTS "channel_message_receipts"; DROP TABLE IF EXISTS "channel_delivery_events";` | Other DDL |
| `autobyteus-server-ts/scripts/copy-build-assets.mjs` | File (rename) | Build | Templates copy | Messaging manifest |
| `autobyteus-message-gateway/src/external-channel/**` | Folder (moved in) | Gateway | Message types | — |
| `autobyteus-message-gateway/tests/unit/external-channel/**` | Folder (moved in) | Gateway | The 6 moved tests | — |
| `autobyteus-message-gateway/package.json`, `vitest.config.ts` | Edit | Gateway | Drop the `autobyteus-ts` dependency, the `prebuild`/`pretypecheck`/`pretest` scripts, and the aliases | Other changes |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `app-data-migrations/migrations/` | Persistence (migration) | Yes | Low | Existing convention |
| Gateway `src/external-channel/` | Mixed Justified | Yes | Low | The gateway is left alone. The folder mirrors its old import path. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Avoided Shape | Why |
| --- | --- | --- | --- |
| Cleanup migration | `for (const root of roots) { const st = await lstatOrNull(root); if (!st) {skipped} else { await fs.rm(root, {recursive:true, force:true}); migrated } }`. Returns `status: failed ? "FAILED" : "SUCCEEDED"` with details. It never throws. | `fs.rm(path.join(appData, "extensions"), …)`; copying to a backup; DDL via `$executeRaw` | Deletes exactly what is approved |
| Gateway import | `import type { ExternalMessageEnvelope } from "../../external-channel/external-message-envelope.js";` | Keeping `autobyteus-ts/external-channel/...` via a re-export shim in `autobyteus-ts` | A shim would keep messaging code in the main product |
| Old ingress path | No route. The default policy handles it. | A stub route returning 410 "messaging removed" | A stub is compatibility code |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Re-export `external-channel` from `autobyteus-ts` for the gateway | Avoid touching the gateway | Rejected | Move the types into the gateway (DEC-111) |
| Keep `EXTERNAL_USER_MESSAGE` in contracts as deprecated | Tolerate old clients | Rejected | Remove it. Web and server ship together. |
| `section=messaging` alias to another section | Old links | Rejected | Existing default fallback |
| 410 stub for ingress | Tell old gateways | Rejected | 404 by absence |
| Keep the internal base URL helper "for future use" | Generic-looking | Rejected | Delete it. Re-add if a real consumer appears. |
| Backup of deleted folders | Safety | Rejected | User approved discard. The data is obsolete. |

## Derived Layering (If Useful)

N/A

## Change / Refactor Sequence

1. **Gateway type move (DS-008):** `git mv autobyteus-ts/src/external-channel autobyteus-message-gateway/src/external-channel`. Move the 6 `autobyteus-ts/tests/unit/external-channel/*` tests to `autobyteus-message-gateway/tests/unit/external-channel/`. Rewrite the gateway's 28 src + 16 test imports to relative paths. Edit gateway `package.json` and `vitest.config.ts`. Do not run gateway checks.
2. **`autobyteus-ts`:** remove the `src/index.ts` export; delete `agent/message/external-source-metadata.ts` and `getExternalSourceMetadata()`; update `agent/message/index.ts` and tests. Build and test `autobyteus-ts`.
3. **Contracts:** remove `EXTERNAL_USER_MESSAGE` from both packages. Rebuild the tracked `dist/`.
4. **Server:** delete the modules, APIs, route class, internal URL, streaming member, and runtime wiring. Edit the two historical migrations. Add the cleanup migration + registry entry + Prisma migration. Rename the build script. Update and delete tests. Update docs. Run typecheck and the unit/integration/e2e suites that are affected.
5. **Web:** delete the messaging UI/stores/etc. Edit `settings.vue`, streaming, org streaming, and localization. Run codegen or hand-remove the generated types. Update tests and docs. Run typecheck, `test:nuxt`, and the guards.
6. **CI/Docker/scripts:** delete the workflow and start script. Edit the desktop/Android workflows, release scripts, Dockerfile, supervisor, compose, and README. Run `pnpm install` to update the lockfile. Validate YAML. Build the Docker all-in-one locally if feasible.
7. **Root docs + verification:** run the REQ-120 identifier search. Allowed hits are only the gateway folder, `tickets/`, historical Prisma migrations, the new migrations, and tracked historical logs (`test-results/`, `frontend-execution-evidence/`).

## Key Tradeoffs

- **Prisma vs. app-data migration for tables:** the user preferred "one data migration". The design splits it because Prisma owns the schema history (AE-11). The outcome the user asked for is unchanged.
- **Keeping the gateway in the pnpm workspace:** it is kept, which is the minimal change. `pnpm install` still installs its dependencies, but nothing in the main product builds or tests it.
- **Removing branches from historical migrations:** this changes old migration code, but it only drops work on files the cleanup deletes anyway. It keeps the main product free of messaging identifiers.

## Risks

- A missed consumer of the internal base URL or `EXTERNAL_SIGNATURE` (mitigated by grep evidence AE-03/AE-05 and the escalation trigger).
- The contract `dist/` not rebuilt, so web or server types drift (mitigated by sequence step 3 and a typecheck).
- Release workflow edits cannot be fully exercised without a tag. Mitigation: YAML validation, a `release:test` dry run where possible, and review of the diffs.
- Deleting user data is irreversible. It is approved and scoped to four exact roots, and unit tests assert that sibling folders survive.

## Guidance For Implementation

- Use `git mv` for the type move to preserve history.
- The cleanup migration unit tests must cover: all roots present → all deleted and SUCCEEDED; missing roots → SKIPPED; a sibling `extensions/voice-input` (or any other folder) → untouched; an rm error (mock) → FAILED item and no throw; a symlinked root → link removed and target untouched.
- AC-103: a startup test with a `bindings.json` fixture shows no run creation. Because the cleanup deletes it, assert the folder is gone after startup.
- AC-119: a run-history test with a fixture run whose user message metadata contains `externalSource` shows it replayed as a normal user message.
- AC-102: a local POST to `/rest/api/channel-ingress/v1/messages` returns 404, and GraphQL introspection shows no `externalChannel*` / `managedMessagingGateway*` fields.
- AC-118: run the existing MCP server/tool tests unchanged.
- Do not modify anything under `autobyteus-message-gateway/` except the items in sequence step 1.
