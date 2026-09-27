# API/E2E Coverage Investigation

## Investigation Meta / Authority
Round 1, 2026-09-27; trigger IR-001 Implementation Complete on source f590519ec, handoff 95637e21d. Prior API/E2E result/confidence: N/A; no prior record. Current completed revision: pending API-REV-001.
Canonical package here: requirements-doc.md (Approved SR-003), investigation-notes.md with factual evidence inventory, design-spec.md (Ready), solution-revision-record.md, solution-handoff.md, implementation-handoff.md and implementation-revision-record.md. All read. Historical initial scope is superseded by SR-003. Evidence supplements include installed backend rejection, CLI help/models/version, feasibility probe and frontend startup; none is normative UI design. Independent architecture/source review and their revision records: N/A — not applicable. Delivery artifacts: N/A.
Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-runtime-missing. Canonical ledger: api-e2e-test-case-ledger.md. Current report will be api-e2e-execution-coverage-report.md.

## Routing Classification
Medium / Low; Direct Low-Risk input. Successful output Delivery; proportional test review Not Required — direct low-risk route. No source change authorized here.

## Behavior And Boundary Map
| Scope | Change / risk | Planned proof |
| --- | --- | --- |
| BEH-001, AC-001/005 | Remove release admission/profile wrappers; simplify backend domain | Source audit + capability/factory tests |
| BEH-001/003, AC-002 | Installed CLI subprocess → factory → capsule → stream, API → unchanged selector | Live production new/restore, isolated built API, browser team selector |
| BEH-002, AC-003 | Preserve bounded help/models, sanitized failure | Capability negatives and controlled WebSocket failure E2E |
| BEH-003, AC-004 | Preserve identity, permission, exact conversation, stored hash and tools | Factory/capsule negatives + live restore + non-AGY and UI regressions |
Backend/external-process lifecycle directly affected. API wire and frontend source unchanged but observable availability is affected. Web-equivalent desktop renderer needs browser proof. Electron shell, worker/distributed architecture and auth policy unchanged; no shell launch required. Identity/permissions remain relevant preserved constraints. Persistence Not Affected per design and handoff: no schema/migration/reset, preserve same eight names/Markdown/stored capsule. No legacy wrapper observed; versions in regression fixtures are valid stimuli, not policy.

## Execution Discovery / Safety
- autobyteus-server-ts/AGENTS.md: vitest run --no-watch; README.md environment/build/run: pnpm build then node dist/app.js --data-dir isolated --host 127.0.0.1 --port free. Startup migrates own database; AUTOBYTEUS_SERVER_HOST required.
- autobyteus-web/AGENTS.md and README.md: browser Nuxt dev with BACKEND_NODE_BASE_URL; test:nuxt --run. No git add-all or release action.
- Both package.json files, server vitest.config.ts and tests/setup/prisma-{env,global-setup,test-config}.ts inspected: Vitest resets only worktree tests/.tmp/autobyteus-server-test.db; sequential commands avoid shared DB races. Existing dependencies/shared dist available. No production data selected.
- Existing frontend E2E probe agent-org-role-labels-probe.mjs establishes supported Playwright Core/headless Chrome, isolated backend and Nuxt approach. Use owned browser, not user Chrome profile.
- CLI login remains existing account; synthetic test tasks only, disposable workspaces; provider may retain synthetic conversation records. Do not enumerate/delete unrelated provider state or copy production database/secrets.
- Backend minimal new data root with APP_ENV=test, DB_TYPE=sqlite, explicit server URL. No model-provider secrets required for AGY installed CLI. Do not patch/restart installed user app at port 29695.

