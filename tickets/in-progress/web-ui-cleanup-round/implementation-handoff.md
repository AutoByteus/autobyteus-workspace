# Implementation Handoff

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/web-ui-cleanup-round/tickets/in-progress/web-ui-cleanup-round/` (paths below are relative to it unless absolute).
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/web-ui-cleanup-round`, branch `codex/web-ui-cleanup-round`, base `origin/personal` @ `e72a4702e9`. Code commits, one or more per item:

| Item | Commit(s) |
| --- | --- |
| 1 icons | `4d0ce7095a` |
| 2 runtime names | `2b53fd8ad3`, `51a0aec3ac` (system-instruction labels, probes), `a3dbfcb495` (Token Statistics) |
| 3 Waiting | `52225e1468` |
| 4 literal paths | `f9c1a8d5e3` |
| 5 Depends-on Enter | `cba9eca3ef` |
| 6 Memory voice search | `3e7be8bc10` |

`a938d892b3` on the branch is the Solution Designer's Product Team record (REQ-006/AC-008). The untracked SDK/Brief Studio `dist/` folders are build outputs, not committed. The contract package's `dist/` is tracked and was rebuilt in `2b53fd8ad3`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Architecture Design Complete, `Medium` + `Low` → direct implementation (no architecture review), per `solution-designer-handoff.md`
- Requirements doc: `requirements-doc.md` (SR-001; DEC-001…003 by the user)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (SR-001, Ready)
- Supplemental task artifacts: `icon-inventory.md` (user-approved, DEC-001)
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: N/A (initial)

## Current Implementation Summary

1. **Icons (REQ-001/002).**
   - Re-checked against `3a87152631`: 68 `+<Icon` lines, all on inventory rows; no unlisted use.
   - Every group A/B icon is removed. Group C stays.
   - Settings menu: the 13 icons go with their 20 px wrappers; the Back arrow stays. The Server Settings submenu indent follows the label (`ml-10` → `ml-2`).
   - ToolCard's tinted box goes, along with its `icon`/`isLocal` computeds. The voice extension card's round badge goes.
   - `ToolList`'s `emptyIcon` prop and its value in `ToolsManagementWorkspace` go.
   - `Icon` imports left unused are removed in 9 files.
   - `ServerSettingsManager.vue:100,112` (`heroicons:trash`/`check`) are not in the commit, so they are pre-beta-15 and kept.
2. **Runtime names (REQ-003/004).**
   - New contract file `autobyteus-agent-presentation-contracts/src/agent-runtime-names.ts` with `AGENT_RUNTIME_NAMES` and `agentRuntimeName` (an unknown kind is shown as given; safe for object keys). It has a contract test, and `dist` is rebuilt.
   - Server: `RUNTIME_NAMES`/`agentRuntimeDisplayName` are removed. Callers switched: available runtimes (`name`, failure texts), model router texts, model-routing sessions, launch-usability reasons, and `delegate_task` launch notes ("it runs on Codex App Server / …", "its agent default Antigravity CLI / …"). "The model '…' is not available on <runtime>" also switched, in launch usability and model-routing settings.
   - Web: `runtimeKindToLabel`, `runtimeShortLabel` and `runtimeName` are removed with their maps. The paired label/short-label helpers collapse into one: `ChatRuntimeOption.shortLabel` (no consumer), `useRunSettingsPresentation.runtimeShortLabel`, and the ChatModelMenu short computeds. Every caller uses `agentRuntimeName`.
   - `GLOSSARY.md`: the existing "Agent Runtimes" section's entry names the five runtimes in a kind→name table. `docs/settings.md` (Model Routing names) follows.
