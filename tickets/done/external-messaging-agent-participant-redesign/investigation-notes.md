# Investigation Notes — Messaging Integrations As Agent Tools

## Investigation Status

- Bootstrap Status: Complete. The existing package worktree was fast-forwarded to current `origin/personal` on 2026-09-24.
- Current Status: requirements `Approved` (SR-014). `design-spec.md` revised in SR-016 after ARCH-REV-001.
- Investigation Goal: Re-verify the current messaging coupling on the latest base and evaluate the user's refined model (integration = skill + tools; bot is the agent's instrument). Establish platform constraints for send, read, and discovery.
- Scope Classification (preliminary, pre-design): `Large`. It removes a cross-package binding subsystem and adds tool-based integrations. Final task size and risk are classified after design.
- Earlier evidence: the SR-001/SR-002 source log, runtime probes, and MCP findings are preserved verbatim at `history/sr-002-investigation-notes.md`. Findings there that are still valid are summarized below and re-verified where noted.

## Request Context

2026-09-24 user request, paraphrased: messaging support exists through `autobyteus-message-gateway` but is disabled by default because the design is wrong. Today a messaging platform directly starts one agent through a binding. That is wrong, because agents are like working humans. A bot on Discord/WhatsApp is not the agent. The agent, while working, decides to send a message through the bot, and the message appears in Discord. Messaging integrations should therefore be agent skills with MCP tools or scripts; configuring an integration just adds tools. The user asked for an analysis of the current deep coupling.

The reference screenshot shows Settings → Messaging with the managed gateway `DISABLED` (v1.4.0), supported providers `WHATSAPP, WECOM, DISCORD, TELEGRAM` with excluded `WHATSAPP, WECOM, WECHAT`, Discord/Telegram provider cards, and Discord Bot Configuration (token + account id).

Interpretation recorded for approval: this refines the unapproved SR-002 proposal by removing the push/run-attachment part. Messaging becomes tools only.

## Environment Discovery / Bootstrap Context

