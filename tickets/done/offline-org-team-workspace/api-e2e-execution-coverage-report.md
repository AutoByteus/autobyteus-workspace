# API/E2E Execution Coverage Report

## Execution round meta
- Package: **OFFLINE-ORG-TEAM-WORKSPACE-20260922**; round **2**; current authority **API-REV-002**.
- Worktree/branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace`; `codex/offline-org-team-workspace`.
- Current HEAD: `66213bd539ed422d39d101bdd218d73760a4100f`; corrective source/test commit `cb139904c68b65e3af9f6b07de0e8e5275ed8169`; prior API baseline `3a52e67ba72ee53497f5d9492f406289f23f28f3`.
- Trigger: Code Reviewer **CRR-003 Pass**, revalidate IR-003 correction of API-F001. Current solution/design authority SR-005 / ARCH-REV-003; approved requirements SR-002 unchanged; implementation IR-003; source review CRR-003.
- Classification: task size **Medium**; architectural risk **High**; input **Reviewed**. Successful-output route **Code Review**; proportional durable-test review **Required**.
- Prior completed API result: **API-REV-001 Fail / 75.0%**. No Pass or confidence was inferred before this revalidation.
- Canonical authorities: `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `solution-handoff.md`, `design-review-report.md`, `architecture-review-revision-record.md`, `implementation-handoff.md`, `implementation-revision-record.md`, `code-review-report.md`, `code-review-revision-record.md`, `api-e2e-coverage-investigation.md`, `api-e2e-test-case-ledger.md`, this report and `api-e2e-revision-record.md`.
- Delivery report/revision: **N/A — not yet entered**. Successful post-API/E2E test-code review: **N/A — pending**.

## Investigation and execution basis
Round-2 investigation was updated before execution. The prior C09-R1 failure reproducer remained valid and was executed first. Source-scope evidence showed only `FileExplorer.vue` and two focused web tests changed from API-REV-001; CRR-003 independently fingerprinted all other audited owners unchanged. Therefore:

- C09-R1, focused Files/layout coverage, broader affected frontend coverage, current real HTTP/restart, and both browser recovery branches were rerun.
- API-C01/C03/C05/C06/C07/C08/C10 remain carried Pass from API-REV-001 and are explicitly not described as round-2 reruns.
- No API-owned production or durable-test edit was required in round 2. No stale coverage was removed.
- Material deviation: owned services and the first browser tab died during an execution interruption. The same isolated DB/runtime and fixture identity were resumed without replaying configuration Save or resetting a provider/session. The already completed unopened branch had durable audit evidence; the dirty branch completed in a fresh owned tab.

Ledger initialized before execution: **Yes**. Every completed case was checkpointed. Last event R2-12 cleanup/reconciliation. No case remains running, interrupted, failed or unstarted.

## Case reconciliation
| Case | Round-2 status | Current evidence and interpretation |
| --- | --- | --- |
| API-C09-R1 | **Pass, rerun first** | 1 file / 14 tests; original recursion reproducer plus readiness/error/Retry/stale/inactive/unmount/stable-lease cases; no reported unhandled error. `api-r2-c09r1.log`. |
| API-C02 | **Pass, rerun** | Focused 6 files / 49 tests; broader affected 28 files / 275 tests. Counts overlap. Both composed recoveries use real metadata/ensure registration and delayed transport, not pre-registration. `api-r2-focused.log`, `api-r2-web.log`. |
| API-C04 | **Pass, rerun** | `prepare:shared`, server build, and real-process HTTP/persistence/restart 1/1 all exit 0. `api-r2-prepare.log`, `api-r2-build.log`, `api-r2-http.log`. |
| API-C09 | **Pass, rerun** | Initially unopened B and prior-mounted dirty B→D both recover on first completion with Files selected, no tab workaround/reload/pre-registration/Save replay; no console error/recursion; exact disk/API audits pass. `api-r2-browser-result.json` and branch audits. |
| API-C01 | **Carried Pass; not rerun** | Server config/options/GraphQL owners unchanged. Prior 3 files / 21 tests. |
| API-C03 | **Carried Pass; not rerun** | Lifecycle/activation/task/bootstrap owners unchanged. Prior 20 files / 117 tests. |
| API-C05 | **Carried Pass; not rerun** | Prior actual native same-Agent/memory continuation and B file operation/unused child. |
| API-C06 | **Carried Pass; not rerun** | Prior actual Codex same-thread continuation and B file operation/unused child. |
| API-C07 | **Carried Pass; not rerun** | Prior actual Claude same-session continuation and B file operation/unused child. |
| API-C08 | **Carried Pass; not rerun** | Prior full browser Save→reopen→Send and responsive renderer path; changed owner only rechecked through C09. |
| API-C10 | **Carried Pass; not rerun** | Prior real fresh task in B with historical snapshot/A-file preservation; owners unchanged. |

