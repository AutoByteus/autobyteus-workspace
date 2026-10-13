# Code Review Report — Permanent Prisma Engine Discovery

## Review Round Meta
- Review entry point: Implementation Review; round 1; **CRR-001 / Full Review**, completed 2026-10-13.
- Task: `project_task_6b8c9612-c94b-4d62-8053-00ef94bd94df`; package `fix-prisma-engine-discovery`. This is not either operational-repair package.
- Requirements/investigation/design: [R3 Approved](requirements-doc.md), [investigation E001–008](investigation-notes.md), [D1 Ready](design-spec.md), [solution history](solution-revision-record.md) SR-004 (SR-001–003 retained).
- Architecture: [design review](design-review-report.md), [architecture history](architecture-review-revision-record.md), ARCH-REV-001 Pass/no findings.
- Implementation: [handoff](implementation-handoff.md), [history](implementation-revision-record.md), IR-001 initial baseline. Source `dd7be60ff6c732e0ddf6d9ac97a822bda8a85869`; reviewed HEAD `fec5a7b41aae7caf2246621348e843c3da509412`.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/fix-prisma-engine-discovery`; branch `codex/fix-prisma-engine-discovery`; source base `e22245f097c208e66065302cfc30814cc5ffd14f`; eventual target `origin/personal`, integration owned by Delivery.
- Trigger: Implementation Engineer's cumulative source/local-check completion; no triggering finding IDs or prior current-package source review.
- Revision record: [code-review-revision-record.md](code-review-revision-record.md). Prior authoritative result N/A; latest authoritative round 1.
- Current-package API/E2E and Delivery revisions/reports: N/A — not yet performed, required future gates, not inapplicable. Failure-origin inputs/commands: N/A for this entry point.
- Supplemental context: current solution handoff, cause brief, owned metadata attempts, recurrence snapshot, superseded R2 and custody/relay records; external finalized cause/investigation and recurrence receipt under `/Users/normy/autobyteus_org/autobyteus-delivery-records/docker-node2-prisma-engine-mismatch/`. These establish historical facts only, never source approval or authorization to repeat a live action. No normative or Product/UI supplement.
- Authorities: code-reviewer skill, shared design principles and Example 9, report/history templates; current root/server AGENTS, DESIGN, TESTING, startup initialization and data migration guidelines. No closer startup/test policy found. Implementation skill's API/E2E ownership rule independently checked.

## Routing Classification Review
- Task size **Medium**, architectural risk **High**, unchanged. One existing production owner, two owner-unit files and a still-required downstream lifecycle harness/script; automatic native execution feeds the shared schema-startup prerequisite.
- Independent source review required: Yes. Selected route: Implementation Review, then independent API/E2E on Pass. No classification correction.

## Review Scope
Full cumulative review of all three non-ticket changes: `autobyteus-server-ts/src/startup/migrations.ts`, `tests/unit/startup/migrations-prisma-engine-env.test.ts` and new `tests/unit/startup/migrations-command.test.ts` (test paths relative to server package). Read complete owner/tests, diff from source base, callers, packaging and relevant reports/evidence, not merely latest commit.

Excluded: user nodes/ports/data/credentials/backups/pins, operational recovery, providers/models, dependency/schema/recipe/launcher changes, publication/rollout, unrelated baseline defects. Reviewer ran only isolated owner-unit checks and read-only source/artifact audits. No Docker command, live probe, full server startup, engine install, source/test edit or API journey.

## Upstream Behavior And Production-Path Basis Confirmation
**Confirmed** — R3 scope guardrail and D1 Change Scope remain authoritative. Automatic discovery changes; invocation, explicit inputs, native target preference and normal migration/error/persistence lifecycle do not.

| Behavior / criteria | Actual source and forward-path confirmation | Result |
| --- | --- | --- |
| BEH-001 / AC-001 | Normal configured startup → `server-runtime.ts:118` → common migrations → local CLI. `migrations.ts:86–103` realpaths that CLI, resolves its engines manifest, then its engines-version JSON. `105–144` selects only within that associated package. Docker root/app node_modules copies and package-local `pnpm deploy --legacy` retain the graph; flat and both symlink layouts are covered. | Confirmed |
| BEH-002 / AC-002 | Immutable native fallback and retained-HOME recreation → same owner → associated bundle, otherwise only `cacheRoot/engineRevision` (`146–169,185–193`). Complete matching target pair required; old all-revision/mtime selection removed. Missing identity returns null, leaving the CLI's own behavior/error, not success. | Confirmed |
| BEH-003 / AC-003,006 | `server-runtime.ts:118`, standalone host `:115`, immutable-target secret importer `:60` still call `runMigrations` with their authoritative DB. Complete explicit pair `176–182` precedes metadata; env assembly `196–215` preserves partial semantics and supplied DB; exec/deploy/P3005/error `217–274` is byte-identical to base. Schema remains before repository/vault and normal app-data/readiness. | Confirmed |
| BEH-004 / AC-005,006 | Cause brief/history separates original same-image/different-cache failure, later recreation without pin, unknown historical writer, and separately reported operational recovery. No attribution invented. Brief's design-stage status is intentionally pending Delivery sync with actual source/API outcome. | Confirmed; downstream docs update pending |
| REQ-004 / AC-004 | Current-built Linux native baseline/control, automatic startup/HTTP and actual same-home/data container recreation are mandatory downstream API work, not satisfied by owner-unit or macOS deploy evidence. | Ready for next gate; not yet proven |

No changed intended behavior, additional production scenario or unclear architectural premise was needed to review this implementation.

## Supported Product Scenario And Reachability Gate

| Scenario / contracts | Kind, initiator and independent trigger | Forward path / lifecycle and consequence | Independent evidence | Validity / review use |
| --- | --- | --- | --- | --- |
| SCN-001 / BEH001,003 / REQ001,003 | System: supported server or standalone-host launch; Contract: user explicit-target secret import | Config/target → common schema owner → CLI/native engines → schema success or genuine error → repository/vault and caller readiness/result. Wrong engine can prevent a real platform prerequisite. | Approved R3; concrete three callers and startup policy; Dockerfile.monorepo:95–113, prepare-server.sh:174–239 | Supported Normal Scenario / Use |
| SCN-002 / BEH002 / REQ002 | Contract: immutable packaged native deployment uses retained matching cache when associated native pair is unavailable | Packaged launch → schema command owner → CLI-associated identity → exact-revision native cache → normal deploy/error. No attempt to write/copy into immutable bundle is added. | R3/D1; actual released v1.1.9 target mismatch in `tickets/done/linux-appimage-prisma-erofs/investigation-notes.md`, not only a fabricated missing file | Supported Explicit Edge Scenario / Use |
| SCN-003 / BEH001,002 / REQ004 | Operational: supported managed container recreation retaining HOME/data | New unpinned backend → normal startup → installed CLI plus retained unrelated cache → compatible automatic selection → schema/startup/readiness. Required validation must actually recreate, not only restart. | Approved R3 and saved historical control/RPC/recurrence facts E001/E005; user's permanent-fix/recreation direction | Supported Explicit Edge Scenario / Use |
| SCN-004 / BEH004 / REQ006,007 | User: explain observed node contrast and provide permanent source correction | Historical evidence → cause brief → source review/validation → source-only Delivery receipt, distinct from published-image rollout | Current dispatched Task and R3; cause/custody records | Supported Normal Scenario / Use |
| REQ002 missing/invalid metadata and no complete matching pair | Contract: opt out of custom injection if the installed CLI's identity/pair cannot be established | Same normal callers → metadata/pair lookup → null → unchanged ordinary CLI resolution/error; never substitute arbitrary revision or declare migration success | Explicit approved REQ002 and D1 selection contract, independent of new negative fixtures | Supported Explicit Edge Scenario / Use |

### Candidate Finding And Mechanism Gate

| Candidate | Observation / mechanism | Scenario/contract and independent trigger | Path, lifecycle, consequence and evidence | Disposition / scope | Response |
| --- | --- | --- | --- | --- | --- |
| CAND-001 | Real CLI dependency anchor and bounded identity read replace location guessing | SCN001/003, REQ001/002; normal packaged/workspace startup | `86–103` + `185–193`; installed manifest identity drives one bundle and exact cache subtree. Actual metadata E004, read-only source audit, real symlink fixtures and 38/38 owner checks support design conformity. | Promote / This ticket; required mechanism satisfied, no defect | Keep existing owner; no extra scanner/registry/version hardcoding |
| CAND-002 | Exact-revision cache fallback and metadata opt-out | SCN002/003 and explicit REQ002 unavailable-identity contract | `146–169`; complete pair within one revision/target, then null. Historical immutable package and incompatible retained cache establish the premise; tests confirm it, not create it. | Promote / This ticket; required mechanism satisfied, no defect | Preserve matching cache and true CLI errors; no legacy revision fallback or cache repair |
| CAND-003 | Preserve explicit pair, partial-env, DB and migration boundaries | SCN001, REQ003; configured launch/targeted import | Unchanged explicit/env/exec/deploy/error slices plus command controls, source trace and native local implementation log. Actual automatic selection never becomes DB admission. | Promote / This ticket; contract satisfied, no defect | No new schema/ledger/reset/recovery mechanism |
| CAND-004 | D1's Docker harness/script are absent at initial source review | REQ004/AC004; normal role-defined implementation → API/E2E sequence | Handoff explicitly assigns authoring/execution to API. Implementation skill reserves that work to API/E2E; D1 cases and paths remain required. No claim that absent code is implemented or that AC004 passes. | Reject as a source-stage defect; no deduction | Route to API with explicit required authoring/proof; do not waive, duplicate or send back solely for role allocation |

No held candidate, unsupported-concurrency hypothesis, new threat model or guessed cache writer affects this result. Native proof remains an upcoming acceptance gate, not speculative source machinery.

## Structural / Design Checks

| Check | Result | Evidence | Required action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | D1 local defect/missing invariant; old algorithms replaced within healthy owner | None |
| Matches approved behavior-defining supplements | Pass | No normative supplement; factual historical/custody boundaries preserved | None |
| Data-flow spine inventory clarity/preservation | Pass | DS001 server, DS002 host, DS003 importer, DS004 bounded selection traced above | None |
| Ownership boundaries | Pass | Callers retain config/DB lifecycle; migrations owns native command inputs | None |
| Off-spine concern clarity | Pass | Private package metadata lookup serves migrations, does not orchestrate startup | None |
| Existing capability/subsystem reuse | Pass | Existing startup owner; no engine service or caller-specific policy | None |
| Reusable owned structures | Pass | Existing pair shape plus private engineDir/revision; no copied cross-file model | None |
| Shared structure/data-model tightness | Pass | Two distinct identity fields, no optional kitchen-sink structure or persisted state | None |
| Repeated coordination ownership | Pass | Selection remains common to all three production callers | None |
| Empty indirection | Pass | New private helper owns actual resolution/validation; no forwarding-only layer | None |
| Separation of concerns/file responsibilities | Pass | Coherent schema-command boundary with small native-selection detail | None |
| Ownership-driven dependencies | Pass | Node fs/module primitives only; no package execution during metadata discovery | None |
| Authoritative Boundary Rule | Pass | Callers use runMigrations, not internal engine/cache lookup as a second authority | None |
| File placement | Pass | Production in startup, owner unit cases in tests/unit/startup | None |
| Flat versus over-split layout | Pass | No new subsystem/shared folder for this bounded concern | None |
| Interface/API/command boundary clarity | Pass | Pair/null API unchanged; caller's databaseUrl remains explicit authority | None |
| Naming-to-responsibility alignment | Pass | resolveInstalledPrismaEngineMetadata, engineDir, engineRevision are specific | None |
| Unjustified duplication | Pass | No new repeated policy; existing callers/command tail unchanged | None |
| Patch-on-patch complexity | Pass | Removes broader store/mtime policy rather than layering another rescue | None |
| Dead code removal in touched scope | Pass | listBundledPrismaEngineDirs and old cache-ranking state removed; remaining helper/export paths traced | None |
| Requirement-aligned tests/assertions | Pass | 30 graph/env/target cases and 8 command controls; full pair/null/env/call/error assertions | None |
| Reusable/coherent fixtures | Pass | Single graph builder, native-file pair builders, owned temp cleanup; clean native child only for absent metadata | None |
| Stale/duplicated/compatibility tests | Pass | Ownerless/arbitrary-cache acceptance replaced, no skip or relaxed assertion added | None |
| API/E2E readiness | Pass | Exact D1 harness path/script/controls and local build are ready; authoring/execution explicitly assigned, not prematurely passed | Complete downstream AC004 and broader validation |

## Source File Size And Structure Audit

| Changed implementation file | Before nonempty | After nonempty | >500 hard limit | >220 changed-line delta | SoC / placement | Classification / action |
| --- | --- | --- | --- | --- | --- | --- |
| autobyteus-server-ts/src/startup/migrations.ts | 280 | 243 | Pass | +60/-107 = 167; not triggered | Existing schema-command owner, bounded internal selection | No structural finding; no split required |

Tests are intentionally excluded from source thresholds. [Independent input audit](code-review-evidence/crr-001/input-audit.json) confirms only three non-ticket paths, unchanged command/types/native-platform prefix, explicit pair and env/exec/migration tail; no dependency, schema, recipe, launcher, caller or license input change. Source SHA256 `02902ddd053b2f4ccb944a8b035bbd9fee20444535778af7cb495e17c38b9cc0`; retained built owner SHA256 `a9006386397e520277f40e4a9af5178a4125578126f11e255e1dac5d64149a53` matches the implementation native log. This is not an image-wide equality audit.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Same CLI revision from another supported location is not an old-protocol adapter |
| No legacy old-behavior retention | Pass | No all-revision/unowned-store rescue or old/new switch |
| Dead code removed in touched scope | Pass | Replaced scanner/ranking gone; remaining helpers reached |
| Approved persisted-data decision followed | Pass | Not Affected by new transformation; no schema/data/migration definition change |
| No version-specific dual reads/writes or request-time old-shape fallback | Pass | Revision is executable compatibility identity, not application data version |
| Transition mechanics match design | Pass | New migration N/A; ordinary deploy/P3005/errors and caller ordering unchanged |

### Dead / Obsolete / Legacy Items Requiring Removal
None remaining identified. The required removals are complete: `listBundledPrismaEngineDirs`, its unowned candidate loop, `cacheVersions`/`bestMatch`/mtime ranking, and tests endorsing arbitrary revision acceptance. No unrelated dead-code follow-up discovered in this bounded review.

## Evidence / Local Review Checks
- Reviewer: [focused-checks.log](code-review-evidence/crr-001/focused-checks.log), [command/isolation/cleanup receipt](code-review-evidence/crr-001/focused-checks.json): **38/38 tests, 2/2 files, exit0** using normal Vitest command for the two changed owner files, clean environment/private HOME/TMPDIR. Reviewed global setup before running: only the absent-before-run worktree test SQLite was reset/created. Removed exact owned DB/journal and private directories afterward. No live data, Docker, model or user-node operation.
- Test fixture isolation is sound for its purpose: missing-package cases transpile the exact source into a clean native child to exclude pnpm test-runner NODE_PATH; no resolver mock, production hook, assertion weakening or native ABI claim. Process platform/arch stubs are restored; filesystem fixtures removed. These are owner selection tests, not packaged-platform passes.
- IR-001 evidence inspected: intentional base 20 fail/10 pass; initial current 27 pass/3 fail from runner-package leakage, corrected without source workaround; focused 197/197; initial omitted SDK/example dependency loading failures; complete frozen setup followed by affected 62/62 and final full units **5455 pass/7 skip, 687 files pass/4 skip, exit0**. Gated AGY and Windows-only skips remain Not Tested, not Pass. Prebuild/typecheck/fresh build and macOS ARM64 native deploy twice passed per retained logs. Reviewer did not rerun the full suite/build/native deploy or convert these into independent Linux proof.
- All initial fixture/setup/output-formatting evidence retained. No outstanding local failure found in final implementation evidence; no baseline waiver inferred. Read-only licensing/hygiene and cumulative diff whitespace checks independently pass.
- Source reference check reaches common owner from all three callers; installed manifest observation and source control flow align with Node's filename-anchored [createRequire](https://nodejs.org/download/release/v22.15.0/docs/api/module.html#modulecreaterequirefilename) and [realpath dependency resolution](https://nodejs.org/download/release/v22.15.0/docs/api/modules.html#package-manager-tips). External documentation supports the mechanism; actual fixture/metadata evidence supports these layouts, not all possible installs.

## Docs-Impact Verdict
Yes: `root-cause-summary.md` has design-stage/not-yet-implemented wording. Delivery must synchronize it with actual source/API evidence and distinguish merged source from published image. Historical facts/unknown cache writer remain. D1's API harness header plus package script will own its runnable instructions; no task-specific expansion of global TESTING needed. This planned role-owned docs work is not a source blocker.

## Additional Material Premise Validation
ARCH-REV-001 recorded **no additional** material premise IDs; supported startup, immutable package and retained-home recreation bases remain Confirmed. No new/reclassified premise. No requirement for hostile-cache validation, arbitrary corruption recovery, global package guessing or historical-writer attribution is invented.

## Review Scorecard
**10.0/10; 100/100**, simple average of the ten mandatory categories. This scores the selected implementation-source stage against approved contracts; it is not runtime confidence, API acceptance, task completion, or universal defect-freedom. There is no evidenced in-scope deficiency warranting a deduction. Required downstream native/integration proof is tracked separately.

| Priority | Category | Score | Why | Weakness / drag | Expected improvement |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 10.0 | DS001–004 preserved through real callers and downstream effect | None identified | None required |
| 2 | Ownership Clarity and Boundary Encapsulation | 10.0 | One migration-input owner; caller DB/lifecycle unchanged | None identified | None required |
| 3 | API / Interface / Query / Command Clarity | 10.0 | Explicit pair/null and canonical DB, unchanged command boundary | None identified | None required |
| 4 | Separation of Concerns and File Placement | 10.0 | Smaller coherent owner; tests separate | None identified | None required |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 10.0 | Minimal private identity and existing pair shape | None identified | None required |
| 6 | Naming Quality and Local Readability | 10.0 | Direct graph → bundle → exact-cache flow, no generic framework | None identified | None required |
| 7 | API/E2E Readiness | 10.0 | Local checks complete, designed required downstream work explicit and owned (CAND004) | No source-stage readiness gap | API authors/runs required harness; not counted complete here |
| 8 | Runtime Correctness And Behavioral Fidelity | 10.0 | CAND001–003 source/unit contracts hold; errors/ordering preserved | No source finding; native Linux/lifecycle untested here | Close AC004 via independent API evidence |
| 9 | No Backward-Compatibility / No Legacy Retention | 10.0 | Defective discovery replaced, not retained as rescue | None identified | None required |
| 10 | Cleanup Completeness | 10.0 | Old policy/fixtures gone; owned reviewer resources removed | None identified | Preserve generated unstaged prerequisites for API |

## Findings
None. No unresolved candidate or prior finding.

## Follow-ups
None discovered; no Task-manager message required. Unknown historical cache writer is an explicit evidence limit, not a new investigation Task or blocker.

## Classification / Recommended Recipient
Failure classification N/A — **Pass**, not a failure classification. Recommended next owner is API/E2E via the current rule lookup, with the complete cumulative package. No live operator, duplicate manager dispatch or direct Delivery acceptance.

## Required Next Gate / Residual Risks
1. API/E2E must author the single D1 durable `autobyteus-server-ts/tests/e2e/startup/prisma-engine-discovery.docker.mjs` and `test:e2e:prisma-engine-discovery:docker` script. Neither exists yet. Keep gate `RUN_PRISMA_ENGINE_DOCKER_E2E=1`, prerequisites/cases/owned cleanup in its header; no alternate duplicate probe or dependency/recipe change.
2. Run prescribed broader integration preparation/validation, then actual current-built Linux native proof. Audit whole image dist equality allowing only changed outputs before read-only worktree dist injection, or build an owned current monorepo image. Record source/build/image identity; old configuration-only b141/1779 proof is insufficient.
3. Required baseline native mismatch/control uses official version-pinned/checksummed incompatible binaries in owned state; demonstrate original resolver selection plus real DB-free RPC mismatch or actual baseline startup failure. Fake-file base failures are not that proof.
4. No-pin corrected normal startup with retained incompatible cache, actual matching native RPC, schema deployment and repeated HTTP200/status ok; create representative data through supported API; **recreate container over the same owned HOME/data** and verify readiness/data continuity plus wrong-cache preservation. Restart alone, wiped state, or permissive fake success does not satisfy AC004.
5. Isolated signed-out HOME/data, free loopback port, no user mounts/ports8001/8003/credentials/models/build-container actions or prune; clean only owned resources. Genuine new failures require accountable classification under TESTING Rule9, not suppression.
6. Package/export changes or an unprovable current-source image boundary route to the appropriate owner, not a broader scanner or inferred Pass. Unit target fixtures are not multi-platform native/desktop certification.
7. Delivery owns docs, moving-base material-source/build audit, applicable user verification and isolated source-only merge/push. No tag/image publication/rollout or pin removal authorized. Existing old-image container-local workarounds remain recreation-unsafe until separately deployed corrected source. Historical closed recovery Tasks and canceled unused06f7 stay closed; permanent6b8 stays active.

## Latest Authoritative Result
- Decision: **Pass**, CRR-001, round 1 / Full Implementation Review.
- Supported Product Scenario Gate: Pass. Material-Premise Gate: Pass.
- Score: 10.0/10, 100/100 scoped source quality; no findings.
- Failure origin: N/A. No source/API/live/Delivery overall acceptance inferred.
- Next: independent API/E2E, including required durable harness and current-source retained-state recreation proof. Transport is confirmed only by the subsequent messaging-tool receipt.
