# API/E2E Execution Coverage Report — chat-composer-menus-open-upward

Ticket folder `T` = `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/tickets/in-progress/chat-composer-menus-open-upward`
Evidence folder `E` = `T/api-e2e-evidence`

## Execution Round Meta

- Requirements Doc: `T/requirements-doc.md` (Approved)
- Investigation Notes: `T/investigation-notes.md`
- Solution Revision Record: `T/solution-revision-record.md` (SR-004)
- Design Spec (required on every route): `T/design-spec.md`
- Supplemental Task Artifacts: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-composer-menus-open-upward/ui-ux-spec.md`; visual references `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-composer-menus-open-upward/visual-references/`; `T/handoff-architecture-design-complete.md`
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `T/implementation-handoff.md`
- Implementation Revision Record: `T/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- Coverage Investigation: `T/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `T/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `T/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: `Implementation Complete`, IR-001 (SR-004), commit `67c9e2e5f`
- Prior Round Reviewed: none exists
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Coverage investigation artifact: `T/api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`, with two recorded changes: U04 became a deterministic very-short-window case instead of depending on a particular model, and U03 checks every enabled runtime's flyout
- Existing coverage decisions revised during execution, with evidence: none. T06 was confirmed stale by the negative control (base padding 40 / 6vh) and updated as planned.
- Reroute required before or during execution: `No`
- Notes: run 1 of the new probe had two failures caused by the probe's own expectations (ledger event 4). They were corrected before the authoritative runs. No product case failed.

## Test-Case Ledger Reconciliation (When Applicable)

- Ledger path: `T/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded when needed: `Yes`
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: 14 (cleanup)
- Cases still running, interrupted, or not started: none
- Interruption, context-compression, or rerun note: none

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| R1 | Pass | 1 | `E/R1-focused-vitest.log` | 82/82 |
| R2 | Pass | 3 | `E/R2-full-test-nuxt.log`, `E/R2b-rerun-after-sdk-build.log` | Only pre-existing, unrelated failures remain (4 files) |
| U01 | Pass | 13 | `E/menus-open-upward/chat-composer-menus-open-upward-evidence.json` | — |
| U02 | Pass | 13 | same | — |
| U03 | Pass | 13 | same | — |
| U04 | Pass | 13 | same | OBS-1 recorded |
| U05 | Pass | 13 | same | — |
| U06 | Pass | 13 | same | — |
| N01 | Pass (control failed on base as intended) | 11 | `E/negative-control-base-source/chat-composer-menus-open-upward-evidence.json` | Source restored; `git diff HEAD` clean for source |
| T01–T07 | Pass | 12 | `E/polish-probe/chat-composer-polish-evidence.json` | T06 updated |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (`flyoutOffset` is gone; `auto` is the live policy of the running-conversation menu, not a fallback)
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `N/A` (not affected)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| U01 | REQ-002, AC-003, VIS-001, VIS-007 | `ChatNewSurface` padding | Headless Chrome → owned Nuxt dev → owned backend | Durable, Browser | Pass | Padding 14vh / 40px at all four sizes; heading top 378.6 at 1512x952 (ref 379) and 246.4 at 1280x720 (ref 246); 55.2 / 32 / 12 / 4 px lower than with the old padding (= 10vh − 40px); hint 10px under the composer; no overflow |
| U02 | REQ-001, REQ-003, REQ-004, AC-001, AC-004, AC-005, VIS-002/003/007/008 | `ChatMessageInput` + `useAnchoredPopover` (`above`, measured from the composer card) | same | Durable, Browser | Pass | `@` and `/`: 175.6–475.6 (card 480.6); 43.4–343.4 (348.4); 17.4–229.4 (234.4, max 212px; ref 17–229); 17.8–183.8 (188.8, max 166px; spec 166). 6px gap to the card's padding edge, hint uncovered, header and footer inside, list scrolls to the last row, last row clickable. ArrowDown, Escape, outside click, choosing a skill and an agent work |
| U03 | REQ-001, REQ-003, REQ-004, AC-002, AC-004, VIS-004–006 | `ChatWorkspaceMenu`, `ChatModelMenu` (+ flyout), `ChatThinkingControl` | same, real runtime catalogs | Durable, Browser | Pass | Workspace max 420/420/335/289px, Model 360/360/335/289px, Thinking 240px (221.5px tall); all above with a 6px gap, top ≥ 16. All five runtime flyouts `bottom: -5px`, bottom = row bottom + 5, top ≥ 12, list max = rule (AutoByteus 320/317/203/157px), lists scroll to the last model. 66 model search results scroll inside the menu. Search focus on open; model pick through the flyout; Thinking Escape returns focus |
| U04 | REQ-003 | same three components at an extreme height | same | Durable, Browser | Pass | 1024x300, page scrolled 70px: Thinking limit 175px < 188px content → scrolls inside the limit, last option reachable; `@` (52px), Workspace and Model (175px) still above, top ≥ 16. OBS-1 |
| U05 | REQ-004, AC-005, VIS-009 | Narrow branches | same, 390x844 | Durable, Browser | Pass | All five menus `fixed inset-x-2 bottom-2`, 8px insets, backdrop, no inline max-height; heading top 271.1 (ref 271) |
| U06 | REQ-004, AC-005, BEH-004, VIS-010 | `useSkillTagMenu` (`auto`, unchanged) | same + real Claude Agent SDK run | Durable, Browser, Live | Pass | Run view `/` menu 538.5–855 above the message box (top 861); wrapper classes unchanged, no inline max-height; 12 fixture skills listed; keyboard choose adds a chip |
| N01 | Probe sensitivity | — | New probe on base source | Temporary | Pass | U01–U03 fail on base with "opened below", "covers the hint line", off-screen tops and top-aligned flyouts |
| T01–T07 | REQ-004 (contents, search, keyboard, focus, selection); T06 → REQ-002 | Same menus | Existing polish probe, real Claude runs | Durable, Browser, Live | Pass | All seven cases pass with no browser errors |
| R1, R2 | REQ-001, REQ-003, BEH-004 (policy math) | Composable and components in jsdom | Vitest | Durable | Pass | see ledger |

