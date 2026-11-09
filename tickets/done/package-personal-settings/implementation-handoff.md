# Implementation Handoff — package-personal-settings (autobyteus-95, stage 1)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected
  (Large/High); ARCH-REV-002 Pass. Next: Code Reviewer (Large/High rule).
- Requirements doc: `tickets/in-progress/package-personal-settings/requirements-doc.md` (SR-006)
- Investigation notes: `tickets/in-progress/package-personal-settings/investigation-notes.md`
- Solution revision record: `tickets/in-progress/package-personal-settings/solution-revision-record.md`
- Design spec: `tickets/in-progress/package-personal-settings/design-spec.md` (SR-006)
- Supplemental task artifacts: `personal-settings-file-contract.md` (normative; its validation
  cases are unit tests), `evidence/validate-personal-settings-file.mjs`
- Design review report: `tickets/in-progress/package-personal-settings/design-review-report.md`
- Architecture review revision record: `tickets/in-progress/package-personal-settings/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial implementation)

Branch `codex/package-personal-settings`, base `origin/personal` `a85bf4f38d`. Commits:

| Commit | What |
| --- | --- |
| `48f4443fe6` | Baseline fix (not this ticket's change): `pages/__tests__/mobile-root-shell.spec.ts` was stale since autobyteus-433 |
| `024c052947` | The architecture reviewer's two documents |
| `f9b3e27297` | The implementation |
| `2c4ba2c51e` | Two fixes found in the rendered check (see Frontend Rendered-Result Check) |
| (this handoff's commit) | Handoff, revision record, follow-ups, evidence |

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-006`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

Tools, skills, avatar and default runtime/model of a definition from a registered agent package
(GitHub or local folder), or of a built-in agent, are personal settings kept in
`<app-data>/agent-packages/personal-settings.json`; Teams and Orgs have avatar and runtime/model.
Every store-backed read returns the effective definition; saves send the four settings to the
file and write the definition's files only when a non-personal field changes; the editors show a
note, a "Personal" mark and a reset link; a GitHub update backs up changed files and captures
file edits of the four settings before replacing the folder.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: about 40 source files across server, web and docs; new persisted
  user data; every definition read passes the new projection; the update pipeline gains a
  download and writes of user data; new GraphQL fields and mutations — as the design says.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. The three triggers were checked: no
  definition reader outside the three services was found (see "Admission entries" below); capture
  reads both trees with the existing folder readers; no touched file passed 500 non-empty lines
  (`build-studio-server.ts` was at 500 and is now 497, see Legacy check).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-002..004 (reads), DS-001 | Every read of a package or built-in definition is effective | `AgentDefinitionService.getAgentDefinitionById/getAllAgentDefinitions/...` → `readBaseDefinition` → `effective()` (strip, then `PersonalSettingsService.apply`); Team and Org services likewise in `getDefinitionById`, `getAllDefinitions`, `listAdmissionEntries` | Implemented. Run start, the GraphQL Team/Org lists, delegated copies and tool-list updates read through these. `apply` keeps the class (new object, same prototype) |
