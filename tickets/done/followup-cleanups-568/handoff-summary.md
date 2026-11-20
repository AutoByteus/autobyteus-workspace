# Handoff Summary — followup-cleanups-568 (autobyteus-568)

## Summary Meta

- Ticket: `followup-cleanups-568` (Project Task `autobyteus-568`): five follow-up cleanups.
- Date: `2026-11-20`
- Classification: `task_size: Medium`, `architectural_risk: Low`; route `Direct Low-Risk` (IR-001 → API-REV-001 Pass 95% → DR-001); test-code review `Not Required`.
- Current Status: `Verified from evidence / finalized on personal; no release`.
- Branch: `codex/followup-cleanups-568`, base `01ebb4ddce`; code `eb7e4bf2af`; base refresh `32ab4e0f6a` merged as `7fa18bd894`.

## Delivery Summary

- **Dead GraphQL removed:** the server's `approveToolInvocation` mutation (tool approval stays on the WebSocket, `APPROVE_TOOL`), and the web's `ApproveToolInvocation`, `RestoreAgentRun` and `GetAgentRunCollaborationMemberProjection` documents with their generated types and the demo's three unreachable entries.
- **Three flaky tests fixed:** the Electron port-owner deadline test's fake `lsof` (from 279 FU-003); the iOS migration-boundary test under a symlinked path (279 FU-005); the Basics panel test (279 FU-006).
- **One iOS simulator chooser** (`select-ios-simulator.py`, 571 FU-001) for the release workflow and the smoke script, enforced by the contract check.

## Verification Summary

- Verified from evidence by delivery; no user check needed.
- `evidence/api-e2e/API-01-schema.log`: the built server answers the removed mutation "Cannot query field \"approveToolInvocation\" on type \"Mutation\"."; `E2E-01-ws-approval.log`: approvals over the WebSocket pass (1/1); `FS-DOCKER`, `FS-DESKTOP` (fresh clones) pass. (AC-001)
- `DL-01-deadline-x10.log`: the deadline case 10/10 at load ~72. (AC-002)
- `IOS-01.log`: a clone at `/tmp` (physical `/private/tmp`): core 56/56 incl. the boundary test; smoke 8/8 through the chooser. (AC-003, AC-005)
- `WEB-01-basics-spec.log`: 2/2. (AC-004)
- `CH-01-chooser-real-simctl.log` and `GH-01-run-44747687988.log` (build-only, `xcode-27-arm64`): "Selected simulator: iPhone 17 (iOS 27.2)"; core 56/56, smoke 8/8; publish jobs skipped. (AC-005)
- Merged state (`evidence/delivery/`): install exit 0; both typechecks PASS at their baselines (server 1006 in 315, web 86 in 36 after the base); server tests 25/25 (`agent-run.test.ts`, the base's folder-watcher test); web 14 files 101/101 (Basics panel, the base's workspace components, `demo/`, `scripts/__tests__`) and the Electron deadline spec 11/11; `build:mobile-web --demo` ("The demo answers all 249 compiled operations") and `build:mobile-web` ("The /mobile build holds no demo code."); `codegen:check` current; the iOS contract check passed.

## Residual Risks For The User

- FU-003: an untouched Electron screenshot-capture timing test can fail on a busy machine.
