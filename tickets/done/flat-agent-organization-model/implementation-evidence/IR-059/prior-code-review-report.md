# Code Review Report — CRR-089

## Latest Result / Review Round Meta

**Fail — focused API/E2E failure-origin review. CR-FIND046 / API-FIND039 confirms an implementation history/read-client composition defect and an earlier review gap. Recovery design scope is Unclear pending Architecture assessment, not the observed defect.** Per the user's prior direction, route to Architecture Designer for original personal-branch Team/nested-Team status comparison before choosing the next repair; do not start another isolated implementation patch loop.

- Ticket **AORG-FLAT-TEAM-001**, round89, 2026-09-12. Trigger **API-REV-037 Fail69.3 / API-FIND039 / DS037 / VAL058 / REQ031 / AC026**, plus the user's instruction to await the next API failure and send it to Architecture with the original Team/nested-Team comparison request. Prior canonical **CRR088 source Pass9.51** archived byte-exact at `code-review-evidence/CRR-089/prior-source-review-report.md`; CRR001 and all prior revision entries retained. That source Pass is not current readiness.
- Source **bbdea002ee59da87cc7174bfc2924888c0bb38f7**; artifact/HEAD **d76731eaa3260a123f1ce8c6ace0e14994fddcde** unchanged. IR001–058; RER033 / AD026 / ARCH023 Pass / AAV003 unchanged. **Large / High / Confirmed / Reviewed**, inherited focused Medium/High. No downgrade to direct low-risk route.
- Approved requirements, investigation, requirements revisions, agent-org contract, design/spec/self-validation/revisions, design/architecture review records and applicable history/composer/task/authoring/context-file/UI/assertion/Team-stream supplements remain the cumulative basis. Product core/status/overrides/baseline specs and manifests, stopped-run/task-monitor regression authority, migration conventions, implementation handoff/revisions and historical Delivery records travel with the package. Architecture artifacts are applicable, not N/A. Current Delivery re-entry: **N/A — not applicable**; DR007/009 history remains relevant.
- API investigation, execution report, ledger, revision record and all2140 incoming references verified present. This is **not successful proportional test review**. Separate `api-e2e-test-review-report.md` remains untouched and three pending API durable test deltas still require that review after eventual cumulative API Pass.
- Scope: current failure, previous pending-only finding, smallest history/command/context/client/projection path and assertion validity. No repeated full24-check source audit, numerical scorecard, full repository suite or live hosted run by Reviewer.

## Prior Failure First

| Item | Current disposition |
| --- | --- |
| CR-FIND045 / API-FIND038 | **Execution-resolved for the pending-only phase** in four NEW normal hosted cases: three grey Stopped/no Stop/backend-inactive observations per case before genuine old history release. IR058 synchronous navigation publication works at this boundary. |
| API36 original missing narrow/post-consumption evidence | Still missing historically; API37 proves new cases, not reconstruction. Original API36 did not establish the new reversal. |
| CR-FIND044/API037 and CR-FIND043/API036 / CR-FIND042/API035 | Preserve exact API36 scoped renewal only. Original API35 missing Restore body and API33 lost associations remain missing. Not newly accepted by API37. |
| CR-FIND041/040/039 and AAV002/003 | Prior bounded disposition retained. AAV002 supports complete-package scope only; Org-only assertion remains unadjudicated, not a negative Pass/defect/new hold. |

## Behavior Basis / Candidate Gate

**Intended behavior and supported path: Confirmed. Observed implementation outcome: Contradicted. No new requirement or product scenario.**

| Candidate | Independent basis, trigger and forward path | Lifecycle, consequence and evidence | Disposition |
| --- | --- | --- | --- |
| **CR-CAND252** | User wants to stop an active Org while retaining the selected direct or mounted configured Agent's conversation/draft in normal unified Workspaces. REQ031/AC026/SCN015 and DS0371350–1388 independently require truthful retained history/Offline, no stale live controls after confirmed inactivity, preservation on read failure and rejection of older in-flight family reads. Visible root Stop → typed subject action → terminate → retained historical context → history activity/read owner → cached navigation → root row. A normal background history read can already be pending; the user does not launch contradictory concurrent actions. | Actual successful termination, same exact root/Agent, backend inactive, retained center Offline. Genuine earlier active response arrives after confirmed inactivity; root becomes Running/enabled Stop and stays so after next read rejection. Four normal cases, response bodies/events/DOM/PNGs; current source/client integration and Reviewer controlled composition proof below. | **Promote — Supported Explicit Edge Scenario / Reachable → CR-FIND046.** The ordinary Stop goal is supported; delayed/read-unavailable transport is independently covered by DS037. Timing controls reproduce it, not establish validity. |

