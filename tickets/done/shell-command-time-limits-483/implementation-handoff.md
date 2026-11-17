# Implementation Handoff — shell-command-time-limits-483

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/shell-command-time-limits-483`, branch `codex/shell-command-time-limits-483`, base `origin/personal` @ `4cbf9e7881`. Ticket folder `tickets/in-progress/shell-command-time-limits-483/` (paths below are relative to the worktree).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct route (`task_size=Medium`, `architectural_risk=Low`); no independent architecture review. `get_handoff_rules` → `/api_e2e_engineer` ("Small or Medium and Low … ready for direct API/E2E validation").
- Requirements doc: `tickets/in-progress/shell-command-time-limits-483/requirements-doc.md` (SR-001, Approved)
- Investigation notes: `tickets/in-progress/shell-command-time-limits-483/investigation-notes.md`
- Solution revision record: `tickets/in-progress/shell-command-time-limits-483/solution-revision-record.md`
- Design spec: `tickets/in-progress/shell-command-time-limits-483/design-spec.md` (SR-001, Ready)
- Supplemental task artifacts: `evidence/claude-timeout-probe/` (Solution Designer's probe; not rerun here)
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: N/A (initial round)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `tickets/in-progress/shell-command-time-limits-483/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review / code-review / API/E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Commits (on the branch, in order): `6e3b6b9ce4` baseline test fix (contracts runtime names), `30aec70770` server, `0f0a234dab` web + probe, `f6cdf0fb15` backend prompt tests and stale fixtures, `fa09807536` catalog/typing test fixes, then the ticket-documents commit that carries this file.

What exists now:

1. **Claude shell time limits (REQ-001, REQ-002).** `buildClaudeSdkSpawnEnvironment` applies, after the auth policy and the one-hour cache default, `applyClaudeShellTimeLimitDefaults` (`runtime-management/claude/claude-shell-time-limit-setting.ts`): `BASH_DEFAULT_TIMEOUT_MS` and `BASH_MAX_TIMEOUT_MS` are set to `"7200000"` each only when the variable is `undefined` in the environment (an empty or any user value is kept). Nothing else sets them.
2. **End reason and exit code (REQ-003).** `AgentBackgroundTask` has `endReason` (`time_limit` | `low_memory` | `run_ended` | null, `AGENT_BACKGROUND_TASK_END_REASONS`) and `exitCode` (integer | null). Wire payload `end_reason`, `exit_code`: required-nullable in the builder, the strict parser, the presentation-contracts schema (`backgroundTaskEndReasonSchema`) and therefore the team-stream schema; GraphQL `AgentBackgroundTask.endReason: AgentBackgroundTaskEndReason`, `exitCode: Int` (nullable). Producers:
   - Claude: `readClaudeTaskEnd` (`backends/claude/session/claude-background-task-end.ts`, the only place that knows Claude's summary wording) reads `task_notification` `status`/`summary`/`reason`: `completed (exit code N[: note])` → exit N; `failed with exit code N` → exit N; `was stopped after reaching its background time limit` → `time_limit`; `was stopped because the system is running low on memory` → `low_memory`; `reason: worker_restart` → `run_ended`; anything else → nulls. Patterns match the summary's end only. The registry fills summary / end reason / exit code still null on a task a `task_updated` ended first; `clear()` (process end) → `stopped` + `run_ended`.
   - Native: the reporter maps an exit code to the `exitCode` field (summary null; the old `"exit code N"` summary is gone); `markRunEnding()` is called by `AutoByteusAgentRunBackend.terminate()` right before `removeAgent`; from then on every end without an exit code (the run's signal, or the manager's `"Stopped when the run ended"`) is `stopped` + `run_ended` with its summary kept. Without run end: signal → `stopped` (summary `signal X`, no reason), error → `failed`. `backgroundTaskInspection.current()` now reads `reporter.list()`, so one owner maps native tasks.
   - Antigravity: exit message → `exitCode` (summary = AGY's text as before); `stopAll()` → `stopped` + `run_ended`.
   - Transports that list fields one by one now carry both: server `agent-presentation-message-projector.ts`, `team-agent-event-websocket-projector.ts`; web `teamStreamDtoAdapters.ts` (found by the web typecheck), stream handler, view query (`generated/graphql.ts` regenerated).
3. **Reason line (REQ-004).** `autobyteus-web/utils/backgroundTaskEnd.ts` `describeBackgroundTaskEnd(row)`: running → null; `endReason` → that kind; else `exitCode` → `exit_code`; else null. Desktop `BackgroundTaskPanel.vue` renders it as one `data-test="background-task-end"` line in the row's existing text style (replaces the snapshot-only `background-task-exit` paragraph); the summary button stays. Phone `MobileBackgroundTasks.vue` `endOf()`: the descriptor's line, else the summary (one line, English as its other strings). Strings en/zh-CN: `end.timeLimit`, `end.lowMemory`, `end.runEnded`, existing `exitCode`, `noRun`.
4. **No-run state (REQ-005).** `useBackgroundTaskPanelView` mode `no-run` when no run is selected; the panel shows "Select an agent to see its background tasks.", no counts, no "Checking…", and reads nothing.
5. **Panel probe (REQ-006).** `pnpm -C autobyteus-web test:e2e:background-tasks-panel` answers `AgentBackgroundTaskView` per run (event-stream, snapshot with a polled row, unsupported), owns the app shell's node sockets (`routeWebSocket`), follows the 473 expand-to-read rule, and adds BT-UI-008 (end reasons), BT-UI-009 (snapshot/unsupported), BT-UI-010 (no run).
6. **Long-Running Commands sections (REQ-007).** `agent-execution/prompt/long-running-command-sections.ts` holds the Claude, Codex, Grok, Antigravity, generic (DeepSeek Harness) and native texts. `composeSharedCarpenterPrompt` requires `longRunningCommandSection` (blank refused) and places it last; native composer appends the native section last. Callers: Claude bootstrapper, Codex bootstrapper, AGY factory, ACP factory (from `AcpAgentSessionProfile.longRunningCommandSection`: Grok → Grok section, DeepSeek Harness → generic).
7. GLOSSARY: "End reason" entry next to the background-task entries.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md`, Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: 90 files changed in total, most of them tests, fixtures, snapshots and generated output. Every source change is a small edit inside its existing owner, plus four small new files (largest source delta: reporter 52 lines). The contract change is the two designed nullable fields, carried through the existing transports; nothing stored (no persisted shape changed). No new owner, route, security, concurrency or deployment surface. None of the design's escalation triggers fired (Codex needs no reason transport; the variables are honoured per probe B; ASM-001 is still for API/E2E).
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001/002 | 2 h foreground/background in Claude runs; explicit values kept | `claude-sdk-client.ts` → `buildClaudeSdkSpawnEnvironment` → `applyClaudeShellTimeLimitDefaults` → SDK `env` | Unit: AC-003 (server env value kept, other filled), AC-004 (both 7200000, cache/auth unchanged). Live AC-001/AC-002 and settings-`env` precedence (ASM-001) left to API/E2E |
| BEH-003 | End reason + exit code, one line on desktop and phone; summary otherwise | Claude registry + `claude-background-task-end.ts`; native reporter + backend `markRunEnding`; AGY monitor → payload builder → contracts/GraphQL/projectors → web handler/team adapter/seed → `describeBackgroundTaskEnd` → panel / phone | Unit per producer (AC-005..AC-008 mappings), parser/schema, web helper/panel/phone; probe BT-UI-008. Live AC-005/AC-007 left to API/E2E |
| BEH-004 | No-run state | `useBackgroundTaskPanelView` (`no-run`) → `BackgroundTaskPanel.vue` | Spec (AC-009) + probe BT-UI-010 |
| BEH-005 | Other runtimes unchanged | No code | AC-002 long runs are API/E2E's |
| BEH-006 | Per-runtime section, last; nothing else changes | `long-running-command-sections.ts` → composer → 4 shared callers + ACP session profiles + native composer | Composer tests (placement, only the section differs, ≤ 8 lines, terms) and each backend's own prompt test (AC-011). AC-012 (observed habit) left to API/E2E |
| BEH-007 | Current probe | `tests/e2e/background-tasks-panel-probe.mjs`, fixture page | Before: BT-UI-001 failed ("Current count unavailable"); after: 10/10 pass |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server (`autobyteus-server-ts/src/`):
- Added: `runtime-management/claude/claude-shell-time-limit-setting.ts`, `agent-execution/backends/claude/session/claude-background-task-end.ts`, `agent-execution/prompt/long-running-command-sections.ts`
- Modified: `runtime-management/claude/client/claude-sdk-spawn-environment.ts`; `agent-execution/domain/agent-background-task.ts`; `agent-execution/backends/claude/session/claude-background-task-registry.ts`; `agent-execution/backends/autobyteus/autobyteus-background-task-reporter.ts`, `autobyteus-agent-run-backend.ts`; `agent-execution/backends/antigravity/stream/agy-background-task-monitor.ts`; `api/graphql/types/agent-background-task-view.ts`; `agent-collaboration/execution/events/agent-presentation-message-projector.ts`; `services/agent-streaming/team-agent-event-websocket-projector.ts`; `agent-execution/prompt/carpenter-prompt-composer.ts`; `agent-execution/backends/{claude/backend/claude-session-bootstrapper,codex/backend/codex-thread-bootstrapper,antigravity/backend/agy-agent-run-backend-factory,acp/backend/acp-agent-run-backend-factory,acp/acp-agent-session-profile,grok/grok-build-session-profile,deepseek-harness/deepseek-harness-session-profile}.ts`

Contracts: `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts` (+ tracked `dist/`), `autobyteus-team-stream-contracts/dist/` rebuilt.

Web (`autobyteus-web/`): added `utils/backgroundTaskEnd.ts`; modified `types/backgroundTask.ts`, `types/backgroundTaskView.ts`, `services/agentStreaming/protocol/messageTypes.ts`, `services/agentStreaming/handlers/backgroundTaskHandler.ts`, `services/agentStreaming/teamStreamDtoAdapters.ts`, `graphql/queries/agentBackgroundTaskQueries.ts`, `generated/graphql.ts`, `composables/useBackgroundTaskPanelView.ts`, `components/progress/BackgroundTaskPanel.vue`, `components/mobile/views/MobileBackgroundTasks.vue`, `localization/messages/{en,zh-CN}/workspace.ts`, `tests/e2e/background-tasks-panel-probe.mjs`, `tests/e2e/fixtures/background-tasks-panel.page.vue`.

Docs: `GLOSSARY.md`.

## Important Assumptions

- Claude Code 2.1.325's summary wording (read from its bundle: `RIt`/`HRo`) is what users run; RSK-002 applies to later versions (unknown wording → no reason, summary shown).
- ASM-001 (Claude settings `env` overrides the process value) is not verified here.

## Known Risks

- RSK-001 / RSK-002 as in the requirements.
- **AGY interrupt shows "Stopped: the run ended".** All five `stopAll()` callers stop the AGY process, including a user Stop of a turn (`agy-agent-run-backend.ts` interrupt). Per the design (`stopAll` → `run_ended`, "the run or its runtime process ended") such tasks read "Stopped: the run ended" although the run itself continues. Not a defect against the approved text; noted for the Solution Designer's awareness.
- The phone's strings stay English only (as its other strings, per the requirements).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior change with a small feature
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: each change landed in the owner the design names; deviations below are placement/detail choices, not architecture changes.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (fields are required-nullable everywhere; no optional/legacy reading)
- Legacy old-behavior retained in scope: `No` (native `"exit code N"` summary removed; panel `background-task-exit` paragraph and phone exit-code branch replaced; the old "sets neither BASH_* variable" test rewritten to the new rule)
- Dead code in the touched files and modules removed: `Yes` (`toAgentBackgroundTask` import in the native backend replaced by `reporter.list()`; nothing left unreached)
- Dead code found elsewhere, added to `follow-ups.md`: None. `follow-ups.md` FU-002 records test-timing failures (not dead code).
- Shared structures remain tight: `Yes` — `exitCode` has the same name and meaning as on Codex snapshot rows; `BackgroundTaskSnapshotRow` fixes `endReason: null`.
- Canonical shared design guidance reapplied: `Yes`
- Deviations decided during implementation:
  - **ACP section owner** (design: `AcpAgentLaunchProfile` field set in the Grok/DeepSeek launch profiles). Implemented on `AcpAgentSessionProfile` (`agent-execution/backends/{grok,deepseek-harness}/*-session-profile.ts`). Reason: the launch profile owns process concerns in `runtime-management/`; the session profile already owns what the agent sees in its session (it carries the composed prompt into `_meta.rules`). Putting the section there keeps `runtime-management` from importing `agent-execution/prompt`. Same input to the composer; no behavior difference (Principles 3, 9).
  - **Native run-end mapping** covers both non-exit-code ends during run end (signal, and the manager's `{ error: "Stopped when the run ended" }` that `stopAllForRunEnd` records for tasks whose end did not arrive), not only signals. Without it a run-end task could show "Failed" instead of AC-007's "Stopped: the run ended".
  - **Duplicate wording**: the sections say "never start the same command again while it still runs, or a second command that only waits for it", not "a second copy": the collaboration prompt test forbids "copy" in prompts (in collaboration a copy is a delegated run, Principle 15).
  - **Composer types**: a private base input type; shared input = base + required `longRunningCommandSection`, native input = base + `workspaceRootPath` (native appends its own section).
- Changed source files within size guardrails: `Yes` (largest touched file 378 effective lines; largest delta 52 lines)
- Notes: an archived contract, `tickets/done/agent-semantic-memory/semantic-memory-prompt-contract.md` §5.2 ("nothing after" Semantic Memory on the shared path), no longer holds literally: the runtime's Long-Running Commands section follows it. Its §4 order is preserved (the new section is after every existing one); the semantic-memory tests now say so.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: Persisted Data / State Transition Decision
- Implementation follows the approved decision: `Yes` (no stored shape touched; history stores only notices)
- Deviation: `None`

## Environment Or Dependency Notes

- Node 22.23.1, macOS 26 (darwin 25.5), pnpm 10.28.2; `pnpm install --frozen-lockfile`, `prebuild`, `nuxt prepare` run first.
- The machine was heavily loaded by other processes during the runs (load average 53–95; `fseventsd` 130–140% CPU, a Docker VM, a Python process). That caused only the timeouts recorded in FU-002.
- Build-input paths touched: `autobyteus-web/generated/**` and the contract packages (tracked `src/` + `dist/`, committed). No gate reads a new build output; the contracts' `dist/` is tracked and in sync (IMP-01), so DESIGN.md rule 12 adds no prepare step. The TESTING.md fresh-start build was not run here (see below).
- Untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` are local build outputs from the typecheck prepare; not committed.

## Checks Run

Evidence folder: `tickets/in-progress/shell-command-time-limits-483/evidence/`. All on macOS, Node 22.23.1.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-00 | Panel probe before its update: `pnpm -C autobyteus-web test:e2e:background-tasks-panel --output-dir …/IMP-00-probe-before` | working tree before `0f0a234dab` (probe not yet updated) | headless Chrome, Nuxt dev | old probe vs current panel | REQ-006 (reproduction) | Fail (expected) | `IMP-00-probe-before/evidence.json` | `'Current count unavailable'` vs `'0 running · 0 total'` in BT-UI-001 |
| IMP-01 | `pnpm -C <pkg> test` for agent-presentation, team-stream, collaboration-stream contracts; dist rebuild diff | `f6cdf0fb15` | Node | schemas, tracked dist | QR-001 | Pass | `IMP-01-contracts.log` | `# pass 22` / `# pass 13` / `# pass 36`, `# fail 0`; dist `clean` |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit` | `0f0a234dab` | Node | whole server unit suite | all server-side AC unit parts | Pass for this change (5 failures: 2 stale expectations fixed and rerun in IMP-10; 3 FS-event timeouts, FU-002) | `IMP-02-server-unit.log`, `IMP-02b-watcher-timeouts.log` | `Tests  5 failed \| 8273 passed`; failing files listed under `Failed Tests 5` |
| IMP-03 | `pnpm -C autobyteus-server-ts typecheck` | `fa09807536` | Node | server src + tests | — | Pass | `IMP-03-server-typecheck.log` | `production errors: 0; test-file errors: 1012 … (baseline 1012 …)`, `PASS` |
| IMP-04 | `pnpm -C autobyteus-web test:nuxt` | `f6cdf0fb15` | happy-dom | whole web unit/component suite | AC-005..AC-009 web parts | Pass after fix (1 failure: catalog key count, fixed and rerun in IMP-10) | `IMP-04-web-nuxt.log` | `Tests  1 failed \| 5696 passed` (the `backgroundTaskPanelCatalog.spec.ts` count) |
| IMP-05 | `pnpm -C autobyteus-web typecheck` | `f6cdf0fb15` (no web change after it except a spec's literals) | Node | Nuxt app, Electron, cross-package tests (server src) | — | Pass | `IMP-05-web-typecheck.log` | `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)`, `PASS` |
| IMP-06 | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `f6cdf0fb15` | Node | web strings and boundaries | — | Pass | `IMP-06-web-guards.log` | `Passed.` ×2, `Passed with zero unresolved findings.` |
| IMP-07 | `pnpm -C autobyteus-server-ts test:integration:prepare` then `test:integration` (runs the whole folder) | `f6cdf0fb15` | Node | integration suite incl. the two changed fixture files | notices with the new payload | Pass for this change (3 files with timeouts in untouched code, FU-002) | `IMP-07-server-integration.log` | `Tests  10 failed \| 495 passed`; failures only in package-auto-refresh, file-system-watcher, studio-server-http-contract (4/4 pass alone) |
| IMP-08 | `pnpm -C autobyteus-web test:e2e:background-tasks-panel --output-dir …/IMP-08-panel-probe` | `0f0a234dab` (panel and probe unchanged since) | headless Chrome 156, Nuxt dev, probe-owned | ProgressPanel, BackgroundTaskPanel, stream projector, view query | REQ-004, REQ-005, REQ-006; AC-005..AC-010 (rendered) | Pass | `IMP-08-panel-probe/evidence.json`, `01..13-*.png` | `"result": "Pass"`, BT-UI-001..010 `Pass`; `10-end-reasons.png`, `11-snapshot-run.png`, `12-unsupported-run.png`, `13-no-run.png` |
| IMP-09 | `pnpm -C autobyteus-web codegen:check` | `f6cdf0fb15` | Node (builds server) | generated GraphQL types vs schema | — | Pass | `IMP-09-codegen-check.log` | `autobyteus-web/generated/graphql.ts is current.` |
| IMP-10 | Rerun of the specs fixed after IMP-02/IMP-04 (admission, ACP factory, Claude/Codex/AGY/native backend prompt tests; catalog spec) | `fa09807536` | Node | those specs | AC-011, QR-001 | Pass | `IMP-10-fixed-specs-rerun.log` | server `Tests  98 passed`, web `Tests  2 passed` |

Focused unit coverage added (inside IMP-02/IMP-04/IMP-10): `claude-shell-time-limit-setting.test.ts`, `claude-sdk-spawn-environment.test.ts` (AC-003/AC-004), `claude-sdk-client.test.ts` (child env, AC-003/AC-004), `claude-background-task-end.test.ts` + registry tests (AC-005, AC-006, AC-008, worker restart, fill-in order), `autobyteus-background-tasks.test.ts` (exit code field; real run-end via `terminate()` → `stopped`/`run_ended`, AC-007), `agy-background-task-monitor.test.ts`, `agent-background-task.test.ts` (wire/parser, required-nullable), `agent-background-task-view.test.ts` (GraphQL enum/fields), composer + per-backend prompt tests (AC-011), web `backgroundTaskEnd.spec.ts`, panel specs (end lines, AC-008, AC-009), phone spec, handler/store/team-stream specs.

- Not run, and why:
  - Live checks AC-001, AC-002 (Claude, Codex, Grok, Antigravity, native > 30 min), AC-003 settings-`env` part (ASM-001), AC-005/AC-007 live, AC-012: need real runtimes on an isolated instance; API/E2E's.
  - Phone bundle (`pnpm -C autobyteus-web test:e2e:mobile-shell`, TESTING.md: phone behavior is proven on the phone bundle): not run; needs its probe-owned stack. MSP-47 asserts `/exit/i` on the ended row, which "exit code 1" still matches.
  - Gated server E2E suites whose assertions I updated (`tests/e2e/runtime/autobyteus-background-task-transport.e2e.test.ts`: exit code is now `exit_code`, summary null) and the Claude harnesses that compose the prompt: not run (gated).
  - TESTING.md fresh-start build (the diff touches `autobyteus-web/generated/**` and contract packages): not run here.
  - The Claude timeout probe (`evidence/claude-timeout-probe/`): not rerun; the env path is pinned by unit tests.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: desktop Activity tab → Background Tasks section (ended rows, polled rows, unsupported, no run); phone Activity background-task list.
- Approved references: requirements-doc "UI, Interaction, And Experience Requirements" (one plain line, existing row text style, chips unchanged, en + zh-CN desktop, phone English); design-spec examples (wording).
- Existing design system / adjacent surfaces reviewed: the row's existing text lines (kind line, summary button, the former exit-code paragraph), the empty state, the availability line.
- Testing guideline / surface used: browser probe `test:e2e:background-tasks-panel` (headless Chrome, Nuxt dev, production ProgressPanel at right-panel width, 380 and 320 px).
- States inspected: running; completed with exit 0; failed with exit 1/3; stopped with time limit (two-line wrap at 320 px), low memory, run end, no cause (summary only); polled snapshot row (`Exit code 2`); unsupported answer; no run; collapse/expand; long command/summary expand; narrow panel overflow.
- Issues found and corrected: the probe's own locators broke on the extra line (`p` → `p[title]`); no product layout issue seen. The reason line sits above the summary, inside the row (checked by bounding box in BT-UI-008).
- Remaining unverified: the phone surface was checked with component specs only (no phone-bundle probe run); the desktop Electron shell was not opened (web-equivalent surface).

## Downstream Coverage Hints / Suggested Scenarios

- AC-001: Claude run, foreground `bash long-job.sh` of ~11 min (script file, not bare `sleep`), no timeout argument → the tool result is the command's output.
- AC-002: per runtime, a 35-min background script; the panel shows Completed (Codex: snapshot row, exit code 0).
- AC-003: start the isolated instance with `BASH_MAX_TIMEOUT_MS=900000` in its environment, and once with the value only in a test-owned Claude settings `env` (never the user's `~/.claude`); check the child's environment (e.g. `ps eww` of the `claude` child or a Bash `echo $BASH_MAX_TIMEOUT_MS`).
- AC-005: Claude `run_in_background` with `timeout: 300000` on a longer script → "Stopped" + "Stopped: it reached its time limit — not a failure of the command" on desktop and phone.
- AC-007: terminate a Claude, a native and an AGY run while a background command runs → "Stopped: the run ended".
- AC-008: native `kill <pid>` of its own background command → "Stopped" + `signal SIGTERM`, no reason line.
- AC-011/AC-012: the run's captured system instructions contain the runtime's section; observe a Claude run waiting for a > 10-min job.
- Team path: a Claude team member's ended task shows its reason through the team stream (web adapter now copies the fields).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- All live acceptance criteria above (AC-001, AC-002, AC-003 settings part, AC-005, AC-007 live, AC-012) and the phone-bundle check.
- The gated `autobyteus-background-task-transport.e2e.test.ts` with its updated `exit_code` assertions.
- Docs for delivery's sync (they describe the old payload): `autobyteus-server-ts/docs/modules/agent_execution.md` (the `BACKGROUND_TASK_UPDATED` field list; native "Publication" bullet `summary exit code N / signal X`; Claude registry paragraph on ends) and `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` (monitor paragraph: exit code, `stopAll` → `run_ended`).
