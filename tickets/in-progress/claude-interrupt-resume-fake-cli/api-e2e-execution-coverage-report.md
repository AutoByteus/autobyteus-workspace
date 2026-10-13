# API/E2E Execution Coverage Report

## Execution Round Meta
- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/design-spec.md`
- Supplemental full solution handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/handoff-architecture-design-complete.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/implementation-revision-record.md`
- Implementation checks: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/implementation-checks.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/api-e2e-coverage-investigation.md`
- Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/api-e2e-revision-record.md`
- Current / latest authoritative round: 1; API-REV-001 baseline; trigger IR-001. Prior completed API result: N/A.
- Architecture/source review reports and histories: **N/A — not applicable**. Delivery re-entry/history: N/A.
- Other still-relevant supplements: upstream evidence inventory in investigation-notes.md / implementation-checks.md; API logs and source analysis below, all evidence-only.

## Routing Classification
**Small / Low / Direct Low-Risk** unchanged. Successful-output route would be Delivery; successful test-code review **Not Required — direct low-risk route**. Actual result **Fail**, so focused failure-origin review Required; not a successful-test review request.

## Investigation And Execution Basis
Investigation and ledger written before execution; no durable coverage or production source changed. Planned 5 lifecycle files and target ran. Execution deviation: first target began ~8s after lifecycle, before it completed, because an exec session ID was not retained. Both used the isolated worktree DB; do not treat that initial run as pristine serial evidence. After both returned, target-2 repeated serially with fresh HOME/TMPDIR and identical failures. No further concurrent commands, build or service operations. Broader regression/typecheck/probes/third acceptance repeat deferred on decisive target failure, not counted as blocked/pass. Current investigation updated before rerouting.

## Test-Case Ledger Reconciliation
- Ledger initialized before execution; target reporter writes each Started/Completed callback immediately to ledger and JSONL. Grouped lifecycle outcome captured upon process completion. No tests still running/interrupted.
- Completed: LIFE-001 Pass (17/17); all eight target IDs Fail on both attempts; LIVE-001 Not Tested (gated skip), never Pass.
- Not started: REG-001, TYPE-001, PROBE-BODY, PROBE-CLEANUP, PROBE-SETUP. Third acceptance repeat not started. These remain downstream revalidation work.
- Last durably recorded execution: TARGET-RUN-2 Completed Fail, 2026-10-13T03:21:40.782853+00:00. Latest result reconciled here; no prior API-failure resolution claimed.

## Compatibility / Legacy Scope Check
No compatibility-only runtime or test behavior added. No missing-initialization/no-spawn fallback; obsolete malformed fake replaced. Persisted-data decision Not Affected, implementation conforms. No schema/version branch/migration. No invalid requirement/design scope found.

## Changed Boundary And Evidence Matrix
| IDs / package AC | Boundary / execution | Evidence | Result |
| --- | --- | --- | --- |
| LIFE-001 / AC-004,005 | Opening/process owner/streaming/cleanup, actual SDK 0.3.280 no-model child + held-child failed-stop retry | evidence/api-e2e/lifecycle.log, .exit, .command.json, .resources.json | Pass, 5 files / 17 tests |
| API-CL01..04 / AC-001,003,004 | Real WebSocket: error text/scalar-list precedence, redaction, partial/completed tool work, no retry, same-session next turn; then manager release | target-{1,2}.events.jsonl, .failure-summary.json, .log/.exit; four frame JSONs per run | Fail in teardown; no body assertion leaf failure |
| WS-INT / AC-001,002,004 | Real send/interrupt/follow-up with retained query/child | Same logs/case events | Fail in teardown |
| WS-BUSY / AC-001,002,004 | Busy append into running turn | Same | Fail in teardown |
| WS-RACE / AC-001,002,004 | Approved injected late dispatch, exactly-once requeue/FIFO/terminal lifecycle | Same | Fail in teardown |
| WS-BG / AC-001,002,004 | Background notification + autonomous provider turn | Same | Fail in teardown |
| LIVE-001 | Paid/live CLI context retention | Original gate absent; same summary | Not Tested — 1 skipped |
| REG-001 / TYPE-001 / three probes | Planned follow-on repository checks | No process launched | Not Tested — deferred until failure-origin review/rework |
| AC-006 / REQ-006 | Integrated rerun/user verification/merge/push | Delivery-owned gate | Not completed; not represented as API acceptance |