## Additional Repository Coverage Execution

None after the broader-validation decision.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 60% | 97% | +37 | AC-001–AC-005 each measured in Chrome at the viewports the requirements name, against the references' numbers | No image diff; the references' fixture content is illustrative |
| Changed-boundary execution directness | 60% | 97% | +37 | The real components and composable in a real layout; the negative control shows the assertions detect the old behavior | — |
| Cross-boundary integration realism and mock gap | 50% | 96% | +46 | Real backend, real runtime catalogs (5 runtimes, up to 33 models), a real Claude run for the run view; nothing mocked | Nuxt dev server, not the packaged build |
| Environment, configuration, identity, and fixture fidelity | 70% | 95% | +25 | Owned temp data root, sanitized env, fixtures through public GraphQL and the skills folder | Headless Chrome at scale factor 1, not the Electron window |
| Failure, edge-case, lifecycle, and recovery evidence | 65% | 93% | +28 | 1024x520, 1024x440, 1024x300 scrolled, 390x844; long lists; Thinking and Model search when limited; Escape and outside click | OBS-1 (runtime rows overflow below about 330px of window height when scrolled); resize while open is out of scope |
| User-surface, browser, and desktop-shell confidence | 40% | 96% | +56 | Browser journeys for all five menus, the flyout and the run view; screenshots reviewed | No shell code changed; shell not exercised |
| Durable regression coverage quality and relevance | 75% | 96% | +21 | New six-case probe, identical measurements across two full runs, sensitive to the old behavior; T06 updated | U03–U06 need a logged-in `claude` CLI, like the existing probe |