| BEH-002..004 (saves), DS-002 | Save splits into personal settings and file changes; no file write for a personal-only save; reset per setting | `updateAgentDefinition` / `updateDefinition` (Team, Org): candidate from the base with the personal fields at base values → `fileStore.rendersDifferently(base, candidate)` → write only if different → `PersonalSettingsService.setEdited` → return the effective read. Reset: `resetPersonalSetting` → `PersonalSettingsService.reset`. GraphQL: `resetAgentPersonalSetting`, `resetAgentTeamPersonalSetting`, `resetAgentOrgPersonalSetting`; fields `personalSettings`, `personalSettingsBase` | Implemented. Unit tests on real package fixtures (`personal-settings-write-forms.test.ts`); rendered check in the real app (IMP-09). Team text equal to the files' up to surrounding whitespace keeps the files' text (fix `2c4ba2c51e`) |
| BEH-001, DS-003 | At a GitHub update: download the installed revision, back up changed files (5 kept), capture edits of the four settings; failure rules | `GitHubAgentPackageUpdates.updatePackage` → `PackageEditCapture.captureAndBackUp` (new, `agent-packages/services/package-edit-capture.ts`) → `installer.downloadRevision` → folder readers on both trees → backup → `PersonalSettingsService.captureFromPackageEdits` → staging as before | Implemented. Every row of "Capture Failure Rules" has a test (`package-edit-capture.test.ts`, 12 tests). Order: edits computed, backup, capture, staging |
| BEH-001 texts | REQ-007: what is kept, what is replaced, the backup | `localization/messages/{en,zh-CN}/updateNotifications.ts` keys `settings.notifications.auto.confirm.replace.agent_package`, `…explain.agent_package`, `…explainOn.agent_package` | Implemented; `NotificationCenter.automation.spec.ts` asserts the new confirmation text |
| UI (stage 1) | Note line, "Personal" mark and reset in the agent, Team and Org editors | `components/definitions/PersonalSettingsNote.vue`, `PersonalSettingMark.vue`, `composables/usePersonalSettingReset.ts`; `AgentDefinitionForm.vue`, `DefinitionLaunchPreferencesSection.vue`, `AgentTeamDefinitionForm.vue`, `agentOrgs/AgentOrgPersonalSettings.vue` (in `AgentOrgExperience.vue`) | Implemented; component specs; rendered check (IMP-09) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server (`autobyteus-server-ts/src`):
- New `personal-settings/domain/personal-setting-record.ts`, `personal-settings/stores/personal-settings-store.ts`, `personal-settings/services/personal-settings-service.ts`, `api/graphql/types/personal-settings.ts`, `agent-packages/services/package-edit-capture.ts`.
- Changed: the three definition services and file providers (`rendersDifferently`); GraphQL types and converters of the three definitions; `create-bundle-backed-definition-services.ts`; `compositions/host-definition-services.ts`, `agent-package-definition-feed-composition.ts` (now takes the host definition services), `build-studio-server.ts`; `agent-packages` installer (`downloadRevision`), `github-agent-package-updates.ts`, `agent-package-service.ts`.

Web (`autobyteus-web`): GraphQL documents and `generated/graphql.ts`; the three stores (reset actions); `types/personalSettings.ts`; the components above; `localization/messages/{en,zh-CN}/personalSettings.ts` and the REQ-007 texts.

Docs: `GLOSSARY.md` (base value, personal setting — R-4); `autobyteus-server-ts/docs/modules/personal_settings.md` (new), `agent_packages.md`, `agent_definition.md`, modules `README.md`; `autobyteus-web/docs/agent_management.md`, `agent_teams.md`, `agent_orgs.md`.

Tests: new `tests/unit/personal-settings/` (record, service, write forms), `tests/unit/agent-packages/package-edit-capture.test.ts`; web specs for the form, the Org component and the stores. Changed tests are listed under "Changed existing tests".

## Important Assumptions

- Admission entries (implementation note, not a Design Impact): the design's Derived Consumers
  row says collaboration admission (`listAdmissionEntries`) is "not affected". In the code, the
  GraphQL Team and Org lists and run starts read through `listAdmissionEntries` (store entries,
  no apply). Following the Ownership Map ("apply on every store-backed read"), the Team and Org
  services apply personal settings there too; otherwise the Team/Org lists and launches would
  show and use base values. It is inside the three services, so the escalation trigger "a
  definition reader outside the three services" does not apply.
- `AgentPackageService` gets the capture's personal settings through a lazy
  `PersonalSettingsService.getInstance()` (bound process instance, else an unbound one), where
  the design's file mapping names `getProcessInstance()`; same instance in the host.
- Null semantics: Team/Org GraphQL `avatarUrl: null` means "not sent" and `""` clears the
  personal avatar (as the Org editor already sends); agent `avatarUrl: null` clears (as today);
  a runtime/model that does not name both is not personal.
