# API/E2E Coverage Investigation — Legacy Docker Retirement

## Investigation Meta
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

## Routing Classification
Medium / High / Reviewed. Successful-output route: no matching rule; return to Code Reviewer caller under team fallback (no API-owned durable test delta). Proportional test-code review: Not Applicable — no API-owned durable changes; cumulative implementation test changes already received CRR-001 review. No risk downgrade.

## Current Requirement And Design Basis
R2 replaces repair with complete retirement of the sole-owned personal harness. Eleven tracked assets removed; root exclusion relocated; two guides and two existing test files changed. AC-007 removal, AC-008 preserved construction/release/public-node inputs and entrypaths, AC-009 source-only/no data operation, AC-010 current support references/guards, AC-011 contracts/licenses/gates. Critical AC proof must be direct at the approved source boundary. D3 authorizes only test-owned Python3.9/availability isolation; does not repair the supported apostrophe installer defect or allow green broad/image claims. Implementation Legacy/Compatibility Removal Check and Persisted Data Transition Check read: clean cut, Not Affected; no alias/migration/reset. Independently observed complete source delta matches initial allowlist; independent complete executable input audit completed Pass.

## Supported Scenarios And Real Usage
SCN-005 approved source retirement; SCN-006 retained source/release/multiple indexed nodes; SCN-007 existing resources remain externally owned; SCN-008 maintainers read current docs/run focused checks. Existing documented busy preferred port and first bind failure are supported SCN-006 edges, not hypothetical concurrency. Installer custom apostrophe path is supported but unchanged, separately owned IMPL-BASE-001. No added product scenario or contrived unsupported test. Do not execute old commands as still-supported use cases.

## Changed Behavior And Boundary Classification
| Boundary / behavior | Change | Coverage consequence |
| --- | --- | --- |
| Root deployment support/command closure BEH-005 | Removed | Exact absence, baseline sole-caller closure and current reference audit; no retired-image smoke |
| Current docs/source-test policy BEH-008 | Changed | Current relative links, monorepo guards and mutation sensitivity |
| Git saved-state exclusion BEH-007 | Changed owner; effective protection preserved | Project-rule-origin proof and both exclusion-loss fixtures; no real state access |
| Existing launcher test fixture | Changed test-only | Dual-Python cardinality, query/delegation/drift/busy/retry receipts, real policy |
| Production construction/launcher lifecycle BEH-006 | Preserved | Complete diff/input independence; executable fake-helper entry and launcher preservation checks |
| Backend/API/contracts/auth/frontend/browser/Electron/persistence/workers/distribution | No runtime change | Out of scope; no server/desktop build/install required for these source-only Python/shell tests |
External integration is packaging/command-reference wiring, not a new Docker/provider protocol. No changed runtime lifecycle or persisted-data transition. A guide may transit broad package COPY and change layer bytes; no full-image equality claim.

## Project Execution Discovery
Authorities read before planning: task-root AGENTS.md, DESIGN.md, TESTING.md and autobyteus-server-ts/AGENTS.md. Git/targeted directory inventory found no closer scripts/root-docker/server-docker testing or agent guideline. Root/server README Docker/local development sections, server Docker guide, recipe, build.sh, build-multi-arch.sh, docker-start.sh, server Compose, release workflow and relevant Python test sources inspected. TESTING.md requires smallest direct layer, clean HOME/TMPDIR, owned cleanup, skips not Pass, Rule9 small local corrections/separate product reporting. No conflicting instruction. Python source/fake checks are prescribed in D3/test headers; package pnpm setup is not needed because no JS application test/build runs.

| Configuration / surface | Learned execution/setup |
| --- | --- |
| scripts/tests/test_docker_build_context_sources.py | unittest from repository root; nine source checks; no daemon/download/key; owned fixtures for Git/mutations |
| scripts/tests/test_public_docker_launcher_shared_workspace.py | Python3.9+; optional fixture-local query double; default off; random allocation real; fake Docker has no real delegation; native collision may skip; pwsh parse needs pwsh |
| test_server_docker_browser_bridge.py | subprocess shell scripts with fake id/runuser/opener and disposable copies; no actual desktop browser |
| test_server_docker_cli_install_failures.py | production RUN extracted; fake npm/curl/install; no download/system write; empty HOME |
| test_server_docker_cli_latest_defaults.py | retained recipe/helpers/release source contracts, not installed CLI proof |
| check_licensing.py / check_repository_artifact_hygiene.py | source/tracked-artifact checks, no legal-policy/image certification |
| build.sh/build-multi-arch.sh | root-context monorepo, arm64 --load; explicit CLI cache buster; default and zh args; fake Docker only |
| docker-start.sh | creates package .runtime; do not run in actual worktree; if probed, copy unchanged helper/Compose/recipe into owned mirror before invoking up --build-local |

