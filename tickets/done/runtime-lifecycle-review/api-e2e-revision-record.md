# API/E2E Revision Record — runtime-lifecycle-review

The latest coverage investigation (`api-e2e-coverage-investigation.md`) and execution coverage report (`api-e2e-execution-coverage-report.md`) remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-002 Pass → API/E2E round 1 | SR-010, SR-011, SR-012; ARCH-REV-002/003; IR-001, IR-002; CRR-001, CRR-002 | N/A | Pass / 95.3% |
| API-REV-002 | Delivery engineer, request for more evidence (DR-001), round 2: the user's real accounts | DR-001; CRR-003 | Pass / 95.3% | Pass / 97.1% |

## Revision Entries

### API-REV-001 — Baseline: GraphQL e2e, live running-agent count, real-stack browser probe

- Triggering role, report path, and round: code reviewer (`code_reviewer_064191c97ef649089bdbc6f42050e984`), `code-review-report.md` round 2 (CRR-002, 9.4/10)
- Triggering finding or case IDs: handoff "Downstream Coverage Hints"; CR-001 (Claude signed out = JSON + exit 1), CR-002 (count error refuses Update), CR-003/SR-012 (width switch)
- Related revision IDs: SR-010…SR-012, ARCH-REV-002/003, IR-001/IR-002, CRR-001/CRR-002
- Why this baseline was recorded: first API/E2E result for the package
- Coverage decisions or durable test paths changed: added `tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts`, `tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts`, `tests/e2e/helpers/agent-runtimes-e2e-harness.ts`, `tests/fixtures/agent-runtimes-fake-cli.mjs` (server); `tests/e2e/agent-runtimes-settings-probe.mjs`, `tests/e2e/fixtures/agent-runtimes-vendor-sources.mjs`, `package.json` script `test:e2e:agent-runtimes-settings` (web)
- Cases added, changed, removed, or rechecked: API-00, API-01, API-02, API-10, API-11, API-12, API-20, API-21 run; API-R1…R4 reused; API-30 not run (it would read the user's real accounts)
- Commands, environment, fixture, or broader-validation delta: baseline (see the report's environments ENV-1…ENV-6)

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation (all; API-12/API-21 added, API-30 decision, ambiguities), report (all), `follow-ups.md` (FU-006), evidence `evidence/api-e2e/`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.3% (no category below 95%)
- New or remaining failure IDs: none
- Recommended owner: code reviewer (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope: user-only parts of AC-001, AC-003, AC-006, AC-007 and AC-010 (real desktop, a real update, real signed-in outputs incl. Grok, `codex login` / `grok login --oauth` browser hand-off and completion, a real remote node window); the SR-012 wording observation (table starts at a 1252 px window); FU-006.

### API-REV-002 — Real accounts on the real desktop app

- Triggering role, report path, and round: delivery engineer (`delivery_engineer_ad7f58889f9d49f59a8215e32c7c26ea`), DR-001; round 2
- Triggering finding or case IDs: the user's decision (2026-10-20): API/E2E uses his real accounts, with no vendor-home or command overrides and no fake CLIs; the parts left "Only The User Can Check" in round 1
- Related revision IDs: DR-001, CRR-003
- Why recorded: new evidence round on the merged branch `0c27f0a3b5`; Agent Runtimes code unchanged since `52aa663edd`
- Coverage decisions or durable test paths changed: none; this round is live evidence only (no durable test depends on the user's accounts)
- Cases added: API-40…API-45 (ENV-7: isolated desktop instance of this worktree's build with the user's real HOME, PATH, installs and accounts; separate AutoByteus data root only). API-30 superseded
- Commands, environment, fixture, or broader-validation delta: `pnpm --silent isolated-app start --from-worktree` (the packaged app from `--build`; the release-zip step was stopped as unnecessary); the user clicked Update (Claude) and signed out / signed in (Codex, Grok) himself

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: execution report (Round, environments ENV-7, Cases API-40…45, Acceptance-Criteria Proof, confidence, result); evidence `evidence/api-e2e-real/`
- Prior result and confidence: Pass, 95.3%
- Current result and confidence: Pass, 97.1%
- New or remaining failure IDs: none
- Recommended owner: delivery engineer
- Remaining risks, blocked evidence, or untested scope: AC-010 in a real remote/Docker node window (renderer gate proven by API-20). The user's real Claude install is now 2.1.304 (changed by the validated Update).
