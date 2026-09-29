# Investigation Notes

## Investigation Meta

- Package identifier: `project-testing-guideline`
- Request: Make the team's testing skills project-agnostic (they should discover and follow the project's own testing guideline) and write the AutoByteus workspace's project testing guideline at the repository root, now that isolated desktop instances exist.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline`
- Repository mode: `Git` (two repositories)
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline` / `codex/project-testing-guideline` (autobyteus-workspace). autobyteus-mcps: task worktree/branch to be created at implementation from `origin/main` @ `6b39562` (local `/Users/normy/autobyteus_org/autobyteus_mcps` `main` = `origin/main`). autobyteus-agents is no longer part of this ticket (SR-002).
- Resolved base: autobyteus-workspace `origin/personal` @ `39e512edd`; autobyteus-mcps `origin/main` @ `6b39562`.
- Finalization targets: autobyteus-workspace `origin/personal`; autobyteus-mcps `origin/main`.
- Bootstrap result: workspace worktree created; ticket folder created.
- Bootstrap blocker: None
- Current solution revision ID: `SR-006`
- Investigation status: requirements and architecture investigation complete (Source Log; §SR-003 probes P-D1..P-D3; close-tab facts per ARCH-REV-001).

## Initial Request And Clarifications

- Original request (2026-09-29): with isolated desktop instances available, E2E testing agents can build a test Electron app and control it for real testing; the current testing guidance is outdated ("prefer browser development path" is no longer right).
- User direction:
  1. The skill must not cover project-specific things; it should tell the agent to check whether the project has testing guidelines and follow them. Project-specific testing belongs in the project's own testing guideline, so the skill works in any project and each project supplies its own guideline.
  2. The testing guideline lives in the project root, not under `docs/`.
- Proposed name `TESTING.md` — pending user confirmation (DEC-001).

## Source Log

| Date | Source Type | Source | Why | Finding |
| --- | --- | --- | --- | --- |
| 2026-09-29 | Code | `autobyteus-agents/agent-teams/software-engineering-team/agents/api-e2e-engineer/skills/api-e2e-engineer/SKILL.md` (220 lines) | Canonical API/E2E skill | Project-specific testing policy embedded: frontmatter description and responsibility line 21 ("browser-preferred validation of web-equivalent desktop behavior, with actual desktop execution reserved for shell-specific last-resort evidence"); §Desktop Application Validation Strategy lines 88-94 ("Prefer the project's browser development path…", "Treat execution of the actual desktop application as the last resort…"). Generic, reusable content elsewhere: execution discovery (lines 77-86, already reads `AGENTS.md`/`README`/manifests), coverage investigation, confidence scoring (lines 125-151), environment safety/cleanup (lines 83-86, 180), screenshots as supporting evidence (line 176). No rule to look for a project testing guideline. |
| 2026-09-29 | Code | `…/implementation-engineer/skills/implementation-engineer/SKILL.md` lines 120-128 (Frontend Implementation Feedback Loop) | Same pattern elsewhere? | Line 124: "For a web-rendered desktop application, prefer its browser or development renderer when that faithfully exercises the UI; do not disrupt an unrelated user-running desktop process…" — project-type-specific preference; the non-disruption clause is universal. |
| 2026-09-29 | Code | other team skills (architecture-reviewer, code-reviewer, delivery-engineer, solution-designer) | Same pattern? | No project-specific testing-path wording found. |
| 2026-09-29 | Code | `autobyteus-workspace-superrepo/.claude/skills/*` | Local copy seen earlier | Untracked local copy of the team skills (not in git); canonical source is autobyteus-agents. |
| 2026-09-29 | Doc | workspace root listing; `find -name AGENTS.md`; README headings | Existing project testing docs | No root testing guideline. Testing knowledge is scattered: README §"Packaged Electron API/E2E testing" (l.344), §"Local full-stack development" (l.393), §"Testing (Codex Runtime)" (l.451); `autobyteus-web/README.md` §Testing (Vitest, colocated `__tests__`); `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md`; root scripts `test:e2e`, `test:e2e:real(:preflight)`; `autobyteus-web/tests/e2e/*-probe.mjs` (headless Chromium against the web dev path); `docs/isolated-app-instances.md` (isolated desktop instances, delivered in v1.4.91-beta.6). |
| 2026-09-29 | Evidence | `tickets/done/agent-isolated-app-recording/` (API/E2E reports) | Real practice | The last ticket's API/E2E validation built the app from the worktree, launched isolated instances and drove them via the browser-automation CLI — i.e., current practice already exceeds the skill's "last resort" rule. |

## Relevant Existing Behavior

| Behavior ID | Kind | Current Behavior | Evidence |
| --- | --- | --- | --- |
| BEH-001 | Contract (skill) | API/E2E skill prescribes browser-first / desktop-last-resort for every project | api-e2e SKILL.md l.3, l.21, l.88-94 |
| BEH-002 | Contract (skill) | API/E2E skill discovers run/test instructions from AGENTS.md, README, manifests, but has no notion of a project testing guideline | l.77-86 |
| BEH-003 | Contract (skill) | Implementation-engineer frontend loop prefers the browser renderer for web-rendered desktop apps | impl SKILL.md l.124 |
| BEH-004 | Doc | AutoByteus workspace has no root testing guideline; testing knowledge scattered across README sections, sub-project READMEs/AGENTS.md, scripts, probes and the isolated-instance guide | Source log |

## Assumptions, Unknowns, Risks

| ID | Type | Description | Resolution |
| --- | --- | --- | --- |
| U-001 | Unknown | File name for the root guideline | DEC-001 (user) |
| R-001 | Risk | Removing browser-first from the skill without a project guideline could make agents over-use expensive desktop runs in projects lacking guidance | Skill keeps generic evidence-selection principles (smallest direct surface that closes the confidence gap) + fallback rule |
| R-002 | Risk | Guideline duplicating README/guide content drifts | Guideline summarizes and links; single sources stay authoritative |
| R-003 | Risk | Local untracked `.claude/skills` copies stay stale | Out of scope; noted for the user |

## Notes For Architecture Design

- Documentation-only change across two repositories; no runtime code.
- Keep API/E2E skill structure (responsibilities, sequence, coverage/confidence rules, reports) intact; change only project-specific policy and add discovery/precedence rules.

## SR-003 Investigation — Native JavaScript dialogs in browser-automation (autobyteus-mcps)

Scope added by user 2026-09-29 ("if the browser automation could handle it, let's also improve it in the current ticket … including the testing MD").

| Source / Probe | Observation |
| --- | --- |
| `browser-automation/src/browser_automation/**` (grep `dialog`) | No dialog handling in any tool. Only the recorder worker registers a no-op `dialog` listener (`recording/worker.py:165-167`) to keep dialogs open while recording. |
| Delivered reports of `agent-isolated-app-recording` (MP-005) | Recorder no-op listener validated on headless Chrome and Electron; side effect: while a page dialog is open, new browser-automation connections wait until it is answered. Evidence that Electron page dialogs flow through CDP. |
| P-D1 (headless Chrome, attach-only CLI, page with `confirm('Delete this item?')`) — `run-script` clicking the button | Call returned `ok:true`; `confirm()` returned `false` (auto-dismissed by Playwright's default during the call); no indication to the agent. |
| P-D2 — dialog opened 1.5 s after a call (between calls), then `read-page` and `list-tabs` | Both failed after ~20 s with `BROWSER_UNAVAILABLE` "Chrome is unavailable at the configured CDP endpoint" (misleading); raw CDP HTTP `/json/version` still answered. |
| P-D3 — fresh raw CDP client on the page target: `Page.handleJavaScriptDialog{accept:true}` | `-32602 "No dialog is showing"`; subsequent `Runtime.evaluate` hung (page blocked). A client attached after the dialog opened cannot answer it; `Page.enable` also did not return (P-D3a). Evidence: `evidence/page.html`, `evidence/cdp2.mjs`. |

Implications: dialogs opened *during* an operation are observable and answerable by that operation's connection (Playwright `dialog` event); dialogs opened *between* operations block the tab and cannot be answered by a later CDP client — only detected/explained (then answered by the user or OS-level tools such as computer-use on Linux, or the tab closed).

### SR-006 additions

- `application.py:157-165` `close_tab` → `page.close()` without `run_before_unload` → `beforeunload` never runs; `navigate` (`page.goto`) does not raise `beforeunload` (ARCH-REV-001 ARCH-DR-001). Decision: `close-tab` unchanged.
- Playwright: with a `dialog` listener registered the library does not auto-dismiss; the recorder already relies on this (`recording/worker.py:165-167`).
- Unknown (validation / escalation): whether a pending dialog stays open after the operation's client disconnects (Chrome, Electron). P-D2 shows a dialog opened with no client attached stays open.
- Computer-use X tools (`computer-use-mcp`, Linux/X11) can screenshot and click browser/Electron dialogs on a visible display; no macOS equivalent in the toolset.
