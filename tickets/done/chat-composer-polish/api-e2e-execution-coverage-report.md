# API/E2E Execution Coverage Report — chat-composer-polish

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/solution-revision-record.md` (SR-003)
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/design-spec.md`
- Supplemental Task Artifacts: None
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/thinking-selector-auto-enable/tickets/in-progress/chat-composer-polish/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: Direct-route implementation handoff (IR-001, commit `3c7ad1ad0`)
- Prior Round Reviewed: None
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Coverage investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. The probe gained a T06 settle-time wait and stronger T03 rendered-state assertions (see ledger events 8–10).
- Existing coverage decisions revised during execution: none
- Reroute required before or during execution: `No`

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded: `Yes` (the probe runs, events 4–11)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: 12 (cleanup)
- Cases still running, interrupted, or not started: none
- Interruption note: none. Intermediate reruns corrected the probe and environment only (events 5, 6, 8, 10). No product case failed.

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| R1 | Pass | 1 | `api-e2e-evidence/R1-focused-vitest.log` | 807/807; the one pre-existing unloadable file is unrelated |
| R2 | Pass (no regression) | 3 | `api-e2e-evidence/R2-full-test-nuxt.log` | Pre-existing/flaky failures only |
| T01–T07 | Pass | 11 | `api-e2e-evidence/probe/chat-composer-polish-evidence.json` + screenshots | — |

## Compatibility / Legacy Scope Check

- Requirements/design introduce or tolerate backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. T01 asserts that the removed two-group menu (`chat-thinking-option-thinking_enabled-*` / `reasoning_effort-*` groups and captions) does not render for a switch-bearing schema.
- Approved persisted-data transition followed: `Yes` (`Not Affected`). T03 shows a real recorded `{thinking_enabled:false, reasoning_effort:'medium'}` run reading as Off in the current form, with no migration or fallback.
- Durable coverage added only for compatibility-only behavior: `No`

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Req / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | All (unit/component) | Adapter, menu model, controls, form, workspace filter/menu | Vitest (jsdom) | Durable | Pass | R1 log |
| R2 | Regression | Whole renderer | Vitest full | Durable | Pass (no regression) | R2 log |
| T01 | BEH-001–004; REQ-001, 001a, 002, 003, 004; AC-001, 004, 005; QR-002; A-1 | `ChatThinkingControl` + `chatThinkingMenu` + adapter + draft store | Browser 1440×900, real Claude SDK catalog | Durable (probe) + Browser | Pass | evidence JSON `cases.T01`; `T01-menu-off-1440.png`, `T01-menu-high-1440.png` |
| T02 | REQ-001; AC-001 (launched config) | Draft → send → created run's recorded `llmConfig` | Browser → backend GraphQL, real Claude SDK run | Durable (probe) + Live | Pass | `cases.T02`; `T02-run-high.png` |
| T03 | REQ-008; AC-010; persisted Off read | `ModelConfigSection.onAdvancedConfig` in the real run-settings form (historical projection path) → save | Browser → backend GraphQL | Durable (probe) + Live | Pass | `cases.T03`; `T03-run-settings-after-edit.png` |
| T04 | AC-006 | Parameters mode on a real non-switch schema | Browser, real Codex catalog (`gpt-5.5`: `reasoning_effort`, `service_tier`) | Durable (probe) + Browser | Pass | `cases.T04` |
| T05 | BEH-005; REQ-005, 006, 009; AC-007, 008; QR-001 | `ChatWorkspaceMenu` + `filterWorkspaceOptions` | Browser 1440×900, 14 real workspaces | Durable (probe) + Browser | Pass | `cases.T05`; `T05-workspace-*.png` |
| T06 | BEH-006; REQ-007; AC-009 | `ChatNewSurface` layout + popover placement | Browser 1440×1000 and 1280×700 | Durable (probe) + Browser | Pass | `cases.T06`; `T06-*.png` |
| T07 | REQ-001a, 005 (narrow) | Bottom-sheet menus | Browser 413×738 | Durable (probe) + Browser | Pass | `cases.T07`; `T07-narrow-workspace.png` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 95% | +10 | AC-001, 004, 005, 006, 007, 008, 010 directly proven in a real browser; AC-001's launched config proven through the backend; AC-009 geometry measured at ~1000/~700px. AC-002/003 proven at the specified unit/component level against the exact server schema shapes. | AC-002/003 not rendered live (no provider keys); the AC-009 final aesthetic is the user's call by design |
| Changed-boundary execution directness | 80% | 96% | +16 | Every changed component driven in real Chrome through the real UI; the form edit goes through the real `ModelConfigAdvanced` select → `onAdvancedConfig` → save | — |
| Cross-boundary integration realism and mock gap | 70% | 95% | +25 | Real backend, real Claude SDK and Codex catalogs, real chat launch, real recorded-config read, real run-settings save (historical projection path) | DeepSeek V4 and Anthropic API catalogs not live |
| Environment, configuration, identity, and fixture fidelity | 75% | 95% | +20 | Owned worktree backend + Nuxt dev on free ports, sanitized env, 14 seeded workspaces, real CLI logins | en-US only; zh-CN strings checked only as present in the locale files |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 94% | +9 | A-1 re-pick edge; empty state; case-insensitive path match; IME Enter guard (synthetic `isComposing` keydown); Escape without a change; query reset; Enter-first-match; open-folder after filtering; persisted Off read | The IME check is a synthetic event, not a real IME; automatic default/sanitize writes not auto-enabling is proven by component spec only |
| User-surface, browser, and desktop-shell confidence | 60% | 95% | +35 | Desktop anchored popovers (thinking w-44 = 176px, workspace w-96 = 384px) inside the viewport at 1440×900/1000 and 1280×700; the workspace list scrolls with 15 options; focus order; narrow bottom sheet; screenshots reviewed | Electron shell not run (no shell change; same renderer) |
| Durable regression coverage quality and relevance | 85% | 95% | +10 | New durable dev-path probe `tests/e2e/chat-composer-polish-probe.mjs` (T01–T07) + script; the IE's 5 new/updated specs | The probe needs local `claude`/`codex` logins for T01–T04 (documented in its header) |

