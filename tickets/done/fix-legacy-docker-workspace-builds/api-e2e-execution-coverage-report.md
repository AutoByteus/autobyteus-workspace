# API/E2E Execution Coverage Report — Legacy Docker Retirement

## Execution Round Meta
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/fix-legacy-docker-workspace-builds`; branch `codex/fix-legacy-docker-workspace-builds`.
- Package: `/Users/normy/autobyteus_org/autobyteus-worktrees/fix-legacy-docker-workspace-builds/tickets/in-progress/fix-legacy-docker-workspace-builds` (all package-relative paths below resolve here).
- Approved requirements `requirements-doc.md` R2 / SR-005; `investigation-notes.md`; `solution-revision-record.md` SR-005..007; `design-spec.md` D3.
- Architecture: `design-review-report.md`, `architecture-review-revision-record.md` ARCH-REV-001/002 Pass.
- Implementation: `implementation-handoff.md`, `implementation-revision-record.md` IR-001/002.
- Trigger/source review: `code-review-report.md`, `code-review-revision-record.md` CRR-001 initial cumulative Full Review Pass; reviewed artifacts HEAD `6c4437f03caf3ecd683dcb0982aa43f461ec9477`.
- Source commits: `bf0d12776` retirement; separate baseline-labelled `c89005ed2` test correction. Bootstrap base `2756d7b298ca5b203ebd2310d172b37a5d381b5c`.
- Supplements read: `solution-handoff.md`, `usage-investigation.md`, `baseline-disposition.md`, `baseline-launcher-quoting.md`; IR/CR evidence inspected as externally-owned results, not API proof. Historical BAS-001 attached report, validation-only remote Dockerfile/log and AGPL UD-002 handoff/report remain unchanged context (absolute inventory in solution-handoff.md).
- Delivery report/history: N/A — no delivery round exists. Product/UI: N/A — not applicable. No current-package prior API result or confidence exists.
- API round 1 / API-REV-001; canonical `api-e2e-test-case-ledger.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`.


- Coverage investigation: api-e2e-coverage-investigation.md (written before execution); completed ledger: api-e2e-test-case-ledger.md.
- Current revision/round: **API-REV-001 /1**. Prior result/confidence: **N/A**. Latest authoritative round: this initial independent execution.

## Routing Classification
**Medium / High / Reviewed**, unchanged. Successful-output route: caller fallback to Code Reviewer; see Routing Decision. Proportional test-code review **Not Applicable — no API-owned repository-resident durable changes**. Cumulative two implementation test files already covered by CRR-001; retained temporary evidence scripts are not a maintained new test suite or production module. No source-review bypass/risk downgrade.

## Investigation And Execution Basis
Complete cumulative R2/D3/SR-005..007/ARCH-REV-001..002/IR-001..002/CRR-001 package read, including original closure, legacy removal/data check, recovery/baseline supplements and historical BAS-001/UD-002 attribution. Independent coverage investigation completed before execution. Plan followed; no material deviation or durable/validity change. Initial narrow9→affected4→narrow27→broad62→audit/helper/receipts/gates executed. Existing assertion and missing-subject validity were checked against approved behavior rather than accepting tests as authority. No new regression/retained consumer/input change, no failure-origin reroute needed for retirement. D3 explicitly permits progression with unrelated separately registered BASE-001 still Fail/Open; not a silent waiver.

## Test-Case Ledger Reconciliation
Canonical ledger initialized before execution and updated immediately after each case: Yes.20 Started/Completed events (including final API-008 artifact-gate attempts), no running/unstarted/interrupted case. Seven cases Pass; API-004 raw Fail retained. Every underlying broad run's two skips are explicit Not Tested, not Pass. No summing overlapping suites as unique coverage and no prior-result inference. Report owns round-level scope/result; ledger preserves raw cases.

## Compatibility / Legacy Scope Check
No compatibility wrappers, aliases, old executable recipe/Compose/command path or compatibility-only coverage observed. User-approved clean cut removes entire sole-owned closure. Root docker/.runtime exclusions and historical records are purposeful data protection/context, not retained support. Persisted-data transition **Not Affected**: no schema/read/write/storage/identity changes, no migration/import/reset; no user data or representative existing records accessed. Existing resource operation code is unchanged and not executed against live Docker. Only owner-created test fixtures cleaned.

## Changed Boundary And Evidence Matrix
| Case | Approved behavior / criteria | Surface / evidence type | Observed result | Evidence under api-e2e-evidence/api-rev-001/ |
| --- | --- | --- | --- | --- |
| API-001 | BEH-005/007/008; AC-007..011 | Durable unittest source, real Git rule + disposable mutations | **9/9 Pass on each Python3.9/3.11**,0 skips | source-python39.log, source-python311.log |
| API-002 | BEH-006/008; AC-008/010, D3 | Durable actual launcher policy→controlled availability→fake Docker | **4/4 Pass each**, exact cardinality/mappings, retries/busy/drift/delegation | affected-python39.log, affected-python311.log |
| API-003 | Retained recipe/helper contracts; AC-008/010/011 | Durable narrow source/browser-bridge/CLI fail-closed/defaults | **27/27 Pass**, Python3.9 | narrow-tests.log |
| API-004 | AC-008/010 preservation; separate baseline product risk | Durable broad source/fake suite, both runtimes | **Fail on each:62 run/59 Pass/1 Fail/0 errors/2 skips, exit1**, BASE-001 only | broad-python39.log, broad-python311.log, repository-results.json |
| API-005 | Exact closure, preserved inputs/consumers/guides/data non-operation; AC-007..011 | Temporary pinned complete diff/bytes/reference/COPY/link/unchanged assertion audit | **Pass**:11 deletes/5 modifications, no retained removed dependency; guide bytes can transit broad COPY | audit.py, input-reference-audit.log |
| API-006 | Source-build/helper/Compose/variants; AC-008 | Temporary actual build.sh + build-multi-arch.sh + owned unchanged docker-start mirror→recording strict Docker | **Pass**:3 build invocations root recipe/context/local-load, default/zh tags/cache args; Compose resolves existing path/owned env | helpers.py, helper-probe.log |
| API-007 | D3/AC-008/010 fixture validity; baseline cause | Temporary actual sequential/retry/busy entry/receipts; permissive-double negative control; fixed-input native parse-only | **Pass probe sensitivity**; BASE-001 native parse **Fail(exit2)** remains known product risk, not repaired | port_probe.py, port-probe.log |
| API-008 | License/materialization/artifact consistency; AC-011 | Source license/hygiene/cumulative/index/worktree diff gates | **Pass**, all exit0 | gates.log |

Exact commands/CWD/material clean configuration in logs and retained run_repository.py/run_probes.py; investigation table owns planned/completed commands. Both interpreters invoked explicitly: `/usr/bin/python3` and `/opt/homebrew/bin/python3.11`; affected four full method names in runner/results. Narrow command names all four modules, broad command `-m unittest discover -s scripts/tests -p test_*docker*.py -v`. Script execution uses clean explicit PYTHONPATH=worktree only for temporary probes. No current source silently mutated.

## Validation Confidence Scorecard
Scores are scoped to current R2 retirement/preserved-input no-regression, **not** broad product health or new-image certification.

| Category | Score | Direct supporting evidence | Residual uncertainty / possible additional proof |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 100% | Exact11/5 allowlist, absence, preserved bytes/consumer closure, current docs/ignore/license/contract gates directly prove AC-007..011 at approved boundary | No unproven critical scoped AC; refreshed integration base must be re-audited later |
| Changed-boundary execution directness | 100% | Actual source root checked; effective project Git rule origin; each retired-asset/broken-build/both exclusion mutations; D3 fixtures run dual Python with real launcher policy | No material uncertainty at changed source/test boundary |
| Cross-boundary integration realism and mock gap | 95% | Real source helper/build/Compose command chain in owned mirror plus pinned recipe/release/public-node byte audit; actual launcher commands with real random/retry | Docker daemon/registry/image externally mocked, not certified. These unchanged boundaries create no material retirement gap; current image would improve separate product assurance only |
| Environment, configuration, identity, fixture fidelity | 95% | Clean HOME/TMPDIR, native Bash3.2, Python3.9/3.11, default controller absent, absolute delegation, original names/mappings/counts | Native8001 prerequisite and pwsh unavailable skips explicitly not Pass; no new platform/runtime promise |
| Failure, edge-case, lifecycle and recovery evidence | 95% | Each11 reintroduction, retained build and both exclusion losses; busy input, first-fake-bind-failure/random retry; query/program/argument drift and permissive-double rejection | Actual Docker sockets not tested; BASE-001 remains open and independently parse-fails, outside current retirement correction |
| User-surface, browser and desktop-shell confidence | 95% | Applicable operational surface: current guides/relative links and documented source CLI entry executed with isolated fake dependencies | No changed browser/renderer/Electron shell. CLI invocation proof is not desktop/user verification or live-node certification |
| Durable regression coverage quality and relevance | 95% | Nine focused source guards and four controller/policy cases retain exact semantics/negative controls;27 narrow green; broad suite not suppressed | Bounded string/source invariants intentionally do not validate all Docker semantics; no obsolete-subject obligations retained |

Overall **96.4%** = (100+100+95+95+95+95+95)/7 =96.4286%, rounded1 decimal. Every critical AC directly proven at approved boundary: Yes. Applicable category below90: No. Default95 target: Yes. Known non-regression BASE-001 does not become Pass or disappear through this scoped score.


Post-repository **96.4%**; final **96.4%**; broader validation did not run, no score increase. All7 category scores unchanged as final. Direct critical proof Yes; target95 met; category below90 No. Score is scoped retirement assurance, not broad product/image/platform health.

## Broader Validation Decision And Execution
**Not Required — None.** Real changed boundary is source removal, supported refs/ignore relocation, and test fixture fidelity. Exact audit establishes retained executable construction/runtime/application/manifests/lockfile/licenses/release/public-launcher inputs byte-identical and independent of removed assets; actual helper command routing and real selector/random/retry exercised. Therefore no material changed-runtime risk requiring browser/server/desktop/provider/live Docker beyond repository proof. Mocked dependencies do not certify fresh image startup, native Docker sockets, registry/platform health or PowerShell. No current image built/pulled/pushed/started; no inherited image/node used as new-source proof. Broad server COPY can include changed guide bytes; full image byte equality expressly not claimed. If refreshed base reveals runtime/input/material consumer impact, return for design recovery/current-image proof. No required validation dependency Blocked.

## Platform / Runtime Targets
Observed macOS arm64, native `/bin/bash`3.2.57, system Python3.9.6 and Homebrew Python3.11.14. Explicit empty owned HOME/TMPDIR, no inherited AUTOBYTEUS roots/provider variables/secrets, no installation/build services/accounts. Real random ephemeral OS bind allocated and closed sockets within Python; no user listener stopped. Two original broad skips each: `test_preferred_port_collision_falls_back_for_that_service` (8001 unavailable for setup), `test_powershell_launcher_parses_when_pwsh_is_available` (pwsh not installed). Deterministic busy input is policy proof, not actual Docker/platform certification. No browser/device/locale/UI change.

## Durable Coverage Changed In The Codebase
**No** API-owned durable additions/updates/removals; proportional test review Not Applicable. Independently retained current9 source guards and4 affected/controller cases; removed upstream allinone/remote mappings and old install obligation are stale under R2 (no replacement for unsupported deleted subjects), with meaningful monorepo source/contracts invariants preserved. Original apostrophe installer assertion body AST-identical to base, neither suppressed nor changed. Temporary mutation changes only generated fixture Python executable; no source test/public runtime edit. Complete implementation durable paths still attached for cumulative context: scripts/tests/test_docker_build_context_sources.py and scripts/tests/test_public_docker_launcher_shared_workspace.py.

## Temporary Execution Methods / Mock Gaps / Artifacts
- audit.py: particular pinned-base blob/delta/consumer/COPY/link/assertion/historical evidence audit; not new generic packaging framework.
- helpers.py: strict recording Docker recognized version/buildx build/inspect/use and fixture-only compose up; unknown args exit97, no real Docker delegation. Actual helpers plus byte-preserved owner-created mirror, not real build/publish/container.
- port_probe.py: optional existing fixture controller returns exact availability inputs; real interpreter/random/selector/reservation/retry remain unchanged; exports12 sequential,8 retry +4 random-delegation and busy query/fallback receipts. Permissive available=True mutation causes unchanged busy assertion `8001 == 8001`, proving it cannot conceal fallback failure. Default fixture has no controller. Durable drift program/argument/delegation tests passed each interpreter. Fixed inert quote input checked using native Bash `-n`, no eval/execution of emitted guidance.
- Fake launcher Docker actions (including destroy/upgrade/reset paths in broad regression) only affect temporary recorded fake containers/state/workspaces; never user nodes/volumes/profiles.
- Browser opener/runuser/CLI installer dependencies are fake in existing preserved tests; no real browser privilege switch/download/provider/system install.
Retain scripts, logs, repository-results.json and probe-results.json under canonical evidence directory; clean transient generated binaries/mirror/state only. No broader test environment, actual image or application stack constructed.

## Known Baseline Failure / Exact Disposition
**IMPL-BASE-001 OPEN**, separate TODO `project_task_9599b2a7-3ae6-4e7f-9875-1e039f4db2e6`. Backlog `/project_task_manager`; separately authorized technical recovery through Solution Designer. Supported custom apostrophe installation path produces invalid printed Bash guidance in byte-unchanged entry_shell_quote under native Bash3.2. Broad test expects safely quoted export but observed emitted escaped-apostrophe text differs; full expected/actual traceback in each broad log. Independent fixed inert owner-function probe produces Bash parse-only exit2/unexpected EOF. Prior IR-001 base/current triage inspected, current public launcher bytes and test method identical to bootstrap independently checked. No patch, suppression, waiver, skip or repair Pass here. D3/SR-007 explicitly disposes separate product failure as non-regression without relaxing AC-007..011; this scope's criteria prove retained construction/inputs rather than all baseline product correctness. No duplicate product-task dispatch. ENV-001/002 independently resolved by dual-runtime original exact-cardinality/preferred/retry assertions and controlled query/delegation/drift/busy proof.

Original IR-00160 run/55 Pass/2 Fail/1 error/2 skips and IR-002 unsuccessful interpreter-spelling assertion attempt remain unchanged. Reviewer focused13/13 and implementation narrow/broad/helper results are upstream evidence only; this report's counts/logs above are independently API-owned. No all-green broad assertion.

## Result Summary
| Status | Cases / scope | Meaning |
| --- | --- | --- |
| Pass | API-001/002/003/005/006/007/008 | Source-retirement criteria and fixture/helper sensitivity proven |
| Fail | API-004; BASE-001 native parse inside API-007 | Known unchanged supported installer product defect remains open separate Task, not retirement regression or repaired result |
| Not Tested |2 underlying skips per broad run; live image/PowerShell/desktop/API/provider | Native collision/pwsh prerequisites unavailable; others outside changed boundary and not required |
| Deferred | Refreshed-base audit, explicit user verification, isolated merge/push | Delivery-owned; not claimed complete |

## Cleanup Performed
Owned outer HOME/TMPDIR and nested fixture bin/fake Docker/state/shared workspace/install profiles removed by TemporaryDirectory after each case/job; owned helper mirror/.runtime removed. Random socket probes close own sockets; native collision setup never acquired8001 and did not stop current listener. No real Docker resource/Buildx/user profile/data/workspace/provider/model operation or cleanup. Evidence retained. Concurrent Solution Designer informational solution-revision-record.md edit preserved unstaged; no upstream report/log/historical artifact rewritten.

## Preliminary Classification
No new in-scope failure finding, Requirement Gap, Design Impact or unclear scope. Existing BASE-001 is already separately classified product baseline, not API Local Fix or retirement-origin defect. No surviving test/environment/report rework required; final API-owned formatting iteration resolved as recorded. No successful durable-test review request because no API-owned changes.

## Latest Authoritative Result
- **Pass — API-REV-001 scoped retirement validation**, **96.4%** confidence, default95 target met, no applicable category below90.
- Broad suite is still **Fail**, each interpreter59 Pass/1 Fail/0 errors/2 skips of62; never changed to green by this round result.
- Every critical AC directly proven at approved source boundary: Yes. No missing critical proof.
- Broader validation: **Not Required**, for evidence-based boundary/input reasons above.
- Residual risk: BASE-001 separate open product Task, original platform/native skips, no fresh-image proof, moving-base consumer re-audit and Delivery/user gates remain.
- Proportional test-code review: **Not Applicable — zero API-owned durable coverage delta**; Medium/High unchanged.
- Next recipient: `/software_engineering_team/code_reviewer` via no-match caller fallback; no release/tag/finalization/user-verification claim.

## Routing Decision — Current Rules / Caller Fallback
get_handoff_rules consulted after completed artifacts: reviewed High-risk Pass routes to Code Reviewer only when proportional test-code review is required; direct Delivery rule requires Low risk; failure-origin and pre-execution gap rules do not match this scoped Pass. No API-owned durable test-code delta exists, and cumulative upstream tests already have CRR-001 review, so **no rule matches**. Apply team caller fallback: return completed result to requesting `/software_engineering_team/code_reviewer` (exact known canonical caller), not direct Delivery or duplicate notifications. Request its applicable downstream continuation using this cumulative evidence; no extra test-code review or failure-origin review asserted required by API. Medium/High preserved. Handoff success will be stated only on tool confirmation.

## API-Owned Final Artifact Formatting Iteration
First staged `git diff --cached --check` failed on two trailing spaces in API-owned input-reference-audit.log headings. Local report/evidence formatting cause, not a source/test/product failure. Raw first capture and exact failed-gate diagnostic retained as `api-e2e-evidence/api-rev-001/artifact-formatting-attempt.json`; only two heading suffix spaces normalized and temporary audit logger corrected to avoid them. Assertions/execution results unchanged; no durable coverage edit or upstream rework. Final staged gates rerun below/ledger, original unsuccessful attempt retained. This is resolved API-owned Local Fix, not a surviving failure or reason to silently suppress BASE-001.

Final staged-artifact gates: licensing/hygiene/index/worktree diff checks all Pass after explicit API-only staging; `api-e2e-evidence/api-rev-001/final-artifact-gates.log`. No upstream/source/test edit staged. Final artifact-only iteration resolved, not removed from history.