No unsupported concurrency, hypothetical corruption, migration or arbitrary callback premise contributes a finding, score deduction or required machinery. The exact recovery design remains an Architecture decision; no candidate for a new cache/epoch/protocol is promoted.

## CR-FIND046 — Confirmed activity is overwritten through a coalesced old history read

**High-priority implementation defect; earlier source-review gap.** Approved stopped-state truth fails even though Stop actually succeeded. An enabled Stop control misrepresents an inactive root while the selected Agent and conversation correctly remain historical/Offline. This finding is about the shared history/read-client boundary, not missing Stop mutation success, a cosmetic glyph, loss of conversation, or evidence that the runtime restarted.

### Forward source witness

1. `useWorkspaceHistorySubjectActions.ts` routes root Stop to `agentOrgContextsStore.stopAndInspect`. `agentOrgRunStore.terminate` validates actual success. `agentOrgContextsStore.ts238–248` then calls `markHistorical` and stopped inspection; `62–66` retains context, marks it inactive, calls the history action and retires the stream. `publish36–54` also publishes authoritative snapshot activity through that same history action.
2. `runHistoryStore.ts241–246` increments the family generation, changes only the exact row, **synchronously publishes navigation**, then starts `refreshAgentOrgHistory`. IR058's immediate publication is present and works; do not remove it as an assumed cause.
3. `runHistoryLoadActions.ts162–186` allocates a new logical generation before readiness, calls the same `ListCollaborationRootHistory` query with `network-only` and no variables/transport identity override, and accepts parsed rows if its logical generation is current.
4. `utils/apolloClient.ts` selects the bound client created by `plugins/30.apollo.client.ts62–76,108–121`. There is no query-deduplication override. **Installed Apollo3.14.0** defaults deduplication to true (`core/ApolloClient.js62`); `core/QueryManager.js720–762` keys the in-flight Link observable by printed query and canonical variables. `network-only` still obtains that Link observable (`1159–1166`). A later logical call can therefore receive the earlier physical read's payload. The older logical generation is rejected correctly; the newer logical generation can accept the same old active data.
5. `runHistoryStore.ts118–120` rebuilds navigation after the accepted rows. `runHistoryNavigationStoreActions.ts25–40` feeds `agentOrgHistory` into the cached navigation. `WorkspaceAgentOrgHistoryCollection.vue33–43` derives both root color/label and Stop visibility from that row's `isActive`. A subsequent failed read leaves the now-stale rows and shows its error.

**Evidence strength and limit:** Four actual hosted cases prove the user-visible reversal. Reviewer separately reproduced the composition with actual current loader, strict parser/schema, query and AST-extracted activity action plus installed Apollo and the recorded genuine old body. One Link serves both logical calls; generation3 is inactive before release and active afterward; a genuinely new controlled rejected read leaves active. The controlled probe uses a plain store/navigation observer and fixed-ready dependency, not full Pinia/Vue or browser-internal tracing. It proves the current-source composition gap, but does not identify the precise logical subscriber/generation number in each hosted browser. No introducing commit, blanket broken-generation algorithm, IR057/058 regression, filesystem cause or runtime restart is attributed.

### Exact hosted proof

Commands, cwd `api-e2e-evidence/API-REV-037`:
```
node live/VAL058-current-renewal.mjs direct 1502 confirmation
node live/VAL058-current-renewal.mjs mounted 390
node live/VAL058-current-renewal.mjs direct 390
node live/VAL058-current-renewal.mjs mounted 1502
```
All four repository receipts are **code1/commandCode1**, solely `lateReadCannotUndo`; other13 assertions pass. Each case has one controlled aborted Stop that never reached backend and one dispatched actual successful Stop, not two accepted Stops. Selection, expansion, draft, exact projection conversation, no boundary Send/Restore/page error all hold.

Direct1502: actual success22:42:39.928Z; inactive samples40.158/40.699/41.244 with old response unreleased; old delivered41.893; at43.156 root Running/Stop1 enabled/backendfalse; fresh rejected44.667, same failure45.807. Full exact identities and four-case timing in `code-review-evidence/CRR-089/failure-proof-summary.json` and original API37 case artifacts.

Reviewer read the actual timing helper: it waits for a normal history request, obtains the real response and fulfills that unchanged response only after Stop; no store injection, fabricated active payload, CSS change or synthetic UI mount. It holds the Stop request **before backend dispatch**, captures genuine success, waits for inactive publication, then releases old history and separately rejects the next normal history read. Thus the corrected proof does not rely on the original invalid HTTP-only pending-authority premise.

