# Handoff Summary — chat-interface-entry

## Status

- Stage: Delivery round 5 (DR-005). The UVF-001 rework is integrated with `origin/personal@39e512edd` and checked. **Waiting for renewed user verification.** Nothing has been pushed, merged into `personal`, or released.
- Classification (preserved): `task_size=Large`, `architectural_risk=High`, route `Reviewed`. The latest chain is SR-011/SR-012 → ARCH-REV-008 → IR-004 (D-16) → CRR-005 Pass → API-REV-003 Pass 95% → CRR-006 Pass.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry`
- Ticket branch: `codex/chat-interface-entry` at `3c062a180` (local only; not pushed yet). It merges `origin/personal@39e512edd` (runtime stop-cleanup and Org/Team recovery; release `1.4.91-beta.7`).
- Finalization target: `personal` (remote `origin`)
- Delivery revision: DR-005 (`delivery-revision-record.md`)

## Integrated State For Verification

- Bootstrap base `origin/personal@fcd3e83a4`.
  - Refresh 1 (DR-001) merged `e6c16d801`.
  - Refresh 2 (DR-003, 2026-09-29) merged `origin/personal@5d6179797`, 4 more commits: the AGY background-task turn-liveness fix and the `1.4.91-beta.5` release bump.
  - Refresh 3 (DR-004, 2026-09-29, at the user's request) merged `origin/personal@c84b57739`, 13 more commits: the isolated-app instance work (Electron server env, updater, build marker, `isolated-app` CLI) and the `1.4.91-beta.6` release bump.
- Integration method: `Merge`. All three merges were clean with no conflicts.
- Ticket and delivery commits since the reviewed IR-003 HEAD `e5eac067d`:
  - `a4b22fc27` delivery checkpoint (live probe, CR-001, review/validation artifacts)
  - `7aa53519b` merge `origin/personal@e6c16d801`
  - `4b440e719` C-12 test fix (`skillRequestStrength` on the upstream AGY e2e)
  - `9d65adf6e` feat(web): Chat model labels follow the shared model-selection policy (IR-004, D-16)
  - `e9f2ce399` IR-004 ticket docs
  - `030bab78d` delivery checkpoint: probe C16 and model-row selector, the delivery docs-sync edits, and the UVF-001 review/validation artifacts
  - `a1f2a26d2` merge `origin/personal@5d6179797`
  - `46c8d98fc` DR-003 delivery artifacts checkpoint
  - `97c169c71` merge `origin/personal@c84b57739`
- Uncommitted: only the delivery artifacts in this folder (committed at finalization).
- Excluded untracked build output: `autobyteus-application-backend-sdk/dist/`, `autobyteus-application-sdk-contracts/dist/`.

### Post-integration checks (2026-09-29, on `a1f2a26d2`)

| Check | Result |
| --- | --- |
| Server `tsc -p tsconfig.build.json --noEmit` | exit 0 |
| Server `pnpm build:full` (clean build + built-in-agent bootstrap smoke) | exit 0; smoke passed |
| New upstream AGY tests use `createAgyRunCapsule`? | No, so no C-12-style type break. The strict whole-tree `tsconfig.json` check shows only TS4111 style errors and one TS2698, all in upstream AGY files this ticket does not touch |
| Server `vitest run tests/unit/skills tests/unit/agent-definition tests/unit/built-in-agents tests/unit/agent-execution/backends tests/unit/agent-execution/events` | 840 passed, 4 failed, 5 skipped. All 4 are in the baseline `codex-tool-log-correlation.test.ts` |
| Web `pnpm test:nuxt run` | 3349 passed, 4 failed files. These are the same 4 baseline files: `WorkspaceAgentRunsTreePanel.regressions` (2 team tests), `StartupDelayLifecycle`, `org-definition-navigation`, `app-font-size-fixed-px-audit` |
| Web `pnpm test:electron run` | 177 passed |
| Web `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | all exit 0 |