## Repository coverage execution
All commands ran from the worktree root; full exact commands are in `evidence/api-r2-local-checks.md`.

| Order | Command summary | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-web test:nuxt …FileExplorer.metadataActivation.spec.ts --run` | API-F001 original and activation lifecycle | **Pass: 1/14** | `api-r2-c09r1.log` |
| 2 | Six Files/layout test files | Corrected consumer + null/layout/tab integration | **Pass: 6/49** | `api-r2-focused.log` |
| 3 | 28-file affected web set | Run-config drafts/publication/adoption/forms/Files | **Pass: 28/275** | `api-r2-web.log` |
| 4 | `pnpm prepare:shared`; server build; stopped-Org workspace GraphQL E2E | Current declarations/build and real HTTP/process/restart/schema-v1 | **Pass; E2E 1/1** | `api-r2-prepare.log`, `api-r2-build.log`, `api-r2-http.log` |

The full web `vue-tsc` command remains blocked by unchanged baseline parser diagnostics in `AgentTeamLibraryPanel.vue:2` and `pages/agent-orgs.vue:2`; it was not represented as a Pass. Focused tests/build do not substitute for whole-project typecheck.

## Real browser/API execution
Environment: isolated project bootstrap, unique runtime/DB/key, public synthetic schema-v1 Org fixture, transparent HTTP/WebSocket proxy and Nuxt renderer. Chrome 153.0.8010.53; Nuxt 3.21.1; Vue 3.5.28; Node 22.23.1; pnpm 10.28.2; macOS Darwin arm64. The proxy returned a controlled GraphQL error only for the exact selected target's `workspaceMetadata` request; it did not mutate client/store state.

| Journey | Expected | Observed | Result |
| --- | --- | --- | --- |
| Unopened B unavailable safety | One stopped-Org Save; tree/editor absent; Cmd+S no write | Exact whole tree shows Team/all configured children B; root/direct/sibling A; inactive; 1 save, 1 fault, 0 create, 0 write; A/B/C/D untouched | **Pass** |
| Unopened B first recovery | Clear only fault; one Edit Config/canonical read; no workaround | `target.txt` renders, Loading absent, browser console errors empty; no tab toggle/reload/pre-registration/Save replay | **Pass** |
| Unopened B explicit use | Open actual file and save through Monaco | One create and one deliberate write; B becomes `B explicitly saved after FIRST recovery`; A/C/D unchanged | **Pass** |
| Dirty prior B unavailable safety | Mount B, enter unsaved dirty text, Save Team D under fault | Previous editor/tree removed; Cmd+S suppressed; B keeps prior saved value; D remains original; 2 saves, 2 faults, 1 create, 1 write | **Pass** |
| Dirty prior B→D first recovery | Clear only fault; one Edit Config/canonical read with Files still selected | D `target.txt` renders on first completion; no Loading, tab workaround, remount, recursion or console error | **Pass** |
| D explicit use and continuity | D original visible; deliberate edit/save only D; retain stopped context | D receives only explicit write; B unchanged. APRICOT-R2 conversation, unsent composer, launch draft A, member/platform identity and inactive state remain | **Pass** |

Final correlated totals: exactly **2** configuration saves, **2** injected faults, **2** workspace creates and **2** deliberate file writes. Schema version remains 1. A and C files remain original; B and D contain only their explicit destination writes. No `Maximum recursive updates` appears in round-2 evidence. Primary evidence: `api-r2-browser-result.json`, `api-r2-unopened-unavailable.json`, `api-r2-unopened-recovered.json`, `api-r2-dirty-unavailable.json`, `api-r2-dirty-recovered.json`, `api-r2-requests.jsonl`, `api-r2-backend-resumed.log`.

## Prior failure resolution
**API-F001 resolved.** The exact durable reproducer passes first, and both realistic browser branches now reach a usable target on the first recovery without the old Activity→Files workaround. Current terminal paths settle error/Loading; a pending target no longer retains the previous active ID; same-ID readiness is observed without equivalent-object churn. Null-target safety and stale/inactive/unmount guards remain passing. No requirement or design ambiguity was found.

## Compatibility, persistence and identity
- Backward-compatibility or legacy-retention scope observed: **No**.
- Approved transition: **Directly Usable — No Migration**. Current schema-v1 data is read through the normal reader after a real process restart; no migration, version branch, dual read/write or alias fallback was introduced.
- Whole-tree preservation and configured-child propagation pass; no file/history copying or activation on inspection/Save.
- Round-1 actual provider identities and fresh-task history evidence are carried only because their owners were independently unchanged. Round-2 browser setup used a fresh stopped Claude fixture solely for retained UI context and is not claimed as a provider-continuity rerun.

## Durable coverage changed cumulatively
| Path | Change | Current result / purpose |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-org-runs/stopped-org-workspace-graphql.e2e.test.ts` | Added by API-REV-001, unchanged in round 2 | 1/1 Pass; public API/process/restart/schema-v1, atomic propagation/preservation and rejections. |
| `autobyteus-web/components/fileExplorer/__tests__/FileExplorer.metadataActivation.spec.ts` | Added in API-REV-001; expanded/corrected by IR-003 | 14/14 Pass; original API-F001 and activation readiness/error/stale/lifecycle regression. |
| `autobyteus-web/components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts` | Updated by IR-003 | 2/2 within focused Pass; both unopened and prior-mounted composed first recoveries use actual metadata/ensure/registration with delayed transport. |