Reviewer independently viewed four PNGs: direct1502 confirmation and mounted390, each pending and after old delivery/fresh rejection. Grey→green root with reappearing square Stop, same selected Agent, direct center Offline/draft/conversation and narrow mounted selection are visible. Exact disabled/identity/backend semantics come from correlated DOM/JSON, not pixels alone. Narrow drawer hides the center; no claim of seeing its conversation in those two images. No new visual redesign finding.

### Earlier review gap / affected rationale

CRR088 verified immediate publication and independently resolving old/fresh mocked promises (`runHistoryStore.spec.ts806–836`; actual collection test mocks `getApolloClient` at24). It did **not** verify that distinct logical refresh generations represent distinct physical responses under the installed client. DS037's stale-read protection claim required that boundary check. The exact source invariant missed: an authoritative Stop fact must not be superseded merely because a later logical invocation subscribed to a pre-Stop in-flight read. Current loader/client configuration makes the gap reasonably source-detectable with a focused composition check; this is not exclusively runtime-only behavior.

The earlier broad assertion that DS036–037 delayed-read protection was preserved is withdrawn for this boundary. Unaffected prior evidence remains historical. **No numerical rescore or full scorecard is issued in this focused failure-origin round.** The overall current source readiness result is Fail. This does not imply that all prior tests or immediate-publication work were invalid.

## Classification / Architecture-Owned Recovery

- **Confirmed origin:** implementation read-client composition, with the specific earlier review gap above. Invalid test/fixture/environment and source change after review are not the confirmed cause.
- **Recovery classification: Unclear — cross-boundary design scope**, not uncertainty about whether the failure exists. A narrow read-contract correction may be sufficient, but this review has not established whether that alone satisfies the requested original Team/nested-Team status alignment across root, members, aggregates, stopped inspection and deliberate restoration. Nor does the defect by itself prove that the reviewed architecture must be replaced. **The user explicitly requested Architecture comparison before the next fix**; API's preliminary Local Fix is not treated as the final route.
- Architecture must assess and record the minimum necessary design decision/update to DS037 and the affected status/read-authority path. This is a recovery assessment, **not a claim that a new requirements or Product approval gate already exists**, and not permission to redesign unrelated scope. No implementation work is handed directly to Implementation in this round.

### Required original personal-branch comparison

Read-only local `personal` and `origin/personal` both pin to **5645b49d6f51faa60bd3545bc8e3f0e7e3f96793** (`2026-09-11 docs(delivery): record verified v1.4.69 publication`). Reviewer verified this tree still includes original nested-Team code. No fetch, checkout or branch modification occurred. `original-personal-pin.json` and `original-personal-discovery.txt` preserve starting evidence; **the full comparison is not completed here**.

Ask Architecture to trace original Agent Team **root activity/Stop**, exact Agent status, **nested-Team aggregate status**, streaming/hydration, history precedence and navigation publication, then compare Agent Org direct/mounted paths. Starting paths at that exact commit:
- `autobyteus-web/stores/agentTeamRunStore.ts`, `agentTeamContextsStore.ts`, `runHistoryStore.ts`, `runHistoryLoadActions.ts`, `runHistoryTeamRows.ts`, `runHistoryTeamExecutionRows.ts`, navigation projection/actions;
- `autobyteus-web/components/workspace/history/workspaceHistoryNestedTeamStatus.ts`, `NestedTeamAggregateStatusDot.vue` and associated tests;
- `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` and Team execution/hydration owners.

Observed discovery only: original root Stop commits inactive view/member cleanup and named history publication before refresh; configured Agent rows obtain exact AgentContext status; nested-Team indicator aggregates descendant Agent statuses. **These are different facts**: nested aggregate status does not establish root runtime activity/Stop eligibility. Do not assume old code is defect-free or copy the nested coordinator hierarchy into coordinator-free fixed-depth Orgs. Determine what established ownership pattern to reuse/adapt, what approved semantics must differ, and why; no special cache/epoch/protocol/hidden Stop workaround is prescribed by Reviewer.

After the Architecture-owned result, route by its completed classification/team rules. Any implementation repair still requires selected source review and **FULL cumulative API/E2E renewal**, not only these four checks. Include a durable installed-client overlapping-read regression at the chosen owner boundary, with confirmed Stop, genuinely active/pending/rejected Stop, unchanged old response and unavailable later read controls. Retain existing exact identity, conversation/draft, task read-only and explicit continuation semantics. Successful API-owned test review remains required after eventual API Pass.

## Execution, Integrity And Carried Limits

