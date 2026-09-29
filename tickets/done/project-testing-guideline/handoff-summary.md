# Handoff Summary — project-testing-guideline

## Status

- Delivery state: **User verified (2026-09-29): "let's finalize directly and release a new beta version".** That instruction was given with the dialog behavior change already discussed (code_reviewer user note), so delivery records it as acceptance of the change. The ticket is archived, finalized into `personal` (workspace) and `main` (mcps), and a new beta is released. See `release-deployment-report.md` for the final state.
- Classification: `task_size=Medium`, `architectural_risk=High`. Route: reviewed (Solution Designer → Architecture Review → Implementation → Code Review → API/E2E → test-code review → Delivery).
- Review chain: CRR-001 Pass (9.3/10); API-REV-001 Pass (95.0%; every AC directly proven, including a real AutoByteus confirm flow, `PAGE_BLOCKED` on Electron and the AC-008 agent walk-through); CRR-002 Pass.

| Repo | Worktree | Ticket branch | Finalization target | Candidate | Integrated base |
| --- | --- | --- | --- | --- | --- |
| workspace | `/Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline` | `codex/project-testing-guideline` | `origin/personal` | `5039ad9f5` (merge) + delivery docs sync (uncommitted) | `origin/personal@8f57d16d1`, merged (1 README conflict resolved) |
| autobyteus-mcps | `/Users/normy/autobyteus_org/autobyteus_mcps-project-testing-guideline` | `codex/project-testing-guideline` | `origin/main` | `9ac9770` (merge) + delivery `SKILL.md` sync (uncommitted) | `origin/main@291188d`, merged cleanly |

- Local commits made by delivery (not pushed):
  - Workspace `4f2caa92e`: checkpoint of the review and API/E2E artifacts. The raw Playwright protocol traces in `E-08/debug/` are gzipped, which takes the evidence from 40 MB to 3.5 MB with nothing removed.
  - Workspace `5039ad9f5`: base merge.
  - mcps `d4ecf13`: the reviewed stdio dialog test.
  - mcps `9ac9770`: base merge.
- The untracked SDK `dist/` outputs are never committed.

## What Changed

1. **`TESTING.md`** (workspace root): test layers and commands, test-path selection, rules (worktree builds, never the user's app or data, reported ports, importer, cleanup, assertions first, page dialogs, Linux). Links were added from `README.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md` and `docs/isolated-app-instances.md`.
2. **browser-automation dialogs** (mcps):
   - `run-script`/`navigate` take `--dialog accept|dismiss` and `--prompt-text` (MCP `dialog`/`prompt_text`).
   - Without a decision, the page is unblocked and the command fails with `DIALOG_DECISION_REQUIRED`.
   - `alert`s are closed and reported, and results list the command's own `dialogs`.
   - Other tabs are untouched.
   - A dialog left open gives `PAGE_BLOCKED` within about 8 s, instead of `BROWSER_UNAVAILABLE` after about 20 s.
3. **Docs sync by delivery on the integrated state:**
   - `TESTING.md` now follows the new free-control-port default from the base: use the reported `controlPort`/`instanceId`.
   - OBS-A: in MCP results `dialogs` is absent or `null`.
   - OBS-B: Electron has no `prompt()`.
   - The on-screen remedy is worded generically, because the mcps base removed `computer-use-mcp`.

## Validation Evidence

- API/E2E: repository suites R-01..R-04 and live E-01..E-09 all pass. Live checks included a real AutoByteus "Remove node" confirm (no decision, dismiss, accept during a recording), `PAGE_BLOCKED` on Electron, MCP stdio, and byte-identical CLI output without dialogs.
- Delivery rerun on the integrated state (evidence in `delivery-evidence/`):
  - mcps unit: 163 passed.
  - mcps real-Chrome integration: 35/35 passed.
  - Workspace isolated-app/electron-launch node tests: 51/51.
  - Doc check on the synced docs: all 24 scripts and 12 links resolve.

## Verification Steps Offered

1. Read `TESTING.md` at the workspace root. Does it describe how you want this project tested?
2. **Confirm the dialog behavior change** (explicitly requested by code_reviewer):
   - Before: a pop-up raised during a browser command was silently cancelled.
   - Now: the agent must pass `--dialog accept|dismiss`. Otherwise the command fails with `DIALOG_DECISION_REQUIRED` and shows the question.
   - Pop-ups left open still have to be answered on screen.
   - Keep this behavior? If you want it scaled back, it goes to the Solution Designer.
3. Optional: in an isolated instance, trigger an action with a confirm (for example "Remove node") via `run-script` with and without `--dialog accept`.

Reply with explicit verification (for example "verified") to proceed. Please also say whether you want a new beta release. It is optional: the workspace change is documentation only, and the dialog change ships through autobyteus-mcps, which has no release process.

## Residual Risks / Items For Your Decision

- **The computer-use MCP was removed** from autobyteus-mcps `main` (`d0fb10d`, in the integrated base). DEC-007's rationale named those X tools as the remedy for OS dialogs and for dialogs left open. Such dialogs now have to be answered by you, or by any other OS-level screen-control tool you use. The docs now say this generically.
- **OBS-C** (pre-existing): stderr shows "Future exception was never retrieved" on a connect timeout. This is a separate-ticket candidate.
- **OBS-D** (pre-existing): `list-tabs` is slow with 120–160 tabs, because summarizing each page takes time on unresponsive renderers. Same on base. This is a separate-ticket candidate.
- Side effects that ran before a dialog can repeat when the action is re-run with a decision. This is documented.

## Artifacts

(`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/project-testing-guideline/tickets/in-progress/project-testing-guideline`)

- Upstream: `…/requirements-doc.md`, `…/investigation-notes.md`, `…/solution-revision-record.md`, `…/design-spec.md`, `…/design-review-report.md`, `…/architecture-review-revision-record.md`, `…/handoff-architecture-design-complete.md`
- Implementation: `…/implementation-handoff.md`, `…/implementation-revision-record.md`
- Reviews: `…/code-review-report.md`, `…/code-review-revision-record.md`, `…/api-e2e-test-review-report.md`
- API/E2E: `…/api-e2e-coverage-investigation.md`, `…/api-e2e-execution-coverage-report.md`, `…/api-e2e-test-case-ledger.md`, `…/api-e2e-revision-record.md`, `…/api-e2e-evidence/`
- Delivery: `…/docs-sync-report.md`, `…/release-notes.md`, `…/release-deployment-report.md`, `…/delivery-revision-record.md`, `…/delivery-evidence/`, this `handoff-summary.md`
- Product Design artifacts: N/A — not applicable