No durable test was removed. API owner made no round-2 test/source edit. All three cumulative changed durable-test paths are attached for proportional Code Reviewer review; no successful post-API test review is inferred.

## Validation confidence scorecard
Scores are evidence confidence, not test pass rates. Arithmetic mean across seven applicable categories.

| Category | Post-repository | Final | Final evidence / residual uncertainty |
| --- | --- | --- | --- |
| Requirements and acceptance criteria |50%|95%|All critical ACs now have direct cumulative proof; finite combinations remain sampled. |
| Changed-boundary directness |95%|95%|Actual reactive consumer and real renderer/API/filesystem exercised. |
| Cross-boundary integration realism |95%|95%|Real HTTP/restart, browser HTTP+WS/files/editor and carried actual provider/task evidence; test substitutions disclosed. |
| Environment/configuration/identity/fixture fidelity |95%|95%|Owned public fixtures, same saved Org/member/platform identity across restart; carried provider samples unchanged. |
| Failure/edge/lifecycle/recovery |75%|95%|Both real fault/recovery branches plus 14 lifecycle cases pass. |
| User surface/browser/desktop |50%|95%|Current real Files recovery and carried core/responsive browser pass. Actual unchanged native picker not executed. |
| Durable regression relevance/quality |95%|95%|Original reproducer, expanded lifecycle/composed cases and real restart test directly cover the risk. |

- Post-repository confidence: **79.3%** (555/7); browser validation required.
- Final confidence: **95.0%** (665/7), gain **15.7 percentage points**.
- Every critical acceptance criterion directly proven: **Yes**.
- Any final applicable category below 90%: **No**.
- Default final confidence target met: **Yes**.
- Broader validation: **Required and executed — Browser + Live API**.
- Bounded residuals: actual Electron native picker unchanged and unexecuted; full web typecheck baseline-parser-blocked; provider/model combinations sampled and round-1 real provider checks carried rather than rerun. None is a missing critical proof for the corrected boundary.

## Desktop strategy
Browser validation was used for web-equivalent Electron renderer behavior. The user's already-running production AutoByteus app was not touched. The actual native folder picker was not executed because no shell/preload code changed and its success/cancel/error/disabled bridge tests are included in carried focused coverage. This bounds shell-specific uncertainty without mislabeling browser evidence as Electron-shell execution.

## Temporary methods and mocks
- Round-2 stack/fixture/proxy/audit scripts are retained as ticket evidence because live orchestration is host/environment-specific; they are not production code.
- Proxy only injects the controlled metadata transport error. Browser editor, server, GraphQL, WebSocket and filesystem are real.
- Repository component tests mock external transport/Monaco where documented; they do not replace the real browser case.
- Provider/session probes from API-REV-001 remain temporary because they depend on configured CLI/local-model environments.

## Cleanup
Owned Nuxt, proxy and backend processes stopped; ports closed. Owned runtime, DB, root key and generated SDK `dist` directories are absent. Production AutoByteus PID19026/port29695 remains running untouched. Active validation tab closed. One pre-interruption local tab could not be reattached to the debugger; it is unmarked/inert with backing services stopped and left for automatic browser-session cleanup. No user tab was touched. Evidence: `api-r2-cleanup.json`.

No commit, push, merge, release or deployment was performed.

## Result summary and next owner
| Result | Scenarios | Summary |
| --- | --- | --- |
| **Pass** | C09-R1, C02, C04, C09 rerun; C01/C03/C05/C06/C07/C08/C10 carried | API-F001 is resolved at repository and realistic browser boundaries; all critical requirements have direct cumulative evidence. |

Preliminary classification: **No finding**. No requirement gap, design impact, implementation failure, test/fixture failure or blocker remains.

Recommended recipient: **Code Reviewer**, for proportional successful test-code review of the cumulative three durable-test paths above. Delivery is not yet authorized.

## Latest authoritative result
- Result: **Pass**
- Final validation confidence: **95.0%**
- Default 95% target met: **Yes**
- Final category below 90%: **No**
- Broader validation: **Required and executed**
- Critical acceptance criteria lacking direct proof: **None**
- Required next recipient: **Code Reviewer — proportional test-code review**
