# API/E2E Execution Coverage Report — Permanent Prisma Discovery

## Execution / Routing Meta
API-REV-001, round1 / Initial Baseline, 2026-10-13; prior result/confidence N/A. Trigger: Code Reviewer CRR-001 Full Implementation Review Pass at277c0c33d3671ce7aeedf2e8e30a4fb1baa94e0c. Task project_task_6b8c9612-c94b-4d62-8053-00ef94bd94df. Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/fix-prisma-engine-discovery`, branch `codex/fix-prisma-engine-discovery`; source basee22245f097c208e66065302cfc30814cc5ffd14f, implementationdd7be60ff6c732e0ddf6d9ac97a822bda8a85869.

Authority: requirements-doc.md R3 Approved; investigation-notes.md E001–008; design-spec.md D1 Ready; solution-revision-record.md SR004 (001–003 preserved); solution-handoff.md; design-review-report.md / architecture-review-revision-record.md ARCH-REV001; implementation-handoff.md / implementation-revision-record.md IR001; code-review-report.md / code-review-revision-record.md CRR001. Root-cause-summary, factual current metadata and external recovery/cause/recurrence supplements remain active factual context, NOT current source proof or live authorization. Inventory in solution-handoff. Product/UI and Delivery re-entry N/A.

**Medium / High / Reviewed** unchanged. Coverage investigation completed before durable edits/execution; canonical api-e2e-coverage-investigation.md and api-e2e-test-case-ledger.md contain plan/checkpoints. No earlier operational or retirement API Pass reused. Successful durable test-code review will be Required; this round requests **failure-origin review**, not successful-test review or direct Delivery bypass.

## Latest Result
**Fail pending failure-origin/accountable disposition of API-F001; final confidence92.1%.** The permanent-Prisma native/current-build/startup/recreation cases API002–005 **Pass**. The broad integration run is NOT all-green: **371 Pass / 2 Fail / 68 Skip**,91 files(72 Pass/1 Fail/18 Skip). Two existing websocket cadence cases fail with an independently traced out-of-scope product mechanism. No assertion suppression or “baseline therefore Pass” waiver. Independent full units5455 Pass/7 Skip (687filesPass/4Skip),exit0; final gates Pass.

Broader validation **Required / executed**, CLI + Docker lifecycle + actual REST/GraphQL. No user-only-checkable criterion invented; no missing environment blocker. No actual user node operation, public image publication or source finalization claimed.

## Acceptance-Criteria Proof
Evidence folder: [`api-e2e-evidence/api-rev-001/`](api-e2e-evidence/api-rev-001/). This table is the proof index, not whole-Task acceptance.

| AC | Critical | Cases | Direct evidence | Result / limit |
| --- | --- | --- | --- | --- |
| AC001 owner/layout | Yes | API001/002/003 | focused.log (30 owner graph cases within197); docker-attempt-1/native-proof.json, dist-audit.json, build-identity.json | Proven: root-pnpm real native path; package-local/flat are real filesystem unit graphs, not separate packaged-platform certificates |
| AC002 exact-cache/unknown identity | Yes | API001/003 | focused.log; two owner files; native-proof.json actual incompatible retained cache rejected by current bundle selection | Proven selection matrix; immutable package cache fallback uses graph/filesystem evidence, not a new AppImage run |
| AC003 preserved env/DB/deploy/errors/callers | Yes | API001/003/004/005 | focused.log, typecheck.log, integration-prepare.log; native-proof.json canonical env; startup-first.log/startup-recreated.log | Scoped contract Proven; genuine error/P3005 exec behavior covered by unit controls. Broad unrelated transport failure remains API-F001, NOT ignored |
| AC004 native current-build/no-pin/recreation | Yes | API002–005 | docker-attempt-1/{dist-audit.json,build-identity.json,native-fixture.json,native-proof.json,health-first.json,health-recreated.json,backend-first.json,backend-recreated.json,api-created.json,recreation-proof.json,cleanup.json} | Proven: real native negative/control, normal startup, actual distinct-container recreation, same state/cache preserved |
| AC005 factual cause | Yes | API006 | root-cause-summary.md; upstream cause/control/recurrence facts; native-proof.json validates mechanism independently | Factual mechanism Proven; writer remains unknown. Delivery must update brief's design-stage wording with scoped actual result |
| AC006 safety/source-release boundary | Yes | API002–006 | command receipts, ownership.json, resource mount receipts, cleanup.json, final-gates.json/input-audit.json | API-owned safety Proven; Delivery moving-base merge/user verification/release decision remain downstream obligations, not performed here |

No “Only The User Can Check” classification. Live repaired-node/customer workflow is excluded from this source validation, not substituted for missing native proof.

## Case / Ledger Reconciliation
Ledger initialized before execution; events appended at each meaningful attempt and harness events.jsonl immediately after native subcases. Native full run completed first attempt, no suppressed runtime failure. Readiness polling records initial connection failures while starting, followed by3 consecutive HTTP200/statusok responses at each startup; not invented immediate health.

| Case | Final result | Boundary / command / evidence |
| --- | --- | --- |
| API001 | Fail (API-F001); scoped owner checks Pass | Clean `pnpm -C autobyteus-server-ts exec vitest run tests/unit/startup tests/unit/server-runtime-app-data-migration-gate.test.ts tests/unit/standalone-application-host tests/unit/secret-management --no-watch`:197/197,20files. Typecheck and integration preparation Pass. Full integration as above; diagnostic2Fail/5notselected. Logs/results in evidence folder |
| API002 | Pass | Durable harness syntax/gate-off (SKIP, not nativePass), actual fresh build and immutable1779 whole server dist audit4559 entries; ONLY startup/migrations.js and migrations.d.ts.map differ |
| API003 | Pass | Original source resolver→c299 cached pair→real schema RPC-32601. Current built owner→own605 bundle; native query commit/schema version match installed metadata; DB-free listMigrationDirectories returns27 directories. Public official compressed checksums verified |
| API004 | Pass | Normal shipped entrypoint/Supervisor backend; no process-effective explicit pins;27 actual schema migrations;3HTTP200/statusok; representative agent definition created by public GraphQL, no run/model |
| API005 | Pass | Container0407073a… removed, new8ac4a1ac… created from SAME image with SAME private HOME/data/read-only currentdist.3moreHTTP200/statusok; exact definition fields read; wrong query/schema cache hashes unchanged. All named owned containers/temp roots removed |
| API006 | Pass | Scope/input/license/hygiene/whitespace/cause/evidence/cleanup audit; no runtime/source patch in response to unrelated failure |

The build uses current source, Node22 host/macOSARM64; native execution LinuxARM64/OpenSSL3, Prisma5.22, expected605197351a3c8bdd595af2d2a9bc3025bca48ea2. Immutable dependency/runtime image1779a6e136a2fcd48a3045687a88ded45628e306471f5fd9d3eb4321017b21fa plus read-only current server dist is the validated artifact. The image alone is NOT fixed; no new image built/published. Host source/dist hashes and Git HEAD/tree/working diff are captured. Two changed emitted files are exactly the permissible owner outputs; no broad unverified dist injection.

## Failure / Preliminary Classification
API-F001: `agent-status-websocket.integration.test.ts` cases “coalesces a representative fine-grained canonical stream into one default-window content frame” and “uses a changed interval only for the active socket's next newly opened window”. Expected0contentframes at350ms before500ms timer; actual1.

[`failure-origin-analysis.md`](api-e2e-evidence/api-rev-001/failure-origin-analysis.md) traces cause: AgentRun emits AGENT_INPUT_STATE after canonical batch; mapper forwards it; cadence scheduler does not recognize it as a safe companion and classifies it FLUSH_THEN_FORWARD, releasing content immediately. Temporary exact-test diagnostic only logs raw type/time/delta before the existing input-state trace filter; original assertions remain and fail twice. Native RPC/source changes do not reach this transport path. Source/test equality against base is recorded in cadence-diagnostic.json; immediate same-millisecond socket trace is in cadence-diagnostic.log. TESTING already identifies these two as a reported baseline product defect, but this is not follow-up closure.

Preliminary **Local Fix — existing product scheduler integration defect outside this ticket**, recommended accountable product Implementation owner after Code Review confirms origin/validity and separate follow-up reference. API owns no product cadence policy change. Request focused failure-origin review and accountable disposition under TESTING Rule9. Do not grow the Prisma ticket, reopen operational Tasks or invent a Task ID. On reviewer-confirmed unrelated outcome, API can record Out Of Scope with supplied follow-up and finish in-scope result using this retained evidence if unchanged.

## Confidence
Simple mean of all7 applicable categories; REST/GraphQL is the relevant user surface, browser/Electron not changed. Scores do not override unresolved failures.

| Category | Post repository | Final | Basis / remaining uncertainty |
| --- | --- | --- | --- |
| Requirements/AC | 50 | 95 | Native/current-source/lifecycle proof now direct; broader failure disposition pending |
| Changed boundary directness | 75 | 100 | Exact base/current owners and real native RPC/deploy, complete dist audit |
| Cross-boundary realism/mock gap | 50 | 75 | Native stack direct, but broad transport integration still fails pending accountable disposition |
| Environment/config/identity/fixture | 75 | 95 | Signed out, private persisted roots, exact installed graph/current build; one actual native platform |
| Failure/edge/lifecycle/recovery | 50 | 95 | Base native failure, preserved unit errors, actual same-state recreation; no user-history/platform extrapolation |
| User-surface | 50 | 90 | Real REST+GraphQL persistence; separate stream timing defect not closed |
| Durable regression quality | 75 | 95 | One gated maintainable lifecycle harness, positive+negative assertions/cleanup; proportional independent review still pending |

Post repository425/7=60.7%; final645/7=92.1%. Default95 gate NOT met, integration category below90. Additional validation closed AC004, not the unrelated product failure. No rerun or high score can silently dispose of it.

## Durable / Temporary / Compatibility Decisions
Added `autobyteus-server-ts/tests/e2e/startup/prisma-engine-discovery.docker.mjs`, updated ONLY package.json script `test:e2e:prisma-engine-discovery:docker`. Gate RUN_PRISMA_ENGINE_DOCKER_E2E=1; header owns setup/cases/cleanup; no global TESTING/dependency/recipe changes. Added harness executed, no duplicates or removed durable tests. Existing owner matrices Still Valid; original arbitrary-cache policy already removed by Implementation.

Temporary repository runner, initial image-dist audit, raw-socket diagnostic are evidence, not alternative Docker harness. Diagnostic test copy removed; canonical cadence test unchanged. Baseline resolver transpiled from exact historical Git source into private fixture only, never retained in production. Exact-revision cache is current CLI ABI fallback, not legacy protocol retention. Persisted-data transformation Not Affected; normal existing migrations operate owned data. Definition/current reader continuity proven, not all historical records or byte-identical database.

## Setup, Cleanup And Limits
All invocations use clean private HOME/TMPDIR; builds serialized in assigned worktree. Docker port allocation loopback dynamic (not8001/8003); only unique labelled fixtures; no user mounts/auth/key import, provider/model inference, backup access, cache wipe or pin removal. Baseline native input downloaded from [official pinned distribution convention](https://raw.githubusercontent.com/prisma/prisma/5.22.0/packages/fetch-engine/src/utils.ts), compressed SHA256 matched official file; native blobs removed with temp root, never committed. This does not identify historical writer.

Harness cleanup exact registered containers -f -v, label verification and explicit absent receipts, private bind data removed only after containers absent. No prune, shared build operation or user-node status/health probe. Generated SDK/devkit/BriefStudio dist prerequisites remain untracked for downstream use; do not stage/clean accidentally. API-owned worktree test SQLite and temporary command roots cleaned after suites. No running API fixture remains at final report.

Limits: gate-off is SKIP; full integration68 skipped and full unit skips remain NOT TESTED, not Pass. Target-preference unit stubs are not Windows/x64/AppImage runtime certification. No browser/whole desktop/all Supervisor sibling/program health, private user-data or public-image rollout certification. Delivery still owns cause-status sync, moving-base audit, appropriate user verification, isolated source-only merge/push. Live old-image workarounds remain recreation-unsafe until a separately authorized corrected-image deployment. Historical recovery3466/restoration177 remain DONE, unused06f7 CANCELLED; permanent6b8 not completed.

## Final Checks And Handoff
Final suite/gate/cleanup receipt appended below. Rule lookup follows persisted complete artifacts; successful transport must be tool-confirmed. Expected failure-origin route, not Delivery acceptance. Attach complete cumulative package plus proof index/critical raw evidence and both durable changed paths.

### Final Repository / Cleanup Receipt
Full independent `pnpm -C autobyteus-server-ts test:unit`: **5455 Pass / 7 Skip**,687filesPass/4Skip,exit0,482.41s; `unit.log` and `cadence-diagnostic.json`. Gated AGY and Windows-only cases remain skips. Full integration remains371Pass/2Fail/68Skip, not changed by green units or native harness. API-F001 diagnostic retains2Fail/5notselected. No unresolved current-source/native fixture failure.

`repository-cleanup.json`: exact API-owned suite SQLite/journal files removed, temporary diagnostic copy absent. Clean command HOME/temp removed by runners; runtime cleanup.json proves all fixtures absent. Generated five SDK/devkit/BriefStudio dist directories retained untracked, never staged. Own stdout logs' trailing whitespace/blank EOF normalized only, with raw/committed hashes in log-normalization.json; no outcome lines dropped. Original implementation/reviewer failures and evidence untouched.

`input-audit.json` confirms cumulative non-ticket allowlist: original migration owner/two unit files plus API harness and one package script only. Dependencies/schema/recipes/launchers/callers/license/lockfile unchanged. `final-gates.json` records licensing/hygiene/syntax and working/index/cumulative whitespace checks, plus label-filtered owned-container absence; no live-node queries. Native source/test hashes unchanged since execution. All ledger cases reconciled; none running/unstarted. No failure-origin verdict or successful handoff claimed until the corresponding tool result.

### Applied Route
Fresh get_handoff_rules selected the single most-specific **API/E2E fails → focused failure-origin review** rule, exact recipient `/software_engineering_team/code_reviewer`. No successful-test/Low-route/SD pre-execution rule applies. One cumulative package only; no manager/operator/Delivery dispatch. Message success is reported only after tool confirmation.
