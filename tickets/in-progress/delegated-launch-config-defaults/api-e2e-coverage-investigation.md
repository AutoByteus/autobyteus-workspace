# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `tickets/in-progress/delegated-launch-config-defaults/requirements-doc.md` (approved baseline SR-002; SR-004 editorial)
- Investigation Notes: `tickets/in-progress/delegated-launch-config-defaults/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/delegated-launch-config-defaults/solution-revision-record.md` (SR-001..SR-004)
- Design Spec (required on every route): `tickets/in-progress/delegated-launch-config-defaults/design-spec.md` (SR-004, `Ready`)
- Supplemental Task Artifacts: N/A — not applicable (none exist; no Product Design)
- Design Review Report: `tickets/in-progress/delegated-launch-config-defaults/design-review-report.md` (ARCH-REV-002, `Pass`)
- Architecture Review Revision Record: `tickets/in-progress/delegated-launch-config-defaults/architecture-review-revision-record.md`
- Implementation Handoff: `tickets/in-progress/delegated-launch-config-defaults/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `tickets/in-progress/delegated-launch-config-defaults/implementation-revision-record.md`
- Code Review Report: `tickets/in-progress/delegated-launch-config-defaults/code-review-report.md` (CRR-002, `Pass`)
- Code Review Revision Record: `tickets/in-progress/delegated-launch-config-defaults/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `tickets/in-progress/delegated-launch-config-defaults/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003` (round 3: UI coverage extension of the browser probe at the user's request; round 2 was the CRR-003 TR-001 fix)
- API/E2E Test-Case Ledger: `tickets/in-progress/delegated-launch-config-defaults/api-e2e-test-case-ledger.md`
- Current Investigation Round: 3
- Trigger: round 1 CRR-002 `Pass`; round 2 CRR-003 test-code review TR-001 (Local Fix)
- Prior Investigation Reviewed: round 1
- Latest Authoritative Investigation: this document, round 3 (browser probe extended to DLP-001..007; MOB-001 as in round 2)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of the durable test code added here)
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

