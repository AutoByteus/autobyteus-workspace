# Code Review Report

## Review Round Meta
- Review entry point: **API/E2E Failure-Origin Review**; round 1; latest authoritative result **Fail / Local Fix**.
- Date: 2026-10-13; revision **CRR-001**. Prior canonical review/report/history: **N/A**, verified absent; no prior Pass inferred.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli`; branch `codex/claude-interrupt-resume-fake-cli`.
- Reviewed source: `1f01e802bed7cc0bbead96ce076fa5686dace1c1`; cumulative failure-package checkpoint `d1193a136098768672c39a2c0be8ec3c76202b49`.
- Approved context: [requirements-doc.md](requirements-doc.md), [investigation-notes.md](investigation-notes.md), [solution-revision-record.md](solution-revision-record.md), [design-spec.md](design-spec.md), [handoff-architecture-design-complete.md](handoff-architecture-design-complete.md), [implementation-handoff.md](implementation-handoff.md), [implementation-checks.md](implementation-checks.md), [implementation-revision-record.md](implementation-revision-record.md).
- Trigger/evidence authority: [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md), [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md), [api-e2e-revision-record.md](api-e2e-revision-record.md), [api-e2e-test-case-ledger.md](api-e2e-test-case-ledger.md).
- Related revisions: **SR-001 / SR-002 / IR-001 / API-REV-001**. Architecture-review report/history and initial independent source review: **N/A — not applicable**. Delivery history: **N/A**.
- Current review history: [code-review-revision-record.md](code-review-revision-record.md).
- Authorities applied: current worktree AGENTS.md, DESIGN.md, TESTING.md (including Rule 9), server AGENTS.md; code-reviewer skill/template and shared scenario/reachability principles, including design-examples Example 9. No applicable testing conflict identified.

## Routing Classification Review
- **Small / Low**, retained; initial route **Direct Low-Risk**.
- Selected entry: **API/E2E Failure-Origin Review — failure-origin exception**, not retroactive full implementation review or successful-test review.
- Evidence: correction fits the existing local test dependency in one E2E file; no production interface, ownership, persistence, policy or deployment change required.
- Review scope: **N/A (focused failure-origin)**. Structural audit, source-size thresholds and implementation scorecard: **N/A**; no source score or deduction invented.
- Successful-test review was Not Required for the initial direct route. This failed execution is not a successful-test result. API-owned repair must return through executable validation and the skill-required proportional review of its durable test change before delivery.

## Review Scope
Confirm API-F001 origin and final owning specialist only. Read the smallest relevant target setup/teardown, authority contract and real assembly, MCP release, component cleanup and exact-session removal. Independently inspect raw per-case serialized trees, commands/exits/resource receipts and base/current source.

No source/test fix or new executable scenario was authored. No test rerun was needed for origin confirmation: existing fresh serial target-2, independently inspected raw trees and current source establish the defect directly. This does not certify a repaired candidate. Full source audit, unrelated stale suites/global test typing, paid inference, browser/desktop, other OS and Delivery gates are excluded.

## Exact Failure Context
- Failing IDs: **API-CL01..04, WS-INT, WS-BUSY, WS-RACE, WS-BG**; LIVE-001 intentionally skipped.
- Expected (AC-001/AC-004, REQ-005): **8 passed / 1 skipped, exit 0, zero unhandled errors and successful exact all-component/session cleanup**.
- Observed target-1 and target-2: **8 failed / 1 skipped, exit 1**; no unhandled-error marker. Each completed ungated case has exactly two leaf errors: missing `deactivateForRun` TypeError and `hasRunSession` true-vs-false assertion.
- Exact target argv, cwd and environment receipt: [target-2.command.json](evidence/api-e2e/target-2.command.json). Command:
  `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts --no-watch --reporter=verbose --reporter=/Users/normy/autobyteus_org/autobyteus-worktrees/claude-interrupt-resume-fake-cli/tickets/in-progress/claude-interrupt-resume-fake-cli/evidence/api-e2e/case-reporter.mjs`.
- Execution mode: clean PATH + fresh private HOME/TMPDIR + explicit evidence knobs; RUN_CLAUDE_E2E, keys and app roots absent; real loopback WebSocket/production session-opening and owned Node child, provider initialization/frames simulated.
- target-1 accidentally overlapped lifecycle tail; not clean serial proof. target-2 started after both earlier processes returned and reproduced the same failure (7.12s Vitest / 8.912s wrapper).
- Evidence: [target-2.log](evidence/api-e2e/target-2.log), [exit](evidence/api-e2e/target-2.exit), [raw events](evidence/api-e2e/target-2.events.jsonl), [summary](evidence/api-e2e/target-2.failure-summary.json), [resources](evidence/api-e2e/target-2.resources.json), corresponding target-1 files, [upstream source analysis](evidence/api-e2e/failure-origin-source.md), and [independent reviewer receipt](evidence/code-review/crr-001-origin-check.json).

## Upstream Behavior And Production-Path Basis Confirmation
- **Confirmed**: SR-001 authorizes credential-free restoration, preserves all original scenarios and requires truthful owned cleanup; SR-002 retains real production owners and test-only scope. No business decision reopened.
- BEH-001/BEH-004: intended outcomes and governing contracts confirmed, but current fixture **does not satisfy** AC-001/AC-004/REQ-005.
- BEH-002/BEH-003: approved existing streaming/error scenarios remain the intended basis; no body-assertion leaf failure in observed runs, but complete cases remain **Fail**, not partial passes.
- SR-002 anticipated unchanged MCP double. The newly exposed missing member needs bounded conformance repair within the already authorized local harness, not an architecture/ownership or intended-behavior change.
- No newly discovered product behavior, requirement ambiguity or material scenario expansion.

## Supported Product Scenario And Reachability Gate
| Scenario / contract | Independent initiating basis and supported surface | Forward path / lifecycle / consequence | Evidence / validity / use |
| --- | --- | --- | --- |
| SCN-001; BEH-001; REQ-001/005; AC-001 | Developer/validator runs assigned credential-free regression and must finish without leaving owned resources; Task direction and TESTING.md, not this error tree, establish the goal | Public suite command → real WebSocket admission/AgentRun → retained Claude query → harness termination → real manager/component cleanup → exact removal or surfaced failure | Approved SR-001; SR-002 DS-001/004; target setup/withHarness/closeHarness. Supported Normal Scenario, reachable, Use |
| SCN-007; BEH-004; REQ-004/005; AC-004; AgentToolMcpRunSessionAuthority | Governing run-resource release contract applies when a created run session is closed, including a run with no exposed MCP tools; its authority always includes deactivation | Current scoped assembly supplies activate/deactivate → provider factory constructs manager → session retains same authority → closeRunSession → cleanup MCP stage → releaseAgentToolsMcp → deactivateForRun(runId). Manager removes exact session only after all stages succeed | Authority interface :39..44; default scoped authority :130..144; general supervisor :202..205; provider factory :171..175; manager :122..141; cleanup :25..42. Supported Explicit Edge Scenario, reachable, Use |

The malformed test double is **not** evidence that supported production assembly can omit a required authority member. Current real assembly has both methods. No contradictory/concurrent workflow or synthetic product defect is inferred.

### Candidate Finding And Mechanism Gate
| Candidate | Observation | Independent basis | Forward path / state / consequence | Evidence | Disposition / proportionate response |
| --- | --- | --- | --- | --- | --- |
| CR-C001 → API-F001 | Local authority double lacks mandatory deactivateForRun; unsafe cast hides incomplete shape | SCN-001/007 and the authority contract above | Opened query and completed case body reach normal owned teardown; MCP release calls absent member, cleanup rejects, manager retains exact session; all eight cases fail | Target :232..237 / :493..511; MCP state :49..52; raw trees in both runs, base/current comparison | **Promote**. Complete only this local authority double truthfully; preserve real cleanup and every assertion. No production accommodation or general fixture framework |

Material-premise gate: **Pass**; no new material product premise. Scenario gate: **Pass** (basis confirmed; executable acceptance still fails).

## Finding / Failure Origin

### API-F001 — Incomplete test MCP authority prevents exact cleanup
- Status: **Open**; blocking acceptance; classification **Local Fix — test fixture**.
- Requirements: REQ-001/004/005, AC-001/004; candidate CR-C001.
- Location: `autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts:233`.
- The manager receives `{ activateForRun: () => ({ kind: "not_exposed" }) } as never`. Its required `AgentToolMcpRunSessionAuthority` also declares `deactivateForRun(runId: string): number`.
- `ClaudeAgentToolsMcpSessionState.release:51` calls that method. The real scoped authority still supplies deactivation when activation returns not_exposed; with no activated entries its count is 0. not_exposed does not make the method optional.
- `ClaudeSessionCleanup:32..40` correctly records the failed MCP stage independently of process/listener/skills release. `ClaudeSessionManager:135..137` correctly does not delete the exact session after failed cleanup. The retained-session assertion is a consequence of the first leaf, **not a second production defect**.
- `withHarness:519..528` retains body failures alongside cleanup failures; independent inspection of both raw event files confirms only the two cleanup leaves. Original behavioral and child/retained-IO assertions produced no leaf failures. Nevertheless all eight whole cases are failed.
- Same incomplete double exists at base `32aca0818e`; restored query opening exposed it. TESTING.md Rule 9 requires fixing the local baseline defect, not dismissing it.
- Origin: **stale/incomplete test fixture**, not observed implementation-source defect, runtime-only provider behavior, or change after independent review. No previous independent source review occurred, so **earlier independent review gap: N/A**. The deficiency is statically detectable from the declared contract and local construction; implementation checks did not establish target acceptance.
- Required bounded correction: complete this local double against the current authority type (remove its shape-hiding cast), including truthful deactivation for a no-exposure fixture. Preserve real manager/component release and all current behavioral/initialization/child/IO/session-removal assertions. Returning 0 for genuinely zero activated entries is contract fidelity, not invented physical-release proof.
- Final owner: **API/E2E Engineer**, because the defect and correction are test dependency code, even though the preceding Query repair was implementation-authored. Reviewer made no fix. No product defect indicated in this failure path; any new actual product defect/production delta must return to Solution Designer before fixing.

## Classification / Required Return Path
- Review decision **Fail**; classification **Local Fix**; confirmed recipient **/software_engineering_team/api_e2e_engineer**.
- Applied get_handoff_rules: the single most-specific match is “When API/E2E failure-origin review confirms that the owning problem is in coverage, test code, fixtures, environment, execution, or reporting.” Exact returned recipient is **/software_engineering_team/api_e2e_engineer**; no implementation-pass, implementation-defect or upstream-impact rule matches.
- Complete the bounded test-only repair as a separately identified baseline fix; update cumulative API investigation/report/ledger/history and keep API-F001 open until verified.
- Execute the unchanged target acceptance serially in fresh private environments; require 8/1, exit 0, zero unhandled and exact cleanup, preserving all assertions. Resume proportionate deferred regression/typecheck/repeat and relevant harness-failure checks from the API plan; report every unrun limit.
- After API-owned repair and successful execution, obtain a **separate proportional test-code review** of the durable repair under the code-reviewer failure-rework workflow. This is not a full source audit and does not change Small/Low classification. No delivery advancement on this failure.

## Residual Risks / Docs Impact
- API lifecycle group reports 17 passes/5 files including actual pinned SDK/no-model child and held-child retry; not a substitute for failing target cleanup. Initial overlap is disclosed above.
- API resource receipts show no sampled owned process group/workspace remnant and private root removal; sampling is not exhaustive spawn-count accounting. Exact manager session cleanup **failed** and remains distinct from physical child/OS cleanup.
- No paid inference/other OS certification. Deferred API checks, seven upstream test-typing diagnostics and Delivery integration/user verification/merge remain uncompleted or excluded as documented upstream.
- Docs impact: ticket review/evidence and API rework history only; no product documentation/contract change needed. No merge/push/release claimed.

## Latest Authoritative Result
- **CRR-001: Fail — API-F001; Local Fix / test fixture; API/E2E-owned.**
- Entry: API/E2E Failure-Origin Review; supported scenario/material-premise gates **Pass**.
- Score summary: **N/A — no implementation scorecard**. Upstream API confidence 75.8% is not a reviewer source score.
- Initial architecture/source reviews **N/A — not applicable**; no successful-test report produced in this failed round.
- Next: bounded fixture correction → executable revalidation → proportional review of repaired durable test code. Production unchanged; requirements/design and Small/Low basis retained.
