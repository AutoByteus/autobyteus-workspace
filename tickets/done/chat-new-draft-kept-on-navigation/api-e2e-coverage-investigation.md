# API/E2E Coverage Investigation — New chat Draft rows under the Chat row

All paths are absolute unless stated. `<T>` = `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/tickets/in-progress/chat-new-draft-kept-on-navigation`.

## Investigation Meta

- Requirements Doc: `<T>/requirements-doc.md` (Approved, SR-004)
- Investigation Notes: `<T>/investigation-notes.md`
- Solution Revision Record: `<T>/solution-revision-record.md`
- Design Spec (required on every route): `<T>/design-spec.md` (Ready, SR-005)
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/chat-new-draft-kept-on-navigation/ui-ux-spec.md` + `visual-references/VIS-001..008`; `<T>/product-design-request.md`; `<T>/handoff-architecture-design-complete.md`
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `<T>/implementation-handoff.md`
- Implementation Revision Record: `<T>/implementation-revision-record.md` (IR-001, IR-002)
- Code Review Report: `<T>/code-review-report.md` (CRR-001: failure-origin review of F-001 only)
- Code Review Revision Record: `<T>/code-review-revision-record.md`
- API/E2E Revision Record: `<T>/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- API/E2E Test-Case Ledger: `<T>/api-e2e-test-case-ledger.md`
- Current Investigation Round: 2
- Trigger: round 1 was Implementation Complete IR-001 (`eef9633f5`). Round 2 is the F-001 Local Fix IR-002 (`9e902002d`).
- Prior Investigation Reviewed: round 1 (this file). No coverage decision changed, apart from D09's added TR-004 assertion.
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

A New chat with typed text becomes a Draft kept for the session in `chatDraftStore` (a collection with one open draft). Drafts appear as one-line rows directly under the Chat row, newest first. A row re-enters its draft intact: text, attachments, skills, mentions, target, workspace, model and config, Auto-approve and member customizations. Chat, the pencil, Run and "+" always open a fresh New chat and keep drafts with text; a textless New chat is not kept. A successful send removes only the sent draft. A failed send that leaves the user on New chat keeps the draft and its row. Under the design's REQ-006 mapping, an agent first-send failure after registration shows the error in the temp run and finishes the draft. The × discards a draft without confirmation, and focus moves to the next row, else the previous row, else Chat. A cleared open draft reads "Empty draft" until the user leaves it. Nothing is persisted (AC-010). The visible details follow UI/UX spec VIS-001..008, including the narrow drawer, the unchanged collapsed strip, and 150 ms motion that is off under reduced motion.

## Supported Scenarios And Real Usage

- **Designer scenarios covered:** SCN-001..SCN-005, all of them.
- **Real-use scenarios added from investigating the implementation:**
  - **RU-1:** the user clicks another Draft row while a send is in flight, then returns to New chat with browser Back. Trigger: Send, followed by a row click before navigation.
  - **RU-2:** the attachment of a re-entered draft is finalized on send. The trigger is a real upload, then leaving, re-entering and sending. This proves the composer remount by `draft.id` keeps the uploaded file identity.
  - **RU-3:** the heading switcher (retarget) keeps the same draft and row. Its text is kept (preserved behavior).
  - **RU-4:** an agent failure before registration (workspace resolution fails) keeps the user on New chat with the draft and its row.
