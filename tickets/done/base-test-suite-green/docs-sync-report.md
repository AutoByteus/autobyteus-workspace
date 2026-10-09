# Docs Sync Report

## Scope

- Ticket: `base-test-suite-green`
- Trigger: API/E2E validation PASSED (API-REV-001, round 1), direct route; `task_size=Medium`, `architectural_risk=Low`. Architecture review, source review and test-code review: `Not Applicable` (direct low-risk route).
- Bootstrap base reference: `origin/personal` @ `ebf68c4af8e5fe2e6d893afcf75b0269b2c1ef65`
- Integrated base reference used for docs sync: `origin/personal` @ `048ea6cecb3f1999d4201be5b995157a8007d8e7`, merged into `codex/base-test-suite-green` as `626ebee4cf17b6fbc92fbd635fc4d9ed9ae13a71`
- Post-integration verification reference: `evidence/delivery/post-integration-summary.txt` (typecheck, `test:unit`, `test:integration` on `626ebee4c`)

## Why Docs Were Updated

- Summary: The ticket adds three documented server scripts (`test:unit`, `test:integration` with a prerequisite check, `test:integration:prepare`), repoints `typecheck` at the production compilation unit, and installs per-file environment isolation for unit/integration tests. Implementation already added the canonical TESTING.md section and a README pointer. Delivery found that the server-package `AGENTS.md` (what agents read first) still recommended the raw `vitest run tests/integration` command, which skips the new prerequisite check. It also did not mention the baseline, `test:unit` or `typecheck`.
- Why this should live in long-lived project docs: every ticket agent proves "no regression" against these suites (TESTING.md Rule 9). The exact commands, prerequisites, isolation contract, typecheck scope and the known exception must be discoverable without ticket artifacts.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `TESTING.md` | Canonical testing guideline; layer table and the new "Server unit and integration baseline" section | No change (updated by implementation, verified by delivery) | Commands match `autobyteus-server-ts/package.json`. Isolation, allowlist, opt-in gates, typecheck scope and the PB-001 known exception all match the validated state. |
| `autobyteus-server-ts/README.md` | Server test section | No change (updated by implementation, verified by delivery) | Points to the TESTING.md anchor with the four commands |
| `autobyteus-server-ts/AGENTS.md` | Agent-facing server test commands | Updated by delivery | Raw integration command replaced by the documented scripts; added unit/typecheck and a TESTING.md pointer |
| `AGENTS.md` (root) | Points at DESIGN.md / TESTING.md | No change | Generic pointer, still accurate |
| `DESIGN.md` | Design principles | No change | No design-principle impact (test infrastructure only) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `TESTING.md` | New section + 2 layer-table rows (implementation commit `2613322c7`) | Baseline commands, integration prerequisites, environment isolation and allowlist, opt-in gates, typecheck scope, known exception PB-001 | REQ-008 |
| `autobyteus-server-ts/README.md` | Pointer (implementation) | Four commands + link to TESTING.md section | REQ-008 |
| `autobyteus-server-ts/AGENTS.md` | Command correction (delivery) | `test:unit`, `test:integration:prepare`, `test:integration`, `typecheck`, TESTING.md link | Stale raw command bypassed the prerequisite check |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Integration prerequisites | `test:integration` checks build outputs and exits early with one message. `test:integration:prepare` builds them. SDK/Brief Studio `dist/` is untracked. | design-spec DS-002, implementation-handoff | TESTING.md |
| Test environment isolation | `tests/setup/test-environment-isolation.ts` strips inherited env for unit/integration. New opt-in gates must be added to `TEST_ENVIRONMENT_ALLOWLIST`. E2E keeps the inherited env. | design-spec, DEC-003 | TESTING.md |
| Typecheck scope | `tsc -p tsconfig.build.json --noEmit`. Test files are not type-checked yet (separate follow-up). | DEC-001 A | TESTING.md |
| Known exception PB-001 | 2 content-cadence cases in `agent-status-websocket.integration.test.ts` fail because of a product defect. They are not skipped. Remove the note when fixed. | api-e2e-execution-coverage-report, evidence v13a–c | TESTING.md |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `typecheck` = `tsc -p tsconfig.json --noEmit` (TS6059, never checked types) | `tsc -p tsconfig.build.json --noEmit` | TESTING.md "Typecheck scope" |
| Raw `vitest run tests/integration` as the agent-facing integration command | `test:integration:prepare` + `test:integration` | TESTING.md, server README, server AGENTS.md |

## No-Impact Decision

- Not applicable (docs updated).

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, then hold for explicit user verification.
- Notes: Historical ticket notes under `autobyteus-server-ts/tickets/**` that mention the old TS6059 typecheck failure are archived records and are intentionally left unchanged.
