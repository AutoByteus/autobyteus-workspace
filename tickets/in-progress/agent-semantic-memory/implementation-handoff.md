# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Large/High → independent architecture review was selected and passed (ARCH-REV-001); the implementation goes to Code Review (`get_handoff_rules`).
- Requirements doc: `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/requirements-doc.md` (Approved, SR-004)
- Investigation notes: `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/investigation-notes.md` (AF-01..AF-26)
- Solution revision record: `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/solution-revision-record.md`
- Design spec (required on every route): `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/design-spec.md` (SR-004, Ready)
- Supplemental task artifacts: `semantic-memory-prompt-contract.md` (behavior-defining, SR-004); `follow-ups.md` (FU-001..FU-012; FU-010..FU-012 added in implementation)
- Design review report: `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/design-review-report.md` (Pass, no findings; notes N-1, N-2)
- Architecture review revision record: `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/architecture-review-revision-record.md` (ARCH-REV-001)
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial)

## Current Implementation Summary

An agent definition can turn on semantic memory (`semanticMemoryEnabled`). The server's new owner `AgentSemanticMemory` holds the rule and the folder `<memory>/semantic/<encodeURIComponent(definition ID)>`; every runtime backend calls `prepareForRun(definition)` where it composes instructions, passes the folder to the carpenter composer (the `## Semantic Memory` section, text byte for byte from the prompt contract §2, after the Project section and before native-only sections), and Codex/Claude make the folder writable (Codex `sandbox_workspace_write.writable_roots`, from one builder that also owns `network_access`; Claude `additionalDirectories`). For package and built-in agents the app's switch is the fifth personal setting `SEMANTIC_MEMORY`; for the user's own agents it is written to `agent-config.json` (only when on; a stale `true` is removed when turned off). GraphQL exposes `semanticMemoryEnabled` and the computed `semanticMemoryPath`. The web agent form has the switch (with the personal-setting mark/reset), the detail shows On + selectable folder, or Off.