**Refresh 3 checks (on `97c169c71`):**
- web `pnpm test:nuxt run`: 3364 passed. The 4 baseline files fail as before.
- The new upstream `isolated-launch-marker.integration.test.ts` "present in packaged output" case failed only against the stale pre-merge `electron-dist`. It passed 4/4 after the rebuild.
- web `pnpm test:electron run`: 187 passed.
- guards and audit: exit 0.
- Server-side, the refresh changed only `docs/modules/secret_management.md`, so the server checks were not rerun.

The second merge touches AGY server files, two web spec files (`toolLifecycleHandler.spec.ts`, `runProjectionConversation.spec.ts`) and the web version. No web source overlaps this ticket, so the API-REV-003 live and browser evidence (C01–C16) stays authoritative.

## What Changed (user-facing)

- **Chat is the first navigation item and the landing page.** `/` opens a New chat. The pencil or the tree `+` on an agent starts a New chat, and the tree `+` presets it to that agent and workspace.
- **A New chat defaults to the built-in Daily Assistant.** It has general tools and **all installed skills**. It is seeded once, so your edits persist.
- **One compact footer.** It holds the approval toggle (Auto-approve by default), the workspace (Temp by default, or an existing workspace, or an absolute folder path), a runtime and model menu with search, thinking (only when the model supports it), the mic, and send.
- **`/` adds skill chips and `@` addresses another agent or team.** A team starts on the quick path with one runtime, model, workspace and approval setting for all members, and opens in the Team view.
- **Standalone agent runs open in the Chat run view at `/chat?id=<runId>`.** The right tools start collapsed. Team and Org runs keep `/workspace`.
- **Agent definitions** have a **Use all installed skills** option (`skillScope: ALL_INSTALLED`).
- **Model names in Chat match the launch form (UVF-001 / D-16).**
  - Claude Agent SDK shows the canonical name (e.g. `claude-opus-5-5`), with "Opus 5.5 · …" underneath and the Recommended badge first.
  - Codex and the other runtimes show the display name (e.g. `GPT-6-Astra (default reasoning: medium)`).
  - AutoByteus shows the identifier.
  - Rows and the footer button never wrap; the full text is on hover.
  - Search also matches canonical and display names.

### Behavior removed or changed (please note)

- Standalone agent runs no longer have the gear run-config editor or the header "new agent" action.
- Model and thinking are edited in the chat footer and are locked while the run is live (Running, Idle or Initializing). When the run is Offline, only models of the same runtime are offered.
- New chats start from the pencil or the tree `+`.
- **Advanced non-thinking model parameters can no longer be edited for single-agent runs.** Team runs keep their Settings editor.
- `autobyteus-web/generated/graphql.ts` got a hand-applied `skillScope` delta, because full codegen produced unrelated drift. A later full codegen should be reviewed for that drift.

## Validation Evidence

- CRR-003 source review Pass 9.3/10 (IR-001..IR-003; CR-002/003/004 resolved). CRR-004 test-code review Pass.
- API-REV-002 Pass, 95% confidence, every critical AC directly proven. Live probe C01–C15 (`autobyteus-web/tests/e2e/chat-entry-live-probe.mjs`, `pnpm test:e2e:chat-entry-live`) and the browser journeys at 390×844 are in `api-e2e-evidence/`.
- UVF-001 rework: CRR-005 source review Pass; API-REV-003 Pass 95%. AC-018 is proven live with an independent oracle, and the full live regression C01–C16 ran on the merged HEAD (`api-e2e-evidence/round3/`). CRR-006 test-code review Pass, no findings.
- Docs: `docs-sync-report.md`.

## How To Verify (suggested)

1. Install or open the local build `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` (or the `.dmg`). Alternatively, run `pnpm dev` from the worktree.
   - **UVF-001:** open the footer model menu and compare it with an agent or team launch form. Claude Agent SDK should show `claude-opus-5-5` with Recommended first, and Codex should show `GPT-…` display names.
