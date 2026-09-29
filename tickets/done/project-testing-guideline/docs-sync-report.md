# Docs Sync Report

## Scope

- Ticket: `project-testing-guideline`
- Trigger: code_reviewer delivery handoff after CRR-002 Pass (API/E2E API-REV-001 Pass, 95.0%; source review CRR-001 Pass, 9.3/10). Route: reviewed, `task_size=Medium`, `architectural_risk=High`. Delivery does not change this classification.
- Bootstrap base reference: workspace `origin/personal@39e512edd`; autobyteus-mcps `origin/main@6b39562`
- Integrated base reference used for docs sync:
  - Workspace: `origin/personal@8f57d16d1`, merged as `5039ad9f5`. That base brings in the isolated-app free-control-port default (`affe11bdf`).
  - mcps: `origin/main@291188d`, merged as `9ac9770`. That base removes the computer-use, PDF and image-audio MCP projects and changes one browser-automation `SKILL.md` line.
- Post-integration verification reference: `release-deployment-report.md` § Initial Delivery Integration Refresh; logs in `delivery-evidence/`.

## Why Docs Were Updated

- Summary:
  - The ticket's own deliverable is documentation: root `TESTING.md` and its links, plus the browser-automation dialog documentation.
  - Delivery made three kinds of docs-sync corrections on the integrated state:
    1. **Semantic merge fix.** `TESTING.md` said the control-port default is 9333. The integrated base now picks a free control port and reports `instanceId`/`controlPort`, so the rules now tell readers to use the reported values.
    2. **API/E2E observations.** OBS-A: in MCP results `dialogs` is absent or `null` when no dialog occurred. OBS-B: Electron has no `window.prompt()`, so prompt handling applies to browsers only.
    3. **Removed tool.** The docs pointed to "computer-use on Linux" as the on-screen remedy. The integrated mcps base removed the `computer-use-mcp` project, so the wording is now generic: "an OS-level screen-control (computer-use) tool where one is available". This matches REQ-011 ("answered on screen by the user or OS-level tools"). Behavior is unchanged.
- Why this should live in long-lived project docs: agents choose and run test paths from `TESTING.md` alone (AC-008), and operate dialogs from `SKILL.md`. Stale port or tool guidance would make them fail.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `TESTING.md` (new) | Ticket deliverable (REQ-006) | Updated | Rules 3/4/5 use the reported `controlPort`/`instanceId`. Rule 7 now has the prompt note and generic on-screen remedy. The control-port line says "as reported by `start`". |
| `docs/isolated-app-instances.md` | Ticket added the TESTING link and "Page dialogs"; base changed ports | Updated | Merged cleanly. Delivery added the Electron-has-no-`prompt()` note. Port guidance comes from the base. |
| `README.md` | Ticket links; base free-port paragraph | Updated (conflict resolved) | Both paragraphs kept: free-port guidance, then the TESTING.md link |
| `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md` | Links (REQ-007) | No change | Links resolve |
| mcps `browser-automation/SKILL.md` | Dialog docs (REQ-011) | Updated | OBS-A, OBS-B, generic on-screen remedy (2 places). The base's controlPort line is kept. |
| mcps `browser-automation/README.md` | Dialog architecture paragraph | No change | Already says "user or OS-level tools"; has no `dialogs: null` claim |
| `docs/isolated-app-instances.md` recording section | Dialog-during-recording wording | No change | Consistent |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `TESTING.md` | Correction | Free control port default; `stop`/`restart <instanceId>`; prompt browser-only; generic computer-use remedy | Integrated base behavior; OBS-B; removed tool |
| `docs/isolated-app-instances.md` | Note | `--prompt-text` applies in browsers; the Electron app has no `window.prompt()` | OBS-B |
| `README.md` | Merge resolution | Kept the base free-port paragraph and the ticket's TESTING.md link | Both are true |
| mcps `browser-automation/SKILL.md` | Correction | `dialogs` absent or `null`; prompts browser-only; generic computer-use remedy | OBS-A, OBS-B, removed tool |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Dialog model (DEC-007) | Agents decide per command (`--dialog`); without a decision the page is unblocked and `DIALOG_DECISION_REQUIRED` is returned. Dialogs left open result in `PAGE_BLOCKED` within 8 s. | requirements-doc DEC-007, design-spec | mcps `SKILL.md`/README, `TESTING.md`, isolated guide |
| Test-path selection | Browser dev path for web-equivalent changes; isolated instance on a worktree build for desktop-shell changes | requirements REQ-006 | `TESTING.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Silent auto-dismiss of page dialogs | Agent decision + `DIALOG_DECISION_REQUIRED` | mcps `SKILL.md`, README |
| ~20 s `BROWSER_UNAVAILABLE` when a dialog blocks | `PAGE_BLOCKED` within 8 s | mcps `SKILL.md` |
| "computer-use on Linux" as the named remedy (tool removed from mcps by the base) | Generic "OS-level screen-control (computer-use) tool where available" | mcps `SKILL.md`, `TESTING.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- N/A

## Delivery Continuation

- Result: `Pass`. The doc check (`api-e2e-evidence/scripts/doc_check.py`) rerun on the synced docs finds every script and link resolved (`delivery-evidence/R-04-doc-check.json`).
- Next delivery action: handoff summary, then the user-verification hold. The user must explicitly confirm the dialog behavior change.
- Notes: the investigation notes (CUR line 78) and DEC-007's rationale ("X tools remain for OS dialogs") refer to `computer-use-mcp`, which the base removed. This is recorded for the user and the Solution Designer. It does not change the approved behavior.
