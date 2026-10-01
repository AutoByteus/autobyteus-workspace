# Implementation Handoff — Remove External Messaging From The Main Product

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Independent architecture review was selected and passed (ARCH-REV-002). `get_handoff_rules` matched "implementation is complete and the carried classification is task_size=Large or architectural_risk=High …" → `/code_reviewer`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/requirements.md` (Approved, SR-014)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/design-spec.md` (SR-016)
- Supplemental task artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/product-model-analysis.md` (approved supplement)
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/solution-handoff.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/design-review-report.md` (ARCH-REV-002, Pass)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/code-review-report.md`: CRR-001 (round 1, Fail → Local Fix, finding CR-001) and CRR-003 (round 3, API/E2E failure-origin review of G-01 → implementation Local Fix, finding CR-002)
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/api-e2e-execution-coverage-report.md` (API-REV-001, G-01 default-data-dir probe)
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/code-review-revision-record.md`

## Current Implementation Summary

- Implementation cycle: `Rework` (Local Fixes for CR-001 and CR-002; no source-code change in either)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/implementation-revision-record.md`
- Current implementation revision ID: `IR-003` (baseline `IR-001`; previous `IR-002`)
- Related solution revision IDs: `SR-014`, `SR-016`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `CRR-001` (Fail → Local Fix CR-001) and `CRR-002` (**Pass** on commit `e9bbb28ab`, 9.45/10; see `code-review-report.md`). The code reviewer routed the package to `/api_e2e_engineer`. `CRR-003` (round 3): the G-01 failure origin is implementation → Local Fix CR-002. `CRR-004` (round 4): **Pass** on commit `40f769e0d` (CR-002 resolved; content and path gates clean; 9.45/10). The code reviewer routed the package to `/api_e2e_engineer` for the R-09 and G-01 reruns.
- Related API/E2E revision IDs: `API-REV-001` (all ACs passed except the G-01 path residue, now fixed by IR-003)
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-002` (current); `CR-001` (IR-002)
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign`
- Branch: `codex/external-messaging-agent-participant-redesign`
- Commit: `40f769e0d` on top of base `origin/personal` @ `40b1783f4`.
  - Amend history: `a1478259d` (IR-001) → `e9bbb28ab` (IR-002, SDK `dist/` untracked, CR-001) → `40f769e0d` (IR-003, tracked messaging runtime file removed, CR-002).
  - 440 files: +579/−32279
  - Added files are exactly the 6 designed additions: the cleanup migration, its unit test, the Prisma `migration.sql`, and the 3 `superseded.md` notes.
  - The ticket folder is untracked and not in the commit.
- Review diff: `git diff 40b1783f4..40f769e0d -M`

All external-channel and messaging-gateway code is removed from the main product, following design sequence steps 1–7 and 6a.

