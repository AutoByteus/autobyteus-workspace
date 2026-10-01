# Implementation Handoff

Ticket root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-linked-skills-always-auto-approve/tickets/in-progress/agy-linked-skills-always-auto-approve`
Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-linked-skills-always-auto-approve` / `codex/agy-linked-skills-always-auto-approve`. Base `origin/personal` @ `84224a58d`. The branch is now 14 commits behind `origin/personal`, which delivery integrates.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Architecture review selected (Medium / High); ARCH-REV-001 Pass. Route per `get_handoff_rules`.
- Requirements doc: `<ticket>/requirements-doc.md` (Approved SR-001)
- Investigation notes: `<ticket>/investigation-notes.md`
- Solution revision record: `<ticket>/solution-revision-record.md`
- Design spec: `<ticket>/design-spec.md` (SR-002)
- Supplemental task artifacts: `<ticket>/probes/agy-symlink-skill-probe.py`, `<ticket>/probes/agy-skill-scan.mjs`, `<ticket>/probes/app-log-excerpt-2026-10-01.txt` (evidence). New: `<ticket>/probes/agy-linked-skills-implementation-probe.mjs` and its output `<ticket>/implementation-evidence/`.
- Design review report: `<ticket>/design-review-report.md`
- Architecture review revision record: `<ticket>/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: N/A (initial). AR-001 applied.

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `<ticket>/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-001, SR-002
- Related architecture-review revision IDs: ARCH-REV-001
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: AR-001 (non-blocking, applied)

