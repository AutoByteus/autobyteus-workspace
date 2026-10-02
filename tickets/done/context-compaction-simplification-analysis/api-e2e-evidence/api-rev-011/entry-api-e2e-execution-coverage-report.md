# API-REV-010 — Executable validation: Fail / 75.0%

2026-10-01. **API010-F001: documented worktree desktop build fails on IR011 test imports.** Request focused failure-origin review, not successful-test review or Delivery. Task **Large / High** unchanged. Approved SR033 / Ready SR038 / ARCH-REV006 / IR011 / CRR016 source Pass9.50 are the current upstream basis. Source suitability is not this executable confidence score. Current working tree, including unstaged work and the preserved merge, is the source basis.

**API009-F001 remains OPEN for integrated closure.** Fresh repository native-produced identity/hydration checks pass, but no corrected packaged product was created or launched. Agent/Team actual new-renderer, attachments, repeated reconstruction, retry continuation and product Stop reruns are **Not Tested this round**. No claim that the identity fix fails at runtime; no reuse of old app/captures as a post-fix oracle.

## Finding API010-F001 — implementation test / build integration
- Case I10-03; blocks direct package proof of REQ012 / AC014,017 / SCN005, DS016–018 and downstream AC018 journey. The runtime criteria themselves were not executed/falsified in a corrected package.
- Expected: root TESTING.md's `pnpm --silent isolated-app start --build` creates the current worktree product and returns an owned isolated instance ready for validation.
- Observed: command exits **3**, JSON `BUILD_FAILED`; nested `pnpm build:electron:mac` exits **1** at its first `guard:web-boundary`. No prepare-server, generate, packaging or app launch occurred.
- Guard rejects exactly four direct `../../../../autobyteus-ts/dist/...` imports in `autobyteus-web/services/agentCollaboration/__tests__/nativeAcceptedInputHistory.spec.ts:5–8`: AgentInputUserMessage, ContextFile, ContextFileType, SenderType.
- Focused reproduction `pnpm -C autobyteus-web guard:web-boundary` exits **1** with the same four diagnostics. The guard recursively scans services, including colocated tests; its bytes match HEAD. The test hash matches IR011's implementation inventory. The documented build chain uses `&&`, so it does not reach the corrected product build.
- **Preliminary classification: Local Fix — implementation-owned test/build integration; recommended Implementation Engineer after independent Code Review origin determination.** Not an external dependency blocker, new product requirement, migration request, or proven defect in production identity behavior. API owns this validation report, not the newly implementation-owned test.
- Preserve the valid fresh-native regression. Do not bypass the guard, build by an undocumented partial chain, fall back to the old product, inject keys into historical captures, or delete meaningful assertions to call this green. Owner/reviewer should determine conformant test placement/setup or a justified narrowly tested guard correction.

Evidence relative to `api-e2e-evidence/api-rev-010/`: `isolated-start.json`, `isolated-start.stderr`, `.exit`, `build-command.json`; `build-guard.log/.json`; `finding.json`, `source-excerpts.txt`. No screenshot is applicable: the build fails before any new window exists.

## Coverage investigation / validity / commands
Read current requirements, SR038 identity/persistence/overlay contract and explicit no-migration clarification, SR030/034/035 preserved recovery/root/terminal rules, architecture/source reports, implementation handoff including Legacy/Compatibility and Persisted Data Transition, cumulative history and existing API investigation/report/ledger. Complete incoming4,577-reference navigation is retained; inclusion is not a claim every historical file was reread/rerun. Exact v5, hold supplement, sender provenance and accepted deviations remain applicable. No new Product redesign; upstream Product artifacts retained.

Root `TESTING.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md`, manifests, normal Vitest/Prisma setup, `docs/isolated-app-instances.md`, `skills/autobyteus-isolated-app/SKILL.md` and advertised browser-automation skill govern. No closer source testing guideline. Core uses documented working `exec vitest run --no-watch`; web uses `test:nuxt --run`. A preliminary lookup for web vitest.config.ts found no file; actual vitest.config.mts was read. Server setup resets only the designated worktree `tests/.tmp/autobyteus-server-test.db`.

Before tests/build, canonical investigation and ledger were initialized with real-use scenarios and existing coverage decisions. IR011 producer/history/identity/attachment tests remain **Still Valid** as in-process proofs. Existing root/Stop/ownership/echo/strategy tests remain Still Valid. The new finding adds **Needs Update—build integration**, not invalidation of the intended regression assertions. No durable/source changes or test removal by API010. API15, including API009's3 new native files, remains the eventual cumulative successful-test review scope; CRR013 is still pre-integration only.

Exact repository argv/cwd/start/end/exit and raw output are in `commands.json`, `run-check.py`, per-case `.json/.log`. Old scripts with embedded output paths were read, not executed over owner evidence. All new logs are exclusive. Build command metadata explicitly notes exact start time was not instrumented; no fabricated timestamp.

## Execution reconciliation
| Case/check | Result | Boundary / limitation |
|---|---|---|
| I10-01 presentation contract |8 Pass|Shared tagged primary identity and current contracts; build-config noEmit included.|
| I10-01 core identity |60 Pass /5 files|Original input ingestion, raw codec, memory/files/archive; no network.|
| I10-01 server identity |28 Pass /3 files|Normalizer/replay/saved attachment projection.|
| I10-01 web identity |93 Pass /10 files|Includes actual fresh native Agent/hosted-Team producer + FIFO/history/client hydration2; controlled model/provisioning and mocked Apollo, not HTTP/reload. Primary-ID, exact sender, attachment union/names/timestamp and separate echo controls.|
| I09-02/03 native root |10 Pass /1 file|Both pre-parent/post-response, actual GraphQL schema/read-only inspection, input snapshots/FIFO/root Stop. Transport/in-process fixtures, not shell.|
| I09-04 whole-root termination |6 Pass /1 file|Actual AgentRunService orchestration; controlled child-finish/later-host-failure seams. Inactive event does not equal whole success.|
| Focused server / web |18 Pass /4;38 Pass /4|Root/Team recovery/stream plus two-child atomic commit, recipient/instance/node/stale-callback ownership, failure/inspection, host error liveness.|
| I10-02 core regression |102 Pass /8|Strategy attempts, SDK transport controls, cancellation/commit, actual runtime recovery and current snapshot restore.|
| I10-02 server regression |108 Pass /13|Recovery/races/drain/lifecycle, sender/mention/history, settings/harness.|
| I10-02 web regression |110 Pass /13|Retained activity, standalone/Team/Org Stop, sender/echo, input/recovery labels and conversation components.|
| Root contract regression |8 Pass|Strict root input/recovery DTOs.|
| Temporary fixture guard |11 checks Pass /8 local requests|Only protocol/emulator safety; fixture child cleaned. No product requests or remote inference.|
| I10-03 actual worktree build |**Fail**|BUILD_FAILED at boundary guard; direct guard reproduction also Fail.|
| API009-F001-A / T |**Not Tested**|Fresh actual packaged repeated reload + attachment + HeldA/QueuedB + new-C authorized continuation cannot run without corrected build. Repository results do not substitute.|
| I10-04 product multi-child Stop |**Not Tested**|Prior API009 scoped product Stop evidence retained; current repository matrix rerun, no current product rerun.|
| I10-99 cleanup/preservation |Pass within enumerated scope|No app launched; temporary fixture child exited/port free; pins/index/refs checked.|

Groups overlap and **must not be summed as unique coverage**. No full suite, full web typecheck, semantic fidelity rescore or packaged Pass. No new provider campaign. Prepared product drivers and fixture inputs are **unexecuted preparation**, not journey evidence. No browser/CUA call in this round.

## Mandatory confidence scorecards
Evidence-confidence judgments, not pass rates or measured probabilities. Seven categories all applicable.

| Category | Post-repository % | Final % | Evidence / remaining uncertainty |
|---|---:|---:|---|
| Requirement / acceptance proof |90|50|Fresh native proof is strong but critical corrected built AC014/017 witness remains missing after build failure.|
| Changed-boundary directness |95|95|Actual native pipeline/store/FIFO, real transforms and production client owners; build guard directly reproduced.|
| Cross-boundary integration realism / mock gap |75|75|Models/provisioning/Apollo controlled; current packaged HTTP/WS/renderer spine untested.|
| Environment/configuration/identity/fixture fidelity |90|75|Correct worktree and owned deterministic fixtures; documented build fails, no current product environment ready.|
| Failure/edge/lifecycle/recovery |90|90|Native safe points, authorization/races/cancel/whole-root faults and exact ownership rerun; built continuation still missing.|
| User surface/browser/desktop shell |75|50|Nuxt/component proof only this round; no corrected actual new renderer.|
| Durable regression relevance |95|90|Valid fresh-history regression now present, but its import placement blocks product build; independent successful-test review still pending.|

Postrepository610/7=**87.1%**, recorded before build. Final525/7=**75.0%**. Critical unproven behavior and actual build failure override green tests. **Overall Fail, not environmental Blocked. Broader Required—attempted setup failed; resume actual same-backend new-renderer journeys after owner correction.** No score change to historical API00977.9 or earlier semantic observations.

## Preservation and cleanup
Entry10,381 pins include incoming source/test/dist/evidence and prior SR036 captures. Before build saved current derived outputs in a unique4,285,796,864-byte archive; exact path/hash/list in `build-backup.json`. Retain this and all older DR002/IR/API backups. Build exited before prepare-server; no emit/package replacement. Final audit owns exact changed/missing counts; permitted changes are only four canonical API documents plus new API010 evidence.

HEAD026476691c62bda309ce7f2a9342ebb444959f98 / MERGE_HEADd057801c89f26bc69a97331b59631c00519aec98; merge IN-PROGRESS/UNCOMMITTED,672 staged/0 unmerged. GIT_OPTIONAL_LOCKS=0 used, raw/logical index/refs/stash checked. API15, production/source/implementation tests, other-owner evidence, old keyless captures and packaged2 unchanged. No stage/reset/commit/fetch/push/release/cleanup of unrelated WIP.

Only guard fixture process ran; its PID absent and port free in `cleanup.json`. Product provider never started. Build failed before isolated instance/dataRoot allocation; read-only isolated list contains no new owned instance. No credentials/vault/provider keys imported, private history/user app touched or remote generations. Normal repository fixtures remove their owned temp memory in finally; designated disposable DB is retained normal test state. No resources require user assistance.

## Historical evidence reconciliation and limits
Prior API-owned SR036 diagnostic did finish all four fresh pre-fix Agent/Team preparations, one with attachment:1→2 corresponding bubbles, same native/backend, one raw/history/live entry, no held parent dispatch. `sr036-fresh-reproduction/repro-result.json` and cleanup establish that bounded result. Its interrupted canonical underway wording is superseded, without inventing a retrospective audit across later IR011 changes. Old captures remain unchanged; they may still show the historical defect. SR038 explicitly forbids migration/backfill/retroactive join.

F005 accepted-known/nonfixed/nonPass/Qwen STOP; F004 unknown; SR022 exhausted/v6 unapproved; CG033 unproved/not pump Pass;14 wider+7 baseline residuals remain unwaived. Historical OOM/plain-web7078 and current IR0117181 diagnostics remain NON-GREEN; not rerun or waived here. API006 ineffective-reload claims and API007 unsupported literal excluded. ARCH005 applies SR035 only; older ARCH004/IR007/CRR011/API00895/CRR013 remain pre-integration. CRR014 overwritten two IR009 overlap logs remain disclosed replacement evidence; originals unavailable/no reconstruction. No backend-restart pending queue, native cold-activity history, power-loss or all-model guarantee.

## Handoff
Focused **failure-origin review** for API010-F001 with preliminary implementation-owned Local Fix, not successful-test-code review or full production re-review. API009-F001 integrated closure remains open. After conformant build correction/source route, API rebuilds and completes Agent/Team actual repeated new-renderer same-backend history/attachments/recovery plus product negatives. Successful executable validation then returns for separate proportional API15 test review, followed by normal Delivery gates/user verification. Fresh rule selection/confirmed receipt below; no planned-send claim.


---
## Preserved prior checkpoints and reports

# API010 validation in progress — CRR016 / IR011
Fresh identity/native-history checks and isolated corrected build planned. API009 Fail77.9 remains last completed. See current investigation/ledger; no post-fix result yet. Prior SR036 diagnostic completed four reproductions and cleanup; its stale underway checkpoint below is superseded by API010 plan reconciliation, not a new acceptance score.

---
# API-REV-009 — Integrated executable validation: Fail / 77.9%

2026-10-01. Large / High unchanged. Trigger: CRR014 integrated implementation-source Pass (9.40/10), IR009 / DR002. Authority: compaction Approved SR033 / Ready SR035 / ARCH-REV005; upstream cross-scope Approved SR008 / Ready SR010. Reviewed CURRENT WORKTREE plus cumulative merge, not index alone. **API009-F001 blocks integrated acceptance. Request focused failure-origin review, not successful-test review or Delivery.**

Prior ARCH004 / IR007 / CRR011 9.40 / API008 95.0% / CRR013 Pass remain PRE-INTEGRATION ONLY and are not retroactively rescored. API001 baseline and all subsequent history remain below. Cumulative package is active; the incoming-reference index is navigation, not a claim that all 3,698 historical files were reread. Legacy/compatibility removal: none retained per current handoff. SR035 persisted transition: Not Affected; ephemeral input queue is not stored. No new native activity journal.