Component setup: `/usr/bin/python3`3.9.6, `/opt/homebrew/bin/python3.11`3.11.14, native `/bin/bash`3.2.57. Commands run sequentially in assigned worktree. Clean env only PATH, HOME, TMPDIR, PYTHONDONTWRITEBYTECODE; no inherited AUTOBYTEUS/provider keys. No secrets/accounts/seed/DB/service needed. TemporaryDirectory owns outer HOME/TMPDIR and nested fake state/workspaces/bin/listeners. Only its resources cleaned; evidence retained. No live Docker, current node/provider/process/user-profile operations.

## Existing Durable Coverage Inventory And Validity Decisions
| Path / tests | Intent / related AC | Decision | Action / rationale |
| --- | --- | --- | --- |
| test_docker_build_context_sources.py all9 | COPY source existence, all3 contracts materialized, exact removal, retained entrypaths/docs, Git/Docker exclusions, each11 resurrection/broken build/both ignore-loss fixtures; AC-007..011 | Still Valid | Execute; current singleton subjects align with R2 |
| Same file baseline all-server/legacy image mappings and allinone-only install assertion | Assert subjects R2 deliberately removes | Stale / Remove (already removed upstream) | Independently validate removal diff; retained monorepo assertions replace shared invariants; no replacement for unsupported old-image install |
| test_public_docker_launcher_shared_workspace.py sequential/retry | Exact names/counts/mappings/first fail/random retry; AC-008/010, D3 | Still Valid | Execute dual Python; equal cardinality before ordinary zip and external-only controller preserve intended policy |
| Same file new busy/delegation/drift cases | Controlled busy edge and fixture validity | Still Valid | Execute plus temporary permissive-double mutation and receipts; no product hooks |
| Same file other fake launcher/source/docs tests | Current multiple-node workspace/ownership/CLI preservation | Still Valid | Broader affected suite, truthfully distinguish fake operations from user Docker |
| Same file installer apostrophe case | Supported current literal install directory, --no-update-path guidance | Still Valid (known failing) | Rerun unchanged; retain IMPL-BASE-001, not remove/skip/waive or repair here |
| Same file native collision / pwsh parse | Actual host input / syntax with pwsh | Still Valid (environment-limited) | Let original prerequisite skips report; deterministic busy proof is not native certification |
| server browser bridge6 + CLI failure3/latest defaults9 | Preserved monorepo shell/materialization contracts | Still Valid | Narrow27 source/helper tests then broad affected suite |
| scripts/tests/server_docker_cli_smoke.py | Real installed CLI binary/platform proof | Out Of Scope | No runtime installer/CLI delta; no image/platform certification required by R2 |
| Licensing/hygiene checkers and tests | Existing source license/artifact policy | Still Valid | Run scripts (and licensing unittest if useful); unchanged policy |
| JS API/browser/Electron/provider suites | Unchanged app behaviors | Out Of Scope | Cannot add evidence for deleted support/source boundary |

## Durable Coverage To Add / Update / Remove This Round
None. Current implementation-owned guards cover every changed obligation and relevant negative control. No API-owned durable changes needed; no new framework/legacy smoke/CI. Temporary input/ref/helper/mutation checks validate this particular removal and fixture review without creating duplicate durable policy.

## Repository Coverage Execution Plan And Results
All planned commands run from task-worktree root in clean, owner-created HOME/TMPDIR; evidence under api-e2e-evidence/api-rev-001. Ledger required: Yes — meaningful multiple cases and broad suite interruption risk; initialized before execution.

| Order / ID | Command / method | Boundary / IDs | Status | Evidence |
| --- | --- | --- | --- | --- |
| 1 / API-001 | each interpreter -m unittest scripts.tests.test_docker_build_context_sources -v | AC-007..011; all9 including mutations/ignore origin | Pass:9/9 each | source-python39.log, source-python311.log |
| 2 / API-002 | each interpreter -m unittest [four affected/controller methods] -v | D3/AC-008/010; fixture/cardinality/real policy | Pass:4/4 each | affected-python39.log, affected-python311.log |
| 3 / API-003 | system Python -m unittest [source/browser bridge/CLI failures/latest-default modules] -v | Narrow27 preserved recipe/helper paths | Pass:27/27 | narrow-tests.log |
| 4 / API-004 | each interpreter -m unittest discover -s scripts/tests -p 'test_*docker*.py' -v | Broad affected preservation; expected sole BASE-001 failure and explicit platform skips | Fail:62/59 Pass/1 Fail/0 errors/2 skips each; BASE-001 only | broad-python39.log, broad-python311.log |
| 5 / API-005 | temporary audit.py: exact diff/bytes/caller/COPY/reference/link/safety audit | AC-007..011; no retained input consumer | Pass | input-reference-audit.log |
| 6 / API-006 | assertion-only fake Docker: real default/zh build helpers + owned docker-start mirror | AC-008 source helper/root context/variant chain | Pass | helper-probe.log |
| 7 / API-007 | temporary port_probe.py exported query receipts, default-off and permissive-double mutation | D3 availability boundary fidelity | Pass | port-probe.log |
| 8 / API-008 | licensing/hygiene + cumulative/index/worktree diff checks | AC-011 and artifact consistency | Pass | gates.log |

