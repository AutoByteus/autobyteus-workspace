# Handoff Summary — run-settings-ui-unification

## Status

- **User-verified 2026-10-06** ("the task is done lets finalize" / "no need to release a new beta"; see `user-verification-record.md`). Finalization into `personal` follows (DR-002). Release is **Not required**, by user instruction.
- Classification: **Large / High**, Reviewed route (architecture review ARCH-REV-004 Pass; source review CRR-009 Pass; API/E2E API-REV-003 Pass at 95%; test-code review CRR-010 Pass, no findings).
- Requirements SR-006 (user-approved 2026-10-05); design SR-010.

## What Changed (user-facing)

- **Run on Agents and Agent Teams opens New chat**, prefilled with the definition defaults. The first message starts the run.
- **Team New chat** has a members line and a **Member settings** drawer. Members can override model, thinking, other model settings and tool approval.
- **Run on Agent Orgs opens the Org launch page**, on the same `/workspace?…mode=configuration` route. It has a settings card with Run, a status line, the members line and drawer (placed teams can also override the workspace), and no message box. Orgs are never a chat target.
- **Heading switcher** on both start pages: search, and choose an Agent, Team or Org. Settings carry across the switch; member overrides reset.
- **"+" copies the run**:
  - Agent: the agent on screen, including an `@` collaborator.
  - Team: New chat with the member overrides.
  - Org: the Org page with the overrides.
  - If the copy fails, the start page opens with the definition defaults.
- **Shared launch readiness rule:** the target is unavailable → a scope's runtime is disabled → a scope has no model. Every member's effective settings are checked.
- **Fast mode** (other model settings) appears as a chip in the message box and as a row on labelled surfaces. It is independent of Thinking.
- **Saved-run settings redrawn:**
  - a badge and a red stop icon using the tree's wording;
  - lock icons on fixed values, and a locked-runtime model menu;
  - a Members list;
  - a Save bar with Cancel;
  - the spec copy for the special states.
- **`@` is mention-only everywhere.** The first message keeps its mentions.
- **"Show tools"** icon on the start pages.
- **Removed:** the old Agent/Team/Org launch forms, the draft run config editor, the workspace selector, `useRunActions`, the dead running/library panels, and the "Chat with" `@` mode.

## Repository State

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification`, branch `codex/run-settings-ui-unification`. The finalization target is `personal` (origin).
- Implementation commits:
  - `d45fe62bc` (IR-001);
  - `396591a37`, `c37b81de5` (IR-002);
  - `81f9ff178` (IR-003);
  - `83ab477e4` (IR-004);
  - `a92004c9e` (IR-005).
- Delivery checkpoint commit `636af064d`. It holds the reviewed durable tests (`run-settings-live-probe.mjs`, the 5 migrated probes, and the `test:e2e:run-settings-live` script) and the upstream ticket artifacts. It excludes the untracked `autobyteus-application-*/dist/` build output.
- **Integration refresh:** `origin/personal` advanced from `19dee40b3` to `68261f811` with 7 commits (task-page-copy-simplification: a Projects task editor copy change plus its ticket records). The refresh was a merge into the ticket branch, `68cd341e9`, with no conflicts and no overlap with the ticket's files.
- **Post-integration check (Passed):**
  - `pnpm guard:web-boundary`, `pnpm guard:localization-boundary`, `pnpm audit:localization-literals`: all exit 0 (`evidence/delivery/guards-68cd341e9.log`).
  - `pnpm test:nuxt --run`: 550 files and 3,639 tests pass. 11 files (36 tests) fail; this is the **identical failing-file set** to the validated `a92004c9e` run, all on the recorded pre-existing baseline. That is 10 more passing tests than at `a92004c9e`, from the integrated Projects specs. Log: `evidence/delivery/web-suite-68cd341e9.log`.
- **Delivery edits (uncommitted, committed at finalization):**
  - the docs sync across 7 `autobyteus-web/docs` files (`docs-sync-report.md`);
  - `docs-sync-report.md`, `handoff-summary.md`, `release-notes.md`, `release-deployment-report.md`, `delivery-revision-record.md`.

## How To Verify

- Run the worktree dev stack from the worktree. `pnpm dev` keeps its data under the worktree's `.autobyteus/development/server-data`. Alternatively, ask delivery to start a preview.
- Suggested checks:
  - Agents → Run → New chat → send.
  - Agent Teams → Run → Customize members → change one member → send.
  - Agent Orgs → Run → Org page → Run.
  - "+" on each run type.
  - The heading switcher.
  - Fast mode on a Codex model.
  - Edit Config on a running run: stop, then Cancel/Save.
  - `@` in New chat.

## Known Residuals And Product Observations (not blocking; outside the approved spec)

- **O-1:** saved-run settings overflow by up to 19 px in a 390 px window. This is a Requirement Gap candidate for a Product decision.
- **O-2:** the unavailable page for an unknown or deleted Org shows an empty heading switcher.
- **O-3:** "All 1 members use these settings" has no singular form.
- **FU-001:** a server-owned draft `@` candidate query to replace the client mirror. It needs user approval because it is a server change.
- **FU-002:** `AgentOrgExperience.vue` is at 500 lines.
- **FU-003:** Team draft carrier identity.
- **FU-004:** `RemoteAgentCard` is not rendered.
- **C05:** server Codex client-cleanup failure (a separate server ticket candidate).
- **F-2:** the collaborator-view placeholder product question predates this ticket.
- **Pre-existing orphan:** `utils/projects/linkableWorkspaces.ts` has no production consumer, both at base and now.

## Release

- **Not required**, by explicit user instruction ("no need to release a new beta"): no version bump, tag, GitHub release or deployment.
- `release-notes.md` is archived but not consumed.
