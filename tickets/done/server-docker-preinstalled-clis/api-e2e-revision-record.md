# API/E2E Revision Record

Canonical investigation and execution report remain authoritative; this record indexes completed results.

## Revision Index
| Revision | Trigger | Related revisions | Prior result/confidence | Current result/confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer / implementation-handoff.md / initial round | SR-004, IR-001; ARCH-REV/CRR/DR N/A | N/A | Pass / 95.0% |

## API-REV-001 — Full production AGY/Grok packaging matrix
- Date: 2026-09-28. Trigger: implementation-handoff.md, Implementation Complete IR-001, direct Small/Low. Findings N/A; scenarios CASE-REPO, CASE-FAIL-CLOSED, CASE-AUTH-SCOPE, CASE-CACHE and BUILD/CLI/LIVE for default/zh × arm64/amd64.
- Initial baseline; no prior completed API result or confidence inferred. Approved basis SR-004 / AC-001–006; source implementation d312fb1cb, input HEAD58289e97e. Independent architecture/source review and delivery revisions N/A — not applicable.
- Durable additions: scripts/tests/server_docker_cli_smoke.py and scripts/tests/test_server_docker_cli_install_failures.py. No existing test deletion/update, no production source changes. 19 focused tests pass; full images pass offline native/default/login-shell and stale-home checks, normal server/browser/recreate checks. Fresh cache-buster reacquires both tools and refreshed image passes smoke.
- Linux arm64 native + amd64 emulated, default + zh; AGY1.2.12/Grok1.0.41/Codex0.157.1/Claude2.1.283, Node22.23.3, Ubuntu24.04.5. No credentials/inference/push/deployment.
- Prior failure resolution: None. Two interrupted builds resumed successfully, builder-context setup mismatch corrected; neither is a prior completed validation round.
- Canonical artifacts: api-e2e-coverage-investigation.md; api-e2e-execution-coverage-report.md; api-e2e-test-case-ledger.md; api-e2e-evidence/ logs and temporary probes. Reports carry commands, confidence categories, cleanup and exclusions.
- Prior result/confidence N/A; current Pass/95.0%; all 16 scoped cases Pass, no unresolved failure IDs or missing critical AC proof.
- Recommended recipient Delivery, Small/Low direct route; test review Not Required — direct low-risk route. Actual rule/dispatch confirmation recorded in execution report.
- Residual scope limits: mutable latest, amd64 emulation not native hardware; full noVNC UI/provider login/keyring/inference/Electron not tested. Task fixtures cleaned; exact tag removals and preserved shared build cache recorded in cleanup.log.
- Routing selection: get_handoff_rules matched direct Pass + Small/Low; exact recipient /delivery_engineer. Dispatch confirmation belongs to send_message_to result.