## Blocking finding — API009-F001
**Preliminary classification: Local Fix — implementation integration; recommended implementation owner, subject to Code Review failure-origin determination.** No production fix made. No claim yet whether this predates the merge or which layer should own the correction.

Approved basis: REQ-012 / AC-014 / AC-017 and SR035 DI001.a verification: held A must not be duplicated on same-process reconnect. This is an ordinary single-user native View > Reload in the isolated worktree app, not an artificial multi-tab race.

Expected: one held user bubble for one accepted input after history and live snapshot hydration.
Observed: both hosted Agent and hosted Team lead display **two copies** of their held input: one anonymous history bubble plus one identity-bearing Held bubble. The server reports exactly one held entry for each child, unchanged instance/revision/identity before and after the genuinely new renderer. No evidence of duplicate queue admission or parent execution; neither held input reached a parent model request.

| Child | Native instance | Held message ID |
|---|---|---|
| api9_reviewer_5d6ebf31c2ab46c9a7107528e6da6f2d | 94e7a2fb-ea81-402a-8d78-e057e3f47d6d | 482afc18-2a66-440a-8f83-2b4d5c089e40 |
| api9_lead_3a6a5e7b787943b594a6461899fe6043 | 0e8c27fd-a6fb-4695-a5a4-a9a2da1be54f | 9e504a42-e7bb-4491-ad1b-a712727162b5 |

Both states: revision12, sequence2, turn_0002, held_turn / awaiting_user / failureEpoch2. Text markers: API9-AGENT-RECONNECT-HELD-A and API9-TEAM-RECONNECT-HELD-A. Host daily_assistant_c885a1076e524ac493bf01d1ac03a4c5; Team api9_team_9c1e5092646448b0adda985405be70d8.

Evidence under api-e2e-evidence/api-rev-009/product:
- real-reconnect-before.api.json, real-reconnect-after.api.json, real-reconnect-comparison.json: exact two-child live snapshot equality.
- real-reconnect-* sentinel/timeOrigin evidence: true renderer replacement, timeOrigin1790859976183.3 ->1790860118043.5 and sentinel removed.
- finding-agent/team-projection.api.json and finding-agent/team-dom.json: one history entry versus two visible leaf bubbles each; duplicate-held-agent.png and duplicate-held-team.png support the DOM observations.
- owned-run-memory-before-cleanup: copied only owned test-run memory; native raw user trace has one copy but lacks messageId/dedupeKey.
- assert-evidence.mjs / assert-evidence-result.json: executable checks corroborate these observations. “Evidence assertions Pass” is NOT product acceptance.

Preliminary trace: native raw user row -> public history DTO lacks accepted-input identity -> buildConversationFromProjection constructs an identity-less user message -> handleAgentInputState cannot identity-match and appends another held message. Existing context tests create empty conversations and bypass this history/live merge. Do not infer that content-based deduplication, a migration, or a new persisted schema is required; reviewer must determine origin and correct boundary.

Temporary captured-response executable repro: from worktree root,
pnpm -C autobyteus-web exec vitest run --config <absolute api-rev-009>/finding/vitest.config.mjs --no-watch
Result: **2 Fail**, expected one matching user bubble, actual two, for Agent and Team. Exact argv/cwd/exit in finding/probe-command.json; output in finding/probe.log. It executes production conversation hydration and input reconciliation using actual captured responses. It is not durable coverage freezing an incomplete identity representation. Investigation recorded that decision before this probe edit.

## Repository execution and durable coverage
Project path: root TESTING.md (only applicable testing guideline), server/web AGENTS.md, package scripts and test runner setup. Worktree-owned Prisma test DB; Nuxt/happy-dom is not native renderer proof. Node22.23.1 / pnpm10.28.2. Exact commands, cwd, times, exits and raw output are the corresponding JSON/log pairs under api-rev-009 and run-check.py.

| Check | Result | Proof limit |
|---|---|---|
| contracts | 8 Pass | Selected strict DTO schemas |
| focused-server | 18 Pass /4 files | Root, hosted Team, recovery and stream producer cases |
| focused-web | 38 Pass /4 files | Real client context/store/stream/sync code with controlled I/O; ownership and atomicity checks |
| native-root4 | 10 Pass /1 file | New native hosted Agent/Team FIFO at both sites, in-process reconnect snapshot, actual GraphQL schema, root Stop |
| native-termination | 6 Pass /1 file | Actual AgentRunService whole-root success, child failure and later host failure with controlled fault seams |
| regression-server | 108 Pass /13 files | Selected recovery/races/drain/Team/Org/sender/history/settings/harness |
| regression-core | 101 Pass /8 files | Selected native runtime, strategy, commit, transport and current snapshot reader |
| regression-web | 110 Pass /13 files | Selected retained activity, termination, input identity, Team/Org and rendered component regressions |
| product fixture guards | 11 checks Pass /8 local requests | Emulator safety/protocol only; separate from45 product requests |
| finding captured-response probe | 2 Fail | Reproduces actual history/live held-input duplication |

Counts overlap and MUST NOT be summed as unique coverage. No full-suite/typecheck/native whole-product Pass.

Three new durable paths, no existing coverage removed:
- autobyteus-server-ts/tests/integration/agent-run-collaboration/native-compaction-root-fixture.ts
- autobyteus-server-ts/tests/integration/agent-run-collaboration/native-compaction-root.integration.test.ts
- autobyteus-server-ts/tests/integration/agent-run-collaboration/native-root-termination.integration.test.ts

Fixture uses real native AgentFactory/backend/AgentRun/FIFO, actual collaboration root admission/registry/FlatTeam/root manager, strict stream handler and real GraphQL schema. Parent model, compaction strategy, host provisioning and selected failure outcomes are deterministic seams. Handler reconnect is in-process, not a physical socket or renderer reload. Post-response A waits for the actual settled safe point before B; fast-B races are covered separately by existing tests, not this new settled case. The Team has lead/peer, with peer dormant. Child failure wrapper rejects after actual native finish; later host failure occurs after child closure. Only whole-success history outcome confirms termination.

Retained unsuccessful setup/test iterations: first contract/server launch used tickets/ cwd and failed before Vitest; corrected to worktree. Initial native post-response tests raced before consumed A settled and cleanup could obscure failure; corrected test synchronization and error preservation. GraphQL additions initially mixed module realms and failed before resolver entry; corrected to project createRequire('graphql'). Final native-root4 is10Pass; earlier failures/logs remain, not production defects or erased attempts. Successful test-code review of the three new files remains pending until executable validation succeeds.

## Broader validation — Required, executed, failed gate
Selected documented surface: pnpm --silent isolated-app start --build from this worktree. Owned instance iso-56935-c9f4, control56935/backend56936. Minimal definitions seeded through public GraphQL; collaborators admitted through normal UI @ flow; selected native model through normal settings/model reload. Public LMSTUDIO_HOSTS configured only to owned loopback127.0.0.1:57269; model api9-deterministic-32768:lmstudio@127.0.0.1:57269. Compaction override12000 / ratio80. No credentials imported or remote generation.

Temporary loopback-provider.mjs emulates provider protocol with deterministic responses/faults, bounded80 requests/one hour/120s holds, disarmed by default. It is NOT model quality, fidelity sampling, or renewed campaign authorization. Product:45 local requests (17 parent /28 compaction), eight approved three-attempt failure groups, one actual read_file response; remote0. Three attempts are the approved strategy behavior, not an accidental retry defect.

Scoped successful observations:
1. Dormant public root inspection shows offline children, null recovery, empty agent_input_states; inspection does not activate a host.
2. Agent and Team: consumed seed input reaches post-response compaction failure; subsequent distinct A fails pre-parent and is held; B queues under retry. Release yields exactly one parent ACK A then one ACK B, queue empty. Team consumed an actual read_file result before failure and did not replay the tool.
3. Both children concurrently compacting: normal whole-host history Stop succeeds; both show STOPPED/Offline, prior completed activity retained, history Stop action gone. Same-renderer saved selection retains stopped native activity for both.
4. Actual native View > Reload after Stop produces a new renderer: cold inspection preserves conversation/tool history but has no native COMPLETED/STOPPED/COMPACTING cards. This is renderer cold-state evidence, not backend restart, native cold history or power-loss proof.
5. Both children subsequently reach held recovery. Actual native reload preserves exact live input state but duplicates held bubbles (F001). Retry/B continuation after this failed reconnect was not tested; cleanup Stop discarded held inputs without parent dispatch.

Actual two-child atomic hydration, stale read/service/socket/node/child ownership, child failure and later-host failure/uncertainty have selected repository execution with controlled I/O; actual two-child UI hydration/normal Stop also ran. No full-product fault-injection matrix or fresh complete Team/Org product regression campaign is claimed.

### Mandatory evidence correction — ignored reloads
Earlier scripted location.reload() returned “ok” but the packaged shell prevented navigation. Sentinel/timeOrigin proved that no new renderer existed. **All earlier reconnect/cold files before native-menu-reload-proof.json record attempted intent only; corresponding preliminary reload-success checkpoint language is withdrawn.** A/B recovery and same-renderer retention observations stand, but those attempts do not prove reconnect or cold hydration. CLI file:// navigation was rejected without effect. Only later native View > Reload, with changed timeOrigin/removed sentinel, supports cold-real-* and real-reconnect-* evidence. Historical attempts were not overwritten. This correction also supersedes early user-facing progress wording.

## Confidence decisions
Evidence-based assessment, not a statistical probability or semantic-model rescore. Post-repository score:86.7% (90/92/75/90/90/75/95); broader Required to close built HTTP/WS/native-renderer and lifecycle gaps. Final mean545/7=**77.9%**:

| Mandatory category | Final % | Evidence and remaining gap |
|---|---:|---|
| Requirements / acceptance proof |50|Critical AC014/017 reconnect single-input presentation fails. Requires origin fix and real rerun.|
| Changed-boundary execution directness |95|Actual built native/backend/HTTP/WS/renderer journey and captured-response source repro.|
| Integration realism / mock gap |90|Real product spine; provider synthetic and failure outcomes partly controlled seams, not model quality.|
| Environment/configuration/identity/fixture fidelity |95|Owned worktree build, exact ports/instances/input IDs and verified renderer replacement; ignored attempts explicitly excluded.|
| Failure/lifecycle/recovery evidence |75|Both sites and whole Stop exercised; reconnect fails and downstream continuation remains unfinished.|
| User surface / browser / desktop |50|Critical duplicate user bubbles visibly fail in both real hosted child kinds.|
| Durable regression relevance |90|New16 passing native tests plus selected regressions; historical/live identity merge gap now reproduced but correct durable regression awaits origin fix.|

Broader decision: Required — executed and found blocking failure; reroute, not additional arbitrary sampling. Not an environment blocker. A failing critical criterion overrides passing suites and any average.

## Preservation and cleanup
Entry pins38,967 paths /3,698 incoming references. HEAD026476691c62bda309ce7f2a9342ebb444959f98 and MERGE_HEADd057801c89f26bc69a97331b59631c00519aec98 preserved;672 staged paths, zero unmerged, merge IN-PROGRESS/UNCOMMITTED. Logical index entries and stash unchanged. **Raw index SHA changed** during read-only Git stat-cache refresh; do not claim byte-identical index. No staging/reset/merge completion/cleanup/commit/push/release or production source edits by this stage. Four canonical API authorities updated; three new durable files and this stage's evidence added. Existing protected API12, reviewed production, historical evidence and other pinned inputs preserved; see final-audit.json.

Standard documented build regenerated ignored build outputs. They are not all covered by source preservation pins and are NOT claimed byte-identical. Prebuild backup retained (3,324,772,352 bytes, SHA2561e21806e7279451d5f9dedca311e9519ff6aa84ee83c9750b7bc1a530cd72ff0); location in build-backup.json. Prior archives untouched.

Cleanup: normal UI whole-host Stop; provider disarmed; pnpm --silent isolated-app stop iso-56935-c9f4 exited0, no forced stop, own data root removed and both ports released. Owned providerPID65323 terminated; no owned app/provider session remains. Owned run memory/logs copied into product evidence first; no vault/credentials copied. Standard worktree test DB and backup remain intentionally. User app/data, unrelated processes and old stopped instances untouched. See isolated-stop.json, isolated-list-after.json and product/cleanup.json.

## Provenance incident and residuals carried unchanged
CRR014 reviewer accidentally overwrote original IR009 server-overlap-final.log and web-overlap-final.log by executing scripts with internal redirects. Exit files rewritten byte-identically; original pins retained. IE searched487 logs/text files and two older archives; no original recovery or reconstruction. These replacement files are CRR014 rerun evidence, NOT original IR009 transcripts. Historical IR009 summaries retain only partial original raw corroboration. Reviewer evidence-handling error, not a source defect deduction; this stage did not invoke those scripts.

