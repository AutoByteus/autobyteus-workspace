# Handoff Summary

- Ticket: `iframe-launch-id-contract-refactor`
- Last Updated: `2026-04-25T11:40:42+02:00`
- Stage: Finalized
- Current Status: Finalized into `personal`; later included in `v1.2.83`
- User Verification Status: Completed
- Ticket Branch: `codex/iframe-launch-id-contract-refactor`
- Finalization Target: `origin/personal`

## User Verification

User explicitly verified the integrated state and requested finalization without a new release/version:

> its tested, its working. now lets finalize the ticket, and no need to release a new version

## Delivery Integration State

- Bootstrap base recorded by ticket: `origin/personal` at `cef8446452af13de1f97cf5c061c11a03443e944`.
- Delivery refresh found latest `origin/personal` at `9304b791cc8090f703ed343f93726ea927985698`, two commits ahead of the reviewed base:
  - `bc6f4952 Fix stopped run follow-up chat recovery`
  - `9304b791 Merge restore stopped run chat recovery`
- Because the reviewed/validated candidate was uncommitted, delivery created a local checkpoint commit before integrating:
  - `a846f458eda346f5b43c89835b6e58de0afe8d10 chore: checkpoint iframe launch id contract refactor`
- Integration method: merge latest tracked base into ticket branch.
- Integrated handoff HEAD: `6eacbf00446c72d0f1d19b885ec6f2006de25d56`.
- Merge result: completed without conflicts.
- Post-verification target refresh found no additional advancement beyond `9304b791cc8090f703ed343f93726ea927985698`, so no renewed verification was required.

## What Changed

- Replaced hosted iframe bootstrap public contract wording from `launchInstanceId` to `iframeLaunchId`.
- Bumped current iframe/bootstrap and frontend SDK compatibility contract to v3.
- Changed URL launch hints to use `autobyteusIframeLaunchId`.
- Changed ready/bootstrap envelopes to carry `iframeLaunchId`; bootstrap request context is now `{ applicationId }`.
- Removed old v2/launch-instance public compatibility paths instead of keeping aliases.
- Removed backend gateway propagation of launch-instance headers/query/body fields.
- Narrowed `ApplicationRequestContext` to durable app identity only.
- Refreshed built-in sample apps, generated UI/vendor artifacts, and importable package outputs for Brief Studio and Socratic Math Teacher.
- Removed host UI exposure of misleading launch-instance detail text.
- Renamed and updated the long-lived iframe contract doc from `application-bundle-iframe-contract-v1.md` to `application-bundle-iframe-contract-v3.md`.

## Main Areas Changed

- Shared contracts: `autobyteus-application-sdk-contracts/src/**`, `dist/**`, tests, and README.
- Frontend SDK: `autobyteus-application-frontend-sdk/src/**`, `dist/**`, startup tests, and README.
- Backend SDK docs: `autobyteus-application-backend-sdk/README.md`.
- Server backend gateway/package validation/runtime context: `autobyteus-server-ts/src/**`, module docs, and targeted unit/integration tests.
- Web host iframe launch flow: `autobyteus-web/components/applications/**`, `stores/applicationHostStore.ts`, application URL helpers, tests, localization, and docs.
- Samples/generated package outputs: `applications/brief-studio/**` and `applications/socratic-math-teacher/**`.
- Durable validation: `autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`.

## Validation Completed

Upstream validation passed and was accepted by code review:

- `pnpm -C autobyteus-application-sdk-contracts test`
- `pnpm -C autobyteus-application-frontend-sdk test`
- Targeted `autobyteus-web` iframe host/surface/shell/store/URL Vitest set: 5 files / 13 tests.
- Targeted `autobyteus-server-ts` package/backend/imported-sample set: 5 files / 28 tests.
- Temporary browser E2E probe for generated/importable Brief Studio and Socratic Math Teacher.
- Temporary package admission/import probe accepting v3 and rejecting retired frontend SDK contract version `"2"`.
- Legacy public-contract identifier scan.
- Full-stack Brief Studio browser/runtime smoke (`VE-009`): real Applications UI opened Brief Studio, verified v3 iframe URL hints including `autobyteusIframeLaunchId`, created/launched a real brief draft run, and observed generated artifacts in UI.

## Delivery Post-Integration Checks

After merging latest `origin/personal`, delivery reran:

```bash
git diff --check origin/personal...HEAD
rg -n "launchInstanceId|autobyteusLaunchInstanceId|x-autobyteus-launch-instance-id|Launch instance id|launch-instance-id|APPLICATION_IFRAME_CONTRACT_VERSION_V2|APPLICATION_FRONTEND_SDK_CONTRACT_VERSION_V2|APPLICATION_IFRAME_QUERY_LAUNCH_INSTANCE_ID|EnvelopeV2|PayloadV2|BootstrapPayloadV2" \
  autobyteus-application-sdk-contracts autobyteus-application-frontend-sdk autobyteus-application-backend-sdk autobyteus-web autobyteus-server-ts applications/brief-studio applications/socratic-math-teacher \
  --glob '!**/node_modules/**'
pnpm -C autobyteus-server-ts exec vitest run tests/integration/application-backend/brief-studio-imported-package.integration.test.ts
```

Result: all passed; the targeted Vitest run reported 1 file / 3 tests passed.

## Docs Sync Status

- Docs sync result: Updated.
- Docs sync report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/iframe-launch-id-contract-refactor/docs-sync.md`
- Long-lived docs updated:
  - `autobyteus-application-sdk-contracts/README.md`
  - `autobyteus-application-frontend-sdk/README.md`
  - `autobyteus-application-backend-sdk/README.md`
  - `autobyteus-web/docs/applications.md`
  - `autobyteus-web/docs/application-bundle-iframe-contract-v3.md`
  - `autobyteus-server-ts/docs/modules/applications.md`
  - `autobyteus-server-ts/docs/modules/application_backend_gateway.md`
  - `autobyteus-server-ts/docs/modules/application_orchestration.md`
  - `autobyteus-server-ts/docs/modules/application_sessions.md`

## Finalization Record

- Archived ticket path: `tickets/done/iframe-launch-id-contract-refactor`
- Finalization target: `origin/personal`
- Ticket branch finalization: completed by committing/pushing `codex/iframe-launch-id-contract-refactor` and merging into `personal`.
- Release/version bump: explicitly skipped per user request.
- Dedicated ticket worktree/branch cleanup: completed after target push.

## Known Out-of-Scope / Residual Notes

- Full Electron packaged application run was not in scope for this validation round.
- Native installer/updater/restart lifecycle was not in scope.
- External third-party application packages outside this repository were not validated.
- Generated-output sourcemap warnings appeared in the targeted server integration test but did not fail execution and were accepted as non-blocking by code review.


## Later Release Inclusion

- Later release request date: 2026-04-25
- Release version/tag: `v1.2.83`
- Release notes artifact: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/restore-stopped-run-chat/release-notes.md`
- Release commit: `5f7a4e505776a2f27328ed8b20f02cb2d755c60b`
- Result: `Completed`; `personal` and `v1.2.83` pushed to `origin`, and release workflows completed successfully.
