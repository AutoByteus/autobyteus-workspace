# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results and confidence are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/inline-code-wrap/tickets/in-progress/inline-code-wrap/requirements-doc.md` (Approved, SR-001)
- Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/inline-code-wrap/tickets/in-progress/inline-code-wrap/investigation-notes.md`
- Solution Revision Record: `/home/autobyteus/workspace/.codex/worktrees/inline-code-wrap/tickets/in-progress/inline-code-wrap/solution-revision-record.md`
- Design Spec: `/home/autobyteus/workspace/.codex/worktrees/inline-code-wrap/tickets/in-progress/inline-code-wrap/design-spec.md` (Ready, SR-001)
- Supplemental Task Artifacts: `evidence/solution-probe/` (evidence)
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable` (Small / Low)
- Implementation Handoff: `/home/autobyteus/workspace/.codex/worktrees/inline-code-wrap/tickets/in-progress/inline-code-wrap/implementation-handoff.md` (IR-001, commit `b1955d4a7`)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct route)
- Delivery Revision Record: `N/A`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001
- Prior Investigation Reviewed: none for this ticket. The autobyteus-23 validation (`tickets/done/markdown-code-block-wrap/`) built MSP-50…52, which this ticket extends.
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

In rendered Markdown, a run with no break point that is longer than its line is broken inside it, so it fits. This covers inline code, links (file-action and linkified), prose and headings. Text with normal break points still breaks there (REQ-101, AC-107). No inline-code box, padding included, runs past the edge (REQ-102). This holds in the chat and in Markdown files, on desktop (including the 167 px Files viewer) and on the phone (REQ-103). Tables and display math keep their own scroll box, and fenced code is unchanged (REQ-104). Copy gives the original text (REQ-105).