F005 remains accepted known/nonfixed/nonPass, Qwen STOP; F004 unknown. SR022 exhausted (one fidelity Fail/three usable), v6 unapproved. CG033 preparatory quiescence timeout remains unproved/not fixed/not pump Pass/not executed baseline. Historical OOM and web8GB plain tsc exit2/7078 diagnostics remain non-green, not vue-tsc/full Pass. Fourteen wider plus seven baseline residuals unwaived. API006 withdrawn reload claims and API007 unsupported directSummaryShieldOmissionPressureVerified:true excluded. API007 Team timeout followed by C recovery is not retroactive B Pass. CRR012/TR001 reporting correction validated by API008/CRR013, without changing semantic confidence. No new ledger architecture, native cold-history or power-loss promise. Delivery semantic docs, isolated user-candidate verification, explicit user testing, finalization/release remain separately gated.

## Routing disposition
Fail / preliminary implementation Local Fix. Fresh rule-based handoff required to Code Reviewer for **focused API009-F001 failure-origin review** with the full cumulative package and three new durable files. Not a successful-test review request. No direct Delivery/Designer advancement. Receipt is recorded only after tool-confirmed delivery.

---
## Prior completed report (historical)
# API-REV-008 — reporting Local Fix validated: Pass / 95.0%

2026-10-01. **CRR012/TR-001 corrected by the API owner; independent successful-validation test-code re-review required.** This is not a new implementation-source review, product failure, Delivery, full-suite/typecheck Pass or release approval. Large / High; Approved SR033 / Ready SR034 / ARCH-REV004 / IR007 / CRR011 source Pass9.40 unchanged. Product Design and DR N/A. Pending worktree remains authoritative at HEAD6908ccff483f1eca522caa65bfaaf6dcfcc26750.

## Trigger, correction and truthful historical interpretation
CRR012 correctly found that F006 removed the whole-history omission predicate but left an unsupported literal `directSummaryShieldOmissionPressureVerified:true` in the flow result type/value and registered consumer assertion. Removed exactly those three lines. No replacement verification claim, new helper, production/prompt/scenario change or rejected emoji/U+FFFD ban. Generic JSON serialization remains unchanged: it now receives a result without the retired property.

**Historical API007 flow.log line475 emitted that field as true without supporting observation. It is unsupported and must not be used as proof.** Original log SHA256 `66411303344b6c8ca6e894822df1a04a822952f20be6076297ed4b1f6e54f250` is unchanged. See `api-e2e-evidence/api-rev-008/historical-claim-annotation.{md,json}`. This qualification applies to copies/quotes of that result below and elsewhere; original logs are never rewritten. The valid framing, safe Unicode, exact source immutability/tool-tail, threshold, tool order, exact artifact and snapshot/next-request checks are preserved. **API007's historical Pass95.0 and actual successes are not retroactively rescored or turned into failures.** CRR012's test-review Fail is retained, not silently overwritten.

## Executed correction checks
Root TESTING.md / server AGENTS.md define the selected Vitest path; no closer test guideline found. Standard server configuration and test-owned worktree database used; no user app/data or credentials. Node22.23.1 / pnpm10.28.2. Exact cwd, commands, times and child exit codes are in each case JSON under api-rev-008.

| Case | Observed result | Evidence meaning |
| --- | --- | --- |
| TR001-RED | Expected Fail:2 failed,8 deselected | New producer/type and registered-consumer guards both fail on the unsupported field before removal. Not a product failure. |
| TR001-GREEN | Pass:2 passed,8 deselected | Identical guards pass after the three deletions. Remaining proof-field names retained. |
| C01 broader offline | Pass:30 tests/3 files,0 skipped | 18 harness +10 boundary +2 observation. Includes framing, valid emoji/literal U+FFFD, malformed-surrogate rejection and source preservation; setup mocks stop before generation. |
| AUDIT | Pass | All2528 input files exist; only three planned durable paths/four API authorities changed among pins. CRR011/source, CRR012 review, historical logs and other prior durable paths preserved; see final-audit.json. |

Named narrow command:
`pnpm -C autobyteus-server-ts exec vitest run tests/unit/secret-management/live-e2e-compaction-boundary.test.ts -t 'retires unsupported omission-pressure reporting' --no-watch`

Broader affected command:
`pnpm -C autobyteus-server-ts exec vitest run tests/unit/secret-management/live-e2e-compaction-boundary.test.ts tests/unit/secret-management/live-e2e-harness.test.ts tests/unit/secret-management/live-e2e-compaction-observation.test.ts --no-watch`

The new tests are explicitly **source reporting-contract guards**, not runtime generation or semantic-quality proof. They cover both declaration/producer and actual registered consumer; existing executable builder/Unicode tests remain. Exact before/after patch independently shows the serializer is not filtered and the producer removes the key. Full live success code is not re-executed this round. Counts overlap; do not add narrow2, final30 or historical28 into a total. Initial temporary runner cwd error (tickets/ instead of worktree) produced ENOENT before Vitest; original runner/log retained, fixed and rerun. No failed launch counted as red proof.

## Post-repository and final confidence / broader decision
The following is the current cumulative scope assessment, reusing pinned API007/API006 runtime evidence **with the unsupported field excluded** and adding the narrow reporting correction. It is not a new score assigned to historical API007. No fresh provider/UI evidence claimed.

| Mandatory category | % | Basis / remaining limit |
| --- | ---: | --- |
| Requirement / acceptance proof |95|Pinned API007 AC001–018 reconciliation and actual observations preserved; TESTING assertions-first defect corrected. No omission-glyph acceptance requirement. F005 stays accepted known deviation.|
| Changed-boundary execution directness |95|Red/green guard covers actual producer/type and consumer; exact three-line removal changes result shape, no serializer masking. Guard is static, not a live result rerun; no behavior-bearing generation code changed.|
| Cross-boundary realism / mock gap |95|Actual prior DeepSeek and packaged-product evidence unchanged; this local result/consumer contract needs no external service to detect stale property. No emulator/model equivalence claimed.|
| Environment / configuration / identity |95|Documented worktree Vitest/owned test database, pre-edit hashes, no flags enabling live campaign, no dependency/config/fixture identity changes.|
| Failure / edge / lifecycle / recovery |95|Expected two red assertions and positive Unicode/negative-surrogate controls; prior native failure/recovery/termination observations remain pinned. CG033 limitation retained.|
| User surface / browser / desktop |95|No UI delta; prior actual API006/007 journeys retained with reader/model/member limitations. Not re-executed.|
| Durable regression quality / relevance |95|Two focused regression guards demonstrably detect this exact stale contract; all30 related tests pass. Other9 prior paths unchanged; consumer now correctly counted as cumulative12th. Independent review remains mandatory.|

**665/7 =95.0%; no category below90.** Post-repository and final scores identical because no broader run occurred. Critical approved product criteria continue to rely on the previously recorded direct evidence, not the deleted field. **Broader validation: Not Required for this correction.** All executable changes are deletion of an unsupported test-result field and consumer expectation, with a deterministic red/green reporting guard; no production/generation/prompt/API/UI/lifecycle code changes. Remote repetition would not materially improve proof of literal field retirement. Reviewer also explicitly limited verification to affected offline checks. No new remote campaign or UI run performed.

## Durable review scope
Three paths changed in this round: live-e2e-harness.ts, live-e2e-compaction-boundary.test.ts and real-e2e-provider-capabilities.e2e.test.ts. No file/test removal; only the stale claim removed. Cumulative **12 paths** below (previous11 plus the formerly unchanged consumer). The full cumulative diff and exact round delta accompany the package. All remaining9 paths preserve entry hashes.

1. `test-support/live-e2e/live-e2e-harness.ts`
2. `test-support/live-e2e/run-live-e2e.mjs`
3. `test-support/live-e2e/compaction-quality-checks.ts`
4. `test-support/live-e2e/live-e2e-safe-error.ts`
5. `autobyteus-server-ts/tests/unit/secret-management/live-e2e-harness.test.ts`
6. `autobyteus-server-ts/tests/unit/secret-management/live-e2e-compaction-boundary.test.ts`
7. `autobyteus-server-ts/tests/unit/secret-management/live-e2e-compaction-observation.test.ts`
8. `autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts`
9. `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-compaction-quality.e2e.test.ts`
10. `autobyteus-ts/tests/integration/agent/working-context-snapshot-restore-flow.test.ts`
11. `autobyteus-web/stores/__tests__/retainedActivityTermination.spec.ts`
12. `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` — newly cumulative in API008.

## Preserved limits / downstream gates
- F005 SR020 accepted known/nonblocking, **not fixed/not Pass**; Qwen STOP. F004 historical cause unknown; F006 substantive correction retained (now residual reporting fixed). SR022 exhausted1 diagnostic fidelityFail/3 usable; v6 unapproved.
- CG033 first-auto preparation/quiescence timeout **unproved/not fixed/not pump Pass/not executed baseline**, before backend shutdown. No new immediate-preparation latency/shutdown policy.
- Plain web tsc OOM→8GB exit2/7078 diagnostics remains non-green, not vue-tsc/full typecheck Pass and not comparable to historical6836. Fourteen wider residual failures and seven baseline contract failures remain unresolved/unwaived.
- Actual API007 Team timeout followed by C recovery is not retroactive B Pass. Real DeepSeek versus deterministic protocol-emulator evidence remains separate; consumed-tool nonreplay is actual prior UI/raw evidence. Repository versus UI/member counts and raw/current/cold reader distinctions remain.
- No unsupported same-ID workflow, native cold replay, physical drag, seven-member concurrent UI or power-loss claim reinstated. API006 historical Blocked89.3 authorization premise was corrected; API007 interim92.9 was incomplete, not an active blocker.
- IR007 removal/persistence disposition remains no legacy dual-path and stored formats Not Affected; no runtime compatibility or migration added.
- No new service or browser resources launched. Offline suites clean their owned temporary roots; designated worktree test DB retained by standard setup, no user data touched. No staging/commit/fetch/push/release or unrelated cleanup.
- **Required next gate: proportional independent test-code re-review on Large/High route.** API owner reports TR001 correction complete, not reviewer closure. Delivery/docs/integrated verification/explicit user verification/finalization/release remain pending.

---
## Historical API007 completed result and earlier rounds (preserved; TR001 annotation above applies)
# API-REV-007 — completed API/E2E validation: Pass / 95.0%

2026-10-01. **Pass for the approved changed behavior; independent test-code review is required next. Not Delivery, a full-suite/typecheck Pass, or release approval.** Large / High; Approved SR033 / Ready SR034 / ARCH-REV004 / IR007 / CRR011. The current pending worktree remains authoritative. No permission or credential blocker remains.

## Completion delta
The earlier 92.9% checkpoint was incomplete, not blocked. Continuing after the user's “then why are you stopped” closed the selected remaining ordinary Team/Org recovery and consumed-tool UI gaps, then added a fresh targeted regression check. The real DeepSeek results below remain attributed to their original campaign; no additional remote calls occurred in this UI continuation.

- **Team:** real two-member definition/run, one recovering coordinator. A held after exhausted retries; B queued during recovery. The fixture's 120-second hold expired during engineer context recovery, so that B attempt is NOT counted as successful. The guarded fixture closed. An owned replacement retained the original cumulative count and absolute deadline. A new ordinary C submission then recovered the original A, B and C exactly once, in that order, with the original A identity.
- **Org:** real direct agent plus two-member Team (three configured agents), one recovering direct agent. Normal A held → B admitted/queued → released successful compaction → A then B exactly once. Actual Org stream envelopes, runtime/member identities and visible badges captured.
- **Consumed tool:** normal UI-created read_file-only agent, user submission and Approve. Exactly one real file read, one tool result and one tool-follow-up parent request. Post-response compaction exhausted three attempts; new A exhausted three more and stayed held; B authorized successful recovery. A then B ran once, without replaying the consumed tool or original READ admission. Raw traces and actual WebSocket TOOL_EXECUTION_STARTED/SUCCEEDED each show one invocation.
- **Storage/oracles:** three current versionless snapshots each contain one summary, exactly matching a subsequent parent request. Unique raw admissions and actual held/recovering identities verified. **52 offline evidence checks Pass**, separate from repository test counts.
- **35 local product requests = 13 parent + 22 compaction**, IDs1–35 across owned process replacements; original ceiling40/original60-minute deadline preserved. External generation is a deterministic protocol emulator through the real LM Studio adapter, NOT LM Studio inference or model-quality evidence. Exact v5 prompt retained. No user app or credentials involved.
- Fresh final regression: **334 Pass /41 core files** (memory, commit faults, runtime compaction and restore); **20 Pass /3 API files** (settings/history); **3 Pass /1 strict compaction DTO file**. Earlier in this continuation **2 Pass /1 root recovery file**. Exact commands/times/logs under ui-continuation/C02-R, C05-R, C07-R and root-recovery. Overlap with earlier rounds is NOT added into a grand total.
- Temporary fixture guards: original8 checks/5 separate requests; tool extension11 checks/8 separate requests. Neither is product/model evidence.
- Cleanup verified: owned iso-58629-0f2e stopped normally, data root removed; fixture stopped; ports58629/58630/58634 released. Test-owned synthetic source/evidence retained intentionally.

Evidence: `api-e2e-evidence/api-rev-007/ui-continuation/README.md`, `evidence-assertions.json`, complete browser command/result pairs and passive captures, `loopback-wire.jsonl`, `final-memory/`, `cleanup.json`, `final-audit.json`, cumulative `reference-index.json`.

