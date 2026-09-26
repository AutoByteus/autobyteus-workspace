# API/E2E Coverage Investigation — saved Team fixed workspace path

## Investigation meta and route
- Round 1; trigger: IR-001 direct API/E2E handoff. Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-workspace-saved-value-warning` at `17c4efed3`.
- Authority: `requirements-doc.md` (approved SR-003), `investigation-notes.md`, `solution-revision-record.md` (SR-001–004), `design-spec.md` (SR-004), `solution-handoff.md`, `implementation-handoff.md`, `implementation-revision-record.md` (IR-001), all in this ticket directory. User screenshot path is in `solution-handoff.md`; evidence only. Independent architecture review, source review, and Product UI/UX artifacts: N/A — direct Medium/Low route.
- Classification: `task_size=Medium`, `architectural_risk=Low`; input Direct Low-Risk; success → Delivery; proportional test-code review `Not Required — direct low-risk route`.
- Prior API/E2E investigation, report, revision/result/confidence: N/A, not inferred. This file is the canonical initial investigation. Canonical ledger: `api-e2e-test-case-ledger.md`.

## Approved behavior and changed boundaries
| ID | Behavior and evidence | Boundary / intended proof |
| --- | --- | --- |
| BEH-001 / REQ-001–003 / AC-001 | Saved Team root exact stored path appears once in fixed read-only presentation; no Existing/New chooser, synthetic unavailable warning, or green duplicate. | Canonical DTO → Team projection → real root renderer. |
| BEH-002 / REQ-001–003 / AC-002 | Saved member exact path receives same display; null stays neutral. | Member DTO → projection → member renderer. |
| BEH-003 / REQ-003 / AC-003 | New Team picker stays interactive; stopped-Team model Save changes only models, never workspace path; Agent Org mounted-Team selector remains editable. | Editable Team form/selector; model-patch transport; Org selector routing. |

- Changed: frontend Vue component/state projection and browser-equivalent Electron renderer. Browser navigation/render/interaction is affected. Backend/domain, GraphQL DTO/API contract, auth/session, shell IPC, process lifecycle, workers/external integration: not changed. Saved data transition: **Not Affected** per design and implementation; no migration or compatibility branch. Still prove a representative existing `workspace_root_path` is read through the normal current DTO reader and survives model Save.
- Implementation handoff legacy check is clean: Team's unconditional `historical-only` projection and parallel fields removed; Org's separate selector path is valid current behavior, not a legacy shim. No mismatch found in source inspection.

## Project execution discovery
| Path | Instructions / constraint |
| --- | --- |
| `autobyteus-web/AGENTS.md` | Documentation catalog; never `git add .`/`-A`. |
| `autobyteus-web/README.md` §§ Environment, Development, Testing | Browser dev via `pnpm dev`; `BACKEND_NODE_BASE_URL` configures proxy; `pnpm test:nuxt … --run`; self-starting browser probes documented under testing. |
| `autobyteus-web/ARCHITECTURE.md` § Testing Strategy | Nuxt/Vue client, colocated Vitest tests, Electron wrapper; web-equivalent UI can be tested in browser. |
| `autobyteus-web/package.json` | `test:nuxt`, `test:e2e:existing-run-model-config`, `build`; Playwright-core dependency. |
| `autobyteus-web/tests/e2e/existing-run-model-config-probe.mjs` and fixture page | Existing self-starting browser probe installs temporary Nuxt page, starts owned dev server on free loopback port, routes GraphQL to deterministic contract-shaped fixture, captures JSON/screenshots/log and cleans up. Reuse rather than invent second harness. |

- Setup: existing `node_modules` and built workspace contracts present from implementation; no secret/account needed for deterministic renderer-boundary fixture. Chrome executable is locally available. Probe owns only its spawned server/context/temp page and cleans them; do not touch running desktop or backend. Real backend data is not needed to prove changed frontend projection/rendering, but GraphQL fixture limits live-backend confidence and must be stated.
- Live fixture: schema-parsed saved Team execution tree with root/member path values; GraphQL canonical read and model-update response. Exact path mismatched to current inventory by design. No production data mutation.

## Existing durable coverage inventory and validity
| Path/scenario | Decision | Rationale/action |
| --- | --- | --- |
| `components/workspace/config/__tests__/TeamScopeConfigEditor.spec.ts` | Still Valid | Fixed root + Org selector and editable Team branches match approved behavior; execute. |
| `components/workspace/config/__tests__/MemberOverrideItem.spec.ts` | Still Valid | Fixed member/null and Org branch; execute. |
| `components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` | Still Valid | Full saved Team projection/hierarchy and new-Team form; execute. |
| `services/runConfigEditing/__tests__/existingAgentOrgWorkspaceDraft.spec.ts` | Still Valid | Org mounted-Team edit/patch policy; execute. |
| `components/workspace/config/__tests__/WorkspaceSelector.spec.ts` historical-only synthetic scenario | Still Valid | Current Org stored selector still uses this distinct path; do **not** remove merely because saved Team no longer does. |
| `tests/e2e/existing-run-model-config-probe.mjs` API-E2E-004-B/C/F | Needs Update | Existing real browser/editor + routed GraphQL checks model Save and responsive layout, but omits exact saved path/read-only/no-warning/member/null and explicit workspace preservation. Add narrow assertions and distinct saved path fixtures. |
| `stores/__tests__/teamRunConfigStore.spec.ts` and `services/runConfigEditing/__tests__/existingTeamModelConfigDraft.spec.ts` | Still Valid | New launch and model-only patch behavior; execute broader relevant suites if present. |
- Stale/remove decisions: none. No obsolete durable coverage removed. No requirement/design ambiguity requiring upstream reroute.

## Durable coverage decision and execution plan
- **Update durable coverage:** `autobyteus-web/tests/e2e/existing-run-model-config-probe.mjs`, case API-E2E-004-B. Assert root/member/null fixed DOM, read-only noneditable behavior, no picker/warning/green status in Team scopes, model Save request and canonical return preserve exact paths. Browser probe is repository-resident durable coverage because it exercises actual Nuxt/Vue integration across route, GraphQL transport shape, projection and renderer. Existing adjacent component tests need no change.
- **No new API test:** public DTO/backend unchanged; schema-parsed fixture plus browser transport directly reaches changed frontend boundary. Real backend save remains a residual cross-boundary uncertainty, but the model mutation path is unchanged and separately pre-existing.
- **Desktop decision:** No shell-specific change; browser-preferred Nuxt renderer is appropriate. Do not launch or disturb installed Electron app.

| Order / ledger case | Command or mode | Expected evidence |
| --- | --- | --- |
| 1 / CASE-001 | `pnpm test:nuxt --run` with four changed adjacent spec paths | Projection/root/member/Org/new-launch focused regression. |
| 2 / CASE-002 | `pnpm test:nuxt --run` with WorkspaceSelector, teamRunConfigStore and existing Team draft suites | Shared selector/new-Team/model patch broader regression. |
| 3 / CASE-003 | `pnpm test:e2e:existing-run-model-config -- --output-dir ../tickets/in-progress/team-workspace-saved-value-warning/evidence/existing-run-model-config` | Real Chrome renderer with deterministic canonical DTO: fixed root/member/null, save path preservation, responsive/editor regression; JSON, screenshots, Nuxt log. |

Ledger required: Yes — multiple independent repository/browser cases and long-running probe. Initialize before editing/execution. No temporary probe planned. `API-E2E-004-B` retains its existing durable scenario ID; ledger CASE-003 records whole probe execution, not every assertion.

## Pre-execution confidence and broader-validation decision
- Post-repository scorecard: pending execution. Categories to score: requirement/AC proof; changed-boundary directness; cross-boundary integration/mock gap; environment/fixture fidelity; failure/edge/lifecycle; user-surface/browser/shell; durable regression quality. Average applicable scores, but never hide weak category or unproved AC.
- Broader validation: **Required**, Browser. Unit/component checks alone cannot prove the actual Nuxt route/editor DOM and model Save UI transition; the existing browser probe can close this gap. Live backend is not selected because changed code is internal UI projection/presentation and the browser probe feeds schema-validated canonical DTOs through the frontend GraphQL boundary. Reassess if a real contract discrepancy appears.
- Not tested/infeasible initially: actual installed Electron shell (inapplicable), physical path existence (out of scope), real backend saved run journey (not needed for frontend-only change if contract fixture and current reader prove path continuity; retain as explicit mock gap).
- Proceed: Yes. Durable update: Yes. Reroute before execution: No.

## Repository execution and post-repository confidence (2026-09-26)
| Order | Command (worktree root unless noted) | Result | Evidence |
| --- | --- | --- | --- |
| 1 | `pnpm test:nuxt --run` four adjacent specs (`autobyteus-web`) | Pass; 4 files / 30 tests | `evidence-focused.log` |
| 2 | `pnpm -C autobyteus-web test:nuxt --run` WorkspaceSelector, teamRunConfigStore, existingTeamModelConfigDraft | Pass; 3 files / 35 tests | `evidence-broader.log` |

| Mandatory category | Score | Evidence / uncertainty / expected browser gain |
| --- | --- | --- |
| Requirement and AC proof | 75% | Component/projection ACs pass, but actual editor journey unexecuted; browser closes. |
| Changed-boundary execution directness | 75% | Vue components mounted but route/canonical load absent; browser closes. |
| Cross-boundary integration realism and mock gap | 75% | Store/component contracts pass; GraphQL/read-to-render path absent; fixture browser improves, but real backend remains mocked. |
| Environment/configuration/identity/fixture fidelity | 75% | Contract fixtures in tests, no live browser environment yet; schema-parsed canonical browser fixture improves. |
| Failure/edge/lifecycle/recovery | 90% | Null member and selector/model validation tested; save/browser retry remains to execute. |
| User-surface/browser/desktop-shell | 75% | Mounted DOM only; actual Nuxt browser pending. Shell is not changed or necessary. |
| Durable regression coverage quality | 90% | Seven relevant suites, 65 tests; browser probe update not yet executed. |

Overall post-repository confidence **79.3%** (simple average 555/7). Categories below 90%: first four and user-surface. Critical ACs direct proof: **No** pending actual editor browser journey. Default 95% target: No. Broader-validation decision remains **Required — Browser**, using existing self-starting probe. Real backend GraphQL is intentionally fixture-routed; that gap will be scored after browser result, not hidden.

## Broader execution outcome and final investigation decision
+- Durable browser probe updated at `autobyteus-web/tests/e2e/existing-run-model-config-probe.mjs`: one schema-parsed canonical Team fixture now has a root/coordinator path, distinct nonregistered member path, and null member path. API-E2E-004-B asserts exact fixed/read-only DOM, keyboard immutability, neutral context, no Team workspace picker/false warning/green duplicate; captures the model-only mutation and exact unchanged paths after Save.
+- The first browser command failed before startup due a local fixture typo (`name` outside the member mapper), corrected immediately. The final full browser probe passed six scenarios (API-E2E-004-A–F). Evidence: `evidence/existing-run-model-config/existing-run-model-config-evidence.json`, `API-E2E-004-B-team-saved.png`, `API-E2E-004-C-team-narrow.png`, `nuxt-dev.log`, `evidence-browser-command.log`. No product failure; all owned browser/server/temp-page resources cleaned.
+- Exact changed frontend boundary is now exercised through actual Nuxt/Chrome route, GraphQL response parsing, canonical Team form projection, rendered root/member DOM and model Save round trip. New-Team selector remains covered at actual component/store boundary; Agent Org mounted-Team edit remains covered at projection/component event/draft-patch boundary. Browser probe uses a deterministic GraphQL fixture rather than a real backend saved run, a bounded noncritical limitation because no server/transport contract changed; schema parsing and exact mutation assertions protect the contract shape.
+- Final assessment: direct critical AC proof **Yes** at the material changed/preserved boundaries. No material broader-validation risk remains; actual installed Electron shell is not changed. Final confidence is in `api-e2e-execution-coverage-report.md`. Investigation decision: proceed to **Pass** report; no reroute.
