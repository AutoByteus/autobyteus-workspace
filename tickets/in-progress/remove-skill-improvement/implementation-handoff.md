# Implementation Handoff

Ticket `remove-skill-improvement` (autobyteus-205). Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skill-improvement`, branch `codex/remove-skill-improvement`, design commit `04aac13a77` (base `origin/personal`).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High) and passed (ARCH-REV-002). `get_handoff_rules` → `/software_engineering_team/code_reviewer`.
- Requirements doc: `tickets/in-progress/remove-skill-improvement/requirements-doc.md` (REQ-001..REQ-006, AC-001..AC-005)
- Investigation notes: `tickets/in-progress/remove-skill-improvement/investigation-notes.md` (F-01..F-11, A-01..A-09)
- Solution revision record: `tickets/in-progress/remove-skill-improvement/solution-revision-record.md` (SR-001..SR-004)
- Design spec: `tickets/in-progress/remove-skill-improvement/design-spec.md` (SR-004)
- Supplemental task artifacts: `release-notes.md` (unchanged; delivery uses it); `follow-ups.md` (FU-001 by the designer, FU-002 added by implementation)
- Design review report: `tickets/in-progress/remove-skill-improvement/design-review-report.md` (ARCH-REV-002, pass)
- Architecture review revision record: `tickets/in-progress/remove-skill-improvement/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial handoff).

## Current Implementation Summary

Skill Improvement is gone, together with everything only it used:
- **Server:** the `src/skill-improvement` subsystem, its GraphQL API, the built-in Retrospective Skill Improver (template, registry entry and the setting-default mechanism only it used), its two predefined settings, the direct-message grant registry and domain with the router's grant branch, and the `server_helper` launch purpose.
- **Web:** the Settings toggle card, the composer "Improve skills" CTA, both stores, the GraphQL documents and type, the improver's built-in id, the i18n keys and the feature's generated GraphQL declarations.
- **Docs and tests** updated to match.

The three settings are retired through `retiredSettingNames`. The startup migration `20261020_remove_skill_improvement_data` deletes the feature's data once (M1..M6).

- Implementation cycle: `Initial`
- Implementation revision record: `tickets/in-progress/remove-skill-improvement/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-001..SR-004
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: N/A

Commits:
- `1f12b46b8b` server;
- `fc46a7b5fc` web;
- `a71e93a7f2` registry-order tests;
- the handoff commit, with these documents and evidence.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change:
  - About 137 files changed: server 102, web 35.
  - Three material changes:
    - a migration that deletes user data on every install;
    - a public GraphQL API removed;
    - the `send_message_to` router's grant branch removed. The router diff is deletions only; every other result code is unchanged (IMP-04).
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. Checked against the design's three triggers:
  1. No runtime dependency on a removed symbol: server typecheck and build smoke pass, and both sweeps (IMP-11, IMP-10) are clean.
  2. No uncovered data shape: one shape the design did not list (delegated copies' own files) is recorded under Important Assumptions.
  3. No `send_message_to` result changed other than the grant-only codes.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Settings toggle card removed; other Basics cards preserved | `autobyteus-web/components/settings/ServerSettingsBasicsPanel.vue`; card and spec deleted; `stores/serverSettings.ts` comment | Done. IMP-13 rendered: only the Applications card, then the other cards in order |
| BEH-002 | Composer CTA and improver helper runs removed; composers otherwise unchanged | `AgentWorkspaceSurface.vue`, `TeamWorkspaceSurface.vue` (CTA block, imports, `skillTarget` removed; the `#composerContext` slot stays, `MobileChat.vue` still fills it); `components/workspace/skill-improvement/**`, both stores, GraphQL documents, `SkillImprovementConfig.ts` deleted; `src/skill-improvement/**` and its GraphQL types deleted | Done. IMP-08 and IMP-13 |
| BEH-003 | Grant mechanism removed; `send_message_to` unchanged | `global-agent-run-message-router.ts`: deletions only (105 lines). `direct-agent-run-message-grant-registry.ts` and `direct-agent-run-message-grant.ts` deleted | Done. The router test's 8 non-grant cases are unchanged and pass (only `createRouter` lost its grant parameter); the 2 grant cases were removed (IMP-04) |
| BEH-004 | Improver not bootstrapped; two settings not predefined; three keys retired | `built-in-agent-registry.ts` (Daily Assistant only); `built-in-agent-bootstrapper.ts` (setting-default mechanism removed: it served only the improver); `server-settings-service.ts`; `app-config-setting-policy.ts` `retiredSettingNames` += 3 keys; `scripts/smoke-built-in-agents-bootstrap.mjs` | Done. IMP-05 smoke ("Built-in agents bootstrap smoke check passed."); F-7 config test (IMP-04); SID-1/SID-2 (IMP-06) |
| BEH-005 | Feature data deleted once at the first start; unrelated data byte-identical; startup never blocked | `src/app-data-migrations/migrations/remove-skill-improvement-data-migration.ts` (M1..M6), registered last in `app-data-migration-registry.ts` | Done. Unit: 8 cases on F-1..F-8b (IMP-04). Startup e2e: fresh folder, old data and second start, injected failure then retry (IMP-06) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. The Work Journal, the Skill Self-Evolver definition, memory location services (FU-001), released migrations and Memory Sync mirrors are untouched.