- Project Type: Git superrepo (`AutoByteus/autobyteus-workspace`)
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign`
- Task Artifact Folder: `.../tickets/in-progress/external-messaging-agent-participant-redesign`
- Branch: `codex/external-messaging-agent-participant-redesign`. Local only, with no local commits; the ticket folder is untracked.
- Base: `origin/personal` at `40b1783f40c072b577ad9d0c5d8fe4f5418c6c38`. `git fetch origin --prune` succeeded on 2026-09-24 and `origin/HEAD` resolves to `origin/personal`. Fast-forward applied with `git merge --ff-only origin/personal`; the branch was 1264 commits behind with 0 ahead.
- Expected finalization target: `personal`
- Note: the user-referenced path `/Users/normy/autobyteus_org/autobyteus-message-gateway` is an older standalone clone (3 commits, `main`). The maintained gateway is `autobyteus-message-gateway/` inside the superrepo, and that is what was investigated.
- Bootstrap blockers: none.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose | Supports | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- |
| `product-model-analysis.md` | Model rationale, removal inventory, guiding principle, and non-normative input for the future messaging MCP project | Requirements, design | All REQ/AC | Current (SR-004–SR-016 revisions) | Approved with the requirements (SR-014). Its future-project sections are non-normative. |
| `design-review-report.md`, `architecture-review-revision-record.md` | Architecture Reviewer output (ARCH-REV-001) | Design | AR-001–AR-005 | Reviewer-owned | N/A |
| `solution-handoff.md` | Handoff/result file | Routing | — | Current | N/A |
| `history/sr-002-requirements.md`, `history/sr-002-product-model-analysis.md`, `history/sr-002-investigation-notes.md` | Archived unapproved SR-002 round (hybrid run-attached model) | History | Retired IDs | Historical | N/A (never approved) |
| `history/sr-003-requirements.md`, `history/sr-003-product-model-analysis.md` | Archived unapproved SR-003 round (first-party integration inside the platform) | History | Retired IDs | Historical | N/A (never approved) |
| `history/sr-008-requirements.md` | Snapshot of requirements before the SR-009 gateway-keep decision | History | — | Historical | N/A |

## Source Log (SR-003)

| Date | Type | Source / Command | Why | Findings |
| --- | --- | --- | --- | --- |
| 2026-09-24 | Command | `git fetch origin --prune`; `git worktree list`; `git merge --ff-only origin/personal` in the package worktree | Bootstrap | Existing package found untracked in the worktree. Fast-forward succeeded. |
| 2026-09-24 | Image | User screenshot (context file `ctx_19c7ee352da9__image.png`) | Current UI state | Gateway disabled. Discord/Telegram selectable. Provider config per bot. |
| 2026-09-24 | Code | `autobyteus-server-ts/src/external-channel/domain/models.ts` | Re-verify binding shape | `ChannelBinding` still carries provider route, `targetType`, `agentDefinitionId`, `launchPreset` (workspace, model, runtimeKind, autoExecuteTools, skillAccessMode, llmConfig), `agentRunId`, `teamDefinitionId`, `teamLaunchPreset`, `teamRunId`, `targetMemberAddress`. |
| 2026-09-24 | Code | `.../services/channel-ingress-service.ts` | Re-verify ingress | Resolves binding → `runFacade.dispatchToBinding` → records receipt → `outputDeliveryRuntime.attachAcceptedDispatch`. Unbound messages are marked `UNBOUND`. |
| 2026-09-24 | Code | `.../runtime/channel-binding-run-launcher.ts`, `channel-agent-run-facade.ts` | Re-verify lifecycle coupling | `prepareAgentRun` from launch preset; `restoreTeamRun`/`createTeamRunFromRootConfig` for teams; `postUserMessage` with the envelope; `publishExternalUserMessage` to the live stream. |
| 2026-09-24 | Code | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/{types.ts,managed-messaging-gateway-service.ts,managed-messaging-provider-availability.ts,managed-messaging-gateway-storage.ts}` | Confirm "disabled by default" and credential storage | Default `desiredEnabled: false`. Supported `WHATSAPP, WECOM, DISCORD, TELEGRAM`; excluded `WHATSAPP, WECOM, WECHAT`. Tokens (`discordBotToken`, `telegramBotToken`) are stored in server-owned `provider-config.json` under the gateway config root, and gateway env is in `gateway.env`. |
| 2026-09-24 | Code | `autobyteus-message-gateway/src/**` (tree), `domain/models/provider-adapter.ts`, `http/routes/*`, `infrastructure/server-api/autobyteus-server-client.ts`, `application/services/channel-mention-policy-service.ts` | Gateway role | The adapter contract is inbound parse + `sendOutbound`. Outbound is reachable only through the signed server callback `/api/server-callback/v1/messages` into a durable outbox. Inbound goes to the inbox, through the mention gate (groups need mention metadata or are `BLOCKED`), and is forwarded to server `/rest/api/channel-ingress/v1/messages`. Admin routes cover capabilities, WeCom accounts, personal sessions, and peer discovery. |
| 2026-09-24 | Command | `wc -l` over messaging code | Coupling footprint | Server `external-channel` 6,307 lines; managed gateway supervisor 2,762; binding GraphQL + ingress REST 893; gateway src 10,519; `autobyteus-ts/src/external-channel` 782; web messaging components/stores/composables about 5,214. |
| 2026-09-24 | Command | `grep` for external-channel/external-user-message usage outside the module | Cross-cutting coupling | Server: `compositions/build-studio-server.ts`, `server-runtime.ts`, `services/agent-streaming/{external-user-message-server-message,agent-live-message-publisher,team-live-message-publisher,models}.ts`. Web: `services/agentStreaming/{protocol/externalUserMessageTypes,handlers/externalUserMessageHandler,agentStreamMessageProjector,teamStreamDtoAdapters}.ts`, `agentOrgStreamingService.ts`, `stores/agentOrgContextsStore.ts`. `autobyteus-ts`: `agent/message/external-source-metadata.ts`, `agent-input-user-message.ts`. |
| 2026-09-24 | Doc | `autobyteus-web/docs/messaging.md` | Documented current product promise | Documents the Channel Binding + Verify steps, the per-binding launch preset, and later coordinator output delivered without a new inbound message. |
| 2026-09-24 | Doc | `autobyteus-web/docs/skills.md`, `autobyteus-web/docs/tools_and_mcp.md`, `autobyteus-server-ts/docs/modules/agent_communication.md`, `secret_management.md` | Existing primitives for "integration = skill + tools" | Agent definitions select `skillNames` and registered tool names. MCP-origin tools reach native, Codex, and Claude runtimes (through the `autobyteus_agent_tools` bridge). Browser tools are a precedent for server-registered tools that call an external bridge. The secret vault uses a bounded provider catalog with no messaging credentials. |
| 2026-09-24 | Code | `autobyteus-server-ts/src/secret-management/catalog/provider-credential-catalog.ts` | Credential options | The catalog maps LLM/search/media/runtime consumers only. |
| 2026-09-24 | Command | `ls` of `autobyteus_mcps` and `autobyteus-skills` | Existing messaging MCPs/skills | None found for messaging. |
| 2026-09-24 | Doc | `autonomous-scheduled-agent-runs` worktree `requirements.md` | Periodic wake-up option | Automation Schedule is in progress, not merged into `personal`. It wakes a selected agent/team on a schedule. Its research names a later source-agnostic Signal Monitor. |
| 2026-09-24 | Doc | `tickets/done/disable-broken-messaging-providers/requirements.md` | Provider availability history | WhatsApp/WeCom hidden. Discord/Telegram kept. |
| 2026-09-24 | Web | `https://core.telegram.org/bots/api#getting-updates` | Telegram read/discovery constraints | "Incoming updates are stored on the server until the bot receives them either way, but they will not be kept longer than 24 hours." `getUpdates` "will not work if an outgoing webhook is set up." "An update is considered confirmed as soon as getUpdates is called with an offset higher than its update_id." There is no method to fetch chat history. |
| 2026-09-24 | Web | `https://docs.discord.com/developers/events/gateway` (Message Content intent) | Discord read constraints | Content is empty without the privileged intent "across the APIs" (REST and Gateway), except the app's own messages, DMs, mentions, and context-menu targets. |