- **Recorded as `Technically Possible but Unsupported/Contrived`:** none by the designer. The handoff's "hidden starting attachment-only draft" path (leave during an in-flight attachment-only send that then fails) is not exercised, because REQ-001 makes an attachment-only New chat not a draft.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001/002 Chat/pencil | Changed | REQ-004, AC-003 | Store + panel unit tests; live browser journey |
| BEH-006 Run/"+" | Changed | REQ-005, AC-004 | Store unit tests; live browser journey via catalog Run, Team Run, run "+", tree "+" |
| BEH-007 rows | Added | REQ-001..003, 007..010 | Rows + store unit tests; live browser journeys + geometry/style/a11y/motion checks |
| BEH-004 send | Changed | REQ-006, AC-005 | Launch unit tests; live sends (agent + team) and injected failures |
| BEH-005 session-only | Preserved | REQ-011, AC-010 | Store unit test; live reload + localStorage diff |
| BEH-003 run composer | Preserved | — | Not touched; existing tests |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No (consumed unchanged) | Launch sequencing calls existing GraphQL/WS | `chatLaunchService.spec.ts` (mocked stores) | Real promotion/registration timing; real upload finalize | Live browser on real backend |
| Frontend component / state | Yes | `chatDraftStore`, `useChatDraftRows`, `ChatDraftRows.vue`, `AppLeftPanel.vue`, `ChatNewSurface.vue` key | Store/rows/panel/launch/useRunStart tests (jsdom) | Real composer remount restoring text/tags/attachments; real Nuxt routing | Browser |
| Browser integration / user journey | Yes | Left panel ↔ /chat ↔ run views | None durable | All SCN journeys, drawer, focus, caret | Browser (real stack) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes | Same renderer | — | Pixel/geometry/colour vs VIS-001..008, hover/touch × visibility, motion | Browser (Chrome, 800×738 / 390×844 touch) |
| Desktop shell / Electron-specific | No | No preload/IPC/main change | — | — | None |
| Process / lifecycle | Yes (reload only) | Session-only state | Store unit test | Real reload | Browser reload |
| Persisted-data transition | No (`Not Affected`) | — | — | localStorage writes | Browser localStorage diff |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | Indirect | A real runtime (Codex CLI) answers the real sends | — | — | Live runtime via backend |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence` (branch `codex/chat-composer-draft-persistence`, HEAD `eef9633f5`)
- Project type and runtime stack: pnpm monorepo; Nuxt 3 renderer `autobyteus-web` (also Electron renderer); Node backend `autobyteus-server-ts` (`dist/app.js`, SQLite via Prisma)
- Project testing guideline paths: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence/TESTING.md`. There is no closer `TESTING*.md` under `autobyteus-web`.
- Conflicting, missing or unclear project instructions: none. The guideline says renderer UI/store changes are proven with "Web unit tests + a browser dev-path probe".
- Required environment variables or secrets available: `Yes`. The local Codex CLI is logged in (ChatGPT login), so the real runtime needs no secret values in the DB.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Testing guideline | `pnpm -C autobyteus-web test:nuxt`. Browser dev-path probes live in `autobyteus-web/tests/e2e/` with a `test:e2e:<name>` script. Rule 2: never use the user's app or data. Rule 6: assertions first. |
| `AGENTS.md`, `DESIGN.md` | Repo instructions | Package-level instructions apply; no test-specific constraints |
| `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` | Existing live-probe pattern | Owned temp data root, free ports, sanitized env, `prisma migrate deploy`, `dist/app.js`, `pnpm dev` Nuxt with `BACKEND_NODE_BASE_URL`, playwright-core Chrome, GraphQL fault injection via `page.route` |
| `autobyteus-web/package.json` | Scripts | `test:nuxt`, `test:e2e:*` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree root | `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build` | Current worktree source | exit 0 | Untracked build output; not staged |
| Backend | `autobyteus-server-ts` | `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <owned>` | Owned SQLite DB, owned data root | `/rest/health` | SIGTERM to the owned process group |
| Frontend | `autobyteus-web` | `pnpm dev --host 127.0.0.1 --port <free>` with `BACKEND_NODE_BASE_URL` | Nuxt dev | `GET /chat` 200 | SIGTERM to the owned process group |
| Browser | — | playwright-core headless Chrome | 800×738 desktop; 390×844 touch | page load | `browser.close()` |
| Runtime | — | Codex App Server via the logged-in CLI | Real model replies (small prompts) | Reply marker in the run view | Ends with the backend |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent definitions | `agents/<id>/agent.md` + `agent-config.json` in the owned data root (same as chat-entry-live) | Owned temp root only | Removed with the owned root |
| Team definition | `createAgentTeamDefinition` GraphQL | Owned DB | Removed |
| Attachment image | PNG generated in the owned root | — | Removed |
| Existing run to visit | Created by a real agent send in the probe | — | Removed |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related REQ / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/stores/__tests__/chatDraftStore.spec.ts` (Draft collection, 9 new) | has-text rule, listing, leave rule, re-entry fields, Empty draft, discard, starting guard, finishSentDraft, per-draft model resolution, no storage | REQ-001..008, 011 | Still Valid | Read the assertions; they match the design | Run |
| `autobyteus-web/components/chat/__tests__/ChatDraftRows.spec.ts` (6) | rows, order, selection, Empty draft off-surface, open emit, discard focus | REQ-001..003, 007, 008 | Still Valid | — | Run |
| `autobyteus-web/components/__tests__/AppLeftPanel_v2.spec.ts` (+3) | placement, Chat row selection, open + drawer close | REQ-003, TR-010 | Still Valid | — | Run |
| `autobyteus-web/services/chat/__tests__/chatLaunchService.spec.ts` | launch order ends with finishSentDraft; failures keep the draft | REQ-006 | Still Valid | — | Run |
| `autobyteus-web/composables/runSettings/__tests__/useRunStart.spec.ts` (+1) | openChatDraft → openDraft + /chat | REQ-003 | Still Valid | — | Run |
| `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` | New chat entry journeys; no draft rows | — | Out Of Scope (same launch path; not changed) | — | Reuse its pattern |
| `autobyteus-web/tests/integration/app-font-size-fixed-px-audit.integration.test.ts` | No fixed-px text in components/chat | — | Still Valid (14 baseline violations, none new) | Handoff | Run in the full suite |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | REQ / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| D00–D14 | All SCN-001..005 journeys, AC-001..010, VIS-001..008 checks on the real stack | requirements AC table; UI/UX spec | `autobyteus-web/tests/e2e/chat-draft-rows-live-probe.mjs` + script `test:e2e:chat-draft-rows-live` | Unit tests mock the composer, router and launch boundaries. The draft re-entry fidelity (real composer remount, real upload), sends, drawer, focus and geometry need a real browser, and future regressions in this journey would otherwise go unseen |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-web test:nuxt stores/__tests__/chatDraftStore.spec.ts services/chat/__tests__ composables/runSettings/__tests__/useRunStart.spec.ts components/__tests__/AppLeftPanel.spec.ts components/__tests__/AppLeftPanel_v2.spec.ts components/chat/__tests__/ChatDraftRows.spec.ts pages/__tests__/chat.spec.ts components/workspace/team/__tests__/TeamCanonicalPlus.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts tests/integration/workspace-history-draft-send.integration.test.ts localization components/chat --run` | worktree root | Store, rows, panel, launch, start intent, chat page, catalogs, all chat components | Pass (34 files / 235 tests) | console |
| 2 | Full web suite `pnpm -C autobyteus-web test:nuxt --run` | worktree root | Regression | Pass with baseline failures only: 10 files / 34 tests, all in the base `cfeda548b` list; none touches the changed files | `<T>/api-e2e-evidence/web-full-suite.log` |
| 3 | `pnpm -C autobyteus-server-ts prebuild && build` | worktree root | Current backend for live runs | Pass | `<T>/api-e2e-evidence/server-build.log` |

