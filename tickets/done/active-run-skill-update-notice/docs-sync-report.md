# Docs Sync Report — active-run-skill-update-notice

Current for delivery round **DR-002**. The DR-002 delta is at the end. The DR-001 sections below stay valid except where the delta says otherwise.

## Scope

- Ticket: `active-run-skill-update-notice`. `task_size=Large`, `architectural_risk=High`, reviewed route.
  - Architecture review: ARCH-REV-003 (SR-004).
  - Code review: CRR-004 (implementation, 9.3/10) and CRR-005 (test code).
  - API/E2E: API-REV-002, Pass 96%.
- Trigger: CRR-005 pass from `code_reviewer` (2026-10-13).
- Bootstrap base reference: `origin/personal` @ `6473e2694`.
- Integrated base reference used for docs sync: `origin/personal` @ `a609de982a22925299d550bea4084e578cc5cd60`. It was merged into the ticket branch as `fdb592830c`.
- Post-integration verification reference: `release-deployment-report.md` § Verification Checks; logs in `delivery-evidence/dr-001/`.

## Why Docs Were Updated

- Summary:
  - A new server subsystem, `src/skill-update-notices/`, notifies active and resumable runs when a skill they use changes.
  - `AgentRun` gained two generic ports: the input preface and the lifecycle observer.
  - The core memory gained a generic `platform_input_preface` recording rule.
  - Each run's memory folder gained `seen_skill_versions.json`.
  - The web labels the notice "Skill updated".
  - The implementation changed no long-lived docs. One existing statement became false: `agent_execution.md` said memory records only Claude background-task notices as `system_task_notification` traces.
- Why this should live in long-lived project docs:
  - The ports and their ownership rules are durable architecture. `agent-execution` never imports the feature, and only external inputs carry a preface.
  - The per-run state and the delivery semantics per runtime are durable too.
  - Future work on run input, memory, skills or the follow-ups FT-1…FT-3 must follow them.

## Long-Lived Docs Reviewed

