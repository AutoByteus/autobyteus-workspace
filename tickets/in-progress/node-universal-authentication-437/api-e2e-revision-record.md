# API/E2E Revision Record — node-universal-authentication-437 (autobyteus-437)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-002 Pass, round 1 | SR-006, ARCH-REV-003, IR-002, CRR-002 | N/A | Fail / 81% |
| API-REV-002 | Code Reviewer, `code-review-report.md` CRR-004 Pass on IR-003, round 2 | IR-003, CRR-003, CRR-004 | Fail / 81% | Pass / 95% |

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

### API-REV-002 — Round 2: the three failures re-proven fixed; every probe carries a credential; fresh-start build

- Triggering role, report path, and round: Code Reviewer (`code_reviewer_7e5608ab9b4746e0b613d7ffe65be112`), `code-review-report.md` CRR-004 (Pass on IR-003), API/E2E round 2, HEAD `32e9ad944c`
- Triggering finding or case IDs: API-REV-001 F-1, F-2, F-3, O-1, O-2; open API-16, API-FS
- Related revision IDs: IR-003, CRR-003, CRR-004
- Why this revision was recorded: rerun after the fixes; close the open items
- Coverage decisions or durable test paths changed: `fixtures/probe-node-access.mjs` gains `withNodeCredential` and `attachToProbeProcess`; 34 more probes and `large-runs-load-less-cases.mjs` carry the credential (`fa6ec192a0`); baseline test fix in `agent-org-role-labels-probe.mjs` (`8cac59f2d4`); `memory-search-probe.mjs` waits for its highlighted lines (`d115fd9c71`)
- Cases added, changed, removed, or rechecked: rerun API-00, API-01 (partial), API-15, API-03, API-08, API-05, 06, 07, 09, 10; new API-16, API-16-base, API-FS; still valid API-02, 04, 11, 12, 13, 14b (reasons in the investigation's Round 2 Rerun Plan)
- Commands, environment, fixture, or broader-validation delta: base `b690a5dfdb` built in a temporary worktree for four probe failures and an A/B timing check; probes with a seed mode run seed-then-measure with small seeds; fresh clone with `pnpm install --frozen-lockfile` and the release job's build

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-1 `pnpm dev` window WebSockets (API-15) | Local Fix | fixed (CR-003, Nitro `devProxy`) | API-15 r2; IR003-08 |
| F-2 workspace file search aborted (API-03 MSP-08) | Local Fix | fixed (CR-004) | API-01 r2, API-03 r2; IR003-05 |
| F-3 held-back Memory Sync card (API-08 NVP-05) | Local Fix | fixed (CR-005) | API-08 r2; IR003-05, IR003-07 |
| O-1, O-2 wording | observation | fixed (0c755805d3) | IR003-13, IR003-11 |
| O-3 numbered name on a pairing clash | observation | accepted as is (CRR-004) | — |

- Canonical artifacts and sections updated: investigation (meta, Round 2 Rerun Plan, planned cases), execution report (rewritten for round 2 with the round 1 cases kept), test progress log, `follow-ups.md` (FU-003, FU-004), evidence (`R2-*`, `API-16-*`, `API-FS-*`)
- Prior result and confidence: Fail, 81%
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none in scope; pre-existing FU-003 (SIR-002), FU-004 (IP-03, RSW-01, WEB-002)
- Recommended owner: Code Reviewer (test-code review)
- Remaining risks, blocked evidence, or untested scope: AC-008 from a second physical device (user); Windows launcher runtime; an executed in-place node update; 7 live probes migrated but not run (paid inference / signed-in CLIs); release signing and the other OS jobs
