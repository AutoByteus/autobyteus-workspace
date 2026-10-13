# API/E2E Coverage Investigation

## Investigation Meta
- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/solution-revision-record.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/design-spec.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/implementation-revision-record.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/handoff-architecture-design-complete.md`
- Implementation checks: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/implementation-checks.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/api-e2e-test-case-ledger.md`
- Round: 1; trigger IR-001; date 2026-10-13. No previous API result/record; baseline starts API-REV-001 after execution.
- Design review, architecture-review history, source-review report/history: **N/A — not applicable**. Delivery re-entry: N/A.
- Other relevant supplements: upstream evidence inventory in investigation-notes.md and implementation-checks.md. Evidence only; none changes approved behavior.

## Routing Classification
Small / Low; Direct Low-Risk; successful-output route Delivery; test review **Not Required — direct low-risk route**.

## Current Requirement And Design Basis
Approved SR-001 + Ready SR-002 remain authoritative. IR-001 changes one test only. REQ-001..005 / AC-001..005 require eight ungated passes/one live skip, original streaming/error assertions, real controlled acquisition/public cached initialization and exact release, no unhandled errors or user-data impact. AC-006 / REQ-006 is a Delivery finalization gate, not executable API acceptance; merge/push/user verification remain pending, never counted as API passes.
Immediate baseline cause was missing initializationResult; absent controlled spawn was a separate coverage gap. Inspecting the repair confirms real beginStreamingSession/session manager/owner/pump; no generated receipt or production fallback. Legacy/Compatibility Removal Check clean; Persisted Data Transition Check Not Affected and consistent with diff.

## Supported Scenarios And Real Usage
SCN-001..007 all retained: credential-free developer run; user's interrupt/follow-up; busy append; explicit late-append settlement race; provider background completion; four error shapes and next user turn; current opening/release contract. No new product scenarios. Operational harness-failure probes address REQ-005, not speculative product states. Unsupported/contrived scenarios: None in approved basis; no multi-user/browser race invented.

## Changed Behavior And Surface Classification
| Boundary | Change | Consequence / evidence | Broader mode |
| --- | --- | --- | --- |
| API/transport/domain/session identity | Preserved, not production modified | Real Fastify/WebSocket, command coordinator, AgentRun, ClaudeSession and return pipeline; original scenarios | Target repository E2E |
| Process/lifecycle and external SDK adapter | Test-only changed | Query conformance, cached simulated init, one controlled real Node child and exact retained IO after release | Actual pinned-SDK/no-model lifecycle units plus target |
| Test environment/resources | Changed | Private cwd, all-stage teardown, primary/cleanup failure preservation, joined waits/input pump | Repeat target and temporary harness failure probes |
| Frontend/browser/auth/permissions/desktop/worker/distributed/persisted transition | No changes | No browser API, UI, credentials policy, native shell or persistence delta | N/A |
Actual transport is real but provider initialization/frames are simulated. No inference/real CLI conversation claim.