## Key Files Or Areas

- **Server removed:**
  - `src/skill-improvement/**` (24 files);
  - `src/api/graphql/types/skill-improvement*.ts` (3);
  - `src/built-in-agents/templates/retrospective-skill-improver/**`;
  - `src/agent-communication/{domain/direct-agent-run-message-grant.ts,services/direct-agent-run-message-grant-registry.ts}`;
  - `docs/modules/skill_improvement.md`;
  - `tests/skill-improvement/**`, `tests/unit/skill-improvement-skill-package-tree-renderer.test.ts`, `tests/e2e/runtime/work-journal-skill-improvement.e2e.test.ts`.
- **Server modified:**
  - `src/api/graphql/schema.ts`;
  - `src/built-in-agents/{built-in-agent-registry.ts,built-in-agent-bootstrapper.ts}`;
  - `src/services/server-settings-service.ts`;
  - `src/config/app-config-setting-policy.ts`;
  - `src/agent-communication/services/global-agent-run-message-router.ts`;
  - `src/run-history/store/{agent-run-metadata-types.ts,agent-run-metadata-store.ts}`;
  - `src/agent-execution/services/{agent-run-provisioning-service.ts,agent-run-service.ts,standalone-agent-run-eligibility.ts}`;
  - `src/app-data-migrations/app-data-migration-registry.ts`;
  - `scripts/smoke-built-in-agents-bootstrap.mjs`.
- **Server added:**
  - `src/app-data-migrations/migrations/remove-skill-improvement-data-migration.ts`;
  - `tests/unit/app-data-migrations/remove-skill-improvement-data-migration.test.ts`;
  - `tests/e2e/app-data-migrations/remove-skill-improvement-data-startup.e2e.test.ts`;
  - `tests/fixtures/app-data-migrations/skill-improvement-data-fixtures.ts`.
- **Server moved:** `tests/skill-improvement/remove-self-evolution-run-metadata-migration.test.ts` → `tests/unit/app-data-migrations/`. It tests a released migration that stays registered.
- **Server tests updated:**
  - router;
  - lifecycle and run-root: helper-run cases now use application-owned runs, the remaining ineligible kind;
  - built-in bootstrapper and templates;
  - settings service; F-7 added to the config test;
  - architecture allowlist;
  - project-task-manager startup (e2e and integration);
  - agent identity, projects GraphQL and secret-lifecycle e2e;
  - memory notification;
  - two registry-order tests;
  - the work-trace startup e2e (see Known Risks).
- **Server docs:**
  - `ARCHITECTURE.md`, `PROJECT_OVERVIEW.md`, `docs/README.md`;
  - `modules/README.md`, `agent_definition.md`, `agent_communication.md`, `agent_tools.md`, `agent_work_journal.md`, `application_capability.md`, `run_history.md` (metadata fields; migration bullets), `standalone_agent_run_root.md`;
  - `features/memory_sync.md`.
