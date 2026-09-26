# API/E2E Execution Coverage Report — saved Team fixed workspace path

## Round, authority, and route
- Round 1 / API-REV-001; triggered by IR-001 at commit `17c4efed3`; latest authoritative result below. Prior API/E2E result/confidence: N/A.
- Canonical upstream artifacts in this ticket directory: approved `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md` (SR-001–004), `design-spec.md`, `solution-handoff.md`, `implementation-handoff.md`, `implementation-revision-record.md` (IR-001). User screenshot path in solution handoff is evidence-only. Architecture and source review: N/A — not applicable; Product UI/UX: N/A.
- Coverage investigation: `api-e2e-coverage-investigation.md`; case ledger: `api-e2e-test-case-ledger.md`; revision record: `api-e2e-revision-record.md`.
- `task_size=Medium`, `architectural_risk=Low`, Direct Low-Risk input, success route Delivery. Proportional test-code review: **Not Required — direct low-risk route**.
- Investigation was completed before durable test edit and execution. Plan followed; the only deviation was correcting a local fixture typo after a pre-start probe failure. No upstream reroute.

## Requirement, case, and changed-boundary results
| Case / scenario | ACs / boundary | Execution and observed result | Evidence |
| --- | --- | --- | --- |
| CASE-001 | AC-001–003; Team/Org projection and Vue components | Pass: four files / 30 tests; fixed root/member, null, Org selector and new-Team branches | `evidence-focused.log` |
| CASE-002 | AC-003; shared selector, launch store, Team model patch | Pass: three files / 35 tests | `evidence-broader.log` |
| CASE-003 / API-E2E-004-B | AC-001–003; actual Nuxt/Chrome editor with routed canonical GraphQL DTO | Pass: exact root `/workspace/browser-probe`; member values `/workspace/browser-probe`, `/workspace/member-not-registered`, `—`; each fixed/read-only, typing unchanged, no Team picker, false unavailability or green duplicate; one exact model-only patch; canonical paths unchanged after Save | `evidence/existing-run-model-config/existing-run-model-config-evidence.json`, `API-E2E-004-B-team-saved.png` |
| CASE-003 / API-E2E-004-A,C–F | Preserved Agent settings, narrow responsive editor, active-run lock, model replacement/retry | Pass: all five other existing browser scenarios | Same JSON; named screenshots and Nuxt log |

- Browser probe final result: **6/6 scenarios Pass**, no page errors or harness failures. First command attempt failed before any browser execution because the new fixture used `name` outside its mapper; the fixture was corrected and the complete probe rerun twice, last run with keyboard immutability and serialized path evidence. This was a local test correction, not an implementation failure.
- Additional static checks: `node --check autobyteus-web/tests/e2e/existing-run-model-config-probe.mjs` and `git diff --check` passed.
- Implementation's Nuxt production build was previously passed; API/E2E changed test code only, so no production rebuild was needed. Full repository typecheck remains limited by the implementation handoff's pre-existing Nuxt tooling/baseline errors; no new typecheck claim.

## Ledger reconciliation
- Ledger initialized before execution; CASE-001 initial Started entry needed immediate retrospective correction because the append script used the web subdirectory instead of worktree root; terminal result was recorded before CASE-002. CASE-002 and CASE-003 terminal results were recorded before next work. Browser pre-start typo and reruns are preserved as checkpoints. All three cases terminal **Pass**, none running, blocked, or not tested. Ledger reconciled with this report.