### SR-004 Additions (2026-09-24, after the user directed "no external-channel code in the platform")

| Date | Type | Source / Command | Why | Findings |
| --- | --- | --- | --- | --- |
| 2026-09-24 | Command | `git ls-files` filtered for messaging identifiers, grouped by directory | Removal inventory | Server `src/external-channel` (51 files), `managed-capabilities` (15), `api` (10), plus unit/e2e/integration tests. Web `components/settings` (22), `ui-prototypes/messaging-setup-assistant` (29), `stores`, `composables`, `types`, `utils`, `graphql`, `services/agentStreaming`, `docs/messaging.md`, and package-local historical `tickets/`. `autobyteus-ts/src/external-channel` (12) + tests. Gateway package: src, tests, tools/wechaty-sidecar, tickets. |
| 2026-09-24 | Command | `grep` over `.github`, `scripts`, `docker`, `pnpm-workspace.yaml` | Build/release coupling | `release-messaging-gateway.yml`. Gateway version check/build steps in `release-desktop.yml` (L93–109) and `release-android.yml` (L196–213). `scripts/desktop-release.sh` bumps the gateway version and regenerates the server `release-manifest.json`. `scripts/android-bootstrap-termux.sh` filters the gateway. `docker/Dockerfile.allinone` builds/copies the gateway and runs `allinone-start-gateway.sh`. The workspace includes `autobyteus-message-gateway`. |
| 2026-09-24 | Code | `autobyteus-server-ts/prisma/migrations/*channel*`, `schema.prisma` | DB leftovers | `20260208094000` created five channel tables. Later migrations dropped `channel_bindings` and the two idempotency tables and recreated `channel_message_receipts`. `channel_message_receipts` and `channel_delivery_events` were never dropped but are absent from `schema.prisma`, so they are orphan tables in existing DBs. |
| 2026-09-24 | Code | `managed-capabilities/messaging-gateway/messaging-gateway-installer-service.ts` | On-disk roots | Managed root is `<appData>/extensions/messaging-gateway/{config,runtime-data,versions,state}`. Download cache is `<download>/messaging-gateway`. Logs are `<logs>/messaging-gateway`. |
| 2026-09-24 | Data | `~/.autobyteus/server-data` (counts only, no secret values printed) | Real legacy data | `external-channel/bindings.json` has 1 binding (TELEGRAM → TEAM `classroomsimulation`, updated 2026-05-10), plus receipts, deliveries, and outbox files. `extensions/messaging-gateway/versions` has 25 versions (5.9 GB). `download/messaging-gateway` is 1.0 GB. `logs/messaging-gateway` is 5.3 MB. `config/provider-config.json` and `gateway.env` are present. This corrects the SR-002 note that no binding file existed locally. |
| 2026-09-24 | Code | `messaging-gateway-process-supervisor.ts`; `server-runtime.ts:285` | Process lifecycle after removal | The gateway is spawned as a non-detached child (SIGTERM, then SIGKILL on stop). Startup calls `restoreIfEnabled()`. After removal, nothing spawns it, so no orphan process survives an upgrade. |
| 2026-09-24 | Command | `grep externalSource` in run-history/memory/web hydration | History impact | No run-history dependency on `externalSource`. Only `autobyteus-ts/src/agent/message/external-source-metadata.ts` parses it. Historical runs should remain viewable (verify in design). |
| 2026-09-24 | Command | `grep` docs | Docs to update | Root `README.md`; server `ARCHITECTURE.md`, `PROJECT_OVERVIEW.md`, `README.md`, `features/remote_access.md`, `URL_GENERATION_AND_ENV_STRATEGY.md`, `modules/run_history.md`, `modules/llm_management.md`; web `README.md`, `docs/settings.md`, `docs/github-actions-tag-build.md`, `docs/agent_execution_architecture.md`, `docs/messaging.md`; `docs/future-tickets/mobile-backend-authorization-hardening.md`. |

