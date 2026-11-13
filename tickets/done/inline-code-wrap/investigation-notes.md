# Investigation Notes

## Investigation Meta

- Package identifier: `inline-code-wrap` (Project Task `autobyteus-24`)
- Request / ticket: autobyteus-24, Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`; follow-up FU-002 of autobyteus-23
- Workspace root: `/home/autobyteus/workspace/.codex/worktrees/inline-code-wrap`
- Repository mode: `Git`
- Task worktree / branch: `/home/autobyteus/workspace/.codex/worktrees/inline-code-wrap`, branch `codex/inline-code-wrap`
- Resolved base: `origin/personal` @ `7b8bcf932fca35e8937dd3158d6a05ebbca5e227` (fetched 2026-11-13)
- Finalization target: `origin/personal`
- Bootstrap result: worktree created from the fetched base; ticket folder `tickets/in-progress/inline-code-wrap/`
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (2026-11-13, in this conversation): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md`, `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`, root `DESIGN.md`, `TESTING.md`
- Investigation status: complete

## Initial Request And Clarifications

- Original request: the user (2026-11-13), on autobyteus-23: markdown "should automatically wrap, instead of showing the horizontal scroll", on mobile and desktop. This Task carries FU-002: inline code with long paths runs past the edge. The user approved the Task ("That works. lets do it").
- The Task's suggestion to verify: `overflow-wrap: anywhere` on `.markdown-body :not(pre) > code` in `MarkdownRenderer.vue`.

## Source Log