| Doc Path | Why Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/skill_update_notices.md` | New subsystem had no doc | Updated (new) | Canonical home |
| `autobyteus-server-ts/docs/modules/README.md` | Module index | Updated | Row added |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | `AgentRun` input dispatch; system-notice recording statement | Updated | New subsection "Platform Input Preface And Run Lifecycle Observer"; the "only these" sentence corrected to the sender allow-list |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Run memory files | Updated | `seen_skill_versions.json` added |
| `autobyteus-server-ts/docs/modules/skills.md` | Skill behavior during runs | Updated | Short "Skill Changes During Active Runs" section with a pointer |
| `autobyteus-server-ts/docs/modules/agent_package_definitions.md` | Said skill edits are "never announced" | Updated | Clarified "on this feed" and pointed to skill update notices |
| `autobyteus-ts/docs/agent_memory_design.md` | Native ingest of the combined dispatch | Updated | § 10: preface tag, two traces, explicit `rawTraceIds`, combined working-context content |
| `autobyteus-web/docs/agent_execution_architecture.md` | `SystemTaskNotificationSegment` | Updated | "Skill updated" label rule and localization key |
| `autobyteus-server-ts/docs/modules/run_history.md` | Replay of `system_task_notification` | No change | It describes the trace replay generically; there is no sender-specific statement |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | Composition, persistence | No change | The persistence summary is subsystem-level; the per-run file is documented in `agent_memory.md` |
| `autobyteus-web/docs/skills.md` | Skills page | No change | The Skills page is unchanged (out of scope per design) |
| `TESTING.md` | Reviewer asked to list the gated commands | No change | See below |

### `TESTING.md` no-change rationale

`TESTING.md` § "When this file may be updated" says not to describe one suite, its gate or its command there. These belong in the test file's header. The "Gated runtime suites" row already says "The gate and command are in the test file". The new suites' headers carry them:
- `agy-skill-update-notice-roots.e2e.test.ts`, lines 30–32: the full `env -u … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=…` command;
- `agy-skill-update-notice-transport.e2e.test.ts`, line 17;
- `skill-update-notice-live.e2e.test.ts`, lines 28–39: `RUN_SKILL_NOTICE_E2E`, `SKILL_NOTICE_E2E_RUNTIMES`, the temporary `CODEX_HOME` / `GROK_HOME`, and the command.

The global rules these suites rely on are already in `TESTING.md`: the scripted AGY CLI, test-only runtime CLI homes, and the clean environment. No global rule changed.

## Docs Updated

| Doc Path | Type | What Changed | Why |
| --- | --- | --- | --- |
| `skill_update_notices.md` (new) | Module doc | Scope, sources, tracking (new/restore, definition binding, C-06 gap), per-folder watching and release, settle, ignore list, re-resolution by name, notice text, busy/idle/stopped delivery per runtime, at-least-once guarantee, web/history per runtime family, persisted file, composition and close order, ownership rules | Durable design from `design-spec.md` (SR-004) and IR-002/IR-003; checked against the code (builder text, busy check, ports, supervisor wiring) |
| `agent_execution.md` | Contract | Preface port and lifecycle observer; recording allow-list wording | Generic boundary other features will reuse; stale statement fixed |
| `agent_memory.md` | File list | `seen_skill_versions.json` | New per-run state |
| `skills.md` | Pointer | Skill changes during active runs | Discoverability |
| `agent_package_definitions.md` | Clarification | "never announced on this feed", plus a pointer | Avoids a contradiction with the new behavior |
| `autobyteus-ts/docs/agent_memory_design.md` | Contract | `platform_input_preface` ingest rules | Core convention (SR-004, N-1) |
| `autobyteus-web/docs/agent_execution_architecture.md` | UI | "Skill updated" label | Web behavior |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need | Source | Target |
| --- | --- | --- | --- |
| Delivery semantics | Busy → agent-message path (append on Codex/Claude, next turn elsewhere); idle/stopped → combined with the next input; never woken | `design-spec.md` DS-002/003 | `skill_update_notices.md` |
| Generic ports | Preface only on external inputs; settled only on forward; feature-agnostic | DS-003, Ownership Boundaries | `agent_execution.md` |
| History | The external recorder allow-list; the native preface tag and its two traces | DS-004, SR-004 | `agent_execution.md`, `agent_memory_design.md` |
| Watch lifecycle | One chokidar instance per used folder, closed when unused (CR-005) | IR-003 | `skill_update_notices.md` |
| Restore behavior | The stored seen record; the first input waits only for restored runs (CR-001) | IR-002 | `skill_update_notices.md` |
| Known gaps | C-06 application-scope runs; FT-1…FT-3 | `follow-up-tasks.md`, review | `skill_update_notices.md` |

## Removed / Replaced Components Recorded

None. This is a pure addition. The only replaced statement is the "only these notices" recording claim in `agent_execution.md`.

## No-Impact Decision

Not applicable: docs were updated. `TESTING.md` alone is unchanged, as recorded above.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: commit the docs; write the handoff summary; hold for user verification.

## DR-002 Delta (after the DR-001 Local Fix)

- Trigger: CRR-007 test-review pass after IR-004 (`f977849b29`), CRR-006 and API-REV-003. Branch at `06c4a62f16`.
- Integrated base: `origin/personal` @ `c2e366806ae20622084d06917f7132967c5fb8a2` (300 commits; v1.5.5-beta.1). Merged as `0be06dea6b` with no textual conflicts.
- Docs re-verified:
  - **`skill_update_notices.md`**, updated by IR-004 (no-create write, retries 1/5/15/60 s while tracked, nothing written after release, awaited `close()`). It was checked against the code: the `stat` directory check, the `wx` temp file, `DEFAULT_SEEN_VERSIONS_RETRY_DELAYS_MS` and `close()` → watcher, service, tracker.
  - **Delivery addition** (`480d9f4aa4`): the accepted limitation that a run whose memory folder never appears while tracked has no stored record.
  - **Docs edited on both sides of the merge:** `modules/README.md`, `agent_execution.md`, `agent_memory.md`, web `agent_execution_architecture.md`. They merged cleanly. This ticket's sections are intact and unique (index row; "Platform Input Preface And Run Lifecycle Observer"; recording allow-list; `seen_skill_versions.json`; "Skill updated" label).
  - **Base feature checked for doc impact:** private runtime skill profiles (`runtime-skill-profile.ts`, shared workspaces). Profiles **symlink** each skill to its real source folder, so runtimes still read live files, and the notice's `SKILL.md` path stays correct. `skills.md` § "Skill Changes During Active Runs" remains accurate.
- `TESTING.md`: still unchanged. The base's `TESTING.md` additions (signed-in CLI `HOME`, the AGY gap, migration testing) kept the same "When this file may be updated" policy. The live suite header (`skill-update-notice-live.e2e.test.ts`, file header comment) documents the new restore/delete case per runtime, its gate and its command.
- Result: `Pass`.
