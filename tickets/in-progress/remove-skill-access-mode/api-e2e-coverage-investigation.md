# API/E2E Coverage Investigation — remove-skill-access-mode

All ticket paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skill-access-mode/tickets/in-progress/remove-skill-access-mode/`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved; REQ-001..006, AC-001..007)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (`SR-005`)
- Design Spec: `design-spec.md` (`SR-005`)
- Supplemental Task Artifacts: `implementation-design-impact-DI-001.md`, `solution-handoff.md`. Product Design: `N/A — not applicable`
- Design Review Report: `design-review-report.md`
- Architecture Review Revision Record: `architecture-review-revision-record.md` (`ARCH-REV-003`)
- Implementation Handoff: `implementation-handoff.md`
- Implementation Revision Record: `implementation-revision-record.md` (`IR-002`)
- Code Review Report: `code-review-report.md` (round 2, Pass)
- Code Review Revision Record: `code-review-revision-record.md` (`CRR-002`)
- Delivery Revision Record / IDs: `N/A`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: `/code_reviewer` pass handoff `CRR-002`
- Prior Investigation Reviewed: None
- Latest Authoritative Investigation: this document

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

The run-level `skillAccessMode` is removed from every current contract and writer (REQ-001, REQ-004). Each run exposes exactly its definition's effective skills on every runtime (REQ-002). History that stores the old key, with either value, still lists, loads and restores, and the value is ignored (REQ-003; `Directly Usable — No Migration`). Released app-data migrations keep their behavior through frozen shapes (design R-1). Every built-in agent, including Daily Assistant, is replaced from its template at each startup and the Daily Assistant template has `read_file` (REQ-005, REQ-006; `Discard or Rebuild`).

## Supported Scenarios And Real Usage

| Product Scenario | Behavior IDs | Validity | Approved Trigger / Entry Surface | Real Steps The Test Follows | Alternate / Error Behavior | Planned Case IDs |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001..004 | Supported Normal | Web launch / chat / team and org launch → GraphQL | Create run without the field → runtime bootstraps → skills exposed; stop | Definition with no skills → no catalog | TC-05, TC-06, TC-09, TC-11, TC-14, TC-15, TC-16 |
| SCN-002 | BEH-005 | Supported Normal | History panel / restore | Server starts on a data root holding records with the stored key → list → open → restore | Stored `NONE` is ignored | TC-04, TC-12, TC-14 |
| SCN-003 | BEH-004 | Supported Normal | Application SDK launch | Bundled application backend launches a run | Older bundle still sends the key → not read | TC-07, TC-17 |
| SCN-005 | BEH-006 | Supported Normal | Server startup | Start on a fresh root; edit the built-in; restart | Missing files are created | TC-04, TC-09, TC-13 |
| SCN-UPG (code review) | REQ-003; R-1 | Supported Normal | Server startup on an older data root | Start built server on released-shape data → pending migrations run → history and new work | — | TC-02, TC-03 |

- Not tested (upstream `Technically Possible but Unsupported/Contrived`): SCN-004, an API caller requesting `NONE`. Cross-version web/server mixes (code review C-03) are also unsupported.
- Material behavior with no supported scenario: none found.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 catalog without mode check | Changed (removal) | design map | Catalog tests plus one case through a real `ALL_INSTALLED` definition |
| BEH-002 materialization without mode check | Changed (removal) | design map | Runtime unit/integration tests; live runtime run |
| BEH-003 web client without the field | Removed | design map | Web tests; client documents against a running server; browser journey |
| BEH-004 GraphQL / SDK / stream DTO without the field | Removed | design map | Schema introspection; contract tests; application launch |
| BEH-005 tolerant read, clean write | Changed | design persisted-data decision | Store tests; live list/open/restore of stored records |
| BEH-006 built-ins overwritten; `read_file` | Changed | DEC-002 | Bootstrapper tests; real restart |
| Released migrations | Preserved | R-1, AF-004, AF-015 | Upgrade through real startup, compared with base |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | run configs, backends, stores, projectors | unit + integration + in-process E2E | `ALL_INSTALLED` through to a rendered prompt | durable E2E case (TC-09) |
| API / transport / contract | Yes | GraphQL inputs/outputs, SDK, stream DTOs | schema-level E2E, contract tests | served schema vs the client's documents and generated types | Live API (TC-10, TC-11) |
| Frontend component / state | Yes | stores, services, two config components | `test:nuxt` | payloads against a real server | Browser (TC-14) |
| Browser integration / user journey | Yes | launch / stop / history / restore | none against a real server | whole client–server journey | Browser on the dev stack (TC-14) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (same renderer) | same as browser | — | — | covered by TC-14 |
| Desktop shell / Electron | No | no main, preload, IPC or packaging change | — | — | None |
| Process / lifecycle | Yes | startup built-in sync; startup migrations | bootstrapper unit test, smoke script | a real restart on an edited data root | Lifecycle (TC-13, TC-02) |
| Persisted-data transition | Yes | metadata, team tree, org tree; (AGY manifest, fourth subject noted by review) | tolerance unit tests through real stores | list/open/restore through the running server | Live API (TC-12) |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | Yes | Codex / Claude / AGY runtimes | unit + integration with real filesystem | real runtime applying a configured skill | Live runtime E2E (TC-15, TC-16) |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skill-access-mode`
- Stack: pnpm workspace; Node/TypeScript server (Fastify, Mercurius, type-graphql, Prisma/SQLite); Nuxt web client; Electron shell; Vitest.
- Testing guideline: `TESTING.md` (root). No closer `TESTING*.md`.
- Conflicting / unclear instructions: none. Observation: the repository's server `typecheck` does not cover test files (handoff risk 5).
- Required secrets available: `N/A` for deterministic layers. Live Codex/Claude/AGY use the CLIs installed on this machine (`~/.local/bin/{codex,claude,agy}`).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | layers, path selection, rules | server tests `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; `pnpm test:e2e`; live Codex `RUN_CODEX_E2E=1`; real stack `pnpm dev` (backend `127.0.0.1:8000`, frontend `127.0.0.1:3000`); never test against the user's running app or `~/.autobyteus`; stop what you start |
| `autobyteus-server-ts/AGENTS.md` | server test commands | `vitest run … --no-watch` |
| `autobyteus-web/AGENTS.md` | web test commands | `pnpm test:nuxt --run` |
| `scripts/development/development-runtime.mjs` | dev stack data root | data in `<worktree>/.autobyteus/development/server-data`, owned by the worktree |
| `test-support/live-e2e/test-runtime-bootstrap.mjs` | built-server test harness | needs `autobyteus-server-ts/dist/app.js`; runtime roots under `autobyteus-server-ts/tests/.tmp` |
| `autobyteus-server-ts/vitest.config.ts` | runner | forks pool, no file parallelism, Prisma global setup |

| Component | Working Directory | Start / Setup | Notes | Readiness | Stop / Cleanup |
| --- | --- | --- | --- | --- | --- |
| Built server (branch) | worktree | `pnpm -C autobyteus-ts build && pnpm -C autobyteus-server-ts build` | rebuilt at `1595b8b2c` | build smoke passes | — |
| Base comparison worktree | `/private/tmp/rsam-api-e2e-base` @ `57df63f07` | `git worktree add --detach`, `pnpm install --frozen-lockfile`, builds | temporary, owned by this run | build smoke passes | `git worktree remove --force` |
| Dev stack | worktree | `pnpm dev` | fixed ports 8000 / 3000, both free at discovery | `/rest/health`, frontend 200 | stop the process started here; remove `.autobyteus/development` created here |
| Other isolated instance `iso-60383-3d28` | another worktree | not mine | must not be touched | — | — |

| Data / Fixture Need | Mechanism | Safety Notes | Cleanup |
| --- | --- | --- | --- |
| Released-shape data root | the upgrade E2E's own `seedScenario` | under `tests/.tmp`, isolated HOME | removed by the harness |
| Stored-key history records | records the dev server itself writes, then the key added to the JSON files as old writers did | dev data root only | removed with the dev data root |
| Skills and definitions | GraphQL `createSkill`, `createAgentDefinition`, team/org definition mutations | dev data root / temp roots | removed with the roots |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration` (agent run metadata; team and agent-org execution trees). `Discard or Rebuild` (Daily Assistant app-data files).
- References: design "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check".
- Representative existing data and required behavior: records holding `skillAccessMode: "PRELOADED_ONLY"` and `"NONE"` must list, open and restore through the normal reader; the next save drops the key.
- Planned evidence: tolerance unit tests (real stores); live list/open/restore on a running server (TC-12); real restart over edited Daily Assistant files (TC-13); released-data upgrade through startup compared with base (TC-02).
- Migration-specific scenarios: not applicable (no new migration). Released migrations must behave as on base.
- Upstream ambiguity: the AGY capsule manifest is a fourth stored subject not listed in the design's persisted-data section (code review point 1, record update for `/solution_designer`). Behavior is decided and tested; no reroute needed for validation.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related IDs | Validity | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/run-history/removed-skill-access-mode-record-tolerance.test.ts` | three record kinds × two stored values load; rewritten key sets exclude the key | AC-004, AC-005 | Still Valid | read in full; real stores and files | run |
| `tests/unit/app-data-migrations/released-skill-access-mode-frozen-shapes.test.ts` | frozen validators, V1 planner/builder, V2 output | R-1 | Still Valid | code review | run |
| `tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts` | overwrite of edited files; template has `read_file` | AC-006, AC-007 | Still Valid | — | run |
| `tests/unit/agent-execution/backends/**` (materializer, Codex, Claude, ACP, AGY, capsule) | exposure with no mode input | AC-003 | Still Valid | — | run |
| `tests/unit/application-orchestration/application-run-binding-launch-service.test.ts` | launch with an extra legacy property succeeds | R-3, SCN-003 | Still Valid | — | run |
| `tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts` | named-skill definition → real backend factory → rendered prompt catalog; `read_file` on SKILL.md | AC-002 | Still Valid, incomplete | read in full; no `ALL_INSTALLED` case | add a case (TC-09) |
| `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | released data root upgrades through real startup | R-1 | Needs Update — outside this ticket | three tests fail identically on base and branch (lines 740/849/1312 vs 741/850/1320). Cause found by TC-02: migration `20260901_agent_org_flat_team_families_v1` moves the converted team package to `agent_orgs/<id>/agent_org_run_execution_tree.json` and two more migrations were registered; the assertions predate that (`a7bd0548d`). | Not changed here; evidence for R-1 comes from TC-02. Follow-up ticket candidate. |
| `tests/e2e/run-history/*`, `tests/e2e/agent-team-runs/*`, `tests/e2e/agent-org-runs/*`, `tests/e2e/runtime/team-run-current-graphql-documents.e2e.test.ts` | current GraphQL run and history contracts | AC-001, AC-005 | Still Valid | field removed from inputs in `cf401a563` | run, compare with base |
| `tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` (live, gated) | create/restore; "applies configured runtime skills" per runtime | AC-003 | Needs Update — outside this ticket | With `RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1` the selected cases fail at setup on branch and base alike: `Studio application API services are not configured` (the suite does not register the Studio services). It never reaches a runtime. | Not changed here; AC-003 proven live through the running server (TC-15). Follow-up ticket candidate. |
| `tests/e2e/run-history/*`, `tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts` (failing subset) | history projection and team configuration through a built server | AC-004, AC-005 | Needs Update — outside this ticket | 16 of 19 and 7 of 10 tests fail identically on base and branch (`Run package … is unavailable`, `createAgentTeamDefinition` rejected at fixture setup, etc.); failing lines match after allowing for removed lines | Not changed here; a new E2E covers stored-key history through the built server |
| `autobyteus-ts/tests/unit/agent/system-prompt/*`, `tests/unit/agent/context/*`, `tests/integration/agent/agent-skills.test.ts` | catalog present/absent, config shape | AC-002 | Still Valid | — | run |
| `autobyteus-web` colocated tests | stores, services, utils without the field | BEH-003 | Still Valid | — | run, compare failures with base |
| SDK / stream contract package tests | DTO and launch-profile shapes | BEH-004 | Still Valid | — | run |
| `autobyteus-web/tests/e2e/agy-*.mjs` probes; `test-support/live-e2e/live-e2e-harness.ts` | helpers that launched with `NONE` now follow definitions | — | Still Valid | handoff risk 3 | covered indirectly; see Not Tested |

## Stale Or Obsolete Coverage Decisions

None. `tests/e2e/runtime/skill-access-mode-graphql.e2e.test.ts` was already removed by the implementation (it tested only the removed enum); the absence of the enum is asserted live in TC-10.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Evidence | Planned Path | Why Durable |
| --- | --- | --- | --- | --- |
| TC-12 (durable) | Built server opens agent, team and agent-org history that stores the key with `PRELOADED_ONLY` and `NONE`; served schema has no such type or field | AC-001, AC-004; design "Required tests" | new `autobyteus-server-ts/tests/e2e/run-history/removed-skill-access-mode-history-graphql.e2e.test.ts` | The existing history E2Es are broken on base, so nothing durable exercised stored-key history through the server and its GraphQL contract. Decided after the first confidence assessment (category 7 was the limiting one). |
| TC-09 | Startup bootstrap → Daily Assistant definition (`ALL_INSTALLED`) → `SkillService` → AutoByteus backend factory → rendered system prompt catalogs exactly the enabled installed skills (a disabled one is excluded); `read_file` reads a cataloged `SKILL.md` | AC-002, AC-006; design "Required tests"; code review point 5 | new `it` in `autobyteus-server-ts/tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts` | No test joined these owners; it is the user's original scenario and the one the template change serves |

## Durable Coverage To Update / Remove

None.

## Repository Coverage Execution Plan And Results

See the ledger for commands and results per case (TC-01..TC-09, TC-17). Results are filled in below after execution.

| Order | Command | Configuration | Boundary Proven | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `git grep` gate | worktree | AC-001 source | Pass | ledger seq 2 |
| 2 | upgrade probe, branch and base | built servers | R-1 through startup | Pass | `api-e2e-evidence/03-*` |
| 3 | `vitest run tests/e2e/app-data-migrations` branch and base | built servers | same failures on both | Pass (no regression) | `api-e2e-evidence/02-*` |
| 4–5 | full server suite, branch and base, JSON reports | built servers; apps packed on the branch only | per-test comparison: 0 branch-only failures; 150 shared failures; 28 new passing tests; 11 removed tests, all for removed behavior | Pass (no regression) | `api-e2e-evidence/04-server-full-comparison.txt` |
| 6 | autobyteus-ts targeted | — | AC-002: 53 of 53 | Pass | `06-autobyteus-ts.log` |
| 7 | contract packages | — | BEH-004: 6/6, 10/10, 2/2; collaboration-stream 1 pass / 7 fail identical on base | Pass (no regression) | `07-*.log` |
| 8 | `pnpm -C autobyteus-web test:nuxt --run` | — | BEH-003: 3,373 pass / 4 fail; the same 4 fail on base | Pass (no regression) | `08-*` |
| 9 | new TC-09 case | — | AC-002 / AC-006: 2 of 2 | Pass | `09-daily-assistant-catalog.log` |
| 10 | new stored-key history E2E (added after the broader run) | built server | AC-001 / AC-004: 1 of 1 | Pass | `18-stored-key-history-e2e.log` |

## Test-Case Ledger Plan

- Ledger required: `Yes` — 17 cases, long-running suites, live server, browser.
- Canonical ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes` for the base run of TC-03 onward. TC-01 and TC-02 and the first branch run of TC-03 were executed during discovery, before the ledger file existed, and were recorded when it was created.
- Note on order: the TC-09 test case was written into the E2E file a few minutes before this investigation file was saved; the decision to add it is the one recorded above and nothing else in the suite was changed.

## Post-Repository Confidence Scorecard

Assessed after ledger events 1–10, before any live run.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | AC-001 grep gate; AC-002 incl. the new `ALL_INSTALLED` case; AC-004/005 through real stores; AC-006/007 bootstrapper tests; R-1 through real startup, equal to base | AC-003 only with runtime fakes; AC-004 not through the server | live runtimes; live history |
| Changed-boundary execution directness | 85% | stores, bootstrapper, backend factory and migrations run for real | GraphQL contract only built in process; client never paired with it | live schema + codegen |
| Cross-boundary integration realism and mock gap | 72% | upgrade through a real server process | web ↔ server, server ↔ runtimes mocked or absent; history E2Es broken on base | dev stack, browser, live runtimes |
| Environment, configuration, identity, and fixture fidelity | 85% | built server, packed apps, released-shape seed | no real restart over user-edited files | restart on the dev data root |
| Failure, edge-case, lifecycle, and recovery evidence | 82% | stored `NONE`, missing file, older bundle, upgrade warnings | restore after restart not exercised end to end | live restore |
| User-surface, browser, and desktop-shell confidence | 55% | web unit tests only | no rendered journey | browser on the dev stack |
| Durable regression coverage quality and relevance | 88% | every AC has durable unit or integration coverage on real files; new E2E case | durable history, upgrade and live-runtime E2Es are stale on base | one new stored-key history E2E |

- Overall post-repository confidence: 79%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven: `No` (AC-003 live, AC-004 through the server)
- Any applicable category below `90%`: `Yes` — all seven
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: client/server contract pairing; runtime skill exposure; history restore through the server; real restart

## Broader Validation Decision

- Decision: `Required`
- Selected execution modes: `Live API` on the documented dev stack (TC-10..TC-13), `Browser` on the same stack (TC-14), live runtime E2E (TC-15, TC-16).
- Gap addressed: repository tests build the schema in process and never pair the web client's documents with a served schema; no test lists, opens and restores stored-key history through the running server; no real restart over edited built-in files; runtime skill exposure is proven only with fakes.
- Why it helps: each mode enters through the approved trigger of SCN-001, SCN-002 or SCN-005 on the real boundary.
- Expected confidence afterwards: ≥ 95%.
- Browser decision: required. The field was removed from web stores and launch payloads; a real browser session against the real server is the direct proof that launch, stop, history and restore still work.

## Desktop Application Validation Decision

- Shell: Electron. Guideline: `TESTING.md` "Choosing the path".
- Web-equivalent behavior: everything changed in the web client (stores, services, GraphQL documents).
- Shell-specific behavior: none changed (no main-process, preload, IPC, updater or packaging file in the diff). The embedded server startup runs the same server code as the dev stack's built server.
- Chosen approach: browser on the `pnpm dev` stack (row "Renderer UI, stores, client–server behavior that also runs in a browser").
- Effect on any running desktop application: `None`. The user's app and the other worktree's isolated instance are not touched.
- Not directly proven: the packaged app bundle. Consequence: negligible for this change.

## Live Environment And Fixture Plan

- Startup: `pnpm dev` from the worktree (builds the server, starts backend 8000 and frontend 3000 with the worktree-owned data root).
- Readiness: `GET /rest/health` 200; frontend 200.
- Fixtures: created through GraphQL; stored-key records made by adding the key to files the server wrote, then restart.
- Evidence: API responses, file contents, server log, DOM state, screenshots under `api-e2e-evidence/`.
- Cleanup: stop the dev stack; remove `.autobyteus/development`; remove the base worktree; remove probe files.

## Temporary Executable Validation Plan

| Scenario | Probe | Behavior Proven | Why Not Durable |
| --- | --- | --- | --- |
| TC-02 | copy of the upgrade E2E helpers plus a dump step, run on branch and base | released data upgrades identically | the durable home is the existing upgrade E2E, whose repair belongs to a separate ticket; a base-vs-branch comparison cannot live in the repository |
| TC-10..TC-13 | scripted GraphQL requests against the dev backend | served contract, run lifecycle, stored-key history, startup sync | one-time confirmation of a removal against a live stack; the durable forms exist as unit/E2E tests |
| TC-14 | browser session on the dev frontend | client–server journey | no repository browser probe exists for a real-backend launch without provider credentials; one-time removal check |
| TC-11, TC-12, TC-14 | a local OpenAI-compatible stub registered through the product's `createCustomProvider` mutation; it records each request | real turns without provider credentials, and the system prompt the model actually receives | test scaffolding for a one-time live check; archived under `api-e2e-evidence/probes/` |
| TC-15, TC-16 | scripted run per external runtime (Codex, Claude, AGY) through the dev backend | a configured skill is applied by the real runtime | needs the CLIs and the user's accounts; the repository's gated live suite is the durable home and is stale on base |
| TC-17 | import of the packed Brief Studio and `launchDraftRun` through its backend route | application launch reaches the real team run service | one-time check; `tests/integration/application-backend` is the durable form |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| ACP runtime, live | no ACP agent is configured on this machine | Low: the removed branch has the same shape as in Codex/Claude/AGY, which ran live; ACP unit tests pass | none for this ticket |
| Packaged Electron app / isolated desktop instance | no shell, preload, IPC or packaging file changed; the embedded server is the same built server | Low | none |
| Browser at desktop width | the automation tab is 400 px wide, so history was used through the left drawer | Low: same components and stores | none |
| GraphQL HTTP request bodies in the browser | the client holds its own `fetch` reference, so the page hook saw no bodies | Low: the server's input validation accepted every request and the written files have no key | none |
| History written by an actual released build | stored-key records were made by adding the key to records the current server wrote, and by the upgrade E2E's released-shape seed | Low: the reader ignores the key wherever it appears | none |
| AGY browser probes (`autobyteus-web/tests/e2e/agy-*.mjs`), `test-support/live-e2e` real-provider harness | not run; they need provider credentials in a test vault. Their only change is that launches follow the definition | Low: the same launch path ran live for AGY, Codex and Claude | none |
| Durable upgrade E2E, gated live-runtime E2E, history/team-config E2Es (stale on base) | pre-existing, outside this ticket | They do not protect this change until repaired | follow-up ticket candidates, listed in the execution report |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| Upgrade E2E stale against migration `20260901` and later (pre-existing) | none for this ticket (follow-up candidate) | TC-02, TC-03 | reported in the handoff; no reroute |
| AGY manifest not named in the design's persisted-data list | record update already raised by code review | code review point 1 | `/solution_designer` (informational, already raised) |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Durable coverage added / updated / removed: `Yes` (one added case, one added file)
- Post-repository confidence: 79%; final confidence after broader validation is in the execution coverage report
- Broader validation decision: `Required`
- Reroute Required Before Validation Execution: `No`
