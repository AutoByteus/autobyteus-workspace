# API/E2E Execution Coverage Report

## Latest Authoritative Result
**Fail — API-ENV-001 execution-environment safety finding**, round 1 / **API-REV-001**. Final confidence **92.1%**, not the 95% clean target; environment category **75%**. The Antigravity functional checks passed, but this is not a clean validation/release sign-off. No AGY source defect identified. Preliminary classification **Local Fix, API/E2E-owned environment/execution**; request focused failure-origin review, including unresolved impact of initial production SQL connection. Do not send to Delivery as Pass.

## Round Meta / Cumulative Authority
Date 2026-09-27. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-runtime-missing`, branch `codex/antigravity-runtime-missing`. Source f590519ec, implementation handoff 95637e21d. Approved SR-003 / initial IR-001. Prior API result/confidence **N/A**, not inferred from absence.
Canonical files in this same ticket: requirements-doc.md, investigation-notes.md, design-spec.md, solution-revision-record.md, solution-handoff.md, implementation-handoff.md, implementation-revision-record.md; factual supplements under evidence, listed by upstream investigation. API authorities: api-e2e-coverage-investigation.md, api-e2e-test-case-ledger.md and api-e2e-revision-record.md. Independent architecture/source reviews and revision records **N/A — not applicable**; no triggering CRR/DR or Product supplement.
Classification carried **Medium / Low**, Direct Low-Risk. Successful-output test review would be **Not Required — direct low-risk route**; current Fail is a different, focused failure-origin review route.

## Investigation / Execution Basis
Upstream full current package and project instructions read; test validity decisions written before durable edits. A persistence-command error (`python` absent) caused API-001 to start before the initial investigation/ledger file write succeeded; replayed with python3 while it ran, before results or any test edit. This deviation is explicitly recorded, not represented as strict pre-execution initialization. All completed case results were then checkpointed before subsequent cases; startup and long-running live/browser checkpoints retained. No interrupted/unstarted planned case remains. No source implementation changes.

## Ledger Reconciliation / Requirement Matrix
Evidence paths below relative to `evidence/api-e2e/` in this ticket. Ledger is the complete command/checkpoint history.
| Case | AC / boundary | Final functional result | Evidence / limitation |
| --- | --- | --- | --- |
| API-001 | AC-001/003/004/005; discovery subprocess, capsule, factory, lifecycle | Pass | narrow.log: 87 Pass / 5 opt-in skipped; source.diff and empty obsolete-symbols.txt. Different version fixtures do not affect capability outcomes; no production release pin/profile wrapper. |
| API-002 | AC-002/004; non-AGY regression and shared frontend state | Pass after local test repair | runtime-regression.log initially 67 Pass/1 Fail; unchanged client copied env, old test incorrectly required reference identity. One matcher changed to strict value equality; runtime-regression-rerun.log 68 Pass/10 files. frontend-unit.log 19 Pass/3 files. |
| API-003 | AC-003/004; real GraphQL/WS/history with controlled provider | Pass | failure-transport.log 2 Pass; ACK/denied/error/history sanitized, bounded private diagnostic mode 0600, no fabricated completion. Fake provider is not real model evidence. |
| API-004 | AC-002/004; installed production factory create/restore | Pass | restore-live.log 1 Pass; factory-restore-live.json records original identity twice, same provider conversation, unchanged manifest/hash/Markdown; changed workspace and bogus conversation rejected. |
| API-005 | AC-002/004; installed tools/workspace/skills | Pass | production-live.log 2 Pass; implementation-local-live-probe.json and implementation-local-skill-live.json: identity, native file/shell artifacts only in selected workspace, configured capsule-only skill. |
| API-006 | AC-002/004; built availability/model API → real rendered team selector | Pass on corrected isolated rerun | runtime-api.json four enabled rows; model-api.json 14 real AGY models; browser-result.json, browser-final.txt/png and browser-probe-pass.log show enabled AGY, chosen model and enabled Run Team. No Run Team submission. |
| API-ENV-001 | User no-production-data constraint / AC-004 safety confidence | Fail, impact unresolved | environment-incident.md; backend-inherited-env.log versus corrected backend.log. Initial owned server accidentally connected to production SQL; no pending schema migrations, but no baseline proves zero side effects. |

## Exact Execution / Setup
All commands run from worktree root unless noted. Server scripts obey AGENTS.md `vitest run --no-watch`; web tests use `--run`.
1. `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-management/antigravity-cli-capability.test.ts tests/unit/agent-execution/backends/antigravity --no-watch`
2. `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-management --no-watch` (initial and matcher-repair rerun).
3. `pnpm -C autobyteus-web test:nuxt composables/__tests__/useRuntimeScopedModelSelection.spec.ts composables/__tests__/useTeamRunRuntimeCatalogSync.spec.ts components/launch-config/__tests__/RuntimeModelConfigFields.spec.ts --run`
4. `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND="$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-failure-transport.e2e.test.ts --no-watch`
5. `AGY_LIVE=1 AGY_LIVE_EVIDENCE_DIR="$PWD/tickets/in-progress/antigravity-runtime-missing/evidence/api-e2e" pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/antigravity/agy-restore-live.test.ts --no-watch`
6. Same env and command for `tests/unit/agent-execution/backends/antigravity/agy-production-live.test.ts`.
7. Corrected backend: `env APP_ENV=test DB_TYPE=sqlite AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:30697 DATABASE_URL=file:/tmp/agy-api-e2e.agNVix/data/db/validation.db node autobyteus-server-ts/dist/app.js --data-dir /tmp/agy-api-e2e.agNVix/data --host 127.0.0.1 --port 30697`. Actual startup DB path verified before rerun; health OK. Uses implementation-built current source, not installed bundle.
8. `BACKEND_NODE_BASE_URL=http://127.0.0.1:30697 pnpm -C autobyteus-web dev --port 3017`; `node tickets/in-progress/antigravity-runtime-missing/evidence/api-e2e/browser-probe.mjs`.
9. `git diff --check` passes. Production build/bootstrap pass and typecheck rootDir/existing-test limitations are upstream evidence in implementation handoff, not represented as independently rerun here. No product source changed since that build; branch-built API executed directly.

