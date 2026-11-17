# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: SR-004 is `task_size=Small`, `architectural_risk=Low`, so there was no architecture review; it came directly to implementation (`handoff-implementation.md`). After implementation, `get_handoff_rules` → "Small or Medium and Low … direct API/E2E validation" → `/api_e2e_engineer`.
- Requirements doc: `tickets/in-progress/search-memory-default-tool-496/requirements-doc.md` (SR-004, approved by the user)
- Investigation notes: `tickets/in-progress/search-memory-default-tool-496/investigation-notes.md`
- Solution revision record: `tickets/in-progress/search-memory-default-tool-496/solution-revision-record.md`
- Design spec (required on every route): `tickets/in-progress/search-memory-default-tool-496/design-spec.md` (SR-004)
- Supplemental task artifacts: `follow-ups.md` (FU-001 to FU-004 from the Solution Designer; FU-005 added here)
- Design review report: `N/A — not applicable` for SR-004. The file in the ticket folder reviews the withdrawn SR-003 design.
- Architecture review revision record: `N/A — not applicable` (same reason)
- Triggering rework report, revision record, or evidence, when applicable: `N/A` (initial implementation)

## Current Implementation Summary

`buildRuntimeAgentToolExposure` (`autobyteus-server-ts/src/agent-execution/shared/runtime-agent-tool-exposure.ts`) adds the platform-given tools, `PLATFORM_GIVEN_TOOL_NAMES = [search_memory]`, to every run's `requestedToolNames`, after the configured names and the automatic collaboration tools. The existing `Set` deduplicates them. That is the only production change. Native runs create `search_memory` through the registry, as for any listed tool. MCP runtimes (Claude, Codex, AGY, Grok, DeepSeek) enable the existing adapter by name. Restored runs hear the existing one-line "Now available: search_memory." notice. The tool, its description, its result and the search itself are unchanged.

No SR-003 code was written: work had stopped before any source change, so there was nothing to drop.

- Implementation cycle: `Initial`
- Implementation revision record: `tickets/in-progress/search-memory-default-tool-496/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-004`
- Related architecture-review revision IDs: `N/A` (ARCH-REV-001/002 reviewed the withdrawn SR-003)
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

Commits on `codex/search-memory-default-tool-496`, after the SR-004 docs commit `5191304829`:

| Commit | What |
| --- | --- |
| `8a0858709f` | The rule change, docs, exact-name test updates and the new AC-001/AC-003 tests |
| `d02b201e34` | Baseline fix, not caused by this ticket: a timeout for the real-watch skill folder test (see Checks Run, IMP-01) |
| `5cdd6faf81` | Four more test files that list exact tool names, found by the full unit run |
| (this commit) | Handoff, revision record, evidence, FU-005 |

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Small`
- Architecture risk (`Low`/`High`): `Low`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: one production file changed (8 added lines), with no new owner, contract field, type, persistence or migration. The design's escalation trigger does not fire. Every runtime's tools come from this rule (all 12 callers, IN-002). Every host registers the memory tools as a required unit (`startup/agent-tool-loader.ts` `"memory"`; both the studio server and the standalone application host build their tool readiness through `build-application-platform-runtime.ts:218`). The Agent Tools MCP host uses the default adapter set, which includes the memory adapter (`agent-tools-mcp-host.ts:53-54`). The test changes are wider than the design's count (11 test files instead of 7), but they are expectation updates, not structural change.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None`

### Lightweight self-review

- **One rule:** no backend appends the name; it is added only in the shared rule. Both native wrappers and all MCP runtimes reach it (`resolveAutoByteusRuntimeAgentToolExposure` → `buildRuntimeAgentToolExposure`; `resolveRuntimeAgentToolExposure` → same).
- **Deduplication:** a definition that lists `search_memory` keeps it in its configured position, once. Tested for the exposure, the native instances and the MCP list.
- **Derived consumers:**
  - `isSameRuntimeAgentToolExposure` compares names, so a scope-less name addition needs nothing.
  - The placeholder exposures (`agent-run-restore-context-factory.ts:47`, `codex-agent-run-context.ts:39`) now also list it. Harmless, because bootstrap replaces them (as the design says).
  - The application-aware native composer filters names an application route takes; `search_memory` is not an application tool name.
