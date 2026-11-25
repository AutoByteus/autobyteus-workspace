# Implementation Handoff — remove-long-running-prompt-649

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-long-running-prompt-649`, branch `codex/remove-long-running-prompt-649`, base `origin/personal` @ `bc4351cad7`. Paths are relative to `autobyteus-server-ts/` unless noted.

## Upstream Artifact Package

- Upstream review and handoff rule: `task_size=Small`, `architectural_risk=Low`, so this is the direct route with no architecture review. Implementation → `get_handoff_rules` → `/api_e2e_engineer`.
- Requirements doc: `tickets/in-progress/remove-long-running-prompt-649/requirements-doc.md` (approved by the founder 2026-11-25)
- Investigation notes: `tickets/in-progress/remove-long-running-prompt-649/investigation-notes.md`
- Solution revision record: `tickets/in-progress/remove-long-running-prompt-649/solution-revision-record.md`
- Design spec: `tickets/in-progress/remove-long-running-prompt-649/design-spec.md` (SR-002)
- Supplemental task artifacts: `handoff-implementation-001.md`; `follow-ups.md` (none added)
- Design review report and architecture review revision record: `N/A` (not selected)
- Triggering rework report: N/A (initial round)

## Current Implementation Summary

- Implementation cycle: `Initial`. Revision record: `implementation-revision-record.md`. Current revision: `IR-001`. Related solution revisions: `SR-001`, `SR-002`. Other revision types: `N/A`. Triggering findings: `N/A`.
- Commits:
  - `92d9b01ef3`: source, tests, snapshot and docs.
  - `4e635533e9`: the SD's ticket documents (uncommitted until now), this handoff, the revision record and the evidence.
  - The SML-WRITE summary's last-heading field, which reads the JSON-escaped wire (IMP-04), is already in `92d9b01ef3`.

### Source (Intended Change; design-spec Change Scope)

- **Deleted:** `src/agent-execution/prompt/long-running-command-sections.ts` (the six texts).
- **`src/agent-execution/prompt/carpenter-prompt-composer.ts`:** back to the pre-483 shape.
  - The base input is the exported `SharedCarpenterPromptComposerInput`, and `NativeCarpenterPromptComposerInput` extends it. There is no `longRunningCommandSection`, no blank check and no alias.
  - `composeSharedCarpenterPrompt` is `finalizeCarpenterPrompt(buildSharedCarpenterPromptSections(input))`.
  - The native composer ends with File And Directory Practice.
- **Callers:** `claude-session-bootstrapper.ts`, `codex-thread-bootstrapper.ts`, `agy-agent-run-backend-factory.ts` and `acp-agent-run-backend-factory.ts` stop passing the section; their imports are removed.
- **ACP profile:** the `AcpAgentSessionProfile.longRunningCommandSection` field is removed, along with its values and imports in `grok-build-session-profile.ts` and `deepseek-harness-session-profile.ts`.

### Docs

- `docs/modules/prompt_engineering.md`, as the design lists: the TS Source line, the table row, "then Long-Running Commands" in the shared order, the native order, and the whole "Long-Running Commands Section".
- **One addition beyond the design's list:** `docs/modules/agent_execution.md:968-970` had the sentence "Each runtime's system prompt teaches the long-job habit in its own tools' terms (see [Prompt Engineering](./prompt_engineering.md#long-running-commands-section))". Its link would break and its claim is no longer true, so the sentence is removed (REQ-002). The repository-wide search found it; the investigation's list did not include it.

### Tests (18 files, as listed in the investigation)

- **Removed:** assertions that the section exists.
- **Rewritten:** each "ends with the section" check now checks the pre-483 ending, with a "no `Long-Running Commands`" check beside it (AC-001):
  - composer: the shared prompt ends with `renderGlobalSemanticMemorySection(...)`; the native prompt ends with `FILE_AND_DIRECTORY_PRACTICE_SECTION`;
  - Claude and Codex bootstrappers: the last `## ` heading is Global Semantic Memory;
  - native backend factory: it contains File And Directory Practice; the native core appends Skills after it;
  - Antigravity: Global Semantic Memory is directly followed by the capsule's Working Environment;
  - ACP (Grok): the rules end with the global semantic memory text.
