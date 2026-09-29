# Handoff Summary — chat-interface-entry

## Status

- Stage: Delivery round 7 (DR-007). The package reworked after UVF-001/UVF-002 (D-16..D-19, DEC-017a, CR-010) is integrated with the latest `origin/personal` and checked. **Delivery completed (2026-09-29).** The user verified; the work was finalized into `personal` and released as beta `v1.4.91-beta.10` and then as stable `v1.4.91` (the same code as beta.10). All release workflows succeeded.
- Classification (preserved): `task_size=Large`, `architectural_risk=High`, route `Reviewed`.
  - Source reviews: D-16 labels CRR-005; D-17 run view CRR-008/CRR-009; D-18/D-19 one skill per name CRR-010 → CRR-011; DEC-017a Agent Org skills CRR-012 → CRR-013; CR-010 toast layer CRR-014 → CRR-015 (Pass, 9.3/10).
  - API/E2E: API-REV-007 Pass (95%), no open findings.
  - Test-code review: CRR-016 Pass, no findings.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry`
- Ticket branch: `codex/chat-interface-entry` at `531214f15` (local only; not pushed yet)
- Finalization target: `personal` (remote `origin`)
- Delivery revision: DR-007 (`delivery-revision-record.md`); history DR-001..DR-006.

## Integrated State For Verification

- Bootstrap base: `origin/personal@fcd3e83a4`.
- Earlier refreshes, all merges: DR-001 `e6c16d801`, DR-003 `5d6179797`, DR-004 `c84b57739` / `8778420fc`, DR-005 `39e512edd`, DR-006 `f2924a2b0`.
- This round:
  - Checkpoint `fc87b166b` (durable tests and ticket artifacts).
  - Merge `5d8329038` of `origin/personal@43b6fc0f4`, 20 commits: pure-spawn task delegation, delegated Team row collapse, free isolated-app control ports, `TESTING.md`, and releases `1.4.91-beta.8` / `beta.9`.
  - **2 conflicts, resolved in delivery by keeping both sides:**
    - `components/workspace/agent/AgentWorkspaceSurface.vue`: upstream removed the collaboration task heading; ours changed the title binding (`headerFullTitle`, `data-test`).
    - `components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts`: upstream removed the `tasks` prop; ours added the explicit composer target.
    - The other 22 overlapping files merged automatically.
- After the merge:
  - `74b68c748`: the Daily Assistant prompt drops its redundant "All installed skills…" paragraph (a user request relayed by `code_reviewer`).
  - `531214f15`: delivery docs sync.
- Uncommitted: only this round's delivery artifacts in this folder.
- Excluded untracked build output: `autobyteus-application-backend-sdk/dist/`, `autobyteus-application-sdk-contracts/dist/`.

### Post-integration checks (2026-09-29, on `5d8329038`, with `74b68c748` added)

| Check | Result |
| --- | --- |
| Server `tsc -p tsconfig.build.json --noEmit` | exit 0 |
| Server full unit suite `vitest run tests/unit` | 78 failing tests in 29 files. **The failing set is identical** to the same run on a clean `origin/personal@43b6fc0f4` worktree (`delivery-evidence/refresh5-server-unit-fail-{ours,base}.txt`): no new failures |
| This ticket's new e2e `skill-name-catalog-graphql` + the 5 `hasEffectiveSkills`-stub integration tests | 23/23 passed |
| Built-in agent units (after the Daily Assistant prompt change) | 10/10 passed |
| Web `pnpm test:nuxt run` | 3348 passed. The same 4 baseline files fail: `WorkspaceAgentRunsTreePanel.regressions`, `StartupDelayLifecycle`, `org-definition-navigation`, `app-font-size-fixed-px-audit` |
| Web `pnpm test:electron run` | 187 passed |
| Web `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | all exit 0 |
| Local app build r5 | see User Verification |

## What Changed (user-facing, cumulative)

- **Chat is the first navigation item and the landing page.** The pencil starts a New chat. The tree `+` on an agent starts one preset to that agent and workspace.
- **New chat (before the first message).**
  - The Daily Assistant is the default. It is a built-in agent with **all installed skills**, seeded once so your edits persist.
  - The footer holds approval (Auto-approve by default), the workspace (Temp by default), and a runtime/model menu with search and thinking.
  - Model names match the launch forms (D-16), e.g. `claude-opus-5-5` with Recommended first, and `GPT-6-Astra (default reasoning: medium)`.
  - The chat records explicit model-config defaults (D-18).
  - `/` adds skill chips; `@` addresses another agent or team.
- **Chat run view (D-17).** After the first message, a chat is the product agent run view in the workspace frame: header with title, status, ⚙ and ＋; the product message box with `/` skill tags; and the right tabs, shared with Team and Org.
  - ⚙ edits model and thinking. They are locked while live and saved for the next resume.
  - ＋ starts a New chat with the same agent and workspace.