- Implementation cycle: `Initial`
- Implementation revision record: `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Commits (branch `codex/agent-semantic-memory`, base `origin/personal` `f78b60ddd`): `785ff7c95` server, `0fa12575c` web + docs, `7e5f90d7f` web test fixture, then the ticket-documents commit that adds this handoff and the evidence (named in the handoff message).

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: design-spec.md § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the change touches agent definitions, personal settings, agent memory, the composer, five runtime backends, Codex/Claude runtime configuration, GraphQL and the web app (41 source files changed under `autobyteus-server-ts/src` and `autobyteus-web`, +494/−88); shared contracts change (`agent-config.json`, `personal-settings.json`, GraphQL `AgentDefinition`, `PersonalSetting`) and a write-access boundary widens by one agent-owned folder.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. Escalation triggers in the design: AC-005 holds (unchanged prompt for agents without the setting, IMP-02 composer/snapshot tests); AC-002 (real-runtime writes) is not run here (see API/E2E section).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Section with the absolute folder when on; byte-identical instructions when off (REQ-004/005/008/009, AC-001, AC-005) | `agent-execution/prompt/carpenter-prompt-sections.ts` `renderSemanticMemorySection`; `carpenter-prompt-composer.ts` required `semanticMemoryPath: string \| null`, pushed after `## Project`, refuses a relative path; callers: `autobyteus-agent-run-backend-factory.ts`, `codex-thread-bootstrapper.ts`, `claude-session-bootstrapper.ts`, `acp-agent-run-backend-factory.ts` (`prepare()` → `composeInstructions(prepared, …)`, create and restore), `agy-agent-run-backend-factory.ts` (create only, REQ-009) | Contract §5.1/5.2/5.3/5.4 asserted verbatim (`semantic-memory-prompt-section.test.ts`); existing prompt snapshots (`collaboration-prompt-sections` snapshots, parity tests) unchanged with `semanticMemoryPath: null` |
| BEH-002 | Setting from `agent-config.json` or a personal setting; switch in the form, state + folder in the detail (REQ-001/002, AC-007, DEC-012) | `agent-definition/domain/models.ts`, `providers/agent-definition-config.ts` (read `=== true`, write only when true, merge drops it), `agent-definition-node-reader.ts`, `application-owned-agent-source.ts`, `services/agent-definition-service.ts` (`PERSONAL_FIELDS` + create + patch; N-1), `services/agent-definition-edits.ts`; `personal-settings/domain/personal-setting-record.ts`, `services/personal-settings-service.ts`, `agent-packages/services/package-edit-capture.ts`; GraphQL `types/agent-definition.ts`, `types/personal-settings.ts`, `converters/agent-definition-converter.ts`; web `AgentSemanticMemoryField.vue`, `AgentDefinitionForm.vue` (wiring), `AgentDefinitionDetailSections.vue`, store/queries/mutations/generated types, locales | Package agent save leaves package files byte-identical and records `{ "semanticMemoryEnabled": true }`; reset removes it; user's own agent's `agent-config.json` gains/loses the key with other fields kept (write-forms tests, UI probe IMP-08) |
| BEH-003 | Folder created for a run of an enabled agent; never deleted (REQ-003, REQ-007, AC-008) | `agent-memory/store/agent-memory-layout.ts` `getAgentSemanticMemoryDirPath`; `agent-memory/services/agent-semantic-memory.ts` (`folderOf` pure, `prepareForRun` = `mkdir -p`) | No code path removes the folder; off → no folder for the run, document kept; on again → same folder (`agent-semantic-memory.test.ts`) |
| BEH-004 | Same folder per definition ID for standalone, team member, delegated copy; team-local/Org/app-owned distinct (REQ-004, AC-004, AC-006) | Keyed by the run's `agentDefinitionId` read by every backend; encoding via `encodeURIComponent` | `team-local-agent:…` → `team-local-agent%3A…`; shared and team-local with the same local name get two folders (AC-006 test) |
| BEH-005 | Folder writable in runtimes that would refuse/prompt; others unchanged (REQ-006, REQ-008, QR-002) | `codex/backend/codex-sandbox-workspace-write-config.ts` (one owner of the key; `workspace-write` only), `codex-integration-thread-config.ts` (now `shell_environment_policy` only), `codex-thread-bootstrapper.ts`; `claude/session/claude-session-config.ts`, `claude-session-query-options.ts`, `runtime-management/claude/client/claude-sdk-client.ts` | Codex `appServerConfig` of an agent without the setting has exactly `["mcp_servers"]` (unchanged); read-only and full access get no key; network access and writable root combine in one object. CLI sandbox reproduction IMP-09: refused without the root, allowed with it, a sibling path stays read-only |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Added: `autobyteus-server-ts/src/agent-memory/services/agent-semantic-memory.ts`, `src/agent-definition/services/agent-definition-edits.ts`, `src/agent-execution/backends/codex/backend/codex-sandbox-workspace-write-config.ts`, `autobyteus-web/components/agents/AgentSemanticMemoryField.vue`.
- Modified (server): `agent-definition/{domain/models.ts, providers/agent-definition-config.ts, providers/agent-definition-node-reader.ts, providers/application-owned-agent-source.ts, services/agent-definition-service.ts}`, `personal-settings/{domain/personal-setting-record.ts, services/personal-settings-service.ts}`, `agent-packages/services/package-edit-capture.ts`, `agent-memory/store/agent-memory-layout.ts`, `agent-execution/prompt/{carpenter-prompt-composer.ts, carpenter-prompt-sections.ts}`, the five backends, `codex-integration-thread-config.ts`, Claude `session/claude-session-config.ts`, `session/claude-session-query-options.ts`, `runtime-management/claude/client/claude-sdk-client.ts`, GraphQL `types/agent-definition.ts`, `types/personal-settings.ts`, `converters/agent-definition-converter.ts`.
- Modified (web): `AgentDefinitionForm.vue` (wiring), `AgentDefinitionDetailSections.vue`, `stores/agentDefinitionStore.ts`, `types/personalSettings.ts`, `graphql/queries/agentDefinitionQueries.ts`, `graphql/mutations/agentDefinitionMutations.ts`, `generated/graphql.ts` (codegen), `localization/messages/{en,zh-CN}/{agents.ts, personalSettings.ts}`.
- Docs: `GLOSSARY.md` (Semantic memory; personal settings five), `autobyteus-server-ts/docs/modules/{agent_memory.md, agent_definition.md, personal_settings.md, prompt_engineering.md, codex_integration.md, credential_proxy.md, deepseek_harness_runtime.md}`, `docs/design/collaboration_model.md` §3, `autobyteus-web/docs/agent_management.md`.
- Tests added: server `tests/unit/agent-memory/agent-semantic-memory.test.ts`, `tests/unit/agent-execution/prompt/semantic-memory-prompt-section.test.ts`, `tests/unit/agent-definition/agent-definition-config-semantic-memory.test.ts`, `tests/unit/agent-execution/backends/codex/backend/codex-sandbox-workspace-write-config.test.ts`, `tests/unit/api/graphql/converters/agent-definition-converter-semantic-memory.test.ts`; cases added to the Codex/Claude/ACP/AGY/AutoByteus backend tests, Claude SDK client/session config/query options tests, personal-settings service/record/write-forms tests and the package-edit capture test. Web `AgentDefinitionForm.semanticMemory.spec.ts`, `AgentDefinitionDetailSections.semanticMemory.spec.ts`. Existing composer callers in tests pass `semanticMemoryPath: null` (required key).