- **Gateway (step 1):** `autobyteus-message-gateway` absorbs the message types. Its imports are rewritten to relative paths, and it drops the `autobyteus-ts` dependency.
- **Two migrations:** a startup app-data migration deletes the four messaging data roots, and a Prisma migration drops the two orphan tables.
- **Release/packaging:** all gateway release and packaging steps are gone, and the gateway is no longer a pnpm workspace member.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` → "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - Public API removal: GraphQL, REST, and a route class.
  - A shared stream-contract change, with the tracked `dist/` rebuilt.
  - Persistent data deletion plus DDL.
  - Release, workflow, workspace, and lockfile changes.
  - Startup and shutdown sequence changes.
  - 440 files across 8 areas.
  - Implementation found nothing that lowers any of these factors.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (Large/High route)
- New design impact or escalation trigger: `None blocking`. The design's escalation triggers were checked explicitly (see "Escalation Trigger Checks"). One removal-plan row was not followed because the item is not messaging (DV-1). The implementation took the conservative option and kept existing behavior. It is flagged below for reviewer and Solution Designer visibility.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-101 | No Messaging section; an old link lands on a valid section | `autobyteus-web/pages/settings.vue`: `'messaging'` removed from the type, `validSections`, the nav button, the content line, and the import. `normalizeSection()` returns null, so the page keeps the default `api-keys`. | Rendered: the nav has no Messaging entry, and `/settings?section=messaging` shows API Keys (see the Frontend check). Unit: `pages/__tests__/settings.spec.ts` covers the unknown-section fallback. |
| BEH-102 | No ingress route or GraphQL fields; no startup path reads bindings | Deleted `src/external-channel/**`, `api/rest/channel-ingress*.ts`, `channel-delivery-event-route.ts`, `middleware/verify-gateway-signature.ts`, and `api/graphql/types/external-channel-setup*`/`managed-messaging-gateway.ts`. Unregistered them in `rest/index.ts` and `graphql/schema.ts`. `EXTERNAL_SIGNATURE` removed from `remote-access/domain/models.ts` and `api/security/remote-access-route-policy.ts`. | Local smoke: a loopback POST to `/rest/api/channel-ingress/v1/messages` returns **404**. The printed schema has 0 externalChannel/managed-messaging types. The formal AC-102/AC-103 probes belong to validation. |
| BEH-103 | No output runtime, callback outbox, or gateway client | `server-runtime.ts` no longer starts the channel runtimes; `build-studio-server.ts` no longer stops them or closes the gateway service; `managed-capabilities/**` is deleted. | Done |
| BEH-106 | Folders deleted without backup; tables dropped; failure logged and retried | New `src/app-data-migrations/migrations/remove-external-messaging-data-migration.ts` (`20260924_remove_external_messaging_data`) with constructor-injected roots, registered last in `app-data-migration-registry.ts`. New `prisma/migrations/20260924120000_remove_external_channel_tables/migration.sql`. | Unit test covers 8 cases. Local startup smoke: the seeded roots were deleted, the `extensions/voice-input` sibling was kept, the Prisma migration applied, the log shows SUCCEEDED 4/4, and the server served health 200. |
| BEH-107 | No gateway steps in releases, Docker, or install | Deleted `release-messaging-gateway.yml` and `docker/allinone-start-gateway.sh`. Edited the desktop/Android workflows surgically (R-2). Edited `scripts/{desktop-release,android-bootstrap-termux,personal-docker}.sh`, `docker/{Dockerfile.allinone,supervisor-allinone.conf,compose.personal-test.yml,README.md}`, `pnpm-workspace.yaml`, root `package.json` `onlyBuiltDependencies`, and `pnpm-lock.yaml`. | YAML parses, `bash -n` passes, `pnpm install --frozen-lockfile` passes, and the lockfile has 0 gateway references. The Docker all-in-one build fails for a **pre-existing** reason (see Known Risks). |
| BEH-108 | MCP/skills unchanged | No edits to MCP/skills modules | The server unit suite, including the MCP tests, has no new failures versus baseline. The formal AC-118 check belongs to validation. |
| BEH-109 | Historical runs viewable; extra metadata ignored | Unchanged readers (`RawTraceItem.fromDict`, `buildHistoricalReplayEvents`) | New durable test: `local-memory-run-view-projection-provider.test.ts` "replays a historical user message carrying unknown extra metadata as an ordinary user message" (generic key `legacySourceMetadata`). The real-run probe belongs to validation. |
| (gateway) REQ-121 | Types inside the gateway; no `autobyteus-ts` dependency; not validated | `git mv autobyteus-ts/src/external-channel → autobyteus-message-gateway/src/external-channel` and the 6 tests → `tests/unit/external-channel/` (18 R100 renames). 44 files (28 src + 16 tests) rewritten to relative imports. `package.json`: `autobyteus-ts` dependency and `prebuild`/`pretypecheck`/`pretest` removed. `vitest.config.ts`: aliases removed. | Gateway not built or tested (by design). No other gateway file changed. |
| DS-004 / BEH-103 (stream contract) | `EXTERNAL_USER_MESSAGE` removed end to end | Contracts: `agent-presentation-message-dtos.ts`, `team-collaboration-message-dtos.ts`, `team-stream-server-message.ts` (+ tracked `dist/` rebuilt). Server: `ServerMessageType` member, `external-user-message-server-message.ts`. Web: projector, team DTO adapters, protocol, handler, handler index. | Contract package tests pass |

## Key Files Or Areas

**Added**
- `autobyteus-server-ts/src/app-data-migrations/migrations/remove-external-messaging-data-migration.ts`
- `autobyteus-server-ts/tests/unit/app-data-migrations/remove-external-messaging-data-migration.test.ts`
- `autobyteus-server-ts/prisma/migrations/20260924120000_remove_external_channel_tables/migration.sql`
- `tickets/done/{messaging-agent-team-support,messaging-gateway-desktop-distribution,telegram-managed-flow-hardening}/superseded.md`

**Renamed/moved**
- `autobyteus-ts/src/external-channel/**` → `autobyteus-message-gateway/src/external-channel/**`
- `autobyteus-ts/tests/unit/external-channel/**` → `autobyteus-message-gateway/tests/unit/external-channel/**`
- `autobyteus-server-ts/scripts/copy-managed-messaging-assets.mjs` → `copy-build-assets.mjs` (templates only; `package.json` `build:full` and `memory-sync-multiprocess.e2e.test.ts` updated)
- three `tickets/in-progress/*` → `tickets/done/*`

**Deleted**
- Server:
  - `src/external-channel/**`, `src/managed-capabilities/**`
  - the channel GraphQL types and REST routes, the signature middleware, `config/server-runtime-endpoints.ts`
  - `services/agent-streaming/{external-user-message-server-message,agent-live-message-publisher,team-live-message-publisher,team-stream-broadcaster}.ts`
  - the dedicated tests: `unit/external-channel`, `unit/managed-capabilities`, `integration/external-channel`, `e2e/messaging`, `e2e/external-channel`, and the channel-ingress, verify-gateway-signature, server-runtime-endpoints, and live-publisher tests
- `autobyteus-ts`: `agent/message/external-source-metadata.ts` and its test
- Web:
  - UI and state: `components/settings/MessagingSetupManager.vue`, `components/settings/messaging/**`, the messaging composables/stores/utils/types, `services/sessionSync/**`, `utils/discordBindingIdentityValidation.ts`
  - GraphQL and streaming: the messaging GraphQL documents, `services/agentStreaming/{handlers/externalUserMessageHandler,protocol/externalUserMessageTypes}.ts`
  - Other: `ui-prototypes/messaging-setup-assistant/**`, `docs/messaging.md`, and all their tests
- Repo: `.github/workflows/release-messaging-gateway.yml`, `docker/allinone-start-gateway.sh`, root `index.html`

**Edited (main)**
- Server:
  - Startup and wiring: `server-runtime.ts`, `compositions/build-studio-server.ts`, `standalone-application-host/start-standalone-application-host.ts`, `api/graphql/schema.ts`, `api/rest/index.ts`
  - Route policy and config: `api/security/remote-access-route-policy.ts`, `remote-access/domain/models.ts`, `config/app-config.ts`, `config/config-value-parsers.ts`, `persistence/file/store-utils.ts`
  - Streaming: `services/agent-streaming/{models,agent-team-stream-handler}.ts`
  - Migrations: `app-data-migrations/app-data-migration-registry.ts`, and the two historical migrations (`custom-provider-readable-id-app-data-migration.ts` + `…-json-selector-migrator.ts`, and `remove-global-skill-discovery-mode-migration.ts`)
- Web:
  - `pages/settings.vue`
  - Streaming: the `services/agentStreaming` projector, adapters, protocol, and handler index
  - Localization: `localization/messages/{en,zh-CN}/settings{,.generated}.ts` (53 manual + 77 generated keys per locale)
  - `generated/graphql.ts` (537 lines removed; see DV-5)
  - `scripts/lib/localizationLiteralAudit.mjs`
  - Docs: `.env.local.example`, `README.md`, `docs/{settings,agent_execution_architecture,github-actions-tag-build}.md`
- Docs: root `README.md`, `docker/README.md`, server `README.md`, `docs/{ARCHITECTURE,PROJECT_OVERVIEW,URL_GENERATION_AND_ENV_STRATEGY}.md`, `docs/design/agent_websocket_streaming_protocol.md`, `docs/features/remote_access.md`, `docs/modules/{agent_team_execution,llm_management,run_history}.md`, `docs/future-tickets/mobile-backend-authorization-hardening.md`, `autobyteus-ts/docs/terminal_android_direct_shell_backend_design.md`

**Design-plan deviations (for reviewer attention)**

- **DV-1 — Kept `onAcceptedExternalUserMessage` (`autobyteus-web/services/agentOrgExecution/agentOrgStreamingService.ts`, `stores/agentOrgContextsStore.ts`).**
  - The design lists it for removal under "Web streaming … Event removed", but it is not part of the `EXTERNAL_USER_MESSAGE` event.
  - It was added by `0d7b6e7e7 feat(agent-org): persist first accepted message summaries`.
  - It fires when the user's own AgentOrg `SEND_MESSAGE` from the web UI is accepted, and it refreshes AgentOrg history (first-message summary).
  - Removing it would break a non-messaging feature. It matches no REQ-120 identifier (`EXTERNAL_USER_MESSAGE` is exact and case-sensitive).
  - Kept unchanged, including its spec coverage. A rename (for example `onAcceptedUserMessage`) is possible if the Solution Designer or reviewer prefers. It was not done here, to avoid an out-of-scope change.
- **DV-2 — Deleted the whole `AgentLiveMessagePublisher` and `TeamLiveMessagePublisher` files.** The design said to remove `publishExternalUserMessage`. It was their only method and they had no other consumer, so the classes would have been empty.
- **DV-3 — Deleted `TeamStreamBroadcaster`.**
  - It was introduced by the messaging commit `077073893`, and `publishToTeamRun` had no remaining caller.
  - Removing it left a dormant register/unregister in `AgentTeamStreamHandler`; the constructor lost its third positional parameter.
  - Updated 2 test constructions. `AgentStreamBroadcaster` is kept because it still publishes AGENT_STATUS.
- **DV-4 — Removed helpers that became dead only because of this removal.**
  - `normalizeOptionalUrlBase` and `parsePositiveNumberConfig` (`config-value-parsers.ts`), as the design requires ("keep only if still used").
  - `nextNumericStringId`, `normalizeNullableString`, and `parseDate` (`persistence/file/store-utils.ts`): HEAD usage was messaging-only and current usage is 0.
  - Exports that were already unused on baseline were left alone.
- **DV-5 — `generated/graphql.ts`: messaging-only delta, not a full regen.**
  - The tracked file is already stale against the baseline schema; a full codegen at `40b1783f4` adds ~1,400 unrelated lines.
  - I generated from the baseline schema and from the worktree schema and diffed the two outputs. The difference was pure removals (539 changed lines).
  - That delta was applied to the tracked file; 2 hunks with drifted context were applied by exact block removal.
- **DV-6 — `RemoveGlobalSkillDiscoveryModeMigration` constructor loses `appDataDir`.** It was used only for the removed external-channel branch. `bindings.json` was also removed from its candidate names. The registry call is updated.
- **DV-7 — Dockerfile `RUN mkdir -p /home/autobyteus/data /app/memory` → `/home/autobyteus/data`.** `/app/memory` existed only for the gateway volume.
- **DV-8 — Test-only adjustments.**
  - A variable rename `externalSourceEdge` → `scriptSrcEdge` in `tests/architecture/application-framework-boundaries.test.ts`. It is Vue `<script src>` code, unrelated to messaging, but it would match the REQ-120 `externalSource` search.
  - Dedupe keys `external-channel:*` → `user-command:*` in `standalone-agent-run-lifecycle-service.test.ts`.

## Important Assumptions

- Release notes (R-3) are owned by delivery. They should mention that the Docker all-in-one `<logs>/gateway.log` and any `gateway-memory` volume are not pruned.
- `.github/release-notes/release-notes.md` still contains "messaging bindings". This is the already-published v1.4.78 note and is replaced at the next release, so it is kept.
- The workflow step name "Validate workspace package versions match release tag" is kept as is. Only the gateway lines were removed (R-2).

## Known Risks

- **Pre-existing Docker all-in-one build failure (affects AC-117 validation):**
  - `docker build -f docker/Dockerfile.allinone .` fails at `RUN pnpm -C autobyteus-team-stream-contracts build` with `Cannot find module '@autobyteus/agent-presentation-contracts'`. The Dockerfile never copies `autobyteus-agent-presentation-contracts`.
  - The clean baseline `40b1783f4` build fails at the identical step, so this change did not cause it and it is out of scope.
  - As a result, the Docker build cannot fully prove "Docker builds succeed without the gateway" until that gap is fixed separately.
- DV-1 is a deliberate deviation from one removal-plan row. It needs reviewer and designer acknowledgement.
- The release workflow edits cannot be exercised without a tag. Only YAML parse and diff review were done.
- The data deletion is irreversible: exactly four roots, unit-tested and smoke-tested.

## Escalation Trigger Checks

| Trigger (design spec) | Check | Result |
| --- | --- | --- |
| A non-messaging feature reads the internal base URL env var | `git grep AUTOBYTEUS_INTERNAL_SERVER_BASE_URL\|InternalServerBaseUrl` across the repo | Only the deleted managed-messaging env builder read it. The remaining hits were tests that saved and restored it (now removed). **Not triggered.** |
| … reads `EXTERNAL_SIGNATURE` | grep | Only the route policy, the models, and the route-policy test. **Not triggered.** |
| … reads `externalSource` metadata | grep | Only the deleted parser and its tests. The run-history readers never read it. **Not triggered.** |
| … reads the removed contract member | grep of `EXTERNAL_USER_MESSAGE` / `ExternalUserMessage*` | Only messaging paths. `onAcceptedExternalUserMessage` does **not** read the member (DV-1). **Not triggered.** |
| Electron/remote-node packaging expects gateway assets | `git grep release-manifest\|managed-capabilities\|messaging-gateway` in `autobyteus-web/{electron,build,scripts}`, Dockerfiles, and remote-server | None. Only the removed workflow, script, and Docker lines. **Not triggered.** |
| The cleanup touches anything beyond the four roots | Unit tests (sibling folders + symlink) and startup smoke | **Not triggered.** |

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Cleanup (removal of a whole subsystem)
- Reviewed root-cause classification: Boundary Or Ownership Issue
- Reviewed refactor decision: `Refactor Needed Now` (the refactor is removal)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`. DV-1 is a conservative non-removal of a non-messaging item and does not challenge the assessment.
- Evidence / notes: the clean-cut removal adds no shim, alias, stub route, or flag. The gateway is self-contained through relative imports.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. There is no 410 stub, section alias, deprecated contract member, or re-export shim.
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, files, helpers, tests, flags, and adapters removed in scope: `Yes`, including the dormant publishers, broadcaster, and helpers (DV-2 to DV-4). The orphan analysis over the imports of deleted server and web files found no other newly orphaned module or symbol.
- Shared structures remain tight: `Yes`. The contract unions shrink by one member, and `RemoteAccessRouteClassification` loses one value.
- Canonical shared design guidance was reapplied, and file-level design weaknesses were routed upstream when needed: `Yes` (DV-1 flagged)
- Changed source implementation files stayed within size guardrails: `Yes`. Every changed source file shrank. The largest is `config/app-config.ts` at 479 effective lines (was 500). The new migration file has 89 lines.
- Notes: the historical Prisma migrations were left untouched.

## Persisted Data Transition Check

- Approved decision:
  - A (messaging folders): `Discard or Rebuild` → discard.
  - B (orphan tables): `Discard or Rebuild` → drop via Prisma.
  - C (run memory with `externalSource`): `Directly Usable — No Migration`.
- Design-spec decision reference: "Persisted Data / State Transition Decision" A/B/C
- Implementation follows the approved decision without an unapproved migration or a version-specific runtime fallback: `Yes`
- Discard result:
  - `RemoveExternalMessagingDataMigration` does, for each injected root: lstat → missing = SKIPPED; present = `fs.rm(recursive, force)` → MIGRATED; error = FAILED item.
  - The overall status is `SUCCEEDED` when no item failed, otherwise `FAILED`, which the runner retries on the next start.
  - It never throws, makes no backup, and runs no DDL. It is `requiredOnStartup: true`, uses the default `executionPolicy`, and has no prerequisites.
  - The registry passes `path.join(appData,'external-channel')`, `path.join(appData,'extensions','messaging-gateway')`, `path.join(download,'messaging-gateway')`, and `path.join(logs,'messaging-gateway')`. These are identical to the original derivations in `external-channel-storage.ts` and `messaging-gateway-installer-service.ts` at HEAD.
  - The Prisma migration is `DROP TABLE IF EXISTS "channel_message_receipts"; DROP TABLE IF EXISTS "channel_delivery_events";`.
- Direct-use evidence (C): a new durable test shows that unknown extra metadata on a historical user raw trace is ignored and the message replays as an ordinary user message.
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- `pnpm install` refreshed `pnpm-lock.yaml`. The gateway importer and its gateway-only transitive packages were removed (−299 lines), and `--frozen-lockfile` now passes.
- The gateway folder remains on disk and is otherwise untouched. It is no longer a workspace member, so it has no `node_modules`.
- Web tests need `npx nuxi prepare` (to generate `.nuxt/`) before `test:nuxt` in a fresh worktree.
- The server e2e test `custom-provider-readable-id-startup-migration` needs a built server `dist/` (`pnpm -C autobyteus-server-ts build`).

## Local Implementation Checks Run

**IR-003 (CR-002 Local Fix):**
- `git rm autobyteus-server-ts/external-channel/gateway-callback-outbox.json`, then an amended commit (`e9bbb28ab` → `40f769e0d`). The file held `{"version":1,"records":[]}` and had been committed by accident in `76bd9107d`.
- No `.gitignore` entry was added: nothing writes there any more, and an entry would itself be residue. No tracked ignore file mentions external-channel or messaging.
- Verification:
  - `git diff --name-status e9bbb28ab 40f769e0d` shows exactly `D autobyteus-server-ts/external-channel/gateway-callback-outbox.json`.
  - Content gate (REQ-120 `git grep`, same exclusions as before): only the 4 allowed registry lines.
  - **Path gate** (new): `git ls-files | grep -E '<REQ-120 identifiers>'`, excluding the gateway folder, tickets, the six historical channel Prisma migrations, `20260924120000`, and the cleanup migration plus its unit test. It prints **nothing**.
  - A broader case-insensitive path scan for `messaging|telegram|discord|whatsapp|wecom|wechat|gateway` finds only the unrelated application/LLM gateway modules.
  - The added files are still exactly the 6 designed additions.
- Expected API/E2E rerun result: G-01 default-data-dir start → no ` D` in `git status`, and the binding root is reported as SKIPPED.

**IR-002 (CR-001 Local Fix):**
- `git rm -r --cached autobyteus-application-sdk-contracts/dist autobyteus-application-backend-sdk/dist`, then an amended commit (`a1478259d` → `e9bbb28ab`).
- Cause: `pnpm prepare:shared` (server prebuild/pretest) regenerates those folders. `.gitignore` does not cover them, and the IR-001 `git add -A` staged them. They are untracked on disk again, as on base.
- Verification:
  - `git diff 40b1783f4..HEAD --name-status | grep '^A'` lists only the 6 designed additions.
  - `git diff a1478259d e9bbb28ab` changes only the 64 SDK `dist/` files (1701 deletions) and no source file.
  - The only tracked `dist/` changes left are the designed contract rebuilds (`autobyteus-agent-presentation-contracts/dist`, `autobyteus-team-stream-contracts/dist`).
- The IR-001 results below still apply, because the source is unchanged.

Every failure below was re-run on a clean detached worktree at `40b1783f4`, and the failing file and test sets matched exactly. They are pre-existing and not caused by this change.

| Area | Check | Result |
| --- | --- | --- |
| Contracts | `pnpm --filter @autobyteus/agent-presentation-contracts --filter @autobyteus/team-stream-contracts test` (build + node tests) | Pass (1 + 2 tests). Tracked `dist/` rebuilt. |
| autobyteus-ts | `pnpm build` (+ runtime-deps verify) | Pass |
| autobyteus-ts | `vitest run tests/unit/agent/message tests/integration/public-surface` | 8 files / 39 tests pass |
| autobyteus-ts | full `tests/unit` | 296/297 files completed. 2 multimedia image-client files fail (3 tests), the same as baseline. `agent-worker.test.ts` hangs, the same as baseline. |
| Server | `tsc -p tsconfig.build.json --noEmit` (src) | Pass |
| Server | `pnpm build` (`build:full`: clean, tsc, `copy-build-assets.mjs`, bootstrap smoke) | Pass. `dist/built-in-agents/templates` is present and there is no `dist/managed-capabilities`. |
| Server | `vitest run tests/unit tests/architecture` | 495/518 files pass. 23 files / 58 tests fail, the same set as baseline. |
| Server | `vitest run tests/integration` | 49 files pass and 18 skip. 18 files / 46 tests fail, the same set as baseline. The changed integration tests all pass. |
| Server | changed e2e: `skill-access-mode-graphql`, `custom-provider-readable-id-startup-migration` (after build) | Pass (3 + 4 tests) |
| Server | `memory-sync-multiprocess.e2e` | Fails on the fixture error "Team V2 cannot contain configured Team '/nested'", the same as baseline |
| Server | new migration test + run-history projection test | 8/8 and 9/9 pass |
| Server | the relaxed `tsconfig.json` check restricted to the changed test files | No new error types from this change. The remaining errors are the pre-existing strict-index/undefined style in untouched lines. The project `typecheck` script is itself broken on baseline (TS6059 rootDir). |
| Web | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | All pass |
| Web | `NUXT_TEST=true vitest run` | 490/497 files pass and 2 skip. 5 files / 5 tests fail, the same set as baseline. My edited font-size perimeter case passes. |
| Web | `vitest --config ./electron/vitest.config.ts run` | 34 files / 152 tests pass |
| Web | `vue-tsc --noEmit` | 376 errors vs 404 on baseline. No new error (a normalized diff shows only the removed messaging files plus 2 lines that differ only by path prefix). |
| Workspace | `pnpm install --frozen-lockfile` | Pass. The lockfile has 0 `autobyteus-message-gateway`/`@whiskeysockets` references. |
| CI/scripts | YAML parse (workflows, compose, workspace); `bash -n` on the 3 edited scripts; `scripts/check_repository_artifact_hygiene.py` | Pass |
| Docker | `docker build -f docker/Dockerfile.allinone .` | Fails at the `team-stream-contracts build` step. Baseline fails at the identical step (see Known Risks). |
| Startup smoke | Built server with a temp data dir seeded with the 4 roots + `extensions/voice-input` | The cleanup log shows SUCCEEDED (scanned 4, migrated 4). The 4 roots are gone and the sibling is kept. Prisma `20260924120000` applied, health returned 200, and the old ingress POST returned 404. |
| REQ-120 gate | Case-sensitive `git grep` of the REQ-120 identifiers over all tracked files except the approved allowed set, `test-results/**`, and `frontend-execution-evidence/**` | **Clean.** The only hits are the 4 path arguments on the registry lines that construct the cleanup migration (allowed set 4). |
| REQ-120 path gate (IR-003) | `git ls-files` path match on the REQ-120 identifiers, with the same allowed set | **Clean** (empty) after removing `autobyteus-server-ts/external-channel/gateway-callback-outbox.json`. The IR-001 content-only gate missed this path-level residue (CR-002). |

## Residue Search Dispositions (design Verification Gate + N-2)

- **Supplementary patterns** (`GatewaySignature|CHANNEL_CALLBACK|CHANNEL_GATEWAY|MESSAGE_GATEWAY|messageGateway|GATEWAY_[A-Z]|gateway-memory|allinone-start-gateway`):
  - The only hits are `test-support/live-e2e/live-e2e-harness.ts`, `LIVE_E2E_GATEWAY_AGENT_FLOW_*` error codes. These belong to the AutoByteus LLM-gateway live harness and are unrelated → **keep**.
  - `MCP_GATEWAY_*` hits are excluded as known-acceptable.
- **Provider names** (case-insensitive `telegram|discord|whatsapp|wecom|wechat`): the only hit is `ui-prototypes/local-agents-clean-list/…/local-agents-list-clean-default.md` ("WeChat Official Account Agent", known-acceptable) → **keep**.
- **Case-insensitive `externalUserMessage`:** `onAcceptedExternalUserMessage` (DV-1) → **keep**, flagged.
- **Plain "messaging" (N-2):**
  - `scripts/lib/localizationLiteralAudit.mjs`: the `messaging` regex alternative → **trimmed**. It no longer matches any file.
  - `tests/integration/app-font-size-fixed-px-audit.integration.test.ts`: the reference to the deleted component → **edited** to point at `components/settings/providerApiKey/ProviderApiKeyEditor.vue`.
  - Historical UI-prototype prompts for other features mention a "Messaging"/"External Messaging" nav item: `ui-prototypes/current-shell-history-hierarchy/…`, `server-settings-user-friendly-redesign/…` (6 prompts), and `task-history-first-workspace/…` → **keep**. They are historical design artifacts, not product behavior, and match no REQ-120 identifier.
  - The sample run-summary text "Describe messaging bindings" in `WorkspaceAgentRunsTreePanel*.spec.ts` and `runHistoryStore.spec.ts` is arbitrary fixture text → **keep**.
  - Generic English:
    - inter-agent "messaging" in the server/ts docs and the LLM contract string
    - "status messaging" (`ServerSettingsEndpointCards.spec.ts`)
    - "TerminalHandler messaging"
    - "Before messaging the visible improver"
    - "Launch messaging orchestration brief" (brief-studio sample)
    - "directed teammate messaging" (e2e prompt)
    - "error messaging" (`autobyteus-ts/docs/implementation-plan.md`)
    - All → **keep**.
  - `.github/release-notes/release-notes.md` "messaging bindings" (the published v1.4.78 note) → **keep**; delivery rewrites it at the next release.

## Frontend Rendered-Result Check

- Affected surfaces / journeys: Settings navigation (the Messaging entry is removed) and the old deep link `/settings?section=messaging`.
- Approved references: REQ-101, REQ-118, AC-116, BEH-101, and design DS-003 (default fallback, no alias).
- Existing design system and adjacent surfaces reviewed: the Settings nav in `pages/settings.vue` (the remaining nav buttons are unchanged) and the API Keys default section.
- Rendered surface used:
  - The built server (`node dist/app.js`) ran on a free loopback port with a temp data dir.
  - `nuxt dev` ran on a free loopback port, with the `BACKEND_*` env pointing at that server.
  - The page was inspected in a browser tab. No user-running process was touched, and both processes were stopped afterwards.
- States, layouts, and interactions inspected:
  - `/settings`: the nav reads Back to Workspace, API Keys, Token Statistics, Display, Language, Local Tools, MCP Servers, Application Packages, Agent Packages, Server Settings, Extensions, Updates. There is no "Messaging" text anywhere on the page, and API Keys is active.
  - At the tab's narrow viewport the stacked nav has no gap where the entry was removed.
  - `/settings?section=messaging`: API Keys is active, API Key Management content is shown, and there is no error.
- Visual or interaction issues found and corrected: none.
- Supporting evidence and remaining limitations:
  - Screenshot at `/Users/normy/.autobyteus/browser-artifacts/ab3178-1790257037645.png` (narrow viewport).
  - The desktop-width row layout was not re-rendered in the browser (the tab viewport is narrow). It is unchanged apart from the removed `<li>` and is covered by the existing `settings.spec.ts` layout tests.
  - Live streaming of team/agent conversations (the removed `EXTERNAL_USER_MESSAGE` path) was not exercised in the browser because it needs a running model. It is covered by unit tests.

## Downstream Coverage Hints / Suggested Scenarios

- **AC-102:**
  - Loopback POST to `/rest/api/channel-ingress/v1/messages` and `/v1/delivery-events` → 404.
  - A remote, unauthenticated request → the default protected rejection.
  - GraphQL introspection shows no `externalChannel*`, `ManagedMessaging*`, or messaging-gateway fields.
  - Record the evidence in the ticket folder.
- **AC-103:** start a node that has a legacy `external-channel/bindings.json` → no run is created, restored, or messaged, no gateway process starts, and the folder is gone after startup.
- **AC-114 / QR-104 / QR-105:**
  - Upgrade a copy of a real data dir that has all four roots plus an older DB containing `channel_message_receipts`/`channel_delivery_events` → the roots are deleted, the tables are dropped, and the server starts.
  - Fault-inject one root (for example make it undeletable) → the migration record is FAILED, startup continues, and a later start retries.
- **AC-116:** browser check at desktop width: no Messaging nav, and the deep link lands on a valid section.
- **AC-117:**
  - Workflow diff review and a `release:test` dry run if possible.
  - Note the pre-existing Docker all-in-one gap.
  - `pnpm install --frozen-lockfile` without the gateway.
- **AC-118:** the existing MCP server/tool tests, plus a stdio MCP server with an env token, tool discovery, and assignment on the native, Codex, and Claude runtimes.
- **AC-119:** open a real historical run that a binding started (or a copied fixture kept in the ticket folder) → the messages show as ordinary user and assistant messages.
- **AC-121:** static inspection: `autobyteus-ts/src/external-channel` is absent, the gateway imports are relative, and the gateway `package.json` has no `autobyteus-ts`.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- All formal validation probes listed above (N-3): AC-102, AC-103, AC-114 (incl. the orphan-table DB upgrade and fault injection), AC-116, AC-117, AC-118, AC-119, and AC-121.
- The REQ-120/AC-120 gate should be re-run on the final integrated branch.
- A decision on the pre-existing Docker all-in-one build gap when validating AC-117. It is out of scope here and not caused by this change.