3. **Waiting (REQ-005).** The `ProjectIndexesCard` WAITING state always shows `…state.waiting` ("Waiting…" / "等待中…"). The `waitingModel` key and the `modelReady` computed are removed.
4. **Literal paths (REQ-007).** `inlineCode(text)` in `skill-update-notice-builder.ts` uses a fence one backtick longer than the longest run inside. It pads with one space when the text starts or ends with a backtick or a space, which also covers the space case CommonMark would strip. Every changed-file path and the skill folder are wrapped.
5. **Depends-on Enter (REQ-008).** `TaskDependencyPicker` adds `{ immediate: true }` to its active-option watch.
6. **Memory voice search (REQ-009).**
   - `VoiceInputButton` in `MemorySearchPanel`:
     - `source="memory-search"` (added to the union);
     - `compact`, absolute at the box's right end;
     - the input gets `pr-12` only while voice is available, else `pr-3`;
     - `:disabled="!store.searchReady"`.
   - The target is defined in the panel:
     - its key is unique;
     - `isCurrent` is true while mounted;
     - a transcript is merged with `mergeTranscriptWithDraft`;
     - there is no submit.
     - The button cancels its operation on unmount.
   - The status line moves (with `git mv`) to `components/voiceInput/VoiceTargetStatus.vue`. It is used by the project editor (explicit `project-voice-*` test ids), the task composer and Memory search (`memory-search-voice-*`).
   - The texts move from `projects.ui.voice*`/`cancelRecording` to `voiceInput.status.*` in a new `voiceInput.ts` catalog (en, zh-CN).

- Implementation cycle: `Rework` (IR-002: Local Fix for CRR-001 FO-001, FO-002)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-001`
- Related architecture-review / code-review / API/E2E / delivery revision IDs: `N/A` / `CRR-001` / `API-REV-001` / `N/A`
- Triggering finding IDs: FO-001, FO-002 (CRR-001; API-12 of API-REV-001)

### IR-002: Local Fix for CRR-001 (commit `1a4bfd2ae9`)

- **FO-001.** `ApplicationExecutionResourceSlotEditor.vue` (launch-authority summary: Package baseline, Selected resource baseline, Effective configuration) shows `agentRuntimeName(leaf.runtimeKind)`.
- **FO-002.** `AgentDefinitionDetailSections.vue` "Default runtime" shows `agentRuntimeName(kind)` when set, "Not set" otherwise (rendered by AgentDetail and TeamLocalAgentMemberDetails).
- **Census of runtime kinds still displayed without `agentRuntimeName`** (web: components, composables, stores, utils, services, types, pages, layouts; the forms `{{ … runtimeKind … }}`, `{{ x.runtimeKind || … }}`, bound attributes `:title/:aria-label/:label/:placeholder/…`, and `${…runtimeKind}` strings):
  - **Fixed, third web site:** `components/workspace/usage/TokenUsageMeterPanel.vue:117`. The workspace token-usage panel's "Runtime" row (text and title) showed `latestRuntimeKind`; it now uses a `runtimeName` computed (`agentRuntimeName`, "Unknown" when none).
  - **Already named:**
    - the runtime select options of the launch editors (`useRuntimeScopedModelSelection.runtimeOptions`);
    - Token Statistics (`formatRuntimeKind`, `formatDistinctValues`, analytics `formatRuntime`/`runtime`);
    - ChatModelMenu, RunSettingsCard, RunMemberRow, Model Routing (`names.runtimeName`).
  - **Not displays:** the remaining hits are i18n keys, `:key`/`data-test`/`data-runtime` values, store/request keys (`${runtimeKind}:${…}`), the system-instruction source-key lookup, and the provenance enum formatter (`formatProvenance(leaf.provenance.runtimeKind)`, a provenance kind, not a runtime).
  - **Server** (same rule, texts users see):
    - Fixed: Application launch-setup issues (`application-launch-host-capability-validator.ts`: unavailable fallback, authenticated catalog failure, model unavailable, authentication fallback) and the launch-usability fallbacks (`launch-usability-check.ts`: not available / could not be checked). These now read e.g. "Codex App Server is unavailable for '…'" and "Model 'm' is unavailable for Antigravity CLI and '…'".
    - Kept as the identifier: texts about an unknown, unregistered or unsupported kind (validator `:71`, standalone validator, current-model policy, definition validator, sign-in reader, status service, availability "not configured", GraphQL unsupported runtime, run provisioning/manager), logs, keys, and the Model Router prompt (the router answers with kinds).
  - Also fixed: two unit expectations from item 2 in folders not run in IR-001 (`tests/unit/remote-collaboration/standalone-remote-delegation.test.ts`, `tests/unit/agent-team-execution/team-root-launch-notes.test.ts`). IMP-11 now runs the whole `tests/unit`.
- **Tests:** the launch-setup summary shows "Primary Agent · Claude Agent SDK · default", never `claude_agent_sdk`. The agent detail shows "Codex App Server", and "Not set" when there is none. Both fail on base (IMP-10). Two meter tests now expect "Codex App Server".
- FU-002 (other technical identifiers in the summary) is recorded by the reviewer and not touched here.
- Classification recheck: `Medium` / `Low`, unchanged (presentation text only).

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: presentation-only changes in existing owners, plus one additive contract constant and function. Runtime kinds are unchanged on the wire and in storage. The design's escalation trigger ("a runtime name parsed by code or stored") was checked:
  - The Model Router prompt lists runtime kinds and the router answers with kinds, so that prompt keeps kinds and is unchanged.
  - The work-journal reader takes only the date from the header (`journal-entry-reader.ts:38`, `HEADER_FIRST_DAY`), so the label is free text.
  - `delegate_task` has no runtime parameter, so its launch notes are display text.
  - Token-usage `provider_name` values ("Grok Build", "Antigravity CLI") are stored provider names. They are out of scope and unchanged.
  - The icon removals changed no icon-only control.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None`