- The reviewer's notes: R-4 done (GLOSSARY); R-5 kept (Team `readBaseDefinition` keeps the
  application-owned branch); R-6 kept (the standalone validator's `PersonalSettingsService` has
  no publisher and is not bound; its read-only config has no `getAppDataDir`, which is safe
  because its store has no package roots and the default root `.validation-only/agents` never
  exists, so it never applies — fragile if that changes); R-7 visible and tested (an Org-owned
  agent's personal-only save succeeds; a save that changes other fields is still refused);
  R-1..R-3 as recorded in the design (no Org runtime/model editor; legacy packages stop; a
  removed tool a built-in needs breaks it until Reset).

## Known Risks

- A GitHub package with an unknown installed revision still shows **Update** in Settings →
  Agent Packages, and that update now always stops with the remedy text (design R-2). Recorded
  as FU-003.
- Capture downloads one archive per update (codeload, outside the API quota); the E2E fakes now
  serve the installed revision too.
- The editors refill their fields only when the loaded definition's values change (fix
  `2c4ba2c51e`): an announced change of another definition no longer discards unsaved edits; a
  real change of this definition still refills, as before.

### Changed existing tests (old behavior replaced by the approved one)

| Test | Change | Why |
| --- | --- | --- |
| `tests/integration/agent-team-definition/registered-package-team-update-graphql.integration.test.ts` | A package Team's runtime/model goes to `personal-settings.json`; `team-config.json` keeps the package's value | REQ-001/002 |
| `tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` ("legacy managed GitHub record with unknown revision") | The update stops with the remedy; the package is unchanged; status `UPDATE_FAILED` | REQ-006, Capture Failure Rules row 1 |
| `tests/e2e/update-notifications/update-notifications-live.e2e.test.ts`, `tests/e2e/agent-definitions/agent-package-definitions-live-refresh.e2e.test.ts` | Fake GitHub serves the installed revision's archive; request assertions include that download | DS-003 step 1 |
| `tests/unit/agent-packages/agent-package-service.test.ts`, `agent-package-github-update-state.test.ts`, `agent-package-skill-name-validation.test.ts` | A no-op capture (capture has its own tests) | Otherwise the real capture would download from GitHub |
| `tests/integration/agent-package-definitions/package-auto-refresh.integration.test.ts` | Feed composition input | API change |
| `components/notifications/__tests__/NotificationCenter.automation.spec.ts` | New confirmation text | REQ-007 |
| `stores/__tests__/agentOrgDefinitionCache.spec.ts`, `definitionMutationCache.spec.ts` | Fixtures carry the two new fields | The documents request them |

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature`
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision: `No Refactor Needed` (beyond the shared announce function)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the announce function is created once in the feed composition and set on the
  reloader and `PersonalSettingsService`; the feed composition now takes the host definition
  services (three of its inputs came from them; this also kept `build-studio-server.ts` under 500).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`
- Dead code found elsewhere, added to `follow-ups.md`: FU-002 (`TeamLocalAgentMemberDetails.vue` unused)
- Shared structures remain tight: `Yes` (`PersonalSettingsFields` is composed into the three web
  definition types; the server record type is one per contract)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes` — largest non-empty
  line counts: `build-studio-server.ts` 497 (was 500), `AgentTeamDefinitionForm.vue` 494,
  `AgentOrgExperience.vue` 491, `AgentDefinitionForm.vue` 487, `agent-definition-service.ts` 454.
  Changed-line deltas over 220: none (largest `agent-definition-service.ts`, about 150).
- Notes: the Org editor's personal pieces are a separate component (`AgentOrgPersonalSettings.vue`)
  to keep `AgentOrgExperience.vue` under 500.

## Persisted Data Transition Check

- Approved decision: `Not Affected` for existing data; new file and backups.
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence: a missing or unreadable file means base values (store tests); invalid
  entries are skipped and kept when the file is rewritten; no version field; atomic write.
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- After `pnpm install`, the web tests need `pnpm -C autobyteus-web exec nuxt prepare` (`.nuxt/tsconfig.json`).
- Server integration needs `pnpm -C autobyteus-server-ts test:integration:prepare` (the Brief
  Studio importable package); without it the `application-backend` integration files fail with
  `ENOENT … applications/brief-studio/dist/importable-package`.
- The untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` are build output of the typecheck's preparation; not committed.

## Checks Run

