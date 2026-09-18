# API/E2E case ledger — ORG-HISTORY-LATENCY-20260917-001
Completed API-REV-001: Pass / 95.0% validation confidence. Canonical execution report authoritative.
|Case|Authority|Plan|Status|
|---|---|---|---|
|R01|AC001–003|Manifest9newnarrow+136scoped|Pass|
|B01|AC001/003|Actualstartup Agent/Team/Org; request/DOMtiming; nostoppedstartup|Pass|
|B02|AC001|Orgready/workspace+catalogheld; reverse|Pass|
|B03|AC002/003|Quiet503 retains rows/selection; recovery; inspection/data hashes; attachment Not Tested|Pass|
|B04|AC001/003|Active reconnect while unrelatedworkpending; stoppedpeers unchanged|Pass|
|C01|AC003|Preservation/cleanup/confidence/report/APIREV001|Pass|

R01 complete:9/1 narrow,136/10 scoped Pass (overlap); fresh server production build/sanitized bootstrap Pass. Fourmanifest exact. Supplied broader18fail/16errors baseline qualification retained, not independently rerun. Setup-only copied observer ownership guard initially rejected newisolatedpath before serverstart; corrected temporaryharness guard, no production change. Official built importer from authorizedsource completed9newsecrets/0replacements to ownednewDB only; normal freshDB Prisma initialization, no userdata migration/reset.

## B04 — completed Pass
Real UI-created Agent/Team/Org received distinct replies through actual gpt-5.4-mini (three 200 responses total). Reloaded existing focused Org while the real Team resume response was held (member projections ran after release). Org row, selected guide Idle, exact conversation visible while global history loading remained; released responses, Team lead Idle and exact reply recovered, Agent Idle reply recovered. No extra provider requests. Then stopped all three via sidebar controls for subsequent stopped checks. Evidence: api-live/active-hydration-{held-dom.txt,checkpoint.json,transport.json}, active-reconnected-dom.txt, agent-reconnected-dom.txt. Optional attachment upload was not completed (browser file permission refused); not evidence of product failure, no attachment retention claim.

## B02 — completed Pass
Actual production application through transparent timing-only proxy: Org-first with ListWorkspaceRunHistory, GetWorkspaceRunHistory, all three definition catalogs and workspace descriptor held; actual Org workspace/group/root and stopped direct/mounted hierarchy usable before release. Reverse ordering: actual Agent/Team groups and stopped run labels visible while Org history, scoped expansion query, and three catalogs held. Pending scoped expansion cannot manufacture missing rows. Release restored all families/loading. Screenshots and exact request/backend-ready/release logs: validation/api-live/{org-first,workspace-first}*. No successful response fabricated; user controls only.

## B01 — completed Pass
Normal focused browser startup: actual stopped Org conversation reopens Offline; Agent/Team/Org groups appear with exact original IDs/labels. Measured backend request-completion and released-response to first observed DOM upper bounds in api-live/timing-summary.json; observation polling is NOT paint timing or SLA. Initial catalog landing starts workspace collapsed, so no hidden group latency inferred from that attempt. Focused route naturally reveals selected Org, no extra refresh. Stopped inspection and both delayed-family tests issue no fourth provider request. Before/after persisted hashes finalized under C01.

## B03 — completed Pass with attachment subcheck Not Tested
Normal five-second quiet refresh observed actual injected503 independently in each history family; prior rows, selected stopped guide, exact conversation, unsent draft and Activity remained. Other family continued successfully. Clearing each fault allowed normal quiet recovery, error cleared without reload or resend. Mounted unused leaf inspected Offline/empty; returning guide restores draft.16 persisted history/tree/trace/context/message/task files byte-identical after all stopped inspections/refreshes. Three provider requests total (all deliberate setup Sends); no activation from listing. Evidence quiet-*-dom.txt, quiet-fault-transport.json, mounted-unused-offline-dom.txt, preservation-proof.json. Successful-empty transport at initial owned empty startup captured; edge/generation permutations additionally exercised by fresh durable suites. Attachment upload/retention subcheck Not Tested, not a scoped failure.

## C01 — completed Pass
All four IR-001 source/test/fixture hashes and six authored package hashes unchanged;16 history/tree/context/trace files unchanged. Exact owned services and children stopped,51181–51183 closed, owned browser tab closed. Generated SDK dist absent at intake removed; private ignored test data retained safely, no user actions/Git finalization. Reports/investigation and API-REV-001 persisted. Final seven-category confidence95.0%; direct low-risk Delivery route, no API-owned durable test change.