### Lightweight self-review and deviations to note

- **Beyond the design's named callers (REQ-003 "every name"; AC-005 "no other map").** Found by grep and switched to `agentRuntimeName`; the reviewer should see these:
  - **Application readiness reasons** (user-facing), e.g. "Codex App Server authentication is unavailable: no logged-in account." (was "Codex …"). This touches assertions of autobyteus-238/296 tests, which are updated: `application-import-codex-launch`, `application-reload-repair`, `agent-runtimes-running-agents` e2e, plus units.
  - **Work-journal header** (agent-facing), e.g. "Runtime Codex App Server · file …".
  - **Workspace-skill materializer label** (logs and collision errors).
  - **System-instruction activity labels** (web): "AutoByteus configured system prompt" (was "Native …"), "Claude Agent SDK systemPrompt", "Codex App Server baseInstructions".
  - **Token Statistics** had three more maps ("Codex", "Claude SDK", "Autobyteus"). They are removed (`a3dbfcb495`).
  - Left as they are:
    - `utils/skills/skillNames.ts` labels skill folders by tool home (`.codex`, `.claude`, `.grok`); those are not runtime names;
    - token-usage `provider_name` values are stored provider names;
    - the Model Router prompt keeps kinds.
- **Empty-kind default kept at one caller:** `ChatNewSurface`'s "starting" hint reads the draft's `runtimeKind`, which can be `''`. Like `useRuntimeScopedModelSelection:93`, it shows the default runtime: `agentRuntimeName(kind.trim() || DEFAULT_AGENT_RUNTIME_KIND)`. The other callers either return earlier on an empty kind (`teamLaunchReadinessCore`) or resolve it to the default before calling (`teamRunConfigUtils.normalizeRuntimeKind`). Title-casing of unknown kinds is gone, as designed: an unknown kind shows as given.
- **Voice status wording:** the shared texts are worded for any input: "No speech detected. Try again or type instead.", "Voice input could not be transcribed. Your text is unchanged. Try again or type instead." Before, they said "…type the description" and "Your description is unchanged". The project editor and the task composer now show these neutral texts.
- The Settings submenu indent changed so it keeps its 16 px offset under the label (`ml-2`).
- Probes and e2e that asserted short names or kind-based notes are updated to the full names, using `agentRuntimeName` where they build notes:
  - probes: `agent-runtimes-settings-probe`, `model-routing-decisions-probe`, `system-instruction-activity-probe`;
  - server e2e: `delegated-launch-config-defaults`, `model-routing-delegation`, `remote-delegation-two-server`, `available-agent-runtimes-graphql`.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Settings menu text only; Back arrow kept | `pages/settings.vue` | Sidebar test (fails on base, IMP-00a); look in app (IMP-07, IMP-09) |
