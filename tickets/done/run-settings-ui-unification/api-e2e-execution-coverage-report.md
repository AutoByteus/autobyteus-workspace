# API/E2E Execution Coverage Report — run-settings-ui-unification

## Execution Round Meta

- Requirements Doc: `requirements-doc.md` (SR-006, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-010, including the addendum: DI-001..DI-006, slices S1–S6)
- Supplemental Task Artifacts:
  - `architecture-handoff.md`, `product-design-request*.md`
  - Product `ui-ux-spec.md` + `visual-references/VIS-001..042` (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/run-settings-ui-unification/`)
- Design Review Report: `design-review-report.md` (ARCH-REV-004 Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-005)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-009, round 5 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- Current Execution Round: 3 (head **`a92004c9e`**, IR-005)
- Trigger: CRR-009, after the CR-005 fix (round-2 F-3)
- Prior Round Reviewed: round 2 (API-REV-002, `Fail`, `83ab477e4`)
- Latest Authoritative Round: 3

All paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification/tickets/in-progress/run-settings-ui-unification/`. Evidence is under `evidence/api-e2e/`.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (Large/High route)

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. Order:
  1. R12/R04, then the rest of `run-settings-live`.
  2. The web suite, then N01–N03.
  3. The probes that exercise the changed model trigger.
  4. The saved-run card with a long model name, at the reviewer's request.
- Existing coverage decisions revised during execution:
  - Added settings-card geometry checks: member drawer rows (R01), Org card and Org member row (R02), saved-run root/member cards running and stopped (R07).
  - Added R13 for VIS-017/023/028/014.
  - Saved-run cards are asserted at the specified widths (880, 804). 390 px is recorded as an observation because the spec's responsive matrix has no phone row for saved-run settings.
- Reroute required before or during execution: `No`

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: seq 39 (R13)
- Cases still running, interrupted, or not started: none

| Case ID | Final Result (round 3) | Evidence | Reconciled Result / Follow-Up |
| --- | --- | --- | --- |
| WEB | Pass (same 11 baseline files; 549 files / 3,629 tests pass) | `web-suite-a92004c9e.log` | — |
| N01–N03 | Pass | `round3-a92004c9e/cross-scope-mentions/` | — |
| R01–R12 | Pass (12/12) | `run-settings-live/` | F-3 resolved |
| R13 | Pass | `run-settings-live-R13/` | Observation O-2 |
| P-POL T01–T07, P-UP U01–U06, P-CE C03/C04/C12/C16 | Pass | `round3-a92004c9e/` | Rerun because IR-005 changed the model trigger |
| A01, P-ERMC, P-FRA, P-AGY, P-CE (rest) | Pass at `83ab477e4` (round 2); IR-005 is a CSS-only change to the model trigger and New chat chips | `round2-83ab477e4/` | Carried forward |
| P-CE C05 | Residual (server, not this ticket) | `round2-83ab477e4/chat-entry-live-subset/` | Separate server ticket candidate |

## Compatibility / Legacy Scope Check

- Requirements/design introduce or tolerate backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. The removed forms and copy are absent; the probes that used them were migrated.
- Approved persisted-data transition followed without unnecessary migration or fallback: `Yes` (server data `Not Affected`)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A

## Changed Boundary And Evidence Matrix

| Case ID | Slice | Behavior / REQ / AC | Changed Boundary | Surface | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| N02 | S4 | REQ-012, AF-009 | Agent first send with mentions → server admission | Live browser + GraphQL | Durable, Live | Pass | `agent_team /product_team` admitted; briefing |
| N03 | S4 | REQ-011/012, DI-002 | Team `@` list vs server rule; team-root admission | same | Durable, Live | Pass | Excludes the team, its members, built-ins and the Org |
| R01 | S1/S5/S6 | AC-004/006/019 | Team member override → `memberConfigs`; drawer row geometry | same | Durable, Live | Pass | drafter `codex_app_server/gpt-5.6-luna {medium, fast}` auto false; others inherit; drawer row clean at 880/804/390 |
| R11 | S1 | DI-001 | Chat nav / pencil → fresh New chat | same | Durable, Live | Pass | — |
| R09 | S5 | AC-019 | Fast + Thinking → agent run `llmConfig` | same | Durable, Live | Pass | `{reasoning_effort: low, service_tier: fast}`, independent toggles |
| R12 | S6 | REQ-001/022, VIS-020/021/027 | New chat footer with a long Codex label | DOM geometry 1512/880/804/390 | Durable, Browser | Pass | No overlaps; label truncates ("GPT-5.6-Luna (default… C…") |
| R13 | S6 | AC-017, REQ-022, UIS-004 | Start-surface tools; Org Fast mode row; Org unavailable | Live | Durable, Browser | Pass | Tools docked with Files/Terminal; "Fast mode" row; spec unavailable copy + "Back to Agent Orgs"; Org card geometry clean |
| R04 | S1 | AC-008, REQ-013/022, VIS-042 | Agent "+" host and collaborator | Live | Durable, Live | Pass | Model name + "Low" + Fast chips; copy launches `{low, fast}`; collaborator "+" → Scout; footer clean |
| R05 | S1 | AC-008, REQ-022 | Team "+" member summary | Live | Durable, Live | Pass | "… · Codex · Fast · Ask first" without opening the row |
| R02 | S2/S6 | AC-003 | Org page → Org run config; Org card and member row geometry | Live | Durable, Live | Pass | Root haiku; Scout Codex Ask first; docs team on its folder; geometry clean |
| R03 | S2 | AC-003 failure | Server rejection | Live | Durable, Live | Pass | Spec copy; values kept; Run enabled |
| R06 | S2 | AC-008 | Org "+" | Live | Durable, Live | Pass | Overrides and workspace copied |
| R07 | S3/S5/S6 | AC-009..011/019 | Saved Team: locks, stop, locked menu, Cancel/Save, resume; card geometry with a long Codex model | Live | Durable, Live | Pass | Readback identical after resume; root/member cards clean at 880/804 (running and stopped) |
| R08 | S3 | AC-009/010 | Saved Org stop + save | Live | Durable, Live | Pass | — |
| R10 | S1/S2 | DI-004, AC-002 | Readiness on copies with a disabled runtime | Live, backend restarted without Codex | Durable, Live | Pass | Send/Run disabled: "Codex App Server is unavailable. Choose another runtime." |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm test:nuxt --run` | `autobyteus-web` @ `a92004c9e` | Full web suite | Pass vs baseline | `web-suite-a92004c9e.log` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final (round 3) | Change vs round 2 (92%) | Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 60% | 96% | +6 | Every AC directly proven: server readback, DOM and geometry | VIS states without live capture (below), covered by component specs or the mocked saved-run probe |
| Changed-boundary execution directness | 55% | 96% | +1 | Launch inputs read back; geometry measured | — |
| Cross-boundary integration realism and mock gap | 50% | 95% | 0 | Real backend, Claude SDK, Codex, AGY | — |
| Environment, configuration, identity, and fixture fidelity | 60% | 94% | +2 | Owned real stacks; harnesses hardened | The Codex catalog varies by machine (no `gpt-5.5` here); C05 server residual |
| Failure, edge-case, lifecycle, and recovery evidence | 65% | 95% | 0 | Server rejection, stop/resume, disabled runtime, failed first send, Org unavailable | — |
| User-surface, browser, and desktop-shell confidence | 60% | 93% | +11 | F-3 fixed and asserted at 4 widths; card geometry; VIS-014/017/023/028 added | Observations O-1 (saved-run at 390) and O-2 (unknown-Org heading), outside the approved spec |
| Durable regression coverage quality and relevance | 75% | 96% | +1 | `run-settings-live` R01–R13 with geometry checks; migrated probes green | — |

- Overall post-repository confidence: 61%
- Overall final confidence: **95%** (simple average 95.0)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: O-1, O-2, C05 server residual, uncaptured VIS states (below).

## Broader Validation Decision And Execution

- Decision and selected execution mode: `Required`; Browser + Live API through the live dev-path probes (owned real stacks).
- Material deviation: none.
- Environment choices:
  - Claude SDK `haiku`; Codex `gpt-5.6-luna`, whose long display name "GPT-5.6-Luna (default reasoning: medium)" exercises the truncation.
  - R10 restarts the owned backend with Codex unavailable.

### Prior Failure Resolution

| Prior Failure | Round-3 Result | Evidence |
| --- | --- | --- |
| F-3 (R12, R04: footer overlap at 804/880) | **Resolved** | R12 `footer` geometry clean at 1512/880/804/390; `R12-footer-804.png`, `R12-footer-880.png` |
| F-1 (CR-004), F-2, probe maintenance | Remain resolved | R04/R05/R10 pass; A01 and the probes pass (round 2/3) |

### Reviewer Request: Saved-Run Card With A Long Model Name

- R07 measures the saved-run root card and the Codex member card (`gpt-5.6-luna`, "GPT-5.6-Luna (default reasoning: medium)"), both running (locked) and stopped (editable). No overlap and nothing outside the card at 880 and 804 px.
- The stopped capture (`VIS-026-saved-run-stopped-fast-editable-880.png`) shows the label truncating inside the card next to the runtime and chevron.

### Observations (not failures; outside the approved spec)

- **O-1, saved-run settings at a 390 px window.** The workspace layout gives the saved-run panel a card about 225 px wide. The locked value spans then run past the card's right edge by up to 19 px:
  - root "Auto-approve 🔒": 187–326 vs card 83–307;
  - member "Medium 🔒" and "Ask first 🔒": 223–329 vs card 119–311.

  This also happens with the short Claude root, so it is not caused by the long name. The spec's responsive matrix covers New chat, the drawer and the Org card at < `sm`, not saved-run settings (UIS-003 is specified at 880 via VIS-006..009). The desktop window has no minimum width, so it is reachable. Evidence: `run-settings-live/R07-saved-run-running-long-model-390.png`. A product decision is needed on whether saved-run settings must fit at phone widths (a `Requirement Gap` candidate).
- **O-2, unavailable Org with an unknown or deleted definition.** The page shows the spec copy and "Back to Agent Orgs", but the heading switcher is empty (chevron only). VIS-014 shows a known Org's name. The real triggers are a stale link or an Org deleted elsewhere. Evidence: `run-settings-live-R13/VIS-014-org-launch-unavailable-1512.png`. `Unclear`, low.
- **O-3, singular copy.** "All 1 members use these settings" (round 1).

### Residuals (not attributed to this ticket)

- **C05, `chat-entry-live`.** The migrated live-lock assertions pass. The probe's oracle query `providerModelCatalogSnapshots(codex)` then fails server-side: "Codex client generation … has unresolved cleanup". CRR-008 confirms it is not this ticket's. It is a candidate for a separate server ticket.
- **CRR-007 Send-timing residual.** Not observed in the normal flow.
- **VIS states without live capture:**
  - 022/029: no Codex model with only other settings exists in this catalog.
  - 031: no-model state; definition defaults always resolve a model here.
  - 032/034/037/038: transient states.
  - 036: Org tools open.
  - 039–041: covered by the mocked `existing-run-model-config` probe and component specs.

## Desktop Application Validation

- Validation approach: browser dev-path (web-equivalent renderer) against a real backend, per TESTING.md.
- Shell-specific behavior: none changed.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven: packaged shell, which was not changed.

## Platform / Runtime Targets

- macOS (Darwin 25.5.0); Node 22.23.1; Google Chrome headless (playwright-core).
- Runtimes: Claude Agent SDK, Codex App Server, AGY.
- Viewports: 1512, 880, 804, 390.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`.
- Exercised: saved runs stopped, saved and resumed; backend restart (R10).
- Version-specific runtime branch or compatibility fallback observed: `No`.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed: `Yes` (cumulative rounds 1–3)

| Path / Test | Change | Requirement / Boundary | Execution Result (latest) |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/run-settings-live-probe.mjs` | Added | R01–R13: S1/S2/S3/S5/S6, DI-001, DI-004, footer and settings-card geometry | 13/13 Pass @ `a92004c9e` |
| `autobyteus-web/package.json` | Updated | Script `test:e2e:run-settings-live` | — |
| `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` | Updated | N02/N03 (AF-009, DI-002); `openRuntimeList`; A01 F-04 aligned with base | N01–N03 Pass (r3); A01 Pass (r2) |
| `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` | Updated | C05/C06/C08/C16/C18 migrated (REQ-004/005/017/018, AR-003); `openRuntimeList`; C03 producer order | Pass except the C05 server residual |
| `autobyteus-web/tests/e2e/chat-composer-menus-open-upward-probe.mjs` | Updated | VIS-001 heading reference; anchor inside the composer (VIS-030); `openRuntimeList`; U03 re-hover | 6/6 Pass (r3) |
| `autobyteus-web/tests/e2e/chat-composer-polish-probe.mjs` | Updated | `openRuntimeList` | 7/7 Pass (r3) |
| `autobyteus-web/tests/e2e/fresh-run-auto-approval-probe.mjs` | Updated | One retry only after a recorded Nuxt dependency reload; the failed attempt is kept | 8/8 Pass (r2) |

- Added or updated paths attached for proportional test-code review: `Yes`
- Removed paths: none

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `evidence/api-e2e/run-settings-live/` | Round-3 authoritative run (R01–R12), VIS shots, geometry | Retained | — |
| `evidence/api-e2e/run-settings-live-R13/` | R13 run | Retained | — |
| `evidence/api-e2e/round3-a92004c9e/` | N01–N03, polish, menus, chat-entry subset | Retained | — |
| `evidence/api-e2e/run-settings-live-round{1,2}-*`, `round2-83ab477e4/`, round-1 folders | History | Retained | — |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `/tmp/rsui-r07`, `/tmp/rsui-r13` (single-case runs) | Isolate the R07 390 px geometry; develop R13 | Measured; recorded | Removed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Uninstalled Codex (R10) | Owned backend restart with `CODEX_APP_SERVER_COMMAND` → missing path | Cannot uninstall the user's CLI | None material |
| Org launch rejection (R03) | Member definition deleted between page load and Run | Realistic concurrent-change trigger | — |
| Failed first send (C07/C18) | Routed GraphQL error for `prepareAgentRun` | Existing probe method | — |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | WEB, N01–N03, R01–R13, A01, polish, menus, ERMC, FRA, AGY, `chat-entry-live` (except C05) | All requirements proven against a real server; F-1 and F-3 resolved |
| Out Of Scope | `chat-entry-live` C05 oracle query | Pre-existing server residual |
| Observation | O-1, O-2, O-3 | Outside the approved spec; for product/review decision |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe backends, Nuxt, Chrome; temp roots | Owned by the probes | Process-group SIGTERM; temp roots removed | No leftover processes or temp roots |
| `/tmp/rsui-*` scratch | Owned | Removed | Removed |
| Pre-existing servers and temp dirs | Not owned | None | Untouched |

## Preliminary Classification

- N/A (`Pass`). O-1 is a `Requirement Gap` candidate (saved-run settings at phone widths) and O-2 is `Unclear`; both are for the reviewer or product to decide and do not block.

## Latest Authoritative Result

- Result: **`Pass`**
- Final validation confidence: **95%**
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required`, executed.
- Critical acceptance criteria lacking direct proof: none.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (proportional test-code review).
- Slice results: S1 Pass, S2 Pass, S3 Pass, S4 Pass, S5 Pass, S6 Pass (with observations O-1/O-2).
