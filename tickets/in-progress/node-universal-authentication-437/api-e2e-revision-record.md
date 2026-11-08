# API/E2E Revision Record — node-universal-authentication-437 (autobyteus-437)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-002 Pass, round 1 | SR-006, ARCH-REV-003, IR-002, CRR-002 | N/A | Fail / 81% |

## Revision Entries

### API-REV-001 — Baseline: real-surface validation of slice 1; three preserved behaviors broken

- Triggering role, report path, and round: Code Reviewer (`code_reviewer_7e5608ab9b4746e0b613d7ffe65be112`), `tickets/in-progress/node-universal-authentication-437/code-review-report.md` CRR-002, API/E2E round 1, HEAD `b6a57ab154`
- Triggering finding or case IDs: the handoff's "Still Required" list (probes, Electron, Docker, phone, real network, pwsh, gateway)
- Related revision IDs: SR-006, ARCH-REV-003, IR-002, CRR-002
- Why this baseline was recorded: first API/E2E result
- Coverage decisions or durable test paths changed: new `autobyteus-web/tests/e2e/fixtures/probe-node-access.mjs`; seven probes updated (mobile-shell, remote-run-title, remote-runs-in-tree, model-routing-decisions, node-vocabulary, remote-nodes-page, nodes-docker-address); new launcher test for `--allow-local-network` across `upgrade --all`
- Cases added, changed, removed, or rechecked: R-IMP (reused), API-00…API-15 run; API-FS and API-16 not tested (reasons in the report)
- Commands, environment, fixture, or broader-validation delta: isolated packaged instances; test-owned Docker image with this worktree's server package; guarded docker wrapper; real LAN/Tailscale addresses; nginx and pwsh in throwaway alpine containers; a base build in a temporary worktree to find F-2's cause

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/`
- Prior result and confidence: N/A
- Current result and confidence: `Fail`, 81%
- New or remaining failure IDs: F-1 (`pnpm dev` window WebSockets, API-15), F-2 (workspace file search aborted by the gate's async `preValidation` hook, API-03 MSP-08), F-3 (Memory Sync held-back card shows "status code 503", API-08 NVP-05)
- Recommended owner: implementation engineer (`Local Fix`), after failure-origin review by the Code Reviewer
- Remaining risks, blocked evidence, or untested scope: API-FS (after the fixes), API-16 (36 probes without a credential; API/E2E-owned), AC-008 second physical device (user), executed in-place node update, Windows launcher runtime; observations O-1…O-3