- **Web removed:**
  - `components/settings/SkillImprovementFeatureToggleCard.vue` (and its spec);
  - `components/workspace/skill-improvement/**`;
  - `stores/skillImprovementStore.ts`, `stores/skillImprovementCapabilityStore.ts`;
  - `graphql/{queries,mutations}/skillImprovement*.ts`;
  - `types/agent/SkillImprovementConfig.ts`;
  - `localization/messages/__tests__/workspaceHistorySkillImprovementCleanup.spec.ts`.
- **Web modified:**
  - `ServerSettingsBasicsPanel.vue`, `AgentWorkspaceSurface.vue`, `TeamWorkspaceSurface.vue`;
  - `stores/serverSettings.ts`, `utils/agents/builtInAgentDefinitionIds.ts`;
  - i18n (en, zh-CN);
  - `generated/graphql.ts`: 474 deleted lines, exactly the feature's 68 declarations and 8 Query/Mutation fields; see Important Assumptions;
  - 11 specs, 10 browser probes, and 5 docs (`settings.md`, `agent_execution_architecture.md`, `agent_management.md`, `agent_teams.md`, `skills.md`).

## Important Assumptions

- **Delegated copies in M1.** Since autobyteus-197, `memory/agents/<id>/run_metadata.json` also holds delegated copies' own files (they have a `taskAgent` section). A copy belongs to its coordinating run; deleting only its folder would leave that run with a dangling link. Helper runs are standalone runs, so M1's definition-id and `server_helper` sources skip files with a `taskAgent` section. The user's data has no such copy. The unit and e2e fixtures include one and show it kept (Technically Possible but Unsupported, design Principle 6).
- **M3 waits for M2.** A helper run folder is deleted only after its history row is removed. This extends the design's ordering guard: if M2 fails, M3 deletes nothing, so the definition-id and `server_helper` sources "remain on retry" as the design's idempotency note assumes. Without the guard, a failed M2 would have lost the `server_helper` runs' rows for good. Unit test: "keeps the helper runs and records when the history rows cannot be written…".
- **Unreadable history index.** An unreadable `run_history_index.json` is a `FAILED` item (the next start retries), not `PRESERVED_UNREADABLE`: the runtime owns and rewrites that file. Unreadable M1 sources are `PRESERVED_UNREADABLE`, as designed.
- **Constructor input.** The migration's constructor takes `agentsDir` and joins the frozen improver id itself. The design said the registry passes the full folder path (as precedent A-06 does), which would put the frozen id in the registry, outside AC-001's allowed locations.
- **M2 serialization.** M2 writes the parsed rows back unchanged with `writeIndex`'s serialization (`JSON.stringify(rows, null, 2) + "\n"`) through a local temp-and-rename. The design's dependency rule limits the migration to runner types and `fs`/`path`, so it does not import the current store's normalizer. The unit test proves unchanged rows keep their bytes (R-1).
- **Generated GraphQL.** `generated/graphql.ts` was trimmed, not fully regenerated. A full regeneration against the current server also brings about 700 lines of unrelated, pre-existing drift from other tickets (FU-002). IMP-12 proves the trim: the committed diff is deletions only, and none of the 68 removed declarations exists in a fresh regeneration.
- **Projects e2e check.** API-001 used to check "other capabilities keep their settings" through `skillImprovementCapability`. The in-process harness does not configure the application API services, so it now checks the stored `ENABLE_APPLICATIONS` value directly.
- **R-2 (sessions not an M1 source).** Every fixture shape's helper runs are found through records, the definition id or `server_helper`, so per-run session files were not added as a source.
- **R-3.** A team definition that includes the improver would lose that member when M6 deletes the definition. That is unchanged, as accepted in the design review.

## Known Risks

