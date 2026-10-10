# API/E2E Coverage Investigation — skill-sources-dialog-redesign

All relative paths are in `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-sources-dialog-redesign/tickets/in-progress/skill-sources-dialog-redesign/` unless absolute.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-003, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001..SR-003)
- Design Spec (required on every route): `design-spec.md` (SR-003)
- Supplemental Task Artifacts:
  - Product `ui-ux-spec.md` and VIS-001..VIS-023 in `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/skill-sources-dialog-redesign/` (read-only). SR-003 overrides the chip icons.
  - `handoff-to-implementation.md`, `product-design-request.md`, `design-reference/00-current-user-screenshot.png`
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md`
- Implementation Revision Record: `implementation-revision-record.md` (IR-001, IR-002)
- Code Review Report: `code-review-report.md` (CRR-001: failure-origin review of F-001 → CR-001, `Local Fix`, implementation; no source review required)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- Current Investigation Round: 2
- Trigger: round 1 — Implementation Complete (IR-001); round 2 — Local Fix IR-002 for CR-001/F-001 (`implementation_engineer`, HEAD `a7d2fc85f`)
- Prior Investigation Reviewed: round 1 (this file, API-REV-001)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

The change is presentation-only. `SkillSourcesModal.vue` and `SkillSourceRow.vue` are rewritten, `utils/skills/skillSourceDisplay.ts` is new, and 44 localization entries are removed. The store, GraphQL and server are unchanged. Behaviour to prove:

- BEH-001 / REQ-001..003, AC-001/002: compact rows with display name, count labels, truncated location with `title` and copy, sr-only kind, Default first.
- BEH-002/003 / REQ-005, AC-004: one input; DC-017 URL → import, otherwise folder add, both through skill-name checks; trust hint; input kept on failure, cleared on success; Browse… only where the picker is eligible; it fills the input and never submits.
- BEH-004 / REQ-004, AC-003: trash button (not on Default, not on REMOVING) → confirmation; cancel makes no call; confirm unlinks or deletes.
- BEH-005 / REQ-007, AC-006: status lines; text-only Update and Retry removal chips (SR-003); Try again only on CHECK_FAILED; version details in the tooltip and the Update confirmation; automatic check on open.
- REQ-006, AC-005: only the list scrolls.
- BEH-006 / REQ-009: busy rules; alerts above the form.
- BEH-007 / REQ-008, AC-007, QR-001: focus into the dialog on open, Tab trapped, focus returned on close, labelled icon buttons, visible focus, Esc closes unless a confirmation is open.
- REQ-010: en/zh-CN strings exist; unused ones are removed.
- AC-008 (user verification in the desktop app) belongs to Delivery.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-003, SCN-004.
- Real-use scenarios added from investigating the implemented behaviour:
  - SCN-003-KB: a keyboard-only user removes a source (Tab to the trash → Enter → confirmation → Cancel or Remove), then keeps working in the popup with Tab or closes it with Esc. Trigger: keyboard on the trash button. REQ-008/QR-001 make keyboard operation a requirement.
  - SCN-002-KB: Enter in the add input submits, then the user continues with the keyboard.
  - SCN-002-DUP: adding a folder whose skill name already exists (conflict dialog over the popup; VIS-016).
  - SCN-001-SHORT: short window (1024×700) with many sources (VIS-023).
  - SCN-001-ZH: zh-CN locale (VIS-021).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 rows | Changed | REQ-001..003 | Component tests + browser J-01, J-02 |
| BEH-002/003 single input, Browse… | Changed | REQ-005, DC-017 | Component tests + browser J-03..J-06; desktop eligibility deferred |
| BEH-004 remove | Changed (presentation), Preserved (calls) | REQ-004 | Component tests + browser J-09 + probe WEB-005 |
| BEH-005 GitHub status/actions | Changed | REQ-007, SR-003 | Component tests + browser J-07, J-08 + probe WEB-002..005 |
| BEH-006 busy/alerts | Preserved (alerts moved) | REQ-009 | Component tests + J-04 alert position |
| BEH-007 close/focus | Added (focus management) | REQ-008 | Component tests + browser J-10, J-11, J-13 |
| Localization keys | Removed / Added | REQ-010 | Catalog tests, guard, audit, re-grep + J-12 |
| Store / GraphQL / server | Preserved | Scope guardrail | Server skill suites + probe |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | Server skill suites (unchanged code) | None | None |
| API / transport / contract | No | Same store → GraphQL calls | Store tests; probe | None | Probe (real GraphQL) |
| Frontend component / state | Yes | Modal and row rendering, operation selection, busy, focus | 72 new/rewritten component tests (jsdom) | jsdom focus/inert/Tab semantics are not a real browser's | Browser |
| Browser integration / user journey | Yes | Rendered popup with real store/GraphQL/filesystem | GitHub probe (selectors updated) | Keyboard journeys, scroll layout, conflict layering, locale | Browser (temporary journey) |
| Authentication / session / permissions | No | — | — | — | None |
| Desktop renderer / web-equivalent UI | Yes | Same renderer as the browser | Browser journey | — | Browser dev path |
| Desktop shell / Electron-specific integration | Partly | Browse… gating reads `window.electronAPI.showFolderDialog` (existing IPC, unchanged) | Gate and native-folder unit tests; modal tests with a mocked `pickFolderPath` | Real preload exposes the function, so Browse… appears in Electron | Isolated desktop instance (deferred to the next round) |
| Process / lifecycle | No | — | Probe restart cases | None | None |
| Persisted-data transition | No | `Not Affected` | — | — | None |
| Worker / queue / distributed coordination | No | — | — | — | None |
| External integration | No | GitHub calls unchanged | Probe with controlled upstream | Public GitHub transport (out of scope) | None |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-sources-dialog-redesign`, branch `codex/skill-sources-dialog-redesign`, base `3fb98d230` (IR-001)
- Project type and runtime stack: pnpm monorepo; Nuxt 3 / Vue 3 renderer (`autobyteus-web`), Electron shell, Node/TypeScript GraphQL server (`autobyteus-server-ts`), Vitest
- Project testing guideline path(s): `TESTING.md` (worktree root). There is no closer `TESTING*.md` under `autobyteus-web`.
- Conflicting, missing, or unclear project instructions:
  - `autobyteus-web` has no `typecheck`/`lint` script (recorded by Implementation; not a project-defined check).
  - TESTING.md "GitHub Skill Sources Regression" lists `tests/e2e/skills` server suites, which failed on the base because of harness drift. This was fixed as a baseline fix (TESTING.md rule 9).
