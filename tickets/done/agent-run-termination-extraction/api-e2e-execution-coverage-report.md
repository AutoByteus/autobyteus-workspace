# API/E2E Execution Coverage Report — agent-run-termination-extraction

## Execution Round Meta

(`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction/tickets/in-progress/agent-run-termination-extraction`)

- Requirements `…/requirements-doc.md` (SR-003); Investigation notes `…/investigation-notes.md`; Solution revision record `…/solution-revision-record.md`; Design spec `…/design-spec.md`
- Design review `…/design-review-report.md` (ARCH-REV-001); Architecture review record `…/architecture-review-revision-record.md`
- Implementation handoff `…/implementation-handoff.md` (IR-001); Implementation revision record `…/implementation-revision-record.md`
- Code review `…/code-review-report.md` (CRR-001 Pass); Code review revision record `…/code-review-revision-record.md`
- Delivery revision record: N/A
- Coverage investigation `…/api-e2e-coverage-investigation.md`; Ledger `…/api-e2e-test-case-ledger.md`; Revision record `…/api-e2e-revision-record.md`; Evidence `…/api-e2e-evidence/`
- Current API/E2E Revision ID: `API-REV-001`. Round 1. Trigger: CRR-001 Pass. Prior round: none. Latest authoritative round: 1.
- Branch `codex/agent-run-termination-extraction` @ `a5a244d66` (code `1b83c8f88`); base `03d5db06b` (worktree `…/agent-run-termination-extraction-base`).

## Routing Classification

- Medium / High, reviewed route, successful output → Code Review.
- Proportional test-code review: `Not Applicable` from API/E2E (no durable test changes). The implementation's additive `agent-run.test.ts` change (+29) was reviewed in CRR-001 and passes here.

## Investigation And Execution Basis

- Investigation was written before execution: `Yes`. The plan was followed, plus one addition: the base-side comparisons for the busy-quit finding (desktop and server probe).
- Reroute required: `No`.

## Test-Case Ledger Reconciliation

| Case | Final Result | Evidence |
| --- | --- | --- |
| T-01 LE-O1 Codex ×10 consecutive | **Pass 10/10** (11/11 with T-04); 0 warnings | `t01-le-o1-codex-*.log` |
| T-02 Mention suite Claude + Codex | **Pass per AC-004**: the only failures are the Codex first test and Claude DI-001 live-model timeouts, which fail on base too at equal or higher rates (paired ×3: base 4 failures, branch 3) | `t02-*.log` |
| T-03 Agent-initiated suite on Claude | **Pass 6/6** | `t03-aic-claude.log` |
| T-04 Agent-initiated suite on Codex (roots) | **Pass 5/5** | `t04-aic-codex.log` |
| T-05/T-06 AC-009 + full server | **Pass**: 27/27 baseline failures identical; 0 new in the full suite | `t06-server-compare.txt` |
| T-07 F-4 census | 0 warnings (no rejection/expiry fired; no stale-local-turn observation) | all live logs |
| T-08 Real desktop app: busy quit and relaunch (agent + collaborator, Team, Org) | **Continuation Pass**; busy-quit process leak found, **pre-existing** (see below) | `t08/` |
| T-09 Server busy-shutdown probe, branch and base | Identical on both (busy hangs, idle 0.3–0.4 s) | `t09-*.log` |

## Compatibility / Legacy Scope Check

None introduced; no compatibility-only coverage. Persisted data not affected.

## Changed Boundary And Evidence Matrix

| Case | AC | Changed Boundary | Surface | Evidence Type | Result |
| --- | --- | --- | --- | --- | --- |
| static | AC-001/002 | `AgentRun` delegation; sizes | grep/wc | Temporary | Pass (383 / 196 effective lines; only `agent-run.ts` imports the new owner) |
| T-01/T-03/T-04 | AC-004, AC-003 | Fence/termination under a busy Org, Team and standalone Stop | Live server + Codex/Claude | Durable (unchanged suites) | Pass |
| T-02 | AC-004 | Standalone Stop/wake live | Live | Durable | Pass (base-identical flakiness only) |
| T-05/T-06 | AC-003, AC-009 | All server | Vitest vs base and baseline | Durable | Pass |
| T-08 | SCN-001/002 | Server `stopAll` on app quit with busy runs; restore | Isolated desktop app (Playwright/CDP) | Desktop | Continuation Pass; pre-existing leak |
| T-09 | SCN-002 | `closeProcessResources` with a busy run | Live server probe | Temporary | Branch = base |

## Validation Confidence Scorecard

