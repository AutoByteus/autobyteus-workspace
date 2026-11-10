# Handoff Summary

## Summary Meta

- Ticket: `server-e2e-node-credential-447` (Project Task `autobyteus-447`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Date: `2026-11-10`
- Classification: `task_size: Medium`, `architectural_risk: Low`, route `Direct Low-Risk`. Architecture review, source code review and test-code review: `Not Applicable`. CRR-001 was a failure-origin review only.
- Current Status: `Verified from evidence / finalized on personal; no release`
- Branch: `codex/server-e2e-node-credential-447`. Base `origin/personal` @ `310fc27452` at bootstrap. Integrated by merge twice: `f78b60dddd` (`5c29d6fca2`, DR-001) and `aae0a53a81` (`b770635ea3`, DR-002, records only).

## Delivery Summary

- Delivered scope (test code and docs only, no product code):
  - Every server E2E suite reaches its test-owned node as the desktop app does, with the launch owner credential, and reaches the MCP gateway with the gateway token. The 15 default-run files that had failed since autobyteus-437 pass.
  - The server test setup installs the credential attachment before any test code. Each other way of reaching a node has one path: `startStudioE2eRuntimeServer`, an explicit header on `fastify.inject`, `builtServerLaunchEnvironment()` for a spawned node (a fixture child that calls its node attaches the credential itself), and `connectMcpGatewayClient`.
  - A guard test (`tests/architecture/e2e-node-credential-paths.test.ts`) fails a directly composed node or a bare gateway client, naming the file, the cause and the helper.
  - New durable test `tests/e2e/mcp/mcp-gateway-token.e2e.test.ts`: the gateway refuses the owner credential, no token and a wrong token, and admits the helper's token.
  - SR-002 fixes the failures found along the way:
    - E-002 follows autobyteus-455: the Daily Assistant is an `@` candidate; the Model Router and the retired manager are not.
    - RPE-001/003/006 follow autobyteus-95's personal settings.
    - DCF's capsule lookup (one shared helper, `helpers/agy-run-capsule.ts`) skips a capsule that is not complete yet.
    - DCM-009 prints the whole stop result.
- Docs: TESTING.md "Node credentials" (one path per form, the guard, the fixture child rule) and "Choosing the path" (whole server E2E suite for node gate, credential, gateway token or shared-harness changes); `docs/design-cases.md` Case 2.
- Unchanged: the node gate, the gateway token rules and every refusal (node access model suites pass); web probes and release smoke.

## Verification Summary

- Verified from evidence (delivery's judgement; no user check needed). AC-001…AC-010 are directly proven. Final confidence is 95%, with no category below 95% (API-REV-003).
- Key evidence:
  - `evidence/delivery/DEL-05-full-e2e-integrated-r2-summary.log`: the whole server E2E suite on the final integrated state, `Test Files 123 passed | 124 skipped (247)`, 0 failed, 0 gateway-token refusals, 0 secrets.
  - `evidence/implementation/IMP-17-full-e2e-summary.log` (same code).
  - `evidence/implementation/IMP-18-gated-agy-set-summary.log` (60 gated files: RPE, DCF, DCM, daily-assistant pass; 2 load-only failures, FU-005/FU-006).
  - `evidence/api-e2e/API-07-mcp-gateway-token-e2e.log`.
  - `evidence/api-e2e/API-08-guard-planted-file.log`.
  - `evidence/api-e2e/API-10-scripted-agy-gated-all-summary.log` (0 credential/token refusals in the gated suites).
  - `evidence/api-e2e/API-11-codex-native-fixture-probe.log`.
  - `evidence/api-e2e/API-15-agy-capsule-lookup-probe.log`.
- Secret Gate PASS on the ticket commits and on the merged state; artifact hygiene PASS.

## Residual Risks For The User

1. The live Codex part of the gated Codex native policy suite and the other paid live suites were not run (Non-Goal; you asked for no Codex calls today). They use the same credential mechanism the deterministic suites prove.
2. DCM-009's original cause is unknown: it did not recur in 3 load runs. The assertion now prints the whole stop result if it fails again.
3. Fixture child processes are not statically guarded (approved Non-Goal); TESTING.md and the fixture's own message name the fix.
4. Follow-ups (`follow-ups.md`), sent by the Solution Designer:
   - FU-001: whether every ticket or release runs the full server E2E suite (your decision).
   - FU-005: EXC-E2E-004, a possible Task delegation race under load.
   - FU-006: `task-copy-idle-lifetime` under load.
   - FU-002…FU-004 were fixed in this ticket.

## Delivery Documents

- `docs-sync-report.md`, `release-deployment-report.md`, `delivery-revision-record.md` (this folder). Release notes: not required (no release; test harness only).