## Coverage Inventory / Validity
| Existing coverage | Decision | Reason / action |
| --- | --- | --- |
| tests/unit/runtime-management/antigravity-cli-capability.test.ts | Still Valid | Different version text cannot affect identical help/models; negative flags/spawn/time/output/model cases and health responsiveness. Execute. |
| tests/unit/agent-execution/backends/antigravity factory/policy/capsule/skills/event/lifecycle/diagnostic suites | Still Valid | Model, exact eight names, immutable bytes, bad agent/cwd/permission/conversation, lifecycle and sanitization. Execute. |
| agy-restore-live.test.ts | Needs Update | Valid installed factory new/restore assertions; add exact capsule byte/hash evidence and guaranteed resource cleanup/evidence to current ticket. |
| agy-production-live.test.ts | Still Valid | Real identity and generic file/shell/skill operations in isolated capsule/workspace; opt-in AGY_LIVE and AGY_LIVE_EVIDENCE_DIR. Execute if needed after factory live. |
| agy-mcp-team-live and native-image E2E | Out Of Scope for execution | Tools/MCP image behavior not changed; live image broad task not needed to prove release admission. Historical paths inspected before any opt-in; will not opt in. |
| agy-failure-transport.e2e.test.ts | Still Valid | Fake CLI deliberately exercises real GraphQL/WS/history redaction and lifecycle; execute with fixture override, not installed provider. |
| frontend useRuntimeScopedModelSelection, useTeamRunRuntimeCatalogSync, RuntimeModelConfigFields tests | Still Valid | Existing enabled/selected filter, per-runtime model and shared config; execute unchanged. |
| broader runtime-management suite | Still Valid except known assertion under investigation | Non-AGY regression coverage. Known unchanged Codex toBe env reference is not semantic value proof; reproduce and assess against unchanged source. Do not repair unrelated test/source. |

No stale test removed. Durable addition decision: update existing live restore only rather than duplicate. Browser/API probe temporary because machine-installed CLI/auth/environment integration is specific validation; deterministic relevant durable behavior already covered. No new production surface.

## Ordered Plan / Ledger
Initialize ledger before execution: API-001 repository narrow + audit; API-002 broader non-AGY + frontend; API-003 controlled transport; API-004 installed factory new/restore; API-005 production tool/skill; API-006 isolated built API + browser selector. Record each immediately. Exact commands/results/evidence appended below. Initial confidence pending execution. Broader validation Required (live CLI, API, browser) because mocks cannot prove installed CLI admission and the originally missing rendered option. Target 95% with no category below 90%; missing critical AC prevents Pass.

## Desktop / Temporary Validation Decision
Browser development path is sufficient: frontend unchanged and original defect is backend availability filtering, not IPC/packaging. Start only isolated branch backend and Nuxt, use native public create-definition/team APIs if fixtures needed. Capture API JSON, DOM selection/model state and screenshot. Stop only owned child processes and remove owned temporary storage; retain evidence. No installed desktop execution/release.

## Current Decision
Proceed with investigation-informed execution. No upstream ambiguity or reroute before tests. Real external incompatibility or invariant violation → preliminary Local Fix/Unclear and failure-origin review; unavailable dependency only after safe attempts → Blocked.

## Updated Coverage Validity — API-002
The broad Codex explicit-env scenario's semantic requirement remains valid (preserve configured values), but its toBe identity assertion is not supported by this task's approved behavior and conflicts with unchanged deliberate environment cloning. Classify Needs Update outside this patch scope; do not infer a source regression or alter unrelated durable test here. Actual broad execution remains Fail, not relabelled Pass. Evidence runtime-regression.log and unchanged base diff. This does not eliminate the requirement for non-AGY value behavior proof.

## Post-Repository Confidence / Broader Gate
Executed commands/results in ledger and evidence/api-e2e: narrow 87 Pass / 5 live skipped; broad runtime 67 Pass/1 unchanged identity assertion Fail; frontend 19 Pass; real app transport with fake provider 2 Pass. Source audit empty obsolete symbols.
| Mandatory category | Score | Support / gap and next proof |
| --- | --- | --- |
| Requirement/AC proof | 75% | Negative/removal direct, installed new/restore and rendered selection missing; run live |
| Changed-boundary directness | 75% | Real process fake help/models; provider lifecycle mocked; installed factory needed |
| Cross-boundary realism/mock gap | 75% | Real GraphQL/WS/history but fake provider; built API/CLI needed |
| Environment/config/identity/fixtures | 75% | Isolated deterministic tests, live account/environment not yet proven |
| Failure/edge/lifecycle/recovery | 90% | Strong bounded/sanitized negatives; exact live resume remains |
| User-surface/browser/shell | 75% | Renderer units only; real team selector needed, no shell change |
| Durable regression quality/relevance | 90% | Good linked assertions; known unrelated brittle Codex assertion limits broad suite |
Overall 79.3%, simple mean (555/7). No Pass; critical AC-002/004 not directly proven. Broader Required: CLI production factory/resume, generic tools/skill, isolated built API and browser. These close actual runtime/environment/UI gaps; no desktop-shell execution justified. Default clean target not met.