| Category | Score | Evidence | Residual |
| --- | --- | --- | --- |
| Requirement and AC proof | 96% | AC-001/002 static; AC-003/009 identical to the baseline; AC-004 gates met on Claude and Codex | — |
| Changed-boundary execution directness | 95% | Busy Org Stop ×11 live; Team/standalone Stop live; app-quit `stopAll` with busy runs | The fence's rejection branch did not fire live (0 warnings) |
| Cross-boundary realism / mock gap | 95% | Real server, runtimes and desktop app | — |
| Environment / fixture fidelity | 92% | Documented gates; base comparisons on the same machine and time | Model flakiness in the mention suite (base-identical) |
| Failure / lifecycle / recovery | 93% | Graceful and forced quit, relaunch, continuation on all three root types; base parity for the shutdown hang | A pre-existing busy-quit leak (not a regression) limits a clean-shutdown claim |
| User-surface / desktop shell | 95% | Real app journeys (no UI change in scope) | — |
| Durable regression quality | 95% | Unchanged live suites plus the 8 AC-003 suites, additive test only | — |

- Overall: **94%** (simple average). Every critical AC is directly proven: `Yes`. No category below 90%.
- 95% target: `No` (94%). The remaining gaps cannot be closed inside this ticket: the busy-quit leak is pre-existing and out of scope (REQ non-goal: no new fence/termination semantics), and the mention-suite flakiness is base-identical.

## Broader Validation Decision And Execution

- `Required` → executed: an isolated desktop app built from this worktree, the test package `t08/sar-test-agents` imported through the UI, Codex gpt-6-astra, auto-approve on.

| Step | Expected | Observed | Result |
| --- | --- | --- | --- |
| Setup: SAR Host + `@SAR Helper`, SAR Squad Team, SAR Org; code words KILO-ONE / LIMA-TWO / MIKE-THREE | Works | Works | Pass |
| Four agents mid-turn (host, helper, Team lead, Org chief in `sleep`); `isolated-app stop` (process-group SIGTERM) | Quit | Server "Server closed cleanly" exit 0 in 0.24 s (the codex app-server was killed by the same group signal); Electron main needed force after 10 s | Observed |
| Relaunch on the same data; continue each run | Conversations continue | Host recalls KILO-ONE; helper answers; lead LIMA-TWO; chief MIKE-THREE (the interrupted turn shows the tool card + "Thinking", cosmetic) | Pass |
| Four agents mid-turn again; **SIGTERM to the Electron main process only** (real quit path) | Clean quit | Main exited after 29 s; **the embedded server was orphaned (PPID 1) with its codex app-server and the 4 sleeps, and exited only when the last busy turn finished (~10 min)** | Pre-existing defect |
| Same on a **base** desktop app (one busy Codex run) | Comparison | Main exited after 33 s; server orphaned with the sleep running; it exited when the sleep was killed | **Base identical** |
| Server probe (busy Codex run → `fastify.close()`), base and branch | Comparison | Both: close does not finish within 150 s, sleep left running; idle control closes in 0.3/0.4 s | **Base identical** |

### Pre-existing defect found (not caused by this branch; outside this ticket's scope)

- **What happens.** When the app quits (or the server receives SIGTERM) while a Codex agent is mid-turn, server shutdown (`closeProcessResources` → `stopAll`) waits for the in-flight turn to finish instead of interrupting it. Electron's quit gives up after about 30 s and exits. The embedded server, its codex app-server and the agent's commands keep running as orphans until the turn ends on its own, which is unbounded for a long or hung tool.
- **Why it matters.** It is user-visible: the app appears closed while the backend keeps running. A relaunch then starts a second server against the same data while the orphan may still write.
- **Classification.** Pre-existing and identical on base `03d5db06b` (desktop and server probe). It is not a regression of REQ-001–003, and fixing it would change shutdown semantics (a non-goal here).
- **Recommended:** a new ticket for `solution_designer`. Evidence: `t08/isolated-app.log` (branch), `t09-{base,branch}-{busy,idle}.log`, ledger #6–#9.

## Platform / Runtime Targets

macOS (Darwin 25.5); Node 22; Codex CLI 0.160.0 (`gpt-6-astra` in the app; suite default model in the E2E suites); Claude Code 2.1.283 (haiku in the suites); the packaged Electron app from both worktrees.

## Lifecycle / Persisted Data

Not affected. Relaunch after graceful and forced quits restored all runs and conversations.

## Durable Coverage Changed

None by API/E2E. Temporary: `zz-tmp-busy-shutdown-probe` (source in `api-e2e-evidence/probes/…txt`; removed from both worktrees).

## Cleanup Performed

- My isolated instances are stopped and their records removed; data roots deleted.
- The orphaned servers, codex app-servers and sleeps I caused are ended.
- Temporary probe files are removed from the branch and base worktrees; both worktrees are clean.
- Other people's isolated instances and the user's app were not touched.

## Latest Authoritative Result

- Result: **`Pass`**. Final confidence 94%; no category below 90%; every critical AC directly proven.
- Broader validation: `Required` (executed).
- Next recipient: `/code_reviewer` (Medium/High Pass rule).
- Residual risks:
  - **pre-existing busy-quit shutdown hang/orphan** (new ticket recommended);
  - base-identical mention-suite model flakiness;
  - the F-4 rejection path was not exercised live;
  - Grok/AGY/LM Studio not run (not required).