## Mandatory final confidence
Scores concern the approved compaction/recovery/terminal-display change, not every feature or all supported external runtimes.

| Category | % | Evidence and remaining limit |
| --- | ---: | --- |
| Requirements / acceptance criteria |95|AC001–018 mapped below; real first/repeated DeepSeek semantics plus native commit/failure/restore and actual UI recovery/termination. F005 remains the explicit accepted known deviation, not fixed.|
| Changed-boundary execution directness |95|Core, native backend, API, actual streams/stores/renderers, current reader and persisted snapshots exercised. No mock substitutes for an asserted product boundary.|
| Cross-boundary realism / mock gap |95|Real DeepSeek generation complements full packaged-product timing checks with a clearly labeled external emulator; no all-model reliability claim.|
| Environment / configuration / identity |95|Isolated documented worktree app, exact approved prompt, public Settings, owned fixture, preserved request budgets/deadline, actual identities and verified cleanup.|
| Failure / lifecycle / recovery |95|Three-attempt exhaustion, held/queued ordinary admissions across standalone/Team/Org, renewed failure, consumed-tool nonreplay, prior actual abort/late-result/reconnect/saved-reader checks. CG033 remains unproved outside the post-confirmation contract; no new latency guarantee.|
| User surface / browser / desktop |95|Actual three-root controls, retained Stopped/static facts, genuine saved readers/reconnect from API006, new Team/Org recovery and consumed-tool approval/continuation. Native physical drag and seven-member simultaneous UI are not claimed.|
| Durable regression relevance |95|Fresh334/20/3 targeted regressions plus current28 harness checks, actual real-provider durable cases and prior394 scoped checks support the current assertions. All11 cumulative API paths unchanged this round; independent review remains a separate required next gate.|

**665/7 = 95.0%.** No missing critical acceptance evidence identified for the approved supported scope. **Broader validation: Required and executed; further broader execution Not Required for this API stage.** The three prior90 categories rise for the new boundary evidence and fresh targeted regression, not merely because authorization was granted or review is pending. Full-suite/typecheck status is not converted to green.

## Requirement-to-evidence reconciliation
| AC | Direct executable basis (with prior evidence explicitly attributed) |
| --- | --- |
|001/002/004/007/016|API007 real DeepSeek threshold/commit/next-parent flow and first/repeated manual source-output assessment; current memory334 regression.|
|003/011/015|Current memory/parser/replaceable strategy and orchestration checks; harness28 and exact wire prompt/no child/category/tool protocol; source review remains source evidence only.|
|005/006/013|Current core fault/retry tests; actual UI three failed attempts, held gate, renewed failure and success; prior API006 cancellation/backoff/late-result proof.|
|008/009/012|Fresh restore/memory API/current snapshot checks; API003 actual startup/writer-cut/reader process evidence; API006 actual cold saved-selection/projection/no-generation. No new migration/native replay added.|
|010|Fresh Settings API positive/secret-negative plus retained API006 actual Settings Save/readback/reopen/clear closure; current model/config factory tests.|
|014/017|API006 original standalone A identity/attachment/queued inputs, corrected actual reconnect; new Team/Org ordinary-user order and real consumed-tool UI/raw nonreplay; root recovery and native race regressions.|
|018|API006 IR007 actual standalone/Team/Org recovering Terminate, separate event/command confirmation, static neutral Stopped/facts; actual in-memory versus cold readers and later separate new-runtime work. New UI success is complementary, not a substitute for those termination cases.|

## Limits preserved, not waived
- F005 SR020 accepted known/nonblocking, NOT fixed/Pass; Qwen STOP. F004 historical cause unknown; F006 corrected. SR022 exhausted one diagnostic fidelity Fail/three usable; v6 unapproved. Current DeepSeek samples do not erase these.
- CG033 first automatic/never-settling preparation timeout remains unproved and neither fixed nor a pump-deadlock Pass. It occurs before successful shutdown; SR033 requires display after confirmation and SR034 excludes general shutdown redesign. No new immediate preparation-latency policy is asserted.
- IR007 plain web tsc OOM then8GB exit2/7078 diagnostics (including five changed-test Vue imports) remains non-green, not vue-tsc, not comparable to historical6836. No full typecheck or full-suite success claimed.
- Historical14 broader provisioning/AGY/Claude/Codex failures and separate7 collaboration contract baseline failures retain their original executed comparisons and unresolved status. The compaction-specific current tests and native product paths passed; this does not waive or repair those wider failures.
- Team2/configured1recovering, Org3/configured1recovering. Actual seven-member atomic staging is repository evidence, not seven-member UI proof. No native physical gesture or whole-archive/power-loss guarantee. The latter is explicitly outside the approved per-file atomicity contract.
- Product Design and Delivery re-entry N/A. Delivery/docs/integrated gates/explicit user verification/release remain pending.

## Coverage change / review handoff
No production or durable test edits in API007. The cumulative **11 API-owned durable paths** (inventory `api-rev-006/ir007-resume/owned-paths.json`) require proportional independent successful test-code review on this Large/High route. In particular preserve the prior strict retainedActivityTermination fixture repair, versionless restore assertion correction, public numeric setting/security regression and real-provider harness boundary changes. No test removals or parser weakening. Do not forward directly to Delivery.

Local execution corrections are retained: Team fixture hold deadline; initial wrong UI selectors without side effects; offline raw-shard ordering and pre-held identity-window oracle mistakes corrected against unchanged evidence. They are not hidden product failures or retroactive proof. Revision record retains API001 baseline and all earlier Fail/Blocked/incomplete checkpoints.

---
## Historical API007 checkpoint and preceding rounds (superseded as current result)
# API-REV-007 — real DeepSeek campaign Pass; cumulative validation incomplete / 92.9%

2026-10-01. **User-approved real-provider work completed and passed its scoped checks. Overall API/E2E acceptance is not yet Pass. No permission or credential blocker remains.** Large/High, SR033/SR034/ARCH004/IR007/CRR011 unchanged. API006 historical Blocked89.3 preserved, but claimed missing authorization/source premise corrected: original explicitsource approval was already recorded and overlooked; latest “go ahead, you got my approval.” independently confirmed continuation. No technical access denial observed.

## Executed evidence
- Instructions: root TESTING.md (no closer TESTING), server AGENTS/package/Vitest, secret_management.md; normal secrets:import preview→TTY IMPORT/newownedabsoluteDB, normal builtserver/bootstrap and registered real-provider tests.
- **28Pass/3focused durablefiles** (10boundary/observation+18harness); **14Pass/1temporaryguard** separately. Initial wrong-root-cwd Vitestlauncher error retained, corrected documentedservercwd, no assertions/providercalls at failedlaunch. Prior API006394scoped/earlier346 attributed separately, no overlapping total.
- Importer/newvaultREADY. Source env read only by importer/no valuesprinted;10recognizedaliases imported, onlyDeepSeekselected. Source stat unchanged. Existing5%test-onlyratio used, productiondefaults/prompt unchanged.
- Preflight **1Pass**; actualagentflow **2Pass** (includes readiness); first/repeatedsemantic **1Pass**, no skips. Exact commands/configuration/times: commands.json/execution.json.
- **11real outbound =8parent+3summary**, HTTPSDeepSeekonly, below13limit.1automatic+2semantic summaries, allHTTP200/allcomplete-stop. Livephases42.732seconds; wholeownedrunner48.741seconds includingreadiness. No repeatcampaign/Qwen/v6/substitution.
- Threshold49,936; promptobservations2531,15827,15985,17037,17266,**58807**,3898,4168. Requested→Started→Completedonce.4ordinaryturns,3read_file+1write_file, exact9fieldartifact after sourcefiledeletion. Nativepairs/rawarchive/snapshot/final-fit assertions reached. Persisted summary exactly next-parent summary/current-user separate; no category/child/tool replay.
- **Manual source/output scopedPass**: constraints/permissions/references, completedinventory vs pendingrisk,7→30days, cloudexportcancelled, APPROVAL-73requested/notcompleted, unresolvedrollbackcomparison preserved. Smallfirstfixture expanded793→2097chars (recorded, no approved ratio threshold); flow9151→4785; repeated2935→2698. Minor historical only/concisely wording and redundancy noted; no material pendingstatecorruption observed. Historicalfailures not erased.
- **39offline evidence assertionsPass**, not repositorytesttotal.
- Normalownedserverstop, runtime/newDB/rootkey/WALsiblings/harnessworkspace removed; PIDgone/port56881released. User app/sourceenv untouched. No unrelatedcleanup.

Evidence api-e2e-evidence/api-rev-007/: entryaudit2053references, frozenmanifest/approval/plan, repo/guard/import/real logs, fullsafe wire, summaries/source/probes, semantic-review.md, evidence-assertions.json, audits/fullindex. **No production or durabletest edits this round.**11cumulativeAPIpaths byte-identical; independent successful testreview stillpending, not supplied by CRR011sourcePass.

## Confidence and remaining work
Postrepository89.3/BroaderRequired. Current:
| Category | % | Evidence / uncertainty |
| --- | ---: | --- |
| Requirements/AC |95|Current AC007 first/repeated manual and AC001/004/016 threshold/commit/continuation direct; prior actual runtime/UI retained. Remaining risks below still govern gate.|
| Changedboundary execution |95|Real backend/core/tools/compactor/nextrequest/storage plus prior actual3terminationowners/renderers.|
| Integration realism |95|Real DeepSeek complements actual desktop/backend/storageemulation; no fabricated modelquality.|
| Environment/config/identity |95|Normalimport/newownedtarget/model/exactv5/test-onlyratio/pinnedsource/globalcounters/cleanup.|
| Failure/lifecycle/recovery |90|Prior heldA/B/retry/cancel/reconnect/late-discard retained; CG033/broaderlifecycle unchanged.|
| User/browser/desktop |90|Prior standalone/Team/Org terminal/readers direct with memberlimits; fullTeamOrg recovery/consumed-toolUI/physicalgesture not closed by backend tests.|
| Durablecoverage |90|Currentfocused/prior394valid;11pathreview/widercontracts/fullsuite/plainwebtsc residuals unchanged.|

**650/7=92.9%, below95 clean target.** Neither overallPass nor an invented environmentalblocker. Selectedrealcampaign complete; **Broader Required**. Next targetedlocal evidence: actual Team/Org ordinary-user heldA→B recovery and consumed-tool continuation UI using bounded deterministic externalfixture with network/identity/no-dispatch oracles. ClarifyCG033 only if supportedruntimeevidence establishes blockingpolicyquestion; no shutdownredesign/latencycriterion invented. Eventualsuccessful overallAPIresult enables independenttestreview.

This is API007checkpoint with completed selectedcases, **not completedoverall verdict**. API006completedoverall entry stayshistorical, authorizationhold no longeractive. No executablefailure/upstreamgap invented merely forhandoff.

## Preserved boundaries
F005SR020acceptedknown/nonblocking notfixed/Pass;QwenSTOP;F004unknown;F006corrected;SR022exhausted1fidelityFail/3scopedusable;v6unapproved. New sample doesnoterasehistory.
CG033first-auto never-settling preparationtimeout beforebackendshutdown remains distinct from heldA/recoveringBsuccess; notpumpdeadlock/fixed/executedbaseline/waiver. No new immediatepreparationlatency policy.
IR007plainwebtscOOM→8GBexit2/7078diagnostics incl5changedtest.vueimports remainsnon-green/notvue-tsc/notcomparablehistorical6836. Other14residuals/7baselinecontractfailures/fullsuite/physicaldrag/consumedtoolfullUI/fullTeamOrgUI/supportedlifecycle remainunwaived. Wholepowerlosstransactionguarantee explicitlyoutofapprovedscope, notnewrequirement. Nativecoldreplayabsentbydesign vs retainedlive-memoryterminalfacts. Delivery/docs/userverification/release not reached. Product/DR N/A.


---
## Preserved API006 result (historical; permission premise corrected above)

# API-REV-006 — Blocked / 89.3%

2026-10-01. **Authorized deterministic validation is complete; overall acceptance is blocked, not Pass.** Authority: Approved SR033 / Ready SR034 / ARCH-REV004 / IR007 / CRR011 source Pass9.40, **Large / High**. Prior completed API005 Fail78.6 remains historical; F007 has since been closed by actual API006 Settings evidence. Old API006 interim90.7 and overstated reload/reopen proof remain withdrawn.

**Missing dependency:** fresh authorization for a real-provider campaign and a credential-source file for a new isolated test vault, to execute current ordinary first/repeated semantic fidelity (AC007; related AC002/004/014). No new remote budget accompanied this source-Pass return. Historical DeepSeek samples retain their source/configuration/sample limits; SR022 is exhausted, v6 unapproved, Qwen STOPPED. Local emulation was extensively exercised, but canned summaries cannot prove model quality. A bounded DeepSeek proposal (maximum13 provider requests/12minutes/exact approved v5/no Qwen or prompt changes) was presented to the user; no approval or credential source has arrived at this checkpoint. Do not silently run it. Future success would not automatically waive the remaining gates below.

This is not a new implementation-source Fail or a waived typecheck/shutdown diagnostic. Independent successful review of all11 cumulative API durable paths remains **pending**. No Delivery or release readiness.