AGY now uses the regular `SkillService.resolveConfiguredSkillBindingsForAgent`. It links each resolved skill folder into its private capsule (`<capsule>/.agents/skills/<name>` → real folder) and does not walk, fingerprint or copy anything. Request strength is applied once, in the linker. An unusable skill is skipped with a warning for ALL_INSTALLED. For CONFIGURED it fails the run with an `AgentCreationError` that names the skill and reason. Restore tolerates a removed skill. AGY always runs with `--dangerously-skip-permissions` and requires `always-proceed`. Every web launch/config surface shows auto-approve on and locked for AGY, with an explanation. The AGY-only detailed resolver, fingerprint module, copier and skill provenance fields are removed.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` → Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: The implementation matches the planned scope: skills subsystem reduction, AGY capsule/factory/process, one web policy helper plus 7 components, i18n and docs. No new subsystem. Risk stays High because the work deliberately reverses the 2026-09-24 AGY security decisions, reduces shared skill contracts and changes restore semantics.
- Selected route: Code Review (per handoff rules for Large/High)
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (independent code review applies)
- New design impact or escalation trigger: None. The escalation triggers were checked: the compiler found no non-AGY consumer of the removed APIs/fields (`origin` included); live AGY loads a symlinked skill folder (ASM-001 on the installed CLI); and the named-skill `AgentCreationError` reaches chat and the server log unchanged (live L03).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Link skill folders; contents irrelevant | `AgyAgentRunBackendFactory.createBackend` → `SkillService.resolveConfiguredSkillBindingsForAgent` → `createAgyRunCapsule` → `linkAgyConfiguredSkills` (`capsule/agy-configured-skill-linker.ts`): `realpath` + `stat` dir + `stat SKILL.md` → `fs.symlink(real, …, "dir")` | Done. Unit tests: `.venv` outside link, dangling link, 40 MiB sparse file, no `readFile` of skill files; team-private relative link into `shared/` readable through the link. Live L02: real AGY reads `marker.md` through the link. |
| BEH-002 | Named unusable skill → clear error; semantic skips preserved | Linker `unusable()` under `fail` policy → `AgentCreationError("Antigravity could not use skill '<name>': <reason>.")` for `source_unavailable`, `missing_manifest`, `workspace_owned`, `duplicate_name`, `unsafe_name`, `link_failed` (AR-001). `unresolved` bindings → warn-skip `skipped-missing` | Done. Each reason tested; capsule removed on failure; skill source untouched. Missing, malformed or other-name manifests arrive as `unresolved` (catalog rescan), as before. |
| BEH-003 | ALL_INSTALLED skips unusable skills | Linker `unusable()` under `prefer_workspace` → one sanitized warning (`disposition=skipped-unusable` or `skipped-workspace-owned`, `reason=…`) and continue | Done. Test covers vanished, no-manifest, workspace-owned, case-duplicate, unsafe-name and unresolved together. |
| BEH-004 | AGY always auto-approve; locked UI | Server: `AgyStreamProcess.start` always adds `--dangerously-skip-permissions` (input no longer carries `autoExecuteTools`); factory `launch` always requires `permission_mode: always-proceed`, so create and restore both go through it. Web: `isAutoApproveLockedForRuntime` / `effectiveAutoExecuteTools` in `utils/agentRunRuntimeDraftPolicy.ts`, used by `ChatApprovalToggle`/`ChatNewSurface`, `AgentRunConfigForm`, `TeamScopeConfigEditor` (root + nested; covers the team, org-team and existing team/org editors), `MemberOverrideItem`, `AgentOrgRunConfigPanel` root, `MobileLaunchRunOptionsCard`. Chat agent/team launch and org launch submit `true` for AGY | Done. Factory tests use stored `false` for create and restore; argv test covers new and resumed conversations; web specs per surface; live L01/L04. No inline `antigravity_cli` auto-approve checks remain in components. |
| BEH-005 | Missing linked skill on resume → skip with warning; old copied capsules unchanged | `restoreAgyRunCapsule`: `stat <entry>/SKILL.md`. On ENOENT/ENOTDIR it unlinks the entry only if it is a symlink, warns `skipped-missing-source` and continues; other errors still throw | Done. Tests: linked run with deleted source resumes; copied-folder capsule resumes without a warning. The manifest is unchanged. |
| BEH-006 | Skill-caused failure names skill + reason in chat and server log | `AgentCreationError` is rethrown unchanged by `AgentRunManager` and the coordinator | Done. Live L03: chat error card and server log line `[ACTIVATION_FAILED] Antigravity could not use skill 'env-skill': the selected workspace already has a skill with this name.`; no generic "Failed to prepare agent run". |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server source:
- `autobyteus-server-ts/src/agent-execution/backends/antigravity/capsule/agy-configured-skill-linker.ts` (new; replaces `agy-configured-skill-materializer.ts`, which is deleted)
- `.../antigravity/capsule/agy-run-capsule.ts` (linker, binding type, restore tolerance)
- `.../antigravity/backend/agy-agent-run-backend-factory.ts` (regular bindings, unconditional permission check)
- `.../antigravity/stream/agy-stream-process.ts` (always skip-permissions)
- `autobyteus-server-ts/src/skills/services/skill-service.ts`, `configured-agent-skill-resolver.ts`, `skill-discovery.ts`; `skills/domain/configured-agent-skill-binding.ts`, `installed-skill-record.ts`
- Deleted: `autobyteus-server-ts/src/skills/services/configured-skill-source-fingerprint.ts`

Server tests: `tests/unit/agent-execution/backends/antigravity/agy-configured-skill-linker.test.ts` (new; replaces the deleted materializer test), `agy-run-capsule.test.ts`, `agy-agent-run-backend-factory.test.ts`, `agy-stream-process.test.ts`, `agy-production-live.test.ts`; `tests/e2e/runtime/agy-native-image-codex-skill.e2e.test.ts`; skills tests `skill-service.test.ts`, `skill-service-all-installed-scope.test.ts`, `skill-catalog-agent-orgs.test.ts`, `skill-catalog-one-per-name.test.ts`; Claude/Codex bootstrapper fixtures (removed `source`).

Web: `utils/agentRunRuntimeDraftPolicy.ts`; `components/chat/ChatApprovalToggle.vue`, `ChatNewSurface.vue`; `services/chat/chatLaunchService.ts`; `components/workspace/config/AgentRunConfigForm.vue`, `TeamScopeConfigEditor.vue`, `MemberOverrideItem.vue`, `AgentOrgRunConfigPanel.vue`; `components/mobile/MobileLaunchRunOptionsCard.vue`; `localization/messages/{en,zh-CN}/{chat,workspace}.ts`. Specs: new `ChatApprovalToggle.spec.ts` and `MobileLaunchRunOptionsCard.spec.ts`; updated `agentRunRuntimeDraftPolicy.spec.ts`, `chatLaunchService.spec.ts`, `AgentRunConfigForm.spec.ts`, `TeamScopeConfigEditor.spec.ts`, `MemberOverrideItem.spec.ts`, `AgentOrgRunConfigPanel.spec.ts`.

Docs: `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md`, `skills.md`, `agent_execution.md`; `autobyteus-web/docs/agent_execution_architecture.md`, `remote_access.md`.

## Important Assumptions

- ASM-001: The installed `agy` follows a symlinked skill folder under `.agents/skills` with skip-permissions. Verified live on this machine (probe L02; `AGY_LIVE` codebook test).
- A bundled skill folder whose `SKILL.md` declares a different name than its folder is catalogued under the declared name and is now a regular `resolved` binding, as it already was for Codex/Claude. AGY links it under the declared name. Previously the detailed path reported `name_mismatch`. This is the regular-binding behavior the design adopts (DS-001), not a new rule. A configured name that the catalog lacks (including a wrong-name manifest) is still `unresolved` → warn-skip.

## Known Risks

- RSK-001 (accepted): No per-file containment, and AGY always runs with `--dangerously-skip-permissions`.
- ASM-001 holds only for the installed CLI version; future `agy` releases could change symlink handling.
- The chat composer footer shows the AGY explanation as a tooltip plus `aria-label` on a lock-marked "Auto-approve" pill, not as visible inline text. This keeps the compact footer layout. The form surfaces (agent, team, org, member, existing-run, mobile) show the explanation as visible text. If AC-007's "short explanation visible" must mean inline text in the chat footer too, that is a small follow-up.
- `MobileLaunchRunOptionsCard` stays hardcoded English like the rest of that card, so it has no zh-CN.
- Restore keeps the manifest entry of an unlinked skill, so the warning repeats on each resume (accepted in review).
- `components/agentInput/GroupedSelect.vue` keeps its unused toggle (not an AC-007 surface).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change (bug-fix trigger)
- Reviewed root-cause classification: Duplicated Policy Or Coordination
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: The parallel AGY policy is deleted (net −1077/+686 lines across 47 files, tests and docs included). AGY consumes the shared binding API. The small AGY linker is kept separate from `WorkspaceSkillMaterializer` as designed; AGY does not import it.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` (detailed resolver API and helpers, fingerprint module, copier, `DetailedConfiguredSkillResolution`, `ConfiguredSkillSource`, `sourceFor`, `origin`/`trustedRoot`/`configuredRoot`, the `configuredRoot` parameter of `scanSkillDirectory`, `autoExecuteTools` on process start, AGY "when off" help keys, the obsolete materializer test)
- Shared structures remain tight: `Yes` (`ConfiguredAgentSkillBinding = {resolved, skill} | {unresolved, name}`; `InstalledSkillRecord = {skill, tier, sourcePath}`)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. Largest changed: `MemberOverrideItem.vue` 497 effective lines (+8); `skill-service.ts` 469 (−17). No changed source file has a >220-line delta except the deleted copier (−173) and the resolver reduction (−176).
- Notes: Old copied capsules restore through the same version-agnostic `SKILL.md` check; there is no version branch.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: Persisted Data / State Transition Decision
- Implementation follows it without migration or version fallback: `Yes`
- Direct-use evidence: Manifest shape unchanged (`skills[{name, relativePath}]`). The copied-capsule restore test passes. Stored `autoExecuteTools:false` is ignored by the AGY backend (factory tests) and shown as on in the existing-run editor (live L04).
- Migration implementation: N/A
- Deviation: None