## Important Assumptions

- `appConfig.getMemoryDir()` is the memory folder of the node the run executes on (as for run memory); `AgentSemanticMemory` reads it lazily on first use for an enabled agent only.
- The composer's absolute-path check uses the server platform's `path.isAbsolute` (a Windows path is checked on Windows).
- Claude: the folder is passed only when present; with none the SDK options are as before (no `additionalDirectories` key).

## Known Risks

- Codex app-server honoring the thread-config `writable_roots` is shown with the Codex CLI sandbox (IMP-09) and by the unchanged mechanism that already carries `network_access`, not yet with a real app-server run (AC-002, API/E2E).
- DeepSeek harness: with auto-execute off, writes to the folder ask a sandbox-escalation approval (FU-007; docs say so). AC-002's alternate outcome applies; report it with evidence.
- Claude treats the additional directory as a working directory (design-accepted).
- Concurrent runs writing one document: last write wins (DEC-006, accepted).
- Pre-existing test failures on this machine, identical on base source: `claude-provider-turn-race.test.ts` intermittent (FU-010); 8 server unit tests + 2 unloadable files (FU-011); `projectRunsStore.spec.ts` (FU-012).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now` (small): `agent-definition-edits.ts` extraction and the Codex sandbox builder split — both done; FU-005/FU-006 deferred.
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: `normalizeOptionalString` moved with the helpers (both the service and `personalEditsOf` use it). `personalEditsOf` now takes the domain `AgentDefinitionUpdate` type (same fields as the service's update input) to avoid a service ↔ edits import cycle.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No` (the integration builder no longer emits `sandbox_workspace_write`; one owner builds it)
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (none found beyond FU-009, another package)
- Dead code found elsewhere, added to `follow-ups.md`: None new
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes` (the folder path is derived, never stored)
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. Effective non-empty lines: `agent-definition-service.ts` 454 → 431 (473 total lines); `autobyteus-agent-run-backend-factory.ts` 481 → 484 (wiring: one option, one import, one argument; FU-005); `AgentDefinitionForm.vue` 487 → 495 (wiring; FU-006). No changed file over 220 changed lines.
- Notes: N-2 (handoff-architecture-design.md says SR-003) is a Solution Designer document; not changed here.

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): `Directly Usable — No Migration`
- Design-spec decision reference: design-spec.md § Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: absent `semanticMemoryEnabled` reads as off (`agent-definition-config-semantic-memory.test.ts`); personal records without it apply as before; a non-boolean value is skipped by the tolerant reader (`personal-settings-service.test.ts`); unchanged `agent-config.json` files of agents without it are not rewritten with the key.
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- The worktree had no `node_modules`; `pnpm install --frozen-lockfile` was run (no lockfile change). `pnpm` exists only through `corepack` on this machine: commands below were run with a shim `pnpm` → `corepack pnpm` on `PATH`.
- `autobyteus-web/generated/graphql.ts` was regenerated with `pnpm -C autobyteus-web codegen:local` (builds the server first).
- Untracked build outputs `autobyteus-application-backend-sdk/dist/`, `autobyteus-application-sdk-contracts/dist/` are from the install/build and are not committed (TESTING.md). Pre-existing unrelated working-tree changes (`autobyteus-web/docker-compose.yml`, a done-ticket build log) were left alone.

## Checks Run

Evidence folder: `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/evidence/`. Environment for all: Linux 6.12 container, Node v22.23.3, pnpm 10.28.2.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `785ff7c95` | Linux, Node 22.23.3 | all server `src` + tests | all server changes | Pass | `evidence/IMP-01-server-typecheck.log` | `[typecheck] production errors: 0; test-file errors: 1181 in 365 files (baseline 1181 in 365 files)` and `[typecheck] PASS` |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit`; failing files rerun alone on HEAD and with `src` at base `f78b60ddd` | `0fa12575c` (server as `785ff7c95`) | Linux container as root, Node 22.23.3 | whole server unit suite, including the new/extended tests listed in Key Files | BEH-001..005; AC-005, AC-006, AC-007, AC-008 (unit level), QR-001..003 | Pass for this change (8 failing tests + 2 unloadable files are identical on base source: FU-011) | `evidence/IMP-02-server-unit-full.log` | `Tests  10 failed \| 8284 passed \| 12 skipped (8306)`; base run of the 6 files: `Tests  8 failed \| 56 passed (64)`; `tests/architecture`: `Tests  68 passed (68)` |
| IMP-03 | Cause check of `claude-provider-turn-race.test.ts` (5 runs on HEAD, 8 on base `src`) | `785ff7c95` | as IMP-02 | Claude session delivery (not changed) | — | Not caused by this change (FU-010) | `evidence/IMP-03-claude-turn-race-intermittent.log` | `base_fails=1` |
| IMP-04 | `pnpm -C autobyteus-web test:nuxt --run`; `definitionMutationCache.spec.ts` rerun after its fixture fix | `0fa12575c`; fix `7e5f90d7f` | Linux, Node 22.23.3 | whole web unit/component suite; new `AgentDefinitionForm.semanticMemory.spec.ts`, `AgentDefinitionDetailSections.semanticMemory.spec.ts` | BEH-002; AC-007 (component level) | Pass for this change (`projectRunsStore.spec.ts` fails identically on base: FU-012) | `evidence/IMP-04-web-test-nuxt.log` | `Test Files  2 failed \| 735 passed (737)`; after fix `Tests  10 passed (10)` |
| IMP-05 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `0fa12575c` | Linux, Node 22.23.3 | web sources and locales | — | Pass | `evidence/IMP-05-web-guards.log` | `[audit:localization-literals] Passed with zero unresolved findings.` |
| IMP-06 | `pnpm -C autobyteus-web typecheck` | `0fa12575c` | Linux, Node 22.23.3 | web app, Electron main, cross-package tests | — | Pass | `evidence/IMP-06-web-typecheck.log` | `[typecheck] production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)` |
| IMP-07 | `pnpm -C autobyteus-web codegen:check` | `7e5f90d7f` | Linux, Node 22.23.3 | `generated/graphql.ts` vs the built server schema | GraphQL contract | Pass | `evidence/IMP-07-web-codegen-check.log` | `autobyteus-web/generated/graphql.ts is current.` |
| IMP-08 | Ticket probe `probes/semantic-memory-ui-probe.mjs` (probe-owned backend + Nuxt dev + headless Chromium) | `0fa12575c` web, server dist from `785ff7c95` | Linux, Chromium, 1440×1000 | form switch, personal mark/reset, detail card, GraphQL save/read, `agent-config.json` write, package files untouched, zh-CN | BEH-002, AC-007; DS-002, DS-003 | Pass | `evidence/IMP-08-ui-probe/` (`IMP-08-header.md`, `result.json`, 9 screenshots, logs) | `"result": "Pass"`; screenshot `UI-02b-package-form-personal.png`: checked box, "Personal", "Reset to the package's setting" |
| IMP-09 | AF-01/AF-02 reproduction: `codex sandbox -c sandbox_mode="workspace-write"` without and with `sandbox_workspace_write.writable_roots=[<folder>]` (the value the builder emits), probe folder under `$HOME` | `785ff7c95` | Linux, codex-cli 0.167.0 | Codex sandbox behavior the writable root relies on | BEH-005, REQ-006, QR-002 | Pass | `evidence/IMP-09-codex-sandbox-writable-root.log` | without: `cannot create …/semantic/computer-use-operator/out.txt: Read-only file system`; with: `…/computer-use-operator/sites/linkedin/notes.md` created and `cannot create …/memory/semantic/other.txt: Read-only file system` |