## Investigation and execution surfaces
- Current pending worktree, not HEAD alone, is authoritative: HEAD6908ccff483f1eca522caa65bfaaf6dcfcc26750, branch codex/context-compaction-simplification-analysis, unchanged.
- Investigation/validity decisions/ledger preceded test edits and execution. Instructions: root TESTING.md; package AGENTS/manifests/runner configs; docs/isolated-app-instances.md; advertised browser-automation skill. Cumulative authority, legacy/compatibility and persisted-transition checks read. No new migration, native persistence, cache or replay ledger.
- Real product: documented worktree build/start, owned iso-51625-2dca, backend51626/control51625, private disposable data. Bundled attach-only browser CLI; exact submitted argv/scripts retained. No direct CDP, hidden store injection, user app or private history/credentials.
- Normal UI Settings selected owned local protocol fixture51536 through real LM Studio adapter. **Not LM Studio inference.** Factory/adapter/native runtime/commands/streams/renderer/filesystem/readers were real; external generation was scripted, exact-v5 and synthetic. Agent, Team, Org and runs created through actual UI.
- Passive WebSocket/Response.text/json observers captured real messages and consumed HTTP results without changing payloads. Initial window.fetch wrapper missed Apollo's already-captured fetch; first command HTTP response is not invented.
- Evidence root: api-e2e-evidence/api-rev-006/ir007-resume/. Exact commands/cwd/times/exits in case JSON, browser *.command.json, lifecycle results/logs. See terminal-assertions.*, wire and raw/snapshot captures.

## Repository checks and durable coverage
| Current resumed group | Final result | Boundary |
| --- | --- | --- |
| C06-F |8Pass/1file after initial8Fail|Strict retained-activity fixture repaired.|
| C14-T-core |106Pass/6files|Owner abort, sync commit precedence, recovery/lifecycle.|
| C14-T-server |39Pass/6files|Concrete native pump/drain, AgentRun ordering, root recovery.|
| C06-T |167Pass/15files|Three command owners/guards, actual Org staging/commit/adopt, retention/rendering.|
| C06-S |74Pass/4files|Standalone/Team/Org stream paths.|
| **Fresh resumed total** |**394Pass/32files**|Not full-suite/typecheck Pass.|

Do not add reviewer386 or prior API006346 to394: scopes overlap. Prior API006 F007 actual Settings Save/readback/reopen/clear and346 scoped repository results remain attributed to their original execution; no duplicate campaign demanded.

**API006-LF002 — durable test-only Local Fix:** only autobyteus-web/stores/__tests__/retainedActivityTermination.spec.ts changed: typed current snapshot, agent_input_states:[], idle recoverableBlock:null. Reproduced8 failures occurred before commands at strict setup. All8 original assertions retained; no parser/assertion weakening or production edit. Before-image/initial failures/patch/final8Pass retained. Owned diff check0.

Prior10 API durable paths unchanged; new fixture makes11 for eventual proportional independent successful-test review (owned-paths.json). No test removals. Temporary emulator/guards/browser journeys/evidence decoder are not durable product tests; they supplement maintained store/stream/native coverage through the documented disposable full-product surface, not an invented second product runner.

## Actual system cases
| Case | Result and limits |
| --- | --- |
| C09-T-agent |**Scoped Pass.** Normal Terminate while held-A/recovering-B. First request9 aborted and late response discarded. Second cycle captures native Stopped1790832203008 then actual HTTP200 success=true1790832203039 (31ms). Both real consumers exact neutral/staticStopped/sameidentity/facts/noanimation. No cancelled A/B/D/E parent. Second late-release action interrupted, NOT claimed.|
| C09-R |**Scoped Pass: actual transport reconnect.** Observed owned live socket close4001 → normal new socket/CONNECTED/session → exact same R2/revision12/heldD identity/state. Count16→16. Not renderer reload; disconnect not treated as termination.|
| C10 standalone in-memory |**Scoped Pass.** Actual leave/saved-row selection consumes GetRunProjection/resume config, count9→9, O1Stopped retained. Explicit later C creates distinct runtimeR2/nativeO2 while O1 remains separate.|
| C10 standalone cold |**Scoped Pass.** Documented restart changes PID/tab/timeOrigin; actual group/row selection consumes projection/resume config, count17→17. Ordinary history present, cold native cards absent by non-persistence contract. No card deletion, skipped hydration or invented replay.|
| C09-T-team |**Scoped Pass.** Real2-member Team, coordinator recovering/second inactive. Normal Terminate team → nativeStopped1790832942251 → HTTP200 success1790832942298 (47ms). Both consumers sameop o1sc_1/turn0003/raw3/staticgrayStopped. Request26 abort/late discarded; no TEAM-A/B parent. Not all members concurrently recovering.|
| C09-T-org |**Scoped Pass.** Org directroot plus2-member Team (3 configured agents); root recovering. Stop Agent Org deliberately retires socket1000 at1790833437571 before HTTP200success1790833437634, then real history inspection1790833437646 and all3 member projections7652/7653. No terminalWS event invented after retirement. Success reconciliation plus actual history publication retains s66l_1/turn0003/raw3/staticStopped in both consumers. Request35 abort/late discarded; no ORG-A/B parent.|
| C10 Team/Org cold |**Scoped Pass.** Second documentedrestart changes PID/tab/timeOrigin. Actual Teamrow reads resumeconfig+both projections; Orgrow/member reads inspection+all3 projections. Saved messages present,0coldnativecards,35→35requests/no rejected generation.|
| Snapshot/no late commit |**Observed cycles Pass.** Each pre-terminate snapshot remains exactprefix; only legitimate cancellation systemnote appended (5→6 or8→9), no summary replacement/cancelled parent. Not whole-archive crash proof.|
| Inspection/rendering |Actual active→history URL, inspection/projection responses, computedanimationnone/neutralclasses. Org screenshot inspected; supports but does not replace DOM/wire assertions.|
| C08 current semantic |**Blocked.** Remote0; no new authorized budget/isolated credentials. Canned summaries are not quality evidence.|

**35 local product requests =7parent+28compaction**, IDs1–35 unique across fixture repair, below original40 and absolute60minute limit. ParentIDs1,2,10,18,19,27,28 only; no cancelled inputs parent-dispatched. Separate guardchildren made4 and5 synthetic calls, not product requests. Final offline decoder **37assertions Pass**, not added to repository total.

Earlier API006 heldAattachment/B-C ordered success, renewedfailure, consumed-response nonreplay, Stop/late-response and new-I continuation remain original-attributed. Old reload/saved proof stays withdrawn; the new exact actions/responses/context evidence establishes new cases, not retroactive proof.

## Corrections and limits
1. **API006-LF003 temporary fixture:** user interruption followed completed second Terminate. Request17 aborted05:23:23.002Z, but uncleared fixture timer fired05:25:05.848Z with no product work remaining, closing fixture. Original closed process/logs preserved, not rearmed/waived. Corrected temporary close-handler timer cleanup only. Separate8-check guard verifies abort/wait/late-discard. Newownedprocess started count17/same freedport/unchanged absolute06:11:41.948Z deadline and40total. No budget reset or real inference; second late-release remains unexecuted.
2. Exact location.reload did not reset timeOrigin/marker; shell will-navigate prevents navigation, CLI rejectsfile://. Not reconnect proof. Actualsocket reconnect and documentedrestart supplied distinct evidence.
3. Initial decoder KeyError was one capture's direct-events wrapper, not productfailure. Initialscript/log retained; shape-aware decoder37Pass on unchanged evidence.
4. Team setup used actual DOM drag/drop events then normalclick forsecondmember. Nativephysicaldrag/hit-testing not proved.
5. Seven-member atomicOrg staging is executed in repository tests. ProductOrg3configured/1recovering is not sevenconcurrent/taskbearing/completeTeamOrgUI proof.

## Mandatory confidence and broader decision
Post-repository **85.0%, Broader Required** (repository-checkpoint.md). Final:

| Category | % | Evidence / uncertainty |
| --- | ---: | --- |
| Requirements/AC proof |75|Settings/recovery/terminal direct; current first/repeated semantic fidelity partial/historical, not supplied by emulator. Critical gap blocksPass.|
| Changed-boundary directness |95|Three actual controls, native transport, both renderers, real inspection/readers plus concretepump suites.|
| Integration realism/mock gap |90|Real packagedproduct/backend/storage; external generation synthetic, inference uncertainty remains.|
| Environment/config/identity/fixture |95|Pinnedsource, ownedapp, realconfig, exactidentities/counts; fixtureerror preserved/fixed/guarded without limit expansion.|
| Failure/edge/lifecycle/recovery |90|Exhaustion/reconnect/cancel/terminate/late-discard/coldreaders direct; CG033 and crash/powerloss unwaived.|
| User/browser/desktop |90|Actual standalone/Team/Org and fresh-context selection; fullmulti-member/taskUI/physicaldrag incomplete.|
| Durable coverage relevance |90|Narrowfixture repair/current394Pass;11path independentreview and widerbaseline/fullsuite/typecheck residuals remain.|

**625/7=89.3%.** Below95% target and all-category90floor; score never overrides critical gaps. **Broader validation Blocked for remaining real-provider semantic dependency; selected authorized offline journeys completed.** No confidence inferred from missing records. No source fix/new intended behavior proposed.

## Preserved unwaived boundaries
- IR007 plain webtsc defaultOOM→8GBexit2/7078diagnostics including5 changed-test .vue imports: notvue-tsc, not comparable to inherited6836, no fulltypecheckPass. No changedproductionTS in reviewerfilter is not blanketgreen.
- **CG033:** first automatic/never-settling compaction timed out in unchanged standalone preparation/quiescence BEFORE backendshutdown. Preserve IR007 shutdown-preparation-diagnostic.md. Not pumpdeadlock/fixed/Pass/executedbaseline/waiver. HeldA/recoveringB success distinct. SR033/034 do not authorize shutdownredesign/immediatepreparationlatency; newpolicyneedsDesigner.
- F005 SR020acceptedknown/nonblocking, **notfixed/Pass**, QwenSTOP. F004historicalcauseunknown;F006corrected. SR022exhausted1fidelityFail/3scopedusable;v6unapproved.
- Other14 inherited residuals/7baselinecontractfailures/fullsuite/currentsemantic/physicaldrag/consumedtoolfullUI/crash/completeTeamOrg/Delivery/docs/explicituserverification remain unwaived. No allmodel/repeatedcurrentfidelity/release guarantee.
- Product supplements/Delivery revision N/A — not applicable at this stage; existing architecture/source reviews applicable.

## Cleanup, preservation and routing
Documented appstop confirmed forced=false, owneddata removed,51625/51626free. Correctedfixture46078 disarmed35 then stopped afterprocessidentitycheck;51536free. Originalfixture45034 and guardchildren also stopped. Ownedmemory/logs/wire/snapshots preserved outside disposabledata. No unrelatedprocess/data cleanup, credentials, productionsource edits,stage/commit/fetch/push/merge/release.

Entry2122pinned files preserved. Finalaudit identifies newfixture+canonicalAPIartifacts only;31CRR011source/testhashes match and prior10APIdurablepaths untouched. Full cumulative references indexed.

Fresh get_handoff_rules: **no matching Blocked handoff**. Per skill ask user for missing authorization/credentialsource; no send_message_to, colleague forwarding, Delivery or successful-testreview claim. Resume when dependency arrives; newexecutabledefects follow focusedreviewer origin routing.

---

# Historical checkpoints below — superseded by current result above

# API-REV-006 — resumed validation in progress / SR033–SR034

## Current resumed stage — CRR011 / IR007
Approved SR033 and Ready SR034/ARCH004 have returned through implementation IR007/source review CRR011. The previous approval hold is over; old body below is historical checkpoint context, not current approval status. New evidence: api-e2e-evidence/api-rev-006/ir007-resume. Reproduced8 stale snapshot fixture failures, repaired one durable test fixture without relaxing assertions;8Pass. Fresh broader repository386Pass plus repaired8=394Pass/32files. Mandatory post-repository confidence85.0%; broader Required. Worktree isolated desktop build underway, no current product result or remote provider calls. API006 remains incomplete; latest completedAPI005Fail78.6. Eleven cumulative API durable paths now require eventual independent successful-test review. Original provenance withdrawal remains binding.

## SR033 evidence-provenance correction — supersedes reconnect/reopen claims below
Evidence-only review found ui-40 and ui-59 retain authored reload-request labels, not exact JavaScript/navigation/context-reset or GetRunProjection responses. Completed live reconnect and saved-reopen hydration were overstated and are withdrawn as proven product cases; old-card durable replay provenance is **unproved**. Later same-tab DOM, actual termination/abort/no H dispatch and new-I runtime continuation remain observed. Count30 stayed unchanged during the observation interval, but that alone does not prove a real reopen. Prior interim90.7 is withdrawn as a current assessment; no new final score/result. SR033 user-approved **Stopped**/no spinner/history retained is acknowledged, design investigation pending; no normative validation resumed. Full clarification: api-e2e-evidence/api-rev-006/sr033-evidence-clarification/README.md. Original artifacts unchanged; latest completedAPI005Fail78.6 remains.


