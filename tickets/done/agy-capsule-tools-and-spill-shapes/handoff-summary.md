# Handoff Summary — agy-capsule-tools-and-spill-shapes (Task autobyteus-588)

## Ticket
- `task_size=Small`, `architectural_risk=Low`; direct route (reviews Not Applicable). SR-002. API/E2E Pass (95%). Archived at `tickets/done/agy-capsule-tools-and-spill-shapes/`.

## What Changed
- The capsule's native tool allowlist stays the eight registry names (`view_file`, `write_to_file`, `replace_file_content`, `grep_search`, `find_by_name`, `run_command`, `generate_image`, and the eighth in the policy). A live probe during design showed that the change first designed (list the five alias names) conflicts with the CLI: a list that names both a name and its alias does not start (`tool name conflict`), so the aliases are never listed (SR-002).
- `agyNativeToolsMissingFromRegistry` compares the list with the `tools` array of the CLI's start message; when a name is missing, the backend factory logs one `AGY_CAPSULE_TOOL_NOT_IN_REGISTRY run=<id> names=<list>` warning. It never fails or delays the start, and it stays silent when the start message carries no `tools` array.
- Tests: policy and factory unit tests; `agy-capsule-tool-registry.e2e.test.ts` (scripted CLI on a built server: one warning when `find_by_name` is missing; none with all eight or with no `tools` field; plus a gated live case on the real agy 1.5.15). The scripted fixture now emits the eight registry names by default (new knob `AGY_FAKE_INIT_TOOLS`: a JSON array, or `ABSENT`), because its earlier `init.tools: []` made the new warning fire on every scripted start.
- Docs: `antigravity_cli_runtime.md`.

## Integration
- `origin/personal` @ `19e4dce128` has nothing beyond the ticket's base; no merge needed. On the head: typecheck, 395 unit tests, server build and five scripted-Antigravity e2e files pass, with zero warning lines.

## Verification
- From the evidence; no user check. Live, on the real agy 1.5.15 and the built server with the capsule the server writes: the agent called `read_file`, `edit_file`, `write_file` and `run_command`; `a.txt` ended `alpha\ngamma\n`, `b.txt` was written, and no warning appeared (2 of 2 runs). Scripted: exactly one warning line with the missing name, the run still answered; removing the warning from the compiled factory makes that case fail.
- No accepted unverified risk (no `DEC-*` of that kind). Not tested: a CLI registry that lacks a name is proven with the scripted CLI only, because agy 1.5.15 lists all eight.

## For the user
- The live runs used the real HOME and the host `agy` login and added synthetic conversations to the user's `agy` history, which cannot be removed.

## Release
- `No release`: not requested. `release-notes.md` is ready. The change is on `personal` but in no release.

## For The Solution Designer
- FU-1: `tests/fixtures/agy-tps-cli.mjs` (the token-usage fixtures) still emits `init.tools: []`, so a test using it logs the warning listing all eight names: noise only, nothing fails.
- The requirements doc writes the warning as `names=` then `run=`; the code and the module doc have `run=` first.