## Project Execution Discovery
- Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli
- Stack: Node 22.23.1 / pnpm 10.28.2 / Vitest 4.0.18; Fastify 4 WebSocket; pinned Claude SDK 0.3.280; macOS.
- Testing guideline: workspace TESTING.md; no closer TESTING*.md exists.
- Authorities read: AGENTS.md, DESIGN.md, TESTING.md, autobyteus-server-ts/AGENTS.md, server README.md tests/setup/build sections, package.json, vitest.config.ts, tests/setup/{test-environment-isolation.ts,prisma-env.ts,prisma-global-setup.ts,prisma-test-config.ts}, fixture claude-owned-sdk-cli.mjs, installed SDK Query interface and Vitest reporter declarations.
- Guideline: narrow checks first; clean HOME/env for E2E; no costly gates/keys; serialize builds/tests against this worktree; stop only owned resources. Source imports mean no dist server build needed. Dedicated install + Prisma prebuild complete upstream, checked evidence. Typecheck rebuilds shared packages serially; untracked SDK dist remains unstaged.
- Vitest forks/no file parallelism; setup resets only dedicated tests/.tmp SQLite DB before each invocation. No persistent product-data transition. README final test-environment note is coarse; actual Prisma setup is authoritative and TESTING.md agrees.
- Required secrets: N/A. Gates intentionally absent. Clean subprocess env contains PATH, fresh HOME, private TMPDIR and explicitly named test-owned evidence knobs only. No imported provider keys or app roots.
- Components: Vitest owns Fastify on loopback port 0, ws client, exact manager session and child; target teardown closes them; onTestFinished removes cwd. Wrapper snapshots child processes/private tmp after execution before removing its private root. Existing project fixture unchanged.
- Storage: wrapper-private HOME/TMPDIR and worktree tests/.tmp. No service/container/frontend startup; no user's app altered.
- Independent execution reporter may append per-case ledger/events via TEST_* knobs; it does not modify test behavior. Evidence runner/reporter are ticket-only temporary execution scaffolding retained for reproducibility.

## Existing Durable Coverage Inventory
| Path (server-relative) | Intent / link | Validity | Action |
| --- | --- | --- | --- |
| tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts | AC-001..005, SCN-001..007; four error + four streaming cases; one gated live | Still Valid after IR-001; original bodies/assertions remain | Execute then repeat; retain all 9 cases/live gate |
| tests/fixtures/claude-owned-sdk-cli.mjs | No-model stdin EOF child lifetime | Still Valid, unchanged fixture | Reuse |
| tests/unit/runtime-management/claude/client/claude-sdk-{session-opening,process-owner,real-child-retry,streaming-session}.test.ts and tests/unit/agent-execution/backends/claude/session/claude-session-cleanup.test.ts | Public opening, acquisition fences, actual SDK child, held-child retry, cleanup aggregation | Still Valid; direct child coverage complements scripted E2E | Run 5 files, expected 17 passes |
| tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts | SDK options/auth/query initialization at module seam | Still Valid; current fake includes initializationResult | Run bounded client/session regression group |
| tests/unit/agent-execution/backends/claude/session/claude-{session,session-manager,turn-tracker}.test.ts | Session continuation, error/interrupt/background identity/settlement | Still Valid; session helper mocks acquired handle, not opening | Run with client; do not overclaim process proof |
| tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts and tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts | Live paid CLI/model behavior, older openStreamingSession usage visible | Out Of Scope for no-model test-only repair; gated/stale tooling belongs separate Tasks | Not run, no skipped-suite pass claim |
| tests/integration/agent-execution/claude-session-manager.integration.test.ts | Mix of live gated and mock manager paths | Out Of Scope: narrower unit manager/session plus real target sufficient | Not run |
| Other Claude/UI/core/global suites | Unchanged production | Out Of Scope | No broad stale-suite/tooling expansion |

## Durable Coverage Decisions
Add/Update/Remove this API round: **None planned**. The implemented target already covers required real boundaries and every preserved scenario; no authority to add ninth ungated case or weaken original checks. Temporary failure-path checks rather than alter 8+1 scope. Reconsider only if a real gap emerges. No obsolete assertion removed; no compatibility-only coverage.