- **The work-trace startup e2e (released migration) was adapted.** Its fixture holds a `self_evolution/evolver_session.json` folder that the new migration (registered after it) now deletes in the same start. The e2e's byte-identity check excludes that folder and asserts it is gone.
- **The secret-lifecycle e2e now asserts a stronger fact.** It relied on the improver setting as the "one adjacent key" a first start writes to `.env`. It now asserts that the runtime `.env` is unchanged by a start and by saving a provider key, and it passes (IMP-07).
- **AC-001 sweep hits outside the listed locations, all classified in IMP-11:**
  - `docs/modules/run_history.md` and `docs/modules/llm_management.md` describe migrations by their ids and effects (the released `20260623_remove_self_evolution_run_metadata`, the released custom-provider migration that still rewrites skill-improvement sessions, and the new migration);
  - the registry registers the new migration by its class name;
  - `autobyteus-ts/src/agent/runtime/agent-runtime.ts` uses the English word "retrospective" in an unrelated comment;
  - old committed build and test logs.

  Reviewers should confirm that migration documentation by id is acceptable.
- **`selfEvolution` in `agent-definition-config.ts` is left untouched.** `mergeAgentConfigRecord` drops an obsolete `selfEvolution` key when an agent definition is saved (2026-08-12). It is live for existing `agent-config.json` files, possibly the kept Skill Self-Evolver's, and outside the sweep's `self_evolution` pattern.
- **The web has no working typecheck command (FU-002).** IMP-10 runs the repository's `tsc`. The project already carries 696 errors, mostly unresolved `.vue` modules. None is on a line this change added or changed, and nothing references a removed generated declaration. `.vue` templates cannot be type-checked with the repository's tooling.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Cleanup (feature removal)
- Reviewed root-cause classification: Legacy Or Compatibility Pressure
- Reviewed refactor decision: `Refactor Needed Now` (removal only)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: no shim; router trimmed to its delivery path; `launchPurpose` dropped; settings retired through the existing policy; historical names only in the migration and `retiredSettingNames`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. Old `launchPurpose` values are ignored by the tolerant metadata reader; the migration deletes the runs that carry them.
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`. Beyond the Removal Plan:
  - the built-in setting-default mechanism (`settingDefault`, `initializeSettingDefaultIfNeeded`, the bootstrapper's `serverSettingsService` option, `initializedSetting`), whose only user was the improver;
  - the tests that only guarded the removed feature (run-history row actions, stale `skillImprovement` launch override, the `ENABLE_SKILL_IMPROVEMENT` refresh case covered by the `ENABLE_PROJECTS` case);
  - the probes' mock handlers for the removed query;
  - unused test imports.
- Dead code found elsewhere, added to `follow-ups.md`: None. FU-002 is tooling and drift, not dead code.
- Shared structures remain tight: `Yes`. `AgentRunMetadata` lost `launchPurpose`; the router dependencies lost `grantRegistry`; `BuiltInAgentDefinition` lost the optional `settingDefault`.
- Canonical shared design guidance was reapplied: `Yes`
- Changed source files within size guardrails: `Yes`.
  - The largest changed source files are `stores/serverSettings.ts` (387), `server-settings-service.ts` (349) and the new migration (308).
  - The only change over 220 lines is the new single-concern migration file (+338).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Migration Required` (deletion, DEC-001 C) for records, sessions, helper runs and the definition. Settings use the existing `retiredSettingNames` policy.
- Design-spec decision reference: "Persisted Data / State Transition Decision", "Migration Plan" (M1..M6), "Data Migration Guideline Checklist", "Shape inventory and fixtures"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result: N/A
- **Migration implementation and focused checks:**
  - `STARTUP_ONLY`, registered last; frozen names only inside the migration.
  - Dispositions: `MIGRATED`; `SKIPPED` with `PRESERVED_UNREADABLE` (warning); `FAILED` (retry).
  - Status: `SUCCEEDED`, `SUCCEEDED_WITH_WARNINGS`, or `FAILED` (non-terminal).
  - Never blocks startup.
  - Fixtures F-1..F-8b, plus a delegated copy of the improver and a non-session `skill_improvement` folder (both kept).
  - Unit cases (IMP-04): a fresh folder (0 items); all shapes, byte-identical elsewhere, with exact history-index bytes; a second start (nothing changes); unreadable sources; injected run-folder and history-write failures, each finishing on the retry; canonical ids only.
  - F-7 config test (IMP-04).
  - Startup e2e on the built server (IMP-06): SID-1 fresh folder; SID-2 old data, other runs list and open, `.env` exact, second start; SID-3 a mode-bit-blocked helper run leaves startup working and the next start finishes.
  - Synthesized fixtures only; nothing ran on the user's data or a copy of it.
