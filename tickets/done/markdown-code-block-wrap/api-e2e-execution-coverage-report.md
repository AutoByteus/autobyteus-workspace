# API/E2E Execution Coverage Report

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `/home/autobyteus/workspace/.codex/worktrees/markdown-code-block-wrap/tickets/in-progress/markdown-code-block-wrap/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-001 (direct route, Small / Low)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - AC-003's "wide and narrow panel" became the Files viewer's default state beside the file tree (167 px at a 1280 px window) and its "Maximize view" state (1248 px). At 700 px the right tools fold into a strip, so the document is opened from the strip's Files button (a drawer, 418 px). The plan had only "1280 and 700".
  - Four probe runs instead of one. Probes 1–3 failed only on test-side causes, each found and fixed before the next run (progress log; Notes of MSP-50…52 below): the fixture's path line, the cell-reachability check, the touch-swipe method, the strip selector, and browser lines from the cold dev-server warm-up. No product code changed between runs.
- Evidence folder: `/home/autobyteus/workspace/.codex/worktrees/markdown-code-block-wrap/tickets/in-progress/markdown-code-block-wrap/evidence/api-e2e/`

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | product `417e06da9` (HEAD `2dd97f9e8` changes only `tickets/`) | Linux container (linuxkit 6.12), Node v22.23.3 | vitest via `corepack pnpm` 10.28.2 | Web unit config; jsdom for the DOMPurify spec |
| ENV-2 | product `417e06da9`; test code `27245624a` (probe-4; probe-3 ran the same code except MSP-51's strip selector) | same | Probe-owned stack: alpha and beta from `autobyteus-server-ts/dist` built in this worktree (06:06Z), desktop window = `nuxt dev` of this worktree against alpha, phone = production bundle `autobyteus-web/dist/public` (built 06:07Z by `build:mobile-web`) served by alpha at `/mobile`; headless Chromium 153.0.8010.52, playwright-core 1.58.2 | Scripted AGY runtime (`AGY_FAKE_CASE=linked_skills`, no model, no keys); desktop 1280×900 and 700×900, clipboard permission; phone `isMobile`, touch, DPR 2, 390×844 and 360×800, paired through Phone Access at `http://192.168.77.23:<alpha port>`; en-US, UTC; temp data roots and HOMEs |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-005, AC-007, AC-008 (structure/text), AC-009 | Renderer and composable specs, font-size audit | `pnpm -C autobyteus-web exec vitest run components/conversation/segments/renderer composables/__tests__/useMarkdownSegments tests/integration/app-font-size-fixed-px-audit.integration.test.ts --no-watch` (working dir: worktree) | ENV-1 | Pass | `API-01-renderer-specs.log` | `Test Files  9 passed (9)`, `Tests  63 passed (63)`; `useMarkdownSegments.wrapping.spec.ts (5 tests)` ✓ | Includes `MarkdownRenderer.spec.ts`, `MarkdownRenderer.headingLinks.spec.ts`, the Mermaid specs, `useMarkdownSegments.sanitization.spec.ts` |
| API-02 | all (regression) | Whole web unit suite | Reused: IMP-01 | — | Pass | (IMP-01) | (IMP-01) | Ran on `417e06da9`; nothing since touches product code. Its one failure is a 5 s timeout in `ProjectTaskBoard.spec.ts`, which uses no changed code (`grep` finds no `MarkdownRenderer`/`useMarkdownSegments` in `components/projects/`) and passed 16/16 alone. The full run was under machine load (TESTING.md: one heavy run at a time). Out of this ticket's reach |
| API-03 | — | Web typecheck | Reused: IMP-05 | — | Pass | (IMP-05) | (IMP-05) | Same product source. The new test files are `.mjs` probes with no new workspace-package import |
| API-04 | AC-001/003 (static), AC-005…AC-008, RSK-002 | Real pipeline output with the app's CSS in the host classes | Reused: IMP-03, IMP-04 | — | Pass | (IMP-03, IMP-04) | (IMP-04 `ALL PASS`) | Same commit; supporting evidence below the running app |
| MSP-44 | AC-009 (heading links) | Desktop Files panel and phone viewer | `corepack pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=/tmp/aee-23/probe-3 --cases=MSP-44,MSP-45,MSP-46,MSP-50,MSP-51,MSP-52` | ENV-2 | Pass | `probe-3/probe-3-console.log`, `probe-3/MSP-44-52-mobile-shell-probe.json`, `probe-3/MSP-44-*.png` | `[mobile-shell] MSP-44 Pass`; JSON `cases.MSP-44.desktop.contents` `"reached": 25` | Existing case; also passed in probe-1 |
| MSP-45 | AC-009 (heading links) | Skills page preview | same run | ENV-2 | Pass | same, `probe-3/MSP-45-skills-after-contents.png` | `[mobile-shell] MSP-45 Pass` | Existing case |
| MSP-46 | AC-009 (heading links) | Conversations, desktop and phone | same run | ENV-2 | Pass | same, `probe-3/MSP-46-*.png` | `[mobile-shell] MSP-46 Pass` | Existing case |
| MSP-50 | AC-001, AC-005, AC-006, AC-007, AC-008, AC-009 (Mermaid, fenced-code file action), RSK-001, RSK-002 | Desktop window: the agent's Markdown answer (Event Monitor) and the same Markdown as an inter-agent message in the task agent's conversation, at 1280×900 and 700×900 | same run (probe-3). Steps: open the run from the Runs view; per size: measure the rendered root, select each code block and press Ctrl+C then read the clipboard, wheel-scroll the wide table's box, screenshot each part; then the same in the task agent's conversation | ENV-2 | Pass | `MSP-50-52-summary.log`, `probe-3/MSP-44-52-mobile-shell-probe.json`, `probe-3/MSP-50-desktop-{answer,message}-{1280,700}-{code,python,tables,math}.png` | Summary rows `MSP-50-desktop-answer-1280` … `-message-700`: `failures=[]`, `pre=[(0, 'pre-wrap', True), …]`, `tables=[(False, 377, 377), (True, 1835, 377)]`, `copy=[(True, 'Ctrl+C + clipboard')]x3 allEqual=True`, `swipe=302 lastCellReachable=True`, `hostOverflow=[] pageOverflow=0`, `pathActionBeside=True actionInside=False`, `pythonColoredTokens=9`; lines `'114ch indent 34px … gap 32px'` (after the blank line) | Chat column 377 px (1280) and 472 px (700); inter-agent 317 / 412 px. Probe-1 failed only "no file-action link beside the path block": the fixture had the path inside a sentence, and fenced-code actions need a line that is a whole path (`findAbsoluteFilePathCodeCandidates`). Fixed in the fixture; probe-2 and probe-3 pass |
| MSP-51 | AC-003, AC-005…AC-008, RSK-001 | Desktop Files panel: the document opened by clicking the file-action link beside the path block; viewer beside the file tree at 1280×900, maximized, and the drawer at 700×900 | `corepack pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=/tmp/aee-23/probe-4 --cases=MSP-51` | ENV-2 | Pass | `MSP-50-52-summary.log`, `probe-4/MSP-51-mobile-shell-probe.json`, `probe-4/probe-4-console.log`, `probe-4/MSP-51-desktop-file-{1280-panel,1280-maximized,700}-{code,python,tables,math}.png` | `mobile-shell probe: Pass`; summary rows `MSP-51-desktop-file-1280-panel` (rootWidth=167), `-1280-maximized` (1248), `-700` (418): `failures=[]`, every `pre` `(0, 'pre-wrap', True)`, `allEqual=True`, `lastCellReachable=True`, `pageOverflow=0` | Row `1280-panel`: `inlinePast=[159]`, `hostOverflow=[('h-full overflow-auto bg-white p-4 h-full', 143)]`. That is the long inline path (preserved inline code, FU-002), not a code block. Earlier runs failed on test-side causes: probe-2's reachability check needed a cell wider than its box to fit (now: the table's right edge reaches the box), and probe-3's strip selector was wrong (the parent's `data-test="workspace-right-tool-strip"` replaces the strip's own) |
| MSP-52 | AC-002, AC-004, AC-005…AC-008, RSK-001 | Phone production bundle: the agent's answer, the phone file viewer (tapping the file-action link), and the inter-agent message, at 390×844 and 360×800 | same run as MSP-44 (probe-3). Steps: pair through Phone Access; open the run from the phone list; per size: measure, read each code block's selection, swipe the wide table with a touch sequence, screenshot each part; tap the link to open the viewer and repeat; open the task agent under its host and repeat | ENV-2 | Pass | `MSP-50-52-summary.log`, `probe-3/MSP-44-52-mobile-shell-probe.json`, `probe-3/MSP-52-phone-{answer,file,message}-{390,360}-{code,python,tables,math}.png` | Summary rows `MSP-52-phone-*`: `failures=[]`, every `pre` `(0, 'pre-wrap', True)`, `allEqual=True` (`'selection'`), `swipe=` 128–306, `lastCellReachable=True`, `inlinePast=[]`, `hostOverflow=[] pageOverflow=0`; rootWidth 262/232 (answer), 358/328 (file), 202/172 (message) | The phone's origin is a private HTTP address (not a secure context, as on a trusted LAN), so the copied text is the selection's text, not the clipboard. Probe-2's swipe used `Input.synthesizeScrollGesture`, which does not scroll in this headless Chromium (0 px against 474 px with `Input.dispatchTouchEvent` on a static page); now a touch sequence |