- Required environment variables or secrets available: `N/A` (no provider secrets needed)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` §Test layers | Layer map | Web unit/component `pnpm -C autobyteus-web test:nuxt`; browser dev-path probes; isolated desktop instances for shell behaviour |
| `TESTING.md` §GitHub Skill Sources Regression | Feature regression | server prebuild/build → server skill suites → web skills tests → `node autobyteus-web/tests/e2e/github-skill-sources-probe.mjs <fresh dir>` |
| `TESTING.md` §Choosing the path | Surface choice | Renderer UI → web unit + browser dev-path probe; desktop-shell → isolated desktop instance |
| `TESTING.md` §Rules 2, 5, 6, 7, 9 | Safety/evidence | Never use the user's app or data; stop what you start; assertions first; OS dialogs answered by a human/computer-use; fix baseline failures |
| `TESTING.md` §Native workspace folder picker regression | Shared picker evidence | The native picker needs `--native-assisted` with an OS-level tool; never mock the bridge for native proof |
| `docs/isolated-app-instances.md` | Desktop instance | `pnpm --silent isolated-app start --build`; native OS dialogs cannot be driven by the helper |
| `AGENTS.md`, `autobyteus-web/AGENTS.md` | Repo rules | Read DESIGN/TESTING; package instructions |
| `implementation-evidence/render-check-stack.mjs` | Disposable real stack | Built backend + controlled GitHub + worktree Nuxt; seeds local and GitHub sources; cleans on SIGTERM |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Built backend | `autobyteus-server-ts` | `pnpm prebuild && pnpm build`, then started by the probe or stack (`dist/app.js` with the `github-skill-upstream.mjs` preload) | Free port, disposable SQLite/data/HOME in `$TMPDIR` | `/rest/health` | SIGTERM to its process group; data dir removed |
| Nuxt dev frontend | `autobyteus-web` | Started by the probe or stack (`nuxt dev`, free port) | Serialized: one dev server per worktree at a time | `GET /skills` 200 | SIGTERM to its process group |
| Headless Chrome | — | playwright-core `chromium.launch` with system Chrome | Fresh profile | — | `browser.close()` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Local folder sources (0/1/n skills, `.codex/skills`, 12 extra) | Render stack seeds through the `addSkillSource` GraphQL mutation | Private `$TMPDIR` dirs only | Removed by the stack on SIGTERM |
| GitHub source `api-e2e/skills` with controllable revision/failure | `tests/e2e/fixtures/github-skill-upstream.mjs` control file | Only outbound GitHub emulated | Removed with the stack dir |
| Journey scratch folders (add / duplicate / keyboard add) | Created by the journey under `$TMPDIR/skill-sources-journey-*` | Private | Removed in `finally` |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/skills/SkillSourcesModal.spec.ts` (34) | Open/list, remove, add/URL routing/Browse…, GitHub maintenance, close/focus/Esc | AC-003/004/006/007 | Still Valid | Assertions match approved behaviour; 142/142 pass | Keep. Gap: no assertion that focus stays in the panel after a confirmation closes or after an operation ends (see Ambiguities) |
| `autobyteus-web/components/skills/SkillSourceRow.spec.ts` (27) | Row content, counts, status line, text-only chips, copy | AC-001/002/006, SR-003 | Still Valid | Pass | Keep |
| `autobyteus-web/utils/skills/__tests__/skillSourceDisplay.spec.ts` (11) | Display-name rule | REQ-002 | Still Valid | Pass | Keep |
| `autobyteus-web/components/skills/SkillsList.spec.ts` | Opener toggles the modal | BEH-007 | Still Valid | Pass | Keep |
| `autobyteus-web/components/common/__tests__/ToastContainer.spec.ts` | Layering scan includes `SkillSourcesModal.vue` | Layering | Still Valid | 2/2 pass | Keep |
| `autobyteus-web/stores/__tests__/skillSourcesStore.spec.ts`, `skillStore.spec.ts` | Store contract | REQ-009 (unchanged contract) | Still Valid | Pass | Keep |
| `autobyteus-web/localization/**` tests, `guard:localization-boundary`, `audit:localization-literals` | Catalog parity/literals | REQ-010 | Still Valid | Pass | Keep |
| `autobyteus-web/tests/e2e/github-skill-sources-probe.mjs` | GitHub source lifecycle through the real UI | BEH-002/004/005, REQ-009 | Still Valid (selectors updated by Implementation) | 8/8 on rerun | Keep |
| `autobyteus-server-ts/tests/e2e/skills/github-skill-runtime-harness.ts` (used by `github-skill-sources-graphql.e2e.test.ts`) | 24-combination adapter matrix after real GraphQL update | Server (unchanged) | Needs Update (baseline drift from `028cca231`) | 24/24 failed on the base with `undefined.assertAccepting/ownSkill/skills` and `beginAcquire is not a function` | Updated as a baseline fix (own commit `812a75c0a`) |