- **Simplified:** the `composeShared` helpers in `collaboration-prompt-sections.test.ts` and `semantic-memory-prompt-section.test.ts` existed only to supply the input, so they are removed and the tests call `composeSharedCarpenterPrompt` directly. The "blank section refused" case and the per-runtime section-text cases are removed.
- **Snapshot:** 20 sections dropped and nothing else changed (IMP-01 states the diff).
- **E2E:**
  - `collaboration-prompt-wording` no longer cuts at the section;
  - `configured-skill-on-demand-loading`'s heading list drops it;
  - `agent-semantic-memory`'s `composedOf` returns the composed prompt (the pre-483 shape) and asserts the absence;
  - `agent-semantic-memory-live` drops `beforeLongRunningCommands`. SML-WRITE now asserts that what the runtime received has no section, and logs its last heading (AC-002);
  - `claude-agent-websocket-interrupt-resume` and `claude-live-agent-harness` stop passing the input.

## Routing Classification (Mandatory)

- Task size: `Small`. Architecture risk: `Low`. From design-spec "Task Size And Architectural Risk".
- Classification: `Confirmed`. The change is a removal across the prompt module, its callers, tests and docs: 28 files, +95/−332, no new code path. There is no persistence, API, security, concurrency or deployment change.
- Selected route: `Direct API/E2E`. Lightweight self-review: `Yes` (below).
- New design impact or escalation trigger: `None`. 483's 2-hour limits and end-reason code are untouched.

## Lightweight Implementation Self-Review

- Every place that made, passed or described the section is gone. `grep -rn "Long-Running Commands\|LONG_RUNNING_COMMAND\|longRunningCommandSection\|long-running-command-sections\|long-running-commands-section"` over `autobyteus-server-ts`, `autobyteus-web`, `autobyteus-ts`, `docs` and the root `*.md` files returns only the absence assertions and comments the design asks for (AC-001). The list is under AC-003 below.
- Nothing is left unused:
  - the composer input types stay exported as the parameter types of the two public composers, as before 483;
  - `grokBuildSessionProfile` is still used in the ACP factory test;
  - no import is left dangling (both typechecks pass at baseline).
- Section order is otherwise unchanged; the snapshot diff shows only the removal.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | No runtime's prompt has the section; other sections and their order unchanged | Claude/Codex bootstrappers, AGY factory, ACP factory (Grok, DeepSeek) → `composeSharedCarpenterPrompt`; native factory → `composeNativeAutoByteusPrompt` | Unit for the composer and every backend (IMP-01); E2E prompt suites (IMP-03); live Claude: received prompt has no section and ends with `## Global Semantic Memory` (IMP-04) |
| BEH-002 | Global-memory note | Done by the Solution Designer (`semantic-global/best-practice-long-running-commands.md`) | Not implementation work; not touched |

- Changes stayed within the Scope Guardrail: `Yes`. Runtime tool descriptions, 483's limits, end reasons and panel, agent skills and the archived 483 ticket are untouched.

## AC-003 Note (repository search)

AC-003 asks that no source, test or doc mention the section. The design also asks for "no Long-Running Commands" assertions (AC-001), and those necessarily name it. The remaining mentions are only these absence checks and their comments:
- `carpenter-prompt-composer.test.ts` (:48, :185–194);
- `semantic-memory-prompt-section.test.ts:71`;
- the Claude, Codex, native, Antigravity and ACP backend tests (one assertion each);
- `agent-semantic-memory.e2e.test.ts:140,147`;
- `agent-semantic-memory-live.e2e.test.ts` (SML-WRITE).

No source file or doc mentions it.

## Key Files Or Areas