## Exact Commands And Outcomes
Working directory: /Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli

`python3 tickets/in-progress/claude-interrupt-resume-fake-cli/evidence/api-e2e/run-isolated.py <label> <group> <command>` creates private HOME/TMPDIR, strips keys/app roots/gates, captures output/resources, removes only its private root. Exact argv/cwd retained in each .command.json.

- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-management/claude/client/claude-sdk-session-opening.test.ts tests/unit/runtime-management/claude/client/claude-sdk-process-owner.test.ts tests/unit/runtime-management/claude/client/claude-sdk-real-child-retry.test.ts tests/unit/runtime-management/claude/client/claude-sdk-streaming-session.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-cleanup.test.ts --no-watch`: **17 passed**, exit 0; 26.25s Vitest / 30.623s wrapper.
- Both targets: `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts --no-watch --reporter=verbose --reporter=<absolute evidence/api-e2e/case-reporter.mjs>`; reporting flags only, no behavior gate/timeout/skip changes. **8 failed / 1 skipped**, exit 1. target-1 9.36s / 12.981s; authoritative clean serial target-2 7.12s / 8.912s. Neither reports unhandled errors/rejections.
- Read-only source/diff analysis: `git diff --quiet 32aca0818e HEAD -- autobyteus-server-ts/src autobyteus-server-ts/tests/fixtures/claude-owned-sdk-cli.mjs` exit 0; deficient authority verified in unchanged base source; public authority and release/cleanup source inspected. No product code changes.
Additional repository coverage after confidence gate: None.

## API-F001 — Incomplete Test MCP Authority Breaks Exact Cleanup
**Expected:** all eight original cases pass and manager.closeRunSession releases every exact component/removes session, so hasRunSession is false.

**Observed (all eight, both attempts):** AggregateError “Claude WebSocket test/owned cleanup failed.” containing:
1. “Claude exact component cleanup failed.” → TypeError **`this.runSessions.deactivateForRun is not a function`**.
2. Added exact-session-removal assertion: **expected true to be false** (session retained because cleanup failed).

- Test target line 233 passes `{ activateForRun: () => ({ kind: "not_exposed" }) } as never`, lacking deactivateForRun.
- Production `src/agent-tools/mcp/agent-tool-mcp-session-authority.ts` declares required `deactivateForRun(runId: string): number`; `src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-session-state.ts:49..52` release calls it unconditionally. That supported current cleanup contract is not invalid just because test activation returns not_exposed.
- Real cleanup uses independent component proofs, so process/IO release still succeeds but manager intentionally retains exact session on MCP failure. Target case error trees contain **only** these two leaves, not original streaming/error or physical child/IO assertion failures. Frame evidence confirms API-CL01..04 reach same-session continuation. This does **not** turn failed cases into passes.
- Deficient test stub exists on 32aca0818e; formerly masked by Query opening error. Rule 9 requires correction, not “baseline” dismissal. The no-production-change scope still holds. A complete test dependency is the bounded likely remedy; no original assertion should be removed and no production release check weakened.
- Preliminary classification: **Local Fix — test fixture**; recommended owner API/E2E, subject to Code Reviewer confirming origin/owner. No repair made before failure-origin review. No actual product defect found in this failure path; if review identifies one, report Solution Designer before production changes.

## Mandatory Validation Confidence Scorecard
| Category | Post-repository | Final | Final supporting evidence / residual |
| --- | --- | --- | --- |
| Requirement / acceptance proof | 50% | 50% | Critical 8-pass/exact cleanup fails |
| Changed-boundary directness | 95% | 95% | Real transport/retained opening/owner/child/IO exercised |
| Cross-boundary realism / mock gap | 95% | 95% | Real boundaries plus actual SDK units; provider frames simulated, as scope requires |
| Environment/config/identity/fixtures | 90% | 90% | Private roots and serial failure confirmation; incomplete MCP stub, first overlap |
| Failure/edge/lifecycle/recovery | 50% | 50% | Manager release fails; units/child cleanup alone insufficient |
| User/browser/desktop | N/A | N/A | No changed renderer/browser/native shell |
| Durable coverage quality/relevance | 75% | 75% | Preserved valid scenarios but malformed fixture makes suite red |
- Overall post-repository = final **75.8%** (455/6), no broader-execution change. Default 95% target **not met**; applicable requirement, lifecycle and durable quality categories below 90%. Every critical executable AC proven: **No** (AC-001/004 and REQ-005 remain failing). AC-002/003 bodies reached without assertion failures but complete case acceptance is not claimed.

## Broader Validation Decision And Execution
**Not Required** for this failure-origin assessment. A browser, desktop build or costly provider run cannot supply a missing method on the local test authority. Selected repository E2E already exercises actual transport/process/release and pin-SDK/no-model units give complementary real initialization. Correction + repository reruns remain required; result is Fail regardless of confidence averaging. No live/frontend/desktop/data bootstrap executed. Planned operational failure probes not run on malformed fixture; return after repair when meaningful.

## Runtime Targets / Data / Lifecycle
macOS arm64; Node 22.23.1, pnpm 10.28.2, Vitest 4.0.18, pinned Claude SDK 0.3.280. No browser/device target. Only loopback port 0 and private data. No persisted transition or migration; test-owned tests/.tmp database reset through documented Vitest global setup. Physical child exit/retained stdin/stdout assertions emitted no failures; overall exact component/session cleanup remains red.

## Durable Coverage Changed
**No API/E2E durable test edits/additions/removals this round**. Carried IR-001 updated path: /Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts. This file remains failing and attached for failure-origin review, not successful review. Fixture unchanged; no removed path.

## Artifacts / Temporary Methods / Mock Limits
Evidence/api-e2e contains run-isolated.py and case-reporter.mjs (ticket-local execution/reporting scaffolding retained for reproduction, not test suite extensions), lifecycle and target-{1,2} commands/logs/exits/resource receipts, target case JSONL/failure summaries, API-CL01..04 frame files. No temporary modified source/probe file was created. Upstream scripts/init/MCP/skills doubles retained; provider initialization/frames simulated, real exact Node child lifetime and production opening/cleanup exercised. No model inference or alternate OS certification; known 7 baseline focused test-typing diagnostics remain excluded and not mislabeled a production-typecheck failure.

## Cleanup Performed
| Owned resource | Action | Result / limit |
| --- | --- | --- |
| Harness socket and Fastify server | All-stage close invoked even on manager failure | No owned process group remains; original cleanup error preserved |
| Controlled child / retained stdin/stdout / input pump | Real production process release, target exact checks | No child/IO/pump assertion failure; no sampled survivors. Process sampling is corroboration, not complete spawn-count accounting |
| Exact manager session | Real closeRunSession | **Failed** MCP component proof; session intentionally remains registered until Vitest process exits. Not called successful session cleanup |
| Test private cwd | onTestFinished removal | No testWorkspaceRemnants in private TMPDIR receipts on both target runs |
| Wrapper HOME/TMPDIR/cache | Removed after process output/resource capture | privateRootRemoved true; no user's data touched |
| Worktree test DB / generated deps | Dedicated documented test data; untracked SDK dist left unstaged | Retained for rework; no deletion of shared/unowned resources |

## Latest Authoritative Result
- **Fail — API-F001**, final confidence **75.8%**.
- Critical executable proof missing: 8 passes / exact all-component session removal. Not blocked on external dependency.
- Recommended Local Fix owner: API/E2E test fixture (review confirms final origin/owner).
- Next recipient from get_handoff_rules: **/software_engineering_team/code_reviewer**, failure-origin rule; no Delivery handoff.
- No production repair, paid model call, successful acceptance, user verification, merge/push or release claimed.