API006 clarification handoff confirmed accepted=true / DELIVERED to sole /solution_designer, existing run solution_designer_e86db51ce2a24b15abe56a98c9c8114f;1042 cumulative references attached. Selected requirement/test-validity gap rule, not executable failure or successful test review. API006 remains incomplete / DEC03201 pending; latest completedAPI005Fail78.6 unchanged. Receipt api-e2e-evidence/api-rev-006/handoff-receipt.json. No additional recipient or campaign; stage stops pending owner return.

2026-10-01. **No completed API006 result. Latest completed result remains API005 Fail /78.6%; API004 Fail90.7 is historical.** IR006/CRR010 source Pass9.40 enabled this execution, not overall acceptance or successful cumulative test-code review. Large/High unchanged. HEAD6908ccff483f1eca522caa65bfaaf6dcfcc26750, branch codex/context-compaction-simplification-analysis, current pending worktree validated rather than HEAD alone.

Approved SR028 REQ001–012/AC001–017, SR030 design, ARCH003 and SR031 governed execution. The new SR032 REQ013/AC018 historical-activity proposal is Ready for Approval (DEC03201), not approved; affected design is Needs Revision. Its observation is neither an existing-AC failure nor Pass/waived. No source/test fix is authorized by this checkpoint. Full result and scope distinction: terminal-compaction-activity.sr032.md.

## Investigation and source boundary
Current settings regression was rechecked first after reading cumulative authorities, legacy/compatibility and persisted-transition checks, root TESTING.md, server/web instructions, isolated-app and browser CLI instructions. IR006 changes only the exact public numeric setting's nonsecret classification; no changed stored format/migration. Ten durable API paths and174 IR005/006 inventory entries were pinned and remain byte-identical. No API006 production or durable-test changes. Every eventual successful cumulative API test-code review is still pending.

Evidence root: api-e2e-evidence/api-rev-006. Exact commands/cwds/times/exits in case JSON/logs; plan and ledger predate execution. Owner-safe build/run/stop uses documented isolated-app; browser uses the documented attach-only CLI, not direct CDP or hidden application state. Temporary protocol emulator is bounded, synthetic, no outbound client and no credentials. It is not LM Studio inference, a DeepSeek/Qwen sample, or semantic fidelity evidence.

## Current executed cases

| Case | Observed evidence and limits |
| --- | --- |
| C05 / F007 repository |5 files/93 Pass: full GraphQL, setting service/unit and real persisted AppConfig reload, config and schema tests. Focused unchanged numeric-positive/credential-negative2 Pass/11 filtered are a subset, not additive. |
| C14 server |4 files/23 Pass: native recovery, admission/FIFO/ACK/race and supported root-command boundaries. No unsupported same-ID Team/Org requirement introduced. |
| C14 core |8 files/55 Pass: actual runtime synthetic-LLM integration, worker, status, assembler and recovery controller. |
| C06 renderer |11 files/175 Pass: standalone/Team/Org streams, stale/wrong-run projection, hydration/composer/store and message components. Happy-dom evidence, not every full desktop scenario. |
| C09 / F007 actual control |**Pass / current product closure.** Normal Settings Save16000, clean saved state, actual HTTP filtered readback16000/editable, leave/reopen16000 and normal clear. No hidden config workaround; old API005 failure is immutable. |
| C09-P consumed-response gate |TRIGGER1 parent responded once, then3 actual adapter requests failed503. Response retained once, recoverable error/next-turn guidance; no autonomous fourth attempt or replay of consumed turn. |
| C09-H held A / attachment / queue |A with context.txt retried3 failures before parent, remained held once. B admission retried3 failures, B queued once, A retained. Same-process reload restored A/attachment/B and did not generate. C admission held one success attempt; actual UI Compacting/Stop and queued B/C; release dispatched original A then B then C once. |
| C09 cancel |D post-response exhaustion; E blocked on request23. Normal Stop generation aborted it; late success discarded, no commit or E dispatch. F fresh admission recovered and dispatched only F. Existing17 snapshot messages unchanged; one normal cancellation note is expected, not a late summary commit. |
| C10 terminate / saved resume |G post-response exhaustion; H blocked on request30. Normal Terminate returned Offline without deadlock, aborted request, discarded late response; H never parent-dispatched. Saved reopen emitted0 generations. New authorized I resumed same saved agent, parent31 then post-response summary32; no cancelled E/H replay. |
| SR032 historical activity |After actual successful termination/reopen, old turn0013 remains animated “Compacting memory…” even beside new completed turn0001 after I. Header Offline then Idle and current input controls are correct. **Pending requirement clarification**, not an approved failing assertion; runtime cancellation success does not settle presentation intent. |

Fresh distinct selected repository results: **346 Pass /28 files**, not full-suite Pass. Seven separate offline emulator protocol checks Pass, four accepted synthetic generations in a separate guard process. Product campaign used32 local requests (12 parent/20 compaction), below predeclared40/60min; remote0. Do not sum repeated F007 executions, prior API005542, reviewer82, or temporary guard assertions into the fresh repository total.

Product evidence: F007-*; ui-01–63; loopback-wire/state; recovery-assertions.json, cancel-assertions.json, lifecycle-assertions.json; actual raw/snapshot/metadata captures. Parent dispatch order1,2,3,4,5,16,17,18 establishes consumed-turn nonreplay plus A/B/C order. Initial compactor groups3/3/3/1 use identical prepared source and exact v5. A's actual parent request contains original text and context.txt/HX-204; the scripted ACK label is attachment-derived, not the identity proof. First10 compactor requests contain no prior summary, next10 contain it once. Final current snapshot has exact agent_id/messages keys and one summary.14 raw user traces have distinct IDs; cancelled E/H remain truthful history, not provider-dispatched work.

## Reproduction refinements and honest limits
- Changing the public cap does not itself schedule a pre-parent gate. Real post-response observation creates it. TRIGGER0 gave one parent response without compaction: measured input10197 below threshold12595, parent reserve0. The original8192-parent-reserve assumption was wrong;8192 is the compactor cap. Lowering only normal UI cap to12000 reached threshold9395 through TRIGGER1. No direct requestCompaction/state injection or extra remote campaign.
- Attachment used actual workspace file dragstart/DataTransfer and real DOM drop handler. Files overlay obscured the first Send and the CLI rejected it without submission; normal backdrop close allowed Send. Physical native drag hit-testing is not proven. Attachment ingestion/content preservation and original-user identity are directly proven.
- Same-process reconnect is not process-restart durable queue proof. Saved resume was orderly termination/new runtime, not crash/power loss. No tools configured in this product fixture, so consumed-tool-hook semantics rely on separately attributed runtime tests/older bounded real flow, not this UI run.
- Temporary decoder first assumed max_tokens and raised KeyError. Retained before-image/log and corrected actual LM Studio max_completion_tokens8192 lookup; no product/test regression concealed.
- Source suggests client cleanup clears live input/block but not historical activity; core cancellation emits failed. Exact lost-event timing/saved-view source remains unproved. No asserted root cause or speculative source fix.

## Mandatory confidence reassessment — interim, not a completed outcome
The contemporaneous post-repository gate was82.1%, Broader Required. After broader execution, approved-scope evidence now supports the following **interim** judgments; this is not an API006 final score or a rescore of API005. Proposed AC018 is excluded from normative scoring until approved; uncertainty about its intended behavior is separately held, not silently waived.

| Category | Interim % | Evidence / remaining uncertainty |
| --- | ---: | --- |
| Requirements / acceptance proof |90|Settings fixed and key approved recovery/identity/lifecycle paths direct; broader current semantic acceptance remains historical/scoped and residual cases remain.|
| Changed-boundary directness |95|Actual factory/adapter/runtime/server/stream/renderer and settings transport exercised with exact wire counts; provider returns scripted.|
| Cross-boundary realism / mock gap |90|Real worktree desktop and backend/storage with synthetic external dependency; no current real inference.|
| Environment / config / identity / fixtures |95|Fresh isolated app/data, normal config/model/workspace, pinned source, bounded synthetic inputs; no private data or config bypass.|
| Failure / edge / lifecycle / recovery |90|Exhaustion, later admission, held queue, cancellation/late response, stop/reopen/resume direct plus current race tests; no whole-process crash/power-loss.|
| User surface / browser / shell |85|Actual settings/composer/message/stream states rendered, but Team/Org complete UI and physical attachment gesture remain indirect; not an AC018 failure penalty.|
| Durable regression relevance |90|Valid unchanged regression and current controller/projection suites pass; ten-path independent successful review outstanding and full-suite residuals remain.|

635/7 =90.7% interim. Default95% target and all-category90 floor are not met. **No Pass.** Broader work was Required and partially completed; further acceptance remains dependent on intended behavior approval/design recovery and proportionate remaining evidence. This is not an environmental Blocked result and authorizes no new local/remote campaign.

## Authority hold / continuation
Solution Designer SR032 explicitly confirms normal Terminate is supported, but prior REQ005/AC013/017 do not select historical-card treatment. New REQ013/AC018 proposes truthful stopped qualification/no active spinner after confirmed termination, preserving known final results and not treating disconnect as termination. User decision DEC03201 pending. Preserve the exact observation, add no normative failing test or source fix before decision. Resume affected investigation only after authority returns; do not convert this checkpoint into API006 Pass/Fail or Delivery. Prior API005 Fail78.6 remains latest completed.

## Cleanup / preservation / inherited limits
Owned iso-50926-5811 stopped via pnpm --silent isolated-app stop; owned data root removed and50926/50927 released. Disarmed emulator PID48130 stopped,51087 released, no held responses. App log, wire, snapshots and evidence retained. Only owned resources stopped; external apps/WIP/backups/stash/SDK/generated outputs preserved. No Git staging/commit/refresh/push/merge/release.

Checkpoint audit pins all10 API paths and174 implementation entries unchanged; concurrent Solution Designer SR032 document changes are identified rather than blamed on API. Full cumulative package index remains attached for owner clarification. Product/DR N/A; finalization remains Delivery-owned.

Carry without alteration: F006 corrected; F005 SR020 accepted known/nonblocking **not fixed/Pass**, Qwen STOP; F004 historical cause unknown; SR0221 fidelity Fail/3 scoped usable/exhausted; v6 parked/unapproved. Same-ID Team/Org unsupported-premise diagnostic remains historical Fail/not scored; no withdrawn shared-retention machinery. Other14 inherited failures,7 baseline contract failures, webtypecheck6836/fullsuite/current real semantic/crash/Delivery/user gates not waived. No repeated-current fidelity, all-model guarantee or release claim.

---

## Prior completed results and historical evidence (preserved)

# API-REV-005 — current completed result: Fail / 78.6%

Date: 2026-09-30. **API-F007: normal Compaction Settings cannot save the effective context ceiling.** Preliminary Local Fix in production settings classification; focused failure-origin review requested, not successful-test review or Delivery. Large / High / reviewed route unchanged.

Current source/HEAD: 6908ccff483f1eca522caa65bfaaf6dcfcc26750, branch codex/context-compaction-simplification-analysis; refreshed origin/personal8caa610ff438c288d9aca9f2efe2c33924fbf517. Current pending worktree reviewed, not HEAD alone. Authority: approved SR028 REQ001–012 / AC001–017, SR030 design, ARCH-REV003 Pass, SR031 supported-scenario clarification, IR005, CRR008 source Pass9.40. Full cumulative SR/ARCH/IR/CRR/API chain retained. Product supplements and Delivery N/A. No production changes, commit, push, merge or release.

This completes the resumed API005 round. Its earlier interruption and SR022 diagnostic remain historical sections below. API004 Fail90.7 is the prior completed result, not the current score. The reduction reflects expanded critical recovery/UI scope and a newly observed valid settings failure, not a regression inferred from test totals.

## Investigation and executable surfaces

Investigation preceded execution and each durable change. Applicable instructions: root TESTING.md; server/web AGENTS.md; package manifests/Vitest configs, standard server Prisma setup; docs/isolated-app-instances.md; skills/autobyteus-isolated-app/SKILL.md; advertised browser-automation/SKILL.md and its bundled CLI. Core package test script is a placeholder, so use the established pnpm exec vitest runner; web test:nuxt uses normal Nuxt config/happy-dom. No direct CDP or hidden UI state manipulation.

Changed boundaries assessed: direct strategy/provider attempt budget, host acceptance/persistence, native runtime waiter, server admission/FIFO/ACK/stop, shared contracts, standalone/Team/Org live projection, renderer/composer and real settings transport. Existing implementation fixtures are valid but synthetic native strategy/runtime tests do not prove full UI recovery or real model quality.

Broader validation **Required**. An owned worktree-built desktop and local LM Studio-compatible protocol emulator were selected to exercise actual settings/model discovery/factory/adapter/runtime/stream/renderer while making failures deterministic. Emulator has no outbound client and was explicitly capped at40 local requests/30min; remote budget0. It is not LM Studio inference, DeepSeek, Qwen, or semantic evidence. Only3 parent seed requests occurred, all through actual user submissions; 0compaction requests. No credentials, private source env or private history accessed.

## Results and limits

Evidence root: api-e2e-evidence/api-rev-005/ir005-resume/. Exact commands, working directories, timestamps and exit codes are in each case JSON/log; ledger records in-flight checkpoints.

