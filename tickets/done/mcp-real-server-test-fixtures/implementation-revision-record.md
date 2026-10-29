# Implementation Revision Record — mcp-real-server-test-fixtures

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff.md` (Architecture Design Complete), round 1 | N/A | `Initial Baseline` | SR-001; ARCH-REV N/A; CRR N/A; API-REV N/A; DR N/A | Implementation complete; direct API/E2E route |

## Revision Entries

### IR-001 — MCP integration tests on tiny real MCP servers

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-real-server-test-fixtures/tickets/in-progress/mcp-real-server-test-fixtures/handoff.md`, round 1
- Triggering finding IDs: N/A
- Classification: Initial Baseline
- Prior authoritative result: N/A
- Current authoritative result: commits `baaee3a150` (test code and fixtures) and `c4b4a4dca4` (`docs(testing)` row) on `codex/mcp-real-server-test-fixtures`. No product source changed.
- Related solution revision IDs: SR-001
- Related architecture-review / code-review / API/E2E / delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation handoff
- Approved behavior or requirement IDs affected: BEH-001..BEH-003; REQ-001..REQ-008; AC-001..AC-009
- Implementation delta:
  - New Python fixture `autobyteus-ts/tests/fixtures/mcp-test-server/`: `server.py`, `pyproject.toml`, `uv.lock`, with `mcp` 2.3.0 pinned.
  - The Node fixture `mcp-stdio-fixture-server.mjs` is extended in place, with the same tools, modes and output lines. Its path and no-argument stdio default are unchanged.
  - New launcher `tests/integration/tools/mcp/mcp-test-server-launcher.ts`.
  - The stdio, HTTP and registrar integration tests are rewritten on the launcher.
  - New opt-in test `real-user-kind-mcp-server.test.ts`.
  - The unit test's exact tool-list assertion is updated to the extended fixture.
  - `tests/fixtures/certificates/` is deleted.
  - TESTING.md gains one row, in its own commit.
- Deviations, recorded in the handoff:
  - The opt-in default command is `uv run --frozen python app/main.py`, not the `start-pptx-mcp` script. `pptx-mcp` is a virtual uv project, so its script is never installed: `Failed to spawn: start-pptx-mcp`.
  - The unit test's assertion change is a necessary consequence of REQ-001 (the extra tools).
- Changed files or areas: `autobyteus-ts/tests/fixtures/**`, `autobyteus-ts/tests/integration/tools/mcp/**`, `autobyteus-ts/tests/unit/tools/mcp/stdio-managed-mcp-server.test.ts`, `TESTING.md`
- Local validation and result: see the handoff's Checks Run (IMP-01..IMP-06)
- Next recipient or routing: per `get_handoff_rules` (direct API/E2E for Small / Low)
- Remaining limitations or risks:
  - The first Python preparation needs the network (R-001). After that, the environment and uv cache persist under `os.tmpdir()`, outside the repository, by design.
  - The hang case waits about 3 s plus the SDK's close escalation (about 5.5 s in total). autobyteus-194 can tighten it.
