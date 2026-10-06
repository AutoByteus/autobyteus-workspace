# API/E2E Test Review Report

## Review Meta
- Review Round: 1 (successful-test review); cumulative **CRR-002**, 2026-10-06.
- Trigger: API/E2E Engineer's **Pass / API-REV-001**, requesting proportional review of three durable coverage paths.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool`, branch `codex/create-or-update-project-tool`; base/target origin/personal `68261f8111e2f0eb119824c91a2650410c9aeffa`. No release requested.
- Test/evidence commit: `2253c6ee2b0ea57358dca0419e60439e9283907d`; current HEAD `4dd2df6e9` adds dispatch receipt only. Production source remains `3124a8bf6`; source diff since CRR-001 is empty.
- Canonical upstream directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool`. Requirements `requirements-doc.md` (SR-002/AP-001), investigation `investigation-notes.md`, solution history `solution-revision-record.md`, design `design-spec.md` (SR-003), solution handoff, architecture report `design-review-report.md` and history `architecture-review-revision-record.md` (ARCH-REV-001) retained as context. Relevant requirements/design/fixture contracts reread for this bounded review; no new intended behavior.
- Implementation context: current `implementation-handoff.md`, `implementation-revision-record.md` (IR-001) and `implementation-evidence/checks-summary.md`; only informational source-Pass additions since CRR-001, no source fix/new implementation round.
- Original source report: `/Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/code-review-report.md`, **CRR-001 Pass**, remains authoritative and unchanged.
- Review history: `/Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/code-review-revision-record.md`; current entry **CRR-002**.
- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/api-e2e-coverage-investigation.md`.
- Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/api-e2e-execution-coverage-report.md`.
- API/E2E history/ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/create-or-update-project-tool/tickets/in-progress/create-or-update-project-tool/api-e2e-revision-record.md`, API-REV-001, and `api-e2e-test-case-ledger.md`.
- Evidence: `api-e2e-evidence/checks-summary.md`, `final-regression.log`, `E-008.log` and indexed earlier attempts/results in the same task directory.
- Supplemental artifact: supplied Tools screenshot already reviewed in CRR-001; evidence-only, no normative Product design or new supplement. No further installed/private data inspection.
- Delivery revision / Product package: N/A — not applicable yet.
- API/E2E Result / Final Validation Confidence: **Pass / 95.83%**, attributed to API/E2E Engineer; not recomputed by test reviewer.
- Prior unresolved test-review findings rechecked: None — initial proportional review; CRR-001 source findings also None.
- Supported Product Scenario Basis Confirmed: **Yes** — approved SCN-001–004 / BEH-001–003 / REQ-001–006. No additional material ambiguity or behavior discovered.
- Skill boundary: separate proportional durable-test review only; no source re-audit, failure-origin review, source-size threshold or full scorecard. No default API/E2E rerun: assertions are judgeable from code/diff and existing successful evidence.

## Changed Durable Test Scope

| Durable Test Path (worktree-relative) | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts | Updated | SCN-001–004, AC-001–006; existing Task/context/form contracts | Selected real HTTP/native Project and Task boundaries, saved state/authorization/registered links/preservation | Fourth tool inventory; read-only mutator denial; two protected collision variants; E-005–007; original Task/context/full-form coverage retained |
| autobyteus-server-ts/tests/e2e/projects/project-mutation-node-locality.e2e.test.ts | Added | Node-local REQ-001/004/006; AC-002/005 continuity, BEH-003 | Two current-built nodes, remote identity/registration denial, current saved reads/restart/Manager definition | E-008; private HOME/DB/data, free ports, exact child ownership; no installed binary/model/UI |
| autobyteus-server-ts/tests/fixtures/project-mutation-http-node.mjs | Added | E-008 same governing locality/persistence/selection contracts | Current-dist Studio lifecycle + explicitly selected session fixture | Scripted session acquisition/unused throwing publisher only; no Project/store/registry/HTTP/auth mock |

- No durable test file changed: **No**. No removed path; removal diff N/A.
- Logs, compiler evidence config and reports are execution artifacts, not extra production/test paths subject to source auditing.
- Diff basis: CRR-001 final artifact commit `d3785f791` → current API package; all three durable files read independently, including fixture ownership/cleanup. Production source not reopened.

