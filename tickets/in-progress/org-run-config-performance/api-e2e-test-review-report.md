# API/E2E Test Review Report

## Review Meta

- Date / reviewer: **2026-10-04 (Europe/Berlin) / Code Reviewer**.
- Review round: **1** for proportional successful test-code review; cumulative code-review revision **CRR-005**.
- Trigger / API result: **API-REV-003 Pass / 95.00%**; broader validation **Required — completed successfully for approved local non-inference scope**. This report is the independent durable-test gate, not another API confidence score or delivery/user-verification result.
- Requirements / investigation / solution history: approved **SR-006** requirements-doc.md, frozen approval, investigation-notes.md / supplements / solution-revision-record.md; cumulative **SR-010** design-spec.md / architecture-design-result.md.
- Architecture context: design-review-report.md / architecture-review-revision-record.md, **ARCH-REV-001 Pass**. Implementation context: implementation-handoff.md / implementation-revision-record.md, **IR-002** current uncommitted source, IR-001 retained.
- Original source/failure review: code-review-report.md remains **CRR-004's focused failure-origin result**; CRR-003 historical source Pass/scorecard at evidence/code-review-source-result-crr003.md. This separate test review **does not rewrite or merge into that report or its scorecard**. Applicable latest test result is this report and CRR-005 in code-review-revision-record.md.
- Coverage context: api-e2e-coverage-investigation.md, api-e2e-execution-coverage-report.md, api-e2e-test-case-ledger.md, cumulative api-e2e-revision-record.md, **API-REV-003**. Prior API-REV-001/002 failures and CRR-001–004 retained.
- Supplemental context: performance-findings.md / launch-row-findings.md / investigation-result.md / design-guideline-result.md, all original approval/governance/raw evidence; TESTING.md and applicable AGENTS.
- Prior unresolved test-review findings: **no prior proportional report**; prior failure-origin **CR-002 / F-API-002** rechecked and resolved below. **CR-001 / F-API-001** qualified packaged resolution retained.
- Routing classification: **Medium / High unchanged**, reviewed route. Delivery / Product revision: **N/A — not applicable / not entered**.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance`, `codex/org-run-config-performance`; base `1b976216da0cbd0cc84fef3fe22a2739325b8ad3`, HEAD `f2dc1fd392201844bf28fdfdec26c7424a7ea7b2` plus current unstaged IR-002. No stage/commit/merge/push/tag/release/deploy authorization.
- Complete input: [api-package-index.json](evidence/api-package-index.json), **823 current references** (822 dispatched plus receipt), all **496 prior reviewer / 198 original upstream references** independently confirmed retained. No raw package replaced by review-local summaries.
- Supported product-scenario / governing-contract basis confirmed: **Yes**, bounded as follows. No new intended behavior or unsupported timing premise.

## Supported Scenario Basis

- **Native setup/teardown — CON-CR-002:** documented workspace native-to-web boundary and owned cleanup contract, TESTING.md:17,35–46,201–202, requirements-doc.md:71–72,81. Engineer runs existing native fixture; after underlying native setup returns, outer fixture acquires root/session resources, uses current real admission, and owns cleanup on success/rejection. Fault seams reject setup or report cleanup uncertainty; they do not fabricate successful admission or establish new product recovery behavior. Five defined teardown cases are proof of those cases, not every conceivable infrastructure/model failure.
- **Scoped history — REQ-006/007 and preserved validation/lifecycle:** operator authors a valid test-owned Org via public GraphQL, creates two fresh runs, reads active/stored admitted history, Stops/restores/restarts. Null/invalid-ID/schema rejection follows the existing explicit API/config contract. Deterministic repository-native model is a domain-contract prerequisite only; no inference or primary Codex acceptance substitution.
- **Org publication — REQ-007 preserved hierarchy/current updates:** ordinary operator brings a helper with a mention; scoped Agent messages it with an owned reference and delegates distinct Agent/Team copies, reconnects, Stops/restores. `autobyteus-server-ts/docs/modules/agent_orgs.md:139–145,244–285` independently establishes mention/admission, same-root addressing, first-message activation, task-copy ownership and lifecycle. Current public WS/GraphQL/scoped MCP/reference paths are used. Scripted AGY external actor emulates valid tool intent, **not** backend admission or successful publication, and does not prove provider inference choices. Foreign-root rejection is the current root-scoped command/reference contract.

## Changed Durable Test Scope

All paths below are under `autobyteus-server-ts/`. **Four round-3 changes plus one previously pending API-owned addition**; no removed paths. Temporary probes, snapshots, screenshots, instrumentation and performance scripts are execution evidence, not durable source under this review.

| Durable path | Change | Related scenario / contract | Coherent responsibility / review notes |
| --- | --- | --- | --- |
| tests/integration/agent-run-collaboration/native-compaction-root-fixture.ts | Updated | CON-CR-002; F-API-002 | Current `createCollaboratorAdmission` with same catalog/validateMany seam; single acquired-resource close path for sessions/root/native/directory; attempts all registered cleanup and preserves original setup error |
| tests/integration/agent-run-collaboration/native-root-fixture-cleanup.integration.test.ts | Added | CON-CR-002 | Real Agent/hosted-Team successful teardown; native acquisition then root-directory rejection; post-root rejected admission with/without cleanup-report failure; call-through identity/path/termination checks and restoreAllMocks |
| tests/fixtures/agy-failure-cli.mjs | Updated | Documented scripted CLI / real scoped MCP boundary | Narrow linked-skills `CALL_TOOL` dispatch reuses actual capsule MCP client/config/headers. Existing `DELEGATE`, READ_SKILLS and other failure modes retained; tool errors stay errors, not fabricated successful tool events |
| tests/e2e/agent-org-runs/controlled-org-publication-http.e2e.test.ts | Added | REQ-007 preserved publication/identity/lifecycle; same-root contracts | One navigable public sequence: mention/candidates/admission → communication/reference → Agent/Team copies/checkpoints → negative ACK/null → reconnect/conversation/Stop/restore bytes. Existing owned AGY fixture reused |
| tests/e2e/agent-org-runs/scoped-org-history-graphql.e2e.test.ts | Added cumulatively; unchanged in round 3 | REQ-006/007, preserved config guards / persisted Not Affected decision | Existing built-process/bootstrap owner; singular/list parity, IDs/config, unrelated stored bytes, null versus error, Stop/restore/restart. Previously pending addition now reviewed; SHA `aff7553d61ced2d0c67d8e0ff88fa64d90716605f6aaf20c2ad7cc504265ef04` unchanged |

- No durable test file changed: **No**; `Not Applicable` does not apply.
- Reviewed current files and exact supplied delta, meaningful helper interfaces and direct execution evidence. No implementation-source line/delta limits, forced splitting or source score categories applied to tests.

## Proportional Test-Code Checks

| Check | Result | Evidence / notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Five paths each own one coherent fixture/lifecycle/publication/history concern; names and boundary comments make intent explicit |
| Assertions prove approved requirements rather than incidental implementation details | Pass | Exact root/member/task IDs/config and canonical bytes, truthful null/error/guards, candidate removal, correlated ACK, same-root reference bytes/404, real publication/checkpoint/reconnect/conversation and retained lifecycle assertions; UUID shape follows approved allocator contract |
| Fixtures/setup/helpers reuse meaningful repetition | Pass | Existing recovery/root fixture, AGY public-server fixture and built-process bootstrap reused; current admission factory and existing scoped MCP client used, no production compatibility export |
| Isolation and determinism fit the boundary | Pass | Owned temporary data/workspaces/databases, bounded event waits and command IDs, scoped contexts, environment cleanup; native spies restored and faults only reject. API raw cleanup confirms zero remaining owned roots/errors. Provider/model behavior explicitly controlled |
| Files remain coherent and navigable | Pass | Teardown cases separated; each HTTP file has one linear, related lifecycle/publication sequence. Existing CLI dispatch remains mode-based; no unrelated scenarios collapsed or artificial splitting required |
| No stale/duplicated/disabled-without-reason/compatibility-only tests retained | Pass | Obsolete admission import/call removed. Original workspace FIFO/history/attachment/dedupe/hydration assertions unchanged. AGY opt-in gate follows TESTING.md; its final selected execution is 25/25, while separate E06's 7 nonselected skips are explicitly distinguished |
| Changed coverage agrees with investigation/execution | Pass | Current five hashes/delta match API inventory; native2 + teardown5 + shared16 + Org public1; final AGY25 and E06 1/7 nonselected logs inspected. Prior scoped HTTP1 receipt remains unchanged-source evidence, not a new round-3 rerun |
| Fixtures confirm independently supported scenarios | Pass | Operational native ownership contract and established Org mention/message/delegation/lifecycle docs above; downstream fixture/MCP/event cannot establish its own scenario |
| Real trigger and actor/event steps preserved | Pass | Normal public create/read/Stop/restore/restart and WS mention/Agent-scoped MCP tools; native boundary explicitly permits controlled model/provisioning/Apollo. No hidden store/source mutation or successful admission/publication replacement |

## Prior Finding Resolution / Evidence

**CR-002 / F-API-002: Resolved.** Current outer native fixture uses the existing real factory, handles acquired setup cleanup before returning close, and rethrows the exact original setup exception when cleanup reports uncertainty. New tests assert actual stopped native, inactive root and absent exact directories. API reran **the exact documented workspace command first**: guard plus **2 native cases Pass**, **5 teardown Pass**, **16 shared caller Pass**. Original workspace assertions unchanged. No obsolete runtime alias, green admission mock, web/core import shortcut or product FIFO fix.

**CR-001 / F-API-001:** qualified API2 actual rebuilt root/member Retry resolution remains valid with unchanged production/artifact; no blanket different-runtime healing or packaged high-preselected preservation claim introduced by these tests.

Independent static checks in [code-review-test-checks-crr005.json](evidence/code-review-test-checks-crr005.json): five current durable hashes match, supplied tracked fixture delta exact, **62 reviewed source/test continuity hashes** match, server production source unchanged, frozen approval unchanged, whitespace checks Pass, all **823** input references exist and prior complete inventory retained. Actual Org-chain capture has collaborator/communication/task publications, **4 accepted + 1 rejected ACK**, two distinct task copies, same-root restore and clean owned shutdown. No reviewer test/app rerun: assertions are judgeable from current code/diff and successful raw receipts; default full validation repetition unnecessary.

## Findings

**None.** No unresolved durable-test quality/correctness finding, design impact, requirement gap or held material premise. Prior CR-002 is resolved in CRR-005; pre-existing-origin attribution and CRR-004 failure history remain, not erased.

## Latest Authoritative Result

- **Result: Pass — proportional successful durable test-code gate.** Five cumulative paths reviewed; unresolved findings **None**. **Medium / High unchanged**.
- API execution remains **API-REV-003 Pass95.00%, broader Required completed**, not reviewer execution or rescoring. Primary exact Codex packaged/performance, approved-base current-reader continuity and cleanup evidence remain API-owned and separately qualified. No inference-quality/absolute/live-user latency guarantee inferred from scripted/native tests.
- Recommended next owner: **/delivery_engineer**, subject to fresh current handoff-rule lookup. Delivery must own docs sync, explicit user verification, finalization and any separately authorized operations; this review does not declare Delivery Completed/Terminal.
- Residuals preserved: structural admission/full resync, synchronous provider scheduling, exact user's live workload and bounded scripted external-actor gap; standalone Vue typecheck unavailable/not Pass. SDK dist outputs removed after API work: **server prebuild required before further server checks/runtime**, current core outputs as applicable.
- No reviewer source/test edit, app/test execution, user-data action, stage/commit/merge/push/tag/release/deploy/inference. Applicable historical `code-review-report.md` left untouched; this separate canonical report and cumulative record carry the current test result.
- Routing status: fresh current **rule 9** selects only **/delivery_engineer** for proportional durable-test Pass; [handoff-rules-crr005.json](evidence/handoff-rules-crr005.json). Complete [code-review-package-index-crr005.json](evidence/code-review-package-index-crr005.json) attached. Single handoff confirmed **accepted=true / DELIVERED** to **/delivery_engineer**, run **delivery_engineer_58b6618ef4384a39b208f1336be863c7**, **831 references** dispatched; [receipt](evidence/code-review-test-handoff-receipt-crr005.json) appended afterward (832 current inventory references). Reviewer stage complete; no additional recipient or polling.
