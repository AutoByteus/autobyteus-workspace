# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/markdown-code-block-wrap/tickets/in-progress/markdown-code-block-wrap/requirements-doc.md` (Approved, SR-001)
- Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/markdown-code-block-wrap/tickets/in-progress/markdown-code-block-wrap/investigation-notes.md`
- Solution Revision Record: `/home/autobyteus/workspace/.codex/worktrees/markdown-code-block-wrap/tickets/in-progress/markdown-code-block-wrap/solution-revision-record.md`
- Design Spec (required on every route): `/home/autobyteus/workspace/.codex/worktrees/markdown-code-block-wrap/tickets/in-progress/markdown-code-block-wrap/design-spec.md` (Ready, SR-001)
- Supplemental Task Artifacts: `evidence/solution-probe/` (evidence, not behavior-defining)
- Design Review Report: `N/A — not applicable` (architecture review not selected: Small / Low)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/home/autobyteus/workspace/.codex/worktrees/markdown-code-block-wrap/tickets/in-progress/markdown-code-block-wrap/implementation-handoff.md` (IR-001, commit `417e06da9`)
- Implementation Revision Record: `/home/autobyteus/workspace/.codex/worktrees/markdown-code-block-wrap/tickets/in-progress/markdown-code-block-wrap/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 (direct route, Small / Low)
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

Every fenced code block in rendered Markdown (with or without a language) wraps long lines to its box; an unbreakable run breaks inside the box; original line starts, indentation and blank lines stay; selection copy gives the original text (REQ-001, REQ-002, REQ-004). A table that cannot fit and a long display equation scroll sideways inside their own box; the message or document never gets wider than its column, and a table that fits looks as before (REQ-005). This holds on every surface that uses `MarkdownRenderer.vue`: the chat (event monitor) and Markdown file previews, on desktop and on the phone bundle (REQ-003). Inline code, Mermaid, heading links, file-path actions beside fenced code, highlighting, Monaco are preserved (REQ-006).

Implementation (IR-001): one stylesheet rule set in `MarkdownRenderer.vue`, the markdown-it plugin `utils/markdownItScrollableTables.ts` used on `mdWithPrism`, `padding: 0.5em 0` on `.katex-display` (RSK-002 fix). The implementation's evidence is a jsdom spec (structure, text), the static probe with app CSS (IMP-03) and the real pipeline output laid out in the host container classes (IMP-04). Not yet run: the running app (desktop `nuxt dev` against a real node) and the production phone bundle, nor the real host containers (RSK-001).

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 (desktop chat), SCN-002 (phone run screen), SCN-003 (desktop Files panel), SCN-004 (phone file viewer), SCN-005 (language fence), SCN-006 (wide table, long display equation, tall equation), SCN-007 (selection copy), SCN-008 (in part: an inter-agent message in the same conversation), SCN-009 (in part: Mermaid, file-path action beside fenced code, heading links).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - **A fenced block that holds an absolute file path, in the Event Monitor.** The Event Monitor renders a file-action link *beside* such a block (`useMarkdownSegments.ts:155`, `div.event-monitor-file-action-links` after the `pre`). The user's own report is of this kind (a draft and its path). The link must stay outside the copied code and outside the wrapped box, and it is how the user opens the file in the Files panel / phone viewer (SCN-003/SCN-004 trigger).
  - **The same Markdown sent by another agent** (`send_message_to`), shown as an inter-agent message in the receiving agent's conversation: a narrower host (`InterAgentMessageSegment.vue`: icon + `min-w-0 flex-1` + toggle) inside the same `AIMessage` column (RSK-001).
  - **The phone at its narrowest supported width (360×800)**, which the phone shell's MSP-11 covers for every screen.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 no-language fence wraps | Changed | REQ-001; IMP-03/IMP-04 static | Prove in the running desktop chat, desktop Files panel, phone chat, phone viewer |
| BEH-002 language fence wraps (rule moved) | Changed (same effect) | REQ-001/002; IMP-01 spec | Prove highlighting kept + no overflow in the running surfaces |
| BEH-004 wide table scrolls in its own box | Added | REQ-005; IMP-01/02 specs | Prove box scrolls (a real wheel scroll on desktop), narrow table full width, body never wider |
| BEH-005 display math scrolls in its own box | Added | REQ-005; IMP-04 | Prove box scrolls at narrow widths and nothing is clipped vertically (RSK-002) |
| BEH-006 selection copy | Preserved | REQ-004 | Real Ctrl+C on desktop (clipboard read), selection text on the phone |
| BEH-003 inline code | Preserved | FU-002 | Report its own overflow apart; not a code-block failure |
| BEH-007 every surface | Changed | REQ-003 | Chat (agent text + inter-agent), Files panel, phone chat, phone viewer |
| BEH-008 Mermaid, file actions, heading links | Preserved | AC-009 | Mermaid diagram renders in the same message; fenced-code file action beside the block opens the file; heading-link cases MSP-44…46 rerun |
| BEH-009 Monaco edit view | Preserved | AC-009 | Not touched by the change (CSS scoped to `.markdown-renderer-segments .markdown-body`); no case |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No | — | — | — | — |
| Frontend component / state | Yes | `MarkdownRenderer.vue` stylesheet; `useMarkdownSegments` HTML (table wrapper after DOMPurify) | jsdom spec (structure/text), IMP-03/IMP-04 static layout | Layout in the real app's containers and bundle (CSS order, scoped styles, Nuxt CSS extraction) | Browser probe on the running app |
| Browser integration / user journey | Yes | Layout and copy in Chromium | IMP-03/IMP-04 static pages | Real host containers (RSK-001), real copy, real scrolling | Browser probe (`test:e2e:mobile-shell`) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | The desktop window's chat and Files panel | — | Not run in the app yet | `nuxt dev` desktop window against a probe-owned node |
| Desktop shell / Electron-specific integration | No | CSS only; no preload/IPC/window code | — | The Electron renderer is Chromium with the same CSS (QR-001) | None (web-equivalent) |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No | `Not Affected` | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/home/autobyteus/workspace/.codex/worktrees/markdown-code-block-wrap` (branch `codex/markdown-code-block-wrap`)
- Project type and runtime stack: pnpm monorepo; Nuxt 3 web app (desktop renderer and phone `/mobile` bundle), Node server `autobyteus-server-ts`; Linux container, Node 22, Chromium `/usr/bin/chromium`, playwright-core.
- Project testing guideline path(s): `/home/autobyteus/workspace/.codex/worktrees/markdown-code-block-wrap/TESTING.md` (no closer `TESTING*.md` under `autobyteus-web/`).
- Conflicting, missing, or unclear project instructions: `pnpm` is not on `PATH` here; scripts run through the shim `/tmp/pnpm-shim/pnpm` → `corepack pnpm` (as the implementation did). The probe itself spawns `corepack pnpm dev`.
- Changed build-input paths: `None`. `git diff --name-only 188369c71...HEAD` (outside `tickets/`): `MarkdownRenderer.vue`, `useMarkdownSegments.wrapping.spec.ts`, `useMarkdownSegments.ts`, `docs/content_rendering.md`, `markdownItScrollableTables.ts`; this round adds `autobyteus-web/tests/e2e/*.mjs` and `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (no new workspace-package import). No fresh-start build case.
- Required environment variables or secrets available: `N/A` (scripted runtime, no provider keys).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Test layers, Choosing the path | Layers | Renderer UI: web unit tests + a browser probe; renderer behavior the phone also offers: a case in `pnpm -C autobyteus-web test:e2e:mobile-shell` |
| `TESTING.md` § Browser probes, Rules | Probe rules | Probe owns its stack, fresh `--output-dir`, fails on browser errors, warm the cold `nuxt dev`, assert DOM; one heavy run at a time |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` header | The phone probe | Prerequisites `pnpm -C autobyteus-server-ts build`, `pnpm -C autobyteus-web build:mobile-web`; `--cases=…`, `--output-dir=…`; case IDs unique across `*-cases.mjs` (checked at start) |
| `autobyteus-web/tests/e2e/mobile-heading-links-cases.mjs` | Precedent (autobyteus-480) | Desktop window context with `attachToBrowserContext`; a phone browser mapping a private host to 127.0.0.1, paired through Phone Access; run opened from the Runs view; files opened from the run's file-action links |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Scripted AGY runtime of the probe (`AGY_FAKE_CASE=linked_skills`) | Every reply is quoted (`ECHO:"…"`, `CALLED:{…}`): it cannot give an agent a raw Markdown answer → needs one narrow keyword (below) |
| `autobyteus-web/docs/content_rendering.md` | Renderer behavior | File-action links render beside fenced code; wrapping rules |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree | `pnpm -C autobyteus-server-ts build` | Prisma client + `dist/app.js` | `dist/app.js` exists | build output, untracked |
| Phone bundle | worktree | `pnpm -C autobyteus-web build:mobile-web` | `autobyteus-web/dist/public` | `/mobile` served by alpha (probe asserts) | build output, untracked |
| Probe stack (alpha, beta, `nuxt dev`, headless Chrome) | `autobyteus-web` | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<fresh> --cases=…` | Free ports, temp data roots and HOMEs | Probe health waits | Probe `finally`: `evidence.cleanup` in `mobile-shell-probe.json` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Markdown document with every shape (AC-005…AC-008) | IMP-04 `fixture.md` shapes, plus a heading, a Mermaid block and a fence holding the file's own absolute path; written into the probe's alpha workspace | Test-owned temp workspace | Removed with the probe root |
| An agent's Markdown answer in the chat | New scripted-runtime keyword `REPLY_FILE:<absolute path>` (the agent answers with that file's text, unquoted) | Test fixture only | — |
| Another agent's Markdown message | PTM run `delegate_task` → task agent; `send_message_to` with the same Markdown (as MSP-46) | Public APIs | Removed with the probe root |
| Phone identity | Phone Access pairing session on alpha (public REST) | Phone's own credential | Context closed |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/composables/__tests__/useMarkdownSegments.wrapping.spec.ts` (new, IR-001) | Table wrapper after DOMPurify, in a list item, alignment kept; fence text equals source with and without a language | AC-005, AC-007, AC-008 (structure/text) | Still Valid | IMP-01, IMP-02 (fails without the plugin) | Keep; reuse result |
| `MarkdownRenderer.spec.ts`, `MarkdownRenderer.headingLinks.spec.ts`, `useMarkdownSegments.spec.ts`, `useMarkdownSegments.sanitization.spec.ts`, Mermaid specs | Existing renderer behavior | AC-009 | Still Valid | IMP-01 | Rerun the renderer folder myself (API-01) |
| `tests/integration/app-font-size-fixed-px-audit.integration.test.ts` | No px font sizes in `MarkdownRenderer.vue` | AC-009 | Still Valid | IMP-01 | Rerun in API-01 |
| `autobyteus-web/tests/e2e/mobile-heading-links-cases.mjs` (MSP-44…46) | Heading links in rendered Markdown on desktop Files, Skills page, conversations, phone | AC-009 (heading links) | Still Valid | — | Rerun in the same probe run |
| `mobile-shell-probe.mjs` MSP-11 | No horizontal scroll on every phone screen (its own data, no code blocks) | — | Out Of Scope (no code-block content) | — | None |
| `components/projects/__tests__/ProjectTaskBoard.spec.ts` (timed out once in IMP-01) | Project Tasks board search | — | Out Of Scope | `grep` finds no use of `MarkdownRenderer`/`useMarkdownSegments` in `components/projects/`; the test exercises no changed file; it passed 16/16 alone | None |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-005, AC-007, AC-008 (structure/text), AC-009 | Renderer specs, composable specs, font-size audit | Existing Test | `pnpm -C autobyteus-web exec vitest run components/conversation/segments/renderer composables/__tests__/useMarkdownSegments tests/integration/app-font-size-fixed-px-audit.integration.test.ts --no-watch` | Narrowest repository layer on the validated commit |
| API-02 | all (regression) | Whole web unit suite | Reused | IMP-01 | Ran on `417e06da9`; `2dd97f9e8` changes only `tickets/`. Its one failure is in a spec that exercises no changed file |
| API-03 | — | Web typecheck | Reused | IMP-05 | Same source as `417e06da9` |
| API-04 | AC-001/003 (static), AC-005…AC-008, RSK-002 | Real pipeline output with app CSS in host classes | Reused | IMP-04 (and IMP-03) | Same commit; supporting evidence below the running app |
| MSP-50 | AC-001, AC-005, AC-006, AC-007, AC-008, AC-009 (Mermaid, fenced-code file action), RSK-001, RSK-002, REQ-003 | Desktop window (`nuxt dev` against alpha): the agent's Markdown answer and the same Markdown as an inter-agent message, at 1280×900 and 700×900 | Durable | `test:e2e:mobile-shell --cases=MSP-50,…` | Running app, real containers, real copy (Ctrl+C → clipboard) and a real wheel scroll of the table box |
| MSP-51 | AC-003, AC-005…AC-008, RSK-001 | Desktop Files panel, the `.md` opened from the file-action link beside the fence: at 1280×900 in the viewer beside the file tree (its default, narrow: 167 px) and with "Maximize view" (wide), and at 700×900, where the right tools fold into a strip, from the strip's Files button (drawer) | Durable | same run | The file preview host in the running app; "wide and narrow panel" of AC-003 are the viewer's default and maximized states |
| MSP-52 | AC-002, AC-004, AC-005…AC-008, RSK-001 | Production phone bundle at 390×844 and 360×800: the agent's answer, the inter-agent message, and the phone file viewer opened from the file-action link | Durable | same run | TESTING.md: renderer behavior the phone offers is proven on the phone bundle |
| MSP-44…46 | AC-009 (heading links) | Existing cases | Existing Test | same run | Preserved renderer behavior in the running app |