## Durable Coverage To Add

None in this round. The missing focus-after-confirmation assertion belongs with the implementation fix (`Local Fix`). See Ambiguities.

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| BASE-001 | `autobyteus-server-ts/tests/e2e/skills/github-skill-runtime-harness.ts` | Pass a `ProviderPreparationGuard` to the Codex/Claude `bootstrapForCreate`; prepare Grok via `beginPreparation({kind:'new'}).prepare()`; supply the controlled Codex `skills/list` client through a `beginAcquire` lease | TESTING.md rule 9; the APIs changed in `028cca231` | Assertions unchanged; commit `812a75c0a` |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-web test:nuxt components/skills utils/skills stores/__tests__/skillStore.spec.ts stores/__tests__/skillSourcesStore.spec.ts localization --run` | worktree root | Component/store/catalog behaviour | Pass (25 files, 142 tests) | `api-e2e-evidence/logs/web-skills-tests.log` |
| 2 | `pnpm -C autobyteus-web test:nuxt components/common/__tests__/ToastContainer.spec.ts --run` | worktree root | Layering scan that names the modal | Pass (2) | `api-e2e-evidence/logs/web-toast-layer.log` |
| 3 | `pnpm -C autobyteus-web guard:localization-boundary`; `pnpm -C autobyteus-web audit:localization-literals` | worktree root | REQ-010 guards | Pass / Pass | `api-e2e-evidence/logs/guard-localization.log`, `audit-literals.log` |
| 4 | Re-grep of the 22 removed keys (×2 locales) outside `localization/` | worktree root | No dangling references; `status.REMOVING` not used for text | Pass (0 references; 2 prefix-only matches on `checkNamed`/`checked`/`imported`) | this file |
| 5 | `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build` | worktree root | Current server build for the probe | Pass | `api-e2e-evidence/logs/server-build.log` |
| 6 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/skills tests/integration/skills tests/unit/skills --no-watch` | worktree root | Unchanged server feature (TESTING.md regression) | Fail on the base (24 harness-drift failures) → Pass after BASE-001 (16 files, 220 tests) | `api-e2e-evidence/logs/server-skills-tests.log` (final run) |
| 7 | `node autobyteus-web/tests/e2e/github-skill-sources-probe.mjs <fresh dir>` | worktree root | Real UI → GraphQL → filesystem GitHub lifecycle with the new markup | Attempt 1: WEB-001 Pass, WEB-CHAT-A Fail (chat runtime submenu did not open; unchanged chat picker). Attempt 2: 8/8 Pass | `api-e2e-evidence/github-skill-sources-probe-attempt1/`, `api-e2e-evidence/github-skill-sources-probe/` |