### SR-005 Additions (2026-09-24, delivery shape for the messaging project)

| Date | Type | Source / Command | Why | Findings |
| --- | --- | --- | --- | --- |
| 2026-09-24 | Code | `autobyteus-ts/src/tools/mcp/server-instance-manager.ts` (L19, L35-52, L71-92) | Stdio vs. remote MCP suitability | `activeServers: Map<agentId, Map<serverId, server>>`. `getServerInstance(agentId, serverId)` creates per-agent instances, and `cleanupMcpServerInstancesForAgent` tears them down. A stdio messaging MCP would run one bot connection per agent and none when no agent runs. |
| 2026-09-24 | Command | `git -C /Users/normy/autobyteus_org/autobyteus-message-gateway remote -v` | Separate project home | `origin https://github.com/AutoByteus/autobyteus-message-gateway.git`. Local clone is 3 commits on `main` (stale relative to the superrepo package). |
| 2026-09-24 | Doc | `autobyteus-web/docs/tools_and_mcp.md` | Remote MCP support | Streamable HTTP MCP servers with `url`, `token`, and `headers` are already supported and their tools are assignable across runtimes. |

### SR-008 Additions (2026-09-24, where the gateway code actually lives)

| Date | Type | Source / Command | Why | Findings |
| --- | --- | --- | --- | --- |
| 2026-09-24 | Command | Workspace repo: `cat .gitmodules`; `git ls-tree HEAD autobyteus-message-gateway`; `git ls-files autobyteus-message-gateway \| wc -l`; `git log -- autobyteus-message-gateway`; `pnpm-workspace.yaml` | User asked what "the gateway sits inside the workspace repo" means | No `.gitmodules`. `autobyteus-message-gateway` is a regular tracked tree (221 files) touched by 267 commits. The latest `src` commit is `b66b486eb` (2026-04-27). It is listed as a pnpm workspace package. |
| 2026-09-24 | Command | `git log --grep=submodule`; first commits touching the folder | How it got there | The workspace repo started 2026-02-19 with submodules (`99e5eabcc`). On 2026-02-26, `b1c89884e` "flatten(personal): embed module sources as regular directories" converted them into regular folders. All later gateway development happened in the workspace repo. |
| 2026-09-24 | Command | Standalone clone: `git fetch`; branch heads on `origin` (`AutoByteus/autobyteus-message-gateway`) | Is the separate repo current? | `main` has 3 commits (last 2026-02-10). `enterprise` has 7 (2026-02-19). `codex/personal-team-memory-layout` has 7 (2026-02-26). The separate repo stopped at the flatten date and lacks about 7 months of work. |

### SR-011 Additions (2026-09-24)

| Date | Type | Source / Command | Why | Findings |
| --- | --- | --- | --- | --- |
| 2026-09-24 | Command | `ls .github/workflows`; `grep` for recursive pnpm commands; root `package.json` scripts | Would a left-alone (possibly broken) gateway affect main-product checks? | Workflows are release-only (`release-android`, `release-desktop`, `release-ios`, `release-messaging-gateway`, `release-server-docker`). There is no repo-wide test CI. Root scripts use `--filter` for specific packages. The gateway is reached only through its own workflow, the desktop/Android release steps (being removed), `scripts/android-bootstrap-termux.sh`, Docker all-in-one (being removed), and pnpm workspace membership (install only). |

### Architecture-Phase Evidence (2026-09-24, after SR-014 approval)

