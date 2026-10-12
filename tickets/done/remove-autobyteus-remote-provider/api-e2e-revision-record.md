# API/E2E Revision Record — remove-autobyteus-remote-provider

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer / `code-review-report.md` (CRR-001 Pass) / round 1 | SR-003, ARCH-REV-001, IR-001, CRR-001 | N/A | Pass / 95% |
| API-REV-002 | code_reviewer / `api-e2e-test-review-report.md` (CRR-002 Fail, TR-001 Local Fix) / round 2 | CRR-002 | Pass / 95% (test review: TR-001) | Pass / 95% |
| API-REV-003 | code_reviewer / `code-review-report.md` (CRR-005 Pass, IR-002 delta) / round 3 | SR-004, ARCH-REV-002, IR-002, CRR-003..CRR-005 | Pass / 95% | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline validation of the remote AutoByteus provider removal

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md`, round 1
- Triggering finding or case IDs: N/A (initial validation)
- Related revision IDs: SR-003, ARCH-REV-001, IR-001, CRR-001
- Why this baseline was recorded: first completed API/E2E result for the Large/High reviewed package
- Coverage decisions or durable test paths changed:
  - Added: `autobyteus-server-ts/tests/e2e/secret-management/removed-remote-provider-leftover-startup.e2e.test.ts`
  - Added: `autobyteus-server-ts/tests/e2e/run-history/removed-remote-provider-saved-selection-graphql.e2e.test.ts`
  - Updated: `autobyteus-server-ts/tests/e2e/token-usage/token-usage-provider-name-snapshot-backfill-startup.e2e.test.ts`
  - Updated: `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts`
  - Updated: `autobyteus-server-ts/tests/unit/application-platform/application-current-model-selection-policy.test.ts`
  - Updated: `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-model-display-projection.test.ts`
  - Removed: none (the remote-only tests deleted by IR-001 were confirmed stale)
- Cases added: REPO-001..008, API-E2E-002, 004A–D and UI, 005, 006, 007A–D, 008
- Commands, environment, fixture, or broader-validation delta:
  - Packaged isolated desktop instance with real LM Studio (`qwen/qwen3.6-35b-a3b`, local-model runs serialized at the user's request)
  - Docker remote-server image built from a validation-only Dockerfile (BAS-001)
  - Gated LM Studio in-process suite Blocked by BAS-002

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95% (94.9%; no category below 93%)
- New or remaining failure IDs: None
- Recommended owner: N/A (Pass → proportional test-code review by `code_reviewer`)
- Remaining risks, blocked evidence, or untested scope:
  - **OBS-001.** A pre-existing native stopped-run rule makes a run whose saved model is unavailable unresumable ("No models available"). Separate-ticket candidate.
  - **OBS-002.** A launch profile with a remote id is blocked with `CURRENT_MODEL_SELECTION_REQUIRED` wording.
  - **BAS-001.** The Dockerfiles miss two workspace contract packages (baseline).
  - **BAS-002.** The gated `agent-runtime-graphql` LM Studio suite harness is stale (baseline).
  - **Not tested.** Paid API-model inference and a real Ollama model.

### API-REV-002 — TR-001: stop pinning the pre-existing stopped-run replacement rule

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `api-e2e-test-review-report.md` (CRR-002), round 2
- Triggering finding or case IDs: TR-001 (Local Fix, test only); case API-E2E-004B
- Related revision IDs: CRR-002
- Why this revision was recorded: the saved-selection E2E asserted the unchanged rule "Both models need verified context capacities before replacement." That rule contradicts approved SCN-004 ("picks another model") and is unrelated to the removal.
- Coverage decisions or durable test paths changed: `autobyteus-server-ts/tests/e2e/run-history/removed-remote-provider-saved-selection-graphql.e2e.test.ts`. The `updateStoppedAgentRunModelConfig` reselection block, its comment and its header sentence were removed. AC-004 assertions kept: resume config shows the value; restore refused with `MODEL_IDENTIFIER_NOT_AVAILABLE`; metadata byte-identical; third start still lists the value and blocks.
- Cases rechecked: API-E2E-004A/B
- Commands, environment, fixture, or broader-validation delta: clean env `env -i PATH HOME=<tmp> TMPDIR ./node_modules/.bin/vitest run tests/e2e/run-history/removed-remote-provider-saved-selection-graphql.e2e.test.ts --no-watch` against the built dist (product source unchanged since the round 1 build). 2/2 pass. No product-code change; no other rerun needed.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| TR-001 (CRR-002) | Local Fix (API/E2E test code) | Resolved: reselection assertion removed; AC-004 assertions retained | `api-e2e-evidence/logs/server-e2e-saved-selection-tr001.log` |

- Canonical artifacts and sections updated: `api-e2e-execution-coverage-report.md` (meta, basis, ledger reconciliation, matrix, durable coverage, observations, result notes), `api-e2e-test-case-ledger.md` (event 26)
- Prior result and confidence: Pass / 95%
- Current result and confidence: Pass / 95%
- New or remaining failure IDs: None
- Recommended owner: `code_reviewer` (proportional re-review)
- Remaining risks, blocked evidence, or untested scope: unchanged from API-REV-001. OBS-001 stays a separate-ticket candidate for the Solution Designer. The leftover-startup media `runtime: 'api'` / `hostUrl: null` assertion may need to follow if the user folds the MultimediaRuntime cleanup into this ticket.

### API-REV-003 — IR-002 delta: single-valued MultimediaRuntime removed

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-005 Targeted Delta Review Pass), round 3
- Triggering finding or case IDs: CR-001 (Design Impact, resolved by IR-002); cases REPO-001..008 rechecked; API-E2E-009 added
- Related revision IDs: SR-004, ARCH-REV-002, IR-002 (commit 403eb2784), CRR-003, CRR-004, CRR-005
- Why this revision was recorded: the implementation changed after round 2 (MultimediaRuntime and the media runtime field deleted; Gemini gates reduced to the provider; server media rows emit the literal 'api').
- Coverage decisions or durable test paths changed: added `autobyteus-ts/tests/unit/multimedia/gemini-runtime-resolver-gate.test.ts` (no durable test covered the changed gate; the server media E2E mocks the factory). The combined `server-owned-media-tools.e2e.test.ts` (committed IR-002 hunk plus my uncommitted AC-004 case) was checked as consistent.
- Cases added, changed, removed, or rechecked: API-E2E-009 added; REPO-001..006 and REPO-008 rechecked on a fresh build.
- Commands, environment, fixture, or broader-validation delta: fresh core and server builds; core unit, tsc, server typecheck, server unit, server integration, and clean-env affected server E2E. Web, desktop, Docker and live inference were not rerun: no web, GraphQL-shape, entrypoint or native-LLM change.

#### Prior Failure Resolution

None. TR-001 was resolved in API-REV-002 and re-reviewed as Pass in CRR-004.

- Canonical artifacts and sections updated: `api-e2e-execution-coverage-report.md` (meta, Round 3 Delta, durable coverage, notes), `api-e2e-test-case-ledger.md` (events 27-31)
- Prior result and confidence: Pass / 95%
- Current result and confidence: Pass / 95%
- New or remaining failure IDs: None
- Recommended owner: `code_reviewer` (proportional test review for the round-3 test changes)
- Remaining risks, blocked evidence, or untested scope: unchanged (OBS-001 separate-ticket candidate; OBS-002; BAS-001; BAS-002; no paid API or Ollama inference).