## Broader Validation / Environment / Browser
Decision **Required**, executed CLI + lifecycle + live API + Browser. Closed repository mock gap for installed 1.2.12 and rendered option. Darwin arm64, Node v22.23.1, pnpm 10.28.2, Chrome 153.0.8010.54 headless, viewport 1440x1000. Browser own context, no user browser profile. Native public mutations seeded one shared Agent and one coordinator-only Team in temporary filesystem repositories. No browser API mocks; browser targets corrected backend. Original upstream CUA limitation avoided through documented Playwright Core route.
Browser intermediate attempts encountered Nuxt first-load optimization reload and probe mismatches for provider-prefixed selected label and asynchronous draft validation; corrected the temporary probe and waited for observed semantic state. No frontend bug or source fix inferred from these harness retries. Final page errors empty, screenshot visually inspected. Shell/preload/packaging untouched; browser proves web-equivalent renderer only. No need to launch/restart installed Electron.
Live tests use installed CLI login and synthetic prompts, temporary capsule/workspace; provider may retain synthetic conversation/project metadata. No unrelated provider state deleted. Backend factory test doubles only definition/skill/workspace/MCP collaborators; discovery, capsule, launch, protocol and model are real. No production account secrets copied into evidence.

## API-ENV-001 Safety Failure / Preliminary Origin
Initial backend supplied only --data-dir and a minimal .env. Parent `DATABASE_URL`, `APP_ENV`, and public URL took precedence, so owned PID 12928 connected to `/Users/normy/.autobyteus/server-data/db/production.db`. The data-dir flag does not override an explicit SQL URL. Detected from resolved startup log, stopped only that test process and notified user. No pending SQL schema migration was reported; in-memory settings registration log does not prove SQL mutation. However startup may access/write SQL elsewhere and no before snapshot exists: **cannot establish zero production DB changes**. No evidence of loss is claimed either.
Corrected own PID 28810 explicitly set all target variables; log confirms new validation.db. Functional API/browser evidence was rerun and supersedes the first attempt. No rollback against production database attempted. The installed app/backend process was not restarted or patched. Details and exact chronology: environment-incident.md. This is an API/E2E setup error, not a defect in the four changed AGY source files. Independent failure-origin review must determine impact/recovery/acceptance path; corrected rerun alone does not erase the safety finding.

