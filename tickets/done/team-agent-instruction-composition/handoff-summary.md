# Handoff Summary

- Ticket: `team-agent-instruction-composition`
- Status: `User Verified and Archived`
- Last Updated: `2026-03-09`

## Outcome

- Member-runtime bootstrap now resolves and persists both team instructions and current-agent instructions for each team member.
- Codex now uses shared composition with explicit `## Team Instruction` and `## Agent Instruction` sections in `baseInstructions`, while runtime teammate/tool constraints remain in `## Runtime Instruction`.
- Claude now builds turn preambles from the same shared composition output using explicit `<team_instruction>`, `<agent_instruction>`, and `<runtime_instruction>` sections instead of adapter-owned hard-coded team prompt text.
- Runtime teammate visibility and `send_message_to` restrictions remain intact.
- The Codex live-runtime stabilization fixes are now merged into this same branch, so projection/restore/runtime-reference behavior and websocket tool lifecycle assertions stay green alongside the prompt-composition change.
- Claude has now been live-validated on the same branch as well, so the prompt-composition change is confirmed under both single-agent and team-runtime Claude SDK transport.
- The workspace frontend now upgrades placeholder tool labels consistently, so the conversation/grid view and the activity sidebar both show `send_message_to` instead of splitting between `send_message_to` and `unknown_tool`.
- The runtime instruction wording is now explicitly conditional, so it explains the mechanics of `send_message_to` without sounding like it overrides agent-authored collaboration policy.

## Validation Summary

- Focused unit/runtime coverage passed.
- The prompt-format refinement regression sweep passed: 53 tests passed, 1 skipped.
- The broader Claude/Codex backend sweep passed: 114 tests passed, 37 skipped across 23 Claude/Codex-named test files.
- GraphQL/API E2E coverage passed, including a new test for persisted instruction-source metadata in team-run manifests.
- Existing member projection contract E2E still passed after the refactor.
- Focused frontend regression coverage for the user-reported tool-label mismatch passed: 38 tests green across segment, lifecycle, error-handling, and activity-store paths.
- Focused runtime wording regression coverage passed: 25 tests green across the shared composer plus Claude and Codex renderers.
- Live Codex validation is now green on this branch: the targeted restore/projection rerun passed, and the full serialized Codex sweep under `RUN_CODEX_E2E=1` passed with 12 test files and 70 tests green.
- Live Claude validation is also green on this branch: the full serialized Claude sweep under `RUN_CLAUDE_E2E=1` passed with 12 test files and 87 tests green.
- The latest user-requested serialized rerun repeated both live sweeps after the wording refinement and frontend fix, and both remained green with the same totals.

## Outstanding Non-Blocking Issues

- Repository-wide `typecheck` and source-build commands are currently failing for pre-existing workspace/configuration issues unrelated to this ticket. Those failures are documented in `implementation-progress.md`.
- Live Claude and live Codex transport E2E both ran and are green on this merged branch.