| Date | Type | Source / Command | Why | Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-13 | Data | `tickets/done/markdown-code-block-wrap/evidence/implementation/IMP-04-real-pipeline/IMP-04-measure.log`, `evidence/api-e2e/MSP-50-52-summary.log` (MSP-51 row `1280-panel`) | Task evidence | Inline path 16 px past at a 310 px chat column; 159 px past in the 167 px Files viewer, which scrolls 143 px | — |
| 2026-11-13 | Code | `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue:184-226` | Current rules | autobyteus-23 rules: `pre`/`pre > code` wrap (line 193), table and `.katex-display` scroll boxes; nothing for inline text | — |
| 2026-11-13 | Code | `autobyteus-web/tailwind.config.js:79-84` | Inline code pseudo-elements | `'code::before'`/`'code::after'`: `content: '""'` (hides the typography plugin's default backticks, but still creates empty boxes) | Root of BEH-105 |
| 2026-11-13 | Code | `grep -rln "\bprose\b" components pages layouts app.vue` (autobyteus-web) | Reach of the config change | Only `MarkdownRenderer.vue` and the unused `FileDisplay.vue` (autobyteus-23 FU-001) use `.prose` | Config change reaches only rendered markdown |
| 2026-11-13 | Code | `autobyteus-web/tests/e2e/mobile-code-wrap-cases.mjs:16-17, 140-144, 197-198` | Existing running-app cases (MSP-50…52) | They tolerate inline code past the root (FU-002) | Tolerance to be removed; cases extended |

## Relevant Existing Behavior

See `requirements-doc.md` BEH-101…BEH-107.

## Runtime, Probe, Or Reproduction Findings

All probes run headless Chromium (`/usr/bin/chromium`, playwright-core) on a static page built from the app's real CSS: Tailwind compiled with `autobyteus-web/tailwind.config.js` (typography), `prismjs/themes/prism.css` and the `<style>` block of `MarkdownRenderer.vue` at the base commit; markdown rendered with the app's markdown-it options, a file-action link emulated as `<code><a class="event-monitor-file-action-link">…</a></code>`, tables wrapped as autobyteus-23 does. Content: the user's heading, an inline path, an action path, a bare URL, a long token, short inline code ending a list line, an 8-column table, a fenced block. Host widths 167 (Files viewer default), 202 / 262 (phone message / answer roots), 310 (390 px chat column), 1248.

| ID | Method / Command | Observation | Established | Implication | Artifact |
| --- | --- | --- | --- | --- | --- |
| PRB-101 | `NODE_PATH=<web node_modules> node evidence/solution-probe/probe.cjs <checkout> <web node_modules> <out> [candidate.css]` | **Before:** text past the root at 167 px: heading 209, inline code 159, links/URL 454, prose 764 px; at 310 px: 66 / 16 / 311 / 621 px; host scrolls sideways (764 px at 167). **A** (`anywhere` on inline code only): code fixed, heading/link/prose unchanged, host still scrolls 621–764 px. **B** (`overflow-wrap: break-word` on `.markdown-body`): no text past at any width, table keeps 1835 px in its scrolling box, host 0 except 5 px at 310 (PRB-102). **C** (`anywhere` on `.markdown-body`): no overflow but the table is squeezed to 221–1248 px with cell words broken. **F** (B + `code::before/after { content: none }`): no text past, host 0 at all widths, table 1835 px scrolling, `pre` 0, copy equal | Reproduced, Measured | DEC-001, DEC-002 | `evidence/solution-probe/{before,A,B,C,F}/shot-*.png`, `*.css` |
| PRB-102 | `node evidence/solution-probe/find.cjs`, variants `D.css` (B + `anywhere` on inline code), `E.css` (B + `box-decoration-break: clone`), and three page variants (pseudo `content: none`; padding moved to margin; no horizontal padding) | The 5 px is the inline code `precedent-review.md` at the end of a list line: its right padding hangs past. D and margins: unchanged; E: worse (3–12 px). Removing the empty `::before`/`::after` (`content: none`) or the horizontal padding removes it | Reproduced | DEC-003: cause is the empty pseudo-element boxes | console output |
| PRB-103 | `node evidence/solution-probe/sweep.cjs <node_modules> <page.html> 150 1300` | Host overflow per 1 px width step: **before** 781 of 1151 widths; **B** 21 widths (1–6 px, all the inline-code end padding: e.g. 179–183, 197–201, 274–275); **F** 0 | Measured | REQ-102, AC-104 | console output |
| PRB-104 | `node evidence/solution-probe/perfprose.cjs` | 60 KB unbroken run in a paragraph with `long-unbroken-text`, 310 px: before insert 11–30 ms / relayout 0 ms; with F insert 8–13 ms / relayout 4–6 ms | Measured | QR-101: no concern | console output |

- Limits: static page with the app's CSS, not the running app; the running-app cases (MSP-50…52) close this gap. The probe reads the main checkout's installed `node_modules` and source at the same base commit (`7b8bcf932`), read only.
- Temporary diagnostics: none in the worktree.
- Reproduction for implementation: `probe.cjs` and `sweep.cjs` without a candidate show the overflow; with `F.css` they show the target.

## Architecture Investigation Findings

- Same production paths as autobyteus-23 (chat: `AgentEventMonitor -> AIMessage -> segment -> MarkdownRenderer`; files: `FileViewer -> MarkdownPreviewer -> MarkdownRenderer`); the rendered HTML lands in `.markdown-renderer-segments .markdown-body.prose`.
- `overflow-wrap` is inherited, so one rule on `.markdown-body` reaches inline code, links, prose and headings; `pre` keeps its own `anywhere` rule (autobyteus-23); table cells inherit `break-word`, which does not lower min-content, so tables keep their size (PRB-101 B/F).
- The typography config is the owner of how inline code's backticks are hidden; `content: none` is the correct way to remove a generated box and changes nothing visible.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Related REQ | Status | Approval |
| --- | --- | --- | --- | --- | --- |
| `evidence/solution-probe/` (`probe.cjs`, `sweep.cjs`, `find.cjs`, `perfprose.cjs`, `A–F.css`, screenshots) | Solution Designer | PRB-101…104 | REQ-101…105 | Final | Evidence |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution / Owner | Status |
| --- | --- | --- | --- | --- |
| RSK-101 | Risk | A host container could still overflow in the running app | MSP-50…52 assertions without the inline tolerance | Open, low |
| RSK-102 | Risk | WebKit (iOS) may treat the end padding differently | Rule is standard; iOS not run by the probe (Linux); record as not run | Open, low |

## Notes For Architecture Design

Two declarations: `overflow-wrap: break-word` on `.markdown-renderer-segments .markdown-body` (renderer stylesheet), and `content: none` for `code::before`/`code::after` in the typography config. Update MSP-50…52 to require no inline overflow and add the heading/URL/token/list content.