## Environment, broader validation, and limitations
- Browser validation was **Required** after 79.3% post-repository confidence. Selected project-supported self-starting `test:e2e:existing-run-model-config` browser probe rather than Electron shell: changed behavior is web-equivalent Nuxt/Vue projection/rendering, not IPC/window/packaging. Real Chrome executable `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; macOS arm64, Node v22.23.1, Nuxt 3/Vitest 3.2.4; 1280×900 and 390×844 viewports, en-US/UTC browser context.
- Probe installed its own temporary Nuxt fixture route, spawned its own free-port loopback Nuxt dev server, routed GraphQL to a deterministic schema-parsed saved Team tree, and used the actual `ExistingRunConfigEditor` plus current frontend stores/projectors/components. No secret, account, production data, user-running app or shared backend was touched. The fixture includes a path absent from any supplied workspace inventory, so no false availability inference is justified. Backend GraphQL was mocked; real backend persisted-run journey was not exercised because the changed boundary is frontend-only and the local backend lacked a saved Team. This is a bounded residual contract/environment uncertainty, not a missing critical AC.
- The owned browser context/browser, Nuxt process group, log stream, and temporary page all closed/removed; cleanup is recorded `Pass` in the evidence JSON. No shell-specific behavior was in scope or claimed.
- Persisted-data decision: **Not Affected**. The schema-parsed representative existing tree was read via current frontend canonical-load path; model Save returned the same root/member paths. No migration, fallback, dual read/write, compatibility-only coverage, or legacy Team `historical-only` path observed. Org selector remains an approved distinct current flow.

## Confidence scorecard
| Mandatory category | Post-repository | Final | Final evidence and residual uncertainty |
| --- | ---: | ---: | --- |
| Requirement and acceptance-criteria proof | 75% | 95% | AC-001/002 browser DOM and AC-003 browser Save plus real component/store picker/Org checks; no full real-backend run. |
| Changed-boundary execution directness | 75% | 100% | Actual Nuxt route, canonical projection, root/member renderer and interaction exercised. |
| Cross-boundary integration realism and mock gap | 75% | 95% | Browser GraphQL/DTO/form/save chain executed with schema-parsed fixture; server implementation unchanged and mocked. |
| Environment, configuration, identity, fixture fidelity | 75% | 95% | Isolated Chrome/Nuxt with contract-shaped saved Team and distinct/null paths; no production run identity. |
| Failure, edge-case, lifecycle, recovery | 90% | 95% | Null, nonregistered path, Save preservation, narrow layout and existing retry/active-run scenarios passed. |
| User-surface, browser and desktop shell | 75% | 95% | Rendered browser UI and keyboard/read-only checked; desktop shell not changed. |
| Durable regression coverage quality | 90% | 95% | 65 relevant Vitest tests plus updated self-starting browser probe with durable assertions. |

- Calculation: simple mean of seven applicable categories. Post-repository **79.3%**; final **95.7%** (rounded **96%**). No final category below 90%. Every critical AC directly proven at its relevant changed/preserved boundary: **Yes**. Default 95% clean target met: **Yes**. The remaining real-backend mock gap is bounded/nonmaterial for this frontend-only change; do not interpret this as proof of physical path existence or Electron-specific packaging.

## Durable coverage, artifacts, and cleanup
- Updated durable test: `autobyteus-web/tests/e2e/existing-run-model-config-probe.mjs` (API-E2E-004-B fixture and assertions). Added durable test paths: none. Removed durable test paths: none. No test-code review required on direct Medium/Low route.
- Evidence retained under `tickets/in-progress/team-workspace-saved-value-warning/`: `evidence-focused.log`, `evidence-broader.log`, `evidence-browser-command.log`, `evidence/existing-run-model-config/existing-run-model-config-evidence.json`, screenshots, `nuxt-dev.log`. Temporary fixture page was removed; screenshots/JSON/logs retained as evidence, not app resources.
- No API/backend or production source change by API/E2E. No environment/fixture issue remains. No preliminary failure classification or recommended failure owner is applicable.

## Latest authoritative result
**Pass — final validation confidence 96%; broader browser validation completed; no critical AC lacking direct proof.** Route cumulative package to `/delivery_engineer` under direct Medium/Low rule. Residual: real backend persisted-run and installed Electron shell not executed, appropriately bounded by unchanged contracts/shell and direct frontend browser proof.