- Deviation from the reviewed transition decision: `None` in outcome. The refinements are under Important Assumptions: M3 waits for M2, delegated copies are skipped, and an unreadable index fails rather than being preserved.

## Environment Or Dependency Notes

- macOS 26.5.2, Node v22.23.1, pnpm 10.28.2. `pnpm install --frozen-lockfile` and the server prebuild were run in this worktree; it had no `node_modules`.
- E2E suites run with `env -i PATH HOME=<temp> TMPDIR`. The user's app and `~/.autobyteus` were never used.
- Untracked `autobyteus-application-*/dist/` folders come from the integration prerequisites and are not part of the change.
- **Discrepancy with AC-001.** AC-001 says "Typecheck and lint pass", but the repository has no lint command, and TESTING.md names none. Server typecheck passes (IMP-01). For the web, see IMP-10.

## Checks Run

Evidence is in `tickets/in-progress/remove-skill-improvement/evidence/`; `IMP-00-summary.txt` lists every run.
- The full logs of IMP-02, IMP-03 and IMP-08 are committed as excerpts because of their size.
- IMP-02's first run, on `fc46a7b5fc`, failed only the two registry-order tests. They were fixed in `a71e93a7f2`, and IMP-02 was rerun there.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `fc46a7b5fc` (server source unchanged since) | macOS, Node 22 | all server source | AC-001 | Pass | `IMP-01-server-typecheck.log` | `# Exit code: 0` |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit` | `a71e93a7f2` | same | server unit | AC-002 | Pass | `IMP-02-server-unit.excerpt.txt` | `Tests  6259 passed \| 7 skipped (6266)` |
| IMP-03 | `test:integration:prepare` then `test:integration` | `fc46a7b5fc` (only two unit tests changed since) | same | server integration | AC-002 | Pass | `IMP-03-server-integration.excerpt.txt` | `Tests  421 passed \| 69 skipped (490)` |
| IMP-04 | focused unit: the new migration, the moved self-evolution migration test, config (F-7), router, built-ins, lifecycle, run root | `fc46a7b5fc` | same | migration, settings, router, built-ins, eligibility | BEH-003..005, AC-002..004 | Pass | `IMP-04-focused-unit.log` | `Tests  116 passed (116)` |
| IMP-05 | `pnpm -C autobyteus-server-ts build` (includes the built-in smoke script) | `fc46a7b5fc` | same | build and built-in bootstrap | BEH-004 | Pass | `IMP-05-server-build-and-smoke.log` | `Built-in agents bootstrap smoke check passed.` |
| IMP-06 | startup e2e: `remove-skill-improvement-data-startup` (SID-1..3) and `remove-work-trace-exports-startup` | `fc46a7b5fc` | same, `env -i`, built server | startup, migrations, config, GraphQL | AC-003, AC-004 | Pass | `IMP-06-e2e-startup-migrations.log` | `Tests  4 passed (4)` |
| IMP-07 | edited e2e: secret lifecycle, projects GraphQL, project-task-manager startup, agent identity | `fc46a7b5fc` | same, `env -i` | settings, built-ins, GraphQL | AC-002 | Pass | `IMP-07-e2e-edited-suites.log` | `Tests  19 passed (19)` |
| IMP-08 | `nuxt prepare`; `cross-env NUXT_TEST=true vitest run` (web) | `fc46a7b5fc` (web unchanged since) | same | web unit and component | BEH-001, BEH-002, AC-002 | Pass | `IMP-08-web-unit.excerpt.txt` | `Tests  4571 passed \| 5 skipped (4576)` |
| IMP-09 | web `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `fc46a7b5fc` | same | web | — | Pass | `IMP-09-web-guards.log` | `# Exit code: 0` |
| IMP-10 | repository `tsc` over the web: errors on changed lines; references to removed generated declarations | `a71e93a7f2` | same | web | AC-001 (web typecheck) | Pass | `IMP-10-web-typecheck-relevant.log` | `result: PASS` |
| IMP-11 | AC-001 sweep (`git grep` of design step 6's pattern; every hit classified) | `fc46a7b5fc` | same | server, web, docs | AC-001 | Pass | `IMP-11-ac001-sweep.log` | `result: PASS` |
| IMP-12 | generated GraphQL proof: regenerate against the built server; removed declarations absent; committed diff deletions only | `fc46a7b5fc` | same | `generated/graphql.ts` | AC-001, R-4 | Pass | `IMP-12-generated-graphql-proof.log` | `0	474	autobyteus-web/generated/graphql.ts`, `result: PASS` |
| IMP-13 | rendered check: built backend + Nuxt dev; Settings Basics and new-chat composer read and captured | `a71e93a7f2` | same, Chrome | Settings Basics panel, composer | BEH-001, BEH-002 | Pass | `IMP-13-rendered-check.txt`, `IMP-13-*.png` | `featureCards: ["applications-feature-toggle-card"]`, `mentionsSkillImprovement: false` |

- Not run, and why:
  - `pnpm -C autobyteus-web test:electron`: no Electron code changed.
  - Lint: no lint command exists.
  - The other browser probes edited here: only their dead mock handlers and two id lists changed; each parses (`node --check`). Left to API/E2E.
  - The user's real data (AC-004, "the user's check after backup"): delivery.

## Frontend Rendered-Result Check (When Applicable)

- **Affected surfaces / journeys:** Settings → Server Settings → Basics (card removed); agent and team composers (CTA removed).
- **References:** REQ-001 / AC-001, BEH-001, BEH-002; no UI specification (removal only).
- **Existing design system and adjacent surfaces reviewed:**
  - `ServerSettingsBasicsPanel.vue`'s card grid;
  - the shared `#composerContext` slot of `AgentEventMonitor`, kept because `MobileChat.vue` uses it;
  - `FeatureCapabilityToggleCard` and the capability store factory, kept for Applications.
- **Surface used:** TESTING.md "Browser probes" style: the built backend on a fresh temp data folder plus Nuxt dev, read through the agent browser with DOM scripts and screenshots.
- **States, layouts and interactions inspected:**
  - Settings Basics: only the Applications toggle card; the other cards in order and normally spaced; no Skill Improvement text.
  - New-chat composer: renders as before, with no "Improve skills" control.
  - Viewport 834×738.
- **Visual or interaction issues found and corrected:** none.
- **Limitations:** the composers of an existing standalone run and of a Team member were not rendered. A fresh node has no runs, and creating one needs a model runtime. They are covered by the updated specs (`AgentWorkspaceSurface.spec.ts`, `AgentWorkspaceView.spec.ts`, `TeamWorkspaceView.spec.ts`, `TeamCanonicalPlus.spec.ts`).

## Downstream Coverage Hints / Suggested Scenarios

- **Upgrade with old data (AC-003/AC-004):** desktop or packaged start on a synthesized data folder shaped like the user's (the fixture module `tests/fixtures/app-data-migrations/skill-improvement-data-fixtures.ts` writes one). The app starts; the feature data is gone; other runs open and resume; `.env` keeps every other line.
- **`send_message_to` between runs (BEH-003):** standalone to standalone, Team member to Team member, and a task copy, through real tool calls. The result codes are unchanged.
- **UI:** Settings → Server Settings → Basics and Advanced (the retired keys are absent and cannot be re-added); an existing run's composer and a Team member's composer show no "Improve skills".
- **Memory page:** after the migration, the helper runs no longer appear; the Skill Self-Evolver agent is still listed.

## API / E2E / Executable Coverage Investigation And Execution Still Required

The scenarios above at the system boundary (real runtimes, browser, packaged app). AC-005 (release notes) is delivery's, as is the user's own check after his backup (AC-004).
