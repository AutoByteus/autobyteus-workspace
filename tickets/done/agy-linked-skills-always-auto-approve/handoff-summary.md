# Handoff Summary — agy-linked-skills-always-auto-approve

## Status

- State: **Delivered (DR-002).** User-verified 2026-10-02 ("finalize, no need to release thanks"). Finalized into `origin/personal` @ `6b67749d3` by fast-forward; no release. Worktree and local branch cleaned up. Before finalization the ticket branch was re-integrated with `origin/personal` @ `e8b0e95da` (13 new commits: agent-initiated collaborators and the `1.4.92-beta.8` bump) as `195be2e27`. No ticket files overlapped, the merge was clean, and the full check set re-passed with identical counts. See release-deployment-report.md.
- History: DR-001 held for verification at `593baccad` (base `314b5a976`).
- Classification (preserved): task_size `Medium`, architectural_risk `High`, reviewed route.
- Approved baseline: requirements `SR-001` (approved 2026-10-01), design `SR-002`.

## What Changed

| Area | Change |
| --- | --- |
| AGY skill exposure | `agy-configured-skill-linker.ts` replaces the checked-copy materializer. It creates one directory link per skill at `<capsule>/.agents/skills/<name>` and checks only that the folder and its `SKILL.md` exist |
| Failure semantics | `ALL_INSTALLED` agents (such as the Daily Assistant) skip an unusable skill with a warning. A configured agent fails with an `AgentCreationError` that names the skill and the reason, shown in chat and the server log |
| Restore | A dangling linked skill is removed with a `skipped-missing-source` warning, and the run resumes. Legacy copied capsules restore unchanged |
| Auto-approve | AGY always runs with `--dangerously-skip-permissions` and requires `permission_mode: always-proceed`. Every web surface shows the control locked on for `antigravity_cli` |
| Skills model | Provenance and roots are removed from records and bindings. The detailed resolver and source fingerprint are removed. AGY uses the regular bindings |
| Docs | Server: `antigravity_cli_runtime.md`, `skills.md`, `agent_execution.md`. Web: `agent_execution_architecture.md`, `remote_access.md` (see docs-sync-report.md) |
| Durable tests | New `tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts` (E01–E08). Fixture `agy-failure-cli.mjs` now has an argv-faithful `permission_mode` and a `linked_skills` case |

## Branch / Integration State

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-linked-skills-always-auto-approve` (removed after finalization)
- Branch: `codex/agy-linked-skills-always-auto-approve`. Pushed to origin and kept there; the local branch was deleted.
- Commits: `e5edfafdf` (implementation) → `993ac7a3c` (delivery checkpoint: API/E2E durable tests and review artifacts) → `593baccad` (merge of `origin/personal` @ `314b5a976`, 15 base commits) → `8c1606c1e` (DR-001 delivery artifacts) → `195be2e27` (merge of `origin/personal` @ `e8b0e95da`, 13 base commits) → `6b67749d3` (ticket archive). All merges were clean.
- Finalization target: `origin/personal`, fast-forwarded `e8b0e95da..6b67749d3`.
- Excluded from commits: untracked SDK build output `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/`.

## Post-Integration Verification (on `593baccad`)

| Check | Command (cwd) | Result |
| --- | --- | --- |
| Server source typecheck | `pnpm exec tsc -p tsconfig.build.json --noEmit` (server) | Pass. The full `tsconfig.json` only reports the known TS6059 test-rootDir config noise; there are no other errors |
| AGY + skills + Claude/Codex bootstrapper unit | `pnpm exec vitest run tests/unit/agent-execution/backends/antigravity tests/unit/skills …claude-session-bootstrapper… …codex-thread-bootstrapper… --no-watch` | 23 files passed, 3 skipped (live-gated); 309 tests passed |
| AGY fake-CLI server E2E (R3/R4 set) | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run <5 agy-*-transport/step-output e2e files>` | 5 files / 17 tests passed, including E01–E08 |
| Web specs (R5 set) | `NUXT_TEST=true pnpm exec vitest run <33 specs from R5 log>` (web) | 33 files / 290 tests passed, the same as API/E2E R5 |
| Web guards | `guard:localization-boundary`, `audit:localization-literals`, `guard:web-boundary` | Pass |

The base change that touches AGY is a one-line `compactionRecovery = { kind: "unsupported" }` field on `AgyAgentRunBackend`, which does not interact with this change. Two docs were edited by both sides and merged cleanly.

## Validation Chain

ARCH-REV-001 Pass → CRR-001 Pass (9.4/10) → API-REV-001 Pass (95.3%; AC-001..009 and REQ-006 proven, including live `agy` 1.2.14 and Browser B01–B04 with the real 15-skill set) → CRR-002 Pass.

## Residual Risks / Notes for Verification

- RSK-001 (accepted, deliberate): a relaxed security posture for AGY. It always runs with auto-approve and cannot be run with it off. Linked skill content is also live rather than frozen at run start (a non-goal).
- ASM-001: verified on `agy` 1.2.14 only.
- AC-009 was proven with a legacy-shaped capsule, not one produced by the old binary (low risk).
- CF-02: the chat footer explanation for the locked toggle is a tooltip plus aria-label.
- CF-03: forms seeded from pre-change runs can still store `autoExecuteTools:false` for AGY. The server ignores it and always launches with skip-permissions.
- CF-04: under CONFIGURED scope, an unsafe skill name fails the run with a named message, through the REQ-006 path (AR-001).

## Out-of-Scope Follow-Up Candidates (not fixed here)

1. Mobile Chat stays on "Opening conversation…" after the first send from setup (`MobileChat.vue`, unchanged by this ticket).
2. `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-mcp-team-live.test.ts:66` writes evidence to an archived ticket path.

## Suggested User Verification

1. In the app built from this worktree, open **Chat** with an Antigravity model and your normal skill set, including `browser-automation` with its `.venv`. Send a message: the agent should answer, and there should be no "Failed to prepare agent run".
2. Open any Antigravity launch or config surface (new chat, agent, team or member override, org, run settings, mobile). Auto-approve should show on and locked, with the explanation. Switching to another runtime should make it editable again.
3. Optional: start an AGY agent that names a missing or unusable skill. The chat error should name the skill and the reason.

Then reply with your verification result, and say whether this should ship as a beta release (the previous AGY fix shipped as `v1.4.92-beta.6`, and `origin/personal` is now at `v1.4.92-beta.7`).