## Confidence Scorecard
Simple arithmetic mean, applicable categories only. No percentage overrides safety or missing proof.
| Category | Post-repository | Final | Basis / residual |
| --- | --- | --- | --- |
| Requirement and AC proof | 75% | 95% | All changed functional AC paths exercised; future upstream protocol compatibility not promised. Safety finding remains separate release gate. |
| Changed-boundary directness | 75% | 95% | Actual installed discovery/factory/capsule/restore and built API, static removal audit. No real every-model smoke. |
| Integration realism/mock gap | 75% | 95% | Real provider turns and browser/API; controlled faults deliberately fake, full team roundtrip not necessary for common-factory correction. |
| Environment/config/identity/fixture fidelity | 75% | 75% | Corrected isolation and original identity proven, but first SQL-target mistake and unknown side effects unresolved. |
| Failure/edge/lifecycle/recovery | 90% | 95% | Bounded negatives, sanitized app wire/history, exact live resume and workspace/conversation negatives. |
| User-surface/browser/shell | 75% | 95% | Real unchanged team selector, model choice and enabled launch draft; shell-specific paths unchanged/unexecuted. |
| Durable regression quality/relevance | 90% | 95% | Updated exact live bytes/evidence/cleanup and semantic Codex env matcher, both pass; no obsolete version-policy assertions retained. |
Post-repository **79.3%** (555/7). Final **92.1%** (645/7), +12.8 points. Default 95% target **No**; applicable category below 90% **Yes, environment 75%**. Functional critical AC proof exists; production-data non-impact safety proof does not. Final **Fail**, not Blocked (no unavailable dependency prevents remaining review), not Pass.

## Legacy / Persisted Data / Scope
No compatibility wrapper, dual-version branch, release range or version DTO observed. No durable coverage for obsolete version policy added. Approved persistence **Not Affected**: manifest schema 1 kept, same exact eight native tools and Markdown formatting, stored capsule bytes/hash/conversation retained by real normal restore. No migration/reset/rebuild introduced by implementation. Tests create a stored capsule, edit definition, terminate and restore through normal reader; no live user history is used. Representative capsule preservation passes; API-ENV-001 is a separate unsafe test environment access with unresolved impact.

## Durable Coverage Changes
Updated (no paths added/removed):
- `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-restore-live.test.ts`: exact immutable manifest/Markdown check, optional AGY_LIVE_EVIDENCE_DIR report, terminate active backend and remove own temp workspace in finally. AC-002/004. Live 1 Pass.
- `autobyteus-server-ts/tests/unit/runtime-management/codex/client/codex-app-server-client.test.ts`: toBe→toStrictEqual for explicitly supplied env, preserving values rather than unsupported reference identity. AC-004 non-AGY coverage. Runtime suite 68 Pass. No production behavior changed.
Validity decisions documented before edits; none removed/skipped. Diff at evidence/api-e2e/durable-coverage.diff. Direct low-risk successful test review Not Required; attach these for context to failure reviewer, not a successful-test review request.

## Cleanup / Artifacts / Untested Scope
Owned live child processes stopped. Restore test temp directory already absent; production-live/skill temp roots removed from their exact recorded paths. Owned backend and Nuxt process tree terminated; no listeners remain on 30697/3017. Browser contexts close in finally. Entire owned `/tmp/agy-api-e2e.agNVix` (fixtures, db/key, workspace) removed. cleanup.json records exact roots and process checks. Test DB remains under worktree tests/.tmp per repository convention; shared generated dist remains upstream untracked, not deleted. Evidence/report files retained. No cleanup of production DB or unrelated processes. Synthetic upstream CLI metadata may remain.
Temporary browser probe is ticket evidence, not reusable repository test: it depends on installed authenticated CLI and this isolated host setup; deterministic renderer/catalog/launch invariants already have maintained tests. No image-generation/team-MCP/org live roundtrip or desktop package/release test: unchanged boundaries, not claimed. No arbitrary future CLI compatibility claim. Existing standard typecheck limitations carried from implementation, not silently fixed. No release/install/push performed.

## Required Next Step
Focused failure-origin review of **API-ENV-001** with complete cumulative package. Recommended owner for correction: **API/E2E**; reviewer confirms origin and bounded recovery/acceptance gate. No requirement/design change identified. Route selected only after persisted report and get_handoff_rules. Do not treat functional pass evidence as permission to release.

## Applied Handoff Rule
get_handoff_rules returned the failure-origin condition for completed failed validation. Selected sole recipient `/code_reviewer`; Medium/Low successful Delivery rule does not apply. Complete package and API-ENV-001 evidence attached for focused failure-origin review, not successful-test review. Validation/test/evidence commit 1499c590d; no push/release.
