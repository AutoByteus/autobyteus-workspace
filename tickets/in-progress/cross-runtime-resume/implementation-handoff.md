# Implementation Handoff — autobyteus-316 (cross-runtime resume, first delivery: one standalone Agent run)

Result: **Implementation Complete**, ready for independent code review (task_size = **Large**, architectural_risk = **High**, unchanged from the design and ARCH-REV-002).

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume`, branch `codex/cross-runtime-resume`, base `origin/personal`. Build commits: `ebb137a012`, `d81709f15e`, `3927e39775`, `bb6fc32b10`, `3521ae05f1` (the last one is what the evidence below was produced on).
- Basis: `requirements-doc.md` (Approved, SR-004), `design-spec.md`, supplement `run-runtime-switch-contract.md`, `design-review-report.md` (ARCH-REV-002 Pass). No requirement or design change was needed. Revision history: `implementation-revision-record.md` (IR-001).

## What was built (by design owner)

| Concern | Where (under `autobyteus-server-ts/src` unless noted) |
|---|---|
| Pending switch persisted with the run | `run-history/store/agent-run-metadata-types.ts`, `agent-run-metadata-store.ts`, `agent-run-pending-runtime-switch.ts` (`parsePendingRuntimeSwitch`, `openRawTraceRuntimeKind` — the one owner of the open file's runtime) |
| Shape of a save (switch, undo, model-only) and its write + read-back | `run-history/services/agent-run-runtime-switch-commit.ts` (`buildRuntimeSwitchMetadata`, `commitAgentRunRuntimeSwitch`); catalog `commitRunRuntimeSwitch`, `recordRunStarted({clearPendingRuntimeSwitch})` |
| Settings save of a stopped run (+ eligibility, fresh-selection validation) | `agent-execution/services/standalone-stopped-run-selection-updater.ts` (renamed from `…model-config-updater`), `stopped-run-selection-context.ts`, `standalone-agent-run-eligibility.ts` (`canSwitchRuntime`), `llm-management/…/run-model-selection*.ts` (`RunModelValidationContext`) |
| Activation at the first input | `agent-execution/services/standalone-agent-run-lifecycle-service.ts` (`activateSwitched`), ports in `agent-execution/domain/runtime-switch.ts` + `runtime-switch-ports.ts`, `runtime/general-process-run-supervisor.ts` (`runtimeSwitching`) |
| Marker + raw-trace rotation (idempotent by key) | `agent-memory/services/runtime-switch-recorder.ts`, `agent-memory/store/external-runtime-memory-writer.ts`, `agent-memory/domain/memory-recording-models.ts`, `autobyteus-ts/src/memory/store/raw-trace-archive-manifest.ts` (`runtime_switch` boundary type) |
| Hand-over notice | `runtime-handover-notices/services/{runtime-handover-notice-builder,runtime-handover-notice-service}.ts`; wired first in the notice slot in `compositions/build-studio-server.ts` |
| Journal translated per file's runtime | `agent-work-journal/{domain,store,services}`, `agent-memory/services/raw-trace-file-source-service.ts`, `memory-search/runs/memory-run-discovery.ts` |
| GraphQL contract (clean cut, `…ModelConfig` → `…Selection` for the single-agent chain) | `api/graphql/types/{agent-run,run-model-config,delegated-launch-selection}.ts`, `agent-collaboration/domain/delegated-launch-selection.ts`, `run-history/services/{delegated-launch-selection-service,studio-run-model-config-service}.ts`, `standalone-agent-run-root/services/standalone-agent-run-root-manager.ts` |
| Web | `autobyteus-web`: `ExistingRunSettings.vue`, `ExistingRunConfigEditor.vue`, `SystemTaskNotificationSegment.vue` (marker in the chat), stores `existingRunConfig*`, drafts and clients under `services/runConfigEditing/`, `types/agent/ExistingRunModelConfigDraft.ts`, localization (en, zh-CN), `graphql/mutations/runHistoryMutations.ts`, `generated/graphql.ts` |
| Docs | `GLOSSARY.md`, `docs/modules/{agent_work_journal,run_history,agent_memory}.md`, `autobyteus-web/docs/settings.md` |

Persisted data: no migration (optional `pendingRuntimeSwitch` metadata field, one new manifest boundary-type value; a journal entry without a per-file runtime is dropped and re-rendered from the raw traces).

## Requirement / acceptance coverage

| AC | Covered by |
|---|---|
| AC-001 (save, undo, member/delegated rejected) | `tests/unit/agent-execution/standalone-stopped-run-selection-updater.test.ts`, `tests/unit/run-history/services/agent-run-runtime-switch-commit.test.ts`, `tests/unit/api/graphql/types/agent-run.test.ts`, web `stores/__tests__/existingRunConfigStore.spec.ts`, `components/run-settings/__tests__/ExistingRunSettings.runtime.spec.ts`; real run |
| AC-002 (marker first, archive, notice before the user's text, once, chat marker) | `tests/unit/agent-memory/runtime-switch-recorder.test.ts`, lifecycle `activateSwitched` suite, `tests/unit/runtime-handover-notices/*`, `tests/unit/standalone-agent-run-root/standalone-runtime-switch-first-message.test.ts`, web `SystemTaskNotificationSegment.spec.ts`; real run |
| AC-004 (latest journal named, earlier listed) | `tests/unit/runtime-handover-notices/*` |
| AC-006 (per-file runtime; never-switched runs unchanged) | `tests/agent-work-journal/*`, `tests/unit/memory-search/memory-run-discovery.test.ts`, `tests/unit/run-history/store/agent-run-pending-runtime-switch.test.ts` |
| AC-007 (same-runtime restore, model-only edit unchanged) | existing suites (all green), model-only cases in the updater and commit tests, write/read-back recovery cases kept on the switch commit |
| AC-008 (real run, isolated data) | `tests/e2e/runtime/runtime-switch-live.e2e.test.ts`; evidence `evidence/real-run/runtime-switch-live/` |
| AC-009 (crash between marker and commit; retry) | lifecycle `activateSwitched` suite ("restore commit did not land", retry cases) and recorder idempotence tests |

## Verification run (implementation-scoped)

- **Clean clone** (`git clone --branch codex/cross-runtime-resume` into `/tmp`, `pnpm install --frozen-lockfile`, shared packages built by the package's own `pretypecheck`): server `pnpm typecheck` exit 0; server `pnpm test:unit` 890 files / 7582 tests passed (5 files, 9 tests skipped as in the base); web full `vitest run` 670 files / 4871 tests passed (2 skipped). Logs: `evidence/implementation/clean-*.txt`.
- **Real run** (AC-008), `evidence/implementation/live-e2e-result.txt` + `evidence/real-run/runtime-switch-live/` (summary, raw-trace manifest, journals), on the final commit and an isolated data root (own temp dirs, no `~/.autobyteus` write; credentials only through the signed-in CLIs' own HOME): Claude Agent SDK (`claude-haiku-4-5-20251001`) → Codex App Server (`gpt-5.6-luna`) → a scripted Antigravity CLI (`tests/fixtures/agy-failure-cli.mjs`, `AGY_FAKE_CASE=auto_compaction`): one run ID, one chat. Asserted on each of the two switches: **I-7** (the archived segment holds exactly the previous agent runtime's records and none written after the marker; manifest segments `[claude_agent_sdk, 11 records]`, `[codex_app_server, 7 records]`), I-3 (one marker per switch), I-5, I-8, per-file journal runtimes, the notice arriving before the user's text, and the new agent opening the journals the notice names. The Antigravity step is scripted (not a live provider): it proves the third pair's record layout, not that provider's behaviour.
- Focused unit suites after the last change (run-history, agent-execution, standalone-agent-run-root, GraphQL agent-run): 207 files passed.

## Deviations, judgement calls and things to look at

1. **Catalog `commitRunModelConfig` and `agent-run-model-config-commit.ts` removed** (only their own test used them once the single commit path covers model-only saves). The result type moved next to the switch commit; the write/read-back recovery cases (reported write failure that landed; write that did not land; missing/throwing read-back) were ported to `agent-run-runtime-switch-commit.test.ts` so no coverage was lost. Reviewer: please confirm the model-only branch of `buildRuntimeSwitchMetadata` keeps the old behaviour byte for byte (same `llmModelIdentifier`/`llmConfig` write, pending switch left alone).
2. **`autobyteus-web/generated/graphql.ts` was edited by hand** to the new schema shape (input `runtimeKind`, `…Selection` names) — codegen was not run against a live schema. The server SDL and the web operations are covered by the GraphQL and store tests; a regeneration would be the check.
3. **Pre-existing, not mine:** `autobyteus-server-ts/tests/e2e/helpers/claude-live-agent-harness.ts` lines 24–27 contain a misplaced `import {` (from commit `f733da620e`, autobyteus-324) so `tsc -p tsconfig.json` over `tests/` reports syntax errors; `tsconfig.build.json` (the project's `typecheck`) is clean and the file is not loaded by the unit suites. Left alone as out of scope; a follow-up for the owner of 324.
4. Untracked `dist/` folders of two SDK packages in the worktree are build outputs, intentionally not committed.
5. Notice wording, the marker text in the chat and the settings labels follow `run-runtime-switch-contract.md` and `GLOSSARY.md` (no short forms of agent runtime names; the notice names neither a runtime nor a model).

## Not done on purpose (scope)

Teams, Org members, delegated copies as switch targets (FU-003); agent- or Router-started switches (FU-004); order with the restart notice of 283–289 (FU-005); stored runtime spelling (done by 343); no release, no merge, no deployment. Follow-ups stay in `follow-ups.md`.

## Route

Large + High → independent code review: `/software_engineering_team/code_reviewer`. Executable validation (API/E2E) follows the code review per the team rules.