## Test-Case Ledger Decision

- Ledger required: `Yes`. The run has multiple independent browser cases (J-01..J-13) plus 8 probe cases.
- Canonical ledger path: `api-e2e-test-case-ledger.md`. Each case was written to its run's `result.json` immediately after it executed; the ledger mirrors those records (see its re-entry note).

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | Component tests assert AC-001..004/006/007 outcomes | AC-005 is visual; jsdom focus semantics | Browser journey |
| Changed-boundary execution directness | 85% | Real component code under jsdom; probe drives the real UI for GitHub flows | Folder add, keyboard and layout untested in a real browser | Browser journey |
| Cross-boundary integration realism and mock gap | 85% | Probe: real GraphQL/store/filesystem | Component tests mock stores | Browser journey on the real stack |
| Environment, configuration, identity, and fixture fidelity | 90% | Disposable backend, controlled GitHub only | Electron not exercised | Isolated desktop instance |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Probe: failed update/retry, permission-denied removal/restart; component error paths | Duplicate conflict, import error message in a real browser | Browser journey |
| User-surface, browser, and desktop-shell confidence | 70% | Probe screenshots; implementation render check | Keyboard/focus, scroll, zh-CN, Electron Browse… | Browser journey + desktop instance |
| Durable regression coverage quality and relevance | 90% | 72 focused tests that assert outcomes; mutation-checked by Implementation | Focus after confirmation not asserted | — |