## Repository Coverage Execution Plan And Results
| Order | Case IDs | Command from workspace root (clean env) | Expected | Status / evidence |
| --- | --- | --- | --- | --- |
| 1 | LIFE-001 | pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-management/claude/client/claude-sdk-session-opening.test.ts tests/unit/runtime-management/claude/client/claude-sdk-process-owner.test.ts tests/unit/runtime-management/claude/client/claude-sdk-real-child-retry.test.ts tests/unit/runtime-management/claude/client/claude-sdk-streaming-session.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-cleanup.test.ts --no-watch | 17 passes, exit 0 | Planned; evidence/api-e2e/lifecycle.* |
| 2 | API-CL01..04, WS-INT, WS-BUSY, WS-RACE, WS-BG; LIVE-001 skipped | pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts --no-watch (optional reporting flags only) | 8 passes / 1 skip, zero unhandled, exit 0, child/IO/cwd cleanup | Planned; target-1.* |
| 3 | REG-001 | pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts tests/unit/agent-execution/backends/claude/session/claude-session.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-manager.test.ts tests/unit/agent-execution/backends/claude/session/claude-turn-tracker.test.ts --no-watch | All pass | Planned; regressions.* |
| 4 | TYPE-001 | pnpm -C autobyteus-server-ts typecheck | Production noEmit exits 0, not global test typing | Planned; typecheck.* |
| 5 | Reuse target case IDs | Repeat target at least twice, fresh HOME/TMPDIR each | Same counts, no owned leaks/unhandled errors | Planned; target-2.*, target-3.* |

## Test-Case Ledger Decision
Required: Yes — multiple material scenarios/repeats plus potential interruption. Canonical api-e2e-test-case-ledger.md initialized before execution. Reporter records target case transitions individually; wrapper checkpoints grouped lifecycle/regression checks immediately after process exit and before next command.

## Post-Repository Confidence Scorecard / Broader Decision
All seven mandatory categories: **Pending execution**, no pass/confidence assumed. Categories planned: requirement proof, boundary directness, mock gap, environment fidelity, lifecycle/recovery, user/browser/desktop (N/A: test-only backend transport no changed UI), durable relevance. Will populate after repository evidence. Broader decision pending confidence; candidate targeted Lifecycle harness-failure probe, not browser or paid inference. Real transport/process exercised already by selected E2E/units; no full product journey/desktop change.

## Temporary Executable Validation Plan
| IDs | Probe | Why temporary |
| --- | --- | --- |
| PROBE-BODY, PROBE-CLEANUP, PROBE-SETUP | Disposable sibling file reproduces exact helper prefix and adds operational failure assertions; real manager/socket/app/child except explicitly injected failure | Verify private harness internals on this repair without broadening approved eight+one suite; no new product policy. Remove executable sibling, retain generator/logs |

## Not Tested / Infeasible / Deferred
Paid/live inference deliberately gated; other OS process behavior not certified; frontend/desktop unchanged. Seven pre-existing focused test-typing/stub diagnostics documented upstream, excluded tooling Tasks not silently fixed. Final integrated rerun/user verification/merge remains Delivery. No material uncertainty identified that requires a model call.

## Ambiguities Or Reroute Triggers
None observed pre-execution. Actual product/lifecycle flaw or necessary production change => report Solution Designer before fixing and follow failure-origin route; never weaken assertion or silently broaden. Missing evidence is not a pass.

## Investigation Decision
Proceed to execution: Yes. Durable coverage edits: No. Reroute required: No. Post-repository confidence and broader-validation decision pending actual evidence.