## Revised API-002 Durable Decision Before Edit
On examining the failing test's full intent and unchanged client, its only contract is preserving explicitly supplied environment values without governed-launcher rewriting; no approved requirement promises object identity. The error output confirms identical values. Rather than carry an invalid assertion or make a production change, API/E2E will narrowly replace `toBe` with `toStrictEqual` in tests/unit/runtime-management/codex/client/codex-app-server-client.test.ts:69. This supersedes the provisional leave-unrelated-test decision above: this single matcher repair directly maintains AC-004's required non-AGY regression evidence, is API-owned coverage maintenance, and changes no product behavior. Rerun the entire runtime-management suite. No test deletion, skip, or reduced value assertion.

## API-ENV-001 — Execution Safety Finding
Initial browser backend inherited production DATABASE_URL despite isolated data-dir; contained and restarted with explicit full target env. See evidence/api-e2e/environment-incident.md and both backend logs. This is API-owned Local Fix/environment failure, not source defect. Isolation must be verified from resolved startup paths before any API/browser interaction. Initial API evidence superseded; corrected rerun targets validation.db. Uncertain prior SQL side effects limit final environment/data confidence and prevent clean Pass; request focused failure-origin review after other cases complete. No production rollback attempted.

## Final Investigation State / API-REV-001
API-001–006 functionally Pass after documented matcher/harness corrections. Installed create/restore, tool/skill and real browser/backend proof complete; see execution report for final 92.1% scorecard (environment 75%). Final result Fail due API-ENV-001 unresolved safety impact, not an observed AGY defect. Broader Required and executed, not Blocked. Durable changes exactly two updated test files; no added/removed tests/source. Cleanup recorded in cleanup.json and ledger. Recommend focused failure-origin review; no delivery Pass.

## Round 2 Investigation — CRR-001 / API-REV-002
Trigger: code-review-report.md and code-review-revision-record.md, cc001b07c. Prior API-REV-001 Fail / 92.1%. Recheck API-ENV-001 first. Reviewer confirms Local Fix, API/E2E-owned environment/execution/reporting, not a product defect. Investigation for this round is retained-evidence/source reconciliation only; no production access, secret inspection/copy, service start, recovery or test/source change authorized. Existing functional API-001–006 evidence remains valid and will be reused, not represented as newly executed.
Plan API-007: inspect retained startup logs against unchanged source/built sequence; distinguish reached write-capable branches from proven effects; preserve evidence fingerprints; write prelaunch checklist controlling SQL/key/data/memory before process start. Then assess whether evidence can close prior-impact uncertainty. If not, upstream informed disposition is unresolved; do not invent non-impact or rerun product tests to imply it. No prior successful-test review; CRR-001 requests separate proportional durable-test review after successful resolution. This pending gate must not be bypassed using initial direct-route wording.

### Round 2 Completed Investigation / Current Authority
API-REV-002 remains Fail / 92.1%; all seven final scorecard categories carried unchanged from API-REV-001 (95,95,95,75,95,95,95). Reconciliation improves accuracy but adds no historical non-impact proof, so no confidence uplift. Broader functional validation previously Required/executed; no additional live execution selected because it cannot recover missing pre-state. Current upstream issue is Unclear informed disposition, with failure origin already confirmed in CRR-001. No further origin inquiry or source fix needed now. No test edits, skipped/deleted coverage or production access this round. See prelaunch-isolation-checklist.md; resolved SQL/key/data/memory ownership must precede future spawn. Separate durable-test review requested by CRR-001 remains pending after successful resolution; initial direct-route exemption is not a waiver. Request Solution Designer disposition per reviewer without changing requirements or claiming a technical Pass.
