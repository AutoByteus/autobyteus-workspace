# API/E2E Revision Record — AGY runtime

## Revision Index
| Revision ID | Triggering role / report / round | Related upstream revisions | Prior result / confidence | Current result / confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer CRR-002 Pass; API/E2E round 1 | SR-021, ARCH-REV-003, IR-003, CRR-002 | N/A / N/A | **Fail / 74%** |

## Revision Entries
### API-REV-001 — Real Team launch gate exposes unsupported AGY run-tree kind
- Trigger: CRR-002 source Pass at `575520264`; approved AC-001–010 and explicit user Team inter-agent parity gate.
- Baseline recorded because no prior completed API/E2E result or confidence exists. Prior failure resolution: **None**.
- Added durable `autobyteus-server-ts/tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts` (real GraphQL/WebSocket, not stub delivery). The final corrected test fails before member activation because shared current run-tree validation excludes `antigravity_cli` (`API-F-001`, AC-002). No durable test updated or removed. First fixture-only `refType` issue was corrected, and assertions were adapted to AGY `call_mcp_tool` shape.
- Rechecked focused server/web suites, live standalone exact restore/selected workspace/configured skill, scoped Team/Org MCP stub probes, fresh final-code browser DONE and denial reload controls, and non-AGY focused regression. Browser now directly confirms reloaded `DENIED`; DONE controls remain green with no invented shell exit. Team real recipient roundtrip, Team continuation and Org execution are not proven until launch repair.
- Canonical updated artifacts: `api-e2e-coverage-investigation.md`, `api-e2e-test-case-ledger.md`, `api-e2e-execution-coverage-report.md`; supporting `api-e2e-browser-live-evidence.json`, `api-e2e-standalone-workspace-live.json`, `api-e2e-skill-live.json`, `api-e2e-mcp-team-stub-live.json`, `api-e2e-mcp-org-stub-live.json`.
- Current result/confidence: **Fail / 74%** (post-repository 59%). Preliminary classification: **Local Fix**, implementation-owned; Code Reviewer to confirm failure origin. Recommended recipient: `/code_reviewer` subject to handoff rules. Remaining risk: actual AGY Team/Org launch, real member delivery, attribution and continuation; provider versions other than 1.2.10.