| BEH-002 | Group A/B icons gone, group C kept | 19 component files (item 1 commit) | ToolCard/McpServerCard tests (fail on base, IMP-00b); look in app (IMP-09) |
| BEH-003 | Full runtime names everywhere, one list | DS-001: `agentRuntimeName` (contract) ← server services/texts, web views | Contract test (IMP-01); server units/e2e (IMP-03/04/08); web suite (IMP-05); Agent Runtimes probe (IMP-07) |
| BEH-004 | One Waiting state | `ProjectIndexesCard.vue`, `embeddingSettings.ts` en/zh-CN | Both model states × both languages (IMP-05) |
| BEH-005 | Paths literal in the notice | `skill-update-notice-builder.ts` | Builder test (fails on base, IMP-00c), integration, web card test |
| BEH-006 | Enter picks a choosable Task | `TaskDependencyPicker.vue` | Regression test (fails on base, IMP-00d) |
| BEH-007 | Voice input in Memory search, fills the box | DS-002: `VoiceInputButton` → `voiceInputStore` → panel target → `queryInput` | `MemorySearchPanel.spec.ts`; hidden state seen in app (IMP-09) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. The additions listed above follow REQ-003/AC-005.

## Key Files Or Areas

See the per-item commits. Contract: `autobyteus-agent-presentation-contracts/src/agent-runtime-names.ts`. Shared voice status: `autobyteus-web/components/voiceInput/VoiceTargetStatus.vue`.

## Important Assumptions

- None beyond the design.

## Known Risks

- R-01, the longer names: at 1440 px the Agent Runtimes table wraps "Codex App Server" and "Claude Agent SDK" onto two lines in its Runtime column (`IMP-07…/ARP-01b-VIS-001-table-1440-en.png`). This is readable and matches the user's decision. The chat footer and member rows already truncate.
- The readiness-reason wording change ("Codex App Server authentication …") reaches users of Application launch settings and the quarantine detail (autobyteus-296).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Cleanup` / `Bug Fix` / small feature
- Reviewed root-cause classification: `Duplicated Policy Or Coordination` (names), `File Placement Or Responsibility Drift` (voice status)
- Reviewed refactor decision: `Refactor Needed Now` (small): done (one name list; one shared status component)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. There are no aliases of the old name functions.
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files removed: `Yes`:
  - the three web maps and the server map with their functions; three more Token Statistics maps;
  - the `waitingModel` key and `modelReady`;
  - `emptyIcon`, ToolCard's `icon`/`isLocal`, and unused `Icon` imports;
  - `ChatRuntimeOption.shortLabel` and the short-label helpers;
  - the old `projects.ui.voice*` keys and `ProjectVoiceStatus.vue` (moved).
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. All deltas are small; no file is grown past 500 lines.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`. Runtime kinds are unchanged; no stored name is read back. Followed.

## Environment Or Dependency Notes