## Environment Or Dependency Notes

- The worktree needed `pnpm install`, `prisma generate` (server) and `nuxi prepare` (web) before local checks.
- `pnpm -C autobyteus-server-ts typecheck` fails on a pre-existing `rootDir` config problem (tests included under `rootDir: src`). I typechecked with `tsc -p tsconfig.build.json --noEmit` instead: clean.
- SDK `dist/` folders are untracked build output; they are not part of the change.

## Local Implementation Checks Run

- Server source typecheck (`npx tsc -p tsconfig.build.json --noEmit`): clean. Server build (`pnpm -C autobyteus-server-ts build`, including the built-in agents bootstrap smoke): pass.
- Server AGY unit suite `tests/unit/agent-execution/backends/antigravity`: 14 files pass, 2 live-gated skipped (171 tests).
- Server `tests/unit/skills tests/unit/agent-execution tests/unit/workspaces`: all changed areas pass. 7 failures in 4 unrelated files (`agent-run-provisioning-service`, `workspace-manager*`, `codex-tool-log-correlation`) fail identically on a clean base checkout at `84224a58d`.
- Server `tests/unit tests/integration` full run: no new failures (see "Full server run" below).
- Live AGY vitest: `AGY_LIVE=1 … agy-production-live.test.ts -t "linked into the production capsule"`: pass. A real `agy` reads `marker.md` through the capsule link; the capsule entry's `readlink` is the source realpath. Evidence: `<ticket>/implementation-evidence/agy-production-live/`.
- Web related suites (`components/workspace/config components/chat components/mobile utils services/chat stores composables`): 200 files / 1485 tests pass.
- Web full `vitest run`: 540 files pass. Six files fail, all outside this change: `org-definition-navigation.spec`, `WorkspaceAgentRunsTreePanel.regressions.spec` (`selectionStore.beginSelectionIntent is not a function`; fails identically with my web changes stashed), the font-size audit (`TokenUsageRunDetailsView.vue` px sizes), two specs importing a missing `autobyteus-ts` dist, and an electron `child_process` mock.
- Web guards: `guard:localization-boundary`, `audit:localization-literals`, `guard:web-boundary`: pass.