- Not run, and why: real-runtime runs (AC-001..AC-004 E2E: AutoByteus, Codex app-server, Claude, Grok/Antigravity writes and cross-Project/team reads), server `test:integration`, server E2E (GraphQL create/update/read AC-007/AC-008 over HTTP), browser probe in the package's `test:e2e:*` set, isolated desktop instance — owned by API/E2E. The DeepSeek harness is not installed here (FU-007).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Agents → Edit (form switch, personal mark/reset, personal-settings note), Agents → Detail (Semantic memory card).
- Approved UI/UX, interaction, requirement, or design references: requirements § UI, Interaction, And Experience Requirements (switch with one-line help next to the skill-scope switch's pattern; detail On/Off and selectable path; localized).
- Existing design system, shared components, and adjacent product surfaces reviewed: the skill-scope checkbox, `PersonalSettingMark`, `PersonalSettingsNote`, the detail cards.
- Testing guideline or development / preview instructions and rendered surface used: TESTING.md browser-probe pattern (probe-owned `dist/app.js` node + Nuxt dev on free ports + headless Chromium; `pnpm dev` was not usable because its fixed port 8000 is held by another process, left alone). Ticket-owned script `probes/semantic-memory-ui-probe.mjs`.
- States, layouts, viewports, and interactions inspected: 1440×1000; own agent off → on → saved → detail On with folder → off again; package agent on (Personal mark + "Reset to the package's setting") → detail → reset → off; zh-CN form and detail; no browser errors.
- Visual or interaction issues found and corrected: (1) the Personal mark wrapped under the long help text → field restructured (checkbox, title row with the mark, help text; the reset button is not inside the checkbox label so it cannot toggle it); (2) the personal-settings note listed only four settings → en/zh-CN note names semantic memory.
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-04, IMP-08. Not inspected: narrow/mobile viewports (the agent editor is a desktop surface; the field uses the same flex-wrap pattern as its neighbours), Electron shell.

## Downstream Coverage Hints / Suggested Scenarios

- AC-002 per runtime with a data dir outside `/tmp` (AF-03): an enabled agent writes `<folder>/x.md`; Codex default `workspace-write` with auto-execute off (the case the writable root exists for) and with integration variables (both flags in one object); Claude with auto-execute off (expect no extra permission prompt beyond the workspace's policy).
- AC-003/AC-004: the same agent under another Project, as a shared team member (Marketing team `refScope: shared`), and as a delegated copy: same path in the captured system instructions, document read.
- AC-005: an agent without the setting: captured instructions equal to base; no `memory/semantic` folder created; Codex thread config without `sandbox_workspace_write`.
- AC-007/AC-008 over GraphQL: package agent personal setting + `resetAgentPersonalSetting(SEMANTIC_MEMORY)`; user's own agent's `agent-config.json`; off → new run has no section and the document remains; on → same path.
- Memory page, memory search and Memory Sync do not list `memory/semantic`.

## API / E2E / Executable Coverage Investigation And Execution Still Required

All acceptance criteria that need real runtimes, HTTP/GraphQL boundaries or the desktop app (AC-001..AC-004 real runs, AC-002 per runtime including the DeepSeek harness alternate outcome, AC-007/AC-008 API journeys), plus executable coverage decisions and pass/fail classification.