- **Claude's tool list:** `resolveClaudeSessionToolingOptions` has a fallback list that leaves out `search_memory`. The production caller always passes the session's `enabledTools` instead (`claude-session-query-options.ts:32-35`), and those include it, so Claude runs get the tool. The test-only fallback is recorded as FU-005.
- **Prompts:** the prompt composers (`src/agent-execution/prompt/`) read no tool names, so system prompts are unchanged (AC-003). The parity test's prompt assertions are unchanged and pass.
- **Size:** `runtime-agent-tool-exposure.ts` is 110 lines.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001, AC-001) | Every run on every runtime has `search_memory` without a package change; once when listed | `runtime-agent-tool-exposure.ts` `PLATFORM_GIVEN_TOOL_NAMES` merged in `buildRuntimeAgentToolExposure` → native `resolveAutoByteusAgentTools` registry path → `SearchMemoryTool`; MCP `AgentToolMcpCatalog` → `MemoryToolsMcpAdapterProvider` in `tools/list` | Done. Tests: exposure rule (4 cases), native resolver (instance; once when listed), MCP session service with the production adapter set (`tools/list`; once when listed) |
| BEH-001 (REQ-002, AC-002) | Same result as an explicitly listed tool | Tool, adapter and `MemorySearch` unchanged | Preserved; `tests/unit/agent-tools/memory/search-memory-tool.test.ts` and `tests/unit/memory-search/**` pass in IMP-01 |
| BEH-006 (REQ-003, AC-003) | A restored run whose seen record lacks the tool gets it and one "Now available: search_memory." notice; prompts unchanged | Existing autobyteus-324 seen-names path; no new code | Done. New integration case in `tool-list-update-service.integration.test.ts`: the notice is given once, the next input has none, and the record is rewritten |
| AC-004 | Real native and real Claude/Codex run call the tool | — | Not run here: API/E2E owns it (see below) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. Nothing scopes or limits the search, and there is no switch. The tool's description and result are unchanged.

## Key Files Or Areas

- Production: `autobyteus-server-ts/src/agent-execution/shared/runtime-agent-tool-exposure.ts`
- Docs:
  - `autobyteus-server-ts/docs/modules/memory_search.md` (Entry Points: every agent has it; node-wide)
  - `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` (the effective set includes it)
  - `autobyteus-server-ts/docs/modules/tool_list_updates.md`: its notice example showed `search_memory` being removed, which can no longer happen. The example now uses `open_tab`, and one sentence describes the upgrade notice. This file is not in the design's list; it was a stale example.
- New tests (AC-001, AC-003):
  - `tests/unit/agent-execution/shared/runtime-agent-tool-exposure.test.ts` ("platform-given search_memory")
  - `tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts` (native instance; once when listed)
  - `tests/unit/agent-tools/mcp/agent-tool-mcp-session-service.test.ts` (`tools/list` with the production adapter set)
  - `tests/integration/tool-list-updates/tool-list-update-service.integration.test.ts` (restore notice)