- Overall post-repository confidence: 85% (simple average)
- Every critical acceptance criterion directly proven: `No` (AC-005, AC-007 keyboard behaviour in a real browser)
- Any applicable category below `90%`: `Yes`. Below 90%: AC proof, directness, integration realism and user surface.
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: real-browser keyboard/focus/inert behaviour; layout/scroll; Electron Browse… eligibility.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser` (temporary assertion-driven Playwright journey against the real render stack). `Project Desktop Validation` for Browse… eligibility is deferred to the next round.
- Specific confidence gap addressed: real-browser focus/Tab/Esc/inert, list-only scroll at 1024×700, narrow layout, folder add success/error, duplicate-name conflict layering, URL detection and import error, Update chip text-only plus confirmation, Check failed → Try again, local remove cancel/confirm, copy to clipboard, zh-CN.
- Why the selected mode can materially improve confidence: it uses the real browser, real store, real GraphQL and the real filesystem, the same renderer as the desktop app (TESTING.md: renderer UI → browser dev-path).
- Expected confidence after the selected validation: ≥95% if no defect is found.
- Browser-specific decision and rationale: required. jsdom does not implement `inert`, sequential focus navigation or layout.
- If `Blocked`: N/A.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron (`autobyteus-web/electron`), packaged via `build:electron:mac`
- Testing guideline used: `TESTING.md` §Choosing the path, §Rules; `docs/isolated-app-instances.md`
- Web-equivalent behaviour: everything except Browse… eligibility. Proven through the browser dev path.
- Shell-specific behaviour:
  - Browse… appears only when the real preload exposes `showFolderDialog` and the window is not embedded.
  - The native picker fills the input.
  - `pickFolderPath`/IPC is shared and unchanged; the native workspace folder picker regression covers it.
- Chosen approach: an isolated desktop instance from a worktree build (`pnpm --silent isolated-app start --build`), to assert that Browse… is present in the real Electron renderer. Answering the native OS picker needs a human or an OS-level computer-use tool, which this agent does not have (TESTING.md rule 7). That step stays `Not Tested` and is covered by AC-008 (Delivery user verification).
- Deferred to the next round: round 1 ends in `Fail` and the fix needs a fresh build, so the build is done once, on the fixed tree.
- Effect on any already-running desktop application: None. An unrelated isolated instance `iso-63369-6c20` (another worktree) was observed and left untouched.
- Behavior not directly proven and confidence consequence: Electron Browse… eligibility and the native picker fill (−5% user surface until the next round).

## Live Environment And Fixture Plan

- Startup order and commands:
  1. Server build (repository step 5).
  2. `node tickets/in-progress/skill-sources-dialog-redesign/api-e2e-evidence/skill-sources-dialog-journey.mjs <fresh dir>` spawns `implementation-evidence/render-check-stack.mjs 12`: migrate → backend with the GitHub fixture preload → seed sources → Nuxt dev.
- Environment choices: free ports; disposable `$TMPDIR` data/HOME/CODEX_HOME; system Chrome headless; viewports 1280×800, 1024×700, 390×844; locale en, then zh-CN via `autobyteus.localization.preference-mode`.
- Health / readiness checks: backend `/rest/health`; frontend `GET /skills` 200; stack prints its JSON line.
- Seed data / fixtures:
  - local sources `team/skills-library` (3), `empty-folder` (0), `one-skill` (1), `user/.codex/skills` (2), plus 12 extras;
  - GitHub `api-e2e/skills` at revision `a…`;
  - scratch folders created by the journey.
- Test identities, authentication, permissions: none. Chrome is granted clipboard read/write for the frontend origin.
- Requirement-linked journeys: J-01..J-13 (see the ledger).
- Evidence: DOM/ARIA assertions, GraphQL readback, `document.activeElement` traces, computed focus styles, element geometry, clipboard readback, screenshots, `result.json`.
- Owned processes and temporary state to clean up: the stack (backend and Nuxt process groups, data dir), Chrome, journey scratch dirs.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| J-01..J-13 | `api-e2e-evidence/skill-sources-dialog-journey.mjs` on the render stack | See the ledger | It depends on the implementation-owned render stack in the ticket folder. The durable equivalents are the component specs and the existing GitHub probe. The keyboard-focus defect should become a durable component assertion with the fix. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Browse… present in a real Electron renderer | Deferred to the round after the fix (one build) | Low (gating unit-tested; same helper as the workspace picker) | Next round: isolated desktop instance |
| Native OS picker fills the input and does not submit | No OS-level computer-use tool available; TESTING.md rule 7 | Low (IPC path shared and unchanged; fill/no-submit unit-tested with the mocked `pickFolderPath`) | AC-008 user verification (Delivery) |
| Visual pixel comparison to VIS-001..023 | Product owns the visuals; the implementation render check plus my screenshots are supporting only | Low | AC-008 |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| F-001: after a confirmation closes (Cancel or confirm), focus is on `<body>`. The next Tab leaves the popup (it lands on the sidebar **Chat** button behind it), and Esc does not close the popup, because `handleKeydown` is bound to the panel element. The same focus loss happens when a focused control becomes disabled during an operation (Enter-to-add). Violates REQ-008 ("Tab is trapped"), UI spec §Accessibility ("Tab and Shift+Tab cycle inside the panel") and AC-007 ("Esc closes when no confirmation is open"). Not a regression against the base, which had no focus management; the approved new behaviour is incomplete. | `Local Fix` | J-10 and J-13 observations in `api-e2e-evidence/dialog-journey/result.json`; `J-10-keyboard-focus-trap-esc.png`, `J-13-keyboard-focus-after-operations.png` | `implementation_engineer` |
| O-001 (observation, not a finding): `ConfirmationModal` (shared, out of scope, unchanged) does not move focus into itself or handle Esc. Tab from body reaches its Cancel first. | — | J-10 `focusInConfirmation=BODY`, `tabsToReachConfirmation=[Cancel]` | None (scope guardrail: no `ConfirmationModal` redesign) |
| O-002: GitHub probe WEB-CHAT-A failed once (chat runtime submenu not opened after clicking **Codex App Server**) and passed on the immediate rerun. Unchanged chat surface. | Probe flake (not this change) | `github-skill-sources-probe-attempt1/WEB-CHAT-A-failure.png` | Recorded only |

## Round 2 Update (IR-002)

- Prior failure rechecked first: F-001 with J-10/J-13 (trap asserted) → resolved (see the report).
- Coverage decisions revised:
  - `SkillSourcesModal.spec.ts` now has 41 tests, 7 of them new focus-lifecycle tests added by Implementation with the fix. The durable gap noted in round 1 is closed: `Still Valid`.
  - The journey gains J-14, covering the fix's own edge paths: Esc on the conflict dialog, a stray Tab or Shift+Tab, focus after keyboard Try again and after a keyboard Update, and Esc after close.
- Desktop D-01 executed in an isolated instance built from this worktree (`iso-52227-7ac9`, stopped). The native picker answer remains `Not Tested` (no OS-level tool; AC-008).
- Round-2 repository runs: web 151/151 (26 files), guard/audit pass, server skill suites 220/220, GitHub probe 8/8 on the first attempt. Logs are in `api-e2e-evidence/round2/logs/`.
- Durable coverage changed by API/E2E in round 2: none.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (executed)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`. Updated BASE-001 (baseline fix).
- Post-repository confidence: 85%
- Broader validation decision: `Required` (Browser executed; Desktop deferred)
- Reroute Required: round 1 `Yes` (F-001 → CRR-001 → IR-002); round 2 `No`
- Recommended Owner If Reroute Required: N/A in round 2
- Notes: the latest result (round 2, `Pass`) and its scores are in `api-e2e-execution-coverage-report.md`.
