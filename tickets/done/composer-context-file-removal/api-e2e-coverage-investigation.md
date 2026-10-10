# API/E2E Coverage Investigation — composer-context-file-removal

## Investigation Meta

- Requirements Doc: `tickets/in-progress/composer-context-file-removal/requirements-doc.md` (Approved, SR-003)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts: none behavior-defining (19.png / 20.png evidence only)
- Design Review Report: `design-review-report.md` (ARCH-REV-001 Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001 Pass, 9.4/10)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: Code review pass (CRR-001) from `/software_engineering_team/code_reviewer`
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file, round 1

All paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal/` unless absolute.

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional review of changed durable test code)
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

- REQ-001 / AC-005 / QR-001: draft deletion is one universal operation addressed by the attachment's own locator; every owner kind (`agent_draft`, `team_member_draft`, `org_member_draft`, `agent_collaboration_member_draft`) is readable and deletable. DELETE returns 204 for existing and missing files. Invalid owner/file → 400 `{detail}`; absent owner or non-draft path → 404 (design "HTTP mapping").
- REQ-002 / AC-001..004: × and Clear All remove uploaded and path attachments in every run kind/state where attaching is possible, including the delegated Agent copy and delegated Team-copy member of a standalone run (19.png case), offline/after restart.
- REQ-003 / AC-006: removing an attachment never deletes another composer's draft (own-draft rule D4).
- REQ-004 / AC-007: target without an upload owner → `+` disabled with a reason; file paste/drop → visible message; path attachments still accepted.
- REQ-005 / AC-008: upload/remove/Clear All failures visible in the composer naming the file; failed delete keeps the item; next success clears the error.
- Design D1–D5: one server codec, `GET`/`DELETE /rest/drafts/*`, resolver through the codec, client deletes at `attachment.locator` via `authorizedFetch`, composer-local error and upload gate.
- Persisted data: `Not Affected` (locator strings and storage unchanged).
- Legacy/compatibility check in the handoff: clean (no compatibility mechanism, dead code removed). Verified against the diff: no per-kind draft route, regex or client endpoint builder remains.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-003, SCN-004.
- Real-use scenarios added from investigating the implemented behavior:
  - RU-1 Server unreachable while removing (real network failure, not an injected 5xx): the backend process stops, the user clicks ×, then the backend returns and the user retries. Trigger: real backend stop/start. Covers AC-008 "server unreachable" (DEC-001 resolution) end to end.
  - RU-2 Traversal-shaped and malformed draft URLs over real HTTP (no Fastify `inject` normalization): a hand-typed or tampered URL reaching `/rest/drafts/*`. Trigger: raw HTTP request. Must never delete outside the addressed draft.
  - RU-3 Bearer-authenticated draft DELETE (paired mobile credential) through the real route policy: the remote-access path the client's `authorizedFetch` uses when a credential is active.
  - RU-4 Clone-on-paste of another composer's draft URL (AC-006) through the real clipboard paste.
- Contrived/unsupported scenarios not tested: concurrent cross-target failure timing (CND-003), invalid draft locators reaching runtimes (CND-001), alternate `/rest` mount prefix (CND-002).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 delegated-child removal | Changed (fixed) | REQ-001/002, live 404 | Real browser journey on real delegated children + disk check |
| BEH-002/003 other run kinds | Preserved | AC-004 | Real browser regressions per run kind |
| BEH-004 upload gating | Added | REQ-004, AC-007 | Real Org task agent pending window |
| BEH-005 own-draft rule / failed delete | Changed | REQ-003/005, AC-006/008 | Clone journey + injected 5xx + real outage |
| BEH-006 upload failure visible | Added | REQ-005, AC-008 | Injected upload 5xx in browser |
| Draft REST routes (wildcard, error mapping) | Changed | D1, AC-005 | Real HTTP against built server, all owner kinds |
| Local-path resolver via codec | Changed | D2 | Repository tests + real send of an uploaded draft (runtime resolution) |
| Status codes 500→400 / 400→404 | Changed (by design) | design HTTP mapping | Real HTTP assertions |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Draft locator codec | Codec unit tests (35) | None material | None |
| API / transport / contract | Yes | `GET`/`DELETE /rest/drafts/*`, error mapping | Fastify `inject` integration test over all kinds | `inject` normalizes `%2E%2E`; no real router/prefix/CORS/remote-access hook | Live API against built server |
| Frontend component / state | Yes | Composer own-draft rule, error, gate | Component/composable/store specs (mocked store/transport) | Store and server mocked | Browser |
| Browser integration / user journey | Yes | Paste/`+`/×/Clear All in real run views | None | Real clipboard paste, filechooser, real delegated children, node URL resolution | Browser (real backend + Nuxt + Chrome) |
| Authentication / session / permissions | Yes (indirect) | DELETE now via `authorizedFetch` | Store spec | Real route policy with bearer | Live API |
| Desktop renderer / web-equivalent UI | Yes | Same Nuxt renderer | Specs | — | Browser (web-equivalent) |
| Desktop shell / Electron-specific integration | Partly | Native file drop path branch only (unchanged, gate placed after it) | Component spec for native drop | Electron `getPathForFile` | Not run (see Not Tested) |
| Process / lifecycle | Yes | Delegated child offline / backend restart | Component spec (non-active status) | Real restart + reload | Browser + backend restart |
| Persisted-data transition | No (`Not Affected`) | — | Locator pin test | — | Existing-format draft deletion is shown by the live journeys |
| Worker / queue / distributed coordination | No | — | — | — | None |
| External integration | No | — | — | — | None |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/composer-context-file-removal` (branch `codex/composer-context-file-removal`, reviewed commit `dbd2e9a91`)
- Project type and runtime stack: pnpm monorepo; Fastify/TypeScript server (`autobyteus-server-ts`), Nuxt 3/Vue web renderer shared with Electron (`autobyteus-web`).
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/TESTING.md` (same file in the worktree root). No closer `TESTING*.md` under `autobyteus-web/` or `autobyteus-server-ts/`.
- Conflicting, missing, or unclear project instructions: none.
- Required environment variables or secrets available: `N/A` — no provider credentials needed; the scripted AGY CLI (`autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`) emulates the model.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Root testing guideline | Renderer + client/server behavior → web unit tests + browser dev-path probe; never use the user's running app (`/Applications/AutoByteus.app` on 29695 is running and is not touched); probes own data/ports/processes and clean up |
| `TESTING.md` "Project Task Agent Run Resources…" | Delegation fixtures | Scripted AGY CLI with `CALL_TOOL:{...}` makes a real agent call `delegate_task` |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` | Existing probe pattern | Built `dist/app.js` backend + `nuxi dev` + Chrome via `playwright-core`, private data root, process-group cleanup |
| `AGENTS.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md` | Package rules | Run package scripts with `pnpm -C`; stage paths explicitly |
| `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts` | Bearer policy | `/rest/drafts/` is `TRUSTED_NETWORK_PROTECTED`; a mobile bearer is always evaluated, so a loopback request proves the bearer path |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Built backend | `autobyteus-server-ts` | `pnpm -C autobyteus-server-ts prebuild && build`; probe spawns `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <tmp>` | AGY scripted CLI, private SQLite | log `listening` + GraphQL `{__typename}` | SIGTERM process group |
| Nuxt dev frontend | `autobyteus-web` | probe spawns `pnpm exec nuxi dev --port <free>` with `BACKEND_NODE_BASE_URL` | dev server | HTTP 200 | SIGTERM process group |
| Chrome | — | `playwright-core` launch, fresh profile | headless, clipboard permissions granted | — | `browser.close()` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent/Team/Org definitions | Public GraphQL mutations | Private data root only | Data root removed |
| Standalone Manager run + delegated Agent copy + Team copy | `createAgentRun` + Manager `delegate_task` via scripted AGY over the real agent WebSocket | Same as app | Removed |
| Standalone Team run (nested sub-team member) and Org run with a task agent | `createAgentTeamRun`, `createAgentOrgRun`, Org Manager `delegate_task` | Same | Removed |
| Files to attach | Generated PNG/text bytes in the output folder | No user files | Output dir retained as evidence |
| Paired mobile credential (RU-3) | Public `PUT /rest/remote-access/settings`, `POST pairing-sessions`, `POST pairing-exchanges` | Private data root | Removed with the data root |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`.
- Design-spec and implementation-handoff references: design "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check".
- Representative existing-data setup and required behavior: draft locators are byte-identical; uploads written by the current server under each owner kind are read and deleted at the locator the upload returned.
- Evidence planned: CF-001 (real HTTP, every owner kind) and the browser journeys' disk checks.
- Migration-specific scenarios: N/A.
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/context-files/context-file-owner-types.test.ts` | Codec build/parse round trip, pinned locator strings, invalid shapes | D1, QR-001 | Still Valid | Passes (35) | Keep |
| `autobyteus-server-ts/tests/unit/context-files/context-file-local-path-resolver.test.ts` | Locator → local path via codec; invalid draft → null | D2 | Still Valid | Passes | Keep |
| `autobyteus-server-ts/tests/integration/api/rest/draft-context-files-universal.integration.test.ts` | Upload/GET/DELETE/GET/DELETE-missing for every kind; status mapping | AC-005 | Still Valid (inject-level) | Passes (7) | Keep; complement with real HTTP |
| `autobyteus-server-ts/tests/integration/api/rest/context-files.integration.test.ts`, `agent-org-context-files.integration.test.ts` | Upload/finalize/read/delete for team/Org | AC-004 | Still Valid | Passes | Keep |
| `autobyteus-web/components/agentInput/__tests__/ContextFilePathInputArea.spec.ts` | Delegated-child ×/Clear All, owner-less, failure, gate, native drop | AC-001..003, 006..008 | Still Valid (mocked store) | Passes | Keep |
| `autobyteus-web/composables/__tests__/useContextAttachmentComposer.spec.ts` | Own-draft rule over every kind with server-shaped locators | AC-006, AR-001 | Still Valid | Passes | Keep |
| `autobyteus-web/stores/__tests__/contextFileUploadStore.spec.ts` | DELETE at locator via `authorizedFetch`, detail on failure | D3, AC-008 | Still Valid | Passes | Keep |
| `autobyteus-web/services/agentOrgExecution/__tests__/agentOrgContextFiles.spec.ts` | Org remove at locator | AC-004 | Still Valid | Passes | Keep |
| Other browser probes (`chat-draft-rows-live` D-cases with `×` discard) | New chat upload/discard | AC-004 (New chat) | Out Of Scope (draft-row discard, not tray ×) | — | None |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| CF-001 | Universal draft routes over real HTTP for every owner kind with real owners; status mapping; traversal-shaped raw paths; bearer path | AC-005, QR-001, RU-2, RU-3 | `autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs` (+ `test:e2e:composer-context-file-removal` script, TESTING.md entry) | No repository test hits the built server's real router, `/rest` prefix and remote-access hook; `inject` hides traversal normalization |
| CF-002 | Delegated Agent copy: paste image, `+` picker, × and Clear All, disk | AC-001, AC-002 | same probe | The failing product path previously had only mocked coverage |
| CF-003 | Delegated Team-copy member (19.png): same | AC-001, AC-002 | same probe | Same |
| CF-004 | Real outage: × while backend down → visible error, item kept; backend back → retry clears | AC-008, RU-1 | same probe | Only mocked failures exist |
| CF-005 | Delegated child after root stop + backend restart + reload: × / Clear All | AC-003 | same probe | Lifecycle realism |
| CF-006 | Regressions: standalone Manager, New chat, two standalone Team members, Org direct member, nested Org team member (`/squad/reviewer`), Org task agent | AC-004 | same probe | Shared route/client rewrite affects every kind. (Revised during execution: standalone Teams are flat in the current product — a nested member in a standalone Team definition is rejected with `COLLABORATION_TARGET_NOT_FOUND` — so the nested member case uses an Org team; CF-001 still sends an encoded nested `team_member_draft` address `%2Fsquad%2Freviewer` over raw HTTP.) |
| CF-007 | Paste another composer's draft URL → clone; remove → source intact | AC-006, RU-4 | same probe | Real clipboard + real clone GET + delete |
| CF-008 | Injected DELETE 5xx (× and Clear All) and upload 5xx → error naming file; retry | AC-008 | same probe | Visible rendering of server `detail` |
| CF-009 | Org task agent while its message is pending: `+` disabled with reason, file paste → message, no upload, path paste still attaches | AC-007 | same probe | Gate only covered with a mocked target. (Revised during execution: the owner-less state appears only when the Org view recomputes its target during the pending window; the probe produces it with a real Org tree change — the Manager delegates another task — while finalize is held.) |
| CF-010 | ~~An uploaded draft sent with a message still reaches the runtime after the resolver rewrite~~ | D2 (preserved) | Dropped during execution | Sends finalize drafts before the runtime sees them, so runtime resolution of a *draft* locator is not on a send path; the codec-backed resolver is covered by `context-file-local-path-resolver.test.ts` and the codec tests. CF-009 does send a message with a finalized uploaded file (finalize 200, rendered in the conversation). |

## Durable Coverage To Update

None planned. Existing tests remain valid.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build` | worktree | Current dist for live runs | Pass | `/tmp/ccfr-api-e2e/server-build.log` |
| 2 | `pnpm -C autobyteus-server-ts typecheck` | worktree | Types | Pass | `/tmp/ccfr-api-e2e/server-typecheck.log` |
| 3 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/context-files tests/integration/api/rest tests/unit/agent-execution/input/agent-run-provider-input-normalizer.test.ts --no-watch` | worktree | Codec, resolver, REST (inject) | Pass — 14 files, 96 tests | `/tmp/ccfr-api-e2e/server-targeted.log` |
| 4 | `pnpm -C autobyteus-server-ts test:unit` | worktree | Server unit regression | Pass — 669 files passed, 4 skipped; 5194 tests passed, 7 skipped | `/tmp/ccfr-api-e2e/server-unit.log` |
| 5 | `pnpm -C autobyteus-web test:nuxt components/agentInput composables/__tests__/useContextAttachmentComposer.spec.ts stores/__tests__/contextFileUploadStore.spec.ts services/agentOrgExecution utils/contextFiles components/chat --run` | worktree | Composer, store, Org, chat | Pass — 33 files, 245 tests | `/tmp/ccfr-api-e2e/web-targeted.log` |
| 6 | `pnpm -C autobyteus-web test:nuxt --run` | worktree | Full web regression | Pass — 591 files passed, 2 skipped; 4026 tests passed, 5 skipped | `/tmp/ccfr-api-e2e/web-full.log` |

Server integration suite not rerun in full: the change's integration files ran in row 3 (`tests/integration/api/rest`), the implementer and code reviewer ran the full suite (only the accepted baseline PB-001 `agent-status-websocket` failure, unrelated), and no server source changed since. The live probe below exercises the real server end to end.

## Test-Case Ledger Decision

- Ledger required: `Yes` — nine independent cases in one probe run with backend restarts; interruption risk.
- Canonical ledger path: `tickets/in-progress/composer-context-file-removal/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | Every AC has a repository test | AC-001..003 proven only with a mocked store/server; AC-007 with a hand-built target | Real browser journeys |
| Changed-boundary execution directness | 75% | Codec and routes exercised via `inject` | Real router/prefix/hook, real client HTTP not exercised | Live API + browser |
| Cross-boundary integration realism and mock gap | 70% | Server and client each tested | Client↔server delete never exercised together in repo | Browser on real backend |
| Environment, configuration, identity, and fixture fidelity | 75% | Real fixture shapes (collab tree, Org tree) | Hand-written collab fixtures; no real delegation | Real `delegate_task` children |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | Mocked 5xx, non-active status | Real outage/restart, traversal over HTTP | RU-1, RU-2, CF-005 |
| User-surface, browser, and desktop-shell confidence | 60% | Component DOM assertions | Real clipboard paste, filechooser, rendering in run views | Browser |
| Durable regression coverage quality and relevance | 85% | Kind-complete typed tests | No durable real-stack journey | Durable probe |

- Overall post-repository confidence: 74%
- Calculation method: simple average of the seven categories.
- Every critical acceptance criterion directly proven: `No` (AC-001..003 only mocked).
- Any applicable category below `90%`: `Yes` — all seven.
- Default clean-confidence target of `95%` met: `No`.
- Material residual risks: real HTTP routing/normalization; real client delete at the node URL; real delegated-child owners; real paste/filechooser paths; lifecycle.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Live API` + `Browser` (real built backend + Nuxt dev + headless Chrome; web-equivalent renderer)
- Specific confidence gap addressed: all categories above.
- Why the selected mode can materially improve confidence: it runs the actual client delete through the actual server router against owners created by real delegation, and observes files on disk.
- Expected confidence after the selected validation: ≥ 95%.
- Browser-specific decision and rationale: the composer is renderer code shared by Electron and web (ASM-001); the browser exercises the same component tree, stores and HTTP calls.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wrapping the Nuxt renderer.
- Testing guideline used: `TESTING.md` "Choosing the path".
- Web-equivalent behavior: everything changed (composer, store, HTTP, server routes).
- Shell-specific or lifecycle behavior: Electron native file drop (`getPathForFile`) — unchanged branch, placed before the gate.
- Chosen validation approach: browser dev-path probe (web-equivalent); native drop covered by the component spec.
- Server/frontend setup: probe-owned built backend + Nuxt dev on free ports.
- Effect on any already-running desktop application: `None` (the user's AutoByteus on port 29695 and `~/.autobyteus` are not touched).
- Behavior not directly proven: Electron native drop in a packaged shell; the user's own desktop verification of the 19.png case (explicit user verification remains a delivery gate).

## Live Environment And Fixture Plan

- Startup order and commands: server build → probe starts backend → Nuxt → Chrome. `pnpm -C autobyteus-web test:e2e:composer-context-file-removal --output-dir <fresh>`.
- Environment choices: `ANTIGRAVITY_CLI_COMMAND=<tests/fixtures/agy-failure-cli.mjs>`, `AGY_FAKE_CASE=linked_skills`, `AUTOBYTEUS_*` cleared from the parent env.
- Health / readiness checks: backend log `listening` + GraphQL; Nuxt HTTP 200; workspace rows render.
- Seed data / fixtures: definitions/runs via GraphQL; delegated children via real `delegate_task`.
- Test identities: loopback (local); RU-3 paired mobile credential.
- Journeys: CF-001..CF-010.
- Evidence: `evidence.json` per case (DOM state, HTTP statuses, disk listings), screenshots, backend/frontend logs.
- Owned processes and temporary state to clean up: backend/Nuxt process groups, Chrome, data root under `os.tmpdir()`.

## Temporary Executable Validation Plan

None; all executed cases live in the durable probe.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Electron native file drop in a packaged app | Unchanged branch; native OS drag can't be driven headless | Low (component spec covers branch order) | None |
| Explicit user desktop verification of 19.png | Owned by the user/delivery | — | Delivery gate |

## Ambiguities Or Reroute Triggers

None that block this ticket. Two pre-existing, out-of-scope observations from execution are recorded in the execution report (OBS-001 `agent_draft` run-id traversal inside the draft root; OBS-002 Org task-agent composer hidden after a pending send) as separate-ticket candidates.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (one probe + script + TESTING.md entry)
- Post-repository confidence: 74%
- Broader validation decision: `Required`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: results recorded in `api-e2e-execution-coverage-report.md`.