- Test progress log needed: `Yes`

Fixture rule learned in round 1: the Event Monitor gives a fenced block a file-action link only for a line that is a whole absolute path (`findAbsoluteFilePathCodeCandidates` trims each line), so the path fence has the path on its own line. The phone's swipe is a CDP touch sequence (`Input.dispatchTouchEvent`); `Input.synthesizeScrollGesture` does not scroll in this headless Chromium (checked on a static page: 0 px vs 474 px).

Per surface and width, each case measures inside every rendered Markdown root that holds the marker: every `pre` (`scrollWidth ≤ clientWidth`, computed `white-space: pre-wrap`), the elements past the root's right edge outside the scroll boxes (inline code reported apart, FU-002), each ancestor up to `<html>` with horizontal overflow (RSK-001), the page's horizontal scroll, the two table boxes (narrow: table width = box width, no scroll; wide: scrolls, its last cell reachable), the three `.katex-display` boxes (`scrollHeight ≤ clientHeight`, i.e. no vertical clipping; the long ones scroll at narrow widths), the copied text of each code block against its fence source, highlighting tokens in the python block, the Mermaid SVG, and the file-action link beside the path fence (outside `pre`). Screenshots: viewport and the message/document element.

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| MSP-50, MSP-51, MSP-52 | `autobyteus-web/tests/e2e/mobile-code-wrap-cases.mjs` (new; called from `mobile-shell-probe.mjs` after the heading-links cases, listed in its header) | Layout in the real containers can regress through any host or stylesheet change; the phone case is required by TESTING.md |
| (fixture) | `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`: `REPLY_FILE:<absolute path>` in the `linked_skills` turn | The only way for a scripted agent to answer with raw Markdown (every other reply is quoted); narrow, opt-in by keyword, no effect on existing keywords |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| MSP-50…52 | `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Import and call the new cases module; header lines for the cases | Same pattern as `runHeadingLinksCases` |
| MSP-44…46 (baseline fix) | `autobyteus-web/tests/e2e/mobile-heading-links-cases.mjs` | Attach the desktop window's browser-line listeners after the cold `nuxt dev` warm-up, as TESTING.md § Browser probes requires | Found in round 1: run alone, these cases end the probe in `Fail` from warm-up lines only (`504 (Outdated Optimize Dep)`, failed dynamic import of `pages/index.vue`) although every case passes; own commit, labelled a baseline fix (TESTING.md Rule 9) |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron wrapping the Nuxt renderer.
- Testing guideline used: TESTING.md (browser probe for renderer UI; an isolated desktop instance for shell behavior).
- Web-equivalent behavior: all of it (CSS and rendered HTML in Chromium).
- Shell-specific or lifecycle behavior: none changed.
- Chosen approach: the desktop window of the phone probe (`nuxt dev` against a probe-owned node, real Chromium). An isolated Electron instance would add no evidence for a CSS-only change (QR-001: the same Chromium engine and CSS).
- How the run avoids disturbing a running desktop application: probe-owned ports, data roots and browsers; the user's server on port 8000 and the other browsers on this machine are not touched.

## Live Environment And Fixture Plan

- Startup order and commands: server build → phone bundle build → `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=/tmp/aee-23/probe-<n> --cases=MSP-44,MSP-45,MSP-46,MSP-50,MSP-51,MSP-52`.
- Environment choices that materially affect the run: desktop viewport 1280×900 and 700×900 (AC-001/AC-003 window sizes), phone 390×844 and 360×800 with `isMobile`, `deviceScaleFactor: 2`; English locale.
- Health / readiness checks: the probe's own (node health, `/mobile` served, dev server warm-up).
- Seed data / fixtures: as in the data table above.
- Requirement-linked journeys: open the run from the Runs view / phone run list; open the task agent's conversation; click / tap the file-action link beside the path fence to open the file.
- Evidence: `mobile-shell-probe.json` (per-case measurements), screenshots per surface and width, excerpt of the probe log.
- Owned processes and temporary state: probe stack (removed in its `finally`), `/tmp/aee-23/` build and run logs.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Monaco Edit view (BEH-009) | The change touches no Monaco code; the rules are scoped to `.markdown-renderer-segments .markdown-body`; files opened from the Event Monitor are read-only | Negligible | No | None |
| Thinking, task-notification segments, Messages panel, artifact/reference viewers (rest of SCN-008) | Same `MarkdownRenderer` and stylesheet; the inter-agent message (a narrower host) and the two file previews are run | Low | No | None |
| Packaged Electron shell | CSS-only change, web-equivalent (QR-001) | Low | No | None |
| Dark mode | No color rule changed | Negligible | No | None |

## Ambiguities Or Reroute Triggers

None at planning time. The inline-code overflow at narrow chat widths is FU-002 (preserved behavior), measured and reported apart.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added: `mobile-code-wrap-cases.mjs`, the `REPLY_FILE:` keyword; updated: `mobile-shell-probe.mjs`; baseline fix: `mobile-heading-links-cases.mjs`)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: —
- Notes: the durable test changes go in their own commit on the ticket branch.