## Test-Case Ledger Decision

- Ledger required: `Yes`. There are many independent live browser cases with real model sends, so a run can take a long time or be interrupted.
- Canonical ledger path: `<T>/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | Unit tests cover every REQ at store/component level | AC-002 re-entry through the real composer; AC-009 visuals | Live browser |
| Changed-boundary execution directness | 75% | Real store and component code | Router, composer and launch are mocked | Live browser |
| Cross-boundary integration realism and mock gap | 60% | — | Real send/promotion/upload never executed | Live sends |
| Environment, configuration, identity, and fixture fidelity | 70% | jsdom + Pinia | No Nuxt, CSS or browser | Real Nuxt + Chrome |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | Launch failure unit tests; starting guard | Real failure presentation; reload | Injected failures + reload in browser |
| User-surface, browser, and desktop-shell confidence | 40% | — | No render at all | Browser vs VIS-001..008 |
| Durable regression coverage quality and relevance | 85% | Focused, requirement-linked unit tests | No journey-level regression | Durable live probe |

- Overall post-repository confidence: 69%
- Calculation method: simple average
- Every critical acceptance criterion directly proven: `No` (AC-001/002/009 need a render)
- Any applicable category below `90%`: `Yes` — all of them
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: re-entry fidelity, real send hand-off, UI fidelity, drawer and focus.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Browser`. Real Chrome, real Nuxt dev, the real backend (`dist/app.js`) and a real Codex runtime, all in an owned temp root on free ports.
- Specific confidence gap addressed: every gap above.
- Why the selected mode can materially improve confidence: it enters through the real left panel and composer, uses a real upload/finalize and real promotion, and renders real CSS.
- Expected confidence after the selected validation: ≥95% if all cases pass.
- Browser-specific decision and rationale: the change is renderer UI (TESTING.md "Renderer UI … → Web unit tests + a browser dev-path probe").

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron wrapping the same Nuxt renderer.
- Web-equivalent behavior: everything in this change.
- Shell-specific or lifecycle behavior: none changed (no main, preload, IPC or window code).
- Chosen validation approach: a browser dev-path probe. An isolated desktop build adds no evidence for an unchanged shell.
- Effect on any already-running desktop application: `None`. Owned ports and data root only.
- Behavior not directly proven: the Electron window itself (unchanged shell); no confidence consequence.

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- **Startup order:**
  1. Server build.
  2. Owned temp root.
  3. `prisma migrate deploy`.
  4. Backend.
  5. Team via GraphQL.
  6. Nuxt dev.
  7. Chrome.
