# API/E2E Execution Coverage Report

## Round

- Coverage investigation: `tickets/in-progress/memory-layout-652/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/memory-layout-652/api-e2e-revision-record.md`, `API-REV-003`
- Test progress log: `tickets/in-progress/memory-layout-652/api-e2e-test-progress.md`
- Round and trigger: round 3; implementation IR-003 (CRR-002 Local Fix: CR-003), commit `40a89a207b` (fix `413c2dcd83`; probe baseline fix `41bce17570`). Round 1: IR-001 at `7bf21db56e` (API-REV-001, Fail on F-1, F-2). Round 2: IR-002 at `0072beea13` (API-REV-002, Fail on F-3).
- Prior rounds reviewed: rounds 1 and 2. Changed since round 1: classes in `AgentMemoryPage.vue`, `GroupMemoryPage.vue`, `MemoryBrowse.vue` (round 2), `MemoryPageHeader.vue`, `MemoryInspector.vue`, `AgentMemoryPage.vue` (round 3), their specs, and SMV-034 in the probe. Round 3 reran the whole web suite, the probe, every VIS view at the three AC viewports and the headers at 1440, 1280, 1024, 900 and 768 (API-017). Round 1's cases on unchanged surfaces (org, imported, search, keyboard, short window, icons) stand: those files are unchanged since round 1.
- Deviations from the plan: SMV-120 and SMV-121 were added to the probe as reproductions of F-2 and F-1, found by the rendered views; one probe run had SMV-120 made non-fatal (reverted) to show that SMV-121 reproduces too.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-layout-652/tickets/in-progress/memory-layout-652/evidence/api-e2e/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `7bf21db56e` | macOS arm64, Node 22 | worktree `autobyteus-web` vitest | `env -i PATH HOME TMPDIR=/tmp/api652/tmp`; machine load 160–227 from other work |
| ENV-2 | `7bf21db56e` (+ my probe edits) | macOS arm64, headless Chrome | `semantic-memory-view-probe.mjs`: its own data root, the worktree's built server, `nuxt dev` | `en-GB`, 1440×900 (and 1280×800, 390×844 inside the run) |
| ENV-3 | `7bf21db56e` | macOS arm64, headless Chrome | my render stack `evidence/api-e2e/API-010-rendered-views/scripts/stack.mjs` (copied from IMP-003's and extended): the worktree's built server, `nuxt dev`, a second node (beta) syncing into the hub | invented data: agents, a team with a shared member, an org (an agent and the team as members) and its run, runs through the scripted AGY CLI, run two with three journal and raw-trace files, a long document, file kinds in a workspace and a skill; the owner credential in a mode-600 file outside the evidence; viewports 1440×900, 1280×800, 390×844, 1280×720, 1920×1080 |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-001 | AC-002…007 (specs), AC-006 | whole web suite | `pnpm test:nuxt` (from `autobyteus-web`) | ENV-1 | Pass | (progress log) | `Test Files  811 passed (811)`, `Tests  6290 passed \| 2 skipped (6292)` | |
| API-002R | AC-007 | typechecks, guards, localization audit, icon bundle check, `test:e2e:team-group-icon` | Reused: IMP-002 | — | Pass (reused) | — | — | no source change since `37c047cb59` except the "1 run" string (in API-001) and the probe |
| API-003 | AC-001, AC-002, AC-005, AC-006 | semantic-memory probe (updated by implementation, reviewed; plus SMV-110…121) | `node autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs --output-dir <dir>` | ENV-2 | **Fail** (SMV-120, SMV-121); SMV-001…119 Pass | `API-003-semantic-memory-probe/smv-checks.json` (52/52 before SMV-120/121), `smv2-checks.json` (stops at SMV-120), `smv3-checks.json` (SMV-120 non-fatal: SMV-121 fails too), `SMV-121-agent-episodic-narrow-390x844.png` | SMV-110 `"top": 85`, SMV-111 `"toWindowBottom": 20, "pageScrolls": false`, SMV-112 `22px/17.6px/14px`, SMV-113 `300`, SMV-115 `"clipboardIsFolder": true, "copiedFor": 1520`, SMV-116 `"width": 285, "truncated": false`, SMV-119 `"top": 74`; **SMV-120** `"nameAt1280": {"width": 90, "needs": 153, "whole": false}`; **SMV-121** `"cardRights": [695, 695], "sideways": true` at a 390 px window | the implementation's updates (SMV-021/062, 030/101, 033, 065, 070/071) follow DC-002…004 and TR-004: kept |
| API-010 | AC-001, AC-002, AC-003 | every VIS view at 1440×900, 1280×800, 390×844 | `node view.mjs <worktree> <stack.json> steps/vis.js <w> <h>` | ENV-3 | Pass at 1440 and 1280 (structure, controls, labels, spacing; only data differs); **Fail at 390 (F-1)** | `API-010-rendered-views/results/vis-1440x900.json`, `vis-1280x800.json`, `vis-390x844.json`, `compare/VIS-0xx-*.png` (reference left, mine right), `compare/phone-sheet.png`, `shots/` | owner content `"top": 85`, Global and cards `74`; panel and journal `"toWindowBottom": 20`, `"pageScrolls": false`; no list name cut; one journal file: no list or picker; three: `FILES · 3` at ≥ 1280, picker at 390; Raw Traces three files: one picker `raw_traces_active.jsonl (active) · 2 records`…; one file as text; no Apply; `"spinner": "textfield"`; 0 errors. 390 Episodic: `"firstCard": {"width": 561…}` | F-1, F-2 below |
| API-010b | AC-001 | the owner header's widths | `steps/header.js` at 1440×900, 1280×800, 1920×1080 | ENV-3 | **Fail (F-2)** | `results/header-1440x900.json`, `header-1280x800.json`, `compare/VIS-004-episodic-1440x900.png` | 1440: `h1 … "w": 157, "scrollW": 172`; 1280: `"w": 89, "scrollW": 172`; the subtitle `hidden min-w-0 truncate … lg:inline` also cut | "Project Task Man…" beside "Also works in Software Engineering…" |
| API-010c | AC-001 (390) | why the Episodic cards overflow | `steps/overflow.js` at 390×844 | ENV-3 | **Fail (F-1)** | `results/overflow-390x844.json`, `shots/episodic-390x844.png` | `agent-episodes` `"gridCols": "561.109px"` (classes `grid gap-3.5 md:grid-cols-2 xl:grid-cols-3`, no base column); the page root `h-full overflow-auto` `"sw": 581, "cw": 340` | |
| API-011 | AC-004, REQ-005 | run titles | `steps/vis.js` (episode runs), `steps/org.js`, `steps/search.js`; IMP-003 (team member) | ENV-3 | Pass | `results/vis-1440x900.json` (`journal-*.title`), `org.json`, `search.json`, `compare/org-member-run-header.png` | episode: `"Rename the helper and update callers"`; org member: `"Coordinate the launch across the teams"` (the org run's summary), Back `Launch Org`; search: `"test": "memory-inspector-run-identity"`, run ID · workspace, `ui-monospace…`, `12px`; Back `Search results` / `Back to search results`, the query and 4 results restored | |
| API-012 | AC-006 | imported source | `steps/imported.js` (beta synced, `committedBatches: 1`) | ENV-3 | Pass | `results/imported.json`, `shots/imported-*.png` | sources `["Local Memory", "Imported: Beta Node"]`; header `Imported · read-only`, `"badgeInHeader": 1`; Semantic `"notSynced": 1` | |
| API-013 | AC-006 (keyboard), AC-003 (Show) | focus order, Enter | `steps/keyboard.js` | ENV-3 | Pass | `results/keyboard.json` | owner `["memory-page-back", "agent-episodes-filter", "agent-memory-tab-episodic", "agent-memory-tab-semantic", "agent-episode", …]`; run `["memory-page-back", "memory-inspector-tab-journal", "memory-inspector-tab-raw", "work-journal-file", …]`; Show `2` + Enter → `GetAgentRunMemoryView` `"limit": 2`; the same Enter again → `0` requests | Go to line's highlight was not read (my selector); its Enter path is in the specs |
| API-014 | AC-005 | Files panel and Skills page | `steps/icons.js` | ENV-3 | Pass | `results/icons.json`, `shots/files-panel-icons-1440x900.png`, `shots/skills-icons-1440x900.png` | each of `app.ts App.vue main.js site.css index.html package.json README.md notes.txt` (and `SKILL.md`): `svg: true`, shapes ≥ 1, 14 px, no font icon; Files tab `"maxWidth": "150px", "title": null` | |
| API-016 | AC-001 (round 2: CR-001, CR-002; F-3) | the card grids and owner headers after the fix | specs `npx vitest run components/memory components/fileExplorer pages`; the probe; my stack (round 2 adds an agent named "Quarterly Infrastructure Capacity Planning And Forecasting Assistant") with `steps/r2.js` at 1440×900, 1280×800, 1024×768, 390×844, `steps/hdr2.js` at 1024, 900, 768, `steps/hdr3.js` at 1024 and 1440 | ENV-1, ENV-2, ENV-3 | CR-001 Pass; CR-002 Pass at 1440 and 1280; **F-3 Fail at 1024 and 768** | `API-016-round2-fix/results/r2-*.json`, `hdr2-*.json`, `hdr3-*.json`, `shots/r2-header-1024.png`, `shots/r2-*`; `API-003-semantic-memory-probe/smv4-checks.json` | specs `45 passed`, `304 passed`; probe `54/54`, SMV-120 `"nameAt1280": {"width": 153, "needs": 153, "whole": true}`, SMV-121 `"cardRights": [370, 370], "sideways": false`; stack: every card grid `maxRight` ≤ window, `sideways: false` at 1440, 1280, 390; Project Task Manager `"width": 172, "needs": 172` at 1440 and 1280; **1024×768: agent `h1` `"w": 0, "needs": 172`** (group 55 px: Back only), team Runs `h1` `"w": 73, "needs": 219`, run title `"w": 34, "needs": 276`; 768×900: agent `h1` `"w": 36`; 900×768 wraps (`168`) | F-3: see Preliminary Classification |
| API-017 | AC-001…006 (round 3: CR-003; F-3) | the whole web suite; the probe; every VIS view at 1440×900, 1280×800, 390×844; the owner, team and run headers at 1440, 1280, 1024, 900, 768; the phone card grids | `pnpm test:nuxt`; the probe; my stack with `steps/vis.js`, `hdr2.js`, `hdr3.js`, `r2.js` | ENV-1, ENV-2, ENV-3 | Pass | `API-017-round3-fix/results/web-suite.txt`, `vis-*.json`, `hdr2-*.json`, `hdr3-*.json`, `r2-390x844.json`, `shots/`; `API-003-semantic-memory-probe/smv6-checks.json` | suite `812 passed`, `6296 passed \| 2 skipped`; probe `55/55`, SMV-122 `"width": 153, "needs": 153`, SMV-034 saw only `ListWorkspaceRunHistory`, `ListCollaborationRootHistory` (the 5 s run-list refresh); agent name `172/172` at every width (one row at 1440 and 1280, wrapped below), team `219/219` everywhere, run page Back/name/title at 768 `129, 83/143, 160/276`, at 1024 `212, 142/143, 274/276`; VIS views: owner tops `85`, Global and cards `74`, panel and journal `toWindowBottom 20` (phone 16), `pageScrolls false`; phone card grids `maxRight 370`, `sideways false`; 0 errors | the implementation's SMV-034 change (leaving out the two periodic run-list reads, `RUN_HISTORY_REFRESH_INTERVAL_MS = 5000`) is reviewed and kept as mine |
| API-015 | AC-002 | a short window and a long document | `steps/short.js` at 1280×720 | ENV-3 | Pass | `results/short.json`, `shots/short-*.png` | panel `"top": 85, "toWindowBottom": 20`, `"pageScroll": false`; reader `"scrollHeight": 6684, "clientHeight": 567`, its last step reachable, panel unmoved; journal `"toWindowBottom": 20` | |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | Notes |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-003, API-010, API-016, API-017 | Proven | every VIS view matches its reference at 1440×900, 1280×800 and 390×844 (structure, controls, labels, spacing; only data differs), offsets 85 / 74 px; F-1 (round 2), F-2 (round 2) and F-3 (round 3) resolved: names stay visible at every width from 768 to 1440, the header wraps when the row does not fit, cards fit a phone |
| AC-002 | Yes | API-003 (SMV-110…115, 119), API-010, API-015 | Proven | fill, no page scroll, type sizes, first root document on arrival, Copy → clipboard and "Copied" for 1.5 s |
| AC-003 | Yes | API-010, API-013, API-001 | Proven | |
| AC-004 | Yes | API-011, API-001; IMP-003 (team member) | Proven | |
| AC-005 | Yes | API-003 (SMV-114, 116), API-014, API-001 | Proven | |
| AC-006 | Yes | API-001, API-003, API-011…015 | Proven | 0 page and console errors on every view |
| AC-007 | No | API-001, API-002R | Proven | |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 95% | AC-001…007 proven on their surfaces | invented data (shaped like real use: long paths, shared agents, long names) | |
| Changed-boundary execution directness | 70% | 95% | real server and page, every view at every viewport and the widths between | | |
| Cross-boundary integration realism and mock gap | 70% | 95% | real runs, index, memory sync, org | | |
| Environment, configuration, identity, and fixture fidelity | 80% | 95% | ENV-1…3 | zh-CN checked through catalogs, guards and the probe's zh-CN Global heading, not a full zh-CN screenshot pass (as the implementation noted) | |
| Failure, edge-case, lifecycle, and recovery evidence | 70% | 95% | imported, not synced, short window, long document, search fallback, very long names | | |
| User-surface, browser, and desktop-shell confidence | 70% | 95% | rendered at 390…1920 px; 0 errors | no packaged window (no shell change) | |
| Durable regression coverage quality and relevance | 80% | 95% | SMV-110…122 in the probe, the components' new specs | | |

- Overall post-repository confidence: 74%
- Overall final confidence: 95%
- Calculation method: simple average
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: none material; zh-CN layout not screenshotted in full

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser`
- Gap: rendered layout values and journeys against a real node, which the specs cannot show; it found F-1 and F-2.

## Desktop Application Validation

- Not applicable beyond the web-equivalent `nuxt dev` window: no shell, build-input or packaging change (rule 12 not triggered).

## Compatibility / Legacy Scope Check

- Backward compatibility in scope: `No`; compatibility-only behavior observed: `No` (the non-embedded run-list mode is removed, not kept).

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs` | Updated (by implementation, reviewed and kept: SMV-021/062, 030/101, 033, 065, 070/071) and extended by me: SMV-110…121; fixture: an h2 in `research-method.md`, `sites/deployment-checklist-and-rollback-pla.md`, a long workspace path for run 2 | API-003 | SMV-120 and SMV-121 failed on `7bf21db56e` (F-2, F-1) and pass from `0072beea13`; SMV-122 (the agent's name visible at 1024×768) failed on `0072beea13` and passes on `40a89a207b`. SMV-034 updated by implementation (`41bce17570`: leaves out the 5 s run-list re-reads), reviewed and kept |

- Test-code review: `Not Required — direct low-risk route`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Agent runtime | scripted AGY CLI | no provider needed | none for layout |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Render stack (server, beta, `nuxt dev`) | Yes | `touch stop` | `cleaned …/api652-memory-stack-…` |
| Probe runs ×3 | Yes | the probe's own cleanup | data roots removed |
| SMV-120 made non-fatal for one run | Yes | the probe restored from my backup | `grep TEMP-NONFATAL` finds nothing |
| `/tmp/api652` | Yes | removed when the Solution Designer asks | kept for the next round |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, parts only the user can check, or accepted as unverified risk: `None`
- Evidence decisions requested: `None`
- Next recipient from `get_handoff_rules`: `/delivery_engineer` (direct route, Medium / Low, test-code review not required)
- Notes:
  - Resolved across the rounds: F-1 (cards wider than a phone window; round 2), F-2 (the owner name cut beside its subtitle; round 2), F-3 (the name hidden at laptop widths; round 3).
  - Follow-ups in `follow-ups.md`: FU-001 (Solution Designer), FU-002 (implementation), FU-003 (code reviewer: the design reference has the same layout defects).