| Case | Current evidence |
| --- | --- |
| API-C01 shared prerequisites | 3 files /28 Pass: real current normalizer/facade, event and termination fixtures; corrected Unicode assertion retained. |
| API-C13 strategy/host/provider | 5 /84 Pass: three strategy attempts, success positions, invalid output, cancellation/backoff, SDK invocation-local controls, host ownership. Mocked transports, not remote calls. |
| API-C14 server recovery | 4 /23 Pass: native recovery/FIFO, races/admission/ACK and supported root-command scenarios. No unsupported same-ID Team/Org resend claim. |
| API-C14-core | 8 /55 Pass: actual core runtime lifecycle and compaction integration with synthetic LLMs, worker/status/assembler. |
| API-C06 renderer | 11 /175 Pass: standalone/Team/Org streams, stale/wrong-run projection, state hydration/composer and message display. Happy-dom/components, not full UI recovery. |
| API-C05 settings/history/parent | Initial7 /41 Pass. Added missing context-control regression: focused1 Pass/1 Fail/11 filtered; final full GraphQL file12 Pass/1 Fail. Exact compaction tuple tests remain passing but do not cover the failed numeric key. |
| API-C11 preserved snapshots | Initial8 /134 Pass/1 Fail. One stale current-writer schema_version assertion corrected after approved behavior audit; focused restore-flow1 Pass. Other134 results unchanged. Real temp filesystem/core continuation, not desktop resume/power-loss. |
| API-C09 isolated product | Worktree build/start/browser attach Pass. Normal UI endpoint/model/agent/workspace creation and3 streamed synthetic parent turns Pass. **Compaction Settings save Fail**, reproduced twice in UI and separately over real HTTP. Further recovery phases stopped, not passed. |
| API-C08 current live semantic sample | Not run; remote0. Prior actual DeepSeek semantic findings retain original source/config/sample limits; no current strategy acceptance inferred. |
| API-C09 remaining / C10 | Held A with attachment, later B/full retry UI, renewed failure, cancellation, post-response error/reconnect, saved-run resume and whole-archive/power-loss not executed in this product campaign. Repository proofs and older scoped evidence remain attributed only. |

Fresh final distinct selected assertions: **542 Pass /1 Fail across46 files** (not the sum of repeated attempts). Original C11 stale-assertion failure and repeated F007 reproductions remain in logs; no full-suite claim. Initial six groups gave406 Pass before product execution. Current full web typecheck was not rerun: implementation6836 failures and prior14 broader residuals plus7 independently baseline-reproduced contract failures remain disclosed, not waived.

## API-F007 — supported settings save rejected as a credential

- Valid expectation: REQ008 / **AC010**, with related settings AC012: current optional effective-context override remains usable through normal Settings. A positive16000 value is not secret material.
- Actual journey: Settings → Server Settings → Compaction configuration → Effective context override16000 → Save. Visible alert: “Compaction configuration was not saved. Sensitive settings must use their write-only credential editor.” Reopening shows blank; typed value was not persisted.
- Real HTTP mutation to owned server65101 reproduces rejection; filtered before/after query shows key absent. This is an application rejection in HTTP200 GraphQL data, not a transport or provider failure.
- Source hypothesis: ServerSettingsService tests unanchored SENSITIVE_SETTING_NAME containing TOKEN before editable-setting metadata; it matches TOKENS in AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE. Same regex/guard bytes at refreshed base8caa610f,5cb7b049 and6908ccff. Source identity is not a full baseline execution and does not waive current accepted behavior.
- Durable GraphQL positive regression now fails with identical text. Adjacent synthetic credential-key rejection control passes; no weakening of security guards or production fix by API owner.
- Evidence: API-F007-ui-reopen.json, API-F007-ui-confirm.json, API-F007-settings.png, API-F007-http.json, API-F007-origin-audit.json, API-F007-regression.log/.json, API-C05-final.log/.json.
- Preliminary classification **Local Fix — production/server settings**, recommended Implementation Engineer after Code Reviewer confirms origin. No requirement/design change proposed. This is not evidence that retries themselves fail.

## Durable coverage delta

Two paths changed this resumed stage:
1. autobyteus-server-ts/tests/e2e/server-settings/server-settings-graphql.e2e.test.ts: add numeric-context positive and secret-name negative tests; existing cumulative tuple tests preserved. This was already one of the nine API-owned paths.
2. autobyteus-ts/tests/integration/agent/working-context-snapshot-restore-flow.test.ts: change misleading strict-v5 title and obsolete schema_version expectation to exact current versionless keys. Test constructs current serializer output. Restore/continuation checks unchanged, focused rerun Pass. API005-LF001 test-owned correction, not production defect.

Before-images and focused patches retained. Eight of nine prior API files unchanged; IR005's171 source/adapted inventory entries still match. Cumulative durable API review scope is now **ten paths**, all require eventual successful proportional test-code review; this failure handoff does not approve them. F007 positive test deliberately remains red.

## Mandatory confidence scorecard

Percentages are evidence-confidence judgments, not pass rates or measured probabilities. The repository-only scorecard below is recorded at final reconciliation from the first406 results, not falsely presented as a contemporaneously recorded pre-browser score.

| Category | Repository-only | Final | Evidence / remaining gap |
| --- | ---: | ---: | --- |
| Requirements / acceptance proof |75|50|New critical AC010 failure; AC014/017 full-product evidence incomplete.|
| Changed-boundary directness |90|90|Real native runtime/strategy/admission execution and actual settings HTTP; provider failures mocked.|
| Cross-boundary realism / mock gap |75|75|Actual desktop/server/adapter streaming seeds, but full recovery not reached.|
| Environment / config / identity / fixtures |95|95|Fresh worktree-built app, owned ports/data, real normal setup, bounded synthetic emulator; no private data.|
| Failure / edge / lifecycle / recovery |90|85|Strong deterministic counts/races/cancel/stop; full-product combinations remain unobserved.|
| User surface / browser / shell |50|65|Actual settings rejection and ordinary streaming rendered; no retry-composer/held/reconnect acceptance. Packaging startup is not all shell proof.|
| Durable regression relevance |95|90|Invalid schema assertion corrected, missing valid settings regression added/red; cumulative review pending.|

Repository-only570/7 =81.4%; final550/7 =**78.6%**. Default95% gate not met, multiple categories<90 and critical valid failure. **Overall Fail**, not external Blocked. Broader validation remains Required after correction; do not substitute setting-file edits or change thresholds behind the UI to claim the failed control works.

## Historical dispositions / remaining limits

- API-F006: CRR007 correction remains resolved; C01 fresh28 Pass. No arbitrary emoji or LLM wording constraints reintroduced.
- API-F005: SR020 accepted known deviation/non-blocking, **not fixed/Pass**. Qwen stopped; no waived remedy handoff.
- API-F004: original continuation cause remains unknown. No new reproduction or asserted root cause.
- SR022 four-call campaign exhausted:1 fidelity Fail /3 scoped usable. No v6/default/support change or semantic-repair authorization inferred.
- SR031 same-ID Team/Org injected diagnostic remains historical Fail with unsupported production premise, excluded from acceptance score. Fresh-ID supported cases retained; no withdrawn shared-retention design.
- Old persistence/migration/source/provider/research/license/prompt supplements preserved via complete reference index. Full suite, full-tree typecheck origin, integrated recovery/browser coverage, repeated-current live fidelity and crash limits remain explicit.

## Cleanup and routing

Owned instance iso-65100-17c1 stopped through pnpm isolated-app stop; data root removed, control65100/server65101 released. Emulator PID44436 stopped, port65300 released; disarmed before cleanup, no held responses. Exact safe fixture/wire/logs retained. No shared app/provider/private vault/history touched, no generated SDK cleanup, no commit/push/merge/release.

Current reports, ledger, revision history, entry/final audits and full cumulative references are authoritative. Request **focused failure-origin review** for API-F007 with preliminary production Local Fix; successful ten-path review/Delivery remain pending. Routing receipt is recorded after confirmed handoff.

---

## Historical report (preserved; superseded as current status)

# Current stage — API005 resumed after CRR008 / IR005
Current validation is in progress against approved SR028/SR030/ARCH003/SR031, source6908ccff plus current pending API adaptations. The earlier policy interruption is resolved as an entry prerequisite, not a validation Pass. No current final score or result yet; API004Fail90.7 remains last completed. Current investigation/ledger and api-e2e-evidence/api-rev-005/ir005-resume/plan.md govern execution. Historical report sections below remain scoped to their original rounds.

---

# SR022 diagnostic supplement — completed; acceptance remains interrupted

New bounded numeric-target comparison executed exactly four DeepSeek generations in fixed F-with/F-without/R-without/R-with order, one per arm including SDK. Same exact v5/frozen sources and actual wire temperature0.7/hardcap8192; request model deepseek-v4-flash, response label deepseek-flash. All HTTP200/complete/stop/output-contract Pass. **Manual fidelity: F-withTarget Fail for unsupported broader constraints; F-withoutTarget and both R samples scoped Pass/good and usable.** This is not an overall API result or a model reliability rate.

The F-with output attributes verbatim raw-result preservation to the user and extends specific read-only requests to all future evidence files. Exact anchors and pending B reply are still preserved. Both no-target outputs retain required facts/status; R checkpoint addition stays pending, not fabricated completed work. All four raw outputs retained. No-target body code points are F3410 versus3869 and R2766 versus2875; derived non-reasoning tokens F976 versus961 and R662 versus699. Reasoning is recorded separately; shorter characters do not establish token/cost savings. No causal/universal quality claim from one sample per arm.

Ten offline guard tests Pass before generation, standard isolated vault/server/Prisma/preflight; first temporary module collection failed before any generation, was stopped/cleaned and corrected offline, and a fresh normal setup ran the sole generation campaign. No production/durable edits. Both owned server lifetimes, worker, runtime, database/key cleaned; nine API hashes, authorities, exact v5/frozen inputs unchanged. Details, exact commands, failure, lengths, complete manual review and audit: [api-e2e-evidence/sr022-budget-diagnostics/README.md](api-e2e-evidence/sr022-budget-diagnostics/README.md).

No API005 restart/API006/confidence rescore or Delivery. Latest completed result below remains API004Fail90.7. SR021 retry/error/message decisions remain Draft; Qwen stopped/F005 accepted non-blocking/not fixed; F004 historical unexplained; F006 narrow correction resolved. Ordinary evidence reply to ongoing Solution Designer SR022 investigation only.

---

# Current stage — API-REV-005 interrupted for new user retry policy

**Requirement Gap / Design Impact → Solution Designer, not an executable failure against old authority.** User now requests3total automatic attempts, recoverable error after exhaustion and later-user retry before parent dispatch. Current DeepSeekSDK already retries some transport failures twice; shared compactor has one logicalattempt and current handled failure returns toIDLE. Later distinct-user compaction-before-message mechanics exist. Six offline current-policy probesPass; no remote calls. Full details/edge-case matrix: api-retry-policy-request.md.

API005 freshC0128Pass; isolated worktree build/start readinessPass, ownedinstance stopped/data removed/ports released without UI journey or credential import. Remaining acceptance deferred for intended-behavior revision; no new overall validation result/confidence is assigned. API004Fail90.7 below remains last completed result. F006CRR007resolved; F005SR020acceptednonblocking/Qwenstopped; F004historicalunknown. No production/durable changes. Single most-specific prevalidationdesign-impact route /solution_designer. Full cumulative package attached, no Delivery.

---

# API/E2E Execution Coverage Report

## API-REV-004 — 2026-09-30
**Overall Fail /90.7% confidence; no Delivery advancement.** The one bounded DeepSeek runtime flow exited1 on an invalid live-test literal-character assertion. The user expressly requested its removal; the API-owned correction and exact retained-request offline replay now pass. Do not retroactively call the original full flow Pass: later raw/archive/snapshot assertions were never reached. Actual summary and continuation are positive, separately evidenced results. No new product defect established; preliminary failure origin API-owned Local Fix, focused review requested.

Large / High / Reviewed unchanged. Source ebaf3a78eff2d3147dc3f4f2eb63bf119d6547ad, HEAD5cb7b049ae3158108bff2cb70ed80e89540586d9, branch codex/context-compaction-simplification-analysis; refreshed origin/personal8caa610ff438c288d9aca9f2efe2c33924fbf517. Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis. No production/prompt/default/support change, commit/push/merge/release. Eventual Delivery target origin/personal.

### Authority and cumulative history
SR012 approved REQ001–009/AC001–011 + exact v5/output supplement; SR017 amendment/AC012; SR018 corrected SR019; ARCH001→002; IR001→003; CRR001→006. Current pending authority read, not HEAD alone. **SR020 explicitly accepts API-F005 as known deviation/non-blocking, not fixed/Pass. Qwen investigation/calls/tuning stopped.** Do not reroute that waived finding as a required remedy. Candidate-v6 and six-call proposal parked/unapproved. Parent-model default/support unchanged. API-F004 remains historical unexplained continuation evidence, not diagnosed from endpoint absence or closed by later success.

API001Fail73.6→API002Fail82.9→API003Fail82.9 remain historical, not retroactively rescored. Source CRR005Pass9.40 is separate. Full authorities and all relevant prompt/research/license/history/probe/failure supplements attached via reference-index.json. Product N/A—not requested; DR N/A—not reached. All nine cumulative durable paths still require proportional successful-test review on eventual API Pass.