- Overall post-repository confidence: 77%
- Overall final confidence: 95% (simple average: 95+96+95+95+94+95+95 = 665 / 7)
- Calculation method: simple average of the seven categories
- Confidence change produced by broader validation: +18 points
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: AC-002/003 have no live render (unit/component proof matches their specified verification level); a real IME was not used; AC-009's final visual offset remains a user-verification item by requirement.

## Broader Validation Decision And Execution

- Decision and mode: `Required`, `Browser` (TESTING.md dev-path probe) + live API reads
- Material deviation: none
- Gaps addressed: desktop popover geometry, focus and keyboard behavior, real catalog schemas, the draft→launch→recorded config path, the real run-settings form, layout at two heights
- Startup and readiness: `prisma migrate deploy` → `node autobyteus-server-ts/dist/app.js --host 127.0.0.1 --port <free> --data-dir <owned>` (`/rest/health` OK) → `pnpm dev --host 127.0.0.1 --port <free>` with `BACKEND_NODE_BASE_URL` (`/chat` 200) → headless Chrome 154
- Environment choices: sanitized env; SQLite; locale en-US
- Seed data: 14 workspaces under the owned root. Runs are created by the journeys.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| T01 fresh Claude SDK chat | Trigger "Off", muted bulb, draft thinking off | "Off"; bulb class `text-gray-300` (`rgb(179,179,179)`); draft `{thinking_enabled:false, reasoning_effort:'medium'}` | DOM, store | Pass |
| T01 open menu | One list Off · Low · Medium · High · Xhigh · Max; only Off checked; no old groups; anchored inside the viewport | ids `[off, low, medium, high, xhigh, max]`; only `primary-off` has `aria-checked=true`; position absolute, 176px wide, box inside 1440×900; focus on Off | DOM, geometry | Pass |
| T01 pick High | Trigger "High", active bulb, draft on/high; reopen shows only High | "High"; bulb `rgb(93,93,93)`; draft `{true,'high'}`; only High checked | DOM, store | Pass |
| T01 Off → Medium | One-click off; Medium re-enables | Off: `{false,'high'}`, muted; Medium: `{true,'medium'}`, "Medium" | store | Pass |
| T01 A-1 | Stored `{false,'medium'}` + pick Medium → on | `{true,'medium'}`, "Medium" | store | Pass |
| T02 launch at High | Created run records on/high | `getAgentRunResumeConfig.metadataConfig.llmConfig` = `{thinking_enabled:true, reasoning_effort:'high'}`, runtime `claude_agent_sdk`, model `claude-fable-5`; the runtime replied "OK" | GraphQL, DOM | Pass |
| T03 launch Off | Run records Off | `{thinking_enabled:false, reasoning_effort:'medium'}` | GraphQL | Pass |
| T03 run settings (terminated run) | Toggle reads Off | class off; knob offset 0; background `rgb(204,204,204)` | computed style | Pass |
| T03 Advanced effort medium → high | Toggle turns on; effort kept; Save enabled | class on; knob 20px; background `rgb(37,99,235)`; select `high`; Save enabled | computed style, screenshot | Pass |
| T03 save | Run config saved on/high | `{thinking_enabled:true, reasoning_effort:'high'}` | GraphQL | Pass |
| T04 Codex `gpt-5.5` | Parameters mode; a pick changes only `reasoning_effort` | items `reasoning_effort-{low,medium,high,xhigh}`, no primary list; `{reasoning_effort:'medium'}` → `{'low'}`; trigger Medium → Low | DOM, store | Pass |
| T05 open | Search focused, labelled, outside the listbox; 15 options; anchored 384px inside the viewport; list scrolls | all true (box 506,98 → 890,518) | DOM, focus, geometry | Pass |
| T05 "mcps" / "NESTED-DIR" / "temp" / "zzz" | Filter by name; temp hidden; path match case-insensitive; temp shown when it matches; empty state; open-folder visible; heading hidden | `[MCPS-tools, autobyteus_mcps]`, temp hidden; `[lambda-sdk]`; temp listed; "No workspaces match “zzz”", footer visible, no heading | DOM | Pass |
| T05 IME Enter | No pick while composing | menu stays open; selection unchanged | DOM | Pass |
| T05 "notes" keys | ArrowDown → alpha-notes, ArrowDown → notes, ArrowUp → alpha-notes, ArrowUp → input; ArrowDown ×2 + Enter picks notes and closes | exact focus sequence; trigger "notes"; hint "Files are saved in notes · …/workspaces/notes" | focus, DOM | Pass |
| T05 reopen / Escape / Enter-first / open folder | Query reset; Escape keeps the selection; Enter picks the first match; folder form usable from a filtered menu | `''`; "notes" kept; "gamma-api" picked; folder form visible | DOM | Pass |
| T06 1440×1000 | 6vh bias; lower than 14vh; no overlap or overflow; menus inside the viewport | padding 60px; composer top 448 vs 408 (+40px = 4vh); block centre −10px (vs −50px at 14vh); no overlap or overflow; both menus inside | geometry, screenshots | Pass |
| T06 1280×700 | Same at ~700px | padding 42px; +28px (4vh); centre −1px (vs −29px); no overlap or overflow; workspace menu opens above (y 10–424), thinking menu above (202–424), both inside | geometry, screenshots | Pass |
| T07 413×738 | Bottom-sheet merged list; search works | thinking menu fixed, full list; Low → "Low"; "kappa" → `[kappa-cli]`, input focused | DOM | Pass |