- `src/agent-execution/prompt/carpenter-prompt-composer.ts` (−21 lines)
- the five backend files and the ACP profile
- the two docs
- 18 test files plus the snapshot

## Important Assumptions

- Saved runs keep the prompt they started with. Restored runs compose the new prompt (requirements, Data Continuity).

## Known Risks

- None in the code. The product trade-off (agents no longer get the habit in their prompt) was accepted by the founder.

## Task Design Health Assessment Implementation Check

- Change posture: behavior change (removal). Root cause: `No Design Issue Found`. Refactor: `No Refactor Needed`. Implementation matched: `Yes`. Routed as `Design Impact`: `N/A`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. This is a clean cut, with no optional input, empty default or kept constant.
- Legacy old-behavior retained in scope: `No`.
- Dead code in the touched files removed: `Yes`. That includes the test helpers that existed only to pass the input.
- Dead code found elsewhere: None.
- Shared structures remain tight: `Yes`.
- Deviations from a design principle: `None`.
- Size guardrails: `Yes`. Every change shrinks its file.

## Persisted Data Transition Check (When Applicable)

- `Not Affected` (design-spec): prompts are composed at start and restore.

## Environment Or Dependency Notes

- macOS 26.5.2, Node v22.23.1.
- Worktree set up with `pnpm install` and `pnpm -C autobyteus-server-ts prebuild`.
- The untracked `autobyteus-application-*-sdk/dist/` folders are install output and are not committed.

## Checks Run

Evidence: `tickets/in-progress/remove-long-running-prompt-649/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | changed unit tests (run 1), snapshot update (`-u`, diff checked), `vitest run tests/unit/agent-execution tests/unit/agent-team-execution tests/unit/agent-memory` (run 2) | `92d9b01ef3` content | macOS, Node 22 | composer, every backend's prompt, collaboration and memory sections | BEH-001; AC-001 | Pass | `IMP-01-unit-tests.log` | `Snapshots  20 updated`; `Tests  2334 passed \| 6 skipped (2340)` |
| IMP-02 | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | `92d9b01ef3` content | macOS, Node 22 | all TS | — | Pass | `IMP-02-typechecks.log` | `(baseline 972 in 299 files)` PASS; `(baseline 86 in 36 files)` PASS |
| IMP-03 | `configured-skill-on-demand-loading.e2e`; with the scripted AGY (`RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=…/agy-failure-cli.mjs`): `collaboration-prompt-wording.e2e`, `agent-semantic-memory.e2e` | `92d9b01ef3` content | in-process server, no live provider | composed prompts through real roots | BEH-001; AC-001 | Pass | `IMP-03-e2e-prompt-suites.log` | `Tests  4 passed (4)` (run A, configured-skill); `Tests  24 passed (24)` (run B) |
| IMP-04 | `RUN_CLAUDE_E2E=1 … agent-semantic-memory-live.e2e.test.ts -t "SML-WRITE"` (clean env, host login, test vault) | `92d9b01ef3` content | live Claude haiku | the prompt the Claude CLI received (recorded wire) | AC-002 | Pass | `IMP-04-live-claude-prompt.log` | `"instructionsHaveLongRunningCommands":[false],"instructionsLastHeading":["## Global Semantic Memory"]`; ✓ |

- Not run, and why:
  - `claude-agent-websocket-interrupt-resume.e2e` and the other Claude live harness users (gated live). They only lost the input argument, and the typecheck covers them.
  - The other runtimes' live SML cases: the design asks for one live runtime.
  - AC-004 is the Solution Designer's (done).

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: server prompt text only.

## Downstream Coverage Hints / Suggested Scenarios

- A second runtime's live prompt (for example Codex SML-WRITE, whose wire is also recorded), if API/E2E wants more than one.
- The scripted Grok replay suites compose the ACP prompt without the profile field.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Independent validation of AC-001..AC-003 at API/E2E's discretion; AC-004 (file check of the global note).
