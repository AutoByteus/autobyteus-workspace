# API/E2E Execution Coverage Report — New chat Draft rows under the Chat row

`<T>` = `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/tickets/in-progress/chat-new-draft-kept-on-navigation`. `<E>` = `<T>/api-e2e-evidence`.

## Execution Round Meta

- Requirements Doc: `<T>/requirements-doc.md` (Approved, SR-004)
- Investigation Notes: `<T>/investigation-notes.md`
- Solution Revision Record: `<T>/solution-revision-record.md`
- Design Spec (required on every route): `<T>/design-spec.md` (SR-005)
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/chat-new-draft-kept-on-navigation/ui-ux-spec.md` + `visual-references/VIS-001..008`; `<T>/product-design-request.md`; `<T>/handoff-architecture-design-complete.md`
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `<T>/implementation-handoff.md`
- Implementation Revision Record: `<T>/implementation-revision-record.md` (IR-001, IR-002)
- Code Review Report: `<T>/code-review-report.md` (CRR-001: failure-origin review of F-001; no test-code review on the direct route)
- Code Review Revision Record: `<T>/code-review-revision-record.md`
- Coverage Investigation: `<T>/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `<T>/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `<T>/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: 2
- Trigger: Local Fix for F-001, IR-002, commit `9e902002d`
- Prior Round Reviewed: round 1 (API-REV-001: Fail, F-001; `<E>/live-run-3`)
- Latest Authoritative Round: 2 (`<E>/live-run-4`, 15/15 Pass)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Coverage investigation artifact: `<T>/api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. The probe gained case D00 (a seed send that creates the run to visit), and the ledger IDs are D00–D14.
- Existing coverage decisions revised during execution: none.
- Reroute required before or during execution: `No`
- Notes: debug runs (`/tmp/cdr-run1..4`) were used only to fix the probe itself. Their probe-side defects were:
  - computed colours checked against hard-coded rgb values (the theme's grays differ, so the probe now reads the Tailwind tokens in-page);
  - Pinia setup-store state not exposing the computed `drafts`;
  - a skill not owned by the CONFIGURED agent;
  - injection order;
  - Vue TransitionGroup's internal move-probe clone counted as a row;
  - CDP touch;
  - the strip tooltip counted as an indicator.

  None of these were product defects.

## Test-Case Ledger Reconciliation (When Applicable)

- Ledger path: `<T>/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes` (the probe appends Started/Completed rows per case)
- Long-running case checkpoints recorded when needed: `Yes` (run-level checkpoints between live runs and rounds)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: D14 Completed (live-run-4, round 2)
- Cases still running, interrupted, or not started: none
- Rerun notes:
  - Round 1, live-run-1: D11 failed on a probe assertion (the strip tooltip). The probe was fixed.
  - Round 1, live-run-2: 15/15 Pass.
  - Round 1, `send-row-sampling`: measured F-001.
  - Round 1, live-run-3: 13 Pass / 2 Fail (D00, D07 = F-001).
  - Round 2 on IR-002 `9e902002d`, live-run-4 (authoritative): 15/15 Pass, with D09 strengthened by an in-flight TR-004 assertion.

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| D00 | Pass | Completed (live-run-4) | `<E>/live-run-4/chat-draft-rows-live-evidence.json` | F-001 resolved. The row keeps its text for 341 ms until the run opens; no "Empty draft". |
| D01 | Pass | Completed (live-run-4) | same | — |
| D02 | Pass | Completed (live-run-4) | same; `VIS-002…`, `VIS-004…` png | — |
| D03 | Pass | Completed (live-run-4) | same | — |
| D04 | Pass | Completed (live-run-4) | same | — |
| D05 | Pass | Completed (live-run-4) | same; `VIS-005…` png | — |
| D06 | Pass | Completed (live-run-4) | same; `D06-agent-pre-registration-failure.png` | Rechecked after IR-002: the failed send returns to its typed text and all fields are intact |
| D07 | Pass | Completed (live-run-4) | same | F-001 resolved for the agent send (text kept until navigation at 721 ms). All post-send checks ran and passed. |
| D08 | Pass | Completed (live-run-4) | same; `D08-…temp-run.png` | — |
| D09 | Pass | Completed (live-run-4) | same | The sent row keeps its text, unselected, while Q is open, and leaves when the launch finishes |
| D10 | Pass | Completed (live-run-4) | same | — |
| D11 | Pass | Completed (live-run-4) | same; `VIS-003/006/007…` png | — |
| D12 | Pass | Completed (live-run-4) | same; `VIS-008…`, `D12-after-row-tap…` png | — |
| D13 | Pass | Completed (live-run-4) | same | — |
| D14 | Pass | Completed (live-run-4) | same; `D14-zh-CN-empty-draft.png` | — |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
  - The single-draft ref and the post-launch `startNewChat` are gone, and there is no mode switch.
  - IR-002's `sentText` is a session-only field, set only while starting.
- Approved persisted-data transition followed: `Yes` (`Not Affected`). D13 found no draft text in localStorage, sessionStorage or IndexedDB.
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

All results are from live-run-4, round 2.

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| D00 | REQ-006, AC-005, TR-004 | launch → finishSentDraft; row during send | Real stack, Codex | Durable, Browser, Live | Pass | Samples: preview kept until `/chat?id=…` at 341 ms, then removed. The row is gone after the send. |
| D01 | REQ-001, REQ-004, AC-001 alt, AC-003 alt, VIS-001 | has-text rule; leave rule | Browser | Durable, Browser | Pass | No row for a real upload, `/probe-no` with the menu open, a `/probe-notes` chip, or an approval toggle. The pencil drops the textless draft and its attachment. |
| D02 | REQ-001..003, AC-001, AC-002, VIS-002/004 | row at the first character; re-entry; composer key | Browser, real upload | Durable, Browser | Pass | Row "T" appears selected; the Chat row is not; × visible. After a run visit, every field is equal: Probe Team, text, image loaded, team-folder, Ask first, GPT-5.6-Luna, High, "1 of 2 customized", writer "Customized · Auto-approve". Caret in the box. |
| D03 | REQ-002, REQ-003, AC-002 | agent re-entry incl. skill chip + `@` mention | Browser | Durable, Browser | Pass | Probe Helper, `/probe-notes` chip, `@Probe Writer`, image loaded, GPT-5.6-Sol, Low. Editing does not reorder. |
| D04 | REQ-004, REQ-005, AC-003, AC-004 | `install()` via every start | Browser | Durable, Browser | Pass | Chat, pencil, Agents Run, Teams Run, run header + and tree + each open a fresh New chat for the right target. Both drafts are kept; the store holds 2 listed + 1 blank; the Chat row is selected. |
| D05 | REQ-008, AC-007, RU-3 | listed lifecycle; retarget | Browser | Durable, Browser | Pass | Retarget keeps the id and text. "Empty draft" is italic, `gray-400`, selected, × visible. Typing again restores the preview. Dropped after opening a row, Chat, or another page. |
| D06 | REQ-006 alt, RU-4 | a failure keeps the draft (incl. IR-002 `clearStarting`) | Browser + injected GraphQL error | Durable, Browser | Pass | Team `CreateAgentTeamRun` error and agent `CreateWorkspace` error: the route stays `/chat`, the row stays selected, and all fields are equal. Toasts: "Injected launch failure (probe)" and "The selected workspace could not be opened." |
| D07 | REQ-006, AC-005, RU-2, TR-004 | real sends from re-entered drafts | Real stack, Codex | Durable, Live | Pass | The Team row keeps its text until `/workspace` (1801 ms), then goes; the image is finalized under `/rest/team-runs/…`. The agent row keeps its text until its run opens (721 ms). The agent run has the skill prefix, text, mention, `gpt-5.6-sol` with `reasoning_effort: low`, the agent-folder workspace and probe-helper; the image is finalized under `/rest/runs/…`. |
| D08 | REQ-006 design mapping | post-registration failure | Browser + injected `prepareAgentRun` error | Durable, Browser | Pass | `/chat?id=temp-…`. The error and the message are in the temp run. The row is gone; the bystander row is kept and unselected. |
| D09 | DS-005, RU-1, TR-004 | another draft opened while a send is in flight | Browser + `prepareAgentRun` held 6 s | Durable, Live | Pass | During the send the rows read [sent text, Q]. Q opens; the sent row keeps its text, unselected. The launch lands in its run and only the sent row goes. Back → `/chat` shows Q selected. |
| D10 | REQ-007, AC-006, QR-001 | discard + focus | Browser | Durable, Browser | Pass | × opacity is 0 at rest and 1 on hover or keyboard focus. Focus goes to the next row, else the previous row, else Chat, and is still there after 1.2 s. No dialog. 150 ms ease-out leave. |
| D11 | REQ-002, REQ-009, REQ-010, AC-008, AC-009, VIS-003/006/007 | geometry, motion, a11y, strip | Browser 800×738 | Durable, Browser | Pass | 7 rows, newest first. Each row is 32 px, its text aligned with the Chat label, with 2 px / 1 px gaps, 13/20 px type, radius 6 px, and one line with an ellipsis. × is 24×24, 6 px from the right edge, centred. Colours match the tokens. The section scrolls and resizes. Tab order is correct, with an indigo-500 2 px inset focus ring. Motion is 0.15 s ease-out, and 0 s under reduced motion. Typing re-creates no row. The strip is unchanged and clicking it reopens the panel. |
| D12 | REQ-010, TR-010, VIS-008 | drawer | Browser 390×844, CDP touch + `hover:none` | Durable, Browser | Pass | Every × is at opacity 1. A real touch tap opens the draft and closes the drawer. |
| D13 | REQ-011, AC-010 | session-only | Browser reload | Durable, Browser | Pass | No rows; a blank New chat; no draft text in storage. |
| D14 | REQ-010 (zh-CN) | catalogs | Browser, `zh-CN` context | Durable, Browser | Pass | 草稿 / "草稿: 你好草稿 — Daily Assistant" / 丢弃草稿 / 空草稿 |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 4 | `pnpm -C autobyteus-web test:nuxt --run` (full, round 1) | worktree root | Regression | Pass apart from the known baseline: 10 files / 34 tests fail, all in the base `cfeda548b` list, none in the changed files | `<E>/web-full-suite.log` |
| 5 | Focused web tests (store, launch, useRunStart, AppLeftPanel ×2, `components/chat`, chat page, workspace-history-draft-send, localization), round 2 | worktree root @ `9e902002d` | IR-002 store/rows tests | Pass (32 files / 165 tests) | console |
| 6 | `pnpm -C autobyteus-web test:nuxt --run` (full, round 2) | worktree root @ `9e902002d` | Regression | Pass apart from the same 10 baseline files / 34 tests; 3783 pass (+3 IR-002 tests) | `<E>/web-full-suite-round2.log` |
| 7 | `pnpm -C autobyteus-web test:e2e:chat-draft-rows-live --output-dir <E>/live-run-4 --ledger-file <T>/api-e2e-test-case-ledger.md` | worktree root @ `9e902002d`; server dist rebuilt from the worktree (server unchanged since) | All journeys incl. TR-004 | Pass (15/15) | `<E>/live-run-4/`, `<E>/live-run-4.console.log` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 95% | +20 | AC-001..010 and TR-004 all proven live on the real stack | Negligible |
| Changed-boundary execution directness | 75% | 95% | +20 | Real left panel, composer, router, launch and upload | — |
| Cross-boundary integration realism and mock gap | 60% | 95% | +35 | Real backend and Codex; real upload and finalize; real promotion | Only failure triggers are injected (see the next row) |
| Environment, configuration, identity, and fixture fidelity | 70% | 95% | +25 | Owned SQLite/data root, current dist, Nuxt dev, Chrome 154 | — |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 95% | +20 | Team, pre-registration, post-registration and in-flight cases; reload. Each fault is injected as a GraphQL error response, so the real client code under test (launch throw → `clearStarting` → draft kept) runs end to end. | Server-side fault causes are not reproduced. They are outside the changed boundary and use the same response shape. |
| User-surface, browser, and desktop-shell confidence | 40% | 95% | +55 | VIS-001..008 geometry, tokens, motion, drawer, a11y, zh-CN; TR-004 row behavior during sends | Packaged Electron shell not run (unchanged, web-equivalent renderer) |
| Durable regression coverage quality and relevance | 85% | 95% | +10 | 15-case live probe incl. TR-004 and in-flight assertions; IR-002 unit tests | The probe needs a logged-in runtime CLI |

- Overall post-repository confidence: 69%
- Overall final confidence: 95%
- Calculation method: simple average of the seven categories
- Confidence change produced by broader validation: +26 points
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: none material. The Electron shell is unchanged and was not run.

## Broader Validation Decision And Execution

- Decision and selected execution mode: `Required`, Browser on the real local stack (owned)
- Material deviation from the planned mode or rationale: none
- Confidence gap or residual risk actually addressed: every render, journey and send gap, and F-001's fix
- Startup order, commands, and readiness results:
  1. `pnpm -C autobyteus-server-ts prebuild && build` (exit 0, `<E>/server-build.log`).
  2. The probe:
     - creates an owned temp root and runs `prisma migrate deploy`;
     - starts `node dist/app.js --data-dir <owned>` (`/rest/health` OK);
     - creates the `Probe Team` via GraphQL;
     - starts `pnpm dev` (`/chat` 200);
     - launches headless Chrome.
- Environment choices that materially affected the run:
  - runtime `codex_app_server` (the logged-in local Codex CLI), models `gpt-5.6-luna` / `gpt-5.6-sol`;
  - journeys at 1280×800; VIS captures at 800×738 and 390×844, DPR 2.
- Seed data, fixtures, identities:
  - agents `probe-helper` (owns skill `probe-notes`) and `probe-writer`;
  - team `probe-team` (lead / writer);
  - two generated PNGs;
  - no accounts.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| SCN-001 Team / Agent re-entry | Identical fields; row selected | Identical, incl. image, member customization, chips, mention and caret | D02, D03 | Pass |
| SCN-002 starts | Fresh New chat; drafts kept | As expected at all 6 entry points | D04 | Pass |
| SCN-003 send | Run opens; the row keeps its text and fades out (TR-004) | As expected for Agent and Team; other rows kept | D00, D07, D09 | Pass |
| SCN-003 failures | Stay on New chat with the draft | Kept, with today's toast | D06, D08 | Pass |
| SCN-004 discard | No dialog; focus rule | As expected | D10 | Pass |
| SCN-005 Empty draft | Shown until the draft is left | As expected | D05 | Pass |
| VIS / a11y / motion / drawer / strip / reload / zh-CN | Per spec | As expected | D11–D14 | Pass |

### F-001 (round 1, resolved in round 2)

- **Finding:** on an agent send, the sent row read "Empty draft" before the run opened: 293 ms and 201 ms, and the whole send when it was held. This happened because `localUserSubmission` clears the draft context at send start.
- **Review and fix:** confirmed by Code Review CRR-001. Fixed in IR-002 (`9e902002d`): `ChatDraft.sentText` is set by `markStarting` and reset by `clearStarting`, and `chatDraftText` is the single text source.
- **Recheck (live-run-4):** no "Empty draft" sample in D00, D07 (agent and team) or D09. The failed-send paths in D06 still return the draft to its typed text.

## Desktop Application Validation (When Applicable)

- Validation approach executed: web-equivalent renderer through the project's browser dev-path probe (TESTING.md: "Renderer UI … → Web unit tests + a browser dev-path probe").
- Shell-specific or lifecycle behavior: none changed. No Electron run.
- Effect on any already-running desktop application: `None`. Only owned ports, data roots and Chrome were used; the user's app and `~/.autobyteus` were untouched.
- Behavior not directly proven: the packaged Electron window (unchanged shell). No confidence consequence.

## Platform / Runtime Targets

- Operating system / platform: macOS (Darwin 25.5.0)
- Runtime:
  - Node 22.23.1;
  - Nuxt dev (autobyteus-web @ `9e902002d`);
  - server `dist` rebuilt from the worktree;
  - Codex App Server via the local CLI.
- Browser: Google Chrome 154.0.8037.98 headless via playwright-core
- Viewports and settings:
  - 1280×800, 800×738, and 390×844 with touch / `hover: none` / `pointer: coarse`;
  - reduced motion;
  - locales `en-US` and `zh-CN`.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data exercised: N/A
- Result: a reload drops all drafts, and no draft text appears in browser storage (D13).
- Version-specific runtime branch or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed: `Yes`

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/chat-draft-rows-live-probe.mjs` | Added (round 1); updated in round 2 with D09's in-flight TR-004 assertion | SCN-001..005, AC-001..010, VIS-001..008, TR-004, zh-CN (cases D00–D14) | 15/15 Pass (live-run-4) |
| `autobyteus-web/package.json` script `test:e2e:chat-draft-rows-live` | Added | Entry point | Used for all runs |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct Medium/Low route; test-review decision `Not Required — direct low-risk route`)
- Removed paths: none
- Docs: the probe has no `TESTING.md` entry yet; that is left for Delivery's docs sync. Usage and prerequisites are in the probe header.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `<E>/live-run-4/` | Authoritative round-2 evidence: JSON, VIS screenshots, logs | Retained | — |
| `<E>/live-run-3/`, `<E>/send-row-sampling/` | Round-1 F-001 evidence | Retained | History |
| `<E>/live-run-1/`, `<E>/live-run-2/` | Round-1 runs | Retained | History |
| `<E>/web-full-suite.log`, `<E>/web-full-suite-round2.log`, `<E>/server-build.log` | Repository runs | Retained | — |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `--serve-only` stack and a CDP-attached exploration Chrome (`/tmp/cdr-explore`) | Selector discovery | The selectors used in the probe | Exploration Chrome stopped and its profile removed; the stack ended with its temp root removed |
| Debug runs `/tmp/cdr-run1..4` | Probe debugging | Probe fixes only | Each run removed its own temp root; ports free |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Backend failures (D06, D08) | `page.route` returns a GraphQL error for one `CreateAgentTeamRun` / `CreateWorkspace` / `prepareAgentRun` | Real backend faults can't be produced on demand | The real client failure paths run; server fault causes are not reproduced |
| Slow first send (D09) | `page.route` holds `prepareAgentRun` 6 s, then forwards it to the real backend | Deterministic in-flight window | Timing only |
| Touch device (D12) | CDP touch emulation + `hover:none` media | No physical device | Not a real phone |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | D00–D14 | All journeys, sends, failures, visuals, a11y, motion, drawer, reload and zh-CN. F-001 is resolved. |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Backend and Nuxt process groups (every run) | Probe-owned | SIGTERM | Exited; both ports free (`portsFree` in each evidence file) |
| Owned temp data roots (`$TMPDIR/chat-draft-rows-live-*`) | Probe-owned | `fs.rm` | Removed (`cleanup` in each evidence file); none remain |
| Headless Chrome | Probe-owned | `browser.close()` | Closed |
| Exploration Chrome (PID 11227) and its profile | API/E2E-owned | kill + rm | Stopped and removed |
| Server/SDK `dist` rebuild outputs (`autobyteus-application-*-sdk*/dist`) | Untracked build output | Left in place for reruns | Not staged. Delivery must not `git add -A`. |

## Preliminary Classification

N/A. The round-2 result is `Pass`. Round 1's F-001 was `Local Fix` → implementation_engineer (confirmed by CRR-001) and is resolved.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required`, executed (Browser on the real stack, live-run-4)
- Critical acceptance criteria lacking direct proof: none
- Test-review decision: `Not Required — direct low-risk route` (Medium / Low)
- Next recipient from `get_handoff_rules`: `/delivery_engineer`
- Notes:
  - Out-of-scope observation, not caused by this change: at an 800 px viewport the New chat model menu's runtime flyout opens under the left panel, which intercepts clicks on it.
  - The probe's `TESTING.md` entry is for Delivery's docs sync.