All rows ran on commit `2c4ba2c51e` (macOS 26.5.2 arm64, node v22.23.1, pnpm 10.28.2) unless the row says otherwise.
Logs: `tickets/in-progress/package-personal-settings/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `2c4ba2c51e` | as above | all server source and tests | — | Pass | `IMP-01-server-typecheck.log` | `[typecheck] production errors: 0; test-file errors: 1182 in 365 files (baseline 1182 in 365 files)` |
| IMP-02 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit --no-watch` | `2c4ba2c51e` | as above | all server unit tests | BEH-001..004 | Pass | `IMP-02-server-unit.log` | `Tests  7431 passed \| 7 skipped (7438)` |
| IMP-02b | Focused, verbose: `tests/unit/personal-settings`, `tests/unit/agent-packages`, `registered-package-team-update-graphql.integration.test.ts` | `2c4ba2c51e` | as above | contract cases (record, store, service), write forms per kind on package fixtures (agent/Team/Org, built-in, own agent, Org-owned R-7, reset, admission), capture and every Capture Failure Rules row, the update with capture | REQ-001..006; AC-001..005; MP-001/002; R-7 | Pass | `IMP-02b-server-personal-settings-focused.log` | `Tests  92 passed (92)`; e.g. `a malformed agent-config.json on disk: not captured …`, `an avatar-only save from the editor payload writes no file …` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:integration:prepare` (IMP-03a), then `exec vitest run tests/integration --no-watch` | `2c4ba2c51e` | as above | all server integration tests | BEH-002..004 | Pass | `IMP-03a-server-integration-prepare.log`, `IMP-03-server-integration.log` | `Tests  508 passed \| 69 skipped (577)` |
| IMP-04 | `vitest run` of the four E2E files that update packages: `agent-packages-graphql`, `agent-package-definitions-live-refresh`, `update-notifications-live`, `skill-name-catalog-graphql` | `2c4ba2c51e` | as above, test-owned servers and fake GitHub | GitHub update with capture; legacy record stops | BEH-001; REQ-006 | Pass | `IMP-04-server-e2e-affected.log` | `Tests  37 passed \| 2 skipped (39)` (the 2 are live-gated, as before) |
| IMP-05 | `pnpm -C autobyteus-web typecheck` | `2c4ba2c51e` | as above | web app, Electron main, cross-package tests | — | Pass | `IMP-05-web-typecheck.log` | `[typecheck] production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)` |
| IMP-06 | `pnpm -C autobyteus-web guard:web-boundary && guard:localization-boundary && audit:localization-literals` | `2c4ba2c51e` | as above | web boundaries, en/zh-CN catalogs | AC-008 (catalogs) | Pass | `IMP-06-web-guards.log` | `[audit:localization-literals] Passed with zero unresolved findings.` |
| IMP-07 | `pnpm -C autobyteus-web test:nuxt` | `2c4ba2c51e` | as above | all web specs, including the new form, Org component and store specs | UI (stage 1); REQ-007 | Pass | `IMP-07-web-tests-excerpt.log` (full log not committed, 2.4 MB) | `Tests  5475 passed (5475)` |
| IMP-08 | `pnpm -C autobyteus-web codegen:check` (builds the server, prints its schema, compares `generated/graphql.ts`) | `2c4ba2c51e` | as above | GraphQL contract ↔ web generated types | — | Pass | `IMP-08-web-codegen-check.log` | `autobyteus-web/generated/graphql.ts is current.` |
| IMP-09a | Rendered round 1, isolated desktop instance (see Frontend Rendered-Result Check) | working tree of `f9b3e27297` (UI equal to it) | packaged worktree build, test-owned data root and fixture package | the three editors, built-in agent, restart | AC-001, AC-005; MP-001/002 | Two defects found, fixed in `2c4ba2c51e`; other steps passed | `IMP-09a-rendered-round-1.log`, `IMP-09a-*.png` | `DEFECT 1`, `DEFECT 2`; `package git status: []` for the agent and Org saves |
| IMP-09b | Rendered round 2 on a new build: import, agent personal-only save, reset with an unsaved edit, Team avatar save and reset, Org avatar save and reset, built-in tool removal, restart, zh-CN | `2c4ba2c51e` | packaged worktree build, test-owned data root and fixture package | as IMP-09a, plus both fixes | AC-001, AC-005, AC-008 (editor texts); MP-001/002 | Pass | `IMP-09b-rendered-journey.log`, `IMP-09b-zh-CN-agent-tools.png` | step 2b `package git status: []`; step 3 `"descriptionAfter": "Designs software (unsaved edit)"`; step 4 `package git status: []`; step 9 both personal settings kept after restart; step 10 `个人` / `恢复为智能体包的设置` |

Baseline fix (not this ticket's change): `pages/__tests__/mobile-root-shell.spec.ts` "keeps generated pairing links …"
failed on this branch. Cause: autobyteus-433 (`ba3ba5b23e`) made the phone pairing page name a node only by the QR's name
("AutoByteus node"), never by its address, and did not update this spec, which still expected `desktop-private.local:29695`.
Fixed as its own commit `48f4443fe6` (TESTING.md rule 9); it passes in IMP-07.

- Not run, and why: the full server E2E suite (only the four files that exercise package updates; the rest is API/E2E's
  scope); live provider suites (not affected); a real GitHub package update with edited files (left to API/E2E — see
  Downstream Coverage Hints); Electron main-process tests and packaged harnesses (no Electron change).

## Frontend Rendered-Result Check

- Affected surfaces / journeys: agent editor (shared package agent; built-in Daily Assistant), Team editor, Org editor,
  Settings → Agent Packages (import), language switch to Simplified Chinese.
- Approved references: design-spec.md "UI (stage 1)" (note texts, "Personal" mark, reset link wording), requirements AC-001,
  AC-005, AC-008; the reviewer's MP-001/MP-002.
- Existing design system and adjacent surfaces reviewed: the forms' label rows and helper text, the load-issue badge
  (`components/definitions/`), the Org avatar editor; the mark uses the forms' indigo accent and the small pill style of
  existing badges; the note uses the forms' gray helper text.
- Surface used: TESTING.md "Isolated desktop instance" — `pnpm --silent isolated-app start --build` of this worktree with a
  test-owned data root and a test-owned fixture package (a git repository, so its `git status` shows any file write);
  driven with the browser-automation CLI attached to the instance's control port. Never the user's app or data.
- States and interactions inspected: note per kind and base (package agent, Team, Org, built-in); personal-only saves
  (agent tools, Team avatar, Org avatar, built-in tool removal) with the package files unchanged; the mark after a save;
  reset per kind; reset with an unsaved edit in another field and the following list reload; an instance restart (built-in
  and package personal settings kept); zh-CN note and mark. Desktop window size only.
- Issues found and corrected: two defects in round 1 (IMP-09a): a reset lost the user's unsaved edits after the announced
  list reload; a Team personal-only save rewrote `team.md`/`team-config.json` because the Team editor sends trimmed text.
  Both fixed in `2c4ba2c51e` with unit tests and re-checked on a new build (IMP-09b).
- Remaining unverified: the runtime/model mark and reset in the rendered app (the instance had no configured runtime and
  model to pick; covered by component specs); the Org's captured runtime/model line (needs a GitHub update with an edited
  `org-config.json`; covered by `AgentOrgPersonalSettings.spec.ts`); the automatic-update texts in the rendered panel (catalog
  and `NotificationCenter.automation.spec.ts`); narrow windows. The uploaded avatar's preview image does not load in the
  packaged window (initials shown) — the stored URL is as before, not a change of this ticket.

## Downstream Coverage Hints / Suggested Scenarios

- A real GitHub package update with edited package files (AC-003): import a GitHub package,
  edit an `agent-config.json` in the managed install (`<app-data>/agent-packages/github/<key>`),
  update, and check the record, the backup folder and the effective tools. The unit tests use a
  fake installer; the E2E suites use fake GitHub archives without edits.
- The automatic update pass with capture (AC-004 failure: make the installed revision's archive
  unavailable; the automatic update reports "failed" and nothing changes).
- A personal tool reaching a running agent (tool-list updates are told by the shared announce).
- The Team and Org launch forms seeding a personal runtime/model as the launch default.
- zh-CN rendering of the note, marks and REQ-007 texts.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The AC-002..AC-004 journeys against a real (or fake) GitHub update with edits on disk.
- AC-006/AC-007 (reads everywhere: run start, delegated copies, `list_available_agents`) at the server boundary.
- AC-008 texts in both languages in the rendered app.