## Discovery, plan and coverage validity
Re-read root TESTING.md and server AGENTS.md, standard Vitest/Prisma configuration, registered real-provider scenario and shared harness. No closer TESTING override. Root core test placeholder discrepancy remains; existing pnpm exec vitest run --no-watch is working documented package runner. Inherited current-source API003534 durable Pass/build/three-process structural evidence is reused with attribution, not counted as rerun.

Changed boundary: shared test support only, plus real external-provider/product backend/facade/MemoryManager/tools/compaction continuation under approved SCN001, REQ001/004/005/006 and AC001/004/006/007/010/011. Prior direct DeepSeek first/repeated pair did not exercise parent runtime; select registered deepseek.compaction-agent-flow for that gap. Root guideline permits provider E2E; this is not an HTTP dispatch/full desktop journey. Full user status/retry/resume requires an isolated desktop and remains Not Tested, not blocked.

Investigation/ledger and new manifest preceded calls. Maximum1flow,12parent+1summary=13outbound; parent0/1024/thinking disabled/ratio0.05, current absent/null compactor tuple uses parent model/default0.7/cap8192, exact v5. Stop on error/cap; no adaptive rerun. User provider/private importer permission referenced explicitly in manifest and API003/deepseek/manifest.json. Earlier campaigns exhausted, not reused. Safe fetch and direct all-exit observer verified offline before execution. Standard Prisma setup/globalSetup retained.

New validity finding API-F006: global absence of a literal emoji is not approved model/history behavior. A legitimate assistant echo caused a false failure despite safe tool excerpting. Blanket literal U+FFFD bans likewise confuse valid source text with malformed Unicode. User explicitly requested removal. Current live harness removes those content bans and redundant source-fixture glyph assertions; actual Unicode well-formedness, strict framing, tool-tail, exact source equality, semantic anchors and snapshot/next-request checks remain. Deterministic core truncation/Unicode tests remain unchanged. Durable regression accepts emoji and literal replacement-character text and still rejects a lone surrogate. Investigation updated before edits.

## Execution and case reconciliation
Evidence relative to api-e2e-evidence/api-rev-004/.

| Case | Result and limits |
| --- | --- |
| API-C01 prerequisite | Initial unchanged3files27Pass; after user-directed correction **3files28Pass**. API-C01.log, API-C01-glyph-fix.log/.exit. Normal owner/readiness/facade/event/termination/all-exit checks retained. |
| API-C02 focused Unicode/prompt | **2files14Pass**, unchanged deterministic core checks. API-C02-unicode.log/.exit. Other API003377 core executions carried, not rerun. |
| Temporary observer | Final6Pass; initial3Pass/1Fail due synthetic stream fixture delivering error before queued chunk, corrected delivery sequencing offline; original observer-first.log retained. |
| API-C08 preflight | Selected DeepSeek READY, dedicated preflight1Pass; full flow command repeats selected preflight as its other passing test. Standard built server/vault setup. |
| API-C08 full runtime | **Original command1Pass/1Fail**, one flow, exactly8parent+1summary requests/allHTTP200, fourcompleted turns, three reads/onewrite, one requested→started→completed compaction. Exact9-field artifact read/compare succeeds before later assertion failure. No transport error/cap/timeout. execution.json, flow.log, wire.jsonl, all-exit JSON. |
| API-C08 summary/continuation judgment | **Scoped semantic Pass**, good/usable with minor repetition. Eight exact anchors retained; pending B confirmation correctly scoped to selected prefix; one accepted summary equals next-parent compacted-memory constituent. Later newer instruction yields exact expected9-field write. semantic-review.md/.json, accepted-summary.md. Not universal fidelity or repeated-runtime proof. |
| API-C08 offline failure replay | Pre-fix2Pass reproduces invalid global assertion and assistant-only variation with byte-identical tool blocks; post-fix1Pass accepts **original unedited** retained request. Separate files/logs preserve both outcomes. Not new live execution or snapshot-file evidence. |
| API-C04/C05/C07/C11/C12 | API003 scoped structural/API/restart/contracts and first/repeated DeepSeek evidence retained, not rerun. Current structural source unchanged. |
| API-C03/C06 | Wider provider/renderer suites not rerun; prior results attributed only. Other14 inherited failures not waived. |
| API-C09/C10 | Full integrated status/failure/retry/resume and whole-archive crash/power-loss Not Tested this round. Prior scoped Settings/history and snapshot rename SIGKILL primitive retain original limits. |

Final relevant repository checks **42Pass** (28+14), not sum of every intermediate attempt. Temporary tests9Pass (observer6 + pre-fix replay2 + post-fix replay1), distinct purpose. Build ran as documented importer prerequisite. Full suite/standalone web typecheck not claimed. Owned source git diff --check Pass; whole-worktree check reports a non-owned code-review-report.md trailing blank, untouched by API owner.

Exact commands/cwd/config: execution.json and config/scripts; repository commands are pnpm exec vitest run [three secret-management unit paths] --no-watch in server, and [unicode-safe-text.test.ts, working-context-compaction-prompt-builder.test.ts] in core. Temporary configs extend normal server base. node run.mjs starts owned built server and registered capability file with selectedscenario; bounded-worker enforces outer12min and fetch guard13request ceiling.

## Failure and correction disposition
- **API-F006 / API-C08 / AC004/007**: preliminary **Local Fix—API/E2E-owned assertion**, corrected at explicit user request. Old inspector returned toolTailtrue/shieldOmissionfalse because an assistant reply mentioned the shield; Unicode tool excerpt omitted it safely. No production fix, prompt change or forcing model wording. Exact captured request now passes offline. Original full flow still recorded Fail; raw archive/category absence/snapshot equality after the throw remain unexecuted in that observation.
- **API-F005**: accepted known deviation/non-blocking under SR020, not fixed/Pass. No Qwen calls or investigation.
- **API-F004**: original cause remains unknown. New DeepSeek fourth tool succeeds; this is not reproduction or root-cause resolution. No Qwen reproduction requested.
- F001/F002/F003 and SR018-OBS-001 remain owner-resolved; no regression in current C01.

Current flow's prompt counts2529/15823/15980/17031/17262/58802/3622/3890 cross threshold49936 and then shrink. These are whole-request observations, not an isolated compression-ratio benchmark. Summary3559characters versus selected rendered input9167; upstream excerpts already shortened. Actual v5 summary returns complete/stop. Minor quality notes: repeated long paths/facts; historical do-not-write wording could be more explicitly scoped, but current instruction demonstrably wins. No unapproved prompt edit implied.

## Durable delta and review
Exactly two of nine cumulative API-owned durable paths changed this round:
1. test-support/live-e2e/live-e2e-harness.ts — remove arbitrary live glyph bans/omission sentinel predicate; preserve semantic/structural/source-equality/Unicode-well-formedness checks.
2. autobyteus-server-ts/tests/unit/secret-management/live-e2e-compaction-boundary.test.ts — ordinary assistant Unicode regression and malformed-surrogate rejection.
Other seven hash-unchanged from API003. None removed. glyph-fix.patch and final-audit.json record round-only changes and all nine hashes. Temporary bounded observer, replay, wire and semantic artifacts are evidence, not production framework. This Fail requests focused failure-origin/owner-correction review, not successful-test review or Delivery. Eventual proportional successful-test review of all nine paths remains required.

## Mandatory confidence scorecard
| Category | Post-repository before broader run | Final | Evidence / material residual |
| --- | --- | --- | --- |
| Requirement/AC proof | 85% | 90% | SR020 exception applied, direct DeepSeek pair and actual continuation positive; later live persistence assertions/full user controls not all proved. |
| Changed-boundary directness | 95% | 95% | Actual factory/provider/runtime/tools/compactor plus prior real process/HTTP/writers. |
| Cross-boundary realism/mock gap | 80% | 90% | Current real parent continuation now observed; full UI/runtime journey and some credential variants still indirect. |
| Environment/config/identity/fixture fidelity | 95% | 95% | Normal Prisma, private owned importer vault, real readiness, safe actual controls retained. |
| Failure/edge/lifecycle/recovery | 90% | 90% | Existing faults/retry/writer-cut/repair evidence plus safe all-exit; old F004 cause and full crash not claimed. |
| User-surface/browser/desktop | 85% | 85% | Prior scoped Settings/history only; full status/retry/resume still missing. |
| Durable regression quality/relevance | 90% | 90% | Wrong literal assertion removed and exact regression passes; independent cumulative successful-test review still pending. |

Post-repository88.6% (620/7), final90.7% (635/7); evidence-confidence arithmetic, not statistical reliability. Previous82.9 historical score unchanged. **Broader Required—executed bounded provider flow, further targeted validation remains required.** No clean95% target, user categorybelow90, not every critical journey directly proven; no overallPass. Selected remaining surface is isolated desktop under TESTING plus valid completion of live persistence assertions, not random additional model sampling. No genuine external blocker claimed. Current campaign is exhausted; no additional generation allocated by this report.

## Cleanup
Owned server61241 exited, loopback62136 no listener, runtime/db/adjacent key and synthetic flow directory removed. Importer alone read authorized source env; values not displayed/edited. Preview metadata10recognized keys, interactive batch10configured/no replacements; only DeepSeek used. Import terminal capture is truncated, not represented as full transcript. No credentials/headers/hidden reasoning retained. No source env/private history/user desktop/shared LMStudio/other WIP modification or process cleanup. Generated SDK files untouched. Standard test-owned Prisma setup remains normal repository state.

## Routing
Single most-specific executable-Fail rule to /code_reviewer for focused API-F006 origin and user-directed correction disposition. Do not forward waived F005 for remedy, re-review all production source or request Delivery. Handoff receipt recorded after confirmed delivery; stop afterward.

API-REV-004 handoff confirmed accepted=true / DELIVERED to sole /code_reviewer, run code_reviewer_7bd4b2c09af543088c0238d792d0fd98;225 references attached. FocusedF006 correction disposition only; no waivedQwen-remedy/Delivery/secondrecipient. Receipt api-e2e-evidence/api-rev-004/handoff-receipt.json. API stage stops.

API-RQ-001 requirement/design-impact handoff confirmed accepted=true / DELIVERED to sole /solution_designer, run solution_designer_e86db51ce2a24b15abe56a98c9c8114f,269references attached. API005acceptance incomplete/no rescore; no additional recipient or Delivery. Receipt api-e2e-evidence/api-rev-005/requirement-handoff-receipt.json. Stage stops pending owner revision.


API005 routing confirmed: get_handoff_rules selected the sole executable-Fail rule to /code_reviewer; send_message_to accepted=true / DELIVERED to code_reviewer_7bd4b2c09af543088c0238d792d0fd98, full799 references attached. Focused API-F007 origin review only; no other outcome recipient, no Delivery/successful-test review. API stage stops after this confirmed handoff.

API007 routing checkpoint: fresh get_handoff_rules has no matching rule for scoped campaignPass while cumulative validationIncomplete92.9; no send_message_to/Delivery or duplicate owner forwarding. Handoff-selection.json records decision. Finalaudit2053pins/missing0,only4ownedcanonicalAPIartifacts changed,all11APIpaths and frozenmanifest/wrapper unchanged.


API009 routing confirmed: fresh executable-Fail rule selected sole /code_reviewer; send_message_to accepted=true / DELIVERED to code_reviewer_7bd4b2c09af543088c0238d792d0fd98,4,196 references attached. Focused API009-F001 failure-origin review only; no successful-test review, second recipient or Delivery. Receipt api-e2e-evidence/api-rev-009/handoff-receipt.json. API stage stops.


## SR036 fresh reproduction investigation resumed
Fresh user-requested actual reproduction is underway; no fix or acceptance change. API009 Fail77.9 remains the last completed validation result. Four bounded attempts and controls planned in current investigation/ledger; fresh output directory api-e2e-evidence/sr036-fresh-reproduction. Parked SR036 design candidate is not authority.

API010 pre-handoff preservation audit:10,381 entry pins,10,377 unchanged; only four canonical API documents changed, zero missing/unexpected. API15+packaged2 match; raw/logical index/HEAD/MERGE_HEAD/branch/stash unchanged,672 staged/0 unmerged. Fresh rules select solely /code_reviewer for executable Fail and focused failure-origin review. No send claimed until tool-confirmed receipt.

API010 handoff transport constraint: initial 5,079-reference send returned HTTP413 Payload Too Large, not accepted/delivered. Repackage the complete cumulative files as an immutable archive with SHA256/manifest and attach that plus direct canonical authorities/failure evidence/API15 to the same sole reviewer. No alternate recipient or validation change.

API010 handoff confirmed accepted=true / DELIVERED solely to /code_reviewer, existing code_reviewer_7bd4b2c09af543088c0238d792d0fd98. Receipt api-e2e-evidence/api-rev-010/handoff-receipt.json. HTTP413 first attempt was not delivered; complete checked archive + direct authorities/API15 accepted on bounded retry. Focused API010-F001 failure-origin review only; API009-F001 integrated open. No successful-test review, additional recipient or Delivery. API stage stops. Pre-send final audit remains its scoped preservation basis, not a claim about subsequent reviewer work.