The implementation makes two changes. `MarkdownRenderer.vue` sets `.markdown-renderer-segments .markdown-body { overflow-wrap: break-word }`. `tailwind.config.js` typography sets `code::before`/`code::after` to `content: 'none'`. The implementer also extended MSP-50…52: new fixture content, the inline tolerance removed, text-node `past`, the sideways-scrolling host check, and inline copies.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-101…SCN-106.
- Real-use scenarios added: none beyond the autobyteus-23 set already in MSP-50…52 (the inter-agent message, the maximized viewer, the 700 px drawer, the 360 px phone).
- Contrived scenarios: none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-101…104 overlong runs break inside | Changed | REQ-101; IMP-02/IMP-03 static | Running app: no text node or element past the root, on every surface and size |
| BEH-105 inline-code end padding | Changed | REQ-102; PRB-102/103, IMP-02 sweep | Running app: list item ending in inline code, no host scrolls sideways; sweep reused (AC-104) |
| AC-107 normal breaks unchanged | Preserved | DEC-004 | **New assertion** `midWordBreaks`: a break between two letters/digits is allowed only inside a token wider than its line |
| BEH-106 tables, math, fenced code | Preserved | REQ-104 | The autobyteus-23 assertions in MSP-50…52 stay green |
| BEH-107 copy | Preserved | REQ-105 | Code blocks, the inline path and the bare URL copied (desktop: Ctrl+C + clipboard) |
| autobyteus-23 heading links | Preserved | REQ-006 (23) | MSP-44…46 rerun (headings now wrap) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Frontend component / state | Yes | Renderer stylesheet; Tailwind typography config (`.prose` used only by the renderer) | IMP-01 specs, IMP-02 sweep, IMP-03 static | Real host containers, production CSS build, real copy | Browser (`test:e2e:mobile-shell`) |
| Browser integration / user journey | Yes | Layout and copy in Chromium | Static pages | RSK-101 | Browser |
| Desktop renderer / web-equivalent UI | Yes | Desktop chat and Files panel | — | Not yet run | `nuxt dev` desktop window |
| Desktop shell / Electron | No | CSS only | — | — | — |
| Backend, API, auth, lifecycle, persistence, workers, external | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/home/autobyteus/workspace/.codex/worktrees/inline-code-wrap` (branch `codex/inline-code-wrap`).
- Testing guideline: `/home/autobyteus/workspace/.codex/worktrees/inline-code-wrap/TESTING.md` (no closer one), read for this round. It is the same guideline as autobyteus-23: the browser-probe and phone-bundle rules, warm up before asserting, one heavy run at a time.
- Instructions: `mobile-shell-probe.mjs` header (prerequisites `pnpm -C autobyteus-server-ts build`, `pnpm -C autobyteus-web build:mobile-web`; `--cases`, `--output-dir`). `pnpm` runs through the shim `/tmp/pnpm-shim/pnpm` → `corepack pnpm`.
- Changed build-input paths: **`autobyteus-web/tailwind.config.js` is not on TESTING.md's Fresh-start list.** The list's web build entries are `nuxt.config.ts`, `build/**`, `electron/tsconfig*.json`, `generated/**`, manifests, tsconfig, scripts, workflows and contracts. The file is read by the build, but it is a styling config with no new dependency or import, and the release runner's Tailwind is the same locked version. No fresh-start case. The phone bundle is rebuilt from this worktree, which proves the production CSS build picks up the change.
- Secrets: N/A (scripted runtime).

| Component | Working Directory | Setup | Readiness | Cleanup |
| --- | --- | --- | --- | --- |
| Server build | worktree | `pnpm -C autobyteus-server-ts build` | `dist/app.js` | untracked build output |
| Phone bundle | worktree | `pnpm -C autobyteus-web build:mobile-web` | alpha serves `/mobile` (probe asserts) | untracked build output |
| Probe stack | `autobyteus-web` | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<fresh> --cases=…` | probe health waits, dev-server warm-up | probe `finally`; cleanup receipt |

Data: as in MSP-50…52. The fixture document is written into the probe's alpha workspace, the agent answers with it (`REPLY_FILE:`), and a PTM run sends it to its task agent (`send_message_to`). Phone Access pairing goes through public REST.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-code-wrap-cases.mjs` (MSP-50…52, extended by IR-001) | autobyteus-23 assertions, plus: nothing past the root (elements and text nodes), no sideways-scrolling host, inline copies | AC-101…103, AC-105, AC-106 | Needs Update | Reviewed the IR-001 diff: the assertions match REQ-101…105 and fail visibly (a missing inline element copies as `equal: false, missing: true`). AC-107 is not asserted (screenshot only) | Add the `midWordBreaks` assertion (AC-107) |
| `mobile-heading-links-cases.mjs` (MSP-44…46) | Heading links | autobyteus-23 REQ-006 | Still Valid | — | Rerun (headings now wrap) |
| Renderer/composable specs, font-size audit | Renderer structure, no px fonts | AC-105 (unit) | Still Valid | IMP-01 | Reuse |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-105 (unit), no px fonts | Renderer specs | Reused | IMP-01 | Ran on the same product tree (`b1955d4a7`) |
| API-02 | AC-107 (assertion validity) | The new `midWordBreaks` assertion on a static page | Temporary Probe | `node evidence/api-e2e/API-02-ac107-control.cjs <web node_modules> <cases module>` | Shows the assertion is quiet under the change and fires under `word-break: break-all`, so a pass in the running app means something. A one-off check of a test, not of the product |
| API-03 | AC-104 | Width sweep 150–1300 px | Reused | IMP-02 | Same product commit; AC-104 names implementation evidence |
| API-04 | — | Typecheck | Reused | IMP-04 | Same tree |
| MSP-44…46 | autobyteus-23 heading links (preserved) | Desktop Files, Skills, conversations, phone | Existing Test | same probe run | Headings now wrap |
| MSP-50 | AC-102, AC-105, AC-106, AC-107, RSK-101 | Desktop chat 1280/700: agent's answer, inter-agent message | Durable | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<fresh> --cases=MSP-44,MSP-45,MSP-46,MSP-50,MSP-51,MSP-52` | Running app, real hosts, real copy |
| MSP-51 | AC-101, AC-105, AC-106, AC-107, RSK-101 | Desktop Files viewer 167 px default, maximized, 700 px drawer | Durable | same run | The surface where FU-002 was measured |
| MSP-52 | AC-103, AC-105, AC-106, AC-107, RSK-101 | Phone bundle 390/360: answer, file viewer, inter-agent message | Durable | same run | Production CSS build; TESTING.md phone rule |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update

| Case ID | Path | Change | Why |
| --- | --- | --- | --- |
| MSP-50…52 | `autobyteus-web/tests/e2e/mobile-code-wrap-cases.mjs` | IR-001's extension kept as is. Added: `midWordBreaks` in `measureRoot` and its failure in `failuresOf` (AC-107) | AC-107 had no executable proof |

## Durable Coverage To Remove

None. The removal of the inline tolerance (`inlineCodePast`/`otherPast`) in IR-001 is required by REQ-101/REQ-102. That tolerance existed only for FU-002, which this ticket fixes.

## Desktop Application Validation Plan

The desktop window of the phone probe (`nuxt dev` against a probe-owned node), as in autobyteus-23. It is a CSS-only change, so it is web-equivalent. The probe owns its ports, data and browsers, and the user's running app is not touched.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| WebKit (iOS phone app), RSK-102 | Not available on Linux | Low: `overflow-wrap: break-word` and `content: none` are long-standing standard CSS | No | None |
| Electron shell, dark mode, Monaco | Not touched (same engine; no color rule; no Monaco code) | Negligible | No | None |
| Messages panel, Thinking, artifact/reference viewers | Same renderer and stylesheet; the narrower hosts (inter-agent, 167 px viewer, 360 px phone) are run | Low | No | None |

## Ambiguities Or Reroute Triggers

None at planning time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Durable coverage added / updated / removed: `Yes` (update: the AC-107 assertion in `mobile-code-wrap-cases.mjs`)
- Reroute Required Before Validation Execution: `No`