| ID | Type | Source / Command | Findings | Design Decision |
| --- | --- | --- | --- | --- |
| AE-01 | Command | `git grep -l -i -E "<messaging identifiers>" -- ':!tickets' ':!autobyteus-message-gateway' ':!**/tickets/**'` grouped by directory | Beyond the SR-004 inventory: `autobyteus-team-stream-contracts/src/{team-collaboration-message-dtos,team-stream-server-message}.ts` (+ tracked `dist/`), `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts` (+ `dist/`), `autobyteus-server-ts/scripts/copy-managed-messaging-assets.mjs`, `autobyteus-web/generated/graphql.ts`, two historical app-data migrations, `tests/architecture/*`, and tracked historical logs under `test-results/` and `frontend-execution-evidence/`. | Contracts, script, generated types, historical migrations, and architecture tests are in the removal set. Historical logs are treated as historical records (REQ-120 exception). |
| AE-02 | Code | `server-runtime.ts` L18–24, L260–261, L272–287; `compositions/build-studio-server.ts` L29–31, L107 | Startup starts `ChannelRunOutputDeliveryRuntime` and `GatewayCallbackDeliveryRuntime`, seeds the internal base URL, and calls `restoreIfEnabled()`. Shutdown stops both runtimes and closes the gateway service. | Remove these calls. |
| AE-03 | Code | `config/server-runtime-endpoints.ts`; readers found by grep | `getInternalServerBaseUrlOrThrow` is read only by `managed-messaging-gateway-runtime-env.ts`, and its errors say "Managed messaging requires …". The env var has no other reader. Seeding happens in `server-runtime.ts`, `standalone-application-host/start-standalone-application-host.ts` L309, and 13 non-messaging test files. | Delete the file and all seeding. Update the 13 tests. |
| AE-04 | Code | `api/graphql/schema.ts` L25, L34, L68, L77; `api/rest/index.ts` L8, L40 | `ExternalChannelSetupResolver`, `ManagedMessagingGatewayResolver`, and `registerDefaultChannelIngressRoutes` are registered. | Unregister and delete them. |
| AE-05 | Code | `api/security/remote-access-route-policy.ts` L93–97, L111; `remote-access/domain/models.ts` L13 | `EXTERNAL_SIGNATURE` is used only for the two channel-ingress paths and is allowed without auth. | Remove the classification value, the path rule, and the allow-list entry. Old paths then fall into the default protected family (404 locally, auth rejection remotely). |
| AE-06 | Code | `services/agent-streaming/{external-user-message-server-message,agent-live-message-publisher,team-live-message-publisher,models}.ts`; contracts above; web `services/agentStreaming/{agentStreamMessageProjector,teamStreamDtoAdapters,protocol/*,handlers/externalUserMessageHandler}.ts`; `services/agentOrgExecution/agentOrgStreamingService.ts` L69, L372; `stores/agentOrgContextsStore.ts` L95 | `EXTERNAL_USER_MESSAGE` exists end to end only to show bound-run chat messages live. | Remove it from contracts, server, and web. |
| AE-07 | Code | `autobyteus-ts/src/agent/message/{agent-input-user-message,index,external-source-metadata}.ts`; `src/index.ts` L14 | `getExternalSourceMetadata()` parses `metadata.externalSource`. It has no other callers after the server external-channel module is gone. The main index re-exports `external-channel`. | Delete the metadata parser and method. Remove the export. |
| AE-08 | Code | `autobyteus-ts/package.json` `exports` (`./*` subpaths); `autobyteus-ts/src/external-channel/` (11 files + `index.ts`, relative imports only); gateway `package.json`, `vitest.config.ts` aliases; 28 gateway src + 16 gateway test files importing `autobyteus-ts/external-channel/*` | The types are self-contained and the gateway reaches them through subpath imports. The gateway's own `docker/Dockerfile` and `scripts/build-runtime-package.mjs` also reference `autobyteus-ts`. | Move the folder with `git mv` to `autobyteus-message-gateway/src/external-channel/` (and 6 unit tests to `tests/unit/external-channel/`). Switch imports to relative paths. Drop the `autobyteus-ts` dependency, the pre-scripts, and the vitest aliases. Leave the gateway's own Dockerfile and runtime-package script untouched (SR-011). |
| AE-09 | Code | `app-data-migrations/{app-data-migration-registry,app-data-migration-runner}.ts`; `domain/app-data-migration-types.ts`; `server-runtime.ts` L189–196 | `runPending()` runs each `requiredOnStartup` definition that has not `SUCCEEDED`, in registry order. `FAILED` is logged and startup continues, then retried on the next start. Backups are chosen per migration. Migrations may use `createConfiguredPrismaClient()` (token-usage backfill precedent). | New `requiredOnStartup` cleanup migration appended last, with no backup. |
| AE-10 | Code | `migrations/custom-provider-readable-id-app-data-migration.ts` L155 + `custom-provider-readable-id-json-selector-migrator.ts` (`BINDINGS` candidate); `migrations/remove-global-skill-discovery-mode-migration.ts` L157 | Two historical migrations read or rewrite `external-channel/*` files. | Remove their external-channel branches. The cleanup migration deletes those files anyway, so outcomes are unchanged. |
| AE-11 | Code | `prisma/migrations/20260331102000_remove_channel_bindings_table/migration.sql` (`DROP TABLE IF EXISTS "channel_bindings";`); `startup/migrations.ts` uses `prisma migrate deploy` | Precedent: channel tables are dropped through Prisma migrations, keeping migration history consistent with the DB. | Drop the two orphan tables in a new Prisma migration, not in the app-data migration. |
| AE-12 | Code | `autobyteus-web/pages/settings.vue` L313–370 | `normalizeSection()` returns `null` for unknown sections, and the page keeps its default `api-keys`. | Removing `'messaging'` from the type, set, nav, and content satisfies REQ-118 without alias code. |
| AE-13 | Code | `autobyteus-web/package.json` scripts | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`, `codegen`, `test:nuxt`. Localization lives in `localization/messages/{en,zh-CN}/settings{,.generated}.ts` (77 generated + 53 manual messaging keys in `en`). | Remove the keys and regenerate `generated/graphql.ts`. Run the guards. |
| AE-14 | Code | `docker/{Dockerfile.allinone,allinone-start-gateway.sh,supervisor-allinone.conf,compose.personal-test.yml,README.md}`; `.github/workflows/{release-desktop,release-android,release-messaging-gateway}.yml`; `scripts/{desktop-release.sh,android-bootstrap-termux.sh}`; `release-server-docker.yml` uses `autobyteus-server-ts/docker/Dockerfile.monorepo` (no gateway) | Gateway build, start, and supervision appear in the all-in-one image and in the desktop/Android releases. | Remove all gateway steps. Delete `release-messaging-gateway.yml` and `allinone-start-gateway.sh`. |
| AE-15 | Code | `autobyteus-server-ts/package.json` `build:full`; `tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` L155 | `copy-managed-messaging-assets.mjs` copies the gateway release manifest plus the built-in agent templates. | Rename it to `copy-build-assets.mjs` (templates only) and update both callers. |
| AE-16 | Command | `git grep -l` over server `tests/` | Messaging tests: `unit/external-channel/**` (23), `unit/managed-capabilities/messaging-gateway/**` (6), `integration/external-channel/**` (4), `e2e/messaging/**` (3), `e2e/external-channel/**` (1), `unit/api/rest/channel-ingress.test.ts`. Cross-referencing tests also need edits: `unit/remote-access/route-policy.test.ts`, `unit/services/agent-streaming/*` (4), `unit/app-data-migrations/*` (2), `architecture/*` (2), `unit/agent-execution/*`, `integration/agent-team-execution/*` (2), `e2e/runtime/*`, `e2e/secret-management/*`, `e2e/memory-sync/*`. | Delete the dedicated tests and edit the cross-referencing ones. |
| AE-17 | Review + code | ARCH-REV-001 AR-001; `pnpm-workspace.yaml`; `pnpm-lock.yaml` L147 importer; root `package.json` `pnpm.onlyBuiltDependencies` (`@whiskeysockets/baileys`, declared only by the gateway) | Gateway workspace membership couples main-product install to the gateway, which contradicts AC-117/REQ-120. | Remove it from the workspace, refresh the lockfile, and drop the gateway-only `onlyBuiltDependencies` entry. |
| AE-18 | Supplementary residue search (`GatewaySignature`, `CHANNEL_CALLBACK`, `CHANNEL_GATEWAY`, `MESSAGE_GATEWAY`, `messageGateway`, `GATEWAY_*`) | `git grep` excluding the removal dirs, tickets, the gateway, and logs | Messaging-only residue: `api/rest/middleware/verify-gateway-signature.ts` (+ its unit test); `config/app-config.ts` L434–453 `getChannelCallback*`; `scripts/personal-docker.sh` L143, L153–170, L181, L268–278; `docker/compose.personal-test.yml` `GATEWAY_*` L28–46, `MESSAGE_GATEWAY_*` L62–63, port L67, `gateway-memory` volume L74/L113; `autobyteus-web/.env.local.example` L19–24; `autobyteus-web/README.md` L48. | Add all of them to the removal plan. |
| AE-19 | Provider-name residue search (`telegram|discord|whatsapp|wecom|wechat`) outside the removal dirs | `git grep -l -i` | Additional items: `autobyteus-web/utils/discordBindingIdentityValidation.ts` + `utils/__tests__/discordBindingIdentityValidation.spec.ts` (only caller `messagingChannelBindingSetupStore.ts`); binding cases in `tests/e2e/runtime/skill-access-mode-graphql.e2e.test.ts` (L130–164); external-source fixture in `tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts` L150; bindings cases in `tests/e2e/secret-management/custom-provider-readable-id-startup-migration.e2e.test.ts`. Not messaging: `ui-prototypes/local-agents-clean-list/.../local-agents-list-clean-default.md` L60 ("WeChat Official Account Agent" is an illustrative agent name). | Delete or edit the first four. Keep the prototype prompt. |
| AE-20 | Code/git | root `index.html` (last touched `5fe4430e5`, 2026-03-04); `git ls-files _nuxt` → none; no references | A stale, accidentally committed Nuxt build output. It references untracked `_nuxt/` assets and contains `messageGatewayBaseUrl`. | Delete it. |
| AE-21 | Tickets | `tickets/in-progress/{messaging-agent-team-support,messaging-gateway-desktop-distribution,telegram-managed-flow-hardening}`: last touched 2026-03-08 to 2026-03-30; no obsolete-ticket convention exists (only `done/` and `in-progress/`) | These are stale in-progress tickets for the removed feature. | `git mv` them to `tickets/done/` and add a `superseded.md` note to each. They then count as historical ticket records (REQ-120 exception). |
| AE-22 | Code | `.github/workflows/release-desktop.yml` ≈L87–111, `release-android.yml` ≈L189–215 ("Validate workspace package versions match release tag" also validates the desktop version) | These steps combine gateway and desktop validation. | Remove only the `GATEWAY_VERSION` lines and the managed-messaging manifest steps (R-2). |

### SR-017 Additions (2026-09-24, Requirement Gap from API/E2E)

| ID | Type | Source / Command | Findings | Implication |
| --- | --- | --- | --- | --- |
| AE-23 | Downstream evidence | `/api_e2e_engineer` report; `api-e2e-evidence/gateway-build-check/SUMMARY.md` and logs (clean detached worktrees of candidate `40f769e0d` and baseline `40b1783f4`) | Baseline: root install + gateway build passes, and `build:runtime-package` passes. Candidate: root install gives the gateway no dependencies (`tsc: command not found`); `pnpm install` inside the gateway is captured by the root workspace; `build:runtime-package` fails; the gateway Dockerfile fails (it was already failing at baseline for unrelated corepack/postinstall reasons). A standalone copy passes typecheck, build, tests (86 files / 268 tests), and a `/health` smoke. `pnpm install --ignore-workspace` in-repo plus a build passes. | Removing workspace membership (AR-001) left no working in-repo install path for the gateway. The source is fine. |
| AE-24 | Probe | Temp dir: root `pnpm-workspace.yaml` listing `pkg-a`; subfolder `gw/` with its own `pnpm-workspace.yaml` (`packages: ["."]`); `pnpm install --offline` in `gw/` and at the root (pnpm 10.28.2) | Without the nested file, install in `gw/` is captured by the root workspace ("Scope: all 2 workspace projects") and `gw/` gets no lockfile. With the nested file, `gw/` gets its own `node_modules` and `pnpm-lock.yaml`, and the root lockfile has 0 `gw` entries. | A gateway-local `pnpm-workspace.yaml` (+ its own build-approval settings) makes plain `pnpm install` inside the gateway standalone while staying out of the main workspace. This is a candidate for DEC-114 (a). |
| AE-25 | User direction | Verbatim via `/api_e2e_engineer`: "It's fine even though the message gateway doesn't work but it should build, you know. I don't want that it doesn't even build." | This contradicts REQ-121 (SR-011: no build requirement). | Requirement Gap → SR-017 |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Current Production Path | Outcome |
| --- | --- | --- |
| BEH-101 | Settings → Messaging: `ManagedGatewayRuntimeCard` → `ProviderSetupScopeCard` / provider config → `ChannelBindingSetupCard` (target + launch preset) → `SetupVerificationCard`; GraphQL `external-channel-setup` + `managed-messaging-gateway`. | Setup couples the chat route to an agent/team and its run configuration. |
| BEH-102 | Provider adapter → gateway inbox → `InboundClassifierService`/`ChannelMentionPolicyService` → `AutobyteusServerClient.forwardInbound` → server `ChannelIngressService` → `ChannelBindingService.resolveBinding` → `ChannelRunFacade` → `ChannelBindingRunLauncher` (prepare/restore/create) → `postUserMessage`/team post → `publishExternalUserMessage`. | A platform message creates or drives a run. |
| BEH-103 | Run/team events → `ChannelRunOutputDeliveryRuntime` → eligibility → collector → `ReplyCallbackService` → callback outbox → gateway `/api/server-callback/v1/messages` → outbox → `sendOutbound`. | Run output is auto-mirrored to the chat. |
| BEH-104 | No agent tool for messaging exists. | Agents cannot choose to message or read. |
| BEH-106 | `FileChannelBindingProvider` → `<appDataDir>/external-channel/bindings.json`; tokens in gateway `provider-config.json`. | Bindings are active configuration. |

## Design Health Assessment Evidence

- Change posture: `Larger Requirement` (behavior change plus removal of a subsystem)
- Root cause: `Boundary Or Ownership Issue` (primary). The transport integration owns agent lifecycle and outbound intent. Secondary: `Duplicated Policy Or Coordination` (launch presets duplicate run launch) and `Shared Structure Looseness` (`ChannelBinding` mixes route, target, execution, and output).
- Refactor posture: `Likely Needed`. The binding subsystem is removed with a clean cut. Transport pieces are reused: gateway supervision, provider clients, and the outbox.
- Evidence: see Source Log rows for models, ingress, launcher, output runtime, and the coupling footprint.

## Findings

1. The coupling described by the user is still fully present on the current base. The only change since August is that the managed gateway is off by default and WhatsApp/WeCom/WeChat are excluded.
2. The binding owns agent lifecycle, input, and output. Nothing in the current design lets an agent use messaging as a capability.
3. AutoByteus already has the primitives the user's model needs: tool and skill assignment on agent definitions, MCP-origin tool bridging across runtimes, and server-registered bridge tools (browser precedent).
4. A user can already approximate the model today by adding a third-party messaging MCP server. The first-party value is setup, credential custody, an always-on receiver, and a bundled skill.
5. Sending is stateless on both platforms (bot token + HTTP).
6. Telegram reading and destination discovery require an always-on receiver with a local store, because there is no history API, updates last 24 hours, and `getUpdates` consumes them. The existing gateway already polls Telegram continuously.
7. Discord reading is possible on demand through REST, but needs the privileged Message Content intent for general channel content.
8. Pure tools means no real-time automatic reply. Periodic checking can come from Automation Schedule (in progress), and event wake-ups belong to a future generic trigger. This is a user decision (DEC-101).
9. The secret vault has no messaging slot. Tokens live in gateway `provider-config.json`. Keeping secrets out of agent context favors tools that run in the server or gateway over skill scripts that would need the token.
10. Removing the binding also removes a special streaming message type (`EXTERNAL_USER_MESSAGE`) across server and web. That is a cross-package cleanup item for design.

## Persisted Data Transition Evidence

> Superseded SR-003 content was replaced in SR-016 (AR-005). The authoritative decision is REQ-114 (approved) and `design-spec.md` "Persisted Data / State Transition Decision".

- `<appDataDir>/external-channel/` (bindings, receipts, deliveries, callback outbox), `<appDataDir>/extensions/messaging-gateway/` (installed versions, `config/provider-config.json` and `gateway.env` with plaintext bot tokens, state, runtime data), `<downloadDir>/messaging-gateway/`, and `<logsDir>/messaging-gateway/` are **deleted** by the one-time cleanup migration, with no backup (REQ-114, QR-104). Tokens are **not** preserved.
- The orphan tables `channel_message_receipts` and `channel_delivery_events` are dropped through a Prisma migration (AE-11).
- Historical run memory with `metadata.externalSource` is directly usable. Projection ignores the key (BEH-109).
- Local representative data: 1 Telegram→team binding, 25 gateway versions (5.9 GB), a 1.0 GB download cache, and 5.3 MB of logs.
- Outside the four roots, and therefore untouched under the approved scope: the Docker all-in-one `<logs>/gateway.log` and the `gateway-memory` named volume (R-3). Mention them in the release notes.

## Constraints / Dependencies

- The main product must contain no messaging code (REQ-101/REQ-120). The gateway stays in the repo, left alone apart from absorbing its types (REQ-121).
- Historical Prisma migrations stay.
- MCP/skills and run history are preserved (REQ-116, REQ-119).

## Open Unknowns / Risks

- All requirement decisions (DEC-108 to DEC-112) are resolved and approved (SR-014).
- Remaining risks are listed in `design-spec.md` "Risks": a hidden consumer of a removed item, and release workflow edits that cannot be fully exercised without a tag.

## Notes For Architecture Reviewer

Requirements are approved (SR-014). SR-016 addresses ARCH-REV-001 findings AR-001 to AR-005 and recommendations R-1 to R-3. The evidence for the revision is AE-17 to AE-22 above.
