# Handoff Summary

## Status

- Delivery revision: `DR-010`
- Ticket: `token-usage-one-row-per-agent-run`
- State: `Complete — ticket finalized, main personal rebuilt, and deferred
  cleanup completed`
- Validated chain: `SR-012` / `ARCH-REV-012` / `IR-011` / `CRR-019` source
  Pass / `API-REV-008` Pass at `97.9%` / `CRR-020` durable-test Pass.
- Historical DR-007 package: `Stale; do not use`. Its audit projection/compactor
  behavior was withdrawn under SR-010.
- Accepted residual: two old successful oversized summaries and the roughly
  `31 MB` migration-status response remain unchanged for separate future scope.
- Explicit user verification: `Pass`.
- Ticket disposition: archived in `tickets/done`.
- Repository finalization: complete; results are recorded in
  `release-deployment-report.md`.
- Deferred cleanup: complete; the old DR-008 process, ticket worktree, local
  ticket branch, and remote ticket branch are gone.

## Fresh Main-Repository Electron Package

- DMG:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.dmg`
- DMG SHA-256:
  `a17dea464b31150908aaf3e47634375fa278b336389e3f1bc74c2ae0d79bf211`
- ZIP fallback:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.zip`
- ZIP SHA-256:
  `69b442579c2aa6d3be7d45bcbb06a4637860cf9376a8f3a48acc1364bc3d5070`
- Platform/version: personal macOS ARM64, `1.4.52`.
- Signing: intentionally local unsigned/ad-hoc package; not notarized and not a
  public release candidate. Finder may require **right-click -> Open**.
- Direct app path for the user's local run:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`.

## What This Candidate Contains

- The reviewed one-current-row-per-AgentRun Token Usage implementation and its
  production-safe nullable Prisma/SQLite migration decoding.
- The generic server-owned migration recovery action:
  `MANUAL_RETRY`, `RESTART_TO_RETRY`, or `NONE`.
- `canRetry=true` only for an executable manual retry.
- Non-null GraphQL/Pinia transport of the server action.
- Exact localized English/zh-CN restart guidance for restart-only recovery,
  with Retry disabled and no manual mutation dispatched.
- Ordinary startup remains the executor for eligible failed/stale required
  startup-only migrations; direct manual startup-only execution remains
  rejected.

This package deliberately does **not** contain the withdrawn audit summary
projection, audit compactor, log-rewrite behavior, or its removed durable test
matrix. It does not promise to bound or repair the already-successful oversized
historical migration-status payload.

## Integration And Package Evidence

- Finalized build commit:
  `personal@d61183c9bc9d9a94277a50fbf64d479ab9f88c30`.
- Latest tracked remote: `origin/personal` is identical; divergence `0 / 0`;
  fast-forward-only refresh required no merge.
- Build location: directly in the main repository requested by the user.
  Existing stale ignored `electron-dist` outputs were removed first.
- Build evidence:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/delivery-evidence/34-electron-build-main-personal-dr010-summary.log`
- Integrity evidence:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/delivery-evidence/35-electron-package-integrity-main-personal-dr010.log`

The build passed web/localization guards, integrated server preparation/build,
Electron generation/transpilation, and DMG/ZIP generation. Integrity passed for
DMG/mounted payload, ZIP, bundle ID/version/ARM64, embedded server entry,
packaged runner recovery markers, absence of both withdrawn audit owners,
Prisma ARM64 engine, terminal spawn, zero broken symlinks, and updater hash/size
consistency. Delivery did not launch the new main-repository package. No
delivery check accessed or mutated the live database/profile.

## Accepted User Verification

The user explicitly confirmed the current DR-008 result and directed delivery
to finalize. Read-only verification of the exact running package reported REST
and GraphQL health HTTP 200, SQLite `quick_check=ok`, all relevant migrations
`SUCCEEDED`, public recovery `NONE` / `canRetry=false`, `0` legacy rows,
`1,287` current rows across `1,287` distinct nonblank run IDs, no duplicate IDs,
compact-state bounds within limits, and current task/model Token Statistics.
No live data was mutated. Evidence:
`delivery-evidence/31-dr009-user-verification-and-finalization-refresh.log`.

## Safety And Finalization Authorization

- The successful one-row token consolidation remains intact.
- Do not truncate, compact, or rewrite historical audit rows/logs.
- Do not use DR-007 or an older Electron artifact for current acceptance.
- Explicit approval has been received. Delivery refreshed `origin/personal`
  and confirmed that it did not advance beyond the user-verified candidate.
- Ticket archival plus ticket-branch and `personal` repository finalization are
  complete. No version bump, tag, public release, or deployment was requested.
- Ticket branch commit:
  `73eab531e43c3b4b13ed0c39266672718b6bccab`; `personal` merge commit:
  `e4f41e398e234f58e2687639763ee5c0cc028539`.
- Finalization evidence:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/delivery-evidence/33-dr009-repository-finalization.log`.
- Cleanup is complete. The old DR-008 process was stopped after the replacement
  main-repository package passed integrity; the ticket worktree, local ticket
  branch, and remote ticket branch were removed and their absence verified.
- Cleanup evidence:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/delivery-evidence/36-ticket-worktree-branch-cleanup-dr010.log`.

## Canonical Cumulative Package

- Requirements and investigation:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/requirements.md`;
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/investigation-notes.md`
- Design and supplements:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/design-spec.md`;
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/token-usage-data-model-analysis.md`;
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/data-migration-conventions.md`;
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/solution-revision-record.md`
- Architecture review:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/design-review-report.md`;
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/architecture-review-revision-record.md`
- Delivery rework/gap history:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/delivery-rework-record.md`;
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/delivery-requirement-gap.md`
- Implementation:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/implementation-handoff.md`;
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/implementation-revision-record.md`
- Code review:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/code-review-report.md`;
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/code-review-revision-record.md`
- API/E2E:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/api-e2e-coverage-investigation.md`;
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/api-e2e-execution-coverage-report.md`;
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/api-e2e-revision-record.md`;
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/api-e2e-test-review-report.md`
- Delivery:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/docs-sync-report.md`;
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/handoff-summary.md`;
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/release-deployment-report.md`;
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-usage-one-row-per-agent-run/delivery-revision-record.md`
