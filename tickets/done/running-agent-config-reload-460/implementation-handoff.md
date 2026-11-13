# Implementation Handoff — autobyteus-460

## Status

**Implementation complete; ready for Code Review (IR-002).** Everything in design SR-004 is implemented and checked.
IR-001 raised Design Impact DI-001 (the Claude CLI does not list a skill linked mid-run when the run started without a
`.claude/skills` folder). The Solution Designer resolved it in SR-004, and the architecture review passed it in round 3
(ARCH-REV-003): Claude preparation now ensures the folder exists. AC-011 passes live for a zero-skills start (IMP-13).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Large / High → independent architecture review selected; `design-review-report.md` round 3 `Pass` (ARCH-REV-003, SR-004). This round's result: implementation complete → `/software_engineering_team/code_reviewer`.
- Requirements doc: `tickets/in-progress/running-agent-config-reload-460/requirements-doc.md` (Approved, SR-002)
- Investigation notes: `tickets/in-progress/running-agent-config-reload-460/investigation-notes.md`
- Solution revision record: `tickets/in-progress/running-agent-config-reload-460/solution-revision-record.md`
- Design spec: `tickets/in-progress/running-agent-config-reload-460/design-spec.md` (SR-004, Ready)
- Supplemental task artifacts: `evidence/claude-skill-hot-reload-probe*` (designer's probe), `follow-ups.md`
- Design review report: `tickets/in-progress/running-agent-config-reload-460/design-review-report.md`
- Architecture review revision record: `tickets/in-progress/running-agent-config-reload-460/architecture-review-revision-record.md`
- Triggering rework report: DI-001 (IR-001) → SR-004; `design-review-report.md` round 3

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-002, after the design revision for DI-001)
- Implementation revision record: `tickets/in-progress/running-agent-config-reload-460/implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (baseline IR-001)
- Related solution revision IDs: SR-002, SR-003, SR-004
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003
- Related code-review / API-E2E / delivery revision IDs: N/A
- Triggering finding IDs: DI-001

The design's Change / Refactor Sequence, steps 1–6 (plus the SR-004 item in step 2):

1. **Codex planner extracted.** `codex/codex-workspace-skill-request-planner.ts` (`CodexWorkspaceSkillRequestPlanner.plan`) holds the `skills/list` rule (D-19) once. The bootstrapper uses it at start; `RunWorkspaceSkills` uses it mid-run.
2. **One holder per run.**
   - `backends/shared/run-workspace-skills.ts` (`RunWorkspaceSkills`) holds a run's workspace links (Claude, Codex, Grok, DeepSeek) from preparation to release.
     - `acquire`: the preparation's links. Its effective requests become the applied names, Codex `reconcile-discoverable` included.
     - `addFrom(definition)`: links resolved names that are not applied yet. One name per materializer call; adds run one after another. A failure is logged per name and the name stays unapplied.
     - `release()`: sets `closed` synchronously, awaits the add in flight, then releases every held link. It is idempotent once done and retryable after a failure; `closed` stays set.
     - `hasSkills()`: whether the run holds any link (for Claude's `allowedTools`).
     - Every guard reads `closed`, never `isActive()`.
   - The factories create the holder when preparation starts (`createRunWorkspaceSkills(runId)` on the Claude and Codex bootstrappers; directly in the ACP factory) and pass it in `ProviderPreparationGuard.workspaceSkills`.
   - SR-004: `ClaudeSessionBootstrapper` ensures `<workspace>/.claude/skills` exists on every preparation (new and restore) before the session starts. The path comes from the Claude profile's `workspaceSkillsRootSegments`; nothing removes the folder; a failure is logged with the run ID and does not fail the preparation.
   - Release paths:
     - Claude: cleanup's `skills` stage, and the factory's failed preparation.
     - Codex: `CodexThreadManager.releasePreparation`, and the factory's `releaseResources`.
     - ACP: `releaseResources`.
3. **Contract.** `AgentRunBackend.applyDefinitionSkills(definition)`, with `AgentRun.applyDefinitionSkills` rejecting an inactive run.
   - Claude, Codex, ACP: `RunWorkspaceSkills.addFrom`.
   - Antigravity: `addAgyRunCapsuleSkills`. One binding per linker call with a per-name catch, and an atomic `manifest.json` rewrite (temporary file + rename) listing only the linked names. Adds are serialized in the backend.
   - Native: a no-op.
4. **Credential proxy (read only).**
   - `RunPassRegistry.grantedIntegrationIds(runId)`.
   - `IntegrationRunAccess.integrationsStartingOnRestart(run, skillNames)`: the definition's grants for those skills, minus what the pass holds, mapped to display names via `IntegrationCatalog.describe`.
5. **Skill notices.**
   - The `added` change kind (`SkillVersionChange` from the diff; `SkillChange` adds description and integration names) and the "now available" block.
   - `RunSkillTracker` holds each run's current definition (`resolution.readDefinition` / `resolveSkills(definition)`) and gains `applyDefinition(runId, definition) → { added, removed }` in `skillDirs` terms. The restored-run seeding of unseen names is removed (DEC-002).
   - `SkillUpdateNoticeService.onDefinitionsChanged`: a coalesced pass (as tools). Per run: read the definition, `applyDefinition`, await `run.applyDefinitionSkills` when names were added and the run is active (failures logged), then mark the names dirty and `deliverIfBusy`.
   - Integration names are read only for names added while the run was active (`addedWhileActive`). A restored run's activation already gave it its grants.
   - `close()` awaits a pass in progress.
   - The composition subscribes to `AgentDefinitionChangeSignal` and unsubscribes first on close. Both hosts pass `integrationRunAccess`: studio `credentialProxyHost.runAccess`, standalone an explicit `null`.
6. **Docs.** Module docs: `skill_update_notices.md`, `agent_execution.md` (new section), `tool_list_updates.md`, `codex_integration.md`, `grok_build_runtime.md`, `deepseek_harness_runtime.md`, `antigravity_cli_runtime.md`, `credential_proxy.md`.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section: design-spec "Task Size And Architectural Risk".
- Classification confirmed or changed: `Confirmed`.
- Evidence: 39 production files changed plus 2 new (about 20 in logic); a new mid-run acquisition racing release on four runtimes; a new backend contract method; a changed restored-run rule on a persisted record; an integration-state read.
- Selected route: `Code Review`.
- Lightweight self-review for the direct route: `Not Applicable` (Large / High).
- New design impact or escalation trigger: `None`. DI-001 (below) was resolved by SR-004. None of the design's own escalation triggers fired: every release path calls `release()` first; the materializer is unchanged; nothing is granted mid-run.

## Design Impact DI-001 — Claude does not list a skill added to a run that started with zero skills

**Resolved by SR-004 (ARCH-REV-003), option (a), implemented in IR-002.** IMP-13 repeats IMP-07 on the new code: a Claude
run that starts with zero skills gets `Launching skill: codeword-probe` from its `Skill` tool for a skill added mid-run. The
record of the finding follows.

- **Protects:** AC-011 ("Claude's own skill list shows X at its next turn"), REQ-008.
- **Design premise that is wrong:** the design's Investigation Evidence row "Claude lists a folder linked mid-session at the next turn" (the designer's probe) and Risk AR-003. AR-003 says a zero-skills Claude run lacks only `Skill` in `allowedTools`, so auto-execute approves the call anyway. The probe's workspace already had `.claude/skills` with a link when the session started.
- **Measured** (Claude CLI 2.1.323, model haiku, real Studio server, isolated data root, auto-execute on; one variable changed per run):

| Run | `.claude/skills` when the CLI process started | Skill added mid-run | `Skill` tool call for the added skill | Evidence |
| --- | --- | --- | --- | --- |
| IMP-07 | absent (run with zero skills) | linked (checked) | `Unknown skill: codeword-probe` | `evidence/live/IMP-07-live-claude-zero-skills.json` (`skillToolStep`) |
| IMP-08 | present (run started with `anchor-skill`) | linked | `Launching skill: codeword-probe` | `evidence/live/IMP-08-live-claude-one-skill-start.json` |
| IMP-09 | present but **empty** (pre-created, zero skills) | linked | `Launching skill: codeword-probe` | `evidence/live/IMP-09-live-claude-zero-skills-empty-folder-at-start.json` |

- **Cause:** the CLI watches `<cwd>/.claude/skills` only when that folder exists at process start. An empty folder is enough.
- **What still works on every run:** the notice gives the `SKILL.md` path, and the agent reads and follows it (IMP-07 answered the codeword after a `Read` of the path: AC-002 holds). The link is made and released.
- **What is missing:** for a Claude run that started with no skills, Claude's own `Skill` tool does not offer the added skill until the run's next CLI process generation. On the restart, preparation links it and the folder exists.
- **Candidate response (the designer's decision):**
  - (a) Claude preparation ensures `<workspace>/.claude/skills` exists, even with no skills. That is a new, empty, user-visible folder in the selected workspace for every Claude run; the folder is never removed.
    - Small change: `ClaudeSessionBootstrapper` or `RunWorkspaceSkills` creates the folder (`mkdir -p`) before the session starts. It is not a materializer change.
    - The empty folder could also be created only when a run starts with no skills.
  - (b) Accept the limitation for zero-skill starts and narrow AC-011 (requirements change, needs approval).
- Not checked: whether Codex, Grok, DeepSeek or Antigravity re-list a folder linked mid-run (U-001, not required).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Added skill set up on the runtime, then one "now available" notice (busy now, idle with the next input) | `skill-update-notices.ts` (signal) → `SkillUpdateNoticeService.onDefinitionsChanged` → `RunSkillTracker.applyDefinition` → `AgentRun.applyDefinitionSkills` → backend (`RunWorkspaceSkills.addFrom` / `addAgyRunCapsuleSkills` / native no-op) → `deliverIfBusy` / `takePreface` → `computeNotice` (`added` + description + integration names) → builder | Implemented. AC-001, 002, 005, 009, 011, 012 pass (AC-011 also for a zero-skills Claude start after SR-004, IMP-13). |
| BEH-002 | Removed skill: one "no longer available" notice; nothing unlinked | Same pass; `applyDefinition` → removed; diff `removed` | Implemented. AC-003 passes (unit, integration, live). |
| BEH-005 | Integration skill added: "access starts when this run is restarted"; nothing granted | `computeNotice` → `IntegrationRunAccess.integrationsStartingOnRestart` (`RunPassRegistry.grantedIntegrationIds`, `grantsForAgent`, `catalog.describe`) | Implemented. AC-006 passes (unit + integration); QR-002: the read never issues or changes a pass (tested). |
| BEH-008 | Resumed run hears skills added and removed since its record | `RunSkillTracker.loadRun` (no seeding; `seen = stored ?? current`) → dirty names → `takePreface` | Implemented. AC-008 passes; a run without a record hears nothing. |
| BEH-003/004/006 | Preserved | Tool list updates unchanged; content notices unchanged; `allowsCall` unchanged | Existing suites green; AC-010 passes (tools notice with this input, skill notice with the next). |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. DI-001 was routed upstream and implemented as decided in SR-004.

## Key Files Or Areas

- New:
  - `src/agent-execution/backends/shared/run-workspace-skills.ts`
  - `src/agent-execution/backends/codex/codex-workspace-skill-request-planner.ts`
- Removed: `src/agent-execution/backends/codex/backend/codex-thread-cleanup.ts` (its only method released the run-context list; now `release()`).
- Execution:
  - `backends/agent-run-backend.ts`, `domain/agent-run.ts`, `backends/provider-preparation-guard.ts`, `services/agent-run-restore-context-factory.ts` (restore binding: `workspaceSkills: null`), `providers/agent-provider-factory-builder.ts`, `compositions/create-process-agent-provider-factory-builder.ts`;
  - Claude: backend, factory, context, bootstrapper, `session/claude-session-cleanup.ts`, `session/claude-session-manager.ts` (materializer parameter removed), `session/claude-session-query-options.ts`;
  - Codex: backend, factory, context, bootstrapper, `thread/codex-thread-manager.ts` (`threadCleanup` parameter removed), `backend/index.ts`;
  - ACP: `backend/acp-agent-run-backend.ts`, `backend/acp-agent-run-backend-factory.ts`, `session/acp-session-launcher.ts` (`owner.skills` removed);
  - Antigravity: `backend/agy-agent-run-backend.ts`, `backend/agy-agent-run-backend-factory.ts`, `capsule/agy-run-capsule.ts`;
  - native: `autobyteus/autobyteus-agent-run-backend.ts`.
- Credential proxy: `integration-run-access.ts`, `run-pass-registry.ts`, `credential-proxy-host.ts`.
- Skill notices: `skill-update-notices.ts`, `services/{run-skill-tracker,skill-update-notice-service,skill-version-diff,skill-update-notice-builder}.ts`, `domain/skill-update-notice-types.ts`, `providers/skill-folder-snapshotter.ts`.
- Composition: `compositions/platform-notice-sources.ts`, `compositions/build-studio-server.ts`, `standalone-application-host/start-standalone-application-host.ts`.
- Tests (new):
  - `tests/unit/agent-execution/backends/shared/run-workspace-skills.test.ts`
  - `tests/unit/agent-execution/backends/mid-run-workspace-skills.test.ts`
  - `tests/unit/agent-execution/agent-run-apply-definition-skills.test.ts`
  - `tests/fixtures/run-workspace-skills-fixtures.ts`
  - `tests/e2e/runtime/live-skill-definition-changes.e2e.test.ts` (gated)
  - new cases in the notice integration, tool-list integration, parts, credential-proxy, AGY capsule and native tool-apply tests.
  - About 40 existing test files were moved onto the holder.

## Important Assumptions

- A mid-run add skips unresolved names. Reconciling an unresolved name could remove a broken link, which is a preparation-time decision.
- A name that was resolved and is still resolved keeps its folder in `applyDefinition`; a moved folder stays with the watcher's `refreshSkillDirs`, as before (DS-001 narrative).
- `RunWorkspaceSkills.acquire` returns `void`, not the design's `WorkspaceSkillMaterializationResult`: no caller reads the result any more (DESIGN rule 11). Recorded deviation from the interface table.
- Claude's `ClaudeAgentRunContext.configuredSkills` was written but never read outside tests. It was removed as dead code with its one test.

## Known Risks

- SR-004's user-visible effect: an empty `.claude/skills` folder in a workspace where no Claude run with a skill had run before (accepted in the design).
- The integration sentence is read from the pass when the notice is built (residual note in the review). A process generation soon after the save can grant access before the notice says it starts at restart.
- After an interrupt, an Antigravity run reports inactive and gets no link until a new start; the notice still gives the path (residual note in the review). Documented in `antigravity_cli_runtime.md`.
- A name that fails to link is retried at the next pass that adds a name for this run, not on every save (review note on AR-002).
- If the Antigravity manifest rewrite fails after a link was made, the link stays without a manifest entry. It is logged; a resume ignores it, and a later add gets `EEXIST` and logs it.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature`
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision: `Refactor Needed Now` (Codex planner extraction; one holder per run)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `Yes` for DI-001 (a premise about the Claude CLI, not the ownership model); resolved by SR-004
- Evidence: steps 1–2 ran first with the existing suites green (the move of preparation and release onto the holder), then the contract method.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`. The "definition read once" binding (`RunUsedSkillsResolver`, `RunSkillSource`) and restore seeding are removed; tests and the CR-002 case were rewritten to the new rule.
- Dead code in touched files removed: `Yes`. Removed:
  - `CodexThreadCleanup` (file, barrel export, constructor parameters);
  - `ClaudeSessionCleanup`'s materializer parameter and `ClaudeSessionManager`'s;
  - `ProviderPreparationGuard.ownSkill`;
  - ACP `owner.skills` and `PreparedRun.materializedSkills`;
  - `ClaudeAgentRunContext.configuredSkills`;
  - a pre-existing unused `AgentApiStatus` import in `agent-run.ts`.
- Dead code found elsewhere, added to `follow-ups.md`: None.
- Shared structures remain tight: `Yes` (`SkillVersionChange` vs `SkillChange`: the diff's version fact, and the notice's change with its description and integration names).
- Canonical shared design guidance reapplied: `Yes`.
- Deviations decided during implementation: `acquire` returns `void` (above). The guard field is named `workspaceSkills` on `ProviderPreparationGuard`, replacing `ownSkill` one for one (the factory-owned resource).
- Size guardrails: `Yes`.
  - Largest delta: `skill-update-notice-service.ts` +114/−5 (345 effective lines).
  - `agent-run.ts` is at 492 effective lines (was 484; not over 500).
  - No file was taken over 500, and no file changed by more than 220 lines.

## Persisted Data Transition Check

- Approved decision: `Directly Usable — No Migration` (`seen_skill_versions.json`).
- Implementation follows it: `Yes`. Same shape and the same reader and writer; only the restored-run reading changed (no seeding).
- Direct-use evidence: the integration case "AC-002/AC-003/AC-008: a restored run hears …" writes a record before the change, restores, and hears added, removed and updated. A run without a record hears nothing.

## Environment Or Dependency Notes

- macOS (darwin), Node 22, pnpm 10.28.2; worktree `pnpm install --frozen-lockfile`, `prebuild`, `test:integration:prepare`.
- During the full unit and integration runs the machine's load average was 78–112, with `fseventsd` at 186% CPU (other agents' work). Real-chokidar tests timed out then and passed on rerun at load 15–22 (IMP-02, IMP-04).
- `pnpm test-vault status` runs the server `prebuild` (Prisma generate). I ran it once while the unit suite was running.

## Checks Run

Commits: IMP-01…IMP-11 ran on the IR-001 working tree (base `7b8bcf932f`), committed as `07d5d69b30`. IMP-12 and IMP-13 ran on `07d5d69b30` plus the SR-004 change, committed in the IR-002 commit named in the handoff message. Rerun by impact: SR-004 changes only `claude-session-bootstrapper.ts`, its unit test and a module doc. IMP-12 reran the Claude suites and the type gate. The other rows exercise no Claude preparation code and stay valid, except IMP-07, which IMP-13 supersedes.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | final tree | macOS, Node 22 | all `src` and tests | — | Pass | `evidence/IMP-01-typecheck.log` | `[typecheck] PASS`, `production errors: 0; test-file errors: 1180 in 364 files (baseline 1180 in 364 files)` |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit` | tree before the IMP-03 fixes | macOS, load 78–112 | whole server unit suite | all | 3 failed, 8436 passed (causes found; see IMP-03 and IMP-10) | `evidence/IMP-02-unit-suite-excerpt.log` | `Tests  3 failed \| 8436 passed \| 9 skipped (8448)` |
| IMP-03 | after the two fixes (the ACP comment named Grok in the shared ACP layer; new files staged): `vitest run tests/architecture tests/unit/runtime-management/acp/acp-layer-neutrality.test.ts tests/unit/agent-execution/backends/{shared,acp,mid-run-workspace-skills.test.ts,workspace-skill-link-regression.test.ts} tests/unit/agent-execution/agent-run-apply-definition-skills.test.ts` | final tree | macOS | holder, per-runtime adds, ACP, architecture guards | AC-011, AC-012, AR-001, AR-002 | Pass | `evidence/IMP-03-focused-rerun.log` | `Tests  195 passed (195)` |
| IMP-04 | `pnpm -C autobyteus-server-ts test:integration` | tree before IMP-03 | macOS, load 66–98 | whole integration suite | all | 8 failed (real-chokidar file-explorer watcher and package auto-refresh), 528 passed | `evidence/IMP-04-integration-suite-excerpt.log` | `Tests  8 failed \| 528 passed \| 69 skipped (605)`; every failure is `Timed out waiting for event` or a watcher-close hook timeout |
| IMP-05 | New and changed focused suites: `vitest run tests/integration/skill-update-notices tests/integration/tool-list-updates tests/unit/skill-update-notices/skill-update-notice-parts.test.ts tests/unit/credential-proxy/credential-proxy-core.test.ts tests/unit/agent-execution/backends/antigravity/agy-run-capsule.test.ts tests/unit/agent-execution/backends/immediate-tool-list-apply.test.ts` | final tree | macOS | notice pass, tracker, builder, diff, credential read, AGY capsule, native no-op | AC-001…AC-010, QR-001, QR-002 | Pass | `evidence/IMP-05-focused-notices.log` | `Tests  115 passed (115)` |
| IMP-06 | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_LIVE_SKILL_DEFINITION_E2E=1 vitest run tests/e2e/runtime/live-skill-definition-changes.e2e.test.ts` (before the 2b `Skill` tool step was added) | tree before IMP-07 | real Studio server, isolated data root; native `gpt-5.5`; Claude `haiku` (CLI 2.1.323) | whole live path on native and Claude | AC-001, AC-002, AC-003, AC-011 (link made before the input, released at terminate) | Pass (2/2) | `evidence/live/IMP-06-live-native.json` (native); Claude's result of this run is in `evidence/IMP-06-live.log` | native step 2 reply contains `QUOKKA-2203`; notices `is now available` / `is no longer available` |
| IMP-07 | the same, Claude only, with step 2b (ask for the `Skill` tool) | final test file | as IMP-06 | Claude CLI skill listing after a mid-run link, zero-skills start | AC-011, AR-003 | **Fail** → DI-001 | `evidence/live/IMP-07-live-claude-zero-skills.json` | `"toolError": "<tool_use_error>Unknown skill: codeword-probe</tool_use_error>"` |
| IMP-08 | IMP-07 with `LIVE_SKILL_DEFINITION_START_WITH_ONE_SKILL=1` | final test file | as IMP-06 | same, one skill at start | AC-011 | Pass | `evidence/live/IMP-08-live-claude-one-skill-start.json` | `"toolResult": "Launching skill: codeword-probe"` |
| IMP-09 | experiment (not kept in the repository): IMP-07 with an empty `<workspace>/.claude/skills` created before the run | final tree + temporary test edit (reverted) | as IMP-06 | same | DI-001 cause | Pass | `evidence/live/IMP-09-live-claude-zero-skills-empty-folder-at-start.json` | `"toolResult": "Launching skill: codeword-probe"`, `initialSkills: []` |
| IMP-10 | reruns at load 15–22: `vitest run tests/unit/skill-update-notices/skill-folder-watcher.test.ts`; `vitest run tests/integration/file-explorer/file-system-watcher.integration.test.ts tests/integration/agent-package-definitions/package-auto-refresh.integration.test.ts`; the AC-012 auto-refresh case alone | final tree | macOS | watcher code (unchanged by this ticket) | — | Pass (at load 9.8: all three files together) | `evidence/IMP-10-watcher-reruns.log` | `Tests  36 passed (36)` |
| IMP-12 | `pnpm -C autobyteus-server-ts typecheck`; `vitest run tests/unit/agent-execution/backends/claude tests/unit/agent-execution/backends/workspace-skill-link-regression.test.ts tests/unit/agent-execution/backends/mid-run-workspace-skills.test.ts tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts tests/integration/agent-execution/claude-session-manager.integration.test.ts` | `07d5d69b30` + SR-004 | macOS | Claude preparation (SR-004 folder; new, restore, blocked folder), cleanup, per-runtime adds | AC-011, REQ-008 | Pass | `evidence/IMP-12-sr004-claude-suites.log` | `Tests  281 passed \| 16 skipped (297)`; `[typecheck] PASS` |
| IMP-13 | `RUN_LIVE_SKILL_DEFINITION_E2E=1 LIVE_SKILL_DEFINITION_RUNTIMES=claude_agent_sdk vitest run tests/e2e/runtime/live-skill-definition-changes.e2e.test.ts` (zero skills at start, with the step 2b `Skill` tool step) | `07d5d69b30` + SR-004 | real Studio server, isolated data root, Claude CLI 2.1.323, haiku | the IMP-07 path on the SR-004 code | AC-002, AC-003, AC-011 (also: link released at terminate) | Pass | `evidence/live/IMP-13-live-claude-zero-skills-sr004.json` | `"initialSkills": []`; `"toolResult": "Launching skill: codeword-probe"`; replies `SKILLED-QUOKKA-7801`, `DONE-3` |
| IMP-11 | mutation check: in `RunWorkspaceSkills`, the add's guard disabled and `release()` not awaiting the add; the holder test run, then the change reverted | temporary | macOS | AR-001 window on the managed (GitHub source) path | AR-001 | The managed-path test fails under the mutation and passes on the real code | `evidence/IMP-11-mutation-check.log` | `× AR-001: a managed (GitHub source) skill whose holder is published after the release began is never left linked` |

- Not run, and why:
  - Codex, Grok, DeepSeek and Antigravity live runs: U-001; left to API/E2E as the design says.
  - A Claude run without auto-execute (the approval prompt part of AR-003): needs interactive approval; left to API/E2E.
  - Fresh-start build: no build input changed.
  - The web card: unchanged (the header and sender are the same).

## Frontend Rendered-Result Check

`Not Applicable`. Server-only change. The web card is driven by the unchanged notice header and sender; only the text body has new blocks.

## Downstream Coverage Hints / Suggested Scenarios

- Live, per runtime (`live-skill-definition-changes.e2e.test.ts` can be extended):
  - Codex, Grok, DeepSeek: the link in `.codex/skills`, `.grok/skills`, `.dsh/skills` exists after the save and is released at the end (AC-012).
  - Antigravity: the capsule link and manifest, kept after stop and resume (AC-012).
- AC-006 end to end: an imported GitHub integration added mid-run, then the notice sentence. After stop and a message, the pass holds the grant.
- A team member and a delegated copy, both live (AC-009).
- Stop / restart between the save and the message (AC-008 live).

## API / E2E / Executable Coverage Investigation And Execution Still Required

After code review passes: the scenarios above, the live non-Claude runtimes (U-001), and the Claude approval case without auto-execute (R-001 / AR-003).