Full server run: `pnpm -C autobyteus-server-ts exec vitest run tests/unit tests/integration` → 606 files pass, 20 skipped, 48 files fail (127 tests). Running exactly those 48 files on a clean base checkout (`84224a58d`, same `node_modules`) fails the identical 48 files / 127 tests, so this change adds no failure. They are environment and integration suites (application backend, file explorer, app-data migrations, media storage and others).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Chat composer approval pill; agent run config form (new and existing-run editor); team/org scope editors; member override; org root panel; mobile launch card.
- Approved references: REQ-004, AC-007; requirements UI note ("on state, disabled, one-line explanation; layout otherwise unchanged").
- Existing design system reviewed: the existing switch/pill styles (`AutoApproveSwitch`, the chat pill) are reused with their `disabled:opacity-50` treatment; heroicons `lock-closed` is used for the compact pill.
- Surface used: TESTING.md "Renderer UI … browser dev-path probe". Ad-hoc probe `<ticket>/probes/agy-linked-skills-implementation-probe.mjs`: real backend `dist/app.js` on an owned temp data root, Nuxt dev, headless Chrome, installed `agy`; the user's app and data are untouched.
- States inspected: L01 chat with AGY selected and draft stored off → locked on (`data-locked`, `aria-disabled`, tooltip and aria explanation, lock icon), clicks ignored; switching to Codex → editable "Ask first". L04 existing AGY run settings → switch on and disabled, explanation text visible. L03 error card wording. Screenshots: `<ticket>/implementation-evidence/L01-*.png`, `L02-*.png`, `L03-*.png`, `L04-*.png`.
- Issues found and corrected: The first probe run treated the `aria-disabled` pill as unclickable (correct product behavior); the probe now dispatches the click directly. No product visual defects were found.
- Remaining unverified states: The new-run team/org/member forms and the mobile card were checked by component specs, not rendered in a browser. Narrow viewports were not inspected (the footer pill only gained a 12px icon).

## Downstream Coverage Hints / Suggested Scenarios

- Real Chat (Daily Assistant) on AGY with the user's real skill set, including `browser-automation` with its `.venv` (AC-001 live on real data; use an isolated instance with the skill folder added, not the user's app).
- Team member CONFIGURED failure on AGY: assert the chat/server message names the skill (review residual risk "team/org error surfacing").
- AGY team/org member and agent-initiated delegation with stored `autoExecuteTools:false` → `always-proceed` (AC-006 through non-UI entry).
- Resume of a linked run after deleting its skill source (AC-008) through the real server, and resume of a pre-change copied-capsule run (AC-009).
- Rendered checks of the team/org/member launch forms and the mobile card with AGY selected (AC-007).

## API / E2E / Executable Coverage Investigation And Execution Still Required

Owned by `api_e2e_engineer`: the scenarios above, plus a broader AGY E2E regression (`RUN_AGY_*` suites, and the fake-CLI transport suites, whose fixture already reports `always-proceed`). Nothing in this handoff is API/E2E sign-off.