- **Environment choices:**
  - sanitized env (HOME, PATH, USER, LANG, TMPDIR, SHELL, TERM);
  - `APP_ENV=development`;
  - SQLite in the owned root;
  - runtime `codex_app_server`.
- **Health / readiness checks:** `/rest/health`; Nuxt `/chat` 200; `[data-test="chat-new"]`.
- **Seed data / fixtures:**
  - agents `probe-helper` and `probe-writer`;
  - team `Probe Team` (lead = probe-helper, writer = probe-writer);
  - a generated PNG.
- **Test identities and session state:** none (local).
- **Requirement-linked journeys:** D01–D12 in the ledger.
- **Evidence to capture:**
  - `evidence.json` with per-case DOM/state assertions;
  - screenshots at 800×738 / 390×844 for VIS comparison;
  - backend/frontend logs;
  - GraphQL projections of sent runs.
- **Owned processes and temporary state to clean up:** the backend and Nuxt process groups, Chrome, and the temp root.

## Temporary Executable Validation Plan

None planned. All journeys go into the durable probe.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Packaged Electron shell | Unchanged shell; web-equivalent renderer | Negligible | None |
| Server-side cleanup of uploads of dropped drafts | Out of scope (AF-010, unchanged) | Residual storage | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| F-001 (round 1, **resolved in round 2** by IR-002): on an agent send, the sent row read "Empty draft" before the run opened (TR-004) | `Local Fix` (confirmed by CRR-001) | `api-e2e-execution-coverage-report.md` F-001; `api-e2e-evidence/send-row-sampling`, `live-run-3` | implementation_engineer, via Code Reviewer failure-origin review |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (one added probe + package script)
- Post-repository confidence: 69%
- Broader validation decision: `Required` (Browser, real stack)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: round 1 was Fail (F-001, 91%). Round 2 is Pass (95%) and F-001 is resolved; see `api-e2e-execution-coverage-report.md`.
