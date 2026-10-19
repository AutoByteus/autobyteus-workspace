# API/E2E Execution Coverage Report — skill-sources-dialog-redesign

All relative paths are in `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-sources-dialog-redesign/tickets/in-progress/skill-sources-dialog-redesign/` unless absolute. Evidence paths are relative to `api-e2e-evidence/`. Round-1 evidence stays in `api-e2e-evidence/` (top level); round-2 evidence is in `api-e2e-evidence/round2/`.

## Execution Round Meta

- Requirements Doc: `requirements-doc.md` (SR-003, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-003)
- Supplemental Task Artifacts: Product `ui-ux-spec.md` and VIS-001..023 (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/skill-sources-dialog-redesign/`); `handoff-to-implementation.md`; `product-design-request.md`; `design-reference/`
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-002, Rework)
- Implementation Revision Record: `implementation-revision-record.md` (IR-001, IR-002)
- Code Review Report: `code-review-report.md` (CRR-001: failure-origin review only)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: 2
- Trigger: Local Fix IR-002 (CR-001 = F-001), HEAD `a7d2fc85f`
- Prior Round Reviewed: round 1 (API-REV-001, `Fail`, 83%)
- Latest Authoritative Round: 2

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md` (§Round 2 Update)
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. F-001 was rechecked first (J-10/J-13), then the full journey, the repository checks, the probe and D-01.
- Existing coverage decisions revised during execution: `SkillSourcesModal.spec.ts` is now `Still Valid` with no gap, because 7 focus-lifecycle tests came with the fix. J-14 was added for the fix's own edge paths.
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: round 1 `No` (built from immediate per-case `result.json` records); round 2 `Yes` (planned cases present before execution)
- Every completed case recorded immediately: `Yes` (each case writes `result.json` right after it runs)
- Long-running case checkpoints recorded when needed: `N/A`
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: 24
- Cases still running, interrupted, or not started: none
- Rerun note: round-2 cases reuse round-1 IDs; J-14 is new.

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| WEB-001..005, WEB-CHAT-A/B, WEB-INTERRUPT | Pass (8/8, first attempt) | 23 | `round2/github-skill-sources-probe/result.json` | — |
| J-01..J-09, J-11, J-12 | Pass | 22 | `round2/dialog-journey/result.json` | Unchanged from round 1 |
| J-10, J-13 | Pass | 22 | `round2/dialog-journey/result.json` (`trace`) | F-001 resolved |
| J-14 | Pass | 22 | same | New in round 2 |
| D-01a/b/c | Pass | 24 | `round2/desktop-check/result.json` | — |
| Native OS picker answer | Not Tested | — | — | AC-008 (Delivery user verification) |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behaviour observed in implementation: `No`. The old Local/GitHub mode switch, kind badge, metadata list and always-visible Check again are gone. The 22 removed keys (×2 locales) have 0 references.
- Approved persisted-data transition followed: `N/A` (`Not Affected`)
- Durable coverage added or retained only for compatibility-only behaviour: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| UNIT-WEB | AC-001..004/006/007, REQ-010 | Components, helper, catalogs, focus lifecycle | Vitest/jsdom (151 tests, 26 files), guard, audit | Durable | Pass | `round2/logs/web-skills-tests.log`, `guard-localization.log`, `audit-literals.log` |
| SRV-SKILLS | REQ-009 (unchanged store/server) | Server skill feature | Vitest (220) | Durable | Pass | `round2/logs/server-skills-tests.log` |
| WEB-001..005 etc. | AC-003/004/006, REQ-009 | New markup → real GraphQL/filesystem GitHub lifecycle | GitHub probe, headless Chrome | Durable, Browser | Pass 8/8 | `round2/github-skill-sources-probe/` |
| J-01 | AC-001/002/006/007, REQ-007, VIS-022 | Rows, auto-check, focus on open, no Browse… in the browser | Journey, real stack | Temporary, Browser | Pass | `round2/dialog-journey/` |
| J-02 | AC-005, VIS-019/020/023 | List-only scroll at 1024×700 (17 sources); 390×844 | Journey | Temporary, Browser | Pass | same |
| J-03..J-06 | AC-004, BEH-006, VIS-016, DC-017 | Add success/error, conflict, URL detection, import error | Journey | Temporary, Browser | Pass | same |
| J-07/J-08 | AC-006, SR-003 | Text-only Update chip, version line; Check failed → Try again | Journey | Temporary, Browser | Pass | same |
| J-09 | AC-003 | Local remove cancel/confirm | Journey | Temporary, Browser | Pass | same |
| J-10 | AC-007, REQ-008, VIS-017 | Tab cycle, ring, Esc while confirming, focus after Cancel, Esc, focus return | Journey (keyboard) | Temporary, Browser | Pass | same (`trace`) |
| J-11/J-12 | REQ-008, TR-011, REQ-010, VIS-021 | Close paths, copy; zh-CN | Journey | Temporary, Browser | Pass | same |
| J-13 | AC-007, REQ-008 | Focus after Enter-add and a keyboard remove | Journey (keyboard) | Temporary, Browser | Pass | same (`trace`) |
| J-14 | AC-007, REQ-008 | Conflict Esc, stray Tab, focus after Try again / Update, Esc after close | Journey (keyboard) | Temporary, Browser | Pass | same (`trace`) |
| D-01a/b/c | AC-004, AC-007, DEC-002 | Browse… with the real preload; keyboard add/remove in Electron; Browse… → native dialog, no submit | Isolated desktop instance (worktree build) | Temporary, Desktop | Pass | `round2/desktop-check/` |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| R2-1 | `pnpm -C autobyteus-web test:nuxt components/skills components/common/__tests__/ToastContainer.spec.ts utils/skills stores/__tests__/skillStore.spec.ts stores/__tests__/skillSourcesStore.spec.ts localization --run` | worktree root, HEAD `a7d2fc85f` | Components, including 7 focus-lifecycle tests; stores; catalogs | Pass (26 files, 151 tests) | `round2/logs/web-skills-tests.log` |
| R2-2 | `pnpm -C autobyteus-web guard:localization-boundary`; `audit:localization-literals` | worktree root | REQ-010 | Pass / Pass | `round2/logs/` |
| R2-3 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/skills tests/integration/skills tests/unit/skills --no-watch` | worktree root (server source unchanged since round 1) | Server skill feature | Pass (220) | `round2/logs/server-skills-tests.log` |
| R2-4 | `node autobyteus-web/tests/e2e/github-skill-sources-probe.mjs tickets/…/api-e2e-evidence/round2/github-skill-sources-probe` | worktree root (server dist built in round 1; server source unchanged) | Durable GitHub lifecycle through the popup | Pass 8/8 | `round2/github-skill-sources-probe/` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository (round 2) | Final | Change vs round 1 final | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 95% | +45 | AC-001..AC-007 each directly proven in a real browser on the real stack, and AC-004/007 also in the real Electron build. F-001 is resolved in 3 independent environments (jsdom tests, Chrome journey, Electron) | AC-008 belongs to Delivery |
| Changed-boundary execution directness | 90% | 95% | 0 | Every changed behaviour was exercised through real stores, GraphQL and the filesystem; Browse… through the real preload/IPC | — |
| Cross-boundary integration realism and mock gap | 90% | 95% | 0 | Only outbound GitHub is emulated; GraphQL readbacks; Electron embedded backend | Public GitHub transport out of scope |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | +5 | Packaged worktree Electron build in an isolated instance, plus disposable dev stacks | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | 0 | Errors, conflict, check failure/recovery, update, cancel paths, the fix's edge paths (J-14), probe restart/interrupt cases | — |
| User-surface, browser, and desktop-shell confidence | 85% | 95% | +25 | Keyboard trap/Esc/focus-return in Chrome and Electron; layout/scroll/narrow; zh-CN; focus ring; Browse… presence and IPC invocation in Electron | Native OS picker answer (fill) not driven, since there is no OS-level tool. Negligible: the modal's fill/no-submit logic is unit-tested, the IPC is proven pending in Electron, and the shared `pickFolderPath` has its own native-assisted regression |
| Durable regression coverage quality and relevance | 95% | 95% | +10 | 41 modal tests (7 focus-lifecycle, mutation-checked by Implementation), 27 row tests, 11 helper tests, the durable GitHub probe, server harness fixed | — |

- Overall post-repository confidence: 91%
- Overall final confidence: 95% (simple average of 7 categories)
- Calculation method: simple average; no category below 95%
- Confidence change produced by broader validation: +4 overall; user surface +10 (Electron D-01 and real-browser keyboard proof)
- Every critical acceptance criterion directly proven: `Yes` (AC-001..AC-007; AC-008 is the user's verification, owned by Delivery)
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: none material. The native OS picker answer is left to the user (AC-008).

## Broader Validation Decision And Execution

- Decision and selected execution mode: `Required`. Browser (temporary Playwright journey on the real render stack) plus the durable GitHub probe, plus Project Desktop Validation (D-01, isolated instance of the worktree build).
- Material deviation: none in round 2. D-01, deferred in round 1, ran here.
- Confidence gap or residual risk addressed: F-001 recheck; edge paths of the fix; Electron Browse… eligibility and IPC.
- Startup order, commands, readiness:
  1. Journey: `node tickets/…/api-e2e-evidence/skill-sources-dialog-journey.mjs tickets/…/api-e2e-evidence/round2/dialog-journey`, which spawns `implementation-evidence/render-check-stack.mjs 12` (health, `/skills` 200).
  2. Probe (R2-4).
  3. `pnpm --silent isolated-app start --build` → instance `iso-52227-7ac9`, controlPort 52227, serverPort 52228, own data root (`round2/logs/isolated-start.json`; build log `round2/logs/isolated-build.log`).
  4. `node tickets/…/api-e2e-evidence/desktop-browse-check.mjs http://127.0.0.1:52227 tickets/…/api-e2e-evidence/round2/desktop-check`.
  5. `pnpm --silent isolated-app stop iso-52227-7ac9`.
- Environment choices:
  - free ports and disposable data;
  - headless system Chrome at 1280×800, 1024×700 and 390×844, locale en then zh-CN;
  - the Electron instance runs from `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` (built from HEAD `a7d2fc85f`);
  - the instance is attached over CDP; the user's app was not touched.
- Seed data: the render stack seeds 4 local sources, 12 extra local sources and the GitHub `api-e2e/skills` source through GraphQL. Journey and desktop scratch folders live under `$TMPDIR`.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| F-001 recheck: keyboard Cancel of a remove confirmation, then Tab, then Esc | Focus inside; Tab trapped; Esc closes | Focus = "Remove one-skill" (trigger); Tab → "Copy path"; Esc closed; focus → Sources | J-10 `trace` | Pass |
| F-001 recheck: Enter-add; keyboard remove confirmed | Focus stays in the panel | Focus = add input both times; Tab → Done (inside); Esc closed | J-13 `trace` | Pass |
| Conflict via keyboard, then Esc | Only the conflict closes; focus back in the panel; input kept | Focus on the conflict OK button; after Esc the popup is open, focus = input, value kept | J-14 | Pass |
| Stray focus on body: Shift+Tab / Tab | Last / first control | Done / Close | J-14 | Pass |
| Keyboard Try again (button disappears) / keyboard Update confirmed (chip disappears) | Focus stays in the panel | Input / input; Tab → Done; Esc closed; focus → Sources; a later Esc on the page is harmless (`/skills`) | J-14 | Pass |
| All round-1 journey steps (rows, scroll, add/error/conflict/import, update, check failed, remove, close, copy, zh-CN) | As in round 1 | Identical outcomes | J-01..J-09, J-11, J-12 | Pass |
| Electron: open Sources by keyboard | Focus on the panel; Browse… shown | `showFolderDialog` is a function; focus on the panel; order input / Browse… / Add | D-01a | Pass |
| Electron: keyboard add, then remove | `1 skill`; focus kept; Esc closes; focus → Sources | As expected; folder kept on disk | D-01b | Pass |
| Electron: Browse… with `keep-me` typed | Native dialog requested; input unchanged; nothing submitted | Browse… disabled (picking pending on the real IPC) after 1.5 s; value `keep-me`; rows 1 → 1; no alerts. The native sheet was closed by stopping the instance | D-01c | Pass |

## Desktop Application Validation

- Validation approach executed: an isolated desktop instance of the worktree build (TESTING.md §Choosing the path), driven over CDP with assertions.
- Web-equivalent behaviour: the full journey on the browser dev path (above).
- Shell-specific behaviour and evidence:
  - The real preload exposes `showFolderDialog`, so Browse… is eligible in the embedded window.
  - Clicking Browse… puts the modal in its pending picking state until the native dialog resolves. This proves `pickFolderPath` → `window.electronAPI.showFolderDialog` → main `show-folder-dialog` was awaited, with no submit.
  - Call counting via a wrapper was not possible, because `contextBridge` freezes `electronAPI` (`bridgeWrapped: false`). The pending state is the evidence.
- Effect on any already-running desktop application: None. The unrelated instance `iso-63369-6c20` (another worktree) and the user's app were untouched. My instance appeared on screen with a native sheet for a few seconds, then was stopped.
- Behaviour not directly proven: the native picker returning a chosen path into the input (needs a human or an OS-level computer-use tool, per TESTING.md rule 7). The modal's fill-and-focus logic is unit-tested with `pickFolderPath` mocked. Covered by AC-008.

## Platform / Runtime Targets

- Operating system / platform: macOS (Darwin 25.5.0, arm64)
- Runtime and relevant framework versions: workspace toolchain; Nuxt 3; Electron (packaged `AutoByteus.app` 1.4.99 build of this worktree); Vitest; playwright-core
- Browser / engine: system Google Chrome (headless) and the Electron renderer
- Device, viewport, locale: 1280×800, 1024×700, 390×844; en and zh-CN; the Electron default window

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data exercised: sources created before opening the popup (browser and Electron)
- Result: rendered and operated through the normal current reader
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: None

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed by API/E2E: round 1 `Yes`; round 2 `No`

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/skills/github-skill-runtime-harness.ts` | Updated (round 1 baseline fix, commit `812a75c0a`) | TESTING.md rule 9; harness aligned with `028cca231` (`ProviderPreparationGuard`, `beginPreparation().prepare()`, Codex `beginAcquire` lease). Assertions unchanged | 220/220 (rounds 1 and 2) |

Durable coverage changed by Implementation, for reference: `SkillSourcesModal.spec.ts` (IR-001 rewrite; IR-002 added 7 focus-lifecycle tests), `SkillSourceRow.spec.ts`, `utils/skills/__tests__/skillSourceDisplay.spec.ts`, and the selectors of `autobyteus-web/tests/e2e/github-skill-sources-probe.mjs`.

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route)
- Diff or repository evidence supplied for removed paths: N/A

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `round2/logs/*` | Round-2 command logs, isolated start/stop receipts, build log | Retained | — |
| `round2/dialog-journey/` | Round-2 journey (J-01..J-14) | Retained | `result.json` with traces and screenshots |
| `round2/github-skill-sources-probe/` | Round-2 probe 8/8 | Retained | — |
| `round2/desktop-check/` | D-01 results and screenshots | Retained | — |
| `dialog-journey/`, `dialog-journey-observation-run/`, `dialog-journey-attempt1/`, `github-skill-sources-probe*/`, `logs/` | Round-1 evidence (F-001, probe flake O-002) | Retained | History |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `api-e2e-evidence/skill-sources-dialog-journey.mjs` | Real-browser proof that jsdom cannot give: focus, inert, layout, clipboard, locale | 14/14 Pass | Runtime state removed (`ownedRemoved`, `scratchRemoved` true) |
| `api-e2e-evidence/desktop-browse-check.mjs` | Electron-shell proof of Browse… and keyboard focus | 3/3 Pass | Scratch removed; instance stopped |
| `implementation-evidence/render-check-stack.mjs` (reused) | Disposable real stack | Started and stopped by the journey | "cleaned …" receipt |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Outbound GitHub for `api-e2e/skills` | `github-skill-upstream.mjs` preload with a control file | Deterministic revisions and failures | Public GitHub transport not proven (out of scope; unchanged) |
| Codex CLI (probe chat cases) | `skill-codex-app-server.mjs` fixture | No paid inference | Not relevant to this change |
| Native OS folder picker answer | Not answered (sheet closed by stopping the instance) | No OS-level tool (TESTING.md rule 7) | Fill from a real chosen folder is left to AC-008 |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | UNIT-WEB, SRV-SKILLS, WEB-001..005/CHAT-A/CHAT-B/INTERRUPT, J-01..J-14, D-01a/b/c | All approved behaviour proven; F-001 resolved |
| Not Tested | Native picker answer | Requires a human or OS-level tool; AC-008 |
| Out Of Scope | O-001 (`ConfirmationModal` focus/Esc), O-002 (chat picker flake, not reproduced in round 2) | Unchanged shared surfaces |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Round-2 journey stack (backend, Nuxt, data) and Chrome | Journey-owned | SIGTERM → stack cleanup; `browser.close()` | "cleaned …"; `ownedRemoved`, `scratchRemoved` true |
| Round-2 probe (backend, frontend, Chrome, data) | Probe-owned | Probe cleanup | All cleanup flags true |
| Isolated instance `iso-52227-7ac9` and its data root | Mine | `pnpm --silent isolated-app stop iso-52227-7ac9` | `wasRunning: true`, `forced: false`, `dataRootRemoved: true`, both ports released; no longer in `list` |
| Desktop-check scratch dir | Mine | `fs.rm` | Removed |
| `autobyteus-web/electron-dist/` (worktree build output) | Build output from `--build` | Left in place (git-ignored build artifact, reusable via `--from-worktree`) | Not committed |
| Untracked SDK `dist/` folders | Server build output | Left (also produced by Implementation's build) | Not committed |

## Preliminary Classification

N/A. The result is `Pass`.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required`. Browser and Project Desktop Validation executed.
- Critical acceptance criteria lacking direct proof: none (AC-008 is the user's verification, owned by Delivery)
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/delivery_engineer` (direct route, `Medium`/`Low`, no durable test-code review required)
- Notes:
  - Delivery should cover, in AC-008:
    - the native picker: Browse… → choose a folder → the path fills the input, and nothing is added until **Add**;
    - a visual match to VIS-001..023, with the SR-003 text-only chips.
  - The baseline fix commit `812a75c0a` should be called out in delivery and release notes as a test-only change.