## Supported Scenario / Fixture Basis
- **SCN-001/002**: user asks selected agent to author or patch known Project. Tests script that actor at public native execute or selected HTTP MCP invocation, then read persisted values through GraphQL/list. Create versus explicit-ID patch, omitted metadata versus blank, compact result and invalid-name/ID rejection have independent approved requirements; endpoints/tests do not establish those scenarios by themselves.
- **SCN-004**: user supplies real registered IDs/full desired list for association changes. Fixtures register owned folders via public GraphQL; tool mutation uses returned IDs. Assertions prove replacement, retained description/root/addedAt, [] unlink-only and invalid-input whole-tree byte preservation. Public unregistration before retaining an already linked snapshot follows approved REQ-006's retained-link policy, not a fabricated race or new recovery promise.
- **SCN-003 / selection contract**: runtime explicitly selects capabilities. Authority acquisition is scripted, then real host/catalog/HTTP handles list/call/denial and configured-collision route. Exact selected list and read-only mutation rejection directly exercise approved permission contract. This is not evidence of Manager Chat reasoning or live-model tool choice.
- **Node locality / saved continuity**: user works with node-local Projects/registrations and later restarts the same application node. Two separate current-built processes exercise real registration/selected mutation/read; foreign IDs reject on the other node, same name creates a distinct local identity, graceful owned restart reads exact saved bytes without rewriting, then patch succeeds. Approved node-locality/data-continuity contracts, not generic ability to spawn processes, establish this basis.
- **Existing-data preservation**: E-007 creates Project/Task and uploads context through supported public APIs before mutation. A minimum current-format accepted assignment is seeded solely as representative existing persisted state. Its physical shape matches `src/projects/stores/task-agent-resource-schema.ts:parseEntry/serializeTaskAgentResourceFile`; normal `linkTaskAgentResource` + `settleTaskAgentResourceStart` can produce it. Real reader confirms expected business assignment before writes and exact bytes/business reads after. This does not certify live delegation/runtime liveness. Opaque history sentinel tests non-interference only, explicitly not replay/inference. No malformed-fixture scenario drives a product finding.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Existing API-MCP/API-FILES/API-AGG groups retained; E-005 metadata/validation, E-006 links, E-007 existing-data, E-008 node lifecycle explicitly named |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Saved GraphQL values versus compact acknowledgement; exact identity/createdAt and retained snapshots; omission/blank/replacement/[]; errors and full-tree/registry/source-byte comparisons. Current physical key set is established persistence contract, not arbitrary implementation preference |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Shared RPC/GQL/projectCall/error parity/snapshot/registerWorkspace helpers; collision parameterization; NodeFixture owns start/stop/GQL/call. Narrow fixtures remain locally coherent |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Owned mkdtemp roots, minimal child env/private HOME/Prisma DB, free ports, cleared/restored application flags, reset source services, registry definition restored in finally; readiness/status checks and bounded startup/exit waits. Existing serial suite uses distinct names and deliberately shared node; no concurrent tests/clock sleeps required |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | Original suite remains Project/Task public boundaries; process locality separated into focused sibling. No forced source-size splitting |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | Obsolete three-tool assertion replaced by four; original Task/context/full-form assertions retained, no skip added. Repeating idempotent patch through both transports deliberately confirms parity |
| Added, updated, and removed coverage agrees with investigation/execution evidence | Pass | E-001–008/P-001–004 ledger reconciles final 15 files/195 tests, no skips. Initial fixture/environment attempts retained and corrected; no production change/assertion weakening. Current build/typecheck/syntax and cleanup receipts indexed |
| Test callers and fixtures exercise independently established supported scenario rather than proving one by themselves | Pass | Approved REQ/SCN basis above governs assertions; representative assignment/sentinel/session scripting limitations explicit, no new recovery/concurrency requirement inferred |
| Each test enters through real scenario trigger and follows actor/event steps without setup real use does not produce | Pass | Mutation via native public execute/selected HTTP MCP, registration/public GraphQL and multipart context, saved read/owned normal restart; preexisting assignment fixture matches production-emitted schema before public mutation. No direct Project-store write/service bypass to create the changed behavior |

## Findings
**None.** No actionable test-code correctness, isolation, structure or requirement-proof defect evidenced. No speculative failure choreography or style-only preference promoted into a finding. No focused command needed; successful workflows not rerun.

## Evidence And Remaining Limits
- Independently read final-regression.log: **15 files / 195 tests passed, no skips**; API-owned execution, not reviewer rerun.
- Independently read E-008.log: actual saved/foreign-ID/registration rejection/postrestart/Manager receipts, 1/1 pass and owned cleanup receipt. Code verifies graceful child exit, public/private listener rejection and owned-root removal; both cleanups attempted.
- API build/bootstrap/source and focused changed-test compiler/syntax checks passed as indexed. Generic tsconfig TS6059/rootDir/config remains unchanged known failed limitation, not a repository-wide compiler Pass.
- Controlled authority/session acquisition, representative assignment/sentinel and no inference are accurately disclosed. Tests certify changed backend/native/MCP boundary and owned node lifecycle, not full desktop/Manager Chat/@/model choice/history replay/explicit user approval.
- Caller knowledge of actual workspace IDs/full desired list remains approved limitation; no discovery/registration tool/custom grants/running-session upgrade/auto-refresh introduced.
- No source/test fix authored, no user app/process/data accessed or stopped, generated SDK dist not staged. No browser/desktop process started by this review.

## Latest Authoritative Result
- Result: **Pass — CRR-002**.
- Changed durable test paths reviewed: all three listed above; no removed paths.
- Unresolved finding IDs: None.
- Failure classification: N/A — clean proportional Pass; **Medium/High Reviewed route unchanged**.
- Recommended Recipient: `/delivery_engineer`, subject to returned handoff rule.
- Notes: cumulative API-REV-001 passed package ready for delivery-owned integrated docs/product/user verification/finalization gates. Prior CRR-001 source report unchanged; no delivery or release approval inferred.