## Post-Repository Confidence Scorecard (Completed)
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

## Broader Validation Decision (Completed)
**Not Required — None.** Repository execution directly proves real changed source/support/ignore/fixture boundary and no material broader-validation risk for retirement remains. This is not merely a passing-test argument: complete pinned input/consumer audit establishes no removed dependency on retained construction/runtime, actual helper entrychain reaches existing root-context recipe and Compose, and current policy is executed rather than bypassed. Live image, browser, desktop/provider journeys would exercise unchanged runtime and not resolve a missing critical removal criterion. A guide can change broad COPY layer bytes; full-image equality/fresh-image certification explicitly not claimed. No running old image/node used as evidence. Any future new retained runtime/input impact/material consumer requires recovery and actual current-image proof as revised scope requires. Delivery must refresh/re-audit before merge. No instruction conflict or blocked required dependency.

## Temporary Executable Validation Plan
API-005 audit pinned base, all deleted subjects/retained blobs/reference/link/COPY; API-006 recording/strict fake Docker (unknown invocation fails) plus owned mirror; API-007 query receipts/default-off/busy mutation using actual public new-container. Save scripts/logs as evidence, not maintained regression suites. No permanent source edits.

## Not Tested / Infeasible / Deferred
Actual image build/start/default-zh release publication/real Docker sockets/PowerShell runtime: no changed executable construction, not required for R2; platform/native skips remain explicit. Full-image equality not asserted. Existing installer defect repair deferred to open TODO project_task_9599b2a7-3ae6-4e7f-9875-1e039f4db2e6 (backlog /project_task_manager, authorized recovery via Solution Designer); assertion unchanged. Moving-base consumer audit/integration, explicit user verification/merge/push Delivery-owned. Historical removed-image BAS-001/UD-002 evidence not a current validation result.

## Ambiguities Or Reroute Triggers
None requiring pre-execution reroute. New consumer/shared runtime/input change → Design Impact or Unclear to appropriate owner; unexpected failure → evidence-based origin review. Known BASE-001 remains open separate product risk under explicit D3 disposition, not new retirement failure.

## Investigation Decision
Proceed: Yes. Durable changes: No. Initial investigation persisted before final execution or test edits. Post-repository confidence96.4%; broader validation Not Required. Scoped round Pass with API-004 raw Fail explicitly carried under D3 separate-baseline disposition. No operational/data permissions inferred.

## Execution Update / Final Investigation Decision
Completed API-001..008 in planned order. No durable changes or validity reversal. API-004 remains raw Fail on both interpreters:62 run/59 Pass/1 Fail/0 errors/2 skips. The only failure is unchanged supported apostrophe installer test; original native8001 and pwsh skips retained. API-007 independently confirms native Bash parse-only failure, fixed inert input, and does not execute emitted guidance. Upstream ENV-001/002 resolution independently proven; no new regression or requirement/design gap. No reroute required; current-package first API round, not fabricated prior Pass. Resource cleanup solely owned temporary state; no user state read/modified. Authoritative report and API-REV-001 distinguish this scoped result from broad suite/product/image assurance.

## Routing Decision — Current Rules / Caller Fallback
get_handoff_rules consulted after completed artifacts: reviewed High-risk Pass routes to Code Reviewer only when proportional test-code review is required; direct Delivery rule requires Low risk; failure-origin and pre-execution gap rules do not match this scoped Pass. No API-owned durable test-code delta exists, and cumulative upstream tests already have CRR-001 review, so **no rule matches**. Apply team caller fallback: return completed result to requesting `/software_engineering_team/code_reviewer` (exact known canonical caller), not direct Delivery or duplicate notifications. Request its applicable downstream continuation using this cumulative evidence; no extra test-code review or failure-origin review asserted required by API. Medium/High preserved. Handoff success will be stated only on tool confirmation.

## API-Owned Final Artifact Formatting Iteration
First staged `git diff --cached --check` failed on two trailing spaces in API-owned input-reference-audit.log headings. Local report/evidence formatting cause, not a source/test/product failure. Raw first capture and exact failed-gate diagnostic retained as `api-e2e-evidence/api-rev-001/artifact-formatting-attempt.json`; only two heading suffix spaces normalized and temporary audit logger corrected to avoid them. Assertions/execution results unchanged; no durable coverage edit or upstream rework. Final staged gates rerun below/ledger, original unsuccessful attempt retained. This is resolved API-owned Local Fix, not a surviving failure or reason to silently suppress BASE-001.