Wherever an agent or team enters a run without a user launch choice (catalog copy through `delegate_task`, collaborator through `send_message_to`, a task-owned sender's helper), each agent gets runtime, model and settings as one unit from the first usable layer: agent default → team default (members) → the run root's launch (REQ-001, REQ-002, DEC-001/002/004). Skipped configured layers (incomplete, runtime unavailable, model not offered, settings invalid) fall back with a note in the `delegate_task` result (`launch_notes`) or the `send_message_to` result `message` (REQ-003, REQ-008). No usable layer fails as today (REQ-004). Per-agent values and sources are recorded once; extra copies, teammate delegation and restore reuse them without repeated notes (REQ-005, AR-002); old records restore on the Team value with source "not recorded" (REQ-006, `Directly Usable — No Migration`). Settings lists collaborators and open copies read-only with runtime, model, source and fallback notes (REQ-007). Fresh New-chat Team, Org launch and mobile Team starts seed members from usable defaults, pinned through root changes; reset releases (REQ-009, REQ-010, DEC-009). Single-agent start, configured-placement delegation and application baselines are unchanged (REQ-011).

Design spines DS-001..DS-007; reviewed residual risks: UNK-001 (auth not detected before start), refresh-only Settings for copies started while the editor is open, "As configured in this run" for copies without a recorded source.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001..SCN-008.
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1: a member of a delegated copy messages an available agent (task-owned helper bring-in, DS-004 b) — real trigger: copy member `send_message_to` to a catalog address.
  - SCN-A2: the member that runs on a different runtime actually **starts** on it when work reaches it (lazy activation) — real trigger: the copy coordinator's `send_message_to` to that teammate. Without it, AC-001 is only proven as recorded data.
  - SCN-A3: the delegating conversation's tool card shows the `delegate_task` result with `launch_notes` (AC-005 UI test) — real trigger: user opens the delegating agent's conversation.
  - SCN-A4: a provider retires the run root's model while the run is active, then the root delegates (the only real way the inherited layer becomes unusable, AC-006) — real trigger: catalog change (`AGY_FAKE_EXTRA_MODELS` removal, as the existing lazy-activation E2E does).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: code-review C-002 (root running on an invalid model while every member has its own default — not used as a failure basis), C-003, C-005. Not tested.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 catalog copy per-agent launch + `launch_notes` | Changed | REQ-001..005, REQ-008; DS-001/002/003 | Real-root E2E per root kind, every fallback reason, mixed runtime start |
| BEH-002 bring-in per-agent launch + note in send `message` | Changed | REQ-001..005, REQ-008; DS-004 (a)(b) | Real-root E2E in each root (three `deliverToAddress`), task-owned helper branch |
| BEH-003 extra copy / teammate reuse recorded values | Changed | REQ-005; DS-005; AR-002 | E2E: extra copy at a collaborator address; teammate delegation inside a copy has no notes |
| BEH-005 launch-form seeding and pins | Changed | REQ-009, REQ-010; DS-006 | Browser probe: New chat Team and Org launch, Run → server readback; mobile via store tests |
| BEH-007 restore with per-member values; old records | Changed / Preserved | REQ-005, REQ-006; AC-008, AC-009 | E2E: definition edit after start, root stop/restore, old-shape saved tree |
| BEH-008 Settings read-only section | Added | REQ-007; DS-007 | Browser probe against a real backend with copies/collaborators for Agent, Team and Org roots |
| BEH-004/006/009 | Preserved | REQ-011; AC-014 | Existing suites (unit, lazy-activation E2E with configured placements, ad-hoc delegation E2E) |
| `CollaboratorAddError` wording for the inherited layer | Preserved | AC-006, Guidance | E2E asserts the exact base text |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Resolver, admission, projector, allocator, run-history domain | Server unit (resolver, admission, member-launch, notes, lifecycle) | Real runtime availability/catalog probes (AGY CLI, Grok handshake, Codex command) are faked in unit tests | Server E2E with scripted runtimes |
| API / transport / contract | Yes | `delegate_task` strict result `launch_notes`, `send_message_to` message, view DTOs (two packages), GraphQL tree queries | Serializer/DTO projection units, contract package tests | Real MCP tool result delivered to an agent; strict DTO parsing on real trees | Server E2E (scoped MCP, GraphQL, WS) |
| Frontend component / state | Yes | Seeding, pins, rows, Settings section, selectors | Web specs (117 targeted, 4193 total) | Rendered section never shown with real DTOs | Browser probe |
| Browser integration / user journey | Yes | New chat Team / Org launch Run; Settings of saved runs | Implementation render-check (no Run, no Settings) | Run → server readback; Settings with real copies | Browser probe (probe-owned stack) |
| Authentication / session / permissions | No | — | — | UNK-001 out of scope | — |
| Desktop renderer / web-equivalent UI | Yes (web-equivalent) | Same as browser | — | — | Browser probe |
| Desktop shell / Electron-specific integration | No | No main/preload/IPC change | — | — | None |
| Process / lifecycle | Yes | Lazy start of a member on another runtime; root stop/restore | Lifecycle units | Real process start on the resolved runtime | Server E2E (AGY argv log, Grok fake) |
| Persisted-data transition | Yes | Optional fields in run trees | `collaborator-member-launch.test.ts` old-shape fixture | Old-shape tree on disk through real restore | Server E2E (strip fields from saved tree, restore) |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes (runtimes) | Availability + catalog of AGY, Grok, Codex | Mocked in units | Real CLIs: scripted only (no paid inference) | Scripted runtimes (TESTING.md) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-launch-config-defaults` (branch `codex/delegated-launch-config-defaults`)
- Project type and runtime stack: pnpm monorepo; Fastify/GraphQL/WS server (TS, vitest), Nuxt 3 web (vitest, playwright-core probes), Electron shell (not affected).
- Project testing guideline path(s): `TESTING.md` (root). No closer `TESTING*.md` in `autobyteus-server-ts`, `autobyteus-web` or the contract packages.
- Conflicting, missing, or unclear project instructions: `TESTING.md` "Build outputs such as SDK `dist/` … are untracked" does not hold for the two stream-contract packages, whose `dist/` is tracked (already recorded by implementation and code review; docs follow-up for delivery).
- Required environment variables or secrets available: `N/A` — no real-provider credentials are needed; scripted runtimes only.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing strategy | Layers/commands; scripted AGY (`ANTIGRAVITY_CLI_COMMAND`, `RUN_AGY_FAILURE_E2E=1`, `CALL_TOOL:{…}`); E2E inherits shell → clean env; probes own their stack and clean up; never touch `~/.autobyteus` or the running app; assertions first |
| `AGENTS.md` (root), `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md` | Package instructions | `vitest run … --no-watch`; never `git add -A` |
| `autobyteus-server-ts/tests/e2e/projects/delegated-team-lazy-member-activation.e2e.test.ts` | Closest durable harness | In-process Studio server, scoped MCP tools, AGY argv log, saved-tree editing for persisted-shape cases, `AGY_FAKE_EXTRA_MODELS` retire pattern |
| `autobyteus-server-ts/tests/e2e/helpers/grok-fake-cli.ts`, `tests/fixtures/grok-acp/` | Second scripted runtime | `GROK_BUILD_COMMAND` → recorded-fixture fake Grok; `FAKE_ACP_FIXTURE=prompt`, `FAKE_ACP_REPORT_MCP_READY=1`; model `grok-4.7` |
| `src/runtime-management/runtime-availability-service.ts`, `codex-app-server-launch-config.ts` | Availability | `CODEX_APP_SERVER_COMMAND=<missing path>` makes Codex deterministically unavailable |
| `src/llm-management/services/model-config-schema-validation.ts` | Settings validity | A model without a config schema rejects any non-null `llmConfig` ("This model has no adjustable settings.") |
| `autobyteus-web/tests/e2e/run-settings-live-probe.mjs`, implementation `render-check/launch-seed-render-check.mjs` | Browser probe patterns | Probe-owned backend (`dist/app.js`, temp data root, prisma migrate, free ports), `pnpm dev` Nuxt, headless Chrome; data-test selectors for drawer rows, workspace rows, `workspace-header-edit-config`, `existing-run-settings` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process Studio server (server E2E) | `autobyteus-server-ts` | `startStudioE2eRuntimeServer()` inside vitest | Temp data dir, temp HOME, free ports | GraphQL responds | `app.close()`, data dir removed, leftover-process check |
| Scripted AGY CLI | `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | `ANTIGRAVITY_CLI_COMMAND=<abs path>` | `AGY_FAKE_CASE=linked_skills`, argv log | `--version` | Processes end with their runs |
| Fake Grok CLI | test-created temp dir | `createFakeGrokCommand()` | Replays `prompt.jsonl` | `--version` | temp dir removed |
| Backend for browser probe | `autobyteus-server-ts` | `pnpm -C autobyteus-server-ts build`; `node dist/app.js --data-dir <temp>` | sqlite in temp root, sanitized env | `/rest/health` | SIGTERM/SIGKILL owned group; temp root removed |
| Nuxt dev for browser probe | `autobyteus-web` | `pnpm dev --host 127.0.0.1 --port <free>` | one dev server per worktree at a time | `/chat` 200 | SIGTERM owned group |
| Chrome | — | playwright-core `chromium.launch({ executablePath })` | headless | page loads | `browser.close()` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent / Team / Org definitions with `defaultLaunchConfig` | Public GraphQL `create*Definition` / `updateAgentDefinition` | Test-owned data root only | Removed with the data root |
| Root runs | GraphQL `createAgentRun` / `createAgentTeamRun` / `createAgentOrgRun` | AGY scripted root | Terminated in teardown |
| Delegations and bring-ins | Scripted root message `CALL_TOOL:{…}` → real agent tools | No provider calls | — |
| Old-shape run record | Strip the new optional fields from the saved tree after root stop (same technique as the lazy-activation E2E's pre-fix shape) | Only the test's own data root | Removed with the data root |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design-spec "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check".
- Representative existing-data setup and required behavior: a saved run tree whose catalog Team copy and collaborator Team carry no `launchSource`/`defaultLaunchSource`/member `launchConfiguration`/`launchSource` (the shape every pre-change run has). It must load through the normal readers, show source "not recorded", and each member must run on the Team value.
- Evidence planned: server E2E DLC-008 (stop root → strip fields → restore → GraphQL tree parses, sources absent → a never-started member starts on the Team value per AGY argv). Unit evidence: `collaborator-member-launch.test.ts`.
- Migration-specific scenarios: N/A.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `server tests/unit/.../collaborator-launch-resolver.test.ts` | Layer order, unit-per-layer, reasons, inherited wording, QR-001 batching | REQ-001..004, QR-001 | Still Valid | Reviewed; asserts approved order | Run |
| `.../collaborator-admission-launch-defaults.test.ts` | AC-001/004/005/007/008 at admission | REQ-001..005 | Still Valid | — | Run |
| `.../collaborator-member-launch.test.ts` | Projection sites, writer key sets, AC-009 old-shape fixture | REQ-005, REQ-006 | Still Valid | — | Run |
| `.../launch-configuration-notes.test.ts`, `launch-source-dto-projection.test.ts` | Note text, DTO projection, strict `launch_notes` | REQ-003, REQ-008 | Still Valid | — | Run |
| `tests/unit/agent-team-execution/team-root-launch-notes.test.ts` | Real Team root (in-process): bring-in note once; copy note; teammate none | REQ-008, AR-002 | Still Valid | Mocks runtimes | Run |
| `message-recipient-resolution.test.ts`, `root-task-execution-lifecycle.test.ts` (updated) | Notes carriage; single attachment point; helper fresh/joined/reused | DS-003/004 | Still Valid | — | Run |
| Team/Org/standalone root collaborator tests (updated) | New record shapes | REQ-005 | Still Valid | — | Run |
| Contract tests `team-member-launch.test.mjs`, `collaboration-member-launch.test.mjs` | Effective-member functions, strict schemas | DS-005 | Still Valid | — | Run |
| `tests/e2e/projects/delegated-team-lazy-member-activation.e2e.test.ts` | Copies start only reached members; Org configured placements; root restore with pre-fix tree | Preserved BEH-006, lifecycle; its header says catalog copies use "the delegator's configuration" (true here: its definitions have no defaults) | Still Valid | Its definitions carry no `defaultLaunchConfig`, so inherited applies | Run as regression (AC-014) |
| `tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts`, `delegated-copy-member-contact-host.e2e.test.ts`, `task-existing-copy-assignment.e2e.test.ts` | Delegation/tool-result transport through real roots | Preserved delegation result shape (`launch_notes` optional) | Still Valid | No defaults in fixtures | Run as regression |
| Web specs: `memberLaunchDefaults`, `startModelDefaults`, `chatDraftStore`, `agentOrgLaunchDraftStore`, `teamRunConfigStore`, `agentSourceSelectors`, `delegatedLaunchRows`, `RunDelegatedLaunchList` | Seeding, pins, rows, section | REQ-007, REQ-009, REQ-010 | Still Valid | — | Run |
| `autobyteus-web/tests/e2e/run-settings-live-probe.mjs` | Run settings with real Claude/Codex (paid) | Adjacent; not this change | Out Of Scope | Needs logged-in paid CLIs | Not run |
| Implementation `render-check/launch-seed-render-check.mjs` | Ad-hoc self-check | AC-011/012/013 rendering | Replace | Not durable; no Run readback | Superseded by the durable probe below |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| DLC-001 | Catalog Team copy in each root (Agent, Team, Org): per-member resolved launch + sources; four fallback reasons in `launch_notes`; root workspace/auto-approve | AC-001, AC-002, AC-005, AC-015 shape, REQ-002/003/008 | `autobyteus-server-ts/tests/e2e/projects/delegated-launch-config-defaults.e2e.test.ts` | Real MCP tool result, real availability/catalog probes, real records; no repo test crosses these boundaries |
| DLC-002 | Mixed runtime: the member with a Grok default starts on Grok; AGY member on its own model; fallback member on the root's | AC-001, SCN-A2 | same | Only end-to-end proof that resolved values reach the runtime |
| DLC-003 | Agent bring-in and catalog agent copy (usable default, unusable default, none) in each root; note in `send_message_to` message | AC-003, AC-004, AC-005, DS-004 (a), three `deliverToAddress` | same | Three root delivery files changed |
| DLC-004 | Team bring-in with a fallback member, then an extra copy at its address reuses recorded values, no notes | AC-004, AC-007 | same | Re-projection path |
| DLC-005 | Teammate delegation inside a copy: recorded values, no repeated note; task-owned helper bring-in note | AC-007, AR-002, DS-004 (b) | same | AR-002 contract at a real boundary |
| DLC-006 | Inherited layer unusable: delegation fails with the unchanged `COLLABORATOR_ADD_FAILED` text and adds nothing; an agent with a usable default still succeeds | AC-006, REQ-004 | same | Wording and all-or-nothing through the tool |
| DLC-007 | Definition edited after start: existing copy keeps recorded values through root restore; new copy uses the new default | AC-008, DEC-008 | same | Snapshot stability across restore |
| DLC-008 | Old-shape saved tree restores; sources absent; members run on the Team value | AC-009, QR-002 | same | Persisted transition through the real reader and restore |
| DLP-001 | New chat Team: seeded rows + note; root change keeps pinned rows; member change; reset; Run → server readback | AC-011, AC-013 | `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` (+ `test:e2e:delegated-launch-defaults`) | Run → server contract not proven; render-check was ad hoc |
| DLP-002 | Org launch: placed team + agents seeded; Run → readback | AC-012 | same | Same |
| DLP-003 | Manager chat from the UI: copy (five notes), bring-ins, extra copy from its composer; teammate, helper and Grok engineer from the copy lead's conversation; Settings rows | AC-001, AC-003..AC-005, AC-007, AC-010 | same | Section never rendered with real DTOs; round 3 drives every action through the UI |
| DLP-004 | Team run (New chat) and Org run (Org launch) driven from the composer; Settings rows | AC-004, AC-005, AC-010 | same | Team/Org Settings read different trees |
| DLP-005 | Root model retired mid-run; failures in the conversation; nothing added; own default works | AC-006, REQ-004 | same | Round 3: the user asked for every case through the real UI |
| DLP-006 | Pre-change saved runs after a backend restart; Settings "Source not recorded"; member on the Team value | AC-009, QR-002 | same | Round 3: the label had never been rendered with real data |
| DLP-007 | Definition edited in the Agents editor; stop/reopen from Settings; old copy keeps its runtime | AC-008, DEC-008 | same | Round 3 |
| MOB-001 | Mobile setup controller seeds the selected draft; a held seed applies once released (control); a seed resolving after a Team switch is dropped | AC-011 (mobile), DS-006 | `autobyteus-web/components/mobile/__tests__/MobileRunSetupMemberSeeding.spec.ts` | Added during execution: the controller wiring had no test and the mobile shell needs pairing |

## Durable Coverage To Update

None planned.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts typecheck` | worktree | Production src types | Pass | `api-e2e-evidence/server-typecheck.log` |
| 2 | `pnpm -C autobyteus-server-ts test:unit` | worktree | Server units incl. new suites | Pass (673 files / 5277 tests; an earlier load-only flake rerun clean) | `api-e2e-evidence/server-unit.log` |
| 3 | `pnpm -C autobyteus-{team,collaboration}-stream-contracts test` | worktree | Contract functions/schemas | Pass | `api-e2e-evidence/contracts.log` |
| 4 | `pnpm -C autobyteus-web test:nuxt --run` + three guards | worktree | Web units/components | Pass (604 files / 4193 tests; guards 0) | `api-e2e-evidence/web-nuxt.log`, `web-guards.log` |
| 5 | New server E2E (gated) | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=…`, clean env | DLC-001..008 | Pass (3 consecutive runs) | `api-e2e-evidence/server-e2e/` |
| 6 | Regression E2E: lazy activation, ad-hoc delegation, copy-member contact host, existing-copy assignment | same gate | AC-014 preserved delegation | Pass | `api-e2e-evidence/server-e2e/` |
| 7 | `pnpm -C autobyteus-server-ts test:integration` (after `:prepare`) | worktree | Integration baseline | Pass (only the TESTING.md known exception fails) | `api-e2e-evidence/server-integration.log` |
| 8 | `vitest run components/mobile/__tests__/MobileRunSetupMemberSeeding.spec.ts` + mutation of the controller call | `autobyteus-web` | MOB-001 (added during execution) | Pass; mutation fails 2/2 | console |

## Test-Case Ledger Decision

- Ledger required: `Yes` — many independent cases across server E2E and a browser probe, multi-minute runs, interruption risk.
- Canonical ledger path: `tickets/in-progress/delegated-launch-config-defaults/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard

Scored after repository suites and the gated server E2E (before the browser probe and the isolated desktop instance).

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | AC-001..AC-009, AC-014 directly proven through real roots (DLC, REG) | AC-010..AC-013 only component/store-level; AC-015 not exercised | Browser probe; desktop instance |
| Changed-boundary execution directness | 90% | Real MCP tool results, availability/catalog probes, persisted trees, restore | Rendered Settings and Run → server not exercised | Browser probe |
| Cross-boundary integration realism and mock gap | 85% | Real server boundaries; scripted runtimes | No real Codex/native/Claude run | Desktop instance with real runtimes |
| Environment, configuration, identity, and fixture fidelity | 90% | Clean env, own data roots, public APIs | Packaged app environment not exercised | Desktop instance |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Four reasons, team-layer fallback, inherited failure wording, restore, pre-change tree | — | — |
| User-surface, browser, and desktop-shell confidence | 60% | Web specs only | Settings never rendered with real DTOs; launch forms never read back | Browser probe; desktop instance |
| Durable regression coverage quality and relevance | 90% | New E2E file, existing suites | No durable rendered coverage yet | Durable probe |

- Overall post-repository confidence: 85%
- Calculation method: simple average (85+90+85+90+95+60+90)/7 ≈ 85%
- Every critical acceptance criterion directly proven: `No` (AC-010..AC-013 rendered)
- Any applicable category below `90%`: `Yes` — requirement proof, mock gap, user surface
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: rendered UI and web → server launch contract; real runtimes.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Browser` (probe-owned real stack, scripted runtimes) plus `Live API` (server E2E through real HTTP/GraphQL/WS/MCP)
- Specific confidence gap: mocked runtimes in unit tests; the Settings section never rendered with real DTOs; Run from the launch forms never read back on the server; old-shape tree never restored through a real root.
- Why the selected mode can materially improve confidence: it crosses the exact changed boundaries (tool results, availability probes, persisted trees, DTO projections, renderer).
- Expected confidence after the selected validation: ≥ 95% except where scripted runtimes stand in for paid inference (AC-015 user verification stays with delivery).
- Browser-specific decision and rationale: required for AC-010..AC-013 (renderer journeys and web → server launch contract).

## Desktop Application Validation Decision

- Desktop framework / shell: Electron; no shell code changed.
- Web-equivalent behavior: all UI changes are renderer components/stores.
- Shell-specific or lifecycle behavior: none.
- Chosen validation approach: browser probe with a probe-owned backend; no isolated desktop instance needed for evidence (AC-015 user verification is delivery's, on an isolated instance).
- Effect on any already-running desktop application: None (the user's AutoByteus at port 29695 and another worktree's Nuxt on 3291 are not touched).

## Live Environment And Fixture Plan

- Startup order: server build → temp data root + prisma migrate → backend with scripted CLIs → Nuxt dev → Chrome.
- Environment choices: `ANTIGRAVITY_CLI_COMMAND` (scripted AGY, `AGY_FAKE_CASE=linked_skills`, `AGY_FAKE_EXTRA_MODELS=<alt model>`), `GROK_BUILD_COMMAND` (fake Grok, `FAKE_ACP_FIXTURE=prompt`), `CODEX_APP_SERVER_COMMAND=<missing path>`; sanitized env (no `AUTOBYTEUS_*`, temp HOME).
- Health checks: `/rest/health`, Nuxt `/chat`.
- Seed data: definitions via GraphQL; runs via GraphQL; delegations via scripted `CALL_TOOL` messages over WS.
- Journeys: DLP-001..DLP-004.
- Evidence: DOM assertions, GraphQL readback, screenshots (supporting), JSON receipt, logs.
- Cleanup: owned process groups, temp root, browser; receipt records it.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| ISO-001 | Isolated desktop instance of the worktree build (`isolated-app start --build`), user-named key file imported into the instance DB, real Claude/Codex/native runtimes, browser-automation attach-only | AC-015 shape end to end in the packaged app; AC-005 tool card; AC-010 Settings; AC-011 seeding with real catalogs; AR-001 member context | Spends real provider credits and needs local CLI logins; the durable E2E and probe cover the same behavior with scripted runtimes |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| AC-015 with real Codex / Sol 6.1 and real inference | User verification by definition; paid providers | Real-runtime differences (UNK-001) | Delivery: user verification on an isolated instance |
| Mobile Team start seeding (AC-011 mobile) in a browser | The mobile shell requires remote-access pairing (`MobilePairingBootstrap`); no probe-owned surface | Covered by MOB-001 (controller + store, mutation-verified); the mobile setup has no member rows, so nothing is rendered by this change | Recorded in the report |
| UNK-001 (installed but unauthenticated runtime) | Out of scope (requirements) | First-turn run error instead of a fallback | Delivery/user verification if desired |

## Ambiguities Or Reroute Triggers

None at investigation time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added: one server E2E file, one browser probe + script)
- Post-repository confidence: 85%
- Broader validation decision: `Required` (executed: browser probe DLP-001..004; isolated desktop instance ISO-001 at the user's direction)
- Reroute Required Before Validation Execution: `No`