- Updated exact-name expectations (in the design's 7 plus 4 found by the unit run):
  - `runtime-agent-tool-exposure.test.ts`
  - `autobyteus-runtime-tool-exposure.test.ts`
  - `immediate-tool-list-apply.test.ts`
  - `member-collaboration-instruction-provider-parity.test.ts`
  - `model-router-tools.test.ts`
  - `agent-tool-mcp-catalog.test.ts`: the fake registry and catalog now hold `search_memory` and its adapter, as every node does
  - `project-task-tools.test.ts`
  - `codex-tool-list-reopen.test.ts` and `acp-tool-list-reopen.test.ts`: runs open with the names the rule gives
  - `autobyteus-agent-tool-resolver.test.ts`: its native baseline case now registers the memory tools, as every start does, and expects `search_memory` (before, it passed only because the tool was missing from its registry)
  - `application-agent-tool.test.ts` was in the design's 7 but needed no change

## Important Assumptions

- Every host that runs agents registers the required tool units before runs start (`AgentToolRegistryReadiness`). A missing memory unit fails startup, so a native run cannot silently lack the tool.

## Known Risks

- Privacy: every agent can find every run's journals, the founder's private runs included. This is the user's accepted decision (QR-002; FU-001, FU-004).
- Prompt cost: about 1,400 characters of tool definition on every run, the Model Router included (FU-002).
- Restored runs: one cache miss and one notice line each, at the first input after the upgrade (intended, REQ-003).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature`
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `No Refactor Needed`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: the single rule absorbed the change in 8 lines. FU-005 is unrelated dead-path cleanup in a file this ticket does not touch.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (none found in `runtime-agent-tool-exposure.ts`)
- Dead code found elsewhere, added to `follow-ups.md`: FU-005
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes` (no type change)
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Deviations from a design principle decided during implementation, each with the principle and why the reason holds for this case: `None`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (110 lines; +8)
- Notes: the design suggested `PLATFORM_GIVEN_TOOL_NAMES` "or a function"; the constant is used because the list does not depend on the run.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: the seen-tool-names record is rewritten by its existing writer (shown in the AC-003 case)
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- The worktree had no `node_modules`. I ran `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`, `pnpm -C autobyteus-web exec nuxt prepare` and `pnpm -C autobyteus-server-ts test:integration:prepare`. The build outputs are untracked and were not committed.
- The first full unit run was killed by an app restart (exit 137, no result). It was run again in full; that is IMP-01.

## Checks Run

Evidence folder: `tickets/in-progress/search-memory-default-tool-496/evidence/`. Environment for every row: macOS (Darwin 25.5.0, arm64), Node v22.23.1.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts test:unit` | `8a0858709f` | as above | Whole server unit suite | AC-001, AC-002 | `Fail`, then fixed: 13 failures. 12 were exact-name expectations in 4 test files, fixed in `5cdd6faf81`. 1 was `skill-folder-watcher.test.ts` "releases a folder's OS handles…", which timed out at 5 s alone and in the suite. Its cause is in the test: 3 s of fixed waits plus two real-watch waits of up to 3 s each; it took 6.2–7.0 s when given room. Fixed in `d02b201e34`, not caused by this ticket. All other files: pass. | `IMP-01-server-unit-suite.log`, `IMP-01-server-unit-suite-excerpt.log` | `Tests  13 failed \| 8201 passed \| 9 skipped (8223)` |
| IMP-02 | `pnpm -C autobyteus-server-ts exec vitest run <the 12 unit test files changed since a781007713> --no-watch` (rerun by impact: since IMP-01 only test files changed) | `5cdd6faf81` | as above | The 5 files that failed in IMP-01 and every new or changed AC-001 test | AC-001 | `Pass` | `IMP-02-changed-unit-files.log` | `Tests  186 passed (186)` |
| IMP-03 | `pnpm -C autobyteus-server-ts typecheck` | `5cdd6faf81` | as above | Server `src` and tests | — | `Pass` | `IMP-03-server-typecheck.log` | `production errors: 0; test-file errors: 1012 in 316 files (baseline 1012 in 316 files)` |
| IMP-04 | `pnpm -C autobyteus-web exec nuxt prepare && pnpm -C autobyteus-web typecheck` | `5cdd6faf81` | as above | Web app, Electron main, cross-package tests (compile server source) | — | `Pass` | `IMP-04-web-typecheck.log` | `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)` |
| IMP-05 | `pnpm -C autobyteus-server-ts test:integration:prepare`, then `vitest run` on the 7 integration files that use the exposure rule (MCP routes, application MCP routes, studio listener, brief-studio MCP, team MCP lifecycle, Claude session manager, tool-list updates) | `5cdd6faf81` | as above | Agent Tools MCP routes and sessions; tool-list update service with the new AC-003 case | AC-001, AC-003 | `Pass` (8 skipped: live Claude SDK cases behind `RUN_CLAUDE_E2E=1`, not run) | `IMP-05-integration-exposure-files.log` | `Tests  32 passed \| 8 skipped (40)` |

- Not run, and why:
  - The whole `test:integration` suite: only the 7 files that build or read an exposure were run, because the change is one rule and nothing else in integration reads it. Planned by impact, as TESTING.md says.
  - Server E2E: not implementation-scoped.
  - Live runtime suites, including the 8 `RUN_CLAUDE_E2E` cases: they need a real provider. AC-004 belongs to API/E2E.
  - Fresh-start build: no build input changed (`git diff --name-only a781007713 HEAD` touches only server `src`, tests, docs and the ticket folder).

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: no frontend change. The existing "Tools updated" card shows the notice unchanged.

## Downstream Coverage Hints / Suggested Scenarios

- AC-004:
  - a real native run and a real Claude (or Codex) run, each from a definition that does not list `search_memory`. In each, the agent's tool list has it, a call returns results, and the asking run is left out.
  - Use an isolated instance with a built memory index, or a gated runtime suite with the test vault.
- One run of each MCP runtime kind if cheap: AGY, Grok and DeepSeek share the same session path. A `tools/list` check per runtime proves the tool reaches it.
- Upgrade journey: a run created before this build, restored after it. Its first input carries "Your tools changed. Now available: search_memory."; the second carries none.
- A definition that already lists `search_memory` (for example project-task-manager) shows it once in its tool list.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-004 (real runtime check): not covered by any implementation check.
- The real-provider confirmation of AC-001 per runtime. The unit and integration tests prove the exposure, the native instance and the MCP list, but not a real model's tool list.