- Overall post-repository confidence: 60%
- Overall final confidence: 96%
- Calculation method: simple average of the seven categories (670 / 7 = 95.7)
- Confidence change produced by broader validation: +36 points
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: OBS-1 and OBS-2 below; neither is inside an acceptance criterion

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Required` — Browser dev-path probe
- Material deviation from the planned mode or rationale: none
- Confidence gap or residual risk actually addressed: real layout of every menu at the specified viewports, short windows, the narrow sheet and the run view
- If `Not Required`: `N/A`
- If `Blocked`: `N/A`
- Startup order, commands, and readiness results: `pnpm -C autobyteus-server-ts build` → probe: prisma migrate on a temp SQLite DB → 12 skill folders → backend (`/rest/health` ok) → GraphQL fixtures → `pnpm dev` (`/chat` ok) → Chrome
- Environment choices that materially affected the run: free ports, temp data root, sanitized env (`HOME`, `PATH`, `USER`, `LANG`, `TMPDIR`, `SHELL`, `TERM`), `deviceScaleFactor` 1, `en-US`, motion disabled by an injected style
- Seed data, fixtures, identities: 9 agents and 14 workspaces by GraphQL; 12 installed skills; local `claude` login for one short message in U06 and for T02/T03

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Open `/chat` at 1512x952 | Heading top ≈379; padding 14vh / 40px | 378.6; 133.28 / 40 | U01 details, `U01-layout-1512x952.png` | Pass |
| Type `@` at 1024x520 | Menu 17–229 above the card at 234, scrolling | 17.4–229.4, card 234.4, max 212px, scrolls | U02 details, `U02-at-1024x520.png` | Pass |
| Type `@` at 1024x440 | Menu limited to 166px, on screen | max 166px, 17.8–183.8 | U02 details | Pass |
| Open Workspace, Model, Thinking at each wide viewport | Above the trigger, inside the rule | see matrix | U03 details, `U03-*.png` | Pass |
| Hover each runtime | Flyout bottom-aligned, growing upward | `bottom: -5px`, top ≥ 12, list max = rule | U03 details `flyouts` | Pass |
| 390x844 | Bottom sheet as before | fixed, 8px insets, backdrop | U05 details | Pass |
| Send a message, type `/` in the run view | Skill menu above the run composer | 538.5–855 above 861 | U06 details, `U06-run-slash-menu-1512x952.png` | Pass |

## Desktop Application Validation (When Applicable)

- Validation approach executed and any deviation from the investigation: browser dev-path probe, as planned
- Web-equivalent behavior, surface used, and evidence: all changed behavior; headless Chrome; evidence above
- Shell-specific or lifecycle behavior and evidence: none changed; not exercised
- Effect on any already-running desktop application: `None`. An isolated AutoByteus instance and a prototype dev server from other worktrees were running and were not touched.
- Behavior not directly proven and confidence consequence: the packaged window's exact viewport; negligible because the rule is viewport-relative and holds at six sizes

## Platform / Runtime Targets

- Operating system / platform: macOS 26.5.2 (arm64)
- Runtime and relevant framework versions: Node v22.23.1, pnpm workspace, Nuxt dev server from the worktree
- Browser / engine and version: Google Chrome 154.0.8037.58 (headless, via `playwright-core`)
- Viewports, locale: 1512x952, 1280x720, 1024x520, 1024x440, 1024x300, 390x844 (new probe); 1440x900, 1440x1000, 1280x700, 413x738 (polish probe); `en-US`

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Remaining fields: `N/A`
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/chat-composer-menus-open-upward-probe.mjs` (U01–U06) | Added | REQ-001–004, AC-001–005 | Pass (two full runs with identical measurements) | Owned-stack pattern of the existing chat probes |
| `autobyteus-web/package.json` script `test:e2e:chat-composer-menus-open-upward` | Added | — | Used for the final run | — |
| `autobyteus-web/tests/e2e/chat-composer-polish-probe.mjs` T06 | Updated | REQ-002; keeps the polish ticket's "no overlap or clipping" intent | Pass | Asserts `pt` 14vh and `pb` 40px; the 6vh assertion and the 14vh-baseline comparison are removed |

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| `chat-composer-polish-probe.mjs` T06 (two assertions only; the case stays) | `padding-bottom` = 6vh; composer more than 3vh lower than with a 14vh bottom padding | REQ-002 / DEC-002 | T06 now asserts the current padding; U01 proves the exact position and the 10vh − 40px move |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/autobyteus-web/tests/e2e/chat-composer-menus-open-upward-probe.mjs` (added); `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/autobyteus-web/tests/e2e/chat-composer-polish-probe.mjs` (updated); `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-menus-open-upward/autobyteus-web/package.json` (one script added)
- Paths removed: none
- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route; attached to the Delivery handoff)
- Diff or repository evidence supplied for removed paths: `N/A`
- State: these changes and the API/E2E artifacts are **uncommitted** in the worktree (working tree on top of `67c9e2e5f`).

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `E/menus-open-upward/` | Evidence JSON, 38 screenshots, backend and frontend logs of the final run | Retained | — |
| `E/polish-probe/` | Evidence JSON, screenshots and logs of the polish probe | Retained | — |
| `E/negative-control-base-source/` | Evidence JSON and logs of N01 | Retained (screenshots removed) | — |
| `E/R1-focused-vitest.log`, `E/R2-full-test-nuxt.log`, `E/R2b-rerun-after-sdk-build.log`, `E/server-build.log` | Repository run logs | Retained | — |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| N01: `git checkout 57df63f07 -- <8 source files>`, probe `--cases U01,U02,U03`, `git checkout HEAD -- <8 files>` | Show the new probe fails on the old behavior | All three cases failed as intended | Files restored; `git diff HEAD` shows no source change |

## Dependencies Mocked Or Emulated

None. The backend, the catalogs and the model run were real.

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | R1, R2, U01–U06, N01, T01–T07 | All acceptance criteria proven in a real browser; preserved behavior confirmed |
| Out Of Scope | Resize while a menu is open | Excluded by the UI spec |
| Not Tested | Packaged Electron window; typecheck | See the investigation's "Not Tested" table |

Observations (not failures; details in the investigation):

- OBS-1: below about 330px of window height with the page scrolled, the Model menu's runtime rows overflow its height limit (that list has no scroll region by design).
- OBS-2: at 1024px wide the left-opening runtime flyout sits about 19px under the app sidebar; the same on base.
- OBS-3: `autobyteus-web/docs/chat.md:91` still says `pb-[6vh]` (Delivery docs sync).

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Backend and Nuxt dev of each probe run (5 runs) | Owned | SIGTERM to the process group by the probe | Stopped; no probe process remains |
| Temp data roots `chat-composer-menus-open-upward-*`, `chat-composer-polish-*` | Owned | Removed by the probes | None remain |
| Claude runs from U06, T02, T03 | Owned | Terminated by the probes | Done |
| `autobyteus-application-backend-sdk/dist`, `autobyteus-application-sdk-contracts/dist` | Created by my server build, untracked | Removed | Done. Rebuild with `pnpm -C autobyteus-server-ts build` before running a probe again |
| 8 source files checked out at base for N01 | Worktree | `git checkout HEAD --` | Restored |
| Isolated AutoByteus instance and prototype dev server of other worktrees | Not owned | Left alone | Untouched |

## Preliminary Classification

`N/A` — no failure.

## Recommended Recipient

`/software_engineering_team/delivery_engineer` (per `get_handoff_rules`)

## Evidence / Notes

- The `@`/`/` numbers at 1024x520 and 1024x440 equal the prototype references (17–229; 166px), which confirms measurement from the composer card and not the textarea.
- The "6px above the composer card" gap is measured to the card's padding edge; the card's 1px border makes it 5px to the outer edge, as in VIS-002 (476 against 481).

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 96%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` — Browser; executed
- Critical acceptance criteria lacking direct proof: none
- Next recipient from `get_handoff_rules`: `/software_engineering_team/delivery_engineer`
- Notes: test-code review `Not Required — direct low-risk route`; `task_size=Small`, `architectural_risk=Low`
