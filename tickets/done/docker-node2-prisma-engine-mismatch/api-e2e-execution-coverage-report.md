# API/E2E Execution Coverage Report — O1 Owned-Image Gate

## Execution Round Meta
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node2-prisma-engine-mismatch`, branch codex/docker-node2-prisma-engine-mismatch; bootstrap a609de982a22925299d550bea4084e578cc5cd60, reviewed preparation b504a1853a7c42f2eee02a69a7b48ffa2bd20328.
- Canonical package `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node2-prisma-engine-mismatch/tickets/in-progress/docker-node2-prisma-engine-mismatch`; all package-relative references resolve here.
- requirements-doc.md R2; investigation-notes.md; design-spec.md D1/O1; solution-revision-record.md SR-002 (SR-001 history); solution-handoff.md; cause-comparison.md.
- design-review-report.md / architecture-review-revision-record.md ARCH-REV-001; implementation-handoff.md / implementation-revision-record.md IR-001; code-review-report.md / code-review-revision-record.md CRR-001 operational preparation Pass, source-change review N/A zero delta.
- Supplements: investigation-evidence metadata/read-only helper and incoming operator context inventoried in solution-handoff. Historical factual evidence, not current validation; unknown writer remains unknown.
- Current API round1 / API-REV-001; previous result/confidence N/A. Delivery report/history N/A not yet performed; Product/UI N/A.

Coverage investigation api-e2e-coverage-investigation.md written before execution; ledger api-e2e-test-case-ledger.md initialized and updated per case; revision api-e2e-revision-record.md. Cumulative package reviewed, not legacy-retirement work. Small/High/Reviewed unchanged. No API-owned durable test changes: proportional successful test-code review Not Applicable, not direct Low-risk bypass.

## Latest Authoritative Result / Scope
**Pass — API-REV-001 owned same-image operational-input/startup gate,95.8% confidence.** Broader validation **Required — completed**, real CLI/lifecycle/HTTP. This is NOT actual node2/8003 recovery, live backup/data/control verification, whole O1 completion, changed-source validation, original Task completion or O2 resolver repair. API's role cannot mutate the user's target: ONLY Delivery after this gate performs authorized live operation. Critical API-owned proof complete; no dependency blocker/new runtime-input defect. No scores inferred from upstream preparation grade.

## Acceptance-Criteria Proof
Evidence folder `api-e2e-evidence/api-rev-001/`; exact commands/outputs in per-case JSON and retained runner/native helper. No user backup/data/secrets in evidence.

| AC / portion | Critical | Cases | Evidence | Result |
| --- | --- | --- | --- | --- |
| AC-003 O1 complete explicit pair/canonical DB/startup contract | Yes, current API gate | API-001/002/003/004 | API-001.json, API-002.json, native.cjs, supervisor-continuity.json, API-003.json/API-004.json and health JSON | Proven for O1 input; unchanged production deploy/P3005/real-error code not edited; O2 source tests deferred |
| AC-005 owned same-image operational proof/isolation/cleanup | Yes, current API gate | API-001..004 | image.json, ownership.json, private-fixture.json, cleanup.json, per-case/health JSON, run_owned.py | Proven; runtime-config-only, no changed-source build claimed |
| AC-004 actual live consistent backup/canonical custom targets/settings/key/mount/control/node2 readiness/running retention | Yes, Delivery gate | Not executed by API | R2/D1/implementation handoff defines required Delivery operation; isolated evidence is prerequisite only | **Not Proven — pending Delivery**, NOT Only The User Can Check and not scored as already complete |
| AC-006 cause/comparison/writer limits | Current factual basis | upstream evidence inspected + API-002 native proof | cause-comparison.md/investigation evidence/operator comparison + API-002.json | Current mismatch/pair contract corroborated; user's8001 comparison historical, no new control request by API; writer unknown remains unknown |
| AC-001/002, source portions003/005 and durable source007 | Deferred O2 | None O1 | R2/SR-002 sequencing | Not Proven in O1; not waived/canceled/completed |

Explicit user verification follows Delivery actual recovery; no claim that any untried behavior is only user-testable. Live operational preservation can be proved by authorized Delivery; ownership rather than missing secret/service prevents API from doing it.

## Changed Boundary / Executed Case Matrix
| ID | Surface | Observed | Proof |
| --- | --- | --- | --- |
| API-001 | Pinned complete non-ticket Git diff/public proposal | Pass:zero source/test/dependency/lockfile/recipe/launcher delta; exact two-value removal restores all template bytes; installed image ID/arm64 | API-001.json, image.json |
| API-002 | Owned container native metadata/exported environment owner/RPC | Pass:CLI/engines5.22, expected/query/schema605197351a3c8bdd595af2d2a9bc3025bca48ea2; listMigrationDirectories returns migrations; existing-env returns exact pair before nonexistent discovery/cache; canonical supplied DB beats stale env while unrelated sentinel preserved | API-002.json, native.cjs, ownership.json, private-fixture.json |
| API-003 | Normal image entrypoint and installed Supervisor | Pass:initial fixture-only autostart=false, actual backend STOPPED; final config restores original autostart and appends only approved two values. Supervisor reread says backend changed but does NOT start; named update starts backend. Actual pid510 inherits exact pair. Normal migrations log existing-env/success and HTTP200/statusok3times | API-003.json, API-003-health.json, supervisor-continuity.json |
| API-004 | Same owned data/backend restart | Pass:only owned backend restart, actual pid648,3 more HTTP200/statusok, >=2 existing-env startup records; same seven sibling PIDs remain. Both created owned containers removed/absence verified | API-004.json, API-004-health.json, cleanup.json, initial-proof/cleanup.json |
| API-005 | Artifact/source/license/hygiene/index audit | See final-gates.json and ledger | Zero production delta retained; upstream cumulative EOF diagnostic remains exit2, never falsely green |

Latest container api-o1-prisma-cbe8688f8f63, loopback port53136. No user volumes/binds; explicit tmpfs `/root` and `/home/autobyteus/data`mode0700 confirmed, known AGY/Codex/Claude sign-in files absent without reading contents. No signed-in CLI/model call. Seven ready siblings copyq/dbus/fcitx/socat/tigervnc/websockify/xfce retain same PIDs before reread, after reread, after update and repeat restart. Whole supervisor status exit3 remains due chrome FATAL/one exited startup helper, NOT all-program green; backend RUNNING/HTTP independently asserted. Not a user browser-service certification or authorization to fix profile/base image. Process-effective inspection outputs ONLY the two engine entries, no env dump.

## Confidence Scorecard / Broader Decision
| Category | Post-repository (API-001 only) | Final owned-image gate | Support / residual |
| --- | --- | --- | --- |
| Requirement/AC proof | 75% | 95% | Exact input/zero delta plus real native/RPC/normal HTTP; live AC-004 explicitly pending Delivery, not passed |
| Changed-boundary directness | 50% | 100% | Actual installed backend configuration and effective process pair; normal named update/start |
| Cross-boundary realism/mock gap | 50% | 95% | Real image/native CLI/schema deploy/repository/vault/app-data/HTTP; no Docker mocks. Owned pristine retained fixture not user's data |
| Environment/configuration/identity/fixture fidelity | 75% | 95% | Exact image arm64, installed5.22/605, tmpfs private HOME/data, sign-in files absent, no user binds/volumes, free loopback |
| Failure/edge/lifecycle/recovery | 50% | 95% | Reread doesn't start, named update starts, seven sibling PID continuity, repeat backend restart/health and cleanup; no new migration/bypass. Live target may reveal different data failure |
| User surface/browser/desktop-shell | 50% | 95% | Repeated actual REST HTTP200/status ok both starts; browser/Electron unchanged/unproven, not needed for backend pin |
| Durable regression quality/relevance | N/A | N/A | Runtime-config-only operational gate, no source/durable-test delta; existing contracts inspected, O2 owns future regression source changes |

Post-repository58.3%; final95.8%; scoped API-gate target95 met, no applicable final category below90. Required broader actual installed-image proof completed, closes real engine/Supervisor/environment/startup/HTTP gap. No worktree build required because O1 source/image unchanged; no modified dist/engine caches or registry pulls. Browser/Electron/client rendering not changed; no inference from older user node or process status alone. Residual actual live data/custom paths/backup/mount/control/user gates explicitly not passed and must block Delivery's full recovery claim until performed.

## Durable / Temporary Coverage / Validity
No durable source/test changes. Existing complete-pair/canonical DB regression assertions Still Valid and exercised through unchanged installed exported owner. Automatic resolver/cache tests Out Of Scope O1; not silently approving arbitrary-cache behavior, O2 requires proper durable correction. Temporary run_owned.py/native.cjs and owned container are appropriate single operational proof, retained evidence not new production hook/framework. No engine install/cache deletion/reset/ledger/P3005/migration suppression. No new format/compatibility fallback; normal shipped schema→repository/vault/app-data→HTTP writes only on owned private data. Fresh data and repeated same-owned-data startup do not certify historical user data.

## Execution Iteration / Evidence Limits
Initial successful native/start/HTTP proof had an empty initial RUNNING sibling set because siblings were STARTING; therefore the initial comparator was vacuous and NOT accepted as sibling continuity proof. Raw first attempt retained in initial-proof, investigation/ledger amended before second fresh-container execution; final runner waits >=7 ready siblings and proves nonempty PID continuity, plus explicit tmpfs/sign-in checks. This was API-owned fixture/evidence refinement, no product failure/source fix or suppression. Both cleanups verified. Initial optional image-template field inspection error corrected before execution; no missing image claim or hidden failure. Unmodified chrome FATAL in pristine owned base remains an explicit outside-backend environment limit; no new user-browser diagnosis or unauthorized repair.

## Cleanup / Safety
Only two uniquely labelled created containers/config/tempfiles were manipulated; removed with docker rm -f -v and inspect absence verified. No current user node/container/API/database/config/root-home/binds/volumes, other workloads or8001 used as test target; no full env/secret/history output, auth import, paid model, engine cache/root profile edits, dependency install/build/source injection or image change. Original upstream artifacts untouched. Live target canonical DB/root-key/settings/memory/custom locations and backup resolution deliberately left Delivery-owned; no default assumption. Local live pin persists same-container restart, NOT future recreation; O2 required.

## Handoff / Remaining Gates
Current get_handoff_rules provides High-risk Pass only when proportional durable test-code review required; direct Delivery rule requires Low. No durable API delta or gap/failure applies, so **no rule matches**; return result to Code Reviewer requester using team fallback, requesting prompt applicable continuation to Delivery rather than risk downgrade or duplicate dispatch. No failure-origin request/nonexistent changed-test review needed.
Only Delivery executes fresh exact node2 image/native pair/four named volumes/TWO binds and other-workload/8001 read-only controls; backend-writer quiescence; actual canonical affected targets; private0700/0600 consistent backup+original current config BEFORE writes; rederive atomic exact2values preserving current entries/owner/mode; reread/update only autobyteus_server, no unconditional duplicate restart; effective pair then normal repeated8003 health/settings/key/mount/control continuity; leave node2 RUNNING and require explicit user verification. Subsequent data/startup blocker preserves original state/backup and returns evidence without reset/ledger bypass/downgrade/blind restore/other-program/profile/cache repair. O1 receipt returns Solution Designer for O2/manager reconciliation. Original3466c3eb/restoration177e099f stay OPEN; no Terminal/publication/tag/release claimed.

API-005 final gates completed: licensing/hygiene/working/index and zero non-ticket production delta Pass; cumulative baseline-to-current diff --check remains exit2 ONLY upstream architecture report/history EOF blanks, exact raw diagnostic in final-gates.json. No normalization of externally owned documents, no all-green cumulative claim; Delivery docs finalization note, not runtime blocker.