- The contract package's `dist` is tracked and rebuilt (`pnpm -C autobyteus-agent-presentation-contracts test` builds it).
- For e2e: `pnpm -C autobyteus-server-ts test:integration:prepare` (Brief Studio package) and `pnpm -C autobyteus-server-ts build` (`dist/app.js` for the two-server e2e and the probes) were run in this worktree.

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Criteria | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-00 | New regression tests against base sources (fix files stashed) | base `e72a4702e9` sources | macOS, Node 22 | sidebar, cards, builder, picker | AC-001, 002, 009, 010 | Fail as expected | `evidence/IMP-00-new-tests-on-base.log` | `got 14`; `3 failed`; `× puts the skill folder…`; `expected …-0 to be …-2` |
| IMP-01 | `pnpm -C autobyteus-agent-presentation-contracts test` | `a3dbfcb495` | macOS, Node 22 | contract | AC-005 | Pass | `evidence/IMP-01-contract-test.log` | `# pass 22`, `# fail 0` |
| IMP-02 | `pnpm -C autobyteus-server-ts typecheck` | `a3dbfcb495` | macOS, Node 22 | server `src` | AC-012 | Pass | `evidence/IMP-02-server-typecheck.log` | `exit=0` |
| IMP-03 | `env -i … vitest run` server units (runtimes, routing, launch-preferences, collaboration, application platform/orchestration, agent-execution, runtime-management, skill notices, agent-memory) + `tests/agent-work-journal` + `tests/integration/skill-update-notices` | `a3dbfcb495` | macOS, Node 22 | server texts with names; notice builder | AC-004, AC-009 | Pass | `evidence/IMP-03-server-unit-journal-notices.log` | `Test Files  281 passed \| 5 skipped (286)`, `Tests  2903 passed \| 8 skipped (2911)` |
| IMP-04 | `RUN_AGY_FAILURE_E2E=1 … vitest run tests/e2e/model-routing/model-routing-delegation.e2e.test.ts` | `a3dbfcb495` | macOS, scripted AGY | delegate_task notes, router | AC-004 | Pass | `evidence/IMP-04-e2e-model-routing-delegation.log` | `Tests  9 passed (9)` |
| IMP-05 | `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run` (full web suite) | `a3dbfcb495` | macOS, Node 22 | all web | AC-001…003, 007, 009…012 | Pass | `evidence/IMP-05-web-full-suite.log` | `Test Files  668 passed (668)`, `Tests  4855 passed \| 2 skipped (4857)` |
| IMP-06 | `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `a3dbfcb495` | macOS, Node 22 | web imports, catalogs (moved keys) | AC-012 | Pass | `evidence/IMP-06-web-guards.log` | `Passed.`, `zero unresolved findings` |
| IMP-07 | `node tests/e2e/agent-runtimes-settings-probe.mjs --skip-server-build --output-dir=…` | web `51a0aec3ac` working tree; server `dist` with item-2 code | macOS, headless Chrome, scripted CLIs | Settings sidebar, Agent Runtimes names (en, zh-CN, remote) | AC-001, AC-003 | Pass | `evidence/IMP-07-agent-runtimes-settings-probe/result.json` + screenshots | `Result: Pass`; `ARP-01b-VIS-001-table-1440-en.png` |
| IMP-08 | Server e2e affected by names/readiness (delegated-launch-config-defaults, model-routing-delegation [2 failed, fixed → IMP-04], remote-delegation-two-server, application-import-codex-launch, application-reload-repair, agent-runtimes-running-agents, available-agent-runtimes-graphql) | item-2 server code (= `2b53fd8ad3` for what they exercise) | macOS, scripted CLIs | readiness texts, notes, runtime report | AC-004, AC-007 | Pass (after the IMP-04 fix) | `evidence/IMP-08-e2e-runtime-names-and-applications.log` | `41 passed`, `5 passed`, `4 passed`, `2 passed`, `3 passed` |
| IMP-09 | Look in the app: own backend + Nuxt dev, browser tab | web `51a0aec3ac` | macOS | sidebar, submenu, Local Tools, MCP, Memory search (voice unavailable) | AC-001, 002, 011 (hidden state) | Observed | `evidence/IMP-09-look-in-app/README.md` + png | DOM svg counts 0 per menu item; card rows text only |

| IMP-10 | IR-002 new tests with the two fix files stashed | components at `b34c2a36ea` | macOS, Node 22 | launch-setup summary, agent detail | AC-003 (FO-001/002) | Fail as expected | `evidence/IMP-10-fo-tests-on-base.log` | `Tests  2 failed \| 7 passed (9)` |
| IMP-11 | `pnpm -C autobyteus-server-ts typecheck`; `env -i … vitest run tests/unit tests/agent-work-journal tests/integration/skill-update-notices` | `1a4bfd2ae9` | macOS, Node 22 | all server units, journal, notices | AC-004, AC-009, AC-012 | Pass | `evidence/IMP-11-server-unit-full.log` | `typecheck exit=0`; `Test Files  797 passed \| 5 skipped (802)`, `Tests  6721 passed \| 9 skipped (6730)` |
| IMP-12 | `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run` + web guards | `1a4bfd2ae9` | macOS, Node 22 | all web | AC-001…003, 007, 009…012 | Pass | `evidence/IMP-12-web-full-suite-and-guards.log` | `Test Files  668 passed (668)`, `Tests  4858 passed (4858)`; `Passed.`; `zero unresolved findings` |
- Not run, and why:
  - AC-011 with the voice extension enabled (button look, keyboard, recording/transcribing/no-speech/failure, mic permission, language) needs the extension installed in a test instance. That's API/E2E's look in the app.
  - The chat footer/model menu with live models in the app: unit tests plus API/E2E.
  - The full server `test:unit`/`test:integration`: the changed areas are covered by IMP-03.
  - AC-008 is the Product Team's record (`a938d892b3`).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: the Settings sidebar and every page in icon groups A/B; runtime names in the chat footer, model menu, Run Settings, member rows, Agent Runtimes, update notices, Model Routing, Token Statistics and system-instruction activity; the Embedding Project indexes card; the skill-update card; the Depends-on picker; Memory → Search.
- Approved references: `icon-inventory.md` (DEC-001), DEC-002, DEC-003, requirements AC-001…011.
- Existing components reviewed: `VoiceInputButton` (chat input usage: `compact`), `ProjectVoiceStatus` (now `VoiceTargetStatus`), `RunMemberRow`/`ChatModelMenu` truncation, `MarkdownRenderer` inline code.
- Rendered surface: the IMP-07 probe (Nuxt dev + built backend, headless Chrome, 1440/1280/1024/739/390 px), and IMP-09, my own stack inspected through the browser tab.
- States inspected:
  - Settings menu (en; zh-CN in the probe) with an active item and the Server Settings submenu;
  - Local Tools cards; an MCP STDIO server card;
  - Agent Runtimes table and stacked layouts;
  - Memory Search with voice unavailable and search not ready.
- Issues found and corrected:
  - the submenu indent, which was sized for the old icon column (`ml-10` → `ml-2`);
  - three Token Statistics name maps the design's census missed;
  - the system-instruction labels.
- Limitations:
  - the voice button states with the extension enabled were not rendered (AC-011 → API/E2E);
  - the model menu was not rendered with a live catalog (unit-tested);
  - the Embedding card and skill-update card were checked by component tests only.

## Downstream Coverage Hints / Suggested Scenarios

- AC-002, the look in the app for group B pages not opened here:
  - Agent detail buttons;
  - custom provider (Load models, Save, Remove);
  - Qwen "API key configured";
  - Server Settings Save and Migrations Refresh/Run;
  - the voice extension card;
  - the Application Setup pills;
  - the workspace SearchableSelect.
  - Group C spinners and icon-only buttons stay.
- AC-003: full names in the chat footer and model menu (search rows), Run Settings member rows, Model Routing (problem line, decisions, overview), update notices and Token Statistics.
- AC-011 with the voice extension enabled, per the handoff list:
  - the same look as the chat input's button;
  - Tab to it, then Enter/Space to start and stop;
  - the transcript lands in the box with no search;
  - "No speech detected. Try again or type instead." and the failure text;
  - microphone denied;
  - the language follows the voice settings.
- The readiness-reason wording "Codex App Server authentication is unavailable: …" in Application launch settings.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-001…003 and AC-011, the look in the app; AC-012, the clean-clone proof (delivery); AC-008 (Product Team record) linked by the Solution Designer.