## Desktop Application Validation

- Approach: web-equivalent renderer in headless Chrome (TESTING.md: renderer UI → browser dev-path probe). No shell-specific behavior changed.
- Effect on any already-running desktop application: `None`. The user's AutoByteus, another isolated instance and other agents' Nuxt servers were running and were not touched.
- Behavior not directly proven: none material

## Platform / Runtime Targets

- macOS (Darwin 25.5.0, arm64); Node v22.23.1; Nuxt ^3.21; playwright-core ^1.48
- Google Chrome 154.0.8037.58, headless
- Viewports 1440×900, 1440×1000, 1280×700, 413×738; locale en-US

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data exercised: a run recorded with `{thinking_enabled:false, reasoning_effort:'medium'}` (T03). Reopened in the current run-settings form after termination, it reads Off.
- Version-specific runtime branch or fallback observed: `No`
- Residual untested persisted-data risk: none

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/chat-composer-polish-probe.mjs` (T01–T07) | Added | AC-001, 004–010; REQ-001–009; QR-001/002; A-1 | Pass (final run 19:56, ~55 s of cases) | Owned backend + Nuxt dev + Chrome; follows the `chat-entry-live` probe infrastructure. Needs a server build, the contracts `dist/`, and `claude`/`codex` logins (header). |
| `autobyteus-web/package.json` script `test:e2e:chat-composer-polish` | Added | Probe entry point | — | Same convention as other `test:e2e:*` probes |

The IE's durable specs (adapter +3, `chatThinkingMenu` new, `ChatThinkingControl` new, `chatComposerMenus` +1, `ChatWorkspaceMenu` new, `ModelConfigSection` +3) were run unchanged in R1 and remain valid.

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added this round: `Yes`
- Paths added or updated: `autobyteus-web/tests/e2e/chat-composer-polish-probe.mjs` (new, untracked), `autobyteus-web/package.json` (one script line)
- Paths removed: none
- Added paths attached for proportional test-code review: `Not Applicable` (direct low-risk route; attached for Delivery)
- Note: these files are uncommitted in the worktree for Delivery to stage and commit individually.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `tickets/in-progress/chat-composer-polish/api-e2e-evidence/R1-focused-vitest.log` | R1 output | Retained | |
| `tickets/in-progress/chat-composer-polish/api-e2e-evidence/R2-full-test-nuxt.log` | R2 output | Retained | |
| `tickets/in-progress/chat-composer-polish/api-e2e-evidence/probe/chat-composer-polish-evidence.json` | Per-case results + details + cleanup | Retained | Final run |
| `tickets/in-progress/chat-composer-polish/api-e2e-evidence/probe/*.png` | Supporting screenshots (14) | Retained | |
| `tickets/in-progress/chat-composer-polish/api-e2e-evidence/probe/{backend,frontend}.log` | Process logs | Retained | ~2.1 MB total evidence folder; Delivery decides whether to commit it |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `pnpm -C autobyteus-application-sdk-contracts build` | Backend `dist/app.js` imports `@autobyteus/application-sdk-contracts/dist`, missing in this worktree | Backend started | `autobyteus-application-sdk-contracts/dist/` removed after the run (it is untracked, not gitignored) |
| T06 in-page `paddingBottom = '14vh'` override | Measure the pre-change baseline on the same page | +40px / +28px delta | Style reset in the probe |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| IME composition | Synthetic `KeyboardEvent('keydown', {key:'Enter', isComposing:true})` | Headless Chrome has no IME | Low: the guard reads `event.isComposing`, which the synthetic event sets |
| DeepSeek V4 / Anthropic API schemas | Unit/component fixtures matching the server definitions | No provider keys in the owned root | Low: matches the AC-002/003 verification level |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | R1, R2, T01–T07 | All approved behaviors proven. No regressions. |
| Out Of Scope | — | Server passes `reasoning_effort` while thinking is off (unchanged, designer-noted). The thinking control appears ~2 s after page load for a preselected model (catalog load; unchanged code). |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Backend + Nuxt dev processes (4 probe runs) | Owned | SIGTERM of the process groups by the probe | Exited (`SIGTERM`) |
| Claude SDK runs (T02, T03) | Owned | `terminateAgentRun` | Terminated |
| Temp roots `$TMPDIR/chat-composer-polish-*` | Owned | Removed by the probe | None remain |
| Headless Chrome | Owned | `browser.close()` | Closed |
| `autobyteus-application-sdk-contracts/dist/` | Created for this run | `rm -rf` | Removed; `git status` shows only the probe, `package.json` and ticket files |

## Preliminary Classification

N/A (Pass).

## Recommended Recipient

Per `get_handoff_rules` for a direct low-risk `Pass`: expected `/delivery_engineer`.

## Evidence / Notes

- Environment note for Delivery and future runs: this worktree's `autobyteus-application-sdk-contracts` has no `dist/`. Without it the backend cannot start, and the 5 application-related web specs keep failing. It is not caused by this change.
- The Claude SDK catalog did not list `claude-opus-5-5` in the owned backend. The probe fell back to the first switch-bearing model, `claude-fable-5`, with the same schema shape (`thinking_enabled` + effort low…max).

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required`; executed (Browser + live API); passed
- Critical acceptance criteria lacking direct proof: none (AC-009's final aesthetic is user verification by requirement)
- Next recipient from `get_handoff_rules`: see the handoff
- Notes: proportional test-code review `Not Required — direct low-risk route`; classification `Medium` / `Low`
