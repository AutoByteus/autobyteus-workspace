# API/E2E Test Review — fix-prisma-engine-discovery

## Review Meta
- Completed 2026-10-13; successful-test review round1, cumulative **CRR-003**.
- Trigger: API-REV-002 **Scoped Pass, confidence95.7%**; Medium/High, reviewed route unchanged. This is not an implementation score or Task acceptance.
- Reviewed HEAD `e3ec50c2fed2137664cca472cbc67e75cf5ca63e`; cumulative durable API changes at `dd7de6ed4607bfa43b830e5c80d291b5f41e0bdd`, unchanged since execution. Branch `codex/fix-prisma-engine-discovery`; source base `e22245f097c208e66065302cfc30814cc5ffd14f`.
- Requirements/investigation/design context: [requirements-doc.md](requirements-doc.md) R3 Approved, [investigation-notes.md](investigation-notes.md), [design-spec.md](design-spec.md) D1 Ready, [solution-revision-record.md](solution-revision-record.md) SR004 with earlier entries retained, [solution-handoff.md](solution-handoff.md).
- Upstream reviews/implementation: [design-review-report.md](design-review-report.md), [architecture-review-revision-record.md](architecture-review-revision-record.md) ARCH-REV001; [implementation-handoff.md](implementation-handoff.md), [implementation-revision-record.md](implementation-revision-record.md) IR001.
- Original source/failure-origin authority: [code-review-report.md](code-review-report.md), unchanged by this round; [code-review-revision-record.md](code-review-revision-record.md) CRR001 source Pass and CRR002 PB-001 disposition retained.
- Current API context: [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md), [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md), [api-e2e-revision-record.md](api-e2e-revision-record.md), [api-e2e-test-case-ledger.md](api-e2e-test-case-ledger.md). API-REV001 Fail92.1% remains historical, not rewritten by API-REV002 scoped disposition.
- Relevant supplements: root-cause-summary.md, delivery-custody-resolution.md, recurrence-findings-handoff.md and factual metadata/history inventory in solution-handoff.md. Historical operational receipts are not current-source proof or live authority. PB-001 historical handoff/V13/DR002 and manager candidate remain separate custody evidence.
- Delivery re-entry: N/A. Product/UI: N/A. Prior unresolved test-review findings: None; this is the initial successful-test review. CRR002 was focused failure-origin review, not a substitute.
- Guidelines: root/server AGENTS.md, TESTING.md current-build/Docker/isolation/public-data/cleanup/gate and Rule9 contracts; DESIGN.md and relevant startup/data-migration policies. No conflict or new discrepancy. Existing cadence exception is explicit; it is not a green-suite claim.
- Supported product scenario basis confirmed: **Yes**. R3 SCN001 normal server start and SCN003 supported managed recreation retaining HOME/data, REQ004/005 and AC004/006 independently establish the goal. D1 validation steps3–7 require the current-build/native baseline control and actual recreation. Historical observed version contrast establishes the fixture; the fixture does not invent a product scenario.

## Changed Durable Test Scope
Temporary probes, runners and logs are execution evidence, not additional maintained code under review. Paths below are relative to the worktree.

| Durable path | Change | Requirement / coherent responsibility | Notes |
| --- | --- | --- | --- |
| autobyteus-server-ts/tests/e2e/startup/prisma-engine-discovery.docker.mjs | Added | AC004/006: current-source native selection, normal no-pin startup and same-state container recreation | One gated lifecycle harness; API002–005 |
| autobyteus-server-ts/package.json | Updated | D1 discoverable execution command | Only `test:e2e:prisma-engine-discovery:docker` script added; no dependency change |

No durable test file changed: **No**. Removed paths: None. Owner unit coverage was already reviewed in CRR001; no reopening or duplicate harness required.

## Proportional Test-Code Checks
Line references below refer to the durable harness, not source-size thresholds.