## Completed Round 1 Evidence / Revised Decisions — API-REV-001
- Source under validation: 1f01e802bed7cc0bbead96ce076fa5686dace1c1; cumulative upstream checkpoint 40f993916c. No durable API edits or production changes.
- LIFE-001: 5 files / 17 passed, exit 0, no unhandled markers; 30.623s wall / 26.25s Vitest. Actual pinned SDK public hook and held-child retry ran. During first invocation the orchestrator incorrectly launched target-1 before lifecycle finished (approximately 8s overlap). Record this execution deviation rather than silently treating it as clean serial proof. No builds overlapped; both use worktree-owned tests/.tmp, so first target not treated as independently clean staged evidence.
- target-1: 8 failed / 1 skipped, exit 1; 12.981s wall / 9.36s Vitest; no unhandled markers; all eight report the same MCP cleanup TypeError plus retained-session assertion. Resource snapshots show no process group or owned cwd remaining.
- target-2: **serial** repeat after both previous processes returned, fresh HOME/TMPDIR; 8 failed / 1 skipped, exit 1; 8.912s wall / 7.12s Vitest; identical leaf errors in every case. This confirms the failure without the first overlap. No resource remnants or unhandled markers.
- API-F001: target line 233 supplies only activateForRun to ClaudeSessionManager. AgentToolMcpRunSessionAuthority explicitly also requires deactivateForRun(runId): number. Real ClaudeAgentToolsMcpSessionState.release (line 51) unconditionally calls it; teardown fails with `this.runSessions.deactivateForRun is not a function`. Exact session correctly remains registered because the MCP component proof failed; hasRunSession(false) then also fails. Source inspection confirms the deficient test double also exists at base 32aca0818e. It was previously masked by malformed Query opening. Baseline presence does not close the issue (TESTING.md Rule 9).
- All case error trees contain only those two leaves, no original behavioral/child-IO/body assertion error. Original streaming/error bodies reached completion, but **the cases still fail** and AC-001/AC-004/REQ-005 are not satisfied. No production defect is indicated by this failure; no production fix authorized or made.
- Coverage decision revised: target **Needs Update** for its local MCP authority double, not assertion removal or production safety weakening. Preliminary classification Local Fix / test fixture; recommended owner API/E2E, subject to Code Reviewer failure-origin confirmation. No repair applied pending that review.
- Planned broader client/session regression group, independent production typecheck rerun, third acceptance repeat and body/cleanup/setup probes: Not Tested this round. Stop further pass-oriented work because the exact target still fails; these remain required after rework. Implementation's 17 units/typecheck are upstream evidence only, not substituted for our unrun commands.

### Mandatory Post-Repository Confidence Scorecard
| Category | Score | Evidence / uncertainty | Evidence that could improve it |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 50% | All eight fail cleanup; body checks reached, but critical eight-pass/exact session release not achieved | Conforming test authority + full clean rerun |
| Changed-boundary execution directness | 95% | Real transport/domain/opening/owner/child/IO run; no production bypass | Post-rework repeated target |
| Cross-boundary integration realism and mock gap | 95% | Real WebSocket/session/process owners; actual pinned SDK child units complement scripted frames; paid inference not this scope | No live model needed for local malformed authority |
| Environment/configuration/identity/fixture fidelity | 90% | Fresh private HOME/TMPDIR and serial confirmation; MCP mock incomplete and initial accidental overlap documented | Repair fixture then serial reruns |
| Failure/edge-case/lifecycle/recovery evidence | 50% | Critical teardown stays failed, although exact physical child/IO checks do not fail and units pass | Target manager release + harness failure probes |
| User-surface/browser/desktop-shell | N/A | No rendered/frontend/browser API/native shell behavior changed; real ws server path already exercised | N/A |
| Durable regression coverage quality/relevance | 75% | Original cases relevant/preserved, but incomplete local authority makes every case red | Complete narrow test-only fixture and regressions |
- Overall: **75.8%**, simple mean of six applicable scores (455/6). Applicable categories below 90%: requirements, lifecycle/recovery, durable quality. Every critical executable AC directly proven: No. Default clean target 95%: No.
- Broader validation: **Not Required** for failure-origin assessment — exact repeated repository failure directly identifies the malformed local test dependency; actual process/opening/transport boundaries already exercised. Additional browser/desktop/live provider cannot supply its missing method. Repository rework/revalidation is required; this is not a Pass or a justification to omit post-rework regressions/probes.
- Ambiguity/reroute: API-F001 Local Fix; request focused failure-origin review. No requirement/design change or product fix needed on current evidence. Independent successful-test review remains Not Required — direct low-risk route; failure-origin review is separately Required.
- Investigation final decision: execution round complete, **Fail**. Hand off cumulative failure evidence to Code Reviewer under matching get_handoff_rules rule; no Delivery/pass handoff.