## API-REV-002 reopened plan — IR-002 cold readiness recovery

Historical API-REV-001 remains Pass evidence for the byte-identical IR-001 frontend and unchanged recovery/selection lifecycle, but does not validate this reopened backend correction.

| Case | Expected | Status |
| --- | --- | --- |
| R02 | Current IR-002 manifest, changed server owner tests and frontend preservation scope valid | Pass |
| B05 | Fresh process performs exactly one readiness rebuild before listen and first mixed/Org history triggers no second rebuild | Pass |
| B06 | Same cold normal browser renders representative Team and AgentOrg rows from real responses without unrelated delay | Pass |
| B07 | Expand/select/inspect works; inactive listing starts no provider; identities/status/data hashes preserved; unchanged failure/generation/reconnection coverage remains valid | Pass |
| C02 | Owned resources cleaned; canonical reports and API-REV-002 reconciled; rule-based handoff | Pass |

### R02 — completed Pass
- IR-002 manifest 4/4 entries exact (`validation/api-reopen-r2/intake-manifest-check.json`).
- First server attempt was setup-only: two files/11 tests passed while the mixed-history file could not resolve an absent generated shared SDK package. This was not a product result.
- After the documented `prepare:shared`, all three changed server owner files passed 12/12 (`server-focused-after-setup.log`): awaitReady/rebuild discrimination, concurrent initialization, readiness failure, lazy strict generation and real first mixed history.
- The unchanged IR-001 frontend preservation scope passed 136/136 across ten files (`web-preservation.log`). No API/E2E source or durable test edit was made.

### B05 — completed Pass
- Histories were first created by real Chrome Run/Send/Stop journeys: standalone Agent `latency_agent_6a7477bb658a40f0980744fe808ec7ed`, standalone Team `latency_team_8573f2095ac242b188665a08eb0a2915`, and AgentOrg `latency_org_3ede46f6f7824d9d956fc5e4ff16b1f5` with direct and mounted placements. Three provider requests returned the exact `LATENCY-AGENT-R2`, `LATENCY-TEAM-R2` and `LATENCY-ORG-R2` replies before the seed process stopped.
- Definitive fresh backend PID9296 recorded exactly one startup `rebuild()` from `startConfiguredServer`, admitting one Team and one Org. First workspace/Org history initialization then issued two `awaitReady()` calls with `initializedBefore:true`; no second rebuild occurred. Evidence: `validation/api-reopen-r2/cold-generation-summary.json`, `cold-run3-readiness-events.jsonl`, `cold-run3-backend.log`.

### B06 — completed Pass
- From an owned Chrome tab on `about:blank`, normal navigation to the retained AgentOrg route displayed standalone Agent, Team and Org groups plus the selected stopped Org tree and exact reply within a 6,188 ms AX-observation upper bound. Workspace history returned in4ms/released5ms; collaboration-root history returned/released22ms. This is representative cold-process acceptance, not universal SLA or paint instrumentation.
- The same behavior occurred in two earlier fresh-process runs; they remain supporting evidence, while cold-run3 is authoritative. No successful response was fabricated or held.

### B07 — completed Pass
- Normal sidebar expansion and selection reopened the standalone Team lead (`Offline`, exact `LATENCY-TEAM-R2`), standalone Agent (`Offline`, exact `LATENCY-AGENT-R2`), AgentOrg direct guide (`Offline`, exact `LATENCY-ORG-R2`) and never-used mounted Team/lead (`Offline`). Original IDs, labels, grouping and selection were retained.
- Provider metadata remained empty throughout the cold listing/inspection process. All22 compared authored and persistent history/tree/context/trace/message/task files were byte-identical before/after. Current owner tests cover readiness failure/generation; unchanged API-REV-001 actual recovery/reconnection evidence remains applicable.

### C02 — completed Pass
- Final four-entry implementation manifest exact; `git diff --check` Pass. API-REV-002 canonical investigation/report/ledger/revision record reconciled at97.4% confidence.
- Owned Chrome tab and all exact backend/proxy/frontend processes stopped; ports51181–51183 closed. Generated SDK prerequisites absent again. Isolated evidence/data retained, user profile/server/data untouched, no staging/commit/push/merge/release.