2. Open the app. You should land on **Chat** with a New chat addressed to the Daily Assistant.
3. Pick a runtime and model from the footer menu, set thinking if it is shown, and send a message. The URL should become `/chat?id=<permanent id>` and the reply should stream.
4. Type `/`, pick a skill, and send. The chip should stay on the sent message.
5. While the run is live, the model and thinking controls should show a lock. Stop the run (Offline), change the model, and send again.
6. Use the tree `+` on an agent to start a preset New chat. Use `@` to address a team: it should open in the Team view with all members on one model.
7. Optional: open Agents, edit an agent, and tick **Use all installed skills**.

## Residual Risks

- Voice dictation cannot be automated; only the mic's presence is proven.
- The D-14 activation marker has no timeout (design-approved).
- The Windows symlink re-point fallback is unit-tested only.
- RSK-006: the Codex reload tooltip may include the context-file section.
- Test advisories A-1..A-4 are non-blocking (`api-e2e-test-review-report.md`).
- **O-1 (loading moment, not an AC failure).** On a fresh New chat, the footer model button first shows the last-used model's raw identifier. It switches to the policy label once that runtime's catalog loads: about 0.6 s on Codex, 1.7 s on Grok, and 1.6–3.0 s on Claude, where it briefly shows `opus`. If the user objects, it goes to `/software_engineering_team/solution_designer` as a small follow-up.
- Under a non-English `LANG`, the upstream `TokenUsageMeterPanel.spec.ts` (from `origin/personal`) fails on number formatting. This is unrelated to this ticket; the delivery runs used an empty `LANG` and were not affected.
- Pre-existing baseline unit failures are listed above. They are unchanged by this ticket.

## User Verification

- **Renewed verification pending (DR-003).** The UVF-001 rework (D-16) is integrated and checked. A new local build is below. Please check O-1 as well.
- 2026-09-29 (DR-005, at the user's request): rebuilt from `3c062a180`. The log is `delivery-evidence/delivery-electron-build-r4.log` (exit 0, personal). Outputs are `autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.91-beta.7.dmg` / `.zip` and `mac-arm64/AutoByteus.app`, and the marker packaging test passed 4/4. The version string is the merged base's `1.4.91-beta.7`; it is not the published beta.7. **This is the current test build.**
- Superseded: 2026-09-29 (DR-004, at the user's request after `personal` advanced): rebuilt the local unsigned macOS ARM64 personal-flavor app from `97c169c71`. The log is `delivery-evidence/delivery-electron-build-r3.log` (exit 0, personal). Outputs are `autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.91-beta.6.dmg` / `.zip` and `mac-arm64/AutoByteus.app`, which contains `Resources/isolated-launch.json`. The version string is the merged base's `1.4.91-beta.6`; it is not the published beta.6. (superseded by DR-005)
- Superseded: 2026-09-29 (DR-003) rebuilt the local unsigned macOS ARM64 personal-flavor app from `a1f2a26d2`. The log is `delivery-evidence/delivery-electron-build-r2.log` (exit 0, "Resolved build flavor: personal"). Outputs are `autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.91-beta.5.dmg` / `.zip` and `mac-arm64/AutoByteus.app`. The version string is the merged base's `1.4.91-beta.5`; it is not the published beta.5.
- Earlier result: **not verified; blocked by UVF-001** (`user-verification-finding-001.md`, DR-002). The Chat model menu labels models by raw identifier (`opus`), where the launch form shows `claude-opus-5-5`, "Opus 5.5" and the Recommended badge. No model is missing. This was routed as a Requirement Gap to `/software_engineering_team/solution_designer` on 2026-09-29.
- 2026-09-29: at the user's request, built a local unsigned macOS ARM64 personal-flavor desktop app from this integrated state (`4b440e719`). Command: README "macOS Build With Logs (No Notarization)" plus `AUTOBYTEUS_BUILD_FLAVOR=personal`. The log is `delivery-evidence/delivery-electron-build.log` (exit 0, "Resolved build flavor: personal"). Outputs are in `autobyteus-web/electron-dist/`: `AutoByteus_personal_macos-arm64-1.4.91-beta.4.dmg` / `.zip` and `mac-arm64/AutoByteus.app`. The version string is the merged base's `1.4.91-beta.4`, because no release bump has been made.