Probe runs 1–3 and their failures are in `api-e2e-test-progress.md`; their output folders were `/tmp/aee-23/probe-1…3`. The committed evidence is probe-3 (MSP-44…46, MSP-50, MSP-52) and probe-4 (MSP-51), on the final test code. In probe-3 and probe-4, no browser line was unknown (`browserErrors` holds only the known favicon 401s of the phone) and the cleanup receipt is `{'frontendExited': True, 'serversLeft': 0, 'rootRemoved': True}`.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | MSP-50 (desktop chat 1280 and 700, the agent's answer and an inter-agent message); API-04 | Proven | — |
| AC-002 | Yes | MSP-52 (phone run screen 390, also 360) | Proven | — |
| AC-003 | Yes | MSP-51 (Files viewer 167 px default, 1248 px maximized, 418 px drawer at 700) | Proven | — |
| AC-004 | Yes | MSP-52 (phone file viewer 390 and 360) | Proven | — |
| AC-005 | Yes | MSP-50…52 (each original line starts a new visual line; 4-space and tab lines indented 34 px; blank line kept: 32 px gap against 8 px; python `language-python` with 9/9 colored tokens; text equals source); API-01 | Proven | — |
| AC-006 | Yes | MSP-50…52 (the 280-character URL line, 260 of them one unbroken run, wraps into 2 (maximized viewer, 1248 px) to 18 (narrowest host) visual lines inside its box; `pre` overflow 0 on every surface and size) | Proven | — |
| AC-007 | Yes | MSP-50, MSP-51 (Ctrl+C, clipboard text equals the source for all 3 blocks); MSP-52 (the selection's text equals the source); API-01 | Proven | — |
| AC-008 | Yes | MSP-50…52 (narrow table width = box width, no scroll; the 8-column table scrolls in its own box (1835 px) under a real wheel or touch swipe up to its last cell; window `scrollX` 0; `$$` and `math` equations scroll in their box at narrow widths; `clippedY` 0 for all three, the tall `\[…\]` included); API-01 | Proven | — |
| AC-009 | Yes | API-01, API-02; MSP-44…46 (heading links); MSP-50…52 (Mermaid diagram rendered; the file-action link sits beside the path block, outside the copied code, and opens the file) | Proven | The Monaco Edit view was not run: the change touches no Monaco code, and files opened from the Event Monitor are read-only |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 95% | API-01…04; MSP-50…52 prove AC-001…AC-008 in the running surfaces; AC-009 by API-01/02, MSP-44…46 and the Mermaid/file-action checks | Monaco Edit view not run (not touched) | — |
| Changed-boundary execution directness | 75% | 95% | Real renderer, stylesheet, Nuxt bundle (phone: production build) and real host containers | The desktop window is `nuxt dev`, not the production desktop build; the phone run covers the production CSS bundle | An isolated desktop instance (no gain expected for CSS) |
| Cross-boundary integration realism and mock gap | 75% | 95% | A real server streams the agent's answer and the inter-agent message, then projects them; real Phone Access pairing | The scripted runtime sends the answer as one step; a model streams it in chunks (same elements, same stateless CSS) | A live-model run (not needed: the rule does not depend on streaming) |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | Worktree builds, probe-owned nodes, real viewport sizes and touch | Linux fonts; on macOS/Windows widths differ, but every rule is relative (wrap/scroll) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | Unbreakable 260-char URL, tab and blank line, tall equation (RSK-002), 360 px phone, 167 px viewer, a narrower inter-agent host, a fenced path with its action link | ≥1000-char runs (`long-unbroken-text`) were not run in the app (PRB-003 by the designer) | — |
| User-surface, browser, and desktop-shell confidence | 70% | 95% | Desktop chat, Files panel (3 states), phone chat, phone viewer, screenshots | Electron shell not run (same Chromium engine and CSS, QR-001); dark mode not run (no color rule changed) | — |
| Durable regression coverage quality and relevance | 90% | 95% | jsdom spec (structure/text) + MSP-50…52 in `test:e2e:mobile-shell` measuring layout, copy and scroll | The phone probe is long and run on demand | — |

- Overall post-repository confidence: 81%
- Overall final confidence: 95%
- Calculation method: simple average of the seven categories.
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: FU-002 (inline code in a narrow Files viewer; outside this ticket); Electron shell and dark mode not run (no shell or color change).

## Broader Validation Decision

- Decision: `Required` (executed)
- Execution mode: `Browser` (phone-shell probe: desktop window and production phone bundle against probe-owned nodes)
- Confidence gap it addressed: layout in the running app's containers (RSK-001), real copy, real scrolling, the production phone bundle. The repository evidence (jsdom, static pages) could not show these.
- Browser validation needed, and why: the change is presentation in the browser; TESTING.md requires the phone bundle for renderer behavior the phone offers.

## Desktop Application Validation

- Approach executed: the desktop window of the phone probe (`nuxt dev` against alpha, headless Chromium), as planned.
- Cases proving web-equivalent behavior: MSP-50, MSP-51. Shell-specific behavior: none changed.
- Effect on any already-running desktop application: `None` (the user's server on port 8000 and other browsers untouched; all ports, data and browsers probe-owned).
- Behavior not directly proven: the Electron shell itself. Consequence: none expected, since it is the same Chromium engine and CSS (QR-001).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-code-wrap-cases.mjs` | Added (commit `27245624a`) | MSP-50, MSP-51, MSP-52 | Called from the phone-shell probe after the heading-links cases |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated (commit `27245624a`) | MSP-50…52 | Import, call, header lines |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated (commit `27245624a`) | MSP-50…52 | `REPLY_FILE:<absolute path>` in the `linked_skills` turn: the agent answers with that file's text unquoted; no effect on other keywords |
| `autobyteus-web/tests/e2e/mobile-heading-links-cases.mjs` | Updated, baseline fix (commit `07b3abcd4`) | MSP-44…46 | The desktop window's browser-line listeners attach after the cold `nuxt dev` warm-up. Cause: run alone, these cases ended the probe in `Fail` from warm-up lines only (`504 (Outdated Optimize Dep)`, failed dynamic import of `pages/index.vue`; probe-1 `browserErrors`, case `heading-links-setup`) |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The agent's model | Scripted AGY CLI (`REPLY_FILE:`, `CALL_TOOL:`) | No provider needed to produce a Markdown answer; the renderer is the boundary | The answer arrives as one step rather than streamed chunks |
| A phone on the LAN | Headless Chromium with `isMobile`/touch, a private host mapped to 127.0.0.1, real Phone Access pairing | No device needed for CSS layout | A real device's browser engine (Android WebView is Chromium) not run |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks (alpha, beta, `nuxt dev`, browsers, temp data roots) ×4 | Yes | The probe's `finally` | Receipts `frontendExited: True, serversLeft: 0, rootRemoved: True` (probe-3, probe-4) |
| Touch-scroll experiment `/tmp/aee-23/touch/t.cjs` (static page) | Yes | Removed with `/tmp/aee-23` | Done |
| `/tmp/aee-23` (build logs, probe output folders) | Yes | Evidence copied into the ticket; folder removed | Done |
| `autobyteus-server-ts/dist`, `autobyteus-web/dist`, `dist-mobile` | Yes (worktree build outputs, untracked) | Left in the worktree as build output | Untracked, not committed |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): `None`
- Next recipient from `get_handoff_rules`: Delivery Engineer
- Notes: FU-002 now has running-app evidence: a long inline-code path overflows the desktop Files viewer at its default width by 159 px, and the preview container scrolls sideways by 143 px. Inline code is preserved behavior here (BEH-003), so this is not a failure of this ticket. But BEH-003's premise that inline code "already wraps" does not hold at that width; the Solution Designer may want to raise FU-002 with the user.
