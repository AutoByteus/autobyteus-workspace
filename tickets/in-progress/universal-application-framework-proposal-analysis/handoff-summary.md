# Handoff Summary — Universal Application Dual-Host Foundation

## Current Status

- Delivery status: **Ready for explicit user verification**
- Current delivery revision: `DR-002`
- User-verification readiness: **Ready; verification not yet received**
- Ticket branch: `codex/universal-application-framework-proposal-analysis`
- Integrated candidate anchor: `f99f71a3cb3e5c11e3a87439570c661bf350e875`
- Reviewed production source: `dbdab1b311b558bd3d40e8e7c4feaac87fe1af97` (`IR-015`)
- Latest tracked base included: `origin/personal` at `1b8d8c2f22c5f846dd82cdd706f594103d1b4e1e`
- Candidate form: anchor commit plus preserved, intentionally uncommitted API/E2E test/report/evidence and delivery documentation delta shown by `git status`

## Authoritative Gates

- Implementation source review: `CRR-026` **Pass**, `96/100`.
- API/E2E: `API-REV-010` **Pass**, `98.3%`; every applicable category at least `97%`.
- Proportional durable-test review: `CRR-027` **Pass**; the only later durable path is one atomic-metadata scenario in `autobyteus-application-devkit/tests/application-devkit.test.mjs`.
- `DR-001`: resolved in `IR-014` and execution-confirmed by `API-REV-009`; the integrated event pipeline remains quiescent on stop and reopens only through explicit reset.
- `APIE2E-PARITY-005` / `APIE2E-F008`: resolved by `IR-015` and `API-REV-010`.
- Historical `APIE2E-REPO-005`: separate `Unclear` repository-test debt, not attributed to this implementation and not used as requirement evidence.

## Latest-Base Integrated State

- DR-001 protected the reviewed package in checkpoint `ddf7fe3117221d178f0c6af1825bcb708031d73c` and merged the then-latest `origin/personal` as `3b8afa366a4a35a1a31340e7b21bc8f219cd9d8e`.
- Rework and review advanced the ticket branch to `f99f71a3cb3e5c11e3a87439570c661bf350e875`.
- Delivery fetched `origin/personal` again on 2026-07-30. It remains `1b8d8c2f22c5f846dd82cdd706f594103d1b4e1e`, is the merge base, and has `0` commits missing from the candidate (`HEAD...origin/personal = 62/0`).
- Because no new base commit was integrated after current API/E2E execution, no redundant delivery rerun was needed. `API-REV-009` supplies integrated lifecycle/live-host evidence and `API-REV-010` supplies current atomic-package parity evidence.
- Record: `evidence/delivery/dr-002-base-refresh-and-integrated-state.log`.

## Delivered Behavior

- One application package runs through Studio and a selected-application standalone host over the same `ApplicationPlatformRuntimeGraph`.
- Host-neutral frontend startup and same-origin standalone bootstrap/backend/WebSocket surfaces coexist with the Studio iframe transport.
- Complete bundle-owned launch defaults remain portable; Studio stores only sparse overrides, supports no-write resource previews, preserves invalid overrides, and resets explicitly to package defaults.
- Application Agent Tools sessions bind to the exact graph publication port; general process sessions remain separate. Standalone exposes the internal session route but not Studio's external MCP gateway.
- Graph shutdown blocks admission, drains communications/workers, stops teams before remaining agents, revokes graph sessions, closes publication, and cleans owned listeners/processes.
- Devkit watched packing is atomic: validation occurs in staging, metadata names the canonical final package root, rename publishes, rollback preserves the prior package, and successful paths leave no scratch residue.
- Real standalone and Studio flows prove authenticated `publish_artifacts`, recipient-name `send_message_to`, writer handoff, journal/relay/application projection, explicit Studio remount, package immutability, restart recovery, session separation, and complete owned cleanup without direct-file/SQLite workaround credit.

## Documentation Sync

Delivery synchronized long-lived documentation for:

- dual-host composition and standalone surface ownership;
- launch baseline/preview/override/effective meanings and explicit reset;
- graph/process Agent Tools session authority and shutdown order;
- atomic package staging, canonical metadata, rollback, and immutable host input; and
- maintained external/sample developer commands and host-neutral SDK contracts.

Canonical report: `tickets/in-progress/universal-application-framework-proposal-analysis/docs-sync-report.md`.

## Suggested User Verification

Review the candidate and, if desired, exercise the supported product paths:

1. From a maintained application folder, run `pnpm dev` and confirm the standalone app loads and remains functional across a watched rebuild/restart.
2. Run `pnpm dev:studio`, enter the same app in Studio, then use explicit **Reload application** after a watched rebuild.
3. Confirm package defaults are runnable without copied Studio state, a Studio override can be previewed/saved, and reset reveals package defaults.
4. Confirm an application agent can publish an artifact and hand work to a named writer, with the application projection updating in both hosts.

The automated package already records passing real-host evidence for these paths. The required user action is an explicit response approving/completing verification for this candidate, or a concrete issue report.

## Remaining Risks / Non-Blockers

- `APIE2E-REPO-005` is historical mixed-validity repository-test debt and remains outside the requirement-linked delivery gate.
- Failure-only atomic staging scratch can persist until caller/harness cleanup; the failure probe verified rollback and removed it. Successful supported commands left no scratch.
- Package import remains prebuilt-only, not a sandbox guarantee; marketplace-grade trust/permission enforcement remains outside this foundation scope.

## Finalization Hold

- Ticket remains under `tickets/in-progress/`.
- No final ticket commit, ticket-branch push, target-branch refresh/merge/push, tag, release, publication, deployment, archival, or worktree/branch cleanup has been performed.
- After explicit user verification, delivery will refresh `origin/personal` again. If it has advanced or the verified state materially changes, delivery will re-integrate, rerun required checks, update artifacts, and request renewed verification before finalization.