| Check | Result | Evidence / notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Header1–30 states prerequisites, gate, command, four cases and limits; case transitions216–270 distinguish build, native control, startup and recreation. |
| Assertions prove approved requirements rather than incidental details | Pass | Whole-dist audit218–239 proves current-build boundary; real native revisions/RPC140–176 distinguish wrong cache from matching bundle. Health178–200 requires repeated actual200/statusok plus normal migration success/no pins. GraphQL-created data is read and compared after a distinct container is created257–270; wrong-cache hashes remain equal. These support AC004, not all-history or whole-product certification. |
| Fixtures/helpers reuse meaningful repetition | Pass | Shared command receipts, manifest, mounts, start, health, GraphQL and owned removal functions; same HOME/data/dist closure reused across both lifecycles. Exact historical resolver is transpiled for a negative control, not copied into production. |
| Isolation and determinism fit the boundary | Pass | Opt-in41–44; immutable local image53; private root/home/data59,126–130; official pinned/checksummed native fixture241–251; unique names/labels; free loopback mapping179–181,209. Bounded command/fetch/RPC/readiness waits. Cleanup97–123,272–273 verifies labels and absence, never prunes, and retains bind roots if an owned container may remain. Header requires clean environment and serialized builds. |
| File remains coherent and navigable | Pass | One startup/native/recreation journey with grouped helpers and case IDs, not unrelated product scenarios. No forced split or implementation-source size audit. |
| No stale, duplicated, unjustifiably disabled or compatibility-only tests | Pass | Costly Docker execution has a documented opt-in; gate-off explicitly says SKIP, not Pass. Original resolver/c299 fixture is a required regression control. Existing selection units and native lifecycle proof cover different boundaries. |
| Durable coverage matches investigation/execution evidence | Pass | Exactly two API durable paths; package delta is only the named script. API002–005 raw events/native/HTTP/recreation/cleanup correspond to assertions. API-REV002 changes disposition/artifacts only; no fresh execution implied. |
| Test fixtures reproduce an independently established scenario | Pass | R3 SCN001/003 and actual retained-cache mismatch precede the test. Own CLI root-pnpm graph, unrelated cached revision and same-state recreation represent that approved lifecycle, not cache-tampering or speculative concurrency requirements. |
| Entry and sequence follow real actor/system steps | Pass | Normal shipped entrypoint starts backend/schema before HTTP; no engine process pins or startup bypass. Public GraphQL creates the representative definition. First container is removed and absence checked before new creation over identical owned mounts; this is not only a restart or reset. Installed/bootstrap SKIP_SYNC default is already1; explicit1 does not bypass migration startup. |

### Evidence and Review Execution
Independent read-only audit: [code-review-evidence/crr-003/test-review-audit.json](code-review-evidence/crr-003/test-review-audit.json). It verifies two-path scope, exact script-only change, unchanged executed durable inputs/policies, all69 retained raw evidence hashes, and critical proof receipts. No source/test edits, suite rerun, build, Docker command, user-node probe or model operation were needed for this review. No new source score or validation-confidence calculation.

Retained API-REV001 native proof: immutable `sha256:1779a6e136a2fcd48a3045687a88ded45628e306471f5fd9d3eb4321017b21fa` **plus read-only current server dist**, with4559 entries audited and only migrations.js/migrations.d.ts.map different. Actual original resolver selects c299 and native RPC returns-32601; current bundle605 native version/RPC succeeds with27 migration directories. Both normal startups reach three consecutive200/statusok responses. Container0407073a… is removed; new8ac4a1ac… preserves API data and wrong-cache bytes. Exact owned cleanup succeeds. Direct receipts are indexed in the API report AC004 row and `api-e2e-evidence/api-rev-001/docker-attempt-1/`.

This is LinuxARM64 native proof, not x64/Windows/AppImage/provider/UI certification. Image alone remains unfixed/unpublished. Full unit5455Pass/7Skip; focused197/197; full integration **371Pass/2Fail/68Skip, exit1**, diagnostic2Fail/5notselected remain unchanged. Later next-window assertions in the second failed cadence case were not reached. No skip or failed assertion becomes Pass.

## Findings
**None.** No actionable in-scope test correctness/quality defect, source regression revealed by weakened assertions, or requirement/design gap. Failure classification N/A.

## Follow-ups
No new follow-up. Existing **PB-001** remains the genuine unrelated streaming cadence defect established by CRR002, not repaired or waived. Custody already delivered to `/project_task_manager`; confirmed existing approval-pending candidate:
`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/task-plans/context/pb-001-agent-streaming-cadence-candidate.md`.
No matching TODO/IN_PROGRESS Task ID or repair dispatch exists. Six public context copies provide custody only. No duplicate manager notification or streaming scope expansion from this review.

## Latest Authoritative Result
- **Pass — proportional successful API/E2E test-code review, CRR-003.** Both durable paths reviewed; unresolved findings None.
- Recommended recipient: `/software_engineering_team/delivery_engineer`, subject to fresh configured handoff rule.
- Carry forward CRR001 source Pass, CRR002 out-of-scope origin/custody and API-REV002 scoped95.7%; not a full-integration-green or TaskDone declaration.
- Delivery owns cause-status/docs synchronization, moving-base material-input audit, applicable user verification and isolated source-only merge/push to origin/personal. No public image release/live rollout authorized. Unknown historical cache writer remains unknown; old-image pins are not recreation-safe source deployment.
- Preserve five untracked SDK/devkit/BriefStudio dist prerequisites; stage no generated prerequisites. Historical3466/177 stay DONE,06f7 CANCELLED; permanent6b8 remains active. No user nodes/8001/8003, credentials, backups, pins or data action authorized.
