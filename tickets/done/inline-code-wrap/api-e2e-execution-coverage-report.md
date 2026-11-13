# API/E2E Execution Coverage Report

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `/home/autobyteus/workspace/.codex/worktrees/inline-code-wrap/tickets/in-progress/inline-code-wrap/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-001 (direct route, Small / Low)
- Prior round reviewed: none for this ticket
- Deviations from the investigation's plan: one extra run (probe-2) after probe-1 passed. It ran the same assertions plus screenshots of the long heading and the inline paragraphs; probe-1's screenshots started at the code blocks.
- Evidence folder: `/home/autobyteus/workspace/.codex/worktrees/inline-code-wrap/tickets/in-progress/inline-code-wrap/evidence/api-e2e/`

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | product `b1955d4a7`; test code `7777a921a` (probe-2; probe-1 lacked only the two screenshot parts) | Linux container, Node v22.23.3 | Probe-owned stack: alpha and beta from this worktree's `autobyteus-server-ts/dist` (built 10:28Z); desktop window = this worktree's `nuxt dev` against alpha; phone = production bundle `autobyteus-web/dist/public` (built 10:29Z, contains `.markdown-renderer-segments .markdown-body{overflow-wrap:break-word}` and `…code…:before{content:none}`), served by alpha at `/mobile`; headless Chromium 153.0.8010.52, playwright-core 1.58.2 | Scripted AGY runtime (no model, no keys); desktop 1280×900 and 700×900 with clipboard permission; phone `isMobile`, touch, DPR 2, 390×844 and 360×800, paired through Phone Access; en-US, UTC |
| ENV-2 | assertion from the working tree, committed as `7777a921a` | same | Static page, headless Chromium `/usr/bin/chromium`, playwright-core | 167 and 390 px hosts, 16px sans-serif |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-105 (unit), no px fonts | Renderer, composable specs, font-size audit | Reused: IMP-01 | — | Pass | (IMP-01) | (IMP-01 `Tests  63 passed (63)`) | Same product tree as `b1955d4a7` |
| API-02 | AC-107 (validity of the new assertion) | `midWordBreaks` of `measureRoot`, on a static page with the long heading, prose with hyphenated words, the inline path and the long token | `node evidence/api-e2e/API-02-ac107-control.cjs <abs autobyteus-web/node_modules> <abs autobyteus-web/tests/e2e/mobile-code-wrap-cases.mjs>` | ENV-2 | Pass | `API-02-ac107-control.log`, `API-02-ac107-control.cjs` | `break-word (the change) 167 midWordBreaks 0 []`, `… 390 midWordBreaks 0 []`; `word-break: break-all (control) 167 midWordBreaks 10`, `… 390 midWordBreaks 4` | Temporary probe of a test, not of the product: it shows the assertion fires on words broken while they fit their line |
| API-03 | AC-104 | Width sweep 150–1300 px with the app's CSS | Reused: IMP-02 | — | Pass | (IMP-02) | (IMP-02: before `781 widths overflow`, after `0 widths overflow`) | Same product commit; AC-104 names implementation evidence |
| API-04 | — | Web typecheck | Reused: IMP-04 | — | Pass | (IMP-04) | (IMP-04 `[typecheck] PASS`) | Same tree; the test change is an `.mjs` probe module |
| MSP-44 | autobyteus-23 heading links (preserved) | Desktop Files panel, phone viewer | `corepack pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=/tmp/aee-24/probe-1 --cases=MSP-44,MSP-45,MSP-46,MSP-50,MSP-51,MSP-52` | ENV-1 | Pass | `probe-1/probe-1-console.log`, `probe-1/MSP-44-52-mobile-shell-probe.json`, `probe-1/MSP-44-*.png` | `[mobile-shell] MSP-44 Pass`, `mobile-shell probe: Pass` | Headings now wrap; every Contents entry still reaches its heading |
| MSP-45 | same | Skills page preview | same run | ENV-1 | Pass | same, `probe-1/MSP-45-skills-after-contents.png` | `[mobile-shell] MSP-45 Pass` | — |
| MSP-46 | same | Conversations, desktop and phone | same run | ENV-1 | Pass | same, `probe-1/MSP-46-*.png` | `[mobile-shell] MSP-46 Pass` | — |
| MSP-50 | AC-102, AC-105, AC-106, AC-107, RSK-101 | Desktop chat at 1280×900 and 700×900: the agent's Markdown answer and the same Markdown as an inter-agent message | `corepack pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=/tmp/aee-24/probe-2 --cases=MSP-50,MSP-51,MSP-52` (also Pass in probe-1) | ENV-1 | Pass | `MSP-50-52-summary.log`, `probe-2/MSP-50-52-mobile-shell-probe.json`, `probe-2/probe-2-console.log`, `probe-2/MSP-50-desktop-{answer,message}-{1280,700}-{heading,inline,code,python,tables,math}.png` | Rows `MSP-50-*`: `failures=[] past=[] midWordBreaks=[] hostOverflow=[] pageOverflow=0`, `inline=[('inline path', True, 2–3), ('bare URL', True, 3–4)]` (copied with Ctrl+C + clipboard), `tables=[(False, w, w), (True, 1835, w)]`, `clippedY=[0, 0, 0]` | Chat column 377 / 472 px, inter-agent message 317 / 412 px |
| MSP-51 | AC-101, AC-105, AC-106, AC-107, RSK-101 | Desktop Files viewer: default beside the file tree (167 px at 1280), maximized (1248 px), and the 700 px drawer; the document opened from the file-action link beside the fenced path | same run (probe-2; also Pass in probe-1) | ENV-1 | Pass | same, `probe-2/MSP-51-desktop-file-{1280-panel,1280-maximized,700}-*.png` | Row `MSP-51-desktop-file-1280-panel … rootWidth=167 failures=[] past=[] midWordBreaks=[] hostOverflow=[] pageOverflow=0 … inline=[('inline path', True, 6), ('bare URL', True, 7)]`; screenshot `MSP-51-desktop-file-1280-panel-heading.png`: the heading wraps ("LinkedI / n", "Shubha / m", words wider than the line) with nothing cut off | In autobyteus-23 MSP-51 the same viewer had `inlinePast=[159]` and its preview container (`h-full overflow-auto bg-white p-4`) scrolled sideways by 143 px. Now `hostOverflow=[]` |
| MSP-52 | AC-103, AC-105, AC-106, AC-107, RSK-101 | Phone production bundle at 390×844 and 360×800: the agent's answer, the phone file viewer (tapping the file-action link), and the inter-agent message | same run (probe-2; also Pass in probe-1) | ENV-1 | Pass | same, `probe-2/MSP-52-phone-{answer,file,message}-{390,360}-*.png` | Rows `MSP-52-*`: `failures=[] past=[] midWordBreaks=[] hostOverflow=[] pageOverflow=0`, inline copies `True` at 3–7 visual lines (selection text); screenshot `MSP-52-phone-message-360-inline.png`: path and URL wrap inside the 172 px column | The phone's private-HTTP origin is not a secure context, so the copied text is the selection's text |

In probe-1 and probe-2, no browser line was unknown, and the cleanup receipt is `{'frontendExited': True, 'serversLeft': 0, 'rootRemoved': True}` (summary log, last two lines).

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-101 | Yes | MSP-51 (167 px viewer: no element or text node past the document, no host wider than its box, so the viewer does not scroll sideways; also maximized and the 700 px drawer) | Proven | — |
| AC-102 | Yes | MSP-50 (chat 1280 and 700, answer and inter-agent message; feed and every ancestor without overflow) | Proven | — |
| AC-103 | Yes | MSP-52 (phone 390 and 360: answer, message, file viewer) | Proven | — |
| AC-104 | Yes | API-03 (IMP-02 sweep: 0 of 1151 widths overflow; 781 before) | Proven | — |
| AC-105 | Yes | MSP-50…52 (the autobyteus-23 assertions: every `pre` 0 overflow and wrapping with lines and indentation, the 8-column table 1835 px scrolling in its box under a real wheel or touch swipe up to its last cell, equations not clipped); API-01 | Proven | — |
| AC-106 | Yes | MSP-50, MSP-51 (Ctrl+C, clipboard equals the inline path and the bare URL; wrapped over 2–7 visual lines everywhere but the maximized viewer, where they fit on 1); MSP-52 (selection text equals them at 3–7 visual lines) | Proven | — |
| AC-107 | Yes | MSP-50…52 (`midWordBreaks=[]` on all 13 surface/size rows, a check that API-02 shows firing on `break-all`); screenshots `*-heading.png`, `*-inline.png` | Proven | — |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 95% | AC-101…AC-107 each proven, AC-101…103/105…107 in the running app | — | — |
| Changed-boundary execution directness | 75% | 95% | Real renderer CSS, the Tailwind typography build inside the production phone bundle (verified in the bundle), real host containers | The desktop window runs `nuxt dev`, not the production desktop build; the phone run covers the production CSS | — |
| Cross-boundary integration realism and mock gap | 80% | 95% | A real server streams and projects the answer and the inter-agent message; real pairing | The answer arrives as one step, not model chunks (same stateless CSS) | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | Worktree builds, probe-owned nodes, real viewport sizes, touch, clipboard | Linux fonts only. Exact break positions vary by font, but the assertions are relative to each line | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | 167 px viewer, 172 px phone message, heading words wider than the line, a list ending in inline code, the sweep 150–1300 px, an assertion control | WebKit not run (RSK-102) | A Safari/iOS run on a Mac (not available here) |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | Desktop chat, Files viewer in 3 states, phone chat, viewer and message; screenshots of headings and inline text | Electron shell and dark mode not run (no shell or color change) | — |
| Durable regression coverage quality and relevance | 85% | 95% | MSP-50…52 now fail on any text past the edge, any sideways-scrolling host, any mid-word break of a fitting word, and on unequal inline copies | The phone probe is long and run on demand | — |

- Overall post-repository confidence: 82%
- Overall final confidence: 95%
- Calculation method: simple average of the seven categories.
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: RSK-102 (WebKit not run); Electron shell and dark mode not run.

## Broader Validation Decision

- Decision: `Required` (executed)
- Execution mode: `Browser` (phone-shell probe: desktop window and production phone bundle against probe-owned nodes)
- Gap addressed: real host containers (RSK-101), the production CSS build (the Tailwind config change), real copy. Static pages could not show these.
- Browser validation needed: yes; the change is browser layout, and TESTING.md requires the phone bundle.

## Desktop Application Validation

- Approach: the desktop window of the phone probe, as planned. Web-equivalent cases: MSP-50, MSP-51. No shell behavior changed.
- Effect on any running desktop application: `None` (probe-owned ports, data and browsers).
- Not directly proven: the Electron shell, which uses the same Chromium engine and CSS.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility: `No`
- Compatibility-only or legacy-retention behavior observed: `No`. The test's FU-002 tolerance was removed in IR-001, and the old `content: '""'` was replaced.
- Durable coverage added or retained only for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-code-wrap-cases.mjs` | Updated (IR-001, commit `b1955d4a7`: content, strict `past` with text nodes, scrolling-host check, inline copies; reviewed and kept) | MSP-50…52 | Removes the autobyteus-23 inline tolerance, which REQ-101/102 make obsolete |
| `autobyteus-web/tests/e2e/mobile-code-wrap-cases.mjs` | Updated (API/E2E, commit `7777a921a`: `midWordBreaks` assertion for AC-107; `heading` and `inline` screenshot parts) | MSP-50…52 | Validity shown by API-02 |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| The agent's model | Scripted AGY CLI (`REPLY_FILE:`, `CALL_TOOL:`) | The renderer is the boundary | One-step answer instead of streamed chunks |
| A phone on the LAN | Headless Chromium, `isMobile`/touch, a private host mapped to 127.0.0.1, real Phone Access pairing | No device needed for CSS layout | iOS WebKit not run (RSK-102) |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks ×2 | Yes | The probe's `finally` | Receipts clean (both runs) |
| `/tmp/aee-24` (build logs, probe outputs, the control's working copy) | Yes | Evidence copied into the ticket; folder removed | Done |
| `API-02-ac107-control.cjs` | Yes | Kept as evidence (it reads `measureRoot` from the cases module) | In the evidence folder |
| `autobyteus-server-ts/dist`, `autobyteus-web/dist`, `dist-mobile` | Yes (untracked build output) | Left as worktree build output | Not committed |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Next recipient from `get_handoff_rules`: Delivery Engineer
- Notes: autobyteus-23 FU-002 is resolved by this ticket. The overflow measured there (159 px, the viewer scrolling 143 px) is gone in the same surface. The build-input check found `autobyteus-web/tailwind.config.js` outside TESTING.md's Fresh-start list (investigation, Project Execution Discovery). The bundle built in this worktree contains the change; no fresh-start case was run.