- **One skill per name (D-19, DEC-017).**
  - The catalog picks exactly one copy per name.
  - Runtime default folders (e.g. `~/.codex/skills`) never win.
  - A duplicate at import (skill folder, agent package, create skill) is refused with a pop-up listing both paths.
  - A duplicate made outside the app shows a warning banner on the Skills page.
  - Toasts now appear above dialogs (CR-010).
- **Agent Org agents use their own bundled skills** (DEC-017a), the same as agents and teams.
- **Agent definitions** have a **Use all installed skills** option.
- **Daily Assistant prompt** no longer ends with the redundant "All installed skills are available…" paragraph.

### Behavior changes to note

- An agent's private skill copy is used only if it is the catalog's copy for that name.
- Imports can now be refused on a duplicate skill name.
- Standalone runs change their model in ⚙; the footer only exists on a New chat.
- `autobyteus-web/generated/graphql.ts` still has a hand-applied delta. A later full codegen should be reviewed for unrelated drift.

## Validation Evidence

- Source: CRR-015 Pass, 9.3/10, covering IR-001..IR-010.
- API/E2E: API-REV-007 Pass, 95%, no open findings. Live probe `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` (`pnpm test:e2e:chat-entry-live`); evidence in `api-e2e-evidence/`.
- Test code: CRR-016 Pass.
- Docs: `docs-sync-report.md` (Round 3 addendum).

## How To Verify (suggested)

1. Quit any running AutoByteus. Install or open the local build (User Verification below).
2. **Daily Assistant prompt:** it uses `seedIfMissing`, so an existing data root keeps the old prompt. To see the new one, delete `~/.autobyteus/server-data/agents/autobyteus-daily-assistant/agent.md` (or your data root's copy) before launching; it is reseeded.
3. **New chat:** open the model menu and compare it with a launch form. Send a message.
4. **Run view:** check the header (⚙, ＋), `/` tags in the box, and the right tabs. Change the model in ⚙ while Offline, then send again.
5. **Skills:** add a folder or import a package that has a skill name you already have; you should get a pop-up. Check the Skills page banner for duplicates made outside the app.
6. **Agent Org:** an org agent with its own `skills/` should use them.

## Observations (non-blocking; tell us if any is unacceptable)

- O-1: on a New chat, the model button briefly shows the raw model id (about 0.6–3 s; `opus` on Claude).
- O-2: the `/` skill list loads once per session.
- O-3: at 1200 px, a long Codex model name truncates the runtime badge to "Co…".
- O-4: disabled ⚙ thinking switches still look active (pre-existing component).
- O-5: the Agent Orgs list is stale after an import until Reload.
- O-6: a package containing only `agent-orgs/` is rejected by the existing package-shape rule.
- O-7: the Sources success text ("Found N skills") also counts ignored copies.

Rejected items go to `/software_engineering_team/solution_designer`.

## Residual Risks

- Grok and the AutoByteus runtime were not rerun in API-REV-006/007.
- `skill-service.ts` is at 485 effective lines.
- AF-36: Codex may still list a stale default copy inside its own runs.
- The D-14 activation marker has no timeout.
- RSK-006.
- The hand-applied `generated/graphql.ts` delta.
- The design-spec file-mapping residue (C-20).
- **Delivery-found, non-blocking:** `tests/unit/agent-execution/backends/antigravity/agy-run-capsule.test.ts` has test-only type errors in the whole-tree `tsconfig.json --rootDir .` check. Several `createAgyRunCapsule` calls lack the now-required `workspaceCollisionPolicy`, and older fixtures have an `mcpDescriptor` shape mismatch. This was already present on the reviewed branch. The build tsconfig excludes tests and vitest passes the file; the whole-tree test type-check has many existing errors elsewhere.
- Many server unit failures exist on `personal` itself (78; identical with and without this ticket). They should go to their owners.

## User Verification

- **Verified 2026-09-29.** The user said: "it works. lets finalize and release a beta". They tested the r5 local build below. O-1..O-7 were presented and not rejected, so they are accepted as non-blocking. `origin/personal` was re-fetched after verification: unchanged at `43b6fc0f4`, so no renewed verification is needed.
- Earlier status (DR-007): pending. Earlier rounds: UVF-001 (model labels) was resolved in D-16; UVF-002 led to D-17..D-19.
- **Current test build (r5, 2026-09-29):** a local unsigned macOS ARM64 personal-flavor build. The log is `delivery-evidence/delivery-electron-build-r5.log` (exit 0).
  - App: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
  - Installer: `electron-dist/AutoByteus_personal_macos-arm64-1.4.91-beta.9.dmg` / `.zip`
  - The packaged `server/dist/built-in-agents/templates/daily-assistant/agent.md` has the trimmed prompt. The marker packaging test passed 4/4.
  - The version string is the merged base's `1.4.91-beta.9`; it is not the published beta.9.
