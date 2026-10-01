# Code Review — CRR-019: IR012 boundary restoration

## Latest authoritative result
**Pass — implementation-source re-review; proceed to integrated API/E2E, not Delivery.**

- Round19 / 2026-10-01 / Code Reviewer. **Large / High unchanged**; required independent re-review after CRR017/018 Local Fix.
- **API010-F001 source-owned boundary correction verified.** The guard is unchanged, the native harness is outside web, and independent guard/native/web checks pass. **Full documented desktop build confirmation is still required. API01075.0% Fail is not rescored or closed by this source result.**
- **API009-F001 integrated closure remains OPEN.** No corrected packaged renderer journey was executed here.
- Source score **9.50/10 (95/100)**; scenario and material-premise gates Pass. No new actionable finding. Failure classification **N/A**.
- CRR013 successful-test report remains unchanged, pre-integration only. API15 and the three API009 native files still require eventual successful-test review.
- Recommended sole next recipient: **/api_e2e_engineer**, subject to fresh rules and confirmed receipt.

## Authority, scope and prior-result handling
Canonical ticket: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis`. Source paths resolve at `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`; evidence references below are ticket-relative.

Approved **SR033** requirements REQ012 / AC014,017 / SCN005, with AC018 downstream; investigation E37/E38 and cumulative solution record; **Ready SR038** DS016–018 / **ARCH-REV006** remain authorities. Explicit user **no migration/backfill, future-native correctness** and **CRR018 web must not depend on core; do not remove/weaken the intentional guard** are preserved. IR012 handoff/revision/evidence follows IR011, CRR016–018 and API010-F001. Existing DR001/002 integration remains in progress; new Delivery revision N/A. Existing v5/output/hold/terminal/exact-sender supplements retained; no new product/design approval needed to restore the established boundary.

Reviewed current working files, not only the merge index: six IR012 current paths (root command/guidance, workspace test/config/README and web negative guard test), declared removal of old web native test, absence of withdrawn web-local candidate, unchanged guard/build manifest/config, setup and imported fixtures. All six current hashes match IR012 inventory. **All17 IR011 production hashes match**; unaffected runtime/source evidence from CRR016 is reused, not its corrected API-readiness verdict. Rechecked affected dependency direction, placement, cleanup, assertions and validation setup in full.

This is an implementation-review return with mandatory structural checks/scorecard, not successful API test-code review. Tests are reviewed proportionately without production-size thresholds. No new runtime implementation, migration, queue, retry, authorization, model, prompt or renderer change. No source/test fix, emit, app build/launch, provider execution or full typing by reviewer.

CRR018 canonical report and cumulative record plus unchanged test report archived under `code-review-evidence/crr-019/entry-*`. CRR001 baseline and intervening history preserved; CRR016's missed mandatory-guard conflict and CRR017's withdrawn guard-policy option remain historical corrections, not retroactive passes.

## Behavior and supported scenario basis
**Basis Confirmed.** No new behavior or unresolved material ambiguity.

| Behavior / contract | Actor, goal and independent supported entry | Current path / lifecycle / expected consequence | Validity / use |
|---|---|---|---|
| Web/core boundary / CG044 | User's explicit architecture constraint; engineer builds unreleased worktree via root TESTING.md isolated-app command | Root build -> unchanged web mandatory guard -> web build; web owns no core/native test dependency. Integration harness is an external caller of both product boundaries | Supported Normal Scenario / governing engineering contract; Use |
| BEH005 / REQ012 / AC014,017 / SCN005 / MP014,015 | User sends A with attachment to hosted Agent/Team, encounters compaction hold, reconnects/reloads same live backend, then admits new input | Original native ingest -> raw identity -> normal server history -> saved web projection + Held A/Queued B -> authorized recovery once. Hydration must not send/re-ingest/authorize | Supported Explicit Edge Scenario already established by approval and API009 product evidence; Use |
| BEH004 / sender identity contract | Saved history/normal member projection preserves original identity and exact sender provenance | Typed optional identity -> both dedupe layers -> final builder; no secondary/semantic bridges or attachment loss | Supported Normal Scenario / SR038 and sender contract; Use unchanged source evidence plus identity12 |
| BEH005/007 and SCN006 | Existing authorized recovery and user whole-host Stop | Existing runtime/root owners unchanged; preserved source proof, actual product continuation/Stop still downstream | Supported existing contracts; Use within unchanged scope |

### Candidate finding and mechanism gate
| Candidate | Evidence and consequence | Disposition |
|---|---|---|
| **CG044 / API010-F001** | Previously the mandatory guard rejected four core imports in web test. Now whole native test moved to workspace owner; guard/web manifest/config byte-identical; no web reference to external harness/native fixture in inspected1577 files; root guard Pass and native2/web17 Pass | **Promote, source correction satisfied**. Existing full-build/API closure remains next; do not substitute guard success for later stages |
| Workspace harness configuration | Operational testing contract requires preserving real native-to-web regression without a web-to-core edge. Workspace config imports existing web tooling and independently selects external test; test imports both boundaries, with no reverse import | **Promote proportionate mechanism, satisfied.** Explicit test-only composition, no re-export facade or production dependency |
| CG040–042 / API009 source identity and attachment correction |17 IR011 production files unchanged; full original native mock/test body byte-identical after import-path retargeting; actual native Agent and hosted-Team fresh-history cases pass | **Promote prior supported mechanisms, retained**; integrated corrected renderer proof not supplied here |
| Guard relaxation, web-local exclusion move or hidden core wrapper | User expressly prohibits boundary weakening; withdrawn intermediate candidate is not final implementation | **Reject** such remedy. No changed guard, exemptions, alias/core bridge or active intermediate copy |
| CG043, CG039 / cold-native repair, historical key inference, unsupported races | No new initiating authority; explicit future-only/no-backfill constraint unchanged | **Reject** findings or machinery from these premises; no deduction |

No test or diff establishes its own product scenario. Guard negative samples validate the independent engineering contract, not a claim that a synthetic application file was shipped.

## Forward dependency and test trace
1. **Build spine unchanged:** root `isolated-app` -> lifecycle build dispatch -> web `build:electron:mac` -> original `guard:web-boundary` -> remaining unchanged build stages. Guard SHA256 `cf7ce51d0330c9073e4db89fa5ca07eb63636122a4905af4f512aa48d61e8c35` equals CRR016/HEAD. Web manifest and Vitest config equal CRR016; lock equals merge index and is intake-pinned (no prior CRR016 lock-pin claim).
2. **Regression spine:** root `test:native-input-history` -> unchanged guard -> explicit `test-support/native-input-history/vitest.config.mts` -> external native history test -> native/server fixtures plus web projection owners -> unchanged assertions. Running installed Nuxt tooling with web cwd does not reverse the import direction: only the workspace config imports the web config, not vice versa. Its include selects only the external harness; dedupe names test tools/Pinia/contracts, never core.
3. **No hidden web bridge:** reviewed imports/config/setup and scanned1577 web source/local-test/script/root-config files, excluding dependency/generated/resource trees. Zero references to the workspace/native harness or native fixture. Core-name occurrences are only unchanged guard enforcement and inert negative sample/assertion strings in the new guard test; those samples are never imported/executed as core. Existing web identity test's server dedupe import is a pure presentation-contract transform, not a core runtime/native fixture bridge.
4. **Coverage preserved:** native test's complete `const query` onward mock/test body SHA256 `ce00b65543c0d733570bbbd2190c42c804388ef7e6e702b49ad7eae485f959ba` matches original. Whole file differs only by relative import depth and ordinary frontend alias retargeting. Actual native Agent and hosted-Team produce fresh raw keys; saved projection is derived from those rows, not patched history. Assertions retain attachment/name/time, Held/Queued, repeated hydration/no raw/model changes, clearing and new-C authorized once-only consumption. Controlled model/provisioning/Apollo boundaries remain explicit.
5. **Guard regression:** new web-local test launches actual unchanged guard against disposable roots. It rejects a service core import, colocated-test core import and production core dependency. No assertion permitting a web test-folder exemption. Temp sample text does not establish a web runtime dependency. No changes to API-owned fixtures.
6. **Cleanup:** original `services/agentCollaboration/__tests__/nativeAcceptedInputHistory.spec.ts` and withdrawn `tests/integration/native-accepted-input-history.integration.test.ts` are absent. Historical copies in implementation evidence/immutable archive are provenance, not executable duplicates. No shim, wrapper or compatibility path remains.

## Mandatory structural / design checks
All checks below refer to promoted CG044 / existing approved behavior, not hypothetical scenarios. Unaffected runtime judgments retain CRR016's scoped evidence with unchanged17 production hashes.

| Check | Result | Evidence / required action |
|---|---|---|
| Task design health present, evidence-backed and preserved | Pass | IR012 self-check identifies misplaced cross-boundary test; restores ownership without policy redesign |
| Approved behavior-defining supplements matched | Pass | Native assertions preserved; runtime/hold/terminal/sender source unchanged |
| Data-flow spine inventory clarity/preservation | Pass | Build, workspace regression, native history and return projection spines explicit above |
| Ownership boundary preservation | Pass | Workspace integration owns composition; web owns only web/guard contract checks |
| Off-spine concern clarity | Pass | Test config selects harness, does not own runtime sequencing |
| Existing capability/subsystem reuse | Pass | Reuses Nuxt tooling and API-native fixtures read-only, no duplicate native setup |
| Reusable owned structures | Pass | One moved test, existing shared runtime fixture; no copied flow |
| Shared-structure/model tightness | Pass | No new runtime model or optional state bag |
| Repeated coordination ownership | Pass | Root script owns guard-before-test ordering; runtime coordination unchanged |
| Empty indirection | Pass | Config owns include and shared test-dependency resolution, not core re-export |
| Separation of concerns/file responsibility | Pass | External cross-layer test, thin harness config, independent guard negatives |
| Ownership-driven dependencies | Pass | Workspace -> native/server + web; no new reverse edge or core alias |
| Authoritative Boundary Rule | Pass | Web no longer imports core/native composition; external test observes controlled boundaries, no production owner bypass added |
| File placement | Pass | Harness outside web; web-local negative guard test only writes inert temporary samples |
| Flat-vs-over-split layout | Pass | One focused workspace folder with test/config/README; no extra package/service hierarchy |
| Interface/API/query/command clarity | Pass | One explicit documented test command; no new production API |
| Naming quality/alignment | Pass | Native accepted history / guard boundary names match ownership |
| No unjustified duplication | Pass | Old and interim active copies removed; shared fixtures retained |
| Patch-on-patch complexity | Pass | No exclusion shim, hidden import or guard-policy patch |
| Dead/obsolete cleanup | Pass | Both former active native test locations absent; evidence copies correctly historical |
| Test scenarios/assertions requirement-aligned | Pass | Full body retained, actual native producer; negatives enforce user boundary |
| Fixtures/helpers coherent/reusable | Pass | Existing read-only fixtures; own temporary guard roots cleaned |
| No stale/compatibility-only tests introduced | Pass | No permissive exclusion test or keyless-capture substitution |
| API/E2E readiness | Pass | Independent documented root command + mandatory guard + focused web checks green; full build/product gate explicitly pending |

No new required structural action. Restore the boundary, not rewrite production architecture.

## Source size, legacy, cleanup and docs
**New production-source changes: none.** New harness config25 nonempty lines; command/guidance changes are small. Tests/fixtures are excluded from production >500/>220 rules. Prior17 production files and their CRR016 size assessments (max497, max delta84 for IR011) are unchanged. No new source-size pressure or forced test splitting.

| Legacy / transition check | Result | Evidence |
|---|---|---|
| No backward-compatibility mechanism | Pass | No shim, dual location or alias/core bridge |
| No old-behavior retention | Pass | Both web native copies removed; no weakening guard |
| Dead/obsolete cleanup complete | Pass | Source removal independently checked, original preserved only as evidence |
| Approved persisted-data decision followed | Pass | Test-only delta Not Affected; SR038 optional future identity / Directly Usable—No Migration unchanged |
| No version-specific dual reads/writes or fallback | Pass | No runtime/storage changes |
| Transition mechanics match design | Pass | No new transition machinery or backfill introduced |

Remaining dead/obsolete items requiring removal: **None in this delta**. Documentation impact **Yes**: root TESTING.md and harness README now identify the external owner, exact command, dist prerequisite, strict boundary and mocked/in-process limits. Read and consistent with actual commands. Delivery's broader semantic documentation sync remains its own gate.

Additional material premises: **None new outside the scenario table.** MP014/015 and existing CG040–042 stay scoped; rejected cold-native/repair/race premises stay rejected. No new fallback/lifecycle machinery.

## Independent checks
Evidence in `code-review-evidence/crr-019/`:
- **`pnpm test:native-input-history`: exit0, unchanged guard Pass +2 native cases Pass /1 file.**
- **Normal web `test:nuxt` selected3 files `--run`: exit0 /17 Pass** (identity12, guard3 rejection controls, existing Electron dependency2).
- Fresh19 tests across4 test files; do not add repeats or withdrawn candidate runs to this total.
- Exact argv/cwd/times/exits: `commands.json` and per-command JSON/log/exit. `NATIVE_INPUT_CAPTURE_DIR` explicitly unset. Read commands, config, setup and fixtures before execution; no old scripts with owner output redirects used.
- Guard's potential stale-link-removal branch checked absent before/after. Own temp prefixes showed no newly remaining directories. Native fixtures close their temp memory/runs; no server global database setup, private history, provider calls or app lifecycle used.
- `source-inventory-check.json`, `test-relocation-check.json`, `production-preservation.json`, `boundary-owner-hashes.json`, `dependency-scan.json` ground the structural findings.
- No full build, emit, full typecheck, packaged reload, HTTP/WS journey, external inference or new screenshots. Render loop **N/A for this test-only delta**; IR011 preview remains historical bounded evidence.

## Mandatory scorecard
Simple mean **9.50/10 =95/100**. All categories >=9; this is source suitability, not API coverage confidence. Unaffected categories retain verified source evidence; ownership/placement/readiness are freshly assessed after the concrete boundary correction. It does not retroactively validate CRR016's missed guard.

| Priority | Category | Score | Evidence / concrete drag | Improvement |
|---|---|---:|---|---|
|1|Data-Flow Spine Inventory and Clarity|9.5|DS016–018 unchanged; explicit external regression/build spines. Multiple representations still require trace discipline|Keep producer-to-overlay oracle with boundary ownership |
|2|Ownership Clarity and Boundary Encapsulation|9.5|CG044 corrected: no web-to-core/harness edge, guard intact; shared test tooling still needs explicit direction documentation|Keep tests at their owning boundary and guard unchanged |
|3|API / Interface / Query / Command Clarity|9.4|One documented root command; original typed contracts unchanged; earlier positional ingestion signature remains dense|Keep future changes typed/subject-bound |
|4|Separation of Concerns and File Placement|9.4|Cross-layer coverage moved outside web; no facade. Existing runtime files retain prior responsibility/size pressure|Avoid returning native setup to web or adding unrelated concerns |
|5|Shared-Structure / Data-Model Tightness|9.5|No new runtime shapes; read-only fixtures and body reused, exact-key models unchanged|Retain both-layer identity/attachment parity |
|6|Naming Quality and Local Readability|9.3|New owner names explicit; existing compact native test/merge predicates retain prior readability limits|Improve local readability when touched, no artificial abstraction |
|7|API/E2E Readiness|9.0|Mandatory guard and explicit native/web commands now pass; full desktop build/renderer matrix and full typing still pending|Execute complete documented build and integrated gate next |
|8|Runtime Correctness And Behavioral Fidelity|9.4|Unchanged production identity path, preserved actual-native cases; controlled seams are not final product proof|Verify same-backend renderer replacement/continuation |
|9|No Backward-Compatibility / No Legacy Retention|10.0|No old-key inference, guard bypass, compatibility bridge or migration|None in changed scope |
|10|Cleanup Completeness|10.0|Old/interim active tests absent; no duplicate runtime/fixtures; historical evidence retained truthfully|None in changed scope; Delivery docs remain downstream |

## Prior findings and residual risks
- **API010-F001:** architectural/source blocker corrected and guard independently green; full build confirmation still belongs to next API execution. API01075.0% Fail remains canonical until API owner updates it.
- **API009-F001:** source identity repair verified for corrected future native writes, integrated actual Agent/Team repeated new renderer on SAME backend/native + attachment/held/queued/recovery/remaining negatives/product Stop **OPEN**.
- API15 (including three API009 files) unchanged; successful-test CRR013 is pre-integration only. No direct Delivery advance.
- No migration/backfill, old capture retrofit, cold-native/restart queue/power-loss guarantee or new provider budget. F005 accepted-known/nonfixed/nonPass/Qwen STOP; F004 unknown; SR022 exhausted/v6 unapproved; CG033 unproved/not pump Pass;14 wider+7 baseline retained.
- OOM and historical web7078/latest7181 remain non-green; no new full typing proof. API006 withdrawn/API007 unsupported claims stay excluded.
- Two original IR009 logs remain lost; current copies are disclosed CRR014 replacement reruns. No reconstruction or rewriting of owner evidence.
- The intermediate IR012 in-web relocation was withdrawn **unhanded**; its logs are not this final candidate's acceptance proof. CRR018 user constraint fully applies.

## Preservation and routing
Entry pins cover10,592 existing files plus an explicit historical-reference removal record for the old active test. Its original bytes remain in IR012 source-before and the API010 immutable archive; not an unexplained missing artifact. Protected API15 + packaged2 match incoming pins. Guard/web manifest/config preserved; lock intake-pinned and equals index. Only review report/record may change during this review; final audit supplies exact results.

Complete cumulative package is retained via API010's immutable archive/manifests (historical snapshot, not current mutable authority), IR012 cumulative reference index/current evidence, and current direct canonical overrides. Current references replace the removed active test with the preserved preimage and new workspace test. Inclusion is navigation, not a reread-all claim.

Merge remains IN-PROGRESS/UNCOMMITTED, HEAD026476691c62bda309ce7f2a9342ebb444959f98 / MERGE_HEADd057801c89f26bc69a97331b59631c00519aec98; no stage/reset/commit/push/release/cleanup. Fresh rule selection and confirmed handoff receipt follow; no handoff is claimed until confirmed.

Pre-handoff preservation:10,592 pins checked,10,590 unchanged; only canonical code-review report and revision record changed,0 missing/unexpected. Protected API15+packaged2 match; raw/logical index, HEAD/MERGE_HEAD, stash unchanged;672 staged/0 unmerged. Removed old test was already absent at intake and is explicitly represented by preserved preimage/new workspace path. No source/guard/build changes by reviewer. Owned diff check exit0. Fresh rules select primary implementation-review Pass -> sole **/api_e2e_engineer**. No duplicate informational outcome under current single-recipient contract; no Delivery. Receipt follows confirmed send.

Confirmed **accepted=true / DELIVERED** solely to /api_e2e_engineer, existing AgentRun api_e2e_engineer_96e63b834264434986f16a8037990c3f,275 bounded attachments with complete archive/current overrides. Receipt: code-review-evidence/crr-019/handoff-receipt.json. Source Pass only: full build/API010 confirmation and API009 integrated closure remain pending. Pre-send audit does not freeze downstream work. No duplicate notification or Delivery advance; reviewer stops.
