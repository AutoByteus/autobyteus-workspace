# Handoff Summary — chat-interface-entry

## Status

- Stage: Delivery. The branch is integrated and checked. **Waiting for user verification.** Nothing has been pushed, merged into `personal`, or released.
- Classification (preserved): `task_size=Large`, `architectural_risk=High`, route `Reviewed` (ARCH-REV-006 → CRR-003 Pass 9.3/10 → API-REV-002 Pass 95% → CRR-004 Pass)
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry`
- Ticket branch: `codex/chat-interface-entry` (local only; not pushed yet)
- Finalization target: `personal` (remote `origin`)
- Delivery revision: DR-001 (`delivery-revision-record.md`)

## Integrated State For Verification

- Bootstrap base `origin/personal@fcd3e83a4`. The latest base was fetched 2026-09-29 at `origin/personal@e6c16d801`, 6 commits ahead (the AGY native-image output-path work and the `1.4.91-beta.4` release bump).
- Integration method: `Merge`. It was clean with no conflicts.
- Delivery commits on top of the reviewed HEAD `e5eac067d`:
  - `a4b22fc27` test(web): chat-entry live probe, stale tree-panel mock removed (CR-001), review/validation artifacts. This checkpoint is the reviewed and validated state.
  - `7aa53519b` Merge `origin/personal` (`e6c16d801`)
  - `4b440e719` test(agy): `skillRequestStrength: "configured"` on the upstream `agy-native-image-codex-skill.e2e.test.ts` capsule call (C-12). Test-only.
- Uncommitted delivery-owned edits (committed at finalization): `autobyteus-web/docs/settings.md`, `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md`, and the delivery artifacts in this folder.
- Excluded untracked build output: `autobyteus-application-backend-sdk/dist/`, `autobyteus-application-sdk-contracts/dist/`.

### Post-integration checks (2026-09-29, on `4b440e719`)

| Check | Result |
| --- | --- |
| Server `tsc -p tsconfig.build.json --noEmit` | exit 0 |
| Server `pnpm build:full` (clean build + built-in-agent bootstrap smoke) | exit 0; "Built-in agents bootstrap smoke check passed" |
| C-12 test type-check, `tsc -p tsconfig.json --rootDir .`, filtered to `agy-native-image-codex-skill.e2e.test.ts` | TS2345 on the unfixed merge; 0 after the fix |
| Server `vitest run tests/unit/skills tests/unit/agent-definition tests/unit/built-in-agents tests/unit/agent-execution/backends tests/unit/agent-execution/events` | 831 passed, 4 failed, 5 skipped. All 4 are in the baseline `codex-tool-log-correlation.test.ts` |
| Web `pnpm test:nuxt run` | 3337 passed, 4 failed files. These are the same 4 baseline files as IR-001..IR-003: `WorkspaceAgentRunsTreePanel.regressions` (2 team tests), `StartupDelayLifecycle`, `org-definition-navigation`, `app-font-size-fixed-px-audit` |
| Web `pnpm test:electron run` | 177 passed |
| Web `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | all exit 0 |

The merged base touches only AGY server files and the web version. No web source overlaps this ticket, so the API/E2E live and browser evidence (API-REV-002) stays authoritative.

## What Changed (user-facing)

- **Chat is the first navigation item and the landing page.** `/` opens a New chat. The pencil or the tree `+` on an agent starts a New chat, and the tree `+` presets it to that agent and workspace.
- **A New chat defaults to the built-in Daily Assistant.** It has general tools and **all installed skills**. It is seeded once, so your edits persist.
- **One compact footer.** It holds the approval toggle (Auto-approve by default), the workspace (Temp by default, or an existing workspace, or an absolute folder path), a runtime and model menu with search, thinking (only when the model supports it), the mic, and send.
- **`/` adds skill chips and `@` addresses another agent or team.** A team starts on the quick path with one runtime, model, workspace and approval setting for all members, and opens in the Team view.
- **Standalone agent runs open in the Chat run view at `/chat?id=<runId>`.** The right tools start collapsed. Team and Org runs keep `/workspace`.
- **Agent definitions** have a **Use all installed skills** option (`skillScope: ALL_INSTALLED`).

### Behavior removed or changed (please note)

- Standalone agent runs no longer have the gear run-config editor or the header "new agent" action.
- Model and thinking are edited in the chat footer and are locked while the run is live (Running, Idle or Initializing). When the run is Offline, only models of the same runtime are offered.
- New chats start from the pencil or the tree `+`.
- **Advanced non-thinking model parameters can no longer be edited for single-agent runs.** Team runs keep their Settings editor.
- `autobyteus-web/generated/graphql.ts` got a hand-applied `skillScope` delta, because full codegen produced unrelated drift. A later full codegen should be reviewed for that drift.

## Validation Evidence

- CRR-003 source review Pass 9.3/10 (IR-001..IR-003; CR-002/003/004 resolved). CRR-004 test-code review Pass.
- API-REV-002 Pass, 95% confidence, every critical AC directly proven. Live probe C01–C15 (`autobyteus-web/tests/e2e/chat-entry-live-probe.mjs`, `pnpm test:e2e:chat-entry-live`) and the browser journeys at 390×844 are in `api-e2e-evidence/`.
- Docs: `docs-sync-report.md`.

## How To Verify (suggested)

1. From the worktree run `pnpm dev` (backend :8000, web :3000). I can also build a local desktop app if you prefer.
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
- Test advisories A-1..A-3 are non-blocking (`api-e2e-test-review-report.md`).
- Pre-existing baseline unit failures are listed above. They are unchanged by this ticket.

## User Verification

- **Not verified. Blocked by UVF-001** (`user-verification-finding-001.md`, DR-002). The Chat model menu labels models by raw identifier (`opus`), where the launch form shows `claude-opus-5-5`, "Opus 5.5" and the Recommended badge. No model is missing. This was routed as a Requirement Gap to `/software_engineering_team/solution_designer` on 2026-09-29.
- 2026-09-29: at the user's request, built a local unsigned macOS ARM64 personal-flavor desktop app from this integrated state (`4b440e719`). Command: README "macOS Build With Logs (No Notarization)" plus `AUTOBYTEUS_BUILD_FLAVOR=personal`. The log is `delivery-evidence/delivery-electron-build.log` (exit 0, "Resolved build flavor: personal"). Outputs are in `autobyteus-web/electron-dist/`: `AutoByteus_personal_macos-arm64-1.4.91-beta.4.dmg` / `.zip` and `mac-arm64/AutoByteus.app`. The version string is the merged base's `1.4.91-beta.4`, because no release bump has been made.