- API37's complete report remains **Fail69.3**, seven category mean50/95/75/90/50/50/75. Directness95 measures strong failure proof, not correct product behavior. Full renewal was initiated, then stopped on critical failure: **41groups =2Pass /37NotTested(partials) /1Fail /1N/A**. API36's35Pass are historical, not current.
- API37 reports33 selected repository commands Pass, **434 distinct main files /2645 tests**: server188/1065, web186/1255, core60/325. Exact50/recovery35/Electron9/39 overlap, not additive. Current builds/Nuxt16 routes/three guards/devkit/Brief, deterministic registered modelA–F, immutable fixture, initial bootstrap/import/history no-write and POSIX writer1000commits/9101reads/0invalid pass within their scopes. These were not rerun by Reviewer.
- Five fresh roots/five unique baseline actual provider inputs; one original already-stopped root from an invalid helper premise, four new confirmation roots. No accepted replay. No current formal tasks, main restart/Restore, native worker or full authoring/model/strictAPI/attachment lifetime/finalUI acceptance. Historical10tasks40correlations/18inputs remain carry-only. External Codex compact is not native-worker or user-triggered compaction UI validation.
- API37 retains57 structured receipts/eight original nonzero (four product, two helper premises, one Apollo import, one cleanup phase-name error) plus separate report/index failure. Corrected initial empty-Send and HTTP-only authority premises do not reconstruct original WS timing. No errors silently converted to Pass.
- API37 cleanup reports all five roots inactive; owned main/bootstrap gracefulSIGTERM0, rendererSIGTERM, owned tabs closed/allfour shared targets preserved; no observer/collector/inspector. Four initially absent outputs and17 own devkit dirs removed, preexisting core/server/devkit dist retained.78runtimefiles exactPAX bytes/mode/nsmtime verified, byte/mode-exact copyback with78mtime quantizations disclosed; own/tmp removed. API36 separate filesystem anomaly/120quantizations/PAX untouched, not this UI cause. API reports62,243 protected regular files,11links,19fixture unchanged; Reviewer verifies receipts/manifests, not a new live cleanup experiment.
- Reviewer verification:3current/811cumulative source inventory,738API37 evidence files,5API failure-source hashes and4current API canonical hashes match.1478-entry ingress authority has1474 unchanged entries and exactlyfour expected API-owned canonical updates matching final hashes.2140 incoming references exist. Focused20-source witness hashes captured. No successful proportional result inferred from unchanged tests.
- Reviewer local source/client proof final exit0; two original import-preparation exit1 attempts retained (ESM-only contracts, transitive graphql-tag resolution), assertions unchanged. Two administrative verifier failures retained (ingress-vs-current API canonical scope, receipt field `code` vs guessed `exitCode`) with explicit correction. Ancillary broad read-only file discovery was stopped; explicit path reads replaced it. No product build, full suite, live root/browser/server/provider, auth, DR009, migration, staging or commit operation by Reviewer. Final preservation receipt accompanies result.
- Preserve CRR059/067/IR041/API27/29/DR007/009/unknown stalls/API20 firstguard/native outer limits. Original API35 missing Restore body/API33 lost associations remain missing. Full provider/owner negatives, native worker/model/Stop, older-page browser/UserMessage/Open, complete attachment owner/type/lifetime/archive/export matrix and final UI remain held. No full vue-tsc/all-testsTS/nativeShell/AppImage/Delivery/user/release readiness.
- **IR049 actual installation decision remains Architecture-owned BEFORE CUTOVER**, separate from this failure and not a general coding/disposable-validation hold. No reset/replay/new migration ID/backfill/rollout or release permission.

## Final Routing Status

Completed result: **Fail, CRR089 / CR-FIND046; confirmed implementation composition defect, Architecture assessment required for Unclear recovery design scope.** Fresh dynamic rule and exact selected recipient are recorded in `code-review-evidence/CRR-089/selected-handoff-rule.json`. Complete cumulative package, including unchanged pending test deltas, accompanies the single Architecture handoff. Do not advance to API/E2E or Delivery from this result.

Fresh rule selected: **“When review identifies a Design Impact, Requirement Gap, or Unclear issue that requires upstream requirements or design revision.”** → **`/software_engineering_team/architecture_designer`**, single recipient. This routes the unresolved recovery-design decision; implementation origin itself is confirmed. Final preservation: **31,031 baseline regular dirty/untracked files;31,029 unchanged**, only the two Reviewer canonical records changed; no missing/unexpected/staged/unmerged paths and HEAD unchanged. All20 focused source witnesses and three pending API test hashes/numstats (+34/0,+16/−1,+13/−2) preserved. Complete reference index attached.
